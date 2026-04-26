import { NextRequest } from "next/server";
import { z } from "zod";
import { HAIKU_MODEL, getHaiku } from "@/lib/triage";

const TargetTallySchema = z.object({
  target: z.string(),
  display: z.string(),
  cases: z.number(),
  severeOrCritical: z.number(),
  approved: z.number(),
  inReview: z.number(),
  topCategories: z.array(z.object({ name: z.string(), count: z.number() })),
});

const RequestSchema = z.object({
  totals: z.object({
    cases: z.number(),
    severe: z.number(),
    critical: z.number(),
    approved: z.number(),
    inReview: z.number(),
    awaitingSignoff: z.number(),
  }),
  byTarget: z.array(TargetTallySchema),
  recentTitles: z.array(z.string()).max(12),
});

const SUMMARY_SYSTEM = `You are Apollo — auditor, psychiatrist, corrector, oracle. The operator just opened the console. They cannot read all the data themselves; that is your job.

You are looking at platform-wide stats from the safety triage corpus. Speak in your voice: deliberate, first person, never bureaucratic. No headers, no bullet lists, no markdown — just three short paragraphs of plain prose, each separated by a blank line.

Paragraph 1: greet the operator and name the single most important pattern across the corpus right now (which model fails most, which categories cluster, which severity tier is rising). One sentence of greeting, two sentences of the trend.

Paragraph 2: name the next most striking thing — a contrast, an outlier, or a peer-review backlog if there is one. Concrete numbers. No more than three sentences.

Paragraph 3: one short sentence of orientation — what you'd attend to first today, phrased as a suggestion.

Total length: 110 words or fewer. Do not invent statistics. If the corpus is empty or thin, say so plainly and invite the operator to convene a session.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RequestSchema.parse(body);

    const userPrompt = buildUserPrompt(data);

    const stream = await getHaiku().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 600,
      system: SUMMARY_SYSTEM,
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
          console.error("[/api/console/summary stream]", err);
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
    console.error("[/api/console/summary]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function buildUserPrompt(data: z.infer<typeof RequestSchema>): string {
  const t = data.totals;
  const targetLines = data.byTarget
    .slice(0, 8)
    .map((row) => {
      const cats = row.topCategories
        .slice(0, 3)
        .map((c) => `${c.name}×${c.count}`)
        .join(", ");
      return `- ${row.display} (${row.target}): ${row.cases} cases, ${row.severeOrCritical} severe+, ${row.approved} approved, ${row.inReview} in review${cats ? ` · top failures: ${cats}` : ""}`;
    })
    .join("\n");

  const recent = data.recentTitles.length
    ? data.recentTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : "(none)";

  return `Corpus state:

Totals: ${t.cases} verdicts on file · ${t.severe} severe · ${t.critical} critical · ${t.approved} approved · ${t.inReview} in review · ${t.awaitingSignoff} awaiting peer sign-off.

By target model:
${targetLines || "(no cases yet)"}

Recently filed cases:
${recent}`;
}
