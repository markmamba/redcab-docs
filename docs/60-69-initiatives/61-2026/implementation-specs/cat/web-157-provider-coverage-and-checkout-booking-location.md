---
title: "Add the provider pickup coverage form and the checkout booking location"
sidebar_label: Web · Coverage and booking location
issue: "https://github.com/markmamba/red-cab-web/issues/157"
repos:
  - red-cab-web
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#pickup-coverage-registration"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#pickup-coverage-validation-timing"
  - "docs/30-49-domains/38-catalog/requirements/tourist-booking.md"
  - "docs/30-49-domains/38-catalog/requirements/provider-listings.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-213-pickup-coverage-and-discoverable-gate.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-214-booking-location-and-charge-reversal.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-240-booking-location-search.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-154-provider-listing-destinations.md"
---

## TL;DR

- Ships a "Pickup coverage" tab on the provider listing, with a searchable picker for prefectures, cities and wards.
- Ships one booking location search in tourist checkout, in place of the two address fields.
- Ships a "Pickup details" text field, because the API still needs `pickup_address`.
- Ships clear messages for a location that the listing does not cover, before and after payment.
- Needs ONE new API item first: the payloads return the booking location name (decision 4).
- Does NOT ship the Terms of Use checkbox, corporate checkout, map-drawn coverage or the Publish button.
- Breaking change: No. The web already fails on checkout create, because the API needs `booking_location_id`.

## Problem

A provider cannot register pickup coverage, so every listing that has none is hidden by the discoverable gate.

The tourist checkout form sends `pickup_address` and `dropoff_address`, and it sends no `booking_location_id`.

The API rejects every checkout create without `booking_location_id` (spec api-214).

Evidence:

- `app/domains/bookings-checkout-session/bookings-checkout-session-fulfillment-form.jsx` (two address fields)
- `app/domains/bookings-checkout-session/bookings-checkout-session-service.js` (`buildCreatePayload` has no location)
- `app/routes/tourist/tourist-checkout-page.jsx` (`handlePolicyContinue` treats every 422 as a lost hold)
- `app/routes/provider/provider-catalog-listings-layout.jsx` (tabs: Details and Packages only)
- Issue #157

