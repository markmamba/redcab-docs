---
title: "Keep the member who did the action on listings, bookings and reviews"
sidebar_label: API · Member columns
issue: "https://github.com/markmamba/red-cab-api/issues/268"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-260-provider-company-and-memberships.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-263-portal-access.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-264-invitations-and-members.md"
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#member-on-records"
  - "docs/30-49-domains/32-iam/iam-decisions.md#company-roles"
  - "docs/30-49-domains/32-iam/iam-decisions.md#provider-company"
  - "docs/30-49-domains/32-iam/requirements/provider-company-members.md"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#schema-ground-rules"
---

## TL;DR

- Four tables get one member column each, as the DBML designs them.
- A publish, a mark delivered, a review answer and a review report keep the member.
- A system action names no member.
- Each record keeps the latest action only, so this is not a full history.
- An owner reads the member name on four detail reads.
- Staff get the same JSON without the key.
- Tourist and team JSON hold no member.
- This spec adds no pause action and no re-publish.
- Breaking change: No for clients, because the keys are new.
  - Inside Rails, four managers and `CompleteManager` get a new required keyword.
  - Developers must run `bin/rails db:reset`.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| member | A person with a row in `providers_memberships`. A removed member keeps the row. |
| member column | A column that names a membership. Its name ends in `_by_membership_id`. |
| member key | A JSON key that holds the name of a member. |
| owner, staff | The two values of `providers_memberships.company_role`. |
| system action | A change that no person makes, such as the auto-complete sweep. |
| detail read | A provider `GET` that returns one record. |

## User stories

1. US-1: As an owner, I want to see who published a listing, so I can ask that person about it.
2. US-2: As an owner, I want to see who marked a booking delivered, because this action moves money.
3. US-3: As an owner, I want to see who wrote a review answer, because tourists read that text.
4. US-4: As an owner, I want to see who reported a review, so I can follow up.
5. US-5: As staff, I want my daily work to stay the same.
6. US-6: As a tourist, I want to deal with the company, not with one staff member.

## Problem

The owner cannot find out which member did an action on money, public text or the listing status.

- `Catalog::Listings::ProvidersPublishManager` saves the status and `published_at`, and no member.
- `Bookings::Orders::ProvidersMarkDeliveredManager` saves the company uuid in `determined_by_id`.
- `Reviews::ProviderResponses::ProvidersCreateManager` saves the company.
- `Reviews::Reviews::ProvidersReportManager` saves the flag and `flagged_at`.
- No provider JSON holds a member.
- The schema comment on `determined_by_id` still names `providers_profiles.uuid`.
- The DBML designs these four columns with the tag `ships in: I2`, but no migration exists.

A provider can reach only one listing status action today.

