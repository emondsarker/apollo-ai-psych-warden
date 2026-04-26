import { NextRequest } from "next/server";
import { parseZipBuffer } from "@/lib/bulk-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file." }, { status: 400 });
    }
    if (!/\.zip$/i.test(file.name)) {
      return Response.json({ error: "Expected a .zip archive." }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return Response.json({ error: "Zip too large (cap 50 MB)." }, { status: 413 });
    }

    const buf = await file.arrayBuffer();
    const parsed = await parseZipBuffer(buf);

    // Strip thread bodies down for the listing response — they round-trip back
    // to /process via id-keyed payloads we'll attach when the user kicks off
    // analysis. Keep the thread itself in the response so the client can
    // inspect turns, but trim raw text since it can be large.
    const summary = parsed.map((p) => {
      if (p.status === "ok") {
        return {
          name: p.name,
          size: p.size,
          status: p.status,
          detectedFormat: p.detectedFormat,
          turnCount: p.turnCount,
          thread: p.thread,
          rawText: null,
        };
      }
      if (p.status === "needs-llm-format") {
        return {
          name: p.name,
          size: p.size,
          status: p.status,
          detectedFormat: p.detectedFormat,
          turnCount: null,
          thread: null,
          rawText: p.rawText,
        };
      }
      return {
        name: p.name,
        size: p.size,
        status: p.status,
        error: p.error,
      };
    });

    return Response.json({ files: summary });
  } catch (err) {
    console.error("[/api/triage/bulk/parse]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
