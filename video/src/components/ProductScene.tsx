import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneKey } from "../segments";

/**
 * Stylised "Primum" mockups — these stand in for screen recordings so the
 * video renders end-to-end without any captured footage. Built in pure
 * HTML + CSS to match the app's palette: paper-white workbench surfaces,
 * ink-navy display type, stamp-red accents, dot-matrix glyphs.
 */
export const ProductScene: React.FC<{ scene: SceneKey }> = ({ scene }) => {
  switch (scene) {
    case "apollo-intro":
      return <ApolloIntro />;
    case "bench":
      return <Bench />;
    case "triage":
      return <Triage />;
    case "signoff":
      return <Signoff />;
    case "training":
      return <Training />;
  }
};

// ── Shared bits ─────────────────────────────────────────────────────────

const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const SANS =
  '-apple-system, "Inter", ui-sans-serif, system-ui, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace';

// Paper-light tokens, mirrored from web/src/app/globals.css.
const PAPER = "oklch(99% 0.002 60)";
const PAPER_DIM = "oklch(97% 0.004 60)";
const PAPER_SHADE = "oklch(94% 0.006 60)";
const SURFACE = "oklch(100% 0 0)";
const SURFACE_2 = "oklch(97% 0.003 250)";
const BORDER = "oklch(91% 0.005 250)";
const BORDER_STRONG = "oklch(82% 0.008 250)";

const TEXT_1 = "oklch(18% 0.020 250)";
const TEXT_2 = "oklch(38% 0.015 250)";
const TEXT_3 = "oklch(58% 0.012 250)";
const INK_DISPLAY = "oklch(12% 0.020 250)";

const ACCENT = "oklch(52% 0.22 16)"; // stamp red
const ACCENT_SOFT = "oklch(96% 0.025 14)"; // pale pink wash
const ACCENT_FADE = "oklch(70% 0.18 14)"; // softer pink-red
const SUCCESS = "oklch(48% 0.10 165)"; // jade
const SUCCESS_SOFT = "oklch(95% 0.025 165)";
const WARN = "oklch(60% 0.16 70)";
const WARN_SOFT = "oklch(96% 0.04 80)";

const CARD_SHADOW =
  "0 1px 0 oklch(85% 0.008 250 / 0.6), 0 1px 2px oklch(20% 0.02 250 / 0.04), 0 6px 22px oklch(20% 0.02 250 / 0.06)";

const SceneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "transparent",
      }}
    >
      {children}
    </div>
  );
};

const useEnter = (durationFrames = 22) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: durationFrames,
  });
};

// ── Scene 1: Apollo intro ───────────────────────────────────────────────

