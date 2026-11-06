---
title: Provider company and members model
sidebar_label: Provider company and members
sidebar_position: 1
description: The provider company, its memberships and license records, the owner and team calls, submit, approval, suspension and the gate of the provider API.
doc_type: model-spec
normative: true
status: current
context: iam
last_reviewed: 2026-11-07
---

## TL;DR \{#company-members-tldr\}

- The table `providers_companies` holds the business, and other domains point to it with `provider_id`.
- The table `providers_memberships` links one person to one company with a company role.
- The table `providers_license_records` holds up to four records for each company, and the team checks them.
- An owner sends a pending company to the team with Submit for review.
- The company JSON lists what is still missing.
- Approval reads the real records and vehicles, and a suspension hides the listings at once.
- The gate of the provider API loads the active membership, and then the company.

## About this document

This is the model page for the company and its members.

It also covers the license records, and the rulings are in [IAM decisions](/docs/30-49-domains/iam/iam-decisions/#provider-company).

| Topic | Document |
| --- | --- |
| Rulings | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company), [Provider licenses](/docs/30-49-domains/iam/iam-decisions/#provider-licenses) and [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) |
| What owners and staff do | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) |
| Column truth | [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) |
| The person and the access word | [Person and provider access model](/docs/30-49-domains/iam/models/person-and-provider-access) |
| Work records | [Company and memberships](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships) and [Permits and approval](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-261-permits-and-approval) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| the model `Providers::Company` | The business of a provider. A row in `providers_companies`. |
| the model `Providers::Membership` | The link between one person and one company. A row in `providers_memberships`. |
| the model `Providers::LicenseRecord` | One permit, insurance or company registration record. A row in `providers_license_records`. |
| permit | A license record of the kind `passenger_car_permit` or `chartered_permit`. |
| checked record | A license record with `verified_at` set by the team. |
| locked record | A checked record. The owner cannot change it. |
| valid record | A checked record whose last valid day has not ended. |
| missing requirement | One item in `missing_requirements` that blocks Submit for review. |
| Service Timezone | The time zone of Japan. The API sends it as `service_timezone`. |
| active membership | A row in `providers_memberships` with `status: "active"`. |
| the gate | The `before_action` chain in `Providers::BaseController`. It decides who may use the provider API. |

## Structure \{#structure\}

The company is the business, and the membership is the person inside it.

```ruby
# app/domains/providers/membership.rb
belongs_to(:provider_company, class_name: 'Providers::Company', foreign_key: :providers_company_id)
belongs_to(:identities_account, class_name: 'Identities::Account', foreign_key: :identities_account_id)
```

- The table `providers_companies` has no column for a person and no provider type.
- The tables `providers_documents`, `providers_license_records` and `providers_support_trials` point to the company with `providers_company_id`.
- The tables of Catalog, Bookings, Reviews and Payments keep the column `provider_id`, and it points to `providers_companies.id`.
- The model `Identities::Account` has `provider_membership`, which reads the active membership only.
- The model `Identities::Account` has `provider_company`, which reads the company through that membership.
- The model `Providers::Company` has `memberships` and `active_memberships`.

### Columns of `providers_memberships` \{#membership-columns\}

| Column | Meaning |
| --- | --- |
| `providers_memberships.uuid` | The public identifier. |
| `providers_memberships.providers_company_id` | The company of the member. |
| `providers_memberships.identities_account_id` | The person. |
| `providers_memberships.company_role` | `owner` or `staff`. A change applies at once. |
| `providers_memberships.status` | `active` or `removed`. |
| `providers_memberships.removed_at` | The time the member left. It is required when the status is `removed`. |

### Database guards of memberships \{#guards\}

| Guard | What it does |
| --- | --- |
| Index `index_providers_memberships_on_active_account` | A unique index on `identities_account_id` where `status = 'active'`. One person has one active membership. |
| Check `providers_memberships_removed_at_check` | The database refuses `status: "removed"` with no `removed_at`. |
| Index `index_providers_memberships_on_account_and_status` | A lookup for the access check on every request. |
| Index `index_providers_memberships_on_company_and_status` | A lookup for the members of one company. |

- A removed row stays, because records keep the member who did an action.
- A removed person gets a new row when a new invitation is accepted.
- A model holds no validation, so the validators check these rules first and the database is the last guard.

