---
sidebar_position: 1
title: Red Cab Documentation
description: Planning, architecture, and engineering documentation for the Red Cab tourism marketplace platform.
displayed_sidebar: docsSidebar
---

## Welcome

Red Cab is a two-sided marketplace connecting inbound travelers and corporate clients with verified transportation and tourism providers in Japan.

Documentation uses **Johnny Decimal** area numbers. See [About these docs](/docs/00-09-meta/about-these-docs) and [Conventions](/docs/00-09-meta/conventions).

| Area | Audience | What you'll find |
| --- | --- | --- |
| [**Business (70–79)**](/docs/70-79-business) | PMs, sponsors, analysts | Glossary, business rules, requirements, roadmap, explainers |
| [**Domains (30–49)**](/docs/30-49-domains) | Architects, tech leads | Bounded contexts, domain models, patterns, ADRs, data model |
| [**Backend / frontend (20–29, 50–59)**](/docs/20-29-backend/conventions/backend) | Engineers | API and web conventions, infrastructure |
| [**Initiatives (60–69)**](/docs/60-69-initiatives/implementation-specs) | Engineers, agents | Per-issue implementation specs |
| [**Engineering meta (90–99)**](/docs/90-99-engineering-meta) | Engineers | Authentication series and cross-cutting guides |

## Start here

| I am a… | Go to |
| --- | --- |
| Executive or sponsor | [Key decisions](/docs/70-79-business/explainers/key-decisions) → [Roadmap](/docs/70-79-business/planning/roadmap) → [Open questions](/docs/70-79-business/planning/open-questions) |
| Product owner or PM | [Start here](/docs/00-09-meta/start-here) |
| Business analyst or ops | [Booking lifecycle](/docs/70-79-business/explainers/booking-lifecycle) → [Money flow](/docs/70-79-business/explainers/money-flow) |
| Software architect | [Architecture overview](/docs/30-49-domains/system-design/overview) → [Bounded contexts](/docs/30-49-domains/bounded-contexts) → [ADRs](/docs/30-49-domains/architecture-decisions) |
| Backend or frontend engineer | [Engineering overview](/docs/90-99-engineering-meta) → [Specs](/docs/60-69-initiatives/implementation-specs) |
| AI agent / Cursor | [Agent read path](/docs/00-09-meta/start-here#by-role) below |

## Document precedence

When documents overlap, higher-precedence sources win:

1. Business Rules (`70-79-business/71-business-rules/`)
2. Requirements (`70-79-business/72-requirements/`)
3. Domain Models (`30-49-domains/32-domain-models/`)
4. Architecture + ADRs (`30-49-domains/`)
5. Engineering conventions (`20-29-backend/`, `50-59-frontend/`, `90-99-engineering-meta/`)
6. Implementation Specs (`60-69-initiatives/61-implementation-specs/`)
7. Code (`red-cab-api/`, `red-cab-web/`)

## AI agent read path

Read in this order before generating implementation artifacts:

1. `70-79-business/71-business-rules/glossary.md`
2. `70-79-business/71-business-rules/invariants.md`
3. `70-79-business/72-requirements/functional-requirements/{ctx}.md`
4. `30-49-domains/31-bounded-contexts/{context}.md`
5. `30-49-domains/32-domain-models/domain-models.md`
6. `30-49-domains/36-system-design/overview.md`
7. `30-49-domains/35-patterns/payments-architecture.md`
8. `30-49-domains/34-architecture-decisions/adr-001` → `adr-020`
9. `70-79-business/73-planning/roadmap/`
10. `20-29-backend/21-conventions/domain-to-code-mapping.md`
11. `20-29-backend/21-conventions/backend.md` and/or `50-59-frontend/51-conventions/frontend.md`

For a specific issue, start at `60-69-initiatives/61-implementation-specs/{context}/{repo}-{issue}-{slug}.md` and read its **Governing docs** section.

## Platform capabilities

- B2C instant booking and payment
- Corporate quotation and invoicing workflows
- Provider onboarding and verification
- Inventory, pricing, and availability management
- Booking lifecycle management
- Payments, payouts, and refunds
- Reviews and ratings
- Multilingual (EN/JA) operations
