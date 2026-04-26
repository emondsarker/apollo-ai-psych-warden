import Link from "next/link";

/**
 * Dashboard's main grid — 2 × 6 stations the operator can step into.
 * Apollo lives in the sidebar; this is the launcher.
 *
 * Each station is a Link card with:
 *   - Glyph (small mono character — vt323 dot-matrix vibe)
 *   - Title (sans, semibold)
 *   - Description (serif italic)
 *   - Count badge top-right when there's something pending
 *   - Highlight ring when the station is the recommended next move
 */

export interface Station {
  href: string;
  title: string;
  description: string;
  glyph: string;
  count?: number;
  /** Render the count in accent color (something is *waiting* here). */
  urgent?: boolean;
  /** Recommended-next-action highlight. */
  recommended?: boolean;
}

export function StationGrid({ stations }: { stations: Station[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {stations.map((s) => (
        <StationCard key={s.href} station={s} />
      ))}
    </div>
  );
}

function StationCard({ station }: { station: Station }) {
  const accent = station.recommended
    ? "var(--accent)"
    : station.urgent && (station.count ?? 0) > 0
      ? "var(--warn)"
      : "var(--border)";
  return (
    <Link
      href={station.href}
      className="station-card"
      style={{
        position: "relative",
        display: "block",
        padding: "20px 22px",
        background: station.recommended ? "var(--accent-soft)" : "var(--app-surface)",
        border: `1px solid ${accent}`,
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
        boxShadow: station.recommended
          ? "0 6px 22px oklch(52% 0.22 16 / 0.18), 0 1px 3px oklch(20% 0.02 250 / 0.04)"
          : "0 1px 2px oklch(20% 0.02 250 / 0.04)",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-matrix)",
            fontSize: 28,
            lineHeight: 1,
            color: station.recommended ? "var(--accent)" : "var(--text-2)",
            letterSpacing: 0,
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            background: station.recommended ? "var(--app-surface)" : "var(--app-surface-2)",
            border: `1px solid ${station.recommended ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 8,
          }}
        >
          {station.glyph}
        </span>
        {typeof station.count === "number" && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: "0.08em",
              background:
                station.urgent && station.count > 0
                  ? "var(--warn-soft)"
                  : "var(--app-surface-2)",
              color:
                station.urgent && station.count > 0 ? "var(--warn)" : "var(--text-2)",
              border: `1px solid ${
                station.urgent && station.count > 0 ? "var(--warn)" : "var(--border)"
              }`,
              textTransform: "uppercase",
              alignSelf: "center",
            }}
          >
            {station.count}
          </span>
        )}
      </div>

      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-1)",
          letterSpacing: "-0.005em",
          marginBottom: 4,
        }}
      >
        {station.title}
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--text-2)",
          lineHeight: 1.45,
        }}
      >
        {station.description}
      </div>
      {station.recommended && (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          ← apollo
        </span>
      )}
    </Link>
  );
}
