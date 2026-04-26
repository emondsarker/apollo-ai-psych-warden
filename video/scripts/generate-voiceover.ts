/**
 * Generate one MP3 per segment in src/segments.ts.
 *
 * Defaults to ElevenLabs (best for clinical-prose pacing — supports SSML
 * <break> tags for the deliberate pauses the script needs). Falls back to
 * OpenAI TTS if ELEVENLABS_API_KEY is unset and OPENAI_API_KEY is present.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... pnpm gen-voice
 *   OPENAI_API_KEY=... pnpm gen-voice         # fallback
 *   pnpm gen-voice --segments 01-hook,04-intro   # only re-render some
 *   pnpm gen-voice --dry                          # print plan, don't call
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEGMENTS, type Segment } from "../src/segments.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "voiceover");

// ── Voice + model config ─────────────────────────────────────────────────

const ELEVEN = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  // Pick a voice that reads "clinical, calm, deliberate." Default is
  // "Brian" (J9aFZc... etc) — override via ELEVEN_VOICE_ID. Browse voices at
  // https://elevenlabs.io/app/voice-library
  voiceId: process.env.ELEVEN_VOICE_ID ?? "nPczCjzI2devNBz1zQrb", // "Brian" — calm narrator
  modelId: process.env.ELEVEN_MODEL_ID ?? "eleven_turbo_v2_5",
  // Stability low → more expressive; high → more consistent. Tighten for
  // clinical narration but not so much that it goes flat.
  stability: 0.45,
  similarityBoost: 0.85,
  style: 0.25,
};

const OPENAI = {
  apiKey: process.env.OPENAI_API_KEY,
  // gpt-4o-mini-tts has the best pacing among OpenAI's tier; "alloy" is
  // calm & neutral. Override via OPENAI_TTS_VOICE.
  model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
  voice: process.env.OPENAI_TTS_VOICE ?? "alloy",
};

// ── CLI args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const onlyArg = args.find((a) => a.startsWith("--segments="));
const onlyIds = onlyArg ? onlyArg.replace("--segments=", "").split(",") : null;

// ── Provider selection ──────────────────────────────────────────────────

type Provider = "eleven" | "openai";
function pickProvider(): Provider {
  if (ELEVEN.apiKey) return "eleven";
  if (OPENAI.apiKey) return "openai";
  throw new Error(
    "Set ELEVENLABS_API_KEY (preferred) or OPENAI_API_KEY before running.",
  );
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const provider = pickProvider();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const targets = SEGMENTS.filter((s) => {
    if (!s.text || !s.text.trim()) return false; // pure-pause segment
    if (onlyIds && !onlyIds.includes(s.id)) return false;
    return true;
  });

  console.log(
    `[gen-voice] provider=${provider} · ${targets.length} segments · out=${path.relative(ROOT, OUT_DIR)}`,
  );
  if (dryRun) {
    for (const s of targets) console.log(`  ${s.id}  ${s.duration}s  "${s.text.slice(0, 60)}…"`);
    return;
  }

  for (const seg of targets) {
    const outPath = path.join(OUT_DIR, `${seg.id}.mp3`);
    process.stdout.write(`  ${seg.id} … `);
    try {
      const buf = await synthesize(provider, seg);
      await fs.writeFile(outPath, buf);
      console.log(`${(buf.byteLength / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.log(`FAILED — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("[gen-voice] done.");
}

// ── ElevenLabs ───────────────────────────────────────────────────────────

async function synthesizeEleven(seg: Segment): Promise<Buffer> {
  // Eleven understands SSML inside the regular text body since v2.5; we
  // feed seg.ssml when present so the <break> tags do their work.
  const text = seg.ssml ?? seg.text;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN.voiceId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN.apiKey!,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVEN.modelId,
      voice_settings: {
        stability: ELEVEN.stability,
        similarity_boost: ELEVEN.similarityBoost,
        style: ELEVEN.style,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ── OpenAI TTS ───────────────────────────────────────────────────────────

async function synthesizeOpenAI(seg: Segment): Promise<Buffer> {
  // OpenAI doesn't accept SSML directly. We approximate the breaks by
  // inserting commas around bracketed pause phrases — close enough for
  // a fallback rendering when ElevenLabs isn't available.
  const text = seg.ssml
    ? seg.ssml.replace(/<break[^>]*\/>/g, ", ").replace(/<\/?speak>/g, "")
    : seg.text;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI.model,
      voice: OPENAI.voice,
      input: text,
      response_format: "mp3",
      speed: 1.0,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthesize(provider: Provider, seg: Segment): Promise<Buffer> {
  return provider === "eleven" ? synthesizeEleven(seg) : synthesizeOpenAI(seg);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
