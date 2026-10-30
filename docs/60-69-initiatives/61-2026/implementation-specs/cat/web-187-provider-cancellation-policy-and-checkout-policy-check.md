---
title: "Add the provider cancellation policy page and the checkout policy check"
sidebar_label: Web · Cancellation policy
issue: "https://github.com/markmamba/red-cab-web/issues/187"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/architecture-decisions/cancellation-policy.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-168-cancellation-policy-presets-and-custom-tiers.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-157-provider-coverage-and-checkout-booking-location.md"
---

## TL;DR

- Ships a "Cancellation policy" tab on the provider listing, next to "Pickup coverage".
  - The provider picks Flexible, Moderate, Strict or Custom, on a draft or a published listing.
  - A custom policy has 1 to 4 tier rows.
- Removes the cancellation select from the listing create form.
- Checkout sends the policy that the tourist read, in `agreed_cancellation_policy`.
  - When the API says the policy changed, checkout loads the new policy and asks for agreement again.
- The listing page, the checkout and the booking page show the preset name and each tier, in English and Japanese.
  - An old booking with `platform_default` shows its tiers with a short label.
- Checkout shows a statement when the chosen start falls inside a 0 percent window.
- Does NOT ship any API change, the refund amount, the tourist cancel command, corporate checkout or a notice to providers.
- Breaking change: No for the API.
- This spec must ship before PR 2 of markmamba/red-cab-api#168.

## Problem

