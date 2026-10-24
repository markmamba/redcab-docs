---
title: "Add listing pages for all, region and prefecture scope"
sidebar_label: Web · Listing scope pages
issue: "https://github.com/markmamba/red-cab-web/issues/153"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#tourist-discovery-ia"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#marketplace-filter-combination"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#marketplace-sort-options"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#keyword-search-scope"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#listing-slug"
  - "docs/30-49-domains/38-catalog/requirements/tourist-browse-and-search.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-206-listing-slug.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-207-scoped-listings-index.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-208-keyword-search.md"
---

## TL;DR

- Ships three listing pages: `/listings`, `/regions/:region-slug/listings` and `/regions/:region-slug/:prefecture-slug/listings`. One page module serves the three routes.
- Ships the listing detail page at `/listings/:listing-slug`. It replaces the resolver at `/listings/:uuid`.
- Ships a keyword field with a short pause. The keyword, the filters and the sort stay in the URL.
- Service type and language take many values (checkbox groups). The prefecture select offers only the prefectures of the current region.
- Ships 301 redirects from the old `/districts`, `/discover` and `/account/discover` URLs, and from `/listings/:uuid` to the slug URL.
- Ships the empty, not found and error states.
- Removes the old district and area pages, the geography nav, the price fields and the near-me code.
- Does NOT ship the price filter, the vehicle type filter, the price sort or the Most booked sort. Does NOT ship the home page region cards (#152). Does NOT change the API.
- Breaking change: Yes for URLs. Old `/districts/...` URLs now redirect. The old pages are gone.

## Problem

Tourists browse at `/districts/{districtSlug}/areas/{areaSlug}/listings` today. A listing now sits on a prefecture (api-204), so the old area page finds no listing.

1. No route shows the listings of a region, a prefecture or the whole marketplace.
2. The search field on the toolbar is disabled, and the filters take one value.
3. The filter panel sends `price_min` and `price_max`. The API returns 422 for them until release 3.
4. The listing detail page lives under the district and area path, and `/listings/:uuid` is only a resolver.
5. The sort control labels the default "Newest", and Top rated is disabled.

Evidence:

- `app/marketplace.routes.js` (routes under `districts` and `listings/:listingUuid`)
- `app/routes/marketplace/catalog-district/*` (area based pages and loaders)
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx` (disabled search)
- `app/domains/catalog-listing/catalog-listing-discover-filter-form.jsx` (single value filters, price fields)
- `app/api/marketplace-catalog-listings-api.js` (`indexByArea` only)
- Issue #153

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Tourist discovery information architecture](/docs/30-49-domains/catalog/catalog-decisions/#tourist-discovery-ia) | The four public URLs. Legacy `/districts/...` URLs redirect with 301. |
| Ruling | [Marketplace filter combination](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-filter-combination) | OR inside a category, AND between categories. |
| Ruling | [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-sort-options) | "Recently added" is the default. |
| Ruling | [Keyword search scope](/docs/30-49-domains/catalog/catalog-decisions/#keyword-search-scope) | A pause of 300 to 500 ms. The param is `keyword`. Clearing it keeps scope, filters and sort. |
| Ruling | [Listing slug](/docs/30-49-domains/catalog/catalog-decisions/#listing-slug) | `/listings/:uuid` redirects to `/listings/:listing-slug`. |
| Req | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | What the tourist sees. |
| Naming | [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#discover-api-params) | Query param names. |
| Spec | [api-206](./api-206-listing-slug.md), [api-207](./api-207-scoped-listings-index.md), [api-208](./api-208-keyword-search.md) | The API these pages call. All are implemented. |
| Web | `red-cab-web/AGENTS.md`, `app/routes/AGENTS.md`, `app/domains/AGENTS.md` | Conventions. |

## Design decisions

Rulings marked "Owner ruling" were given by the owner on 2026-10-24.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **One page module serves `/listings`, `/regions/:regionSlug/listings` and `/regions/:regionSlug/:prefectureSlug/listings`. Each route has its own route `id`.** | Three page modules | The three pages differ only by scope. The loader maps the path params to `region_slug` and `prefecture_slug`. **Added point, please review.** |
| 2 | **The listing detail page is `/listings/:listingSlug`. The loader accepts a slug. When the param has the shape of a UUID, the loader fetches the listing and redirects with 301 to `/listings/{slug}`.** | Keep the resolver with 302 | The ruling says the UUID URL redirects. The API show route takes both (api-206 decision 8). |
| 3 | **Each page renders its own `Container`. The old district layout route is deleted.** | Keep a layout route | The layout only held the geography nav and the page heading, which are gone. **Added point, please review.** |
| 4 | **Each loader calls the regions endpoint and the listings endpoint at the same time. The regions list gives the names for the title, the breadcrumb and the prefecture select.** | Call the legacy district endpoints | `GET /marketplace/catalog/regions` is the new source (api-207). A known scope with no discoverable listing is not in the list. The page then uses the title-cased slug as its name. **Added point, please review.** |
| 5 | **An unknown region or prefecture (API 404) shows the not found state. For a page number out of range (also 404), the loader tries page 1 once. If that works, it redirects with 302 to the same URL without `page`. If page 1 also fails with 404, the page shows not found.** | Treat every 404 as not found | The API uses 404 for both causes. The retry tells them apart and costs one call only in the rare case. **Added point, please review.** |
| 6 | **The loader sends only these params: `keyword`, `service_type`, `language`, `date`, `passenger_count`, `order_by`, `order_dir`, `page`. It drops a value the API would reject: a service type or language that is not in the list, a date that is not `YYYY-MM-DD`, a group size below 1, `order_dir` other than `desc`, and `order_by` other than `published_at` or `rating_average`.** | Send the URL as it is and show the 422 | A hand-edited URL must not break the page. `vehicle_type`, `min_price`, `max_price`, `price_min` and `price_max` are never sent (they return 422 until release 3). **Added point, please review.** |
| 7 | **A keyword with more than 100 characters or more than 5 words is not sent. The field shows "Use up to 5 words." The input has `maxLength` 100.** | Send it and show the API error | The API limits are 100 characters and 5 words (api-208). The tourist should know why nothing changed. **Added point, please review.** |
| 8 | **The keyword field waits 400 ms after the last key, then sets `keyword` in the URL and sets `page` to 1. It replaces the history entry, so Back does not step through every letter. An empty field removes the param. A clear button (×) shows when the field has text.** | A search button. A pause of 300 or 500 ms. | The ruling asks for 300 to 500 ms. 400 ms is the middle. **Added point, please review.** |
| 9 | **The field reads its value from the URL. A change of the URL by Back or Forward updates the field.** | Keep the field state apart from the URL | The URL is the source of truth for list state (`app/routes/AGENTS.md`). |
| 10 | **Service type and language are checkbox groups in the Filters panel. The URL holds many values as a comma list, for example `service_type=charter_bus,tour_guide`.** | A multi-select with chips | Owner ruling. Service type has 4 options and language has 6, so all choices stay visible. The comma list is the format in the naming doc. |
| 11 | **The Filters panel has: prefecture (on region and prefecture pages only), service type, language, service date and group size. It does not have price or vehicle type.** | Keep the price fields | Owner ruling. Price and vehicle type wait for release 3. |
| 12 | **The prefecture select lists only the prefectures of the current region, with the choice "All of {region}". Applying it goes to the prefecture URL (or the region URL) and keeps the keyword, the filters and the sort. It sets `page` to 1. `/listings` has no scope control.** | A region select on `/listings`. Prefecture links above the results. | Owner ruling. The prefecture is part of the URL. |
| 13 | **"Reset" in the panel and "Clear filters" on the page clear service type, language, date and group size. They keep the prefecture, the keyword and the sort.** | Also clear the prefecture, or the keyword | Owner ruling. The ruling says clearing keeps the scope. |
| 14 | **The sort control has two options: "Recently added" (default) and "Top rated". The default removes `order_by` and `order_dir` from the URL. "Top rated" sets `order_by=rating_average` and `order_dir=desc`. A change of sort sets `page` to 1.** | Keep Top rated disabled | Owner ruling. The API supports it (api-207). The label follows the Catalog ruling. |
| 15 | **A scope page shows a breadcrumb, an h1 with the scope name, and the result count from `meta.count`. It has no map.** | Keep a map | Owner ruling. Regions and prefectures have no coordinates in the API. |
| 16 | **Breadcrumb: "Home > All services", "Home > {Region}" or "Home > {Region} > {Prefecture}". On the detail page, the breadcrumb ends with the listing title.** | No breadcrumb | Owner approved the header "Home > Kanto > Tokyo". The detail page finds the region in the regions list. If the region is missing, that crumb is skipped. |
| 17 | **The detail page "back" link goes to the listing's prefecture page ("Back to {Prefecture}"). The detail loader also calls the regions endpoint to find the region. If it finds none, the link goes to `/listings`.** | Browser back. Always `/listings`. | Owner ruling. The detail payload has the prefecture but no region. |
| 18 | **A scope page with no keyword and no filter param, and any sort param, is `index, follow`. A scope page with `keyword`, `service_type`, `language`, `date`, `passenger_count`, `order_by` or `order_dir` is `noindex, follow`. The canonical link is the clean scope URL (with `page` only when it is above 1).** | `index, follow` on every URL | Owner ruling. This avoids many thin pages. A sort only changes the order of the same results. **The rule for `order_by` and `order_dir` is an added point, please review.** |
| 19 | **Legacy redirects (301): `/districts` goes to `/listings`. `/districts/:districtSlug` goes to the prefecture page found by the slug in the regions list. `/districts/:d/areas/:a` and `/districts/:d/areas/:a/listings` go to the page of the district (the prefecture). `/districts/:d/areas/:a/listings/:uuid` goes to `/listings/{slug}`. `/discover` and `/discover/*` go to `/listings`. The `/account/discover` routes use the same mapping. Anything that has no match goes to `/listings`.** | Send all to `/listings`. Redirect only listing links. | Owner ruling. A district that is a designated city is not in the regions list, so it goes to `/listings`. **The fallback for a city district is an added point, please review.** |
| 20 | **One module holds the legacy mapping functions. The marketplace routes and the `/account/discover` redirects both use it. A 404 from the API falls back to `/listings`. Other errors are not hidden.** | Copy the mapping in each redirect page | The two groups of redirects must not drift apart. **Added point, please review.** |
| 21 | **The menu link "Districts" becomes "Services" and opens `/listings`.** | "Browse". Keep "Districts". | Owner ruling. The name "District" no longer exists in the product. |
| 22 | **The near-me files are deleted: `catalog-near-me-areas-service.js`, `catalog-near-me-areas-section-view.jsx`, `catalog-near-me-ranked-area-list-view.jsx`, their specs, and `marketplace-catalog-areas-near-api.js` with its spec.** | Keep them unused | Owner ruling for the three domain files. They have no user after this change. Git keeps the history. **The API module with its spec is an added point, please review.** |
| 23 | **`MARKETPLACE_CATALOG_PATHS` gets `LISTINGS`, `region(regionSlug)`, `prefecture(regionSlug, prefectureSlug)` and `listing(listingSlug)`. The district and area builders are removed. `listingResolver(uuid)` stays for the booking pages, because `/listings/:uuid` still works through the redirect.** | Keep both sets | The old builders have no user after this change. |
| 24 | **`PUBLIC_RETURN_PREFIXES` gets `/regions`. `/districts` stays, so a saved return link still works through the redirect.** | Remove `/districts` | A person may log in from an old link. |
| 25 | **The wireframe `tourist-listings-ui.pen` is not changed in this item. The "Layout" section below describes the layout in words.** | Update the wireframe first | The Pencil app was not reachable when this spec was written. Owner ruling. Update the wireframe later. |

## API contract

No new API item. The pages call these endpoints. The shapes are in the api specs.

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/regions` | none | | `{ catalog_regions: [{ uuid, slug, name_en, name_ja, listing_count, prefectures: [{ uuid, slug, name_en, name_ja, popular_rank, listing_count }] }] }` | Only nodes with a discoverable listing. |
| GET | `/marketplace/catalog/listings` | none | `region_slug`, `prefecture_slug`, `keyword`, `service_type`, `language`, `date`, `passenger_count`, `order_by`, `order_dir`, `page` | `{ catalog_listings: [...], meta: { page, page_size, next, last, count, pages } }` | 404 for an unknown scope and for a page out of range. 422 for a bad value. `page_size` is not sent. |
| GET | `/marketplace/catalog/listings/:listing_id` | none | `passenger_count`, `availability_slot_id` | Listing with `slug`, `uuid`, `area` (the prefecture) | Takes a UUID or a slug. Only published listings. |

Query rules:

- Multi-value params are comma lists.
- `prefecture_slug` needs `region_slug`.
- The slug `hokkaido` is both a region and a prefecture. The URL `/regions/hokkaido/hokkaido/listings` is valid.

## Web contract

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Marketplace | `/listings` | `loader` (SSR) | `marketplace-catalog-listings-api.js`, `marketplace-catalog-regions-api.js` | None (public) |
| Marketplace | `/regions/:regionSlug/listings` | `loader` (SSR) | Same | None |
| Marketplace | `/regions/:regionSlug/:prefectureSlug/listings` | `loader` (SSR) | Same | None |
| Marketplace | `/listings/:listingSlug` | `loader` (SSR) | `marketplace-catalog-listings-api.js`, `marketplace-catalog-regions-api.js` | None |
| Marketplace | `/districts`, `/districts/:districtSlug`, `/districts/:d/areas/:a`, `/districts/:d/areas/:a/listings`, `/districts/:d/areas/:a/listings/:listingUuid` | `loader` (301 redirect) | `marketplace-catalog-regions-api.js`, `marketplace-catalog-listings-api.js` | None |
| Marketplace | `/discover`, `/discover/*` | `loader` (301 redirect) | None | None |
| Tourist | `/account/discover...` (existing redirect routes) | `loader` (301 redirect) | Existing, plus the shared mapping | Existing |

The route order matters: `listings` and `listings/:listingSlug` do not clash. Register the three scope routes and the legacy routes explicitly in `marketplace.routes.js` (no `resources`).

### Layout (text sketch)

Scope page:

```
Home > Kanto > Tokyo                         (breadcrumb)
Tokyo                                        (h1)
24 services                                  (result count)
[ (search) Search services   x ]  [Filters]  [Sort: Recently added v]
Clear filters                                (only when a filter is on)
+----------+ +----------+ +----------+
| card     | | card     | | card     |      (3 columns on desktop)
+----------+ +----------+ +----------+
< 1 2 3 >                                    (pagination)
```

Filters panel (side panel from the right):

```
Filters                                  [x]
Prefecture      [ All of Kanto        v ]    (region and prefecture pages only)
Service type    [ ] Private car transfer
                [ ] Charter bus
                [ ] Tour guide
                [ ] Tour guide + driver
Language        [ ] English  [ ] Japanese  [ ] Chinese
                [ ] Korean   [ ] Spanish   [ ] Other
Service date    [ yyyy-mm-dd ]
Group size      [ 4 ]
[ Apply ]  [ Reset ]
```

States:

- Empty: no result for the scope. With filters on, the text names the filters and offers "Clear filters".
- Not found: unknown region or prefecture. A link goes to `/listings`.
- Error: the listings call failed. The text says to try again.

### Files to create or modify (Web)

Routes:

- `app/marketplace.routes.js`: the new routes and the legacy routes. Delete the `districts` layout and its children.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-list-page.jsx` (new): scope page, loader, `meta`, `handle.breadcrumb`.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.jsx`: moved with `git mv` from `catalog-district/` and then edited (slug param, UUID redirect, back link, breadcrumb, `meta`).
- `app/routes/marketplace/catalog-listing/marketplace-catalog-legacy-redirect-page.jsx` (new): one loader for the legacy `/districts` routes.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-legacy-redirect-utils.js` (new): the mapping functions (decision 20).
- `app/routes/marketplace/catalog-listing/marketplace-catalog-loader-utils.js`: moved with `git mv`.
- `app/routes/marketplace/marketplace-discover-redirect-page.jsx`: target `/listings`.
- `app/routes/tourist/tourist-account-discover-redirect-utils.js`: use the shared mapping.
- Delete the old `catalog-district/` pages, the layout, the resolver and their specs.

API modules:

- `app/api/marketplace-catalog-regions-api.js` (new): `index`.
- `app/api/marketplace-catalog-listings-api.js`: replace `indexByArea` with `index(filters)`. Rename the `show` param to `listingId`.
- Delete `app/api/marketplace-catalog-areas-near-api.js` and its spec (decision 22).

Domain:

- `app/domains/catalog-listing/catalog-listing-constant.js`: paths, the keyword pause, the sort labels, the query key whitelist, the copy. Remove the price keys.
- `app/domains/catalog-listing/catalog-listing-service.js`: scope paths, search param builders and sanitizer, the sort mapping, canonical and robots helpers. Remove the district and area builders and the stale redirect helpers.
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx`: the keyword field.
- `app/domains/catalog-listing/catalog-listing-discover-filter-form.jsx` and `catalog-listing-discover-filter-schema.js`: checkbox groups, prefecture select, no price.
- `app/domains/catalog-listing/catalog-listing-discover-sort-control.jsx`: two options.
- `app/domains/catalog-listing/catalog-listing-list-view.jsx`: card links use the slug.
- `app/domains/catalog-listing/catalog-geography-nav.jsx`, `catalog-area-list-view.jsx`, `catalog-district-list-view.jsx` and the three near-me files: delete.
- `app/domains/bookings-booking/bookings-booking-service.js`: keep `listingResolverPath`.

Other links:

- `app/layouts/tourist/tourist-nav-config.js` and `app/domains/tourist/tourist-surface-copy.js`: "Services" and `/listings`.
- `app/auth/auth-safe-redirect.js`: add `/regions`.
- `app/components/tourist/tourist-empty-state.jsx`, `app/domains/catalog-listing/home-landing-view.jsx`, the checkout pages and the checkout return page: use `MARKETPLACE_CATALOG_PATHS.LISTINGS`.

Skills to use when coding: `creating-route-pages`, `creating-api-clients`, `creating-domain-forms`, `creating-domain-views`, then `review-react-style`.

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: none. Every call is a read.
- Snapshots: none.
- Pricing: the card and the detail page show API amounts only. The web computes no price.
- Discoverability: only the API decides which listings appear (INV-8).

## Out of scope

- The price filter, the vehicle type filter and the Price: low to high sort (release 3).
- The Most booked sort (release 5).
- The home page region cards (#152) and the popular destination links.
- Near-me, and a map on scope pages.
- Any API change. This includes coordinates for regions.
- Slug history, and redirects from an old draft slug.
- A page size choice.
- The update of `tourist-listings-ui.pen`.
- A change to the booking pages, except the links to `/listings`.

## Tasks

### Web

- [ ] Add the regions API client and replace `indexByArea` with `index`, with specs.
- [ ] Add the path builders, the param sanitizer and the search param builders, with specs.
- [ ] Build the scope page and register the three routes.
- [ ] Build the keyword field with the pause, the clear button and the word limit message.
- [ ] Rebuild the Filters panel: checkbox groups, prefecture select, no price. Update the schema.
- [ ] Update the sort control: two options, new label.
- [ ] Add the breadcrumb, the title and the result count.
- [ ] Add the empty, not found and error states, and the out of range page retry.
- [ ] Add `robots` and canonical rules to `meta`.
- [ ] Move the detail page to `/listings/:listingSlug` and add the UUID redirect, the back link and the breadcrumb.
- [ ] Add the legacy redirects and the shared mapping, and retarget `/discover` and `/account/discover`.
- [ ] Update the card links, the menu link, the other `/districts` links and the safe return prefixes.
- [ ] Delete the old pages, the geography nav, the near-me code and their specs.
- [ ] Run `review-react-style`, `npm run lint` and `npm test`.

### Docs

- [ ] Set spec `status: implemented` after merge
- [ ] Update `tourist-listings-ui.pen` (separate follow-up, decision 25)

## Acceptance criteria

- [ ] The three scope pages show the right listings, and the URL keeps the keyword, the filters and the sort.
- [ ] `/regions/hokkaido/hokkaido/listings` works.
- [ ] Typing in the keyword field updates the URL once, about 400 ms after the last key.
- [ ] A new keyword resets the page to 1.
- [ ] Clearing the keyword keeps the scope, the filters and the sort.
- [ ] A keyword of more than 5 words or 100 characters is not sent and shows a message.
- [ ] Two service types in the URL show the listings that match either type. Service type and language together narrow the result.
- [ ] The prefecture select lists only the prefectures of the current region. Applying it goes to the prefecture URL and keeps the keyword, the filters and the sort.
- [ ] "Reset" and "Clear filters" keep the prefecture, the keyword and the sort.
- [ ] The sort control has "Recently added" and "Top rated". "Recently added" is the default and leaves the URL clean.
- [ ] The web never sends `vehicle_type`, `min_price`, `max_price`, `price_min` or `price_max`.
- [ ] A hand-edited URL with a bad value does not break the page.
- [ ] An unknown region or prefecture shows the not found state. A page out of range goes to page 1.
- [ ] A scope with no listing shows the empty state. A failed call shows the error state.
- [ ] A scope page with a keyword or a filter is `noindex, follow` and its canonical link is the clean scope URL.
- [ ] `/listings/:uuid` redirects with 301 to `/listings/:slug`. An unknown slug shows not found.
- [ ] Each legacy URL in decision 19 redirects with 301 to the page in that decision.
- [ ] The detail page "back" link goes to the prefecture page of the listing.
- [ ] A card links to `/listings/:slug`.
- [ ] The menu link says "Services" and opens `/listings`.
- [ ] No page, link or test refers to `/districts` except the redirect code.
- [ ] No client-side price computation.
- [ ] Text follows ASD-STE100 Tier A.
- [ ] Tests cover the loaders: scope mapping, sanitizer, 404, retry and UUID redirect.
- [ ] Tests cover the legacy mapping and the search param builders.
- [ ] Tests cover the keyword field (with fake timers), the filter form and the sort control.
- [ ] Tests cover the list page render and the card link.

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
| 2026-10-24 | principal developer | Approved in chat. The author confirmed the rulings in decisions 10 to 17, 18, 19, 21, 22 and 25, and the added points (one page module, regions call, 404 retry, URL sanitizer, keyword limits, shared redirect module, near-me API client). The wireframe was not checked. |
