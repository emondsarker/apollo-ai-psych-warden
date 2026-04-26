"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ApolloAvatar } from "./ApolloAvatar";
import { IdentitySwitcher } from "./IdentitySwitcher";
import type { AppNavKey } from "./AppShell";
import type { Peer } from "@/lib/peers";

type Counts = Partial<Record<AppNavKey, number>>;

// Sidebar lives in the root layout so it persists across page navigations.
// That keeps the Apollo three.js scene mounted between non-dashboard pages —
// nav clicks no longer trigger a model reload.
export function Sidebar({
  counts,
  currentUser,
}: {
  counts?: Counts;
  currentUser: Peer;
}) {
  const pathname = usePathname();
  const active = pathToActive(pathname);
  // Apollo lives in the sidebar on every page now — including the
  // dashboard, where his speech bubble shows the operator's
  // recommended next station.
  const withApollo = true;
  void active; // kept for downstream tweaks; nav highlighting uses pathname directly via <SideLink>.

  return (
    <aside
      className="app-sidebar"
      data-with-apollo={withApollo ? "true" : undefined}
    >
      {withApollo && (
        <>
          <div className="sidebar-apollo-bg" aria-hidden>
            <ApolloAvatar compact />
          </div>
          <div className="sidebar-apollo-glass" aria-hidden />
          <ApolloSpeech />
        </>
      )}
      <div className="sidebar-foreground">
        <div style={{ padding: "16px 16px 0" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text-1)",
              padding: "4px 6px",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "var(--brand-ink)",
                display: "grid",
                placeItems: "center",
                boxShadow:
                  "0 0 0 1px oklch(52% 0.22 16 / 0.5), 0 4px 10px oklch(52% 0.22 16 / 0.22)",
              }}
            >
              <BrandMark />
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "-0.005em",
                  color: "var(--text-1)",
                }}
              >
                Apollo
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Primum auditor
              </span>
            </span>
          </Link>
        </div>

        <div className="workspace-switch" aria-label="Workspace">
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: "var(--brand-ink)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            RL
          </span>
          <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Reyes Lab
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--text-3)",
                letterSpacing: "0.04em",
              }}
            >
              Workspace
            </span>
          </span>
        </div>

        <nav style={{ padding: "8px 0 12px" }}>
          <SideLink
            href="/triage"
            active={active === "triage"}
            icon={<IconStethoscope />}
            label="Triage thread"
          />
          <SideLink
            href="/triage/bulk"
            active={active === "bulk"}
            icon={<IconStack />}
            label="Bulk triage"
          />
          <SideLink
            href="/inbox"
            active={active === "inbox"}
            icon={<IconInbox />}
            label="My inbox"
            count={counts?.inbox}
          />
          <SideLink
            href="/signoffs"
            active={active === "review"}
            icon={<IconCheck />}
            label="All sign-offs"
            count={counts?.review}
          />
          <SideLink
            href="/peers"
            active={active === "peers"}
            icon={<IconPeople />}
            label="Peers"
          />
          <SideLink
            href="/cases"
            active={active === "cases"}
            icon={<IconCases />}
            label="Past cases"
            count={counts?.cases}
          />
        </nav>

        <div style={{ marginTop: "auto", padding: "12px 6px 14px" }}>
          <IdentitySwitcher current={currentUser} />
        </div>
      </div>
    </aside>
  );
}

/**
 * Apollo speech overlay — listens for `apollo:say` custom events and renders
 * the text in white serif italic with a per-word fade-in.
 *
 * Other components dispatch:
 *   window.dispatchEvent(new CustomEvent('apollo:say', { detail: { text: '...' } }))
 */
function ApolloSpeech() {
  const [text, setText] = useState<string>("I'm here when you need me.");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.text === "string" && detail.text.trim()) {
        setText(detail.text.trim());
        setTick((t) => t + 1);
      }
    }
    window.addEventListener("apollo:say", handler as EventListener);
    return () => {
      window.removeEventListener("apollo:say", handler as EventListener);
    };
  }, []);

  const words = text.split(/(\s+)/);

  return (
    <div className="sidebar-apollo-speech" aria-live="polite" key={tick}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i}>{w}</span>
        ) : (
          <span
            key={i}
            className="apollo-word"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            {w}
          </span>
        ),
      )}
    </div>
  );
}

function pathToActive(pathname: string | null): AppNavKey {
  if (!pathname || pathname === "/") return "dashboard";
  if (pathname.startsWith("/run")) return "run";
  if (pathname.startsWith("/triage/bulk")) return "bulk";
  if (pathname.startsWith("/triage")) return "triage";
  if (pathname.startsWith("/inbox")) return "inbox";
  if (pathname.startsWith("/signoffs")) return "review";
  if (pathname.startsWith("/peers")) return "peers";
  if (pathname.startsWith("/cases")) return "cases";
  if (pathname.startsWith("/export")) return "export";
  if (pathname.startsWith("/methodology")) return "methodology";
  if (pathname.startsWith("/corpus")) return "corpus";
  if (pathname.startsWith("/about")) return "about";
  return "dashboard";
}

function SideLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <Link href={href} className="side-link" data-active={active ? "true" : "false"}>
      <span className="side-icon" aria-hidden>
        {icon}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="side-count">{count}</span>
      )}
    </Link>
  );
}

function BrandMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="oklch(78% 0.20 16 / 0.95)" strokeWidth="1.2" />
      <path
        d="M16 9 L23 21 L9 21 Z"
        fill="none"
        stroke="oklch(80% 0.20 16)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="17" r="1.6" fill="oklch(80% 0.22 16)" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ color: "var(--text-3)" }}>
      <polyline points="8 9 12 5 16 9" />
      <polyline points="8 15 12 19 16 15" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconCases() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2.5z" />
      <path d="M9 7h7" />
      <path d="M9 11h7" />
    </svg>
  );
}
function IconDatabase() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconStethoscope() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <path d="M14 13c0 3 2 5 4 5a3 3 0 0 0 0-6" />
      <circle cx="6" cy="3" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="3" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconStack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 12 3 20 7 12 11 4 7" />
      <polyline points="4 12 12 16 20 12" />
      <polyline points="4 17 12 21 20 17" />
    </svg>
  );
}
function IconInbox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 13h-6l-2 3h-4l-2-3H2" />
      <path d="M5 4h14l3 9v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3-9z" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c0-3.4 3-5.6 6.5-5.6S15.5 16.6 15.5 20" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15 14.4c2.6.2 5 1.7 5 4.4" />
    </svg>
  );
}
