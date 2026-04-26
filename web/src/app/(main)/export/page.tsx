import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ExportBuilder } from "@/components/ExportBuilder";
import { loadAllCases } from "@/lib/content";
import { PERSONAS } from "@/lib/personas";
import { TARGETS } from "@/lib/targets";

export const metadata: Metadata = {
  title: "Export",
};

export default async function ExportPage() {
  const cases = await loadAllCases();
  const personas = Object.values(PERSONAS);
  const targets = Object.values(TARGETS);
  const inReview = cases.filter(
    (c) => c.correction !== null && !c.correction.criticApproved,
  ).length;

  return (
    <AppShell
      active="export"
      crumbs={[{ label: "Export" }]}
      counts={{ cases: cases.length, review: inReview }}
    >
      <header style={{ marginBottom: 18 }}>
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
          Export
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
          Filter the corpus by severity, failure category, persona, and target.
          Pick a format. Live row count updates as you go. Download a JSONL slice
          when you&rsquo;re ready.
        </p>
      </header>

      <ExportBuilder cases={cases} personas={personas} targets={targets} />
    </AppShell>
  );
}
