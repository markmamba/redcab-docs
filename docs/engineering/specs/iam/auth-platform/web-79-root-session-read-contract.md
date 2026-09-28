---
title: "Root session read contract (auth Phase 0)"
sidebar_label: Web · root session read
issue: "https://github.com/markmamba/red-cab-web/issues/79"
repos:
  - red-cab-web
status: approved
phase: 0
context: IAM
depends_on:
  - "docs/engineering/authentication/reading-the-session.md"
  - "docs/engineering/specs/iam/auth-platform/web-78-ssr-refresh-request-scope.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** Root loaders skip session `…/current` when no session cookies; only HTTP **401** on session read → `null`; other failures throw to root `ErrorBoundary` **but still carry any rotated `Set-Cookie` from a successful refresh**; session-read call opts out of ky's default 5xx retry to bound loader latency; `Cache-Control: private, no-store` when session cookies present on successful loader responses; Vitest loader tests including zero-call anonymous path, rotated-cookie-on-throw, and single-attempt-on-5xx.
- **Does NOT ship:** Session middleware (`app/auth/*-session-middleware.js`), policy route middleware, `shouldRevalidate` `actionStatus` changes, Rails changes.
- **Breaking change:** Yes (UX) — API **503** / network errors at root no longer render guest marketplace/team chrome; they show `GeneralError`.

## Review-record findings addressed in this revision

`review-implementation-spec` (2026-09-28) found one must-fix and two should-fix edge cases against the first draft. This revision closes all three:

| # | Edge case | Risk if unaddressed | Fix in this revision |
| --- | --- | --- | --- |
| 1 (must-fix) | Refresh succeeds (Rails rotates `rc_access`/`rc_refresh`) but the **retried** `GET …/current` still fails non-401 → loader throws before attaching `refreshScope.setCookieHeaders` | Rotated refresh token is discarded client-side while Rails has already invalidated the old one → next request's refresh fails → person looks signed out (violates ADR-018 invariant 2, the exact thing this spec exists to fix) | Design decision 8 (below): build response headers once, before the success/throw branch, and attach them to **both** paths |
| 2 (should-fix) | `GET …/current` is a `GET`, and ky's default `retry.statusCodes` includes `503` (limit 2) → an outage costs up to 3 round trips on the root loader of every session-carrying document request | Compounds an incident with slow page loads on top of the error page | Design decision 11: pass `retry: { limit: 0 }` on the session-read call only |
| 3 (should-fix) | `team-root.jsx` today normalizes `identitiesAdminData \|\| null`; contract table didn't say whether to keep it | Silent behavior change if the serializer ever returns a falsy-but-not-`null` value | Design decision 12 + test plan entry |

## Problem

Both virtual roots always call session read endpoints and use bare `catch { return { …: null } }`, so outages look like signed-out guests (violates ADR-018 invariant 2 and `reading-the-session` rule 3). Anonymous SEO traffic still pays for `GET …/current` on every document request (violates rule 1). Root responses do not set `Cache-Control` when a session cookie is present.

