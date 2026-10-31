---
title: "Update provider registration and team approval for permits"
sidebar_label: Web · Permits and approval
issue: "https://github.com/markmamba/red-cab-web/issues/191"
repos:
  - red-cab-web
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-261-permits-and-approval.md"
related:
  - "docs/30-49-domains/39-iam/iam-decisions.md#provider-company"
  - "docs/30-49-domains/39-iam/iam-decisions.md#provider-licenses"
  - "docs/60-69-initiatives/61-2026/implementation-specs/platform/web-144-platform-upload-client.md"
---

## TL;DR

- Provider registration asks for the company details and its license records, not a provider type.
- An owner sees what is missing and sends the application with Submit for review.
- A checked license record is locked, and the screen says so.
- The team checks each record, enters its expiry, and approves, rejects, suspends or reinstates a company.
- The asset, package and listing forms lose the guide choices, and the listing form shows the four new service types.
- The team URL changes from `/team/providers/profiles` to `/team/providers/companies`.
- This spec builds no file upload, so a provider can finish Submit only after `web-144` ships.
- Breaking change: Yes.
  - The web and `red-cab-api` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| permit | A license record of the kind `passenger_car_permit` or `chartered_permit`. |
| checked record | A license record with `verified_at` set by the team. |
| locked record | A checked record that the owner cannot change. |
| missing requirement | One item in `missing_requirements` that blocks Submit for review. |
| company | The business of a provider, which the old code calls a provider profile. |

## User stories

1. US-1: As an owner, I want to add my license records, so the team can check them.
2. US-2: As an owner, I want to see what is missing, so I can send a complete application.
3. US-3: As a rejected owner, I want to correct my application, so I can apply again.
4. US-4: As a team admin, I want to check each record, so approval reads real facts.
5. US-5: As a team admin, I want to suspend and reinstate a company, so a revoked permit stops new sales.
6. US-6: As an owner, I want to save a vehicle after I add a permit, so I can start.

## Problem

The web still follows the provider type.

- The registration form asks for a provider type and for fields of each type.
- The team approve form holds a checklist and the expiry dates of the required licenses.
- No screen lets an owner add or edit a license record.
- No screen lets the team check, withdraw or edit a license record.
- No control sends a company to the team, because the Submit button is disabled for good.
- No control lets the team suspend or reinstate a company.
- The asset form offers guide assets, and the package form offers guide-only packages.
- The listing form offers the old service types, filtered by the provider type.
- The API modules call `providers/profiles` and `team/providers/profiles`.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | Submit, retry, approved changes and suspension |
| Rule | [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses) | Kinds, locking, checks and approval |
| Rule | [Permits and package availability](/docs/30-49-domains/catalog/catalog-decisions/#permits-and-package-availability) | The vehicle save rule |
| Requirement | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) | What an owner sees |
| Paired spec | [API permits and approval](api-261-permits-and-approval.md) | The contract and the error answers |
| Dependency | [Platform upload client](../platform/web-144-platform-upload-client.md) | Document upload |
| Web rules | `red-cab-web/AGENTS.md` | Domain folders, API modules and forms |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | This spec builds no upload. | Build the upload wiring here. | `web-144` owns it, and it waits for the API storage. |
| 2 | The provider paths under `/providers/registration/` stay, and the team path becomes `/team/providers/companies`. | Rename all paths. | The provider paths are not API paths, and the team path follows the API. |
| 3 | The domain folders and the loader keys use the word company. | Keep the word profile in the web. | The API, the DBML and the rulings use company, so one word helps every reader. |
| 4 | The create and edit forms ask for `business_name` and `contact_phone` only, and both are required. | Allow an empty form. | Submit needs both, and the API accepts an empty create for the later sign-up flow. |
| 5 | License records get their own page at `/providers/registration/licenses`. | Put them on the edit page. | A record has its own life: unchecked, checked and locked. |
| 6 | Submit for review sits on the documents page, beside the missing list. | A new page. | The documents page already holds the disabled button. |
| 7 | The page disables Submit while `missing_requirements` has items. | Always enabled. | The owner sees the cause at once, and the API still checks again. |
| 8 | A locked record shows its number as read-only text with a note. | Hide the edit control. | The owner must understand why the control is gone. |
| 9 | The team approve control is a confirm button with no form. | Keep a form. | The API takes no body. |
| 10 | The team screens have no edit form for `business_name` and `contact_phone`. | Add one now. | No story needs it, and the API already supports it. |
| 11 | The listing form offers all four service types to every company. | Filter by permit. | The rulings tie vehicles to permits, not services. |
| 12 | The category list of the asset form comes from the API, and an empty list links to the licenses page. | A hard-coded list. | The API returns the kinds that the company has a permit record for. |
| 13 | `LANGUAGE_SPOKEN_OPTIONS` and the checkbox group field move to the listing domain before the old folder is deleted. | Delete them. | The listing form uses both today. |
| 14 | The page shows `valid_until` as the date that the API sends. | Convert it in the browser. | The API already gives the date in the Service Timezone. |

