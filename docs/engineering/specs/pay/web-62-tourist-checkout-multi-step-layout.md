---
title: "Tourist checkout multi-step layout and return confirmation"
sidebar_label: Web · Checkout funnel layout
issue: "https://github.com/markmamba/red-cab-web/issues/62"
repos:
  - red-cab-web
  - red-cab-api
status: approved
phase: 1
context: PAY
---

## TL;DR

- Three **interactive** checkout steps (fulfillment → policy agreement → payment) plus listing **slot selection** so Book → checkout works E2E.
- **Edit trip details:** rehydrate from session, skip `POST` when fulfillment unchanged, **422 recovery matrix** when hold conflicts (Sonnet plan review).
- Return poll **fail-fast** when `status=completed` but `booking_id` is null; success stays redirect-only (web-12).
- Adds **public marketplace read** of bookable availability slots for a listing (required for slot picker; no public route today).
- **Seat hold** at `POST checkout_sessions` (`ReserveSeatsService`); no tourist cancel API in #62.
- Breaking change: No

## Problem

Milestone B (#62) requires a stable funnel aligned with roadmap language and listing → checkout quote parity. Current web uses two internal steps with policy on fulfillment and repeated on payment; listing detail has no slot UI while checkout requires `availability_slot_id`; refresh drops session state; poll can spin until timeout when `completed` lacks `booking_id`; Edit-from-payment risks ghost sessions without rehydrate/skip-create rules.

Evidence: `tourist-checkout-page.jsx`, `bookings-checkout-session-fulfillment-form.jsx`, `marketplace-catalog-listing-detail-page.jsx`, `bookings-checkout-session-payment-service.js`, `tourists_create_manager.rb`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Milestone B | [tourist-ui-pre-phase-2](/docs/product/planning/roadmap/tourist-ui-pre-phase-2) | Checkout + slot selection P0 |
| ADR-017 | [adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Auth at checkout; route family |
| web-56 | [web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Handoff query params |
| web-58 | [web-58-tourist-unified-layout-shell](/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell) | Account shell |
| web-12 | [web-12-checkout-payment-step](/docs/engineering/specs/pay/web-12-checkout-payment-step) | Payment attempt + poll + redirect success |
| FR-CAT-019+ | [cat FRs](/docs/product/requirements/functional-requirements/cat) | Slots, capacity presentation |
| FR-CAT-120 | [cat FRs](/docs/product/requirements/functional-requirements/cat) | Tourist date filter for listings with slots |
| INV-1 / CR-1 | [invariants](/docs/product/business-rules/invariants) | No client price; seat reserve at checkout create |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Three interactive steps** (Q1=A) | 2 steps + 3-label stepper only | Policy is its own screen |
| 2 | **Conditional session create** on policy Continue | Always POST on Continue | Skip POST when fulfillment unchanged vs active session (avoids double hold) |
| 3 | **Listing slot picker** (Q2=B) | Verify params only | E2E Milestone B |
| 4 | **No payment rehydrate on refresh** (Q3=B) | Persist session id + GET show | MVP; document start-over |
| 5 | **Edit trip details** (Q4=A, revised) | No back; always new create | Rehydrate; skip create if unchanged; recovery matrix on 422 |
| 6 | Return **redirect-only** success (Q5=A) | Success card | web-12 DD6 |
| 7 | **Terminal poll error** on `completed` ∧ ¬`booking_id` (Q6=A) | Poll until timeout | FIN-13 |
| 8 | **Slot hold at create** | Hold at payment | API `TouristsCreateManager` + `ReserveSeatsService`; TTL `expires_at` |
| 9 | **Browser Back/Forward between steps** | URL `?step=` | **Out of scope #62** — in-app stepper only |
| 10 | **Tourist session cancel API** | Instant hold release on Edit | **Deferred** — recovery UX only until expiry |

### Checkout step machine

| Step | UI | API |
| --- | --- | --- |
| 1 Fulfillment | Trip/contact fields (no policy checkbox) | None on Next — local Zod/RHF only |
| 2 Policy | Cancellation tiers + agree checkbox | `POST checkout_sessions` **only if** no active session **or** fulfillment payload differs from active session snapshot |
| 3 Payment | web-12 Pay now / handoff | `POST …/payment_attempts` using **current** `checkoutSession.uuid` |

- Shared **step indicator**: Fulfillment / Policy / Payment.
- **Edit trip details** (from payment): clear embedded handoff; disable Pay until user returns to payment with valid session; rehydrate fulfillment from session payload (not account defaults only).
- **Browser refresh:** step 1; quote URL params preserved; client session cleared (server hold until API expiry).
- **Browser Back/Forward between steps:** out of scope — document abandon semantics if user leaves checkout route.

### Scenario A — Ghost session from Edit

| Event | Behavior |
| --- | --- |
| Enter Edit | Keep active session in parent state; clear payment handoff state |
| Fulfillment | Rehydrate from `checkoutSession` fulfillment fields |
| Policy Continue, unchanged | Skip `POST`; go to payment with same session |
| Policy Continue, changed | `POST` new session; on 422 hold conflict, show recovery matrix; retain prior session in memory for **Resume previous checkout** |
| Pay | Only allowed on payment step with current `checkoutSession` |

### Scenario B — Stale slot on resume

| Event | Behavior |
| --- | --- |
| Return failure → resume URL | Quote params from `sessionStorage`; fulfillment step; no client session |
| Checkout loader 422 | Stale slot copy + link to listing slot picker |
| Listing | Disable Book until loader done and `price_breakdown.availability_slot_id` matches URL param |

### Listing slot selection

- Slot picker on listing detail → `availability_slot_id` search param → refetch quote.
- Slot list API query includes date/window param aligned with FR-CAT-120 where applicable.
- Book uses `CatalogListingService.resolveBookCtaPath` (unchanged).

## API contract

### New — GET `/marketplace/catalog/listings/:listing_id/availability_slots`

Public read of **bookable** slots for listing detail (no JWT).

| | |
| --- | --- |
| **Auth** | None (marketplace) |
| **Query** | Date/window param (e.g. `service_date`) — required for usable picker |
| **Response 200** | Collection: slot `uuid`, `start_time`, `end_time`, `remaining_capacity`, `status` (display-only) |
| **Errors** | 404 listing; 422 invalid params |

### Unchanged (web-12)

- `POST /tourists/bookings/checkout_sessions` — reserves seats in create transaction
- `GET checkout_sessions/:id`, `POST payment_attempts`

### Files to create or modify (API)

- `config/routes/marketplace_routes.rb`
- Marketplace availability slots index (controller, request, validator, manager, serializer, tests)

## Web contract

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Listing detail | `/districts/.../listings/:uuid` | `loader` | listings + slots client | none |
| Checkout | `/account/checkout` | `clientLoader` | listings + checkout sessions | `withTouristAuth` |
| Return | `/account/checkout/return` | — | checkout sessions | `withTouristAuth` |

### Navigation matrix

| Situation | Primary | Secondary |
| --- | --- | --- |
| Checkout quote / stale slot error | Back to service (listing + picker) | Browse districts |
| Create 422 hold conflict | Choose another time → listing | Resume previous checkout → payment |
| Return poll failed | Back to checkout (resume path) | My bookings / districts |
| Missing return session id | Browse districts | — |
| Browser Back between steps | **N/A (out of scope)** | In-app stepper only |

### Error catalog

| Condition | UX |
| --- | --- |
| Quote loader 422 (slot/capacity) | Stale slot message + listing link |
| Create 422 fully booked / hold conflict | Recovery matrix (resume vs choose time) |
| Poll `completed` ∧ ¬`booking_id` | Terminal error + resume/discover links |
| Poll expired / timeout | web-12 patterns + resume path |

### Return route

- Missing query → warning + discover (+ bookings link optional).
- Poll fail-fast on `completed` without `booking_id`.
- Success: toast + `replace` navigate to booking detail.

### Files to create or modify (Web)

- `app/api/marketplace-catalog-availability-slots-api.js`
- `app/domains/catalog-listing/*` — slot picker
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-detail-page.jsx`
- `app/domains/bookings-checkout-session/*` — stepper, policy step, service rehydrate/compare, payment poll
- `app/routes/tourist/tourist-checkout-page.jsx`, `tourist-checkout-return-page.jsx`
- Vitest: payment poll edge case, skip-create payload compare, checkout path parity

## Data / domain touchpoints

- **Contexts:** CAT (slot read); PAY/BKG (checkout per web-12)
- **Seat holds:** `Catalog::Availability::ReserveSeatsService` at session create only (CR-1)
- **INV-1 / FIN-13:** Server pricing; poll materialization for confirmation

## Out of scope

- Payment SDK; embedded provider beyond web-12 stub
- Checkout session rehydrate on refresh (Q3=B)
- Tourist checkout session cancel/abandon API
- URL step params; browser Back/Forward step history
- Booking list/detail (#63/#64)
- Provider slot CRUD

## Tasks

### API

- [ ] Marketplace listing availability slots index + tests

### Web

- [ ] Slot picker + API client; Book gate on quote match
- [ ] Stepper + 3 steps; conditional create; edit rehydrate + recovery matrix
- [ ] Return poll terminal case + navigation polish
- [ ] Vitest + lint; manual scenarios A & B

### Docs

- [x] Human verification (PKM plan 2026-09-26)
- [x] `status: approved` 2026-09-26
- [ ] After merge: `status: implemented`

## Acceptance criteria

- [ ] Slot picker → Book → checkout with valid quote
- [ ] Three steps; conditional create on policy Continue
- [ ] Edit rehydrate; skip create if unchanged; 422 recovery without dead ends
- [ ] Poll completed∧¬booking_id fails fast
- [ ] Refresh start-over documented; browser step Back out of scope
- [ ] `noindex` checkout/return; no client price math

## Verification

```bash
cd red-cab-api
bin/rails test test/controllers/marketplace/catalog/availability_slots_controller_test.rb

cd red-cab-web
npm run test
npm run lint
```

Manual: happy path FakeProvider; Scenario A (Edit unchanged/changed); Scenario B (resume + stale slot).

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-26 | PKM plan | human MCQ + approve | passed |
| 2026-09-26 | Sonnet | plan review | conditional pass — mitigations in spec |
| 2026-09-26 | PKM plan | user `approved` | spec `status: approved` |
