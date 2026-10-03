---
title: "Remove auth HOCs and boundary login redirects (auth Phase 4)"
sidebar_label: Web · remove auth HOCs
issue: "https://github.com/markmamba/red-cab-web/issues/88"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-87-corporate-provider-policy-routes.md"
  - "docs/90-99-engineering-meta/93-authentication/implementation-roadmap.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
approved: "2026-10-03"
---

## TL;DR

- **Ships:** Delete four `with-*-auth` HOC modules; ESLint gate against reintroduction; remove 401 → login **auto-navigation** from `public-root` and `team-root` `ErrorBoundary`; **A1** session-expired UI with **Sign in again**; update `frontend.md`, `93-authentication/` series (listed below), and web agent docs (HOC → policy).
- **Does NOT ship:** Policy tree changes; `ky-client` navigate on refresh fail; `revalidate()` / `handleLoaderError` migration ([#107](https://github.com/markmamba/red-cab-web/issues/107)); root `shouldRevalidate` `actionStatus` ([#108](https://github.com/markmamba/red-cab-web/issues/108)); public guest degradation on 401 ([#109](https://github.com/markmamba/red-cab-web/issues/109)); server-side sessions (Phase 5); API changes.
- **Supersedes:** web-87 decision 10 and §#88 coupling (E2) — boundary removal + A1 is the agreed replacement, not “no replacement.”

## Problem

#85–#87 moved all surfaces to policy routes and stripped HOC wrappers from route modules, but **HOC files**, **transitional docs**, and **root ErrorBoundary 401 → login** remain (web-87 E2 deferral). Roadmap Phase 4 exit criteria and backlog row 10 require HOC deletion, lint, boundary behavior change, and conventions update.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| roadmap | [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) | Phase 4 exit criteria; spec row 10 |
| web-87 | [web-87-corporate-provider-policy-routes.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-87-corporate-provider-policy-routes) | C9 manual; E2 superseded by this spec |
| changing-a-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | ADR-018 D7; refused-response table |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | When policy runs; ky must not navigate |
| frontend | [frontend.md](/docs/50-59-frontend/conventions/frontend) | Auth policies section |
| ADR-018 | [adr-018-web-authentication-enforcement-model.md](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Policy replaces HOC |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Baseline:** #87 merged; zero runtime HOC imports | — | Only `app/components/hocs/*` define HOCs |
| 2 | Delete all four HOC files in one web PR | Staged delete | Roadmap; no consumers |
| 3 | **E2 replacement (A1):** Boundary shows session-expired `GeneralError` + **Sign in again** (link to surface login + `redirect_to`). **No** `useEffect` + `navigate` on 401 | Auto boundary navigate (today); ky navigate on hard 401; navigation-only `GeneralError` | ADR-018 D7: policies own entry redirects; boundary must not auto-navigate; sibling portal clicks often skip policy on Node — user needs explicit recovery |
| 4 | Public root **Sign in again** uses `buildIdentitiesLoginRedirect` / `resolveIdentitiesLoginPath` | New URL builder | Existing helpers; preserve `redirect_to` |
| 5 | Team root **Sign in again** uses `/team/login?redirect_to=…` | Shared with account login | Separate admin session scope |
| 6 | **Lint (Q2=A hardened):** ESLint `no-restricted-imports` **patterns** `**/components/hocs/**`, `**/with-*-auth**` under `app/**` | Vitest-only gate | Roadmap; delete `portal-auth-hoc-import-gate.spec.js` when redundant |
| 7 | `handleLoaderError` keeps rethrow on 401; comments reference A1 boundary | `revalidate()` in #88 ([#107](https://github.com/markmamba/red-cab-web/issues/107)) | Minimize blast radius in #88 |
| 8 | Boundary tests: no `navigate` on 401; assert Sign in again target; non-401 unchanged | Delete 401 tests | CI contract |
| 9 | Amend web-87 E2/decision 10 + `93-authentication/` pages in same docs stack | Web-only | Spec-first; single story |
| 10 | Agent docs per roadmap link table + expanded skill file list (plan) | Partial update | Prevent HOC drift in codegen |

### Surface contract (hard `401` after refresh fails)

| Surface | #88 behaviour | Follow-up |
| --- | --- | --- |
| Tourist / corporate / provider portals | A1 boundary; policy login on document request / enter area | [#107](https://github.com/markmamba/red-cab-web/issues/107) in-area `revalidate()` |
| Team | A1 with team login URL | Same |
| Public marketplace under `public-root` | A1 (may show error on guest-oriented pages) | [#109](https://github.com/markmamba/red-cab-web/issues/109) guest degradation |
| Session read middleware | `401` → `null` | Unchanged |

### Spike (document in PR or spec appendix)

Record whether policy middleware runs on sibling portal client navigation (e.g. `/corporate/a` → `/corporate/b`). Expected: often **no** `.data` to Node — motivates A1 and [#107](https://github.com/markmamba/red-cab-web/issues/107), not “next link alone” recovery.

**Spike result (2026-10-03):** In-area client navigations between sibling routes under the same portal layout typically **do not** re-run policy middleware on Node (no full document request). After session loss, the user cannot rely on clicking another portal link to reach login — **Sign in again** in the root boundary is required until [#107](https://github.com/markmamba/red-cab-web/issues/107) adds normative `revalidate()` handling.

## Web contract

### HOC removal

Delete:

- `app/components/hocs/with-no-auth.jsx`
- `app/components/hocs/with-tourist-auth.jsx`
- `app/components/hocs/with-corporate-auth.jsx`
- `app/components/hocs/with-provider-auth.jsx`

Verification:

```bash
rg -n 'withTouristAuth|withNoAuth|withCorporateAuth|withProviderAuth|components/hocs' red-cab-web redcab-docs
```

No route module may import HOC paths (ESLint enforces).

### Error boundaries (A1)

| Root | Remove | Add / keep |
| --- | --- | --- |
| `app/roots/public-root.jsx` | 401 `useEffect` `navigate`; `return null` for 401 | `GeneralError` with session-expired copy; primary **Sign in again** → `buildIdentitiesLoginRedirect(location.pathname, location.search)` (or equivalent link). 404 / other statuses unchanged |
| `app/roots/team-root.jsx` | Same pattern for team login | **Sign in again** → `/team/login?redirect_to=${encodeURIComponent(pathname+search)}` |

Optional: extract shared helper in `app/roots/` if diff stays small; else [#111](https://github.com/markmamba/red-cab-web/issues/111).

### Loader helpers

`app/utils/loader-utils.js`: docblock — 401 rethrow surfaces at route error boundary as A1 UI (not auto login redirect). Behaviour unchanged until #107.

### Lint / CI

`eslint.config.js`: `no-restricted-imports` with `patterns` (not only `@/` alias). Delete `app/routes/portal-auth-hoc-import-gate.spec.js` when ESLint covers the contract. Accept: `vi.mock` / dynamic import not caught (document in PR).

### Files to create or modify (Web)

| File | Change |
| --- | --- |
| `app/components/hocs/with-*.jsx` | delete (4) |
| `app/roots/public-root.jsx` | A1 boundary |
| `app/roots/team-root.jsx` | A1 boundary |
| `app/roots/public-root-error-boundary.spec.jsx` | no navigate; Sign in again |
| `app/roots/team-root-error-boundary.spec.jsx` | create |
| `app/utils/loader-utils.js` | comment |
| `eslint.config.js` | `no-restricted-imports` patterns |
| `app/routes/portal-auth-hoc-import-gate.spec.js` | delete |
| `.cursor/rules/10-routes-api-forms.mdc` | policy-only |
| `.ai/instructions.md` | policies |
| `.ai/skills/review-implementation-spec/SKILL.md` | policy checklist (not HOC) |
| `.ai/skills/creating-route-pages/SKILL.md` + templates | policy / A1 wording |
| `.ai/skills/review-react-style/rules/architecture-frontend.md`, `domain-accuracy.md`, `security.md` | policy / boundary |

### Docs (same stack as or before web codegen)

| File | Change |
| --- | --- |
| `docs/50-59-frontend/51-conventions/frontend.md` | **Auth policies** |
| `docs/90-99-engineering-meta/93-authentication/changing-a-session.md` | Post-#88 A1; point #107 for `revalidate()` |
| `docs/90-99-engineering-meta/93-authentication/rails-is-the-boundary.md` | Boundaries display only; policies navigate to login |
| `docs/90-99-engineering-meta/93-authentication/index.md` | Remove stale HOC-on-surfaces text |
| `docs/90-99-engineering-meta/93-authentication/implementation-roadmap.md` | Phase 4 ticks when shipped |
| `docs/90-99-engineering-meta/93-authentication/worked-examples.md` | Optional: A1 diagram |
| `web-87-corporate-provider-policy-routes.md` | E2 / decision 10 → superseded by web-88 |
| `iam/auth-platform/README.md` | index web-88 |

## Out of scope

- Policy module or `routes.js` changes
- [#107](https://github.com/markmamba/red-cab-web/issues/107)–[#112](https://github.com/markmamba/red-cab-web/issues/112) except as documented gaps
- [redcab-docs#32](https://github.com/markmamba/redcab-docs/issues/32) full auth-series pass (after F1–F3)
- Phase 5 / server sessions
- Provider portal 403 UX gaps (web-87 E3)
- API changes

## Tasks

### Docs

1. This spec `status: approved` (2026-10-03).
2. Commit redcab-docs (spec + `93-authentication` + web-87 amend + `frontend.md` as applicable) before web codegen.

### Web

1. ESLint + delete HOC files.
2. A1 boundary + specs.
3. Agent docs/skills/rules.
4. PR links this spec path + [#88](https://github.com/markmamba/red-cab-web/issues/88).

## Test plan

```bash
npm run test -- app/roots app/utils/loader-utils.spec.js app/routes/policies app/auth
npm run lint
npm run build
```

- [ ] `rg` shows no unintended HOC references
- [ ] Lint fails on forbidden HOC import (PR checklist or fixture)
- [ ] Boundary specs: 401 does not `navigate`; Sign in again href/path correct
- [ ] Policy/auth regression suite green

### Manual

| # | Steps | Expected |
| --- | --- | --- |
| M1 | Signed out → in-app `/account/bookings` | Tourist policy → login with `redirect_to` |
| M2 | Signed out → `/corporate`, `/providers/dashboard` | Surface login (unchanged) |
| M3 | Hard session `401` on protected page (invalid refresh) | A1: session-expired message + **Sign in again** → correct login + `redirect_to` → return after sign-in. **Do not** rely on sibling nav alone |

## Acceptance mapping

| #88 AC | Spec section |
| --- | --- |
| HOC files deleted | HOC removal |
| Lint forbids re-add | Lint / CI |
| Boundaries stop 401 auto-navigate | Error boundaries (A1) |
| Sign in again on 401 | Error boundaries (A1) |
| Conventions + agent docs | Docs + agent files |

## Related

- Parent: [#77](https://github.com/markmamba/red-cab-web/issues/77)
- Depends: [#87](https://github.com/markmamba/red-cab-web/issues/87) (closed)
- Follow-ups: [#107](https://github.com/markmamba/red-cab-web/issues/107)–[#112](https://github.com/markmamba/red-cab-web/issues/112), [redcab-docs#32](https://github.com/markmamba/redcab-docs/issues/32)
- PKM plan: `PersonalKnowledgeManagement/inbox/2026-10-03-issue-88-plan.md` (approved 2026-10-03)
