---
title: "Auth core modules — session middleware, guards, entry rules (Phase 3)"
sidebar_label: Web · auth core modules
issue: "https://github.com/markmamba/red-cab-web/issues/84"
repos:
  - red-cab-web
status: approved
phase: 3
context: IAM
depends_on:
  - "docs/90-99-engineering-meta/93-authentication/appendix-entry-rules-spec.md"
  - "docs/90-99-engineering-meta/93-authentication/policy-middleware.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-79-root-session-read-contract.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-80-safe-redirect-helper.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** Production `app/auth/*` from the [code map](/docs/90-99-engineering-meta/authentication/code-map): `create-session-middleware.js` factory + account/admin wrappers, guards, entry rules, safe-redirect path normalization (appendix-amended rows), loop-proof + R-4 in-process Vitest, hardened policy-export contract, spike deletion, `authEntryRules` on `tourist-required-policy`, `team-root` middleware alignment, `public-root` ErrorBoundary **401 → navigate to login** (no spike flag).
- **Does NOT ship:** New policy files; fresh `routes.js` / `tourist.routes.js` mount work (harness already on `main`); remaining HOC removal; login/logout `clientAction`; read-only providers; Phase 4 ErrorBoundary 401 navigate removal; full R-4 browser matrix; API changes.
- **Breaking change:** Yes (small) — removes spike EB blank-on-401 flag; restores pre-flag navigate behavior. Safe-redirect rejects dot-segment / encoded-dot `redirect_to` per amended Appendix A.

## Review record (2026-10-01)

