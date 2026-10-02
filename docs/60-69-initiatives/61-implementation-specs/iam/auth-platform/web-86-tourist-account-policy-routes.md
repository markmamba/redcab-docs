---
title: "Tourist account policy routes (auth Phase 3)"
sidebar_label: Web · tourist account policy routes
issue: "https://github.com/markmamba/red-cab-web/issues/86"
repos:
  - red-cab-web
status: approved
phase: 3
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-84-auth-core-modules.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-85-team-policy-routes.md"
  - "docs/90-99-engineering-meta/93-authentication/policy-routes-and-surfaces.md"
  - "docs/90-99-engineering-meta/93-authentication/changing-a-session.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships (two web PRs, one spec):**
  - **86a:** `account-guest-policy` + `routes.js` reshape; eight guest IAM URLs out of `marketplace.routes.js`; open pages stay in `marketplaceRoutes`; remove `withTouristAuth` (4) and `withNoAuth` (8 guest); strip `withNoAuth` from open `verify-email`; policy count **4**; `public-routes-tree.spec.js`; safe-redirect regression test (no `ACCOUNT_GUEST_PATHS` change).
  - **86b:** `logout` sibling + nav **`useFetcher`**; **three** guest login `clientAction`s via shared `createLoginAction` + `useSessionLoginSubmit`; OAuth callback **`clientAction`** auto-submit; **read-only** `AuthProvider` deriving account from `public-root` loader; profile/language PATCH **`await revalidate()`** before closing modals; agent guidance updates; code-map + `policy-routes-and-surfaces.md` amend.
