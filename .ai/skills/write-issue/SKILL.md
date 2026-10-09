---
name: write-issue
description: Draft a GitHub issue for red-cab-api, red-cab-web, or redcab-docs — Context, Problem, Direction, stable section names, and gh workflow. Loads write-tier-a-prose first.
argument-hint: "[repo] [topic]"
---

# write-issue

Read `.ai/skills/write-tier-a-prose/SKILL.md` first.

The issue body is Tier A prose. An engineer must start cold from the issue alone.

Do not invent a full implementation spec in the issue. Direction stays high level; detailed design belongs in `60-69-initiatives/61-implementation-specs/` via `write-implementation-spec` in api or web.

## Repos

| Repo | Typical work |
| --- | --- |
| `markmamba/red-cab-api` | Rails domains, endpoints, migrations |
| `markmamba/red-cab-web` | Routes, loaders, API clients, UI |
| `markmamba/redcab-docs` | Planning docs, specs, ADRs, explainers |

## Three-act structure

Use this order for non-trivial issues:

1. **Context** — Teach the problem space: models, prior ADRs, FR lines, or user journey.
2. **Problem** — State what is wrong or missing. Number multiple problems.
3. **Direction** — One suggested approach. Leave design detail for the implementation spec.

Tiny asks may use only `## Context` and `## Tasks`.

## Section vocabulary

Do not invent new `##` names. Pick from this set:

**Opening**

- `## Words used in this issue` — Table: Word | Meaning. Use when naming tables, models, or domain terms.
- `## Context`
- `## TL;DR` — Only when the issue is long; pair with fuller context below.
- `## Why this work matters` — Refactors or platform work.

**Middle**

- `## Problem` or `## Problem 1: …`
- `## What is happening today` — Bugs and regressions.
- `## Concrete example` — One numbered walk-through.
- `## Business impact` — One or two lines for customers or ops.

**Closing**

- `## Direction` or `## Proposed direction`
- `## Tasks` — `- [ ]` checklist; split phases when needed.
- `## Acceptance criteria` — Verifiable outcomes.
- `## Out of scope`
- `## Open questions`
- `## References` — Paths, issues, PRs, doc links (`/docs/...`).

## Citations

Link governing docs when you know them:

- `FR-*` from `docs/70-79-business/72-requirements/functional-requirements/`
- `INV-*` from `docs/70-79-business/71-business-rules/invariants.md`
- `ADR-*` from `docs/30-49-domains/34-architecture-decisions/`
- `AMB-*` from `docs/70-79-business/73-planning/open-questions.md`

If unsure, leave a task to confirm the ID rather than guessing.

## Workflow

1. Load `write-tier-a-prose`.
2. Read relevant governing docs and code paths the user named.
3. Draft to `scratchpad/issue-{slug}.md`.
4. Run prose check scripts on the draft.
5. Ask up to five gap questions in one message, each with a default answer.
6. Post with `gh issue create` when the user asks to publish; otherwise hand off the scratchpad path.

Templates: `references/templates.md`.

## Title

- Imperative or outcome: "Add team geography filter to area list".
- Prefix with context code when helpful: `[IAM]`, `[PAY]`, `[BKG]`.
