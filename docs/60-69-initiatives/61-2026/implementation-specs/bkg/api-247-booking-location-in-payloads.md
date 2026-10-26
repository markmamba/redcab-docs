---
title: "Return the booking location name in the checkout session and booking payloads"
sidebar_label: API · Booking location in payloads
issue: "https://github.com/markmamba/red-cab-api/issues/247"
repos:
  - red-cab-api
status: approved
phase: 2
context: BKG
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-214-booking-location-and-charge-reversal.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-240-booking-location-search.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-157-provider-coverage-and-checkout-booking-location.md"
---

## TL;DR

- Adds `booking_location` to the `fulfillment_detail` object of three payloads.
- The three payloads are the checkout session create response, the tourist order show and the provider order show.
- The object holds `uuid`, `name_en`, `name_ja`, `parent` and `prefecture`.
- One new service builds the object, and the search route serializer reuses it.
- Does NOT ship a web change, a new route, a column or a change to the lean status route.
- Breaking change: No. The field is new, and `booking_location_id` stays.

## Problem

The three payloads return `booking_location_id` and no name.

The web can show only an id, so the booking pages cannot show where the tourist is picked up.

The checkout order summary can show the place only from the memory of the page.

Evidence: `app/domains/bookings/snapshot_payload.rb` (`fulfillment_detail_for` returns the id only), issue #247, spec web-157 decision 4.

Two statements in issue #247 need a correction:

