---
title: Geography model
sidebar_label: Geography
sidebar_position: 1
description: The Catalog geography tree with four levels, its rules, and how paths drive URLs and pickup coverage.
doc_type: model-spec
normative: true
status: current
context: catalog
last_reviewed: 2026-10-23
supersedes:
  - ADR-016 (three-level tree)
---

## TL;DR \{#geography-tldr\}

- The table `catalog_geographies` stores one tree with four levels: region, prefecture, municipality and ward.
- Only a region has no parent, and every prefecture has a region parent.
- The column `catalog_geographies.path` starts with the region and drives URL lookup and coverage matching.
- Only a municipality or a ward can be listable, which means a tourist can pick it as a booking location.
- The DBML file wins on column names and types.

## About this document

This is the model page for the geography tree, and rulings are in [Catalog decisions](/docs/30-49-domains/catalog/catalog-decisions/#region-level).

| Topic | Document |
| --- | --- |
| Rulings | [Region level](/docs/30-49-domains/catalog/catalog-decisions/#region-level), [Legacy geography roles](/docs/30-49-domains/catalog/catalog-decisions/#legacy-geography-roles) |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Old design | [ADR-016: Geography administrative tree](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| the table `catalog_geographies` | One row for each node of the tree. |
| region | The top level of the tree, for example Kanto. |
| prefecture | A node with `level: "subdivision"`, for example Tokyo. |
| listable node | A node with `is_listable: true`. A tourist can pick it as a booking location. |
| `path` | The slugs from the region down to the node, joined by `/`. |
| popular rank | The order of a curated popular destination. Only prefectures have one. |

## Levels \{#levels\}

The column `catalog_geographies.level` has four values.

| Value of `level` | Tourist word | Role | Example |
| --- | --- | --- | --- |
| `region` | Region | Home page card and browse scope | Kanto |
| `subdivision` | Prefecture | Listing destination, filter and coverage | Tokyo |
| `municipality` | City | Coverage, and booking location when listable | Yokohama |
| `ward` | Ward | Coverage, and booking location when listable | Nishi-ku |

Phase 1 has 9 regions, and Okinawa is its own region.
- The code system for regions is `redcab_region`, with codes 01 to 09.
- The region of each border prefecture is set in the seed spec.

## Tree rules \{#tree-rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| Only a region has no parent. | always | Kanto has no parent. The parent of Tokyo is Kanto. |
| A listable node is a ward, or a municipality with no wards, and it has coordinates. | booking location | Naka-ku can be a booking location. Yokohama and Tokyo cannot. |
| `path` joins the slugs from the region down. | URL lookup, coverage | `kanto/kanagawa/yokohama/nishi` |
| The slug is unique for each level among regions and prefectures. | always | Hokkaido is the slug of one region and of one prefecture. |
| A region has no coordinates and uses the country timezone. | always | Kanto has no latitude and uses `Asia/Tokyo`. |
| Only a prefecture can have `popular_rank`. | popular destinations | Tokyo has rank 1. |
| An archive with a successor moves destinations, coverage and listings to the successor. | INV-11 | Archived node A moves its listings to node B. |
| New code must not read `is_discovery_root` or `discovery_root_id`. | legacy routes | Only the old `/districts` routes read them until slice S9. |

The Project note of the DBML file holds the matching CHECK rules.

```text
# red-cab-api/docs/db/catalog.dbml:88-91
    - catalog_geographies: CHECK ((parent_id IS NULL) = (level = 'region'))               -- C1, DP-2c (ships in: S1)
    - catalog_geographies: CHECK (NOT is_listable OR level IN ('municipality','ward'))    -- DP-2d (ships in: S1)
    - catalog_geographies: CHECK (NOT is_listable OR (latitude IS NOT NULL AND longitude IS NOT NULL))
    - catalog_geographies: CHECK (popular_rank IS NULL OR level = 'subdivision')          -- DP-14a (ships in: S1)
```

## Worked example \{#worked-example\}

A tourist opens `/regions/kanto/tokyo/listings`.

1. The web loader looks up the node with `path: "kanto/tokyo"`.
2. The lookup finds the prefecture Tokyo, whose parent is the region Kanto.
3. The API returns discoverable listings whose primary or additional destination is Tokyo.
4. The URL `/regions/kansai/tokyo/listings` finds no row, so the page shows not found.

## Related requirements

- [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search)
- [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages)
