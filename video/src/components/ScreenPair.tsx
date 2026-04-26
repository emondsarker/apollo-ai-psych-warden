import { Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Two app screenshots side-by-side on the workbench paper. Both fade in
 * together; a tiny stagger makes the right card feel like a follow-up
 * rather than a duplicate. Used for the "organize people" beat where
 * the personal inbox and the bench-wide queue read as a pair.
 */
export const ScreenPair: React.FC<{ srcA: string; srcB: string }> = ({
  srcA,
  srcB,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const enterA = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
  });
  const enterB = interpolate(frame, [8, 24], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0.85],
    { extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "0 60px",
      }}
    >
      <Card opacity={enterA * exit}>
        <Img src={srcA} style={IMG_STYLE} />
      </Card>
      <Card opacity={enterB * exit}>
        <Img src={srcB} style={IMG_STYLE} />
      </Card>
    </div>
  );
};

const IMG_STYLE: React.CSSProperties = {
  width: "100%",
  height: "auto",
  objectFit: "contain",
  display: "block",
};

const Card: React.FC<{ opacity: number; children: React.ReactNode }> = ({
  opacity,
  children,
}) => (
  <div
    style={{
      flex: 1,
      maxWidth: 880,
      opacity,
      borderRadius: 12,
      overflow: "hidden",
      background: "oklch(100% 0 0)",
      boxShadow:
        "0 1px 0 oklch(85% 0.008 250 / 0.6), 0 14px 38px oklch(20% 0.02 250 / 0.10), 0 4px 12px oklch(20% 0.02 250 / 0.06)",
      border: "1px solid oklch(82% 0.008 250)",
    }}
  >
    {children}
  </div>
);
