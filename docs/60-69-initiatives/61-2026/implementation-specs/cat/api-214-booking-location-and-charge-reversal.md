---
title: "Check the booking location and reverse the charge when a check fails after payment"
sidebar_label: API · Booking location check
issue: "https://github.com/markmamba/red-cab-api/issues/214"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#pickup-coverage-validation-timing"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#booking-confirmation"
  - "docs/30-49-domains/38-catalog/requirements/tourist-booking.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-213-pickup-coverage-and-discoverable-gate.md"
---

## TL;DR

- Checkout takes one booking location: the id of an active municipality or ward that a tourist can pick.
- Checkout create rejects a location that the listing does not cover.
- The payment attempt checks coverage again, just before payment starts.
- Materialization checks coverage a third time, after payment succeeds.
- A failure after payment reverses the charge, releases the hold and makes no booking.
- The reversal is one refund row with no booking, and it is safe to run twice.
- Does NOT ship the location search endpoint, the web checkout, corporate checkout or the hold recheck.
- Breaking change: Yes, because checkout create needs `booking_location_id` and the current web checkout fails until web issue #157 ships.

## Problem

A tourist can pay for a trip that the provider does not cover.

The platform has no rule for a check that fails after payment.

Checkout needs two address fields, and RedCab uses neither one to check coverage.

