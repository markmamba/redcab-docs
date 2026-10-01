# Issue #83 curl transcript — 2026-10-01

Harness: `red-cab-web` branch `83-choreiam-spike-react-router-80-policy-middleware-behavior-auth-phase-3` @ `ff041f5` (local; push before citing in PR).

Environment: `npm run build` + `react-router-serve` on `http://localhost:5173` (no session cookies).

## Guest `/account/discover` → legacy redirect

```
HTTP/1.1 301 Moved Permanently
location: /districts
```

## Guest document `/account/bookings`

```
HTTP/1.1 302 Found
location: /login?redirect_to=%2Faccount%2Fbookings
x-remix-replace: true
```

## Guest `.data` enter-area (`_routes` includes policy)

Request:

`GET /account/bookings.data?_routes=routes%2Fpolicies%2Ftourist-required-policy%2Croutes%2Ftourist%2Fbooking-list-page`

Response:

```
HTTP/1.1 202 Accepted
content-type: text/x-script; charset=utf-8
x-remix-replace: true
x-remix-response: yes
```

Body (truncated):

```
[["SingleFetchRedirect",1],{...},"redirect","/login?redirect_to=%2Faccount%2Fbookings","status",302,...,"replace",true]
```

## Dev guard log (`npm run dev`, same `.data` request)

```
[spike-83 policy] { urlSource: 'middleware-url', pathname: '/account/bookings', search: '', signedIn: false }
[spike-83 policy] threw replace /login?redirect_to=%2Faccount%2Fbookings
```

## Not exercised in this transcript

- Expired access token + valid refresh (`Set-Cookie` on `.data` + thrown `replace`) — requires live IAM cookies; re-run manually before policy PR merge (R-4).
- Full seven-row browser matrix (in-area click, `revalidate()`, action row) — manual steps in `policy-middleware.md`; automate in spec 6 (Playwright).
