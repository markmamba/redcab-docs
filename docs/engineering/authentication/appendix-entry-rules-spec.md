---
title: "Appendix A — Entry rules specification"
sidebar_label: "A. Entry rules spec"
sidebar_position: 20
description: Machine-readable specification of every Red Cab Web entry rule and redirect helper — signatures, constants, reference implementation, and one test row per behaviour.
---

## TL;DR

- Six entry rules and four redirect helpers. Every rule has the signature `(identitiesAccount | null, identitiesAdmin | null, location) => string | null`.
- The reference implementation below is normative. Implementation specs may rename internals, not behaviour.
- Every row in the test tables becomes one `test.each` row in `app/auth/*.spec.js`.

:::info Three rules

1. **No cookie, no call.** Rules receive data. They never fetch it.
2. **Only `401` means signed out.** `null` input means "signed out", and nothing else.
3. **Node reads, the browser writes.** Rules return paths. Guards redirect.

:::

## Words this appendix uses

| Word | Meaning |
| --- | --- |
| `A(role)` | An account fixture: `{ uuid: 'a-1', email: 'a@example.com', role: role }` |
| `ADMIN` | An admin fixture: `{ uuid: 'ad-1', email: 'ops@example.com', name: 'Ops' }` |
| `loc(p, s)` | `{ pathname: p, search: s ?? '' }` |
| `enc(x)` | `encodeURIComponent(x)` |

## Signatures

```ts
type Location   = { pathname: string, search: string }
type EntryRule  = (identitiesAccount: Account | null, identitiesAdmin: Admin | null, location: Location) => string | null
```

| Rule | File | Reads | Policy route |
| --- | --- | --- | --- |
| `accountGuest` | `auth-entry-rules.js` | account | `account-guest-policy` |
| `touristRequired` | `auth-entry-rules.js` | account | `tourist-required-policy` |
| `corporateRequired` | `auth-entry-rules.js` | account | `corporate-required-policy` |
| `providerRequired` | `auth-entry-rules.js` | account | `provider-required-policy` |
| `adminGuest` | `auth-admin-entry-rules.js` | admin | `admin-guest-policy` |
| `adminRequired` | `auth-admin-entry-rules.js` | admin | `admin-required-policy` |

The account guard calls `rule(identitiesAccount, null, location)`. The admin guard calls `rule(null, identitiesAdmin, location)`. A rule that reads the other side's argument is a defect.

## Constants

```js
// app/auth/auth-entry-rules.js
const ACCOUNT_GUEST_PATHS = [
  '/login', '/sign-up', '/forgot-password', '/reset-password',
  '/providers/login', '/providers/sign-up',
  '/corporate/login', '/corporate/sign-up'
]

const LOGIN_PATH_BY_SURFACE = {
  tourist   : '/login',
  corporate : '/corporate/login',
  provider  : '/providers/login'
}

// app/auth/auth-admin-entry-rules.js
const ADMIN_GUEST_PATHS    = ['/team/login']
const ADMIN_ALLOWED_PREFIX = ['/team']

// app/auth/auth-safe-redirect.js
const ROLE_PATH_PREFIXES = {                  // unchanged from identities-auth-utils.js
  tourist   : ['/account'],
  provider  : ['/providers'],
  corporate : ['/corporate']
}

// Pending open question 4. If rejected, set to [] and delete the related test rows.
const PUBLIC_RETURN_PREFIXES = ['/districts', '/listings']
const PUBLIC_RETURN_EXACT    = ['/']
```

Role homes come from `getIdentitiesHomePath(role)` in `app/utils/identities-auth-utils.js`: `/account`, `/providers`, `/corporate`, else `/`.

## Redirect helpers — reference implementation

