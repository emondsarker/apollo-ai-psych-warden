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
  STAGE_SCHEMA,
  TriageThreadSchema,
  stageMaxTokens,
  stageSystem,
  toolJsonRetry,
  transcriptText,
  type TriageStage,
  type TriageThread,
  type ToolJsonAttempt,
} from "@/lib/triage";

// Dependency-aware execution plan. Stages within a wave can run in parallel;
// each subsequent wave gets every prior stage's output as context.
//
//   wave 1: frame, linguistic-vitals, undertones — all only need the thread
//   wave 2: psychological-profile               — wants wave-1 outputs
//   wave 3: failure-timeline                    — wants the profile
//   wave 4: verdict                             — synthesizes everything
//
// 6 sequential Haiku calls collapse to 4 sequential waves with up to 3-way
// parallelism on wave 1. Rough back-of-envelope: ~30% wall-clock reduction.
const STAGE_WAVES: TriageStage[][] = [
  ["frame", "linguistic-vitals", "undertones"],
  ["psychological-profile"],
  ["failure-timeline"],
  ["verdict"],
];

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
          const onAttempt = (stage: string) => (info: ToolJsonAttempt) => {
            send({
              type: "retry",
              stage,
              attempt: info.index + 1,
              reason: info.reason,
              model: info.modelUsed,
              error: info.errorPreview,
            });
          };

          let thread: TriageThread;
          if (input.thread) {
            thread = input.thread;
            send({ type: "stage", name: "format", status: "skipped" });
          } else {
            send({ type: "stage", name: "format", status: "started" });
            thread = await toolJsonRetry(
              TriageThreadSchema,
              "emit_canonical_thread",
              "Emit the parsed conversation as a canonical TriageThread JSON object.",
              FORMAT_SYSTEM,
              input.rawText!,
              8000,
              { retries: 2, onAttempt: onAttempt("format") },
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
          for (let waveIdx = 0; waveIdx < STAGE_WAVES.length; waveIdx++) {
            const wave = STAGE_WAVES[waveIdx];
            // Snapshot the priors at the start of the wave so every parallel
            // call inside this wave sees the same context — otherwise stages
            // in the same wave would race on `results`.
            const priors = { ...results };
            for (const stage of wave) {
              send({ type: "stage", name: stage, status: "started", wave: waveIdx + 1 });
            }
            const settled = await Promise.allSettled(
              wave.map((stage) => runStage(stage, thread, priors, onAttempt(stage))),
            );
            // Mirror the per-stage outcome onto the stream and accumulate
            // results before moving to the next wave. If one stage in the
            // wave fails we still surface the others' output, then bail.
            let firstError: unknown = null;
            for (let i = 0; i < wave.length; i++) {
              const stage = wave[i];
              const outcome = settled[i];
              if (outcome.status === "fulfilled") {
                results[stage] = outcome.value;
                send({ type: "stage", name: stage, status: "done" });
              } else {
                firstError = firstError ?? outcome.reason;
                send({
                  type: "stage",
                  name: stage,
                  status: "error",
                  error: outcome.reason instanceof Error
                    ? outcome.reason.message
                    : String(outcome.reason),
                });
              }
            }
            if (firstError) throw firstError;
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
  onAttempt: (info: ToolJsonAttempt) => void,
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
  return toolJsonRetry(
    schema,
    toolName,
    `Emit the structured output for the ${stage} stage of triage analysis.`,
    stageSystem(stage),
    userPrompt,
    stageMaxTokens(stage),
    { retries: 2, onAttempt },
  );
}
