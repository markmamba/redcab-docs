---
title: "Geography data model review and revised proposal"
sidebar_label: Geography model review
sidebar_position: 11
description: Critique of the shipped District/Area geography schema, three redesign options, and a recommended country + self-referencing administrative tree that preserves the Session A public URL contract.
---

## TL;DR

- **The shipped schema is not the ADR-013 design.** `catalog_districts` / `catalog_areas` have no `kind`, no `prefecture_code`, no `municipality_code`, no `name_kana`, and **no `latitude` / `longitude`**. `FR-CAT-032` (near-me) is currently unimplementable and `FR-CAT-001` (seed from official codes) has no upsert key.
- **There is no geography data yet.** `db/seeds.rb` contains none, and the 1,750-row seed task was never written. Restructuring now costs a migration and a rename; restructuring after the seed and after the Session A URL work ships costs a data migration plus 301s on indexable URLs.
- **The real modelling defect is that `catalog_districts` holds two different kinds of thing** (prefecture, designated city) with no parent link between them, so Yokohama is a *sibling* of Kanagawa rather than a child. That is what forces the ten-homonym bare-slug hack and what makes a third level a table-adding change instead of a row-adding one.
- **Recommendation: Option C** — add `catalog_countries` (1 row, `JP`) and replace the two taxonomy tables with one self-referencing `catalog_geographies` tree (`subdivision → municipality → ward`), with `is_discovery_root` and `is_listable` as *roles* rather than levels.
- **Public URLs do not change.** `/districts/{districtSlug}/areas/{areaSlug}/listings` from [Session A](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) survives intact, because 67 discovery roots (47 prefectures + 20 designated cities) and slug-unique-within-root are preserved as a projection of the tree.
- **`AMB-036`: supersede in part.** Keep administrative semantics, official-code seeding, no PostGIS, and tourism-tags-on-Listings. Supersede only the clause "designated cities as Districts" — it becomes a presentation rule, not a storage rule.

## About this document

Roadmap note, not a decision. It proposes amendments to [Geography](/docs/architecture/patterns/geography) and [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) and asks Product + Engineering for a call on `AMB-036`.

| Topic | Document |
| --- | --- |
| Current geography design | [Geography](/docs/architecture/patterns/geography) |
| Current ADR | [ADR-013: Geography Reference Data](/docs/architecture/decisions/adr-013-geography-reference-data) |
| Timezone dependency | [ADR-014: Service Timezone Model](/docs/architecture/decisions/adr-014-service-timezone-model) |
| Public URL contract | [Session A — Tourist UI access model and public URL architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) |
| Requirements | [CAT functional requirements](/docs/product/requirements/functional-requirements/cat) (`FR-CAT-001`–`004`, `FR-CAT-032`) |
| Decision Log | [Open Questions](/docs/product/planning/open-questions) (`AMB-020`, `AMB-036`) |
| Storage shape | `red-cab-api/docs/db/catalog.dbml`, `red-cab-api/db/schema.rb` |

---

## 1. Critique of the current design against the ranked goals

### 1.1 Documentation and code have diverged

- `geography.md` §"Storage shape" promises `kind`, `prefecture_code`, `municipality_code` on `catalog_districts` and `municipality_code`, `name_kana`, `latitude`, `longitude` on `catalog_areas`. **None of these columns exist** in `db/schema.rb:196-264`. The only column that landed from the geography work is `catalog_areas.timezone`, added by `20260823130000_add_service_timezone_columns.rb` for ADR-014.
- Consequence for **goal 3 (near-me, `FR-CAT-032`)**: the requirement says "use Area centroids (city-hall coordinates) for distance calculation". There are no coordinates and no near-me endpoint. The requirement is Approved and unbuildable.
- Consequence for **goal 5 (admin, `FR-CAT-001`)**: the requirement says Districts and Areas are "seeded from official Japanese administrative codes". There is no code column, so there is no idempotent upsert key — a re-run of the seed would duplicate or would have to match on `name_ja`, which changes when Admin curates labels. The seed pipeline described in ADR-013 cannot be written against this schema.
- This is the cheapest problem to fix and the one most likely to be mistaken for "already done", because both the ADR and the architecture doc read as settled.

### 1.2 `catalog_districts` is a union type with the discriminator missing

