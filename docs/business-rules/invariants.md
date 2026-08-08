---
title: Business Rules
sidebar_label: Invariants
sidebar_position: 2
description: Invariants, lifecycle rules, pricing, commission, and booking constraints.
---

## TL;DR

- **What must always be true** — invariants, lifecycle constraints, pricing authority, payment rules, booking rules, concurrency guarantees, operational rules.
- Stable IDs: `INV-`, `LC-`, `PRC-`, `PAY-`, `BKG-`, `CON-`, `OPR-` for traceability.
- Requirements express observable behavior **consistent with** these rules; they never weaken or contradict them.

## About this document

Invariant-oriented business rules — **what** must hold, not **how** it is implemented.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Observable behavior | [Requirements](/docs/requirements) |
| Resolved decisions | [Open Questions](/docs/ambiguities/open-questions) (Decision Log) |

---

## How to read this document
- Each rule has a stable ID for traceability: `INV` (hard invariant), `LC` (lifecycle constraint), `PRC` (pricing authority), `PAY` (payment rule), `BKG` (booking rule), `CON` (concurrency guarantee), `OPR` (operational rule).
- `MUST` = enforced and non-overridable except where an explicit Admin override is named.
- `[Area]` tags the owning domain; `(ref)` cites the PRD story.
- A rule lives in exactly one category; related rules are cross-referenced by ID.

---

## 1. Hard Invariants
*Conditions that must hold at all times. Violation is a system defect.*

- **INV-1** [Booking/Payments] Once a Booking is created, its **Price Snapshot**, **Commission Snapshot**, **Cancellation Policy Snapshot**, and **Fulfillment Payload** MUST be immutable for the life of that Booking, regardless of later changes to listing price, Cancellation Policy, or Commission Rate. (`C1`, `E-10`)
- **INV-2** [Payments] A Booking's `gross_amount = net_payout_amount + commission_amount` MUST always hold, using the snapshotted values computed per `PAY-11`. (`E-10`)
- **INV-3** [Inventory] A Slot's `available_seats` MUST never be negative and MUST never exceed the Slot's max capacity. (`E-11`)
- **INV-4** [Booking] Every Booking MUST reference exactly one Slot and a quantity of seats ≥ 1 that did not exceed the Slot's `available_seats` at reservation time. (`E-01`, `E-11`)
- **INV-5** [Reviews] A Review MUST exist only for a Booking that reached `COMPLETED`, and at most one Review per Booking. (`F-01`)
- **INV-6** [Onboarding] A Provider whose **Provider Status** is not `Approved` MUST have zero tourist-visible Listings. (`1.4`, `C-01`)
- **INV-7** [Onboarding] A Listing belonging to a Provider with an expired License MUST NOT be in `Published` status. (`A-06`)
- **INV-8** [Catalog] A District or Area with zero `Published` Listings MUST NOT be presented to Tourists. (`B-01`, `B-02`)
- **INV-9** [Identity] **Provider Type** MUST be immutable after registration except by explicit Admin action. (`A-03`)
- **INV-10** [Catalog] A Listing MUST NOT be `Published` with zero Photos. (`C-02`)
- **INV-11** [Booking] Historical Booking data MUST be preserved when a Listing is Paused, Unlisted, or its District deactivated — never deleted. (`C-11`, `B-05`)
- **INV-12** [Onboarding/Payments] A Listing MUST NOT be `Published` unless its Provider has an active, verified **Stripe Connected Account**. (`LC-12`)

## 2. Lifecycle Constraints
*Allowed states and transitions for entities with a lifecycle.*

### Booking State Machine (`E-09`)
- **LC-1** Valid Booking States are exactly: `PENDING`, `CONFIRMED`, `COMPLETED`, `PAYOUT_QUEUED`, `CANCELLED`, `REFUNDED`.
- **LC-2** The only permitted transitions are:
  - `PENDING → CONFIRMED`, `PENDING → CANCELLED` (corporate / pre-payment paths)
  - `CONFIRMED → COMPLETED`, `CONFIRMED → CANCELLED`
  - `COMPLETED → PAYOUT_QUEUED`, `COMPLETED → REFUNDED`
