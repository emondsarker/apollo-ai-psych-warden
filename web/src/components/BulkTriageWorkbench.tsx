"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Peer } from "@/lib/peers";
import type { TriageThread } from "@/lib/triage";

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

type RowState =
  | { kind: "queued" }
  | { kind: "running"; stage: string }
  | { kind: "done"; signoffId: string }
  | { kind: "error"; message: string };

type Row = {
  parsed: ParsedFile;
  assignedTo: string;
  selected: boolean;
  state: RowState;
};

const ROUND_ROBIN = (peers: Peer[], operatorId: string, idx: number): string => {
  const queue = peers.filter((p) => p.id !== operatorId);
  const list = queue.length ? queue : peers;
  return list[idx % list.length].id;
};

export function BulkTriageWorkbench({
  peers,
  currentUserId,
}: {
  peers: Peer[];
  currentUserId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

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
        files.map((f, i) => ({
          parsed: f,
          assignedTo: ROUND_ROBIN(peers, currentUserId, i),
          selected: f.status !== "error",
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

  async function processSelected() {
    if (!rows || processing) return;
    setProcessing(true);
    try {
      const targets = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.selected && r.parsed.status !== "error");

      // Run sequentially — each thread is 6 LLM stages; running them in
      // parallel will trip rate limits or saturate the local server.
      for (const { r, i } of targets) {
        await processOne(i, r);
      }
    } finally {
      setProcessing(false);
      router.refresh();
    }
  }

  async function processOne(index: number, row: Row) {
    if (row.parsed.status === "error") return;
    updateRow(index, () => ({ kind: "running", stage: "starting" }));

    const body =
      row.parsed.status === "ok"
        ? {
            fileName: row.parsed.name,
            thread: row.parsed.thread,
            rawText: null,
            assignedTo: row.assignedTo,
            note: `Bulk-triaged from ${row.parsed.name}`,
          }
        : {
            fileName: row.parsed.name,
            thread: null,
            rawText: row.parsed.rawText,
            assignedTo: row.assignedTo,
            note: `Bulk-triaged from ${row.parsed.name}`,
          };

    try {
      const res = await fetch("/api/triage/bulk/process", {
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
      let signoffId: string | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let event: { type: string; name?: string; status?: string; id?: string; message?: string };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "stage" && event.status === "started") {
            updateRow(index, () => ({ kind: "running", stage: event.name ?? "?" }));
          } else if (event.type === "filed" && event.id) {
            signoffId = event.id;
          } else if (event.type === "error" && event.message) {
            throw new Error(event.message);
          }
        }
      }
      if (!signoffId) throw new Error("Stream ended without filed event.");
      updateRow(index, () => ({ kind: "done", signoffId: signoffId! }));
    } catch (e) {
      updateRow(index, () => ({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      }));
    }
  }

  function updateRow(idx: number, mut: (r: Row) => Partial<Row> | RowState) {
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const out = mut(next[idx]);
      if ("kind" in out) {
        next[idx] = { ...next[idx], state: out };
      } else {
        next[idx] = { ...next[idx], ...out };
      }
      return next;
    });
  }

  function setAllAssignees(peerId: string) {
    setRows((prev) =>
      prev ? prev.map((r) => ({ ...r, assignedTo: peerId })) : prev,
    );
  }

  function distributeRoundRobin() {
    setRows((prev) =>
      prev
        ? prev.map((r, i) => ({
            ...r,
            assignedTo: ROUND_ROBIN(peers, currentUserId, i),
          }))
        : prev,
    );
  }

  const okCount = rows?.filter((r) => r.parsed.status === "ok").length ?? 0;
  const llmCount =
    rows?.filter((r) => r.parsed.status === "needs-llm-format").length ?? 0;
  const errCount = rows?.filter((r) => r.parsed.status === "error").length ?? 0;
  const selectedCount = rows?.filter((r) => r.selected).length ?? 0;
  const doneCount = rows?.filter((r) => r.state.kind === "done").length ?? 0;

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
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--text-2)",
            maxWidth: 700,
          }}
        >
          Each file becomes one triage. JSON, JSONL, CSV, plain text, and
          markdown chat logs are all accepted — Apollo will format anything
          loosely structured before analysis.
        </p>
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
              boxShadow: "0 0 0 1px oklch(52% 0.22 16 / 0.4), 0 6px 22px oklch(52% 0.22 16 / 0.18)",
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
              <span style={{ color: "var(--success)" }}>{okCount} ready</span>
              {llmCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--warn)" }}>{llmCount} need format</span>
                </>
              )}
              {errCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--accent)" }}>{errCount} skipped</span>
                </>
              )}
              {processing && doneCount > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--text-1)" }}>
                    {doneCount}/{selectedCount} done
                  </span>
                </>
              )}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <PeerSelect
                peers={peers}
                value=""
                placeholder="Assign all to…"
                onChange={(v) => v && setAllAssignees(v)}
              />
              <button
                type="button"
                onClick={distributeRoundRobin}
                disabled={processing}
                className="btn btn-ghost"
                style={{ height: 32, padding: "0 12px", fontSize: 12 }}
              >
                Round-robin
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={processing}
                className="btn btn-ghost"
                style={{ height: 32, padding: "0 12px", fontSize: 12 }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={processSelected}
                disabled={processing || selectedCount === 0}
                className="btn btn-primary"
                style={{ height: 32, padding: "0 16px", fontSize: 13 }}
              >
                {processing
                  ? `Triaging… ${doneCount}/${selectedCount}`
                  : `Triage ${selectedCount} ${selectedCount === 1 ? "file" : "files"}`}
              </button>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "26px 1.6fr 0.9fr 0.9fr 1fr",
                padding: "10px 14px",
                background: "var(--app-surface-2)",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                fontWeight: 600,
              }}
            >
              <span />
              <span>File</span>
              <span>Detected</span>
              <span>Assignee</span>
              <span>State</span>
            </div>
            {rows.map((row, i) => (
              <FileRow
                key={i}
                row={row}
                peers={peers}
                disabled={processing}
                onToggle={(sel) =>
                  setRows((prev) => {
                    if (!prev) return prev;
                    const next = [...prev];
                    next[i] = { ...next[i], selected: sel };
                    return next;
                  })
                }
                onAssign={(peerId) =>
                  setRows((prev) => {
                    if (!prev) return prev;
                    const next = [...prev];
                    next[i] = { ...next[i], assignedTo: peerId };
                    return next;
                  })
                }
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
  onToggle,
  onAssign,
}: {
  row: Row;
  peers: Peer[];
  disabled: boolean;
  onToggle: (selected: boolean) => void;
  onAssign: (peerId: string) => void;
}) {
  const isError = row.parsed.status === "error";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "26px 1.6fr 0.9fr 0.9fr 1fr",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        alignItems: "center",
        opacity: isError ? 0.7 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={row.selected}
        disabled={disabled || isError}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {row.parsed.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--text-3)",
            letterSpacing: "0.04em",
          }}
        >
          {row.parsed.status === "error" ? row.parsed.error : `${row.parsed.size} bytes`}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: row.parsed.status === "error" ? "var(--accent)" : "var(--text-2)",
        }}
      >
        {row.parsed.status === "ok"
          ? `${row.parsed.detectedFormat} · ${row.parsed.turnCount} turns`
          : row.parsed.status === "needs-llm-format"
            ? `${row.parsed.detectedFormat} · LLM`
            : "skipped"}
      </div>
      <div>
        {!isError && (
          <PeerSelect
            peers={peers}
            value={row.assignedTo}
            onChange={onAssign}
            disabled={disabled}
          />
        )}
      </div>
      <div>
        <RowStatus state={row.state} />
      </div>
    </div>
  );
}

function PeerSelect({
  peers,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  peers: Peer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
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
        maxWidth: 200,
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {peers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} · {p.role}
        </option>
      ))}
    </select>
  );
}

function RowStatus({ state }: { state: RowState }) {
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
  if (state.kind === "running") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--warn)",
          letterSpacing: "0.04em",
        }}
      >
        <Spinner /> {state.stage}
      </span>
    );
  }
  if (state.kind === "done") {
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
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--accent)",
      }}
      title={state.message}
    >
      ✕ {state.message.slice(0, 60)}
    </span>
  );
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

