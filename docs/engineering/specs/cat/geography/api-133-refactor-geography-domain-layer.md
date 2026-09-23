---
title: "Refactor geography domain layer and listing attachment"
sidebar_label: API · Geography domain layer
issue: "https://github.com/markmamba/red-cab-api/issues/133"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/cat/geography/api-131-migrate-geography-schema.md (status: approved)"
  - "docs/engineering/specs/cat/geography/api-132-seed-japan-geography.md (status: approved)"
  - "docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md (status: approved)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships **domain models and rewiring** for epic #130 step 9: `Catalog::Country`, `Catalog::Geography`, `Catalog::Listing.geography`, `discoverable` subtree scope (`INV-8`), provider listable-leaf validation (`FR-CAT-033`), geography tree ActiveModel validator(s), and minimum marketplace manager fixes (UUID lookup only).
- Does **not** ship slug resolution (`API-1`), serializer ancestor embeds (`API-2`), near-me, team geography CRUD, route param rename, or `red-cab-web` changes — epic steps 10–12.
- Breaking change: **Internal only** — `Catalog::District` / `Catalog::Area` deleted; `listing.area` → `listing.geography`. Provider JSON key `area_id` unchanged.

## Problem

Schema migration (#131) and Japan seed (#132) landed while application code still references dropped flat models (`Catalog::District`, `Catalog::Area`) and `catalog_listings.area_id`. All geography and listing attach paths are broken until domain code reads `catalog_geographies`.

Evidence: `app/domains/catalog/district.rb`, `area.rb`, `listing.rb` (`belongs_to :area`), `listings/providers_create_manager.rb` (`Catalog::Area.find_by`), marketplace managers querying `Catalog::District.discoverable`, stale Sorbet RBIs under `sorbet/rbi/dsl/catalog/{district,area}.rbi`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Parent spec | [docs-13-geography-administrative-tree.md](./docs-13-geography-administrative-tree.md) | Epic step 9 scope; `discoverable`, provider write, directory naming |
| Prerequisite | [131-migrate-geography-schema.md](./api-131-migrate-geography-schema.md) | Schema already migrated |
| Prerequisite | [132-seed-japan-geography.md](./api-132-seed-japan-geography.md) | Seed task exists; anonymous AR stubs deferred here |
| FR-CAT-033 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Listable-leaf listing attach |
| INV-8 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Subtree discoverability |
| ADR-014 | [architecture/decisions/adr-014-service-timezone-model.md](/docs/architecture/decisions/adr-014-service-timezone-model.md) | `timezone` on every geography node |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](/docs/architecture/decisions/adr-016-geography-administrative-tree.md) | Tree shape, path, discovery roles |
| domain-to-code-mapping | [Domain-to-code mapping](/docs/engineering/conventions/domain-to-code-mapping) | `geography.rb` replaces flat models; `districts/` / `areas/` API surface unchanged |
| Backend conventions | [Backend conventions](/docs/engineering/conventions/backend) | No model validations; ActiveModel validators |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Issue-scoped spec** (this file) | Epic parent spec only | Repo spec-first; mirrors #131/#132; codegen needs `spec_path` |
| 2 | **Delete `Catalog::District` / `Catalog::Area`** | Thin wrapper classes delegating to Geography | Epic decision 11 + `domain-to-code-mapping.md`; tables dropped in #131 |
| 3 | **`listing.geography` association** | `alias_method :area` on Listing | Matches `geography_id` column; serializers keep `area_uuid` / `area` JSON shape |
| 4 | **`discoverable` via `path` prefix EXISTS** | Recursive CTE; direct listing join only | Aligns with `OPR-10` path-prefix pattern; index on `path`; preserves `INV-8` subtree semantics |
| 5 | **Single `Catalog::Geographies::TreeValidator`** | Split create/update validators | No team CRUD in #133; one class with focused `validate` methods + unit tests |
| 6 | **Marketplace managers: UUID lookup only** | Slug resolution ahead of step 10 | Epic step 10 owns `SlugResolutionService`; routes still use `:district_id`/`:area_id` param names |
| 7 | **Provider JSON key `area_id` unchanged** | Rename to `geography_id` | Epic decision 12; resolve UUID → `Catalog::Geography` internally |
| 8 | **FR-CAT-033 error on `:area_id`** | New error key | Matches existing `ProvidersCreateValidator` / `ProvidersUpdateValidator` pattern |
| 9 | **Reject `deactivated` and `archived` nodes** on provider write | Active-only check (legacy) | Parent spec Provider write section |
| 10 | **Test helper keeps `create_catalog_district` / `create_catalog_area` names** | Rename to discovery_root / listable_node | Minimizes test churn; implementations build `Catalog::Geography` rows |
| 11 | **`JapanSeedService` adopts domain models** | Keep anonymous stubs | Q1=A — replace `SeedGeography`/`SeedCountry` with `Catalog::Geography`/`Catalog::Country` in same PR |
| 12 | **FR-CAT-033 lists all direct listable children** | Generic message only | Q2=A — comma-separated `name_en` on `:area_id` error |

