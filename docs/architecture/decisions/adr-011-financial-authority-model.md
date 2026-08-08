---
title: "ADR-011: Financial Authority Model"
sidebar_label: ADR-011
sidebar_position: 11
description: Architecture decision record 011.
---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## TL;DR

- **Booking** owns money facts (snapshots); **Payments** owns money movement and commission rate configuration.
- Payments reads snapshots read-only; refunds and payouts never recompute from live rates.

## About this document

ADR for the financial authority model (facts vs movement seam).

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial boundaries | [Financial Ownership](/docs/architecture/data-model/financial-boundaries) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context; per [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority), price is computed in exactly one authoritative place and consumed everywhere else as a value contract; per [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy), a Booking freezes the commercial facts it depends on as immutable, write-once truth; per [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries), transactional consistency stops at the context edge and money converges to external truth across the async gap; per [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture), a domain event announces a committed business fact that others may react to but never author; per [ADR-009-external-systems-integration.md](./adr-009-external-systems-integration), external systems supply capabilities but never own the business; and per [ADR-010-identity-and-authorization-architecture.md](./adr-010-identity-and-authorization-architecture), business permissions belong to the context that owns the state they protect. Those decisions establish ownership, integration, snapshots, consistency, events, the outer edge, and authorization — but none of them, on its own, states *why financial authority is divided the way it is*: why one context owns the immutable commercial facts while another owns every financial operation, and why no financial operation may ever rewrite the business truth that produced it. Because commission integrity is the business model and every charge, payout, refund, and reconciliation outcome must be defensible years later, the reasoning behind that division deserves to be recorded explicitly. This ADR records that reasoning; it changes nothing about which context owns money facts, which owns money movement, or how the two collaborate, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), and [../payments-architecture.md](/docs/architecture/payments-architecture).

The philosophical core of the decision is two sentences: **business facts determine financial outcomes; Payments executes those outcomes but never rewrites the facts that produced them.** A Booking's frozen Price Snapshot, Commission Snapshot, and Cancellation Policy Snapshot are the commercial truth of what was agreed, at what split, under what terms — and every charge, payout, refund, and reconciliation action is a *consequence* of that truth, not a re-authoring of it. Everything the architecture asks of financial authority follows from that single distinction between *the fact that money is owed and how it divides* and *the operation that moves the money accordingly*.

The dominant force is that **commission integrity is the business model**, and integrity requires that financial authority have exactly one owner for each kind of truth. The platform earns a commission per booking; the revenue split between Platform and Provider must be frozen, auditable, and never retroactively altered (`INV-1`, `INV-2`, `PAY-2`). That requirement is not a Payments concern alone — it is the strongest force on the whole architecture (per [../overview.md](/docs/architecture/overview), Business drivers). But the split is not a single concept: it has a *fact* dimension ("what was owed, to whom, at what split, at checkout") and a *movement* dimension ("charge the buyer, pay the provider, refund on cancellation, reconcile what actually settled"). Those two dimensions change at different rates, fail in different ways, and involve different actors — which is why the architecture assigns them to different owners rather than folding them into one aggregate or one context.

The second force is that **commercial facts and financial execution have different ownership homes by design**. Booking & Checkout owns money *facts*: at checkout it freezes the **Price Snapshot** and **Commission Snapshot** on the Booking as write-once values, in the same atomic unit as booking creation and seat reservation (`BKG-2`, `CON-1`, `PAY-4`, `INV-1`). Those facts answer "what was agreed?" — they are created at the defining moment and belong to the order aggregate for life. Payments & Payouts owns money *movement and configuration*: the platform **Commission Rate** setting (`PAY-2`), charges, payouts, refunds, and reconciliation with external rails. It reads Booking snapshots; it does not author them (per [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../payments-architecture.md](/docs/architecture/payments-architecture)). Putting the snapshot anywhere but Booking would split one atomic invariant across a context boundary — exactly what [ADR-003](./adr-003-bounded-context-architecture) and [ADR-007](./adr-007-transaction-and-consistency-boundaries) forbid. Binding money movement into Booking would drag external-rail volatility, asynchronous settlement, and admin-facing reconciliation into the order aggregate — the failure mode [ADR-009](./adr-009-external-systems-integration) exists to prevent. The seam is therefore deliberate: **Booking authors the immutable fact; Payments reads the fact and moves the money.**

