---
title: Asset availability model
sidebar_label: Asset availability
sidebar_position: 3
description: How Catalog holds a vehicle for each booking, with schedules, closures, buffers and one overlap rule.
doc_type: model-spec
normative: true
status: current
context: catalog
last_reviewed: 2026-10-31
supersedes:
  - INV-3, INV-4, CON-1 to CON-6 (slot seat counter)
  - FR-CAT-006, FR-CAT-019, FR-CAT-020, FR-CAT-021, FR-CAT-029, FR-CAT-031
---

## TL;DR \{#availability-tldr\}

- The table `catalog_asset_holds` has one row for each booking attempt, and each row holds one asset for one time range.
- One database rule stops two live holds on one asset from overlapping.
- A full-day package holds the whole service day, and a timed package holds its hours plus a buffer.
- The tables `catalog_asset_schedules` and `catalog_asset_closures` give the open days.
- Only Catalog services write holds, and Bookings keeps the hold id.

## About this document

This is the model page for asset availability, and the ruling is [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds).

| Topic | Document |
| --- | --- |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) |
| Column truth | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) |
| Booking copies | [bookings.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/bookings.dbml) |
| Packages | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| asset | A vehicle of one provider company, as a row in `catalog_provider_assets`. |
| the table `catalog_asset_holds` | One row for each booking attempt. |
| live hold | A hold with `status: "held"` or `status: "confirmed"`. |
| schedule | A row in `catalog_asset_schedules`: the weekly work pattern of one asset for a date range. |
| closure | A row in `catalog_asset_closures`: one day when the asset does not work. |
| buffer | Free minutes after a timed job, for example for cleaning or the return trip. |
| asset pool | The assets a package can use, as rows in `catalog_package_assets`. |
| availability slot | The old table `catalog_availability_slots`. Slice S5 removes it, and new code must not use it. |

About 50 files use the availability slot today: 29 in Catalog and 19 in Bookings.

## Hold rules \{#hold-rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| Every booking holds one asset for one time range. | always | Tourist A books Package A, and Car #1 is held. |
| A full-day hold blocks the whole service day of its start date in Japan time (`Asia/Tokyo`). | full-day package | A tour from 09:00 to 15:00 on 29 October blocks Car #1 all day. |
| A full-day hold runs past midnight when the job plus buffer ends after midnight. | full-day package | A job that ends at 01:00 blocks until 01:00 plus the buffer. |
| A timed hold blocks the start time to the end time plus a buffer. | timed package | A transfer from 10:00 to 12:00 with a 30-minute buffer blocks until 12:30. |
| The buffer is the larger value of the asset buffer and the package buffer. | timed package | Asset buffer 15 and package buffer 30 give 30. |
| A hold may start at the exact minute another hold ends. | always | One hold ends at 12:30 and the next starts at 12:30. |
| Checkout gives the booking any free asset from the package pool. | checkout | Car #1 is busy, so Car #2 is held. |
| If no asset in the pool is free, checkout fails with "this time is no longer available". | checkout | Both cars are held on that day. |
| Session expiry, payment failure and booking cancellation release the hold. | always | An unpaid hold ends when the checkout session expires. |
| Releasing a hold twice has the same result as releasing it once. | always | A retry does not free another booking. |
| Only Catalog services write holds. | always | Bookings calls `Catalog::Availability::HoldAssetService` and never writes the table. |
| Every booking gets the whole asset in MVP. | always | A shared seat sale is a later ruling. |

The Project note of the DBML file holds the overlap rule.

```text
# red-cab-api/docs/db/catalog.dbml:113-117
    - catalog_asset_holds: EXCLUDE USING gist (
        provider_asset_id WITH =,
        tstzrange(blocked_from, blocked_until, '[)') WITH &&)
        WHERE (status IN ('held', 'confirmed'))                                           -- CON-4, R-1 (ships in: S5)
      ('[)' bounds let a hold start exactly when another hold ends.)
```

Bookings copies the hold id, the package id, the package name and the service start and end.
- The cancellation cutoff (`OPR-11`) uses the service start.
- The 24-hour auto-complete timer (`OPR-12`) uses the service end.
- A later change to a package, a pool, a schedule or coverage never changes a confirmed booking.

## Schedules and closures \{#schedules-and-closures\}

| Rule | Applies to | Example |
| --- | --- | --- |
| An asset has one schedule at a time, with a start date, an optional end date, weekdays and opening hours. | provider save | Monday to Saturday, 07:00 to 22:00, from 1 November with no end date. |
| An open day is a date inside the range, on a listed weekday, with no closure. | availability | Sunday is not open on that schedule. |
| No table stores one row for each day. | always | The system calculates open days from the schedule and the closures. |
| A timed hold must fit inside the opening hours. | timed package | A 21:00 to 23:00 transfer does not fit a schedule that closes at 22:00. |
| A full-day hold needs only an open day. | full-day package | A tour on an open Saturday is allowed. |
| A provider cannot close a day that has a live hold. | provider save | Closing 29 October fails while Tourist A holds Car #1. |
| A provider cannot shorten a schedule so that a live hold falls outside it. | provider save | Ending the schedule on 28 October fails for the same reason. |

```text
# red-cab-api/docs/db/catalog.dbml:104-106
    - catalog_asset_schedules: EXCLUDE USING gist (
        provider_asset_id WITH =,
        daterange(starts_on, ends_on, '[]') WITH &&)                                      -- B-3 (ships in: S5)
```

## Booking flow \{#booking-flow\}

1. The tourist picks a package, a date and a start time inside the package start window.
2. `Catalog::Availability::HoldAssetService` checks that the package is active and the listing is discoverable.
3. It checks that the start time is on a step of the window and the date is an open day.
4. It checks that a timed job fits inside the opening hours.
5. It inserts a `held` row for the first free asset of the pool, inside the checkout transaction.
6. Bookings creates the checkout session with the hold id, and `held_until` equals the session expiry.
7. On payment success, materialization calls `Catalog::Availability::ConfirmHoldService`.
8. Expiry, payment failure or cancellation calls `Catalog::Availability::ReleaseHoldService`.

## Worked example \{#worked-example\}

A provider has Car #1 and Car #2, both 5-seat cars, in the pool of Package A.
- Package A is a full-day tour of 6 hours with a start window from 07:00 to 13:00.
- Both cars work Monday to Saturday.

1. Tourist A books Package A for 29 October at 09:00, and the service ends at 15:00.
2. The service holds Car #1 for all of 29 October.
3. Tourist B books Package A for 29 October at 12:00.
4. The overlap rule rejects Car #1, so the service holds Car #2.
5. Tourist C tries the same day and sees "this time is no longer available".
6. A 2-hour transfer package with a 30-minute buffer holds Car #1 from 10:00 to 12:30 on 30 October.
7. Tourist D can book Car #1 for that day from 12:30.

## Related requirements

- [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking)
- [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings)
