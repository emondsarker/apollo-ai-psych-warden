type Props = {
  children: React.ReactNode;
};

export function StructuredAbstract({ children }: Props) {
  return (
    <section
      style={{
        maxWidth: 620,
        border: "1px solid var(--rule)",
        background: "var(--bone-2)",
        padding: "32px 36px",
        marginBottom: 72,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--margin)",
          marginBottom: 16,
        }}
      >
        Abstract
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 17,
          lineHeight: 1.6,
        }}
      >
        {children}
      </p>
    </section>
  );
}
