import { NextRequest } from "next/server";
import { z } from "zod";
import {
  HAIKU_MODEL,
  POSTMORTEM_SYSTEM,
  TriageThreadSchema,
  getHaiku,
  transcriptText,
} from "@/lib/triage";

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

    const stream = await getHaiku().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 4000,
      system: POSTMORTEM_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("[/api/triage/postmortem stream]", err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[/api/triage/postmortem]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
