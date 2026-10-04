---
title: "Phase 3 session write contract (team login + read-only admin provider)"
sidebar_label: Web · session write contract
issue: "https://github.com/markmamba/red-cab-web/issues/112"
repos:
  - red-cab-web
status: approved
phase: 3
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-85-team-policy-routes.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-86-tourist-account-policy-routes.md"
  - "docs/90-99-engineering-meta/93-authentication/changing-a-session.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** `createTeamLoginAction` + `team-login-page.jsx` `clientAction`; read-only `AdminAuthProvider` (no `onAdminUpdate`); normative auth doc updates for account + team login on the action contract.
- **Does NOT ship:** Loader `revalidate` (#107), `shouldRevalidate` (#108), guest degradation (#109–#111), full Appendix A auth module matrix, policy lint, manual click matrix rows beyond team login/logout smoke.
- **Breaking change:** No — URLs unchanged; team login drops success toast (parity with tourist portal logins).

## Problem

[web-85](web-85-team-policy-routes.md) deferred team login `clientAction` and left `onAdminUpdate` on `AdminAuthProvider`. [web-86](web-86-tourist-account-policy-routes.md) shipped account login/logout on `clientAction` and a read-only `AuthProvider`. [#112](https://github.com/markmamba/red-cab-web/issues/112) closes the remaining Phase 3 **session-write** gap: imperative team login + optimistic admin context bypass root revalidation.

Evidence on `main` before this issue: `team-login-page.jsx` calls `teamSessionsApi.create`, `onAdminUpdate`, and `navigate`; `use-admin-auth.jsx` holds local state and `onAdminUpdate`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| changing-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | Login/logout `clientAction`; revalidation |
| web-85 | [web-85-team-policy-routes.md](web-85-team-policy-routes.md) | Team logout action; deferred team login |
| web-86 | [web-86-tourist-account-policy-routes.md](web-86-tourist-account-policy-routes.md) | `createLoginAction` + read-only provider pattern |
| code-map | [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) | Module status rows |
| roadmap | [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) | Phase 3 login/logout exit row |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Narrow scope** — team write path + admin provider only | Broad Phase 3 checklist in one PR | Human Gate 1 Q1=A |
| 2 | **`createTeamLoginAction`** in `app/auth/` | Inline `clientAction` on page only | Mirrors `createLoginAction` |
| 3 | Form glue: **`useSessionLoginSubmit`** | Custom team hook | Same `FormData` field names |
| 4 | Post-auth redirect: **`internalPathOrDefault`** with `ADMIN_GUEST_PATHS` + `ADMIN_ALLOWED_PREFIX` | `postAuthPath` (account role) | Admin has no tourist role prefix |
| 5 | **`AdminAuthProvider` read-only** — derive from `identitiesAdminData` only | Keep E1 resync via `adminLoaderData` | No optimistic writer; mirror `AuthProvider` |
| 6 | **Drop team login success toast** | Flash after redirect | Gate 1 Q2=A — parity with portal logins |
| 7 | **Unit test** `create-team-login-action.spec.js` | Provider tests only | Gate 1 Q3=A |
| 8 | Account surface | Change account login | Already on contract; regression only |

## Web contract

### Team login action

| Export | Route | Behavior |
| --- | --- | --- |
| `clientAction` | `/team/login` | `POST` via `useSubmit` → `teamSessionsApi.create` → `redirect(safePath)`; `401`/`422` → `data({ error }, { status })` |

Safe path: `authSafeRedirect.internalPathOrDefault(redirect_to, '/team', ADMIN_GUEST_PATHS, ADMIN_ALLOWED_PREFIX)`.

### Admin identity context

| Module | Contract |
| --- | --- |
| `AdminAuthProvider` | Props: `identitiesAdminData` from `team-root` loader only. Context: `identitiesAdmin`, `isAdminLoggedIn`. **No** `onAdminUpdate`. |
| `team-root.jsx` | Pass `identitiesAdminData={ identitiesAdmin }` only. |

### Files to create or modify

- `app/auth/create-team-login-action.js` — add
- `app/auth/create-team-login-action.spec.js` — add
- `app/routes/team/team-login-page.jsx` — `export const clientAction`; `useSessionLoginSubmit`
- `app/hooks/use-admin-auth.jsx` — read-only provider
- `app/hooks/use-admin-auth.spec.jsx` — loader-driven tests
- `app/roots/team-root.jsx` — drop `adminLoaderData` prop
- `app/domains/team-session/team-login-form.jsx` — optional `isSubmitting` prop from navigation state
- `.cursor/rules/10-routes-api-forms.mdc`, `.ai/skills/creating-route-pages/templates/auth-page.md` — team login on `clientAction`

## Out of scope

- API changes
- Tourist/account login/logout (already shipped in web-86)
- #107–#111 loader revalidation and boundary work except doc cross-links

## Tasks

### Web

1. Add `createTeamLoginAction` + spec.
2. Wire `team-login-page.jsx` to action + `useSessionLoginSubmit`.
3. Simplify `AdminAuthProvider` and `team-root` props.
4. Update agent guidance (rules + auth-page template).

### Docs

1. Fix [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) “Today” for account; document team `clientAction`.
2. Tick Phase 3 login/logout row in [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) when web ships.
3. Update [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) rows for team login and `use-admin-auth`.

## Test plan

- [ ] `create-team-login-action.spec.js` — success redirect (default + safe `redirect_to`); `401`/`422` error payloads
- [ ] `use-admin-auth.spec.jsx` — derives admin from props; no setter on context
- [ ] `team-logout.spec.js` and existing team policy tests stay green
- [ ] `npm run test -- app/hooks/use-admin-auth app/routes/team app/auth`
- [ ] Manual: team login → header shows admin after redirect; logout clears chrome without stale optimistic state
