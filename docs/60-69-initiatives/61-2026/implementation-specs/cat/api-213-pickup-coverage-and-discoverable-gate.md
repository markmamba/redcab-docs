---
title: "Add pickup coverage and the discoverable gate"
sidebar_label: API · Pickup coverage
issue: "https://github.com/markmamba/red-cab-api/issues/213"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#pickup-coverage-registration"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-205-additional-destinations.md"
---

## TL;DR

- Ships the table `catalog_listing_pickup_coverages` and the model for it.
- Ships a validator: each row is an active prefecture, municipality or ward, and no row sits inside another row.
- Ships a coverage service that answers whether a geography node is covered.
- Ships provider endpoints `GET` and `PUT` for the coverage of one listing.
- Listing create pre-fills coverage from the profile prefectures and returns the labels it skipped.
- A migration fills coverage for existing listings from the same profile prefectures.
- `Catalog::Listing.discoverable` now needs at least one coverage row.
- An archive with a successor moves the coverage rows to the successor.
- Does NOT ship the booking location check, the refund path, map-drawn coverage or the web form.
- Breaking change: Yes, because a published listing with no coverage row leaves the marketplace lists.

## Problem

The platform cannot tell where a provider picks up tourists.

Providers record only `service_prefectures` on the profile, and that field is not listing coverage.

A published listing with no coverage still appears in browse and search.

Evidence: `app/domains/catalog/listing.rb` (`discoverable` scope has no coverage test), `db/schema.rb` (no coverage table), issue #213.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Pickup coverage registration](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-registration) | A coverage row is a prefecture, a municipality or a ward. A path match decides coverage. A draft may have none. |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | A destination never creates pickup coverage. |
| Ruling | [Pickup coverage validation timing](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-validation-timing) | A confirmed booking stays valid when coverage changes. The booking check is issue #214. |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) | The coverage table and its rules |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth. Tags `ships in: S6` mark this slice. |
| Model | [Geography model](/docs/30-49-domains/catalog/models/geography) | The path column and the four levels |
| Slice S3 | [Spec api-205](./api-205-additional-destinations.md) | The pattern for a replace service, a validation module and an archive merge. Merged. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. The provider edits coverage through its own endpoint: `GET` and `PUT /providers/catalog/listings/:listing_id/pickup_coverages`. `PUT` replaces the whole list.** | A field on listing update. | One request lets the validator check the full set. Listing update does not change coverage. |
| 2 | **Owner ruling, 2026-10-26. The discoverable gate turns on in this PR, after a backfill migration.** | A later PR, or a setting. | Existing published listings keep appearing if the backfill works. |
| 3 | **Owner ruling, 2026-10-26. A profile label that maps to no active prefecture is skipped. The create response returns `skipped_prefectures`, a list of those labels.** | Skip with no message, or reject the create. | The provider learns what was skipped. Nothing blocks the create. |
| 4 | **Owner ruling, 2026-10-26. Publishing does not need a coverage row. Only the discoverable gate needs one.** | Add coverage to the publish gate. | The issue says a draft may have no coverage. The docs add no publish rule. |
| 5 | **Owner ruling, 2026-10-26. An archive with a successor moves the coverage rows to the successor.** | Leave it for api-216, or reject the archive. | The DBML says an archive moves coverage rows. |
| 6 | **Owner ruling, 2026-10-26. The backfill covers every listing of every status.** | Only published listings. | It matches the create pre-fill. |
| 7 | **Added point, please review. The table has a unique pair `listing_id` and `geography_id`, and an index on `geography_id`, as in the DBML.** | A JSON array on the listing. | The DBML defines the table. |
| 8 | **Added point, please review. A row must be an `active` node with level `subdivision`, `municipality` or `ward`. A region is rejected.** | Allow any level. | The ruling and the DBML note say so. A city that is not listable is still valid coverage. |
| 9 | **Added point, please review. The validator rejects a node when an ancestor of it is also in the request. The check reads `path`, not `parent_id`.** | Check only the direct parent. | Tokyo and a ward of Tokyo can have a municipality between them. |
| 10 | **Added point, please review. The request has no size limit. Duplicates are rejected.** | A limit of 5 like destinations. | No document sets a limit. |
| 11 | **Added point, please review. A node is covered when `L.path = C.path` or `L.path` starts with `C.path` plus `/`. The query uses `starts_with`, so it needs no escaping.** | Compare `parent_id` chains. | The DBML defines this rule (DP-6c). |
| 12 | **Added point, please review. The service has two methods: `covered?(listing:, geography:)` and a scope `Catalog::Listing.covering(geography)`.** | Only the first method. | Issue #214 and later lists can use the scope. This issue ships both and uses neither in a booking check. |
| 13 | **Added point, please review. The pre-fill and the backfill match a label to `name_en` of an active prefecture. The match ignores case and outer spaces.** | Match `name_ja` or a code. | The profile list holds English names such as "Tokyo". |
| 14 | **Added point, please review. The pre-fill runs inside the create transaction. A repeated label makes one row.** | A job after the create. | The provider sees the rows in the create response. |
| 15 | **Added point, please review. The backfill is its own migration, apart from the table migration. It is safe to run twice. Its `down` does nothing.** | One migration. | Rows from the backfill and from providers cannot be told apart. |
| 16 | **Added point, please review. The backfill skips unmatched labels without a message. The PR body lists how many published listings still have no row.** | Fail the migration. | No provider is present to tell. A hidden listing needs the provider to add coverage. |
| 17 | **Added point, please review. A provider may change coverage on a listing of any status. A change applies to future checkouts only.** | Block edits on a published listing. | The DBML says changes apply to future attempts (AC-48, AC-49). |
| 18 | **Added point, please review. The archive merge works like api-205 and adds clash rules. If the listing already covers the successor, or an ancestor of it, the old row is deleted. If the listing covers a node below the successor, those rows are deleted and the old row moves.** | Keep both rows. | Rule 9 forbids nested rows. The broader node wins. |
| 19 | **Added point, please review. An archive is rejected when coverage rows use the node and the successor is not an active prefecture, municipality or ward.** | Move the rows anyway. | The rows must stay valid coverage. |
| 20 | **Added point, please review. Deactivation (OPR-10) does not change coverage rows.** | Delete the rows. | Same as api-205 decision 9. |
| 21 | **Added point, please review. The test helpers add one coverage row at the primary destination of a new listing.** | Add rows in each test. | Many tests make published listings that must stay discoverable. |
| 22 | **Added point, please review. The marketplace payloads do not change. Only provider payloads and the create response carry coverage data.** | Show coverage to tourists. | Web issue #157 and the checkout need the data first. |

