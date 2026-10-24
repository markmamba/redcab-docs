---
title: "Move the listing primary destination to a prefecture"
sidebar_label: API · Primary destination
issue: "https://github.com/markmamba/red-cab-api/issues/204"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#destination-structure"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
---

## TL;DR

- Ships the column `primary_geography_id` on `catalog_listings`. It replaces `geography_id` and must be a prefecture.
- Ships `Catalog::Listings::PrimaryDestinationValidation`. It replaces `GeographyListableValidation`.
- Provider create and update requests take `primary_geography_id`. They no longer take `area_id`.
- Does NOT ship additional destinations, pickup coverage, new endpoints, new URLs or the web provider form.
- Breaking change: Yes. The provider request field changes from `area_id` to `primary_geography_id`. The provider payload field `area_uuid` becomes `primary_geography_id`. The old web provider form breaks until its own issue ships.

## Problem

A listing attaches to a ward or a small city today. Region and prefecture pages cannot find it.

`Catalog::Listings::GeographyListableValidation` requires a listable leaf, and its messages talk about areas.

The provider create flow needs one `area_id`. The target design uses one prefecture as the primary destination.

Evidence: `app/domains/catalog/listings/geography_listable_validation.rb`, `app/domains/catalog/listings/providers_create_manager.rb`, `db/schema.rb` (`catalog_listings.geography_id`).

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | The primary destination is required and is a prefecture |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) | `primary_geography_id` rule and writers |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column and index truth. Tags `ships in: S2` mark this slice |
| ADR-014 | [Service timezone model](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model) | The booking Service Timezone comes from the listing node |
| Slice S1 | [Spec api-203](./api-203-region-level-and-seed.md) | Every prefecture has a region parent. Merged in red-cab-api#217 |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Rename `geography_id` to `primary_geography_id` and keep the data in place** | Add a new column and drop the old one | A rename keeps the foreign key and the rows. The backfill then rewrites the value. |
| 2 | **Backfill each row to its prefecture ancestor with one recursive query, and then set NOT NULL** | Row-by-row Ruby loop | One statement is fast and runs in the migration transaction. A row with no prefecture ancestor makes the migration fail with a clear message. |
| 3 | **Replace the index on `geography_id` and `status` with `primary_geography_id` and `status`, and drop the single column index on `geography_id`** | Keep both indexes | The foreign key needs an index that starts with the column. The composite index covers it. |
| 4 | **Add the partial index on `published_at` and `created_at`, and drop the index on `status` and `published_at`** | Leave it for a later issue | `catalog.dbml` tags it `ships in: S2` and `removed in: S2`. |
| 5 | **`down` renames the column back, restores the old indexes and leaves the prefecture ids in place** | Keep the old area in a legacy column | Owner ruling on 2026-10-24: a lossy `down` is fine. The old listable leaf is not restored. |
| 6 | **`PrimaryDestinationValidation` checks that the node exists, is `active` and has level `subdivision`** | Allow any active node | The ruling says the primary destination is a prefecture. |
| 7 | **Hard rename of the request field: `primary_geography_id` only, no `area_id` alias** | Accept both for a while | Owner ruling on 2026-10-24. The web provider form is a separate issue. |
| 8 | **The provider payload field `area_uuid` becomes `primary_geography_id`** | Keep `area_uuid` | The request and the payload use one name. |
| 9 | **The marketplace listing `area` embed keeps its shape and now holds the prefecture** | Add a new `primary_destination` embed | Marketplace payload keys stay the same. The listing detail `area_district` is the prefecture itself, because a prefecture is its own discovery root. |
| 10 | **The legacy area listing route is not changed, so it returns no rows for backfilled listings** | Match the area subtree | Owner ruling on 2026-10-24: accept empty area pages. The new pages come in later slices. |
| 11 | **`ServiceTimezoneFetchService` reads `primary_geography.timezone`** | Add a timezone column on the listing | ADR-014 snapshots the timezone at booking. The prefecture holds the timezone. |

## API contract

