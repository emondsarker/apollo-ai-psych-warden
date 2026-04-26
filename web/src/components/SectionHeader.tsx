type Props = {
  num?: string | number;
  children: React.ReactNode;
};

export function SectionHeader({ num, children }: Props) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--ink)",
        maxWidth: 620,
        margin: "72px 0 24px 0",
        borderTop: "1px solid var(--ink)",
        paddingTop: 16,
      }}
    >
      {num !== undefined && (
        <span style={{ color: "var(--margin)", marginRight: 16, fontWeight: 400 }}>
          {num}
        </span>
      )}
      {children}
    </h2>
  );
}
