---
title: Booking & Checkout
sidebar_position: 4
description: Bounded context documentation for Red Cab Marketplace.
---

### 3. Booking & Checkout (core)
- **Purpose:** Turn a selected Slot into a Booking via CheckoutSession and run its lifecycle; **owns money facts** (the frozen snapshots copied from session).
- **Internal modules:** **Checkout** (`CheckoutSession` — snapshot freeze, Fulfillment Payload, seat hold, PaymentIntent) and **Order Lifecycle** (state machine, completion, cancellation, manifest, bundle, multi-day).
- **Aggregates owned:** `CheckoutSession` (pre-booking checkout unit); `Booking` (the order aggregate, incl. copied snapshots, Fulfillment Payload, state — B2C enters `CONFIRMED` on materialization, `BKG-10`); `PassengerManifest`, `BundleBooking` (the link across two `Booking`s).
- **Transactional boundary (critical):** at CheckoutSession creation, **snapshot freeze + seat reservation commit as one atomic unit** (`BKG-9`, `CON-1`). On payment success, Booking materialization copies session facts. This is the reason CheckoutSession and the seat counter must be reachable in a single transaction (CR-1).
- **Upstream deps:** Identity (buyer principal), Catalog (`calculate_quote`, availability, guarded reserve), Payments (charge result), B2B (create-from-quote command).
- **Downstream consumers:** Payments (reads snapshots), Reviews (completion event), Notifications.
- **Sync (exposes):** `create_booking_from_quote(...)` (used by B2B); slot-selection/checkout commands (used by the Tourist app).
- **Async (publishes):** `BookingCreated`, `BookingConfirmed`, `BookingCancelled`, `BookingCompleted`, `BookingRefunded`. **Consumes:** payment settlement facts from Payments where modeled async.
- **Integration contract:** the **Commission Snapshot** `{ gross_amount, commission_rate_snapshot, commission_amount, net_payout_amount }` is the published, immutable fact Payments consumes (`INV-1`, `INV-2`).
- **Rules anchored here:** `INV-1..5`, `INV-11`, `LC-1..6`, `BKG-1..11`, `CON-1`, `CON-2`, `CON-5`, `CON-6`, `OPR-11`, `OPR-12`.
