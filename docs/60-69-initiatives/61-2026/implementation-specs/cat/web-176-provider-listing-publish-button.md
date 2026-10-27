---
title: "Add a Publish button for draft listings"
sidebar_label: Web · Publish button
issue: "https://github.com/markmamba/red-cab-web/issues/176"
repos:
  - red-cab-web
status: implemented
phase: 2
context: CAT
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-156-provider-packages-and-tourist-package-choice.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-211-many-packages-and-display-prices.md"
---

## TL;DR

- Ships a Publish button on the provider listing detail page, for a draft listing.
- The button calls `providersCatalogListingsApi.publish`.
- The button is off when the listing has no active package.
- The page shows the API error message in a toast.
- The page refreshes the listing after a successful publish.
- Changes the intro text of the create listing page to mention publishing.
- Does NOT add anything to the edit listing page, photo upload or pickup coverage.
- Breaking change: No.

## Problem

A provider creates a draft listing and adds packages to it.

The web has no way to publish the draft. The API method `providersCatalogListingsApi.publish` exists, and no page calls it.

The API refuses a publish with status 422 when the listing has no active package. The message is "Add at least one package before publishing your listing." No screen shows this message today.

Evidence: `app/api/providers-catalog-listings-api.js` (`publish`), `app/routes/provider/provider-catalog-listings-show-page.jsx`, `app/routes/provider/provider-catalog-listings-edit-page.jsx` (stub), decision 40 of web-156, issue #176.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Requirements | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | What a provider sees when they publish |
| Ruling | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy) | A listing needs an active package to publish |
| Spec | api-211, decision 41 | The API returns 422 when the listing has no active package |
| Spec | web-156, decision 40 | The origin of this issue |
| INV-10 | [Invariants](/docs/70-79-business/business-rules/invariants) | A listing cannot be `Published` with zero photos |
| INV-12 | [Invariants](/docs/70-79-business/business-rules/invariants) | A listing cannot be `Published` without an active, verified merchant account |
| Convention | `red-cab-web/AGENTS.md`, `app/routes/AGENTS.md`, `app/domains/AGENTS.md` | Web rules |

## Design decisions

Each row says who made the decision.

"Added point, please review" means the author added it. The owner must confirm or change each row before approval.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Added point, please review. The Publish button sits on the listing detail page, next to the Edit listing button.** | Put it on the edit page. Put it on the Packages tab. | The edit page is a stub and is out of scope. The detail page already shows the status badge. |
| 2 | **Added point, please review. The button shows only when the listing status is `draft`.** | Show it for every status. | Only a draft can publish. `CatalogListingService.isDraft` already exists. |
| 3 | **Added point, please review. The detail page `clientLoader` also loads the packages with `providersCatalogListingPackagesApi.index`. The button is off when no package has status `active`.** | Add a package count to the listing payload (API change). Leave the button on and rely on the 422. | It needs no API change. The page reloads on each visit, so the state is fresh. |
| 4 | **Added point, please review. The button stays visible and turns off. A short hint under it says "Add at least one active package to publish."** | Hide the button. | The provider sees why the button is off, and where to go next. |
| 5 | **Added point, please review. The handler shows the API message in a toast through `getApiErrorToastConfig`. The web does not write its own copy of the 422 message.** | Hard-code the message in the web. | The API owns the text. The same path also shows the other publish errors (INV-10, INV-12). |
| 6 | **Added point, please review. After a successful publish, the handler calls `revalidate()` and shows a success toast.** | Navigate to the list page. | The provider stays on the page and sees the status badge change to Published. |
| 7 | **Added point, please review. The button shows a loading state while the call runs, and blocks a second click.** | No loading state. | It stops a double publish. |
| 8 | **Added point, please review. The create page intro says: "Configure your service as a draft. Next, add your packages and their prices. Then publish the listing."** | Keep the text. | The issue asks for it. The words follow STE100. |
| 9 | **Added point, please review. The web does not check photos or merchant account status before it enables the button.** | Add the checks in the web. | The API owns INV-10 and INV-12. The web shows the API message. A later issue can add a checklist (`getPublishReadiness` is display-only today). |

## Web contract

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Provider | `/providers/catalog/listings/:listingId` (existing detail page) | `clientLoader`, adds packages | `providers-catalog-listings-api.js` (`publish`, exists), `providers-catalog-listing-packages-api.js` (`index`, exists) | `provider-required-policy` (existing) |

The API call:

| Method | Path | Request body | Success | Failure |
| --- | --- | --- | --- | --- |
| POST | `/providers/catalog/listings/:listingId/publish` | None | The published listing | 422 with a message when a gate fails |

Check the real path in `PROVIDERS_CATALOG_LISTINGS_PATH` before coding.

### Files to create or modify (Web)

- `app/routes/provider/provider-catalog-listings-show-page.jsx`: Publish button, hint, handler, and packages in the `clientLoader`.
- `app/routes/provider/provider-catalog-listings-create-page.jsx`: intro text.
- `app/domains/catalog-listing-package/catalog-listing-package-service.js`: add `hasActivePackage(catalogListingPackages)`, with JSDoc.
- `app/routes/provider/provider-catalog-listings-show-page.spec.jsx`: new tests.
- `app/routes/provider/provider-catalog-listings-create-page.spec.jsx`: update the intro text if a test checks it.
- `app/domains/catalog-listing-package/catalog-listing-package-service.spec.js`: tests for `hasActivePackage`.

The handler lives in the page file and is exported for tests, like `handleProviderCatalogListingReviewReport`. No passive view calls the API.

## Data / domain touchpoints

- Bounded context: CAT.
- Transaction boundaries: none in the web.
- The API publishes in one call.
- Snapshots: none.
- The page shows no amount, so the web computes no price.

## Out of scope

- The edit listing page.
- Photo upload.
- Pickup coverage (release 4).
- A full publish checklist (photos, merchant account).
- An Unpublish or Pause button.
- Any API change.

## Tasks

### Web

- [ ] Add `hasActivePackage` to the package service.
- [ ] Load the packages in the detail page `clientLoader`.
- [ ] Add the Publish button, the hint and the handler.
- [ ] Show the API error in a toast.
- [ ] Refresh the listing after a successful publish.
- [ ] Change the intro text of the create listing page.
- [ ] Add tests.

### Docs

- [x] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A provider can publish a draft listing that has an active package.
- [ ] A provider who publishes with no active package sees the toast "Add at least one package before publishing your listing."
- [ ] The listing status changes to Published after a successful publish.
- [ ] The Publish button shows only for a draft listing.
- [ ] The Publish button is off when the listing has no active package.
- [ ] The Publish button blocks a second click while the call runs.
- [ ] The create page intro mentions publishing.
- [ ] Tests cover: button shown for draft, hidden for published, off with no active package, success path, 422 path.
- [ ] No client-side price computation.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
```

Run `review-react-style` before the PR.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
