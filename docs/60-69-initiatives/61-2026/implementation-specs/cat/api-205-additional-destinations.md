---
title: "Add additional destinations to a listing"
sidebar_label: API · Additional destinations
issue: "https://github.com/markmamba/red-cab-api/issues/205"
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

- Ships the table `catalog_listing_additional_destinations` and the model for it.
- Ships a validator: each row is an active prefecture, and it is not the primary destination.
- A listing can have at most 5 additional destinations.
- Provider create and update requests take `additional_geography_ids`. Provider payloads return it.
- `Catalog::Geography.discoverable` now also counts additional destinations.
- An archive with a successor moves the rows to the successor.
- Does NOT ship pickup coverage, new endpoints, new URLs, listing pages or the web provider form.
- Breaking change: No for request fields, because the new field is optional. Yes for marketplace lists: the districts and near-me lookups can show more prefectures.

## Problem

A listing has one destination. A tour that also goes to Yokohama needs a second listing.

A tourist who browses Kanagawa cannot find a Tokyo tour that also goes there.

`Catalog::Geography.discoverable` only reads the primary destination of a listing.

Evidence: `app/domains/catalog/geography.rb` (`discoverable` scope), `db/schema.rb` (no destination table), issue #205.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | One primary destination. Zero or more additional prefectures. They never create pickup coverage. |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) | The two destination tables and their rules |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Table and index truth. Tags `ships in: S3` mark this slice |
| INV-8 | [Invariants](/docs/70-79-business/business-rules/invariants) | A node shows only with a discoverable listing that has a destination below it |
| INV-11, OPR-10 | [Invariants](/docs/70-79-business/business-rules/invariants) | Archive keeps history. Deactivation unlists by the primary destination subtree. |
| FR-CAT-033 | [Catalog functional requirements](/docs/70-79-business/requirements/functional-requirements/cat) | The single attach rule that the ruling replaces |
| Slice S2 | [Spec api-204](./api-204-primary-destination-prefecture.md) | The primary destination. Merged in red-cab-api#218. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **A listing has at most 5 additional destinations** | 10, or no limit | Author decision on 2026-10-24. Five prefectures is enough for a tour. It keeps listing cards focused. |
| 2 | **New table with a unique pair `listing_id` and `geography_id`, and an index on `geography_id` and `listing_id`** | A JSON array on the listing | The DBML defines the table. The index serves scope lookups. |
| 3 | **Hard delete is allowed for these rows** | Soft delete | The DBML says bookings do not refer to destinations. |
| 4 | **`AdditionalDestinationsValidation` checks each node: it exists, is `active`, has level `subdivision`, and is not the primary destination** | Allow any active node | The ruling says additional destinations are other prefectures. |
| 5 | **The same prefecture cannot appear twice in one request, and the list has at most 5 items** | Ignore duplicates | A clear error is better than silent removal. |
| 6 | **Update: an omitted key keeps the current list. An empty list clears it. A non-empty list replaces it.** | An omitted key clears the list | Author decision on 2026-10-24. The old web form does not send the key and must not erase data. |
| 7 | **A new primary destination that equals a current additional destination is rejected** | Delete the row silently | A guard must block, not change data without notice. |
| 8 | **`Catalog::Geography.discoverable` also counts a published listing that has an additional destination at or below the node path** | Leave it for the region pages slice | Author decision on 2026-10-24. The ruling says a node shows when a discoverable listing has a destination in its subtree. |
| 9 | **Deactivation (OPR-10) does not change listings that have the node only as an additional destination. The row stays.** | Unlist them, or delete the row | Author decision on 2026-10-24. OPR-10 stays about the primary destination subtree. Scope lookups already read only active nodes. |
| 10 | **Archive with a successor moves the rows to the successor, inside the archive transaction. If the listing already has the successor as additional or primary destination, the system deletes the old row.** | Reject the archive | The unique pair and the primary rule would otherwise fail. The listing keeps the successor as a destination. |
| 11 | **Archive is rejected when rows exist and the successor is not an active prefecture** | Move the rows anyway | The rows must stay prefectures. The error text tells the admin to choose a prefecture. |
| 12 | **Marketplace listing payloads do not change in this slice** | Add the list to marketplace detail | Pages for it come in later slices. Only provider payloads return the list. |

## API contract

