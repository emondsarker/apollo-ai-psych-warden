import type { SeverityLevel } from "@/lib/types";
import { SEVERITY_LABEL, SEVERITY_GLYPH } from "@/lib/types";

type Props = {
  severity: SeverityLevel;
  variant?: "pill" | "inline";
};

export function StatusStamp({ severity, variant = "pill" }: Props) {
  const isSevere = severity >= 3;
  const color = isSevere ? "var(--oxblood)" : severity === 2 ? "var(--ink-2)" : "var(--margin)";

  if (variant === "inline") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color,
        }}
      >
        {SEVERITY_GLYPH[severity]} {SEVERITY_LABEL[severity]}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        border: "1px solid currentColor",
        borderRadius: 2,
        fontFamily: "var(--font-serif)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        background: isSevere ? "var(--bone-2)" : "transparent",
      }}
    >
      {SEVERITY_GLYPH[severity]} {SEVERITY_LABEL[severity]}
    </span>
  );
}
