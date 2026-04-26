import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ApolloLine } from "@/components/ApolloLine";
import { PeerAvatar } from "@/components/PeerAvatar";
import { SignoffActions } from "@/components/SignoffActions";
import { SignoffExports } from "@/components/SignoffExports";
import { SignoffTrainingPair } from "@/components/SignoffTrainingPair";
import type { TrainingPair } from "@/components/TrainingPairCompare";
import { findPeer } from "@/lib/peers";
import { getSignoff } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";
import { severityLabel, type TriageThread } from "@/lib/triage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Sign-off · ${id}` };
}

type VerdictData = {
  overallSeverity?: number;
  failurePointTurn?: number | null;
  headline?: string;
  diagnosis?: string;
  whatShouldHaveHappened?: string;
  apolloVoice?: string;
  apolloLine?: string;
};

type FrameData = { domain?: string; setting?: string; redFlags?: string[] };
type FailureFlag = {
  turnNumber: number;
  role: string;
  severity: number;
  categories: string[];
  annotation: string;
  citation?: string;
};
type FailureTimelineData = { flags?: FailureFlag[] };

export default async function SignoffReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, me] = await Promise.all([getSignoff(id), getCurrentUser()]);
  if (!record) notFound();

  const reviewer = findPeer(record.assignedTo);
  const filer = record.filedBy ? findPeer(record.filedBy) : null;
  const decider = record.decidedBy ? findPeer(record.decidedBy) : null;
  const verdict = (record.results?.verdict ?? null) as VerdictData | null;
  const frame = (record.results?.frame ?? null) as FrameData | null;
  const timeline = (record.results?.["failure-timeline"] ?? null) as FailureTimelineData | null;
  const thread = record.thread as TriageThread;
  const canDecide = me.id === record.assignedTo && record.status === "awaiting";
  const filedDate = new Date(record.filedAt);
  const flagsByTurn = new Map<number, FailureFlag>();
  for (const f of timeline?.flags ?? []) flagsByTurn.set(f.turnNumber, f);

  const apolloHeadLine = buildHeaderApolloLine({
    record,
    verdict,
    canDecide,
    isFiler: record.filedBy === me.id,
    isAssignee: record.assignedTo === me.id,
  });

  return (
    <AppShell
      crumbs={[
        { label: "All sign-offs", href: "/signoffs" },
        { label: id },
      ]}
    >
      <header style={{ marginBottom: 22 }}>
        <div
          className="eyebrow"
          style={{ color: "var(--accent)", marginBottom: 6 }}
        >
          Peer review · {record.status}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--text-1)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {verdict?.headline ?? `Triage · ${thread.detectedFormat}`}
        </h1>
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-3)",
            letterSpacing: "0.04em",
          }}
        >
          {record.id} · filed {filedDate.toISOString().slice(0, 10)}
          {filer ? ` by ${filer.name}` : ""}
        </div>
        <ApolloLine
          text={apolloHeadLine}
          tone={
            record.status === "approved"
              ? "success"
              : record.status === "rejected"
                ? "warn"
                : "default"
          }
        />
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div>
          {verdict && (
            <Section title="Verdict">
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {typeof verdict.overallSeverity === "number" && (
                  <Pill
                    bg={`var(--sev-${verdict.overallSeverity})`}
                    color="white"
                  >
                    Severity {verdict.overallSeverity} ·{" "}
                    {severityLabel(verdict.overallSeverity)}
                  </Pill>
                )}
                {typeof verdict.failurePointTurn === "number" && (
                  <Pill bg="var(--app-surface-2)" color="var(--text-1)">
                    Failure at turn {verdict.failurePointTurn}
                  </Pill>
                )}
                {frame?.domain && (
                  <Pill bg="var(--app-surface-2)" color="var(--text-2)">
                    {frame.domain}
                  </Pill>
                )}
              </div>
              {verdict.diagnosis && (
                <Paragraph label="Diagnosis">{verdict.diagnosis}</Paragraph>
              )}
              {verdict.whatShouldHaveHappened && (
                <Paragraph label="What should have happened">
                  {verdict.whatShouldHaveHappened}
                </Paragraph>
              )}
              {verdict.apolloVoice && (
                <blockquote
                  style={{
                    margin: "16px 0 0",
                    padding: "12px 16px",
                    borderLeft: "3px solid var(--accent)",
                    background: "var(--accent-soft)",
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: "var(--text-1)",
                    lineHeight: 1.6,
                  }}
                >
                  {verdict.apolloVoice}
                </blockquote>
              )}
            </Section>
          )}

          {(timeline?.flags ?? []).length > 0 && (
            <Section title={`Failure flags (${timeline!.flags!.length})`}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {timeline!.flags!.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--app-surface)",
                      border: "1px solid var(--border)",
                      borderLeft: `3px solid var(--sev-${Math.max(0, Math.min(4, f.severity))})`,
                      borderRadius: 6,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-3)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: `var(--sev-${Math.max(0, Math.min(4, f.severity))})`,
                        }}
                      >
                        Turn {f.turnNumber} · sev {f.severity}
                      </span>
                      <span>{f.categories.join(" · ")}</span>
                      {f.citation && <span>· {f.citation}</span>}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        color: "var(--text-1)",
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {f.annotation}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title={`Thread · ${thread.turns.length} turns`}>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--app-surface)",
                overflow: "hidden",
              }}
            >
              {thread.turns.map((turn) => {
                const flag = flagsByTurn.get(turn.turnNumber);
                const isPatient = turn.role === "patient";
                return (
                  <div
                    key={turn.turnNumber}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border)",
                      background: isPatient ? "var(--app-surface)" : "var(--app-surface-2)",
                      borderLeft: flag
                        ? `3px solid var(--sev-${Math.max(0, Math.min(4, flag.severity))})`
                        : "3px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 6,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10.5,
                        color: "var(--text-3)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>
                        T{turn.turnNumber} · {turn.role}
                      </span>
                      {flag && (
                        <span style={{ color: `var(--sev-${flag.severity})` }}>
                          flagged · {flag.categories[0]}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: isPatient ? "var(--font-serif)" : "var(--font-mono)",
                        fontSize: 14,
                        color: "var(--text-1)",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.55,
                      }}
                    >
                      {turn.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {record.aiReview && <AiReviewSection review={record.aiReview} />}

          <Section title="Training pair · original vs. corrected">
            <SignoffTrainingPair
              signoffId={record.id}
              initial={(record.trainingPair as TrainingPair | null) ?? null}
            />
          </Section>

          {record.postmortemMarkdown && (
            <Section title="Case report">
              <details
                style={{
                  background: "var(--app-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: "var(--text-2)",
                  }}
                >
                  Show full postmortem markdown
                </summary>
                <pre
                  style={{
                    marginTop: 10,
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--text-1)",
                    lineHeight: 1.5,
                  }}
                >
                  {record.postmortemMarkdown}
                </pre>
              </details>
            </Section>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 16 }}>
          <Card>
            <CardLabel>Assigned to</CardLabel>
            {reviewer ? (
              <Link
                href={`/peers/${reviewer.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <PeerAvatar peer={reviewer} size={36} />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-1)",
                    }}
                  >
                    {reviewer.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--text-3)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {reviewer.role}
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {record.assignedTo}
              </div>
            )}
          </Card>

          {filer && (
            <Card>
              <CardLabel>Filed by</CardLabel>
              <Link
                href={`/peers/${filer.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <PeerAvatar peer={filer} size={32} />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-1)",
                    }}
                  >
                    {filer.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--text-3)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {filedDate.toISOString().replace("T", " · ").slice(0, 16)}
                  </div>
                </div>
              </Link>
              {record.note && (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--text-2)",
                    lineHeight: 1.5,
                  }}
                >
                  “{record.note}”
                </div>
              )}
            </Card>
          )}

          <SignoffActions
            signoffId={record.id}
            status={record.status}
            canDecide={canDecide}
            decisionNote={record.decisionNote}
            decidedByName={decider?.name}
            decidedAt={record.decidedAt}
          />

          <SignoffExports
            signoffId={record.id}
            hasPostmortem={Boolean(record.postmortemMarkdown)}
            hasTrainingPair={record.trainingPair != null}
          />
        </aside>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          margin: "0 0 10px",
          fontWeight: 600,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-3)",
        marginBottom: 8,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  bg,
  color,
  children,
}: {
  bg: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        padding: "4px 10px",
        background: bg,
        color,
        borderRadius: 4,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

function AiReviewSection({
  review,
}: {
  review: NonNullable<Awaited<ReturnType<typeof import("@/lib/signoffs").getSignoff>>>["aiReview"];
}) {
  if (!review) return null;
  const junior = findPeer(review.juniorPeerId);
  const director = review.directorPeerId ? findPeer(review.directorPeerId) : null;
  const finalPeer = findPeer(review.finalDeciderPeerId);
  const finalToneBg =
    review.finalDecision === "approved"
      ? "var(--success-soft)"
      : "var(--accent-soft)";
  const finalToneColor =
    review.finalDecision === "approved" ? "var(--success)" : "var(--accent)";
  return (
    <Section title="AI peer review">
      <div
        style={{
          background: "var(--app-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              fontWeight: 600,
            }}
          >
            Decided by
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-1)",
            }}
          >
            {finalPeer?.name ?? review.finalDeciderPeerId}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              background: finalToneBg,
              color: finalToneColor,
              border: `1px solid ${finalToneColor}`,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            {review.finalDecision}
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
            }}
          >
            {review.via === "managed-agents" && (
              <span
                title={
                  review.juniorSessionId
                    ? `Managed Agents · session ${review.juniorSessionId}`
                    : "Anthropic Claude Managed Agents"
                }
                style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "var(--brand-ink)",
                  color: "white",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Managed Agents
              </span>
            )}
            {review.model}
          </span>
        </div>

        <PeerDecisionBlock
          peer={junior}
          role="junior"
          decision={review.juniorDecision}
        />
        {director && review.directorDecision && (
          <PeerDecisionBlock
            peer={director}
            role="director"
            decision={review.directorDecision}
          />
        )}
      </div>
    </Section>
  );
}

