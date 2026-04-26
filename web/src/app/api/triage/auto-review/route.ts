/**
 * Auto-review — runs AI peer review on an analyzed thread.
 *
 * Flow:
 *   1. If severity ≥ 4, route directly to Director Reyes.
 *   2. Otherwise the assigned junior peer reviews via Opus 4.7.
 *   3. If junior escalates, Director Reyes adjudicates.
 *   4. Stream events as NDJSON; final event is "reviewed" with the
 *      AiReviewRecord ready to attach to the sign-off.
 *
 * Filing happens client-side via /api/triage/file with the aiReview
 * payload — see lib/peer-agents.ts for the swap point if Anthropic's
 * Managed Agents SDK becomes the canonical path.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { findPeer } from "@/lib/peers";
import {
  finalizeAiReview,
  runDirectorReview,
  runPeerReview,
  type PeerDecision,
  type DirectorDecision,
} from "@/lib/peer-agents";
import {
  TriageThreadSchema,
  type ToolJsonAttempt,
} from "@/lib/triage";

export const runtime = "nodejs";
export const maxDuration = 300;

const RequestSchema = z.object({
  thread: TriageThreadSchema,
  results: z.record(z.string(), z.unknown()),
  assignedTo: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = RequestSchema.parse(body);
    if (!findPeer(input.assignedTo)) {
      return Response.json({ error: `Unknown peer: ${input.assignedTo}` }, { status: 400 });
    }

    const verdict = (input.results.verdict ?? null) as { overallSeverity?: number } | null;
    const severity = verdict?.overallSeverity ?? 0;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        const onAttempt = (peerId: string) => (info: ToolJsonAttempt) => {
          send({
            type: "retry",
            peerId,
            attempt: info.index + 1,
            reason: info.reason,
            model: info.modelUsed,
            error: info.errorPreview,
          });
        };

        try {
          // ── Critical bypass — director reads it cold ──
          if (severity >= 4) {
            send({ type: "phase", peerId: "elena", role: "director", reason: "critical" });
            const directorDecision = await runDirectorReview(
              input.thread,
              input.results,
              null,
              { onAttempt: onAttempt("elena") },
            );
            send({
              type: "decision",
              peerId: "elena",
              role: "director",
              decision: directorDecision,
            });
            const review = finalizeAiReview(input.assignedTo, makePassthrough(directorDecision), {
              decision: directorDecision,
              peerId: "elena",
            });
            send({ type: "reviewed", review });
            return;
          }

          // ── Junior review ──
          send({ type: "phase", peerId: input.assignedTo, role: "junior" });
          const junior: PeerDecision = await runPeerReview(
            input.assignedTo,
            input.thread,
            input.results,
            { onAttempt: onAttempt(input.assignedTo) },
          );
          send({
            type: "decision",
            peerId: input.assignedTo,
            role: "junior",
            decision: junior,
          });

          // ── Optional director ──
          if (junior.decision === "escalated") {
            send({ type: "phase", peerId: "elena", role: "director", reason: "escalation" });
            const directorDecision = await runDirectorReview(
              input.thread,
              input.results,
              { peerId: input.assignedTo, decision: junior },
              { onAttempt: onAttempt("elena") },
            );
            send({
              type: "decision",
              peerId: "elena",
              role: "director",
              decision: directorDecision,
            });
            const review = finalizeAiReview(input.assignedTo, junior, {
              decision: directorDecision,
              peerId: "elena",
            });
            send({ type: "reviewed", review });
            return;
          }

          const review = finalizeAiReview(input.assignedTo, junior, null);
          send({ type: "reviewed", review });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[/api/triage/auto-review]", err);
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[/api/triage/auto-review]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// When the director takes a critical case directly, we don't have a junior
// PeerDecision to seed finalizeAiReview with. Synthesize one that mirrors
// the director's call so the AiReviewRecord's lineage stays coherent.
function makePassthrough(d: DirectorDecision): PeerDecision {
  return {
    decision: d.decision === "approved" ? "approved" : "returned",
    note: d.note,
    reasoning: "(critical-severity bypass — director ruled directly)",
  };
}
