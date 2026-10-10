---
title: Coupling Risks & Boundaries
sidebar_position: 12
description: Register of cross-context coupling risks (CR-1..CR-7) and boundary enforcement rules.
---

## TL;DR

- **CR-1** is the only allowed shared database transaction: checkout plus guarded seat reserve.
- **CR-2** and **CR-3** are financial and pricing risks with rule-backed mitigations (`PRC-1`, `FIN-5`).
- Contexts expose commands, queries, and events. They never expose tables.
- Open ambiguities (`AMB-*`) can change Corporate and Payments seams.

## About this document

Coupling-risk register for bounded contexts. Restates design from the context map; it does not add new rules.

| Topic | Document |
| --- | --- |
| Context map | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Open questions | [Open questions](/docs/70-79-business/planning/open-questions) |

---

## Coupling-risk register

**CR-1 — CheckoutSession and Catalog seat reservation (HIGH).**

CheckoutSession creation must decrement Catalog `available_seats` in the same transaction (`CON-1`, `BKG-9`).

Mitigation: Catalog exposes a guarded reserve command, not raw table access.

Both sides share one database. This seam must not become a network call without a saga redesign.

This is the deliberate exception to "no shared transactions."

**CR-2 — Pricing authority leakage (HIGH).**

Listing display, search filter, and checkout could each recompute price and drift.

Mitigation: `PRC-1` — only `Catalog.calculate_quote()` computes price.

**CR-3 — Payout vs refund race (CRITICAL, financial).**

Async `PayoutQueued` on completion can race refund reversal and cause double money-out.

Mitigation: `FIN-5` mutual-exclusion interlock plus clearing period (`AMB-004`). Ordering must hold across the async gap. Tracked: `AMB-003`, `AMB-004`, `AMB-005`.

**CR-4 — Cross-context cascades (MED).**

License expiry, listing pause, and district deactivation must flow as idempotent events.

Onboarding and Geography must not write Catalog tables directly.

**CR-5 — Notifications fan-out (MED).**

Every context emits to Notifications. Risk: ordering and duplication.

Mitigation: async idempotent dispatch. No synchronous dependency on delivery.

**CR-6 — Identity as universal upstream (MED).**

All contexts depend on Identity. A principal or Role contract change ripples widely.

Mitigation: keep the exposed contract minimal (`principal`, `role`, `language`).

**CR-7 — Corporate pre-payment lifecycle (MED, open).**

Corporate "Pending Payment" conflicts with `BKG-2` until `AMB-027` is resolved. The Corporate→Booking contract is provisional.

## Boundary enforcement

Contexts expose **commands, queries, and published events**. They never expose their tables.

Shared-transaction coupling is allowed only at **CR-1**.

**Value contracts** across boundaries include `PriceBreakdown`, `AvailabilitySnapshot`, Provider Status read, Commission Snapshot, completion fact, and recipient language.

**ACL boundaries:** Corporate→Booking (quotation to booking vocabulary); Catalog conformist read of Onboarding status.

## Open items affecting boundaries

`AMB-001`, `AMB-003`, `AMB-004`, `AMB-005` (Payments seam); `AMB-013`, `AMB-014` (Booking lifecycle); `AMB-020` (navigation → Catalog IA); `AMB-027`, `AMB-028` (Corporate↔Booking and availability).

Resolutions flow back here via the [open questions](/docs/70-79-business/planning/open-questions) Decision Log.
