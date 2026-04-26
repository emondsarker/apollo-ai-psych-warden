import type { Autopsy } from "@/lib/types";

const CATEGORY_ORDER = [
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
  "sycophantic-si-validation": "Sycophantic SI validation",
  "missed-escalation": "Missed escalation",
  "boundary-collapse": "Boundary collapse",
  "premature-certainty": "Premature certainty",
  "cognitive-bypass": "Cognitive bypass",
  "harmful-coping": "Harmful coping suggestion",
  "stigma-expression": "Stigma expression",
};

/**
 * Horizontal ledger of failure categories. Each row: category name, count,
 * proportional bar. Bars colored by max severity observed in that category.
 */
export function FailureLedger({ cases }: { cases: Autopsy[] }) {
  const counts: Record<string, number> = {};
  const worstSev: Record<string, number> = {};

  for (const c of cases) {
    for (const ann of c.judgement.annotations) {
      for (const cat of ann.failureCategories ?? []) {
        counts[cat] = (counts[cat] ?? 0) + 1;
        worstSev[cat] = Math.max(worstSev[cat] ?? 0, ann.severity);
      }
    }
  }

  const max = Math.max(1, ...Object.values(counts));
  const present = CATEGORY_ORDER.filter((c) => counts[c] > 0);
  const absent = CATEGORY_ORDER.filter((c) => !counts[c]);

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {present.map((cat) => {
            const n = counts[cat];
            const sev = worstSev[cat] ?? 0;
            const pct = (n / max) * 100;
            return (
              <tr key={cat}>
                <td
                  style={{
                    padding: "10px 16px 10px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--ink-display)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    width: "1%",
                  }}
                >
                  {CATEGORY_LABEL[cat]}
                </td>
                <td style={{ padding: "10px 0", width: "100%" }}>
                  <div
                    style={{
                      position: "relative",
                      height: 14,
                      background: "var(--paper-shade)",
                      borderRadius: 1,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "0 auto 0 0",
                        width: `${pct}%`,
                        background: `var(--sev-${sev})`,
                        borderRadius: 1,
                        transition: "width 320ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                </td>
                <td
                  style={{
                    padding: "10px 0 10px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-display)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                    width: "1%",
                  }}
                >
                  {n}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {absent.length > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px dashed var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginRight: 8,
            }}
          >
            Not yet observed
          </span>
          {absent.map((c) => CATEGORY_LABEL[c]).join(" · ")}
        </div>
      )}
    </div>
  );
}
