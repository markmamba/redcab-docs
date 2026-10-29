---
title: "Add cancellation policy presets and custom tiers"
sidebar_label: API · Cancellation policy
issue: "https://github.com/markmamba/red-cab-api/issues/168"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/architecture-decisions/cancellation-policy.md"
  - "docs/30-49-domains/38-catalog/models/listings-and-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-213-pickup-coverage-and-discoverable-gate.md"
---

## TL;DR

- Ships the presets Flexible, Moderate and Strict, and the custom policy with 1 to 4 tiers.
- Ships provider endpoints `GET` and `PUT` for the cancellation policy of one listing.
  - They work on a published listing.
- Ships a validator for the custom tiers.
- Checkout refuses when the policy changed after the tourist read it.
- A new listing starts with Flexible.
- A data migration moves `platform_default` listings, and invalid `custom` listings, to Flexible.
- Listing create and update stop taking `cancellation_policy_source`.
- Ships in two pull requests, so that old code never reads a value it does not know.
- Does NOT ship the refund amount, the cancel command or the web form.
- Breaking change: Yes for the web.
  - The checkout must send the policy it showed.
  - The provider form value is ignored until the web uses the new endpoint.

## Problem

A provider cannot set a cancellation policy.

- The listing update request takes `cancellation_policy_source` but no tiers.
- A provider can choose `custom` and cannot add a tier.
- Checkout then fails with "This listing does not have a cancellation policy configured yet."
- The listing update works on draft listings only, so a published listing cannot change its policy.
- An update that omits the key resets the source to `platform_default`.
- Checkout copies the current policy, which may not be the policy the tourist read.

Evidence: `app/domains/catalog/listings/providers_update_request.rb`, `providers_update_manager.rb` (the default on lines 65 and 66), `app/domains/bookings/checkout_sessions/tourists_create_request.rb` (only `is_cancellation_policy_agreed`), `tourists_create_validator.rb` (`custom_cancellation_policy_configured?`), issue #168.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Decision | [Cancellation policy with presets and custom tiers](/docs/30-49-domains/catalog/architecture-decisions/cancellation-policy) | The only source for the presets, the custom checks and the checkout rules 9 and 10 |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) | The pricing policy holds the cancellation for all packages |
| Spec | api-213 | The pattern for a `GET` and `PUT` pair that replaces a list |
| Invariant | [Invariants](/docs/70-79-business/business-rules/invariants) `INV-1`, `BKG-1`, `BKG-8` | A booking keeps the policy it copied at checkout. A tourist agrees to it before payment. |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Column truth |
| Convention | `red-cab-api/AGENTS.md`, `app/domains/AGENTS.md` | Request, Manager, Validator and route rules |

## Design decisions

Each row says who made the decision.

"Added point, please review" means the author added it.

