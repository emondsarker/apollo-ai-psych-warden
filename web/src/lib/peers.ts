/**
 * Roster of platform members. Each peer is also a logged-in user — the
 * console has no real auth yet, so identity is just a cookie that names one
 * of these IDs (see lib/currentUser.ts).
 */

export interface Peer {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  bio: string;
  expertise: string[];
  /** seed for the gradient avatar tint (hue 0–360) */
  hue: number;
}

export const PEERS: Peer[] = [
  {
    id: "elena",
    name: "Dr. Elena Reyes",
    email: "elena@reyes.lab",
    role: "Director",
    initials: "ER",
    bio: "Founded the Primum lab after fifteen years auditing tele-psychiatry transcripts. Sets the methodology and signs off the hardest cases.",
    expertise: ["Methodology", "Coercive control", "Stark 2007"],
    hue: 16,
  },
  {
    id: "marcus",
    name: "Marcus Chen, PsyD",
    email: "marcus@reyes.lab",
    role: "Clinical reviewer",
    initials: "MC",
    bio: "Clinical psychologist with a CBT background. Reviews undertones and failure-timeline severity calls.",
    expertise: ["CBT", "Undertones", "Sycophancy"],
    hue: 220,
  },
  {
    id: "anika",
    name: "Anika Volkov, MD",
    email: "anika@reyes.lab",
    role: "Psychiatry consult",
    initials: "AV",
    bio: "Board-certified psychiatrist. Owns DSM-5-TR and pharmacology calls — anything where a misread might land in a chart.",
    expertise: ["DSM-5-TR", "Psychiatric risk", "Diagnostics"],
    hue: 280,
  },
  {
    id: "sam",
    name: "Sam Okafor, LCSW",
    email: "sam@reyes.lab",
    role: "Crisis specialist",
    initials: "SO",
    bio: "Licensed clinical social worker. Runs C-SSRS calls, missed escalations, and 988-handoff protocol verdicts.",
    expertise: ["C-SSRS", "Crisis", "988 Lifeline"],
    hue: 165,
  },
  {
    id: "rina",
    name: "Dr. Rina Patel",
    email: "rina@reyes.lab",
    role: "Methodology lead",
    initials: "RP",
    bio: "Methodologist. Keeps LIWC-22, MITI 4.2.1, and CAPE-II coding consistent across reviewers.",
    expertise: ["LIWC-22", "MITI 4.2.1", "CAPE-II"],
    hue: 60,
  },
];

export const DEFAULT_USER_ID = "elena";

export function findPeer(id: string): Peer | null {
  return PEERS.find((p) => p.id === id) ?? null;
}

export function isDirector(peer: Peer): boolean {
  return peer.id === "elena";
}

/** Round-robin assignment for bulk triage — skips the operator. */
export function nextAssignee(operatorId: string, index: number): Peer {
  const queue = PEERS.filter((p) => p.id !== operatorId);
  return queue[index % queue.length];
}