- A District is "a prefecture **or** a designated city" (`geography.md:33`). Those are not the same kind of entity: a designated city is *inside* a prefecture, and 20 of them are. The table has no `parent` link, so **Kanagawa and Yokohama are siblings** and Kanagawa's Area list silently excludes half its population.
- Even the planned `prefecture_code` column would have meant two different things per row — "my own code" for a prefecture, "my parent's code" for a designated city. That is the signature of a missing table or a missing parent FK.
- Consequence for **goal 1 (browse by location first, `AMB-020`)**: the top-level list a Tourist sees is not "the 47 prefectures of Japan", it is 67 mixed-granularity entries where Yokohama, Kawasaki and Sagamihara appear next to — and not under — Kanagawa. Defensible as a product choice; indefensible as the only representation available.
- Consequence for **`FR-CAT-002` / `OPR-10`**: deactivating Kanagawa does not touch Yokohama's listings, because there is no edge to cascade along. The cascade requirement is satisfiable only for the accidental subset of geography that happens to be one level deep.

### 1.3 The slug collision rule is a symptom encoded into URLs

- Ten designated cities share a name with their prefecture, so `geography.md:53-60` gives the city the bare slug (`kyoto`) and qualifies the prefecture (`kyoto-prefecture`). That is a workaround for two rows occupying one namespace *because they were flattened into one table*.
- URLs are the most expensive artefact to change later — they are indexed, linked, and now frozen by Session A. Encoding a storage compromise there converts a reversible modelling decision into an irreversible SEO one.

### 1.4 Two hard-coded levels means a third level is a migration, not a row

- The two-level shape is baked into table names, `catalog_areas.district_id`, `catalog_listings.area_id`, four managers, two serializers, `config/routes/marketplace_routes.rb`, and five `red-cab-web` route modules. Adding "prefecture → city → ward" as real structure touches every one of them.
- Consequence for **goal 4 (multi-country within two years)**: other countries do not have two clean levels. Japan itself does not — Tokyo's 23 特別区 are *municipality*-level bodies (children of Tokyo-to), while Yokohama's 18 行政区 are *ward*-level bodies (children of a city). The current model stores Shinjuku-ku and Nishi-ku in the same table at the same depth, which is factually wrong and blocks correct code assignment (`13104` vs `14103` mean different things).

### 1.5 No country entity, and `timezone` is the tell

- `catalog_areas.timezone` (NOT NULL, `Asia/Tokyo` on every row) is the only multi-country concession in the schema, and it is per-leaf because there was nowhere higher to put it. ISO country code, default locale, display currency, and address conventions have no home.
- A `catalog_countries` table is one row and one nullable-then-backfilled FK today. After the seed it is ~2,000 row updates plus a decision about whether the URL gains a `/jp` prefix, which is a 301 on every indexable geography URL.

### 1.6 `INV-11` has no mechanism

- `INV-11` and ADR-013 both say "never delete geography; archive on merger". `catalog_districts` has `status` + `deactivated_at`; `catalog_areas` has `status` only — **no `deactivated_at`, no successor pointer**.
- Japanese municipal mergers are routine (平成の大合併 retired ~1,500 codes). When Area A merges into Area B there is nowhere to record "A became B", so archiving an Area orphans its Listings and 404s its URL instead of redirecting. Archiving is currently a tombstone with no forwarding address.

### 1.7 What is correct and should not be touched

- **Goal 2 (exactly one location per listing)** is met cleanly: `catalog_listings.area_id` is NOT NULL with `delete: restrict`. Keep this shape; only the column name and target table change.
- **`INV-8` is enforced by query, not by a stored flag** — `Catalog::District.discoverable` and `Catalog::Area.discoverable` derive visibility from published listings, so the rule cannot drift. This is the right call and the redesign must preserve it.
- **`PRC-1` holds**: no geography column reaches `calculate_quote`, and nothing proposed here changes that. Coordinates are for ranking and pins only.
- **`BKG-11` holds**: no Booking or Fulfillment Payload column references geography. Pickup and dropoff stay free text.
- **No PostGIS (ADR-013)** remains right. At ~2,000 points, haversine over `numeric` columns with a partial index is faster to ship and cheaper to host than a spatial extension, and nothing in Phase 1 or 2 asks for point-in-polygon.

### 1.8 Secondary observations

