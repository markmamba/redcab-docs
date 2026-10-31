---
title: "Rename the provider profile to the provider company and add memberships"
sidebar_label: API · Company and memberships
issue: "https://github.com/markmamba/red-cab-api/issues/260"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
related:
  - "docs/30-49-domains/39-iam/iam-decisions.md#provider-company"
  - "docs/30-49-domains/39-iam/iam-decisions.md#company-roles"
  - "docs/30-49-domains/39-iam/requirements/provider-company-members.md"
  - "docs/30-49-domains/39-iam/architecture-decisions/accounts-and-provider-companies.md"
---

## TL;DR

- `providers_profiles` becomes `providers_companies`, and `Providers::Profile` becomes `Providers::Company`.
- A new table `providers_memberships` links one person to one company.
- Onboarding creates the company and an owner membership in one transaction.
- The provider gate loads the active membership of the person, and then the company.
- The URLs, the JSON keys, the account `role` and `provider_type` do not change.
- This spec has no web part.
- Breaking change: No for clients.
  - Inside Rails, every Manager keyword `provider_profile:` becomes `provider_company:`.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| the model `Providers::Company` | The business of a provider. It replaces `Providers::Profile`. |
| the model `Providers::Membership` | The link between one person and one company. It holds the company role. |
| the gate | The `before_action` chain in `Providers::BaseController`. |
| active membership | A row in `providers_memberships` with `status: "active"`. |
| owner | A company role. In this spec the owner is the only role that exists in practice. |

## Problem

The code still treats one profile as one person.

- The column `providers_profiles.identities_account_id` is unique, so one person owns the whole business.
- No table links many people to one company.
- The gate reads `identities_accounts.role` and the one profile of the account.
- 130 files in `app/` use the names `Providers::Profile` and `provider_profile` for the business.
- 98 test files use the same names.
- Eight tables of other domains point to `providers_profiles`.
- The DBML files already point to `providers_companies`.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | The company owns the business, and other domains keep `provider_id` |
| Rule | [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) | One active membership for each person, Owner or Staff, and removed rows stay |
| Requirement | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) | What an owner and a staff member see |
| Record | [Accounts are persons, and provider companies have members](/docs/30-49-domains/iam/architecture-decisions/accounts-and-provider-companies) | Reasons and rejected options |
| Column truth | [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) | `providers_companies` and `providers_memberships` |
| Code rules | `red-cab-api/db/AGENTS.md` | Migration rules |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The URLs and the JSON keys do not change. | Rename them now. | The permits spec removes `provider_type` and the detail objects, so the web changes once, there. |
| 2 | The rename covers the Rails names: models, associations, folders, classes, serializers and keywords. | Rename only the table. | Half the old names would mislead every later spec. |
| 3 | The migration order is rename, then create memberships, then drop the account link. | Create memberships first. | The foreign key from `providers_memberships` needs the table `providers_companies` to exist. |
| 4 | This spec breaks the two-deploy rule of `db/AGENTS.md`, and it records why. | Stop reading the column in one release, and drop it in the next. | No production system exists, so no old code runs against the new schema. |
| 5 | The three type detail tables keep the column `providers_profile_id`. | Rename it now. | The permits spec drops these tables. |
| 6 | The gate keeps the role check and the same `403` codes. | Add the new codes now. | The portal access spec replaces the codes together with the web entry rules. |
| 7 | Any member can update the company, because only owners exist now. | Add the owner-only check now. | Staff do not exist until the invitations spec. |
| 8 | A race on the active membership index answers `409`. | Answer `500`. | The partial unique index is the last guard, and the user needs a clear answer. |
| 9 | `Identities::Account` gets `provider_membership` (active only) and `provider_company` through it. | Keep `provider_profile`. | The account no longer owns the business. |
| 10 | The `AGENTS.md` examples keep the name `provider_profile` until I2 ships. | Update them in each PR. | The plan updates `AGENTS.md` and `db/AGENTS.md` once, after I2. |
| 11 | Developers reset the local database with `bin/rails db:reset`. | Add a data migration. | No production data exists, and the project rule is no backfill. |

## API contract

The public shape does not change.

