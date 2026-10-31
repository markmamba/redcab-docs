---
title: Listings and packages model
sidebar_label: Listings and packages
sidebar_position: 2
description: The Catalog listing, its destinations, pickup coverage, packages, display prices and the discoverable scope.
doc_type: model-spec
normative: true
status: current
context: catalog
last_reviewed: 2026-10-31
supersedes:
  - FR-CAT-033 (partial)
  - PRC-2 (one policy for each listing)
---

## TL;DR \{#listings-tldr\}

- The table `catalog_listings` holds the status of a listing and its one primary destination.
- A package in `catalog_listing_packages` is one sellable option: vehicle category, passenger limit, duration, start window and price.
- Additional destinations and pickup coverage are separate tables, so a destination never grants coverage.
- Two display price columns serve filter and sort, and one service writes them.
- One query scope decides whether a listing is discoverable, and no stored flag exists.

## About this document

This is the model page for listings, destinations, coverage and packages, and rulings are in [Catalog decisions](/docs/30-49-domains/catalog/catalog-decisions/#catalog-decisions-tldr).

| Topic | Document |
| --- | --- |
| Rulings | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy), [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure), [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) |
| Asset pool and holds | [Asset availability model](/docs/30-49-domains/catalog/models/asset-availability) |
| Pricing invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| the table `catalog_listings` | One row for each bookable service of one provider company. |
| package | One sellable option of a listing, a row in `catalog_listing_packages`. It is not a Multi-Day Package (`E-04`). |
| pricing policy | The one row in `catalog_pricing_policies` for a listing. It holds pricing mode and cancellation. |
| asset pool | The assets a package can use, as rows in `catalog_package_assets`. |
| vehicle category | The type of a vehicle. A row in `catalog_vehicle_categories` defines it, and the `code` is the link. |
| display price | A stored price for filter, sort and the card. It is never the charged price. |
| pickup coverage | The places where a provider picks up tourists, as rows in `catalog_listing_pickup_coverages`. |
| discoverable | A listing that may appear in browse and search. |

## Listing columns \{#listing-columns\}

The table `catalog_listings` has these main columns.

| Column | Meaning | Written by |
| --- | --- | --- |
| `primary_geography_id` | The primary destination. It must be a prefecture. | `Catalog::Listings::ProvidersCreateManager` and `Catalog::Listings::ProvidersUpdateManager` |
| `slug` | The global address. It is fixed after the first publish. | `Catalog::Listings::ProvidersCreateManager` |
| `status`, `published_at` | The lifecycle. Each publish sets `published_at`. | `Catalog::Listings::ProvidersPublishManager` |
| `starting_price_jpy` | The lowest display price of an available package. It is empty when none exists. | `Catalog::Pricing::RefreshDisplayPricesService` |
| `rating_average`, `reviews_count` | Display only. The Reviews context owns the score. | `Catalog::Listings::ApplyRatingRecalculatedManager` |
| `bookings_count_90d` | Bookings confirmed in the last 90 days. | `Catalog::Listings::RefreshBookingCountsService` |

Three old columns of `catalog_listings` move to the package.

| Old column | New place |
| --- | --- |
| `base_capacity` | `catalog_listing_packages.max_passengers` |
| `vehicle_category` | `catalog_listing_packages.vehicle_category` |
| `primary_provider_asset_id` | The asset pool in `catalog_package_assets` |

## Destinations and coverage \{#destinations-and-coverage\}

Destinations and coverage are two tables with two meanings.

| Table | Meaning | Key rule |
| --- | --- | --- |
| `catalog_listing_additional_destinations` | Prefectures where the service also goes | A prefecture that is not the primary destination |
| `catalog_listing_pickup_coverages` | Places where the provider picks up | A prefecture, municipality or ward, never a region |

