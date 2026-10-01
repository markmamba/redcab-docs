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
- The web enforcement model ([ADR-018](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model)) does not depend on this choice. Policies and entry rules work with either option.
- Two settings must be written down, not left to library defaults: token lifetimes and the production cookie `domain` (topology decided — see [Production cookie topology](#production-cookie-topology)).

## Status

**Accepted** (2026-09-30), via [redcab-docs#19](https://github.com/markmamba/redcab-docs/issues/19) and auth roadmap Phase 1.

**Production cookie topology** is decided in [Production cookie topology](#production-cookie-topology) ([redcab-docs#20](https://github.com/markmamba/redcab-docs/issues/20), gate **G1** documentation). **API wiring** of `domain:` on `SessionCookieManager` is follow-on [red-cab-web#77](https://github.com/markmamba/red-cab-web/issues/77) — ship before first authenticated production traffic. Access and refresh lifetimes are decided (`3600` / `604800` in `jwt_sessions.rb` and the [contract sheet](/docs/90-99-engineering-meta/authentication/appendix-web-api-contract)).

## About this document

This ADR chooses the session technology for the account and team admin principals, and states how `red-cab-web` may refresh a session.

| Topic | Document |
| --- | --- |
| Web enforcement model | [ADR-018](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) |
| Identity posture | [ADR-010](/docs/30-49-domains/architecture-decisions/adr-010-identity-and-authorization-architecture) |
| Backend auth conventions | [Backend conventions](/docs/20-29-backend/conventions/backend) |
| Current session behaviour | [Changing a session](/docs/90-99-engineering-meta/authentication/changing-a-session) |
| Web↔API contract | [Contract sheet](/docs/90-99-engineering-meta/authentication/appendix-web-api-contract) |

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
| Production cookie `domain` is **not wired** in code yet (host-only today). Value comes from **configuration per identity system**, not `request.host` — see [Production cookie topology](#production-cookie-topology) and [contract sheet](/docs/90-99-engineering-meta/authentication/appendix-web-api-contract) | `SessionCookieManager#set_session_cookie` / `#set_csrf_cookie` (no `domain:` today); follow-on #77 |

### How `red-cab-web` refreshes today

`app/api/ky-client.js`:

1. Any response with status `401` and no `_retry` flag triggers `attemptTokenRefresh`.
2. `attemptTokenRefresh` dedupes through `refreshPromise`, a variable created **once per client module**.
3. On success, the browser retries. On Node, `handleServerSideRetry` copies the refresh response's `Set-Cookie` into the retry's `Cookie` header and adds the `Set-Cookie` to the returned response.
4. `public-root.jsx` and `team-root.jsx` copy those `Set-Cookie` headers into the document response.
5. Any refresh failure, including `5xx`, returns `false`. The original `401` then propagates.

**Finding (2026-09-26 audit at `c4ce884`):** on Node, a module-level `refreshPromise` could leak cookies across concurrent SSR requests (risk **R-1**). **Closed** by web-78 (`dbd036c`): per-request refresh scope on Node. The 2026-09-26 wording is kept here as audit history; current state is in the roadmap [Where things stand](/docs/90-99-engineering-meta/authentication/implementation-roadmap#where-things-stand).

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
| Access and refresh lifetimes | Set `JWTSessions.access_exp_time` and `JWTSessions.refresh_exp_time` in `config/initializers/jwt_sessions.rb`. Record the values in the [contract sheet](/docs/90-99-engineering-meta/authentication/appendix-web-api-contract) | API |
| Production cookie `domain` | **Decided** — parent-domain cookies per identity system ([Production cookie topology](#production-cookie-topology)). Implement `domain:` in API config ([#77](https://github.com/markmamba/red-cab-web/issues/77)) before launch | API |

### Production cookie topology

**Decision (2026-09-30, [#20](https://github.com/markmamba/redcab-docs/issues/20)):** use **parent-domain cookies**. For each identity system, the API sets `Set-Cookie` with a `Domain` attribute that covers **both** that system's browser origin (SSR) **and** its public API origin. That lets Node forward `document.cookie` to the API on SSR, and lets the browser send `credentials: 'include'` cross-origin while still reading the CSRF cookie on the web origin.

Account and team admin use **different registrable domains** in production ([ADR-010](/docs/30-49-domains/architecture-decisions/adr-010-identity-and-authorization-architecture), **NFR-SEC-004**). Team admin cookies are **not** under `.redcab.com`.

#### Topology options considered

| Option | Mechanism | SSR cookie visibility | Browser XHR + CSRF | CORS | Node refresh `Set-Cookie` → document | Typical `VITE_API_*` |
| --- | --- | --- | --- | --- | --- | --- |
| **Parent-domain cookies** (**chosen**) | API sets `Domain` per identity parent | Document `Cookie` includes session cookies when logged in via API host | `credentials: include`; CSRF readable on web origin when `Domain` covers web+API | Credentialed allowlist per web origin | Suffix match: parent-domain cookies on web response OK (R4–R5) | `VITE_API_REDCAB_URL` → `https://api.redcab.com`; `VITE_API_TEAM_URL` → team API on **admin** parent |
| Same-origin API path | Ingress `/api/*` on web host | Cookies on web host | Same-origin | Not required for browser `/api` | Cookies already on web host | Relative or web-origin `/api` base |
| Node proxy (BFF) | Browser → web only | Depends on cookie host | CSRF on web origin if cookies set there | Browser same-origin | Risk: foreign API `Set-Cookie` dropped on document response | Internal API URL on Node |

**Rejected:**

- **Same-origin API path** — every web surface needs ingress/path routing to the API; duplicates origins and complicates cache and rollout.
- **Node proxy (BFF)** — splits public API URL from browser URL; refresh `Set-Cookie` from the upstream API is easy to drop when building the document response.

#### Production host layout (normative)

| Identity system | Browser origin (SSR) | Public API origin | Cookie `Domain` | Cookies |
| --- | --- | --- | --- | --- |
| **Account** (marketplace, tourist, corporate, provider) | `https://redcab.com` | `https://api.redcab.com` | `.redcab.com` | `rc_*`, `CSRF_TOKEN` |
| **Team admin** | `https://<admin-portal-host>` | `https://<admin-api-host>` | `.<admin-registrable-domain>` | `rc_team_*`, `TEAM_CSRF_TOKEN` |

**Open setting:** replace `<admin-portal-host>`, `<admin-api-host>`, and `<admin-registrable-domain>` when DNS for the admin registrable domain is fixed. Account hosts above are **literal** for production.

**Binding rules:**

1. `Domain` is set from **configuration per identity system** (`SessionPrincipal::ACCOUNT` vs `SessionPrincipal::TEAM`), never derived from `request.host`.
2. Each `Domain` must cover that system's **web SSR origin and API origin**.
3. **CORS** on each API must list every browser origin that calls it with `credentials: true` (minimum `https://redcab.com` on the account API; the team portal origin on the team API). First-party product subdomains on the account parent are allowed; do **not** put vendor-hosted sites on `*.redcab.com` (CSRF and cookie scope).
4. **Delete cookie** (logout) must use the same `domain` and `path` as set.
5. **Account parent subdomains:** enumerate allowed first-party hosts in CORS; CSRF mitigates scripts on other `*.redcab.com` hosts that share the parent.
6. **Cache:** when a session cookie is present on a document or `.data` response, set `Cache-Control: private, no-store` (refresh rules R5; roadmap R-6). No HTML CDN on account SSR today; the rule still applies if a shared cache sits in front of authenticated HTML.

**Cutover:** no production authenticated sessions exist yet. Ship API `domain:` before the first authenticated production launch — no cookie migration window.

**Implementation follow-on:** [red-cab-web#77](https://github.com/markmamba/red-cab-web/issues/77) — add `domain:` to `SessionCookieManager` set, CSRF set, and delete; per principal and per environment (`nil` in dev/test). Update `config/initializers/cors.rb` for team portal and any first-party account subdomains.

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
- Parent-domain cookies on `.redcab.com` share scope across first-party subdomains; CORS allowlisting and CSRF remain mandatory (**NFR-SEC-004** isolates team admin on a separate registrable domain).
- Cross-origin credentialed API calls require explicit CORS maintenance when new browser origins ship.

---

## Alternatives considered

- **Option B now.** Rejected for timing, not design. See the tradeoff table.
- **Remove web refresh and accept a logout at every access-token expiry.** Rejected. People would be signed out mid-checkout (`NFR-SEC-005` requires auth at booking initiation, so checkout is always authenticated).
- **Long-lived access token, no refresh.** Rejected. It weakens revocation for anything the per-request status check does not cover, and it still needs lifetimes set explicitly.

## Related documents

- [ADR-010](/docs/30-49-domains/architecture-decisions/adr-010-identity-and-authorization-architecture)
- [ADR-018](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model)
- [IAM audit 2026-08](/docs/60-69-initiatives/implementation-specs/iam/iam-audit-2026-08) — PR-02 (revocation), PR-03 (per-request cookie names)
- [Changing a session](/docs/90-99-engineering-meta/authentication/changing-a-session)

## Amendments

- **2026-09-30 ([#20](https://github.com/markmamba/redcab-docs/issues/20)):** Recorded [Production cookie topology](#production-cookie-topology) (parent-domain cookies; account on `redcab.com` / `api.redcab.com`; team admin on a separate registrable domain). Closed roadmap open question 1. Corrected stale `ApplicationController#cookie_domain` references — wiring is `SessionCookieManager` + config ([#77](https://github.com/markmamba/red-cab-web/issues/77)).
