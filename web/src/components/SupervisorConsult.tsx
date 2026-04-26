"use client";

import { useState } from "react";

type Exchange = { role: "q" | "a"; text: string };

type Props = {
  caseId: string;
  seed?: Exchange[];
};

export function SupervisorConsult({ caseId, seed = [] }: Props) {
  const [exchanges, setExchanges] = useState<Exchange[]>(seed);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    const nextExchanges: Exchange[] = [...exchanges, { role: "q", text: question }];
    setExchanges(nextExchanges);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, question, history: exchanges }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExchanges([...nextExchanges, { role: "a", text: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 620,
        marginTop: 96,
        paddingTop: 24,
        borderTop: "1px solid var(--ink)",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink)",
          margin: "0 0 28px 0",
        }}
      >
        Consult the Supervisor
      </h3>

      {exchanges.map((x, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr",
            gap: 12,
            marginBottom: 22,
            paddingBottom: 22,
            borderBottom:
              i === exchanges.length - 1 ? "none" : "1px solid var(--rule)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--margin)",
              paddingTop: 4,
            }}
          >
            {x.role.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              lineHeight: 1.55,
              color: x.role === "q" ? "var(--ink-2)" : "var(--ink)",
              fontStyle: x.role === "q" ? "italic" : "normal",
              whiteSpace: "pre-wrap",
            }}
          >
            {x.text}
          </div>
        </div>
      ))}

      {loading && (
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--margin)",
            marginBottom: 22,
          }}
        >
          The supervisor is considering your question…
        </div>
      )}
      {error && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--oxblood)",
            marginBottom: 16,
          }}
        >
          Error: {error}
        </div>
      )}

      <form onSubmit={submit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the supervisor about this case…"
          rows={2}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 18px",
            background: "var(--bone-2)",
            border: "1px solid var(--rule)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--ink)",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--margin)",
          }}
        >
          <span>⌘↵ to send</span>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: loading || !input.trim() ? "var(--margin)" : "var(--oxblood)",
              background: "transparent",
              border: "none",
              cursor: loading || !input.trim() ? "default" : "pointer",
              padding: 0,
            }}
          >
            → Send
          </button>
        </div>
      </form>
    </div>
  );
}
