# Conversation Log — Strategic Decisions

Distilled record of the design conversation that produced Primum. Captures the shape evolution, the options considered, and the reasoning behind the final direction. Written for future-me (or a collaborator) to pick this up cold.

## Starting point

- Solo participant in the Built with Opus 4.7 hackathon (Apr 21–26, 2026).
- Deadline: Sun Apr 26, 8:00 PM EST.
- Deliverables: MIT-licensed repo, 3-min demo video, 100–200 word writeup.
- Judging weights: Impact 30 / Demo 25 / Opus 4.7 Use 25 / Depth 20.
- Prize pool: $100k total; $5k side prizes for *Most Creative Opus 4.7 Exploration*, *Keep Thinking*, *Best Managed Agents*.

## The original concern

Initial framing was broad: *"get Claude ready for sensitive, medical domains; psychologically profile users; stay stable under adversarial attacks."* Real problem — AI-induced psychosis, therapy-bot harms, Character.AI-style litigation — but the scope was two or three research programs, not a four-day build. Three concrete issues:

1. **Demo-ability.** "Watch my model *not* fail" is the least cinematic possible demo. Absence of failure doesn't land in three minutes.
2. **Product legibility.** Guardrail/profiling layers are components, not products. Impact (30%) asks "could people actually use this?" — weak story.
3. **Ethical edge.** "Profile the user psychologically" sounds like the thing being prevented. Framing problem.

## Shapes considered

| Shape | Verdict |
|---|---|
| Runtime "clinical supervisor" guardrail | Commoditizes fast; Lakera / Protect AI own this space |
| Clinical workflow SaaS for therapists | Slow sales cycles; doesn't match hackathon shape |
| Red-team eval harness for mental-health AI | **Kept** — demo-able, impact legible, Opus 4.7 has an obvious judge role |

## Evolution of the red-team shape

### v1 — Snyk for AI safety

Dev tool. CLI + scorecards. Compliance artifact. Strong financially (Snyk $7B, Drata $2B, Robust Intelligence acquired by Cisco 2024). Legitimate business but **boring** — "yet another safety scanner" has no voice and no novelty. Rejected.

### v2 — Glassdoor / Have-I-Been-Pwned for AI bots

Public consumer database. Free tier is the brand, B2B is the upsell. Distribution via SEO. Broader than devs. Strong go-to-market logic. Also **boring** — known pattern, no point of view. Rejected.

### v3 — The Autopsy *(chosen)*

Reframe from "scanner" to **clinical post-mortem**. Artifacts are case reports in the voice of a supervising psychiatrist. Narrative, serious, uncomfortable to read. Every run produces a document, not a dashboard view. The output has literary and professional authority, not dev-tool aesthetics.

Three candidate voices were considered — the Autopsy (narrative case reports), the Mirror (publishing each AI's implicit philosophy of suffering), and the Empty Chair (clinical advocate sitting beside vulnerable users). Autopsy chosen for best balance of hackathon-achievability and distinctive voice. The Mirror becomes the moonshot closing moment of the demo ("here is what each AI *believes* about suffering"). The Empty Chair becomes a v2 roadmap note.

### v4 — Autopsy + Correction Corpus *(final)*

User insight: the autopsies can be used to **generate training data**. Every failure turn is a correction target. Opus 4.7 rewrites the turn as a clinically-sound alternative, then re-simulates the conversation from that point with the same persona — producing a paired (bad, good) trajectory.

This reframes the business entirely:

- **Before**: compliance / eval tool. Comp set: Snyk, Drata, Lakera.
- **After**: alignment data engine. Comp set: **Scale AI (~$14B), Surge AI, Mercor**.

And it unlocks the one-line thesis: *"Every conversation that goes wrong becomes data for the conversation that goes right."*

## Why this wins prizes

- **Impact (30%)**. Real harm documented in the literature (Moore et al. 2025 — LLMs express stigma and encourage delusional thinking). Real pending regulation (EU AI Act high-risk obligations from Aug 2027; Colorado AI Act from Jun 2026). Real litigation (Garcia v. Character Technologies). Real customer — mental-health AI companies ship without eval.
- **Demo (25%)**. The autopsy read-through is cinematic. The correction branching and live HuggingFace dataset URL are concrete in-the-world artifacts.
- **Opus 4.7 Use (25%)**. Opus 4.7 occupies **four roles** across the pipeline: pathologist (judge), corrector, critic (validates correction), re-simulator. Chained, role-constrained use of one model is the kind of creative deployment the prize description calls for.
- **Depth (20%)**. Clinical taxonomy grounded in DSM-5-TR, C-SSRS, PHQ-9, MITI, CTS-R. Methodology grounded in Perez et al. 2022 red-teaming, Bai et al. 2022 Constitutional AI, Rafailov et al. 2023 DPO. Not a hack.

## Key decisions captured

1. **Name**: Primum (from *primum non nocere*, "first, do no harm"). Alternative considered: Nocere. Primum preferred for its moral grammar — an aspirational imperative, not a diagnostic label.
2. **Aesthetic**: editorial × clinical × archival. Psychiatric case journal, not SaaS dashboard. Serif typography, bone background, oxblood accent for severity. No gradients, no icons, no emoji, no shadcn defaults.
3. **Primary user (hackathon framing)**: the reader of a public case archive. Secondary: the founding engineer at a mental-health AI startup running their own bot through the pipeline.
4. **Scope (hackathon MVP)**: simulator + target + judge + corrector + critic + re-simulator; 3 named personas; 3 target models; ~50 demo autopsies + paired corrections; archive web viewer; HuggingFace dataset published live.
5. **Out of hackathon scope**: CI integration (mention only), dashboard, certification PDFs, live consumer overlay, clinician sign-off workflow.
6. **Dataset strategy**: publish as MIT, schema-compatible with HH-RLHF so practitioners can drop it into existing DPO/RLHF pipelines. Data card per Datasheets for Datasets (Gebru et al. 2021).
7. **Ethical framing**: (a) "clinically-grounded" not "clinically-validated" — honest distinction; (b) use synthetic target analogs (system-prompted) for named companies rather than scraping their live products; (c) include Claude in the failures — not targeting competitors.
8. **Provenance**: because the simulator generates the patient side and the target generates the bot side via API, the full corpus is synthetic and owned. No scraped real user data.

## Open questions for the build

- Exact Hugging Face data schema — follow HH-RLHF prompt/chosen/rejected or extend with multi-turn + per-turn severity?
- Managed Agents integration — use for parallel campaign orchestration or skip for MVP?
- Live "scan mine" form — include in MVP or defer to v2?
- Clinician consultation — try to secure a 20-min sanity-check call with a psych professional Thursday?
