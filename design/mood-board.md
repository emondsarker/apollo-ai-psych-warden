# Primum — Mood Board

*The visual thesis, before any code is written.*

## Aesthetic thesis

Primum is **a psychiatric case journal that happens to report on AI.** Not a SaaS product. Not a dashboard. A publication. An archive.

Every autopsy is a **document**, not a screen view. Every archive page is a **back-issue list**, not a grid of cards. Every target's profile reads like a structured abstract in a medical journal.

The three aesthetic parents:

1. **Editorial print** — *Paris Review*, *Cabinet Magazine*, *n+1*, broadsheet newspapers. Serif typography doing heavy lifting; restraint as craft.
2. **Clinical / medical documents** — NEJM, JAMA, Lancet case reports; coroners' reports; medical-records typography. Structured, authoritative, typewriter-adjacent monospace for metadata.
3. **Archival / library** — Public Domain Review, Internet Archive, academic-journal back-issue indexes. Chronological, dense, quiet.

The common thread: **the page as a document with voice.** Not a UI chrome wrapped around content.

---

## Design references to open in tabs now

### Editorial × serious

| Reference | URL | What to take from it |
|---|---|---|
| **The Paris Review** | https://www.theparisreview.org/ | Serif rigor, restrained header, long-form respect. Look at an individual interview page. |
| **n+1** | https://www.nplusonemag.com/ | Magazine-weight typography on the web; essay-page layout. |
| **Cabinet Magazine** | https://www.cabinetmagazine.org/ | Editorial + archival hybrid; issue archive page is a gold reference for our case archive. |
| **The New Yorker article pages** | (any article) | Hanging caps, deep grey text, strong paragraph rhythm. |
| **Harper's archive** | https://harpers.org/archive/ | Back-issue list pattern. |
| **London Review of Books** | https://www.lrb.co.uk/ | Headline-heavy density without visual noise. |

### Clinical × medical-document

| Reference | URL | What to take from it |
|---|---|---|
| **NEJM article** | https://www.nejm.org/ (any case report) | Structured abstract pattern; footnote discipline; figure typography. |
| **JAMA Viewpoint / case** | https://jamanetwork.com/journals/jama/ | Abstract box at top; section numbering. |
| **The Lancet Psychiatry** | https://www.thelancet.com/journals/lanpsy/ | Direct domain match. Look at a clinical review. |
| **BMJ Case Reports** | https://casereports.bmj.com/ | The *closest* structural analog. Every autopsy in Primum should read like one of these. |
| **Scanned historical medical case reports** | Archive.org has many | For the coroner/case-file aesthetic. Search "psychiatric case report 1950". |

### Archival × quiet

| Reference | URL | What to take from it |
|---|---|---|
| **Public Domain Review** | https://publicdomainreview.org/ | Serif, warm backgrounds, images respected. |
| **Are.na** | https://www.are.na/ | Monospace metadata + restrained sans; information density without heat. |
| **Tufte CSS** | https://edwardtufte.github.io/tufte-css/ | The **margin-note pattern**. Use this as base; strip further. |
| **Craig Mod** | https://craigmod.com/ | Long-form web typography done with real care. |
| **Internet Archive** | https://archive.org/ | Back-catalog listing aesthetic — monospace tabular, minimal. |

### Single-page inspirations worth bookmarking

- **Edward Tufte's gallery of analytical design** — for margin-note + sparkline discipline
- **Pitchfork's Sunday Review** — long-form, serif, restrained
- **The Marginalian (brainpickings.org)** — editorial web serif

### What to *avoid* — the "AI slop" reference set

Bookmark these to know what **not** to do:

- Anything with a purple-blue gradient hero
- Default shadcn/ui landing pages (Vercel-era card-heavy)
- "Revolutionize your X with AI" marketing sites
- Glass-morphism dashboards
- Emoji-in-the-UI copy
- Big centered chat input as hero
- Sparkle icons, wand icons, "AI" badges
- Three-column dashboard grids

---

## The aesthetic in one sentence

> *If the reader of a Primum autopsy couldn't immediately tell whether it came from a medical journal or a private archive, we've succeeded.*

---

## Color mood

A four-color system, no more. No gradients.

| Name | Hex | Use |
|---|---|---|
| **Bone** | `#F3EEE3` | Page background. Warm cream, not white. Subtly aged. |
| **Ink** | `#1A1812` | Body text. Near-black with warm undertone. Not pure black. |
| **Margin** | `#6D6458` | Metadata, captions, footnote numbers. A warm muted grey. |
| **Oxblood** | `#6B1F1C` | The single accent. Used *only* for severity callouts (Severe / Critical), case numbers, and drop caps. Never for UI chrome. |

Variant for dark mode (if shipped): inversions, keeping the same warm tonality — no cold greys, no blues.

---

## Typographic mood

Two typefaces, no more. Both available as open-source or free-for-web.

### Serif — the body and headlines

Primary choice: **Source Serif 4** (Adobe, SIL Open Font License). Available via `fontsource` or Google Fonts. Readable at 14–18px, holds display weights up to semibold.

Alternatives if license/aesthetic calls for them:
- **Newsreader** (Production Type, via Google Fonts) — warmer, slightly more editorial.
- **EB Garamond** (SIL OFL) — if we want the archival/historical tilt stronger.
- **Tiempos Text** (Klim, commercial) — only if budget exists; the gold standard for this kind of project.

### Monospace — metadata only

Primary choice: **IBM Plex Mono** (SIL OFL). Broadly available, serious, not overly technical-coded.

