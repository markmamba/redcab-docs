---
title: "Add primary and additional destinations to the provider listing form"
sidebar_label: Web · Provider listing destinations
issue: "https://github.com/markmamba/red-cab-web/issues/154"
repos:
  - red-cab-api
  - red-cab-web
status: implemented
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#destination-structure"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-204-primary-destination-prefecture.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-205-additional-destinations.md"
---

## TL;DR

- Ships a prefecture picker for the primary destination in the provider create form.
- Ships a searchable multi-select with chips for up to 5 additional destinations. The list is grouped by region.
- The form sends `primary_geography_id` and `additional_geography_ids`. It no longer sends `area_id`.
- The provider listing page shows the primary and additional destinations.
- Needs ONE new API item first: a provider endpoint that lists ALL active prefectures, grouped by region (see decision 1).
- Does NOT ship the edit form (the edit page is a stub), pickup coverage or marketplace pages.
- Breaking change: Yes. Today the create form sends `area_id`, and the API rejects it. This item fixes that.

## Problem

The API now needs `primary_geography_id` (a prefecture UUID). It accepts `additional_geography_ids` (up to 5 prefecture UUIDs). It no longer reads `area_id` (api-204 decision 7).

The create form still sends `area_id`. Every listing create fails with a 422 error.

The district and area picker also has a second fault. It loads data from `GET /marketplace/catalog/districts`. That endpoint returns only discoverable discovery roots. A node is discoverable only when a published listing sits below it. The result has two faults:

- A prefecture with no published listing never appears. A provider cannot create the first listing in a new prefecture.
- A designated city can appear. The API rejects a designated city as a primary destination.

Evidence:

- `app/domains/catalog-listing/catalog-listing-service.js` (`buildUpdatePayload` sends `area_id`)
- `app/api/providers-catalog-listings-api.js` (`buildListingConfigurationPayload`)
- `app/domains/catalog-area/catalog-area-select-field.jsx` (calls `marketplaceCatalogDistrictsApi.index`)
- `red-cab-api` `Catalog::Districts::MarketplaceIndexManager` (`discovery_roots.active_geographies.discoverable`)
- No provider endpoint lists geographies. Only `/team/catalog/geographies` exists, and it is for admins.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | One primary prefecture. Zero or more additional prefectures. A destination never creates pickup coverage. |
| Spec | [api-204](./api-204-primary-destination-prefecture.md) | `primary_geography_id` request, rules and error text |
| Spec | [api-205](./api-205-additional-destinations.md) | `additional_geography_ids`: limit 5, omitted key keeps the list, `[]` clears it |
| Req | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | Observable provider behavior |
| Web | `red-cab-web/AGENTS.md`, `app/domains/AGENTS.md` | API calls only in loaders and handlers. Forms and views live in `app/domains/`. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Add a provider API endpoint that lists all active regions with their active prefectures. It needs its own `red-cab-api` issue, spec and PR first ([red-cab-api#223](https://github.com/markmamba/red-cab-api/issues/223)). Web code waits for it.** | Add a param to a marketplace endpoint. Or ship now with the discoverable list. | Owner ruling on 2026-10-24. The marketplace endpoints must keep INV-8 (hide empty nodes). A provider needs empty nodes. |
| 2 | **The endpoint returns regions with their prefectures. Each prefecture has `uuid`, `slug`, `name_en`, `name_ja`. There is no `listing_count`.** | A flat list. | Owner ruling on 2026-10-24. The two pickers group by region. |
| 3 | **The create page loader fetches the list once. It passes `catalogRegions` to the form as a prop. The two destination fields do not call the API.** | Each field fetches in an effect, as `CatalogAreaSelectField` does today. | One request, not two. The loader is the preferred place for API calls (`AGENTS.md`). |
| 4 | **The primary destination is a single select. Prefectures sit in `<optgroup>` blocks named by region. A region with no prefecture is skipped.** | A flat select. | Matches the grouping from decision 2. |
| 5 | **Additional destinations use a searchable multi-select (a combobox) with removable chips and an "n of 5 selected" counter. We build it with `react-bootstrap` and add no dependency.** | Checkbox groups under region headings (first draft, same day). A native `<select multiple>`. `react-select`. `react-bootstrap-typeahead`. | Owner ruling on 2026-10-24, changed after review. The list has up to 46 choices and the provider picks at most 5. Search and chips scale to this size, and a checklist does not. A native multiple select needs Ctrl-click or Cmd-click, works badly on phones and gives weak screen reader feedback. Owner chose to build the component and not add a library. |
| 6 | **At 5 selected, the other options are disabled and the list shows the hint "You can select up to 5." The primary prefecture is not offered.** | Show an error after the fact. | The user cannot reach a state the API rejects. |
| 7 | **When the provider picks a primary prefecture that is already selected as additional, the form removes its chip.** | Block the pick with an error. | The API rejects this overlap (api-205 decision 7). An automatic removal is the smaller step for the user. **Added point, please review.** |
| 8 | **Form field names are `primary_geography_id` and `additional_geography_ids`.** | Keep `area` and `district_uuid`. | `setApiErrorsToFormFields` sets each API error on the field with the same name. Matching names show the API text on the right field. |
| 9 | **The schema is built from the loaded prefecture UUIDs. The primary value must be in that list. The additional list has at most 5 items, no duplicates and no primary value.** | A static schema that only checks "not empty". | The issue says the form blocks a primary destination that is not a prefecture. The API still checks the same rules. |
| 10 | **Create sends `additional_geography_ids` only when the list is not empty.** | Always send `[]`. | An omitted key is the same as an empty list on create. |
| 11 | **`providersCatalogListingsApi.update` sends `additional_geography_ids` as given, including `[]`.** | Keep `removeObjectEmptyAttributes` on the whole payload. | `removeObjectEmptyAttributes` removes empty arrays. With it, a caller can never clear the list (api-205 decision 6). The edit page is a stub today, so no screen uses this yet. The client must be right when the edit page ships. **Added point, please review.** |
| 12 | **The provider listing page shows "Primary destination" (from `area`, which holds the prefecture) and "Additional destinations" (names found by UUID in the new endpoint list).** | Ask the API to return names for additional destinations. | Owner ruling on 2026-10-24. It needs no more API change. A UUID with no match is skipped, not shown as an ID. |
| 13 | **Delete `catalog-area-select-field.jsx` and the `catalog-area` domain folder. Keep `marketplaceCatalogDistrictsApi`, because the home page uses it.** | Keep the old file. | Nothing else uses the field after this change. |
| 14 | **The field follows the WAI-ARIA Authoring Practices pattern "combobox with listbox popup", with multiple selection. The input has `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`. The popup has `role="listbox"` and `aria-multiselectable="true"`. Each region is a `role="group"` with its name as the label. Each prefecture is a `role="option"` with `aria-selected`, and `aria-disabled` at the limit.** | A custom pattern with its own roles. | Screen readers know this pattern. A plain `<div>` list gives them nothing to announce. **Added point, please review.** |
| 15 | **The list opens on focus, on click, on typing and on the Down arrow. It stays open after a pick, so the provider can pick again. A pick clears the search text. A selected option shows a check mark, and a click on it removes it.** | Close the list after each pick. Hide selected options. | This is the common multi-select behavior. Closing after each pick costs one extra click for each destination. **Added point, please review.** |
| 16 | **Keys: Down and Up move the active option and skip disabled ones. Home and End go to the first and last option. Enter picks or removes the active option. Escape closes the list. Backspace on an empty input removes the last chip. Tab leaves the field.** | Mouse and touch only. | Keyboard use is required for accessibility. **Added point, please review.** |
| 17 | **Search is a case-insensitive "contains" match on `name_en` and `name_ja`, after trimming spaces. A region with no match is hidden. When nothing matches, the list shows "No destination found." in a status element.** | Match the English name only. | A provider may type in English or in Japanese. **Added point, please review.** |
| 18 | **Each chip is a `Badge` with an × button. The button has the label "Remove `{name}`". Chips stay in the order of picking. A polite live region says "`{name}` added. 2 of 5 selected." or "`{name}` removed. 1 of 5 selected."** | No announcement. | A screen reader user needs feedback that a chip changed. **Added point, please review.** |
| 19 | **The pure logic is in `catalog-destination-service.js`: filter the regions by search text and hide the primary prefecture, flatten the visible options, and find the next active option. The component only holds the state and the event handlers.** | All logic in the component. | Pure functions are easy to test. The project has no testing-library. **Added point, please review.** |
| 20 | **The popup uses Bootstrap classes (`list-group`, `shadow`, `overflow-auto`, `position-absolute`) and one inline `max-height` of 16rem. It has the width of the field on every screen size. No new SCSS file.** | A new SCSS file. | `AGENTS.md`: Bootstrap first. **Added point, please review.** |
| 21 | **Interaction tests run in `jsdom` with `react-dom/client` and `act`. Each such file sets `// @vitest-environment jsdom`. We add no test library.** | Add `@testing-library/react`. | `jsdom` is installed already. Owner chose no new dependency for this field. **Added point, please review.** |

## API contract

_The web item needs one new endpoint. [red-cab-api#223](https://github.com/markmamba/red-cab-api/issues/223) and its spec fix the final path and code. This table is the contract the web expects._

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/catalog/regions` (path is a proposal) | JWT provider | | `{ catalog_regions: [{ uuid, slug, name_en, name_ja, prefectures: [{ uuid, slug, name_en, name_ja }] }] }` | All `active` regions and their `active` prefectures. No discoverable filter. No `listing_count`. Same order as the public regions endpoint. A region can have an empty `prefectures` list. No pagination (47 prefectures). Any provider with a profile may call it. |

Existing endpoints that the web uses (no change):

| Method | Path | Fields |
| --- | --- | --- |
| POST | `/providers/catalog/listings` | `primary_geography_id` (required), `additional_geography_ids` (optional, max 5) |
| PATCH | `/providers/catalog/listings/:listing_id` | Same. Omitted key keeps the list. `[]` clears it. |
| GET | `/providers/catalog/listings/:listing_id` | `primary_geography_id`, `additional_geography_ids`, `area` (the prefecture) |

API error text the form shows (field `primary_geography_id`):

- "Please select a primary destination for your listing."
- "Please select a valid primary destination."
- "Please select an active primary destination."
- "The primary destination must be a prefecture."

API error text the form shows (field `additional_geography_ids`):

- "A listing can have at most 5 additional destinations."
- "Please select valid additional destinations."
- "Please select active additional destinations."
- "Additional destinations must be prefectures."
- "An additional destination cannot be the primary destination."
- "Please list each additional destination only once."

## Web contract

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Provider | `/providers/listings/new` (existing create page) | `clientLoader` also fetches the region list | `providers-catalog-regions-api.js` (new) | `provider-required-policy` (existing) |
| Provider | existing show page | `clientLoader` also fetches the region list | `providers-catalog-regions-api.js` | Same |

The route paths stay as they are. Check the real paths in `PROVIDER_CATALOG_LISTINGS_PATHS` when coding.

### Files to create or modify (Web)

- `app/api/providers-catalog-regions-api.js` (new): `index`, with JSDoc and the `*_PATH` constant.
- `app/api/providers-catalog-listings-api.js`: replace `area_id` with `primary_geography_id`. Add `additional_geography_ids`. Keep `[]` on update (decision 11).
- `app/domains/catalog-geography/catalog-primary-destination-select-field.jsx` (new)
- `app/domains/catalog-geography/catalog-additional-destinations-field.jsx` (new): the searchable multi-select with chips (decisions 5 and 14 to 20).
- `app/domains/catalog-geography/catalog-destination-service.js` (new): list prefecture UUIDs, find a prefecture name by UUID, and find the names for the show page. It also filters the regions by search text, flattens the options and finds the next active option (decision 19).
- `app/domains/catalog-listing/catalog-listing-schema.js`: replace `district_uuid` and `area` (decisions 8 and 9).
- `app/domains/catalog-listing/catalog-listing-service.js`: `defaultFormValues`, `buildUpdatePayload`. Remove `extractAreaId`.
- `app/domains/catalog-listing/catalog-listing-form.jsx`: replace `CatalogAreaSelectField`. Take `catalogRegions` as a prop.
- `app/domains/catalog-listing/catalog-listing-destinations-view.jsx` (new): the show page section.
- `app/routes/provider/provider-catalog-listings-create-page.jsx`: load regions, pass the prop.
- `app/routes/provider/provider-catalog-listings-show-page.jsx`: load regions, render the destinations view.
- Delete `app/domains/catalog-area/catalog-area-select-field.jsx`.

Skills to use when coding: `creating-api-clients`, `creating-domain-forms`, `creating-domain-views`, `creating-route-pages`, then `review-react-style`.

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: none on the web. The API saves the listing and its destinations in one transaction.
- Snapshots: none.
- The web sends no price. No price logic changes.

## Out of scope

- The provider edit form. The edit page is a stub. Edit support comes with that page.
- Pickup coverage (release 4). A destination never creates coverage.
- Region and prefecture pages for tourists (issue #153) and the home page cards (issue #152).
- A `listing_count` or a discoverable rule for providers.
- Changes to `marketplaceCatalogDistrictsApi` and its other callers.

## Tasks

### API (separate item, must merge first)

- [ ] Write the spec for [red-cab-api#223](https://github.com/markmamba/red-cab-api/issues/223) (`GET /providers/catalog/regions`) and get it approved.
- [ ] Merge the endpoint.

### Web

- [ ] Add `providers-catalog-regions-api.js` and its spec.
- [ ] Update `providers-catalog-listings-api.js` and its spec.
- [ ] Add the destination service and its spec.
- [ ] Add the primary destination select field.
- [ ] Add the additional destinations multi-select with chips, and its jsdom interaction tests.
- [ ] Update the schema and its spec.
- [ ] Update the listing service and its spec.
- [ ] Update the form and the create page loader.
- [ ] Add the destinations view and update the show page.
- [ ] Remove the old area select field.
- [ ] Run `review-react-style`, `npm run lint` and `npm test`.

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] A provider can save a draft with one primary destination and several additional ones (up to 5).
- [ ] The picker lists every active prefecture, including one with no listing.
- [ ] The picker never offers a region or a designated city.
- [ ] The form blocks a primary value that is not in the prefecture list.
- [ ] The form blocks more than 5 additional destinations, a duplicate and the primary prefecture.
- [ ] Typing in the additional destinations field filters the options by English or Japanese name. Regions with no match are hidden.
- [ ] A pick adds a chip and keeps the list open. The × button of a chip removes it.
- [ ] At 5 chips, the other options are disabled and the list shows the hint.
- [ ] The primary prefecture is not offered. Picking it as primary removes its chip.
- [ ] The field works with the keyboard only (Down, Up, Home, End, Enter, Escape, Backspace).
- [ ] The field has the roles and attributes of decision 14. A live region announces each add and remove.
- [ ] The request body has `primary_geography_id` and has no `area_id`.
- [ ] On update, an empty additional list is sent as `[]`. An omitted list is not sent.
- [ ] The API error text shows on the matching field.
- [ ] The provider listing page shows the primary and additional destinations by name.
- [ ] Test: schema, listing service payload, both API clients, the destination service and the destinations view.
- [ ] No client-side price computation.
- [ ] Text follows ASD-STE100 Tier A.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-24 | principal developer | Approved in chat. The author confirmed decisions 1, 2, 4, 5 and 12 and the added points (loader fetch, field names, overlap uncheck, schema from the loaded list, `[]` on update, old field removal). |
| 2026-10-24 | principal developer | Change requested in chat: replace the checkbox list with a searchable multi-select. Owner chose to build it with `react-bootstrap`. Decisions 5 to 7 and 14 to 21 changed. Approved in chat on the same day. |
