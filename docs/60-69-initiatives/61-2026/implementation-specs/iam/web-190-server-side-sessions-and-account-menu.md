---
title: "Remove session refresh and add the account menu"
sidebar_label: Web · Server-side sessions
issue: "https://github.com/markmamba/red-cab-web/issues/190"
repos:
  - red-cab-web
status: approved
phase: 2
context: IAM
related:
  - "docs/30-49-domains/39-iam/iam-decisions.md#web-session-rules"
  - "docs/30-49-domains/39-iam/iam-decisions.md#policy-routes"
  - "docs/30-49-domains/39-iam/architecture-decisions/server-side-sessions.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-147-server-side-sessions.md"
---

## TL;DR

- The web stops refreshing sessions, and a `401` is final.
- The web deletes the refresh code, both session bridges and the root URL guard.
- A policy route sends a person whose session ended to login, on the next click.
- The tourist nav gets an account menu, opened from the avatar.
- Persons and team admins can sign out of all devices.
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
| Record | [Sessions are database records, and nothing refreshes](/docs/30-49-domains/iam/architecture-decisions/server-side-sessions) | The web deletes the refresh code and the two bridges |
| Paired spec | [API server-side sessions](api-147-server-side-sessions.md) | The API contract, and it must deploy with this spec |
| Code today | [Authentication](/docs/90-99-engineering-meta/authentication/) | The behavior that this spec replaces |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Delete the revalidation bridge. A `401` in a `clientLoader` is thrown, and the policy route redirects on the same navigation. | Keep the bridge. | React Router reruns the policy loader on each click, so the policy decides without a bridge. |
| 2 | Delete the root URL guard. Each root uses a small `shouldRevalidate` that only adds `401` and `403`. | Keep the guard. | The root then rereads the session on each click, so the header stays current. |
| 3 | Delete the cross-tab bridge. | Keep the bridge. | The next click in the other tab rereads the session, so the bridge does nothing new. |
| 4 | A Playwright test proves decision 1 before any code is deleted. | Trust the source reading. | No test covers a path click inside a policy area today. |
| 5 | A signed-in click reads the session once. | Keep fewer reads with the guard. | Rails writes `last_used_at` at most once every 15 minutes, so most reads do not write. |
| 6 | The file `auth-session-cookies.js` checks both cookie names of each system. | A new environment variable. | The web only checks that the cookie exists, so one file stays the only place with the names. |
| 7 | Node sends no CSRF header. | Keep the Node branch. | Node reads the session and the browser writes. |
| 8 | The account menu shows on desktop, and the mobile menu lists the same items. | A separate account page on mobile. | The items stay the same, and the hamburger menu already exists. |
| 9 | The account menu and the mobile menu hold no sign out of all devices item for tourists. | Put it in the menu. | Two sign-out items side by side can confuse a tourist. |
| 10 | Tourists find sign out of all devices on `/account`. | A new security page. | Most persons use it only after they lose a device. |
| 11 | The provider layout and the team layout show both sign-out controls. | One control each. | Those portals have no profile page in this spec. |
| 12 | Sign out of all devices asks for confirmation. | No confirmation. | The action also signs out the current device. |
| 13 | The screen says "Sign out of all devices". | "Log out everywhere". | The nav says `Sign In`, and "all devices" is plainer for a tourist. |
| 14 | The menu uses the current visual style. | Design the final style now. | Topic A2 in markmamba/redcab-docs#154 redesigns the portals later. |

## Web contract

| Surface | Route | Loader | API module | Access |
| --- | --- | --- | --- | --- |
| Tourist and provider | `/logout` | Redirects to `/` | `identitiesSessionsApi.destroy` | `clientAction`, no page |
| Tourist and provider | `/logout/everywhere` (new) | Redirects to `/` | `identitiesSessionsApi.destroyAll` | `clientAction`, no page |
| Team | `/team/logout` | Redirects to `/team` | `teamSessionsApi.destroy` | `clientAction`, no page |
| Team | `/team/logout/everywhere` (new) | Redirects to `/team` | `teamSessionsApi.destroyAll` | `clientAction`, no page |

`identitiesSessionsApi.destroyAll` calls `DELETE identities/sessions`, and `teamSessionsApi.destroyAll` calls `DELETE team/identities/admins/sessions`.

- A `401` on these routes counts as signed out.
- Any other failure shows a toast, and the session stays as it is.

### What the web does with each answer

| Answer | Where | Result |
| --- | --- | --- |
| `401` in the session read on Node | Session middleware | The person is signed out, and the policy route decides |
| `401` in a `clientLoader` | The loader helpers throw the error | The policy redirect wins on the same navigation |
| `401` outside a navigation | Root error boundary | The session-expired page shows "Sign in again" |
| `403` with `csrf_token_missing` or `csrf_token_invalid` | The caller | The caller shows the API `title`, and the session stays |
| `429` on login | The login action | The login form shows the API `title` |
| `5xx` or a network failure | The caller or the boundary | An error shows, and the session stays |

The client sends a request again only for the statuses in `retry.statusCodes`.

- A `401` and a `403` stay final.
- `POST` and `PATCH` requests are never sent again.

A root loader that gets a `5xx` from the session read still reaches the root error boundary.

