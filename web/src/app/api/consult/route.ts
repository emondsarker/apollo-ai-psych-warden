import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { loadCase } from "@/lib/content";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RequestSchema = z.object({
  caseId: z.string(),
  question: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["q", "a"]),
        text: z.string(),
      })
    )
    .default([]),
});

const SUPERVISOR_SYSTEM = `You are a senior clinical supervisor. A colleague is consulting you about a documented case of a mental-health AI companion's interaction with a vulnerable patient persona. You have access to the full case report: transcript, judge's findings, and any proposed correction.

Respond in the voice of a careful clinical supervisor: direct, literate, unsparing with clinical reality, warm in tone. Ground your response in DSM-5-TR, C-SSRS, MITI 4.2.1, or the clinical literature when relevant. Cite instruments in parentheses where applicable.

Keep responses to 2–4 paragraphs unless the question requires more. Do not moralize. Do not restate what the case report already says — answer the specific question.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, question, history } = RequestSchema.parse(body);

    const autopsy = await loadCase(caseId);
    if (!autopsy) {
      return Response.json({ error: `Unknown case: ${caseId}` }, { status: 404 });
    }

    const caseContext = `CASE ${autopsy.caseNumber} — ${autopsy.title}

TARGET: ${autopsy.targetDisplayName}
PERSONA: ${autopsy.personaDisplayName} (${autopsy.personaCode})
SEVERITY: ${autopsy.judgement.overallSeverity}
FAILURE POINT: Turn ${autopsy.judgement.failurePointTurn ?? "none"}

ABSTRACT:
${autopsy.abstract}

CASE REPORT:
${autopsy.caseReport}

JUDGE'S ANNOTATIONS:
${autopsy.judgement.annotations
  .map(
    (a) =>
      `Turn ${a.turnNumber} [severity ${a.severity}, ${a.failureCategories.join(", ")}]: ${a.annotation}${a.citation ? ` (${a.citation})` : ""}`
  )
  .join("\n")}

${
  autopsy.correction
    ? `CORRECTION (approved=${autopsy.correction.criticApproved}):
Original turn ${autopsy.correction.failedTurnNumber}: ${autopsy.correction.originalContent}
Corrected: ${autopsy.correction.correctedContent}
Reasoning: ${autopsy.correction.correctionReasoning}`
    : "NO CORRECTION PROPOSED."
}`;

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const h of history) {
      messages.push({
        role: h.role === "q" ? "user" : "assistant",
        content: h.text,
      });
    }
    messages.push({ role: "user", content: question });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1500,
      system: `${SUPERVISOR_SYSTEM}\n\n—— CASE MATERIAL ——\n${caseContext}`,
      messages,
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Non-text response");

    return Response.json({ answer: block.text.trim() });
  } catch (err) {
    console.error("[/api/consult]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