- **LC-3** `CANCELLED` and `REFUNDED` are terminal: no transition out of them is permitted.
- **LC-4** A Booking MUST NOT move backward (e.g. `COMPLETED → PENDING`/`CONFIRMED` is forbidden).
- **LC-5** `CONFIRMED → COMPLETED` requires that the service end time (JST) has passed AND either the Provider explicitly marks the service delivered OR 24 hours have elapsed since service end time without cancellation (`OPR-12`).
- **LC-6** `COMPLETED → PAYOUT_QUEUED` creates a **Payout Queue Entry** carrying the pre-frozen **Net Payout Amount**; provider transfer is deferred until queue processing (`PAY-13`, `PAY-14`).

### Provider Status (`A-05`, `A-06`)
- **LC-7** Provider Status values: `Pending`, `Approved`, `Rejected`, `Suspended`.
- **LC-8** Listing creation is permitted only while Provider Status is `Approved`.
- **LC-9** Approval is permitted only after all Verification Checklist items are satisfied. (`A-05`)
- **LC-12** Listing publish (`Published`) is permitted only while the Provider's Stripe Connected Account is active and verified.

### Listing & Quotation Status
- **LC-10** Listing Status values: `Draft`, `Published`, `Paused/Unpublished`, `Unlisted`. Only `Published` Listings are tourist-visible.
- **LC-11** Quotation Status values: `Pending`, `Sent`, `Accepted`, `Rejected`, `Expired`. A Quotation may convert to a Booking only from `Accepted`. (`E-06`)

### Payout Queue Entry (`PAY-14`)
- **LC-13** Payout Queue Entry states: `QUEUED`, `PROCESSING`, `DISBURSED`, `FAILED`.
- **LC-14** Only entries in `QUEUED` may transition to `PROCESSING`; only `PROCESSING` may transition to `DISBURSED` or `FAILED`. `DISBURSED` and `FAILED` are terminal for the entry.

## 3. Pricing Authority
*Who may compute price, and how price is fixed.*

- **PRC-1** [Catalog/Pricing] The **Pricing** module is the single authority for price computation. No other context may compute or re-derive price; all callers use `calculate_quote(listing, params, at:)`. (architecture baseline)
- **PRC-2** A computed **Price Breakdown** MUST be derived from the Listing's configured Pricing Mode, Group Size Tiers, Duration Pricing, Seasonal Overrides, and Extra Charges — applied consistently for display, search filtering, and checkout. (`C-03..C-07`)
- **PRC-3** **Pricing Mode** is exclusive per Listing: `Per Person` multiplies by seat count; `Per Vehicle / Flat Rate` is independent of passenger count. Per-vehicle bookings MUST consume the entire slot per `CON-6`. (`C-03`)
- **PRC-4** Group Size Tiers MUST be non-overlapping; the tier matching the selected pax determines price. (`C-04`)
- **PRC-5** When a Tourist's selected date falls within a Seasonal Override range, the override price/multiplier applies to the Price Breakdown with its label. (`C-06`)
- **PRC-6** Mandatory Extra Charges MUST be included in the Gross Amount and shown as separate line items; Optional Extra Charges apply only when selected. (`C-07`)
- **PRC-7** If a Listing has no Cancellation Policy, the Platform Default Cancellation Policy applies. (`C-08`)
- **PRC-8** The price presented at checkout initiation becomes the **Price Snapshot** on the **CheckoutSession**; see INV-1. (`C-06`, `E-02`, `BKG-9`)

## 4. Payment Rules
*Money, commission, payouts, refunds.*

