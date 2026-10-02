---
title: "Tourist Phase 2 placeholder slots (Milestone D)"
sidebar_label: Web · Phase 2 slots
issue: "https://github.com/markmamba/red-cab-web/issues/68"
repos:
  - red-cab-web
status: approved
phase: 1
context: platform
depends_on:
  - "docs/70-79-business/73-planning/roadmap/tourist-ui-pre-phase-2.md"
  - "docs/60-69-initiatives/61-implementation-specs/cat/web-67-listing-sort-control-url-params.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/web-56-tourist-access-and-route-contract.md"
  - "docs/70-79-business/73-planning/web-platform-program-strategy.md"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- **Ships:** Named Phase 2 UI **slots** (architectural seams) on discover list, listing rating surfaces, tourist booking detail, and checkout order summary — no new `app/api/` modules, no live Phase 2 HTTP, no client-side eligibility math (time cutoffs, refund %, review window).
- **Visibility (A3):** Low-risk stubs visible (toolbar, review CTA, rating empty states). Money/trust-adjacent: cancel never opens a fake confirm; refund panel status-gated; bundle extension mounted but renders no visible UI.
- **Does NOT ship:** Live CAT search/filter loader wiring, REV submit/fetch, cancel/refund API, bundle checkout data, server `allowed_actions` / eligibility fields (document B3 only), `@testing-library/react`.
- **Breaking change:** No.
- **Approved:** 2026-10-02 (PKM plan + Sonnet review addendum + author sign-off).

## Problem

