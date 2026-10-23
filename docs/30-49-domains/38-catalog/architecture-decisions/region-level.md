---
title: Region is the top level of the geography tree
sidebar_label: Region level
sidebar_position: 1
description: Why Catalog adds a region level above the prefecture in the geography tree.
normative: true
status: accepted
context: catalog
last_reviewed: 2026-10-23
supersedes:
  - ADR-016 (three-level tree)
---

## TL;DR \{#region-adr-tldr\}

- The table `catalog_geographies` gets a fourth level, `region`, above the prefecture.
- Each prefecture has a region parent.
- The change replaces the three-level tree of `ADR-016` and the level wording of `INV-8`.

## About this document

Domain decision record for the Catalog geography tree.

| Topic | Document |
| --- | --- |
| Ruling | [Region level](/docs/30-49-domains/catalog/catalog-decisions/#region-level) |
| Model | [Geography model](/docs/30-49-domains/catalog/models/geography) |
| Replaced record | [ADR-016: Geography administrative tree](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree) |
| Open questions | [Open questions](/docs/30-49-domains/catalog/catalog-decisions/#open-forks) |

---

## Context

Tourists browse by region, for example Hokkaido, Tohoku and Kanto.

`ADR-016` stores three levels (subdivision, municipality and ward) and adds two discovery roles, District and Area.

A region needs the same rules as a prefecture.
- It is hidden when it has no discoverable listing.
- It has a status and an archive path.
- It needs an image and a stable ID.

No tourist catalog is live in production yet, so the tree can still change.

## Decision

Add `region` as the top level of `catalog_geographies`.

- Each prefecture has a region parent, and only a region has no parent.
- The column `path` starts with the region, for example `kanto/tokyo`.
- Slugs are unique for each level among regions and prefectures.
- Phase 1 has 9 regions, and Okinawa is its own region.
- Region codes use the code system `redcab_region`.

## Consequences

- `INV-8` and `ADR-016` change in the same pull request as this record.
- The seed service creates the regions first, moves the prefectures under them and rebuilds every `path`.
- The parent CHECK and the listable CHECK change, and the slug index changes.
- Code that treats a prefecture as the root of the tree must change.
- The legacy columns `is_discovery_root` and `discovery_root_id` stay until slice S9.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| A separate table `catalog_regions` | It makes two geography concepts with two lifecycles. Images, slugs and status would repeat. |
| A constant map in code | It has no status, no stable ID for images, and no admin edits. The hide-empty rule would live in application code. |
