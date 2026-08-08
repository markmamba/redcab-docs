---
title: "ADR-006: Immutable Snapshot Strategy"
sidebar_label: ADR-006
sidebar_position: 6
description: Architecture decision record 006.
---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## TL;DR

- Freeze Price, Commission, and Cancellation Policy snapshots at checkout; **never edit** them for the life of a Booking.
- Corrections are new facts (refunds, movements), not edits to frozen snapshots.

## About this document

ADR for immutable snapshot strategy (`INV-1`, `BKG-8`).

| Topic | Document |
| --- | --- |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |
| Payments | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts and identity-only references; and per [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority), price is computed in exactly one authoritative place. Those decisions answer *how ownership is divided, how contexts cooperate, and where price is made*. They do not by themselves explain *why a Booking freezes the commercial facts it depends on rather than reading them live from upstream*. Snapshotting is the single mechanism that most directly protects the platform's financial and legal correctness, so the reasoning behind it deserves to be recorded on its own. This ADR records that reasoning; it changes nothing about which facts are snapshotted, who owns them, or when they are frozen.

The dominant architectural force is that **history must never change**. A Booking is a commercial and legal act — a buyer agreed to specific terms, at a specific price, under a specific cancellation policy, with a specific revenue split — and that act happened at a fixed moment in time. The commercial truth of a completed transaction is a fact about the past. Any architecture that lets the past be rewritten by the present has, by construction, no reliable history: the record of what a Tourist agreed to and paid could silently become something else after the fact. The whole platform's honesty rests on the guarantee that a Booking's terms are frozen once and never edited (`INV-1`, `BKG-8`).

The second force is that **upstream truth legitimately and continuously evolves**. Everything a Booking depends on is *mutable by design* in its owning context: a Provider's listing price is reconfigured for a new season, a listing's cancellation policy is revised, the platform-wide Commission Rate is changed, seasonal overrides come and go, extra charges are added, and listings themselves move through their lifecycle from `Published` to `Paused` to `Unlisted` (`LC-10`, `PRC-2`..`PRC-6`, `PAY-2`). This is correct behavior — Catalog & Inventory owns pricing configuration and must let it change (per [ADR-005](./adr-005-single-pricing-authority)), and Payments owns the Commission Rate and must let it change. But the moment these things are allowed to change, the terms of a historical order become a moving target if that order merely *points at* live upstream state. Evolving upstream truth and unchanging historical truth are in direct tension, and the architecture must resolve it in favor of history.

The third force is that **money facts must remain explainable years later**. Commission integrity is the business model: the split between Platform and Provider must be frozen, auditable, and never retroactively altered (`INV-1`, `INV-2`, `PAY-2`). Every downstream money outcome depends on this — a payout carries a pre-frozen Net Payout Amount (`LC-6`), and a refund is computed from the Booking's snapshotted gross and its snapshotted Cancellation Policy, never a live rate or a live policy (`PAY-6`, `PAY-7`). A charge, payout, or refund must be defensible to a Provider, a Corporate Client, an Admin, or an auditor long after the transaction closed — "this is exactly what was agreed, and here is the frozen basis for every yen." If the basis for those computations could shift because a listing was later repriced or the Commission Rate was later changed, no historical money movement could be reconstructed or defended, and the `gross = net + commission` identity (`INV-2`) would hold only against numbers that no longer exist.

The fourth force is **legal and commercial correctness**. A Booking, and in the corporate channel a Quotation that converts into one, is a binding commercial arrangement — in the B2B path attended by formal documents that itemize line items and consumption tax (`PAY-10`). The terms captured at agreement are the terms that were legally offered and accepted. Rewriting them after the fact would not merely be a data defect; it would misrepresent a commercial commitment. Historical bookings must remain legally and financially correct in perpetuity, independent of every later change to the offer that produced them.

These forces converge on a single structural conclusion the architecture already reached: a downstream context must depend on **immutable historical facts it owns**, not on **mutable upstream state it happens to reference**. A Booking that read price, commission, or policy live from Catalog and Payments would inherit every future edit to those sources, so a "look" at a past order would return today's terms rather than the terms that were actually agreed. The only way to make a Booking self-contained, auditable, and stable for life is for it to *capture* the facts it needs at the defining moment and thereafter own them — precisely the Snapshot Pattern the architecture defines, and the reason snapshot integrity is one of the small set of high-value invariants the whole system is shaped to protect.

The mechanism is bounded by decisions already recorded. Snapshotting is the integration technique that keeps Booking decoupled from later upstream edits without violating ownership (per [ADR-004](./adr-004-context-integration-model)): a snapshot is an immutable copy of an upstream fact, captured at a defined moment and thereafter owned by the capturing aggregate (glossary: *Snapshot*). It is also what makes the single pricing authority trustworthy over time (per [ADR-005](./adr-005-single-pricing-authority)): the Price Snapshot freezes the output of the one authoritative calculation so that what the buyer saw is what the record forever holds (`PRC-8`, `PRC-1`). And it is what keeps the money-facts / money-movement seam clean: Booking authors the immutable fact, Payments reads it and moves money against it, and the two never blur (`PAY-2`, `INV-1`). The snapshot strategy therefore sits at the intersection of Booking ownership, pricing authority, and payment correctness — which is why it is recorded as its own decision.

