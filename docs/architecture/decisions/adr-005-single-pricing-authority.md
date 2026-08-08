---
title: "ADR-005: Single Pricing Authority"
sidebar_label: ADR-005
sidebar_position: 5
description: Architecture decision record 005.
---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## TL;DR

- **Only `Catalog.calculate_quote(...)`** computes price; all consumers display or snapshot the returned `PriceBreakdown`.
- No other context and no client may recompute or author price inputs.

## About this document

ADR for single pricing authority (`PRC-1`, `CR-2`).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Business rules | [Business Rules](/docs/business-rules/invariants) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context, and per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts. Those decisions answer *how ownership is divided and how contexts cooperate* in general; they do not by themselves explain *why price in particular is owned by Catalog & Inventory and computed in exactly one place*. Price is the single concept where ownership ambiguity does the most damage, so the reasoning behind its placement deserves to be recorded on its own. This ADR records that reasoning; it changes nothing about where price lives or how it is computed.

Price is not one number used in one place — it appears at three moments that must never disagree. A Tourist sees a **display price** on a listing, filters and ranks results by a **search price**, and commits to a **checkout price** that becomes the order. These are the same commercial truth viewed at different moments; if the same inputs can yield three different prices, the platform has lied to the buyer at least twice. The architectural force is therefore consistency: display, search, and checkout for identical inputs MUST resolve to the identical Price Breakdown (`PRC-1`, `PRC-2`). Divergence is not a cosmetic glitch — it is a defect in the platform's financial honesty.

Consistency at three moments is only achievable if price has a **single source of truth**. Price is derived from a Listing's configured Pricing Mode, Group Size Tiers, Duration Pricing, Seasonal Overrides, and Extra Charges (`PRC-2`..`PRC-6`); the moment that derivation exists in more than one place, the copies drift as configuration evolves and the three moments fall out of agreement. The only structural defense is to compute price **exactly once**, in one authoritative place, and have everyone else consume the result rather than reproduce the logic. This is precisely the high-value coupling risk the architecture already names: **`CR-2` pricing-authority leakage**, where three callers — listing display, search filtering, and checkout snapshotting — could each independently re-derive price and drift.

Two consumers raise the stakes beyond display. The **frontend must not re-derive price**: it holds no financial truth and only renders the Price Breakdown returned by the authority. A client that computes price would put financial truth on the least trusted, most variable surface in the system, where it could disagree with the server and could be manipulated. And **price must not be duplicated across Booking, Payments, or B2B**: Booking authors the order, Payments moves money, and B2B forms corporate quotations, but none of them author commercial pricing rules — if any of them recomputed price, there would again be more than one place where the same number is made, and they would drift.

Snapshot integrity depends entirely on a single authoritative calculation. At checkout, the price presented becomes the immutable **Price Snapshot**, frozen for the life of the Booking (`PRC-8`, `INV-1`), and the **Commission Snapshot** is computed on that snapshotted gross amount by Payments, which thereafter only reads it and never recomputes price (`PAY-2`). A snapshot is only trustworthy if it captures the output of the one authoritative calculation; if checkout could compute its own price, the snapshot would freeze a number that never matched what the buyer saw, and every downstream money fact — commission, payout, refund — would inherit that discrepancy. Pricing drift is therefore not a local bug but a breach of trust and financial correctness that propagates through the whole money path.

Finally, the placement is not arbitrary: **Catalog & Inventory already owns Listings, the pricing configuration, and availability** — the exact inputs price is derived from (`INV-1` listing/inventory ownership context, `PRC-1`). Co-locating the calculation with the configuration it reads keeps the authority where the truth already lives, avoids a cross-context read of pricing configuration, and supports the modular-monolith and bounded-context discipline established in [ADR-003](./adr-003-bounded-context-architecture) and [ADR-004](./adr-004-context-integration-model): one owner, one published contract, no shared write-access to commercial truth.

## Decision

Pricing ownership and the single calculation point are fixed as already established:

- **Catalog & Inventory owns pricing.** The Pricing configuration and the single **price-calculation authority** live in Catalog & Inventory, co-located with the Listings, pricing configuration, and availability the calculation depends on (`PRC-1`, `PRC-2`).
- **Price is computed exactly once.** Price is derived in exactly one place by the owning context from the Listing's Pricing Mode, Group Size Tiers, Duration Pricing, Seasonal Overrides, and Extra Charges (`PRC-2`..`PRC-6`). No other context and no client re-derives it.
- **The result is a computed value contract.** Price crosses every boundary only as the published **Price Breakdown** value contract — a result consumers read, never a calculation they reproduce.
- **Booking consumes and snapshots.** At checkout, Booking consumes the authoritative result and freezes it as the immutable Price Snapshot for the life of the order (`PRC-8`, `INV-1`); it snapshots price, it does not author pricing rules.
- **Payments reads the snapshot only.** Payments computes the Commission Snapshot on the snapshotted gross amount and thereafter only reads the frozen values; it never recomputes price (`PAY-2`, `INV-1`).
- **The frontend never computes price.** The client renders the Price Breakdown returned by the authority and holds no financial truth.
- **Search, filter, and display share the authority.** Listing display, search filtering, and checkout all consume the same authoritative pricing result, so the same inputs always yield the same price (`PRC-1`, `PRC-2`), closing the `CR-2` leakage risk.

