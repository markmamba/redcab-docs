---
title: Implementation Specs
sidebar_label: Specs
sidebar_position: 1
description: Per-issue implementation specs — persistent design artifacts committed before code.
---

## TL;DR

- One **implementation spec** per GitHub issue (or per PR when an issue is large).
- Specs are the bridge from `FR-*` / `ADR-*` requirements to code in `red-cab-api` and `red-cab-web`.
- Status must be **`approved`** before codegen skills run.
- When scope or design changes, **update the spec first**, then code.

## About this document

How to write, review, and link implementation specs in the KOS pipeline.

| Topic | Document |
| --- | --- |
| Spec template | [_template.md](./_template.md) |
| Example (audit PR note) | [IAM Audit PR notes](/docs/roadmap/notes) |
| Requirements | [Requirements](/docs/requirements) |
| Engineering | [Engineering](/docs/engineering) |

---

## Workflow

1. **Write** — Copy `_template.md` → `{issue-id}-{slug}.md`. Fill all sections. Run skill `write-implementation-spec` if using AI.
2. **Review** — Run skill `review-implementation-spec`. Fix findings. Set `status: approved` in frontmatter.
3. **Implement** — Use repo codegen skills (`new-endpoint`, `creating-route-pages`, etc.) with `spec_path` pointing at this file.
4. **Verify** — Run verification commands in the spec. Run `review-rails-style` / `review-react-style`.
5. **PR** — Link the spec path in the PR description.

## Naming

```
{context}-{repo}-{nn}-{slug}.md
```

Examples:

- `bkg-api-01-checkout-session.md`
- `iam-web-02-account-settings-page.md`
- `cat-api-03-listing-publish.md`

## Status values

| Status | Meaning |
| --- | --- |
| `draft` | Work in progress; not ready for review |
| `review` | Ready for `review-implementation-spec` |
| `approved` | Design locked; codegen may proceed |
| `implemented` | Merged; spec is historical record |

## Precedence

When documents overlap:

1. Business Rules
2. Requirements (`FR-*`, `NFR-*`)
3. Domain Models
4. Architecture + ADRs
5. Engineering conventions
6. **This implementation spec** (issue-scoped design)
7. Code

Specs **must not** contradict invariants, ADRs, or context ownership. If they appear to, fix the spec or resolve the `AMB-*` item first.

## Linking

- **Upstream:** cite `FR-*`, `ADR-*`, `INV-*`, `AMB-*` in the Governing docs table.
- **Downstream:** PR description must include `Spec: docs/specs/{filename}.md`.
- **Multi-PR audits:** link to `docs/roadmap/notes/pr-*.md` when the spec is part of a larger audit series.
