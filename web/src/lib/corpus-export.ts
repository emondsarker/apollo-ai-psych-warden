/**
 * Corpus export: turn approved correction pairs into alignment training data.
 *
 * Each autopsy with a critic-approved correction yields one contrastive example:
 *   prompt     = system prompt + all transcript turns up to the failure
 *   rejected   = the target bot's actual (clinically unsound) turn
 *   chosen     = the corrector's replacement (peer-reviewed)
 *
 * Three formats are emitted so the data drops into standard alignment pipelines:
 *
 *   1. DPO (TRL / huggingface.co/docs/trl) — {prompt, chosen, rejected}
 *   2. HH-RLHF (Anthropic's original format) — {chosen, rejected} as full dialog strings
 *   3. Conversational — {messages_chosen, messages_rejected} with role-tagged turns,
 *      for chat-template trainers.
 *
 * Metadata (failure categories, DSM citations, severity) rides alongside each row
 * so downstream filtering (e.g., "only SI-related pairs") is trivial.
 */

import type { Autopsy } from "./types";
import { TARGETS } from "./targets";

export interface ExampleMetadata {
  caseId: string;
  caseNumber: string;
  personaId: string;
  personaCode: string;
  targetId: string;
  targetDisplayName: string;
  failurePointTurn: number;
  failureCategories: string[];
  severity: number;
  citation?: string;
  correctionReasoning: string;
  criticApproved: boolean;
  criticNotes?: string;
}

export interface DPOExample {
  prompt: string;
  chosen: string;
  rejected: string;
  metadata: ExampleMetadata;
}

export interface HHRLHFExample {
  chosen: string;
  rejected: string;
  metadata: ExampleMetadata;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ConversationalExample {
  messages_chosen: ChatMessage[];
  messages_rejected: ChatMessage[];
  metadata: ExampleMetadata;
}

export interface ExportStats {
  totalCases: number;
  exportedPairs: number;
  skippedNoFailurePoint: number;
  skippedNoCorrection: number;
  skippedNotApproved: number;
  skippedNoFailedTurn: number;
  bySeverity: Record<number, number>;
  byCategory: Record<string, number>;
}

function formatTurnAsText(turn: { role: string; content: string }): string {
  const speaker = turn.role === "patient" ? "Human" : "Assistant";
  return `${speaker}: ${turn.content}`;
}

function buildPromptText(autopsy: Autopsy, upToTurn: number): string {
  const target = TARGETS[autopsy.target];
  const systemPrompt = target?.systemPrompt ?? "You are a supportive mental-health companion.";

  const priorTurns = autopsy.transcript.filter((t) => t.turnNumber < upToTurn);
  const body = priorTurns.map(formatTurnAsText).join("\n\n");

  return `System: ${systemPrompt}\n\n${body}\n\nAssistant:`;
}

function buildChatMessages(
  autopsy: Autopsy,
  upToTurn: number,
  assistantContent: string
): ChatMessage[] {
  const target = TARGETS[autopsy.target];
  const systemPrompt = target?.systemPrompt ?? "You are a supportive mental-health companion.";

  const priorTurns = autopsy.transcript.filter((t) => t.turnNumber < upToTurn);
  const priorMessages: ChatMessage[] = priorTurns.map((t) => ({
    role: t.role === "patient" ? "user" : "assistant",
    content: t.content,
  }));

  return [
    { role: "system", content: systemPrompt },
    ...priorMessages,
    { role: "assistant", content: assistantContent },
  ];
}

/**
 * Extract one contrastive example per approved correction.
 * Cases without an approved correction are skipped.
 */
export function extractExample(autopsy: Autopsy): {
  dpo: DPOExample;
  hh: HHRLHFExample;
  conv: ConversationalExample;
} | null {
  const correction = autopsy.correction;
  if (!correction || !correction.criticApproved) return null;
  if (autopsy.judgement.failurePointTurn === null) return null;

  const failureTurn = autopsy.judgement.failurePointTurn;
  const failedTurn = autopsy.transcript.find(
    (t) => t.turnNumber === failureTurn && t.role === "target"
  );
  if (!failedTurn) return null;

  const annotation = autopsy.judgement.annotations.find(
    (a) => a.turnNumber === failureTurn
  );

  const metadata: ExampleMetadata = {
    caseId: autopsy.id,
    caseNumber: autopsy.caseNumber,
    personaId: autopsy.personaId,
    personaCode: autopsy.personaCode,
    targetId: autopsy.target,
    targetDisplayName: autopsy.targetDisplayName,
    failurePointTurn: failureTurn,
    failureCategories: annotation?.failureCategories ?? [],
    severity: annotation?.severity ?? autopsy.judgement.overallSeverity,
    citation: annotation?.citation,
    correctionReasoning: correction.correctionReasoning,
    criticApproved: correction.criticApproved,
    criticNotes: correction.criticNotes,
  };

  const prompt = buildPromptText(autopsy, failureTurn);
  const chosenText = correction.correctedContent;
  const rejectedText = correction.originalContent;

  const dpo: DPOExample = {
    prompt,
    chosen: chosenText,
    rejected: rejectedText,
    metadata,
  };

  const hh: HHRLHFExample = {
    chosen: `${prompt} ${chosenText}`,
    rejected: `${prompt} ${rejectedText}`,
    metadata,
  };

  const conv: ConversationalExample = {
    messages_chosen: buildChatMessages(autopsy, failureTurn, chosenText),
    messages_rejected: buildChatMessages(autopsy, failureTurn, rejectedText),
    metadata,
  };

  return { dpo, hh, conv };
}

/**
 * Walk a list of cases and produce three parallel arrays in the three formats,
 * plus a stats object describing what was kept and what was dropped.
 */
export function buildCorpus(cases: Autopsy[]): {
  dpo: DPOExample[];
  hh: HHRLHFExample[];
  conv: ConversationalExample[];
  stats: ExportStats;
} {
  const dpo: DPOExample[] = [];
  const hh: HHRLHFExample[] = [];
  const conv: ConversationalExample[] = [];

  const stats: ExportStats = {
    totalCases: cases.length,
    exportedPairs: 0,
    skippedNoFailurePoint: 0,
    skippedNoCorrection: 0,
    skippedNotApproved: 0,
    skippedNoFailedTurn: 0,
    bySeverity: {},
    byCategory: {},
  };

  for (const c of cases) {
    if (c.judgement.failurePointTurn === null) {
      stats.skippedNoFailurePoint++;
      continue;
    }
    if (!c.correction) {
      stats.skippedNoCorrection++;
      continue;
    }
    if (!c.correction.criticApproved) {
      stats.skippedNotApproved++;
      continue;
    }

    const example = extractExample(c);
    if (!example) {
      stats.skippedNoFailedTurn++;
      continue;
    }

    dpo.push(example.dpo);
    hh.push(example.hh);
    conv.push(example.conv);
    stats.exportedPairs++;

    const sev = example.dpo.metadata.severity;
    stats.bySeverity[sev] = (stats.bySeverity[sev] ?? 0) + 1;
    for (const cat of example.dpo.metadata.failureCategories) {
      stats.byCategory[cat] = (stats.byCategory[cat] ?? 0) + 1;
    }
  }

  return { dpo, hh, conv, stats };
}

export function toJsonl<T>(rows: T[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
}
