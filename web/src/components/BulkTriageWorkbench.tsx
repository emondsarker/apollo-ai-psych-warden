"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApolloLine } from "./ApolloLine";
import { PeerAvatar } from "./PeerAvatar";
import { findPeer, type Peer } from "@/lib/peers";
import type { Recommendation } from "@/lib/apollo-recommend";
import type { TriageThread } from "@/lib/triage";
import { severityLabel } from "@/lib/triage";

type AiPeerDecision = {
  decision: "approved" | "returned" | "escalated";
  note: string;
  reasoning: string;
};
type AiDirectorDecision = {
  decision: "approved" | "returned";
  note: string;
  reasoning: string;
};
type AiReviewRecord = {
  juniorPeerId: string;
  juniorDecision: AiPeerDecision;
  directorPeerId?: string;
  directorDecision?: AiDirectorDecision;
  finalDecision: "approved" | "returned" | "rejected";
  finalNote: string;
  finalDeciderPeerId: string;
  model: string;
  decidedAt: string;
};

type ParsedFile =
  | {
      name: string;
      size: number;
      status: "ok";
      detectedFormat: string;
      turnCount: number;
      thread: TriageThread;
      rawText: null;
    }
  | {
      name: string;
      size: number;
      status: "needs-llm-format";
      detectedFormat: string;
      turnCount: null;
      thread: null;
      rawText: string;
    }
  | {
      name: string;
      size: number;
      status: "error";
      error: string;
    };

type RetryInfo = { attempt: number; model: string; reason: string };

type AnalyzedPayload = {
  thread: TriageThread;
  results: Record<string, unknown>;
  recommendation: Recommendation;
  assignedTo: string;
  apolloLine: string | null;
  severity: number;
  headline: string | null;
  retries: number;
};

type RowState =
  | { kind: "queued" }
  | { kind: "analyzing"; stage: string; retry?: RetryInfo }
  | ({ kind: "analyzed" } & AnalyzedPayload)
  | ({
      kind: "reviewing";
      phase: "junior" | "director";
      peerId: string;
      juniorDecision?: AiPeerDecision;
    } & AnalyzedPayload)
  | ({
      kind: "reviewed";
      review: AiReviewRecord;
    } & AnalyzedPayload)
  | { kind: "filing" }
  | {
      kind: "filed";
      signoffId: string;
      assignedTo: string;
      severity: number;
      headline: string | null;
      review?: AiReviewRecord;
    }
  | { kind: "error"; message: string; phase: "analyze" | "review" | "file"; retries: number };

type Row = {
  parsed: ParsedFile;
  state: RowState;
};

