---
title: "Remove legacy geography roles and leftover slot code"
sidebar_label: API · Catalog cleanup
issue: "https://github.com/markmamba/red-cab-api/issues/216"
repos:
  - red-cab-api
  - red-cab-web
status: implemented
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#legacy-geography-roles"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#release-order"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#asset-holds"
  - "docs/30-49-domains/38-catalog/models/geography.md"
  - "docs/30-49-domains/38-catalog/models/asset-availability.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-210-asset-holds-in-checkout-and-booking.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-155-asset-holds-web.md"
---

## TL;DR

- The API stops using the availability slot, the seat counter and the seat allocation table.
- The API drops the district and area roles: `is_discovery_root` and `discovery_root_id`.
- The district and area endpoints go away.
- `is_listable` becomes `is_pickable`.
- An asset cannot retire while it has a live hold that ends in the future.
- The web sends every old district or area URL to the all-services page.
- Does NOT add any feature.
- Does NOT start before releases 3 and 4 are merged.
- Breaking change: Yes, because endpoints and columns disappear.

## Problem

New code can still read the old slot and the old district roles.

The slot tables, the slot endpoints and the seat counter have no tourist or provider user now.

The web no longer calls the slot endpoints since red-cab-web#169 and #170.

About 33 API files read `is_discovery_root` or `discovery_root_id`.

Old and new rules sit side by side, so a new engineer can follow the wrong one.

Evidence: `app/domains/catalog/availability_slots/`, `app/domains/bookings/seat_allocation.rb`, `app/domains/catalog/geography.rb`, `config/routes/marketplace_routes.rb`, issue #216.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Legacy geography roles](/docs/30-49-domains/catalog/catalog-decisions/#legacy-geography-roles) | The old roles are deprecated, and a cleanup slice removes them |
| Ruling | [Release order](/docs/30-49-domains/catalog/catalog-decisions/#release-order) | Release 5 ships this cleanup, after releases 1 to 4 |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) | A hold replaces the slot and the seat counter |
| Model | [Geography](/docs/30-49-domains/catalog/models/geography) | The tree, the slug rules and the pickable node |
| Model | [Asset availability](/docs/30-49-domains/catalog/models/asset-availability) | Hold rules |
| Spec | api-210 and web-155 | They moved checkout and the web to holds and left this cleanup |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) and [bookings.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/bookings.dbml) | Column truth |
| INV-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | A confirmed booking never changes |

## Design decisions