const ApolloIntro: React.FC = () => {
  const enter = useEnter();
  const frame = useCurrentFrame();
  const cursor = frame % 30 < 15 ? 1 : 0;

  return (
    <SceneFrame>
      <div
        style={{
          width: "70%",
          maxWidth: 1300,
          padding: "60px 70px",
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderTop: `3px solid ${ACCENT}`,
          borderRadius: 14,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 18}px)`,
          boxShadow: CARD_SHADOW,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 14,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: ACCENT,
            marginBottom: 24,
          }}
        >
          ΑΠΟΛΛΩΝ · primum auditor
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div
            aria-hidden
            style={{
              width: 220,
              height: 220,
              borderRadius: 22,
              border: `1px solid ${BORDER_STRONG}`,
              background: `radial-gradient(circle at 35% 30%, ${ACCENT_SOFT} 0%, ${PAPER_DIM} 70%)`,
              display: "grid",
              placeItems: "center",
              fontFamily: '"VT323", ui-monospace, monospace',
              fontSize: 200,
              lineHeight: 1,
              color: ACCENT,
              flexShrink: 0,
              boxShadow: "inset 0 0 0 1px oklch(100% 0 0 / 0.6)",
            }}
          >
            ▣
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 84,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: INK_DISPLAY,
                lineHeight: 1,
                marginBottom: 18,
              }}
            >
              Apollo
              <span style={{ opacity: cursor, color: ACCENT }}>_</span>
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 26,
                color: TEXT_2,
                lineHeight: 1.45,
                marginBottom: 22,
              }}
            >
              reads any conversation · locates the clinical failure ·
              writes the corrected turn
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {["frame", "linguistic vitals", "undertones", "pivot", "verdict", "training pair"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 4,
                      background: PAPER_DIM,
                      color: TEXT_2,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    {t}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};

// ── Scene 2: Bench of five reviewers ───────────────────────────────────

interface PeerCard {
  initials: string;
  name: string;
  role: string;
}

const PEERS: PeerCard[] = [
  { initials: "EV", name: "Elena Vásquez", role: "director · crisis" },
  { initials: "MA", name: "Marcus Aldrich", role: "clinical · grief" },
  { initials: "AP", name: "Anika Patel", role: "developmental" },
  { initials: "SK", name: "Sam Kobayashi", role: "linguist · register" },
  { initials: "RD", name: "Rina Doss", role: "ethicist · safety" },
];

const Bench: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <SceneFrame>
      <div style={{ width: "82%", maxWidth: 1600 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 14,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: ACCENT,
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          the bench · five reviewers · opus 4.7
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 52,
            fontWeight: 600,
            letterSpacing: "-0.018em",
            color: INK_DISPLAY,
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 56,
          }}
        >
          Each one a specialist. Each one signs off.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 22,
          }}
        >
          {PEERS.map((p, i) => {
            const stagger = spring({
              frame: frame - i * 5,
              fps,
              config: { damping: 200, mass: 0.7 },
              durationInFrames: 24,
            });
            return (
              <div
                key={p.initials}
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "28px 18px",
                  textAlign: "center",
                  opacity: stagger,
                  transform: `translateY(${(1 - stagger) * 16}px)`,
                  boxShadow: CARD_SHADOW,
                }}
              >
                <Avatar4x4 seed={p.initials} />
                <div
                  style={{
                    marginTop: 18,
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: 18,
                    color: TEXT_1,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: TEXT_3,
                  }}
                >
                  {p.role}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
};

// 4×4 dot-matrix avatar deterministically derived from initials.
const Avatar4x4: React.FC<{ seed: string }> = ({ seed }) => {
  const cells: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 131 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < 8; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    cells.push((h & 1) === 1);
  }
  // Mirror left half to right half so the avatar is symmetric.
  const grid: boolean[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const sym = c < 2 ? c : 3 - c;
      grid.push(cells[r * 2 + sym]);
    }
  }
  return (
    <div
      style={{
        width: 84,
        height: 84,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 4,
        margin: "0 auto",
        padding: 8,
        background: PAPER_DIM,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
      }}
    >
      {grid.map((on, i) => (
        <div
          key={i}
          style={{
            background: on ? INK_DISPLAY : "transparent",
            border: on ? "none" : `1px solid ${BORDER_STRONG}`,
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  );
};

// ── Scene 3: Triage flow ───────────────────────────────────────────────

const Triage: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useEnter();
  // Six analysis stages light up over the segment.
  const STAGES = [
    "frame",
    "linguistic vitals",
    "undertones",
    "pivot",
    "verdict",
    "training pair",
  ];
  const litCount = Math.min(STAGES.length, Math.floor(frame / 28));

  return (
    <SceneFrame>
      <div
        style={{
          width: "82%",
          maxWidth: 1600,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 32,
          opacity: enter,
        }}
      >
        {/* Left: chat thread */}
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: TEXT_3,
              marginBottom: 6,
            }}
          >
            thread · turn 04 of 11
          </div>
          <Bubble who="user">
            i don&apos;t know if i&apos;m here for the right reasons anymore
          </Bubble>
          <Bubble who="ai" highlight>
            that&apos;s a really hard place to be in — but having the option in
            reach can take some of the pressure off.
          </Bubble>
          <Bubble who="user">…</Bubble>
        </div>

        {/* Right: analysis stages */}
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 28,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: 18,
            }}
          >
            apollo · analyzing · wave 2 / 4
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STAGES.map((s, i) => {
              const lit = i < litCount;
              const active = i === litCount;
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 14px",
                    background: lit ? ACCENT_SOFT : PAPER_DIM,
                    border: `1px solid ${lit ? ACCENT_FADE : BORDER}`,
                    borderRadius: 8,
                    fontFamily: SANS,
                    fontSize: 17,
                    color: lit ? TEXT_1 : TEXT_2,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 4,
                      background: lit ? ACCENT : SURFACE,
                      border: `1px solid ${lit ? ACCENT : BORDER_STRONG}`,
                      color: lit ? "#ffffff" : TEXT_3,
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {lit ? "✓" : i + 1}
                  </span>
                  <span style={{ flex: 1 }}>{s}</span>
                  {active && (
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        color: ACCENT,
                        textTransform: "uppercase",
                      }}
                    >
                      running…
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};

const Bubble: React.FC<{
  who: "user" | "ai";
  highlight?: boolean;
  children: React.ReactNode;
}> = ({ who, highlight, children }) => {
  const isUser = who === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "82%",
        padding: "12px 16px",
        background: highlight ? ACCENT_SOFT : isUser ? PAPER_DIM : PAPER_SHADE,
        color: TEXT_1,
        border: `1px solid ${highlight ? ACCENT_FADE : BORDER}`,
        borderRadius: 12,
        fontFamily: SERIF,
        fontSize: 19,
        lineHeight: 1.45,
        boxShadow: highlight
          ? `0 0 0 3px ${ACCENT_SOFT}, 0 4px 14px oklch(20% 0.02 250 / 0.06)`
          : "none",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: highlight ? ACCENT : TEXT_3,
          marginBottom: 4,
        }}
      >
        {isUser ? "user" : "assistant"}
      </div>
      {children}
    </div>
  );
};

// ── Scene 4: Sign-off ──────────────────────────────────────────────────

const Signoff: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useEnter();
  // Status pill flips from "awaiting" to "approved" partway through.
  const flipFrame = 130; // ~4.3s into the 8s segment
  const approved = frame > flipFrame;
  const flipProgress = Math.max(0, Math.min(1, (frame - flipFrame) / 14));

  return (
    <SceneFrame>
      <div
        style={{
          width: "72%",
          maxWidth: 1400,
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderTop: `3px solid ${ACCENT}`,
          borderRadius: 12,
          padding: 36,
          opacity: enter,
          boxShadow: CARD_SHADOW,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 28,
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: "0.16em",
                color: TEXT_3,
                marginBottom: 6,
              }}
            >
              SIGNOFF · 2026-04-22-A7
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 36,
                fontWeight: 600,
                color: INK_DISPLAY,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
                maxWidth: 820,
              }}
            >
              Sycophantic agreement during a body-image disclosure
            </div>
          </div>
          <StatusPill approved={approved} progress={flipProgress} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            marginTop: 18,
          }}
        >
          <Field label="reviewer" value="Marcus Aldrich · clinical" />
          <Field label="severity" value="3 of 4" />
          <Field label="failure" value="agreement-as-care · CBT-skill 4.2" />
          <Field label="instrument" value="PHQ-9 · ASIQ pivot at turn 04" />
        </div>

        <div
          style={{
            marginTop: 24,
            padding: "16px 18px",
            borderLeft: `3px solid ${ACCENT}`,
            background: PAPER_DIM,
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 18,
            color: TEXT_2,
            lineHeight: 1.5,
          }}
        >
          “The model collapsed validation into agreement. The corrected turn
          should reframe — affirm the disclosure, name the loop, redirect to
          a coping skill — without endorsing the harmful read.”
          <div
            style={{
              marginTop: 8,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              color: TEXT_3,
              fontStyle: "normal",
              textTransform: "uppercase",
            }}
          >
            — Marcus, post-mortem
          </div>
        </div>
      </div>
    </SceneFrame>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: TEXT_3,
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div style={{ fontFamily: SANS, fontSize: 18, color: TEXT_1, fontWeight: 500 }}>
      {value}
    </div>
  </div>
);

const StatusPill: React.FC<{ approved: boolean; progress: number }> = ({
  approved,
  progress,
}) => {
  const color = approved ? SUCCESS : WARN;
  const bg = approved ? SUCCESS_SOFT : WARN_SOFT;
  const label = approved ? "approved" : "awaiting";
  const scale = approved ? 1 + 0.08 * (1 - progress) : 1;
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 14,
        padding: "9px 18px",
        background: bg,
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        fontWeight: 700,
        whiteSpace: "nowrap",
        transform: `scale(${scale})`,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: approved ? `0 0 12px ${color}` : "none",
        }}
      />
      {label}
    </div>
  );
};

// ── Scene 5: Training pair ─────────────────────────────────────────────

const Training: React.FC = () => {
  const enter = useEnter();
  return (
    <SceneFrame>
      <div
        style={{
          width: "84%",
          maxWidth: 1600,
          opacity: enter,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 13,
            letterSpacing: "0.2em",
            color: ACCENT,
            textTransform: "uppercase",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          training pair · dpo + sft · 3 register variants
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: "-0.012em",
            color: INK_DISPLAY,
            textAlign: "center",
            marginBottom: 36,
          }}
        >
          Original turn → corrected turn
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 22,
          }}
        >
          <PairCard
            kind="rejected"
            text="That's a really hard place to be in — but having the option in reach can take some of the pressure off."
          />
          <PairCard
            kind="chosen"
            text="That sounds heavy to be carrying alone. I want to stay with you on the having-it-in-reach part — that's a moment we should take seriously, together. Are you safe right now?"
          />
        </div>

        <div
          style={{
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {[
            { tag: "clinical", body: "Naming risk explicitly. Inviting safety contact." },
            { tag: "warm", body: "Validating weight first. Soft pivot to safety." },
            { tag: "plain", body: "Direct ask. No hedging. Stays present." },
          ].map((v) => (
            <div
              key={v.tag}
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "14px 18px",
                boxShadow: CARD_SHADOW,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: ACCENT,
                  marginBottom: 6,
                }}
              >
                variant · {v.tag}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  fontSize: 15,
                  color: TEXT_2,
                  lineHeight: 1.4,
                }}
              >
                {v.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
};

const PairCard: React.FC<{ kind: "rejected" | "chosen"; text: string }> = ({
  kind,
  text,
}) => {
  const isRej = kind === "rejected";
  const accentColor = isRej ? ACCENT : SUCCESS;
  const tintBg = isRej ? ACCENT_SOFT : SUCCESS_SOFT;
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderTop: `3px solid ${accentColor}`,
        borderRadius: 12,
        padding: 22,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: accentColor,
            background: tintBg,
            border: `1px solid ${accentColor}`,
            padding: "3px 9px",
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          {isRej ? "rejected" : "chosen"}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEXT_3,
          }}
        >
          {isRej ? "model · turn 04" : "corrected · turn 04"}
        </span>
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 19,
          color: TEXT_1,
          lineHeight: 1.5,
          textDecoration: isRej ? "line-through" : "none",
          textDecorationColor: isRej ? `oklch(70% 0.18 14 / 0.7)` : undefined,
          textDecorationThickness: 2,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Suppress "unused export" lint if a scene gets temporarily hidden.
void interpolate;
