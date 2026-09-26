---
title: "Isolate SSR token refresh per request (auth Phase 0)"
sidebar_label: Web · SSR refresh scope
issue: "https://github.com/markmamba/red-cab-web/issues/78"
repos:
  - red-cab-web
status: approved
phase: 0
context: IAM
depends_on:
  - "docs/architecture/decisions/adr-019-session-technology-phase-1-and-2.md"
  - "red-cab-web#77 (ADR-018 auth epic)"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** Per-request `refreshScope` on Node for session refresh dedupe (ADR-019 R2); R3 refresh failure semantics in `ky-client`; root loader passthrough for Phase 0; concurrency unit test (R-1).
- **Does NOT ship:** Session middleware files (`app/auth/*`), R4 “only middleware may refresh on Node”, root loader error-policy changes (catch-all stays; sibling Phase 0 item), root “no cookie → no call” policy, API repo changes.
- **Breaking change:** No — behavior fix for SSR; browser refresh dedupe unchanged.

## Problem

On Node, `createApiClient` keeps `refreshPromise` in the module closure (`app/api/ky-client.js`). Concurrent SSR document requests share that promise, so one visitor’s refresh can apply another visitor’s `Set-Cookie` (ADR-019 static finding, risk **R-1**). Additionally, `attemptTokenRefresh` catches all failures and returns `false`, so a refresh **503** is treated like signed out (violates R3).

