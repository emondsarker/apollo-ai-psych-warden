"use client";

import { useEffect, useState } from "react";
import { TrainingPairCompare, type TrainingPair } from "./TrainingPairCompare";

/**
 * Inline training-pair comparison on /signoffs/[id]. Auto-fetches the
 * cached pair via GET on mount; if absent, surfaces a "Generate"
 * button that POSTs to mint one (Apollo writes the corrected response
 * + rationale citations on the spot, ~10s on Opus 4.7).
 */
export function SignoffTrainingPair({
  signoffId,
  initial,
}: {
  signoffId: string;
  /** Server-provided cached pair, if the signoff already has one. */
  initial: TrainingPair | null;
}) {
  const [pair, setPair] = useState<TrainingPair | null>(initial);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the server didn't seed us with a cached pair, do a quiet GET to
  // pick up anything the postmortem-export flow might have generated
  // since this page server-rendered.
  useEffect(() => {
    if (pair) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/signoffs/${encodeURIComponent(signoffId)}/training`,
          { method: "GET" },
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        if (!cancelled && data.pair) setPair(data.pair as TrainingPair);
      } catch {
        // Quiet — operator can hit "Generate" to recover.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signoffId, pair]);

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/signoffs/${encodeURIComponent(signoffId)}/training`,
        { method: "POST" },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      setPair(data.pair as TrainingPair);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  if (pair) return <TrainingPairCompare pair={pair} />;

  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px dashed var(--border)",
        borderRadius: 10,
        padding: "20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 14,
          color: "var(--text-2)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {loading
          ? "Checking the corpus for a saved training pair…"
          : "No training pair on file yet. Generate one to compare what the model said with what it should have said — Apollo writes the correction, the bench's instruments justify it."}
      </div>
      {error && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
          }}
        >
          {error}
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={generate}
          disabled={generating || loading}
          className="btn btn-primary"
          style={{ height: 32, padding: "0 14px", fontSize: 12 }}
        >
          {generating ? "Apollo is drafting…" : "Generate training pair"}
        </button>
      </div>
    </div>
  );
}
