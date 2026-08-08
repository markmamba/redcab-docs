---
title: "ADR-007: Transaction and Consistency Boundaries"
sidebar_label: ADR-007
sidebar_position: 7
description: Architecture decision record 007.
---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## TL;DR

- Strong consistency **inside** an aggregate; eventual consistency **across** contexts via events.
- **One exception:** CheckoutSession + Catalog seat reservation share a transaction (`CR-1`, `CON-1`).

## About this document

ADR for transaction and consistency boundaries.

| Topic | Document |
| --- | --- |
| Contexts | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Data consistency | [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts and identity-only references; per [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority), price is computed in exactly one authoritative place; and per [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy), a Booking freezes the commercial facts it depends on rather than reading them live. Those decisions answer *how ownership is divided, how contexts cooperate, where price is made, and why history is frozen*. They do not, on their own, state *where transactional consistency begins and ends* — which changes the architecture treats as one indivisible act, and which it deliberately allows to settle a moment later. Consistency boundaries are implied throughout the prior decisions but never recorded as a decision in their own right, and because the placement of those boundaries is what makes every high-value invariant enforceable, the reasoning behind them deserves to be stated explicitly. This ADR records that reasoning; it changes nothing about which operations are atomic, which are eventual, or where the one documented shared-transaction seam lies.

The philosophical core of the decision is a single sentence: **a transaction protects business invariants within a bounded context.** Business processes in Red Cab routinely span several contexts — a purchase touches Catalog, Booking, and Payments; a completion touches Booking, Payments, and Reviews; a corporate order touches B2B, Booking, and Payments — but **no transaction spans them.** A business process is a choreography of many owned steps; a transaction is the unit within one step where an invariant must hold or the step is invalid. Conflating the two — trying to make a whole cross-context process one atomic act — is precisely the failure this decision exists to prevent.

The dominant force is that **an invariant can only be protected by the context that owns the state behind it**, and only within the boundary of the aggregate that guards it. The model already establishes that an aggregate *is* the unit of transactional consistency: everything inside it is kept consistent within a single atomic change, and everything outside is reconciled asynchronously and is only eventually consistent (per [domain-models.md](/docs/domain/domain-models) §1, §5). The high-value invariants each live wholly inside one owner — snapshot integrity in Booking (`INV-1`), inventory integrity in a single AvailabilitySlot owned by Catalog (`INV-3`), the frozen revenue split in Booking's snapshot (`INV-2`), review eligibility gated by an upstream completion fact (`INV-5`), and right-to-operate decided in one place (`INV-6`). Because each invariant is contained within a single owner, each can be upheld by a transaction that never has to reach across a boundary to do its job.

The second force is that **the moment of purchase is the one place where two owned invariants must become true together**. At checkout the architecture requires that booking creation, snapshot freeze, and seat reservation take effect as one indivisible unit or not at all (`BKG-2`, `CON-1`), because snapshot integrity (`INV-1`) and inventory integrity (`INV-3`) are both true at the instant of creation or the purchase is invalid. This is the single case where a strongly-consistent operation legitimately draws on state owned by another context: Booking's checkout invokes Catalog's **guarded seat-reservation command** co-transactionally, the one deliberate shared-transaction seam in the system (`CR-1`). Everything about how this seam is bounded — a guarded command rather than reach-in access, singular, documented, never to be generalized — was fixed in [ADR-004](./adr-004-context-integration-model). This decision records *why* it is the sole exception: because it is the only point where two invariants that must hold together straddle a context line, and the atomic-overbooking guarantee (`CON-2`, `CON-3`) cannot be met by an after-the-fact reaction.

The third force is that **most cross-context collaboration does not require, and must not claim, immediate consistency**. Payout queuing after completion, rating recalculation after moderation, listing pause after license expiry, district-deactivation cascades, and every notification are reactions that are correct *a moment later* (per [ADR-004](./adr-004-context-integration-model); [domain-models.md](/docs/domain/domain-models) §5). Binding these into the transaction that triggers them would couple a committed business fact to the success of downstream and external work — contradicting the established rule that a failed reaction never rolls back the committed transition that emitted it (`FIN-11`), and dragging external-rail volatility into the order aggregate. Money movement in particular converges to an asynchronous external truth and must reconcile toward it, surfacing divergence rather than pretending it away (`FIN-10`, `FIN-11`); the payout/refund interlock must therefore hold *across* the async gap, not inside one transaction (`CR-3`, `FIN-5`, `PAY-8`).

The fourth force is that **queries establish no transactional ownership**. The pricing authority, availability reads, the Provider Status read, and the Commission Snapshot read are side-effect-free consumptions of owned state or computed value contracts (per [ADR-004](./adr-004-context-integration-model), [ADR-005](./adr-005-single-pricing-authority)). A reader depends on another context's published result but never enrolls that context's state in its own transaction and never acquires the right to change it. This is what keeps reading decoupled from writing: Payments reads the Commission Snapshot to move money and never authors or mutates it (`PAY-2`, [ADR-006](./adr-006-immutable-snapshot-strategy)); Catalog conforms to the Provider Status read without replicating verification logic (`INV-6`).

The final force is **evolution without re-architecture**. The system is one deployable over one database (per [ADR-001-modular-monolith.md](./adr-001-modular-monolith)), which is what makes the one co-transactional seam possible without a distributed protocol. But the *business* architecture — where consistency is required and where it is eventual — is defined independently of that packaging. By insisting now that transactional consistency never spans a context except at the single documented seam, the architecture ensures that if any context ever graduates to its own service against a documented fitness function, only that one seam requires redesign (into a saga), and every already-eventual collaboration keeps working unchanged. The consistency boundaries are drawn where the business needs them, not where the current deployment happens to allow them.

## Decision

The transaction and consistency boundaries are fixed as already established:

- **Each bounded context owns its own consistency boundary.** A context is transactionally consistent within its own aggregates and nowhere else; an invariant is upheld by the single context that owns the state behind it, within the aggregate that guards it (`INV-1`, `INV-3`, `INV-5`, `INV-6`; [domain-models.md](/docs/domain/domain-models) §1, §4).
- **Transactional consistency is intentionally limited to a single consistency boundary.** What must be true together lives together in one aggregate under one root; if two facts may be consistent a moment later, they belong to different aggregates and are reconciled asynchronously (per [domain-models.md](/docs/domain/domain-models) §1, §5).
- **Cross-context operations do not form one shared transaction.** A business process that spans contexts is a choreography of individually-owned, committed steps, not a single atomic act. The sole deliberate exception is the guarded seat-reservation seam at checkout (`CR-1`), where snapshot integrity (`INV-1`) and inventory integrity (`INV-3`) must hold together at the instant of purchase (`BKG-2`, `CON-1`); it is a guarded command, singular and documented, and is never generalized into shared state access.
- **Commands execute within one context.** A state-changing command is validated against the owning context's invariants and lifecycle and commits within that context; its synchronous response carries only its own guarded outcome, never the reactions it may trigger (per [ADR-004](./adr-004-context-integration-model)).
- **Queries never establish transactional ownership.** Side-effect-free reads of owned state or computed value contracts — the pricing authority, availability, the Provider Status read, the Commission Snapshot — let a consumer depend on a result without enrolling the owner's state in its transaction and without acquiring the right to change it (`PRC-1`, `PAY-2`, `INV-6`).
- **Domain events coordinate across consistency boundaries.** Cross-context reactions where consistency is not immediate — payout queuing, rating recalculation, the license/district cascades, notifications — are carried by past-tense, idempotent domain events; a failed reaction is retried independently and never rolls back the committed transition that emitted it (`FIN-10`, `FIN-11`, `CON-5`, `CR-3`, `CR-4`).
- **Eventual consistency is an intentional tradeoff, not a limitation.** Everything across aggregates and contexts is deliberately eventual and reconciled by events; money in particular converges to asynchronous external-rail truth, surfacing divergence as a reconcilable fact rather than a silent loss (`FIN-11`).
- **Strong consistency exists only where a business invariant requires it.** The atomic checkout unit is strongly consistent because overbooking must be impossible and the snapshot must be authored with the order (`CON-1`, `CON-2`, `INV-1`, `INV-3`); everywhere else, immediate consistency is neither claimed nor required.

This decision records *why the architecture defines transaction and consistency boundaries this way*; it changes nothing about which operations are atomic, which are eventual, the single shared-transaction seam, or the ownership of any invariant, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../../domain/domain-models.md](/docs/domain/domain-models), and [../../business-rules/business-rules.md](/docs/business-rules/invariants).

