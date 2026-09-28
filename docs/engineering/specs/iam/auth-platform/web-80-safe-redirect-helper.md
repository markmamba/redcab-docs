---
title: "Safe redirect helper and login-path wiring (auth Phase 0)"
sidebar_label: Web · Safe redirect
issue: "https://github.com/markmamba/red-cab-web/issues/80"
repos:
  - red-cab-web
status: approved
phase: 0
context: IAM
depends_on:
  - "docs/engineering/authentication/appendix-entry-rules-spec.md"
  - "red-cab-web#77 (ADR-018 auth epic)"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** `app/auth/auth-safe-redirect.js` + unit tests for appendix **S1–S9**, **L1–L2**; team login and `withNoAuth` consume helper before `navigate`.
- **Does NOT ship:** `auth-entry-rules.js`, policy middleware, OAuth sessionStorage validation, delegating `identities-auth-utils.isSafeInternalPath`, account/corporate/provider **submit** path migration.
- **Breaking change:** Yes (minor) — logged-in users on guest IAM pages use `postAuthPath` (plan Q1=A): e.g. tourist sign-up may redirect to `/account` instead of `'/'`; document in PR.

## Problem

Untrusted `redirect_to` query parameters are passed directly to React Router navigation on team login and on every route wrapped by `withNoAuth`, enabling open redirects (e.g. `redirect_to=//evil.example`). Entry rules require a single helper gate ([entry-rules.md](/docs/engineering/authentication/entry-rules)); appendix defines normative behavior ([appendix-entry-rules-spec.md](/docs/engineering/authentication/appendix-entry-rules-spec)).

