---
title: Catalog & Inventory
sidebar_position: 3
description: Bounded context documentation for Red Cab Marketplace.
---

### 2. Catalog & Inventory (core)
- **Purpose:** Everything a Provider publishes and everything a Tourist discovers and prices: geography, listings, pricing configuration + the price-calculation authority, and availability/seat inventory.
- **Internal modules:** **Geography**, **Listings**, **Pricing**, **Availability**, **Search**.
- **Aggregates owned:** `District`/`Area` (Geography); `ProviderAsset` (vehicle/guide registry — `CON-4`, `AMB-023`); `Listing` (Listings, incl. photos, type-specific fields, status); `PricingPolicy` (Pricing — mode, tiers, duration, seasonal overrides, extra charges, cancellation policy); `AvailabilitySlot` (Availability — owns `available_seats`, bound to `asset_id`, per-Asset overlap); search is a read/query module over the above.
- **Transactional boundary:** slot creation + overlap check is one transaction (`CON-4`); listing publish (incl. ≥1 photo, `INV-10`) is one transaction; pricing config edits are transactional within `PricingPolicy`.
- **Upstream deps:** Onboarding (Provider Status); Payments (payout capability read for publish gate); Identity (principal).
- **Downstream consumers:** Booking and B2B (pricing + availability); Notifications.
- **Sync (exposes):**
  - `calculate_quote(listing, params, at:) -> PriceBreakdown` — the **single pricing authority** (`PRC-1`).
  - availability queries; and a **guarded seat-reservation command** that CheckoutSession creation invokes within Booking's checkout transaction (Catalog owns the counter, the decrement executes co-transactionally — see coupling note CR-1).
- **Async (publishes):** `ListingPublished`, `ListingPaused`, `ListingUnlisted`, `SlotCapacityChanged`. **Consumes:** `LicenseExpired`/`LicenseRenewed` (→ auto-pause/restore listings), `ConnectedAccountRestricted`/`ConnectedAccountVerified` (→ auto-pause/restore on payout restriction — Phase 1: publish gate only), district-deactivation cascade (`OPR-10`), and Reviews' `RatingRecalculated` (to display score).
- **Integration contract:** `PriceBreakdown` and an `AvailabilitySnapshot` are published value contracts; consumers must not recompute price (`PRC-1`).
- **Rules anchored here:** `INV-8`, `INV-10`, `INV-12`, `PRC-1..8`, `CON-3`, `CON-4`, `CON-6`, `B-01..B-05`, `C-01..C-11`, `D-01..D-05`.