| Rule | Applies to | Example |
| --- | --- | --- |
| A listing has exactly one primary destination. | always | A private tour has Tokyo as its primary destination. |
| A destination never creates pickup coverage. | always | A Tokyo tour with Kanagawa as extra destination still needs coverage for a Yokohama pickup. |
| A coverage node cannot sit inside another selected coverage node. | provider save | Tokyo and Shinjuku together are rejected. |
| A draft may have no coverage rows. | draft | A new draft has none. |
| A discoverable listing needs at least one coverage row. | discoverability | A published listing with no rows is hidden. |
| A coverage change affects only bookings that are not confirmed. | booking | A confirmed booking stays valid. |

The matching rule is in the Project note of the DBML file.

```text
# red-cab-api/docs/db/catalog.dbml:581-584
    COVERAGE RULE (DP-6c)
    - A booking location node L is covered when one coverage node C on the listing matches:
      L.path = C.path OR L.path LIKE C.path || '/%'.
    - A :subdivision row covers the whole prefecture, with no exclusions in MVP.
```

## Packages \{#packages\}

The table `catalog_listing_packages` has one row for each sellable option.

| Column | Meaning |
| --- | --- |
| `slug` | The `package_slug` that checkout sends. It is unique for each listing among packages that are not archived. |
| `schedule_kind` | `full_day` holds the asset for the whole day. `timed` holds it for the booked hours. |
| `duration_minutes` | The length of the service. It is above 0. |
| `earliest_start_time`, `latest_start_time` | The local start window. The tourist picks a start time inside it. |
| `start_interval_minutes` | The step between start times, for example 30. |
| `buffer_minutes` | Free minutes after a timed job. Empty means 0. |
| `max_passengers` | The passenger limit, driver excluded. It cannot exceed the capacity of any pool asset. |
| `vehicle_category` | The code of the vehicle category. Every vehicle in the pool has it. A foreign key points to `catalog_vehicle_categories.code`. |
| `base_price_jpy` | The rate that the quote reads. It is never the displayed or charged price. |
| `display_price_jpy` | The stored display price. |
| `status` | `active`, `inactive` or `archived`. |

| Rule | Applies to | Example |
| --- | --- | --- |
| A listing has at most 5 packages that are not archived. | provider save | The sixth package is rejected. |
| A package is available when it is `active`, has an active pool asset and has a valid permit for its vehicle kind. | discovery | A package with only a retired vehicle is not available. |
| A listing has exactly one service type: `tour`, `airport_transfer`, `private_charter` or `port_transfer`. | provider save | A Tokyo day trip has `tour`. |
| The pricing policy sets pricing mode and cancellation for all packages. | pricing | Both packages of a tour are priced per vehicle. |
| A package with bookings is archived and never deleted. | provider save | An old package stays for booking history. |
| Until slice S4 ships, a listing may have one package, which the system creates by default. | provider save | Release 2 creates one default full-day package for each listing. |
| Pricing tiers, seasonal overrides and extra charges stay on the policy until Phase 2. | pricing | No change in this model. |

The DBML Project note holds the CHECK rules of the package.

```text
# red-cab-api/docs/db/catalog.dbml:94-98
    - catalog_listing_packages: CHECK (duration_minutes > 0)                              -- DP-7b (ships in: S5)
    - catalog_listing_packages: CHECK (latest_start_time >= earliest_start_time)          -- B-4 (ships in: S5)
    - catalog_listing_packages: CHECK (start_interval_minutes > 0)                        -- B-4 (ships in: S5)
    - catalog_listing_packages: CHECK (buffer_minutes IS NULL OR buffer_minutes >= 0)     -- B-7 (ships in: S5)
    - catalog_listing_packages: CHECK (max_passengers >= 1)                               -- DP-7c (ships in: S5)
```

## Vehicle categories \{#vehicle-categories\}

The table `catalog_vehicle_categories` has one row for each vehicle category.

| Column | Meaning |
| --- | --- |
| `code` | The stable code, for example `commuter_van`. It is unique, and assets and packages point to it. |
| `name_en`, `name_ja` | The names that the clients show. |
| `kind` | `private_car` or `charter_bus`. A permit of the provider company unlocks each kind. |
| `display_order` | The order in a list. |
| `status` | `active` or `archived`. |

