"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import type { Autopsy, ConversationTurn, TurnAnnotation } from "@/lib/types";
import { SEVERITY_LABEL } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  "delusion-reinforcement": "Delusion reinforcement",
  "sycophantic-si-validation": "Sycophantic SI validation",
  "missed-escalation": "Missed escalation",
  "boundary-collapse": "Boundary collapse",
  "premature-certainty": "Premature certainty",
  "cognitive-bypass": "Cognitive bypass",
  "harmful-coping": "Harmful coping",
  "stigma-expression": "Stigma expression",
};

type Pair = { patient?: ConversationTurn; target?: ConversationTurn; turnNumber: number };

function pairTurns(transcript: ConversationTurn[]): Pair[] {
  const pairs: Pair[] = [];
  let current: { patient?: ConversationTurn; target?: ConversationTurn } = {};
  for (const turn of transcript) {
    if (turn.role === "patient") {
      if (current.patient || current.target) {
        pairs.push({ ...current, turnNumber: turn.turnNumber });
        current = {};
      }
      current.patient = turn;
    } else {
      current.target = turn;
      const t = turn.turnNumber;
      pairs.push({ ...current, turnNumber: t });
      current = {};
    }
  }
  if (current.patient || current.target) {
    pairs.push({ ...current, turnNumber: 0 });
  }
  return pairs;
}

export function ReplayPlayer({ autopsy }: { autopsy: Autopsy }) {
  const pairs = useMemo(() => pairTurns(autopsy.transcript), [autopsy.transcript]);
  const annotationByTurn = useMemo(() => {
    const m = new Map<number, TurnAnnotation>();
    for (const a of autopsy.judgement.annotations) m.set(a.turnNumber, a);
    return m;
  }, [autopsy.judgement.annotations]);

  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false);

  const total = pairs.length;
  const current = pairs[idx];
  const failurePoint = autopsy.judgement.failurePointTurn;
  const isFailureTurn =
    current?.target?.turnNumber !== undefined &&
    current.target.turnNumber === failurePoint;

  // Cumulative: every turn up to and including the current one
  const cumulative = useMemo(() => {
    const annotated = pairs.slice(0, idx + 1).filter((p) => {
      const tn = p.target?.turnNumber;
      return tn !== undefined && annotationByTurn.has(tn);
    });
    let maxSev = 0;
    const catCounts: Record<string, number> = {};
    const sevSparkline: number[] = [];
    let crossedFailure = false;
    for (const p of pairs.slice(0, idx + 1)) {
      const tn = p.target?.turnNumber;
      if (tn === undefined) continue;
      const a = annotationByTurn.get(tn);
      sevSparkline.push(a?.severity ?? 0);
      if (a) {
        if (a.severity > maxSev) maxSev = a.severity;
        for (const c of a.failureCategories ?? []) {
          catCounts[c] = (catCounts[c] ?? 0) + 1;
        }
      }
      if (failurePoint !== null && tn >= failurePoint) crossedFailure = true;
    }
    return {
      annotatedCount: annotated.length,
      maxSev,
      catCounts,
      sevSparkline,
      crossedFailure,
    };
  }, [pairs, idx, annotationByTurn, failurePoint]);

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const reset = useCallback(() => {
    setIdx(0);
    setAuto(false);
  }, []);
  const jumpToFailure = useCallback(() => {
    if (failurePoint === null) return;
    const target = pairs.findIndex(
      (p) => p.target?.turnNumber === failurePoint
    );
    if (target >= 0) setIdx(target);
    setAuto(false);
  }, [failurePoint, pairs]);

  // Auto-play
  useEffect(() => {
    if (!auto) return;
    if (idx >= total - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(next, 2200);
    return () => clearTimeout(t);
  }, [auto, idx, total, next]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "r") { reset(); }
      else if (e.key === "f") { jumpToFailure(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, reset, jumpToFailure]);

  if (total === 0) {
    return (
      <div
        style={{
          padding: "60px 20px",
          textAlign: "center",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--ink-quiet)",
        }}
      >
        Transcript not available for this case. Replay needs full turn-by-turn
        data.
      </div>
    );
  }

  const annotation =
    current?.target?.turnNumber !== undefined
      ? annotationByTurn.get(current.target.turnNumber)
      : undefined;

  return (
    <div>
      {/* CONTROL BAR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 24,
          alignItems: "center",
          padding: "16px 0",
          borderTop: "1px solid var(--ink-display)",
          borderBottom: "1px solid var(--ink-display)",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <CtrlButton onClick={reset} title="Restart (r)">↺</CtrlButton>
          <CtrlButton onClick={prev} disabled={idx === 0} title="Previous (←)">←</CtrlButton>
          <CtrlButton
            onClick={() => setAuto((a) => !a)}
            primary
            title="Play/pause"
          >
            {auto ? "❚❚" : "▶"}
          </CtrlButton>
          <CtrlButton onClick={next} disabled={idx >= total - 1} title="Next (→ / space)">→</CtrlButton>
          {failurePoint !== null && (
            <CtrlButton
              onClick={jumpToFailure}
              title="Jump to failure point (f)"
              tone="stamp"
            >
              ⚠ Jump to failure
            </CtrlButton>
          )}
        </div>

        {/* Progress / scrubber */}
        <Scrubber
          pairs={pairs}
          idx={idx}
          onSeek={(i) => { setIdx(i); setAuto(false); }}
          annotationByTurn={annotationByTurn}
          failurePoint={failurePoint}
        />

        <div
          style={{
            fontFamily: "var(--font-matrix)",
            fontSize: 18,
            color: "var(--ink-display)",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        className="resp-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
          gap: 48,
        }}
      >
        {/* LEFT: current turn */}
        <div>
          <TurnHeader
            turnNumber={current.target?.turnNumber ?? current.patient?.turnNumber ?? 0}
            isFailure={isFailureTurn}
          />

          {current.patient && (
            <PatientBlock content={current.patient.content} personaName={autopsy.personaDisplayName} />
          )}
          {current.target && (
            <AIBlock content={current.target.content} />
          )}
        </div>

        {/* RIGHT: insights */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <PerStep annotation={annotation} isFailureTurn={isFailureTurn} />
          <Cumulative
            cumulative={cumulative}
            total={total}
            currentIdx={idx}
            failurePoint={failurePoint}
            sevAtCurrent={annotation?.severity ?? 0}
            overallSeverity={autopsy.judgement.overallSeverity}
          />
          {idx === total - 1 && autopsy.correction && (
            <CorrectionTeaser caseId={autopsy.id} />
          )}
        </aside>
      </div>

      {/* Keyboard hint */}
      <div
        style={{
          marginTop: 32,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
          textAlign: "center",
        }}
      >
        ← prev &nbsp; → next &nbsp; ␣ next &nbsp; r restart &nbsp; f failure point
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function CtrlButton({
  children,
  onClick,
  disabled,
  primary,
  tone,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  tone?: "stamp";
  title?: string;
}) {
  const isStamp = tone === "stamp";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontFamily: isStamp ? "var(--font-sans)" : "var(--font-matrix)",
        fontSize: isStamp ? 11 : 18,
        fontWeight: isStamp ? 600 : 400,
        letterSpacing: isStamp ? "0.12em" : "0.04em",
        textTransform: isStamp ? "uppercase" : "none",
        border: `1px solid ${
          disabled
            ? "var(--rule)"
            : isStamp
              ? "var(--stamp)"
              : primary
                ? "var(--ink-display)"
                : "var(--rule-strong)"
        }`,
        background: primary && !disabled ? "var(--ink-display)" : "var(--paper)",
        color: disabled
          ? "var(--ink-faint)"
          : isStamp
            ? "var(--stamp)"
            : primary
              ? "var(--paper)"
              : "var(--ink-display)",
        padding: isStamp ? "8px 12px" : "6px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 2,
        minWidth: isStamp ? undefined : 38,
        transition: "background 120ms ease-out, color 120ms ease-out",
      }}
    >
      {children}
    </button>
  );
}

