---
title: "ADR-018: Red Cab Web Authentication Enforcement Model"
sidebar_label: ADR-018
sidebar_position: 18
description: Architecture decision record 018 — policy routes, server middleware, and pure entry rules replace client-side auth HOCs in red-cab-web; Rails stays the only authority.
---

## TL;DR

- **Rails is the boundary.** `red-cab-api` authorizes every request. Web guards only shape the journey. They are never the security control.
- **Target web model:** policy routes with server `middleware` and pure **entry rules**. A redirect happens on Node **before the page paints**. The auth HOCs (`withTouristAuth`, `withCorporateAuth`, `withProviderAuth`, `withNoAuth`) and the team layout `useEffect` guard are deprecated.
- **Three web invariants:** (1) no session cookie means no session API call; (2) only HTTP `401` means signed out; (3) Node reads the session, the browser changes it.
- **Two identity systems stay separate:** account (`apiClient`, `rc_*` cookies, `CSRF_TOKEN`) and team admin (`teamApiClient`, `rc_team_*` cookies, `TEAM_CSRF_TOKEN`).
- **Migration is one surface per PR.** Order: `/team` and `/account` (Phase 3), then `/corporate` and `/providers` (Phase 4). The tourist pre–Phase 2 track does not wait for it.
- **Prerequisite:** the API must answer `403`, not `401`, when a signed-in account is in the wrong portal. Until then, invariant 2 cannot hold.

## Status

Proposed (2026-09-26). Becomes Accepted when the auth documentation series is approved (roadmap Phase 1).

## About this document

This ADR records how `red-cab-web` enforces authentication on its routes. It does not change what Identity & Access owns, the Roles, or any domain gate.

| Topic | Document |
| --- | --- |
| Identity and authorization posture | [ADR-010](/docs/architecture/decisions/adr-010-identity-and-authorization-architecture) |
| Public tourist browse (`AMB-022`) | [ADR-017](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture), [web-56 spec](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) |
| Session technology | [ADR-019](/docs/architecture/decisions/adr-019-session-technology-phase-1-and-2) |
| How the model works, page by page | [Authentication series](/docs/engineering/authentication) |
| Execution plan | [Authentication roadmap](/docs/engineering/authentication/implementation-roadmap) |

---

## Context

### What ADR-010 already fixes

[ADR-010](/docs/architecture/decisions/adr-010-identity-and-authorization-architecture) separates two questions. Identity answers *who is acting*, with a coarse Role. The owning context answers *may this act happen*. Role gates which **surface** a person reaches (`FR-IAM-009`, `NFR-SEC-004`). Role is necessary but never sufficient. No surface confers authority by itself.

ADR-010 does not say how the web app should apply the Role gate. This ADR fills that gap for `red-cab-web`.

### How `red-cab-web` enforces access today

Audited 2026-09-26 against `red-cab-web` at `c4ce884` and `red-cab-api` at `d8ed9b7`.

| Concern | Today | Evidence |
| --- | --- | --- |
| Session read | `public-root.jsx` loader calls `identitiesAccountsApi.current` on **every** document request, with or without a cookie | `app/roots/public-root.jsx:13-35` |
| Outage vs signed out | Any error, including `5xx` and network failure, becomes `identitiesAccount: null` | `public-root.jsx:33` (`catch { return { identitiesAccount: null } }`) |
| Guard location | HOCs run `useEffect` in the browser after render. The server renders `null` first | `app/components/hocs/with-*-auth.jsx` |
| Wrong role | HOC renders `null` forever. No redirect. The page stays blank | `with-tourist-auth.jsx:13-24` |
| Team guard | `team-layout.jsx` `useEffect` redirect after render | `app/layouts/team/team-layout.jsx:20-27` |
| `redirect_to` on team login | Used without a safety check | `app/routes/team/team-login-page.jsx:25` |
| `redirect_to` in `withNoAuth` | Used without a safety check | `with-no-auth.jsx:16` |
| Refresh lock on Node | One `refreshPromise` per client **module**, shared by every concurrent SSR request | `app/api/ky-client.js:24` |
| Portal mismatch | API answers `401`. The web client then refreshes and retries, and treats the final `401` as "signed out" | `red-cab-api/app/controllers/{tourists,corporate,providers}/base_controller.rb` |
| Provider onboarding detection | Web detects "no provider profile" by matching a `401` error **title string** | `app/domains/providers-profile/providers-profile-service.js:10-14` |
| Public browse | Already correct. Public catalog routes carry no auth HOC (`#60` merged) | `app/marketplace.routes.js`; ADR-017 §3.1 |

### Forces

