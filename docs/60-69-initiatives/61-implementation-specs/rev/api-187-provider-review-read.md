---
title: "Provider review show (W1 REV read)"
sidebar_label: API · REV provider review show
issue: "https://github.com/markmamba/red-cab-api/issues/187"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-154-reviews-schema-migrate.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-160-provider-review-response-endpoints.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-190-provider-catalog-listing-reviews-index.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships `GET /providers/reviews/:review_id` for approved providers with an approved profile.
- Returns **published** review text and rating for reviews on the provider's listings.
- Cross-provider or unknown UUID → **`404`** (same as unpublished for that provider).
- Response includes **photos** when present; provider response stays on api-160 `GET .../provider_response`.

## Problem

Booking show (api-186) embeds `review_id` only. Web #123 needs review `body` and `rating` on provider cards without a team or tourist session. No provider-scoped review read exists today.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Published review = approved on submit |
| api-160 | [api-160-provider-review-response-endpoints.md](./api-160-provider-review-response-endpoints.md) | Ownership `404`; approved profile gate |
| api-190 | [api-190-provider-catalog-listing-reviews-index.md](./api-190-provider-catalog-listing-reviews-index.md) | Published-only field baseline |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `GET /providers/reviews/:review_id` | Embed-only on booking | Brief; mirrors team review show placement |
| 2 | Unpublished → `404` | `422` illegal read | Brief Gate 1 Q1=A |
| 3 | `require_approved_provider_profile!` | Session only | Brief Gate 1 Q2=A; api-160 show |
| 4 | api-190 fields + `photos` embed | api-190 only | Brief Gate 1 Q3=B |
| 5 | No nested `provider_response` | Combined payload | Brief Gate 1 Q4=A; api-160 owns response read |
| 6 | Cross-provider → `404` | `403` | api-160 decision #4 |
| 7 | Show serializer separate from index | Add photos to index serializer | Avoid N+1 on listing index |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/providers/reviews/:review_id` | Provider session + approved profile | Single review |

### Show response `200`

`Reviews::ProvidersPublishedReviewDetailSerializer`

| Field | Type | Notes |
| --- | --- | --- |
| `uuid` | string | Review UUID |
| `rating` | integer | 1–5 |
| `body` | string | Review text |
| `submitted_at` | string | ISO8601 |
| `photos` | array | Tourist photo embed shape when present; may be empty |

Each photo (same as tourist embed):

| Field | Type |
| --- | --- |
| `uuid` | string |
| `storage_key` | string |
| `content_type` | string |
| `byte_size` | integer |
| `display_order` | integer |

### Errors

| Condition | HTTP |
| --- | --- |
| No provider session | `401` |
| Provider profile not approved | `403` portal gate |
| Review UUID unknown for this provider | `404` |
| Review not `approved` (pending, removed, etc.) | `404` |

## Files to create or modify (API)

- `config/routes/providers_routes.rb`
- `app/controllers/providers/reviews/reviews_controller.rb`
- `app/domains/reviews/reviews/providers_show_{request,manager}.rb`
- `app/domains/reviews/providers_published_review_detail_serializer.rb`
- `docs/api/red-cab-api/providers/reviews/show-review.bru`
- `test/integration/providers/reviews/review_show_integration_test.rb`

## Out of scope

- `GET /providers/reviews` inbox list.
- Team moderation endpoints (api-159).
- Tourist or marketplace public read changes.
- Provider report write (api-161) behavior changes.

## Tasks

### API

- [ ] Add `GET ':review_id'` route under `namespace :reviews`
- [ ] Implement show Request → Manager stack with ownership and published gate
- [ ] Add detail serializer with photos
- [ ] Wire controller, Bruno, integration tests

### Docs

- [x] Set `status: approved`
- [ ] After merge, set `status: implemented`

## Acceptance criteria

- [ ] Approved provider reads an approved review on their listing → `200` with `rating`, `body`, and `photos`.
- [ ] Other provider or unknown UUID → `404`.
- [ ] Pending or removed review → `404`.
- [ ] No session → `401`; pending provider profile → `403`.
- [ ] Integration tests cover HTTP boundary.

## Verification

```bash
# from red-cab-api/
bin/rails test test/integration/providers/reviews/review_show_integration_test.rb
bundle exec srb tc
bundle exec rubocop
```

## Co-ship note

When `red-cab-web` #123 / #134 consume this endpoint, deploy **red-cab-api** before web (PKM co-ship rule).

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-11 | Brief Gate 1 | human MCQ | Q1–Q4 locked |
| 2026-10-11 | Build | /pkm-build #187 | approved for implementation |
