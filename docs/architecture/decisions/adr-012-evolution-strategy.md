---
title: "ADR-012: Evolution Strategy"
sidebar_label: ADR-012
sidebar_position: 12
description: Architecture decision record 012.
---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- Architecture evolves **within** fixed context boundaries — additive contracts, new facts not edits, events for new reactions.
- Extraction to separate deployables only against a **documented fitness function**, preserving ownership and contracts.

## About this document

ADR for long-term evolution strategy without redesigning settled decisions.

| Topic | Document |
| --- | --- |
| Overview | [Architecture Overview](/docs/architecture/overview) |
| All ADRs | [Architecture Decisions](/docs/architecture/decisions) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## Status

Accepted

## Context

Per [ADR-001-modular-monolith.md](./adr-001-modular-monolith), Red Cab is one deployable over one database, with in-process integration and a single deliberate shared-transaction seam; per [ADR-002-technology-stack.md](./adr-002-technology-stack), the chosen stack serves the domain model rather than defining it; per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept has exactly one owning context inside 6 core + 2 supporting bounded contexts; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts — commands, queries, and domain events — and identity-only references; per [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority), price is computed in exactly one authoritative place and consumed everywhere else as a value contract; per [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy), a Booking freezes the commercial facts it depends on as immutable, write-once truth and corrections are new facts, never edits; per [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries), transactional consistency stops at the context edge and cross-context collaboration is choreography, not one shared transaction; per [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture), a domain event announces a committed business fact that others may react to but never author; per [ADR-009-external-systems-integration.md](./adr-009-external-systems-integration), external systems supply capabilities but never own the business; per [ADR-010-identity-and-authorization-architecture.md](./adr-010-identity-and-authorization-architecture), business permissions belong to the context that owns the state they protect; and per [ADR-011-financial-authority-model.md](./adr-011-financial-authority-model), business facts determine financial outcomes and Payments executes those outcomes but never rewrites the facts that produced them. Those eleven decisions together constitute a complete, frozen architecture — ownership, integration, snapshots, consistency, events, the outer edge, authorization, and financial authority. What none of them, taken as a series, states in one place is *why the whole is designed to grow without being redesigned* — why the architecture treats evolution as a discipline of extension and preservation rather than as a recurring opportunity to redraw boundaries, reassign ownership, or rewrite history. Because every future capability must fit inside this frozen shape, and because the temptation to shortcut that shape for speed is constant, the reasoning that makes long-term growth safe deserves to be recorded explicitly as the architectural conclusion of the series. This ADR records that reasoning; it changes nothing about the contexts, contracts, invariants, seams, or packaging already locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), and the rest of the architecture set.

The philosophical core of the decision is two sentences: **architectural evolution extends the system through bounded contexts and published contracts; it never rewrites established business truth or redraws ownership for convenience.** Growth is not a license to revisit what has already been decided — it is the exercise of adding capability *within* the ownership map, *across* the published surfaces, and *alongside* the immutable record of what already happened. Everything the architecture asks of evolution follows from that single distinction between *extending what is true now* and *modifying what was true then*.

The dominant force is that **the architecture is complete and intentionally frozen at the decision level**. The bounded-context map, the integration model, the snapshot strategy, the consistency boundaries, the event spine, the external edge, the authorization posture, and the financial authority model are not provisional sketches awaiting validation in code — they are the settled shape of the domain. Open questions in the ambiguity register (`AMB-001`..`AMB-035`) refine value objects, lifecycle detail, external-rail topology, and contract contents *within* a single owning context; they do not move aggregate or context boundaries (per [../overview.md](/docs/architecture/overview), Open Architectural Decisions). Evolution therefore means resolving those open items, adding behaviors behind existing contracts, and deepening capability inside existing owners — never replacing the decisions ADR-001 through ADR-011 already recorded.

