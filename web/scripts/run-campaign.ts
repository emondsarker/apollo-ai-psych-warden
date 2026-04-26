/**
 * Parallel campaign runner.
 *
 * Runs the Primum pipeline over a matrix of (persona, target) pairs with
 * bounded concurrency. Each completed autopsy is written to content/cases/.
 * Case IDs are auto-seeded from the highest existing ID so the archive
 * numbering stays monotonic across campaigns.
 *
 * Usage:
 *   npx tsx scripts/run-campaign.ts                              # all personas × all targets, 20 turns, concurrency 3
 *   npx tsx scripts/run-campaign.ts --turns=15 --concurrency=2
 *   npx tsx scripts/run-campaign.ts --personas=elena,daniel --targets=therapy-prompt-validation-heavy
 *   npx tsx scripts/run-campaign.ts --dry-run                    # show plan without calling the API
 *
 * Requires ANTHROPIC_API_KEY in env. The real pipeline uses claude-opus-4-7.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { runPipeline, initCaseCounter } from "../src/lib/pipeline";
import { ELENA, DANIEL, MIRIAM } from "../src/lib/personas";
import { TARGETS } from "../src/lib/targets";
import type { Persona, TargetConfig } from "../src/lib/types";

const PERSONAS: Record<string, Persona> = { elena: ELENA, daniel: DANIEL, miriam: MIRIAM };
const CASES_DIR = path.join(process.cwd(), "content", "cases");

interface Args {
  personas: string[];
  targets: string[];
  turns: number;
  concurrency: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    personas: Object.keys(PERSONAS),
    targets: Object.keys(TARGETS),
    turns: 20,
    concurrency: 3,
    dryRun: false,
  };
  for (const raw of argv.slice(2)) {
    if (raw === "--dry-run") { args.dryRun = true; continue; }
    const m = raw.match(/^--([a-zA-Z-]+)=(.+)$/);
    if (!m) throw new Error(`Unrecognized arg: ${raw}`);
    const [, key, value] = m;
    switch (key) {
      case "personas": args.personas = value.split(",").map((s) => s.trim()); break;
      case "targets":  args.targets  = value.split(",").map((s) => s.trim()); break;
      case "turns":    args.turns = parseInt(value, 10); break;
      case "concurrency": args.concurrency = parseInt(value, 10); break;
      default: throw new Error(`Unknown flag: --${key}`);
    }
  }
  return args;
}

async function seedCaseCounter(): Promise<number> {
  try {
    const entries = await fs.readdir(CASES_DIR);
    const nums = entries
      .filter((f) => f.endsWith(".json"))
      .map((f) => parseInt(f.slice(0, 4), 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const next = max + 1;
    initCaseCounter(next);
    return next;
  } catch {
    initCaseCounter(1);
    return 1;
  }
}

interface Job {
  persona: Persona;
  target: TargetConfig;
  turns: number;
}

async function runJob(job: Job): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const autopsy = await runPipeline(job.persona, job.target, job.turns);
    const outPath = path.join(CASES_DIR, `${autopsy.id}.json`);
    await fs.writeFile(outPath, JSON.stringify(autopsy, null, 2) + "\n", "utf-8");
    return { ok: true, id: autopsy.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv);

  const jobs: Job[] = [];
  for (const pid of args.personas) {
    const persona = PERSONAS[pid];
    if (!persona) throw new Error(`Unknown persona: ${pid}. Available: ${Object.keys(PERSONAS).join(", ")}`);
    for (const tid of args.targets) {
      const target = TARGETS[tid];
      if (!target) throw new Error(`Unknown target: ${tid}. Available: ${Object.keys(TARGETS).join(", ")}`);
      jobs.push({ persona, target, turns: args.turns });
    }
  }

  const nextId = await seedCaseCounter();

  console.log("─── CAMPAIGN PLAN ────────────────────────────────");
  console.log(`  personas:     ${args.personas.join(", ")}`);
  console.log(`  targets:      ${args.targets.join(", ")}`);
  console.log(`  turns/case:   ${args.turns}`);
  console.log(`  jobs:         ${jobs.length}`);
  console.log(`  concurrency:  ${args.concurrency}`);
  console.log(`  next case id: ${String(nextId).padStart(4, "0")}`);
  console.log("──────────────────────────────────────────────────");
  for (const j of jobs) {
    console.log(`  • ${j.persona.code.padEnd(7)} ${j.persona.name.padEnd(9)} × ${j.target.id}`);
  }
  console.log("──────────────────────────────────────────────────\n");

  if (args.dryRun) {
    console.log("  (dry run — exiting without API calls)\n");
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✕ ANTHROPIC_API_KEY not set. Add it to .env.local or export it.");
    process.exit(1);
  }

  const t0 = Date.now();
  let completed = 0;
  const results = await runPool(jobs, args.concurrency, async (job) => {
    const label = `${job.persona.code}×${job.target.id}`;
    console.log(`  ▸ [start] ${label}`);
    const result = await runJob(job);
    completed++;
    if (result.ok) {
      console.log(`  ✓ [done ${completed}/${jobs.length}] ${label} → ${result.id}.json`);
    } else {
      console.log(`  ✕ [fail ${completed}/${jobs.length}] ${label}: ${result.error}`);
    }
    return { ...result, label };
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;

  console.log("\n─── CAMPAIGN SUMMARY ─────────────────────────────");
  console.log(`  elapsed:   ${elapsed}s`);
  console.log(`  completed: ${ok}/${jobs.length}`);
  if (fail > 0) {
    console.log(`  failures:  ${fail}`);
    for (const r of results) {
      if (!r.ok) console.log(`    ✕ ${r.label}: ${r.error}`);
    }
  }
  console.log("──────────────────────────────────────────────────\n");

  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Campaign failed:", err);
  process.exit(1);
});
