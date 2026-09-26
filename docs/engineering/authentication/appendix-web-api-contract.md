---
title: "Appendix B — Web↔API authentication contract"
sidebar_label: "B. Contract sheet"
sidebar_position: 21
description: One sheet of every authentication endpoint between red-cab-web and red-cab-api — method, cookie namespace, CSRF, response shape, what 401 and 403 mean, and which web code uses it.
---

## TL;DR

- This sheet is the contract. A PR that changes any row updates this page and the matching contract test in the same change.
- `red-cab-api` must have one integration test per row (Phase 0, `test/integration/auth_contract/`).
- "Target" columns apply after the Phase 0 API change (ADR-018 D4). Until then, portal-gate failures answer `401`.

:::info Three rules

1. **No cookie, no call.** Rows marked "Session read" are never called by Node without a session cookie.
2. **Only `401` means signed out.** The "401 means" column is the only place a session can end.
3. **Node reads, the browser writes.** The "Caller runtime" column never says Node for a non-`GET`, except refresh.

:::

## Words this sheet uses

| Word | Meaning |
| --- | --- |
| `ACCOUNT` | Cookies `rc_access`, `rc_refresh`, `CSRF_TOKEN`; namespace `identities_account:<uuid>` |
| `TEAM` | Cookies `rc_team_access`, `rc_team_refresh`, `TEAM_CSRF_TOKEN`; namespace `identities_admin:<uuid>` |
| CSRF | `X-CSRF-Token` header must equal the masked token in the CSRF cookie |
| Account JSON | `{ uuid, email, first_name, last_name, role, language_preference, is_email_verified, should_prompt_language }` |
| Admin JSON | `{ uuid, email, name }` |
| Error JSON | `{ status_name, status, messages, code, title, server }` (`ApplicationController#base_error`) |

## Account principal and sessions

| Endpoint | Method | Cookies | CSRF | Success | `401` means | `403` means | Caller runtime | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `identities/accounts/current` | GET | `ACCOUNT` access | No | `200` Account JSON | Not signed in, token invalid, or account not active | — | Node (session read), browser | `authAccountSession.middleware` (target); `public-root.jsx` loader (today) |
| `identities/accounts/current` | PATCH | `ACCOUNT` access | **Yes** | `200` Account JSON | Signed out | — | Browser | Account settings `clientAction` |
| `identities/sessions` | POST | none | No | `201` Account JSON + sets `ACCOUNT` cookies | — (bad credentials and lockout are `422`) | — | Browser | Login `clientAction` (target); login page submit (today) |
| `identities/sessions/current` | PATCH | `ACCOUNT` access (may be expired) | **Yes** | `200` Account JSON + new access + CSRF cookies | Refresh impossible: signed out | — | Browser; Node inside session middleware only | `ky-client` `apiClient` refresh |
| `identities/sessions/current` | DELETE | `ACCOUNT` access | **Yes** | `200 { message }`, clears `ACCOUNT` cookies, flushes namespace | Already signed out (treat as success) | — | Browser | `logout` action route (target); `useIdentitiesLogout` (today) |
| `identities/oauth/google` | GET | none | No | `200 { authorization_url }` | — | — | Browser | Login pages |
| `identities/oauth/google/callback` | POST | none | No | `200 { account }` + sets `ACCOUNT` cookies | — (failures are `422`) | — | Browser | `google-oauth-callback-page.jsx` |
| `{tourists,corporate,providers}/identities/accounts` | POST | none | No | `201` Account JSON, **no cookies** | — | — | Browser | Sign-up pages |
| `identities/email_verifications/confirm` | POST | none | No | `200` | — | — | Browser | `/verify-email` |
| `identities/email_verifications/resend` | POST | none | No | `200` | — | — | Browser | `/verify-email` |
| `identities/password_resets/request` | POST | none | No | `200` (same for unknown email) | — | — | Browser | `/forgot-password` |
| `identities/password_resets/confirm` | PATCH | none | No | `200`, **revokes all sessions** | — | — | Browser | `/reset-password` |

## Team admin principal and sessions

