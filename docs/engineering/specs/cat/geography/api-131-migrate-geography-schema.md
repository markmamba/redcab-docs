---
title: "Migrate geography schema to catalog_countries and catalog_geographies"
sidebar_label: API · Geography migration
issue: "https://github.com/markmamba/red-cab-api/issues/131"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md (status: approved)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships **database migrations only** for geography schema cutover: `catalog_countries`, `catalog_geographies`, `catalog_listings.geography_id`, drop flat tables.
- Does **not** ship domain models, seed task, API managers, serializers, Sorbet, or green test suite — epic #130 steps 8–13.
- Breaking change: **Yes** — `area_id` removed; app/tests break until follow-on PRs land.

## Problem

Flat `catalog_districts` / `catalog_areas` cannot express the ADR-016 administrative tree. Epic #130 requires schema migration before seed and domain code. Issue #131 implements spec [docs-13-geography-administrative-tree.md](./docs-13-geography-administrative-tree.md) migration sequence steps 2–7 only.

Evidence: `red-cab-api/docs/db/catalog.dbml` (flat tables), `db/migrate/20260802103200_create_catalog_districts.rb`, `db/migrate/20260802105200_create_catalog_areas.rb`, `db/migrate/20260802110300_create_catalog_listings.rb` (`area_id` FK).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Parent spec | [docs-13-geography-administrative-tree.md](./docs-13-geography-administrative-tree.md) | Authoritative §3.4 columns, indexes, CHECK constraints, migration steps 2–7 |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](/docs/architecture/decisions/adr-016-geography-administrative-tree.md) | Tree shape, C1 discovery roots |
| ADR-014 | [architecture/decisions/adr-014-service-timezone-model.md](/docs/architecture/decisions/adr-014-service-timezone-model.md) | `timezone` on every geography node |
| Geography review | [/docs/engineering/specs/cat/geography/design-review-data-model](/docs/engineering/specs/cat/geography/design-review-data-model.md) | §4 backfill mapping when legacy rows exist |
| INV-8, INV-11 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Listing location; archive never delete |
| Backend conventions | [Backend conventions](/docs/engineering/conventions/backend) | `timestamptz`, string enums, explicit FKs |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Scope = migrations + catalog.dbml only** | Include minimal AR stubs | Issue text; intentional breakage until step 9 |
| 2 | **4 migration files** | 1 combined file | Q1=A; rollback granularity; FK dependency order |
| 3 | **JP seed in countries migration** | Separate data migration | Parent spec step 2 |
| 4 | **UUID via `SecureRandom.uuid`** | Fixed deterministic UUID | Repo migration precedent |
| 5 | **Backfill gate = `catalog_areas` row count > 0** | `Rails.env` check | Data-driven; greenfield skips |
| 5b | **Full backfill when rows exist** | Fail-fast abort | Q2=A; map per review §4 step 5 |
| 6 | **Listings step order** | Swap index before NOT NULL | Must remove area FK before dropping `catalog_areas` |
| 7 | **Partial indexes via `where:` clause** | Raw SQL only | Rails 7+ supports partial uniques |
| 8 | **Update both DBML files** | Defer `redcab.dbml` | Q3=B; prevent aggregated drift |

## Data / domain touchpoints

- Bounded context: **CAT**
- Tables created: `catalog_countries`, `catalog_geographies`
- Tables dropped: `catalog_districts`, `catalog_areas`
- Column change: `catalog_listings.area_id` → `catalog_listings.geography_id` (NOT NULL FK → `catalog_geographies`)
- No transaction boundaries; no snapshot changes
- Domain code continues referencing `Catalog::Area` until epic step 9 — expected runtime failure after merge

### `catalog_countries` columns

Per parent spec §3.4: `uuid`, `code`, `name_en`, `name_ja`, `default_timezone`, `default_locale`, `display_currency`, `display_order`, `status`, `created_at`, `updated_at`. Seed one row: `JP`.

### `catalog_geographies` columns

Per parent spec §3.4: all self-referencing FKs, level/code/slug/path fields, coordinates, timezone, discovery/listable flags, lifecycle timestamps, indexes, CHECK constraints.

### CHECK constraints (named)

