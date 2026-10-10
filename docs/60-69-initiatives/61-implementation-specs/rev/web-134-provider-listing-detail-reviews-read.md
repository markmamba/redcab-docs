---
title: "Provider listing detail — reviews summary / read"
sidebar_label: Web · REV provider listing reviews
issue: "https://github.com/markmamba/red-cab-web/issues/134"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-190-provider-catalog-listing-reviews-index.md"
epic: "https://github.com/markmamba/red-cab-web/issues/120"
---

## TL;DR

- Ships provider listing **show** at `/providers/catalog/listings/:listingId` with read-only reviews.
- Loader calls listing show plus listing reviews index (paginated).
- UI shows server `rating_average`, `reviews_count`, and published review rows only.
- No respond or report controls.

## Problem

Providers need reputation context on listing detail. Booking detail (web #123) is the wrong surface for listing-level monitoring.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-007 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Display API aggregates only |
| web-123 | [web-123-provider-review-response-ui.md](./web-123-provider-review-response-ui.md) | Provider portal loader pattern |
| api-190 | [api-190-provider-catalog-listing-reviews-index.md](./api-190-provider-catalog-listing-reviews-index.md) | Reviews index HTTP |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | New show route | Extend edit stub | Brief Gate 1 Q2=B |
| 2 | Domain folder `catalog-listing-reviews` | Inline in route | Presentation-only domain views |
| 3 | List rows navigate to show | Edit only | Brief file change list |
| 4 | Default `page_size` 5 on show | Full page size | Short inline list |

## Web contract

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Provider listing show | `/providers/catalog/listings/:listingId` | `clientLoader` | `providers-catalog-listings-api.js`, `providers-catalog-listings-reviews-api.js` | `noindex` |

### HTTP used

| Method | Path | When |
| --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id` | Loader |
| GET | `/providers/catalog/listings/:listing_id/reviews` | Loader + pagination |

### Files to create or modify (Web)

- `app/provider.routes.js`
- `app/routes/provider/provider-catalog-listings-show-page.jsx`
- `app/routes/provider/provider-catalog-listings-show-page.spec.jsx`
- `app/api/providers-catalog-listings-reviews-api.js`
- `app/api/providers-catalog-listings-reviews-api.spec.js`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-service.js`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-service.spec.js`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-summary-view.jsx`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-list-view.jsx`
- `app/domains/catalog-listing/catalog-listing-constant.js`
- `app/domains/catalog-listing/catalog-listing-provider-list-view.jsx` (list page navigation only)
- `app/routes/provider/provider-catalog-listings-list-page.jsx`

## Out of scope

- Provider review response (web #123).
- Provider report UI.
- Marketplace public reviews page.

## Acceptance criteria

- [ ] Provider opens listing show from listings table.
- [ ] Page shows aggregates and published reviews when API returns data.
- [ ] Empty state when `reviews_count` is 0.
- [ ] No respond or report buttons.
- [ ] PR states api-190 verified before merge.

## Verification

```bash
npm run test -- app/api/providers-catalog-listings-reviews-api.spec.js app/domains/catalog-listing-reviews app/routes/provider/provider-catalog-listings-show-page.spec.jsx
npm run lint
```
