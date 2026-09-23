---
title: "Seed Japan geography from official administrative codes"
sidebar_label: API · Japan geography seed
issue: "https://github.com/markmamba/red-cab-api/issues/132"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/cat/geography/api-131-migrate-geography-schema.md (status: approved)"
  - "docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md (status: approved)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships **idempotent Japan geography seed task** (`bin/rails catalog:geography:seed`) with vendored official sources and integration test.
- Does **not** ship `Catalog::Geography` domain models, API managers, serializers, or green full test suite — epic #130 steps 9–13.
- Breaking change: **No** — additive reference data; depends on #131 schema.

## Problem

Epic #130 step 8 requires ~1,963 Japan geography rows seeded from official administrative codes with C1 discovery roots (67), listable leaves (~1,900), and idempotent upsert on `(country_id, code_system, external_code)` (`FR-CAT-001`). Schema migration (#131) creates empty `catalog_geographies`; no seed task exists.

Evidence: `redcab-docs/docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md` Seed contract §; `redcab-docs/docs/engineering/specs/cat/geography/design-review-data-model.md` §4 step 8; issue #132.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Parent spec | [docs-13-geography-administrative-tree.md](./docs-13-geography-administrative-tree.md) | Seed contract, derivation rules, row counts |
| Prerequisite | [131-migrate-geography-schema.md](./api-131-migrate-geography-schema.md) | Schema must exist; JP country row seeded |
| FR-CAT-001 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Official-code idempotent upsert |
| ADR-013 | [architecture/decisions/adr-013-geography-reference-data.md](/docs/architecture/decisions/adr-013-geography-reference-data.md) | Vendored offline sources |
| ADR-014 | [architecture/decisions/adr-014-service-timezone-model.md](/docs/architecture/decisions/adr-014-service-timezone-model.md) | `timezone` on every node |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](/docs/architecture/decisions/adr-016-geography-administrative-tree.md) | C1 discovery roots, tree levels |
| geography.md | [architecture/geography.md](/docs/architecture/patterns/geography) | Seed pipeline procedure, slug rules |
| domain-to-code-mapping | [Domain-to-code mapping](/docs/engineering/conventions/domain-to-code-mapping) | `catalog/geography/` module placement |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Scoped spec** referencing parent Seed contract | Use parent spec only | Repo spec-first; mirrors #131; codegen needs `spec_path` |
| 2 | **Anonymous AR stub** in seed service | Ship `Catalog::Geography` first | Step 9 is separate; migration already uses `MigrationGeography` pattern |
| 3 | **Service:** `Catalog::Geography::JapanSeedService` | `lib/catalog/japan_geography_seeder.rb` | `domain-to-code-mapping.md` places seed in `catalog/geography/` |
| 4 | **Manual ops task** — not wired to `db/seeds.rb` | Auto-run on deploy | Reference data; explicit operator control; parent verification uses manual invoke |
| 5 | **4-pass seed sequence** | Single-pass with recursive CTE | Matches `geography.md` procedure; parents must exist before children |
| 6 | **Row-count AC from vendored snapshot** | Issue "~1,750" literal | 2025-04-01 municipal snapshot: 1,969 total, 67 roots, 1,896 listable (integration test constants) |
| 7 | **Idempotency test: sequential double-invoke** | Barrier concurrency test | Rake re-run AC; PKM concurrency note targets HTTP managers |
| 8 | **Vendored data in same PR** | Separate data PR | Parent spec decision 10; reproducible CI |
| 9 | **MIG-* cleanup: auto-delete** | Fail-fast; document-only | Q1=A — seed deletes `external_code LIKE 'MIG-%'` before upsert |
| 10 | **Dev workflow: manual seed** | Auto-invoke in `db/seeds.rb` | Q2=A — geography seed separate from `dev:catalog:seed` in #132 |

## Data / domain touchpoints

- Bounded context: **CAT** — reference data only
- Tables written: `catalog_geographies` (reads `catalog_countries` for JP row + `default_timezone`)
- Upsert key: `(country_id, code_system, external_code)`
- No transaction boundaries across HTTP; seed runs in single rake invocation
- No snapshot changes; no pricing inputs

### Seed sources (vendored)

| File (`db/seeds/data/japan/`) | Authority | Fields used |
| --- | --- | --- |
| `municipal_codes.csv` | 全国地方公共団体コード | `external_code`, hierarchy, `name_ja`, `name_kana`, level hints |
| `prefecture_codes.json` | ISO 3166-2:JP | Prefecture `external_code` (`iso_3166_2`), `name_en` |
| `government_office_coordinates.csv` | Government-office locations | `latitude`, `longitude` on listable nodes |

