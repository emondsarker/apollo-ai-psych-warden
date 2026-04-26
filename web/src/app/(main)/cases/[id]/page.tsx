import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { loadCase, listCaseIds, loadAllCases, caseStatus } from "@/lib/content";
import type {
  Autopsy,
  ConversationTurn,
  FailureCategory,
  SeverityLevel,
  TurnAnnotation,
} from "@/lib/types";

type Tab = "overview" | "transcript" | "correction" | "resim";

const TAB_ORDER: Tab[] = ["overview", "transcript", "correction", "resim"];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  transcript: "Transcript",
  correction: "Correction",
  resim: "Re-simulation",
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  0: "Adequate",
  1: "Mild",
  2: "Moderate",
  3: "Severe",
  4: "Critical",
};

const FAILURE_LABEL: Record<FailureCategory, string> = {
  "delusion-reinforcement": "Delusion reinforcement",
  "sycophantic-si-validation": "Sycophantic SI validation",
  "boundary-collapse": "Boundary collapse",
  "missed-escalation": "Missed escalation",
  "premature-certainty": "Premature certainty",
  "cognitive-bypass": "Cognitive bypass",
  "harmful-coping": "Harmful coping",
  "stigma-expression": "Stigma expression",
};

export async function generateStaticParams() {
  const ids = await listCaseIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const autopsy = await loadCase(id);
  if (!autopsy) return { title: "Case not found" };
  return {
    title: `№${autopsy.caseNumber} · ${autopsy.title}`,
    description: autopsy.abstract.slice(0, 200),
  };
}

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const autopsy = await loadCase(id);
  if (!autopsy) notFound();

  const cases = await loadAllCases();
  const inReview = cases.filter(
    (c) => c.correction !== null && !c.correction.criticApproved,
  ).length;

  const tab: Tab = (TAB_ORDER as string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "overview";

  const status = caseStatus(autopsy);
  const annotationByTurn = new Map(
    autopsy.judgement.annotations.map((a) => [a.turnNumber, a]),
  );
  const turnPairs = pairTurns(autopsy.transcript);

  return (
    <AppShell
      active="cases"
      crumbs={[
        { label: "Cases", href: "/cases" },
        { label: `№${autopsy.caseNumber.split("-")[0]}` },
      ]}
      counts={{ cases: cases.length, review: inReview }}
      actions={
        autopsy.correction !== null && !autopsy.correction.criticApproved ? (
          <>
            <button type="button" className="btn btn-ghost" style={{ height: 32, padding: "0 12px", fontSize: 13 }}>
              Reject
            </button>
            <button type="button" className="btn btn-primary" style={{ height: 32, padding: "0 12px", fontSize: 13 }}>
              Approve correction
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" style={{ height: 32, padding: "0 12px", fontSize: 13 }}>
            Re-run
          </button>
        )
      }
    >
      <header style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
            }}
          >
            №{autopsy.caseNumber}
          </span>
          <span className="pill" data-tone={status.tone}>
            {status.label}
          </span>
          <span className="sev-dot" data-level={String(autopsy.judgement.overallSeverity)}>
            {SEVERITY_LABELS[autopsy.judgement.overallSeverity]}
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 32 32" aria-hidden>
              <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
              <path d="M16 9 L23 21 L9 21 Z" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" />
              <circle cx="16" cy="17" r="1.6" fill="var(--accent)" />
            </svg>
            verdict by Apollo
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: 0,
            lineHeight: 1.25,
            maxWidth: "60ch",
          }}
        >
          {autopsy.title}
        </h1>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Case sections"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 18,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {TAB_ORDER.map((t) => {
          if (t === "correction" && autopsy.correction === null) return null;
          if (t === "resim" && !autopsy.reSimulatedTranscript) return null;
          return (
            <Link
              key={t}
              href={`/cases/${autopsy.id}${t === "overview" ? "" : `?tab=${t}`}`}
              role="tab"
              aria-selected={tab === t}
              style={{
                padding: "9px 12px",
                marginBottom: -1,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: tab === t ? 600 : 500,
                color: tab === t ? "var(--text-1)" : "var(--text-2)",
                textDecoration: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "color 100ms ease-out, border-color 100ms ease-out",
              }}
            >
              {TAB_LABEL[t]}
            </Link>
          );
        })}
      </div>

      {/* Body: 2-column with metadata sidebar */}
      <div
        className="dash-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {tab === "overview" && (
            <OverviewTab autopsy={autopsy} annotationByTurn={annotationByTurn} />
          )}
          {tab === "transcript" && (
            <TranscriptTab
              turnPairs={turnPairs}
              annotationByTurn={annotationByTurn}
              autopsy={autopsy}
            />
          )}
          {tab === "correction" && autopsy.correction && (
            <CorrectionTab autopsy={autopsy} />
          )}
          {tab === "resim" && autopsy.reSimulatedTranscript && (
            <ResimTab transcript={autopsy.reSimulatedTranscript} />
          )}
        </div>

        <MetadataSidebar autopsy={autopsy} />
      </div>
    </AppShell>
  );
}

/* ─── Tabs ──────────────────────────────────────────────────── */

