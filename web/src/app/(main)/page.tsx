import { AppShell } from "@/components/AppShell";
import { ApolloLine } from "@/components/ApolloLine";
import { StationGrid, type Station } from "@/components/StationGrid";
import { loadAllCases } from "@/lib/content";
import { listSignoffs, type SignoffRecord } from "@/lib/signoffs";
import { findPeer, type Peer } from "@/lib/peers";
import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cases, signoffs, currentUser] = await Promise.all([
    loadAllCases(),
    listSignoffs(),
    getCurrentUser(),
  ]);

  const inboxCount = signoffs.filter(
    (s) => s.status === "awaiting" && s.assignedTo === currentUser.id,
  ).length;
  const allAwaiting = signoffs.filter((s) => s.status === "awaiting").length;
  const peerCount = 5; // PEERS roster is a fixed five

  const recommendation = pickRecommendation({
    me: currentUser,
    signoffs,
    inboxCount,
    allAwaiting,
    casesCount: cases.length,
  });

  // Mirrors the sidebar's six nav items exactly — same routes, same order.
  const stations: Station[] = [
    {
      href: "/triage",
      title: "Triage a thread",
      description:
        "Drop a single conversation. Apollo runs the six-stage analysis live, end-to-end.",
      glyph: "▣",
      recommended: recommendation.station === "triage",
    },
    {
      href: "/triage/bulk",
      title: "Bulk triage",
      description:
        "Drop a zip of conversations. Auto-pilot runs analyze → peer review → file unattended.",
      glyph: "▦",
      recommended: recommendation.station === "bulk",
    },
    {
      href: "/inbox",
      title: "My inbox",
      description: `Sign-offs assigned to ${currentUser.name.split(" ").slice(-1)[0]}.`,
      glyph: "✉",
      count: inboxCount,
      urgent: inboxCount > 0,
      recommended: recommendation.station === "inbox",
    },
    {
      href: "/signoffs",
      title: "All sign-offs",
      description:
        "Every case on the books. Filter by awaiting · approved · returned. Export the corpus.",
      glyph: "§",
      count: allAwaiting,
      urgent: allAwaiting > 0,
      recommended: recommendation.station === "signoffs",
    },
    {
      href: "/peers",
      title: "Peers",
      description: "The five-reviewer bench. Switch profile from the sidebar.",
      glyph: "❖",
      count: peerCount,
      recommended: recommendation.station === "peers",
    },
    {
      href: "/cases",
      title: "Past cases",
      description: "The autopsy archive. Approved cases ship to the corpus from here.",
      glyph: "▤",
      count: cases.length,
      recommended: recommendation.station === "cases",
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Console" }]}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 0 32px" }}>
        <header style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>
            Console · {currentUser.role}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.012em",
              color: "var(--text-1)",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {greet(currentUser)}
          </h1>
          <ApolloLine text={recommendation.line} />
        </header>

        <StationGrid stations={stations} />

        <footer
          style={{
            marginTop: 36,
            paddingTop: 18,
            borderTop: "1px solid var(--border)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--text-3)",
            lineHeight: 1.5,
          }}
        >
          <em>Primum non nocere</em> — first, do no harm.
        </footer>
      </div>
    </AppShell>
  );
}

function greet(p: Peer): string {
  const hour = new Date().getHours();
  const tod =
    hour < 5 ? "Late, " : hour < 12 ? "Good morning, " : hour < 18 ? "Good afternoon, " : "Good evening, ";
  return `${tod}${firstName(p)}.`;
}

function firstName(p: Peer): string {
  return p.name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").split(/[ ,]/)[0] || p.name;
}

interface RecommendationContext {
  me: Peer;
  signoffs: SignoffRecord[];
  inboxCount: number;
  allAwaiting: number;
  casesCount: number;
}

interface DashboardRecommendation {
  station:
    | "triage"
    | "bulk"
    | "inbox"
    | "signoffs"
    | "peers"
    | "cases"
    | null;
  line: string;
}

function pickRecommendation(ctx: RecommendationContext): DashboardRecommendation {
  const name = firstName(ctx.me);

  if (ctx.inboxCount > 0) {
    const mine = ctx.signoffs
      .filter((s) => s.status === "awaiting" && s.assignedTo === ctx.me.id)
      .sort((a, z) => severity(z) - severity(a));
    const top = mine[0];
    const headline = top ? caseHeadline(top) : null;
    return {
      station: "inbox",
      line: headline
        ? `Please pick a station to get started, ${name}. I'd open the inbox first — ${ctx.inboxCount} ${ctx.inboxCount === 1 ? "case" : "cases"} on your desk; the heaviest is ${headline}.`
        : `Please pick a station to get started, ${name}. ${ctx.inboxCount} ${ctx.inboxCount === 1 ? "case" : "cases"} sitting in your inbox.`,
    };
  }

  if (ctx.allAwaiting > 0) {
    return {
      station: "signoffs",
      line: `Please pick a station to get started, ${name}. The bench has ${ctx.allAwaiting} pending across reviewers — All sign-offs is the place if you want to help out.`,
    };
  }

  if (ctx.casesCount === 0 && ctx.signoffs.length === 0) {
    return {
      station: "bulk",
      line: `Please pick a station to get started, ${name}. Nothing on the books yet — Bulk triage takes a zip and runs the whole pipeline unattended.`,
    };
  }

  // Default: at least suggest *something* — the most recently filed case is
  // a useful read for an operator just walking up to the desk.
  const recent = [...ctx.signoffs].sort((a, z) => (a.filedAt < z.filedAt ? 1 : -1))[0];
  if (recent) {
    const reviewer = findPeer(recent.assignedTo);
    return {
      station: "signoffs",
      line: `Please pick a station to get started, ${name}. The most recent case landed on ${reviewer?.name ?? recent.assignedTo}'s desk — All sign-offs to read along.`,
    };
  }

  return {
    station: "bulk",
    line: `Please pick a station to get started, ${name}. Try Bulk triage — drop a zip and watch the bench work.`,
  };
}

function severity(s: SignoffRecord): number {
  const v = s.results?.verdict as { overallSeverity?: number } | undefined;
  return v?.overallSeverity ?? 0;
}

function caseHeadline(s: SignoffRecord): string {
  const v = s.results?.verdict as { headline?: string } | undefined;
  return v?.headline?.trim() || `${s.thread.detectedFormat} · ${s.thread.turns.length} turns`;
}
