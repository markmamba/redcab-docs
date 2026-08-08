---
title: BKG — Booking & Checkout
sidebar_label: BKG
sidebar_position: 5
description: Functional requirements for BKG context.
---

## TL;DR

- Booking FRs: checkout, CheckoutSession, seat reservation, fulfillment payload, bundles, multi-day packages, manifests, cancellation.
- B2C card checkout materializes Booking in **CONFIRMED** immediately after payment.

## About this document

Functional requirements for **BKG — Booking & Checkout**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| Booking context | [Booking & Checkout](/docs/architecture/bounded-contexts/booking) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |

---

## BKG — Booking & Checkout

### FR-BKG-001 — Slot selection
The system **shall** allow a Tourist to select an available slot showing its time, price, and remaining capacity, and **shall** reject selection of a slot that has become full.
- Source: E-01. Governs: CON-2, CON-3. Status: Approved.

### FR-BKG-002 — Checkout summary with snapshot
The system **shall** present a checkout summary including service, date/time, seats, price breakdown, extra charges, total, and cancellation policy, and the presented price **shall** be the snapshotted price frozen at CheckoutSession creation that will not change.
- Source: E-02. Governs: INV-1, PRC-8, BKG-9. Status: Approved.

### FR-BKG-016 — CheckoutSession creation
When a Tourist initiates checkout, the system **shall** create a CheckoutSession that freezes Price, Commission, and Cancellation Policy snapshots, captures the Fulfillment Payload, reserves seats atomically, and associates a payment intent keyed to the session identifier.
- Source: E-02, architecture. Governs: BKG-9, CON-1, PRC-8. Status: Approved.

### FR-BKG-017 — Fulfillment payload capture
The system **shall** require pickup address, dropoff address, passenger name, passenger phone, and luggage count at checkout; flight number and special notes **may** be omitted.
- Source: E-02, architecture. Governs: BKG-11. Status: Approved.

### FR-BKG-003 — Cancellation policy agreement gate
The system **shall** require explicit agreement to the cancellation policy before payment and **shall not** allow payment without it.
- Source: E-02. Governs: BKG-1. Status: Approved.

### FR-BKG-004 — Atomic booking materialization
On successful payment the system **shall** materialize a Booking from the CheckoutSession snapshot, copy fulfillment and commercial snapshots, transition the Booking to **confirmed**, and preserve the seat hold as one atomic outcome; if any part cannot complete, none **shall** take effect.
- Source: E-02, E-10, E-11. Governs: BKG-2, BKG-10, CON-1, INV-1. Status: Approved.

### FR-BKG-005 — Failed payment yields no booking
On payment failure the system **shall not** materialize a Booking; the CheckoutSession **shall** remain unconverted or expire, and seats **shall** be restored when the session expires or is abandoned.
- Source: E-02. Governs: PAY-5, FIN-9, CON-5. Status: Approved.

### FR-BKG-006 — Last-seat contention
When multiple Tourists attempt the last seats concurrently, the system **shall** allow only enough to reach zero remaining and **shall** reject the others as fully booked.
- Source: E-02, E-11. Governs: CON-2. Status: Approved.

### FR-BKG-007 — Booking lifecycle conformance
The system **shall** transition a Booking only along the permitted lifecycle transitions and **shall not** permit transitions out of terminal states or backward transitions.
- Source: E-09. Governs: LC-1..6. Status: Approved.

### FR-BKG-008 — B2C confirmation on payment
For B2C card checkout, the system **shall** materialize the Booking directly into **confirmed** upon successful payment and **shall** notify the Tourist and Provider. B2B or pre-payment paths **may** enter **pending** until confirmation.
- Source: E-09. Governs: BKG-10, LC-2. Status: Approved (Decision Log `AMB-011`).

### FR-BKG-009 — Completion
The system **shall** transition a confirmed Booking to completed when the Provider marks the service delivered **or** when 24 hours have elapsed after the service end time without provider confirmation (operational timezone Asia/Tokyo).
- Source: E-09. Governs: LC-5, OPR-11, OPR-12. Status: Approved.

### FR-BKG-018 — Provider mark delivered
The system **shall** allow an assigned Provider to mark a confirmed Booking as delivered, transitioning it to completed when service end time has passed or at mark time if service end has passed.
- Source: E-09. Governs: OPR-11, LC-5. Status: Approved.

### FR-BKG-010 — Tourist cancellation
The system **shall** allow a Tourist to cancel an eligible Booking, **shall** restore the reserved seats idempotently, and **shall** determine any refund from the snapshotted cancellation policy.
- Source: E-09, E-12. Governs: CON-5, PAY-6. Status: Provisional (AMB-014 initiator; Phase 2 scope).

### FR-BKG-011 — Provider/Admin cancellation full refund
When a Booking is cancelled by Provider or Admin, the system **shall** restore seats and **shall** grant the Tourist a full refund regardless of policy.
- Source: E-12. Governs: PAY-7, CON-5. Status: Approved.

### FR-BKG-012 — Bundle booking
The system **shall** allow booking a car and guide together as a bundle, creating two linked Booking records with independent commission, each Provider notified independently.
- Source: E-03. Governs: BKG-3. Status: Provisional (AMB-017 cross-leg cancellation).

### FR-BKG-013 — Multi-day package
The system **shall** verify availability of every constituent slot across all days before allowing checkout of a single-provider multi-day package, and **shall** identify any unavailable day.
- Source: E-04. Governs: BKG-4, BKG-5. Status: Approved.

### FR-BKG-014 — Passenger manifest
The system **shall** allow a Corporate/Group Client to submit a passenger manifest for a confirmed group Booking and **shall** make it viewable to the assigned Provider.
- Source: E-08. Governs: BKG-6. Status: Approved.

### FR-BKG-015 — Snapshot immutability across edits
The system **shall** preserve a Booking's snapshotted commercial terms unchanged regardless of later Listing or policy edits.
- Source: C-11, E-10. Governs: INV-1, BKG-8. Status: Approved.

---
