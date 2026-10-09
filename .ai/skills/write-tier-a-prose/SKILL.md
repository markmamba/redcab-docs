---
name: write-tier-a-prose
description: Red Cab prose rules for Tier A and Tier B text — STE profile, bullet shape, naming, words to avoid, and local check scripts. Load before write-issue, write-doc, or any rewrite of team-facing markdown.
---

# write-tier-a-prose

Read `docs/00-09-meta/conventions/prose-and-ste100.md` first. This skill adds operational rules for agents and links check scripts.

The reader may be a non-native English speaker. They must understand the text in one read.

## Tiers (quick)

| Tier | Where | STE |
| --- | --- | --- |
| A | Issues, PRs, spec TL;DR/Problem/Out of scope/AC, explainers, user errors | Required |
| B | Requirements body, glossary | Sentences only; keep **shall** / **may** and defined terms |
| C | ADRs, long architecture rationale | Optional |

Use [Glossary](/docs/70-79-business/business-rules/glossary) terms exactly in normative docs. Do not swap a glossary term for a casual synonym in Tier B.

## Sentences

- One idea per sentence. Aim for 20 words or fewer when meaning stays clear.
- Active voice, present tense: "The API validates the session", not "The session is validated".
- Same word for the same concept on one page.
- No idioms or metaphors. Write the literal meaning.
- Delete a sentence that only repeats a table or code block.

## Bullet shape

```
{Main idea in one sentence on its own line.}
- {One sentence.}
- {One sentence.}
  - {At most one nested level.}
```

- A list item holds one sentence. A second sentence becomes a nested or sibling bullet.
- Do not hide lists inside one sentence with semicolons or em dashes.
- Tables and fenced code blocks sit under a one-sentence lead, not deep inside nested bullets.

## Shorter text, same facts

Rewrites may reduce word count. They may not drop facts.

- Before rewriting, list every fact from the source in `scratchpad/facts-{slug}.md`.
- After rewriting, each fact maps to a line in the new text.
- Numbers, actors, file paths, and requirement IDs stay exact.

## Name things

Every technical reference includes its kind:

- `docs/60-69-initiatives/61-implementation-specs/_template.md`
- `Booking::Reservation` in `red-cab-api`
- column `bookings.status` (table plus column)
- invariant `INV-3` with link to the invariants page

Avoid bare "the model", "the endpoint", or "it" across paragraphs.

## Words to avoid (Tier A)

Prefer plain words. See `references/words-to-avoid.md` for a short list.

When a glossary term is the approved name (for example **Snapshot**), use the term; do not replace it with informal wording in Tier B.

## Self-check scripts

From the repo root, run on a draft markdown file:

```bash
python3 .ai/skills/write-tier-a-prose/scripts/check_long_sentences.py path/to/file.md
python3 .ai/skills/write-tier-a-prose/scripts/check_weak_words.py path/to/file.md
```

- `check_long_sentences.py` exits 0 when no sentence exceeds the word limit (default 25).
- `check_weak_words.py` exits 0 when no blocked phrase appears.

Fix or justify every non-zero exit before hand-off.

## Hand-off

- State which tier applied.
- List script results.
- Name open questions and unverified facts separately.
