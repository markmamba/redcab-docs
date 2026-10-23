---
title: Tourist browse and search
sidebar_label: Tourist browse and search
sidebar_position: 2
description: What a tourist sees when they browse regions, search by keyword, filter and sort Catalog listings.
doc_type: requirement
normative: true
status: current
context: catalog
last_reviewed: 2026-10-23
supersedes:
  - FR-CAT-003 (partial)
  - FR-CAT-004 (partial)
  - FR-CAT-023 to FR-CAT-027 (partial)
---

## TL;DR \{#browse-tldr\}

- A tourist browses by region, then by prefecture, with no login.
- Keyword, filters and sort work inside the current scope and never widen it.
- Only discoverable listings appear in any result.
- Each card shows the starting price as "From ¥X".
- The sort has four options, and Recently added is the default.

## About this document

This page describes what the tourist sees, without screens, APIs or algorithms.

| Topic | Document |
| --- | --- |
| Rulings | [Catalog decisions](/docs/30-49-domains/catalog/catalog-decisions/#catalog-decisions-tldr) |
| Query param names | [Naming — discover API params](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#discover-api-params) |
| Data | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) |
| Words | [Glossary](/docs/70-79-business/business-rules/glossary) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| scope | The set of listings of the page: all, one region, or one prefecture in a region. |
| discoverable | A listing that may appear in results. See [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness). |
| starting price | The lowest price among the active packages of a listing. |
| package | One sellable option of a listing, for example a 5-seat car for 6 hours. |

## User stories \{#user-stories\}

1. US-1: As a tourist, I want region pictures on the home page, so I can pick where to go.
2. US-2: As a tourist, I want the listings of a region or prefecture, so I can compare services.
3. US-3: As a tourist, I want a keyword search inside the scope, so I can find a name or place.
4. US-4: As a tourist, I want filters, so I see only services that fit my trip.
5. US-5: As a tourist, I want to sort results, so I see the best fit first.
6. US-6: As a tourist, I want a "From" price on each card, so I can compare cost.

## Rules \{#rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| The home page shows a card with an image and a name for each region that has a discoverable listing. | US-1 | The Kanto card shows its image. A region with no image shows a placeholder. |
| A region card opens `/regions/:region-slug/listings`. | US-1 | Selecting Kanto shows the listings of Kanto. |
| A popular destination card opens the prefecture page inside its region. | US-2 | Tokyo opens `/regions/kanto/tokyo/listings`. |
| A direct URL for a region or prefecture that exists shows its listings. An unknown one shows not found. | US-2 | `/regions/kanto/listings` works. `/regions/mars/listings` shows not found. |
| A scope with no matching listing shows an empty state. | US-2 | A prefecture with no discoverable listing shows the empty state. |
| A listing is in a scope when its primary or an additional destination is in that scope. | US-2 | A tour with primary Tokyo and extra Kanagawa shows on both prefecture pages. |
| A listing shows once in one result set. | US-2 | The Kanto page shows that tour once. |
| Only discoverable listings appear. | always | Draft, paused, unlisted and incomplete listings do not appear. |
| The prefecture filter offers only the prefectures of the current region. | US-4 | In Kanto the filter offers Tokyo and Kanagawa, not Osaka. |
| Keyword matches the title, the description, the destination names and the provider legal business name. | US-3 | The keyword Yokohama finds a Tokyo tour with Yokohama as an extra destination. |
| Keyword narrows the scope and never widens it. | US-3 | On the Kanto page, the keyword Osaka shows only Kanto listings that match. |
| Clearing the keyword keeps the scope, the filters and the sort. | US-3 | The tourist clears the field, and the English filter stays on. |
| Service type, language and vehicle type take many values. Values in one category use OR. Categories use AND. | US-4 | English or Japanese, and Sedan, shows a listing with Japanese and Sedan. |
| While a filter is on, a listing without that attribute is excluded. | US-4 | A listing with no languages is hidden while the language filter is on. |
| Clearing one filter keeps the other filters, the keyword and the scope. | US-4 | The tourist clears Sedan, and the language filter stays on. |
| The price filter includes a listing when any active package price is inside the range. Both bounds are inclusive. | US-4 | Packages at ¥8,000, ¥15,000 and ¥25,000 match the range ¥12,000 to ¥18,000. |
| A minimum above the maximum is not applied, and the page shows a message. | US-4 | A minimum of ¥20,000 and a maximum of ¥10,000 shows the message. |
| When a price filter is on, the listing page shows which packages are inside the range. | US-4 | The ¥15,000 package is marked as inside the range. |
| The service date filter shows listings that have an asset open on that date. | US-4 | A listing whose assets are all closed or held on that date is hidden. |
| The group size filter shows listings with an active package whose passenger limit fits. | US-4 | A group of 8 shows packages for 10 passengers, not for 4. |
| The default sort is Recently added, by `published_at`, newest first. | US-5 | The listing published on 15 October ranks above the one published on 10 October. |
| A re-publish moves a listing up. An edit does not. | US-5 | A listing re-published on 1 November ranks by 1 November. |
| Price: low to high sorts by the starting price, even when a price filter is on. | US-5 | Starting price ¥8,000 ranks above ¥12,000 under the range ¥12,000 to ¥18,000. |
| Most booked sorts by bookings confirmed in the last 90 days. | US-5 | A cancelled booking does not count. |
| Top rated sorts by average rating. Unrated listings come last. | US-5 | 4.9 with 40 ratings ranks above 4.9 with 12 ratings. |
| Equal sort keys use the newer `published_at`, then the newer `created_at`. | US-5 | Two listings with the same rating rank by publish time. |
| A change of sort keeps the keyword, the filters and the scope. | US-5 | Sorting by price keeps the region. |
| A card shows the lowest active package price as "From ¥X". Filters do not change it. | US-6 | The card shows "From ¥8,000" while the range is ¥12,000 to ¥18,000. |
| A package that is not active does not count for price, filter or card. | US-6 | A package set to `inactive` is ignored. |

## Worked example \{#worked-example\}

Two discoverable listings exist.

- Listing L has primary Tokyo and extra destination Yokohama.
- Listing M has primary Osaka.

1. The tourist opens the home page and selects the Kanto card.
2. The page shows L but not M, because Tokyo is in Kanto.
3. The tourist types "Yokohama", and L stays because its extra destination matches.
4. The tourist selects the English filter, and L stays because it lists English.
5. The tourist sorts by price, low to high, and L is first with "From ¥8,000" on its card.
6. The tourist clears the keyword, and the Kanto scope, the English filter and the sort stay.

## Related requirements

- [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking)
- [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings)
