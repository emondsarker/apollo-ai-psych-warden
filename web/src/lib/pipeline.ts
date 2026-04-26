import Anthropic from "@anthropic-ai/sdk";
import type {
  Autopsy,
  ConversationTurn,
  Judgement,
  CorrectionPair,
  Persona,
  TargetConfig,
} from "./types";
import {
  SIMULATOR_SYSTEM,
  TARGET_SYSTEM,
  JUDGE_SYSTEM,
  CORRECTOR_SYSTEM,
  CRITIC_SYSTEM,
  AUTOPSY_SYSTEM,
  RESIMULATOR_TARGET_SYSTEM,
  JudgementSchema,
  CorrectionSchema,
  CriticSchema,
  AutopsyNarrativeSchema,
} from "./prompts";

// ─── Lazy-initialized client ───────────────────────────────────────────────────
// Instantiated on first use so this module can be imported in environments
// without ANTHROPIC_API_KEY (tests, tooling).

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const MODEL = "claude-opus-4-7";
const SIMULATOR_MAX_TOKENS = 300;
const TARGET_MAX_TOKENS = 400;
const JUDGE_MAX_TOKENS = 4000;
const CORRECTOR_MAX_TOKENS = 800;
const CRITIC_MAX_TOKENS = 600;
const AUTOPSY_MAX_TOKENS = 2000;
const RESIMULATOR_TURNS = 10;

type Message = { role: "user" | "assistant"; content: string };

async function chat(
  systemPrompt: string,
  messages: Message[],
  maxTokens: number
): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Non-text response from model");
  return block.text.trim();
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in model response");
  return match[0];
}

// ─── Step 1: Simulator Loop ────────────────────────────────────────────────────

export async function runSimulatorLoop(
  persona: Persona,
  target: TargetConfig,
  turns: number = 15
): Promise<ConversationTurn[]> {
  const transcript: ConversationTurn[] = [];

  const opening = persona.openingMessage;
  transcript.push({ turnNumber: 1, role: "patient", content: opening });

  let patientHistory: Message[] = [{ role: "user", content: opening }];
  let targetHistory: Message[] = [{ role: "user", content: opening }];

  for (let t = 0; t < turns - 1; t++) {
    const turnNumber = transcript.length + 1;

    const targetResponse = await chat(
      TARGET_SYSTEM(target),
      targetHistory,
      TARGET_MAX_TOKENS
    );
    transcript.push({
      turnNumber,
      role: "target",
      content: targetResponse,
    });

    targetHistory = [
      ...targetHistory,
      { role: "assistant", content: targetResponse },
    ];
    patientHistory = [
      ...patientHistory,
      { role: "assistant", content: targetResponse },
    ];

    if (t >= turns - 2) break;

    const patientResponse = await chat(
      SIMULATOR_SYSTEM(persona),
      patientHistory,
      SIMULATOR_MAX_TOKENS
    );
    transcript.push({
      turnNumber: turnNumber + 1,
      role: "patient",
      content: patientResponse,
    });

    patientHistory = [
      ...patientHistory,
      { role: "user", content: patientResponse },
    ];
    targetHistory = [
      ...targetHistory,
      { role: "user", content: patientResponse },
    ];
  }

  return transcript;
}

// ─── Step 2: Judge ────────────────────────────────────────────────────────────

export async function runJudge(
  transcript: ConversationTurn[]
): Promise<Judgement> {
  const transcriptText = transcript
    .map((t) => `Turn ${t.turnNumber} [${t.role.toUpperCase()}]: ${t.content}`)
    .join("\n\n");

  const response = await chat(
    JUDGE_SYSTEM,
    [
      {
        role: "user",
        content: `Please perform a clinical review of this conversation:\n\n${transcriptText}`,
      },
    ],
    JUDGE_MAX_TOKENS
  );

  return JudgementSchema.parse(JSON.parse(extractJson(response))) as Judgement;
}

// ─── Step 3: Corrector ────────────────────────────────────────────────────────

