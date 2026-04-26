import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PeerAvatar } from "@/components/PeerAvatar";
import { listSignoffs, type SignoffRecord } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";
import { findPeer, type Peer } from "@/lib/peers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My inbox",
};

export default async function InboxPage() {
  const [signoffs, me] = await Promise.all([listSignoffs(), getCurrentUser()]);
  const mine = signoffs.filter((s) => s.assignedTo === me.id);
  const awaiting = mine.filter((s) => s.status === "awaiting");
  const decided = mine.filter((s) => s.status !== "awaiting").slice(0, 12);

  return (
    <AppShell crumbs={[{ label: "My inbox" }]}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <PeerAvatar peer={me} size={48} />
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 4 }}>
            Signed in · {me.role}
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
            {awaiting.length === 0
              ? "Inbox empty."
              : awaiting.length === 1
                ? "1 sign-off awaiting your read."
                : `${awaiting.length} sign-offs awaiting your read.`}
          </h1>
        </div>
      </header>

      <Section title={`Awaiting (${awaiting.length})`}>
        {awaiting.length === 0 ? (
          <Empty
            text="Nothing in your queue."
            cta={
              <>
                Help out at{" "}
                <Link href="/signoffs" style={{ color: "var(--accent)" }}>
                  All sign-offs
                </Link>
                .
              </>
            }
          />
        ) : (
          <RowList rows={awaiting} />
        )}
      </Section>

      {decided.length > 0 && (
        <Section title="Recent decisions">
          <RowList rows={decided} />
        </Section>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
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

function Empty({ text, cta }: { text: string; cta?: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px dashed var(--border)",
        borderRadius: 10,
        padding: "32px 18px",
        textAlign: "center",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        color: "var(--text-3)",
      }}
    >
      <div style={{ fontSize: 14 }}>{text}</div>
      {cta && <div style={{ marginTop: 6, fontSize: 13 }}>{cta}</div>}
    </div>
  );
}

function RowList({ rows }: { rows: SignoffRecord[] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      {rows.map((r) => (
        <InboxRow key={r.id} record={r} />
      ))}
    </div>
  );
}

function InboxRow({ record }: { record: SignoffRecord }) {
  const filer: Peer | null = record.filedBy ? findPeer(record.filedBy) : null;
  const filedDate = new Date(record.filedAt);
  const verdict = (record.results?.verdict ?? null) as
    | { headline?: string; overallSeverity?: number }
    | null;
  return (
    <Link
      href={`/signoffs/${record.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 18,
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
        background: "var(--app-surface)",
        textDecoration: "none",
        color: "inherit",
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--text-3)",
            letterSpacing: "0.04em",
            marginBottom: 4,
          }}
        >
          {record.id}
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {filer && <PeerAvatar peer={filer} size={26} />}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text-2)",
            }}
          >
            {filer ? `Filed by ${filer.name.split(" ")[0]}` : "Filed"}
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
          padding: "3px 8px",
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
