---
title: Payments & Payouts (PAY)
sidebar_label: Payments & Payouts (PAY)
sidebar_position: 6
description: Functional requirements for PAY context.
---

## TL;DR

- Payments FRs: commission rate, snapshots, Stripe Connect charges, payout queue, refunds, admin payments overview.
- **Booking** owns money facts; **Payments** owns money movement and commission rate.

## About this document

Functional requirements for **PAY — Payments & Payouts**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| Payments context | [Payments (Context)](/docs/architecture/bounded-contexts/payments) |
| Financial architecture | [Payments Architecture](/docs/architecture/payments-architecture) |

---

## PAY — Payments & Payouts

### FR-PAY-001 — Buyer payment
The system **shall** capture the snapshotted gross amount for a CheckoutSession on the Platform Stripe account through the payment provider at checkout.
- Source: E-02. Governs: FIN-3, INV-1, PAY-13. Status: Approved (Decision Log `AMB-001`).

### FR-PAY-002 — Commission snapshot freezing
At CheckoutSession creation the system **shall** record gross, commission rate, commission amount (`FLOOR(gross × rate)`), and net payout (`gross − commission`) as an immutable commission snapshot copied to the Booking on materialization.
- Source: E-10. Governs: PAY-4, PAY-11, INV-2. Status: Approved.

### FR-PAY-003 — Commission rate applicability
The system **shall** apply commission-rate changes only to subsequent Bookings and **shall** retain the snapshotted rate on historical Bookings.
- Source: E-10. Governs: PAY-2. Status: Approved.

### FR-PAY-004 — Commission base
The system **shall** compute commission on the total including mandatory extra charges.
- Source: E-10, C-07. Governs: PAY-3. Status: Provisional (AMB-009 confirmation).

### FR-PAY-005 — Payout queueing
The system **shall** enqueue a payout queue entry for a completed Booking carrying its frozen net payout amount, and **shall** process disbursement via Stripe Transfer to the Provider's Connected Account through lifecycle states **queued → processing → disbursed | failed**.
- Source: E-09, E-13. Governs: LC-6, LC-13, LC-14, PAY-14. Status: Approved (Decision Log `AMB-003`, `AMB-005`).

### FR-PAY-006 — Refund computation
The system **shall** compute refunds from the snapshotted cancellation policy and snapshot values, never a live rate.
- Source: E-12. Governs: PAY-6, FIN-6. Status: Approved.

### FR-PAY-007 — Payout/refund mutual exclusion
The system **shall not** both disburse a payout and refund the buyer for the same Booking funds; a refund before disbursement **shall** void the queue entry.
- Source: E-12. Governs: PAY-8, FIN-5. Status: Approved (Decision Log `AMB-004`).

### FR-PAY-008 — Idempotent money operations
The system **shall** ensure duplicate payment or settlement signals do not produce duplicate charges, refunds, or payouts.
- Source: E-02, E-11. Governs: FIN-10. Status: Approved.

### FR-PAY-009 — Admin payments overview
The system **shall** present Admin all transactions with gross, commission, net, booking status, and payout status, filterable by status, each showing the frozen commission split.
- Source: E-13. Governs: FIN-3. Status: Approved.

### FR-PAY-010 — Commission rate control
The system **shall** allow Admin to set the platform-wide commission rate.
- Source: Admin Panel, E-10. Governs: PAY-2. Status: Approved.

---
