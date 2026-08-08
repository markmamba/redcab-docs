---
title: "ADR-008: Domain Event Architecture"
sidebar_label: ADR-008
sidebar_position: 8
description: Architecture decision record 008.
---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- Domain events are **past-tense facts** published after commit; they carry identities and immutable data, not live aggregate references.
- All consumers must be **idempotent**; failed reactions retry without rolling back the emitting transition.

## About this document

ADR for domain event architecture.

| Topic | Document |
| --- | --- |
| Event catalog | [Domain Events](/docs/architecture/bounded-contexts/domain-events) |
| Integration | [API Design](/docs/architecture/api-design) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts — commands, queries, and domain events — and identity-only references; per [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy), a Booking freezes the commercial facts it depends on as immutable, write-once truth; and per [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries), transactional consistency stops at the context edge and everything across boundaries is reconciled asynchronously. Those decisions answer *how ownership is divided, how contexts cooperate, why history is frozen, and where consistency begins and ends*. [ADR-004](./adr-004-context-integration-model) named domain events as one of the three published-contract styles and [ADR-007](./adr-007-transaction-and-consistency-boundaries) established that they are what carries cross-context reactions once the async gap is crossed — but neither states, on its own, *why the architecture reaches for a domain event at all*, and *what a domain event is required to mean* so that it can do that job without re-coupling the contexts the prior decisions worked to separate. Because the entire asynchronous spine of the system rests on that meaning, the reasoning behind it deserves to be recorded explicitly. This ADR records that reasoning; it changes nothing about which events exist, who publishes them, who consumes them, or when they are emitted, all of which remain as locked in [../bounded-contexts.md](/docs/architecture/bounded-contexts) and [../../domain/domain-models.md](/docs/domain/domain-models).

The philosophical core of the decision is two sentences: **a domain event records that a business fact has already happened; other bounded contexts may react to that fact, but they never participate in creating it.** An event is not a request, an instruction, or an invitation to collaborate on a change in flight — it is the announcement of a change that is already complete, already committed, and already true within the context that owns it. Everything the architecture asks of domain events follows from that single distinction between a *fact that has occurred* and a *request for something to occur*.

The dominant force is that **a domain event represents a completed business fact**. [ADR-007](./adr-007-transaction-and-consistency-boundaries) fixed that a transaction protects an invariant within the single context that owns the state behind it, and that what must be true together lives together in one aggregate under one root. An event is the outward expression of a transition that has already satisfied those invariants inside its owner: a Booking has been created, a Booking has completed, a payment has succeeded, a Provider has been approved, a review has been approved. Each is stated as an accomplished fact about the past, and each is true regardless of what any downstream context does next. Because the fact is already settled inside its owner before it is ever announced, no consumer can invalidate it, renegotiate it, or roll it back — a consumer can only decide how to react to a truth it did not author. This is precisely why the domain-events catalog in [../bounded-contexts.md](/docs/architecture/bounded-contexts) and the shared modeling rules in [../../domain/domain-models.md](/docs/domain/domain-models) require every event to be **past-tense**: the tense is not a naming convention but a statement of what an event is permitted to be.

The second force is that **only committed state changes may publish events**. An event is a fact about the past; a change that has not committed is not yet a fact, and announcing it would be announcing something that might never become true. [ADR-007](./adr-007-transaction-and-consistency-boundaries) established that a state-changing command validates and commits within one context and that its synchronous response carries only its own guarded outcome, never the reactions it may trigger. A domain event is therefore emitted *of* a transition that has already taken effect, downstream of the consistency boundary that made it true — never in place of it and never before it. This ordering is what keeps the async spine honest: a consumer that receives `BookingCompleted` may rely on the Booking genuinely being complete (`LC-1..6`), and a consumer that receives `PaymentSucceeded` may rely on the money movement genuinely having occurred (`FIN-9`, `FIN-11`). If uncommitted or speculative changes could emit events, the past-tense guarantee would be a lie and every reaction built on it would be building on sand.

The third force is that **domain events coordinate bounded contexts without any context participating in another's transaction**. Business processes in Red Cab routinely span contexts — a purchase touches Catalog, Booking, and Payments; a completion touches Booking, Payments, and Reviews; a corporate order touches COR, Booking, and Payments — but [ADR-007](./adr-007-transaction-and-consistency-boundaries) fixed that no transaction spans them (save the single guarded checkout seam, `CR-1`). The event is what stitches those independently-committed steps into a coherent process: completion queues a payout and enables a review (`INV-5`, `LC-6`), license expiry pauses listings (`INV-7`, `OPR-3`), district deactivation unlists (`OPR-10`), and every committing transition fans out to Notifications (`OPR-8`, `CR-5`). Each of these is a **reaction to a fact**, executed within the reacting context's own boundary and its own transaction, *after* the originating transition committed — never a synchronous enrolment of the reacting context in the originator's transaction. This is the whole point of the sync-vs-async rule of thumb the architecture already states: invariants that must hold together are synchronous and co-transactional; cross-context reactions are asynchronous events. Downstream contexts *react instead of participate* because participation would drag their success or failure back into a transition that is already, by construction, complete.

