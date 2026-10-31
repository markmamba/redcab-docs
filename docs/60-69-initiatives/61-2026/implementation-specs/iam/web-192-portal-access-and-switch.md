---
title: "Open the portals by access word, and add the portal switch"
sidebar_label: Web · Portal access
issue: "https://github.com/markmamba/red-cab-web/issues/192"
repos:
  - red-cab-web
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-263-portal-access.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-190-server-side-sessions-and-account-menu.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-191-permits-registration-and-team-approval.md"
related:
  - "docs/30-49-domains/39-iam/iam-decisions.md#person-account"
  - "docs/30-49-domains/39-iam/iam-decisions.md#tourist-profile"
  - "docs/30-49-domains/39-iam/iam-decisions.md#provider-company"
  - "docs/30-49-domains/39-iam/iam-decisions.md#portal-access"
  - "docs/30-49-domains/39-iam/iam-decisions.md#current-session-answer"
  - "docs/30-49-domains/39-iam/iam-decisions.md#web-session-rules"
  - "docs/30-49-domains/39-iam/iam-decisions.md#policy-routes"
  - "docs/30-49-domains/39-iam/iam-decisions.md#access-codes"
  - "docs/30-49-domains/39-iam/iam-decisions.md#no-corporate-accounts"
---

## TL;DR

- The web reads the session answer `{ person, provider_access }`, and no rule reads a role.
- The URL decides the portal, and the access word decides what the provider portal opens.
- A pending or rejected company opens only the onboarding area.
- A suspended company opens a holding page at `/providers/suspended`.
- A person with no company reaches the company create page.
- The login page decides where a person lands after sign-in, also with Google.
- The tourist menu gets "Switch to provider" or "List your service".
- The provider header gets "Switch to traveling".
- The Corporate pages, layouts, constants, policy and sign-up go away.
- This spec does not add invitations, member screens or the language switch.
- Breaking change: Yes.
  - The web and `red-cab-api` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| session answer | The API response `{ person, provider_access }`. |
| access word | The value of `provider_access.state`: `missing`, `pending`, `active`, `rejected` or `suspended`. |
| portal | One web app: the tourist portal or the provider portal. |
| login page | The page where the person signed in: `/login` or `/providers/login`. |
| entry rule | A pure function that answers with null or a path. A policy route calls it before a page renders. |
| onboarding area | The provider pages that a pending or rejected company may open. |
| holding page | The page `/providers/suspended`, which explains a suspension. |
| Google record | The `sessionStorage` value that keeps the portal and `redirect_to` across the Google redirect. |

## User stories

1. US-1: As a person, I want to use both portals with one sign-in, so I do not sign in twice.
2. US-2: As a tourist, I want to pick "List your service", so I start a company with my account.
3. US-3: As a guest, I want to sign up to list a service, with email or Google.
4. US-4: As a new provider, I want to reach the provider login after I verify, so I see my company.
5. US-5: As an owner of a pending company, I want to see only what I can use.
6. US-6: As an owner of a suspended company, I want to read the reason, so I know what to do.
7. US-7: As a provider, I want to book a tour, so I use my account as a tourist.

## Problem

The web still decides the portal by the role.

