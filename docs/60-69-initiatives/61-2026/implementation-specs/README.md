---
title: Implementation Specs
sidebar_label: Specs
sidebar_position: 1
description: Per-issue implementation specs — persistent design artifacts committed before code.
---

## TL;DR

- One **implementation spec** per GitHub issue (or per PR when an issue is large).
- Specs are the bridge from requirements and ADRs to code in `red-cab-api` and `red-cab-web`.
- Status must be **`approved`** before codegen skills run.
- When scope or design changes, **update the spec first**, then code.
- **Program and audit** plans live as siblings under `61-2026/` (for example [Catalog revamp 2026](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/)); they are not implementation specs.

## About this document

How to write, review, and link implementation specs. See [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system) for precedence and doc types.

Narrative sections (TL;DR, Problem, Out of scope, Acceptance criteria) follow [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) (Tier A). Contract tables and file paths stay precise.

| Topic | Document |
| --- | --- |
| Prose (STE100) | [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) |
| Spec template | `_template.md` (repo file; not published) |
| Example (audit series) | [IAM Audit 2026-08](/docs/60-69-initiatives/61-2026/implementation-specs/iam/iam-audit-2026-08/) |
| Requirements | [Requirements](/docs/70-79-business/requirements) |
| Engineering | [Engineering](/docs/90-99-engineering-meta) |

---

## Workflow

1. **Write** — Copy `60-69-initiatives/61-2026/implementation-specs/_template.md` → `{context}/{repo}-{issue}-{slug}.md`. Fill all sections (Tier A prose; see `write-plain-english` in `redcab-docs/.claude/skills/`).
2. **Review** — Run skill `review-implementation-spec`. Fix findings. Set `status: approved` in frontmatter.
3. **Implement** — Use repo codegen skills (`new-endpoint`, `creating-route-pages`, etc.) with `spec_path` pointing at this file.
4. **Verify** — Run verification commands in the spec. Run `review-rails-style` / `review-react-style`.
5. **PR** — Link the spec path in the PR description.

## Naming

### Filename (machine identity)

```
60-69-initiatives/61-2026/implementation-specs/{context}/[{module}/]{repo}-{issue}-{slug}.md
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
| `superseded` | Replaced by a newer spec or domain ruling; do not use for `spec_path` |
| `implemented` | Optional: merged; historical record (not required) |

Use optional frontmatter `superseded_by:` with a path or URL to the replacement.

## Precedence

Implementation specs sit **below** global rules, platform ADRs, and domain rulings. Full order: [Documentation system — precedence](/docs/00-09-meta/conventions/documentation-system#precedence).

Specs **must not** contradict invariants, ADRs, or context ownership. If they appear to, fix the spec or resolve the `AMB-*` item first.

## Linking

- **Upstream:** cite governing docs (legacy `FR-*` / `ADR-*` IDs or links to domain pages) in the Governing docs table.
- **Downstream:** PR description must include `Spec: docs/60-69-initiatives/61-2026/implementation-specs/{context}/{filename}.md`.
- **Multi-PR audits:** use a series folder (for example `iam/iam-audit-2026-08/pr-01-*.md`) with an `index.md`. Audit indexes are planning artifacts; prefer `doc_type: program` when not defining API contracts.