## Consequences

### Positive

- **Enforceable invariants.** Because every high-value invariant lives wholly inside one owner and is protected by a transaction that never reaches across a boundary, each invariant has a single guardian and cannot be undermined by a distant change (`INV-1`, `INV-3`, `INV-5`, `INV-6`).
- **Reinforced bounded-context ownership.** A consistency boundary that stops at the context edge means "who may change this, and when is it true?" always has one answer, extending the singular-ownership discipline of [ADR-003](./adr-003-bounded-context-architecture) into the temporal dimension.
- **Contained blast radius.** No cross-context transaction means one context's slowness, failure, or evolution cannot roll back or block another's committed work; the checkout seam aside, contexts fail and recover independently.
- **Autonomy preserved by contracts.** Published commands, queries, events, and value contracts let a context depend on another's capability without enrolling its state or acquiring write access, so capabilities on independent evolution axes stay decoupled (per [ADR-004](./adr-004-context-integration-model)).
- **Support for the Modular Monolith.** Strong consistency is the default only for the in-process operations that truly need it — above all the atomic checkout unit made possible by the single database (per [ADR-001](./adr-001-modular-monolith)) — while the rest of collaboration rides the asynchronous spine, keeping request latency decoupled from downstream and external work (`OPR-8`).
- **Trustworthy money path over time.** Payments moves money against frozen facts and converges to external truth across the async gap rather than inside a shared transaction, keeping the payout/refund interlock correct without a distributed protocol (`FIN-5`, `FIN-11`, `PAY-8`, `CR-3`).
- **Evolution without changing business architecture.** Because consistency boundaries are drawn where the business requires them and not where the deployment permits them, a future extraction of a context to its own service disturbs only the one documented seam; every already-eventual collaboration is unaffected.

