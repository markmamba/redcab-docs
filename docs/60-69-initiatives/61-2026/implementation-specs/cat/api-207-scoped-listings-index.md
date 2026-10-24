---
title: "Add a scoped marketplace listings index with filters and sort"
sidebar_label: API · Scoped listings index
issue: "https://github.com/markmamba/red-cab-api/issues/207"
repos:
  - red-cab-api
status: implemented
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#marketplace-filter-combination"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#marketplace-sort-options"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#discoverability-completeness"
  - "docs/30-49-domains/38-catalog/requirements/tourist-browse-and-search.md"
---

## TL;DR

- Ships `GET /marketplace/catalog/listings`. It returns listings for all of Japan, one region, or one prefecture.
- Ships `GET /marketplace/catalog/regions` for the home page.
- Ships the scope `Catalog::Listing.discoverable` and the Top rated sort index.
- Service type and language take many values. OR inside a category, AND across categories.
- The sorts are Recently added (default) and Top rated.
- The database paginates. The server quotes the card price only for the listings on the current page.
- Does NOT ship keyword search, the price filter, the vehicle filter, the price sort or the Most booked sort.
- Does NOT change the legacy route `/districts/:d/areas/:a/listings`.
- Breaking change: No. Both endpoints are new.

## Problem

No endpoint returns the listings of a region, a prefecture or the whole marketplace.

The current index finds the rows of one area, quotes the price of every row in Ruby, and paginates the full list in memory. A large scope is slow.

The filters take one value. Tourists need OR inside a category and AND across categories.

