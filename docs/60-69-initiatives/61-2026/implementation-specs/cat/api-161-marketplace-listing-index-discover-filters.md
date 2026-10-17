---
title: "Marketplace area listings index discover filters"
sidebar_label: API · CAT discover filters
issue: "https://github.com/markmamba/red-cab-api/issues/161"
repos:
  - red-cab-api
status: superseded
superseded_by: /docs/30-49-domains/catalog/catalog-decisions#marketplace-filter-combination
phase: 2
context: CAT
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-67-listing-sort-control-url-params.md"
---

{/* codegen: do not use spec_path when status is superseded */}

## TL;DR

- **Ships:** Optional query filters on `GET` area listings index for date, service type, language, group size, and price range (FR-CAT-023 through FR-CAT-026).
- **Does NOT ship:** Free-text search, new sort presets, web loader forwarding (web-124), or contract-test matrix expansion (api-163).
- **Price:** Row `starting_price_jpy` still comes from `Catalog::Pricing::CalculateQuoteService` with `passenger_count: 1`; filter query `passenger_count` is group size only and must not be passed into the quote (PRC-2, FR-CAT-026).
- **Inventory:** Read-only index; no seat reservation and no slot writes (does not call `ReserveSeatsService`; CON-1 applies at checkout only).
- **Breaking change:** No — omitted filter params keep today’s listing set.

