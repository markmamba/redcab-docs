---
title: "Geography administrative tree"
sidebar_label: Docs · Geography tree
issue: "https://github.com/markmamba/redcab-docs/issues/13"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "ADR-016 merged to main (redcab-docs#12)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships the **approved implementation spec** for Option C + C1 geography: `catalog_countries` (JP now) plus self-referencing `catalog_geographies`, migrations, seed task, marketplace slug resolution (`API-1`), listing-detail ancestor embed (`API-2`), near-me, provider listable-leaf validation, and team admin geography CRUD.
- Does **not** ship API/web code in this PR — codegen input for epic [red-cab-api#130](https://github.com/markmamba/red-cab-api/issues/130). Tourist-web-56/57/58 receive `depends_on` patches only.
- Breaking change: **Yes** — marketplace route params become `:district_slug`/`:area_slug`; provider listing create rejects non-listable geography nodes; DB column `catalog_listings.geography_id` replaces `area_id` (JSON keys `district_id` / `area_id` unchanged per ADR-016 decision 11).

## Problem

The shipped flat `catalog_districts` / `catalog_areas` schema cannot express designated cities as children of prefectures, has no official-code upsert key (`FR-CAT-001`), no coordinates (`FR-CAT-032`), no successor pointer (`INV-11`), and resolves marketplace geography by UUID while Session A froze slug-based public URLs. [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) and [geography data model review §3–§5](/docs/engineering/specs/cat/geography/design-review-data-model) define the target tree; this spec is the codegen contract for epic [#130](https://github.com/markmamba/red-cab-api/issues/130).

Evidence: `red-cab-api/docs/db/catalog.dbml` (flat tables), `config/routes/marketplace_routes.rb` (`:district_id`/`:area_id`), `Catalog::Districts::MarketplaceShowManager` (`find_by(uuid:)`), `MarketplaceAreaEmbeddedSerializer` (no district/ancestors).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-CAT-001–004 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Admin seed/curate, cascade, discovery projection, two-level navigation |
| FR-CAT-032–034 | same | Near-me, listable-leaf rule, archive successor |
| NFR-I18N-003 | [requirements/non-functional-requirements.md](/docs/product/requirements/non-functional-requirements) | EN/JA labels (and kana on listable nodes) on discovery roots and listable nodes |
| ADR-013 | [architecture/decisions/adr-013-geography-reference-data.md](/docs/architecture/decisions/adr-013-geography-reference-data.md) | Seed source, no PostGIS, partial supersession |
| ADR-014 | [architecture/decisions/adr-014-service-timezone-model.md](/docs/architecture/decisions/adr-014-service-timezone-model.md) | `timezone` on every geography node |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](/docs/architecture/decisions/adr-016-geography-administrative-tree.md) | Tree shape, C1, listable-leaf, path/successor |
| INV-8, INV-11 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Subtree discoverability; archive never delete |
| AMB-036 | [/docs/product/planning/open-questions](/docs/product/planning/open-questions) | Partial supersession — storage vs navigation |
| Session A | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture.md) | Frozen URL family; slug-resolution gap (`API-1`, `API-2`) |
| Geography review | [/docs/engineering/specs/cat/geography/design-review-data-model](/docs/engineering/specs/cat/geography/design-review-data-model.md) | DBML §3.4, migration §4, API matrix §5 |
| geography.md | [architecture/geography.md](/docs/architecture/patterns/geography) | Seed pipeline sources, admin workflow |
| domain-to-code-mapping | [Domain-to-code mapping](/docs/engineering/conventions/domain-to-code-mapping) | Target storage shape; manager surface names |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Option C** — `catalog_countries` + self-referencing `catalog_geographies` | A (harden flat tables); B (three explicit tables) | ADR-016; fixes Kanagawa/Yokohama sibling bug while preserving Session A URLs |
| 2 | **C1 discovery roots** — 67 roots (47 prefectures + 20 designated cities) | C2 (47 prefecture-only roots) | Preserves Session A URL family and homonym slug rule (`kyoto` vs `kyoto-prefecture`) |
| 3 | **`catalog_countries` now** — seed `JP`; no `/jp` URL prefix | Defer country table until country two | Avoids ~2,000-row backfill; ADR-016 decision 1 |
| 4 | **Sequencing** — geography spec + API implementation **before** tourist-web-56/57/58 codegen | Ship tourist routes on flat schema first | Review §4 step 1; avoids writing web specs twice |
| 5 | **API-1 / API-2 absorbed** into this spec as named sections | Separate `API-1`/`API-2` issues | Epic #130 is single codegen home; Session A aliases retained for traceability |
| 6 | **List vs detail ownership** — list endpoints lean; listing detail owns ancestor chain (`API-2`) | Embed ancestors on every list payload | PKM list-detail ownership; tourist-web-57 breadcrumbs |
| 7 | **Marketplace route params** — `:district_slug` / `:area_slug`; temporary UUID fallback in resolver | Keep `:district_id` name with slug values | Session A §5; honest API contract |
| 8 | **UUID fallback removal** — remove in release **after** tourist-web-60 ships | 90-day window; indefinite fallback | One release window for `/account/discover/*` UUID redirects (Q4=A) |
| 9 | **Team admin routes** — `team/catalog/geographies/*` under JWT team admin | Nested under `team/catalog/districts` | Mirrors explicit-route pattern (`team/providers/profiles`, `team/payments/commission_rate_settings`) |
| 10 | **Seed data** — vendored CSV/JSON under `red-cab-api/db/seeds/data/japan/` | Download at seed time; hybrid refresh | Reproducible offline CI (Q5=A) |
| 11 | **Domain directories unchanged** — `catalog/districts/` and `catalog/areas/` keep names; read `Catalog::Geography` | Rename to `geographies/` for marketplace | Session A vocabulary; marketplace API surface stays District/Area |
| 12 | **JSON keys unchanged** — `district_id`, `area_id` in payloads; `area_id` on provider write accepts geography UUID | Rename to `geography_id` in JSON | Session A; provider API stability |
| 13 | **Separate lifecycle statuses** — `active`, `deactivated`, `archived` with distinct timestamps | Single `archived` status for both deactivate and archive | Deactivate is reversible admin pull; archive is irreversible merger with successor; avoids overloading one enum value |