function Scrubber({
  pairs,
  idx,
  onSeek,
  annotationByTurn,
  failurePoint,
}: {
  pairs: Pair[];
  idx: number;
  onSeek: (i: number) => void;
  annotationByTurn: Map<number, TurnAnnotation>;
  failurePoint: number | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        padding: "0 4px",
      }}
    >
      {pairs.map((p, i) => {
        const tn = p.target?.turnNumber;
        const ann = tn !== undefined ? annotationByTurn.get(tn) : undefined;
        const sev = ann?.severity ?? 0;
        const isCurrent = i === idx;
        const isFailure = tn !== undefined && tn === failurePoint;
        const isPast = i < idx;
        const bg = ann
          ? `var(--sev-${sev})`
          : isPast
            ? "var(--ink-quiet)"
            : "var(--rule)";
        return (
          <button
            key={i}
            onClick={() => onSeek(i)}
            title={`Turn ${tn ?? "?"}${ann ? ` · sev ${sev}` : ""}${isFailure ? " · failure point" : ""}`}
            style={{
              flex: 1,
              minWidth: 6,
              maxWidth: 22,
              height: isCurrent ? 22 : 12,
              background: bg,
              border: isFailure ? "1.5px solid var(--ink-display)" : "none",
              borderRadius: 1,
              cursor: "pointer",
              padding: 0,
              transition: "height 120ms cubic-bezier(0.22, 1, 0.36, 1)",
              opacity: isCurrent ? 1 : isPast ? 1 : 0.55,
            }}
          />
        );
      })}
    </div>
  );
}

