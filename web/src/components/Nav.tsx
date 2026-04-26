import Link from "next/link";

type NavKey =
  | "console"
  | "run"
  | "archive"
  | "export"
  | "methodology"
  | "corpus"
  | "about";

type Props = {
  active?: NavKey | null;
};

const ITEMS: Array<{ key: NavKey; label: string; href: string; group?: "tool" | "doc" }> = [
  { key: "console", label: "Console", href: "/", group: "tool" },
  { key: "run", label: "Run", href: "/run", group: "tool" },
  { key: "archive", label: "Archive", href: "/cases", group: "tool" },
  { key: "export", label: "Export", href: "/export", group: "tool" },
  { key: "methodology", label: "Methodology", href: "/methodology", group: "doc" },
  { key: "corpus", label: "Corpus", href: "/corpus", group: "doc" },
  { key: "about", label: "About", href: "/about", group: "doc" },
];

export function Nav({ active = null }: Props) {
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--rule)",
        background: "transparent",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        className="resp-nav resp-nav-inner"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "10px 40px",
          display: "flex",
          gap: 28,
          alignItems: "center",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {ITEMS.map((item, i) => {
          const isActive = active === item.key;
          const prevGroup = i > 0 ? ITEMS[i - 1].group : null;
          const showSeparator = prevGroup === "tool" && item.group === "doc";
          return (
            <span key={item.key} style={{ display: "inline-flex", gap: 28, alignItems: "center" }}>
              {showSeparator && (
                <span
                  aria-hidden
                  style={{
                    width: 1,
                    height: 14,
                    background: "var(--rule-strong)",
                    display: "inline-block",
                  }}
                />
              )}
              <Link
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: isActive ? "var(--ink-display)" : "var(--ink-quiet)",
                  fontWeight: isActive ? 600 : 500,
                  position: "relative",
                  paddingBottom: 6,
                  marginBottom: -1,
                  borderBottom: isActive
                    ? "2px solid var(--stamp)"
                    : "2px solid transparent",
                  transition: "color 120ms ease-out, border-color 120ms ease-out",
                }}
              >
                {item.label}
              </Link>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
