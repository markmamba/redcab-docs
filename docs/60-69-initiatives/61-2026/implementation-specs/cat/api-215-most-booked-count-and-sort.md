---
title: "Add the Most booked count and sort"
sidebar_label: API · Most booked
issue: "https://github.com/markmamba/red-cab-api/issues/215"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#most-booked-sort"
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#marketplace-sort-options"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-207-scoped-listings-index.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-212-package-aware-filters-and-price-sort.md"
---

## TL;DR

- Ships the columns `bookings_count_90d` and `bookings_count_refreshed_at` on `catalog_listings`.
- Ships a Bookings read manager that counts the qualifying bookings of each listing.
- Ships `Catalog::Listings::RefreshBookingCountsService`, the only writer of the two columns.
- Ships a nightly sweep job that starts one refresh job for each listing.
- Ships the sort `order_by=bookings_count_90d` on `GET /marketplace/catalog/listings`.
- Does NOT change the web. The sort option is a web follow-up.
- Does NOT show the count in any payload.
- Does NOT update the count when a booking changes. Only the nightly job updates it.
- Breaking change: No.

## Problem

A tourist cannot sort listings by demand. No booking count exists on the listing.

The count must come from Bookings. Catalog must not read `bookings_` tables (the DBML rule for derived columns).

The 90-day window moves every day without a new event. A stored count goes stale unless something refreshes it.

Evidence: `docs/db/catalog.dbml` (`bookings_count_90d`, S8), `app/domains/catalog/listings/marketplace_scoped_index_manager.rb`, `marketplace_scoped_index_validator.rb`, `config/sidekiq_scheduler.yml`, issue #215.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Most booked sort](/docs/30-49-domains/catalog/catalog-decisions/#most-booked-sort) | Which bookings count, and the 90-day window |
| Ruling | [Marketplace sort options](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-sort-options) | The tie-break rule |
| Requirement | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | US-5 and its worked example |
| Model | [Listings and packages](/docs/30-49-domains/catalog/models/listings-and-packages) | The owner of `bookings_count_90d` |
| Spec | api-207 and api-212 | The scoped index and the sort keys it already has |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column and index truth (S8) |
| Convention | `red-cab-api/AGENTS.md`, `app/domains/AGENTS.md` | Request, Manager, Validator and job rules |

## Design decisions

Each row says who made the decision.

