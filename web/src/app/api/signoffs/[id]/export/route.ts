/**
 * Per-case training-bundle export. Returns a zip with:
 *   case.json · transcript.txt/.json · analysis.json · postmortem.md
 *   ai-review.json · dpo.jsonl · dpo-variants.jsonl · sft.jsonl · README.md
 *
 * Side effects: any artefacts that didn't exist on the signoff record
 * (postmortem, training pair) are generated and persisted back so
 * subsequent visits don't re-pay the LLM cost.
 */

import { NextRequest } from "next/server";
import { getSignoff, writeSignoff } from "@/lib/signoffs";
import { buildCaseBundle } from "@/lib/training-export";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = await getSignoff(id);
    if (!record) {
      return Response.json({ error: "Signoff not found" }, { status: 404 });
    }
    const url = new URL(req.url);
    const withVariants = url.searchParams.get("variants") !== "0";

    const { buffer, artefacts } = await buildCaseBundle(record, { withVariants });

    // Persist anything we minted on the way through.
    if (!record.postmortemMarkdown || !record.trainingPair) {
      await writeSignoff({
        ...record,
        postmortemMarkdown: artefacts.postmortem,
        trainingPair: artefacts.pair,
      });
    }

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${record.id}-bundle.zip"`,
        "X-Variants-Included": String(artefacts.variants.length),
      },
    });
  } catch (err) {
    console.error("[/api/signoffs/[id]/export]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
