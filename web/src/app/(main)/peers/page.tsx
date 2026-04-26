import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ApolloLine } from "@/components/ApolloLine";
import { PeerAvatar } from "@/components/PeerAvatar";
import { PEERS, findPeer, type Peer } from "@/lib/peers";
import { listSignoffs, type SignoffRecord } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";
import { peersIndexInsight } from "@/lib/apollo-insights";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peers",
};

export default async function PeersPage() {
  const [signoffs, me] = await Promise.all([listSignoffs(), getCurrentUser()]);
  const stats = computeStats(signoffs);

  return (
    <AppShell crumbs={[{ label: "Peers" }]}>
      <header style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>
          Roster
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
          {PEERS.length} reviewers on the bench.
        </h1>
        <ApolloLine text={peersIndexInsight(signoffs)} />
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {PEERS.map((p) => {
          const s = stats.get(p.id) ?? { awaiting: 0, approved: 0, rejected: 0 };
          const isMe = p.id === me.id;
          return (
            <Link
              key={p.id}
              href={`/peers/${p.id}`}
              style={{
                background: "var(--app-surface)",
                border: `1px solid ${isMe ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                position: "relative",
              }}
            >
              {isMe && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  You
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PeerAvatar peer={p} size={42} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-1)",
                      lineHeight: 1.2,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--text-3)",
                      letterSpacing: "0.04em",
                      marginTop: 2,
                    }}
                  >
                    {p.role}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13,
                  color: "var(--text-2)",
                  lineHeight: 1.5,
                }}
              >
                {p.bio}
              </div>

              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {p.expertise.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.04em",
                      padding: "2px 6px",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      color: "var(--text-2)",
                      background: "var(--app-surface-2)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 10,
                }}
              >
                <Stat label="Queue" value={s.awaiting} accent={s.awaiting > 0} />
                <Stat label="Signed off" value={s.approved} />
                <Stat label="Returned" value={s.rejected} />
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 18,
          fontWeight: 700,
          color: accent ? "var(--accent)" : "var(--text-1)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function computeStats(signoffs: SignoffRecord[]) {
  const m = new Map<string, { awaiting: number; approved: number; rejected: number }>();
  for (const p of PEERS) m.set(p.id, { awaiting: 0, approved: 0, rejected: 0 });
  for (const s of signoffs) {
    const peer = findPeer(s.assignedTo);
    if (!peer) continue;
    const bucket = m.get(peer.id)!;
    bucket[s.status] += 1;
  }
  return m;
}

export type { Peer };
