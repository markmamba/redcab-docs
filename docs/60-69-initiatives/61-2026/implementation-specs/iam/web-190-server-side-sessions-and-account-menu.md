---
title: "Remove session refresh and add the account menu"
sidebar_label: Web · Server-side sessions
issue: "https://github.com/markmamba/red-cab-web/issues/190"
repos:
  - red-cab-web
status: implemented
phase: 2
context: IAM
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#web-session-rules"
  - "docs/30-49-domains/32-iam/iam-decisions.md#policy-routes"
  - "docs/30-49-domains/32-iam/iam-decisions.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-147-server-side-sessions.md"
---

## TL;DR

- The web stops refreshing sessions, and a `401` is final.
- The web deletes the refresh code, both session bridges and the root URL guard.
- A policy route sends a person whose session ended to login, on the next click.
- The tourist nav gets an account menu, opened from the avatar.
- Persons and team admins can sign out of all devices.
- The tourist account menu holds Sign out of all devices, behind a confirmation.
- The provider portal and the team portal get sign-out controls.
- This spec does not change the entry rules, the current-session answer or the visual layout of the portals.
- Breaking change: Yes.
  - The web and `red-cab-api` must deploy together, and everyone signs in again.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| session cookie | The cookie that holds the signed uuid of one session row. |
| policy route | A route that decides on Node who may enter the routes inside it. |
| root URL guard | The code in the function `shouldRevalidateWithUrlChangeGuard` that stops the root loader on a URL change. |
| revalidation bridge | The file `app/auth/root-revalidation-bridge.jsx`, which reloads the root data after a `401`. |
| cross-tab bridge | The file `app/auth/account-session-cross-tab-bridge.jsx`, which tells other tabs about a sign-out. |
| account menu | The dropdown that opens from the avatar and the name. |

## User stories

1. US-1: As a tourist, I want my profile and my bookings in one menu, so the top bar stays short.
2. US-2: As a person whose session ended, I want to return to my page, so I keep my place.
3. US-3: As a person who lost a device, I want to sign out everywhere, so my account stays safe.
4. US-4: As a provider or a team admin, I want a sign-out control, so I can end my session.

## Problem

The web holds code for a refresh that goes away, and some sign-out controls are missing.

- The file `app/api/ky-client.js` has 456 lines, with refresh and retry code for each client.
- The file `app/auth/auth-session-cookies.js` knows only the old cookie names.
- The root URL guard stops the root loader on a URL change, so the header can show a stale person.
  - The revalidation bridge and the cross-tab bridge work around this stale state.
- The function `getCookie` turns a missing CSRF cookie into the text `undefined`.
  - Rails would answer `csrf_token_invalid`, not `csrf_token_missing`.
