---
title: Portal access and switch
sidebar_label: Portal access and switch
sidebar_position: 2
description: How the web reads the session answer, opens the portals by the access word, sends the portal with sign-in and Google sign-in, and shows the switch controls and the holding page.
doc_type: use-case
normative: true
status: current
context: iam
last_reviewed: 2026-11-07
---

## TL;DR \{#portal-access-tldr\}

- The URL decides the portal, and the access word decides what the provider portal opens.
- The web reads the session answer `{ person, provider_access }`, and no rule reads a role.
- A person with the word `missing` opens only the company create page.
- A `pending` or `rejected` company opens only the onboarding area.
- A suspended company opens only a holding page that shows the reason.
- The login page decides where a person lands after sign-in, also with Google.
- The tourist menu and the provider header carry the switch between the two portals.

## About this document

This page holds what stays true after the portal work shipped in `red-cab-web`.

The rulings give the reasons, and the API side is in the model page.

| Topic | Document |
| --- | --- |
| Rulings | [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access), [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer), [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules), [Policy routes](/docs/30-49-domains/iam/iam-decisions/#policy-routes) and [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) |
| The API side | [Person and provider access model](/docs/30-49-domains/iam/models/person-and-provider-access) |
| Sessions and the account menu | [Sessions](/docs/30-49-domains/iam/use-cases/sessions) |
| What the person does and sees | [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals) |
| Web conventions | [Frontend conventions](/docs/50-59-frontend/conventions/frontend) |
| Work record | [Web spec web-192](/docs/60-69-initiatives/61-2026/implementation-specs/iam/web-192-portal-access-and-switch) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| session answer | The API response `{ person, provider_access }`. |
| access word | The value of `provider_access.state`: `missing`, `pending`, `active`, `rejected` or `suspended`. |
| portal | One web app: the tourist portal at `/account/*` or the provider portal at `/providers/*`. |
| login page | The page where the person signed in: `/login` or `/providers/login`. |
| entry rule | A pure function in `app/auth/auth-entry-rules.js`. It answers with `null` or a path, and a policy route calls it. |
| onboarding area | The provider pages that a `pending` or `rejected` company may open. |
| holding page | The page `/providers/suspended`. It explains a suspension. |
| Google record | The `sessionStorage` value `{ portal, redirect_to }`. It lives for one Google redirect. |

## User stories \{#user-stories\}

1. US-1: As a person, I want to use both portals with one sign-in, so I do not sign in twice.
2. US-2: As a tourist, I want to pick "List your service", so I start a company with my account.
3. US-3: As a guest, I want to sign up to list a service, so I start my company at once.
4. US-4: As a new provider, I want a provider login link after I verify, so I see my company.
5. US-5: As an owner of a pending company, I want to see only what I can use.
6. US-6: As an owner of a suspended company, I want to read the reason, so I know what to do.
7. US-7: As a provider, I want to book a tour, so I use my account as a tourist.

## Web contract \{#web-contract\}

### Reading the session answer \{#reading-the-answer\}

Every API call that returns a person returns the session answer.

| Code | Reads | Result |
| --- | --- | --- |
| The session middleware | `identitiesAccountsApi.current` | The getter `getSessionAnswer` returns the answer, or `null` when signed out |
| The guard `authAccountGuard.protect` | `getSessionAnswer` | It passes the answer to the entry rule |
| The loader of `app/roots/public-root.jsx` | `getSessionAnswer` | It returns `identitiesAccount` and `providerAccessState` |
| The component `AuthProvider` | The loader data | It adds `providerAccessState` to the auth context |

- `identitiesAccount` is `answer.person`, and `providerAccessState` is `answer.provider_access.state`.
- Both values are `null` for a guest.
- The hook `useAuth` gives both values.
- `identitiesSessionsApi.create` and `identitiesAccountsApi.update` return the answer, and their callers ignore it.

### Entry rules \{#entry-rules\}

Every rule has the signature `(sessionAnswer, _identitiesAdmin, location)`.

`touristRequired` reads only whether a person is signed in.

| Person | Result |
| --- | --- |
| Guest | `/login?redirect_to=...` |
| Signed in, with any word | `null`, so the page opens |

`providerRequired` acts in this order.

1. A guest goes to `/providers/login?redirect_to=...`.
2. A word that the web does not know, or no word, goes to `/`.
3. A known word follows the table below.

| Word | Paths that open | The create page goes to | Any other path goes to |
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
| `/providers/login` and `/providers/sign-up` | `provider` | `postAuthPath('provider', redirect_to)` |
| `/login`, `/sign-up`, `/forgot-password` and `/reset-password` | `tourist` | `postAuthPath('tourist', redirect_to)` |

### Redirect after sign-in \{#redirect-after-sign-in\}

`authSafeRedirect.postAuthPath(portal, redirectTo)` returns a path, and it needs no session answer.

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

- The public return paths are `/`, `/districts`, `/regions` and `/listings`.
- `ACCOUNT_GUEST_PATHS` holds six paths: `/login`, `/sign-up`, `/forgot-password`, `/reset-password`, `/providers/login` and `/providers/sign-up`.
- A `redirect_to` for the other portal is dropped, so a tourist login never opens a provider page.
- A provider redirect can reach a page that the entry rule then moves.
  - A `pending` company that asks for `/providers/catalog/listings` ends on `/providers`.
- `createLoginAction(portal)` gets the portal as an argument, so each login page states its portal once.

### Google sign-in \{#google-sign-in\}

`identitiesOauthApi.googleAuthorizeUrl(portal)` sends `GET identities/oauth/google?portal={portal}`.

The hook `useGoogleSignIn(portal, redirectTo)` returns `handleGoogleSignIn` and `isGoogleLoading`.

| Page | Portal | `redirect_to` |
| --- | --- | --- |
| `/login` | `tourist` | From the URL |
| `/sign-up` | `tourist` | None, which clears an old value |
| `/providers/login` | `provider` | From the URL |
| `/providers/sign-up` | `provider` | None, which clears an old value |

The hook acts in this order.

1. It stores the Google record `{ portal, redirect_to }` under the key `identities_google_sign_in`.
2. It asks the API for the authorization URL with the portal.
3. It sends the browser to that URL.

The page `google-oauth-callback-page.jsx` acts in this order.

1. It reads and clears the Google record.
2. It sends the code and the state to the API.
3. It redirects to `postAuthPath(portal, redirectTo)`.

- A missing record, broken JSON or an unknown portal gives `tourist` and no `redirect_to`.
- On a failed callback, "Try again" links to the login page of the portal in the record.
- The web copy of the portal only picks the landing page.
- The API keeps its own copy with the OAuth state, and it decides what the API creates.

### Portal controls \{#portal-controls\}

The tourist account menu has one item above Sign out.

| Access word | Item | Target |
| --- | --- | --- |
| `missing` | List your service | `/providers` |
| `pending`, `active`, `rejected` or `suspended` | Switch to provider | `/providers` |
| Unknown, or no word | None | |

- The mobile menu lists the same item in the same place.
- The items live in `app/layouts/tourist/tourist-nav-config.js`.
- The copy keys `nav.list_your_service` and `nav.switch_to_provider` live in `app/domains/tourist/tourist-surface-copy.js`, in English and Japanese.

`ProviderLayout` passes these controls to the `actions` slot of `PortalChrome`.

| Order | Control | Target |
| --- | --- | --- |
| 1 | Switch to traveling | `/` |
| 2 | The Account menu with Sign out and Sign out of all devices | See [Sessions](/docs/30-49-domains/iam/use-cases/sessions#account-menu) |

- "Switch to traveling" shows on every provider page.
  - It has no copy key, because the provider header is English only.
- `PortalChrome` has no hard-coded "Marketplace" link.
- The footer of the tourist portal links "List your service" to `/providers/sign-up`, and it keeps "Provider login".

### Holding page \{#holding-page\}

The page `/providers/suspended` sits inside the provider policy route and `ProviderLayout`.

| Surface | Route | Loader | API module |
| --- | --- | --- | --- |
| Provider | `/providers/suspended` | `clientLoader` | `providersCompaniesApi.show` |

The page shows these parts.

| Part | Content |
| --- | --- |
| Title | `Your company is suspended` |
| Reason | `suspension_reason` of the company |
| Date | `suspended_at`, in the format `DD MMM YYYY, HH:mm` and in `service_timezone` |
| Contact line | `Please contact the Red Cab team.` |

- The page shows no other provider link.
- A failed company read, other than `401`, shows the title and `We could not load the reason. Try again later.`
- The page exports `meta` with `noindex, nofollow`.

### Company create page \{#company-create-page\}

A person with the word `missing` reaches `/providers/registration/create` in three ways.

- The person picks "List your service", and the entry rule moves them from `/providers`.
- The person signs in on `/providers/login`, and the entry rule does the same.
- The person opens `/providers/sign-up` while signed in, and the guest rule does the same.

The page has no `clientLoader`, because the company read answers `403` for the word `missing`.

- After `POST providers/companies`, the page calls `revalidator.revalidate()`.
- That call reads the session again, so the menu shows the word `pending` at once.
- Then the page moves to `/providers/registration/licenses`.
- A `pending` company that opens the create page goes to `/providers/registration/edit`.

### Provider sign-up and verify-email \{#entry-pages\}

`/providers/sign-up` has the email form and these two additions.

- A "Sign up with Google" button below the form, with the portal `provider`.
- The line `Already have a Red Cab account? Sign in on the provider login, then enter your company details.`

`/verify-email` shows two links at each of its three exits.

| Exit | Primary | Secondary |
| --- | --- | --- |
| The email is verified | `Sign in` to `/login` | `Provider sign in` to `/providers/login` |
| The link failed | `Go to sign in` to `/login` | `Provider sign in` to `/providers/login` |
| Waiting for the email | `Go to sign in` to `/login` | `Provider sign in` to `/providers/login` |

The email link does not say which sign-up page the person used, so both login links show.

### Provider dashboard \{#dashboard\}

The dashboard `/providers` shows links by the access word.

| Word | Links |
| --- | --- |
| `pending`, `rejected` | Company details, assets |
| `active` | Company details, assets, bookings, reviews, listings |

- The dashboard has no role line.
- A company from sign-up has no details yet, so the company details link is the first step.
- The onboarding status view keeps its rejection reason.
- The helper `runProviderClientLoaderWithApiErrorFlags` loads the company and makes no redirect, because the entry rule decides the page.

### A person with no tourist profile \{#no-tourist-profile\}

A person with no tourist profile opens `/account` and `/account/bookings`.

| Case | What the person sees |
| --- | --- |
| `/account/bookings` | `BookingsBookingEmptyStateView`, with the link `Browse services` |
| `/account`, with no name | The alert `Add your name to continue booking services.` |
| A booking detail page | The existing not-found handling for a `404` |

- `CatalogListingService.hasCheckoutProfile` checks only the first name and the last name.
- A provider with a name can start checkout, and the first booking creates the tourist profile in the API.
- The `422` for a booking of the own company shows its message on the checkout page.

### The word changes while a page is open \{#word-changes\}

The next click runs the entry rule, and the rule moves the person.

- A write that Rails refuses with `403` shows the API `title`.
- The session stays, because a `403` never signs anyone out.
- A click that starts a navigation to `/providers` can make the dashboard loader call the company read before the redirect.
- That call answers `403` for the word `missing`, the result is dropped, and the person sees nothing.

## Worked example \{#worked-example\}

Aiko is a tourist who starts a business.

1. Aiko signs in on `/login` and lands on `/account`.
2. The session answer says `missing`, so the account menu shows "List your service".
3. Aiko picks "List your service" and opens `/providers`.
4. `providerRequired` sends Aiko to `/providers/registration/create`.
5. Aiko enters Kanto Charter and a contact phone, and the API creates a pending company.
6. The page reads the session again, and the account menu now shows "Switch to provider".
7. Aiko opens `/providers/catalog/listings`, and the rule sends Aiko to `/providers`.
8. Aiko adds the records and vehicles, and sends the application.
9. The team approves the company, so the word is `active`, and Aiko opens the listings.
10. Aiko picks "Switch to traveling", and `/` opens with no new sign-in.
11. Later the team suspends the company for a revoked permit.
12. Aiko's next click in the provider portal lands on `/providers/suspended`, which shows the reason.
13. Aiko picks "Switch to traveling" and books a tour from another company.

## Open items \{#open-items\}

- A Japanese speaker must check the two Japanese menu strings.
- A signed-in person who opens `/reset-password?token=` still goes to `/account`.
- A mobile browser may open the Google return with empty storage, and nobody has tested this.
  - The fallback to the tourist portal covers it.
- The web has no automatic browser test, so three checks have no test.
  - The policy on an in-app click.
  - A click after the session ends in another tab.
  - Sign out everywhere with two tabs.
- Product Owner sign-off on the IAM rulings is not recorded.
