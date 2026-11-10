---
title: Catalog decisions
sidebar_label: Decisions
sidebar_position: 2
description: Current Catalog rulings. One section for each decision, with the reason and what it replaces.
doc_type: domain-decisions
normative: true
status: current
context: catalog
last_reviewed: 2026-11-10
supersedes:
  - FR-CAT-003 (partial)
  - FR-CAT-004 (partial)
  - FR-CAT-025 (partial)
  - FR-CAT-026 (partial)
  - FR-CAT-027 (partial)
  - FR-CAT-033 (partial)
  - ADR-016 (three-level tree)
legacy_ids:
  - FR-CAT-003
  - FR-CAT-004
  - FR-CAT-026
  - FR-CAT-027
  - FR-CAT-033
---

## TL;DR \{#catalog-decisions-tldr\}

- This page holds every current Catalog ruling, each with one section and one stable link.
- Behavior that users see is in [requirements](/docs/30-49-domains/catalog/requirements/).
- Structure is in [models](/docs/30-49-domains/catalog/models/geography).
- A big ruling keeps its reasons and its options in sub-sections of its own entry.
- This page is the source of truth, and an old invariant applies only where this page cites it.
- Open items are only in [Open questions](#open-forks).

## About this document

Each entry is numbered `D1`, `D2` and so on.

It carries the day when it was first written into these docs.

Rulings are recorded here once, and requirements, models and specs link here instead of restating them.

| Topic | Document |
| --- | --- |
| Front door | [Catalog domain](/docs/30-49-domains/catalog/) |
| Words | [Glossary](/docs/70-79-business/business-rules/glossary) |
| Old names | [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#naming-tldr) |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) |

The principal developer approved these rulings, but Product Owner sign-off is not recorded.

---

## D1 — Tourist discovery information architecture (2026-10-17) \{#tourist-discovery-ia\}

Tourist browse is region first.

- The home page shows Region cards that open the listings of a region.
- Prefecture is a filter inside the current region, not a top-level axis.
- Service type is a filter, not a navigation axis.
- A popular destination, for example Tokyo, opens a prefecture page inside its region.
- Public browse needs no login (`AMB-022` Option A).
- The public URLs are `/listings`, `/regions/:region-slug/listings`, `/regions/:region-slug/:prefecture-slug/listings` and `/listings/:listing-slug`.
- Legacy `/districts/...` URLs redirect with 301, and they are not live in production.
- Near-me is deferred, and there is no `/discover` hub in MVP.
- Why: tourists think "Kanto, then Tokyo" and do not browse by ward.
- Replaces: `FR-CAT-003`, `FR-CAT-004`, the URL part of `ADR-017`, `AMB-020`, and specs `web-57`, `web-59`, `web-65`, `web-66`.

## D2 — Region level (2026-10-23) \{#region-level\}

A region is the top level of the geography tree.

- The tree has four levels: region, prefecture (`subdivision`), municipality and ward.
- Phase 1 has 9 regions, and Okinawa is its own region.
- Region codes use the code system `redcab_region`, with codes 01 to 09.
- Only a region has no parent, so every prefecture has a region parent.
- A node shows to tourists only when a discoverable Listing has a destination in its subtree.
- Counts come from the query, and the database does not store them.
- The column `path` starts with the region, for example `kanto/tokyo`.
- Slugs are unique for each level among regions and prefectures.
- Replaces: the three-level wording of `INV-8` and of `ADR-016`.
- Structure: [Geography model](/docs/30-49-domains/catalog/models/geography).

### Why \{#region-level-why\}

- Tourists browse by region, for example Hokkaido, Tohoku and Kanto.
- A region needs the same rules as a prefecture.
  - It is hidden when it has no discoverable listing.
  - It has a status and an archive path.
  - It needs an image and a stable ID.
- No tourist catalog is live in production yet, so the tree can still change.

### What changes with it \{#region-level-changes\}

- The seed service creates the regions first, moves the prefectures under them and rebuilds every `path`.
- The parent CHECK and the listable CHECK change, and the slug index changes.
- Code that treats a prefecture as the root of the tree must change.
- The legacy columns `is_discovery_root` and `discovery_root_id` stay until slice S9.

### Options we did not choose \{#region-level-options\}

| Option | Why not chosen |
| --- | --- |
| A separate table `catalog_regions` | It makes two geography concepts with two lifecycles. Images, slugs and status would repeat. |
| A constant map in code | It has no status, no stable ID for images, and no admin edits. The hide-empty rule would live in application code. |

## D3 — Keyword search scope (2026-10-17) \{#keyword-search-scope\}

Keyword search finds listings by what they are, where they go and who runs them.

- A listing matches when the keyword is in its title or description.
- A listing also matches the name of its primary destination or of any additional destination.
- A listing also matches the legal business name of its provider.
- Matching ignores case and finds any part of a word.
- The page updates after a pause of about 300 to 500 ms, and the URL param is `keyword`.
- Keyword narrows the current scope, filters and sort, and never widens them.
- Clearing the keyword keeps the scope, the filters and the sort.
- Why: a tourist can search Yokohama and find a Tokyo tour that also goes there.
- Replaces: the "no keyword" limit in specs `api-161` and `web-124`.
- The provider name is the column `providers_companies.business_name`.

## D4 — Marketplace filter combination (2026-10-17) \{#marketplace-filter-combination\}

Filters in one category use OR, and filters in different categories use AND.

- Service type, language and vehicle type take many values.
- A listing matches a category when it has any selected value.
- A listing must match every category that has a selection.
- A vehicle type matches a listing when any available package has that vehicle category.
- Service date and group size filters stay.
- Group size matches the passenger limit of a package.
- A listing without the attribute of an active filter is excluded.
- A tourist can clear all filters, and the sort stays.
- Why: tourists accept alternatives inside a category and narrow across categories.
- Replaces: the single-value filter wording of `FR-CAT-025`.

## D5 — Starting price and price filter (2026-10-23) \{#starting-price-and-price-filter\}

The starting price of a listing is the lowest price among its available packages.

- The price filter includes a listing when any available package price is inside the bounds.
- Both bounds are inclusive, and one bound alone is valid.
- A minimum above the maximum is invalid and is not applied.
- The card shows the starting price as "From ¥X", and it need not be inside the filter range.
- The listing page shows which packages are inside the range.
- The Pricing module supplies every price (`PRC-1`).
- Discovery reads a stored display price, and checkout quotes again.
- Why: a tourist finds services that fit the budget while card prices stay steady.
- Replaces: the single starting price in `FR-CAT-026`.

## D6 — Marketplace sort options (2026-10-17) \{#marketplace-sort-options\}

The sort control has four options.

- **Recently added** is the default and sorts by `published_at`, newest first.
- **Price: low to high** sorts by the starting price, and the price filter does not change that order.
- **Most booked** follows [Most booked sort](#most-booked-sort).
- **Top rated** follows [Top rated sort](#top-rated-sort).
- Each successful publish sets `published_at`, including a re-publish after a pause.
- An edit without a publish does not change `published_at`.
- Equal keys use the newer `published_at`, then the newer `created_at`.
- Why: the default order shows what became public most recently.
- Replaces: `FR-CAT-027`, spec `web-67` and the label "Newest".

## D7 — Most booked sort (2026-10-17) \{#most-booked-sort\}

Most booked ranks listings by recent demand.

- A booking counts when payment succeeded and its status is Confirmed or Completed.
- A Completed booking whose payout is queued (status Payout queued) still counts as Completed.
- Its confirmation time must be inside the last 90 days.
- Cancelled, Failed and fully refunded bookings do not count.
- Each booking counts once.
- Scheduled service date and completion date do not decide the window.
- Why: lifetime popularity must not dominate the ranking.
- Replaces: the deferred "most booked" intent in `FR-CAT-027`.

## D8 — Top rated sort (2026-10-17) \{#top-rated-sort\}

Top rated ranks listings by average customer rating.

- It uses the published reviews of `FR-REV-007`.
- Rated listings come first, highest average first.
- Listings without a rating come last.
- There is no minimum number of ratings.
- A tie goes to the listing with more ratings, then to the newer listing.
- Why: the ranking stays simple and open to read.
- Replaces: the deferred "rating" sort in `FR-CAT-027`.

## D9 — Destination structure (2026-10-17) \{#destination-structure\}

Each listing has one primary destination and may have more.

- The primary destination is required and is a prefecture.
- Additional destinations are zero or more other prefectures.
- A region or prefecture page includes a listing when its scope matches the primary or any additional destination.
- A listing shows once in a result set.
- Additional destinations widen discovery and keyword search only.
- A destination never creates pickup coverage.
- Why: one service can go to several places without one listing for each.
- Replaces: the single `geography_id` attach rule in `FR-CAT-033`.

## D10 — Pickup coverage registration (2026-10-17) \{#pickup-coverage-registration\}

A provider registers pickup coverage for each listing, apart from destinations.

- A coverage row is a prefecture, a municipality or a ward.
- A prefecture covers the whole prefecture, and MVP has no exclusions.
- A location is covered when a coverage path equals its path or is a prefix of it.
- A coverage node cannot sit inside another selected coverage node.
- A draft may have no coverage, but a discoverable listing needs at least one row.
- Map-drawn areas and street-address coverage are out of MVP.
- Why: the provider gets useful detail without drawing maps.
- Replaces: the gap where coverage was deferred in the geography pattern.

## D11 — Pickup coverage validation timing (2026-10-17) \{#pickup-coverage-validation-timing\}

RedCab checks the booking location against pickup coverage before it confirms a booking.

- The tourist searches for one booking location and picks a municipality or a ward.
- RedCab checks coverage when checkout is created or changed, and again when the booking is made.
- The check uses the latest saved coverage.
- A location outside coverage, or a check that cannot finish, blocks confirmation.
- The error message says why.
- A confirmed booking stays valid if coverage changes later.
- Why: instant booking needs a clear gate and no provider approval.
- Replaces: free-text pickup as the only check in `BKG-11`.

## D12 — Listing publication (2026-10-17) \{#listing-publication\}

A provider saves drafts and publishes on purpose.

- Saving a listing never makes it visible to tourists.
- There is no administrator approval for each listing.
- A provider can edit a published listing in place.
- RedCab checks completeness on every save and hides a failing listing at once.
- Publish gates: one photo, pickup coverage, an approved provider company, verified payout and at least one available package.
- A provider can save a draft with no coverage, but a listing with no coverage cannot publish.
- An expired permit blocks only the listings that depend on it, because their packages are not available.
- Why: preparing a listing and publishing it are two different acts.
- Replaces: the draft-only edit rule in the provider update path, and `INV-7`.

## D13 — Discoverability completeness (2026-10-17) \{#discoverability-completeness\}

A tourist sees only listings that are published and complete.

- A listing is discoverable when it is published.
- It also needs a primary destination, one photo and one coverage row.
- It also needs one available package.
- It also needs a provider company with the status `approved`, so a suspended company is hidden at once.
- The query decides this each time, and no stored flag exists in MVP.
- The test does not read the stored starting price, because that price can lag.
- A listing that fails the test is hidden even if its status is `published`.
- A direct link to a listing with no available package shows "currently unavailable".
- Checkout is blocked for that listing.
- A missing optional attribute does not hide a listing.
- Why: tourists must not find a listing they cannot book.
- Replaces: the `status_published` only test in the marketplace index.

## D14 — Booking confirmation (2026-10-17) \{#booking-confirmation\}

Payment confirms a booking when all checks pass.

- RedCab confirms after reliable proof of successful payment.
- Every required check must pass first, including pickup coverage.
- RedCab checks coverage and the hold again just before payment starts.
- If a check fails after payment succeeds, RedCab reverses the charge and makes no booking.
- The provider does not accept the booking.
- Why: B2C instant booking already works this way.
- Replaces: the checkout order before the `BKG-11` amendment.

## D15 — Packages and pricing policy (2026-10-23) \{#packages-and-pricing-policy\}

A package is one sellable option of a listing.

- A package has a vehicle category, a passenger limit, a duration, a start window and a price.
- A listing has at most 5 packages that are not archived.
- Until slice S4 ships, a listing may have one package, which the system creates by default.
- The pricing policy stays one for each listing and sets pricing mode and cancellation for all packages.
- A package is available when all of these are true.
  - Its status is `active`.
  - Its pool has an active asset.
  - A valid permit unlocks its vehicle kind.
- One service writes two stored display prices for discovery, and checkout never reads them.
- Checkout takes `package_slug`, and the server finds the package.
- The client never sends a price.
- Price tiers, seasonal overrides and extra charges wait for Phase 2.
- The policy keeps `pricing_mode`, `currency` and `cancellation_policy_source`.
- A package holds the name, vehicle category, passenger limit, duration, start window, buffer, base price and status.
- The Pricing module stays the only price authority.
- Replaces: one price for each listing in `PRC-2`.
- Structure: [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages).

### Why \{#packages-and-pricing-policy-why\}

- A tourist needs several options on one listing, for example a 5-seat car and an 11-seat van.
- A charter has one vehicle and one set of terms, but several lengths and prices.
- The pricing mode is exclusive for each listing, and the cancellation policy is one for each listing.
- A booking copies the price and the cancellation tiers by value.
  - A later change in Catalog pricing never changes a booking.

### What changes with it \{#packages-and-pricing-policy-changes\}

- The starting price is the lowest quote of an available package.
- `Catalog::Pricing::CalculateQuoteService` reads the mode from the policy and the base rate from the package.
- The slot price override goes away with the slot.
- Bookings copy the package id and the package name at checkout.
- The starting price ignores seasonal overrides until Phase 2 decides.

### Options we did not choose \{#packages-and-pricing-policy-options\}

| Option | Why not chosen |
| --- | --- |
| Packages replace policies | It moves pricing to the listing and touches about 26 files. It also changes the Phase 2 tables, which this work leaves alone. |
| One policy for each package | It breaks the one-mode and one-cancellation rules of a listing, and the provider must set cancellation again for every package. |

## D16 — Vehicle category reference data (2026-10-25) \{#vehicle-category-reference-data\}

A vehicle category is reference data, and the table `catalog_vehicle_categories` defines it.

- The six categories are `sedan`, `minivan`, `passenger_van`, `commuter_van`, `microbus` and `large_coach_bus`.
- The product owner chose them on 2026-10-26, and they replace the seven PRD categories of `AMB-023`.
- Each category has a unique `code`, a name in English and in Japanese, a kind and a status.
- The kind is `private_car` or `charter_bus`, and a permit of the provider company unlocks each kind.
- An asset and a package keep the code, and a foreign key points to the table.
- Guide assets and guide-only packages are for a later phase, so every asset now is a vehicle with a category.
- Sedan, Minivan and Passenger Van have the kind `private_car`.
- Commuter Van, Microbus and Large Coach Bus have the kind `charter_bus`.
- The passenger car permit unlocks vehicles of the kind `private_car`.
- The chartered permit unlocks vehicles of the kind `charter_bus`.
- The ruling is [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses).
- A category with the status `archived` stays valid on the rows that use it.
- A list of categories hides an archived category, so no new row can pick it.
- Developers seed and change the table, and the API only reads it.
- The migration remaps the old codes on existing rows to the new codes.
- Replaces: the storage clause of `AMB-023`, which put the codes in application code.
- Replaces: the kind rules for each provider type, because a provider type no longer exists.
- Structure: [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages#vehicle-categories).

### Why \{#vehicle-category-reference-data-why\}

- The category codes lived in application code.
  - The listing, the package and the asset each define the same Rails enum.
  - Two validators repeat the rules for private car and charter bus.
  - The web repeats the codes, the English labels and the two groups.
- A new category or a new label needs a deploy in the API and in the web.
- The API has no endpoint that returns the categories.
- A package and an asset both hold a category, and a package may use only vehicles of its category.

### What changes with it \{#vehicle-category-reference-data-changes\}

- The enums on `Catalog::ListingPackage` and `Catalog::ProviderAsset` go away.
- The enum on `Catalog::Listing` goes away with its column in red-cab-api#211 PR 2.
- The validators read the table, so the two repeated lists go away.
- The JSON keeps the code, so existing clients do not break.
- The filter by vehicle type keeps working without a join.
- The web loads the categories from the API and drops its own codes and labels.
- A new category is a data change, with no deploy.
- A team screen to edit categories is a later issue.

### Options we did not choose \{#vehicle-category-reference-data-options\}

| Option | Why not chosen |
| --- | --- |
| Keep the enums | Every change needs a deploy in two repos, and the codes stay in five places. |
| An id column on the asset and the package | The filter and the indexes need a join or an id lookup, and the JSON and the clients change for no gain. |
| Rules for each permit stay in the validators | A new category still needs a deploy, and the two lists stay. |
| Team editing now | It needs endpoints, a screen and tests, and no product need exists before launch. |

## D17 — Listing service type (2026-10-31) \{#listing-service-type\}

A listing has exactly one service type.

- The values are `tour`, `airport_transfer`, `private_charter` and `port_transfer`.
- The service type filter uses the same values.
- There is no provider type, so the service type does not depend on one.
- Guide services are for a later phase and come back as a new license.
- Why: the type of service is a property of the listing and not of the provider.
- Replaces: the values `private_car_transfer`, `charter_bus`, `tour_guide` and `tour_guide_plus_driver`.
- Ruling: [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses).

## D18 — Permits and package availability (2026-10-31) \{#permits-and-package-availability\}

A valid permit keeps a package available, and an expired permit does not.

- A package needs a valid permit for the vehicle kind of its category.
- An expired permit makes the packages with that vehicle kind unavailable.
- A listing with no available package is hidden by the [discoverable rule](#discoverability-completeness).
- Listings that use another permit stay live.
- A renewal that the team records brings the packages and listings back.
- The query decides availability each time, so a package stops selling when its permit ends.
- A package sells a service date only up to the last valid day of its permit.
- An ended permit changes no confirmed booking.
- The stored display prices can lag behind a permit expiry.
- A daily job and the renewal refresh the stored display prices.
- Checkout always quotes again, so a late display price never sets the charge.
- A provider can save a vehicle when the company has a permit record for its kind.
- The team need not check that record first.
- Why: Japanese law gives a separate permit for each kind of transport.
- Replaces: the rule that the provider type decides the vehicle kind of a package.
- Ruling: [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses).

## D19 — Asset holds (2026-10-23) \{#asset-holds\}

Every booking holds one asset for one time range.

- An asset is a vehicle of one provider company, and guide assets are for a later phase.
- One database rule stops two live holds on one asset from overlapping.
- A full-day package holds the whole service day of its start date.
- A timed package holds the start time to the end time, plus a buffer.
- The buffer is the larger value of the asset buffer and the package buffer.
- The tourist picks a start time inside the package start window.
- Checkout gives the booking any free asset from the package pool.
- A provider sets a weekly pattern with a date range for each asset, and closes single days.
- One asset can do full-day jobs and timed jobs.
- Only Catalog services write holds, and Bookings keeps the hold id.
- Every booking gets the whole asset in MVP, and shared seats are a later decision.
- Schedules and closures give the open days, and nothing stores one row for each day.
- Replaces: the availability slot, the seat counter and the slot overlap rule.
- Structure: [Asset availability model](/docs/30-49-domains/catalog/models/asset-availability).

### Why \{#asset-holds-why\}

- A package has its own duration and start window, but an availability slot has a fixed start and end.
- The slot rule guards a vehicle only for the windows that the provider made first.
- Example:
  - Tourist A books Package A on Monday from 09:00 to 15:00.
  - Tourist B cannot book the same vehicle from 12:00 to 18:00.
  - Tourist B can book from 15:00 or later, if the buffer allows it.
- Short services, such as airport transfers, must block only their own hours on a vehicle that also does full-day jobs.

### What changes with it \{#asset-holds-changes\}

- Bookings gets the hold id, the package id and name, and the service start and end.
- Release 2 gives each listing one default full-day package, so every hold has a package.
- The date filter reads schedules, closures and holds.
- Free start times are worked out at search time.
- The system is not in production, so no data moves.
- Shared seats need a new ruling and a seat limit on a start time.

### Options we did not choose \{#asset-holds-options\}

| Option | Why not chosen |
| --- | --- |
| Keep fixed slots | The provider must guess every start time. The slot count grows with assets, packages, start times and days. |
| Open hours with any start time | Tourists see too many choices, and providers lose control of when drivers work. |
| A daily limit for each package | The same vehicle can be sold twice through two packages, and short services lose the time check. |

## D20 — Listing slug (2026-10-23) \{#listing-slug\}

Every listing has one stable address.

- The slug is global and joins the title with a short random suffix.
- A draft may change its slug, but the slug is fixed after the first publish.
- `/listings/:uuid` redirects to `/listings/:listing-slug`.
- Why: shared links and search results must not break.
- Replaces: the UUID-only resolver.

## D21 — Popular destinations and images (2026-10-23) \{#popular-destinations-and-images\}

Popular destinations are a curated list of prefectures.

- A prefecture has a rank when it is popular, and other prefectures have none.
- A hand-made rank is final, though booking counts may suggest a rank later.
- Region and popular destination images are static web files with a placeholder.
- The image file key is the region slug, for example `public/images/regions/kanto.jpg`.
- Why: there are no bookings before launch, so a booking-based list would be empty.
- Replaces: the "featured" flag on districts.

## D22 — Legacy geography roles (2026-10-23) \{#legacy-geography-roles\}

District and Area are old names that new code must not use.

- `is_discovery_root` and `discovery_root_id` are deprecated, and a cleanup slice removes them.
- `is_listable` now means a node a tourist can pick as a booking location.
- A listing never attaches to a listable node.
- Legacy routes keep working until the 301 redirects ship.
- Why: the old roles hide the new meaning of each node.
- Replaces: the District and Area roles in `ADR-016`.

## D23 — Schema ground rules (2026-10-23) \{#schema-ground-rules\}

The DBML file is the target design.

- Each new table or column carries a `ships in` tag until its migration merges.
- Each new column must be read by the slice that adds it.
- A derived column has exactly one writer service.
- A manager calls that writer in the same transaction as the source change.
- Why: unused columns promise behavior that nothing builds or tests.
- Replaces: reserved Phase 2 columns added early.

## D24 — Release order (2026-10-24) \{#release-order\}

Catalog ships in five releases, and browse comes first.

- Release 1 ships slices S1, S2, S3 and S7, with keyword search and Top rated sort.
- Release 1 keeps today's single price on the card.
- Release 2 ships slice S5: asset holds, schedules and closures, the package table and one default package.
- Release 3 ships slice S4: many packages, timed packages, and the price, vehicle and group size filters.
- Release 3 also ships the Price: low to high sort.
- Release 4 ships slice S6: pickup coverage, one booking location and the coverage check.
- Release 5 ships slices S8 and S9: Most booked sort, and the cleanup of legacy roles and slot code.
- Each release needs its own approved implementation spec, and no fixed date applies.
- Why: a hold needs a package and the price filter needs packages, so browse ships first.
- Replaces: the order of tourist first, then provider, then booking.
- Front door: [Delivery releases and slices](/docs/30-49-domains/catalog/#delivery-slices).

## D25 — Cancellation policy (2026-10-29) \{#cancellation-policy\}

Each listing has one cancellation policy, and it applies to all packages of the listing.

- A provider picks a preset (Flexible, Moderate or Strict) or writes a custom policy.
- Flexible is the default: a full refund until 24 hours before the service start.
- A custom policy has 1 to 4 tiers and must end with a tier at 0 hours.
- The refund never rises as the service start gets closer.
- A non-refundable policy is not allowed.
- A change applies to new checkouts only, and existing bookings keep their policy.
- This entry is the only source for cancellation policy rules in Catalog.
- Replaces: the Platform Default policy and the limit of four tiers for each listing.
- Implementation: [red-cab-api#168](https://github.com/markmamba/red-cab-api/issues/168).
- Status: accepted on 2026-10-29 so that development can start, and open to later change.

### Words used in this entry \{#cancellation-policy-words\}

| Word | Meaning |
| --- | --- |
| Cancellation policy | The refund rules of one listing, for cancellations by the tourist. |
| Tier | One rule of a policy: a number of hours and a refund percent. |
| Preset | A ready-made policy that the provider picks by name. |
| Custom policy | A policy whose tiers the provider writes. |
| Service start | The date and time when the booked service begins. |
| Notice | The number of hours between the cancellation and the service start. |

### Rules \{#cancellation-policy-rules\}

| # | Rule | Applies to | Example |
| --- | --- | --- | --- |
| 1 | One policy applies to all packages of a listing. | always | A sedan package and a van package of one tour have the same policy. |
| 2 | The provider picks Flexible, Moderate, Strict or Custom. | always | A provider picks Moderate for a full-day tour. |
| 3 | A new listing starts with Flexible. | always | A provider who never opens the setting sells with Flexible. |
| 4 | A tier applies when the notice is equal to or more than the tier hours. | always | A cancellation exactly 24 hours before the start gets the 24-hour tier. |
| 5 | A policy is never non-refundable. | always | A custom policy with 0 percent in every tier is refused. |
| 6 | The refund percent applies to the total that the tourist paid. | always | 50 percent of ¥20,000 is ¥10,000. |
| 7 | A provider may change the policy at any time, also on a published listing. | always | The change applies from the next checkout. |
| 8 | Before payment, the tourist sees the policy name and each tier in plain words. | always | "Moderate. Full refund if you cancel 72 hours or more before the start." |
| 9 | The booking copies the same policy that the tourist agreed to. | always | The provider changes the policy while the tourist reads it. Checkout stops and shows the new policy for agreement. |
| 10 | A tourist may book inside a 0 percent window, after a clear statement at checkout. | always | A Flexible booking 10 hours before the start says "No refund if you cancel." |

A booking keeps the policy that the tourist saw at checkout.

- A later change by the provider does not change the refund of that booking.

### Presets \{#cancellation-policy-presets\}

Each preset has a fixed set of tiers and one name in each language.

| English name | Japanese name |
| --- | --- |
| Flexible (default) | 柔軟 |
| Moderate | 中程度 |
| Strict | 厳格 |

The tourist and the provider see the name in the language of the page.

| Preset | Notice | Refund |
| --- | --- | --- |
| Flexible (default) | 24 hours or more | 100% |
| Flexible (default) | Under 24 hours | 0% |
| Moderate | 72 hours or more | 100% |
| Moderate | 24 hours or more | 50% |
| Moderate | Under 24 hours | 0% |
| Strict | 168 hours (7 days) or more | 100% |
| Strict | 72 hours or more | 50% |
| Strict | Under 72 hours | 0% |

### Custom policy checks \{#cancellation-policy-custom\}

A custom policy must pass every check below, or the provider cannot save it.

| # | Check | Example of a refused policy |
| --- | --- | --- |
| 1 | It has 1 to 4 tiers, and the 0-hour tier counts toward the 4. | Five tiers. |
| 2 | One tier has 0 hours, so every cancellation matches a tier. | Tiers at 48 hours and 24 hours only. |
| 3 | No two tiers have the same hours. | Two tiers at 24 hours. |
| 4 | Each tier has a whole number of hours from 0 to 8,760 (365 days). | A tier at 72,000 hours. |
| 5 | Each refund percent is a whole number from 0 to 100. | A tier with 12.5 percent. |
| 6 | The refund percent never rises as the hours fall. | 50 percent at 72 hours and 100 percent at 24 hours. |
| 7 | At least one tier refunds more than 0 percent. | 0 percent in every tier. |

Two neighbor tiers may have the same refund percent.

- For example, 50 percent at 72 hours and 50 percent at 24 hours is allowed.

The 0-hour tier may refund more than 0 percent.

- For example, a provider may give 20 percent at 0 hours.
  - The tier above it must then give 20 percent or more.

The provider cannot pick Custom without tiers.

- The save is refused until the custom policy has at least the 0-hour tier.

### Worked example \{#cancellation-policy-example\}

Aiko books a full-day tour that uses the Moderate preset.

1. Aiko pays ¥20,000 at checkout.
2. The booking keeps the Moderate tiers that Aiko saw before payment.
3. The tour starts on 12 May at 09:00.
4. Aiko cancels on 11 May at 03:00, which is 30 hours of notice.
5. The 72-hour tier does not match, because 30 hours is less than 72 hours.
6. The 24-hour tier matches, because 30 hours is 24 hours or more.
7. Aiko gets 50 percent of ¥20,000, which is ¥10,000.
8. If Aiko cancels on 9 May at 08:00 instead, the notice is 73 hours, and the refund is ¥20,000.

### Why \{#cancellation-policy-why\}

A tourist who books a service needs to know what refund they get if they cancel.

- Providers need a simple choice, and tourists need policies that they can compare.
  - Most providers want a standard rule and do not want to design one.
  - Some providers have real costs, for example a reserved driver, and need stricter rules.
- Travel marketplaces solve this in a similar way.
  - Viator sells most tours with one standard rule: a full refund until 24 hours before the start.
  - Viator also allows a custom policy for some products.
  - Airbnb lets a host pick from a short list of fixed policies.
  - All of them give the same or a smaller refund as the start gets closer.
- The Flexible default matches what foreign tourists expect from other tour sites.
- Three presets let tourists compare listings by name.
- The custom policy covers providers with special costs.

### What changes with it \{#cancellation-policy-changes\}

- The validation is strict, so every saved policy gives a refund for every cancellation time.
  - The refund rules need no hidden fallback when no tier matches.
- Notice is a count of hours between two moments, so the result does not depend on a time zone.
- Checkout copies the tiers into the booking, in the table `bookings_cancellation_tier_snapshots`.
- The implementation spec for red-cab-api#168 sets the Catalog columns for presets and custom tiers.

This entry does not decide these points:

- The refund when the provider or the platform cancels.
- A free cancellation period just after booking.
- Cancellation because of weather or too few travelers.
- A no-show by the tourist.
- Rounding of a refund that is not a whole yen.
- How and when the money returns to the tourist.

### Options we did not choose \{#cancellation-policy-options\}

| Option | Why not chosen |
| --- | --- |
| Custom tiers only, with no presets | Every provider must design a policy, and tourists cannot compare listings by name. |
| Presets only, with no custom policy | Providers with special costs cannot express their rules. |
| No 0-hour tier, and no match gives 0 percent | The tourist does not see the last window, and the refund rule is hidden. |
| Only the basic checks on a custom policy | It allows illogical policies, for example a larger refund closer to the start. |
| Default of 72 hours for 100 percent and 24 hours for 50 percent | It is stricter than the 24-hour rule that tour sites use. It stays available as Moderate. |
| Calendar days, as in the Japanese standard travel terms | Days depend on a time zone and fit short services badly. |
| A non-refundable option | It lowers trust in the marketplace for tourists. |

References for the market comparison:

- [Viator: cancellation policies for partners](https://partnerresources.viator.com/travel-commerce/merchant/cancellation-policies/)
- [Airbnb: cancellation policies](https://www.airbnb.com/terms/cancellation_policies_en)
- [Osaka Info: travel terms with the domestic cancellation fee table](https://osaka-info.jp/experience/ja/page/travel-terms-planning)

## D26 — Package not offered and package slug (2026-11-10) \{#package-not-offered\}

A tourist who names a package that the provider no longer offers gets one clear answer.

- A package with status `inactive` or `archived` is not offered.
- A request for such a package fails with `422` and the code `package_not_offered`.
- The title is `This package is not offered now. Please choose another package.`
- The same code and title apply to five places.
  - The quote.
  - The checkout start.
  - The payment start.
  - The open dates.
  - The start times.
- The code covers `inactive` and `archived` alike, because the tourist can do the same thing in both cases.
- A package with status `active` that cannot sell keeps the answer `This time is no longer available. Please choose another date or time.`
  - The cause is a permit, an asset, or a listing that is not discoverable.
- A slug that matches no package keeps its answer.
  - The quote and the checkout start give a validation error on `package_slug`.
  - The open dates and the start times give `404`.
- In the quote, the checkout start and the payment start, a listing-level failure gets the time answer first.
  - The package check comes after the listing-level tests.
  - "The listing has an available package" is not a listing-level test for this rule.
  - A listing whose only package is paused still gets the package answer, because the package is the only cause.
- A listing-level test is one of these five.
  - The listing is published.
  - The listing has a photo.
  - The listing has pickup coverage.
  - The listing has an active pricing policy.
  - The company is approved.
- The listing detail never fails for a stale slug.
  - It prices the first available package, and `price_breakdown.package_id` names it.
  - The web compares the slug of the link with that id, and it shows a notice when they differ.
- A payment that starts after a provider pauses or archives the package gets `package_not_offered`.
  - The package answer comes before the other payment refusals, for example a merchant that is not verified.
  - The system releases the hold and expires the checkout session when no charge is pending.
  - The hold stays until it expires when a charge is pending, because an older Stripe intent can still pay.
- A package slug is unique for one listing across all statuses.
  - An archived slug is never used again, so an old link never points to another package.
  - A new package with the same name gets a short random suffix.
- Why: the tourist cannot fix a removed package by choosing another date.
- Why: the web reads the code to show the right message in English or Japanese.
- Why: a reused slug can show a new price behind an old link.
- Replaces: the rule in `catalog.dbml` that the slug is unique among packages that are not `archived`.
- Ships: the slug rule ships in its own sub-PR of api-266, and the old index applies until then.
- Code: `package_not_offered` is the only new code of this entry.

## Open questions \{#open-forks\}

These items are proposed, not agreed, and no page may treat them as rules.

| Question | Proposed default | Blocks |
| --- | --- | --- |
| Which region holds each border prefecture, for example Mie? | Set in the seed spec | Region seed spec |
| What is the most additional destinations a listing can have? | Set in the provider listing spec | Provider listing spec |
| Which discoverable tests apply before their table ships? | A test turns on in the release that ships its table | Release 1 spec |
| Do shared seats sell single seats to strangers? | Not in MVP | A later ruling |
| How does a Multi-Day Package (`E-04`) hold assets over many days? | Not designed; `BKG-4` still names slots | A later ruling |
| What happens to a listing whose additional destination is in a node that an admin deactivates (`OPR-10`)? | Not decided; `OPR-10` names the subtree of the primary destination | Team geography spec |
| Has the Product Owner signed off these rulings? | Not recorded | Release |
