import { NextRequest } from "next/server";
import { z } from "zod";
import { TriageThreadSchema } from "@/lib/triage";
import { findPeer } from "@/lib/peers";
import { newSignoffId, writeSignoff } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";

const RequestSchema = z.object({
  thread: TriageThreadSchema,
  results: z.record(z.string(), z.unknown()),
  trainingPair: z.unknown().nullable(),
  postmortemMarkdown: z.string().nullable(),
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
    const me = await getCurrentUser();
    const record = {
      ...input,
      id: newSignoffId(),
      filedAt: new Date().toISOString(),
      filedBy: me.id,
      status: "awaiting" as const,
    };
    await writeSignoff(record);
    return Response.json({ ok: true, id: record.id });
  } catch (err) {
    console.error("[/api/triage/file]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
