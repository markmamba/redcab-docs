---
title: "Show why a listing or a package cannot sell, and remove the prefill toast"
sidebar_label: Web · Available packages
issue: "https://github.com/markmamba/red-cab-web/issues/194"
repos:
  - red-cab-web
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-266-available-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-191-permits-registration-and-team-approval.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-192-portal-access-and-switch.md"
related:
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#permits-and-package-availability"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#listing-publication"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#discoverability-completeness"
  - "docs/30-49-domains/31-catalog/catalog-decisions.md#package-not-offered"
---

## TL;DR

- A provider sees why a listing does not reach tourists, with one line for each hidden reason.
- A package that cannot sell shows a badge with the reason.
- The Publish button follows the hidden reasons of the API.
- The create page shows one success message, and `buildCreatedToast` goes away.
- A card shows no price line when the starting price is empty.
- The tourist sees no reason for a date that is not open.
- The tourist pages read the code `package_not_offered`, and they show a notice for an old package link.
- This spec ships no change to entry rules or to the rules of the date picker.
- Breaking change: Yes.
  - The web and `red-cab-api` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| available package | A package that is `active`, has an active asset in its pool and has a valid permit for its vehicle kind. |
| discoverable | A listing that may appear in browse and search. |
| hidden reason | One code in `hidden_reasons` of the provider listing JSON. It says why a listing does not reach tourists. |
| unavailable reason | The value of `unavailable_reason` in the provider package JSON. It says why a package cannot sell. |
| provider listing page | The page `/providers/catalog/listings/:listingId`. |
| the code `package_not_offered` | The `code` of a `422` that the API gives for a package with status `inactive` or `archived`. |
| stale package link | A link whose `package_slug` names a package that the listing does not offer now. |

## User stories

1. US-1: As a provider, I want to see why my published listing is hidden, so I can fix it.
2. US-2: As a provider, I want to see what a draft needs, so I know when I can publish.
3. US-3: As a provider, I want to see why a package cannot sell, so I can check it.
4. US-4: As a tourist, I want a card without a broken price, so the page stays clear.
5. US-5: As a tourist, I want a clear message about a gone package, so I can pick another.
6. US-6: As a tourist, I want a notice for an old link, so I know why the package changed.

## Problem

The provider pages show the status of a listing, but they do not show whether tourists can see it.

- A listing stays `published` after its permit ends, and the page still says Published.
- A package stays `active` with an empty price, and the list gives no reason.
- `isPublishDisabled` reads `hasActivePackage`, which does not match the new publish check.
- The hint `Add at least one active package to publish.` names one of five gates.
- `CatalogListingService.buildCreatedToast` reads `skipped_prefectures`, which the API removes.
- `catalog-listing-list-view.jsx` shows `—` in the price line when the starting price is empty.
- The web does not read the code `package_not_offered` yet.
- A link with an old package slug gets `200` from the listing show.
- The page then shows another package with no notice.

## Governing docs

