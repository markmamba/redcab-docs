---
title: "Replace the jwt_sessions gem with server-side sessions"
sidebar_label: API · Server-side sessions
issue: "https://github.com/markmamba/red-cab-api/issues/147"
repos:
  - red-cab-api
status: implemented
phase: 2
context: IAM
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#server-side-sessions"
  - "docs/30-49-domains/32-iam/iam-decisions.md#production-hosts"
  - "docs/30-49-domains/32-iam/iam-decisions.md"
---

## TL;DR

- Each sign-in becomes one row in `identities_account_sessions` or `identities_admin_sessions`.
- Rails reads that row on every request, and nothing refreshes.
- The gem `jwt_sessions` and its Redis token store go away.
- A person and a team admin can each sign out everywhere.
- Login endpoints get a rate limit for one IP address.
- Error codes are plain strings in the raise.
- No Ruby list holds the codes, and `ForbiddenError` does not check them.
- The default `code` of every error is the class name in snake case, for example `validation_error`.
- The current-session answer keeps its fields, because `provider_access` needs the memberships of I2.
- Breaking change: Yes.
  - The API and `red-cab-web` must deploy together, and everyone signs in again.
  - The default `code` changes from `Errors::ValidationError` to `validation_error` for all errors.
  - The web uses the old form only in test data.

## Problem

The session code does not follow the IAM rulings.

- The endpoints `PATCH identities/sessions/current` and `PATCH team/identities/admins/sessions/current` refresh a session.
- A `401` also means that an access token expired, so a `401` does not mean that the session is gone.
- A missing or wrong CSRF token answers `401`.
  - Five tests in `test/integration/auth_contract/` pin this answer.
- No endpoint signs a person or a team admin out everywhere.
- Persons and team admins share the concerns `SessionCookieManager` and `SessionPrincipal`.
- Session cookies have no expiry date, so a closed browser loses the session.
- Login endpoints have no rate limit for one IP address.
- The file `config/initializers/cors.rb` allows `https://redcab.com`, but the production hosts are on `redcab.app`.
- The table `identities_oauth_identities` has no unique index that keeps one Google link for each person.

## Governing docs