After PR 1 of api-168 (red-cab-api#254), the web does not match the API.

- The provider cannot set a policy after the first save.
  - The create form has a select with `platform_default` and `custom`, and no tier editor.
- The API now drops `cancellation_policy_source` on listing create and update with no error.
  - The select looks as if it saves, and it does nothing.
- Checkout sends only `is_cancellation_policy_agreed`.
  - After PR 2, the API refuses a checkout that does not send the agreed policy.
  - The API also refuses a checkout when the policy changed after the tourist read it.
  - The web does not handle that refusal.
- The tourist screens do not show the preset name.
  - `formatCancellationTier` writes one English sentence for each tier.
  - A booking made before this change has the type `platform_default`, and the web has no label for it.
- Nothing warns a tourist who books inside the last window.

Evidence:

- `app/domains/catalog-listing/catalog-listing-form.jsx` (line 196, the select)
- `app/domains/catalog-listing/catalog-listing-schema.js` (line 80)
- `app/domains/catalog-listing/catalog-listing-service.js` (lines 1084 and 1114)
- `app/api/providers-catalog-listings-api.js` (line 17)
- `app/domains/bookings-checkout-session/bookings-checkout-session-service.js` (`buildCreatePayload`, `formatCancellationTier`)
- `app/routes/tourist/tourist-checkout-page.jsx` (`handlePolicyContinue` treats every 422 as a lost hold)
- `app/routes/provider/provider-catalog-listings-layout.jsx` (tabs)
- Issue #187

## Words used in this spec

| Word | Meaning |
| --- | --- |
| Cancellation policy | The refund rules of one listing, for cancellations by the tourist. |
| Tier | One rule of a policy: a number of hours and a refund percent. |
| Preset | A ready-made policy that the provider picks by name: Flexible, Moderate or Strict. |
| Custom policy | A policy whose 1 to 4 tiers the provider writes. |
| Agreed policy | The policy that the tourist read and agreed to at checkout. |
| Policy tab | The new tab of the provider listing pages. |
| Notice | The number of hours between now and the service start. |
| Last window | The tier that matches the notice and refunds 0 percent. |

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Decision | [Cancellation policy with presets and custom tiers](/docs/30-49-domains/catalog/architecture-decisions/cancellation-policy) | The only source for the presets, the Japanese names, the custom checks and rules 8 to 10 |
| Spec | api-168 | The endpoints, the error text and the agreed-policy keys |
| Spec | web-157 | The pattern for a provider tab, and the checkout create error flow |
| Invariant | [Invariants](/docs/70-79-business/business-rules/invariants) `INV-1`, `BKG-1`, `BKG-8` | A booking keeps the policy it copied. The tourist agrees to it before payment. |
| Prose | [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) | EN copy is Tier A. JA copy follows `OPR-9`. |
| Convention | `red-cab-web/AGENTS.md`, `app/routes/AGENTS.md`, `app/domains/AGENTS.md` | Routes, API clients, forms, services |

## Design decisions

"Owner ruling" means the owner decided it on the issue or the decision page.

"Added point, please review" means the author added it.

The owner must confirm or change each added point before approval.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-29. The preset names, tiers, custom checks and checkout rules 8 to 10 are the ones on the decision page.** This spec does not copy the tables, except where decision 5 says so. | Copy the tables here. | Two copies drift apart. |
| 2 | **Owner ruling, 2026-10-29. The late-booking statement default is the web.** The web reads the tiers and the chosen start, and shows text only. | An API field. | The web computes no price. |
| 3 | **Added point, please review. The policy tab is a new route `cancellation-policy` under the listing layout, with the tab label "Cancellation policy".** | A section inside the Details tab. | The issue asks for a tab. The Details form is for draft edits, and the policy works on a published listing. |
| 4 | **Added point, please review. A new API client `providers-catalog-listing-cancellation-policies-api.js` has `show(listingId)` and `replace(listingId, cancellationPolicy)`.** The `replace` call always sends `cancellation_policy_source`. It sends `tiers` only for `custom`. | Add the methods to `providers-catalog-listings-api.js`. | The pickup coverage client already uses one file for each nested resource. |
| 5 | **Added point, please review. The provider form shows the tiers of the chosen preset from a web constant, only to preview before the save.** After the save, and on load, the form shows the tiers that the API returns. A test pins the constant to the decision page tables. | Show the preset name only. Add an API call that lists the presets. | The provider should see what a preset means before the save. The API stays the authority. |
| 6 | **Added point, please review. The form runs the seven custom checks of the decision page in a zod schema, for fast feedback. The API result always wins.** An API error shows under its field even when the schema passed. | Use the API checks only. | The provider sees the error at once. The schema uses the same error text as api-168. |
| 7 | **Added point, please review. The API error keys map to fields like this: `cancellation_policy_source` under the preset choice, `tiers` under the tier rows, and `base` in an alert above the form.** | One alert for every error. | The issue asks for the error under the field. The API sends no key for a single tier row, so the tier row errors share one place. Check this against `providers_replace_validator.rb` before coding. |
| 8 | **Added point, please review. The provider tab is English only.** It shows the Japanese preset name in brackets, for example "Flexible (柔軟)". | Switch the provider portal by language. | The provider portal has no language switch today. The provider needs to know what tourists see. |
| 9 | **Added point, please review. The tourist display uses one service `CatalogListingCancellationPolicyService` with `presetName(type, languagePreference)`, `formatTier(tier, nextHigherHours, languagePreference)` and `tierSentences(tiers, languagePreference)`.** It replaces `formatCancellationTier`. | Keep the checkout service function. | The listing page, the checkout and the booking page all use it. |
| 10 | **Added point, please review. The tourist language is `identitiesAccount.language_preference`. A visitor who is not signed in sees English.** | Read the browser language. | `getTouristSurfaceCopy` and `getLocalizedLabel` already use this value. |
| 11 | **Added point, please review. Static tourist strings go in `TOURIST_SURFACE_COPY`. The tier sentences are functions in the service, because they take numbers.** | Put every string in the copy table. | The copy table holds fixed text only. |
| 12 | **Added point, please review. The label for `platform_default` is "Standard policy" in English and 標準ポリシー in Japanese. The tiers show as the API sends them.** The label never shows as an error. | Show it as Moderate. | A booking keeps its own policy (`INV-1`). The old tiers equal Moderate, but the booking type is not Moderate. |
| 13 | **Added point, please review. `buildCreatePayload` adds `agreed_cancellation_policy` with `cancellation_policy_type` and `cancellation_tiers`.** Each tier has only `hours_before_service` and `refund_percentage`. The values come from the policy that the policy step showed, and never from the form. | Send the whole preview. | The API compares type, hours and refund. Other keys such as `tier_order` add noise. |
| 14 | **Added point, please review. The changed-policy error is a 422 with a message under `agreed_cancellation_policy`.** Checkout checks it before the lost-hold branch. The 422 body has no new policy, so the page loads the listing again, shows the new policy, clears the checkbox and asks for agreement again. | Treat it as a lost hold. Read the policy from the error. | The error has no policy data. The current branch would show "hold unavailable", which is wrong. |
| 15 | **Added point, please review. The statement for the last window shows on the policy step and on the payment step.** The page finds the tier with the most hours that is equal to or less than the notice. When that tier refunds 0 percent, the page shows the statement. | Show it on the time picker. | Rule 10 says "at checkout", before payment. |
| 16 | **Added point, please review. The notice uses the service start instant.** After the session exists, it is `service_starts_at`. Before that, it is the chosen date and start time in the service timezone. | The browser timezone. | `AGENTS.md` forbids the browser timezone. |
| 17 | **Added point, please review. The listing page gets a new "Cancellation policy" section from `cancellation_policy_preview`.** | Show it at checkout only. | The issue lists the listing page. The page shows no policy today. |
| 18 | **Added point, please review. The create form loses the select, the schema key and the constants.** The shared form default values and the update payload stop using `cancellation_policy_source`. | Hide the select. | The API ignores the value. |
| 19 | **Added point, please review. The web never sends a refund amount.** The statement is text only. | Compute the refund. | `AGENTS.md`: no price computation in the client. |

## Japanese wording (proposal)

The decision page gives only the preset names.

This section proposes the tier sentences.

A Japanese reader must review them before approval (`OPR-9`).

### Names

| Key | English | Japanese |
| --- | --- | --- |
| `flexible` | Flexible | 柔軟 |
| `moderate` | Moderate | 中程度 |
| `strict` | Strict | 厳格 |
| `custom` | Custom | カスタム |
| `platform_default` | Standard policy | 標準ポリシー |
| Section heading | Cancellation policy | キャンセルポリシー |
| Agree checkbox | I agree to the cancellation policy above | 上記のキャンセルポリシーに同意します |

### Hours text

| Rule | English | Japanese |
| --- | --- | --- |
| Hours below 48, or not a multiple of 24 | `{H} hours` (`1 hour` for 1) | `{H}時間` |
| Hours of 48 or more, and a multiple of 24 | `{H} hours ({D} days)` | `{H}時間（{D}日）` |

### Tier sentences

Three letters stand for values in the sentences.

- `H` is the hours text.
- `R` is the refund percent.
- `P` is the hours text of the next higher tier.

| Tier | English | Japanese |
| --- | --- | --- |
| Hours above 0, refund 100 | Full refund if you cancel {H} or more before the start. | サービス開始の{H}前までにキャンセルすると、全額が返金されます。 |
| Hours above 0, refund R (1 to 99) | {R}% refund if you cancel {H} or more before the start. | サービス開始の{H}前までにキャンセルすると、{R}%が返金されます。 |
| Hours 0, refund 0 | No refund if you cancel less than {P} before the start. | サービス開始の{P}前を過ぎてからのキャンセルは、返金されません。 |
| Hours 0, refund R (1 to 100) | {R}% refund if you cancel less than {P} before the start. | サービス開始の{P}前を過ぎてからのキャンセルは、{R}%が返金されます。 |
| Hours 0, no higher tier (one-tier policy) | {R}% refund if you cancel at any time. | いつキャンセルしても、{R}%が返金されます。 |

The Japanese text "{H}前まで" includes the exact hour, like the English "{H} or more".
- This matches rule 4 of the decision page.
  - A cancellation exactly 24 hours before the start gets the 24-hour tier.

Example: Moderate in Japanese.

- サービス開始の72時間（3日）前までにキャンセルすると、全額が返金されます。
- サービス開始の24時間前までにキャンセルすると、50%が返金されます。
- サービス開始の24時間前を過ぎてからのキャンセルは、返金されません。

### Late-booking statement

| English | Japanese |
| --- | --- |
| No refund if you cancel. Your service starts in less than {P} from now. | キャンセルしても返金されません。サービス開始まで{P}を切っています。 |

`P` is the hours text of the matching tier boundary.

For a Flexible booking 10 hours before the start, `P` is "24 hours" (24時間).

## Web contract

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Provider | `/providers/catalog/listings/:listingId/cancellation-policy` | `clientLoader` | `providers-catalog-listing-cancellation-policies-api.js` | `provider-required-policy` (inherited) |
| Tourist checkout | `/account/checkout` (unchanged) | `clientLoader` (unchanged) | `tourists-bookings-checkout-sessions-api.js`, `marketplace-catalog-listings-api.js` | `tourist-required-policy` |

### API calls

| Call | Used by | Notes |
| --- | --- | --- |
| `GET /providers/catalog/listings/:listing_id/cancellation_policy` | Policy tab loader | Returns `{ cancellation_policy: { cancellation_policy_source, tiers } }`. A listing with the old source returns `flexible`. |
| `PUT` the same path | Policy tab submit | Sends the source. Sends `tiers` for `custom` only. A preset with tiers returns 422. |
| `POST /tourists/bookings/checkout_sessions` | Checkout | Adds `agreed_cancellation_policy`. |
| `GET /marketplace/catalog/listings/:slug` | Checkout, after the changed-policy error | Reads the new `cancellation_policy_preview`. |

### Files to create or modify (Web)

Create:

- `app/api/providers-catalog-listing-cancellation-policies-api.js` (and `.spec.js`)
- `app/routes/provider/provider-catalog-listings-cancellation-policy-page.jsx` (and `.spec.jsx`)
- `app/domains/catalog-listing-cancellation-policy/catalog-listing-cancellation-policy-constant.js` (sources, preset tiers for the preview, source order)
- `app/domains/catalog-listing-cancellation-policy/catalog-listing-cancellation-policy-schema.js` (the seven checks)
- `app/domains/catalog-listing-cancellation-policy/catalog-listing-cancellation-policy-service.js` (names, tier sentences, late-booking statement, form values, payload)
- `app/domains/catalog-listing-cancellation-policy/catalog-listing-cancellation-policy-form.jsx` (preset choice, tier rows)
- Spec files for the schema, the service and the form

Modify:

- `app/provider.routes.js` (route `cancellation-policy`)
- `app/domains/catalog-listing/catalog-listing-constant.js` (path `cancellationPolicy(listingId)`; remove the source constants, labels and options)
- `app/routes/provider/provider-catalog-listings-layout.jsx` (tab)
- `app/domains/catalog-listing/catalog-listing-form.jsx`, `catalog-listing-schema.js`, `catalog-listing-service.js` (remove the select, the schema key and the two uses)
- `app/api/providers-catalog-listings-api.js` (remove the key from the payload)
- `app/domains/bookings-checkout-session/bookings-checkout-session-service.js` (`buildCreatePayload`; move `formatCancellationTier` to the new service)
- `app/domains/bookings-checkout-session/bookings-checkout-session-cancellation-policy-view.jsx` (preset name, `languagePreference`, statement)
- `app/domains/bookings-checkout-session/bookings-checkout-session-policy-step-view.jsx` (changed-policy alert, checkbox text)
- `app/api/tourists-bookings-checkout-sessions-api.js` (the new key)
- `app/routes/tourist/tourist-checkout-page.jsx` (changed-policy branch, refreshed preview, statement inputs)
- `app/domains/bookings-booking/bookings-booking-tourist-detail-view.jsx` (pass `cancellation_policy_type` and the language)
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.jsx` (policy section)
- `app/domains/tourist/tourist-surface-copy.js` (static strings)
- Existing specs of the files above

## Data / domain touchpoints

- Bounded context: CAT for the provider tab and the preview.
  - BKG for checkout and the booking page.
- Transaction boundaries: none in the web.
- Snapshots: the booking page shows the tiers that the booking copied (`INV-1`, `BKG-8`).
  - The web never recomputes them from the listing.
- The web only displays the policy.
  - The refund amount is out of scope.

## Out of scope

- Any API change.
- The refund amount and the cancel command for the tourist.
- Corporate checkout.
- A notice to providers about the move to Flexible.
- A policy for each package.
- A Japanese version of the provider portal.

## Tasks

### Web

- [ ] Write this spec and set `status: approved` (after the owner reviews decisions 3 to 19 and the Japanese wording).
- [ ] Add the API client with `show` and `replace`.
- [ ] Add the policy tab, its route and the path constant.
- [ ] Add the preset choice and the custom tier rows with the seven checks.
- [ ] Show each API error under its field (decision 7).
- [ ] Remove the cancellation select, the schema key and the constants from the create form.
- [ ] Send `agreed_cancellation_policy` in `buildCreatePayload` and in the API client.
- [ ] Handle the changed-policy error in the checkout.
- [ ] Show the preset name and the tiers on the listing page, the checkout and the booking page.
  - Use English and Japanese.
- [ ] Add the label for `platform_default`.
- [ ] Add the late-booking statement to the policy step and the payment step.
- [ ] Add tests (see the acceptance criteria).
- [ ] Link this issue in the Coordination tasks of red-cab-api#168.

### Docs

- [ ] Set spec `status: implemented` after merge.
- [ ] Tell the owner that PR 2 of red-cab-api#168 can start.

## Acceptance criteria

- [ ] A provider sets Flexible, Moderate, Strict or a custom policy on a draft listing and on a published listing.
  - Test: the policy tab page spec calls `replace` with the right body for each choice.
- [ ] A preset sends no `tiers`.
- [ ] A custom policy sends its rows.
- [ ] A custom policy with a rule broken shows the API error under the field.
  - Test: one case for each error key of decision 7.
- [ ] The schema refuses each of the seven custom checks, with the api-168 text.
  - Test: the schema spec has one failing case for each check.
  - Test: one passing case has neighbor tiers at the same refund.
- [ ] The create form has no cancellation select, and a new listing shows Flexible in the policy tab.
- [ ] Checkout sends `agreed_cancellation_policy` with `is_cancellation_policy_agreed`.
  - Test: the service spec checks the payload keys, and that `tier_order` is not sent.
- [ ] When the policy changed, checkout shows the new policy, clears the checkbox and the tourist must agree again.
  - Test: a 422 under `agreed_cancellation_policy` does not show the lost-hold text, and the page loads the listing again.
- [ ] The listing page, the checkout and the booking page show the preset name and the tiers.
- [ ] An old booking with `platform_default` shows its tiers with the label and no error.
- [ ] A booking inside the last window shows the statement before payment.
  - Test: a notice of 10 hours with Flexible shows it.
  - Test: a notice of exactly 24 hours does not.
- [ ] The tourist pages use the Japanese names and sentences when the language is Japanese.
  - Test: the service spec has the Moderate example of this spec in both languages.
- [ ] The preset constant equals the decision page tables.
- [ ] No client-side price computation.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
```

- Run the `review-react-style` skill by hand.
- With a dev API on PR 1, save each preset and a custom policy.
  - Then reload the tab and read the result.
- Start a checkout, change the policy in a second window, then continue in the first window.
- Each pull request lists what it did not check.

## Open points for the owner

- The Japanese wording above needs a native review.
- Decision 7: the API sends tier errors under `tiers`.
  - Confirm there is no per-row key.
- Decision 12: confirm the label "Standard policy" for old bookings.
- The preview type for a listing with the old source may read `platform_default` until PR 2.
  - The agreed-policy check compares the same value on both sides, so it passes.
  - Confirm this on a dev API.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-30 | Owner | Approved, including decisions 3 to 19 and the proposed Japanese wording. |
