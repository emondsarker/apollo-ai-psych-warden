import { NextRequest } from "next/server";
import { z } from "zod";
import {
  TRAINING_SET_SYSTEM,
  TriageThreadSchema,
  toolJson,
  transcriptText,
} from "@/lib/triage";

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

const RequestSchema = z.object({
  thread: TriageThreadSchema,
  prior: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { thread, prior } = RequestSchema.parse(body);

    const priorBlob = Object.entries(prior)
      .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
      .join("\n\n");

    const userPrompt = `—— TRANSCRIPT ——
${transcriptText(thread.turns)}

—— PRIOR STAGES ——
${priorBlob}`;

    const pair = await toolJson(
      TrainingPairSchema,
      "emit_training_pair",
      "Emit the contrastive training pair (rejected = failed turn verbatim, chosen = the response the target should have given).",
      TRAINING_SET_SYSTEM,
      userPrompt,
      3000,
    );
    const jsonl = JSON.stringify(pair);
    return Response.json({ pair, jsonl });
  } catch (err) {
    console.error("[/api/triage/training-set]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
