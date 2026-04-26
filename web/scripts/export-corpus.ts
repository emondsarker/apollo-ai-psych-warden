/**
 * Export the current autopsy corpus into three alignment-training formats.
 *
 * Reads every file under content/cases/*.json, extracts contrastive pairs
 * from critic-approved corrections, writes them to corpus/:
 *
 *   corpus/dpo.jsonl              — TRL DPO format
 *   corpus/hh-rlhf.jsonl          — Anthropic HH-RLHF format
 *   corpus/conversational.jsonl   — messages-array format for chat-template trainers
 *   corpus/stats.json             — counts by severity and category
 *   corpus/README.md              — schema documentation
 *
 * Usage: npx tsx scripts/export-corpus.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadAllCases } from "../src/lib/content";
import { buildCorpus, toJsonl } from "../src/lib/corpus-export";

const CORPUS_DIR = path.join(process.cwd(), "corpus");

const README = `# Primum Corpus

Alignment training data derived from Primum's clinical autopsies of conversational
AI in mental-health contexts. Each row is a contrastive pair: the target bot's
actual (clinically unsound) response, and a peer-reviewed corrected response.

Every pair has passed the Judge (clinical failure identification), Corrector
(replacement drafted), and Critic (independent peer review) stages of the
pipeline. Non-approved corrections are dropped.

## Files

| File | Format | Consumer |
|---|---|---|
| \`dpo.jsonl\` | \`{prompt, chosen, rejected, metadata}\` | TRL DPOTrainer |
| \`hh-rlhf.jsonl\` | \`{chosen, rejected, metadata}\` | Anthropic HH-RLHF |
| \`conversational.jsonl\` | \`{messages_chosen, messages_rejected, metadata}\` | Chat-template trainers |
| \`stats.json\` | Aggregate counts | QA / dataset cards |

## Metadata schema

Each row carries:

- \`caseId\`, \`caseNumber\` — back-link to the full autopsy
- \`personaId\`, \`personaCode\` — simulated patient identity
- \`targetId\`, \`targetDisplayName\` — target bot
- \`failurePointTurn\` — turn number at which the failure was identified
- \`failureCategories\` — e.g. \`["delusion-reinforcement"]\`
- \`severity\` — 0 (adequate) to 4 (critical)
- \`citation\` — DSM-5-TR / C-SSRS / MITI / APA reference where applicable
- \`correctionReasoning\` — Corrector's rationale
- \`criticApproved\`, \`criticNotes\` — peer review

## Filtering recipes

\`\`\`python
import json

# Only SI-related pairs
si = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
      if "sycophantic-si-validation" in r["metadata"]["failureCategories"]
      or "missed-escalation" in r["metadata"]["failureCategories"]]

# Only severe + critical
hard = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
        if r["metadata"]["severity"] >= 3]
\`\`\`

## Regeneration

\`\`\`
npx tsx scripts/export-corpus.ts
\`\`\`
`;

async function main() {
  console.log("▸ Loading cases from content/cases/");
  const cases = await loadAllCases();
  console.log(`  ↳ ${cases.length} cases`);

  console.log("▸ Building corpus");
  const { dpo, hh, conv, stats } = buildCorpus(cases);

  await fs.mkdir(CORPUS_DIR, { recursive: true });

  const dpoPath = path.join(CORPUS_DIR, "dpo.jsonl");
  const hhPath = path.join(CORPUS_DIR, "hh-rlhf.jsonl");
  const convPath = path.join(CORPUS_DIR, "conversational.jsonl");
  const statsPath = path.join(CORPUS_DIR, "stats.json");
  const readmePath = path.join(CORPUS_DIR, "README.md");

  await Promise.all([
    fs.writeFile(dpoPath, toJsonl(dpo), "utf-8"),
    fs.writeFile(hhPath, toJsonl(hh), "utf-8"),
    fs.writeFile(convPath, toJsonl(conv), "utf-8"),
    fs.writeFile(statsPath, JSON.stringify(stats, null, 2) + "\n", "utf-8"),
    fs.writeFile(readmePath, README, "utf-8"),
  ]);

  console.log("\n─── EXPORT COMPLETE ──────────────────────────────");
  console.log(`  cases scanned:       ${stats.totalCases}`);
  console.log(`  pairs exported:      ${stats.exportedPairs}`);
  console.log(`  skipped (no failure point):   ${stats.skippedNoFailurePoint}`);
  console.log(`  skipped (no correction):      ${stats.skippedNoCorrection}`);
  console.log(`  skipped (critic rejected):    ${stats.skippedNotApproved}`);
  console.log(`  skipped (failed turn missing): ${stats.skippedNoFailedTurn}`);
  console.log("\n  by severity:");
  for (const [sev, n] of Object.entries(stats.bySeverity)) {
    console.log(`    ${sev}: ${n}`);
  }
  console.log("\n  by category:");
  for (const [cat, n] of Object.entries(stats.byCategory)) {
    console.log(`    ${cat.padEnd(30)} ${n}`);
  }
  console.log("──────────────────────────────────────────────────");
  console.log(`\n  ↳ ${dpoPath}`);
  console.log(`  ↳ ${hhPath}`);
  console.log(`  ↳ ${convPath}`);
  console.log(`  ↳ ${statsPath}`);
  console.log(`  ↳ ${readmePath}\n`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
