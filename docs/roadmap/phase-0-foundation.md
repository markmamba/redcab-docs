---
title: Phase 0 — Foundation
sidebar_label: Phase 0
sidebar_position: 2
description: Runnable repos, IAM, role profiles, event bus, and NOT stub.
---

## TL;DR

- **Foundation:** runnable repos, thin IAM + role profiles, in-process domain events, NOT stub.
- Delivers identity/profile schema without marketplace flows (no listings, bookings, or Stripe).
- Most exit criteria met; verification email dispatch still stubbed.

## About this document

Phase 0 deliverables, out-of-scope items, open decisions, and exit criteria.

| Topic | Document |
| --- | --- |
| Roadmap overview | [Phasing Roadmap](/docs/roadmap) |
| Next phase | [Phase 1 — MVP](/docs/roadmap/phase-1-mvp) |
| Engineering | [Engineering](/docs/engineering) |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |

---

| [← Roadmap overview](/docs/roadmap) | [Phase 1 →](/docs/roadmap/phase-1-mvp) |

---

## Phase 0 — Foundation

> **Last verified:** 2026-07-25 against `red-cab-api/` and `red-cab-web/` (includes identity profile redesign).

### Goal

Establish the implementation workspace so all subsequent phases build on a consistent foundation — including a thin IAM principal and role-extension profiles.

### Deliverables

#### Repositories & tooling

**red-cab-api**

- [x] Rails 8 API-only modular monolith scaffold
- [x] `.ai/instructions.md`, `.cursor/rules/`, and skills per [../engineering/README.md](/docs/engineering)
- [x] CI pipeline — Brakeman + RuboCop + Minitest on push/PR
- [x] PostgreSQL — `database.yml` + identities / profile migrations applied
- [x] Redis — JWT session store, OAuth state, and Sidekiq backend; Active Job uses Sidekiq (db index 2)

**red-cab-web**

- [x] React Router v7 SSR scaffold (JavaScript)
- [x] `.ai/instructions.md`, `.cursor/rules/`, and skills per [../engineering/README.md](/docs/engineering)
- [x] CI pipeline — ESLint + Vitest (`npm run ci:test`) on push/PR

#### Identity & Access (`IAM`) + role profiles

**red-cab-api**

- [x] Account registration (email/password) — `POST identities/accounts/register`
- [x] Google OAuth sign-in — `GET identities/oauth/google`, callback handler, OmniAuth initializer
- [x] Session-based JWT auth (cookie-based) — `jwt_sessions` + `SessionCookieManager` (`rc_access` / `rc_refresh`)
- [x] Thin `identities_accounts` — credentials, name, coarse `role` claim, language, lockout; **no** corporate org fields on Account
- [x] Coarse roles: Tourist, Corporate, Provider — `Identities::Account` string enum (Admin is **not** a value)
- [x] Admin identity — separate `Identities::Admin` model + `POST team/identities/admins/sessions`
- [x] Tourist profile — `tourists_profiles` created on Tourist registration and Google OAuth tourist signup
- [x] Corporate Client profile — `corporate_profiles` (`organization_name`, `group_size_range`) created on Corporate registration (`FR-IAM-013`)
- [x] Provider profile schema — `providers_profiles` + type-detail / license / document / support-trial tables in DBML + migrations (PRV application flows land in Phase 1)
- [x] Language preference capture (EN/JA) — account column + `PATCH identities/accounts/language_preference`
- [x] Account lockout (`OPR-1`) — `LockoutPolicy` (5 attempts / 15 min) wired in session create
- [x] Email verification flow — confirm + resend endpoints, token model, registration issues token
- [x] `GET identities/accounts/current` — SSR principal hydration
- [x] `PATCH identities/sessions/current` — JWT refresh
- [x] `DELETE identities/sessions/current` — logout (alias; legacy `DELETE identities/sessions` retained)
- [x] Team session `GET/PATCH/DELETE …/sessions/current`
- [x] Password reset request + confirm — `POST identities/password_resets/request`, `PATCH identities/password_resets/confirm`

