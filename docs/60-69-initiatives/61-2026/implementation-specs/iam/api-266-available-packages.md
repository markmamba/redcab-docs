---
title: "Add the available package scope, the service date rule and the daily price refresh"
sidebar_label: API · Available packages
issue: "https://github.com/markmamba/red-cab-api/issues/266"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-261-permits-and-approval.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-263-portal-access.md"
related:
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#permits-and-package-availability"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#packages-and-pricing-policy"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#discoverability-completeness"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#listing-publication"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#schema-ground-rules"
  - "docs/30-49-domains/32-iam/iam-decisions.md#provider-licenses"
---

## TL;DR

- One Catalog scope, `Catalog::ListingPackage.available`, decides which package can sell.
- A package needs a valid permit for its vehicle kind, and Providers answers that question with one query.
- A second scope, `available_on(service_date)`, stops sales after the last valid day of the permit.
- Every reader of "available" uses these scopes, including the hold, the quote and the payment check.
- `Listing.discoverable` stops reading the stored starting price.
- The display prices refresh on every permit change and in a daily sweep at 00:05 in Japan.
- Publishing needs pickup coverage as a fifth gate, and it needs an available package.
- The provider JSON says why a listing or a package cannot sell.
- The coverage prefill and `skipped_prefectures` go away.
- A package that is `inactive` or `archived` gets the code `package_not_offered`.
- A package slug is unique for a listing across all statuses, so an old link never points to another package.
- This spec ships no email, no reminder, and no change to a confirmed booking.
- Breaking change: Yes.
  - The create response loses `skipped_prefectures`, and `unavailable_reason` changes its values.
  - The code `package_not_offered` is new, and the web reads it.
  - The API and `red-cab-web` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| available package | A package that is `active`, has an active asset in its pool and has a valid permit for its vehicle kind. |
| valid permit | A license record of a permit kind with `verified_at` set and `now() < valid_until + 1 day`. |
| last valid day | The civil date of `providers_license_records.valid_until` in the Service Timezone. |
| valid permits query | The Providers query that returns one row for each valid permit. |
| display prices | The columns `catalog_listing_packages.display_price_jpy` and `catalog_listings.starting_price_jpy`. |
| discoverable | A listing that may appear in browse and search. |
| hidden reason | One code that says why a listing does not reach tourists. |
| not offered | A package with status `inactive` or `archived`. The tourist cannot book it. |
| prefill | The code that copies the prefectures of the company into the pickup coverage of a new listing. |

## User stories

1. US-1: As a tourist, I want to see only services that can sell, so no booking fails.
2. US-2: As a provider, I want a renewed permit to bring my packages back, so I need no extra step.
3. US-3: As a provider, I want to know why my listing is hidden, so I can fix it.
4. US-4: As the team, I want a withdrawn permit to stop sales at once, so a revoked permit stays unused.
5. US-5: As a developer, I want one definition of available, so every reader agrees.

## Problem

An expired permit has no effect on sales, and the available test is copied across the code.

