---
title: "Add primary and additional destinations to the provider listing form"
sidebar_label: Web · Provider listing destinations
issue: "https://github.com/markmamba/red-cab-web/issues/154"
repos:
  - red-cab-api
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#destination-structure"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-204-primary-destination-prefecture.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-205-additional-destinations.md"
---

## TL;DR

- Ships a prefecture picker for the primary destination in the provider create form.
- Ships a checkbox list for up to 5 additional destinations, grouped by region.
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
| 2 | **The endpoint returns regions with their prefectures. Each prefecture has `uuid`, `slug`, `name_en`, `name_ja`. There is no `listing_count`.** | A flat list. | Owner ruling on 2026-10-24. The picker and the checkbox list group by region. |
| 3 | **The create page loader fetches the list once. It passes `catalogRegions` to the form as a prop. The two destination fields do not call the API.** | Each field fetches in an effect, as `CatalogAreaSelectField` does today. | One request, not two. The loader is the preferred place for API calls (`AGENTS.md`). |
| 4 | **The primary destination is a single select. Prefectures sit in `<optgroup>` blocks named by region. A region with no prefecture is skipped.** | A flat select. | Matches the grouping from decision 2. |
| 5 | **Additional destinations are checkbox groups under region headings, with an "n of 5" counter.** | A searchable multi-select with chips. Repeated select rows. | Owner ruling on 2026-10-24. It reuses the checkbox style and needs no new component library. |
| 6 | **At 5 checked, the unchecked boxes are disabled. The primary prefecture is not shown in the list.** | Show an error after the fact. | The user cannot reach a state the API rejects. |
| 7 | **When the provider picks a primary prefecture that is already checked as additional, the form unchecks it.** | Block the pick with an error. | The API rejects this overlap (api-205 decision 7). An automatic uncheck is the smaller step for the user. **Added point, please review.** |
| 8 | **Form field names are `primary_geography_id` and `additional_geography_ids`.** | Keep `area` and `district_uuid`. | `setApiErrorsToFormFields` sets each API error on the field with the same name. Matching names show the API text on the right field. |
| 9 | **The schema is built from the loaded prefecture UUIDs. The primary value must be in that list. The additional list has at most 5 items, no duplicates and no primary value.** | A static schema that only checks "not empty". | The issue says the form blocks a primary destination that is not a prefecture. The API still checks the same rules. |
| 10 | **Create sends `additional_geography_ids` only when the list is not empty.** | Always send `[]`. | An omitted key is the same as an empty list on create. |
| 11 | **`providersCatalogListingsApi.update` sends `additional_geography_ids` as given, including `[]`.** | Keep `removeObjectEmptyAttributes` on the whole payload. | `removeObjectEmptyAttributes` removes empty arrays. With it, a caller can never clear the list (api-205 decision 6). The edit page is a stub today, so no screen uses this yet. The client must be right when the edit page ships. **Added point, please review.** |
| 12 | **The provider listing page shows "Primary destination" (from `area`, which holds the prefecture) and "Additional destinations" (names found by UUID in the new endpoint list).** | Ask the API to return names for additional destinations. | Owner ruling on 2026-10-24. It needs no more API change. A UUID with no match is skipped, not shown as an ID. |
| 13 | **Delete `catalog-area-select-field.jsx` and the `catalog-area` domain folder. Keep `marketplaceCatalogDistrictsApi`, because the home page uses it.** | Keep the old file. | Nothing else uses the field after this change. |

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
- `app/domains/catalog-geography/catalog-additional-destinations-field.jsx` (new)
- `app/domains/catalog-geography/catalog-destination-service.js` (new): list prefecture UUIDs, find a prefecture name by UUID, find a name for the show page.
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
- [ ] Add the additional destinations checkbox field.
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