## Web contract

### Provider surfaces

| Surface | Route | Loader | API module | Shows |
| --- | --- | --- | --- | --- |
| Create | `/providers/registration/create` | `clientLoader` | `providersCompaniesApi.create` | Company details form |
| Edit | `/providers/registration/edit` | `clientLoader` | `providersCompaniesApi.update` | Company details form |
| Licenses (new) | `/providers/registration/licenses` | `clientLoader` | `providersLicenseRecordsApi` | License records |
| Documents | `/providers/registration/documents` | `clientLoader` | `providersCompaniesApi.submit` | Status, missing list, documents, Submit |
| Dashboard | `/providers` | `clientLoader` | `providersCompaniesApi.show` | Status summary |

The flow for a new owner is: create, licenses, documents, then submit.

### What each status shows

| Status | Details form | Licenses page | Submit control | Note |
| --- | --- | --- | --- | --- |
| `pending`, not submitted | Both fields | Add and edit unchecked records | Shown | |
| `pending`, submitted | Both fields | As above | Hidden | `Your application is waiting for review.` |
| `rejected` | Both fields | As above | Shown | The rejection reason and `Correct your application and submit again.` |
| `approved` | `contact_phone` only | Add records, and edit unchecked ones | Hidden | `business_name` shows as text, with a note to contact the team |
| `suspended` | Read-only | Read-only | Hidden | The suspension reason |

### Missing requirements

The documents page shows one line for each code in `missing_requirements`.

| Code | Label | Link |
| --- | --- | --- |
| `business_name` | Enter your business name | Edit page |
| `contact_phone` | Enter your contact phone | Edit page |
| `permit_record` | Add a permit with its license number | Licenses page |
| `insurance_record` | Add your insurance record | Licenses page |
| `company_registration_record` | Add your company registration record | Licenses page |
| `document_business_registration` | Upload your business registration | Documents page |
| `document_transport_license` | Upload your transport license | Documents page |
| `document_insurance` | Upload your insurance document | Documents page |
| `document_id` | Upload your ID | Documents page |

The document lines stay in the list until `web-144` ships the upload.

- The upload alert on the documents page keeps its text, and it points to the open work.

### License records page

Each record is one row with these parts.

| Part | Rule |
| --- | --- |
| Kind | `Passenger car permit`, `Chartered permit`, `Insurance` or `Company registration` |
| Number | An input for an unchecked record, and text for a locked record |
| State | `Waiting for the team`, `Checked, valid until {date}`, `Expired {date}` |
| Action | `Save` for an unchecked record |

- The page shows one add control for each kind that the company does not have yet.
- A permit row names the vehicle kind that it unlocks: private cars or charter buses.
- A locked row shows `The team has checked this record. Please contact the team to change it.`
- A `422` or `409` from the API shows its `title` in a toast and on the field.

### Team surfaces

| Surface | Route | Loader | API module |
| --- | --- | --- | --- |
| Queue | `/team/providers/companies` | `clientLoader` | `teamProvidersCompaniesApi.index` |
| Detail | `/team/providers/companies/:companyId` | `clientLoader` | `teamProvidersCompaniesApi.show` |

The queue shows these columns.

- Business name, status, and the date of submission.
- A filter for status, business name and the date of submission.
- No provider type column and no provider type filter.

The detail page shows these cards.

| Card | Content |
| --- | --- |
| Company | Status badge, business name, contact phone, dates, rejection and suspension reasons |
| License records | One row for each record, with the actions below |
| Documents | The uploaded documents, with the record that each one proves |
| Support trial | As today |
| Actions | Approve, Request correction, Reject, Suspend or Reinstate by status |

Each license record row has these team actions.

| State | Action | Input |
| --- | --- | --- |
| Not checked | Check | `valid_until` as a date. A permit needs it, and the other kinds accept an empty date. |
| Checked | Renew | A new `valid_until` |
| Checked | Withdraw check | None |
| Any | Edit number | `license_number`, and the check stays |

The Actions card follows the status.

| Status | Actions shown |
| --- | --- |
| `pending`, submitted | Approve, Request correction, Reject |
| `pending`, not submitted | None, with the note `The owner has not submitted this application.` |
| `approved` | Suspend, with a reason |
| `suspended` | Reinstate |
| `rejected` | None |

