---
title: Documentation conventions
sidebar_position: 2
description: Johnny Decimal structure, naming, link style, and prose (ASD-STE100).
---

## Prose (ASD-STE100)

Human-readable text uses [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) by tier:

- **Tier A (required):** explainers, spec narrative, user-facing errors, GitHub issues and PRs.
- **Tier B (sentences only):** requirements and glossary — keep **shall** / **may** and defined terms.
- **Tier C:** ADRs and dense architecture — STE optional.

## Johnny Decimal structure

| Level | Numbered? | Example |
| --- | --- | --- |
| Area | Yes | `30-49-domains/` |
| Category | Yes | `31-bounded-contexts/` |
| Page / topic | No | `catalog/index.md` |

Numbers apply at **area** and **category** only so new pages can be inserted without renumbering files.

## File naming

- Folders: kebab-case (`bounded-contexts`, `implementation-specs`).
- Main page: `index.md` per folder.
- Implementation specs: `{repo}-{issue}-{slug}.md` under `60-69-initiatives/61-implementation-specs/{context}/`.

## Links

- Prefer absolute site paths in cross-tier links: `/docs/70-79-business/business-rules/glossary`.
- Use relative paths only within the same category when it stays readable.

## Document precedence

When documents disagree, higher layers win:

1. Business rules (`70-79-business/71-business-rules/`)
2. Requirements (`70-79-business/72-requirements/`)
3. Domain models (`30-49-domains/32-domain-models/`)
4. Architecture + ADRs (`30-49-domains/`)
5. Engineering conventions (`20-29-backend/`, `50-59-frontend/`, `90-99-engineering-meta/`)
6. Implementation specs (`60-69-initiatives/61-implementation-specs/`)
7. Application code (`red-cab-api/`, `red-cab-web/`)
