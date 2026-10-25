---
title: "Move the web to asset holds: provider schedules, date and time picker, and checkout"
sidebar_label: Web · Asset holds
issue: "https://github.com/markmamba/red-cab-web/issues/155"
repos:
  - red-cab-web
status: approved
phase: 2
context: CAT
related:
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-209-asset-schedules-closures-holds.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-210-asset-holds-in-checkout-and-booking.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-231-listing-detail-packages.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/pay/web-62-tourist-checkout-multi-step-layout.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/pay/web-12-checkout-payment-step.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-56-tourist-access-and-route-contract.md"
---

## TL;DR

- Providers get two new tabs on the asset edit page: working hours (schedules) and closed days.
- Tourists pick a day on a month calendar and a start time in a dropdown list.
- Checkout, the quote and the booking pages move from a slot to a package, a date and a start time.
- The checkout pages get a new layout with a stepper, a sticky order summary and a hold notice.
- The work ships in three pull requests: provider screens, then the picker with the checkout contract, then the checkout layout.
- Does NOT add a package chooser (release 3) or a booking location (release 4).
- Does NOT change tourist cancel, provider cancel, Home or the listing card.
- Breaking change: Yes, because the checkout URL and the API calls drop `availability_slot_id`.

## Problem

The API holds an asset for a package, a date and a start time.

It no longer reserves seats on a slot.

The web still sends `availability_slot_id`, so tourists cannot book.

Providers have no screen for working hours or closed days.

The old slot components in `app/domains/catalog-availability-slot/` are not used by any route.

The listing detail page cannot show "currently unavailable", and it cannot handle a null price.

The checkout pages have no approved layout spec for the new hold rules.

Evidence: `app/routes/tourist/tourist-checkout-page.jsx`, `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.jsx`, `app/domains/catalog-listing/catalog-listing-slot-picker-view.jsx`, issue #155.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Spec | api-209, api-210, api-231 | The API contract that the web calls |
| Spec | web-62 and web-12 | Checkout steps, payment and return rules. This spec amends web-62 |
| Spec | web-56 | The checkout handoff params. This spec amends it |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) | One hold for each booking |
| Requirements | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | The tourist picks a date and a start time on a fixed step |
| Requirements | [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings) | Provider rules for assets |
| Convention | `red-cab-web/AGENTS.md` and `app/domains/AGENTS.md` | Web conventions |
| PRC-1, INV-1 | [Invariants](/docs/70-79-business/business-rules/invariants) | No price math on the client, and snapshots cannot change |

## Design decisions

Each row says who made the decision.

"Owner ruling" means the product owner decided it.

