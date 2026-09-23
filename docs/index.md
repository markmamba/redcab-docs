---
sidebar_position: 1
title: Red Cab Documentation
description: Planning, architecture, and engineering documentation for the Red Cab tourism marketplace platform.
displayed_sidebar: productSidebar
---

## Welcome

Red Cab is a two-sided marketplace connecting inbound travelers and corporate clients with verified transportation and tourism providers in Japan.

This site is organized in **three tiers** — read left to right in the navbar:

| Tier | Audience | What you'll find |
| --- | --- | --- |
| [**Product**](/docs/product) | PMs, sponsors, analysts | Glossary, business rules, requirements, roadmap, explainers |
| [**Architecture**](/docs/architecture) | Architects, tech leads | Domain models, bounded contexts, patterns, ADRs, data model |
| [**Engineering**](/docs/engineering) | Developers, AI agents | Conventions, infrastructure, implementation specs |

## Start here

| I am a… | Go to |
| --- | --- |
| Executive or sponsor | [Key decisions](/docs/product/explainers/key-decisions) → [Roadmap](/docs/product/planning/roadmap) → [Open questions](/docs/product/planning/open-questions) |
| Product owner or PM | [Start here](/docs/product/start-here) |
| Business analyst or ops | [Booking lifecycle](/docs/product/explainers/booking-lifecycle) → [Money flow](/docs/product/explainers/money-flow) |
| Software architect | [Architecture overview](/docs/architecture/system/overview) → [Bounded contexts](/docs/architecture/contexts) → [ADRs](/docs/architecture/decisions) |
| Backend or frontend engineer | [Engineering overview](/docs/engineering) → [Specs](/docs/engineering/specs) |
| AI agent / Cursor | [Agent read path](/docs/product/start-here#by-role) below |

## Document precedence

When documents overlap, higher-precedence sources win:

1. Business Rules (`product/business-rules/`)
2. Requirements (`product/requirements/`)
3. Domain Models (`architecture/domain/`)
4. Architecture + ADRs (`architecture/`)
5. Engineering (`engineering/`)
6. Implementation Specs (`engineering/specs/`)
7. Code (`red-cab-api/`, `red-cab-web/`)

## AI agent read path

Read in this order before generating implementation artifacts:

1. `product/business-rules/glossary.md`
2. `product/business-rules/invariants.md`
3. `product/requirements/functional-requirements/{ctx}.md`
4. `architecture/contexts/{context}.md`
5. `architecture/domain/domain-models.md`
6. `architecture/system/overview.md`
7. `architecture/patterns/payments-architecture.md`
8. `architecture/decisions/adr-001` → `adr-017`
9. `product/planning/roadmap/`
10. `engineering/conventions/domain-to-code-mapping.md`
11. `engineering/conventions/backend.md` and/or `engineering/conventions/frontend.md`

For a specific issue, start at `engineering/specs/{context}/{repo}-{issue}-{slug}.md` and read its **Governing docs** section.

## Platform capabilities

- B2C instant booking and payment
- Corporate quotation and invoicing workflows
- Provider onboarding and verification
- Inventory, pricing, and availability management
- Booking lifecycle management
- Payments, payouts, and refunds
- Reviews and ratings
- Multilingual (EN/JA) operations