Known gap outside this spec: checkout create also needs `is_terms_of_use_accepted` and `terms_version` (API PR #120).

The web sends neither field, so checkout still fails after this spec ships, until a separate terms issue ships.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| booking location | The one place the tourist gives at checkout. It is the pickup and the default drop-off. |
| pickup coverage | The places where the provider picks up tourists, kept as rows of `catalog_listing_pickup_coverages`. |
| coverage place | A prefecture, a city or a ward in a coverage row. |
| pickup details | The street detail text, such as a hotel name. The API stores it as `pickup_address`. |
| nested place | A place whose `path` equals another selected place, or starts with that path plus `/`. |

## User stories

1. US-1: As a provider, I want to set pickup coverage, so tourists book only where I drive.
2. US-2: As a provider, I want to see which profile prefectures were skipped, so I can add them by hand.
3. US-3: As a tourist, I want to give one booking location, so the driver knows where to meet me.
4. US-4: As a tourist, I want a message when my location is not covered, so I can pick another place.
5. US-5: As a tourist, I want a message when a check fails after payment, so I know my payment status.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Pickup coverage registration](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-registration) | Coverage is a prefecture, a city or a ward. No nested rows. A draft may have none. |
| Ruling | [Pickup coverage validation timing](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-validation-timing) | The tourist searches for one booking location and picks a city or a ward. |
| Requirements | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | One booking location. Clear messages. A failed check after payment reverses the charge. |
| Requirements | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | Pre-fill from the profile. A listing with no coverage is hidden. |
| Spec | [api-213](./api-213-pickup-coverage-and-discoverable-gate.md) | Coverage endpoints, error text and the nested rule. Merged. |
| Spec | [api-214](./api-214-booking-location-and-charge-reversal.md) | `booking_location_id`, the three checks and the reversal. Merged. |
| Spec | [api-240](./api-240-booking-location-search.md) | The booking location search. Merged. |
| Spec | [web-154](./web-154-provider-listing-destinations.md) | The combobox pattern, the keys and the ARIA roles that decisions 7 and 8 reuse. |
| Web | `red-cab-web/AGENTS.md`, `app/domains/AGENTS.md` | API calls only in loaders, handlers and select-search fields. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. The Terms of Use checkbox is not in this spec. A separate issue covers it. Checkout stays blocked until that issue ships.** | Add the checkbox here. | This spec stays on the location. The terms text and version need their own decision. |
| 2 | **Owner ruling, 2026-10-26. The checkout form has one required booking location search and one required text field "Pickup details". It has no drop-off field. The web sends `pickup_address` and leaves out `dropoff_address`, and the API copies the pickup text.** | Location search only. | The driver needs the street detail. Another drop-off is agreed outside RedCab. |
| 3 | **Owner ruling, 2026-10-26. The coverage picker takes prefectures from `GET /providers/catalog/regions` and cities and wards from `GET /marketplace/catalog/booking_locations`. No new endpoint is needed for the picker.** | A new provider search endpoint. | The web can ship at once. A city that is not listable cannot be picked, so the provider picks its wards. |
| 4 | **Owner ruling, 2026-10-26. A small API item adds `booking_location` to the checkout session and booking payloads. It holds `uuid`, `name_en`, `name_ja`, `parent` and `prefecture`. The web code that shows the name waits for it.** | The web keeps the pick in state. | The edit step, the review step and the booking page need a name. The payloads return only `booking_location_id` today. |
| 5 | **Added point, please review. Coverage has its own tab "Pickup coverage" on the listing layout, at the route `coverage` under `catalog/listings/:listingId`.** | A section in the create form. | The API has its own endpoint for coverage (api-213 decision 1). A listing exists before the provider can edit its coverage. |
| 6 | **Added point, please review. The tab loader calls `GET /providers/catalog/listings/:listing_id/pickup_coverages` and `GET /providers/catalog/regions`. The picker gets both as props.** | Fetch inside the field. | The loader is the preferred place for API calls. |
| 7 | **Added point, please review. The picker is a searchable multi-select with chips. It follows the keys, the ARIA roles and the live announcements of web-154 decisions 14 to 18. It has two groups: "Prefectures" from the loaded list, and "Cities and wards" from the search.** | One list for all levels. | The levels have two data sources. Groups keep the list clear. |
| 8 | **Added point, please review. The search for cities and wards starts after 2 typed characters and a pause of 300 ms. It ignores a response that is not for the latest text. The input allows 50 characters.** | A request for each key press. | The API answers 422 for text under 2 or over 50 characters. The client never sends such text. |
| 9 | **Added point, please review. The picker blocks a nested place. A place inside a selected place is disabled with the hint "Already covered by {name}". Picking a place that contains selected places removes those chips.** | Show the API error after save. | The user cannot reach a state that the API rejects. The check reads `path`, as the API does. |
| 10 | **Added point, please review. A prefecture `path` is the region `slug`, a slash and the prefecture `slug`. The regions list gives both slugs.** | Ask the API for `path`. | The list already holds the data. A test pins the rule against a real API row. |
| 11 | **Added point, please review. "Save coverage" sends `PUT` with `geography_ids`. It always sends the list, also `[]`. After a save, the form shows the rows of the response.** | Send changes only. | `PUT` replaces the whole list (api-213 decision 1). |
| 12 | **Added point, please review. The API error text for `geography_ids` shows under the picker. The `PUT` request keeps no `removeObjectEmptyAttributes` call.** | A toast. | `setApiErrorsToFormFields` sets the text on the field of the same name. An empty array must reach the API. |
| 13 | **Added point, please review. When the saved list is empty, the tab shows the warning "Tourists cannot see this listing until it has pickup coverage."** | No warning. | The discoverable gate hides the listing. The provider needs to know why. |
| 14 | **Added point, please review. After listing create, the toast names the labels in `skipped_prefectures` when the list is not empty. It points to the Pickup coverage tab.** | Show nothing. | The API returns the labels for this use (api-213 decision 3). |
| 15 | **Added point, please review. The booking location field is one select-search component. The tourist types, picks one result, and the form stores `booking_location_id`. The picked object stays in the form as `booking_location`, and the web does not send it.** | A plain select. | The list has about 2,000 places. The tourist needs search. |
| 16 | **Added point, please review. Each result shows the place with its parent and prefecture, such as "Nishi, Yokohama, Kanagawa". The text follows the language of the account, through `CatalogListingService.getLocalizedLabel`.** | Show only the place name. | 13 ward names repeat across cities (api-240). |
| 17 | **Added point, please review. The field uses the search rules of decision 8, and it shows "No place found." when the result is empty.** | No message. | The tourist needs to know the search ended. |
| 18 | **Added point, please review. A 422 from checkout create with the key `booking_location_id` sets the field error and returns the tourist to the trip details step. Other 422 errors keep today's hold handling.** | Treat every 422 as a lost hold. | `handlePolicyContinue` shows "This time is no longer available" for a location error. That text is wrong. |
| 19 | **Added point, please review. A 422 from the payment attempt that is not a lost hold shows the API message from `base`. The "Edit trip details" button of the payment step stays as it is.** | Match the message text. | The API sends the coverage message under `base`, with no stable code. The page showed only the generic title, and the button already exists. |
| 20 | **Added point, please review. When the poll after payment ends with the session `expired`, the return page shows the new text "We could not finish your booking. If we took a payment, we return it." It still shows the links back to checkout and to My bookings.** | Keep "Your checkout session expired before payment completed." | The session `expired` also means a reversal (api-214 decision 18). The old text is wrong after a charge. |
| 21 | **Added point, please review. The text of decision 20 is a new key in `tourist-surface-copy.js`, with an English and a Japanese value. The owner or a translator checks the Japanese text before the code PR merges.** | English only. | The tourist surfaces are EN and JA (OPR-9). |
| 22 | **Added point, please review. The booking detail pages show "Booking location" and "Pickup details". They show "Dropoff Address" only when it differs from the pickup text.** | Keep both address rows. | The API copies the pickup text, so both rows would repeat. Old bookings keep a real drop-off. |
| 23 | **Added point, please review. The order summary in checkout shows the booking location name when the session has one.** | No change. | The issue asks for the review step to show the location. |
| 24 | **Added point, please review. The form default for `booking_location_id` is an empty string. `fulfillmentMatchesSession` compares `booking_location_id` and `pickup_address`, and it ignores `dropoff_address`.** | Compare all address fields. | The API fills `dropoff_address`, so a compare with it never matches. |

