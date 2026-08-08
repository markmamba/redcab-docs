---
title: "ADR-002: Technology Stack Selection"
sidebar_label: ADR-002
sidebar_position: 2
description: Architecture decision record 002.
---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## TL;DR

- **Rails API** modular monolith, **React Router v7** SSR (JavaScript), **PostgreSQL**, **Stripe Connect**, email-first notifications.
- Technology serves the domain model; stack does not define architecture boundaries.

## About this document

ADR for locked technology stack selection.

| Topic | Document |
| --- | --- |
| Tech stack detail | [Technology Stack](/docs/architecture/tech-stack) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Engineering | [Engineering](/docs/engineering) |

---

## Status

Accepted

## Context

Red Cab is a two-sided marketplace earning a commission per booking, with two demand channels (instant B2C card checkout and negotiated B2B furikomi invoicing) and an external financial rail whose settlement truth is authoritative and asynchronous. The technology stack is selected to serve the architecture already established, under these forces:

- **Need for rapid MVP delivery.** A small operator must ship a verified marketplace quickly; the stack favors a high-productivity, batteries-included path over assembling many independent parts.
- **Modular monolith architecture.** Per [ADR-001-modular-monolith.md](./adr-001-modular-monolith), the system is one deployable over one database, partitioned into the locked 6 core + 2 supporting bounded contexts that integrate in-process. The stack must host all contexts as logical modules with guarded surfaces, not as distributed services.
- **Strong transactional consistency.** The most load-bearing requirement is the atomic checkout unit — snapshot freeze + seat reservation + booking creation commit together or not at all (`CON-1`) — including the one deliberate cross-context shared transaction, Booking↔Catalog seat reservation (`CR-1`). The stack must make this possible without a distributed protocol, while upholding inventory invariants (`INV-3`) and immutable Booking snapshots (`INV-1`).
- **Small engineering team.** Coordination cost must stay low; one runtime and one data store minimize operational and cognitive overhead.
- **Japanese market requirements.** Formal B2B documents (Omitsumorisho/Seikyusho) must itemize the 10% consumption tax (`PAY-10`) and render correctly as Japanese commercial documents; whole-yen JPY is the only money (`PAY-1`).
- **Stripe Connect integration.** The B2C path runs on an external card-and-payout rail whose settlement outcomes arrive asynchronously and are authoritative; internal state must converge to them.
- **EN/JA support.** The audience is EN-primary inbound travelers and JA-primary corporate/provider operations; language is a cross-cutting concern (`OPR-9`), not a single-screen feature.

## Decision

The stack is recorded as already locked in [../tech-stack.md](/docs/architecture/tech-stack):

- **Ruby on Rails (API mode) backend** — a single deployable hosting the 6 core + 2 supporting contexts as in-process logical modules; synchronous commands/queries where an invariant must hold within the operation, asynchronous domain events for cross-context reactions.
- **React Router v7 (SSR) frontend** — one web application presenting three role-confined surfaces (Tourist App, Client Portal, Admin Panel) over an authenticated session; it holds no financial truth and never computes price, consuming the `PriceBreakdown` from the single pricing authority (`PRC-1`). JavaScript, not TypeScript.
- **PostgreSQL database** — a single shared database; each context owns its tables and exposes them only through commands, queries, and events. It is the system of record for immutable Booking snapshots and auditable money facts, and the enabling constraint behind the atomic seat-reservation transaction (`CR-1`, `CON-1`).
- **Stripe Connect payment rail** — the external card-payment and marketplace-payout rail for the B2C path; Payments converges to Stripe's webhook settlement truth. B2B funds arrive off-Stripe by bank transfer and are reconciled by Admin (`PAY-9`).
- **Rails-native background jobs** — an asynchronous, idempotent, retriable job runtime executing after-the-fact reactions (notification dispatch, payout queuing, rating recalculation, listing pause/restore cascades) and scheduled alerts.
- **Email-first notifications** — an external email rail as the MVP notification channel, driven by the Notifications context, dispatched asynchronously and rendered in the recipient's language; SMS is optional and out of MVP baseline.
- **Server-side PDF generation** — formal B2B documents generated server-side with embedded Japanese fonts so kanji/kana render correctly, owned by the B2B context.

The architecture intentionally locks categories of capability (background jobs, notifications, PDF generation) while leaving concrete vendors and implementations open under the relevant AMB decisions.

## Consequences

### Positive

- **Faster development.** A cohesive, convention-driven backend with one frontend language and one data store lets a small team deliver and iterate the MVP without inter-service coordination.
- **Strong consistency.** A single Rails process over a single PostgreSQL database makes the atomic checkout unit and the one shared-transaction seam possible in-database (`CON-1`, `CR-1`), and upholds inventory and snapshot invariants directly (`INV-3`, `INV-1`).
- **Simplified operations.** One deployable, one database, and a Rails-native job runtime keep the operational surface small and matched to the team size.
- **Good architecture alignment.** The chosen technologies directly realize the architectural principles already established: Rails and PostgreSQL support the modular-monolith and atomic-checkout requirements,
React Router supports the role-confined web surface,
and Stripe Connect realizes the marketplace payment and payout rail.
Implementation conventions are documented in [../../engineering/README.md](/docs/engineering).

### Negative

- **Less independent scaling.** A single deployable scales as a unit; contexts cannot scale or deploy independently. A context graduates to its own service only against a documented fitness function, never speculatively.
- **Technology lock-in.** Committing to this stack couples the system to its runtime, language, and data-store characteristics; capabilities are realized through them.
- **Future migrations require planning.** Replacing any locked layer later (e.g. extracting a context, adopting a dedicated search engine, or changing a rail) is a deliberate, reviewed effort rather than an incidental swap.

## Alternatives Considered

### Node.js Ecosystem

Rejected because:

- While technically capable of implementing the architecture, it would not provide a materially better fit for the transactional, convention-driven modular-monolith approach selected for MVP delivery. Given team-size and delivery constraints, the Rails ecosystem offered a more cohesive path without changing any architectural outcome.

### Microservice-Oriented Stack

Rejected because:

- It conflicts with [ADR-001-modular-monolith.md](./adr-001-modular-monolith): a service-per-context topology would turn the in-database atomic checkout seam (`CON-1`, `CR-1`) into a distributed transaction, against the deliberate single-deployable decision.

### Polyglot Architecture

Rejected because:

- Multiple languages and runtimes increase operational complexity disproportionate to the team size and MVP scope, without serving any established requirement; a single backend language and one frontend language keep coordination and operations minimal.

## Related Documents

- [ADR-001-modular-monolith.md](./adr-001-modular-monolith) — the modular-monolith decision this stack realizes.
- [overview.md](/docs/architecture/overview) — container view and architecture principles.
- [tech-stack.md](/docs/architecture/tech-stack) — the authoritative record of the locked technology choices.