function PeerDecisionBlock({
  peer,
  role,
  decision,
}: {
  peer: ReturnType<typeof findPeer>;
  role: "junior" | "director";
  decision: { decision: string; note: string; reasoning: string };
}) {
  if (!peer) return null;
  const tone =
    decision.decision === "approved"
      ? { color: "var(--success)", bg: "var(--success-soft)" }
      : decision.decision === "escalated"
        ? { color: "var(--warn)", bg: "var(--warn-soft)" }
        : { color: "var(--accent)", bg: "var(--accent-soft)" };
  return (
    <div
      style={{
        background: "var(--app-surface-2)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${tone.color}`,
        borderRadius: 6,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <PeerAvatar peer={peer} size={22} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
          }}
        >
          {peer.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-3)",
          }}
        >
          {role}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 4,
            background: tone.bg,
            color: tone.color,
            border: `1px solid ${tone.color}`,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 700,
          }}
        >
          {decision.decision}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--text-1)",
          lineHeight: 1.55,
          marginBottom: 6,
        }}
      >
        {decision.note}
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--text-2)",
          lineHeight: 1.5,
        }}
      >
        {decision.reasoning}
      </div>
    </div>
  );
}

function buildHeaderApolloLine({
  record,
  verdict,
  canDecide,
  isFiler,
  isAssignee,
}: {
  record: { status: string; assignedTo: string };
  verdict: VerdictData | null;
  canDecide: boolean;
  isFiler: boolean;
  isAssignee: boolean;
}): string {
  if (verdict?.apolloLine) return verdict.apolloLine;
  if (canDecide) return "Read it cold first, then decide. The verdict's already on the record.";
  if (record.status === "approved") return "Signed off. This one's archive-ready.";
  if (record.status === "rejected") return "Returned. The filer needs to revise before this can ship.";
  if (isAssignee && record.status === "awaiting") return "This one's on your desk.";
  if (isFiler) return "Filed and routed. The reviewer takes it from here.";
  return "Reading along, but you're not on the hook for this one.";
}

function Paragraph({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          color: "var(--text-1)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </p>
    </div>
  );
}
