import type { ConversationTurn, TurnAnnotation } from "@/lib/types";
import { StatusStamp } from "./StatusStamp";

type Props = {
  patientTurn?: ConversationTurn;
  targetTurn?: ConversationTurn;
  turnNumber: number;
  label?: string;
  annotation?: TurnAnnotation;
  personaName?: string;
};

/**
 * One transcript exchange. Patient (human-coded simulated voice) appears in
 * editorial italic serif; target (AI output under analysis) prints in
 * dot-matrix to make the source register visible at a glance.
 */
export function TranscriptTurnBlock({
  patientTurn,
  targetTurn,
  turnNumber,
  label,
  annotation,
  personaName,
}: Props) {
  const isFailure = label?.toLowerCase().includes("failure");
  return (
    <div
      className="resp-turn"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 620px) 60px minmax(0, 240px)",
        marginBottom: 36,
        alignItems: "start",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: isFailure ? "var(--stamp)" : "var(--ink-quiet)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: isFailure ? 600 : 500,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `1px ${isFailure ? "solid" : "dotted"} ${
              isFailure ? "var(--stamp)" : "var(--rule)"
            }`,
          }}
        >
          <span>{label ?? `Turn ${turnNumber}`}</span>
          {annotation && annotation.severity >= 1 && (
            <StatusStamp severity={annotation.severity} />
          )}
        </div>

        {patientTurn && (
          <div style={{ marginBottom: targetTurn ? 16 : 0 }}>
            <Speaker tone="human">
              ¶ Patient{personaName ? ` · ${personaName}` : ""}
            </Speaker>
            <PatientLine>{patientTurn.content}</PatientLine>
          </div>
        )}

        {targetTurn && <AIOutput content={targetTurn.content} />}
      </div>

      {annotation && (
        <aside
          style={{
            gridColumn: 3,
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.45,
            color: "var(--ink-quiet)",
            fontStyle: "italic",
            paddingTop: 32,
            paddingLeft: 20,
            borderLeft: "1px solid var(--rule)",
          }}
        >
          {annotation.annotation}
          {annotation.citation && (
            <span
              style={{
                display: "block",
                marginTop: 10,
                fontSize: 11,
                color: "var(--stamp)",
                fontStyle: "normal",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
              }}
            >
              ¶ {annotation.citation}
            </span>
          )}
        </aside>
      )}
    </div>
  );
}

function Speaker({
  tone,
  children,
}: {
  tone: "human" | "ai";
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: tone === "ai" ? "var(--stamp)" : "var(--ink-quiet)",
        marginBottom: 6,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

function PatientLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 17,
        lineHeight: 1.55,
        color: "var(--ink)",
        fontStyle: "italic",
        whiteSpace: "pre-wrap",
        paddingLeft: 16,
        borderLeft: "2px solid var(--rule-strong)",
      }}
    >
      {children}
    </div>
  );
}

function AIOutput({ content }: { content: string }) {
  return (
    <div>
      <Speaker tone="ai">▸ Subject model output</Speaker>
      <div
        className="matrix-block"
        style={{
          marginLeft: 16,
        }}
      >
        {content}
      </div>
    </div>
  );
}
