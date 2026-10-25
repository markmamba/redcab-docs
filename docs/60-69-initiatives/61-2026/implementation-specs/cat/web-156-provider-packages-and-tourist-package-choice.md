---
title: "Add the provider package screens and the tourist package choice"
sidebar_label: Web · Packages and filters
issue: "https://github.com/markmamba/red-cab-web/issues/156"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-155-asset-holds-web.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-211-many-packages-and-display-prices.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-212-package-aware-filters-and-price-sort.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-196-vehicle-category-reference-table.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-231-listing-detail-packages.md"
---

## TL;DR

- Ships a Packages tab on the provider listing, with a list, a form and an archive step.
- Ships the tourist package choice on the listing page, with the new `package_slug` URL param.
- Ships the vehicle type and price range filters, the sort Price: low to high, and the filter chips for them.
- Loads the vehicle categories from the API, and drops the hard-coded codes (red-cab-web#141).
- Removes the old price, capacity and vehicle fields from the listing form (red-cab-web#127), after red-cab-api#211 PR 2.
- Ships in four pull requests, A to D.
- Does NOT add pickup coverage or the booking location (release 4).
- Does NOT add a price slider, the Most booked sort or seasonal prices.
- Breaking change: No, because the listing page URL only gains an optional param.

## Problem

A provider can offer only one package for each listing, and the listing form holds its price and capacity.

A provider cannot create, change or archive several packages.

A tourist sees one price and one choice, because the listing page reads only the first package (`CatalogListingService.firstPackage`).

A tourist cannot filter by vehicle type or price, and cannot sort by price.

The web repeats the seven old vehicle codes and their labels, and the API now returns six new categories.

Evidence: `app/domains/catalog-listing/catalog-listing-form.jsx`, `catalog-listing-service.js`, `catalog-listing-booking-panel-view.jsx`, `catalog-listing-discover-filter-form.jsx`, `catalog-listing-constant.js`, issue #156.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy) | At most 5 packages, and checkout takes `package_slug` |
| Ruling | [Starting price and price filter](/docs/30-49-domains/catalog/catalog-decisions/#starting-price-and-price-filter) | The card price and the packages inside the range |
| Ruling | [Marketplace filter combination](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-filter-combination) | OR in a category, AND across categories |
| Ruling | [Vehicle category reference data](/docs/30-49-domains/catalog/catalog-decisions/#vehicle-category-reference-data) | The categories come from the API |
| Requirements | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | Filters, sort and the "inside the range" mark |
| Requirements | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | The package fields and the pool rule |
| Spec | api-211, api-212, api-196, api-231 | The API contract that the web calls |
| Spec | web-155 | The picker and checkout that this spec extends |
| Convention | `red-cab-web/AGENTS.md`, `app/routes/AGENTS.md`, `app/domains/AGENTS.md` | Web rules |
| Rule | `PRC-1` in [Invariants](/docs/70-79-business/business-rules/invariants) | The client never computes a price |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. One spec covers red-cab-web#156, #141 and #127. The work ships in four PRs: A provider screens, B tourist choice, C filters and sort, D listing form cleanup.** | Five PRs, or three PRs. | The parts share files and the API contract. |
| 2 | **Owner ruling, 2026-10-26. The listing form keeps its old fields until red-cab-api#211 PR 2 lands. PR D removes them.** | Make the API fields optional first. Hide the fields now. | It avoids a circular wait between the API and the web. |
| 3 | **Owner ruling, 2026-10-26. A listing card link keeps `min_price`, `max_price` and `passenger_count`.** | Keep only the group size. | The listing page needs the range to mark the packages inside it. |
| 4 | **Owner ruling, 2026-10-26. Packages live in a "Packages" tab on the provider listing, like the asset tabs.** | A card on the detail page. A separate page. | It follows a pattern that providers know, and release 4 adds a Coverage tab. |
| 5 | **Owner ruling, 2026-10-26. The pool picker is a checkbox list of the provider's assets. An asset that does not fit is disabled and shows the reason.** | A searchable multi-select. | A provider has few assets, and the reason helps. |
| 6 | **Owner ruling, 2026-10-26. The tourist chooses a package with option cards above the calendar.** | A dropdown. Tabs. | All options, prices and limits are visible at once. |
| 7 | **Owner ruling, 2026-10-26. A card shows the stored `display_price_jpy` with the label per vehicle or per person.** | A quote for each card. | The client never adds or multiplies a price. |
| 8 | **Owner ruling, 2026-10-26. The filter panel gets a Vehicle type section (pills from the API) and a Price section with a minimum box and a maximum box.** | Price presets. A slider. | Presets need fixed amounts and a currency in the client. A slider needs bounds that the API does not return. |
| 9 | **Owner ruling, 2026-10-26. The sort control gets a third option, Price: low to high.** | A separate control. | The API sort is `order_by=starting_price_jpy`. |
| 10 | **Owner ruling, 2026-10-26. When `meta.is_price_filter_ignored` is true, a message above the results says the range was not used.** | A silent ignore. | The requirement asks for a message. |
| 11 | **Owner ruling, 2026-10-26. The chips of the applied filters gain one chip for each vehicle type and one for the price range.** | No chips. | The toolbar already shows chips for the other filters. |
| 12 | **Owner ruling, 2026-10-26. A provider archives a package with a button and a confirm step.** | Archive with no confirm. | Archive is final in the API. |
| 13 | **Owner ruling. A listing has at most 5 packages that are not archived.** | No limit. | The Catalog decisions page sets the limit. |
| 14 | **Owner ruling. The provider pages stay English. Tourist pages show Japanese only to a logged-in account with a Japanese preference.** | Show Japanese by browser language. | An earlier ruling. |
| 15 | **Added point, please review. The provider listing gets a layout route with the tabs Details and Packages. The Details tab is the existing show page. The Packages tab is the list.** | Separate pages. | It copies `provider-catalog-assets-edit-layout.jsx`. The layout loads the listing once. |
| 16 | **Added point, please review. The routes are `catalog/listings/:listingId/packages`, `…/packages/create` and `…/packages/:packageId/edit`.** | A modal form. | Each step has its own URL, so the back button works. |
| 17 | **Added point, please review. The Add package button is disabled at 5 packages, with the note "A listing can have up to 5 packages. Archive one to add another."** | Let the API reject the sixth. | The provider learns the limit before the form. |
| 18 | **Added point, please review. The package form has these fields: name in English and Japanese, vehicle category, passenger limit, price, type (full day or timed), length in minutes, first and last start time, step, buffer for timed, status, and the pool.** | Fewer fields. | They are the fields of the API contract. |
| 19 | **Added point, please review. The buffer field shows only for a timed package.** | Always show it. | The API ignores it for a full-day package. |
| 20 | **Added point, please review. The status field offers Active and Inactive. Archived is not a choice in the form.** | Show Archived. | Archive is its own step (decision 12). |
| 21 | **Added point, please review. The vehicle category list comes from `GET /providers/catalog/vehicle_categories`, loaded in the page loader.** | A hard-coded list. | Red-cab-api#196 returns only the kinds that the provider type may use. |
| 22 | **Added point, please review. In the pool picker the client disables an asset when its category differs, when it is retired, or when its seats are below the passenger limit. The API still checks every rule.** | Send the pool and show the API errors. | The client only guides the provider. A seat count is not a price. |
| 23 | **Added point, please review. The asset form and the listing form load the categories from the API, and the hard-coded codes and labels are removed (red-cab-web#141).** | Keep the constants as a fallback. | The issue asks to remove the duplicates. |
| 24 | **Added point, please review. The tourist pages load the public category list, and show the category name in English or Japanese by the language preference.** | Show the code. | The package cards and the highlights need a name. |
| 25 | **Added point, please review. The listing page keeps the chosen package in the URL param `package_slug`. With no param, the page uses the first package and does not write the param until the tourist chooses.** | Always write the param. | An old link keeps working. |
| 26 | **Added point, please review. A change of package clears `service_date` and `start_time`, because the open days differ for each package.** | Keep them. | The picker loads the open days for the chosen package. |
| 27 | **Added point, please review. A change of package that has a lower passenger limit sets the passenger count to the limit and shows a short note.** | Block the change. | The server still checks the limit. |
| 28 | **Added point, please review. A card whose limit is below the group size is dimmed, with the text "Too small for N people", and the tourist can still choose it.** | Disable it. | The tourist may want to change the group size. |
| 29 | **Added point, please review. The Book link and the checkout link use the chosen package slug.** | Use the first package. | Checkout takes `package_slug`. |
| 30 | **Added point, please review. The order summary shows the package name from the checkout session.** | No name. | The API returns `package_name` already. |
| 31 | **Added point, please review. The filter form blocks a minimum above the maximum with a message. The result message of decision 10 covers an old link.** | Only the result message. | The tourist sees the problem before Apply. |
| 32 | **Added point, please review. The price boxes take whole numbers of 0 or more. The currency symbol comes from the shared formatter, not from a hard-coded value.** | A symbol in the label. | No hard-coded currency. |
| 33 | **Added point, please review. The vehicle types go to the API as `vehicle_type` with comma-separated codes, and the price as `min_price` and `max_price`.** | Repeated params. | The naming page defines them. |
| 34 | **Added point, please review. PR D sends the provider to the Packages tab after a listing is created.** | Stay on the listing page. | After the old fields go, a new listing has no package. |
| 35 | **Added point, please review. Red-cab-web#127 closes with PR D, because the price moves to the packages and the policy fields stay in the listing form. The issues close only on the owner's say-so.** | Close it now. | No separate pricing screen exists today. |
| 36 | **Added point, please review. The new API modules have unit specs, and the pages have render specs. No browser check runs for the layouts.** | A browser check. | The known limit is kept and reported. |

## Web contract

### Provider surface

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Listing layout | `/providers/catalog/listings/:listingId` | Listing, regions, profile | `providersCatalogListingsApi` | Tabs: Details and Packages |
| Packages list | `…/packages` | Packages, assets | `providersCatalogListingPackagesApi` | Add package and Edit links |
| Package create | `…/packages/create` | Categories, assets | `providersCatalogVehicleCategoriesApi` | Form with the pool |
| Package edit | `…/packages/:packageId/edit` | Package, categories, assets | same | Form and the Archive step |

### Tourist surface

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Listing page | `/listings/:listingSlug` | Listing with `package_slug`, `passenger_count`, `min_price`, `max_price`, and the categories | `marketplaceCatalogListingsApi`, `marketplaceCatalogVehicleCategoriesApi` | Option cards, picker, summary |
| Listing pages | `/listings` and the scope pages | Listings with the new filters, and the categories | same | Filters, sort, chips, message |

### URL params

| Page | Param | Meaning |
| --- | --- | --- |
| Listing page | `package_slug` | The chosen package |
| Listing page | `min_price`, `max_price` | The range, for the mark on the packages |
| Listing pages | `vehicle_type` | Comma-separated category codes |
| Listing pages | `min_price`, `max_price` | The price range |
| Listing pages | `order_by=starting_price_jpy`, `order_dir=asc` | Price: low to high |
| Checkout | `package_slug` | Already in the URL since web-155 |

### Files to create or modify (Web)

PR A, provider screens and categories:

- `app/api/providers-catalog-listing-packages-api.js`, `providers-catalog-vehicle-categories-api.js` and `marketplace-catalog-vehicle-categories-api.js`, with specs.
- `app/domains/catalog-listing-package/`: constant, schema, form, list view, pool field and service.
- `app/domains/catalog-vehicle-category/catalog-vehicle-category-service.js`: options and names from the API payload.
- `app/routes/provider/provider-catalog-listings-layout.jsx` and the three package pages.
- `app/routes/provider/provider-catalog-listings-show-page.jsx`: read the listing from the outlet context.
- `app/provider.routes.js`.
- The asset form, service and constants, and the listing form: categories from the API (#141).

PR B, tourist choice:

- `app/domains/catalog-listing/catalog-listing-package-choice-view.jsx`, new.
- `catalog-listing-booking-panel-view.jsx`, `catalog-listing-service.js` and `catalog-listing-picker-service.js`.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.jsx`.
- `app/api/marketplace-catalog-listings-api.js`: forward `package_slug`, `min_price` and `max_price`.
- `app/domains/bookings-checkout-session/`: package name in the summary, if it is not shown now.
- The listing card link, to keep the params of decision 3.

PR C, filters and sort:

- `catalog-listing-discover-filter-schema.js`, `catalog-listing-discover-filter-form.jsx`, `catalog-listing-discover-sort-control.jsx`, `catalog-listing-discover-toolbar.jsx` and `catalog-listing-constant.js`.
- `catalog-listing-service.js`: params, chips and the sort preset.
- A small view for the ignored-range message.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-list-page.jsx`.

PR D, listing form cleanup:

- `catalog-listing-form.jsx`, `catalog-listing-schema.js`, `catalog-listing-service.js`, `app/api/providers-catalog-listings-api.js` and the create page.
- Remove `base_price_jpy`, `base_capacity`, `vehicle_category` and `primary_provider_asset` from the form and the payload.

## Data / domain touchpoints

- Bounded context: CAT.
- The web reads packages, categories and display prices, and it computes no price.
- The pool eligibility hints are guides only, and the API decides.
- Booking snapshots do not change, and checkout keeps taking `package_slug`.

## Out of scope

- Pickup coverage and the booking location (release 4).
- A price slider, price presets and a price histogram.
- The Most booked sort (red-cab-api#215).
- Seasonal prices and price tiers.
- The provider onboarding `vehicle_types` list.
- A browser check of the layouts.

## Tasks

### Web, PR A

- [ ] Add the three API modules with specs.
- [ ] Add the listing layout route with the Details and Packages tabs.
- [ ] Add the package list page, with the limit note and the Add package button.
- [ ] Add the package form, the schema and the pool field.
- [ ] Add the edit page and the archive step.
- [ ] Load the categories from the API in the asset form and the listing form.
- [ ] Remove the hard-coded category codes and labels.

### Web, PR B

- [ ] Add the package choice view.
- [ ] Put `package_slug` in the URL, and clear the day and time on a change.
- [ ] Use the chosen package for the passenger limit, the picker, the Book link and the checkout link.
- [ ] Mark the packages inside the price range.
- [ ] Keep the filter params in the card links.

### Web, PR C

- [ ] Add the Vehicle type and Price sections to the filter form and the schema.
- [ ] Add the sort Price: low to high.
- [ ] Add the chips for the vehicle types and the price range.
- [ ] Show the message when the API ignores the range.

### Web, PR D

- [ ] Remove the old fields from the listing form, the schema, the service and the payload.
- [ ] Send the provider to the Packages tab after create.

### Docs

- [ ] Set spec `status: implemented` after PR D merges.

## Acceptance criteria

- [ ] A provider can create, change and archive packages, within the limit of 5.
- [ ] The Add package button is off at 5 packages.
- [ ] A package form lists only the categories that the provider type may use, from the API.
- [ ] The pool picker disables an asset that does not fit, and shows why.
- [ ] A tourist can choose a package, and sees its vehicle, limit, length and price.
- [ ] A change of package clears the day and time, and the open days load for the new package.
- [ ] The Book link and the checkout link carry the chosen package slug.
- [ ] The packages inside the price range are marked on the listing page.
- [ ] The vehicle type, price and group size filters change the results.
- [ ] The sort Price: low to high works, and the card keeps "From ¥X".
- [ ] A reversed range shows the message and does not filter.
- [ ] No hard-coded vehicle category code or label remains in the web.
- [ ] After PR D, the listing form has no price, capacity, vehicle category or primary asset field.
- [ ] No client-side price computation.
- [ ] No hard-coded currency or timezone.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
```

- The lint baseline is 0 errors and 5 warnings, in `reviews-provider-response-service.js` and `reviews-review-summary.jsx`.
- Run `git checkout` on those two files after `eslint --fix`.
- The test `app/components/search/filter-panel.spec.jsx` can fail on a slow runner.
- Run the job again before you suspect a change.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
