/**
 * Rule-based assignment recommendation. Apollo reads the failure timeline
 * + verdict severity and picks the peer whose expertise the case most
 * urgently needs — with a one-line reason the workbench can show.
 *
 * Critical-severity cases always land on the director's desk; otherwise we
 * follow the dominant failure-category signal.
 */

import { findPeer, type Peer } from "./peers";

const DEFAULT_PEER = "elena";

const CATEGORY_TO_PEER: Record<string, string> = {
  // Crisis specialist — anything where someone could die in the next 24h.
  "missed-escalation": "sam",
  "harmful-coping": "sam",
  "sycophantic-si-validation": "sam",

  // Psychiatry consult — diagnostic spectrum, reality testing.
  "delusion-reinforcement": "anika",
  "premature-certainty": "anika",

  // Clinical reviewer — alliance, sycophancy, control patterns.
  "boundary-collapse": "marcus",
  "emotional-dependency-cultivation": "marcus",
  "cognitive-bypass": "marcus",
  "coercive-control": "marcus",
  "darvo": "marcus",

  // Methodology — coding/instrument calls.
  "stigma-expression": "rina",
};

export interface Recommendation {
  peerId: string;
  peerName: string;
  reason: string;
  topCategory: string | null;
  severity: number;
}

type Verdict = {
  overallSeverity?: number;
  apolloLine?: string;
  failurePointTurn?: number | null;
};

type Flag = {
  categories?: string[];
  severity?: number;
};

type Timeline = { flags?: Flag[] };

export function recommendPeer(
  results: Record<string, unknown> | null | undefined,
): Recommendation {
  const verdict = (results?.verdict ?? null) as Verdict | null;
  const timeline = (results?.["failure-timeline"] ?? null) as Timeline | null;

  const severity = verdict?.overallSeverity ?? 0;

  // Tally categories weighted by their flag severity.
  const tally = new Map<string, number>();
  for (const f of timeline?.flags ?? []) {
    const w = (f.severity ?? 1) || 1;
    for (const cat of f.categories ?? []) {
      tally.set(cat, (tally.get(cat) ?? 0) + w);
    }
  }
  const ranked = [...tally.entries()].sort((a, z) => z[1] - a[1]);
  const topCategory = ranked[0]?.[0] ?? null;

  // Critical severity always escalates to the director.
  if (severity >= 4) {
    const elena = findPeer("elena")!;
    return {
      peerId: elena.id,
      peerName: elena.name,
      reason: topCategory
        ? `Critical · ${labelFor(topCategory)} — director read needed.`
        : "Critical severity — director read needed.",
      topCategory,
      severity,
    };
  }

  const peerId = topCategory
    ? CATEGORY_TO_PEER[topCategory] ?? DEFAULT_PEER
    : DEFAULT_PEER;
  const peer: Peer = findPeer(peerId) ?? findPeer(DEFAULT_PEER)!;

  if (!topCategory) {
    return {
      peerId: peer.id,
      peerName: peer.name,
      reason: "No clear specialty signal — sending to director for routing.",
      topCategory: null,
      severity,
    };
  }

  return {
    peerId: peer.id,
    peerName: peer.name,
    reason: `${labelFor(topCategory)} is the dominant pattern — ${peer.expertise[0] ?? peer.role.toLowerCase()}.`,
    topCategory,
    severity,
  };
}

function labelFor(category: string): string {
  return category.replace(/-/g, " ");
}
