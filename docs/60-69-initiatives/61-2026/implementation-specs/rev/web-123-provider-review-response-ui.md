title: "Provider review response UI (W1-7)"
sidebar_label: Web · REV provider response
issue: "https://github.com/markmamba/red-cab-web/issues/123"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/rev/api-160-provider-review-response-endpoints.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/rev/api-186-provider-booking-review-embed.md"
epic: "https://github.com/markmamba/red-cab-web/issues/120"

## TL;DR

- Ships provider **public response** UI on `/providers/bookings/:bookingId` when booking show includes `review_id`.
- Loader reads provider booking show (api-186 embed) and `GET` provider response (api-160) when `review_id` is present.
- Page owns POST create; domain folder `reviews-provider-response` owns form, summary, and payload helpers.
- One response per review; after submit, show read-only summary (no edit).
- **Co-ship:** deploy api-186 (and api-160) before web merge so `review_id` resolves in staging.

## Problem

api-160 exposes provider response HTTP. Providers need a booking-detail surface to post a single public response after a tourist review is live. Listing detail (web #134) is for monitoring aggregates, not responding on a booking.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| api-160 | [api-160-provider-review-response-endpoints.md](./api-160-provider-review-response-endpoints.md) | POST and GET by `review_id` |
| api-186 | [api-186-provider-booking-review-embed.md](./api-186-provider-booking-review-embed.md) | `review_id` on provider booking show |
| FR-REV-006 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | One public response per published review |
| frontend.md | [frontend conventions](/docs/50-59-frontend/conventions/frontend) | Provider portal loader pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Embed on provider booking detail | Standalone review page | Brief W1-7; pairs with tourist submit on booking |
| 2 | Domain folder `reviews-provider-response` | Inline in bookings | Parallel to `reviews-review` tourist domain |
| 3 | Section hidden without `review_id` | Always show empty form | No review or not approved → no UUID |
| 4 | Loader 404 on missing response → `null` | Fail page | First visit before create |
| 5 | Body only in UI | Rating or photos | api-160 body field only |
| 6 | 422 maps to form fields | Toast only | Match tourist submit pattern |

## Web contract

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Booking detail | `/providers/bookings/:bookingId` | `clientLoader` | `providers-bookings-booking-api.js`, `providers-reviews-provider-response-api.js` | `noindex` |

### HTTP used

| Method | Path | When |
| --- | --- | --- |
| GET | `/providers/bookings/orders/:booking_id` | Loader (includes `review_id` when approved) |
| GET | `/providers/reviews/:review_id/provider_response` | Loader when `review_id` present |
| POST | `/providers/reviews/:review_id/provider_response` | Form submit |

### Files to create or modify (Web)

- `app/api/providers-reviews-provider-response-api.js`
- `app/domains/reviews-provider-response/reviews-provider-response-schema.js`
- `app/domains/reviews-provider-response/reviews-provider-response-service.js`
- `app/domains/reviews-provider-response/reviews-provider-response-form.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-summary.jsx`
- `app/domains/bookings-booking/bookings-booking-provider-detail-view.jsx`
- `app/routes/provider/provider-bookings-detail-page.jsx`
- Matching `*.spec.js` / `*.spec.jsx` under the above paths

## Out of scope

- Provider report review UI (separate issue).
- Team moderation pages (web #122).
- Listing-level reviews read UI (web #134).
- Edit or delete after response is published.

## Acceptance criteria

- [ ] When `review_id` is present and no response exists, provider sees form and can submit body.
- [ ] After successful POST, page revalidates and shows summary; success toast uses live copy.
- [ ] When response exists, form is hidden and summary is shown.
- [ ] When `review_id` is absent, response section is not rendered.
- [ ] 422 maps to form fields; other errors use toast defaults.

## Verification

```bash
npm run test -- app/domains/reviews-provider-response app/routes/provider/provider-bookings-detail-page.spec.jsx
npm run lint
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-10 | Build (W1-7) | brief-aligned | Approved for codegen |
