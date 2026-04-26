import Link from "next/link";
import type { Autopsy, SeverityLevel } from "@/lib/types";

/**
 * Target × Persona heatmap. Each cell is a case (or empty).
 * Color encodes overall severity. Click → that case page.
 */
export function SeverityMatrix({ cases }: { cases: Autopsy[] }) {
  const targets = uniqueBy(cases, (c) => c.target).sort((a, b) =>
    a.targetDisplayName.localeCompare(b.targetDisplayName)
  );
  const personas = uniqueBy(cases, (c) => c.personaId).sort((a, b) =>
    a.personaCode.localeCompare(b.personaCode)
  );

  // Use actual unique targets/personas for axes, fall back to grouping by ID.
  const targetIds = Array.from(new Set(targets.map((t) => t.target)));
  const personaIds = Array.from(new Set(personas.map((p) => p.personaId)));

  const cellMap = new Map<string, Autopsy>();
  for (const c of cases) {
    cellMap.set(`${c.target}::${c.personaId}`, c);
  }

  const targetLabel: Record<string, string> = {};
  for (const t of targets) targetLabel[t.target] = t.targetDisplayName;
  const personaLabel: Record<string, { code: string; name: string }> = {};
  for (const p of personas) {
    personaLabel[p.personaId] = { code: p.personaCode, name: p.personaDisplayName };
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          minWidth: 560,
        }}
      >
        <thead>
          <tr>
            <th style={{ width: 180 }} />
            {personaIds.map((pid) => (
              <th
                key={pid}
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  fontWeight: 500,
                  color: "var(--ink-quiet)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  fontSize: 10,
                }}
              >
                <div style={{ color: "var(--ink-display)", fontWeight: 600 }}>
                  {personaLabel[pid].code}
                </div>
                <div style={{ marginTop: 2, fontSize: 9 }}>
                  {personaLabel[pid].name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targetIds.map((tid) => (
            <tr key={tid}>
              <th
                scope="row"
                style={{
                  textAlign: "left",
                  padding: "8px 12px 8px 0",
                  fontWeight: 500,
                  color: "var(--ink-display)",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  borderRight: "1px solid var(--rule)",
                }}
              >
                {targetLabel[tid]}
              </th>
              {personaIds.map((pid) => {
                const c = cellMap.get(`${tid}::${pid}`);
                return (
                  <td key={pid} style={{ padding: 0 }}>
                    <Cell autopsy={c} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 20,
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-quiet)",
        }}
      >
        <span>Severity</span>
        {[0, 1, 2, 3, 4].map((s) => (
          <span
            key={s}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                background: `var(--sev-${s})`,
                borderRadius: 1,
              }}
            />
            {["Adequate", "Mild", "Moderate", "Severe", "Critical"][s]}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 14,
              height: 14,
              background: "var(--paper-shade)",
              border: "1px dashed var(--rule-strong)",
              borderRadius: 1,
            }}
          />
          Not yet run
        </span>
      </div>
    </div>
  );
}

function Cell({ autopsy }: { autopsy?: Autopsy }) {
  if (!autopsy) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "1.4 / 1",
          minHeight: 44,
          background: "var(--paper-shade)",
          border: "1px dashed var(--rule-strong)",
          borderRadius: 2,
          opacity: 0.55,
        }}
      />
    );
  }
  const sev = autopsy.judgement.overallSeverity as SeverityLevel;
  return (
    <Link
      href={`/cases/${autopsy.id}`}
      style={{
        display: "block",
        width: "100%",
        aspectRatio: "1.4 / 1",
        minHeight: 48,
        backgroundImage: `radial-gradient(circle, oklch(20% 0.02 250 / 0.18) 0.9px, transparent 1.1px)`,
        backgroundSize: "5px 5px",
        backgroundColor: `var(--sev-${sev})`,
        borderRadius: 2,
        position: "relative",
        textDecoration: "none",
        boxShadow: "inset 0 0 0 1px oklch(20% 0.02 80 / 0.12)",
        transition: "transform 120ms cubic-bezier(0.22, 1, 0.36, 1), filter 120ms",
      }}
      title={`${autopsy.caseNumber} · ${autopsy.title}`}
      className="sev-cell"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-matrix)",
          fontSize: 18,
          color: sev >= 3 ? "var(--paper)" : "var(--ink-display)",
          letterSpacing: "0.05em",
        }}
      >
        {autopsy.caseNumber}
      </div>
    </Link>
  );
}

function uniqueBy<T, K>(arr: T[], key: (t: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
