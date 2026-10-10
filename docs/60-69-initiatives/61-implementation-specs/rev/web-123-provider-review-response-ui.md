---
title: "Provider review response UI (W1-7)"
sidebar_label: Web · REV provider response
issue: "https://github.com/markmamba/red-cab-web/issues/123"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-160-provider-review-response-endpoints.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-186-provider-booking-review-embed.md"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- Ships provider **public response** on `/providers/bookings/:bookingId` when show includes `review_id`.
- Uses api-160 `GET` and `POST` on `/providers/reviews/:review_id/provider_response`.
- Page owns POST submit; domain form uses RHF + zod; `revalidator.revalidate()` after success.
- `GET` show `404` means empty form. Duplicate create uses api-160 `422` (not tourist `409`).
- Does not ship provider report UI (api-161) or tourist review excerpt.

## Problem

api-160 exposes provider response HTTP. Providers need self-service UI to post one response per published review. Web must discover `review_id` from provider booking show (api-186 embed).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-006 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | One public response per review |
| api-160 | [api-160-provider-review-response-endpoints.md](./api-160-provider-review-response-endpoints.md) | HTTP contract |
| api-186 | [api-186-provider-booking-review-embed.md](./api-186-provider-booking-review-embed.md) | `review_id` on booking show |
| web-121 | [web-121-tourist-review-submit-ui.md](./web-121-tourist-review-submit-ui.md) | Page-owned POST pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Domain folder `reviews-provider-response` | Extend `reviews-review` | Brief; separate tourist surface |
| 2 | Embed on provider booking detail | Dedicated review route | Brief Gate 1 Q2=B |
| 3 | No tourist review excerpt | Block on read API | Brief Gate 1 Q1=A |
| 4 | Loader optional GET when `review_id` set | POST-only | Pre-fill existing response |
| 5 | Duplicate `422` → form field errors | `409` toast | api-160 matrix |

## Web contract

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Provider booking detail | `/providers/bookings/:bookingId` | `clientLoader` | `providers-bookings-booking-api.js` (existing), `providers-reviews-provider-response-api.js` (new) | Response section when `review_id` present |

### HTTP used

| Method | Path | When |
| --- | --- | --- |
| GET | `/providers/bookings/orders/:booking_id` | Loader (includes `review_id` when embed live) |
| GET | `/providers/reviews/:review_id/provider_response` | Loader when `review_id` present; tolerate `404` |
| POST | `/providers/reviews/:review_id/provider_response` | Form submit |

### Files to create or modify (Web)

- `app/api/providers-reviews-provider-response-api.js`
- `app/api/providers-reviews-provider-response-api.spec.js`
- `app/domains/reviews-provider-response/reviews-provider-response-schema.js`
- `app/domains/reviews-provider-response/reviews-provider-response-service.js`
- `app/domains/reviews-provider-response/reviews-provider-response-form.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-summary.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-schema.spec.js`
- `app/domains/bookings-booking/bookings-booking-provider-detail-view.jsx`
- `app/domains/bookings-booking/bookings-booking-service.js`
- `app/routes/provider/provider-bookings-detail-page.jsx`
- `app/routes/provider/provider-bookings-detail-page.spec.jsx`

## Out of scope

- Provider report UI (api-161).
- Provider reviews inbox.
- Tourist review text or rating on this page.
- Edit response after submit.

## Acceptance criteria

- [ ] When `review_id` is present and no response exists, provider sees empty response form.
- [ ] Successful POST shows stored body and hides duplicate submit affordance.
- [ ] `GET` `404` does not fail the page loader.
- [ ] `422` maps to form fields; client POST sends only `body`.
- [ ] PR states api-160 and api-186 verified in staging before merge.

## Verification

```bash
npm run test -- app/api/providers-reviews-provider-response-api.spec.js app/domains/reviews-provider-response app/routes/provider/provider-bookings-detail-page.spec.jsx
npm run lint
```
