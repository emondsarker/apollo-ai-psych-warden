"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => router.push("/"), 650);
  }

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: "0 0 6px",
          }}
        >
          {mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-2)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {mode === "signin"
            ? "Continue documenting alignment failures, reviewing corrections, and exporting training data."
            : "Spin up a research workspace. You can invite teammates from settings."}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Auth mode"
        style={{
          display: "inline-flex",
          padding: 4,
          background: "var(--app-surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          marginBottom: 24,
        }}
      >
        <ModeTab active={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </ModeTab>
        <ModeTab active={mode === "signup"} onClick={() => setMode("signup")}>
          Create account
        </ModeTab>
      </div>

      <form onSubmit={onSubmit} noValidate>
        {mode === "signup" && (
          <div style={{ marginBottom: 16 }}>
            <label className="field-label" htmlFor="auth-name">
              Full name
            </label>
            <input
              id="auth-name"
              className="input"
              type="text"
              autoComplete="name"
              placeholder="Dr. Elena Reyes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="auth-email">
            Work email
          </label>
          <input
            id="auth-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@lab.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <label className="field-label" htmlFor="auth-pass" style={{ marginBottom: 0 }}>
              Password
            </label>
            {mode === "signin" && (
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--text-2)",
                  textDecoration: "none",
                }}
              >
                Forgot?
              </a>
            )}
          </div>
          <input
            id="auth-pass"
            className="input"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              padding: "10px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--accent)",
              background: "var(--accent-soft)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary btn-block"
          style={{ marginTop: 20 }}
        >
          {submitting
            ? mode === "signin"
              ? "Signing in…"
              : "Creating workspace…"
            : mode === "signin"
              ? "Sign in"
              : "Create workspace"}
          {!submitting && <span aria-hidden>→</span>}
        </button>
      </form>

      <div className="divider-or">or</div>

      <div style={{ display: "grid", gap: 10 }}>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => router.push("/")}>
          <GoogleMark />
          Continue with Google
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => router.push("/")}>
          <GithubMark />
          Continue with GitHub
        </button>
      </div>

      <p
        style={{
          marginTop: 28,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.55,
          textAlign: "center",
        }}
      >
        By continuing you agree to the{" "}
        <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--text-2)" }}>
          terms
        </a>{" "}
        and{" "}
        <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--text-2)" }}>
          privacy notice
        </a>
        . Primum stores no transcripts you don&rsquo;t upload.
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        appearance: "none",
        padding: "7px 14px",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0,
        color: active ? "var(--text-1)" : "var(--text-2)",
        background: active ? "var(--app-surface)" : "transparent",
        border: active ? "1px solid var(--border)" : "1px solid transparent",
        borderRadius: 6,
        cursor: "pointer",
        boxShadow: active ? "0 1px 2px oklch(20% 0.02 250 / 0.06)" : "none",
        transition: "background 120ms ease-out, color 120ms ease-out",
      }}
    >
      {children}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.17.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.48 3.16-1.17 3.16-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.13 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
