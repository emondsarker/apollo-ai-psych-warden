import Link from "next/link";
import type { Autopsy } from "@/lib/types";
import { SEVERITY_LABEL } from "@/lib/types";
import { SeverityFlag } from "@/components/SeverityFlag";
import { Stamp } from "@/components/Stamp";

type Props = {
  autopsy: Autopsy;
};

export function CaseHeader({ autopsy }: Props) {
  const sev = autopsy.judgement.overallSeverity;
  const reviewed = autopsy.correction?.criticApproved;

  return (
    <header
      className="resp-case-header"
      style={{
        marginBottom: 56,
        paddingBottom: 28,
        borderBottom: "1px solid var(--ink-display)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 32,
        alignItems: "end",
      }}
    >
      {/* Casefile facts grid */}
      <dl
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-quiet)",
          margin: 0,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto 1fr",
          rowGap: 8,
          columnGap: 16,
          maxWidth: 720,
        }}
      >
        <Field label="Case №">
          <span style={{ color: "var(--stamp)", fontWeight: 600 }}>
            {autopsy.caseNumber}
          </span>
        </Field>
        <Field label="Filed">{formatDate(autopsy.date)}</Field>

        <Field label="Examiner">Opus 4.7</Field>
        <Field label="Reviewed">
          {reviewed ? (
            <span style={{ color: "var(--jade)", fontWeight: 600 }}>
              Critic-approved
            </span>
          ) : (
            "Pending"
          )}
        </Field>

        <Field label="Target">{autopsy.targetDisplayName}</Field>
        <Field label="Persona">
          {autopsy.personaDisplayName}{" "}
          <span style={{ color: "var(--ink-faint)" }}>
            ({autopsy.personaCode})
          </span>
        </Field>

        <Field label="Status">
          <span
            style={{
              color: `var(--sev-${sev})`,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {SEVERITY_LABEL[sev]}
          </span>
        </Field>
        <Field label="Turns">{autopsy.totalTurns}</Field>
      </dl>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          {reviewed ? (
            <Stamp tone="jade" rotate={-5}>Peer Reviewed</Stamp>
          ) : (
            <Stamp tone="quiet" rotate={-3}>In Review</Stamp>
          )}
          <Stamp rotate={4}>
            Sev. {sev}
          </Stamp>
        </div>
        <SeverityFlag
          level={sev}
          size="lg"
          caption={
            <span style={{ color: "var(--ink-quiet)" }}>
              Severity {sev} of 4
            </span>
          }
        />
        <Link
          href={`/cases/${autopsy.id}/replay`}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--paper)",
            background: "var(--ink-display)",
            border: "1px solid var(--ink-display)",
            padding: "9px 14px",
            textDecoration: "none",
            borderRadius: 2,
          }}
        >
          ▸ Step through
        </Link>
      </div>
    </header>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
          fontWeight: 500,
          paddingTop: 1,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, color: "var(--ink-display)", fontSize: 13 }}>
        {children}
      </dd>
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}
