import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { AppShell } from "@/components/AppShell";
import { Section } from "@/components/PageShell";
import { Stamp } from "@/components/Stamp";

export const metadata: Metadata = {
  title: "Corpus",
};

interface CorpusStats {
  totalCases: number;
  exportedPairs: number;
  skippedNoFailurePoint: number;
  skippedNoCorrection: number;
  skippedNotApproved: number;
  skippedNoFailedTurn: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

async function loadStats(): Promise<CorpusStats | null> {
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), "corpus", "stats.json"),
      "utf-8"
    );
    return JSON.parse(file);
  } catch {
    return null;
  }
}

async function loadFirstDpoRow(): Promise<string | null> {
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), "corpus", "dpo.jsonl"),
      "utf-8"
    );
    const first = file.split("\n").find((l) => l.trim().length > 0);
    if (!first) return null;
    const parsed = JSON.parse(first);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

const SEVERITY_LABELS = ["Adequate", "Mild", "Moderate", "Severe", "Critical"];

const FORMATS = [
  {
    name: "DPO",
    file: "dpo.jsonl",
    consumer: "TRL DPOTrainer",
    schema: "{ prompt, chosen, rejected, metadata }",
    body:
      "Direct Preference Optimization rows. The prompt is the system prompt plus all transcript turns up to the failure; chosen is the corrected response; rejected is the original failed response.",
  },
  {
    name: "HH-RLHF",
    file: "hh-rlhf.jsonl",
    consumer: "Anthropic HH-RLHF",
    schema: "{ chosen, rejected, metadata }",
    body:
      "Anthropic's original HH-RLHF format. Chosen and rejected are full dialog strings (System / Human / Assistant) so the row drops directly into reward-model pipelines.",
  },
  {
    name: "Conversational",
    file: "conversational.jsonl",
    consumer: "Chat-template trainers",
    schema: "{ messages_chosen, messages_rejected, metadata }",
    body:
      "Role-tagged messages array. Each turn carries its role (system / user / assistant) so the data feeds chat-template-aware trainers without re-parsing.",
  },
];

const FILTERING_RECIPES = `import json

# Only SI-related pairs
si = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
      if "sycophantic-si-validation" in r["metadata"]["failureCategories"]
      or "missed-escalation" in r["metadata"]["failureCategories"]]

# Only severe + critical
hard = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
        if r["metadata"]["severity"] >= 3]

# Only persona = Elena (P-012)
elena = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
         if r["metadata"]["personaCode"] == "P-012"]`;

