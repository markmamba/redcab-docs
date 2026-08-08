---
title: Aggregate Ownership
sidebar_position: 2
description: Conceptual data model for Red Cab Marketplace.
---

## 5. Aggregate Ownership by Bounded Context

Each context owns a small set of **aggregates** (consistency boundaries addressed through a root). The following restates the aggregates fixed in [../domain/domain-models.md](/docs/domain/domain-models) §3 and [./bounded-contexts.md](/docs/architecture/bounded-contexts); this model does not add, remove, or re-home any aggregate.

### 5.1 Identity & Access (supporting)
- **Account** (root) — the authenticatable marketplace identity behind Tourist, Corporate, and Provider Actors. Holds credentials/OAuth identities, Role assignment, Language Preference, and the lockout counter as one consistency boundary (`OPR-1`). Admin is **not** a Role on Account.
- **Admin** (root, separate principal) — Platform Admin authentication for `/team`; isolated from marketplace Account sessions (`Identities::Admin` / `admin_users`).

### 5.2 Provider Onboarding & Verification (core)
- **ProviderApplication** (root: `Provider`) — operator identity, Provider Type, verification state, right to operate. Status is the mutable fact other contexts observe (`LC-7`, `INV-9`, `LC-9`).
- **LicenseRecord** (root) — license number and expiry that gate the right to be `Published` (`INV-7`, `OPR-3`).
- **SupportTrial** (root) — the 3-month free-support window starting at approval (`OPR-2`).

### 5.3 Catalog & Inventory (core)
- **ProviderAsset** (root) — a Provider-owned vehicle or guide resource (`license_plate_or_vin`, `capacity`, `vehicle_category`); Slots reference `asset_id` for per-asset overlap prevention (`CON-4`, `AMB-023`).
- **Listing** (root) — a bookable service with type-specific attributes, photos, location, and a reference to its pricing policy (`INV-8`, `INV-10`, `LC-10`, `INV-12`).
- **PricingPolicy** (root) — pricing configuration (mode, group tiers, duration, seasonal overrides, extra charges) and the Cancellation Policy; the basis for the single calculation authority (`PRC-1..8`).
- **AvailabilitySlot** (root) — a bookable window on a specific Asset and the **owner of `available_seats`** (`INV-3`, `CON-3`, `CON-4`).
- **District / Area** (Geography reference data) — admin-managed taxonomy with EN/JA labels (`INV-8`, `OPR-10`).

### 5.4 Booking & Checkout (core)
- **CheckoutSession** (root) — pre-booking checkout unit holding frozen Price/Commission/Cancellation snapshots, Fulfillment Payload, seat hold, and PaymentIntent reference until payment succeeds or session expires (`BKG-9`, `PRC-8`).
- **Booking** (root) — the central order aggregate materialized from a successful CheckoutSession, carrying copied immutable snapshots, Fulfillment Payload, and lifecycle state (`INV-1..4`, `LC-1..6`, `BKG-1..11`). B2C card path enters at `CONFIRMED` (`BKG-10`).
- **BundleBooking** (root) — links two independent Bookings (car + guide) as one purchase, each with independent commission (`BKG-3`).
- **PassengerManifest** (root, keyed by `booking_id`) — group passenger roster for a confirmed group Booking (`BKG-6`).

### 5.5 Payments & Payouts (core)
- **Payment** (root, charge record) — the buyer-side money movement for a Booking (`PAY-5`, `FIN-3`, `FIN-9..10`).
- **ProviderConnectedAccount** (root) — the Provider's Stripe Connect destination; lifecycle driven by Stripe webhooks; gates listing publish (`INV-12`, `LC-12`) and payout transfers (`PAY-14`).
- **PayoutQueueEntry** (root) — the Net Payout owed to a Provider after completion; lifecycle `QUEUED → PROCESSING → DISBURSED | FAILED` (`LC-6`, `LC-13`, `LC-14`, `FIN-4..5`).
- **Refund** (root) — a return of funds computed from snapshot + snapshotted policy (`PAY-6`, `PAY-7`, `FIN-6`).
- **CommissionRateSetting** (root) — the platform-wide rate read at checkout (`PAY-2`).
- **ReconciliationRecord** (root) — bank-transfer receipt facts (manual, `PAY-9`).

### 5.6 B2B Quotation & Invoicing (core)
- **QuotationRequest** (root) — a Corporate Client's custom-price request (`OPR-5`).
- **Quotation** (root) — the Admin-issued formal quote with line items, 10% tax, validity, and status; converts to a Booking only from `Accepted` (`LC-11`, `PAY-10`).
- **Invoice** (root) — the formal Seikyusho issued on acceptance.

### 5.7 Reviews & Ratings (core)
- **Review** (root) — one verified tourist's rating/text/photos for a completed Booking, plus the provider response (`INV-5`, `BKG-7`, `OPR-6`, `OPR-7`).
- **RatingSummary** (root) — per-listing aggregate of approved reviews; the authoritative score Catalog displays (`OPR-6`).

### 5.8 Notifications (supporting)
- **NotificationDispatch** (root) — a single rendered, addressed, dispatched message; idempotent per (event, recipient, channel) (`OPR-8`, `OPR-9`).
