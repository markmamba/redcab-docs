---
title: Phase 1 — MVP (B2C Happy Path)
sidebar_label: Phase 1
sidebar_position: 3
description: End-to-end tourist browse → book → pay → provider payout.
---

## TL;DR

- **MVP:** tourist discovers a transfer, books, pays by card; provider receives net payout after completion.
- DBML-first for Catalog, Booking, Payments; build order PRV → CAT → BKG → PAY → NOT.
- B2C enters `CONFIRMED` on payment; snapshots frozen on CheckoutSession.

## About this document

Phase 1 scope, DBML gates, deliverables by repo/context, and exit criteria.

| Topic | Document |
| --- | --- |
| Roadmap overview | [Phasing Roadmap](/docs/roadmap) |
| Prior phase | [Phase 0](/docs/roadmap/phase-0-foundation) |
| Next phase | [Phase 2](/docs/roadmap/phase-2-marketplace-depth) |
| Resolved decisions | [Open Questions](/docs/ambiguities/open-questions) (Decision Log) |

---

| [← Phase 0](/docs/roadmap/phase-0-foundation) | [Phase 2 →](/docs/roadmap/phase-2-marketplace-depth) |

---

## Phase 1 — MVP (B2C happy path)

### Audit history

| Date | Scope | Notes |
| --- | --- | --- |
| 2026-08-10 | Provider verification queue (PRV) | API: `GET team/providers/profiles` (index + show) with pagination; web: `/team/providers/profiles` list/detail with approve, reject, and request-correction flows; team admin session hydration aligned to flat `AdminSessionSerializer` payload |

> **Last verified:** 2026-08-10 against `red-cab-api/` and `red-cab-web/` (admin provider verification queue).

### Goal

A tourist can discover a transfer service, book it, pay by card, and the provider receives their net payout — with commission frozen on the booking snapshot.

### How to proceed (DBML-first)

Do **not** start Managers/routes/UI for a context until that context’s Phase 1 tables are designed in DBML and migrated. Recommended build order:

```text
1. catalog.dbml   → migrate Geography → Listing → ProviderAsset → Slot → Pricing (basic)
2. bookings.dbml  → migrate CheckoutSession + Booking + immutable snapshots (FKs to tourists_profiles / providers_profiles)
3. payments.dbml  → migrate commission rate, charge, payout queue, refund stub if needed
4. Then code:     PRV flows → CAT → BKG → PAY → NOT booking email
```

| Step | DBML file | Tables (minimum) | Then implement |
| --- | --- | --- | --- |
| 1a | `providers.dbml` (already designed) | `providers_profiles` + satellites | PRV registration, docs, Admin approve |
| 1b | `catalog.dbml` (**new**) | districts, areas, listings, photos, provider_assets, availability_slots, pricing_policies (+ basic mode fields) | Geography → Assets → Listings → Availability → Pricing → discovery |
| 1c | `bookings.dbml` (**new**) | checkout_sessions, bookings (+ price/commission/cancellation snapshots, fulfillment payload), seat allocation | CheckoutSession → payment → Booking materialization |
| 1d | `payments.dbml` (**new**) | commission_rate_settings, provider_connected_accounts, charges, payout_queue_entries, refunds | Stripe Connect + payout queue |
| 1e | `redcab.dbml` | consolidate new tables into the index diagram | — |

**Profile FK conventions for Phase 1**

- Listing / provider refs → `providers_profiles.id` (`provider_id`)
- Booking buyer → `tourists_profiles.id` (`tourist_id`)
- Portal gates: Provider endpoints require provider profile (+ Approved where required); Tourist endpoints require tourist profile

### Deliverables

#### Schema design gate (before feature code)

**red-cab-api**