export function BulkTriageWorkbench({
  peers,
}: {
  peers: Peer[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [filing, setFiling] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  // Mirror autopilot in a ref so async loops don't capture stale closures.
  const autopilotRef = useRef(autopilot);
  useEffect(() => {
    autopilotRef.current = autopilot;
  }, [autopilot]);

  async function uploadFile(file: File) {
    setBusy(true);
    setParseError(null);
    setRows(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/triage/bulk/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const files = (data.files as ParsedFile[]) ?? [];
      setRows(
        files.map((f) => ({
          parsed: f,
          state: { kind: "queued" } as RowState,
        })),
      );
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setRows(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyzeAll() {
    if (!rows || analyzing) return;
    setAnalyzing(true);
    try {
      const targets = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.parsed.status !== "error" && r.state.kind === "queued");
      // Sequential — each thread is 6 LLM stages, parallel would saturate.
      for (const { i } of targets) {
        await analyzeOne(i);
        if (autopilotRef.current) {
          // Pipeline keeps moving: review then file without waiting on the
          // operator. If any step errors, the row stays errored and the next
          // thread proceeds — we don't want one bad row to halt a batch.
          if (peekKind(i) === "analyzed") {
            await reviewOne(i);
            if (peekKind(i) === "reviewed") await fileRow(i);
          }
        }
      }
    } finally {
      setAnalyzing(false);
      if (autopilotRef.current) router.refresh();
    }
  }

  async function reviewAllAnalyzed() {
    if (!rows || analyzing || filing) return;
    setAnalyzing(true);
    try {
      const targets = (rowsRef.current ?? [])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.state.kind === "analyzed");
      for (const { i } of targets) {
        await reviewOne(i);
        if (peekKind(i) === "reviewed") await fileRow(i);
      }
    } finally {
      setAnalyzing(false);
      router.refresh();
    }
  }

  // Helper that re-reads the row's current state kind without TypeScript
  // narrowing it across await boundaries (which would otherwise lock subsequent
  // comparisons into a stale type after the first comparison).
  function peekKind(i: number): RowState["kind"] | undefined {
    return rowsRef.current?.[i]?.state.kind;
  }

  async function retryAllFailed() {
    if (!rows || analyzing || filing) return;
    setAnalyzing(true);
    try {
      const targets = (rowsRef.current ?? [])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.state.kind === "error");
      for (const { i, r } of targets) {
        if (r.state.kind !== "error") continue;
        // We can't resume from a file-phase error without the analyzed
        // payload; nudge the operator to re-analyze from scratch.
        await analyzeOne(i);
        if (autopilotRef.current && peekKind(i) === "analyzed") {
          await reviewOne(i);
          if (peekKind(i) === "reviewed") await fileRow(i);
        }
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function analyzeOne(index: number) {
    const row = rowsRef.current?.[index];
    if (!row || row.parsed.status === "error") return;
    const priorRetries =
      row.state.kind === "error"
        ? row.state.retries
        : row.state.kind === "analyzed" || row.state.kind === "reviewed"
          ? row.state.retries
          : 0;
    updateRow(index, { kind: "analyzing", stage: "starting" });

    const body =
      row.parsed.status === "ok"
        ? { fileName: row.parsed.name, thread: row.parsed.thread, rawText: null }
        : { fileName: row.parsed.name, thread: null, rawText: row.parsed.rawText };

    let currentStage = "starting";
    let retryCount = 0;
    try {
      const res = await fetch("/api/triage/bulk/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let event: {
            type: string;
            name?: string;
            status?: string;
            stage?: string;
            attempt?: number;
            model?: string;
            reason?: string;
            error?: string;
            message?: string;
            thread?: TriageThread;
            results?: Record<string, unknown>;
            recommendation?: Recommendation;
            apolloLine?: string | null;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "stage" && event.status === "started") {
            currentStage = event.name ?? "?";
            updateRow(index, { kind: "analyzing", stage: currentStage });
          } else if (event.type === "retry" && event.attempt && event.model && event.reason) {
            retryCount += 1;
            updateRow(index, {
              kind: "analyzing",
              stage: event.stage ?? currentStage,
              retry: {
                attempt: event.attempt,
                model: event.model,
                reason: event.reason,
              },
            });
          } else if (event.type === "analyzed" && event.recommendation && event.thread && event.results) {
            const verdict = (event.results.verdict ?? null) as
              | { overallSeverity?: number; headline?: string }
              | null;
            updateRow(index, {
              kind: "analyzed",
              thread: event.thread,
              results: event.results,
              recommendation: event.recommendation,
              assignedTo: event.recommendation.peerId,
              apolloLine: event.apolloLine ?? null,
              severity: verdict?.overallSeverity ?? 0,
              headline: verdict?.headline ?? null,
              retries: priorRetries + retryCount,
            });
          } else if (event.type === "error" && event.message) {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      updateRow(index, {
        kind: "error",
        message: humanizeError(e, currentStage),
        phase: "analyze",
        retries: priorRetries + 1,
      });
    }
  }

  async function reviewOne(index: number) {
    const row = rowsRef.current?.[index];
    if (!row) return;
    if (row.state.kind !== "analyzed") return;
    const payload: AnalyzedPayload = row.state;

    // Seed the row in reviewing state so the UI flips immediately.
    updateRow(index, {
      kind: "reviewing",
      phase: payload.severity >= 4 ? "director" : "junior",
      peerId: payload.severity >= 4 ? "elena" : payload.assignedTo,
      ...payload,
    });

    try {
      const res = await fetch("/api/triage/auto-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: payload.thread,
          results: payload.results,
          assignedTo: payload.assignedTo,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let juniorDecision: AiPeerDecision | undefined;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let event: {
            type: string;
            peerId?: string;
            role?: "junior" | "director";
            decision?: AiPeerDecision | AiDirectorDecision;
            review?: AiReviewRecord;
            message?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "phase" && event.role && event.peerId) {
            updateRow(index, {
              kind: "reviewing",
              phase: event.role,
              peerId: event.peerId,
              juniorDecision,
              ...payload,
            });
          } else if (event.type === "decision" && event.role === "junior" && event.decision) {
            juniorDecision = event.decision as AiPeerDecision;
          } else if (event.type === "reviewed" && event.review) {
            updateRow(index, {
              kind: "reviewed",
              review: event.review,
              ...payload,
            });
          } else if (event.type === "error" && event.message) {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      updateRow(index, {
        kind: "error",
        message: humanizeError(e, "auto-review"),
        phase: "review",
        retries: payload.retries + 1,
      });
    }
  }

  async function fileRow(index: number) {
    const row = rowsRef.current?.[index];
    if (!row) return;
    // Retry-from-error path: if we crashed during filing, the prior analysis
    // is gone but we can't re-analyze either; surface the error and bail.
    if (row.state.kind === "error" && row.state.phase === "file") {
      // Caller already removed the analyzed payload; user has to re-analyze.
      return;
    }
    if (row.state.kind !== "analyzed" && row.state.kind !== "reviewed") return;
    const payload: AnalyzedPayload = row.state;
    const review = row.state.kind === "reviewed" ? row.state.review : undefined;
    const { thread, results, assignedTo, severity, headline, recommendation, retries } = payload;
    updateRow(index, { kind: "filing" });
    try {
      const res = await fetch("/api/triage/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread,
          results,
          trainingPair: null,
          postmortemMarkdown: null,
          assignedTo,
          note: `Bulk-triaged from ${row.parsed.status === "error" ? "?" : row.parsed.name}. ${recommendation.reason}`,
          aiReview: review,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      updateRow(index, {
        kind: "filed",
        signoffId: data.id,
        assignedTo,
        severity,
        headline,
        review,
      });
    } catch (e) {
      updateRow(index, {
        kind: "error",
        message: humanizeError(e, "file"),
        phase: "file",
        retries: (retries ?? 0) + 1,
      });
    }
  }

  async function fileAllAnalyzed() {
    if (!rows || filing) return;
    setFiling(true);
    try {
      const targets = (rowsRef.current ?? [])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.state.kind === "analyzed");
      for (const { i } of targets) {
        await fileRow(i);
      }
    } finally {
      setFiling(false);
      router.refresh();
    }
  }

  // Keep a synchronous ref to the latest rows so async analyze/file loops
  // can read fresh state without setState closures going stale.
  const rowsRef = useRef<Row[] | null>(null);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  function updateRow(idx: number, state: RowState) {
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], state };
      return next;
    });
  }

  function reassignRow(idx: number, peerId: string) {
    setRows((prev) => {
      if (!prev) return prev;
      const r = prev[idx];
      if (r.state.kind !== "analyzed") return prev;
      const next = [...prev];
      next[idx] = { ...r, state: { ...r.state, assignedTo: peerId } };
      return next;
    });
  }

  const okCount = rows?.filter((r) => r.parsed.status === "ok").length ?? 0;
  const llmCount = rows?.filter((r) => r.parsed.status === "needs-llm-format").length ?? 0;
  const parseErrCount = rows?.filter((r) => r.parsed.status === "error").length ?? 0;
  const queuedCount = rows?.filter((r) => r.state.kind === "queued" && r.parsed.status !== "error").length ?? 0;
  const analyzedCount = rows?.filter((r) => r.state.kind === "analyzed").length ?? 0;
  const reviewedCount = rows?.filter((r) => r.state.kind === "reviewed").length ?? 0;
  const filedCount = rows?.filter((r) => r.state.kind === "filed").length ?? 0;
  const failedCount = rows?.filter((r) => r.state.kind === "error").length ?? 0;
  const totalReady = okCount + llmCount;

  const apolloHeader = computeApolloHeader({
    rows,
    analyzing,
    filing,
    queuedCount,
    analyzedCount,
    filedCount,
    failedCount,
    reviewedCount,
    totalReady,
    parseError,
    autopilot,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>
          Bulk
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.018em",
            color: "var(--text-1)",
            margin: 0,
          }}
        >
          Drop a zip of conversations.
        </h1>
        <ApolloLine text={apolloHeader} />
      </header>

      {!rows && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) uploadFile(file);
          }}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: 14,
            background: dragging ? "var(--accent-soft)" : "var(--app-surface)",
            padding: "44px 24px",
            textAlign: "center",
            transition: "background 120ms ease-out, border-color 120ms ease-out",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              margin: "0 auto 16px",
              background: "var(--brand-ink)",
              color: "white",
              display: "grid",
              placeItems: "center",
              boxShadow:
                "0 0 0 1px oklch(52% 0.22 16 / 0.4), 0 6px 22px oklch(52% 0.22 16 / 0.18)",
            }}
            aria-hidden
          >
            <UploadIcon />
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 16,
              color: "var(--text-1)",
              marginBottom: 6,
            }}
          >
            Drop a .zip here
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
              marginBottom: 18,
            }}
          >
            up to 50 MB · 200 files · supports .json .jsonl .ndjson .csv .txt .md .log
          </div>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn btn-primary"
              style={{ height: 36, padding: "0 18px" }}
            >
              {busy ? "Reading…" : "Choose file"}
            </button>
            <a
              href="/primum-bulk-sample.zip"
              download
              className="btn btn-ghost"
              style={{ height: 36, padding: "0 14px", textDecoration: "none" }}
            >
              Download sample zip
            </a>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
            }}
          />
          {parseError && (
            <div
              style={{
                marginTop: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--accent)",
              }}
            >
              {parseError}
            </div>
          )}
        </div>
      )}

      {rows && (
        <>
          <AutopilotBanner
            on={autopilot}
            onToggle={() => setAutopilot((x) => !x)}
            disabled={analyzing || filing}
          />
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              padding: "10px 14px",
              background: "var(--app-surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--text-1)" }}>{rows.length}</strong> files ·{" "}
              <span style={{ color: "var(--success)" }}>{totalReady} ready</span>
              {parseErrCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--text-3)" }}>{parseErrCount} skipped</span>
                </>
              )}
              {analyzedCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--text-1)" }}>{analyzedCount} analyzed</span>
                </>
              )}
              {filedCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--success)" }}>{filedCount} filed</span>
                </>
              )}
              {failedCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--accent)" }}>{failedCount} failed</span>
                </>
              )}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={reset}
                disabled={analyzing || filing}
                className="btn btn-ghost"
                style={{ height: 32, padding: "0 12px", fontSize: 12 }}
              >
                Discard
              </button>
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={retryAllFailed}
                  disabled={analyzing || filing}
                  className="btn btn-ghost"
                  style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                >
                  Retry {failedCount} failed
                </button>
              )}
              {analyzedCount > 0 && !autopilot && (
                <button
                  type="button"
                  onClick={reviewAllAnalyzed}
                  disabled={analyzing || filing}
                  className="btn btn-ghost"
                  style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                >
                  AI-review {analyzedCount}
                </button>
              )}
              {analyzedCount + reviewedCount > 0 && (
                <button
                  type="button"
                  onClick={fileAllAnalyzed}
                  disabled={analyzing || filing}
                  className="btn btn-primary"
                  style={{ height: 32, padding: "0 16px", fontSize: 13 }}
                >
                  {filing
                    ? `Filing…`
                    : `File ${analyzedCount + reviewedCount} ${
                        analyzedCount + reviewedCount === 1 ? "case" : "cases"
                      }`}
                </button>
              )}
              {queuedCount > 0 && (
                <button
                  type="button"
                  onClick={analyzeAll}
                  disabled={analyzing || filing}
                  className="btn btn-primary"
                  style={{ height: 32, padding: "0 16px", fontSize: 13 }}
                >
                  {analyzing
                    ? autopilot
                      ? `Auto-piloting…`
                      : `Analyzing…`
                    : autopilot
                      ? `Auto-triage ${queuedCount} ${queuedCount === 1 ? "thread" : "threads"}`
                      : `Analyze ${queuedCount} ${queuedCount === 1 ? "thread" : "threads"}`}
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--app-surface)",
            }}
          >
            {rows.map((row, i) => (
              <FileRow
                key={i}
                row={row}
                peers={peers}
                disabled={analyzing || filing}
                onReassign={(peerId) => reassignRow(i, peerId)}
                onFile={() => fileRow(i)}
                onRetry={() => analyzeOne(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FileRow({
  row,
  peers,
  disabled,
  onReassign,
  onFile,
  onRetry,
}: {
  row: Row;
  peers: Peer[];
  disabled: boolean;
  onReassign: (peerId: string) => void;
  onFile: () => void;
  onRetry: () => void;
}) {
  const isError = row.parsed.status === "error";
  const headerLine =
    row.state.kind === "analyzed"
      ? row.state.headline ?? `${row.parsed.status === "error" ? "?" : row.parsed.detectedFormat} · ${row.parsed.status === "ok" ? row.parsed.turnCount : "?"} turns`
      : row.parsed.status === "error"
        ? row.parsed.error
        : `${row.parsed.detectedFormat} · ${row.parsed.status === "ok" ? `${row.parsed.turnCount} turns` : "needs LLM format"}`;

  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
        opacity: isError ? 0.7 : 1,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 18,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.parsed.name}
          </div>
          <div
            style={{
              fontFamily: row.state.kind === "analyzed" ? "var(--font-serif)" : "var(--font-mono)",
              fontSize: row.state.kind === "analyzed" ? 14 : 12,
              color: "var(--text-1)",
              lineHeight: 1.4,
            }}
          >
            {headerLine}
          </div>
          {row.state.kind === "analyzed" && row.state.apolloLine && (
            <div
              style={{
                marginTop: 6,
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--text-2)",
                lineHeight: 1.5,
                paddingLeft: 12,
                borderLeft: "2px solid var(--accent)",
              }}
            >
              {row.state.apolloLine}
            </div>
          )}
        </div>
        <RowStatus state={row.state} onRetry={onRetry} disabled={disabled} />
      </div>

      {row.state.kind === "reviewing" && <ReviewingBlock state={row.state} />}

      {row.state.kind === "reviewed" && (
        <ReviewedBlock state={row.state} disabled={disabled} onFile={onFile} />
      )}

      {row.state.kind === "analyzed" && (
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12,
            alignItems: "center",
            background: "var(--app-surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <SeverityChip severity={row.state.severity} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              Apollo recommends
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--text-2)",
                lineHeight: 1.4,
              }}
            >
              {row.state.recommendation.reason}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PeerSelect
              peers={peers}
              value={row.state.assignedTo}
              onChange={onReassign}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={onFile}
              disabled={disabled}
              className="btn btn-primary"
              style={{ height: 30, padding: "0 12px", fontSize: 12 }}
            >
              File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeerSelect({
  peers,
  value,
  onChange,
  disabled,
}: {
  peers: Peer[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 30,
        padding: "0 8px",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--text-1)",
        minWidth: 0,
        maxWidth: 220,
      }}
    >
      {peers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} · {p.role}
        </option>
      ))}
    </select>
  );
}

