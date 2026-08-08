---
title: "ADR-001: Modular Monolith Architecture"
sidebar_label: ADR-001
sidebar_position: 1
description: Architecture decision record 001.
---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Build Red Cab as a **modular monolith**: single Rails API deployable, single PostgreSQL database, 6 core + 2 supporting contexts.
- Contexts integrate in-process (sync commands/queries, async events); module boundaries enforce discipline, not distribution.
- Enables atomic checkout and the one shared-transaction seam (Booking ↔ Catalog seat reserve).

## About this document

ADR recording the modular monolith decision — no new decision introduced here.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Coupling risks (`CR-#`) | [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks) |
| Domain | [Domain Models](/docs/domain/domain-models) |
| Open questions | [Open Questions](/docs/ambiguities/open-questions) |

---

## Status

Accepted

## Context

Red Cab is a two-sided marketplace connecting inbound Tourists and Corporate Clients with verified Japanese transport and tour Providers, earning a commission per booking. The domain is non-trivial: eight cooperating areas of responsibility (provider verification, catalog and inventory, booking and checkout, payments and payouts, Corporate quotation and invoicing, reviews, identity, notifications), two distinct demand channels (instant B2C card checkout and negotiated Corporate furikomi invoicing), and an external financial rail whose settlement truth is authoritative and asynchronous.

The architecture is shaped less by feature count than by a small set of **strong transactional requirements** that must hold together at the moment a purchase is made:

- **Atomic checkout.** Booking creation, snapshot freezing, and seat reservation must commit as one indivisible unit or not at all (`CON-1`). The guarded seat decrement on Catalog's `available_seats` runs co-transactionally inside Booking's checkout — the single deliberate shared-transaction seam in the system (`CR-1`). Overbooking must be impossible even under concurrent contention for the last seat, with `available_seats` never negative and never exceeding capacity (`INV-3`).
- **Pricing authority.** Display, search filtering, and checkout must all show the same price for the same inputs; divergence is a defect. Price is computed in exactly one place and consumed everywhere else as a value contract, closing the pricing-leakage risk (`CR-2`).
- **Snapshot integrity.** Once a Booking is created, its Price, Commission, and Cancellation Policy snapshots are immutable for the life of that Booking, regardless of later upstream changes (`INV-1`). Corrections are new facts, never edits.

These forces operate under real delivery constraints: a **small expected team** running a verified marketplace, and a **need for rapid delivery** of the MVP. A single deployable over a single database minimizes coordination, deployment, and consistency overhead at the current scale, and makes the one co-transactional seam (`CR-1`) possible without a distributed protocol.

Relevant established constraints and invariants:

- `CR-1` — Booking↔Catalog seat-reservation shared transaction (the one place two contexts share a transaction; permitted only because they share one database).
- `CR-2` — Pricing authority leakage (only `Catalog.calculate_quote(...)` computes price).
- `INV-1` — Booking Price/Commission snapshots immutable for the life of the Booking.
- `INV-3` — `available_seats` never negative, never exceeds capacity.
- `CON-1` — seat reservation and Booking creation are a single atomic operation.

## Decision

The system is built as a **modular monolith**:

- **Single Rails API deployable** that owns all domain logic and is the outer contract of the platform.
- **Single PostgreSQL database**, shared by all contexts; each context owns its own tables and exposes them only through commands, queries, and events — never direct cross-context table access.
- **6 core + 2 supporting bounded contexts** as logical ownership boundaries: core — Provider Onboarding & Verification, Catalog & Inventory, Booking & Checkout, Payments & Payouts, Corporate Quotation & Invoicing, Reviews & Ratings; supporting — Identity & Access, Notifications.
- **In-process integration** between contexts, with no network boundary between them; discipline is enforced by module boundaries and contracts, not by distribution.
- **Commands and queries are synchronous** (the caller awaits the result), used where an invariant must hold within the operation — the atomic checkout unit, `calculate_quote(...)`, the guarded seat reserve, COR→Booking conversion, Payments reading the Commission Snapshot, and IAM principal resolution.
- **Domain events are asynchronous** (in-process, past-tense, idempotent), used for cross-context reactions and notifications — payout queuing, rating recalculation, listing pause/restore cascades, and all Notifications fan-out.

Governing rule of thumb: state-changing invariants that must hold together are synchronous and co-transactional; cross-context reactions and notifications are asynchronous.

## Consequences

### Positive

- **Atomic transactions.** The critical checkout unit — snapshot freeze + seat reservation + booking creation — commits atomically because all contexts share one database (`CON-1`, `CR-1`); overbooking is prevented by a local consistency rule rather than a distributed agreement (`INV-3`).
- **Simpler deployment.** One deployable and one database mean no inter-service orchestration, versioned network contracts between contexts, or distributed-systems operational surface at MVP scale.
- **Faster development.** A small team delivers and evolves features without the coordination cost of multiple services; internal contracts evolve additively within a single release.
- **Easier consistency.** Strong consistency is the default for in-process synchronous operations, and snapshot integrity (`INV-1`) is upheld within the owning aggregate without cross-service reconciliation for the facts that must not change.

### Negative

- **Reduced independent scalability.** Contexts cannot be scaled or deployed independently; the deployable scales as a unit. A context (e.g. Search) graduates to its own service only against a documented fitness function, never speculatively.
- **Requires strong module discipline.** With no network boundary to enforce separation, boundaries must be upheld by contract and review: contexts expose commands, queries, and events only — never their tables — and the single shared-transaction seam (`CR-1`) must never silently become a network call without a redesign (a saga).

## Alternatives Considered

### Microservices

Rejected because:

- **Distributed transactions.** The atomic checkout unit (`CON-1`, `CR-1`) would require a saga or two-phase commit across service boundaries, trading a simple in-database transaction for a complex, failure-prone distributed protocol — directly threatening the never-overbook invariant (`INV-3`).
- **Higher complexity.** Network contracts, service discovery, distributed tracing, and independent data stores impose operational and cognitive overhead disproportionate to the current scale and team size.
- **Slower delivery.** Cross-service coordination on every change that spans contexts would slow the MVP and ongoing iteration.

### Service-Oriented Architecture

Rejected because:

- **Premature decomposition.** Splitting along service boundaries now would commit to seams before the domain and load patterns justify them, when logical module boundaries already provide the needed separation in-process.
- **Additional operational burden.** Shared infrastructure, inter-service contracts, and independent deployment pipelines add operational cost without a corresponding benefit at the present scale.

## Related Documents

- [overview.md](/docs/architecture/overview) — top-level architecture; the Modular Monolith First principle.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative 6 core + 2 supporting structure, integration styles, and coupling-risk register.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, snapshot philosophy, and consistency/concurrency rules.