- Marketplace managers resolve geography with `find_by(uuid:)` (`Catalog::Districts::MarketplaceShowManager:19`, `Catalog::Areas::MarketplaceIndexManager:29`), while `slug` is serialized but never used as a lookup key. Session A §5 booked this as an API gap — **delivered** in [`red-cab-api#134`](/docs/engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors) (`API-1`/`API-2` aliases). Listed here because the redesign landed slug resolution in the same pass rather than twice.
- `MarketplaceAreaEmbeddedSerializer` carried no district, so `red-cab-web` could not build a listing's canonical path from the listing payload alone. A tree with an ancestor array solves this and the breadcrumb requirement of `tourist-web-57` together — **delivered** in [`#134`](/docs/engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors).
- `Catalog::District.discoverable` nests a `joins(:listings).select(:district_id).distinct` subquery per request. Correct, and fine at 67 roots; worth revisiting only if the areas-in-district page becomes hot.

---

## 2. Options

### Option A — Harden the current two tables

Add the columns ADR-013 already specifies (`kind`, `prefecture_code`, `municipality_code`, `name_kana`, `latitude`, `longitude`), add `catalog_areas.deactivated_at` and `merged_into_area_id`, write the seed. Keep designated cities as Districts. No country table.

### Option B — Explicit three-table strict tree

`catalog_countries` → `catalog_subdivisions` (prefecture) → `catalog_municipalities` (city / town / village / special ward), with `catalog_municipalities.parent_municipality_id` self-FK for the administrative wards of designated cities. Listings attach to `catalog_municipalities`.

### Option C — Country table plus one self-referencing geography tree *(recommended)*

`catalog_countries` (1 row) → `catalog_geographies`, a single table with `parent_id`, a `level` enum (`subdivision | municipality | ward`), a materialized `path`, and two role booleans: `is_discovery_root` (may appear as a `districtSlug` segment) and `is_listable` (a Listing may attach here). Listings attach to `catalog_geographies`.

### Comparison

| Criterion | A — harden two tables | B — three explicit tables | C — country + one tree |
| --- | --- | --- | --- |
| Effort now | Lowest: additive migration, no renames | Highest: 3 new tables, 2 dropped, full rewrite of managers | Medium: 2 new tables, 2 dropped, mechanical rewrite |
| Models designated cities correctly | No — still siblings of their prefecture | Yes | Yes |
| Distinguishes 特別区 (Shinjuku) from 行政区 (Nishi) | No — same table, same depth | Yes — depth differs by self-FK | Yes — `level` + depth |
| `FR-CAT-002` cascade correctness | Broken for designated cities | Correct | Correct via `path` prefix match |
| Third navigation level | New table + `catalog_listings` migration | Additive (deeper self-FK) | Additive (one more `level` value) |
| Multi-country | Requires country table + ~2,000-row backfill | Country table present | Country table present |
| `INV-11` merger successor | Needs new column per table | Needs new column per table | One `successor_geography_id` |
| Near-me query (`FR-CAT-032`) | Scan `catalog_areas` | Scan `catalog_municipalities` | Scan `catalog_geographies WHERE is_listable` (partial index) |
| Keeps Session A URL family | Yes | Only with a discovery-root flag bolted on | Yes, by design |
| Referential strictness | Strong (typed FKs) | Strongest (typed FKs per level) | Weaker — one FK target, `level` enforced by CHECK + validator |
| Query ergonomics | Simplest joins | Explicit joins, verbose for ancestors | Ancestors need `path` or recursive CTE |
| Risk of becoming "a bag of rows" | Low | Low | Real — mitigated by CHECK constraints below |

**Why not A:** it delivers near-me and the seed but ratifies the union-type mistake and leaves the homonym slug hack permanent. It is the right answer only if the two-year multi-country goal is dropped and designated-cities-as-top-level is affirmed as final.

**Why not B:** it is the most rigorous option and a defensible choice. It is rejected on cost-per-benefit: three tables plus a self-FK on one of them expresses the same tree as C with more join surface, and the `is_discovery_root` projection that keeps the Session A URLs has to be added to it anyway. If the team prefers typed FKs over CHECK constraints, B is the fallback and nothing else in this note changes.

---

## 3. Recommended option in detail

### 3.1 Shape

Two tables. `catalog_countries` holds `JP` and the defaults that currently have nowhere to live. `catalog_geographies` holds every administrative node, with **level as fact** and **role as policy**:

| Concept | Column | Japan Phase 1 |
| --- | --- | --- |
| Administrative fact | `level` | 47 `subdivision`, ~1,741 `municipality` (incl. Tokyo's 23 特別区), ~175 `ward` (行政区 of the 20 designated cities) |
| Appears as `districtSlug` | `is_discovery_root` | 47 prefectures + 20 designated cities = **67**, exactly today's District count |
| A Listing may attach here | `is_listable` | every leaf: municipalities without wards, plus all 行政区 |

`discovery_root_id` is denormalized onto every listable node so that `/districts/yokohama/areas/nishi` resolves in one indexed lookup, and so that `(discovery_root_id, slug)` reproduces today's "slug unique within its district" guarantee exactly.

### 3.2 Why this answers the four open questions

1. **Designated cities as top level, or strict tree? Both — they are different axes.** Storage is a strict tree (Yokohama is a child of Kanagawa); navigation keeps Yokohama as a discovery root. The flattening that `AMB-036` chose for good product reasons stops being a storage lie.
2. **Add `catalog_countries` now?** Yes. One row, and it is the difference between a nullable FK today and a ~2,000-row backfill plus a URL-prefix decision later. Do **not** add a `/jp` URL segment now — reserve it, introduce it only when country two appears.
3. **Are two discovery levels enough?** Yes for navigation, and a third is now additive rather than structural. But note the honest answer: the gap Tourists will actually feel is not a missing administrative level, it is that "Ginza", "Narita Airport" and "Fuji Five Lakes" are not administrative units at all. No depth of tree fixes that — the deferred tourism-tag layer does, and it should be sequenced into Phase 2 rather than treated as optional.
4. **Rename `district` / `area`?** Split the vocabulary instead of renaming it. **District** and **Area** stay as the *discovery* terms — in the Glossary, the tourist UI, the JSON payloads, and the URLs — because Session A froze them and they are the words the Product Owner uses. **Subdivision / Municipality / Ward** are added as the *administrative* terms for the `level` enum and the seed pipeline. One entity, two vocabularies, each precise in its own layer.

### 3.3 Example rows

`catalog_countries`

| id | code | name_en | default_timezone | default_locale |
| --- | --- | --- | --- | --- |
| 1 | `JP` | Japan | `Asia/Tokyo` | `ja` |

`catalog_geographies` — the three requested cases

| id | parent_id | level | external_code | slug | path | name_en | name_ja | is_discovery_root | is_listable | discovery_root_id | lat | lng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | — | `subdivision` | `13` | `tokyo` | `tokyo` | Tokyo | 東京都 | true | false | — | 35.689487 | 139.691711 |
| 1304 | 13 | `municipality` | `13104` | `shinjuku` | `tokyo/shinjuku` | Shinjuku | 新宿区 | false | true | 13 | 35.693840 | 139.703549 |
| 14 | — | `subdivision` | `14` | `kanagawa` | `kanagawa` | Kanagawa | 神奈川県 | true | false | — | 35.447753 | 139.642514 |
| 1401 | 14 | `municipality` | `14100` | `yokohama` | `kanagawa/yokohama` | Yokohama | 横浜市 | **true** | **false** | — | 35.444991 | 139.636768 |
| 1403 | 1401 | `ward` | `14103` | `nishi` | `kanagawa/yokohama/nishi` | Nishi | 西区 | false | true | 1401 | 35.460632 | 139.617996 |

Read the three rows that matter:

- **Tokyo-to → Shinjuku-ku** is two levels. Shinjuku is a 特別区, which is a *municipality*-level body, so it is a direct child of the prefecture and directly listable. Today's schema cannot say this.
- **Kanagawa → Yokohama → Nishi-ku** is three levels. Yokohama is `is_discovery_root = true` (so the URL stays `/districts/yokohama/areas/nishi` and ward-name collisions with Sagamihara are impossible) **and** `parent_id = 14` (so breadcrumbs can render "Kanagawa › Yokohama › Nishi" and deactivating Kanagawa cascades to Nishi's Listings via `path LIKE 'kanagawa/%'`).
- **Yokohama is not listable.** A Listing must attach to a leaf. This is the one new rule Providers will notice, and it is the rule that keeps "exactly one location per listing" unambiguous when a city and its wards both exist.

The ten-homonym rule survives, narrowed: slug must be unique among discovery roots, so Kyoto City keeps `kyoto` and Kyoto Prefecture takes `kyoto-prefecture`. It is now a slug-namespace policy rather than compensation for a flattened table.

**Variant C2, if Product prefers a pure prefecture mental model:** set `is_discovery_root` on the 47 prefectures only. Areas under a prefecture become all listable descendants, the homonym rule disappears, and ward collisions are handled by qualified slugs (`midori-yokohama` vs `midori-sagamihara`). Same schema, one seed flag different — but it changes 20 indexable top-level URLs, so it must be decided **before** the Session A work ships, not after.

### 3.4 Column-level DBML sketch

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

  Note: 'One row at Phase 1. Exists so the country FK and locale/timezone defaults never need a backfill across ~2,000 geography rows (goal 4).'
}

Table catalog_geographies {
  id bigint [pk, increment]
  uuid string [unique, not null, note: 'external reference; district_id / area_id in API payloads']

  country_id bigint [not null, note: 'FK → catalog_countries.id']
  parent_id bigint [null, note: 'FK → catalog_geographies.id. NULL only when level = :subdivision']
  discovery_root_id bigint [null, note: 'FK → catalog_geographies.id. Nearest ancestor-or-self with is_discovery_root. Denormalized so /districts/:district_slug/areas/:area_slug resolves in one lookup']
  successor_geography_id bigint [null, note: 'FK → catalog_geographies.id. Set when this node is archived by merger — INV-11. Drives 301 redirects and Listing re-placement']

  level string [not null, note: 'rails_enum(:subdivision, :municipality, :ward). JP: 都道府県 / 市町村+特別区 / 行政区 of a designated city']
  code_system string [not null, note: 'rails_enum(:iso_3166_2, :jis_x_0402). Which authority external_code belongs to (goal 4)']
  external_code string [not null, note: '2-digit prefecture code or 5-digit 全国地方公共団体コード. Idempotent seed upsert key (FR-CAT-001). Never reused when retired']

  slug string [not null, note: 'URL segment. Unique among discovery roots; unique within discovery_root_id for listable nodes (AMB-020, Session A)']
  path string [not null, unique, note: 'Materialized slug path, e.g. kanagawa/yokohama/nishi. Subtree ops use path LIKE prefix — no recursive CTE, no ltree extension']

  name_en string [not null, note: 'Bare Hepburn, no type suffix (FR-CAT-001, NFR-I18N-003)']
  name_ja string [not null, note: 'Official Japanese with type suffix, e.g. 新宿区']
  name_kana string [null, note: 'Source kana from seed data']

  latitude numeric(9,6) [null, note: 'Government-office point, not a polygon centroid. Required when is_listable (CHECK). Plain numeric — no PostGIS (ADR-013)']
  longitude numeric(9,6) [null, note: 'See latitude']

  timezone string [not null, note: 'IANA Service Timezone (ADR-014, OPR-11). Seeded from countries.default_timezone; NOT NULL on every node so no resolution logic is needed']

  is_discovery_root boolean [not null, default: false, note: 'May appear as the {districtSlug} URL segment. JP: 47 prefectures + 20 designated cities']
  is_listable boolean [not null, default: false, note: 'A Listing may attach here. Leaves only — a designated city is a root but not listable']

  display_order integer [not null, default: 0, note: 'Defaults to official code order (Hokkaido 01 → Okinawa 47). Admin-reorderable (FR-CAT-001)']
  status string [not null, default: 'active', note: 'rails_enum(:active, :archived). Archiving cascades descendant Listings to :unlisted (OPR-10, FR-CAT-002)']
  archived_at timestamptz [null, note: 'Set when Admin confirms archive; Listings unlisted, rows never deleted (INV-11)']

  created_at timestamptz [not null]
  updated_at timestamptz [not null]

  Indexes {
    uuid [unique]
    path [unique]
    (country_id, code_system, external_code) [unique, name: 'index_catalog_geographies_on_country_and_external_code', note: 'Seed upsert key (FR-CAT-001)']
    (discovery_root_id, slug) [unique, name: 'index_catalog_geographies_on_root_and_slug', note: 'Partial: WHERE is_listable. Reproduces today index_catalog_areas_on_district_id_and_slug']
    slug [unique, name: 'index_catalog_geographies_on_discovery_root_slug', note: 'Partial: WHERE is_discovery_root. Forces the homonym rule — kyoto vs kyoto-prefecture']
    (parent_id, display_order) [name: 'index_catalog_geographies_on_parent_and_order']
    (is_discovery_root, status, display_order) [name: 'index_catalog_geographies_on_root_status_order', note: 'Homepage district list']
    (latitude, longitude) [name: 'index_catalog_geographies_on_coordinates', note: 'Partial: WHERE is_listable AND status = \'active\'. Near-me candidate set, ~1,900 rows (FR-CAT-032)']
    level
  }

  Note: '''
    Administrative reference data, seeded from official codes and admin-curated
    (FR-CAT-001, ADR-013). Level is administrative fact; is_discovery_root and
    is_listable are navigation policy — this separation is what lets designated
    cities be top-level in the UI while remaining children of their prefecture
    in storage (supersedes the structural half of AMB-036).

    INV-8 stays a query concern: a node with zero Published Listings in its
    subtree MUST NOT be presented to Tourists, derived at read time, never a
    stored flag, so the rule cannot drift from reality.

    CHECK constraints carry what typed FKs would have carried in a
    three-table design:
      - parent_id IS NULL = (level = 'subdivision')
      - is_listable IMPLIES latitude IS NOT NULL AND longitude IS NOT NULL
      - is_listable IMPLIES level <> 'subdivision'
      - successor_geography_id IS NOT NULL IMPLIES status = 'archived'
      - successor_geography_id <> id
    Parent-level ordering (subdivision > municipality > ward) and
    "a listable node has no listable descendants" are validator-enforced
    (ActiveModel), not CHECK — they need a second row.
  '''
}

// catalog_listings change
Table catalog_listings {
  geography_id bigint [not null, note: 'FK → catalog_geographies.id. Exactly one location per Listing; target MUST have is_listable = true (validator). Replaces area_id (INV-8)']
}

Ref: catalog_geographies.country_id             > catalog_countries.id    [delete: restrict, update: cascade]
Ref: catalog_geographies.parent_id              > catalog_geographies.id  [delete: restrict, update: cascade]
Ref: catalog_geographies.discovery_root_id      > catalog_geographies.id  [delete: restrict, update: cascade]
Ref: catalog_geographies.successor_geography_id > catalog_geographies.id  [delete: restrict, update: cascade]
Ref: catalog_listings.geography_id              > catalog_geographies.id  [delete: restrict, update: cascade]
```

---

## 4. Migration from the current schema

**The migration is trivial today and expensive in three weeks.** `db/seeds.rb` has no geography rows, no seed task exists, `catalog_districts` and `catalog_areas` have no production data, and the Session A URL work has not shipped. The cost of this restructure is currently one migration plus a mechanical rename. After the ~2,000-row seed lands and public URLs are indexed, the same change is a data migration plus a 301 matrix.

**Sequencing constraint:** this must land **before** `tourist-web-56/57/58`, or those specs get written twice.

| Step | Change | Notes |
| --- | --- | --- |
| 1 | Spec first | `redcab-docs/docs/engineering/specs/{issue}-engineering/specs/cat/geography/docs-13-geography-administrative-tree.md`, `status: approved`, per the workspace spec-first rule |
| 2 | `create_table :catalog_countries` | Seed `JP` in the same migration |
| 3 | `create_table :catalog_geographies` | Full column set above, all indexes, all CHECK constraints |
| 4 | `add_reference :catalog_listings, :geography` | Nullable + FK first |
| 5 | Backfill | Only if any dev/staging rows exist: prefecture Districts → `subdivision`; designated-city Districts → `municipality` with `parent_id` resolved by name and `is_discovery_root = true`; Areas → `municipality` or `ward` by parent; `geography_id = ` mapped `area_id`. Greenfield elsewhere |
| 6 | `change_column_null :catalog_listings, :geography_id, false` | Then `remove_column :area_id` |
| 7 | `drop_table :catalog_areas, :catalog_districts` | Safe only because there is no data and no external consumer of the table names |
| 8 | Seed task | `lib/tasks/catalog_geography_seed.rake`: 全国地方公共団体コード + ISO 3166-2:JP + government-office coordinates. Idempotent upsert on `(country_id, code_system, external_code)`. Sets `path`, `discovery_root_id`, `is_listable` derived from whether the node has children |
| 9 | Domain code | `Catalog::Geography` model replaces `Catalog::District` / `Catalog::Area`; `discoverable` scope re-expressed over the subtree; `Catalog::Listing.geography` |
| 10 | Managers | Four marketplace managers switch to slug resolution (already required by Session A §5) against `is_discovery_root` / `(discovery_root_id, slug)` |
| 11 | Serializers | `MarketplaceDistrictBaseSerializer` / `MarketplaceAreaBaseSerializer` / `MarketplaceAreaEmbeddedSerializer` read from `Catalog::Geography`; add `latitude`, `longitude`, and an ancestors array |
| 12 | Near-me endpoint | `FR-CAT-032`: haversine over the partial coordinate index with the `INV-8` filter |
| 13 | Sorbet + DBML + schema annotations | `bundle exec tapioca`, update `docs/db/catalog.dbml`, `bundle exec srb tc` |

`app/domains/catalog/districts/` and `app/domains/catalog/areas/` **keep their directory and class names** — they are the marketplace API surface (District endpoints, Area endpoints), and they now read from `Catalog::Geography`. Only the persistence vocabulary changes, matching the §3.2 answer to question 4.

---

## 5. Impact on URLs and APIs

### 5.1 Public URLs — no change

`/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]` is preserved exactly, including the 67 discovery roots, the bare-vs-qualified homonym slugs, and slug-uniqueness-within-district. The Session A redirect matrix is unaffected. This is deliberate: the redesign is a storage change with a navigation projection, not an IA change.

Reserved for later, non-breaking: a `/jp` country prefix (only when country two ships) and a deeper `/districts/{root}/areas/{a}/{b}` segment (`path` already supports it).

### 5.2 Breaking API changes

| # | Change | Surface | Severity | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | `:district_id` / `:area_id` route params → `:district_slug` / `:area_slug`, resolved by slug | Marketplace read endpoints | Breaking | Already mandated by Session A §5; land both in one pass. Temporary UUID fallback in one resolver, removed by a deprecation issue |
| 2 | Provider listing create/update `area_id` now accepts a geography UUID and **rejects non-listable nodes** | Provider write endpoints | Breaking behavior, same field name | Keep the JSON key `area_id`; add a validator error naming the valid children when a non-leaf is submitted |
| 3 | `catalog_listings.area_id` → `geography_id` | Internal | Not breaking | Column rename only; no payload key changes |
| 4 | Area payloads gain `latitude`, `longitude`, and `district` / ancestors | Marketplace read endpoints | Additive | **Delivered** in [`#134`](/docs/engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors); breadcrumb UX contract in [`web-57`](/docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links) |
| 5 | `GET /marketplace/catalog/areas/near` | New | Additive | Implements `FR-CAT-032`, currently unimplementable |
| 6 | Team geography endpoints (list, update labels, reorder, archive with successor) | New | Additive | Implements the curate half of `FR-CAT-001` and gives `INV-11` a mechanism |
| 7 | Archived geography returns `301`-equivalent successor reference instead of `404` | Marketplace read endpoints | Behavior change | New; nothing depends on the current `404` |