function SeverityChip({ severity }: { severity: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        padding: "4px 10px",
        background: `var(--sev-${severity})`,
        color: "white",
        borderRadius: 4,
        fontWeight: 700,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      sev {severity} · {severityLabel(severity)}
    </span>
  );
}

function RowStatus({
  state,
  onRetry,
  disabled,
}: {
  state: RowState;
  onRetry: () => void;
  disabled: boolean;
}) {
  if (state.kind === "queued") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-3)",
        }}
      >
        Queued
      </span>
    );
  }
  if (state.kind === "analyzing") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--warn)",
          letterSpacing: "0.04em",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Spinner /> {state.stage}
        {state.retry && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              fontStyle: "italic",
            }}
          >
            · retry {state.retry.attempt} on {modelLabel(state.retry.model)}
          </span>
        )}
      </span>
    );
  }
  if (state.kind === "analyzed") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {state.retries > 0 && (
          <span
            title={`Recovered after ${state.retries} ${state.retries === 1 ? "retry" : "retries"}`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-3)",
              fontStyle: "italic",
            }}
          >
            ↻ {state.retries}
          </span>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            padding: "3px 8px",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            border: "1px solid var(--accent)",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 700,
          }}
        >
          ready to file
        </span>
      </span>
    );
  }
  if (state.kind === "reviewing") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--accent)",
          letterSpacing: "0.04em",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Spinner /> {state.phase === "director" ? "director read" : "peer read"}
      </span>
    );
  }
  if (state.kind === "reviewed") {
    const tone =
      state.review.finalDecision === "approved" ? "var(--success)" : "var(--accent)";
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          padding: "3px 8px",
          background: state.review.finalDecision === "approved" ? "var(--success-soft)" : "var(--accent-soft)",
          color: tone,
          border: `1px solid ${tone}`,
          borderRadius: 4,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 700,
        }}
      >
        bench: {state.review.finalDecision}
      </span>
    );
  }
  if (state.kind === "filing") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--warn)",
        }}
      >
        <Spinner /> filing
      </span>
    );
  }
  if (state.kind === "filed") {
    const decisionLabel = state.review
      ? `✓ ${state.review.finalDecision} · ${findPeer(state.review.finalDeciderPeerId)?.name.split(" ").slice(-1)[0] ?? ""} →`
      : "✓ filed →";
    return (
      <Link
        href={`/signoffs/${state.signoffId}`}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color:
            state.review?.finalDecision === "returned"
              ? "var(--accent)"
              : "var(--success)",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        {decisionLabel}
      </Link>
    );
  }
  // error
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        title={state.message}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--accent)",
          maxWidth: 220,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        ✕ {state.message}
      </span>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="btn btn-ghost"
        style={{ height: 26, padding: "0 8px", fontSize: 11 }}
      >
        Retry
      </button>
    </span>
  );
}