"Added point, please review" means the author added it. The owner must confirm or change each row before approval.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling (Catalog decisions). A booking counts when payment succeeded and its status is Confirmed or Completed. Its confirmation time must be inside the last 90 days. Cancelled, Failed and fully refunded bookings do not count. Each booking counts once.** | Count by service date. Count for all time. | The ruling sets this. |
| 2 | **Owner ruling (issue #215). Catalog does not read `bookings_` tables. It gets the counts through a Bookings read manager.** | A join from Catalog to `bookings_orders`. | Bookings owns its tables. |
| 3 | **Owner ruling (issue #215). `Catalog::Listings::RefreshBookingCountsService` is the only writer of the two columns.** | Write the count from a booking event. | One writer for each derived column (DBML rule). |
| 4 | **Added point, please review. The count includes the status `payout_queued`, with `confirmed` and `completed`.** An order moves from `completed` to `payout_queued` when the payout is queued (LC-6). | Count only `confirmed` and `completed`, as the ruling words say. | A completed booking must not leave the count when its payout is queued. The ruling says "Completed", and `payout_queued` is a later step of the same booking. `pending`, `cancelled` and `refunded` stay out. |
| 5 | **Added point, please review. The window test is `confirmed_at >= reference_time - 90 days`. An order with no `confirmed_at` does not count.** | Round to calendar days. | The ruling says "inside the last 90 days". A booking confirmed 91 days ago must not count. |
| 6 | **Added point, please review. One order row is one booking. The count is the number of qualifying rows, so a booking counts once after it becomes Completed.** | Count distinct booking numbers. | `bookings_orders` has one row for each checkout session (unique index). |
| 7 | **Added point, please review. The Bookings read manager is `Bookings::Orders::ListingBookingCountsManager`. It takes `listing_ids` and `reference_time` and returns a hash of `listing_id` to count. A listing with no qualifying booking is not in the hash.** | Return one count at a time. | One grouped query replaces many. The service writes 0 for a missing listing. |
| 8 | **Added point, please review. The service refreshes one listing. It sets 0 when the listing has no qualifying booking, and it sets `bookings_count_refreshed_at` every time.** The nightly sweep job visits every listing and starts one refresh job for each. | Refresh only published listings. Refresh only listings whose count changed. Refresh batches of 500 listings in one job. | A paused listing can publish again, and its count must be right. The stale-count monitor needs a fresh time on every row. |
| 9 | **Added point, please review. The service writes with `update_columns`, so `updated_at` does not change.** | Use `update`. | The columns are a display cache. A cache refresh is not an edit by the provider. |
| 10 | **Added point, please review. Only the nightly job refreshes the count. A new booking does not change it until the next run.** | Also refresh on a booking event, as the DBML note says. | Issue #215 asks for the nightly job only. The window moves without events, so the job is needed anyway. The DBML note is corrected in this change. |
| 11 | **Added point, please review. The sweep job runs at 18:00 UTC (03:00 JST) every day, in the queue `catalog`. Each refresh job runs in the same queue.** | Run every hour. | The count is a ranking signal. Daily is enough, and the load is low at night. |
| 12 | **Added point, please review. The sort key is `order_by=bookings_count_90d` with `order_dir=desc`. A request for `asc` gets "Please use descending order for this sort."** | A named key such as `most_booked`. | The naming page uses whitelisted columns, and api-212 decision 15 uses the same style. |
| 13 | **Owner ruling (issue #215). Equal counts rank by the newer `published_at`, then the newer `created_at`.** | Rank by title. | The issue sets this. `id DESC` is the last key, as in the other sorts. |
| 14 | **Added point, please review. The partial index is on `bookings_count_90d`, where `status = 'published'`, as the DBML already says. There is no new index on `bookings_orders`.** | Add an index on `confirmed_at`. | The DBML sets the Catalog index. The nightly query is small at today's volume. Add a Bookings index if the job is slow. |
| 15 | **Added point, please review. No payload shows `bookings_count_90d`.** | Show "Booked N times". | The issue only asks for the sort. A public count needs a requirement. |

## API contract

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/listings` | none | Changed: `order_by` accepts `bookings_count_90d` | Unchanged | `order_dir` must be `desc` or empty |

### Rules

- `order_by` is `published_at`, `rating_average`, `starting_price_jpy` or `bookings_count_90d`.
- The sort `bookings_count_90d` uses this order: `bookings_count_90d DESC, published_at DESC, created_at DESC, id DESC`.
- The sort works with every filter and every scope of the scoped index.
- The sort does not change which listings are discoverable.
- A new listing starts with count 0 and ranks last until the next job run.
- Error for a wrong direction: "Please use descending order for this sort."
- Error for an unknown key: "Please choose a valid sort."

### Database

- Add `catalog_listings.bookings_count_90d`: integer, not null, default 0.
- Add `catalog_listings.bookings_count_refreshed_at`: timestamptz, null.
- Add the partial index `index_catalog_listings_on_bookings_count_90d` on `bookings_count_90d` where `status = 'published'`.
- Add a check constraint: `bookings_count_90d >= 0`.
- The migration does not fill the counts. The first job run fills them (see Known limits).
- The migration `down` drops the index and both columns.

### Files to create or modify (API)

- `db/migrate/{timestamp}_add_bookings_count_to_catalog_listings.rb`.
- `app/domains/bookings/orders/listing_booking_counts_manager.rb`, with a test.
- `app/domains/catalog/listings/refresh_booking_counts_service.rb`, with a test. It takes one `listing:`.
- `app/jobs/catalog/listings/refresh_booking_counts_sweep_job.rb`, with a test. It starts one refresh job for each listing.
- `app/jobs/catalog/listings/refresh_booking_counts_job.rb`, with a test. It takes one `listing_id`.
- `config/sidekiq_scheduler.yml`: add `catalog_listings_refresh_booking_counts` for the sweep job, with `cron: '0 18 * * *'`, `queue: catalog` and `enabled: true`.
- `app/domains/catalog/listings/marketplace_scoped_index_validator.rb`: add the key to `VALID_ORDER_COLUMNS` and `ORDER_DIR_BY_COLUMN`.
- `app/domains/catalog/listings/marketplace_scoped_index_manager.rb`: add the `order_relation` branch.
- `docs/db/catalog.dbml`, `redcab.dbml` and the `.dbdiagram` files: change the writer note (nightly job only).
- `docs/api/marketplace/catalog/listings/list-listings.bru`: add the sort example.

## Data / domain touchpoints

- Bounded contexts: CAT writes the cache. BKG owns the booking data and answers the count query.
- Transaction boundaries: each refresh job writes one listing with one statement. A failed job does not change the other listings, and Sidekiq retries it alone.
- Snapshots: none. The count is a cache. A confirmed booking never changes (`INV-1`).

## Known limits

- A new booking does not change the count until the nightly job runs.
- A listing that is new, or exists before the first job run, has count 0 and ranks last for Most booked.
- A booking that leaves the window drops out at the next run, not at the exact minute.
- The ranking is not exact in real time. This is the cost of a stored count.

## Out of scope

- The web sort option. It is a small web follow-up after this issue merges.
- Showing the count on a card or a page.
- A refresh on booking events.
- A new index on `bookings_orders`.
- Changes to Top rated, Price or Recently added.

## Tasks

### Planning

- [x] Get this spec to `status: approved`.

### API

- [ ] Add the migration, the check constraint and the partial index.
- [ ] Add `Bookings::Orders::ListingBookingCountsManager`.
- [ ] Add `Catalog::Listings::RefreshBookingCountsService`.
- [ ] Add the job and its schedule.
- [ ] Add the sort to the scoped index validator and manager.
- [ ] Update the DBML, the `.dbdiagram` files and the Bruno request.
- [ ] Add the tests below.

### Docs

- [ ] Set spec `status: implemented` after merge.
- [ ] Create the web follow-up issue for the Most booked sort option.

## Acceptance criteria

- [ ] A cancelled, failed or fully refunded booking does not count.
- [ ] A pending booking does not count.
- [ ] A booking counts once, even after it becomes Completed or Payout queued.
- [ ] A booking confirmed 91 days ago does not count. A booking confirmed 89 days ago counts.
- [ ] A listing with no qualifying booking gets count 0 after a run.
- [ ] A count that was 3 and drops to 0 after bookings leave the window is written as 0.
- [ ] Equal counts rank by `published_at`, then `created_at`.
- [ ] `order_by=bookings_count_90d&order_dir=asc` returns 422 with "Please use descending order for this sort."
- [ ] No Catalog code reads a `bookings_` table. Only the Bookings read manager does.
- [ ] The service is the only code that writes `bookings_count_90d`.
- [ ] `bin/rails test`, `bundle exec srb tc` and `bundle exec rubocop` pass at their current baseline.
- [ ] No client-side price computation.

## Verification

```bash
# API (from red-cab-api/)
PARALLEL_WORKERS=1 bin/rails test test/domains/bookings/orders test/domains/catalog/listings test/jobs
bundle exec srb tc
bundle exec rubocop
grep -rn "bookings_count_90d" app lib config
```

- Run the `review-rails-style` skill by hand on the pull request.
- Run the job once in a dev console and check the sort against the data.
- The pull request lists what it did not check.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-27 | Owner | Approved, with decisions 4 (count `payout_queued`), 8 and 10 (nightly refresh only). |
| 2026-10-27 | Owner | Change after code review: one refresh job for each listing, started by a nightly sweep job (decisions 8, 9 and 11). The ruling page now names Payout queued (decision 4). |
