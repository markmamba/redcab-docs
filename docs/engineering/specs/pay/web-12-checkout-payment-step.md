---
title: "Checkout payment step"
sidebar_label: Web · Checkout payment
issue: "https://github.com/markmamba/red-cab-web/issues/12"
repos:
  - red-cab-web
  - red-cab-api
status: approved
phase: 1
context: PAY
---

## TL;DR

- Ships tourist checkout payment step + return route driven by API `payment_handoff` descriptor (`redirect` / `embedded` structural stub).
- Adds thin API `GET checkout_sessions/:id` for FIN-13 polling (human Q1=A).
- Does **not** ship Stripe SDK, FakeProvider embedded handoff, or E2E tests.
- Breaking change: No

## Problem

Checkout creates a `CheckoutSession` and advances to a payment placeholder (`bookings-checkout-session-payment-placeholder-view.jsx`). API #71 exposes `POST …/payment_attempts` with `payment_handoff`, but the web has no client, no return route, and no pollable contract to confirm booking materialization after provider redirect (`FIN-13`).

Evidence: `app/routes/tourist/tourist-checkout-page.jsx`, `app/api/tourists-bookings-checkout-sessions-api.js` (create only), `red-cab-api/config/routes/tourists_routes.rb` (no GET checkout session).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-PAY-015 | [/docs/product/requirements/functional-requirements/pay.md](/docs/product/requirements/functional-requirements/pay) | Money state from verified provider events |
| FIN-11, FIN-13 | [Payments architecture](/docs/architecture/patterns/payments-architecture) | Return redirect is presentation hint; poll API for confirmation |
| ADR-015 C6 | [architecture/decisions/adr-015-payment-custody-and-control-separation.md](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation.md) | Provider-agnostic handoff branching |
| INV-1 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | No client-authored price |
| frontend-conventions §7 | [Frontend conventions](/docs/engineering/conventions/frontend) | Payment step rules |
| Spec #71 | [spec./api-71-payment-attempt-checkout.md](./api-71-payment-attempt-checkout.md) | Payment attempt contract |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Poll via `GET checkout_sessions/:id` | Bookings index filter; booking UUID in return URL | Session owns checkout lifecycle; FIN-13; no filter on orders index today |
| 2 | `checkout_session_id` in return URL query | sessionStorage only | Survives provider redirect + refresh |
| 3 | Return route `/account/checkout/return` | Same checkout page step | Dedicated async landing (OAuth callback pattern) |
| 4 | `return_url` from `VITE_REDCAB_BASE_URL` | `window.location.origin` at runtime | SSR-safe absolute URL for API validation |
| 5 | Embedded = structural stub + lazy chunk | Skip embedded branch | ADR-015 requires branch without SDK on other routes |
| 6 | Success → `/account/bookings/:bookingId` | Inline confirmation card | Reuse booking detail |
| 7 | Explicit Pay now CTA | Auto mount on step enter | Human Q2=A; clearer consent |
| 8 | Extend checkout sessions API module | New payment-attempts file | Same resource namespace |

## API contract

### Existing — POST `/tourists/bookings/checkout_sessions/:checkout_session_id/payment_attempts`

Per [spec 71](./api-71-payment-attempt-checkout.md). Web sends:

```json
{ "return_url": "https://{web}/account/checkout/return?checkout_session_id={uuid}" }
```

No amount fields. Handle 201, 200 (idempotent pending), 422, 409.

### New — GET `/tourists/bookings/checkout_sessions/:checkout_session_id`

| | |
| --- | --- |
| **Auth** | JWT + tourist profile |
| **Response 200** | JSON: `uuid`, `status` (pending \| completed \| expired), `booking_id`, `expires_at` |
| **Errors** | 404 not found / not owned |

`booking_id` populated when `status === completed` and order materialized. Web polls until `completed` + `booking_id` or terminal `expired` / timeout.

### Files to create or modify (API)

