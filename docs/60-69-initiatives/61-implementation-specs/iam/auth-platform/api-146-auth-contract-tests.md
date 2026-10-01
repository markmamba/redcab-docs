---
title: "Auth contract integration tests (auth Phase 0 API)"
sidebar_label: API · auth contract tests
issue: "https://github.com/markmamba/red-cab-api/issues/146"
repos:
  - red-cab-api
  - redcab-docs
status: approved
phase: 0
context: IAM
depends_on:
  - "docs/90-99-engineering-meta/93-authentication/appendix-web-api-contract.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/api-145-portal-gate-forbidden.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** `test/integration/auth_contract/` — one integration test file per appendix row (23 files) plus `contract_facts_test.rb` for token lifetimes, cookie names/attributes, and session revoke after logout / password-reset confirm; `SessionPrincipalTestHelper`, `AuthContractAssertions`, `auth_contract_rows.rb` (+ guard test); `test/integration/identities_regressions/` and notification integration tests for survivors of legacy `identities` suites; IAM audit §7 and `code-map.md` updates.
- **Does NOT ship:** `red-cab-web` tests; PR-08 deprecations; team permission 403s (IAM-Q4); **runtime** marketplace rescue narrowing (follow-up issue — see design #12).
- **Breaking change:** No.

## Problem

Phase 0 requires a machine-checkable pin between the published web↔API contract and `red-cab-api` behavior. Portal **403** codes landed in #145; the full per-row contract suite was deferred to **#146**. Coverage is scattered across `test/integration/identities/*` and controller tests with no `auth_contract/` directory.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Appendix B | [appendix-web-api-contract.md](/docs/90-99-engineering-meta/authentication/appendix-web-api-contract) | Row definitions and assertion rules |
| Code map | [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) | Test layout including regressions dir |
| Roadmap | [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) | Phase 0 exit criteria |
| API-145 | [api-145-portal-gate-forbidden.md](api-145-portal-gate-forbidden.md) | Portal 403 scope split |
| IAM audit | [iam-audit-2026-08](/docs/60-69-initiatives/implementation-specs/iam/iam-audit-2026-08/) §7 | Checkbox updates |

## Design decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | One file per appendix **row** (23 files); multi-actor signup = one file, three tests | Issue AC and code-map |
| 2 | `contract_facts_test.rb` — lifetimes, cookie names/attributes, revoke after logout / password reset | MF-3 / S3a; not an appendix row |
| 3 | Exact JSON keys for Account and Admin responses | Appendix “Words this sheet uses” |
| 4 | Marketplace guest: real catalog `GET`; expired **and** malformed `rc_access` → `200` guest | EC-1; optional auth |
| 5 | Portal **403:** stable `code` via `PortalGateTestHelper`. **401:** envelope without asserting stable `code` | EC-3; appendix defers 401 codes |
| 6 | Legacy `test/integration/identities/*` | Row tests → `auth_contract/`; security/deprecation → `identities_regressions/`; resend dispatch → `notifications/`; delete nine files | MF-1 / S1a |
| 7 | Portal actor rows: thin smoke on **pinned routes** (table below); keep #145 controller tests | Q2 → B |
| 8 | `corporate/**`: `GET /corporate_portal_test` until Client Portal routes exist | No shipped `Corporate::BaseController` subclass; pins gate behavior |
| 9 | OAuth callback: **POST** + **GET** compat | Q3 → B |
| 10 | `SessionPrincipalTestHelper` (`login_as`, `session_headers`); legacy helper modules alias | R1 |
| 11 | `auth_contract_rows.rb` + guard test | R2 |
| 12 | Marketplace `identify_identities_user` rescue narrowing | **Out of scope** — follow-up issue (EC-2 / R3) |
| 13 | Keep `test/controllers/team/identities/**` as deep proofs | R4 — same as portal controllers |

### Namespace row → pinned HTTP route

| Appendix row | Integration test file | Pinned route |
| --- | --- | --- |
| `marketplace/**` optional | `marketplace_optional_auth_guest_test.rb` | `GET marketplace/catalog/districts` |
| `tourists/**` | `tourists_namespace_portal_gate_test.rb` | `GET tourists/bookings/orders` |
| `corporate/**` | `corporate_namespace_portal_gate_test.rb` | `GET /corporate_portal_test` (test-only; gate until corporate app routes) |
| `providers/**` profile | `providers_namespace_portal_gate_test.rb` | `GET providers/documents` |
| Approval-gated `providers/**` | `providers_approval_gated_portal_gate_test.rb` | `POST providers/payments/merchant_accounts` (or `POST providers/catalog/listings`) |
| `POST providers/profiles` | `providers_profiles_create_role_gate_test.rb` | `POST providers/profiles` |
| `team/**` | `team_namespace_auth_required_test.rb` | `GET team/catalog/geographies` |

Refresh contract tests use `travel` on JWT `exp` (EC-8) — pins claim expiry in test env (`:memory` store), not Redis TTL.

## API contract (test mapping)

Authoritative endpoint semantics remain in Appendix B. Row → file index matches the issue #146 plan; actor rows use routes in the table above.

### Account principal rows

| Appendix row | Integration test file |
| --- | --- |
| `GET identities/accounts/current` | `test/integration/auth_contract/identities_accounts_current_show_test.rb` |
| `PATCH identities/accounts/current` | `test/integration/auth_contract/identities_accounts_current_update_test.rb` |
| `POST identities/sessions` | `test/integration/auth_contract/identities_sessions_create_test.rb` |
| `PATCH identities/sessions/current` | `test/integration/auth_contract/identities_sessions_current_update_test.rb` |
| `DELETE identities/sessions/current` | `test/integration/auth_contract/identities_sessions_current_destroy_test.rb` |
| `GET identities/oauth/google` | `test/integration/auth_contract/identities_oauth_google_show_test.rb` |
| `POST identities/oauth/google/callback` | `test/integration/auth_contract/identities_oauth_google_callback_test.rb` |
| `POST {tourists,corporate,providers}/identities/accounts` | `test/integration/auth_contract/actor_identities_accounts_create_test.rb` |
| `POST identities/email_verifications/confirm` | `test/integration/auth_contract/identities_email_verifications_confirm_test.rb` |
| `POST identities/email_verifications/resend` | `test/integration/auth_contract/identities_email_verifications_resend_test.rb` |
| `POST identities/password_resets/request` | `test/integration/auth_contract/identities_password_resets_request_test.rb` |
| `PATCH identities/password_resets/confirm` | `test/integration/auth_contract/identities_password_resets_confirm_test.rb` |

### Team admin rows

| Appendix row | Integration test file |
| --- | --- |
| `GET team/identities/admins/current` | `test/integration/auth_contract/team_identities_admins_current_show_test.rb` |
| `POST team/identities/admins/sessions` | `test/integration/auth_contract/team_identities_admins_sessions_create_test.rb` |
| `PATCH team/identities/admins/sessions/current` | `test/integration/auth_contract/team_identities_admins_sessions_current_update_test.rb` |
| `DELETE team/identities/admins/sessions/current` | `test/integration/auth_contract/team_identities_admins_sessions_current_destroy_test.rb` |

### Shared test support

- `test/support/session_principal_test_helper.rb` — `login_as(session_principal:, …)`, `session_headers`
- `test/support/auth_contract_assertions.rb` — JSON keys, cookies, CSRF negatives, `Set-Cookie` attributes, `assert_unauthorized_envelope` (401 `code` opaque), portal 403 via `PortalGateTestHelper`
- `test/support/auth_contract_rows.rb` — row metadata; guard test ensures file coverage
- Optional `auth_contract_fixtures.rb` for provider approval-gated setup (EC-6)

## IAM audit §7 checkbox policy

| PR | Tick when |
| --- | --- |
| PR-01 | `GET identities/accounts/current` contract test passes |
| PR-02 | Contract + regressions cover security behaviors; lockout also covered by `create_manager` unit tests where HTTP case is new |
| PR-03 | **Leave unchecked** unless non-HTTP PR-03 proof exists |
| PR-04 | Remains `[x]`; PATCH current contract test passes |
| PR-05 | Actor-namespace contract files pass |
| PR-06 | Team admin rows + `team/**` namespace file pass |
| PR-07 | OAuth callback contract row passes (cookie issuance) |
| PR-08 | **Leave unchecked** until deprecation PR ships; deprecated-path 404s in `identities_regressions/` |

## Out of scope

- Web `app/auth/*.spec.js` (web#77)
- Team admin permission 403s
- Cookie `domain` production decision
- PR-08 route removals
- Runtime marketplace rescue narrowing (linked follow-up)

## Acceptance criteria

- [ ] All appendix rows have a matching file under `test/integration/auth_contract/`
- [ ] `contract_facts_test.rb` pins lifetimes, cookie facts, session revoke behaviors
- [ ] Each row file asserts status, keys (where applicable), cookies, CSRF, portal codes per appendix requirements
- [ ] Legacy consolidation per design #6; nine `identities` integration files removed
- [ ] `auth_contract_rows` guard green
- [ ] IAM audit §7 updated per policy above
- [ ] `bin/rails test` green

## Verification

```bash
bin/rails test test/integration/auth_contract
bin/rails test test/integration/identities_regressions
bin/rails test
bundle exec rubocop
bundle exec srb tc
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-09-29 | PKM plan | Human verification passed |
| 2026-09-29 | Opus (`review-implementation-spec`) | MF-1/2/3 incorporated; `status: approved` |