The third force is that **immutable business facts are the sole basis for every financial operation**, which is what makes financial correctness possible over time. [ADR-005](./adr-005-single-pricing-authority) fixed that price is computed once and the Price Snapshot freezes that authoritative result (`PRC-8`, `PRC-1`); [ADR-006](./adr-006-immutable-snapshot-strategy) fixed that upstream changes never rewrite historical orders and that corrections are *new* facts, never edits of frozen ones (`PAY-6`, `PAY-8`). From those decisions follow the financial invariants already stated in [../payments-architecture.md](/docs/architecture/payments-architecture): every money movement is traceable to exactly one Booking and its snapshot (`FIN-3`); payout and refund amounts derive from the snapshot, never a live rate or edited policy (`FIN-6`, `PAY-2`, `PAY-6`); the identity `gross_amount = net_payout_amount + commission_amount` always holds on snapshotted values (`FIN-1`, `INV-2`); no payout may exceed `net_payout_amount` and no refund may exceed `gross_amount` (`FIN-4`). A charge is for the snapshotted gross; a payout queues on the pre-frozen Net Payout Amount (`LC-6`); a refund is computed from the snapshotted Cancellation Policy and snapshotted gross (`PAY-6`, `PAY-7`). None of these operations re-derives commercial terms — they *apply* terms already committed. If financial operations could recompute price, commission, or refund basis from live configuration, the buyer could be charged or refunded against numbers they never saw, and no historical outcome could be explained — a direct breach of the single pricing authority and the immutable snapshot strategy.

The fourth force is that **financial operations never recompute or rewrite business truth** — they express new movement facts against truth already frozen. Payments moves money strictly against the Booking's snapshots and never authors or mutates them (`PAY-2`, `INV-1`; [domain-models.md](/docs/domain/domain-models) §3.4, §3.5). A payout is a new movement fact in Payments, not an edit to the Booking's Commission Snapshot. A refund is a new movement computed from frozen policy and frozen gross, not a retroactive change to what was agreed (`PAY-6`). The Commission Rate is a Payments-owned setting that applies only to *future* Bookings; changing it does not alter historical snapshots (`PAY-2`). This is the architectural expression of the facts-vs-movement seam: financial execution is downstream of commercial commitment, never upstream of it. It also aligns with [ADR-010](./adr-010-identity-and-authorization-architecture): the right to set the Commission Rate and to move money belongs to Payments because Payments owns that state; Admin exercises it through the same boundary, not by reaching into Booking's frozen facts.

The fifth force is that **charges, payouts, refunds, and reconciliation are derived from committed business facts, not from live policy or external configuration**. A Booking exists only after its defining commercial facts are committed — for the B2C path, after a successful payment result with snapshot freeze and seat reservation as one atomic unit (`BKG-2`, `CON-1`, `PAY-5`, `FIN-9`); for the B2B path, after an accepted Quotation converts and payment is confirmed through the channel that path uses (`LC-11`, `PAY-9`). Financial operations that follow — queuing a payout on completion, executing a refund on cancellation, reconciling a bank-transfer receipt — all react to lifecycle facts that are already true and compute their amounts from snapshots that are already frozen. The payout/refund mutual-exclusion interlock (`FIN-5`, `PAY-8`, `CR-3`) is itself a property of derived operations: the same captured funds must never be both paid out and refunded, but that constraint is enforced across movement facts, not by rewriting the Booking's commercial terms. Reconciliation — converging internal movement state to external settlement truth (`FIN-11`) — likewise preserves trust without changing historical facts: divergence is a reconcilable defect surfaced for operator action, not a silent edit of what was owed or agreed.