The fourth force is that **an event never transfers ownership**. [ADR-003](./adr-003-bounded-context-architecture) and [ADR-004](./adr-004-context-integration-model) fixed that every concept has exactly one owning context and that collaboration must never become co-modification. A domain event carries identities and immutable facts, never a reference to another context's live aggregate and never a mandate to change it. When Booking emits the completion fact, Reviews gains the *right to react* — to establish eligibility and open a review link — but gains no authority over the Booking, cannot mutate it, and cannot read its internals (`INV-5`, `BKG-7`). When Booking emits the Commission Snapshot as the fact Payments consumes, Payments moves money against it but never authors or mutates it ([ADR-006](./adr-006-immutable-snapshot-strategy), `PAY-2`, `FIN-3`). An event is a fact leaving its owner, not ownership leaving its owner. This is what keeps events from becoming the very back door — a "cascade" that is really a disguised cross-context write — that [ADR-004](./adr-004-context-integration-model) forbids and that `CR-4` exists to guard against.

The fifth force is that **events describe facts, not requests, and this is what reduces coupling and enables independent evolution**. A request names a specific downstream action and a specific downstream doer — it says *do this* — and so it couples the emitter to the consumer's existence, capability, and success. A fact says only *this happened* and names no reactor at all; the emitter does not know, and must not know, who reacts or how many react. Because an event is a fact rather than a request, the emitting context has no dependency on any consumer: consumers may be added, removed, or changed, and reactions may evolve on their own cadence — Payments converging to external truth, Reviews moving at its own pace, Notifications fanning out to new channels — without the emitter ever changing. This is the mechanism by which the architecture's independent-evolution goal ([ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)) is realized across the asynchronous spine, and it is why the same committing transition can feed the payout queue, review eligibility, and notification fan-out without those three consumers, or the emitter, knowing anything about one another.

The final force is that **events are the eventual-consistency mechanism the prior decisions already require**. [ADR-007](./adr-007-transaction-and-consistency-boundaries) established that everything across aggregates and contexts is deliberately eventual and that a failed reaction never rolls back the committed transition that emitted it (`FIN-11`). A domain event is exactly the vehicle for that eventual reconciliation: the originating fact commits now, the reactions settle a moment later, and the two are related by the event rather than by a shared transaction. This is why the shared modeling rules require every consumer to be idempotent (`FIN-10`) — a fact may be observed more than once, and reacting twice to one fact must be indistinguishable from reacting once — and why ordering hazards across the async gap (`CR-3`, `FIN-5`) are reasoned about as properties of the choreography rather than designed away with a distributed transaction the architecture has already rejected. The event does not *create* eventual consistency; it is how eventual consistency is *coordinated* once the architecture has chosen it.

Together these forces reinforce, rather than extend, the three published-contract styles of [ADR-004](./adr-004-context-integration-model). A **command** is a guarded request to change state and is answered synchronously within one context; a **query** is a side-effect-free read that establishes no transactional ownership; a **domain event** is the past-tense announcement that a guarded change has already happened, consumed asynchronously by whoever chooses to react. Commands and queries let a context *ask*; events let a context *tell*, after the fact, without asking anyone to do anything. The three are complementary faces of one integration discipline, and the event is the face that carries the temporal dimension [ADR-007](./adr-007-transaction-and-consistency-boundaries) added to ownership: it is what a context publishes at the far side of its own consistency boundary so that the rest of the system can stay decoupled from *how* and *when* that boundary was crossed.

## Decision

The domain-event model is fixed as already established:

- **A domain event is a completed business fact.** Every event announces a transition that has already taken effect and already satisfied its owner's invariants; it is a statement about the past, true independently of any consumer, and it is named in the **past tense** for exactly that reason (`BookingCompleted`, `ProviderApproved`, `PaymentSucceeded`, `RatingRecalculated`; [glossary](/docs/business-rules/glossary) *Domain Event*, [domain-models.md](/docs/domain/domain-models) §2).
- **Only committed state changes publish events.** An event is emitted of a transition that has already committed within the owning context's consistency boundary ([ADR-007](./adr-007-transaction-and-consistency-boundaries)); an uncommitted or speculative change is not yet a fact and does not announce one. The synchronous outcome of a command belongs to the caller; the event is what the rest of the system learns afterward (per [ADR-004](./adr-004-context-integration-model)).
- **Events describe facts, never requests.** An event states *what happened*, not *what should now be done* and never names a doer; it carries identities and immutable facts, never a reference to another context's live aggregate and never an instruction ([domain-models.md](/docs/domain/domain-models) §2, §6).
- **Events coordinate bounded contexts across consistency boundaries.** Cross-context reactions where consistency is not immediate — payout queuing on completion, review eligibility on completion, the license/district cascades, notification fan-out — are carried by domain events, joining independently-committed steps into a process without any shared transaction (`INV-5`, `LC-6`, `INV-7`, `OPR-3`, `OPR-8`, `OPR-10`; [ADR-007](./adr-007-transaction-and-consistency-boundaries)).
- **Downstream contexts react; they never participate in the originating transition.** A consumer reacts within its own boundary and its own transaction, after the fact, and its success or failure is never bound to the committed transition that emitted the event; a failed reaction is retried independently and never rolls back that transition (`FIN-11`, `CR-3`, `CR-4`).
- **Events never transfer ownership.** Receiving an event grants the right to react, never authority over the emitter's state; the consumer cannot mutate or read the emitter's internals and remains bound by the identity-only, no-cross-context-write rules of [ADR-003](./adr-003-bounded-context-architecture) and [ADR-004](./adr-004-context-integration-model). A fact leaves its owner; ownership does not.
- **Events support eventual consistency and are consumed idempotently.** Because a fact may be observed more than once and reactions settle after the fact, every consumer is idempotent so that reacting to one fact repeatedly is indistinguishable from reacting once (`FIN-10`; [domain-models.md](/docs/domain/domain-models) §5).
- **Events reinforce the published contracts and complement commands and queries.** The domain event is the third of the three published-contract styles of [ADR-004](./adr-004-context-integration-model): commands ask for a guarded change, queries read without ownership, and events tell — after the fact — what already changed. All three are the only surfaces across which contexts integrate.

This decision records *why the architecture publishes domain events and what they are required to mean*; it changes nothing about which events exist, their publishers, their consumers, or the moment they are emitted, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../../domain/domain-models.md](/docs/domain/domain-models), and [../../business-rules/business-rules.md](/docs/business-rules/invariants).

## Consequences

### Positive

- **Coordination without coupling.** A committing transition can feed the payout queue, review eligibility, and notification fan-out at once, yet the emitter depends on none of those consumers and none of them depend on one another — a fact names no reactor, so reactors evolve, appear, and disappear without touching the emitter (`CR-4`, `CR-5`).
- **Preserved bounded-context autonomy.** Because an event transfers a fact and never ownership, a consumer gains the right to react but never authority over the emitter's state, extending the singular-ownership discipline of [ADR-003](./adr-003-bounded-context-architecture) across the asynchronous spine.
- **Reactions cannot corrupt the originating fact.** A downstream reaction runs after the originating transition has already committed and can never roll it back, so slowness, failure, or evolution in one context cannot undo another's committed work (`FIN-11`), reinforcing the contained blast radius of [ADR-007](./adr-007-transaction-and-consistency-boundaries).
- **Trustworthy asynchronous reasoning.** Because events are past-tense facts of already-committed transitions, a consumer of `BookingCompleted` or `PaymentSucceeded` may rely on the fact being genuinely true, making the choreography reasonable even though it is eventual (`LC-1..6`, `FIN-9`, `FIN-11`).
- **Independent evolution across the spine.** Facts-not-requests let Payments, Reviews, and Notifications each evolve on their own cadence behind stable event contracts without forcing changes on the contexts that emit the facts they react to (per [ADR-004](./adr-004-context-integration-model)).
- **Consistent with frozen history.** Events carry immutable facts and identities, never live aggregate references, so they compose cleanly with the immutable snapshots of [ADR-006](./adr-006-immutable-snapshot-strategy): the fact announced is as fixed as the fact stored, and neither can be retroactively rewritten by a reaction.
- **A single, coherent integration triad.** Commands, queries, and events give every seam one predictable shape — ask synchronously, read without ownership, or tell after the fact — so how any two contexts cooperate is principled rather than ad hoc (per [ADR-004](./adr-004-context-integration-model)).

### Negative