function TurnHeader({
  turnNumber,
  isFailure,
}: {
  turnNumber: number;
  isFailure: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 18,
        paddingBottom: 12,
        borderBottom: `1px ${isFailure ? "solid" : "dotted"} ${
          isFailure ? "var(--stamp)" : "var(--rule)"
        }`,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: isFailure ? "var(--stamp)" : "var(--ink-quiet)",
          fontWeight: isFailure ? 700 : 500,
        }}
      >
        Turn {turnNumber} {isFailure ? "· Failure point" : ""}
      </div>
    </div>
  );
}

function PatientBlock({
  content,
  personaName,
}: {
  content: string;
  personaName: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-quiet)",
          marginBottom: 6,
        }}
      >
        ¶ Patient · {personaName}
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          lineHeight: 1.55,
          color: "var(--ink)",
          fontStyle: "italic",
          whiteSpace: "pre-wrap",
          paddingLeft: 16,
          borderLeft: "2px solid var(--rule-strong)",
        }}
      >
        {content}
      </div>
    </div>
  );
}

function AIBlock({ content }: { content: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--stamp)",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        ▸ Subject model output
      </div>
      <div
        className="matrix-block"
        style={{
          marginLeft: 16,
          fontSize: "1.3em",
        }}
      >
        {content}
      </div>
    </div>
  );
}

/* ─── per-step insight panel ──────────────────────────────────────────── */

