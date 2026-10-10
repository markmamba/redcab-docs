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

- Ships Team Admin **list**, **show**, **dismiss report**, and **remove** for `reviews_reviews` ([ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation)).
- Default queue is **provider-flagged** published reviews; sort **flagged first**, then **oldest submitted**.
- **Remove** calls synchronous `RecalculateManager`; **dismiss report** clears flag only (no recalc).
- Publishes `ReviewRemoved` after remove (no NOT handlers). Does not publish `ReviewApproved`.
- Does not ship tourist removal notifications, provider report API (api-161), team UI, or moderation audit table.

## Problem

Tourist submit (api-157) publishes reviews. Providers report via api-161. Team Admin needs a dispute queue and takedown commands per `FR-REV-005`. Pre-moderation **approve** is retired.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Publication on submit (read-only for Team) |
| FR-REV-005 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Dismiss report/remove, reason on remove, flagged priority |
| ADR-020 | [adr-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Post-publication dispute model |
| api-161 | [api-161-provider-review-report.md](./api-161-provider-review-report.md) | Provider sets flag |
| FR-REV-007 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Public score from approved reviews only |
| OPR-6 | [invariants](/docs/70-79-business/business-rules/invariants) | Publish on submit; score from published (`approved`, not `removed`) set |
| REV context | [reviews.md](/docs/30-49-domains/bounded-contexts/reviews) | REV owns moderation and rating summary |
| api-design | [api-design.md](/docs/30-49-domains/system-design/api-design) | Team Admin consumes REV moderation |
| api-154 | [api-154-reviews-schema-migrate.md](./api-154-reviews-schema-migrate.md) | Lifecycle columns and DB CHECKs |
| api-157 | [api-157-tourist-submit-review.md](./api-157-tourist-submit-review.md) | Submit publishes rows |
| api-158 | [api-158-rating-summary-recalculation.md](./api-158-rating-summary-recalculation.md) | Recalc after approved set changes |
| AMB-019 supersede | [open-questions](/docs/70-79-business/planning/open-questions) | Publish-on-submit (2026-10-10) |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | No schema migration | New audit table | api-154 shipped moderation columns and CHECKs |
| 2 | Auth via `Team::AuthenticatedController` | Shared secret header | Matches other team surfaces; **remove** records `identities_admin.id`; **dismiss report** does not set approver PK |
| 3 | Default index filter `is_flagged_by_provider=true` | Require client to pass flag | ADR-020 dispute queue; client may pass `moderation_status` for other views |
| 4 | Fixed sort for **all** index filters: `is_flagged_by_provider DESC`, `submitted_at ASC` | Client `order_by`; newest first | `FR-REV-005` priority; Brief Gate 1 Q2=A; applies to every `moderation_status` value |
| 5 | Remove from `approved` only | Remove pending legacy rows | Published reviews affect public score until removed |
| 6 | **Dismiss report** only when `is_flagged_by_provider`; `422` if not flagged | Idempotent dismiss | Clears flag; review stays `approved` |
| 7 | Call synchronous `RecalculateManager` after **remove** only | Recalc on dismiss | Dismiss does not change approved aggregate set |
| 8 | Publish `ReviewRemoved` in W1-3 | `ReviewApproved` | Approve retired; optional `ReviewReportDismissed` deferred |
| 9 | Unknown `listing_id` / `provider_id` filter → empty page | `404` on bad filter UUID | Same pattern as other team index filters |
| 10 | Index `order_by` query params ignored for queue | Honor client sort | Queue ordering is product-fixed per decision 4 |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/team/reviews` | Team admin session | Paginated index |
| GET | `/team/reviews/:review_id` | Team admin session | `review_id` is review UUID |
| POST | `/team/reviews/:review_id/dismiss_report` | Team admin session | Empty body |
| POST | `/team/reviews/:review_id/remove` | Team admin session | JSON body |

### Index query params

| Param | Type | Notes |
| --- | --- | --- |
| `moderation_status` | string | Optional. `pending_moderation`, `approved`, `removed`. No default status filter when omitted unless combined with flag default below. |
| `is_flagged_by_provider` | boolean | Optional. Default **`true`** when omitted (dispute queue). Pass `false` to list non-flagged reviews. Queue rows are **published** reviews (`moderation_status` `approved`); legacy `pending_moderation` rows are out of scope for dismiss/remove. |
| `listing_id` | UUID | Optional. Resolves listing; no match → empty `reviews` array. |
| `provider_id` | UUID | Optional. Resolves provider profile; no match → empty `reviews` array. |
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

### Dismiss report

Empty body. On success:

- `is_flagged_by_provider` = `false`
- `flagged_at` = `null`
- `provider_report_reason` cleared when column exists
- `moderation_status` unchanged (`approved`)

No recalculation. Optional `ReviewReportDismissed.publish(review:)` — not required in W1-3.

**Response `200`**

`Reviews::TeamReviewDetailSerializer` — same fields as show.

**Errors**

| Condition | HTTP |
| --- | --- |
| Unknown review | `404` |
| Not currently flagged | `422` |
| Review `removed` | `422` |
| No team session | `401` |

### Retired: approve

`POST .../approve` is **removed** from the product contract. Implementations delete the route and `team_approve_*` stack or keep behind feature flag until code removal lands in the API amend PR.

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
| Not `approved` (includes `pending_moderation` and already `removed`) | `422` |
| Missing, blank (after trim), or over-length `removal_reason` | `422` |
| No team session | `401` |

### Domain events (no handlers in W1-3)

| Event | When | Payload |
| --- | --- | --- |
| `ReviewRemoved` | After remove transaction + recalc | `{ review: <Reviews::Review> }` |

W7 NOT will add handlers; do not register `Publisher::HANDLERS` entries in this issue.

## Data / domain touchpoints

- Bounded context: **REV** writes `reviews_reviews` lifecycle fields per api-154 CHECKs.
- **REV** calls `Reviews::RatingSummaries::RecalculateManager` after remove from `approved` only.
- **CAT** display columns update via existing `RatingRecalculated` handler from api-158 (integration tests assert `catalog_listings.rating_average` / `reviews_count`).
- Transaction boundary: review row update in one transaction; recalc and event publish **after** commit (same pattern as tourist submit + `ReviewSubmitted`).

## Files to create or modify (API)

- `config/routes/team_routes.rb`
- `app/controllers/team/reviews/reviews_controller.rb`
- `app/domains/reviews/reviews/team_index_{request,validator,manager}.rb`
- `app/domains/reviews/reviews/team_show_{request,manager}.rb`
- `app/domains/reviews/reviews/team_dismiss_report_{request,validator,manager}.rb`
- `app/domains/reviews/reviews/team_remove_{request,validator,manager}.rb`
- `app/domains/reviews/team_review_{base,detail}_serializer.rb`
- `app/domains/reviews/events/review_removed.rb`
- `docs/api/red-cab-api/team/reviews/**` (Bruno)
- `test/integration/team/reviews/moderation_integration_test.rb`
- `test/domains/reviews/reviews/team_dismiss_report_validator_test.rb`
- `test/domains/reviews/reviews/team_remove_validator_test.rb`

## Out of scope

- NOT handlers for tourist email on removal (`FR-REV-005` notify leg) — W7.
- Provider review response (W1-4).
- Team moderation UI (`red-cab-web` W1-6).
- Provider flag HTTP API (api-161).
- `reviews_moderation_events` audit table (deferred in api-154).
- Async job wrapper for recalculation (api-158).

## Tasks

### API

- [ ] Wire explicit routes under `namespace :reviews` in `team_routes.rb`
- [ ] Implement `Team::Reviews::ReviewsController` (index, show, dismiss_report, remove)
- [ ] Implement index/show/dismiss_report/remove Request → Validator → Manager stack
- [ ] Implement team serializers (list + detail + photo embed)
- [ ] Publish `ReviewRemoved` after remove + recalc
- [ ] Add Bruno requests under `docs/api/red-cab-api/team/reviews/`
- [ ] Add integration tests (session, queue sort, catalog `rating_*` on remove, dismiss clears flag)
- [ ] Add validator unit tests for illegal transitions
- [ ] Remove `approve` route and tests when amending shipped API

### Docs

- [x] Run `review-implementation-spec`; set `status: approved`
- [ ] After merge, set `status: implemented`

## Acceptance criteria

- [ ] Team session required; unauthenticated requests return `401` (`FR-REV-005` admin surface).
- [ ] Index defaults to flagged dispute queue with flagged-first, oldest-submitted sort (`FR-REV-005`).
- [ ] Dismiss report clears flag; review stays published (`ADR-020`).
- [ ] Remove from `approved` updates catalog listing rating columns (`FR-REV-007`).
- [ ] Remove requires valid `removal_reason` (trimmed, non-empty, max 5,000) and sets `moderated_by_admin_id` (`FR-REV-005`).
- [ ] Only remove records the acting admin PK.
- [ ] Remove from `approved` decreases public score.
- [ ] Illegal transitions return `422` (dismiss when not flagged, remove when already removed).
- [ ] `ReviewRemoved` publishes with no NOT handlers registered.
- [ ] Integration test proves catalog columns after remove (not only isolated manager tests).

## Verification

```bash
# from red-cab-api/
bin/rails test test/integration/team/reviews/
bin/rails test test/domains/reviews/reviews/team_dismiss_report_validator_test.rb
bin/rails test test/domains/reviews/reviews/team_remove_validator_test.rb
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-09 | Mark | Brief Gate 1 (Q1–Q4) | decisions locked |
| 2026-10-09 | Mark + agent | `review-implementation-spec` | approved after should-fix (response bodies, index errors, unconditional recalc, removal_reason rules, approver PK on remove only) |
| 2026-10-10 | Build (/pkm-build #121) | `review-implementation-spec` | Re-approved after ADR-020 dismiss/remove amend |
