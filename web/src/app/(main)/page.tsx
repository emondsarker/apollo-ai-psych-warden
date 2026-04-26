import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  OraclePane,
  type CaseRow,
  type ConsoleContext,
  type PendingSignoffRow,
  type TargetTally,
} from "@/components/OraclePane";
import { loadAllCases, aggregateStats } from "@/lib/content";
import { listSignoffs } from "@/lib/signoffs";
import { findPeer } from "@/lib/peers";
import type { Autopsy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cases, signoffs] = await Promise.all([
    loadAllCases(),
    listSignoffs(),
  ]);
  const stats = aggregateStats(cases);

  const inReviewCount = cases.filter(
    (c) => c.correction !== null && !c.correction.criticApproved,
  ).length;
  const approvedCount = cases.filter(
    (c) => c.correction !== null && c.correction.criticApproved,
  ).length;
  const severeCount = stats.severe + stats.critical;
  const awaitingSignoff = signoffs.filter((s) => s.status === "awaiting").length;

  const rows: CaseRow[] = cases.map(toRow);
  const recentCases = rows.slice(0, 12);
  const processingCase =
    rows.find((r) => r.status === "in-review") ??
    rows.find((r) => r.status === "draft") ??
    rows[0] ??
    null;
  const recentApproved = rows.filter((r) => r.status === "approved").slice(0, 6);

  const byTarget = tallyByTarget(cases);
  const pendingSignoffs: PendingSignoffRow[] = signoffs
    .filter((s) => s.status === "awaiting")
    .slice(0, 8)
    .map((s) => {
      const peer = findPeer(s.assignedTo);
      return {
        id: s.id,
        target: s.thread.participants.target || "unknown",
        assignedTo: peer?.name ?? s.assignedTo,
        filedAt: s.filedAt,
      };
    });

  const consoleContext: ConsoleContext = {
    totals: {
      cases: cases.length,
      severe: stats.severe,
      critical: stats.critical,
      approved: approvedCount,
      inReview: inReviewCount,
      awaitingSignoff,
    },
    byTarget,
    pendingSignoffs,
    recentCases: rows.slice(0, 10).map((r) => ({
      caseNumber: r.caseNumber,
      title: r.title,
      target: r.targetDisplayName,
      severity: r.severity,
    })),
    recentTitles: rows.slice(0, 10).map((r) => r.title),
  };

  return (
    <AppShell
      active="dashboard"
      crumbs={[{ label: "Console" }]}
      counts={{ cases: cases.length, review: awaitingSignoff }}
      fullBleed
      actions={
        <>
          <Link
            href="/export"
            className="btn btn-ghost"
            style={{ height: 32, padding: "0 12px", fontSize: 13 }}
          >
            Export
          </Link>
          <Link
            href="/triage"
            className="btn btn-primary"
            style={{ height: 32, padding: "0 12px", fontSize: 13 }}
          >
            <span aria-hidden>+</span> Triage thread
          </Link>
        </>
      }
    >
      <OraclePane
        cases={cases.length}
        inReview={inReviewCount}
        approved={approvedCount}
        severe={severeCount}
        annotations={stats.totalAnnotatedTurns}
        awaitingSignoff={awaitingSignoff}
        recentCases={recentCases}
        processingCase={processingCase}
        recentApproved={recentApproved}
        pendingSignoffs={pendingSignoffs}
        byTarget={byTarget}
        consoleContext={consoleContext}
      />
    </AppShell>
  );
}

function toRow(c: Autopsy): CaseRow {
  const status: CaseRow["status"] =
    c.correction === null
      ? "draft"
      : c.correction.criticApproved
        ? "approved"
        : "in-review";
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    title: c.title,
    date: c.date,
    targetDisplayName: c.targetDisplayName,
    personaCode: c.personaCode,
    severity: c.judgement.overallSeverity,
    failurePointTurn: c.judgement.failurePointTurn,
    totalTurns: c.totalTurns,
    status,
  };
}

function tallyByTarget(cases: Autopsy[]): TargetTally[] {
  type Bucket = {
    target: string;
    display: string;
    cases: number;
    severeOrCritical: number;
    approved: number;
    inReview: number;
    categories: Map<string, number>;
  };
  const buckets = new Map<string, Bucket>();
  for (const c of cases) {
    let b = buckets.get(c.target);
    if (!b) {
      b = {
        target: c.target,
        display: c.targetDisplayName,
        cases: 0,
        severeOrCritical: 0,
        approved: 0,
        inReview: 0,
        categories: new Map(),
      };
      buckets.set(c.target, b);
    }
    b.cases += 1;
    if (c.judgement.overallSeverity >= 3) b.severeOrCritical += 1;
    if (c.correction) {
      if (c.correction.criticApproved) b.approved += 1;
      else b.inReview += 1;
    }
    for (const ann of c.judgement.annotations) {
      for (const cat of ann.failureCategories) {
        b.categories.set(cat, (b.categories.get(cat) ?? 0) + 1);
      }
    }
  }
  return Array.from(buckets.values())
    .map((b) => ({
      target: b.target,
      display: b.display,
      cases: b.cases,
      severeOrCritical: b.severeOrCritical,
      approved: b.approved,
      inReview: b.inReview,
      topCategories: Array.from(b.categories.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, z) => z.count - a.count)
        .slice(0, 3),
    }))
    .sort((a, z) => z.cases - a.cases);
}
