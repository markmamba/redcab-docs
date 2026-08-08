---
title: "ADR-009: External Systems Integration"
sidebar_label: ADR-009
sidebar_position: 9
description: Architecture decision record 009.
---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- External systems (Stripe, email, SMS) are **capabilities at the edge** — they do not own business policy or invariants.
- Domain converges to external settlement truth asynchronously (`FIN-11`); vendors can change behind anti-corruption boundaries.

## About this document

ADR for external systems integration.

| Topic | Document |
| --- | --- |
| External integrations | [Architecture Overview](/docs/architecture/overview) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts — commands, queries, and domain events — and identity-only references; per [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries), transactional consistency stops at the context edge and everything beyond it is reconciled asynchronously; and per [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture), a domain event announces a committed business fact that others may react to but never author. Those decisions govern *how the domain is divided and how its own contexts cooperate*. They do not, on their own, state *how the domain relates to the systems that are not part of it* — the external rails that execute card charges, marketplace payouts and refunds, and the external channels that deliver email and optional SMS. Those systems sit **across the platform's system boundary** (per [../overview.md](/docs/architecture/overview), System Context and External Integrations): they are named as actors and rails, and they are pointedly **not** among the 6 core + 2 supporting bounded contexts that constitute the domain. Because the entire two-sided marketplace depends on money actually moving and messages actually being delivered by systems Red Cab does not own, the reasoning that keeps those systems *outside* the domain — suppliers of capability rather than participants in it — deserves to be recorded explicitly. This ADR records that reasoning; it changes nothing about which external systems the platform depends on, what each is responsible for, or where the money-facts / money-movement seam lies, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), and [../payments-architecture.md](/docs/architecture/payments-architecture).

The philosophical core of the decision is two sentences: **external systems provide capabilities; they never own the business.** An external system can be *asked* to move funds, transfer a Provider's net share, execute a refund, or deliver a message — but the decision that funds are owed, the split by which they divide, the policy by which a refund is computed, and the event that warrants a message are all made *inside* the domain, before any external system is ever engaged. Everything the architecture asks of external integration follows from that single distinction between a *capability that is executed* and a *business truth that is authored*.

The dominant force is that **business truth is authored inside bounded contexts and nowhere else**. The high-value invariants each live wholly inside one owner: price is computed in exactly one authoritative place (`PRC-1`), the revenue split is frozen on the Booking at checkout (`INV-1`, `INV-2`), a Provider's right to operate is decided in one place (`INV-6`, `INV-7`), and inventory integrity is guarded by a single owner (`INV-3`). None of these facts is knowable by, derivable from, or delegable to a system outside the platform. An external rail does not know the Commission Rate, does not compute price, and does not decide who may sell; it is *handed* an amount and a split already fixed by the snapshot and asked to execute the movement (`PAY-2`, `PAY-4`, `FIN-3`). This is the whole point of the money-facts / money-movement seam ([ADR-006](./adr-006-immutable-snapshot-strategy), [../payments-architecture.md](/docs/architecture/payments-architecture)): Booking authors the immutable fact, Payments moves the money against it, and the external rail is the executor of a movement whose terms were decided before it was called. The commission the rail applies is required to *match* the snapshot (`INV-2`), never to define it.

The second force is that **external systems supply capabilities, not decisions**. The Notifications supporting context is the clearest expression of this: it is an outbound adapter that reacts to domain events and renders templates, where *no domain decision is made* — the decisions of *when* to notify and in *which* language are owned by the publishing contexts and by Identity (`OPR-8`, `OPR-9`), and the external channel merely carries what the domain has already decided to say. The same shape holds for money: the platform decides that a charge is warranted for the snapshotted gross, that a payout is owed on the frozen Net Payout Amount (`LC-6`), and that a refund is due under the snapshotted Cancellation Policy (`PAY-6`, `PAY-7`); the external rail executes those requests but originates none of them. A capability is something the domain *invokes*; a decision is something the domain *makes*. Confusing the two — letting the system that executes a capability also decide the business terms of it — is precisely the failure this decision exists to prevent.

The third force is that **external volatility must be kept out of the aggregates**, which is why the domain reaches external systems only across an anti-corruption edge. [ADR-004](./adr-004-context-integration-model) established that contexts integrate only through published contracts and translate foreign vocabularies at the boundary rather than letting them leak inward (the ACL and conformist relationships). The same discipline governs the outward edge: money movement has a different change cadence and failure model than the order aggregate — it is asynchronous, rail-coupled, and must converge to an external settlement truth (`FIN-11`) — and binding that volatility into Booking would drag the external world's failure modes into the immutable order fact. Instead, the order aggregate holds only frozen facts, and an edge (Payments reconciliation for money, the Notification adapter for messages) mediates every exchange with the outside, so external behavior never reaches in and rewrites a committed fact ([ADR-006](./adr-006-immutable-snapshot-strategy), `PAY-2`, `INV-1`). The anti-corruption boundary that protects Booking from Corporate's evolving vocabulary is the same architectural instinct applied to the vendors beyond the system edge.

