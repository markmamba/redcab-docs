---
title: "Make the account a person with no role, and add the provider access word"
sidebar_label: API · Portal access
issue: "https://github.com/markmamba/red-cab-api/issues/263"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-261-permits-and-approval.md"
related:
  - "docs/30-49-domains/39-iam/iam-decisions.md#person-account"
  - "docs/30-49-domains/39-iam/iam-decisions.md#tourist-profile"
  - "docs/30-49-domains/39-iam/iam-decisions.md#portal-access"
  - "docs/30-49-domains/39-iam/iam-decisions.md#current-session-answer"
  - "docs/30-49-domains/39-iam/iam-decisions.md#access-codes"
  - "docs/30-49-domains/39-iam/iam-decisions.md#own-company-booking"
  - "docs/30-49-domains/39-iam/iam-decisions.md#no-corporate-accounts"
---

## TL;DR

- The account loses its `role`, so one person can be a tourist and a provider.
- Every sign-in and every read of the current session returns `{ person, provider_access }`.
- The access word comes from the active membership and the status of the company.
- Provider sign-up creates the person, a pending company and an owner membership.
- A signed-in person without a membership can create a company.
- The Google flow knows the login page, and it creates a company or a tourist profile by that page.
- The first booking creates the tourist profile when it is missing.
- A member cannot book a listing of the own company.
- The Corporate code and the table `corporate_profiles` go away.
- Breaking change: Yes.
  - The API and `red-cab-web` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| person | One `Identities::Account`. It has no role. |
| access word | The value of `provider_access.state`: `missing`, `pending`, `active`, `rejected` or `suspended`. |
| session answer | The response `{ person, provider_access }`. |
| login page | The page where the person signed in: the tourist login or the provider login. |
| active membership | A row in `providers_memberships` with `status: "active"`. |

## User stories

1. US-1: As a person, I want to be a tourist and a provider, so I use one email.
2. US-2: As a guest, I want to sign up on the provider login, so I start my company at once.
3. US-3: As a tourist, I want to start a company with my account, so I need no second email.
4. US-4: As a provider, I want to book a tour, so I use my account as a tourist.
5. US-5: As a member, I must not book my own company, so false bookings stay out of the counts.

## Problem

The code still gives each account one role.