Read these before design.

Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Permits and package availability](/docs/30-49-domains/catalog/catalog-decisions/#permits-and-package-availability) | An expired permit makes packages unavailable |
| Rule | [Listing publication](/docs/30-49-domains/catalog/catalog-decisions/#listing-publication) | The five publish gates |
| Rule | [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) | A hidden listing and "currently unavailable" |
| Rule | [Catalog D26 — Package not offered and package slug](/docs/30-49-domains/catalog/catalog-decisions/#package-not-offered) | The code, and a listing that never fails for an old slug |
| Requirement | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | What the provider sees |
| Requirement | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | The tourist sees "currently unavailable" |
| Paired spec | [API available packages](api-266-available-packages.md) | The contract, and it must deploy with this spec |
| Depends on | [Permits and approval](web-191-permits-registration-and-team-approval.md) | The renamed provider folders |
| Depends on | [Portal access and switch](web-192-portal-access-and-switch.md) | The entry rules and the company names |
| Web rules | `red-cab-web/AGENTS.md` and `red-cab-web/app/domains/AGENTS.md` | Domain folders, services and constants |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The web shows the codes that the API sends, and it does not work out a reason. | Compute the reason from the package and the permit. | The web cannot read the permit, and one rule lives in one place. |
| 2 | One alert component draws the hidden reasons, with two variants. | Two components. | The draft and the published listing share the lines. |
| 3 | A draft with hidden reasons shows the info alert `Before you publish, fix these items.` | Show nothing for a draft. | The provider then sees every gate at once, and not only the first API message. |
| 4 | A `published` listing with hidden reasons shows the warning alert `Tourists cannot see this listing.` | Show it for every status. | A `paused` or `unlisted` listing is hidden by its status, and the provider chose that. |
| 5 | The Publish button is disabled while `hidden_reasons` has items. | Disable it only without a package. | The API refuses a bad publish too, so the button should match. The pricing policy only hides a listing, and it is not a gate (see Open items). |
| 6 | The payout gate stays an API message. | Add `no_verified_payout` to the reasons. | `discoverable` does not test the payout, so it is not a hidden reason. |
| 7 | An unknown reason code shows `Tourists cannot see this listing yet.` | Hide the line. | An unknown word must not look like a pass. |
| 8 | An unknown or missing `hidden_reasons` shows no alert and leaves the button on. | Disable the button. | The API is the boundary and refuses a bad publish. |
| 9 | A package that is `active` and not available shows a second badge. | Replace the status badge. | The status is the choice of the provider, and the badge is a fact about the permit or the vehicle. |
| 10 | An unknown `unavailable_reason` shows the badge `Not available`. | Hide it. | Same reason as decision 7. |
| 11 | The create page shows `Listing created successfully.` | Keep a warning toast. | The API adds no coverage, so nothing is skipped. |
| 12 | A card shows no price line when `starting_price_jpy` is empty. | Show `—`. | A dash looks like a price that failed to load. |
| 13 | The tourist pages show no reason about a permit. | Show a reason about the permit. | A permit is private to the company, and the date picker already reads only the open dates. |
| 14 | The English text stays in the provider pages, and the provider pages have no `ja` copy. | Add `ja` copy. | The provider portal is English only. |
| 15 | The provider listing layout exports `shouldRevalidate`, so the Details tab reloads `hidden_reasons` after a change on another tab. | Reload only on the Details tab. | A change on the Packages or the Coverage tab changes the reasons. |
| 16 | The provider show page loader does not load the packages. | Keep the call. | No part of the page reads the packages, because the API sends the reasons. |
| 17 | The tourist pages read `error.code`, and they never read the title. | Match the title text. | The title can change, and the code is the contract. |
| 18 | The code `package_not_offered` is handled in four calls: the open dates, the start times, the checkout start and the payment start. | Handle it in the quote too. | The web has no separate quote call. The listing show carries the quote, and it never gives the code. |
| 19 | The open dates and the start times show the message and a link back to the package list. They do not say "No free times". | Show the API title. | The tourist copy has English and Japanese, and the API title has English only. |
| 20 | The checkout start shows the message and a button back to the listing. It does not offer to resume the older session. | Keep the resume button. | The package is gone, so the older session cannot be paid. |
| 21 | After a refusal at the payment start, the web clears the stored checkout context, shows an error toast and goes back to the listing. | Show the error on the payment step. | The API released the hold and ended the session when no charge was pending, so the web must not pay it again. |
| 22 | The code wins over every other `422` in the checkout start and the payment start. The service functions `createFailureKind` and `paymentFailureKind` decide the order. | Check the codes in the page. | One test can pin the order. |
| 23 | The listing detail page shows a notice when the slug of the link is not in `catalog_listing.packages`. | Compare the slug with `price_breakdown.package_id`. | `price_breakdown.package_id` holds the package `uuid`, not the slug. |
| 24 | The checkout page shows the message and a link instead of the form when the slug of the link is not in `catalog_listing.packages`. The loader clears the stored checkout context. | Show the form with the price of another package. | The listing show answers `200` and prices the first available package, so the price belongs to another package. |
| 25 | The Book button and the Continue button turn off after a picker call says that the package is not offered. | Leave them on. | The checkout would show the stale link message. |
| 26 | The listing detail loader does not retry without `package_slug`. | Keep the retry. | The API never gives a `422` on `package_slug` for the listing show. |
| 27 | The new tourist texts are keys in `tourist-surface-copy`, in English and in Japanese. The principal developer confirmed the Japanese texts. | Hard-code English. | The repo keeps tourist copy in one file for both languages. |

## Web contract

### Provider listing page

The listing layout loader already reads `providersCatalogListingsApi.show`, and the answer holds the new keys.

| Key | Used for |
| --- | --- |
| `is_discoverable` | The page does not read it for an action. Tests may read it. |
| `hidden_reasons` | The alert and the Publish button |

The page acts by the status and the reasons.

| Status | `hidden_reasons` | The page shows |
| --- | --- | --- |
| `draft` | Has items | The info alert, one line for each code, and the Publish button disabled |
| `draft` | Empty | The Publish button on |
| `published` | Has items | The warning alert, and one line for each code |
| `published` | Empty | No alert |
| `paused`, `unlisted` | Any | No alert |

The alert lines follow this table.

| Code | Text |
| --- | --- |
| `no_photo` | `Add at least one photo.` |
| `no_pickup_coverage` | `Add pickup coverage.` |
| `no_active_pricing_policy` | `Set the pricing policy.` |
| `no_available_package` | `Add a package that can be sold. Check its vehicle and its permit.` |
| `company_not_approved` | `Your company must be approved.` |
| Any other code | `Tourists cannot see this listing yet.` |

- The line for `no_available_package` links to the package list of the listing.
- The line for `no_pickup_coverage` links to the Pickup coverage tab.
- The hint `Add at least one active package to publish.` goes away.
- `provider-catalog-listings-layout.jsx` exports `shouldRevalidate`, so the Details tab shows fresh `hidden_reasons` after a change on another tab.
- The show page loader no longer loads the packages.

### Package list

`catalog-listing-package-list-view.jsx` adds one badge to each row.

- The web reads only `unavailable_reason`, and the value `null` means that the package is available (api-266 decision 30).
- The web reads no `is_available`, because the API sends no such key.

| `unavailable_reason` | The row shows |
| --- | --- |
| `null` | The status badge only |
| `not_active` | The status badge only |
| `no_active_asset` | The status badge and the badge `No active vehicle` |
| `no_valid_permit` | The status badge and the badge `Permit not valid` |
| Any other value | The status badge and the badge `Not available` |

- A package with `status` `inactive` or `archived` shows no second badge, because its status already says so.
- The price cell keeps `priceLabel`, which shows a dash for an empty price.

### Create page

`provider-catalog-listings-create-page.jsx` shows the toast `{ message: 'Listing created successfully.', type: 'success' }`.

- It then moves to the package list, as it does today.
- `CatalogListingService.buildCreatedToast` and its tests go away.

### Listing card

`catalog-listing-list-view.jsx` shows the price line only when `starting_price_jpy` is not null.

- The card keeps its other lines.
- A list sorted by price puts a card with no price last, as the API does.

### Tourist pages

The tourist pages show no reason about a permit.

- `catalog-listing-service.js` keeps reading `is_bookable`.
- The detail page keeps the text `picker.unavailable`.
- The web never reads `unavailable_reason` of the marketplace detail, so its new values change no page.
- The date picker reads only `openDates` and `startTimes`, so a date after the last valid day is not open.

### The code package_not_offered

The check `CatalogListingPackageService.isNotOfferedError` is true for an `ApiError` with `status` `422` and `code` `package_not_offered`.

| Call | The tourist sees |
| --- | --- |
| Open dates | The message and the link `Choose another package` in the picker |
| Start times | The same message and link, and not "No free times on this day" |
| Checkout start | The message and the button `Choose another package`, with no button to resume the older session |
| Payment start | An error toast with the message, and the return to the listing |

- The link and the buttons go to the listing page without `package_slug`, so the page loads the current packages.
- The web clears the stored checkout context at the checkout start and at the payment start.
- Every other `422` of these calls keeps its own message, for example the time message.
- `BookingsCheckoutSessionService.createFailureKind` and `paymentFailureKind` return a value of `CHECKOUT_FAILURE_KIND`, and the code is the first check.

### Stale package link

The listing show answers `200` for an old slug, and it prices the first available package.

- `CatalogListingService.isPackageLinkStale(catalogListing, packageSlug)` is true when the link has a slug and the listing has packages, and no package has that slug.
- The detail page then shows a warning notice above the page.
- The checkout loader sets `isPackageNotOffered` with the same check.
- The checkout page then shows the message and a link back instead of the form.
- A listing with no available package shows its own message and no notice.
- After a picker call says that the package is not offered, `hasBookableSelection` is false.
- The Book button and the Continue button then turn off.

### Tourist copy

The keys live in `app/domains/tourist/tourist-surface-copy.js`.

| Key | English | Japanese |
| --- | --- | --- |
| `package.not_offered` | `This package is not offered now. Please choose another package.` | `このプランは現在ご利用いただけません。別のプランをお選びください。` |
| `package.choose_another` | `Choose another package` | `別のプランを選ぶ` |
| `package.stale_link_notice` | `That package is not offered now. Choose a package below.` | `このプランは現在ご利用いただけません。下からプランをお選びください。` |

- The Japanese text shows only for a signed-in account with the Japanese language preference.

### Files to create or modify (Web)

Provider pages and views:

- `app/routes/provider/provider-catalog-listings-show-page.jsx`
- `app/routes/provider/provider-catalog-listings-create-page.jsx`
- `app/routes/provider/provider-catalog-listings-layout.jsx` (add `shouldRevalidate`)
- `app/domains/catalog-listing/catalog-listing-hidden-reasons-view.jsx` (create)
- `app/domains/catalog-listing/catalog-listing-constants.js` (add the reason labels)
- `app/domains/catalog-listing/catalog-listing-service.js` (add `hiddenReasonLabel` and `canPublish`, remove `buildCreatedToast`)
- `app/domains/catalog-listing-package/catalog-listing-package-list-view.jsx`
- `app/domains/catalog-listing-package/catalog-listing-package-constants.js` (add the badge labels and the code `package_not_offered`)
- `app/domains/catalog-listing-package/catalog-listing-package-service.js` (add `unavailableLabel`, keep `hasActivePackage` only if another file reads it)

Tourist pages:

- `app/domains/catalog-listing/catalog-listing-list-view.jsx`
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.jsx` (the stale link notice, and the loader without the retry)
- `app/routes/tourist/tourist-checkout-page.jsx` (the code at the checkout start and the payment start, and the stale link)
- `app/domains/catalog-listing/catalog-listing-picker-service.js` and `catalog-listing-picker-view.jsx` (the code at the open dates and the start times)
- `app/domains/catalog-listing/catalog-listing-service.js` (add `isPackageLinkStale` and the `isPackageNotOffered` selection)
- `app/domains/bookings-checkout-session/bookings-checkout-session-service.js` and `bookings-checkout-session-constants.js` (add `createFailureKind`, `paymentFailureKind`, `clearResumeContext` and `CHECKOUT_FAILURE_KIND`)
- `app/domains/tourist/tourist-surface-copy.js` (add the three keys)

API modules:

- `app/api/providers-catalog-listings-api.js` (JSDoc for the new keys and the create response)

### Code to remove

| Code | Reason |
| --- | --- |
| `CatalogListingService.buildCreatedToast` and its tests | The API returns no `skipped_prefectures` |
| The use of `skipped_prefectures` in any file | Same |
| `isPublishDisabled` as `!hasActivePackage || isPublishing` | The Publish button follows `hidden_reasons` |
| The hint `Add at least one active package to publish.` | The alert replaces it |
| `CatalogListingPackageService.hasActivePackage`, when no other file reads it | The API decides what can sell |

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [web-156](../cat/web-156-provider-packages-and-tourist-package-choice.md) | The rule that the Publish button needs one active package |
| [web-157](../cat/web-157-provider-coverage-and-checkout-booking-location.md) | The warning toast for `skipped_prefectures` |
| [web-176](../cat/web-176-provider-listing-publish-button.md) | The enable rule of the Publish button |

This spec changes no entry rule, so it replaces no part of [web-192](web-192-portal-access-and-switch.md).

### Tests that must change

| Test file | Change |
| --- | --- |
| `app/domains/catalog-listing/catalog-listing-service.spec.js` | Remove the `buildCreatedToast` cases, and add `hiddenReasonLabel` and `canPublish` |
| `app/routes/provider/provider-catalog-listings-show-page.spec.jsx` | Assert the alert and the button for each row of the status table |
| `app/routes/provider/provider-catalog-listings-create-page.spec.jsx` | Assert the success toast only |
| `app/domains/catalog-listing-package/catalog-listing-package-list-view.spec.jsx` | Assert the badge for each row of the package table |
| `app/domains/catalog-listing/catalog-listing-list-view.spec.jsx` | Assert that a null price shows no price line |
| `app/domains/catalog-listing-package/catalog-listing-package-service.spec.js` | Assert `isNotOfferedError` reads the code and never the title |
| `app/domains/catalog-listing/catalog-listing-picker-service.spec.js` and `catalog-listing-picker-view.spec.jsx` | Assert the flag, the message and the link |
| `app/domains/catalog-listing/catalog-listing-service.spec.js` | Assert `isPackageLinkStale` and the Book button after a refusal |
| `app/domains/bookings-checkout-session/bookings-checkout-session-service.spec.js` | Assert that the code wins in `createFailureKind` and `paymentFailureKind`, and `clearResumeContext` |
| `app/routes/tourist/tourist-checkout-page.spec.js` | Assert the loader flag and the cleared context |
| `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.render.spec.jsx` and `.spec.js` | Assert the notice, and a loader with no retry on the slug |

New tests cover these behaviors.

- A draft with hidden reasons shows the info alert, one line for each code and a disabled Publish button.
- A published listing with hidden reasons shows the warning alert.
- A paused listing shows no alert.
- An unknown code shows the general line, and a missing `hidden_reasons` shows no alert.
- The line for `no_available_package` links to the package list.
- A package with `no_valid_permit` shows the badge `Permit not valid`.
- An `inactive` package shows no second badge.
- No file in `app/` names `skipped_prefectures`.

## Data / domain touchpoints

- Bounded context: Catalog, with the permit read in IAM through the API.
- Transaction boundaries: none in the web.
- Snapshots: none.
- The web stores no reason, and the alert reads the answer of each load.

## Worked example

Kenji runs Kanto Charter with a Sedan package and a Microbus package.

1. Kenji opens a published listing, and the page shows no alert.
2. The chartered permit ends, but the Sedan package keeps the listing live, so `hidden_reasons` stays empty.
3. Kenji opens the package list, and the Microbus row shows `Active` and `Permit not valid`.
4. Kenji removes the last Sedan vehicle from its pool.
5. The listing page now shows the warning alert `Tourists cannot see this listing.`
6. The alert says `Add a package that can be sold. Check its vehicle and its permit.` with a link to the package list.
7. Kenji creates a new draft listing, and the page shows the info alert with `Add at least one photo.`, `Add pickup coverage.` and the package line.
8. Kenji adds a photo, a coverage row and an available package, and the alert goes away.
9. The Publish button turns on, and Kenji publishes.
10. A tourist opens the home page, and the Kanto Charter card shows its price.

## Worked example: a tourist with an old link

Emma saved a link to the Sedan package of Kanto Charter, and Kenji later archived that package.

1. Emma opens the saved link, and the listing show answers `200` with the Microbus package as the first available package.
2. The page shows the notice `That package is not offered now. Choose a package below.`
3. Emma picks the Microbus package, a day and a start time, and presses Book.
4. If Kenji archives the Microbus package too, the start times call gives `422` with the code `package_not_offered`.
5. The picker shows `This package is not offered now. Please choose another package.` and the link `Choose another package`.
6. Emma presses the link, and the page loads the current packages.
7. Emma had an open checkout for the Sedan package in another tab, and she presses Pay now there.
8. The API gives `422` with the code `package_not_offered`.
9. The page clears the stored checkout context, shows an error toast and goes back to the listing.

## Out of scope

- A reason for a tourist about a permit.
- Any email or reminder about a permit.
- A new checkout step or a new rule of the date picker.
- A payout reason in the alert.
- The layout redesign, because topic A2 in markmamba/redcab-docs#154 owns it.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- The owner may change the rule for service dates after a permit ends.
- The English text of the alert lines needs a review by the principal developer.
- The Publish button turns off for `no_active_pricing_policy`, but the API publish check has no such gate.
  - [red-cab-api#316](https://github.com/markmamba/red-cab-api/issues/316) holds the question.
- The two failure branches of the checkout page have no automated test, and nobody checked the pages in a browser.

## Tasks

### Web

- [ ] Add the reason labels and the alert component.
- [ ] Update the provider listing page and the Publish button.
- [ ] Add the badge to the package list.
- [ ] Update the create page, and remove `buildCreatedToast`.
- [ ] Update the card for an empty price.
- [ ] Remove `hasActivePackage` when nothing else reads it.
- [ ] Handle the code `package_not_offered` in the open dates, the start times, the checkout start and the payment start.
- [ ] Add the stale link notice and the checkout refusal.
- [ ] Add the tourist copy in English and in Japanese.
- [ ] Update the tests.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A published listing that is hidden shows why.
- [ ] A draft shows what it needs, and the Publish button follows the reasons.
- [ ] A package with no valid permit shows a badge.
- [ ] A listing with no hidden reason shows no alert.
- [ ] An unknown code shows a general line and breaks no page.
- [ ] A create shows one success message.
- [ ] An empty starting price shows no price line.
- [ ] No file in `app/` names `skipped_prefectures`.
- [ ] The picker, the checkout start and the payment start show a message for a package that is not offered.
- [ ] An old package link shows a notice on the detail page and a message instead of the checkout form.
- [ ] The entry rules are unchanged.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
git grep -n -E 'skipped_prefectures|buildCreatedToast' -- app
git grep -n 'hasActivePackage' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
