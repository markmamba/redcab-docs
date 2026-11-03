---
title: Provider company and members model
sidebar_label: Provider company and members
sidebar_position: 1
description: The provider company, its memberships, the onboarding call and the gate of the provider API.
doc_type: model-spec
normative: true
status: current
context: iam
last_reviewed: 2026-11-03
---

## TL;DR \{#company-members-tldr\}

- The table `providers_companies` holds the business, and other domains point to it with `provider_id`.
- The table `providers_memberships` links one person to one company with a company role.
- A person has at most one active membership, and the database enforces it.
- Onboarding creates a pending company and an owner membership in one transaction.
- The gate of the provider API loads the active membership, and then the company.

## About this document

This is the model page for the company and its memberships, and the rulings are in [IAM decisions](/docs/30-49-domains/iam/iam-decisions/#provider-company).

| Topic | Document |
| --- | --- |
| Rulings | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) and [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) |
| What owners and staff do | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) |
| Column truth | [providers.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/providers.dbml) |
| Work record | [Company and memberships spec](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| the model `Providers::Company` | The business of a provider. A row in `providers_companies`. |
| the model `Providers::Membership` | The link between one person and one company. A row in `providers_memberships`. |
| active membership | A row in `providers_memberships` with `status: "active"`. |
| the gate | The `before_action` chain in `Providers::BaseController`. It decides who may use the provider API. |
| person | One row in `identities_accounts`. |

## Structure \{#structure\}

The company is the business, and the membership is the person inside it.

```ruby
# app/domains/providers/membership.rb
belongs_to(:provider_company, class_name: 'Providers::Company', foreign_key: :providers_company_id)
belongs_to(:identities_account, class_name: 'Identities::Account', foreign_key: :identities_account_id)
```

- The table `providers_companies` has no column for a person.
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

### Database guards \{#guards\}

| Guard | What it does |
| --- | --- |
| Index `index_providers_memberships_on_active_account` | A unique index on `identities_account_id` where `status = 'active'`. One person has one active membership. |
| Check `providers_memberships_removed_at_check` | The database refuses `status: "removed"` with no `removed_at`. |
| Index `index_providers_memberships_on_account_and_status` | A lookup for the access check on every request. |
| Index `index_providers_memberships_on_company_and_status` | A lookup for the members of one company. |

- A removed row stays, because records keep the member who did an action.
- A removed person gets a new row when a new invitation is accepted.
- A model holds no validation, so the validators check these rules first and the database is the last guard.

## States \{#states\}

A membership has two states.

| Status | Meaning | Next state |
| --- | --- | --- |
| `active` | The person works in the company. | `removed` |
| `removed` | The person left. The row stays as a record. | None. A new row replaces it. |

## Contract \{#contract\}

The URLs and the JSON keys keep the word `profiles`, and they return the company.

| Method | Path | Who may call it | Answer |
| --- | --- | --- | --- |
| GET | `/providers/profiles` | A person with an active membership | `200` and the company |
| POST | `/providers/profiles` | A signed-in person with the role `provider` | `201` and the company |
| PATCH | `/providers/profiles` | A person with an active membership | `200` and the company |

- Any member can update the company, because only owners exist today.
- The team routes under `/team/providers/profiles` read and decide on a company.

### Onboarding \{#onboarding\}

The manager `Providers::Companies::ProvidersCreateManager` runs in one transaction.

1. It checks that the person has no active membership.
2. It creates a `Providers::Company` with `status: "pending"`.
3. It creates a `Providers::Membership` with `company_role: "owner"` and `status: "active"`.
4. It saves the type detail rows of the company.

| Case | Answer | Message |
| --- | --- | --- |
| The person already has an active membership. | `422` | You already have a provider company. Please update your existing company instead. |
| Two requests of one person run at the same moment. | `409` | You already belong to a provider company. Please use your existing company. |

- The `409` case comes from the unique index.
  - The manager rolls back the transaction, so no company stays behind.
- The `409` answer skips Sentry, because a user can cause it.

### The gate \{#gate\}

The gate answers in this order.

1. A person who is not signed in gets `401`.
2. A person whose account role is not `provider` gets `403` with `provider_role_required`.
3. A person with no active membership gets `403` with `provider_profile_required`.
4. An action that needs approval reads `providers_companies.status` and answers with an approval code.

- The gate sets `CurrentRequest.provider_membership` and `CurrentRequest.provider_company`.
- The action `create` skips step 3, because a new person has no membership yet.
- A removed member gets `provider_profile_required`, the same as a person who never joined.
- Managers take the keyword `provider_company:`, and they never read `CurrentRequest`.

## Worked example \{#worked-example\}

Kenji creates the company Kanto Charter.

1. Kenji signs up on "List your service".
   - The system creates his account with the role `provider`.
2. Kenji sends `POST /providers/profiles` with his business name.
3. The system creates `Providers::Company` Kanto Charter with `status: "pending"`.
4. The system creates a `Providers::Membership` with `company_role: "owner"` and `status: "active"`.
5. Kenji sends `GET /providers/profiles`.
   - The gate finds his active membership and returns Kanto Charter.
6. Kenji sends `POST /providers/profiles` again.
   - The system answers `422` and tells him to update the existing company.