- The column `identities_accounts.role` decides the portal.
- Provider sign-up creates only the person, and `POST /providers/companies` creates the company.
- The Google callback always creates a tourist account, and the API cannot tell the login page.
- The tourist gate refuses a person who has no tourist profile.
- The provider gate reads the role, and four access codes name roles and profiles.
- The session answer holds `role` and `should_prompt_language`, and no access word.
- A member can book a listing of the own company.
- 13 API files, the table `corporate_profiles` and a test portal route hold Corporate code.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Person account](/docs/30-49-domains/iam/iam-decisions/#person-account) | No role, one Google link, a locked person uses no portal |
| Rule | [Tourist profile](/docs/30-49-domains/iam/iam-decisions/#tourist-profile) | Zero or one, created by tourist sign-up and the first booking |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | Provider sign-up and a tourist who starts a company |
| Rule | [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access) | Any signed-in person uses the tourist portal |
| Rule | [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer) | Two keys, five words |
| Rule | [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) | The codes that Rails answers with |
| Rule | [Booking a listing of the own company](/docs/30-49-domains/iam/iam-decisions/#own-company-booking) | Checkout refuses it |
| Rule | [No corporate accounts](/docs/30-49-domains/iam/iam-decisions/#no-corporate-accounts) | The Corporate code goes |
| Requirement | [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals) | What the person sees |
| Column truth | [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) | The account without a role |
| Depends on | [Company and memberships](api-260-provider-company-and-memberships.md) and [Permits and approval](api-261-permits-and-approval.md) | This spec uses their names |
| Paired work | [red-cab-web#192](https://github.com/markmamba/red-cab-web/issues/192) | Must deploy with this spec |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The session answer is `{ person, provider_access }`, and every endpoint that returns a person returns it. | A flat account for some endpoints. | The web then has one shape to read. |
| 2 | The Google callback returns the answer, not `{ account }`. | Keep the wrapper. | Sign-in returns the same answer. |
| 3 | Sign-up responses return the same answer. | Return a flat account. | One serializer serves every endpoint. |
| 4 | `Providers::Memberships::ProviderAccessService` gives the access word, and Identities calls it. | Query memberships in Identities. | The ruling asks Identities to ask Providers through one small service. |
| 5 | A service builds the answer, and the serializer reads it. | Query in the serializer. | A serializer never queries the database. |
| 6 | The access word reads one membership and one company with a join. | Cache the word. | The index `index_providers_memberships_on_account_and_status` exists for this read. |
| 7 | Both gates read the access word through the same service. | Each gate queries on its own. | One rule in one place. |
| 8 | A suspended company is refused on every provider endpoint, except the company read. | Refuse only approval-gated actions. | The holding page needs the suspension reason. |
| 9 | A pending or rejected company keeps today's approval gate on listings, payouts and reviews. | New gates for every endpoint. | The web decides the pages, and the gate is a second guard. |
| 10 | The Google flow stores the login page with the OAuth state. | Send it in the callback. | The browser cannot change it between the two calls. |
| 11 | An existing person who signs in with Google gets no company and no tourist profile. | Create one by login page. | The ruling creates them for a new person only. |
| 12 | `POST /providers/companies` takes any signed-in person without an active membership. | Keep the role check. | A tourist starts a company with the same account. |
| 13 | One service creates a company, and three callers use it: provider sign-up, the Google flow and the create endpoint. | Copy the code. | The three callers must create the same rows. |
| 14 | A tourist read for a person without a tourist profile gives an empty list or `404`. | A `403` with a code. | The tourist portal is open to everyone, so a missing profile is not a refusal. |
| 15 | The first booking creates the tourist profile in the checkout transaction. | Create it at the first page view. | The ruling says the first booking. |
| 16 | A race on the tourist profile index reloads the profile. | Answer `409`. | The loser needs no error. |
| 17 | `provider_owner_required` waits for the invitations spec. | Add it now. | No staff exist yet, so every member is an owner. |
| 18 | The migration drops `corporate_profiles` and `identities_accounts.role` in this spec. | Drop them later. | The rulings remove both, and no production data exists. |
| 19 | The migrations run in one release with the code change. | The two-deploy rule of `db/AGENTS.md`. | No production system exists, as in `api-260`. |

## API contract

### The session answer

```json
{
  "person": {
    "uuid": "...",
    "first_name": "Aiko",
    "last_name": "Tanaka",
    "email": "aiko@example.com",
    "language_preference": "en",
    "is_email_verified": true
  },
  "provider_access": { "state": "missing" }
}
```

- `language_preference` is `null` until the person saves a choice.
- The answer holds no role, no company data and no ids of other records.
- The answer no longer holds `should_prompt_language`.

### The access word

| Condition | Word |
| --- | --- |
| No active membership. This also covers a removed member and an invited person who has not accepted. | `missing` |
| Active membership, company `status: "pending"` | `pending` |
| Active membership, company `status: "approved"` | `active` |
| Active membership, company `status: "rejected"` | `rejected` |
| Active membership, company `status: "suspended"` | `suspended` |

### Endpoints

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `identities/sessions` | None | `email`, `password` | `201` answer | Sets the cookies |
| GET | `identities/oauth/google` | None | Query `portal` | `200 { authorization_url }` | New param |
| POST | `identities/oauth/google/callback` | None | `code`, `state` | `200` answer | Sets the cookies |
| GET | `identities/accounts/current` | Session | None | `200` answer | |
| PATCH | `identities/accounts/current` | Session | As today | `200` answer | |
| POST | `tourists/identities/accounts` | None | As today | `201` answer | Creates the person and a tourist profile |
| POST | `providers/identities/accounts` | None | As today | `201` answer | Creates the person, a pending company and an owner membership |
| POST | `providers/companies` | Session | `business_name`, `contact_phone`, both optional | `201` company JSON | Needs no active membership |

These endpoints go away.

- `POST corporate/identities/accounts`
- The test route `GET /corporate_portal_test`

The query `portal` takes `tourist` or `provider`, and it defaults to `tourist`.

- Any other value answers `422`.

### Google sign-in

The state store keeps the value `portal` with each state.

- `Identities::Oauth::StateStore.store` takes `state:` and `portal:`.
- `consume` returns the portal, or `nil` when the state is unknown.
- The state still lives for 10 minutes and works once.

The callback manager acts by the case.

| Case | Result |
| --- | --- |
| The Google link exists | Sign in the linked person. Create nothing. |
| The email has an account, and Google says it is verified | Link Google and sign in. Create nothing. |
| A new person, portal `tourist` | Create the person, the Google link and a tourist profile. |
| A new person, portal `provider` | Create the person, the Google link, a pending company and an owner membership. |

- The ruling keeps the rule that Google links an existing person only when the email is verified.
- Provider sign-up from Google creates no tourist profile.

### The gates

`Tourists::BaseController` loses `require_tourist_profile!`.

- It sets `CurrentRequest.tourist_profile`, and the value can be `nil`.
- A person who is signed in may use the tourist namespace.

`Providers::BaseController` reads the access word.

| Word | Result |
| --- | --- |
| `missing` | `403` with `provider_membership_required` |
| `pending` | The request passes. An approval-gated action answers `403` with `provider_approval_pending`. |
| `rejected` | The request passes. An approval-gated action answers `403` with `provider_application_rejected`. |
| `active` | The request passes. |
| `suspended` | `403` with `provider_account_suspended`. The company read passes. |

The create action `POST /providers/companies` skips the membership check, and it refuses a person who already has one.

The new `PortalGateCodes` hold these values.

- `provider_membership_required`
- `provider_approval_pending`
- `provider_application_rejected`
- `provider_account_suspended`
- `csrf_token_missing` and `csrf_token_invalid` from `api-147`

These codes go away.

- `tourist_profile_required`
- `corporate_profile_required`
- `provider_role_required`
- `provider_profile_required`

### Tourist reads

| Endpoint | A person with no tourist profile gets |
| --- | --- |
| `GET tourists/bookings/orders` | `200` with an empty list |
| `GET tourists/bookings/orders/:id` | `404` |
| `GET tourists/bookings/checkout_sessions/:id` | `404` |
| `POST tourists/bookings/checkout_sessions` | The system creates the profile, then it continues |
| `POST tourists/bookings/checkout_sessions/:id/payment_attempts` | `404` |
| `POST tourists/bookings/orders/:id/reviews` | `404` |

### Own-company booking

`Bookings::CheckoutSessions::TouristsCreateManager` asks `Providers::Memberships::ActiveCompanyIdService` for the company id of the person.

- The validator refuses a listing whose `provider_id` equals that id.
- The answer is `422` with the title `There was an error when starting checkout`.
- The message on `listing_id` is `You cannot book a listing of your own company. Please choose another listing.`

### Migration order

No production data exists, so this spec needs no backfill.

Developers run `bin/rails db:reset`.

1. Drop the table `corporate_profiles`, with its foreign key and indexes.
2. Remove `identities_accounts.role`, `index_identities_accounts_on_role` and `index_identities_accounts_on_status_and_role`.
3. Update the table comment of `tourists_profiles`, which names `FR-IAM-001`.

### Files to create or modify (API)

Services and models:

- `app/domains/providers/memberships/provider_access_service.rb` (create)
- `app/domains/providers/memberships/active_company_id_service.rb` (create)
- `app/domains/providers/companies/create_service.rb` (create)
- `app/domains/tourists/profiles/find_or_create_service.rb` (create)
- `app/domains/identities/session_answers/build_service.rb` (create)
- `app/domains/identities/session_answer.rb` (create, a plain data object)
- `app/domains/identities/session_answer_serializer.rb` (create)
- `app/domains/identities/person_embedded_serializer.rb` (create)
- `app/domains/identities/account.rb` (remove `role`, `corporate_profile` and the old `provider_profile`)
- `app/domains/identities/oauth/state_store.rb`
- `app/domains/identities/oauth/google/` (the show request, validator and manager, and the callback manager)

Controllers and routes:

- `app/controllers/identities/sessions_controller.rb`
- `app/controllers/identities/accounts_controller.rb`
- `app/controllers/identities/oauth/google_controller.rb`
- `app/controllers/tourists/base_controller.rb`
- `app/controllers/providers/base_controller.rb`
- `app/controllers/tourists/identities/accounts_controller.rb`
- `app/controllers/providers/identities/accounts_controller.rb`
- The four tourist booking controllers, for the nilable profile.
- `config/routes.rb`, `config/routes/test_portal_routes.rb`

Sign-up and bookings:

- `app/domains/tourists/identities/accounts/create_manager.rb`
- `app/domains/providers/identities/accounts/create_manager.rb`
- `app/domains/providers/companies/providers_create_manager.rb` and its validator
- `app/domains/bookings/checkout_sessions/tourists_create_manager.rb` and its validator
- The tourist index and show managers for orders and checkout sessions.

Other:

- `app/shared/errors/portal_gate_codes.rb`
- `app/models/current_request.rb` (remove `corporate_profile`, add nothing)
- `lib/dev/test_accounts_seeder.rb`
- `docs/db/identities.dbml` and `docs/db/redcab.dbml` (remove the tags that this spec ships)

### Code to remove

| Code | Reason |
| --- | --- |
| `Corporate::Profile`, `Corporate::BaseController` and `Corporate::Identities::Accounts::*` | No corporate accounts |
| `config/routes/corporate_routes.rb` and the line in `config/routes.rb` | Same |
| `GET /corporate_portal_test` in `config/routes/test_portal_routes.rb` | Same |
| `Identities::Account` enum `role` | One account is one person |
| `role:` in the three sign-up managers and the OAuth manager | Same |
| `authorize_provider_portal_role!` in `Providers::BaseController` | The word replaces it |
| `Identities::UsersAccountBaseSerializer` and `should_prompt_language` | The session answer replaces them |
| `Identities::Oauth::CallbackResponse` and its serializer | The answer replaces the wrapper |
| The four codes named above | They name roles and profiles |

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [api-145](auth-platform/api-145-portal-gate-forbidden.md) | The portal gate codes and the tourist, corporate and provider gates |
| [api-146](auth-platform/api-146-auth-contract-tests.md) | The rows for `corporate/**`, the role gate and the account shape |
| [pr-05](iam-audit-2026-08/pr-05-actor-base-controllers.md) | The corporate base controller and the profile presence gate |
| [pr-07](iam-audit-2026-08/pr-07-oauth-account-provisioning.md) | The hardcoded role `tourist` in the OAuth manager |

This spec changes no Catalog code, so it replaces no part of [api-208](../cat/api-208-keyword-search.md) or [api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md).

### Tests that must change

| Test files | Change |
| --- | --- |
| `test/integration/auth_contract/corporate_namespace_portal_gate_test.rb` | Delete, and delete its row in `AuthContractRows` |
| `test/integration/auth_contract/tourists_namespace_portal_gate_test.rb` | Assert that a person with no profile passes |
| `test/integration/auth_contract/providers_namespace_portal_gate_test.rb` | Assert the access words and the new codes |
| `test/integration/auth_contract/providers_approval_gated_portal_gate_test.rb` | Use the new codes |
| `test/integration/auth_contract/providers_profiles_create_role_gate_test.rb` | Assert that any person without a membership can create |
| `test/integration/auth_contract/actor_identities_accounts_create_test.rb` | Remove the corporate case, and assert the answer |
| `test/integration/auth_contract/identities_accounts_current_show_test.rb` and `..._update_test.rb` | Assert the answer |
| `test/integration/auth_contract/identities_sessions_create_test.rb` | Assert the answer |
| `test/integration/auth_contract/identities_oauth_google_*_test.rb` | Assert the portal param and the new person cases |
| `test/controllers/` and `test/domains/` for tourists, providers and corporate | Remove `role:` from every account setup |
| `test/support/` and `test/test_helper.rb` | Add helpers that build a person, a tourist profile and a company |

About 77 test files set `role:` on an account, and each one drops it.

New tests cover these behaviors.

- The access word for each case in the table, including a removed member.
- A person with a company and no tourist profile can open the tourist portal.
- A suspended company is refused everywhere except the company read.
- Provider sign-up creates a pending company and an owner membership, and no tourist profile.
- Tourist sign-up creates a tourist profile, and no company.
- A signed-in tourist can create a company, and a second create answers `422`.
- Google from the provider login creates a company for a new person and nothing for an existing person.
- Google from the tourist login creates a tourist profile for a new person.
- An unknown or used OAuth state answers `422`.
- The first booking creates one tourist profile, also under two requests at the same moment.
- Checkout refuses a listing of the own company, and a removed member can book it.
- A locked person gets `401` and keeps the memberships.

## Data / domain touchpoints

- Bounded context: IAM, with reads from Providers and Tourists.
- Transaction boundaries:
  - Provider sign-up creates the person, the company and the owner membership in one transaction.
  - Checkout creates the tourist profile in the same transaction as the checkout session.
- Snapshots: none.
- Events: `AccountRegistered` follows each sign-up, after the commit.

## Worked example

Aiko is a tourist who starts a business.

1. Aiko signs up on the tourist login with Google.
2. The system creates her, the Google link and a tourist profile.
3. The answer says `provider_access` is `missing`.
4. Aiko books a tour in Kyoto, and the system uses her existing tourist profile.
5. Aiko picks "List your service", and she sends `POST /providers/companies`.
6. The system creates a pending company and her owner membership, with no new login.
7. The next answer says `provider_access` is `pending`.
8. The team approves the company, and the answer says `active`.
9. Aiko tries to book a Kanto Charter tour, which is her own company, and checkout answers `422`.
10. Aiko signs in on the tourist login, and the same answer lets her open both portals.

## Out of scope

- Invitations, member screens and the owner-only checks.
- The member columns on other tables.
- The portal switch and the entry rules, which the web issue covers.
- The team admin login.
- The language rules, and the language prompt in the web.
- The available package scope.

## Open items

- Product Owner sign-off on the IAM rulings, including dropping corporate clients, is not recorded.

## Tasks

### API

- [ ] Add the two migrations, and update the DBML tags.
- [ ] Add the services, the answer and its serializers.
- [ ] Update both gates, the codes and `CurrentRequest`.
- [ ] Update the sign-up flows and the create-company endpoint.
- [ ] Update the Google flow and the state store.
- [ ] Add the first booking profile and the own-company refusal.
- [ ] Remove the code in [Code to remove](#code-to-remove).
- [ ] Update the dev seeders and the tests.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] No file in `app/` names `role_provider`, `role_tourist`, `roles[` or `Corporate::`.
- [ ] Every endpoint that returns a person returns `{ person, provider_access }` and nothing else.
- [ ] A removed member and an invited person who has not accepted both get the word `missing`.
- [ ] A person with no tourist profile can open the tourist portal.
- [ ] A new person from the provider login gets a pending company and an owner membership, and no tourist profile.
- [ ] A signed-in tourist can create a company with the same account.
- [ ] The first booking creates the tourist profile once.
- [ ] Checkout refuses a listing of the own company.
- [ ] A suspended company gets `provider_account_suspended` on every provider endpoint but the company read.
- [ ] A locked person can use no portal, and the memberships stay.
- [ ] The database has no column `identities_accounts.role` and no table `corporate_profiles`.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:reset
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n -E 'role_provider|role_tourist|roles\[|Corporate::|corporate_profile|should_prompt_language' -- app lib config
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
