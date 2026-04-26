type StampTone = "stamp" | "jade" | "ink" | "quiet";

export function Stamp({
  children,
  tone = "stamp",
  rotate = -3,
}: {
  children: React.ReactNode;
  tone?: StampTone;
  rotate?: number;
}) {
  return (
    <span
      className="stamp"
      data-tone={tone === "stamp" ? undefined : tone}
      style={{ ["--stamp-rot" as string]: `${rotate}deg` }}
    >
      {children}
    </span>
  );
}