The sixth force is that **external payment providers execute financial capabilities rather than determine financial policy**, extending [ADR-009](./adr-009-external-systems-integration) to the money path specifically. The external payment rail is responsible for executing charges, holding funds, transferring the provider's share, and executing refunds — capabilities the domain invokes. The platform is responsible for initiating those operations for amounts and splits already fixed by the snapshot, and for reconciling settlement outcomes back to the correct Booking (`FIN-3`, `INV-2`). The commission applied in a split is required to *match* the snapshotted `commission_amount`, never to *define* it. An external system authoritative for *whether a requested movement occurred* (`FIN-11`) is not authoritative for *what was owed, to whom, or under what refund policy* — those are business facts authored inside the domain before any external system is engaged. Letting the executor of movement also decide policy would invert the seam and make historical financial outcomes depend on a supplier's live state rather than on immutable Booking facts.

The seventh force is that **financial authority reinforces bounded-context ownership** rather than creating a second place where business truth is made. Per [ADR-003](./adr-003-bounded-context-architecture), every concept has exactly one owner; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), collaboration is through published contracts only. The financial model respects both: Booking owns the Commission Snapshot value contract that crosses the boundary; Payments consumes it read-only. Catalog owns price computation; Booking snapshots its result; Payments never recomputes price. Payments owns the Commission Rate configuration and all movement records; Booking never initiates a charge or edits a payout. B2B owns the quotation and bank-transfer instruction vocabulary; Payments owns reconciliation of confirmed receipt (`PAY-9`); Booking owns the order that results. No context holds write access to another's financial or commercial facts — the `CR-2` pricing-leakage and `CR-3` payout/refund-race risks exist precisely because violating that discipline would destroy integrity. Financial authority is not a layer above the contexts; it *is* the ownership map applied to money.

The final force is **long-term financial integrity and auditability**, which the prior ADRs make achievable only when combined. [ADR-005](./adr-005-single-pricing-authority) ensures the snapshot freezes the one authoritative price. [ADR-006](./adr-006-immutable-snapshot-strategy) ensures that frozen basis never moves. [ADR-007](./adr-007-transaction-and-consistency-boundaries) ensures checkout commits facts atomically while movement converges asynchronously without rolling back committed truth. [ADR-008](./adr-008-domain-event-architecture) ensures completion, cancellation, and settlement reactions are choreography over facts already committed, not co-authorship of those facts. Together they yield a model where Admin can oversee all money through the Payments Overview (`FIN-3`), a Provider can defend a payout against the frozen Net Payout Amount, a Tourist's refund can be explained from the snapshotted policy tier, and an auditor can trace every yen to exactly one Booking and its immutable snapshots — because business facts determined the outcomes and Payments executed them without rewriting the record.

## Decision

The financial authority model is fixed as already established:

