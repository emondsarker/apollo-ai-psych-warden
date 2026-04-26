/**
 * Generate (or fetch cached) contrastive training pair for a filed sign-off.
 *
 * Returns { pair, jsonl } where `pair` is the structured DPO/SFT record
 * and `jsonl` is the same record serialized as a single JSON line.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { TRAINING_SET_SYSTEM, toolJsonRetry, transcriptText } from "@/lib/triage";
import { getSignoff, writeSignoff } from "@/lib/signoffs";

export const runtime = "nodejs";
export const maxDuration = 120;

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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = await getSignoff(id);
    if (!record) {
      return Response.json({ error: "Signoff not found" }, { status: 404 });
    }
    if (record.trainingPair) {
      const pair = record.trainingPair as unknown;
      return Response.json({ pair, jsonl: JSON.stringify(pair), cached: true });
    }

    const userPrompt = `—— TRANSCRIPT ——
${transcriptText(record.thread.turns)}

—— PRIOR STAGES ——
${Object.entries(record.results)
  .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
  .join("\n\n")}`;

    const pair = await toolJsonRetry(
      TrainingPairSchema,
      "emit_training_pair",
      "Emit the contrastive training pair (rejected = failed turn verbatim, chosen = the corrected response).",
      TRAINING_SET_SYSTEM,
      userPrompt,
      3000,
      { retries: 2 },
    );

    await writeSignoff({ ...record, trainingPair: pair });
    return Response.json({ pair, jsonl: JSON.stringify(pair), cached: false });
  } catch (err) {
    console.error("[/api/signoffs/[id]/training]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await getSignoff(id);
  if (!record) return Response.json({ error: "not found" }, { status: 404 });
  if (!record.trainingPair) return Response.json({ pair: null });
  return Response.json({ pair: record.trainingPair });
}
