/**
 * Soft warm vignette — tints the corners just enough that the eye settles
 * toward the center without making the page feel grey. Matches the app's
 * paper-shade rule color at low alpha.
 */
export const Vignette: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at center, transparent 60%, oklch(72% 0.012 60 / 0.10) 100%)",
      }}
    />
  );
};
