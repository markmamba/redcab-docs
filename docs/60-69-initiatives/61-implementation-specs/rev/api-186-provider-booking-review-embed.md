---
title: "Provider booking show review_id embed (W1-7 prereq)"
sidebar_label: API · REV provider booking embed
issue: "https://github.com/markmamba/red-cab-api/issues/186"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-157-tourist-submit-review.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-160-provider-review-response-endpoints.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Adds optional `review_id` to provider booking **detail** show JSON.
- Value is the published review UUID when `moderation_status` is `approved`.
- Field is absent or `null` when there is no review or the review is not approved.
- No new routes. No tourist review text on this payload.

## Problem

Web #123 embeds provider response UI on booking detail. api-160 needs `review_id` in the path. Provider order show does not expose how to resolve that UUID today.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-006 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Response applies to published reviews |
| api-160 | [api-160-provider-review-response-endpoints.md](./api-160-provider-review-response-endpoints.md) | Consumer of `review_id` |
| web-123 | [web-123-provider-review-response-ui.md](./web-123-provider-review-response-ui.md) | UI embed |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Embed on existing provider order show | New `GET /providers/reviews/:id` read | Brief Gate 1 Q2=B |
| 2 | Only `review_id` UUID | Full review excerpt | Brief Gate 1 Q1=A; no provider review read API |
| 3 | Approved reviews only | Include pending | api-160 create requires approved review |
| 4 | Detail serializer only | List index embed | Response UI uses detail page only |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/providers/bookings/orders/:booking_id` | Provider session | Existing show; new field below |

### Show response (additive)

| Field | Type | When present |
| --- | --- | --- |
| `review_id` | string (UUID) | Booking has a review with `moderation_status` = `approved` |

Otherwise `review_id` is JSON `null`.

### Files to create or modify (API)

- `app/domains/bookings/orders/providers_show_manager.rb` — preload `:review`
- `app/domains/bookings/providers_booking_detail_serializer.rb` — `review_id` attribute
- `test/integration/providers/bookings/orders_show_integration_test.rb` — approved / pending / absent cases

## Out of scope

- Tourist review body or rating on provider booking show.
- Provider review list or inbox.
- Marketplace listing embed.

## Acceptance criteria

- [ ] Approved review on booking → show includes `review_id` matching review UUID.
- [ ] No review → `review_id` is `null`.
- [ ] Pending or removed review → `review_id` is `null`.
- [ ] Existing show fields unchanged for bookings without reviews.

## Verification

```bash
# from red-cab-api/
bin/rails test test/integration/providers/bookings/orders_show_integration_test.rb
bundle exec srb tc
bundle exec rubocop
```
