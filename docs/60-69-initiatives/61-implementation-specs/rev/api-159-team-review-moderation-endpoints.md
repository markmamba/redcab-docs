---
title: "Team review moderation endpoints (W1-3)"
sidebar_label: API · REV team moderation
issue: "https://github.com/markmamba/red-cab-api/issues/159"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-154-reviews-schema-migrate.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-157-tourist-submit-review.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-158-rating-summary-recalculation.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships Team Admin **list**, **show**, **approve**, and **remove** for `reviews_reviews`.
- Default queue is **pending** reviews; sort **provider-flagged first**, then **oldest submitted**.
- **Approve** and **remove** always call synchronous `RecalculateManager` (idempotent when the approved set is unchanged) and publish `ReviewApproved` / `ReviewRemoved` (no NOT handlers).
- Does not ship tourist removal notifications, provider flag API, team UI, or moderation audit table.

## Problem

Tourist submit (api-157) creates `pending_moderation` rows only. Rating recalc (api-158) exists but no Team HTTP actions change moderation state or drive catalog `rating_*` display columns. Team Admin needs a moderation queue and lifecycle commands per `FR-REV-004` and `FR-REV-005`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | No public review until Admin approves |
| FR-REV-005 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Approve/remove, reason on remove, flagged priority |
| FR-REV-007 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Public score from approved reviews only |
| OPR-6 | [invariants](/docs/70-79-business/business-rules/invariants) | Pending until approved; score from approved set |
| REV context | [reviews.md](/docs/30-49-domains/bounded-contexts/reviews) | REV owns moderation and rating summary |
| api-design | [api-design.md](/docs/30-49-domains/system-design/api-design) | Team Admin consumes REV moderation |
| api-154 | [api-154-reviews-schema-migrate.md](./api-154-reviews-schema-migrate.md) | Lifecycle columns and DB CHECKs |
| api-157 | [api-157-tourist-submit-review.md](./api-157-tourist-submit-review.md) | Submit creates pending rows |
| api-158 | [api-158-rating-summary-recalculation.md](./api-158-rating-summary-recalculation.md) | Recalc after approved set changes |
| AMB-019 | [open-questions](/docs/70-79-business/planning/open-questions) | `pending_moderation` default (provisional) |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | No schema migration | New audit table | api-154 shipped moderation columns and CHECKs |
| 2 | Auth via `Team::AuthenticatedController` | Shared secret header | Matches other team surfaces; **remove** records `identities_admin.id`; **approve** clears `moderated_by_admin_id` (no approver PK until audit table) |
| 3 | Default index filter `pending_moderation` | Require client to pass status | Brief Gate 1 Q2=A; moderation queue UX |
| 4 | Fixed sort for **all** index filters: `is_flagged_by_provider DESC`, `submitted_at ASC` | Client `order_by`; newest first | `FR-REV-005` priority; Brief Gate 1 Q2=A; applies to every `moderation_status` value |
| 5 | Remove from `pending_moderation` or `approved` | Pending only | Brief Gate 1 Q3=A; approved rows affect public score |
| 6 | Approve only from `pending_moderation`; `422` if already `approved` | Idempotent `200` on re-approve | Brief Gate 1 Q4=A |
| 7 | Always call synchronous `RecalculateManager` after approve **and** remove | Skip recalc when removing pending only | Simpler call path; idempotent when approved set unchanged; api-158 decision 7 |
| 8 | Publish `ReviewApproved` / `ReviewRemoved` in W1-3 | Defer events to W7 | Brief Gate 1 Q1=A; mirror `ReviewSubmitted` |
| 9 | Unknown `listing_id` / `provider_id` filter → empty page | `404` on bad filter UUID | Same pattern as other team index filters |
| 10 | Index `order_by` query params ignored for queue | Honor client sort | Queue ordering is product-fixed per decision 4 |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/team/reviews` | Team admin session | Paginated index |
| GET | `/team/reviews/:review_id` | Team admin session | `review_id` is review UUID |
| POST | `/team/reviews/:review_id/approve` | Team admin session | Empty body |
| POST | `/team/reviews/:review_id/remove` | Team admin session | JSON body |

### Index query params

| Param | Type | Notes |
| --- | --- | --- |
| `moderation_status` | string | Optional. `pending_moderation`, `approved`, `removed`. Default `pending_moderation` when omitted. |
| `listing_id` | UUID | Optional. Resolves listing; no match → empty `reviews` array. |
| `provider_id` | UUID | Optional. Resolves provider profile; no match → empty `reviews` array. |
| `is_flagged_by_provider` | boolean | Optional. When present, filters exact flag value (`true` / `false`). |
| `page`, `page_size` | integer | Standard team pagination (`BaseIndexRequest`). |

Sort is always **flagged first**, then **submitted_at ascending**, for every `moderation_status` filter value. Client `order_by` / `order_dir` do not change result order (but invalid values still fail validation).

**Index errors**

| Condition | HTTP |
| --- | --- |
| Invalid `moderation_status` | `422` |
| Invalid `is_flagged_by_provider` (not `true` / `false`) | `422` |
| Invalid `order_by` or `order_dir` when present | `422` |
| No team session | `401` |

**Response `200`**

```json
{
  "reviews": [ /* TeamReviewBaseSerializer */ ],
  "meta": { /* pagination meta */ }
}
```

**Index item fields (`Reviews::TeamReviewBaseSerializer`)**

| Field | Notes |
| --- | --- |
| `uuid`, `rating`, `body`, `moderation_status` | Core review |
| `submitted_at`, `approved_at`, `removed_at`, `removal_reason` | Lifecycle |
| `is_flagged_by_provider`, `flagged_at` | Provider flag (read-only in W1-3) |
| `listing` | `{ "uuid": "<listing_uuid>" }` |
| `tourist` | `{ "uuid": "<tourist_profile_uuid>" }` |
| `provider` | `{ "uuid", "business_name" }` |

### Show response `200`

`Reviews::TeamReviewDetailSerializer` — base fields plus `booking_completed_at`, `review_window_ends_at`, `photos[]` (same embed shape as tourist submit: `uuid`, `storage_key`, `content_type`, `byte_size`, `display_order`).

**Errors:** `404` when review UUID unknown; `401` without team session.

### Approve

Empty body. On success:

- `moderation_status` = `approved`
- `approved_at` set to `Time.current`
- `removed_at`, `removal_reason`, `moderated_by_admin_id` cleared (`nil`; approver identity is not stored until `reviews_moderation_events` exists)

Then `RecalculateManager.execute(listing_id:)` and `ReviewApproved.publish(review:)`.

**Response `200`**

`Reviews::TeamReviewDetailSerializer` — same fields as show.

**Errors**

| Condition | HTTP |
| --- | --- |
| Unknown review | `404` |
| Not `pending_moderation` (includes already `approved` or `removed`) | `422` |
| No team session | `401` |

### Remove

**Request body**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `removal_reason` | string | yes | Trimmed; non-empty after trim; max **5,000** characters (same cap as review `body` in api-157) |

On success:

- `moderation_status` = `removed`
- `removed_at` set; `removal_reason` from body; `moderated_by_admin_id` = acting admin PK
- `approved_at` cleared (satisfies api-154 removed-state CHECK)

Then `RecalculateManager.execute(listing_id:)` and `ReviewRemoved.publish(review:)`.

**Response `200`**

`Reviews::TeamReviewDetailSerializer` — same fields as show.

**Errors**

| Condition | HTTP |
| --- | --- |
| Unknown review | `404` |
| Already `removed` | `422` |
| Missing, blank (after trim), or over-length `removal_reason` | `422` |
| No team session | `401` |

### Domain events (no handlers in W1-3)

| Event | When | Payload |
| --- | --- | --- |
| `ReviewApproved` | After approve transaction + recalc | `{ review: <Reviews::Review> }` |
| `ReviewRemoved` | After remove transaction + recalc | `{ review: <Reviews::Review> }` |

W7 NOT will add handlers; do not register `Publisher::HANDLERS` entries in this issue.

## Data / domain touchpoints

- Bounded context: **REV** writes `reviews_reviews` lifecycle fields per api-154 CHECKs.
- **REV** always calls `Reviews::RatingSummaries::RecalculateManager` after approve and after remove (including remove from `pending_moderation`; no-op on summary/catalog when the approved set is unchanged).
- **CAT** display columns update via existing `RatingRecalculated` handler from api-158 (integration tests assert `catalog_listings.rating_average` / `reviews_count`).
- Transaction boundary: review row update in one transaction; recalc and event publish **after** commit (same pattern as tourist submit + `ReviewSubmitted`).

## Files to create or modify (API)

- `config/routes/team_routes.rb`
- `app/controllers/team/reviews/reviews_controller.rb`
- `app/domains/reviews/reviews/team_index_{request,validator,manager}.rb`
- `app/domains/reviews/reviews/team_show_{request,manager}.rb`
- `app/domains/reviews/reviews/team_approve_{request,validator,manager}.rb`
- `app/domains/reviews/reviews/team_remove_{request,validator,manager}.rb`
- `app/domains/reviews/team_review_{base,detail}_serializer.rb`
- `app/domains/reviews/events/review_approved.rb`, `review_removed.rb`
- `docs/api/red-cab-api/team/reviews/**` (Bruno)
- `test/integration/team/reviews/moderation_integration_test.rb`
- `test/domains/reviews/reviews/team_{approve,remove}_validator_test.rb`

## Out of scope

- NOT handlers for tourist email on removal (`FR-REV-005` notify leg) — W7.
- Provider review response (W1-4).
- Team moderation UI (`red-cab-web` W1-6).
- Provider flag HTTP API (columns exist; no write endpoint in W1-3).
- `reviews_moderation_events` audit table (deferred in api-154).
- Async job wrapper for recalculation (api-158).

## Tasks

### API

- [ ] Wire explicit routes under `namespace :reviews` in `team_routes.rb`
- [ ] Implement `Team::Reviews::ReviewsController` (index, show, approve, remove)
- [ ] Implement index/show/approve/remove Request → Validator → Manager stack
- [ ] Implement team serializers (list + detail + photo embed)
- [ ] Publish `ReviewApproved` and `ReviewRemoved` after recalc
- [ ] Add Bruno requests under `docs/api/red-cab-api/team/reviews/`
- [ ] Add integration tests (session, queue sort, catalog `rating_*` on approve/remove)
- [ ] Add validator unit tests for illegal transitions

### Docs

- [x] Run `review-implementation-spec`; set `status: approved`
- [ ] After merge, set `status: implemented`

## Acceptance criteria

- [ ] Team session required; unauthenticated requests return `401` (`FR-REV-005` admin surface).
- [ ] Submitted reviews stay non-public until approve (`FR-REV-004`, `OPR-6`).
- [ ] Index defaults to `pending_moderation` with flagged-first, oldest-submitted sort (`FR-REV-005`).
- [ ] Approve pending → `approved`, sets `approved_at`, recalc updates catalog listing rating columns (`FR-REV-007`).
- [ ] Remove requires valid `removal_reason` (trimmed, non-empty, max 5,000) and sets `moderated_by_admin_id` (`FR-REV-005`).
- [ ] Approve clears `moderated_by_admin_id`; only remove records the acting admin PK.
- [ ] Remove from `approved` decreases public score; remove from `pending` does not add score.
- [ ] Illegal transitions return `422` (re-approve, remove when already removed).
- [ ] `ReviewApproved` and `ReviewRemoved` publish with no NOT handlers registered.
- [ ] Integration test proves catalog columns after approve/remove (not only isolated manager tests).

## Verification

```bash
# from red-cab-api/
bin/rails test test/integration/team/reviews/
bin/rails test test/domains/reviews/reviews/team_approve_validator_test.rb
bin/rails test test/domains/reviews/reviews/team_remove_validator_test.rb
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-09 | Mark | Brief Gate 1 (Q1–Q4) | decisions locked |
| 2026-10-09 | Mark + agent | `review-implementation-spec` | approved after should-fix (response bodies, index errors, unconditional recalc, removal_reason rules, approver PK on remove only) |