No new endpoint ships. The changes below are in existing provider and marketplace payloads.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/providers/catalog/listings` | JWT provider | `primary_geography_id` (required, a prefecture UUID). `area_id` is not read. | Field `primary_geography_id` replaces `area_uuid`. | Error 422 when missing, unknown, not active or not a prefecture |
| PATCH | `/providers/catalog/listings/:listing_id` | JWT provider | `primary_geography_id` | Same | Same errors |
| GET | `/providers/catalog/listings` and `/:listing_id` | JWT provider | | Field `primary_geography_id` replaces `area_uuid`. `area` shows the prefecture. | |
| GET | `/marketplace/catalog/listings/:listing_id` | none | | `area` shows the prefecture. `area_district` is the prefecture. `area_ancestors` has no region. | Keys unchanged |
| GET | `/marketplace/catalog/districts/:d/areas/:a/listings` | none | | Returns no rows for backfilled listings. | Accepted, see decision 10 |

Error text:

- Missing value: "Please select a primary destination for your listing."
- Not found: "Please select a valid primary destination."
- Not active: "Please select an active primary destination."
- Not a prefecture: "The primary destination must be a prefecture."

### Files to create or modify (API)

- `db/migrate/{timestamp}_move_listing_primary_destination_to_prefecture.rb`
- `app/domains/catalog/listing.rb` (association `primary_geography`)
- `app/domains/catalog/listings/primary_destination_validation.rb` (new)
- `app/domains/catalog/listings/geography_listable_validation.rb` (delete)
- `app/domains/catalog/listings/providers_create_{request,validator,manager}.rb`
- `app/domains/catalog/listings/providers_update_{request,validator,manager}.rb`
- `app/domains/catalog/listings/{providers_index,providers_show,providers_publish}_manager.rb` (`includes`)
- `app/domains/catalog/listings/marketplace_show_manager.rb` (`area_district`)
- `app/domains/catalog/listings/marketplace_index_manager.rb` (column name and timezone join)
- `app/domains/catalog/listings/service_timezone_fetch_service.rb`
- `app/domains/catalog/providers_listing_base_serializer.rb`, `providers_listing_detail_serializer.rb`, `marketplace_listing_list_serializer.rb`, `marketplace_listing_detail_serializer.rb`
- `lib/dev/catalog_marketplace_seeder.rb` (attach the dev listings to Tokyo)
- `Catalog::Geography.listable_child_names_for` (remove if no caller is left)
- `docs/db/catalog.dbml`, `docs/db/redcab.dbml` (remove `ships in: S2` and `removed in: S2` tags)
- `db/schema.rb`, `sorbet/rbi/dsl/catalog/listing.rbi`

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: the migration runs in one transaction.
- Snapshots: the booking `service_timezone` is still a snapshot taken at checkout. Only its source changes.

## Out of scope

- Additional destinations (slice S3).
- Pickup coverage (slice S6).
- The web provider form and the web listing pages.
- A change to the legacy district and area routes.
- Region and prefecture listing pages.

## Tasks

### API

- [ ] Add the migration with the backfill and `down`.
- [ ] Rename the association and the column in the model.
- [ ] Add `PrimaryDestinationValidation` and remove `GeographyListableValidation`.
- [ ] Change the provider create and update requests, validators and managers.
- [ ] Change the serializers and the show manager.
- [ ] Change the timezone service and the marketplace index manager.
- [ ] Update the dev seeder.
- [ ] Update the tests.
- [ ] Run `bin/rails db:migrate`, then `bundle exec tapioca dsl Catalog::Listing`.
- [ ] Remove the `S2` tags from the two DBML files.

### Web

- [ ] None in this issue. The provider form is a separate issue.

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] After the migration, every listing has a prefecture as its primary destination.
- [ ] The migration fails with a clear message when a listing has no prefecture ancestor.
- [ ] `db:rollback` restores the column name `geography_id` and the old indexes.
- [ ] The validator rejects a primary destination that is a region, a municipality or a ward.
- [ ] The validator rejects an unknown or inactive primary destination.
- [ ] Provider create fails without `primary_geography_id`.
- [ ] Provider update accepts a new prefecture.
- [ ] The provider payload shows `primary_geography_id`.
- [ ] The booking `service_timezone` comes from the primary prefecture.
- [ ] The marketplace listing detail shows the prefecture in `area` and `area_district`, and `area_ancestors` has no region.
- [ ] `catalog.dbml` has no `ships in: S2` tag.
- [ ] Integration test: `test/integration/providers/catalog/listings_*`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails db:migrate
bin/rails db:rollback && bin/rails db:migrate
bin/rails test test/domains/catalog/listings test/integration
bin/rails test
bundle exec srb tc
bundle exec rubocop
bin/brakeman --no-pager
bin/rails db:seed
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| | | `review-implementation-spec` | |