- `authEntryRules` in `app/auth/auth-entry-rules.js` compares `identitiesAccount.role` with one role.
- `authSafeRedirect.postAuthPath` in `app/auth/auth-safe-redirect.js` picks the landing page by the role.
- `CatalogListingService.hasCheckoutProfile` refuses every account that is not a tourist.
- A pending or rejected company can open every provider page.
- A suspended company has no holding page.
- No control switches between the portals, and no control says "List your service".
- `identitiesOauthApi.googleAuthorizeUrl` sends no portal.
- The tourist sign-up page starts Google and leaves an old `redirect_to` in `sessionStorage`.
- `verify-email-page.jsx` sends every person to `/login`, so a new provider lands in the tourist portal.
- `tourist-shell-layout.jsx` reads `should_prompt_language`, which leaves the answer.
- 27 files in `app/` hold Corporate code.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access) | The URL decides, and who sees which switch |
| Rule | [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer) | Two keys, five words, and an unknown word opens nothing |
| Rule | [Policy routes](/docs/30-49-domains/iam/iam-decisions/#policy-routes) | The parts of a policy route, and no nesting |
| Rule | [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules) | A stale copy in the web grants nothing |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | Sign-up, a tourist who starts a company, suspension |
| Rule | [Tourist profile](/docs/30-49-domains/iam/iam-decisions/#tourist-profile) | A person with no tourist profile uses the tourist portal |
| Rule | [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) | The codes that Rails answers with |
| Rule | [Language](/docs/30-49-domains/iam/iam-decisions/#language) | There is no language prompt at first login |
| Rule | [No corporate accounts](/docs/30-49-domains/iam/iam-decisions/#no-corporate-accounts) | The Corporate code goes |
| Requirement | [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals) | What the person sees |
| Paired spec | [API portal access](api-263-portal-access.md) | The contract, and it must deploy with this spec |
| Depends on | [Web sessions and account menu](web-190-server-side-sessions-and-account-menu.md) | The menu, the `actions` prop and the removed bridges |
| Depends on | [Web permits and approval](web-191-permits-registration-and-team-approval.md) | The renamed folders and the registration pages |
| Web rules | `red-cab-web/AGENTS.md` and `red-cab-web/app/routes/AGENTS.md` | Policy routes, domain folders and API modules |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The holding page is a new page at `/providers/suspended`, inside the provider policy and `ProviderLayout`. | Show it on the dashboard. A page with no portal header. | The person keeps the switch and the sign-out controls, and the dashboard keeps one job. |
| 2 | The onboarding path rule lives inside `providerRequired`, as a pure function of the location. | A second policy route. | A policy route is never nested, and React Router gives middleware a clean path. |
| 3 | "Switch to provider" and "List your service" share one menu slot above Sign out, and both link to `/providers`. | Link "List your service" to the create page. | The entry rule stays the one place that knows the words. |
| 4 | "Switch to traveling" replaces the "Marketplace" link in the provider header, and it links to `/`. | Keep both links. | Two links to the same place confuse a reader. |
| 5 | `postAuthPath(portal, redirectTo)` takes no account. | Pass the access word too. | `/providers` goes through the entry rule, so the word is not needed. |
| 6 | `createLoginAction(portal)` gets the portal as an argument. | Read the portal from the URL. | Each login page states its portal once. |
| 7 | A `redirect_to` for the other portal is dropped. | Accept it and let the entry rule decide. | A tourist login must not open a provider page. |
| 8 | The Google record keeps `{ portal, redirect_to }` in `sessionStorage`, and the API keeps its own copy with the OAuth state. | The API returns the portal in the callback. | The session answer stays at two keys, and the web copy grants nothing. |
| 9 | A missing or broken Google record means `tourist` with no redirect. | Show an error. | The person is signed in, and the switch still works. |
| 10 | One hook `useGoogleSignIn(portal)` serves the four Google buttons. | One handler for each page. | A sign-up button must clear an old `redirect_to` too. |
| 11 | The guest rule reads the portal from the path. | Send every signed-in person to `/`. | The URL decides the portal. |
| 12 | `IDENTITIES_PORTAL` and `PROVIDER_ACCESS_STATE` replace `ACCOUNT_ROLE`. | Keep the name `ACCOUNT_ROLE`. | A portal and a word are not roles. |
| 13 | `PublicAuthLayout` loses its `role` prop, and the panel reads one provider constant. | A `portal` prop. | Only provider pages use this layout, so a prop would hold one value. |
| 14 | `verify-email-page.jsx` shows both login links at every exit. | Add the portal to the email link. Change nothing. | The email link does not say which sign-up page the person used. |
| 15 | The language prompt modal goes away. | Keep the file. | The ruling has no prompt, and the modal could never open. |
| 16 | The name `identitiesAccount` stays for the person in the web. | Rename it to `person`. | The fields do not change, so the readers need no edit. |
| 17 | An unknown word sends the person to `/`, and the menu shows neither control. | Treat it as `missing`. | An unknown word opens no private page. |
| 18 | The company create page reads no company. | Keep the loader. | The company read answers `403` for the word `missing`. |
| 19 | The create page rereads the session before it moves on. | Trust the next click. | The menu must show the word `pending` at once. |
| 20 | A person with no tourist profile opens `/account` as any other person. | An onboarding form that creates the profile. | The ruling allows it, and the profile holds no data that a form could ask for. |

## Web contract

### Reading the session answer

Every API call that returns a person returns the session answer.

| Code | Reads | Result |
| --- | --- | --- |
| Session middleware | `identitiesAccountsApi.current` | The getter `getSessionAnswer` returns the answer, or null when signed out |
| `authAccountGuard.protect` | `getSessionAnswer` | Passes the answer to the entry rule |
| `app/roots/public-root.jsx` loader | `getSessionAnswer` | Returns `identitiesAccount` and `providerAccessState` |
| `AuthProvider` | The loader data | Adds `providerAccessState` to the auth context |

The root loader takes `identitiesAccount` from `answer.person` and `providerAccessState` from `answer.provider_access.state`.

- Both values are null for a guest.
- The `useAuth` readers of `identitiesAccount` do not change.
- `identitiesSessionsApi.create` and `identitiesAccountsApi.update` return the answer, and their callers ignore the response.

### Entry rules

Every rule keeps the signature `(sessionAnswer, _identitiesAdmin, location)`.

`touristRequired` reads only whether a person is signed in.

| Person | Result |
| --- | --- |
| Guest | `/login?redirect_to=...` |
| Signed in | null |

`providerRequired` acts in this order.

1. A guest goes to `/providers/login?redirect_to=...`.
2. A word that the web does not know, or no word, goes to `/`.
3. A known word follows the table below.

| Word | Paths that open | Create page goes to | Any other path goes to |
| --- | --- | --- | --- |
| `missing` | `/providers/registration/create` | It opens | `/providers/registration/create` |
| `pending` | The onboarding area | `/providers/registration/edit` | `/providers` |
| `rejected` | The onboarding area | `/providers/registration/edit` | `/providers` |
| `active` | Every provider page, except the holding page | `/providers/registration/edit` | `/providers` |
| `suspended` | `/providers/suspended` | `/providers/suspended` | `/providers/suspended` |

The onboarding area has three parts.

- The dashboard `/providers`, as an exact path.
- `/providers/registration` and every path under it, except the create page.
- `/providers/catalog/assets` and every path under it.

The rule compares whole path segments with `isUnderPrefix`.

- `/providers/catalog/assetsfoo` is not in the onboarding area.
- The rule ignores one trailing slash.
- `/providers/suspended` is not in the onboarding area, so `pending` and `rejected` go to `/providers`.

`accountGuest` sends a signed-in person away from a login page.

| Page in the URL | Portal | Result |
| --- | --- | --- |
| `/providers/login`, `/providers/sign-up` | `provider` | `postAuthPath('provider', redirect_to)` |
| `/login`, `/sign-up`, `/forgot-password`, `/reset-password` | `tourist` | `postAuthPath('tourist', redirect_to)` |

### The redirect after sign-in

`authSafeRedirect.postAuthPath(portal, redirectTo)` returns a path.

| Portal | With no safe `redirect_to` | Prefix for a safe `redirect_to` |
| --- | --- | --- |
| `tourist` | `/account` | `/account` |
| `provider` | `/providers` | `/providers` |

A `redirect_to` is safe when all of these are true.

- It starts with one `/`, and the next character is not `/` or `\`.
- It holds no whitespace.
- Its path is already in canonical form.
- It is not under a path of `ACCOUNT_GUEST_PATHS`.
- It is a public return path, or it is under the prefix of the portal.

The public return paths do not change: `/`, `/districts`, `/regions` and `/listings`.

`ACCOUNT_GUEST_PATHS` holds six paths after this spec.

- `/login`, `/sign-up`, `/forgot-password` and `/reset-password`
- `/providers/login` and `/providers/sign-up`

A provider redirect can reach a page that the entry rule then moves.

- A `pending` company with `redirect_to=/providers/catalog/listings` ends on `/providers`.
- This behavior is expected.

### Google sign-in

`identitiesOauthApi.googleAuthorizeUrl(portal)` sends `GET identities/oauth/google?portal={portal}`.

The hook `useGoogleSignIn(portal)` returns `handleGoogleSignIn` and `isGoogleLoading`.

| Page | Portal | `redirect_to` |
| --- | --- | --- |
| `/login` | `tourist` | From the URL |
| `/sign-up` | `tourist` | None, which clears an old value |
| `/providers/login` | `provider` | From the URL |
| `/providers/sign-up` | `provider` | None, which clears an old value |

The hook acts in this order.

1. It stores the Google record `{ portal, redirect_to }`.
2. It asks the API for the authorization URL with the portal.
3. It sends the browser to that URL.

The callback page `google-oauth-callback-page.jsx` acts in this order.

1. It reads and clears the Google record.
2. It sends the code and the state to the API.
3. It redirects to `postAuthPath(portal, redirectTo)`.

The Google record has two reading rules.

- A missing record, broken JSON or an unknown portal gives `tourist` and no `redirect_to`.
- The key is `identities_google_sign_in`.

On a failed callback, "Try again" links to the login page of the portal in the record.

- The web copy of the portal only picks the landing page.
- The API copy decides what the API creates.

### Portal controls

The tourist account menu from `web-190` gets one item above Sign out.

| Access word | Item | Target |
| --- | --- | --- |
| `missing` | List your service | `/providers` |
| `pending`, `active`, `rejected`, `suspended` | Switch to provider | `/providers` |
| Unknown, or no word | None | |

- The mobile menu lists the same item in the same place.
- The items stay in `app/layouts/tourist/tourist-nav-config.js`.

The file `app/domains/tourist/tourist-surface-copy.js` gets these keys.

| Key | `en` | `ja` |
| --- | --- | --- |
| `nav.list_your_service` | `List your service` | `サービスを掲載する` |
| `nav.switch_to_provider` | `Switch to provider` | `プロバイダーに切り替える` |

`ProviderLayout` passes these controls to the `actions` prop of `PortalChrome`.

| Order | Control | Target |
| --- | --- | --- |
| 1 | Switch to traveling | `/` |
| 2 | Sign out | From `web-190` |
| 3 | Sign out of all devices | From `web-190` |

- `PortalChrome` loses its hard-coded "Marketplace" link.
- The provider header is English only, so "Switch to traveling" has no copy key.

### Holding page

The holding page has this contract.

| Surface | Route | Loader | API module |
| --- | --- | --- | --- |
| Provider | `/providers/suspended` | `clientLoader` | `providersCompaniesApi.show` |

The page shows these parts.

| Part | Content |
| --- | --- |
| Title | `Your company is suspended` |
| Reason | `suspension_reason` from the company |
| Date | `suspended_at`, in the format of the onboarding status view |
| Contact line | `Please contact the Red Cab team.` |

- The page shows no other provider links.
- A failed company read, other than `401`, shows the title and `We could not load the reason. Try again later.`
- The page exports `meta` with `noindex, nofollow`.

### Company create page

A person with the word `missing` reaches `/providers/registration/create` in three ways.

- The person picks "List your service", and the entry rule moves them from `/providers`.
- The person signs in on `/providers/login`, and the entry rule does the same.
- The person opens `/providers/sign-up` while signed in, and the guest rule does the same.

The page keeps the form and the fields of `web-191`.

- The page has no `clientLoader`.
- After `POST providers/companies`, the page calls `revalidator.revalidate()`.
- Then it moves to the next page of the `web-191` flow.

### Provider sign-up and login pages

`/providers/sign-up` keeps the email form, and it gets two additions.

- A "Sign up with Google" button with the portal `provider`.
- The line `Already have a Red Cab account? Sign in on the provider login, then enter your company details.`

The footer in `tourist-footer.jsx` changes in two ways.

- "Corporate login" goes away.
- "List your service" links to `/providers/sign-up`.

`verify-email-page.jsx` shows two links at each of its three exits.

| Exit | Primary | Secondary |
| --- | --- | --- |
| The email is verified | `Sign in` to `/login` | `Provider sign in` to `/providers/login` |
| The link failed | `Go to sign in` to `/login` | `Provider sign in` to `/providers/login` |
| Waiting for the email | `Go to sign in` to `/login` | `Provider sign in` to `/providers/login` |

### Provider dashboard

The dashboard `/providers` shows links by the access word.

| Word | Links |
| --- | --- |
| `pending`, `rejected` | Company details, assets |
| `active` | Company details, assets, bookings, reviews, listings |

- The `Role:` line goes away.
- A company from sign-up has no details yet, so the company details link is the first step.
- The onboarding status view keeps its rejection reason.

### Provider loader helper

`runProviderClientLoaderWithApiErrorFlags` loses its third argument.

- `fetchCurrent` reads the company and has no gate branches.
- The entry rule decides the page, so the helper makes no redirect.

### A person with no tourist profile

A person with no tourist profile opens `/account` and `/account/bookings`.

| Case | What the person sees |
| --- | --- |
| `/account/bookings` | `BookingsBookingEmptyStateView`, with the link `Browse services` |
| `/account`, with no name | The alert `Add your name to continue booking services.` |
| A booking detail page | The existing not-found handling for a `404` |

`CatalogListingService.hasCheckoutProfile` keeps only the check for the first name and the last name.

- A provider with a name can start checkout.
- The first booking creates the tourist profile in the API.

### The word changes while a page is open

The next click runs the entry rule, and the rule moves the person.

- A write that Rails refuses with `403` shows the API `title`.
- The session stays, because a `403` never signs anyone out.

### Files to create or modify (Web)

Session and rules:

- `app/auth/auth-entry-rules.js`
- `app/auth/auth-safe-redirect.js`
- `app/auth/auth-account-guard.js`
- `app/auth/auth-account-session-middleware.js`
- `app/auth/create-login-action.js`
- `app/roots/public-root.jsx`
- `app/hooks/use-auth.jsx`
- `app/utils/identities-auth-utils.js`
- `app/utils/loader-utils.js`
- `app/routes/AGENTS.md`
- `AGENTS.md`

Identity:

- `app/api/identities-oauth-api.js`
- `app/api/identities-accounts-api.js` (the JSDoc)
- `app/api/identities-sessions-api.js` (the JSDoc)
- `app/domains/identities-session/use-google-sign-in.js` (create)
- `app/domains/identities-account/identities-account-constant.js`
- `app/domains/identities-account/identities-account-service.js`

Routes:

- `app/routes.js`
- `app/provider.routes.js`
- `app/routes/provider/provider-suspended-page.jsx` (create)
- `app/routes/provider/provider-login-page.jsx`
- `app/routes/provider/sign-up-page.jsx`
- `app/routes/provider/provider-dashboard-page.jsx`
- `app/routes/provider/providers-company-registration-create-page.jsx`
- `app/routes/identities-account/login-page.jsx`
- `app/routes/identities-account/google-oauth-callback-page.jsx`
- `app/routes/identities-account/verify-email-page.jsx`
- `app/routes/tourist/sign-up-page.jsx`

Layouts and domains:

- `app/layouts/auth/auth-role-panel.jsx` becomes `app/layouts/auth/auth-provider-panel.jsx`.
- `app/layouts/auth/public-auth-layout.jsx`
- `app/layouts/provider/provider-layout.jsx`
- `app/layouts/tourist/tourist-footer.jsx`
- `app/layouts/tourist/tourist-nav-config.js`
- `app/layouts/tourist/tourist-nav.jsx`
- `app/layouts/tourist/tourist-shell-layout.jsx`
- `app/components/brand/portal-chrome.jsx`
- `app/domains/providers-company/providers-company-constant.js`
- `app/domains/providers-company/providers-company-service.js`
- `app/domains/providers-company/providers-company-suspended-view.jsx` (create)
- `app/domains/catalog-listing/catalog-listing-service.js`
- `app/domains/tourist/tourist-surface-copy.js`
- `app/styles/_components.scss` (the comment that names corporate)

### Code to remove

These 11 files go away.

| Code | Reason |
| --- | --- |
| `app/api/corporate-identities-accounts-api.js` | No corporate accounts |
| `app/corporate.routes.js` | Same |
| `app/domains/corporate/` (2 files) | Same |
| `app/layouts/corporate/` (3 files) | Same |
| `app/routes/corporate/` (3 files) | Same |
| `app/routes/policies/corporate-required-policy.jsx` | Same |

This code goes away from other files.

| Code | Reason |
| --- | --- |
| The Corporate routes and layouts in `app/routes.js` | No corporate accounts |
| `corporateRequired`, and `corporate` in `LOGIN_PATH_BY_SURFACE` | Same |
| `ROLE_PATH_PREFIXES` in `auth-safe-redirect.js` and `identities-auth-utils.js` | The portal replaces the role |
| The two Corporate paths in `ACCOUNT_GUEST_PATHS` | No corporate accounts |
| `ACCOUNT_ROLE` | Decision 12 |
| `IDENTITIES_ACCOUNT_AUTH_ROLE_CONTENT` and `getAuthRoleContent` | Decision 13 |
| `getIdentitiesHomePath` and `IDENTITIES_HOME_BY_ROLE` | Decision 5 |
| `resolveIdentitiesPostAuthPath`, `isPathAllowedForRole` and `isSafeInternalPath` | They have no caller |
| The Corporate branch in `resolveIdentitiesLoginPath` | No corporate accounts |
| `storeIdentitiesPostAuthRedirect`, `consumeIdentitiesPostAuthRedirect` and their key | The Google record replaces them |
| `getOnboardingRedirectPath` and `skipOnboardingRedirect` | The entry rule decides |
| `LEGACY_PROVIDER_PROFILE_GATE_BRIDGE` and `MISSING_PROVIDER_PROFILE_ERROR_TITLE` | `fetchCurrent` has no gate branches |
| `PORTAL_GATE_CODE` in `providers-company-constant.js` | Nothing reads a gate code after this spec |
| `app/errors/portal-gate-utils.js` and `isPortalGateError` | Same |
| `identities-account-language-prompt-modal.jsx`, and its state in the shell layout | Decision 15 |
| The role line in `hasCheckoutProfile` | Any person with a name can book |
| The `Role:` line on the dashboard | No role exists |

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [web-56](web-56-tourist-access-and-route-contract.md) | In decision 5, "logged-in tourist" becomes any signed-in person with a name |
| [web-80](auth-platform/web-80-safe-redirect-helper.md) | `postAuthPath(identitiesAccount, redirectTo)`, `ROLE_PATH_PREFIXES` and decision 4 |
| [web-84](auth-platform/web-84-auth-core-modules.md) | The role reading in `auth-safe-redirect.js` and the entry rules |
| [web-86](auth-platform/web-86-tourist-account-policy-routes.md) | Decisions 15, 19 and 21, and the Corporate rows |
| [web-87](auth-platform/web-87-corporate-provider-policy-routes.md) | The Corporate policy, the wrong-role redirect, and decisions 7 and 9 |
| [web-190](web-190-server-side-sessions-and-account-menu.md) | The `corporate-layout.jsx` note on `PortalChrome` |
| [web-191](web-191-permits-registration-and-team-approval.md) | The `suspended` row of "What each status shows", and the create page loader |

- `web-85` and `web-88` need no change, because they do not read a role in code that stays.
- This spec changes no Catalog ruling, so it replaces no part of these specs.
  - [Keyword search spec api-208](../cat/api-208-keyword-search.md)
  - [Pickup coverage spec api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md)

### Tests that must change

| Test file | Change |
| --- | --- |
| `app/auth/auth-entry-rules.spec.js` | Replace the role cases with the tables of this spec |
| `app/auth/auth-safe-redirect.spec.js` | Use `postAuthPath(portal, redirectTo)`, and assert the portal prefix |
| `app/auth/auth-account-guard.spec.js` | Pass the session answer to the rule |
| `app/auth/auth-portal-guard-behavior.spec.js` | Remove the Corporate cases, and use the words |
| `app/auth/auth-surface-paths-consistency.spec.js` | Remove the role homes and the Corporate paths |
| `app/roots/public-root.spec.js` | Assert `identitiesAccount` and `providerAccessState` |
| `app/hooks/use-auth.spec.jsx` | Assert `providerAccessState` |
| `app/routes/policies/policy-export-contract.spec.js` | Remove the Corporate policy |
| `app/routes/policies/public-routes-tree.spec.js` | Remove the Corporate cases |
| `app/components/components-import-rule.spec.js` | Use another import name in the samples |
| `app/domains/identities-account/identities-account-service.spec.js` | Remove `getAuthRoleContent` |
| `app/domains/catalog-listing/catalog-listing-service.spec.js` | Assert that a person with a name can start checkout |
| `app/domains/providers-company/providers-company-service.spec.js` | Remove the gate cases |
| `app/layouts/tourist/tourist-nav-config.spec.js` | Remove Corporate, and assert the items by word |
| `app/layouts/tourist/tourist-shell-layout.spec.jsx` | Remove the prompt cases |
| `app/routes/provider/provider-dashboard-page.spec.js` | Assert the links by word |
| `app/routes/tourist/booking-list-page.spec.jsx` | Remove `ACCOUNT_ROLE` |
| `app/routes/tourist/booking-detail-page.spec.jsx` | Remove `ACCOUNT_ROLE` |
| `app/utils/loader-utils.spec.js` | Remove the onboarding redirect cases |
| `e2e/policy-middleware-matrix.spec.js` | Add a path click for each access word |

New tests cover these behaviors.

- `providerRequired` answers correctly for each word and each path group.
- `providerRequired` sends an unknown word and no word to `/`.
- `/providers/catalog/assetsfoo` is outside the onboarding area, and a trailing slash changes nothing.
- `accountGuest` picks the portal from the path.
- `createLoginAction` lands each login page in its own portal.
- The Google record falls back to `tourist` when it is missing or broken.
- A sign-up Google button clears an old `redirect_to`.
- `googleAuthorizeUrl` sends the portal.
- The holding page shows the reason, and it shows the fallback text on a failed read.
- The create page rereads the session before it moves on.
- The verify-email page shows both links at each exit.
- The `422` for an own-company booking shows its message on the checkout page.

## Data / domain touchpoints

- Bounded context: IAM, with reads from Providers.
- Transaction boundaries: none in the web.
- Snapshots: none.
- The web stores no active portal.
- The Google record lives for one redirect, and the callback clears it.

## Worked example

Aiko is a tourist who starts a business.

1. Aiko signs in on `/login` and lands on `/account`.
2. The session answer says `missing`, so the account menu shows "List your service".
3. Aiko picks "List your service" and opens `/providers`.
4. `providerRequired` sends Aiko to `/providers/registration/create`.
5. Aiko enters Kanto Charter and a contact phone, and the API creates a pending company.
6. The page rereads the session, and the account menu now shows "Switch to provider".
7. Aiko opens `/providers/catalog/listings`, and the rule sends Aiko to `/providers`.
8. Aiko adds the records and vehicles, and sends the application.
9. The team approves the company, so the word is `active`, and Aiko opens the listings.
10. Aiko picks "Switch to traveling", and `/` opens with no new sign-in.
11. Later the team suspends the company for a revoked permit.
12. Aiko's next click in the provider portal lands on `/providers/suspended`, which shows the reason.
13. Aiko picks "Switch to traveling" and books a tour from another company.

## Out of scope

- Invitations, member screens and the owner-only checks.
- The language switch and the translation files.
- The layout redesign, because topic A2 in markmamba/redcab-docs#154 owns it.
- A contact page for the Red Cab team.
- A tourist profile form, because the profile holds no data that a person enters.
- The team admin login audit.
- File upload, which `web-144` owns.

## Open items

- Product Owner sign-off on the IAM rulings, including dropping corporate clients, is not recorded.
- Rejected companies may apply again for now, and the Product Owner may change this.
- A Japanese speaker must check the two new `ja` values.
- A signed-in person who opens `/reset-password?token=` still goes to `/account`, as `web-86` records.
- The JSON keys `suspended_at` and `suspension_reason` come from `api-261`, and the API code is not built.
- A mobile browser may open the Google return with empty storage, and nobody has tested this.
  - The fallback in decision 9 covers it.

## Tasks

### Web

- [ ] Add `IDENTITIES_PORTAL` and `PROVIDER_ACCESS_STATE`.
- [ ] Read the session answer in the middleware, the guard, the root and `AuthProvider`.
- [ ] Replace the entry rules, and add the onboarding path rule.
- [ ] Replace `postAuthPath` and `createLoginAction`.
- [ ] Add the Google record, the hook and the `portal` parameter.
- [ ] Add the holding page and its route.
- [ ] Add the menu item, the mobile item, the header control and the footer link.
- [ ] Update the create page, the dashboard and the provider loader helper.
- [ ] Update the provider sign-up page and the verify-email page.
- [ ] Update `hasCheckoutProfile`.
- [ ] Remove the language prompt modal.
- [ ] Remove the Corporate code and `ACCOUNT_ROLE`.
- [ ] Update the tests.
- [ ] Update `AGENTS.md` and `app/routes/AGENTS.md`.

### Docs

- [ ] Update `docs/50-59-frontend/51-conventions/frontend.md`.
- [ ] Update the pages in `docs/90-99-engineering-meta/93-authentication/`.
- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A person with a company can use both portals with one sign-in.
- [ ] The provider portal opens by the access word.
- [ ] A pending or rejected company opens only the onboarding area.
- [ ] A person with the word `missing` opens only the company create page in the provider portal.
- [ ] A suspended company opens only the holding page, which shows the reason.
- [ ] Sign-in on a login page opens the portal of that page, also with Google.
- [ ] A signed-in person who opens a login page lands in the portal of that page.
- [ ] A `redirect_to` for the other portal is dropped.
- [ ] A rule never reads a role, and an unknown word never opens a private page.
- [ ] "Switch to traveling" shows on every provider page.
- [ ] "Switch to provider" shows only for the four words that are not `missing`.
- [ ] "List your service" shows only for the word `missing`.
- [ ] A person with no tourist profile opens `/account` and can start checkout.
- [ ] A new provider can reach `/providers/login` from the verify-email page.
- [ ] No file in `app/` names `corporate` or `ACCOUNT_ROLE`.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
VITE_E2E_AUTH_FIXTURES=true npm run test:e2e
git grep -n -i -E 'corporate|ACCOUNT_ROLE|should_prompt_language|LanguagePromptModal|getIdentitiesHomePath' -- app
git grep -n -E '\.role\b' -- app ':!*.spec.*'
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
