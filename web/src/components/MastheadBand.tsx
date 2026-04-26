import Link from "next/link";

type Props = {
  issue?: string;
};

/**
 * Forensic Console masthead. Three-part layout: ISSN/volume on left, wordmark
 * centered, contextual filing info on right. Sits flush against the top of
 * the page, hairline-divided from the nav below.
 */
export function MastheadBand({ issue }: Props) {
  const today = formatToday();
  return (
    <header
      style={{
        borderBottom: "1px solid var(--ink-display)",
        background: "transparent",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        className="resp-masthead"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "18px 40px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "baseline",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-quiet)",
          }}
        >
          ISSN 0000-PRMM &nbsp;·&nbsp; {issue ?? "Vol. 1 No. 1"}
        </div>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "var(--ink-display)",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          PRIMUM
        </Link>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-quiet)",
            textAlign: "right",
          }}
        >
          Filed {today} &nbsp;·&nbsp; Open Access
        </div>
      </div>
    </header>
  );
}

function formatToday(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}