- This rule now applies on each click of a signed-in person, not only on a page load.

### Cookie names

| System | Production | Development and test |
| --- | --- | --- |
| Person session | `__Secure-rc_session` | `rc_session` |
| Team session | `__Secure-rc_team_session` | `rc_team_session` |

The CSRF cookie names do not change: `CSRF_TOKEN` and `TEAM_CSRF_TOKEN`.

### Account menu

The menu replaces the Bookings, Account and Sign out links in the tourist nav.

| Order | Item | Target | Shows |
| --- | --- | --- | --- |
| 1 | Name and email | None | Always, as a header |
| 2 | My Profile | `/account` | Always |
| 3 | My Bookings | `/account/bookings` | Always |
| 4 | Sign out | `POST /logout` | Always, after a divider |

- The menu opens from a button with the avatar and the name, at the right of the nav.
- The button has an accessible name.
- The menu closes on `Escape` and on a click outside.
- The open menu does not change the height of the nav bar.
- A guest sees the current guest links.
- `Services` stays a link in the nav.

The first IAM company spec adds one item above Sign out, so the menu code keeps its items in `tourist-nav-config.js`.

The copy file `app/domains/tourist/tourist-surface-copy.js` gets these keys.

| Key | `en` | `ja` |
| --- | --- | --- |
| `nav.my_profile` | `My Profile` | `マイプロフィール` |
| `nav.my_bookings` | `My Bookings` | `予約一覧` |
| `nav.sign_out_all_devices` | `Sign out of all devices` | `すべてのデバイスからログアウト` |

### Sign-out controls in other portals

| Portal | Place | Controls |
| --- | --- | --- |
| Tourist | The account menu, and a new section on `/account` | Sign out in the menu, and Sign out of all devices on `/account` |
| Provider | The header `PortalChrome` | Sign out, and Sign out of all devices |
| Team | The bottom of `TeamSidebar` | Sign out, and Sign out of all devices |

`PortalChrome` gets an optional `actions` prop, so `corporate-layout.jsx` does not change.

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
- `app/routes/tourist/account-home-page.jsx`
- `app/layouts/tourist/tourist-nav.jsx`
- `app/layouts/tourist/tourist-nav-config.js`
- `app/layouts/provider/provider-layout.jsx`
- `app/layouts/team/team-sidebar.jsx`
- `app/components/brand/portal-chrome.jsx`
- `app/domains/identities-account/identities-account-profile-avatar-view.jsx` (add a small size)
- `app/domains/tourist/tourist-surface-copy.js`
- `app/styles/_components.scss`

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
| [web-107](auth-platform/web-107-loader-401-revalidate.md) | The revalidation bridge and the loader helper recovery |
| [web-108](auth-platform/web-108-root-should-revalidate-auth-failures.md) | The order of checks in the shared guard. The rule for action `401` and `403` stays |

This spec changes no Catalog code, so it replaces no part of these specs.

- [Keyword search spec api-208](../cat/api-208-keyword-search.md)
- [Pickup coverage spec api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md)

### Tests that must change

| Test file | Change |
| --- | --- |
| `e2e/policy-middleware-matrix.spec.js` | Add the path click test first, and add a two-tab test |
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

New tests cover these behaviors.

- A click on Sign out of all devices shows the confirmation, and Cancel keeps the session.
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

- [ ] Add the Playwright path click test, and run it on the code as it is.
  - If the test fails, stop and update this spec before you delete a bridge.
- [ ] Change the cookie names.
- [ ] Remove the refresh code and fix the function `getCookie`.
- [ ] Remove both bridges and the root URL guard.
- [ ] Throw a `401` in `loader-utils.js`.
- [ ] Add the two `everywhere` routes and the API methods.
- [ ] Add the account menu and the mobile items.
- [ ] Add the sign-out controls to `/account`, the provider layout and the team layout.
- [ ] Add the copy keys.
- [ ] Update the tests.
- [ ] Set `VITE_API_REDCAB_URL` and `VITE_API_TEAM_URL` to the production API hosts.
- [ ] Update `AGENTS.md` and `app/routes/AGENTS.md`.

### Docs

- [ ] Update `docs/50-59-frontend/51-conventions/frontend.md`.
- [ ] Update the pages in `docs/90-99-engineering-meta/93-authentication/`, including `reading-the-session.md` and `policy-middleware.md`.
- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The web has no call to a refresh endpoint.
- [ ] A request with no session cookie never calls Rails.
- [ ] Only a `401` signs a person out in the web.
- [ ] A `403`, a `5xx` and a network failure change nothing about the session.
- [ ] A person whose session ended sees the login page on the next click.
- [ ] That person returns to the same page after sign-in.
- [ ] The Playwright test proves this for a path click inside a policy area.
- [ ] A sign-out in one tab reaches the other tab on its next click.
- [ ] A missing CSRF cookie sends no `X-CSRF-Token` header.
- [ ] The account menu holds the items in the order of this spec.
- [ ] A tourist, a provider and a team admin can sign out and sign out of all devices.
- [ ] Sign out of all devices asks for confirmation.
- [ ] No private page shows content to a signed-out person.
- [ ] The web still shows the session-expired page for a `401` outside a navigation.

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
| | | |
