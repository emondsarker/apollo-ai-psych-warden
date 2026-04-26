# Primum design system

## Scene

A clinical AI auditor at 11pm, single 27" monitor, dim warm room, third hour of reviewing autopsies. Forensic-pathology mood. Reading dense transcripts and citation chains, flagging severity. Wants the page to feel like an evidence file, not a SaaS dashboard.

→ **Light theme**, warm-paper surface. Dark tools at 11pm tire the eyes when the work is reading. Paper holds attention longer than glass.

## Color strategy

**Restrained**, with a single committed accent for severity. Tinted ivory/bone surfaces, ink-navy type, oxblood for severity and authority, jade for "approved/peer-reviewed." Warm tones throughout — no cool gray, no pure white.

All values OKLCH.

### Tokens

```
/* Surfaces — warm paper, never #fff */
--ink-paper:        oklch(97.5% 0.012 80);    /* page */
--ink-paper-dim:    oklch(95% 0.014 80);      /* card / inset */
--ink-paper-shade:  oklch(92% 0.018 80);      /* hover, code blocks */
--ink-rule:         oklch(85% 0.016 75);      /* hairline borders */
--ink-rule-strong:  oklch(70% 0.020 70);      /* primary borders */

/* Type — ink, never #000 */
--ink-body:         oklch(22% 0.020 250);     /* paragraph text */
--ink-display:      oklch(16% 0.025 250);     /* headlines */
--ink-quiet:        oklch(45% 0.018 250);     /* secondary, captions */
--ink-faint:        oklch(60% 0.014 250);     /* tertiary, metadata */

/* Severity — oxblood gradient */
--sev-0:            oklch(65% 0.05  130);     /* adequate (sage) */
--sev-1:            oklch(72% 0.10  85);      /* concerning (ochre) */
--sev-2:            oklch(62% 0.15  45);      /* harmful (rust) */
--sev-3:            oklch(48% 0.18  25);      /* serious (oxblood) */
--sev-4:            oklch(35% 0.20  20);      /* critical (deep oxblood) */

/* Authority — primary brand */
--brand-stamp:      oklch(38% 0.16  22);      /* "PRIMUM" stamp red */
--brand-ink:        oklch(28% 0.06  255);     /* navy ink */
--brand-jade:       oklch(48% 0.09  165);     /* approved, peer-reviewed */
--brand-jade-soft:  oklch(75% 0.05  165);     /* approved bg tint */
```

## Typography

Three families, each does one job.

- **Display / argument**: `"GT Sectra"`, `"Source Serif 4"`, `Georgia`, serif. Headlines, case titles, pull-quotes, abstracts. High contrast, modern serif feel.
- **Body / data**: `"JetBrains Mono"`, `"IBM Plex Mono"`, ui-monospace, monospace. Transcript turns, code, citations, timestamps, IDs. Tight tracking. This is where most of the reading happens.
- **UI chrome**: `"Inter"`, `"Söhne"`, system-ui, sans-serif. Nav, buttons, badges, tabs. Quiet supporting role.

### Scale

```
--type-xs:    0.75rem   /* 12 — captions, IDs */
--type-sm:    0.875rem  /* 14 — UI, metadata */
--type-base:  1rem      /* 16 — transcript, body */
--type-md:    1.125rem  /* 18 — body large */
--type-lg:    1.5rem    /* 24 — section heads */
--type-xl:    2.25rem   /* 36 — page titles */
--type-2xl:   3.5rem    /* 56 — case display */
--type-hero:  5rem      /* 80 — landing hero */
```

Body line length cap: **68ch**. Transcript turns: **72ch**.

Weight contrast: 400 (regular), 500 (medium for UI emphasis), 700 (bold for severity flags), serif uses 400/700 only.

## Spacing rhythm

Vary, don't repeat. Three scales coexist:

- **Tight** (`0.25rem` increments): inside data tables, transcript metadata, badge internals.
- **Standard** (`0.5rem` increments): forms, buttons, card internals.
- **Editorial** (`1rem`, `2rem`, `4rem`, `6rem`): between sections on a case page. The page should breathe like a journal article.

Never apply uniform padding to the whole page.

## Borders & rules

Hairline (`0.5px solid var(--ink-rule)`) is the default. Use 1px solid only for primary structural borders (case header, abstract block). **Never** colored side-stripes (banned).

Decorative rules: a single horizontal line with a small caps label centered on it, in the manner of a journal article section break. Never gradients.

## Elevation

Almost none. This is paper. A page can have a single raised element (the active case card), at most. Use:

```
box-shadow: 0 1px 0 var(--ink-rule), 0 12px 40px -20px oklch(20% 0.02 80 / 0.15);
```

Never blur backdrops. Never glassmorphism.

## Motion

- Page transitions: instant, no fade.
- Hover: 120ms ease-out-quart on color/opacity only. Never on layout properties.
- Severity flag entrance: 240ms ease-out-expo, fades in from 0 opacity, slight 4px y-offset.
- Stamp animations (`PEER REVIEWED`, `ARCHIVED`): 1-shot rotate-in (-8deg → 0deg) with 320ms ease-out-quint, only on first paint.
- Reduce-motion: disable all entrance animations; keep hover.

## Iconography

Glyphs over icons. Wherever possible, use a single character at the right size and color: `§` for sections, `¶` for citations, `№` for case numbers, `▲▼` for severity arrows, `✕✓` for fail/pass. Lucide-style line icons only when a glyph won't communicate. No filled icons.

## Components — high-level recipes

### Case card (archive list)

A horizontal record, NOT a card grid tile. Left rail: case number set in serif, very large. Right body: title, severity flag bar, persona-target line, dateline. A hairline divides each row. Hover: subtle background tint, no lift.

### Severity flag

Five steps, rendered as a stacked bar of five segments. Lit segments use the severity color; unlit are `--ink-rule`. Caption underneath: small caps, the failure category names.

### Transcript turn

Two columns inside a single block: left column is the speaker label and turn number in monospace small caps; right column is the turn content in monospace body. Turns alternate paper / paper-dim background. The failed turn has a left margin-note (not a stripe — a callout in the gutter) with the failure annotation in oxblood.

### Comparison block (rejected vs chosen)

Two stacked panels with a centered horizontal "TURN N — CORRECTION" rule between them. Top panel labelled `ORIGINAL` in oxblood small caps; bottom labelled `CORRECTED` in jade small caps. Same monospace body in both.

### Stamp

Pure CSS, looks rubber-stamped: oxblood or jade, slightly rotated, double-line outline, condensed sans small caps inside. Used for `PEER REVIEWED`, `ARCHIVED`, `IN REVIEW`, `FILED 2026-04-25`.

## Anti-patterns to avoid (project-specific)

- **Cards everywhere.** Use editorial flow. Cards are for the archive index only.
- **Pastel "wellness" anything.** Surfaces stay warm-paper. No mint, no lavender, no peach.
- **Big-number hero metrics.** No "847 CASES ANALYZED" hero stat. Numbers go inline in prose.
- **Modals.** Inline disclosures only, except for confirm-destructive actions.
- **Emoji.** Never. Glyphs only.