The second force is that **bounded-context ownership is the unit of safe change**. Per [ADR-003](./adr-003-bounded-context-architecture), capabilities evolve on independent axes — corporate quotation toward PO numbers and consolidated invoicing, Payments toward external settlement truth, Reviews at its own cadence, verification toward regulatory requirements — precisely because each axis has a single owner whose invariants it alone upholds (`INV-1`, `INV-3`, `INV-5`, `INV-6`, `PRC-1`). A change scoped to one context affects only that context's internals plus the contracts it publishes; it does not force a sibling context to change unless that sibling *chooses* to consume a new contract version. This is what "independent evolution within the monolith" means in practice: the deployable ships as one unit, but responsibility changes one owner at a time.

The third force is that **published contracts are the only legitimate seams across which change propagates**. [ADR-004](./adr-004-context-integration-model) fixed that contexts integrate through commands, queries, domain events, and named value contracts — never through shared mutable state, never through cross-context table access, never through reach-in. That discipline is also the evolution discipline: a consumer depends on a contract's stability, and an owner evolves its internals additively behind that contract so ripple effects stay bounded (`CR-6`). The Price Breakdown, the Commission Snapshot, the Provider Status read, the authenticated principal (`principal`, `role`, `language`), and the past-tense domain-event catalog are commitments; extending them is permitted, breaking them is not. Convenience coupling — reading another context's internals because they share a process, or duplicating a calculation because it is faster — is forbidden not only at build time but at every subsequent change, because it is precisely how an architecture erodes one shortcut at a time.

The fourth force is that **immutable business history is the non-negotiable floor beneath all growth**. [ADR-006](./adr-006-immutable-snapshot-strategy) established that upstream truth legitimately evolves while historical truth must not: Catalog may reprice, Payments may change the Commission Rate for future bookings, listings may pause or unlist — and none of that may rewrite a Booking's frozen Price, Commission, or Cancellation Policy snapshots (`INV-1`, `BKG-8`, `PAY-2`, `INV-11`). Evolution of live configuration and evolution of historical record are therefore two different activities governed by two different rules. Any new capability that touches money, refunds, audits, or disputes must respect the frozen basis; any correction must be expressed as a new fact — a refund, a reconcilable movement defect, a superseding transition — never as an edit of what was agreed (`PAY-6`, `PAY-8`, `FIN-3`). The architecture grows by adding new facts, not by revising old ones.

The fifth force is that **transactional and consistency boundaries define where strong change ends and eventual change begins**, and those boundaries are drawn for the business, not for today's packaging. [ADR-007](./adr-007-transaction-and-consistency-boundaries) fixed that an invariant is protected only by the context that owns the state behind it, that the atomic checkout unit is the sole deliberate cross-context shared transaction (`CR-1`, `CON-1`), and that everything else — payout queuing, review eligibility, notification fan-out, external settlement convergence — is eventual choreography (`FIN-10`, `FIN-11`, `CR-3`, `CR-5`). Because those boundaries are business decisions, they survive packaging changes: if a context ever graduates to its own deployable against a documented fitness function, only the one documented seam requires redesign; every already-eventual collaboration keeps working unchanged. Evolution of deployment topology is therefore subordinate to evolution of domain capability — the business architecture does not move when the packaging does.

The sixth force is that **event-driven collaboration is how the architecture scales behavior without scaling coupling**. [ADR-008](./adr-008-domain-event-architecture) fixed that events are past-tense facts, not requests; that a fact leaves its owner but ownership never does; and that consumers may be added, removed, or changed without the emitter changing. This is the mechanism by which new reactions — a new notification channel, a new reconciliation step, a new downstream report — attach to existing committed transitions without modifying the transitions themselves. Extension through events is the primary way the system grows in breadth while keeping depth — the invariants inside each aggregate — untouched.

The seventh force is that **external capability isolation keeps vendor and channel change from becoming domain change**. [ADR-009](./adr-009-external-systems-integration) fixed that external systems execute capabilities, never author business policy; that vendor concepts stay at the anti-corruption edge; and that a rail or channel can be reconfigured or replaced without moving a boundary or touching an invariant (`AMB-001`..`AMB-008`, `AMB-034`). The same principle extends inward: Identity establishes who acts but never decides business authority ([ADR-010](./adr-010-identity-and-authorization-architecture)); Payments moves money against frozen facts but never rewrites them ([ADR-011](./adr-011-financial-authority-model)). Evolution of suppliers, authentication methods, or movement topology is deliberately isolated from evolution of ownership and truth.

