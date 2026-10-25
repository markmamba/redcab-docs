---
title: "Add many packages, timed packages and display prices"
sidebar_label: API · Many packages
issue: "https://github.com/markmamba/red-cab-api/issues/211"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-209-asset-schedules-closures-holds.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-210-asset-holds-in-checkout-and-booking.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-231-listing-detail-packages.md"
---

## TL;DR

- Ships provider endpoints to list, create, change and archive packages, with up to 5 packages for each listing.
- Ships timed packages with a buffer, and a check that every pool asset fits the package.
- Ships the display price on each package and the starting price on each listing, with one writer service.
- Ships in three PRs.
- PR 1 adds packages and display prices.
- PR 2a stops using the old fields.
- PR 2b drops the old columns.
- Does NOT ship the price filter, the vehicle and group size filters or the price sort (red-cab-api#212).
- Does NOT change checkout, because it already takes `package_slug`.
- Breaking change: No in PR 1 and PR 2b, and Yes in PR 2a for the old fields.

## Problem

A provider cannot offer a 5-seat car and an 11-seat van on one listing.

Each listing has one default package that `DefaultPackageSyncService` rewrites on every listing save.

A short service, such as a transfer, cannot choose a timed package.

No stored price exists for the card, the filter and the sort.

The listing and the pricing policy still hold the price, the capacity, the vehicle category and the primary asset.

Release 2 already did part of the issue: the quote takes a package, and checkout takes `package_slug`.

Evidence: `app/domains/catalog/packages/default_package_sync_service.rb`, `app/domains/catalog/listings/providers_update_manager.rb`, `app/domains/catalog/listings/marketplace_scoped_index_manager.rb`, issue #211.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy) | The limit of 5, the shared policy and the display prices |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) | Full-day and timed holds, and the buffer |
| Ruling | [Schema ground rules](/docs/30-49-domains/catalog/catalog-decisions/#schema-ground-rules) | One writer for each derived column |
| Model | [Listings and packages](/docs/30-49-domains/catalog/models/listings-and-packages) | The package columns and the price caches |
| Model | [Asset availability](/docs/30-49-domains/catalog/models/asset-availability) | The pool and the buffer |
| Spec | api-209, api-210, api-231 | The default package, the hold and the package list |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth and the `S4` tags |
| PRC-1, PRC-2, PRC-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | One pricing authority, and checkout quotes again |
| INV-1, BKG-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | A confirmed booking never changes |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling. A listing has at most 5 packages that are not archived, and the sixth is rejected.** | No limit. | The Catalog decisions page sets the limit. |
| 2 | **Owner ruling, 2026-10-25, amended 2026-10-25. The issue ships in three PRs. PR 1 adds packages, pools and display prices. PR 2a stops using the old fields. PR 2b drops the old columns.** | One PR 2 that does both. Leave the columns to release 5. | `db/AGENTS.md` asks for two deploys: stop using a column, then drop it. |
| 3 | **Owner ruling, 2026-10-25. A provider writes packages through own endpoints under `/providers/catalog/listings/:listing_id/packages`.** | A `packages` list in the listing create and update calls. | Each package saves alone, and the listing form stays small. |
| 4 | **Owner ruling, 2026-10-25. The request must send `provider_asset_ids`, and the system checks each asset.** | Add all fitting assets by default. | The provider stays in control of the pool. |
| 5 | **Owner ruling, 2026-10-25. In PR 1 a listing save updates the package through the old fields only while the listing has exactly one package that is not archived.** | Create only. Update only the `default` slug. | The current web form works until red-cab-web#156 ships. |
| 6 | **Owner ruling. The pool check has two rules: `max_passengers` cannot exceed the capacity of any pool asset, and every pool asset has the package vehicle category.** | Check only at booking. | The issue sets both rules. |
| 7 | **Owner ruling. The display price is the quote at passenger count 1 with no date, and the starting price is the lowest display price.** | Store the quote for the largest group. | The model page sets this rule. |
| 8 | **Owner ruling. `Catalog::Pricing::RefreshDisplayPricesService` is the only writer of both price columns.** | Write the columns in each manager. | The schema ground rules ask for one writer. |
| 9 | **Owner ruling. Every write path that changes a package, a pool, an asset or the pricing mode calls the refresh service in the same transaction.** | A background job. | A tourist must never see a stale price. |
| 10 | **Owner ruling. A package with bookings is archived and never deleted, and there is no DELETE endpoint.** | Allow delete when no booking exists. | The booking history keeps the package. |
| 11 | **Owner ruling. Checkout does not change, and it never reads a display price.** | Read the display price at checkout. | `PRC-8` says checkout quotes again. |
| 12 | **Added point, please review. The provider endpoints are: list, create and change (`PATCH`). Archive is a `PATCH` that sets `status` to `archived`.** | A separate archive route. | Fewer routes, and the same rules as the asset endpoints. |
| 13 | **Added point, please review. The server makes the slug from `name_en` and a short suffix when the name is taken. The slug cannot change after create.** | The provider sends the slug. | The checkout link needs a slug that stays the same. The first package keeps `default`. |
| 14 | **Added point, please review. The list returns packages that are not archived, ordered by `display_order`, then `id`.** | Return archived packages too. | The provider form shows the 5 packages that count toward the limit. |
| 15 | **Added point, please review. A pool update sends the full list of asset uuids, and the system replaces the pool.** | Add and remove one asset at a time. | One call keeps the pool and the check in step. |
| 16 | **Added point, please review. A pool needs at least one asset, and each asset must belong to the same provider.** | An empty pool for a draft package. | A package with no asset cannot be bought. |
| 17 | **Added point, please review. A package with a vehicle category needs pool assets of the same category. A package with no vehicle category needs pool assets of kind `guide`.** | Allow any asset kind. | The guide packages have no vehicle category today. |
| 18 | **Added point, please review. A provider asset update is rejected when a new capacity or category breaks the fit of a package that is not archived.** | Allow it and hide the package. | The rule "every pool asset fits" stays true at all times. |
| 19 | **Added point, please review. A retire of an asset is allowed, and the refresh service clears the display price of a package that has no active asset left.** | Block the retire. | The discoverable test already treats such a package as not available. |
| 20 | **Added point, please review. The buffer is stored for a full-day package, and the hold ignores it.** | Reject a buffer on a full-day package. | The data model says the hold ignores it, so a type change loses nothing. |
| 21 | **Added point, please review. The provider can edit a package of a published listing, and archiving the last active package hides the listing.** | Block that archive. | The completeness rule hides a failing listing at once. |
| 22 | **Added point, please review. A change to a package never changes a live hold or a confirmed booking.** | Move live holds. | `INV-1` and `BKG-8`. |
| 23 | **Added point, please review. The refresh service passes a rate of 0 to the quote, because the display price is the gross amount.** | Read the commission rate for every refresh. | A missing rate must not block a package save. |
| 24 | **Added point, please review. Listing detail adds `display_price_jpy` to each package. The quote with a passenger count stays the only charged price.** | No price in the list. | The tourist needs a price next to each package in release 3. |
| 25 | **Added point, please review. The listing index and the scoped index read `starting_price_jpy` for the card, and they stop quoting each row.** | Keep quoting each row until red-cab-api#212. | With many packages, the first package is not always the lowest. |
| 26 | **Added point, please review. The discoverable scope does not change in this issue. red-cab-api#212 turns on the `starting_price_jpy IS NOT NULL` test.** | Change it here. | The issue lists the filters as out of scope. |
| 27 | **Added point, please review. A rake task `catalog:refresh_display_prices` calls the service for every listing after the migration. The migration only adds the columns.** | Copy the quote rules into the migration. | The migration must not hold a second writer. |
| 28 | **Added point, please review. The refresh service has two entry points: one for a listing, and one for a provider asset that finds all listings that use the asset.** | Each manager finds the listings. | One class stays the only writer. |
| 29 | **Added point, please review. Managers lock the listing row before they count packages.** | No lock. | Two parallel saves must not pass the limit of 5. |
| 30 | **Added point, please review, amended 2026-10-25. PR 2a starts after red-cab-api#212 and PR C of red-cab-web#156 merge. PR 2b starts only after red-cab-web#156 merges.** | PR 2 waits for all of red-cab-web#156. | The web spec makes PR D wait for the API, so PR 2 cannot wait for PR D. PR 2b is the only step that breaks a reader of a column. |
| 31 | **Added point, please review. The package responses have no `data` wrapper. A list uses `paginate_and_render` and the key `catalog_listing_packages`.** | A `{ data: … }` wrapper. | The other provider endpoints render the serializer directly. |
| 32 | **Added point, please review. The listing update manager owns the guard of decision 5. It calls `DefaultPackageSyncService` only when the listing has one package that is not archived.** | Put the guard inside the service. | A listing with no package gets no new default package on update. |
| 33 | **Added point, please review. A listing in an index with an empty `starting_price_jpy` makes the index return 422 with the message "This service has no package."** | Skip the listing. | A silent skip would hide a missing backfill. |
| 34 | **Added point, please review. The commission rate test of the old index is replaced, because the index no longer quotes.** | Keep the test. | The index does not read the commission rate any more. |
| 35 | **Added point, please review. PR 2a makes `catalog_listings.base_capacity` and `catalog_pricing_policies.base_price_jpy` nullable.** | Drop them in PR 2a. | The code stops writing both columns, and both are NOT NULL today. |
| 36 | **Added point, please review. In PR 2a a request that still sends a removed field is not an error. The API ignores the field.** | Return 422 for a removed field. | The old web form still sends the fields until PR D ships. |
| 37 | **Added point, please review. In PR 2a a listing create or update never creates or changes a package. `DefaultPackageSyncService` is removed.** | Keep the sync for a listing with one package. | The listing has no price or capacity to sync. A new listing has no package until the provider adds one. |
| 38 | **Added point, please review. In PR 2a the responses stop returning the removed fields.** | Return null for each field. | A field with no source must not stay in the contract. The final list is in "PR 2a changes". |
| 39 | **Added point, please review. In PR 2a the group size filter of the unscoped marketplace index matches `max_passengers` of an available package.** | Leave it on `base_capacity` until PR 2b. | The scoped index already works this way (red-cab-api#212, decision 14). PR 2b drops `base_capacity`. |
| 40 | **Added point, please review. PR 2b drops the columns, their index and the foreign key in one migration. It does not restore data.** | A reversible migration that copies the data back. | The data already lives in the packages. |
| 41 | **Added point, please review. In PR 2a a publish needs at least one active package. The message is "Add at least one package before publishing your listing."** | Let a listing with no package publish and stay hidden. | A create makes no package (decision 37). Without this check, a provider can publish a listing that no tourist can see, with no message. |

## API contract

### Provider endpoints (PR 1)

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id/packages` | JWT provider | none | `{ catalog_listing_packages: [package], meta }` | Packages that are not archived |
| POST | `/providers/catalog/listings/:listing_id/packages` | JWT provider | The fields below, and `provider_asset_ids` | The package | 422 when the limit or a pool check fails |
| PATCH | `/providers/catalog/listings/:listing_id/packages/:package_id` | JWT provider | Any field below, and `status` | The package | `slug` cannot change |

Request fields: `name_en`, `name_ja`, `description_en`, `description_ja`, `schedule_kind`, `duration_minutes`, `earliest_start_time`, `latest_start_time`, `start_interval_minutes`, `buffer_minutes`, `max_passengers`, `vehicle_category`, `base_price_jpy`, `display_order`, `provider_asset_ids`.

The times are strings in `HH:MM` form.

The package response:

```json
{
  "uuid": "…",
  "slug": "eleven-seat-van",
  "name_en": "11-seat van",
  "name_ja": null,
  "schedule_kind": "timed",
  "duration_minutes": 120,
  "earliest_start_time": "07:00",
  "latest_start_time": "20:00",
  "start_interval_minutes": 30,
  "buffer_minutes": 30,
  "max_passengers": 10,
  "vehicle_category": "hiace_van",
  "base_price_jpy": 25000,
  "display_price_jpy": 25000,
  "display_order": 1,
  "status": "active",
  "provider_asset_ids": ["…"]
}
```

### Marketplace changes (PR 1)

| Method | Path | Change |
| --- | --- | --- |
| GET | `/marketplace/catalog/listings/:listing_id` | Each package in `packages` gains `display_price_jpy`. |
| GET | `/marketplace/catalog/listings` and the scoped index | The card reads `starting_price_jpy` and runs no quote. |

### Checkout

- `POST /tourists/bookings/checkout_sessions` is unchanged.
- It takes `package_slug`, and the server finds an active package of the listing.
- A test proves it picks the right package when the listing has many.

### PR 2a changes

- The listing create and update calls ignore `base_price_jpy`, `base_capacity`, `vehicle_category` and `primary_provider_asset_id`.
- The provider listing response stops returning `base_capacity`, `vehicle_category` and `primary_provider_asset_uuid`.
- The pricing policy in that response stops returning `base_price_jpy`, `duration_kind` and `duration_minutes`.
- The marketplace listing detail stops returning `vehicle_category` and `base_capacity`.
- The listing create and update calls no longer create or change a package.
- The listing publish call returns 422 when the listing has no active package.
- The pricing policy keeps `pricing_mode` and the cancellation fields only.

### PR 2b changes

- A migration drops the removed columns, their index and the foreign key.
- The columns are `catalog_listings.base_capacity`, `vehicle_category` and `primary_provider_asset_id`.
- The columns are also `catalog_pricing_policies.base_price_jpy`, `duration_kind` and `duration_minutes`.
- No API contract changes, because PR 2a already removed every read.

### Files to create or modify (API)

PR 1:

- `db/migrate/…_add_display_prices.rb`: `catalog_listing_packages.display_price_jpy` and `catalog_listings.starting_price_jpy`.
- `docs/db/catalog.dbml`: remove the `ships in: S4` tags of these two columns.
- `app/domains/catalog/pricing/refresh_display_prices_service.rb`, new.
- `app/domains/catalog/listing_packages/providers_{index,create,update}_{request,validator,manager}.rb`, new.
- `app/domains/catalog/listing_packages/pool_fit_validation.rb`, new.
- `app/domains/catalog/listing_packages/slug_generate_service.rb` and `pool_replace_service.rb`, new.
- `app/domains/catalog/providers_listing_package_base_serializer.rb`, new.
- `app/controllers/providers/catalog/listing_packages_controller.rb` and `config/routes/providers_routes.rb`.
- `app/domains/catalog/listings/providers_create_manager.rb` and `providers_update_manager.rb`: call the refresh service.
- `app/domains/catalog/listings/providers_update_manager.rb`: call the sync service only while one package exists (decision 5).
- `app/domains/catalog/provider_assets/providers_update_manager.rb` and its validator: the fit check and the refresh.
- `app/domains/catalog/marketplace_listing_package_embedded_serializer.rb`: add `display_price_jpy`.
- `app/domains/catalog/listings/marketplace_index_manager.rb` and `marketplace_scoped_index_manager.rb`: read the starting price.
- `lib/tasks/catalog.rake`: the backfill task.
- `docs/api/providers/…`: Bruno files for the three endpoints.

PR 2a:

- `db/migrate/…_make_old_listing_fields_nullable.rb`: `base_capacity` and `base_price_jpy` accept null.
- `app/domains/catalog/listings/providers_{create,update}_{request,validator,manager}.rb`: remove the four fields and their checks.
- `app/domains/catalog/listings/providers_publish_validator.rb`: check for an active package.
- `app/domains/catalog/packages/default_package_sync_service.rb` and its callers: remove.
- `app/domains/catalog/providers_listing_base_serializer.rb` and `providers_listing_pricing_policy_embedded_serializer.rb`: remove the fields.
- `app/domains/catalog/marketplace_listing_detail_serializer.rb`: remove `vehicle_category` and `base_capacity`.
- `app/domains/catalog/listings/marketplace_index_manager.rb`: read `max_passengers` of an available package.
- `app/domains/catalog/listing.rb`, `provider_asset.rb` and `pricing_policy.rb`: remove the primary asset association and the duration enum.
- The `includes(:primary_provider_asset)` calls in the provider listing managers.
- `lib/dev/catalog_marketplace_seeder.rb`, `lib/dev/test_accounts_seeder.rb` and the test helpers.
- `docs/api/providers/catalog/listings/…`: Bruno files without the removed fields.
- `docs/db/catalog.dbml`: note that the code no longer uses the columns.

PR 2b:

- `db/migrate/…_drop_old_listing_fields.rb`: the six columns, the index and the foreign key.
- `app/domains/catalog/vehicle_categories/kinds_for_service_type_service.rb`: remove it, because no code calls it after PR 2a.
- `test/domains/catalog/packages/default_packages_data_step_test.rb`: remove it with the old columns.
- `docs/db/catalog.dbml`: remove the columns and the `removed in: S4` tags.
- `db/schema.rb` and `docs/db/redcab.dbml`, from the migration.

## Data / domain touchpoints

- Bounded context: CAT.
- Transaction boundaries: each manager wraps the write and the refresh in one transaction, and the services never open one.
- Locks: the manager locks the listing row before the limit check.
- Snapshots: Bookings keeps the package id and name, and a package change never edits a booking.
- Pricing: only `CalculateQuoteService` computes a price, and the refresh service calls it.

## Out of scope

- The price filter, the vehicle and group size filters and the price sort (red-cab-api#212).
- The `starting_price_jpy IS NOT NULL` test in the discoverable scope (red-cab-api#212).
- The partial index on `starting_price_jpy` and the index on languages (red-cab-api#212).
- Seasonal prices in the display price.
- The vehicle category table (red-cab-api#196).
- The web screens (red-cab-web#156).
- Pickup coverage (release 4).

## Tasks

### API, PR 1

- [x] Add the migration for the two display price columns.
- [x] Write `RefreshDisplayPricesService` with the listing entry point and the provider asset entry point.
- [x] Add the package list, create and update endpoints with requests, validators and managers.
- [x] Add the limit check with the listing row lock.
- [x] Add the pool fit validation.
- [x] Add the slug service.
- [x] Call the refresh service from the package, asset, listing create and listing update paths.
- [x] Add a test that every write path calls the refresh service.
- [x] Make the listing update manager call `DefaultPackageSyncService` only for a listing with one package.
- [x] Add `display_price_jpy` to the listing detail packages.
- [x] Make both indexes read `starting_price_jpy`.
- [x] Add the backfill rake task.
- [x] Add the Bruno files.
- [x] Remove the `ships in: S4` tags of the two columns from `docs/db/catalog.dbml`.

### API, PR 2a

- [x] Amend this spec with the final list of removed fields before code.
- [x] Make `base_capacity` and `base_price_jpy` nullable.
- [x] Ignore the four old fields in the listing create and update calls.
- [x] Remove `DefaultPackageSyncService` and its callers.
- [x] Make the publish check need an active package.
- [x] Remove the old fields from the provider and marketplace responses.
- [x] Make the unscoped marketplace index read the package limit for the group size.
- [x] Update the seeders, the test helpers and the Bruno files.

### API, PR 2b

- [x] Drop the six columns, the index and the foreign key.
- [x] Remove `KindsForServiceTypeService` and the data step test.
- [x] Remove the `removed in: S4` tags from `docs/db/catalog.dbml`.

### Docs

- [ ] Set spec `status: implemented` after PR 2b merges.

## Acceptance criteria

- [x] A listing can have up to 5 packages, and the sixth is rejected with a clear message.
- [x] An archived package does not count toward the limit.
- [x] A package whose passenger limit exceeds the capacity of a pool asset is rejected.
- [x] A package whose vehicle category differs from a pool asset is rejected.
- [ ] A timed package saves with a buffer, and a full-day package ignores the buffer.
- [ ] The display prices change in the same transaction as the package change.
- [x] A test shows that every package write path calls the refresh service.
- [x] The starting price is the lowest display price of an available package.
- [x] A package with no active pool asset has an empty display price.
- [x] Checkout takes `package_slug`, never a price, and it picks the right package on a listing with many.
- [ ] Two parallel creates cannot pass the limit of 5.
- [x] A listing save updates the package through the old fields only while the listing has one package.
- [ ] A change to a package does not change a live hold or a confirmed booking.
- [x] Integration test: `test/controllers/providers/catalog/listing_packages_controller_test.rb`.
- [x] No client-side price computation.
- [x] PR 2a: no code reads or writes a removed column.
- [x] PR 2a: a request with an old field succeeds and the API ignores the field.
- [x] PR 2a: a new listing has no package, and a listing save does not change a package.
- [x] PR 2a: a listing with no active package cannot publish, and the message says what to do.
- [x] PR 2a: the unscoped index group size filter reads the package limit.
- [x] PR 2b: the six columns, the index and the foreign key are gone.

## Verification

```bash
# API (from red-cab-api/)
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

- The Sorbet baseline is 69 errors.
- The parallel test run crashes in `pg` on macOS, so use `PARALLEL_WORKERS=1`.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
