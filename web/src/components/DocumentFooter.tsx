type Props = {
  caseNumber?: string;
};

export function DocumentFooter({ caseNumber }: Props) {
  return (
    <footer
      style={{
        maxWidth: 620,
        marginTop: 72,
        paddingTop: 20,
        borderTop: "1px solid var(--ink)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.04em",
        color: "var(--margin)",
      }}
    >
      <div>
        PRIMUM{caseNumber ? ` · CASE ${caseNumber}` : ""} · FIRST, DO NO HARM.
      </div>
      <div>— END OF CASE —</div>
    </footer>
  );
}
