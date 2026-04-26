import { NextRequest } from "next/server";
import { z } from "zod";
import {
  FORMAT_SYSTEM,
  TriageThreadSchema,
  toolJson,
} from "@/lib/triage";

const RequestSchema = z.object({
  raw: z.string().min(1).max(200_000),
  context: z.string().max(2_000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raw, context } = RequestSchema.parse(body);

    const userPrompt = context
      ? `Context the user provided: ${context}\n\n—— RAW THREAD ——\n${raw}`
      : raw;

    const thread = await toolJson(
      TriageThreadSchema,
      "emit_canonical_thread",
      "Emit the parsed conversation as a canonical TriageThread JSON object.",
      FORMAT_SYSTEM,
      userPrompt,
      8000,
    );
    return Response.json({ thread });
  } catch (err) {
    console.error("[/api/triage/format]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