`red-cab-web` impact is confined to the five `routes/tourist/catalog-district/**` modules plus `marketplace-catalog-districts-api.js` — and those modules are being rewritten by `tourist-web-56` anyway (they currently use `clientLoader`, `withTouristAuth`, and `/account/discover/...`, all three of which Session A inverts). Landing the schema first means that rewrite happens once.

---

## 6. Documentation and ADR amendments

| Document | Amendment |
| --- | --- |
| `architecture/decisions/adr-013-geography-reference-data.md` | **Supersede in part.** Keep decisions 1, 3, 4, 5, 6 (official-code seed, no PostGIS, no GeoJSON, haversine near-me, tags on Listings). Rewrite decision 2 (storage shape) and the TL;DR line "District = prefecture or designated city". Add a `Superseded in part by ADR-016` header and a Revisions section dated at the call |
| **New** `architecture/decisions/adr-016-geography-administrative-tree.md` | The tree decision: country entity, `level` vs role separation, `path` materialization, listable-leaf rule, `successor_geography_id`, and the explicit non-decision that public URLs stay two-segment |
| `architecture/geography.md` | Largest rewrite. §Ubiquitous language: District/Area become *roles* on a tree, add Subdivision/Municipality/Ward as levels. §Designated cities: reframe as presentation. §Slug collision: narrow to discovery-root namespace. §Storage shape: replace with the §3.4 sketch. §Seed pipeline: add path/root/listable derivation and the 特別区-vs-行政区 distinction. §Discovery: note the 2-segment URL is a projection |
| `/docs/product/business-rules/glossary` | Redefine District ("a geography node presented as a top-level navigation unit") and Area ("a listable geography node"); add Subdivision, Municipality, Ward, Listable node, Discovery root, Successor geography |
| `/docs/product/business-rules/invariants` | `INV-8`: restate over subtrees ("a node with zero Published Listings in its subtree"). `INV-11`: add the successor-pointer requirement so archive-on-merger is mechanized. `OPR-10`: cascade follows `path` prefix. No change to `PRC-1` or `BKG-11` — state that explicitly |
| `requirements/functional-requirements/cat.md` | `FR-CAT-001`: mention the administrative tree and the code system; `FR-CAT-002`: cascade covers all descendants; `FR-CAT-003`: subtree wording; `FR-CAT-004`: note two-level navigation is a projection of a deeper tree; **new `FR-CAT-033`** — a Listing must attach to a listable node; **new `FR-CAT-034`** — archived geography resolves to its successor |
| `architecture/contexts/catalog.md` | Geography module description and the new aggregate |
| `architecture/decisions/adr-014-service-timezone-model.md` | `timezone` moves from `catalog_areas` to `catalog_geographies` (still NOT NULL, still snapshotted on CheckoutSession/Booking). Add that it is seeded from `catalog_countries.default_timezone` |
| `engineering/domain-to-code-mapping.md` | Geography rows: new table and domain paths; the frontend prefix table is already wrong per Session A §4 and should be fixed in the same pass |
| `domain/domain-models.md` | Replace the District/Area entities with the Geography aggregate |
| `/docs/product/planning/open-questions` | Decision Log: revision row for `AMB-036`; Priority index line. Optionally a new `AMB-041` if the C1-vs-C2 discovery-root choice needs a separate Product decision |
| `red-cab-api/docs/db/catalog.dbml` | Authoritative schema per §3.4 |
| `/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture` | Cross-reference note: URL family unaffected; the slug-resolution item in §5 is now delivered by the geography issue |
| `specs/tourist-web-56/57/58` | Add a dependency on the geography issue, or re-sequence after it |