## Decision

The immutable-snapshot strategy is fixed as already established:

- **Bookings freeze immutable business facts at checkout.** At checkout, Booking captures the facts it depends on from upstream — the **Price Snapshot** (the authoritative Price Breakdown), the **Commission Snapshot**, and the **Cancellation Policy Snapshot** — as write-once values owned by the Booking (`PRC-8`, `PAY-4`, `INV-1`). The capture happens atomically with booking creation and seat reservation, as one indivisible unit (`BKG-2`, `CON-1`), so the frozen terms and the order they belong to come into existence together or not at all.
- **Snapshots become the permanent commercial truth of that Booking.** Once captured, these are facts *of the Booking*, not of Catalog or Payments (`INV-1`). They are immutable for the life of the Booking regardless of any later change to listing price, cancellation policy, or Commission Rate (`INV-1`, `PAY-2`, `BKG-8`), and historical booking data is preserved even when the originating listing is paused, unlisted, or its district deactivated (`INV-11`).
- **Downstream contexts consume snapshots, not live upstream state.** Payments moves money strictly against the Booking's snapshots: it reads the Commission Snapshot, queues a payout on the pre-frozen Net Payout Amount, and computes refunds from the snapshotted gross and the snapshotted Cancellation Policy — never a live rate or a live policy (`LC-6`, `PAY-6`, `PAY-7`, `PAY-2`). Payments reads the fact; it never authors or mutates it.
- **Upstream changes never rewrite historical orders.** Provider pricing, cancellation policies, commission rates, and listing content evolve in their owning contexts and apply only to *future* bookings; a created Booking is unaffected (`BKG-8`, `PAY-2`). Provider suspension or license expiry changes future listing visibility only and stops at the Booking boundary — historical facts are never edited (`INV-11`).
- **Corrections create new facts; they never edit old facts.** A change to a settled transaction is expressed as a *new* immutable fact that supersedes, not a mutation of the frozen one — a refund is a new money movement, not an edit of the original charge or the snapshot it was computed from (`PAY-6`, `PAY-8`). The historical snapshot remains intact as the basis the correction was computed against.
- **B2B quotations become bookings by snapshotting, like every other Booking.** When an `Accepted` Quotation converts into a Booking (`LC-11`), that Booking freezes its own snapshots at creation exactly as a B2C checkout does, through the anti-corruption boundary that translates B2B vocabulary into Booking's language (per [ADR-004](./adr-004-context-integration-model)). The corporate order thereby holds the same permanent, auditable commercial truth as any other Booking.

This decision records *why the architecture already freezes immutable business snapshots*; it changes nothing about which facts are snapshotted, the aggregate that owns them, the moment they are frozen, or the contexts that consume them, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../../domain/domain-models.md](/docs/domain/domain-models), and [../../business-rules/business-rules.md](/docs/business-rules/invariants).

## Consequences

### Positive

- **Historical correctness.** A Booking's terms are true as of the moment it was made and stay that way for life; the past cannot be rewritten by the present (`INV-1`, `BKG-8`).
- **Financial correctness and explainability.** Every charge, payout, and refund derives from frozen values, so the `gross = net + commission` identity holds against numbers that never move and any money outcome can be reconstructed and defended years later (`INV-2`, `PAY-2`, `PAY-6`).
- **Strong auditability.** Because each Booking is self-contained and immutable, its commercial truth is reviewable in isolation without reconstructing the historical state of Catalog or Payments — the record *is* the evidence (`INV-1`).
- **Legal and commercial integrity.** The terms captured at agreement are the terms that were offered and accepted, so bookings — including B2B orders and the formal documents around them — remain a faithful record of a binding commitment (`PAY-10`, `LC-11`).
- **Decoupling of Booking from upstream evolution.** Catalog can reprice or revise policy and Payments can change the Commission Rate freely, knowing no historical order is disturbed; upstream is free to evolve precisely because history is frozen (`BKG-8`, `PAY-2`, `INV-11`).
- **Trustworthy single pricing authority over time.** The Price Snapshot freezes the output of the one authoritative calculation, so what the buyer saw is permanently what the record holds, extending [ADR-005](./adr-005-single-pricing-authority)'s guarantee across time (`PRC-8`, `PRC-1`).
- **Clean money-facts / money-movement seam.** Booking authors immutable facts and Payments moves money against them, keeping external-rail volatility out of the order aggregate and preventing financial operations from rewriting order history (`PAY-2`, `INV-1`).
- **Corrections without loss of history.** Because a correction is a new fact rather than an edit, the original agreement and every subsequent adjustment both remain visible, giving a complete and honest trail (`PAY-6`, `PAY-8`).

