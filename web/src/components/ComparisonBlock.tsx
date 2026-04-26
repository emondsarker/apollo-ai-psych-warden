type Props = {
  originalContent: string;
  correctedContent: string;
  originalLabel?: string;
  correctedLabel?: string;
};

/**
 * Two-up rejected/chosen comparison.
 *
 * Left ("Original") is what the AI actually said — the failure under analysis.
 * Renders in dot-matrix to flag it as raw machine output.
 *
 * Right ("Corrected") is the peer-reviewed clinical replacement, presented as
 * editorial copy in serif. The visual contrast is the point.
 */
export function ComparisonBlock({
  originalContent,
  correctedContent,
  originalLabel = "Subject output · Severe",
  correctedLabel = "Critic-approved correction",
}: Props) {
  return (
    <div
      className="resp-compare"
      style={{
        maxWidth: 720,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        margin: "32px 0 48px 0",
      }}
    >
      {/* Original — raw AI output */}
      <div>
        <Header tone="stamp">⚠ {originalLabel}</Header>
        <div
          className="matrix-block"
          style={{ minHeight: "100%" }}
        >
          {originalContent}
        </div>
      </div>

      {/* Corrected — peer-reviewed editorial */}
      <div>
        <Header tone="jade">✓ {correctedLabel}</Header>
        <div
          style={{
            padding: "20px 22px",
            border: "1px solid var(--jade)",
            borderLeft: "3px solid var(--jade)",
            background: "var(--jade-bg)",
            fontFamily: "var(--font-serif)",
            fontSize: 15.5,
            lineHeight: 1.55,
            color: "var(--ink-display)",
            whiteSpace: "pre-wrap",
            minHeight: "100%",
          }}
        >
          {correctedContent}
        </div>
      </div>
    </div>
  );
}

function Header({
  tone,
  children,
}: {
  tone: "stamp" | "jade";
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: tone === "stamp" ? "var(--stamp)" : "var(--jade)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
