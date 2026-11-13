---
title: "Show the owner which member did an action"
sidebar_label: Web · Member on records
issue: "https://github.com/markmamba/red-cab-web/issues/195"
repos:
  - red-cab-web
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-268-member-columns.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-193-invitations-and-members.md"
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#member-on-records"
  - "docs/30-49-domains/32-iam/requirements/provider-company-members.md"
---

## TL;DR

- An owner sees one short line for each member key that holds a name.
- `Published by` goes on the listing page.
- `Marked delivered by`, `Answered by` and `Reported by` go on the booking page.
- A missing key, a `null` key or an empty name shows no line.
- The pages make no role check, because the API decides who gets the key.
- The pages make no new API call.
- Breaking change: No.
  - This spec merges after `api-268`, and the API can deploy first.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| member | A person with a row in `providers_memberships`. A removed member keeps the row. |
| member key | A JSON key that holds the first name and the last name of a member. |
| member line | One line of text with a label and the name of a member. |
| owner, staff | The two company roles. |

## User stories

1. US-1: As an owner, I want to see who published a listing, so I can ask that person about it.
2. US-2: As an owner, I want to see who marked a booking delivered, because this action moves money.
3. US-3: As an owner, I want to see who wrote a review answer and who reported a review.
4. US-4: As staff, I want my pages to stay the same.

## Problem

The API sends the member keys after `api-268`, but no page shows them.

- `provider-catalog-listings-show-page.jsx` shows the status badge and no member.
- `bookings-booking-provider-detail-view.jsx` shows `Completed At` and no member.
- `reviews-provider-response-tourist-review-view.jsx` shows the review and no reporter.
- `reviews-provider-response-summary.jsx` shows the answer and no author.

The two routes already load all four reads.

- `provider-catalog-listings-layout.jsx` reads the listing, and the show page gets it from the outlet.
- `provider-bookings-detail-page.jsx` reads the booking, the review and the answer.

## Governing docs

Read these before design.

Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Member on records](/docs/30-49-domains/iam/iam-decisions/#member-on-records) | Only an owner reads the member, and the system names no member |
| Rule | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company) | Tourists see the company name, not the member |
| Requirement | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) | The owner sees the member |
| Paired spec | [API member columns](api-268-member-columns.md) | The keys and their values |
| Depends on | [Invitations and members](web-193-invitations-and-members.md) | Creates `providers-membership-service.js`, and keeps provider pages in English |
| Web rules | `red-cab-web/AGENTS.md` and `red-cab-web/app/domains/AGENTS.md` | Domain folders, services and constants |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | A page shows a line when the key holds a name, and it makes no role check. | Read `company_role` on each page. | The API decides who gets the key. The booking page does not load the company. |
| 2 | A missing key, a `null` key and an empty name all show no line. | A different text for each case. | The owner needs no text when no member acted. |
| 3 | `formatMemberName` returns the name or `null`. | Reuse `buildDisplayName`. | That helper is private, and it falls back to an email that this JSON does not hold. |
| 4 | `formatMemberName` lives in `ProvidersMembershipService`. | One copy in each domain. | `web-193` creates this service, and the rule stays in one place. |
| 5 | One small view, `ProvidersMembershipMemberLineView`, shows every line. | Write the markup four times. | The four lines stay the same. |
| 6 | The listing line shows only when the status is `published`. | Show it for any status. | Later pause work needs another label, so `Published by` must never show on a paused listing. |
| 7 | `Marked delivered by` goes after `Completed At`, in the same list. | Put it in the header. | The time and the person belong together. |
| 8 | `Reported by` goes under the tourist review, and `Answered by` goes under the answer. | Put both in one block. | Each line stays next to its own text. |
| 9 | The listing page does not show `Reported by`. | Add the key to the review list. | `api-268` keeps list reads free of the key. |
| 10 | The lines keep English text. | Translate them. | `web-193` keeps the provider pages in English. |
| 11 | A removed member shows like any other member. | Add a "Removed" tag. | The JSON does not say that the person left. |
| 12 | The loaders do not change. | Add a read for the member. | The keys come with the existing reads. |
| 13 | A write does not add the line by itself. | Copy the key from the write response. | Write responses have no key. The page must reload after a write, and a task checks this for the booking page. |

## Web contract

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Provider | `/providers/catalog/listings/:listingId` | Unchanged | `providersCatalogListingsApi.show` | Unchanged |
| Provider | `/providers/bookings/:bookingId` | Unchanged | `providersBookingsBookingApi.show`, `providersReviewsApi.show`, `providersReviewsProviderResponseApi.show` | Unchanged |

### The member lines