function AutopilotBanner({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 14px",
        background: on ? "var(--accent-soft)" : "var(--app-surface-2)",
        border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 10,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={on}
        style={{
          position: "relative",
          width: 38,
          height: 22,
          borderRadius: 11,
          border: "1px solid var(--border-strong)",
          background: on ? "var(--accent)" : "var(--app-surface)",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: 0,
          flex: "none",
        }}
        aria-label="Toggle auto-pilot"
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "white",
            transition: "left 140ms ease-out",
            boxShadow: "0 1px 3px oklch(20% 0.02 250 / 0.25)",
          }}
        />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 13,
            color: on ? "var(--accent)" : "var(--text-1)",
          }}
        >
          Auto-pilot {on ? "engaged" : "off"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--text-2)",
            lineHeight: 1.4,
          }}
        >
          {on
            ? "The bench will analyze, peer-review, and file every thread in one pass. Critical cases route directly to the director."
            : "You'll review Apollo's recommendation per row before filing. Flip on to let the bench close the loop end-to-end."}
        </div>
      </div>
    </div>
  );
}

function ReviewingBlock({
  state,
}: {
  state: Extract<RowState, { kind: "reviewing" }>;
}) {
  const peer = findPeer(state.peerId);
  const phaseLabel = state.phase === "director" ? "Director" : "Peer";
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        background: "var(--accent-soft)",
        border: "1px solid var(--accent)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {peer && <PeerAvatar peer={peer} size={26} />}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-1)",
            }}
          >
            {peer?.name ?? state.peerId}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            {phaseLabel} reading
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Spinner /> Opus 4.7
        </span>
      </div>
      {state.juniorDecision && (
        <div
          style={{
            paddingLeft: 10,
            borderLeft: "2px solid var(--warn)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--text-2)",
            lineHeight: 1.5,
          }}
        >
          Escalated to director: {state.juniorDecision.note}
        </div>
      )}
    </div>
  );
}

