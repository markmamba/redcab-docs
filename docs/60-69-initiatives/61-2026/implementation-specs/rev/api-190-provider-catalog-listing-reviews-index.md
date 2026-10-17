---
title: "Provider catalog listing reviews index (W1 REV read)"
sidebar_label: API · REV listing reviews read
issue: "https://github.com/markmamba/red-cab-api/issues/190"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/rev/api-154-reviews-schema-migrate.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/rev/api-159-team-review-moderation-endpoints.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships `GET /providers/catalog/listings/:listing_id/reviews` for approved providers.
- Returns **published** reviews only (`moderation_status` = `approved`).
- Listing must belong to the signed-in provider; otherwise **`404`**.
- Paginated `reviews` collection; no write actions.

## Problem

Web #134 needs a provider listing detail surface with rating context and recent published review text. Listing show already exposes `rating_average` and `reviews_count`. No listing-scoped review list endpoint exists today.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Published review = approved |
| FR-REV-007 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Aggregates from published reviews only |
| api-154 | [api-154-reviews-schema-migrate.md](./api-154-reviews-schema-migrate.md) | `reviews_reviews` schema |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Nested under provider catalog listings | `GET /providers/reviews` inbox | Brief Gate 1 Q3=A |
| 2 | Published-only filter in manager | Client filter | FR-REV-004; provider must not see pending/removed |
| 3 | Cross-provider listing → `404` | `422` | `ProvidersShowManager` pattern |
| 4 | Default sort `submitted_at` desc | asc | Recent reviews first for detail UI |
| 5 | Serializer omits moderation and PII | Team serializer reuse | Provider read; no tourist name |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id/reviews` | Provider session + profile | Paginated index |

### Index response `200`

| Key | Type | Notes |
| --- | --- | --- |
| `reviews` | array | Published review rows |
| `meta` | object | Standard pagination (`page`, `last`, …) |

Each review:

| Field | Type | Notes |
| --- | --- | --- |
| `uuid` | string | Review UUID |
| `rating` | integer | 1–5 |
| `body` | string | Review text |
| `submitted_at` | string | ISO8601 |
| `is_flagged_by_provider` | boolean | `true` when provider reported via api-161; drives web #135 Reported state |

### Errors

| Condition | HTTP |
| --- | --- |
| No provider session | `401` |
| Provider portal gate | `403` |
| Listing UUID unknown for this provider | `404` |
| Invalid pagination params | `422` |

## Files to create or modify (API)

- `config/routes/providers_routes.rb`
- `app/controllers/providers/catalog/listing_reviews_controller.rb`
- `app/domains/reviews/reviews/providers_listing_index_{request,validator,manager}.rb`
- `app/domains/reviews/providers_published_review_serializer.rb`
- `docs/api/red-cab-api/providers/catalog/listings/list-listing-reviews.bru`
- `test/integration/providers/catalog/listing_reviews_integration_test.rb`

## Out of scope

- Marketplace public listing reviews route (may share manager later).
- Provider review response or report endpoints.
- Tourist identity on review rows.

## Acceptance criteria

- [ ] Approved published reviews appear for owned listing.
- [ ] Pending and removed reviews never appear.
- [ ] Another provider's listing UUID returns `404`.
- [ ] Integration tests cover happy path and isolation.

## Verification

```bash
bin/rails test test/integration/providers/catalog/listing_reviews_integration_test.rb
bundle exec rubocop
```