---

## 7. Explicit call on `AMB-036`

**Supersede in part — do not retire.**

| `AMB-036` clause | Call |
| --- | --- |
| Administrative semantics, not curated tourism regions | **Keep.** Still right, and the tourism-tag layer is still the answer for Ginza and Narita |
| Seed from official codes + city-hall points | **Keep.** Strengthened — `(country_id, code_system, external_code)` gives it the upsert key the current schema lacks |
| All Japan seeded; `INV-8` hides empty nodes | **Keep.** Preserved as a query-time rule |
| No PostGIS at Phase 1; pins and near-me only | **Keep.** Unchanged, and the evolution triggers in `geography.md` stand |
| Tourism labels attach to Listings later | **Keep**, but stop treating it as optional — sequence it into Phase 2 |
| **"Designated cities as Districts; wards as Areas"** | **Supersede.** True as a *navigation* statement, false as a *storage* statement. Designated cities remain top-level in the UI and become children of their prefecture in the data |
| No distance pricing; free-text pickup | **Keep.** `PRC-1` and `BKG-11` are untouched by this proposal |

Record as a revision row in the Decision Log (the pattern `AMB-001` / `AMB-002` already established), not a new `AMB` entry — the question `AMB-036` asked was answered correctly; one implementation clause was wrong.

### Decisions needed

1. **Option A, B, or C** — recommendation is C, with B as the fallback if typed FKs are preferred over CHECK constraints.
2. **C1 or C2** — 67 discovery roots (keeps today's URLs, keeps the homonym rule) or 47 prefecture-only roots (pure mental model, changes 20 top-level URLs). Recommendation is C1. **This must be decided before `tourist-web-56` ships.**
3. **`catalog_countries` now or later** — recommendation is now, without a `/jp` URL segment.
4. **Sequencing** — confirm the geography issue lands before `tourist-web-56/57/58`, or accept writing those specs twice.
