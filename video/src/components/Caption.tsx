import { interpolate, useCurrentFrame } from "remotion";

/**
 * Lower-third caption — ink-quiet mono on a paper-shade chip with the
 * stamp-red dot. Sits on the workbench surface; matches the app's eyebrow
 * style on a darker chip so the type pops without going inverse.
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
        left: 0,
        right: 0,
        bottom: 56,
        opacity,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 18px",
          background: "oklch(100% 0 0)",
          border: "1px solid oklch(82% 0.008 250)",
          borderRadius: 999,
          boxShadow:
            "0 1px 2px oklch(20% 0.02 250 / 0.06), 0 6px 22px oklch(20% 0.02 250 / 0.08)",
          fontFamily: 'ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace',
          fontSize: 18,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "oklch(38% 0.015 250)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: "oklch(52% 0.22 16)",
            boxShadow: "0 0 10px oklch(52% 0.22 16 / 0.45)",
          }}
        />
        <span>{text}</span>
      </div>
    </div>
  );
};