`review-implementation-spec` / plan review ([PKM plan review](https://github.com/markmamba/red-cab-web/issues/84)) closed must-fix items before approval:

| # | Finding | Resolution in this spec |
| --- | --- | --- |
| M1 | Baseline mixed spike branch vs `main` | Implement from **`main`**; #84 swaps production modules onto existing harness |
| M2 | Spike `SPIKE_83_DISABLE_ERROR_BOUNDARY_401_NAVIGATE` | **Delete** flag; EB 401 navigates until Phase 4 spec 10 |
| M3 | R-4 refresh + `replace()` unproven | **Automated** in-process Vitest in #84 |
| M4 | Dot-segment bypass in safe-redirect | **Normalize-then-validate** + appendix new rows (docs PR first) |

## Problem

Roadmap Phase 3 row 6 requires `app/auth/*` targets, Appendix A specs, policy export lint, and RR 8.0 evidence ([#83](https://github.com/markmamba/red-cab-web/issues/83)) before policy-route PRs (#85+). `main` already carries account session middleware, `tourist-required-policy`, and split `openAccountRoutes`; #84 replaces spike imports with production modules and completes the admin stack.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| appendix-a | [appendix-entry-rules-spec.md](/docs/90-99-engineering-meta/authentication/appendix-entry-rules-spec) | Normative rules + test row ids (amend in docs PR) |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | Guard uses middleware `url`; policy export lint |
| code-map | [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) | File list and status |
| web-79 | [web-79-root-session-read-contract.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-79-root-session-read-contract) | 401-only null; loader throw headers |
| web-80 | [web-80-safe-redirect-helper.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-80-safe-redirect-helper) | G16–G17 / public return resolved |
| ADR-018 | [adr-018-web-authentication-enforcement-model.md](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Policy enforcement |
| roadmap | [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) | Phase 3 row 6; Phase 4 EB navigate removal |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Git baseline `main`** | Branch from #83 spike | Spike branch is evidence-only; never merge spike README/commits |
| 2 | **Constants stay in `auth-safe-redirect.js`**; entry-rules **re-export** `ACCOUNT_GUEST_PATHS`, `LOGIN_PATH_BY_SURFACE` | New `auth-path-constants.js` | No import cycle on `main`; minimal importer churn |
| 3 | **`auth-policy-page-url.js` deleted** | Keep helper | RR 8.0 normalizes middleware `url` ([#83](https://github.com/markmamba/red-cab-web/issues/83) evidence) |
| 4 | **`create-session-middleware.js` factory** + thin account/admin wrappers | Duplicate middleware files | Single 401→null, memoization, Set-Cookie, Cache-Control implementation |
| 5 | Guards use **`url.pathname` / `url.search`** only; **no** DEV `console.info`; missing context → clear throw (tested) | Spike logging | Production: no per-request stdout noise |
| 6 | **`internalPathOrDefault` normalizes** with `new URL` before blocked/allowed checks; reject when normalization changes pathname | Reject-only regex | Fixes dot-segment loops (appendix amended first) |
| 7 | **G16–G17** asserted on **`authEntryRules.accountGuest`** in `auth-entry-rules.spec.js` | Helper-only tests | Appendix table ownership |
| 8 | **R-4 subset** in Vitest (refresh scope + guard `replace()` → response has `Set-Cookie`) | Defer to #85 manual only | Ships unproven middleware guarantee if deferred |
| 9 | **Policy export contract**: `import.meta.glob`, **min file count**, shape checks, each policy referenced from route tree | Vacuous glob | `passWithNoTests` cannot hide empty glob |
| 10 | **EB 401 navigate restored** on `public-root` | Keep spike flag | Blank render on 401; asymmetry with `team-root` |
| 11 | **`Set-Cookie`**: middleware on success; `buildSessionResponseHeaders` on loader throw only; add **`build-session-response-headers.spec.js`** | Duplicate append | web-79 throw path vs middleware success path |

## Web contract

### Module layout

| Module | Role |
| --- | --- |
| `create-session-middleware.js` | Factory: lazy read, 401→null, memoization, refresh append, Cache-Control when cookie |
| `auth-account-session-middleware.js` | Account wrapper (`identitiesAccountsApi.current`) |
| `auth-admin-session-middleware.js` | Admin wrapper (`teamSessionsApi.current`) |
| `auth-account-guard.js` / `auth-admin-guard.js` | `protect(rule)` → `throw replace(path)` |
| `auth-entry-rules.js` / `auth-admin-entry-rules.js` | Appendix rules |
| `auth-safe-redirect.js` | S*, L*, `postAuthPath`; exports path constants |

**Deleted:** `spike-*`, `SPIKE-83-README.md`, `auth-policy-page-url.js` (+ spec).

Account and admin stacks must not cross-import each other's guard or entry-rule modules.

### Route touch (in scope)

| File | Change |
| --- | --- |
| `app/routes/policies/tourist-required-policy.jsx` | `authEntryRules.touristRequired` |
| `app/roots/public-root.jsx` | Remove spike config; restore EB 401 navigate |
| `app/roots/team-root.jsx` | `authAdminSession.middleware` + context loader |

**Not in #84 diff (already on `main`):** `app/routes.js`, `app/tourist.routes.js`, `booking-list-page.jsx` harness wiring.

### Policy export contract

- Glob `app/routes/policies/*` with `expect(count).toBeGreaterThanOrEqual(N)` (N = current policy count on `main`)
- Each: `middleware` non-empty array, `loader` function, no `shouldRevalidate` / `clientLoader`
- Each policy path referenced from `app/routes.js` or imported route modules

### Files to create or modify (Web)

See PKM plan file list: entry rules, admin stack, factory, guards, safe-redirect + specs, `auth-session-redirect-integration.spec.js` (R-4), `policy-export-contract.spec.js`, roots, spike deletes.

### Docs (same PR stack as approval)

- [appendix-entry-rules-spec.md](/docs/90-99-engineering-meta/authentication/appendix-entry-rules-spec) — OQ4/web-80 wording; S10+ / G18+ rows; loop-proof dot-segment row
- [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) — guard `url`; drop centralize-helper for deleted module; R-4 test note
- [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) — **exists** for shipped modules
- [auth-platform README](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/) — index this spec

## Out of scope

- New guest/admin/corporate/provider policy **files** or mounts beyond current `main`
- Removing `withTouristAuth` from remaining `/account/*` (#86)
- Login/logout `clientAction`, read-only `AuthProvider`
- Root EB stop navigating on 401 (Phase 4 / spec 10)
- Full policy-middleware manual matrix (#85+)
- CDN guest-redirect cache headers (deferred pending infra)

## Tasks

### Docs

1. Amend appendix + policy-middleware; index README; approve this spec.
2. Flip code-map statuses with web PR.

### Web

1. Appendix-amended safe-redirect + entry rules + specs (incl. G16–G17 on `accountGuest`, loop proof).
2. Session middleware factory + account/admin wrappers + specs.
3. Guards; spike deletion; tourist-required-policy swap.
4. Roots alignment; R-4 integration spec; policy export contract; `build-session-response-headers.spec.js`.

## Test plan

- [ ] `npm run test -- app/auth app/routes/policies`
- [ ] `npm run ci:test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual policy matrix — **not** required for #84 exit

## Related documents

- [Web platform program strategy § GitHub issues](/docs/70-79-business/planning/web-platform-program-strategy#github-issues--auth-phases)
- [#83 spike evidence](/docs/90-99-engineering-meta/authentication/evidence/issue-83-spike/curl-transcript-2026-10-01)
