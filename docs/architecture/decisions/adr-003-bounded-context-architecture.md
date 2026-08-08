---
title: "ADR-003: Bounded Context Architecture"
sidebar_label: ADR-003
sidebar_position: 3
description: Architecture decision record 003.
---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## TL;DR

- Partition the domain into **6 core + 2 supporting** bounded contexts with exactly one owner per concept.
- Geography and Search are modules inside Catalog, not separate contexts; B2B is split from Booking for independent evolution.

## About this document

ADR for bounded context architecture.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| Domain | [Domain Models](/docs/domain/domain-models) |

---

## Status

Accepted

## Context

Per [ADR-001-modular-monolith.md](./adr-001-modular-monolith), Red Cab is one deployable over one database. That decision answers *how the system is packaged and run*; it does not by itself answer *how domain responsibility is divided inside that single process*. A modular monolith without internal boundaries degrades into an implicitly shared domain model with ambiguous ownership — it keeps the operational simplicity of one deployable while losing the design clarity that makes a small team able to reason about change. This ADR records the second decision: the system is partitioned into logical ownership boundaries, and explains the architectural forces that drove that partitioning.

The domain spans several business capabilities that **evolve on independent axes**. Provider verification grows with regulatory and trust requirements; the B2B quotation path grows toward PO numbers, credit terms, and consolidated invoicing; payments converge to an external rail's asynchronous settlement truth; reviews and ratings move at their own cadence. Capabilities that change for different reasons, driven by different actors, must not be bound into a single model where one change forces another.

Different capabilities also **enforce different invariants**, and an invariant can only be reliably upheld by the single component that owns the state behind it. Several high-value invariants make ownership non-negotiable:

- **`INV-1` snapshot integrity.** A Booking's Price, Commission, and Cancellation Policy snapshots are immutable for the life of the Booking. The fact is authored at checkout and must live with the order aggregate that creates it; nothing downstream may edit it.
- **`INV-3` inventory integrity.** `available_seats` is never negative and never exceeds capacity, even under concurrent contention for the last seat. The seat counter must have exactly one owner that guards every decrement.
- **`INV-5` review eligibility.** A review may exist only for a genuinely completed Booking. Eligibility is gated by a fact owned upstream and consumed, not reconstructed, downstream.
- **`INV-6` provider verification gating.** Only a verified, approved Provider may operate. Whether a Provider is allowed to operate is a single authoritative status, owned in one place and read as an upstream fact elsewhere.

These invariants share a structural requirement: **a single source of truth per concept**. Price is computed in exactly one place (`PRC-1`); provider right-to-operate is decided in one place; the revenue split is frozen in one place. When a concept has one owner, **business logic cannot be duplicated** across modules and then drift, and **ownership ambiguity** — the question "who is allowed to change this?" having more than one answer — cannot arise.

Finally, the partitioning exists to support **modular-monolith discipline**. Because there is no network boundary between modules to mechanically enforce separation, boundaries must be expressed as explicit ownership and published contracts. The same partitioning bounds the coupling risks already catalogued in [../bounded-contexts.md](/docs/architecture/bounded-contexts) (`CR-1` through `CR-7`): the single deliberate shared-transaction seam (`CR-1`), pricing-authority leakage (`CR-2`), the payout/refund race (`CR-3`), cross-context cascades that must be events not direct writes (`CR-4`), notification fan-out (`CR-5`), Identity as universal upstream (`CR-6`), and the provisional B2B pre-payment lifecycle (`CR-7`). Each risk is a coupling that the boundary either forbids outright or confines to one documented place.

## Decision

The system is partitioned into the already-established **6 core + 2 supporting bounded contexts**, each a logical ownership boundary inside the single deployable:

**Core (6):**

- **Provider Onboarding & Verification** — a Provider's path to Approved/Active and right-to-operate (`INV-6`).
- **Catalog & Inventory** — listings, geography, the single pricing authority, and seat inventory (`PRC-1`, `INV-3`).
- **Booking & Checkout** — the order aggregate and the immutable money facts it freezes (`INV-1`).
- **Payments & Payouts** — money movement and the Commission Rate setting, converging to the external rail.
- **B2B Quotation & Invoicing** — corporate intake, formal documents, and conversion of an accepted quotation into a Booking.
- **Reviews & Ratings** — verified-booking reviews and the listing Rating Score (`INV-5`).

**Supporting (2):**

- **Identity & Access** — authentication, accounts, roles, language; a generic subdomain that is the dependency root.
- **Notifications** — an event-driven outbound adapter that renders and dispatches messages.

The partitioning is governed by these rules, all already established:

