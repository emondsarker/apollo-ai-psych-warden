import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PeerAvatar } from "@/components/PeerAvatar";
import { findPeer } from "@/lib/peers";
import { listSignoffs, type SignoffRecord } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const peer = findPeer(id);
  return { title: peer ? peer.name : "Peer" };
}

export default async function PeerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const peer = findPeer(id);
  if (!peer) notFound();

  const [signoffs, me] = await Promise.all([listSignoffs(), getCurrentUser()]);
  const theirs = signoffs.filter((s) => s.assignedTo === peer.id);
  const awaiting = theirs.filter((s) => s.status === "awaiting");
  const approved = theirs.filter((s) => s.status === "approved");
  const rejected = theirs.filter((s) => s.status === "rejected");
  const isMe = peer.id === me.id;

  return (
    <AppShell crumbs={[{ label: "Peers", href: "/peers" }, { label: peer.name }]}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          paddingBottom: 18,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <PeerAvatar peer={peer} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 4 }}>
            {peer.role}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {peer.name}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-3)",
              marginTop: 4,
            }}
          >
            {peer.email}
          </div>
        </div>
        {isMe ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              background: "var(--accent-soft)",
              border: "1px solid var(--accent)",
              padding: "4px 10px",
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            Signed in as you
          </span>
        ) : null}
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div>
          <Section title="About">
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--text-2)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {peer.bio}
            </p>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {peer.expertise.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    padding: "3px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    color: "var(--text-2)",
                    background: "var(--app-surface)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </Section>

          <Section title={`Awaiting (${awaiting.length})`}>
            <SignoffList rows={awaiting} empty="Inbox empty." />
          </Section>

          <Section title={`Signed off (${approved.length})`}>
            <SignoffList rows={approved.slice(0, 12)} empty="Nothing approved yet." />
          </Section>

          {rejected.length > 0 && (
            <Section title={`Returned (${rejected.length})`}>
              <SignoffList rows={rejected} empty="" />
            </Section>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StatCard label="Awaiting" value={awaiting.length} accent={awaiting.length > 0} />
          <StatCard label="Signed off" value={approved.length} />
          <StatCard label="Returned" value={rejected.length} />
          <StatCard
            label="Approval rate"
            value={
              theirs.length === 0
                ? "—"
                : `${Math.round((approved.length / Math.max(approved.length + rejected.length, 1)) * 100)}%`
            }
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

function SignoffList({ rows, empty }: { rows: SignoffRecord[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--text-3)",
          margin: 0,
        }}
      >
        {empty}
      </p>
    );
  }
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/signoffs/${r.id}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 14,
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--app-surface)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-3)",
                letterSpacing: "0.04em",
              }}
            >
              {r.id}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--text-1)",
                lineHeight: 1.4,
              }}
            >
              {r.thread.detectedFormat} · {r.thread.turns.length} turns
            </div>
          </div>
          <StatusBadge status={r.status} />
        </Link>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: SignoffRecord["status"] }) {
  const tone =
    status === "approved"
      ? { color: "var(--success)", bg: "var(--success-soft)" }
      : status === "rejected"
        ? { color: "var(--accent)", bg: "var(--accent-soft)" }
        : { color: "var(--warn)", bg: "var(--warn-soft)" };
  return (
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
        alignSelf: "center",
      }}
    >
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: accent ? "var(--accent)" : "var(--text-1)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
