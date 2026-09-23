---
title: Coupling Risks & Boundaries
sidebar_position: 12
description: Bounded context documentation for Red Cab Marketplace.
---

## Coupling-risk register
- **CR-1 — CheckoutSession↔Catalog seat-reservation transaction (HIGH).** CheckoutSession creation must decrement Catalog's `available_seats` co-transactionally (`CON-1`, `BKG-9`). Risk: this is the one place two contexts share a transaction. Mitigation: Catalog exposes a *guarded reserve command* (not raw table access); both run in the same DB transaction because they share one database — acceptable in a modular monolith, but this seam must never become a network call without redesign (it would require a saga). Documented as the deliberate exception to "no shared transactions."
- **CR-2 — Pricing authority leakage (HIGH).** Three callers (listing display, search filter, checkout snapshot) could each recompute price and drift. Mitigation: `PRC-1` — only `Catalog.calculate_quote()` computes price; enforced as a rule and a Cursor rule later.
- **CR-3 — Payout vs refund race (CRITICAL, financial).** Async `PayoutQueued` (on completion) vs refund reversal can cause double money-out. Mitigation: `FIN-5` mutual-exclusion interlock + clearing period (AMB-004); ordering must hold across the async gap. Tracked: AMB-003/004/005.
- **CR-4 — Cross-context cascades as events, not direct writes (MED).** License expiry → pause listings and district deactivation → unlist must be event-driven (idempotent consumers), not Onboarding/Geography writing Catalog tables. Risk if violated: brittle hidden coupling.
- **CR-5 — Notifications fan-out (MED).** Every context emits to Notifications. Risk: ordering/duplication. Mitigation: async + idempotent dispatch; no synchronous dependency on delivery.
- **CR-6 — Identity as universal upstream (MED).** Everything depends on Identity; a change to the principal/role contract ripples widely. Mitigation: keep the exposed contract minimal and stable (`principal`, `role`, `language`).
- **CR-7 — corporate pre-payment lifecycle (MED, open).** Corporate "Pending Payment" conflicts with `BKG-2`; until AMB-027 is resolved the Corporate→Booking contract is provisional.

## Boundary enforcement summary (no code)
- Contexts expose **commands, queries, and published events** — never their tables.
- Shared-transaction coupling is allowed in exactly one documented place (CR-1) and nowhere else.
- Value contracts crossing boundaries: `PriceBreakdown`, `AvailabilitySnapshot`, Provider Status read, Commission Snapshot, completion fact, recipient language.
- ACL boundaries: Corporate→Booking (quotation→booking vocabulary) and Catalog's conformist read of Onboarding status.

## Open items affecting boundaries
AMB-001/003/004/005 (Payments seam), AMB-013/014 (Booking lifecycle/initiator modeling), AMB-020 (navigation → Catalog IA), AMB-027/028 (Corporate↔Booking/Availability). Resolutions flow back here via the ambiguity register's Decision Log.
