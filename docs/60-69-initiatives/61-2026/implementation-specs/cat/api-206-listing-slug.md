---
title: "Give each listing a slug"
sidebar_label: API · Listing slug
issue: "https://github.com/markmamba/red-cab-api/issues/206"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#listing-slug"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
---

## TL;DR

- Ships the column `catalog_listings.slug`. It is global, unique and NOT NULL.
- Ships a slug generator. The slug is the English title plus a 4-character random suffix.
- A draft rebuilds the text part of its slug when its English title changes. The suffix stays.
- The slug is fixed after the first publish.
- The marketplace show route accepts a listing UUID or a slug.
- Marketplace and provider payloads return `slug`.
- Does NOT ship the web routes, the `/listings/:uuid` redirect, or slug lookup on the quote and availability routes.
- Breaking change: No. The payloads gain one field, and the UUID lookup still works.

## Problem

A tourist reaches a listing by UUID. Shared links and search results need one stable address.

The listing has no slug column. The resolver can only send tourists to the legacy district and area path.

Evidence: `db/schema.rb` (`catalog_listings` has no `slug`), `app/domains/catalog/listings/marketplace_show_manager.rb` (`find_by(uuid:)`), issue #206.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Listing slug](/docs/30-49-domains/catalog/catalog-decisions/#listing-slug) | Global slug, title plus short random suffix, fixed after the first publish |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) | `slug` rule and writer: `ProvidersCreateManager` |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column and index truth. Tags `ships in: S7` mark this slice |
| INV-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | Only published listings are tourist-visible. Lookup by slug follows the same rule. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **The slug text comes from `title_en`: lowercase, letters a to z and digits, words joined by hyphens, at most 60 characters. A title with no usable letters gives the text `listing`.** | Use `title_ja` when `title_en` is empty | Author decision on 2026-10-24. `title_en` is required, so a Japanese transliteration is not needed. |
| 2 | **The suffix is 4 random lowercase letters or digits. The generator retries on a collision, and stops after 10 tries.** | A 6-character suffix | Author decision on 2026-10-24. The unique index is the final guard. |
| 3 | **`Catalog::Listings::SlugGenerateService` builds the slug and returns `nil` after 10 failed tries. The Manager raises `Errors::UnprocessableContentError`.** | Raise inside the service | Services never raise `Errors::*`. |
| 4 | **Create sets the slug. Update of a draft rebuilds the text part when `title_en` changes, and keeps the suffix.** | A new suffix on each change | Author decision on 2026-10-24. A draft link changes only when the words change. |
| 5 | **The slug is fixed when `published_at` is set. No path may change it after that.** | Fix it by status | A paused or unlisted listing was published once, so `published_at` is the reliable fact. |
| 6 | **Managers set the slug. No model callback sets it.** | `before_save` callback | The project forbids model callbacks for side effects. |
| 7 | **The migration adds the column as nullable, fills every row, and then sets NOT NULL and the unique index. It holds its own small slug builder.** | Call the app service from the migration | Migrations must not depend on code that changes later. |
| 8 | **`GET /marketplace/catalog/listings/:listing_id` accepts a UUID or a slug. A value in UUID shape is a UUID. Any other value is a slug.** | A new `by_slug` route | Author decision on 2026-10-24. The quote and availability routes keep taking the UUID only. |
| 9 | **A slug lookup finds only published listings, like the UUID lookup.** | Find any status | INV-8. |
| 10 | **Marketplace list and detail, and the provider listing payloads, return `slug`.** | Marketplace only | Author decision on 2026-10-24. A provider sees the address that a title edit produces. |

## API contract

