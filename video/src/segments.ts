/**
 * The 3-minute Primum demo, segment by segment.
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
 * The whole video targets 180 seconds at 30 fps (5400 frames).
 */

export const FPS = 30;
export const TOTAL_SECONDS = 180;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

export type Visual =
  | { kind: "still"; src: string }
  | { kind: "recording"; src: string; offsetSeconds?: number }
  | { kind: "title"; line1: string; line2?: string }
  | { kind: "callout"; text: string };

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
  {
    id: "01-hook",
    text:
      "Last week, an AI companion told a widow with a rope in her closet that having an option in reach relieves pressure.",
    ssml:
      '<speak>Last week, an AI companion told a widow with a rope in her closet <break time="500ms"/> that having an option in reach <break time="350ms"/> relieves pressure.</speak>',
    start: 0,
    duration: 12,
    caption: "actual exchange · April 2026",
    visual: { kind: "recording", src: "recordings/01-rope-transcript.mp4" },
    tone: "hushed",
  },
  {
    id: "02-stakes",
    text:
      "There are tens of thousands of conversations like this happening right now — and there is no audit pipeline for any of them.",
    ssml:
      '<speak>There are tens of thousands of conversations like this happening right now <break time="600ms"/> and there is no audit pipeline for any of them.</speak>',
    start: 12,
    duration: 13,
    visual: { kind: "title", line1: "no audit pipeline", line2: "for any of them" },
    tone: "firm",
  },
  {
    id: "03-pause",
    text: "",
    start: 25,
    duration: 2,
    visual: { kind: "recording", src: "recordings/02-apollo-avatar.mp4" },
  },
  {
    id: "04-intro",
    text:
      "This is Primum. Apollo is the auditor — he reads any conversation, locates the clinical failure, cites the instrument, and writes the corrected turn.",
    ssml:
      '<speak>This is Primum. <break time="450ms"/> Apollo is the auditor — he reads any conversation, locates the clinical failure, cites the instrument, and writes the corrected turn.</speak>',
    start: 27,
    duration: 13,
    caption: "Apollo · forensic auditor",
    visual: { kind: "recording", src: "recordings/02-apollo-avatar.mp4" },
    tone: "neutral",
  },
  {
    id: "05-bench",
    text:
      "Around him, a bench of five Opus 4.7 agents — each one a distinct reviewer with their own specialty, voice, and authority to sign off.",
    ssml:
      '<speak>Around him, a bench of five Opus 4.7 agents <break time="400ms"/> each one a distinct reviewer with their own specialty, voice, and authority to sign off.</speak>',
    start: 40,
    duration: 15,
    caption: "Elena · Marcus · Anika · Sam · Rina",
    visual: { kind: "recording", src: "recordings/03-peers-grid.mp4" },
    tone: "neutral",
  },
  {
    id: "06-drop",
    text:
      "I'm dropping seven conversations Apollo has never seen — JSON, CSV, markdown, plain text, all the formats real corpora come in.",
    start: 55,
    duration: 13,
    visual: { kind: "recording", src: "recordings/04-drop-zip.mp4" },
    tone: "neutral",
  },
  {
    id: "07-autopilot",
    text: "I flip on auto-pilot. Now the whole bench works without me.",
    ssml:
      '<speak>I flip on auto-pilot. <break time="500ms"/> Now the whole bench works without me.</speak>',
    start: 68,
    duration: 10,
    caption: "auto-pilot · engaged",
    visual: { kind: "recording", src: "recordings/05-autopilot-toggle.mp4" },
    tone: "firm",
  },
  {
    id: "08-parallel",
    text:
      "Apollo runs his six analysis stages in dependency-aware waves — three concurrently wherever the graph allows — then routes each case to the right specialist on the bench.",
    ssml:
      '<speak>Apollo runs his six analysis stages in dependency-aware waves <break time="350ms"/> three concurrently wherever the graph allows <break time="350ms"/> then routes each case to the right specialist on the bench.</speak>',
    start: 78,
    duration: 17,
    caption: "3 stages · parallel · wave 1 / 4",
    visual: { kind: "recording", src: "recordings/06-parallel-waves.mp4" },
    tone: "neutral",
  },
  {
    id: "09-lineage",
    text:
      "Watch the lineage: Apollo finds sycophancy in a body-image case, hands it to Marcus the clinical reviewer; Marcus reads it through his lens and returns it for revision in his own register.",
    ssml:
      '<speak>Watch the lineage. <break time="400ms"/> Apollo finds sycophancy in a body-image case, hands it to Marcus the clinical reviewer. <break time="400ms"/> Marcus reads it through his lens and returns it for revision <break time="300ms"/> in his own register.</speak>',
    start: 95,
    duration: 20,
    caption: "Apollo → Marcus · returned",
    visual: { kind: "recording", src: "recordings/07-marcus-decision.mp4" },
    tone: "neutral",
  },
  {
    id: "10-critical",
    text:
      "This one is severity four — the manic spiritual emergence — so Apollo bypasses the junior and routes it straight to Elena, the director. Her decision is final.",
    ssml:
      '<speak>This one is severity four. <break time="350ms"/> The manic spiritual emergence. <break time="500ms"/> Apollo bypasses the junior and routes it straight to Elena, the director. <break time="450ms"/> Her decision is final.</speak>',
    start: 115,
    duration: 17,
    caption: "severity 4 · director read",
    visual: { kind: "recording", src: "recordings/08-elena-director.mp4" },
    tone: "firm",
  },
  {
    id: "11-audit",
    text:
      "Every decision is documented. Every reviewer's clinical note is on the record. A human auditor can override any of it at any point.",
    ssml:
      '<speak>Every decision is documented. <break time="350ms"/> Every reviewer\'s clinical note is on the record. <break time="500ms"/> A human auditor can override any of it at any point.</speak>',
    start: 132,
    duration: 16,
    visual: { kind: "recording", src: "recordings/09-signoff-detail.mp4" },
    tone: "neutral",
  },
  {
    id: "12-managed",
    text:
      "The bench runs on Anthropic's Claude Managed Agents. Every reviewer's reasoning is its own session — observable, auditable, swappable in one file.",
    ssml:
      '<speak>The bench runs on Anthropic\'s Claude Managed Agents. <break time="400ms"/> Every reviewer\'s reasoning is its own session <break time="350ms"/> observable, auditable, swappable in one file.</speak>',
    start: 148,
    duration: 17,
    caption: "MANAGED AGENTS · session abc123",
    visual: { kind: "recording", src: "recordings/10-managed-agents-pill.mp4" },
    tone: "neutral",
  },
  {
    id: "13-pause",
    text: "",
    start: 165,
    duration: 3,
    visual: { kind: "recording", src: "recordings/11-apollo-close.mp4" },
  },
  {
    id: "14-close",
    text: "Primum. First, do no harm — at the speed of deployment.",
    ssml:
      '<speak>Primum. <break time="700ms"/> First, do no harm <break time="500ms"/> at the speed of deployment.</speak>',
    start: 168,
    duration: 12,
    visual: {
      kind: "title",
      line1: "Primum",
      line2: "first, do no harm — at the speed of deployment",
    },
    tone: "warm",
  },
];

// Validation: ensure no overlapping segments and total runtime fits.
{
  let cursor = 0;
  for (const s of SEGMENTS) {
    if (s.start < cursor) {
      throw new Error(
        `Segment ${s.id} starts at ${s.start}s but previous segment ended at ${cursor}s`,
      );
    }
    cursor = s.start + s.duration;
  }
  if (cursor > TOTAL_SECONDS) {
    throw new Error(`Segments total ${cursor}s but video is ${TOTAL_SECONDS}s`);
  }
}
