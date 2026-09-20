---
title: Geography
sidebar_position: 8
description: Administrative geography model, seeding, map features, and spatial evolution triggers for Red Cab Marketplace.
---

## TL;DR

- **District** and **Area** are discovery *roles* on a self-referencing administrative tree — not table names ([ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)).
- **Subdivision / Municipality / Ward** are administrative *levels* (`catalog_geographies.level`).
- Geography is **seeded from official administrative codes** (JIS X 0402), not hand-authored from scratch.
- Stored as **codes + city-hall centroids** on listable nodes; **no PostGIS** and **no boundary polygons** at Phase 1.
- Public URLs are a **two-segment projection** of the tree: `/districts/{districtSlug}/areas/{areaSlug}/listings` (Session A — unchanged).
- Tourism labels (Ginza, Fuji Five Lakes) are a **future tag layer on Listings**, not geography nodes.

## About this document

Authoritative geography design for the Catalog Geography module. Business rules remain in [Business Rules](/docs/business-rules/invariants); target storage shape in [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) and `red-cab-api/docs/db/catalog.dbml` (after epic [#130](https://github.com/markmamba/red-cab-api/issues/130)).

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| ADR | [ADR-016: Geography Administrative Tree](/docs/architecture/decisions/adr-016-geography-administrative-tree), [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) |
| Service timezone | [ADR-014: Service Timezone Model](/docs/architecture/decisions/adr-014-service-timezone-model) |
| Public URL contract | [Session A decision record](/docs/roadmap/notes/SESSION-A-DECISION-RECORD) |
| FRs | [CAT functional requirements](/docs/requirements/functional-requirements/cat) |
| Decision Log | [Open Questions](/docs/ambiguities/open-questions) (`AMB-036`) |

---

## Ubiquitous language

Two vocabularies describe the same entity (`catalog_geographies`), each precise in its layer:

| Layer | Terms | Meaning |
| --- | --- | --- |
| **Discovery** (UI, URLs, JSON) | **District**, **Area** | Session A vocabulary — frozen. A **District** is a node with `is_discovery_root = true`. An **Area** is a listable node (`is_listable = true`) within a District's discovery namespace. |
| **Administrative** (seed, DB, admin) | **Subdivision**, **Municipality**, **Ward** | `level` enum values. Japan Phase 1: 47 subdivisions (都道府県), ~1,741 municipalities (市町村 + Tokyo's 23 特別区), ~175 wards (行政区 of designated cities). |

| Term | Meaning |
| --- | --- |
| **Discovery root** | A geography node with `is_discovery_root = true` — may appear as the `{districtSlug}` URL segment. Phase 1 Japan (C1): 47 prefectures + 20 designated cities = **67 roots**. |
| **Listable node** | A geography node with `is_listable = true` — a Listing may attach here. Leaves only: municipalities without wards, plus all 行政区. A designated city is a discovery root but **not** listable. |
| **External code** | Official administrative code — 2-digit prefecture or 5-digit 全国地方公共団体コード (JIS X 0402). Stable seed upsert key with `code_system`; never reused when retired. |
| **Centroid** | `latitude`/`longitude` of the **municipal government office** (市区町村役場), not a polygon centroid. Required on listable nodes; used for map pins and near-me distance. |
| **Path** | Materialized slug path (e.g. `kanagawa/yokohama/nishi`). Subtree ops use `path LIKE` prefix — cascade, archive, and descendant queries without recursive CTE. |
| **Successor geography** | When a node is archived by merger (`INV-11`), `successor_geography_id` points at the surviving node — drives 301 redirects and Listing re-placement (`FR-CAT-034`). |
| **Tourism tag** | *(Future)* A curated label (e.g. Ginza, Fuji Five Lakes) attached to Listings many-to-many — **not** a geography node. |

`INV-8` is enforced at query time: a discovery root or listable node with zero `Published` Listings anywhere in its subtree MUST NOT be presented to Tourists — never a stored flag.

### Designated cities — presentation vs storage

Twenty municipalities are **政令指定都市**. In **navigation** (C1), each designated city is a **District** (discovery root) alongside its parent prefecture — Yokohama appears at the top level, not nested under Kanagawa in the district list.

In **storage**, designated cities are **municipality**-level children of their prefecture subdivision. Their wards are **ward**-level listable nodes.

Examples:

| Case | Storage path | Discovery URL |
| --- | --- | --- |
| Tokyo-to → Shinjuku-ku (特別区) | `tokyo/shinjuku` — municipality child of subdivision | `/districts/tokyo/areas/shinjuku/listings` |
| Kanagawa → Yokohama → Nishi-ku | `kanagawa/yokohama/nishi` — ward under designated city | `/districts/yokohama/areas/nishi/listings` |
| Osaka → Chuo-ku | `osaka/chuo` — ward under designated city | `/districts/osaka/areas/chuo/listings` |

Yokohama is `is_discovery_root = true` **and** `parent_id` points at Kanagawa — so deactivating Kanagawa cascades to Nishi-ku's Listings via `path LIKE 'kanagawa/%'`, while the public URL keeps Yokohama as the district segment.

### Slug collision rule (10 prefecture/city homonyms)

Ten designated cities share a name with their prefecture. Slug must be **unique among discovery roots** — the city keeps the bare slug; the prefecture is qualified:

| Discovery root | `slug` | `name_en` |
| --- | --- | --- |
| Kyoto City | `kyoto` | Kyoto |
| Kyoto Prefecture | `kyoto-prefecture` | Kyoto Prefecture |

Listable nodes are unique within their `discovery_root_id` (e.g. Nishi-ku under Yokohama vs Midori-ku under Sagamihara).

---

## What geography is **not**

- **Not a GIS boundary store** — no GeoJSON import, no `ST_Contains`, no PostGIS extension at Phase 1.
- **Not a pricing input** — distance never enters `calculate_quote` (`PRC-1`).
- **Not pickup/dropoff resolution** — Fulfillment Payload addresses remain free text (`BKG-11`).
- **Not provider coverage** — a Listing sits in one listable node; providers do not declare service polygons.
- **Not a country URL prefix** — Phase 1 has no `/jp` segment; `catalog_countries` exists for FK and defaults only.

---

## Label conventions (`NFR-I18N-003`)

| Field | Convention | Example (新宿区) |
| --- | --- | --- |
| `name_ja` | Official Japanese with type suffix | 新宿区 |
| `name_kana` | Source kana from seed data | しんじゅくく |
| `name_en` | Bare Hepburn romanization (no suffix) | Shinjuku |
| `slug` | Derived from `name_en`, lowercased | `shinjuku` |

Ambiguity across listable nodes (e.g. multiple 中央区) is resolved at render time by the discovery root ("Chuo, Osaka"). Commercially important labels remain admin-editable after seed.

`display_order` defaults to official code order (Hokkaido 01 → Okinawa 47).

---

## Storage shape (summary)

See [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) §Decision and `red-cab-api/docs/db/catalog.dbml` for authoritative columns.

**Target model** (epic [#130](https://github.com/markmamba/red-cab-api/issues/130)):

**`catalog_countries`** — Phase 1: one row (`JP`) with `code`, `name_en`/`name_ja`, `default_timezone` (`Asia/Tokyo`), `default_locale` (`ja`), `display_currency` (`JPY`).

**`catalog_geographies`** — self-referencing tree:

| Column group | Purpose |
| --- | --- |
| Tree | `country_id`, `parent_id`, `level`, `path` |
| Codes | `code_system`, `external_code` — seed upsert key |
| Discovery | `is_discovery_root`, `is_listable`, `discovery_root_id`, `slug` |
| Labels | `name_en`, `name_ja`, `name_kana`, `display_order` |
| Location | `latitude`, `longitude` (required when `is_listable`) |
| Operations | `timezone` (IANA, NOT NULL, seeded from country default — [ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model)) |
| Lifecycle | `status`, `archived_at`, `successor_geography_id` |

**`catalog_listings.geography_id`** — FK to a listable node (`is_listable = true`). Replaces `area_id`.

Coordinates are plain `numeric`; partial index on `(latitude, longitude) WHERE is_listable` for near-me (~1,900 rows).

> **Shipped schema gap.** Until epic [#130](https://github.com/markmamba/red-cab-api/issues/130) lands, the API still uses `catalog_districts` / `catalog_areas` with minimal columns. This document and ADR-016 describe the **target model**; implementation follows the approved geography implementation spec.

---

## Seed pipeline

### Sources (text/CSV — not GeoJSON)

1. **全国地方公共団体コード** (総務省) — codes, kanji, kana
2. **Government office locations** — city-hall lat/lng (not polygon centroids)
3. **ISO 3166-2:JP** — prefecture English names

### Procedure

1. Upsert `catalog_countries` (`JP`).
2. Upsert subdivisions (47 prefectures) — `level = subdivision`, `is_discovery_root = true`, `is_listable = false`.
3. Upsert municipalities (~1,741) — set `parent_id`, `path`, `discovery_root_id`. Designated cities: `is_discovery_root = true`, `is_listable = false`. Tokyo 特別区: `level = municipality`, `is_listable = true` (no ward children). Other municipalities without wards: `is_listable = true`.
4. Upsert wards (~175 行政区 of designated cities) — `level = ward`, `is_listable = true`, `discovery_root_id` = designated-city ancestor.
5. Set `timezone` from `catalog_countries.default_timezone` on every node (Phase 1: `Asia/Tokyo`).
6. Set `status = active`; **do not delete** retired codes — archive on merger with `successor_geography_id` (`INV-11`, `FR-CAT-034`).
7. Idempotent upsert keyed on `(country_id, code_system, external_code)`.

### What to skip

- **郡 (gun)** — appear in addresses but are not governing bodies; no Listing attaches to them.
- **北海道振興局** — administrative grouping, not a navigation unit.

### Admin workflow shift (`FR-CAT-001`)

Phase 1 admin **curates seeded geography** (edit labels, reorder, deactivate/archive with successor) rather than creating taxonomy from scratch. Create remains available for exceptional cases.

---

## Discovery and search

### Primary navigation (`FR-CAT-004`, `AMB-020`)

Tourists browse **District → Area → Listings**. Service type is a filter, not primary IA.

The two-level navigation is a **projection** of a deeper administrative tree — not the storage shape. Public URLs:

```
/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]
```

- `{districtSlug}` resolves to a node with `is_discovery_root = true`.
- `{areaSlug}` resolves to a listable node within that discovery root's namespace (`discovery_root_id` + `slug`).
- Listing segment is UUID at Phase 1 (no listing slug column).
- Slug is the public lookup key for districts and areas (Session A §5 — delivered by geography epic [#130](https://github.com/markmamba/red-cab-api/issues/130)).

### Near me (`FR-CAT-032`)

1. Browser geolocation provides user coordinates (client-side).
2. API ranks **listable nodes** that have ≥1 published listing in their subtree (`INV-8`) by haversine distance to centroid.
3. No PostGIS; partial index scan over ~1,900 listable rows is acceptable.

### Map features (Phase 1)

- **Pins only** — discovery-root centroids (optional) and listable-node centroids for listing locations.
- No shaded boundaries, no route display, no map-based browse.
- Boundary rendering (if ever needed) uses pre-simplified TopoJSON on a CDN — not Postgres geometry queries.

---

## Tourism tags (future)

Curated tourism regions (Ginza, Fuji Five Lakes, Narita Airport, Niseko) **do not fit** the administrative hierarchy:

- Ginza spans chōme inside one ward.
- Fuji Five Lakes spans multiple municipalities across a prefecture boundary.

**Future design:** `catalog_tags` (or similar) many-to-many with Listings. Not geography nodes. Sequence into Phase 2 — not optional long-term.

---

## PostGIS evolution triggers

Add PostGIS only when a **documented product requirement** appears — each needs its own ADR:

| Trigger | Example |
| --- | --- |
| Provider service-area polygons | Validate pickup against declared coverage |
| Distance/zone pricing | Per-km fares (`PRC-1` amendment) |
| Structured geocoded addresses | Amend `BKG-11`; point-in-polygon lookup |
| Shaded boundary maps from DB | Prefer CDN TopoJSON first; PostGIS only if dynamic |

Until then: codes + points in Catalog; boundaries out of the database.

---

## Cross-references

- **Pricing** — geography is a discovery dimension only; not a `calculate_quote` input (`PRC-1` unchanged).
- **Booking** — references `listing_id`; pickup/dropoff are Fulfillment Payload text (`BKG-11` unchanged).
- **Search** — filters by listable node via listing join; near-me is a geography query.
- **Deactivation** — archiving or deactivating a geography node cascades all subtree Listings to Unlisted via `path` prefix (`OPR-10`, `INV-11`, `FR-CAT-002`).
- **Timezone** — every geography node carries `timezone`; CheckoutSession/Booking snapshoot `service_timezone` at session creation ([ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model)).
