import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { TriageWorkbench } from "@/components/TriageWorkbench";

export const metadata: Metadata = {
  title: "Triage",
};

export default function TriagePage() {
  return (
    <AppShell active="triage" crumbs={[{ label: "Triage" }]}>
      <header style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 4,
          }}
        >
          ΑΠΟΛΛΩΝ · triage
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: 0,
          }}
        >
          Triage a thread.
        </h1>
      </header>
      <TriageWorkbench />
    </AppShell>
  );
}