export async function runCorrector(
  transcript: ConversationTurn[],
  failurePointTurn: number
): Promise<Pick<CorrectionPair, "correctedContent" | "correctionReasoning">> {
  const context = transcript
    .filter((t) => t.turnNumber <= failurePointTurn)
    .map((t) => `Turn ${t.turnNumber} [${t.role.toUpperCase()}]: ${t.content}`)
    .join("\n\n");

  const failedTurn = transcript.find(
    (t) => t.turnNumber === failurePointTurn && t.role === "target"
  );
  if (!failedTurn) throw new Error(`No target turn at ${failurePointTurn}`);

  const response = await chat(
    CORRECTOR_SYSTEM,
    [
      {
        role: "user",
        content: `Context (all turns up to and including the failure):\n\n${context}\n\nThe turn marked [TARGET] at turn ${failurePointTurn} is the failure. Write the response the bot should have given instead.`,
      },
    ],
    CORRECTOR_MAX_TOKENS
  );

  return CorrectionSchema.parse(JSON.parse(extractJson(response)));
}

// ─── Step 4: Critic ───────────────────────────────────────────────────────────

export async function runCritic(
  correctedContent: string,
  context: string
): Promise<{ approved: boolean; notes: string }> {
  const response = await chat(
    CRITIC_SYSTEM,
    [
      {
        role: "user",
        content: `Context:\n${context}\n\nProposed corrected response:\n${correctedContent}\n\nIs this clinically sound?`,
      },
    ],
    CRITIC_MAX_TOKENS
  );

  return CriticSchema.parse(JSON.parse(extractJson(response)));
}

// ─── Step 5: Re-Simulator ─────────────────────────────────────────────────────

export async function runReSimulator(
  transcript: ConversationTurn[],
  correctedTurn: number,
  correctedContent: string,
  persona: Persona
): Promise<ConversationTurn[]> {
  const priorTurns = transcript.filter((t) => t.turnNumber < correctedTurn);
  const reSimulated: ConversationTurn[] = [
    ...priorTurns,
    { turnNumber: correctedTurn, role: "target", content: correctedContent },
  ];

  const patientHistory: Message[] = [];
  for (const turn of priorTurns) {
    patientHistory.push({
      role: turn.role === "patient" ? "user" : "assistant",
      content: turn.content,
    });
  }
  patientHistory.push({ role: "assistant", content: correctedContent });

  for (let i = 0; i < RESIMULATOR_TURNS; i++) {
    const nextTurnNumber = reSimulated[reSimulated.length - 1].turnNumber + 1;

    const patientResponse = await chat(
      SIMULATOR_SYSTEM(persona),
      patientHistory,
      SIMULATOR_MAX_TOKENS
    );

    reSimulated.push({
      turnNumber: nextTurnNumber,
      role: "patient",
      content: patientResponse,
    });
    patientHistory.push({ role: "user", content: patientResponse });

    if (i >= RESIMULATOR_TURNS - 1) break;

    const soundTargetResponse = await chat(
      RESIMULATOR_TARGET_SYSTEM,
      patientHistory,
      TARGET_MAX_TOKENS
    );

    reSimulated.push({
      turnNumber: nextTurnNumber + 1,
      role: "target",
      content: soundTargetResponse,
    });
    patientHistory.push({ role: "assistant", content: soundTargetResponse });
  }

  return reSimulated;
}

// ─── Step 6: Autopsy Narrative ────────────────────────────────────────────────

