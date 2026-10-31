---
title: Accounts are persons, and provider companies have members
sidebar_label: Accounts and provider companies
sidebar_position: 1
description: Why IAM gives one account to each person, moves the provider business to a company with Owner and Staff members, and adds a portal switch.
normative: true
status: accepted
context: iam
last_reviewed: 2026-10-31
supersedes:
  - FR-IAM-009 (partial)
  - FR-IAM-013
  - ADR-010 identity contract field "role"
---

## TL;DR

- One account is one person, and an account has no role.
- A provider company owns the business, and its members are Owner or Staff.
- A person switches between the tourist portal and the provider portal without a new sign-in.
- The corporate role and the corporate profile go away.

## About this document

This record gives the reasons for the IAM model, and the rules are in [IAM decisions](/docs/30-49-domains/iam/iam-decisions/#iam-decisions-tldr).

| Topic | Document |
| --- | --- |
| Findings and use cases | [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) |
| Status | Accepted on 2026-10-31 by the principal developer, and Product Owner sign-off is not recorded |

---

## Context

A person must be able to book a tour and run a provider business with one email.

The current model gives one role to each account.

- One email gives one account, and one account has one role: `tourist`, `corporate` or `provider`.
- Each role has one profile table, and each profile links to exactly one account.
- Provider sign-up creates a new account with the role `provider`, and it refuses an email that has an account.
- `providers_profiles` acts as the company.
- Listings, assets, bookings, reviews and the payout account link to `providers_profiles`.
- A new Google sign-up always gets the role `tourist`, also from the provider login.
- The session holds the account ID only, and the web sends a person to the home of the one role.

This model causes three problems.

1. A provider who wants to book a tour needs a second email.
2. Only one person can manage the listings of a provider business.
3. A person cannot switch between the tourist portal and the provider portal.

Travel marketplaces separate the person from the business.

- Airbnb gives one account to a guest who is also a host, with a "Switch to hosting" control.
- GetYourGuide and Booking.com give a supplier business many users, and each user has a role.

There is no production data yet, so the tables can change without a data migration.

## Decision

An account is a person, and a provider company holds the business through memberships.

- The rules are in [IAM decisions](/docs/30-49-domains/iam/iam-decisions/#iam-decisions-tldr).
- The behavior that users see is in the [IAM requirements](/docs/30-49-domains/iam/requirements/).

## Consequences

One person can be a tourist and a provider, and a company can have many staff.

- The provider portal checks the membership and the company role, not an account role.
- The approval, license and payout checks move from the provider profile to the company.
- The URL decides the portal, and the session stores no active portal.
- The current-session answer holds one access word for the provider portal.
- The web entry rules ask "may this person use this portal?", not "is this the one role?"
- The layout needs a portal switch, and the layout redesign starts after this record.
- The session model is in [Sessions are database records, and nothing refreshes](/docs/30-49-domains/iam/architecture-decisions/server-side-sessions).

The change touches much code.

- About 96 files in `red-cab-api/app/domains` use `provider_profile`.
- Catalog, Bookings, Reviews and Payments must link to the company, not to `providers_profiles`.
- The Corporate domain goes away from the docs, the API and the web.

These documents change because of this record.

- `FR-IAM-009` changes from one Role to the portals that a person may use.
- `FR-IAM-012` drops the Corporate Account.
- `FR-IAM-013` goes away.
- The identity contract of ADR-010 changes from `principal`, `role` and `language` to `principal`, the access word and `language`.
- The rule "role matches exactly one profile" in `identities.dbml` goes away.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Keep one role for each account and use a second email | A provider keeps two logins, and one person still runs the whole company. |
| Allow many role values on one account | The account keeps business roles, and the company still has one user. |
| Give each person a provider profile inside the company | It is the same idea as a membership. The word membership states the link and the company role in one place. |
| Allow one person in many companies now | It needs a company picker and more session rules. We keep one company for each person for now. |
| Move login to an external identity service | It does not add the company or the membership. Google sign-in already works. |
