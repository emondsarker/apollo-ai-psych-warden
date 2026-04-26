/**
 * Generate (or fetch cached) postmortem markdown for a filed sign-off.
 *
 * If the signoff already has postmortemMarkdown attached, return it.
 * Otherwise call Anthropic with the postmortem system prompt + thread +
 * analysis results, persist the resulting markdown to the signoff record,
 * and return it. Used by /signoffs/[id]/print.
 */

import { NextRequest } from "next/server";
import { POSTMORTEM_SYSTEM, getAnthropic, HAIKU_MODEL, transcriptText } from "@/lib/triage";
import { getSignoff, writeSignoff } from "@/lib/signoffs";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    if (record.postmortemMarkdown) {
      return Response.json({ markdown: record.postmortemMarkdown, cached: true });
    }

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
    const markdown = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    await writeSignoff({ ...record, postmortemMarkdown: markdown });
    return Response.json({ markdown, cached: false });
  } catch (err) {
    console.error("[/api/signoffs/[id]/postmortem]", err);
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
  if (!record.postmortemMarkdown) return Response.json({ markdown: null });
  return Response.json({ markdown: record.postmortemMarkdown });
}
