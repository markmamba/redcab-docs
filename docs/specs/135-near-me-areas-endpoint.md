---
title: "135 — Near-me areas endpoint (FR-CAT-032)"
issue: "https://github.com/markmamba/red-cab-api/issues/135"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/specs/134-marketplace-geography-slug-and-ancestors.md (status: approved)"
  - "docs/specs/geography-administrative-tree.md (status: approved)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships **epic #130 step 12** (`FR-CAT-032`): `GET /marketplace/catalog/areas/near` — Haversine-ranked list of discoverable listable geography nodes from required `lat`/`lng` query params.
- Does **not** ship `red-cab-web` near-me UI (#65), team geography CRUD, PostGIS, migrations, or pagination.
- Breaking change: **No** — new endpoint only.

## Problem

Marketplace discovery has district/area slug routes and listing detail geography embeds (#134) but no API to rank Areas by user geolocation. `FR-CAT-032` and epic step 12 require a near-me endpoint using listable-node centroids and the `INV-8` discoverable filter without a spatial DB extension.

Evidence: `config/routes/marketplace_routes.rb` (no `areas/near` route), no `NearMeManager` under `app/domains/catalog/geographies/`, partial coordinate index on `catalog_geographies` exists from #131.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Parent spec | [geography-administrative-tree.md](./geography-administrative-tree.md) | Near-me contract, route shape, serializer matrix |
| Prerequisite | [134-marketplace-geography-slug-and-ancestors.md](./134-marketplace-geography-slug-and-ancestors.md) | Slug routes landed; marketplace read stack stable |
| FR-CAT-032 | [requirements/functional-requirements/cat.md](../requirements/functional-requirements/cat.md) | Near-me discovery requirement |
| INV-8 | [business-rules/invariants.md](../business-rules/invariants.md) | Subtree discoverability filter |
| ADR-013 | [architecture/decisions/adr-013-geography-reference-data.md](../architecture/decisions/adr-013-geography-reference-data.md) | Haversine over centroids; no PostGIS |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](../architecture/decisions/adr-016-geography-administrative-tree.md) | Listable nodes, partial coord index |
| geography.md | [architecture/geography.md](../architecture/geography.md) | Near-me algorithm summary |
| domain-to-code-mapping | [engineering/domain-to-code-mapping.md](../engineering/domain-to-code-mapping.md) | `geographies/` query services |
| Backend conventions | [engineering/backend-conventions.md](../engineering/backend-conventions.md) | Request → Manager → Validator; no serializer DB queries |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Issue-scoped spec** (this file) | Parent spec only as `spec_path` | Repo spec-first (#131–#134 pattern); codegen needs committed `135-*.md` |
| 2 | **Route** — sibling `namespace :areas` with `get 'near'` under `catalog` | Nest under `:district_slug` | Parent spec locked — `near` must not parse as `:area_slug` |
| 3 | **Domain namespace** — `Catalog::Geographies::NearMeRequest/Validator/Manager` | Place under `catalog/areas/` | Parent spec file list; query service alongside `SlugResolutionService` |
| 4 | **Scope chain** — `.listable_nodes.active_geographies.discoverable` | Discoverable only | Matches `MarketplaceIndexManager`; excludes deactivated/archived and empty subtrees |
| 5 | **Haversine in SQL** — `SELECT` alias `distance_km` on relation | Ruby post-sort | Sort/limit in DB; uses partial index; ADR-013 |
| 6 | **Earth radius** — **6371.0 km** | 6378.137 km (WGS84 equatorial) | Standard mean-radius Haversine constant |
| 7 | **`distance_km` precision** — `ROUND(..., 1)` | 2 decimals; integer km | Parent spec example `12.4` |
| 8 | **Serializer** — `MarketplaceAreaNearSerializer` extends `MarketplaceAreaBaseSerializer` + `distance_km` | Base + `context[:distance_km]` | #134 dedicated-serializer pattern; Panko context is awkward per-row in arrays |
| 9 | **Response envelope** — `{ "areas": [...] }` no `meta` | `catalog_areas` + Pagy meta | Parent spec explicit; capped flat list, not index pagination |
| 10 | **Sort** — `distance_km ASC`, `name_en ASC` tie-break | `display_order` tie-break | Distance is primary user signal; stable secondary sort |
| 11 | **Validation** — 422 on missing/invalid `lat`/`lng`; `limit` default 10, max 50 | 400 for bad coords | Matches quotes show pattern (`ValidationError` → 422) |
| 12 | **Bruno** — `list-areas-near.bru` in this PR | Defer | #134 shipped Bruno for geography marketplace endpoints |

## API contract

### Route

Add to `config/routes/marketplace_routes.rb` **before** `namespace :districts` (sibling under `catalog`):

```ruby
namespace :areas do
  get 'near',
    controller: '/marketplace/catalog/areas',
    action:     'near',
    as:         :near
end
```

**Path:** `GET /marketplace/catalog/areas/near`

### Request

| Param | Required | Default | Validation |
| --- | --- | --- | --- |
| `lat` | yes | — | Numeric; `-90` ≤ lat ≤ `90` |
| `lng` | yes | — | Numeric; `-180` ≤ lng ≤ `180` |
| `limit` | no | `10` | Integer; `1` ≤ limit ≤ `50` |

### Response 200

```json
{
  "areas": [
    {
      "uuid": "...",
      "slug": "shibuya",
      "name_en": "Shibuya",
      "name_ja": "渋谷",
      "display_order": 1,
      "timezone": "Asia/Tokyo",
      "distance_km": 2.4
    }
  ]
}
```

- No `meta` object.
- No `latitude` / `longitude` on items (list-lean per parent serializer matrix).
- Empty discoverable set → `200` with `"areas": []`.

### Errors

| Status | When |
| --- | --- |
| 422 | `lat`/`lng` missing, non-numeric, or out of range; `limit` invalid |

### Haversine SQL (illustrative)

Constants: `EARTH_RADIUS_KM = 6371.0`. Bind query `lat`/`lng` as sanitized numeric params.

```sql
ROUND(
  (
    6371.0 * 2 * ASIN(
      SQRT(
        POWER(SIN((RADIANS(catalog_geographies.latitude) - RADIANS(:lat)) / 2), 2) +
        COS(RADIANS(:lat)) * COS(RADIANS(catalog_geographies.latitude)) *
        POWER(SIN((RADIANS(catalog_geographies.longitude) - RADIANS(:lng)) / 2), 2)
      )
    )
  )::numeric,
  1
) AS distance_km
```

**Manager query shape:**

```ruby
Catalog::Geography
  .listable_nodes
  .active_geographies
  .discoverable
  .select("catalog_geographies.*, (#{haversine_sql}) AS distance_km")
  .order(Arel.sql("distance_km ASC"))
  .order(name_en: :asc)
  .limit(validated_limit)
```

### Controller render (no Pagy)

```ruby
areas = Catalog::Geographies::NearMeManager.execute(request: request)

render(
  json: {
    areas: Panko::ArraySerializer.new(
      areas,
      each_serializer: Catalog::MarketplaceAreaNearSerializer
    ).to_a
  }.to_json,
  status: :ok
)
```

## Files to create or modify

**New**

- `app/domains/catalog/geographies/near_me_request.rb`
- `app/domains/catalog/geographies/near_me_validator.rb`
- `app/domains/catalog/geographies/near_me_manager.rb`
- `app/domains/catalog/marketplace_area_near_serializer.rb`
- `test/integration/marketplace/catalog/areas_near_integration_test.rb`
- `docs/api/red-cab-api/marketplace/catalog/geography/list-areas-near.bru`

**Modify**

- `config/routes/marketplace_routes.rb`
- `app/controllers/marketplace/catalog/areas_controller.rb`
- `sorbet/rbi/dsl/generated_*_helpers_module.rbi` (regenerated via `bundle exec tapioca dsl`)

## Out of scope

- `red-cab-web#65` near-me UI shell
- PostGIS / migrations
- Team geography admin CRUD
- Pagination (Pagy)
- Lat/lng on response items
- Designated-city discovery roots (`is_listable: false`, no coords) — excluded by `listable_nodes`

## Acceptance criteria

- [ ] `GET /marketplace/catalog/areas/near?lat=&lng=` returns 200 with `areas` array
- [ ] Items include base area fields + `distance_km` (1 decimal); no coordinates on items
- [ ] Results sorted by ascending distance; tie-break `name_en`
- [ ] Only `.listable_nodes.active_geographies.discoverable` nodes returned (INV-8)
- [ ] Deactivated geography excluded
- [ ] `limit` defaults to 10, max 50
- [ ] 422 when `lat`/`lng` missing or out of range
- [ ] Integration tests in `areas_near_integration_test.rb`
- [ ] Bruno `list-areas-near.bru` documents endpoint
- [ ] `bundle exec srb tc`, `bundle exec rubocop`, marketplace integration tests pass

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/integration/marketplace/catalog/areas_near_integration_test.rb
bin/rails test test/integration/marketplace/catalog/
bundle exec tapioca dsl
bundle exec srb tc
bundle exec rubocop
```

## Cross-repo dependencies

| Consumer | Dependency |
| --- | --- |
| red-cab-web #65 | Near-me UI shell; consumes this endpoint |
| red-cab-api #130 | Parent epic |
| tourist-web near-me | Client passes browser geolocation; no client-side Haversine ranking per frontend conventions |

## Human verification (2026-09-23)

| Q | Choice | Outcome |
| --- | --- | --- |
| Q1 Response key | A — `areas` | Confirmed |
| Q2 Spec path | A — scoped `135-near-me-areas-endpoint.md` | Confirmed |
| Q3 Haversine | A — 6371.0 km, 1 decimal | Confirmed |
| Q4 Bruno | A — include in PR | Confirmed |

**Verification status:** passed

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-23 | PKM plan agent | human MCQ gate | Passed |
| 2026-09-23 | PKM plan agent | `review-implementation-spec` | Approved — no must-fix findings |
| 2026-09-23 | Mark | explicit approval | `status: approved` |
