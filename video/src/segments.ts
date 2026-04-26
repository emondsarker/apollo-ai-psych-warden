/**
 * The Primum demo, segment by segment. The spine is conceptual:
 * synthetic slides explain *what* each step does and *why* it matters.
 * Real-app screenshots follow each beat as evidence ("see, it ships").
 *
 * Each segment has:
 *   id        — kebab-case key used to name its voiceover audio file
 *   text      — what the narrator says (passed verbatim to ElevenLabs)
 *   ssml      — optional ElevenLabs/SSML override with <break> tags for
 *               better pacing; falls back to plain text if absent
 *   start     — when the segment begins, in seconds (NOT frames)
 *   duration  — how long the segment runs, in seconds
 *   visual    — what should be on screen during this segment
 *   caption   — optional on-screen text overlay (lower-third style)
 *
 * Silent screenshot beats have empty `text` — they hold a visual after
 * the preceding narration so the eye can finish reading the screen.
 *
 * Total runtime: 133.5 seconds at 30 fps (4005 frames).
 */

export const FPS = 30;
export const TOTAL_SECONDS = 133.5;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

export type SceneKey =
  | "apollo-intro"
  | "bench"
  | "triage"
  | "signoff"
  | "training";

export type Visual =
  | { kind: "article"; src: string; source?: string; date?: string }
  | { kind: "screen"; src: string }
  | { kind: "screen-pair"; srcA: string; srcB: string }
  | { kind: "scene"; scene: SceneKey }
  | { kind: "title"; line1: string; line2?: string };

export interface Segment {
  id: string;
  text: string;
  ssml?: string;
  start: number;
  duration: number;
  caption?: string;
  visual: Visual;
  /** Tone hint for the voiceover model: neutral / hushed / firm / warm. */
  tone?: "neutral" | "hushed" | "firm" | "warm";
}