```js
// app/auth/auth-safe-redirect.js
const INTERNAL_PATH_PATTERN = /^\/(?!\/|\\)[^\s]*$/

const isUnderPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)

const internalPathOrDefault = (urlPath, defaultPath, blockedPaths = [], allowedPrefixes = null) => {
  if (!urlPath || !INTERNAL_PATH_PATTERN.test(urlPath)) return defaultPath

  const pathname  = urlPath.split('?')[0].split('#')[0]
  const isBlocked = blockedPaths.some((blocked) => isUnderPrefix(pathname, blocked))
  const isAllowed = !allowedPrefixes || allowedPrefixes.some((prefix) => isUnderPrefix(pathname, prefix))

  return (isBlocked || !isAllowed) ? defaultPath : urlPath
}

const loginRedirectPath = (basePath, location) => (
  `${basePath}?redirect_to=${encodeURIComponent(`${location.pathname}${location.search || ''}`)}`
)

const redirectTarget = (location) => new URLSearchParams(location.search || '').get('redirect_to')

const postAuthPath = (identitiesAccount, redirectTo) => {
  const role         = identitiesAccount.role
  const homePath     = getIdentitiesHomePath(role)
  const rolePrefixes = ROLE_PATH_PREFIXES[role] || []
  const pathname     = (redirectTo || '').split('?')[0]
  const isPublic     = PUBLIC_RETURN_EXACT.includes(pathname)
    || PUBLIC_RETURN_PREFIXES.some((prefix) => isUnderPrefix(pathname, prefix))

  const allowedPrefixes = isPublic ? null : rolePrefixes

  if (!isPublic && rolePrefixes.length === 0) return homePath

  return internalPathOrDefault(redirectTo, homePath, ACCOUNT_GUEST_PATHS, allowedPrefixes)
}

export const authSafeRedirect = {
  internalPathOrDefault : internalPathOrDefault,
  loginRedirectPath     : loginRedirectPath,
  redirectTarget        : redirectTarget,
  postAuthPath          : postAuthPath
}
```

`ACCOUNT_GUEST_PATHS` is imported from `auth-entry-rules.js`, or moved to a shared constants file in the Phase 0 spec. `auth-safe-redirect.js` must not import any session module.

## Entry rules — reference implementation

```js
// app/auth/auth-entry-rules.js
const requiredFor = (role) => (identitiesAccount, _identitiesAdmin, location) => {
  if (!identitiesAccount) return authSafeRedirect.loginRedirectPath(LOGIN_PATH_BY_SURFACE[role], location)
  if (identitiesAccount.role === role) return null

  return getIdentitiesHomePath(identitiesAccount.role)
}

const accountGuest = (identitiesAccount, _identitiesAdmin, location) => {
  if (!identitiesAccount) return null

  return authSafeRedirect.postAuthPath(identitiesAccount, authSafeRedirect.redirectTarget(location))
}

export const authEntryRules = {
  ACCOUNT_GUEST_PATHS : ACCOUNT_GUEST_PATHS,
  accountGuest        : accountGuest,
  touristRequired     : requiredFor(ACCOUNT_ROLE.TOURIST),
  corporateRequired   : requiredFor(ACCOUNT_ROLE.CORPORATE),
  providerRequired    : requiredFor(ACCOUNT_ROLE.PROVIDER)
}
```

```js
// app/auth/auth-admin-entry-rules.js
const adminGuest = (_identitiesAccount, identitiesAdmin, location) => {
  if (!identitiesAdmin) return null

  return authSafeRedirect.internalPathOrDefault(
    authSafeRedirect.redirectTarget(location), '/team', ADMIN_GUEST_PATHS, ADMIN_ALLOWED_PREFIX
  )
}

const adminRequired = (_identitiesAccount, identitiesAdmin, location) => {
  if (!identitiesAdmin) return authSafeRedirect.loginRedirectPath('/team/login', location)

  return null
}

export const authAdminEntryRules = {
  ADMIN_GUEST_PATHS : ADMIN_GUEST_PATHS,
  adminGuest        : adminGuest,
  adminRequired     : adminRequired
}
```

## Test rows

### `touristRequired`