"Added point, please review" means the author added it.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-25. One issue, one spec and three pull requests. Red-cab-web#151 merged into #155. PR 1: provider screens. PR 2: the picker and the checkout contract. PR 3: the checkout layout.** | Separate issues. | The checkout files change once. The contract fix does not wait for the layout. |
| 2 | **Owner ruling, 2026-10-25, changed 2026-10-25 after PR 2 review. The picker is a month calendar and a start time dropdown (mock options A and C).** | A chip grid for start times. A two-step picker. | Closed days show on the calendar. The dropdown keeps the panel short. |
| 3 | **Owner ruling, 2026-10-25. The checkout has two columns, a stepper on top and a sticky order summary. On mobile the summary is a collapsed card above the form (mock option A).** | A slim progress bar. A single column with a bottom bar. | It stays close to today's layout. |
| 4 | **Owner ruling, 2026-10-25. The provider screens are tabs on the asset edit page: Details, Working hours and Closed days (mock option A).** | A separate page. A modal. | No new menu item. |
| 5 | **Owner ruling, 2026-10-25. The closed-day form closes one day at a time.** | A date range helper. | It matches the API. |
| 6 | **Owner ruling, 2026-10-25. The author drafts the Japanese copy. The owner reviews it before the spec is approved.** | English only. | The tourist pages stay in both languages. |
| 7 | **Owner ruling, 2026-10-25. The checkout shows a fixed notice with the hold end time. It has no live timer.** | A live countdown. No notice. | The server decides, so a timer could only warn. |
| 8 | **Owner ruling, 2026-10-25. The `.pen` wireframes are not used. Layouts come from static HTML mocks.** | Follow the wireframes. | The owner chose to ignore them. |
| 9 | **Added point, please review. The listing detail page keeps `passenger_count`, `service_date` and `start_time` in the URL. The checkout URL carries `listing_id`, `package_slug`, `service_date`, `start_time` and `passenger_count`. No page reads or writes `availability_slot_id`.** | Keep the old param. | The API accepts only the new params. |
| 10 | **Added point, please review. Release 2 uses the first package of the `packages` list. There is no package chooser. An empty list means the listing is not bookable.** | Build a chooser. | Each listing has one package until release 3. |
| 11 | **Added point, please review. The calendar is a new view built with react-bootstrap and no new dependency. It moves from this month to 12 months ahead.** | A date library. | The project has no date library, and the view is small. |
| 12 | **Added point, please review. The listing detail page loads the open dates of a month and the start times of a day in event handlers, as it loads slots today. The views stay passive.** | Calls inside the views. | The web rules allow API calls only in loaders and handlers. |
| 13 | **Added point, please review. The price shows from the quote of the listing detail. It does not depend on the day or the time. The Book button needs a day, a time, a loaded quote and a complete profile.** | Hide the price until a time is picked. | The quote is the package price. |
| 14 | **Added point, please review. When the session create returns 422 "This time is no longer available...", the policy step shows the message and a link "Choose another time". The link goes to the listing detail with the same `service_date` and no `start_time`.** | Send the tourist to the start. | The tourist keeps the day. |
| 15 | **Added point, please review. When payment returns 422 because the hold ended, the payment step shows "Your time is no longer held. Please book again." with a link back to the service.** | A generic error. | The tourist knows what to do. |
| 16 | **Added point, please review. The order summary shows the package name, the service date and time range, the passengers and the total. Before the session exists it reads the URL and the quote. After that it reads the session.** | Read the URL always. | The session is the record that the API holds. |
| 17 | **Added point, please review. The booking pages and the booking copy text show the package name and the service start and end. They no longer print `availability_slot_id`.** | Print the hold id. | A tourist needs the readable values. |
| 18 | **Added point, please review. The asset edit page becomes a layout with three child routes: `/providers/catalog/assets/:providerAssetId/edit`, `.../schedules` and `.../closures`. The tabs are links.** | Tab state in one page. | Each tab has a URL and a loader. |
| 19 | **Added point, please review. The schedule form has seven day toggles, an opening time, a closing time, a first day and an optional last day. A save sends all fields. The list shows the schedules by first day. There is no delete.** | Partial save. | The API uses the full-update contract and has no delete. |
| 20 | **Added point, please review. The closed-day form has a date and an optional reason of up to 255 characters. Each closed day has a Reopen button that deletes it.** | A confirm step. | Reopening is safe and reversible. |
| 21 | **Added point, please review. The forms send exactly what the provider picked. The server anchors the dates. The web does no timezone math on the write path.** | Convert in the browser. | The web conventions say so. |
| 22 | **Added point, please review. API errors for a closure or a schedule edit that hits a live hold show under the form as the server message.** | A fixed message. | The server message is already plain English. |
| 23 | **Added point, please review. The old slot components, the two slot API clients and the slot text on the asset pages are removed in PR 1.** | Keep them. | Nothing uses them. |
| 24 | **Added point, please review. The tourist pages show the service time in the timezone of the listing, from the API. No component hardcodes a timezone.** | The browser timezone. | The web rules forbid a hardcoded zone. |

## Amendments to earlier specs

| Spec | Rule that changes | New rule |
| --- | --- | --- |
| web-56 | Decision 5 and the data note: the handoff carries a listing UUID, a slot UUID and a passenger count | The handoff carries the listing UUID, `package_slug`, `service_date`, `start_time` and the passenger count |
| web-62 | Decision 3 and "Listing slot selection": a slot picker sets `availability_slot_id` | A calendar and a start time grid set `service_date` and `start_time` |
| web-62 | Scenario B: a stale slot shows a link to the slot picker | A failed hold shows a link back to the picker with the same day |
| web-62 | Decision 8: the hold is a seat reservation on a slot | The hold is an asset hold for a package, a date and a start time |
| web-62 | "Listing: disable Book until the quote matches the slot" | Book needs a day, a time, a loaded quote and a complete profile |

The docs PR that sets this spec to `implemented` also edits those two specs.

## Web contract

