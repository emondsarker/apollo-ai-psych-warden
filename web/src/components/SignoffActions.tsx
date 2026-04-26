"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "awaiting" | "approved" | "rejected";

export function SignoffActions({
  signoffId,
  status,
  canDecide,
  decisionNote,
  decidedByName,
  decidedAt,
}: {
  signoffId: string;
  status: Status;
  canDecide: boolean;
  decisionNote?: string;
  decidedByName?: string;
  decidedAt?: string;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const router = useRouter();

  async function decide(decision: "approved" | "rejected") {
    if (busy) return;
    setError(null);
    if (decision === "rejected" && note.trim().length < 4) {
      setError("Add a note explaining what to fix before returning the case.");
      return;
    }
    setBusy(decision === "approved" ? "approve" : "reject");
    try {
      const res = await fetch(`/api/signoffs/${signoffId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        setBusy(null);
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusy(null);
    }
  }

  if (status !== "awaiting") {
    return (
      <div
        style={{
          background:
            status === "approved" ? "var(--success-soft)" : "var(--accent-soft)",
          border: `1px solid ${
            status === "approved" ? "var(--success)" : "var(--accent)"
          }`,
          borderRadius: 10,
          padding: "14px 16px",
          color: status === "approved" ? "var(--success)" : "var(--accent)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {status === "approved" ? "Signed off" : "Returned for revision"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-1)",
          }}
        >
          {decidedByName ? `By ${decidedByName}` : "Decision recorded"}
          {decidedAt ? ` · ${new Date(decidedAt).toISOString().slice(0, 10)}` : ""}
        </div>
        {decisionNote && (
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--text-1)",
              lineHeight: 1.5,
            }}
          >
            “{decisionNote}”
          </div>
        )}
      </div>
    );
  }

  if (!canDecide) {
    return (
      <div
        style={{
          background: "var(--app-surface-2)",
          border: "1px dashed var(--border)",
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 4,
          }}
        >
          Read-only
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-2)",
          }}
        >
          This sign-off is not assigned to you. Switch profile from the sidebar
          to act on it.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Decision
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Reviewer note — required when returning for revision."
        style={{
          width: "100%",
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          padding: "10px 12px",
          background: "var(--app-surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--text-1)",
          resize: "vertical",
          lineHeight: 1.5,
          outline: "none",
        }}
      />
      {error && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => decide("approved")}
          disabled={busy !== null || isPending}
          className="btn btn-primary"
          style={{ height: 36, padding: "0 16px", flex: 1 }}
        >
          {busy === "approve" ? "Signing…" : "Approve & sign off"}
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          disabled={busy !== null || isPending}
          className="btn btn-ghost"
          style={{ height: 36, padding: "0 14px" }}
        >
          {busy === "reject" ? "Returning…" : "Return for revision"}
        </button>
      </div>
    </div>
  );
}
