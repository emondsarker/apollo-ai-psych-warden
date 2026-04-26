"use client";

import { useState, useMemo } from "react";
import type { Autopsy, Persona, TargetConfig } from "@/lib/types";
import { extractExample } from "@/lib/corpus-export";

const FORMATS = [
  { id: "dpo", name: "DPO", desc: "TRL DPOTrainer · {prompt, chosen, rejected}" },
  { id: "hh-rlhf", name: "HH-RLHF", desc: "Anthropic format · {chosen, rejected}" },
  {
    id: "conversational",
    name: "Conversational",
    desc: "Chat-template trainers · {messages_chosen, messages_rejected}",
  },
] as const;

const ALL_CATEGORIES = [
  "delusion-reinforcement",
  "sycophantic-si-validation",
  "missed-escalation",
  "boundary-collapse",
  "premature-certainty",
  "cognitive-bypass",
  "harmful-coping",
  "stigma-expression",
];

const CATEGORY_LABEL: Record<string, string> = {
  "delusion-reinforcement": "Delusion reinforcement",
  "sycophantic-si-validation": "Sycophantic SI",
  "missed-escalation": "Missed escalation",
  "boundary-collapse": "Boundary collapse",
  "premature-certainty": "Premature certainty",
  "cognitive-bypass": "Cognitive bypass",
  "harmful-coping": "Harmful coping",
  "stigma-expression": "Stigma",
};

const SEVERITY_LABELS = ["Adequate", "Mild", "Moderate", "Severe", "Critical"];

type Format = (typeof FORMATS)[number]["id"];

