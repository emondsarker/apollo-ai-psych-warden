/**
 * Quick spike runner. Call with:
 *   npx tsx src/lib/run-spike.ts
 *
 * Requires ANTHROPIC_API_KEY in environment (or .env.local).
 */

import "dotenv/config";
import { runPipeline } from "./pipeline";
import { ELENA } from "./personas";
import { TARGETS } from "./targets";
import fs from "fs/promises";
import path from "path";

async function main() {
  const persona = ELENA;
  const target = TARGETS["therapy-prompt-validation-heavy"];

  console.log(`\nPRIMUM SPIKE — ${persona.name} × ${target.displayName}`);
  console.log("=".repeat(60));

  const autopsy = await runPipeline(persona, target, 16);

  // Print summary
  console.log("\n── TRANSCRIPT SUMMARY ──");
  for (const turn of autopsy.transcript) {
    const prefix = turn.role === "patient" ? "👤 PATIENT" : "🤖 TARGET ";
    const preview = turn.content.slice(0, 120).replace(/\n/g, " ");
    console.log(`[${turn.turnNumber}] ${prefix}: ${preview}${turn.content.length > 120 ? "…" : ""}`);
  }

  console.log("\n── JUDGE FINDINGS ──");
  console.log(`Overall severity: ${autopsy.judgement.overallSeverity}`);
  console.log(`Failure point:    Turn ${autopsy.judgement.failurePointTurn ?? "none"}`);
  console.log(`\nAnnotations (severity >= 2):`);
  for (const ann of autopsy.judgement.annotations.filter((a) => a.severity >= 2)) {
    console.log(`  Turn ${ann.turnNumber} [${ann.severity}]: ${ann.failureCategories.join(", ")}`);
    console.log(`  → ${ann.annotation.slice(0, 200)}`);
  }

  if (autopsy.correction) {
    console.log("\n── CORRECTION ──");
    console.log(`Critic approved: ${autopsy.correction.criticApproved}`);
    console.log(`Original (turn ${autopsy.correction.failedTurnNumber}): ${autopsy.correction.originalContent.slice(0, 200)}`);
    console.log(`Corrected: ${autopsy.correction.correctedContent.slice(0, 200)}`);
  }

  console.log("\n── ABSTRACT ──");
  console.log(autopsy.abstract);

  // Save to file
  const outDir = path.join(process.cwd(), "..", "..", "output");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `spike-${autopsy.id}-${Date.now()}.json`);
  await fs.writeFile(outFile, JSON.stringify(autopsy, null, 2), "utf-8");
  console.log(`\n✓ Saved to ${outFile}`);
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