> **Note:** Docs slug `api-161-provider-review-report` (REV provider report) is unrelated to [red-cab-api#161](https://github.com/markmamba/red-cab-api/issues/161). This file is the canonical design for **catalog discover filters** on that issue.

## Problem

Tourist discover must filter area listings by date, service type, language, group size, and starting-price range. The marketplace area listings index today accepts pagination and sort only (`Catalog::Listings::MarketplaceIndexRequest`, `MarketplaceIndexValidator`). Web discover URLs already reserve filter keys (`LISTING_FILTER_SEARCH_PARAMS` in red-cab-web) but the API does not interpret them yet.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-CAT-023 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | At least one bookable slot on selected date |
| FR-CAT-024 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Service type filter |
| FR-CAT-025 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Language and group size; conjunctive when combined |
| FR-CAT-026 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Price range on starting price; clear = omit params |
| PRC-2 | [invariants](/docs/70-79-business/business-rules/invariants) | Starting price from pricing authority, not client amounts |
| CON-1 | [invariants](/docs/70-79-business/business-rules/invariants) | Seat decrement only at checkout; this index must not reserve seats |
| AMB-024 | [open-questions](/docs/70-79-business/planning/open-questions) | Provisional supported filter language set (`en`, `ja`, `zh`, `ko`, `es`, `other`) |
| web-67 | [web-67-listing-sort-control-url-params.md](./web-67-listing-sort-control-url-params.md) | Sort params compose with filters (`order_by` / `order_dir`); **not a ship gate** — web-67/web-68 shipped; API ships independently |
| ADR-014 | [adr-014-service-timezone-model.md](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model) | Per-listing civil date via geography timezone |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Public param `date` (not `service_date`) | Reuse slots index name `service_date` | Web discover uses `date`; slots endpoint keeps `service_date` |
| 2 | Public param `passenger_count` for group size | `group_size`, tier-band SQL | Matches web `LISTING_FILTER_SEARCH_PARAMS` |
| 3 | Group size rule: `passenger_count` N matches when `N <= base_capacity` | Match active pricing tier min/max | Gate 1 Q3=B; FR-CAT-025 group size; `base_capacity` is advertised max (pricing tiers set quote only) |
| 4 | Quote always uses `passenger_count: 1` for `starting_price_jpy` | Use filter N in `CalculateQuoteService` | FR-CAT-026 starting price; filter param is separate |
| 5 | Public param `language` (single code) | `supported_language` | Gate 1 Q1=A; web-124 adds matching URL key |
| 6 | Price bounds `price_min`, `price_max` (integer JPY) | `price_*_jpy` suffix keys | Gate 1 Q2=A; aligns with api-163 prose |
| 7 | SQL predicates for listing rows; price filter after quote | Quote in SQL | PRC-2; manager already maps rows to DTOs with `CalculateQuoteService` |
| 8 | Date bookable rule mirrors `Catalog::AvailabilitySlots::MarketplaceIndexManager` | Looser calendar-day match | Gate 1 Q4=A; FR-CAT-023 |
| 9 | Date filter uses listing geography timezone via join | Single platform timezone | Same as slots index (`ServiceTimezoneFetchService` source) |
| 10 | All provided filters combine with AND | OR across filter types | Standard discover behavior; FR-CAT-025 conjunctive for language + group size |
| 11 | Invalid filter params → `Errors::ValidationError` | Silent ignore | Matches existing marketplace index validator pattern |
| 12 | No route or controller shape change | New endpoint | Same `ListingsController#index`; manager returns filtered array before Pagy |
| 13 | Language whitelist: provisional AMB-024 set | Free-form ISO only | `en`, `ja`, `zh`, `ko`, `es`, `other` until AMB-024 closes |
| 14 | **Provisional:** `other` in JSONB means listing includes code `other` | Map UI “Other” differently | Matches open-questions temporary assumption; store lowercase codes in JSONB (`en`, `ja`, …) |
| 15 | v1 duplicates slots index bookable SQL in listings `date` EXISTS | Extract shared predicate module | Mirror `AvailabilitySlots::MarketplaceIndexManager` semantics; refactor only if duplication hurts maintenance |
| 16 | Missing listing service timezone with `date` filter → `422` unprocessable | Omit listing from results | Same as slots index (`ServiceTimezoneFetchService`); surfaces bad geography data for correction |
| 17 | `language` filter: JSONB array **contains** lowercase code only | Normalize `EN` → `en`; free-form ISO | Validator rejects non-whitelist codes (e.g. `EN` → validation error); SQL uses contains semantics on stored codes |
| 18 | `language=other` until provider write rules allow `other` | Block filter until AMB-024 closes | Provider create/update today allow two-letter codes only; filter may return empty set until listings can store `other` |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/marketplace/catalog/districts/:district_slug/areas/:area_slug/listings` | Public | Existing route; new optional query params |

### Query parameters

All filters are optional. Omit a param to skip that predicate. Omit **all** filter params to preserve pre-change behavior for the area.

| Query key | Type | When present | Rules |
| --- | --- | --- | --- |
| `page` | integer | optional | Unchanged (`BaseIndexRequest`) |
| `page_size` | integer | optional | Unchanged (1–100) |
| `order_by` | string | optional | Unchanged whitelist |
| `order_dir` | string | optional | `asc` or `desc` |
| `date` | string | optional | Civil date `YYYY-MM-DD`; listing matches when it has ≥1 **bookable** open slot on that date in the listing service timezone |
| `service_type` | string | optional | Must be a `Catalog::Listing` `service_type` enum value |
| `language` | string | optional | Lowercase code in provisional set: `en`, `ja`, `zh`, `ko`, `es`, `other`; listing `languages_supported` JSONB array must contain the code (`@>` / `?`); no case normalization on input |
| `passenger_count` | integer | optional | Positive integer; listing matches when `passenger_count <= base_capacity` |
| `price_min` | integer | optional | Integer JPY ≥ 0; after quote, `starting_price_jpy >= price_min` |
| `price_max` | integer | optional | Integer JPY ≥ 0; after quote, `starting_price_jpy <= price_max` |

**Bookable slot predicates** (for `date`, per listing — same semantics as `Catalog::AvailabilitySlots::MarketplaceIndexManager`):

- Slot `status` is `open`.
- `remaining_capacity > 0`.
- `start_time` falls in the civil day `[date 00:00, next day 00:00)` in the listing geography timezone.
- `start_time >=` current time in that timezone (no past slots today).

**Price authority:** For each surviving listing row, `starting_price_jpy` in the response is still `CalculateQuoteService.execute(passenger_count: 1, ...)`. Filter inputs `price_min` / `price_max` are not pricing authority; they only narrow the returned set.

**`passenger_count` (two roles):**

| Role | Value | Used for |
| --- | --- | --- |
| Group-size filter | Query param N when present | SQL: `N <= catalog_listings.base_capacity` |
| Starting price quote | Always `1` | `CalculateQuoteService` → `starting_price_jpy` on each row |

Never pass filter N into `CalculateQuoteService` on this endpoint.

**Processing order (unchanged controller):**

1. Validate request; resolve district and area slugs.
2. Query published listings in the area with SQL `WHERE` for `date`, `service_type`, `language`, and `passenger_count` (when provided); apply existing `ORDER BY`.
3. Load rows (`.to_a` as today).
4. Map each row to `MarketplaceListingListItemDto` with quote at `passenger_count: 1`.
5. Drop rows outside inclusive `price_min` / `price_max` when those params are set.
6. Controller `paginate_and_render` on the filtered array.

If any row **in step 4** (after SQL filters) cannot quote (missing commission or inactive pricing policy), the manager raises `422` unprocessable for the whole request. With filters applied, listings excluded by SQL are not quoted (a filtered request may succeed when an unfiltered request would `422` for a broken row elsewhere in the area).

When `date` is present, resolving civil day bounds for a candidate listing with blank geography timezone raises `422` unprocessable with the same title as `Catalog::Listings::ServiceTimezoneFetchService` (match slots index; correct data).

**Validation errors:** Use `Catalog::Listings::MarketplaceIndexValidator` with field keys matching query names (`date`, not `service_date`). Reuse message style from availability slots date validation where applicable (adapt attribute to `date`).

**Validator rules (summary):**

| Param | Rules |
| --- | --- |
| `date` | Optional; when present, `YYYY-MM-DD` format (same regex as slots `service_date`) |
| `service_type` | Optional; must be one of `Catalog::Listing.service_types` keys |
| `language` | Optional; lowercase whitelist `en`, `ja`, `zh`, `ko`, `es`, `other` |
| `passenger_count` | Optional; integer ≥ 1 |
| `price_min`, `price_max` | Optional; integer JPY ≥ 0; when both present, `price_min <= price_max` |

**Date filter implementation:** Use an `EXISTS` (or equivalent) on `catalog_availability_slots` for each listing, with civil day bounds from `DateTimeUtils.parse_civil_date` using the listing geography timezone (same source as `Catalog::Listings::ServiceTimezoneFetchService` in the slots index path). Apply the bookable predicates in the table below. If timezone resolution would fail for a listing in the filtered candidate set, fail the request with `422` (do not silently omit).

**Language filter implementation:** `languages_supported` JSONB must contain the validated lowercase code (PostgreSQL JSONB containment). Reject uppercase or mixed case at validation (`EN` is invalid, not normalized).

| Condition | HTTP |
| --- | --- |
| Malformed `date` | `422` validation |
| Unknown `service_type` | `422` validation |
| Unknown `language` code | `422` validation |
| `passenger_count` not a positive integer | `422` validation |
| `price_min` or `price_max` invalid or `price_min > price_max` | `422` validation |
| District / area not found | `404` (unchanged) |
| Commission or pricing policy missing for a row in the post-SQL set | `422` unprocessable |
| `date` set and a candidate listing has blank geography timezone | `422` unprocessable (same message as slots index) |

**Response:** Unchanged JSON shape (`catalog_listings` array with `starting_price_jpy`, pagination meta). Filtered-out listings are omitted before pagination.

### Cross-repo contract (read-only reference)

| Consumer | Follow-up | Param alignment |
| --- | --- | --- |
| red-cab-web#124 | Loader forwards filter keys | `date`, `service_type`, `passenger_count`, `language`, `price_min`, `price_max` |
| red-cab-api#163 | Contract tests | Same public names as this spec |

Do not forward `availability_slot_id` on this index (detail/checkout flows only).

## Web contract

**Out of scope for this issue.** See web-124 for toolbar, URL keys, and loader whitelist extension beyond web-67 sort keys.

## Data / domain touchpoints

- Bounded context: **CAT** (Search module on published listings in a listable area).
- Reads: `catalog_listings`, `catalog_availability_slots`, `catalog_geographies` (timezone), `languages_supported` JSONB, `service_type`, `base_capacity`.
- Writes: none.
- Transactions: none required; no `ReserveSeatsService` or slot updates.

### Files to create or modify (API)

- `app/domains/catalog/listings/marketplace_index_request.rb` — permit new query params via `custom_permitted_params`
- `app/domains/catalog/listings/marketplace_index_validator.rb` — validation rules and normalized values
- `app/domains/catalog/listings/marketplace_index_manager.rb` — SQL scopes for non-price filters; price bounds on DTO array; optional small query object or scope under `catalog/listings` or `catalog/availability_slots` if needed for date EXISTS
- `test/domains/catalog/listings/marketplace_index_manager_test.rb` — per-filter, conjunctive, regression without filters
- `test/integration/marketplace/catalog/listings_index_integration_test.rb` — optional HTTP smoke for one filtered happy path

No changes expected to:

- `config/routes/marketplace_routes.rb`
- `app/controllers/marketplace/catalog/listings_controller.rb`
- Serializers

## Out of scope

- Free-text search on discover.
- Provider or Team catalog management endpoints.
- New sort presets beyond FR-CAT-027 and web-67.
- `availability_slot_id` on the area index.
- red-cab-web loader and filter UI (web-124).
- api-163 contract test matrix (paired follow-up).
- Resolving AMB-024 product-wide — ship provisional language whitelist only.
- Provider portal changes to allow storing `other` in `languages_supported` (discover may return no rows for `language=other` until then).

## Tasks

### API

- [ ] Extend `MarketplaceIndexRequest` with filter attributes from permitted params.
- [ ] Add validator rules for `date`, `service_type`, `language`, `passenger_count`, `price_min`, `price_max`.
- [ ] Apply SQL filters on the published area listing relation before load (or before quote map).
- [ ] Implement `date` filter with bookable slot EXISTS and per-listing geography timezone; `422` when timezone missing (decision 16).
- [ ] Implement `language` filter with JSONB contains and strict lowercase whitelist (decision 17).
- [ ] Apply `price_min` / `price_max` after `CalculateQuoteService` with `passenger_count: 1`.
- [ ] Add manager unit tests per acceptance criteria.
- [ ] Add or extend integration test if HTTP coverage is required beyond manager tests.

### Docs

- [ ] After merge: set spec `status: implemented`.
- [ ] Optional: note in api-163 that param names match this spec.

## Acceptance criteria

- [ ] With no filter query params, listing UUIDs for an area match pre-change behavior for the same fixtures.
- [ ] `date` returns only listings with at least one bookable open slot on that civil day (FR-CAT-023).
- [ ] `service_type` returns only listings with matching enum value (FR-CAT-024).
- [ ] `language` returns only listings whose `languages_supported` JSONB array contains the lowercase code (FR-CAT-025).
- [ ] `language=EN` (or any non-whitelist / non-lowercase code) returns validation error; no server-side case folding.
- [ ] With `date` set, a published listing in the candidate set with blank geography timezone returns `422` (same as slots index timezone failure).
- [ ] `passenger_count` returns only listings where `passenger_count <= base_capacity` (FR-CAT-025).
- [ ] `language` and `passenger_count` together use conjunctive AND (FR-CAT-025).
- [ ] `price_max` excludes a listing when authority `starting_price_jpy` (pax 1) is above the bound (FR-CAT-026, PRC-2).
- [ ] `price_min` excludes listings below the bound when set.
- [ ] Invalid `date`, `service_type`, `language`, `passenger_count`, or price bounds return validation errors consistent with marketplace index patterns.
- [ ] With `passenger_count` filter set, `starting_price_jpy` still reflects the pax-1 quote (not filter N).
- [ ] Multiple filters together (e.g. `date` + `service_type` + `price_max`) narrow with AND semantics.
- [ ] Index execution does not call `ReserveSeatsService` or write slot inventory (read-only; CON-1 is checkout-only).
- [ ] Sort and pagination still work when combined with filters.

## Verification

```bash
# From red-cab-api/
bin/rails test test/domains/catalog/listings/marketplace_index_manager_test.rb
bin/rails test test/integration/marketplace/catalog/listings_index_integration_test.rb
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-12 | Mark | `review-implementation-spec` | Initial review; `status: approved` for codegen |
| 2026-10-12 | Mark | `review-implementation-spec` | Should-fix + author Q&A (timezone 422, web-67 non-gate, language JSONB); `status: approved` |
