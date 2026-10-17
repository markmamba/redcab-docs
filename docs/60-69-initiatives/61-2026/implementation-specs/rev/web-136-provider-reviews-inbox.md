---
title: "Provider reviews inbox UI (W1-3c web)"
sidebar_label: Web · REV provider inbox
issue: "https://github.com/markmamba/red-cab-web/issues/136"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/rev/web-123-provider-review-response-ui.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/rev/web-135-provider-review-report-ui.md"
epic: "https://github.com/markmamba/red-cab-web/issues/120"
---

## TL;DR

- Ships provider **reviews inbox** at `/providers/reviews` with URL-driven filters and pagination.
- Row actions link to booking detail (respond anchor) and listing show (report).
- Booking detail (web #123 host) loads tourist review via `GET /providers/reviews/:review_id` when `review_id` is present.
- **Co-ship:** deploy api #188 (`GET /providers/reviews`) before web merge; review show must be live in staging.

## Problem

api #188 exposes a provider-scoped published review inbox. Providers need one list surface to reach respond (web #123) and report (web #135) without new moderation UI.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-REV-006 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Public provider response; provider reads review on respond |
| ADR-020 | [adr-020-review-post-publication-moderation.md](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Post-publication moderation |
| web-123 | [web-123-provider-review-response-ui.md](./web-123-provider-review-response-ui.md) | Respond surface |
| web-135 | [web-135-provider-review-report-ui.md](./web-135-provider-review-report-ui.md) | Report surface |

API row shape: `red-cab-api/app/domains/reviews/providers_published_review_inbox_serializer.rb` and `test/integration/providers/reviews/reviews_index_integration_test.rb`.

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Report navigates to listing show | Inbox modal | Brief Gate 1 Q1=A; web #135 host |
| 2 | Filters `listing_id`, `is_flagged_by_provider` in URL | Pagination only | Brief Gate 1 Q2=A; matches API |
| 3 | Dashboard link + breadcrumb | Sidebar nav | Brief Gate 1 Q3=A |
| 4 | Respond via booking detail hash anchor | Booking only | Brief Gate 1 Q4=B |
| 5 | Domain folder `reviews-provider-inbox` | Extend team domain | Provider portal scope |
| 6 | Tourist review on booking respond destination | Embed on booking show JSON | api-186 stays `review_id` only; booking loader calls review show |

## Web contract

| Surface | Route | Loader | API module | Notes |
| --- | --- | --- | --- | --- |
| Reviews inbox | `/providers/reviews` | `clientLoader` | `providers-reviews-api.js` | `noindex` |

### HTTP used

| Method | Path | When |
| --- | --- | --- |
| GET | `/providers/reviews` | Inbox loader (`page`, `page_size`, `listing_id`, `is_flagged_by_provider`) |
| GET | `/providers/reviews/:review_id` | Provider booking detail loader when `review_id` is present |

### Files to create or modify (Web)

- `app/api/providers-reviews-api.js`
- `app/api/providers-reviews-api.spec.js`
- `app/domains/reviews-provider-inbox/*`
- `app/routes/provider/provider-reviews-list-page.jsx`
- `app/routes/provider/provider-reviews-list-page.spec.jsx`
- `app/provider.routes.js`
- `app/routes/provider/provider-dashboard-page.jsx`
- `app/domains/bookings-booking/bookings-booking-constant.js`
- `app/domains/bookings-booking/bookings-booking-provider-detail-view.jsx`
- `app/routes/provider/provider-bookings-detail-page.jsx`
- `app/routes/provider/provider-bookings-detail-page.spec.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-tourist-review-view.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-service.js`

## Out of scope

- Team moderation queue (web #122).
- Inbox-embedded report or respond forms.
- Standalone provider review show page.

## Acceptance criteria

- [ ] Approved provider opens paginated inbox at `/providers/reviews`.
- [ ] Respond opens booking detail at review response section anchor.
- [ ] Booking detail shows tourist rating and review text when `review_id` is present (review show API).
- [ ] Report opens listing show for row listing UUID.
- [ ] Filters update URL; submit resets page to 1.
- [ ] No client-side price or moderation fields.
- [ ] PR states api #188 verified in staging before merge.

## Verification

```bash
npm run test -- app/api/providers-reviews-api.spec.js app/domains/reviews-provider-inbox app/domains/reviews-provider-response app/routes/provider/provider-reviews-list-page.spec.jsx app/routes/provider/provider-bookings-detail-page.spec.jsx
npm run lint
```