Each file **must** include a provenance header comment (or companion `README.md`) with: source URL, retrieval date, and file version/hash.

### MIG-* placeholder cleanup

Before upsert, delete rows where `external_code LIKE 'MIG-%'` (throwaway #131 dev backfill keys). Official upsert keys will not match these placeholders; without cleanup, slug/path unique-index collisions are possible in polluted dev DBs.

### Pass sequence

1. **Subdivisions** — 47 prefectures: `level: subdivision`, `code_system: iso_3166_2`, `is_discovery_root: true`, `is_listable: false`
2. **Municipalities** — ~1,741 rows: `code_system: jis_x_0402`; 特別区 → `level: municipality`; designated cities → `is_discovery_root: true`, `is_listable: false`
3. **Wards** — ~175 行政区: `level: ward`, `is_listable: true`
4. **Derivation** — `slug` (homonym overrides), `path`, `discovery_root_id`, `is_listable` (leaves only), `timezone`, `display_order`, coordinates on listable nodes

### Derivation rules (post-upsert pass 4)

Per parent spec Seed contract:

1. **`path`** — materialized slug path (`kanagawa/yokohama/nishi`)
2. **`is_discovery_root`** — C1: 47 prefectures + 20 designated cities
3. **`is_listable`** — leaves only; designated cities with wards: `false`
4. **`discovery_root_id`** — nearest ancestor-or-self with `is_discovery_root = true`
5. **`slug`** — from `name_en` per `geography.md`; homonym overrides for 10 prefecture/city pairs
6. **`timezone`** — `catalog_countries.default_timezone` (`Asia/Tokyo`)
7. **`display_order`** — official code order within parent

### Homonym slug map (10 pairs)

Designated city keeps bare slug; prefecture gets `-prefecture` suffix. Reuse logic from `db/migrate/20260921140200_add_geography_to_catalog_listings.rb` (`DESIGNATED_CITY_SLUGS`, `DESIGNATED_CITY_PREFECTURE_SLUG`).

### Expected row counts

Counts track the vendored 2025-04-01 municipal snapshot (`municipal_codes.csv`). Integration test constants are authoritative.

| Category | Count |
| --- | --- |
| Subdivisions | 47 |
| Municipalities (incl. 23 特別区) | 1,747 |
| Wards | ~175 |
| **Total** | **1,969** |
| Discovery roots | 67 |
| Listable nodes (with coordinates) | 1,896 |

## Out of scope

- `Catalog::Geography` / `Catalog::Country` models (step 9)
- Marketplace/team API (steps 10–12)
- Sorbet / full test suite green (step 13)
- `db/seeds.rb` / deploy-hook auto-seed
- `dev:catalog:seed` rewrite
- Legacy test helper / marketplace integration test fixes
- Runtime download of source data
- Barrier-based concurrency test

## Tasks

### API

- [ ] Prepare vendored data files with provenance headers
- [ ] `app/domains/catalog/geography/japan_seed_service.rb` — 4-pass upsert + derivation
- [ ] `lib/tasks/catalog_geography_seed.rake` — `catalog:geography:seed`
- [ ] `test/integration/catalog/geography_seed_test.rb` — idempotency + counts

### Docs

- [x] Human verification MCQs resolved (2026-09-21: Q1=A, Q2=A)
- [x] `review-implementation-spec` — no must-fix findings (2026-09-21)
- [x] `status: approved` — human confirmed 2026-09-21
- [ ] Set `status: implemented` after #132 merges

## Acceptance criteria

- [ ] `bin/rails catalog:geography:seed` upserts 1,969 rows from vendored sources (2025-04-01 snapshot)
- [ ] Re-run produces zero duplicates on `(country_id, code_system, external_code)`
- [ ] 67 discovery roots; all listable nodes have lat/lng
- [ ] Homonym slugs correct (e.g. `kyoto` vs `kyoto-prefecture`)
- [ ] `timezone = Asia/Tokyo` on every node
- [ ] Integration test proves sequential idempotency
- [ ] Vendored files include provenance metadata

## Verification

```bash
# From red-cab-api/ — prerequisite: #131 migrated
bin/rails db:migrate
bin/rails catalog:geography:seed
bin/rails catalog:geography:seed   # second run — no new rows
bin/rails test test/integration/catalog/geography_seed_test.rb
```

## Cross-repo dependencies

| Consumer | Dependency |
| --- | --- |
| red-cab-api#130 | Epic parent — step 8 of migration sequence |
| red-cab-api#131 | Schema prerequisite — must merge first |
| Steps 9–13 | Consume seeded geography rows |