### Routes

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Provider | `/providers/catalog/assets/:providerAssetId/edit` | `clientLoader` | `providers-catalog-assets-api.js` | `provider-required-policy` |
| Provider | `/providers/catalog/assets/:providerAssetId/schedules` | `clientLoader` | `providers-catalog-asset-schedules-api.js` | `provider-required-policy` |
| Provider | `/providers/catalog/assets/:providerAssetId/closures` | `clientLoader` | `providers-catalog-asset-closures-api.js` | `provider-required-policy` |
| Marketplace | `/listings/:listingSlug` | `loader` | `marketplace-catalog-listings-api.js` | none |
| Tourist | `/account/checkout` | `clientLoader` | `marketplace-catalog-listings-api.js` | `tourist-required-policy` |

### API calls

| Call | Used for | Notes |
| --- | --- | --- |
| `GET /providers/catalog/assets/:id/schedules` | The schedule list | Paginated |
| `POST` and `PATCH .../schedules` | Save a schedule | 422 shows the server message |
| `GET /providers/catalog/assets/:id/closures` | The closed day list | Paginated |
| `POST` and `DELETE .../closures` | Close a day, reopen a day | 422 shows the server message |
| `GET /marketplace/catalog/listings/:id` | The listing detail | Reads `packages`, `is_bookable` and a nullable `price_breakdown` |
| `GET .../packages/:slug/open_dates?month=` | The calendar | Month from this month to 12 months ahead |
| `GET .../packages/:slug/start_times?service_date=` | The time dropdown | Free times of one day |
| `POST /tourists/bookings/checkout_sessions` | Create the session | Sends `package_slug`, `service_date` and `start_time` |

### Files to create or modify (web)

- `app/api/`: add `providers-catalog-asset-schedules-api.js`, `providers-catalog-asset-closures-api.js` and `marketplace-catalog-listing-packages-api.js`.
- `app/api/`: remove `providers-catalog-availability-slots-api.js` and `marketplace-catalog-availability-slots-api.js`.
- `app/domains/catalog-asset-schedule/` and `app/domains/catalog-asset-closure/`: constants, zod schemas, forms, list views and services.
- `app/domains/catalog-availability-slot/`: remove.
- `app/domains/catalog-listing/`: add the calendar view, the start time view and a picker service.
- `app/domains/catalog-listing/`: remove the slot picker view and the slot service, and change `catalog-listing-service.js` (checkout path, Book rules).
- `app/domains/bookings-checkout-session/`: the service (payload, error checks), the order summary view, the stepper view, the policy and payment views.
- `app/domains/bookings-booking/bookings-booking-service.js`: the copy text lines.
- `app/domains/tourist/tourist-surface-copy.js`: the new English and Japanese copy.
- `app/routes/provider/`: the asset edit layout and the two tab pages, and the text of the asset list and create page.
- `app/provider.routes.js`: the new routes.
- `app/routes/marketplace/catalog-listing/marketplace-catalog-listing-detail-page.jsx` and `app/routes/tourist/tourist-checkout-page.jsx`.
- `app/styles/_components.scss`: the stepper, the summary and the calendar.
- The list comes from searches and may be incomplete.

## Layouts

### Picker (PR 2)

```text
Book this service
< November 2026 >
M  T  W  T  F  S  S      open day = green, closed or full day = grey
.. .. .. [6] 7  8  9     the picked day is filled
Start time
[ 09:00           v ]
2 passengers            ¥10,000
[ Book now ]
```

- It sits in the right column on desktop and in a card above the mobile book bar.
- The dropdown lists the free start times, with "Choose a start time" first.
- With no free time on a day, the panel says that no time is free and shows no dropdown.
- With `is_bookable` false, the panel says "This service is currently unavailable." and shows no price.

### Checkout (PR 3)

```text
< Back to service
Checkout          Your time is held until 14:35 (JST).
(1 Details)-(2 Policy)-(3 Payment)
+---------------------------+  +----------------------+
| step form                 |  | Haneda Airport       |
|                           |  | Package: Standard    |
|                           |  | Fri 6 Nov 09:00-17:00|
|                           |  | 2 passengers  ¥10,000|
+---------------------------+  +----------------------+
```

- The summary is sticky on desktop.
- On mobile the summary is a collapsed card above the form.

### Provider tabs (PR 1)

- The tabs are Details, Working hours and Closed days.
- Working hours has the schedule list and the add form side by side on desktop, stacked on mobile.
- Closed days has the date and reason form and the list with a Reopen button.

## Copy

Added point, please review.

The Japanese is a draft, and the owner reviews it before approval.

