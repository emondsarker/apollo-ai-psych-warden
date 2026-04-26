"use client";

import { useState } from "react";

/**
 * Two after-signoff actions on /signoffs/[id]:
 *   • Save report as PDF — opens /signoffs/[id]/print?auto=1 in a new
 *     window, which generates the postmortem if missing then auto-fires
 *     the print dialog.
 *   • Download training pair — POSTs the generate endpoint, downloads
 *     the response as a JSONL file.
 *
 * Both are visible at all times once the page loads, regardless of
 * sign-off status — the operator might want a draft report before
 * approval, or the training pair from a returned case for revision.
 */
export function SignoffExports({
  signoffId,
  hasPostmortem,
  hasTrainingPair,
}: {
  signoffId: string;
  hasPostmortem: boolean;
  hasTrainingPair: boolean;
}) {
  const [busy, setBusy] = useState<"pdf" | "training" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function openPrint() {
    if (busy) return;
    setBusy("pdf");
    setErr(null);
    // Open a new tab pointed at the print page; PrintAutorun will fire
    // window.print() once the markdown is on screen. We don't wait — the
    // tab handles its own lifecycle.
    window.open(
      `/signoffs/${encodeURIComponent(signoffId)}/print?auto=1`,
      "_blank",
      "noopener,noreferrer",
    );
    // Clear the busy state after a beat so the button doesn't lock.
    setTimeout(() => setBusy(null), 1200);
  }

  async function downloadTrainingPair() {
    if (busy) return;
    setBusy("training");
    setErr(null);
    try {
      const res = await fetch(
        `/api/signoffs/${encodeURIComponent(signoffId)}/training`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const jsonl =
        data.jsonl ?? JSON.stringify(data.pair ?? data);
      const blob = new Blob([jsonl + "\n"], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${signoffId}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        Export
      </div>

      <button
        type="button"
        onClick={openPrint}
        disabled={busy !== null}
        className="btn btn-primary"
        style={{ height: 36, padding: "0 14px", justifyContent: "flex-start" }}
      >
        <PdfIcon />
        <span style={{ marginLeft: 8 }}>
          {busy === "pdf" ? "Opening…" : "Save report as PDF"}
        </span>
      </button>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.4,
          marginTop: -4,
          marginLeft: 2,
        }}
      >
        {hasPostmortem
          ? "Pre-rendered postmortem. Opens in print mode."
          : "Apollo will draft the postmortem first; takes 10–30s."}
      </div>

      <button
        type="button"
        onClick={downloadTrainingPair}
        disabled={busy !== null}
        className="btn btn-ghost"
        style={{ height: 36, padding: "0 14px", justifyContent: "flex-start" }}
      >
        <JsonIcon />
        <span style={{ marginLeft: 8 }}>
          {busy === "training"
            ? "Generating…"
            : hasTrainingPair
              ? "Download training pair (.jsonl)"
              : "Generate + download training pair"}
        </span>
      </button>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.4,
          marginTop: -4,
          marginLeft: 2,
        }}
      >
        Contrastive DPO/SFT pair: failed turn → corrected response, with rationale citations.
      </div>

      {err && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            marginTop: 4,
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

function PdfIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function JsonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
