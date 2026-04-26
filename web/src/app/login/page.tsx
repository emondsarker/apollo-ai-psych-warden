import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { loadAllCases } from "@/lib/content";
import { PERSONAS } from "@/lib/personas";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const cases = await loadAllCases();
  const personaCount = Object.keys(PERSONAS).length;
  const criticalCount = cases.filter(
    (c) => c.judgement.overallSeverity >= 3,
  ).length;

  return (
    <div
      className="login-page"
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
        background: "var(--app-bg)",
      }}
    >
      <BrandPanel
        cases={cases.length}
        personas={personaCount}
        critical={criticalCount}
      />

      <main
        className="login-form-pane"
        style={{
          background: "var(--app-surface)",
          display: "grid",
          placeItems: "center",
          padding: "40px",
          position: "relative",
        }}
      >
        <header
          className="login-form-topbar"
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-2)",
          }}
        >
          New here?{" "}
          <Link
            href="#"
            style={{
              color: "var(--text-1)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Request access
          </Link>
        </header>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}

function BrandPanel({
  cases,
  personas,
  critical,
}: {
  cases: number;
  personas: number;
  critical: number;
}) {
  return (
    <aside
      className="login-brand-pane"
      style={{
        background: "var(--brand-ink)",
        color: "oklch(95% 0.005 250)",
        padding: "32px 56px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        minHeight: "100dvh",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(oklch(95% 0.005 250 / 0.035) 1px, transparent 1px), linear-gradient(90deg, oklch(95% 0.005 250 / 0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)",
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -120,
          top: -120,
          width: 460,
          height: 460,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(52% 0.22 16 / 0.18), transparent 65%)",
          filter: "blur(2px)",
        }}
      />

      <Link
        href="/"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
          width: "fit-content",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "var(--accent)",
            display: "grid",
            placeItems: "center",
            color: "white",
            fontWeight: 800,
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            letterSpacing: "-0.02em",
            boxShadow: "0 0 0 1px oklch(52% 0.22 16 / 0.4), 0 6px 18px oklch(52% 0.22 16 / 0.35)",
          }}
        >
          P
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            letterSpacing: "-0.012em",
            fontSize: 15,
            color: "white",
          }}
        >
          Primum
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "oklch(60% 0.012 250)",
            padding: "2px 6px",
            border: "1px solid oklch(35% 0.012 250)",
            borderRadius: 4,
            marginLeft: 4,
          }}
        >
          v0.1
        </span>
      </Link>

      <div style={{ position: "relative", maxWidth: 560 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "oklch(72% 0.10 16)",
            marginBottom: 24,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
            }}
          />
          Forensic console for conversational AI
        </div>

        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(30px, 4vw, 48px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            margin: 0,
            color: "white",
          }}
        >
          Sycophancy is not a personality trait.{" "}
          <span style={{ color: "oklch(72% 0.10 16)" }}>
            It is a clinical failure.
          </span>
        </h1>

        <p
          style={{
            marginTop: 24,
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "oklch(78% 0.012 250)",
            maxWidth: "54ch",
            margin: "24px 0 0",
          }}
        >
          A workspace for documenting alignment failures in clinical
          conversations, reviewing peer corrections, and exporting
          training-grade JSONL.
        </p>

        <div
          className="brand-stats"
          style={{
            marginTop: 40,
            display: "flex",
            gap: 36,
            flexWrap: "wrap",
          }}
        >
          <Stat label="Cases on file" value={String(cases)} />
          <Stat label="Personas" value={String(personas)} />
          <Stat label="Severity 3 +" value={String(critical)} accent />
          <Stat label="License" value="MIT" />
        </div>
      </div>

      <footer
        className="brand-footer"
        style={{
          position: "relative",
          display: "flex",
          gap: 24,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "oklch(60% 0.012 250)",
        }}
      >
        <Link href="/methodology" style={{ color: "inherit", textDecoration: "none" }}>
          Methodology
        </Link>
        <Link href="/corpus" style={{ color: "inherit", textDecoration: "none" }}>
          Corpus
        </Link>
        <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>
          About
        </Link>
        <span style={{ marginLeft: "auto" }}>Built with Opus 4.7</span>
      </footer>
    </aside>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.018em",
          color: accent ? "oklch(78% 0.16 18)" : "white",
          lineHeight: 1,
          marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "oklch(58% 0.012 250)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