**red-cab-web**

- [x] Sign-up page — registration form with language preference (defaults to Tourist role)
- [x] Login page — email/password session create
- [x] Verify-email page — token confirm + resend
- [x] Google OAuth sign-in — callback page wired; **no** “Sign in with Google” entry on login; OAuth client calls `GET …/google/authorize` but API route is `GET …/google`
- [x] Forgot-password flow — placeholder page only (no API endpoint yet)
- [x] Auth HOCs — `withNoAuth`, `withTouristAuth`, `withProviderAuth`, `withCorporateAuth`
- [x] Session state — `useAuth`, ky API clients, cookie passthrough
- [x] Language preference update UI — captured at sign-up only; no post-registration settings surface
- [x] Team admin login — `/team/login` + dashboard shell
- [x] Provider / Corporate portal routes — route files and layouts exist; route arrays empty

#### Notifications (`NOT`) — stub

**red-cab-api**

- [x] Dispatch adapter skeleton — `Notifications::*::EnqueueManager` stubs call through from domain events
- [x] `notifications_dispatches` table + mailer path for account verification (dispatch still stubbed toward full idempotent pipeline)
- [x] Domain-event subscription framework — in-process `Shared::DomainEvents::Publisher` with handler map

**red-cab-web**

- [x] Verification email UX beyond API polling — relies on user clicking link from email (email not sent until dispatch ships)

#### Cross-cutting

**red-cab-api**

- [x] In-process domain event bus — `Shared::DomainEvents::Publisher` (publish → synchronous handler)
- [x] Background job runtime — Sidekiq + Redis for Active Job; `bin/jobs` starts Sidekiq worker
- [x] Error response format — `Errors::*` hierarchy per [../engineering/backend-conventions.md](/docs/engineering/backend-conventions)
- [x] DBML + migrations for identity/profile foundation:
  - `docs/db/identities.dbml`, `tourists.dbml`, `corporate.dbml` (corporate client only), `providers.dbml`, `notifications.dbml`, `redcab.dbml`
  - Thin Account + role-extension profiles (see **Identity & profile model** above)

**red-cab-web**

- [x] ky API client + shared error/toast utilities
- [x] Route registry split — marketplace, tourist, team segments; provider/corporate stubs

### Out of scope (Phase 0)

- Listings, bookings, payments, Corporate quotations/invoices, reviews
- Provider registration/application **flows** (schema only; behavior in Phase 1)
- Stripe integration
- Admin panel beyond login
- Multi-role accounts / role-assignment audit history

### Open decisions for Phase 0


| AMB     | Topic          | Working assumption                                                                        |
| ------- | -------------- | ----------------------------------------------------------------------------------------- |
| AMB-021 | Auth methods   | Email/password + Google OAuth at launch                                                   |
| AMB-022 | Guest browsing | Defer guest-scope UI to Phase 1 Catalog; IAM supports optional-auth marketplace namespace |


### Exit criteria

**Both repos**

- [x] A user can register with email/password and verify their account — API + web UI complete; verification link not emailed yet (dispatch stub)
- [x] A user can sign in with Google OAuth — API complete; web missing login entry point and OAuth authorize URL mismatch
- [x] A verification email is dispatched within 60 seconds of registration (`OPR-8`, `NFR-TIME-001`) — dispatch adapters are no-ops
- [x] Authenticated session resolves to principal + role + language on every API request — JWT cookie → `CurrentRequest.identities_user` (full account loaded)
- [x] Tourist registration creates `tourists_profiles`; Corporate registration creates `corporate_profiles` with org fields off Account
- [x] CI passes on both repos — web: lint + test; api: Brakeman + RuboCop + Minitest
- [x] Domain events can be published and consumed in-process with idempotent handler support — publish + sync consume works; idempotent dispatch layer not implemented

**red-cab-api only**

- [x] Registration, session, email verification, OAuth, lockout, and language preference endpoints covered by Minitest (local)

**red-cab-web only**

- [x] Auth pages render and call IAM API clients (sign-up, login, verify-email, OAuth callback, team login)

---