- No code reads a permit, so a package with an ended permit still sells.
- Six classes write the available test again: `RefreshDisplayPricesService`, `BookablePackagesFetchService`, `AvailabilityDateFilterService`, `PackageFilterService`, `HoldAssetService` and `Listing.discoverable`.
- `Catalog::Listing.discoverable` ends with `starting_price_jpy IS NOT NULL`, and that price can lag.
- `HoldAssetService` tests that the package is active and that the listing is discoverable.
- `Catalog::Quotes::MarketplaceShowManager` prices any active package.
- A package sells a service date after the last valid day of its permit.
- `MarketplaceShowManager` reads `status_published` only, so a direct link can show Book for a suspended company.
- `Payments::Charges::TouristsCreateValidator` does not check availability before payment.
- `MarketplaceScopedIndexManager` calls `T.must(starting_price_jpy)`, so an empty price breaks the whole page.
- No job refreshes the display prices after a permit ends.
- A provider cannot tell why a published listing is hidden.
- `PickupCoveragePrefillService` reads `providers_profiles.service_prefectures`, which `api-261` removes.
- `Catalog::ProviderStatusReads::FetchService.operating_permitted?` reads `license_valid_until`, which `api-261` leaves for this spec.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Permits and package availability](/docs/30-49-domains/catalog/catalog-decisions/#permits-and-package-availability) | A valid permit keeps a package available, and the service date limit |
| Rule | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy) | The three tests of an available package |
| Rule | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | The query decides, and the stored price is not read |
| Rule | [Listing publication](/docs/30-49-domains/catalog/catalog-decisions/#listing-publication) | The publish gates |
| Rule | [D26 Package not offered and package slug](/docs/30-49-domains/catalog/catalog-decisions/#package-not-offered) | The code `package_not_offered`, and the slug that is never used again |
| Rule | [Schema ground rules](/docs/30-49-domains/catalog/catalog-decisions/#schema-ground-rules) | One writer for each derived column |
| Rule | [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses) | What a permit unlocks, and when a record is valid |
| Requirement | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | What the provider sees |
| Requirement | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | "currently unavailable" |
| Model | [Listings and packages](/docs/30-49-domains/catalog/models/listings-and-packages) | The package columns and the price caches |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) and [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) | Providers gives the answer as a subquery |
| Depends on | [Company and memberships](api-260-provider-company-and-memberships.md), [Permits and approval](api-261-permits-and-approval.md) and [Portal access](api-263-portal-access.md) | This spec uses their names |
| Paired work | [red-cab-web#194](https://github.com/markmamba/red-cab-web/issues/194) | Must deploy with this spec |
| Dependency | [red-cab-api#267](https://github.com/markmamba/red-cab-api/issues/267) | The daily sweep needs a real job runner |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `Catalog::ListingPackage.available` is the only definition of an available package. | Keep the test in each reader. | Six copies drifted apart, and none read a permit. |
| 2 | Providers owns the valid permits query and the permit-to-vehicle-kind map. Catalog embeds the query as a subquery. | Catalog joins `providers_license_records`. A Ruby call for each listing. | `catalog.dbml` says Catalog never names a Providers table. A Ruby call adds one query for each row of an index. |
| 3 | The valid permits query takes the time as an argument. | Use `now()` in SQL. | A test with `travel_to` must move the time, and SQL `now()` ignores it. |
| 4 | The query returns the company, the vehicle kind and the last valid day. | Return the license kind. | Catalog then never learns the license kinds. |
| 5 | The scope does not test the status of the vehicle category. | Test that the category is active. | An archived category stays valid on the rows that use it. |
| 6 | The scope does not test the company status. `discoverable` tests it. | Test it in the scope. | A suspended company keeps its prices, and its listings are hidden by `discoverable`. |
| 7 | `available_on(service_date)` adds the last valid day to `available`. | Test the date in each reader. | One definition of the date rule. |
| 8 | The tourist sees no reason for a date that is not open. | Show "Permit ends on …". | The permit is private to the company, and the tourist cannot act on it. |
| 9 | The service date rule reads the start date only. A trip may end after the last valid day. | Check the end of the trip. | The ruling says "service date". An expert should review this for a short trip past midnight. |
| 10 | `Catalog::Packages::SellableCheckService` answers "can this package sell on this date". The hold and the payment check call it. | Two copies. | The two checks must agree. |
| 11 | `HoldAssetService` returns nil for a package that is not sellable, and checkout keeps its message `This time is no longer available. Please choose another date or time.` This holds for a package with status `active`. Decision 41 covers `inactive` and `archived`. | A new error for the permit. | The tourist needs no reason for a permit, and the API adds no new error for it. |
| 12 | The payment validator checks the package again with the date of the hold. | Trust the hold. | A team can withdraw a permit between the hold and the payment. |
| 13 | A listing is not discoverable when its company is not approved. The test uses a Providers subquery. | Keep the `EXISTS` on `providers_companies` from `api-261`. | The same rule: Catalog names no Providers table. |
| 14 | `Listing.discoverable` stops reading `starting_price_jpy`. | Keep both tests. | The ruling says the price can lag, so the test must not read it. |
| 15 | An empty starting price does not break an index. The card shows no price line, and the API reports it through `ErrorReporter`. | Answer `422` for the whole page, as `api-211` decision 33 does. | One bad row must not hide the others. |
| 16 | A first check, a renewal and a withdrawal refresh the display prices in the same transaction. | A job after the commit. | `Schema ground rules` ask for the writer in the same transaction. |
| 17 | An edit of a license number by the team does not refresh. | Refresh on every team write. | The edit changes no validity. |
| 18 | A suspend and a reinstate do not refresh. | Refresh on a status change. | `available` does not read the company status. |
| 19 | The team check locks the listings of the company in id order before it refreshes. | No lock. | A parallel provider save must not write an old price. |
| 20 | The daily sweep refreshes every listing, of every status. | Only the companies whose permit just ended. | No look-back window, no new Providers query, and it repairs any missed refresh. |
| 21 | The sweep runs at 15:05 UTC, which is 00:05 in Japan. | 18:00 UTC with the booking count job. | The lag after midnight is about 5 minutes and not 3 hours. |
| 22 | Each listing job takes the listing lock in a transaction. | No lock. | The job must not overwrite a provider save. |
| 23 | A failed job reports through `ErrorReporter` on an exception. Nothing checks for a run that never started. | A heartbeat check. | The existing sweeps have none, and the risk is a stale card price. |
| 24 | The rake task `catalog:refresh_display_prices` stays as the manual repair. | Remove it. | Developers use it for local tests and repairs. |
| 25 | A more frequent sweep may come later. | Build it now. | The ruling says a daily job. |
| 26 | The publish check gets a fifth gate, pickup coverage. | Leave coverage out. | Without a gate, a provider publishes and the listing stays hidden with no message. |
| 27 | The publish check reads available packages, with two messages. | One message. | The provider must know whether to add a package or to fix a permit. |
| 28 | The publish check reads the approved status of the company only. | Keep the license expiry check. | A permit now acts on the packages. |
| 29 | The provider listing detail holds `is_discoverable` and `hidden_reasons`. | Compute in the web. | The web cannot read the permit, and one rule lives in one place. |
| 30 | The provider package JSON holds `unavailable_reason`. The value `null` means that the package is available. | A second field, `is_available`. The web works it out. | One field has one source of truth. The web reads no `is_available` yet. |
| 31 | The listing controller calls `Catalog::Listings::HiddenReasonsService` and passes the list to the serializer as the context key `hidden_reasons`. `ProvidersShowManager` still returns the listing. | A manager returns a DTO that holds the reasons. A query in the serializer. | The package answers use the same pattern (decisions 50 and 51). A serializer never queries. |
| 32 | The provider list endpoints hold no hidden reasons. | Compute for every row. | Each row would add queries. |
| 33 | The marketplace detail keeps `is_bookable` and `unavailable_reason`, with new values. | Remove the reason. | The web already reads `is_bookable`. |
| 34 | `Catalog::Geography.discoverable` goes away. | Keep it. | No code calls it, and its name hides a weaker test. |
| 35 | The index `index_providers_license_records_on_valid_until` goes away. | Keep it. | The full sweep is its only planned reader, and the new query filters by company. |
| 36 | Keyword search keeps its read of `business_name`. | Move it in this spec. | The principal developer left it for later, and the open items list it. |
| 37 | The migration runs in one release with the code change. | The two-deploy rule of `db/AGENTS.md`. | No production system exists, as in `api-260`. |
| 38 | The permit test reads `last_valid_on` in the country Service Timezone only. The service date of a hold is a `Date` and needs no zone. | Pass the zone of the listing geography to the permit test. | The team check writes `valid_until` in the country zone, so another zone can move the day by one. |
| 39 | `package_sellable?` also refuses a payment retry when a Stripe intent exists. | Skip the check on a retry. | The check blocks the retry only. An older client secret can still pay, and the webhook confirms the booking, as the ruling on webhooks says. |
| 40 | `package_sellable?` tests the same rule as the hold, including a paused listing, a missing photo and missing coverage. | Test the package only. | The hold and the payment check must agree (decision 10). |
| 41 | A package with status `inactive` or `archived` gets `422` with the code `package_not_offered` and the title `This package is not offered now. Please choose another package.` The quote, the checkout start, the payment start, the open dates and the start times all use it. | The date and time message. A validation error on `package_slug`. Two codes. | Another date cannot fix a removed package, and "not valid" is too strong for a package that existed. The web reads the code. |
| 42 | One code covers `inactive` and `archived`. | One code for each status. | The tourist can do the same thing in both cases. |
| 43 | In the quote, the checkout start and the payment start, a listing that fails a listing-level test gets the time message before the package check. The five listing-level tests are published, one photo, pickup coverage, an active pricing policy and an approved company. "Has an available package" is not one of them. | Use the full `discoverable` rule. | A listing whose only package is paused would then get a message about dates that no date can fix. |
| 44 | The payment validator reads `package.status`, which the manager loaded, and the listing-level tests. A status `inactive` or `archived` on a listing that passes them gives `package_not_offered`, before the other payment refusals. Any other refusal keeps the time message, and then the hold stays until it expires (decision 48 covers the release). | Block the archive while a checkout is open. | An older Stripe intent can still pay, so a release with a pending charge could book the asset twice. |
| 45 | The listing detail sends no flag for a stale slug. The web compares the slug of the link with the slugs in `packages`, and it shows a notice when the slug is missing there. | A flag in the detail answer. | The web needs no new field, and the API contract stays small. `price_breakdown.package_id` holds the package `uuid`, so the web cannot compare it with a slug. |
| 46 | The unique index on `catalog_listing_packages` covers all statuses, and `SlugGenerateService` avoids archived slugs too. | The generator only. The package `uuid` in checkout. | An old link must never point to another package or another price. |
| 47 | The open dates and the start times answer `package_not_offered` for an `inactive` or `archived` package. A slug that matches no package, and an active package that is not available, keep `404`. | The same code for every unavailable package. An empty list. | This keeps the change to the rule of decision 41. The owner may change the second case (see Open items). |
| 48 | When the payment start gives `package_not_offered` and no pending charge exists, `Bookings::CheckoutSessions::ReleaseForPackageNotOfferedManager` releases the hold and expires the checkout session. With a pending charge, the hold and the session stay until the hold expires. The release uses the hold reason `session_expired`. | Keep the hold in every case. Let the same tourist ignore an old hold. | The tourist must not wait up to 15 minutes for a hold that no charge can use. The manager takes the row lock of the payment start, so a charge cannot appear between the check and the release. |
| 49 | A payment retry with a pending charge gets `package_not_offered`, and the API leaves the older Stripe intent alone. The Payments redesign decides if the API cancels the intent or returns the existing handoff first. | Cancel or expire the intent now. Return the existing handoff before the package check. | The Payments domain has no ruling yet, so this spec cannot decide it. The older intent can still pay, and the webhook then confirms the booking (decision 39). |
| 50 | The package list controller builds the package reasons. `paginate_and_render` takes an optional `context_builder:`. The helper calls it with the records of the page. It passes the result to the serializer as the context. The context key `unavailable_reasons` holds a hash from `catalog_listing_packages.id` to the reason. | Page in the controller, and write the `meta` block twice. Compute the reasons for the whole list. | The helper pages inside, so the controller cannot see the records of the page. One place pages and builds the context. The reasons run for the rows of the page only, and the 12 other callers do not change. |
| 51 | The create and the update package controllers call `Catalog::Packages::UnavailableReasonsService.execute(packages: [listing_package])`. They pass the hash as the serializer context with the key `unavailable_reasons`. | The managers return the reasons. | The list and the single answer use the same serializer and the same service. A serializer never queries, and a manager does not know a detail of the serializer. |

## API contract

### The valid permits query

`Providers::Permits::ValidPermitsQuery.relation(at:, service_timezone:)` returns an `ActiveRecord::Relation`.

| Column | Meaning |
| --- | --- |
| `providers_company_id` | The company that holds the permit |
| `vehicle_kind` | `private_car` or `charter_bus`, from `Providers::PermitVehicleKinds` |
| `last_valid_on` | The civil date of `valid_until` in the Service Timezone |

- It reads only permit kinds, so it never returns insurance or company registration.
- A row exists when `verified_at` is set and `valid_until + interval '1 day'` is after `at`.
- The map from license kind to vehicle kind has one home, `Providers::PermitVehicleKinds`.
- `Providers::Companies::ApprovedCompaniesQuery.relation` returns the ids of companies with `status: "approved"`.

### The Catalog scopes

```ruby
# app/domains/catalog/listing_package.rb (shape, not final code)
def self.available(at: Time.current, service_timezone: Catalog::Countries::ServiceTimezoneService.execute) = ...
def self.available_on(service_date, at: Time.current, service_timezone: Catalog::Countries::ServiceTimezoneService.execute) = ...
```

`available` keeps a package when all of these are true.

- `catalog_listing_packages.status` is `active`.
- An active asset exists in its pool.
- A row of the valid permits query has the company of the listing and the `kind` of the package category.

`available_on` also needs `last_valid_on` on or after the service date.

- Both scopes share one private class method, `where_available`, in the model `Catalog::ListingPackage`.
- The method writes the raw SQL inline.
  - The ORM cannot join the derived table of valid permits to the vehicle kind.
- The method embeds the Providers relation as a subquery.
- No class returns a SQL String, because Brakeman cannot see inside it (see "Queries" in `AGENTS.md`).
- The scope keyword `service_timezone:` is the zone of the team check, and its default is `Catalog::Countries::ServiceTimezoneService`.

### The readers

| Reader | Change |
| --- | --- |
| `Catalog::Listing.discoverable` | Tests `.available` and the approved companies subquery. It drops `starting_price_jpy IS NOT NULL` and the `EXISTS` on the company table. |
| `Catalog::Pricing::RefreshDisplayPricesService` | `available_package_ids_for` uses `.available` |
| `Catalog::Packages::BookablePackagesFetchService` | Uses `.available` |
| `Catalog::Packages::ActivePackageFetchService` | Becomes the first `.available` package by `display_order`, then `id` |
| `Catalog::Quotes::MarketplaceShowManager` | `resolve_listing_package` uses `.available`. The failure path raises the time message for a listing that is not discoverable, then `package_not_offered` for an `inactive` or `archived` package, then the time message for an active package that is not available. |
| `Bookings::CheckoutSessions::TouristsCreateManager` | Finds the package with status `active`. On the failure path, `Catalog::Packages::PackageSlugStateService` reports a slug that is not offered, and the manager raises `package_not_offered` when the listing-level tests pass. A slug that matches no package keeps the validation error. |
| `Catalog::Packages::PackageSlugStateService` | Gives `:unknown`, `:active` or `:not_offered` for a slug on a listing, with one query. An active package wins over an archived row with the same slug. |
| `Catalog::Listing.discoverable_apart_from_packages` | Holds the five listing-level tests. `discoverable` adds the available package test to it. |
| `Catalog::ListingPackages::AvailabilityTargetFetchService` | Finds the package in `.available`, and it also reports a package with status `inactive` or `archived`. The open dates manager and the start times manager raise `package_not_offered` for it. |
| `Catalog::Listings::AvailabilityDateFilterService` | Keeps its raw SQL. It tests `clpk.id IN (?)` with the relation `.available_on(date).select(:id)` as a bound value, and the date is a `Date`. |
| `Catalog::Listings::PackageFilterService` | Uses `.available`, and keeps the test on `display_price_jpy` for the price bounds |
| `Catalog::Availability::FreeStartTimesService` and `OpenDatesService` | Stop at `last_valid_on`. `FreeStartTimesService` takes the keyword `last_valid_day:`. |
| `Catalog::Availability::HoldAssetService` | Calls `SellableCheckService.execute(package:, service_date:)` |
| `Payments::Charges::TouristsCreateValidator` | New check `package_sellable?` with the date of the hold. It does nothing when the hold is missing or not live. The manager loads `:package` for it. A status `inactive` or `archived` gives `package_not_offered`, and the manager raises it with the code. Before it raises, the manager calls `Bookings::CheckoutSessions::ReleaseForPackageNotOfferedManager` (decision 48). |
| `Catalog::Listings::MarketplaceShowManager` | `is_bookable` needs a discoverable listing and an available package |
| `Catalog::Listings::MarketplaceScopedIndexManager` | Handles an empty starting price |

`OpenDatesService` reads `last_valid_on` once for the whole month.

- `Catalog::Packages::LastValidDayService.execute(package:, service_timezone:)` returns the date, or nil when no permit is valid.
  - It reads the latest `last_valid_on` of the permits that match the package.
  - A test pins it to the scope: `available_on(last day)` is true, and `available_on(last day + 1)` is false.
- `FreeStartTimesService` takes the keyword `last_valid_day:` and returns an empty list after that day.
  - A nil value means no valid permit, so the list is empty.
  - `OpenDatesService` passes the value that it read once for the month.
  - `MarketplaceStartTimesManager` reads the value once for the single date.
- `OpenDatesService` returns an empty list when the last valid day is before the first day of the month.

`Catalog::Packages::SellableCheckService.execute(package:, service_date:)` answers with true or false.

- It is true when `Catalog::Listing.discoverable` holds the listing and `available_on(service_date)` holds the package.
- It reads the country Service Timezone once, and it runs one query.
- It owns the refusal message `This time is no longer available. Please choose another date or time.`
- The quote and the payment check use the same message.
- The quote refuses a package that exists but cannot sell.
- A slug that matches no package keeps the validation error.

### The not offered answer

A request for a package with status `inactive` or `archived` gets this body (decision 41).

```json
{
  "status_name": "unprocessable_content",
  "status": 422,
  "messages": {},
  "code": "package_not_offered",
  "title": "This package is not offered now. Please choose another package.",
  "server": "api"
}
```

- Each raise site writes the string `code: 'package_not_offered'`, so `test/shared/errors/error_code_contract_test.rb` finds it.
- The constant `Catalog::Packages::SellableCheckService::NOT_OFFERED_MESSAGE` holds the title.
- The code needs a line in `EXPECTED_CODES`, a line on the [Catalog decision D26](/docs/30-49-domains/catalog/catalog-decisions/#package-not-offered) and a web constant.
- The web constant ships with [red-cab-web#194](https://github.com/markmamba/red-cab-web/issues/194).
- The API change and the web constant must deploy together.

### Marketplace detail answer

`is_bookable` is true only when both of these hold.

- The listing is discoverable.
- At least one package is available.

`unavailable_reason` gets these values.

| Case | Value |
| --- | --- |
| `is_bookable` is true | `null` |
| No package is available | `no_available_package` |
| At least one package is available, and the listing is not discoverable | `listing_not_visible` |

- The package test comes first, because `discoverable` already needs an available package.
- A listing with no available package therefore gets `no_available_package`, whatever else is missing.
- The old value `no_active_package` goes away.
- The page still opens for a published listing, and checkout is blocked.
- A stale `package_slug` never gives an error.
- The quote prices the first available package.
- The web compares the slug of the link with the slugs in `packages` (decision 45).
- The web shows a notice when the slug is missing there.

### Empty starting price

`Catalog::Listings::MarketplaceListingListItemDto` takes a nilable `starting_price_jpy`.

- The list serializer sends `null`.
- `Catalog::Listings::MarketplaceScopedIndexManager` calls `ErrorReporter.capture_message(message:)` once for each page that holds such a row.
- A price sort puts a null price last, as the SQL already does.

### Error reporting

`ErrorReporter` in `app/shared/error_reporter.rb` is the one place where new code reports a problem.

- It has two methods, `capture_exception(error:)` and `capture_message(message:)`.
- Each method writes a log line first.
  - `capture_exception` logs only the class of the error.
  - `capture_message` logs the message.
- Each method then sends the problem to Sentry only when the constant `Sentry` exists.
- The Sentry gem is not in the Gemfile yet, so today a method sends nothing.
- `Catalog::Listings::RefreshDisplayPricesJob` reports a failed run through `capture_exception`.
- The shim `sorbet/rbi/shims/sentry.rbi` tells Sorbet about the `Sentry` methods.
- New code calls Sentry only through `ErrorReporter`.
  - The shim lets a direct call pass `srb tc`.
  - Such a call fails at run time.
- [red-cab-api#323](https://github.com/markmamba/red-cab-api/issues/323) adds the gem and decides whether `ErrorReporter` stays.

### Refresh on a permit change

`Catalog::Pricing::RefreshDisplayPricesService.execute_for_provider_company(provider_company:)` is new.

- It locks the listings of the company in id order, and then it calls `execute` for each.
- The team managers `check` and `withdraw_check` from `api-261` call it inside their transaction.
- The caller owns the transaction.

### The daily sweep

| Job | Queue | Acts |
| --- | --- | --- |
| `Catalog::Listings::RefreshDisplayPricesSweepJob` | `catalog` | Starts one `RefreshDisplayPricesJob` for each listing |
| `Catalog::Listings::RefreshDisplayPricesJob` | `catalog` | Takes `Catalog::Listing.lock` in a transaction and calls the service |

The schedule goes into `config/sidekiq_scheduler.yml`.

```yaml
# 15:05 UTC is 00:05 in Japan. Spec api-266.
catalog_listings_refresh_display_prices:
  cron: '5 15 * * *'
  class: Catalog::Listings::RefreshDisplayPricesSweepJob
  queue: catalog
  enabled: true
```

- A listing job skips a listing that no longer exists.
- Between 00:00 and 00:05 a card can show an old price, and checkout always quotes again.

### The publish check

`Catalog::Listings::ProvidersPublishValidator` changes in these places.

| Check | Message |
| --- | --- |
| `listing_has_photo?` | Unchanged |
| `listing_has_pickup_coverage?` (new) | `Add pickup coverage before publishing your listing.` |
| `listing_has_available_package?` replaces `listing_has_active_package?` | `Add at least one package before publishing your listing.` when no package is `active` |
| The same check | `None of your packages can be sold now. Check the vehicle and the permit of each package.` when active packages exist and none is available |
| `payout_capability_verified?` | Unchanged |
| `provider_company_approved?` replaces `provider_operating_permitted?` | `Your company must be approved before you can publish listings.` |

- The check has five gates: one photo, pickup coverage, an available package, a verified payout and an approved company.
- The pricing policy is a hidden reason, but it is not a publish gate.
  - [red-cab-api#316](https://github.com/markmamba/red-cab-api/issues/316) holds the open question.

### Provider JSON

`ProvidersListingDetailSerializer` gets two keys.

| Key | Value |
| --- | --- |
| `is_discoverable` | True when `status` is `published` and `hidden_reasons` is empty |
| `hidden_reasons` | A list of codes |

The codes follow the tests of `discoverable`, apart from the status.

| Code | Meaning |
| --- | --- |
| `no_photo` | The listing has no photo |
| `no_pickup_coverage` | The listing has no coverage row |
| `no_active_pricing_policy` | The listing has no active pricing policy |
| `no_available_package` | No package is available |
| `company_not_approved` | The company status is not `approved` |

- A draft also gets the list, so the provider sees what to fix before the publish.
- `Catalog::Listings::HiddenReasonsService.execute(listing:)` runs a fixed number of queries.
- The listing controller calls it and passes the list to the serializer as the context key `hidden_reasons` (decision 31).
- `ProvidersShowManager` still returns the listing.

`ProvidersListingPackageBaseSerializer` gets one key.

| Key | Value |
| --- | --- |
| `unavailable_reason` | `null`, `not_active`, `no_active_asset` or `no_valid_permit` |

- The reason is the first test that fails, in the order of the codes above.
- The value `null` means that the package is in `.available` (decision 30).
- `Catalog::Packages::UnavailableReasonsService.execute(packages:)` returns a hash for the packages that it gets, in a fixed number of queries.
- The list controller passes the records of the page to it through `context_builder:` (decision 50).
- The create and the update controllers pass one package to it (decision 51).

### Migration order

No production data exists, so this spec needs no backfill.

Developers run `bin/rails db:reset`.

1. Remove the index `index_providers_license_records_on_valid_until`.
2. Replace the index `index_catalog_listing_packages_on_listing_and_slug` with one that has no `WHERE` clause (decision 46).
   - It ships in its own sub-PR, after the decision page merges.
3. Update the comments and the tags in `docs/db/catalog.dbml`, `docs/db/providers.dbml` and `docs/db/redcab.dbml`.
   - The refresh note says "every listing".
   - The publish gate note lists the fifth gate.
   - The migration `20261114100100_update_catalog_listings_comments_for_available_packages.rb` copies the comments to the database.

### Docs this spec changes

| Page | Change |
| --- | --- |
| `docs/30-49-domains/31-catalog/catalog-decisions.md`, section Listing publication | The publish gates become five: one photo, pickup coverage, an approved provider company, verified payout and at least one available package |
| `docs/30-49-domains/31-catalog/requirements/provider-listings.md` | The publish rule lists the fifth gate, and the example shows it |

### Files to create or modify (API)

Providers:

- `app/domains/providers/permits/valid_permits_query.rb` (create)
- `app/domains/providers/companies/approved_companies_query.rb` (create)
- `app/domains/providers/permit_vehicle_kinds.rb`
- `app/domains/providers/provider_status_read.rb` and `provider_status_reads/fetch_service.rb` (remove `license_valid_until`)
- The team `check` and `withdraw_check` managers from `api-261`.

Catalog scopes and services:

- `app/domains/catalog/listing_package.rb`
- `app/domains/catalog/listing.rb`
- `app/domains/catalog/geography.rb`
- `app/domains/catalog/packages/sellable_check_service.rb` (create)
- `app/domains/catalog/packages/last_valid_day_service.rb` (create)
- `app/domains/catalog/packages/package_slug_state_service.rb` (create)
- `app/domains/bookings/checkout_sessions/release_for_package_not_offered_manager.rb` (create)
- `test/domains/catalog/packages/package_not_offered_test.rb` (create)
- `app/domains/catalog/listing_packages/slug_generate_service.rb`
- `app/domains/catalog/listing_packages/availability_target_fetch_service.rb` and its open dates and start times managers
- `app/domains/bookings/checkout_sessions/tourists_create_manager.rb`
- `app/domains/payments/charges/tourists_create_manager.rb`
- `test/shared/errors/error_code_contract_test.rb`
- `app/domains/catalog/packages/unavailable_reasons_service.rb` (create)
- `app/domains/catalog/listings/hidden_reasons_service.rb` (create)
- `app/domains/catalog/packages/bookable_packages_fetch_service.rb`
- `app/domains/catalog/packages/active_package_fetch_service.rb`
- `app/domains/catalog/pricing/refresh_display_prices_service.rb`
- `app/domains/catalog/provider_status_reads/fetch_service.rb`

Readers:

- `app/domains/catalog/quotes/marketplace_show_manager.rb` and its validator
- `app/domains/catalog/listing_packages/availability_target_fetch_service.rb`
- `app/domains/catalog/listings/availability_date_filter_service.rb`
- `app/domains/catalog/listings/package_filter_service.rb`
- `app/domains/catalog/listings/marketplace_show_manager.rb`
- `app/domains/catalog/listings/marketplace_scoped_index_manager.rb`
- `app/domains/catalog/listings/marketplace_listing_list_item_dto.rb`
- `app/domains/catalog/marketplace_listing_detail_serializer.rb`
- `app/domains/catalog/availability/free_start_times_service.rb`, `open_dates_service.rb` and `hold_asset_service.rb`
- `app/domains/payments/charges/tourists_create_validator.rb`

Provider side:

- `app/domains/catalog/listings/providers_publish_validator.rb`
- `app/domains/catalog/listings/providers_show_manager.rb`
- `app/domains/catalog/listings/providers_create_manager.rb`
- `app/domains/catalog/providers_listing_detail_serializer.rb`
- `app/domains/catalog/providers_listing_package_base_serializer.rb`
- `app/controllers/providers/catalog/listings_controller.rb`
- `app/controllers/concerns/pagination_helper.rb`, for the optional `context_builder:`.
- `app/controllers/providers/catalog/listing_packages_controller.rb`, for the reasons of the list, the create and the update.

Jobs and config:

- `app/jobs/catalog/listings/refresh_display_prices_sweep_job.rb` (create)
- `app/jobs/catalog/listings/refresh_display_prices_job.rb` (create)
- `config/sidekiq_scheduler.yml`
- `db/migrate/` (three migrations: the unique slug index, the drop of the `valid_until` index and the column comments)
- `app/shared/error_reporter.rb` (create)
- `sorbet/rbi/shims/sentry.rbi` (create)
- `lib/dev/catalog_marketplace_seeder.rb`, `lib/dev/test_accounts_seeder.rb` and the other dev seeders.
- `docs/db/catalog.dbml`, `docs/db/providers.dbml` and `docs/db/redcab.dbml`

### Code to remove

| Code | Reason |
| --- | --- |
| `app/domains/catalog/listings/pickup_coverage_prefill_service.rb` and its test | The provider adds the coverage of each listing |
| The prefill call and `skipped_prefectures` in `ProvidersCreateManager` | Same |
| `skipped_prefectures` on `Catalog::Listing` | Same |
| `app/domains/catalog/providers_listing_create_serializer.rb` | The create action uses `ProvidersListingBaseSerializer` |
| `Providers::ProviderStatusRead#license_valid_until` and `derive_license_valid_until` | A permit now acts on the packages |
| `Catalog::ProviderStatusReads::FetchService.operating_permitted?` | The publish check reads the approved status |
| The comment on `Catalog::ProviderStatusReads::FetchService` that cites `ADR-004` | It names a rule that this spec replaces with the valid permits query |
| `Catalog::Geography.discoverable` and `test/domains/catalog/geographies/discoverable_scope_test.rb` | No caller |
| The test `starting_price_jpy IS NOT NULL` in `Listing.discoverable` | The ruling forbids it |
| `no_active_package` as a value of `unavailable_reason` | Two new values replace it |

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [api-212](../cat/api-212-package-aware-filters-and-price-sort.md) | Decision 17, the discoverable test on `starting_price_jpy`, and decision 18 |
| [api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md) | Decisions 3, 13 and 14, the prefill and the `skipped_prefectures` contract |
| [api-211](../cat/api-211-many-packages-and-display-prices.md) | Decision 33, and decision 41, which now names an available package |
| [api-231](../cat/api-231-listing-detail-packages.md) | The `is_bookable` rule and the value `no_active_package` |
| [api-210](../cat/api-210-asset-holds-in-checkout-and-booking.md) | The sellable test in `HoldAssetService` |
| [api-261](api-261-permits-and-approval.md) | The `EXISTS` on `providers_companies` in the discoverable scope, and the open lines for the available package scope |
| [api-260](api-260-provider-company-and-memberships.md) | The line that leaves `skipped_prefectures` to this spec |

### Tests that must change

| Test files | Change |
| --- | --- |
| `test/domains/catalog/listings/pickup_coverage_prefill_service_test.rb` | Delete |
| `test/domains/catalog/listings/providers_create_manager_test.rb` | Remove the `skipped_prefectures` cases |
| `test/controllers/providers/catalog/listing_pickup_coverages_controller_test.rb` | Remove the `skipped_prefectures` assertion |
| `test/domains/catalog/geographies/discoverable_scope_test.rb` | Delete |
| `test/domains/catalog/listings/` tests for publish, discoverable, filters and the index | Use packages with a valid permit |
| `test/domains/catalog/availability/` tests | Add the last valid day |
| `test/domains/catalog/pricing/` tests | Assert the refresh by permit |
| `test/support/` and `test/test_helper.rb` | The helper that builds a company adds a valid passenger car permit and a valid chartered permit |
| The 36 test files that build packages | Build them through the changed helper |
| `lib/dev/` seeders | Add checked permit records that are valid |

New tests cover these behaviors.

- A package with an expired permit is not available, and a package of another kind stays available.
- A withdrawn check makes the package unavailable at once.
- A renewal brings the package back, with no listing change.
- A permit is valid to the end of its last day in Japan time, also under `travel_to`.
- Insurance and company registration records never make a package available.
- An archived vehicle category does not make a package unavailable.
- `discoverable` ignores `starting_price_jpy`, and it hides a suspended company.
- A listing with an empty starting price stays in the index and the card has a null price.
- A service date after the last valid day is not open, cannot start and cannot be held.
- A hold, a payment and a quote refuse a package that is not available.
- A package with status `inactive` or `archived` gives `package_not_offered`.
  - This holds in the quote, the checkout start, the payment start, the open dates and the start times.
- A payment start with `package_not_offered` and no pending charge releases the hold and expires the session.
- A payment start with a pending charge keeps the hold and the session.
- An active package that is not available keeps the time message.
- A slug that matches no package keeps its answer.
- The slug sub-PR adds these tests.
  - A new package with the name of an archived package gets a new slug.
  - The database refuses a duplicate slug.
- A confirmed booking does not change when a permit ends.
- A first check, a renewal and a withdrawal refresh the prices in the same transaction.
- A team edit of a license number, a suspend and a reinstate do not refresh.
- The sweep starts one job for each listing of every status.
- A listing job does not overwrite a newer price under a parallel save.
- The publish check refuses a listing with no coverage, no package or no available package.
- The provider detail lists the hidden reasons, and a draft gets them too.
- The package list gives `unavailable_reason` for each case.
- The marketplace detail gives `no_available_package` and `listing_not_visible`.
- A create returns no `skipped_prefectures`, and a new listing has no coverage.
- No Catalog class names `providers_license_records` or `providers_companies`.

## Data / domain touchpoints

- Bounded context: IAM for the permit, and Catalog for availability and prices.
- Transaction boundaries:
  - The team check and the withdrawal refresh the prices in their own transaction.
  - Each listing job locks one listing in one transaction.
- Snapshots: none.
- A confirmed booking never changes (`INV-1`, `BKG-8`).
- Events: none.

## Worked example

Kenji runs Kanto Charter with a Sedan package and a Microbus package.

1. Kenji holds a checked passenger car permit and a checked chartered permit, both valid until 31 March.
2. Both packages are available, and the listing shows "From ¥12,000".
3. On 1 April the chartered permit has ended, and the Microbus package is not available.
4. The sweep runs at 00:05, and the Microbus display price becomes empty.
5. The Sedan package keeps the listing live, and the listing still shows "From ¥12,000".
6. Kenji opens the package list, and the Microbus package says `no_valid_permit`.
7. A tourist who holds the Microbus checkout page tries to pay, and the payment check refuses it.
8. A booking confirmed on 20 March for 10 April stays confirmed.
9. The team records the chartered renewal until 31 March of next year, and the same transaction refreshes the prices.
10. The Microbus package is available again, and a tourist can pick 10 April.

## Out of scope

- A more frequent price sweep.
- Keyword search on `business_name`, which still names a Providers table.
- What expired insurance does.
- Any email or reminder about a permit.
- A reason for a tourist about a permit.
- The member columns on other tables, which spec 6 covers.
- How production runs the job worker.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- The owner may change the rule for service dates after a permit ends.
- An active package that is not available gets `404` on the open dates and the start times.
- The owner may want an empty list or another answer for that case.
- A new hold reason `package_not_offered` needs a migration, and today the release uses `session_expired` (decision 48).
- The Payments redesign in [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) decides what happens to an open Stripe intent when a package is not offered (decision 49).
- An expert should review a trip that starts on the last valid day and ends after it.
- Nobody has measured the cost of the permit subquery on a large catalog.
- Keyword search still reads `business_name` from a Providers table.
- A confirmed booking after a permit ends may be a legal risk, and an expert must confirm it.
- The sweep depends on [red-cab-api#267](https://github.com/markmamba/red-cab-api/issues/267), and no production worker exists yet.

## Tasks

### API

- [ ] Add the valid permits query and the approved companies query.
- [ ] Add the scopes with one private method that holds the inline SQL.
- [ ] Move every reader to the scopes.
- [ ] Add the service date rule to the open dates, the start times, the hold and the payment check.
- [ ] Handle an empty starting price in the index.
- [ ] Add `execute_for_provider_company`, and call it from the team check and the withdrawal.
- [ ] Add the sweep, the listing job and the schedule.
- [ ] Update the publish check.
- [ ] Add the hidden reasons and the unavailable reasons.
- [ ] Remove the code in [Code to remove](#code-to-remove).
- [ ] Add `package_not_offered` to the quote, the checkout start, the payment start, the open dates and the start times.
- [ ] Add the slug migration and the generator change, in their own sub-PR.
- [ ] Add the migration, and update the DBML.
- [ ] Update the Catalog pages named in [Docs this spec changes](#docs-this-spec-changes).
- [ ] Update the dev seeders, the test helpers and the tests.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A package with an ended or withdrawn permit does not sell.
- [ ] Listings that use another permit stay live.
- [ ] A renewal brings the packages back with no listing change.
- [ ] A service date after the last valid day is not open and cannot be held.
- [ ] A confirmed booking does not change when a permit ends.
- [ ] `Listing.discoverable` does not read `starting_price_jpy`.
- [ ] An empty starting price breaks no index.
- [ ] A direct link to a listing that is not discoverable shows `is_bookable` false.
- [ ] Checkout and payment refuse a package that is not available.
- [ ] Publishing needs pickup coverage and one available package.
- [ ] The provider JSON gives the hidden reasons and the unavailable reasons.
- [ ] No Catalog class names a Providers table for permits or company status.
- [ ] The create response holds no `skipped_prefectures`.
- [ ] The sweep refreshes every listing at 00:05 in Japan.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:reset
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n -E 'skipped_prefectures|PickupCoveragePrefill|license_valid_until|operating_permitted' -- app lib test
git grep -n -E 'providers_license_records|providers_companies' -- app/domains/catalog
bin/rails catalog:refresh_display_prices
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