## Data / domain touchpoints

- Bounded context: **CAT**
- Models: `Catalog::Country` → `catalog_countries`; `Catalog::Geography` → `catalog_geographies`
- Listing FK: `catalog_listings.geography_id` → listable `Catalog::Geography` only
- **`INV-8` `discoverable` scope** (query-time, never stored):

```sql
EXISTS (
  SELECT 1
  FROM catalog_listings cl
  INNER JOIN catalog_geographies lg ON lg.id = cl.geography_id
  WHERE cl.status = 'published'
    AND (lg.path = catalog_geographies.path OR lg.path LIKE catalog_geographies.path || '/%')
)
```

- Chain with `active_geographies` (`where(status: :active)`) for marketplace list endpoints
- **Scopes on `Catalog::Geography`:**
  - `discovery_roots` → `where(is_discovery_root: true)`
  - `listable_nodes` → `where(is_listable: true)`
  - `active_geographies` → `where(status: :active)`
  - `discoverable` → subtree EXISTS above
- **Tree validator rules** (ActiveModel, not DB CHECK):
  - Parent level ordering: child `level` must be valid for parent `level` (subdivision → municipality/ward; municipality → ward; ward → none)
  - Listable nodes must not have listable descendants
- **No migrations** — schema complete from #131
- **Snapshots unchanged** — checkout still snapshots `service_timezone` from listing geography

### `Catalog::Country` model

Associations: `has_many :geographies`. String enum `status` with prefix. No validations in model.

### `Catalog::Geography` model

Self-references: `parent`, `discovery_root`, `successor`, `children`. `belongs_to :country`. `has_many :listings`. String enums: `level`, `code_system`, `status` (active, deactivated, archived) with prefix. Scopes listed above. No validations in model.

### Provider write (`FR-CAT-033`)

Keep request key `area_id` (UUID). Manager resolves `Catalog::Geography.find_by(uuid:)`. Validator checks:

| Check | Error attribute | Message pattern |
| --- | --- | --- |
| Not found | `:area_id` | `Please select a valid area.` (existing) |
| `status` not `active` | `:area_id` | `Please select an active area.` (existing) |
| `is_listable = false` | `:area_id` | `Please attach to a ward: {name_en}, …` — all direct listable children, comma-separated |

Persist `geography:` on `Catalog::Listing.create!`.

### Marketplace managers (minimum fix)

Rewire to query `Catalog::Geography`:

| Manager | Before | After |
| --- | --- | --- |
| `Districts::MarketplaceIndexManager` | `Catalog::District.discoverable` | `Catalog::Geography.discovery_roots.active_geographies.discoverable` |
| `Districts::MarketplaceShowManager` | `Catalog::District.discoverable.find_by(uuid:)` | Same pattern on Geography |
| `Areas::MarketplaceIndexManager` | District + Area discoverable | Discovery root by uuid + `listable_nodes` under `discovery_root_id` |
| `Areas::MarketplaceShowManager` | Area discoverable | Listable geography by uuid under root |
| `Listings::MarketplaceIndexManager` | Area discoverable | Listable geography discoverable |

Serializers continue reading listable node fields (`uuid`, `slug`, `name_en`, `name_ja`, `timezone`) from `listing.geography` — no payload shape change.

### Downstream readers (grep-driven)

