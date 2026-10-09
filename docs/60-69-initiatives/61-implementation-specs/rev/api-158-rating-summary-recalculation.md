---
title: "Rating summary recalculation + catalog display sync (W1-2)"
sidebar_label: API · REV rating recalc
issue: "https://github.com/markmamba/red-cab-api/issues/158"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-154-reviews-schema-migrate.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-157-tourist-submit-review.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships REV rating summary recalculation from approved reviews only.
- Ships `RatingRecalculated` event and catalog display copy update.
- Uses full re-aggregate per listing on each recalculation.
- Does not ship team moderation HTTP actions.

## Problem

`reviews_rating_summaries` exists from api-154, but no code updates it.
`catalog_listings.rating_average` and `catalog_listings.reviews_count` are display columns.
They must mirror REV authoritative values so marketplace sorting and cards stay correct.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| OPR-6 | `docs/70-79-business/71-business-rules/invariants.md` | Approved reviews only are public score |
| FR-REV-007 | `docs/70-79-business/72-requirements/functional-requirements/rev.md` | Listing score behavior |
| FR-CAT-027 | `docs/70-79-business/72-requirements/functional-requirements/cat.md` | Marketplace sorting uses listing rating columns |
| api-154 D15 | `api-154-reviews-schema-migrate.md` | Full re-aggregate and lazy summary row |
| api-157 | `api-157-tourist-submit-review.md` | Submit pending does not change public score |

## Design decisions

| # | Decision | Choice |
| --- | --- | --- |
| 1 | Scope | Recalculation machinery only, no moderation endpoints |
| 2 | Trigger source in #158 | Recalculate manager callable by moderation managers in W1-3 |
| 3 | Aggregate rule | `reviews_count = COUNT(*)` and `rating_average = AVG(rating)` over approved rows |
| 4 | Zero approved rows | `reviews_count = 0` and `rating_average = NULL` |
| 5 | Summary row lifecycle | Lazy upsert per listing |
| 6 | Catalog write path | `RatingRecalculated` event handled by catalog manager |
| 7 | Execution mode | Synchronous call path from moderation managers |

## API contract

No HTTP contract in this issue.
This issue ships domain managers and events only.

## Data and domain touchpoints

- REV writes `reviews_rating_summaries`.
- REV publishes `RatingRecalculated` with:
  - `listing_id`
  - `rating_average`
  - `reviews_count`
  - `recalculated_at`
- Catalog updates `catalog_listings.rating_average` and `catalog_listings.reviews_count`.

## Files

- `app/domains/reviews/rating_summary.rb`
- `app/domains/reviews/rating_summaries/recalculate_manager.rb`
- `app/domains/reviews/events/rating_recalculated.rb`
- `app/domains/catalog/listings/apply_rating_recalculated_manager.rb`
- `app/domains/shared/domain_events/publisher.rb`
- `test/domains/reviews/rating_summaries/recalculate_manager_test.rb`
- `test/domains/catalog/listings/apply_rating_recalculated_manager_test.rb`

## Out of scope

- Team moderation endpoints and managers.
- Provider response and notifications.
- Async job wrapper for recalculation.
- Backfill scripts.

## Acceptance criteria

- Recalculation uses approved reviews only.
- Recalculation writes or updates one `reviews_rating_summaries` row per listing.
- Recalculation publishes `RatingRecalculated`.
- Catalog listing display columns match recalculated values.
- Zero approved reviews produce `NULL` average and count `0`.

## Verification

```bash
bin/rails test test/domains/reviews/rating_summaries/recalculate_manager_test.rb
bin/rails test test/domains/catalog/listings/apply_rating_recalculated_manager_test.rb
bundle exec srb tc
bundle exec rubocop
```
