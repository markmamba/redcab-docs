---
name: write-doc
description: Write or rewrite a Docusaurus page in the Red Cab docs repo — a domain decision entry, a domain front door or model page, an explainer, or an engineering convention. Loads write-plain-english first. Not for implementation specs (use write-implementation-spec in api/web).
argument-hint: "[decision | domain-page | explainer | convention] [topic]"
---

# write-doc

Read `.claude/skills/write-plain-english/SKILL.md` first.

The reader starts cold. They must understand the page in one read.

- Use only the sections of the chosen template, in order.
- Do not invent a section name. Omit a section that has no content.
- A feature explainer opens with the problem. A GitHub issue opens with context (`write-issue`).

## Pick the doc type

| User need | Type | Target path |
| --- | --- | --- |
| A ruling of a domain (what we decided, why, what we did not choose) | **Decision entry** | `docs/30-49-domains/{nn}-{domain}/{domain}-decisions.md`, as a new `## D<n>` section |
| Front door, model page or use-case page of a domain | **Domain page** | `docs/30-49-domains/{nn}-{domain}/index.md`, `models/{slug}.md` or `use-cases/{slug}.md` |
| Non-normative teaching story | **Explainer** | `docs/70-79-business/74-explainers/{slug}.md` |
| Engineering how-to or convention | **Convention** | Under `20-29-backend/`, `50-59-frontend/`, or `90-99-engineering-meta/` |
| Per-issue shipping design | **Not this skill** | `implementation-specs/` in this repo (`_template.md`) |
| Early design before a spec | **Not this skill** | `system-design` → scratchpad, then issue and implementation spec |

When the type is unclear, ask one question with two likely types.

## Decision entries need the owner

A decision entry records a ruling that a person made.

- Do not write a ruling that nobody stated. Ask the owner for each rule.
- Until the principal developer approves it, keep the idea under *Open questions* on the same page as "proposed, not agreed".
- Never copy a rule from an old spec, invariant, requirement or ADR. Start from the use case.
- After approval, add the entry, add its row to the *Rule index* of the front door, and set the front door `status` to `current` if it was `draft`.

## Docusaurus frontmatter

Every page needs YAML frontmatter with at least `title` and `description`. Match neighboring pages in the same folder for `sidebar_position` and labels.


MDX treats `{...}` and `<...>` in prose as JSX. Put them fully inside backticks.

## Facts ledger

Before drafting:

1. Write `scratchpad/facts-{slug}.md` — one row per fact with source (doc path, code path, or "user stated").
2. Add a **Checked** column: code, user, derived, or unverified.
3. For rewrites, list every fact on the old page first.
4. After draft, map each row to a section in the new page (section name and row or step, not line numbers).

Proposed rules or numbers that nobody stated go to `## Open questions` as "proposed, not agreed".

Schema truth for tables: `red-cab-api/docs/db/*.dbml`. Verify columns before stating them in normative prose.

A fact the agent adds without a source is not a fact until the user confirms.

## Workflow

1. Load `write-plain-english`.
2. Pick doc type and read templates in `references/templates.md`.
3. Read sources named by the user and governing docs for the topic.
4. Ask up to five gap questions in one message, each with a default answer.
5. Draft to `scratchpad/doc-draft-{slug}.md`.
6. Run self-check (below).
7. Move content to the final path under `docs/`.
8. Run `npm run build` from the repo root.
9. Hand off in five lines: final path, tier used, template deviations, open questions, unverified facts.

Do not paste the full page into chat. Do not commit, push, or open a PR unless the user asks.

## Self-check

Run all four scripts from `write-plain-english` on the draft and on the facts ledger. All must exit 0.

```bash
python3 .claude/skills/write-plain-english/scripts/check_sentences.py <file>
python3 .claude/skills/write-plain-english/scripts/check_bullets.py <file>
python3 .claude/skills/write-plain-english/scripts/check_leads.py <file>
python3 .claude/skills/write-plain-english/scripts/check_weak_words.py <file>
```

Then check what no script sees:

| Check | How |
| --- | --- |
| Every fact survived | Each ledger row maps to a section and row or step on the page |
| Every heading stands alone | Read each `##` and its first sentence as if from the table of contents |
| Words table when needed | Tables, models, or roles named → `## Words used in this doc` or equivalent |
| One worked example | Numbered walk of one person or value where the template calls for it |
| Current truth only | No "used to be"; history links to the domain decisions page or an explainer |
| Link authoritative rules | Do not restate invariants as optional in explainers |
| No invented section | Every `##` heading appears in `references/templates.md` for that type |
| Single TL;DR | At most one `## TL;DR` on explainers that use it |
| Entry shape | A decision entry has the heading `## D<n> — Title (YYYY-MM-DD) \{#slug\}`, and `n` is the last number plus one |
| Entry anchors | The sub-sections *Why*, *What changes with it* and *Options we did not choose* have their own ids |

- If `grep -c '^## TL;DR'` on the draft is greater than 1, dedupe before hand-off.
- Tier A body for explainers; Tier C allowed for the *Why* part of a decision entry per `prose-and-ste100.md`.
- Cross-links: site paths `/docs/...` or file-relative links per neighboring pages.
- Mermaid: skill `mermaid-diagram`.

## About this document block

Many pages include an "About this document" table linking related docs. Copy the pattern from a sibling page in the same category.

Templates with section order: `references/templates.md`.