### Negative

- **Deliberate duplication of captured facts.** The same price, commission, and policy values exist both as evolving upstream configuration and as frozen Booking-owned snapshots. This duplication is intentional — it is the price of historical truth — but it means the "current" figure and a historical Booking's figure will legitimately differ and must never be reconciled into agreement.
- **No retroactive fix by editing.** A mistake in a past order cannot be corrected by changing the snapshot; it must be addressed by issuing a new superseding fact, which is more deliberate than an in-place edit and demands workflows that express correction as new movement (`PAY-6`, `PAY-8`).
- **Snapshots must be captured completely and atomically.** A Booking is only self-contained if it froze every fact it will ever need at the defining moment, within the atomic checkout unit (`BKG-2`, `CON-1`); an omitted fact cannot be safely back-filled later without reintroducing a live dependency. The authoritative instant and exact scope of capture remain governed by open decisions (`AMB-007`, `AMB-010`) and are not settled here.
- **Downstream consumers must resist "just read it live."** Payments and refund flows are forbidden from reaching for the current rate or current policy even when it would be convenient; they must always compute against the snapshot (`PAY-2`, `PAY-6`), a discipline that holds only as long as the team upholds it.
- **Reasoning spans two truths.** Anyone analyzing the system must hold both the evolving upstream state and the frozen historical facts in mind at once, and be clear about which one governs a given question — more cognitive load than a single mutable model.

## Alternatives Considered

### Live references to upstream data

Letting a Booking hold only identifiers and read price, commission, and policy live from Catalog and Payments whenever those facts are needed.

Rejected because it makes historical truth impossible. A Booking that reads live would return *today's* terms for a *past* order, so any later reprice, policy revision, or Commission Rate change (`PRC-2`..`PRC-6`, `PAY-2`) would silently rewrite what the buyer agreed to and paid — a direct violation of `INV-1` and `BKG-8`. Every downstream money computation (`LC-6`, `PAY-6`) would be built on shifting inputs, destroying auditability and the `gross = net + commission` identity (`INV-2`). It also recouples Booking to upstream evolution, defeating the decoupling that snapshotting exists to provide (per [ADR-004](./adr-004-context-integration-model)).

### Mutable bookings

Allowing a Booking's captured terms to be edited in place after checkout.

Rejected because editable terms are not a historical record at all. If the Price, Commission, or Cancellation Policy on a Booking could be changed after the fact, there would be no reliable answer to "what was actually agreed?", and a Booking would cease to be the immutable, self-contained fact that `INV-1` and `INV-11` require. It would also breach the money-facts / money-movement seam by letting order history be rewritten (per the boundary rule that Payments reads facts and never mutates them), and would make every financial outcome computed from those terms indefensible.

### Recomputing historical values

Reconstructing a past Booking's price, commission, or refund basis on demand from current configuration rather than reading a stored snapshot.

Rejected because current configuration is not the configuration that produced the order. Recomputation with today's Pricing configuration or today's Commission Rate yields numbers the buyer never saw and never agreed to, contradicting the single pricing authority's guarantee that the snapshot freezes the *authoritative computed result* at checkout (`PRC-8`, `PRC-1`). It would make refunds depend on live rates and policies — exactly what `PAY-6` and `PAY-2` forbid — and would leave no fixed basis to audit, so no historical money movement could be explained years later.

### Updating orders whenever Listings change

Cascading Listing edits, policy revisions, or Commission Rate changes into the historical Bookings that referenced them, to keep orders "in sync" with current state.

Rejected because keeping orders "in sync" with the present is the opposite of what a historical record requires. `BKG-8` states that changes to a Listing must not affect already-confirmed Bookings, and `INV-11` requires historical booking data to be preserved even when a Listing is paused, unlisted, or its district deactivated. Provider suspension and license expiry deliberately reach Catalog's future visibility and stop at the Booking boundary; propagating them into orders would mutate immutable facts and turn every upstream edit into a corruption of history. Upstream is allowed to evolve *precisely because* those changes never touch the frozen facts of a completed order.

## Related Documents

- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that makes Booking the one home for the immutable money facts it freezes.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the published-contract, identity-only integration model within which snapshotting decouples Booking from later upstream edits.
- [ADR-005-single-pricing-authority.md](./adr-005-single-pricing-authority) — the single pricing authority whose computed result the Price Snapshot freezes for the life of the Booking.
- [overview.md](/docs/architecture/overview) — top-level architecture, the Snapshot Pattern and Booking Snapshots sections, and the money-facts / money-movement seam.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, Booking's ownership of the frozen snapshots, the Commission Snapshot value contract, and the coupling-risk register.
- [api-design.md](/docs/architecture/api-design) — how the snapshotting boundaries and the contracts crossing them are expressed at the platform edge.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, the snapshot philosophy, immutable-vs-mutable facts, and the aggregate-boundary rules that keep snapshots owned by Booking.
