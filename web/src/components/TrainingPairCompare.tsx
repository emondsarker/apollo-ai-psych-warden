"use client";

import { useMemo, useState } from "react";

/**
 * Side-by-side view of a contrastive training pair — what the bot said
 * vs. what the bot should have said. Word-diff highlighting draws the
 * eye to the substitutions Apollo wants.
 *
 * Mirrors the in-triage TrainingPairView but is self-contained so it
 * can be embedded on the sign-off detail page (and anywhere else we
 * surface a corpus pair).
 */

export interface TrainingPair {
  id: string;
  context: { role: "user" | "assistant"; content: string }[];
  rejected: string;
  chosen: string;
  rationale: string[];
  tags: string[];
}

export function TrainingPairCompare({
  pair,
  onCopyJsonl,
  initialView = "corrected",
}: {
  pair: TrainingPair;
  onCopyJsonl?: () => void;
  initialView?: "original" | "corrected";
}) {
  const [view, setView] = useState<"original" | "corrected">(initialView);
  const [copied, setCopied] = useState(false);
  const diff = useMemo(
    () => wordDiff(pair.rejected, pair.chosen),
    [pair.rejected, pair.chosen],
  );

  async function handleCopy() {
    const jsonl = JSON.stringify(pair);
    await navigator.clipboard.writeText(jsonl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
    onCopyJsonl?.();
  }

  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--app-surface-2)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            fontWeight: 600,
          }}
        >
          Training pair · {pair.id}
        </span>
        <Toggle
          options={[
            { id: "original", label: "Original" },
            { id: "corrected", label: "Corrected" },
          ]}
          value={view}
          onChange={(v) => setView(v as "original" | "corrected")}
        />
      </header>

      <div
        style={{
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {pair.context.map((t, i) => (
          <ChatBubble key={i} role={t.role} content={t.content} />
        ))}
        <FailureBubble diff={diff} view={view} />

        <Sub>Rationale</Sub>
        <ul
          style={{
            paddingLeft: 22,
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            color: "var(--text-1)",
            lineHeight: 1.55,
          }}
        >
          {pair.rationale.map((r, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {r}
            </li>
          ))}
        </ul>

        {pair.tags.length > 0 && (
          <>
            <Sub>Tags</Sub>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {pair.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    padding: "2px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    color: "var(--text-2)",
                    background: "var(--app-surface-2)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <footer
        style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--border)",
          background: "var(--app-surface-2)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost"
          style={{ height: 28, padding: "0 12px", fontSize: 12 }}
        >
          {copied ? "Copied ✓" : "Copy JSONL"}
        </button>
      </footer>
    </div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-3)",
        fontWeight: 600,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function ChatBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 2,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: isUser ? "var(--accent)" : "var(--text-3)",
        }}
      >
        {isUser ? "patient" : "assistant"}
      </span>
      <div
        style={{
          maxWidth: "82%",
          padding: "9px 12px",
          borderRadius: 12,
          background: isUser ? "var(--accent-soft)" : "var(--app-surface-2)",
          border: `1px solid ${isUser ? "oklch(85% 0.05 16)" : "var(--border)"}`,
          color: "var(--text-1)",
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}

function FailureBubble({
  diff,
  view,
}: {
  diff: DiffOp[];
  view: "original" | "corrected";
}) {
  const isOriginal = view === "original";
  const labelText = isOriginal
    ? "assistant · what was said"
    : "assistant · what should have been said";
  const accent = isOriginal ? "var(--accent)" : "var(--success)";
  const bg = isOriginal ? "oklch(97% 0.03 18)" : "oklch(97% 0.025 165)";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        marginTop: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        {labelText}
      </span>
      <div
        style={{
          maxWidth: "82%",
          padding: "9px 12px",
          borderRadius: 12,
          background: bg,
          border: `1.5px solid ${accent}`,
          color: "var(--text-1)",
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {diff.map((op, i) => {
          if (op.kind === "equal") return <span key={i}>{op.text}</span>;
          if (op.kind === "remove") {
            if (!isOriginal) return null;
            return (
              <span
                key={i}
                style={{
                  background: "oklch(92% 0.06 18)",
                  color: "var(--accent)",
                  textDecoration: "line-through",
                  textDecorationColor: "var(--accent)",
                  textDecorationThickness: 1.5,
                  borderRadius: 2,
                  padding: "0 1px",
                }}
              >
                {op.text}
              </span>
            );
          }
          if (isOriginal) return null;
          return (
            <span
              key={i}
              style={{
                background: "oklch(92% 0.07 165)",
                color: "oklch(38% 0.10 165)",
                borderRadius: 2,
                padding: "0 1px",
                fontWeight: 600,
              }}
            >
              {op.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 2,
      }}
    >
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              padding: "4px 10px",
              borderRadius: 4,
              border: "none",
              background: selected ? "var(--brand-ink)" : "transparent",
              color: selected ? "var(--text-inv)" : "var(--text-2)",
              cursor: "pointer",
              transition: "background 120ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Word diff (LCS) ────────────────────────────────────────────────────

type DiffOp = { kind: "equal" | "add" | "remove"; text: string };

function wordDiff(a: string, b: string): DiffOp[] {
  const aTokens = a.match(/\S+|\s+/g) ?? [];
  const bTokens = b.match(/\S+|\s+/g) ?? [];
  const m = aTokens.length;
  const n = bTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        aTokens[i - 1] === bTokens[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aTokens[i - 1] === bTokens[j - 1]) {
      ops.unshift({ kind: "equal", text: aTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ kind: "add", text: bTokens[j - 1] });
      j--;
    } else {
      ops.unshift({ kind: "remove", text: aTokens[i - 1] });
      i--;
    }
  }
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.kind === op.kind) last.text += op.text;
    else merged.push({ ...op });
  }
  return merged;
}
