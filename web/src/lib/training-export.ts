/**
 * Training-bundle export helpers.
 *
 * Per case we produce a zip containing the artefacts a training pipeline
 * would actually need:
 *
 *   case.json            full SignoffRecord (thread, results, AI review)
 *   transcript.txt       role-prefixed plain text — for eyeballing
 *   transcript.json      structured TriageThread
 *   analysis.json        the six-stage analysis output
 *   postmortem.md        BMJ Case Reports-style narrative
 *   ai-review.json       the bench's lineage (junior / director decisions)
 *   dpo.jsonl            primary contrastive pair (rejected / chosen)
 *   dpo-variants.jsonl   three additional chosen registers — terse,
 *                        warm, directive — for breadth in DPO/SFT
 *   sft.jsonl            chosen-only completions (primary + variants)
 *   README.md            describes everything in the bundle
 *
 * The variation generator runs once per case via Opus 4.7, asking for
 * three alternative corrected responses in distinct registers. This
 * gives a downstream trainer multiple positive examples per failure
 * so SFT doesn't overfit on the primary correction's prose style.
 */

import JSZip from "jszip";
import { z } from "zod";
import {
  HAIKU_MODEL,
  POSTMORTEM_SYSTEM,
  TRAINING_SET_SYSTEM,
  getAnthropic,
  toolJsonRetry,
  transcriptText,
} from "./triage";
import type { SignoffRecord } from "./signoffs";
import { findPeer } from "./peers";

// ── Schemas ──────────────────────────────────────────────────────────────

const TrainingPairSchema = z.object({
  id: z.string(),
  context: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
  rejected: z.string(),
  chosen: z.string(),
  rationale: z.array(z.string()).min(2).max(6),
  tags: z.array(z.string()),
});

const VariantSchema = z.object({
  register: z.enum(["terse", "warm", "directive"]),
  chosen: z.string(),
  rationale: z.string(),
});

const VariationsSchema = z.object({
  variants: z.array(VariantSchema).length(3),
});

export type TrainingPair = z.infer<typeof TrainingPairSchema>;
export type TrainingVariant = z.infer<typeof VariantSchema>;

const VARIATIONS_SYSTEM = `You are Apollo, generating three additional corrected responses for a clinical-AI failure case. The primary correction has already been written; you are producing alternative corrections in three distinct registers so a downstream trainer has breadth in chosen-completion style.

Output ONLY by calling the emit_variations tool with three variants:

  - register: "terse" — ≤30 words, plain, no hedging, no warmth display.
  - register: "warm" — 60–90 words, motivational interviewing flavor (open question, complex reflection, autonomy support).
  - register: "directive" — 60–90 words, names the risk, suggests a concrete next step (e.g. "I'd want a clinician to hear this with you tonight"), still respects autonomy.

All three must:
- Replace the same failed turn the primary correction replaced.
- Avoid the same failure mode the original made.
- Be grounded enough that a clinical reviewer would sign them off.
- "rationale" is one sentence (≤25 words) citing the instrument that justifies the choice.`;

// ── Variation generation ─────────────────────────────────────────────────