### Negative

- **Business processes must be reasoned about as choreography.** An end-to-end flow spanning contexts is a sequence of committed steps and eventual reactions, not one atomic story; understanding it requires holding the whole choreography and its ordering hazards in mind (`CR-3`, `CR-5`; [domain-models.md](/docs/domain/domain-models) §6).
- **Eventual consistency demands careful design.** Consumers must be idempotent and tolerate delay, reordering, and redelivery, and designers must accept that a committed transition is never undone by a failed reaction (`FIN-10`, `FIN-11`).
- **The single seam must never quietly spread.** The one deliberate shared-transaction seam (`CR-1`) is a standing temptation to add "just one more" cross-context transaction; the discipline holds only as long as the team refuses to, and any change to it demands a redesign (a saga), not an expedient extension.
- **No cross-context rollback.** When a later step in a process fails, earlier committed steps are not automatically reversed; correction must be expressed as new, compensating facts within the owning contexts (`PAY-6`, `PAY-8`, `CON-5`) rather than as an undo of a shared transaction.
- **Two consistency regimes to hold at once.** Every contributor must be clear about which questions are answered by strongly-consistent owned state and which by eventually-consistent reconciliation — more cognitive load than a single global transaction would suggest, though a single global transaction is exactly what the architecture rejects.

## Alternatives Considered

### One transaction spanning the whole business process

Making an end-to-end process — checkout through charge, payout, and notification, or completion through payout and review eligibility — a single atomic unit so the entire process succeeds or fails together.

Rejected because it binds a committed business fact to the success of downstream and external work the owning context does not control. It contradicts the established rule that a failed reaction never rolls back the committed transition that emitted it (`FIN-11`), drags external-rail volatility into the order aggregate, and re-couples contexts that the architecture deliberately keeps on the asynchronous spine (per [ADR-004](./adr-004-context-integration-model), `CR-5`). It would also make the payout/refund interlock a property of one giant transaction rather than a reconciliation across the async gap, which the money model explicitly rejects (`FIN-5`, `CR-3`).

### Distributed transactions across contexts

Coordinating a cross-context change through a distributed agreement so several contexts commit or abort in lockstep.

Rejected because it imposes distributed-systems complexity and failure modes disproportionate to the domain and team, and it is unnecessary: the only place two invariants must hold together across a context line is the checkout seat reservation, which the single shared database already satisfies through one guarded co-transactional command (`CR-1`, `CON-1`), per [ADR-001](./adr-001-modular-monolith). Generalizing that one seam into a distributed protocol everywhere would trade a simple, local guarantee for a complex, fragile one and threaten the never-overbook invariant it exists to protect (`INV-3`).

### Eventual consistency everywhere, including checkout

Modeling even the seat reservation and snapshot freeze as after-the-fact reactions, so nothing is strongly consistent.

Rejected because it cannot uphold the invariants that must hold *within* the purchase. If seat decrement and snapshot freeze were eventual, concurrent buyers could both pass a stale availability check and overbook (`CON-2`, `CON-3`, `INV-3`), and a Booking could exist before its commercial terms were frozen (`INV-1`, `BKG-2`). Strong consistency at checkout is not incidental; it is the one place the business genuinely requires it, which is exactly why the architecture confines strong consistency to that boundary rather than abolishing it.

### Shared consistency across contexts through common state

Letting multiple contexts read and write a shared model so their consistency is maintained in common rather than per-owner.

Rejected because shared write-access is the ownership ambiguity the whole architecture exists to prevent (per [ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)). More than one modifier of price, snapshots, or seat inventory would make `PRC-1`, `INV-1`, and `INV-3` unenforceable, weld contexts on independent evolution axes together, and turn every cross-context effect into a hidden coupling instead of a published contract. Consistency is achieved per owner and coordinated by contracts and events, never by a commonly-mutated model.

## Related Documents

- [ADR-001-modular-monolith.md](./adr-001-modular-monolith) — the single-deployable, single-database decision that makes strong consistency the default for in-process operations and the one shared-transaction seam possible without a distributed protocol.
- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that gives every invariant one owner, and therefore one consistency boundary.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the commands/queries/events model and the sync-vs-async rule of thumb that this decision expresses in terms of consistency boundaries.
- [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority) — the pricing authority consumed as a query that establishes no transactional ownership.
- [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy) — the immutable facts a downstream context reads without enrolling the owner's state in its transaction.
- [overview.md](/docs/architecture/overview) — top-level architecture, the Atomic Capacity Reservation and Event-Driven principles, and the "one shared transaction" summary.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, transactional boundaries per context, the sync-vs-async interaction styles, and the `CR-1`–`CR-7` coupling-risk register.
- [api-design.md](/docs/architecture/api-design) — how the commands, queries, and cross-context boundaries are expressed at the platform edge.
- [domain-models.md](/docs/domain/domain-models) — aggregates as consistency boundaries, the aggregate-boundary rules, and the consistency-and-concurrency rules.