Evidence: audit 2026-09-28; `team-login-page.jsx` (`searchParams.get('redirect_to') || '/team'`); `with-no-auth.jsx` (raw query or `options.redirectTo`).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| entry-rules | [entry-rules.md](/docs/engineering/authentication/entry-rules) | Single helper before rules use `redirect_to` |
| appendix | [appendix-entry-rules-spec.md](/docs/engineering/authentication/appendix-entry-rules-spec) | Normative helper API + **S1–S9**, **L1–L2** |
| roadmap | [implementation-roadmap.md](/docs/engineering/authentication/implementation-roadmap) | Phase 0 ordering |
| web-platform-program-strategy | [web-platform-program-strategy.md](/docs/product/planning/web-platform-program-strategy) | Issue ↔ spec mapping (#80) |
| web-78 | [web-78-ssr-refresh-request-scope.md](web-78-ssr-refresh-request-scope.md) | Sibling Phase 0 spec pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Module at `app/auth/auth-safe-redirect.js` | Extend `identities-auth-utils.js` | Issue AC + appendix path; keep utils emitters unchanged |
| 2 | Export `authSafeRedirect` object with four functions | Named exports only | Matches appendix; future entry rules import one object |
| 3 | Constants co-located in helper module | Stub `auth-entry-rules.js`; separate constants file only | Phase 3 ships entry rules; appendix allows Phase 0 constants in spec |
| 4 | Import `getIdentitiesHomePath` from `identities-auth-utils.js` | Duplicate role map | Appendix reference implementation |
| 5 | No session / cookie imports in helper | — | Appendix rule: pure string policy |
| 6 | Team login uses `redirectTarget` + `internalPathOrDefault(..., '/team', ADMIN_GUEST_PATHS, ADMIN_ALLOWED_PREFIX)` | Raw `\|\| '/team'` | Matches `adminGuest` (**AG6–AG7**) |
| 7 | `withNoAuth` uses `postAuthPath(identitiesAccount, redirectTarget(location))` | `internalPathOrDefault` + `options.redirectTo` | Plan Q1=A; matches `accountGuest` |
| 8 | Implement appendix `PUBLIC_RETURN_PREFIXES` and `PUBLIC_RETURN_EXACT` | Defer until open question 4 | Plan Q2=A; **G16–G17** behavior |
| 9 | Unit tests: **S1–S9**, **L1–L2**, **G16–G17** smoke on `postAuthPath` | S/L only | Plan review should-fix 2 (Q2=A public return) |
| 11 | `withNoAuth` `options.redirectTo` | Keep portal defaults | Removed — Q1=A uses `postAuthPath`; option unused |
| 10 | Do not delegate `isSafeInternalPath` in #80 | Consolidate now | Avoid dual maintenance in one PR; track follow-up |

## Web contract

### `authSafeRedirect` (normative: appendix)

| Export | Purpose |
| --- | --- |
| `internalPathOrDefault(urlPath, defaultPath, blockedPaths, allowedPrefixes)` | Block evil / blocked / out-of-prefix paths |
| `loginRedirectPath(basePath, location)` | Build login URL with encoded `redirect_to` |
| `redirectTarget(location)` | Parse `redirect_to` from `location.search` |
| `postAuthPath(identitiesAccount, redirectTo)` | Role-aware post-auth destination |

Constants in module (values from appendix): `ACCOUNT_GUEST_PATHS`, `ADMIN_GUEST_PATHS`, `ADMIN_ALLOWED_PREFIX`, `ROLE_PATH_PREFIXES`, `PUBLIC_RETURN_PREFIXES` (`['/districts', '/listings']`), `PUBLIC_RETURN_EXACT` (`['/']`).

### Call sites

| Consumer | When | Helper usage |
| --- | --- | --- |
| `team-login-page.jsx` | Admin already signed in; after successful login | Resolve once from `useLocation()` / search params via `redirectTarget` + `internalPathOrDefault` with admin constants |
| `with-no-auth.jsx` | `isLoggedIn()` true | `navigate(authSafeRedirect.postAuthPath(identitiesAccount, authSafeRedirect.redirectTarget(location)), { replace: true })` |

**`withNoAuth` null guard (normative):** never call `postAuthPath` unless the visitor is logged in. Anonymous renders must not touch `identitiesAccount`.

```jsx
useEffect(() => {
  if (!isLoggedIn()) return

  const path = authSafeRedirect.postAuthPath(
    identitiesAccount,
    authSafeRedirect.redirectTarget(location)
  )

  navigate(path, { replace: true })
}, [isLoggedIn, navigate, identitiesAccount, location])

if (isLoggedIn()) return null
```

Corporate/provider login pages: drop `{ redirectTo: '…' }` — role home comes from `postAuthPath` only.

Routes inheriting HOC fix (no per-page edits): account login/forgot/reset/verify-email, tourist/corporate/provider sign-up and portal login pages (~8).

### Files to create or modify (Web)

- `app/auth/auth-safe-redirect.js` — **new**
- `app/auth/auth-safe-redirect.spec.js` — **new** — **S1–S9**, **L1–L2**, **G16–G17**
- `app/routes/team/team-login-page.jsx` — consume helper (`useLocation`)
- `app/components/hocs/with-no-auth.jsx` — consume helper (`useLocation`, logged-in-only `postAuthPath`)
- `app/routes/corporate/corporate-login-page.jsx`, `app/routes/provider/provider-login-page.jsx` — remove dead `withNoAuth` `redirectTo` option

## Out of scope

- `auth-entry-rules.js`, `auth-admin-entry-rules.js`, policy middleware
- Changing `resolveIdentitiesPostAuthPath` / login submit flows on account/corporate/provider pages
- OAuth `storeIdentitiesPostAuthRedirect` validation — **follow-up:** validate with `authSafeRedirect` before sessionStorage write (same F11 class as query `redirect_to`)
- Consolidating `identities-auth-utils.isSafeInternalPath` with `INTERNAL_PATH_PATTERN` in this helper — **follow-up:** dedicated issue (design decision #10); login submit paths still use legacy helper until then
- `red-cab-api` changes

## Tasks

### Docs

- [x] Human verification (PKM plan Q1–Q3) — 2026-09-28
- [ ] Run `review-implementation-spec`; set `status: approved` after explicit human approval
- [ ] Update [auth-platform/README.md](README.md) Committed list

### Web

- [ ] Implement helper + S/L tests
- [ ] Wire team login + `withNoAuth`
- [ ] Manual evil-URL checks
- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Helper matches appendix signatures; no session imports
- [ ] Unit tests: one row each for **S1–S9**, **L1–L2**; **G16–G17** smoke on `postAuthPath`
- [ ] Team login never navigates to raw external `redirect_to`
- [ ] All `withNoAuth` routes inherit safe redirect
- [ ] `redirect_to=//evil.example` → documented safe default on `/team/login` and guest IAM pages

## Test matrix reference

Implement tests from [appendix-entry-rules-spec.md § Test rows](/docs/engineering/authentication/appendix-entry-rules-spec#test-rows):

- `internalPathOrDefault` — **S1–S9**, **Sx** (`//evil.example` → default; manual AC alignment)
- `loginRedirectPath` — **L1–L2**
- `postAuthPath` — **G16–G17** (public return; resolves appendix open question 4 for web-80), **Sx** (evil `redirect_to` → role home)

## Related documents

- [Entry rules](/docs/engineering/authentication/entry-rules)
- PKM plan: `PersonalKnowledgeManagement/inbox/2026-09-28-issue-80-plan.md`