- `config/routes/tourists_routes.rb`
- `app/controllers/tourists/bookings/checkout_sessions_controller.rb` — `show`
- `app/domains/bookings/checkout_sessions/tourists_show_request.rb`
- `app/domains/bookings/checkout_sessions/tourists_show_validator.rb`
- `app/domains/bookings/checkout_sessions/tourists_show_manager.rb`
- `app/domains/bookings/tourists_checkout_session_status_serializer.rb`
- `test/controllers/tourists/bookings/checkout_sessions_controller_test.rb`

## Web contract

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Tourist checkout payment | `/account/checkout` (step 2) | existing `clientLoader` | `tourists-bookings-checkout-sessions-api.js` | `withTouristAuth` |
| Tourist checkout return | `/account/checkout/return` | none (`useEffect` poll) | same + `tourists-bookings-booking-api.js` (nav only) | `withTouristAuth` |

### Payment step flow

1. Fulfillment submit creates session (existing).
2. Tourist clicks **Pay now** → `POST payment_attempts`.
3. On `payment_handoff.kind === redirect` → `window.location.assign(handoff.url)`.
4. On `embedded` → render lazy embedded stub view.
5. On error → toast + inline alert from API `messages`.

### Return route flow

1. Read `checkout_session_id` from query; error if missing.
2. Poll `GET checkout_sessions/:id` with backoff until `booking_id` present or terminal state.
3. Success → `navigate(/account/bookings/:bookingId, { replace: true })`.
4. Failure/expired → user-visible error + link back to discover/checkout.

### Files to create or modify (Web)

- `app/api/tourists-bookings-checkout-sessions-api.js`
- `app/domains/bookings-checkout-session/bookings-checkout-session-constant.js`
- `app/domains/bookings-checkout-session/bookings-checkout-session-payment-service.js`
- `app/domains/bookings-checkout-session/bookings-checkout-session-payment-view.jsx`
- `app/domains/bookings-checkout-session/bookings-checkout-session-embedded-payment-view.jsx`
- `app/routes/tourist/tourist-checkout-page.jsx`
- `app/routes/tourist/tourist-checkout-return-page.jsx`
- `app/tourist.routes.js`
- `app/domains/bookings-checkout-session/bookings-checkout-session-payment-service.spec.js`
- Delete `bookings-checkout-session-payment-placeholder-view.jsx`

## Data / domain touchpoints

- **Bounded contexts:** PAY (handoff initiation); BKG (session status, booking materialization read)
- **Snapshots:** Display only server `price_breakdown` from session create response
- **Critical invariant:** No booking confirmation without API poll (`FIN-13`)

## Out of scope

- API #71 payment attempt implementation (done)
- Stripe / production PSP SDK
- FakeProvider embedded handoff
- E2E tests
- Checkout session expiry job

## Tasks

### API

- [ ] Add GET checkout session show route + manager + lean serializer
- [ ] Controller tests: owned, foreign, completed with `booking_id`

### Web

- [ ] Extend checkout sessions API client
- [ ] Payment service (return URL, poll, handoff dispatch)
- [ ] Payment view + embedded stub
- [ ] Wire checkout page; add return route
- [ ] Vitest payment service tests
- [ ] Manual FakeProvider succeed/fail paths

### Docs

- [ ] Set spec `status: approved` after human verification
- [ ] Set `status: implemented` after merge

## Acceptance criteria

- [ ] Payment step receives and branches on `payment_handoff`
- [ ] Redirect handoff navigates to provider page (FakeProvider in dev)
- [ ] Embedded handoff renders in-page stub without SDK on other routes
- [ ] Return route polls API until booking materialized; does not trust return URL alone
- [ ] Failures show API errors; no client price computation
- [ ] Works with FakeProvider redirect flow end-to-end

## Verification

```bash
# Web
npm run test
npm run lint

# API (if show endpoint ships)
bin/rails test test/controllers/tourists/bookings/checkout_sessions_controller_test.rb
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-20 | PKM plan | human MCQ verification | passed — awaiting explicit approve |
