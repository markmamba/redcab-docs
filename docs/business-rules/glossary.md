---
title: Glossary
sidebar_position: 1
description: Ubiquitous language and shared terminology for Red Cab Marketplace.
---

## TL;DR

- **Dependency root** of the planning set: every other document uses these terms with exactly these meanings.
- Terms are grouped by bounded context (6 core + 2 supporting); each term is defined once in its **owning context**.
- Covers actors, money/JPY, snapshots, aggregates, and context-specific vocabulary through Notifications.

## About this document

Ubiquitous language for Red Cab Marketplace — change terms here first before other docs.

| Topic | Document |
| --- | --- |
| Invariants (`INV-`, `LC-`, `PRC-`, `PAY-`, `BKG-`, `CON-`, `OPR-`) | [Business Rules](/docs/business-rules/invariants) |
| Observable behavior | [Requirements](/docs/requirements) |
| Aggregates & ownership | [Domain Models](/docs/domain/domain-models) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## How to use this document
- Terms are grouped by bounded context (the locked 6 core + 2 supporting baseline).
- A term is defined once, in its **owning context**, and only referenced elsewhere.
- `Cross-cutting` terms apply across all contexts.
- PRD story references (e.g. `A-03`, `E-10`) point to `notes/redcab-prd.pdf` in the planning repo (not published on this site).
- Naming convention for code: contexts map to `app/modules/<context>`; aggregates are PascalCase; events are past-tense (`BookingConfirmed`).

---

## Cross-cutting terms

- **Actor** — a person/system interacting with the platform: Visitor, Tourist, Corporate Client, Provider (Pending/Approved), Platform Admin.
- **Tourist (Consumer)** — an authenticated individual traveler who browses, books, pays, and reviews. Demand side.
- **Corporate / Group Client** — a school/company/group coordinator account (`account_type = Corporate`) that can request quotations, pay by bank transfer, and submit manifests. Demand side, COR.
- **Provider (Supplier / Client)** — a verified operator (Private Car, Charter Bus, Tour Guide, Tour Guide + Driver) that lists services and receives bookings. Supply side. (Note: the raw notes call this a "Client"; in code/docs we use **Provider** to avoid collision with "Corporate Client".)
- **Platform Admin** — internal Red Cab staff with full override access. Authenticates via a **separate Admin principal** (`Identities::Admin` / `admin_users`); Admin is **not** a value on marketplace `Account.role`.
- **Platform** — Red Cab itself, the technology intermediary that earns commission.
- **Money / JPY minor units** — all monetary values are integers in Japanese Yen (JPY has no decimal subunit in practice; stored as whole yen). No floats for money. Commission rounding uses `FLOOR(gross × rate)`; `net = gross − commission` (`PAY-11`).
- **Service Timezone** — fixed platform-wide operational timezone: `Asia/Tokyo` (JST). Slot windows, cancellation-tier cutoffs, and completion timers are evaluated in JST; persisted timestamps use `TIMESTAMPTZ` (UTC storage).
- **Snapshot** — an immutable copy of a value (price, commission rate, cancellation policy, fulfillment payload) frozen at a defined instant (CheckoutSession creation) so later changes never alter an in-flight or historical record. See [Business Rules](/docs/business-rules/invariants).
- **Domain Event** — a past-tense, in-process notification (e.g. `ProviderApproved`, `BookingCompleted`) that decouples contexts; consumed by Notifications and cross-context cascades.
- **Bounded Context** — a logical module boundary with its own ubiquitous language; in this project a namespaced module inside one modular-monolith Rails app.
- **Aggregate** — a cluster of domain objects treated as a single transactional/consistency unit, addressed by its root entity.
- **Provider Type** — one of: `Private Car / Luxury Transfer`, `Charter Bus Operator`, `Tour Guide`, `Tour Guide + Driver`. Set at registration; immutable without Admin action (`A-03`).
- **Language Preference** — `EN` or `JA`; drives UI rendering and notification language. Tourist app defaults to EN; Client Portal defaults to JA (`G-03`, `G-04`).

---

## 1. Provider Onboarding & Verification (core)