The eighth force is that **modular monolith first is an evolution strategy, not merely a starting posture**. [ADR-001](./adr-001-modular-monolith) chose one deployable and one database because the domain's strongest invariants — atomic checkout, singular pricing authority, snapshot integrity — are best upheld in-process at current scale and team size. The modular monolith is not a promise to stay monolithic forever; it is a promise to extract only when a documented fitness function — a business need such as independent scaling or a dedicated search engine — justifies the cost, never when a technology preference does (per [../overview.md](/docs/architecture/overview), Modular Monolith First; [../bounded-contexts.md](/docs/architecture/bounded-contexts), Search rationale). Extraction preserves the contracts and ownership map; it changes only how a single owner's published surface is reached. Premature distribution would fracture the ownership discipline the whole series exists to establish.

The final force is that **architectural integrity is preserved by minimizing ripple effects**. Every prior ADR contributes a constraint on how change may spread: singular ownership prevents duplicated logic from drifting (`CR-2`); snapshots prevent upstream edits from corrupting history; consistency boundaries prevent one context's failure from rolling back another's committed work; events prevent emitters from depending on consumers; the external edge prevents vendor volatility from reaching aggregates; local authorization prevents Identity from becoming a god-context (`CR-6`); the facts/movement seam prevents financial operations from redefining commercial truth (`CR-3`). Taken together, these constraints mean that a well-scoped change stays inside one owner, crosses only published contracts, adds rather than edits historical facts, and leaves every other ADR's decision intact. That is the architecture's definition of safe evolution: **extension rather than modification of established business truth**.

## Decision

The evolution strategy is fixed as already established:

- **The architecture evolves through bounded contexts, not around them.** Every new capability belongs to exactly one owning context; "who may change this?" always has one answer, and growth is scoped to that owner plus the contracts it publishes (per [ADR-003](./adr-003-bounded-context-architecture)).
- **The architecture evolves through published contracts, not through shared state.** Commands, queries, domain events, and value contracts are the only surfaces across which change propagates; contracts are extended additively and kept stable for consumers (`CR-6`; per [ADR-004](./adr-004-context-integration-model)).
- **The architecture evolves through extension, not modification of business truth.** Live configuration may change in its owning context for future bookings; historical facts — especially Booking snapshots and committed lifecycle transitions — are immutable for life, and corrections are new facts, never edits (`INV-1`, `BKG-8`, `PAY-6`, `PAY-8`; per [ADR-006](./adr-006-immutable-snapshot-strategy)).
- **Business invariants are preserved, not renegotiated.** Price is computed in exactly one place (`PRC-1`); inventory is guarded by one owner (`INV-3`); the revenue split is frozen at checkout (`INV-1`, `INV-2`); review eligibility requires a completed booking (`INV-5`); right-to-operate is decided in one place (`INV-6`, `INV-7`); the payout/refund interlock holds across derived operations (`FIN-5`, `PAY-8`, `CR-3`). No evolution path may relax these invariants; open ambiguity items resolve within them, not against them.
- **Ownership is preserved, not shared for convenience.** No concept acquires a second owner; no context holds write access to another's state; collaboration remains read-only consumption across seams (per [ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model), [ADR-011](./adr-011-financial-authority-model)).
- **Immutable history is preserved, not rewritten.** Snapshots, committed transitions, and the audit trail they support are the permanent record; upstream evolution is permitted precisely because historical orders are frozen (`BKG-8`, `PAY-2`, `INV-11`).
- **Integration boundaries are preserved, not bypassed.** Cross-context effects are expressed through contracts and past-tense events, never through direct writes, live aggregate references, or disguised cascades (`CR-4`, `FIN-11`; per [ADR-004](./adr-004-context-integration-model), [ADR-008](./adr-008-domain-event-architecture)).
- **Architectural consistency is preserved across packaging choices.** Transactional and consistency boundaries are defined by business need, not by current deployment; the single shared-transaction seam (`CR-1`) is singular and documented; eventual collaboration remains eventual if packaging changes (per [ADR-007](./adr-007-transaction-and-consistency-boundaries)).
- **External systems remain outside the domain.** Rails, channels, and identity suppliers may change; business truth, ownership, and invariants do not move with them (per [ADR-009](./adr-009-external-systems-integration), [ADR-010](./adr-010-identity-and-authorization-architecture)).
- **Financial authority boundaries are preserved.** Commercial facts stay in Booking; movement and rate configuration stay in Payments; price computation stays in Catalog; financial evolution adds movement facts and configuration changes for the future, never retroactive edits to snapshots (`PAY-2`, `FIN-3`, `FIN-6`; per [ADR-005](./adr-005-single-pricing-authority), [ADR-011](./adr-011-financial-authority-model)).
- **Modular monolith first; extraction only by documented fitness.** The system remains one deployable over one database until a business need — not a technology preference — satisfies a documented fitness function; any extraction preserves exactly one authoritative owner per concept and the published contracts between owners (per [ADR-001](./adr-001-modular-monolith), [../overview.md](/docs/architecture/overview)).
- **Architectural changes minimize ripple effects.** A change is successful when it is contained within one owner, crosses only stable contracts, adds rather than edits historical facts, and leaves every prior ADR's decision intact.

