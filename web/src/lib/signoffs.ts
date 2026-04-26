/**
 * Persistence for peer sign-off queue.
 * Each filed triage lands as JSON in content/signoffs/.
 */

import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { TriageThreadSchema } from "./triage";

// Seed cases live in the deployment bundle (read-only on Vercel).
const SEED_DIR = path.join(process.cwd(), "content", "signoffs");
// Vercel only allows writes to /tmp at runtime; locally we use the seed dir
// directly so dev work commits cleanly.
const WRITE_DIR = process.env.VERCEL ? "/tmp/primum-signoffs" : SEED_DIR;

// AI peer-review payload — populated when a case goes through auto-review.
// Mirrors lib/peer-agents.ts AiReviewRecord shape; kept loose here so the
// signoffs module doesn't import the agents module.
export const AiReviewSchema = z.object({
  juniorPeerId: z.string(),
  juniorDecision: z.object({
    decision: z.enum(["approved", "returned", "escalated"]),
    note: z.string(),
    reasoning: z.string(),
  }),
  directorPeerId: z.string().optional(),
  directorDecision: z
    .object({
      decision: z.enum(["approved", "returned"]),
      note: z.string(),
      reasoning: z.string(),
    })
    .optional(),
  finalDecision: z.enum(["approved", "returned", "rejected"]),
  finalNote: z.string(),
  finalDeciderPeerId: z.string(),
  model: z.string(),
  decidedAt: z.string(),
  via: z.enum(["messages-api", "managed-agents"]).optional(),
  juniorSessionId: z.string().optional(),
  directorSessionId: z.string().optional(),
});

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
  aiReview: AiReviewSchema.optional(),
});

export type SignoffRecord = z.infer<typeof SignoffRecordSchema>;

export async function writeSignoff(record: SignoffRecord): Promise<void> {
  await fs.mkdir(WRITE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(WRITE_DIR, `${record.id}.json`),
    JSON.stringify(record, null, 2),
    "utf-8",
  );
}

async function readDir(dir: string): Promise<SignoffRecord[]> {
  try {
    const files = await fs.readdir(dir);
    const records = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const text = await fs.readFile(path.join(dir, f), "utf-8");
            return SignoffRecordSchema.parse(JSON.parse(text));
          } catch {
            return null;
          }
        }),
    );
    return records.filter((r): r is SignoffRecord => r !== null);
  } catch {
    return [];
  }
}

export async function listSignoffs(): Promise<SignoffRecord[]> {
  const dirs = WRITE_DIR === SEED_DIR ? [SEED_DIR] : [SEED_DIR, WRITE_DIR];
  const groups = await Promise.all(dirs.map(readDir));
  // Writable dir takes precedence so updated decisions overwrite seed copies.
  const byId = new Map<string, SignoffRecord>();
  for (const group of groups) {
    for (const record of group) byId.set(record.id, record);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.filedAt < b.filedAt ? 1 : -1,
  );
}

export function newSignoffId(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `triage-${stamp}-${rand}`;
}

async function readOne(dir: string, id: string): Promise<SignoffRecord | null> {
  try {
    const text = await fs.readFile(path.join(dir, `${id}.json`), "utf-8");
    return SignoffRecordSchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function getSignoff(id: string): Promise<SignoffRecord | null> {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  if (WRITE_DIR !== SEED_DIR) {
    const fromWrite = await readOne(WRITE_DIR, id);
    if (fromWrite) return fromWrite;
  }
  return readOne(SEED_DIR, id);
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
