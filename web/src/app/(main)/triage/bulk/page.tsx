import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { BulkTriageWorkbench } from "@/components/BulkTriageWorkbench";
import { PEERS } from "@/lib/peers";
import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulk triage",
};

export default async function BulkTriagePage() {
  const me = await getCurrentUser();
  return (
    <AppShell
      crumbs={[
        { label: "Triage", href: "/triage" },
        { label: "Bulk" },
      ]}
    >
      <BulkTriageWorkbench peers={PEERS} currentUserId={me.id} />
    </AppShell>
  );
}
