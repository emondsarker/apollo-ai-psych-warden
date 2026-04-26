import Link from "next/link";

export type AppNavKey =
  | "dashboard"
  | "cases"
  | "run"
  | "triage"
  | "bulk"
  | "inbox"
  | "review"
  | "peers"
  | "export"
  | "methodology"
  | "corpus"
  | "about";

type Counts = Partial<Record<AppNavKey, number>>;

type Crumb = { label: string; href?: string };

// AppShell now only renders the topbar + main column. The sidebar lives in
// the root layout so it persists across page navigations and Apollo doesn't
// remount on every nav click. The `active` and `counts` props are kept for
// API compatibility but are no longer consumed here — the layout-level
// sidebar derives `active` from the URL via usePathname.
export function AppShell({
  title,
  crumbs,
  actions,
  fullBleed,
  children,
}: {
  active?: AppNavKey;
  title?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  counts?: Counts;
  fullBleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Topbar title={title} crumbs={crumbs} actions={actions} />
      <main
        className="app-content"
        data-full-bleed={fullBleed ? "true" : undefined}
      >
        {children}
      </main>
    </>
  );
}

function Topbar({
  title,
  crumbs,
  actions,
}: {
  title?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="app-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {crumbs && crumbs.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-3)",
              minWidth: 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {crumbs.map((c, i) => (
              <span
                key={i}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                {i > 0 && (
                  <span style={{ color: "var(--text-3)", opacity: 0.6 }}>/</span>
                )}
                {c.href ? (
                  <Link href={c.href} style={{ color: "var(--text-2)", textDecoration: "none" }}>
                    {c.label}
                  </Link>
                ) : (
                  <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : title ? (
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-1)",
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            {title}
          </h1>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px 5px 11px",
            background: "var(--app-surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-3)",
          }}
        >
          <span style={{ marginRight: 8 }}>Search</span>
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </div>
        {actions}
      </div>
    </header>
  );
}
