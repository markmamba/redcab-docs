# Red Cab Docs — Agent Instructions

Canonical planning and implementation-spec repository. Published at [redcab-docs site](https://markmamba.github.io/redcab-docs/).

## Canonical docs root

All agents resolve planning docs from:

```
redcab-docs/docs/
```

Set `RED_CAB_DOCS_PATH` to the absolute path of `docs/` when working outside this monorepo layout.

> **Deprecated:** `red-cab-docs/` is frozen. Do not update it. Use this repo (`redcab-docs/docs/`).

## Site structure (Option A — three tiers)

| Tier | Path | Audience |
| --- | --- | --- |
| Product | `docs/product/` | Stakeholders, PMs, analysts |
| Architecture | `docs/architecture/` | Architects, tech leads |
| Engineering | `docs/engineering/` | Developers, AI agents |

## Document precedence

1. Business Rules (`docs/product/business-rules/`)
2. Requirements (`docs/product/requirements/`)
3. Domain Models (`docs/architecture/domain/`)
4. Architecture + ADRs (`docs/architecture/`)
5. Engineering (`docs/engineering/`)
6. **Implementation specs** (`docs/engineering/specs/`) — per-issue design
7. Code (`red-cab-api/`, `red-cab-web/`)

## Spec-first workflow

Before implementation code is written in api/web repos:

1. Create `docs/engineering/specs/{context}/{repo}-{issue}-{slug}.md` from `docs/engineering/specs/_template.md`.
2. Review with `review-implementation-spec` skill (in api or web `.ai/skills/`).
3. Set `status: approved` in spec frontmatter.
4. Implement using codegen skills with `spec_path` argument.
5. Link spec in PR description.

See [docs/engineering/specs/README.md](docs/engineering/specs/README.md).

## Read first (new feature work)

- `docs/product/business-rules/glossary.md`
- `docs/product/business-rules/invariants.md`
- `docs/product/planning/open-questions.md`
- Relevant `docs/product/requirements/functional-requirements/{ctx}.md`
- Relevant `docs/architecture/contexts/{context}.md`
- `docs/engineering/conventions/domain-to-code-mapping.md`

## Multi-PR audit series

Large audits live as spec series under `docs/engineering/specs/{context}/` (e.g. `iam/iam-audit-2026-08/`). Link from specs when an issue is part of that series.
