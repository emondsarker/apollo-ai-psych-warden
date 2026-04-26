/**
 * Peer agents on Anthropic's Claude Managed Agents platform.
 *
 * Each of our five peers gets a Managed Agents `agent` provisioned (lazily,
 * on first use). Reviews run as their own `session` against a shared
 * `environment`. The agent emits a single JSON object as its final message;
 * we parse that into our PeerDecision schema.
 *
 * Why use Managed Agents instead of plain messages.create?
 *   - Native session/event model matches the multi-reviewer pattern
 *   - Built-in retries, prompt caching, and compaction in the harness
 *   - Anthropic-side observability per agent (every reviewer's trace is
 *     queryable independently)
 *   - First-class support for adding tools later (web search citation,
 *     instrument lookups) without re-architecting
 *
 * Toggle: set MANAGED_AGENTS=1 in .env.local to use this path; otherwise
 * the original messages.create implementation in peer-agents.ts runs.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { findPeer, type Peer } from "./peers";
import { extractJson, OPUS_MODEL, transcriptText, type TriageThread } from "./triage";
import {
  PeerDecisionSchema,
  DirectorDecisionSchema,
  PEER_SYSTEM_PROMPTS,
  type PeerDecision,
  type DirectorDecision,
} from "./peer-agents";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ── Lazy provisioning + cache ────────────────────────────────────────────
//
// We create one agent per peer on first call and reuse the agent id for the
// rest of the process's lifetime. A single shared environment is fine —
// peers don't need separate sandboxes since they don't write files.

const PEER_AGENT_IDS = new Map<string, string>();
let DIRECTOR_AGENT_ID: string | null = null;
let ENV_ID: string | null = null;

const JSON_TAIL = `

OUTPUT FORMAT — STRICT.
End your response with a single JSON object on its own line and nothing
after it. No code fences, no surrounding prose. The JSON must match
exactly:
{"decision":"approved"|"returned"|"escalated","note":"...","reasoning":"..."}
note ≤ 60 words. reasoning ≤ 90 words. Do not exceed those caps.`;

const DIRECTOR_JSON_TAIL = `

OUTPUT FORMAT — STRICT.
End your response with a single JSON object on its own line and nothing
after it. No code fences, no surrounding prose. The JSON must match
exactly:
{"decision":"approved"|"returned","note":"...","reasoning":"..."}
note ≤ 60 words. reasoning ≤ 90 words. The director cannot escalate.`;

async function getOrCreatePeerAgent(peerId: string): Promise<string> {
  const cached = PEER_AGENT_IDS.get(peerId);
  if (cached) return cached;
  const peer = findPeer(peerId);
  if (!peer) throw new Error(`Unknown peer: ${peerId}`);
  const system = PEER_SYSTEM_PROMPTS[peerId];
  if (!system) throw new Error(`No system prompt configured for ${peerId}`);

  const client = getClient();
  const isDirector = peerId === "elena";
  const agent = await client.beta.agents.create({
    name: `Primum · ${peer.name}`,
    model: OPUS_MODEL,
    system: system + (isDirector ? DIRECTOR_JSON_TAIL : JSON_TAIL),
    tools: [{ type: "agent_toolset_20260401" }],
  });
  PEER_AGENT_IDS.set(peerId, agent.id);
  return agent.id;
}

async function getOrCreateDirectorAgent(): Promise<string> {
  if (DIRECTOR_AGENT_ID) return DIRECTOR_AGENT_ID;
  const id = await getOrCreatePeerAgent("elena");
  DIRECTOR_AGENT_ID = id;
  return id;
}

async function getOrCreateEnv(): Promise<string> {
  if (ENV_ID) return ENV_ID;
  const client = getClient();
  const env = await client.beta.environments.create({
    name: "primum-peer-bench",
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });
  ENV_ID = env.id;
  return env.id;
}

// ── Public API (mirrors lib/peer-agents.ts) ──────────────────────────────

export async function runPeerReviewManaged(
  peerId: string,
  thread: TriageThread,
  results: Record<string, unknown>,
): Promise<{ decision: PeerDecision; sessionId: string }> {
  const peer = findPeer(peerId);
  if (!peer) throw new Error(`Unknown peer: ${peerId}`);

  const [agentId, envId] = await Promise.all([
    getOrCreatePeerAgent(peerId),
    getOrCreateEnv(),
  ]);
  const text = await runSession({
    agentId,
    envId,
    title: `${peer.name} reviewing case`,
    userText: buildReviewPrompt(peer, thread, results),
  });
  const decision = parseDecision(text, PeerDecisionSchema);
  return { decision, sessionId: text.sessionId };
}

export async function runDirectorReviewManaged(
  thread: TriageThread,
  results: Record<string, unknown>,
  juniorContext: { peerId: string; decision: PeerDecision } | null,
): Promise<{ decision: DirectorDecision; sessionId: string }> {
  const elena = findPeer("elena");
  if (!elena) throw new Error("Director peer not configured");
  const [agentId, envId] = await Promise.all([
    getOrCreateDirectorAgent(),
    getOrCreateEnv(),
  ]);
  const text = await runSession({
    agentId,
    envId,
    title: "Director reviewing case",
    userText: buildDirectorPrompt(thread, results, juniorContext),
  });
  const decision = parseDecision(text, DirectorDecisionSchema);
  return { decision, sessionId: text.sessionId };
}

// ── Session runner ───────────────────────────────────────────────────────

interface SessionTextResult {
  text: string;
  sessionId: string;
}

async function runSession(params: {
  agentId: string;
  envId: string;
  title: string;
  userText: string;
}): Promise<SessionTextResult> {
  const client = getClient();
  const session = await client.beta.sessions.create({
    agent: params.agentId,
    environment_id: params.envId,
    title: params.title,
  });

  // Open the stream first, then send the user event (the API buffers events
  // until the stream attaches; recommended pattern from the docs).
  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: params.userText }],
      },
    ],
  });

  let buf = "";
  for await (const raw of stream) {
    const event = raw as { type?: string; content?: unknown };
    if (event.type === "agent.message" && Array.isArray(event.content)) {
      for (const block of event.content as Array<{ type?: string; text?: string }>) {
        if (block.type === "text" && typeof block.text === "string") buf += block.text;
      }
    } else if (event.type === "session.status_idle") {
      break;
    }
  }
  return { text: buf, sessionId: session.id };
}

// ── Prompt builders (kept in sync with peer-agents.ts) ───────────────────

function buildReviewPrompt(
  peer: Peer,
  thread: TriageThread,
  results: Record<string, unknown>,
): string {
  return `You are ${peer.name} (${peer.role}). Review this case Apollo just analyzed and emit your decision.

—— THREAD ——
Format: ${thread.detectedFormat}
Participants: patient="${thread.participants.patient}", target="${thread.participants.target}"
${transcriptText(thread.turns)}

—— APOLLO'S ANALYSIS ——
${formatResults(results)}`;
}

function buildDirectorPrompt(
  thread: TriageThread,
  results: Record<string, unknown>,
  junior: { peerId: string; decision: PeerDecision } | null,
): string {
  const juniorBlob = junior
    ? `\n\n—— JUNIOR REVIEWER ESCALATED THIS TO YOU ——
Reviewer: ${findPeer(junior.peerId)?.name ?? junior.peerId}
Their decision: ${junior.decision.decision}
Their note: ${junior.decision.note}
Their reasoning: ${junior.decision.reasoning}\n`
    : "\n\n(This is a critical-severity case routed straight to you — no junior review.)\n";

  return `You are Dr. Elena Reyes, director. Make the final call on this case.${juniorBlob}

—— THREAD ——
Format: ${thread.detectedFormat}
Participants: patient="${thread.participants.patient}", target="${thread.participants.target}"
${transcriptText(thread.turns)}

—— APOLLO'S ANALYSIS ——
${formatResults(results)}`;
}

function formatResults(results: Record<string, unknown>): string {
  return Object.entries(results)
    .map(([stage, data]) => `## ${stage}\n${JSON.stringify(data, null, 2)}`)
    .join("\n\n");
}

// ── Decision parsing ─────────────────────────────────────────────────────

function parseDecision<T>(
  res: SessionTextResult,
  schema: z.ZodType<T>,
): T {
  const raw = res.text.trim();
  // Try the strict tail first — model was instructed to end with the JSON.
  const lastBrace = raw.lastIndexOf("}");
  const matchingOpen = raw.lastIndexOf("{", lastBrace);
  if (lastBrace > 0 && matchingOpen >= 0 && matchingOpen < lastBrace) {
    const snippet = raw.slice(matchingOpen, lastBrace + 1);
    try {
      return schema.parse(JSON.parse(snippet));
    } catch {
      // fall through to the generic extractor
    }
  }
  // Fallback: peel out fenced/loose JSON anywhere in the body.
  const json = extractJson(raw);
  return schema.parse(JSON.parse(json));
}

// ── Toggle helper ────────────────────────────────────────────────────────

export function managedAgentsEnabled(): boolean {
  return process.env.MANAGED_AGENTS === "1" || process.env.MANAGED_AGENTS === "true";
}
