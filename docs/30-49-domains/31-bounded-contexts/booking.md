---
title: Booking & Checkout
sidebar_position: 4
description: Core context — CheckoutSession, Booking lifecycle, snapshots, and the CR-1 checkout transaction.
---

## TL;DR

- Turns a selected slot into a **Booking** through **CheckoutSession**.
- Owns **money facts**: frozen Price, Commission, and Cancellation Policy snapshots on the Booking.
- CheckoutSession creation and guarded seat reservation commit as **one atomic unit** (`BKG-9`, `CON-1`, `CR-1`).
- Publishes lifecycle events; Payments reads the Commission Snapshot read-only.

## About this document

Bounded context overview for Booking & Checkout (core).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Booking lifecycle | [Booking state machine](/docs/30-49-domains/patterns/booking-state-machine) |
| Coupling risks | [Coupling risks](/docs/30-49-domains/bounded-contexts/coupling-risks) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context runs checkout and the Booking lifecycle.

It materializes a **Booking** from a **CheckoutSession** after payment success (B2C) or from Corporate commands.

It owns immutable financial snapshots copied from the session.

## Core concepts

**Checkout module:** `CheckoutSession` — snapshot freeze, Fulfillment Payload, Terms of Use acceptance, seat hold, Payment Attempt.

**Order Lifecycle module:** state machine, completion determination, cancellation, manifest, bundle, multi-day flows.

**Aggregates:**

- `CheckoutSession` — pre-booking unit.
- `Booking` — order aggregate with copied snapshots, Fulfillment Payload, and state. B2C enters `CONFIRMED` on materialization (`BKG-10`).
- `PassengerManifest`.
- `BundleBooking` — link across two `Booking` records.

**Critical transaction:** at CheckoutSession creation, snapshot freeze and seat reservation commit together (`BKG-9`, `CON-1`).

On payment success, Booking materialization copies session facts.

CheckoutSession and the seat counter must sit in one database transaction (`CR-1`).

## Integrations

**Upstream:** Identity (buyer principal); Catalog (`calculate_quote`, availability, guarded reserve); Payments (charge result); Corporate (`create_booking_from_quote`).

**Downstream:** Payments (reads snapshots); Reviews (completion); Notifications.

**Sync (exposes):** `create_booking_from_quote(...)` for Corporate; slot-selection and checkout commands for the Tourist app.

**Async (publishes):** `BookingCreated`, `BookingConfirmed`, `BookingCancelled`, `BookingCompleted`, `BookingRefunded`.

**Async (consumes):** payment settlement facts from Payments where modeled async.

**Commission Snapshot contract:** `{ gross_amount, commission_rate_snapshot, commission_amount, net_payout_amount }`. Payments consumes this immutable fact (`INV-1`, `INV-2`).

## Related requirements

`INV-1`..`INV-5`, `INV-11`, `LC-1`..`LC-6`, `BKG-1`..`BKG-11`, `CON-1`, `CON-2`, `CON-5`, `CON-6`, `OPR-11`, `OPR-12`.
