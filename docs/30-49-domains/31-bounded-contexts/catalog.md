---
title: Catalog & Inventory
sidebar_position: 3
description: Core context — geography, listings, single pricing authority, availability, and search.
---

## TL;DR

- Owns everything a Provider publishes and a Tourist discovers and prices.
- **Catalog** is the **single pricing authority** (`PRC-1`). Consumers use `PriceBreakdown`; they do not recompute price.
- Owns asset availability: each booking holds one asset for one time range, created at checkout (`CR-1`).
- Geography and Search are modules inside this context, not separate contexts.

## About this document

Bounded context overview for Catalog & Inventory (core).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Catalog domain (current rules) | [Catalog domain](/docs/30-49-domains/catalog/) |
| Geography pattern | [Geography](/docs/30-49-domains/patterns/geography) |
| ADR-013, ADR-014, ADR-016 | [Geography ADRs](/docs/30-49-domains/architecture-decisions) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context owns Provider-published supply and Tourist-facing discovery and pricing.

It includes geography, listings, pricing configuration, availability, and search.

## Core concepts

**Modules:** Geography, Listings, Pricing, Availability, Search.

**Geography** is an admin-curated tree (`catalog_countries`, `catalog_geographies`).

The levels are Region, Subdivision (prefecture), Municipality and Ward ([Region level](/docs/30-49-domains/catalog/catalog-decisions#region-level)).

Nodes use official seeded codes ([ADR-013](/docs/30-49-domains/architecture-decisions/adr-013-geography-reference-data), [ADR-016](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree)).

Each node carries a **Service Timezone** (IANA string, [ADR-014](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model)).

Listable nodes carry centroids for pins and near-me search. There is no spatial database extension.

**Aggregates:** `Geography` (tree nodes: region, prefecture, municipality, ward); `ProviderAsset` (`CON-4`, `AMB-023`, with its schedule and closures); `Listing` (photos, status, `primary_geography_id`, additional destinations, pickup coverage, packages); `PricingPolicy` (pricing mode and cancellation policy, with Phase 2 tiers, seasonal overrides and extra charges); `AssetHold` (one booking, one asset, one time range, per-asset overlap rule).

Search is a read module over the above aggregates.

**Transactional boundaries:** hold creation plus the overlap rule is one transaction (`CON-4`).

Listing publish, including at least one photo (`INV-10`), is one transaction.

Pricing edits are transactional within `PricingPolicy`.

## Integrations

**Upstream:** Onboarding (Provider Status, and the provider type and name that keyword search reads, read only); Payments (`payout_capability` for publish gate, `INV-12`); Identity (principal).

**Downstream:** Booking and Corporate (pricing and availability); Notifications.

**Sync (exposes):**

- `calculate_quote(listing, params, at:) -> PriceBreakdown` — single pricing authority (`PRC-1`).
- Availability queries.
- Asset hold command. Booking invokes it inside the checkout transaction, and only Catalog writes holds (`CR-1`).

**Async (publishes):** `ListingPublished`, `ListingPaused`, `ListingUnlisted`. `SlotCapacityChanged` goes away with the slot in slice S5.

**Async (consumes):**

- `LicenseExpired` / `LicenseRenewed` — pause or restore listings.
- `ConnectedAccountRestricted` / `ConnectedAccountVerified` — pause or restore on payout restriction (Phase 1 publish gate only).
- Geography subtree deactivation (`OPR-10`).
- `RatingRecalculated` from Reviews.

**Contracts:** `PriceBreakdown` and `AvailabilitySnapshot` are value contracts. Consumers must not recompute price (`PRC-1`).

## Related requirements

`INV-8`, `INV-10`, `INV-12`, `PRC-1`..`PRC-8`, `CON-3`, `CON-4`, `CON-6`, `B-01`..`B-05`, `C-01`..`C-11`, `D-01`..`D-05`.
