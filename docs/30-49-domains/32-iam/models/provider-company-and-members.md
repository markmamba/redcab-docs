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
- An owner invites a person by email, and the owner sends the link by hand.
- An owner changes a role or removes a member, and the last owner cannot leave.
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
| The web pages for invitations and members | [Staff invitations and members](/docs/30-49-domains/iam/use-cases/staff-invitations-and-members) |
| Column truth | [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) |
| The person and the access word | [Person and provider access model](/docs/30-49-domains/iam/models/person-and-provider-access) |
| Work records | [Company and memberships](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships) and [Permits and approval](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-261-permits-and-approval) and [Invitations and members](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-264-invitations-and-members) |

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
| the model `Providers::Invitation` | An owner invites one email to join one company. A row in `providers_invitations`. |
| invitation link | The web address `/account/staff-invitation?token=…`. It holds the raw token. |
| raw token | The secret in the link. The database keeps only its SHA-256 digest. |
| accept state | One word that says what the viewer of an invitation can do. |
| owner-only check | The method `require_company_owner!` in `Providers::BaseController`. |
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

### Columns of `providers_invitations` \{#invitation-columns\}

| Column | Meaning |
| --- | --- |
| `providers_invitations.uuid` | The public identifier. |
| `providers_invitations.providers_company_id` | The company that invites. |
| `providers_invitations.invited_by_membership_id` | The owner who sent the invitation. A send again sets it to the owner who sends now. |
| `providers_invitations.email` | The invited email, in lower case. |
| `providers_invitations.company_role` | `owner` or `staff`. The role of the new membership. |
| `providers_invitations.token_digest` | The SHA-256 digest of the token. A send again replaces it. |
| `providers_invitations.sent_at` and `providers_invitations.expires_at` | The send time, and the send time plus 7 days. A send again writes both. |
| `providers_invitations.status` | `pending`, `accepted` or `cancelled`. |
| `providers_invitations.accepted_at` and `providers_invitations.cancelled_at` | Required when the status is `accepted` or `cancelled`. |

- An expired invitation is a `pending` row with `expires_at` in the past.
  - The status has no value `expired`.
- A unique index on `providers_company_id` and `email` where `status = 'pending'` gives one open invitation for each company and email.
- A unique index on `token_digest` keeps every link different.
- Two checks, `providers_invitations_accepted_at_check` and `providers_invitations_cancelled_at_check`, refuse a row with no date.
- The API never returns the token or its digest.

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

An invitation has three stored states.

| Status | Meaning | Next state |
| --- | --- | --- |
| `pending` | The link can work. It stops working at `expires_at`. | `accepted` or `cancelled` |
| `accepted` | The person joined. | None |
| `cancelled` | The owner cancelled it. | None |

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
| PATCH | `/providers/companies` | An owner | `200` and the company |
| POST | `/providers/companies/submit` | An owner | `200` and the company |
| POST | `/providers/companies/license_records` | An owner | `201` and the license record |
| PATCH | `/providers/companies/license_records/:license_record_id` | An owner | `200` and the license record |
| POST | `/providers/documents` | An owner | `201` and the document |

