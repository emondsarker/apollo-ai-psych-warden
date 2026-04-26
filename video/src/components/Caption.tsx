import { interpolate, useCurrentFrame } from "remotion";

/**
 * Lower-third caption — paper-white mono on a thin pink-red rule.
 * Fades in over the first 12 frames, holds, and fades out over the last 8.
 */
export const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 24], [0, 1, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        bottom: 60,
        right: 60,
        opacity,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: 'ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace',
        fontSize: 24,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#f7f5f0",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: "oklch(70% 0.20 16)",
          boxShadow: "0 0 18px oklch(70% 0.20 16 / 0.6)",
        }}
      />
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
};
