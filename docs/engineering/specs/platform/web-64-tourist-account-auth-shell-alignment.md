---
title: "Tourist account and auth shell alignment"
sidebar_label: Web · Tourist auth chrome
issue: "https://github.com/markmamba/red-cab-web/issues/64"
repos:
  - red-cab-web
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/platform/web-58-tourist-unified-layout-shell.md"
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "red-cab-web#58"
  - "red-cab-web#60"
parent: "red-cab-web#55"
---

## TL;DR

- **Ships:** visual alignment of tourist `/account` and **all marketplace IAM routes** (`/login`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/google/callback`) with `TouristShellLayout` chrome. **No** auth session/redirect/form behavior changes.
- **Supersedes for tourist auth only:** `web-58` design decision #19 — tourist IAM drops nested full-viewport chrome (`PublicAuthLayout` / `AuthPageShell`) in favor of `TouristAuthContent` inside shell `main`.
- **Does NOT ship:** provider/corporate auth layouts; API changes; breadcrumb data on auth pages; shell remount fix public ↔ dashboard; OAuth nav guard during loading; mobile sign-out affordance outside nav collapse.
- **Breaking change:** No URL or API changes.

## Problem

After `#58`, marketplace and account routes use `TouristShellLayout`, but tourist auth still nests conflicting chrome:

1. **`/login`, `/sign-up`** — `PublicAuthLayout` (`min-vh-100`, split panel, blob) inside `TouristPublicLayout` → stacked viewport-height blocks in the shell flex column (double chrome / scroll jank).
2. **`/forgot-password`, `/reset-password`, `/verify-email`** — `AuthPageShell` (`min-height: 70vh` in `_brand.scss`) fights shell `main` flex layout.
3. **`/account`** — already on `TouristDashboardLayout`; spacing/token polish; remove redundant Account actions card (Q3=B).

Evidence: `app/routes.js`; `login-page.jsx`, `sign-up-page.jsx`, IAM pages under `marketplace.routes.js`; roadmap Milestone B in `tourist-ui-pre-phase-2.md`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| web-58 | [/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell](/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell) | Shell components, tokens, account `contentVariant`; decision #19 deferred auth chrome to Milestone B |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Layout assignment; marketplace IAM under `TouristPublicLayout` — unchanged |
| ADR-017 | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Tourist UI sequencing; coordinate with auth epic `#23` |
| tourist-ui-pre-phase-2 | [/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md](/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md) | Milestone B P1 — account home + auth restyle |
| frontend.md | [/docs/engineering/conventions/frontend.md](/docs/engineering/conventions/frontend) | Layout location, Bootstrap-first tokens |
| red-cab-web#64 | [GitHub issue](https://github.com/markmamba/red-cab-web/issues/64) | Acceptance criteria — visual alignment, no auth behavior changes |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **No route registry changes** | Move auth under dashboard layout | `#56` / `web-56` Web contract table |
| 2 | **HOCs unchanged** on login/sign-up/forgot/reset/verify (`withNoAuth` where today) | Add `withNoAuth` to OAuth callback | Callback intentionally has no HOC today — restyle only; do not drive-by add |
| 3 | **All marketplace IAM routes** use `TouristAuthContent` (plan Q1=B) | Login/sign-up only | One in-shell pattern; three migration shapes (see Web contract) |
| 4 | **`TouristAuthContent`** (plan Q2=A) | `AuthPageShell`; `PublicAuthLayout variant="inShell"` | Centered column in shell `main`; **no** `min-vh-100` or nested full-viewport wrappers |
| 5 | **SCSS isolation** — new `.tourist-auth-content` block only in `_components.scss` | Edit shared `.public-auth-*` | Four B2B pages share `.public-auth-*`; zero edits to existing `.public-auth-*` selectors (~L243–296) |
| 6 | **Tourist IAM stops importing `AuthPageShell`**; **`_brand.scss` unchanged** | Align `.auth-page-shell` | Forgot/reset/verify migrate to `TouristAuthContent`; component file may remain until cleanup |
| 7 | **Supersedes `web-58` decision #19** for tourist marketplace IAM presentation | Amend `web-58` in place | Issue-scoped contract |
| 8 | **Account home** — spacing/tokens; **remove entire Account actions card** (Q3=B) | Keep duplicate Sign out | Nav Sign out canonical; document mobile discoverability trade-off (see Known limitations) |
| 9 | **Meta robots unchanged** | — | Account `noindex,nofollow`; auth pages keep existing `meta` |
| 10 | **`#23` coordination** | Revert tourist to split-panel | B2B portals unchanged; tourist follows A3 shell |

## API contract

_No API changes._

## Web contract

### Layout assignment (unchanged from `#56`)

| Route | Layout parent | Page auth HOC |
| --- | --- | --- |
| `/login` | `TouristPublicLayout` → `TouristShellLayout` | `withNoAuth` |
| `/sign-up` | `TouristPublicLayout` → `TouristShellLayout` | `withNoAuth` |
| `/forgot-password`, `/reset-password`, `/verify-email` | `TouristPublicLayout` → `TouristShellLayout` | `withNoAuth` (unchanged) |
| `/auth/google/callback` | `TouristPublicLayout` → `TouristShellLayout` | none (unchanged — no drive-by HOC) |
| `/account` | `TouristDashboardLayout` → `TouristShellLayout` (`contentVariant="account"`) | `withTouristAuth` |

`PublicAuthLayout` and `AuthPageShell` **must not** wrap marketplace IAM page content after this issue.

### Migration tiers (one PR, separate verification)

| Tier | Routes | Before | After |
| --- | --- | --- | --- |
| 1 | `/login`, `/sign-up` | `PublicAuthLayout` | `TouristAuthContent` + existing Cards/forms |
| 2 | `/forgot-password`, `/reset-password`, `/verify-email` | `AuthPageShell` | `TouristAuthContent`; test verify-email after sign-up redirect (`/verify-email?email=…`) |
| 3 | `/auth/google/callback` | bare `Container` + `Card` | `TouristAuthContent` spacing parity |

### `TouristAuthContent`

- Renders inside shell `main` only: centered column via padding/flex on the wrapper (not viewport height), optional `maxWidth` (login 420px, sign-up 480px — preserve current defaults).
- **Forbidden:** `min-vh-100`, `min-height: 70vh` (or equivalent full-viewport centering), `TeamBlobBackground`, split `AuthRolePanel`, nested full-viewport containers.
- Login/sign-up footer links remain portal-scoped per `#23` (no cross-role links on forms).
- Account home polish must not change loaders or profile/booking fetch behavior (UI-only).

### SCSS (`app/styles/_components.scss`)

- Add a **new commented section** with `.tourist-auth-content` (and element modifiers as needed).
- **Do not** edit, rename, or remove any existing `.public-auth-*` rule in this PR.
- PR review: `git diff app/styles/_components.scss` must not touch the `.public-auth-*` block.

### Account home

- Keep `handle.breadcrumb: 'Account'`.
- Profile cards and modals unchanged except spacing/classes aligned with bookings list patterns.
- **Remove** the Account actions card entirely (it only contained Sign out).

### Files to create or modify (Web)

- `app/components/tourist/tourist-auth-content.jsx`
- `app/routes/identities-account/login-page.jsx`
- `app/routes/tourist/sign-up-page.jsx`
- `app/routes/identities-account/forgot-password-page.jsx`
- `app/routes/identities-account/reset-password-page.jsx`
- `app/routes/identities-account/verify-email-page.jsx`
- `app/routes/identities-account/google-oauth-callback-page.jsx`
- `app/routes/tourist/account-home-page.jsx`
- `app/styles/_components.scss` (new `.tourist-auth-content` section only)
- **Not modified:** `app/layouts/auth/public-auth-layout.jsx`, `app/styles/_brand.scss`
- Optional: `app/layouts/tourist/tourist-shell-layout.spec.jsx` or `tourist-auth-content` spec

## Known limitations (accepted for #64)

| Limitation | Notes |
| --- | --- |
| **Public ↔ dashboard shell remount** | Default post-login tourist home is `/account` (`identities-auth-utils.js`). `/account` is under `tourist-dashboard-layout.jsx`; IAM routes under `tourist-public-layout.jsx` — React Router remounts the full shell (nav/footer/breadcrumbs). Language prompt `isPromptDismissedThisSession` resets. Pre-existing; not introduced by #64. Verify **URL and auth behavior**, not shell persistence. |
| **OAuth callback loading UI** | Guest nav CTAs may show above “Completing Google sign in…” until `onIdentitiesAccountUpdate` — pre-existing. |
| **Mobile sign out (Q3=B)** | Sign out only in collapsed `Navbar.Collapse` on small viewports after Account actions card removed. Documented UX trade-off; follow-up issue if product wants a persistent mobile control. |

## Out of scope

- Session cookies, redirect rules, OAuth API logic, form validation/submit handlers
- Adding `withNoAuth` to `google-oauth-callback-page.jsx`
- Nav guest-state guard during OAuth loading
- Merging `TouristPublicLayout` and `TouristDashboardLayout` into one `layout()` node
- Provider/corporate `PublicAuthLayout` routes and SCSS
- Route URL or registry changes
- Breadcrumb labels on auth routes
- Backend/API changes
- Deprecating `AuthPageShell` component file (tourist routes only stop importing)

## Tasks

### Docs

- [x] PKM plan approved (`2026-09-26-issue-64-plan.md`)
- [x] `review-implementation-spec` — approved 2026-09-26
- [x] Commit spec to `redcab-docs` before `red-cab-web` codegen PR
- [x] Cross-link `web-58` → `web-64` (decision #19 supersession note)

### Web

- [x] Add `TouristAuthContent` (no viewport-height traps)
- [x] Tier 1 — login + sign-up off `PublicAuthLayout`
- [x] Tier 2 — forgot + reset + verify off `AuthPageShell`
- [x] Tier 3 — OAuth callback spacing
- [x] Account home polish; remove Account actions card
- [x] SCSS — `.tourist-auth-content` only; verify `.public-auth-*` untouched in diff
- [x] Automated tests (`tourist-auth-content.spec.jsx`); tiered manual matrix — **manual QA pending pre-merge**

## Acceptance criteria

- [x] `/account` matches unified shell nav/footer and account main spacing; no Account actions card (code; visual QA manual)
- [x] All marketplace IAM routes show shell nav/footer without nested full-viewport auth chrome (code; visual QA manual)
- [x] `_components.scss` adds only `.tourist-auth-content`; no `.public-auth-*` edits
- [x] Tourist IAM routes do not import `AuthPageShell`; `_brand.scss` unchanged
- [x] No auth behavior changes (session, redirects, forms, HOC set as Web contract table)
- [x] Meta robots unchanged
- [ ] Post-login redirects work (default + `redirect_to`); shell remount acceptable per Known limitations (manual)

## Test plan

### Automated

- [x] `npm run test` — `tourist-auth-content.spec.jsx` (full suite on PR/CI)
- [x] `npm run lint`

### Manual — Tier 1

- [ ] `/login`, `/sign-up`: nav/footer; no split panel/blob; forms submit; Google authorize redirect

### Manual — Tier 2

- [ ] `/forgot-password`, `/reset-password`: in-shell layout
- [ ] `/verify-email` direct and after sign-up with `?email=` — resend UI layout

### Manual — Tier 3

- [ ] `/auth/google/callback`: card spacing; guest nav during loading = known limitation

### Manual — Account & redirects

- [ ] `/account`: breadcrumbs, modals; sign out via nav (desktop + mobile hamburger)
- [ ] Post-login `?redirect_to=` and default `/account` — correct URL/behavior

### Manual — B2B regression

- [ ] `/providers/login`, `/corporate/login`: split `PublicAuthLayout` unchanged
- [ ] PR: `_components.scss` diff does not modify `.public-auth-*` block

## Verification commands

```bash
cd red-cab-web
npm run lint
npm run test
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-26 | Agent | `review-implementation-spec` | Must-fix / should-fix folded into spec (SCSS isolation, `AuthPageShell` fate, tiered test plan, known limitations, component path) |
| 2026-09-26 | — | Cross-check `web-56`, `web-58`, ADR-017, PKM plan hidden risks | No FR/ADR/INV or layout-table conflicts |
| 2026-09-26 | Agent | `review-react-style` (PKM repo review) | Merge-ready pending manual tiered QA; nits: tier-2 heading parity, test guardrail for `70vh`/`min-vh` |
