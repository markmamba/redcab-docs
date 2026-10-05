---
title: "Bundle booking link — bookings.dbml and migrations (W0-2)"
sidebar_label: API · BKG bundle schema
issue: "https://github.com/markmamba/red-cab-api/issues/155"
repos:
  - red-cab-api
status: approved
phase: 2
context: BKG
depends_on:
  - "docs/70-79-business/73-planning/roadmap/phase-2-execution-map.md (W0-2 row)"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships **database migrations + DBML only** for the **BundleBooking** aggregate anchor: `bookings_bundle_bookings` and nullable `bookings_orders.bundle_booking_id`.
- Updates **`docs/db/bookings.dbml`** and **`docs/db/redcab.dbml`** in the same PR.
- Does **not** ship bundle checkout materialization, HTTP APIs, serializers, leg role columns, checkout-session pairing, or DDL “exactly two legs” enforcement — **W4+**.
- Breaking change: **No** — additive schema only.

## Problem

Phase 2 execution map **W0-2**: BKG has no persisted link for a car + guide bundle. Domain and glossary require two independent `bookings_orders` rows sharing one `bundle_booking_id` (**BKG-3**, **FR-BKG-012**). Issue #155 implements the schema gate before bundle checkout (W4).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| W0-2 | [phase-2-execution-map.md](/docs/70-79-business/planning/roadmap/phase-2-execution-map) | Wave 0 verification bar |
| BKG-3 | [invariants](/docs/70-79-business/business-rules/invariants) | Two orders, shared bundle id, independent commission snapshots |
| FR-BKG-012 | [bkg.md](/docs/70-79-business/requirements/functional-requirements/bkg) | Bundle behavior; independent leg cancel (**AMB-017**) |
| Glossary | [glossary.md](/docs/70-79-business/business-rules/glossary) | `bundle_booking_id` column name |
| ER §6.4 | [entity-relationships.md §6.4](/docs/30-49-domains/data-model/entity-relationships#64-booking--checkout) | `BUNDLE_BOOKING` ↔ two `BOOKING` legs |
| Domain §3.4 | [domain-models.md](/docs/30-49-domains/domain-models/domain-models) | `BundleBooking` aggregate root |
| BKG context | [booking.md](/docs/30-49-domains/bounded-contexts/booking) | Context ownership |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Scope = migrations + DBML only** | AR model stubs | Brief Gate Q1=A; matches api-154 W0-1 |
| 2 | **`bookings_bundle_bookings` root + nullable FK on orders** | Embed bundle id only on sessions | Matches domain `BundleBooking` root; non-bundle orders stay NULL |
| 3 | **Two migration files** | Single combined migration | Create root before FK on child (api-154 pattern) |
| 4 | **No `bundle_booking_id` on checkout sessions in W0** | Early session pairing in W0 | Brief Q2=A. Pairing needs durable state before orders exist; **W4-3 adds nullable `bookings_checkout_sessions.bundle_booking_id`** as part of bundle checkout materialization. Safe to defer: no bundle rows until W4, so that migration needs no backfill. |
| 5 | **No leg discriminator column in W0** | `bundle_leg_role` on orders | Brief Q3=A |
| 6 | **No DDL “exactly two legs” enforcement** | Trigger / deferred constraint | Brief Q4=A; **BKG-3** enforced at W4 materialization + validators |
| 7 | **Update `redcab.dbml` in same PR** | Defer consolidated file | api-154 / W0 precedent |
| 8 | **FK delete: restrict** | Cascade delete bundle | Bundle root cannot be deleted while orders reference it |
| 9 | **Partial index on `bookings_orders.bundle_booking_id`** (`WHERE bundle_booking_id IS NOT NULL`) | Plain btree; no index | Only bundle rows are probed; FK restrict checks use non-NULL values. Skips indexing standalone bookings (matches partial-index style on cancellation tiers / reviews). |

## API contract

_Not applicable — W0-2 is schema only._

## Data / domain touchpoints

- Bounded context: **BKG**
- Tables / columns:
  - **`bookings_bundle_bookings`** — aggregate root `BundleBooking` (identity anchor only in W0)
  - **`bookings_orders.bundle_booking_id`** — nullable FK → `bookings_bundle_bookings.id`
- Payments and Reviews unchanged: charges and reviews remain per leg.
- No transaction boundaries in this PR.

### `bookings_bundle_bookings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `uuid` | string UNIQUE NOT NULL | External API id when exposed in W4+ |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

**Indexes:** `uuid` (unique).

**CHECK constraints:** none in W0.

### `bookings_orders` (delta)

| Column | Type | Notes |
| --- | --- | --- |
| `bundle_booking_id` | bigint NULL | FK → `bookings_bundle_bookings.id`. NULL for standalone bookings. Set at bundle materialization (W4). |

**Indexes:** non-unique partial `bundle_booking_id` (`index_bookings_orders_on_bundle_booking_id`, `WHERE bundle_booking_id IS NOT NULL`).

### Migration file order

1. `20261005140000_create_bookings_bundle_bookings.rb`
2. `20261005140100_add_bundle_booking_id_to_bookings_orders.rb`

## Out of scope

- `Bookings::BundleBooking` / `Bookings::Order` association changes
- Tourist or provider HTTP endpoints exposing `bundle_booking_id`
- Bundle checkout orchestration (dual `CheckoutSession`, payment grouping)
- `bundle_booking_id` on `bookings_checkout_sessions` in **W0** — **deferred to W4-3** (required there to pair two independently paid sessions to one bundle root)
- `bundle_leg_role` (or equivalent) on orders
- DB trigger enforcing exactly two orders per bundle
- Cancellation context columns on `bookings.dbml` (separate Phase 2 slice)

## Tasks

### Docs

- [x] This spec (`status: approved`)

### API

- [x] Update `docs/db/bookings.dbml` (table + order column + Ref + Project Note)
- [x] Two migrations per order above
- [x] Patch `docs/db/redcab.dbml`
- [x] Run `bin/rails db:migrate` on fresh DB

## Acceptance criteria

- [ ] Empty database: all migrations apply cleanly
- [ ] New table/column/index/FK match DBML and this appendix
- [ ] `bundle_booking_id` nullable; restrict delete on bundle root when referenced
- [ ] `bundle exec srb tc` unchanged (no new Ruby domain files)
- [ ] Existing booking migrations still apply in order

## Verification

```bash
# From red-cab-api/
bin/rails db:drop db:create db:migrate
bundle exec srb tc
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-05 | Build (/pkm-build) | Brief-aligned (api-154 template) | Approved for W0-2 implementation |
