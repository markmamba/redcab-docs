---
title: Consistency & Integration
sidebar_position: 8
description: Conceptual data model for Red Cab Marketplace.
---

## 12. Data Consistency Rules

These are the consistency guarantees the model must uphold, restated from [../domain/domain-models.md](/docs/domain/domain-models) §5 and the business rules. They are stated as guarantees over the data, not as mechanisms.

1. **Intra-aggregate strong consistency.** Everything inside one aggregate is consistent within a single atomic change; nothing inside an aggregate is ever partially applied.
2. **Atomic checkout unit.** CheckoutSession creation + Price/Commission snapshot freeze + seat decrement either all take effect or none do (`BKG-9`, `CON-1`). Booking materialization on payment success copies session facts. This is the one place two contexts (Booking and Catalog) share a transaction (CR-1).
3. **Seat-counter bounds.** `available_seats` for an AvailabilitySlot is never negative and never exceeds capacity (`INV-3`). A 0-seat slot is Fully Booked and unbookable (`CON-3`).
4. **Last-seat contention.** Under concurrent attempts on the final seat(s), at most enough succeed to reach `available_seats = 0`; all others receive a "now fully booked" outcome (`CON-2`).
5. **Per-asset slot exclusivity.** Two slots on the same Asset never overlap in time; boundary-touching is allowed; overlap on different Assets is allowed (`CON-4`). Per-vehicle bookings consume 100% of slot capacity (`CON-6`).
6. **Snapshot immutability.** A captured snapshot is never edited for the life of its Booking (`INV-1`, `FIN-2`); financial corrections are new movement facts.
7. **Financial identity.** On snapshot values, `gross_amount = net_payout_amount + commission_amount` always holds (`INV-2`, `FIN-1`, `PAY-11`); amounts are whole JPY (`PAY-1`, `FIN-8`).
8. **Payout/refund mutual exclusion.** For one Booking's funds, payout and refund never both apply to the same captured amount (`FIN-5`, `PAY-8`); a refund voids any payout-queue entry.
9. **Review eligibility and uniqueness.** A Review exists only for a `COMPLETED` Booking, at most one per Booking (`INV-5`, `BKG-7`); the Rating Score is computed from approved Reviews only (`OPR-6`).
10. **Verification gating.** A non-`Approved` Provider has zero tourist-visible Listings (`INV-6`); a Listing under an expired License is not `Published` (`INV-7`); publish requires verified Stripe Connected Account (`INV-12`).
11. **Historical preservation.** Historical Booking data is preserved (never deleted) when a Listing is Paused, Unlisted, or its District deactivated (`INV-11`, `BKG-8`).
12. **Eventual consistency across aggregates/contexts.** Everything *across* aggregate or context boundaries is eventually consistent and reconciled by idempotent event reactions — rating recalculation after approval, listing pause after license expiry, payout queuing after completion, notification dispatch — all of which must tolerate delay, reordering, and redelivery (`FIN-10`).
13. **Convergence to external truth.** Payments facts converge to external-rail settlement truth; divergence is a reconcilable defect, never a silent loss (`FIN-11`). Bank-transfer reconciliation is manual (`PAY-9`).
14. **Idempotent restoration.** Seat restoration on cancellation/session expiry is idempotent so retries cannot push `available_seats` above capacity (`CON-5`, Decision Log `AMB-012`, bounded by `INV-3`).

---

## 13. Cross-Context Integration Constraints

The model's integrity depends on constraints on *how* data crosses boundaries ([./bounded-contexts.md](/docs/architecture/bounded-contexts) "Boundary enforcement"; [./overview.md](/docs/architecture/overview) "Cross-Context Integration").

1. **No shared tables / no internal access.** A context's data is reachable only through its commands, queries, and published events. No context reads or writes another's internals.
2. **Identity-only references.** Foreign aggregates are named by stable identifier; no aggregate embeds or co-owns another context's aggregate.
3. **Single Pricing Authority.** Price is computed only by `Catalog.calculate_quote(...)` and consumed elsewhere as the `PriceBreakdown` value contract; no other context (and no client) recomputes or stores an authoritative price, except as a Booking-owned snapshot (`PRC-1`, `PRC-2`, CR-2).
4. **Snapshots over live references for durable meaning.** When a downstream record's meaning must not change, the fact is snapshotted at a defined instant rather than referenced live (Price/Commission/Cancellation snapshots; recipient language at send).
5. **The single shared transaction.** CheckoutSession↔Catalog seat reservation is the only co-transactional cross-context operation (CR-1); it relies on the single shared database and must never become a network call without a redesign (a saga).
6. **Conformist read of Provider Status.** Catalog conforms to Onboarding's `{ provider_id, status, license_valid_until }` read contract and never replicates verification logic.
7. **Anti-corruption boundary for B2B → Booking.** An accepted Quotation enters Booking only through `create_booking_from_quote`, translating B2B vocabulary into Booking's command language; B2B concepts never leak into Booking (CR-7).
8. **Events carry identities and immutable facts only.** A domain event never carries a reference to another context's live aggregate; consumers are idempotent so redelivery cannot double-act (`FIN-10`).
9. **Reviews and Payments never mutate Booking.** Reviews consume only the completion fact and key by `booking_id`; Payments reads the Commission Snapshot read-only. Neither alters Booking state or facts.
10. **Cascades are event-driven, not direct writes.** License expiry → pause listings and district deactivation → unlist flow as events to Catalog (idempotent consumers), never as Onboarding/Geography writing Catalog data (CR-4). The cascade reaches Catalog (listings) and stops at the Booking boundary — historical Bookings are never mutated.

---
