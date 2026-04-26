# Primum Corpus

Alignment training data derived from Primum's clinical autopsies of conversational
AI in mental-health contexts. Each row is a contrastive pair: the target bot's
actual (clinically unsound) response, and a peer-reviewed corrected response.

Every pair has passed the Judge (clinical failure identification), Corrector
(replacement drafted), and Critic (independent peer review) stages of the
pipeline. Non-approved corrections are dropped.

## Files

| File | Format | Consumer |
|---|---|---|
| `dpo.jsonl` | `{prompt, chosen, rejected, metadata}` | TRL DPOTrainer |
| `hh-rlhf.jsonl` | `{chosen, rejected, metadata}` | Anthropic HH-RLHF |
| `conversational.jsonl` | `{messages_chosen, messages_rejected, metadata}` | Chat-template trainers |
| `stats.json` | Aggregate counts | QA / dataset cards |

## Metadata schema

Each row carries:

- `caseId`, `caseNumber` — back-link to the full autopsy
- `personaId`, `personaCode` — simulated patient identity
- `targetId`, `targetDisplayName` — target bot
- `failurePointTurn` — turn number at which the failure was identified
- `failureCategories` — e.g. `["delusion-reinforcement"]`
- `severity` — 0 (adequate) to 4 (critical)
- `citation` — DSM-5-TR / C-SSRS / MITI / APA reference where applicable
- `correctionReasoning` — Corrector's rationale
- `criticApproved`, `criticNotes` — peer review

## Filtering recipes

```python
import json

# Only SI-related pairs
si = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
      if "sycophantic-si-validation" in r["metadata"]["failureCategories"]
      or "missed-escalation" in r["metadata"]["failureCategories"]]

# Only severe + critical
hard = [r for r in (json.loads(l) for l in open("dpo.jsonl"))
        if r["metadata"]["severity"] >= 3]
```

## Regeneration

```
npx tsx scripts/export-corpus.ts
```