- The top nav shows Bookings, Account and Sign out as separate links.
- No screen has a control for sign out of all devices.
- The provider layouts and the team layouts have no sign-out control.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules) | Only `401` means signed out, and nothing refreshes |
| Rule | [Policy routes](/docs/30-49-domains/iam/iam-decisions/#policy-routes) | How a policy route decides |
| Rule | [Server-side sessions](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions) | Sign-out behavior |
| Rule | [Production hosts](/docs/30-49-domains/iam/iam-decisions/#production-hosts) | Hosts and cookie names |
| Rule | [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) | A `403` never signs anyone out |
| Requirement | [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals) | US-6 and US-7 of that page |
| Record | [Sessions are database records, and nothing refreshes](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions) | The web deletes the refresh code and the two bridges |
| Paired spec | [API server-side sessions](api-147-server-side-sessions.md) | The API contract, and it must deploy with this spec |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Delete the revalidation bridge. A `401` in a `clientLoader` is thrown, and the policy route redirects on the same navigation. | Keep the bridge. | React Router reruns the policy loader on each click, so the policy decides without a bridge. |
| 2 | Delete the root URL guard. Each root uses a small `shouldRevalidate` that only adds `401` and `403`. | Keep the guard. | The router default applies. A failed action with `401` or `403` reloads the root, and the policy on the next click acts on the new session. |
| 3 | Delete the cross-tab bridge. | Keep the bridge. | The next click in the other tab rereads the session, so the bridge does nothing new. |
| 4 | A Playwright test proves decision 1 before any code is deleted. The test ends the session without the UI, so the reload workaround in `TouristNavLink` does not run. | Trust the source reading, or keep the two-tab test as the only proof. | Two e2e tests exist today. The two-tab test passes through a full page reload, not through the policy route. The new test showed on 2026-11-02 that the bridge stalls a click after the session is gone. |
| 5 | A click that enters a policy area reads the session once, because the read is shared inside one `.data` request. The root rule only adds a reload after a failed action with `401` or `403`. | Reload the root on every click, or keep the guard. | Rails writes `last_used_at` at most once every 15 minutes, so most reads do not write. A count of the API log on 2026-11-02 showed one session read for one click. |
| 6 | The file `auth-session-cookies.js` checks both cookie names of each system. | A new environment variable. | The web only checks that the cookie exists, so one file stays the only place with the names. |
| 7 | Node sends no CSRF header. | Keep the Node branch. | Node reads the session and the browser writes. |
| 8 | The account menu shows on desktop, and the mobile menu lists the same items. | A separate account page on mobile. | The items stay the same, and the hamburger menu already exists. |
| 9 | The account menu and the mobile menu hold Sign out of all devices below Sign out, in the danger color. | Put it only on `/account`. | One menu holds every sign-out action, and the confirmation stops a mistake. The owner chose this on 2026-11-02. |
| 10 | `/account` gets no Security card in this spec. | A Security card on `/account`. | The menu already holds the action, and a second place adds nothing. |
| 11 | The provider layout shows both controls in an Account dropdown. The team layout shows both as two buttons at the bottom of the sidebar. | Two buttons in the provider header. | The dropdown stays tidy on a phone. The sidebar has room for two buttons. |
| 12 | Sign out of all devices asks for confirmation. | No confirmation. | The action also signs out the current device. |
| 13 | The screen says "Sign out of all devices". | "Log out everywhere". | The nav says `Sign In`, and "all devices" is plainer for a tourist. |
| 14 | The menu uses the current visual style. | Design the final style now. | Topic A2 in markmamba/redcab-docs#154 redesigns the portals later. |
| 15 | The confirmation uses the existing `useModal` hook, and its red button repeats the action. | A new modal component, `window.confirm` or an inline panel. | `useModal` is mounted in `root.jsx`, and it already builds a react-bootstrap `Modal`. |
| 16 | One hook, `useSignOutAllDevices`, opens the dialog for the tourist menu, the provider dropdown and the team sidebar. The hook takes its text as arguments. | Three copies of the dialog. | One hook keeps the behavior the same. The tourist menu passes the copy keys, and the provider and team portals pass English text. |
| 17 | The copy keys `nav.account` and `nav.bookings` go away. `nav.sign_out` and `nav.signing_out` stay. | Keep all keys. | The menu replaces the first two links. The menu still needs a Sign out label. |
| 18 | The production API hosts live in a committed `.env.production`. | Set them in the CI settings. | They are public values, the ruling Production hosts fixes them, and a pull request shows any change. |

## Web contract

The lasting web contract lives in [Sessions](/docs/30-49-domains/iam/use-cases/sessions#web-contract).

- It holds the sign-out routes and the answers of the web.
- It holds the cookie names and the account menu.

- This spec adds the routes `/logout/everywhere` and `/team/logout/everywhere`.
- The menu items live in `app/layouts/tourist/tourist-nav-config.js`, and the copy keys live in `app/domains/tourist/tourist-surface-copy.js`.
- The first IAM company spec adds one item above Sign out.
- `PortalChrome` gets an optional `actions` prop, so `corporate-layout.jsx` does not change.

### Files to create or modify (Web)

Client and session:

- `app/api/ky-client.js`
- `app/api/identities-sessions-api.js`
- `app/api/identities-accounts-api.js`
- `app/api/team-sessions-api.js`
- `app/auth/auth-session-cookies.js`
- `app/auth/create-session-middleware.js`
- `app/auth/root-should-revalidate.js`
- `app/auth/auth-safe-redirect.js` (add `/team/logout/everywhere` to `ADMIN_GUEST_PATHS`)
- `app/utils/loader-utils.js`
- `app/roots/public-root.jsx`
- `app/roots/team-root.jsx`

Sign-out and menu:

- `app/routes.js`
- `app/routes/identities-account/logout.js`
- `app/routes/identities-account/logout-everywhere.js` (create)
- `app/routes/team/team-logout-everywhere.js` (create)
- `app/layouts/tourist/tourist-nav.jsx`
- `app/layouts/tourist/tourist-nav-config.js`
- `app/layouts/provider/provider-layout.jsx`
- `app/layouts/team/team-sidebar.jsx`
- `app/components/brand/portal-chrome.jsx`
- `app/domains/identities-account/identities-account-profile-avatar-view.jsx` (add a small size)
- `app/hooks/use-sign-out-all-devices.jsx` (create)
- `app/domains/tourist/tourist-surface-copy.js`
- `app/styles/_components.scss`

Environment files:

- `.env.production` (create, with the two production API hosts)
- `.env.example` (note that `.env.production` holds the production hosts)

The 31 route files that call the loader helpers do not change.

### Code to remove

| Code | Reason |
| --- | --- |
| In `ky-client.js`: `createRefreshScope`, `attemptTokenRefresh`, `buildRefreshRequestConfig`, `handleClientSideRetry`, `handleServerSideRetry` | Nothing refreshes |
| In `ky-client.js`: `headersToPlainObject`, `setCookieToCookie`, `mergeCookieHeader` | Only the refresh code uses them |
| In `ky-client.js`: `refreshPath` and the `afterResponse` hook | Nothing refreshes |
| In `ky-client.js`: the Node branch in `beforeRequest` | Node never writes |
| `app/auth/root-revalidation-bridge.jsx` and its spec file | Decision 1 |
| `app/auth/account-session-cross-tab-bridge.jsx` | Decision 3 |
| `app/auth/auth-account-session-broadcast.js` and its spec file | Decision 3 |
| `app/auth/build-session-response-headers.js` and its spec file | The middleware sets `Cache-Control`, and no cookie comes from a refresh |
| `refreshScope`, `getCookieHeader` and `hasSessionCookie` in the session middleware value | Nothing reads them after this spec |
| `handleHard401InClientLoader` in `loader-utils.js` | Decision 1 |
| The document navigation code in `TouristNavLink` | Decision 3 |

The session middleware keeps `Cache-Control: private, no-store` when a session cookie exists.

The function `getCookie` returns `undefined` when the cookie is missing.

- `beforeRequest` then sets no `X-CSRF-Token` header, so Rails answers `csrf_token_missing`.

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [web-107](../../../../80-89-legacy/implementation-specs/iam/auth-platform/web-107-loader-401-revalidate.md) | The revalidation bridge and the loader helper recovery |
| [web-108](../../../../80-89-legacy/implementation-specs/iam/auth-platform/web-108-root-should-revalidate-auth-failures.md) | The order of checks in the shared guard. The rule for action `401` and `403` stays |

This spec changes no Catalog code, so it replaces no part of these specs.

- [Keyword search spec api-208](../cat/api-208-keyword-search.md)
- [Pickup coverage spec api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md)

### Tests that must change

| Test file | Change |
| --- | --- |
| `e2e/policy-middleware-matrix.spec.js` | Add the path click test first. It ends the session by clearing the cookies. Replace the tests that need the reload workaround or the bridge. |
| `app/api/ky-client.spec.js` | Remove the refresh tests, and assert that a `401` reaches the caller once |
| `app/auth/auth-session-cookies.spec.js` | Assert all four session cookie names, and that old names do not match |
| `app/auth/create-session-middleware.spec.js` | Remove the refresh cases |
| `app/auth/auth-account-session-middleware.spec.js` | Use the new cookie names |
| `app/auth/auth-admin-session-middleware.spec.js` | Use the new cookie names |
| `app/auth/auth-portal-guard-behavior.spec.js` | Use the new cookie names |
| `app/auth/auth-session-redirect-integration.spec.js` | Use the new cookie names |
| `app/auth/root-should-revalidate.spec.js` | Replace the guard tests with the small rule |
| `app/roots/public-root.spec.js` | Remove the bridge and the refresh cases |
| `app/roots/team-root.spec.js` | Remove the bridge and the refresh cases |
| `app/roots/root-route-error-boundary.spec.jsx` | Keep the session-expired page |
| `app/utils/loader-utils.spec.js` | A `401` is thrown |
| `app/layouts/tourist/tourist-nav-config.spec.js` | Assert the new logged-in items |

Tests of removed behavior go away with the code.

- The refresh cases.
- The specs of both bridges and of the broadcast.
- The cases of the root URL guard.
- The old cookie names.

New tests cover these behaviors.

- A click on Sign out of all devices shows the confirmation.
- Cancel keeps the session.
- The hook `useSignOutAllDevices` posts to `/logout/everywhere` only after the person confirms.
- `/logout/everywhere` counts a `401` as signed out.
- The account menu opens, closes on `Escape`, and lists its items in order.
- The mobile menu lists the same items.
- The provider layout and the team layout show both controls.

## Data / domain touchpoints

- Bounded context: IAM.
- Transaction boundaries: none in the web.
- Snapshots: none.

## Worked example

Aiko's session ends while her browser stays open.

1. Aiko is on `/account/bookings`, and the idle limit passes.
2. Aiko clicks one booking.
3. The browser asks Node for the policy data, and it runs the `clientLoader` of the page.
4. Rails answers `401` to Node, so the session middleware finds no person.
5. The rule `touristRequired` answers with `/login?redirect_to=...`.
6. The `clientLoader` also gets a `401`, and `loader-utils.js` throws it.
7. The router follows the policy redirect, so Aiko sees the login page.
8. Aiko signs in and lands on the booking that she clicked.

## Out of scope

- The fields of the current-session answer, because I2 changes them.
- The entry rules, because I2 changes them.
- The "List your service" and "Switch to provider" items, because they need `provider_access`.
- The `/account` redesign and the portal layouts, because topic A2 owns them.
- The language switch, because topic A4 owns it.
- The help and contact items, because no page exists.

## Open items

- The Japanese text for the new keys needs a check by a Japanese speaker.
- Product Owner sign-off on the IAM rulings is not recorded.

## Tasks

### Web

- [x] Add the Playwright path click test, and run it on the code as it is.
  - The test ends the session by clearing the cookies, so the reload workaround does not run.
  - Result on 2026-11-02: the policy route answers the click with a redirect to login, so decision 1 holds.
  - Result on 2026-11-02: the page does not reach login, because the revalidation bridge stalls the navigation.
  - The test is marked `test.fail`, and the commit that removes the bridge removes the marker.
- [x] After the bridge is gone, the test passes without the marker.
  - Result on 2026-11-02: the redirect wins over a `401` in the `clientLoader`.
  - Result on 2026-11-02: the header shows a guest after the redirect.
- [x] Change the cookie names.
- [x] Remove the refresh code and fix the function `getCookie`.
- [x] Remove both bridges and the root URL guard.
- [x] Throw a `401` in `loader-utils.js`.
- [x] Add the two `everywhere` routes and the API methods.
- [x] Add the account menu and the mobile items.
- [x] Add the sign-out controls to the provider dropdown and the team sidebar.
- [x] Add the hook `useSignOutAllDevices`, and use it in the tourist menu, the provider dropdown and the team sidebar.
- [x] Add the copy keys, and remove `nav.account` and `nav.bookings`.
- [x] Update the tests.
  - Result on 2026-11-02: `npm run test` runs 163 files and 1,306 tests with 0 failures.
- [x] Add `.env.production` with `VITE_API_REDCAB_URL=https://api.redcab.app` and `VITE_API_TEAM_URL=https://api.team.redcab.app`.
- [x] Update `AGENTS.md` and `app/routes/AGENTS.md`.

### Docs

- [x] Update `docs/50-59-frontend/51-conventions/frontend.md`.
  - Done in [redcab-docs#177](https://github.com/markmamba/redcab-docs/pull/177).
- [x] Set spec `status: implemented` after merge.
  - Merged in [red-cab-web#197](https://github.com/markmamba/red-cab-web/pull/197) on 2026-11-02.

## Acceptance criteria

- [x] The web has no call to a refresh endpoint.
- [x] A request with no session cookie never calls Rails.
- [x] Only a `401` signs a person out in the web.
- [x] A `403`, a `5xx` and a network failure change nothing about the session.
- [x] A person whose session ended sees the login page on the next click.
- [x] That person returns to the same page after sign-in.
- [x] The Playwright test proves this for a path click inside a policy area.
  - The test is in `e2e/policy-middleware-matrix.spec.js`.
  - The pull request records 7 of 7 Playwright tests as passing.
  - I did not run Playwright for this close-out, because it needs the API on port 3000 and the dev accounts.
- [x] A sign-out in one tab reaches the other tab on its next click.
- [x] A missing CSRF cookie sends no `X-CSRF-Token` header.
- [x] The account menu holds the items in the order of [Sessions](/docs/30-49-domains/iam/use-cases/sessions#account-menu).
- [x] Sign out of all devices is in the account menu, below Sign out.
- [x] A tourist, a provider and a team admin can sign out and sign out of all devices.
- [x] Sign out of all devices asks for confirmation.
- [x] No private page shows content to a signed-out person.
- [x] The web still shows the session-expired page for a `401` outside a navigation.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npx playwright test e2e/policy-middleware-matrix.spec.js
git grep -n -E 'refreshScope|rc_access|rc_refresh|rc_team_access|rc_team_refresh|RevalidationBridge|CrossTabBridge' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-11-02 | Close-out check by Claude Code, for the principal developer | Merged in red-cab-web#197. The removed files are gone, and no old cookie name is left in `app/` outside the tests that prove it no longer matches. The Japanese text of the new copy keys still needs a check by a Japanese speaker. |