- **Does NOT ship:** Corporate/provider **required** policies (#87); provider/corporate sign-out UI (#87); HOC file deletion (#88); server `loader` on account pages; API changes; profile/language as dedicated `clientAction` routes (follow-up); `/reset-password?token=` while signed in product fix (follow-up).
- **Breaking change:** No — URLs unchanged; enforcement moves from HOCs to policy middleware (R-2). Amend GitHub [#86](https://github.com/markmamba/red-cab-web/issues/86) AC to **four** `withTouristAuth` removals.

## Problem

`main` mounts guest IAM pages inside `marketplaceRoutes` without `account-guest-policy`, and account pages still use `withTouristAuth` despite `tourist-required-policy` wrapping the dashboard layout ([#86](https://github.com/markmamba/red-cab-web/issues/86)). Login/logout use imperative hooks (`onIdentitiesAccountUpdate`, `useIdentitiesLogout` with `finally` redirect), so the header can show signed-out while cookies remain. Phase 3 roadmap row 8 requires this issue before new Phase 2 tourist private pages rely on policy-only guards.

`public-root` `shouldRevalidate` skips the root loader on GET navigations to a different URL. Session changes must use route **`clientAction`** (non-GET) so the root revalidates — plain `navigate()` after OAuth does not refresh the header.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| policy-routes | [policy-routes-and-surfaces.md](/docs/90-99-engineering-meta/authentication/policy-routes-and-surfaces) | Target `public-root` tree; eight guest URLs; open pages |
| changing-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | Login/logout/OAuth `clientAction`; revalidation rules |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | Policy export shape; in-area 401 |
| code-map | [code-map.md](/docs/90-99-engineering-meta/authentication/code-map) | New modules |
| web-84 | [web-84-auth-core-modules.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-84-auth-core-modules) | Account guard, entry rules, session middleware |
| web-85 | [web-85-team-policy-routes.md](/docs/60-69-initiatives/implementation-specs/iam/auth-platform/web-85-team-policy-routes) | Parallel guest/required/logout pattern |
| ADR-018 | [adr-018-web-authentication-enforcement-model.md](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Policy enforcement; open pages |
| frontend | [frontend.md](/docs/50-59-frontend/conventions/frontend) | R-2 single door |
| program | [web-platform-program-strategy.md](/docs/70-79-business/planning/web-platform-program-strategy) | Phase 3 sequencing |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Baseline `main`** (#84 + #85 merged) | Stack on open PR | Admin policies + count 3 on `main` |
| 2 | **PR delivery:** **86a** policy + HOCs; **86b** session UX + provider | Single PR | Isolate high-risk session work; one spec |
| 3 | `account-guest-policy` mirrors `admin-guest-policy.jsx` | Inline middleware in layout | Export contract; tests |
| 4 | **Remove** `withTouristAuth` from **four** account pages | Keep HOC defense-in-depth | R-2; amend issue AC (“six” stale) |
| 5 | **Remove** `withNoAuth` from **eight** guest URLs | Remove all HOCs (#88) | Guest policy replaces guest HOC |
| 6 | **`verify-email`:** strip `withNoAuth`; stay in `marketplaceRoutes`, no policy | Keep HOC until #88 | Open page (ADR-018 D10); HOC contradicted “open” |
| 7 | **Open vs guest split (F5-B):** only eight guest IAM routes leave `marketplaceRoutes`; open URLs remain in `marketplaceRoutes` inside `TouristPublicLayout` | Move open pages to separate layout export | Chrome preserved; amend normative doc comment |
| 8 | **`openAccountRoutes`** export = **`/account/discover*`** only (`prefix('account', …)`) | Merge with root-level open URLs | Avoid `/account/verify-email` URL break |
| 9 | Duplicate layout id `tourist-public-layout-guest` on guest branch | Single layout instance | Normative; home ↔ login remounts nav/shell |
| 10 | **`EXPECTED_POLICY_MODULE_COUNT = 4`** + **public routes-tree** spec | Stem-only grep | Mirror web-85 |
| 11 | **`logout` sibling** under `public-root`, outside policies | Logout under required policy | Destroy when signed out |
| 12 | Logout **POST:** `401` → `redirect('/')`; else `data({ error }, { status })` — no redirect on failure | `finally` navigate | changing-a-session; team-logout pattern |
| 13 | Logout **GET:** `loader` → `redirect('/')` | Redirect to `/login` | Normative account logout |
| 14 | Nav sign-out: **`useFetcher` + `fetcher.Form`** `POST` `/logout`; pending + error toast | Plain `<Form action="/logout">` | Action errors not visible on current route match |
| 15 | Safe redirect `/logout` | Add to `ACCOUNT_GUEST_PATHS` | **Regression test only** — already blocked by `postAuthPath` role prefixes |
| 16 | In-area session loss: keep `public-root` `ErrorBoundary` `401` navigate until #88 | — | #88 removes boundary redirect |
| 17 | **`AuthProvider`:** derive `identitiesAccount` from `public-root` loader props; **no** setter; **no** local state/effect copy | Admin E1 resync with `publicLoaderData` | No optimistic writer; avoid cargo-cult |
| 18 | Profile / language PATCH | `await revalidator.revalidate()` before closing modal; disable submit until done; use PATCH **response** for next `buildUpdatePayload` | Prevents lost update when setter removed |
| 19 | Login **`clientAction`:** **three** pages (`/login`, `/providers/login`, `/corporate/login`) | All four including `/team/login` | Team login stays imperative (#85) |
| 20 | Login implementation: shared **`createLoginAction`** + **`useSessionLoginSubmit`** (RHF → `useSubmit`, `actionData` → fields/toast) | Per-page copy | One glue site; form posts to current URL (`redirect_to`) |
| 21 | OAuth callback: **`clientAction`** + mount **auto-submit once** (`useSubmit` + `useRef` StrictMode guard); `consumeIdentitiesPostAuthRedirect()`; `redirect(postAuthPath)` | `navigate` + revalidate; `clientLoader` POST | GET navigate does not revalidate root; loader replays code |
| 22 | Token-bearing guest URLs | Move reset-password to open | Document + manual matrix; follow-up for signed-in + token |
| 23 | **Docs PR first** + agent guidance in **86b** (`.cursor/rules`, `.ai/instructions.md`, `creating-route-pages` skill) | Defer skill sweep | Phase 3 gate for new tourist pages |

## Web contract

### Policy modules

| Module | Middleware rule |
| --- | --- |
| `account-guest-policy.jsx` | `authAccountGuard.protect(authEntryRules.accountGuest)` |
| `tourist-required-policy.jsx` | unchanged — `authEntryRules.touristRequired` |

Each exports `loader = () => null` and default `<Outlet />`.

### Route tree (target)

```text
layout('roots/public-root.jsx', [
  ...prefix('account', openAccountRoutes),   // /account/discover* only

  layout('layouts/tourist/tourist-public-layout.jsx', [
    ...marketplaceRoutes                     // marketplace + open IAM (verify-email, callback, discover*, tourists/sign-up)
  ]),

  layout('./routes/policies/account-guest-policy.jsx', [
    layout('layouts/tourist/tourist-public-layout.jsx', { id: 'tourist-public-layout-guest' }, [
      ...accountGuestRoutes
    ]),
    layout('layouts/provider/provider-public-auth-layout.jsx', [ provider guest login/sign-up ]),
    layout('layouts/corporate/corporate-public-auth-layout.jsx', [ corporate guest login/sign-up ])
  ]),

  layout('./routes/policies/tourist-required-policy.jsx', [
    layout('layouts/tourist/tourist-dashboard-layout.jsx', [
      ...prefix('account', touristAccountRoutes)
    ])
  ]),

  layout('layouts/provider/provider-layout.jsx', [ ... ]),      // unchanged until #87
  layout('layouts/corporate/corporate-layout.jsx', [ ... ]),    // unchanged until #87

  route('logout', './routes/identities-account/logout.js')      // 86b
])
```

**Normative amend (docs PR):** Open IAM pages remain inside `marketplaceRoutes` / `TouristPublicLayout` — not a “marketplace only” array after guest split. Stale “6 pages” `withTouristAuth` → **four**.

### Per-URL destination

| URL | Group | Policy ancestor | HOC in #86 |
| --- | --- | --- | --- |
| `/account/discover*` | `openAccountRoutes` → `prefix('account', …)` | none | — |
| `/verify-email` | `marketplaceRoutes` | none | remove `withNoAuth` |
| `/auth/google/callback` | `marketplaceRoutes` | none | — (86b `clientAction`) |
| `/tourists/sign-up`, `/discover`, `/discover/*` | `marketplaceRoutes` | none | — |
| `/`, `/districts/**`, `/listings/:uuid` | `marketplaceRoutes` | none | — |
| `/login`, `/sign-up`, `/forgot-password`, `/reset-password` | `accountGuestRoutes` | `account-guest-policy` | remove `withNoAuth` |
| `/providers/login`, `/providers/sign-up` | provider guest under guest policy | `account-guest-policy` | remove `withNoAuth` |
| `/corporate/login`, `/corporate/sign-up` | corporate guest under guest policy | `account-guest-policy` | remove `withNoAuth` |
| `/account/**` (dashboard) | `touristAccountRoutes` | `tourist-required-policy` | remove `withTouristAuth` (4 pages) |
| `/logout` | sibling route | none | — |

Tree spec must assert **every open URL has no policy ancestor**.

### Guest URL inventory (under `account-guest-policy`)

| URL | Page module |
| --- | --- |
| `/login` | `identities-account/login-page.jsx` |
| `/sign-up` | `tourist/sign-up-page.jsx` |
| `/forgot-password` | `identities-account/forgot-password-page.jsx` |
| `/reset-password` | `identities-account/reset-password-page.jsx` |
| `/providers/login` | `provider/provider-login-page.jsx` |
| `/providers/sign-up` | `provider/sign-up-page.jsx` |
| `/corporate/login` | `corporate/corporate-login-page.jsx` |
| `/corporate/sign-up` | `corporate/sign-up-page.jsx` |

### Account required inventory (under `tourist-required-policy`)

| URL | Remove `withTouristAuth` |
| --- | --- |
| `/account` | yes |
| `/account/checkout` | yes |
| `/account/checkout/return` | yes |
| `/account/bookings` | already no HOC |
| `/account/bookings/:bookingId` | yes |

### Logout route (86b)

| Method | Handler | Behavior |
| --- | --- | --- |
| POST | `clientAction` | `identitiesSessionsApi.destroy()`; `401` → `redirect('/')`; other errors → `data({ error }, { status })` without redirect |
| GET | `loader` | `redirect('/')` |

**Nav:** `tourist-nav.jsx` uses `useFetcher` + `fetcher.Form` `method="post"` `action="/logout"`. `fetcher.state !== 'idle'` → disabled “Signing out…”. Effect on `fetcher.data?.error` → toast via `getApiErrorToastConfig`. Success toast on redirect is optional (drop or flash later).

### Login routes (guest policy, 86b)

Three login pages use shared `createLoginAction` + page-level `clientAction`:

| Route | Module |
| --- | --- |
| `/login` | `identities-account/login-page.jsx` |
| `/providers/login` | `provider/provider-login-page.jsx` |
| `/corporate/login` | `corporate/corporate-login-page.jsx` |

- Action calls `identitiesSessionsApi.create` (same endpoint for portals); returns `redirect(authSafeRedirect.postAuthPath(...))` or `data({ error }, { status })`.
- `useSessionLoginSubmit` wires `IdentitiesSessionForm` (RHF) to `useSubmit`; maps `actionData` to fields/toast; keeps submit pending until navigation.
- Form posts to **current URL** (preserves `redirect_to` query).
- Remove imperative handlers calling `onIdentitiesAccountUpdate`.

### OAuth callback (open page, 86b)

- `/auth/google/callback` stays in `marketplaceRoutes`, outside policies.
- Export **`clientAction`:** POST `identitiesOauthApi.googleCallback({ code, state })`; `redirect(postAuthPath(account, consumeIdentitiesPostAuthRedirect()))`.
- Page mounts **one** auto-submit (`useSubmit` + `useRef` guard for StrictMode double-mount).
- Do **not** use `clientLoader` for the OAuth POST (revalidation replays single-use code).
- No `onIdentitiesAccountUpdate`.

### Identity provider (read-only, 86b)

- Context exposes **`identitiesAccount`** and **`isLoggedIn` only** — no setter.
- `AuthProvider` reads account from `public-root` `loaderData` (props); no `useState`/`useEffect` copy of loader data.
- `account-home-page.jsx` and `identities-account-language-prompt-modal.jsx`: after successful PATCH, **`await revalidator.revalidate()`** then close modal; disable submit until revalidation completes; prefer PATCH response when building next payload.

### Safe redirect

- **Do not** add `/logout` to `ACCOUNT_GUEST_PATHS`.
- Add spec test: `redirect_to=/logout` on `/login` resolves to home (role prefix rules).

### Known limitations

- No-JS POST to `/logout` → 405 (`clientAction` only; same as team).
- Tourist nav is the only sign-out entry on `main`; provider/corporate portals → #87.
- Signed-in user on `/reset-password?token=…` → guest policy redirect (token dropped); document in manual matrix; product follow-up.

### Files to create or modify (Web)

#### PR 86a

| File | Change |
| --- | --- |
| `app/routes/policies/account-guest-policy.jsx` | create |
| `app/routes.js` | guest policy branch; guest exports |
| `app/marketplace.routes.js` | remove eight guest IAM routes only |
| `app/tourist.routes.js` or `account-guest.routes.js` | export `accountGuestRoutes` |
| Four tourist account pages | remove `withTouristAuth` |
| Eight guest pages | remove `withNoAuth` |
| `app/routes/identities-account/verify-email-page.jsx` | remove `withNoAuth` |
| `app/routes/policies/policy-export-contract.spec.js` | count 4 |
| `app/routes/policies/public-routes-tree.spec.js` | create |
| `app/auth/auth-safe-redirect.spec.js` | `redirect_to=/logout` → home |
| Booking page tests | drop HOC mocks where needed |

#### PR 86b

| File | Change |
| --- | --- |
| `app/routes/identities-account/logout.js` | create |
| `app/routes.js` | register `logout` sibling (if not in 86a) |
| `app/hooks/use-logout-fetcher.jsx` (or inline in nav) | fetcher logout + toast |
| `app/layouts/tourist/tourist-nav.jsx` | fetcher logout |
| `app/auth/create-login-action.js` (or under `identities-session/`) | shared login `clientAction` factory |
| `app/domains/identities-session/use-session-login-submit.js` | RHF ↔ action glue |
| `app/routes/identities-account/login-page.jsx` | `clientAction` + hook |
| `app/routes/provider/provider-login-page.jsx` | same |
| `app/routes/corporate/corporate-login-page.jsx` | same |
| `app/routes/identities-account/google-oauth-callback-page.jsx` | `clientAction` + auto-submit |
| `app/routes/tourist/account-home-page.jsx` | `revalidate()` before close |
| `app/domains/identities-account/identities-account-language-prompt-modal.jsx` | same |
| `app/hooks/use-auth.jsx` | derive from loader; remove setter |
| `app/roots/public-root.jsx` | pass loader data to provider |
| `app/hooks/use-identities-logout.jsx` | delete when unused |
| `app/routes/identities-account/logout.spec.js` | create |
| `app/hooks/use-auth.spec.jsx` | provider matches loader after revalidation |
| `app/layouts/tourist/tourist-shell-layout.spec.jsx` | `createRoutesStub` for fetcher nav |
| `red-cab-web/.cursor/rules/10-routes-api-forms.mdc` | policy routes for `/account/*` |
| `red-cab-web/.ai/instructions.md` | same |
| `red-cab-web/.ai/skills/creating-route-pages/SKILL.md` (or templates) | tourist account → policy parent |

### Docs (approve before or stacked with 86a; policy-routes amend with 86b or docs PR)

| File | Change |
| --- | --- |
| `code-map.md` | `account-guest-policy.jsx`, `logout.js` under `public-root` |
| `iam/auth-platform/README.md` | index `web-86` |
| `policy-routes-and-surfaces.md` | open pages in `marketplaceRoutes`; four HOC removals; route tree comment |

## Out of scope

- `corporate-required-policy` / `provider-required-policy` (#87)
- Provider/corporate portal sign-out UI (#87)
- Delete `with-*-auth` modules; lint; remove public-root `401` boundary navigate (#88)
- Team policies (#85) — reference only; team login `clientAction` still deferred
- Server `loader` migration for account pages
- API session endpoints
- Profile/language PATCH as dedicated route `clientAction`s (follow-up)
- `/reset-password` signed-in + token semantics (follow-up)
- Audit all tourist account handlers for `401` → `revalidate()` (recommended in 86b; not blocking)

## Tasks

### Docs

1. Set this spec `status: approved` after `review-implementation-spec`; amend `code-map.md`, auth-platform README, `policy-routes-and-surfaces.md`.
2. Amend GitHub issue #86 AC to four `withTouristAuth` removals.

### Web PR 86a

1. `account-guest-policy` + route exports + `routes.js` reshape.
2. `public-routes-tree.spec.js` + policy export count 4 + safe-redirect test.
3. Strip HOCs (4 tourist + 8 guest + `verify-email`).
4. Manual: signed-out in-app `/account/bookings` → login; `/account/discover*` legacy redirect.

### Web PR 86b

1. `logout.js` + `useLogoutFetcher` + tourist-nav.
2. `createLoginAction` + `useSessionLoginSubmit` + three login pages.
3. OAuth `clientAction` + tests (root revalidation; single submit on double-mount).
4. Derive-only `AuthProvider` + profile/language `revalidate()` contract.
5. Agent/rule doc updates.
6. Full test slice + manual matrix.

## Test plan

### Automated

```bash
npm run test -- app/routes/policies app/routes/identities-account app/hooks/use-auth app/auth app/layouts/tourist app/roots
npm run lint
npm run build
```

- [ ] Policy export count = 4; no `shouldRevalidate` / `clientLoader` on policy modules
- [ ] Public routes-tree: guest nesting; required nesting; `logout` sibling; **each open URL has no policy ancestor**
- [ ] `auth-safe-redirect`: `redirect_to=/logout` on `/login` → home (no constant change)
- [ ] Logout `clientAction`: success → `/`; `401` → `/`; `500` → error payload
- [ ] Nav: fetcher toast on logout `500`; pending disables button (`createRoutesStub`)
- [ ] OAuth: action redirect revalidates root; double-mount submits once
- [ ] Login: shared factory on three routes; `redirect_to` preserved
- [ ] `use-auth`: provider reflects loader data after revalidation
- [ ] Profile/language: modal does not close until `revalidate()` resolves (as feasible)

### Manual

- [ ] Sign out via nav → `/`; cookies cleared
- [ ] In-app `/account/bookings` → `/login?redirect_to=...` (policy)
- [ ] Google sign-in → destination with header signed-in **without** full reload
- [ ] API stopped → sign out → toast; still signed in
- [ ] Browser Back after sign-out → login redirect
- [ ] `/account/checkout/return?session_id=…` after session loss → login with redirect preserves query
- [ ] `/reset-password?token=…` while signed in → document actual behavior
- [ ] Profile then language preference back-to-back → no field reverts
- [ ] `/account/discover*` as guest → legacy redirect (not login trap)

## Acceptance mapping

| Issue AC (amended) | Spec section |
| --- | --- |
| `/account/**` under required policy; **four** HOC removals | Route tree; account required table |
| Eight guest pages under guest policy | Guest URL table |
| `/verify-email` open; discover* outside policy | Per-URL table; `openAccountRoutes` vs `marketplaceRoutes` |
| login/logout/OAuth `clientAction`; read-only provider; fetcher logout | Login, logout, OAuth, identity provider |
| Manual bookings redirect + Google header | Manual test plan |
| Gate for new Phase 2 tourist pages | TL;DR + agent guidance (decision 23) |

## Related

- Parent: [#77](https://github.com/markmamba/red-cab-web/issues/77)
- Depends: [#84](https://github.com/markmamba/red-cab-web/issues/84) (merged)
- Parallel pattern: [#85](https://github.com/markmamba/red-cab-web/issues/85) (merged)
- Follow-on: [#87](https://github.com/markmamba/red-cab-web/issues/87), [#88](https://github.com/markmamba/red-cab-web/issues/88)
- Plan review: PKM `2026-10-02-issue-86-plan-review-sonnet.md` (findings incorporated)