Evidence: `app/domains/bookings/checkout_sessions/tourists_create_manager.rb` (no coverage check), `materialize_order_manager.rb` (no reversal path), `docs/db/bookings.dbml` (no location column), issue #214.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Pickup coverage validation timing](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-validation-timing) | Check when checkout is created, and again when the booking is made. A confirmed booking stays valid. |
| Ruling | [Booking confirmation](/docs/30-49-domains/catalog/catalog-decisions/#booking-confirmation) | A failed check after payment reverses the charge and makes no booking. |
| Requirements | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | Observable behavior: one booking location, clear messages |
| Schema | [bookings.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/bookings.dbml) and [payments.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/payments.dbml) | Fulfillment payload, charge and refund columns |
| CON-2, BKG-11, PAY-7 | [Invariants](/docs/70-79-business/business-rules/invariants) | Reversal when payment succeeds after the hold is lost. The fulfillment payload. Refunds are new facts. |
| Slice S6 | [Spec api-213](./api-213-pickup-coverage-and-discoverable-gate.md) | The coverage table and the match service. Merged in red-cab-api#239. |
| Refund code | [red-cab-api#162](https://github.com/markmamba/red-cab-api/issues/162) | Open. This spec does not wait for it (decision 1). |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. A reversal is one `payments_refunds` row with `booking_id` NULL. The migration makes `payments_refunds.booking_id` nullable. The DBML and the refund note change first.** | No refund row, or wait for #162. | #162 is still open and no reversal code exists. The row is the evidence of the reversal (CON-2). |
| 2 | **Owner ruling, 2026-10-26. The location is stored as `booking_location_id` on `bookings_fulfillment_details`. `pickup_address` stays as the detail text. `dropoff_address` is optional in the request, and the API copies the pickup text into it when empty.** | Id only, or remove the drop-off. | Providers keep the street detail. The payload shape and the provider views do not change. |
| 3 | **Owner ruling, 2026-10-26. `booking_location_id` is required in checkout create now. A missing location is rejected.** | Optional until the web ships. | The rule says a missing location blocks the booking. The web follows in web issue #157. |
| 4 | **Owner ruling, 2026-10-26. The checks cover coverage only. The hold recheck before payment and the reversal for a lost hold are not in this spec.** | Coverage and hold. | The issue lists coverage only. The lost-hold gap is reported, not fixed here. |
| 5 | **Added point, please review. The column `bookings_fulfillment_details.booking_location_id` is a nullable FK to `catalog_geographies`, with `delete: restrict`. Old rows stay NULL. The order copy is written once at materialization.** | A column on the session and the order. | The fulfillment payload already has one row for the session and one for the order. The copy is immutable (BKG-11). |
| 6 | **Added point, please review. A location is valid when the node is `active`, is `is_listable`, and has level `municipality` or `ward`.** | Any active node. | The geography model says a listable node is a node a tourist can pick. |
| 7 | **Added point, please review. One service `Bookings::CheckoutSessions::BookingLocationCheckService` runs the three checks. It reads coverage through `Catalog::Listings::PickupCoverageMatchService`.** | Three copies of the check. | One rule has one owner. The match service already exists. |
| 8 | **Added point, please review. The checks run in this order: location is present, location is valid, listing has a coverage row, location is covered. Each failure has its own message.** | One generic message. | The ruling says the message says why. |
| 9 | **Added point, please review. Checkout create runs the check before it takes the hold.** | Check after the hold. | A rejected request must not take a hold. |
| 10 | **Added point, please review. The payment attempt runs the check before it starts payment. A retry that returns a pending handoff runs the check too.** | Check only for a new attempt. | The ruling says the check runs just before payment starts. |
| 11 | **Added point, please review. Materialization runs the check after it locks the session and after it sees the succeeded charge. The check reads the latest saved coverage.** | Use coverage as of checkout. | The ruling says the check uses the latest saved coverage. |
| 12 | **Added point, please review. When the check fails at materialization, `Payments::Charges::ReverseService` runs. It calls the adapter refund with the key `reversal:{charge uuid}`, creates the refund row with the provider reference, expires the session and releases the hold. `MaterializeOrderManager` then returns nil, and the payment-succeeded handler returns `:processed`.** | Raise an error. | A raised error makes the provider event fail and retry. The reversal is the final outcome. |
| 13 | **Added point, please review. The reversal is safe to run twice. A partial unique index on `payments_refunds.charge_id` where `booking_id IS NULL` allows one reversal per charge. A second run finds the row and does nothing. The adapter key makes a retry after a crash return the same provider reference.** | A lock only. | The database is the last guard. |
| 14 | **Added point, please review. The refund amount is the full charge amount. The reason text is "Pickup coverage check failed after payment."** | A partial refund. | No fee applies when the platform cannot serve the trip. |
| 15 | **Added point, please review. The refund-succeeded handler sets the charge to `refunded` when the refund has no booking. The charge keeps `booking_id` NULL.** | Set `refunded` at request time. | Financial finality comes from the provider event (FIN-11). |
| 16 | **Added point, please review. The hold release uses a new reason `payment_reversed`. The session status becomes `expired`.** | A new session status. | The session enum has no failed state, and an expired session makes no booking. |
| 17 | **Added point, please review. The location search endpoint is not in this issue.** | Add it here. | The issue tasks do not list it. Web issue #157 needs it, so a separate API issue should cover it. |
| 18 | **Added point, please review. The tourist sees the failure when the session shows `expired`. A message field on the session is out of scope.** | Store a failure message. | The web issue can decide the copy. |
| 19 | **Added point, please review. A confirmed booking is never checked again. Coverage changes do not touch an order.** | Recheck on cancel. | The ruling says a confirmed booking stays valid. |

## API contract

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/tourists/bookings/checkout_sessions` | JWT tourist | Adds `booking_location_id` (node UUID). `dropoff_address` is optional. | Adds `booking_location_id` in the fulfillment payload | Error 422 for a missing, invalid or uncovered location. |
| POST | `/tourists/bookings/checkout_sessions/:id/payment_attempts` | JWT tourist | Unchanged | Unchanged | Error 422 when the check fails. No payment starts. |
| GET | `/tourists/bookings/checkout_sessions/:id` | JWT tourist | | Adds `booking_location_id`. Status `expired` after a reversal. | |
| Webhook | payment succeeded | Provider event | | | When the check fails, the handler reverses the charge and makes no booking. |

Error text:

- Missing: "Please choose a booking location."
- Not found: "We could not find that booking location, so please choose another."
- Wrong kind: "Please choose a city or a ward as booking location."
- No coverage: "This listing has no pickup coverage now, so it cannot be booked."
- Not covered: "This provider does not pick up tourists at that location, so please choose a covered location."

### Files to create or modify (API)

- `db/migrate/{timestamp}_add_booking_location_to_bookings_fulfillment_details.rb`
- `db/migrate/{timestamp}_allow_payments_refunds_without_booking.rb` (nullable column, partial unique index)
- `app/domains/bookings/fulfillment_detail.rb` (association `booking_location`)
- `app/domains/bookings/checkout_sessions/tourists_create_request.rb`, `tourists_create_validator.rb`, `tourists_create_manager.rb`
- `app/domains/bookings/checkout_sessions/booking_location_check_service.rb` (new)
- `app/domains/bookings/checkout_sessions/materialize_order_manager.rb` (check, reversal, copy of the location)
- `app/domains/payments/charges/tourists_create_manager.rb`, `tourists_create_validator.rb` (check before payment)
- `app/domains/payments/charges/reverse_service.rb` (new)
- `app/domains/payments/refund.rb` (optional booking)
- `app/domains/payments/provider_events/handlers/payment_succeeded_manager.rb` (nil result)
- `app/domains/payments/provider_events/handlers/refund_succeeded_manager.rb` (charge to `refunded`)
- `app/domains/catalog/asset_hold.rb` (new release reason)
- The checkout session and fulfillment serializers
- `lib/dev/completed_order_factory.rb`, `test/support/*` (the location in fixtures)
- `docs/db/bookings.dbml`, `docs/db/payments.dbml`, `docs/db/redcab.dbml`
- `db/schema.rb`, `sorbet/rbi/dsl/**`

## Data / domain touchpoints

- Bounded context: CAT owns coverage, BKG owns the check and the location, and PAY owns the reversal.
- Transaction boundaries: the adapter refund call runs first, then one transaction writes the refund and expires the session.
- Snapshots: the location copy on the order is written once and never updated.
- Query change: each check run adds one `EXISTS` query, and the PR body carries an EXPLAIN.

## Out of scope

- The location search endpoint (decision 17).
- The web checkout (web issue #157).
- Corporate checkout.
- The hold recheck before payment, and a reversal for a lost hold (decision 4).
- The tourist refund flow of red-cab-api#162.

## Tasks

### API

- [ ] Amend the DBML files for the location column and the nullable refund booking.
- [ ] Add the two migrations and run them in the test environment.
- [ ] Add `BookingLocationCheckService` and its error messages.
- [ ] Take `booking_location_id` in checkout create and run the check before the hold.
- [ ] Run the check in the payment attempt, including the retry path.
- [ ] Add `Payments::Charges::ReverseService` and call it from materialization.
- [ ] Copy the location to the order at materialization.
- [ ] Update the refund-succeeded handler, the serializers and the fixtures.
- [ ] Add the tests.

### Web

- [ ] None in this issue, because web issue #157 covers the form.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A location outside coverage blocks checkout create with a clear message.
- [ ] A listing with no coverage row blocks checkout create and the payment attempt.
- [ ] A missing location, an unknown node, an inactive node or a node of the wrong level is rejected.
- [ ] A rejected checkout create takes no hold.
- [ ] A payment attempt for a session whose location is no longer covered starts no payment.
- [ ] A failure at materialization reverses the full charge and leaves no booking.
- [ ] After a reversal the session is `expired` and the hold is released.
- [ ] Running the reversal twice makes one refund row and one adapter call per key.
- [ ] The refund-succeeded event sets the charge to `refunded` and keeps `booking_id` NULL.
- [ ] A confirmed booking stays valid when coverage changes later.
- [ ] The order copy of the location equals the session value and is not changed later.
- [ ] `dropoff_address` is optional, and the API copies the pickup text when it is empty.
- [ ] No client-side price computation.
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails db:migrate
bin/rails db:rollback STEP=2 && bin/rails db:migrate
PARALLEL_WORKERS=1 bin/rails test test/domains/bookings test/domains/payments test/controllers/tourists
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-26 | owner | Author review in chat | Approved. Owner ruled on decisions 1 to 4 and approved the added points 5 to 19. `review-implementation-spec` was not run. |
