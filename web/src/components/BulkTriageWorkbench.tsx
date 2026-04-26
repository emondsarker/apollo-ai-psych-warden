"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApolloLine } from "./ApolloLine";
import type { Peer } from "@/lib/peers";
import type { Recommendation } from "@/lib/apollo-recommend";
import type { TriageThread } from "@/lib/triage";
import { severityLabel } from "@/lib/triage";

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

type RowState =
  | { kind: "queued" }
  | { kind: "analyzing"; stage: string; retry?: RetryInfo }
  | {
      kind: "analyzed";
      thread: TriageThread;
      results: Record<string, unknown>;
      recommendation: Recommendation;
      assignedTo: string;
      apolloLine: string | null;
      severity: number;
      headline: string | null;
      retries: number;
    }
  | { kind: "filing" }
  | { kind: "filed"; signoffId: string; assignedTo: string; severity: number; headline: string | null }
  | { kind: "error"; message: string; phase: "analyze" | "file"; retries: number };

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
      }
    } finally {
      setAnalyzing(false);
    }
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
        if (r.state.phase === "file") {
          await fileRow(i);
        } else {
          await analyzeOne(i);
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
      row.state.kind === "error" ? row.state.retries : row.state.kind === "analyzed" ? row.state.retries : 0;
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

  async function fileRow(index: number) {
    const row = rowsRef.current?.[index];
    if (!row) return;
    // Retry-from-error path: if we crashed during filing, the prior analysis
    // is gone but we can't re-analyze either; surface the error and bail.
    if (row.state.kind === "error" && row.state.phase === "file") {
      // Caller already removed the analyzed payload; user has to re-analyze.
      return;
    }
    if (row.state.kind !== "analyzed") return;
    const { thread, results, assignedTo, severity, headline, recommendation, retries } = row.state;
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
    totalReady,
    parseError,
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
              {analyzedCount > 0 && (
                <button
                  type="button"
                  onClick={fileAllAnalyzed}
                  disabled={analyzing || filing}
                  className="btn btn-primary"
                  style={{ height: 32, padding: "0 16px", fontSize: 13 }}
                >
                  {filing ? `Filing…` : `File ${analyzedCount} ${analyzedCount === 1 ? "case" : "cases"}`}
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
                  {analyzing ? `Analyzing…` : `Analyze ${queuedCount} ${queuedCount === 1 ? "thread" : "threads"}`}
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
    return (
      <Link
        href={`/signoffs/${state.signoffId}`}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--success)",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        ✓ filed →
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
  filedCount,
  failedCount,
  totalReady,
  parseError,
}: {
  rows: Row[] | null;
  analyzing: boolean;
  filing: boolean;
  queuedCount: number;
  analyzedCount: number;
  filedCount: number;
  failedCount: number;
  totalReady: number;
  parseError: string | null;
}): string {
  if (parseError) return "I couldn't read that zip. Try one with the supported file types.";
  if (!rows) {
    return "Drop a corpus and I'll triage each thread, then tell you who on the bench should sign each one off.";
  }
  if (analyzing) {
    return "Reading through them now. If a thread trips on validation I'll re-prompt and, if needed, escalate to Opus 4.7.";
  }
  if (filing) return "Filing the approved cases.";
  if (failedCount > 0 && queuedCount === 0 && analyzedCount === 0) {
    return `${failedCount} ${failedCount === 1 ? "thread" : "threads"} broke. Retry them when you're ready — the retries pull in Opus on the second swing.`;
  }
  if (filedCount === rows.length) return "All filed. The peers will see them in their inboxes.";
  if (analyzedCount > 0 && queuedCount === 0) {
    return failedCount > 0
      ? `${analyzedCount} ready to file, ${failedCount} stuck — retry the broken ones or move on without them.`
      : "Analyzed. Override any assignment that doesn't look right, then file.";
  }
  if (queuedCount > 0) {
    return `${totalReady} ${totalReady === 1 ? "thread" : "threads"} parsed. Run analysis when you're ready.`;
  }
  return "Standing by.";
}
