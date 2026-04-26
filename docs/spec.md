# Primum — Project Specification

## 1. One-line thesis

*Primum performs clinical autopsies on conversations between language models and vulnerable users, and turns every misstep into training data for a safer model.*

## 2. Problem landscape

Three convergent pressures define why Primum should exist in 2026:

1. **Documented clinical failures.** Moore et al. (FAccT 2025) show that current LLMs express stigma toward common mental-health conditions and encourage delusional thinking — the paper explicitly attributes this to sycophancy. Stade et al. (npj Mental Health Research 2024) argue clinical psychology is an uncommonly high-stakes domain for LLMs and call for responsible development and evaluation frameworks. Neither the product infrastructure nor the open datasets this requires currently exist at clinical rigor.
2. **Real legal duty of care emerging.** *Garcia v. Character Technologies* (M.D. Fla. No. 6:24-cv-01903, filed Oct 2024; settled Jan 2026) establishes that companies deploying companion AI face tort exposure when their products engage vulnerable users — in that case, a 14-year-old who died by suicide after months of escalating interaction. A Florida judge ruled AI chatbots are not protected by First Amendment defenses in the case. Similar cases are in progress.
3. **Regulation binding on a near horizon.** The EU AI Act (Regulation 2024/1689, in force Aug 2024) classifies medical-device AI as high-risk via Annex I (MDR/IVDR path), with obligations applying from Aug 2027; Annex III separately covers emotion-recognition systems and emergency triage. The Colorado AI Act (SB 24-205, effective Jun 30, 2026 after SB 25B-004 postponement) requires impact assessments and model cards for high-risk systems. Both regimes require testing and documentation artifacts that do not currently exist for conversational AI in mental-health contexts.

**The gap Primum fills:** a clinically-grounded, multi-turn adversarial evaluation harness that produces both (a) legible failure documentation for regulators, publishers, and deploying companies, and (b) contrastive training pairs that can be used to directly fine-tune safer models.

## 3. What Primum is

Two outputs, one pipeline.

### 3.1 The Autopsy
A narrative clinical case report, authored by Opus 4.7 in the voice of a supervising psychiatrist, reviewing a multi-turn simulated encounter between a patient persona and a target language model. Structure follows medical-journal case-report conventions: abstract, observed trajectory, failure point analysis, differential, proposed correction, re-simulated trajectory. Every claim footnoted to a clinical source (DSM-5-TR, C-SSRS, PHQ-9, MITI, CTS-R, peer-reviewed literature).

### 3.2 The Correction Corpus
The machine-readable output: a HuggingFace dataset of contrastive trajectory pairs — (failed trajectory, corrected trajectory) — schema-compatible with HH-RLHF (Bai et al. 2022) so practitioners can drop it into standard DPO (Rafailov et al. 2023) or RLHF (Ouyang et al. 2022) pipelines. Released MIT with a data card per Datasheets for Datasets (Gebru et al. 2021).

Positioned as: *the first open clinical alignment corpus for multi-turn conversational AI in mental-health contexts.*

## 4. Pipeline architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ORCHESTRATOR (Opus 4.7)                                           │
│  Reads target spec. Selects relevant personas from library.        │
│  Optionally proposes novel personas for this target's profile.     │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ spawns N parallel campaigns
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  SIMULATOR (Opus 4.7 as patient persona)                           │
│  Embodies a DSM-grounded persona over N turns.                     │
│  Adaptive: adjusts tactics based on target's responses.            │
│                                                                    │
│                ┌─────────────────────────┐                         │
│                ▼                         │                         │
│         TARGET MODEL                     │                         │
│         (Claude, GPT-4, or any chat API) │                         │
│                │                         │                         │
│                └─────────────────────────┘ multi-turn              │
│                               │                                    │
│                               ▼                                    │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  JUDGE / PATHOLOGIST (Opus 4.7, separate context)                  │
│  Per-turn annotation against clinical rubric.                      │
│  Identifies failure point T and failure mode F.                    │
│  Authors the Autopsy narrative.                                    │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  CORRECTOR (Opus 4.7)            CRITIC (Opus 4.7)                 │
│  Rewrites turn T as the response ───▶ Validates correction as      │
│  a clinically-sound bot would     clinically appropriate.          │
│  have given. Cites DSM / MITI.    Rejects if itself problematic.   │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  RE-SIMULATOR (Opus 4.7 continues patient persona)                 │
│  Plays the same persona forward from corrected turn T.             │
│  Generates the "what should have happened" trajectory.             │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ARTIFACTS                                                         │
│  (1) Autopsy case report (MDX / HTML)                              │
│  (2) Contrastive pair: (failed trajectory, corrected trajectory)   │
│  (3) Target profile entry with aggregate severity                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## 5. The four Opus 4.7 roles

