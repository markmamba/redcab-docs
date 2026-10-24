---
title: "Add asset schedules, closures and holds to Catalog"
sidebar_label: API · Asset holds
issue: "https://github.com/markmamba/red-cab-api/issues/209"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#asset-holds"
  - "docs/30-49-domains/38-catalog/models/asset-availability.md"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/30-49-domains/38-catalog/architecture-decisions/asset-holds.md"
---

## TL;DR

- Ships the tables `catalog_asset_schedules`, `catalog_asset_closures`, `catalog_asset_holds`, `catalog_listing_packages` and `catalog_package_assets`.
- Ships the column `buffer_minutes` on `catalog_provider_assets`.
- Ships the services `HoldAssetService`, `ConfirmHoldService` and `ReleaseHoldService`.
- Ships one default full-day package and one asset pool for each listing.
- Ships provider endpoints for schedules and closures.
- The quote reads the base price from the package.
- Does NOT change checkout, which uses availability slots until red-cab-api#210.
- Does NOT change the date filter, which switches in red-cab-api#210.
- Does NOT remove the slot tables or the slot code. red-cab-api#216 removes them.
- Does NOT ship many packages, timed packages, display prices or filters (release 3).
- Breaking change: No, because every change adds to the schema or to the quote source.

## Problem

A slot has a fixed window.

It cannot guard a vehicle for a package with its own length and start window.

The ruling [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) replaces the slot with one hold for each booking.

A hold needs a package, an asset pool, a schedule and a closure list.

None of these tables exist.

