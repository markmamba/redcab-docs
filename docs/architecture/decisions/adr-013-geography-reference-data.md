---
title: "ADR-013: Geography Reference Data"
sidebar_label: ADR-013
sidebar_position: 13
description: Architecture decision record 013 — administrative geography without PostGIS.
---

> **Superseded in part by [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)** — Decision 2 (storage shape) and the TL;DR storage line below. Decisions 1, 3–6 remain authoritative.

## TL;DR

- Geography is **official Japanese administrative reference data** (codes + city-hall points), seeded and admin-curated inside Catalog.
- **No PostGIS, no GeoJSON polygons, no spatial extension** at Phase 1.
- **Storage shape:** see [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) (`catalog_countries` + `catalog_geographies` tree). District/Area remain discovery *roles*, not table names.

## About this document

ADR for geography reference data strategy inside Catalog.

| Topic | Document |
| --- | --- |
| Geography design | [Geography](/docs/architecture/geography) |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) |

---

## Status

Accepted (2026-08-15)

## Context

Red Cab needs nationwide District/Area navigation for discovery, listing placement, map pins, and near-me Area ranking. Options included: (a) hand-curated taxonomy, (b) GeoJSON boundary import with PostGIS, (c) official code CSV seed with point coordinates.

Product decisions (Decision Log `AMB-036`):

- Administrative semantics (not curated tourism regions).
- All Japan seeded; `INV-8` hides empty Areas.
- Designated cities as Districts; wards as Areas *(navigation/presentation — storage superseded by [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree))*.
- Pins and near-me only; no distance pricing; free-text pickup.

## Decision

1. **Seed** Districts and Areas from **全国地方公共団体コード** + government-office coordinates.
2. **Store** administrative reference data in **`catalog_countries`** + **`catalog_geographies`** — self-referencing tree with `level`, `code_system`, `external_code`, `name_kana`, materialized `path`, role flags (`is_discovery_root`, `is_listable`), and plain `latitude`/`longitude` on listable nodes. Supersedes the flat `catalog_districts` / `catalog_areas` shape described in earlier revisions of this ADR.
3. **Do not** install PostGIS or store boundary geometries in Phase 1.
4. **Do not** use GeoJSON as the seed source when CSV/point data suffices.
5. **Near-me** uses haversine over Area centroids with an `INV-8` published-listing filter.
6. **Tourism labels** attach to Listings via a future tag layer, not the Area hierarchy.

## Rationale

- Administrative Areas align with official codes — manual entry of ~1,750 rows is error-prone.
- GeoJSON polygons are the wrong tool for dropdowns, labels, and pins; they add license/maintenance cost without enabling current requirements.
- PostGIS is unnecessary at ~1,750 points; haversine on numeric columns is sufficient for near-me.
- Keeping Postgres extension-free preserves hosting flexibility (ADR-002).
- Separating tourism tags from Areas preserves a pure administrative taxonomy.

## Consequences

**Positive**

- Simple seed pipeline (CSV upsert); idempotent refresh on code revisions.
- Map pins and near-me without spatial extension.
- Clear evolution triggers documented in [Geography](/docs/architecture/geography).

**Negative**

- No automatic "which Area is this address in?" — requires geocoding + polygons (future).
- Admin must understand designated-city District model and slug collision rules.
- `catalog.dbml` and seed task are Phase 1 deliverables.

## Revisions

| Date | Change |
| --- | --- |
| 2026-09-20 | Decision 2 superseded by [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree). Storage moves to `catalog_countries` + `catalog_geographies` tree; District/Area become discovery roles. Decisions 1, 3–6 unchanged. |

## Compliance

- `INV-8`, `INV-11`, `OPR-10`, `FR-CAT-001`–`004`, `FR-CAT-032`, `FR-CAT-033`, `FR-CAT-034`, `NFR-I18N-003`, `AMB-020`, `AMB-036`
- Does **not** amend `PRC-1` or `BKG-11`
- Storage shape authoritative in [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)