[Milestone D](/docs/70-79-business/planning/roadmap/tourist-ui-pre-phase-2) requires placeholder slots before Phase 2 APIs ship. `red-cab-web` has live discover sort (#67) but lacks toolbar, booking action seams, refund panel, bundle extension, and explicit reviews empty states. Epic `#55` exit: every Phase 2 tourist capability has a named slot on an existing page.

`TouristsBookingDetailSerializer` exposes no `can_cancel`, `can_review`, refund fields, or `bundle_booking_id`. #68 uses status-only helpers in `BookingsBookingService` with a documented Phase 2 swap to server-provided flags (B3). Field names are owned by future REV/BKG API specs — not invented in #68.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Milestone D | [tourist-ui-pre-phase-2.md](/docs/70-79-business/planning/roadmap/tourist-ui-pre-phase-2) | Slot inventory |
| web-67 | [web-67-listing-sort-control-url-params.md](../cat/web-67-listing-sort-control-url-params.md) | Sort; loader whitelist |
| web-56 | [web-56-tourist-access-and-route-contract](../iam/web-56-tourist-access-and-route-contract.md) | Routes |
| Program | [web-platform-program-strategy](/docs/70-79-business/planning/web-platform-program-strategy) | `#68`, **G3/G4** — real API wiring on authenticated flows waits program gates; Milestone D placeholders on existing pages are allowed |
| FR-CAT-027 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Discover sort/filter (partial) |
| FR-REV-001, FR-REV-002 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Review eligibility — stub copy must not assert 14-day window client-side |
| INV-5, OPR-7 | [invariants](/docs/70-79-business/business-rules/invariants) | Review only after completed booking; invitation window deferred to API |
| FR-BKG-010, FR-BKG-012, BKG-3 | [bkg.md](/docs/70-79-business/requirements/functional-requirements/bkg), invariants | Cancel/bundle semantics |
| FR-PAY-006, PAY-6, PAY-7 | [pay.md](/docs/70-79-business/requirements/functional-requirements/pay), invariants | Refund display — no client math |
| LC-1, PRC-1 | invariants | Status machine; pricing display |
| AMB-006, AMB-014, AMB-017, AMB-019 | [open-questions](/docs/70-79-business/planning/open-questions) | Cited; not resolved client-side in #68 |
| frontend.md | [frontend conventions](/docs/50-59-frontend/conventions/frontend) | Domain views; URL-driven state |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Spec in `platform/` | `cat/` only | Spans discover + booking + checkout tourist slots; avoids CAT-owned spec superseding future BKG/REV/PAY specs |
| 2 | No loader/API changes | Forward filter query keys | #67 whitelist: `page`, `order_by`, `order_dir` only |
| 3 | Toolbar + sort (D2) | Stacked rows (Q1=A only) | Separate components; one `d-flex` row on `md+` (toolbar start, sort end); stack on xs |
| 4 | Labeling Q2=C | Uniform hidden stubs | Discover: disabled + visible helper; booking: Coming soon badges |
| 5 | Clear filters (D2) | Leave filter dead end | `LISTING_FILTER_SEARCH_PARAMS` in constant; strip keys via `setSearchParams` — URL only |
| 6 | Cancel (M1) | Dismiss-only confirm modal | Q4=A: disabled cancel + badge for `confirmed` only; modal for tests only, not user-reachable |
| 7 | Review (M2) | Enable only `completed` | Q3=B amended: always render; enable when status ∈ `{ completed, payout_queued, refunded }` (INV-5) |
| 8 | Refund (M3) | Always-on panel (Q7=A) | Panel only `cancelled` \| `refunded`; neutral placeholder; no “not available yet” on refunded |
| 9 | Bundle (S1) | Bordered subsection (Q6=B) | Mount extension; `null` UI — BKG-3 / AMB-017 shape deferred |
| 10 | Eligibility B1+B3 | Inline view gates | `BookingsBookingService` pure helpers + matrix tests; Phase 2 reads server flags |
| 11 | Rating D2+S3 | Full empty state on every card | `hasReviewData` in service; compact card vs hero component |
| 12 | Components C2 | `*-stub.jsx` + comments | Capability names, stable props, `@phase 2` JSDoc; inert-state vitest per component |
| 13 | Modal placement S6 | State in detail view | `BookingsBookingTouristActions` owns modal state |
| 14 | Tests E2 | Testing Library | `createRoot` + `act` + jsdom; static markup for matrices |
| 15 | i18n | JA in #68 | EN until Milestone E |
| 16 | PKM confirm modal | — | Empty `catch` forbidden when Phase 2 wires cancel submit |

### Visibility tiers (A3)

| Slot | User-visible in #68 |
| --- | --- |
| Discover toolbar | Yes — disabled + visible helper |
| Sort control | Yes — unchanged (#67) |
| Rating empty (card) | Yes — compact muted line |
| Rating empty (hero) | Yes — dedicated component |
| Write a review | Yes — per `reviewStubState` |
| Cancel | Yes — disabled + badge; modal not reachable |
| Refund panel | Only `cancelled` / `refunded` |
| Bundle leg | No visible chrome (`null`) |

### Phase 2 eligibility contract (B3 — document only)

When REV/BKG specs ship, tourist booking detail should expose server-driven eligibility (exact shape TBD in those specs). Web helpers must prefer API fields when present and fall back to the #68 status table until then. **Do not** add client-side time-based cancel tiers, refund %, or review-window checks in #68.

## Web contract

| Surface | Path | Loader | Change |
| --- | --- | --- | --- |
| Area listings | `/districts/:districtSlug/areas/:areaSlug/listings` | SSR `loader` | Toolbar + sort row; Clear filters |
| Listing cards / hero | public listing detail | per route | Rating via `CatalogListingService` |
| Booking detail | `/account/bookings/:bookingId` | `clientLoader` | Actions + refund panel |
| Checkout | `/account/checkout` | per web-62 | Bundle extension in order summary |

Auth: discover is public (`robots: index, follow`); booking/checkout tourist policy parents unchanged (web-56).

### Service helpers

**`BookingsBookingService`** (pure functions; unit-test 6 statuses × cancel / review / refund):

| Helper | #68 behavior |
| --- | --- |
| `canShowCancelStub(booking)` | `true` when `status === confirmed` (show disabled cancel chrome only) |
| `reviewStubState(booking)` | `{ visible: true, enabled: true }` when status ∈ `completed`, `payout_queued`, `refunded`; else `{ visible: true, enabled: false, helper: 'Reviews open after your service' }` |
| `showRefundStub(booking)` | `true` when status ∈ `cancelled`, `refunded` |

**`CatalogListingService.hasReviewData({ rating_average, reviews_count })`**

| Condition | Card / hero treatment |
| --- | --- |
| `reviews_count === 0` (ignore stale average) | Card: compact “No reviews yet”; hero: `CatalogListingRatingReviewsEmptyState` |
| `reviews_count > 0` && average present | Show formatted average + count; fix hero pluralization (`1 review` vs `N reviews`) |
| `reviews_count > 0` && average null | Card: compact “Ratings pending” (OPR-6 edge) |

### Discover toolbar

- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx`: disabled search + filter affordances; labels/helpers from `catalog-listing-constant.js`.
- Helpers must be visible text linked with `aria-describedby` — not `title` only.
- Must not call `setSearchParams` for filter keys except via page-level **Clear filters** (removes keys from `LISTING_FILTER_SEARCH_PARAMS`).
- Must not invoke `marketplaceCatalogListingsApi` with new params.
- Filter keys (constant): `passenger_count`, `availability_slot_id`, `service_type`, `date`.

### Sort integration

- `CatalogListingDiscoverSortControl` remains a sibling in the same row as toolbar (D2).
- Preserve #67: URL-driven sort, rating preset disabled, loader whitelist, canonical meta regression.

### Booking detail

- `bookings-booking-tourist-detail-view.jsx`: mount `BookingsBookingTouristActions` immediately after the header `ListGroup` block (after status row region); mount `BookingsBookingRefundStatusPanel` after `BookingsCheckoutSessionCancellationPolicyView` when `showRefundStub` is true.
- `bookings-booking-tourist-actions.jsx`: props `{ booking }`; cancel button disabled with Coming soon badge; review button per `reviewStubState`; owns modal `useState` (S6).
- `bookings-booking-cancel-confirm-modal.jsx`: `react-bootstrap` `Modal`; props include `show`, `onHide`; primary confirm **disabled** in #68; spec may pass `show={ true }` for interaction tests.
- `bookings-booking-refund-status-panel.jsx`: static heading + “Refund details will appear here”; no amounts or timelines.

### Checkout bundle extension

- `bookings-checkout-session-bundle-leg-extension.jsx`: `@phase 2` JSDoc; returns `null` in #68.
- Imported from `bookings-checkout-session-order-summary-view.jsx` after passengers block, before `CatalogListingPriceSummaryView`.

### Component contract (C2)

Each new domain component:

- JSDoc `@phase 2` with future API module hint.
- Stable exported props documented in file header.
- Matching `*.spec.jsx` asserting current inert behavior (fails if stub accidentally wired to HTTP).

### Files to create or modify (Web)

- `app/domains/catalog-listing/catalog-listing-constant.js` — **modify** (toolbar copy; `LISTING_FILTER_SEARCH_PARAMS`)
- `app/domains/catalog-listing/catalog-listing-service.js` — **modify** (`hasReviewData`, rating display helpers)
- `app/domains/catalog-listing/catalog-listing-service.spec.js` — **modify** (rating matrix)
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx` — **create**
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.spec.jsx` — **create**
- `app/domains/catalog-listing/catalog-listing-rating-reviews-empty-state.jsx` — **create**
- `app/domains/catalog-listing/catalog-listing-list-view.jsx` — **modify**
- `app/domains/catalog-listing/catalog-listing-hero-view.jsx` — **modify**
- `app/domains/catalog-listing/catalog-listing-hero-view.spec.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-service.js` — **modify** (eligibility helpers)
- `app/domains/bookings-booking/bookings-booking-service.spec.js` — **modify** (6×3 matrix)
- `app/domains/bookings-booking/bookings-booking-tourist-actions.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-tourist-actions.spec.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-cancel-confirm-modal.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-cancel-confirm-modal.spec.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-refund-status-panel.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-refund-status-panel.spec.jsx` — **create**
- `app/domains/bookings-booking/bookings-booking-tourist-detail-view.jsx` — **modify**
- `app/domains/bookings-checkout-session/bookings-checkout-session-bundle-leg-extension.jsx` — **create**
- `app/domains/bookings-checkout-session/bookings-checkout-session-bundle-leg-extension.spec.jsx` — **create**
- `app/domains/bookings-checkout-session/bookings-checkout-session-order-summary-view.jsx` — **modify**
- `app/domains/bookings-checkout-session/bookings-checkout-session-order-summary-view.spec.jsx` — **create**
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx` — **modify**
- `app/routes/tourist/booking-detail-page.spec.jsx` — **modify**
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.spec.js` — **modify**
- `app/domains/catalog-listing/catalog-listing-list-view.spec.jsx` — **modify**

## Data / domain touchpoints

- Bounded contexts: **CAT** (discover toolbar, rating display), **BKG** (booking actions, refund panel), **PAY** (checkout bundle seam).
- No snapshot mutation; display-only listing ratings (`rating_average`, `reviews_count` from API).
- Bundle: [BKG-3] two linked bookings — visible UI deferred; slot only in #68.

## Test plan

**Approach (E2):** `createRoot` + `act` + jsdom for modal and sort URL changes; `renderToStaticMarkup` for static DOM and service-driven gates. Do not add `@testing-library/*` in #68.

- [ ] Toolbar: disabled; helper text in DOM + `aria-describedby`; not submittable.
- [ ] Sort: `createRoot`/`act` — URL updates; end-aligned in shared row on `md+`; #67 regression (pagination, canonical).
- [ ] Clear filters: when filter params present, link removes keys; `TouristEmptyState` variant returns to generic when appropriate.
- [ ] Rating: service matrix (`0/0`, `0+avg`, `n+null`, `n+avg`); list compact vs hero component.
- [ ] Booking: service matrix 6 statuses × cancel visibility, review enabled/disabled, refund visibility.
- [ ] Cancel: production UI — cancel disabled, modal not opened by user; modal spec opens via test `show` prop.
- [ ] Refund: only cancelled/refunded; no cancellation tier amounts in refund panel.
- [ ] Checkout: summary test imports bundle extension; extension renders no visible nodes.
- [ ] a11y: disabled actions not focusable or `aria-disabled`; helpers not `title`-only.
- [ ] `npm run lint` + targeted vitest.

```bash
cd red-cab-web && npm run test -- \
  marketplace-catalog-listing-list-page \
  catalog-listing-discover-toolbar \
  catalog-listing-list-view \
  catalog-listing-hero-view \
  catalog-listing-service \
  bookings-booking-service \
  bookings-booking-tourist-actions \
  bookings-booking-cancel-confirm-modal \
  bookings-booking-refund-status-panel \
  booking-detail-page \
  bookings-checkout-session-order-summary-view \
  bookings-checkout-session-bundle-leg-extension
cd red-cab-web && npm run lint
```

## Out of scope

- Phase 2 `app/api/**` and live flows; inventing server eligibility field names.
- Client time-based cancel eligibility, refund %, review 14-day window.
- Loader filter forwarding; `red-cab-api` changes in #68.
- Provider/team surfaces; legacy `/account/discover/**`.
- Re-opening web-67 sort semantics.
- `@testing-library/react` adoption (separate tooling issue).

## Acceptance criteria

- [ ] Milestone D slots on correct routes per visibility table
- [ ] Human verification Q0–Q7 + Sonnet addendum reflected in design decisions
- [ ] No client price or refund calculation (PRC-1)
- [ ] Eligibility in `BookingsBookingService` + tests; rating in `CatalogListingService` + tests
- [ ] Capability-named components with inert-state tests; detail view remains presentational (S6)
- [ ] Accessibility: visible helper text on discover stubs; disabled booking actions not misleading
- [ ] PR links `red-cab-web#68`, `#55`, this spec; PR copy: stubs inactive (PKM phase-scaffold); **no** real cancel/review/refund/bundle HTTP before G3/G4
- [ ] Tests per test plan (E2)

## Human verification (2026-10-02)

Original MCQs plus Sonnet addendum. PKM record: `PersonalKnowledgeManagement/inbox/2026-10-02-issue-68-plan.md`.

| Q | Original | Amended resolution |
| --- | --- | --- |
| Q0 | C — implementation spec | Path: `platform/web-68-tourist-phase-2-placeholder-slots.md` |
| Q1 | A — toolbar + sort siblings | One responsive row (D2) |
| Q2 | C — mixed labeling | Visible helpers on discover (`aria-describedby`) |
| Q3 | B — always render review | Enable for `completed`, `payout_queued`, `refunded` |
| Q4 | A — cancel confirmed only | Disabled + Coming soon; modal not user-reachable |
| Q5 | B — empty when no REV data | `hasReviewData`; compact card + hero split |
| Q6 | B — bordered bundle | Mount extension; `null` UI |
| Q7 | A — always refund panel | Status-gated: `cancelled` / `refunded` only |

| Addendum item | Accepted |
| --- | --- |
| A3 risk-tiered visibility | Yes |
| B1 + B3 eligibility | Yes |
| C2 capability-named components | Yes |
| D2 discover row + Clear link | Yes |
| E2 tests | Yes |

**Author approval:** 2026-10-02.

## Spec review: web-68-tourist-phase-2-placeholder-slots.md

**Status recommendation:** approved — must-fix items from initial Sonnet pass addressed in plan addendum and this revision (2026-10-02).

### Must-fix

- None remaining at approval.

### Should-fix

- None blocking codegen.

### Questions for author

- None.