| Key | English | Japanese (draft) |
| --- | --- | --- |
| `picker.choose_day` | Choose a day | 日付を選択 |
| `picker.choose_time` | Choose a start time | 開始時間を選択 |
| `picker.no_free_times` | No free times on this day. Try another day. | この日は予約可能な時間がありません。別の日をお選びください。 |
| `picker.unavailable` | This service is currently unavailable. | このサービスは現在ご利用いただけません。 |
| `picker.load_error` | We could not load the times. Please try again. | 予約可能な時間を読み込めませんでした。しばらくしてからもう一度お試しください。 |
| `checkout.hold_notice` | Your time is held until `{time}`. | 選択した予約枠は`{time}`まで確保されています。 |
| `checkout.hold_unavailable` | This time is no longer available. Please choose another date or time. | 選択した時間は予約できなくなりました。別の日時をお選びください。 |
| `checkout.hold_expired` | Your time is no longer held. Please book again. | 予約枠の確保期限が切れました。もう一度日時を選択してください。 |
| `checkout.choose_another_time` | Choose another time | 別の時間を選ぶ |
| `checkout.summary.package` | Package | パッケージ |
| `checkout.summary.service_time` | Service time | サービス日時 |
| `checkout.summary.passengers` | Passengers | 人数 |

The provider pages stay in English, as they are today.

## Data / domain touchpoints

- Bounded context: CAT and BKG, read through the API.
- The web computes no price, and it shows the quote and the session amounts.
- The web writes no hold, because the API owns holds.

## Out of scope

- The package chooser and the package form (release 3).
- The booking location (release 4).
- Tourist cancel (red-cab-web#129), provider cancel (red-cab-web#131) and refund pages.
- Home and the listing card (red-cab-web#146 and #147).
- The tourist shell, the nav and the footer, which belong to web-58 and are done.
- A live hold countdown.
- A date range helper for closed days.

## Tasks

### Planning

- [ ] Get the Japanese copy reviewed.
- [ ] Set this spec to `status: approved`.

### PR 1: provider screens

- [ ] Add the schedule and closure API clients and their tests.
- [ ] Add the schedule and closure domains: schemas, forms, list views and services.
- [ ] Turn the asset edit page into a layout with three tabs and add the two child routes.
- [ ] Remove the slot domain, the two slot API clients and the slot text on the asset pages.
- [ ] Add tests for the schemas, the services and the clients.

### PR 2: picker and checkout contract

- [ ] Add the packages API client.
- [ ] Add the calendar view, the start time view and the picker service.
- [ ] Change the listing detail page: picker, URL params, Book rules, unavailable state, null price.
- [ ] Change the checkout loader, the session payload and the error checks.
- [ ] Show the hold error and the expired hold message.
- [ ] Change the order summary and the booking pages.
- [ ] Add the English and Japanese copy.
- [ ] Add tests.

### PR 3: checkout layout

- [ ] Restyle the stepper, the summary, the cards and the mobile summary.
- [ ] Add the hold notice.
- [ ] Polish the return page states.
- [ ] Add tests for the key states.

### Docs

- [ ] Amend web-56 and web-62 and set this spec to `status: implemented` after the last pull request merges.

## Acceptance criteria

### PR 1

- [ ] A provider can add a schedule with days, hours and dates.
- [ ] A provider can edit a schedule, and the list shows the schedules by first day.
- [ ] A provider can close a day with a reason, and reopen it.
- [ ] A closure or an edit that hits a live hold shows the server message under the form.
- [ ] No code imports the slot domain or the slot API clients.

### PR 2

- [ ] The calendar lists only open days, and the dropdown lists only free start times.
- [ ] A day with no free time shows the message and no dropdown.
- [ ] A tourist can finish a booking with the new contract.
- [ ] The URL, the quote and the session calls carry no `availability_slot_id`.
- [ ] A failed hold shows the message and a link back to the same day.
- [ ] A listing that is not bookable shows "currently unavailable", no price and no Book button.
- [ ] The order summary and the booking pages show the package name and the service time.
- [ ] The web computes no price (`PRC-1`).

### PR 3

- [ ] The checkout matches the layout above on desktop and mobile.
- [ ] The hold notice shows the end time of the hold from the session.
- [ ] The return page keeps redirect-only success per web-12.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm test
npm run build
```

- Run the `review-react-style` skill by hand on each pull request.
- The browser check is manual, and each pull request lists what it did not check.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
