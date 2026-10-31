---
title: Tourist booking
sidebar_label: Tourist booking
sidebar_position: 3
description: What a tourist does and sees when they pick a time, give a booking location and pay for a Catalog listing.
doc_type: requirement
normative: true
status: current
context: catalog
last_reviewed: 2026-10-31
supersedes:
  - FR-CAT-006 (partial)
  - FR-CAT-021 (partial)
---

## TL;DR \{#booking-tldr\}

- A tourist picks a package, a date and a start time inside the package start window.
- The tourist gives one booking location, which is pickup and default drop-off.
- RedCab checks the location against pickup coverage before it confirms the booking.
- Successful payment confirms the booking, and the provider does not accept it.
- A confirmed booking stays valid when the provider changes coverage later.

## About this document

This page describes what the tourist does and sees at booking, without screens, APIs or algorithms.

| Topic | Document |
| --- | --- |
| Rulings | [Pickup coverage validation timing](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-validation-timing), [Booking confirmation](/docs/30-49-domains/catalog/catalog-decisions/#booking-confirmation) |
| Availability | [Asset availability model](/docs/30-49-domains/catalog/models/asset-availability) |
| Fulfillment rule | [Invariants](/docs/70-79-business/business-rules/invariants) (`BKG-11`) |
| Words | [Glossary](/docs/70-79-business/business-rules/glossary) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| booking location | The one point the tourist gives. It is the pickup and the default drop-off. |
| pickup coverage | The places where the provider picks up tourists. |
| start window | The first and last start time a package allows. |
| asset | The vehicle that the booking uses. |

## User stories \{#user-stories\}

1. US-1: As a tourist, I want to pick a date and start time, so the service fits my plan.
2. US-2: As a tourist, I want to give one booking location, so the driver knows where to meet me.
3. US-3: As a tourist, I want a coverage check before I pay, so I know the trip can start.
4. US-4: As a tourist, I want confirmation when I pay, so I do not wait for the provider.
5. US-5: As a tourist, I want a clear message for an unavailable listing, so I know why I cannot book.

## Rules \{#rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| The tourist picks a package, a date and a start time inside the package start window, on a fixed step. | US-1 | With a step of 30 minutes, 09:00 is allowed and 09:10 is not. |
| The system does not offer a date when every asset of the pool is closed or held. | US-1 | If both cars are held on 29 October, that date is not offered. |
| The system gives the booking any free asset of the pool. The tourist does not choose it. | US-1 | Car #1 is busy, so the booking gets Car #2. |
| A timed package offers only start times with a free asset for the duration plus the buffer. | US-1 | A 2-hour transfer with a 30-minute buffer needs 2 hours 30 minutes free. |
| The booking location is one point. It is the pickup and the default drop-off. | US-2 | The tourist gives one hotel, and RedCab records it for both. |
| The tourist searches for the booking location and picks a municipality or a ward. | US-2 | The tourist types "Shinjuku" and picks the ward. |
| A missing or invalid location asks the tourist to correct it. | US-2 | An empty location shows a message and blocks the next step. |
| Another drop-off is agreed with the provider outside RedCab and is not recorded. | US-2 | The tourist asks the driver to drop off at the airport. RedCab keeps the first location. |
| RedCab checks the location against the latest saved coverage when checkout is created or changed, and again when the booking is made. | US-3 | The provider adds coverage before the tourist pays, so the new coverage applies. |
| A location outside coverage blocks confirmation, and the message says the location is not covered. | US-3 | Coverage is Nishi-ku only, and the tourist gives Naka-ku. |
| A listing with no coverage, or a check that cannot finish, blocks confirmation. | US-3 | The coverage service is down, so no booking is confirmed. |
| A destination alone never counts as coverage. | US-3 | A Tokyo tour with Kanagawa as extra destination fails a Yokohama pickup without coverage. |
| A listing that appears in results can still fail a check at booking time. | US-3 | A discoverable listing still blocks a location outside its coverage. |
| RedCab checks coverage and the hold again just before payment starts. | US-3 | The provider removes Nishi-ku while the tourist fills in checkout, so the check fails before payment. |
| If a check fails after payment succeeds, RedCab reverses the charge and makes no booking. | US-4 | The provider removes the coverage seconds after payment, so the charge is reversed and no booking exists. |
| RedCab confirms a booking only after reliable proof of successful payment and after all checks pass. | US-4 | Payment succeeds and coverage passes, so the booking is `confirmed`. |
| The provider does not accept the booking. | US-4 | No acceptance step exists for a tourist booking. |
| An abandoned or expired checkout, or a failed payment, makes no booking and releases the hold. | US-4 | The session expires, and the asset is free again. |
| A confirmed booking stays valid when the provider changes coverage, packages, the pool or the schedule. | US-4 | The provider removes Nishi-ku later, and the booking stays. |
| A direct link to a listing with no active package shows "currently unavailable" and blocks checkout. | US-5 | A shared link opens the page, and the book button is off. |

## Worked example \{#worked-example\}

A tourist books Package A of a Tokyo tour from a provider who covers the prefecture Tokyo.

1. The tourist picks 30 October and a start time of 09:00.
2. The system finds a free asset in the pool and holds it for the checkout session.
3. The tourist searches "Shinjuku" and picks the ward.
4. RedCab checks the ward, and the check passes because Shinjuku is inside Tokyo.
5. The tourist pays, and RedCab receives proof of success and confirms the booking.
6. The provider later removes Tokyo from the coverage, and the confirmed booking stays valid.

## Related requirements

- [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search)
- [Provider listings](/docs/30-49-domains/catalog/requirements/provider-listings)
