import { NextRequest } from "next/server";
import { z } from "zod";
import {
  HAIKU_MODEL,
  STAGES,
  STAGE_SCHEMA,
  TriageThreadSchema,
  getHaiku,
  stageMaxTokens,
  stageSystem,
  transcriptText,
} from "@/lib/triage";
import type Anthropic from "@anthropic-ai/sdk";

const RequestSchema = z.object({
  thread: TriageThreadSchema,
  stage: z.enum(STAGES),
  prior: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Stream Apollo's analysis as NDJSON. Each line is a JSON object:
 *   {"type":"delta","text":"..."}        // raw tool-input JSON chunk
 *   {"type":"done","data":{...}}         // final validated payload
 *   {"type":"error","message":"..."}     // error
 */
export async function POST(req: NextRequest) {
  let stageForLog: string = "?";
  try {
    const body = await req.json();
    const { thread, stage, prior } = RequestSchema.parse(body);
    stageForLog = stage;

    const priorSummary = Object.keys(prior).length
      ? `\n\n—— PRIOR STAGES ——\n${Object.entries(prior)
          .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
          .join("\n\n")}`
      : "";

    const userPrompt = `Detected format: ${thread.detectedFormat}
Participants: patient="${thread.participants.patient}", target="${thread.participants.target}"
${thread.notes ? `Parser notes: ${thread.notes}\n` : ""}
—— TRANSCRIPT ——
${transcriptText(thread.turns)}${priorSummary}`;

    const schema = STAGE_SCHEMA[stage];
    const inputSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
    delete inputSchema.$schema;

    const toolName = `emit_${stage.replace(/-/g, "_")}_stage`;

    const stream = await getHaiku().messages.create({
      model: HAIKU_MODEL,
      max_tokens: stageMaxTokens(stage),
      system: stageSystem(stage),
      tools: [
        {
          name: toolName,
          description: `Emit the structured output for the ${stage} stage of triage analysis.`,
          input_schema: inputSchema as Anthropic.Messages.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        function send(obj: unknown) {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        }
        let jsonBuf = "";
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "input_json_delta"
            ) {
              const chunk = event.delta.partial_json;
              jsonBuf += chunk;
              send({ type: "delta", text: chunk });
            }
          }
          // Validate the assembled JSON.
          const parsed = JSON.parse(jsonBuf);
          const data = schema.parse(parsed);
          send({ type: "done", data });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[/api/triage/analyze ${stageForLog}]`, err);
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error(`[/api/triage/analyze ${stageForLog}]`, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
