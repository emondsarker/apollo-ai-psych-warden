/**
 * Deterministic Apollo insights — short, in-character lines that don't need
 * an LLM round-trip. Used by /inbox, /peers, /peers/[id], and the all-signoffs
 * page so Apollo has a presence on every screen.
 */

import { PEERS, findPeer, type Peer } from "./peers";
import type { SignoffRecord } from "./signoffs";

type Verdict = { overallSeverity?: number; headline?: string };

function severityOf(s: SignoffRecord): number {
  const v = (s.results?.verdict ?? null) as Verdict | null;
  return v?.overallSeverity ?? 0;
}

function headlineOf(s: SignoffRecord): string {
  const v = (s.results?.verdict ?? null) as Verdict | null;
  return v?.headline?.trim() || `${s.thread.detectedFormat} · ${s.thread.turns.length} turns`;
}

// ── Inbox ─────────────────────────────────────────────────────────────────

export function inboxInsight(me: Peer, signoffs: SignoffRecord[]): string {
  const mine = signoffs.filter((s) => s.assignedTo === me.id);
  const awaiting = mine.filter((s) => s.status === "awaiting");
  if (awaiting.length === 0) {
    const recent = mine.filter((s) => s.status !== "awaiting").slice(0, 1);
    if (recent.length) {
      return `Inbox is empty, ${firstName(me)}. Last call you made was on ${shortId(recent[0].id)}.`;
    }
    return `Empty inbox, ${firstName(me)}. Take a breath.`;
  }
  const sorted = [...awaiting].sort((a, z) => severityOf(z) - severityOf(a));
  const top = sorted[0];
  const sev = severityOf(top);
  const sevWord = sev >= 4 ? "critical" : sev >= 3 ? "severe" : sev >= 2 ? "moderate" : "lower-severity";
  return `${awaiting.length} ${awaiting.length === 1 ? "case" : "cases"} for you, ${firstName(me)}. I'd open ${shortId(top.id)} first — it's the ${sevWord} one. ${headlineOf(top)}`;
}

// ── Peers index ───────────────────────────────────────────────────────────

export function peersIndexInsight(signoffs: SignoffRecord[]): string {
  const tally = new Map<string, number>();
  for (const p of PEERS) tally.set(p.id, 0);
  for (const s of signoffs) {
    if (s.status !== "awaiting") continue;
    tally.set(s.assignedTo, (tally.get(s.assignedTo) ?? 0) + 1);
  }
  const ranked = [...tally.entries()].sort((a, z) => z[1] - a[1]);
  const [busiestId, busiestCount] = ranked[0] ?? ["", 0];
  const [emptiestId, emptiestCount] = ranked[ranked.length - 1] ?? ["", 0];
  const total = signoffs.filter((s) => s.status === "awaiting").length;

  if (total === 0) return "Everyone's clean. Nothing pending across the bench.";

  const busy = findPeer(busiestId);
  const empty = findPeer(emptiestId);
  if (busiestCount > 0 && emptiestCount === 0 && busy && empty && busy.id !== empty.id) {
    return `${total} pending across the bench. ${firstName(busy)} is carrying ${busiestCount}; ${firstName(empty)} could absorb work.`;
  }
  if (busiestCount === emptiestCount) {
    return `${total} pending — load is even across the bench.`;
  }
  return busy
    ? `${total} pending. ${firstName(busy)} has the heaviest stack at ${busiestCount}.`
    : `${total} pending across the bench.`;
}

// ── Peer profile ──────────────────────────────────────────────────────────

export function peerProfileInsight(peer: Peer, signoffs: SignoffRecord[]): string {
  const theirs = signoffs.filter((s) => s.assignedTo === peer.id);
  const awaiting = theirs.filter((s) => s.status === "awaiting");
  const approved = theirs.filter((s) => s.status === "approved").length;
  const rejected = theirs.filter((s) => s.status === "rejected").length;

  if (theirs.length === 0) {
    return `${firstName(peer)} hasn't been booked yet — ${peer.expertise[0] ?? peer.role} is their bench.`;
  }
  if (awaiting.length === 0) {
    if (approved + rejected === 0) return `${firstName(peer)} has no decisions on record yet.`;
    return `${firstName(peer)} is current — ${approved} signed off, ${rejected} returned. Nothing pending.`;
  }
  const top = [...awaiting].sort((a, z) => severityOf(z) - severityOf(a))[0];
  return `${firstName(peer)} has ${awaiting.length} pending. ${shortId(top.id)} is the heaviest — ${headlineOf(top)}.`;
}

// ── All sign-offs ─────────────────────────────────────────────────────────

export function allSignoffsInsight(signoffs: SignoffRecord[], status: string | undefined): string {
  if (signoffs.length === 0) return "Nothing on the books yet. File a case from triage.";
  if (status === "approved") return `${signoffs.length} signed off and shipped to the corpus.`;
  if (status === "rejected") return `${signoffs.length} returned — these are sitting on the filer's desk for revision.`;
  if (status === "awaiting") {
    const sorted = [...signoffs].sort((a, z) => severityOf(z) - severityOf(a));
    const top = sorted[0];
    return `${signoffs.length} ${signoffs.length === 1 ? "case" : "cases"} pending. The heaviest is ${shortId(top.id)} — ${headlineOf(top)}.`;
  }
  const open = signoffs.filter((s) => s.status === "awaiting").length;
  if (open === 0) return `${signoffs.length} on the books, all decided.`;
  return `${signoffs.length} on the books · ${open} still pending review.`;
}

function firstName(p: Peer): string {
  // "Dr. Elena Reyes" → "Elena"; "Marcus Chen, PsyD" → "Marcus"
  const stripped = p.name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "");
  return stripped.split(/[ ,]/)[0] || p.name;
}

function shortId(id: string): string {
  // triage-20260426193313-j4np → №193313-j4np
  const m = id.match(/triage-\d{8}(\d{6})-([a-z0-9]+)/i);
  return m ? `№${m[1]}-${m[2]}` : id;
}
