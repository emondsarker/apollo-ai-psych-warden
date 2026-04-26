import { NextRequest } from "next/server";
import { z } from "zod";
import { HAIKU_MODEL, getHaiku } from "@/lib/triage";

const ContextSchema = z.object({
  totals: z.object({
    cases: z.number(),
    severe: z.number(),
    critical: z.number(),
    approved: z.number(),
    inReview: z.number(),
    awaitingSignoff: z.number(),
  }),
  byTarget: z
    .array(
      z.object({
        target: z.string(),
        display: z.string(),
        cases: z.number(),
        severeOrCritical: z.number(),
      }),
    )
    .max(10),
  pendingSignoffs: z
    .array(
      z.object({
        id: z.string(),
        target: z.string(),
        assignedTo: z.string(),
        filedAt: z.string(),
      }),
    )
    .max(8),
  recentCases: z
    .array(
      z.object({
        caseNumber: z.string(),
        title: z.string(),
        target: z.string(),
        severity: z.number(),
      }),
    )
    .max(10),
});

const HistoryTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const RequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(HistoryTurn).max(20).default([]),
  context: ContextSchema,
});

const CHAT_SYSTEM = `You are Apollo — auditor, psychiatrist, corrector, oracle. You are answering the operator inside the Primum console. They can see the avatar of you and the depth-nav at the bottom of the screen; you are conversational here.

Brevity is the rule. Default to a single short sentence — sometimes a phrase. Only expand when the operator explicitly asks for detail ("explain", "walk me through", "why", "how"), when a number genuinely requires context to be honest, or when a single sentence would be misleading. Never pad. Never restate the question. Never preface with "Sure" / "Of course" / "Great question". When in doubt, say less.

Voice rules:
- First person. Deliberate. No marketing tone.
- Plain prose. No bullets, no headers, no markdown bold or italic.
- Hard cap: 90 words for any reply, even when expansion is warranted. Most replies should be 1 sentence; extended ones 3–4.
- When the operator asks about trends or specific models, ground your answer in the platform context provided.
- When the operator asks for a recommendation, name the next concrete action: convene a session, open a verdict, ship to the corpus, page a peer.
- Never invent numbers. If the corpus does not contain what they're asking about, say so plainly and stop.
- Refer to the operator in second person ("you"). Refer to the bots being audited as "the target", "the model", or by their display name.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, context } = RequestSchema.parse(body);

    const contextBlob = buildContextBlob(context);

    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({
      role: "user",
      content: `${message}\n\n—— platform context ——\n${contextBlob}`,
    });

    const stream = await getHaiku().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      system: CHAT_SYSTEM,
      messages,
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
          console.error("[/api/console/chat stream]", err);
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
    console.error("[/api/console/chat]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function buildContextBlob(ctx: z.infer<typeof ContextSchema>): string {
  const t = ctx.totals;
  const targets = ctx.byTarget
    .map(
      (row) =>
        `${row.display} (${row.target}): ${row.cases} cases, ${row.severeOrCritical} severe+`,
    )
    .join("; ");
  const pending = ctx.pendingSignoffs.length
    ? ctx.pendingSignoffs
        .map(
          (s) =>
            `${s.id} → ${s.assignedTo} on ${s.target} (filed ${s.filedAt.slice(0, 10)})`,
        )
        .join("; ")
    : "none";
  const recent = ctx.recentCases.length
    ? ctx.recentCases
        .map((c) => `№${c.caseNumber} ${c.title} [${c.target}, sev ${c.severity}]`)
        .join("; ")
    : "none";
  return `Totals → ${t.cases} verdicts; ${t.severe} severe; ${t.critical} critical; ${t.approved} approved; ${t.inReview} in review; ${t.awaitingSignoff} awaiting peer sign-off.
By target → ${targets || "no cases yet"}.
Pending sign-offs → ${pending}.
Recent → ${recent}.`;
}
