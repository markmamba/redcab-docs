---
title: "134 — Marketplace geography slug resolution and ancestor payloads"
issue: "https://github.com/markmamba/red-cab-api/issues/134"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/specs/133-refactor-geography-domain-layer.md (status: approved)"
  - "docs/specs/geography-administrative-tree.md (status: approved)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships **epic #130 steps 10–11** (`API-1` slug resolution + `API-2` listing-detail ancestor embed): route param rename, `SlugResolutionService`, marketplace manager rewires, detail serializers, integration tests, Bruno docs.
- Does **not** ship near-me (`FR-CAT-032`, epic step 12), team geography CRUD, `red-cab-web` client updates, or UUID-fallback removal (post tourist-web-60).
- Breaking change: **Yes** — route params become `:district_slug`/`:area_slug`; archived geography show returns **301** (was 404 in #133 interim).

## Problem

Marketplace geography endpoints still resolve by UUID (`find_by(uuid:)`), route params are named `:district_id`/`:area_id`, and listing detail area embed is lean (no `latitude`/`longitude`, no `district`, no `ancestors[]`). Tourist-web #57 breadcrumbs and Session A slug URLs are blocked.

Evidence: `config/routes/marketplace_routes.rb` (`:district_id`/`:area_id`), `Catalog::Districts::MarketplaceShowManager` (`find_by(uuid:)`), `MarketplaceAreaEmbeddedSerializer` (5 fields only), `MarketplaceListingListSerializer` reuses same embedded serializer.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Parent spec | [geography-administrative-tree.md](./geography-administrative-tree.md) | `API-1` / `API-2` contract, serializer matrix, lifecycle 404/301 |
| Prerequisite | [133-refactor-geography-domain-layer.md](./133-refactor-geography-domain-layer.md) | `Catalog::Geography`, `discoverable`, UUID-only interim managers |
| FR-CAT-003 | [requirements/functional-requirements/cat.md](../requirements/functional-requirements/cat.md) | Discovery projection; empty listings signal |
| INV-8, INV-11 | [business-rules/invariants.md](../business-rules/invariants.md) | Subtree discoverability; archive successor |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](../architecture/decisions/adr-016-geography-administrative-tree.md) | `path`, `discovery_root_id`, successor pointer |
| Session A | [roadmap/notes/SESSION-A-DECISION-RECORD.md](../roadmap/notes/SESSION-A-DECISION-RECORD.md) | Frozen URL family; slug params |
| domain-to-code-mapping | [engineering/domain-to-code-mapping.md](../engineering/domain-to-code-mapping.md) | `districts/` / `areas/` manager surface names |
| Backend conventions | [engineering/backend-conventions.md](../engineering/backend-conventions.md) | No DB queries in serializers; explicit routes |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Issue-scoped spec** (this file) | Parent spec only as `spec_path` | Repo spec-first (#131–#133 pattern); codegen needs committed `134-*.md` |
| 2 | **Route params** — `:district_slug`/`:area_slug` | Keep param names, accept slug values | Parent spec decision 7; honest contract |
| 3 | **`SlugResolutionService`** — shared resolver for district + area segments | Inline slug logic per manager | Parent spec `API-1`; one lifecycle + UUID-fallback implementation |
| 4 | **UUID fallback (temporary)** — `find_by(uuid:)` after slug miss; `Rails.logger.warn` | No fallback | Parent spec decision 8; cutover window until tourist-web-60 + 1 release |
| 5 | **Deprecation log format** — `Rails.logger.warn("[GeographySlugResolution] UUID segment used for #{segment_type}; prefer slug. segment=#{value}")` | `ActiveSupport::Deprecation.warn` | Matches bracketed operational warn pattern (`PayoutDispatchSweep`); production does not report deprecations |
| 6 | **Lifecycle on show** — `deactivated` → 404; `archived` → **301** to successor slug URL | Defer 301; keep 404 | Parent spec AC + locked behavior table; #133 test `returns not found for archived district` must change |
| 7 | **301 mechanism** — `SlugResolutionService` returns result object; controllers call `redirect_to(location, status: :moved_permanently)` | `Errors::MovedPermanentlyError` through `base_error` JSON | `ApplicationController#base_error` renders JSON; HTTP redirect needs controller `redirect_to` |
| 8 | **301 location paths** — district: `marketplace_catalog_districts_show_path(district_slug: successor.slug)`; area: `marketplace_catalog_districts_area_path(district_slug: root.slug, area_slug: successor.slug)` using successor's `discovery_root` | Single-hop only; walk to first active successor if chain exists | Parent spec: redirect to immediate successor; successor is active listable/root per archive validator |
| 9 | **List vs detail embed split** — keep `MarketplaceAreaEmbeddedSerializer` lean; add `MarketplaceAreaDetailEmbeddedSerializer` for listing detail (`API-2`) | Enrich `MarketplaceAreaEmbeddedSerializer` for all consumers | Q3=B; list unchanged; detail owns ancestors/coordinates per PKM list-detail ownership |
| 10 | **Area show serializer** — new `MarketplaceAreaShowSerializer` (base + lat/lng + lean `district`); controller swap | Extend `MarketplaceAreaBaseSerializer` | Parent spec serializer matrix; no `ancestors` on area show |
| 11 | **Ancestor fetch** — split area `path` into prefix segments; `WHERE path IN (...)` ordered by depth | Walk `parent_id` chain | `path` is materialized, unique, indexed; one query; aligns with `OPR-10` path usage |
| 12 | **Ancestor preload owner** — `Catalog::Geographies::AncestorsFetchService` + `MarketplaceShowDto` extension | Inline in listing show manager only | Reusable for area show `district` embed; no serializer DB queries |
| 13 | **Ancestor JSON shape** — `{ uuid, slug, name_en, name_ja, level }` root→parent, excludes area node | Include coordinates on ancestors | Parent spec `API-2` example |
| 14 | **Lean district embed** — `{ uuid, slug, name_en, name_ja }` on area show + listing detail | Full discovery root serializer | Parent spec `API-2` example |
| 15 | **Request param rename** — `district_slug`/`area_slug` in request classes (replace `district_id`/`area_id` readers) | Keep reader names | Matches route param names; Sorbet sig updates |
| 16 | **Test tree** — add `create_kanagawa_yokohama_nishi_tree` to `CatalogGeographyTestHelper` | Inline per test | Reuses existing `create_designated_city`; multi-level ancestor coverage |
| 17 | **List/index managers** — slug resolve via service; still filter `active_geographies.discoverable` (no 301 on index) | Include archived in index for redirect | Parent spec: list omits non-active nodes |

## API contract

### Route changes

`config/routes/marketplace_routes.rb` — rename params only (paths unchanged):

| Before | After |
| --- | --- |
| `:district_id` | `:district_slug` |
| `:area_id` | `:area_slug` |

Regenerate Sorbet route helper RBIs (`bundle exec tapioca dsl`).

### Slug resolution (`API-1`)

**Service:** `Catalog::Geographies::SlugResolutionService`

```ruby
# Illustrative — follow repo service naming / Sorbet sigs
def self.execute(district_segment:, area_segment: nil)
  # => SlugResolutionResult
end
```

**`SlugResolutionResult` value object:**

| Field | Type | Notes |
| --- | --- | --- |
| `status` | `:found` \| `:not_found` \| `:redirect` | |
| `geography` | `Catalog::Geography` | Set when `status == :found` |
| `redirect_location` | `String` | Relative path when `status == :redirect` |

**Resolution algorithm** (per parent spec):

1. Find discovery root by `slug` (scope: `discovery_roots`, **no** `active_geographies` filter).
2. If `area_segment` present: find listable node `where(discovery_root_id: root.id, slug: area_segment, is_listable: true)` (no active filter).
3. UUID fallback: if slug miss, `find_by(uuid: segment)` + warn log (step 5 above).
4. Lifecycle:
   - `active` + discoverable (show managers) → `:found`
   - `deactivated` → `:not_found`
   - `archived` → `:redirect` to successor URL
   - `active` but not discoverable (show) → `:not_found` (INV-8)

**Managers using resolver:**

- `Catalog::Districts::MarketplaceShowManager`
- `Catalog::Areas::MarketplaceIndexManager` (district segment only)
- `Catalog::Areas::MarketplaceShowManager`
- `Catalog::Listings::MarketplaceIndexManager`
- `Catalog::Listings::MarketplaceShowManager` — unchanged slug path (listing UUID); enriches area embed only

### Serializer field matrix

| Serializer | Fields | Used by |
| --- | --- | --- |
| `MarketplaceDistrictBaseSerializer` | unchanged | district index/show |
| `MarketplaceAreaBaseSerializer` | unchanged | area index |
| `MarketplaceAreaEmbeddedSerializer` | `uuid`, `slug`, `name_en`, `name_ja`, `timezone` | `MarketplaceListingListSerializer#area` (unchanged lean) |
| `MarketplaceAreaDetailEmbeddedSerializer` | above + `latitude`, `longitude`, lean `district`, `ancestors[]` | `MarketplaceListingDetailSerializer#area` |
| `MarketplaceAreaShowSerializer` | base + `latitude`, `longitude`, lean `district` | area show controller |
| `MarketplaceGeographyAncestorSerializer` | `uuid`, `slug`, `name_en`, `name_ja`, `level` | nested in detail embed |
| `MarketplaceDistrictLeanEmbeddedSerializer` | `uuid`, `slug`, `name_en`, `name_ja` | nested in area show + detail embed |

### Listing detail DTO (`API-2`)

Extend `Catalog::Listings::MarketplaceShowDto`:

```ruby
attr_reader :area_ancestors      # T::Array[Catalog::Geography]
attr_reader :area_district       # Catalog::Geography (discovery root)
```

`MarketplaceShowManager` preloads via `AncestorsFetchService` and passes into DTO; detail serializer reads DTO only.

### Files to create or modify

**New**

- `app/domains/catalog/geographies/slug_resolution_service.rb`
- `app/domains/catalog/geographies/slug_resolution_result.rb`
- `app/domains/catalog/geographies/ancestors_fetch_service.rb`
- `app/domains/catalog/marketplace_area_detail_embedded_serializer.rb`
- `app/domains/catalog/marketplace_area_show_serializer.rb`
- `app/domains/catalog/marketplace_geography_ancestor_serializer.rb`
- `app/domains/catalog/marketplace_district_lean_embedded_serializer.rb`
- `test/domains/catalog/geographies/slug_resolution_service_test.rb`
- `test/domains/catalog/geographies/ancestors_fetch_service_test.rb`

**Modify**

- `config/routes/marketplace_routes.rb`
- `app/domains/catalog/districts/marketplace_show_request.rb`
- `app/domains/catalog/districts/marketplace_show_manager.rb`
- `app/domains/catalog/areas/marketplace_index_request.rb`
- `app/domains/catalog/areas/marketplace_index_manager.rb`
- `app/domains/catalog/areas/marketplace_show_request.rb`
- `app/domains/catalog/areas/marketplace_show_manager.rb`
- `app/domains/catalog/listings/marketplace_index_request.rb`
- `app/domains/catalog/listings/marketplace_index_manager.rb`
- `app/domains/catalog/listings/marketplace_show_manager.rb`
- `app/domains/catalog/listings/marketplace_show_dto.rb`
- `app/domains/catalog/marketplace_listing_detail_serializer.rb` — use `MarketplaceAreaDetailEmbeddedSerializer`
- `app/controllers/marketplace/catalog/districts_controller.rb` — handle `:redirect`
- `app/controllers/marketplace/catalog/areas_controller.rb` — handle `:redirect`; swap show serializer
- `test/support/catalog_geography_test_helper.rb` — `create_kanagawa_yokohama_nishi_tree`
- `test/integration/marketplace/catalog/districts_*`
- `test/integration/marketplace/catalog/areas_*`
- `test/integration/marketplace/catalog/listings_*`
- `test/domains/catalog/listings/marketplace_index_manager_test.rb`
- `docs/api/red-cab-api/marketplace/catalog/geography/*.bru` (4 files)
- `sorbet/rbi/dsl/generated_*_helpers_module.rbi` (regenerated)

## Out of scope

- Near-me endpoint (epic step 12)
- Team geography admin endpoints
- Provider write path (`area_id` stays UUID)
- `red-cab-web` marketplace/tourist API clients (#57)
- UUID fallback removal (tourist-web-60 + one release)
- Schema migrations / seed changes

## Acceptance criteria

- [ ] `GET /marketplace/catalog/districts/:district_slug` resolves by slug; UUID fallback logs warn
- [ ] `GET .../districts/:district_slug/areas/:area_slug` resolves `(discovery_root_id, slug)`
- [ ] Route helpers use `district_slug`/`area_slug` param names
- [ ] Deactivated geography show → 404; archived geography show → 301 to successor path
- [ ] Listing detail `area` embed includes `latitude`, `longitude`, lean `district`, `ancestors[]` (root→parent)
- [ ] Listing list `area` embed stays lean (no ancestors/coordinates)
- [ ] Area show returns `latitude`, `longitude`, lean `district` (no ancestors)
- [ ] Integration tests updated for slug URLs and new JSON shapes
- [ ] Bruno geography docs use slugs and document new fields
- [ ] `bundle exec srb tc`, `bundle exec rubocop`, marketplace integration tests pass

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/domains/catalog/geographies/
bin/rails test test/integration/marketplace/catalog/
bundle exec tapioca dsl
bundle exec srb tc
bundle exec rubocop
```

## Cross-repo dependencies

| Consumer | Dependency |
| --- | --- |
| red-cab-web #57 | Ancestor embed on listing detail for tourist breadcrumbs |
| red-cab-api #130 | Parent epic |
| tourist-web-60 | Blocks UUID fallback removal |
