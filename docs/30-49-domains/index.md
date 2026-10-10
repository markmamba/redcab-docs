---
title: Architecture
sidebar_position: 1
description: System structure, integration patterns, and architectural decisions for Red Cab Marketplace.
---

## TL;DR

- This area holds **domain structure**: bounded contexts, domain models, conceptual data model, patterns, system design, and ADRs.
- Start with [Overview](/docs/30-49-domains/system-design/overview), then [Bounded Contexts](/docs/30-49-domains/bounded-contexts).
- Business rules and requirements live under `70-79-business`; these pages record **architecture and ownership**, not observable product requirements.

## About this document

Hub for the `30-49-domains` Johnny Decimal area.

| Topic | Document |
| --- | --- |
| Glossary | [Glossary](/docs/70-79-business/business-rules/glossary) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Requirements | [Requirements](/docs/70-79-business/requirements) |

---

## Documents

| Document | Purpose |
| --- | --- |
| [Overview](/docs/30-49-domains/system-design/overview) | Top-level architectural guide |
| [Bounded Contexts](/docs/30-49-domains/bounded-contexts) | Strategic DDD context map |
| [Booking State Machine](/docs/30-49-domains/patterns/booking-state-machine) | Booking lifecycle and transitions |
| [Payments Architecture](/docs/30-49-domains/patterns/payments-architecture) | Custody, control, commission, settlement, refunds |
| [API Design](/docs/30-49-domains/system-design/api-design) | REST conventions and contracts |
| [Data Model](/docs/30-49-domains/data-model) | Storage model and relationships |
| [Tech Stack](/docs/30-49-domains/system-design/tech-stack) | Technology choices and rationale |
| [Decisions (ADRs)](/docs/30-49-domains/architecture-decisions) | Architecture decision records |

## Reading order

1. [Overview](/docs/30-49-domains/system-design/overview) — context, containers, principles
2. [Bounded Contexts](/docs/30-49-domains/bounded-contexts) — ownership boundaries
3. [Booking State Machine](/docs/30-49-domains/patterns/booking-state-machine) and [Payments Architecture](/docs/30-49-domains/patterns/payments-architecture)
4. [API Design](/docs/30-49-domains/system-design/api-design) and [Data Model](/docs/30-49-domains/data-model)
5. [Tech Stack](/docs/30-49-domains/system-design/tech-stack) and [ADRs](/docs/30-49-domains/architecture-decisions)
