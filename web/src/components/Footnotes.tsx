type Footnote = {
  id: string;
  content: string;
};

type Props = {
  notes: Footnote[];
};

export function Footnotes({ notes }: Props) {
  if (!notes.length) return null;
  return (
    <section
      style={{
        maxWidth: 620,
        marginTop: 96,
        paddingTop: 24,
        borderTop: "1px solid var(--rule)",
        fontFamily: "var(--font-serif)",
        fontSize: 14,
        color: "var(--ink-2)",
        lineHeight: 1.5,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--margin)",
          margin: "0 0 20px 0",
        }}
      >
        References
      </h3>
      <ol style={{ paddingLeft: 28, margin: 0 }}>
        {notes.map((n) => (
          <li key={n.id} id={n.id} style={{ marginBottom: 10, paddingLeft: 4 }}>
            {n.content}
          </li>
        ))}
      </ol>
    </section>
  );
}
