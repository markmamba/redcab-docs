---
title: Provider listings
sidebar_label: Provider listings
sidebar_position: 4
description: What a provider does and sees when they create, set up, publish and edit Catalog listings.
doc_type: requirement
normative: true
status: current
context: catalog
last_reviewed: 2026-10-31
supersedes:
  - FR-CAT-033 (partial)
---

## TL;DR \{#provider-tldr\}

- A provider saves a draft and publishes on purpose.
- A listing has one primary destination, extra destinations, pickup coverage and one to five packages.
- A provider sets a schedule for each asset and can close single days.
- A listing that is not complete stays hidden from tourists.
- A provider can edit a published listing in place.

## About this document

This page describes what the provider does and sees, without screens, APIs or algorithms.

| Topic | Document |
| --- | --- |
| Rulings | [Listing publication](/docs/30-49-domains/catalog/catalog-decisions/#listing-publication), [Discoverability completeness](/docs/30-49-domains/catalog/catalog-decisions/#discoverability-completeness) |
| Data | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) |
| Availability | [Asset availability model](/docs/30-49-domains/catalog/models/asset-availability) |
| Publish gates | [Invariants](/docs/70-79-business/business-rules/invariants) (`INV-10`, `INV-12`, `LC-12`) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| draft | A saved listing that tourists cannot see. |
| publish | The act that makes a complete listing eligible for tourists. |
| complete | A listing has a primary destination, a photo, pickup coverage and an available package. |
| asset pool | The vehicles a package can use. |
| live hold | A held or confirmed booking on an asset. |

## User stories \{#user-stories\}

1. US-1: As a provider, I want to save a draft, so I can finish the listing later.
2. US-2: As a provider, I want one primary destination and extra ones, so tourists find me in each place.
3. US-3: As a provider, I want to set pickup coverage, so tourists book only where I drive.
4. US-4: As a provider, I want several packages, so I can sell different vehicles and lengths.
5. US-5: As a provider, I want working days for each asset, so nobody books a day I cannot work.
6. US-6: As a provider, I want to publish and edit on purpose, so I control what tourists see.

## Rules \{#rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| A valid save creates a draft. A save never publishes. | US-1 | A new listing saves as `draft` and stays hidden. |
| A save with a missing or invalid required field shows messages and lets the provider retry. | US-1 | A missing title shows a message. |
| The slug is created with the listing and is fixed after the first publish. | US-1 | The slug does not change when the title changes later. |
| A listing has exactly one primary destination, a prefecture. | US-2 | The tour has Tokyo as its primary destination. |
| Extra destinations are other prefectures. One listing serves all of them. | US-2 | The same tour adds Kanagawa and needs no second listing. |
| Pickup coverage is a prefecture, a municipality or a ward. | US-3 | The provider picks Tokyo and Nishi-ku. |
| A coverage node inside another selected coverage node is rejected. | US-3 | Tokyo and Shinjuku together show a message. |
| A new listing pre-fills coverage from the prefectures in the provider company details. The provider can change it. | US-3 | A company with Tokyo pre-fills Tokyo. |
| A coverage change applies to bookings that are not yet confirmed. | US-3 | A confirmed booking is not affected. |
| A package has a name, a vehicle category, a passenger limit, a duration, a start window, a step and a price. | US-4 | A 5-seat car for 4 passengers, 6 hours, from 07:00 to 13:00 every 30 minutes. |
| A package may have a buffer when it is timed. | US-4 | A transfer package has a buffer of 30 minutes. |
| The passenger limit cannot exceed the capacity of any asset in the pool. | US-4 | A 5-seat car cannot serve a package for 10 passengers. |
| Every vehicle in the pool has the vehicle category of the package. | US-4 | A van cannot join a sedan package. |
| A package is available when it is active, its pool has an active asset and a valid permit unlocks its vehicle kind. | US-4 | A package with only a retired vehicle is not available. |
| An expired permit makes the packages with that vehicle kind unavailable. Listings that use another permit stay live. | US-4 | A company with a passenger car permit and an expired chartered permit loses its Microbus package, and its Sedan listing stays live. |
| A renewed permit, recorded by the team, makes those packages available again. | US-4 | The team records the chartered renewal, and the Microbus package returns. |
| A listing has exactly one service type: `tour`, `airport_transfer`, `private_charter` or `port_transfer`. | US-1 | A Tokyo day trip has `tour`. |
| A listing has at most 5 packages that are not archived. | US-4 | The sixth package shows a message. |
| Each asset has one schedule at a time, with a date range, weekdays and opening hours. | US-5 | Monday to Saturday, 07:00 to 22:00. |
| The provider can close a single day of an asset. | US-5 | The provider closes 31 October for an inspection. |
| The provider cannot close a day, or shorten a schedule, while a live hold is on it. | US-5 | Closing 29 October fails when a booking holds the asset. |
| The provider sets a buffer for each asset and for each timed package. | US-5 | The asset buffer is 15 minutes and the package buffer is 30 minutes. |
| Publishing needs a photo, an approved provider, a valid license, a verified payout and a verified provider. | US-6 | Publishing without a photo shows what to add. |
| A draft or an unpublished listing never appears to tourists. | US-6 | A paused listing is hidden. |
| A published listing that is not complete is hidden until it is complete again. | US-6 | The provider removes all coverage rows, so the listing is hidden. |
| A listing that becomes complete again and is still published appears again without a new publish. | US-6 | The provider adds coverage again, and the listing returns. |
| The provider edits a published listing in place, and completeness is checked on save. | US-6 | Removing the last photo hides the listing at once. |
| A missing optional attribute does not hide a listing. It fails only the matching filter. | US-6 | A listing with no languages still shows with no language filter on. |

## Worked example \{#worked-example\}

A provider creates a Tokyo tour.

1. The provider saves a draft with Tokyo as primary destination, and the listing is hidden.
2. The provider adds Kanagawa as an extra destination and Tokyo as pickup coverage.
3. The provider adds Package A, a 5-seat car for 4 passengers, and puts Car #1 in its pool.
4. The provider sets Car #1 to work Monday to Saturday and uploads a photo.
5. The provider publishes the complete listing, so tourists can find it.
6. The provider removes the coverage row, and the listing is hidden at once, though it is still `published`.

## Related requirements

- [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search)
- [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking)