> **Human verification (2026-09-21):** Q1=`engineering/specs/cat/geography/docs-13-geography-administrative-tree.md`; Q2=ADR-016 on main; Q3=tourist `depends_on` path only; Q4=remove UUID fallback after tourist-web-60; Q5=vendored seed files; Q6=separate `deactivated`/`archived` statuses + `deactivated_at`/`archived_at` timestamps.

## Data model

### DBML (authoritative sketch)

From [geography data model review §3.4](/docs/engineering/specs/cat/geography/design-review-data-model#34-column-level-dbml-sketch). Implement in `red-cab-api/docs/db/catalog.dbml` during codegen.

```dbml
// ---------------------------------------------------------------------------
// Geography — administrative tree (seeded reference data, admin-curated)
// ---------------------------------------------------------------------------

Table catalog_countries {
  id bigint [pk, increment]
  uuid string [unique, not null, note: 'external reference; country_id in API payloads']

  code string [not null, unique, note: 'ISO 3166-1 alpha-2, uppercase. Phase 1: JP only']
  name_en string [not null]
  name_ja string [not null]

  default_timezone string [not null, note: 'IANA zone seeded onto descendant geographies (ADR-014). JP: Asia/Tokyo']
  default_locale string [not null, note: 'BCP 47, NFR-I18N-003. JP: ja']
  display_currency string [not null, default: 'JPY', note: 'Presentation only. NOT a pricing input — PRC-1 is unchanged']

  display_order integer [not null, default: 0]
  status string [not null, default: 'active', note: 'rails_enum(:active, :archived)']

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  Indexes {
    uuid [unique]
    code [unique]
  }

  Note: 'One row at Phase 1. Exists so the country FK and locale/timezone defaults never need a backfill across ~2,000 geography rows.'
}

Table catalog_geographies {
  id bigint [pk, increment]
  uuid string [unique, not null, note: 'external reference; district_id / area_id in API payloads']

  country_id bigint [not null, note: 'FK → catalog_countries.id']
  parent_id bigint [null, note: 'FK → catalog_geographies.id. NULL only when level = :subdivision']
  discovery_root_id bigint [null, note: 'FK → catalog_geographies.id. Nearest ancestor-or-self with is_discovery_root. Denormalized so /districts/:district_slug/areas/:area_slug resolves in one lookup']
  successor_geography_id bigint [null, note: 'FK → catalog_geographies.id. Set when this node is archived by merger — INV-11. Drives 301 redirects and Listing re-placement']

  level string [not null, note: 'rails_enum(:subdivision, :municipality, :ward). JP: 都道府県 / 市町村+特別区 / 行政区 of a designated city']
  code_system string [not null, note: 'rails_enum(:iso_3166_2, :jis_x_0402). Which authority external_code belongs to']
  external_code string [not null, note: '2-digit prefecture code or 5-digit 全国地方公共団体コード. Idempotent seed upsert key (FR-CAT-001)']

  slug string [not null, note: 'URL segment. Unique among discovery roots; unique within discovery_root_id for listable nodes']
  path string [not null, unique, note: 'Materialized slug path, e.g. kanagawa/yokohama/nishi']

  name_en string [not null]
  name_ja string [not null]
  name_kana string [null]

  latitude numeric(9,6) [null, note: 'Government-office point. Required when is_listable (CHECK)']
  longitude numeric(9,6) [null]

  timezone string [not null, note: 'IANA Service Timezone (ADR-014). Seeded from countries.default_timezone']

  is_discovery_root boolean [not null, default: false, note: 'JP: 47 prefectures + 20 designated cities']
  is_listable boolean [not null, default: false, note: 'A Listing may attach here. Leaves only']

  display_order integer [not null, default: 0]
  status string [not null, default: 'active', note: 'rails_enum(:active, :deactivated, :archived). Deactivate = reversible admin pull; archive = irreversible merger with successor']
  deactivated_at timestamptz [null, note: 'Set when Admin confirms deactivate (FR-CAT-002). Cleared on reactivate']
  archived_at timestamptz [null, note: 'Set when Admin confirms archive (FR-CAT-034). Never cleared — irreversible']

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  Indexes {
    uuid [unique]
    path [unique]
    (country_id, code_system, external_code) [unique]
    (discovery_root_id, slug) [unique, note: 'Partial: WHERE is_listable']
    slug [unique, note: 'Partial: WHERE is_discovery_root']
    (parent_id, display_order)
    (is_discovery_root, status, display_order)
    (latitude, longitude) [note: 'Partial: WHERE is_listable AND status = \'active\'']
    level
  }
}

// catalog_listings change
Table catalog_listings {
  geography_id bigint [not null, note: 'FK → catalog_geographies.id. Replaces area_id. Target MUST have is_listable = true']
}

Ref: catalog_geographies.country_id             > catalog_countries.id    [delete: restrict, update: cascade]
Ref: catalog_geographies.parent_id              > catalog_geographies.id  [delete: restrict, update: cascade]
Ref: catalog_geographies.discovery_root_id      > catalog_geographies.id  [delete: restrict, update: cascade]
Ref: catalog_geographies.successor_geography_id > catalog_geographies.id  [delete: restrict, update: cascade]
Ref: catalog_listings.geography_id              > catalog_geographies.id  [delete: restrict, update: cascade]
```

### CHECK constraints (database)

- `parent_id IS NULL` iff `level = 'subdivision'`
- `is_listable` implies `latitude IS NOT NULL AND longitude IS NOT NULL`
- `is_listable` implies `level <> 'subdivision'`
- `successor_geography_id <> id`
- **Lifecycle consistency:**
  - `status = 'active'` ⇒ `deactivated_at IS NULL AND archived_at IS NULL AND successor_geography_id IS NULL`
  - `status = 'deactivated'` ⇒ `deactivated_at IS NOT NULL AND archived_at IS NULL AND successor_geography_id IS NULL`
  - `status = 'archived'` ⇒ `archived_at IS NOT NULL AND successor_geography_id IS NOT NULL` (`deactivated_at` may remain set when archive follows deactivate — audit trail)

Parent-level ordering and "listable node has no listable descendants" are **validator-enforced** (ActiveModel), not CHECK.

### Lifecycle state machine

```text
                    deactivate                    archive
          active ──────────────► deactivated ──────────────► archived
                    │              │   ▲                         (successor required;
                    │              │   │ reactivate              irreversible)
                    │              └───┘
                    └──────────────── archive (allowed from active or deactivated)
```

| Transition | From | To | Timestamps | Listings | Reversible? |
| --- | --- | --- | --- | --- | --- |
| **deactivate** | `active` | `deactivated` | set `deactivated_at` | cascade unlist (`OPR-10`) | yes — `reactivate` |
| **reactivate** | `deactivated` | `active` | clear `deactivated_at` | stay Unlisted — providers republish manually | — |
| **archive** | `active` or `deactivated` | `archived` | set `archived_at`; preserve `deactivated_at` if already set (audit) | cascade unlist (`OPR-10`) | no |

Shared side effect: deactivate and archive both require `confirm_listing_count` and cascade listing unlist via `path` prefix (`FR-CAT-002`, `OPR-10`). Rows are never deleted (`INV-11`). Backend convention "no restore once `archived`" applies; only `deactivated` is reversible.

### Migration sequence

From [geography data model review §4](/docs/engineering/specs/cat/geography/design-review-data-model#4-migration-from-the-current-schema). Safe because no production geography data exists.

| Step | Change | Notes |
| --- | --- | --- |
| 1 | Spec approved | This file — `status: approved` |
| 2 | `create_table :catalog_countries` | Seed `JP` in same migration |
| 3 | `create_table :catalog_geographies` | Full column set, indexes, CHECK constraints |
| 4 | `add_reference :catalog_listings, :geography` | Nullable + FK first |
| 5 | Backfill | Only if dev/staging rows exist; greenfield otherwise |
| 6 | `change_column_null :catalog_listings, :geography_id, false` | Then `remove_column :area_id` |
| 7 | `drop_table :catalog_areas, :catalog_districts` | Safe — no data, no external table-name consumers |
| 8 | Seed task | `lib/tasks/catalog_geography_seed.rake` (see Seed contract) |
| 9 | Domain code | `Catalog::Geography` model; `Catalog::Listing.geography`; `discoverable` scope over subtree |
| 10 | Managers | Marketplace managers switch to slug resolution (`API-1`) |
| 11 | Serializers | Read from `Catalog::Geography`; add coordinates + ancestors (`API-2`) |
| 12 | Near-me endpoint | `FR-CAT-032` haversine over partial coordinate index + `INV-8` filter |
| 13 | Sorbet + DBML + annotations | `bundle exec tapioca`, update `docs/db/catalog.dbml`, `bundle exec srb tc` |

### Seed contract

**Task:** `lib/tasks/catalog_geography_seed.rake` (invoke: `bin/rails catalog:geography:seed` or equivalent namespace).

**Sources (vendored):**

| File (under `db/seeds/data/japan/`) | Authority | Used for |
| --- | --- | --- |
| `municipal_codes.csv` (or equivalent) | 全国地方公共団体コード | `external_code`, hierarchy, `name_ja`, `name_kana` |
| `prefecture_codes.json` | ISO 3166-2:JP | Prefecture `external_code` (`code_system: iso_3166_2`) |
| `government_office_coordinates.csv` | Government-office lat/lng | `latitude`, `longitude` on listable nodes |

**Upsert key:** `(country_id, code_system, external_code)` — idempotent re-run (`FR-CAT-001`).

**Derivation rules (post-upsert pass):**

1. **`path`** — materialized slug path from root to node (`kanagawa/yokohama/nishi`).
2. **`is_discovery_root`** — C1: `true` on 47 prefectures (`level = subdivision`) and 20 designated cities (`level = municipality` with administrative children that are wards).
3. **`is_listable`** — `true` on leaves only: municipalities without ward children (incl. Tokyo 23 特別区) and all 行政区 (`level = ward`). Designated cities with wards: `is_listable = false`.
4. **`discovery_root_id`** — nearest ancestor-or-self with `is_discovery_root = true`; set on every listable node.
5. **`slug`** — derived from `name_en` per `geography.md` slug rules; homonym overrides for 10 prefecture/city pairs (`kyoto` vs `kyoto-prefecture`, etc.).
6. **`timezone`** — copy `catalog_countries.default_timezone` (`Asia/Tokyo`) onto every node (`ADR-014`).
7. **`display_order`** — official code order within parent.

**Expected row counts (approximate):** 1 country, 47 subdivisions, ~1,741 municipalities (incl. 23 特別区), ~175 wards, ~1,900 listable nodes.

## API contract

### Marketplace read (existing routes, slug params)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/marketplace/catalog/districts` | optional | Discovery roots with `INV-8` filter; lean payload |
| GET | `/marketplace/catalog/districts/:district_slug` | optional | Resolve `is_discovery_root`; 301 if `archived`; 404 if `deactivated` |
| GET | `/marketplace/catalog/districts/:district_slug/areas` | optional | Listable children in root namespace |
| GET | `/marketplace/catalog/districts/:district_slug/areas/:area_slug` | optional | Single listable node; lat/lng on detail |
| GET | `/marketplace/catalog/districts/:district_slug/areas/:area_slug/listings` | optional | Existing listings index |
| GET | `/marketplace/catalog/areas/near` | optional | **New** — `FR-CAT-032`; query `lat`, `lng`, optional `limit` |

**Route file change:** rename params in `config/routes/marketplace_routes.rb` from `:district_id`/`:area_id` to `:district_slug`/`:area_slug`.

**`marketplace_routes.rb` target shape** — `near` is a sibling namespace under `catalog`, not nested under `:district_slug` (otherwise `near` would be parsed as an `:area_slug`):

```ruby
namespace :marketplace do
  namespace :catalog do
    # ... listings namespace unchanged ...

    namespace :areas do
      get 'near',
        controller: '/marketplace/catalog/areas',
        action:     'near',
        as:         :near
    end

    namespace :districts do
      get '', controller: '/marketplace/catalog/districts', action: 'index'

      get ':district_slug',
        controller: '/marketplace/catalog/districts',
        action:     'show',
        as:         :show

      get ':district_slug/areas',
        controller: '/marketplace/catalog/areas',
        action:     'index',
        as:         :areas

      get ':district_slug/areas/:area_slug',
        controller: '/marketplace/catalog/areas',
        action:     'show',
        as:         :area

      get ':district_slug/areas/:area_slug/listings',
        controller: '/marketplace/catalog/listings',
        action:     'index',
        as:         :area_listings
    end
  end
end
```

### Slug resolution (`API-1`)

One shared resolver service: `Catalog::Geographies::SlugResolutionService` (name illustrative — follow existing service naming in repo).

**Input:** `(district_slug, area_slug = nil)`  
**Resolution:**

1. Find discovery root by slug (include non-active rows for redirect/404 resolution).
2. If `area_slug` present: find listable child `where(discovery_root_id: root.id, slug: area_slug, is_listable: true)`.
3. **UUID fallback (temporary):** if slug lookup fails, attempt `find_by(uuid: segment)` for each segment; log deprecation warning. Remove in release after tourist-web-60 ships.
4. **Lifecycle resolution:**
   - `status = active` — resolve normally (marketplace lists filter to active only).
   - `status = deactivated` — return **404** (no redirect target).
   - `status = archived` (`FR-CAT-034`) — return successor redirect instruction (see Successor behavior).

**Managers to update:** `Catalog::Districts::MarketplaceShowManager`, `Catalog::Areas::MarketplaceIndexManager`, `Catalog::Areas::MarketplaceShowManager`, `Catalog::Listings::MarketplaceIndexManager`.

### Listing geography embed (`API-2`)

**Detail-owned** — `MarketplaceListingDetailSerializer` (and provider equivalent if it embeds area):

```json
{
  "area": {
    "uuid": "...",
    "slug": "nishi",
    "name_en": "Nishi",
    "name_ja": "西区",
    "timezone": "Asia/Tokyo",
    "latitude": 35.460632,
    "longitude": 139.617996,
    "district": {
      "uuid": "...",
      "slug": "yokohama",
      "name_en": "Yokohama",
      "name_ja": "横浜市"
    },
    "ancestors": [
      { "uuid": "...", "slug": "kanagawa", "name_en": "Kanagawa", "name_ja": "神奈川県", "level": "subdivision" },
      { "uuid": "...", "slug": "yokohama", "name_en": "Yokohama", "name_ja": "横浜市", "level": "municipality" }
    ]
  }
}
```

- `ancestors` ordered root → parent (excludes the area node itself; includes discovery root and intermediate nodes).
- **List serializers stay lean** — no `ancestors`, no coordinates on district list or area list index payloads.
- `MarketplaceAreaShowSerializer` (area detail): add `latitude`, `longitude`; optional lean `district` embed (uuid, slug, names) — no full ancestor chain (detail listing owns breadcrumbs).

### Empty-area / no-available-services signal (`FR-CAT-003`, `INV-8`)

`INV-8` and geography list endpoints **do not** surface zero-listing nodes — district and area index/show payloads never include an explicit `has_available_services` flag.

| Surface | Geography layer | `FR-CAT-003` signal |
| --- | --- | --- |
| `GET .../districts`, `GET .../districts/:district_slug/areas` | Pre-filtered by `INV-8` (subtree has ≥1 published listing) | N/A — empty geography never returned |
| `GET .../districts/:district_slug/areas/:area_slug` | Area is discoverable by definition (`INV-8`) | Geography payload has no availability flag; tourist-web shows area shell |
| `GET .../districts/:district_slug/areas/:area_slug/listings` | — | **Empty `listings` array** (after server-side filters/date) is the API signal for "no available services" within a discoverable area. No separate boolean on geography serializers in v1. |

Fully-booked or date-filtered empty states (`FR-CAT-006`) use the same listings-index empty array — copy and UX live in tourist-web listing pages, not geography serializers.

### Serializer field matrix

| Serializer | Fields | Notes |
| --- | --- | --- |
| `MarketplaceDistrictBaseSerializer` | `uuid`, `slug`, `name_en`, `name_ja`, `display_order` | List + show (discovery roots) |
| `MarketplaceAreaBaseSerializer` | `uuid`, `slug`, `name_en`, `name_ja`, `display_order`, `timezone` | Area list under district |
| `MarketplaceAreaEmbeddedSerializer` | `uuid`, `slug`, `name_en`, `name_ja`, `timezone`, `latitude`, `longitude`, `district`, `ancestors` | **Listing detail only** (`API-2`) |
| `MarketplaceAreaShowSerializer` | base fields + `latitude`, `longitude`, lean `district` | Area show endpoint |
| `TeamGeographySerializer` | full admin fields incl. `level`, `external_code`, `status`, `deactivated_at`, `archived_at`, `successor_geography_id`, `is_discovery_root`, `is_listable`, `path` | Team index/show |

No DB queries inside serializers — preload associations in managers.

### Near-me (`FR-CAT-032`)

**GET** `/marketplace/catalog/areas/near`

| | |
| --- | --- |
| **Auth** | optional (marketplace) |
| **Query** | `lat` (required), `lng` (required), `limit` (optional, default 10, max 50) |
| **Response 200** | `{ "areas": [ { ...MarketplaceAreaBaseSerializer fields..., "distance_km": 12.4 } ] }` |
| **Algorithm** | Haversine over `catalog_geographies` partial index (`is_listable`, `status = active`, coordinates present); filter `INV-8` (subtree has ≥1 published listing); sort ascending by distance |
| **Errors** | 422 if `lat`/`lng` missing or out of range |

### Deactivated / archived marketplace behavior (`FR-CAT-002`, `FR-CAT-034`, `INV-11`)

**Locked pattern (no implementer choice):**

| `status` | Show endpoints | List/index endpoints | Team show |
| --- | --- | --- | --- |
| `active` | 200 | included (subject to `INV-8`) | normal |
| `deactivated` | **404** | omitted | show `deactivated_at`; no successor |
| `archived` | **301** to successor slug path | omitted | show `archived_at` + `successor: { uuid, slug, name_en, name_ja }` |

- List/index endpoints never use successor embed in JSON — non-active nodes are simply absent.
- Rows never deleted. `deactivated_at` and `archived_at` are audit timestamps; both may be set when a node was deactivated then later archived (merger after admin pull).

### Provider write

Keep JSON key **`area_id`** (geography UUID). Validator rejects when:

- Geography not found
- `status <> active` (deactivated or archived nodes are not attach targets)
- `is_listable = false` (`FR-CAT-033`) — error message names valid listable children when parent is a designated city

**Managers:** `Catalog::Listings::ProvidersCreateManager`, `ProvidersUpdateManager` — resolve `Catalog::Geography` by uuid.

### Team admin (`FR-CAT-001`, `FR-CAT-002`, `FR-CAT-034`)

Auth: team JWT (`Team::BaseController`).

**Status enum:** `catalog_geographies.status` is `rails_enum(:active, :deactivated, :archived)`. See [Lifecycle state machine](#lifecycle-state-machine).

| Command | When to use | Resulting `status` | Timestamps | Marketplace URLs |
| --- | --- | --- | --- | --- |
| **deactivate** | Admin pulls a node from discovery without a merger | `deactivated` | set `deactivated_at` | Show → **404**; omitted from lists |
| **reactivate** | Admin restores a temporarily pulled node | `active` | clear `deactivated_at` | Slugs work again; `INV-8` applies |
| **archive** | Administrative merger — retired node absorbed into a survivor (`FR-CAT-034`, `INV-11`) | `archived` | set `archived_at`; preserve `deactivated_at` if set | Show → **301** to successor path |

Deactivate and archive both cascade listing unlist per `OPR-10` / `FR-CAT-002`. Reactivate does **not** auto-republish listings — providers must manually republish. Archive is irreversible per backend conventions.

| Method | Path | Request body | Response | Notes |
| --- | --- | --- | --- | --- |
| GET | `/team/catalog/geographies` | — | paginated geography index | Filters: `level`, `status`, `parent_id`, `is_discovery_root`, `q` (name search) |
| GET | `/team/catalog/geographies/:geography_id` | — | node + children summary | `geography_id` = uuid |
| POST | `/team/catalog/geographies` | labels, `parent_id`, `level`, codes | 201 created | Exceptional manual create only — normal path is seed |
| PATCH | `/team/catalog/geographies/:geography_id` | `name_en`, `name_ja`, `display_order` | 200 updated | **v1 body excludes `slug`** — labels and `display_order` only; slug mutation deferred (Session A §7.1) |
| POST | `/team/catalog/geographies/:geography_id/deactivate` | `{ "confirm_listing_count": N }` | 200 | `active` → `deactivated`; set `deactivated_at`; cascade unlist subtree via `path` prefix (`FR-CAT-002`, `OPR-10`) |
| POST | `/team/catalog/geographies/:geography_id/reactivate` | — | 200 | `deactivated` → `active`; clear `deactivated_at`; listings stay Unlisted |
| POST | `/team/catalog/geographies/:geography_id/archive` | `{ "successor_geography_id": "uuid", "confirm_listing_count": N }` | 200 | `active` or `deactivated` → `archived`; set `archived_at`, `successor_geography_id`; cascade unlist subtree via `path` prefix (`FR-CAT-034`, `OPR-10`) |

### Files to create or modify (API)

**Schema / seed**

- `docs/db/catalog.dbml`
- `db/migrate/*` (steps 2–7)
- `db/seeds/data/japan/*`
- `lib/tasks/catalog_geography_seed.rake`

**Domain**

- `app/domains/catalog/geography.rb` (model)
- `app/domains/catalog/country.rb` (model)
- `app/domains/catalog/geographies/slug_resolution_service.rb`
- `app/domains/catalog/geographies/near_me_manager.rb` (+ request, validator)
- `app/domains/catalog/geographies/team_*` (index, show, create, update, deactivate, reactivate, archive)
- `app/domains/catalog/districts/*` — read `Catalog::Geography` discovery roots
- `app/domains/catalog/areas/*` — read `Catalog::Geography` listable nodes
- `app/domains/catalog/listings/providers_create_validator.rb` — `is_listable` check
- `app/domains/catalog/listings/providers_update_validator.rb` — same

**Controllers / routes**

- `config/routes/marketplace_routes.rb` — slug params + near-me route
- `config/routes/team_routes.rb` — `team/catalog/geographies/*` (incl. `deactivate`, `reactivate`, `archive`)
- `app/controllers/marketplace/catalog/districts_controller.rb`
- `app/controllers/marketplace/catalog/areas_controller.rb`
- `app/controllers/team/catalog/geographies_controller.rb`

**Serializers**

- `app/domains/catalog/marketplace_area_embedded_serializer.rb` — district + ancestors
- `app/domains/catalog/marketplace_area_base_serializer.rb` — unchanged shape
- `app/domains/catalog/team_geography_serializer.rb`

## Data / domain touchpoints

- **Bounded context:** CAT — geography is reference data inside Catalog; no cross-context model imports.
- **Listing FK:** `catalog_listings.geography_id` → listable `Catalog::Geography` only (`FR-CAT-033`).
- **`INV-8`:** `discoverable` scope — node or any descendant has published listing; query-time, never stored.
- **Lifecycle scopes:** `active_geographies` → `where(status: :active)`; marketplace read lists use this scope. Show/resolver queries include non-active rows to return 404 (`deactivated`) or 301 (`archived`).
- **`OPR-10` / `FR-CAT-002`:** deactivate/archive uses `path LIKE '{prefix}%'` to find affected listings.
- **Snapshots:** booking/checkout snapshots unchanged — geography timezone already snapshotted per ADR-014/ADR-006.
- **Pricing:** no geography column in `calculate_quote` (`PRC-1`).

## Out of scope

- `red-cab-web` team admin UI (API contract only)
- tourist-web-56/57/58 **implementation** — dependency patches only in this PR
- PostGIS, tourism tags on geographies, listing slug column (`CAT-1`)
- C2 (47 prefecture-only roots)
- `/jp` country URL prefix
- Slug-history table (Session A §7.1 open question — treat slugs as immutable at launch unless follow-up issues)

## Tasks

### API (epic #130 — implement from this spec)

- [ ] Migrations: `catalog_countries`, `catalog_geographies`, `catalog_listings.geography_id`, drop flat tables
- [ ] Seed task + vendored data under `db/seeds/data/japan/`
- [ ] `Catalog::Geography` model + `discoverable` scope
- [ ] `SlugResolutionService` + marketplace manager updates (`API-1`)
- [ ] UUID fallback with deprecation log; removal AC tied to tourist-web-60 + 1 release
- [ ] Listing detail ancestor embed (`API-2`)
- [ ] Near-me endpoint (`FR-CAT-032`)
- [ ] Provider listable-leaf validation (`FR-CAT-033`)
- [ ] Team geography CRUD + deactivate/reactivate/archive (`FR-CAT-001/002/034`)
- [ ] Integration tests per Acceptance criteria
- [ ] `bundle exec tapioca`, `bundle exec srb tc`, `bundle exec rubocop`

### Docs (this issue)

- [x] Create `docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md` with `status: approved`
- [x] Patch `tourist-web-56/57/58` `depends_on` with spec path
- [ ] Set spec `status: implemented` after epic #130 merges

## Acceptance criteria

- [ ] `catalog_countries` seeded with `JP`; `catalog_geographies` tree matches C1 row counts
- [ ] Seed task idempotent on `(country_id, code_system, external_code)` re-run
- [ ] Marketplace district/area resolve by slug; UUID fallback works during cutover window
- [ ] Listing detail embed includes `district` + `ancestors[]` (`API-2`)
- [ ] Near-me ranks listable nodes with `INV-8` filter (`FR-CAT-032`)
- [ ] Provider listing create rejects non-listable geography (`FR-CAT-033`)
- [ ] Team deactivate/archive require `confirm_listing_count` and cascade subtree unlist via `path` prefix (`FR-CAT-002`, `OPR-10`)
- [ ] Team deactivate sets `status = deactivated` + `deactivated_at`; reactivate clears `deactivated_at` and restores `status = active` (listings stay Unlisted)
- [ ] Team archive sets `status = archived`, `archived_at`, and `successor_geography_id` from `active` or `deactivated` (`FR-CAT-034`, `INV-11`)
- [ ] Deactivated geography show returns 404; archived geography show returns 301 to successor
- [ ] Provider write rejects `deactivated` and `archived` geography nodes
- [ ] Integration: `test/integration/marketplace/catalog/districts_*`, `areas_*`, `areas_near_*`
- [ ] Integration: `test/integration/catalog/geography_seed_test.rb` (idempotency)
- [ ] Integration: `test/integration/team/catalog/geographies_*`
- [ ] No client-authored price; no geography in quote path (`PRC-1`)
- [ ] `docs/engineering/` grep clean of stale `catalog_districts` / flat-model refs after merge

## Verification

```bash
# API (from red-cab-api/) — run during epic #130 implementation
bin/rails catalog:geography:seed
bin/rails test test/integration/marketplace/catalog/
bin/rails test test/integration/team/catalog/geographies/
bin/rails test test/domains/catalog/geographies/
bundle exec srb tc
bundle exec rubocop

# Docs (this issue)
# review-implementation-spec on docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md
```

## Cross-repo dependencies

| Consumer | Dependency |
| --- | --- |
| tourist-web-56 | Slug params + resolver (`API-1`); spec path in `depends_on` |
| tourist-web-57 | Ancestor embed on listing detail (`API-2`) for breadcrumbs |
| tourist-web-58 | Sequence after geography API lands |
| tourist-web-60 | Blocks on `API-1` + `API-2`; UUID fallback until one release after #60 |
| red-cab-api#130 | Parent epic for all API tasks above |

Public URLs unchanged: `/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]` (Session A).

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-21 | PKM implement agent | `review-implementation-spec` | Approved — no must-fix findings |
| 2026-09-21 | PKM implement (issue 13) | Review-repo should-fix pass | Addressed items 1–6; FR-CAT-003 empty-area contract documented |
| 2026-09-21 | Mark | Lifecycle status separation | `active` / `deactivated` / `archived` + `deactivated_at` / `archived_at`; reactivate endpoint |
