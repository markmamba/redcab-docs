---
title: "Replace provider types with permits and read approval from the records"
sidebar_label: API · Permits and approval
issue: "https://github.com/markmamba/red-cab-api/issues/261"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships.md"
related:
  - "docs/30-49-domains/39-iam/iam-decisions.md#provider-company"
  - "docs/30-49-domains/39-iam/iam-decisions.md#provider-licenses"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#permits-and-package-availability"
---

## TL;DR

- Four license kinds replace the provider type, and one kind of company remains.
- The owner creates license records, and a checked record is locked.
- The team checks, renews and withdraws a check, and it can suspend and reinstate a company.
- A new Submit for review action sets `submitted_for_review_at`.
- Approval reads a valid permit, a matching vehicle and the checked records.
- A rejected company can submit again.
- Guide assets and the old `service_type` values go away.
- The discoverable scope needs an approved company, so a suspended company is hidden.
- The URLs and JSON keys change from `profiles` to `companies`.
- This spec ships no effect for an expired permit, because the available package spec owns that.
- Breaking change: Yes.
  - The API and `red-cab-web` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| permit | A license record of the kind `passenger_car_permit` or `chartered_permit`. |
| checked record | A row in `providers_license_records` with `verified_at` set. |
| valid record | A checked record whose last valid day has not passed in Japan time. |
| submit | The owner action that sends a pending company to the team. |
| Service Timezone | The time zone of `catalog_countries.default_timezone` for Japan. |

## User stories

1. US-1: As an owner, I want to enter my license numbers, so the team can check them.
2. US-2: As an owner, I want to see what is missing, so I can submit a complete application.
3. US-3: As a team admin, I want to check each record, so approval reads real facts.
4. US-4: As a rejected owner, I want to correct my application, so I can apply again.
5. US-5: As a team admin, I want to suspend a company, so a revoked permit stops new sales.

## Problem

The code still sorts companies by provider type.

