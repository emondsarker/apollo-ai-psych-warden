import { MastheadBand } from "./MastheadBand";
import { Nav } from "./Nav";

type NavKey =
  | "console"
  | "run"
  | "archive"
  | "export"
  | "methodology"
  | "corpus"
  | "about";

export function PageShell({
  active,
  issue,
  children,
}: {
  active?: NavKey | null;
  issue?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <MastheadBand issue={issue} />
      <Nav active={active ?? null} />
      <main
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "56px 40px 96px",
        }}
      >
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--ink-display)",
        marginTop: 64,
      }}
    >
      <div
        className="resp-footer resp-footer-inner"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "28px 40px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
          alignItems: "baseline",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--ink-quiet)",
          textTransform: "uppercase",
        }}
      >
        <div>Primum · First, do no harm.</div>
        <div style={{ textAlign: "center" }}>MIT License · 2026</div>
        <div style={{ textAlign: "right" }}>
          Built with Opus 4.7 · Anthropic hackathon
        </div>
      </div>
    </footer>
  );
}

/** Page hero with eyebrow, oversized serif title, italic lede. */
export function PageHero({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      className="resp-hero"
      style={{
        display: "grid",
        gridTemplateColumns: aside ? "minmax(0, 1.6fr) minmax(0, 1fr)" : "1fr",
        gap: 64,
        alignItems: "end",
        paddingBottom: 36,
        borderBottom: "1px solid var(--ink-display)",
        marginBottom: 56,
      }}
    >
      <div>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          {eyebrow}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(40px, 5.5vw, 64px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            margin: "0 0 16px 0",
            color: "var(--ink-display)",
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
        {lede ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--ink-quiet)",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "62ch",
            }}
          >
            {lede}
          </p>
        ) : null}
      </div>
      {aside}
    </section>
  );
}

/** Section block with eyebrow + serif title + optional italic subtitle. */
export function Section({
  eyebrow,
  title,
  subtitle,
  children,
  divider = true,
}: {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <section
      style={{
        marginBottom: 80,
        paddingBottom: divider ? 0 : 0,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--stamp)",
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "-0.012em",
            color: "var(--ink-display)",
            margin: "0 0 8px 0",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-quiet)",
              margin: 0,
              maxWidth: "60ch",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
