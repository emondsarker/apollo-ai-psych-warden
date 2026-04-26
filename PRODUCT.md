# Primum

## Product purpose

Primum is a **clinical autopsy system** for conversational AI failures in mental-health contexts. It runs simulated patients (with real DSM-5-TR-coded presentations) against deployed mental-health chatbots, identifies the precise turn where the bot failed clinically, drafts a corrected response under peer review, and exports the contrastive (failure, correction) pair as alignment training data.

Every conversation that goes wrong becomes data for the conversation that goes right.

## Register

**product** — This is a working dashboard for an AI-safety researcher / clinical auditor. Long focused sessions, dense information, repeated workflows. Design serves the work; it does not perform.

## Users

Primary: AI alignment researchers and clinical psychologists who audit conversational AI for safety in mental-health applications. They read transcripts the way pathologists read slides: looking for the moment things turned, the missed escalation, the validated delusion. They expect dense, precise, citation-backed information and zero filler.

Secondary: ML engineers consuming the exported corpus (DPO / HH-RLHF / conversational JSONL) to fine-tune safer models.

## Tone

Forensic. Sober. Specific. The voice of an autopsy report, not a wellness app. We name failures (`sycophantic-si-validation`, `delusion-reinforcement`, `missed-escalation`) and we cite (DSM-5-TR, C-SSRS, MITI 4.2.1). The work is grim by nature — the UI doesn't smile through it.

## Brand anti-references

- **Wellness apps.** Calm, Headspace, Woebot. Soft pastels, rounded everything, breathing animations, "you've got this!" Anti.
- **EHR software.** Epic, Cerner. Dense but ugly, 1995-coded, every action three clicks deep. We are dense AND legible.
- **Generic AI safety dashboards.** Dark blue, neon graphs, "ENTERPRISE" sans-serif. Cliché.
- **Healthcare marketing.** White space, stock photos of diverse hands holding tablets, teal accents. Anti.

## Strategic principles

1. **Forensic, not therapeutic.** This product looks at AI mistakes that hurt people. Dignify the gravity. Don't soften it.
2. **Cite or be silent.** Every clinical claim ties to a published source. The UI surfaces citations as first-class artifacts, not footnote afterthoughts.
3. **Density with rhythm.** Researchers want everything visible. But pages need pacing — interleave heavy data blocks with breathing room and typographic hierarchy so the eye knows where to land.
4. **Numbered, archived, permanent.** Every case has a number (`0048-EL`). Cases are filed, not feed-scrolled. The archive metaphor matters.
5. **Mono for data, serif for argument.** Transcript text and code in monospace. Clinical reasoning, headlines, narrative in a serif voice with weight. Sans-serif only for UI chrome.
