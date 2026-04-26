import type { Peer } from "@/lib/peers";

/**
 * 4×4 dot-matrix avatar — each peer's name hashes to a deterministic
 * filled/hollow pattern. Matches the dot-matrix print register the rest of
 * the console uses for AI-generated text. Filled dots use the peer's hue;
 * hollow dots are an outlined ring of the same color.
 */
export function PeerAvatar({
  peer,
  size = 32,
  ring = false,
}: {
  peer: Peer;
  size?: number;
  ring?: boolean;
}) {
  const bits = patternFor(peer.name);
  const fill = `oklch(48% 0.20 ${peer.hue})`;
  const hollow = `oklch(70% 0.10 ${peer.hue} / 0.55)`;
  const dotSize = Math.max(2, Math.round(size * 0.14));
  const gap = Math.max(1, Math.round(size * 0.05));
  const pad = Math.round((size - dotSize * 4 - gap * 3) / 2);

  return (
    <span
      aria-hidden
      title={peer.name}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.2),
        display: "inline-grid",
        gridTemplateColumns: `repeat(4, ${dotSize}px)`,
        gridTemplateRows: `repeat(4, ${dotSize}px)`,
        gap,
        padding: pad,
        background: `oklch(96% 0.012 ${peer.hue})`,
        border: `1px solid oklch(80% 0.08 ${peer.hue} / 0.7)`,
        boxShadow: ring
          ? `0 0 0 2px var(--app-surface), 0 0 0 3px oklch(50% 0.18 ${peer.hue} / 0.55)`
          : "none",
        flex: "none",
        boxSizing: "content-box",
      }}
    >
      {bits.map((on, i) => (
        <span
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: on ? fill : "transparent",
            boxShadow: on ? "none" : `inset 0 0 0 1.4px ${hollow}`,
          }}
        />
      ))}
    </span>
  );
}

// djb2-style hash → 16 bits, one per dot in a 4×4 grid.
function patternFor(seed: string): boolean[] {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  let bits = (h >>> 0) & 0xffff;

  // Aesthetic: aim for 5–11 filled dots. If population is too lopsided,
  // XOR with a checker pattern to bring it back into range.
  const popcount = countBits(bits);
  if (popcount <= 3 || popcount >= 13) {
    bits ^= 0b0101_1010_0101_1010;
  }
  if (bits === 0 || bits === 0xffff) bits ^= 0b1010_0101_1010_0101;

  const out: boolean[] = [];
  for (let i = 0; i < 16; i++) out.push(((bits >>> i) & 1) === 1);
  return out;
}

function countBits(n: number): number {
  let c = 0;
  for (let i = 0; i < 16; i++) if ((n >>> i) & 1) c++;
  return c;
}
