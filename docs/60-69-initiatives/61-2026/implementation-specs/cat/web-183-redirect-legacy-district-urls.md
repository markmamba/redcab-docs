---
title: "Redirect old district and area URLs without an API call"
sidebar_label: Web · Legacy redirects
issue: "https://github.com/markmamba/red-cab-web/issues/183"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-216-remove-legacy-geography-roles-and-slot-code.md"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#legacy-geography-roles"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-153-listing-scope-pages.md"
---

## TL;DR

- Every old `/districts...` URL and every old `/account/discover/:districtId...` district or area URL redirects to the all-services page with a 301.
- These redirects make no API call.
- An old listing URL still redirects to the listing slug page. This call stays, because it needs the listing.
- Removes the districts API client and the code that uses it.
- Does NOT remove the redirect routes. The old URLs must still answer with a 301.
- Does NOT change the API.
- Breaking change: No for visitors. An old district URL of a prefecture now lands on all services, not on the prefecture page.

## Problem

Release 5 removes the district and area endpoints from the API (red-cab-api#216, PR 2).

The web still depends on them in two places:

1. `app/routes/tourist/tourist-account-discover-redirect-utils.js` calls `marketplaceCatalogDistrictsApi.show` and `areaShow` to find a district slug from an old id.
2. `app/routes/marketplace/catalog-listing/marketplace-catalog-legacy-redirect-utils.js` calls the regions endpoint in `resolveDistrictRedirectPath` to send an old district slug to a prefecture page.

After PR 2, call 1 fails with 404 and the visitor lands on all services by accident. Call 2 only works when an old district slug equals a prefecture slug, and the API no longer promises that.

Owner ruling 3 of api-216 says the redirect is static, so no API outage can break an old URL.

Evidence: `app/api/marketplace-catalog-districts-api.js`, the two utils files above, `app/marketplace.routes.js`, `app/tourist.routes.js`, issue #183.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Legacy geography roles](/docs/30-49-domains/catalog/catalog-decisions/#legacy-geography-roles) | The old roles are deprecated and removed |
| Spec | api-216, decisions 3 and 14 | The owner ruling for this redirect, and the order of the pull requests |
| Spec | web-153 | The all-services page at `/listings` |
| Convention | `red-cab-web/AGENTS.md`, `app/routes/AGENTS.md` | Web rules |

## Design decisions

Each row says who made the decision.

"Added point, please review" means the author added it. The owner must confirm or change each row before approval.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-25 (api-216 decision 3). An old district or area URL redirects to the all-services page (`/listings`) with a 301. The web makes no API call for it.** | A slug map endpoint. A fixed slug map in the web. | The API drops the district model fully. |
| 2 | **Owner ruling, 2026-10-25 (api-216 decision 3). An old listing URL still redirects to the listing slug page.** | Redirect it to all services. | The listing still exists and keeps its link value. |
| 3 | **Added point, please review. The district redirect no longer goes to a prefecture page, even when the old slug equals a prefecture slug.** This changes today's behavior in `resolveDistrictRedirectPath`. | Keep the prefecture redirect through the regions endpoint. | Ruling 1 says no API call, and that call needs the regions endpoint. A visitor loses little, because the all-services page has the prefecture filter. |
| 4 | **Added point, please review. The route files stay. Only the loaders change.** | Remove the routes and let the web answer 404. | An old URL must still end in a 301 (release 5 needs "release 1 live with its 301 redirects"). |
| 5 | **Added point, please review. Both route groups share one function, `redirectToAllServices`.** | Keep one function for each group. | Both do the same thing now. |
| 6 | **Added point, please review. `CatalogListingService.findRegionOfPrefecture` stays.** | Remove it. | The region and prefecture pages still use it (`catalog-listing-service.js`). |
| 7 | **Added point, please review. The `/account/discover/:districtId/:areaId/:listingId` route keeps its listing lookup.** | Redirect it to all services. | Same reason as decision 2. |

## Web contract

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Marketplace | `/districts`, `/districts/:districtSlug`, `/districts/:districtSlug/areas/:areaSlug`, `/districts/:districtSlug/areas/:areaSlug/listings` | `redirectLegacyDistrictsRoute` | None | None |
| Marketplace | `/districts/:districtSlug/areas/:areaSlug/listings/:listingUuid` | `redirectLegacyDistrictsRoute` | `marketplaceCatalogListingsApi.show` | None |
| Tourist | `/account/discover`, `/account/discover/:districtId`, `/account/discover/:districtId/:areaId` | `redirectLegacyDiscover*` | None | None |
| Tourist | `/account/discover/:districtId/:areaId/:listingId` | `redirectLegacyDiscoverListing` | `marketplaceCatalogListingsApi.show` | None |

### Behavior

| Old URL | New result |
| --- | --- |
| `/districts` | 301 to `/listings` |
| `/districts/kyoto` | 301 to `/listings` |
| `/districts/kyoto/areas/gion` | 301 to `/listings` |
| `/districts/kyoto/areas/gion/listings` | 301 to `/listings` |
| `/districts/kyoto/areas/gion/listings/{uuid}` | 301 to the listing slug page, or to `/listings` when the listing is unknown |
| `/account/discover/{districtId}` | 301 to `/listings` |
| `/account/discover/{districtId}/{areaId}` | 301 to `/listings` |
| `/account/discover/{districtId}/{areaId}/{listingId}` | 301 to the listing slug page, or to `/listings` when the listing is unknown |

### Files to modify (Web)

- `app/routes/marketplace/catalog-listing/marketplace-catalog-legacy-redirect-utils.js`: remove `resolveDistrictRedirectPath` and its imports of the regions API and `CatalogListingService`. The loader sends a district or area URL to `MARKETPLACE_CATALOG_PATHS.LISTINGS` without a call. Export `redirectToAllServices`.
- `app/routes/tourist/tourist-account-discover-redirect-utils.js`: remove the districts API import and both calls. `redirectLegacyDiscoverDistrict` and `redirectLegacyDiscoverArea` call `redirectToAllServices`.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-legacy-redirect-utils.spec.js` and `app/routes/tourist/tourist-account-discover-redirect-utils.spec.js`: update to the table above.

### Files to remove (Web)

- `app/api/marketplace-catalog-districts-api.js`.

## Data / domain touchpoints

- Bounded context: CAT, read through the API for the listing redirect only.
- Transaction boundaries: none.
- Snapshots: none.

## Known limits

- An old district URL of a prefecture loses its prefecture page and lands on all services.
- The web cannot tell a district that never existed from one that did. Both go to all services.

## Out of scope

- Any change to the API. That is red-cab-api#216.
- The `/discover` and `/discover/*` redirects in `marketplace.routes.js`. They do not call the district API.
- A new region or prefecture redirect map.
- The Most booked sort option.

## Tasks

### Planning

- [x] Create the web issue: red-cab-web#183.
- [x] Get this spec to `status: approved`.

### Web

- [ ] Remove `resolveDistrictRedirectPath` and send district and area URLs to `/listings` without a call.
- [ ] Remove the districts API calls from the tourist discover redirects.
- [ ] Add `redirectToAllServices` and use it in both groups.
- [ ] Keep the listing redirects in both groups.
- [ ] Remove `app/api/marketplace-catalog-districts-api.js`.
- [ ] Update the two spec files.

### Docs

- [ ] Set spec `status: implemented` after merge.
- [ ] Tell red-cab-api#216 that PR 2 can start.

## Acceptance criteria

- [ ] Each old district and area URL in the table returns a 301 to `/listings`.
- [ ] The district and area redirects make no API call. A test checks that no API module is called.
- [ ] An old listing URL returns a 301 to the listing slug page.
- [ ] An unknown listing returns a 301 to `/listings`.
- [ ] An error other than 404 from the listing call is not hidden.
- [ ] No code imports `marketplace-catalog-districts-api`, and `grep -rn "districts-api" app` returns nothing.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.
- [ ] No client-side price computation.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm test
npm run build
grep -rn "districts-api\|resolveDistrictRedirectPath" app
```

- Run the `review-react-style` skill by hand on the pull request.
- Open `/districts/kyoto/areas/gion` in a dev build and check the 301 in the network panel.
- The pull request lists what it did not check.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-27 | Owner | Approved, with decision 3 (no prefecture redirect). |
