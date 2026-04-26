import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Stamp } from "@/components/Stamp";
import { SeverityFlag } from "@/components/SeverityFlag";
import { ReplayPlayer } from "@/components/ReplayPlayer";
import { loadCase, listCaseIds } from "@/lib/content";

export async function generateStaticParams() {
  const ids = await listCaseIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const autopsy = await loadCase(id);
  if (!autopsy) return { title: "Case not found" };
  return {
    title: `Replay · ${autopsy.caseNumber}`,
    description: `Step-by-step replay of case ${autopsy.caseNumber}: ${autopsy.title}`,
  };
}

export default async function ReplayPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const autopsy = await loadCase(id);
  if (!autopsy) notFound();

  const sev = autopsy.judgement.overallSeverity;

  return (
    <PageShell active="archive" issue={`Replay · Case ${autopsy.caseNumber}`}>
      {/* HERO */}
      <section
        className="resp-hero"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
          gap: 48,
          alignItems: "end",
          paddingBottom: 28,
          borderBottom: "1px solid var(--ink-display)",
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--stamp)",
              marginBottom: 12,
            }}
          >
            ▸ Replay · Step through ·{" "}
            <Link
              href={`/cases/${autopsy.id}`}
              style={{
                color: "var(--ink-quiet)",
                textDecoration: "none",
                borderBottom: "1px solid var(--rule-strong)",
              }}
            >
              full case page
            </Link>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 3.8vw, 44px)",
              fontWeight: 500,
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              color: "var(--ink-display)",
              margin: 0,
            }}
          >
            {autopsy.title}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-quiet)",
              letterSpacing: "0.04em",
              marginTop: 12,
            }}
          >
            №{autopsy.caseNumber} · {autopsy.targetDisplayName} ·{" "}
            {autopsy.personaDisplayName} ({autopsy.personaCode})
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {autopsy.correction?.criticApproved ? (
              <Stamp tone="jade" rotate={-4}>Peer Reviewed</Stamp>
            ) : (
              <Stamp tone="quiet" rotate={-3}>In Review</Stamp>
            )}
            <Stamp rotate={4}>Sev. {sev}</Stamp>
          </div>
          <SeverityFlag
            level={sev}
            caption={
              <span style={{ color: "var(--ink-quiet)" }}>
                Overall {sev} of 4
              </span>
            }
          />
        </div>
      </section>

      <ReplayPlayer autopsy={autopsy} />
    </PageShell>
  );
}
