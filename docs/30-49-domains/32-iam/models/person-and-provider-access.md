---
title: Person and provider access model
sidebar_label: Person and provider access
sidebar_position: 2
description: The person account with no role, the session answer, the provider access word, the two portal gates, sign-up, Google sign-in, the first booking and the own-company rule.
doc_type: model-spec
normative: true
status: current
context: iam
last_reviewed: 2026-11-07
---

## TL;DR \{#person-access-tldr\}

- An account is one person, and it has no role.
- Every call that returns a person returns the session answer `{ person, provider_access }`.
- One service computes the access word from the active membership and the status of its company.
- The tourist gate needs only a session, and the provider gate reads the access word.
- A person may have no tourist profile, and the first booking creates it.
- Provider sign-up and a new Google person on the provider login create a pending company and an owner membership.
- A member cannot book a listing of the own company.

## About this document

This is the model page for the person, the session answer and the portal gates in `red-cab-api`.

The rulings give the reasons, and this page holds what stays true after they shipped.

| Topic | Document |
| --- | --- |
| Rulings | [Person account](/docs/30-49-domains/iam/iam-decisions/#person-account), [Tourist profile](/docs/30-49-domains/iam/iam-decisions/#tourist-profile), [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access), [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer), [Booking a listing of the own company](/docs/30-49-domains/iam/iam-decisions/#own-company-booking), [No corporate accounts](/docs/30-49-domains/iam/iam-decisions/#no-corporate-accounts) and [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) |
| What the person does and sees | [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals) |
| The web side | [Portal access and switch](/docs/30-49-domains/iam/use-cases/portal-access-and-switch) |
| The company and its members | [Provider company and members model](/docs/30-49-domains/iam/models/provider-company-and-members) |
| Sessions and cookies | [Sessions](/docs/30-49-domains/iam/use-cases/sessions) |
| Column truth | [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) and [tourists.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/tourists.dbml) |
| Work record | [API spec api-263](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-263-portal-access) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| the model `Identities::Account` | One person. A row in `identities_accounts`. |
| session answer | The response `{ person, provider_access }` of every call that returns a person. |
| access word | The value of `provider_access.state`. It says what a person may do in the provider portal. |
| active membership | A row in `providers_memberships` with `status: "active"`. |
| login page | The page where the person signed in: the tourist login or the provider login. |
| the service `Providers::Memberships::ProviderAccessService` | Gives the access word of one person. |
| the service `Providers::Memberships::ActiveCompanyIdService` | Gives the id of the active company of one person, or `nil`. |
| the service `Providers::Companies::CreateService` | Creates a pending `Providers::Company` and an owner `Providers::Membership`. |
| the service `Tourists::Profiles::FindOrCreateService` | Gives the `Tourists::Profile` of a person, and creates it when it is missing. |

## Structure \{#structure\}

The account holds login data only, and other tables hold what a person does.

```ruby
# app/domains/identities/account.rb
has_one(:tourist_profile, class_name: 'Tourists::Profile', foreign_key: :identities_account_id)
has_one(:provider_membership, -> { where(status: Providers::Membership.statuses[:active]) }, class_name: 'Providers::Membership')
has_one(:provider_company, through: :provider_membership, source: :provider_company)
```

### Columns of `identities_accounts` \{#account-columns\}

- `uuid` and `email`, which are both unique.
- `password_digest`, which is `null` for a person who signs in only with Google.
- `first_name` and `last_name`.
- `language_preference`, which is `en`, `ja` or `null`.
- `status`, which is `active`, `locked` or `archived`.
- `is_email_verified` and `email_verified_at`.
- `failed_login_count`, `locked_until` and `last_login_at`.

The table has no column `role`, and no table `corporate_profiles` exists.

### Related tables \{#related-tables\}

| Table | Link to the person | Guard |
| --- | --- | --- |
| `tourists_profiles` | `tourists_profiles.identities_account_id` | A unique index, so a person has zero or one profile. |
| `providers_memberships` | `providers_memberships.identities_account_id` | A partial unique index on `status: "active"`, so a person has at most one active membership. |

## States \{#states\}

The access word comes from one read of the active membership and its company.

| Condition | Access word |
| --- | --- |
| No active membership. This includes a removed member and an invited person who has not accepted. | `missing` |
| Active membership, and `providers_companies.status` is `pending` | `pending` |
| Active membership, and `providers_companies.status` is `approved` | `active` |
| Active membership, and `providers_companies.status` is `rejected` | `rejected` |
| Active membership, and `providers_companies.status` is `suspended` | `suspended` |

- The service `Providers::Memberships::ProviderAccessService` gives the word, and Identities calls it.
- The word is not stored, and every answer computes it again.
- What each word opens in the web is in [Portal access and switch](/docs/30-49-domains/iam/use-cases/portal-access-and-switch#entry-rules).

## Contract \{#contract\}

### The session answer \{#session-answer\}

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
- A serializer builds it from `Identities::SessionAnswer`, and the serializer never queries the database.
- The service `Identities::SessionAnswers::BuildService` builds the object.

### Endpoints \{#endpoints\}

| Method | Path | Auth | Answer | Notes |
| --- | --- | --- | --- | --- |
| POST | `identities/sessions` | None | `201` session answer | Sets the cookies |
| GET | `identities/accounts/current` | Session | `200` session answer | |
| PATCH | `identities/accounts/current` | Session | `200` session answer | |
| POST | `identities/email_verifications/confirm` | None | `200` session answer | |
| POST | `tourists/identities/accounts` | None | `201` session answer | Creates the person and a tourist profile |
| POST | `providers/identities/accounts` | None | `201` session answer | Creates the person, a pending company and an owner membership |
| POST | `providers/companies` | Session | `201` company JSON | Needs no active membership. Both body keys are optional |
| GET | `identities/oauth/google` | None | `200 { authorization_url, state }` | The query `portal` is `tourist` or `provider`. The default is `tourist`. Another value answers `422` |
| GET or POST | `identities/oauth/google/callback` | None | `200` session answer | Sets the cookies |

- The two sign-up calls set no cookie.
- `POST providers/companies` answers `422` for a person who has an active membership.
- A race on the unique index of active memberships answers `409`.

### Sign-up \{#sign-up\}

| Call | Creates | Does not create |
| --- | --- | --- |
| `POST tourists/identities/accounts` | The person, the verification token and a tourist profile | A company |
| `POST providers/identities/accounts` | The person, the verification token, a pending company and an owner membership | A tourist profile |

- Each call runs in one transaction.
- The event `AccountRegistered` follows after the commit.
- The service `Providers::Companies::CreateService` creates the company in three places: provider sign-up, the Google flow and `POST providers/companies`.
- The caller of the service owns the transaction.

### Google sign-in \{#google\}

The OAuth state keeps the portal of the login page.

- `Identities::Oauth::StateStore.store` takes `state:` and `portal:`.
- `consume` returns the portal, or `nil` when the state is unknown.
- The state lives for 10 minutes and works once.
- The browser cannot change the portal between the two calls.

| Case | Result |
| --- | --- |
| The Google link exists | The system signs in the linked person and creates nothing. |
| The email has an account, and Google says it is verified | The system links Google, signs in and creates nothing. |
| A new person, and the portal is `tourist` | The system creates the person, the Google link and a tourist profile. |
| A new person, and the portal is `provider` | The system creates the person, the Google link, a pending company and an owner membership. |

- An existing person gets no company and no tourist profile from Google.
- Google links an existing person only when the email is verified.
- A person has at most one Google link.
- A new person from the provider login gets no tourist profile.

### The gates \{#gates\}

`Tourists::BaseController` needs only a session.

- It sets `CurrentRequest.tourist_profile`, and the value can be `nil`.
- Any signed-in person may use the tourist namespace.

`Providers::BaseController` reads the access word, and it answers in this order.

1. A person who is not signed in gets `401`.
2. The word `missing` gets `403` with `provider_membership_required`.
3. The word `suspended` gets `403` with `provider_account_suspended`.
4. An action that needs approval answers `403` with `provider_approval_pending` for `pending`, or `provider_application_rejected` for `rejected`.

- The action `create` of `Providers::CompaniesController` skips steps 2 and 3.
- The company read skips step 3, so a suspended member can read the reason.
- The gate sets `CurrentRequest.provider_membership` and `CurrentRequest.provider_company`.
- The gate reads the access word once for each request.

### Tourist reads without a tourist profile \{#tourist-reads\}

| Endpoint | A person with no tourist profile gets |
| --- | --- |
| `GET tourists/bookings/orders` | `200` with an empty list |
| `GET tourists/bookings/orders/:booking_id` | `404` |
| `GET tourists/bookings/checkout_sessions/:checkout_session_id` | `404` |
| `POST tourists/bookings/checkout_sessions` | The system creates the profile, then it continues |
| `POST tourists/bookings/checkout_sessions/:checkout_session_id/payment_attempts` | `404` |
| `POST tourists/bookings/orders/:booking_id/reviews` | `404` |

### The first booking \{#first-booking\}

`Bookings::CheckoutSessions::TouristsCreateManager` takes `identities_account:`, not a tourist profile.

- It validates first, so a rejected request creates no profile.
- Inside the checkout transaction, it calls `Tourists::Profiles::FindOrCreateService`.
- The service inserts with `ON CONFLICT DO NOTHING` on the unique index of `tourists_profiles.identities_account_id`.
- Then the service reads the row, so two requests at the same moment make one profile.

### Booking a listing of the own company \{#own-company-booking\}

`Bookings::CheckoutSessions::TouristsCreateManager` asks `Providers::Memberships::ActiveCompanyIdService` for the company of the person.

- The validator refuses a listing whose `provider_id` equals that id.
- The answer is `422` with the title `There was an error when starting checkout`.
- The message on `listing_id` is `You cannot book a listing of your own company. Please choose another listing.`
- A removed member, and a member of another company, can book.

### Access codes \{#codes\}

Rails answers with these codes, and each code is a plain string at the raise.

| Code | Case |
| --- | --- |
| `provider_membership_required` | The word is `missing`. |
| `provider_approval_pending` | The word is `pending`, on an action that needs approval. |
| `provider_application_rejected` | The word is `rejected`, on an action that needs approval. |
| `provider_account_suspended` | The word is `suspended`. |
| `csrf_token_missing` and `csrf_token_invalid` | The CSRF header is missing or wrong. |

- The test `test/shared/errors/error_code_contract_test.rb` pins every code string in `app/`.
- A `403` never ends a session.

## Worked example \{#worked-example\}

Aiko is a tourist who starts a business.

1. Aiko signs up on the tourist login with Google.
2. The system creates her, the Google link and a tourist profile, and the answer says `missing`.
3. Aiko sends `POST providers/companies` with her company name.
4. The system creates a pending company and an owner membership, with no new sign-in.
5. The next answer says `pending`, and the team approves the company.
6. The next answer says `active`.
7. Aiko tries to book a tour of her own company, and checkout answers `422`.
8. Later, the team suspends the company, and the answer says `suspended`.
9. Aiko sends a request to a provider endpoint, and the system answers `403` with `provider_account_suspended`.
