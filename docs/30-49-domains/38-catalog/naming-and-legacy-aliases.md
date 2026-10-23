---
title: Naming and legacy aliases
sidebar_label: Naming
sidebar_position: 3
description: Catalog revamp vocabulary — product terms, API params, and legacy crosswalk (P0.1).
doc_type: domain-overview
normative: true
context: catalog
last_reviewed: 2026-10-23
---

## TL;DR \{#naming-tldr\}

- Ratified **2026-10-17** (principal dev vocabulary quiz; passes 1–3).
- **Product terms** for the [Catalog revamp](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/) live here and in the [Glossary](/docs/70-79-business/business-rules/glossary).
- **Legacy** labels (District, Area, featured, `price_min`, and so on) are crosswalk only until migration specs ship.
- Behavior rules remain in [Catalog decisions](/docs/30-49-domains/catalog/catalog-decisions/#catalog-decisions-tldr); this page is **naming only**.
- The front door of the domain is the [Catalog domain](/docs/30-49-domains/catalog/) page.

## About this document

Tier A prose. Implementation specs must use param and field names from this page unless a spec documents a temporary exception (for example IAM company name before the IAM revamp).

| Topic | Document |
| --- | --- |
| Product decisions | [Catalog decisions](/docs/30-49-domains/catalog/catalog-decisions/#catalog-decisions-tldr) |
| Term definitions | [Glossary](/docs/70-79-business/business-rules/glossary) |

---

## Browse and geography \{#browse-geography\}

| Concept | Tourist / product | Storage / DB | Legacy (crosswalk only) |
| --- | --- | --- | --- |
| Macro browse entry | **Region** | `catalog_geographies` **region** level above `subdivision` | District, `is_discovery_root`, `/districts/...` |
| Admin subdivision in IA | **Prefecture** (Tokyo, Chiba, …) | `level = subdivision` under region | `districtSlug`, `district_id`, “District” in JSON |
| Listable leaf browse | *(none in MVP IA)* | Municipality/ward nodes for pickers | **Area**, `areaSlug`, `/areas/.../listings` |
| Discovery root | *(deprecated term)* | — | `is_discovery_root` |
| Listable node | A node a tourist can pick as a booking location | `is_listable` on municipality or ward nodes | **Area** (old meaning: listing attach point) |
| Lower admin levels | City / ward in pickers only | `municipality`, `ward` | Do not expose `subdivision` enum to tourists |
| Home highlights | **Popular destination** | Curated **prefecture** entries (booking-weighted curation) | **Featured**, `featured=true` on districts API |
| Browse scope | All / region / prefecture | See [Listing scope](#listing-scope) | Area-scoped listings index |

**Pickup and booking geography:** The legacy “area list” is used only for **pickup coverage** (provider) and **booking location** picker (tourist municipality/ward). It is not a tourist browse axis.

---

## Listing destinations and coverage \{#destinations-coverage\}

| Concept | Product | Storage |
| --- | --- | --- |
| Primary destination | One required **prefecture** per listing | `primary_geography_id` → `subdivision` (migrate from `geography_id`) |
| Additional destination | 0..n other **prefectures** | Junction listing ↔ geographies |
| Service destination | **Deprecated** — means **primary destination** only | — |
| Pickup coverage | Where the provider will pick up the tourist | Listing junction to prefecture and/or municipality/ward nodes |

Destinations affect **discovery** only. Pickup coverage validates **booking location** at checkout.

---

## Listing scope \{#listing-scope\}

| Scope | Web URL (target) | API scope query |
| --- | --- | --- |
| All marketplace | `/listings` | Omit `region_slug` and `prefecture_slug` |
| Region | `/regions/:region-slug/listings` | `region_slug` |
| Prefecture / popular destination | `/regions/:region-slug/:prefecture-slug/listings` | `region_slug` + `prefecture_slug` |

Keyword, filters, and sort apply **within** the current scope. See [Discover API params](#discover-api-params).

---

## Pricing and visibility \{#pricing-visibility\}

| Concept | Product | Storage / API |
| --- | --- | --- |
| Package | Sellable option on one listing (Standard / Premium / VIP) | Rows in `catalog_listing_packages`; the pricing policy stays for shared rules |
| Pricing policy | Listing-level rules: pricing mode and cancellation | `catalog_pricing_policies` (price tiers wait for Phase 2) |
| Starting price | “From ¥X” on card | Min **available** package price; cache `starting_price_jpy` |
| Published | Listing **status** after explicit publish | `status_published` |
| Discoverable | May appear in marketplace results | Published + complete per [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) + status rules (not paused/unlisted/draft) |
| Publication requirements | Gates to **publish** | Photo, payout, **verified provider**, and so on |
| Completeness | Gates to be **discoverable** | Destination, coverage, photo and an available package |
| Verified provider | Provider account ready to publish (replaces “operable provider”) | Disambiguate from **verified merchant account** in glossary |

---

## Sort and discover labels \{#sort-discover-labels\}

| Tourist label | Sort key | Notes |
| --- | --- | --- |
| **Recently added** (default) | `order_by=published_at`, `order_dir=desc` | Replaces **Newest** in UI |
| Price: low to high | `starting_price_jpy` asc | [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-sort-options) |
| Most booked | Booking count column | 90-day window by **confirmation date** (`confirmed_at`) |
| Top rated | Rating columns | Per [Top rated sort](/docs/30-49-domains/catalog/catalog-decisions/#top-rated-sort) and `FR-REV-007` |

**Explore / Discover:** No `/discover` hub in MVP. **Explore** / **Browse** CTAs link to real routes. Legacy `/discover` redirects. Code filenames `*-discover-*` are legacy until rename.

**Instant book:** Product phrase for confirm on successful payment without provider acceptance (see [Booking confirmation](/docs/30-49-domains/catalog/catalog-decisions/#booking-confirmation)). Not a per-listing flag in MVP.

---

## Discover API params \{#discover-api-params\}

Successor index: **`GET /marketplace/catalog/listings`** with query params below. Web paths may differ; loaders map path slugs to query scope.

| Tourist / product | Query param | Value shape |
| --- | --- | --- |
| Keyword search | `keyword` | String (not `q`) |
| Region scope | `region_slug` | Slug |
| Prefecture scope | `prefecture_slug` | Slug (optional) |
| Service date | `date` | ISO date (label: **Service date**) |
| Group size | `passenger_count` | Integer (label: **Group size**) |
| Price min / max | `min_price`, `max_price` | Inclusive JPY (legacy: `price_min`, `price_max`) |
| Service type | `service_type` | Comma-separated (OR within category) |
| Language | `language` | Comma-separated |
| Vehicle type | `vehicle_type` | Comma-separated (listing field: `vehicle_category`) |
| Sort | `order_by`, `order_dir` | Whitelisted columns |

**Multi-select example:** `service_type=charter_bus%2Ctour_guide` (comma-separated, URL-encoded).

---

## Listing URLs and checkout \{#urls-checkout\}

| Use | Canonical |
| --- | --- |
| Listing detail | `/listings/:listing-slug` |
| Share resolver | `/listings/:uuid` → redirect to slug URL |
| Checkout package choice | `package_slug` per listing (e.g. `standard`); resolve to `package_id` internally |

---

## Availability words \{#availability-words\}

| Concept | Product | Storage | Legacy (crosswalk only) |
| --- | --- | --- | --- |
| Asset hold | One booking holds one vehicle or guide for one time range | `catalog_asset_holds` | **Slot**, `catalog_availability_slots` |
| Schedule | Weekly working days and hours of an asset | `catalog_asset_schedules` | Slots made by hand |
| Closure | One day an asset does not work | `catalog_asset_closures` | Closed slot |
| Asset pool | The assets a package can use | `catalog_package_assets` | `primary_provider_asset_id` |
| Start window | First and last start time of a package | `catalog_listing_packages.earliest_start_time`, `latest_start_time` | Slot `start_time` |
| Seat counter | *(none in MVP: a booking gets the whole asset)* | — | `remaining_capacity`, `available_seats` |

---

## Keyword search — provider name \{#keyword-provider\}

Provider leg of keyword search matches **legal business name** (registered company name), not marketing display name.

**Gap:** IAM does not yet store company name. Catalog keyword spec must define interim behavior until the IAM revamp. This ruling **supersedes** [keyword search scope — provider display name](/docs/30-49-domains/catalog/catalog-decisions#keyword-search-scope) until decisions and IAM align.

---

## Change log \{#naming-change-log\}

| Date | Change |
| --- | --- |
| 2026-10-17 | Initial page from vocabulary quiz passes 1–3 (40 decisions). |
| 2026-10-23 | Package and policy rows match the ruled model. Added availability words. Removed scratchpad IDs and the follow-up note. |
