---
title: Consistency & Integration
sidebar_position: 8
description: Data consistency guarantees and cross-context integration constraints for the conceptual model.
---

## TL;DR

- Inside one aggregate, changes are strongly consistent. Across aggregates, the model is eventually consistent.
- Checkout plus seat reservation is the **only** co-transactional cross-context operation (`CR-1`).
- Snapshots are write-once for the life of the Booking. Financial corrections are new movement facts.
- Reviews and Payments read Booking facts. They do not mutate Booking.

## About this document

Restates [Domain models](/docs/30-49-domains/domain-models/domain-models) §5 and business rules as data guarantees. It does not change ownership.

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Bounded contexts | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |

---

## Data consistency rules

1. **Intra-aggregate strong consistency.** One aggregate changes in one atomic step. Nothing inside an aggregate is partially applied.

2. **Atomic checkout unit.** CheckoutSession creation, snapshot freeze, and seat decrement all succeed or all fail (`BKG-9`, `CON-1`). Booking materialization on payment success copies session facts. This is the one shared transaction between Booking and Catalog (`CR-1`).

3. **Seat-counter bounds.** `available_seats` on an AvailabilitySlot is never negative and never exceeds capacity (`INV-3`). A zero-seat slot is fully booked and not bookable (`CON-3`).

4. **Last-seat contention.** Concurrent attempts on the final seats succeed only until `available_seats = 0`. Others get a fully-booked outcome (`CON-2`).

5. **Per-asset slot exclusivity.** Two slots on the same Asset do not overlap in time. Boundary-touching is allowed. Overlap on different Assets is allowed (`CON-4`). Per-vehicle bookings use full slot capacity (`CON-6`).

6. **Snapshot immutability.** A captured snapshot is never edited for the life of its Booking (`INV-1`, `FIN-2`). Financial corrections are new movement facts.

7. **Financial identity.** On snapshot values, `gross_amount = net_payout_amount + commission_amount` (`INV-2`, `FIN-1`, `PAY-11`). Amounts are whole JPY (`PAY-1`, `FIN-8`).

8. **Payout and refund mutual exclusion.** For one Booking's funds, payout and refund never both apply to the same captured amount (`FIN-5`, `PAY-8`). A refund voids any payout-queue entry.

9. **Review eligibility and uniqueness.** A Review exists only for a `COMPLETED` Booking, at most one per Booking (`INV-5`, `BKG-7`). Rating Score uses approved Reviews only (`OPR-6`).

10. **Verification gating.** A non-`Approved` Provider has zero tourist-visible Listings (`INV-6`). A Listing under an expired License is not `Published` (`INV-7`). Publish requires a verified Provider Merchant Account (`INV-12`).

11. **Historical preservation.** Historical Booking data is preserved when a Listing is Paused, Unlisted, or its District is deactivated (`INV-11`, `BKG-8`).

12. **Eventual consistency across boundaries.** Cross-aggregate work is eventually consistent and idempotent — rating recalculation, listing pause, payout queueing, notifications. Reactions tolerate delay, reordering, and redelivery (`FIN-10`).

13. **Convergence to external truth.** Payments facts converge to provider settlement truth. Divergence is a reconcilable defect, not silent loss (`FIN-11`). Bank-transfer reconciliation is manual (`PAY-9`).

14. **Idempotent seat restoration.** Seat restoration on cancellation or session expiry is idempotent (`CON-5`, Decision Log `AMB-012`, bounded by `INV-3`).

## Cross-context integration constraints

1. **No shared tables.** A context's data is reachable only through its commands, queries, and events.

2. **Identity-only references.** Foreign aggregates are named by stable id. No context embeds another context's aggregate.

3. **Single Pricing Authority.** Price is computed only by `Catalog.calculate_quote(...)`. Elsewhere it is consumed as `PriceBreakdown` (`PRC-1`, `PRC-2`, `CR-2`). Booking-owned snapshots are the exception for durable price facts.

4. **Snapshots over live references.** When meaning must not change, capture a snapshot at a defined instant (price, commission, cancellation policy; recipient language at send).

5. **The single shared transaction.** CheckoutSession and Catalog seat reservation is the only co-transactional cross-context operation (`CR-1`). It must not become a network call without a saga redesign.

6. **Conformist read of Provider Status.** Catalog reads Onboarding `{ provider_id, status, license_valid_until }`. It does not replicate verification logic.

7. **ACL for Corporate → Booking.** An accepted Quotation enters Booking only through `create_booking_from_quote` (`CR-7`).

8. **Events carry identities and immutable facts only.** Consumers are idempotent (`FIN-10`).

9. **Reviews and Payments never mutate Booking.** Reviews consume the completion fact. Payments reads the Commission Snapshot read-only.

10. **Cascades are event-driven.** License expiry and district deactivation reach Catalog through events. Historical Bookings are never mutated.