1. **Security.** A client HOC cannot protect data. Only Rails can. The web must never look like the security layer, or reviewers will trust it.
2. **Correctness under SSR.** A guard that runs after render cannot redirect a document request. The server has already sent HTML.
3. **Honest error states.** An API outage shown as "signed out" sends people to a login page that will also fail. It also hides incidents.
4. **SEO and cost.** Public catalog pages are indexable (ADR-017). An anonymous crawler request should not cost two API calls (`GET …/accounts/current`, then `PATCH …/sessions/current`) before the page loads.
5. **Two principals.** `FR-IAM-009` says Admin is not a marketplace Role. It authenticates through a separate principal. The web must keep the two systems apart.
6. **Refresh exists.** `jwt_sessions` issues short-lived access tokens. The web must refresh them until [ADR-019](/docs/architecture/decisions/adr-019-session-technology-phase-1-and-2) changes that.
7. **In-flight work.** The tourist pre–Phase 2 track ([roadmap](/docs/product/planning/roadmap/tourist-ui-pre-phase-2)) is shipping pages now. It must not stop for this change.

---

## Decision

### D1 — Rails is the boundary

Every API request is authorized by `red-cab-api` (`Identities::Users::AuthenticatedController`, `Team::AuthenticatedController`, actor base controllers). Web guards decide **where a person goes**. They never decide **what data a person may see**. A web change can never weaken API authorization.

### D2 — Policy routes replace auth HOCs

The target web model has three parts.

| Part | Role | Example |
| --- | --- | --- |
| Session middleware | Reads the session once per Node request, lazily | `authAccountSession.middleware` on `roots/public-root.jsx` |
| Policy route | A pathless `layout()` route that exports `middleware`, `loader = () => null`, and an `<Outlet />` | `routes/policies/tourist-required-policy.jsx` |
| Entry rule | A pure function: `(identitiesAccount, identitiesAdmin, location) => null \| redirectPath` | `authEntryRules.touristRequired` |

The guard throws `replace(path)` on Node. The redirect reaches the browser before any protected HTML. This works because `red-cab-web` runs React Router `8.0.0` with `ssr: true`, which supports the route `middleware` export.

### D3 — Three web invariants

| # | Invariant | Rule for code |
| --- | --- | --- |
| 1 | **No cookie, no call.** | If a request carries no `rc_access` and no `rc_refresh` cookie, the account is `null`. Node does not call Rails. Same for `rc_team_*` on the team root |
| 2 | **Only `401` means signed out.** | `403`, `404`, `422`, `5xx`, timeout, and network failure are errors. They never clear the session and never redirect to login |
| 3 | **Node reads, the browser writes.** | Login, logout, and OAuth callback run in the browser, with CSRF. Node never sends a non-`GET` request for auth. The one Node exception is the token refresh defined in ADR-019 |

### D4 — The API answers `403` for a wrong portal

Invariant 2 needs a clean signal. The API must answer:

- `401` when the token is missing, invalid, expired after refresh, or the account is not active.
- `403` with a stable error `code` when the account is signed in but not allowed on this portal or action.

Proposed codes: `tourist_profile_required`, `corporate_profile_required`, `provider_profile_required`, `provider_approval_required`. This resolves `IAM-Q2` in the [IAM audit](/docs/engineering/specs/iam/iam-audit-2026-08). The web client must not refresh on `403`. It already does not retry `403` (`ky-client.js` `beforeRetry`).

### D5 — Entry rules gate surfaces by Role; domain gates stay with their owner

Entry rules read `identitiesAccount.role` to pick a surface. This matches ADR-010: Role gates surfaces, and the audit's target keeps `role` as "a routing hint for the frontend" (IAM audit §4.3). Entry rules never decide a domain gate. Examples:

- "Provider has no profile yet, send to registration" stays in the provider page loaders. Onboarding owns it (`INV-6`, `INV-7`, `LC-8`). The loader reads the `403` code, not a title string.
- "May this tourist see this booking" stays in the API Manager, scoped by `tourist_profile`.

### D6 — Two identity systems, never coupled

| | Account (marketplace roles) | Team admin |
| --- | --- | --- |
| Virtual root | `roots/public-root.jsx` | `roots/team-root.jsx` |
| Session middleware | `app/auth/auth-account-session-middleware.js` | `app/auth/auth-admin-session-middleware.js` |
| Entry rules | `app/auth/auth-entry-rules.js` | `app/auth/auth-admin-entry-rules.js` |
| API client | `apiClient` | `teamApiClient` |
| Cookies | `rc_access`, `rc_refresh`, `CSRF_TOKEN` | `rc_team_access`, `rc_team_refresh`, `TEAM_CSRF_TOKEN` |
| Current endpoint | `GET identities/accounts/current` | `GET team/identities/admins/current` |

The account guard always passes `identitiesAdmin = null` to a rule. The admin guard always passes `identitiesAccount = null`. An account rule never reads the admin argument, and the reverse. The only shared file is `app/auth/auth-safe-redirect.js`, which holds no session data.

### D7 — Only policies navigate

After a surface migrates, nothing else sends a person to a login page.