| Page | Place | Label | Key | Shown when |
| --- | --- | --- | --- | --- |
| Listing | Under the title and the status badge | `Published by` | `catalogListing.status_changed_by` | The status is `published` and the key holds a name |
| Booking | After `Completed At` | `Marked delivered by` | `booking.marked_delivered_by` | The key holds a name |
| Booking | Under the tourist review | `Reported by` | `touristReview.reported_by` | The key holds a name |
| Booking | Under the answer | `Answered by` | `providerResponse.answered_by` | The key holds a name |

`Reported by` and `Answered by` sit inside the response section, so they show only when the booking has a review.

### The name

`ProvidersMembershipService.formatMemberName(member)` follows these rules.

1. It returns `null` for a missing or `null` member.
2. It trims `first_name` and `last_name`, and it treats a `null` value as empty.
3. It joins the two values with one space.
4. It returns `null` when the result is empty.

### The view

`ProvidersMembershipMemberLineView` takes `label` and `member`.

- It calls `formatMemberName`.
- It renders nothing when the result is `null`.
- It renders the label and the name in small muted text.

The booking list keeps its markup for `Completed At`.

- The view takes a `className` only if that place needs it.

### Files to create or modify (Web)

- `app/domains/providers-membership/providers-membership-service.js` (add `formatMemberName`)
- `app/domains/providers-membership/providers-membership-member-line-view.jsx` (create)
- `app/routes/provider/provider-catalog-listings-show-page.jsx`
- `app/domains/bookings-booking/bookings-booking-provider-detail-view.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-tourist-review-view.jsx`
- `app/domains/reviews-provider-response/reviews-provider-response-summary.jsx`

`web-192` and `web-193` may rename the provider route files, so use the names that exist at merge.

### Code to remove

This spec removes no code.

### Implemented specs that this spec replaces

This spec replaces no part of an implemented spec.

- It adds four lines to existing pages.

### Tests that must change

| Test files | Change |
| --- | --- |
| `app/routes/provider/provider-catalog-listings-show-page.spec.jsx` | Assert the line for each case in the table below |
| `app/routes/provider/provider-bookings-detail-page.spec.jsx` | Assert the three lines with an owner answer, and none with a Staff answer |

New tests cover these behaviors.

- `formatMemberName` returns the full name.
- `formatMemberName` returns one name when the other is `null`.
- `formatMemberName` returns `null` for a `null` member and for two empty names.
- `ProvidersMembershipMemberLineView` renders nothing without a name.

| Case | Listing line |
| --- | --- |
| Status `published`, key with a name | `Published by Mika Tanaka` |
| Status `published`, key `null` | No line |
| Status `published`, key missing | No line |
| Status `unlisted`, key `null` | No line |
| Status `paused`, key with a name | No line |

## Data / domain touchpoints

- Bounded context: IAM, on pages of Catalog, Bookings and Reviews.
- Transaction boundaries: none in the web.
- Snapshots: none.
- The web stores no member, and each line reads the answer of its load.

## Worked example

Kenji owns Kanto Charter, and Mika is staff.

1. Mika publishes a listing, and the page reloads.
2. Mika sees no member line, because the JSON for Staff has no key.
3. Kenji opens the same listing and sees `Published by Mika Tanaka`.
4. Kenji opens a booking that Mika marked delivered, and the page shows `Marked delivered by Mika Tanaka`.
5. Kenji opens a booking that the system completed, and the page shows no line.
6. Kenji opens a booking with a review, and the page shows `Answered by Mika Tanaka`.
7. Kenji removes Mika, and the lines stay.
8. The team deactivates the prefecture, and the listing page shows no line.
9. A tourist opens the listing and sees "Kanto Charter".

## Out of scope

- A list of actions, or a member column on a list page.
- The pause label, which [redcab-docs#171](https://github.com/markmamba/redcab-docs/issues/171) covers.
- A link from a name to the members page.
- A "Removed" tag on a name.
- Japanese copy for the provider pages.
- The team pages and the tourist pages.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- An owner sees a name that is not on the members page after a removal.
- Two members with the same name look the same.

## Tasks

### Web

- [ ] Add `formatMemberName`.
- [ ] Add `ProvidersMembershipMemberLineView`.
- [ ] Add the line to the listing page.
- [ ] Add the three lines to the booking page.
- [ ] Check that the booking page reloads after a mark delivered and after a new answer.
- [ ] Add a reload to the booking page if the check fails.
- [ ] Update the tests.
- [ ] Run the checks in [Verification](#verification).

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] An owner sees all four lines when the keys hold names.
- [ ] Staff see none of the four lines.
- [ ] A `null` key, a missing key and an empty name show no line.
- [ ] A paused listing never shows `Published by`.
- [ ] A removed member still shows by name.
- [ ] The booking page shows the new line right after a mark delivered and after a new answer.
- [ ] The pages make no new API call and read no role.
- [ ] Tourist pages show no member.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
git grep -n 'formatMemberName' -- app
git grep -n -E 'status_changed_by|marked_delivered_by|answered_by|reported_by' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
