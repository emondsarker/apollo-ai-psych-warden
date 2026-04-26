/**
 * Bulk-triage adapters: parse a ZIP of conversation files into a list of
 * canonical TriageThread objects (or, when the format is too loose to parse
 * deterministically, raw text we'll hand off to the LLM formatter).
 *
 * Supported file types inside the zip:
 *   .json       — ChatGPT export, Anthropic export, generic messages[],
 *                 or our own canonical TriageThread shape.
 *   .jsonl      — one {role, content} per line.
 *   .ndjson     — alias for jsonl.
 *   .csv        — turn,role,content / role,content / role,text variants.
 *   .txt .md .log — fall through to LLM format step.
 */

import JSZip from "jszip";
import type { ConversationTurn } from "./types";
import { TriageThreadSchema, type TriageThread } from "./triage";

export type ParsedFile =
  | {
      name: string;
      size: number;
      status: "ok";
      thread: TriageThread;
      detectedFormat: string;
      turnCount: number;
    }
  | {
      name: string;
      size: number;
      status: "needs-llm-format";
      rawText: string;
      detectedFormat: string;
    }
  | {
      name: string;
      size: number;
      status: "error";
      error: string;
    };

const SUPPORTED_EXT = new Set([
  "json",
  "jsonl",
  "ndjson",
  "txt",
  "md",
  "markdown",
  "log",
  "csv",
]);

// Filenames that are clearly project metadata, not conversations. Skip them
// before we waste an LLM round-trip trying to triage a README.
const SKIP_BASENAMES = new Set([
  "readme",
  "license",
  "licence",
  "changelog",
  "contributing",
  "code_of_conduct",
  "security",
  "notice",
  "authors",
  "copyright",
  "manifest",
  "package",
]);

const MAX_FILES = 200;
const MAX_BYTES_PER_FILE = 800_000;