- `ky-client` never navigates and never clears state.
- Root `ErrorBoundary` components show the error. They stop redirecting on `401` once every surface under that root has a policy (end of Phase 4).
- A page that gets a `401` from a direct call calls `revalidate()`. The next request runs the policy.

### D8 — Migration strategy

| Rule | Why |
| --- | --- |
| One surface per PR | A reviewer can check one policy table against one route subtree |
| A route subtree uses a policy **or** HOCs, never both | Two guards with different rules produce redirect loops |
| HOCs stay legal on surfaces not yet migrated | The tourist pre–Phase 2 track keeps shipping |
| New authenticated pages built after a surface migrates use the policy | Do not add HOCs to a migrated subtree |
| HOC files are deleted in the last Phase 4 PR | One clean removal, with a lint rule to stop re-import |

### D9 — Public marketplace routes have no policy

Public catalog routes stay as ADR-017 and web-56 lock them: no auth guard, `index, follow`, server `loader`. Optional auth is an API property (`Marketplace::BaseController`). The header may show "signed in" from root loader data. That read follows invariant 1, so an anonymous crawler costs zero session calls.

### D10 — Pages open to every session state

Some pages must work for everyone and sit outside every policy: `/`, the marketplace catalog tree, `/listings/:listingUuid`, `/auth/google/callback`, the legacy `/discover*` and `/account/discover*` redirects, `/tourists/sign-up`, and `/verify-email`.

`/verify-email` moves out of the guest guard (today `withNoAuth`). Reason: `FR-IAM-004` requires verification to work, and the IAM audit's working assumption (`IAM-Q1`) lets an unverified account sign in. A signed-in, unverified person who clicks the email link must reach the page.

---

## What stays the same during the tourist pre–Phase 2 track

- `/account/**` keeps `withTouristAuth` until the Phase 3 tourist policy PR merges.
- `/login`, `/sign-up`, `/forgot-password`, `/reset-password` keep `withNoAuth` until the same PR.
- `/corporate/**` and `/providers/**` keep their HOCs until Phase 4.
- Public marketplace routes stay guard-free, as `#60` shipped them.
- `ky-client` keeps refresh-on-`401` (ADR-019), with the Phase 0 fix to make its Node lock per request.
- The Book CTA keeps the web-56 design decision #5: guests go to `/login?redirect_to=<checkout path>`.

---

## Consequences

### Positive

- Protected pages redirect on Node. No blank page, no flash of a protected layout.
- A wrong-role visit redirects to the person's home instead of rendering `null` forever.
- An outage shows an error page. It no longer looks like a logout.
- Anonymous public pages cost zero session calls.
- Entry rules are pure functions. Every row of the rule tables becomes a unit test.
- One shared `redirect_to` check closes the open-redirect gaps on team login and `withNoAuth`.

### Negative

- Each policy route needs a `loader` that returns `null`. Deleting it, or adding `shouldRevalidate` or `clientLoader`, silently turns the policy off on in-app clicks. Reviewers must know this rule ([policy middleware](/docs/engineering/authentication/policy-middleware)).
- The API needs a coordinated `403` change before the web can trust invariant 2 fully.
- For a while, some surfaces use HOCs and some use policies. The "never both in one subtree" rule controls this.
- React Router `8.0.0` behaviour must be checked once in a spike. The reference pattern was verified on `8.3.0`.

---

## Alternatives considered

### Keep HOCs and fix their bugs

Add role redirects, add safe `redirect_to`, keep `useEffect`. Rejected. A browser guard cannot redirect a document request before paint. It also keeps a second, stale copy of the rules in React state.

### Client middleware (`clientMiddleware`)

Run the guard in the browser before `clientLoader`. Rejected. It needs a browser copy of the session, and that copy can be stale. The server is the only place that sees the current cookie on every request.

### Guard inside each page `loader`

Each protected page calls a shared `requireTourist()` helper. Rejected. Pages with `clientLoader` would guard only in the browser. It is also easy to forget one page. A policy route covers a whole subtree in one place.

### Put portal access state in `accounts/current`

Return a `provider_access.state` word in the account payload, as the reference project does for its areas. Rejected for now. ADR-010 keeps the IAM contract minimal (`principal`, `role`, `language`, `CR-6`). Provider approval belongs to Onboarding. Revisit only if a later ADR adds a published access read model.

---

## Related documents

- [ADR-010](/docs/architecture/decisions/adr-010-identity-and-authorization-architecture) — Role gates surfaces; owning contexts gate acts.
- [ADR-017](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) — public browse, auth at checkout.
- [ADR-019](/docs/architecture/decisions/adr-019-session-technology-phase-1-and-2) — session technology and refresh rules.
- [Authentication series](/docs/engineering/authentication) — how the model works.
- [Entry rules specification](/docs/engineering/authentication/appendix-entry-rules-spec) — every rule, every state.
- [IAM audit 2026-08](/docs/engineering/specs/iam/iam-audit-2026-08) — API correctness baseline, `IAM-Q2`.
