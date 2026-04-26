/**
 * Smoke-test new target bot configs against Haiku.
 *
 * For each target, send two adversarial patient openings:
 *   1. Elena's persecutory-delusion probe (tests delusion-reinforcement)
 *   2. Daniel's oblique-SI probe (tests missed-escalation / sycophantic-si-validation)
 *
 * Print the target's response so we can eyeball whether the prompt produces
 * the failure pattern it was designed around. Cheap (~1 Haiku call per combo).
 *
 * Usage: npx tsx scripts/test-targets-haiku.ts
 */

import { spawnSync } from "node:child_process";
import { TARGETS } from "../src/lib/targets";
import { ELENA, DANIEL } from "../src/lib/personas";

const TARGETS_TO_TEST = [
  "crisis-line-lite",
  "friend-persona",
  "cbt-coach",
  "brevity-optimized",
  "unconstrained-llm",
];

const PROBES = [
  {
    label: "delusion-probe (Elena)",
    patientOpening: ELENA.openingMessage,
    expectedFailureMode: "delusion-reinforcement / cognitive-bypass",
  },
  {
    label: "SI-probe (Daniel)",
    patientOpening: DANIEL.openingMessage,
    expectedFailureMode: "missed-escalation / sycophantic-si-validation",
  },
];

function callHaiku(systemPrompt: string, userMessage: string): { text: string; elapsed: string } {
  const t0 = Date.now();
  const proc = spawnSync(
    "claude",
    ["-p", "--model", "haiku", "--system-prompt", systemPrompt, userMessage],
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, timeout: 90_000 }
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (proc.error) throw new Error(`spawn: ${proc.error.message}`);
  if (proc.status !== 0) throw new Error(`claude exited ${proc.status}: ${proc.stderr}`);
  return { text: proc.stdout.trim(), elapsed };
}

async function main() {
  console.log("▸ Smoke-testing new target bots against adversarial openings\n");

  for (const targetId of TARGETS_TO_TEST) {
    const target = TARGETS[targetId];
    if (!target) {
      console.error(`  ✕ unknown target: ${targetId}`);
      continue;
    }

    console.log(`═══ ${target.displayName} (${targetId}) ═══`);

    for (const probe of PROBES) {
      console.log(`\n  ▸ ${probe.label}`);
      console.log(`    expected failure: ${probe.expectedFailureMode}`);
      console.log(`    patient: "${probe.patientOpening.slice(0, 100)}${probe.patientOpening.length > 100 ? "…" : ""}"`);

      try {
        const { text, elapsed } = callHaiku(target.systemPrompt, probe.patientOpening);
        const preview = text.length > 500 ? text.slice(0, 500) + "…" : text;
        console.log(`    target (${elapsed}s, ${text.length} chars):`);
        for (const line of preview.split("\n")) {
          console.log(`      ${line}`);
        }
      } catch (err) {
        console.log(`    ✕ error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log("");
  }

  console.log("\n✓ Smoke test complete. Review responses above: each target should lean into its")
  console.log("  intended failure mode against at least one of the two probes.\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
