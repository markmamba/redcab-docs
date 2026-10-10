---
title: "Provider review report (W1-3b)"
sidebar_label: API · REV provider report
issue: "https://github.com/markmamba/red-cab-api/issues/161"
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

- Ships Provider **report** for a **published** review on the Provider's Listing (`FR-REV-005`).
- Sets `is_flagged_by_provider` and `flagged_at`; review **stays public** until Team Admin removes it ([ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation)).
- Optional **report reason** text when a storage column ships; reason **codes** stay deferred.
- Does not ship Team dismiss/remove, tourist UI, or notifications.

## Problem

Post-publication moderation needs a Provider HTTP action to flag harmful reviews for Team Admin. api-154 columns exist but no Provider write route sets `is_flagged_by_provider`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-005 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Provider report; Team queue priority |
| ADR-020 | [adr-020-review-post-publication-moderation.md](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Public until Admin remove |
| OPR-6 | [invariants](/docs/70-79-business/business-rules/invariants) | Published reviews; flag semantics |
| api-157 | [api-157-tourist-submit-review.md](./api-157-tourist-submit-review.md) | Published = `approved` on submit |
| api-159 | [api-159-team-review-moderation-endpoints.md](./api-159-team-review-moderation-endpoints.md) | Dismiss clears flag |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `require_approved_provider_profile!` on report | Session only | Match api-160 provider gate |
| 2 | `POST` only (no GET report) | Full CRUD | Brief scope; Team show reads flag fields |
| 3 | Report only when `moderation_status` = `approved` | Allow pending | FR-REV-005 post-publication |
| 4 | Cross-provider access → `404` | `403` | api-160 pattern |
| 5 | Re-report when already flagged → `422` | Idempotent `200` | Clear provider feedback |
| 6 | Optional `reason` in body | Required codes now | Product deferred reason codes |
| 7 | Persist `reason` in `provider_report_reason` when column exists | No text storage | Implementation may add nullable text column in same PR |
| 8 | No domain events in W1-3b | `ReviewReported` event | W7 NOT can subscribe later |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/providers/reviews/:review_id/report` | Provider session + approved profile | JSON body optional |

### Request body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `reason` | string | no | Trimmed; max **5,000** characters when present |

On success:

- `is_flagged_by_provider` = `true`
- `flagged_at` = `Time.current`
- `provider_report_reason` = trimmed `reason` when column exists; else ignore body reason until migration lands

**Response `200`**

`Reviews::TeamReviewBaseSerializer` subset or dedicated `ProvidersReviewReportSerializer` with at least: `uuid`, `moderation_status`, `is_flagged_by_provider`, `flagged_at`.

### Errors

| Condition | HTTP |
| --- | --- |
| No provider session | `401` |
| Provider profile not approved | `403` |
| Review UUID unknown for this provider | `404` |
| Review not `approved` (`pending_moderation` or `removed`) | `422` |
| Already flagged | `422` |
| `reason` over max length | `422` |

## Data / domain touchpoints

- Bounded context: **REV** updates flag fields on `reviews_reviews` only.
- No rating recalculation on report (review already counted).
- Transaction: single row update.

## Files to create or modify (API)

- `config/routes/providers_routes.rb`
- `app/controllers/providers/reviews/reports_controller.rb`
- `app/domains/reviews/reviews/providers_report_{request,validator,manager}.rb`
- Optional migration: `provider_report_reason` text nullable on `reviews_reviews`
- `docs/api/red-cab-api/providers/reviews/report.bru`
- `test/integration/providers/reviews/report_integration_test.rb`

## Out of scope

- Team dismiss report and remove (api-159).
- Provider response (api-160).
- Marketplace hide while flagged — reviews stay public per ADR-020.
- Enumerated report reason codes (product follow-up).

## Acceptance criteria

- [ ] Approved provider can report an approved review on own listing → `200`, flag set.
- [ ] Non-owner provider → `404`.
- [ ] Pending or removed review → `422`.
- [ ] Second report → `422`.
- [ ] Integration test covers session, scoping, and flag fields.

## Verification

```bash
bin/rails test test/integration/providers/reviews/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-10 | Build (/pkm-build #121) | `review-implementation-spec` | Approved for W1-3b implementation |
