---
title: "Tourist review submit UI (W1-5)"
sidebar_label: Web · REV tourist submit
issue: "https://github.com/markmamba/red-cab-web/issues/121"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-157-tourist-submit-review.md"
  - "docs/60-69-initiatives/61-implementation-specs/platform/web-68-tourist-phase-2-placeholder-slots.md"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- Ships tourist **Write a review** on `/account/bookings/:bookingId` with server-driven `review_eligibility`.
- Page owns POST submit; `BookingsBookingTouristActions` owns modal state (web-68 S6).
- After submit, shows inline summary from `existing_review` with **live on listing** copy.
- Ships **rating** and optional **body** in UI. Photo picker is **deferred** until a tourist direct-upload contract exists.
- Does not ship cancel/refund live HTTP, provider report UI, or Team moderation UI.

## Problem

Web #68 left an inert review stub. api-157 publishes reviews on submit and exposes `review_eligibility` on tourist order show. Tourists need a real submit flow without client-side review-window math.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| api-157 | [api-157-tourist-submit-review.md](./api-157-tourist-submit-review.md) | POST contract and eligibility embed |
| ADR-020 | [adr-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Live-on-listing copy |
| web-68 | [web-68-tourist-phase-2-placeholder-slots.md](../platform/web-68-tourist-phase-2-placeholder-slots.md) | Actions slot and modal ownership |
| FR-REV-001..004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Eligibility and publication |
| frontend.md | [frontend conventions](/docs/50-59-frontend/conventions/frontend) | Domain layout |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Domain folder `app/domains/reviews-review/` | Inline in bookings | Brief Gate 1 Q3=A; domain-to-code mapping |
| 2 | `review_eligibility` only for gating | Status-only fallback | api-157 B3; keep status fallback when embed missing (tests) |
| 3 | Page POST + `revalidator.revalidate()` | Submit inside modal only | account-home pattern |
| 4 | Photos deferred in UI | Block #121 on upload | No tourist upload client exists; api-157 accepts photos when keys exist |
| 5 | Five discrete stars | Half stars | Brief assumption |
| 6 | 409 duplicate → toast | Inline field error | Conflict is not field-level |

### Photo `storage_key` contract (deferred)

- **#121 UI:** omit photo picker; POST sends `photos: []`.
- **Follow-on:** tourist direct-upload spec (prefix `reviews/{tourist_uuid}/` per api-157 decision 9) will supply keys to `ReviewsReviewService.buildSubmitPayload`.
- **Payload builder** must still enforce max five photos for unit tests.

## Web contract

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Booking detail | `/account/bookings/:bookingId` | `clientLoader` | `tourists-bookings-booking-api.js` (existing), `tourists-bookings-orders-reviews-api.js` (new) | Submit on page |

### HTTP used

| Method | Path | When |
| --- | --- | --- |
| GET | `/tourists/bookings/orders/:booking_id` | Loader (includes `review_eligibility`) |
| POST | `/tourists/bookings/orders/:booking_id/reviews` | Modal submit |

### Files to create or modify (Web)

- `app/api/tourists-bookings-orders-reviews-api.js`
- `app/domains/reviews-review/reviews-review-schema.js`
- `app/domains/reviews-review/reviews-review-service.js`
- `app/domains/reviews-review/reviews-review-submit-modal.jsx`
- `app/domains/reviews-review/reviews-review-summary.jsx`
- `app/domains/reviews-review/reviews-review-service.spec.js`
- `app/domains/bookings-booking/bookings-booking-service.js`
- `app/domains/bookings-booking/bookings-booking-tourist-actions.jsx`
- `app/domains/bookings-booking/bookings-booking-tourist-detail-view.jsx`
- `app/domains/bookings-booking/bookings-booking-tourist-actions.spec.jsx`
- `app/routes/tourist/booking-detail-page.jsx`
- `app/routes/tourist/booking-detail-page.spec.jsx`

## Out of scope

- Provider report and Team dispute pages.
- Tourist edit/delete after submit.
- Photo upload UI until direct-upload spec ships.

## Acceptance criteria

- [ ] Eligible tourist opens modal, submits rating and optional body, sees success toast, and inline live summary.
- [ ] `Write a review` hidden when `existing_review` is present.
- [ ] Client does not compute 14-day window; uses `review_eligibility.can_submit` when present.
- [ ] Cancel and refund stubs unchanged.
- [ ] 422 maps to form fields; 409 shows conflict toast.

## Verification

```bash
npm run test -- app/domains/reviews-review app/domains/bookings-booking/bookings-booking-tourist-actions.spec.jsx app/routes/tourist/booking-detail-page.spec.jsx
npm run lint
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-10 | Build (/pkm-build #121) | brief-aligned | Approved for codegen |