export default async function CorpusPage() {
  const [stats, sample] = await Promise.all([loadStats(), loadFirstDpoRow()]);

  const sevEntries = stats
    ? Object.entries(stats.bySeverity).sort((a, b) => Number(b[0]) - Number(a[0]))
    : [];
  const catEntries = stats
    ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <AppShell active="corpus" crumbs={[{ label: "Corpus" }]}>
      <header
        style={{
          marginBottom: 36,
          paddingBottom: 24,
          borderBottom: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 32,
          alignItems: "end",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 10,
            }}
          >
            § Correction corpus
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 3.4vw, 40px)",
              fontWeight: 500,
              letterSpacing: "-0.018em",
              margin: "0 0 12px",
              color: "var(--text-1)",
              lineHeight: 1.1,
            }}
          >
            One dataset. Three formats. MIT.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--text-2)",
              margin: 0,
              maxWidth: "70ch",
            }}
          >
            Every critic-approved correction becomes a contrastive pair: the
            target bot's actual (clinically unsound) turn, and a peer-reviewed
            replacement. Drops directly into TRL, RLHF, and chat-template
            trainers.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <Stamp tone="jade" rotate={-4}>v0.1 Preview</Stamp>
            <Stamp rotate={3}>MIT</Stamp>
          </div>
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-1)",
              background: "var(--app-surface-2)",
              padding: "8px 12px",
              borderRadius: 6,
              letterSpacing: "0.01em",
              border: "1px solid var(--border)",
            }}
          >
            huggingface.co/datasets/primum/autopsies-v0.1
          </code>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              textAlign: "right",
              maxWidth: 280,
            }}
          >
            Aspirational. Public release pending peer-review of v0.1
            corrections.
          </div>
        </div>
      </header>

      {stats ? (
        <Section
          eyebrow="§ 1 · Status"
          title="What's in v0.1"
          subtitle="Stats are regenerated by `npx tsx scripts/export-corpus.ts` on every corpus rebuild."
        >
          <div
            className="resp-stat-tiles"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              marginBottom: 32,
            }}
          >
            <Tile label="Cases scanned" value={stats.totalCases} />
            <Tile
              label="Pairs exported"
              value={stats.exportedPairs}
              tone="stamp"
            />
            <Tile
              label="Skipped (no correction)"
              value={stats.skippedNoCorrection}
              tone="quiet"
            />
            <Tile
              label="Skipped (critic rejected)"
              value={stats.skippedNotApproved}
              tone="quiet"
            />
          </div>

          <div
            className="resp-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 48,
            }}
          >
            <div>
              <SubHead>By severity</SubHead>
              {sevEntries.length === 0 ? (
                <Empty>No pairs yet.</Empty>
              ) : (
                <ul style={ulReset}>
                  {sevEntries.map(([sev, n]) => (
                    <Row key={sev}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 14,
                            height: 14,
                            background: `var(--sev-${sev})`,
                            borderRadius: 1,
                          }}
                        />
                        {SEVERITY_LABELS[Number(sev)]} (sev {sev})
                      </span>
                      <Mono>{n}</Mono>
                    </Row>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <SubHead>By failure category</SubHead>
              {catEntries.length === 0 ? (
                <Empty>No categories yet.</Empty>
              ) : (
                <ul style={ulReset}>
                  {catEntries.map(([cat, n]) => (
                    <Row key={cat}>
                      <span style={{ color: "var(--ink-display)" }}>{cat}</span>
                      <Mono>{n}</Mono>
                    </Row>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      ) : (
        <Section eyebrow="§ 1 · Status" title="What's in v0.1">
          <Empty>
            corpus/stats.json not yet generated. Run{" "}
            <code>npx tsx scripts/export-corpus.ts</code> to populate.
          </Empty>
        </Section>
      )}

      <Section
        eyebrow="§ 2 · Formats"
        title="Three drop-in formats"
        subtitle="Same metadata schema across all three. Pick whichever your trainer expects."
      >
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 0,
            borderTop: "1px solid var(--rule)",
          }}
        >
          {FORMATS.map((f) => (
            <li
              key={f.name}
              className="resp-pipeline-row"
              style={{
                display: "grid",
                gridTemplateColumns: "180px 240px minmax(0, 1fr)",
                gap: 32,
                padding: "20px 0",
                borderBottom: "1px solid var(--rule)",
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--ink-display)",
                  }}
                >
                  {f.name}
                </div>
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--stamp)",
                    letterSpacing: "0.04em",
                  }}
                >
                  corpus/{f.file}
                </code>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ink-quiet)",
                    marginBottom: 6,
                  }}
                >
                  Consumer
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-display)",
                    marginBottom: 10,
                  }}
                >
                  {f.consumer}
                </div>
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-quiet)",
                    background: "var(--paper-shade)",
                    padding: "4px 8px",
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                >
                  {f.schema}
                </code>
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
                {f.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        eyebrow="§ 3 · Metadata"
        title="What rides on every row"
        subtitle="Filtering is the entire point of this metadata. See § 5 for recipes."
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          <tbody>
            {[
              ["caseId, caseNumber", "Back-link to the full autopsy"],
              ["personaId, personaCode", "Simulated patient identity"],
              ["targetId, targetDisplayName", "Target bot under evaluation"],
              ["failurePointTurn", "Turn at which the failure was identified"],
              ["failureCategories", "e.g. ['delusion-reinforcement']"],
              ["severity", "0 (adequate) → 4 (critical)"],
              ["citation", "DSM-5-TR / C-SSRS / MITI reference"],
              ["correctionReasoning", "Corrector's rationale"],
              ["criticApproved, criticNotes", "Peer-review status"],
            ].map(([key, val]) => (
              <tr
                key={key}
                style={{ borderBottom: "1px dotted var(--rule)" }}
              >
                <td
                  style={{
                    padding: "10px 24px 10px 0",
                    color: "var(--stamp)",
                    fontWeight: 600,
                    width: 280,
                    verticalAlign: "top",
                  }}
                >
                  {key}
                </td>
                <td
                  style={{
                    padding: "10px 0",
                    color: "var(--ink)",
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                  }}
                >
                  {val}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {sample && (
        <Section
          eyebrow="§ 4 · Sample row"
          title="One row from dpo.jsonl"
          subtitle="Truncated for display. Strings shortened with U+2026 where they would otherwise wrap aggressively."
        >
          <pre
            className="matrix-block"
            style={{
              maxHeight: 540,
              overflow: "auto",
              fontSize: 14,
              whiteSpace: "pre",
              margin: 0,
            }}
          >
            {truncateForDisplay(sample, 2400)}
          </pre>
        </Section>
      )}

      <Section
        eyebrow="§ 5 · Filtering"
        title="Drop-in Python recipes"
      >
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--ink-display)",
            background: "var(--paper-shade)",
            padding: "20px 24px",
            borderRadius: 2,
            border: "1px solid var(--rule)",
            overflow: "auto",
            margin: 0,
            whiteSpace: "pre",
          }}
        >
          {FILTERING_RECIPES}
        </pre>
      </Section>

      <Section
        eyebrow="§ 6 · Regenerate"
        title="One command"
      >
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "var(--ink-display)",
            background: "var(--paper-shade)",
            padding: "16px 22px",
            borderRadius: 2,
            border: "1px solid var(--rule)",
            display: "inline-block",
            margin: 0,
          }}
        >
          npx tsx scripts/export-corpus.ts
        </pre>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-quiet)",
            marginTop: 16,
            maxWidth: "60ch",
          }}
        >
          Reads every <code>content/cases/*.json</code>, filters for
          critic-approved corrections, and emits all three formats plus{" "}
          <code>stats.json</code> and a <code>README.md</code>.
        </p>
      </Section>
    </AppShell>
  );
}

const ulReset: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  borderTop: "1px solid var(--rule)",
};

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--rule)",
        fontFamily: "var(--font-serif)",
        fontSize: 14.5,
        color: "var(--ink)",
      }}
    >
      {children}
    </li>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-matrix)",
        fontSize: 18,
        color: "var(--ink-display)",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-quiet)",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        color: "var(--ink-quiet)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Tile({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "stamp" | "quiet";
}) {
  const color =
    tone === "stamp"
      ? "var(--stamp)"
      : tone === "quiet"
        ? "var(--ink-quiet)"
        : "var(--ink-display)";
  return (
    <div
      style={{
        padding: "20px 22px",
        border: "1px solid var(--rule)",
        background: "var(--paper)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-matrix)",
          fontSize: 38,
          color,
          lineHeight: 1,
          marginBottom: 8,
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-quiet)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function truncateForDisplay(json: string, max: number): string {
  if (json.length <= max) return json;
  // Cut at a newline near the limit so the JSON still reads as JSON.
  const cut = json.lastIndexOf("\n", max);
  return json.slice(0, cut > 0 ? cut : max) + "\n  …";
}