Each row is either an owner ruling or an added point for review.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-25. One spec covers the slot cleanup and the geography cleanup. Code starts only after releases 3 and 4 are merged.** | Slot cleanup now and geography later. Both now. | The issue lists releases 2 to 4 as a dependency. One cleanup release keeps one migration plan. |
| 2 | **Owner ruling, 2026-10-25. No real booking uses a slot. One migration drops `slot_id` from checkout sessions and orders, drops `catalog_availability_slots` and drops `bookings_seat_allocations`.** | Keep the slot columns as history. Copy the slot times first. | Old rows hold no data that someone needs. |
| 3 | **Owner ruling, 2026-10-25. An old district or area URL on the web redirects to the all-services page with a 301. The web makes no API call for it. An old listing URL still redirects to the listing.** | A small slug map endpoint. A fixed slug map in the web. | The API can drop the district model fully. |
| 4 | **Owner ruling, 2026-10-25. An asset cannot retire while it has a held or confirmed hold that ends in the future.** | Nothing blocks retirement. | It keeps today's rule, with holds in place of slots. |
| 5 | **Owner ruling, 2026-10-25. `is_listable` is renamed to `is_pickable` in this cleanup.** | Keep the old name. | The name says what the flag means. |
| 6 | **Added point, please review. The migration needs a check first. It stops with a clear error if any order or checkout session has `slot_id` set and `asset_hold_id` empty.** | Drop without a check. | Owner ruling 2 says no such row exists. A failed check protects a wrong guess. |
| 7 | **Added point, please review. The check constraints `asset_hold_id IS NOT NULL OR slot_id IS NOT NULL` become `asset_hold_id NOT NULL` on both tables.** | Keep the column nullable. | Every row has a hold after owner ruling 2. |
| 8 | **Added point, please review. Slug rules after the roles go. Region and prefecture slugs stay unique for each level. A pickable node keeps a slug that is unique among the children of its parent.** | A global slug for every node. | The old unique indexes read `discovery_root_id`. A parent is the closest rule that stays. |
| 9 | **Owner ruling, 2026-10-27. `SlugResolutionService` and its result class are deleted.** | Keep a small version for regions and prefectures. | `ScopeResolutionService` already resolves regions and prefectures for the region pages. After the district, area and old listings index code goes, nothing calls the old service. Archived-slug redirects pointed to district and area paths, which no longer exist. |
| 10 | **Added point, please review. The endpoint `GET /marketplace/catalog/areas/near` is removed with the other area endpoints.** | Keep it. | The web does not call it. It reads the area role. |
| 11 | **Added point, please review. `Bookings::SeatAllocations::ReleaseForPaymentFailedManager` moves to `Bookings::CheckoutSessions::ReleaseForPaymentFailedManager` and keeps only the hold release.** | Keep the old namespace. | The seat allocation model is gone. |
| 12 | **Added point, please review. The team geography endpoints stop accepting and returning `is_discovery_root`. They accept and return `is_pickable`.** | Keep the old field. | The field has no meaning after the cleanup. |
| 13 | **Added point, please review. The AGENTS.md rules 1, 4 and 16, the examples that name a slot, and `app/domains/AGENTS.md` change in the same pull request.** | A later docs pull request. | The rules still tell agents to use the seat counter. |
| 14 | **Added point, please review. The API work ships in two pull requests. PR 1: slot code and tables. PR 2: geography roles. The web change ships on its own in red-cab-web#183, before PR 2.** | One pull request. The web change inside an API pull request. | Each pull request stays small to review. They share one spec. The web change lives in the web repo. PR 1 does not touch the district endpoints, so it does not wait for the web. |

## API contract

