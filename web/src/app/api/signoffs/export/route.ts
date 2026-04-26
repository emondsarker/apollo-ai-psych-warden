/**
 * Corpus export — bundles every approved (or every decided) signoff
 * into a single zip with combined dpo.jsonl / sft.jsonl / index.json
 * at the top level and a per-case folder under cases/{id}/.
 *
 * Query params:
 *   ?approved=0   include returned cases too (default: approved only)
 *   ?variants=1   generate three register variants per case (slow)
 */

import { NextRequest } from "next/server";
import { listSignoffs } from "@/lib/signoffs";
import { buildCorpusBundle } from "@/lib/training-export";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const approvedOnly = url.searchParams.get("approved") !== "0";
    const withVariants = url.searchParams.get("variants") === "1";

    const records = await listSignoffs();
    const { buffer, included, skipped } = await buildCorpusBundle(records, {
      approvedOnly,
      withVariants,
    });

    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const filename = `primum-corpus-${stamp}.zip`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Cases-Included": String(included),
        "X-Cases-Skipped": String(skipped),
      },
    });
  } catch (err) {
    console.error("[/api/signoffs/export]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
