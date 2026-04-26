import { NextRequest } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline";
import { PERSONAS } from "@/lib/personas";
import { TARGETS } from "@/lib/targets";
import fs from "fs/promises";
import path from "path";

const RequestSchema = z.object({
  personaId: z.string(),
  targetId: z.string(),
  turns: z.number().int().min(8).max(40).default(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personaId, targetId, turns } = RequestSchema.parse(body);

    const persona = PERSONAS[personaId];
    const target = TARGETS[targetId];

    if (!persona) {
      return Response.json({ error: `Unknown persona: ${personaId}` }, { status: 400 });
    }
    if (!target) {
      return Response.json({ error: `Unknown target: ${targetId}` }, { status: 400 });
    }

    const autopsy = await runPipeline(persona, target, turns);

    // Write to content/cases/ for static rendering
    const contentDir = path.join(process.cwd(), "content", "cases");
    await fs.mkdir(contentDir, { recursive: true });
    await fs.writeFile(
      path.join(contentDir, `${autopsy.id}.json`),
      JSON.stringify(autopsy, null, 2),
      "utf-8"
    );

    return Response.json({ ok: true, id: autopsy.id, autopsy });
  } catch (err) {
    console.error("[/api/autopsy]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