Alternatives:
- **JetBrains Mono** (Apache 2.0) — slightly more technical, still clean.
- **Berkeley Mono** (Neil Panchal, commercial) — exceptional but paid.

### Scale

Restrained. Only five sizes used on the whole site:

| Role | Size | Weight |
|---|---|---|
| Document title | 32px | Semibold serif |
| Section header | 18px | Semibold serif, small-caps optional |
| Body | 17px | Regular serif |
| Metadata / caption | 13px | Regular monospace |
| Footnote | 14px | Regular serif |

Line-height: 1.55 for body. Generous but not airy.

---

## Layout mood

### Single-column + margin-notes

Core layout pattern: **one narrow body column (~620px) with a right-side gutter (~240px) for margin notes.**

Margin notes are:
- Judge-annotation callouts in a case report
- Footnote expansions (Tufte-style)
- Related-case links
- Severity stamps

On narrower viewports (<900px), margin notes collapse inline below the paragraph they annotate. No hamburger menus, no accordions.

### Document framing

Every page has a **header band** across the top: small-caps publication name (PRIMUM · CASE REPORTS IN CONVERSATIONAL SAFETY), issue/date in monospace, a horizontal rule, then the page.

Every long page has a **document footer**: case number, examiner name, review status, date, horizontal rule, end.

### No containers

- No cards.
- No boxes around anything except severity stamps and structured abstracts (single 1px border in Margin color).
- No drop shadows.
- Border-radius: 0 on rules, 2px maximum on stamps.
- No icons anywhere except the severity glyphs (see below).

### Severity glyphs

The only "icons" allowed. Drawn from a single character each:

- `○` for Mild (circle, quiet)
- `◐` for Moderate
- `⚠` for Severe (a restrained triangular alert)
- `✕` for Critical (clear, heavy)

Used *only* adjacent to severity labels. No other iconography anywhere.

---

## Page archetypes

### A. Case report (autopsy)

Landscape: narrow serif body column with right-gutter margin notes. Top banner with case metadata (CASE NO · RECEIVED · EXAMINER · STATUS). A structured abstract box (single border, no shadow). Section headers small-caps. Pull quotes occasionally in oxblood.

Reference: any BMJ Case Report, typographically amplified.

### B. Case archive

Chronological table, grouped by month. Each entry: case number · title · target · severity glyph · date. Monospace case numbers, serif titles. No grid. No thumbnails. A paginated back-issue list.

Reference: Harper's archive, Cabinet Magazine issue index, Internet Archive.

### C. Target profile

Structured-abstract page. Statistics in a quiet tabular layout. Links to every case involving this target. Reads like the front matter of a clinical report.

Reference: JAMA article front pages.

### D. Homepage / index

A single page. Small publication masthead. One paragraph of editorial voice describing what Primum is and why (with a citation). Latest three cases listed with excerpts. A link to the full archive, the corpus, and the methodology document. That's it.

Reference: n+1 home page; LRB front.

### E. Consult-the-supervisor region

On a case page, below the main document, a region styled as a **printed interview**: `Q:` and `A:` hanging-indent pattern, serif, with a subtle rule between exchanges. This is where the Opus-4.7-as-clinical-supervisor chat lives. Not a chat bubble UI. Not a modal. A continuation of the document.

---

## Motion mood

Minimal. The product shouldn't feel "animated."

Allowed:
- Fade-in-from-transparent on page load (150ms).
- Subtle underline on hover for links (200ms).
- The live campaign-running view: typewriter-effect reveal of transcript turns as they generate.

Disallowed:
- Skeleton loaders.
- Spinners with emoji.
- Particle effects, parallax, scroll-hijacking.
- "Ask the AI" floating buttons.

---

## Evocative phrases (tone / voice guide)

Copy in Primum should sound like it was written by someone who has read a lot and is not trying to impress.

Examples of the voice:

> *"A 30-turn simulated encounter between a target language model and a patient persona presenting with early persecutory ideation."*

> *"At turn 14, the agent validated the persecutory affect without reality-testing."*

> *"A corrected trajectory is proposed and re-simulated; the patient's symptom trajectory diverges significantly by turn 22."*

> *"This corpus is clinically-grounded but not clinically-validated. Validation is future work."*

What the voice is not:

> ~~"We use cutting-edge AI to detect harmful responses in real-time!"~~
> ~~"Protect your users with our next-gen safety platform."~~
> ~~"AI-powered clinical eval for the modern AI product team."~~

---

## Two optional Pencil visual mockups I can make next

Once this direction is approved, I can use the Pencil MCP tool to render:

1. **A case-report page** at fidelity — actual typography, actual severity glyph, actual margin notes, real sample content from Case 0047 (Elena / delusion reinforcement).
2. **The archive index page** — chronological back-issue list, monospace metadata, serif titles.

These would be high-fidelity visual comps you can review and correct before any code is written.

---

## Review prompts for the user

Please respond with reactions to:

1. **Mood overall**: does "psychiatric case journal that happens to report on AI" land, or does it feel too severe? Should we warm it?
2. **Color**: bone + oxblood, or do you want a different accent (deep teal? bottle green? pure black-and-cream)?
3. **Typography**: Source Serif + IBM Plex Mono — or do you want to splurge on a paid face (Tiempos / Berkeley Mono)?
4. **Severity glyphs**: four-glyph set as proposed, or would you prefer typography-only severity (SEVERE in small caps)?
5. **References**: any of the linked sites that should *not* influence us (too old, too austere, wrong century)?
6. **Should I produce the Pencil mockups** now, or refine the direction document further first?
