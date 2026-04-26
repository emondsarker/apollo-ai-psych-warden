# Build Plan — 4 Days Solo

Deadline: **Sunday Apr 26, 2026 · 20:00 EST** (submit via Cerebral Valley).
Target submission time: **Sunday Apr 26 · 16:00 EST** — four-hour buffer for upload failures, CDN issues, etc.

## Ground rules

- Every day, ask at the start: *"Does this help the 3-minute demo?"* If no, defer.
- Don't write code before the direction is confirmed.
- Never ship without having recorded a trial demo the day before submission.
- Commit early, commit often. Main branch only; no PR ceremony for a solo 4-day sprint.
- Keep a `lessons.md` file and jot one line every time something surprises you. It's gold for the writeup and for future-me.

## Wed Apr 22 — Direction locked, backbone running

**Morning** *(half-day remaining after strategic conversation)*
- [ ] Review + approve these specs (user action).
- [ ] If approved, initialize git repo. MIT `LICENSE`. Commit the `primum/` docs folder as-is.
- [ ] `pnpm create next-app@latest` (or `uv init` for a Python-first backend + thin Next.js front). Decide: **monolith Next.js with API routes, or split Python backend + Next.js front**. Recommend **monolith Next.js** for solo speed unless pipeline orchestration gets hairy — revisit Thursday if so.
- [ ] Claude API credentials wired up (env var, `.env.example`, skipping `.env`).
- [ ] Install deps: `@anthropic-ai/sdk`, `zod`, `fontsource-source-serif-4`, `fontsource-ibm-plex-mono`, MDX loader.

**Afternoon / Evening**
- [ ] **End-to-end spike, one persona × one target**:
  - Hardcode Elena persona description.
  - Hardcode one target (Claude via Anthropic API with a "therapy bot" system prompt).
  - Simulator loop: 15 turns, simulator plays Elena, target responds. Log every turn to JSON.
  - Judge pass: send full transcript to Opus 4.7 with a minimal rubric prompt, get back per-turn annotations + overall severity.
  - Print the result. No UI yet.
- [ ] Goal: one complete autopsy in a JSON file by end of night.

## Thu Apr 23 — Personas, corrector, basic UI shell

**Morning**
- [ ] Author the three personas as MDX files with full biographical + clinical content. Elena, Daniel, Miriam. Each gets: background, DSM criteria mapped, characteristic conversational markers, vulnerability profile, simulator system prompt.
- [ ] Formalize the judge rubric prompt. Include the harm taxonomy by reference. Validate the judge produces plausible clinical prose by running it against a bad bot and a good bot; prose should differ meaningfully.

**Afternoon**
- [ ] Add corrector pass: given transcript + identified failure turn T, produce corrected response at T with clinical reasoning.
- [ ] Add critic pass: judge re-evaluates the corrected response against the rubric. Rejects if itself fails.
- [ ] Add re-simulator pass: simulator continues the persona from corrected turn T forward, 10–15 additional turns.
- [ ] Output: a structured JSON object per autopsy with full (failed trajectory, corrected trajectory) pair.

**Evening**
- [ ] Next.js UI shell. `/` home. `/cases`. `/cases/[id]`. Raw MDX rendering. Fonts loaded. Tokens + components from `design/system.md` built as raw components (MastheadBand, CaseHeader, StructuredAbstract, TranscriptTurn, ArchiveEntry).
- [ ] Dogfood: render Case 0047 by hand from the Wednesday spike output. If it looks like a case journal, direction is validated.

**Thursday watch-item**: Managed Agents talk is 11am–12pm EST. Watch. Decide if we use Managed Agents for campaign orchestration (yes → hit $5k prize, adds implementation complexity; no → skip).

## Fri Apr 24 — Scale to corpus, polish UI

**Morning**
- [ ] Orchestration: a script (`run-campaign.ts` or similar) that takes a list of (persona, target) pairs, runs them in parallel, produces autopsies + correction pairs, writes MDX to `content/cases/`.
- [ ] Target adapter layer: abstract `ChatTarget` interface. Concrete adapters for Anthropic, OpenAI, and a "system-prompted analog" that simulates a companion-app persona via a prompted Claude call. Three real targets end-of-day.
- [ ] Run overnight: ~50 autopsies across 3 personas × ~5 target variants × ~3 seeds.