### Endpoints removed

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/marketplace/catalog/listings/:listing_id/availability_slots` | The web uses package open dates and start times |
| POST | `/providers/catalog/listings/:listing_id/availability_slots` | Providers use schedules and closures |
| GET | `/providers/catalog/listings/:listing_id/availability_slots` | Same |
| PATCH | `/providers/catalog/listings/:listing_id/availability_slots/:availability_slot_id` | Same |
| GET | `/marketplace/catalog/districts` | The region pages replace it |
| GET | `/marketplace/catalog/districts/:district_slug` | Same |
| GET | `/marketplace/catalog/districts/:district_slug/areas` | Same |
| GET | `/marketplace/catalog/districts/:district_slug/areas/:area_slug` | Same |
| GET | `/marketplace/catalog/districts/:district_slug/areas/:area_slug/listings` | The scoped listings index replaces it |
| GET | `/marketplace/catalog/areas/near` | See decision 10 |

### Endpoints changed

| Method | Path | Change |
| --- | --- | --- |
| GET, POST | `/team/catalog/geographies` | The `is_discovery_root` field and its filter go. The `is_listable` field becomes `is_pickable`. A duplicate slug under one parent, or for one region or prefecture, returns a 422 with a plain message (decision 8). |
| PATCH | `/providers/catalog/assets/:asset_id` | Retiring an asset checks live holds, not slots |

### Database

- Drop table `catalog_availability_slots`.
- Drop table `bookings_seat_allocations`.
- Drop column `slot_id` and its index from `bookings_checkout_sessions` and `bookings_orders`.
- Replace the check constraint `bookings_checkout_sessions_hold_or_slot` and `bookings_orders_hold_or_slot` with `asset_hold_id NOT NULL`.
- Drop columns `is_discovery_root` and `discovery_root_id` from `catalog_geographies`.
- Drop the indexes `index_catalog_geographies_on_root_and_slug`, `index_catalog_geographies_on_root_status_order` and `index_catalog_geographies_on_discovery_root_slug`.
- Rename column `is_listable` to `is_pickable`, with its indexes and check constraints.
- Add a unique index on `parent_id` and `slug` where `is_pickable` is true.
- The migration `down` restores only the renamed column and the new index.
- The dropped data cannot return.

### Files to remove (API)

- `app/domains/catalog/availability_slots/` and its tests.
- `app/domains/catalog/availability_slot.rb`, `marketplace_availability_slot_serializer.rb` and `providers_availability_slot_base_serializer.rb`.
- `app/controllers/marketplace/catalog/availability_slots_controller.rb` and `app/controllers/providers/catalog/availability_slots_controller.rb`.
- `app/domains/catalog/availability/reserve_seats_service.rb`, `reserve_seats_dto.rb` and `restore_seats_service.rb`.
- `app/domains/bookings/seat_allocation.rb`.
- `app/domains/catalog/districts/` and `app/domains/catalog/areas/`.
- `app/domains/catalog/geographies/slug_resolution_service.rb` and `slug_resolution_result.rb` (decision 9).
- `app/domains/catalog/geographies/near_me_manager.rb`, `near_me_request.rb` and `near_me_validator.rb` (decision 10).
- `app/domains/catalog/listings/marketplace_index_manager.rb`, `marketplace_index_request.rb` and `marketplace_index_validator.rb`, and the `index` action of `listings_controller.rb` (the scoped index replaces them).
- `app/controllers/marketplace/catalog/districts_controller.rb` and `areas_controller.rb`.
- `docs/api/providers/catalog/listings/availability_slots/` and the slot requests in `docs/api/marketplace/catalog/listings/`.

### Files to modify (API)

- `config/routes/marketplace_routes.rb` and `config/routes/providers_routes.rb`: remove the routes above.
- `app/domains/bookings/order.rb` and `checkout_session.rb`: remove the slot and seat allocation associations.
- `app/domains/bookings/checkout_sessions/`: remove the slot paths in `tourists_create_manager.rb`, `materialize_order_manager.rb` and `expire_sweep_manager.rb`.
- `app/domains/bookings/orders/`: read the service times from the order only, in the complete, auto-complete, index and show managers.
- `app/domains/bookings/tourists_booking_list_serializer.rb` and `providers_booking_list_serializer.rb`: return the service times from the order only.
- `app/domains/payments/charges/` and `provider_events/handlers/payment_failed_manager.rb`: drop the old seat check and the seat release.
- `app/domains/catalog/listing.rb` and `provider_asset.rb`: remove the `availability_slots` associations.
- `app/domains/catalog/provider_assets/providers_update_validator.rb`: check live holds on retirement.
- `app/domains/catalog/geography.rb` and the `geographies/` folder: remove the district and area roles and rename `is_listable`.
- `app/domains/catalog/listings/marketplace_show_manager.rb`: stop loading `discovery_root`.
- `app/domains/catalog/marketplace_area_detail_embedded_serializer.rb`: drop the `district` field under `area` (the web does not read it).
- `app/domains/catalog/team_geography_serializer.rb`: return `is_pickable` and no `is_discovery_root`.
- `lib/dev/catalog_marketplace_seeder.rb` and `team_reviews_moderation_seeder.rb`: seed holds and prefectures, not slots and districts.
- `docs/db/catalog.dbml`, `bookings.dbml`, `redcab.dbml` and the `.dbdiagram` files.
- `AGENTS.md` (rules 1, 4 and 16, the sample error message) and `app/domains/AGENTS.md` (the slot examples).
- About 40 test files and `test/support` helpers that create slots or districts.

## Web contract

| Surface | Route | Change |
| --- | --- | --- |
| Marketplace | `/districts` and its children | Redirect to the all-services page with a 301, with no API call |
| Marketplace | `/districts/:districtSlug/areas/:areaSlug/listings/:listingUuid` | Still redirects to the listing slug page |
| Tourist | The old discover routes | Redirect to the all-services page with a 301, with no API call |

### Files to modify (Web)

- `app/api/marketplace-catalog-districts-api.js`: remove.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-legacy-redirect-utils.js`: remove `resolveDistrictRedirectPath`.
- `app/routes/tourist/tourist-account-discover-redirect-utils.js`: remove the district API call.
- The matching spec files.

