"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Loads the postmortem markdown for the given signoff. If the cached copy
 * is null on first render, POSTs the generate endpoint to mint one. Renders
 * GFM markdown styled for the print page.
 */
export function ReportMarkdown({
  id,
  initial,
}: {
  id: string;
  initial: string | null;
}) {
  const [markdown, setMarkdown] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (markdown !== null) return;
    let cancelled = false;
    (async () => {
      setGenerating(true);
      try {
        const r = await fetch(
          `/api/signoffs/${encodeURIComponent(id)}/postmortem`,
          { method: "POST" },
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        if (!cancelled) setMarkdown(data.markdown ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, markdown]);

  if (error) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          color: "#a6324a",
          fontSize: 12,
          padding: "16px 0",
        }}
      >
        Could not generate postmortem: {error}
      </div>
    );
  }

  if (markdown === null || generating) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          color: "#7a7770",
          fontSize: 12,
          padding: "32px 0",
        }}
      >
        Apollo is drafting the postmortem… this takes 10–30 seconds.
      </div>
    );
  }

  return (
    <article className="print-report-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}
