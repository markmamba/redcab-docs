---
title: "Add the package list to the marketplace listing detail"
sidebar_label: API · Detail packages
issue: "https://github.com/markmamba/red-cab-api/issues/231"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-210-asset-holds-in-checkout-and-booking.md"
---

## TL;DR

- Ships a `packages` list in the response of `GET /marketplace/catalog/listings/:listing_id`.
- Each package carries the booking fields: the slug, the names, the limits, the times and the vehicle category.
- Lists only active packages that have at least one active asset in the pool.
- A listing with no such package returns an empty list, and `is_bookable` is false.
- Does NOT return a price, because the price comes only from the quote (`PRC-1`).
- Does NOT change the list endpoints or the provider endpoints.
- Breaking change: No, because the response only gains a field.

## Problem

The tourist availability endpoints need a package slug, in `.../packages/:package_slug/open_dates` and `.../start_times`.

The listing detail does not return any package slug.

It returns only the package uuid inside the price breakdown.

The web picker (red-cab-web#155) needs the slug, the start window and the passenger limit.

Release 3 gives a listing many packages, so the web must not guess the slug `default`.

Evidence: `app/domains/catalog/marketplace_listing_detail_serializer.rb`, `app/domains/catalog/listings/marketplace_show_manager.rb`, issue #231.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Model | [Listings and packages](/docs/30-49-domains/catalog/models/listings-and-packages) | The package columns |
| Ruling | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | A bookable package has an active asset in its pool |
| Spec | api-210 | `is_bookable`, the availability endpoints and the slug |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth |
| PRC-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | The client never sees a price that the quote did not compute |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-25. The list holds the active packages that have at least one active asset in the pool.** | All active packages. | The web never offers a package that cannot be booked. It matches the bookable rule. |
| 2 | **Owner ruling, 2026-10-25. Each package carries the booking fields only: `uuid`, `slug`, `name_en`, `name_ja`, `max_passengers`, `schedule_kind`, `duration_minutes`, `earliest_start_time`, `latest_start_time`, `start_interval_minutes` and `vehicle_category`.** | Add the descriptions. | Release 2 shows one package with no chooser. Descriptions and prices come with release 3. |
| 3 | **Added point, please review. `uuid` equals `price_breakdown.package_id`, so the web can match a package to the quote.** | No uuid. | The web needs to know which package the quote priced. |
| 4 | **Added point, please review. The times are strings in `HH:MM` form.** | ISO times. | The availability endpoints use `HH:MM`. |
| 5 | **Added point, please review. The list is ordered by `display_order`, then by `id`.** | No order. | The order must not change between two calls. |
| 6 | **Added point, please review. The listing detail manager runs one query for the list. The query keeps the packages with an active pool asset, so no query runs for each package.** | Preload and filter in Ruby. | The Catalog rules ask for no N+1 queries. |
| 7 | **Added point, please review. `is_bookable` is true exactly when the list is not empty. `BookableCheckService` is replaced by `BookablePackagesFetchService`, which returns the list.** | Keep both services. | One query gives both answers, and the two cannot disagree. |
| 8 | **Added point, please review. A listing that is not bookable returns `packages: []`.** | Return null. | The web can loop over the list without a check. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/listings/:listing_id` | Optional | `passenger_count`, optional `package_slug` | The listing detail with `packages` | `packages` is new |

An example of the new field:

```json
"packages": [
  {
    "uuid": "…",
    "slug": "default",
    "name_en": "Haneda Airport Transfer",
    "name_ja": "羽田空港送迎",
    "max_passengers": 4,
    "schedule_kind": "full_day",
    "duration_minutes": 480,
    "earliest_start_time": "00:00",
    "latest_start_time": "23:30",
    "start_interval_minutes": 30,
    "vehicle_category": "alphard_van"
  }
]
```

### Files to create or modify (API)

- `app/domains/catalog/packages/bookable_packages_fetch_service.rb`, new, in place of `bookable_check_service.rb`.
- `app/domains/catalog/listings/marketplace_show_manager.rb` and `marketplace_show_dto.rb`.
- `app/domains/catalog/marketplace_listing_detail_serializer.rb`.
- `app/domains/catalog/marketplace_listing_package_embedded_serializer.rb`, new.
- Tests for the service, the manager and the listing detail response.

## Data / domain touchpoints

- Bounded context: CAT.
- It is a read, with no table change.
- No price is read or returned.

## Out of scope

- A package price or a display price (release 3).
- A package chooser and package endpoints for providers (release 3).
- The package descriptions.
- The list endpoints.

## Tasks

### API

- [ ] Add `BookablePackagesFetchService` and remove `BookableCheckService`.
- [ ] Use the service in the listing detail manager, and set `is_bookable` from it.
- [ ] Add the embedded package serializer and the `packages` field.
- [ ] Add tests for one package, many packages, an inactive package, a package with no active pool asset, and no package.
- [ ] Add a test that the response runs no query for each package.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The listing detail returns `packages` with the fields in decision 2.
- [ ] An inactive or archived package is not listed.
- [ ] A package with no active asset in its pool is not listed.
- [ ] The list is ordered by `display_order`, then `id`.
- [ ] A listing that is not bookable returns `packages: []` and `is_bookable: false`.
- [ ] The response has no package price.
- [ ] The `uuid` of the package equals `price_breakdown.package_id`.
- [ ] The listing detail does not run a query for each package.

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