## API contract

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id/pickup_coverages` | JWT provider | | `pickup_coverages`: list of `{ uuid, geography_id, name_en, name_ja, level, path }` | Listing must belong to the provider. Else 404. |
| PUT | `/providers/catalog/listings/:listing_id/pickup_coverages` | JWT provider | `geography_ids`: list of node UUIDs. An empty list clears coverage. | Same as GET | Error 422 for the cases below. |
| POST | `/providers/catalog/listings` | JWT provider | Unchanged | Adds `skipped_prefectures`: list of labels | Pre-fills coverage from the profile. |
| POST | `/team/catalog/geographies/:geography_id/archive` | JWT admin | `successor_geography_id` | Unchanged | Moves the coverage rows. See decisions 18 and 19. |
| GET | `/marketplace/catalog/listings` and related lists | none | | Unchanged shape | Through `discoverable`. A listing with no coverage row is hidden. |

Error text:

- Required key: "Please send the list of pickup coverage places."
- Not found: "Please select valid pickup coverage places."
- Not active: "Please select active pickup coverage places."
- Wrong level: "Pickup coverage must be a prefecture, a city or a ward."
- Duplicate: "Please list each pickup coverage place only once."
- Nested: "A pickup coverage place cannot be inside another selected place."
- Archive: "Choose an active prefecture, city or ward as successor, because listings use this node as pickup coverage."

### Files to create or modify (API)

- `db/migrate/{timestamp}_create_catalog_listing_pickup_coverages.rb`
- `db/migrate/{timestamp}_backfill_catalog_listing_pickup_coverages.rb`
- `app/domains/catalog/listing_pickup_coverage.rb` (new model)
- `app/domains/catalog/listing.rb` (association `pickup_coverages`, `discoverable` SQL, scope `covering`, transient `skipped_prefectures`)
- `app/domains/catalog/listings/pickup_coverage_validation.rb` (new)
- `app/domains/catalog/listings/pickup_coverage_replace_service.rb` (new)
- `app/domains/catalog/listings/pickup_coverage_prefill_service.rb` (new)
- `app/domains/catalog/listings/pickup_coverage_match_service.rb` (new, the `covered?` method)
- `app/domains/catalog/listing_pickup_coverages/providers_{index,replace}_{request,validator,manager}.rb` (new)
- `app/domains/catalog/listings/providers_create_manager.rb` (pre-fill)
- `app/domains/catalog/providers_listing_pickup_coverage_serializer.rb` and `providers_listing_create_serializer.rb` (new)
- `app/controllers/providers/catalog/listing_pickup_coverages_controller.rb` (new)
- `app/controllers/providers/catalog/listings_controller.rb` (create response)
- `config/routes/providers_routes.rb`
- `app/domains/catalog/geographies/pickup_coverage_merge_service.rb` (new)
- `app/domains/catalog/geographies/team_archive_validator.rb`, `team_archive_manager.rb`
- `test/support/catalog_geography_test_helper.rb` and the listing helpers
- `lib/dev/catalog_marketplace_seeder.rb` (dev listings get coverage)
- `docs/db/catalog.dbml`, `docs/db/redcab.dbml` (remove `ships in: S6` tags)
- `db/schema.rb`, `sorbet/rbi/dsl/catalog/*.rbi`

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: the create pre-fill, the `PUT` replace and the archive move each run in one transaction.
- Snapshots: none, because issue #214 reads coverage at checkout and at booking.
- Query change: `discoverable` gets one more `EXISTS`, and the PR body carries an EXPLAIN.

## Out of scope

- The booking location check and the refund path (issue #214).
- The web coverage form and the checkout booking location (web issue #157).
- Map-drawn and street-address coverage.
- Coverage in marketplace payloads.
- A change to the `service_prefectures` field, which stays on the profile.

## Tasks

### API

- [ ] Add the table migration, the model and the associations.
- [ ] Add `PickupCoverageValidation` and the replace service.
- [ ] Add the match service and the scope `covering`.
- [ ] Add the provider endpoints, the serializer and the routes.
- [ ] Pre-fill coverage in listing create and return `skipped_prefectures`.
- [ ] Add the backfill migration.
- [ ] Add the archive merge service, the validator rule and the manager step.
- [ ] Add the coverage test to `Catalog::Listing.discoverable`.
- [ ] Update the test helpers and add the tests.
- [ ] Run `bin/rails db:migrate`, then `bundle exec tapioca dsl`.
- [ ] Remove the `S6` tags from the two DBML files.

### Web

- [ ] None in this issue, because web issue #157 covers the form.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] Coverage `kanto/tokyo` covers Shinjuku and does not cover Naka-ku of Yokohama.
- [ ] Coverage `kanto/tokyo` also covers Tokyo itself.
- [ ] A path that shares only a prefix of letters is not covered, such as `kanto/tokyo-west` under `kanto/tokyo`.
- [ ] Tokyo and Shinjuku together are rejected.
- [ ] A region, an inactive node, an unknown node and a duplicate are rejected.
- [ ] A draft may have no coverage rows.
- [ ] A listing with no coverage row is hidden from browse and search.
- [ ] `PUT` with an empty list clears the rows.
- [ ] Another provider cannot read or change the coverage of a listing.
- [ ] Listing create fills one row for each profile label that maps to an active prefecture.
- [ ] Listing create returns an unmatched label in `skipped_prefectures`.
- [ ] A destination never creates a coverage row.
- [ ] The backfill fills rows for listings of every status and is safe to run twice.
- [ ] An archive with a successor moves the rows and follows the clash rules.
- [ ] An archive is rejected when rows exist and the successor is not a valid coverage node.
- [ ] A coverage change does not change a confirmed booking or a live hold.
- [ ] `catalog.dbml` has no `ships in: S6` tag.
- [ ] No client-side price computation.
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails db:migrate
bin/rails db:rollback && bin/rails db:migrate
PARALLEL_WORKERS=1 bin/rails test test/domains/catalog test/controllers/providers/catalog test/integration
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-26 | owner | Author review in chat | Approved. Owner ruled on decisions 1 to 6 and approved the added points 7 to 22. `review-implementation-spec` was not run. |
