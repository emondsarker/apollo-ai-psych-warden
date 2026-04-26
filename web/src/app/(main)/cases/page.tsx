import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { loadAllCases, caseStatus } from "@/lib/content";
import type { Autopsy, SeverityLevel } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cases",
};

type SearchParams = {
  status?: string;
  severity?: string;
  target?: string;
  q?: string;
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  0: "Adequate",
  1: "Mild",
  2: "Moderate",
  3: "Severe",
  4: "Critical",
};

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cases = await loadAllCases();

  const statusFilter = sp.status ?? "all";
  const severityFilter = sp.severity ?? "all";
  const targetFilter = sp.target ?? "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  const filtered = cases.filter((c) => {
    const status = caseStatus(c).label.toLowerCase().replace(" ", "-");
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (severityFilter !== "all" && c.judgement.overallSeverity !== Number(severityFilter)) return false;
    if (targetFilter !== "all" && c.target !== targetFilter) return false;
    if (q && !c.title.toLowerCase().includes(q) && !c.caseNumber.toLowerCase().includes(q)) return false;
    return true;
  });

  const counts = {
    all: cases.length,
    draft: cases.filter((c) => c.correction === null).length,
    "in-review": cases.filter((c) => c.correction !== null && !c.correction.criticApproved).length,
    approved: cases.filter((c) => c.correction !== null && c.correction.criticApproved).length,
  };

  const targets = Array.from(new Set(cases.map((c) => c.target))).sort();

  const buildHref = (patch: Partial<SearchParams>): string => {
    const next: Record<string, string> = {};
    if (sp.status && sp.status !== "all") next.status = sp.status;
    if (sp.severity && sp.severity !== "all") next.severity = sp.severity;
    if (sp.target && sp.target !== "all") next.target = sp.target;
    if (sp.q) next.q = sp.q;
    Object.assign(next, patch);
    for (const k of Object.keys(next) as Array<keyof typeof next>) {
      if (next[k] === "all" || next[k] === "") delete next[k];
    }
    const qs = new URLSearchParams(next).toString();
    return qs ? `/cases?${qs}` : "/cases";
  };

  return (
    <AppShell
      active="cases"
      crumbs={[{ label: "Cases" }]}
      counts={{ cases: cases.length, review: counts["in-review"] }}
      actions={
        <Link
          href="/run"
          className="btn btn-primary"
          style={{ height: 32, padding: "0 12px", fontSize: 13 }}
        >
          <span aria-hidden>+</span> New autopsy
        </Link>
      }
    >
      <header style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: "0 0 4px",
          }}
        >
          Cases
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-3)",
            margin: 0,
          }}
        >
          {filtered.length} of {cases.length} cases
          {statusFilter !== "all" && ` · status: ${statusFilter}`}
          {severityFilter !== "all" && ` · severity ${severityFilter}`}
          {targetFilter !== "all" && ` · target ${targetFilter}`}
        </p>
      </header>

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Filter by status"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <StatusTab href={buildHref({ status: "all" })} active={statusFilter === "all"} count={counts.all}>
          All
        </StatusTab>
        <StatusTab href={buildHref({ status: "draft" })} active={statusFilter === "draft"} count={counts.draft}>
          Draft
        </StatusTab>
        <StatusTab href={buildHref({ status: "in-review" })} active={statusFilter === "in-review"} count={counts["in-review"]}>
          In review
        </StatusTab>
        <StatusTab href={buildHref({ status: "approved" })} active={statusFilter === "approved"} count={counts.approved}>
          Approved
        </StatusTab>
      </div>

      {/* Filter row */}
      <form
        method="get"
        action="/cases"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {statusFilter !== "all" && <input type="hidden" name="status" value={statusFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by title or №…"
          className="input"
          style={{ height: 34, width: 280, fontSize: 13 }}
        />
        <Select
          name="severity"
          value={severityFilter}
          options={[
            { value: "all", label: "Any severity" },
            { value: "4", label: "Critical (4)" },
            { value: "3", label: "Severe (3)" },
            { value: "2", label: "Moderate (2)" },
            { value: "1", label: "Mild (1)" },
            { value: "0", label: "Adequate (0)" },
          ]}
        />
        <Select
          name="target"
          value={targetFilter}
          options={[
            { value: "all", label: "Any target" },
            ...targets.map((t) => ({ value: t, label: t })),
          ]}
        />
        <button type="submit" className="btn btn-ghost" style={{ height: 34, fontSize: 13 }}>
          Apply
        </button>
        {(severityFilter !== "all" || targetFilter !== "all" || sp.q) && (
          <Link
            href={buildHref({ severity: "all", target: "all", q: "" })}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-3)",
              textDecoration: "none",
            }}
          >
            Clear
          </Link>
        )}
      </form>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 70 }}>№</th>
                <th>Case</th>
                <th style={{ width: 150 }}>Target</th>
                <th style={{ width: 120 }}>Persona</th>
                <th style={{ width: 60 }} className="col-num">Turns</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 110 }}>Severity</th>
                <th style={{ width: 100 }}>Filed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-3)", padding: "48px 16px" }}>
                    No cases match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function CaseRow({ c }: { c: Autopsy }) {
  const status = caseStatus(c);
  const d = new Date(c.date);
  const dateStr = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
  return (
    <tr>
      <td className="col-mono">№{c.caseNumber.split("-")[0]}</td>
      <td>
        <Link
          href={`/cases/${c.id}`}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            color: "var(--text-1)",
            fontWeight: 500,
            textDecoration: "none",
            display: "block",
            lineHeight: 1.35,
          }}
        >
          {c.title}
        </Link>
      </td>
      <td className="col-mono">{c.targetDisplayName}</td>
      <td className="col-mono">{c.personaCode}</td>
      <td className="col-num col-mono">{c.totalTurns}</td>
      <td>
        <span className="pill" data-tone={status.tone}>
          {status.label}
        </span>
      </td>
      <td>
        <span className="sev-dot" data-level={String(c.judgement.overallSeverity)}>
          {SEVERITY_LABELS[c.judgement.overallSeverity]}
        </span>
      </td>
      <td className="col-mono">{dateStr}</td>
    </tr>
  );
}

function StatusTab({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        marginBottom: -1,
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--text-1)" : "var(--text-2)",
        textDecoration: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "color 100ms ease-out, border-color 100ms ease-out",
      }}
    >
      {children}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: active ? "var(--text-2)" : "var(--text-3)",
          fontVariantNumeric: "tabular-nums",
          background: active ? "var(--app-surface-2)" : "transparent",
          border: active ? "1px solid var(--border)" : "none",
          padding: active ? "1px 6px" : "1px 0",
          borderRadius: 999,
        }}
      >
        {count}
      </span>
    </Link>
  );
}

function Select({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="input"
      style={{
        height: 34,
        width: "auto",
        minWidth: 140,
        fontSize: 13,
        padding: "0 10px",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