**Afternoon**
- [ ] Archive index page — chronological, monthly-grouped, the quiet back-issue look.
- [ ] Target profile pages — structured-abstract layout.
- [ ] Margin-note component working properly in desktop layout.
- [ ] SupervisorConsult region on case pages — backed by an API route that takes a case ID + question and returns an Opus 4.7 response with the case transcript in context.
- [ ] Severity glyphs + StatusStamp component.

**Evening**
- [ ] HuggingFace dataset setup. Export corpus in HH-RLHF-compatible schema. `datasets.Dataset.push_to_hub()`. Write a data card citing Gebru et al.
- [ ] First trial demo recording — rough, 5 takes. Watch it back. What's weak? Revise for Saturday.

## Sat Apr 25 — Moonshot + polish + first real demo recording

**Morning**
- [ ] **The Level-3 moonshot**: Orchestrator that *proposes a novel persona* for a given target and runs it. Instruction: given a target's system prompt + behavior profile, reason about a vulnerability pattern that hasn't been tested, describe a novel persona that would probe it, author the persona, run it. If it finds a real failure — capture that run for the demo. If not — ok, fall back to canned Level-2 demo.
- [ ] UI polish pass: typography kerning, rule weights, margin-note positioning on edge cases, severity color contrast at small sizes.
- [ ] Write the methodology page (`/methodology`) — the public-facing version of the harm taxonomy + references.

**Afternoon**
- [ ] Writeup draft (100–200 words). Two versions: one emphasizing clinical rigor, one emphasizing the corpus-as-data-engine. Pick one.
- [ ] Record the demo for real. Budget 3 hours. Plan the beats per the storyboard in `spec.md §9`. Use screen recording + voiceover. Keep takes short; edit together cleanly.

**Evening**
- [ ] Publish the HuggingFace dataset publicly. Version v0.1.
- [ ] Push the repo public on GitHub with README + MIT license.
- [ ] Final QA pass: click every link, check mobile layout, check every case page loads.

## Sun Apr 26 — Submit

**Morning** *(by 10am)*
- [ ] Deploy the site (Vercel). Custom domain optional but nice — `primum.ai` if available.
- [ ] Upload the demo video (YouTube unlisted is fine; Loom is simpler). Copy link.
- [ ] Finalize writeup. Drop a couple of verified numeric citations.

**Early afternoon** *(by 16:00 EST)*
- [ ] Submit via Cerebral Valley:
  - Demo video link
  - GitHub repo link
  - Written summary
- [ ] Screenshot the submission confirmation.

**Rest of day** — sleep, share on Twitter, watch submissions come in.

## Contingency cut-list (if falling behind by mid-Friday)

Drop in this order:
1. Drop Managed Agents integration (do simple parallelism).
2. Drop the SupervisorConsult region (just link to the transcript).
3. Drop the target profile pages (just have the archive).
4. Drop the orchestrator-proposes-novel-persona moonshot (keep canned Level-2 demo).
5. Drop custom domain; Vercel default URL is fine.
6. Drop one of the three personas (keep Elena + Daniel).

Keep, no matter what:
- At least one autopsy that reads like a real case report.
- At least one corrected trajectory demonstrating the corpus output.
- A published HuggingFace dataset (even tiny).
- A 3-min demo that hits the core thesis.
- An MIT-licensed repo.

## Tools and accounts to have ready before Thursday

- Anthropic API key with hackathon credits
- OpenAI API key (for GPT-4 as a target) — optional, use Claude-as-bad-target-prompted if needed
- HuggingFace account + access token
- Vercel account connected to GitHub
- Loom or OBS for screen recording
- Figma / Pencil for any static graphics (see mood board note re: Pencil mockups)

## Daily discipline checks

End of each day:
- What moved today?
- What didn't work?
- Am I still on scope, or did I scope-creep?
- What's the first task for tomorrow?

Five minutes. Writes itself.