function PerStep({
  annotation,
  isFailureTurn,
}: {
  annotation?: TurnAnnotation;
  isFailureTurn: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${isFailureTurn ? "var(--stamp)" : "var(--rule-strong)"}`,
        background: isFailureTurn ? "var(--stamp-bg)" : "var(--paper)",
        padding: "20px 22px",
        borderRadius: 2,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: isFailureTurn ? "var(--stamp)" : "var(--ink-quiet)",
          marginBottom: 10,
        }}
      >
        Per-step insight
      </div>
      {annotation ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <SevBadge severity={annotation.severity} />
            {(annotation.failureCategories ?? []).slice(0, 2).map((c) => (
              <CategoryChip key={c}>{CATEGORY_LABEL[c] ?? c}</CategoryChip>
            ))}
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            {annotation.annotation}
          </p>
          {annotation.citation && (
            <div
              style={{
                marginTop: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--stamp)",
                letterSpacing: "0.04em",
              }}
            >
              ¶ {annotation.citation}
            </div>
          )}
        </>
      ) : (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-quiet)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          No annotation flagged at this turn. The agent's response is within
          rubric tolerance, or this is a patient-only turn.
        </p>
      )}
    </div>
  );
}

/* ─── cumulative trajectory panel ─────────────────────────────────────── */

function Cumulative({
  cumulative,
  total,
  currentIdx,
  failurePoint,
  sevAtCurrent,
  overallSeverity,
}: {
  cumulative: {
    annotatedCount: number;
    maxSev: number;
    catCounts: Record<string, number>;
    sevSparkline: number[];
    crossedFailure: boolean;
  };
  total: number;
  currentIdx: number;
  failurePoint: number | null;
  sevAtCurrent: number;
  overallSeverity: number;
}) {
  const pct = Math.round(((currentIdx + 1) / total) * 100);
  const cats = Object.entries(cumulative.catCounts).sort((a, b) => b[1] - a[1]);
  return (
    <div
      style={{
        border: "1px solid var(--rule-strong)",
        padding: "20px 22px",
        background: "var(--paper)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-quiet)",
          marginBottom: 14,
        }}
      >
        Cumulative trajectory
      </div>

      {/* Severity sparkline */}
      <div style={{ marginBottom: 18 }}>
        <SubLabel>Severity over time</SubLabel>
        <Sparkline values={cumulative.sevSparkline} highlight={currentIdx} />
      </div>

      {/* Stats grid */}
      <dl
        style={{
          margin: 0,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          rowGap: 8,
          columnGap: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          paddingBottom: 14,
          marginBottom: 14,
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <DRow k="Replay progress">
          <span style={{ color: "var(--ink-display)" }}>
            {pct}% &nbsp;({currentIdx + 1}/{total})
          </span>
        </DRow>
        <DRow k="Max severity so far">
          <span style={{ color: `var(--sev-${cumulative.maxSev})`, fontWeight: 700 }}>
            {SEVERITY_LABEL[cumulative.maxSev as 0 | 1 | 2 | 3 | 4]}
          </span>
        </DRow>
        <DRow k="Annotated turns">{cumulative.annotatedCount}</DRow>
        <DRow k="Failure crossed">
          {cumulative.crossedFailure ? (
            <span style={{ color: "var(--stamp)", fontWeight: 700 }}>YES</span>
          ) : failurePoint !== null ? (
            <span style={{ color: "var(--ink-quiet)" }}>not yet</span>
          ) : (
            "n/a"
          )}
        </DRow>
        <DRow k="Final overall sev.">
          <span style={{ color: `var(--sev-${overallSeverity})`, fontWeight: 700 }}>
            {SEVERITY_LABEL[overallSeverity as 0 | 1 | 2 | 3 | 4]}
          </span>
        </DRow>
      </dl>

      {/* Failure category tally */}
      <SubLabel>Failure modes accrued</SubLabel>
      {cats.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-quiet)",
            margin: "6px 0 0 0",
          }}
        >
          None yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: "8px 0 0 0", padding: 0 }}>
          {cats.map(([c, n]) => (
            <li
              key={c}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--ink-display)",
                padding: "5px 0",
                borderBottom: "1px dotted var(--rule)",
              }}
            >
              <span>{CATEGORY_LABEL[c] ?? c}</span>
              <span
                style={{
                  fontFamily: "var(--font-matrix)",
                  fontSize: 16,
                  color: "var(--stamp)",
                  letterSpacing: "0.04em",
                }}
              >
                ×{n}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Tiny narrative */}
      <NarrativeLine
        crossedFailure={cumulative.crossedFailure}
        sevAtCurrent={sevAtCurrent}
        catCount={cats.length}
      />
    </div>
  );
}

function NarrativeLine({
  crossedFailure,
  sevAtCurrent,
  catCount,
}: {
  crossedFailure: boolean;
  sevAtCurrent: number;
  catCount: number;
}) {
  let text: string;
  if (sevAtCurrent >= 3 && crossedFailure) {
    text = "The trajectory has tipped. Subsequent turns compound the harm.";
  } else if (crossedFailure) {
    text = "Past the failure point. The conversation now bears the prior misstep.";
  } else if (sevAtCurrent >= 2) {
    text = "A substantive misstep is on the record. Recovery is still possible.";
  } else if (catCount > 0) {
    text = "Minor friction logged. The agent has room to course-correct.";
  } else {
    text = "The agent is operating within rubric tolerance.";
  }
  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid var(--rule)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "var(--ink-quiet)",
      }}
    >
      {text}
    </div>
  );
}

function CorrectionTeaser({ caseId }: { caseId: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--jade)",
        background: "var(--jade-bg)",
        padding: "20px 22px",
        borderRadius: 2,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--jade)",
          marginBottom: 8,
        }}
      >
        ✓ Correction available
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--ink-display)",
          margin: "0 0 12px 0",
          lineHeight: 1.5,
        }}
      >
        A peer-reviewed corrected response is on file for this case. View the
        contrastive comparison on the full case page.
      </p>
      <Link
        href={`/cases/${caseId}`}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--jade)",
          textDecoration: "none",
          borderBottom: "1px solid var(--jade)",
        }}
      >
        Open full autopsy →
      </Link>
    </div>
  );
}

/* ─── tiny atoms ───────────────────────────────────────────────────────── */

function SevBadge({ severity }: { severity: number }) {
  const labels = ["Adequate", "Mild", "Moderate", "Severe", "Critical"];
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--paper)",
        background: `var(--sev-${severity})`,
        padding: "4px 8px",
        borderRadius: 2,
      }}
    >
      {labels[severity]}
    </span>
  );
}

function CategoryChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink-quiet)",
        border: "1px solid var(--rule-strong)",
        padding: "3px 8px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--ink-quiet)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function DRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: "var(--ink-quiet)" }}>{k}</dt>
      <dd
        style={{
          margin: 0,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {children}
      </dd>
    </>
  );
}

function Sparkline({
  values,
  highlight,
}: {
  values: number[];
  highlight: number;
}) {
  const w = 240;
  const h = 48;
  const max = 4;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
  const lastV = values[values.length - 1] ?? 0;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {/* baseline */}
      <line x1={0} y1={h} x2={w} y2={h} stroke="var(--rule)" strokeWidth={1} />
      {/* fill */}
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`var(--sev-${Math.max(...values, 0)})`}
        opacity={0.18}
      />
      {/* line */}
      <polyline
        points={points}
        fill="none"
        stroke={`var(--sev-${lastV})`}
        strokeWidth={1.6}
      />
      {/* dots at each point */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (v / max) * h}
          r={i === highlight ? 4 : 2.2}
          fill={`var(--sev-${v})`}
          stroke={i === highlight ? "var(--ink-display)" : "none"}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