- The route `GET /tourists/bookings/checkout_sessions/:id` returns a lean status object with no `fulfillment_detail`, so it does not change.
- The web keeps the checkout session in page memory only, so no reload case exists.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| booking location | The city or ward that the tourist picks at checkout, stored as `bookings_fulfillment_details.booking_location_id`. |
| place summary | An object with `uuid`, `name_en` and `name_ja`. |
| fulfillment detail | The `fulfillment_detail` object that `Bookings::SnapshotPayload.fulfillment_detail_for` builds. |

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Spec api-214 | [Booking location check](../cat/api-214-booking-location-and-charge-reversal.md) | The column `booking_location_id` and the rule that the order copy is written once. |
| Spec api-240 | [Booking location search](../cat/api-240-booking-location-search.md) | The place with its parent city and prefecture. Decision 11 fixes the shape. |
| Spec web-157 | [Coverage and booking location](../cat/web-157-provider-coverage-and-checkout-booking-location.md) | Decision 4 asks for this API item. Decisions 22 and 23 need it. |
| BKG-11 | [Invariants](/docs/70-79-business/business-rules/invariants) | The fulfillment payload is fixed at order time. |
| Schema | [bookings.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/bookings.dbml) | The column `booking_location_id` of `bookings_fulfillment_details`. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. The API adds `booking_location` to the session and booking payloads. It holds `uuid`, `name_en`, `name_ja`, `parent` and `prefecture`.** | The web keeps the pick in state. | The booking pages and the order summary need a name. The payloads return only the id today. |
| 2 | **Added point, please review. The name is read from the geography row. It is not copied into the order.** | Copy the names into new columns. | A rename, such as red-cab-api#244, then shows on old bookings. The id and the slug do not change. |
| 3 | **Added point, please review. `Catalog::Geographies::BookingLocationSummaryService.execute(geography:)` builds the object. `Bookings::SnapshotPayload.fulfillment_detail_for` calls it.** | Build the object inside `SnapshotPayload`. | One service owns the rule for the parent and the prefecture. |
| 4 | **Added point, please review. `Catalog::MarketplaceBookingLocationSerializer` calls the same service for its `parent` and `prefecture` fields. Its JSON does not change.** | Leave two copies of the rule. | A municipality has its prefecture as parent. A ward has a city as parent. Two copies can drift. |
| 5 | **Added point, please review. The service returns `parent` and `prefecture` as `nil` when the place has no parent.** | Raise an error. | The payload must not fail on odd data. The search route cannot reach this case. |
| 6 | **Added point, please review. For a municipality, `parent` and `prefecture` hold the same prefecture, as in spec api-240 decision 11.** | `parent` as `nil`. | The web reads both fields the same way. |
| 7 | **Added point, please review. `booking_location` is `nil` when the row has no location, as for old bookings. `booking_location_id` stays and is `nil` too.** | Omit the key. | The key is always present, so the web needs no key check. |
| 8 | **Added point, please review. Only the three payloads change: the create response, the tourist order show and the provider order show.** | Also change the status route. | The status route has no `fulfillment_detail`, and the web polls it only for the status. |
| 9 | **Added point, please review. The three managers load `{ fulfillment_detail: { booking_location: { parent: :parent } } }`.** | Load the parents in the serializer. | Serializers never query. Each manager loads the parent chain with `includes`. |
| 10 | **Added point, please review. A place that is no longer `active` still appears in the payload.** | Hide it. | An order keeps its place for history. The foreign key already blocks a delete. |
| 11 | **Added point, please review. A new test helper `capture_queries` lives in `test/support`. The tests use it to bound the query count.** | A copy in each test file. | The helper exists only inside the search manager test today. |
| 12 | **Added point, please review. No migration and no DBML change.** | None. | The column exists since api-214. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/tourists/bookings/checkout_sessions` | JWT tourist | Unchanged | Adds `fulfillment_detail.booking_location` | Unchanged status 201. |
| GET | `/tourists/bookings/orders/:id` | JWT tourist | Unchanged | Adds `fulfillment_detail.booking_location` | |
| GET | `/providers/bookings/orders/:id` | JWT provider | Unchanged | Adds `fulfillment_detail.booking_location` | |

Item example:

```json
{
  "booking_location_id": "…",
  "booking_location": {
    "uuid": "…",
    "name_en": "Nishi",
    "name_ja": "西区",
    "parent":     { "uuid": "…", "name_en": "Yokohama", "name_ja": "横浜市" },
    "prefecture": { "uuid": "…", "name_en": "Kanagawa", "name_ja": "神奈川県" }
  }
}
```

### Files to create or modify (API)

- `app/domains/catalog/geographies/booking_location_summary_service.rb` (new)
- `app/domains/catalog/marketplace_booking_location_serializer.rb` (calls the service)
- `app/domains/bookings/snapshot_payload.rb` (`fulfillment_detail_for`)
- `app/domains/bookings/orders/tourists_show_manager.rb` (`includes`)
- `app/domains/bookings/orders/providers_show_manager.rb` (`includes`)
- `app/domains/bookings/checkout_sessions/tourists_create_manager.rb` (`includes`)
- `test/support/query_capture_test_helper.rb` (new)
- `test/domains/catalog/geographies/booking_location_summary_service_test.rb` (new)
- `test/domains/bookings/snapshot_payload_test.rb` (new)
- `test/integration/tourists/bookings/checkout_sessions_create_integration_test.rb`
- `test/integration/tourists/bookings/orders_show_integration_test.rb`
- `test/integration/providers/bookings/orders_show_integration_test.rb`

## Data / domain touchpoints

- Bounded context: BKG builds the payload, and CAT owns the geography rows.
- Transaction boundaries: none, because the change only reads.
- Snapshots: the order keeps the id of the place, and the names are not frozen (decision 2).
- Query change: the managers load two more levels of geography, and the PR body carries the query counts.

## Out of scope

- Any web change, because the web follow-up is a separate item.
- The lean checkout session status route.
- A change to the search route output.
- Making the fulfillment payload read-only (red-cab-api#243).
- Corporate checkout.

## Tasks

### API

- [ ] Add `BookingLocationSummaryService` and its test.
- [ ] Make `MarketplaceBookingLocationSerializer` call the service.
- [ ] Add `booking_location` to `fulfillment_detail_for`.
- [ ] Add the parent chain to the `includes` of the three managers.
- [ ] Add the test helper and the payload tests.

### Web

- [ ] None in this issue, because a web follow-up covers the display.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The create response returns `fulfillment_detail.booking_location` for a ward.
- [ ] The tourist order show returns the same object.
- [ ] The provider order show returns the same object.
- [ ] A ward returns its city as `parent` and its prefecture as `prefecture`.
- [ ] A municipality returns its prefecture as both `parent` and `prefecture`.
- [ ] A row with no location returns `booking_location` as `nil`.
- [ ] A place with no parent returns `nil` for `parent` and `prefecture` and does not raise.
- [ ] A place that is not `active` still appears.
- [ ] `booking_location_id` stays in the payloads.
- [ ] The search route returns the same JSON as before.
- [ ] The status route `GET /tourists/bookings/checkout_sessions/:id` is unchanged.
- [ ] The number of queries does not grow with the number of items.
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
PARALLEL_WORKERS=1 bin/rails test test/domains/catalog/geographies test/domains/bookings test/integration/tourists/bookings test/integration/providers/bookings
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-26 | owner | Author review in chat | Approved. Owner ruled on decision 1 and approved the added points 2 to 12. `review-implementation-spec` was not run. |