- **PAY-1** All monetary amounts are whole JPY; fractional yen MUST NOT occur in stored or displayed amounts. (glossary: Money)
- **PAY-2** The **Commission Rate** is platform-wide, owned by Payments/Admin, and applies only to Bookings created after a rate change; historical Bookings retain their **Commission Snapshot**. (`E-10`)
- **PAY-3** Commission MUST be calculated on the total checkout amount including mandatory Extra Charges, not on base price alone. (`C3`, `E-10`)
- **PAY-4** On CheckoutSession creation, the Commission Snapshot (`gross_amount`, `commission_rate_snapshot`, `commission_amount`, `net_payout_amount`) MUST be computed and frozen; it is copied unchanged onto the Booking at materialization. (`E-10`, `BKG-9`)
- **PAY-5** A failed payment MUST result in no Booking record; the CheckoutSession MUST NOT materialize a Booking. Seat holds tied to the session MUST be released. (`E-02`, `BKG-9`)
- **PAY-6** Refund amount MUST be computed from the Booking's snapshotted Cancellation Policy: `refund = gross_amount × (matched_tier_refund_pct / 100)`. (`E-12`)
- **PAY-7** When a cancellation is initiated by Provider or Admin (not the Tourist), the Tourist MUST receive a 100% refund regardless of Cancellation Policy. (`E-12`)
- **PAY-8** A cancelled or refunded Booking MUST reverse/void its Payout Queue entry; payout MUST NOT be disbursed for a Booking whose queue entry is not in a disbursable state. (`E-09`, `E-12`, `LC-14`)
- **PAY-9** [Corporate] A Corporate Bank Transfer Booking becomes `CONFIRMED` only when an Admin records receipt of payment. (`E-07`)
- **PAY-10** [Corporate] A Quotation/Invoice MUST itemize line items and the 10% Consumption Tax. (`E-06`)
- **PAY-11** [Payments] Commission arithmetic MUST use whole JPY: `commission_amount = FLOOR(gross_amount × commission_rate_snapshot)` and `net_payout_amount = gross_amount − commission_amount`, guaranteeing `INV-2` identically.
- **PAY-12** [Payments/Catalog] B2C prices displayed and charged are **tax-inclusive**; corporate formal documents itemize 10% consumption tax separately (`PAY-10`).
- **PAY-13** [Payments] B2C card charges MUST use **Separate Charges & Transfers**: charge the Tourist on the Platform Stripe account at checkout; hold funds on the Platform account until Booking `COMPLETED`; transfer the Provider's net share only via a platform-controlled Payout Queue Entry after completion.
- **PAY-14** [Payments] Each Payout Queue Entry MUST progress through `QUEUED → PROCESSING → DISBURSED | FAILED`; failed transfers MUST be retriable and visible to Admin.

## 5. Booking Rules
*Reservation, checkout, bundles, packages, manifests.*

- **BKG-1** A Tourist MUST agree to the displayed Cancellation Policy before payment; payment is blocked otherwise. (`E-02`)
- **BKG-2** A Booking MUST be materialized only after successful payment of its CheckoutSession; the Booking MUST enter `CONFIRMED` on the B2C card path. (`E-02`, `E-11`)
- **BKG-3** A **Bundle Booking** MUST create two separate Booking records linked by a shared `bundle_booking_id`; each carries its own independent Commission Snapshot. (`E-03`)
- **BKG-4** A **Multi-Day Package** MUST verify availability of every constituent Slot across all days before checkout is allowed; if any day is unavailable, checkout is blocked and the unavailable day is identified. (`E-04`)
- **BKG-5** A Multi-Day Package MUST be single-provider. (`E-04`, scope)
- **BKG-6** A **Passenger Manifest** is permitted only on a confirmed group Booking and is viewable by the assigned Provider. (`E-08`)
- **BKG-7** A Tourist may review only services from their own verified Bookings. (`F-01`, INV-5)
- **BKG-8** Changes to a Listing MUST NOT affect already-confirmed Bookings (price, availability, or policy). (`C-11`, INV-1)
- **BKG-9** [Checkout] Initiating checkout MUST create a **CheckoutSession** that atomically: computes and freezes Price/Commission/Cancellation snapshots, captures the Fulfillment Payload, reserves seats on the Slot, and binds a Stripe PaymentIntent keyed to the session. On payment success, the Booking is constructed from the session snapshots and payload in one operation.
- **BKG-10** [Checkout] B2C card checkout MUST create the Booking in `CONFIRMED` state immediately upon successful payment; there is no `PENDING` state on the happy path.
- **BKG-11** [Checkout] Every Booking MUST carry a **Fulfillment Payload** with: pickup address, drop-off address, optional flight number, passenger name, passenger phone, luggage count (integer ≥ 0), and optional special notes. All fields except flight number and special notes are mandatory at checkout.

