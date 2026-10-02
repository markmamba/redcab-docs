---
title: "Team admin policy routes (auth Phase 3)"
sidebar_label: Web · team policy routes
issue: "https://github.com/markmamba/red-cab-web/issues/85"
repos:
  - red-cab-web
status: approved
phase: 3
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-84-auth-core-modules.md"
  - "docs/90-99-engineering-meta/93-authentication/policy-routes-and-surfaces.md"
  - "docs/90-99-engineering-meta/93-authentication/changing-a-session.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** `admin-guest-policy` + `admin-required-policy` under `team-root`; `team/logout` sibling outside policies; remove layout/login client auth gates; `AdminAuthProvider` resync on every root revalidation (E1); logout POST/GET contract; policy export count 3; routes-tree + logout + provider unit tests; normative auth doc tree amend.
- **Does NOT ship:** Tourist/corporate/provider policies; HOC removal (#88); team sidebar logout UI; `clientAction` team login (Suggestion B deferred).
- **Breaking change:** No — enforcement moves from layout client redirect to policy middleware (same URLs).

## Problem

`main` mounts `team/login` and `team` layout as direct children of `team-root` without admin policies ([#85](https://github.com/markmamba/red-cab-web/issues/85)). `team-layout.jsx` duplicates enforcement with a client `useEffect`. Imperative login leaves stale admin identity after logout without provider resync. Phase 3 roadmap row 7 blocks tourist account policy work until this ships.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| policy-routes | [policy-routes-and-surfaces.md](/docs/90-99-engineering-meta/authentication/policy-routes-and-surfaces) | Target `team-root` tree; action routes beside policies |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | In-area `401`; policy export shape |
| changing-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | Team logout `clientAction` |
| code-map | [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) | `team-logout.js` |
| web-84 | [web-84-auth-core-modules.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-84-auth-core-modules) | Admin guard, entry rules, `team-root` middleware |
| ADR-018 | [adr-018-web-authentication-enforcement-model.md](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Policy enforcement |
| frontend | [frontend.md](/docs/50-59-frontend/conventions/frontend) | No policy + layout guard (R-2) |
| FR-IAM-009 | Surface isolation | Team vs tourist boundaries |
| NFR-SEC-004 | Role-confined areas | Team portal access |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Baseline `main`** with #84 merged | Open PR branch | PR #98 on `main` |
| 2 | Policy modules mirror `tourist-required-policy.jsx` | Inline in layout | Export contract; no `shouldRevalidate` / `clientLoader` on policies |
| 3 | **Remove** `team-layout.jsx` auth `useEffect` + early `return null` | Defense-in-depth | R-2 single door guard |
| 4 | **Remove** login page logged-in `useEffect`, `isAdminLoggedIn()` gate, identity reads | Keep client redirect | `adminGuest` only; keep `onAdminUpdate` + submit `navigate` |
| 5 | **E1:** `AdminAuthProvider` resync on **every** root loader revalidation | `clientAction` login (Suggestion B) | Clears optimistic state on `null → null` after logout |
| 6 | **`team/logout` sibling** under `team-root`, outside policies | Under `admin-required-policy` | Destroy when already signed out; no `adminRequired` trap |
| 7 | Logout **POST:** `401` → redirect `/team/login`; else `data({ error }, { status })` — no redirect on failure | `finally` redirect | [changing-a-session](/docs/90-99-engineering-meta/authentication/changing-a-session) |
| 8 | Logout **GET:** `loader` → `redirect('/team')` | Redirect straight to login | Signed-out users hit `adminRequired` on `/team` index |
| 9 | Block `/team/logout` as `redirect_to` / post-auth target | — | Prevents blank page after sign-in |
| 10 | In-area session loss: `team-root` `ErrorBoundary` `401` navigate | Re-run policy on every click | [policy-middleware](/docs/90-99-engineering-meta/authentication/policy-middleware) row 3 — not R-2 violation |
| 11 | Logout route only (no sidebar UI) | Add sign-out control | Issue AC |
| 12 | No new admin R-4 browser test | Duplicate #84 integration | Factory covered in #84 |
| 13 | `EXPECTED_POLICY_MODULE_COUNT = 3` + **routes-tree nesting** spec | `toContain` stem only | E6 |
| 14 | **Docs PR first:** approve this spec + amend normative tree + code-map before web codegen | Web-first | Workspace spec-first |

## Web contract

### Policy modules

| Module | Middleware rule |
| --- | --- |
| `admin-guest-policy.jsx` | `authAdminGuard.protect(authAdminEntryRules.adminGuest)` |
| `admin-required-policy.jsx` | `authAdminGuard.protect(authAdminEntryRules.adminRequired)` |

Each exports `loader = () => null` and default `<Outlet />`.

### Route tree

```text
layout('roots/team-root.jsx', [
  layout('./routes/policies/admin-guest-policy.jsx', [
    route('team/login', './routes/team/team-login-page.jsx')
  ]),
  layout('./routes/policies/admin-required-policy.jsx', [
    route('team', 'layouts/team/team-layout.jsx', teamRoutes)
  ]),
  route('team/logout', './routes/team/team-logout.js')
])
```

**Normative note:** Session **action routes** (`logout`) sit beside policies under the surface root, not inside guest/required policies (amend [policy-routes-and-surfaces](/docs/90-99-engineering-meta/authentication/policy-routes-and-surfaces) in docs PR).

### Logout route

| Method | Handler | Behavior |
| --- | --- | --- |
| POST | `clientAction` | `teamSessionsApi.destroy()` → `DELETE team/identities/admins/sessions/current` (CSRF via `teamApiClient`); `401` → `redirect('/team/login')`; other errors → `data({ error }, { status })` without redirect |
| GET | `loader` | `redirect('/team')` |

### Identity provider (E1)

- `use-admin-auth.jsx`: clear/resync optimistic admin when root loader revalidates even when loader value stays `null → null`.
- `team-root.jsx`: adjust only if needed so provider receives a per-revalidation signal (loader data reference).

### Safe redirect

- Block `/team/logout` in admin guest blocked paths (`auth-safe-redirect` / `ADMIN_GUEST_PATHS` + specs).

### Files to create or modify (Web)

| File | Change |
| --- | --- |
| `app/routes/policies/admin-guest-policy.jsx` | create |
| `app/routes/policies/admin-required-policy.jsx` | create |
| `app/routes.js` | nest team routes; register `team/logout` sibling |
| `app/layouts/team/team-layout.jsx` | remove client auth redirect |
| `app/routes/team/team-login-page.jsx` | remove logged-in gates; keep submit flow |
| `app/hooks/use-admin-auth.jsx` | resync on revalidation |
| `app/roots/team-root.jsx` | provider signal if needed |
| `app/auth/auth-safe-redirect.js` | block `/team/logout` |
| `app/routes/team/team-logout.js` | create |
| `app/routes/policies/policy-export-contract.spec.js` | count 3 |
| `app/routes/policies/team-routes-tree.spec.js` (or similar) | nesting assertions |
| `app/routes/team/team-logout.spec.js` | clientAction success / 401 / 500 |
| `app/hooks/use-admin-auth.spec.jsx` | null → null revalidation clears `onAdminUpdate` |
| `app/auth/auth-safe-redirect.spec.js` / `auth-admin-entry-rules.spec.js` | `/team/logout` blocked |

### Docs (same stack as approval — before or with web PR)

| File | Change |
| --- | --- |
| `policy-routes-and-surfaces.md` | Mermaid + snippet: third `team-root` child; action-route norm |
| `code-map.md` | `team-logout.js` under `team-root`, outside policies |
| `iam/auth-platform/README.md` | index `web-85` |

## Out of scope

- Tourist/corporate/provider policies (#86–#87); auth HOC removal (#88)
- Team sidebar POST to `team/logout`
- `clientAction` team login / remove `onAdminUpdate` (follow-up with tourist login conversion)
- `identities-account/logout.js`
- API changes
- Full policy-middleware manual matrix (subset in test plan suffices for #85 exit)

## Tasks

### Docs

1. This spec `status: approved` committed before web codegen.
2. Amend normative tree + code-map.

### Web

1. Admin policy modules + routes-tree test.
2. Rewire `routes.js`.
3. Provider resync + safe-redirect hardening.
4. `team-logout.js` + unit tests.
5. Remove layout/login client guards.
6. Policy export bump; CI.

## Test plan

### Automated

- [ ] `npm run test -- app/routes/policies app/auth app/hooks/use-admin-auth app/routes/team/team-logout`
- [ ] Policy export count = 3; no `shouldRevalidate` / `clientLoader` on policies
- [ ] Routes-tree nesting (login under guest, layout under required, logout under root only)
- [ ] Logout `clientAction`: success, `401`, `500`
- [ ] Provider resync after `onAdminUpdate` then logout revalidation
- [ ] Safe redirect: `redirect_to=/team/logout` and external paths on `/team/login`

### Manual (in-app navigation — new tab alone does not prove policy wiring)

| # | Steps | Expected |
| --- | --- | --- |
| M1 | Signed out → in-app nav to `/team/providers/profiles` | `/team/login?redirect_to=…`; no team shell flash |
| M2 | M1 → sign in | Lands on profiles or safe `redirect_to` |
| M3 | Signed in → `/team/login` | `adminGuest` → `/team` or safe `redirect_to` |
| M4 | Signed in → `/team/login?redirect_to=//evil.example` | Safe default, not external |
| M5 | Signed in → `/team/login?redirect_to=/team/logout` | Default `/team`, not logout blank |
| M6–M12 | See PKM plan `inbox/2026-10-02-issue-85-plan.md` § Manual matrix | Logout, E1, in-area `401`, GET `/team/logout` |

- [ ] `npm run ci:test`, `npm run lint`, `npm run build`

## Related documents

- [Web platform program strategy](/docs/70-79-business/planning/web-platform-program-strategy) — `web-85-team-policy-routes.md`
- [Implementation roadmap Phase 3 row 7](/docs/90-99-engineering-meta/authentication/implementation-roadmap)
