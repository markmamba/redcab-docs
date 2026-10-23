---
title: Asset holds replace availability slots
sidebar_label: Asset holds
sidebar_position: 2
description: Why Catalog guards each vehicle with one hold for each booking, instead of fixed availability slots.
normative: true
status: accepted
context: catalog
last_reviewed: 2026-10-23
supersedes:
  - INV-3, INV-4, CON-1 to CON-6 (slot seat counter)
---

## TL;DR \{#holds-adr-tldr\}

- Each booking holds one asset for one time range, and one database rule stops overlap.
- A package sets the duration and the start window, so a fixed slot is no longer needed.
- Schedules and closures give the open days, and nothing stores one row for each day.
- Shared seats are a later decision.

## About this document

Domain decision record for Catalog availability.

| Topic | Document |
| --- | --- |
| Ruling | [Asset holds](/docs/30-49-domains/catalog/catalog-decisions/#asset-holds) |
| Model | [Asset availability model](/docs/30-49-domains/catalog/models/asset-availability) |
| Replaced rules | [Invariants](/docs/70-79-business/business-rules/invariants) (`INV-3`, `INV-4`, `CON-1` to `CON-6`) |

---

## Context

A package has its own duration and start window, but an availability slot has a fixed start and end.

The slot overlap rule `CON-4` guards a vehicle only for the windows that the provider made first.

The owner example shows the problem.
- Tourist A books Package A on Monday from 09:00 to 15:00.
- Tourist B cannot book the same vehicle from 12:00 to 18:00.
- Tourist B can book from 15:00 or later, if the buffer allows it.

Short services, such as airport transfers, must block only their own hours on a vehicle that also does full-day jobs.

## Decision

Replace the slot with a hold for each booking.

- A hold stores one asset, one package and one time range in `catalog_asset_holds`.
- One database rule stops two live holds on one asset from overlapping.
- A full-day package holds the whole service day, and a timed package holds its hours plus a buffer.
- The buffer is the larger value of the asset buffer and the package buffer.
- A weekly schedule with a date range, and closed days, give the open days.
- Checkout gives the booking any free asset from the package pool.
- Only Catalog services write holds, and Bookings keeps the hold id.

## Consequences

- About 50 files change: 29 in Catalog and 19 in Bookings, plus the provider slot screens in the web app.
- `INV-3`, `INV-4` and `CON-1` to `CON-6` change in the same pull request as this record.
- Bookings gets the hold id, the package id and name, and the service start and end.
- The date filter reads schedules, closures and holds.
- Free start times are worked out at search time.
- The system is not in production, so no data moves.
- Shared seats need a new ruling and a seat limit on a start time.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Keep fixed slots | The provider must guess every start time. The slot count grows with assets, packages, start times and days. |
| Open hours with any start time | Tourists see too many choices, and providers lose control of when drivers work. |
| A daily limit for each package | The same vehicle can be sold twice through two packages, and short services lose the time check. |
