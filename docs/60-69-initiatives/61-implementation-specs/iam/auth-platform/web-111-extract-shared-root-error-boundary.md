---
title: "Extract shared root ErrorBoundary (401 A1 dedup)"
sidebar_label: Web · shared root ErrorBoundary
issue: "https://github.com/markmamba/red-cab-web/issues/111"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-88-remove-auth-hocs.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
approved: "2026-10-04"
---

## TL;DR

- **Ships:** One shared `RootRouteErrorBoundary` in `app/roots/root-route-error-boundary.jsx` with per-surface config; `public-root` and `team-root` keep exporting `ErrorBoundary` as thin delegates. Parameterized Vitest for the 401 matrix.
- **Does NOT ship:** Any change to A1 copy, URLs, auto-navigate rules, 404/default branches, `app/root.jsx`, loader 401 / [#107](https://github.com/markmamba/red-cab-web/issues/107) behavior, or middleware.
- **Breaking change:** No.

## Problem

[#88](https://github.com/markmamba/red-cab-web/issues/88) shipped A1 session-expired UI on `public-root` and `team-root` but left ~65 lines of duplicated boundary logic. [web-88](web-88-remove-auth-hocs.md) deferred extraction to [#111](https://github.com/markmamba/red-cab-web/issues/111).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| web-88 | [web-88-remove-auth-hocs.md](web-88-remove-auth-hocs.md) | Normative A1 table and surface URLs |
| changing-a-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | Boundary does not auto-navigate; loader hard 401 → revalidate (#107) |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `app/roots/root-route-error-boundary.jsx` + exported `PUBLIC_ROOT_ERROR_CONFIG` / `TEAM_ROOT_ERROR_CONFIG` | `createRootErrorBoundary()` factory | Mirrors shared middleware + thin wrappers; hooks stay inside one component |
| 2 | Each root `export function ErrorBoundary` delegates to `RootRouteErrorBoundary` with its config | Re-export only from shared file | React Router requires export from layout module |
| 3 | Strict refactor — zero UX/copy/URL changes | Opportunistic cleanup | Chore only; behavior is already normative in web-88 |
| 4 | `root-route-error-boundary.spec.jsx` parameterized by config; per-root specs removed or reduced to wiring smoke | Keep duplicate per-root specs | Avoid copy-paste drift |

### Config shape (per surface)

| Field | Public | Team |
| --- | --- | --- |
| `sessionExpiredMessage` | Account session copy | Admin session copy |
| `resolveIsOnLoginPath(location)` | `pathname === resolveIdentitiesLoginPath(pathname)` | `pathname === '/team/login'` |
| `buildSignInAgainPath(location)` | `buildIdentitiesLoginRedirect(pathname, search)` | `/team/login?redirect_to=${encodeURIComponent(pathname+search)}` |
| `notFoundHome` | `{ text: 'Homepage', path: '/' }` | `{ text: 'Team Home', path: '/team' }` |

401 behavior (unchanged from web-88): no `navigate` on mount; **Sign in again** only on button click; on login path show **Refresh** only.

## Web contract

### Files to create or modify

| File | Change |
| --- | --- |
| `app/roots/root-route-error-boundary.jsx` | add — shared component + configs |
| `app/roots/public-root.jsx` | thin `ErrorBoundary` delegate |
| `app/roots/team-root.jsx` | thin `ErrorBoundary` delegate |
| `app/roots/root-route-error-boundary.spec.jsx` | add — parameterized 401 tests |
| `app/roots/public-root-error-boundary.spec.jsx` | delete (merged) |
| `app/roots/team-root-error-boundary.spec.jsx` | delete (merged) |

## Out of scope

- `error-boundary-utils.js` unit tests (pre-existing gap).
- Browser E2E for boundary UI.

## Tasks

### Web

1. Add shared module and configs.
2. Thin root delegates.
3. Consolidate Vitest; run `npm run test` on touched specs.

## Test plan

- [ ] Shared spec: 401 does not call `navigate` on mount; **Sign in again** targets per config; refresh-only on respective login paths.
- [ ] `public-root.spec.js` / `team-root.spec.js` loader tests unchanged.

## Verification

```bash
cd red-cab-web && npm run test -- app/roots/root-route-error-boundary.spec.jsx app/roots/public-root.spec.js app/roots/team-root.spec.js
```