| Endpoint | Method | Cookies | CSRF | Success | `401` means | `403` means | Caller runtime | Used by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `team/identities/admins/current` | GET | `TEAM` access | No | `200` Admin JSON | Not signed in as admin | — | Node (session read), browser | `authAdminSession.middleware` (target); `team-root.jsx` loader (today) |
| `team/identities/admins/sessions` | POST | none | No | `201` Admin JSON + sets `TEAM` cookies | — (`422` on bad credentials) | — | Browser | `team-login-page.jsx` |
| `team/identities/admins/sessions/current` | PATCH | `TEAM` access (may be expired) | **Yes** | `200` Admin JSON + new `TEAM` access + CSRF | Signed out | — | Browser; Node inside admin session middleware only | `ky-client` `teamApiClient` refresh |
| `team/identities/admins/sessions/current` | DELETE | `TEAM` access | **Yes** | `200 { message }`, clears `TEAM` cookies | Already signed out | — | Browser | `team/logout` action route (target) |

## Actor namespaces (portal gates)

| Namespace | Auth | `401` means | `403` today | `403` target | Used by |
| --- | --- | --- | --- | --- | --- |
| `marketplace/**` | Optional `ACCOUNT` | **Never** for session reasons. Expired or missing token → served as guest | — | — | Public catalog server loaders; checkout `clientLoader` quote read |
| `tourists/**` | Required `ACCOUNT` + tourist profile | Signed out | none (answers `401` "This area is for tourist accounts…") | `403 tourist_profile_required` | Checkout, bookings `clientLoader`s |
| `corporate/**` | Required `ACCOUNT` + corporate profile | Signed out | none (`401`) | `403 corporate_profile_required` | Client Portal |
| `providers/**` | Required `ACCOUNT` + provider profile | Signed out | none (`401` "Please complete provider registration…") | `403 provider_profile_required` | Provider pages; `ProvidersProfileService.fetchCurrent` |
| `providers/**` approval-gated actions | + `status_approved?` | Signed out | none (`401`) | `403 provider_approval_required` | Catalog authoring |
| `team/**` | Required `TEAM` | Signed out | — | Reserved for future admin permissions (`IAM-Q4`) | Team pages |

## Cookie attributes

| Attribute | Value | Source |
| --- | --- | --- |
| `httponly` | `true` for access and refresh; `false` for CSRF | `SessionCookieManager` |
| `secure` | `true` in production | same |
| `same_site` | `lax` | same |
| `path` | `/` | same |
| `domain` | host-only today. **Production value to be decided** (roadmap open question 1) | `ApplicationController#cookie_domain` (unused) |
| Expiry | Session cookies (no `Max-Age`). Token lifetime is inside the JWT | jwt_sessions |

## Token lifetimes

| Token | Value | Status |
| --- | --- | --- |
| Access | jwt_sessions default | **Must be set explicitly** (ADR-019) |
| Refresh | jwt_sessions default | **Must be set explicitly** (ADR-019) |

Record the chosen values here when the Phase 0 API spec lands.

## Contract test requirements

For each row above, `red-cab-api` tests assert:

1. Status code on success, and the exact JSON keys.
2. Cookies set or cleared, by name.
3. `401` without cookie; `401` without CSRF on non-`GET` rows marked CSRF.
4. For actor namespaces: `401` without cookie, `403` with the stated `code` for the wrong profile (after Phase 0).
5. For `marketplace/**`: `200` as guest with an **expired** access cookie.

`red-cab-web` tests assert, with a mocked API:

1. Session middleware makes **zero** calls without a cookie.
2. Session middleware returns `null` on `401` and throws on `403`, `500`, and network error.
3. Two concurrent SSR requests that both refresh never share `Set-Cookie` or response data.

## Related documents

- [Changing a session](/docs/engineering/authentication/changing-a-session)
- [Rails is the boundary](/docs/engineering/authentication/rails-is-the-boundary)
- [IAM audit §4.4 — target endpoint map](/docs/engineering/specs/iam/iam-audit-2026-08#44-target-endpoint-map)