No new endpoint ships. The changes below are in existing provider payloads and in the geography archive.

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/providers/catalog/listings` | JWT provider | `additional_geography_ids` (optional list of prefecture UUIDs, at most 5) | Field `additional_geography_ids` (list of UUIDs) | Error 422 for an unknown, inactive, non-prefecture, duplicate or primary node |
| PATCH | `/providers/catalog/listings/:listing_id` | JWT provider | Same. Omitted key keeps the list. | Same | Same errors. A new primary destination in the list is also rejected. |
| GET | `/providers/catalog/listings` and `/:listing_id` | JWT provider | | Field `additional_geography_ids` | |
| POST | `/team/catalog/geographies/:geography_id/archive` | JWT admin | `successor_geography_id` | Unchanged | Moves the rows. Error when the successor is not an active prefecture and rows exist. |
| GET | `/marketplace/catalog/districts` and `/marketplace/catalog/areas/near` | none | | Unchanged shape. A prefecture can appear when a published listing has it as an additional destination. | Through `discoverable` |

Error text:

- Limit: "A listing can have at most 5 additional destinations."
- Not found: "Please select valid additional destinations."
- Not active: "Please select active additional destinations."
- Not a prefecture: "Additional destinations must be prefectures."
- Same as primary: "An additional destination cannot be the primary destination."
- Duplicate: "Please list each additional destination only once."
- Archive: "Choose an active prefecture as successor. Some listings use this node as an additional destination."

### Files to create or modify (API)

- `db/migrate/{timestamp}_create_catalog_listing_additional_destinations.rb`
- `app/domains/catalog/listing_additional_destination.rb` (new model)
- `app/domains/catalog/listing.rb` (association `additional_destinations`)
- `app/domains/catalog/geography.rb` (`discoverable` SQL)
- `app/domains/catalog/listings/additional_destinations_validation.rb` (new)
- `app/domains/catalog/listings/providers_create_{request,validator,manager}.rb`
- `app/domains/catalog/listings/providers_update_{request,validator,manager}.rb`
- `app/domains/catalog/providers_listing_base_serializer.rb`, `providers_listing_detail_serializer.rb`
- `app/domains/catalog/geographies/team_archive_validator.rb`, `team_archive_manager.rb`
- `app/domains/catalog/geographies/additional_destinations_merge_service.rb` (new)
- `test/support/catalog_geography_test_helper.rb`
- `docs/db/catalog.dbml`, `docs/db/redcab.dbml` (remove `ships in: S3` tags)
- `db/schema.rb`, `sorbet/rbi/dsl/catalog/*.rbi`

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: the provider create and update save the listing and its rows in one transaction. The archive moves the rows in the archive transaction.
- Snapshots: none. Bookings do not read destinations.

## Out of scope

- Pickup coverage (slice S6). A destination never creates coverage.
- The web provider form.
- Region and prefecture listing pages, and keyword search by destination name.
- Marketplace payloads for the list.
- Changes to `SubtreeUnlistService` and deactivation.

## Tasks

### API

- [ ] Add the migration, the model and the associations.
- [ ] Add `AdditionalDestinationsValidation` and use it in the provider create and update validators.
- [ ] Save the rows in the provider create and update managers.
- [ ] Return `additional_geography_ids` in the provider serializers.
- [ ] Extend `Geography.discoverable`.
- [ ] Add the archive merge service, the validator rule and the manager step.
- [ ] Update the test helper and the tests.
- [ ] Run `bin/rails db:migrate`, then `bundle exec tapioca dsl`.
- [ ] Remove the `S3` tags from the two DBML files.

### Web

- [ ] None in this issue. The provider form is a separate issue.

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] A listing can have several additional destinations and one primary destination.
- [ ] The database rejects the same prefecture twice for one listing.
- [ ] The validator rejects a sixth additional destination.
- [ ] The validator rejects a region, a city, a ward, an inactive node, an unknown node and the primary destination.
- [ ] Provider update with the key omitted keeps the rows.
- [ ] Provider update with an empty list removes the rows.
- [ ] Provider update that sets the primary destination to a current additional destination fails.
- [ ] The provider payload returns `additional_geography_ids`.
- [ ] `Catalog::Geography.discoverable` returns a prefecture and its region when a published listing has the prefecture only as an additional destination.
- [ ] An archive with a successor moves the rows to the successor.
- [ ] An archive deletes a row when the listing already has the successor as a destination.
- [ ] An archive is rejected when rows exist and the successor is not an active prefecture.
- [ ] Deactivating a prefecture leaves the listings that use it as an additional destination published.
- [ ] `catalog.dbml` has no `ships in: S3` tag.
- [ ] Controller tests: `test/controllers/providers/catalog/listings_controller_test.rb`
- [ ] Integration test: `test/integration/team/catalog/geographies_lifecycle_integration_test.rb`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails db:migrate
bin/rails db:rollback && bin/rails db:migrate
bin/rails test test/domains/catalog test/controllers/providers/catalog test/integration
bin/rails test
bundle exec srb tc
bundle exec rubocop
bin/brakeman --no-pager
bin/rails db:seed
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-24 | principal developer | Author review in chat | Approved. Author confirmed decisions 1, 6, 8 and 9 and the added points (archive merge, primary conflict, duplicates, provider-only payloads, field name). `review-implementation-spec` was not run. |
