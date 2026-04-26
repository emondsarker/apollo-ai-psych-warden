import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { BulkTriageWorkbench } from "@/components/BulkTriageWorkbench";
import { PEERS } from "@/lib/peers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulk triage",
};

export default function BulkTriagePage() {
  return (
    <AppShell
      crumbs={[
        { label: "Triage", href: "/triage" },
        { label: "Bulk" },
      ]}
    >
      <BulkTriageWorkbench peers={PEERS} />
    </AppShell>
  );
}
