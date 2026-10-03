---
title: "Corporate and Provider policy routes (auth Phase 4)"
sidebar_label: Web · corporate/provider policy routes
issue: "https://github.com/markmamba/red-cab-web/issues/87"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-84-auth-core-modules.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-86-tourist-account-policy-routes.md"
  - "docs/90-99-engineering-meta/93-authentication/policy-routes-and-surfaces.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships (two stacked web PRs, one spec):**
  - **87a (PR1):** `corporate-required-policy` + `provider-required-policy`; nest layouts in `routes.js`; remove HOC wrappers from **thirteen** route modules (1 corporate + 12 provider); bump `react-router` / `@react-router/*` to **`^8.3.0`**; E1 behavior tests + align `provider_role_required` redirect with `getIdentitiesHomePath`; policy count **6**; routes-tree + surface-path consistency tests; grep gate — no HOC imports outside `app/components/hocs/`.
  - **87b (PR2):** Portal sign-out in `PortalChrome` via `useLogoutFetcher` + `POST /logout` (web-86 follow-on).
- **Does NOT ship:** HOC file deletion or lint ([#88](https://github.com/markmamba/red-cab-web/issues/88)); removal of `public-root` `ErrorBoundary` 401 → login (**#88 must keep** until centralized replacement exists); provider UX for `provider_approval_pending` / `provider_application_rejected` / `provider_account_suspended` (follow-up); `corporate_profile_required`; server `loader` migration; new portal features.
- **Breaking change:** URLs unchanged; signed-out login URLs improve. **User-visible:** wrong-role sessions redirect to role home (HOCs previously rendered blank).

## Problem

`main` mounts `corporate-layout` and `provider-layout` without required policies ([#87](https://github.com/markmamba/red-cab-web/issues/87)). Thirteen private portal pages still use `withCorporateAuth` / `withProviderAuth` (R-2 violation once policies exist). HOCs send signed-out users to `/login` instead of surface logins. Provider `clientLoader`s run in parallel with policy server work — `provider_role_required` today can `redirect('/')`, conflicting with policy wrong-role destinations (E1).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| policy-routes | [policy-routes-and-surfaces.md](/docs/90-99-engineering-meta/authentication/policy-routes-and-surfaces) | Target nesting; onboarding not a policy |
| roadmap | [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) | Phase 4 row 9 |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | Policy export shape |
| web-84 | [web-84-auth-core-modules.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-84-auth-core-modules) | Entry rules + guards |
| web-86 | [web-86-tourist-account-policy-routes.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-86-tourist-account-policy-routes) | Guest policy; defers required + sign-out |
| ADR-018 | [adr-018-web-authentication-enforcement-model.md](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Policy replaces HOC |
| api-145 | [api-145-portal-gate-forbidden.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/api-145-portal-gate-forbidden) | Portal `403` codes |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Baseline `main`** (#85 + #86 merged) | Older branch | Policies on `public-root` / `team-root` |
| 2 | **Delivery:** **87a** policies + HOC strip; **87b** sign-out | Single PR | Isolate security change from chrome (S1-B) |
| 3 | Policy modules mirror `tourist-required-policy.jsx` | Layout inline guard | Export contract |
| 4 | **Remove** HOC from **13** pages in **87a** | Keep HOC defense-in-depth | R-2 |
| 5 | **Keep** HOC files until #88 | Delete in #87 | Roadmap split |
| 6 | React Router **`^8.3.0`** | Stay on 8.0.0 | `clientMiddleware` contingency for E1 |
| 7 | **E1 Option A:** behavior tests + `provider_role_required` → `getIdentitiesHomePath` | Option B `clientMiddleware` first | Minimal scope; single wrong-role authority |
| 8 | **E1 contingency:** `clientMiddleware` on required policies only if Option A spike fails | Server layout `loader` (Option C) | Extend policy contract only when proven necessary |
| 9 | Provider onboarding in `clientLoader` + `ProvidersProfileService` | Policy extension | ADR-018 D5; handled codes: `provider_profile_required`, `provider_role_required` only |
| 10 | **E2:** Policy = **entry** guard; mid-session hard `401` → root `ErrorBoundary` **A1** (session-expired UI + Sign in again) | Delete boundary in #87 without replacement | **Superseded by** [web-88-remove-auth-hocs.md](web-88-remove-auth-hocs.md) |
| 11 | **E3:** Pending/rejected/suspended provider states | Handle in #87 | Out of scope; follow-up issue |
| 12 | Corporate dashboard: no `clientLoader`, no API on load | Add loader | Document — mid-session expiry undetected until navigation/reload |
| 13 | Sign-out **87b** | Defer | web-86 + plan Q1=A |
| 14 | Tests: regex tree **+** policy behavior **+** surface-path consistency | Regex only | S2 |
| 15 | **Docs committed** with `approved` before web codegen | Web-first | Spec-first |

## Web contract

### Policy modules

| Module | Middleware rule |
| --- | --- |
| `corporate-required-policy.jsx` | `authAccountGuard.protect(authEntryRules.corporateRequired)` |
| `provider-required-policy.jsx` | `authAccountGuard.protect(authEntryRules.providerRequired)` |

Each exports `loader = () => null` and default `<Outlet />`. Add `clientMiddleware` only if E1 Option A fails (amend `policy-export-contract.spec.js` accordingly).

### Route tree (target)

```text
layout('roots/public-root.jsx', [
  ...existing open + guest + tourist-required...,

  layout('./routes/policies/corporate-required-policy.jsx', [
    layout('layouts/corporate/corporate-layout.jsx', [
      ...prefix('corporate', corporateRoutes)
    ])
  ]),

  layout('./routes/policies/provider-required-policy.jsx', [
    layout('layouts/provider/provider-layout.jsx', [
      ...prefix('providers', providerRoutes)
    ])
  ]),

  route('logout', './routes/identities-account/logout.js')
])
```

Guest corporate/provider login and sign-up remain under `account-guest-policy`.

### HOC removal (87a only — 13 modules)

| File | HOC removed |
| --- | --- |
| `app/routes/corporate/corporate-dashboard-page.jsx` | `withCorporateAuth` |
| `app/routes/provider/provider-dashboard-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-bookings-list-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-bookings-detail-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-catalog-listings-list-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-catalog-listings-create-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-catalog-listings-edit-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-catalog-assets-list-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-catalog-assets-create-page.jsx` | `withProviderAuth` |
| `app/routes/provider/provider-catalog-assets-edit-page.jsx` | `withProviderAuth` |
| `app/routes/provider/providers-profile-registration-create-page.jsx` | `withProviderAuth` |
| `app/routes/provider/providers-profile-registration-edit-page.jsx` | `withProviderAuth` |
| `app/routes/provider/providers-profile-registration-documents-page.jsx` | `withProviderAuth` |

**Not stripped (guest, no HOC):** `provider-login-page.jsx`, provider `sign-up-page.jsx`, `corporate-login-page.jsx`, corporate `sign-up-page.jsx`.

### E1 implementation gate (87a first commits)

1. Bump React Router to `^8.3.0`.
2. Add behavior tests: signed-out → surface login with `redirect_to`; tourist on `/providers/*` → role home (not `/`).
3. Change `ProvidersProfileService` handling of `provider_role_required` to use `getIdentitiesHomePath` (or equivalent alignment with policy).
4. Record spike pass/fail in PR description; if fail, implement Option B and update policy export contract tests.

### Sign-out (87b)

`PortalChrome` + `useLogoutFetcher`: `fetcher.Form` `method="post"` `action="/logout"`. Reuse `app/routes/identities-account/logout.js`.

### #88 coupling (E2)

Boundary 401 auto-navigation and HOC file deletion are owned by [web-88-remove-auth-hocs.md](web-88-remove-auth-hocs.md) (**A1**: session-expired UI + **Sign in again**, no `useEffect` navigate). Do not remove the boundary UX entirely — only the automatic redirect.

### Files to create or modify (Web)

#### PR 87a

| File | Change |
| --- | --- |
| `package.json` (+ lockfile) | `react-router`, `@react-router/dev`, `@react-router/node`, `@react-router/serve` → `^8.3.0` |
| `app/routes/policies/corporate-required-policy.jsx` | create |
| `app/routes/policies/provider-required-policy.jsx` | create |
| `app/routes.js` | nest layouts under policies |
| 13 route files (table above) | remove HOC wrapper |
| `app/domains/providers-profile/providers-profile-service.js` | E1 — `provider_role_required` destination |
| `app/routes/policies/policy-export-contract.spec.js` | count 6 |
| `app/routes/policies/public-routes-tree.spec.js` | nesting assertions |
| `app/auth/auth-session-redirect-integration.spec.js` or new policy behavior spec | E1 behavior |
| `app/auth/auth-surface-paths-consistency.spec.js` | new — S3 |
| Test or grep | no HOC imports outside `components/hocs/` |
| `.cursor/rules/10-routes-api-forms.mdc` | policies; #88; E2 boundary note |

#### PR 87b

| File | Change |
| --- | --- |
| `app/components/brand/portal-chrome.jsx` | sign-out UI |
| `app/layouts/corporate/corporate-layout.jsx` | logout wiring |
| `app/layouts/provider/provider-layout.jsx` | same |
| `app/components/brand/portal-chrome.spec.jsx` | create or extend |

### Docs (with or before 87a)

| File | Change |
| --- | --- |
| `iam/auth-platform/README.md` | index `web-87` |
| `code-map.md` | corporate/provider policy modules |

## Out of scope

- #88 HOC delete, lint, boundary navigate removal without replacement
- Provider gate UX for approval pending / rejected / suspended (follow-up)
- `corporate_profile_required`
- API changes; server `loader` migration for portal pages
- Flip `LEGACY_PROVIDER_PROFILE_GATE_BRIDGE` off
- Consolidate role→path tables (future refactor)

## Tasks

### Docs

1. This spec `status: approved` — committed before web codegen.
2. README `Committed:` includes `web-87`.

### Web 87a

1. React Router bump + install.
2. E1 spike (tests + service alignment).
3. Policies + `routes.js` + HOC strip (13 files).
4. Automated tests + manual matrix (PR1 rows).
5. Open PR1; update GitHub #87 body (canonical spec path, AC traceability).

### Web 87b

1. Portal sign-out UI.
2. Manual C9–C10 + back-after-sign-out row.
3. Open PR2 stacked on 87a branch.

## Test plan

### Automated

```bash
npm run test -- app/routes/policies app/auth app/domains/providers-profile
npm run lint
npm run build
```

- [ ] Policy count = 6; export contract (extend if `clientMiddleware` added)
- [ ] Routes-tree nesting for corporate/provider policies
- [ ] E1 behavior: signed-out + wrong-role portal paths
- [ ] Surface-path consistency (S3)
- [ ] No `withCorporateAuth` / `withProviderAuth` outside `app/components/hocs/`

### Manual

| # | Steps | Expected |
| --- | --- | --- |
| C1 | Signed out → in-app `/corporate` | `/corporate/login?redirect_to=…` |
| C2 | Signed out → in-app `/providers/dashboard` | `/providers/login?redirect_to=…` |
| C3 | Tourist → in-app `/corporate` | Role home redirect |
| C4 | Corporate → `/providers/dashboard` | Away from provider portal |
| C5 | Provider → `/corporate` | Away from corporate portal |
| C6 | Provider onboarding incomplete → protected URL | Loader/`provider_profile_required` path |
| C7 | Registration routes | Reachable with provider role |
| C8 | Legacy bridge optional smoke | 403 path is primary |
| C9 | Mid-session expiry inside portal → another portal link | 401 → boundary login (sanctioned until replacement) |
| C10 | Pending/suspended provider (if testable) | Generic error — known gap (E3) |
| C11 | Sign out (87b) → Back | Policy redirects to login |
| C12–C13 | Corporate/provider sign-out (87b) | `POST /logout` → `/`; return to portal → login |

## Acceptance mapping

| Requirement | Spec section |
| --- | --- |
| Policies wired | Route tree; 87a |
| Provider onboarding / 403 (handled codes) | E1; C6–C7 |
| Manual portal tests | Manual matrix |
| Sign-out | 87b; C12–C13 |

## Related

- Parent: [#77](https://github.com/markmamba/red-cab-web/issues/77)
- Depends: [#85](https://github.com/markmamba/red-cab-web/issues/85), [#86](https://github.com/markmamba/red-cab-web/issues/86)
- Follow-on: [#88](https://github.com/markmamba/red-cab-web/issues/88) (amend scope per E2)
- PKM plan: `PersonalKnowledgeManagement/inbox/2026-10-03-issue-87-plan.md`
- Plan review: `PersonalKnowledgeManagement/inbox/2026-10-03-issue-87-plan-review-sonnet.md`