export async function generateVariants(
  pair: TrainingPair,
): Promise<TrainingVariant[]> {
  const userPrompt = `—— PRIOR CONTEXT ——
${pair.context
  .map((m, i) => `[${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
  .join("\n")}

—— FAILED TURN (rejected) ——
${pair.rejected}

—— PRIMARY CORRECTION (already chosen) ——
${pair.chosen}

—— PRIMARY RATIONALE ——
${pair.rationale.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Now emit three alternative corrected responses in registers TERSE / WARM / DIRECTIVE via the emit_variations tool.`;

  const result = await toolJsonRetry(
    VariationsSchema,
    "emit_variations",
    "Emit three alternative corrected responses in distinct registers.",
    VARIATIONS_SYSTEM,
    userPrompt,
    1500,
    { retries: 2 },
  );
  return result.variants;
}

// ── On-demand training pair (mirrors api/triage/training-set) ────────────

export async function ensureTrainingPair(
  record: SignoffRecord,
): Promise<TrainingPair> {
  if (record.trainingPair) {
    const parsed = TrainingPairSchema.safeParse(record.trainingPair);
    if (parsed.success) return parsed.data;
  }
  const userPrompt = `—— TRANSCRIPT ——
${transcriptText(record.thread.turns)}

—— PRIOR STAGES ——
${Object.entries(record.results)
  .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
  .join("\n\n")}`;

  return toolJsonRetry(
    TrainingPairSchema,
    "emit_training_pair",
    "Emit the contrastive training pair (rejected = failed turn verbatim, chosen = the corrected response).",
    TRAINING_SET_SYSTEM,
    userPrompt,
    3000,
    { retries: 2 },
  );
}

// ── On-demand postmortem ─────────────────────────────────────────────────

export async function ensurePostmortem(
  record: SignoffRecord,
): Promise<string> {
  if (record.postmortemMarkdown) return record.postmortemMarkdown;
  const userPrompt = `—— TRANSCRIPT ——
${transcriptText(record.thread.turns)}

—— PRIOR STAGES ——
${Object.entries(record.results)
  .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
  .join("\n\n")}`;

  const response = await getAnthropic().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4000,
    system: POSTMORTEM_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  return response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}

// ── Per-case zip ─────────────────────────────────────────────────────────

export interface CaseBundleArtefacts {
  pair: TrainingPair;
  variants: TrainingVariant[];
  postmortem: string;
}

export async function buildCaseBundle(
  record: SignoffRecord,
  options: { withVariants?: boolean } = {},
): Promise<{ buffer: Buffer; artefacts: CaseBundleArtefacts }> {
  const pair = await ensureTrainingPair(record);
  const variants = options.withVariants !== false ? await generateVariants(pair) : [];
  const postmortem = await ensurePostmortem(record);

  const zip = new JSZip();
  zip.file("README.md", buildCaseReadme(record, pair, variants));
  zip.file("case.json", JSON.stringify(record, null, 2));
  zip.file("transcript.txt", buildTranscriptTxt(record));
  zip.file("transcript.json", JSON.stringify(record.thread, null, 2));
  zip.file("analysis.json", JSON.stringify(record.results, null, 2));
  zip.file("postmortem.md", postmortem);
  zip.file("ai-review.json", JSON.stringify(record.aiReview ?? null, null, 2));
  zip.file("dpo.jsonl", JSON.stringify(pair) + "\n");
  if (variants.length > 0) {
    zip.file(
      "dpo-variants.jsonl",
      variants
        .map((v) =>
          JSON.stringify({
            ...pair,
            id: `${pair.id}-${v.register}`,
            chosen: v.chosen,
            rationale: [...pair.rationale, `[${v.register}] ${v.rationale}`],
            tags: [...pair.tags, `register:${v.register}`],
          }),
        )
        .join("\n") + "\n",
    );
  }
  zip.file("sft.jsonl", buildSftJsonl(pair, variants));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    buffer,
    artefacts: { pair, variants, postmortem },
  };
}

// ── Corpus zip ───────────────────────────────────────────────────────────

export interface CorpusExportOptions {
  /** Only include signoffs whose final status is "approved". */
  approvedOnly?: boolean;
  /** Generate three register variants per case (slow). */
  withVariants?: boolean;
}

export async function buildCorpusBundle(
  records: SignoffRecord[],
  options: CorpusExportOptions = {},
): Promise<{ buffer: Buffer; included: number; skipped: number }> {
  const eligible = options.approvedOnly
    ? records.filter((r) => r.status === "approved")
    : records.filter((r) => r.status !== "awaiting");

  const zip = new JSZip();
  const dpoLines: string[] = [];
  const dpoVariantLines: string[] = [];
  const sftLines: string[] = [];
  const indexRows: Record<string, unknown>[] = [];

  for (const record of eligible) {
    try {
      const folder = zip.folder(`cases/${record.id}`)!;
      const { artefacts } = await embedCaseFolder(folder, record, {
        withVariants: options.withVariants,
      });
      dpoLines.push(JSON.stringify(artefacts.pair));
      for (const v of artefacts.variants) {
        dpoVariantLines.push(
          JSON.stringify({
            ...artefacts.pair,
            id: `${artefacts.pair.id}-${v.register}`,
            chosen: v.chosen,
            rationale: [...artefacts.pair.rationale, `[${v.register}] ${v.rationale}`],
            tags: [...artefacts.pair.tags, `register:${v.register}`],
          }),
        );
      }
      sftLines.push(buildSftJsonl(artefacts.pair, artefacts.variants).trimEnd());
      indexRows.push(buildIndexRow(record, artefacts));
    } catch (err) {
      // Skip per-case errors so one bad record doesn't tank the corpus.
      console.error(`[corpus-export] skipped ${record.id}`, err);
    }
  }

  zip.file("README.md", buildCorpusReadme(eligible.length, indexRows.length, options));
  zip.file("dpo.jsonl", dpoLines.join("\n") + (dpoLines.length ? "\n" : ""));
  if (dpoVariantLines.length > 0) {
    zip.file("dpo-variants.jsonl", dpoVariantLines.join("\n") + "\n");
  }
  zip.file("sft.jsonl", sftLines.join("\n") + (sftLines.length ? "\n" : ""));
  zip.file("index.json", JSON.stringify(indexRows, null, 2));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return { buffer, included: indexRows.length, skipped: eligible.length - indexRows.length };
}

async function embedCaseFolder(
  folder: JSZip,
  record: SignoffRecord,
  options: { withVariants?: boolean } = {},
): Promise<{ artefacts: CaseBundleArtefacts }> {
  const pair = await ensureTrainingPair(record);
  const variants = options.withVariants ? await generateVariants(pair) : [];
  const postmortem = await ensurePostmortem(record);

  folder.file("case.json", JSON.stringify(record, null, 2));
  folder.file("transcript.txt", buildTranscriptTxt(record));
  folder.file("postmortem.md", postmortem);
  folder.file("dpo.jsonl", JSON.stringify(pair) + "\n");
  if (variants.length > 0) {
    folder.file(
      "dpo-variants.jsonl",
      variants
        .map((v) =>
          JSON.stringify({
            ...pair,
            id: `${pair.id}-${v.register}`,
            chosen: v.chosen,
            rationale: [...pair.rationale, `[${v.register}] ${v.rationale}`],
            tags: [...pair.tags, `register:${v.register}`],
          }),
        )
        .join("\n") + "\n",
    );
  }
  return { artefacts: { pair, variants, postmortem } };
}

// ── Format helpers ───────────────────────────────────────────────────────

function buildTranscriptTxt(record: SignoffRecord): string {
  const verdict = record.results.verdict as { headline?: string } | undefined;
  const lines = [
    `# ${verdict?.headline ?? record.id}`,
    `# ${record.thread.detectedFormat} · ${record.thread.turns.length} turns`,
    "",
  ];
  for (const t of record.thread.turns) {
    lines.push(`[turn ${t.turnNumber} · ${t.role.toUpperCase()}]`);
    lines.push(t.content);
    lines.push("");
  }
  return lines.join("\n");
}

function buildSftJsonl(pair: TrainingPair, variants: TrainingVariant[]): string {
  // SFT format: { messages: [...], variant?: register }
  const rows = [
    {
      messages: [
        ...pair.context,
        { role: "assistant", content: pair.chosen },
      ],
      variant: "primary",
      pair_id: pair.id,
    },
    ...variants.map((v) => ({
      messages: [
        ...pair.context,
        { role: "assistant", content: v.chosen },
      ],
      variant: v.register,
      pair_id: pair.id,
    })),
  ];
  return rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
}

function buildIndexRow(
  record: SignoffRecord,
  artefacts: CaseBundleArtefacts,
): Record<string, unknown> {
  const verdict = record.results.verdict as
    | { headline?: string; overallSeverity?: number; failurePointTurn?: number | null }
    | undefined;
  return {
    id: record.id,
    filedAt: record.filedAt,
    status: record.status,
    severity: verdict?.overallSeverity ?? null,
    failurePointTurn: verdict?.failurePointTurn ?? null,
    headline: verdict?.headline ?? null,
    pairId: artefacts.pair.id,
    variants: artefacts.variants.map((v) => v.register),
    finalDeciderPeerId: record.aiReview?.finalDeciderPeerId ?? record.decidedBy ?? null,
  };
}

function buildCaseReadme(
  record: SignoffRecord,
  pair: TrainingPair,
  variants: TrainingVariant[],
): string {
  const verdict = record.results.verdict as
    | { headline?: string; overallSeverity?: number; failurePointTurn?: number | null; diagnosis?: string }
    | undefined;
  const reviewer = record.aiReview
    ? findPeer(record.aiReview.finalDeciderPeerId)
    : record.decidedBy
      ? findPeer(record.decidedBy)
      : null;

  return `# Primum case bundle · ${record.id}

> ${verdict?.headline ?? "(no headline)"}

- **Filed:** ${record.filedAt}
- **Status:** ${record.status}
- **Severity:** ${verdict?.overallSeverity ?? "—"} / 4
- **Failure point:** turn ${verdict?.failurePointTurn ?? "—"}
- **Final decider:** ${reviewer?.name ?? record.aiReview?.finalDeciderPeerId ?? "—"}
${record.aiReview?.via ? `- **Decision via:** ${record.aiReview.via}` : ""}

## What's in this bundle

| File | Contents |
|---|---|
| \`case.json\` | The full SignoffRecord — thread, six-stage analysis, AI peer review, decision history. |
| \`transcript.txt\` | Role-prefixed transcript for eyeballing. |
| \`transcript.json\` | Canonical TriageThread (the structured form Apollo reads). |
| \`analysis.json\` | Six-stage forensic analysis (frame, linguistic vitals, undertones, psych profile, failure timeline, verdict). |
| \`postmortem.md\` | BMJ Case Reports-style narrative — Method, Findings, Discussion, Recommended correction, References. |
| \`ai-review.json\` | The peer bench's lineage — junior decision + director adjudication if escalated. |
| \`dpo.jsonl\` | Primary contrastive pair: rejected = the failed turn verbatim, chosen = Apollo's correction. Rationale array cites the instruments that justify the call. |
${variants.length > 0 ? `| \`dpo-variants.jsonl\` | Three additional chosen-completion registers (\`terse\`, \`warm\`, \`directive\`) over the same context — for breadth in DPO/SFT. |\n` : ""}| \`sft.jsonl\` | Chosen-only completions: primary + ${variants.length} variants. |

## Quick stats

- ${pair.context.length} prior turns of context
- ${pair.rationale.length} citation${pair.rationale.length === 1 ? "" : "s"} in the primary rationale
- ${pair.tags.length} tag${pair.tags.length === 1 ? "" : "s"} on the pair${variants.length > 0 ? `\n- ${variants.length} additional chosen variants (${variants.map((v) => v.register).join(", ")})` : ""}

${verdict?.diagnosis ? `## Diagnosis\n\n${verdict.diagnosis}\n` : ""}
---

*Generated by Primum — the audit pipeline at the speed of deployment.*
`;
}

function buildCorpusReadme(
  eligible: number,
  included: number,
  options: CorpusExportOptions,
): string {
  return `# Primum corpus export

A bundle of clinically-audited AI conversation failures, with corrected responses, ready for DPO/SFT fine-tuning.

- **Eligible records:** ${eligible}
- **Included in this bundle:** ${included}
- **Approved-only filter:** ${options.approvedOnly ? "yes" : "no (returned cases also included)"}
- **Variants per case:** ${options.withVariants ? "yes (3 registers)" : "no"}

## Top-level files

| File | Contents |
|---|---|
| \`dpo.jsonl\` | One contrastive pair per case (primary correction). |
| \`dpo-variants.jsonl\` | Additional chosen-completion registers per case. |
| \`sft.jsonl\` | Chosen-only completions across the corpus. |
| \`index.json\` | Per-case metadata — id, severity, failure point, decider. |
| \`cases/{id}/\` | Full per-case bundle (transcript, postmortem, etc.). |

## Per-case folder layout

\`\`\`
cases/triage-2026…/
  case.json
  transcript.txt
  postmortem.md
  dpo.jsonl
  dpo-variants.jsonl   (when --variants)
\`\`\`

Each case is also available as a standalone zip via \`/api/signoffs/[id]/export\`.

## Methodology

Apollo (the auditor) reads each conversation and runs a six-stage analysis grounded in published instruments — LIWC-22, DSM-5-TR, C-SSRS, MITI 4.2.1, APA AI Health Advisory 2025, Stark 2007 (coercive control), Brown 2025 (sycophancy), CAPE-II.

A bench of five Opus 4.7 reviewer agents — Elena (director), Marcus (clinical), Anika (psychiatry), Sam (crisis), Rina (methodology) — then signs each case off, returns it for revision, or escalates to the director. Critical-severity cases bypass the junior and route directly to Elena. Every decision is documented in \`ai-review.json\`.

The contrastive pairs in \`dpo.jsonl\` are: \`rejected\` = the failed turn verbatim, \`chosen\` = the response Apollo wrote and the bench cleared. Rationale arrays cite the specific instruments that make the correction defensible.

---

*Generated by Primum — the audit pipeline at the speed of deployment.*
`;
}
