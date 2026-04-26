import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { findPeer } from "@/lib/peers";
import { getSignoff, updateSignoffDecision } from "@/lib/signoffs";

const RequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { decision, note } = RequestSchema.parse(body);

    const existing = await getSignoff(id);
    if (!existing) {
      return Response.json({ error: "Signoff not found" }, { status: 404 });
    }
    const me = await getCurrentUser();
    if (existing.assignedTo !== me.id) {
      const reviewer = findPeer(existing.assignedTo);
      return Response.json(
        {
          error: `This sign-off is assigned to ${reviewer?.name ?? existing.assignedTo}. Switch profile to act on it.`,
        },
        { status: 403 },
      );
    }

    const updated = await updateSignoffDecision(id, decision, me.id, note);
    return Response.json({ ok: true, record: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