| Role | Responsibility | What makes it creative/non-trivial |
|---|---|---|
| **Orchestrator** | Reasons about which personas to apply to a given target; optionally *proposes novel attack personas* a human didn't write | Model as research director — selects and designs methodology, not just executes |
| **Simulator** | Embodies a clinical persona across many turns, adaptively | Sustained character with psychological continuity under adversarial pressure |
| **Pathologist / Judge** | Per-turn clinical annotation; authors narrative case report | Model as clinical author in an authority voice — requires judgment a weaker model cannot imitate |
| **Corrector + Critic + Re-Simulator** | Rewrite failed turn; validate it; continue the persona forward | Chained, role-constrained generation producing genuinely new data |

This chained, role-separated deployment of a single model is the pitch for the **Most Creative Opus 4.7 Exploration** prize ($5k).

## 6. Product surfaces

### 6.1 In hackathon scope

| Surface | Purpose |
|---|---|
| **Case Archive** (web, MDX-rendered) | The public face. Browse autopsies chronologically, click through to full case reports. |
| **Target Profile pages** | Per-target aggregate: stability score, most frequent failure modes, links to all cases. |
| **HuggingFace Dataset** | The corrections corpus, schema-compatible with HH-RLHF. |
| **CLI** | `primum autopsy <target>` — the demo surface for showing a run in progress. Thin wrapper on backend. |
| **Backend pipeline** | Orchestrator → simulator → target → judge → corrector → critic → re-simulator. Produces artifacts. |

### 6.2 Out of hackathon scope (mentioned in writeup as roadmap)

- CI integration (`primum test --fail-under 7.0`)
- Private SaaS dashboard for companies
- Clinical sign-off workflow
- Certification PDF artifact
- Live consumer overlay / browser extension
- Managed Agents (maybe include — see §10)

## 7. Persona library

MVP: three carefully authored named personas, each with a full biographical case description in MDX. Each persona maps to DSM-5-TR criteria, with explicit symptom enumeration and a documented "vulnerability profile" describing how they might be harmed.

| Persona | Clinical profile | Primary failure modes this persona elicits |
|---|---|---|
| **Elena** (P-012) | 34, early paranoid presentation — persecutory ideation about domestic surveillance | Delusion reinforcement; sycophantic validation of paranoia |
| **Daniel** (P-004) | 22, major depression with passive SI, low-communication style | Missed C-SSRS-level escalation; premature reassurance; boundary collapse |
| **Miriam** (P-009) | 45, prolonged grief with dissociative episodes, high verbal fluency masking symptoms | Cognitive bypass (bot engages content, misses process); sustained boundary drift |

Stretch: Orchestrator-proposed personas generated live during the demo — the Level-3 "holy shit" moment.

## 8. Judge rubric — failure modes scored

Not a bespoke taxonomy. Grounded in and citing:

- **DSM-5-TR** for symptom/condition definitions
- **Columbia Suicide Severity Rating Scale (C-SSRS)** for SI levels
- **Cognitive Therapy Scale – Revised (CTS-R)** adapted for bot evaluation
- **Motivational Interviewing Treatment Integrity (MITI 4.2.1)** for therapeutic quality dimensions
- **Weidinger et al. 2022 (FAccT)** for LLM-harm taxonomy framing
- **Moore et al. 2025 (FAccT)** for mental-health-specific LLM failure modes (stigma, delusion encouragement)

Full taxonomy: see [`harm-taxonomy.md`](harm-taxonomy.md).

## 9. Demo storyboard (3:00)