The owner must confirm or change each row before approval.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-29. The preset names, the preset tiers, the custom checks and the checkout rules are the ones on the decision page.** This spec does not repeat the tables. | Copy the tables here. | Two copies drift apart. |
| 2 | **Owner ruling, 2026-10-29. The migration moves every `platform_default` listing to Flexible.** | Moderate, which equals today's tiers (72h 100%, 24h 50%, 0h 0%). Let providers choose. | The owner wants one default. New checkouts on existing listings get a more generous refund. Existing bookings keep their copied tiers. |
| 3 | **Owner ruling, 2026-10-29. Providers get no notice of the move to Flexible.** | A note in the portal. An email. | Notifications are a later issue. |
| 4 | **Owner ruling, 2026-10-29. The migration moves a `custom` listing to Flexible when it has no tiers, or tiers that fail the new checks. It deletes those tier rows. A valid custom policy stays.** | Move every custom listing. Leave them. | Every listing ends with a valid policy, and valid provider rules stay. |
| 5 | **Owner ruling, 2026-10-29. The provider sets the policy through its own endpoint: `GET` and `PUT /providers/catalog/listings/:listing_id/cancellation_policy`. Listing create and update stop taking `cancellation_policy_source`.** | Keep the field on create and update. | The listing update works on drafts only, and a published listing must be able to change its policy. |
| 6 | **Owner ruling, 2026-10-29. Checkout create sends the policy that the tourist read. The API refuses when it differs from the current policy.** | Copy the current policy. Block changes during open sessions. | Decision page rule 9. The tourist agrees to the policy that the booking copies (`BKG-1`). |
| 7 | **Owner ruling, 2026-10-29. Checkout allows a booking inside a 0 percent window.** The API adds no rule. | Block the booking. | Decision page rule 10. The web shows the statement. |
| 8 | **Owner ruling, 2026-10-29. Ship in two pull requests.** PR 1 reads old and new values and ships the endpoints. PR 2 runs the data migration and removes `platform_default` from Catalog. | One pull request. | Old code never reads a value it does not know, so no checkout fails during a deploy. |
| 9 | **Owner ruling, 2026-10-29. For a listing with no pricing policy row, `GET` returns Flexible, and `PUT` gives 422.** | 422 on both. 404 on both. | `PUT` cannot create the row, because `pricing_mode` is required. |
| 10 | **Added point, please review. The column `catalog_pricing_policies.cancellation_policy_source` stays. Its values become `flexible`, `moderate`, `strict` and `custom`.** | A new column for the preset. A rename. | The smallest change. Bookings copy the same value into `cancellation_policy_type`. |
| 11 | **Added point, please review. The preset tiers are a constant in `Catalog::PricingPolicy`. Only a `custom` policy has rows in `catalog_cancellation_policy_tiers`.** | One set of rows for each listing and preset. | The DBML note already says a preset has no custom rows. A constant has one place to change. |
| 12 | **Added point, please review. `PUT` always sends the source. A `custom` source needs a non-empty `tiers` list. A preset accepts no key or an empty list, and any tier gives 422. `PUT` replaces the whole list.** | Add and remove one tier at a time. | One request lets the validator check the whole shape. api-213 decision 1 uses the same pattern. |
| 13 | **Added point, please review. A `PUT` with a preset deletes the custom tier rows of that policy.** | Keep the rows hidden. | The DBML says no custom rows exist for a preset. |
| 14 | **Added point, please review. The API sets `tier_order` from the hours. The tier with the most hours gets 0.** | The provider sends `tier_order`. | The column is internal. |
| 15 | **Added point, please review. `PUT` locks the pricing policy row in its transaction.** | No lock. | Two `PUT` requests at once would hit the unique index on hours and return 500. |
| 16 | **Added point, please review. `PUT` works on a listing of any status, if it belongs to the provider.** | Draft and published only. | The owner ruled "any time". An archived listing gains nothing from a block. |
| 17 | **Added point, please review. A new listing starts with `flexible`. Create and update no longer permit the source, so Rails drops it with no error.** | Refuse the key with 422. | The current web form keeps working while the web issue ships. The PR body states that the value is ignored. |
| 18 | **Added point, please review. Checkout create takes `agreed_cancellation_policy`: the source and the tiers, as the marketplace preview gave them. The check compares the source and each tier's hours and refund.** | A version number column. A hash. | The preview already carries these values, and no new column is needed. |
| 19 | **Added point, please review. In PR 1, the check runs only when `agreed_cancellation_policy` is sent. PR 2 makes it required.** | Required in PR 1. | The current web checkout does not send it. The web must ship between the two pull requests. |
| 20 | **Added point, please review. The bookings enums `cancellation_policy_type` accept `flexible`, `moderate`, `strict` and `custom`. They keep `platform_default` for old rows. No migration rewrites a booking.** | Rewrite old bookings to Moderate. | `INV-1` says a booking snapshot cannot change. |
| 21 | **Added point, please review. The snapshot header formulas stay: the free cutoff is the most hours with 100%, and the fee is 100 minus the refund of the tier with the fewest hours.** | New formulas. | Every valid policy ends with a 0-hour tier, so the fee is 100 minus the refund of that tier. |
| 22 | **Added point, please review. The checkout check `custom_cancellation_policy_configured?` stays as a safety net.** | Remove it. | The new validator blocks the case. The check costs nothing. |
| 23 | **Added point, please review. The marketplace preview `cancellation_policy_preview` keeps its shape. `cancellation_policy_type` carries the new values.** | Add the preset name in two languages. | The web owns the labels of other presets and maps the key to the name. |

