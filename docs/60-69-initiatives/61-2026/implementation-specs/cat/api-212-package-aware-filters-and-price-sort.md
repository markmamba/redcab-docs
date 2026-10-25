---
title: "Make filters and price sort package-aware"
sidebar_label: API · Package filters and price sort
issue: "https://github.com/markmamba/red-cab-api/issues/212"
repos:
  - red-cab-api
status: implemented
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-207-scoped-listings-index.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-211-many-packages-and-display-prices.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-231-listing-detail-packages.md"
---

## TL;DR

- Ships the price filter, the vehicle type filter and a package-aware group size filter on `GET /marketplace/catalog/listings`.
- Ships the sort Price: low to high on the starting price.
- Ships `is_price_filter_ignored` in `meta`, and `is_in_price_range` on each package of the listing detail.
- Ships the indexes on `starting_price_jpy` and on `languages_supported`.
- Turns on the `starting_price_jpy IS NOT NULL` test in the discoverable scope.
- Does NOT change the web, the legacy index or the date filter.
- Breaking change: Yes for the group size filter, which now reads packages and no longer reads `base_capacity`.

## Problem

The scoped index rejects `vehicle_type`, `min_price` and `max_price` with "This filter is not available yet."

The group size filter reads `catalog_listings.base_capacity`, which moves to the package.

The sort Price: low to high does not exist.

Red-cab-api#211 now stores `display_price_jpy` on each package and `starting_price_jpy` on each listing.

The tourist cannot find a listing by budget, vehicle or group size, and cannot sort by price.

