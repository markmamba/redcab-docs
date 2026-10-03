---
title: "Public marketplace SSR 401 guest degradation"
sidebar_label: Web · marketplace 401 guest
issue: "https://github.com/markmamba/red-cab-web/issues/109"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-88-remove-auth-hocs.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-107-loader-401-revalidate.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** Marketplace-only SSR helper `handleMarketplaceCatalogLoaderError` — defensive `ApiError` `401` returns per-route fallback data (guest catalog UX); `5xx` still **rethrows**; private portals keep sync `handleLoaderError` **401 rethrow**.
- **Does NOT ship:** `clientLoader` hard-401 / `revalidate()` (#107); root boundary changes (#88 A1 unchanged); client-side marketplace fetches after hydration; API changes (`Marketplace::BaseController` already guest-serves bad cookies).
- **Breaking change:** No — removes incorrect full-page “Session expired” on public catalog when a stale cookie triggers a defensive catalog `401`.

## Problem

Session middleware maps refresh failure to guest (`401` → `null` nav). Marketplace catalog SSR loaders still call `handleLoaderError`, which **rethrows** `401` and hits the **A1** root boundary ([#88](https://github.com/markmamba/red-cab-web/issues/88) interim row deferred to #109). Users with stale `rc_access` on `/`, `/districts/*`, and listing routes see “Session expired” instead of browsing as guest.

Evidence: `app/routes/home-page.jsx`; `marketplace-catalog-listing-list-page.jsx` (explicit `401` rethrow on listings index); `marketplace-catalog-district-page-layout.jsx` (uncaught `districts` index); `app/utils/loader-utils.js` SSR contract from #107.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| #109 | GitHub issue | Acceptance: guest catalog on stale cookie |
| #77 | Parent epic | Auth platform program |
| rails-is-the-boundary | [rails-is-the-boundary.md](/docs/90-99-engineering-meta/93-authentication/rails-is-the-boundary.md) | API enforces; web defensive handling |
| what-red-cab-web-knows | [what-red-cab-web-knows.md](/docs/90-99-engineering-meta/93-authentication/what-red-cab-web-knows.md) | Marketplace never session-`401` from API normatively |
| reading-the-session | [reading-the-session.md](/docs/90-99-engineering-meta/93-authentication/reading-the-session.md) | Cookie forwarding on catalog loaders |
| web-88 | [web-88-remove-auth-hocs.md](./web-88-remove-auth-hocs.md) | A1 on public marketplace → #109 |
| web-107 | [web-107-loader-401-revalidate.md](./web-107-loader-401-revalidate.md) | SSR marketplace explicitly out of scope until this spec |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Marketplace-only helper** in `marketplace-catalog-loader-utils.js` | Change global `handleLoaderError` | Avoid private SSR regression (#107) |
| 2 | Defensive **`401` → return fallback** | Rethrow to A1 | Product: guest browse with logged-out chrome |
| 3 | **`status >= 500` rethrow** | Swallow like recoverable 4xx | Transient outage ≠ guest (#79 / brief) |
| 4 | Other **`ApiError` → return fallback** | Uniform empty shell | Q2=A: match each route’s existing non-`401` handling |
| 5 | **`public-root` A1 unchanged** | Softer marketplace boundary | Q1=A: loaders must not throw defensive `401` |
| 6 | Session middleware | Unchanged | web-88 surface table |
| 7 | Client-side catalog fetches | Out of scope | Q4=A |

## Web contract

### `handleMarketplaceCatalogLoaderError(error, fallbackData)`

| Error | Behaviour |
| --- | --- |
| non-`ApiError` | Rethrow |
| `ApiError` `401` | Return `fallbackData` (guest degradation) |
| `ApiError` `status >= 500` | Rethrow |
| Other `ApiError` | Return `fallbackData` |

Sync only. Does **not** call `revalidate()` or navigate.

### Per-route fallback matrix (SSR `loader`)

| Route module | On defensive `401` | Notes |
| --- | --- | --- |
| `home-page.jsx` | `{ districts: [] }` | Same empty featured strip as recoverable errors today |
| `marketplace-catalog-district-page-layout.jsx` | `{ districts: [], areas: [], geographyNotFoundMessage: null }` if `districts` index fails; `{ districts, areas: [], geographyNotFoundMessage: null }` if `areasIndex` fails | Wrap `districts` index in try/catch |
| `marketplace-catalog-area-list-page.jsx` | `{ catalogDistrict: null, notFoundMessage: null }` | After existing `404` branch |
| `marketplace-catalog-listing-list-page.jsx` | Listings inner: `{ catalogArea, catalogListings: [], meta, notFoundMessage: null, loadError: true }` (same as other recoverable listing errors); outer: same shape with null area | Remove explicit `401` rethrow |
| `marketplace-catalog-listing-detail-page.jsx` | `{ catalogListing: null, priceErrorMessage: null, notFoundMessage: null }` | Both primary and 422 fallback paths |
| `marketplace-catalog-listing-resolver.jsx` | `302` redirect to district directory (`MARKETPLACE_CATALOG_PATHS.DISTRICTS`) | Resolver has no page shell |

Routes keep **`handleLoaderError` off** marketplace catalog loaders except where unchanged global contract is intentionally not used.

### Files to create or modify (Web)

| File | Change |
| --- | --- |
| `app/routes/marketplace/catalog-district/marketplace-catalog-loader-utils.js` | Add `handleMarketplaceCatalogLoaderError` |
| `app/routes/marketplace/catalog-district/marketplace-catalog-loader-utils.spec.js` | Unit matrix |
| `app/routes/home-page.jsx` | Use marketplace helper |
| `app/routes/home-page.spec.js` | `401` → empty districts; `503` rethrows |
| Catalog district route modules (table above) | Swap error policy |
| `*.spec.js` | Flip `401` expectations; layout + resolver cases |

## Out of scope

- #107 `clientLoader` revalidation; #108 `shouldRevalidate`
- `ky-client` refresh navigate policy
- API portal-gate `401` → `403`
- Client-side slot/listing fetches after hydration
- `changing-a-session.md` worked example (Q3=A — spec only)

## Tasks

### Web

- [ ] Add `handleMarketplaceCatalogLoaderError` + unit tests
- [ ] Apply across home + catalog loaders per matrix
- [ ] Update loader specs

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Stale/invalid session cookie on public marketplace SSR routes renders guest catalog shell (no A1 “Session expired” from defensive catalog `401`)
- [ ] Private `/account/*` and other portals still rethrow SSR `401` via `handleLoaderError` where applicable
- [ ] Marketplace loader `503`/`5xx` still surfaces error boundary (not guest empty state)
- [ ] `npm run test` green for touched specs

## Verification

```bash
cd red-cab-web && npm run test -- app/routes/home-page.spec.js app/routes/marketplace/catalog-district/
```

Manual: invalid `rc_access` on `/`, `/districts/:slug`, listing detail — guest nav, no full-page session expired.
