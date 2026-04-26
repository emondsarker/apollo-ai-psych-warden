import { NextRequest } from "next/server";
import { z } from "zod";
import { TriageThreadSchema } from "@/lib/triage";
import { findPeer } from "@/lib/peers";
import { AiReviewSchema, newSignoffId, writeSignoff, type SignoffRecord } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";

const RequestSchema = z.object({
  thread: TriageThreadSchema,
  results: z.record(z.string(), z.unknown()),
  trainingPair: z.unknown().nullable(),
  postmortemMarkdown: z.string().nullable(),
  assignedTo: z.string(),
  note: z.string().max(1000).optional(),
  aiReview: AiReviewSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = RequestSchema.parse(body);
    if (!findPeer(input.assignedTo)) {
      return Response.json({ error: `Unknown peer: ${input.assignedTo}` }, { status: 400 });
    }
    const me = await getCurrentUser();
    const id = newSignoffId();
    const filedAt = new Date().toISOString();

    // If the case came in with an AI review attached, promote that review's
    // decision to the actual sign-off status. The case ships in its final
    // state — no waiting on a human to acknowledge.
    let status: SignoffRecord["status"] = "awaiting";
    let decisionNote: string | undefined;
    let decidedBy: string | undefined;
    let decidedAt: string | undefined;
    if (input.aiReview) {
      status =
        input.aiReview.finalDecision === "approved"
          ? "approved"
          : input.aiReview.finalDecision === "returned"
            ? "rejected"
            : "rejected";
      decisionNote = input.aiReview.finalNote;
      decidedBy = input.aiReview.finalDeciderPeerId;
      decidedAt = input.aiReview.decidedAt;
    }

    const record: SignoffRecord = {
      ...input,
      id,
      filedAt,
      filedBy: me.id,
      status,
      decidedAt,
      decidedBy,
      decisionNote,
      aiReview: input.aiReview,
    };
    await writeSignoff(record);
    return Response.json({ ok: true, id });
  } catch (err) {
    console.error("[/api/triage/file]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