function ReviewedBlock({
  state,
  disabled,
  onFile,
}: {
  state: Extract<RowState, { kind: "reviewed" }>;
  disabled: boolean;
  onFile: () => void;
}) {
  const review = state.review;
  const junior = findPeer(review.juniorPeerId);
  const director = review.directorPeerId ? findPeer(review.directorPeerId) : null;
  const finalToneColor =
    review.finalDecision === "approved" ? "var(--success)" : "var(--accent)";
  const finalToneBg =
    review.finalDecision === "approved" ? "var(--success-soft)" : "var(--accent-soft)";
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        background: "var(--app-surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            fontWeight: 600,
          }}
        >
          Bench decided
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            padding: "3px 8px",
            borderRadius: 4,
            background: finalToneBg,
            color: finalToneColor,
            border: `1px solid ${finalToneColor}`,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 700,
          }}
        >
          {review.finalDecision}
        </span>
        <span style={{ marginLeft: "auto" }}>
          <button
            type="button"
            onClick={onFile}
            disabled={disabled}
            className="btn btn-primary"
            style={{ height: 28, padding: "0 12px", fontSize: 12 }}
          >
            File
          </button>
        </span>
      </div>
      <PeerLineage peer={junior} role="junior" decision={review.juniorDecision} />
      {director && review.directorDecision && (
        <PeerLineage
          peer={director}
          role="director"
          decision={review.directorDecision}
        />
      )}
    </div>
  );
}

