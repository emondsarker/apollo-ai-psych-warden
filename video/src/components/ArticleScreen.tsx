import { Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Displays one of the news article screenshots — centered, with a slow
 * Ken Burns zoom and a fade-in. Sits on the workbench paper; the ribbon
 * underneath names the source type and date in mono so the audience reads
 * it as evidence, not decoration.
 *
 * Drop the screenshot at primum/video/public/articles/article-N.png.
 */
export const ArticleScreen: React.FC<{
  src: string;
  source?: string;
  date?: string;
}> = ({ src, source, date }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });
  const enter = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
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
          width: "78%",
          maxWidth: 1500,
          aspectRatio: "16 / 10",
          opacity: enter * exit,
          transform: `scale(${zoom})`,
          borderRadius: 14,
          overflow: "hidden",
          background: "oklch(100% 0 0)",
          // Paper card with a faint shadow + a thin stamp-red top rule —
          // small visual nod to the app's editorial chrome.
          boxShadow:
            "0 1px 0 oklch(85% 0.008 250), 0 18px 44px oklch(20% 0.02 250 / 0.10), 0 4px 14px oklch(20% 0.02 250 / 0.06)",
          borderTop: "3px solid oklch(52% 0.22 16)",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      {(source || date) && (
        <div
          style={{
            position: "absolute",
            bottom: 64,
            left: "11%",
            right: "11%",
            display: "flex",
            justifyContent: "space-between",
            opacity: enter,
            fontFamily: 'ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace',
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "oklch(45% 0.012 250)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: "oklch(52% 0.22 16)",
                boxShadow: "0 0 10px oklch(52% 0.22 16 / 0.45)",
              }}
            />
            {source ?? ""}
          </span>
          <span>{date ?? ""}</span>
        </div>
      )}
    </div>
  );
};