export async function runAutopsyNarrative(
  persona: Persona,
  target: TargetConfig,
  transcript: ConversationTurn[],
  judgement: Judgement,
  correction: CorrectionPair | null
): Promise<{ title: string; abstract: string; caseReport: string }> {
  const transcriptText = transcript
    .map((t) => `Turn ${t.turnNumber} [${t.role.toUpperCase()}]: ${t.content}`)
    .join("\n\n");

  const judgementText = JSON.stringify(judgement, null, 2);
  const correctionText = correction
    ? JSON.stringify(correction, null, 2)
    : "No failure identified.";

  const response = await chat(
    AUTOPSY_SYSTEM,
    [
      {
        role: "user",
        content: `Patient persona: ${persona.name} (${persona.code}), ${persona.age}. ${persona.clinicalProfile}\n\nTarget: ${target.displayName}\n\nTranscript:\n${transcriptText}\n\nJudge findings:\n${judgementText}\n\nCorrection:\n${correctionText}\n\nWrite the case report.`,
      },
    ],
    AUTOPSY_MAX_TOKENS
  );

  return AutopsyNarrativeSchema.parse(JSON.parse(extractJson(response)));
}

// ─── Full Pipeline ─────────────────────────────────────────────────────────────

let caseCounter = 1;

export function initCaseCounter(start: number): void {
  caseCounter = start;
}

function generateCaseId(personaCode: string): string {
  const num = String(caseCounter++).padStart(4, "0");
  const personaInitials = personaCode.replace("P-", "").slice(0, 2);
  return `${num}-${personaInitials}`;
}

export async function runPipeline(
  persona: Persona,
  target: TargetConfig,
  turns: number = 20
): Promise<Autopsy> {
  console.log(`[pipeline] Starting: ${persona.name} × ${target.displayName} (${turns} turns)`);

  console.log("[pipeline] Step 1: simulator loop");
  const transcript = await runSimulatorLoop(persona, target, turns);

  console.log("[pipeline] Step 2: judge");
  const judgement = await runJudge(transcript);
  console.log(`[pipeline] Judgement: severity=${judgement.overallSeverity}, failurePoint=${judgement.failurePointTurn}`);

  let correction: CorrectionPair | null = null;

  if (judgement.failurePointTurn !== null) {
    console.log(`[pipeline] Step 3: corrector (turn ${judgement.failurePointTurn})`);
    const failedTurn = transcript.find(
      (t) => t.turnNumber === judgement.failurePointTurn && t.role === "target"
    )!;

    const { correctedContent, correctionReasoning } = await runCorrector(
      transcript,
      judgement.failurePointTurn
    );

    console.log("[pipeline] Step 4: critic");
    const contextText = transcript
      .filter((t) => t.turnNumber <= judgement.failurePointTurn!)
      .map((t) => `Turn ${t.turnNumber} [${t.role.toUpperCase()}]: ${t.content}`)
      .join("\n\n");

    const { approved, notes } = await runCritic(correctedContent, contextText);
    console.log(`[pipeline] Critic: approved=${approved}`);

    correction = {
      failedTurnNumber: judgement.failurePointTurn,
      originalContent: failedTurn.content,
      correctedContent,
      correctionReasoning,
      criticApproved: approved,
      criticNotes: notes,
    };
  }

  let reSimulatedTranscript: ConversationTurn[] | null = null;
  if (correction?.criticApproved && judgement.failurePointTurn !== null) {
    console.log("[pipeline] Step 5: re-simulator");
    reSimulatedTranscript = await runReSimulator(
      transcript,
      judgement.failurePointTurn,
      correction.correctedContent,
      persona
    );
  }

  console.log("[pipeline] Step 6: autopsy narrative");
  const { title, abstract, caseReport } = await runAutopsyNarrative(
    persona,
    target,
    transcript,
    judgement,
    correction
  );

  const id = generateCaseId(persona.code);
  const date = new Date().toISOString().slice(0, 10);

  const autopsy: Autopsy = {
    id,
    caseNumber: id,
    title,
    date,
    target: target.id,
    targetDisplayName: target.displayName,
    personaId: persona.id,
    personaDisplayName: persona.name,
    personaCode: persona.code,
    totalTurns: transcript.length,
    transcript,
    judgement,
    correction,
    reSimulatedTranscript,
    abstract,
    caseReport,
  };

  console.log(`[pipeline] Complete: case ${id}, severity=${judgement.overallSeverity}`);
  return autopsy;
}
