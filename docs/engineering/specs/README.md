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
| Spec template | `_template.md` (repo file; not published) |
| Example (audit series) | [IAM Audit 2026-08](/docs/engineering/specs/iam/iam-audit-2026-08/) |
| Requirements | [Requirements](/docs/product/requirements) |
| Engineering | [Engineering](/docs/engineering) |

---

## Workflow

1. **Write** — Copy `engineering/specs/_template.md` → `{context}/{repo}-{issue}-{slug}.md`. Fill all sections. Run skill `write-implementation-spec` if using AI.
2. **Review** — Run skill `review-implementation-spec`. Fix findings. Set `status: approved` in frontmatter.
3. **Implement** — Use repo codegen skills (`new-endpoint`, `creating-route-pages`, etc.) with `spec_path` pointing at this file.
4. **Verify** — Run verification commands in the spec. Run `review-rails-style` / `review-react-style`.
5. **PR** — Link the spec path in the PR description.

## Naming

### Filename (machine identity)

```
engineering/specs/{context}/[{module}/]{repo}-{issue}-{slug}.md
```

- `repo` is `api`, `web`, or `docs` (planning-repo issues).
- `context` matches the `context:` frontmatter field (`IAM`, `CAT`, `BKG`, `PAY`, etc.).

Examples:

- `pay/api-71-payment-attempt-checkout.md`
- `iam/web-56-tourist-access-and-route-contract.md`
- `cat/geography/api-131-migrate-geography-schema.md`

### Title (human-facing)

- **`title`** — plain-language outcome only. Do **not** prefix with issue or PR numbers.
- **`sidebar_label`** — optional short label; use `Web ·`, `API ·`, or `Docs ·` for repo scope, or `1 ·`, `2 ·` for ordered audit-series items.
- **`issue:`** frontmatter — GitHub URL for traceability; agents and PRs use this plus the filename.

Examples:

| Filename | `title` | `sidebar_label` |
| --- | --- | --- |
| `web-56-tourist-access-and-route-contract.md` | Tourist access model and public route contract | Web · Tourist access |
| `api-131-migrate-geography-schema.md` | Migrate geography schema to administrative tree | API · Geography migration |
| `pr-01-restore-account-current-route.md` | Restore GET /identities/accounts/current | 1 · Account current route |

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
- **Downstream:** PR description must include `Spec: docs/engineering/specs/{context}/{filename}.md`.
- **Multi-PR audits:** use a series folder (e.g. `iam/iam-audit-2026-08/pr-01-*.md`) with an `index.md`.
