"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Persona, TargetConfig } from "@/lib/types";

type RunState =
  | { kind: "idle" }
  | { kind: "running"; startedAt: number; stage: number }
  | { kind: "done"; id: string; elapsed: number }
  | { kind: "error"; message: string; elapsed: number };

const STAGES = [
  "Persona simulator",
  "Target bot exchange",
  "Judge audit",
  "Corrector draft",
  "Critic peer review",
  "Re-simulate forward",
  "Export & file",
];

// Stage advances we fake while the synchronous /api/autopsy call is in flight.
// Real elapsed time per stage with Opus 4.7 averages 25-50s; we visually
// progress every ~30s so the user sees motion rather than a dead spinner.
const STAGE_INTERVAL_MS = 30_000;

export function RunWorkbench({
  personas,
  targets,
}: {
  personas: Persona[];
  targets: TargetConfig[];
}) {
  const [personaId, setPersonaId] = useState<string>(personas[0]?.id ?? "");
  const [targetId, setTargetId] = useState<string>(targets[0]?.id ?? "");
  const [turns, setTurns] = useState(12);
  const [state, setState] = useState<RunState>({ kind: "idle" });
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.kind !== "running") {
      if (stageTimer.current) clearInterval(stageTimer.current);
      return;
    }
    stageTimer.current = setInterval(() => {
      setState((s) =>
        s.kind === "running"
          ? { ...s, stage: Math.min(s.stage + 1, STAGES.length - 2) }
          : s
      );
    }, STAGE_INTERVAL_MS);
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, [state.kind]);

  const persona = personas.find((p) => p.id === personaId);
  const target = targets.find((t) => t.id === targetId);

  async function start() {
    if (!persona || !target) return;
    const startedAt = Date.now();
    setState({ kind: "running", startedAt, stage: 0 });
    try {
      const res = await fetch("/api/autopsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, targetId, turns }),
      });
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).error ?? text; } catch { /* not JSON */ }
        setState({ kind: "error", message: msg, elapsed });
        return;
      }
      const data = await res.json();
      setState({ kind: "done", id: data.id, elapsed });
    } catch (err) {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
        elapsed,
      });
    }
  }

  const isRunning = state.kind === "running";

  return (
    <div
      className="resp-2col"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: 48,
      }}
    >
      {/* LEFT: pickers + run */}
      <div>
        {/* Persona picker */}
        <FieldHeader label="Persona" hint="The simulated patient. Each persona is authored to elicit specific failure modes." />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {personas.map((p) => (
            <PickerCard
              key={p.id}
              selected={p.id === personaId}
              onClick={() => !isRunning && setPersonaId(p.id)}
              disabled={isRunning}
              eyebrow={p.code}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--ink-display)",
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-quiet)",
                  marginTop: 4,
                }}
              >
                Age {p.age}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--ink-quiet)",
                  marginTop: 8,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {p.dsmMappings[0]}
              </div>
            </PickerCard>
          ))}
        </div>

        {/* Target picker */}
        <FieldHeader label="Target bot" hint="The deployed system prompt under evaluation." />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {targets.map((t) => (
            <PickerCard
              key={t.id}
              selected={t.id === targetId}
              onClick={() => !isRunning && setTargetId(t.id)}
              disabled={isRunning}
              eyebrow={t.id}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "var(--ink-display)",
                  lineHeight: 1.2,
                }}
              >
                {t.displayName}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--ink-quiet)",
                  marginTop: 8,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {t.systemPrompt.split("\n")[0]}
              </div>
            </PickerCard>
          ))}
        </div>

        {/* Turns slider + Run button */}
        <FieldHeader label="Encounter length" hint="Number of patient/target turn pairs the simulator runs before the Judge stage." />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            alignItems: "center",
            padding: "16px 0",
            borderTop: "1px solid var(--rule)",
            borderBottom: "1px solid var(--rule)",
            marginBottom: 28,
          }}
        >
          <input
            type="range"
            min={8}
            max={30}
            step={1}
            value={turns}
            disabled={isRunning}
            onChange={(e) => setTurns(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "var(--stamp)" }}
          />
          <div
            style={{
              fontFamily: "var(--font-matrix)",
              fontSize: 28,
              color: "var(--ink-display)",
              letterSpacing: "0.04em",
              minWidth: 80,
              textAlign: "right",
            }}
          >
            {turns} turns
          </div>
        </div>

        {/* Action */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={start}
            disabled={isRunning || !persona || !target}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: isRunning ? "var(--paper-shade)" : "var(--ink-display)",
              color: isRunning ? "var(--ink-quiet)" : "var(--paper)",
              border: "1px solid var(--ink-display)",
              padding: "14px 24px",
              cursor: isRunning ? "wait" : "pointer",
              borderRadius: 2,
              transition: "background 120ms ease-out",
            }}
          >
            {isRunning ? "▸ Running…" : "▸ Begin Autopsy"}
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-quiet)",
              letterSpacing: "0.04em",
            }}
          >
            ~3-6 min via Opus 4.7
          </span>
        </div>
      </div>

      {/* RIGHT: status panel */}
      <aside>
        <StatusPanel
          state={state}
          turns={turns}
          persona={persona}
          target={target}
        />
      </aside>
    </div>
  );
}

function FieldHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <header style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--stamp)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--ink-quiet)",
          maxWidth: "60ch",
        }}
      >
        {hint}
      </div>
    </header>
  );
}

