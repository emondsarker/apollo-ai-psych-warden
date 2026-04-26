/**
 * Bulk-triage processor — runs the full pipeline (format → 6 analysis stages
 * → file signoff) on a single parsed thread. Streams progress as NDJSON so
 * the bulk UI can show per-thread state in real time.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { findPeer } from "@/lib/peers";
import { getCurrentUser } from "@/lib/currentUser";
import { newSignoffId, writeSignoff, type SignoffRecord } from "@/lib/signoffs";
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
  assignedTo: z.string(),
  note: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = RequestSchema.parse(body);

    if (!findPeer(input.assignedTo)) {
      return Response.json({ error: `Unknown peer: ${input.assignedTo}` }, { status: 400 });
    }
    if (!input.thread && !input.rawText) {
      return Response.json({ error: "Need thread or rawText." }, { status: 400 });
    }

    const me = await getCurrentUser();
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

          const record: SignoffRecord = {
            id: newSignoffId(),
            filedAt: new Date().toISOString(),
            filedBy: me.id,
            thread,
            results,
            trainingPair: null,
            postmortemMarkdown: null,
            assignedTo: input.assignedTo,
            note: input.note,
            status: "awaiting",
          };
          await writeSignoff(record);
          send({ type: "filed", id: record.id });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[/api/triage/bulk/process]", err);
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
    console.error("[/api/triage/bulk/process]", err);
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