## 6. Concurrency Guarantees
*Behavior under simultaneous actions. Stated as guarantees, not mechanisms.*

- **CON-1** Seat reservation MUST be a single atomic operation during CheckoutSession creation: the decrement of `available_seats` and the session record either both take effect or neither does. Booking materialization MUST NOT re-decrement seats. (`E-11`, `BKG-9`)
- **CON-2** When multiple Tourists attempt to reserve the last available seat(s) concurrently, at most enough succeed to reach `available_seats = 0`; all further attempts MUST be rejected with a "now fully booked" outcome. If payment succeeds after seats were lost, the charge MUST be reversed and no Booking created. (`E-02`, `E-11`)
- **CON-3** A Slot reaching `available_seats = 0` MUST be presented as **Fully Booked** and MUST NOT accept new reservations. (`E-11`)
- **CON-4** Two Availability Slots on the **same Provider Asset** MUST NOT overlap in time; a new Slot starting exactly at an existing Slot's end is non-overlapping and allowed. Overlap on **different Assets** is allowed. (`C-10`)
- **CON-5** Cancellation of a Booking or expiry/abandonment of a CheckoutSession MUST return its reserved seats to the Slot's `available_seats` (subject to INV-3). Restoration MUST be idempotent. (`E-09`, `AMB-012`)
- **CON-6** [Inventory] A booking against a **Per Vehicle / Flat Rate** Listing MUST set the Slot's `available_seats` to `0` regardless of passenger count selected (exclusive vehicle use).

## 7. Operational Rules
*Defaults, time-based alerts, moderation, SLAs, and language behavior.*

- **OPR-1** [Identity] After 5 consecutive failed logins, the account is locked for 15 minutes. (`A-02`)
- **OPR-2** [Onboarding] The 3-Month Support Trial starts at the Admin approval date. (`A-07`, `A1`)
- **OPR-3** [Onboarding] When a License is within 30 days of expiry, the Provider is warned; on expiry, all the Provider's Listings are auto-paused; on renewal + Admin update, they are restored. (`A-06`)
- **OPR-4** [Onboarding] A Pending registration with no Admin action for more than 14 days is flagged Overdue. (`A-05`, `A3`)
- **OPR-5** [Corporate] A Quotation Request unanswered for more than 3 business days raises an Admin overdue alert; a Bank Transfer past its deadline raises a payment-overdue alert. (`E-05`, `E-07`)
- **OPR-6** [Reviews] A Review enters **Pending Moderation** and is not public until an Admin approves it; the **Rating Score** is recalculated only from approved Reviews. (`F-01`, `F-03`, `F-04`)
- **OPR-7** [Reviews] The Review Link is valid for 14 days from completion; after expiry no Review may be submitted. (`F-01`, `F2`)
- **OPR-8** [Notifications] Booking confirmation notifications to Tourist and Provider MUST be dispatched within 60 seconds of the triggering event. (`G-01`, `G-02`)
- **OPR-9** [Notifications] Notifications MUST be rendered in the recipient's stored **Language Preference** (Tourist default EN; Provider/Client Portal default JA). (`G-03`, `G-04`)
- **OPR-10** [Catalog] Deactivating a District MUST set all its Listings to `Unlisted` (not deleted), after an explicit Admin confirmation that states the affected count. (`B-05`)
- **OPR-11** [Catalog/Booking] All service windows, cancellation-tier cutoffs, and completion timers MUST be evaluated in **Asia/Tokyo (JST)**; persisted timestamps MUST use UTC (`TIMESTAMPTZ`).
- **OPR-12** [Booking] A `CONFIRMED` Booking MUST auto-transition to `COMPLETED` 24 hours after the Slot's scheduled **end time** (JST) if the Provider has not marked it delivered and the Booking has not been cancelled.

---

## Notes
- Resolved decisions are recorded in [../ambiguities/open-questions.md](/docs/ambiguities/open-questions) Decision Log.
- v2/speculative behavior (cross-provider packages, automated bank reconciliation, bundle discounts, license OCR) is deliberately excluded from this document.