Only the lookup of the company changes.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/profiles` | Person with an active membership | None | `200` company JSON | The company comes from the membership |
| POST | `/providers/profiles` | Person, role `provider` | As today | `201` company JSON | Creates the company and an owner membership |
| PATCH | `/providers/profiles` | Person with an active membership | As today | `200` company JSON | Any member can update |
| GET | `/team/providers/profiles` | Team admin | None | `200` list | Unchanged |
| GET | `/team/providers/profiles/:profile_id` | Team admin | None | `200` company JSON | Unchanged |
| POST | `/team/providers/profiles/:profile_id/approve` | Team admin | As today | `200` company JSON | Unchanged |
| POST | `/team/providers/profiles/:profile_id/reject` | Team admin | As today | `200` company JSON | Unchanged |
| POST | `/team/providers/profiles/:profile_id/request_correction` | Team admin | As today | `200` company JSON | Unchanged |

The response of `POST /providers/profiles` now answers `409` in one new case.

| Case | Status | `title` |
| --- | --- | --- |
| Two requests of one person create a company at the same moment | `409` | `You already belong to a provider company. Please use your existing company.` |

The gate answers in this order.

1. The person must be signed in, or the answer is `401`.
2. The account role must be `provider`, or the answer is `403` with `provider_role_required`.
3. The person must have an active membership, or the answer is `403` with `provider_profile_required`.
4. An action that needs approval reads `providers_companies.status`, and it answers with the existing approval codes.

### Migration order

No production data exists, so this spec needs no backfill.

It also needs no three-step `NOT NULL` migration.

1. Rename `providers_profiles` to `providers_companies`.
   - Rename the column `providers_profile_id` to `providers_company_id` in `providers_documents`, `providers_license_records` and `providers_support_trials`.
   - Rename the custom index names that Rails does not rename by itself.
   - Update the column comments `FK → providers_profiles.id` in the eight tables that point to the company.
   - Update the table comment of `providers_companies`.
2. Create `providers_memberships` with its indexes and its CHECK constraint.
3. Remove the column `providers_companies.identities_account_id` with its foreign key and its unique index.

The migrations copy the names, the comments and the column order from the file `docs/db/providers.dbml`.

The indexes get these names.

| Table | Old name | New name |
| --- | --- | --- |
| `providers_companies` | `index_providers_profiles_on_status_and_submitted_at` | `index_providers_companies_on_status_and_submitted_at` |
| `providers_documents` | `index_providers_documents_on_profile_and_kind` | `index_providers_documents_on_company_and_kind` |
| `providers_license_records` | `index_providers_license_records_on_profile_and_kind` | `index_providers_license_records_on_company_and_kind` |

Rails renames the other indexes with the table and the column.

The test run asserts the new names.

The membership table gets this CHECK constraint.

```sql
-- docs/db/providers.dbml:36-38
CHECK (status <> 'removed' OR removed_at IS NOT NULL)
```

### Files to create or modify (API)

Models and migrations:

- `db/migrate/` (three new migrations)
- `app/domains/providers/company.rb` (create, replaces `profile.rb`)
- `app/domains/providers/membership.rb` (create)
- `app/domains/identities/account.rb` (replace `provider_profile` with `provider_membership` and `provider_company`)

Association owners in other domains (`belongs_to :provider_company`, `foreign_key: :provider_id`):

- `app/domains/bookings/checkout_session.rb`
- `app/domains/bookings/order.rb`
- `app/domains/catalog/listing.rb`
- `app/domains/catalog/provider_asset.rb`
- `app/domains/payments/payout_queue_entry.rb`
- `app/domains/payments/provider_merchant_account.rb`
- `app/domains/reviews/provider_response.rb`
- `app/domains/reviews/review.rb`

The Providers folder:

- `app/domains/providers/profiles/` becomes `app/domains/providers/companies/`, with the classes in `Providers::Companies::`.
- `providers_profile_detail_serializer.rb` becomes `providers_company_detail_serializer.rb`.
- `team_profile_base_serializer.rb` and `team_profile_detail_serializer.rb` become `team_company_base_serializer.rb` and `team_company_detail_serializer.rb`.
- The three events in `app/domains/providers/events/` take `provider_company:`.
- `app/domains/providers/companies/providers_create_manager.rb` and its validator (see below).

Controllers and routes:

- `app/controllers/providers/base_controller.rb`
- `app/controllers/providers/profiles_controller.rb` becomes `app/controllers/providers/companies_controller.rb`.
- `app/controllers/team/providers/profiles_controller.rb` becomes `app/controllers/team/providers/companies_controller.rb`.
- The five controllers that call `require_approved_provider_profile!` call `require_approved_provider_company!`.
- `config/routes/providers_routes.rb` and `config/routes/team_routes.rb` change the `controller:` value only, not the path.
- `app/models/current_request.rb` (replace `provider_profile` with `provider_company` and `provider_membership`)

Other files that use the old names:

- About 100 managers, validators and services in `app/domains/catalog/`, `app/domains/reviews/`, `app/domains/bookings/` and `app/domains/payments/`.
  - They change the keyword `provider_profile:` to `provider_company:`.
  - They change the class name `Providers::Profile` to `Providers::Company`.
- `lib/dev/catalog_marketplace_seeder.rb`, `lib/dev/completed_order_factory.rb`, `lib/dev/team_reviews_moderation_seeder.rb`, `lib/dev/test_accounts_seeder.rb` and `db/seeds.rb`.
- `docs/db/providers.dbml` and `docs/db/redcab.dbml` (remove the tags of the pieces that this spec ships).

### The model `Providers::Membership`

The model follows the table in `docs/db/providers.dbml`.

- It sets `self.table_name = 'providers_memberships'`.
- It declares `belongs_to :provider_company` with `foreign_key: :providers_company_id`.
- It declares `belongs_to :identities_account` with `foreign_key: :identities_account_id`.
- It declares the string enums `company_role` (`owner`, `staff`) and `status` (`active`, `removed`), both with `prefix: true`.
- It adds `has_many :active_memberships` to the company, as the soft delete pattern asks.
- It holds no validation, because all validation lives in Validators.

The partial unique index `index_providers_memberships_on_active_account` allows one active membership for each person.

### Onboarding

`Providers::Companies::ProvidersCreateManager` changes in three places.

- It builds the company without `identities_account`.
- It creates the owner membership in the same transaction.
- It rescues `ActiveRecord::RecordNotUnique` from the membership insert, and it raises `Errors::ConflictError` with `skip_sentry: true`.

The validator method `profile_is_available?` becomes `person_has_no_active_membership?`.

- It checks `identities_account.provider_membership.blank?`.
- It keeps the message that tells the person to update the existing company, with the word `company`.

```ruby
# app/domains/providers/profiles/providers_create_validator.rb:67-74
def profile_is_available?
  return if @identities_account.provider_profile.blank?
  errors.add(
    :base,
    'You already have a provider profile. Please update your existing profile instead.'
  )
