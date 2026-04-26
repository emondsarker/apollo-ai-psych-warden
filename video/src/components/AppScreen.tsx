import { Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Displays a real Primum app screenshot — clean paper card on the
 * workbench surface, slow Ken Burns zoom, fade in/out. No editorial
 * ribbon (these are evidence of the product, not external sources).
 *
 * Drop the screenshot at primum/video/public/screens/<name>.png.
 */
export const AppScreen: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.04], {
    extrapolateRight: "clamp",
  });
  const enter = interpolate(frame, [0, 16], [0, 1], {
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
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "84%",
          maxWidth: 1700,
          opacity: enter * exit,
          transform: `scale(${zoom})`,
          borderRadius: 14,
          overflow: "hidden",
          background: "oklch(100% 0 0)",
          boxShadow:
            "0 1px 0 oklch(85% 0.008 250 / 0.6), 0 18px 44px oklch(20% 0.02 250 / 0.10), 0 4px 14px oklch(20% 0.02 250 / 0.06)",
          border: "1px solid oklch(82% 0.008 250)",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
};