This decision records *why pricing is owned and computed this way*; it changes nothing about the pricing rules, the owning context, the value contract, or the consumers, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), and [../../business-rules/business-rules.md](/docs/business-rules/invariants).

## Consequences

### Positive

- **One source of truth.** Price is made in exactly one place, so "what is the price for these inputs?" has a single authoritative answer (`PRC-1`).
- **No pricing drift.** Because the calculation is never duplicated across Booking, Payments, B2B, or the client, there are no copies to fall out of step as pricing configuration evolves (`CR-2`).
- **Consistent display, filtering, and checkout.** The same inputs resolve to the identical Price Breakdown at every moment, so what a Tourist sees, filters by, and pays are guaranteed to match (`PRC-2`).
- **Trustworthy snapshots.** The Price Snapshot and the Commission Snapshot freeze the output of the one authoritative calculation, so every downstream money fact derives from the number the buyer actually saw (`PRC-8`, `INV-1`, `PAY-2`).
- **Easier testing.** Pricing behavior is exercised against one authority and one value contract, rather than against several independent re-derivations that would each need their own coverage.
- **Stronger auditability.** A single calculation point gives every price a single, traceable origin, making financial outcomes explainable and reviewable.
- **Clearer ownership.** "Who may change how price is computed?" has one answer — the owning context — upholding the singular-ownership discipline of [ADR-003](./adr-003-bounded-context-architecture).
- **Better trust for buyers and providers.** Buyers are never quoted one price and charged another, and providers' payouts derive from the same authoritative figure, reinforcing financial honesty on both sides.

### Negative

- **Pricing changes must go through the owning context.** Any change to how price is computed flows through Catalog & Inventory's authority; consumers cannot evolve pricing behavior on their own.
- **Consumers depend on a published contract.** Every caller depends on the Price Breakdown contract and is coupled to its stability; the contract must be evolved additively and kept dependable.
- **Callers cannot "just calculate it locally."** Even when re-deriving price in place would be convenient or marginally faster, it is forbidden; the result must always be requested from the authority.
- **Price-related workflows require disciplined contract design.** Flows that span display, checkout, commission, and refund must be expressed in terms of the published result and the snapshot, which demands more deliberate design than a local computation.
- **Future pricing-engine extraction must preserve the single authority.** Should pricing ever graduate to its own component against a documented fitness function, that extraction must keep exactly one authoritative calculation; it must never become a second place that computes price.

## Alternatives Considered

### Pricing in Booking

Letting Booking compute price as part of authoring the order.

Rejected because Booking's role is to **snapshot** commercial truth, not to author it. Booking freezes the Price Snapshot at checkout (`PRC-8`, `INV-1`); if it also computed price, the snapshot would capture a number Booking made rather than the authoritative result, reintroducing a second calculation path and the `CR-2` drift the single authority exists to prevent. Booking consumes pricing; it does not own pricing rules.

### Pricing in Payments

Letting Payments compute price as part of charging and settlement.

Rejected because Payments owns money **movement and the revenue split**, not **commercial offer formation**. Payments computes the Commission Snapshot on the already-snapshotted gross amount and otherwise only reads the frozen values (`PAY-2`, `INV-2`). Authoring price in Payments would place commercial pricing logic in the money-movement context, splitting ownership and letting the charged price diverge from the displayed and snapshotted price.

### Pricing in the frontend

Letting the client compute or re-derive price for display, filtering, or checkout.

Rejected because the UI **must not compute financial truth**. The frontend holds no financial truth and only renders the Price Breakdown returned by the authority (`PRC-1`); a client-side calculation would put the most variable, least trusted surface in charge of money, where it could disagree with the server, be manipulated, or fork into per-client drift.

### Shared pricing service or duplicated pricing logic

A pricing capability multiple contexts read and modify in common, or pricing logic copied into each consumer.

Rejected because it reintroduces exactly the ownership ambiguity and drift the architecture exists to prevent. Shared write-access or duplicated logic means more than one place makes price, so `PRC-1` becomes unenforceable and the three pricing moments fall out of agreement — the `CR-2` pricing-authority-leakage risk realized rather than closed. The single authority co-located with its configuration achieves cross-context reuse through one published value contract, not through a shared-write concept or copied code.

## Related Documents

- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that makes Catalog & Inventory the one home for pricing.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the published-contract integration model by which the Price Breakdown crosses boundaries as a value contract.
- [overview.md](/docs/architecture/overview) — top-level architecture, the Pricing Authority section, and the Single Pricing Authority principle.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, Catalog & Inventory's pricing ownership, the `PriceBreakdown` value contract, and the `CR-2` coupling risk.
- [api-design.md](/docs/architecture/api-design) — how the single pricing authority and its value contract are exposed at the platform edge.
- [domain-models.md](/docs/domain/domain-models) — aggregate ownership, the snapshot philosophy, and pricing-as-computed-value-contract.