- **Onboarding** — the lifecycle from provider registration to Approved/Active.
- **Pending Provider** — registered but not yet approved; read-only Pending screen, invisible to tourists (`1.4`).
- **Approved Provider** — verified operator with full Client Portal access (`1.5`).
- **Verification Checklist** — Admin's structured approval list: business registration, license validity, insurance, profile photo (`A-05`).
- **License Document** — uploaded proof (MLIT Transport License, Guide License, Company Registration, Insurance, ID). Type-dependent required set (`A-04`).
- **License Expiry / Expiry Date** — Admin-entered date after which an operator is unlicensed; drives auto-warning and auto-pause (`A-06`).
- **Listing Auto-Pause** — on license expiry, all of a provider's listings are set to Paused automatically (`A-06`).
- **Support Trial (3-Month Free Support)** — free support window starting at Admin approval date; after expiry support is gated (`A-07`).
- **Provider Status** — `Pending | Approved | Rejected | Suspended`. Exposed to other contexts for access gating.
- **Stripe Connected Account** — Provider's Stripe Connect account for receiving net payouts. Must be active and verified before any Listing may be Published (`LC-12`). **Owned by Payments** (`payments_provider_connected_accounts`); PRV onboarding is the flow, PAY is the data owner. Catalog reads `payout_capability(provider_id)` as a conformist sync contract — never PAY's tables directly.

## 2. Catalog & Inventory (core)

> Owns geography taxonomy, listings, pricing configuration + calculation authority, availability/seat inventory, and provider assets. Internal modules: **Geography**, **Listings**, **Pricing**, **Availability**, **Search**.

- **District** — top-level geographic navigation unit: a Japanese **prefecture** (都道府県) **or designated city** (政令指定都市 — `AMB-036`). Carries EN + JA labels, slug, optional centroid. Shown only if it has ≥1 published listing in any child Area (`B-01`, `B-05`, `INV-8`).
- **Area** — second-level unit: a **municipality** (市町村) or **ward** (区) within a designated city. Each Listing is located in exactly one Area. Shown only if it has ≥1 published listing (`B-02`, `INV-8`). Seeded from official administrative codes (`ADR-013`).
- **Municipality code** — 5-digit 全国地方公共団体コード (JIS X 0402); stable seed key for Areas.
- **Tourism tag** — *(future)* curated discovery label (Ginza, Fuji Five Lakes) attached to Listings, not an Area.
- **Listing (Service Listing)** — a bookable service published by a Provider, typed by Provider Type, with photos, pricing, location, and availability (`C-01`).
- **Listing Status** — `Draft | Published | Paused/Unpublished | Unlisted`. Published = visible to tourists; Unlisted = hidden by Admin/geography action; historical bookings always preserved (`C-11`, `B-05`).
- **Provider Asset (`provider_assets`)** — a first-class, Provider-owned physical resource: a specific vehicle or guide instance (`id`, `provider_id`, `license_plate_or_vin`, `capacity`, `vehicle_category`). Slots reference `asset_id`; overlap constraints are **per-asset** (`CON-4`). Canonical vehicle categories follow PRD taxonomy: Alphard, HiAce, Sedan, Limousine (private car); 20 / 40 / 50-seat bands (charter bus).
- **Asset** — synonym for **Provider Asset** in domain docs; the resource a Slot consumes.
- **Photo** — JPG/PNG/WebP image ≤5MB; first photo is the thumbnail; ≥1 required to publish (`C-02`).
- **Pricing Mode** — `Per Person` (price × seats) or `Per Vehicle / Flat Rate` (flat regardless of pax). Per-vehicle bookings consume 100% of slot capacity (`CON-6`). (`C-03`)
- **Group Size Tier** — a `(min pax, max pax, price)` band; up to 5; non-overlapping (`C-04`).
- **Duration Pricing** — rates per duration option: 2-Hour / Half-Day / Full-Day / Custom (`C-05`).
- **Seasonal Override** — a date-range price override or multiplier with a label (e.g. "New Year Rate") (`C-06`).
- **Extra Charge** — a named line item (mandatory/optional) with a trigger (Always / Late-Night / Holiday / Per Item), e.g. tolls, child seat (`C-07`).
- **Cancellation Policy** — up to 4 tiers of `(hours before service, refund %)`; Platform Default applies if none set; immutable for confirmed bookings (`C-08`).
- **Pricing (module)** — the single authority that computes a **Price Breakdown** via `calculate_quote(listing, params, at:)`. No other context computes price.
- **Price Breakdown / Quote** — computed result: base price, tier/duration/seasonal adjustments, extra charges, total (tax-inclusive for B2C). Distinct from a corporate **Quotation**.
- **Availability Slot (Slot)** — a bookable window: date, start time, end time, max capacity, bound to a specific Provider Asset (`C-09`). Times interpreted in Service Timezone (JST).
- **Seat Counter / available_seats** — remaining capacity on a slot; owned here, decremented transactionally during CheckoutSession seat hold (`E-11`).
- **Fully Booked** — slot with `available_seats = 0`; shown but not bookable (`B-03`, `E-11`).
- **Search / Filter / Sort** — discovery over published listings by date, type, language, group size, price; sorts: Recommended / Price / Rating / Reviews / Newest (`D-01..D-05`). Primary navigation: **District → Area** hierarchy; service type is a filter (`D-02`).