- **Each context owns its concepts** — its ubiquitous language, invariants, aggregates, commands, queries, and events. The owner is the only component that may change the state behind those concepts.
- **Contexts integrate through published contracts** — commands, queries, and domain events, plus value contracts such as `PriceBreakdown`, the `AvailabilitySnapshot`, the Provider Status read, the Commission Snapshot, and the completion fact.
- **Contexts refer to one another by identity only** — a context holds another context's identifiers and asks across the published surface; it does not embed or replicate the other's internal model.
- **Cross-context table access is forbidden** — no context reads or writes another context's tables. The single deliberate exception is the guarded co-transactional seat-reservation seam (`CR-1`), which is a guarded *command*, not raw table access, and is documented as the only shared-transaction point in the system.
- **Ownership is singular and explicit** — every concept has exactly one owning context; there is no shared-write concept and no concept owned by committee.

This decision records *why responsibility is divided this way*; it changes nothing about the contexts, their ownership, their aggregates, or their integration styles, all of which remain as locked in [../bounded-contexts.md](/docs/architecture/bounded-contexts).

## Consequences

### Positive

- **Clear ownership.** Every concept and invariant has exactly one home, so "who may change this?" always has a single answer, and high-value invariants (`INV-1`, `INV-3`, `INV-5`, `INV-6`) are each guarded by their owner.
- **Reduced coupling.** Integration through published contracts and identity-only references confines cross-context dependencies to explicit surfaces, bounding the catalogued coupling risks (`CR-1`–`CR-7`) rather than letting them spread as hidden links.
- **Independent evolution within the monolith.** Capabilities on different change axes — B2B quotation, payments, reviews, verification — evolve behind stable contracts without forcing changes on one another, even though they ship in one deployable.
- **Protection of business invariants.** Because price is computed in one place (`PRC-1`), the revenue split is frozen in one place (`INV-1`), and right-to-operate is decided in one place (`INV-6`), business logic cannot be duplicated and drift across modules.
- **Easier reasoning about change.** A change is scoped to one context plus the contracts it publishes; reviewers can reason about a boundary at a time instead of the whole system.

### Negative

- **Additional design discipline required.** Boundaries are not enforced by a network; they exist only as long as the team upholds ownership and contracts in design and review.
- **Boundaries must be actively maintained.** Without ongoing vigilance, a convenient direct read of another context's data can erode a boundary; the single shared-transaction seam (`CR-1`) in particular must never silently become anything else.
- **Cross-context workflows require contract design.** A workflow spanning contexts must be expressed as commands, queries, and events with deliberately designed value contracts and anti-corruption boundaries — more upfront design than calling into a shared model.
- **Developers cannot shortcut ownership rules.** Reaching across a boundary for expedience is forbidden even when it would be faster; work flows through the owning context's published surface.

## Alternatives Considered

### Layer-based architecture

A horizontal split into technical layers (controllers, services, repositories) with no business-ownership boundaries.

Rejected because layers organize *mechanism*, not *responsibility*. Any service could touch any model, so no concept would have a single owner — directly defeating singular ownership and inviting duplicated business logic and pricing/snapshot drift. The high-value invariants (`INV-1`, `INV-3`, `INV-5`, `INV-6`) have no natural guardian in a layered scheme, and the coupling risks (`CR-1`–`CR-7`) become diffuse rather than confined to documented seams.

### Shared-domain model

A single shared model of the core concepts that multiple modules read and modify in common.

Rejected because shared write-access to a concept is exactly the ownership ambiguity this architecture exists to prevent. Multiple modifiers of price, snapshots, or seat inventory would make `PRC-1`, `INV-1`, and `INV-3` unenforceable, and capabilities on independent evolution axes would be welded together so one change forces another — the B2B/Booking and Payments/Booking seams that are deliberately kept thin would collapse into one entangled model.

### Service-per-capability decomposition

A microservice-first partitioning that splits each capability into its own independently deployed service.

Rejected because it conflicts with [ADR-001-modular-monolith.md](./adr-001-modular-monolith): the atomic checkout unit and its guarded seat-reservation seam (`CON-1`, `CR-1`) would become a distributed transaction across a network, threatening `INV-3`, and it would impose distributed-systems operational and coordination cost disproportionate to the team size and MVP scope. The same ownership benefits are achieved in-process by logical bounded contexts; a context graduates to its own service only against a documented fitness function, never speculatively.

## Related Documents

- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative 6 core + 2 supporting structure, ownership boundaries, integration contracts, domain events, and the `CR-1`–`CR-7` coupling-risk register.
- [ADR-001-modular-monolith.md](./adr-001-modular-monolith) — the single-deployable, single-database decision this partitioning lives inside.
- [overview.md](/docs/architecture/overview) — top-level architecture and principles.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, snapshot philosophy, and consistency rules.
- [api-design.md](/docs/architecture/api-design) — how the published surfaces are exposed at the platform edge.
