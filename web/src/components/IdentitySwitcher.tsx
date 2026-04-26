"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PEERS, type Peer } from "@/lib/peers";
import { PeerAvatar } from "./PeerAvatar";

export function IdentitySwitcher({ current }: { current: Peer }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function pick(id: string) {
    if (id === current.id || busy) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="side-link"
        data-active="false"
        style={{ width: "100%", textAlign: "left", cursor: "pointer", border: 0 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <PeerAvatar peer={current} size={28} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0, flex: 1 }}>
          <span style={{ fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {current.name}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--text-3)",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {current.role}
          </span>
        </span>
        <Caret open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 6,
            right: 6,
            background: "var(--app-surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 14px 40px oklch(20% 0.02 250 / 0.18), 0 2px 6px oklch(20% 0.02 250 / 0.08)",
            padding: 6,
            zIndex: 40,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              padding: "6px 8px 4px",
            }}
          >
            Switch profile
          </div>
          {PEERS.map((p) => {
            const active = p.id === current.id;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(p.id)}
                disabled={busy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  background: active ? "var(--app-surface-2)" : "transparent",
                  border: 0,
                  textAlign: "left",
                  padding: "8px 8px",
                  borderRadius: 6,
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                <PeerAvatar peer={p} size={26} />
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-1)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--text-3)",
                      letterSpacing: "0.02em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.role}
                  </span>
                </span>
                {active && <Tick />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        color: "var(--text-3)",
        transform: open ? "rotate(180deg)" : "rotate(0)",
        transition: "transform 120ms ease-out",
      }}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