## 3. Booking & Checkout (core)

> Internal modules: **Checkout** (CheckoutSession + PaymentIntent + seat hold) and **Order Lifecycle** (state machine, completion, manifest, bundle, multi-day).

- **CheckoutSession** — pre-booking aggregate created when a Tourist initiates checkout. Holds frozen Price Snapshot, Commission Snapshot, Cancellation Policy Snapshot, Fulfillment Payload, seat reservation, and links to the Stripe PaymentIntent. On successful payment, a Booking is materialized from the session (`BKG-9`).
- **Booking** — a paid reservation of a slot by a Tourist/Corporate Client; the central order aggregate. B2C card checkout enters at `CONFIRMED` immediately after payment success (`BKG-2`, `BKG-10`).
- **Checkout** — the synchronous flow: select slot → enter fulfillment details → review snapshotted summary → agree to policy → pay via PaymentIntent.
- **Fulfillment Payload** — operational fields captured at checkout and copied immutably onto the Booking: pickup address, drop-off address, optional flight number, passenger name, passenger phone, luggage count, optional special notes (`BKG-11`).
- **Price Snapshot** — the Price Breakdown frozen at CheckoutSession creation; immune to later provider changes (`C1`, `E-02`, `PRC-8`).
- **Booking State** — `PENDING | CONFIRMED | COMPLETED | PAYOUT_QUEUED | CANCELLED | REFUNDED`. B2C card path enters at `CONFIRMED`; `PENDING` retained for corporate / pre-payment paths. Governed by the Booking State Machine (`E-09`).
- **Seat Reservation** — atomic decrement of `available_seats` during CheckoutSession creation (or restoration on session expiry/cancel); Booking materialization inherits the held seats (`CON-1`, `BKG-9`).
- **Bundle Booking** — a car + guide booked together; creates 2 Booking records linked by `bundle_booking_id`; commission per sub-booking (`E-03`).
- **Multi-Day Package** — a single-provider day-by-day itinerary booked as one purchase; all days' availability checked before checkout (`E-04`).
- **Passenger Manifest** — list of passenger names/age-groups for a group booking, viewable by the Provider (`E-08`).

## 4. Payments & Payouts (core)

