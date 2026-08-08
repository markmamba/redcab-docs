---
title: Phase 2 — Marketplace Depth
sidebar_label: Phase 2
sidebar_position: 4
description: Reviews, advanced pricing, search, refunds, and operational automation.
---

## TL;DR

- **Marketplace depth:** reviews, advanced pricing, search/filter, full cancellation/refund lifecycle.
- DBML-first: `reviews.dbml` then extensions to catalog, bookings, and payments.
- PRV automation (license expiry, support trial) and expanded NOT channels.

## About this document

Phase 2 scope, schema gates, deliverables, and exit criteria.

| Topic | Document |
| --- | --- |
| Roadmap overview | [Phasing Roadmap](/docs/roadmap) |
| Prior phase | [Phase 1](/docs/roadmap/phase-1-mvp) |
| Next phase | [Phase 3](/docs/roadmap/phase-3-b2b-packages) |
| Reviews context | [Reviews & Ratings](/docs/architecture/bounded-contexts/reviews) |

---

| [← Phase 1](/docs/roadmap/phase-1-mvp) | [Phase 3 →](/docs/roadmap/phase-3-b2b-packages) |

---

## Phase 2 — Marketplace depth

### Goal

Feature-competitive B2C marketplace: reviews, flexible pricing, search/filter, refunds, and operational automation.

### How to proceed (DBML-first)

```text
1. reviews.dbml     → migrate Review, photos, provider response, RatingSummary
2. Extend catalog.dbml / bookings.dbml / payments.dbml for advanced pricing, cancellation policy tiers, refunds, bundle link
3. Then code:       REV → CAT advanced → BKG full lifecycle → PAY refunds → PRV automation → NOT
```

| Step | DBML | Then implement |
| --- | --- | --- |
| 2a | `reviews.dbml` (**new**) | Verified reviews, moderation, rating summary |
| 2b | Extend `catalog.dbml` | Pricing tiers, seasonal overrides, extra charges, cancellation tiers (if not already in Phase 1 schema) |
| 2c | Extend `bookings.dbml` | Cancellation context, bundle_booking link |
| 2d | Extend `payments.dbml` | Refunds + payout/refund interlock columns/states (`AMB-005`) |

### Deliverables

#### Schema design gate

**red-cab-api**

- [ ] `docs/db/reviews.dbml` designed and migrated
- [ ] Catalog / Booking / Payments DBML extended for Phase 2 columns (advanced pricing, cancellation, refunds, bundles)
- [ ] `redcab.dbml` updated

#### Reviews & Ratings (`REV`)

**red-cab-api**

- [ ] Verified-booking review submission (`INV-5`, `BKG-7`) — refs `tourist_id` / `listing_id` / `booking_id` by id
- [ ] Admin moderation (`OPR-6`)
- [ ] Provider responses
- [ ] Rating score recalculation; Catalog displays updated score

**red-cab-web**

- [ ] Tourist review submission UI
- [ ] Admin moderation UI (`/team`)
- [ ] Provider response UI
- [ ] Updated rating display on listing detail

#### Catalog & Inventory (`CAT`) — advanced

**red-cab-api**

- [ ] Search, filter, and sort module
- [ ] Advanced pricing: group tiers, duration-based, seasonal/holiday overrides, extra charges
- [ ] Configurable cancellation policies (snapshotted at checkout)
- [ ] Listing pause/restore on license expiry (event-driven cascade from `PRV`)

**red-cab-web**

- [ ] Search, filter, and sort on discovery pages
- [ ] Provider/admin surfaces for advanced pricing and cancellation policy configuration

#### Booking & Checkout (`BKG`) — full lifecycle

**red-cab-api**

- [ ] Complete state machine paths: cancellation, refund, no-show, provider decline (`AMB-013`, `AMB-014`)
- [ ] Seat restoration on cancellation (`CON-5`, `CON-6` — resolved `AMB-012`)
- [ ] Bundle bookings (car + guide link)
- [ ] Auto-confirmation timer for B2B / pre-payment `PENDING` paths only (`AMB-011` superseded for B2C)

**red-cab-web**

- [ ] Cancellation, refund status, and bundle booking UX (Tourist + Provider portals)

#### Payments & Payouts (`PAY`) — refunds

**red-cab-api**

- [ ] Refund engine computed from snapshotted cancellation policy (`PAY-6`, `PAY-7`)
- [ ] Payout/refund mutual-exclusion interlock (`FIN-5`, `PAY-8`)
- [ ] Disbursement and failure states on `payout_queue_entries` (`LC-13`, `LC-14` — resolved `AMB-005`)

**red-cab-web**

- [ ] Refund status display (Tourist booking detail; Admin overview)

#### Provider Onboarding (`PRV`) — automation

**red-cab-api**

- [ ] License expiry cron → listing auto-pause (`INV-7`, `OPR-3`)
- [ ] Support trial expiry gating (`OPR-4`)
- [ ] Overdue registration alerts (`OPR-5`)

**red-cab-web**

- [ ] Admin alerts for overdue registrations and license expiry (if surfaced in UI)

#### Notifications (`NOT`)

**red-cab-api**

- [ ] Cancellation, refund, and review-link emails
- [ ] SMS channel (if `AMB-034` resolves to include in this phase)
- [ ] Scheduled overdue alerts

**red-cab-web**

- [ ] (No dedicated UI — email/SMS delivery only)

### Out of scope (Phase 2)

- B2B quotation/invoicing, bank-transfer reconciliation (Corporate **profile** already exists; quotation tables are Phase 3)
- Multi-day cross-provider packages
- Dedicated search engine (OpenSearch)

### Exit criteria

**Both repos**

- [ ] `reviews.dbml` (+ Phase 2 schema extensions) exist and match applied migrations
- [ ] A Tourist can search, filter, and sort listings; prices in results match checkout for same inputs (`PRC-2`)
- [ ] A Tourist can cancel a booking and receive a refund per the snapshotted policy
- [ ] A Tourist can submit a review only for a completed booking; Admin can moderate
- [ ] Expired provider license auto-pauses listings without manual intervention
- [ ] Bundle booking creates linked legs with correct cross-leg behavior
- [ ] Payout and refund are mutually exclusive per booking's funds (`FIN-5`)

---
