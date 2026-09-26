---
title: Code map
sidebar_label: 9. Code map
sidebar_position: 9
description: Every authentication file in red-cab-api and red-cab-web, grouped the way the series pages are, with today's files and the target files side by side.
---

## TL;DR

- One table per series page. Each row is a file, its role, and its status: **exists**, **target (new)**, **changes**, or **deleted**.
- Paths are relative to each repo root.
- When a PR adds, moves, or deletes an auth file, it updates this page in the same docs PR as its spec.

:::info Three rules

1. **No cookie, no call.** `app/auth/auth-session-cookies.js` is the only place that knows cookie names on the web.
2. **Only `401` means signed out.** `app/auth/auth-*-session-middleware.js` is the only place that turns a `401` into `null`.
3. **Node reads, the browser writes.** Session-changing API modules are called only from browser code.

:::

## Words this page uses

| Status | Meaning |
| --- | --- |
| exists | In the audited code today (`red-cab-web@c4ce884`, `red-cab-api@d8ed9b7`) |
| target (new) | Created by a roadmap phase |
| changes | Exists; a roadmap phase edits it |
| deleted | Removed by a roadmap phase |

## 1. What the web knows — cookies, principals, endpoints

| Repo | File | Role | Status |
| --- | --- | --- | --- |
| api | `app/controllers/concerns/session_principal.rb` | Cookie names, namespaces, payload keys for `ACCOUNT` and `TEAM` | exists |
| api | `app/controllers/concerns/session_cookie_manager.rb` | Login, refresh, logout, cookie writes, per-request cookie aliasing | exists |
| api | `config/initializers/jwt_sessions.rb` | Encryption key, Redis store | changes (Phase 0: explicit lifetimes) |
| api | `app/domains/identities/users_account_base_serializer.rb` | Account JSON shape | exists |
| api | `app/domains/identities/team_admin_base_serializer.rb` | Admin JSON shape | exists |
| web | `app/domains/identities-account/identities-account-constant.js` | `ACCOUNT_ROLE` | exists |
| web | `app/auth/auth-session-cookies.js` | `hasAccountSessionCookie`, `hasAdminSessionCookie` | target (new) |

## 2. Reading the session

| Repo | File | Role | Status |
| --- | --- | --- | --- |
| web | `app/roots/public-root.jsx` | Account virtual root. Today: loader calls `current`, `catch` → `null` | changes (Phase 0, Phase 3) |
| web | `app/roots/team-root.jsx` | Admin virtual root | changes (Phase 0, Phase 3) |
| web | `app/auth/auth-account-session-middleware.js` | One lazy read per request; refresh scope; `Set-Cookie`; `Cache-Control` | target (new) |
| web | `app/auth/auth-admin-session-middleware.js` | Same for admin | target (new) |
| web | `app/hooks/use-auth.jsx` | `AuthProvider`, `useAuth` | changes (Phase 3: read-only) |
| web | `app/hooks/use-admin-auth.jsx` | `AdminAuthProvider`, `useAdminAuth` | changes (Phase 3: read-only) |
| web | `app/api/identities-accounts-api.js` | `current`, `update`, verification | changes (Phase 0: refresh scope option) |
| web | `app/api/team-sessions-api.js` | `create`, `current`, `destroy` | changes (Phase 0) |

## 3. Changing a session

| Repo | File | Role | Status |
| --- | --- | --- | --- |
| api | `app/controllers/identities/sessions_controller.rb` | Account login, refresh, logout | exists |
| api | `app/controllers/team/identities/admins/sessions_controller.rb` | Admin login, refresh, logout | exists |
| api | `app/controllers/identities/oauth/google_controller.rb` | OAuth start and callback; issues cookies | exists |
| api | `app/domains/identities/sessions/create_manager.rb` | Credentials, lockout, archived check | exists |
| api | `app/domains/identities/password_resets/confirm_manager.rb` | Reset + `RevokeAllService` | exists |
| api | `app/domains/identities/accounts/provision_service.rb` | One provisioning path (password, OAuth) | exists |
| web | `app/api/ky-client.js` | CSRF header, refresh-on-`401`, SSR cookie forwarding | changes (Phase 0: per-request refresh lock, R3) |
| web | `app/api/identities-sessions-api.js` | `create`, `destroy` | exists |
| web | `app/api/identities-oauth-api.js` | `googleAuthorizeUrl`, `googleCallback` | exists |
| web | `app/hooks/use-identities-logout.jsx` | Logout hook | deleted (Phase 3, replaced by `logout` action route) |
| web | `app/routes/identities-account/logout.js` | `clientAction` logout route | target (new, Phase 3) |
| web | `app/routes/team/team-logout.js` | Team logout route | target (new, Phase 3) |
| web | `app/routes/identities-account/login-page.jsx` | Login submit | changes (Phase 3: `clientAction`) |
| web | `app/routes/provider/provider-login-page.jsx`, `app/routes/corporate/corporate-login-page.jsx` | Portal logins | changes (Phase 3) |
| web | `app/routes/team/team-login-page.jsx` | Team login. Today: unchecked `redirect_to` | changes (Phase 0, Phase 3) |
| web | `app/routes/identities-account/google-oauth-callback-page.jsx` | OAuth callback page | changes (Phase 3: `postAuthPath`) |

## 4–5. Policy routes and middleware

