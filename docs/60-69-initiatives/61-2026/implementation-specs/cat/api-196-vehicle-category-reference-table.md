---
title: "Add the vehicle category reference table"
sidebar_label: API · Vehicle categories
issue: "https://github.com/markmamba/red-cab-api/issues/196"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/architecture-decisions/vehicle-categories.md"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-211-many-packages-and-display-prices.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-212-package-aware-filters-and-price-sort.md"
---

## TL;DR

- Ships the table `catalog_vehicle_categories`, with the six categories of the product owner.
- Ships two read endpoints: one public list and one list for the provider.
- Moves the category checks of assets, packages, listings and the vehicle filter to the table.
- Remaps the old codes on existing rows to the new codes, and adds foreign keys.
- Removes the three Rails enums of vehicle category.
- Does NOT change the web (red-cab-web#141) or the provider onboarding list `vehicle_types`.
- Breaking change: Yes, because the accepted codes change from the old seven to the new six.

## Problem

The seven old codes live in application code in several places.
- The listing, the package and the asset each define the same Rails enum.
- Two validators repeat the rules for private car and charter bus.
- The web repeats the codes, the labels and the groups.

A new category or a new label needs a deploy in two repos.

The API has no endpoint that returns the categories.

The product owner replaced the PRD set with six types on 2026-10-26, so the old codes are wrong now.

The old text of the issue is out of date.

The category now lives on the package and the asset.

The listing column goes away in red-cab-api#211 PR 2.

Evidence: `app/domains/catalog/listing.rb`, `listing_package.rb`, `provider_asset.rb`, `listings/type_applicable_validation.rb`, `provider_assets/type_applicable_validation.rb`, issue #196.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Vehicle category reference data](/docs/30-49-domains/catalog/catalog-decisions/#vehicle-category-reference-data) | The six categories, the kinds and the retire rule |
| ADR | [Vehicle categories are reference data](/docs/30-49-domains/catalog/architecture-decisions/vehicle-categories) | The reasons and the alternatives |
| Model | [Vehicle categories](/docs/30-49-domains/catalog/models/listings-and-packages#vehicle-categories) | The columns and the seed |
| Decision Log | `AMB-023` in [Open questions](/docs/70-79-business/planning/open-questions) | The row that replaces the PRD set |
| Ruling | [Schema ground rules](/docs/30-49-domains/catalog/catalog-decisions/#schema-ground-rules) | One reader for each new column |
| Spec | api-211, api-212 | The package pool rule, and the `vehicle_type` filter |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth |
| FR-CAT-029 | [Catalog requirements](/docs/70-79-business/requirements/functional-requirements/cat) | Provider asset registration |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. The asset and the package keep the `vehicle_category` string, with a foreign key to `catalog_vehicle_categories.code`.** | An id column. | The JSON, the filter and the indexes do not change. |
| 2 | **Owner ruling, 2026-10-26. Each category has a `kind`, which is `private_car` or `charter_bus`, and the validators read it.** | Allow lists in the validators. | A new category needs data only. |
| 3 | **Owner ruling, 2026-10-26. The six categories are `sedan`, `minivan`, `passenger_van` (private car), and `commuter_van`, `microbus`, `large_coach_bus` (charter bus).** | The seven PRD codes. | The product owner chose the set. |
| 4 | **Owner ruling, 2026-10-26. The names are in `name_en` and `name_ja`.** | English only. | The listing and the package use the same pair. |
| 5 | **Owner ruling, 2026-10-26. The API has two read endpoints: a public list and a provider list that holds only the categories the provider type may use.** | One public endpoint. | The web keeps no rule from provider type to kind. |
| 6 | **Owner ruling, 2026-10-26. Developers seed the table, and no endpoint writes it.** | Team editing now. | There is no product need before launch. |
| 7 | **Owner ruling, 2026-10-26. An archived category stays valid on the rows that use it, and the lists hide it.** | Block the retire while in use. | History and bookings stay correct. |
| 8 | **Owner ruling, 2026-10-26. The old codes map to the new codes as in Map A: `sedan` to `sedan`, `alphard_van` to `minivan`, `hiace_van` to `passenger_van`, `limousine` to `sedan`, `bus_20_seat` to `microbus`, `bus_40_seat` and `bus_50_seat` to `large_coach_bus`.** | Map B, with `bus_20_seat` to `commuter_van`. | Each row keeps its kind. |
| 9 | **Owner ruling, 2026-10-26. The provider onboarding list `vehicle_types` is a separate issue, and this spec does not change it.** | Change it here. | It belongs to the Providers context and has its own web form. |
| 10 | **Owner ruling, 2026-10-26. The migration remaps `catalog_listings.vehicle_category` and gives it no foreign key. The listing validator reads the table.** | A foreign key on the listing. | Red-cab-api#211 PR 2 drops the column. The default package copy stays valid. |
| 11 | **Added point, please review. The model is `Catalog::VehicleCategory`. The association on an asset and on a package is `vehicle_category_definition`, with `foreign_key: :vehicle_category` and `primary_key: :code`.** | `vehicle_category` as the association name. | The column already has that name. |
| 12 | **Added point, please review. Four migrations run in this order: create the table, seed the six rows, remap the old codes on three tables, add two foreign keys.** | One migration. | Each data step has its own migration (`db/AGENTS.md`). |
| 13 | **Added point, please review. A row that keeps an unmapped code makes the foreign key migration fail.** | Set unmapped codes to empty. | A guard must block, so no row loses its category in silence. |
| 14 | **Added point, please review. The seed migration uses SQL and a throwaway class. `Catalog::VehicleCategories::SeedService` repeats the rows for tests and development. A test compares the two.** | Call the service from the migration. | It follows api-209 decision 26. A migration must not call app code that may change. |
| 15 | **Added point, please review. `test/test_helper.rb` seeds the six rows once through the service, because the test database loads `schema.rb` and not the migrations.** | Create rows in each test. | Every catalog test needs the rows. |
| 16 | **Added point, please review. The public list is `GET /marketplace/catalog/vehicle_categories` with the key `catalog_vehicle_categories`. It has no pagination, like the regions list.** | A paginated list. | There are only a few rows. |
| 17 | **Added point, please review. An item has `code`, `name_en`, `name_ja` and `kind`. The list is ordered by `display_order`, then `id`, and holds active rows only.** | Include `uuid` and `status`. | The code is the contract. |
| 18 | **Added point, please review. The provider list is `GET /providers/catalog/vehicle_categories`. A private car provider and a tour guide plus driver get kind `private_car`. A charter bus operator gets `charter_bus`. A tour guide gets an empty list.** | Return all categories. | A guide has no vehicle category. |
| 19 | **Added point, please review. A vehicle asset needs an active category of the kind that its provider type allows. A guide asset has no category.** | Allow any category. | It keeps the rule of `provider_assets/type_applicable_validation.rb`. |
| 20 | **Added point, please review. A listing category must be an active category of the kind that its service type allows: `private_car_transfer` and `tour_guide_plus_driver` take `private_car`, and `charter_bus` takes `charter_bus`.** | Check only that the code exists. | It keeps the rule of `listings/type_applicable_validation.rb`. |
| 21 | **Added point, please review. A package category must be an active category. The pool rules of api-211 stay.** | Check only that the code exists. | A new package cannot pick a retired category. |
| 22 | **Added point, please review. An update that keeps the archived category the row already has is valid.** | Reject it. | Decision 7. |
| 23 | **Added point, please review. The `vehicle_type` filter accepts any code that exists in the table, active or archived.** | Active codes only. | An archived category can still be on a package. |
| 24 | **Added point, please review. The error text of the filter lists the codes from the table.** | A fixed text. | The list changes with the data. |
| 25 | **Added point, please review. The three Rails enums are removed, and code reads the table. The predicate methods such as `vehicle_category_sedan?` go away.** | Keep the enums. | They hold the old codes. |
| 26 | **Added point, please review. The change ships in one PR.** | Two PRs. | The enums cannot go before the table exists. I will propose a split if the diff is too large. |
| 27 | **Added point, please review. The tests, the dev seeders and the Bruno files that use an old code change to a new code.** | Leave them. | The old codes are invalid. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/vehicle_categories` | none | none | `{ catalog_vehicle_categories: [item] }` | Active rows, ordered |
| GET | `/providers/catalog/vehicle_categories` | JWT provider | none | `{ catalog_vehicle_categories: [item] }` | Active rows of the kinds the provider type may use |

The item:

```json
{
  "code": "passenger_van",
  "name_en": "Passenger Van",
  "name_ja": "パッセンジャーバン",
  "kind": "private_car"
}
```

Changes to existing endpoints:

- The category field of an asset, a package and a listing accepts the new codes and rejects the old ones.
- The `vehicle_type` filter of `GET /marketplace/catalog/listings` takes the new codes.

Error text:

| Case | Text |
| --- | --- |
| Unknown category | "Please select a valid vehicle category." |
| Retired category on a new pick | "This vehicle category is no longer offered. Please choose another one." |
| Wrong kind | "Please select a valid vehicle category for your provider type." |
| Filter | "Please select valid vehicle types: sedan, minivan, …" |

### Files to create or modify (API)

- `db/migrate/{timestamp}_create_catalog_vehicle_categories.rb`, `…_seed_catalog_vehicle_categories.rb`, `…_remap_catalog_vehicle_categories.rb` and `…_add_vehicle_category_foreign_keys.rb`.
- `app/domains/catalog/vehicle_category.rb`, new.
- `app/domains/catalog/vehicle_categories/seed_service.rb`, `kinds_for_provider_type_service.rb` and `kind_for_service_type_service.rb`, new.
- `app/domains/catalog/vehicle_categories/{marketplace,providers}_index_manager.rb`, and a serializer, new.
- `app/controllers/{marketplace,providers}/catalog/vehicle_categories_controller.rb` and the two route files.
- `app/domains/catalog/listing.rb`, `listing_package.rb`, `provider_asset.rb`: remove the enums.
- The type applicable validations of listings and provider assets, the asset, listing and package validators, and the scoped index validator.
- `app/domains/catalog/packages/default_package_sync_service.rb`: no logic change, and a test for the new codes.
- `docs/db/catalog.dbml`, `docs/db/redcab.dbml` and `db/schema.rb`.
- `test/test_helper.rb`, the test helpers, the dev seeders and the Bruno files.

## Data / domain touchpoints

- Bounded context: CAT.
- The migrations change three tables: `catalog_provider_assets`, `catalog_listing_packages` and `catalog_listings`.
- Only the first two get a foreign key (decision 10).
- No booking snapshot holds a category, so confirmed bookings do not change.
- The provider onboarding table `providers_private_car_details` keeps its old list (decision 9).

## Out of scope

- The web (red-cab-web#141) and the provider onboarding list `vehicle_types`.
- Team endpoints and a team screen to edit categories.
- A rule that ties a category to the seat capacity of an asset.
- Removal of `catalog_listings.vehicle_category` (red-cab-api#211 PR 2).

## Tasks

### API

- [ ] Add the migration that creates the table with the unique `code`.
- [ ] Add the seed migration with the six rows.
- [ ] Add the remap migration for the three tables.
- [ ] Add the foreign key migration for the asset and the package.
- [ ] Add `Catalog::VehicleCategory` and the associations.
- [ ] Add `SeedService` and the two kind services.
- [ ] Add the two list endpoints with managers, a serializer and routes.
- [ ] Move the asset, package and listing checks and the vehicle filter to the table.
- [ ] Remove the three enums and the two repeated lists.
- [ ] Seed the table in `test/test_helper.rb` and update the tests, helpers and dev seeders.
- [ ] Add a test that compares the seed migration with the service.
- [ ] Add a test of the remap map and of the failed foreign key.
- [ ] Update the DBML files and the Bruno files.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The table has the six categories with the kinds and names of the ruling.
- [ ] The public list returns the active categories in order, with `code`, `name_en`, `name_ja` and `kind`.
- [ ] The provider list returns only the kinds that the provider type may use.
- [ ] A tour guide gets an empty provider list.
- [ ] An asset or a package with an old code is rejected.
- [ ] A vehicle asset with a category of the wrong kind is rejected.
- [ ] A listing category of the wrong kind for the service type is rejected.
- [ ] A guide asset with a category is rejected.
- [ ] A new asset or package cannot pick an archived category.
- [ ] An update that keeps its archived category is valid.
- [ ] The `vehicle_type` filter accepts every code in the table and rejects the old codes.
- [ ] The remap keeps the kind of every existing row.
- [ ] A row with an unmapped code makes the foreign key migration fail.
- [ ] No Rails enum of vehicle category remains.
- [ ] Confirmed bookings do not change.
- [ ] Integration test: `test/integration/marketplace/catalog/vehicle_categories_integration_test.rb`.
- [ ] No client-side price computation.

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
