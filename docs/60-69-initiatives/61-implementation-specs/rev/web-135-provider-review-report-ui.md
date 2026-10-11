---
title: "Provider review report UI (W1-3b web)"
sidebar_label: Web · REV provider report
issue: "https://github.com/markmamba/red-cab-web/issues/135"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-161-provider-review-report.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-190-provider-catalog-listing-reviews-index.md"
  - "docs/60-69-initiatives/61-implementation-specs/rev/web-134-provider-listing-detail-reviews-read.md"
epic: "https://github.com/markmamba/red-cab-web/issues/120"
---

## TL;DR

- Ships provider **report** on listing detail review rows (`/providers/catalog/listings/:listingId`).
- Optional `reason` in a confirm modal; POST whitelists `reason` only.
- Loader reads `is_flagged_by_provider` from api-190; flagged rows show Reported (no Report).
- **Co-ship:** deploy api-161 and extended api-190 index before web merge.

## Problem

api-161 exposes provider report HTTP. Providers need a surface where rating and review text are visible to flag harmful reviews once per row. Listing detail (web #134) is read-only today.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| api-161 | [api-161-provider-review-report.md](./api-161-provider-review-report.md) | POST report |
| api-190 | [api-190-provider-catalog-listing-reviews-index.md](./api-190-provider-catalog-listing-reviews-index.md) | Index row flag |
| ADR-020 | [adr-020-review-post-publication-moderation.md](/docs/30-49-domains/34-architecture-decisions/adr-020-review-post-publication-moderation) | Review stays public until Team remove |
| web-134 | [web-134-provider-listing-detail-reviews-read.md](./web-134-provider-listing-detail-reviews-read.md) | Host page |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Report on listing detail rows only | Booking detail | Brief Gate 1 Q1=A; tourist text not on booking show |
| 2 | Optional reason textarea in modal | Confirm only | Brief Gate 1 Q2=B; api-161 optional `reason` |
| 3 | Reported state from api-190 `is_flagged_by_provider` | Client-only after POST | Brief Gate 1 Q3=B; reload-safe |
| 4 | Domain folder `catalog-listing-reviews` | New `reviews-provider-report` | Extends web #134 domain views |
| 5 | Page owns POST + revalidate | `clientAction` | Match web #123 booking detail pattern |

## Web contract

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Listing show | `/providers/catalog/listings/:listingId` | `clientLoader` | `providers-catalog-listings-reviews-api.js`, `providers-reviews-report-api.js` | `noindex` |

### HTTP used

| Method | Path | When |
| --- | --- | --- |
| GET | `/providers/catalog/listings/:listing_id/reviews` | Loader (includes `is_flagged_by_provider`) |
| POST | `/providers/reviews/:review_id/report` | Report modal submit |

### Files to create or modify (Web)

- `app/api/providers-reviews-report-api.js`
- `app/api/providers-reviews-report-api.spec.js`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-report-schema.js`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-report-button.jsx`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-service.js`
- `app/domains/catalog-listing-reviews/catalog-listing-reviews-list-view.jsx`
- `app/routes/provider/provider-catalog-listings-show-page.jsx`
- Matching `*.spec.js` / `*.spec.jsx` under the above paths

## Out of scope

- Team moderation queue (web #122).
- Provider public response (web #123).
- Booking detail report (api-187 embed).
- Enumerated report reason codes.

## Acceptance criteria

- [ ] Provider reports a published review once from listing detail; success toast and loader revalidate.
- [ ] Second report on same review returns `422` with toast (or field errors for length).
- [ ] Flagged rows show Reported; Report is hidden.
- [ ] POST body sends only `reason` when present; empty reason omitted.
- [ ] PR states api-161 and api-190 flag field verified in staging before merge.

## Verification

```bash
npm run test -- app/api/providers-reviews-report-api.spec.js app/domains/catalog-listing-reviews app/routes/provider/provider-catalog-listings-show-page.spec.jsx
npm run lint
```