This decision records *why the architecture was designed to evolve safely without redesign*; it changes nothing about the contexts, contracts, invariants, seams, or packaging already locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../../domain/domain-models.md](/docs/domain/domain-models), and [../../business-rules/business-rules.md](/docs/business-rules/invariants). Open ambiguity items (`AMB-001`..`AMB-035`) remain in the register and are resolved within this strategy, not by moving boundaries or rewriting history.

## Consequences

### Positive

- **Long-term maintainability by construction.** Because every concept has one owner and every cross-context dependency is a named contract, a contributor can locate where a change belongs and predict what it may affect without re-learning the whole system on every task (per [ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)).
- **Reduced architectural erosion.** The forbidden shortcuts — shared ownership, live recomputation, cross-context writes, editable snapshots, vendor concepts in the ubiquitous language — are the same shortcuts that would erode the series' decisions; naming evolution as extension makes those failures visible early (`CR-2`, `CR-3`, `CR-4`, `CR-6`).
- **Future growth without redesign.** Capabilities on independent axes — corporate documents, payment topology, review moderation, notification channels, discovery — deepen inside their owners behind stable contracts, so the frozen architecture accommodates breadth without redrawing the map (per [../overview.md](/docs/architecture/overview), Open Architectural Decisions).
- **Preserved business correctness over time.** Immutable snapshots and correction-as-new-fact ensure that what a Tourist agreed to, what a Provider was owed, and what an auditor can reconstruct remain stable even as live configuration evolves (`INV-1`, `INV-2`, `FIN-3`, `PAY-6`).
- **Protected prior architectural decisions.** ADR-001 through ADR-011 remain the authoritative reasoning; evolution does not reopen settled questions about ownership, integration, snapshots, consistency, events, the outer edge, authorization, or financial authority — it applies them.
- **Minimized coupling as the system grows.** Published contracts and past-tense events let new consumers attach to existing facts without modifying emitters, keeping the coupling-risk register (`CR-1`–`CR-7`) bounded rather than expanded with each feature (per [ADR-008](./adr-008-domain-event-architecture)).
- **Incremental, reversible packaging evolution.** Because consistency boundaries are business-defined, a future extraction disturbs only the one documented seam; the domain model, contracts, and invariants require no wholesale revision (per [ADR-007](./adr-007-transaction-and-consistency-boundaries)).
- **Vendor and channel independence preserved.** External detail deferred in the ambiguity register can resolve either way without moving a boundary, because capabilities sit behind an edge and business truth stays inside the domain (`AMB-001`..`AMB-008`, `AMB-034`; per [ADR-009](./adr-009-external-systems-integration)).
- **A coherent conclusion to the ADR series.** This decision states explicitly what the prior eleven decisions already implied together: the architecture is complete, frozen at the decision level, and designed to grow by honoring its own constraints.