The fourth force is that **vendor-specific concepts must never enter the ubiquitous language**. The glossary is the dependency root of the whole planning set, and a term is defined once in its owning context and only referenced elsewhere ([glossary](/docs/business-rules/glossary)). The domain's language is Booking, Snapshot, Commission Snapshot, Price Breakdown, Provider Status, Availability Slot, Review — concepts that describe the *business*, not the tools that happen to execute parts of it. An external rail's internal notions of how a charge, a transfer, or a message is represented are vendor concepts; letting them become nouns the domain reasons in would couple the ubiquitous language to a particular vendor and make the model impossible to speak without that vendor present. The architecture therefore keeps every external notion at the edge: the domain speaks its own language, the edge translates, and no vendor term crosses into the model that the invariants are written against.

The fifth force is that **external failures never invalidate committed business facts**. [ADR-007](./adr-007-transaction-and-consistency-boundaries) fixed that a failed reaction never rolls back the committed transition that emitted it, and [ADR-008](./adr-008-domain-event-architecture) fixed that a domain event is a fact about the past that no downstream reaction can undo. External integration lives entirely on that asynchronous spine: settlement outcomes arrive after the fact and are authoritative for *whether a requested movement actually occurred* (`FIN-11`), but a committed business fact is never reversed by an external failure — the failure instead surfaces as a reconcilable Payments fact (a payout-failed or refund-failed condition) for operator action, and correction is expressed as a *new* superseding fact, never as an edit of the fact already frozen (`PAY-6`, `PAY-8`, `FIN-10`, `FIN-11`). External truth is authoritative for the *outcome of an executed capability*; it is never authoritative for the *business policy* that requested it. This distinction is what lets money converge to the rail's reality without ever surrendering the domain's authorship of what was owed and to whom.

The final force is **long-term vendor independence**. That external detail is deliberately deferred — the capture model, charge topology and merchant-of-record, auto-transfer-versus-queue, clearing period and disbursement states for the payment rail (`AMB-001`..`AMB-008`), and the choice, MVP inclusion, and gating of the optional SMS channel (`AMB-034`) — is itself the evidence that the architecture accommodates either resolution *without moving a single boundary* (per [../overview.md](/docs/architecture/overview), Open Architectural Decisions). Because business truth is authored inside the contexts and external systems are reached only as capabilities behind an edge, a rail or channel can be reconfigured, or replaced, and the domain model, its invariants, and its published contracts remain untouched. The domain depends on *the capability* — funds move, a message is delivered — not on *the particular supplier of it*, and that is exactly what keeps the platform free to change suppliers over time.

## Decision

The external-systems posture is fixed as already established:

- **External systems are outside the domain model.** The card-and-payout rail and the email/optional-SMS channels sit across the platform's system boundary; they are external rails and actors, never bounded contexts. The domain is exactly the 6 core + 2 supporting contexts, and no external system is among them (per [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts)).
- **Business rules and invariants remain inside their owning contexts.** Price (`PRC-1`), the frozen revenue split (`INV-1`, `INV-2`), right-to-operate (`INV-6`, `INV-7`), inventory integrity (`INV-3`), review eligibility (`INV-5`), and the Commission Rate (`PAY-2`) are authored and enforced by their single owners; no external system holds, derives, or shares an invariant.
- **External providers supply capabilities, not business decisions.** A rail executes charges, payouts, and refunds; a channel delivers messages. The decisions that a charge is warranted, that a payout is owed on the frozen Net Payout Amount (`LC-6`), that a refund is due under the snapshotted policy (`PAY-6`, `PAY-7`), and that and *when* a message should be sent and in which language (`OPR-8`, `OPR-9`) are made inside the domain before any external system is engaged.
- **The domain owns business truth; external systems execute requested capabilities.** Booking authors the immutable money fact and the external rail moves money against it; the applied split is required to match the snapshot, never to define it (`INV-2`, `PAY-4`, `FIN-3`). The Notifications adapter carries what the publishing contexts decided to say and makes no domain decision.
- **The domain is protected by an anti-corruption edge.** External systems are reached only across a boundary that mediates every exchange, keeping external volatility and vendor vocabulary out of the aggregates and preserving the money-facts / money-movement seam (per [ADR-004](./adr-004-context-integration-model), [ADR-006](./adr-006-immutable-snapshot-strategy); `PAY-2`, `INV-1`).
- **Vendor-specific concepts never enter the ubiquitous language.** The domain reasons only in its own terms; any external notion stays at the edge and is translated, so no vendor concept becomes a term the invariants are written against ([glossary](/docs/business-rules/glossary)).
- **External failures never invalidate committed business facts.** A committed transition is never rolled back by an external failure; the failure surfaces as a reconcilable fact for operator action, and correction is a new superseding fact, never an edit of a frozen one (`FIN-10`, `FIN-11`, `PAY-6`, `PAY-8`; [ADR-007](./adr-007-transaction-and-consistency-boundaries), [ADR-008](./adr-008-domain-event-architecture)).
- **External systems are authoritative for outcomes, never for policy.** External settlement truth is authoritative only for whether a requested movement occurred (`FIN-11`); it is never an authoritative source of price, split, right-to-operate, or any other business policy, which are owned inside the domain.
- **Integrations are replaceable without changing the domain.** Because the domain depends on capabilities behind published contracts and an edge — not on a particular supplier — the deferred external decisions (`AMB-001`..`AMB-008`, `AMB-034`) can resolve either way, and a rail or channel can be reconfigured or replaced, without moving a boundary or touching an invariant.