## API contract

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id/cancellation_policy` | JWT provider | | `cancellation_policy`: `{ cancellation_policy_source, tiers }` | A preset returns the tiers of the constant. No pricing row returns Flexible. Another provider's listing returns 404. |
| PUT | `/providers/catalog/listings/:listing_id/cancellation_policy` | JWT provider | `cancellation_policy_source` (required). `tiers`: list of `{ hours_before_service, refund_percentage }`, only for `custom`. | Same as GET | Error 422 for the cases below. |
| POST | `/providers/catalog/listings` | JWT provider | `cancellation_policy_source` is no longer permitted | Unchanged | The policy starts as `flexible`. |
| PATCH | `/providers/catalog/listings/:listing_id` | JWT provider | `cancellation_policy_source` is no longer permitted | Unchanged | The update does not change the policy. |
| POST | `/tourists/bookings/checkout_sessions` | JWT tourist | Adds `agreed_cancellation_policy`: `{ cancellation_policy_type, tiers }` | Unchanged | Optional in PR 1. Required in PR 2. |
| GET | `/providers/catalog/listings/:listing_id` | JWT provider | | Unchanged shape | `pricing_policy.cancellation_policy_source` carries the new values. |
| GET | `/marketplace/catalog/listings/:slug` | none | | Unchanged shape | `cancellation_policy_preview.cancellation_policy_type` carries the new values. |

Error text:

- Source missing: "Please select a cancellation policy."
- Source not valid: "Please select a valid cancellation policy."
- No pricing row: "Please set the pricing of this listing first."
- Tiers with a preset: "Tiers are only for a custom cancellation policy."
- Custom without tiers: "Please add the tiers of your custom cancellation policy."
- Tier count: "A custom policy has 1 to 4 tiers."
- No 0-hour tier: "A custom policy needs a tier at 0 hours."
- Same hours twice: "Each tier needs different hours."
- Hours not valid: "Hours must be a whole number from 0 to 8,760."
- Percent not valid: "Refund must be a whole number from 0 to 100."
- Refund rises: "The refund cannot rise as the service start gets closer."
- All zero: "At least one tier must refund more than 0 percent."
- Checkout, policy changed: "The cancellation policy changed, so please read it again and agree."
- Checkout, policy missing (PR 2): "Please agree to the cancellation policy."

### Pull request split

| PR | Contents |
| --- | --- |
| PR 1 | New enum values next to `platform_default`. The preset constant, where `platform_default` reads as Flexible. The `GET` and `PUT` endpoints and the validator. Create and update stop permitting the source. The optional checkout check. |
| PR 2 | Ships after the web issue. The data migration of decisions 2 and 4. `platform_default` leaves the Catalog enum. The checkout check becomes required. |

### Files to create or modify (API)

- `app/domains/catalog/pricing_policy.rb` (enum values, the preset constant, `effective_cancellation_tiers_for_snapshot`)
- `app/domains/catalog/cancellation_policy_tier.rb`
- `app/domains/catalog/listing_cancellation_policies/providers_{show,replace}_{request,validator,manager}.rb` (new)
- `app/domains/catalog/listings/cancellation_policy_replace_service.rb` (new)
- `app/domains/catalog/providers_listing_cancellation_policy_serializer.rb` (new)
- `app/controllers/providers/catalog/listing_cancellation_policies_controller.rb` (new)
- `config/routes/providers_routes.rb`
- `app/domains/catalog/listings/providers_create_request.rb`, `providers_create_validator.rb`, `providers_create_manager.rb`
- `app/domains/catalog/listings/providers_update_request.rb`, `providers_update_validator.rb`, `providers_update_manager.rb`
- `app/domains/bookings/checkout_sessions/tourists_create_request.rb`, `tourists_create_validator.rb`
- `app/domains/bookings/checkout_session.rb`, `app/domains/bookings/order.rb` (enum values)
- `db/migrate/{timestamp}_move_cancellation_policies_to_presets.rb` (PR 2, data only)
- `lib/dev/catalog_marketplace_seeder.rb`
- `docs/api/providers/catalog/listings/*.bru` and the checkout session request
- `docs/db/catalog.dbml`, `docs/db/bookings.dbml`, `docs/db/redcab.dbml` (enum values, remove the JST wording from the tier notes)
- `db/schema.rb` (column comments), `sorbet/rbi/dsl/catalog/*.rbi`

## Data / domain touchpoints

- Bounded context: CAT.
  - Bookings reads the tiers at checkout, compares them with the agreed policy and copies them.
- Transaction boundaries: the `PUT` replace runs in one transaction with a row lock.
  - It deletes the old custom rows, writes the new rows and sets the source.
- Snapshots: a booking keeps its copied tiers (`INV-1`, `BKG-8`).
  - A later `PUT` never reaches a booking.
- Data migration (PR 2): it moves `platform_default` and invalid `custom` listings to `flexible`.
  - It does not touch bookings.

## Known limits

- The migration changes the refund rule that new checkouts see on existing listings.
  - The new rule is more generous than before, and providers get no notice.
- Between PR 1 and the web issue, the provider form value is ignored with no error.
- This spec ships the rules and the storage.
  - It does not compute a refund.

## Out of scope

- The refund amount, rounding and the money return (issues #162 and #164).
- The tourist cancel command (issue #171).
- The refund when the provider or the platform cancels.
- A free period just after booking, weather, too few travelers and no-show.
- Corporate checkout.
- A notice to providers about the move to Flexible.
- The web form, the tourist display and the late-booking statement.
  - A web issue is the follow-up.
- A policy for each package.

## Tasks

### Planning

- [x] Get this spec to `status: approved`.
- [ ] Create the web issue.
  - The provider policy page on the new endpoint.
  - The tourist display with the preset names, and a label for old `platform_default` bookings.
  - The checkout sends `agreed_cancellation_policy`, and shows the new policy on the changed-policy error.
  - The late-booking statement.

### API (PR 1)

- [ ] Add the new enum values next to `platform_default` in Catalog and Bookings.
- [ ] Add the preset constant, and use it in `effective_cancellation_tiers_for_snapshot`.
- [ ] Add the `GET` and `PUT` request, validator and manager, with the row lock.
- [ ] Remove `cancellation_policy_source` from listing create and update, and start new listings as `flexible`.
- [ ] Add the optional `agreed_cancellation_policy` check to checkout create.
- [ ] Update the seeder, the DBML and the Bruno requests.

### API (PR 2, after the web issue)

- [ ] Add the data migration of decisions 2 and 4.
- [ ] Remove `platform_default` from the Catalog enum.
- [ ] Make `agreed_cancellation_policy` required.

### Docs

- [ ] Set spec `status: implemented` after PR 2 merges.
- [ ] Update redcab-docs#67 with the new work.

## Acceptance criteria

- [ ] `GET` returns the source and the tiers.
  - A preset returns the tiers of the constant.
  - A listing with no pricing row returns Flexible.
- [ ] `PUT` with `flexible`, `moderate` or `strict` sets the source and deletes the custom rows.
- [ ] `PUT` with `custom` and valid tiers replaces the rows and sets the source.
- [ ] Each custom check on the decision page has a test that returns 422 with the text above.
- [ ] Two neighbor tiers with the same refund pass.
- [ ] `PUT` on a listing with no pricing row returns 422.
- [ ] `PUT` works on a published listing and a draft listing.
- [ ] A listing of another provider returns 404.
- [ ] A new listing has the source `flexible`, and a listing update does not change it.
- [ ] Checkout with a matching `agreed_cancellation_policy` passes, and a different one returns 422.
- [ ] Checkout without `agreed_cancellation_policy` passes in PR 1 and returns 422 in PR 2.
- [ ] A checkout copies the current tiers, and an earlier booking keeps its own.
- [ ] The snapshot header gives the same free cutoff and fee as before for the same tiers.
- [ ] The migration moves `platform_default` and invalid `custom` listings to `flexible`, keeps valid `custom` listings and changes no booking row.
- [ ] `bundle exec rubocop` and `bundle exec srb tc` pass.

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/domains/catalog test/domains/bookings/checkout_sessions test/controllers/providers/catalog
bundle exec srb tc
bundle exec rubocop
```

- Run the `review-rails-style` skill by hand on each pull request.
- Call `PUT` with each preset and with a custom policy in a dev build, and read the response.
- Before PR 2, count the `platform_default` and `custom` listings in production, and put the counts in the PR body.
- Each pull request lists what it did not check.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-29 | Owner | Approved, including decisions 10 to 23. |
