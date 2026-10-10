---
title: "Tourist submit review + booking show eligibility (W1-1)"
sidebar_label: API · REV tourist submit
issue: "https://github.com/markmamba/red-cab-api/issues/157"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-154-reviews-schema-migrate.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships **tourist** `POST` submit for one review per **completed** booking (`INV-5`, `BKG-7`, `FR-REV-001`..`004`).
- Ships **server-driven `review_eligibility`** on tourist booking order **show** for web W1-5 / `#68`.
- Ships **composite FK** from `reviews_reviews` to `bookings_orders (id, tourist_id, listing_id, provider_id)` per api-154 deferral.
- Publishes **`ReviewSubmitted`** with **no** `Publisher::HANDLERS` entry (W7).
- **Publishes** the review on submit (`approved`, `approved_at`) and calls rating recalc (api-158).
- Does **not** ship provider report, Team dispute actions, provider response, notifications, or tourist UI.

## Problem

Phase 2 execution map W1-1 needs the first REV HTTP action. Schema exists from api-154 but there are no `Reviews::` models, routes, or eligibility fields on tourist booking show. Web `#68` must not compute the 14-day review window on the client.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| api-154 | [api-154-reviews-schema-migrate.md](./api-154-reviews-schema-migrate.md) | Table columns, moderation default, composite FK deferral |
| FR-REV-001..004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Eligibility, window, content, publication on submit |
| ADR-020 | [adr-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Post-publication moderation strategy |
| INV-5, BKG-7, OPR-6, OPR-7 | [invariants](/docs/70-79-business/business-rules/invariants) | One review per booking; completion gate; window |
| web-68 | [web-68-tourist-phase-2-placeholder-slots.md](../platform/web-68-tourist-phase-2-placeholder-slots.md) | Eligibility must be API-driven when REV ships |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Max 5 photos** per review | Defer photos; unlimited | Brief Gate 1 Q1=B; mirror catalog upload contract |
| 2 | **Eligibility on order show** same PR | Separate issue | Brief Gate 1 Q2=A; W1-5 coupling |
| 3 | **`ReviewSubmitted` on create** | Omit until W7 | Brief Gate 1 Q3=A; no handler yet |
| 4 | **Composite FK in #157** | Hygiene follow-up | Brief Gate 1 Q4=B |
| 5 | **Submit gate: post-completion statuses** | `status: completed` enum only | BKG moves to `payout_queued` after complete; require `completed_at` and status in `completed`, `payout_queued`, `refunded` (`FR-REV-001`) |
| 6 | **Window end** `completed_at + 14.days` | Listing TZ | OPR-7; UTC wall-clock from stored `completed_at` |
| 7 | **Photo payload** `storage_key`, `content_type`, `byte_size`, optional `display_order` | ActiveStorage in API | Same as `catalog_listing_photos` |
| 8 | **Duplicate** app check + unique `booking_id` | DB only | Domain error before insert; `RecordNotUnique` on `booking_id` → conflict |
| 9 | **`storage_key` prefix** `reviews/{tourist_uuid}/` | Any object key | Stops tourists from attaching another actor's upload keys |
| 10 | **Review text max length** 5,000 characters | Unlimited text column | Stops abuse; optional `body` |
| 11 | **One eligibility module** for show and submit | Split policy classes | Same `now` and rules for `review_eligibility` and POST validation |
| 12 | **Publish on submit** | `pending_moderation` default | [ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation); set `moderation_status` `approved`, `approved_at` = submit time |
| 13 | **Recalc after submit** | Defer to Team approve | `RecalculateManager` + `RatingRecalculated` in same transaction boundary as api-158 |

## API contract

### Submit review

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/tourists/bookings/orders/:booking_id/reviews` | JWT tourist | `booking_id` is order UUID |

**Request body (JSON)**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `rating` | integer | yes | 1–5 |
| `body` | string | no | Trimmed; may be empty; max **5,000** characters |
| `photos` | array | no | Max **5** items |
| `photos[].storage_key` | string | per photo | Required when photo present; must start with `reviews/{tourist_uuid}/` |
| `photos[].content_type` | string | per photo | JPEG, PNG, WebP |
| `photos[].byte_size` | integer | per photo | Positive; max 5 MB each |
| `photos[].display_order` | integer | no | Unique per review. If any photo omits it, the API assigns `0..n-1` in request order |

**Response `201`**

`Reviews::TouristsReviewDetailSerializer` — `uuid`, `rating`, `body`, `moderation_status` (`approved`), `submitted_at`, `approved_at`, `booking_completed_at`, `review_window_ends_at`, `photos[]` (`uuid`, `storage_key`, `content_type`, `byte_size`, `display_order`).

**Errors**

| Condition | HTTP | Notes |
| --- | --- | --- |
| Not owner / unknown booking | 404 | Same as order show |
| Not `completed` | 422 | `status` field message |
| Outside 14-day window | 422 | `base` message |
| Review already exists | 409 | `booking_id` / `base` |
| Validation (rating, photos) | 422 | `ValidationError` shape |

### Order show eligibility embed

`GET /tourists/bookings/orders/:booking_id` adds top-level **`review_eligibility`**:

| Field | Type | Notes |
| --- | --- | --- |
| `can_submit` | boolean | `true` only when completed, in window, no review row |
| `window_ends_at` | ISO8601 or null | `completed_at + 14 days` when `completed_at` present; else null |
| `existing_review` | object or null | When a row exists: `uuid`, `rating`, `moderation_status`, `submitted_at`, `approved_at` when published |

## Data / domain touchpoints

- Bounded context: **REV** (write), **BKG** (read order at submit + show preload).
- Transaction: create `reviews_reviews` + `reviews_review_photos` in one transaction.
- Copy at submit: `listing_id`, `tourist_id`, `provider_id`, `booking_completed_at`, `review_window_ends_at` from order.
- After commit: `Reviews::RatingSummaries::RecalculateManager.execute(listing_id:)` then `RatingRecalculated` (api-158).
- Event: `Reviews::Events::ReviewSubmitted.publish(review:)` after successful transaction.
- Submit uses one `Time.current` for validation and `submitted_at` so the 14-day window check cannot drift between validator and insert.
- `Reviews::SubmitEligibility` is the single source for POST validation and order-show `can_submit`.

### Composite FK migration

1. Add unique index on `bookings_orders (id, tourist_id, listing_id, provider_id)` — name ≤ 63 chars.
2. Replace FK `reviews_reviews.booking_id → bookings_orders.id` with composite FK on `(booking_id, tourist_id, listing_id, provider_id)`.

Update `docs/db/reviews.dbml` and `docs/db/redcab.dbml` Ref blocks.

## Files to create or modify (API)

- `db/migrate/*_add_bookings_orders_review_composite_key.rb`
- `app/domains/reviews/review.rb`, `review_photo.rb`, `review_eligibility.rb`, `submit_eligibility.rb`
- `app/domains/reviews/reviews/tourists_submit_{request,validator,manager}.rb`
- `app/domains/reviews/tourists_review_detail_serializer.rb`, `tourists_review_photo_embedded_serializer.rb`
- `app/domains/reviews/events/review_submitted.rb`
- `app/controllers/tourists/bookings/orders/reviews_controller.rb`
- `config/routes/tourists_routes.rb`
- `app/domains/bookings/order.rb` — `has_one :review`
- `app/domains/bookings/orders/tourists_show_manager.rb`, `tourists_booking_detail_serializer.rb`
- Tests under `test/domains/reviews/**`, `test/integration/tourists/bookings/orders/reviews_*`

## Out of scope

- Provider report, Team dispute actions, provider response (W1-3+).
- Notification handlers for `ReviewSubmitted` (W7).
- Tourist submit UI (web `#68` / W1-5).
- Tourist edit after submit.

## Tasks

### Docs

- [x] This spec (`status: approved`)

### API

- [ ] Composite FK migration + DBML
- [ ] Models + submit stack + event
- [ ] Order show eligibility
- [ ] Tests + verification

## Acceptance criteria

- [ ] Tourist can submit one review for own completed booking inside 14-day window
- [ ] Duplicate submit returns conflict; non-owner returns 404
- [ ] Review row is `approved` with `approved_at` and copied completion fields
- [ ] Listing `rating_average` / `reviews_count` update after submit (api-158 path)
- [ ] Optional photos persist with display order
- [ ] Order show returns `review_eligibility` per contract
- [ ] `ReviewSubmitted` published; no new `HANDLERS` entry
- [ ] Fresh `db:drop db:create db:migrate` succeeds

## Verification

```bash
bin/rails db:drop db:create db:migrate
bin/rails test test/domains/reviews test/integration/tourists/bookings/orders
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-07 | Build (/pkm-build) | brief-aligned | Approved for W1-1 implementation |
| 2026-10-10 | Build (/pkm-build #121) | `review-implementation-spec` | Re-approved after ADR-020 publish-on-submit amend |
