---
title: "Map pin regions on listing and area views"
sidebar_label: Web · Map pins
issue: "https://github.com/markmamba/red-cab-web/issues/66"
repos:
  - red-cab-web
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "red-cab-web#60"
  - "red-cab-web#61"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- **Ships:** Reusable `CatalogGeographyCentroidMapView` — Bootstrap placeholder map shell + accessible fallback; mounted on public **area listings** and **listing detail** routes; centroid from API `latitude` / `longitude` on area payloads (city-hall point per geography pattern).
- **Does NOT ship:** Map SDK (Mapbox/Leaflet/Google); client Haversine or polygons; multiple listing pins on area list; map on `/districts` hub or near-me section (#65); API changes.
- **Breaking change:** No.

## Problem

Milestone C requires map/pin **container regions** on tourist discover surfaces ([`tourist-ui-pre-phase-2.md`](/docs/product/planning/roadmap/tourist-ui-pre-phase-2)). Phase 1 API already serializes listable-node centroids on marketplace `areaShow` and listing `area` embeds; web loaders fetch those payloads but **never read** lat/lng. No issue-scoped web contract exists for component boundaries, fallback UX, or tests.

Evidence: no `latitude` / `longitude` usage under `red-cab-web/app` except near-me **client** geolocation (#65); listing/area pages implemented in `marketplace-catalog-listing-list-page.jsx` and `marketplace-catalog-listing-detail-page.jsx`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Milestone C | [/docs/product/planning/roadmap/tourist-ui-pre-phase-2](/docs/product/planning/roadmap/tourist-ui-pre-phase-2) | Map pins deliverable |
| frontend.md | [/docs/engineering/conventions/frontend](/docs/engineering/conventions/frontend) | Geography and maps — API-sourced pins |
| geography.md | [/docs/architecture/patterns/geography](/docs/architecture/patterns/geography) | Centroid semantics |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Public catalog URLs |
| red-cab-web#60 / #61 | GitHub issues | Public area listings + listing detail routes (no separate web specs) |
| web-65 | [web-65-near-me-area-discovery-section.md](./web-65-near-me-area-discovery-section.md) | Sibling Milestone C; **excludes** map pins |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Single centroid** on area listings page | Plot each listing | Listing index API has no per-listing coordinates |
| 2 | Listing detail coords from **`catalogListing.area`** embed | Separate `areaShow` call | `show` already embeds area detail serializer fields |
| 3 | **No fetch feature flag** | Mirror `NEAR_ME_AREAS_FETCH_ENABLED` | Coords are on existing SSR responses; null → fallback |
| 4 | **Placeholder shell** only | Ship Leaflet in #66 | Issue AC + roadmap Phase 1 |
| 5 | Component **`CatalogGeographyCentroidMapView`** | Inline per page | Reuse + test isolation |
| 6 | Missing lat/lng | Hide section vs muted fallback | Muted in-section fallback — satisfies “accessible fallback” AC |
| 7 | Area page placement | Above title; map-first | Human Q1=A — below area title, above grid |
| 8 | Detail page placement | Fold into location view; hero stack | Human Q2=A — after hero, before highlights |
| 9 | Provider extensibility | Static props only; `mapProvider` stub | Human Q3=B — optional `children` slot |
| 10 | API contract doc location | Amend `geography.md` table | Human Q4=A — spec table + link only |

## API contract (read-only — no API repo changes)

Centroids are **municipal office** points on listable geography nodes — not computed on the client. See [Geography](/docs/architecture/patterns/geography).

| Consumer surface | Loader / call | JSON path | Fields | Type | When null |
| --- | --- | --- | --- | --- | --- |
| Area listings | `marketplaceCatalogDistrictsApi.areaShow` | `catalog_area` (or root) | `latitude`, `longitude` | number (decimal) | Map fallback copy; list UX unchanged |
| Listing detail | `marketplaceCatalogListingsApi.show` | `catalogListing.area` | `latitude`, `longitude` | number (decimal) | Map fallback copy; `CatalogListingLocationView` text may still render |

**Serializer source (API):** `Catalog::MarketplaceAreaShowSerializer`, `Catalog::MarketplaceAreaDetailEmbeddedSerializer` — out of scope for this issue.

**Web rule:** Pass coordinates through as opaque numbers; do not derive, round for display logic, or plot boundaries in JS.

## Web contract

| Surface | Path | Route file | Loader data for map |
| --- | --- | --- | --- |
| Area listings | `/districts/:districtSlug/areas/:areaSlug/listings` | `marketplace-catalog-listing-list-page.jsx` | `catalogArea.latitude`, `catalogArea.longitude`, localized area name for `pinLabel` |
| Listing detail | `…/listings/:listingUuid` | `marketplace-catalog-listing-detail-page.jsx` | `catalogListing.area.latitude`, `catalogListing.area.longitude` |

### `CatalogGeographyCentroidMapView` behavior

1. **With coordinates** — `section` with `aria-labelledby`; heading (default “Map” or passed `heading`) styled like other catalog detail subsections (`h6 text-uppercase text-muted fw-semibold small mb-3`); `ratio ratio-16x9` shell with decorative pin (`aria-hidden`); optional `children` for future SDK (Q3=B).
2. **Without coordinates** — same `section` landmark; muted text fallback (no interactive map); no error toast.
3. **Supplementary** — pages must render list/detail content regardless of map state (list-first discover).
4. **Shell `data-latitude` / `data-longitude`** — implementation hooks on the placeholder shell for future map-provider mount and automated tests. Not part of the public HTTP API contract; do not treat as stable for third-party integrations (document again when a map SDK issue ships).

### Accessibility

- Section heading id referenced by `aria-labelledby`.
- Fallback message is plain text (not `aria-hidden`).
- No map-only navigation; deep links unchanged.
- Do not store map state in React Router `location.state`.

### Files to create or modify (web)

- `app/domains/catalog-listing/catalog-geography-centroid-map-view.jsx` — **create**
- `app/domains/catalog-listing/catalog-geography-centroid-map-view.spec.jsx` — **create**
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx` — **modify**
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-detail-page.jsx` — **modify**

## Test plan

- Domain spec: coords present → shell; coords missing → fallback copy; `aria-labelledby` association.
- Optional route smoke: area listings page render asserts `data-testid="catalog-area-centroid-map"` when loader `catalogArea` includes lat/lng.
- Manual: area with seeded coords; area with null coords; listing detail; mobile column layout with booking panel.

### Verification commands

```bash
cd red-cab-web && npm run test -- app/domains/catalog-listing/catalog-geography-centroid-map-view.spec.jsx
cd red-cab-web && npm run lint
```

## Out of scope

- Interactive map provider SDK and pan/zoom
- Multiple pins on area list page
- Map regions on district hub or near-me ranked list
- Provider/team surfaces
- `geography.md` amend (unless plan Q4=B)

## Human verification (plan artifact)

Human verification **passed** (2026-09-26): Q1=A, Q2=A, Q3=B, Q4=A — see PKM `inbox/2026-09-26-issue-66-plan.md`. User approved 2026-09-26; spec `status: approved` for codegen.

### Spec review (2026-09-26)

**Recommendation:** approved — no must-fix. Aligns with issue #66 AC, `frontend.md` geography/maps rules, centroid semantics in `geography.md`, public SSR loaders on existing marketplace APIs; no pricing, auth, or API changes. **Should-fix (optional):** inherit existing `meta` robots (`index, follow`) on both routes — unchanged by this issue.