Evidence: `app/roots/public-root.jsx`, `app/roots/team-root.jsx`; audit 2026-09-28; roadmap Phase 0 row 2.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| reading-the-session | [reading-the-session.md](/docs/engineering/authentication/reading-the-session) | Three rules, `Cache-Control`, today vs target table |
| ADR-018 | [adr-018-web-authentication-enforcement-model.md](/docs/architecture/decisions/adr-018-web-authentication-enforcement-model) | No cookie / only 401 / cookie names |
| changing-a-session | [changing-a-session.md](/docs/engineering/authentication/changing-a-session) | Refresh + 401 semantics |
| web-78 | [web-78-ssr-refresh-request-scope.md](/docs/engineering/specs/iam/auth-platform/web-78-ssr-refresh-request-scope) | `refreshScope` wiring; explicitly excludes this loader policy |
| implementation-roadmap | [implementation-roadmap.md](/docs/engineering/authentication/implementation-roadmap) | Phase 0 ordering |
| what-red-cab-web-knows | [what-red-cab-web-knows.md](/docs/engineering/authentication/what-red-cab-web-knows) | Cookie topology, wasted anonymous calls |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Cookie predicate** before any API call | Always call (today) | ADR-018 “no cookie, no call” |
| 2 | Account cookies: **`rc_access` or `rc_refresh`**; team: **`rc_team_access` or `rc_team_refresh`** | Access-only check | Refresh-only cookie still implies session worth validating |
| 3 | **Whole cookie name** match in `Cookie` header | Substring search | Avoid `rc_access` matching `rc_team_access` |
| 4 | Session cookie helpers in **`app/auth/auth-session-cookies.js`** | Inline per root | Plan Q1=A — single module for Phase 3 middleware |
| 5 | **401 only → `null`** via `ApiError.status === 401`; else **rethrow** | Bare `catch { null }` (today) | Outage ≠ logout |
| 6 | Keep **#78 `refreshScope`** + append `setCookieHeaders` on success | Remove refresh from roots | Unchanged from web-78 |
| 7 | **`Cache-Control: private, no-store`** on successful `RouterResponse` when cookie predicate true | Middleware-only (Phase 3) | Roadmap row 2; includes 401→`null` success path |
| 8 | Loader **throw** → no `Cache-Control` (that stays success-only), **but still attach any `refreshScope.setCookieHeaders`** collected before the failure, by throwing a `RouterResponse`-carrying error (e.g. `throw data(error, { status: error.status, headers })`) instead of the bare `error` | (a) Bare `catch { null }` on all errors (today); (b) throw the raw error with no headers, accepting rotation loss | A refresh can succeed even when the *retried* read then fails (e.g. `GET` succeeds refresh, then 500s). Rails already rotated the refresh token; the browser must still receive it or the next request's refresh fails and the person looks logged out (ADR-018 invariant 2) |
| 9 | Tests: **`public-root.spec.js`**, **`team-root.spec.js`** with mocked APIs | E2E only | Fast proof; mirrors web-78 test strategy |
| 10 | **Districts AC** via public-root loader test | Full `/districts` integration test | Plan Q2=A — same loader for all public children |
| 11 | Session-read call passes **`retry: { limit: 0 }`** in the ky options (overriding the client's default 5xx retry for this call only) | Leave ky's default `retry.statusCodes` (includes `408/413/429/500/502/503/504/521/522/524`, limit 2) | `GET …/current` is a `GET`, so it is in ky's retryable method list; without an override, a Rails outage costs up to 3 round trips on the root loader of **every** session-carrying document request before `GeneralError` renders. Other endpoints keep the default — this override is scoped to the session-read call only |
| 12 | Keep the existing **`identitiesAdminData \|\| null`** coercion in `team-root.jsx` (mirror as `identitiesAccount \|\| null` in `public-root.jsx` for symmetry) | Drop the coercion, trust the serializer to always return `null` | Preserves current behavior exactly; guards against a falsy-but-not-`null` API response silently reaching `AuthProvider`/`AdminAuthProvider` |

## Web contract

### Session cookie predicate

| Surface | `has*SessionCookie(request)` true when `Cookie` contains |
| --- | --- |
| Public / account | `rc_access=` or `rc_refresh=` as a full cookie name |
| Team admin | `rc_team_access=` or `rc_team_refresh=` as a full cookie name |

### Root loader behavior

| Step | Public (`public-root.jsx`) | Team (`team-root.jsx`) |
| --- | --- | --- |
| 1 | If `!hasAccountSessionCookie(request)` → return `{ identitiesAccount: null }` (no API) | If `!hasAdminSessionCookie(request)` → return `{ identitiesAdmin: null }` (no API) |
| 2 | `createRefreshScope(request)`; call `identitiesAccountsApi.current({ cookie, refreshScope, retry: { limit: 0 } })` | Same with `teamSessionsApi.current` |
| 3 | On success: build `headers = new Headers()`, append every `refreshScope.setCookieHeaders`; if predicate true → also set `Cache-Control: private, no-store`; return `RouterResponse({ identitiesAccount: identitiesAccount || null }, { headers })` | Same, `identitiesAdmin || null` |
| 4 | On `ApiError` 401 → same `headers` construction as step 3 (no `Cache-Control` change), return `RouterResponse({ identitiesAccount: null }, { headers })` | Same for `identitiesAdmin` |
| 5 | On any other error → build `headers` from whatever `refreshScope.setCookieHeaders` were collected **before** the failure (may be empty), then `throw data(error, { headers })` (no `Cache-Control`) so rotated cookies still reach the browser even though the response is an error | Same |

Step 5 is the fix for review finding #1: `refreshScope.setCookieHeaders` is populated by `ky-client`'s refresh hook *before* the retried request is attempted, so it can hold a value even when the retried `GET …/current` itself throws. The header-building logic in steps 3–5 should be a single shared helper (e.g. `buildSessionResponseHeaders(refreshScope, { isCookiePresent })`) so the three branches cannot drift.

### Session read APIs

No signature changes beyond web-78 `refreshScope` passthrough, plus passing through a `retry` option override:

| Module | Method | New param | Notes |
| --- | --- | --- | --- |
| `identities-accounts-api.js` | `current` | `retry` optional | Root passes `{ limit: 0 }`; forwarded to `apiClient.get` options so ky does not retry a `5xx` on this call |
| `team-sessions-api.js` | `current` | `retry` optional | Same, `teamApiClient.get` |

This does not change ky's global retry config — it is an options override on the individual `apiClient.get(...)` / `teamApiClient.get(...)` call the roots make, exactly like the existing `refreshScope` passthrough.

### Files to create or modify (Web)

- `app/auth/auth-session-cookies.js`
- `app/auth/auth-session-cookies.spec.js`
- `app/auth/build-session-response-headers.js` — shared Set-Cookie + conditional `Cache-Control` for success / 401 / throw paths (design decision 8)
- `app/api/identities-accounts-api.js` — `current` forwards `retry` option (review finding #2)
- `app/api/team-sessions-api.js` — same
- `app/roots/public-root.jsx`
- `app/roots/team-root.jsx`
- `app/roots/public-root.spec.js` — **new**
- `app/roots/team-root.spec.js` — **new**

## Out of scope

- `app/auth/auth-account-session-middleware.js` / `auth-admin-session-middleware.js`
- Entry rules / policy middleware
- `red-cab-api` changes
- Browser login/logout flows (still revalidate root on mutation)

## Tasks

### Web

1. Implement `auth-session-cookies.js` + tests.
2. Add `retry` passthrough to `identitiesAccountsApi.current` / `teamSessionsApi.current` (review finding #2).
3. Update `public-root.jsx` loader per contract table, incl. shared header-building helper for success/401/throw paths (review finding #1) and `|| null` coercion (review finding #3).
4. Update `team-root.jsx` loader per contract table (same helper reused).
5. Add loader unit tests (no-cookie zero-call, 401→null + `Cache-Control`, 503 throw, rotated-cookie-on-throw, no-retry-on-5xx, falsy-coercion).
6. `npm run test` + `npm run lint`.

## Test plan

- [ ] `auth-session-cookies.spec.js` — name boundary cases (if module shipped).
- [ ] `public-root.spec.js` — no cookies → `identitiesAccountsApi.current` not called.
- [ ] `public-root.spec.js` — cookies + 401 → null + `Cache-Control: private, no-store`.
- [ ] `public-root.spec.js` — cookies + 503 → throws `ApiError`.
- [ ] `public-root.spec.js` — cookies + `identitiesAccountsApi.current` call is made with `retry: { limit: 0 }` (review finding #2).
- [ ] `public-root.spec.js` — refresh succeeds (mock `refreshScope.setCookieHeaders` populated) then retried read throws non-401 → thrown error's response still carries the `Set-Cookie` header(s) (review finding #1).
- [ ] `public-root.spec.js` — API returns a falsy-but-not-`null` account value → loader normalizes to `identitiesAccount: null` (review finding #3).
- [ ] `team-root.spec.js` — parallel for `teamSessionsApi`, including the three review-finding cases above with `identitiesAdmin`.
- [ ] Manual: anonymous `/districts` document — no `identities/accounts/current` in network log.
- [ ] Manual: force a `503` from `GET identities/accounts/current` locally — confirm only **one** request hits the API (no ky retry) before `GeneralError` renders.

## Acceptance criteria (traceability)

- [ ] Issue #79 AC: no-cookie skip both roots.
- [ ] Issue #79 AC: 401-only → null; 503/network throw.
- [ ] Issue #79 AC: anonymous `/districts` zero identities current call (test strategy per plan Q2).
- [ ] Issue #79 AC: `Cache-Control` when session cookie on successful loader response.
- [ ] Review finding #1: rotated `Set-Cookie` from a successful refresh is still forwarded when the retried read throws.
- [ ] Review finding #2: session-read call does not retry on `5xx` (bounded root loader latency during an outage).
- [ ] Review finding #3: falsy-but-not-`null` API response is normalized to `null` on both roots.

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-28 | Plan chat | `review-implementation-spec` | `review` — 1 must-fix (rotated cookie lost on throw), 2 should-fix (unbounded 5xx retry latency; admin falsy-coercion parity). Addressed in this revision via design decisions 8, 11, 12 |
