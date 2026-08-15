---
title: Geography
sidebar_position: 8
description: Administrative geography model, seeding, map features, and spatial evolution triggers for Red Cab Marketplace.
---

## TL;DR

- **District** = Japanese prefecture **or** designated city (政令指定都市); **Area** = municipality or ward (市区町村 / 行政区).
- Geography is **seeded from official administrative codes** (JIS X 0402), not hand-authored from scratch.
- Stored as **codes + city-hall centroids** (`latitude`/`longitude`); **no PostGIS** and **no boundary polygons** at Phase 1.
- Discovery uses **District → Area** hierarchy (`AMB-020`); **near me** ranks Areas with published listings (`INV-8`).
- Tourism labels (Ginza, Fuji Five Lakes) are a **future tag layer on Listings**, not Areas.

## About this document

Authoritative geography design for the Catalog Geography module. Business rules remain in [Business Rules](/docs/business-rules/invariants); storage shape in `red-cab-api/docs/db/catalog.dbml`.

| Topic | Document |
| --- | --- |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| ADR | [ADR-013: Geography Reference Data](/docs/architecture/decisions/adr-013-geography-reference-data) |
| FRs | [CAT functional requirements](/docs/requirements/functional-requirements/cat) |
| Decision Log | [Open Questions](/docs/ambiguities/open-questions) (`AMB-036`) |

---

## Ubiquitous language

| Term | Meaning |
| --- | --- |
| **District** | Top-level navigation unit: a **prefecture** (都道府県) **or** a **designated city** (政令指定都市). Has EN/JA labels, slug, optional centroid. Shown only if it has ≥1 published listing in any child Area (`INV-8`). |
| **Area** | Second-level navigation unit: a **municipality** (市町村) or **ward** (区) within a designated city. Each Listing is located in exactly one Area. Shown only if it has ≥1 published listing (`INV-8`). |
| **Municipality code** | 5-digit **全国地方公共団体コード** (JIS X 0402). Stable natural key for Areas; used for idempotent seed upserts. Never reused when a municipality is retired. |
| **Prefecture code** | 2-digit code; stored on every District (including designated cities, pointing at the parent prefecture). |
| **Centroid** | `latitude`/`longitude` of the **municipal government office** (市区町村役場), not a polygon centroid. Used for map pins and near-me distance. |
| **Tourism tag** | *(Future)* A curated label (e.g. Ginza, Fuji Five Lakes) attached to Listings many-to-many — **not** an Area. |

### Designated cities (`AMB-036`)

Twenty municipalities are **政令指定都市**. Their wards (区) are Areas; the city itself is a **District** (not the parent prefecture).

Examples:

- `Tokyo` (prefecture District) → `Shinjuku-ku` (Area)
- `Yokohama` (designated-city District) → `Nishi-ku` (Area)
- `Osaka` (designated-city District) → `Chuo-ku` (Area)

This avoids ward-name collisions under a single prefecture District (e.g. Yokohama 緑区 vs Sagamihara 緑区).

### Slug collision rule (10 prefecture/city homonyms)

Ten designated cities share a name with their prefecture (Saitama, Chiba, Niigata, Shizuoka, Kyoto, Osaka, Okayama, Hiroshima, Fukuoka, Kumamoto). **The city keeps the bare slug**; the prefecture is qualified:

| District | `slug` | `name_en` |
| --- | --- | --- |
| Kyoto City | `kyoto` | Kyoto |
| Kyoto Prefecture | `kyoto-prefecture` | Kyoto Prefecture |

---

## What geography is **not**

- **Not a GIS boundary store** — no GeoJSON import, no `ST_Contains`, no PostGIS extension at Phase 1.
- **Not a pricing input** — distance never enters `calculate_quote` (`PRC-1`).
- **Not pickup/dropoff resolution** — Fulfillment Payload addresses remain free text (`BKG-11`).
- **Not provider coverage** — a Listing sits in one Area; providers do not declare service polygons.

---

