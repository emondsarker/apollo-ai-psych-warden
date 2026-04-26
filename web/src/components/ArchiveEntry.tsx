import Link from "next/link";
import type { Autopsy } from "@/lib/types";
import { SeverityFlag } from "@/components/SeverityFlag";

type Props = {
  autopsy: Autopsy;
};

const CATEGORY_LABEL: Record<string, string> = {
  "delusion-reinforcement": "delusion",
  "sycophantic-si-validation": "sycophantic SI",
  "missed-escalation": "missed escalation",
  "boundary-collapse": "boundary collapse",
  "premature-certainty": "premature certainty",
  "cognitive-bypass": "cognitive bypass",
  "harmful-coping": "harmful coping",
  "stigma-expression": "stigma",
};

export function ArchiveEntry({ autopsy }: Props) {
  const sev = autopsy.judgement.overallSeverity;
  const d = new Date(autopsy.date);
  const dateStr = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;

  // Aggregate failure categories across all annotations
  const cats = new Set<string>();
  for (const a of autopsy.judgement.annotations) {
    for (const c of a.failureCategories ?? []) cats.add(c);
  }
  const categoryList = Array.from(cats).slice(0, 3);

  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "84px 1fr 220px 92px",
        gap: 20,
        padding: "20px 8px",
        borderBottom: "1px solid var(--rule)",
        alignItems: "start",
        transition: "background 120ms ease-out",
      }}
      className="archive-entry resp-archive-entry"
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--stamp)",
          letterSpacing: "0.04em",
          fontWeight: 600,
          paddingTop: 4,
        }}
      >
        №{autopsy.caseNumber}
      </div>

      <div>
        <Link
          href={`/cases/${autopsy.id}`}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            color: "var(--ink-display)",
            lineHeight: 1.3,
            textDecoration: "none",
            fontWeight: 500,
            display: "block",
            marginBottom: 6,
          }}
        >
          {autopsy.title}
        </Link>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-quiet)",
            letterSpacing: "0.02em",
          }}
        >
          {autopsy.targetDisplayName} &nbsp;·&nbsp; {autopsy.personaDisplayName}{" "}
          ({autopsy.personaCode})
        </div>
        {categoryList.length > 0 && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {categoryList.map((c) => (
              <span
                key={c}
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
                {CATEGORY_LABEL[c] ?? c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ paddingTop: 4 }}>
        <SeverityFlag
          level={sev}
          caption={
            <span style={{ color: `var(--sev-${sev})`, fontWeight: 600 }}>
              {["Adequate", "Mild", "Moderate", "Severe", "Critical"][sev]}
            </span>
          }
        />
      </div>

      <div
        style={{
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-faint)",
          letterSpacing: "0.04em",
          paddingTop: 6,
        }}
      >
        {dateStr}
      </div>
    </article>
  );
}
