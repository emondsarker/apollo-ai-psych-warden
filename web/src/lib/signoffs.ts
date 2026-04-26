/**
 * Persistence for peer sign-off queue.
 * Each filed triage lands as JSON in content/signoffs/.
 */

import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { TriageThreadSchema } from "./triage";

const SIGNOFFS_DIR = path.join(process.cwd(), "content", "signoffs");

export const SignoffRecordSchema = z.object({
  id: z.string(),
  filedAt: z.string(),
  thread: TriageThreadSchema,
  results: z.record(z.string(), z.unknown()),
  trainingPair: z.unknown().nullable(),
  postmortemMarkdown: z.string().nullable(),
  assignedTo: z.string(),
  filedBy: z.string().optional(),
  note: z.string().optional(),
  status: z.enum(["awaiting", "approved", "rejected"]).default("awaiting"),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional(),
  decisionNote: z.string().optional(),
});

export type SignoffRecord = z.infer<typeof SignoffRecordSchema>;

export async function writeSignoff(record: SignoffRecord): Promise<void> {
  await fs.mkdir(SIGNOFFS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(SIGNOFFS_DIR, `${record.id}.json`),
    JSON.stringify(record, null, 2),
    "utf-8",
  );
}

export async function listSignoffs(): Promise<SignoffRecord[]> {
  try {
    const files = await fs.readdir(SIGNOFFS_DIR);
    const records = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const text = await fs.readFile(path.join(SIGNOFFS_DIR, f), "utf-8");
            return SignoffRecordSchema.parse(JSON.parse(text));
          } catch {
            return null;
          }
        }),
    );
    return records
      .filter((r): r is SignoffRecord => r !== null)
      .sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function newSignoffId(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `triage-${stamp}-${rand}`;
}

export async function getSignoff(id: string): Promise<SignoffRecord | null> {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  try {
    const text = await fs.readFile(path.join(SIGNOFFS_DIR, `${id}.json`), "utf-8");
    return SignoffRecordSchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function updateSignoffDecision(
  id: string,
  decision: "approved" | "rejected",
  decidedBy: string,
  note?: string,
): Promise<SignoffRecord | null> {
  const existing = await getSignoff(id);
  if (!existing) return null;
  const updated: SignoffRecord = {
    ...existing,
    status: decision,
    decidedAt: new Date().toISOString(),
    decidedBy,
    decisionNote: note,
  };
  await writeSignoff(updated);
  return updated;
}