end
```

### The gate

`Providers::BaseController` keeps its three checks, and it changes what they read.

| Today | After this spec |
| --- | --- |
| `load_provider_profile` | `load_provider_membership` sets `CurrentRequest.provider_membership` and `CurrentRequest.provider_company` |
| `authorize_provider_portal_role!` | Unchanged |
| `require_provider_profile!` | `require_provider_membership!`, with the same code `provider_profile_required` |
| `require_approved_provider_profile!` | `require_approved_provider_company!`, with the same approval codes |

The create action skips `require_provider_membership!`, as it skips the check today.

Controllers pass `CurrentRequest.provider_company` to Managers as the keyword `provider_company:`.

### Code to remove

| Code | Reason |
| --- | --- |
| `app/domains/providers/profile.rb` | `Providers::Company` replaces it |
| `providers_companies.identities_account_id` | The membership holds the link |
| `Identities::Account#provider_profile` | The membership replaces it |
| `CurrentRequest.provider_profile` | `provider_company` replaces it |
| The names `Providers::Profile`, `provider_profile` and `providers_profile_id` | Except the three type detail tables, which keep the column until the permits spec |

This spec removes no Corporate code, no `provider_type` code and no `identities_accounts.role`, because later specs own that work.

### Implemented specs that this spec replaces

This spec changes names only, so it replaces no part of these specs.

- [Keyword search spec api-208](../cat/api-208-keyword-search.md)
- [Pickup coverage spec api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md)