| Name suffix | Expression |
| --- | --- |
| `parent_level_consistency` | `(parent_id IS NULL) = (level = 'subdivision')` |
| `listable_requires_coordinates` | `NOT is_listable OR (latitude IS NOT NULL AND longitude IS NOT NULL)` |
| `listable_not_subdivision` | `NOT is_listable OR level <> 'subdivision'` |
| `successor_not_self` | `successor_geography_id IS NULL OR successor_geography_id <> id` |
| `active_lifecycle_clean` | `status <> 'active' OR (deactivated_at IS NULL AND archived_at IS NULL AND successor_geography_id IS NULL)` |
| `deactivated_lifecycle` | `status <> 'deactivated' OR (deactivated_at IS NOT NULL AND archived_at IS NULL AND successor_geography_id IS NULL)` |
| `archived_lifecycle` | `status <> 'archived' OR (archived_at IS NOT NULL AND successor_geography_id IS NOT NULL)` |

### Partial indexes

| Index name | Columns | WHERE |
| --- | --- | --- |
| `index_catalog_geographies_on_discovery_root_slug` | `slug` UNIQUE | `is_discovery_root = true` |
| `index_catalog_geographies_on_root_and_slug` | `(discovery_root_id, slug)` UNIQUE | `is_listable = true` |
| `index_catalog_geographies_on_coordinates` | `(latitude, longitude)` | `is_listable = true AND status = 'active'` |

### Listings migration sequence

1. `add_reference :catalog_listings, :geography, null: true, foreign_key: { to_table: :catalog_geographies }`
2. If `catalog_areas` rows exist → **full backfill** (Q2=A):
   - Prefecture districts → `level: subdivision`, `is_discovery_root: true`, `parent_id: NULL`
   - Designated-city districts → `level: municipality`, `is_discovery_root: true`, `parent_id` resolved by prefecture name match
   - Areas → `level: municipality` or `ward`, `is_listable: true`, `discovery_root_id` set to nearest root ancestor
   - Copy slug, names, display_order, status, timezone from flat rows; set placeholder coordinates (0,0) only if required by CHECK (prefer skipping non-listable intermediates)
   - `UPDATE catalog_listings SET geography_id = mapped_geography.id FROM ... WHERE area_id = catalog_areas.id`
3. `change_column_null :catalog_listings, :geography_id, false`
4. `remove_index` `(area_id, status)`
5. `remove_reference :catalog_listings, :area, foreign_key: true`
6. `add_index` `(geography_id, status)`

## Out of scope

- `Catalog::Geography` / `Catalog::Country` models (step 9)
- Seed task and vendored Japan data (step 8)
- Marketplace/team API changes (steps 10–12)
- Sorbet RBI / `bundle exec srb tc` green (step 13)
- `docs/db/redcab.dbml` (Q3=B — sync in same PR)
- Test suite green in this PR

## Tasks

### API

- [ ] `20260921140000_create_catalog_countries.rb` — table + JP seed
- [ ] `20260921140100_create_catalog_geographies.rb` — full DDL
- [ ] `20260921140200_add_geography_to_catalog_listings.rb` — repoint + index swap
- [ ] `20260921140300_drop_catalog_areas_and_districts.rb` — drop flat tables
- [ ] Update `docs/db/catalog.dbml`
- [ ] Update `docs/db/redcab.dbml`

### Docs

- [ ] Set this spec `status: implemented` after #131 merges
- [ ] PR triple-links: `red-cab-api#131`, `red-cab-api#130`, `Spec: docs/engineering/specs/cat/geography/api-131-migrate-geography-schema.md`

## Acceptance criteria

- [ ] Migrations match parent spec steps 2–7
- [ ] `bin/rails db:migrate` clean on fresh database
- [ ] `db/schema.rb` contains no `catalog_areas`, `catalog_districts`, or `area_id` on listings
- [ ] `docs/db/catalog.dbml` reflects new geography tables
- [ ] `docs/db/redcab.dbml` catalog section matches `catalog.dbml`
- [ ] **Not required in #131:** `bin/rails test` green; seed row counts; API behavior

## Verification

```bash
# From red-cab-api/
bin/rails db:drop db:create db:migrate
rg 'catalog_areas|catalog_districts' db/schema.rb   # expect no matches
rg 'area_id' db/schema.rb                           # expect no matches on listings
```

## Reference migrations

- `db/migrate/20260830140000_migrate_payments_to_provider_neutral_refs.rb` — nullable → backfill → NOT NULL → remove old column
- `db/migrate/20260823130000_add_service_timezone_columns.rb` — join backfill via `catalog_listings.area_id`
- `db/migrate/20260802112400_create_catalog_availability_slots.rb` — `add_check_constraint` pattern
- `db/migrate/20260725130000_redesign_identity_role_profiles.rb` — multi-step structural rewrite