- **Commission Rate** — platform-wide percentage set by Admin; **owned here**; applies only to new bookings (`E-10`, Admin Panel).
- **Commission Snapshot** — `{ gross_amount, commission_rate_snapshot, commission_amount, net_payout_amount }` frozen on CheckoutSession and copied to Booking; computed per `PAY-11`. Refunds use these, never the live rate (`E-10`, `E-12`).
- **Gross Amount** — total amount the buyer pays (including mandatory extra charges); B2C prices are tax-inclusive (`PAY-12`).
- **Net Payout Amount** — `gross_amount − commission_amount` (whole JPY).
- **Stripe Connect** — marketplace payment rails: charge Tourist on the **Platform account** (Separate Charges & Transfers); hold funds until service completion; transfer net share to Provider Connected Account via platform-controlled payout queue (`PAY-13`).
- **Payout Queue Entry** — Payments-owned record of net amount owed to a Provider after Booking `COMPLETED`. Lifecycle: `QUEUED → PROCESSING → DISBURSED | FAILED` (`PAY-14`). Booking state `PAYOUT_QUEUED` indicates a queue entry was created.
- **Refund** — return to original payment method computed from the snapshotted cancellation policy; Provider/Admin-initiated cancellations always refund 100% (`E-12`).
- **Bank Transfer (Furikomi)** — manual Japanese corporate bank-transfer payment; Admin marks paid (`E-07`).
- **Payments Overview** — Admin screen of all transactions with snapshotted commission splits (`E-13`).

## 5. Corporate Quotation & Invoicing (core)

- **Quotation Request** — a Corporate Client's custom-price request (trip name, dates, pax, stops, requirements) (`E-05`).
- **Quotation (Omitsumorisho)** — Admin-issued formal quote PDF with line items, 10% consumption tax, bank details, validity date (`E-06`).
- **Invoice (Seikyusho)** — formal invoice PDF auto-generated when a quotation is accepted (`E-06`).
- **Quotation Status** — `Pending | Sent | Accepted | Rejected | Expired`.
- **Quote-to-Booking Conversion** — accepting a quotation creates a Booking via command into Booking; corporate pre-payment handling is scoped separately (`AMB-027`).
- **Consumption Tax** — Japanese 10% tax line itemized on corporate documents; B2C listing/checkout prices are tax-inclusive (`PAY-12`).

## 6. Reviews & Ratings (core)

- **Review** — a verified-booking-only star rating (1–5) + optional text + photos, tied to a Completed booking (`F-01`).
- **Pending Moderation** — review state before public visibility; Admin approves/removes (`F-01`, `F-03`).
- **Provider Response** — public reply by the Provider to a review (`F-02`).
- **Rating Score** — listing's average of approved reviews, with review count (`F-04`).
- **Review Link** — emailed link valid 14 days from completion; one review per booking (`F-01`).

## 7. Identity & Access (supporting)

- **Account** — an authenticated marketplace identity with credentials and a coarse **Role** claim (`Tourist | Corporate | Provider`). Does **not** include Admin.
- **Admin (principal)** — separate authenticatable identity (`Identities::Admin` / `admin_users`) for Platform Admin; gates the Admin Panel (`/team`). Not stored as `Account.role`.
- **Role** — `Tourist | Corporate | Provider`; gates Tourist App, Corporate Client Portal, and Provider Portal surfaces. Admin authorization uses the Admin principal, not Role.
- **Authentication** — email/password (min 8 chars, 1 number) and/or Google OAuth (`A-01`, `A-02`).
- **Account Lockout** — 15-minute lock after 5 consecutive failed logins (`A-02`).
- **Session / Token** — SPA auth credential issued on login.

## 8. Notifications (supporting)

- **Notification** — an outbound email or SMS triggered by a domain event, rendered in the recipient's Language Preference (`G-01..G-04`).
- **Channel** — `Email | SMS`.
- **SLA** — confirmation notifications dispatched within 60 seconds of the triggering event (`G-01`, `G-02`).
- **Cron / Scheduled Alert** — time-based jobs: license-expiry warnings, trial-expiry, overdue registrations/quotations/payments, auto-completion timers.

---

## Terms intentionally avoided / disambiguated
- **"Client"** — ambiguous in raw notes (means Provider in the Client Portal, but also "Corporate Client"). Use **Provider** for suppliers and **Corporate Client** for Corporate Client buyers.
- **"Quote"** — reserve **Price Breakdown** for the computed B2C price; reserve **Quotation** for the corporate document.
- **"Cancellation policy" vs "refund"** — policy is the rule (config); refund is the computed money returned.
- **"Admin" vs `Role`** — Admin is a standalone principal; never conflate with marketplace Account roles.

