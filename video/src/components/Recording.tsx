import { OffthreadVideo, Img, Sequence } from "remotion";

/**
 * Plays a screen-recording clip as the segment's visual. If the file
 * doesn't exist (or for the placeholder phase before recordings are
 * captured), falls back to a tasteful placeholder — segments still
 * render in Remotion Studio so the script and voiceover can be
 * developed before any screen-record is taken.
 */
export const Recording: React.FC<{
  src: string;
  kind: "recording" | "still";
  offsetSeconds?: number;
}> = ({ src, kind, offsetSeconds = 0 }) => {
  if (kind === "still") {
    return (
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.95,
        }}
      />
    );
  }
  return (
    <Sequence from={0}>
      <OffthreadVideo
        src={src}
        startFrom={Math.round(offsetSeconds * 30)}
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </Sequence>
  );
};
