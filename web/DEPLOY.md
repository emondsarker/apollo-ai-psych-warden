# Deploying Primum

Two paths — pick the one that matches your runtime budget.

## Vercel (5 minutes, demo-grade)

The fast path. Free tier works for casual judge clicks; pro tier needed for full auto-pilot runs because the analyze and auto-review functions can take >60s.

1. Push the repo to GitHub (already done if you're reading this).
2. Go to [vercel.com/new](https://vercel.com/new), import `apollo-ai-psych-warden`.
3. Set **Root Directory** to `web`.
4. Set environment variable `ANTHROPIC_API_KEY`. Optionally set `MANAGED_AGENTS=1` to run the bench on Anthropic's managed-agents harness (recommended for the prize submission).
5. Deploy.

`vercel.json` already declares per-route `maxDuration` overrides up to 300s — those only apply on the **Pro** plan. On Hobby, a long auto-pilot run will hit the 60s wall halfway through wave 2 of the analysis. For the demo recording, run the app locally instead.

### Storage caveats

Filed signoffs are written to `content/signoffs/*.json`. On Vercel, the filesystem outside `/tmp` is read-only at runtime — files committed to the repo (the seed cases) are visible, but newly-filed cases written during a serverless invocation only persist for that lambda's lifecycle. After a cold start the new case may disappear.

For the hackathon demo this is fine: judges see the seed cases, can drop the sample zip, watch the bench file new ones, and click into the lineage during their session. Behind the scenes the writes still hit the lambda's local `/tmp`-equivalent.

For production: swap `lib/signoffs.ts` to use Vercel KV (or Upstash Redis, Turso libSQL) — the schema is already strict Zod, the storage is a thin file-IO module.

## Fly.io (15 minutes, production-grade)

If you want filesystem persistence:

```bash
cd web
fly launch --no-deploy
# In fly.toml, add:
#   [mounts]
#     source = "primum_data"
#     destination = "/app/web/content"
#
fly volumes create primum_data --size 1
fly secrets set ANTHROPIC_API_KEY=sk-ant-... MANAGED_AGENTS=1
fly deploy
```

300-second function budgets, persistent disk, single instance. Costs roughly $0–3/month at hackathon traffic.

## Environment variables

| Var | What | When |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | always required |
| `MANAGED_AGENTS` | `1` to route peer review through Claude Managed Agents instead of `messages.create` | optional |
| `OPENAI_API_KEY` | only for the demo voice-over generator (lives in `primum/video/`) | optional |
| `ELEVENLABS_API_KEY` | preferred voice-over provider | optional |
