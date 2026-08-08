---
title: Engineering Overview
sidebar_position: 1
description: How planning docs connect to red-cab-api and red-cab-web implementation.
---

## TL;DR

- Bridges **domain architecture** to **coding conventions** for `red-cab-api` and `red-cab-web`.
- Domain rules always win over generic patterns (pricing authority, snapshots, money-facts vs movement).
- Read domain-to-code mapping first, then backend and/or frontend conventions by task.

## About this document

Engineering overview — how planning docs connect to implementation repos.

| Topic | Document |
| --- | --- |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |
| API conventions | [Backend Conventions](/docs/engineering/backend-conventions) |
| Web conventions | [Frontend Conventions](/docs/engineering/frontend-conventions) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## Purpose

The architecture set ([../architecture/overview.md](/docs/architecture/overview), ADRs, bounded contexts) describes **what** the system must do and **who owns what**. This engineering set describes **how to structure the codebase** so implementation is consistent and predictable across both repos.

These conventions use the same structural patterns you will apply when scaffolding (`Request → Manager → Validator`, `app/domains/`, explicit routes, React Router v7 SSR, ky + zod + RHF). Red Cab–specific rules (pricing authority, snapshots, actor namespaces) sit on top of that baseline — they do not replace it.

| Repo (planned) | Conventions documented in |
| --- | --- |
| `red-cab-api` | [Backend Conventions](/docs/engineering/backend-conventions) — Request → Manager → Validator, `app/domains/`, explicit routes, DBML-first schema |
| `red-cab-web` | [Frontend Conventions](/docs/engineering/frontend-conventions) — React Router v7 SSR, `app/routes/`, `app/api/`, `app/domains/`, ky + zod + RHF |

Domain rules from Red Cab planning **always win** over generic patterns when they conflict (e.g. single pricing authority, immutable snapshots, money-facts vs money-movement).

---

## Reading order

### Before first commit

1. [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) — actors, bounded contexts → folders, route namespaces
2. [Backend Conventions](/docs/engineering/backend-conventions) — API structure, request lifecycle, DBML/migrations
3. [Frontend Conventions](/docs/engineering/frontend-conventions) — routes, API clients, forms, surfaces

### With domain context (already in planning set)

Read in parallel with:

- [../business-rules/glossary.md](/docs/business-rules/glossary)
- [../business-rules/business-rules.md](/docs/business-rules/invariants)
- [../architecture/bounded-contexts.md](/docs/architecture/bounded-contexts)
- [../domain/domain-models.md](/docs/domain/domain-models)

---

## Document precedence

When documents overlap:

1. Business Rules
2. Requirements
3. Domain Models
4. Architecture + ADRs
5. **Engineering conventions** (this folder)
6. Roadmap

Engineering conventions **must not** override invariants, context ownership, or ADR decisions. They only specify how to express those decisions in code.

### Baseline vs Red Cab–specific

| Layer | Where documented | Examples |
| --- | --- | --- |
| **Baseline patterns** | [Backend](/docs/engineering/backend-conventions) / [Frontend](/docs/engineering/frontend-conventions) convention docs | Request lifecycle, Sorbet sigs, soft delete, pagination, Team layout nesting, env gating |
| **Red Cab domain rules** | Same docs + business rules + ADRs | No client price, snapshot immutability, seat reservation guard, Corporate ACL |
| **Actor / folder mapping** | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) | `marketplace/` vs `tourists/`, surface → route groups |

When scaffolding `.ai/instructions.md` in each repo, copy the baseline patterns verbatim and append Red Cab–specific rules from this folder.

---

## What gets created at implementation time

When `red-cab-api` and `red-cab-web` repos are scaffolded, each should include a standard AI/tooling layout:

```
.ai/
  instructions.md          # Single source of truth (derived from docs in this folder)
  skills/                  # new-endpoint, new-model, creating-route-pages, etc.
.cursor/rules/             # Thin pointers to .ai/instructions.md and skills
AGENTS.md                  # Entry point for agents
```

The files in this `engineering/` folder are the **planning-time source** for those `.ai/instructions.md` files. Do not duplicate them into implementation repos until scaffolding begins.

---

## Status

| Document | Status |
| --- | --- |
| Domain-to-Code Mapping | ✅ Complete |
| Backend Conventions | ✅ Aligned (baseline + Red Cab rules) |
| Frontend Conventions | ✅ Aligned (baseline + Red Cab rules) |

