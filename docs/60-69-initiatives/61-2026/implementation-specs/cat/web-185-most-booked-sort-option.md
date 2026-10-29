---
title: "Add the Most booked sort option"
sidebar_label: Web · Most booked sort
issue: "https://github.com/markmamba/red-cab-web/issues/185"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-215-most-booked-count-and-sort.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-67-listing-sort-control-url-params.md"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#most-booked-sort"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#marketplace-sort-options"
  - "docs/30-49-domains/38-catalog/requirements/tourist-browse-and-search.md"
---

## TL;DR

- Adds one sort preset, Most booked, to the sort select on the marketplace listing pages.
- The preset is last in the list, after Top rated.
- The preset sends `order_by=bookings_count_90d&order_dir=desc` to the API.
- Shows a short note while Most booked is selected.
  - The note says a new booking does not change the order until the next nightly run.
- Does NOT change the API.
  - The API part is merged (red-cab-api#215, PR red-cab-api#250).
- Does NOT add a tie break.
  - The API sorts equal counts by `published_at DESC`.
- Does NOT show the booking count on the listing card.
- Breaking change: No.

## Problem

A tourist cannot sort services by demand.

- The sort select has three presets: Recently added, Price: low to high and Top rated.
- The API already accepts `order_by=bookings_count_90d`.
- The web does not offer it.
- The test in `catalog-listing-discover-sort-control.spec.jsx` asserts `expect(html).not.toContain('Most booked')`.
  - The change must update this test.

Evidence: `app/domains/catalog-listing/catalog-listing-discover-sort-control.jsx`, `catalog-listing-constant.js` (`CATALOG_LISTING_DISCOVER_SORT_PRESET`, `CATALOG_LISTING_DISCOVER_ORDER_BY`), `catalog-listing-service.js` (`resolveDiscoverSortPresetFromQuery`, `buildDiscoverSortSearchParams`), `red-cab-api/docs/api/marketplace/catalog/listings/list-listings.bru`, issue #185.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Most booked sort](/docs/30-49-domains/catalog/catalog-decisions/#most-booked-sort) | Which bookings count, and the 90-day window |
| Ruling | [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-sort-options) | The sort keys and the tie break |
| Requirement | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | US-5: Most booked sorts by bookings confirmed in the last 90 days |
| Spec | api-215 | The API sort key, and the nightly refresh |
| Spec | web-67 | The sort control and the sort query params |
| Convention | `red-cab-web/AGENTS.md`, `app/domains/AGENTS.md` | Web rules |

## Design decisions

Each row says who made the decision.

"Added point, please review" means the author added it.

The owner must confirm or change each row before approval.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-29. Most booked is the last option, after Top rated.** | Put it second. | It is the smallest change, and it keeps the three known options in place. |
| 2 | **Owner ruling, 2026-10-29. The web has no tie break. The API sorts equal counts by `published_at DESC`.** | Add a web-side sort. | The API owns the order. A web sort would break paging. |
| 3 | **Owner ruling, 2026-10-29. The web shows a note: a new booking does not change the order until the next nightly run.** | No note. | The count refreshes once a night (api-215). |
| 4 | **Added point, please review. The preset id is `most_booked`. The label is `Most booked`.** | `popular`. | The label matches the requirement US-5 and the API key. |
| 5 | **Added point, please review. The preset maps to `order_by=bookings_count_90d` and `order_dir=desc`.** | Send no `order_dir`. | The Top rated preset sends both params. The API accepts both ways. |
| 6 | **Added point, please review. A URL with `order_by=bookings_count_90d` and no `order_dir`, or `desc`, selects Most booked.** | Accept only `desc`. | It matches how `resolveDiscoverSortPresetFromQuery` treats Top rated. |
| 7 | **Added point, please review. A URL with `order_by=bookings_count_90d&order_dir=asc` does not select Most booked. The web drops `order_dir=asc` before the API call.** | Forward `asc` and show the API error. | The API accepts only `desc` for this key. The price sort already forces its one direction in the same function. The select then shows Recently added, but the list is sorted by Most booked, so the spec test must check this case. |
| 8 | **Added point, please review. The note shows below the toolbar row, as small muted text, only while Most booked is selected.** | Show it under the select. Show it as a tooltip. | The select sits in a narrow cell next to the filter button, and the text would wrap badly. A tooltip is hidden on touch devices. |
| 9 | **Added point, please review. The note text is: "The order updates once a night. A new booking does not change it until then."** | A shorter text. | It states the effect in plain words. The owner may change the wording. |
| 10 | **Added point, please review. A URL with this sort is still noindex.** | None. | `order_by` is already in `CATALOG_LISTING_DISCOVER_NOINDEX_PARAMS`. No change is needed. |

## Web contract

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Marketplace | `/listings`, `/regions/:regionSlug/listings`, `/prefectures/:prefectureSlug/listings` | Existing loader. No change. | `marketplaceCatalogListingsApi.index` | None |

### Behavior

| URL | Select shows | Sent to the API | Note |
| --- | --- | --- | --- |
| `/listings` | Recently added | No sort params | Hidden |
| `/listings?order_by=bookings_count_90d&order_dir=desc` | Most booked | `order_by=bookings_count_90d&order_dir=desc` | Shown |
| `/listings?order_by=bookings_count_90d` | Most booked | `order_by=bookings_count_90d` | Shown |
| `/listings?order_by=bookings_count_90d&order_dir=asc` | Recently added | `order_by=bookings_count_90d` | Hidden |
| `/listings?order_by=rating_average&order_dir=desc` | Top rated | `order_by=rating_average&order_dir=desc` | Hidden |

Choosing Most booked:

- sets `order_by=bookings_count_90d` and `order_dir=desc`,
- sets `page` to 1,
- keeps the scope, the keyword and the filters.

### Files to modify (Web)

- `app/domains/catalog-listing/catalog-listing-constant.js`: add `MOST_BOOKED` to `CATALOG_LISTING_DISCOVER_SORT_PRESET`, its label to `CATALOG_LISTING_DISCOVER_SORT_PRESET_LABELS`, and `BOOKINGS_COUNT_90D: 'bookings_count_90d'` to `CATALOG_LISTING_DISCOVER_ORDER_BY`.
  - Add `SORT_NOTE_MOST_BOOKED` to `CATALOG_LISTING_DISCOVER_TOOLBAR_COPY`.
- `app/domains/catalog-listing/catalog-listing-service.js`: add the Most booked branch to `resolveDiscoverSortPresetFromQuery` and `buildDiscoverSortSearchParams`.
  - In the query-to-filters code (near `isOrderDirAllowed`), the new key passes `ORDER_BY_VALUES` without change.
  - Check that `order_dir=asc` is dropped for it.
- `app/domains/catalog-listing/catalog-listing-discover-sort-control.jsx`: add the preset to `DISCOVER_SORT_PRESET_ORDER`, last.
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx`: show the note below the toolbar row while the preset is Most booked.
- `app/api/marketplace-catalog-listings-api.js`: update the JSDoc for `filters.order_by` and `filters.order_dir`.

### Spec files to modify (Web)

- `catalog-listing-discover-sort-control.spec.jsx`: change the order test to Recently added, Price: low to high, Top rated, Most booked.
  - Remove `not.toContain('Most booked')`.
  - Add one render test and one interaction test, copied from the Top rated tests.
- `catalog-listing-service.spec.js`: add cases for both service functions, including `order_dir=asc`.
- `catalog-listing-discover-toolbar.spec.jsx`: add a case for the note, shown and hidden.
- `marketplace-catalog-listing-list-page.spec.js`: add a case that forwards `order_by=bookings_count_90d&order_dir=desc`.

## Data / domain touchpoints

- Bounded context: CAT, read through the API.
- Transaction boundaries: none.
- Snapshots: none.
- The count refreshes once a night (api-215).
  - Until `Catalog::Listings::RefreshBookingCountsSweepJob` runs after deploy, every listing has count 0.
  - The order then falls back to `published_at DESC`.

## Known limits

- The order lags behind real bookings by up to one day.
- Before the first sweep, Most booked looks the same as Recently added.
- The `order_dir=asc` case shows Recently added in the select, but the list follows Most booked.
  - This is an edge case from a hand-edited URL.

## Out of scope

- Any change to the API.
- A tie break in the web.
- A live count update after a new booking.
- Showing the booking count on the listing card or the detail page.
- Other sort presets.
- `aria-describedby` between the select and the note.
  - `SortSelect` does not support it.
  - Add it when the component changes.

## Tasks

### Planning

- [x] Create the web issue: red-cab-web#185.
- [x] Get this spec to `status: approved`.

### Web

- [ ] Add the preset, its label, the order key and the note copy to the constants.
- [ ] Map the preset to and from the URL params in the service.
- [ ] Show the preset last in the sort control.
- [ ] Show the note in the toolbar.
- [ ] Update the JSDoc in `marketplace-catalog-listings-api.js`.
- [ ] Update and add the spec cases.

### Docs

- [ ] Set spec `status: implemented` after merge.
- [ ] Update redcab-docs#67: check the Release 5 task and step 7.
- [ ] After deploy, run `Catalog::Listings::RefreshBookingCountsSweepJob` once.

## Acceptance criteria

- [ ] The select shows Recently added, Price: low to high, Top rated and Most booked, in this order.
- [ ] Choosing Most booked sets `order_by=bookings_count_90d` and `order_dir=desc`, and sets `page` to 1.
- [ ] Choosing Most booked keeps the scope, the keyword and the filters.
- [ ] The URL with `order_by=bookings_count_90d`, with or without `order_dir=desc`, selects Most booked.
- [ ] The URL with `order_dir=asc` does not select Most booked, and the web does not send `asc` to the API.
- [ ] The list page forwards `order_by=bookings_count_90d` to the API.
- [ ] The note shows only while Most booked is selected.
- [ ] A URL with this sort is still noindex.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.
- [ ] No client-side sort and no client-side tie break.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm test
npm run build
```

- Run the `review-react-style` skill by hand on the pull request.
- Open `/listings` in a dev build, choose Most booked, and check the request in the network panel.
- The pull request lists what it did not check.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-29 | Owner | Approved. |