- **Processes must be reasoned about as choreography of facts.** An end-to-end flow is a sequence of committed transitions and past-tense reactions, not one synchronous story; understanding it requires holding the whole event choreography and its ordering hazards in mind (`CR-3`, `CR-5`; [domain-models.md](/docs/domain/domain-models) §6).
- **Consumers must be idempotent by design.** Because a fact may be observed more than once and reactions may settle out of order, every consumer must be built so that reacting repeatedly to one fact is indistinguishable from reacting once (`FIN-10`), which is more demanding than a single synchronous call.
- **No cross-context undo.** When a later reaction fails, the earlier committed fact is not reversed; correction must be expressed as a *new* fact — a compensating movement or a superseding transition within the owning context (`PAY-6`, `PAY-8`, `CON-5`) — never as a rollback of the fact that was already announced.
- **The facts-not-requests discipline must be actively upheld.** With no network boundary to enforce it, an event can be quietly misused as a disguised instruction or a cross-context write; the model holds only as long as the team keeps events past-tense facts that transfer no ownership (`CR-4`).
- **Two truths and a gap to hold at once.** Contributors must be clear about which outcomes are guaranteed by the committed originating fact and which are eventual reactions that settle across the async gap — more cognitive load than a single synchronous flow would suggest, though that flow is exactly what the architecture rejects.

## Alternatives Considered

### Events as commands (requests to act)

Treating a cross-context event as an instruction that names a downstream action and expects it to be carried out — a "please queue this payout," "please pause these listings" — rather than a fact that something happened.

Rejected because a request couples the emitter to the consumer's existence, capability, and success, which is precisely the coupling the asynchronous spine exists to avoid. It would re-introduce the emitter's dependency on who reacts and whether they succeed, contradicting the rule that a failed reaction never rolls back the committed transition that emitted it (`FIN-11`), and it would turn Onboarding's or Geography's cascades into disguised cross-context writes rather than reactions to a fact (`CR-4`). A fact names no reactor and depends on none; that is the whole source of the decoupling ([ADR-004](./adr-004-context-integration-model)).

### Publishing events on uncommitted or in-flight changes

Emitting an event as a change begins, or before its transition has committed, so consumers can react sooner.

Rejected because an event is a fact about the past, and an uncommitted change is not yet a fact. Announcing a change that might still fail or be abandoned would make the past-tense guarantee false, and every reaction built on it — a payout queued for a completion that did not complete, a review link for a Booking that never finished — would be built on something that never became true (`LC-1..6`, `INV-5`, `FIN-9`). Events follow the consistency boundary that made the change true ([ADR-007](./adr-007-transaction-and-consistency-boundaries)); they never precede it.

### Synchronous cross-context reactions in place of events

Making every cross-context effect a synchronous, awaited call within the originating transition — the originator waits for payout queuing, rating recalculation, and notification to succeed before its transition is considered done.

Rejected because it binds a committed business fact to the success of downstream and external work and re-couples contexts the architecture deliberately keeps on the asynchronous spine (`CR-5`). [ADR-004](./adr-004-context-integration-model) and [ADR-007](./adr-007-transaction-and-consistency-boundaries) already rejected this: it would collapse the distinction between operations that must be consistent *now* and reactions that may be eventual, and would make a committed transition depend on an after-the-fact reaction — contradicting `FIN-11`. The one place two invariants must hold together across a context line is the guarded checkout seam (`CR-1`), and it is a synchronous *command*, not an event, precisely because it is not an after-the-fact reaction.

### Events that carry live references or grant write-back authority

Letting an event carry a handle to the emitter's live aggregate, or letting a consumer write back into the emitter in response, so reactions can "keep things in sync."

Rejected because it transfers ownership through the back door the architecture exists to close. An event that hands over a live reference or a right to mutate the emitter makes a concept have more than one modifier — the ambiguity [ADR-003](./adr-003-bounded-context-architecture) and [ADR-004](./adr-004-context-integration-model) forbid — and would let a reaction rewrite the very fact it was reacting to, breaching the immutable-fact discipline of [ADR-006](./adr-006-immutable-snapshot-strategy) and the reads-facts-never-mutates seam Payments and Reviews depend on (`PAY-2`, `FIN-3`, `INV-5`). An event carries identities and immutable facts only; a fact leaves its owner, ownership never does.

## Related Documents

- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that makes every event a fact owned by exactly one publishing context and consumed without transfer of ownership.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the commands/queries/events model whose third style this decision explains, and the sync-vs-async rule of thumb that places reactions on the asynchronous spine.
- [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy) — the immutable facts events carry as identities and frozen values rather than live references.
- [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries) — the consistency boundaries whose far side an event is published from, and the eventual-consistency model events coordinate.
- [overview.md](/docs/architecture/overview) — top-level architecture, the Event-Driven principle, and the cross-context integration summary.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, the domain-events catalog, the sync-vs-async interaction styles, and the `CR-1`–`CR-7` coupling-risk register.
- [api-design.md](/docs/architecture/api-design) — how past-tense domain-event publication is expressed as an internal published contract at the platform edge.
- [domain-models.md](/docs/domain/domain-models) — domain events as integration boundaries, the past-tense/idempotency modeling rules, and the domain-event flow overview.