### Columns of `providers_companies` \{#company-columns\}

| Column | Meaning |
| --- | --- |
| `providers_companies.status` | `pending`, `approved`, `rejected` or `suspended`. |
| `providers_companies.business_name` | The legal business name. Tourists see it, and the keyword search reads it. |
| `providers_companies.contact_phone` | The contact phone of the company. |
| `providers_companies.submitted_for_review_at` | Set by Submit for review. The team queue shows companies where it is set. |
| `providers_companies.approved_at` | Set by the team when it approves. |
| `providers_companies.rejected_at` and `providers_companies.rejection_reason` | Set by a rejection. A correction request also writes its message to `rejection_reason`. |
| `providers_companies.suspended_at` and `providers_companies.suspension_reason` | Set by a suspension, and cleared by a reinstatement. |

### Columns of `providers_license_records` \{#license-record-columns\}

| Column | Meaning |
| --- | --- |
| `providers_license_records.license_kind` | `passenger_car_permit`, `chartered_permit`, `insurance` or `company_registration`. |
| `providers_license_records.license_number` | The number that the owner enters. A permit needs it. |
| `providers_license_records.valid_until` | The last valid day, stored as midnight at the start of that day in the Service Timezone. Only the team writes it. |
| `providers_license_records.verified_at` | Set when the team checks the record. Only the team writes it. |

- A unique index on `providers_company_id` and `license_kind` gives one record for each kind.
- A document points to the record that it proves with `providers_documents.license_record_id`.
- The permit `passenger_car_permit` unlocks the vehicle kind `private_car`.
- The permit `chartered_permit` unlocks the vehicle kind `charter_bus`.
- Insurance and company registration unlock no vehicle kind.
- A renewal writes `valid_until` and `verified_at` on the same row.

## States \{#states\}

A membership has two states.

| Status | Meaning | Next state |
| --- | --- | --- |
| `active` | The person works in the company. | `removed` |
| `removed` | The person left. The row stays as a record. | None. A new row replaces it. |

A company has four states.

| Status | Meaning | Next state |
| --- | --- | --- |
| `pending` | The owner prepares or has sent the application. | `approved` or `rejected` |
| `rejected` | The team refused the application. | `pending`, when the owner submits again |
| `approved` | The company may sell. | `suspended` |
| `suspended` | The team stopped the company. | `approved`, when the team reinstates it |

A license record has three states.

| State | Meaning |
| --- | --- |
| Waiting | `verified_at` is empty. A new record, and a record whose check the team withdrew. |
| Valid | `verified_at` is set, and the last valid day has not ended. A checked record with no date is valid. |
| Expired | `verified_at` is set, and the last valid day has ended. |

- A permit is valid until the end of its last valid day in the Service Timezone.
- Only a checked permit with a date counts for approval.

## Contract \{#contract\}

### Owner calls \{#owner-calls\}

The calls of the owner use the URL path `companies`.

| Method | Path | Who may call it | Answer |
| --- | --- | --- | --- |
| GET | `/providers/companies` | A person with an active membership | `200` and the company |
| POST | `/providers/companies` | A signed-in person with no active membership | `201` and the company |
| PATCH | `/providers/companies` | A person with an active membership | `200` and the company |
| POST | `/providers/companies/submit` | A person with an active membership | `200` and the company |
| POST | `/providers/companies/license_records` | A person with an active membership | `201` and the license record |
| PATCH | `/providers/companies/license_records/:license_record_id` | A person with an active membership | `200` and the license record |
| POST | `/providers/documents` | A person with an active membership | `201` and the document |

- Any member can use these calls, because only owners exist today.
- The create call accepts empty details.
- A tourist uses the create call to start a company with the same account.

### What each status may do \{#status-rules\}

| Status | Edit details | Add or edit a record | Upload a document | Submit |
| --- | --- | --- | --- | --- |
| `pending` | Yes | Yes | Yes | Yes |
| `rejected` | Yes | Yes | Yes | Yes |
| `approved` | `contact_phone` only | Yes | Yes | No |
| `suspended` | No | No | No | No |

### Onboarding \{#onboarding\}

The manager `Providers::Companies::ProvidersCreateManager` runs in one transaction.

