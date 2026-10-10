---
title: "Team review moderation pages (W1-6)"
sidebar_label: Web · REV team moderation
issue: "https://github.com/markmamba/red-cab-web/issues/122"
repos:
  - red-cab-web
status: approved
phase: 2
context: REV
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/rev/api-159-team-review-moderation-endpoints.md"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- Ships Team Admin **dispute queue** list and **review detail** at `/team/reviews` per `FR-REV-005` and ADR-020.
- List uses URL-driven filters and pagination; **dismiss report** runs from the list row; **remove** runs on detail with `removal_reason`.
- Does not ship pre-moderation **approve**, provider report UI, or new API endpoints.
- **Co-ship:** verify api-159 in staging before web merge.

## Problem

api-159 exposes Team moderation HTTP. Team admins need pages to work the dispute queue without duplicating API rules on the client.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| api-159 | [api-159-team-review-moderation-endpoints.md](./api-159-team-review-moderation-endpoints.md) | HTTP contract |
| FR-REV-005 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Queue, dismiss, remove |
| ADR-020 | [adr-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) | Post-publication model; no approve |
| frontend.md | [frontend conventions](/docs/50-59-frontend/conventions/frontend) | Team portal patterns |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Domain folder `team-reviews-review` | Inline in routes | Brief; parallel to `reviews-review` |
| 2 | API module `team-reviews-api.js` | Nested under bookings | Matches `team/reviews` path |
| 3 | Index default on first load | Force `is_flagged_by_provider=true` in URL | Omit param; api-159 default dispute queue |
| 4 | Full filter form on list | Pagination only | Brief Gate 1 Q1=B |
| 5 | Row dismiss + detail remove | Both on detail | Brief Gate 1 Q3=B |
| 6 | Show photo metadata on detail | Hide photos | Brief Gate 1 Q2=A; no public URL in serializer |
| 7 | No client sort UI | `order_by` in URL | api-159 fixed sort |
| 8 | Hard co-ship gate | Merge web first | Brief Gate 1 Q4=A |

## Web contract

| Surface | Route | Loader | API module | Auth |
| --- | --- | --- | --- | --- |
| Team | `/team/reviews` | `clientLoader` | `team-reviews-api.js` | `admin-required-policy` parent |
| Team | `/team/reviews/:reviewId` | `clientLoader` | `team-reviews-api.js` | same |

### HTTP used (api-159)

| Method | Path | When |
| --- | --- | --- |
| GET | `/team/reviews` | List loader |
| GET | `/team/reviews/:review_id` | Detail loader |
| POST | `/team/reviews/:review_id/dismiss_report` | List row dismiss |
| POST | `/team/reviews/:review_id/remove` | Detail remove form |

### Files to create or modify (Web)

- `app/api/team-reviews-api.js`
- `app/api/team-reviews-api.spec.js`
- `app/domains/team-reviews-review/*`
- `app/routes/team/reviews/*`
- `app/team.routes.js`
- `app/layouts/team/team-sidebar-config.js`

## Out of scope

- Provider report UI (web #123).
- Tourist submit UI (web #121).
- Pre-moderation approve action.
- Marketplace listing deep links from team detail.

## Tasks

### Web

- [ ] Add `team-reviews-api.js` with whitelisted index params and remove body
- [ ] Add domain list/detail views, filter form, remove form, constants, service
- [ ] Register routes and enable sidebar Reviews item
- [ ] Unit tests for API whitelist and remove schema

### Docs

- [x] `review-implementation-spec`; `status: approved`
- [ ] After merge, set `status: implemented`

## Acceptance criteria

- [ ] Team admin opens paginated list with URL filters for `moderation_status`, `is_flagged_by_provider`, `listing_id`, `provider_id`.
- [ ] First load without `is_flagged_by_provider` uses api-159 default flagged queue.
- [ ] Detail shows full review content and photo metadata when present.
- [ ] Dismiss from list row clears flag after revalidate; remove on detail requires trimmed non-empty reason (max 5,000).
- [ ] No approve UI. Pages use `noindex` meta and `teamApiClient`.
- [ ] PR states API deploy before web merge.

## Verification

```bash
# from red-cab-web/
npm run lint
npm run test -- app/api/team-reviews-api.spec.js app/domains/team-reviews-review
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-10 | Build (/pkm-build #122) | `review-implementation-spec` | approved from brief Gate 1 |