The web change ships in [red-cab-web#183](https://github.com/markmamba/red-cab-web/issues/183), before PR 2 removes the district endpoints.

## Data / domain touchpoints

- Bounded contexts: CAT, BKG and PAY, read through the API.
- Transaction boundaries: the hold services keep their own rules from api-209 and api-210.
- Snapshots: a confirmed booking keeps its service times, and the migration does not change them (`INV-1`).

## Known limits

- The migration cannot undo the dropped slot data.
- Old district URLs lose their district page, and visitors land on all services.

## Out of scope

- New features of any kind.
- Most booked sort (slice S8).
- The cancel and decline holds (red-cab-api#171 and #172).
- A package chooser or a booking location (releases 3 and 4).
- Team portal screens for geographies, because the web has none that read the old roles.

## Tasks

### Planning

- [x] Get this spec to `status: approved`.
- [x] Wait until releases 3 and 4 are merged.
- [x] Create the web issue for the redirect change and link it here: red-cab-web#183.

### Web (red-cab-web#183)

- [x] Redirect old district and area URLs without an API call.
- [x] Remove the districts API client and its tests.

### API: PR 1 (slot code)

- [x] Add the migration check from decision 6.
- [x] Remove the slot routes, controllers, managers and serializers.
- [x] Remove the seat services and the seat allocation model.
- [x] Change the checkout, order, payment and serializer code to use holds only.
- [x] Check live holds when an asset retires.
- [x] Add the migration that drops the slot tables and columns.
- [x] Update the tests, the seeders, the DBML and the Bruno requests.

### API: PR 2 (geography roles)

Starts after PR 1 and red-cab-web#183 are merged.

- [x] Remove the district and area routes, controllers and managers.
- [x] Remove the role scopes, associations and slug branches.
- [x] Rename `is_listable` to `is_pickable` everywhere.
- [x] Add the migration for the columns, the indexes and the new unique index.
- [x] Update the tests, the seeders and the DBML.
- [x] Update `AGENTS.md` and `app/domains/AGENTS.md`.

### Docs

- [x] Set spec `status: implemented` after merge.

## Acceptance criteria

- [x] No code reads `catalog_availability_slots`, `bookings_seat_allocations`, `slot_id`, `is_discovery_root`, `discovery_root_id` or `is_listable`.
- [x] The removed routes return 404.
- [x] The web sends an old district URL to all services with a 301.
- [x] The web sends an old listing URL to the listing page.
- [x] A tourist can still book, pay and see the booking with holds.
- [x] An asset with a live future hold cannot retire.
- [x] A confirmed booking keeps its service times (`INV-1`).
- [x] The migration stops with an error when a row has a slot and no hold.
- [x] `bin/rails test`, `bundle exec srb tc` and `bundle exec rubocop` pass at their current baseline.
- [x] No client-side price computation.

## Verification

```bash
# API (from red-cab-api/)
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
grep -rnE "availability_slot|AvailabilitySlot|seat_allocation|slot_id|discovery_root|is_listable" app lib config test docs/db

# Web (from red-cab-web/)
npm run lint
npm test
npm run build
```

- Run the `review-rails-style` and `review-react-style` skills by hand on each pull request.
- Each pull request lists what it did not check.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-25 | Owner | Approved. Code waits for releases 3 and 4. |
| 2026-10-27 | Owner | Wording fix to decision 14 and the Tasks. The web change ships in red-cab-web#183 before PR 2. No design change. |
| 2026-10-27 | Owner | Decision 9 changed from "keep a trimmed slug service" to "delete it". The file lists now name the slug, near-me and old listings index files that go. Found while building PR 2 (red-cab-api#252). |
| 2026-10-27 | Owner | Both API pull requests are merged: red-cab-api#251 (slot code) and red-cab-api#253 (geography roles). The web change is merged in red-cab-web#184. Status set to `implemented`. |