- [x] `docs/db/catalog.dbml` designed and reviewed against [../architecture/data-model.md](/docs/architecture/data-model) §5.3 / §6.3
- [x] `docs/db/bookings.dbml` designed (`checkout_sessions`, Booking + snapshots + fulfillment payload; buyer = tourist profile)
- [x] `docs/db/payments.dbml` designed (commission rate, provider connected account, charge, payout queue, refund stub)
- [x] `docs/db/redcab.dbml` updated to include Phase 1 tables
- [x] Migrations applied for the above (DBML → migration → model stubs)

#### Provider Onboarding & Verification (`PRV`)

**red-cab-api**

- [x] Provider registration by type — creates/updates `providers_profiles` + matching type-detail row (Private Car, Charter Bus, Tour Guide, etc.)
- [x] Document upload and verification checklist (`providers_documents`, checklist on profile)
- [x] Admin approve / reject workflow (status + license/support-trial side effects)
- [x] Provider Status read contract exposed to Catalog (`{ provider_id, status, license_valid_until }`)
- [x] Provider portal auth gated on provider profile presence (Approved required for listing create; active Stripe Connected Account required for publish — `INV-12`, `LC-12`)

**red-cab-web**

- [x] Provider registration and document upload flows (Provider Portal)
- [x] Admin provider verification queue (`/team`)

#### Catalog & Inventory (`CAT`) — basic

**red-cab-api**

- [ ] Geography module: District / Area hierarchy (EN + JA labels)
- [ ] Listings module: create, configure, publish (≥1 photo, `INV-10`; publish blocked without verified Stripe Connected Account — `INV-12`)
- [ ] Provider Asset module: register vehicles/guides (`provider_assets`); slots bound to `asset_id` (`CON-4`)
- [ ] Availability module: slots, seat counter, overlap prevention per asset; per-vehicle bookings consume 100% slot capacity (`CON-6`)
- [ ] Pricing module: per-person and per-vehicle modes; **`calculate_quote()` as sole pricing authority** (`PRC-1`); commission rounding `FLOOR(gross × rate)` (`PAY-11`)
- [ ] Discovery: listing list and detail (District → Area navigation — Decision Log `AMB-020`)

**red-cab-web**

- [ ] Tourist discovery — listing list and detail (District → Area navigation)
- [ ] Provider asset management (register vehicles/guides before slot creation)
- [ ] Server-rendered price on listing detail (no client-side price computation)
- [ ] Provider listing management (create, configure, publish)

#### Booking & Checkout (`BKG`) — core

**red-cab-api**

- [ ] CheckoutSession flow: snapshot freeze + seat reservation at session creation; PaymentIntent keyed to `checkout_session_id` (`BKG-9`, `CON-1`, `CR-1`)
- [ ] Fulfillment payload capture at checkout (pickup/dropoff addresses, passenger name/phone, luggage count; optional flight number and special notes — `BKG-11`)
- [ ] On payment success: materialize Booking from CheckoutSession snapshot → **`CONFIRMED`** (B2C happy path skips `PENDING` — `BKG-10`)
- [ ] Booking references `tourist_id` → `tourists_profiles`, `provider_id` → `providers_profiles`, plus listing/slot ids
- [ ] Core state machine: **`CONFIRMED → COMPLETED → PAYOUT_QUEUED`** (B2C happy path; full cancellation/refund paths in Phase 2)
- [ ] Provider **Mark Delivered** action; system auto-completes 24h after service end if unconfirmed (`LC-5`, `OPR-11`, `OPR-12`; operational timezone `Asia/Tokyo`)
- [ ] Immutable Price, Commission, and Cancellation Policy snapshots copied from CheckoutSession (`INV-1`)
- [ ] Tourist booking list and detail API

**red-cab-web**

- [ ] Checkout flow (fulfillment fields + policy agreement gate)
- [ ] Provider incoming bookings with **Mark Delivered**
- [ ] Tourist booking list and detail views

#### Payments & Payouts (`PAY`) — Stripe B2C

**red-cab-api**

