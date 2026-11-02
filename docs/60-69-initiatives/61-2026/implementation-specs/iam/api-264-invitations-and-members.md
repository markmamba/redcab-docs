---
title: "Add staff invitations, member management and the owner-only checks"
sidebar_label: API · Invitations and members
issue: "https://github.com/markmamba/red-cab-api/issues/264"
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
  - "docs/30-49-domains/32-iam/iam-decisions.md#company-roles"
  - "docs/30-49-domains/32-iam/iam-decisions.md#staff-invitations"
  - "docs/30-49-domains/32-iam/iam-decisions.md#provider-company"
  - "docs/30-49-domains/32-iam/iam-decisions.md#portal-access"
  - "docs/30-49-domains/32-iam/iam-decisions.md#current-session-answer"
  - "docs/30-49-domains/32-iam/iam-decisions.md#access-codes"
  - "docs/30-49-domains/32-iam/iam-decisions.md#member-on-records"
---

## TL;DR

- An owner of an approved company invites a person by email, and the owner sends the link by hand.
- The API sends no email, because launch does not need it.
- A signed-in person with a verified, matching email accepts the invitation and gets a membership.
- An owner lists members, changes a role and removes a member.
- The last owner cannot leave and cannot become Staff.
- Staff get `403` with `provider_owner_required` on every owner-only write.
- The company JSON gets the key `company_role`.
- This spec ships no member column on other tables, because the member columns spec owns that work.
- Breaking change: Yes.
  - The API and `red-cab-web` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| member | A person with a row in `providers_memberships` that has `status: "active"`. |
| owner, staff | The two values of `providers_memberships.company_role`. |
| invitation | A row in `providers_invitations`. It lets one email join one company. |
| invitation link | The web address `/account/staff-invitation?token=…`. It holds the raw token. |
| raw token | The secret in the link. The database stores only its digest. |
| accept state | One word that says what the viewer of an invitation can do. |
| access word | The value of `provider_access.state`: `missing`, `pending`, `active`, `rejected` or `suspended`. |

## User stories

1. US-1: As an owner, I want to invite staff, so other people can manage the listings.
2. US-2: As an invited person, I want to accept with my own account, so I need no new email.
3. US-3: As an owner, I want to send a link again or cancel it, so an old link stops working.
4. US-4: As an owner, I want to change a role or remove a member, so a leaver loses access.
5. US-5: As an owner, I want only owners to change the company, the payout account and the members.
6. US-6: As staff, I want to keep working on the catalog and bookings, so my daily work goes on.

## Problem

The API has memberships, but it has no way to add or manage a member.