- **Payments & Payouts is the sole owner of financial operations.** Charges, captures, payouts, refunds, reconciliation with external rails, and the platform-wide **Commission Rate** setting are owned exclusively by Payments & Payouts (`PAY-2`, `FIN-1`..`FIN-11`; [../bounded-contexts.md](/docs/architecture/bounded-contexts) §4). No other context initiates money movement, configures the rate for future bookings, or converges movement state to external settlement truth.
- **Booking & Checkout owns commercial money facts.** The **Price Snapshot**, **Commission Snapshot**, and **Cancellation Policy Snapshot** are frozen on the Booking at checkout as immutable, Booking-owned facts (`INV-1`, `PAY-4`, `PRC-8`). They are authored in the same atomic unit as booking creation and seat reservation (`BKG-2`, `CON-1`) and are the system of record for what was owed, to whom, at what split, under what cancellation terms.
- **Immutable business facts are the basis for every financial operation.** All charges, payouts, and refunds compute from snapshotted values — gross, commission, net payout, and cancellation policy — never from live listing price, live Commission Rate, or live policy (`PAY-6`, `FIN-6`, `LC-6`). The snapshotted `gross_amount = net_payout_amount + commission_amount` identity always holds (`FIN-1`, `INV-2`).
- **Financial operations never recompute or rewrite business truth.** Payments reads the Commission Snapshot and moves money against it; it never authors, edits, or mutates a Booking's frozen facts (`PAY-2`, `INV-1`). Corrections are new movement facts — a refund is a new operation computed from frozen inputs, not an edit of the original charge or snapshot (`PAY-6`, `PAY-8`).
- **Charges, payouts, refunds, and reconciliation derive from committed business facts.** A movement is warranted only after the Booking and its snapshots exist (or, for B2B bank transfer, after Admin confirms receipt per `PAY-9`). Payout queuing reacts to a committed completion fact carrying the frozen Net Payout Amount (`LC-6`); refund computation reacts to a committed cancellation fact and the snapshotted policy (`PAY-6`, `PAY-7`); reconciliation aligns movement records to external settlement outcomes without altering Booking snapshots (`FIN-11`).
- **External payment providers execute capabilities; they do not determine financial policy.** The domain decides that a charge, payout, or refund is warranted and at what snapshotted amounts and split; the external rail executes the request. Settlement truth is authoritative for *outcomes* (`FIN-11`), never for price, split, refund policy, or any other business policy (per [ADR-009](./adr-009-external-systems-integration)).
- **Financial authority reinforces bounded-context ownership.** Each financial concept has one owner: commercial facts in Booking, movement and rate configuration in Payments, price computation in Catalog ([ADR-005](./adr-005-single-pricing-authority)). Contexts integrate through the Commission Snapshot value contract and domain events; no context holds shared write access to another's financial or commercial state (per [ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)).
- **Immutable snapshots make financial correctness possible.** Without write-once Booking facts, no charge, payout, or refund could be tied to a stable basis; with them, every outcome is explainable against numbers that never move ([ADR-006](./adr-006-immutable-snapshot-strategy)).
- **Reconciliation preserves trust without changing historical facts.** When internal movement state and external settlement truth diverge, the defect is surfaced as a reconcilable Payments fact for operator action; the Booking's commercial snapshots and committed lifecycle facts are not rewritten (`FIN-11`, `PAY-8`).
- **The payout/refund interlock holds across derived operations.** For a single Booking's captured funds, payout and refund are mutually exclusive (`FIN-5`, `PAY-8`); the interlock is enforced across asynchronous movement, not by editing order history ([ADR-007](./adr-007-transaction-and-consistency-boundaries), `CR-3`).
- **Financial choreography is event-driven over committed facts.** Completion queues payout, cancellation triggers refund computation, and settlement outcomes are reconciled — each a reaction within Payments' boundary to a fact already committed elsewhere, idempotent and never rolling back the originating transition (`FIN-10`, `FIN-11`; [ADR-008](./adr-008-domain-event-architecture)).

This decision records *why financial authority is owned and exercised this way*; it changes nothing about the owning contexts, the snapshots, the movement invariants, or the integration contracts, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../payments-architecture.md](/docs/architecture/payments-architecture), and [../../business-rules/business-rules.md](/docs/business-rules/invariants). Open decisions that shape movement timing and topology (`AMB-001`..`AMB-008`, `AMB-027`..`AMB-029`) remain in the ambiguity register and are not settled here.

## Consequences

### Positive

- **Commission integrity by construction.** Because commercial facts are frozen at checkout and every movement derives from them, the revenue split is auditable for the life of a Booking and never retroactively altered (`INV-1`, `INV-2`, `PAY-2`).
- **A single answer to "who owns money?"** Commercial truth lives in Booking; movement and rate configuration live in Payments; price computation lives in Catalog — extending the singular-ownership discipline of [ADR-003](./adr-003-bounded-context-architecture) to every financial concept.
- **Financial outcomes explainable years later.** Every charge, payout, and refund traces to exactly one Booking and its immutable snapshots (`FIN-3`), so a Provider, Tourist, Admin, or auditor can reconstruct any outcome from frozen evidence, not from reconstructed live state.
- **External volatility contained.** Money movement's asynchronous failure model stays in Payments and at the external edge; the order aggregate holds only frozen facts, reinforcing [ADR-009](./adr-009-external-systems-integration) and [ADR-006](./adr-006-immutable-snapshot-strategy).
- **Pricing and snapshot guarantees compose.** The single pricing authority's result is what the snapshot freezes ([ADR-005](./adr-005-single-pricing-authority)); the snapshot is what every movement reads ([ADR-006](./adr-006-immutable-snapshot-strategy)) — a closed chain from display to charge to payout to refund.
- **Corrections without loss of history.** Refunds and payout reversals are new movement facts computed from frozen inputs, so the original agreement and every subsequent adjustment both remain visible (`PAY-6`, `PAY-8`).
- **Reconciliation that preserves trust.** Divergence between internal movement state and external settlement truth surfaces for action without rewriting Booking history (`FIN-11`), so operational recovery does not corrupt the audit trail.
- **Authorization aligned with ownership.** The right to set the Commission Rate and to move money belongs to Payments; the right to freeze commercial terms belongs to Booking — consistent with [ADR-010](./adr-010-identity-and-authorization-architecture)'s rule that permissions live with the state they protect.
- **Evolution without moving financial boundaries.** Deferred movement decisions (`AMB-001`..`AMB-008`) can resolve either way without changing who owns facts versus movement, because the authority model is defined independently of external topology.