- [ ] Stripe Connect: **Separate Charges & Transfers** — charge Tourist on Platform account at checkout (`PAY-13`; Decision Log `AMB-002`)
- [ ] PaymentIntent amount MUST match CheckoutSession snapshotted gross; commission split per `PAY-11` (`FLOOR(gross × rate)`, `net = gross − commission`)
- [ ] Payout queue entry on `COMPLETED` with lifecycle **`QUEUED → PROCESSING → DISBURSED | FAILED`** (`LC-13`, `LC-14`, `PAY-14`)
- [ ] Stripe Transfer to Provider Connected Account on disbursement
- [ ] Admin commission rate setting (`PAY-2`)

**red-cab-web**

- [ ] Checkout payment step (Stripe)
- [ ] Admin commission rate setting UI (`/team`)

#### Notifications (`NOT`)

**red-cab-api**

- [ ] Booking confirmation email on `BookingCreated` / `BookingConfirmed`
- [ ] Language-aware rendering from recipient preference (`OPR-9`)

**red-cab-web**

- [ ] (No dedicated UI — email delivery only)

#### Web surfaces (minimum)

**red-cab-web**

- [ ] Tourist App: discovery, listing detail with server-rendered price, checkout, booking history
- [ ] Provider Portal: registration, asset management, listing management, incoming bookings (Mark Delivered)
- [ ] Admin Panel (`/team`): provider verification, commission rate

**red-cab-api**

- [ ] All endpoints backing the above surfaces

### Out of scope (Phase 1)

- Reviews, Corporate quotations/invoices, refunds/cancellation engine, bundle bookings
- Advanced pricing (tiers, seasonal, extra charges) — schema may reserve columns/tables; product behavior in Phase 2
- SMS, license-expiry automation, support-trial gating
- Passenger manifests and Corporate quotation flows (Corporate **profile** already exists from Phase 0)

### Resolved decisions applied in Phase 1

Phase 1 implementation follows the Decision Log in [../ambiguities/open-questions.md](/docs/ambiguities/open-questions) (2026-07-29): capture at checkout on Platform account (`AMB-001`), Separate Charges & Transfers (`AMB-002`), platform-controlled payout queue after `COMPLETED` (`AMB-003`), snapshots at CheckoutSession creation (`AMB-007`), B2C enters `CONFIRMED` on payment success (`AMB-011`), District → Area discovery (`AMB-020`), PRD vehicle taxonomy on `provider_assets` (`AMB-023`).

### Open decisions for Phase 1

| AMB     | Topic              | Working assumption                                           |
| ------- | ------------------ | ------------------------------------------------------------ |
| AMB-021 | Auth methods       | Email/password + Google OAuth at launch                      |
| AMB-022 | Guest browsing     | Defer guest-scope UI; IAM supports optional-auth marketplace namespace |
### Exit criteria

**Both repos**

- [ ] Phase 1 DBML files (`catalog`, `bookings`, `payments`) exist and match applied migrations
- [ ] An Admin can approve a Provider; the Provider can publish a Listing with photos and availability
- [ ] A Tourist can browse listings (District → Area), see a consistent `PriceBreakdown`, complete checkout with fulfillment details, and pay by card
- [ ] CheckoutSession creation, snapshot freeze, and seat decrement commit atomically — no overbooking under concurrent load (`CON-2`, `CON-3`, `BKG-9`)
- [ ] On payment success, Booking materializes as `CONFIRMED` with immutable snapshots matching the CheckoutSession (`INV-1`, `BKG-10`)
- [ ] Stripe charge on Platform account succeeds; commission split matches frozen snapshot (`INV-2`, `PAY-11`, `PAY-13`)
- [ ] Provider receives net payout via payout queue after booking completes (`QUEUED → DISBURSED`)
- [ ] Provider can Mark Delivered; system auto-completes 24h post-service-end if unconfirmed (`OPR-11`, `OPR-12`)
- [ ] Tourist and Provider receive booking confirmation email within 60 seconds (`OPR-8`)
- [ ] No client-side price computation anywhere in the web app (`PRC-1`)

---
