# Red Cab Docs — Agent Instructions

Canonical planning and implementation-spec repository. Published at [redcab-docs site](https://markmamba.github.io/redcab-docs/).

## Canonical docs root

All agents resolve planning docs from:

```
redcab-docs/docs/
```

Set `RED_CAB_DOCS_PATH` to the absolute path of `docs/` when working outside this monorepo layout.

> **Deprecated:** `red-cab-docs/` is frozen. Do not update it. Use this repo (`redcab-docs/docs/`).

## Site structure (Johnny Decimal)

| Area | Path | Audience |
| --- | --- | --- |
| Meta | `docs/00-09-meta/` | Conventions, start-here |
| Backend | `docs/20-29-backend/` | API conventions, infrastructure |
| Domains | `docs/30-49-domains/` | Bounded contexts, ADRs, domain models |
| Frontend | `docs/50-59-frontend/` | Web conventions |
| Initiatives | `docs/60-69-initiatives/61-implementation-specs/` | Per-issue implementation specs |
| Business | `docs/70-79-business/` | Rules, requirements, planning |
| Engineering meta | `docs/90-99-engineering-meta/` | Authentication series, cross-cutting |

Legacy URLs under `/docs/product/`, `/docs/architecture/`, and `/docs/engineering/` redirect to the paths above.

## Document precedence

1. Business Rules (`docs/70-79-business/71-business-rules/`)
2. Requirements (`docs/70-79-business/72-requirements/`)
3. Domain Models (`docs/30-49-domains/32-domain-models/`)
4. Architecture + ADRs (`docs/30-49-domains/`)
5. Engineering conventions (`docs/20-29-backend/`, `docs/50-59-frontend/`, `docs/90-99-engineering-meta/`)
6. **Implementation specs** (`docs/60-69-initiatives/61-implementation-specs/`) — per-issue design
7. Code (`red-cab-api/`, `red-cab-web/`)

## Spec-first workflow

Before implementation code is written in api/web repos:

1. Create `docs/60-69-initiatives/61-implementation-specs/{context}/{repo}-{issue}-{slug}.md` from `docs/60-69-initiatives/61-implementation-specs/_template.md`.
2. Review with `review-implementation-spec` skill (in api or web `.ai/skills/`).
3. Set `status: approved` in spec frontmatter.
4. Implement using codegen skills with `spec_path` argument.
5. Link spec in PR description.

See [docs/60-69-initiatives/61-implementation-specs/README.md](docs/60-69-initiatives/61-implementation-specs/README.md).

## Read first (new feature work)

- `docs/70-79-business/71-business-rules/glossary.md`
- `docs/70-79-business/71-business-rules/invariants.md`
- `docs/70-79-business/73-planning/open-questions.md`
- `docs/70-79-business/73-planning/web-platform-program-strategy.md`
- Relevant `docs/70-79-business/72-requirements/functional-requirements/{ctx}.md`
- Relevant `docs/30-49-domains/31-bounded-contexts/{context}.md`
- `docs/20-29-backend/21-conventions/domain-to-code-mapping.md`

## Multi-PR audit series

Large audits live as spec series under `docs/60-69-initiatives/61-implementation-specs/{context}/` (e.g. `iam/iam-audit-2026-08/`). Link from specs when an issue is part of that series.

## Before generating code (auth or routes)

- [Authentication series](docs/90-99-engineering-meta/93-authentication/) — normative target design (ADR-018/019 Accepted; phased applicability)
- [Authentication implementation roadmap](docs/90-99-engineering-meta/93-authentication/implementation-roadmap.md) — Phase 0–5 gates and open questions
- [Web platform program strategy](docs/70-79-business/73-planning/web-platform-program-strategy.md) — tourist UI vs auth redesign coordination
