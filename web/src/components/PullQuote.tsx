type Props = {
  children: React.ReactNode;
};

export function PullQuote({ children }: Props) {
  return (
    <blockquote
      style={{
        maxWidth: 620,
        margin: "56px 0",
        padding: "32px 0",
        borderTop: "1px solid var(--ink)",
        borderBottom: "1px solid var(--ink)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: 22,
        lineHeight: 1.4,
        color: "var(--oxblood)",
      }}
    >
      {children}
    </blockquote>
  );
}