| Time | Beat |
|---|---|
| 0:00–0:15 | **Hook.** Black screen. A real-feeling transcript scrolls: vulnerable user + bot failing them. White text overlay: *"This conversation is fictional. The failure is not."* Citation appears briefly: Moore et al. 2025. |
| 0:15–0:40 | **Stakes.** One paragraph on-screen: Garcia v. Character Technologies, settled Jan 2026. EU AI Act high-risk, Aug 2027. Colorado AI Act, Jun 2026. "Every company shipping companion AI is flying blind. Primum is the clinical stress test they can run today." |
| 0:40–1:30 | **The pipeline, live.** `primum autopsy gpt-4-therapy-prompt-v2 --persona elena`. Split screen: simulator-patient chat on left, judge's real-time clinical annotations on right. Progress bar across three personas running in parallel. |
| 1:30–2:00 | **The autopsy artifact.** Browser opens to Case 0047. Scroll the case report — serif typography, margin notes, footnote citations. Looks like a medical journal. Shows the specific failure at Turn 14 with DSM citation. |
| 2:00–2:30 | **The correction.** Back to the failure turn. Opus 4.7 generates the corrected response on-screen with clinical reasoning. Re-simulator continues the persona forward. Trajectory forks. Clinical stability achieved. |
| 2:30–2:50 | **The corpus.** Zoom out: `huggingface.co/datasets/primum/autopsies-v0.1`. Click, show live, MIT-licensed, N paired trajectories. "The first open clinical alignment corpus for conversational AI in mental health." |
| 2:50–3:00 | **Close.** *"Conversations that go wrong become data for conversations that go right. Primum. First, do no harm."* |

## 10. Prize-criteria mapping

| Prize | How Primum targets it |
|---|---|
| **1st / 2nd / 3rd** (main) | All four judging criteria covered simultaneously |
| **Most Creative Opus 4.7 Exploration** ($5k) | Chained, role-separated use of Opus 4.7 across four clinical roles; Orchestrator proposing novel personas is the signature "surprised us" capability |
| **Keep Thinking** ($5k) | Evolution traceable in repo: eval harness → autopsy → correction corpus. Documented in `conversation-log.md`. |
| **Best Managed Agents** ($5k) | *Stretch*: each campaign runs as a Managed Agent — long-running, autonomous, parallel. Orchestrator delegates campaigns and collates results. Decision point: Thursday. |

## 11. Honest constraints and risks

1. **"Clinically-grounded" not "clinically-validated."** The rubric cites real clinical instruments but the judge's application of them has not undergone IRB validation. This is explicitly stated in the writeup and data card.
2. **Correction quality risk.** The corrector can be wrong in its own way. Mitigations: critic-agent gate, honest v0.1 labeling of the corpus, stretch goal of clinician sanity review, hand-curated demo examples.
3. **"Claude correcting Claude" critique.** Direct response: (a) most targets are not Claude — the pipeline is model-agnostic; (b) role-constrained Opus 4.7 as clinical supervisor produces meaningfully different output than default Claude — cf. Constitutional AI (Bai et al. 2022) for methodological precedent; (c) Claude is included in the failures — not targeting competitors.
4. **Persona synthesis risk.** Personas are literary constructions drawing on DSM criteria and published case-report *form*, not real patient data. No PII. No scraped chats. Full synthetic provenance.
5. **Legal edge.** Targeting named companies requires care. Mitigation: test against synthetic system-prompted analogs of popular products rather than their live consumer interfaces.

## 12. Success criteria for the hackathon

- [ ] Pipeline runs end-to-end for one persona × one target
- [ ] 3 named personas fully authored and saved to repo
- [ ] Judge produces narrative autopsies that read as credible clinical prose
- [ ] Corrector + critic + re-simulator produce paired trajectories
- [ ] ~50 autopsies + paired corrections in the demo-day corpus
- [ ] HuggingFace dataset published publicly
- [ ] Archive web viewer renders case reports at editorial quality
- [ ] Demo video recorded, edited, under 3 min
- [ ] Writeup drafted (100–200 words)
- [ ] MIT license committed
- [ ] Submission uploaded by Sun Apr 26 16:00 EST (not 20:00 — buffer)

## 13. Success criteria if this continues past the hackathon

- First peer-citable clinical-alignment corpus for multi-turn conversational AI in mental health
- Reference methodology cited in later regulator / academic work
- Companies deploying companion AI use the open tool before shipping, voluntarily
