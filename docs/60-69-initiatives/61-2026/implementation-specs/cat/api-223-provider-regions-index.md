---
title: "Add a provider endpoint that lists all active prefectures by region"
sidebar_label: API · Provider regions index
issue: "https://github.com/markmamba/red-cab-api/issues/223"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#destination-structure"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-154-provider-listing-destinations.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-207-scoped-listings-index.md"
---

## TL;DR

- Ships `GET /providers/catalog/regions`. It lists all active regions with their active prefectures.
- The list has no discoverable rule. A prefecture with no listing is in the list.
- The list has no designated city, ward or other municipality.
- Any provider with a profile may call it. The provider does not need to be approved.
- Does NOT change the public regions or districts endpoints.
- Does NOT ship migrations, new tables or web code.
- Breaking change: No. It is a new endpoint.

## Problem

The web provider listing form must offer every active prefecture as a destination. The form uses `GET /marketplace/catalog/districts` today.

That endpoint returns only discoverable discovery roots. A node is discoverable only when a published listing sits below it. The result has two faults:

- A prefecture with no published listing is not in the list. A provider cannot create the first listing in a new prefecture.
- A designated city can be in the list. The API rejects it as a primary destination (api-204).

The public endpoints must keep INV-8: a node shows only with a discoverable listing. They cannot serve this need.

No provider endpoint lists geographies. Only `/team/catalog/geographies` exists, and it is for admins.

Evidence:

- `app/domains/catalog/districts/marketplace_index_manager.rb` (`discovery_roots.active_geographies.discoverable`)
- `app/domains/catalog/regions/marketplace_index_manager.rb` (returns only nodes with a discoverable listing)
- `config/routes/providers_routes.rb` (no geography route)
- Issue #223 and [red-cab-web#154](https://github.com/markmamba/red-cab-web/issues/154)

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | The primary and additional destinations are prefectures. |
| INV-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | A public node shows only with a discoverable listing. This endpoint is not public. |
| Spec | [api-204](./api-204-primary-destination-prefecture.md) | A primary destination is an active node of level `subdivision`. |
| Spec | [api-205](./api-205-additional-destinations.md) | An additional destination follows the same rule. |
| Spec | [api-207](./api-207-scoped-listings-index.md) | The public regions endpoint, its shape and its order |
| Spec | [web-154](./web-154-provider-listing-destinations.md) | The web screens that use this endpoint |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **The path is `GET /providers/catalog/regions`** | `/providers/catalog/geographies/prefectures` | Owner ruling on 2026-10-24. It matches `/marketplace/catalog/regions` and the nested response. |
| 2 | **Any provider with a profile may call it. The route has no `require_approved_provider_profile!`.** | Approved providers only | Owner ruling on 2026-10-24. Listing `index` and `show` use the same gate. The web show page needs the names, and a pending provider can view listings. |
| 3 | **A region is in the list when its level is `region` and its status is `active`.** | Only regions with a prefecture | Owner ruling on 2026-10-24. The list shows the full active tree. |
| 4 | **A region with no active prefecture is returned with an empty `prefectures` list.** | Leave the region out | Owner ruling on 2026-10-24. The web hides it. |
| 5 | **A prefecture is in the list when its level is `subdivision`, its status is `active` and its parent is an active region.** | Use `is_discovery_root` | The primary destination rule is level `subdivision` and status `active`. A designated city has another level, so the level filter removes it. |
| 6 | **Order: regions by `display_order`, then `id`. Prefectures by `popular_rank` ascending with no rank last, then `display_order`, then `id`.** | Order by name | Owner ruling on 2026-10-24. It matches the public regions endpoint, so the picker order matches the tourist pages. |
| 7 | **Each region has `uuid`, `slug`, `name_en`, `name_ja`, `prefectures`. Each prefecture has `uuid`, `slug`, `name_en`, `name_ja`. There is no `listing_count` and no `popular_rank`.** | Reuse the public serializers | A count has no meaning without the discoverable rule. A provider does not need the rank. The public serializers stay a public contract. |
| 8 | **Add the serializers `Catalog::ProvidersRegionSerializer` and `Catalog::ProvidersPrefectureSerializer`.** | Reuse `MarketplaceRegionSerializer` | The public serializers include `listing_count`. See decision 7. |
| 9 | **The endpoint takes no parameters and has no pagination. It has no request class. Query params are ignored.** | Add `page` and `page_size` | Japan has 47 prefectures. The public regions endpoint also takes no parameters. |
| 10 | **The manager runs two queries: the regions, and the prefectures of those regions. It groups them in Ruby.** | One query for each region | The number of queries stays fixed. This follows `Catalog::Regions::MarketplaceIndexManager`. |
| 11 | **The manager returns plain data objects (`RegionNode`, `PrefectureNode`) like the public manager.** | Return model records | The serializer gets one shape. The model needs no new association. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/catalog/regions` | JWT provider (profile required, approval not required) | None | `{ catalog_regions: [...] }` | 401 without a session. 403 for a user without the provider role or without a provider profile (existing portal gate codes). |

Response example:

```json
{
  "catalog_regions": [
    {
      "uuid": "...",
      "slug": "kanto",
      "name_en": "Kanto",
      "name_ja": "関東",
      "prefectures": [
        { "uuid": "...", "slug": "tokyo", "name_en": "Tokyo", "name_ja": "東京都" }
      ]
    }
  ]
}
```

### Files to create or modify (API)

- `config/routes/providers_routes.rb` (one explicit route in `namespace :catalog`)
- `app/controllers/providers/catalog/regions_controller.rb` (new)
- `app/domains/catalog/regions/providers_index_manager.rb` (new)
- `app/domains/catalog/providers_region_serializer.rb` (new)
- `app/domains/catalog/providers_prefecture_serializer.rb` (new)
- `test/integration/providers/catalog/regions_index_integration_test.rb` (new)

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: read only.
- Snapshots: none.
- No migration. The endpoint reads `catalog_geographies` with existing columns and indexes (`parent_id` with `display_order`, and `parent_id` with `popular_rank`).

## Out of scope

- A change to `/marketplace/catalog/regions` and `/marketplace/catalog/districts`.
- Names of additional destinations in the provider listing payload. The web looks them up in this list.
- A `listing_count` or a `popular_rank` field for providers.
- Municipalities and wards as destinations.
- Pickup coverage (release 4).
- The web provider form (red-cab-web#154).

## Tasks

### API

- [ ] Add the route and the controller.
- [ ] Add `Catalog::Regions::ProvidersIndexManager`.
- [ ] Add the two serializers.
- [ ] Add the integration test.
- [ ] Run `bundle exec srb tc`, `bundle exec rubocop` and the full test suite.

### Web

- [ ] None in this issue. See [web-154](./web-154-provider-listing-destinations.md).

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] A provider with an approved profile receives all active regions and all active prefectures.
- [ ] A provider with a pending, rejected or suspended profile also receives the list.
- [ ] A prefecture with no listing is in the list.
- [ ] A prefecture with a published listing is in the list once.
- [ ] A designated city, ward or other municipality is not in the list.
- [ ] A deactivated or archived region or prefecture is not in the list.
- [ ] A prefecture of an inactive region is not in the list.
- [ ] An active region with no active prefecture is in the list with `prefectures: []`.
- [ ] Regions come back by `display_order`. Prefectures come back by `popular_rank` (no rank last), then `display_order`.
- [ ] The response has no `listing_count` and no `popular_rank`.
- [ ] A request without a session returns 401.
- [ ] A user without the provider role returns 403. A provider without a profile returns 403.
- [ ] The endpoint runs a fixed number of queries, not one for each region.
- [ ] The public regions and districts endpoints return the same results as before.
- [ ] Integration test: `test/integration/providers/catalog/regions_index_integration_test.rb`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails test test/integration/providers/catalog/regions_index_integration_test.rb
bin/rails test
bundle exec srb tc
bundle exec rubocop
bin/brakeman --no-pager
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-24 | principal developer | Approved in chat. The author confirmed decisions 1, 2, 4 and 6 and the added points (level filter, no count or rank, new serializers, fixed query count). |
