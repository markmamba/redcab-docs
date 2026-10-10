---
title: Aggregate Ownership
sidebar_position: 2
description: Aggregate roots and ownership by bounded context — restates domain models §3.
---

## TL;DR

- Lists **aggregate roots** per bounded context. Each root is a consistency boundary.
- Restates [Domain models](/docs/30-49-domains/domain-models/domain-models) §3. This page does not add, remove, or re-home aggregates.
- Booking and CheckoutSession own checkout snapshots. Payments owns movement records, not snapshot facts.

## About this document

Conceptual data model — aggregate ownership only.

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Bounded contexts | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Snapshots | [Immutable snapshots](/docs/30-49-domains/data-model/snapshots) |

---

## Identity & Access (supporting)

- **Account** (root) — marketplace identity for Tourist, Corporate, and Provider actors. Holds credentials, OAuth identities, Role, Language Preference, and lockout (`OPR-1`). Admin is not a Role on Account.
- **Admin** (root, separate principal) — Platform Admin for `/team`. Isolated from marketplace Account sessions.

## Provider Onboarding & Verification (core)

- **ProviderApplication** (root: `Provider`) — operator identity, Provider Type, verification state (`LC-7`, `INV-9`, `LC-9`).
- **LicenseRecord** (root) — license number and expiry (`INV-7`, `OPR-3`).
- **SupportTrial** (root) — three-month free-support window from approval (`OPR-2`).

## Catalog & Inventory (core)

- **ProviderAsset** (root) — vehicle or guide resource (`CON-4`, `AMB-023`).
- **Listing** (root) — bookable service (`INV-8`, `INV-10`, `LC-10`, `INV-12`).
- **PricingPolicy** (root) — pricing mode, tiers, cancellation policy (`PRC-1`..`PRC-8`).
- **AvailabilitySlot** (root) — bookable window; owns `available_seats` (`INV-3`, `CON-3`, `CON-4`).
- **District / Area** (Geography reference) — administrative taxonomy ([ADR-013](/docs/30-49-domains/architecture-decisions/adr-013-geography-reference-data)).

## Booking & Checkout (core)

- **CheckoutSession** (root) — pre-booking unit with frozen snapshots, Service Timezone, Fulfillment Payload, Terms acceptance (`PAY-17`), seat hold, Payment Attempt reference (`BKG-9`, `PRC-8`, [ADR-014](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model)).
- **Booking** (root) — order from successful CheckoutSession (`INV-1`..`INV-4`, `LC-1`..`LC-6`, `BKG-1`..`BKG-11`). B2C card path enters at `CONFIRMED` (`BKG-10`).
- **BundleBooking** (root) — links two Bookings (`BKG-3`).
- **PassengerManifest** (root, keyed by `booking_id`) — group roster (`BKG-6`).

## Payments & Payouts (core)

- **Payment** (root) — buyer-side charge (`PAY-5`, `FIN-3`, `FIN-9`, `FIN-10`).
- **ProviderMerchantAccount** (root) — sub-merchant destination (`INV-12`, `LC-12`, `PAY-14`).
- **PayoutQueueEntry** (root) — net payout after completion (`LC-6`, `LC-13`, `LC-14`, `FIN-4`, `FIN-5`).
- **Refund** (root) — return from snapshot and policy (`PAY-6`, `PAY-7`, `FIN-6`).
- **CommissionRateSetting** (root) — platform rate at checkout (`PAY-2`).
- **ReconciliationRecord** (root) — bank-transfer receipt facts (`PAY-9`).

## Corporate Quotation & Invoicing (core)

- **QuotationRequest** (root) — Corporate custom-price request (`OPR-5`).
- **Quotation** (root) — formal quote; converts to Booking from `Accepted` (`LC-11`, `PAY-10`).
- **Invoice** (root) — Seikyusho on acceptance.

## Reviews & Ratings (core)

- **Review** (root) — verified tourist review and provider response (`INV-5`, `BKG-7`, `OPR-6`, `OPR-7`).
- **RatingSummary** (root) — per-listing score from approved reviews (`OPR-6`).

## Notifications (supporting)

- **NotificationDispatch** (root) — one rendered message; idempotent per event, recipient, and channel (`OPR-8`, `OPR-9`).
