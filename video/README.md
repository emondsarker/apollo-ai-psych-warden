# Primum demo video

2-minute Remotion composition. The video opens on three news-article
screenshots about AI-induced psychosis, frames the audit gap, introduces
Apollo and his bench of five reviewers, walks the platform's three-step
flow (triage → sign-off → training pair), and lands on the motto.

The full narration with timestamps lives in [`SCRIPT.md`](SCRIPT.md).
The single source of truth for both the composition and the voice-over
generator is [`src/segments.ts`](src/segments.ts).

## Quick start

```bash
# 1 — install
pnpm install

# 2 — drop your three article screenshots in public/articles/
#     (article-1.png, article-2.png, article-3.png — see that folder's README)

# 3 — generate voiceover (ElevenLabs preferred for the SSML <break> pauses)
ELEVENLABS_API_KEY=sk_... pnpm gen-voice

# 4 — preview
pnpm dev   # opens Remotion Studio at http://localhost:3000

# 5 — render the final MP4
pnpm render   # → out/primum-demo.mp4
```

The platform-flow scenes (Apollo, bench, triage, sign-off, training)
are rendered as styled HTML mockups in
[`src/components/ProductScene.tsx`](src/components/ProductScene.tsx),
so the video renders end-to-end with no captured footage — just the
three article screenshots you supply.

## Visual kinds

`Segment.visual.kind` in `src/segments.ts` is one of:

| kind | source | used for |
| --- | --- | --- |
| `article` | `public/articles/article-N.png` | The 3 cold-open headlines |
| `scene` | rendered React mockup | Apollo · bench · triage · sign-off · training |
| `title` | TitleCard component | The audit-gap bridge and the close |

## Voice-over

ElevenLabs handles SSML `<break time="…"/>` tags inline — exactly what the
clinical pacing of this script needs.

| Var | Purpose | Default |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | preferred provider | required for ElevenLabs |
| `ELEVEN_VOICE_ID` | which Eleven voice | `nPczCjzI2devNBz1zQrb` (Brian, calm narrator) |
| `ELEVEN_MODEL_ID` | which Eleven model | `eleven_turbo_v2_5` |
| `OPENAI_API_KEY` | fallback | required if Eleven absent |
| `OPENAI_TTS_MODEL` | which OpenAI model | `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | which voice | `alloy` |

OpenAI's TTS doesn't accept SSML, so the fallback path strips `<break>`
tags and replaces them with commas — close enough for a placeholder,
not as crisp as ElevenLabs.

Re-render only specific segments:

```bash
pnpm gen-voice --segments=04-stakes,05-meet-apollo
```

Dry-run the plan without spending tokens:

```bash
pnpm gen-voice --dry
```

Generated mp3 files land in `public/voiceover/{segment-id}.mp3`. They're
gitignored — regenerate locally each time the script changes.

## Editing the script

Open `src/segments.ts`. Each segment is timed in seconds (start +
duration), so you don't have to do frame math. The validator at the
bottom of the file refuses to compile if segments overlap or overflow
the 120-second runtime.

After editing copy, regenerate just that segment's voiceover and reload
Studio:

```bash
pnpm gen-voice --segments=07-triage
```

## Rendering

```bash
pnpm render          # 1080p MP4 → out/primum-demo.mp4
pnpm render:hi       # PNG image format, lower concurrency, sharper output
```

## Aesthetic

Matches the Primum app:

- Source Serif 4 for display type
- IBM Plex Mono / JetBrains Mono for monospace lower-thirds
- Pink-red severity accent (`oklch(70% 0.20 16)`)
- Soft radial vignette over a dark canvas
- 4×4 dot-matrix peer avatars derived from initials (same algorithm as
  the app's `PeerAvatar`)