No new route ships. The changes below are in existing payloads and in one route parameter.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/listings/:listing_id` | none | | Adds `slug`. | `:listing_id` is a UUID or a slug. Unknown, or not published: 404 "We could not find that listing." |
| GET | `/marketplace/catalog/districts/:d/areas/:a/listings` | none | | Each item adds `slug`. | |
| POST | `/providers/catalog/listings` | JWT provider | Unchanged | Adds `slug`. | The server sets the slug. The client cannot send it. |
| PATCH | `/providers/catalog/listings/:listing_id` | JWT provider | Unchanged | Adds `slug`. | A draft title change rebuilds the text part. |
| GET | `/providers/catalog/listings` and `/:listing_id` | JWT provider | | Adds `slug`. | |

### Files to create or modify (API)

- `db/migrate/{timestamp}_add_slug_to_catalog_listings.rb`
- `app/domains/catalog/listings/slug_generate_service.rb` (new)
- `app/domains/catalog/listings/providers_create_manager.rb`
- `app/domains/catalog/listings/providers_update_manager.rb`
- `app/domains/catalog/listings/marketplace_show_manager.rb`, `marketplace_show_request.rb` (lookup by UUID or slug; the quote request gets the listing UUID)
- `app/domains/catalog/marketplace_listing_list_serializer.rb`, `marketplace_listing_detail_serializer.rb`
- `app/domains/catalog/providers_listing_base_serializer.rb`
- `test/support/catalog_geography_test_helper.rb` and the other helpers that create listings
- `lib/dev/catalog_marketplace_seeder.rb`
- `docs/db/catalog.dbml`, `docs/db/redcab.dbml` (remove `ships in: S7` tags)
- `db/schema.rb`, `sorbet/rbi/dsl/catalog/listing.rbi`

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: the Manager saves the listing and its slug in one save.
- Snapshots: none. Bookings keep the listing UUID.

## Out of scope

- The web routes and the 301 redirect from `/listings/:uuid` to `/listings/:listing-slug`.
- Slug lookup on the quote and availability routes.
- Slug history or redirects from an old draft slug.
- A team (admin) way to change a slug.

## Tasks

### API

- [ ] Add the migration with the backfill and `down`.
- [ ] Add `SlugGenerateService` and its tests.
- [ ] Set the slug in the create manager. Rebuild it in the update manager for drafts.
- [ ] Look up the listing by UUID or slug in the marketplace show manager.
- [ ] Add `slug` to the serializers.
- [ ] Update the test helpers and the dev seeder.
- [ ] Run `bin/rails db:migrate`, then `bundle exec tapioca dsl Catalog::Listing`.
- [ ] Remove the `S7` tags from the two DBML files.

### Web

- [ ] None in this issue. The web routes and redirects are a separate issue.

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Every listing has a unique slug after the migration.
- [ ] A new listing gets a slug in the form `{title-text}-{4 characters}`.
- [ ] Two providers with the same title get different slugs.
- [ ] A title with no usable letters gives a slug that starts with `listing-`.
- [ ] The database rejects two listings with the same slug.
- [ ] A draft title change rebuilds the text part and keeps the suffix.
- [ ] A draft title change that gives the same text keeps the slug.
- [ ] Publish does not change the slug.
- [ ] A listing with `published_at` set never gets a new slug, even if its title changes.
- [ ] `GET /marketplace/catalog/listings/:listing_id` returns a published listing for its UUID and for its slug.
- [ ] The same route returns 404 for an unknown slug and for a draft listing slug.
- [ ] Marketplace list, marketplace detail and provider payloads return `slug`.
- [ ] `catalog.dbml` has no `ships in: S7` tag.
- [ ] Controller and integration tests: `test/integration/marketplace/catalog/listings_show_integration_test.rb`, `test/controllers/providers/catalog/listings_controller_test.rb`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails db:migrate
bin/rails db:rollback && bin/rails db:migrate
bin/rails test test/domains/catalog/listings test/integration/marketplace/catalog test/controllers/providers/catalog
bin/rails test
bundle exec srb tc
bundle exec rubocop
bin/brakeman --no-pager
bin/rails db:seed
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-24 | principal developer | Author review in chat | Approved. Author confirmed decisions 1, 2, 4, 8 and 10 and the added points (fixed at `published_at`, published-only lookup, generator and migration rules, quote request, out of scope). `review-implementation-spec` was not run. |
