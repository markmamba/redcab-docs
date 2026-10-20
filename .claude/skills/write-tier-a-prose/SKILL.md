---
name: write-tier-a-prose
description: Red Cab STE Tier A/B/C — when prose rules apply, glossary tie-in, and hand-off checklist. Load write-plain-english first for sentence, bullet, naming, and check scripts.
---

# write-tier-a-prose

This skill does not repeat the full prose rulebook. Load **`write-plain-english`** first for sentences, bullets, naming, words, doc contents, and check scripts.

Read **`docs/00-09-meta/conventions/prose-and-ste100.md`** for the canonical tier definitions humans use on the site.

## Tiers (quick)

| Tier | Where | STE |
| --- | --- | --- |
| A | Explainers; implementation spec TL;DR, Problem, Out of scope, AC; user errors; GitHub issue and PR prose | Required |
| B | Requirements body (`FR-*`, `NFR-*`); glossary | Sentences only; keep **shall** / **may** and defined terms |
| C | ADRs, invariants page, long architecture rationale | Not required |

Use [Glossary](/docs/70-79-business/business-rules/glossary) terms exactly in Tier B. In Tier A you may add a plain phrase on first use.

## Agent workflow

1. Load `write-plain-english`.
2. Pick the tier for the artifact from the table above (or from `prose-and-ste100.md`).
3. Draft or rewrite.
4. Run all four scripts under `.claude/skills/write-plain-english/scripts/`.
5. Hand off: tier used, script results, open questions, unverified facts.

## Hand-off

- State which tier applied.
- List script results (four exits).
- Name open questions and unverified facts separately.

Examples and words to avoid: `write-plain-english/references/examples.md` and `write-plain-english/references/words-to-avoid.md`.
