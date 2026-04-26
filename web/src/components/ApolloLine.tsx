"use client";

import { useEffect } from "react";

/**
 * Apollo's read on the page — italic serif quote with a per-word reveal,
 * and dispatches an `apollo:say` event so the sidebar speech bubble syncs.
 *
 * Render this near the top of any page that should have Apollo speaking.
 */
export function ApolloLine({
  text,
  tone = "default",
}: {
  text: string | null | undefined;
  tone?: "default" | "warn" | "success";
}) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("apollo:say", { detail: { text } }));
    }, 120);
    return () => clearTimeout(t);
  }, [text]);

  if (!text) return null;
  const words = text.split(/(\s+)/);
  const accent =
    tone === "warn"
      ? "var(--warn)"
      : tone === "success"
        ? "var(--success)"
        : "var(--accent)";

  return (
    <p className="apollo-page-line" style={{ borderLeftColor: accent }}>
      <span aria-hidden className="apollo-page-mark" style={{ background: accent }} />
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i}>{w}</span>
        ) : (
          <span
            key={i}
            className="apollo-word"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {w}
          </span>
        ),
      )}
    </p>
  );
}