## API contract

_The web item needs one new API field, and the API spec fixes its final shape._

New API item (must merge first):

| Method | Path | Auth | Change | Notes |
| --- | --- | --- | --- | --- |
| GET | `/tourists/bookings/checkout_sessions/:id` | JWT tourist | Adds `fulfillment_detail.booking_location`: `{ uuid, name_en, name_ja, parent, prefecture }` | `parent` and `prefecture` have `uuid`, `name_en`, `name_ja`. |
| GET | `/tourists/bookings/bookings/:id` and the provider booking show | JWT tourist or provider | Same field | Read from the order copy. |
| POST | `/tourists/bookings/checkout_sessions` | JWT tourist | Response carries the same field | |

Existing endpoints that the web uses (no change):

| Method | Path | Fields |
| --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id/pickup_coverages` | Response `pickup_coverages`: `{ uuid, geography_id, name_en, name_ja, level, path }` |
| PUT | `/providers/catalog/listings/:listing_id/pickup_coverages` | Request `geography_ids`. An empty list clears the rows. |
| POST | `/providers/catalog/listings` | Response adds `skipped_prefectures` |
| GET | `/providers/catalog/regions` | Regions with prefectures |
| GET | `/marketplace/catalog/booking_locations` | Request `search_text`. Response `booking_locations`, at most 10. |
| POST | `/tourists/bookings/checkout_sessions` | Request adds `booking_location_id`. `dropoff_address` is optional. |

API error text the picker shows (field `geography_ids`):

- "Please send the list of pickup coverage places."
- "Please select valid pickup coverage places."
- "Please select active pickup coverage places."
- "Pickup coverage must be a prefecture, a city or a ward."
- "Please list each pickup coverage place only once."
- "A pickup coverage place cannot be inside another selected place."

API error text the booking location field shows (field `booking_location_id`):

- "Please choose a booking location."
- "We could not find that booking location, so please choose another."
- "Please choose a city or a ward as booking location."
- "This listing has no pickup coverage now, so it cannot be booked."
- "This provider does not pick up tourists at that location, so please choose a covered location."

## Web contract

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Provider | `/providers/catalog/listings/:listingId/coverage` (new tab) | `clientLoader` fetches coverage and regions | `providers-catalog-listing-pickup-coverages-api.js` (new), `providers-catalog-regions-api.js` | `provider-required-policy` (existing) |
| Tourist | `/account/checkout` (existing checkout page) | Unchanged | `marketplace-catalog-booking-locations-api.js` (new), called by the select-search field | `tourist-required-policy` (existing) |

Check the real route paths in `provider.routes.js` and the checkout route constants when coding.

### Files to create or modify (Web)

- `app/api/providers-catalog-listing-pickup-coverages-api.js` (new): `index` and `replace`, with JSDoc and the `*_PATH` constant.
- `app/api/marketplace-catalog-booking-locations-api.js` (new): `index`.
- `app/api/tourists-bookings-checkout-sessions-api.js`: send `booking_location_id`, and stop sending `dropoff_address`.
- `app/domains/catalog-listing-pickup-coverage/catalog-listing-pickup-coverage-field.jsx` (new): the picker (decisions 7 to 9).
- `app/domains/catalog-listing-pickup-coverage/catalog-listing-pickup-coverage-form.jsx` (new): the form and the Save button.
- `app/domains/catalog-listing-pickup-coverage/catalog-listing-pickup-coverage-schema.js` (new)
- `app/domains/catalog-listing-pickup-coverage/catalog-listing-pickup-coverage-service.js` (new): nested rule, prefecture `path`, option lists, payload.
- `app/routes/provider/provider-catalog-listings-coverage-page.jsx` (new)
- `app/routes/provider/provider-catalog-listings-layout.jsx`: add the tab.
- `app/provider.routes.js` and `app/domains/catalog-listing/catalog-listing-constant.js`: the route and `PROVIDER_CATALOG_LISTINGS_PATHS.coverage`.
- `app/routes/provider/provider-catalog-listings-create-page.jsx` and `catalog-listing-service.js` (`buildCreatedToast`): the toast with `skipped_prefectures`.
- `app/domains/catalog-geography/catalog-booking-location-select-field.jsx` (new): the select-search field (decisions 15 to 17).
- `app/domains/catalog-geography/use-catalog-booking-location-search.js` (new): the pause, the 2 to 50 character rule and the stale response rule.
  - Both search fields use it.
  - The field passes the API call in, so the hook makes no API call.
- `app/domains/bookings-checkout-session/bookings-checkout-session-fulfillment-form.jsx`, `-schema.js`, `-service.js` (decisions 2, 15 and 24)
- `app/domains/bookings-checkout-session/bookings-checkout-session-order-summary-view.jsx` (decision 23)
- `app/routes/tourist/tourist-checkout-page.jsx` (decisions 18 and 19)
- `app/routes/tourist/tourist-checkout-return-page.jsx` and `bookings-checkout-session-payment-service.js` (decision 20)
- `app/domains/tourist/tourist-surface-copy.js` (decision 21)
- `app/domains/bookings-booking/bookings-booking-tourist-detail-view.jsx`, `bookings-booking-provider-detail-view.jsx` and `bookings-booking-service.js` (`isDropoffShown`) (decision 22)

Skills to use when coding: `creating-api-clients`, `creating-domain-forms`, `creating-domain-views`, `creating-route-pages`, then `review-react-style`.

## Data / domain touchpoints

- Bounded context: CAT owns coverage and the location search, and BKG owns the checkout and the booking.
- Transaction boundaries: none on the web.
  - The `PUT` replaces all rows in one API transaction.
- Snapshots: the API writes the order copy of the location at materialization.
- Price: the web sends no price, and no price logic changes.

## Worked example

A provider covers Tokyo, and a tourist books a trip with a pickup at a hotel in Shinjuku.

1. The provider opens the Pickup coverage tab, which shows the row "Tokyo" filled from the profile.
2. The provider types "Yokohama Nishi" and picks "Nishi, Yokohama, Kanagawa", and the picker adds a chip.
3. The provider tries "Shinjuku", and the option is disabled with the hint "Already covered by Tokyo".
4. The provider saves, and the API answers with two rows.
5. The tourist types "Shinjuku" in the booking location field and picks "Shinjuku, Tokyo".
6. The tourist types "Hotel Gracery, 1-19-1 Kabukicho" in the pickup details and continues.
7. The API checks coverage and the check passes, so the tourist pays.
8. The booking page shows "Shinjuku, Tokyo" as booking location and the hotel text as pickup details.

## Out of scope

- The Terms of Use checkbox and the terms version (decision 1).
- The Publish button for draft listings (red-cab-web#176).
- Corporate checkout.
- Map-drawn and street-address coverage.
- Coverage for a city that is not listable, except through its wards (decision 3).
- Fixes for the English names in the geography seed (red-cab-api#244).
- A request limit on the location search.
- A browser check of the layout, because the tests run in `jsdom` only.

## Tasks

### API (separate item, must merge first)

- [ ] Create the API issue for `booking_location` in the checkout session and booking payloads, and get its spec approved.
- [ ] Merge the API change.

### Web

- [ ] Add the two API clients and their specs.
- [ ] Add the coverage service and its spec: nested rule, prefecture `path`, option lists and payload.
- [ ] Add the coverage picker and its `jsdom` interaction tests.
- [ ] Add the coverage form, the schema and the page, and add the tab and the route.
- [ ] Show `skipped_prefectures` in the create toast.
- [ ] Add the booking location select field and its tests.
- [ ] Update the checkout schema, the form, the service and the order summary, and their specs.
- [ ] Update the checkout page for the 422 cases of decisions 18 and 19.
- [ ] Update the return page, the payment service and the copy file.
- [ ] Update the two booking detail views.
- [ ] Run `review-react-style`, `npm run lint`, `npm run test` and `npm run build`.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A provider can save coverage with a prefecture and a ward.
- [ ] The picker offers every active prefecture and the cities and wards that the search finds.
- [ ] The picker blocks a place inside a selected place, and picking a containing place removes the inner chips.
- [ ] An empty list is sent as `[]` and clears the rows.
- [ ] The API error text shows under the picker.
- [ ] The tab warns when the saved list is empty.
- [ ] The create toast names each skipped prefecture.
- [ ] The picker works with the keyboard only, and it has the roles of web-154 decision 14.
- [ ] The search starts after 2 characters and ignores an old response.
- [ ] The checkout form has no drop-off field and sends `booking_location_id` and `pickup_address`.
- [ ] A location outside coverage shows the API message on the field and returns the tourist to the trip details step.
- [ ] A location error never shows the text "This time is no longer available".
- [ ] A coverage failure at the payment attempt shows the message and the "Edit trip details" button.
- [ ] After a reversal, the return page shows the text of decision 20.
- [ ] The booking pages show the booking location and the pickup details.
- [ ] The edit step in checkout shows the picked location again.
- [ ] Test: both API clients, the coverage service and the picker.
- [ ] Test: the booking location field, the checkout schema, service and payload.
- [ ] Test: the return page text.
- [ ] No client-side price computation.
- [ ] No hardcoded currency, locale or timezone.
- [ ] Text follows ASD-STE100 Tier A.

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
| 2026-10-26 | owner | Approved in chat. Owner ruled on decisions 1 to 4 and approved the added points 5 to 24. `review-implementation-spec` was not run. |