- The table `providers_invitations` exists only in `docs/db/providers.dbml`.
- No endpoint creates, lists, sends again, cancels or accepts an invitation.
- No endpoint lists members, changes a role or removes a member.
- The code `provider_owner_required` does not exist, so every member can use every provider endpoint.
- The company JSON does not say what role the asking person has.
- An invited person has the access word `missing`, so `Providers::BaseController` refuses that person.
- A copied link does not prove that the person owns the inbox.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) | Owner and Staff, what Staff cannot do, the last owner |
| Rule | [Staff invitations](/docs/30-49-domains/iam/iam-decisions/#staff-invitations) | 7 days, a new send replaces the link, the email must match |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | The approval status applies to every member |
| Rule | [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer) | The answer holds no role |
| Rule | [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) | `provider_owner_required` |
| Rule | [Member on records](/docs/30-49-domains/iam/iam-decisions/#member-on-records) | An invitation keeps the owner who sent it |
| Requirement | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) | What an owner and a staff member see |
| Column truth | [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) | `providers_invitations` and `providers_memberships` |
| Depends on | [Company and memberships](api-260-provider-company-and-memberships.md), [Permits and approval](api-261-permits-and-approval.md) and [Portal access](api-263-portal-access.md) | This spec uses their names and gates |
| Paired work | [red-cab-web#193](https://github.com/markmamba/red-cab-web/issues/193) | Must deploy with this spec |
| Dependency | [red-cab-api#265](https://github.com/markmamba/red-cab-api/issues/265) | An email sign-up can verify and accept only when production sends mail |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The API sends no invitation email. The create and send-again responses return the invitation link once. | Send a mail now. | Launch needs no email. The principal developer chose a copy link. |
| 2 | The raw token is 32 random bytes, in URL-safe base64. The table stores its SHA-256 digest. | Store the raw token. | A database leak then gives no working link. |
| 3 | A send again makes a new token, and it sets `sent_at` and `expires_at`. The old link stops working. | Keep the token and extend the date. | The ruling says a new send replaces the old link. |
| 4 | A send again also sets `invited_by_membership_id` to the owner who sends now. | Keep the first sender. | The table keeps the member who did the latest action. |
| 5 | The accept needs `is_email_verified` true on the account. | Match the email only. | A copied link does not prove that the person owns the inbox, and a person can change the email on the account. |
| 6 | The public read returns an accept state for the viewer, and it holds no error code. | Return error codes from the accept action. | One read lets the page show the right message, and no new code joins the access codes. |
| 7 | A link that is unknown, expired, cancelled or accepted answers `404` with one title. | A different answer for each case. | The page then shows no company name for a dead link. |
| 8 | The public read shows the full invited email. | Mask the email. | The viewer must pick the right account and see a typo. |
| 9 | Only an approved company can create, list, send again or cancel an invitation, and only an approved company can list members, change a role or remove a member. | Allow a pending company. | The principal developer decided this for now, and the decision may change later. |
| 10 | The accept refuses a company with `status: "suspended"`, and it allows the other statuses. | Refuse every status but `approved`. | A new member could do nothing in a suspended company. With decision 9, only `approved` and `suspended` can occur today. |
| 11 | An invitation stays valid when the owner who sent it leaves. | Cancel it when the sender leaves. | The company invited the person, not the owner. |
| 12 | An owner can invite with the role `owner` or `staff`. | Invite staff only. | The DBML column allows both roles. |
| 13 | A second create for an email with a pending row answers `422`, also when the row is expired. The owner uses Send again. | Replace the row at create. | One path replaces a link, and the partial unique index is the last guard. |
| 14 | The create refuses an email that belongs to an active member of the same company. | Allow it. | The invitation could never be used. |
| 15 | The create does not check whether the email has an account or a membership elsewhere. | Check it. | The answer would tell the owner whether a person has an account. The accept action refuses it. |
| 16 | The role change and the removal lock the company row before they count owners. | Count with no lock. | Two owners who remove each other at the same moment could leave no owner. |
| 17 | A removal sets `status: "removed"` and `removed_at`. The row stays. | Delete the row. | Later records keep the member who did an action. |
| 18 | Removal does not end the sessions of the person. | End the sessions. | The person keeps the tourist portal. The access word turns `missing` on the next request. |
| 19 | The owner-only check is one method, `require_company_owner!`, in `Providers::BaseController`. | A check in each manager. | One rule in one place, as the access word has. |
| 20 | The check order is: the access word, then the owner role, then the approval. | Approval first. | A staff member then learns that the action is owner-only, not that the company is pending. |
| 21 | The company JSON gets `company_role` through a serializer context. | A new endpoint for the role. | Every page that needs the role already reads the company. |
| 22 | The member and invitation lists have no pagination. | Use `paginate_and_render`. | A company has few members. Paging can come later without a contract break for a client that ignores `meta`. |
| 23 | The accept response is the session answer. | Return the membership. | The web then has the new access word at once. |
| 24 | The public read and the accept action each have their own controller. | Put them in `Providers::BaseController`. | The invited person has the word `missing`, which that gate refuses. |
| 25 | The migration runs in one release with the code change. | The two-deploy rule of `db/AGENTS.md`. | No production system exists, as in `api-260`. |

## API contract

### The invitation JSON

```json
{
  "uuid": "...",
  "email": "mika@example.com",
  "company_role": "staff",
  "status": "pending",
  "sent_at": "2026-11-02T01:00:00.000Z",
  "expires_at": "2026-11-09T01:00:00.000Z",
  "is_expired": false,
  "invited_by": { "first_name": "Kenji", "last_name": "Sato" }
}
```

- `is_expired` is true when `status` is `pending` and `expires_at` has passed.
- The JSON never holds the token or its digest.

### The membership JSON

```json
{
  "uuid": "...",
  "company_role": "staff",
  "joined_at": "2026-11-02T03:00:00.000Z",
  "is_current_person": false,
  "person": { "first_name": "Mika", "last_name": "Tanaka", "email": "mika@example.com" }
}
```

- `joined_at` is `providers_memberships.created_at`.
- `is_current_person` is true on the row of the person who asks.

### Owner endpoints

The seven member endpoints use `Providers::BaseController`.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/invitations` | Owner | None | `200 { invitations }` | Pending rows only, newest first |
| POST | `/providers/invitations` | Owner | `email`, `company_role` | `201 { invitation, invitation_link }` | Returns the link once |
| POST | `/providers/invitations/:invitation_id/resend` | Owner | None | `200 { invitation, invitation_link }` | Needs a pending row |
| POST | `/providers/invitations/:invitation_id/cancel` | Owner | None | `200 { invitation }` | Needs a pending row |
| GET | `/providers/memberships` | Owner | None | `200 { memberships }` | Active rows, oldest first |
| PATCH | `/providers/memberships/:membership_id` | Owner | `company_role` | `200 { membership }` | The change applies at once |
| POST | `/providers/memberships/:membership_id/remove` | Owner | None | `200 { membership }` | Sets `status: "removed"` |

An unknown or foreign `:invitation_id` or `:membership_id` answers `404`.

- A foreign id belongs to another company.

### Public read and accept

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/invitation_previews` | Optional session | Query `token` | `200` preview | `404` for a dead link |
| POST | `/providers/invitation_acceptances` | Session | `token` | `201` session answer | Creates the membership |

The preview holds these keys and nothing else.

```json
{
  "company_name": "Kanto Charter",
  "company_role": "staff",
  "email": "mika@example.com",
  "accept_state": "ready"
}
```

The first row of this table that matches gives the accept state.

| Viewer | `accept_state` |
| --- | --- |
| No session | `guest` |
| The company has `status: "suspended"` | `company_suspended` |
| The person has an active membership | `has_membership` |
| The email of the person differs from the invited email | `email_mismatch` |
| `is_email_verified` is false | `email_unverified` |
| None of the above | `ready` |

- The response carries the header `Cache-Control: private, no-store`.
- A token that the request leaves out answers `404`.

The accept action refuses in these cases.

| Case | Status | `title` |
| --- | --- | --- |
| Unknown, expired, cancelled or accepted token | `404` | `This invitation link no longer works. Please ask the owner for a new link.` |
| The email differs | `422` | `This invitation is for another email address. Please sign in with the invited email.` |
| The email is not verified | `422` | `Please verify your email before you accept this invitation.` |
| The person has an active membership | `422` | `You already belong to a provider company.` |
| The company is suspended | `422` | `This company cannot take new members now.` |
| Two accepts at the same moment | `409` | `You already belong to a provider company.` |

### Create and role rules

| Case | Status | `title` |
| --- | --- | --- |
| The email is blank or not an email | `422` | `Please enter a valid email address.` |
| The role is not `owner` or `staff` | `422` | `Please choose a role.` |
| A pending row exists for this company and email | `422` | `This email already has an open invitation. Please use Send again.` |
| The email belongs to an active member of the company | `422` | `This person is already a member of your company.` |
| The change or removal leaves no active owner | `422` | `A company needs at least one owner. Please make another member an owner first.` |
| A send again or a cancel on a row that is not pending | `422` | `This invitation is not open any more.` |

### The owner-only checks

`Providers::BaseController#require_company_owner!` answers `403` with `provider_owner_required` when the role is not `owner`.

- The title is `Only an owner can do this.`
- The check reads `CurrentRequest.provider_membership.company_role`.

These actions need an owner.

| Endpoint | Controller action |
| --- | --- |
| `PATCH /providers/companies` | `update` |
| `POST /providers/companies/submit` | `submit` |
| `POST /providers/companies/license_records` | `create` |
| `PATCH /providers/companies/license_records/:license_record_id` | `update` |
| `POST /providers/documents` | `create` |
| `POST /providers/payments/merchant_accounts` | `create` |
| The seven member endpoints in [Owner endpoints](#owner-endpoints) | All |

These stay open to every member.

- `GET /providers/companies` and `GET /providers/documents`.
- Every endpoint of `providers/catalog`, `providers/bookings` and `providers/reviews`.

The check order for the seven member endpoints is fixed.

1. `load_provider_membership` and the access word, from `api-263`.
2. `require_company_owner!`.
3. `require_approved_provider_company!`.

The new code is a plain string at the raise.

No Ruby list holds the codes, see decision 15 of `api-147`.

- `PROVIDER_OWNER_REQUIRED = 'provider_owner_required'`

### The company JSON

`Providers::ProvidersCompanyDetailSerializer` gets one key, `company_role`.

- The value is `owner` or `staff`.
- The controller passes it through the serializer `context`.
- The team company JSON does not get this key.

### Accept flow

`Providers::Invitations::AcceptManager` acts in one transaction.

1. It finds the row by the digest of the token, and it locks the row.
2. It checks that the row is pending and not expired.
3. It runs the validator for the email, the verified flag, the membership and the company status.
4. It creates the membership with the role of the invitation.
5. It sets `status: "accepted"` and `accepted_at`.
6. It rescues `ActiveRecord::RecordNotUnique` from the membership insert, and it raises `Errors::ConflictError` with `skip_sentry: true`.

The controller then renders the session answer from `Identities::SessionAnswers::BuildService`.

- The accept action sets no cookie, because the session does not change.

### Remove and role change flow

The managers lock the company row first.

- `Providers::Memberships::ProvidersUpdateManager` and `Providers::Memberships::ProvidersRemoveManager` call `provider_company.lock!`.
- Then the validator counts the other active owners.
- The validator refuses when the change leaves none.

An owner can change or remove the own row when another active owner exists.

### Migration order

No production data exists, so this spec needs no backfill.

Developers run `bin/rails db:reset`.

1. Create `providers_invitations` from `docs/db/providers.dbml`, with its indexes.
2. Add the two CHECK constraints from the DBML.
3. Remove the I2 tags that this spec ships from `docs/db/providers.dbml` and `docs/db/redcab.dbml`.

```sql
-- docs/db/providers.dbml:38-39
CHECK (status <> 'accepted' OR accepted_at IS NOT NULL)
CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
```

### Files to create or modify (API)

Model and migration:

- `db/migrate/` (one new migration)
- `app/domains/providers/invitation.rb` (create)
- `app/domains/providers/company.rb` (add `has_many :invitations`)
- `app/domains/providers/membership.rb` (add `has_many :sent_invitations`)

Invitation domain:

- `app/domains/providers/invitations/token_service.rb` (create, makes the token and the digest)
- `app/domains/providers/invitations/link_builder.rb` (create, reads `red_cab[:web_base_url]` like `VerifyEmailUrlBuilder`)
- `app/domains/providers/invitations/providers_create_request.rb`, `..._validator.rb` and `..._manager.rb` (create)
- `app/domains/providers/invitations/providers_index_manager.rb` (create)
- `app/domains/providers/invitations/providers_resend_manager.rb` and `providers_cancel_manager.rb` (create, with their validators)
- `app/domains/providers/invitations/preview_request.rb`, `preview_manager.rb` (create)
- `app/domains/providers/invitations/accept_request.rb`, `accept_validator.rb` and `accept_manager.rb` (create)
- `app/domains/providers/providers_invitation_base_serializer.rb` (create)
- `app/domains/providers/invitation_preview_serializer.rb` (create)

Membership domain:

- `app/domains/providers/memberships/providers_index_manager.rb` (create)
- `app/domains/providers/memberships/providers_update_request.rb`, `..._validator.rb` and `..._manager.rb` (create)
- `app/domains/providers/memberships/providers_remove_manager.rb` and its validator (create)
- `app/domains/providers/providers_membership_base_serializer.rb` (create)

Controllers and routes:

- `app/controllers/providers/invitations_controller.rb` (create)
- `app/controllers/providers/memberships_controller.rb` (create)
- `app/controllers/providers/invitation_previews_controller.rb` (create, optional session)
- `app/controllers/providers/invitation_acceptances_controller.rb` (create, signed-in person, no provider gate)
- `app/controllers/providers/base_controller.rb` (add `require_company_owner!`)
- `app/controllers/providers/companies_controller.rb`, `documents_controller.rb`, `payments/merchant_accounts_controller.rb`
- The controller of the license record endpoints from `api-261`.
- `config/routes/providers_routes.rb`
- `app/domains/providers/providers_company_detail_serializer.rb`

Other:

- `lib/dev/test_accounts_seeder.rb` (add a staff account for the dev company)
- `docs/db/providers.dbml` and `docs/db/redcab.dbml`

### Code to remove

This spec removes no code.

- It adds checks and endpoints only.

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [api-260](api-260-provider-company-and-memberships.md) | Decision 7 ("Any member can update the company") and the out-of-scope line for the owner-only checks |
| [api-261](api-261-permits-and-approval.md) | The auth value "Member" in the owner endpoints table becomes "Owner" for `PATCH`, `submit`, license records and documents |
| [api-263](api-263-portal-access.md) | Decision 17, which waits for this spec |

This spec changes no Catalog code, so it replaces no part of [api-208](../cat/api-208-keyword-search.md) or [api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md).

### Tests that must change

| Test files | Change |
| --- | --- |
| `test/controllers/providers/base_controller_test.rb` | Assert `require_company_owner!` and the check order |
| `test/controllers/providers/companies_controller_test.rb` | Staff get `provider_owner_required` on `update` and `submit`, and staff can read |
| `test/controllers/providers/documents_controller_test.rb` | Staff get the code on `create`, and staff can list |
| `test/controllers/providers/payments/merchant_accounts_controller_test.rb` | Staff get the code on `create` |
| The test files of the license record endpoints | Staff get the code on `create` and `update` |
| `test/integration/auth_contract/providers_namespace_portal_gate_test.rb` | Add the rows for the seven owner endpoints |
| `test/integration/auth_contract/` (`AuthContractRows`) | Add the two public endpoints |
| `test/support/` and `test/test_helper.rb` | Add helpers that build a staff membership and an invitation |
| `test/controllers/providers/` tests for catalog, bookings and reviews | Add one case: staff can use the endpoint |

New tests cover these behaviors.

- The database stores a digest, and the JSON holds no token.
- A create returns a link that the preview accepts.
- A send again makes the old link answer `404`.
- An expired link answers `404` on the preview and on the accept action.
- A cancelled and an accepted link answer `404`.
- The preview gives each accept state, in the table order.
- The accept refuses another email, an unverified email, a membership and a suspended company.
- The accept creates one membership, and a second accept at the same moment answers `409`.
- The accept returns the session answer with the word `active`.
- An invitation stays valid after the sender is removed.
- A second create for the same email answers `422`, also when the row is expired.
- A create for an active member of the company answers `422`.
- A pending or rejected company gets its approval code on all seven member endpoints.
- A suspended company gets `provider_account_suspended` on all seven member endpoints.
- A staff member gets `provider_owner_required` before the approval code.
- A role change and a removal apply on the next request.
- The last owner cannot leave and cannot become Staff, also for two owners at the same moment.
- An owner can leave when another owner exists.
- A removed row stays, and the person can accept a new invitation.
- A removed member gets the word `missing` and keeps the tourist portal.
- `company_role` is in the company JSON for the owner and for staff.
- One company never sees the members or the invitations of another company.

## Data / domain touchpoints

- Bounded context: IAM, with the data in Providers.
- Transaction boundaries:
  - The accept creates the membership and updates the invitation in one transaction.
  - A role change or a removal locks the company row in one transaction.
- Snapshots: none.
- Events: none, because no email goes out.

## Worked example

Kenji runs Kanto Charter and adds Mika as staff.

1. The team approved Kanto Charter, so Kenji has the word `active` and the role `owner`.
2. Kenji sends `POST /providers/invitations` with `mika@example.com` and `staff`.
3. The API stores the digest, and it answers `201` with the invitation and the link.
4. Kenji copies the link and sends it to Mika in a chat.
5. Mika opens the link, and `GET /providers/invitation_previews` answers `accept_state` `guest`.
6. Mika signs in with `mika@example.com`, which is verified, and opens the link again.
7. The preview answers `ready`, and Mika sends `POST /providers/invitation_acceptances`.
8. The API creates a staff membership and answers the session answer with `active`.
9. Mika sends `PATCH /providers/companies`, and the API answers `403` with `provider_owner_required`.
10. Mika adds a package to a Kanto Charter tour, and the API accepts it.
11. Kenji sends `POST /providers/memberships/:membership_id/remove` for Mika.
12. Mika's next provider request gets `403` with `provider_membership_required`, and the tourist portal still works.

## Out of scope

- The invitation email, and any other email.
- The production mail settings, which [red-cab-api#265](https://github.com/markmamba/red-cab-api/issues/265) covers.
- Invitations from a pending or rejected company.
- A Leave action for staff.
- The member columns on listings, bookings and reviews.
- The payout account endpoints other than the create action, because none exist.
- The team admin audit of members.
- A rate limit on the public read, because the token holds 256 bits of randomness.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- Only an approved company can invite for now, and the owner may change this.
- A staff member whose owners all left cannot leave, and the team fixes this by hand.
- The login rate limit must see the real visitor address before launch.
- Insurance validity has no effect for now.

## Tasks

### API

- [ ] Add the migration and the model, and update the DBML tags.
- [ ] Add the token service and the link builder.
- [ ] Add the invitation managers, validators, requests and serializers.
- [ ] Add the membership managers, validators and serializer.
- [ ] Add the four controllers and the routes.
- [ ] Add `require_company_owner!` and the new code.
- [ ] Apply the owner check to the six existing owner actions.
- [ ] Add `company_role` to the company JSON.
- [ ] Update the dev seeder and the test helpers.
- [ ] Update the tests.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The database stores only the digest of the token.
- [ ] A send again stops the old link.
- [ ] A link works for 7 days from `sent_at`.
- [ ] The accept refuses another email, an unverified email, an active membership and a suspended company.
- [ ] Only an approved company can invite, list members, change a role or remove a member.
- [ ] Staff get `403` with `provider_owner_required` on the six existing owner actions and the seven member endpoints.
- [ ] Staff can use every catalog, booking and review endpoint.
- [ ] A role change and a removal apply on the next request.
- [ ] The last owner cannot leave and cannot become Staff.
- [ ] A removed row stays, and the person can come back with a new invitation.
- [ ] The company JSON holds `company_role` for the asking person.
- [ ] The session answer still holds two keys and no role.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:reset
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n -E 'token_digest' -- app lib
git grep -n 'require_company_owner!' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