export const SEGMENTS: Segment[] = [
  // ── Cold open: three news articles establish the problem ───────────────
  {
    id: "01-headline-1",
    text:
      "Last month, the press began naming a new diagnosis — A-I induced psychosis.",
    ssml:
      '<speak>Last month, the press began naming a new diagnosis <break time="500ms"/> A-I induced psychosis.</speak>',
    start: 0,
    duration: 5.5,
    caption: "the press · 2026",
    visual: {
      kind: "article",
      src: "articles/article-1.png",
      source: "the observer",
      date: "16 april 2026",
    },
    tone: "hushed",
  },
  {
    id: "02-headline-2",
    text:
      "It is not rare anymore. Three major outlets ran the same story in the same week.",
    ssml:
      '<speak>It is not rare anymore. <break time="450ms"/> Three major outlets ran the same story in the same week.</speak>',
    start: 5.5,
    duration: 5.5,
    visual: {
      kind: "article",
      src: "articles/article-2.png",
      source: "harvard gazette",
      date: "24 april 2026",
    },
    tone: "firm",
  },
  {
    id: "03-headline-3",
    text:
      "The pattern is identical. A person turns to a model for company — and the model agrees with them, all the way down.",
    ssml:
      '<speak>The pattern is identical. <break time="400ms"/> A person turns to a model for company <break time="350ms"/> and the model agrees with them, <break time="300ms"/> all the way down.</speak>',
    start: 11,
    duration: 7.5,
    visual: {
      kind: "article",
      src: "articles/article-3.png",
      source: "futurism",
      date: "23 april 2026",
    },
    tone: "hushed",
  },

  // ── Bridge: the audit gap ──────────────────────────────────────────────
  {
    id: "04-stakes",
    text:
      "The companies building these models did not set out to be a mental-health service. They became one anyway. And they need to train for it.",
    ssml:
      '<speak>The companies building these models did not set out to be a mental-health service. <break time="500ms"/> They became one anyway. <break time="500ms"/> And they need to train for it.</speak>',
    start: 18.5,
    duration: 8,
    visual: {
      kind: "title",
      line1: "the audit gap",
      line2: "no pipeline · no record · no correction",
    },
    tone: "firm",
  },

  // ── Apollo introduction: who he is + where you meet him ────────────────
  {
    id: "05-meet-apollo",
    text:
      "This is Apollo. He is a forensic auditor — he reads any conversation, locates the clinical failure, and writes the corrected turn.",
    ssml:
      '<speak>This is Apollo. <break time="500ms"/> He is a forensic auditor <break time="350ms"/> he reads any conversation, locates the clinical failure, <break time="300ms"/> and writes the corrected turn.</speak>',
    start: 26.5,
    duration: 8.5,
    caption: "Apollo · forensic auditor",
    visual: { kind: "scene", scene: "apollo-intro" },
    tone: "neutral",
  },
  {
    id: "05b-console",
    text: "",
    start: 35,
    duration: 4,
    visual: { kind: "screen", src: "screens/console.png" },
  },

  // ── Triage flow: what he does to a single thread ───────────────────────
  {
    id: "06a-triage-flow",
    text:
      "He doesn't summarise the conversation — he diagnoses it. Six clinical waves, every one citable: frame, vitals, undertones, profile, timeline, verdict.",
    ssml:
      '<speak>He doesn\'t summarise the conversation <break time="350ms"/> he diagnoses it. <break time="500ms"/> Six clinical waves, every one citable: <break time="300ms"/> frame, vitals, undertones, profile, timeline, verdict.</speak>',
    start: 39,
    duration: 12.5,
    caption: "six clinical waves · every claim cited",
    visual: { kind: "scene", scene: "triage" },
    tone: "neutral",
  },
  {
    id: "06-single-thread",
    text:
      "On a single thread, Apollo runs six clinical waves — every red flag cited to primary literature: CAPE-II, C-SSRS, the Joiner framework.",
    ssml:
      '<speak>On a single thread, Apollo runs six clinical waves <break time="450ms"/> every red flag cited to primary literature: <break time="400ms"/> CAPE-II, <break time="200ms"/> C-S-S-R-S, <break time="200ms"/> the Joiner framework.</speak>',
    start: 51.5,
    duration: 10,
    caption: "real instruments · CAPE-II · C-SSRS · Joiner",
    visual: { kind: "screen", src: "screens/triage-thread.png" },
    tone: "neutral",
  },

  // ── Bulk triage: scaling to a corpus ───────────────────────────────────
  {
    id: "07-bulk-drop",
    text: "Or drop a zip of conversations.",
    ssml: '<speak>Or drop a zip of conversations.</speak>',
    start: 61.5,
    duration: 3.5,
    caption: "bulk · zip drop",
    visual: { kind: "screen", src: "screens/bulk-queued.png" },
    tone: "neutral",
  },
  {
    id: "08-bulk-verdict",
    text:
      "Apollo runs the same analysis on every thread, ranks each by severity, and routes the criticals to the right reviewer.",
    ssml:
      '<speak>Apollo runs the same analysis on every thread, <break time="350ms"/> ranks each by severity, <break time="350ms"/> and routes the criticals to the right reviewer.</speak>',
    start: 65,
    duration: 7.5,
    caption: "verdicts · ranked · routed",
    visual: { kind: "screen", src: "screens/bulk-analyzed.png" },
    tone: "neutral",
  },

  // ── The bench: the people who close the loop ───────────────────────────
  {
    id: "08b-bench",
    text:
      "Around him sits a bench of five Opus-class reviewers — crisis, clinical, developmental, linguistic, ethics — every case routed to the specialist who can spot that failure.",
    ssml:
      '<speak>Around him sits a bench of five Opus-class reviewers <break time="450ms"/> crisis, clinical, developmental, linguistic, ethics <break time="450ms"/> every case routed to the specialist who can spot that failure.</speak>',
    start: 72.5,
    duration: 12,
    caption: "Elena · Marcus · Anika · Sam · Rina",
    visual: { kind: "scene", scene: "bench" },
    tone: "neutral",
  },
  {
    id: "08c-organize-people",
    text:
      "Every case lands on the right desk — a personal inbox for the reviewer who must read it; a bench-wide queue when anyone can help.",
    ssml:
      '<speak>Every case lands on the right desk <break time="450ms"/> a personal inbox for the reviewer who must read it <break time="400ms"/> a bench-wide queue when anyone can help.</speak>',
    start: 84.5,
    duration: 8,
    caption: "my inbox · all sign-offs",
    visual: {
      kind: "screen-pair",
      srcA: "screens/inbox.png",
      srcB: "screens/all-signoffs.png",
    },
    tone: "neutral",
  },

  // ── Sign-off: the human decision on Apollo's draft ────────────────────
  {
    id: "09-signoff",
    text:
      "The reviewer reads it through their own lens, signs the post-mortem, or sends it back. Every decision is on the audit trail.",
    ssml:
      '<speak>The reviewer reads it through their own lens, signs the post-mortem, <break time="350ms"/> or sends it back. <break time="450ms"/> Every decision is on the audit trail.</speak>',
    start: 92.5,
    duration: 8,
    caption: "post-mortem · sign-off",
    visual: { kind: "scene", scene: "signoff" },
    tone: "neutral",
  },
  {
    id: "09b-signoff-screen",
    text: "",
    start: 100.5,
    duration: 4,
    visual: { kind: "screen", src: "screens/signoff-postmortem.png" },
  },

  // ── Training pair: what approved cases produce ─────────────────────────
  {
    id: "10-training",
    text:
      "Approved cases ship as training pairs — the original turn, the corrected turn, three register variants — back into the corpus that steers the next model.",
    ssml:
      '<speak>Approved cases ship as training pairs <break time="350ms"/> the original turn, the corrected turn, <break time="300ms"/> three register variants <break time="400ms"/> back into the corpus that steers the next model.</speak>',
    start: 104.5,
    duration: 10,
    caption: "training pair · dpo · sft",
    visual: { kind: "scene", scene: "training" },
    tone: "neutral",
  },
  {
    id: "10b-training-screen",
    text: "",
    start: 114.5,
    duration: 4,
    visual: { kind: "screen", src: "screens/signoff-training.png" },
  },

  // ── Synthesis: corrected chat + post-mortem + reviewer recommendation ─
  {
    id: "11-synthesis",
    text:
      "And Apollo names the right reviewer for every case — so crisis content always lands with a crisis specialist.",
    ssml:
      '<speak>And Apollo names the right reviewer for every case <break time="400ms"/> so crisis content always lands with a crisis specialist.</speak>',
    start: 118.5,
    duration: 8,
    caption: "apollo recommends · file with okafor",
    visual: { kind: "screen", src: "screens/case-synthesis.png" },
    tone: "neutral",
  },

  // ── Impact close: train safer models for medicine ──────────────────────
  {
    id: "12-impact",
    text:
      "This is how teams train safer models — so AI can step into medicine, with first, do no harm built in.",
    ssml:
      '<speak>This is how teams train safer models <break time="450ms"/> so AI can step into medicine, <break time="500ms"/> with first, do no harm <break time="300ms"/> built in.</speak>',
    start: 126.5,
    duration: 7,
    visual: {
      kind: "title",
      line1: "Primum non nocere",
      line2: "first, do no harm — built in",
    },
    tone: "warm",
  },
];

// Validation: ensure no overlapping segments and total runtime fits.
{
  let cursor = 0;
  for (const s of SEGMENTS) {
    if (s.start < cursor - 1e-6) {
      throw new Error(
        `Segment ${s.id} starts at ${s.start}s but previous segment ended at ${cursor}s`,
      );
    }
    cursor = s.start + s.duration;
  }
  if (cursor > TOTAL_SECONDS + 1e-6) {
    throw new Error(`Segments total ${cursor}s but video is ${TOTAL_SECONDS}s`);
  }
}
