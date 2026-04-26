import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { FPS, SEGMENTS, type Segment } from "./segments";
import { TitleCard } from "./components/TitleCard";
import { Caption } from "./components/Caption";
import { Recording } from "./components/Recording";
import { Vignette } from "./components/Vignette";
import { VoiceTrack } from "./components/VoiceTrack";

export const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BACKGROUND }}>
      {/* The whole video lives on a single dark canvas. Each segment renders
          its visual layer, optional caption, and its own voiceover audio
          inside a Sequence positioned at its start frame. */}
      {SEGMENTS.map((seg) => (
        <Sequence
          key={seg.id}
          from={Math.round(seg.start * FPS)}
          durationInFrames={Math.round(seg.duration * FPS)}
          name={seg.id}
        >
          <SegmentLayer segment={seg} />
        </Sequence>
      ))}
      <Vignette />
    </AbsoluteFill>
  );
};

const SegmentLayer: React.FC<{ segment: Segment }> = ({ segment }) => {
  return (
    <AbsoluteFill>
      {segment.visual.kind === "title" && (
        <TitleCard line1={segment.visual.line1} line2={segment.visual.line2} />
      )}
      {segment.visual.kind === "callout" && (
        <TitleCard line1={segment.visual.text} />
      )}
      {(segment.visual.kind === "recording" || segment.visual.kind === "still") && (
        <Recording
          src={staticFile(segment.visual.src)}
          kind={segment.visual.kind}
          offsetSeconds={
            segment.visual.kind === "recording" ? segment.visual.offsetSeconds : 0
          }
        />
      )}
      {segment.caption && <Caption text={segment.caption} />}
      <VoiceTrack id={segment.id} />
    </AbsoluteFill>
  );
};

const BACKGROUND =
  "radial-gradient(ellipse at 30% 20%, oklch(20% 0.025 250) 0%, oklch(8% 0.02 250) 70%)";
