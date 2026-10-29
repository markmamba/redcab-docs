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
| Invariants (`INV-`, `LC-`, `PRC-`, `PAY-`, `BKG-`, `CON-`, `OPR-`) | [Business Rules](/docs/70-79-business/business-rules/invariants) |
| Observable behavior | [Requirements](/docs/70-79-business/requirements) |
| Aggregates & ownership | [Domain Models](/docs/30-49-domains/domain-models/domain-models) |
| Context map | [Bounded Contexts](/docs/30-49-domains/bounded-contexts) |
| Open decisions | [Open Questions](/docs/70-79-business/planning/open-questions) |

---

## How to use this document
- Terms are grouped by bounded context (the locked 6 core + 2 supporting baseline).
- A term is defined once, in its **owning context**, and only referenced elsewhere.
- This glossary is the **approved vocabulary** for Tier B docs (requirements, invariants references) and for domain names in specs. [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) applies to how you write around these terms, not to renaming them.
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
- **Service Timezone** — the IANA timezone of the **primary destination** prefecture of a Listing (`catalog_geographies.timezone`, e.g. `Asia/Tokyo`; seeded from `catalog_countries.default_timezone`). Service windows, cancellation-tier cutoffs, and completion timers are evaluated in this zone; **CheckoutSession / Booking** snapshoot `service_timezone` at session creation so historical orders are immune to later geography edits ([ADR-014](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model), [ADR-016](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree)). Persisted instants use `TIMESTAMPTZ` (UTC storage). Phase 1 Japan seeds all nodes as `Asia/Tokyo`.
- **Snapshot** — an immutable copy of a value (price, commission rate, cancellation policy, fulfillment payload) frozen at a defined instant (CheckoutSession creation) so later changes never alter an in-flight or historical record. See [Business Rules](/docs/70-79-business/business-rules/invariants).
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
- **Provider Merchant Account** — Provider's sub-merchant account with the configured payment provider, used to receive net settlement. Must be active and verified before any Listing may be Published (`LC-12`, `INV-12`). Sub-merchant KYC is performed by the payment provider as the licensed party. **Owned by Payments**; PRV onboarding is the flow, PAY is the data owner. Catalog reads `payout_capability(provider_id)` as a conformist sync contract — never PAY's tables directly. *(Formerly "Stripe Connected Account"; renamed with `ADR-015` as the provider is not yet selected — `AMB-040`.)*

## 2. Catalog & Inventory (core)

> Owns geography taxonomy, listings, pricing configuration + calculation authority, asset availability, and provider assets. Internal modules: **Geography**, **Listings**, **Pricing**, **Availability**, **Search**.