- `provider_type`, `display_name`, `service_prefectures` and `checklist` remain on the company.
- Three type detail tables hold license numbers.
- The six old license kinds include guide licenses.
- Only the team creates a license record, inside the approve action.
- Approval reads a stored checklist.
- No code sets `submitted_for_review_at`.
- Listing and asset rules read `provider_type`.
- Approved companies cannot add a permit or upload a document.
- A rejected company has no way back to pending.
- No team action sets the status `suspended`.
- The `discoverable` scope does not read the company status.
- The keyword search reads `provider_type` and `display_name`.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | Submit, retry, approved changes and suspension |
| Rule | [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses) | License kinds, locking, checks and approval |
| Rule | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | An approved company |
| Rule | [Permits and package availability](/docs/30-49-domains/catalog/catalog-decisions/#permits-and-package-availability) | The vehicle save rule |
| Column truth | [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) | Company, license record and document tables |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Asset, listing and package tables |
| Depends on | [Company and memberships](api-260-provider-company-and-memberships.md) | This spec uses its names |
| Paired work | [red-cab-web#191](https://github.com/markmamba/red-cab-web/issues/191) | Must deploy with this spec |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The check action also records a renewal. | A separate renew action. | Both write `verified_at` and `valid_until` on the same row. |
| 2 | A team edit of a license number keeps the check. | Clear the check. | The team made the change, so nobody needs to check it again. |
| 3 | The app has no request form for a change to a locked record. | Add a request table. | The provider contacts the team, and few changes happen. |
| 4 | The owner cannot delete a license record. | Allow delete of an unchecked record. | An unchecked record unlocks nothing that sells, and rows are not hard deleted. |
| 5 | `POST /providers/companies` accepts empty details. | Require the details at create. | The portal access spec calls the same step from sign-up. |
| 6 | The company JSON holds `missing_requirements`. | The web works out the list. | One rule lives in one place, and the submit validator uses the same service. |
| 7 | The approve action takes no body. | Keep expiry dates in the approve call. | The team enters expiry dates in the check action. |
| 8 | A rejection and a correction both clear `submitted_for_review_at`. | Keep the old date. | The team queue then shows only applications that wait for the team. |
| 9 | Submit from `rejected` clears `rejected_at` and `rejection_reason`. | Keep them. | The company is pending again, and an old reason would mislead. |
| 10 | A team admin can correct `business_name` and `contact_phone`. | Only the owner edits. | The ruling gives the legal name of an approved company to the team. |
| 11 | Providers holds the map from permit to vehicle kind. | Catalog holds it. | The DBML places this map in Providers. |
| 12 | Providers asks Catalog for active vehicle kinds through one service. | Providers queries the asset table. | Each domain reads the other through a small contract. |
| 13 | One Catalog service gives the Service Timezone. | Read the country in each class. | No code may hardcode a zone, and the team index does this today. |
| 14 | `valid_until` is stored at midnight at the start of the last valid day. | Store the end of the day. | The DBML sets this, and the test is `now() < valid_until + 1 day`. |
| 15 | The publish check reads the approved status only. | Keep the old expiry check. | The available package spec adds the permit effect. |
| 16 | Each migration changes empty production tables, so no three-step migration applies. | Use three migrations. | No production data exists, and developers reset the local database. |

## API contract

### Owner endpoints

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/companies` | Member | None | `200` company JSON | Replaces `/providers/profiles` |
| POST | `/providers/companies` | Role `provider` | `business_name`, `contact_phone`, both optional | `201` company JSON | Creates the company and the owner membership |
| PATCH | `/providers/companies` | Member | `business_name`, `contact_phone` | `200` company JSON | See the edit table |
| POST | `/providers/companies/submit` | Member | None | `200` company JSON | Sets `submitted_for_review_at` |
| POST | `/providers/companies/license_records` | Member | `license_kind`, `license_number` | `201` license record JSON | One row for each kind |
| PATCH | `/providers/companies/license_records/:license_record_id` | Member | `license_number` | `200` license record JSON | Refused on a checked record |
| POST | `/providers/documents` | Member | As today, plus optional `license_record_id` | `201` document JSON | See the edit table |

### Team endpoints

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/team/providers/companies` | Team | Filters | `200` list | Key `providers_companies` |
| GET | `/team/providers/companies/:company_id` | Team | None | `200` company JSON | |
| PATCH | `/team/providers/companies/:company_id` | Team | `business_name`, `contact_phone` | `200` company JSON | New |
| POST | `/team/providers/companies/:company_id/approve` | Team | None | `200` company JSON | No checklist and no license records |
| POST | `/team/providers/companies/:company_id/reject` | Team | `rejection_reason` | `200` company JSON | Needs a submitted company |
| POST | `/team/providers/companies/:company_id/request_correction` | Team | `correction_message` | `200` company JSON | Needs a submitted company |
| POST | `/team/providers/companies/:company_id/suspend` | Team | `suspension_reason` | `200` company JSON | New. Needs `approved` |
| POST | `/team/providers/companies/:company_id/reinstate` | Team | None | `200` company JSON | New. Needs `suspended` |
| POST | `/team/providers/companies/:company_id/license_records/:license_record_id/check` | Team | `valid_until` as `YYYY-MM-DD` | `200` license record JSON | New. Also records a renewal |
| POST | `/team/providers/companies/:company_id/license_records/:license_record_id/withdraw_check` | Team | None | `200` license record JSON | New. Clears `verified_at` |
| PATCH | `/team/providers/companies/:company_id/license_records/:license_record_id` | Team | `license_number` | `200` license record JSON | New. Keeps the check |

The team list drops the filter `provider_type`.

- By default it shows pending companies with `submitted_for_review_at` set, oldest first.

### What each status may do

| Status | Edit details | Add or edit a record | Upload a document | Submit |
| --- | --- | --- | --- | --- |
| `pending` | Yes | Yes | Yes | Yes |
| `rejected` | Yes | Yes | Yes | Yes |
| `approved` | `contact_phone` only | Yes | Yes | No |
| `suspended` | No | No | No | No |

A pending company that has submitted can still edit, and the team reads the current values.

### Submit

Submit needs all of these, and each missing item has one code in `missing_requirements`.

| Code | Requirement |
| --- | --- |
| `business_name` | `providers_companies.business_name` is present |
| `contact_phone` | `providers_companies.contact_phone` is present |
| `permit_record` | A record of a permit kind with a `license_number` exists |
| `insurance_record` | A record of the kind `insurance` exists |
| `company_registration_record` | A record of the kind `company_registration` exists |
| `document_business_registration` | A document of that kind exists |
| `document_transport_license` | A document of that kind exists |
| `document_insurance` | A document of that kind exists |
| `document_id` | A document of that kind exists |

Submit changes these columns.

- From `pending`, it sets `submitted_for_review_at`, and it clears `rejection_reason`.
- From `rejected`, it also sets `status: "pending"` and clears `rejected_at`.
- A second submit of a submitted company answers `409`.

### Check rules

- A permit needs `valid_until`, and the date must be today or later in the Service Timezone.
- `insurance` and `company_registration` accept an empty `valid_until`.
- The server anchors the date once, with `DateTimeUtils.parse_civil_date`.
- A record is valid when `verified_at` and `valid_until` exist and now is before the end of that day.
- A permit needs a `license_number` before the team can check it.

### Approval

The approve validator needs all of these.

- The company has `status: "pending"` and `submitted_for_review_at` set.
- A valid permit exists, and an active vehicle has the kind that the permit unlocks.
- An insurance record is checked.
- A company registration record is checked.

Approval does not read documents, because submit already requires them.

The approval keeps today's support trial of 3 months.

### Company JSON

The owner and team company JSON hold these keys.

- `uuid`, `status`, `business_name` and `contact_phone`
- `missing_requirements`
- `submitted_for_review_at`, `approved_at`, `rejected_at` and `rejection_reason`
- `suspended_at` and `suspension_reason`
- `documents` and `license_records`

The team JSON also holds `support_trial`.

These keys go away.

- `provider_type`, `display_name`, `service_prefectures` and `checklist`
- `required_document_kinds`, `is_required_documents_uploaded` and `applicable_license_kinds`
- `private_car_detail`, `charter_bus_detail` and `tour_guide_detail`

A license record holds `uuid`, `license_kind`, `license_number`, `valid_until`, `verified_at` and `is_valid`.

- `valid_until` is a `YYYY-MM-DD` date in the Service Timezone.
- A document also holds `license_record_id`, as the uuid of the record.

### Catalog changes

| Area | Change |
| --- | --- |
| Asset create and update | The request drops `asset_kind`, and `license_plate_or_vin` and `vehicle_category` are required |
| Vehicle save | The category kind needs a license record of the matching permit, checked or not |
| Vehicle categories list | `GET /providers/catalog/vehicle_categories` returns the kinds that the company has a permit record for |
| Package | `vehicle_category` is required, and each pool asset has that category |
| Listing | `service_type` is `tour`, `airport_transfer`, `private_charter` or `port_transfer` |
| Discovery filter | The filter `service_type` takes the four new values |
| Discoverable | An `EXISTS` on `providers_companies` needs `status = 'approved'` |
| Keyword search | The provider leg matches `business_name` only |
| Publish | The check reads the approved status only |

`HoldAssetService` reads the `discoverable` scope, so a suspended company takes no new booking.

- `catalog_provider_assets.display_name` stays, because it names a vehicle.

### New error answers

| Case | Status | `title` |
| --- | --- | --- |
| Submit with a missing item | `422` | `Please complete the missing items before you submit.` |
| An owner edits a checked record | `422` | `The team has checked this record. Please contact the team to change it.` |
| A second record of one kind | `422` | `Your company already has this license record.` |
| A vehicle with no permit record | `422` | `Please add the permit for this vehicle first.` |
| A race on the kind index | `409` | `Your company already has this license record.` |
| A second submit | `409` | `Your company is already waiting for review.` |

### Migration order

No production data exists, so this spec needs no backfill.

Developers run `bin/rails db:reset`, because old rows hold old enum values.

1. Change `providers_companies`.
   - Remove `provider_type` with its index, `display_name`, `service_prefectures` and `checklist`.
   - Add `suspended_at` and `suspension_reason`.
2. Drop `providers_private_car_details`, `providers_charter_bus_details` and `providers_tour_guide_details`.
3. Change `providers_license_records`.
   - Remove `status`.
   - Change `valid_until` from `date` to `timestamptz`.
   - Replace `index_providers_license_records_on_company_and_kind` with a unique index of the same name.
   - Update the comments.
4. Add `providers_documents.license_record_id` with its foreign key and its index, and update the `document_kind` comment.
5. Change `catalog_provider_assets`.
   - Remove `asset_kind`.
   - Make `license_plate_or_vin` and `vehicle_category` `NOT NULL`.
   - Rebuild `index_catalog_provider_assets_on_provider_and_plate` with `WHERE status = 'active'`.
6. Make `catalog_listing_packages.vehicle_category` `NOT NULL`, and update the `catalog_listings.service_type` comment.

### Files to create or modify (API)

Models and contracts:

- `app/domains/providers/company.rb`
- `app/domains/providers/license_record.rb` (new kinds, no `status`, a validity method)
- `app/domains/providers/document.rb`
- `app/domains/providers/permit_vehicle_kinds.rb` (create)
- `app/domains/providers/required_document_kinds.rb` (one fixed list)
- `app/domains/providers/provider_status_read.rb`
- `app/domains/providers/provider_status_reads/fetch_service.rb`
- `app/domains/catalog/countries/service_timezone_service.rb` (create)
- `app/domains/catalog/provider_assets/active_vehicle_kinds_service.rb` (create)

Owner flow:

- `app/domains/providers/companies/` (create, update and their requests and validators)
- `app/domains/providers/companies/providers_submit_{request,validator,manager}.rb` (create)
- `app/domains/providers/companies/missing_requirements_service.rb` (create)
- `app/domains/providers/license_records/providers_{create,update}_{request,validator,manager}.rb` (create)
- `app/domains/providers/license_records/recorded_vehicle_kinds_service.rb` (create)
- `app/domains/providers/documents/` (the new link and the new status rule)

Team flow:

- `app/domains/providers/companies/team_{approve,reject,request_correction,index}_*.rb`
- `app/domains/providers/companies/team_{update,suspend,reinstate}_{request,validator,manager}.rb` (create)
- `app/domains/providers/license_records/team_{check,withdraw_check,update}_{request,validator,manager}.rb` (create)

Serializers, controllers and routes:

- The four serializers in `app/domains/providers/` for companies, license records and documents.
- `app/controllers/providers/companies_controller.rb`
- `app/controllers/providers/license_records_controller.rb` (create)
- `app/controllers/team/providers/companies_controller.rb`
- `app/controllers/team/providers/license_records_controller.rb` (create)
- `config/routes/providers_routes.rb` and `config/routes/team_routes.rb`

Catalog:

- `app/domains/catalog/listing.rb`
- `app/domains/catalog/provider_asset.rb`
- `app/domains/catalog/provider_assets/` (create and update requests, managers and validators)
- `app/domains/catalog/listing_packages/package_fields_validation.rb`
- `app/domains/catalog/listings/providers_create_validator.rb`
- `app/domains/catalog/listings/providers_update_validator.rb`
- `app/domains/catalog/listings/providers_publish_validator.rb`
- `app/domains/catalog/listings/keyword_filter_service.rb`
- `app/domains/catalog/provider_status_reads/fetch_service.rb`
- `app/domains/catalog/vehicle_categories/providers_index_manager.rb`

Other:

- `lib/dev/test_accounts_seeder.rb` and the other dev seeders.
- `docs/db/providers.dbml`, `docs/db/catalog.dbml` and `docs/db/redcab.dbml` (remove the tags that this spec ships).

### Code to remove

| Code | Reason |
| --- | --- |
| The `provider_type` enum, `OPERATOR_PROVIDER_TYPES` and `GUIDE_PROVIDER_TYPES` | One kind of company |
| `Providers::PrivateCarDetail`, `CharterBusDetail` and `TourGuideDetail` | Tables dropped |
| `Providers::VerificationChecklist` | Approval reads rows |
| `Providers::ApplicableLicenseKinds` | The map and the fixed kinds replace it |
| `Providers::LicenseRecords::ApprovalPersister` | The team check replaces it |
| `type_detail_persister.rb` and `type_applicable_fields_validation.rb` | No type details |
| `Catalog::Listings::TypeApplicableValidation` | No provider type |
| `Catalog::ProviderAssets::TypeApplicableValidation` | No provider type |
| `Catalog::VehicleCategories::KindsForProviderTypeService` | `RecordedVehicleKindsService` replaces it |
| `guide_fields_valid?` and the guide branch of `pool_assets_match_vehicle_category?` | No guide assets |
| `license_valid_until` in `ProviderStatusRead` | The available package spec owns the effect |
| The zone text `'Asia/Tokyo'` in `team_index_manager.rb` | `ServiceTimezoneService` replaces it |

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [api-208](../cat/api-208-keyword-search.md) | Decisions 1 and 2, and the acceptance lines on `display_name`. The provider leg matches `business_name` only |
| [api-196](../cat/api-196-vehicle-category-reference-table.md) | Decisions 18 and 19 |
| [api-212](../cat/api-212-package-aware-filters-and-price-sort.md) | Nothing. The available package spec replaces decision 17 |
| [api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md) | Nothing. The available package spec removes `PickupCoveragePrefillService` |

### Tests that must change

34 test files use the old names, and the largest groups are these.

| Test files | Change |
| --- | --- |
| `test/controllers/providers/catalog/` (9 files) | Build a permit record, and remove `asset_kind` and the old service types |
| `test/domains/providers/companies/` (5 files) | Replace the type and checklist tests |
| `test/controllers/providers/` (3 files) | Use the new URLs and JSON keys |
| `test/controllers/team/providers/` | Use the new URLs and the new approve body |
| `test/domains/catalog/provider_assets/` and `test/domains/catalog/listings/` | Remove the type rules, and add the permit record rule |
| `test/domains/providers/provider_status_reads/` and `test/domains/catalog/provider_status_reads/` | Remove `license_valid_until` |
| `test/integration/auth_contract/` | Update the route rows |
| `test/support/` | Add a helper that builds a company ready for approval |

New tests cover these behaviors.

- `missing_requirements` lists each missing item.
- Submit works from `pending` and from `rejected`, and it refuses `approved` and `suspended`.
- An owner cannot edit a checked record, and a team edit keeps the check.
- A second record of one kind answers `422`, and a race answers `409`.
- A permit expires at the end of its last valid day in the Service Timezone.
- Approval refuses an expired permit, and a permit with no matching active vehicle.
- A vehicle of another kind does not satisfy approval.
- Withdrawing a check makes the record invalid.
- A suspended company has no discoverable listing, and `HoldAssetService` refuses it.
- A reinstated company is discoverable again.
- A suspension changes no confirmed booking.
- Another company cannot use a license record through `license_record_id`.

## Data / domain touchpoints

- Bounded context: Providers, with changes in Catalog.
- Transaction boundaries: each owner and team action writes one company or one record in one transaction.
- Snapshots: none, because bookings keep their copied values.
- Rails enum values change, so `db:reset` is needed on every local database.

## Worked example

Kenji applies, and the team approves Kanto Charter.

1. Kenji creates Kanto Charter and enters its details.
2. Kenji adds a `passenger_car_permit` record, an insurance record and a company registration record.
3. Kenji uploads the four documents and saves one `private_car` vehicle.
4. Kenji sends submit, and `missing_requirements` is empty, so the company reaches the team queue.
5. The team checks the permit with `valid_until` 2027-03-31, and it checks the other two records.
6. The team approves, and the validator finds a valid permit and a matching vehicle.
7. Kenji sees a typo in the permit number and contacts the team.
8. The team corrects the number, and the check stays.
9. The permit is revoked, so the team withdraws the check and suspends Kanto Charter.
10. Its listings disappear from discovery, and confirmed bookings stay.

## Out of scope

- The available package scope, the service date rule and the daily price refresh job.
- The removal of `PickupCoveragePrefillService` and `skipped_prefectures`.
- Removing `identities_accounts.role`, the new sign-up flow and the new access words.
- Invitations and the owner-only checks, so any member may use the owner endpoints for now.
- What expired insurance does.
- All emails, which launch does not need.
  - The later work sends the owner an email on approval, rejection and correction.
  - The later work sends the team an email on submit.
  - The later work sends reminders 30 and 7 days before a permit ends.
- A request form for a change to a locked record.

## Open items

- The owner may change the retry rule, the rule for confirmed bookings and the rule for service dates.
- Product Owner sign-off on the IAM rulings is not recorded.

## Tasks

### API

- [ ] Add the six migrations, and update the DBML tags.
- [ ] Add the owner license record endpoints and the submit action.
- [ ] Add the team check, withdraw, edit, suspend and reinstate actions.
- [ ] Replace the approve validator and request.
- [ ] Remove the code in [Code to remove](#code-to-remove).
- [ ] Update the Catalog rules, the discoverable scope and the keyword search.
- [ ] Rename the URLs and the JSON keys.
- [ ] Update the dev seeders and the tests.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A company has at most one license record of each kind.
- [ ] An owner cannot change a checked record.
- [ ] Only the team writes `verified_at` and `valid_until`.
- [ ] Submit refuses a company with a missing item, and it names each item.
- [ ] A rejected company can submit again, and it returns to pending.
- [ ] Approval needs a valid permit with a matching active vehicle.
- [ ] Approval needs a checked insurance record and a checked company registration record.
- [ ] A vehicle save needs a permit record of the vehicle kind, checked or not.
- [ ] A suspended company has no discoverable listing and takes no new booking.
- [ ] A suspension changes no confirmed booking.
- [ ] The keyword search matches `business_name` for every company.
- [ ] No file in `app/` names `provider_type`, `asset_kind` or `Asia/Tokyo` outside the country seed.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:reset
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n -E 'provider_type|asset_kind|checklist|tour_guide|mlit_' -- app lib
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