Evidence: audit 2026-09-26; [`implementation-roadmap.md`](/docs/engineering/authentication/implementation-roadmap) Phase 0 row 1.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| ADR-019 | [adr-019-session-technology-phase-1-and-2.md](/docs/architecture/decisions/adr-019-session-technology-phase-1-and-2) | R2 per-request lock; R3 refresh errors; R-1 |
| reading-the-session | [reading-the-session.md](/docs/engineering/authentication/reading-the-session) | Target `refreshScope` shape and middleware append pattern |
| changing-a-session | [changing-a-session.md](/docs/engineering/authentication/changing-a-session) | Only `401` means signed out on session read |
| worked-examples | [worked-examples.md](/docs/engineering/authentication/worked-examples) | SSR refresh sequence; parallel requests isolated |
| implementation-roadmap | [implementation-roadmap.md](/docs/engineering/authentication/implementation-roadmap) | Phase 0 ordering and acceptance themes |
| web-platform-program-strategy | [web-platform-program-strategy.md](/docs/product/planning/web-platform-program-strategy) | Issue ↔ spec mapping (#78) |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **`refreshScope` object** `{ promise, setCookieHeaders, cookieHeader }` passed on ky requests on Node | Module-level lock (status quo); React Router context only (middleware not shipped yet) | Matches auth series; satisfies R2 without Phase 3 middleware |
| 2 | Export **`createRefreshScope(request)`** from `app/api/ky-client.js` | Inline object in each root; new `app/auth/refresh-scope.js` | DRY for two roots; middleware can import same helper later |
| 3 | **Node:** dedupe via `refreshScope.promise`; **browser:** keep closure `refreshPromise` | Single code path | R2 distinguishes Node request vs browser tab |
| 4 | **No module-level refresh state on Node** | Shared closure variable cleared per call (rejected — still shared across requests) | Issue AC + ADR-019 |
| 5 | **R3:** refresh PATCH `401` → unsigned (`false`); other HTTP / network / timeout → **throw** (`ApiError`) | Always `false` (status quo); always throw | R3 and changing-a-session |
| 6 | On successful Node refresh, set **`refreshScope.cookieHeader`** from refresh `Set-Cookie` and **append** to **`refreshScope.setCookieHeaders`** | Only update retry request cookies inside `handleServerSideRetry` | Downstream calls in same request + root response must forward cookies (worked example §2) |
| 7 | Phase 0 wiring in **`public-root.jsx`** and **`team-root.jsx`** loaders (both clients) | Account-only fix; full session middleware now | Same leak class on `teamApiClient`; one security fix in #78 (plan Q1=A) |
| 8 | **Concurrency test** as Vitest unit test with mocked `ky.patch` | Full React Router integration test | Faster, stable proof of isolation; roadmap asks for concurrency test, not E2E |
| 9 | **R4** and non-session SSR refresh ban | Fold into #78 | Out of scope — separate issue |
| 10 | Root loader **`catch { null }`** for non-401 session errors | Fix in #78 (plan Q2) | **Out of #78** — plan Q2=A: ky R3 only; loader policy is a sibling Phase 0 item |

## Web contract

### `refreshScope`

| Field | Type | Set by | Purpose |
| --- | --- | --- | --- |
| `promise` | `Promise<Response \| false> \| null` | ky refresh on Node | In-request dedupe (R2) |
| `setCookieHeaders` | `string[]` | ky on successful refresh | Root/middleware appends to document response |
| `cookieHeader` | `string \| null` | loader seeds from request; ky updates after refresh | Forward refreshed cookies on retries / later API calls in same request |

### Ky options

- Session reads pass **`refreshScope`** on the ky options object for SSR calls.
- `afterResponse` 401 handler reads `options.refreshScope` when `typeof window === 'undefined'`.
- Browser requests **omit** `refreshScope`; existing client dedupe unchanged.

### Session read APIs

| Module | Method | New param | Notes |
| --- | --- | --- | --- |
| `identities-accounts-api.js` | `current` | `refreshScope` optional | Forward to `apiClient.get` options |
| `team-sessions-api.js` | `current` | `refreshScope` optional | Forward to `teamApiClient.get` options |

### Root loaders (Phase 0)

| Root | Loader action |
| --- | --- |
| `public-root.jsx` | `const refreshScope = createRefreshScope(request)`; pass to `identitiesAccountsApi.current({ cookie, includeHeaders: true, refreshScope })`; append `refreshScope.setCookieHeaders` to response |
| `team-root.jsx` | Same pattern with `teamSessionsApi.current({ cookie, includeHeaders: true, refreshScope })`; append `refreshScope.setCookieHeaders` |

### Files to create or modify (Web)

- `app/api/ky-client.js` — scope lock, R3, `createRefreshScope`, Node/browser branch
- `app/api/ky-client.spec.js` — **new** — concurrency + R3
- `app/api/identities-accounts-api.js` — passthrough
- `app/api/team-sessions-api.js` — passthrough
- `app/roots/public-root.jsx` — scope wiring
- `app/roots/team-root.jsx` — scope wiring

## Out of scope

- `app/auth/auth-account-session-middleware.js` / `auth-admin-session-middleware.js`
- ADR-019 R4 enforcement on non-session SSR API calls
- Loader policy: skip session API when no session cookie; rethrow non-401 session read errors from root loaders (plan Q2=A — sibling issue)
- `red-cab-api` changes

## Tasks

### Docs

- [x] Set spec `status: approved` (2026-09-26 plan verification + spec review)
- [ ] Update `auth-platform/README.md` when spec commits

### Web

- [ ] Implement `createRefreshScope` + Node refreshScope lock in `ky-client.js`
- [ ] Implement R3 refresh failure branching
- [ ] Passthrough in session `current()` APIs
- [ ] Wire roots per Phase 0 table
- [ ] Add `ky-client.spec.js` concurrency test
- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Per-request refresh lock on Node (no module-level shared refresh promise across concurrent SSR requests)
- [ ] Non-`401` refresh failures propagate as errors (not treated as signed out)
- [ ] Concurrency test: two parallel SSR refreshes never share cookies or session data
- [ ] No module-level refresh state on Node for account or team session clients (`apiClient`, `teamApiClient`)
- [ ] `npm run lint` and `npm run test` pass

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-26 | Plan chat | `review-implementation-spec` | approved — no must-fix; maps to ADR-019 R2/R3 and issue #78 AC |