The permits spec and the available package scope spec replace the parts that read `provider_type` and fill `skipped_prefectures`.

### Tests that must change

| Test file | Change |
| --- | --- |
| `test/controllers/providers/base_controller_test.rb` | Build a membership. Assert the codes for no membership and for a removed membership. |
| `test/controllers/providers/profiles_controller_test.rb` | Rename the file and the class. Assert the owner membership after create. |
| `test/controllers/team/providers/profiles_controller_test.rb` | Rename the file and the class. |
| `test/domains/providers/profiles/` | Move to `test/domains/providers/companies/`. |
| `test/integration/auth_contract/providers_profiles_create_role_gate_test.rb` | Keep the file name, because the route does not change. Assert the membership. |
| `test/models/current_request_test.rb` | Assert the new attributes. |
| The other test files that build a profile | Build a company and an owner membership. |

New tests cover these behaviors.

- The database refuses a second active membership for one person.
- The database refuses a removed membership with no `removed_at`.
- A removed person can have a new active row.
- Onboarding creates exactly one company and one owner membership.
- Onboarding a second time answers `422`, and a race answers `409`.
- A person with a removed membership gets `provider_profile_required`.
- Two companies never see the listings of each other.
- The renamed indexes exist.

The test helpers get one method that builds a company and an owner membership for an account.

## Data / domain touchpoints

- Bounded context: IAM and Providers.
- Transaction boundaries: onboarding creates the company and the owner membership in one transaction.
- Snapshots: none.
- Other domains keep the column `provider_id`, so no snapshot column changes.
- `bookings_completion_determinations.determined_by_id` still names `providers_profiles.uuid` in its comment, and the member columns spec replaces it.

## Worked example

Kenji signs up and creates his company.

1. Kenji signs up on "List your service", and the system creates his account with the role `provider`.
2. Kenji sends `POST /providers/profiles` with his business name.
3. The system creates `Providers::Company` Kanto Charter with `status: "pending"`.
4. The system creates a `Providers::Membership` with `company_role: "owner"` and `status: "active"`.
5. Kenji sends `GET /providers/profiles`, and the gate finds his active membership and returns Kanto Charter.
6. Kenji sends `POST /providers/profiles` again.
7. The validator answers `422` with a message to use the existing company.

## Out of scope

- Invitations, role changes and the removal of members.
- The owner-only checks.
- Permits, approval and the removal of `provider_type`.
- Removing `identities_accounts.role`, the new sign-up flow and the new access codes.
- The URL and JSON rename, and any web change.
- The member columns on other tables.
- The update of `AGENTS.md`, `db/AGENTS.md`, `backend.md` and the `.dbdiagram` files, which wait until I2 ships.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.

## Tasks

### API

- [ ] Add the three migrations.
- [ ] Add `Providers::Company` and `Providers::Membership`, and remove `Providers::Profile`.
- [ ] Rename the folders, the classes, the serializers and the keywords.
- [ ] Update the account, the `CurrentRequest` attributes and the gate.
- [ ] Make onboarding create the owner membership, and map the race to `409`.
- [ ] Update the dev seeders and the test helpers.
- [ ] Update the tests.
- [ ] Remove the I2 tags that this spec ships from `docs/db/providers.dbml` and `docs/db/redcab.dbml`.
- [ ] Run the checks in [Verification](#verification).

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] Onboarding creates one company and one owner membership.
- [ ] The database refuses a second active membership for one person.
- [ ] The database refuses a removed membership with no `removed_at`.
- [ ] A person with no active membership gets `403` with `provider_profile_required`.
- [ ] Catalog, Bookings, Reviews and Payments keep the column `provider_id`, and it points to `providers_companies`.
- [ ] The URLs and the JSON keys of the provider and team endpoints are the same as before.
- [ ] No file in `app/` or `test/` names `Providers::Profile`.
- [ ] No file in `app/` or `test/` names `provider_profile`, except the examples in `AGENTS.md`.
- [ ] The three type detail tables are the only tables that still hold `providers_profile_id`.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:reset
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n -E 'Providers::Profile|provider_profile|providers_profiles' -- app test lib db/seeds.rb
git grep -n 'providers_profile_id' -- app db/schema.rb
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
