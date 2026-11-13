---
title: Documentation conventions
sidebar_position: 2
description: Johnny Decimal structure, naming, link style, and prose (ASD-STE100).
---

## Documentation system

Layers, precedence, spec status (`superseded`), and migration rules: [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system).

## Prose (ASD-STE100)

Every human-readable text follows [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100).

One register applies to docs, specs, issues, PRs and user-facing errors.

- A legacy requirement keeps its `FR-*` ID and its **shall** / **may** keywords.
- A legacy ADR keeps its text until a domain page replaces it.

## Johnny Decimal structure

| Level | Numbered? | Example |
| --- | --- | --- |
| Area | Yes | `30-49-domains/` |
| Category | Yes | `31-catalog/` |
| Page / topic | No | `catalog/index.md` |

Numbers apply at **area** and **category** only so new pages can be inserted without renumbering files.

## File naming

- Folders: kebab-case (`catalog`, `implementation-specs`).
- Main page: `index.md` per folder.
- Implementation specs: `{repo}-{issue}-{slug}.md` under `60-69-initiatives/61-2026/implementation-specs/{context}/`.

## Links

- Prefer absolute site paths in cross-tier links: `/docs/70-79-business/business-rules/glossary`.
- Use relative paths only within the same category when it stays readable.

## Document precedence

See [Documentation system — precedence](/docs/00-09-meta/conventions/documentation-system#precedence).

Program pages under `61-2026/` are not in the normative chain.