- Staff can read the company with `GET /providers/companies`, and they can list the documents.
- Staff get `403` with `provider_owner_required` on the calls that need an owner, see [Owner-only check](#owner-check).
- The payout account call `POST /providers/payments/merchant_accounts` needs an owner too.
- The create call accepts empty details.
- A tourist uses the create call to start a company with the same account.

### Owner-only check \{#owner-check\}

The method `require_company_owner!` answers `403` with the code `provider_owner_required` when the role is not `owner`.

- The title is `Only an owner can do this.`
- The check reads `CurrentRequest.provider_membership.company_role`.
- The check order is fixed: the access word, then the owner role, then the approval.
  - A staff member of a pending company learns that the action is owner-only, and not that the company is pending.

These actions need an owner.

- The company update and `POST /providers/companies/submit`.
- The license record create and update.
- `POST /providers/documents`.
- `POST /providers/payments/merchant_accounts`.
- The seven endpoints of the next two sections.

These actions stay open to every member.

- `GET /providers/companies` and `GET /providers/documents`.
- Every endpoint of `providers/catalog`, `providers/bookings` and `providers/reviews`.
- The test `test/controllers/providers/staff_access_test.rb` fails when one of those controllers gets the check.

### Invitations of the owner \{#invitation-calls\}

Only an owner of an **approved** company can use these calls.

| Method | Path | Body | Answer |
| --- | --- | --- | --- |
| GET | `/providers/invitations` | None | `200` and `{ invitations }`, pending rows, newest first |
| POST | `/providers/invitations` | `email`, `company_role` | `201` and `{ invitation, invitation_link }` |
| POST | `/providers/invitations/:invitation_id/resend` | None | `200` and `{ invitation, invitation_link }` |
| POST | `/providers/invitations/:invitation_id/cancel` | None | `200` and `{ invitation }` |

- The API sends no email.
  - The create and send-again answers hold the link once, with `Cache-Control: private, no-store`.
- The raw token is 32 random bytes in URL-safe base64.
  - The link is `{web_base_url}/account/staff-invitation?token=…`.
- A send again makes a new token, so the old link stops working.
  - It also sets `sent_at`, `expires_at` and the sender.
- The invitation JSON holds these keys:
  - `uuid`, `email`, `company_role` and `status`
  - `sent_at`, `expires_at` and `is_expired`
  - `invited_by`, with a first name and a last name
- An unknown invitation, or an invitation of another company, answers `404`.

| Case | Answer | Title |
| --- | --- | --- |
| The email is empty or not an email. | `422` | Please enter a valid email address. |
| The role is not `owner` or `staff`. | `422` | Please choose a role. |
| A pending row exists for the company and the email, also an expired one. | `422` | This email already has an open invitation. Please use Send again. |
| The email belongs to an active member of the company. | `422` | This person is already a member of your company. |
| A send again or a cancel on a row that is not pending. | `422` | This invitation is not open any more. |

- The create does not check whether the email has an account or a membership elsewhere.
  - The answer would tell the owner whether a person has an account.
  - The accept action refuses it.
- An invitation stays valid when the owner who sent it leaves.

### Preview and accept \{#accept\}

These two calls do not use the gate, because the invited person has the access word `missing`.

| Method | Path | Session | Answer |
| --- | --- | --- | --- |
| GET | `/providers/invitation_previews?token=…` | Optional | `200` and the preview |
| POST | `/providers/invitation_acceptances` | Required | `201` and the session answer |

The preview holds four keys and nothing else: `company_name`, `company_role`, `email` and `accept_state`.

- The answer has `Cache-Control: private, no-store`.
- A token that is empty, unknown, expired, cancelled or accepted answers `404` with one title: `This invitation link no longer works. Please ask the owner for a new link.`

The first row of this table that matches gives the accept state.

| Viewer | `accept_state` |
| --- | --- |
| No session | `guest` |
| The company has `status: "suspended"` | `company_suspended` |
| The person has an active membership | `has_membership` |
| The email of the person differs from the invited email | `email_mismatch` |
| The email is not verified | `email_unverified` |
| None of the above | `ready` |

The service `Providers::Invitations::AcceptStateService` gives the word, and the accept validator uses the same service.

The manager `Providers::Invitations::AcceptManager` acts in one transaction.

1. It finds the row by the digest of the token, and it locks the row.
2. It checks that the row is pending and not expired.
3. It runs the validator.
4. It creates the membership with the role of the invitation.
5. It sets `status: "accepted"` and `accepted_at`.

| Case | Answer | Title |
| --- | --- | --- |
| The email differs. | `422` | This invitation is for another email address. Please sign in with the invited email. |
| The email is not verified. | `422` | Please verify your email before you accept this invitation. |
| The person has an active membership. | `422` | You already belong to a provider company. |
| The company is suspended. | `422` | This company cannot take new members now. |
| Two accepts for one person at the same moment. | `409` | You already belong to a provider company. |

- The unique index on active memberships stops the second accept, and the manager answers `409` with `skip_sentry: true`.
- The accept action sets no cookie, because the session does not change.
- A pending or rejected company accepts new members.
  - Only a suspended company refuses them.

### Members of the owner \{#member-calls\}

Only an owner of an **approved** company can use these calls.

| Method | Path | Body | Answer |
| --- | --- | --- | --- |
| GET | `/providers/memberships` | None | `200` and `{ memberships }`, active rows, oldest first |
| PATCH | `/providers/memberships/:membership_id` | `company_role` | `200` and `{ membership }` |
| POST | `/providers/memberships/:membership_id/remove` | None | `200` and `{ membership }` |

- The membership JSON holds `uuid`, `company_role`, `joined_at`, `is_current_person` and `person` with a first name, a last name and the email.
- A role change applies at once, on the next request.
- A removal sets `status: "removed"` and `removed_at`.
  - The row stays.
- A removal does not end the sessions of the person.
  - The access word turns `missing` on the next request.
- An unknown member, a member of another company and a removed member answer `404`.
- The managers lock the company row before they count the other active owners.
- The last active owner cannot leave and cannot become Staff.
  - The answer is `422` with the title `A company needs at least one owner. Please make another member an owner first.`
- An owner can leave or change the own role when another active owner exists.

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
- `company_role`, the role of the person who asks, `owner` or `staff`

The key `company_role` is in the owner JSON only, and the team JSON does not hold it.

- After sign-up, the create answer holds `company_role: "owner"`, because the request has no membership yet.

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
4. An owner-only action checks the role, and it answers with `provider_owner_required`.
5. An action that needs approval reads `providers_companies.status` and answers with an approval code.

- The access word comes from `Providers::Memberships::ProviderAccessService`, see [Person and provider access model](/docs/30-49-domains/iam/models/person-and-provider-access#states).
- The gate sets `CurrentRequest.provider_membership` and `CurrentRequest.provider_company`.
- The action `create` skips steps 2 and 3, because a new person has no membership yet.
- The preview and the accept action sit outside the gate.
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
