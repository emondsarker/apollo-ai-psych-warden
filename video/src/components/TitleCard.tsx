import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Centered title card — paper-light. line1 is large display serif in
 * ink-display navy; line2 is a small mono caption in stamp red. Used for
 * the audit-gap bridge and the closing motto.
 */
export const TitleCard: React.FC<{ line1: string; line2?: string }> = ({
  line1,
  line2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 30,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 1100, padding: "0 80px" }}>
        <div
          style={{
            fontFamily:
              '"Source Serif 4", "Iowan Old Style", Georgia, serif',
            fontSize: 96,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.018em",
            color: "oklch(12% 0.020 250)",
            opacity: reveal,
            transform: `translateY(${(1 - reveal) * 18}px)`,
          }}
        >
          {line1}
        </div>
        {line2 && (
          <div
            style={{
              marginTop: 28,
              fontFamily:
                'ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace',
              fontSize: 22,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "oklch(52% 0.22 16)",
              opacity: reveal,
            }}
          >
            {line2}
          </div>
        )}
      </div>
    </div>
  );
};
