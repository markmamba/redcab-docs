---
title: "Use asset holds in checkout and booking"
sidebar_label: API · Holds in checkout
issue: "https://github.com/markmamba/red-cab-api/issues/210"
repos:
  - red-cab-api
status: implemented
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#asset-holds"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#booking-confirmation"
  - "docs/30-49-domains/38-catalog/models/asset-availability.md"
  - "docs/30-49-domains/38-catalog/requirements/tourist-booking.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-209-asset-schedules-closures-holds.md"
---

## TL;DR

- Checkout holds an asset for a package, a date and a start time, not seats on a slot.
- A checkout session and a booking carry the hold id, the package, and the service start and end.
- A new job releases the hold of an expired checkout session.
- Payment failure releases the hold, and payment success confirms it.
- The 24-hour auto-complete timer reads the service end.
- A new tourist endpoint lists the open dates and the free start times of a package.
- The date filter and the quote use packages.
- A listing detail says when a listing is not bookable.
- Does NOT remove the slot tables, the slot endpoints or `bookings_seat_allocations`, because red-cab-api#216 removes them.
- Does NOT add pickup coverage or a booking location (red-cab-api#213 and #214).
- Does NOT change cancel or decline, because red-cab-api#171 and #172 release holds later.
- Breaking change: Yes, because checkout and quote accept a package, a date and a start time, not a slot.
- Web #151 and #155 ship in the same release.

## Problem

Checkout reserves seats on a slot through `slot_id`, and `bookings_seat_allocations` records the reservation.

A slot has a fixed window, so it cannot serve a package with its own length and start window.

The booking has no package, no package name and no service start and end.

Nothing releases a checkout session that expires, so the seats stay held until a payment fails.

Evidence: `app/domains/bookings/checkout_sessions/tourists_create_manager.rb`, `materialize_order_manager.rb`, `app/domains/bookings/seat_allocations/release_for_payment_failed_manager.rb`, issue #210.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) | One hold for each booking, and only Catalog writes holds |
| Ruling | [Booking confirmation](/docs/30-49-domains/catalog/catalog-decisions/#booking-confirmation) | Payment confirms the booking, and the hold is checked again before payment |
| Ruling | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | A listing with no active package shows "currently unavailable" |
| Requirements | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | The tourist picks a package, a date and a start time |
| Model | [Asset availability](/docs/30-49-domains/catalog/models/asset-availability) | Hold rules, open days and the release rules |
| Spec | api-209 | The tables and the three hold services |
| Schema | [bookings.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/bookings.dbml) | Column truth. Tags `ships in: S5` mark this slice. |
| INV-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | A confirmed booking never changes |
| PRC-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | The client never sends a price |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-25. Amended the same day. One spec covers issue #210. The work ships in two pull requests. PR 1: all of checkout and booking. This includes the Bookings migrations, checkout create, materialize, release, the expiry job, the asset row lock, the service times, the serializers and the payment hold check. PR 2: the read side. This includes the availability read endpoint, the date filter, the quote and the listing detail flag.** | Three pull requests. | New orders have no slot, so the readers and about 51 test files must change in the same pull request to keep `main` runnable. |
| 2 | **Owner ruling, 2026-10-25. The slot tables, the slot endpoints, the `slot_id` columns and `bookings_seat_allocations` stay until red-cab-api#216. Checkout stops using them.** | Remove them in #210. | The web provider screens for slots still call the slot endpoints until web #155 ships. |
| 3 | **Owner ruling, 2026-10-25. The slot price override ends with the slots. The quote reads only the package price.** | Keep a per-day price somewhere. | Per-day prices come back with seasonal overrides (red-cab-api#166). No production data exists. |
| 4 | **Owner ruling, 2026-10-25. The new columns on sessions and orders are nullable. A check rule says a row has a hold or a slot. Red-cab-api#216 drops `slot_id` and sets NOT NULL.** | Delete the old rows, then NOT NULL. | Old rows stay valid. The change is not destructive. |
| 5 | **Owner ruling, 2026-10-25. Hard cut-over. Checkout and quote accept `package_slug`, `service_date` and `start_time`. They reject `availability_slot_id`. Web #151 and #155 ship in the same release.** | Accept both a slot and a package for a while. | Two booking paths could disagree on availability. No production data exists. |
| 6 | **Owner ruling, 2026-10-25. The listing detail response adds `is_bookable`. It is false when the listing has no active package with an active pool asset.** | A separate issue. | The Catalog ruling says a direct link shows "currently unavailable". |
| 7 | **Owner ruling, 2026-10-25. The tourist availability read endpoint ships in #210 as PR 2.** | A separate issue. | It uses the same open-day and hold queries as the date filter. |
| 8 | **Owner ruling, 2026-10-25. The closure and schedule managers lock the asset row inside their transaction. `HoldAssetService` takes a shared lock on the same row. This fixes the known limit of api-209.** | Leave the race. | A closure and a new hold can no longer pass their checks at the same moment. |
| 9 | **Added point, please review. The checkout request carries `listing_id`, `package_slug`, `service_date` (`YYYY-MM-DD`), `start_time` (`HH:MM`) and `seats_requested`, plus the fulfillment fields it has today. The package must belong to the listing and be active. `seats_requested` must not exceed `max_passengers`.** | A package id. | The DBML says the server resolves the slug to the package. |
| 10 | **Added point, please review. The create manager quotes the price, then calls `HoldAssetService` inside the checkout transaction. The Service Timezone comes from the listing. `held_until` equals the session `expires_at`. When the service returns `nil`, the manager raises 422 "This time is no longer available. Please choose another date or time."** | Hold before the quote. | The price never depends on the hold. The guard runs before any write. |
| 11 | **Added point, please review. The session copies `asset_hold_id`, `package_id`, `package_name_snapshot` from `name_en`, `service_starts_at` and `service_ends_at` from the hold. The order copies them from the session. Nobody changes them after create.** | Read them live from Catalog. | A confirmed booking never changes (`INV-1`). |
| 12 | **Added point, please review. A new session creates no `bookings_seat_allocations` row.** | Create a row for audit. | The hold is the audit record. |
| 13 | **Added point, please review. Materialize calls `ConfirmHoldService`. A `nil` result raises 422 "The hold for this checkout session is no longer available." A second call changes nothing.** | Insert a second hold. | The DBML says confirm never inserts a hold. |
| 14 | **Added point, please review. A payment failure releases the hold with the reason `payment_failed` and sets the session to `expired`. A session that has a slot and no hold keeps the old release path.** | Remove the old path now. | Old rows stay valid until red-cab-api#216. |
| 15 | **Added point, please review. A new job, `Bookings::CheckoutSessions::ExpireSweepJob`, runs every minute. It finds pending sessions whose `expires_at` has passed. It releases the hold with the reason `session_expired` and sets the session to `expired`. A second run changes nothing.** | Release on the next payment call. | Today nothing releases an expired session. |
| 16 | **Added point, please review. The payment validator checks that the hold is `held` and has not expired, instead of the seat allocation. A session with a slot keeps the old check.** | Check only at confirm time. | The ruling says to check the hold again before payment starts. |
| 17 | **Added point, please review. The auto-complete sweep and the complete validator read `service_ends_at`. An order with no `service_ends_at` falls back to the slot `end_time`.** | Fail old rows. | Old rows keep working until red-cab-api#216. |
| 18 | **Added point, please review. The cancellation cutoff has no code today. Red-cab-api#171 and #172 read `service_starts_at`. This spec only provides the column.** | Add cutoff code here. | The cancel commands do not exist yet. |
| 19 | **Added point, please review. The booking and session serializers drop `availability_slot_id`. They add `asset_hold_id`, `package_id`, `package_name`, `service_starts_at` and `service_ends_at`. The list serializers keep `start_time` and `end_time`, filled from the service times.** | Keep `availability_slot_id` as null. | The hard cut-over allows a clean contract. The list keys keep the web changes small. |
| 20 | **Added point, please review. `GET /marketplace/catalog/listings/:listing_id/packages/:package_slug/open_dates?month=YYYY-MM` lists the dates that have at least one free start time. `GET .../start_times?service_date=YYYY-MM-DD` lists the free start times of one date.** | One endpoint for both. | The web needs a month view and a day view. |
| 21 | **Added point, please review. A start time is free when some active pool asset has an open day, the hold fits the schedule, and no live hold overlaps the blocked range. The same rules as `HoldAssetService` apply.** | A simpler day-level check. | The web must not offer a time that checkout rejects. |
| 22 | **Added point, please review. The date filter keeps a listing when an active package has an active pool asset with an open day on that date and no live hold with that service date. Release 3 makes the filter exact for timed packages.** | Run the full start time check for each listing. | Release 2 has only full-day packages. The query stays one SQL statement. |
| 23 | **Added point, please review. The quote request carries `listing_id`, `passenger_count` and an optional `package_slug`. Without a slug, the quote uses the only active package.** | A required slug. | The listing page quotes before the tourist picks anything. |
| 24 | **Added point, please review. The migration adds the columns, the foreign keys and the check rules. The foreign key from `asset_hold_id` to `catalog_asset_holds` has a unique index, partial on rows where the column is not null.** | A full unique index. | Old rows have a null hold. |
| 25 | **Added point, please review. The dev seeders and the completed order factory create holds, not slots.** | Leave them. | Seeded data must match the new checkout. |
| 26 | **Owner ruling, 2026-10-25. The open dates endpoint accepts a month from the current month to 12 months ahead. Any other month returns 422. It never lists a past day.** | Any month. | The limit caps the work for one request. |
| 27 | **Owner ruling, 2026-10-25. The open dates and start times endpoints return 404 when the listing is unknown or not bookable, or when the package slug is wrong.** | 200 with an empty list. | The web must tell a bad link from a full month. |
| 28 | **Owner ruling, 2026-10-25. The listing detail of a listing with no active package returns 200 with `is_bookable: false`, `price_breakdown: null` and `unavailable_reason: "no_active_package"`.** | Keep 422. | The page still opens and shows "currently unavailable". |
| 29 | **Owner ruling, 2026-10-25. The price breakdown replaces `availability_slot_id` with `package_id`, the package uuid. Old stored snapshots keep their old field.** | Remove the field. | The quote says which package it priced. |
| 30 | **Added point, please review. The open dates response is `{ "open_dates": ["YYYY-MM-DD"] }`. The start times response is `{ "start_times": ["HH:MM"] }`. The listing id is a uuid or a slug, as on the listing detail.** | A paginated list. | Both lists are short. |
| 31 | **Added point, please review. `HoldAssetService` and `FreeStartTimesService` share one rule for the blocked range. A hold that has expired but is not released yet still blocks a time, as the database rule does.** | Two copies of the rule. | The web must not offer a time that checkout rejects. |
| 32 | **Added point, please review. The date filter lists a listing only for a date that is not before today in the Service Timezone of the listing.** | No date check. | The old filter also skipped past slots. |
| 33 | **Owner ruling, 2026-10-25. The legacy area listings index uses the same date filter as the scoped index.** | Leave the slot-based filter for red-cab-api#216. | The legacy filter would no longer match checkout availability. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/tourists/bookings/checkout_sessions` | JWT tourist | `listing_id`, `package_slug`, `service_date`, `start_time`, `seats_requested` and fulfillment fields | The checkout session, 201 | 422 when no asset is free |
| GET | `/marketplace/catalog/listings/:listing_id/quote` | Optional | `passenger_count`, optional `package_slug` | The price breakdown | `availability_slot_id` is no longer accepted |
| GET | `/marketplace/catalog/listings/:listing_id/packages/:package_slug/open_dates` | Optional | `month` | `open_dates` list | New |
| GET | `/marketplace/catalog/listings/:listing_id/packages/:package_slug/start_times` | Optional | `service_date` | `start_times` list | New |
| GET | `/marketplace/catalog/listings/:listing_id` | Optional | none | The listing detail with `is_bookable` | `is_bookable` is new |

The path names and the field names are added points, so please review them.

### Files to create or modify (API)

- `db/migrate/`: new columns, foreign keys and check rules on `bookings_checkout_sessions` and `bookings_orders`.
- `app/domains/bookings/checkout_session.rb` and `order.rb`: the new associations, with the slot association optional.
- `app/domains/bookings/checkout_sessions/tourists_create_request.rb`, `tourists_create_validator.rb` and `tourists_create_manager.rb`.
- `app/domains/bookings/checkout_sessions/materialize_order_manager.rb` and `snapshot_attributes.rb`.
- `app/domains/bookings/seat_allocations/release_for_payment_failed_manager.rb`.
- `app/domains/bookings/checkout_sessions/expire_sweep_manager.rb`, `app/jobs/bookings/checkout_sessions/expire_sweep_job.rb` and `config/sidekiq_scheduler.yml`.
- `app/domains/payments/charges/tourists_create_validator.rb` and `tourists_create_manager.rb`.
- `app/domains/bookings/orders/auto_complete_sweep_manager.rb`, `complete_manager.rb` and `complete_validator.rb`.
- The Bookings serializers and the order index and show managers that include the slot.
- `app/domains/catalog/availability/hold_asset_service.rb`: the shared lock on the asset row.
- `app/domains/catalog/asset_closures/providers_create_manager.rb` and `asset_schedules/providers_*_manager.rb`: the row lock.
- `app/domains/catalog/availability/free_start_times_service.rb`, new.
- `app/controllers/marketplace/catalog/`: the open dates and start times endpoints.
- `app/domains/catalog/listings/availability_date_filter_service.rb`.
- `app/domains/catalog/quotes/`: the request, validator and manager.
- `app/domains/catalog/pricing/calculate_quote_service.rb`: drop the slot override.
- `app/domains/catalog/listings/marketplace_show_manager.rb` and the listing detail serializer.
- `lib/dev/catalog_marketplace_seeder.rb` and `completed_order_factory.rb`.
- `docs/db/bookings.dbml`: update the `ships in: S5` tags.

## Data / domain touchpoints

- Bounded context: BKG calls CAT.
- Only Catalog services write `catalog_asset_holds`, and Bookings keeps the hold id (R-7).
- Transaction boundary: the checkout create manager owns it, and `HoldAssetService` runs inside it.
- Snapshots: the session gets the hold id, the package and the service times once, and the order copies them.
- Concurrency: the exclusion rule decides two checkouts for one asset.
- The shared lock on the asset row also serializes them against closures and schedule edits.

## Known limits

- A hold that has expired but is not released yet still blocks a time, for at most one sweep cycle of one minute.
- The concurrency tests share one database connection, so they do not prove true parallel behavior.
- The row locks are checked by SQL assertions only.
- The slot tables, the slot endpoints and `bookings_seat_allocations` stay until red-cab-api#216.
- The rules in `AGENTS.md` about the seat counter are out of date, and red-cab-api#216 should update them.
- The pull requests are red-cab-api#229 and #230.

## Out of scope

- Removing the slot tables, the slot endpoints, `bookings_seat_allocations` and the `slot_id` columns (red-cab-api#216).
- Pickup coverage and the booking location (red-cab-api#213 and #214).
- Tourist cancel, provider cancel and decline (red-cab-api#171 and #172).
- Timed packages, many packages and the package-aware filters (release 3).
- Multi-Day Package checkout.
- The web checkout and the web picker (web #151 and #155).

## Tasks

### API

- [ ] PR 1: add the migration for the new columns on sessions and orders.
- [ ] PR 1: change the checkout request, validator and create manager.
- [ ] PR 1: change the materialize manager to confirm the hold.
- [ ] PR 1: change the payment failure release.
- [ ] PR 1: add the expiry sweep manager, the job and the schedule.
- [ ] PR 1: add the asset row lock to the hold service and to the closure and schedule managers.
- [ ] PR 1: add a concurrency test for two checkouts that race for one asset.
- [ ] PR 1: change the auto-complete sweep and the complete validator.
- [ ] PR 1: change the payment hold check.
- [ ] PR 1: change the serializers and the order managers.
- [ ] PR 1: update the dev seeders and the completed order factory.
- [ ] PR 2: add `HoldRangeService` and `FreeStartTimesService`.
- [ ] PR 2: add the open dates and start times endpoints.
- [ ] PR 2: switch the date filter.
- [ ] PR 2: change the quote to a package and drop the slot override.
- [ ] PR 2: add `is_bookable` to the listing detail.
- [ ] Update the `ships in: S5` tags in `docs/db/bookings.dbml`.

### Docs

- [x] Set spec `status: implemented` after the last pull request merges.

## Acceptance criteria

- [ ] A checkout session and an order carry one hold id, the package, and the service start and end.
- [ ] Two checkouts for the last free asset: one succeeds and one gets 422 "This time is no longer available."
- [ ] Payment failure releases the hold.
- [ ] The expiry job releases the hold of an expired session, and a second run changes nothing.
- [ ] Payment success confirms the same hold and inserts no second hold.
- [ ] A checkout for a package of another listing, or for an inactive package, returns 422.
- [ ] A checkout for a start time outside the start window returns 422.
- [ ] The client sends no price, and the quote reads the package price.
- [ ] The auto-complete timer runs 24 hours after `service_ends_at`.
- [ ] An old order with a slot and no hold still completes.
- [ ] The open dates endpoint lists no date that has no free start time.
- [ ] The start times endpoint lists no time that checkout would reject.
- [ ] The date filter keeps only listings with a free asset on that date.
- [ ] The listing detail shows `is_bookable: false` when the listing has no active package.
- [ ] A closure and a new hold for one asset cannot both succeed at the same moment.
- [ ] Checkout and the quote reject `availability_slot_id`.
- [ ] No new code reads `slot_id`, `remaining_capacity` or `bookings_seat_allocations` for a new session.

## Verification

```bash
# API (from red-cab-api/)
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
