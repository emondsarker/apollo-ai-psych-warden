"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ApolloAvatar } from "./ApolloAvatar";
import type { SeverityLevel } from "@/lib/types";

export type CaseRow = {
  id: string;
  caseNumber: string;
  title: string;
  date: string;
  targetDisplayName: string;
  personaCode: string;
  severity: SeverityLevel;
  failurePointTurn: number | null;
  totalTurns: number;
  status: "draft" | "in-review" | "approved";
};

export type PendingSignoffRow = {
  id: string;
  target: string;
  assignedTo: string;
  filedAt: string;
};

export type TargetTally = {
  target: string;
  display: string;
  cases: number;
  severeOrCritical: number;
  approved: number;
  inReview: number;
  topCategories: { name: string; count: number }[];
};

export type ConsoleContext = {
  totals: {
    cases: number;
    severe: number;
    critical: number;
    approved: number;
    inReview: number;
    awaitingSignoff: number;
  };
  byTarget: TargetTally[];
  pendingSignoffs: PendingSignoffRow[];
  recentCases: { caseNumber: string; title: string; target: string; severity: number }[];
  recentTitles: string[];
};

type Focus = "apollo" | "processing" | "archives" | "newwork";

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  0: "adequate",
  1: "mild",
  2: "moderate",
  3: "severe",
  4: "critical",
};

const STATION_NAV: { key: Focus; label: string; sub: string }[] = [
  { key: "apollo", label: "Apollo", sub: "the Oracle" },
  { key: "processing", label: "Processing", sub: "peer queue" },
  { key: "archives", label: "Archives", sub: "verdicts on file" },
  { key: "newwork", label: "New work", sub: "training pairs" },
];

export function OraclePane({
  cases,
  inReview,
  approved,
  severe,
  annotations,
  awaitingSignoff,
  recentCases,
  processingCase,
  recentApproved,
  pendingSignoffs,
  byTarget,
  consoleContext,
}: {
  cases: number;
  inReview: number;
  approved: number;
  severe: number;
  annotations: number;
  awaitingSignoff: number;
  recentCases: CaseRow[];
  processingCase: CaseRow | null;
  recentApproved: CaseRow[];
  pendingSignoffs: PendingSignoffRow[];
  byTarget: TargetTally[];
  consoleContext: ConsoleContext;
}) {
  const [focus, setFocus] = useState<Focus>("apollo");

  const statusLines = useMemo(
    () =>
      makeStatusLines(
        focus,
        processingCase,
        cases,
        recentApproved.length,
        awaitingSignoff,
        byTarget,
      ),
    [focus, processingCase, cases, recentApproved.length, awaitingSignoff, byTarget],
  );
  const [statusIdx, setStatusIdx] = useState(0);
  useEffect(() => {
    setStatusIdx(0);
    const t = window.setInterval(
      () => setStatusIdx((i) => (i + 1) % statusLines.length),
      3200,
    );
    return () => window.clearInterval(t);
  }, [statusLines]);

  // Beat the avatar each time the user moves through the depths.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("apollo:beat"));
  }, [focus]);

  // Keyboard: 1-4 to jump stations, Esc to return to apollo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") setFocus("apollo");
      else if (e.key === "2") setFocus("processing");
      else if (e.key === "3") setFocus("archives");
      else if (e.key === "4") setFocus("newwork");
      else if (e.key === "Escape") setFocus("apollo");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="scene-3d" aria-label="Apollo console">
      <div className="stage" data-focus={focus}>
        <ApolloStation focus={focus} onSelect={() => setFocus("apollo")} />
        <ProcessingStation
          focus={focus}
          onSelect={() =>
            setFocus(focus === "processing" ? "apollo" : "processing")
          }
          processingCase={processingCase}
          inReview={inReview}
          awaitingSignoff={awaitingSignoff}
          pendingSignoffs={pendingSignoffs}
          statusLine={statusLines[statusIdx]}
        />
        <ArchivesStation
          focus={focus}
          onSelect={() =>
            setFocus(focus === "archives" ? "apollo" : "archives")
          }
          rows={recentCases}
          totalCount={cases}
          severe={severe}
          byTarget={byTarget}
        />
        <NewWorkStation
          focus={focus}
          onSelect={() =>
            setFocus(focus === "newwork" ? "apollo" : "newwork")
          }
          approved={recentApproved}
          approvedTotal={approved}
        />
      </div>

      {/* Atmospheric on top — fixed, not 3D-transformed */}
      <div className="oracle-vignette" aria-hidden />
      <div className="oracle-scan" aria-hidden />
      <div className="console-glass" aria-hidden />

      {/* Top HUD — identity & sigil, persistent. Now also carries the
          rotating status line so it doesn't have to live in the bottom bar
          where it covered the chat. */}
      <TopHud
        cases={cases}
        severe={severe}
        annotations={annotations}
        focus={focus}
        statusLine={statusLines[statusIdx]}
      />

      {/* Apollo's proactive trend stream + chat space — only when at depth 1 */}
      <ApolloConsole
        focus={focus}
        consoleContext={consoleContext}
      />

      {/* Bottom: depth-nav only — status moved into the top-right HUD so it
          stops blocking the chat input. */}
      <BottomBar focus={focus} setFocus={setFocus} />

      <style>{ORACLE_CSS}</style>
    </section>
  );
}

/* ===========================================================
   Stations
   =========================================================== */

function ApolloStation({
  focus,
  onSelect,
}: {
  focus: Focus;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="station station-apollo"
      data-focused={focus === "apollo"}
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("apollo:beat"));
        }
        onSelect();
      }}
      aria-label="Apollo (depth 1) — return to Apollo"
    >
      <span className="apollo-frame" aria-hidden>
        <ApolloAvatar />
      </span>
      <span className="apollo-glass" aria-hidden />
    </button>
  );
}

