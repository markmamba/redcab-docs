---
sidebar_position: 1
title: Red Cab Documentation
description: Planning, architecture, domain, and implementation guidance for the Red Cab tourism marketplace platform.
---

## TL;DR

- **Authoritative planning foundation** for Red Cab: B2C/B2B marketplace for verified Japanese transport and tour providers.
- Read in order: Business Rules → Requirements → Domain → Architecture → Engineering → Ambiguities → Roadmap.
- Precedence: Business Rules > Requirements > Domain > Architecture > ADRs > Engineering > Roadmap.

## About this document

Site home and documentation reading order for Red Cab Marketplace.

| Topic | Document |
| --- | --- |
| Glossary | [Glossary](/docs/business-rules/glossary) |
| Requirements | [Requirements](/docs/requirements) |
| Architecture | [Architecture](/docs/architecture) |
| Engineering | [Engineering](/docs/engineering) |
| Roadmap | [Phasing Roadmap](/docs/roadmap) |

---

## Overview

Red Cab is a two-sided marketplace connecting inbound travelers and corporate clients with verified transportation and tourism providers in Japan.

The platform supports:

* B2C instant booking and payment
* B2B quotation and invoicing workflows
* Provider onboarding and verification
* Inventory, pricing, and availability management
* Booking lifecycle management
* Payments, payouts, and refunds
* Reviews and ratings
* Multilingual (EN/JA) operations

This documentation set serves as the authoritative planning foundation for implementation using:

* Ruby on Rails API (modular monolith, Request → Manager → Validator)
* React Router v7 SSR frontend (JavaScript, `app/routes/` / `app/api/` / `app/domains/`)
* PostgreSQL
* Stripe Connect

---

## Documentation Reading Order

## 1. Business Language

Start here to understand the domain vocabulary.

| Document                                           | Purpose                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| [Glossary](/docs/business-rules/glossary)             | Ubiquitous language and shared terminology                                |
| [Business Rules](/docs/business-rules/invariants) | Invariants, lifecycle rules, pricing, commission, and booking constraints |

---

## 2. Requirements

Defines observable system behavior.

| Document                                                                   | Purpose                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Requirements Overview](/docs/requirements)                            | Requirements conventions and structure                          |
| [Functional Requirements](/docs/requirements/functional-requirements)         | System capabilities and user-facing behavior                    |
| [Non-Functional Requirements](/docs/requirements/non-functional-requirements) | Performance, security, availability, auditability, compliance   |
| [Traceability Matrix](/docs/requirements/traceability-matrix)                 | Mapping between PRD stories, requirements, and bounded contexts |

---

## 3. Domain Design

Defines ownership and domain boundaries.

| Document                                             | Purpose                                         |
| ---------------------------------------------------- | ----------------------------------------------- |
| [Bounded Contexts](/docs/architecture/bounded-contexts) | Strategic DDD context map                       |
| [Domain Models](/docs/domain/domain-models)             | Aggregates, entities, value objects, invariants |

---

## 4. Architecture

Defines system structure and integration patterns.

| Document                                                       | Purpose                                          |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [Architecture Overview](/docs/architecture/overview)              | Top-level architectural guide                    |
| [Payments Architecture](/docs/architecture/payments-architecture) | Commission, payouts, refunds, Stripe integration |
| [Booking State Machine](/docs/architecture/booking-state-machine) | Booking lifecycle and transitions                |
| [API Design](/docs/architecture/api-design)                       | REST conventions and contracts                   |
| [Data Model](/docs/architecture/data-model)                       | Storage model and key relationships              |
| [Tech Stack](/docs/architecture/tech-stack)                       | Technology choices and rationale                 |

---

## 5. Engineering Conventions

Maps domain architecture to codebase structure for `red-cab-api` and `red-cab-web`.

| Document                                                       | Purpose                                          |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [Engineering Overview](/docs/engineering)                  | How planning docs connect to implementation      |
| [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) | Actors, contexts → folders, routes, DBML        |
| [Backend Conventions](/docs/engineering/backend-conventions)      | Rails API patterns (Request/Manager/Validator) |
| [Frontend Conventions](/docs/engineering/frontend-conventions)    | React Router, API clients, forms, surfaces       |

---

## 6. Architecture Decision Records (ADRs)

Permanent record of the architectural decisions that define and preserve the system architecture. These ADRs are intended to be read in sequence, as each decision builds upon the previous ones.

