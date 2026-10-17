---
title: "Migrate REV schema — reviews.dbml and tables (W0-1)"
sidebar_label: API · REV schema migration
issue: "https://github.com/markmamba/red-cab-api/issues/154"
repos:
  - red-cab-api
status: approved
phase: 2
context: REV
depends_on:
  - "docs/70-79-business/73-planning/roadmap/phase-2-execution-map.md (W0-1 row)"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships **database migrations + DBML only** for REV: `reviews_reviews`, `reviews_review_photos`, `reviews_provider_responses`, `reviews_rating_summaries`.
- Updates **`docs/db/reviews.dbml`** and **`docs/db/redcab.dbml`** in the same PR.
- Does **not** ship `Reviews::` models, managers, HTTP endpoints, rating recalculation jobs, or Catalog display writes — Wave 1+.
- Breaking change: **No** — additive tables only.

## Problem

Phase 2 execution map W0-1: REV has no `reviews.dbml` and no persisted review aggregates. `catalog_listings.rating_average` / `reviews_count` exist as **display-only** columns; authoritative `RatingSummary` storage is missing. Issue #154 implements the schema gate before W1 API work.

Evidence: `redcab-docs/docs/70-79-business/73-planning/roadmap/phase-2-execution-map.md` (REV row); `red-cab-api/docs/db/redcab.dbml` Project note lists `reviews.dbml` as Phase 2 / file missing.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Domain §3.7 | [domain-models.md §3.7](/docs/30-49-domains/domain-models/domain-models#37-reviews--ratings-core) | Aggregates: Review, RatingSummary; lifecycle |
| ER §6.7 | [entity-relationships.md §6.7](/docs/30-49-domains/data-model/entity-relationships#67-reviews--ratings) | 1:1 booking, photos, provider response, rating summary per listing |
| FR-REV-001..007 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Eligibility, moderation, provider response, score |
| INV-5, BKG-7 | [invariants](/docs/70-79-business/business-rules/invariants) | One review per completed booking |
| OPR-6, OPR-7 | [invariants](/docs/70-79-business/business-rules/invariants) | Moderation gate; 14-day window |
| REV context | [reviews.md](/docs/30-49-domains/bounded-contexts/reviews) | Bounded context ownership |
| Backend conventions | [backend.md](/docs/20-29-backend/conventions/backend) | `timestamptz`, string enums, explicit FKs |
| AMB-019 | [open-questions](/docs/70-79-business/planning/open-questions) | Moderation default / window — provisional; schema uses `pending_moderation` default |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Scope = migrations + DBML only** | Minimal AR stubs | Brief Gate 1 Q1=A; matches api-131 schema gate |
| 2 | **Four migration files** | Single combined migration | FK dependency order; rollback granularity |
| 3 | **`reviews_provider_responses` 1:1 `review_id`** | Embed response on review row | Brief Q3=A; `ProviderResponse` entity |
| 4 | **`reviews_review_photos` child + `display_order`** | JSON array of keys | Brief Q4=A; mirror `catalog_listing_photos` |
| 5 | **`reviews_rating_summaries` 1:1 `listing_id`** | Only Catalog display columns | REV owns authoritative score (`OPR-6`, domain-models §3.7) |
| 6 | **Denormalized `listing_id`, `tourist_id`, `provider_id` on review** | Join only via `booking_id` | Listing/provider/tourist **read** paths without joining BKG; submit-time eligibility still reads `bookings_orders` once |
| 7 | **Unique index on `reviews_reviews.booking_id`** | App-only guard | `INV-5`, `FR-REV-001` |
| 8 | **`moderation_status` string enum** | Separate boolean flags | Matches lifecycle-data `PendingModeration → Approved \| Removed` |
| 9 | **No change to `catalog_listings.rating_*`** | Migrate display columns away | W0-1; W1 recalculation writes both summary and display copy |
| 10 | **Update `redcab.dbml` in same PR** | Defer consolidated file | Brief Q2=A |
| 11 | **`booking_completed_at` on review** | Rely on `review_window_ends_at` only | ER §6.7 completion fact; OPR-7 window is auditable without re-reading BKG |
| 12 | **Moderation lifecycle CHECK constraints** | App-only guards | Same pattern as `catalog_geographies` / `bookings_orders` status timestamps |
| 13 | **No tourist edit after submit without re-moderation** | Allow silent edits on approved rows | OPR-6: body/rating changes require `pending_moderation` and cleared `approved_at` (W1 manager) |
| 14 | **No re-submit after `:removed`** | New row after remove | Unique `booking_id` permanently consumes the slot; aligns with INV-5 one review per booking |
| 15 | **Lazy `reviews_rating_summaries` row** | Pre-create per listing | First **approved** review upserts summary; recalc is full re-aggregate (not incremental) |
| 16 | **DBML `delete:` on Ref** | Implement `on_delete` in DDL | Documents intent; Rails FKs use PostgreSQL NO ACTION; hard delete is out of scope (INV-11) |

## API contract

_Not applicable — W0-1 is schema only. W1 will add tourist/team/provider HTTP actions per phase-2-execution-map._

## Data / domain touchpoints

- Bounded context: **REV**
- Tables created:
  - `reviews_reviews` — aggregate root `Review`
  - `reviews_review_photos` — entity inside Review
  - `reviews_provider_responses` — entity `ProviderResponse` (1:1 review)
  - `reviews_rating_summaries` — aggregate root `RatingSummary` (1:1 listing)
- Cross-context FKs (bigint, `restrict` on delete unless noted):
  - `booking_id` → `bookings_orders.id` (UNIQUE)
  - `listing_id` → `catalog_listings.id`
  - `tourist_id` → `tourists_profiles.id`
  - `provider_id` → `providers_profiles.id`
  - `moderated_by_admin_id` → `identities_admins.id` (nullable)
- No transaction boundaries in this PR; no snapshot columns on Booking.

### `reviews_reviews`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `uuid` | string UNIQUE NOT NULL | External API id |
| `booking_id` | bigint UNIQUE NOT NULL | FK → `bookings_orders.id` |
| `listing_id` | bigint NOT NULL | FK → `catalog_listings.id` |
| `tourist_id` | bigint NOT NULL | FK → `tourists_profiles.id` |
| `provider_id` | bigint NOT NULL | FK → `providers_profiles.id` |
| `rating` | integer NOT NULL | 1–5 (`FR-REV-003`); CHECK in migration |
| `body` | text NULL | Optional text |
| `moderation_status` | string NOT NULL default `pending_moderation` | `rails_enum(:pending_moderation, :approved, :removed)` |
| `submitted_at` | timestamptz NOT NULL | Tourist submit instant |
| `booking_completed_at` | timestamptz NOT NULL | Copied from `bookings_orders.completed_at` at submit (ER §6.7) |
| `review_window_ends_at` | timestamptz NOT NULL | Copied eligibility bound (`OPR-7`; must be `>= booking_completed_at`) |
| `approved_at` | timestamptz NULL | Set on approve |
| `removed_at` | timestamptz NULL | Set on remove |
| `removal_reason` | text NULL | Admin reason (`FR-REV-005`) |
| `moderated_by_admin_id` | bigint NULL | FK → `identities_admins.id` |
| `is_flagged_by_provider` | boolean NOT NULL default false | Queue priority (`FR-REV-005`) |
| `flagged_at` | timestamptz NULL | |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

**Indexes:** `uuid` (unique); `booking_id` (unique); `tourist_id`; `(listing_id, moderation_status)`; `(provider_id, moderation_status)`; `(moderation_status, submitted_at)`; partial `(listing_id, submitted_at DESC)` WHERE `moderation_status = 'approved'`; partial `(moderation_status, submitted_at)` WHERE `is_flagged_by_provider`. No standalone `listing_id` / `provider_id` indexes (covered by composites).

**CHECK constraints:** `rating` 1–5; pending/approved/removed lifecycle vs `approved_at` / `removed_at` / `removal_reason` / `moderated_by_admin_id`; `flagged_at` when `is_flagged_by_provider`; `submitted_at <= review_window_ends_at`; `review_window_ends_at >= booking_completed_at`.

### `reviews_review_photos`

Mirror `catalog_listing_photos`: `uuid`, `review_id`, `storage_key`, `content_type`, `byte_size`, `display_order`, timestamps. Unique `(review_id, display_order)`; unique `storage_key`. CHECK `byte_size > 0`. No standalone `review_id` index (covered by composite).

### `reviews_provider_responses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `uuid` | string UNIQUE NOT NULL | |
| `review_id` | bigint UNIQUE NOT NULL | FK → `reviews_reviews.id` |
| `provider_id` | bigint NOT NULL | FK → `providers_profiles.id` |
| `body` | text NOT NULL | Public response text |
| `published_at` | timestamptz NOT NULL | Visible when review is approved (`FR-REV-006`) |
| `last_edited_at` | timestamptz NULL | Further edits require admin (`FR-REV-006`) |
| `edited_by_admin_id` | bigint NULL | FK → `identities_admins.id` |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

**CHECK:** `last_edited_at` and `edited_by_admin_id` are both null or both set.

### `reviews_rating_summaries`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `uuid` | string UNIQUE NOT NULL | |
| `listing_id` | bigint UNIQUE NOT NULL | FK → `catalog_listings.id` |
| `rating_average` | decimal(3,2) NULL | NULL when `reviews_count = 0` |
| `reviews_count` | integer NOT NULL default 0 | Approved reviews only (`OPR-6`) |
| `recalculated_at` | timestamptz NULL | Last aggregate refresh |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

**CHECK:** `reviews_count >= 0`; `(reviews_count = 0 AND rating_average IS NULL) OR (reviews_count > 0 AND rating_average BETWEEN 1.00 AND 5.00)`. FK `listing_id` → `catalog_listings` **restrict** on delete (same as reviews).

### Migration file order

1. `20261004140000_create_reviews_reviews.rb`
2. `20261004140100_create_reviews_review_photos.rb`
3. `20261004140200_create_reviews_provider_responses.rb`
4. `20261004140300_create_reviews_rating_summaries.rb`

## Out of scope

- `Reviews::` ActiveRecord models, Sorbet RBI, validators, managers, serializers
- Tourist / team / provider HTTP endpoints (W1)
- `RatingRecalculated` job and writes to `catalog_listings.rating_*` (W1)
- Notification templates for review events (W7)
- Photo upload / ActiveStorage wiring (W1)
- Max photos per review NFR — W1 validator unless product adds limit before W1
- W0-2 bundle booking link, W0-3 payments refund interlock columns
- Composite FK `reviews_reviews` → `bookings_orders (id, tourist_id, listing_id, provider_id)` — W1 (additive BKG index + REV FK); prevents denormalized drift
- `reviews_moderation_events` audit log — deferred; lifecycle columns + CHECKs suffice for W1
- Review invitation issuance idempotency — owned by NTF (W7); REV stores no invitation row
- FR-REV-005 removal notification dispatch — W7 NTF; `removal_reason` on review is sufficient for REV

## Tasks

### Docs

- [x] This spec (`status: approved`)

### API

- [x] Add `docs/db/reviews.dbml`
- [x] Four migrations per order above
- [x] Patch `docs/db/redcab.dbml` (tables + Ref block + Project note)
- [x] Run `bin/rails db:migrate` on fresh DB

## Acceptance criteria

- [ ] Empty database: all migrations apply and rollback cleanly
- [ ] New tables/columns/indexes match `reviews.dbml` and this appendix
- [ ] Unique `booking_id` on `reviews_reviews`
- [ ] `bundle exec srb tc` unchanged (no new Ruby domain files)
- [ ] `catalog_listings.rating_average` / `reviews_count` columns unchanged

## Verification

```bash
# From red-cab-api/
bin/rails db:drop db:create db:migrate
bundle exec srb tc
# Optional rollback smoke:
bin/rails db:rollback STEP=4
bin/rails db:migrate
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-04 | Build (/pkm-build) | review-implementation-spec (brief-aligned) | Approved for W0-1 implementation |
| 2026-10-04 | DDD schema review (Opus) | api-154 amendment | P0 DDL: `booking_completed_at`, lifecycle CHECKs, partial indexes, summary/photo constraints |
