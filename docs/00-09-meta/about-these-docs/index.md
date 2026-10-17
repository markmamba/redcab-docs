---
title: About these docs
sidebar_position: 1
description: How Red Cab documentation is organized (Johnny Decimal).
---

## TL;DR

- Single site for product, architecture, and engineering — organized with [Johnny Decimal](https://johnnydecimal.com/) area numbers.
- **Document precedence** and layers: [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system).
- Implementation specs: [2026 implementation specs](/docs/60-69-initiatives/61-2026/implementation-specs/). Programs (non-normative): under `61-2026/` (for example [Catalog revamp 2026](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/)).

## Area ranges

| Range | Area | Red Cab content |
| --- | --- | --- |
| 00–09 | Meta | Conventions, start-here, about |
| 20–29 | Backend | API conventions, infrastructure |
| 30–49 | Domains | Bounded contexts, domain models, ADRs, **domain folders** (e.g. Catalog) |
| 50–59 | Frontend | Web conventions |
| 60–69 | Initiatives | `61-2026/` programs and implementation specs |
| 70–79 | Business | Glossary, requirements, roadmap, explainers |
| 80–89 | Legacy | Superseded material, alias table |
| 90–99 | Engineering meta | Authentication series, cross-cutting engineering |

## Legacy URLs

Older paths (`/docs/70-79-business/`, `/docs/30-49-domains/`, `/docs/90-99-engineering-meta/`) redirect to the new locations. Bookmarked GitHub Pages links keep working.

## AI agents

`RED_CAB_DOCS_PATH` still points at `redcab-docs/docs/`. See [AGENTS.md](https://github.com/markmamba/redcab-docs/blob/main/AGENTS.md) in this repository for read order and spec paths.