| # | Account | Admin | Location | Expected |
| --- | --- | --- | --- | --- |
| T1 | `null` | `null` | `loc('/account/bookings')` | `/login?redirect_to=${enc('/account/bookings')}` |
| T2 | `null` | `null` | `loc('/account/checkout', '?listing_id=l1&availability_slot_id=s1&passenger_count=2')` | `/login?redirect_to=${enc('/account/checkout?listing_id=l1&availability_slot_id=s1&passenger_count=2')}` |
| T3 | `A('tourist')` | `null` | `loc('/account')` | `null` |
| T4 | `A('corporate')` | `null` | `loc('/account/checkout')` | `/corporate` |
| T5 | `A('provider')` | `null` | `loc('/account')` | `/providers` |
| T6 | `A('future_role')` | `null` | `loc('/account')` | `/` |
| T7 | `null` | `ADMIN` | `loc('/account')` | `/login?redirect_to=${enc('/account')}` (admin is ignored) |

### `corporateRequired`

| # | Account | Location | Expected |
| --- | --- | --- | --- |
| C1 | `null` | `loc('/corporate')` | `/corporate/login?redirect_to=${enc('/corporate')}` |
| C2 | `A('corporate')` | `loc('/corporate')` | `null` |
| C3 | `A('tourist')` | `loc('/corporate')` | `/account` |
| C4 | `A('provider')` | `loc('/corporate')` | `/providers` |
| C5 | `A('future_role')` | `loc('/corporate')` | `/` |

### `providerRequired`

| # | Account | Location | Expected |
| --- | --- | --- | --- |
| P1 | `null` | `loc('/providers/catalog/listings')` | `/providers/login?redirect_to=${enc('/providers/catalog/listings')}` |
| P2 | `A('provider')` | `loc('/providers/registration/create')` | `null` |
| P3 | `A('tourist')` | `loc('/providers')` | `/account` |
| P4 | `A('corporate')` | `loc('/providers')` | `/corporate` |
| P5 | `A('future_role')` | `loc('/providers')` | `/` |

### `accountGuest`

| # | Account | Location | Expected |
| --- | --- | --- | --- |
| G1 | `null` | `loc('/login')` | `null` |
| G2 | `null` | `loc('/providers/sign-up')` | `null` |
| G3 | `A('tourist')` | `loc('/login')` | `/account` |
| G4 | `A('tourist')` | `loc('/login', '?redirect_to=%2Faccount%2Fbookings')` | `/account/bookings` |
| G5 | `A('tourist')` | `loc('/login', '?redirect_to=%2Faccount%2Fcheckout%3Flisting_id%3Dl1')` | `/account/checkout?listing_id=l1` |
| G6 | `A('tourist')` | `loc('/login', '?redirect_to=%2Fproviders')` | `/account` |
| G7 | `A('provider')` | `loc('/login', '?redirect_to=%2Faccount%2Fcheckout')` | `/providers` |
| G8 | `A('tourist')` | `loc('/login', '?redirect_to=%2Flogin')` | `/account` (loop guard) |
| G9 | `A('tourist')` | `loc('/login', '?redirect_to=%2Fcorporate%2Flogin%3Fa%3D1')` | `/account` (guest path with query) |
| G10 | `A('tourist')` | `loc('/login', '?redirect_to=%2F%2Fevil.example')` | `/account` |
| G11 | `A('tourist')` | `loc('/login', '?redirect_to=%2F%5Cevil.example')` | `/account` |
| G12 | `A('tourist')` | `loc('/login', '?redirect_to=https%3A%2F%2Fevil.example')` | `/account` |
| G13 | `A('tourist')` | `loc('/login', '?redirect_to=javascript%3Aalert(1)')` | `/account` |
| G14 | `A('corporate')` | `loc('/corporate/login')` | `/corporate` |
| G15 | `A('future_role')` | `loc('/login', '?redirect_to=%2Faccount')` | `/` |
| G16 | `A('tourist')` | `loc('/login', '?redirect_to=%2Fdistricts%2Ftokyo')` | `/districts/tokyo` — **pending open question 4**; if rejected, `/account` |
| G17 | `A('provider')` | `loc('/login', '?redirect_to=%2Flistings%2Fl1')` | `/listings/l1` — pending open question 4 |

