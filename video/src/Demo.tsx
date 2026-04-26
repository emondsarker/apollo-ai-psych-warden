import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { FPS, SEGMENTS, type Segment } from "./segments";
import { TitleCard } from "./components/TitleCard";
import { Caption } from "./components/Caption";
import { ArticleScreen } from "./components/ArticleScreen";
import { AppScreen } from "./components/AppScreen";
import { ScreenPair } from "./components/ScreenPair";
import { ProductScene } from "./components/ProductScene";
import { Vignette } from "./components/Vignette";
import { VoiceTrack } from "./components/VoiceTrack";

/**
 * The whole video lives on a paper-white workbench surface. Each segment
 * renders its visual layer, optional caption, and its own voiceover audio
 * inside a Sequence positioned at its start frame.
 */
export const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BACKGROUND }}>
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
      {segment.visual.kind === "article" && (
        <ArticleScreen
          src={staticFile(segment.visual.src)}
          source={segment.visual.source}
          date={segment.visual.date}
        />
      )}
      {segment.visual.kind === "screen" && (
        <AppScreen src={staticFile(segment.visual.src)} />
      )}
      {segment.visual.kind === "screen-pair" && (
        <ScreenPair
          srcA={staticFile(segment.visual.srcA)}
          srcB={staticFile(segment.visual.srcB)}
        />
      )}
      {segment.visual.kind === "scene" && (
        <ProductScene scene={segment.visual.scene} />
      )}
      {segment.caption && <Caption text={segment.caption} />}
      {segment.text.trim().length > 0 && <VoiceTrack id={segment.id} />}
    </AbsoluteFill>
  );
};

// Workbench paper — matches the app's --app-bg + a faint warm wash so the
// whole frame doesn't read as flat white.
const BACKGROUND =
  "radial-gradient(ellipse at 50% 0%, oklch(99% 0.004 60) 0%, oklch(97% 0.005 60) 60%, oklch(95% 0.008 60) 100%)";