Evidence: `app/domains/catalog/availability/reserve_seats_service.rb`, `db/schema.rb`, issue #209.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) | One hold for each booking, one database rule, the buffer rule |
| Ruling | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy) | One default package for each listing in release 2 |
| Ruling | [Release order](/docs/30-49-domains/catalog/catalog-decisions/#release-order) | Slice S5 is release 2 and shows no change to tourists |
| Model | [Asset availability](/docs/30-49-domains/catalog/models/asset-availability) | Hold rules, schedules and closures |
| Model | [Listings and packages](/docs/30-49-domains/catalog/models/listings-and-packages) | Package columns and the asset pool |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth. Tags `ships in: S5` mark this slice. |
| ADR-005 | [Single pricing authority](/docs/30-49-domains/architecture-decisions/adr-005-single-pricing-authority) | Only the quote service computes a price |
| INV-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | A confirmed booking never changes |
| PRC-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | The client never sends a price |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling. One spec covers issue #209. The work ships in three pull requests. PR 1: tables, models and the three hold services. PR 2: default packages and the quote change. PR 3: schedule and closure endpoints.** | One pull request. Several issues. | A smaller pull request is easier to review. Each one leaves `main` runnable. |
| 2 | **Owner ruling. The default package copies the duration of the pricing policy. Its start window is 00:00 to 23:30, with a 30-minute step.** | A fixed duration for all listings. | The tour length stays as it is today. |
| 3 | **Owner ruling. The pool of a default package holds the primary asset of the listing. When the listing has no primary asset, the pool holds all active assets of the provider.** | Primary asset only. All active assets always. | The provider keeps the vehicle choice made today. |
| 4 | **Owner ruling. Each active asset gets one seeded schedule: all 7 weekdays, from the migration date, no end date, 00:00 to 23:59.** | No schedule until the provider sets one. Copy days from old slots. | No listing drops from results. The provider narrows the schedule later. |
| 5 | **Owner ruling. The migration does not backfill holds for existing bookings.** | Backfill future confirmed bookings. | No production data exists yet. |
| 6 | **Owner ruling. The slot tables, the slot code and the seat services stay in place. This spec only adds.** | Remove them in #209. | Checkout uses slots until #210. Every merged pull request leaves `main` runnable. |
| 7 | **Owner ruling. The date filter does not change in this spec. Red-cab-api#210 switches the filter and checkout together.** | Switch the filter now. Use both. | A tourist must never see a date that checkout rejects. |
| 8 | **Owner ruling. The policy price edit also updates the default package in one transaction. The quote reads the package price. Slice S4 removes the policy price.** | The quote keeps reading the policy. | One price has one writer at any time. |
| 9 | **Added point, please review. The duration of the default package comes from the policy. Kind `custom` uses `duration_minutes`. Kind `two_hour` is 120. Kind `half_day` is 240. Kind `full_day` and an empty kind are 480.** | Fail the migration when the duration is empty. | The docs do not give a length for `half_day`. 240 is my guess. |
| 10 | **Added point, please review. The default package sets `max_passengers` to the listing `base_capacity`, and `vehicle_category` to the listing `vehicle_category`. Its price is the policy `base_price_jpy`. Its name is the listing title.** | Ask the provider. | The package needs these columns, and the listing already holds the values. |
| 11 | **Added point, please review. `HoldAssetService` takes `held_until` from the caller. Checkout will pass the session expiry, which is 15 minutes today.** | The service picks the time. | The DBML says the hold ends with the checkout session. |
| 12 | **Added point, please review. The job that releases expired holds ships in red-cab-api#210, because it follows the checkout session expiry.** | Ship the job here. | This spec has no caller for the hold yet. |
| 13 | **Added point, please review. A closure that hits a live hold, and a schedule change that leaves a live hold outside it, both return 422.** | 409 | Validation errors in this API return 422. |
| 14 | **Added point, please review. Dates use the Service Timezone of the listing primary prefecture. In this spec all prefectures use `Asia/Tokyo`.** | A timezone column. | The Catalog model uses `Asia/Tokyo` today. |
| 15 | **Added point, please review. `HoldAssetService` tries each asset of the pool in id order. The exclusion rule rejects an overlap, and the service tries the next asset.** | Lock rows with `SELECT FOR UPDATE`. | The DBML says the rule decides, and no lock is needed. |
| 16 | **Added point, please review. A listing may have one package that is not archived until slice S4. A validator enforces it.** | No limit. | The issue and the DBML note give this limit. |

## API contract

All endpoints are new.

They need the provider JWT, and the asset must belong to the provider.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/catalog/assets/:provider_asset_id/schedules` | JWT provider | none | `schedules` list | Ordered by `starts_on` |
| POST | `/providers/catalog/assets/:provider_asset_id/schedules` | JWT provider | `starts_on`, `ends_on`, `weekdays`, `opens_at`, `closes_at` | the schedule, 201 | 422 when it overlaps another schedule |
| PATCH | `/providers/catalog/assets/:provider_asset_id/schedules/:schedule_id` | JWT provider | the same fields | the schedule | 422 when a live hold falls outside the new schedule |
| GET | `/providers/catalog/assets/:provider_asset_id/closures` | JWT provider | none | `closures` list | Ordered by `closed_on` |
| POST | `/providers/catalog/assets/:provider_asset_id/closures` | JWT provider | `closed_on`, `reason` | the closure, 201 | 422 when a live hold is on that day |
| DELETE | `/providers/catalog/assets/:provider_asset_id/closures/:closure_id` | JWT provider | none | `{ message }` | Reopens the day |

The path names and the error type are added points.

Please review them.

Existing endpoints that change:

- `POST /providers/catalog/assets` and `PATCH` accept `buffer_minutes`.
- The pricing policy edit also writes the default package price (decision 8).
- The quote reads `base_price_jpy` from the package (PR 2).

### Services

| Service | Input | Result |
| --- | --- | --- |
| `Catalog::Availability::HoldAssetService` | package, service date, start time, `held_until` | A `held` hold on the first free pool asset. Fails with "this time is no longer available". |
| `Catalog::Availability::ConfirmHoldService` | hold uuid | The hold becomes `confirmed`. It never inserts a second hold. |
| `Catalog::Availability::ReleaseHoldService` | hold uuid, reason | The hold becomes `released`. A second call changes nothing. |

### Files to create or modify (API)

- `db/migrate/` for the five tables and the new column.
- The column set follows `docs/db/catalog.dbml`.
- `db/migrate/` for the data step: default packages, pools and seeded schedules.
- `app/domains/catalog/asset_schedule.rb`, `asset_closure.rb`, `asset_hold.rb`, `listing_package.rb`, `package_asset.rb`.
- `app/domains/catalog/availability/hold_asset_service.rb`, `confirm_hold_service.rb`, `release_hold_service.rb`.
- `app/domains/catalog/asset_schedules/` and `asset_closures/` with request, validator and manager for each action.
- `app/controllers/providers/catalog/asset_schedules_controller.rb` and `asset_closures_controller.rb`.
- `config/routes/providers_routes.rb`.
- `app/domains/catalog/pricing/calculate_quote_service.rb` (PR 2).
- `docs/db/catalog.dbml`: update the `ships in: S5` tags.

## Data / domain touchpoints

- Bounded context: CAT.
- Only Catalog services write holds.
- Bookings never writes the table.
- Transaction boundary: `HoldAssetService` runs inside the future checkout transaction.
- This spec only supplies the service.
- Snapshots: a confirmed hold survives later edits to packages, pools and schedules (`INV-1`).
- Data step: the migration creates the default packages and seeded schedules.
- It does not create holds.

## Out of scope

- Many packages, timed packages, display prices and filters (release 3).
- Checkout and booking changes (red-cab-api#210).
- The date filter change (red-cab-api#210).
- The job that releases expired holds (red-cab-api#210).
- Cancel and decline paths (red-cab-api#171 and #172).
- Removing slot tables and code (red-cab-api#216).
- Shared seats and Multi-Day Package holds.
- Web screens for schedules (red-cab-web#155).

## Tasks

### API

- [ ] PR 1: add the migrations for the five tables and `buffer_minutes`, with the DBML rules.
- [ ] PR 1: add the models and the three hold services.
- [ ] PR 1: add concurrency tests for the overlap rule.
- [ ] PR 2: add the data step for default packages, pools and seeded schedules.
- [ ] PR 2: make the policy price edit update the default package.
- [ ] PR 2: make the quote read the base price from the package.
- [ ] PR 3: add the schedule and closure endpoints with their validators.
- [ ] Update the `ships in: S5` tags in `docs/db/catalog.dbml`.

### Docs

- [ ] Set spec `status: implemented` after the last pull request merges.

## Acceptance criteria

- [ ] Two overlapping live holds on one asset are impossible, even under concurrent requests.
- [ ] A full-day hold blocks the whole service day.
- [ ] A full-day hold that ends after midnight blocks until the end plus the buffer.
- [ ] A timed hold blocks its hours plus the larger buffer.
- [ ] A hold may start at the exact minute another hold ends.
- [ ] Releasing a hold twice has the same result as releasing it once.
- [ ] `HoldAssetService` uses the next pool asset when the first one is busy.
- [ ] `HoldAssetService` fails with "this time is no longer available" when no pool asset is free.
- [ ] Every listing has one default package and a pool after the data step.
- [ ] Every active asset has one schedule after the data step.
- [ ] A provider cannot close a day that has a live hold.
- [ ] A provider cannot shorten a schedule so that a live hold falls outside it.
- [ ] The quote reads the base price from the package, and the amount for existing listings does not change.
- [ ] A policy price edit changes the default package price.
- [ ] Checkout, the date filter and the slot code behave as before.
- [ ] No client-side price computation.

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/integration/catalog/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
