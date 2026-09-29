---
title: "Portal gate 403 + stable codes (auth Phase 0 API)"
sidebar_label: API · portal gate 403
issue: "https://github.com/markmamba/red-cab-api/issues/145"
repos:
  - red-cab-api
  - red-cab-web
status: approved
phase: 0
context: IAM
depends_on:
  - "docs/architecture/decisions/adr-018-web-authentication-enforcement-model.md"
  - "docs/architecture/decisions/adr-019-session-technology-phase-1-and-2.md"
  - "docs/engineering/authentication/appendix-web-api-contract.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
web_sibling: "https://github.com/markmamba/red-cab-web/issues/81"
---

## TL;DR

- **Ships (API):** `Errors::ForbiddenError` (403) with mandatory stable `code:` from `Errors::PortalGateCodes`; tourist/corporate/provider portal profile gates, `require_approved_provider_profile!` (three provider status codes), and `authorize_provider_role!` on profile create; explicit JWT lifetimes (`3600` / `604800`); controller integration tests for **seven** portal gate codes; contract appendix + ADR-018 D4 amended.
- **Does NOT ship:** `test/integration/auth_contract/` full suite (**#146**); web client updates (**#81**); team admin permission 403s; tourist/corporate profile **status** checks on portal gates (presence only).
- **Breaking change:** Valid sessions on the wrong portal no longer receive **401**. Clients must not treat **403** as signed-out (ADR-019 R8). **IAM-Q2 closed** when this ships.
- **Deploy:** API must deploy (or be verified in staging) before merging web **#81**. Rollback = API redeploy (no feature flag). Pre-#81 web tolerates 403 on loaders because `handleLoaderError` re-throws only **401**; **#81** adds a unit test pinning that behaviour.

## Problem

Actor base controllers raise `Errors::UnauthorizedError` when the account session is valid but the portal profile is missing or wrong, which violates ADR-018 invariant 2 (only **401** means signed out).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| ADR-018 D4 | [adr-018-web-authentication-enforcement-model.md](/docs/architecture/decisions/adr-018-web-authentication-enforcement-model) | 403 + portal codes |
| ADR-019 | [adr-019-session-technology-phase-1-and-2.md](/docs/architecture/decisions/adr-019-session-technology-phase-1-and-2) | Explicit JWT lifetimes; R8 |
| Appendix B | [appendix-web-api-contract.md](/docs/engineering/authentication/appendix-web-api-contract) | Actor namespace table; token lifetimes |
| Roadmap | [implementation-roadmap.md](/docs/engineering/authentication/implementation-roadmap) | Phase 0 scope vs #146 / #81 |

## Design decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | `ForbiddenError` requires explicit `code:` in `PortalGateCodes` | Published web contract; cannot default to class name |
| 2 | Seven portal codes in one module | API, tests, appendix stay aligned |
| 3 | Provider approval gate branches on profile `status` | Distinct web destinations (ADR-018 D5) |
| 4 | Tourist/corporate gates: profile **presence** only | Status-aware gates deferred |
| 5 | AuthN unchanged in `AuthenticatedController` | Missing JWT, expired access (before refresh), inactive account → **401** |
| 6 | Gate rejections: `skip_sentry: true` + structured `Rails.logger.info` | SF-4 |
| 7 | `authorize_provider_role!` on create → **403** `provider_role_required` | AuthZ, not authN |
| 8 | JWT **3600** / **604800**, global to jwt_sessions | Account + team share lifetimes (document in appendix) |
| 9 | **401** stable snake_case codes | Deferred; **401** `code` remains error class name until a follow-up issue |

## API contract

### Portal gate codes (`Errors::PortalGateCodes`)

| `code` | When |
| --- | --- |
| `tourist_profile_required` | Tourist namespace, no tourist profile |
| `corporate_profile_required` | Corporate namespace, no corporate profile |
| `provider_profile_required` | Provider namespace, no provider profile |
| `provider_role_required` | `POST providers/profiles`, account role ≠ provider |
| `provider_approval_pending` | Approval-gated action, profile `pending` |
| `provider_application_rejected` | Approval-gated action, profile `rejected` |
| `provider_account_suspended` | Approval-gated action, profile `suspended` |

### HTTP semantics

| Condition | HTTP |
| --- | --- |
| No/invalid session, expired access (JWT layer), inactive account | **401** |
| Signed in, portal gate failure (table above) | **403** + `code` |

Error JSON: `ApplicationController#base_error` — `status_name`, `status`, `messages`, `code`, `title`, `server`.

### JWT settings

| Setting | Value |
| --- | --- |
| `JWTSessions.access_exp_time` | `3600` |
| `JWTSessions.refresh_exp_time` | `604800` |

### API files

- `app/shared/errors/portal_gate_codes.rb`, `forbidden_error.rb`
- `app/controllers/concerns/portal_gate_rejection.rb`
- Actor `base_controller.rb` files + `providers/profiles_controller.rb`
- `config/initializers/jwt_sessions.rb`
- Controller tests listed in verification below

## Web contract (coordination — #81)

- Consume seven `code` values; remove title-string matching for missing provider profile.
- Unit test: `handleLoaderError` returns fallback on **403** (does not throw).
- Wrong-actor **403** on protected `tourists/**` (and peers) without infinite blank render.

## Out of scope

- **#146** — `test/integration/auth_contract/`
- **#81** — web implementation
- Team permission **403**s (`IAM-Q4`)
- Marketplace optional-auth gates (if added later, extend `Marketplace::BaseController` rescue list)

## Acceptance criteria

- [ ] Seven portal codes in controller tests; authN ordering (expired access → **401**; valid session wrong portal → **403**); inactive account → **401**
- [ ] Token lifetimes explicit in initializer and appendix
- [ ] ADR-018 D4 lists full code set; IAM-Q2 closed

## Verification

```bash
bin/rails test test/controllers/tourists/base_controller_test.rb
bin/rails test test/controllers/corporate/base_controller_test.rb
bin/rails test test/controllers/providers/base_controller_test.rb
bin/rails test test/controllers/providers/profiles_controller_test.rb
bin/rails test test/controllers/providers/payments/merchant_accounts_controller_test.rb
bin/rails test test/shared/errors/portal_gate_codes_test.rb
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-09-29 | Plan + Opus spec review | Approved via PKM plan artifact |