This decision records *why the architecture isolates external systems from the domain*; it changes nothing about which external systems are depended on, the responsibility split with each, or the seams they touch, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../payments-architecture.md](/docs/architecture/payments-architecture), and [../../business-rules/business-rules.md](/docs/business-rules/invariants).

## Consequences

### Positive

- **Business truth stays inside the domain.** Because price, split, right-to-operate, and eligibility are authored only by their owners, "what is true, and who decided it?" always has a single in-domain answer, extending the singular-ownership discipline of [ADR-003](./adr-003-bounded-context-architecture) to the platform's outer edge.
- **External volatility is contained.** Rail failure, latency, or change cannot reach into an aggregate and rewrite a committed fact; the order aggregate holds only frozen facts and the edge absorbs the outside world, reinforcing the contained blast radius of [ADR-007](./adr-007-transaction-and-consistency-boundaries) ([ADR-006](./adr-006-immutable-snapshot-strategy), `PAY-2`, `INV-1`).
- **Trustworthy money over time.** The split executed by the rail is required to match the snapshot (`INV-2`), and every movement is traceable to exactly one Booking and its snapshot (`FIN-3`), so a charge, payout, or refund is defensible years later against numbers the external system never authored.
- **Committed facts survive external failure.** A failed movement surfaces as a reconcilable Payments fact rather than an undo of the business fact that requested it (`FIN-11`, `PAY-8`), so the honesty of the record does not depend on the reliability of the vendor.
- **A clean, decision-free outbound adapter.** Notifications carries what the domain decided to say and owns no policy (`OPR-8`, `OPR-9`), keeping request latency decoupled from external delivery and preserving the confirmation SLA without a synchronous dependency on any channel (`CR-5`).
- **Vendor independence.** Because the domain depends on capabilities and not on suppliers, a rail or channel can be reconfigured or replaced, and the deferred external decisions can resolve either way, without moving a boundary or touching an invariant (`AMB-001`..`AMB-008`, `AMB-034`).
- **A stable ubiquitous language.** Keeping vendor concepts at the edge means the model can be spoken, reasoned about, and evolved without any external vendor present, protecting the glossary as the dependency root of the whole planning set.

### Negative

- **An edge must be actively maintained.** Every exchange with an external system must be mediated and translated rather than reached for directly; this is ongoing discipline that a domain reaching straight into a vendor would not require, and it holds only as long as the team upholds it (per [ADR-004](./adr-004-context-integration-model)).
- **Two truths and a gap to reconcile.** Contributors must hold both the domain's authored fact and the external system's settlement outcome in mind and reason about the async gap between them; convergence to external truth (`FIN-11`) and the payout/refund interlock across that gap (`FIN-5`, `CR-3`) are more demanding than a single synchronous call.
- **No external rollback of business facts.** When an external movement fails, the committed business fact is not reversed; correction must be expressed as a new superseding fact (`PAY-6`, `PAY-8`), which is more deliberate than an in-place undo.
- **Deliberate deferral of external detail.** The capture model, charge topology, payout-queue semantics, and channel scope are left open (`AMB-001`..`AMB-008`, `AMB-034`); this is intentional isolation of vendor detail from the domain, but it means those decisions are carried as open questions rather than settled conveniences.
- **The capability/decision line must be defended.** With external systems close at hand, there is a standing temptation to let the system that executes a capability also decide its business terms; the model holds only as long as the domain keeps authoring the decisions and the external systems keep merely executing them.

## Alternatives Considered

### External systems modeled as part of the domain

Treating the payment rail or the notification channel as a bounded context inside the domain, with its own place among the core-and-supporting set.