1. It checks that the person has no active membership.
2. It calls the service `Providers::Companies::CreateService`.
3. The service creates a `Providers::Company` with `status: "pending"`.
4. The service creates a `Providers::Membership` with `company_role: "owner"` and `status: "active"`.

- Provider sign-up and the Google flow call the same service, see [Person and provider access model](/docs/30-49-domains/iam/models/person-and-provider-access#sign-up).

| Case | Answer | Message |
| --- | --- | --- |
| The person already has an active membership. | `422` | You already have a provider company. Please update your existing company instead. |
| Two requests of one person run at the same moment. | `409` | You already belong to a provider company. Please use your existing company. |

- The `409` case comes from the unique index.
  - The manager rolls back the transaction, so no company stays behind.
- The `409` answer skips Sentry, because a user can cause it.

### License records of the owner \{#owner-records\}

The owner adds a record, and the owner edits its number until the team checks it.

| Case | Answer | Title |
| --- | --- | --- |
| A permit with no license number. | `422` | The field `license_number` holds the message. |
| A second record of one kind. | `422` | Your company already has this license record. |
| Two requests add the same kind at the same moment. | `409` | Your company already has this license record. |
| The owner edits a checked record. | `422` | The team has checked this record. Please contact the team to change it. |
| The company is suspended. | `409` | Your company is suspended. Please contact the team. |

- The owner cannot write `verified_at` or `valid_until`, and the owner cannot delete a record.

### Submit for review \{#submit\}

Submit needs all of these items, and each missing item has one code in `missing_requirements`.

| Code | Requirement |
| --- | --- |
| `business_name` | `providers_companies.business_name` is present. |
| `contact_phone` | `providers_companies.contact_phone` is present. |
| `permit_record` | A record of a permit kind with a `license_number` exists. |
| `insurance_record` | A record of the kind `insurance` exists. |
| `company_registration_record` | A record of the kind `company_registration` exists. |
| `document_business_registration` | A document of that kind exists. |
| `document_transport_license` | A document of that kind exists. |
| `document_insurance` | A document of that kind exists. |
| `document_id` | A document of that kind exists. |

- A missing item answers `422` with the title `Please complete the missing items before you submit.`
- The company JSON holds the same list, and the submit validator uses the same service.
- From `pending`, submit sets `submitted_for_review_at`, and it clears `rejection_reason`.
- From `rejected`, submit also sets `status: "pending"`, and it clears `rejected_at`.
- A second submit answers `409`, and an approved or suspended company answers `409` too.

### Calls of the team \{#team-calls\}

| Method | Path | Answer |
| --- | --- | --- |
| GET | `/team/providers/companies` | `200` and a list |
| GET | `/team/providers/companies/:company_id` | `200` and the company |
| PATCH | `/team/providers/companies/:company_id` | `200` and the company |
| POST | `/team/providers/companies/:company_id/approve` | `200` and the company |
| POST | `/team/providers/companies/:company_id/reject` | `200` and the company |
| POST | `/team/providers/companies/:company_id/request_correction` | `200` and the company |
| POST | `/team/providers/companies/:company_id/suspend` | `200` and the company |
| POST | `/team/providers/companies/:company_id/reinstate` | `200` and the company |
| POST | `/team/providers/companies/:company_id/license_records/:license_record_id/check` | `200` and the license record |
| POST | `/team/providers/companies/:company_id/license_records/:license_record_id/withdraw_check` | `200` and the license record |
| PATCH | `/team/providers/companies/:company_id/license_records/:license_record_id` | `200` and the license record |

- The list shows pending companies with `submitted_for_review_at` set, oldest first, unless the call sends a `status`.
- The team edit changes `business_name` and `contact_phone` in any status.

### Check, renew and withdraw \{#check\}

The check call also records a renewal, because both write the same two columns on the same row.

- A permit needs a `license_number` and a `valid_until` before the team can check it.
- The date is `YYYY-MM-DD`, and it must be today or later in the Service Timezone.
- The server anchors the date once, at midnight at the start of that day.
- Insurance and company registration accept an empty date.
- A withdrawn check clears `verified_at`, and the record is not valid at once.
- A withdraw on a record that is not checked answers `409`.
- A team edit of the number keeps the check.

### Approve, reject, correct, suspend and reinstate \{#decisions\}

| Call | Needs | What it does |
| --- | --- | --- |
| Approve | `pending` and submitted | Sets `approved`, `approved_at`, and a support trial of 3 months from the Service Timezone date. It takes no body. |
| Reject | `pending` and submitted, and a reason | Sets `rejected`, `rejected_at` and `rejection_reason`, and clears `submitted_for_review_at`. |
| Request correction | `pending` and submitted, and a message | Writes the message to `rejection_reason`, and clears `submitted_for_review_at`. The company stays `pending`. |
| Suspend | `approved`, and a reason | Sets `suspended`, `suspended_at` and `suspension_reason`. |
| Reinstate | `suspended` | Sets `approved`, and clears `suspended_at` and `suspension_reason`. |

- Approve needs a valid permit and an active vehicle of the kind that the permit unlocks.
- Approve also needs a checked insurance record and a checked company registration record.
- Approve does not read documents, because submit already needs them.
- A call that the status does not allow answers `409`.
- A suspension changes no confirmed booking, and it changes no listing status.

### Link to Catalog \{#catalog-link\}

- A vehicle save needs a license record of the permit that unlocks its category kind, checked or not.
- The list `GET /providers/catalog/vehicle_categories` holds the kinds that the company has a permit record for.
- A vehicle with no permit record answers `422` with the title `Please add the permit for this vehicle first.`
- The `discoverable` scope of `Catalog::Listing` needs a company with `status: "approved"`.
- The hold service reads that scope, so a suspended company takes no new booking.

### JSON of the company \{#json\}

The owner JSON and the team JSON hold these keys.

- `uuid`, `status`, `business_name` and `contact_phone`
- `missing_requirements`
- `submitted_for_review_at`, `approved_at`, `rejected_at` and `rejection_reason`
- `suspended_at` and `suspension_reason`
- `documents` and `license_records`
- `service_timezone`, which the web uses to show system times

The team JSON also holds `support_trial`.

- Each row of the team list holds `uuid`, `status`, `business_name`, `submitted_for_review_at` and `service_timezone`.
- A license record holds `uuid`, `license_kind`, `license_number`, `valid_until`, `verified_at` and `is_valid`.
- The key `valid_until` is a `YYYY-MM-DD` date in the Service Timezone.
- A document also holds `license_record_id`, as the uuid of the record.

### The gate \{#gate\}

The gate answers in this order.

1. A person who is not signed in gets `401`.
2. A person whose access word is `missing` gets `403` with `provider_membership_required`.
3. A person whose access word is `suspended` gets `403` with `provider_account_suspended`.
4. An action that needs approval reads `providers_companies.status` and answers with an approval code.

- The access word comes from `Providers::Memberships::ProviderAccessService`, see [Person and provider access model](/docs/30-49-domains/iam/models/person-and-provider-access#states).
- The gate sets `CurrentRequest.provider_membership` and `CurrentRequest.provider_company`.
- The action `create` skips steps 2 and 3, because a new person has no membership yet.
- The company read skips step 3, so a suspended member can read the reason.
- A removed member gets `provider_membership_required`, the same as a person who never joined.
- Managers take the keyword `provider_company:`, and they never read `CurrentRequest`.

## Worked example \{#worked-example\}

Kenji applies, and the team approves Kanto Charter.

1. Kenji signs up on "List your service".
   - The system creates his account, a company with `status: "pending"` and an owner membership.
2. Kenji enters the business name Kanto Charter and the contact phone with `PATCH /providers/companies`.
3. Kenji adds a `passenger_car_permit`, an `insurance` and a `company_registration` record with their numbers.
4. Kenji uploads the four documents and saves one `private_car` vehicle.
5. Kenji sends `POST /providers/companies/submit`.
   - The list `missing_requirements` is empty, so the company reaches the team queue.
6. The team checks the permit with `valid_until` 2027-03-31, and it checks the other two records.
7. The team approves, and the validator finds a valid permit and a matching vehicle.
8. Kenji sees a typo in the permit number, but the record is locked, so he contacts the team.
9. The team edits the number, and the check stays.
10. The permit is revoked, so the team withdraws the check and suspends Kanto Charter.
11. The listings disappear from discovery, and confirmed bookings stay.
