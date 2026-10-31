---
title: Vehicle categories are reference data
sidebar_label: Vehicle categories
sidebar_position: 4
description: Why Catalog keeps the vehicle categories in a table and not in code, and how assets and packages point to it.
normative: true
status: accepted
context: catalog
last_reviewed: 2026-10-31
supersedes:
  - AMB-023 (storage clause: the codes live in application code)
---

## TL;DR \{#vehicle-category-adr-tldr\}

- A new table `catalog_vehicle_categories` holds the definition of each vehicle category.
- An asset and a package keep the category code, and a foreign key points to the table.
- The table says which permit unlocks each category, through its kind.
- Developers seed the table, and the API only reads it.

## About this document

Domain decision record for vehicle category reference data.

| Topic | Document |
| --- | --- |
| Ruling | [Vehicle category reference data](/docs/30-49-domains/catalog/catalog-decisions/#vehicle-category-reference-data) |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) |
| Earlier decision | `AMB-023` in [Open questions](/docs/70-79-business/planning/open-questions) |
| Pattern | [ADR-013: Geography reference data](/docs/30-49-domains/architecture-decisions/adr-013-geography-reference-data) |

---

## Context

`AMB-023` fixed the PRD taxonomy: four private car categories and three charter bus bands.

On 2026-10-26 the product owner replaced that set.

The new set has six types: Sedan, Minivan, Passenger Van, Commuter Van, Microbus and Large Coach Bus.

The seven old codes live in application code today.
- The listing, the package and the asset each define the same Rails enum.
- Two validators repeat the rules for private car and charter bus.
- The web repeats the codes, the English labels and the two groups.

A new category or a new label needs a deploy in the API and in the web.

The API has no endpoint that returns the categories.

A package and an asset both hold a category, and a package may use only vehicles of its category.

## Decision

Keep the definitions in a table, and keep the code on the rows that use it.

- The table `catalog_vehicle_categories` has a unique `code`, two names, a `kind`, a display order and a status.
- `catalog_provider_assets.vehicle_category` and `catalog_listing_packages.vehicle_category` keep the code as a string.
- Each of the two columns has a foreign key to `catalog_vehicle_categories.code`.
- The `kind` is `private_car` or `charter_bus`, and a permit unlocks each kind (see [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses)).
- The names come in English and in Japanese.
- Developers seed the six categories of the product owner, and the API has read endpoints only.
- The migration remaps the old codes on existing rows to the new codes.
- A retired category stays valid on the rows that use it, and it does not appear in the lists.

## Consequences

- The enums on `Catalog::ListingPackage` and `Catalog::ProviderAsset` go away.
- The enum on `Catalog::Listing` goes away with its column in red-cab-api#211 PR 2.
- The validators read the table, so the two repeated lists go away.
- The JSON keeps the code, so existing clients do not break.
- The filter by vehicle type keeps working without a join.
- The web loads the categories from the API and drops its own codes and labels.
- A new category is a data change, with no deploy.
- A team screen to edit categories is a later issue.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Keep the enums | Every change needs a deploy in two repos, and the codes stay in five places. |
| An id column on the asset and the package | The filter and the indexes need a join or an id lookup, and the JSON and the clients change for no gain. |
| Rules for each permit stay in the validators | A new category still needs a deploy, and the two lists stay. |
| Team editing now | It needs endpoints, a screen and tests, and no product need exists before launch. |