Read these before design.

Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Server-side sessions](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions) | Session record, limits, CSRF, rate limit, cleanup and sign-out |
| Rule | [Production hosts](/docs/30-49-domains/iam/iam-decisions/#production-hosts) | Hosts, cookie domains and cookie names |
| Rule | [Person account](/docs/30-49-domains/iam/iam-decisions/#person-account) | One Google link, and a locked person uses no portal |
| Rule | [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) | `csrf_token_missing` and `csrf_token_invalid` |
| Rule | [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules) | What the web expects from Rails |
| Requirement | [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals) | US-6 and US-7 |
| Record | [Sessions are database records, and nothing refreshes](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions) | Reasons and rejected options |
| Column truth | [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) | `identities_account_sessions`, `identities_admin_sessions` and `identities_oauth_identities` |
| Paired spec | [Web server-side sessions](web-190-server-side-sessions-and-account-menu.md) | Must deploy with this spec |

This spec depends on [red-cab-api#259](https://github.com/markmamba/red-cab-api/pull/259), which adds the Google link index to the DBML files.

## Design decisions

The rulings fix the behavior, and these decisions fix the parts that the rulings leave open.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The current-session answer keeps its fields in this spec. | Change the answer now. | `provider_access` reads memberships, and memberships ship in I2. |
| 2 | Persons and team admins get separate concerns, services, models and jobs. | One shared concern with a principal argument. | The ruling says that the two systems share no code. |
| 3 | The cookies expire at `created_at` plus the absolute limit. | Keep cookies with no expiry date. | A closed browser must not end a session, because US-6 keeps a person signed in. |
| 4 | A session that the idle limit ended answers `401` and stays until the cleanup job deletes it. | Delete the row on the read. | A read then needs no delete, and the cleanup job already exists. |
| 5 | A `401` does not clear cookies. Only logout and sign out everywhere clear cookies. | Clear cookies on each `401`. | Node reads the session, and the browser writes. |
| 6 | Rails checks the session first and the CSRF token second. | Check CSRF first. | A gone session must answer `401`, even when the CSRF token is also wrong. |
| 7 | Rails updates `last_used_at` after the CSRF check. | Update before the check. | A refused write must not extend a session. |
| 8 | Rails compares the header `X-CSRF-Token` with the `csrf_token` column of the record. | Compare the header with the cookie. | The ruling puts the token on the record. |
| 9 | An account that is not `active` answers `401`, and its session rows stay. | Delete the rows when an account locks. | This is the answer of the code today, and a lock can end by itself. |
| 10 | The team gets its own sign out everywhere endpoint. | Leave it to the team admin login audit. | A team admin who loses a device needs the same answer as a person. |
| 11 | The rate limit covers `POST identities/sessions` and `POST team/identities/admins/sessions`. | Also cover the Google callback. | These two endpoints check a password, and Google checks its own. |
| 12 | The rate limit counts in Redis, on the Redis database that the Google state store uses. | Use `Rails.cache`. | The test environment uses `:null_store`, and production sets no shared cache store. |
| 13 | The session cookie has the `__Secure-` prefix in production only. | Use one name in all environments. | A browser refuses a `__Secure-` cookie without `Secure`, and development has no HTTPS. |
| 14 | A new sign-in leaves older session rows of the person in place. | Delete the older rows. | Aiko stays signed in on her phone when she signs in on her laptop. |
| 15 | An error code is a plain string written at the raise. No Ruby list holds the codes, and `ForbiddenError` does not check them. The domain page lists the codes, and a test pins each one. | Keep a list `Errors::PortalGateCodes` and check it in `ForbiddenError`. | Every other `code:` in the API is a free string. A list that only one error class checks is a special case. |
| 16 | The default `code` is the class name in snake case, for example `validation_error` and `too_many_requests_error`. | Keep the Ruby class name, for example `Errors::ValidationError`. | A client must not depend on Ruby class names. `ApplicationController` already sends `record_not_found` and `internal_server_error`. |
| 17 | A CSRF failure raises `Errors::ForbiddenError` with `code: 'csrf_token_missing'` or `code: 'csrf_token_invalid'`. | Render the JSON in the controller. | Every error then has the same six fields, and Sentry handling stays in one place. |
| 18 | The rate limit uses a fixed window for each endpoint and each IP address. | A sliding window. | It is simple. A burst across the edge of two windows can allow up to twice the attempts. |
| 19 | If Redis fails, a sign-in request goes through. | Refuse every sign-in. | A Redis error must not block every sign-in. The login lockout after 5 failures still protects an account. |
| 20 | Person sign-in and team sign-in count their attempts separately. | One shared count. | A person and a team admin on one office network must not block each other. |

## API contract

The lasting API contract lives in [Sessions](/docs/30-49-domains/iam/use-cases/sessions#api-contract).

- It holds the endpoints and the order of checks.
- It holds the cookies, the error answers and the configuration values.

- This spec adds `DELETE identities/sessions` and `DELETE team/identities/admins/sessions`.
- This spec removes `PATCH identities/sessions/current` and `PATCH team/identities/admins/sessions/current`.
- The new file `config/identities_sessions.yml` holds the configuration, and `config/application.rb` loads it as `config.identities_sessions`.

### Migration order

Each table is new or gets only an index, so this spec needs no three-step `NOT NULL` migration and no backfill.

1. Create `identities_account_sessions` with its indexes.
2. Create `identities_admin_sessions` with its indexes.
3. Add `index_identities_oauth_on_account_and_provider`, and remove `index_identities_oauth_on_account_id`.

The migrations copy the names, the comments and the column order from the file `docs/db/identities.dbml`.

### Files to create or modify (API)

Models and services:

- `app/domains/identities/account_session.rb` (create)
- `app/domains/identities/admin_session.rb` (create)
- `app/domains/identities/account_sessions/create_service.rb` (create)
- `app/domains/identities/account_sessions/find_active_service.rb` (create)
- `app/domains/identities/account_sessions/destroy_all_service.rb` (create)
- `app/domains/identities/admin_sessions/create_service.rb` (create)
- `app/domains/identities/admin_sessions/find_active_service.rb` (create)
- `app/domains/identities/admin_sessions/destroy_all_service.rb` (create)
- `app/domains/identities/password_resets/confirm_manager.rb` (call `DestroyAllService` inside the transaction)
- `app/domains/identities/oauth/google/callback_manager.rb` (see below)
- `app/domains/identities/oauth/state_store.rb` (use the renamed Redis key)

Controllers and routes:

- `app/controllers/concerns/account_session_cookies.rb` (create)
- `app/controllers/concerns/admin_session_cookies.rb` (create)
- `app/controllers/identities/users/authenticated_controller.rb`
- `app/controllers/identities/sessions_controller.rb`
- `app/controllers/identities/oauth/google_controller.rb`
- `app/controllers/team/authenticated_controller.rb`
- `app/controllers/team/identities/admins/sessions_controller.rb`
- `app/controllers/marketplace/base_controller.rb`
- `app/models/current_request.rb` (add `identities_account_session` and `identities_admin_session`)
- `config/routes/identities_routes.rb`
- `config/routes/team_routes.rb`

Errors:

- `app/shared/errors/too_many_requests_error.rb` (create)
- `app/shared/errors/base_error.rb` (the default `code` is the class name in snake case)
- `app/shared/errors/forbidden_error.rb` (accept any `code:`, and remove the check against `PortalGateCodes`)
- `app/shared/errors/portal_gate_codes.rb` (delete)

Jobs and configuration:

- `app/jobs/identities/account_sessions/cleanup_expired_job.rb` (create)
- `app/jobs/identities/admin_sessions/cleanup_expired_job.rb` (create)
- `config/sidekiq_scheduler.yml` (run both jobs each hour)
- `config/identities_sessions.yml` (create)
- `config/application.rb`
- `config/initializers/login_rate_limit.rb` (create)
- `config/initializers/cors.rb` (allow `https://redcab.app` and `https://team.redcab.app`)
- `config/redis.yml` (rename `jwt_sessions_db` to `identities_db`, and keep the value `1`)

The manager `Identities::Oauth::Google::CallbackManager` rescues `ActiveRecord::RecordNotUnique` around its transaction.

- The rescue calls `raise_oauth_callback_failed`.
- So two requests at the same moment get the error `Google sign-in could not be completed. Please try again.`

The jobs use `queue_as :identities`, because each domain has its own queue.

- Each job deletes rows that passed the idle limit or the absolute limit.

### Code to remove

| Code | Reason |
| --- | --- |
| The gem `jwt_sessions` in `Gemfile` and `Gemfile.lock` | Session rows replace it |
| `sorbet/rbi/gems/jwt_sessions@3.2.4.rbi` | The gem goes away |
| `config/initializers/jwt_sessions.rb` | The gem goes away |
| `app/controllers/concerns/session_cookie_manager.rb` | The two new concerns replace it |
| `app/controllers/concerns/session_principal.rb` | The two systems share no code |
| `app/domains/identities/sessions/revoke_all_service.rb` | `Identities::AccountSessions::DestroyAllService` replaces it |
| The `update` actions of both session controllers, and their routes | Nothing refreshes |
| `app/shared/errors/portal_gate_codes.rb` and its check in `ForbiddenError` | Codes are plain strings at the raise (decision 15) |

Keep Redis, because Sidekiq, the Google state store and the rate limit use it.

The gem `jwt` stays when `oauth2` needs it, and `bundle install` decides this.

This spec removes no Corporate code, no `Providers::Profile` code and no provider type code, because I2 owns that work.

### Implemented specs that this spec replaces

This spec changes no Catalog code, so it replaces no part of these specs.

- [Keyword search spec api-208](../cat/api-208-keyword-search.md)
- [Pickup coverage spec api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md)

### Tests that must change

The folder `test/integration/auth_contract/` has 25 test files, 23 rows in `AuthContractRows` and 58 tests.

| Test file | Change |
| --- | --- |
| `identities_sessions_current_update_test.rb` | Delete, and delete its row in `AuthContractRows` |
| `team_identities_admins_sessions_current_update_test.rb` | Delete, and delete its row in `AuthContractRows` |
| `identities_sessions_current_destroy_test.rb` | A missing CSRF token answers `403` with `csrf_token_missing` |
| `team_identities_admins_sessions_current_destroy_test.rb` | A missing CSRF token answers `403` with `csrf_token_missing` |
| `identities_accounts_current_update_test.rb` | A missing CSRF token answers `403` with `csrf_token_missing` |
| `contract_facts_test.rb` | Pin the limits, the cookie names and the attributes in place of the token lifetimes |
| `identities_sessions_create_test.rb` | Assert one new row and the `429` answer |
| `team_identities_admins_sessions_create_test.rb` | Assert one new row and the `429` answer |
| `identities_oauth_google_callback_test.rb` | Assert one new row and the race on the unique index |
| `identities_password_resets_confirm_test.rb` | Assert that all rows of the person go away |
| `marketplace_optional_auth_guest_test.rb` | A gone session is a guest, with no `401` |
| The other files in the folder | Replace the JWT helper calls |

These files outside the folder also change.

- `test/controllers/concerns/session_cookie_manager_test.rb` (delete, and add one test file for each new concern)
- `test/controllers/team/identities/admins/sessions_controller_test.rb`
- `test/controllers/team/identities/admins_controller_test.rb`
- `test/controllers/tourists/base_controller_test.rb`
- `test/integration/identities_regressions/accounts_security_test.rb`
- `test/integration/identities_regressions/deprecated_routes_test.rb`
- `test/integration/identities_regressions/sessions_security_test.rb`
- `test/support/auth_contract_assertions.rb`
- `test/support/provider_session_test_helper.rb`
- `test/support/session_principal_test_helper.rb`
- `test/support/team_admin_session_test_helper.rb`
- `test/test_helper.rb`

New tests cover these behaviors.

- An idle session answers `401`, and so does a session past the absolute limit.
- A row with a recent `last_used_at` gets no update.
- A cookie with a wrong signature answers `401`.
- A person cookie opens no `team/**` route, and a team cookie opens no person route.
- `DELETE identities/sessions` deletes all rows of the person and leaves other persons alone.
- `DELETE team/identities/admins/sessions` deletes all rows of the admin and leaves other admins alone.
- A wrong CSRF token answers `403`, and the session stays.
- Both cleanup jobs delete expired rows and keep live rows.
- A `ForbiddenError` with no `code:` answers `forbidden_error`.
- A `ForbiddenError` with a `code:` keeps it.
- Every error class answers a snake case default `code`, and `class_name` still holds the Ruby class name for Sentry.
- Every `code:` string in `app/` is in the list of the contract test, and each one is in snake case.
- The cleanup jobs delete in batches, and a run with more rows than one batch deletes them all.

## Data / domain touchpoints

- Bounded context: IAM.
- Transaction boundaries:
  - `Identities::PasswordResets::ConfirmManager` sets the password and deletes the session rows in one transaction.
  - Sign-in creates the row after the manager succeeds, in the controller concern.
- Snapshots: none.
- Hard deletes: the session tables allow them, because the IAM ruling asks for them.

## Worked example

Aiko signs in on her laptop, leaves for 8 days, and comes back.

1. Aiko sends `POST identities/sessions` with the right password.
2. Rails creates a row in `identities_account_sessions` with `last_used_at` set to now.
3. Rails sets `__Secure-rc_session` and `CSRF_TOKEN`, and both expire in 30 days.
4. Aiko sends `PATCH identities/accounts/current` with `X-CSRF-Token`, and Rails accepts it.
5. Aiko sends no request for 8 days.
6. Aiko opens her bookings, and the idle limit of 7 days has passed.
7. Rails answers `401`, and the web shows the login page.
8. The cleanup job deletes the row within one hour after the idle limit.

## Out of scope

- The fields of the current-session answer, because I2 changes them.
- The access codes for provider companies, because I2 changes them.
- The team admin login audit.
- A list of active devices.

## Open items

- Before launch, we confirm that `request.remote_ip` gives the real visitor address behind the production proxy.
  - The login rate limit and `ip_address` both depend on this.
- Product Owner sign-off on the IAM rulings is not recorded.

## Tasks

### API

- [x] Add the three migrations and the two models.
- [x] Add the configuration file, the services and the two concerns.
- [x] Move all controllers to the new concerns.
- [x] Add the CSRF codes and the `429` error.
- [x] Add `DELETE identities/sessions` and `DELETE team/identities/admins/sessions`.
- [x] Add the login rate limit.
- [x] Add both cleanup jobs.
- [x] Rescue the unique index race in `CallbackManager`.
- [x] Change the production origins in `config/initializers/cors.rb`.
- [x] Remove the code in [Code to remove](#code-to-remove).
- [x] Update the tests.
  - Result on 2026-11-02: `test/integration/auth_contract` and `test/integration/identities_regressions` run 83 tests with 0 failures.
- [x] Remove the I1 tags from the files `docs/db/identities.dbml` and `docs/db/redcab.dbml`.
- [x] Update `AGENTS.md`, `app/domains/AGENTS.md` and `db/AGENTS.md` for sessions.
- [ ] Confirm that the Sidekiq process reads the queue `identities`.
  - Open on 2026-11-02: the repository has no Sidekiq queue list.
  - The scheduler sends both cleanup jobs to the queue `identities`.
  - [red-cab-api#267](https://github.com/markmamba/red-cab-api/issues/267) sets the queue list.

### Docs

- [x] Set spec `status: implemented` after merge.
  - Merged in [red-cab-api#270](https://github.com/markmamba/red-cab-api/pull/270) on 2026-11-02.

## Acceptance criteria

- [x] A sign-in creates one session row and sets the cookies from the cookie table of [Sessions](/docs/30-49-domains/iam/use-cases/sessions#cookies).
- [x] A missing, idle or expired session answers `401`.
- [x] A wrong password answers `422`.
- [x] A missing or wrong CSRF token answers `403` with its code.
- [x] `403` never ends a session.
- [x] Logout ends one session.
- [x] Sign out everywhere and a password reset end all sessions of the person.
- [x] Team sign out everywhere ends all sessions of the team admin.
- [x] The eleventh login attempt in 3 minutes from one IP address answers `429`.
- [x] Five failed logins still lock the account.
  - The code is unchanged: `MAX_FAILED_ATTEMPTS` is `5` in `app/domains/identities/account.rb`.
  - I found no test that pins the fifth failure.
- [x] No refresh endpoint exists.
- [x] A team cookie and a person cookie open only their own routes.
- [x] The database refuses a second Google link for one person.
- [x] No file in `app/`, `config/` or `test/` names `jwt_sessions` or `JWTSessions`.

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/integration/auth_contract test/integration/identities_regressions
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n -E 'jwt_sessions|JWTSessions' -- app config test
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-11-02 | Close-out check by Claude Code, for the principal developer | Merged in red-cab-api#270. The files, routes, jobs and configuration match this spec. No `jwt_sessions` name is left in `app/`, `config/` or `test/`. One task stays open: the Sidekiq queue list, see red-cab-api#267. |
