---
title: "Provider reviews inbox index (W1 REV read)"
sidebar_label: API · REV provider reviews inbox
issue: "https://github.com/markmamba/red-cab-api/issues/188"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-154-reviews-schema-migrate.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-187-provider-review-read.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-190-provider-catalog-listing-reviews-index.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships `GET /providers/reviews` for approved providers with an approved profile.
- Returns **published** reviews only (`moderation_status` = `approved`) for the signed-in provider scope.
- Supports pagination, optional `listing_id` and `is_flagged_by_provider` filters, and sort on `submitted_at` or `rating`.
- Each row embeds `listing` and `booking` UUIDs for web #136 inbox navigation.

## Problem

Web #136 needs a provider-wide reviews inbox. Listing-scoped index (api-190) and single review show (api-187) exist. No collection route lists all published reviews for the provider.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Published review = approved |
| api-187 | [api-187-provider-review-read.md](./api-187-provider-review-read.md) | Approved profile gate; published-only |
| api-190 | [api-190-provider-catalog-listing-reviews-index.md](./api-190-provider-catalog-listing-reviews-index.md) | Row fields and sort whitelist |
| api-159 | [api-159-team-review-moderation-endpoints.md](./api-159-team-review-moderation-endpoints.md) | Empty page on bad filter UUIDs |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `GET /providers/reviews` collection above `:review_id` | Nested under catalog | Brief; avoids UUID route capture |
| 2 | `require_approved_provider_profile!` | Session only | Match api-187 show and report |
| 3 | Scope `provider_id` from session | Team-style `provider_id` query | Cross-provider isolation |
| 4 | Default sort `submitted_at` desc | Team flagged-first queue | Inbox browse; api-190 |
| 5 | Optional `is_flagged_by_provider` filter; no default | Default flagged queue | Show all published unless filtered |
| 6 | Unknown or foreign `listing_id` → empty page | `404` | Team index pattern; no leak |
| 7 | Inbox serializer with listing + booking embeds | Extend api-190 serializer | Avoid breaking web #134 listing index |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/providers/reviews` | Provider session + approved profile | Paginated index |

### Query parameters

| Param | Type | Notes |
| --- | --- | --- |
| `page` | integer | Default `1` |
| `page_size` | integer | Default `10`, max `100` |
| `order_by` | string | `submitted_at` or `rating` only |
| `order_dir` | string | `asc` or `desc` |
| `listing_id` | UUID | Optional; must be owned listing or empty `reviews` |
| `is_flagged_by_provider` | boolean | Optional; omit to include all published |

### Index response `200`

| Key | Type | Notes |
| --- | --- | --- |
| `reviews` | array | Inbox rows |
| `meta` | object | Standard pagination |

Each review (`Reviews::ProvidersPublishedReviewInboxSerializer`):

| Field | Type | Notes |
| --- | --- | --- |
| `uuid` | string | Review UUID |
| `rating` | integer | 1–5 |
| `body` | string | Review text |
| `submitted_at` | string | ISO8601 |
| `is_flagged_by_provider` | boolean | Report flag (api-161) |
| `listing` | object | `{ uuid }` |
| `booking` | object | `{ uuid }` order UUID |

### Errors

| Condition | HTTP |
| --- | --- |
| No provider session | `401` |
| Provider profile not approved | `403` portal gate |
| Invalid `order_by` / `order_dir` | `422` |
| Invalid pagination | `422` |

## Files to create or modify (API)

- `config/routes/providers_routes.rb`
- `app/controllers/providers/reviews/reviews_controller.rb`
- `app/domains/reviews/reviews/providers_index_{request,validator,manager}.rb`
- `app/domains/reviews/providers_published_review_inbox_serializer.rb`
- `docs/api/red-cab-api/providers/reviews/list-reviews.bru`
- `test/integration/providers/reviews/reviews_index_integration_test.rb`

## Out of scope

- Tourist or marketplace public list changes.
- Team moderation list (`GET /team/reviews`).
- Provider report or response write behavior.
- Web portal UI (red-cab-web #136).
- Changing api-190 listing-scoped index response shape.
- `has_provider_response` on inbox rows.

## Tasks

### API

- [ ] Add collection `GET ''` before `:review_id` in `namespace :reviews`
- [ ] Implement index Request → Validator → Manager stack
- [ ] Add inbox serializer with listing and booking embeds
- [ ] Wire controller, Bruno, integration tests

### Docs

- [x] Set `status: approved`
- [ ] After merge, set `status: implemented`

## Acceptance criteria

- [ ] Approved provider lists only their approved reviews with pagination `meta`.
- [ ] Another provider never sees foreign review UUIDs.
- [ ] Pending and removed reviews do not appear.
- [ ] Optional `listing_id` filters owned listings; unknown or foreign UUID → empty page.
- [ ] Optional `is_flagged_by_provider` filters rows.
- [ ] No session → `401`; pending provider profile → `403`.
- [ ] Invalid `order_by` → `422`.

## Verification

```bash
bin/rails test test/integration/providers/reviews/reviews_index_integration_test.rb
bundle exec srb tc
bundle exec rubocop
```

## Co-ship note

Deploy **red-cab-api** before red-cab-web #136 (PKM co-ship rule).

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-11 | PKM brief Gate 1 | human | Decisions locked |
| 2026-10-11 | /pkm-build #188 | agent | approved for implementation |
