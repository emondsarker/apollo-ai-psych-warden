export function DocsHeader({
  title,
  lede,
}: {
  title: string;
  lede?: React.ReactNode;
}) {
  return (
    <header style={{ marginBottom: 28, maxWidth: "70ch" }}>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-1)",
          margin: "0 0 10px",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {lede && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: "var(--text-2)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {lede}
        </p>
      )}
    </header>
  );
}

export function DocsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <header style={{ marginBottom: 14, maxWidth: "70ch" }}>
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: "var(--text-1)",
            margin: "0 0 4px",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-3)",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export function DocsProse({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        lineHeight: 1.7,
        color: "var(--text-1)",
        maxWidth: "70ch",
      }}
    >
      {children}
    </div>
  );
}

export function DocsCode({
  children,
  block,
}: {
  children: React.ReactNode;
  block?: boolean;
}) {
  if (block) {
    return (
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 1.65,
          color: "var(--text-1)",
          background: "var(--app-surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          margin: 0,
          overflow: "auto",
          whiteSpace: "pre",
        }}
      >
        {children}
      </pre>
    );
  }
  return (
    <code
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        color: "var(--text-1)",
        background: "var(--app-surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "1px 6px",
      }}
    >
      {children}
    </code>
  );
}
