---
name: write-issue
description: Draft a GitHub issue for red-cab-api, red-cab-web, or redcab-docs — Context, Problem, Direction, stable section names, templates A–E, and gh workflow. Loads write-plain-english first.
argument-hint: "[repo] [topic]"
---

# write-issue

Read `.claude/skills/write-plain-english/SKILL.md` first.

The issue body is Tier A prose. An engineer must start cold from the issue alone.

> In one read, the engineer understands the problem space, the problem, and the direction.
> No follow-up conversation is required.

Do not invent a full implementation spec in the issue. Direction stays high level. Detailed design belongs in `docs/60-69-initiatives/61-2026/implementation-specs/` via `write-implementation-spec` in api or web.

Do not invent new `##` names. Do not present a solution as a final spec.

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

Pick the subset that fits the issue.

### Opening

- `## Words used in this issue` — Table Word | Meaning. Use when naming tables, models, or domain terms (`write-plain-english`).
- `## Context`
- `## TL;DR` — Only when the issue is long; pair with fuller context below.
- `## Why this work matters` — Refactors or platform work.
- `## Status (last updated YYYY-MM-DD)` — Long-running tracking only. Subsections: Done, In flight, Not started.

### Middle

- `## Problem` or `## Problem 1: …` / `## Issue`
- `## What is happening today` — Bugs and regressions.
- `## Why it will break` / `## Root cause`
- `## Concrete example` / `## Walk-through` — Numbered steps or a table.
- `## Audit results` — Table when the problem spans many files or routes.
- `## Business impact` — One or two lines for customers or ops.

### Closing

- `## Direction` / `## Proposed direction` / `## Proposed fix`
- `## Tasks` — `- [ ]` checklist; split phases when needed.
- `## Open questions for the team` / `## Decisions needed`
- `## Acceptance criteria` — Verifiable outcomes.
- `## Out of scope` / `## Non-goals`
- `## Deliberate design choices` — Pre-empt "why not X?" on large issues.
- `## Coordination required` — Another squad or live service.
- `## Dependencies` — Blocks on another PR or issue.
- `## References` — Paths, issues, PRs, doc links (`/docs/...`).

### Long-issue extras (use sparingly)

- `## Verification` / `## How to verify` — Commands or queries before and after.
- `## Scope (file changes)` — When the issue is nearly a pre-written PR.

## Formatting rules (issue bodies)

Sentence rule, bullet shape, naming, and words come from `write-plain-english`.

### Register

- Title Case `## H2` section headings.
- Full sentences with proper punctuation.
- "We", not "you". Critique the code or decision, not the person.
- Show one concrete case before the general rule.

### Heading hierarchy

- `## H2` for top-level sections, `### H3` inside a section.
- Avoid `#### H4` unless inside `<details>`.
- Horizontal rules (`---`) only between major sections on Template D issues.

### Cross-references

- Same repo: `#1520`. Cross-repo: `markmamba/red-cab-api#42`.
- PRs: `PR #1591` or full URL when a click-out helps.
- File paths: full path from repo root in backticks.
- Doc paths: path under `redcab-docs/docs/` or site path `/docs/...`.
- People: `@handle` only when their attention is needed.

### Citations

Link governing docs when you know them:

- `FR-*` from `docs/70-79-business/72-requirements/functional-requirements/`
- `INV-*` from `docs/70-79-business/71-business-rules/invariants.md`
- `ADR-*` from `docs/30-49-domains/34-architecture-decisions/`
- `AMB-*` from `docs/70-79-business/73-planning/open-questions.md`

If unsure, leave a task to confirm the ID rather than guessing.

### Tables and diagrams

- Use tables for comparisons with 3+ rows or columns.
- For bugs with a clear repro, use a table inside `## Issue` or `## What is happening today`:

| Page / Action | Result | Expected |
| --- | --- | --- |
| | | |

- Mermaid for state flows or system maps when a branch or relationship matters. Tier A labels. Skill `mermaid-diagram`.
- Do not use "Steps to reproduce" / "Expected" / "Actual" as separate section titles. Use the table above.

### Code blocks

- Tag the language: `ruby`, `sql`, `jsx`, `bash`, `diff`.
- Show 2 to 5 lines under the claim with `# path:start-end` first.
- Never paste a full implementation. State the contract and observable outcomes.

## Length scaling: templates A–E

Match complexity. Do not over-fit a small ask to Template D.

| Template | For | Length |
| --- | --- | --- |
| A | Tiny admin task, typo, one constant | 5–10 lines |
| B | Bug with a reproducer | 20–40 lines |
| C | Feature or small change with direction | 60–120 lines |
| D | Architecture or cross-cutting | 200+ lines |
| E | Code, schema, or docs disagree — decide before coding | 80–150 lines |

Skeleton text: `references/templates.md`.

## Spec discipline

When the issue leads to an implementation spec:

- Do not restate a decision that lives in an ADR or invariant doc. Link to it.
- Every issue describes complete behavior a reviewer can verify. Every merged PR leaves `main` runnable.
- Do not paste final implementation code. Specify inputs, decisions, observable outcomes, and tests.
- Link the spec path in the issue when it exists: `docs/60-69-initiatives/61-2026/implementation-specs/...`.

## Things to never do

- Do not open with "Description". Use `## Context`.
- Do not use user-story format ("As a user, I want…") in the issue body. Stories belong in the spec or requirements.
- Do not write a complete solution. Direction only.
- Do not paraphrase identifiers. Write `Booking::Reservation` in backticks.
- Do not invent custom section names.

## Workflow when invoked

1. Load `write-plain-english`.
2. Pick template A–E. If unsure, ask one short question with a default.
3. Read governing docs and code paths the user named. Search related issues: `gh issue list`.
4. Draft to `scratchpad/issue-{slug}.md`. First line: `# Title`. Body starts after a blank line.
5. Run all four prose check scripts on the draft.
6. Show what the draft contains in a few lines. Give the path. Do not paste the whole draft into chat.
7. Ask up to five gap questions in one message, each with a default answer.
8. **Confirm before posting.** Never run `gh issue create` without explicit approval.
9. Post when approved:

```bash
gh issue create \
  --repo markmamba/<repo> \
  --title "<title>" \
  --body-file <(tail -n +3 scratchpad/issue-<slug>.md)
```

Use `--body-file`, not `--body`, so markdown round-trips cleanly.

10. Fetch back and diff: `gh issue view <n> --json body --jq .body` against the draft. Report identical or the difference.

## Title conventions

- Imperative or outcome: "Add team geography filter to area list".
- Prefix with context when helpful: `[IAM]`, `[CAT]`, `[BKG]`, `[PAY]`.
- Bug: what breaks and when.
- Investigation: plain sentence naming the files or models that disagree.

Pick one shape. Do not blend `feat:` prefixes with sentence titles unless the team adopts that convention for the repo.