## Label conventions (`NFR-I18N-003`)

| Field | Convention | Example (新宿区) |
| --- | --- | --- |
| `name_ja` | Official Japanese with type suffix | 新宿区 |
| `name_kana` | Source kana from seed data | しんじゅくく |
| `name_en` | Bare Hepburn romanization (no suffix) | Shinjuku |
| `slug` | Derived from `name_en`, lowercased | `shinjuku` |

Ambiguity across Areas (e.g. multiple 中央区) is resolved at render time by the parent District ("Chuo, Osaka"). Commercially important labels remain admin-editable after seed.

`display_order` defaults to official code order (Hokkaido 01 → Okinawa 47).

---

## Storage shape (summary)

See `red-cab-api/docs/db/catalog.dbml` for authoritative columns.

**`catalog_districts`** additions:

- `kind` — `prefecture | designated_city`
- `prefecture_code` — 2-digit
- `municipality_code` — 5-digit, set when `kind = designated_city`
- `latitude`, `longitude` — optional centroid for map centering

**`catalog_areas`** additions:

- `municipality_code` — 5-digit, unique, seed upsert key
- `name_kana`
- `latitude`, `longitude` — required (city-hall point)

Coordinates are plain `numeric`; no spatial index required at ~1,750 rows.

---

## Seed pipeline

### Sources (text/CSV — not GeoJSON)

1. **全国地方公共団体コード** (総務省) — codes, kanji, kana
2. **Government office locations** — city-hall lat/lng (not polygon centroids)
3. **ISO 3166-2:JP** — prefecture English names

### Procedure

1. Upsert all Districts (47 prefectures + 20 designated cities).
2. Upsert all Areas (~1,750 municipalities and wards).
3. Set `status = active`; **do not delete** retired codes — archive on merger (`INV-11`).
4. Idempotent upsert keyed on `municipality_code`.

### What to skip

- **郡 (gun)** — appear in addresses but are not governing bodies; no Listing attaches to them.
- **北海道振興局** — administrative grouping, not a navigation unit.

### Admin workflow shift (`FR-CAT-001`)

Phase 1 admin **curates seeded geography** (edit labels, reorder, deactivate) rather than creating taxonomy from scratch. Create remains available for exceptional cases.

`INV-8` hides Areas/Districts with zero published listings from tourists — seeding all of Japan does not clutter discovery.

---

## Discovery and search

### Primary navigation (`FR-CAT-004`, `AMB-020`)

Tourists browse **District → Area → Listings**. Service type is a filter, not primary IA.

URL slugs follow the hierarchy: `/districts/{district_slug}/areas/{area_slug}/listings`.

### Near me (`FR-CAT-032`)

1. Browser geolocation provides user coordinates (client-side).
2. API ranks **Areas** that have ≥1 published listing (`INV-8`) by haversine distance to Area centroid.
3. No PostGIS; full scan over ~1,750 rows is acceptable.

### Map features (Phase 1)

- **Pins only** — District/Area centroids and listing locations (from Area centroid).
- No shaded boundaries, no route display, no map-based browse.
- Boundary rendering (if ever needed) uses pre-simplified TopoJSON on a CDN — not Postgres geometry queries.

---

## Tourism tags (future)

Curated tourism regions (Ginza, Fuji Five Lakes, Narita Airport, Niseko) **do not fit** the administrative hierarchy:

- Ginza spans chōme inside one ward.
- Fuji Five Lakes spans multiple municipalities across a prefecture boundary.

**Future design:** `catalog_tags` (or similar) many-to-many with Listings. Not Areas. Not blocking Phase 1 geography.

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

- **Pricing** — Area is a discovery dimension only; not a `calculate_quote` input.
- **Booking** — references `listing_id`; pickup/dropoff are Fulfillment Payload text.
- **Search** — filters by Area via listing join; near-me is an Area query.
- **Deactivation** — District deactivation cascades listings to Unlisted (`OPR-10`, `INV-11`).
