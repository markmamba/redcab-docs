---
title: Catalog decisions
sidebar_label: Decisions
sidebar_position: 2
description: Current Catalog rulings. One section for each decision, with the reason and what it replaces.
doc_type: domain-decisions
normative: true
status: current
context: catalog
last_reviewed: 2026-10-31
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
- This page is the source of truth, and an old invariant applies only where this page cites it.
- Open items are only in [Open questions](#open-forks).

## About this document

Rulings are recorded here once, and requirements, models and specs link here instead of restating them.

| Topic | Document |
| --- | --- |
| Front door | [Catalog domain](/docs/30-49-domains/catalog/) |
| Words | [Glossary](/docs/70-79-business/business-rules/glossary) |
| Old names | [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#naming-tldr) |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) |

The principal developer approved these rulings, but Product Owner sign-off is not recorded.

---

## Tourist discovery information architecture \{#tourist-discovery-ia\}

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

## Region level \{#region-level\}

A region is the top level of the geography tree.

- The tree has four levels: region, prefecture (`subdivision`), municipality and ward.
- Phase 1 has 9 regions, and Okinawa is its own region.
- Region codes use the code system `redcab_region`, with codes 01 to 09.
- Only a region has no parent, so every prefecture has a region parent.
- A node shows to tourists only when a discoverable Listing has a destination in its subtree.
- Counts come from the query, and the database does not store them.
- Why: region cards need the same hide-empty, status and archive rules as prefectures.
- Replaces: the three-level wording of `INV-8` and of `ADR-016`.
- Structure: [Geography model](/docs/30-49-domains/catalog/models/geography).
- Record: [Region is the top level of the geography tree](/docs/30-49-domains/catalog/architecture-decisions/region-level).

## Keyword search scope \{#keyword-search-scope\}

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

## Marketplace filter combination \{#marketplace-filter-combination\}

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

## Starting price and price filter \{#starting-price-and-price-filter\}

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

## Marketplace sort options \{#marketplace-sort-options\}

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

## Most booked sort \{#most-booked-sort\}

Most booked ranks listings by recent demand.

- A booking counts when payment succeeded and its status is Confirmed or Completed.
- A Completed booking whose payout is queued (status Payout queued) still counts as Completed.
- Its confirmation time must be inside the last 90 days.
- Cancelled, Failed and fully refunded bookings do not count.
- Each booking counts once.
- Scheduled service date and completion date do not decide the window.
- Why: lifetime popularity must not dominate the ranking.
- Replaces: the deferred "most booked" intent in `FR-CAT-027`.

## Top rated sort \{#top-rated-sort\}

Top rated ranks listings by average customer rating.

- It uses the published reviews of `FR-REV-007`.
- Rated listings come first, highest average first.
- Listings without a rating come last.
- There is no minimum number of ratings.
- A tie goes to the listing with more ratings, then to the newer listing.
- Why: the ranking stays simple and open to read.
- Replaces: the deferred "rating" sort in `FR-CAT-027`.

## Destination structure \{#destination-structure\}

Each listing has one primary destination and may have more.

- The primary destination is required and is a prefecture.
- Additional destinations are zero or more other prefectures.
- A region or prefecture page includes a listing when its scope matches the primary or any additional destination.
- A listing shows once in a result set.
- Additional destinations widen discovery and keyword search only.
- A destination never creates pickup coverage.
- Why: one service can go to several places without one listing for each.
- Replaces: the single `geography_id` attach rule in `FR-CAT-033`.

## Pickup coverage registration \{#pickup-coverage-registration\}

A provider registers pickup coverage for each listing, apart from destinations.

- A coverage row is a prefecture, a municipality or a ward.
- A prefecture covers the whole prefecture, and MVP has no exclusions.
- A location is covered when a coverage path equals its path or is a prefix of it.
- A coverage node cannot sit inside another selected coverage node.
- A draft may have no coverage, but a discoverable listing needs at least one row.
- Map-drawn areas and street-address coverage are out of MVP.
- Why: the provider gets useful detail without drawing maps.
- Replaces: the gap where coverage was deferred in the geography pattern.

## Pickup coverage validation timing \{#pickup-coverage-validation-timing\}

RedCab checks the booking location against pickup coverage before it confirms a booking.

- The tourist searches for one booking location and picks a municipality or a ward.
- RedCab checks coverage when checkout is created or changed, and again when the booking is made.
- The check uses the latest saved coverage.
- A location outside coverage, or a check that cannot finish, blocks confirmation.
- The error message says why.
- A confirmed booking stays valid if coverage changes later.
- Why: instant booking needs a clear gate and no provider approval.
- Replaces: free-text pickup as the only check in `BKG-11`.

## Listing publication \{#listing-publication\}

A provider saves drafts and publishes on purpose.

- Saving a listing never makes it visible to tourists.
- There is no administrator approval for each listing.
- A provider can edit a published listing in place.
- RedCab checks completeness on every save and hides a failing listing at once.
- Publish gates: one photo, an approved provider company, verified payout and at least one available package.
- An expired permit blocks only the listings that depend on it, because their packages are not available.
- Why: preparing a listing and publishing it are two different acts.
- Replaces: the draft-only edit rule in the provider update path, and `INV-7`.

## Discoverability completeness \{#discoverability-completeness\}

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

## Booking confirmation \{#booking-confirmation\}

Payment confirms a booking when all checks pass.

- RedCab confirms after reliable proof of successful payment.
- Every required check must pass first, including pickup coverage.
- RedCab checks coverage and the hold again just before payment starts.
- If a check fails after payment succeeds, RedCab reverses the charge and makes no booking.
- The provider does not accept the booking.
- Why: B2C instant booking already works this way.
- Replaces: the checkout order before the `BKG-11` amendment.

## Packages and pricing policy \{#packages-and-pricing-policy\}

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
- Why: a charter has one vehicle and one set of terms, but several lengths and prices.
- Replaces: one price for each listing in `PRC-2`.
- Structure: [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages).
- Record: [Packages sit under one shared pricing policy](/docs/30-49-domains/catalog/architecture-decisions/packages-and-pricing-policy).

## Vehicle category reference data \{#vehicle-category-reference-data\}

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
- Why: a new category or label must not need a deploy.
- Replaces: the storage clause of `AMB-023`, which put the codes in application code.
- Replaces: the kind rules for each provider type, because a provider type no longer exists.
- Structure: [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages#vehicle-categories).
- Record: [Vehicle categories are reference data](/docs/30-49-domains/catalog/architecture-decisions/vehicle-categories).

## Listing service type \{#listing-service-type\}

A listing has exactly one service type.

- The values are `tour`, `airport_transfer`, `private_charter` and `port_transfer`.
- The service type filter uses the same values.
- There is no provider type, so the service type does not depend on one.
- Guide services are for a later phase and come back as a new license.
- Why: the type of service is a property of the listing and not of the provider.
- Replaces: the values `private_car_transfer`, `charter_bus`, `tour_guide` and `tour_guide_plus_driver`.
- Ruling: [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses).

## Permits and package availability \{#permits-and-package-availability\}

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

## Asset holds \{#asset-holds\}

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
- Why: a package has its own length, so a fixed slot cannot guard the vehicle.
- Replaces: the availability slot, the seat counter and the slot overlap rule.
- Structure: [Asset availability model](/docs/30-49-domains/catalog/models/asset-availability).
- Record: [Asset holds replace availability slots](/docs/30-49-domains/catalog/architecture-decisions/asset-holds).

## Listing slug \{#listing-slug\}

Every listing has one stable address.

- The slug is global and joins the title with a short random suffix.
- A draft may change its slug, but the slug is fixed after the first publish.
- `/listings/:uuid` redirects to `/listings/:listing-slug`.
- Why: shared links and search results must not break.
- Replaces: the UUID-only resolver.

## Popular destinations and images \{#popular-destinations-and-images\}

Popular destinations are a curated list of prefectures.

- A prefecture has a rank when it is popular, and other prefectures have none.
- A hand-made rank is final, though booking counts may suggest a rank later.
- Region and popular destination images are static web files with a placeholder.
- The image file key is the region slug, for example `public/images/regions/kanto.jpg`.
- Why: there are no bookings before launch, so a booking-based list would be empty.
- Replaces: the "featured" flag on districts.

## Legacy geography roles \{#legacy-geography-roles\}

District and Area are old names that new code must not use.

- `is_discovery_root` and `discovery_root_id` are deprecated, and a cleanup slice removes them.
- `is_listable` now means a node a tourist can pick as a booking location.
- A listing never attaches to a listable node.
- Legacy routes keep working until the 301 redirects ship.
- Why: the old roles hide the new meaning of each node.
- Replaces: the District and Area roles in `ADR-016`.

## Schema ground rules \{#schema-ground-rules\}

The DBML file is the target design.

- Each new table or column carries a `ships in` tag until its migration merges.
- Each new column must be read by the slice that adds it.
- A derived column has exactly one writer service.
- A manager calls that writer in the same transaction as the source change.
- Why: unused columns promise behavior that nothing builds or tests.
- Replaces: reserved Phase 2 columns added early.

## Release order \{#release-order\}

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
