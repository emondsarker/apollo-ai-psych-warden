import { SEVERITY_LABEL, type SeverityLevel } from "@/lib/types";

/**
 * Severity readout rendered as a 5×3 dot grid: each "lit" column shows three
 * filled dots in the severity color. Emulates a dot-matrix LCD readout.
 *
 * The accompanying caption is set in the matrix font so the whole thing reads
 * as a single instrument display.
 */
export function SeverityFlag({
  level,
  caption,
  size = "md",
}: {
  level: SeverityLevel;
  caption?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const dot = size === "sm" ? 4 : size === "lg" ? 9 : 6;
  const gap = size === "sm" ? 2 : size === "lg" ? 4 : 3;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <div
        className="dot-matrix-flag"
        aria-label={`Severity ${SEVERITY_LABEL[level]}`}
        style={{
          color: `var(--sev-${level})`,
          gap: gap + 2,
        }}
      >
        {[0, 1, 2, 3, 4].map((col) => (
          <div className="dm-col" key={col} style={{ gap }}>
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                className="dm-dot"
                data-on={col <= level ? "true" : "false"}
                style={{ width: dot, height: dot }}
              />
            ))}
          </div>
        ))}
      </div>
      {caption !== undefined ? (
        <div
          style={{
            fontFamily: "var(--font-matrix)",
            fontSize: size === "lg" ? 16 : 14,
            letterSpacing: "0.04em",
            color: "var(--ink-quiet)",
            lineHeight: 1,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}
