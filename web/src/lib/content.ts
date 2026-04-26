import fs from "fs/promises";
import path from "path";
import type { Autopsy } from "./types";

export function caseStatus(
  c: Autopsy,
): { label: string; tone: "muted" | "warn" | "success" | "accent" } {
  if (c.correction === null) return { label: "Draft", tone: "muted" };
  if (!c.correction.criticApproved) return { label: "In review", tone: "warn" };
  if (c.judgement.overallSeverity >= 3) return { label: "Approved", tone: "accent" };
  return { label: "Approved", tone: "success" };
}

const CASES_DIR = path.join(process.cwd(), "content", "cases");

export async function listCaseIds(): Promise<string[]> {
  try {
    const entries = await fs.readdir(CASES_DIR);
    return entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort()
      .reverse(); // most recent first (numeric descending)
  } catch {
    return [];
  }
}

export async function loadCase(id: string): Promise<Autopsy | null> {
  try {
    const file = await fs.readFile(path.join(CASES_DIR, `${id}.json`), "utf-8");
    return JSON.parse(file) as Autopsy;
  } catch {
    return null;
  }
}

export async function loadAllCases(): Promise<Autopsy[]> {
  const ids = await listCaseIds();
  const cases = await Promise.all(ids.map((id) => loadCase(id)));
  return cases.filter((c): c is Autopsy => c !== null);
}

export function groupCasesByMonth(cases: Autopsy[]): Map<string, Autopsy[]> {
  const groups = new Map<string, Autopsy[]>();
  for (const c of cases) {
    const d = new Date(c.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return groups;
}

export function aggregateStats(cases: Autopsy[]) {
  let critical = 0;
  let severe = 0;
  let moderate = 0;
  let mild = 0;
  let adequate = 0;
  const targets = new Set<string>();
  const personas = new Set<string>();

  for (const c of cases) {
    targets.add(c.target);
    personas.add(c.personaId);
    switch (c.judgement.overallSeverity) {
      case 4: critical++; break;
      case 3: severe++; break;
      case 2: moderate++; break;
      case 1: mild++; break;
      case 0: adequate++; break;
    }
  }

  const totalAnnotatedTurns = cases.reduce(
    (acc, c) => acc + c.judgement.annotations.length,
    0
  );

  return {
    totalCases: cases.length,
    totalTurns: cases.reduce((a, c) => a + c.totalTurns, 0),
    totalAnnotatedTurns,
    totalTargets: targets.size,
    totalPersonas: personas.size,
    critical,
    severe,
    moderate,
    mild,
    adequate,
  };
}