### `adminGuest`

| # | Admin | Location | Expected |
| --- | --- | --- | --- |
| AG1 | `null` | `loc('/team/login')` | `null` |
| AG2 | `ADMIN` | `loc('/team/login')` | `/team` |
| AG3 | `ADMIN` | `loc('/team/login', '?redirect_to=%2Fteam%2Fproviders%2Fprofiles')` | `/team/providers/profiles` |
| AG4 | `ADMIN` | `loc('/team/login', '?redirect_to=%2Fteam%2Flogin')` | `/team` (loop guard) |
| AG5 | `ADMIN` | `loc('/team/login', '?redirect_to=%2Faccount')` | `/team` (outside `/team`) |
| AG6 | `ADMIN` | `loc('/team/login', '?redirect_to=%2F%2Fevil.example')` | `/team` |
| AG7 | `ADMIN` | `loc('/team/login', '?redirect_to=%2Fteamwork')` | `/team` (`/teamwork` is not under `/team`) |

### `adminRequired`

| # | Account | Admin | Location | Expected |
| --- | --- | --- | --- | --- |
| AR1 | `null` | `null` | `loc('/team')` | `/team/login?redirect_to=${enc('/team')}` |
| AR2 | `null` | `ADMIN` | `loc('/team/payments/commission-rates')` | `null` |
| AR3 | `A('tourist')` | `null` | `loc('/team')` | `/team/login?redirect_to=${enc('/team')}` (account is ignored) |

### `internalPathOrDefault`

| # | urlPath | default | blocked | allowed | Expected |
| --- | --- | --- | --- | --- | --- |
| S1 | `undefined` | `/d` | `[]` | `null` | `/d` |
| S2 | `''` | `/d` | `[]` | `null` | `/d` |
| S3 | `/a/b?x=1` | `/d` | `[]` | `null` | `/a/b?x=1` |
| S4 | `/login` | `/d` | `['/login']` | `null` | `/d` |
| S5 | `/login/extra` | `/d` | `['/login']` | `null` | `/d` |
| S6 | `/login-help` | `/d` | `['/login']` | `null` | `/login-help` |
| S7 | `/team/x` | `/d` | `[]` | `['/team']` | `/team/x` |
| S8 | `/teamwork` | `/d` | `[]` | `['/team']` | `/d` |
| S9 | `/a b` | `/d` | `[]` | `null` | `/d` (whitespace) |

### `loginRedirectPath`

| # | base | location | Expected |
| --- | --- | --- | --- |
| L1 | `/login` | `loc('/account')` | `/login?redirect_to=%2Faccount` |
| L2 | `/login` | `loc('/account/checkout', '?listing_id=l1')` | `/login?redirect_to=%2Faccount%2Fcheckout%3Flisting_id%3Dl1` |

L2 matches today's `buildIdentitiesLoginRedirect` output, so web-56's Book CTA URLs keep working.

## Loop proof

| Start | Rule | Result | Next rule | Result |
| --- | --- | --- | --- | --- |
| Provider on `/account` | `touristRequired` | `/providers` | `providerRequired` | allow |
| Tourist on `/login?redirect_to=/login` | `accountGuest` | `/account` | `touristRequired` | allow |
| Unknown role on `/providers` | `providerRequired` | `/` | none (open page) | allow |
| Admin on `/team/login?redirect_to=/team/login` | `adminGuest` | `/team` | `adminRequired` | allow |

No path returned by any rule is guarded by a rule that sends the same person back. Keep a test that runs each rule's output through the matching next rule.

## Related documents

- [Entry rules](/docs/engineering/authentication/entry-rules) — the same tables in prose
- [Policy middleware](/docs/engineering/authentication/policy-middleware) — guards that call these rules