### Negative

- **Sustained architectural discipline required.** Boundaries are not enforced by distribution; every change must be evaluated against ownership, contracts, and invariants — a cost that persists for the life of the system, not only at initial design (per [ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)).
- **Shortcuts must be actively resisted.** Reaching across a boundary, recomputing price locally, reading live policy for a refund, letting an external rail define a split, or treating a Role as sufficient authorization are faster in the moment and forbidden in the architecture; the evolution strategy holds only while the team refuses those conveniences (`CR-2`, `PAY-6`, `INV-5`, `INV-6`).
- **Ownership must be respected even under pressure.** A urgent feature cannot be "owned by whoever implements it"; it must be placed with the context that already holds the state and invariants, which may mean more deliberate contract design than a shared-model shortcut would suggest.
- **Convenience coupling is always available and always dangerous.** Because all contexts share one process and one database, the path of least resistance — direct reach-in, shared table access, another cross-context transaction — is always one undisciplined choice away (`CR-1`, `CR-4`).
- **Boundaries must be preserved, not reinterpreted.** The single shared-transaction seam, the facts/movement seam, the identity/business-authority seam, and the domain/external edge each exist for a reason; treating them as flexible when convenient would undo the series' work (`CR-1`, `CR-3`, `CR-6`).
- **Additional cognitive load.** Contributors must hold the ownership map, the two-truths distinction between live configuration and frozen history, the sync-vs-async rule of thumb, and the capability/decision distinction at the outer edge — more to keep in mind than a system without these constraints, though a system without them is exactly what the architecture rejects.
- **Contract stability is ongoing work.** Published contracts must be evolved additively; consumers depend on them; the universal identity contract in particular ripples widest (`CR-6`). Growth is never free of contract stewardship.
- **Open ambiguity is carried forward deliberately.** Many movement, lifecycle, and external-topology questions remain unresolved (`AMB-001`..`AMB-035`); the evolution strategy permits their resolution but does not eliminate the need to track and decide them within the frozen boundaries.

## Alternatives Considered

### Continuous architectural redesign

Treating each major feature or growth phase as an opportunity to revisit bounded contexts, redraw ownership, or renegotiate invariants.

Rejected because the architecture is intentionally complete and frozen at the decision level. Redesigning ownership would reopen questions ADR-003 through ADR-011 already settled — where price lives, where money facts live, where consistency stops, what an event means, where authorization is evaluated — and would make every prior ADR provisional rather than authoritative. The ambiguity register exists precisely so detail can evolve *within* fixed boundaries; continuous redesign would replace that discipline with recurring boundary churn.

### Technology-driven restructuring

Splitting or reorganizing the system because a new framework, datastore, or deployment model is preferred, rather than because a documented fitness function tied to business need is satisfied.

Rejected because [ADR-001](./adr-001-modular-monolith) and [ADR-002](./adr-002-technology-stack) subordinate packaging and stack to the domain model, not the reverse. Premature extraction or re-platforming would threaten the atomic checkout unit (`CON-1`, `CR-1`), impose coordination cost disproportionate to team size, and risk duplicating authoritative calculations (`CR-2`) or splitting invariants across network boundaries (`INV-1`, `INV-3`). A context graduates to its own deployable only against a documented fitness function, never speculatively.

### Shared ownership for convenience

Assigning a concept to more than one context, or letting multiple contexts write the same state, so a cross-boundary feature can be implemented without contract design.

Rejected because shared write-access is the ownership ambiguity the whole architecture exists to prevent (per [ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)). It would make `PRC-1`, `INV-1`, `INV-3`, and `FIN-3` unenforceable, recreate `CR-2` and `CR-3` as hidden coupling, and defeat independent evolution by welding contexts that change for different reasons into one entangled model.

### Extracting services prematurely

Distributing contexts across network boundaries before load, team, or business patterns justify the operational and consistency cost.

