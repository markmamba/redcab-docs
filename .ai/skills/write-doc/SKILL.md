---
name: write-doc
description: Write or rewrite a Docusaurus page in the Red Cab docs repo — explainer, ADR, bounded-context page, or engineering convention. Loads write-tier-a-prose first. Not for implementation specs (use write-implementation-spec in api/web).
argument-hint: "[explainer | adr | context | convention] [topic]"
---

# write-doc

Read `.ai/skills/write-tier-a-prose/SKILL.md` first.

The reader starts cold. They must understand the page in one read.

## Pick the doc type

| User need | Type | Target path |
| --- | --- | --- |
| Non-normative teaching story | **Explainer** | `docs/70-79-business/74-explainers/{slug}.md` |
| Architecture decision record | **ADR** | `docs/30-49-domains/34-architecture-decisions/adr-{NNN}-{slug}.md` |
| Bounded context overview | **Context** | `docs/30-49-domains/31-bounded-contexts/{context}.md` |
| Engineering how-to or convention | **Convention** | Under `20-29-backend/`, `50-59-frontend/`, or `90-99-engineering-meta/` |
| Per-issue shipping design | **Not this skill** | `write-implementation-spec` in `red-cab-api` or `red-cab-web` |

When the type is unclear, ask one question with two likely types.

## Docusaurus frontmatter

Every page needs YAML frontmatter with at least `title` and `description`. Match neighboring pages in the same folder for `sidebar_position` and labels.

ADR files use `sidebar_label: ADR-NNN` and follow an existing ADR as a shape reference (for example `adr-001-modular-monolith.md`).

## Facts ledger

Before drafting:

1. Write `scratchpad/facts-{slug}.md` — one row per fact with source (doc path, code path, or "user stated").
2. For rewrites, list every fact on the old page first.
3. After draft, map each row to a section in the new page.

Proposed rules or numbers that nobody stated go to `## Open questions` as "proposed, not agreed".

Schema truth for tables: `red-cab-api/app/docs/db/*.dbml`.

## Workflow

1. Load `write-tier-a-prose`.
2. Pick doc type and read templates in `references/templates.md`.
3. Read sources named by the user and governing docs for the topic.
4. Draft to `scratchpad/doc-draft-{slug}.md`.
5. Run prose check scripts.
6. Move content to the final path under `docs/`.
7. Run `npm run build` from the repo root.
8. Hand off: final path, tier used, open questions, and any template deviations.

Do not commit, push, or open a PR unless the user asks.

## Self-check

- If `grep -c '^## TL;DR'` on the draft is greater than 1, dedupe to a single TL;DR + About block before hand-off.
- Tier A body for explainers; Tier C allowed for ADR rationale sections per `prose-and-ste100.md`.
- Link to authoritative sources instead of restating invariants as optional.
- Use site paths in cross-links: `/docs/70-79-business/business-rules/glossary`.
- Mermaid diagrams: use skill `mermaid-diagram` or follow its rules inline.

## About this document block

Many pages include an "About this document" table linking related docs. Copy the pattern from a sibling page in the same category.