Revamp naming crosswalk: [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#naming-tldr).

### Discoverable (listing) \{#discoverable-listing\}

- A Listing that MAY appear in public marketplace **search and browse**. It MUST have status `Published` and MUST meet completeness rules (**BR-21**). `Published` alone is not sufficient (`LC-10`, `INV-8`). See [Naming — pricing visibility](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#pricing-visibility) and [Catalog decisions — discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions#discoverability-completeness).

- **Region** — tourist-facing macro geography for marketplace entry (for example Hokkaido, Kanto). Storage: `catalog_geographies` region level above prefecture. See [Naming — browse geography](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#browse-geography).
- **Prefecture** — administrative subdivision (都道府県); tourist label for Tokyo, Chiba, and the other 47. Product term; storage `level = subdivision`. Filter within a region, not top-level IA.
- **Primary destination** — the single main prefecture destination on a listing. See [Catalog decisions — destination structure](/docs/30-49-domains/catalog/catalog-decisions#destination-structure) and [Naming — destinations](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#destinations-coverage).
- **Additional destination** — optional extra prefecture destinations for discovery scope; does not imply pickup coverage. See [Catalog decisions — destination structure](/docs/30-49-domains/catalog/catalog-decisions#destination-structure).
- **Pickup coverage** — provider-registered geography where pickup is allowed for a listing, separate from destinations. See [Catalog decisions — pickup coverage registration](/docs/30-49-domains/catalog/catalog-decisions#pickup-coverage-registration).
- **Booking location** — tourist-selected pickup point for the booking flow; default drop-off on platform. Municipality/ward picker per [Naming — browse geography](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#browse-geography). Validated against pickup coverage (`BKG-11`).
- **Popular destination** — curated prefecture highlight on home or region (often booking-weighted). Not the legacy **Featured** flag. Distinct from future **Tourism tag**.
- **Package (listing)** — sellable option on one listing with its own vehicle category, passenger limit, duration, start window and price (for example Standard 6-hour, Premium 8-hour). Not **Multi-Day Package** (`E-04`).
- **Verified provider** — provider account meets platform gates required to publish listings (replaces legacy “operable provider”). Distinct from **Provider Merchant Account** verification alone.

- **District** — **(Legacy IA)** a geography node **presented as a top-level navigation unit** — a node with `is_discovery_root = true` ([ADR-016](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree)). Phase 1 Japan (C1): 47 prefectures + 20 designated cities. Carries EN + JA labels and slug. Shown only if its subtree has ≥1 published listing (`B-01`, `B-05`, `INV-8`). In URLs and JSON payloads, maps to `{districtSlug}` / `district_id`.
- **Area** — **(Legacy IA)** a **listable geography node** (`is_listable = true`) within a District's discovery namespace. Each Listing attaches to exactly one Area (`FR-CAT-033`). Carries a **Service Timezone** (IANA string). Shown only if its subtree has ≥1 published listing (`B-02`, `INV-8`). In URLs and JSON payloads, maps to `{areaSlug}` / `area_id`.
- **Subdivision** — administrative `level` for a prefecture (都道府県). Storage term; may also be a discovery root.
- **Municipality** — administrative `level` for a city, town, village, or Tokyo 特別区. May be a discovery root (designated city), a listable leaf, or an intermediate node.
- **Ward** — administrative `level` for an 行政区 of a designated city. Always a listable leaf when present.
- **Discovery root** — **(Legacy)** synonym for a District in storage: `is_discovery_root = true`. Deprecated in revamp product docs.
- **Listable node** — **(Legacy)** synonym for an Area in storage: `is_listable = true`. Revamp uses municipality/ward nodes for pickup coverage and booking location pickers only.
- **Successor geography** — when a node is archived by merger (`INV-11`), the surviving node referenced by `successor_geography_id` — drives redirects and Listing re-placement (`FR-CAT-034`).
- **External code** — official administrative code (2-digit prefecture or 5-digit 全国地方公共団体コード, JIS X 0402); stable seed upsert key with `code_system`.
- **Tourism tag** — *(future)* curated discovery label (Ginza, Fuji Five Lakes) attached to Listings, not an Area.
- **Listing (Service Listing)** — a bookable service published by a Provider, typed by Provider Type, with photos, pricing, location, and availability (`C-01`).
- **Listing Status** — `Draft | Published | Paused/Unpublished | Unlisted`. `Published` is required for marketplace discovery but is not sufficient alone (`LC-10`). Unlisted = hidden by Admin/geography action; historical bookings always preserved (`C-11`, `B-05`).
- **Provider Asset (`provider_assets`)** — a first-class, Provider-owned physical resource: a specific vehicle or guide instance (`id`, `provider_id`, `license_plate_or_vin`, `capacity`, `vehicle_category`). Slots reference `asset_id`; overlap constraints are **per-asset** (`CON-4`). Vehicle categories are Sedan, Minivan, Passenger Van (private car); Commuter Van, Microbus, Large Coach Bus (charter bus). The definitions live in the reference table (see **Vehicle Category**).
- **Vehicle Category** — the type of a vehicle, for example `minivan`, defined by a row in `catalog_vehicle_categories` (see [Vehicle category reference data](/docs/30-49-domains/catalog/catalog-decisions#vehicle-category-reference-data)).
- **Asset** — synonym for **Provider Asset** in domain docs; the resource an **Asset Hold** consumes.
- **Photo** — JPG/PNG/WebP image ≤5MB; first photo is the thumbnail; ≥1 required to publish (`C-02`).
- **Pricing Mode** — `Per Person` (price × seats) or `Per Vehicle / Flat Rate` (flat regardless of pax). In MVP every booking holds the whole asset (`CON-6`). (`C-03`)
- **Group Size Tier** — a `(min pax, max pax, price)` band; up to 5; non-overlapping (`C-04`).
- **Duration Pricing** — rates per duration option: 2-Hour / Half-Day / Full-Day / Custom (`C-05`).
- **Seasonal Override** — a date-range price override or multiplier with a label (e.g. "New Year Rate") (`C-06`).
- **Extra Charge** — a named line item (mandatory/optional) with a trigger (Always / Late-Night / Holiday / Per Item), e.g. tolls, child seat (`C-07`).
- **Cancellation Policy** — up to 4 tiers of `(hours before service, refund %)`; Platform Default applies if none set; immutable for confirmed bookings (`C-08`). Superseded by [Cancellation policy with presets and custom tiers](/docs/30-49-domains/catalog/architecture-decisions/cancellation-policy).
- **Pricing (module)** — the single authority that computes a **Price Breakdown** via `calculate_quote(listing, params, at:)`. No other context computes price.
- **Price Breakdown / Quote** — computed result: base price, tier/duration/seasonal adjustments, extra charges, total (tax-inclusive for B2C). Distinct from a corporate **Quotation**.
- **Availability Slot (Slot)** — **(Legacy)** a bookable window bound to a Provider Asset (`C-09`). Replaced by **Asset Hold**; slice S5 of the [Catalog domain](/docs/30-49-domains/catalog/) removes it.
- **Asset Hold** — one row for each booking attempt that holds one Provider Asset for one time range. It replaces the Slot seat counter (`INV-3`, `CON-4`). See [Catalog decisions — asset holds](/docs/30-49-domains/catalog/catalog-decisions#asset-holds).
- **Asset Schedule / Closure** — the weekly working pattern of a Provider Asset for a date range, and the single days it does not work. Open days are calculated from them.
- **Seat Counter / available_seats** — **(Legacy)** remaining capacity on a slot. Replaced by **Asset Hold** (`INV-3`).
- **Fully Booked** — **(Legacy)** slot with `available_seats = 0`. A date or start time with no free asset is shown as unavailable (`CON-3`).
- **Search / Filter / Sort** — discovery over discoverable listings by date, type, language, vehicle type, group size, price; sorts: Recently added / Price / Most booked / Top rated (see [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions#marketplace-sort-options)). Primary navigation: **Region → Prefecture**; service type is a filter (`D-02`).

## 3. Booking & Checkout (core)

> Internal modules: **Checkout** (CheckoutSession + Payment Attempt + asset hold) and **Order Lifecycle** (state machine, completion determination, manifest, bundle, multi-day).

- **CheckoutSession** — pre-booking aggregate created when a Tourist initiates checkout. Holds frozen Price Snapshot, Commission Snapshot, Cancellation Policy Snapshot, Fulfillment Payload, Terms of Use acceptance (`PAY-17`), seat reservation, and a link to the **Payment Attempt** with the configured payment provider. On verified payment success, a Booking is materialized from the session (`BKG-9`).
- **Payment Attempt** — the provider-side payment record keyed to a CheckoutSession, referenced by a provider discriminator plus an opaque reference rather than a provider-named identifier. *(Formerly "Stripe PaymentIntent".)*
- **Booking** — a paid reservation of a slot by a Tourist/Corporate Client; the central order aggregate. B2C card checkout enters at `CONFIRMED` immediately after payment success (`BKG-2`, `BKG-10`).
- **Checkout** — the synchronous flow: select slot → enter fulfillment details → review snapshotted summary → agree to policy and Terms of Use → pay through the payment provider.
- **Fulfillment Payload** — operational fields captured at checkout and copied immutably onto the Booking: **booking location** (pickup address until structured location ships), drop-off address, optional flight number, passenger name, passenger phone, luggage count, optional special notes (`BKG-11`).
- **Price Snapshot** — the Price Breakdown frozen at CheckoutSession creation; immune to later provider changes (`C1`, `E-02`, `PRC-8`).
- **Booking State** — `PENDING | CONFIRMED | COMPLETED | PAYOUT_QUEUED | CANCELLED | REFUNDED`. B2C card path enters at `CONFIRMED`; `PENDING` retained for corporate / pre-payment paths. Governed by the Booking State Machine (`E-09`).
- **Seat Reservation** — **(Legacy)** atomic decrement of `available_seats` during CheckoutSession creation. Replaced by creating an **Asset Hold** (`CON-1`, `BKG-9`).
- **Bundle Booking** — a car + guide booked together; creates 2 Booking records linked by `bundle_booking_id`; commission per sub-booking (`E-03`). Cancelling one leg does not auto-cancel the other; each leg is cancelled and refunded on its own (`FR-BKG-012`, Decision Log `AMB-017`).
- **Multi-Day Package** — a single-provider day-by-day itinerary booked as one purchase; all days' availability checked before checkout (`E-04`). **Term collision:** not the same as a sellable **package** in [Catalog decisions — packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions#packages-and-pricing-policy) (`BKG-4` itinerary concept vs listing price packages).
- **Passenger Manifest** — list of passenger names/age-groups for a group booking, viewable by the Provider (`E-08`).

## 4. Payments & Payouts (core)

- **Commission Rate** — platform-wide percentage set by Admin; **owned here**; applies only to new bookings (`E-10`, Admin Panel).
- **Commission Snapshot** — `{ gross_amount, commission_rate_snapshot, commission_amount, net_payout_amount }` frozen on CheckoutSession and copied to Booking; computed per `PAY-11`. Refunds use these, never the live rate (`E-10`, `E-12`).
- **Gross Amount** — total amount the buyer pays (including mandatory extra charges); B2C prices are tax-inclusive (`PAY-12`).
- **Net Payout Amount** — `gross_amount − commission_amount` (whole JPY).
- **Payment Provider** — the licensed third party that receives, holds, splits, and releases funds, and performs sub-merchant KYC. It is the legal recipient of Tourist funds; Red Cab is not (`INV-13`, `PAY-13`). Not yet selected (`AMB-040`); engaged only through a capability-declaring adapter so the domain never encodes one provider's topology ([ADR-015](/docs/30-49-domains/architecture-decisions/adr-015-payment-custody-and-control-separation)).
- **Custody** — legal receipt and holding of customer funds. Sits with the Payment Provider at all times and never with Red Cab (`INV-13`).
- **Control (transaction completion)** — Red Cab's authority to determine when a transaction completes and settlement releases (`PAY-15`, `PAY-16`). A condition of the transaction-platform exemption, not an operational preference.
- **Platform Fee** — the mechanism by which Red Cab receives its commission: an amount routed by the Payment Provider equal to the snapshotted `commission_amount`, as consideration for booking orchestration, itinerary management, supplier matching, and customer service. Never a residual of funds Red Cab held (`FIN-12`, `PAY-13`).
- **Completion Determination** — Red Cab's recorded, immutable finding that a Booking's service was delivered, carrying the determining actor, basis, and instant (`PAY-16`). Provider `mark_delivered` and the elapsed-time sweep are inputs to it, not substitutes for it. Triggers settlement release.
- **Payout Queue Entry** — Payments-owned record of net amount owed to a Provider following a completion determination. Lifecycle: `QUEUED → PROCESSING → DISBURSED | FAILED` (`PAY-14`). Booking state `PAYOUT_QUEUED` indicates a queue entry was created. Serves as the evidentiary record of Red Cab's release instruction.
- **Refund** — return to original payment method computed from the snapshotted cancellation policy; Provider/Admin-initiated cancellations always refund 100% (`E-12`). Pre-settlement refunds need no recovery; post-settlement refunds depend on clawback against the Provider as merchant-of-record (`FIN-14`, `AMB-038`).
- **Clawback** — recovery of already-settled funds from a Provider, by balance reversal, deduction from future settlement, or invoice. Required because refund liability sits with the Provider as merchant-of-record (`AMB-038`).
- **Bank Transfer (Furikomi)** — Japanese corporate bank-transfer payment, collected by the Payment Provider through a per-transaction **virtual account**; confirmed by provider event, not by manual Admin entry (`PAY-9`, `E-07`).
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
- **Pending Moderation** — legacy `moderation_status` enum value; new tourist submits **publish** immediately ([ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation), `OPR-6`).
- **Provider report** — Provider flags a published review for Team Admin; the review stays public until Admin removes it (`F-03`, `FR-REV-005`).
- **Provider Response** — public reply by the Provider to a review (`F-02`).
- **Rating Score** — listing average and review count from **published** reviews only (`approved`, not `removed`) (`F-04`, `OPR-6`).
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

