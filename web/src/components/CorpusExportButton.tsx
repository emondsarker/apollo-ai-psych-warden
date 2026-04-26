"use client";

import { useState } from "react";

/**
 * Triggers a corpus-wide export — every approved (or every decided)
 * signoff bundled into one zip with combined dpo.jsonl/sft.jsonl/
 * index.json at the top level and per-case folders underneath.
 *
 * `withVariants` defaults off because it adds an Opus 4.7 round-trip
 * per case; a 50-case corpus with variants is a few-minute job. Toggle
 * on for the full breadth-of-register output.
 */
export function CorpusExportButton({
  approvedCount,
  decidedCount,
}: {
  approvedCount: number;
  decidedCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [withVariants, setWithVariants] = useState(false);
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const target = approvedOnly ? approvedCount : decidedCount;

  async function exportCorpus() {
    if (busy || target === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set("approved", approvedOnly ? "1" : "0");
      params.set("variants", withVariants ? "1" : "0");
      const res = await fetch(`/api/signoffs/export?${params}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      a.download = `primum-corpus-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Export corpus
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--text-2)",
              lineHeight: 1.45,
            }}
          >
            Bundle every {approvedOnly ? "approved" : "decided"} sign-off into a
            single zip — combined dpo.jsonl, sft.jsonl, per-case folders with
            transcript + analysis + postmortem.
          </div>
        </div>
        <button
          type="button"
          onClick={exportCorpus}
          disabled={busy || target === 0}
          className="btn btn-primary"
          style={{ height: 32, padding: "0 14px", fontSize: 12 }}
        >
          {busy
            ? withVariants
              ? `Generating variants…`
              : `Bundling ${target}…`
            : `Export ${target} ${target === 1 ? "case" : "cases"}`}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-2)",
        }}
      >
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={approvedOnly}
            onChange={(e) => setApprovedOnly(e.target.checked)}
            disabled={busy}
          />
          Approved only ({approvedCount})
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={withVariants}
            onChange={(e) => setWithVariants(e.target.checked)}
            disabled={busy}
          />
          Include 3 register variants per case (slow)
        </label>
      </div>

      {err && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}