Evidence: `app/domains/catalog/listings/marketplace_scoped_index_request.rb`, `marketplace_scoped_index_validator.rb`, `marketplace_scoped_index_manager.rb`, issue #212.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Marketplace filter combination](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-filter-combination) | OR inside a category, AND across categories |
| Ruling | [Starting price and price filter](/docs/30-49-domains/catalog/catalog-decisions/#starting-price-and-price-filter) | Inclusive bounds, the card price, and the min above max rule |
| Ruling | [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-sort-options) | Price: low to high and its tie-break |
| Ruling | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | A listing needs an available package |
| Requirement | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | The worked examples |
| Model | [Listings and packages](/docs/30-49-domains/catalog/models/listings-and-packages) | The price caches and the filter table |
| Naming | [Discover API params](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#discover-api-params) | `min_price`, `max_price`, `vehicle_type` |
| Spec | api-207, api-211, api-231 | The index, the display prices and the package list |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth and the `S4` index tags |
| PRC-1, PRC-2 | [Invariants](/docs/70-79-business/business-rules/invariants) | Discovery reads a stored price that only the Pricing module writes |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. The package filters (vehicle type, group size and price) must all match ONE available package.** | Each filter checks any package alone. | A tourist who asks for 8 passengers under ¥10,000 needs one package that does both. |
| 2 | **Owner ruling, 2026-10-26. A minimum above the maximum gives a 200 response, ignores the price filter and sets `meta.is_price_filter_ignored` to true.** | A 422 error. | The requirement says the filter is not applied and the page shows a message. |
| 3 | **Owner ruling, 2026-10-26. The listing detail takes `min_price` and `max_price` and returns `is_in_price_range` on each package.** | The web compares the prices. | The client does no price comparison. |
| 4 | **Owner ruling, 2026-10-26. `min_price` and `max_price` filter. `price_min` and `price_max` keep returning 422, and the message names the new params.** | Accept both name pairs. | The naming page names `min_price` and `max_price`. A guard must block, so no silent ignore. |
| 5 | **Owner ruling. Both bounds are inclusive, and one bound alone is valid.** | Exclusive bounds. | The Catalog decisions page sets this. |
| 6 | **Owner ruling. The price filter reads `display_price_jpy`, the card keeps `starting_price_jpy` as "From ¥X", and the filter never changes the card.** | Show the matching package price on the card. | The Catalog decisions page sets this. |
| 7 | **Owner ruling. The sort Price: low to high uses `starting_price_jpy`, and the price filter does not change the order.** | Sort by the matching package price. | The Catalog decisions page sets this. |
| 8 | **Owner ruling. Equal sort keys use the newer `published_at`, then the newer `created_at`.** | Sort by title. | The Catalog decisions page sets this. |
| 9 | **Owner ruling. Service type, language and vehicle type take many values. Values in one category use OR.** | One value only. | The Catalog decisions page sets this. |
| 10 | **Owner ruling. A package that is not available never counts. A package is available when its `display_price_jpy` is not empty.** | Join the pool assets in each query. | Red-cab-api#211 sets `display_price_jpy` only for a package that is active and has an active pool asset. |
| 11 | **Added point, please review. The three package filters become one `EXISTS` subquery on `catalog_listing_packages`, and each filter adds one condition to it.** | One `EXISTS` for each filter. | One subquery gives decision 1 and keeps a listing once in the result. |
| 12 | **Added point, please review. `vehicle_type` is a comma-separated list of `vehicle_category` values. A value outside the allowed list is a validation error.** | Ignore unknown values. | It follows the rule for `service_type`. |
| 13 | **Added point, please review. `min_price` and `max_price` are whole yen, 0 or more. A value that is not a whole number is a validation error.** | Round the value. | Money is whole yen (`PAY-1`). |
| 14 | **Added point, please review. `passenger_count` matches `max_passengers` of an available package. It no longer reads `base_capacity`.** | Keep `base_capacity` until PR 2 of red-cab-api#211. | PR 2 of red-cab-api#211 drops `base_capacity`, and the issue asks for packages. |
| 15 | **Added point, please review. The sort key is `order_by=starting_price_jpy` with `order_dir=asc`. The other two keys keep `desc`.** | A named key such as `price_asc`. | The naming page uses whitelisted columns. A rejected direction keeps the message for that key. |
| 16 | **Added point, please review. A listing with no starting price sorts last, and the discoverable scope removes it anyway.** | Sort it first. | The test in decision 17 makes this case rare. |
| 17 | **Added point, please review. The discoverable scope tests `starting_price_jpy IS NOT NULL` in place of the test for an active package with an active pool asset.** | Keep both tests. | Red-cab-api#211 sets the starting price only for a listing with an available package, so the two tests agree. |
| 18 | **Added point, please review. The 422 branch of the scoped index for an empty starting price is removed, because the discoverable scope now excludes such a listing.** | Keep the branch. | Dead code hides the real rule. |
| 19 | **Added point, please review. The date filter does not change. For a timed package it means "may have free times".** | Join the date filter to the same package. | The model page defines the date filter as a listing test. |
| 20 | **Added point, please review. `meta.is_price_filter_ignored` is always in the response. It is true only for a minimum above the maximum.** | Add the key only when true. | The web reads one stable key. |
| 21 | **Added point, please review. On the listing detail, `is_in_price_range` is empty (null) when no bound was sent, or when the minimum is above the maximum.** | False in those cases. | Null means that no range applies. |
| 22 | **Added point, please review. The listing detail uses the same validation of `min_price` and `max_price` as the index, except that a minimum above the maximum is not an error.** | Reject it on the detail. | Decision 2 treats it as an ignored filter. |
| 23 | **Added point, please review. The partial index on `starting_price_jpy` has `WHERE status = 'published'`. The index on `languages_supported` is a GIN index.** | Plain B-tree indexes. | The DBML sets both. The `?|` operator needs GIN. |
| 24 | **Added point, please review. The legacy index (`/marketplace/catalog/districts/...`) does not change.** | Port the filters to it. | Red-cab-api#216 removes it. |

## API contract

### Marketplace index

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/listings` | none | New: `vehicle_type`, `min_price`, `max_price`. Changed: `passenger_count`, `order_by`, `order_dir`. | `{ catalog_listings: [...], meta: {..., is_price_filter_ignored} }` | See the rules below |

Rules:

- `vehicle_type` is a comma-separated list, for example `vehicle_type=alphard_van,hiace_van`.
- `min_price` and `max_price` are whole yen, for example `min_price=12000&max_price=18000`.
- `order_by` is `published_at`, `rating_average` or `starting_price_jpy`.
- `order_dir` must be `asc` for `starting_price_jpy`, and `desc` for the other two.
- `price_min` and `price_max` return 422.

The package filter condition:

```sql
EXISTS (
  SELECT 1
  FROM catalog_listing_packages p
  WHERE p.listing_id = catalog_listings.id
    AND p.status = 'active'
    AND p.display_price_jpy IS NOT NULL
    AND p.vehicle_category IN (:vehicle_types)   -- only when vehicle_type is sent
    AND p.max_passengers >= :passenger_count     -- only when passenger_count is sent
    AND p.display_price_jpy >= :min_price        -- only when min_price is sent
    AND p.display_price_jpy <= :max_price        -- only when max_price is sent
)
```

Error text:

- Vehicle type: "Please select valid vehicle types: sedan, alphard_van, …"
- Price: "Please enter the price in whole yen, 0 or more."
- Old price params: "Please use min_price and max_price."
- Sort direction for price: "Please use ascending order for this sort."

### Listing detail

| Method | Path | Change |
| --- | --- | --- |
| GET | `/marketplace/catalog/listings/:listing_id` | New params `min_price` and `max_price`. Each package gains `is_in_price_range`. |

- `is_in_price_range` is true when `display_price_jpy` is inside the bounds.
- It is null when no bound was sent, or when the minimum is above the maximum.

### Files to create or modify (API)

- `app/domains/catalog/listings/marketplace_scoped_index_{request,validator,manager}.rb`: the new params, the sort and the meta key.
- `app/domains/catalog/listings/package_filter_service.rb`, new: builds the `EXISTS` condition.
- `app/domains/catalog/listing.rb`: the `discoverable` scope.
- `app/domains/catalog/listings/marketplace_show_{request,validator,manager}.rb` and the listing detail serializer path: the range flag.
- `app/domains/catalog/marketplace_listing_package_embedded_serializer.rb`: `is_in_price_range`.
- `db/migrate/{timestamp}_add_price_and_language_indexes_to_catalog_listings.rb`.
- `docs/db/catalog.dbml`: remove the `ships in: S4` tags of the two indexes.
- `db/schema.rb`.
- `docs/api/marketplace/…`: Bruno files for the index and the detail.

## Data / domain touchpoints

- Bounded context: CAT.
- It is a read, and it changes no table except two indexes.
- Pricing: the filter reads the stored `display_price_jpy`, and checkout still quotes again.
- No client-side price computation, and the client sends no price.

## Out of scope

- The web screens (red-cab-web#156).
- The Most booked sort (red-cab-api#215).
- The legacy index.
- Seasonal prices in the display price.
- A date filter that joins the same package.

## Tasks

### API

- [x] Accept `vehicle_type`, `min_price` and `max_price`, and keep 422 for `price_min` and `price_max`.
- [x] Validate the vehicle types, the price bounds and the sort direction for each key.
- [x] Build `PackageFilterService` with one `EXISTS` subquery.
- [x] Switch the group size filter from `base_capacity` to packages.
- [x] Add the sort `starting_price_jpy` with the tie-break.
- [x] Add `meta.is_price_filter_ignored`.
- [x] Turn on `starting_price_jpy IS NOT NULL` in the discoverable scope.
- [x] Remove the 422 branch for an empty starting price from the scoped index.
- [x] Add `min_price`, `max_price` and `is_in_price_range` to the listing detail.
- [x] Add the migration for the two indexes, and remove the `ships in: S4` tags.
- [x] Add integration tests for the worked examples below.
- [x] Update the Bruno files.

### Docs

- [x] Set spec `status: implemented` after merge.

## Acceptance criteria

- [x] A listing with packages at ¥8,000, ¥15,000 and ¥25,000 matches the range ¥12,000 to ¥18,000.
- [x] The card shows "From ¥8,000" under that range.
- [x] Price: low to high ranks a starting price of ¥8,000 above ¥12,000 under that range.
- [ ] A package that is not active never counts for the price, the vehicle or the group size filter.
- [x] A package whose pool has no active asset never counts.
- [x] A package for 4 at ¥8,000 and a package for 10 at ¥25,000 match a group of 8 alone.
- [x] The same listing does not match a group of 8 with a maximum of ¥10,000.
- [x] A minimum above the maximum returns 200 with the price filter off and `is_price_filter_ignored: true`.
- [x] `price_min` and `price_max` return 422 with the message that names `min_price` and `max_price`.
- [x] The vehicle filter takes many values and uses OR.
- [x] A listing shows once, even when two packages match.
- [x] `order_dir=asc` is valid only for `starting_price_jpy`.
- [x] The listing detail marks the packages inside the range, and returns null with no range.
- [x] A listing with no starting price is not discoverable.
- [x] Integration test: `test/integration/marketplace/catalog/listings_scoped_index_integration_test.rb`.
- [x] No client-side price computation.

## Verification

```bash
# API (from red-cab-api/)
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

- The Sorbet baseline is 69 errors.
- The parallel test run crashes in `pg` on macOS, so use `PARALLEL_WORKERS=1`.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