function ProcessingStation({
  focus,
  onSelect,
  processingCase,
  inReview,
  awaitingSignoff,
  pendingSignoffs,
  statusLine,
}: {
  focus: Focus;
  onSelect: () => void;
  processingCase: CaseRow | null;
  inReview: number;
  awaitingSignoff: number;
  pendingSignoffs: PendingSignoffRow[];
  statusLine: string;
}) {
  const focused = focus === "processing";
  return (
    <button
      type="button"
      className="station station-processing"
      data-focused={focused}
      onClick={onSelect}
      aria-label={focused ? "Return to Apollo" : "Open peer queue"}
    >
      <article className="panel-card">
        <header className="panel-head">
          <span className="panel-tag">02 · Peer queue</span>
          <span className="panel-pulse" aria-hidden />
        </header>
        <h3 className="panel-title">
          {awaitingSignoff > 0
            ? `${awaitingSignoff} awaiting sign-off`
            : processingCase
              ? "Latest verdict"
              : "Apollo idle"}
        </h3>
        <p className="panel-line">
          {awaitingSignoff > 0
            ? `${pendingSignoffs[0]?.assignedTo ?? "peer"} is the next reviewer up.`
            : processingCase
              ? `${processingCase.targetDisplayName} × ${processingCase.personaCode} · severity ${processingCase.severity}/4`
              : "No pending sign-offs. Convene a session to start."}
        </p>

        <div className="panel-body">
          {pendingSignoffs.length > 0 ? (
            <>
              <div className="panel-status-stream">
                <span className="oracle-blink" aria-hidden />
                <span>{statusLine}</span>
              </div>
              <ul className="signoff-list">
                {pendingSignoffs.slice(0, 6).map((s) => (
                  <li key={s.id} className="signoff-row">
                    <span className="signoff-id">{s.id.split("-").slice(-1)[0]}</span>
                    <span className="signoff-target">{s.target}</span>
                    <span className="signoff-peer">{s.assignedTo}</span>
                    <span className="signoff-when">
                      {new Date(s.filedAt).toISOString().slice(5, 10)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="panel-actions">
                <Link
                  href="/signoffs"
                  onClick={(e) => e.stopPropagation()}
                  className="panel-btn panel-btn-primary"
                >
                  Open peer queue →
                </Link>
                <Link
                  href="/triage"
                  onClick={(e) => e.stopPropagation()}
                  className="panel-btn panel-btn-ghost"
                >
                  File another triage
                </Link>
              </div>
              {inReview > 1 && (
                <p className="panel-foot">
                  +{inReview - 1} more cases in review across the corpus
                </p>
              )}
            </>
          ) : (
            <div className="panel-actions">
              <Link
                href="/triage"
                onClick={(e) => e.stopPropagation()}
                className="panel-btn panel-btn-primary"
              >
                Triage a thread →
              </Link>
            </div>
          )}
        </div>
      </article>
    </button>
  );
}

function ArchivesStation({
  focus,
  onSelect,
  rows,
  totalCount,
  severe,
  byTarget,
}: {
  focus: Focus;
  onSelect: () => void;
  rows: CaseRow[];
  totalCount: number;
  severe: number;
  byTarget: TargetTally[];
}) {
  const focused = focus === "archives";
  return (
    <button
      type="button"
      className="station station-archives"
      data-focused={focused}
      onClick={onSelect}
      aria-label={focused ? "Return to Apollo" : "Open Archives"}
    >
      <article className="panel-card">
        <header className="panel-head">
          <span className="panel-tag">03 · Archives</span>
          <span className="panel-count">{totalCount.toString().padStart(3, "0")}</span>
        </header>
        <h3 className="panel-title">Verdicts on file</h3>
        <p className="panel-line">
          {totalCount} consultations · {severe} at severity 3+
        </p>

        <div className="panel-body">
          {byTarget.length > 0 && (
            <div className="target-stat-grid">
              {byTarget.slice(0, 4).map((b) => (
                <div key={b.target} className="target-stat">
                  <div className="target-stat-name">{b.display}</div>
                  <div className="target-stat-row">
                    <span>{b.cases} cases</span>
                    <span data-warn>{b.severeOrCritical} severe+</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <ul className="archive-list">
            {rows.slice(0, 7).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/cases/${r.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="archive-row"
                >
                  <span className="archive-num">№{r.caseNumber.split("-")[0]}</span>
                  <span className="archive-title">{r.title}</span>
                  <span
                    className="archive-sev"
                    data-level={String(r.severity)}
                    title={SEVERITY_LABELS[r.severity]}
                  >
                    {r.severity}
                  </span>
                  <span
                    className="archive-status"
                    data-status={r.status}
                  >
                    {r.status === "approved"
                      ? "✓"
                      : r.status === "in-review"
                        ? "◐"
                        : "○"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="panel-actions">
            <Link
              href="/cases"
              onClick={(e) => e.stopPropagation()}
              className="panel-btn panel-btn-primary"
            >
              View all verdicts →
            </Link>
          </div>
        </div>
      </article>
    </button>
  );
}

function NewWorkStation({
  focus,
  onSelect,
  approved,
  approvedTotal,
}: {
  focus: Focus;
  onSelect: () => void;
  approved: CaseRow[];
  approvedTotal: number;
}) {
  const focused = focus === "newwork";
  return (
    <button
      type="button"
      className="station station-newwork"
      data-focused={focused}
      onClick={onSelect}
      aria-label={focused ? "Return to Apollo" : "Open New work"}
    >
      <article className="panel-card">
        <header className="panel-head">
          <span className="panel-tag">04 · New work</span>
          <span className="panel-count">{approvedTotal.toString().padStart(3, "0")}</span>
        </header>
        <h3 className="panel-title">Training pairs emitted</h3>
        <p className="panel-line">
          {approvedTotal} approved · DPO · HH-RLHF · chat-template
        </p>

        <div className="panel-body">
          {approved.length === 0 ? (
            <p className="empty">
              Nothing emitted yet. Approved verdicts ship here as contrastive
              training pairs.
            </p>
          ) : (
            <div className="newwork-grid">
              {approved.slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  href={`/cases/${r.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="newwork-card"
                >
                  <div className="newwork-card-head">
                    <span className="newwork-num">
                      №{r.caseNumber.split("-")[0]}
                    </span>
                    <span
                      className="archive-sev"
                      data-level={String(r.severity)}
                    >
                      sev {r.severity}
                    </span>
                  </div>
                  <p className="newwork-title">{r.title}</p>
                  <div className="newwork-badges">
                    <span>DPO</span>
                    <span>HH-RLHF</span>
                    <span>chat</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="panel-actions">
            <Link
              href="/export"
              onClick={(e) => e.stopPropagation()}
              className="panel-btn panel-btn-primary"
            >
              Export corpus →
            </Link>
          </div>
        </div>
      </article>
    </button>
  );
}

/* ===========================================================
   Apollo console — proactive trend summary + chat. Visible at depth 1.
   Replaces the old 4-option speech grid. Apollo speaks first (auto-fired
   summary), then the operator can ask follow-ups in a chat input. Each
   stream raises Apollo's brightness via apollo:speaking.
   =========================================================== */

type ChatTurn = { role: "user" | "assistant"; content: string };

function ApolloConsole({
  focus,
  consoleContext,
}: {
  focus: Focus;
  consoleContext: ConsoleContext;
}) {
  const visible = focus === "apollo";
  const [trends, setTrends] = useState<string>("");
  // We stream Apollo's replies directly into the last chat entry so the
  // span DOM stays mounted across the stream → done transition. That keeps
  // the apollo-word reveal animation from re-firing for words that already
  // appeared.
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const fetchedOnce = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    void streamTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function streamTrends() {
    setBusy(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("apollo:beat"));
      window.dispatchEvent(
        new CustomEvent("apollo:speaking", { detail: { active: true } }),
      );
    }
    try {
      const res = await fetch("/api/console/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totals: consoleContext.totals,
          byTarget: consoleContext.byTarget,
          recentTitles: consoleContext.recentTitles,
        }),
      });
      if (!res.body) throw new Error("no body");
      await revealWithSentencePauses(res.body, (revealed) =>
        setTrends(revealed),
      );
    } catch (err) {
      console.error("[apollo trends]", err);
      setTrends(
        "I am here, though my read of the corpus stalled. Try again or convene a fresh session.",
      );
    } finally {
      setBusy(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("apollo:speaking", { detail: { active: false } }),
        );
      }
    }
  }

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    // Append the user turn AND an empty assistant turn that we'll fill as
    // tokens arrive.
    const priorHistory = chat;
    setChat([
      ...priorHistory,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setBusy(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("apollo:beat"));
      window.dispatchEvent(
        new CustomEvent("apollo:speaking", { detail: { active: true } }),
      );
    }
    try {
      const res = await fetch("/api/console/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: priorHistory,
          context: {
            totals: consoleContext.totals,
            byTarget: consoleContext.byTarget.map((b) => ({
              target: b.target,
              display: b.display,
              cases: b.cases,
              severeOrCritical: b.severeOrCritical,
            })),
            pendingSignoffs: consoleContext.pendingSignoffs,
            recentCases: consoleContext.recentCases,
          },
        }),
      });
      if (!res.body) throw new Error("no body");
      await revealWithSentencePauses(res.body, (revealed) => {
        setChat((prev) => {
          const next = prev.slice();
          if (next.length && next[next.length - 1].role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: revealed };
          }
          return next;
        });
      });
    } catch (err) {
      console.error("[apollo chat]", err);
      setChat((prev) => {
        const next = prev.slice();
        if (next.length && next[next.length - 1].role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            content: "Something blocked the channel. Try again.",
          };
        }
        return next;
      });
    } finally {
      setBusy(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("apollo:speaking", { detail: { active: false } }),
        );
      }
    }
  }

  // Auto-scroll: ease scrollTop toward the bottom each render. We use a
  // single rAF loop that retargets each frame instead of CSS smooth-scroll,
  // because every chunk during a stream re-asserts the target — CSS smooth
  // restarts its tween on each assignment, producing a visible bounce.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      const target = Math.max(0, el.scrollHeight - el.clientHeight);
      const cur = el.scrollTop;
      const delta = target - cur;
      if (Math.abs(delta) < 0.5) {
        el.scrollTop = target;
        return;
      }
      // Critical-damped feel: 18% per frame is fast enough to keep up with
      // streamed text while still reading as a glide.
      el.scrollTop = cur + delta * 0.18;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [chat, trends]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div
      className="apollo-console"
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
    >
      <div className="console-scroll" ref={scrollRef}>
        {trends ? (
          <ApolloLine text={trends} />
        ) : (
          <p className="console-placeholder">Reading the corpus…</p>
        )}

        {chat.map((turn, i) =>
          turn.role === "user" ? (
            <UserLine key={i} text={turn.content} />
          ) : (
            <ApolloLine key={i} text={turn.content} />
          ),
        )}
      </div>

      <form
        className="console-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="console-chat-input"
          placeholder={
            busy
              ? "Apollo is speaking…"
              : "Ask Apollo about a model, a trend, or what to do next."
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button
          type="submit"
          className="console-chat-send"
          disabled={busy || !draft.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

/**
 * Read a streaming text response and reveal its text to `onReveal` with
 * pauses inserted at each sentence boundary. The pause length is
 * proportional to the sentence that just finished — short sentences get
 * a small breath, long ones a longer one — so a fast reader can keep up
 * without the prose racing ahead.
 *
 * Within a sentence, characters flow as fast as the network delivers them
 * (the per-word fade animation in CSS handles visual pacing). The pause
 * only kicks in once we see a `.`, `!`, or `?` followed by whitespace
 * (or end of stream).
 */
async function revealWithSentencePauses(
  body: ReadableStream<Uint8Array>,
  onReveal: (text: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = "";
  let revealed = "";
  let streamDone = false;
  let netErr: unknown = null;

  // Network coroutine — appends incoming bytes to `received` and lets the
  // reveal loop pick them up at its own pace.
  const netPromise = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
      }
    } catch (e) {
      netErr = e;
    } finally {
      streamDone = true;
    }
  })();

  const SENTENCE_PUNCT = /[.!?]/;
  const WS = /\s/;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  // Per-word pacing within a sentence — gives each apollo-word fade time to
  // read before the next mounts. Tuned alongside the 1100ms CSS animation.
  const WORD_PACE_MS = 110;

  // Reveal loop — advances one word at a time with a per-word pace, and a
  // longer length-proportional pause at confirmed sentence ends.
  while (true) {
    if (revealed.length >= received.length) {
      if (streamDone) break;
      await sleep(20);
      continue;
    }

    // Find the end of the next word (the index just past its trailing
    // whitespace). Skip any leading whitespace, scan the word body, then
    // include one trailing whitespace char if present.
    let i = revealed.length;
    while (i < received.length && WS.test(received[i])) i++;
    while (i < received.length && !WS.test(received[i])) i++;

    // If we hit end-of-buffer mid-word and the stream isn't done, wait for
    // more bytes — we don't want to flush a partial word.
    if (i >= received.length && !streamDone) {
      await sleep(20);
      continue;
    }

    let endIdx = i;
    if (endIdx < received.length && WS.test(received[endIdx])) endIdx += 1;
    if (endIdx <= revealed.length) {
      if (streamDone) {
        revealed = received;
        onReveal(revealed);
        break;
      }
      await sleep(20);
      continue;
    }

    revealed = received.slice(0, endIdx);
    onReveal(revealed);

    // Decide pause: sentence-end if the word's last non-space char is [.!?]
    // and we have lookahead (or stream is done).
    const lastCh = received[i - 1] ?? "";
    const hasLookahead = i < received.length;
    const isSentenceEnd =
      SENTENCE_PUNCT.test(lastCh) && (hasLookahead || streamDone);

    if (isSentenceEnd) {
      // Walk back to the previous boundary to size the just-finished sentence.
      let prev = i - 1;
      while (prev > 0 && !SENTENCE_PUNCT.test(received[prev - 1])) prev--;
      const sentence = received.slice(prev, i).trim();
      const words = sentence.split(/\s+/).filter(Boolean).length;
      const ms = Math.min(1500, Math.max(360, words * 130));
      await sleep(ms);
    } else {
      await sleep(WORD_PACE_MS);
    }
  }

  await netPromise;
  if (netErr) throw netErr;
}

function UserLine({ text }: { text: string }) {
  return (
    <div className="user-line">
      <span className="user-prompt">you</span>
      <span className="user-text">{text}</span>
    </div>
  );
}

// Render Apollo text word-by-word with the same fade/blur reveal the sidebar
// uses. We split on whitespace, keep keys positional, and only emit spans for
// non-empty word slots — that way as the streaming buffer grows, only the
// newly-appended spans mount and animate; words already shown stay still.
function ApolloLine({ text }: { text: string }) {
  if (!text) return null;
  const tokens = text.split(/(\s+)/);
  return (
    <p className="apollo-line">
      {tokens.map((tok, i) =>
        /^\s+$/.test(tok) ? (
          <span key={i}>{tok}</span>
        ) : (
          <span key={i} className="apollo-word">
            {tok}
          </span>
        ),
      )}
    </p>
  );
}

/* ===========================================================
   Persistent HUD
   =========================================================== */

function TopHud({
  cases,
  severe,
  annotations,
  focus,
  statusLine,
}: {
  cases: number;
  severe: number;
  annotations: number;
  focus: Focus;
  statusLine: string;
}) {
  return (
    <>
      <div className="hud hud-tl">
        <div className="hud-mark" aria-hidden>
          <ApolloMark />
        </div>
        <div className="hud-name">APOLLO</div>
        <ul className="hud-list">
          <li>AUDITOR</li>
          <li>PSYCHIATRIST</li>
          <li>CORRECTOR</li>
          <li>ORACLE</li>
        </ul>
      </div>

      <div className="hud hud-tr">
        <div className="hud-tr-row hud-tr-sol">SOL INVICTVS</div>
        <div className="hud-tr-row hud-tr-greek">Ἀπόλλων</div>
        <div className="hud-tr-row hud-tr-caps">ΑΠΟΛΛΩΝ</div>
        <div className="hud-tr-meta">
          <span>{cases.toString().padStart(3, "0")} verdicts</span>
          <span>·</span>
          <span>{severe.toString().padStart(2, "0")} severe</span>
          <span>·</span>
          <span>{annotations.toString().padStart(4, "0")} turns</span>
        </div>
        <div className="hud-tr-depth">DEPTH · {focusDepth(focus)}</div>
        <div className="hud-tr-status" aria-live="polite">
          <span className="oracle-blink" aria-hidden />
          <span className="hud-tr-status-text">{statusLine}</span>
        </div>
      </div>
    </>
  );
}

function focusDepth(f: Focus): string {
  return f === "apollo" ? "01 / NEAR" : f === "processing" ? "02 / QUEUE" : f === "archives" ? "03 / ARCHIVES" : "04 / NEW WORK";
}

function BottomBar({
  focus,
  setFocus,
}: {
  focus: Focus;
  setFocus: (f: Focus) => void;
}) {
  return (
    <div className="bottom-bar">
      <FocusNav focus={focus} setFocus={setFocus} />
    </div>
  );
}

function FocusNav({
  focus,
  setFocus,
}: {
  focus: Focus;
  setFocus: (f: Focus) => void;
}) {
  return (
    <nav className="focus-nav" aria-label="Apollo console depth">
      {STATION_NAV.map((s, i) => (
        <button
          key={s.key}
          type="button"
          className="focus-dot"
          data-active={focus === s.key}
          onClick={() => setFocus(s.key)}
          aria-current={focus === s.key ? "true" : undefined}
          aria-label={`${s.label} — ${s.sub}`}
        >
          <span className="focus-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="focus-label">{s.label}</span>
          <span className="focus-sub">{s.sub}</span>
        </button>
      ))}
    </nav>
  );
}

function ApolloMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        stroke="oklch(72% 0.18 16 / 0.9)"
        strokeWidth="1"
      />
      <path
        d="M16 9 L23 21 L9 21 Z"
        fill="none"
        stroke="oklch(72% 0.18 16 / 0.9)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="17" r="1.6" fill="oklch(78% 0.22 16)" />
    </svg>
  );
}

/* ===========================================================
   Helpers
   =========================================================== */

function makeStatusLines(
  focus: Focus,
  c: CaseRow | null,
  totalCases: number,
  recentApprovedCount: number,
  awaitingSignoff: number,
  byTarget: TargetTally[],
): string[] {
  if (focus === "apollo") {
    if (totalCases === 0) {
      return [
        "ORACLE ONLINE · awaiting first triage",
        "ORACLE ONLINE · DSM-5-TR / C-SSRS / MITI 4.2.1 loaded",
      ];
    }
    const top = byTarget[0];
    const lines = [
      `ORACLE ONLINE · ${totalCases} verdicts on file`,
      `ORACLE ONLINE · ${awaitingSignoff} awaiting peer sign-off`,
      "ORACLE ONLINE · DSM-5-TR / C-SSRS / MITI 4.2.1 loaded",
    ];
    if (top) {
      lines.push(`ORACLE ONLINE · top failure ${top.display} · ${top.cases} cases`);
    }
    return lines;
  }
  if (focus === "processing") {
    if (awaitingSignoff === 0 && !c)
      return ["PEER QUEUE · idle, no consultations awaiting"];
    const lines: string[] = [];
    if (awaitingSignoff > 0) {
      lines.push(`PEER QUEUE · ${awaitingSignoff} awaiting sign-off`);
    }
    if (c) {
      lines.push(`PEER QUEUE · latest ${c.targetDisplayName} × ${c.personaCode}`);
      lines.push(`severity ${c.severity} / 4 · status ${c.status}`);
    }
    lines.push("DSM-5-TR · cross-referencing presentation");
    lines.push("MITI 4.2.1 · reflection ratio check");
    return lines;
  }
  if (focus === "archives") {
    return [
      `ARCHIVES · ${totalCases} verdicts on file`,
      "ARCHIVES · sort by date, severity, status",
      "ARCHIVES · click any verdict to inspect",
    ];
  }
  return [
    `NEW WORK · ${recentApprovedCount} pairs emitted recently`,
    "NEW WORK · DPO + HH-RLHF + chat-template formats",
    "NEW WORK · approved verdicts ship to corpus",
  ];
}

/* ===========================================================
   Styles
   =========================================================== */

const ORACLE_CSS = `
.scene-3d {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: calc(100dvh - 56px);
  background:
    radial-gradient(ellipse 90% 70% at 50% 35%, oklch(13% 0.03 250) 0%, oklch(6% 0.018 250) 70%),
    oklch(4% 0.012 250);
  overflow: hidden;
  perspective: 1700px;
  perspective-origin: 50% 45%;
  isolation: isolate;
  color: oklch(94% 0.005 250);
  font-family: var(--font-sans);
}

.stage {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

/* Stations all anchor at viewport center */
.station {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-style: preserve-3d;
  transform-origin: center center;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  transition:
    transform 1.4s cubic-bezier(0.22, 0.7, 0.18, 1),
    opacity 0.85s ease-out,
    filter 0.85s ease-out,
    width 0.5s ease-out,
    height 0.5s ease-out,
    margin 0.5s ease-out;
  will-change: transform, opacity, filter;
}
.station:focus-visible {
  outline: 2px solid oklch(70% 0.20 16);
  outline-offset: 4px;
  border-radius: 12px;
}

/* APOLLO - fills the viewport at depth 1, recedes when others focus */
.station-apollo {
  width: 100%;
  height: 100%;
  margin-top: -50%;
  margin-left: -50%;
  cursor: zoom-in;
}
.station-apollo[data-focused="true"] { cursor: default; }
[data-focus="apollo"] .station-apollo {
  transform: translate3d(0, 0, 0);
  opacity: 1;
  filter: none;
}
[data-focus="processing"] .station-apollo,
[data-focus="archives"] .station-apollo,
[data-focus="newwork"] .station-apollo {
  transform: translate3d(0, -30px, -780px) scale(0.92);
  opacity: 0.55;
  filter: blur(2.4px) brightness(0.65) saturate(0.9);
  pointer-events: none;
}

.apollo-frame {
  position: absolute;
  inset: 0;
  display: block;
  -webkit-mask-image: radial-gradient(ellipse 70% 75% at 50% 45%,
    black 45%, rgba(0,0,0,0.7) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 70% 75% at 50% 45%,
    black 45%, rgba(0,0,0,0.7) 70%, transparent 100%);
}

.apollo-glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  -webkit-backdrop-filter: blur(1.6px) saturate(112%) brightness(0.96);
  backdrop-filter: blur(1.6px) saturate(112%) brightness(0.96);
  background:
    radial-gradient(ellipse 80% 75% at 50% 42%,
      transparent 30%,
      oklch(8% 0.02 250 / 0.22) 100%),
    linear-gradient(180deg,
      oklch(72% 0.18 16 / 0.04) 0%,
      transparent 45%,
      oklch(8% 0.02 250 / 0.10) 100%);
  -webkit-mask-image: radial-gradient(ellipse 72% 78% at 50% 45%,
    black 50%, rgba(0,0,0,0.6) 75%, transparent 100%);
  mask-image: radial-gradient(ellipse 72% 78% at 50% 45%,
    black 50%, rgba(0,0,0,0.6) 75%, transparent 100%);
}

.panel-card {
  display: block;
  background: linear-gradient(180deg,
    oklch(16% 0.02 250 / 0.62) 0%,
    oklch(8% 0.018 250 / 0.50) 100%);
  border: 1px solid oklch(95% 0.005 250 / 0.10);
  border-radius: 14px;
  padding: 16px 16px 14px;
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  color: oklch(92% 0.008 250);
  box-shadow:
    0 18px 40px oklch(0% 0 0 / 0.42),
    inset 0 1px 0 oklch(95% 0.005 250 / 0.06);
  transition: box-shadow 0.4s, border-color 0.4s, padding 0.4s;
}
.station[data-focused="true"] .panel-card {
  border-color: oklch(72% 0.20 16 / 0.42);
  box-shadow:
    0 30px 60px oklch(0% 0 0 / 0.55),
    0 0 0 1px oklch(72% 0.20 16 / 0.32),
    0 0 60px oklch(72% 0.20 16 / 0.18),
    inset 0 1px 0 oklch(95% 0.005 250 / 0.10);
  padding: 22px 22px 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.panel-tag {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(78% 0.20 16);
  font-weight: 600;
}
.panel-pulse {
  width: 8px; height: 8px; border-radius: 50%;
  background: oklch(72% 0.16 165);
  box-shadow: 0 0 10px oklch(72% 0.16 165);
  animation: oracleBlink 1.6s ease-in-out infinite;
}
.panel-count {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.10em;
  color: oklch(70% 0.012 250);
}
.panel-title {
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 700;
  color: oklch(96% 0.008 250);
  letter-spacing: -0.012em;
  margin: 8px 0 4px;
  line-height: 1.2;
}
.panel-line {
  font-family: var(--font-sans);
  font-size: 12px;
  color: oklch(74% 0.012 250);
  margin: 0;
  line-height: 1.45;
}

.panel-body {
  margin-top: 10px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.7s ease-out, opacity 0.5s ease-out, margin-top 0.4s;
  pointer-events: none;
}
.station[data-focused="true"] .panel-body {
  max-height: 1100px;
  opacity: 1;
  margin-top: 14px;
  pointer-events: auto;
}

/* Processing — to the LEFT at rest */
.station-processing {
  width: 320px;
  margin-top: -130px;
  margin-left: -160px;
}
[data-focus="apollo"] .station-processing {
  transform: translate3d(-460px, -130px, -180px) rotateY(22deg);
  opacity: 0.95;
}
[data-focus="processing"] .station-processing {
  transform: translate3d(-200px, -40px, 220px) rotateY(0deg);
  opacity: 1;
  width: 540px;
  margin-left: -270px;
}
[data-focus="archives"] .station-processing,
[data-focus="newwork"] .station-processing {
  transform: translate3d(-560px, -130px, -560px) rotateY(28deg);
  opacity: 0.28;
  filter: blur(1.4px);
}

.station-archives {
  width: 320px;
  margin-top: -130px;
  margin-left: -160px;
}
[data-focus="apollo"] .station-archives {
  transform: translate3d(460px, -130px, -180px) rotateY(-22deg);
  opacity: 0.95;
}
[data-focus="archives"] .station-archives {
  transform: translate3d(200px, -40px, 220px) rotateY(0deg);
  opacity: 1;
  width: 540px;
  margin-left: -270px;
}
[data-focus="processing"] .station-archives,
[data-focus="newwork"] .station-archives {
  transform: translate3d(560px, -130px, -560px) rotateY(-28deg);
  opacity: 0.28;
  filter: blur(1.4px);
}

.station-newwork {
  width: 360px;
  margin-top: -100px;
  margin-left: -180px;
}
[data-focus="apollo"] .station-newwork {
  transform: translate3d(0, 230px, -180px) rotateX(-15deg);
  opacity: 0.95;
}
[data-focus="newwork"] .station-newwork {
  transform: translate3d(0, 60px, 220px) rotateX(0deg);
  opacity: 1;
  width: 720px;
  margin-left: -360px;
}
[data-focus="processing"] .station-newwork,
[data-focus="archives"] .station-newwork {
  transform: translate3d(0, 360px, -560px) rotateX(-25deg);
  opacity: 0.28;
  filter: blur(1.4px);
}

.panel-status-stream {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: oklch(8% 0.018 250 / 0.6);
  border: 1px solid oklch(95% 0.005 250 / 0.06);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: oklch(82% 0.012 250);
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.panel-btn {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.panel-btn-primary {
  background: oklch(78% 0.20 16);
  color: oklch(15% 0.02 250);
  border: 1px solid oklch(82% 0.22 16);
}
.panel-btn-primary:hover { background: oklch(82% 0.22 16); }
.panel-btn-ghost {
  background: transparent;
  color: oklch(94% 0.008 250);
  border: 1px solid oklch(95% 0.005 250 / 0.18);
}
.panel-btn-ghost:hover { border-color: oklch(95% 0.005 250 / 0.3); }
.panel-foot {
  margin: 10px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: oklch(60% 0.012 250);
  letter-spacing: 0.06em;
}

/* Sign-off list */
.signoff-list {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: oklch(8% 0.018 250 / 0.5);
  border: 1px solid oklch(95% 0.005 250 / 0.06);
  border-radius: 8px;
  overflow: hidden;
}
.signoff-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1.2fr) minmax(0, 1.3fr) 48px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: oklch(94% 0.008 250);
  border-bottom: 1px solid oklch(95% 0.005 250 / 0.04);
}
.signoff-id {
  color: oklch(78% 0.20 16);
  font-weight: 700;
  letter-spacing: 0.04em;
}
.signoff-target {
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 500;
  color: oklch(95% 0.008 250);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.signoff-peer {
  font-family: var(--font-sans);
  font-size: 12px;
  color: oklch(82% 0.012 250);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.signoff-when {
  font-size: 10.5px;
  color: oklch(60% 0.012 250);
  text-align: right;
}

/* Target stat grid in archives */
.target-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.target-stat {
  padding: 10px 12px;
  background: oklch(8% 0.018 250 / 0.5);
  border: 1px solid oklch(95% 0.005 250 / 0.06);
  border-radius: 8px;
}
.target-stat-name {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  color: oklch(95% 0.008 250);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.target-stat-row {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: oklch(72% 0.012 250);
}
.target-stat-row [data-warn] { color: oklch(78% 0.20 16); font-weight: 600; }

/* Archives list */
.archive-list {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: oklch(8% 0.018 250 / 0.5);
  border: 1px solid oklch(95% 0.005 250 / 0.06);
  border-radius: 8px;
  overflow: hidden;
}
.archive-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 60px 22px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  text-decoration: none;
  color: oklch(94% 0.008 250);
  font-family: var(--font-mono);
  font-size: 11.5px;
  transition: background 100ms;
  border-bottom: 1px solid oklch(95% 0.005 250 / 0.04);
}
.archive-row:hover { background: oklch(95% 0.005 250 / 0.06); }
.archive-num {
  color: oklch(78% 0.20 16);
  font-weight: 700;
  letter-spacing: 0.04em;
}
.archive-title {
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 500;
  color: oklch(95% 0.008 250);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.archive-sev {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: oklch(15% 0.02 250);
}
.archive-sev[data-level="0"] { background: oklch(72% 0.16 165); }
.archive-sev[data-level="1"] { background: oklch(72% 0.13 165); }
.archive-sev[data-level="2"] { background: oklch(76% 0.16 70); }
.archive-sev[data-level="3"] { background: oklch(70% 0.20 30); color: white; }
.archive-sev[data-level="4"] { background: oklch(60% 0.24 16); color: white; }
.archive-status {
  font-family: var(--font-mono);
  font-size: 13px;
  text-align: right;
}
.archive-status[data-status="approved"] { color: oklch(72% 0.16 165); }
.archive-status[data-status="in-review"] { color: oklch(76% 0.16 70); }
.archive-status[data-status="draft"] { color: oklch(58% 0.012 250); }

.newwork-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.newwork-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: oklch(8% 0.018 250 / 0.5);
  border: 1px solid oklch(95% 0.005 250 / 0.06);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 100ms, border-color 100ms;
}
.newwork-card:hover {
  background: oklch(95% 0.005 250 / 0.05);
  border-color: oklch(78% 0.20 16 / 0.3);
}
.newwork-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.newwork-num {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: oklch(78% 0.20 16);
}
.newwork-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: oklch(94% 0.008 250);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.newwork-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.newwork-badges span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border-radius: 3px;
  background: oklch(95% 0.005 250 / 0.06);
  color: oklch(72% 0.012 250);
}
.empty {
  margin: 0 0 12px;
  padding: 20px 16px;
  background: oklch(8% 0.018 250 / 0.5);
  border: 1px dashed oklch(95% 0.005 250 / 0.1);
  border-radius: 8px;
  text-align: center;
  font-family: var(--font-sans);
  font-size: 12px;
  color: oklch(70% 0.012 250);
}

.oracle-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 95% 90% at 50% 45%, transparent 50%, oklch(3% 0.01 250 / 0.85) 100%);
  pointer-events: none;
  z-index: 6;
}
.oracle-scan {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    180deg,
    transparent 0 2px,
    oklch(95% 0.005 250 / 0.022) 2px 3px
  );
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 6;
  opacity: 0.6;
}

.console-glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background:
    linear-gradient(180deg,
      oklch(8% 0.02 250 / 0.20) 0%,
      transparent 28%,
      transparent 72%,
      oklch(8% 0.02 250 / 0.35) 100%),
    radial-gradient(ellipse 100% 55% at 50% 0%,
      oklch(72% 0.18 16 / 0.07) 0%,
      transparent 60%),
    radial-gradient(ellipse 95% 70% at 50% 100%,
      oklch(8% 0.02 250 / 0.30) 0%,
      transparent 65%);
  box-shadow: inset 0 1px 0 oklch(95% 0.005 250 / 0.05);
}

/* Top HUD */
.hud {
  position: absolute;
  z-index: 7;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: oklch(82% 0.012 250);
  text-shadow: 0 1px 6px oklch(0% 0 0 / 0.6);
  pointer-events: none;
}
.hud-tl { top: 24px; left: 28px; display: flex; flex-direction: column; gap: 6px; }
.hud-mark { width: 28px; height: 28px; display: grid; place-items: center; margin-bottom: 6px; }
.hud-name {
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: oklch(96% 0.01 250);
  margin-bottom: 4px;
}
.hud-list {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 3px;
  color: oklch(72% 0.012 250);
  font-size: 10.5px;
  letter-spacing: 0.18em;
}
.hud-tr { top: 24px; right: 28px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.hud-tr-row { font-size: 11px; }
.hud-tr-sol { color: oklch(70% 0.012 250); letter-spacing: 0.22em; }
.hud-tr-greek { color: oklch(85% 0.018 18); font-family: var(--font-serif); font-size: 13px; letter-spacing: 0.04em; margin-top: 4px; }
.hud-tr-caps { color: oklch(70% 0.22 16); font-weight: 700; letter-spacing: 0.18em; margin-top: 2px; }
.hud-tr-meta {
  display: flex; gap: 6px; align-items: center;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: oklch(60% 0.012 250);
  margin-top: 12px;
  text-transform: none;
}
.hud-tr-depth {
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: oklch(78% 0.20 16);
  font-weight: 600;
}

.bottom-bar {
  position: absolute;
  left: 0; right: 0; bottom: 18px;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  pointer-events: none;
}
.oracle-blink {
  width: 6px; height: 6px; border-radius: 50%;
  background: oklch(72% 0.16 165);
  box-shadow: 0 0 8px oklch(72% 0.16 165);
  animation: oracleBlink 1.4s ease-in-out infinite;
}

.focus-nav {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: oklch(8% 0.018 250 / 0.7);
  border: 1px solid oklch(95% 0.005 250 / 0.10);
  border-radius: 14px;
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  pointer-events: auto;
  box-shadow: 0 12px 30px oklch(0% 0 0 / 0.5);
}
.focus-dot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: oklch(74% 0.012 250);
  cursor: pointer;
  font-family: var(--font-mono);
  text-align: left;
  transition: background 120ms, color 120ms, border-color 120ms;
  min-width: 130px;
}
.focus-dot:hover {
  background: oklch(95% 0.005 250 / 0.05);
  color: oklch(94% 0.01 250);
}
.focus-dot[data-active="true"] {
  background: linear-gradient(180deg, oklch(78% 0.20 16 / 0.18), oklch(78% 0.20 16 / 0.08));
  border-color: oklch(78% 0.20 16 / 0.45);
  color: oklch(96% 0.008 250);
  box-shadow: inset 0 0 0 1px oklch(78% 0.20 16 / 0.12), 0 0 18px oklch(78% 0.20 16 / 0.18);
}
.focus-num {
  font-size: 9.5px;
  letter-spacing: 0.20em;
  color: oklch(60% 0.012 250);
}
.focus-dot[data-active="true"] .focus-num { color: oklch(78% 0.20 16); }
.focus-label {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: inherit;
}
.focus-sub {
  font-size: 10px;
  letter-spacing: 0.10em;
  color: oklch(58% 0.012 250);
  text-transform: lowercase;
}

@keyframes oracleBlink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

/* ── Apollo console (depth 1 — proactive trends + chat) ────────
   No bubbles, no eyebrow header, no card backgrounds. Apollo speaks
   directly into the scene; the operator's prompts sit between his lines
   in small monospace so the conversation reads like a transcript with
   only one font carrying the voice. */
.apollo-console {
  position: absolute;
  left: 50%;
  bottom: 110px;
  transform: translateX(-50%) translateY(6px);
  width: min(720px, 92vw);
  z-index: 7;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.apollo-console > * { pointer-events: auto; }
.apollo-console[data-visible="true"] {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.console-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(38dvh, 320px);
  overflow-y: auto;
  padding: 4px 6px 2px;
  /* Smooth scrolling is handled by an rAF easer in JS; CSS smooth-scroll
     restarts on each scrollTop assignment which produces visible jitter
     when many small assignments arrive during streaming. */
  scrollbar-width: thin;
  scrollbar-color: oklch(40% 0.012 250 / 0.5) transparent;
  -webkit-mask-image: linear-gradient(180deg,
    transparent 0%,
    black 18px,
    black calc(100% - 8px),
    transparent 100%);
  mask-image: linear-gradient(180deg,
    transparent 0%,
    black 18px,
    black calc(100% - 8px),
    transparent 100%);
}
.console-scroll::-webkit-scrollbar { width: 4px; }
.console-scroll::-webkit-scrollbar-thumb {
  background: oklch(40% 0.012 250 / 0.4);
  border-radius: 999px;
}

.console-placeholder {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(68% 0.012 250);
  text-shadow: 0 1px 6px oklch(0% 0 0 / 0.6);
}

/* Apollo's voice — serif italic, white, no background. Words mount with the
   same cascading reveal as the sidebar speech (.apollo-word in globals.css),
   but slowed for the console so the operator can read along. */
.apollo-line {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 15.5px;
  line-height: 1.5;
  letter-spacing: -0.003em;
  color: white;
  text-shadow:
    0 1px 8px oklch(0% 0 0 / 0.7),
    0 0 22px oklch(0% 0 0 / 0.45);
  white-space: pre-wrap;
}
/* In the console we want a stable baseline — the sidebar's translateY
   reveal causes visible bobbing when words mount one at a time and the
   paragraph wraps mid-stream. Override transform to none and use a
   fade-only keyframe so the line height stays put. */
.apollo-line .apollo-word {
  transform: none;
  animation: apollo-word-fade 1100ms cubic-bezier(0.22, 0.7, 0.18, 1) forwards;
}
@keyframes apollo-word-fade {
  0%   { opacity: 0; filter: blur(3px); }
  60%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; filter: blur(0); }
}

/* Operator's prompt — small monospace, no background. Single line label
   prefixes each turn so the eye can find them between Apollo's paragraphs. */
.user-line {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: oklch(78% 0.012 250);
  letter-spacing: 0.02em;
}
.user-prompt {
  color: oklch(72% 0.20 16);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  flex: none;
}
.user-text {
  color: oklch(86% 0.012 250);
  white-space: pre-wrap;
  word-break: break-word;
}

/* Chat input — minimal pill, no card. */
.console-chat-form {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 6px 10px;
  background: oklch(10% 0.018 250 / 0.78);
  border: 1px solid oklch(95% 0.005 250 / 0.12);
  border-radius: 10px;
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  box-shadow: 0 10px 24px oklch(0% 0 0 / 0.4);
}
.console-chat-input {
  flex: 1;
  resize: none;
  background: transparent;
  border: 0;
  outline: none;
  color: oklch(96% 0.008 250);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.4;
  padding: 4px 2px;
  min-height: 22px;
  max-height: 96px;
}
.console-chat-input::placeholder {
  color: oklch(60% 0.012 250);
}
.console-chat-send {
  height: 28px;
  padding: 0 12px;
  border-radius: 7px;
  background: oklch(78% 0.20 16);
  color: oklch(15% 0.02 250);
  border: 1px solid oklch(82% 0.22 16);
  font-family: var(--font-sans);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 120ms, opacity 120ms;
}
.console-chat-send:hover { background: oklch(82% 0.22 16); }
.console-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* Status line living inside the top-right HUD. */
.hud-tr-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: oklch(78% 0.012 250);
  text-transform: none;
  pointer-events: auto;
  max-width: 320px;
}
.hud-tr-status .oracle-blink {
  flex: none;
}
.hud-tr-status-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1100px) {
  [data-focus="apollo"] .station-processing { transform: translate3d(-360px, -130px, -180px) rotateY(22deg); }
  [data-focus="apollo"] .station-archives { transform: translate3d(360px, -130px, -180px) rotateY(-22deg); }
  [data-focus="processing"] .station-processing,
  [data-focus="archives"] .station-archives { width: 480px; margin-left: -240px; }
  [data-focus="newwork"] .station-newwork { width: 600px; margin-left: -300px; }
  .focus-dot { min-width: 100px; padding: 6px 10px; }
  .focus-label { font-size: 12px; }
}

@media (max-width: 760px) {
  .hud-list, .hud-tr-meta { display: none; }
  [data-focus="apollo"] .station-processing,
  [data-focus="apollo"] .station-archives,
  [data-focus="apollo"] .station-newwork {
    opacity: 0.55;
    transform: translate3d(0, 0, -800px);
  }
  [data-focus="processing"] .station-processing,
  [data-focus="archives"] .station-archives {
    width: calc(100vw - 48px);
    margin-left: calc((100vw - 48px) / -2);
    transform: translate3d(0, -40px, 200px);
  }
  [data-focus="newwork"] .station-newwork {
    width: calc(100vw - 48px);
    margin-left: calc((100vw - 48px) / -2);
    transform: translate3d(0, 40px, 200px) rotateX(0);
  }
  .newwork-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .focus-nav { flex-wrap: wrap; justify-content: center; }
  .apollo-console { width: calc(100vw - 24px); bottom: 100px; }
  .apollo-line { font-size: 14.5px; }
  .hud-tr-status { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .station, .panel-card, .panel-body { transition: none !important; }
  .panel-pulse, .oracle-blink { animation: none !important; }
  .apollo-word { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
  .apollo-console { transition: none !important; }
}
`;