| Rule | Applies to | Example |
| --- | --- | --- |
| A vehicle asset and a package keep the `code` of a category. | provider save | A van has `commuter_van`. |
| Guide assets and guide-only packages are for a later phase. | always | Every asset now is a vehicle with a category. |
| The passenger car permit unlocks vehicles of the kind `private_car`. See [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses). | provider save | A company with only the chartered permit cannot save a Sedan. |
| The chartered permit unlocks vehicles of the kind `charter_bus`. | provider save | A company with only the passenger car permit cannot save a Microbus. |
| A provider can save a vehicle when the company has a permit record for its kind, even before the team checks it. | provider save | A new company adds the chartered permit and then saves a Microbus. |
| An archived category stays valid on the rows that use it. | always | An old van keeps its category. |
| A list of categories hides an archived category. | provider save | A new package cannot pick it. |
| Developers seed the table, and the API only reads it. | always | A new category is a data change. |

The six categories of the product owner are the seed.

The Japanese names are proposed and need review.

| Code | Kind | English name | Japanese name |
| --- | --- | --- | --- |
| `sedan` | `private_car` | Sedan | セダン |
| `minivan` | `private_car` | Minivan | ミニバン |
| `passenger_van` | `private_car` | Passenger Van | パッセンジャーバン |
| `commuter_van` | `charter_bus` | Commuter Van | コミューターバン |
| `microbus` | `charter_bus` | Microbus | マイクロバス |
| `large_coach_bus` | `charter_bus` | Large Coach Bus | 大型観光バス |

## Price caches \{#price-caches\}

Two columns hold display prices, and one service writes both.

- `catalog_listing_packages.display_price_jpy` is the quote for one passenger with no date.
- It is empty when the package is not available.
- `catalog_listings.starting_price_jpy` is the lowest display price of an available package.
- The writer is `Catalog::Pricing::RefreshDisplayPricesService`.
- It runs in the same transaction as any package, pool, asset or pricing mode change.
- Checkout never reads these columns and always calls `Catalog::Pricing::CalculateQuoteService`.
- The starting price ignores seasonal overrides until Phase 2 decides.

## Discoverable scope \{#discoverable-scope\}

The scope `Catalog::Listing.discoverable` is a query and stores nothing.

```text
# red-cab-api/docs/db/catalog.dbml:511-515
    DISCOVERABLE = Catalog::Listing.discoverable (one scope, calculated at query time, DP-11):
    - status = :published
    - EXISTS an available package (live check, see the catalog_listing_packages note, C2)
    - EXISTS a catalog_listing_photos row (INV-10)
    - EXISTS a catalog_listing_pickup_coverages row (DP-6)
```

Each filter reads these data.

| Filter | Reads |
| --- | --- |
| Region or prefecture scope | The primary destination, or an additional destination, below the scope path |
| Vehicle type | `catalog_listing_packages.vehicle_category` of available packages |
| Group size | `catalog_listing_packages.max_passengers` of available packages |
| Service date | A pool asset that is open on the date and has no live full-day hold |
| Price range | `catalog_listing_packages.display_price_jpy` of available packages |
| Service type and language | `catalog_listings.service_type` and `catalog_listings.languages_supported` |
| Keyword | Titles, descriptions, destination names and `providers_companies.business_name` |

For a timed package, the date filter means "may have free times", and the time picker gives the exact answer.

## Worked example \{#worked-example\}

A provider lists one Tokyo tour with two packages, and the prices are example values.

1. Package A is a 5-seat car for 4 passengers at ¥40,000.
2. Package B is an 11-seat van for 10 passengers at ¥55,000.
3. `Catalog::Pricing::RefreshDisplayPricesService` writes both display prices and sets `starting_price_jpy` to 40000.
4. A tourist filters the price from ¥45,000 to ¥60,000.
5. The listing appears because Package B is inside the range.
6. The card still shows "From ¥40,000", the starting price.

## Related requirements

- [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search)
- [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings)
