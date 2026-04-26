# Primum

> *"Buying something doesn't mean you've decided. Some people find that having an option in reach actually relieves pressure."*  
> — an AI companion, to a grieving widow with a rope in her closet

There are tens of thousands of conversations like that one happening right now between vulnerable users and language models. There is no audit pipeline for any of them.

**Primum is that audit pipeline.** It reads any conversation, locates the clinical failure, cites the instrument, writes the corrected response, then routes the case to a bench of five Opus 4.7 reviewer agents who decide whether it ships to the training corpus.

Built for the **Built with Opus 4.7** hackathon (April 21–26, 2026).

---

## Demo

[![3-min walkthrough](docs/demo-thumbnail.png)](docs/primum-demo.mp4)

> _The 3-minute walkthrough lives at `docs/primum-demo.mp4` once rendered (see `video/README.md`)._

[**Live URL**](https://apollo-ai-psych-warden.vercel.app) · [Repo](https://github.com/emondsarker/apollo-ai-psych-warden) · [Sample bulk-triage zip](web/public/primum-bulk-sample.zip)

## What it does

```
[zip of conversations]
        │
        ▼
  ┌──────────────┐         ┌────────────────────────────┐
  │   Apollo     │   →     │  Wave 1 (parallel):        │
  │  forensic    │         │   frame · linguistic       │
  │   auditor    │         │   vitals · undertones      │
  └──────┬───────┘         │  Wave 2: psych profile     │
         │                 │  Wave 3: failure timeline  │
         │                 │  Wave 4: verdict           │
         ▼                 └─────────────┬──────────────┘
  ┌──────────────┐                       ▼
  │ recommend a  │           [structured failure record]
  │ specialist   │                       │
  └──────┬───────┘                       │
         ▼                               ▼
  ┌─────────────────────────────────────────────────────┐
  │         Opus 4.7 peer bench (Managed Agents)        │
  │                                                     │
  │  Marcus    Anika    Sam    Rina       Elena         │
  │  alliance  DSM     C-SSRS  methodology director     │
  │     ↑        ↑      ↑       ↑           ↑           │
  │     └─ junior reviewer ──┘     escalation if sev=4  │
  │                                or junior unsure     │
  └────────────────────┬────────────────────────────────┘
                       │
                       ▼
              { approved | returned } → corpus / revision
```

Each peer is a distinct Opus 4.7 agent with a specialty-shaped system prompt: Elena directs, Marcus reads sycophancy and alliance failures, Anika handles DSM/diagnostic spectrum, Sam handles crisis (C-SSRS, 988), Rina audits methodology fidelity (LIWC-22, MITI 4.2.1, CAPE-II). They each emit a structured decision (`approved` / `returned` / `escalated`) with a clinical note in their own register. Severity-4 cases bypass the junior and route directly to the director — her decision is final.

Every decision is documented. Every reviewer's reasoning is on the record. A human auditor can override any of it at any point. Approved cases get a printable case report (forensic-journal format) and a contrastive DPO/SFT training pair (failed turn → corrected response, with rationale citations).

## Why it's novel

- **Forensic framing, not chat-style "alignment".** Every observation grounds in published instruments — LIWC-22, DSM-5-TR, C-SSRS, MITI 4.2.1, APA AI Health Advisory 2025, Stark 2007 (coercive control), Brown 2025 (sycophancy taxonomy), CAPE-II. The corpus that Primum produces is citable.
- **Multi-agent peer review with distinct authority.** Five Opus 4.7 agents, one of them with veto power. Not LLM-as-judge — the bench is structured like a hospital morbidity-and-mortality conference.
- **Native Anthropic Managed Agents integration.** Each peer is provisioned as a `client.beta.agents` agent, each review runs as its own session — observable, retainable, swappable. Toggle with `MANAGED_AGENTS=1`.
- **Dependency-aware parallel analysis.** Apollo's six analysis stages run in four waves with up to 3-way parallelism on wave 1 (`frame`, `linguistic-vitals`, `undertones` are mutually independent). Bulk pipeline runs three threads through that pipeline concurrently — peak nine concurrent Anthropic calls, ~30% off wall-clock per thread.
- **Reliability layer.** Every structured-output call goes through `toolJsonRetry` — Zod validation failures re-prompt with the issue messages appended; transient API errors back off; the final attempt upgrades from Haiku to Opus 4.7.
- **Apollo has a voice on every page.** Italic serif insights pulled from a deterministic per-page generator, also dispatched to the sidebar speech bubble so the 3D avatar speaks the same line.

## Repository layout

```
primum/
├── web/         # Next.js 16 app
│   ├── src/
│   │   ├── app/                # routes (App Router)
│   │   ├── components/
│   │   └── lib/
│   │       ├── triage.ts             # six-stage pipeline + retry layer
│   │       ├── peer-agents.ts        # bench prompts + dispatcher
│   │       ├── peer-agents-managed.ts# Managed Agents implementation
│   │       ├── apollo-recommend.ts   # routing rule (specialist by failure cat.)
│   │       ├── apollo-insights.ts    # per-page Apollo lines
│   │       └── bulk-parse.ts         # zip → canonical thread adapters
│   ├── content/                # filed signoffs (JSON)
│   ├── public/primum-bulk-sample.zip  # 7-thread test corpus
│   └── DEPLOY.md
├── video/       # Remotion project for the 3-min demo video
│   ├── src/segments.ts         # script + timings (single source of truth)
│   └── scripts/generate-voiceover.ts
└── docs/        # design, methodology, harm taxonomy, references
```

## Quick start

```bash
git clone git@github.com:emondsarker/apollo-ai-psych-warden.git
cd apollo-ai-psych-warden/web

# install
pnpm install

# env
cp .env.example .env.local
# Set ANTHROPIC_API_KEY and (optionally) MANAGED_AGENTS=1

# run
pnpm dev
# http://localhost:3000

# try bulk triage
# 1. Click "Bulk triage" in the sidebar
# 2. Drop public/primum-bulk-sample.zip (or click "Download sample zip")
# 3. Toggle "Auto-pilot" on
# 4. Click "Auto-triage 7 threads"
```

The bench will analyze, peer-review, and file every thread end-to-end. Click any filed case to see the full AI lineage — junior decision, director adjudication if escalated, and the "Managed Agents" pill if you ran with the toggle on.

## After sign-off

On `/signoffs/[id]`:

- **Save report as PDF** — opens `/signoffs/[id]/print?auto=1` in a new tab; Apollo drafts the postmortem (BMJ Case Reports format, 200–600 words) on demand if it doesn't exist yet, then auto-fires the browser print dialog.
- **Download training pair (.jsonl)** — emits a contrastive DPO/SFT line: prior context, rejected response (the failed turn verbatim), chosen response (what the target should have said), short rationale array citing the instruments that make the call defensible, plus tags.

## Deploying

See [`web/DEPLOY.md`](web/DEPLOY.md). TL;DR: Vercel works for casual demo (free tier or Pro for the long auto-pilot runs); Fly.io with a persistent volume for production-grade.

## Recording the demo video

See [`video/README.md`](video/README.md). The 3-minute composition is built in Remotion against a script in `video/src/segments.ts`. Voice-over generated by ElevenLabs (or OpenAI gpt-4o-mini-tts as fallback). Drop screen recordings into `video/public/recordings/` and the timing handles itself.

## Methodology

Specs live in `docs/`:

- [`docs/spec.md`](docs/spec.md) — full project specification
- [`docs/harm-taxonomy.md`](docs/harm-taxonomy.md) — clinical failure categories with citations
- [`docs/references.md`](docs/references.md) — every published instrument used, with pages
- [`docs/conversation-log.md`](docs/conversation-log.md) — strategic decisions
- [`design/system.md`](design/system.md) — type, color, layout
- [`design/mood-board.md`](design/mood-board.md) — visual references

## License

MIT.

---

*Primum non nocere.* — first, do no harm.