| Path | Change |
| --- | --- |
| `listings/service_timezone_fetch_service.rb` | `listing.geography&.timezone` |
| `bookings/checkout_sessions/tourists_create_manager.rb` | `includes(:geography)` |
| `availability_slots/providers_*_validator.rb` | `includes(:geography)` |
| `listings/providers_*_manager.rb` | resolve Geography; `includes(:geography)` |
| `marketplace_*_serializer.rb`, `providers_listing_*_serializer.rb` | `object.geography` |
| `lib/dev/catalog_marketplace_seeder.rb` | build Geography fixtures |

## Out of scope

- `SlugResolutionService` + route param rename (`:district_slug`/`:area_slug`) — epic step 10
- Serializer ancestor embeds + coordinates on area show — epic step 11
- `GET /marketplace/catalog/areas/near` — epic step 12
- Team geography CRUD + deactivate/reactivate/archive — FR-CAT-001/002/034
- `red-cab-web` changes
- New migrations or DBML edits
- Full `bin/rails test` green — targeted geography/provider/marketplace tests are the gate (Q3=A)

## Tasks

### API

- [ ] Add `app/domains/catalog/country.rb`
- [ ] Add `app/domains/catalog/geography.rb` (associations, enums, scopes)
- [ ] Add `app/domains/catalog/geographies/tree_validator.rb` + unit tests
- [ ] Delete `app/domains/catalog/district.rb`, `area.rb`
- [ ] Rewire `app/domains/catalog/listing.rb` → `belongs_to :geography`
- [ ] Update provider create/update request (keep `area_id`), manager, validator for Geography + `is_listable`
- [ ] Add FR-CAT-033 test: designated city (`is_listable: false`) rejected with child names
- [ ] Re-express `discoverable` on Geography; update marketplace managers
- [ ] Update serializers, timezone service, bookings includes, dev seeder
- [ ] Rewrite `test/support/catalog_geography_test_helper.rb` to insert Geography tree (C1-aware fixtures)
- [ ] Swap `JapanSeedService` `SeedGeography`/`SeedCountry` → domain models
- [ ] `bundle exec tapioca dsl`; delete stale `district.rbi` / `area.rbi`
- [ ] `bundle exec srb tc`; targeted tests (below)

### Docs

- [ ] Set this spec `status: implemented` after #133 merges
- [ ] PR triple-links: `red-cab-api#133`, `red-cab-api#130`, `Spec: docs/engineering/specs/cat/geography/api-133-refactor-geography-domain-layer.md`

## Acceptance criteria

- [ ] `Catalog::Country` and `Catalog::Geography` models match migrated schema (self-ref FKs, string enums, no model validations)
- [ ] `Catalog::Listing` uses `belongs_to :geography` / `geography_id`
- [ ] Provider create/update accept JSON `area_id` (UUID), persist `geography_id`, reject non-listable nodes per FR-CAT-033
- [ ] `Catalog::Geographies::TreeValidator` enforces parent-level ordering and no listable-under-listable
- [ ] `Catalog::Geography.discoverable` implements subtree semantics per INV-8
- [ ] Marketplace district/area managers query Geography with UUID params (no slug resolver)
- [ ] `lib/dev/catalog_marketplace_seeder.rb` and `catalog_geography_test_helper.rb` build valid geography trees
- [ ] `bundle exec srb tc` clean
- [ ] Targeted tests pass (Verification section)
- [ ] No client-authored price; no geography in quote path (`PRC-1`)

## Verification

```bash
# From red-cab-api/
bin/rails test test/domains/catalog/geographies/
bin/rails test test/domains/catalog/listings/providers_create_manager_test.rb
bin/rails test test/domains/catalog/listings/providers_update_manager_test.rb
bin/rails test test/integration/marketplace/catalog/
bin/rails test test/domains/catalog/listings/service_timezone_fetch_service_test.rb
bundle exec tapioca dsl
bundle exec srb tc
bundle exec rubocop
```

## Cross-repo dependencies

| Consumer | Dependency |
| --- | --- |
| Epic #130 steps 10–12 | Blocked on this PR for working Geography model |
| tourist-web-56 | Slug resolution (step 10) — not this PR |

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-09-21 | PKM plan agent | Approved — human verification passed (Q1–Q3=A); user confirmed 2026-09-21 |