- `ProvidersPublishValidator#catalog_listing_is_draft?` allows a publish from `draft` only.
- No route pauses or unlists a listing, and no code in `app/` writes `paused_at`.
- Only `Catalog::Geographies::SubtreeUnlistService` sets `unlisted`.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Member on records](/docs/30-49-domains/iam/iam-decisions/#member-on-records) | Which actions keep the member, the latest action only, and no member for the system |
| Rule | [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) | A removed membership stays as a row |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | Tourists see the company name, not the member |
| Rule | [Schema ground rules](/docs/30-49-domains/catalog/catalog-decisions/#schema-ground-rules) | The slice that adds a column must read it |
| Requirement | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) | The owner sees the member, and the system names no member |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml), [bookings.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/bookings.dbml) and [reviews.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/reviews.dbml) | The four columns, the indexes and the CHECK constraints |
| Depends on | [Company and memberships](api-260-provider-company-and-memberships.md), [Portal access](api-263-portal-access.md) and [Invitations and members](api-264-invitations-and-members.md) | This spec uses their names, gates and roles |
| Paired work | [red-cab-web#195](https://github.com/markmamba/red-cab-web/issues/195) | Shows the name. The API can deploy first. |
| Later work | [redcab-docs#171](https://github.com/markmamba/redcab-docs/issues/171) and [redcab-docs#154](https://github.com/markmamba/redcab-docs/issues/154) | #171 covers pause and re-publish, and B4 of #154 holds the Reviews redesign |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Spec 6 ships the four DBML columns. | Add more columns. | The ruling names these actions. `providers_invitations` already has its column from `api-264`. |
| 2 | Each record keeps a last-actor column, and no event table ships. | A column and an event table. An event table only. The `paper_trail` gem. | The ruling asks for no full history. Today only a system unlist and a report dismiss lose a name. A table can come later. |
| 3 | The listing column has one member writer, the publish action. | Add a pause action here. | No pause action exists. Pause work writes the same column. |
| 4 | This spec does not allow a re-publish. | Change the validator here. | This is a Catalog gap that A1 of `redcab-docs#154` tracks with pause. |
| 5 | Only an owner reads the member in the provider JSON. | Every member. Nobody yet. | The ruling says the owner must be able to ask. Adding Staff later breaks nothing. Taking it away would. |
| 6 | Staff get the same JSON without the key. | Send `null` to Staff. | `null` means that the system acted, or that nobody acted yet. |
| 7 | Team endpoints show no member for now. | Add it to the team JSON. | The ruling names the owner, and the team has no use case yet. |
| 8 | The member key goes on four detail reads only. | Add it to lists. Add it to write responses. | Two pages load all four reads. Lists would need a preload on every row. |
| 9 | The key names say what happened, not the column name. | Use the column names. | `marked_delivered_by` is clear to a reader, and `determined_by_membership` is not. |
| 10 | Each key holds `first_name` and `last_name`, or `null`. | Add the email, the membership uuid or the role. | This matches `invited_by` in `api-264`. The owner already has the rest on the members page. |
| 11 | A removed member still shows by name. | Hide the name. Add `is_removed`. | The ruling keeps the row for this reason. |
| 12 | A name can be `null` on a key that exists. | Add a fallback text. | `identities_accounts.first_name` is nullable. The web decides what to show. |
| 13 | The four managers take `provider_membership:` beside `provider_company:`. | Pass the membership only. Read `CurrentRequest`. | About 100 managers use `provider_company:`. `AGENTS.md` forbids `CurrentRequest` in a manager. |
| 14 | `CompleteManager` takes a required `determined_by_membership:` that may be `nil`. | Give it a default of `nil`. | Each caller must then say who acted. |
| 15 | `CompleteValidator` adds a rule: the provider path needs a member, and the system path has none. | Rely on the CHECK. | The validator gives the message, and the constraint is the last guard, as `db/AGENTS.md` asks. |
| 16 | `SubtreeUnlistService` sets the listing member to NULL. | Keep the publisher. | The ruling keeps the latest action, and the system names no member. |
| 17 | `TeamDismissReportManager` sets the report member to NULL. | Keep the reporter. | The CHECK ties the member to the flag. A member can report again after a dismiss. |
| 18 | `determined_by_id` stays, and it keeps the company uuid. | Remove the column. | The DBML keeps it. PAY-16 needs a durable actor for the system path too. |
| 19 | A retry keeps the first member. | Overwrite the member. | `CompleteManager` returns early on a completed booking. The report validator refuses a flagged review. |
| 20 | The publish manager takes no lock. | Lock the listing row. | The last write wins, and the status and the member stay valid. Pause work must look at this again. |
| 21 | Each model gets a `belongs_to` to the membership, and the show manager preloads it. | A published Providers lookup. | The code already reads across domains this way. A lookup would change four manager return types and adds no behavior. |
| 22 | Decision 21 bends anti-pattern 13 of `backend.md`, for a display name only. | Follow the rule strictly. | The read holds no business rule. The principal developer accepted this on 2026-11-01. |
| 23 | One serializer, `Providers::ProvidersMemberNameEmbeddedSerializer`, builds the name. | Build the hash in each serializer. | One shape stays in one place, and the other domains do not read Identities columns. |
| 24 | The show managers always preload the member, also for Staff. | Preload for owners only. | The managers stay free of role logic, and the cost is two small queries on one record. |
| 25 | Each serializer removes its key with `filters_for`, unless the context allows it. | Add the key only for owners. | A missing context then hides the name, so a mistake fails safe. |
| 26 | Foreign keys use `on_delete: :restrict`, and no `on_update`. | The DBML `update: cascade`. The PostgreSQL default. | Ids never change, so cascade does nothing. The DBML refs change to match. |
| 27 | The indexes are plain, not partial. | Partial `WHERE ... IS NOT NULL` indexes. | The DBML has plain indexes, and the tables are small. |
| 28 | The new constraint uses the name `reviews_reviews_flagged_by_member_when_flagged`. | A shorter name. Rename the table. | It matches the other constraints on the table. B4 of `redcab-docs#154` owns any rename. |
| 29 | The four migrations run in one release. | The two-deploy rule of `db/AGENTS.md`. | No production system exists, as in `api-260`. |

## API contract

### The member keys

| Method | Path | Key | Read from |
| --- | --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id` | `status_changed_by` | `catalog_listings.status_changed_by_membership_id` |
| GET | `/providers/bookings/orders/:booking_id` | `marked_delivered_by` | `bookings_completion_determinations.determined_by_membership_id` |
| GET | `/providers/reviews/:review_id/provider_response` | `answered_by` | `reviews_provider_responses.answered_by_membership_id` |
| GET | `/providers/reviews/:review_id` | `reported_by` | `reviews_reviews.flagged_by_membership_id` |

Each key has this shape for an owner.

```json
{
  "marked_delivered_by": { "first_name": "Mika", "last_name": "Tanaka" }
}
```

The value is `null` when the record has no member.

| Read | The value is `null` when |
| --- | --- |
| Listing | The listing is a draft, or the system unlisted it |
| Booking | The booking is not complete, or the system completed it |
| Provider response | Never, because the column is `NOT NULL` |
| Review | Nobody reported the review, or the team dismissed the report |

A reader can tell the system from a member without a new field.

- `completed_via` says who completed a booking.
- `unlisted_at` marks a system unlist.

The key is missing from the JSON for Staff.

- A key that is missing means that the asking person may not read it.
- The rest of the JSON stays the same.

These responses get no key.

- Every list read.
- `POST /providers/catalog/listings/:listing_id/publish`.
- `POST /providers/bookings/orders/:booking_id/mark_delivered`.
- `POST /providers/reviews/:review_id/provider_response`.
- `POST /providers/reviews/:review_id/report`.
- Every tourist, marketplace and team read.

### The write paths

| Action | Writer | Column value |
| --- | --- | --- |
| Publish | `Catalog::Listings::ProvidersPublishManager` | The membership of the caller |
| Geography unlist | `Catalog::Geographies::SubtreeUnlistService` | NULL |
| Mark delivered | `Bookings::Orders::CompleteManager`, from `ProvidersMarkDeliveredManager` | The membership of the caller |
| Auto-complete | `Bookings::Orders::CompleteManager`, from `AutoCompleteSweepManager` | NULL |
| Review answer | `Reviews::ProviderResponses::ProvidersCreateManager` | The membership of the caller |
| Review report | `Reviews::Reviews::ProvidersReportManager` | The membership of the caller |
| Report dismiss | `Reviews::Reviews::TeamDismissReportManager` | NULL |

Each manager writes the column in the same transaction as the action.

A listing hidden by an expired permit or a suspension keeps its member, because its status does not change.

### Passing the member

Controllers pass `CurrentRequest.provider_membership` as a keyword.

- The gate sets it from the same row as `CurrentRequest.provider_company`.
- The keyword type is `::Providers::Membership`, and it is not nilable.
- `CompleteManager` takes `determined_by_membership: T.nilable(::Providers::Membership)` with no default.
- `CompleteValidator` receives the same value.

`CompleteValidator` adds this message to `:determined_by_membership`.

| Case | Message |
| --- | --- |
| The provider path has no member, or the system path has one | `The member does not match who completed this booking.` |

This case is a code bug, so no client sees it.

### Reading the member

`Providers::ProvidersMemberNameEmbeddedSerializer` takes a membership.

- It returns `first_name` and `last_name`, read from `object.identities_account`.
- It reads only preloaded data.

The association on each model uses the `*_by_membership` name, with `class_name: 'Providers::Membership'`.

| Model | Association | `optional` |
| --- | --- | --- |
| `Catalog::Listing` | `status_changed_by_membership` | true |
| `Bookings::CompletionDetermination` | `determined_by_membership` | true |
| `Reviews::Review` | `flagged_by_membership` | true |
| `Reviews::ProviderResponse` | `answered_by_membership` | false |

The show managers add these preloads.

| Manager | Preload |
| --- | --- |
| `Catalog::Listings::ProvidersShowManager` | `status_changed_by_membership: :identities_account` |
| `Bookings::Orders::ProvidersShowManager` | `completion_determination: { determined_by_membership: :identities_account }` |
| `Reviews::Reviews::ProvidersShowManager` | `flagged_by_membership: :identities_account` |
| `Reviews::ProviderResponses::ProvidersShowManager` | `answered_by_membership: :identities_account` |

`Providers::BaseController` gets one private helper, `member_read_context`.

- It returns `{ can_read_member: true }` for an owner.
- It returns `{ can_read_member: false }` for Staff.
- The four show actions pass it as the serializer `context`.

Four serializers add the key and define `filters_for`.

- `Catalog::ProvidersListingDetailSerializer`
- `Bookings::ProvidersBookingDetailSerializer`
- `Reviews::ProvidersPublishedReviewDetailSerializer`
- `Reviews::ProvidersProviderResponseSerializer`

`filters_for` removes the key unless `context[:can_read_member]` is true.

```ruby
# Shape, not final code. Panko 0.8.5 calls this hook in SerializationDescriptor.build.
def self.filters_for(context, _scope)
  return {} if context&.dig(:can_read_member) == true

  { except: [:marked_delivered_by] }
end
```

The create action of the provider response passes no context, so its response has no key.

The key stays on the detail classes, so the parent classes and the list reads stay as they are.

### Migration order

No production data exists, so this spec needs no backfill.

It also needs no three-step `NOT NULL` migration.

Developers run `bin/rails db:reset`, because `db:migrate` fails when local answer rows exist.

Each migration adds one column from the DBML, with its comment, its index and its foreign key.

1. `catalog_listings.status_changed_by_membership_id`, nullable.
2. `bookings_completion_determinations.determined_by_membership_id`, nullable.
   - Add the CHECK constraint below.
   - Change the comment on `determined_by_id` to the text in `docs/db/bookings.dbml`.
3. `reviews_reviews.flagged_by_membership_id`, nullable.
   - Add the CHECK constraint below.
   - The constraint `reviews_reviews_flagged_at_when_flagged` stays.
4. `reviews_provider_responses.answered_by_membership_id`, `NOT NULL`.

```sql
-- docs/db/bookings.dbml:96-98
-- bookings_completion_determinations_member_on_provider_path
CHECK ((determined_by_type = 'provider') = (determined_by_membership_id IS NOT NULL))

-- docs/db/reviews.dbml:68
-- reviews_reviews_flagged_by_member_when_flagged
CHECK (is_flagged_by_provider = (flagged_by_membership_id IS NOT NULL))
```

The index names come from the DBML.

- `index_catalog_listings_on_status_changed_by_membership_id`
- `index_bookings_completion_determinations_on_membership_id`
- `index_reviews_reviews_on_flagged_by_membership_id`
- `index_reviews_provider_responses_on_answered_by_membership_id`

After the migrations, the same PR updates the DBML.

- It removes the `ships in: I2` tags of these columns.
- It removes `update: cascade` from these four refs.
- It does this in the per-context files and in `docs/db/redcab.dbml`.

### Docs this spec changes

| Page | Change |
| --- | --- |
| `docs/30-49-domains/32-iam/iam-decisions.md`, section Member on records | Adds that only an owner reads the member |
| `docs/30-49-domains/32-iam/requirements/provider-company-members.md` | Adds the rule, and a Staff example |

### Files to create or modify (API)

Migrations and DBML:

- `db/migrate/` (four new migrations)
- `docs/db/catalog.dbml`, `docs/db/bookings.dbml`, `docs/db/reviews.dbml` and `docs/db/redcab.dbml`

Models:

- `app/domains/catalog/listing.rb`
- `app/domains/bookings/completion_determination.rb`
- `app/domains/reviews/review.rb`
- `app/domains/reviews/provider_response.rb`

Writers:

- `app/domains/catalog/listings/providers_publish_manager.rb`
- `app/domains/catalog/geographies/subtree_unlist_service.rb`
- `app/domains/bookings/orders/providers_mark_delivered_manager.rb`
- `app/domains/bookings/orders/complete_manager.rb`
- `app/domains/bookings/orders/complete_validator.rb`
- `app/domains/bookings/orders/auto_complete_sweep_manager.rb`
- `app/domains/reviews/provider_responses/providers_create_manager.rb`
- `app/domains/reviews/reviews/providers_report_manager.rb`
- `app/domains/reviews/reviews/team_dismiss_report_manager.rb`

Readers:

- `app/domains/providers/providers_member_name_embedded_serializer.rb` (create)
- `app/domains/catalog/listings/providers_show_manager.rb`
- `app/domains/catalog/providers_listing_detail_serializer.rb`
- `app/domains/bookings/orders/providers_show_manager.rb`
- `app/domains/bookings/providers_booking_detail_serializer.rb`
- `app/domains/reviews/reviews/providers_show_manager.rb`
- `app/domains/reviews/providers_published_review_detail_serializer.rb`
- `app/domains/reviews/provider_responses/providers_show_manager.rb`
- `app/domains/reviews/providers_provider_response_serializer.rb`

Controllers:

- `app/controllers/providers/base_controller.rb` (add `member_read_context`)
- `app/controllers/providers/catalog/listings_controller.rb`
- `app/controllers/providers/bookings/orders_controller.rb`
- `app/controllers/providers/reviews/reviews_controller.rb`
- `app/controllers/providers/reviews/provider_responses_controller.rb`
- `app/controllers/providers/reviews/reports_controller.rb`

Dev data:

- `lib/dev/completed_order_factory.rb` (pass an owner membership)
- `lib/dev/team_reviews_moderation_seeder.rb` (set the member on a flagged review)

### Code to remove

This spec removes no code.

- It adds columns, keywords and keys only.
- It replaces one schema comment, on `determined_by_id`.

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [api-260](api-260-provider-company-and-memberships.md) | The note on `determined_by_id` in Data / domain touchpoints, and the out-of-scope line for the member columns |
| [api-263](api-263-portal-access.md) | The out-of-scope line for the member columns |
| [api-264](api-264-invitations-and-members.md) | The out-of-scope line for the member columns |
| [api-266](api-266-available-packages.md) | The out-of-scope line for the member columns |

This spec changes no Catalog scope, so it replaces no part of [api-208](../cat/api-208-keyword-search.md) or [api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md).

### Tests that must change

| Test files | Change |
| --- | --- |
| `test/support/bookings_test_helper.rb` | Set the member on a provider completion |
| `test/domains/catalog/listings/providers_publish_manager_test.rb` | Pass the keyword, and assert the member |
| `test/controllers/providers/catalog/listings_controller_test.rb` | Assert the key for an owner and for Staff |
| `test/domains/catalog/geographies/subtree_unlist_service_test.rb` | Assert NULL after an unlist |
| `test/domains/bookings/completion_determination_test.rb` | Assert the CHECK |
| `test/domains/bookings/orders/complete_manager_test.rb` | Pass the keyword, and assert the validator rule |
| `test/domains/bookings/orders/auto_complete_sweep_manager_test.rb` | Assert NULL on the system path |
| `test/domains/bookings/orders/providers_mark_delivered_manager_test.rb` | Pass the keyword, and assert the member |
| `test/integration/providers/bookings/orders_mark_delivered_integration_test.rb` | Assert the member after the request |
| `test/domains/reviews/provider_responses/providers_create_validator_test.rb` | Set the member on the row that it builds |
| `test/integration/providers/reviews/provider_response_integration_test.rb` | Assert the member and the key |
| `test/integration/providers/reviews/report_integration_test.rb` | Assert the member, and set it on flagged rows |
| `test/integration/providers/reviews/reviews_index_integration_test.rb` | Set the member on flagged rows |
| `test/integration/providers/catalog/listing_reviews_integration_test.rb` | Set the member on flagged rows |
| `test/domains/reviews/reviews/team_dismiss_report_validator_test.rb` | Set the member on flagged rows |
| `test/integration/team/reviews/moderation_integration_test.rb` | Assert NULL after a dismiss, and no key in the team JSON |

New tests cover these behaviors.

- The database refuses a provider completion with no member.
- The database refuses a system completion with a member.
- The database refuses a flagged review with no member.
- The database refuses a review answer with no member.
- The database refuses to delete a membership that a record names.
- A system unlist clears the member of a published listing.
- A second mark delivered by another member keeps the first member.
- A report after a dismiss saves the new member.
- A manager saves a membership of the same company as the record.
- An owner gets each of the four keys with a name.
- Staff get none of the four keys, on each of the four reads.
- A read with no serializer context gets no key.
- An owner gets `null` on a draft listing and on an auto-completed booking.
- A removed member still shows by name, also after a new invitation.
- A member whose role changed still shows by name.
- A locked or archived person still shows by name.
- The four show reads make no query in the serializer.
- No list read, write response, tourist read or team read holds a member key.

## Data / domain touchpoints

- Bounded context: IAM, with the columns in Catalog, Bookings and Reviews.
- Transaction boundaries:
  - The publish writes the status and the member in one transaction.
  - `CompleteManager` writes the order and the determination in one transaction.
  - The answer, the report and the dismiss each write one row.
- Snapshots: none, and `bookings_completion_determinations` stays append-only.
- Events: `BookingCompleted` and `ListingUnlisted` keep their payloads.
- A person with a removed membership and a new membership has two rows, and old records keep the old row.

## Worked example

Kenji owns Kanto Charter, and Mika is staff.

1. Mika publishes a draft listing, and the API saves the membership in `status_changed_by_membership_id`.
2. Kenji reads the listing, and the JSON says `"status_changed_by": { "first_name": "Mika", "last_name": "Tanaka" }`.
3. Mika reads the same listing, and the JSON has no `status_changed_by` key.
4. Mika marks a booking delivered, and the determination saves the membership.
5. The sweep completes another booking, and the determination has no member.
6. Kenji reads that booking, and `marked_delivered_by` is `null`, with `completed_via` for the system.
7. Mika answers a review, and the answer saves the membership.
8. Mika reports another review, and the team dismisses the report.
9. The API clears `flagged_by_membership_id`, so `reported_by` is `null`.
10. Kenji removes Mika, and the first booking still says `Mika Tanaka`.
11. The team deactivates the prefecture, and the listing becomes `unlisted`.
12. `status_changed_by` is `null`, because the system did the latest action.
13. A tourist reads the answer and sees "Kanto Charter".

## Out of scope

- A provider action to pause or unlist a listing, which [redcab-docs#171](https://github.com/markmamba/redcab-docs/issues/171) covers.
- A re-publish after a pause or an unlist, which the same issue covers.
- A full history of actions, or an event table.
- The member key on lists and write responses.
- The member in team JSON.
- The web lines, which [red-cab-web#195](https://github.com/markmamba/red-cab-web/issues/195) covers.
- The team serializer on `POST /providers/reviews/:review_id/report`, and the Reviews redesign.
  - Topic B4 of [redcab-docs#154](https://github.com/markmamba/redcab-docs/issues/154) tracks both.
- The update of `AGENTS.md`, `db/AGENTS.md`, `backend.md` and the `.dbdiagram` files, which wait until I2 ships.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- The owner must confirm that no law or contract needs a full action history.
- A legal check must answer what happens when a person asks for erasure.
  - `on_delete: :restrict` keeps the row, so the name stays.
- An admin action and a system action both show NULL if a team listing action comes later.
- Pause work must set the label that the web shows, and it must look at the publish lock.

## Tasks

### API

- [ ] Add the four migrations, and update the DBML.
- [ ] Add the four associations.
- [ ] Pass the member to the four managers and to `CompleteManager`.
- [ ] Add the rule to `CompleteValidator`.
- [ ] Write NULL in `SubtreeUnlistService` and `TeamDismissReportManager`.
- [ ] Add the embedded serializer and the four keys.
- [ ] Add the preloads and `member_read_context`.
- [ ] Update the dev data and the test helpers.
- [ ] Update the tests.
- [ ] Run the checks in [Verification](#verification).

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A publish, a mark delivered, a review answer and a review report each keep the member.
- [ ] A geography unlist and an auto-complete name no member.
- [ ] A team dismiss clears the report member.
- [ ] A retry keeps the first member.
- [ ] The database refuses a provider completion with no member, and a system completion with one.
- [ ] The database refuses a flagged review with no member, and a review answer with no member.
- [ ] The database refuses to delete a membership that a record names.
- [ ] An owner reads the four keys on the four detail reads.
- [ ] Staff get the same JSON without the key.
- [ ] A read with no context holds no key.
- [ ] A removed member still shows by name.
- [ ] Lists, write responses, tourist JSON and team JSON hold no member key.
- [ ] No serializer makes a query.

## Verification

```bash
# API (from red-cab-api/)
bin/rails db:reset
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
git grep -n '_by_membership' -- db/schema.rb
git grep -n 'ships in: I2' -- docs/db | grep '_by_membership'
git grep -n -E 'status_changed_by|marked_delivered_by|answered_by|reported_by' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
