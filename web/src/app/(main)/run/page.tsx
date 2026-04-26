import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RunWorkbench } from "@/components/RunWorkbench";
import { PERSONAS } from "@/lib/personas";
import { TARGETS } from "@/lib/targets";
import { loadAllCases } from "@/lib/content";

export const metadata: Metadata = {
  title: "Convene Apollo",
};

export default async function RunPage() {
  const personas = Object.values(PERSONAS);
  const targets = Object.values(TARGETS);
  const cases = await loadAllCases();
  const inReview = cases.filter(
    (c) => c.correction !== null && !c.correction.criticApproved,
  ).length;

  return (
    <AppShell
      active="run"
      crumbs={[{ label: "Convene Apollo" }]}
      counts={{ cases: cases.length, review: inReview }}
    >
      <header style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 6,
          }}
        >
          ΑΠΟΛΛΩΝ · consultation
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: "0 0 4px",
          }}
        >
          Convene Apollo.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-3)",
            margin: 0,
            maxWidth: "70ch",
            lineHeight: 1.5,
          }}
        >
          Pick a vulnerable patient persona and a deployed bot system prompt.
          Apollo simulates the encounter, audits every turn against DSM-5-TR /
          C-SSRS / MITI 4.2.1, drafts a correction, and submits it to a peer
          critic. Approved verdicts land in the corpus as contrastive training
          pairs.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          gap: 18,
          marginBottom: 18,
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--text-3)",
          letterSpacing: "0.04em",
        }}
      >
        <span>
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{personas.length}</span> personas
        </span>
        <span>
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{targets.length}</span> targets
        </span>
        <span>
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
            {personas.length * targets.length}
          </span>{" "}
          possible encounters
        </span>
      </div>

      <RunWorkbench personas={personas} targets={targets} />
    </AppShell>
  );
}
