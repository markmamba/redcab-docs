---
title: "Provider review response endpoints (W1-4)"
sidebar_label: API · REV provider response
issue: "https://github.com/markmamba/red-cab-api/issues/160"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-154-reviews-schema-migrate.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-159-team-review-moderation-endpoints.md"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships Provider **create** and **read** for one public response per **approved** review (`FR-REV-006`).
- Requires an **approved** provider profile (`require_approved_provider_profile!`).
- Duplicate create returns **`422`** (not tourist `409`).
- No migration, domain events, provider review inbox, or admin edit API.

## Problem

Tourist submit (api-157) publishes reviews. Providers need a self-service HTTP surface to post a single public response to each published review on their listings. The `reviews_provider_responses` table exists (api-154) but has no Provider routes or command stack.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-006 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | One public response; admin for further edits |
| FR-REV-004 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Published review = approved on submit |
| ADR-020 | [adr-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Publication lifecycle |
| api-154 | [api-154-reviews-schema-migrate.md](./api-154-reviews-schema-migrate.md) | `reviews_provider_responses` schema |
| api-159 | [api-159-team-review-moderation-endpoints.md](./api-159-team-review-moderation-endpoints.md) | Illegal transition → `422` pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `require_approved_provider_profile!` on create and show | Session only | Brief Gate 1 Q1=B |
| 2 | `POST` + `GET` by `review_id` | POST only | Brief Gate 1 Q3=B |
| 3 | Create only when `moderation_status` = `approved` | Allow pending | FR-REV-006; `422` otherwise |
| 4 | Cross-provider access → `404` | `403` | `ProvidersShowManager` pattern |
| 5 | Second create → `422` | `409` tourist duplicate | Brief Gate 1 Q2=B; api-159 |
| 6 | Set `published_at` = `Time.current` on insert | Backdate to `approved_at` | NOT NULL column; response exists only after approval |
| 7 | `provider_id` on row = review `provider_id` | Trust client | DBML W1 validator note |
| 8 | Body max `Reviews::Review::MAX_BODY_LENGTH` (5_000) | New constant | Align with review text |
| 9 | No domain events in W1-4 | Publish `ProviderResponseCreated` | No consumer yet |
| 10 | No migration | — | Table shipped in api-154 |

## API contract

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/providers/reviews/:review_id/provider_response` | Provider session + approved profile | JSON body |
| GET | `/providers/reviews/:review_id/provider_response` | Provider session + approved profile | Read back |

### Create body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `body` | string | yes | Trimmed; non-empty; max 5_000 |

### Create response `201`

`Reviews::ProvidersProviderResponseSerializer`

| Field | Notes |
| --- | --- |
| `uuid` | Response UUID |
| `body` | Stored text |
| `published_at` | ISO8601 timestamp |

### Show response `200`

Same serializer shape as create.

### Errors

| Condition | HTTP |
| --- | --- |
| No provider session | `401` |
| Provider profile not approved | `403` portal gate |
| Review UUID unknown for this provider | `404` |
| Show when no response row | `404` |
| Review `pending_moderation` or `removed` on create | `422` |
| Duplicate create (response already exists) | `422` |
| Invalid body (empty / too long) | `422` |

## Files to create or modify (API)

- `config/routes/providers_routes.rb`
- `app/controllers/providers/reviews/provider_responses_controller.rb`
- `app/domains/reviews/provider_response.rb`
- `app/domains/reviews/review.rb` — `has_one :provider_response`
- `app/domains/reviews/provider_responses/providers_create_{request,validator,manager}.rb`
- `app/domains/reviews/provider_responses/providers_show_{request,manager}.rb`
- `app/domains/reviews/providers_provider_response_serializer.rb`
- `docs/api/red-cab-api/providers/reviews/**` (Bruno)
- `test/integration/providers/reviews/provider_response_integration_test.rb`
- `test/domains/reviews/provider_responses/providers_create_validator_test.rb`

## Out of scope

- Provider review list (`GET /providers/reviews`).
- Provider flag write API.
- Team admin edit of response text.
- Marketplace embed of `provider_response`.
- Domain events and NOT handlers.

## Tasks

### API

- [ ] Add routes under `namespace :reviews` in `providers_routes.rb`
- [ ] Implement `Reviews::ProviderResponse` model and review association
- [ ] Implement create/show Request → Validator → Manager stack
- [ ] Wire controller, serializer, Bruno
- [ ] Integration and validator tests

### Docs

- [x] Set `status: approved`
- [ ] After merge, set `status: implemented`

## Acceptance criteria

- [ ] Approved provider can create a response on an approved review → `201` with `uuid`, `body`, `published_at`.
- [ ] Same provider can `GET` the response → `200`.
- [ ] Non-owner provider → `404` on create and show.
- [ ] Pending provider profile → portal gate `403` on create and show.
- [ ] `pending_moderation` / `removed` review → `422` on create.
- [ ] Second create → `422`.
- [ ] `GET` with no response row → `404`.
- [ ] Integration tests cover HTTP boundary (session, scoping, errors).

## Verification

```bash
# from red-cab-api/
bin/rails test test/integration/providers/reviews/
bin/rails test test/domains/reviews/provider_responses/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-10 | Mark | Brief Gate 1 (Q1–Q3) | decisions locked |
| 2026-10-10 | Build | brief api-160 | approved for implementation |
| 2026-10-10 | Build (/pkm-build #121) | `review-implementation-spec` | Re-approved after ADR-020 cross-ref amend |