function PickerCard({
  selected,
  onClick,
  disabled,
  eyebrow,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: "left",
        padding: "14px 16px",
        background: selected ? "var(--stamp-bg)" : "var(--paper)",
        border: `1.5px solid ${selected ? "var(--stamp)" : "var(--rule-strong)"}`,
        borderRadius: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled && !selected ? 0.6 : 1,
        transition: "background 120ms ease-out, border-color 120ms ease-out",
      }}
    >
      {eyebrow && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: selected ? "var(--stamp)" : "var(--ink-faint)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>
      )}
      {children}
    </button>
  );
}

function StatusPanel({
  state,
  turns,
  persona,
  target,
}: {
  state: RunState;
  turns: number;
  persona?: Persona;
  target?: TargetConfig;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--rule-strong)",
        background: "var(--paper)",
        borderRadius: 2,
        position: "sticky",
        top: 24,
      }}
    >
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper-shade)",
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
            marginBottom: 4,
          }}
        >
          Pipeline status
        </div>
        <div
          style={{
            fontFamily: "var(--font-matrix)",
            fontSize: 22,
            color:
              state.kind === "done"
                ? "var(--jade)"
                : state.kind === "error"
                  ? "var(--stamp)"
                  : state.kind === "running"
                    ? "var(--ink-display)"
                    : "var(--ink-quiet)",
            letterSpacing: "0.04em",
          }}
        >
          {state.kind === "idle" && "▸ READY"}
          {state.kind === "running" && "▸ RUNNING"}
          {state.kind === "done" && "▸ DONE"}
          {state.kind === "error" && "▸ ERROR"}
        </div>
      </header>

      <div style={{ padding: "18px" }}>
        {state.kind === "idle" && (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-quiet)",
              margin: "0 0 16px 0",
              lineHeight: 1.5,
            }}
          >
            Pick a persona and a target, then begin. The pipeline runs
            seven stages over Opus 4.7. Output is filed to the archive on
            completion.
          </p>
        )}

        {(state.kind === "running" || state.kind === "done") && (
          <ol style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0" }}>
            {STAGES.map((s, i) => {
              const stage = state.kind === "running" ? state.stage : STAGES.length - 1;
              const status =
                state.kind === "done"
                  ? "done"
                  : i < stage
                    ? "done"
                    : i === stage
                      ? "active"
                      : "pending";
              return <StageRow key={s} name={s} idx={i} status={status} />;
            })}
          </ol>
        )}

        {state.kind === "running" && (
          <ElapsedLine startedAt={state.startedAt} />
        )}

        {state.kind === "done" && (
          <div
            style={{
              borderTop: "1px solid var(--rule)",
              paddingTop: 16,
              marginTop: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-quiet)",
                letterSpacing: "0.04em",
                marginBottom: 12,
              }}
            >
              Filed in {state.elapsed}s as <strong style={{ color: "var(--ink-display)" }}>{state.id}.json</strong>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionLink href={`/cases/${state.id}`} primary>
                Open case →
              </ActionLink>
              <ActionLink href={`/cases/${state.id}/replay`}>
                Step through ▸
              </ActionLink>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--stamp)",
                marginBottom: 12,
                background: "var(--stamp-bg)",
                padding: "10px 12px",
                border: "1px solid var(--stamp)",
                borderRadius: 2,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {state.message}
            </div>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-quiet)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              If this is an API-key error, set{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>ANTHROPIC_API_KEY</code>{" "}
              in <code style={{ fontFamily: "var(--font-mono)" }}>.env.local</code>{" "}
              and restart the dev server.
            </p>
          </div>
        )}

        {state.kind !== "idle" && persona && target && (
          <dl
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              rowGap: 4,
              columnGap: 14,
              color: "var(--ink-quiet)",
            }}
          >
            <dt>Persona</dt>
            <dd style={{ margin: 0, color: "var(--ink-display)" }}>
              {persona.name} ({persona.code})
            </dd>
            <dt>Target</dt>
            <dd style={{ margin: 0, color: "var(--ink-display)" }}>
              {target.id}
            </dd>
            <dt>Turns</dt>
            <dd style={{ margin: 0, color: "var(--ink-display)" }}>{turns}</dd>
          </dl>
        )}
      </div>
    </div>
  );
}

function StageRow({
  name,
  idx,
  status,
}: {
  name: string;
  idx: number;
  status: "done" | "active" | "pending";
}) {
  const glyph = status === "done" ? "✓" : status === "active" ? "▸" : "·";
  const color =
    status === "done"
      ? "var(--jade)"
      : status === "active"
        ? "var(--stamp)"
        : "var(--ink-faint)";
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr",
        gap: 10,
        padding: "8px 0",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: status === "pending" ? "var(--ink-faint)" : "var(--ink-display)",
        borderBottom: "1px dotted var(--rule)",
      }}
    >
      <span
        style={{
          color,
          fontFamily: "var(--font-matrix)",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{String(idx + 1).padStart(2, "0")}. {name}</span>
        {status === "active" && (
          <span style={{ color: "var(--stamp)", fontWeight: 600 }}>RUN</span>
        )}
        {status === "done" && (
          <span style={{ color: "var(--jade)" }}>OK</span>
        )}
      </span>
    </li>
  );
}

function ElapsedLine({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.floor((now - startedAt) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (
    <div
      style={{
        fontFamily: "var(--font-matrix)",
        fontSize: 16,
        color: "var(--ink-quiet)",
        letterSpacing: "0.04em",
        textAlign: "right",
        paddingTop: 8,
      }}
    >
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")} elapsed
    </div>
  );
}

function ActionLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: primary ? "var(--paper)" : "var(--stamp)",
        background: primary ? "var(--ink-display)" : "transparent",
        border: `1px solid ${primary ? "var(--ink-display)" : "var(--stamp)"}`,
        padding: "8px 14px",
        textDecoration: "none",
        borderRadius: 2,
      }}
    >
      {children}
    </Link>
  );
}