### Negative

- **Two truths to hold in mind.** Contributors must distinguish Booking-owned commercial facts from Payments-owned movement facts and, for reconciliation, from external settlement outcomes — more cognitive load than a single "money module" would suggest, though a single module is exactly what the architecture rejects.
- **No retroactive fix by editing snapshots.** A mistake in a past order cannot be corrected by changing frozen facts; correction must flow through new movement facts (`PAY-6`, `PAY-8`), which is more deliberate than an in-place edit.
- **Strict discipline against live recomputation.** Payments and refund flows must never reach for the current Commission Rate or current cancellation policy even when convenient (`PAY-2`, `PAY-6`); the model holds only as long as the team upholds the read-snapshot-only rule.
- **Async interlock complexity.** The payout/refund mutual-exclusion invariant must hold across the gap between committed lifecycle facts and asynchronous movement (`FIN-5`, `CR-3`), requiring careful choreography rather than a single shared transaction ([ADR-007](./adr-007-transaction-and-consistency-boundaries)).
- **Open movement detail carried as ambiguity.** Authorization-vs-capture, charge topology, payout-queue semantics, B2B pre-payment lifecycle, and off-platform settlement remain unresolved (`AMB-001`..`AMB-008`, `AMB-027`..`AMB-029`); the authority model is settled, but several movement shapes are not.
- **The facts/movement seam must be defended.** There is constant temptation to let Payments recompute terms, let Booking initiate payouts, or let an external rail define the split; the integrity model holds only while business facts remain the sole basis for outcomes.

## Alternatives Considered

### Booking owns both commercial facts and financial operations

Consolidating charges, payouts, refunds, and reconciliation into Booking & Checkout alongside the frozen snapshots.

Rejected because money movement has a different change cadence and failure model than the order aggregate — it is asynchronous, external-rail-coupled, and must converge to settlement truth across a gap (`FIN-11`) — and binding it into Booking would drag that volatility into the immutable order fact (per [../bounded-contexts.md](/docs/architecture/bounded-contexts), "Why Payments owns money movement while Booking owns money facts"). It would also violate singular ownership of movement configuration: the Commission Rate setting (`PAY-2`) and reconciliation records belong with the operations they govern, not with the order that frozen them. The atomic checkout unit requires Booking to commit commercial facts; it does not require Booking to own every subsequent financial reaction.

### Payments owns both commercial facts and financial operations

Letting Payments author the Price Snapshot, Commission Snapshot, and all movement from one context.

Rejected because the revenue split is frozen in the same atomic unit as booking creation and seat reservation (`BKG-2`, `CON-1`, `INV-1`). If Payments authored the snapshots, the defining commercial facts would be created outside the order aggregate that owns the Booking lifecycle, splitting one invariant across a boundary [ADR-007](./adr-007-transaction-and-consistency-boundaries) forbids except at the single documented checkout seam. Payments' role is to read the Commission Snapshot and move money; authoring it would merge facts and movement and let financial operations define commercial truth rather than execute against it.

### Live recomputation of financial amounts

Computing charges, payouts, and refunds from current listing price, current Commission Rate, or current cancellation policy at the time of the operation.