Rejected because it conflicts with modular monolith first (per [ADR-001](./adr-001-modular-monolith)): the one shared-transaction seam would become a distributed protocol, threatening the never-overbook invariant (`INV-3`), and every synchronous contract would become a versioned network dependency. Logical bounded contexts already provide separation in-process; distribution is a packaging change justified by fitness, not a default evolution path.

### Bypassing published contracts

Integrating contexts through direct internal access, shared models, or cross-context writes because published commands, queries, and events feel slower to design.

Rejected because bypassing contracts is boundary erosion by another name. It destroys the low coupling [ADR-004](./adr-004-context-integration-model) exists to provide, makes dependencies invisible to review, and turns every internal change into a potential cross-context breakage — the opposite of minimizing ripple effects. The one permitted exception remains the guarded co-transactional seat-reservation command at checkout (`CR-1`), singular and documented; it is not a precedent for general bypass.

### Evolving through shared databases or live references

Letting downstream contexts read and depend on another context's mutable state directly, or keep historical orders "in sync" with live upstream configuration through shared storage.

Rejected because shared table access and live references are forbidden integration styles (per [ADR-004](./adr-004-context-integration-model)) and because live dependency destroys historical truth (per [ADR-006](./adr-006-immutable-snapshot-strategy)). A Booking that read live price or policy would inherit every future edit; keeping orders in sync with present listing state violates `BKG-8` and `INV-11`. Evolution of upstream configuration is permitted precisely because historical facts are frozen, not because the two are reconciled into one mutable view.

## Related Documents

- [ADR-001-modular-monolith.md](./adr-001-modular-monolith) — the modular monolith first posture and the packaging inside which bounded contexts evolve in-process until a documented fitness function justifies extraction.
- [ADR-002-technology-stack.md](./adr-002-technology-stack) — the stack choice subordinated to the domain model, not the driver of architectural change.
- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that makes each context the unit of safe change and independent evolution.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the published-contract integration model through which change propagates additively and with bounded ripple.
- [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority) — the single pricing authority that any future extraction must preserve as exactly one calculation point.
- [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy) — the extension-not-modification rule for historical business truth and correction-as-new-fact.
- [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries) — the business-defined consistency boundaries that survive packaging change and confine strong consistency to where it is genuinely required.
- [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture) — the past-tense event spine by which new reactions attach without modifying committed facts or coupling emitters to consumers.
- [ADR-009-external-systems-integration.md](./adr-009-external-systems-integration) — the capability-versus-decision distinction that keeps vendor and channel evolution outside the domain.
- [ADR-010-identity-and-authorization-architecture.md](./adr-010-identity-and-authorization-architecture) — the identity/business-authority separation that lets authentication evolve without moving authorization boundaries.
- [ADR-011-financial-authority-model.md](./adr-011-financial-authority-model) — the facts/movement seam that financial evolution must preserve so commercial truth is never rewritten by money operations.
- [overview.md](/docs/architecture/overview) — top-level architecture, the Modular Monolith First and Snapshot Pattern principles, and the Open Architectural Decisions note that ambiguity resolves within fixed boundaries.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, integration contracts, the domain-events catalog, the Search extraction fitness rationale, and the `CR-1`–`CR-7` coupling-risk register.
- [api-design.md](/docs/architecture/api-design) — how ownership boundaries and published contracts are expressed at the platform edge.
- [payments-architecture.md](/docs/architecture/payments-architecture) — the money-facts / money-movement seam and financial invariants (`FIN-1`..`FIN-11`) that evolution must uphold.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, snapshot philosophy, consistency boundaries, and identity-only reference rules.
- [business-rules.md](/docs/business-rules/invariants) — authoritative invariants (`INV-`, `PRC-`, `PAY-`, `BKG-`, `CON-`, `LC-`, `OPR-`) that evolution may not override.
- [glossary.md](/docs/business-rules/glossary) — the ubiquitous language that evolution extends without importing vendor or convenience terms.
- [functional-requirements.md](/docs/requirements/functional-requirements) — observable behaviors that run on the frozen architecture without redefining it.
- [non-functional-requirements.md](/docs/requirements/non-functional-requirements) — quality constraints, including security and performance, that evolution must continue to satisfy.
