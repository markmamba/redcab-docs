---
title: "ADR-019: Session Technology for Phase 1 and Phase 2"
sidebar_label: ADR-019
sidebar_position: 19
description: Architecture decision record 019 — keep jwt_sessions cookie JWTs with refresh-by-access through Phase 2 start, with explicit refresh rules for red-cab-web; server-side sessions are deferred with named revisit triggers.
---

## TL;DR

- **Decision: Option A.** Keep `jwt_sessions` (cookie JWT, Redis store, refresh-by-access) through the tourist pre–Phase 2 track and the start of Phase 2.
- **Option B** (server-side sessions in PostgreSQL, no refresh) is **deferred**, not rejected. Named triggers reopen it.
- Refresh stays, under **eight refresh rules** (R1–R8). The most urgent: on Node, the refresh lock must be **per incoming request**. Today it is shared by every request in the process.
- The web enforcement model ([ADR-018](/docs/architecture/decisions/adr-018-web-authentication-enforcement-model)) does not depend on this choice. Policies and entry rules work with either option.
- Two settings must be written down, not left to library defaults: token lifetimes and the production cookie domain.

## Status

Proposed (2026-09-26). Becomes Accepted when the auth documentation series is approved (roadmap Phase 1).

## About this document

This ADR chooses the session technology for the account and team admin principals, and states how `red-cab-web` may refresh a session.

| Topic | Document |
| --- | --- |
| Web enforcement model | [ADR-018](/docs/architecture/decisions/adr-018-web-authentication-enforcement-model) |
| Identity posture | [ADR-010](/docs/architecture/decisions/adr-010-identity-and-authorization-architecture) |
| Backend auth conventions | [Backend conventions](/docs/engineering/conventions/backend) |
| Current session behaviour | [Changing a session](/docs/engineering/authentication/changing-a-session) |
| Web↔API contract | [Contract sheet](/docs/engineering/authentication/appendix-web-api-contract) |

---

## Context

### How sessions work today

Verified in `red-cab-api` at `d8ed9b7`.

| Fact | Evidence |
| --- | --- |
| `jwt_sessions` issues an access JWT and a refresh token. Tokens live in Redis (`jwt/` prefix) | `config/initializers/jwt_sessions.rb` |
| Payload holds only the principal UUID. Every request reloads the account and checks `status_active?` | `Identities::Users::AuthenticatedController`; IAM audit §3.1 |
| Cookies are `httponly`, `same_site: :lax`, `secure` in production, `path: '/'`, host-only | `SessionCookieManager#set_session_cookie` |
| CSRF cookie (`CSRF_TOKEN` / `TEAM_CSRF_TOKEN`) is readable by JS. Non-`GET` requests must echo it in `X-CSRF-Token` | `SessionCookieManager#set_csrf_cookie`; jwt_sessions CSRF check |
| Refresh is `PATCH …/sessions/current` with the expired access cookie (`refresh_by_access_allowed: true`) | `Identities::SessionsController#update` |
| Per-principal cookie names without global mutation (IAM audit PR-03 landed) | `SessionPrincipal::ACCOUNT`, `SessionPrincipal::TEAM`; `SessionCookieManager#request_cookies` |
| Password reset revokes all sessions (PR-02 landed) | `Identities::Sessions::RevokeAllService` call in `password_resets/confirm_manager.rb` |
| Access and refresh lifetimes are **not set**. Library defaults apply | `jwt_sessions.rb` sets no `access_exp_time` / `refresh_exp_time` |
| Production cookie domain is **not decided**. `cookie_domain` helper exists but is unused (IAM-27) | `ApplicationController#cookie_domain` |

### How `red-cab-web` refreshes today

`app/api/ky-client.js`:

1. Any response with status `401` and no `_retry` flag triggers `attemptTokenRefresh`.
2. `attemptTokenRefresh` dedupes through `refreshPromise`, a variable created **once per client module**.
3. On success, the browser retries. On Node, `handleServerSideRetry` copies the refresh response's `Set-Cookie` into the retry's `Cookie` header and adds the `Set-Cookie` to the returned response.
4. `public-root.jsx` and `team-root.jsx` copy those `Set-Cookie` headers into the document response.
5. Any refresh failure, including `5xx`, returns `false`. The original `401` then propagates.

**Finding (static reading, confirm with a concurrency test):** on Node, `refreshPromise` is shared across all concurrent SSR requests in the process. If visitor B's request gets a `401` while visitor A's refresh is in flight, B receives A's refresh response. B's retry then runs with A's cookies, and B's document response carries A's `Set-Cookie`. B can end up signed in as A. An anonymous visitor can hit the same path, because every anonymous root load gets a `401` and calls `attemptTokenRefresh`. This is a cross-user session leak. It is Phase 0 work in the [roadmap](/docs/engineering/authentication/implementation-roadmap).

### The reference pattern

The reference project moved to server-side sessions: an opaque signed cookie that names a database session row, no JWT, no refresh. The web never refreshes. It sends the cookie and acts on Rails's answer. That removes the refresh logic from the web entirely. It also required a full session model, a migration, and a change to every authenticated controller.

---

## Options

### Option A — Keep `jwt_sessions`, with written refresh rules

Keep the current API. Fix the web refresh path and write down its rules.

### Option B — Server-side sessions

Add `identities_account_sessions` and `identities_admin_sessions` tables (DBML first). The cookie holds a signed session id. Rails looks up the row on every request, checks expiry and revocation, and slides expiry. No refresh endpoint. `jwt_sessions` and its Redis store are removed.

Scope if chosen:

| Area | Work |
| --- | --- |
| Schema | Two session tables, `timestamptz` columns, indexes on token digest and principal |
| API | Replace `SessionCookieManager` internals, `authorize_session!`, login, logout, OAuth callback, `RevokeAllService`; delete `PATCH …/sessions/current` |
| Web | Delete refresh from `ky-client`; change cookie names in `auth-session-cookies.js` |
| Transition | Dual-read period: Rails accepts a valid JWT cookie **or** a session cookie. Login issues only the new cookie. JWT acceptance ends after the longest refresh lifetime |
| Tests | Rewrite session integration tests; add revocation and expiry tests |

### Tradeoffs

| Criterion | Option A — `jwt_sessions` | Option B — server sessions |
| --- | --- | --- |
| Work before Phase 2 | Small: one web fix, two config values, contract tests | Large: schema, API rewrite, web change, dual-read window |
| Risk to in-flight tourist work | None | Medium. Touches every authenticated request during the track |
| Web complexity | Refresh stays in `ky-client` (about 150 lines) under R1–R8 | Refresh deleted. Web only sends the cookie |
| Revocation | Immediate for lock/archive (per-request account reload). Password reset flushes the namespace | Immediate. Delete the row |
| "Sign out everywhere" | Possible today via namespace flush | Native |
| Device / session list | Hard. Redis keys only | Easy. Rows per device |
| Storage | Redis (already required for Sidekiq and cache) | PostgreSQL. One indexed read per request |
| Security posture after fixes | Good: `httponly`, `lax`, CSRF, short access token, per-request status check | Good, with less moving code |
| Fit with ADR-018 | Full | Full |

---

## Decision

**Option A.** Keep `jwt_sessions` through the tourist pre–Phase 2 track and the start of Phase 2.

Reasons:

1. The IAM audit found the session **shape** correct and fixed its correctness bugs (PR-01 to PR-08 are in the code). The remaining risk is on the web side, and a small fix removes it.
2. ADR-018 does not need Option B. Policies, entry rules, and the three invariants work the same with a refreshing JWT.
3. No current requirement needs server sessions. `FR-IAM-005` asks for "an authenticated session". Nothing in FR-IAM asks for a device list.
4. Option B during the tourist track would put every authenticated request at risk while pages are shipping.

### Refresh rules (binding on `red-cab-web` while Option A holds)

| # | Rule |
| --- | --- |
| R1 | Refresh is triggered **only** by an HTTP `401` on a request that carried a session cookie. The web never decodes a JWT, never reads `exp`, never refreshes on a timer |
| R2 | At most **one** refresh per incoming Node request, and at most one in flight per browser tab. On Node the lock lives in per-request router context, never in a module variable |
| R3 | A refresh that answers `401` means signed out. A refresh that fails with `5xx`, timeout, or network error is an **error**. It propagates as an error, never as "signed out" |
| R4 | On Node, only the session middleware's read of the current principal may refresh. Other server loaders call with refresh disabled and use the middleware's cookie header (`getCookieHeader()`), which holds the refreshed tokens |
| R5 | The session middleware appends refresh `Set-Cookie` headers once, to the outgoing document or `.data` response. Any response built while a session cookie was present gets `Cache-Control: private, no-store` |
| R6 | A request is retried at most once after refresh (`_retry`) |
| R7 | Node never sends a non-`GET` auth request other than the refresh itself (ADR-018 invariant 3). So the server path never needs a refreshed CSRF value |
| R8 | A `403` never triggers refresh. It needs the API change in ADR-018 D4 |

### Settings that must be explicit

| Setting | Required action | Owner |
| --- | --- | --- |
| Access and refresh lifetimes | Set `JWTSessions.access_exp_time` and `JWTSessions.refresh_exp_time` in `config/initializers/jwt_sessions.rb`. Record the values in the [contract sheet](/docs/engineering/authentication/appendix-web-api-contract) | API |
| Production cookie domain | Decide how Node on the web host receives API cookies (see open question in the [roadmap](/docs/engineering/authentication/implementation-roadmap#open-questions)). Record it here before any authenticated surface launches | Architect |

### Revisit triggers for Option B

Open a new ADR that supersedes this one when **any** of these happens:

1. A requirement asks for a device or session list, or per-device sign-out.
2. A second production incident is traced to refresh logic after the R1–R8 fix.
3. A mobile or third-party client needs the same session (currently out of scope).
4. Phase 2 exit review. Record the outcome either way.

---

## Consequences

### Positive

- No session migration during the tourist track.
- The cross-user leak closes with a small, testable web change.
- Refresh behaviour is written down and can be reviewed against eight rules.

### Negative

- The web keeps refresh code. It is the most delicate code in `ky-client.js` and needs a concurrency test.
- Every token expiry costs one extra round trip (`401`, refresh, retry).
- Option B, if chosen later, still needs a dual-read window.

---

## Alternatives considered

- **Option B now.** Rejected for timing, not design. See the tradeoff table.
- **Remove web refresh and accept a logout at every access-token expiry.** Rejected. People would be signed out mid-checkout (`NFR-SEC-005` requires auth at booking initiation, so checkout is always authenticated).
- **Long-lived access token, no refresh.** Rejected. It weakens revocation for anything the per-request status check does not cover, and it still needs lifetimes set explicitly.

## Related documents

- [ADR-010](/docs/architecture/decisions/adr-010-identity-and-authorization-architecture)
- [ADR-018](/docs/architecture/decisions/adr-018-web-authentication-enforcement-model)
- [IAM audit 2026-08](/docs/engineering/specs/iam/iam-audit-2026-08) — PR-02 (revocation), PR-03 (per-request cookie names)
- [Changing a session](/docs/engineering/authentication/changing-a-session)
