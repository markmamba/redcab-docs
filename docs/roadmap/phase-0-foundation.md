---
title: Phase 0 — Foundation
sidebar_label: Phase 0
sidebar_position: 2
description: Runnable repos, IAM, role profiles, event bus, and NOT stub.
---

## TL;DR

- **Foundation:** runnable repos, thin IAM + role profiles, actor-scoped signups, in-process domain events, NOT mostly wired.
- Delivers identity/profile schema without marketplace flows (no listings, bookings, or Stripe).
- Core deliverables met; post-audit follow-up items tracked separately below.

## About this document

Phase 0 deliverables, out-of-scope items, open decisions, exit criteria, and post-audit follow-up.

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

### Audit history

| Date | Scope | Notes |
| --- | --- | --- |
| 2026-07-25 | Initial verification | Identity profile redesign; monolithic `POST identities/accounts/register` and single web sign-up page |
| 2026-08-09 | Actor-scoped signups | Tourist, Provider, and Corporate signups split on API and web; deliverables refreshed; gaps moved to [Post-audit follow-up](#post-audit-follow-up) |

> **Last verified:** 2026-08-09 against `red-cab-api/` and `red-cab-web/` (actor-scoped signups).

### Goal

Establish the implementation workspace so all subsequent phases build on a consistent foundation — including a thin IAM principal, role-extension profiles, and **actor-scoped account signups** (one route per marketplace role).

### Actor-scoped signups

Signup uses **HTTP CRUD mapping** — never verb paths like `/register`. Each actor gets its own `POST …/identities/accounts` endpoint; the route implies the role (the client does not send `role`).

| Actor | API route | Profile created at signup | Web route |
| --- | --- | --- | --- |
| Tourist | `POST tourists/identities/accounts` | `tourists_profiles` | `/tourists/sign-up` |
| Corporate Client | `POST corporate/identities/accounts` | `corporate_profiles` (`organization_name`, `group_size_range`) | `/corporate/sign-up` |
| Provider | `POST providers/identities/accounts` | **None** — `providers_profiles` is created in Phase 1 PRV (`POST providers/profiles`) | `/providers/sign-up` |

Shared IAM (sessions, OAuth, email verification, password reset, language preference) stays on `/identities/…` and `/team/…`. Google OAuth creates a **Tourist** account only.

Login (`/login`) links to all three sign-up pages and exposes Google sign-in.

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

- [x] Actor-scoped account registration (email/password):
  - `POST tourists/identities/accounts` — Tourist + `tourists_profiles`
  - `POST corporate/identities/accounts` — Corporate + `corporate_profiles` (`FR-IAM-013`)
  - `POST providers/identities/accounts` — Provider credentials only (profile deferred to PRV)
- [x] Google OAuth sign-in — `GET identities/oauth/google`, callback handler, OmniAuth initializer (Tourist only)
- [x] Session-based JWT auth (cookie-based) — `jwt_sessions` + `SessionCookieManager` (`rc_access` / `rc_refresh`)
- [x] Thin `identities_accounts` — credentials, name, coarse `role` claim, language, lockout; **no** corporate org fields on Account
- [x] Coarse roles: Tourist, Corporate, Provider — `Identities::Account` string enum (Admin is **not** a value)
- [x] Admin identity — separate `Identities::Admin` model + `POST team/identities/admins/sessions`
- [x] Tourist profile — `tourists_profiles` created on Tourist registration and Google OAuth tourist signup
- [x] Corporate Client profile — `corporate_profiles` (`organization_name`, `group_size_range`) created on Corporate registration
- [x] Provider profile schema — `providers_profiles` + type-detail / license / document / support-trial tables in DBML + migrations (PRV application flows land in Phase 1)
- [x] Language preference — account column + `PATCH identities/accounts/language_preference` (captured on **first login**, not signup — `FR-IAM-010`)
- [x] Account lockout (`OPR-1`) — `LockoutPolicy` (5 attempts / 15 min) wired in session create
- [x] Email verification flow — confirm + resend endpoints, token model, registration issues token
- [x] `GET identities/accounts/current` — SSR principal hydration
- [x] `PATCH identities/sessions/current` — JWT refresh
- [x] `DELETE identities/sessions/current` — logout (alias; legacy `DELETE identities/sessions` retained)
- [x] Team session `GET/PATCH/DELETE …/sessions/current`
- [x] Password reset request + confirm — `POST identities/password_resets/request`, `PATCH identities/password_resets/confirm`

**red-cab-web**

- [x] Tourist sign-up page — `/tourists/sign-up` → `POST tourists/identities/accounts`; Google sign-up on same page
- [x] Corporate sign-up page — `/corporate/sign-up` → `POST corporate/identities/accounts` (org name + group size)
- [x] Provider sign-up page — `/providers/sign-up` → `POST providers/identities/accounts`
- [x] Login page — email/password session create; links to all three sign-up routes; Google sign-in
- [x] Verify-email page — token confirm + resend
- [x] Google OAuth callback page wired
- [x] Forgot-password flow — request form calls `POST identities/password_resets/request`
- [x] Auth HOCs — `withNoAuth`, `withTouristAuth`, `withProviderAuth`, `withCorporateAuth`
- [x] Session state — `useAuth`, ky API clients, cookie passthrough
- [x] Language preference — first-login prompt modal on tourist portal layout + account settings (`PATCH identities/accounts/language_preference`); **not** on sign-up forms
- [x] Team admin login — `/team/login` + dashboard shell
- [x] Provider / Corporate portal routes — route files and layouts exist; authenticated route arrays mostly empty

#### Notifications (`NOT`)

**red-cab-api**

- [x] Domain-event subscription framework — in-process `Shared::DomainEvents::Publisher` with handler map
- [x] `notifications_dispatches` table + idempotent enqueue pipeline
- [x] Account verification email — `AccountRegistered` → `EnqueueManager` → Sidekiq `ProcessJob` → mailer
- [~] Password-reset and account-lockout email dispatch — enqueue managers still stubbed

**red-cab-web**

- [x] Verification email UX — user follows link from email after registration

#### Cross-cutting

**red-cab-api**

- [x] In-process domain event bus — `Shared::DomainEvents::Publisher` (publish → synchronous handler)
- [x] Background job runtime — Sidekiq + Redis for Active Job; `bin/jobs` starts Sidekiq worker
- [x] Error response format — `Errors::*` hierarchy per [../engineering/backend-conventions.md](/docs/engineering/backend-conventions)
- [x] DBML + migrations for identity/profile foundation:
  - `docs/db/identities.dbml`, `tourists.dbml`, `corporate.dbml` (corporate client only), `providers.dbml`, `notifications.dbml`, `redcab.dbml`
  - Thin Account + role-extension profiles (see **Actor-scoped signups** above)

**red-cab-web**

- [x] ky API client + shared error/toast utilities
- [x] Route registry split — marketplace, tourist, provider, corporate, team segments

### Post-audit follow-up

> **Audited:** 2026-08-09 — separated from [Deliverables](#deliverables) so initial Phase 0 scope stays distinct from gaps found during implementation.

These items were **not** part of the original Phase 0 checklist or need product/engineering decisions before closing:

| Item | Repo | Status | Notes |
| --- | --- | --- | --- |
| Login without email verification | API | Open | `Sessions::CreateManager` does not gate on `is_email_verified` |
| Provider two-step onboarding | API | By design | Brief window where `role=provider` but no `providers_profiles` row exists between account signup and `POST providers/profiles` (Phase 1 PRV) |
| Language prompt on corporate/provider portals | Web | Open | First-login modal mounted on tourist layout only; reuse when those portals ship authenticated routes |
| OAuth for Corporate / Provider | API + Web | Deferred | Google callback always creates Tourist; no corporate/provider OAuth path |
| Password-reset email dispatch | API | Stub | Request/confirm endpoints work; `PasswordResetRequested` enqueue manager not wired to mailer |
| Duplicate-email error shape | API | Open | Tourist uses array field errors; corporate/provider shapes differ — normalize when touching validators |
| Provider `DUPLICATE_EMAIL_MESSAGE` constant | API | Open | Tourist manager defines shared constant; provider uses inline string — align for test consistency |
| Actor signup controller 422 tests | API | Open | Happy-path + dispatch tests exist; validation failure coverage thin for corporate/provider |
| Cross-role duplicate email | API | Open | Same email on tourist then corporate signup — not covered by tests |

### Out of scope (Phase 0)

- Listings, bookings, payments, Corporate quotations/invoices, reviews
- Provider registration/application **flows** beyond account credentials (schema + `POST providers/profiles` land in Phase 1)
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

- [x] A Tourist can register with email/password and verify their account — API + `/tourists/sign-up`
- [x] A Corporate Client can register with email/password — API + `/corporate/sign-up`; org fields on `corporate_profiles`
- [x] A Provider can register account credentials — API + `/providers/sign-up`; `providers_profiles` deferred to Phase 1 PRV
- [x] A user can sign in with Google OAuth — Tourist account; login and tourist sign-up expose Google
- [x] A verification email is dispatched within 60 seconds of registration (`OPR-8`, `NFR-TIME-001`)
- [x] Authenticated session resolves to principal + role + language on every API request — JWT cookie → `CurrentRequest.identities_user` (full account loaded)
- [x] CI passes on both repos — web: lint + test; api: Brakeman + RuboCop + Minitest
- [x] Domain events can be published and consumed in-process — `AccountRegistered` → verification dispatch wired

**red-cab-api only**

- [x] Actor-scoped registration, session, email verification, OAuth, lockout, and language preference endpoints covered by Minitest

**red-cab-web only**

- [x] Auth pages render and call IAM API clients (tourist/corporate/provider sign-up, login, verify-email, OAuth callback, forgot-password request, team login)

---