| ADR                                                                                  | Title                                   | Purpose                                                                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [ADR-001](/docs/architecture/decisions/adr-001-modular-monolith)                        | Modular Monolith                        | Establishes the system packaging strategy and modular monolith first philosophy.                                    |
| [ADR-002](/docs/architecture/decisions/adr-002-technology-stack)                        | Technology Stack                        | Records the selected technology stack and the principle that technology serves the domain model.                    |
| [ADR-003](/docs/architecture/decisions/adr-003-bounded-context-architecture)            | Bounded Context Architecture            | Defines the strategic DDD context map and ownership boundaries.                                                     |
| [ADR-004](/docs/architecture/decisions/adr-004-context-integration-model)               | Context Integration Model               | Defines how bounded contexts collaborate through published contracts.                                               |
| [ADR-005](/docs/architecture/decisions/adr-005-single-pricing-authority)                | Single Pricing Authority                | Establishes Catalog as the sole authority for price calculation.                                                    |
| [ADR-006](/docs/architecture/decisions/adr-006-immutable-snapshot-strategy)             | Immutable Snapshot Strategy             | Explains why commercial facts are frozen on Bookings as immutable snapshots.                                        |
| [ADR-007](/docs/architecture/decisions/adr-007-transaction-and-consistency-boundaries)  | Transaction and Consistency Boundaries  | Defines transactional boundaries, consistency rules, and asynchronous collaboration.                                |
| [ADR-008](/docs/architecture/decisions/adr-008-domain-event-architecture)               | Domain Event Architecture               | Defines the event-driven collaboration model between bounded contexts.                                              |
| [ADR-009](/docs/architecture/decisions/adr-009-external-systems-integration)            | External Systems Integration            | Defines how external providers integrate without owning business decisions.                                         |
| [ADR-010](/docs/architecture/decisions/adr-010-identity-and-authorization-architecture) | Identity and Authorization Architecture | Separates authentication from business authorization responsibilities.                                              |
| [ADR-011](/docs/architecture/decisions/adr-011-financial-authority-model)               | Financial Authority Model               | Defines ownership of commercial facts versus financial operations.                                                  |
| [ADR-012](/docs/architecture/decisions/adr-012-evolution-strategy)                      | Evolution Strategy                      | Records how the architecture is intended to evolve while preserving established decisions and ownership boundaries. |

---

## 7. Open Questions

Known ambiguities and unresolved decisions.

| Document                                        | Purpose                                    |
| ----------------------------------------------- | ------------------------------------------ |
| [Open Questions](/docs/ambiguities/open-questions) | Assumptions register and pending decisions |

---

## 8. Delivery Roadmap

Implementation sequencing and milestones.

| Document                              | Purpose                         |
| ------------------------------------- | ------------------------------- |
| [Phasing Roadmap](/docs/roadmap) | MVP and future release planning |

---

## Recommended Reading Paths

## Product Owner

1. Functional Requirements
2. Non-Functional Requirements
3. Open Questions
4. Roadmap

## Software Architect

1. Glossary
2. Business Rules
3. Bounded Contexts
4. Domain Models
5. Architecture Overview
6. Architecture Decision Records (ADR-001 → ADR-012)

## Backend Engineer

1. Glossary
2. Business Rules
3. Functional Requirements
4. Domain Models
5. Payments Architecture
6. API Design
7. Data Model
8. [Backend Conventions](/docs/engineering/backend-conventions)
9. [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping)

## Frontend Engineer

1. Functional Requirements
2. Non-Functional Requirements
3. API Design
4. Booking State Machine
5. [Frontend Conventions](/docs/engineering/frontend-conventions)
6. [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping)

## AI Agent / Cursor

Read in this order:

1. business-rules/glossary.md
2. business-rules/business-rules.md
3. requirements/functional-requirements.md
4. architecture/bounded-contexts.md
5. domain/domain-models.md
6. architecture/overview.md
7. architecture/payments-architecture.md
8. architecture/decisions/ADR-001 → ADR-012
9. roadmap/phasing.md
10. engineering/domain-to-code-mapping.md
11. engineering/backend-conventions.md and/or engineering/frontend-conventions.md (by task)

Do not generate implementation artifacts until these documents have been read.
Architectural decisions recorded in the ADRs are considered authoritative and must not be contradicted.
Engineering conventions define **how** to code; they must not override domain invariants or context ownership.

---

## Authoritative Sources

When documents overlap, precedence is:

1. Business Rules
2. Requirements
3. Domain Models
4. Architecture
5. ADRs
6. Engineering Conventions
7. Roadmap

Higher-precedence documents override lower-precedence documents.

---

## Current Planning Status

| Area                  | Status     |
| --------------------- | ---------- |
| Glossary              | ✅ Complete |
| Business Rules        | ✅ Complete |
| Requirements          | ✅ Complete |
| Traceability          | ✅ Complete |
| Bounded Contexts      | ✅ Complete |
| Domain Models         | ✅ Complete |
| Architecture Overview | ✅ Complete |
| Payments Architecture | ✅ Complete |
| Booking State Machine | ✅ Complete |
| API Design            | ✅ Complete |
| Data Model            | ✅ Complete |
| Technology Stack      | ✅ Complete |
| ADR Series (001–012)  | ✅ Complete |
| Engineering Conventions | ✅ Complete |
| Ambiguity Register    | ✅ Complete |
| Roadmap               | ✅ Complete |

---

## Repository Goal

The objective of this repository is to establish a complete planning and architecture foundation before implementation begins, ensuring that domain invariants, financial correctness, and bounded-context ownership remain stable throughout development.

