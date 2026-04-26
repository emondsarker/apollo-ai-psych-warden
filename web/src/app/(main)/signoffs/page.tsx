import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ApolloLine } from "@/components/ApolloLine";
import { PeerAvatar } from "@/components/PeerAvatar";
import { listSignoffs, type SignoffRecord } from "@/lib/signoffs";
import { findPeer } from "@/lib/peers";
import { getCurrentUser } from "@/lib/currentUser";
import { allSignoffsInsight } from "@/lib/apollo-insights";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All sign-offs",
};

export default async function SignoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (["awaiting", "approved", "rejected"] as const).find(
    (s) => s === sp.status,
  );

  const [records, me] = await Promise.all([listSignoffs(), getCurrentUser()]);
  const filtered = status ? records.filter((r) => r.status === status) : records;

  const counts = {
    all: records.length,
    awaiting: records.filter((r) => r.status === "awaiting").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };

  return (
    <AppShell crumbs={[{ label: "All sign-offs" }]}>
      <header style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>
          ΑΠΟΛΛΩΝ · queue
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: 0,
          }}
        >
          {filtered.length} {filtered.length === 1 ? "case" : "cases"}
          {status ? ` · ${status}` : " on the books"}.
        </h1>
        <ApolloLine text={allSignoffsInsight(filtered, status)} />
      </header>

      <nav
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        <FilterTab href="/signoffs" label="All" count={counts.all} active={!status} />
        <FilterTab
          href="/signoffs?status=awaiting"
          label="Awaiting"
          count={counts.awaiting}
          active={status === "awaiting"}
        />
        <FilterTab
          href="/signoffs?status=approved"
          label="Approved"
          count={counts.approved}
          active={status === "approved"}
        />
        <FilterTab
          href="/signoffs?status=rejected"
          label="Returned"
          count={counts.rejected}
          active={status === "rejected"}
        />
      </nav>

      {filtered.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--text-3)",
          }}
        >
          Nothing here. File a triage from{" "}
          <Link href="/triage" style={{ color: "var(--accent)" }}>
            Triage thread
          </Link>{" "}
          or{" "}
          <Link href="/triage/bulk" style={{ color: "var(--accent)" }}>
            Bulk triage
          </Link>
          .
        </p>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--app-surface)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {filtered.map((r) => (
            <Row key={r.id} record={r} youAre={me.id} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function FilterTab({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        background: active ? "var(--app-surface-2)" : "transparent",
        border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
        color: active ? "var(--text-1)" : "var(--text-2)",
        textDecoration: "none",
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.04em",
      }}
    >
      {label} <span style={{ color: "var(--text-3)" }}>· {count}</span>
    </Link>
  );
}

function Row({ record, youAre }: { record: SignoffRecord; youAre: string }) {
  const reviewer = findPeer(record.assignedTo);
  const filer = record.filedBy ? findPeer(record.filedBy) : null;
  const filedDate = new Date(record.filedAt);
  const verdict = (record.results?.verdict ?? null) as
    | { headline?: string; overallSeverity?: number }
    | null;
  const isYours = record.assignedTo === youAre;
  return (
    <Link
      href={`/signoffs/${record.id}`}
      style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 18,
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
        background: isYours ? "var(--accent-soft)" : "transparent",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-3)",
            letterSpacing: "0.04em",
            marginBottom: 4,
            display: "flex",
            gap: 8,
          }}
        >
          {record.id}
          {isYours && record.status === "awaiting" && (
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>· you</span>
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            color: "var(--text-1)",
            lineHeight: 1.4,
          }}
        >
          {verdict?.headline ?? `${record.thread.detectedFormat} · ${record.thread.turns.length} turns`}
        </div>
        {record.note && (
          <div
            style={{
              marginTop: 4,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            “{record.note}”
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "right",
        }}
      >
        {filer && <PeerAvatar peer={filer} size={20} />}
        <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>→</span>
        {reviewer && <PeerAvatar peer={reviewer} size={26} />}
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-1)",
            }}
          >
            {reviewer?.name.split(" ").slice(-1)[0] ?? record.assignedTo}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
            }}
          >
            {filedDate.toISOString().slice(0, 10)}
          </div>
        </div>
      </div>
      <Badge status={record.status} severity={verdict?.overallSeverity} />
    </Link>
  );
}

function Badge({
  status,
  severity,
}: {
  status: SignoffRecord["status"];
  severity?: number;
}) {
  const tone =
    status === "approved"
      ? { color: "var(--success)", bg: "var(--success-soft)" }
      : status === "rejected"
        ? { color: "var(--accent)", bg: "var(--accent-soft)" }
        : { color: "var(--warn)", bg: "var(--warn-soft)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {typeof severity === "number" && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            padding: "3px 7px",
            background: `var(--sev-${severity})`,
            color: "white",
            borderRadius: 4,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          sev {severity}
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          padding: "4px 10px",
          background: tone.bg,
          color: tone.color,
          border: `1px solid ${tone.color}`,
          borderRadius: 4,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 700,
        }}
      >
        {status}
      </span>
    </div>
  );
}
