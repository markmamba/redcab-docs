---
title: "Listing sort control wired to URL params"
sidebar_label: Web · Listing sort
issue: "https://github.com/markmamba/red-cab-web/issues/67"
repos:
  - red-cab-web
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "red-cab-web#60"
  - "docs/engineering/specs/cat/web-66-map-pin-regions-listing-area-views.md"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- **Ships:** URL-driven sort control on public **area listings** index; `order_by` / `order_dir` forwarded to `marketplaceCatalogListingsApi.indexByArea`; pagination preserves sort; sort change resets `page` to `1`.
- **Minimum live preset:** newest by `published_at` desc. **Rating** visible in UI per human Q3 — not active until REV milestone (client stub, not API feature gate).
- **Does NOT ship:** filter bar, price/recommended sorts, client-side reorder, API changes, geography nav carrying sort query.
- **FR-CAT-027:** partial Milestone C delivery — traceability per human Q7.
- **Breaking change:** No.

## Problem

Milestone C requires a listing index sort control wired to URL params ([`tourist-ui-pre-phase-2.md`](/docs/product/planning/roadmap/tourist-ui-pre-phase-2)). Marketplace listings index API accepts `order_by` / `order_dir` (`Catalog::Listings::MarketplaceIndexValidator`). The web area listings route loader today only passes `{ page }` to `indexByArea` ([`marketplace-catalog-listing-list-page.jsx`](https://github.com/markmamba/red-cab-web/blob/main/app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx)).

Evidence: no `order_by` usage under `red-cab-web/app` for marketplace catalog listings; provider catalog list already documents sort params.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-CAT-027 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Sort behavior (partial this issue) |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Reserved `order_by`, `order_dir`; canonical without sort query |
| ADR-017 | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Query-param sort on listings-in-area |
| frontend.md | [/docs/engineering/conventions/frontend.md](/docs/engineering/conventions/frontend) | URL-driven filters; no client authoritative ranking |
| web-66 | [web-66-map-pin-regions-listing-area-views.md](./web-66-map-pin-regions-listing-area-views.md) | Page regions: title → map → list (sort placement Q4) |
| red-cab-web#60 | GitHub issue | Public area listings route |
| Milestone C | [/docs/product/planning/roadmap/tourist-ui-pre-phase-2](/docs/product/planning/roadmap/tourist-ui-pre-phase-2) | Sort deliverable + rating when REV live |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Sort via URL `order_by` / `order_dir` | `location.state` | web-56, ADR-017; survives refresh/share |
| 2 | Preset select → column + direction | Raw column pickers | Tourist-friendly labels; maps to API whitelist |
| 3 | **Newest live preset** uses `published_at` + `desc` | `created_at` | Matches API default column set and issue AC |
| 4 | **No client re-sort** | Re-order cards in JS | frontend.md + INV pricing/display rules |
| 5 | Sort change resets `page` to `1` | Keep page index | List-page convention (bookings filter) |
| 6 | Pagination preserves sort params | Drop on page change | Functional `setSearchParams` updater |
| 7 | API client explicit whitelist | Pass-through object | Provider catalog client pattern |
| 8 | Loader whitelist `page`, `order_by`, `order_dir` | `Object.fromEntries` | Human Q5=A — avoid leaking future filter keys |
| 9 | Omit sort params until user changes sort | Explicit default in URL | Human Q2=A — API default `published_at` desc |
| 10 | Two presets: Newest live + Top rated disabled | All columns / hide rating | Human Q1=A, Q3=A — disabled option + helper |
| 11 | Sort row between map and grid, end-aligned | Above map / title row | Human Q4=A — matches web-66 list region |
| 12 | Canonical `meta` | Change vs keep | Unchanged — slug path only (web-56); **required** regression test |
| 14 | `order_by` clamp (Q8) | UI-only disable | Loader forwards `published_at` only; other API columns dropped |
| 15 | Sort control fallback (Q9) | Rewrite URL | Visual Newest when params partial/unsupported; URL unchanged |
| 16 | Listings index `ApiError` | Empty state | `loadError` + retryable error UI; not `TouristEmptyState` |
| 17 | `order_dir` with `published_at` | Forward `asc` | Only `desc` forwarded; `asc`/invalid omitted → API default `desc` |
| 13 | **FR-CAT-027 phased note** in `cat.md` | Spec note only | Human Q7=B — corpus amend before approval |

## API contract (read-only — no API repo changes)

`GET marketplace/catalog/districts/:district_slug/areas/:area_slug/listings`

| Query key | Type | Allowed values (validator) | Default (API) |
| --- | --- | --- | --- |
| `page` | string/int | pagination | `1` |
| `order_by` | string | `published_at`, `rating_average`, `reviews_count`, `title_en`, `created_at` | `published_at` |
| `order_dir` | string | `asc`, `desc` | `desc` |

**Web rule:** Pass sort keys only from loader whitelist (Q5). Clamp `order_by` to `published_at` in the loader (Q8). Forward `order_dir` only when it is `desc` for the live Newest preset; omit otherwise so API default matches the UI. Do not send price sort. Do not reorder response arrays in the browser.

## Web contract

| Surface | Path | Route file | Loader | API module |
| --- | --- | --- | --- | --- |
| Area listings | `/districts/:districtSlug/areas/:areaSlug/listings` | `marketplace-catalog-listing-list-page.jsx` | SSR `loader` | `marketplace-catalog-listings-api.indexByArea` |

### Sort control behavior

1. Control reads current `order_by` / `order_dir` from `useSearchParams` (and preset mapping).
2. On change: `setSearchParams` with updated sort keys and `page: '1'`; preserve other keys (future filters).
3. Rating-related preset: visible per Q3 but must not issue API requests with `rating_average` / `reviews_count` until a future REV issue enables it.
4. Render placement per Q4 (recommended draft: between map and grid, end-aligned).
5. Empty list: sort may still render (user can change sort before results) — unless Q4/C dictates otherwise; prefer showing sort when area is valid even if `catalogListings` empty.

### Preset map (Q1=A, Q3=A)

| UI label | `order_by` | `order_dir` | Enabled |
| --- | --- | --- | --- |
| Newest | `published_at` | `desc` | yes |
| Top rated | `rating_average` | `desc` | no — disabled `<option>` with accessible helper (“Available after reviews launch”) |

### Files to create or modify (Web)

- `app/domains/catalog-listing/catalog-listing-constant.js` — preset ids + API mapping
- `app/domains/catalog-listing/catalog-listing-discover-sort-control.jsx` — **create**
- `app/domains/catalog-listing/catalog-listing-discover-sort-control.spec.jsx` — **create**
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx` — loader + mount control
- `app/api/marketplace-catalog-listings-api.js` — whitelist + JSDoc
- `app/api/marketplace-catalog-listings-api.spec.js` — **create or extend**
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.spec.js` — loader sort assertions

## Test plan

- Loader forwards sort query params to `indexByArea` (and respects Q2 default shape).
- Loader clamps unsupported `order_by` and omits non-`desc` `order_dir` for `published_at`.
- Loader sets `loadError` on recoverable listings index `ApiError` (e.g. 422).
- Sort control updates URL and resets page; falls back visually to Newest (Q9).
- Pagination retains sort params.
- Rating stub not selectable / no API rating sort (per Q3).
- `meta` canonical href excludes `order_by`, `order_dir`, and `page` (required).
- List view DOM order matches API array order (no client re-sort).
- `npm run lint` + targeted vitest.

```bash
cd red-cab-web && npm run test -- marketplace-catalog-listing-list-page catalog-listing-discover-sort marketplace-catalog-listings-api catalog-listing-list-view
cd red-cab-web && npm run lint
```

## Out of scope

- `CatalogListingDiscoverToolbar` filter/search shell (Milestone D / Phase 2)
- Price, recommended, and other **FR-CAT-027** sorts without API support
- Live rating sort enablement
- Geography nav query preservation
- `red-cab-api` changes

## Acceptance criteria

- [ ] Sort control on area listings per Q4 placement
- [ ] URL params `order_by` / `order_dir` drive loader refetch
- [ ] Pagination preserves sort; sort change resets page
- [ ] Newest (`published_at` desc) works end-to-end
- [ ] Rating option stubbed per Q3; no client re-sort
- [ ] `order_by` clamped to `published_at` in loader before `indexByArea` (Q8)
- [ ] Sort control visual fallback to Newest when params are partial/unsupported (Q9)
- [ ] Recoverable listings index API errors render retryable error state, not empty list
- [ ] `meta` canonical excludes sort/pagination query params (required test)
- [ ] API client documents whitelisted query keys (`CATALOG_LISTING_DISCOVER_LISTINGS_QUERY_KEYS`)
- [ ] Tests per test plan
- [ ] PR links `red-cab-web#67`, `#55`, `web-56`, this spec

## Human verification (2026-09-27)

| Q | Choice |
| --- | --- |
| Q0 Doc placement | C — new `web-67` spec |
| Q1 Presets | A — Newest + disabled Top rated |
| Q2 Default URL | A — omit sort params until user changes |
| Q3 Rating stub | A — disabled option + helper |
| Q4 Placement | A — between map and grid, end-aligned |
| Q5 Loader whitelist | A — `page`, `order_by`, `order_dir` only |
| Q7 FR traceability | B — phased note added to `cat.md` FR-CAT-027 |

**Verification status:** passed — author approved 2026-09-27; `status: approved` for codegen.

## Spec review: web-67-listing-sort-control-url-params.md

**Status recommendation:** approved (no must-fix).

### Must-fix

- None — aligns with issue #67 AC, web-56 reserved params, ADR-017, API `MarketplaceIndexValidator` columns, web-66 page regions, no pricing or client re-sort.

### Should-fix

- None — canonical regression test is required in implementation (see acceptance criteria).

### Questions for author

- None after MCQ gate.