export function ExportBuilder({
  cases,
  personas,
  targets,
}: {
  cases: Autopsy[];
  personas: Persona[];
  targets: TargetConfig[];
}) {
  const [format, setFormat] = useState<Format>("dpo");
  const [minSev, setMinSev] = useState(0);
  const [maxSev, setMaxSev] = useState(4);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [personaIds, setPersonaIds] = useState<Set<string>>(new Set());
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());
  const [criticOnly, setCriticOnly] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Same shape the API uses, computed locally for live preview
  const examples = useMemo(() => {
    return cases
      .map((c) => extractExample(c))
      .filter((e): e is NonNullable<ReturnType<typeof extractExample>> => e !== null)
      .map((e) => e.dpo);
  }, [cases]);

  const filtered = useMemo(() => {
    return examples.filter((row) => {
      const m = row.metadata;
      if (m.severity < minSev || m.severity > maxSev) return false;
      if (cats.size > 0 && !m.failureCategories.some((c) => cats.has(c))) return false;
      if (personaIds.size > 0 && !personaIds.has(m.personaId)) return false;
      if (targetIds.size > 0 && !targetIds.has(m.targetId)) return false;
      if (criticOnly && !m.criticApproved) return false;
      return true;
    });
  }, [examples, minSev, maxSev, cats, personaIds, targetIds, criticOnly]);

  const stats = useMemo(() => {
    const bySev: Record<number, number> = {};
    const byCat: Record<string, number> = {};
    for (const row of filtered) {
      bySev[row.metadata.severity] = (bySev[row.metadata.severity] ?? 0) + 1;
      for (const c of row.metadata.failureCategories) {
        byCat[c] = (byCat[c] ?? 0) + 1;
      }
    }
    return { bySev, byCat };
  }, [filtered]);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          filters: {
            minSeverity: minSev,
            maxSeverity: maxSev,
            categories: cats.size > 0 ? Array.from(cats) : undefined,
            personaIds: personaIds.size > 0 ? Array.from(personaIds) : undefined,
            targetIds: targetIds.size > 0 ? Array.from(targetIds) : undefined,
            criticApprovedOnly: criticOnly,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `primum-${format}-${Date.now()}.jsonl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setDownloading(false);
    }
  }

  function toggle(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  }

  return (
    <div
      className="resp-2col"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 380px)",
        gap: 48,
      }}
    >
      {/* LEFT: filters */}
      <div>
        <FilterGroup label="Format" hint="Pick the schema your trainer expects.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {FORMATS.map((f) => (
              <Pick
                key={f.id}
                selected={format === f.id}
                onClick={() => setFormat(f.id)}
              >
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 17,
                    fontWeight: 500,
                    color: "var(--ink-display)",
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-quiet)",
                    marginTop: 4,
                    letterSpacing: "0.02em",
                  }}
                >
                  {f.desc}
                </div>
              </Pick>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Severity range" hint="Inclusive on both ends.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            <RangeField
              label="Minimum"
              value={minSev}
              onChange={(v) => setMinSev(Math.min(v, maxSev))}
            />
            <RangeField
              label="Maximum"
              value={maxSev}
              onChange={(v) => setMaxSev(Math.max(v, minSev))}
            />
          </div>
        </FilterGroup>

        <FilterGroup
          label="Failure categories"
          hint="Match if at least one selected category is present in the row's failureCategories. Leave all off for no filter."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_CATEGORIES.map((c) => (
              <Chip
                key={c}
                selected={cats.has(c)}
                onClick={() => toggle(cats, c, setCats)}
              >
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Personas" hint="Filter by simulated patient.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {personas.map((p) => (
              <Chip
                key={p.id}
                selected={personaIds.has(p.id)}
                onClick={() => toggle(personaIds, p.id, setPersonaIds)}
              >
                {p.name} <span style={{ opacity: 0.6 }}>({p.code})</span>
              </Chip>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Targets" hint="Filter by bot under evaluation.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {targets.map((t) => (
              <Chip
                key={t.id}
                selected={targetIds.has(t.id)}
                onClick={() => toggle(targetIds, t.id, setTargetIds)}
              >
                {t.id}
              </Chip>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Quality gate">
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink-display)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={criticOnly}
              onChange={(e) => setCriticOnly(e.target.checked)}
              style={{ accentColor: "var(--stamp)" }}
            />
            Only critic-approved corrections
          </label>
        </FilterGroup>
      </div>

      {/* RIGHT: preview + download */}
      <aside>
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
              Preview
            </div>
            <div
              style={{
                fontFamily: "var(--font-matrix)",
                fontSize: 38,
                color:
                  filtered.length === 0 ? "var(--ink-faint)" : "var(--ink-display)",
                lineHeight: 1,
                letterSpacing: "0.04em",
              }}
            >
              {filtered.length}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--ink-quiet)",
                marginTop: 4,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              row{filtered.length === 1 ? "" : "s"} match · {format}
            </div>
          </header>

          <div style={{ padding: "16px 18px" }}>
            {Object.keys(stats.bySev).length > 0 && (
              <Block label="By severity">
                {Object.entries(stats.bySev)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([sev, n]) => (
                    <Line
                      key={sev}
                      left={
                        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              background: `var(--sev-${sev})`,
                              borderRadius: 1,
                              display: "inline-block",
                            }}
                          />
                          {SEVERITY_LABELS[Number(sev)]}
                        </span>
                      }
                      right={n}
                    />
                  ))}
              </Block>
            )}

            {Object.keys(stats.byCat).length > 0 && (
              <Block label="By category">
                {Object.entries(stats.byCat)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, n]) => (
                    <Line
                      key={cat}
                      left={CATEGORY_LABEL[cat] ?? cat}
                      right={n}
                    />
                  ))}
              </Block>
            )}

            {filtered.length === 0 && (
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
                No rows match. Loosen filters, or run more cases via the
                Workbench.
              </p>
            )}
          </div>

          <div
            style={{
              padding: "16px 18px",
              borderTop: "1px solid var(--rule)",
              background: "var(--paper-shade)",
            }}
          >
            <button
              type="button"
              onClick={download}
              disabled={filtered.length === 0 || downloading}
              style={{
                width: "100%",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background:
                  filtered.length === 0 || downloading
                    ? "var(--paper-shade)"
                    : "var(--ink-display)",
                color:
                  filtered.length === 0 || downloading
                    ? "var(--ink-quiet)"
                    : "var(--paper)",
                border: "1px solid var(--ink-display)",
                padding: "12px 18px",
                cursor:
                  filtered.length === 0 || downloading ? "not-allowed" : "pointer",
                borderRadius: 2,
              }}
            >
              {downloading
                ? "Downloading…"
                : `▾ Download .jsonl (${filtered.length})`}
            </button>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-quiet)",
                marginTop: 10,
                letterSpacing: "0.04em",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              Builds a fresh JSONL on the server, streams it as
              application/x-ndjson, dispatches a download.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FilterGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      style={{
        border: "none",
        margin: "0 0 32px 0",
        padding: 0,
      }}
    >
      <legend
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--stamp)",
          marginBottom: 4,
          padding: 0,
        }}
      >
        {label}
      </legend>
      {hint && (
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-quiet)",
            marginBottom: 14,
            maxWidth: "60ch",
          }}
        >
          {hint}
        </div>
      )}
      {children}
    </fieldset>
  );
}

function Pick({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "12px 14px",
        background: selected ? "var(--stamp-bg)" : "var(--paper)",
        border: `1.5px solid ${selected ? "var(--stamp)" : "var(--rule-strong)"}`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "background 120ms ease-out, border-color 120ms ease-out",
      }}
    >
      {children}
    </button>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: selected ? "var(--paper)" : "var(--ink-quiet)",
        background: selected ? "var(--stamp)" : "transparent",
        border: `1px solid ${selected ? "var(--stamp)" : "var(--rule-strong)"}`,
        padding: "6px 12px",
        borderRadius: 999,
        cursor: "pointer",
        transition: "background 120ms ease-out, color 120ms ease-out",
      }}
    >
      {children}
    </button>
  );
}

function RangeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-quiet)",
          marginBottom: 6,
        }}
      >
        {label} ({SEVERITY_LABELS[value]})
      </div>
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%", accentColor: "var(--stamp)" }}
      />
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
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
        {label}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{children}</ul>
    </div>
  );
}

function Line({ left, right }: { left: React.ReactNode; right: number }) {
  return (
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
        borderBottom: "1px dotted var(--rule)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--ink-display)",
      }}
    >
      <span>{left}</span>
      <span
        style={{
          fontFamily: "var(--font-matrix)",
          fontSize: 16,
          color: "var(--stamp)",
          letterSpacing: "0.04em",
        }}
      >
        {right}
      </span>
    </li>
  );
}
