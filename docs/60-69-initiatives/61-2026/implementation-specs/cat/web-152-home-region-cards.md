---
title: "Show region cards on the tourist home page"
sidebar_label: Web · Home region cards
issue: "https://github.com/markmamba/red-cab-web/issues/152"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#tourist-discovery-ia"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#popular-destinations-and-images"
  - "docs/30-49-domains/38-catalog/requirements/tourist-browse-and-search.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-207-scoped-listings-index.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-153-listing-scope-pages.md"
---

## TL;DR

- Ships region cards on the home page. One card for each region that has a discoverable listing.
- A card has a 4:3 image (or a placeholder), the region name and the number of services.
- A card also has a link for every prefecture of the region.
- A card opens `/regions/:region-slug/listings`. A prefecture link opens `/regions/:region-slug/:prefecture-slug/listings`.
- The home page loads the regions from `GET /marketplace/catalog/regions`.
- Removes the "Featured districts" section, the district card view, and the featured districts call.
- Does NOT ship the region images (content adds them later). Does NOT ship popular destination ranks, region descriptions or near-me. Does NOT change the API.
- Breaking change: No for users. The home page shows regions in place of districts.

## Problem

The home page shows "Featured districts" as plain text cards without images. It loads them from the districts index with `featured=true`.

1. The Catalog rulings say tourist browse starts with regions, not districts.
2. A district card opens an old `/districts/...` URL. That URL now only redirects.
3. There is no image for a region and no placeholder.

Evidence:

- `app/routes/home-page.jsx` (loader calls `marketplaceCatalogDistrictsApi.index({ featured: true, page_size: 6 })`)
- `app/domains/catalog-listing/home-landing-view.jsx` (renders `CatalogDistrictListView`)
- `app/domains/catalog-listing/catalog-district-list-view.jsx` (links through `MARKETPLACE_CATALOG_LEGACY_DISTRICT_PATH`, kept by the #153 spec until this item)
- Issue #152

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Tourist discovery information architecture](/docs/30-49-domains/catalog/catalog-decisions/#tourist-discovery-ia) | The home page shows region cards. A region card opens the listings of the region. |
| Ruling | [Popular destinations and images](/docs/30-49-domains/catalog/catalog-decisions/#popular-destinations-and-images) | Region images are static web files with a placeholder. |
| Req | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | A card per region with a discoverable listing. A region with no image shows a placeholder. |
| Spec | [api-207](./api-207-scoped-listings-index.md) | The regions endpoint, its shape and its order. |
| Spec | [web-153](./web-153-listing-scope-pages.md) | The target pages: region and prefecture listings. |
| Web | `red-cab-web/AGENTS.md`, `app/domains/AGENTS.md`, `app/routes/AGENTS.md` | Conventions. |

## Design decisions

Rulings marked "Owner ruling" were given by the owner on 2026-10-24.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **The home loader calls `marketplaceCatalogRegionsApi.index(loaderOptions)` and returns `{ catalogRegions }`. The error policy stays as today: a 401 or another 4xx gives an empty list, a 5xx is re-thrown, and an error that is not an API error is re-thrown.** | Degrade on every error | The page keeps today's tested behavior. Only the data source changes. |
| 2 | **A region card shows: an image area, the region name, the number of services, and the prefecture links.** | Name only. Name, count and a description. | Owner ruling: name and number of services. Region descriptions do not exist in the API. |
| 3 | **The image area has a 4:3 ratio (Bootstrap `ratio-4x3`). The card is "Option A" of the layout mock (image on top, text on a plain background), with the 4:3 image size of its "Option B".** | Option B (name over the image). Option C (compact card). | Owner ruling. The text stays readable on any image. The 4:3 size gives the picture more room. |
| 4 | **The image file of a region is `public/images/regions/{slug}.jpg`, where `{slug}` is the region slug.** | The geography UUID as the file key | Owner ruling: the slug. It closes the open question in the Catalog decisions (decision 14 below records it). The slug is stable, unique for regions, and readable. |
| 5 | **A constant `CATALOG_REGION_IMAGE_SLUGS` lists the slugs that have an image file. A region in the list shows its image. A region not in the list shows the placeholder.** | `onError` on the image. A layered CSS background. | Owner ruling. `onError` misses errors that happen before the page hydrates. An explicit list is easy to test. Adding an image means adding its slug to the list (one line). |
| 6 | **The list starts empty, because no image file exists yet. Every card shows the placeholder at release.** | Wait for the images | Owner ruling: ship with the placeholder, and add the files later. |
| 7 | **The placeholder is a grey tile (Bootstrap `bg-body-secondary`) with the Red Cab mark `/brand/redcab-mark-48.png` centered at 48 px. No new asset is needed.** | Stretch the 48 px mark over the whole tile (as the listing card does today) | A centered mark stays sharp. The stretched one is blurry. **Added point, please review.** |
| 8 | **A real image has `loading="lazy"`, `object-fit-cover`, and an empty `alt`. The region name is in the link next to it, so a text alternative would repeat it.** | `alt` with the region name | A screen reader would read the name twice. **Added point, please review.** |
| 9 | **A prefecture link shows for every prefecture in the `prefectures` list of the region. The API returns only prefectures with a discoverable listing, in the order of rank, then of prefecture order. There is no limit.** | The first 5 and "+N more". Only ranked prefectures. | Owner ruling: all prefectures as small links, no limit. The popular rank is not used. |
| 10 | **The region name is a link with Bootstrap `stretched-link`, so the whole card opens the region page. The prefecture links are siblings (not inside the name link) with `position-relative z-2`, so they stay clickable.** | Nested links | A link inside a link is not valid HTML. This is the Bootstrap pattern for a clickable card. |
| 11 | **The grid is 3 columns on a wide screen, 2 on a tablet and 1 on a phone (`Col xs=12 sm=6 lg=4`). The cards in a row have equal height (`h-100`).** | Other column counts | **Added point, please review.** Nine regions make three full rows on a wide screen. |
| 12 | **The section has the heading "Browse by region" and the text "Pick a region to see its services." It shows only when the list has at least one region. Without regions, the home page shows the hero and its button only.** | Show an empty state | The same rule as today for the districts section. **The wording is an added point, please review.** |
| 13 | **Names follow the account language: `name_ja` for Japanese, `name_en` otherwise, through `CatalogListingService.getLocalizedLabel`.** | English only | The same rule as the rest of the tourist pages. |
| 14 | **The Catalog decisions page records the image key ruling: the "Popular destinations and images" section says the key is the slug, and the Open questions row for the image key is removed.** | Leave the question open | Rulings live in the Catalog decisions. The spec must not contradict them. This is a docs task. |
| 15 | **The district card view `catalog-district-list-view.jsx` and its constant `MARKETPLACE_CATALOG_LEGACY_DISTRICT_PATH` are deleted. `marketplaceCatalogDistrictsApi.index` (the featured call) is removed from the API client. `areasIndex` is removed too, because the deleted area pages were its only users.** | Keep them unused | Dead code. The #153 spec kept the view only until this item. The `show` and `areaShow` methods stay, because the `/account/discover` redirects use them. **Removing `areasIndex` is an added point, please review.** |
| 16 | **The files that serve region images are the content team's job. A test checks that the list and the folder agree: every listed slug has a file, and every `.jpg` in the folder is in the list.** | No check | An image that is not in the list would never show. A list entry with no file would show a broken image. |
| 17 | **Image rules for content: JPG, 4:3 ratio, about 1200 by 900 pixels, under 200 KB.** | No rule | The review rules flag images over 200 KB. **Added point, please review.** |
| 18 | **The wireframe `tourist-home-ui.pen` is not changed in this item.** | Update it first | Owner ruling: the `.pen` files are ignored for now. The layout comes from the HTML mock. |

## API contract

No new API item. The home page calls one existing endpoint.

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/regions` | none | | `{ catalog_regions: [{ uuid, slug, name_en, name_ja, listing_count, prefectures: [{ uuid, slug, name_en, name_ja, popular_rank, listing_count }] }] }` | Only regions and prefectures with a discoverable listing. Regions by `display_order`. Prefectures by `popular_rank` (no rank last), then `display_order`. |

## Web contract

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Marketplace | `/` | `loader` (SSR) | `marketplace-catalog-regions-api.js` (exists) | None (public) |

### Layout (text sketch)

Home page, wide screen:

```
        Book private transfers and tours across Japan        (hero, as today)
   Browse services, compare them, and book trusted ...
                    [ Browse services ]

Browse by region
Pick a region to see its services.

+----------------+ +----------------+ +----------------+
|                | |                | |                |
|   image 4:3    | |   image 4:3    | |   image 4:3    |
|                | |                | |                |
| Hokkaido       | | Tohoku         | | Kanto          |
| 8 services     | | 5 services     | | 24 services    |
| (Hokkaido)     | | (Miyagi)(Aomori)| | (Tokyo)(Chiba) ...
+----------------+ +----------------+ +----------------+
```

A card with no image file shows a grey tile with the Red Cab mark in the center. On a tablet the cards are two across, and on a phone they are one across.

States:

- Regions loaded: the hero and the region cards.
- No region (no discoverable listing), or a recoverable error (401 or another 4xx): the hero and its button only.
- A server error (5xx): the error page, as today.

### Files to create or modify (Web)

Routes:

- `app/routes/home-page.jsx`: the loader and the page use the regions endpoint.
- `app/routes/home-page.spec.js`: the loader tests change to the regions endpoint.

Domain:

- `app/domains/catalog-geography/catalog-geography-constant.js` (new): `CATALOG_REGION_IMAGE_DIRECTORY` (`/images/regions`), `CATALOG_REGION_IMAGE_SLUGS` (empty list), `CATALOG_REGION_PLACEHOLDER_IMAGE_PATH` (`/brand/redcab-mark-48.png`).
- `app/domains/catalog-geography/catalog-geography-service.js` (new): `getRegionImagePath(regionSlug)` (the path of the image, or `null` when the slug is not in the list).
- `app/domains/catalog-geography/catalog-geography-region-list-view.jsx` (new): one region card. It takes one `catalogRegion`.
- `app/domains/catalog-listing/home-landing-view.jsx`: takes `catalogRegions`, draws the grid and the section.
- Delete `app/domains/catalog-listing/catalog-district-list-view.jsx`.
- `app/domains/catalog-listing/catalog-listing-constant.js`: delete `MARKETPLACE_CATALOG_LEGACY_DISTRICT_PATH`.

API modules:

- `app/api/marketplace-catalog-districts-api.js`: remove `index` and `areasIndex`. Keep `show` and `areaShow`.

Static files:

- `public/images/regions/` (new, empty for now, with a `.gitkeep` file).

Docs:

- `redcab-docs/docs/30-49-domains/38-catalog/catalog-decisions.md`: record the image key (decision 14).

Skills to use when coding: `creating-route-pages`, `creating-domain-views`, then `review-react-style`.

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: none. The page only reads.
- Snapshots: none.
- Pricing: none. The cards show no price.
- Discoverability: only the API decides which regions and prefectures appear (INV-8).

## Out of scope

- The region image files. Content adds them later.
- Popular destination ranks, and a "popular destinations" block. The cards use the prefecture list as the API returns it.
- Region descriptions.
- Near-me, and a map on the home page.
- Any API change.
- The update of `tourist-home-ui.pen`.
- A limit on the number of prefecture links.

## Tasks

### Web

- [ ] Add the constants and the service for the region image, with specs.
- [ ] Add the region card view with its spec.
- [ ] Change the home landing view to draw the section and the grid.
- [ ] Change the home loader and its spec to the regions endpoint.
- [ ] Delete the district card view and `MARKETPLACE_CATALOG_LEGACY_DISTRICT_PATH`.
- [ ] Remove `index` and `areasIndex` from the districts API client, and fix its spec if it has one.
- [ ] Add `public/images/regions/` with a `.gitkeep` file and the test that checks the list against the folder.
- [ ] Run `review-react-style`, `npm run lint`, `npm test` and `npm run build`.

### Docs

- [x] Record the image key in `catalog-decisions.md` (decision 14). Done in the docs PR of this spec.
- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] The home page shows one card for each region that the regions endpoint returns, in the order of the response.
- [ ] A card shows the region name, the number of services, and a link for every prefecture of the region.
- [ ] The name of a region card opens `/regions/:region-slug/listings`, and the whole card is clickable.
- [ ] A prefecture link opens `/regions/:region-slug/:prefecture-slug/listings`. The link for Hokkaido opens `/regions/hokkaido/hokkaido/listings`.
- [ ] The card has no link inside another link.
- [ ] A region with an image file in the list shows the image at a 4:3 ratio. A region without one shows the grey tile with the Red Cab mark.
- [ ] The names follow the account language.
- [ ] With no region, or after a 4xx error, the home page shows the hero and its button only.
- [ ] A 5xx error still shows the error page.
- [ ] The home page no longer shows "Featured districts" and no longer calls the districts index.
- [ ] No page, link or test refers to `MARKETPLACE_CATALOG_LEGACY_DISTRICT_PATH`.
- [ ] The test that checks the image list against `public/images/regions/` passes.
- [ ] No client-side price computation.
- [ ] Text follows ASD-STE100 Tier A.
- [ ] Tests cover the loader, the region card (image, placeholder, links, count, language), the home landing view (with and without regions), and the image service.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-24 | principal developer | Approved in chat. The author confirmed the rulings in decisions 2 to 6 and 9, and chose Option A with the 4:3 image from a static layout mock. The author asked to record the image key in `catalog-decisions.md` in the same docs PR. The added points were reviewed (placeholder, image alt text, grid, section text, cleanup of `areasIndex`, image rules). The wireframe was not changed. |
