---
title: "Discover toolbar filters wired to area listings API"
sidebar_label: Web · Discover filters
issue: "https://github.com/markmamba/red-cab-web/issues/124"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/cat/api-161-marketplace-listing-index-discover-filters.md"
  - "docs/60-69-initiatives/61-implementation-specs/cat/web-67-listing-sort-control-url-params.md"
  - "docs/60-69-initiatives/61-implementation-specs/platform/web-68-tourist-phase-2-placeholder-slots.md"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- **Ships:** Live discover **filter** UI on public area listings; URL query keys match [api-161](./api-161-marketplace-listing-index-discover-filters.md); loader and `indexByArea` forward those keys; list refetches on Apply; **Clear filters** and form Reset remove filter keys and keep sort params.
- **Does NOT ship:** Free-text search (search field stays disabled); API changes; client-side row filtering or price math; `availability_slot_id` on the area index; new sort presets beyond web-67.
- **Co-ship:** Merge only after api-161 filter contract is live in staging (see Verification).
- **Breaking change:** No.

## Problem

Tourist discover must filter area listings by date, service type, language, group size, and price range ([FR-CAT-023](/docs/70-79-business/requirements/functional-requirements/cat) through [FR-CAT-026](/docs/70-79-business/requirements/functional-requirements/cat)). The API ships those filters on `GET` area listings index ([api-161](./api-161-marketplace-listing-index-discover-filters.md)). The web area listings route still whitelists only `page`, `order_by`, and `order_dir` in `buildAreaListingsIndexFilters` and `CATALOG_LISTING_DISCOVER_LISTINGS_QUERY_KEYS` ([web-67](./web-67-listing-sort-control-url-params.md)).

Evidence:

- `LISTING_FILTER_SEARCH_PARAMS` reserves filter keys but omits `language`, `price_min`, and `price_max`, and still lists `availability_slot_id` ([`catalog-listing-constant.js`](https://github.com/markmamba/red-cab-web/blob/main/app/domains/catalog-listing/catalog-listing-constant.js)).
- `CatalogListingDiscoverToolbar` keeps the Filters control disabled ([web-68](../platform/web-68-tourist-phase-2-placeholder-slots.md) placeholder).
- `hasActiveDiscoverFilterParams` / **Clear filters** on the list page can show `LISTING_FILTERS` empty state while the loader ignores filter keys (refresh loses effective filtering until this issue).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-CAT-023 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Date filter |
| FR-CAT-024 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Service type filter |
| FR-CAT-025 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Language and group size |
| FR-CAT-026 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Price range; clear filters |
| PRC-2 | [invariants](/docs/70-79-business/business-rules/invariants) | No client price authority |
| AMB-024 | [open-questions](/docs/70-79-business/planning/open-questions) | Provisional language whitelist |
| api-161 | [api-161-marketplace-listing-index-discover-filters.md](./api-161-marketplace-listing-index-discover-filters.md) | Public query param names and validation |
| web-67 | [web-67-listing-sort-control-url-params.md](./web-67-listing-sort-control-url-params.md) | Loader whitelist pattern; sort + filters compose |
| web-68 | [web-68-tourist-phase-2-placeholder-slots.md](../platform/web-68-tourist-phase-2-placeholder-slots.md) | Toolbar slot; search stays deferred |
| web-56 | [web-56-tourist-access-and-route-contract.md](../iam/web-56-tourist-access-and-route-contract.md) | Reserved listing index query params; canonical without filters |
| ADR-017 | [adr-017-tourist-ui-public-url-architecture](/docs/30-49-domains/architecture-decisions/adr-017-tourist-ui-public-url-architecture) | URL-driven discover state |
| frontend.md | [frontend conventions](/docs/50-59-frontend/conventions/frontend) | `{model}-filter-form.jsx`; `useSearchParams`; reset `page` on filter apply |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Public URL/API keys per api-161: `date`, `service_type`, `passenger_count`, `language`, `price_min`, `price_max` | `service_date`; client-only filter state | Cross-repo contract row in api-161; survives refresh/share |
| 2 | Extend loader whitelist and `CATALOG_LISTING_DISCOVER_LISTINGS_QUERY_KEYS` together | Pass-through `Object.fromEntries` | Same explicit whitelist pattern as web-67 |
| 3 | Update `LISTING_FILTER_SEARCH_PARAMS`: add `language`, `price_min`, `price_max`; remove `availability_slot_id` | Keep slot id for “active filter” UX | Slot id is detail/checkout only (api-161); active-filter UX matches index contract |
| 4 | Filter shell: **Offcanvas** from Filters button | Inline panel; always-visible fields | Gate 1 Q1=A |
| 5 | **Apply** commits all fields to URL; **Reset** in form clears filter keys only; Apply sets `page` to `1` | Immediate per-control updates | Gate 1 Q2=A; matches provider `catalog-listing-filter-form` |
| 6 | Sort control unchanged (immediate `setSearchParams`) | Unify Apply for sort + filters | web-67 behavior is already shipped |
| 7 | Search input stays **disabled** with existing helper copy | Enable stub search | Issue AC; web-68 |
| 8 | No client row filter or re-sort | Filter cards in JS after fetch | PRC-2; frontend.md; api-161 returns filtered set |
| 9 | Price fields are opaque strings/integers in URL only | Compute bounds from displayed prices | FR-CAT-026; API validates and filters on authority quote |
| 10 | Invalid filter query → existing `loadError` UI | Field-level API error mapping | Matches web-67 index `ApiError` handling |
| 11 | Language options: api-161 whitelist (`en`, `ja`, `zh`, `ko`, `es`, `other`) | Only `LANGUAGE_SPOKEN_OPTIONS` without `other` | AMB-024 provisional set; `other` may return empty until provider write rules allow storage |
| 12 | Service type options: all `CATALOG_LISTING_SERVICE_TYPE` values | Provider-type-scoped subset | Tourist sees all published enum values; API validates |
| 13 | Pagination `setSearchParams` updater preserves filter and sort keys | Drop filters on page change | List-page convention (web-67 pagination test pattern) |
| 14 | Canonical `meta` unchanged: slug path only (no query) | Include active filters in canonical | web-56 / web-67 — filter keys are not canonical |

## API contract (read-only — no API repo changes)

`GET /marketplace/catalog/districts/:district_slug/areas/:area_slug/listings`

| Query key | Web forwards when present in URL | Notes |
| --- | --- | --- |
| `page` | yes | Unchanged |
| `order_by` | yes | web-67 clamp — `published_at` only |
| `order_dir` | yes | web-67 — `desc` only for live Newest preset |
| `date` | yes | `YYYY-MM-DD` |
| `service_type` | yes | Must match API enum |
| `passenger_count` | yes | Positive integer string |
| `language` | yes | Lowercase whitelist per api-161 |
| `price_min` | yes | Integer JPY string |
| `price_max` | yes | Integer JPY string |

**Web must not forward:** `availability_slot_id` on this index (detail/show and checkout only).

**Web rule:** Loader builds the `indexByArea` filters object only from the whitelist above. Omit empty or blank URL values. Do not send filter keys the user did not set. Do not reorder `catalog_listings` in the browser.

## Web contract

| Surface | Path | Route file | Loader | API module |
| --- | --- | --- | --- | --- |
| Area listings | `/districts/:districtSlug/areas/:areaSlug/listings` | `marketplace-catalog-listing-list-page.jsx` | SSR `loader` | `marketplace-catalog-listings-api.indexByArea` |

### Toolbar and filter behavior

1. **Search:** Remains disabled with `CATALOG_LISTING_DISCOVER_TOOLBAR_COPY.SEARCH_HELPER` (no change to search label/helper semantics).
2. **Filters button:** Opens Bootstrap `Offcanvas` (end or start per existing tourist layout patterns) containing `catalog-listing-discover-filter-form.jsx` (name per frontend.md).
3. **Form state:** `react-hook-form` + `zod` in matching `catalog-listing-discover-filter-schema.js`. Default values hydrate from `useSearchParams` on open and when URL changes (same pattern as `catalog-listing-filter-form.jsx`).
4. **Apply:** `CatalogListingService.buildDiscoverFilterSearchParams(previousParams, formValues)` sets only whitelisted filter keys with non-empty values, deletes cleared fields, sets `page` to `1`, preserves `order_by` / `order_dir`.
5. **Reset (form):** Same as **Clear filters** on the page — `buildClearDiscoverFilterSearchParams`; removes filter keys only; preserves sort keys and current `page` (matches `catalog-listing-service.spec.js`).
6. **Clear filters** link (page): Unchanged handler; uses updated `LISTING_FILTER_SEARCH_PARAMS`.
7. **Empty state:** When filters are active and API returns zero rows, keep `TOURIST_EMPTY_STATE_VARIANT.LISTING_FILTERS` (now aligned with loader forwarding).
8. **Sort row:** Keep web-68 layout — toolbar + sort in one `flex` row on `md+`.

### Filter form fields (v1)

| Field | URL key | Control | Validation (client) |
| --- | --- | --- | --- |
| Service date | `date` | Date input or text `YYYY-MM-DD` | Optional; format when set |
| Service type | `service_type` | Select | Optional; enum values |
| Group size | `passenger_count` | Number input | Optional; integer ≥ 1 when set |
| Language | `language` | Select | Optional; whitelist codes |
| Min price (JPY) | `price_min` | Number input | Optional; integer ≥ 0 when set |
| Max price (JPY) | `price_max` | Number input | Optional; integer ≥ 0; `price_min <= price_max` when both set |

Client validation mirrors api-161 shape enough to reduce obvious 422s; API remains authoritative.

### Service helpers (extend `CatalogListingService`)

- `buildAreaListingsIndexFilters(searchParams)` — add whitelisted filter keys with same omit-empty rules as sort keys.
- `buildDiscoverFilterSearchParams(previousParams, filterValues)` — **new**; used by filter form Apply.
- `hasActiveDiscoverFilterParams` / `buildClearDiscoverFilterSearchParams` — driven by updated `LISTING_FILTER_SEARCH_PARAMS` constant.

### Files to create or modify (Web)

- `app/domains/catalog-listing/catalog-listing-constant.js` — `LISTING_FILTER_SEARCH_PARAMS`, `CATALOG_LISTING_DISCOVER_LISTINGS_QUERY_KEYS`, discover language option constants, toolbar copy (remove “filters unavailable” helper when live)
- `app/domains/catalog-listing/catalog-listing-service.js` — loader filter whitelist; discover filter URL helpers
- `app/domains/catalog-listing/catalog-listing-discover-filter-schema.js` — **create**
- `app/domains/catalog-listing/catalog-listing-discover-filter-form.jsx` — **create**
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx` — enable Filters + Offcanvas wiring
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.spec.jsx` — enabled filter affordance; search still disabled
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx` — pass `searchParams` / `setSearchParams` into toolbar if needed; loader uses extended filters (no behavior change beyond `buildAreaListingsIndexFilters`)
- `app/api/marketplace-catalog-listings-api.js` — extend `CATALOG_LISTING_DISCOVER_LISTINGS_QUERY_KEYS` usage and JSDoc
- `app/api/marketplace-catalog-listings-api.spec.js` — filter keys in ky `searchParams`
- `app/domains/catalog-listing/catalog-listing-service.spec.js` — forwarding + clear/active helpers
- `app/domains/catalog-listing/catalog-listing-discover-sort-control.spec.jsx` — regression: sort change still preserves filter keys
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.spec.js` — loader forwards filter keys from URL

## Data / domain touchpoints

- Bounded context: **CAT** (read-only marketplace index).
- No booking snapshots, pricing authority, or seat reservation on this page.
- Displayed `starting_price_jpy` on cards remains API-computed; filter inputs are not pricing authority.

## Out of scope

- Free-text discover search (future issue).
- `red-cab-api` changes (api-161 closed).
- api-163 contract test matrix.
- Provider portal support for `language=other` in `languages_supported` ([AMB-024](/docs/70-79-business/planning/open-questions)) — filter may return no rows until then.
- Enabling Top rated sort (web-67 stub).
- Geography nav carrying filter query between district/area pages.

## Tasks

### Web

- [ ] Extend `CATALOG_LISTING_DISCOVER_LISTINGS_QUERY_KEYS` and `buildAreaListingsIndexFilters` for api-161 keys.
- [ ] Align `LISTING_FILTER_SEARCH_PARAMS` (add language/price; drop `availability_slot_id`).
- [ ] Add discover filter schema + form (Offcanvas, Apply, Reset).
- [ ] Wire `CatalogListingDiscoverToolbar` (live Filters; search still disabled).
- [ ] Update API client JSDoc and whitelist consumption.
- [ ] Extend unit and loader tests per test plan.
- [ ] PR states api-161 is deployed to staging before merge approval.

### Docs

- [x] Run `review-implementation-spec`; set `status: approved` before codegen.
- [ ] After merge: set spec `status: implemented`.

## Acceptance criteria

- [ ] Changing filters via Apply updates the list URL and refetches listings (loader → `indexByArea`).
- [ ] Loader and API client forward only: `date`, `service_type`, `passenger_count`, `language`, `price_min`, `price_max`, plus web-67 sort/page keys.
- [ ] Loader does **not** forward `availability_slot_id` on area index.
- [ ] **Clear filters** and form Reset remove filter keys; `order_by` / `order_dir` unchanged when present.
- [ ] Apply sets `page` to `1`; pagination retains filter and sort params.
- [ ] Search control stays disabled with existing helper copy.
- [ ] No client-side filtering of listing rows and no client price computation.
- [ ] Invalid filter params that produce index `ApiError` (e.g. 422) show existing `loadError` UI, not fake empty filter state.
- [ ] `meta` canonical href still excludes filter (and sort/page) query params.
- [ ] Tests per test plan; PR links `red-cab-web#124`, api-161, web-67, web-68, this spec.

## Test plan

- Unit: `buildAreaListingsIndexFilters` forwards each api-161 key; omits unknown keys; preserves web-67 sort clamp.
- Unit: `hasActiveDiscoverFilterParams` / `buildClearDiscoverFilterSearchParams` use updated `LISTING_FILTER_SEARCH_PARAMS` (including price/language; excluding slot id).
- Unit: `buildDiscoverFilterSearchParams` sets `page` to `1` on Apply and preserves sort keys.
- API client: `indexByArea` passes filter keys in ky `searchParams`.
- Loader: `marketplace-catalog-listing-list-page.spec.js` asserts `indexByArea` called with URL filter params.
- Component: toolbar opens Offcanvas; search remains disabled.
- Regression: sort control spec still preserves filter keys when changing sort.
- Regression: extend existing `meta` canonical test — href must not contain filter keys (`date`, `service_type`, `passenger_count`, `language`, `price_min`, `price_max`) when present in the request URL (web-67 / web-56).
- Loader or page spec: pagination `setSearchParams` retains filter keys (mirror web-67 sort retention).
- Manual: staging with api-161 — filter → URL → list matches API; clear filters restores full list; sort unchanged.
- Manual: active filters with API-unfiltered data no longer possible (loader parity).

```bash
cd red-cab-web && npm run test -- marketplace-catalog-listing-list-page catalog-listing-discover catalog-listing-service marketplace-catalog-listings-api
cd red-cab-web && npm run lint
```

## Verification

**Co-ship gate:** Confirm [api-161](./api-161-marketplace-listing-index-discover-filters.md) is deployed to staging before approving web merge (PKM co-ship note).

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
```

## Human verification (Gate 1)

| Q | Choice |
| --- | --- |
| Q1 Filter shell | A — Offcanvas from Filters button |
| Q2 URL update timing | A — Apply commits fields; Reset clears filter keys |

**Verification status:** passed — Gate 1 MCQs recorded (Q1=A, Q2=A); spec review 2026-10-12.

## Spec review: web-124-discover-toolbar-filters-api-forwarding.md

**Status recommendation:** approved (no must-fix).

### Must-fix

- None — aligns with issue #124 AC, api-161 public param names, web-67 loader whitelist pattern, web-68 search placeholder, PRC-2 (no client price math), and `MarketplaceIndexRequest` / `MarketplaceIndexValidator` in red-cab-api.

### Should-fix

- Extend the existing area listings canonical regression test so filter query keys are asserted absent from `href` (applied in Test plan above).
- Add an explicit pagination-retains-filters test (applied in Test plan above).
- Optional: `catalog-listing-discover-filter-form.spec.jsx` for Apply/Reset URL updates if Offcanvas markup is hard to assert from toolbar spec alone.

### Questions for author

- None after Gate 1 MCQs and api-161 co-ship note in Verification.

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-12 | Mark (agent) | `review-implementation-spec` | approved — no must-fix; test plan addendum for canonical + pagination |
