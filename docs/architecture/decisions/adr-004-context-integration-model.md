---
title: "ADR-004: Context Integration Model"
sidebar_label: ADR-004
sidebar_position: 4
description: Architecture decision record 004.
---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Contexts collaborate only through **published commands, queries, and domain events** — never shared tables or direct internal access.
- Sync where invariants must hold together; async for reactions; value contracts cross boundaries.

## About this document

ADR for the context integration model.

| Topic | Document |
| --- | --- |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| API contracts | [API Design](/docs/architecture/api-design) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), Red Cab is partitioned into 6 core + 2 supporting bounded contexts, each a logical ownership boundary inside the single deployable established in [ADR-001-modular-monolith.md](./adr-001-modular-monolith). Those decisions answer *how responsibility is divided*; they do not by themselves answer *how the divided contexts collaborate*. A set of well-drawn boundaries is only as strong as the rules that govern what crosses them — without an explicit integration model, contexts in a single process inevitably reach for the path of least resistance (a direct call into another module, a convenient read of another module's data), and the boundaries erode into an implicitly shared model with ambiguous ownership. This ADR records the third decision: how contexts integrate, and explains the architectural forces that shaped that model.

The integration model exists inside a **modular monolith with logical boundaries**. Because there is no network boundary between contexts to mechanically enforce separation, the boundaries exist only as published contracts and ownership discipline. Contexts must **collaborate without losing ownership** — a context must be able to depend on another's capability without acquiring the right to change the other's state or replicate the other's model. The whole point of the partitioning (`PRC-1`, `INV-1`, `INV-3`, `INV-5`, `INV-6`) is defeated the moment collaboration becomes co-modification.

The dominant force is that some collaboration must be **strongly consistent and some must not**. A small set of state-changing operations enforce invariants that must hold *within the operation*:

- **`INV-3` inventory integrity.** `available_seats` is never negative and never exceeds capacity, even under concurrent contention for the last seat. The guarded seat reservation must take effect inside the same operation that creates the Booking, or overbooking becomes possible (`CON-1`, `CR-1`).
- **`INV-1` snapshot integrity.** A Booking's Price, Commission, and Cancellation Policy snapshots are frozen at checkout and immutable for the life of the Booking. The fact must be authored atomically with the order it belongs to; nothing downstream may edit it.
- **`INV-6` provider verification gating.** Only a verified, approved Provider may operate. Whether a Provider may operate is read as an authoritative upstream fact at the moment a gated capability is exercised, not reconstructed downstream.
- **`INV-5` review eligibility.** A review may exist only for a genuinely completed Booking. Eligibility is gated by an upstream completion fact consumed after the fact, not by reaching into the order aggregate.

These invariants do not all demand the same consistency. `INV-3` and `INV-1` must hold *synchronously and together* at checkout; `INV-5` is satisfied by an **asynchronous reaction** to a completion fact, and the verification cascades behind `INV-6`/`INV-7` (pause/restore listings) are likewise after-the-fact. This is why the architecture deliberately distinguishes **synchronous operations** — where an invariant must hold within the operation and the caller awaits the guarded outcome — from **asynchronous reactions** — where consistency is eventual, the reaction is not part of the triggering operation's result, and a failed reaction never rolls back the committed transition that emitted it. Treating these the same in either direction is the failure this model exists to prevent.

The model is also shaped by the goals of **minimizing coupling** and **preserving the independent evolution of contexts**. Capabilities change on different axes — corporate quotation grows toward PO numbers and consolidated invoicing, Payments converges to an external rail's asynchronous truth, Reviews moves at its own cadence — and they must evolve behind stable contracts without forcing changes on one another. That requires **explicit published contracts**, **identity-only references** between contexts, and a hard rule **preventing cross-context table access**: a context that holds another's identifiers and asks across a published surface stays decoupled, while a context that reaches into another's tables welds the two together and makes both impossible to change in isolation.

The same integration model bounds the coupling risks catalogued in [../bounded-contexts.md](/docs/architecture/bounded-contexts) (`CR-1` through `CR-7`): the single deliberate shared-transaction seam (`CR-1`), pricing-authority leakage (`CR-2`), the payout/refund race across the async gap (`CR-3`), cross-context cascades that must be events and not direct writes (`CR-4`), notification fan-out (`CR-5`), Identity as the universal upstream whose contract must stay minimal and stable (`CR-6`), and the provisional corporate pre-payment lifecycle (`CR-7`). Each is a coupling that the integration model either forbids outright, confines to one documented seam, or pushes onto the asynchronous spine.

## Decision

Contexts integrate **only through published contracts** — never through shared mutable state and never by reaching across a boundary. The published surface of a context is exactly three things, all already established:

- **Commands** — guarded requests for a state change the owning context validates against its invariants and lifecycle before applying.
- **Queries** — side-effect-free reads of owned state or computed value contracts.
- **Domain events** — past-tense, in-process, idempotent facts a context publishes about what has already happened.

These contracts are realized through three already-established interaction styles:

**1. Synchronous Commands.** State-changing operations where an invariant must hold within the operation: lifecycle transitions and invariant enforcement governed by the owning context, the atomic checkout unit (snapshot freeze + seat reservation + booking creation as one indivisible unit, `CON-1`, `INV-1`, `INV-3`), and the guarded seat-reservation command Booking invokes co-transactionally on Catalog's counter — the one deliberate shared transaction in the system (`CR-1`). The caller awaits the guarded outcome; the synchronous response carries only that outcome, not the asynchronous reactions it may trigger.

**2. Synchronous Queries.** Read-only contracts that return owned state or a computed value contract: the pricing authority `calculate_quote(...) → PriceBreakdown` (`PRC-1`), availability reads, and the Provider Status read — value contracts a consumer requests and uses but never recomputes or replicates.

**3. Asynchronous Domain Events.** Past-tense, in-process events carrying identities and immutable facts, consumed idempotently for cross-context reactions where consistency is not immediate: notification fan-out, payout queuing, rating recalculation, and the license/district cascades. Consistency is eventual; consumers must be idempotent so redelivery or reordering cannot double-act, and a failed reaction never rolls back the committed transition that emitted it.

Across all three styles, the same ownership rules hold:

- **Contexts reference identities only** — a context holds another context's identifiers and asks across the published surface; it does not embed or replicate the other's internal model.
- **Contexts never access another context's tables** — no context reads or writes another's tables. The single deliberate exception is the guarded co-transactional seat reservation (`CR-1`), which is a guarded *command*, not raw table access.
- **Contracts are explicit** — the value contracts crossing boundaries (`PriceBreakdown`, the `AvailabilitySnapshot`, the Provider Status read, the Commission Snapshot, the completion fact, recipient language) are named, published surfaces, not incidental shapes.
- **Ownership never crosses boundaries** — every concept has exactly one owning context; cross-context effects are expressed through contracts, never through shared write-access.

The relationships between contexts follow the already-established DDD strategic patterns, recorded here without introducing any new ones:

- **Customer/Supplier** — Catalog → Booking (pricing and availability) and Booking → Payments (the Commission Snapshot), where an upstream supplier publishes a contract a downstream customer consumes.
- **Conformist** — Catalog conforms to Provider Verification's Provider Status read, treating it as an upstream fact rather than replicating verification logic.
- **Anti-Corruption Layer (ACL)** — Corporate → Booking, where Corporate translates its quotation vocabulary into Booking's command language at the call boundary so evolving corporate concepts never leak into Booking.
- **Published Events** — Booking → Reviews (completion enables review) and every core context → Notifications, the asynchronous spine of cross-context reactions.

This decision records *why contexts integrate the way they already do*; it changes nothing about the contexts, their contracts, their relationships, their events, or their interaction styles, all of which remain as locked in [../bounded-contexts.md](/docs/architecture/bounded-contexts) and [../api-design.md](/docs/architecture/api-design).

## Consequences

### Positive

- **Strong ownership.** Every capability is exposed by exactly one owning context and every concept has exactly one home, so "who may change this?" always has a single answer and the high-value invariants (`INV-1`, `INV-3`, `INV-5`, `INV-6`) are each guarded by their owner.
- **Low coupling.** Integration through published contracts and identity-only references confines cross-context dependencies to explicit surfaces, bounding the catalogued coupling risks (`CR-1`–`CR-7`) rather than letting them spread as hidden links.
- **Explicit dependencies.** Every cross-context dependency is a named command, query, event, or value contract; there are no implicit links through shared tables, so a context's true dependencies are visible and reviewable.
- **Protected invariants.** Synchronous, co-transactional operations uphold the invariants that must hold together (`CON-1`, `INV-1`, `INV-3`) while asynchronous events carry the reactions that may be eventual (`INV-5`, the verification cascades) — each invariant is protected by the consistency model it actually requires.
- **Easier testing.** A context can be exercised against its published contracts and the contracts it consumes, without standing up another context's internals, because collaboration never depends on shared state.
- **Easier evolution.** Capabilities on different change axes evolve behind stable, additively-evolving contracts without forcing changes on their consumers (`CR-6`), even though they ship in one deployable.
- **Predictable collaboration.** A single rule of thumb governs every seam — invariants that must hold together are synchronous and co-transactional; cross-context reactions are asynchronous — so how any two contexts cooperate is predictable rather than ad hoc.

### Negative

- **Additional design effort.** A cross-context workflow must be expressed as commands, queries, and events with deliberately designed value contracts and anti-corruption boundaries — more upfront design than calling into a shared model.
- **Contract maintenance.** Published contracts are commitments that must be evolved additively and kept stable for their consumers; this is ongoing work that a shared model would not require.
- **Event choreography complexity.** Behavior that spans contexts is choreographed across asynchronous events rather than expressed in one synchronous flow, which is harder to follow end to end and demands idempotent consumers and attention to ordering (`CR-3`, `CR-5`).
- **Developers must respect boundaries.** With no network boundary to enforce separation, the model holds only as long as the team upholds it; reaching across a boundary for expedience is forbidden even when it would be faster, and the single shared-transaction seam (`CR-1`) must never silently become anything else.
- **Eventual consistency requires careful thinking.** Asynchronous reactions are only eventually consistent and are not part of the triggering operation's result; designers must reason about delay, reordering, redelivery, and the fact that a failed reaction never rolls back the transition that emitted it (`FIN-11`).

## Alternatives Considered

### Direct module-to-module access

Letting one context call into another's internals or read its data directly because they share a process.

Rejected because it destroys the ownership the partitioning exists to create: a directly-reachable internal is a concept with more than one modifier, which makes `PRC-1`, `INV-1`, and `INV-3` unenforceable and welds contexts on independent evolution axes together. It is precisely the boundary erosion `CR-2` and `CR-4` warn against — collaboration would become co-modification, and the published-contract discipline would exist in name only.

### Shared database access between contexts

Allowing contexts to read and write one another's tables through the single shared database.

Rejected because sharing one database is an *enabling constraint for the one guarded seat-reservation transaction* (`CR-1`), not a license for shared table access. Cross-context table access would make ownership ambiguous, let business logic duplicate and drift across modules, and turn every schema change into a cross-context coupling. The model permits exactly one shared-transaction seam — a guarded *command*, not raw table access — and forbids all other cross-context table reach.

### Fully synchronous integration everywhere

Making every cross-context interaction a synchronous, awaited call, including reactions like notifications, payout queuing, and rating recalculation.

Rejected because it binds request latency to downstream and external work and re-couples contexts that the architecture deliberately keeps on the asynchronous spine (`CR-5`). It would make a committed transition depend on the success of an after-the-fact reaction — contradicting the established rule that a failed reaction never rolls back the transition that emitted it (`FIN-11`) — and would collapse the deliberate distinction between operations that must be consistent *now* and reactions that may be eventual.

### Fully asynchronous integration everywhere

Making every cross-context interaction an asynchronous event, including the checkout seat reservation and the snapshot freeze.

Rejected because it cannot uphold the invariants that must hold *within* an operation. The atomic checkout unit (`CON-1`, `INV-1`, `INV-3`) requires snapshot freeze and the guarded seat decrement to commit together; modeling that as eventual events would reintroduce the overbooking and split-invariant risks the synchronous, co-transactional seam exists to prevent — conflicting directly with [ADR-001-modular-monolith.md](./adr-001-modular-monolith) and turning the one deliberate shared transaction (`CR-1`) into a distributed choreography.

## Related Documents

- [ADR-001-modular-monolith.md](./adr-001-modular-monolith) — the single-deployable, single-database decision that makes in-process integration and the one shared-transaction seam possible.
- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the bounded-context partitioning whose collaboration rules this integration model records.
- [overview.md](/docs/architecture/overview) — top-level architecture, the cross-context integration summary, and the integration principles.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, integration contracts, relationship patterns, the domain-events catalog, and the `CR-1`–`CR-7` coupling-risk register.
- [api-design.md](/docs/architecture/api-design) — how the published surfaces and cross-context boundaries are expressed as contracts.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, identity-only references, snapshot philosophy, and consistency rules.