An error on Approve shows the API messages above the button.

### API modules

| Module | Change |
| --- | --- |
| `providers-profiles-api.js` becomes `providers-companies-api.js` | Path `providers/companies`. Methods `show`, `create`, `update` and `submit`. The payload holds `business_name` and `contact_phone` only. |
| `providers-license-records-api.js` (create) | `create` and `update` on `providers/companies/license_records` |
| `providers-documents-api.js` | The payload accepts an optional `license_record_id` |
| `team-providers-profiles-api.js` becomes `team-providers-companies-api.js` | Path `team/providers/companies`. Methods `index`, `show`, `approve`, `reject`, `requestCorrection`, `suspend` and `reinstate` |
| `team-providers-license-records-api.js` (create) | `check`, `withdrawCheck` and `update` |
| `providers-catalog-assets-api.js` | The payload drops `asset_kind` |

### Catalog forms

| Form | Change |
| --- | --- |
| Asset | No kind select. `license_plate_or_vin` and `vehicle_category` are required. The list shows the category in place of the kind. |
| Package | `vehicle_category` is required. The pool picker drops the guide rules. |
| Listing | `service_type` offers `tour`, `airport_transfer`, `private_charter` and `port_transfer`, in that order. |
| Discovery filter | The same four values, with the same labels. |

The labels are `Tour`, `Airport transfer`, `Private charter` and `Port transfer`.

### Files to create or modify (Web)

Providers:

- `app/domains/providers-profile/` becomes `app/domains/providers-company/`.
- `app/domains/providers-company/providers-company-license-record-list-view.jsx` (create)
- `app/domains/providers-company/providers-company-license-record-form.jsx` (create)
- `app/domains/providers-company/providers-company-missing-requirement-list-view.jsx` (create)
- `app/routes/provider/providers-profile-registration-*.jsx` become `providers-company-registration-*.jsx`.
- `app/routes/provider/providers-company-registration-licenses-page.jsx` (create)
- `app/provider.routes.js`
- `app/routes/provider/provider-dashboard-page.jsx`
- The other files in `app/routes/provider/` that read the loader key `providerProfile`.

Team:

- `app/domains/team-providers-profile/` becomes `app/domains/team-providers-company/`.
- `app/domains/team-providers-company/team-providers-company-license-record-list-view.jsx` (create)
- `app/domains/team-providers-company/team-providers-company-check-form.jsx` (create)
- `app/domains/team-providers-company/team-providers-company-suspend-form.jsx` (create)
- `app/routes/team/providers-profile/` becomes `app/routes/team/providers-company/`.
- `app/team.routes.js`
- `app/layouts/team/team-sidebar-config.js` (the path and the match)
- `app/auth/auth-safe-redirect.js` is unchanged, because it names no team company path.

Catalog and shared:

- `app/domains/catalog-provider-asset/` (constants, form, schema, service and list view)
- `app/domains/catalog-listing-package/` (form, service and schema)
- `app/domains/catalog-listing/` (constants, schema, service, form and discover filter)
- `app/domains/catalog-listing/catalog-listing-checkbox-group-field.jsx` (moved from the providers folder)
- `app/utils/loader-utils.js` and `ProvidersCompanyService`, where they name the profile.
- `app/api/` (the modules in the table above)

### Code to remove

| Code | Reason |
| --- | --- |
| `PROVIDER_TYPE`, `PROVIDER_TYPE_OPTIONS` and `PROVIDER_TYPE_VALUES` | One kind of company |
| `VEHICLE_TYPE*`, `BUS_CAPACITY*`, `GUIDE_LICENSE_TYPE*`, `SPECIALTY_TAG*` and `VEHICLE_OWNED_OPTIONS` | The type detail forms go |
| `JAPAN_PREFECTURE_OPTIONS`, if no other file reads it after the move | The company has no service prefectures |
| `VERIFICATION_CHECKLIST_ITEM*` and `providers-profile-checklist-item-list-view.jsx` | Approval reads rows |
| The type detail cards in the team detail view | The tables are gone |
| `team-providers-profile-approve-form.jsx` and `teamProvidersProfileApproveSchema` | The confirm button replaces them |
| `CATALOG_PROVIDER_ASSET_KIND*` and `allowedAssetKindOptions` | No guide assets |
| `CatalogListingPackageService.assetKindAccess` and the guide branches | No guide-only packages |
| `SERVICE_TYPES_BY_PROVIDER_TYPE` and `allowedServiceTypeOptions` | The type rule goes |

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [web-156](../cat/web-156-provider-packages-and-tourist-package-choice.md) | The acceptance line that lists categories by provider type, and the guide-only package rule |
| [web-168](../platform/web-168-url-filter-form.md) | The team provider filter value `provider_type`, and the list key `providers_profiles` |
| [web-153](../cat/web-153-listing-scope-pages.md) | The values of `service_type` in rows 6 and 10. The parameter names stay |

