---
title: About these docs
sidebar_position: 1
description: How Red Cab documentation is organized (Johnny Decimal).
---

## TL;DR

- Single site for product, architecture, and engineering — organized with [Johnny Decimal](https://johnnydecimal.com/) area numbers.
- **Document precedence** still applies: business rules → requirements → domain → ADRs → engineering → implementation specs → code.
- Implementation specs live under [Initiatives](/docs/60-69-initiatives/implementation-specs/).

## Area ranges

| Range | Area | Red Cab content |
| --- | --- | --- |
| 00–09 | Meta | Conventions, start-here, about |
| 20–29 | Backend | API conventions, infrastructure |
| 30–49 | Domains | Bounded contexts, domain models, ADRs, patterns |
| 50–59 | Frontend | Web conventions |
| 60–69 | Initiatives | Per-issue implementation specs |
| 70–79 | Business | Glossary, requirements, roadmap, explainers |
| 90–99 | Engineering meta | Authentication series, cross-cutting engineering |

## Legacy URLs

Older paths (`/docs/70-79-business/`, `/docs/30-49-domains/`, `/docs/90-99-engineering-meta/`) redirect to the new locations. Bookmarked GitHub Pages links keep working.

## AI agents

`RED_CAB_DOCS_PATH` still points at `redcab-docs/docs/`. See [AGENTS.md](https://github.com/markmamba/redcab-docs/blob/main/AGENTS.md) in this repository for read order and spec paths.
