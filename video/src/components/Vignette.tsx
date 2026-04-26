/**
 * Soft vignette over everything — pulls focus into the center, gives the
 * footage a little of the dot-matrix-print vibe of the app itself.
 */
export const Vignette: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at center, transparent 55%, oklch(8% 0.02 250 / 0.55) 100%)",
      }}
    />
  );
};