Rejected because it destroys the guarantees [ADR-005](./adr-005-single-pricing-authority) and [ADR-006](./adr-006-immutable-snapshot-strategy) exist to provide. A refund computed from today's policy is a refund against terms the Tourist never agreed to (`PAY-6`). A payout computed from today's rate is a payout against a split that was never frozen (`PAY-2`, `FIN-6`). The `gross = net + commission` identity (`INV-2`) would hold only against numbers that could change after the fact. Live recomputation makes auditability impossible and is explicitly forbidden by `FIN-6` and `PAY-6`.

### External payment provider as source of financial policy

Letting the external rail's configuration or settlement representation define the commission split, the charge amount, or the refund basis.

Rejected because it inverts the facts-vs-movement seam and contradicts [ADR-009](./adr-009-external-systems-integration). The split and amounts are frozen inside the domain; the rail is handed them to execute, and the applied split must match the snapshot (`INV-2`), never define it. An external system authoritative for settlement *outcomes* (`FIN-11`) is not authoritative for commercial *policy*; conflating the two would make historical money facts depend on a supplier's live state.

### Financial corrections by editing frozen snapshots

Allowing Admin or Payments to retroactively change a Booking's Price Snapshot, Commission Snapshot, or Cancellation Policy Snapshot to "fix" a financial discrepancy.

Rejected because editable snapshots are not a historical record. `INV-1` and `BKG-8` require immutability for the life of the Booking; [ADR-006](./adr-006-immutable-snapshot-strategy) requires corrections as new facts. Editing a snapshot would rewrite what was agreed, break traceability (`FIN-3`), and let financial operations rewrite business truth — the exact failure this decision exists to prevent. Discrepancies are resolved through new movement facts and reconciliation, not through mutation of frozen commercial terms.

### Shared financial model with no facts/movement seam

A common money concept that Booking and Payments both read and write, so commercial terms and movement state stay "in sync" through shared mutation.

Rejected because shared write-access is the ownership ambiguity the whole architecture forbids ([ADR-003](./adr-003-bounded-context-architecture), [ADR-004](./adr-004-context-integration-model)). More than one modifier of snapshots or movement records would make `INV-1`, `FIN-3`, and `FIN-5` unenforceable and recreate the `CR-2` and `CR-3` coupling risks as hidden coupling rather than published contracts. Financial integrity is achieved by singular ownership and read-only consumption across the seam, not by a commonly-mutated model.

## Related Documents

- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that places commercial facts in Booking and financial operations in Payments.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the published-contract integration model by which the Commission Snapshot crosses boundaries as a read-only value contract.
- [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority) — the single pricing authority whose computed result the Price Snapshot freezes and whose output every downstream financial amount must respect.
- [ADR-006-immutable-snapshot-strategy.md](./adr-006-immutable-snapshot-strategy) — the write-once snapshot strategy that makes Booking-owned facts the permanent basis for all financial operations.
- [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries) — the consistency boundaries within which commercial facts commit atomically and across which money movement reconciles asynchronously.
- [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture) — the committed-fact choreography by which completion, cancellation, and settlement drive financial reactions without co-authorship of business truth.
- [ADR-009-external-systems-integration.md](./adr-009-external-systems-integration) — the capability-versus-decision distinction that keeps external payment rails executors of movement, not authors of financial policy.
- [ADR-010-identity-and-authorization-architecture.md](./adr-010-identity-and-authorization-architecture) — the per-owner authorization model that places Commission Rate and money-movement authority in Payments.
- [overview.md](/docs/architecture/overview) — top-level architecture, the Money Facts vs Money Movement principle, and commission integrity as a business driver.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, the facts-vs-movement rationale, the Commission Snapshot integration contract, and the `CR-2`–`CR-3` coupling-risk register.
- [payments-architecture.md](/docs/architecture/payments-architecture) — the money-facts / money-movement seam, financial invariants (`FIN-1`..`FIN-11`), and async boundaries.
- [api-design.md](/docs/architecture/api-design) — how financial ownership boundaries are expressed at the platform edge.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership of Booking and Payments, the snapshot philosophy, and why payouts cannot mutate Bookings.