This spec changes no Catalog behavior for tourists beyond the service type values.

### Tests that must change

| Test file | Change |
| --- | --- |
| `app/domains/providers-profile/providers-profile-service.spec.js` | Move and rename. Assert the new status rules. |
| `app/domains/catalog-provider-asset/catalog-provider-asset-service.spec.js` | Remove the kind tests. |
| `app/domains/catalog-listing-package/catalog-listing-package-form.spec.jsx` and its service spec | Remove the guide cases. |
| `app/domains/catalog-listing/` (10 spec files) | Use the four service types. |
| `app/api/marketplace-catalog-listings-api.spec.js` and `providers-catalog-listings-api.spec.js` | Use the four service types. |
| `app/routes/provider/` (7 spec files) | Use the loader key `providerCompany`. |
| `app/routes/marketplace/catalog-listing/` (2 spec files) | Use the four service types. |
| `app/components/search/filter-chips.spec.jsx` | Use the four service types. |
| `app/utils/loader-utils.spec.js` | Use the new names. |

New tests cover these behaviors.

- The documents page lists each missing requirement, and it disables Submit until the list is empty.
- Submit works from `pending` and from `rejected`, and the page hides it elsewhere.
- A locked record shows no input and shows the note.
- The licenses page offers one add control for each kind that is missing.
- The asset form shows the link to the licenses page when the category list is empty.
- The team detail page shows the right actions for each status.
- The check form requires a date for a permit and accepts none for insurance.
- The listing form lists the four service types for every company.
- No test mentions `provider_type`.

## Data / domain touchpoints

- Bounded context: Providers, with changes in Catalog forms.
- Transaction boundaries: none in the web.
- Snapshots: none.

## Worked example

Kenji applies, and the team approves Kanto Charter.

1. Kenji opens `/providers/registration/create`, and he enters the business name and the contact phone.
2. Kenji opens the licenses page, and he adds a passenger car permit with its number.
3. He adds an insurance record and a company registration record.
4. Kenji opens the documents page, and the list shows the four missing documents.
5. After `web-144` ships, Kenji uploads the four documents, and the list is empty.
6. Kenji presses Submit for review, and the page says that the application waits for review.
7. The team opens the company and enters an expiry date one year ahead for the permit.
8. The team checks the other two records.
9. The team approves Kanto Charter, and Kenji's dashboard shows `Approved`.
10. Kenji sees a typo in the permit number, but the row is locked, so he contacts the team.

## Out of scope

- File upload, which `web-144` owns.
- The account menu, the portal switch and the new access words.
- Team forms for `business_name` and `contact_phone`.
- A request form for a change to a locked record.
- Emails and reminders.
- The layout redesign, because topic A2 in markmamba/redcab-docs#154 owns it.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.

## Tasks

### Web

- [ ] Rename the domain folders, the route files, the loader keys and the API modules.
- [ ] Move `LANGUAGE_SPOKEN_OPTIONS` and the checkbox group field to the listing domain.
- [ ] Replace the registration form, and add the licenses page.
- [ ] Add the missing list and enable Submit for review.
- [ ] Replace the team detail view, and remove the approve form.
- [ ] Add the check, withdraw, edit, suspend and reinstate controls.
- [ ] Update the asset, package, listing and filter forms.
- [ ] Update the tests.
- [ ] Update `AGENTS.md` and `app/routes/AGENTS.md` where they name the removed code.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] An owner can add and edit unchecked license records, and a checked record is locked.
- [ ] The documents page lists each missing requirement by name.
- [ ] Submit for review works for a pending and a rejected company.
- [ ] A rejected owner sees the reason and can correct the application.
- [ ] The team can check and renew a record with a date, and withdraw a check.
- [ ] The team can approve, reject, request a correction, suspend and reinstate.
- [ ] The team queue shows submitted companies by default.
- [ ] No screen shows a provider type, a checklist or a guide choice.
- [ ] The listing form and the discovery filter show the four service types.
- [ ] The asset form needs a plate and a category.
- [ ] No file in `app/` names `provider_type`, `asset_kind` or `providers/profiles`.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
git grep -n -E 'provider_type|PROVIDER_TYPE|asset_kind|ASSET_KIND|providers/profiles|providerProfile' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