| Repo | File | Role | Status |
| --- | --- | --- | --- |
| web | `app/routes.js` | Route tree | changes (Phase 3, Phase 4) |
| web | `app/marketplace.routes.js` | Public + guest + open routes today | changes (Phase 3: split groups) |
| web | `app/tourist.routes.js` | `/account/**` + legacy redirects | changes (Phase 3: move legacy redirects out) |
| web | `app/corporate.routes.js`, `app/provider.routes.js`, `app/team.routes.js` | Surface groups | changes (Phase 3–4, paths unchanged) |
| web | `app/auth/auth-account-guard.js` | `protect(rule)` for account rules | target (new) |
| web | `app/auth/auth-admin-guard.js` | `protect(rule)` for admin rules | target (new) |
| web | `app/routes/policies/account-guest-policy.jsx` | Guest pages | target (new, Phase 3) |
| web | `app/routes/policies/tourist-required-policy.jsx` | `/account/**` | target (new, Phase 3) |
| web | `app/routes/policies/admin-guest-policy.jsx` | `/team/login` | target (new, Phase 3) |
| web | `app/routes/policies/admin-required-policy.jsx` | `/team/**` | target (new, Phase 3) |
| web | `app/routes/policies/corporate-required-policy.jsx` | `/corporate/**` | target (new, Phase 4) |
| web | `app/routes/policies/provider-required-policy.jsx` | `/providers/**` | target (new, Phase 4) |
| web | `app/layouts/team/team-layout.jsx` | Today: `useEffect` login redirect | changes (Phase 3: guard removed) |
| web | `app/components/hocs/with-tourist-auth.jsx` | HOC | deleted (Phase 4 last PR) |
| web | `app/components/hocs/with-no-auth.jsx` | HOC. Today: unchecked `redirect_to` | changes (Phase 0), deleted (Phase 4) |
| web | `app/components/hocs/with-corporate-auth.jsx`, `with-provider-auth.jsx` | HOCs | deleted (Phase 4) |

## 6. Entry rules

| Repo | File | Role | Status |
| --- | --- | --- | --- |
| web | `app/auth/auth-entry-rules.js` (+ `.spec.js`) | `accountGuest`, `touristRequired`, `corporateRequired`, `providerRequired` | target (new) |
| web | `app/auth/auth-admin-entry-rules.js` (+ `.spec.js`) | `adminGuest`, `adminRequired` | target (new) |
| web | `app/auth/auth-safe-redirect.js` (+ `.spec.js`) | `internalPathOrDefault`, `loginRedirectPath`, `redirectTarget`, `postAuthPath` | target (new, Phase 0) |
| web | `app/utils/identities-auth-utils.js` | Role homes, today's post-auth resolver, OAuth redirect storage | changes (Phase 0: delegate to `auth-safe-redirect`); role-home map stays |

## 7. Rails is the boundary

| Repo | File | Role | Status |
| --- | --- | --- | --- |
| api | `app/controllers/identities/users/authenticated_controller.rb` | Account authN + active check | exists |
| api | `app/controllers/team/authenticated_controller.rb` | Admin authN + active check | exists |
| api | `app/controllers/marketplace/base_controller.rb` | Optional auth | exists |
| api | `app/controllers/tourists/base_controller.rb` | Tourist portal gate | changes (Phase 0: `403`) |
| api | `app/controllers/corporate/base_controller.rb` | Corporate portal gate | changes (Phase 0: `403`) |
| api | `app/controllers/providers/base_controller.rb` | Provider portal gate + approval | changes (Phase 0: `403`) |
| api | `app/shared/errors/forbidden_error.rb` | `Errors::ForbiddenError` (`403`) | target (new, Phase 0) |
| api | `app/models/current_request.rb` | Per-request principal and profiles | exists |
| web | `app/domains/providers-profile/providers-profile-service.js` | Onboarding redirect. Today: `401` + title match | changes (Phase 0: `403` code) |
| web | `app/errors/api-error.js` | `ApiError` with `status`, `code`, `title` | exists |

## Routes (API)

| File | Auth-related routes |
| --- | --- |
| `config/routes/identities_routes.rb` | `accounts/current` (GET, PATCH), `sessions` (POST), `sessions/current` (PATCH, DELETE), `oauth/google`, `email_verifications/*`, `password_resets/*` |
| `config/routes/team_routes.rb` | `team/identities/admins/current` (GET), `team/identities/admins/sessions` (POST), `…/sessions/current` (PATCH, DELETE) |
| `config/routes/{tourists,corporate,providers}_routes.rb` | Actor signup `POST {actor}/identities/accounts` |

## Tests

| Repo | Path | Covers |
| --- | --- | --- |
| api | `test/integration/identities/sessions/*` | Login, refresh, logout |
| api | `test/integration/identities/accounts/*` | `current` read and update |
| api | `test/controllers/team/identities/admins/sessions_controller_test.rb` | Admin sessions |
| api | `test/integration/auth_contract/*` | target (new, Phase 0): one test per contract-sheet row |
| web | `app/auth/*.spec.js` | target (new): one test per entry-rule row |
| web | `app/api/ky-client.spec.js` | target (new, Phase 0): concurrent SSR refresh isolation |

## Related documents

- Previous: [Worked examples](/docs/engineering/authentication/worked-examples)
- [Appendix A — entry rules specification](/docs/engineering/authentication/appendix-entry-rules-spec)
- [Appendix B — contract sheet](/docs/engineering/authentication/appendix-web-api-contract)
