---
title: "ADR-016: Geography Administrative Tree"
sidebar_label: ADR-016
sidebar_position: 16
description: Architecture decision record 016 — country entity and self-referencing administrative geography tree with discovery projection.
---

## TL;DR

- Geography is stored as **`catalog_countries`** (Phase 1: `JP`) plus a self-referencing **`catalog_geographies`** tree — **level** (Subdivision/Municipality/Ward) is administrative fact; **District/Area** are discovery *roles* (`is_discovery_root`, `is_listable`).
- **67 discovery roots** (47 prefectures + 20 designated cities — C1) project to the frozen Session A URL family: `/districts/{districtSlug}/areas/{areaSlug}/listings` — **no `/jp` prefix**.
- Listings attach only to **listable leaves**; designated cities are discovery roots but not listable (`FR-CAT-033`).
- Cascade and archive use materialized **`path`** prefix and **`successor_geography_id`** (`OPR-10`, `INV-11`, `FR-CAT-034`).
- **Partially supersedes ADR-013** Decision 2 (storage shape only); decisions 1, 3–6 of ADR-013 remain in force.

## About this document

ADR for the administrative geography tree inside Catalog. Supersedes the flat District/Area storage model described in [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) Decision 2.

| Topic | Document |
| --- | --- |
| Geography design | [Geography](/docs/architecture/patterns/geography) |
| Prior ADR | [ADR-013: Geography Reference Data](/docs/architecture/decisions/adr-013-geography-reference-data) |
| Service timezone | [ADR-014: Service Timezone Model](/docs/architecture/decisions/adr-014-service-timezone-model) |
| Public URL contract | [Session A — Tourist UI access model](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) |
| Blueprint | [Geography data model review](/docs/engineering/specs/cat/geography/design-review-data-model) |
| Parent epic | [red-cab-api#130](https://github.com/markmamba/red-cab-api/issues/130) |

---

## Status

Accepted (2026-09-20)

## Context

The flat `catalog_districts` / `catalog_areas` model treats prefectures and designated cities as siblings with no parent link — Yokohama is a sibling of Kanagawa, not a child. That breaks subtree cascade (`FR-CAT-002`, `OPR-10`), forces homonym slug workarounds into URLs, and cannot distinguish Tokyo's 特別区 (municipality-level) from Yokohama's 行政区 (ward-level) at the correct depth.

[Session A](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) froze the two-segment public URL family and District/Area vocabulary in payloads. Product locked **Option C** (country + self-referencing tree) and **C1** (67 discovery roots) before tourist-web-56/57/58 implementation.

[ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) remains authoritative for official-code seeding, no PostGIS, haversine near-me, and tourism-tags-on-Listings. Only its storage-shape decision is superseded here.

## Decision

1. **Add `catalog_countries`** — Phase 1 seeds one row (`JP`) with `default_timezone`, `default_locale`, and `display_currency`. No `/jp` URL segment at Phase 1; country FK exists so a ~2,000-row backfill is never required.
2. **Replace `catalog_districts` / `catalog_areas` with `catalog_geographies`** — a self-referencing tree with `parent_id`, `level` (`subdivision | municipality | ward`), and `code_system` + `external_code` as the idempotent seed upsert key (`FR-CAT-001`).
3. **Separate level from role.** `level` is administrative fact. `is_discovery_root` and `is_listable` are navigation policy:
   - **C1:** 47 prefectures + 20 designated cities = 67 nodes with `is_discovery_root = true` (today's District count).
   - **Listable leaves only:** a Listing MUST attach to a node with `is_listable = true`. A designated city is a discovery root but not listable — wards beneath it are listable (`FR-CAT-033`).
4. **Materialize `path`** — slug path (e.g. `kanagawa/yokohama/nishi`) for subtree operations via `path LIKE` prefix; no recursive CTE or ltree extension.
5. **Denormalize `discovery_root_id`** on every listable node so `(discovery_root_id, slug)` resolves Session A URLs in one indexed lookup.
6. **Slug namespaces:** slug unique among discovery roots (homonym rule: Kyoto City `kyoto`, Kyoto Prefecture `kyoto-prefecture`); slug unique within `discovery_root_id` for listable nodes.
7. **Archive on merger, never delete** — set `status = archived`, `archived_at`, and `successor_geography_id` pointing at the surviving node (`INV-11`, `FR-CAT-034`). Archived geography returns successor reference for redirects; rows are never deleted.
8. **Cascade deactivation** — deactivating or archiving a geography node MUST set all Listings in its subtree (`path` prefix match) to `Unlisted` after Admin confirmation stating the affected count (`OPR-10`, `FR-CAT-002`).
9. **Store coordinates on listable nodes** — `latitude`/`longitude` (city-hall point, plain `numeric`, no PostGIS) required when `is_listable`; used for map pins and near-me (`FR-CAT-032`).
10. **Store `timezone` on every geography node** — IANA string, NOT NULL, seeded from `catalog_countries.default_timezone` ([ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model)). Listings inherit via `geography_id`.
11. **Rename listing FK** — `catalog_listings.geography_id` replaces `area_id`; JSON payload keys `district_id` / `area_id` remain as API surface vocabulary (Session A).
12. **Public URLs unchanged** — `/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]` is a projection of the tree, not a storage shape. No `/jp` prefix until a second country ships.

## Rationale

- A strict tree fixes the Kanagawa/Yokohama sibling bug while preserving C1 navigation (Yokohama stays a top-level discovery root in the UI).
- Level vs role split lets Session A vocabulary (District/Area) coexist with correct administrative depth (特別区 vs 行政区).
- `path` + `successor_geography_id` mechanize `OPR-10` and `INV-11` without per-table merger columns.
- `catalog_countries` now avoids a costly backfill and URL-prefix decision at country two.
- CHECK constraints + ActiveModel validators carry referential rules that a three-table design would encode with typed FKs.

## Consequences

**Positive**

- Correct cascade, breadcrumb ancestors, and slug resolution in one schema pass (Session A §5 API gap).
- Near-me (`FR-CAT-032`) and official-code seed (`FR-CAT-001`) become implementable — upsert key and coordinates live on `catalog_geographies`.
- Third navigation level is additive (new `level` value + rows), not a new table.
- Multi-country expansion is a country row + FK, not a schema revamp.

**Negative**

- Migration drops `catalog_districts` / `catalog_areas` — safe only before seed and indexed URLs land (epic [#130](https://github.com/markmamba/red-cab-api/issues/130)).
- Providers must pick a listable leaf (ward under a designated city), not the city node itself — new validation surface.
- Weaker referential strictness than a three-table design — mitigated by CHECK + validator enforcement.

**Target model vs shipped schema**

The decisions above describe the **target model**. The shipped API schema still uses `catalog_districts` / `catalog_areas` with minimal columns until epic [#130](https://github.com/markmamba/red-cab-api/issues/130) lands migrations, seed, and slug-resolution managers. Planning docs after this ADR describe the target; code catches up via the approved implementation spec.

## Compliance

- `INV-8` (subtree discoverability — query-time, never stored), `INV-11` (successor on archive), `OPR-10` (`path` prefix cascade)
- `FR-CAT-001`–`004`, `FR-CAT-033`, `FR-CAT-034`, `FR-CAT-032`, `NFR-I18N-003`, `AMB-020`
- Partially supersedes [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) Decision 2; amends [ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model) timezone column placement
- Session A URL family preserved — [SESSION-A-DECISION-RECORD](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture)
- Does **not** amend `PRC-1` (pricing authority) or `BKG-11` (free-text pickup/dropoff)

## Related decisions

| ADR | Relationship |
| --- | --- |
| ADR-013 | Partially superseded — storage shape only; seed source, no PostGIS, near-me, tags-on-Listings preserved |
| ADR-014 | `timezone` moves from `catalog_areas` to `catalog_geographies`; snapshot semantics unchanged |
| ADR-006 | `service_timezone` snapshot on CheckoutSession/Booking unchanged |