Evidence: `app/domains/catalog/listings/marketplace_index_manager.rb`, `app/controllers/marketplace/catalog/listings_controller.rb`, issue #207.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Marketplace filter combination](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-filter-combination) | OR inside a category, AND across categories |
| Ruling | [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-sort-options) | Recently added is the default. Equal keys use the newer `published_at`, then the newer `created_at`. |
| Ruling | [Top rated sort](/docs/30-49-domains/catalog/catalog-decisions/#top-rated-sort) | Rated listings first, highest first. No rating last. A tie goes to more ratings, then the newer listing. |
| Ruling | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | The query decides, with no stored flag. A test turns on when its table ships. |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | A scope includes a listing through its primary or any additional destination |
| Requirements | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | Empty state, hide-empty home cards |
| Naming | [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases) | Query parameter names |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Index truth. Tags `ships in: S8` mark this slice. |
| INV-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | A node shows only with a discoverable listing below it |
| Slices S1 to S3, S7 | Specs api-203 to api-206 | Region, primary and additional destinations, listing slug. All merged. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **`Catalog::Listing.discoverable` checks three facts in release 1: status `published`, at least one photo, and an active pricing policy. Each other test turns on in the release that ships its table.** | Status only. Or all tests now. | Author decision on 2026-10-24. The photo table exists (INV-10). Packages and coverage tables do not exist yet. An active pricing policy stands in for "starting price is set" until the package slices ship. |
| 2 | **A published listing with no active pricing policy is left out of results. It does not fail the request.** | Keep the 422 of the legacy index | Author decision on 2026-10-24. One bad row must not break a marketplace-wide page. |
| 3 | **A listing is in a scope when its primary destination, or an active additional destination, has a `path` equal to the scope path or below it. The query uses `EXISTS`, so a listing appears once.** | A join on the destination tables | A join repeats a listing that matches twice. |
| 4 | **Unknown or inactive region or prefecture: 404. A known scope with no discoverable listing: 200 with an empty list.** | 404 for an empty scope | The requirements page asks for an empty state. |
| 5 | **A prefecture is found by `prefecture_slug` under the region with `region_slug`. `prefecture_slug` without `region_slug` is a validation error.** | Find a prefecture by slug alone | Hokkaido is both a region slug and a prefecture slug. |
| 6 | **`service_type` and `language` are comma-separated lists. A value outside the allowed values is a validation error. The legacy single value is a list of one.** | Repeated params | The naming page defines comma-separated values. |
| 7 | **Language matches with `languages_supported ?| array[...]` (any selected value). Service type matches with `IN`.** | Several `OR` clauses | One clause for each category. |
| 8 | **`date` and `passenger_count` keep the legacy meaning until the package slices: `date` needs an open availability slot on that civil day in the Service Timezone of the primary prefecture, and `passenger_count` needs `base_capacity` at or above the value.** | Read packages | Packages do not exist yet. |
| 9 | **`vehicle_type`, `min_price`, `max_price`, `price_min`, `price_max` and `keyword` return 422 "This filter is not available yet."** | Ignore them | Author decision on 2026-10-24. A guard must block. It must not return unfiltered results. |
| 10 | **`order_by` is `published_at` (default) or `rating_average`. `order_dir` must be `desc` or omitted.** | A named `top_rated` key. Ascending order. | Author decision on 2026-10-24. The naming page uses columns. The control has no ascending option. |
| 11 | **Recently added: `published_at DESC, created_at DESC`. Top rated: `rating_average DESC NULLS LAST, reviews_count DESC, published_at DESC, created_at DESC`.** | Add `title_en` as the last key | The rulings define these orders. |
| 12 | **The manager paginates the relation in the database with Pagy, and quotes the card price only for the rows of the current page. The response keeps the legacy shape: `catalog_listings` and `meta`.** | Quote every row, as the legacy index does | This removes the slowness of problem 2. The card price stays "as it is today": `CalculateQuoteService` for 1 passenger. |
| 13 | **Add the partial index `index_catalog_listings_on_top_rated` and drop `index_catalog_listings_on_status_and_rating_average`.** | Keep both | The DBML marks the old index `removed in: S8`. The new index serves the Top rated order. |
| 14 | **`GET /marketplace/catalog/regions` returns only regions and prefectures with at least one discoverable listing. Each has `listing_count`. A prefecture has `popular_rank`, which is `null` until content sets it.** | All nodes, or no counts | Author decision on 2026-10-24. The ruling says counts come from the query. |
| 15 | **The regions manager counts in one pass: it loads the pairs of listing and prefecture for discoverable listings, and counts distinct listings in Ruby.** | One count query for each node | It avoids a query for each of the 47 prefectures. |
| 16 | **The legacy route and its manager do not change.** | Rewrite the legacy route | The 301 redirects and web routes are separate issues. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/listings` | none | Query: `region_slug`, `prefecture_slug`, `service_type`, `language`, `date`, `passenger_count`, `order_by`, `order_dir`, `page`, `page_size` | `{ catalog_listings: [...], meta: {...} }`. Items use `MarketplaceListingListSerializer`. | 404 for an unknown region or prefecture. 422 for a bad value or a later filter. |
| GET | `/marketplace/catalog/regions` | none | | `{ catalog_regions: [...] }` | See below |

Region item:

- `uuid`, `slug`, `name_en`, `name_ja`, `listing_count`
- `prefectures`: a list of `uuid`, `slug`, `name_en`, `name_ja`, `popular_rank`, `listing_count`

Order: regions by `display_order`. Prefectures by `popular_rank` ascending with no rank last, then `display_order`.

Error text:

- Unknown region: "We could not find that region."
- Unknown prefecture: "We could not find that prefecture."
- Prefecture without region: "Please add the region of this prefecture."
- Later filter: "This filter is not available yet."
- Sort direction: "Please use descending order for this sort."
- Sort column: "Please choose a valid sort."

### Files to create or modify (API)

- `config/routes/marketplace_routes.rb` (two explicit routes)
- `app/controllers/marketplace/catalog/listings_controller.rb` (new action `scoped_index`)
- `app/controllers/marketplace/catalog/regions_controller.rb` (new)
- `app/domains/catalog/listings/marketplace_scoped_index_{request,validator,manager}.rb` (new)
- `app/domains/catalog/geographies/scope_resolution_service.rb` (new)
- `app/domains/catalog/regions/marketplace_index_{request,manager}.rb` and a serializer (new)
- `app/domains/catalog/listing.rb` (`discoverable` and `in_geography_scope` scopes)
- `db/migrate/{timestamp}_add_top_rated_index_to_catalog_listings.rb`
- `docs/db/catalog.dbml`, `docs/db/redcab.dbml` (remove `ships in: S8` tags for the Top rated index)
- `db/schema.rb`

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: read only.
- Snapshots: none. The card price is a quote, not a stored price. Pricing authority stays `Catalog::Pricing::CalculateQuoteService`.

## Out of scope

- Keyword search.
- The price filter, the vehicle filter on packages and the Price: low to high sort (release 3).
- The Most booked sort (release 5) and its index.
- The stored display price.
- Region images and `popular_rank` values.
- Changes to the legacy area route, the web routes and the redirects.
- Pickup coverage and package tests of `discoverable`.

## Tasks

### API

- [ ] Add the `discoverable` and `in_geography_scope` scopes.
- [ ] Add the scope resolution service.
- [ ] Add the request, validator and manager for the scoped index, and the controller action and route.
- [ ] Add the multi-value filters, the date filter and the group size filter.
- [ ] Add the regions manager, serializer, controller and route.
- [ ] Add the Top rated index migration.
- [ ] Add the tests.
- [ ] Run `bin/rails db:migrate`.
- [ ] Remove the `S8` tags for the Top rated index from the two DBML files.

### Web

- [ ] None in this issue.

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] A region request returns only listings with a destination in that region, once each.
- [ ] A prefecture request returns listings whose primary or additional destination is in that prefecture.
- [ ] A request with no scope returns all discoverable listings.
- [ ] Two values in one filter category return the union. Two categories return the intersection.
- [ ] Draft, paused, unlisted and unpublished listings never appear.
- [ ] A published listing with no photo never appears.
- [ ] A published listing with no active pricing policy never appears, and the request does not fail.
- [ ] The default order is `published_at` descending, then `created_at` descending.
- [ ] `order_by=rating_average` puts rated listings first, highest first, then more ratings, then the newer listing. Unrated listings come last.
- [ ] `order_dir=asc` and an unknown `order_by` return 422.
- [ ] A request for an unknown region or prefecture returns 404. A known scope with no listing returns 200 and an empty list.
- [ ] A prefecture slug without a region slug returns 422. A prefecture under another region returns 404. The slug `hokkaido` works for the region and for the prefecture.
- [ ] `vehicle_type`, `min_price`, `max_price`, `price_min`, `price_max` and `keyword` return 422.
- [ ] The response has `meta` with `page`, `page_size`, `count` and `pages`. The price quote runs only for the rows of the current page.
- [ ] `GET /marketplace/catalog/regions` returns only nodes with a discoverable listing, with `listing_count` and `popular_rank`. A listing with two destinations in different regions counts once in each region.
- [ ] The regions endpoint runs a fixed number of queries, not one for each prefecture.
- [ ] The legacy area route returns the same results as before.
- [ ] `catalog.dbml` has no `ships in: S8` tag for the Top rated index.
- [ ] Integration tests: `test/integration/marketplace/catalog/listings_scoped_index_integration_test.rb`, `test/integration/marketplace/catalog/regions_index_integration_test.rb`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails db:migrate
bin/rails db:rollback && bin/rails db:migrate
bin/rails test test/domains/catalog test/integration/marketplace/catalog
bin/rails test
bundle exec srb tc
bundle exec rubocop
bin/brakeman --no-pager
bin/rails db:seed
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-24 | principal developer | Approved in chat. The author confirmed decisions 1, 2, 9, 10 and 14 and the added points (empty scope, Hokkaido, date and group size, sort direction, pagination, index, counts, legacy route). |
