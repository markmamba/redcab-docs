---
title: "Add the region level to the geography tree and seed it"
sidebar_label: API · Region level
issue: "https://github.com/markmamba/red-cab-api/issues/203"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#region-level"
  - "docs/30-49-domains/38-catalog/models/geography.md"
---

## TL;DR

- Ships the `region` level: one migration, model and validator changes, a seed of 9 regions, and a `path` rebuild.
- Does NOT ship listing destinations, new endpoints, new URLs or web pages.
- Breaking change: No for marketplace payloads, and Yes for the team geography payload (`path`, `parent_id`, `level`).

## Problem

The geography tree has three levels today, so a region above the prefecture cannot exist.

One CHECK rule allows a missing parent only for a prefecture.

Another CHECK rule blocks a listable prefecture, but not a listable region.

The slug index covers discovery roots only, but Hokkaido is both a region slug and a prefecture slug.

`Catalog::Geographies::AncestorsFetchService` builds ancestors from the `path` segments, so a region prefix changes its result.

Evidence: `db/schema.rb` lines 309 to 311, `app/domains/catalog/geographies/japan_seed_service.rb`, `app/domains/catalog/geographies/ancestors_fetch_service.rb`.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Region level](/docs/30-49-domains/catalog/catalog-decisions/#region-level) | Four levels, 9 regions, `redcab_region` codes |
| Model | [Geography model](/docs/30-49-domains/catalog/models/geography) | Tree rules, `path`, slug and `popular_rank` rules |
| Record | [Region is the top level of the geography tree](/docs/30-49-domains/catalog/architecture-decisions/region-level) | Why, and the alternatives that were rejected |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column and CHECK truth. Tags `ships in: S1` mark this slice |
| FR-CAT-001 | [Functional requirements — CAT](/docs/70-79-business/requirements/functional-requirements/cat) | Idempotent seed with official codes |
| ADR-013 | [Geography reference data](/docs/30-49-domains/architecture-decisions/adr-013-geography-reference-data) | Vendored offline seed data, no download at runtime |
| ADR-014 | [Service timezone model](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model) | Every node has a timezone |
| ADR-016 | [Geography administrative tree](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree) | Partly replaced: the tree gets a fourth level |
| INV-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | A node shows only with a discoverable listing below it |
| AMB-036 | [Open questions](/docs/70-79-business/planning/open-questions) | Resolved. The 67 discovery roots stay. The region level is added above them by the ruling |
| INV-11, OPR-10 | [Invariants](/docs/70-79-business/business-rules/invariants) | Archive keeps history. Deactivation unlists the subtree by `path` prefix |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **One PR holds the migration, the backfill, the model, the validators, the seed and the test fixes** | Schema first, seed in a later PR | The new parent CHECK fails until every prefecture has a region parent. One PR keeps `main` runnable. |
| 2 | **One migration file with `up` and `down`, in one transaction** | A schema migration plus a data migration | PostgreSQL runs DDL in a transaction, so a failure leaves the old tree whole. |
| 3 | **The mapping lives in two CSV files that the migration and the seed both read** | A constant in code, or a copy inside the migration | One source of truth. The files are reviewable and follow the offline data rule of ADR-013. |
| 4 | **Region rows get `is_discovery_root: false`, no `discovery_root_id`, no coordinates, and the country default timezone** | Copy the prefecture rules | Rules of the geography model (DP-2g). Regions are never booking locations. |
| 5 | **Park every `path` first, then rebuild all paths with one recursive query** | Update row by row in place | A region `hokkaido` would collide with the prefecture path `hokkaido` on the unique index. |
| 6 | **Keep the name `catalog_geographies_parent_level_consistency` with the new expression, and rename the listable rule to `catalog_geographies_listable_municipality_or_ward`** | Keep both old names | The old listable name would say "not subdivision", which is no longer the full rule. |
| 7 | **Add a partial unique index on `level` and `slug` for regions and prefectures** | Unique on `parent_id` and `slug` | `NULL` parents are distinct in PostgreSQL, so regions would not be protected. |
| 8 | **Add `popular_rank` with a CHECK for prefectures only, and set no rank in this slice** | Seed ranks now | The popular list is a content decision for the home page work. |
| 9 | **`AncestorsFetchService` skips region nodes** | Include the region and change the web at the same time | The legacy district and area payloads must not change in this slice. The new pages come later. |
| 10 | **`TreeValidator` allows `region` → `subdivision` only, and `subdivision` keeps `municipality` and `ward`** | Allow a region parent for every level | Every prefecture needs a region parent, and a region holds only prefectures. |
| 11 | **Team create: a region has no parent, and every other level needs a parent** | Block region creation in the team API | The seed owns regions, but the team API stays consistent with the CHECK rules. |
| 12 | **The test helper `create_catalog_district` makes a default region parent** | Change all 51 calls in 38 test files | One helper change keeps the diff small and the paths valid. |
| 13 | **Keep `is_discovery_root`, `discovery_root_id` and the old indexes** | Remove them now | Legacy routes still read them until slice S9. |
| 14 | **`down` removes the regions, clears the prefecture parents and restores the old paths** | No rollback | A rollback keeps the team able to undo a bad deploy. |

## API contract

No new endpoint ships, and the changes below are in existing team payloads.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/team/catalog/geographies` | JWT admin | | `level` may be `region`. `path` starts with the region slug. The `parent_id` of a prefecture is the region UUID. | Filter by `level=region` works through the enum. |
| GET | `/team/catalog/geographies/:geography_id` | JWT admin | | Same fields | |
| POST | `/team/catalog/geographies` | JWT admin | `level` accepts `region` and `code_system` accepts `redcab_region` | A region needs no parent. A prefecture needs a region parent. | Error: "Subdivision nodes need a region parent." |
| GET | `/marketplace/catalog/districts` and the area routes | none | | Unchanged. Ancestor lists do not include regions. | Covered by existing tests |

### Files to create or modify (API)

- `db/migrate/{timestamp}_add_region_level_to_catalog_geographies.rb`
- `db/seeds/data/japan/regions.csv` and `db/seeds/data/japan/prefecture_regions.csv`
- `db/seeds/data/japan/README.md` (two rows for the new files)
- `app/domains/catalog/geography.rb` (enum values)
- `app/domains/catalog/geographies/japan_seed_service.rb`
- `app/domains/catalog/geographies/tree_validator.rb`
- `app/domains/catalog/geographies/team_create_validator.rb`
- `app/domains/catalog/geographies/ancestors_fetch_service.rb`
- `app/domains/catalog/team_geography_serializer.rb` (no field change; check the tests)
- `test/support/catalog_geography_test_helper.rb`
- `test/integration/catalog/geography_seed_test.rb` and the geography domain tests
- `sorbet/rbi/dsl/catalog/geography.rbi` (regenerate)
- `docs/db/catalog.dbml` and `docs/db/redcab.dbml` (remove the `ships in: S1` tags)
- `db/schema.rb` (regenerated)

## Data / domain touchpoints

- Bounded context: CAT.
- Transaction boundaries: the migration runs in one transaction, and the seed task runs in one transaction.
- Snapshots: none, because Bookings copy `service_timezone` and never read `path`.
- Cross-context: none, because the Bookings tables do not refer to the geography `path`.

### Region seed data

The file `regions.csv` has these rows, with codes in the code system `redcab_region` and the country default timezone.

| Code | Slug | Name (en) | Name (ja) | Prefectures |
| --- | --- | --- | --- | --- |
| 01 | `hokkaido` | Hokkaido | 北海道 | 01 |
| 02 | `tohoku` | Tohoku | 東北 | 02 to 07 |
| 03 | `kanto` | Kanto | 関東 | 08 to 14 |
| 04 | `chubu` | Chubu | 中部 | 15 to 23 |
| 05 | `kansai` | Kansai | 関西 | 24 to 30 |
| 06 | `chugoku` | Chugoku | 中国 | 31 to 35 |
| 07 | `shikoku` | Shikoku | 四国 | 36 to 39 |
| 08 | `kyushu` | Kyushu | 九州 | 40 to 46 |
| 09 | `okinawa` | Okinawa | 沖縄 | 47 |

The file `prefecture_regions.csv` has 47 rows with the columns `prefecture_code` and `region_code`.

A prefecture code is the two-digit ISO 3166-2:JP number, which is the `external_code` of the prefecture row.

- The split is the usual eight-region split of Japan, with Okinawa separate.
- Mie (24) is in Kansai by owner ruling on 2026-10-24.
- All other border prefectures follow the usual split, and Fukui (18) stays in Chubu.

### Migration steps

1. Add `popular_rank` (integer, null) with a column comment.
2. Drop the two old CHECK rules.
3. Set every `path` to `pending/legacy/{id}` so that final paths cannot collide.
4. When prefecture rows exist, insert the 9 regions and set each prefecture `parent_id` from `prefecture_regions.csv`.
5. Rebuild every `path` with a recursive query: region slug, then each child slug.
6. Add the new CHECK rules: parent consistency, listable municipality or ward, and `popular_rank` for prefectures only.
7. Add the unique index on `level` and `slug` for regions and prefectures, and the partial index on `parent_id` and `popular_rank`.
8. Update the column comments for `level`, `code_system`, `parent_id`, `path` and `is_listable`.

A database with no geography rows gets steps 1, 2, 6, 7 and 8 only.

The seed task then creates the regions.

### Seed service changes

- Add `upsert_regions!` before `upsert_subdivisions!`, with the same upsert key of `country_id`, `code_system` and `external_code`.
- Give each prefecture the region as `parent_id`.
- Derive the region slug from `regions.csv`, and keep the existing slug rules for the other levels.
- Add a placeholder path for regions, and let `derive_fields!` rebuild all paths with the region prefix.
- Fail with a clear message when a prefecture has no row in `prefecture_regions.csv`.

## Out of scope

- Listing destinations and the rename of `geography_id`.
- New marketplace endpoints, URLs, redirects and web pages.
- Region images, `popular_rank` values and the home page.
- Removing `is_discovery_root`, `discovery_root_id` and the old indexes.
- Team portal screens for regions.

## Tasks

### API

- [ ] Add the two CSV files and the README rows.
- [ ] Add the migration with `up` and `down`.
- [ ] Add `region` and `redcab_region` to the enums of `Catalog::Geography`.
- [ ] Update `Catalog::Geographies::JapanSeedService` for regions and the region prefix.
- [ ] Update `TreeValidator` and `TeamCreateValidator`.
- [ ] Make `AncestorsFetchService` skip region nodes.
- [ ] Update `create_catalog_district` and add `create_catalog_region` in the test helper.
- [ ] Update the seed test and add the tests listed in the acceptance criteria.
- [ ] Run `bin/rails db:migrate`, then `bundle exec tapioca dsl Catalog::Geography`.
- [ ] Run `bin/rails db:seed` in development to check the dev marketplace seeder.
- [ ] Remove the `ships in: S1` tags from `docs/db/catalog.dbml` and `docs/db/redcab.dbml`.

### Web

- [ ] None, because the web app does not read the geography level or `path`.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

These criteria cover the four criteria of issue #203, the ruling Region level and `FR-CAT-001`.

- [ ] The seed creates 9 regions with codes 01 to 09, and every prefecture has a region parent.
- [ ] The seed creates 1978 rows, which is the 1969 old rows plus 9 regions.
- [ ] A second seed run changes no row count.
- [ ] Mie (code 24) has the parent Kansai, and Okinawa (47) has the parent Okinawa.
- [ ] The path of Tokyo is `kanto/tokyo`, and the path of Nishi ward in Yokohama is `kanto/kanagawa/yokohama/nishi`.
- [ ] A lookup by the path `kansai/tokyo` returns no row.
- [ ] A region has no coordinates, is not a discovery root, and has the timezone `Asia/Tokyo`.
- [ ] The database rejects a prefecture with no parent, a region with a parent and a listable region.
- [ ] The database rejects a `popular_rank` on a municipality.
- [ ] The unique index allows a region and a prefecture with the slug `hokkaido`.
- [ ] The unique index rejects two regions with the slug `hokkaido`.
- [ ] The migration on a database with 1969 old rows gives 1978 rows and valid constraints.
- [ ] No path starts with `pending/` after the migration.
- [ ] `db:rollback` restores 1969 rows and the old paths.
- [ ] `Catalog::Geography.discoverable` returns a region when a published listing sits below it.
- [ ] The marketplace district and area endpoints return the same JSON as before, and ancestor lists have no region.
- [ ] Team create accepts a region without a parent, and rejects a prefecture without a region parent.
- [ ] Integration test: `test/integration/catalog/geography_seed_test.rb`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc`, `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:migrate
bin/rails db:rollback && bin/rails db:migrate
bin/rails catalog:geography:seed
bin/rails runner 'puts Catalog::Geography.level_region.count; puts Catalog::Geography.find_by!(path: "kanto/tokyo").parent.name_en'
bin/rails test test/integration/catalog/geography_seed_test.rb test/domains/catalog/geographies
bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-24 | principal developer request | `review-implementation-spec` (Claude Sonnet 5.5) | Recommend approve. No must-fix. Applied 3 should-fix items: AMB-036 row, acceptance lead line, dev seeder task. Owner approval pending. |