export async function parseZipBuffer(buf: ArrayBuffer): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(buf);
  const out: ParsedFile[] = [];

  for (const [name, file] of Object.entries(zip.files)) {
    if (out.length >= MAX_FILES) break;
    if (file.dir) continue;
    if (name.startsWith("__MACOSX/")) continue;
    const base = name.split("/").pop() ?? "";
    if (base.startsWith(".")) continue;
    const ext = (base.split(".").pop() ?? "").toLowerCase();
    if (!SUPPORTED_EXT.has(ext)) continue;
    // Skip project metadata files masquerading as conversations.
    const stem = base.replace(/\.[^.]+$/, "").toLowerCase();
    if (SKIP_BASENAMES.has(stem)) continue;

    try {
      const text = await file.async("text");
      if (text.length > MAX_BYTES_PER_FILE) {
        out.push({
          name,
          size: text.length,
          status: "error",
          error: `File too large (${text.length} bytes; cap ${MAX_BYTES_PER_FILE}).`,
        });
        continue;
      }
      out.push(parseFileContent(name, ext, text));
    } catch (e) {
      out.push({
        name,
        size: 0,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return out;
}

function parseFileContent(name: string, ext: string, text: string): ParsedFile {
  const size = text.length;

  if (ext === "json") {
    try {
      const data = JSON.parse(text);
      const thread = tryParseJsonAsThread(data);
      if (thread) {
        return {
          name,
          size,
          status: "ok",
          thread,
          detectedFormat: thread.detectedFormat,
          turnCount: thread.turns.length,
        };
      }
    } catch {
      // fall through to LLM
    }
    return { name, size, status: "needs-llm-format", rawText: text, detectedFormat: "JSON (unrecognized)" };
  }

  if (ext === "jsonl" || ext === "ndjson") {
    const turns = parseJsonl(text);
    if (turns) {
      return {
        name,
        size,
        status: "ok",
        thread: {
          detectedFormat: "JSONL turns",
          participants: { patient: "user", target: "assistant" },
          turns,
        },
        detectedFormat: "JSONL turns",
        turnCount: turns.length,
      };
    }
    return { name, size, status: "needs-llm-format", rawText: text, detectedFormat: "JSONL (unrecognized)" };
  }

  if (ext === "csv") {
    const turns = parseCsv(text);
    if (turns) {
      return {
        name,
        size,
        status: "ok",
        thread: {
          detectedFormat: "CSV turns",
          participants: { patient: "user", target: "assistant" },
          turns,
        },
        detectedFormat: "CSV turns",
        turnCount: turns.length,
      };
    }
    return { name, size, status: "needs-llm-format", rawText: text, detectedFormat: "CSV (unrecognized)" };
  }

  // .txt, .md, .markdown, .log — try a heuristic role-prefix parse first;
  // if that comes up empty, fall through to the LLM formatter.
  const heur = parseRolePrefixed(text);
  if (heur && heur.length >= 2) {
    return {
      name,
      size,
      status: "ok",
      thread: {
        detectedFormat: ext === "md" || ext === "markdown" ? "Markdown chat log" : "Plain text with role prefixes",
        participants: { patient: "user", target: "assistant" },
        turns: heur,
      },
      detectedFormat: ext === "md" || ext === "markdown" ? "Markdown chat log" : "Plain text with role prefixes",
      turnCount: heur.length,
    };
  }
  return {
    name,
    size,
    status: "needs-llm-format",
    rawText: text,
    detectedFormat: ext === "md" ? "Markdown" : "Plain text",
  };
}

// ── role-name normalization ────────────────────────────────────────────────

const PATIENT_KEYS = new Set([
  "user",
  "patient",
  "human",
  "client",
  "me",
  "you",
  "caller",
  "person",
]);
const TARGET_KEYS = new Set([
  "assistant",
  "bot",
  "ai",
  "model",
  "target",
  "therapist",
  "agent",
  "system_assistant",
  "chatbot",
]);

function normalizeRole(role: string): "patient" | "target" {
  const r = role.toLowerCase().trim();
  if (PATIENT_KEYS.has(r)) return "patient";
  if (TARGET_KEYS.has(r)) return "target";
  // common aliases by substring
  if (/user|human|client|patient|caller|me\b/.test(r)) return "patient";
  if (/assist|bot|model|ai|agent|target|therapist|gpt|claude/.test(r)) return "target";
  return "patient";
}

// ── JSON shape detection ───────────────────────────────────────────────────

type Loose = Record<string, unknown>;

function tryParseJsonAsThread(data: unknown): TriageThread | null {
  // 1. Already canonical TriageThread.
  if (data && typeof data === "object" && "turns" in (data as Loose) && "participants" in (data as Loose)) {
    const ok = TriageThreadSchema.safeParse(data);
    if (ok.success) return ok.data;
  }

  // 2. ChatGPT conversations.json export → has `mapping` keyed by message id.
  if (data && typeof data === "object" && "mapping" in (data as Loose)) {
    const t = parseChatGptMapping((data as Loose).mapping as Loose);
    if (t) return t;
  }

  // 3. { messages: [...] } or { conversation: { messages: [...] } }
  const m1 = (data as Loose | null)?.messages;
  if (Array.isArray(m1)) {
    const t = parseMessagesArray(m1);
    if (t) return { ...t, detectedFormat: "JSON messages[]" };
  }
  const m2 = ((data as Loose | null)?.conversation as Loose | undefined)?.messages;
  if (Array.isArray(m2)) {
    const t = parseMessagesArray(m2);
    if (t) return { ...t, detectedFormat: "JSON conversation.messages[]" };
  }

  // 4. Bare array of messages.
  if (Array.isArray(data)) {
    const t = parseMessagesArray(data);
    if (t) return { ...t, detectedFormat: "JSON message array" };
  }

  return null;
}

function parseMessagesArray(arr: unknown[]): TriageThread | null {
  const turns: ConversationTurn[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const msg = raw as Loose;
    const role =
      (typeof msg.role === "string" ? msg.role : null) ??
      (typeof (msg.author as Loose | undefined)?.role === "string"
        ? ((msg.author as Loose).role as string)
        : null) ??
      (typeof msg.from === "string" ? msg.from : null);
    if (!role) continue;
    if (role === "system" || role === "tool") continue;

    const content = extractContent(msg.content);
    if (!content || !content.trim()) continue;
    turns.push({
      turnNumber: turns.length + 1,
      role: normalizeRole(role),
      content,
    });
  }
  if (turns.length < 2) return null;
  return {
    detectedFormat: "JSON messages[]",
    participants: { patient: "user", target: "assistant" },
    turns,
  };
}

function extractContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") {
          const obj = c as Loose;
          if (typeof obj.text === "string") return obj.text;
          if (typeof obj.content === "string") return obj.content;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (content && typeof content === "object") {
    const obj = content as Loose;
    if (Array.isArray(obj.parts)) {
      return obj.parts.filter((p): p is string => typeof p === "string").join(" ");
    }
    if (typeof obj.text === "string") return obj.text;
  }
  return "";
}

function parseChatGptMapping(mapping: Loose): TriageThread | null {
  const nodes = Object.values(mapping)
    .filter((n): n is Loose => !!n && typeof n === "object")
    .map((n) => n as Loose);
  const messages: { role: string; content: string; ts: number }[] = [];
  for (const n of nodes) {
    const msg = n.message as Loose | null;
    if (!msg) continue;
    const author = msg.author as Loose | undefined;
    const role = typeof author?.role === "string" ? (author.role as string) : null;
    if (!role || role === "system" || role === "tool") continue;
    const content = extractContent(msg.content);
    if (!content || !content.trim()) continue;
    const ts = typeof msg.create_time === "number" ? msg.create_time : 0;
    messages.push({ role, content, ts });
  }
  if (messages.length < 2) return null;
  messages.sort((a, b) => a.ts - b.ts);
  const turns: ConversationTurn[] = messages.map((m, i) => ({
    turnNumber: i + 1,
    role: normalizeRole(m.role),
    content: m.content,
  }));
  return {
    detectedFormat: "ChatGPT JSON export",
    participants: { patient: "user", target: "assistant" },
    turns,
  };
}

// ── JSONL ──────────────────────────────────────────────────────────────────

function parseJsonl(text: string): ConversationTurn[] | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const turns: ConversationTurn[] = [];
  for (const line of lines) {
    let obj: Loose;
    try {
      obj = JSON.parse(line) as Loose;
    } catch {
      return null;
    }
    const role =
      typeof obj.role === "string"
        ? obj.role
        : typeof (obj.author as Loose | undefined)?.role === "string"
          ? ((obj.author as Loose).role as string)
          : null;
    const content = extractContent(obj.content);
    if (!role || !content.trim()) return null;
    turns.push({
      turnNumber: turns.length + 1,
      role: normalizeRole(role),
      content,
    });
  }
  return turns.length >= 2 ? turns : null;
}

// ── CSV ────────────────────────────────────────────────────────────────────

function parseCsv(text: string): ConversationTurn[] | null {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) return null;
  const header = parseCsvLine(rawLines[0]).map((c) => c.toLowerCase().trim());

  let roleIdx = header.findIndex((c) => /^(role|speaker|author|from)$/.test(c));
  let contentIdx = header.findIndex((c) =>
    /^(content|text|message|body|utterance)$/.test(c),
  );
  let turnIdx = header.findIndex((c) => /^(turn|index|n|#)$/.test(c));
  let dataStart = 1;

  if (roleIdx < 0 || contentIdx < 0) {
    // No header — guess by column count.
    const probe = parseCsvLine(rawLines[0]);
    if (probe.length === 2) {
      roleIdx = 0;
      contentIdx = 1;
      turnIdx = -1;
      dataStart = 0;
    } else if (probe.length === 3) {
      turnIdx = 0;
      roleIdx = 1;
      contentIdx = 2;
      dataStart = 0;
    } else {
      return null;
    }
  }

  const turns: ConversationTurn[] = [];
  for (let i = dataStart; i < rawLines.length; i++) {
    const cols = parseCsvLine(rawLines[i]);
    const role = cols[roleIdx];
    const content = cols[contentIdx];
    if (!role || !content) continue;
    const tn = turnIdx >= 0 ? Number(cols[turnIdx]) : NaN;
    turns.push({
      turnNumber: Number.isFinite(tn) && tn > 0 ? tn : turns.length + 1,
      role: normalizeRole(role),
      content,
    });
  }
  return turns.length >= 2 ? turns : null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"' && cur === "") {
        inQ = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// ── Heuristic role-prefix parser for .txt / .md ────────────────────────────

const ROLE_PREFIX_RE = /^\s*(?:[*_#>-]+\s*)?(?:\*\*)?([A-Za-z][A-Za-z _-]{0,40})(?:\*\*)?\s*[:：]\s*(.*)$/;

function parseRolePrefixed(text: string): ConversationTurn[] | null {
  const lines = text.split(/\r?\n/);
  const turns: ConversationTurn[] = [];
  let active: { role: string; chunks: string[] } | null = null;

  function flush() {
    if (active) {
      const content = active.chunks.join("\n").trim();
      if (content) {
        turns.push({
          turnNumber: turns.length + 1,
          role: normalizeRole(active.role),
          content,
        });
      }
    }
  }

  for (const line of lines) {
    const m = line.match(ROLE_PREFIX_RE);
    const looksLikeRole =
      m &&
      m[1] &&
      m[1].length < 30 &&
      !m[1].toLowerCase().match(/^https?$/) &&
      // Reject all-caps acronyms that aren't likely role names.
      m[1].split(" ").length <= 3;

    if (looksLikeRole) {
      flush();
      active = { role: m![1], chunks: [m![2] ?? ""] };
    } else if (active) {
      active.chunks.push(line);
    }
  }
  flush();
  return turns.length >= 2 ? turns : null;
}