function PeerLineage({
  peer,
  role,
  decision,
}: {
  peer: Peer | null;
  role: "junior" | "director";
  decision: { decision: string; note: string; reasoning: string };
}) {
  if (!peer) return null;
  const tone =
    decision.decision === "approved"
      ? { color: "var(--success)", bg: "var(--success-soft)" }
      : decision.decision === "escalated"
        ? { color: "var(--warn)", bg: "var(--warn-soft)" }
        : { color: "var(--accent)", bg: "var(--accent-soft)" };
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${tone.color}`,
        borderRadius: 6,
        padding: "8px 10px",
        display: "flex",
        gap: 10,
      }}
    >
      <PeerAvatar peer={peer} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-1)",
            }}
          >
            {peer.name}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            {role}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              padding: "2px 6px",
              borderRadius: 4,
              background: tone.bg,
              color: tone.color,
              border: `1px solid ${tone.color}`,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            {decision.decision}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            color: "var(--text-1)",
            lineHeight: 1.5,
          }}
        >
          {decision.note}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12,
            color: "var(--text-2)",
            lineHeight: 1.45,
          }}
        >
          {decision.reasoning}
        </div>
      </div>
    </div>
  );
}

function modelLabel(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("haiku")) return "Haiku";
  if (model.includes("sonnet")) return "Sonnet";
  return model;
}

/**
 * Turn the model error into a one-liner the operator can act on.
 * Zod's full dump is too noisy and full of paths nobody cares about.
 */
function humanizeError(err: unknown, stage: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (!raw) return `${stage} failed`;

  // Common Anthropic patterns.
  if (/overloaded|529/i.test(raw)) return `${stage}: Anthropic overloaded — retry`;
  if (/rate.?limit|429/i.test(raw)) return `${stage}: rate-limited — retry`;
  if (/timeout|timed out|ETIMEDOUT/i.test(raw)) return `${stage}: timed out — retry`;
  if (/ECONNRESET|fetch failed|network/i.test(raw)) return `${stage}: network blip — retry`;

  // Zod issues come through as JSON arrays — pull the first message.
  if (raw.startsWith("[") || raw.includes("invalid_type")) {
    const m = raw.match(/"message"\s*:\s*"([^"]+)"/);
    if (m) return `${stage}: schema mismatch — ${m[1]}`;
    return `${stage}: schema mismatch`;
  }

  return `${stage}: ${raw.slice(0, 80)}`;
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--warn)",
        boxShadow: "0 0 6px var(--warn)",
        marginRight: 4,
        animation: "triage-cursor 1s ease-in-out infinite",
      }}
    />
  );
}

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function computeApolloHeader({
  rows,
  analyzing,
  filing,
  queuedCount,
  analyzedCount,
  reviewedCount,
  filedCount,
  failedCount,
  totalReady,
  parseError,
  autopilot,
}: {
  rows: Row[] | null;
  analyzing: boolean;
  filing: boolean;
  queuedCount: number;
  analyzedCount: number;
  reviewedCount: number;
  filedCount: number;
  failedCount: number;
  totalReady: number;
  parseError: string | null;
  autopilot: boolean;
}): string {
  if (parseError) return "I couldn't read that zip. Try one with the supported file types.";
  if (!rows) {
    return autopilot
      ? "Auto-pilot is on. Drop a corpus and the bench will triage, peer-review, and file every thread — I'll narrate as we go."
      : "Drop a corpus and I'll triage each thread, then tell you who on the bench should sign each one off.";
  }
  if (analyzing) {
    if (autopilot) return "Running the full pipeline — analysis, peer review, then filing. The bench is reading along with me.";
    return "Reading through them now. If a thread trips on validation I'll re-prompt and, if needed, escalate to Opus 4.7.";
  }
  if (filing) return "Filing the approved cases.";
  if (failedCount > 0 && queuedCount === 0 && analyzedCount === 0 && reviewedCount === 0) {
    return `${failedCount} ${failedCount === 1 ? "thread" : "threads"} broke. Retry them when you're ready — the retries pull in Opus on the second swing.`;
  }
  if (filedCount === rows.length) return "All filed. The peers' decisions are on the record.";
  if (reviewedCount > 0 && queuedCount === 0 && analyzedCount === 0) {
    return `${reviewedCount} reviewed. File them to commit the bench's calls.`;
  }
  if (analyzedCount > 0 && queuedCount === 0) {
    return failedCount > 0
      ? `${analyzedCount} ready, ${failedCount} stuck — retry the broken ones or run AI review on the rest.`
      : autopilot
        ? "Analyzed. Auto-pilot will hand these to the bench in a moment."
        : "Analyzed. Override any assignment that doesn't look right, then file — or flip auto-pilot on and let the bench handle it.";
  }
  if (queuedCount > 0) {
    return autopilot
      ? `${totalReady} ${totalReady === 1 ? "thread" : "threads"} parsed. Hit analyze and the whole pipeline runs unattended.`
      : `${totalReady} ${totalReady === 1 ? "thread" : "threads"} parsed. Run analysis when you're ready.`;
  }
  return "Standing by.";
}