function OverviewTab({
  autopsy,
  annotationByTurn,
}: {
  autopsy: Autopsy;
  annotationByTurn: Map<number, TurnAnnotation>;
}) {
  const failureAnnotation =
    autopsy.judgement.failurePointTurn !== null
      ? annotationByTurn.get(autopsy.judgement.failurePointTurn)
      : null;

  const cats = new Set<string>();
  for (const a of autopsy.judgement.annotations) {
    for (const c of a.failureCategories) cats.add(c);
  }
  const categories = Array.from(cats);

  const paragraphs = autopsy.caseReport
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Section title="Abstract">
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-2)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {autopsy.abstract}
        </p>
      </Section>

      {categories.length > 0 && (
        <Section title="Failure categories">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {categories.map((c) => (
              <span key={c} className="pill" data-tone="muted">
                {FAILURE_LABEL[c as FailureCategory] ?? c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {failureAnnotation && (
        <Section title={`Failure point — turn ${failureAnnotation.turnNumber}`}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-1)",
              lineHeight: 1.6,
              margin: 0,
              padding: "14px 16px",
              background: "var(--accent-soft)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius)",
            }}
          >
            {failureAnnotation.annotation}
          </p>
        </Section>
      )}

      {paragraphs.length > 0 && (
        <Section title="Clinical analysis">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-2)",
              lineHeight: 1.65,
            }}
          >
            {paragraphs.map((p, i) => (
              <p key={i} style={{ margin: 0 }}>
                {p}
              </p>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function TranscriptTab({
  turnPairs,
  annotationByTurn,
  autopsy,
}: {
  turnPairs: Array<{ patient?: ConversationTurn; target?: ConversationTurn }>;
  annotationByTurn: Map<number, TurnAnnotation>;
  autopsy: Autopsy;
}) {
  if (turnPairs.length === 0) {
    return (
      <div
        className="card card-pad-lg"
        style={{ textAlign: "center", color: "var(--text-3)" }}
      >
        Transcript not available for this case.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {turnPairs.map((pair, i) => {
        const targetTurnNum = pair.target?.turnNumber;
        const annotation =
          targetTurnNum !== undefined ? annotationByTurn.get(targetTurnNum) : undefined;
        const isFailure =
          autopsy.judgement.failurePointTurn !== null &&
          pair.target?.turnNumber === autopsy.judgement.failurePointTurn;
        return (
          <div key={i} className="card" style={{ overflow: "hidden" }}>
            {pair.patient && (
              <TurnRow
                role="patient"
                turn={pair.patient}
                personaName={autopsy.personaDisplayName}
              />
            )}
            {pair.target && (
              <TurnRow
                role="target"
                turn={pair.target}
                botName={autopsy.targetDisplayName}
                annotation={annotation}
                isFailure={isFailure}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TurnRow({
  role,
  turn,
  personaName,
  botName,
  annotation,
  isFailure,
}: {
  role: "patient" | "target";
  turn: ConversationTurn;
  personaName?: string;
  botName?: string;
  annotation?: TurnAnnotation;
  isFailure?: boolean;
}) {
  const isTarget = role === "target";
  const sev = annotation?.severity ?? null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px minmax(0, 1fr)",
        gap: 16,
        padding: "16px 20px",
        borderTop: isTarget ? "1px solid var(--border)" : "none",
        background: isFailure
          ? "oklch(96% 0.025 14 / 0.5)"
          : isTarget
            ? "var(--app-surface-2)"
            : "var(--app-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-3)",
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ color: "var(--text-2)", fontWeight: 600 }}>
          Turn {turn.turnNumber}
        </span>
        <span style={{ color: isTarget ? "var(--text-2)" : "var(--text-3)" }}>
          {isTarget ? botName : personaName}
        </span>
        {isFailure && (
          <span className="pill" data-tone="accent" style={{ width: "fit-content" }}>
            Failure
          </span>
        )}
      </div>
      <div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-1)",
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {turn.content}
        </p>
        {annotation && annotation.annotation && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderLeft: `3px solid ${SEVERITY_BORDER[sev as SeverityLevel] ?? "var(--border)"}`,
              background: "var(--app-surface)",
              border: "1px solid var(--border)",
              borderLeftWidth: 3,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              {sev !== null && (
                <span className="sev-dot" data-level={String(sev)}>
                  {SEVERITY_LABELS[sev]}
                </span>
              )}
              {annotation.failureCategories.slice(0, 2).map((c) => (
                <span
                  key={c}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--text-3)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {FAILURE_LABEL[c as FailureCategory] ?? c}
                </span>
              ))}
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--text-2)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {annotation.annotation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CorrectionTab({ autopsy }: { autopsy: Autopsy }) {
  const c = autopsy.correction!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        className="card card-pad-lg"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="card-title">Correction at turn {c.failedTurnNumber}</div>
          <p className="card-sub" style={{ marginTop: 4 }}>
            {c.criticApproved
              ? "Approved by critic — admitted to the corpus."
              : "Pending critic review."}
          </p>
        </div>
        <span className="pill" data-tone={c.criticApproved ? "success" : "warn"}>
          {c.criticApproved ? "Approved" : "In review"}
        </span>
      </div>

      <div
        className="comp-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-head">
            <div>
              <div className="card-title">Original</div>
              <p className="card-sub" style={{ marginTop: 4 }}>
                What the bot said.
              </p>
            </div>
            <span className="pill" data-tone="accent">Failed</span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-1)",
              lineHeight: 1.6,
              margin: 0,
              padding: 20,
              whiteSpace: "pre-wrap",
            }}
          >
            {c.originalContent}
          </p>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-head">
            <div>
              <div className="card-title">Corrected</div>
              <p className="card-sub" style={{ marginTop: 4 }}>
                Replacement response.
              </p>
            </div>
            <span className="pill" data-tone="success">Proposed</span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-1)",
              lineHeight: 1.6,
              margin: 0,
              padding: 20,
              whiteSpace: "pre-wrap",
            }}
          >
            {c.correctedContent}
          </p>
        </div>
      </div>

      <Section title="Reasoning">
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-2)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {c.correctionReasoning}
        </p>
      </Section>

      {c.criticNotes && (
        <Section title="Critic notes">
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-2)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {c.criticNotes}
          </p>
        </Section>
      )}
    </div>
  );
}

function ResimTab({ transcript }: { transcript: ConversationTurn[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        className="card card-pad-lg"
        style={{ background: "var(--app-surface-2)" }}
      >
        <div className="card-title">Re-simulated trajectory</div>
        <p className="card-sub" style={{ marginTop: 4 }}>
          The pipeline replays the patient persona forward with the corrected
          turn substituted. The trajectory diverges from the original.
        </p>
      </div>
      {transcript.map((turn, i) => (
        <div key={i} className="card" style={{ padding: "14px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ color: "var(--text-2)", fontWeight: 600 }}>
              Turn {turn.turnNumber} · {turn.role}
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-1)",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {turn.content}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Sidebar + helpers ─────────────────────────────────────── */

function MetadataSidebar({ autopsy }: { autopsy: Autopsy }) {
  const d = new Date(autopsy.date);
  const dateStr = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
  return (
    <aside
      className="meta-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "sticky",
        top: 76,
      }}
    >
      <div className="card card-pad-lg">
        <div className="card-title" style={{ marginBottom: 10 }}>
          Details
        </div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 8, columnGap: 12 }}>
          <Meta k="Target" v={autopsy.targetDisplayName} mono />
          <Meta k="Persona" v={`${autopsy.personaDisplayName} (${autopsy.personaCode})`} mono />
          <Meta k="Turns" v={String(autopsy.totalTurns)} mono />
          <Meta k="Filed" v={dateStr} mono />
          <Meta
            k="Severity"
            v={
              <span className="sev-dot" data-level={String(autopsy.judgement.overallSeverity)}>
                {SEVERITY_LABELS[autopsy.judgement.overallSeverity]}
              </span>
            }
          />
          {autopsy.judgement.failurePointTurn !== null && (
            <Meta
              k="Failure"
              v={`Turn ${autopsy.judgement.failurePointTurn}`}
              mono
            />
          )}
        </dl>
      </div>

      <div className="card card-pad-lg">
        <div className="card-title" style={{ marginBottom: 6 }}>
          Summary
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-2)",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {autopsy.judgement.summary}
        </p>
      </div>

      <div className="card card-pad-lg">
        <div className="card-title" style={{ marginBottom: 8 }}>
          Tools
        </div>
        <Link
          href={`/cases/${autopsy.id}/replay`}
          className="btn btn-ghost btn-block"
          style={{ height: 34, fontSize: 12, marginBottom: 8 }}
        >
          Open replay
        </Link>
        <button type="button" className="btn btn-ghost btn-block" style={{ height: 34, fontSize: 12 }}>
          Copy ID
        </button>
      </div>
    </aside>
  );
}

function Meta({
  k,
  v,
  mono,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-3)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          paddingTop: 1,
        }}
      >
        {k}
      </dt>
      <dd
        style={{
          margin: 0,
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: 12.5,
          color: "var(--text-1)",
          letterSpacing: mono ? "0.01em" : 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v}
      </dd>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card card-pad-lg">
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function pairTurns(
  transcript: ConversationTurn[],
): Array<{ patient?: ConversationTurn; target?: ConversationTurn }> {
  const pairs: Array<{ patient?: ConversationTurn; target?: ConversationTurn }> = [];
  let current: { patient?: ConversationTurn; target?: ConversationTurn } = {};
  for (const turn of transcript) {
    if (turn.role === "patient") {
      if (current.patient || current.target) {
        pairs.push(current);
        current = {};
      }
      current.patient = turn;
    } else {
      current.target = turn;
      pairs.push(current);
      current = {};
    }
  }
  if (current.patient || current.target) pairs.push(current);
  return pairs;
}

const SEVERITY_BORDER: Record<SeverityLevel, string> = {
  0: "oklch(80% 0.012 250)",
  1: "oklch(58% 0.10 165)",
  2: "oklch(60% 0.16 70)",
  3: "oklch(56% 0.20 30)",
  4: "var(--accent)",
};
