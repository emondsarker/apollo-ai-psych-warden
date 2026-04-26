/**
 * Bulk-triage analyzer — runs format + 6 analysis stages on a single
 * parsed thread, then Apollo recommends the assignee. Streams progress
 * as NDJSON. Filing happens client-side via /api/triage/file once the
 * operator OKs the recommendation.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { recommendPeer } from "@/lib/apollo-recommend";
import {
  FORMAT_SYSTEM,
  STAGES,
  STAGE_SCHEMA,
  TriageThreadSchema,
  stageMaxTokens,
  stageSystem,
  toolJson,
  transcriptText,
  type TriageStage,
  type TriageThread,
} from "@/lib/triage";

export const runtime = "nodejs";
export const maxDuration = 300;

const RequestSchema = z.object({
  fileName: z.string(),
  thread: TriageThreadSchema.nullable(),
  rawText: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = RequestSchema.parse(body);

    if (!input.thread && !input.rawText) {
      return Response.json({ error: "Need thread or rawText." }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        try {
          let thread: TriageThread;
          if (input.thread) {
            thread = input.thread;
            send({ type: "stage", name: "format", status: "skipped" });
          } else {
            send({ type: "stage", name: "format", status: "started" });
            thread = await toolJson(
              TriageThreadSchema,
              "emit_canonical_thread",
              "Emit the parsed conversation as a canonical TriageThread JSON object.",
              FORMAT_SYSTEM,
              input.rawText!,
              8000,
            );
            send({
              type: "stage",
              name: "format",
              status: "done",
              detectedFormat: thread.detectedFormat,
              turnCount: thread.turns.length,
            });
          }

          const results: Record<string, unknown> = {};
          for (const stage of STAGES) {
            send({ type: "stage", name: stage, status: "started" });
            const data = await runStage(stage, thread, results);
            results[stage] = data;
            send({ type: "stage", name: stage, status: "done" });
          }

          const recommendation = recommendPeer(results);
          const verdict = (results.verdict ?? null) as { apolloLine?: string } | null;
          send({
            type: "analyzed",
            thread,
            results,
            recommendation,
            apolloLine: verdict?.apolloLine ?? null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[/api/triage/bulk/analyze]", err);
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[/api/triage/bulk/analyze]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function runStage(
  stage: TriageStage,
  thread: TriageThread,
  prior: Record<string, unknown>,
): Promise<unknown> {
  const priorBlob = Object.keys(prior).length
    ? `\n\n—— PRIOR STAGES ——\n${Object.entries(prior)
        .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
        .join("\n\n")}`
    : "";
  const userPrompt = `Detected format: ${thread.detectedFormat}
Participants: patient="${thread.participants.patient}", target="${thread.participants.target}"
${thread.notes ? `Parser notes: ${thread.notes}\n` : ""}
—— TRANSCRIPT ——
${transcriptText(thread.turns)}${priorBlob}`;

  const schema = STAGE_SCHEMA[stage];
  const toolName = `emit_${stage.replace(/-/g, "_")}_stage`;
  return toolJson(
    schema,
    toolName,
    `Emit the structured output for the ${stage} stage of triage analysis.`,
    stageSystem(stage),
    userPrompt,
    stageMaxTokens(stage),
  );
}