Rejected because an external system is not a place where Red Cab's business truth is authored — it is a supplier of a capability the domain invokes. Modeling it as a context would put a system the platform does not own inside the ownership map, blurring "who decides this?" for facts (price, split, right-to-operate) that must have a single in-domain owner (`PRC-1`, `INV-1`, `INV-6`), and would contradict the System Context in which those systems sit deliberately across the platform boundary (per [../overview.md](/docs/architecture/overview)). The domain is the 6 core + 2 supporting contexts; external rails and channels are capabilities reached from it, not members of it.

### External systems as authoritative sources of business policy

Letting a rail's configuration or a vendor's representation define the commission split, the price, or the terms of a refund, so the external system is the source of business truth for money.

Rejected because it inverts the money-facts / money-movement seam. The split, price, and refund basis are frozen inside the domain and the rail is *handed* them to execute; the applied split must match the snapshot (`INV-2`), never define it (`PAY-2`, `PAY-4`, `PAY-6`, [ADR-006](./adr-006-immutable-snapshot-strategy)). An external system authoritative for *outcomes* (`FIN-11`) is not the same as an external system authoritative for *policy*; conflating them would make historical money facts depend on a vendor's live state and destroy the auditability that snapshotting exists to guarantee (`INV-1`, `FIN-3`).

### Direct, unmediated reach into external systems from the domain

Letting the aggregates call straight out to external systems and let external vocabulary and failure modes sit inside the order and its invariants.

Rejected because it drags external volatility and vendor concepts into the model the invariants are written against — the same boundary erosion [ADR-004](./adr-004-context-integration-model) forbids on the inward seams, applied outward. It would couple the ubiquitous language to a particular vendor, let a rail failure reach in and threaten a committed fact (`INV-1`, `PAY-2`), and bind request latency to external delivery, defeating the decoupling the asynchronous spine and the Notifications adapter exist to provide (`OPR-8`, `CR-5`, [ADR-007](./adr-007-transaction-and-consistency-boundaries)).

### Synchronous coupling of committed facts to external success

Making a committed business fact depend on the external system succeeding — the transition is not "done" until the rail confirms the charge, the payout, or the message.

Rejected because it binds a committed business fact to the success of work the domain does not control, contradicting the rule that a failed reaction never rolls back the committed transition that emitted it (`FIN-11`, [ADR-007](./adr-007-transaction-and-consistency-boundaries), [ADR-008](./adr-008-domain-event-architecture)). Money movement is deliberately asynchronous and reconciled toward external truth across the gap (`FIN-5`, `FIN-10`, `CR-3`); a failed external outcome must surface as a reconcilable fact for correction, not as an undo of the fact already authored (`PAY-8`). The single place two truths must hold together is the synchronous checkout guard, where a *failed payment yields no Booking and no seat decrement* (`PAY-5`, `FIN-9`) — but that is the domain refusing to author a fact until its own precondition is met, not a committed fact being reversed by a later external failure.

### Binding the domain to a specific vendor

Designing the domain, its language, and its contracts around one external supplier's model, so the domain cannot be spoken or run without that vendor.

Rejected because it forfeits long-term vendor independence for no architectural gain. The architecture deliberately defers external detail (`AMB-001`..`AMB-008`, `AMB-034`) and depends on *capabilities* behind published contracts and an edge, not on a particular supplier, precisely so a rail or channel can be reconfigured or replaced without moving a boundary or touching an invariant (per [../overview.md](/docs/architecture/overview)). Coupling the model to one vendor would turn every future supplier change into a domain change — the opposite of the isolation this decision preserves.

## Related Documents

- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that makes every business truth the property of exactly one in-domain owner, and no external system a context.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the published-contract, identity-only, anti-corruption discipline whose outward application keeps external vocabulary and volatility out of the domain.
- [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy) — the money-facts / money-movement seam and the frozen facts an external rail executes against but never authors or mutates.
- [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries) — the consistency boundaries beyond which external work is reconciled asynchronously, and the rule that a failed reaction never rolls back a committed fact.
- [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture) — the past-tense committed facts on whose asynchronous spine external integration and reconciliation ride.
- [overview.md](/docs/architecture/overview) — top-level architecture, the System Context and External Integrations sections, and the Open Architectural Decisions that isolate external detail from the domain.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, the outbound-adapter role of Notifications, and the `CR-1`–`CR-7` coupling-risk register.
- [payments-architecture.md](/docs/architecture/payments-architecture) — the money-facts / money-movement seam, the async boundaries, and the convergence-to-external-truth invariants (`FIN-1`..`FIN-11`).
- [api-design.md](/docs/architecture/api-design) — how the domain's published surfaces and its outer boundaries are expressed at the platform edge.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, identity-only references, and the snapshot philosophy that keeps business truth inside the domain.
