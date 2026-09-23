---
title: Payments & Payouts (PAY)
sidebar_label: Payments & Payouts (PAY)
sidebar_position: 6
description: Functional requirements for PAY context.
---

## TL;DR

- Payments FRs: commission rate, snapshots, provider-held charges, completion determination, settlement release, refunds, admin payments overview.
- **Booking** owns money facts; **Payments** owns movement instruction and commission rate; the **payment provider** owns custody.
- Red Cab holds no customer funds and receives commission only as a provider-routed platform fee.

## About this document

Functional requirements for **PAY — Payments & Payouts**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/product/requirements/functional-requirements) |
| Payments context | [Payments (Context)](/docs/architecture/contexts/payments) |
| Financial architecture | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |
| Custody / control decision | [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation) |

---

## PAY — Payments & Payouts

### FR-PAY-001 — Buyer payment
The system **shall** initiate collection of the snapshotted gross amount for a CheckoutSession through the licensed payment provider, which **shall** be the legal recipient and holder of the funds. The system **shall not** receive or hold those funds.
- Source: E-02. Governs: FIN-3, FIN-12, INV-1, INV-13, PAY-13. Status: Provisional ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation), pending counsel; supersedes Decision Log `AMB-001`, `AMB-002`).

### FR-PAY-002 — Commission snapshot freezing
At CheckoutSession creation the system **shall** record gross, commission rate, commission amount (`FLOOR(gross × rate)`), and net payout (`gross − commission`) as an immutable commission snapshot copied to the Booking on materialization.
- Source: E-10. Governs: PAY-4, PAY-11, INV-2. Status: Approved.

### FR-PAY-003 — Commission rate applicability
The system **shall** apply commission-rate changes only to subsequent Bookings and **shall** retain the snapshotted rate on historical Bookings.
- Source: E-10. Governs: PAY-2. Status: Approved.

### FR-PAY-004 — Commission base
The system **shall** compute commission on the total including mandatory extra charges.
- Source: E-10, C-07. Governs: PAY-3. Status: Provisional (AMB-009 confirmation).

### FR-PAY-005 — Settlement release queueing
The system **shall** enqueue a payout queue entry for a completed Booking carrying its frozen net payout amount, and **shall** instruct the payment provider to settle the Provider's net to the Provider Merchant Account through lifecycle states **queued → processing → disbursed | failed**. Settlement **shall not** be released before the system records a completion determination.
- Source: E-09, E-13. Governs: LC-6, LC-13, LC-14, PAY-14, PAY-15. Status: Provisional ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation); Decision Log `AMB-003`, `AMB-005` reaffirmed on a compliance basis).

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

### FR-PAY-011 — Completion determination record
The system **shall** record, for each Booking that reaches completion, the determining actor, the basis for the determination, and the instant it was made, and **shall** present that record to Admin. The record **shall** be immutable once written.
- Source: E-09, E-13. Governs: PAY-16, LC-5, OPR-12. Status: Provisional ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation) C8).

### FR-PAY-012 — Terms of Use acceptance
The system **shall** record the accepted Terms of Use version and its acceptance instant on the CheckoutSession, and **shall not** allow payment to proceed without it.
- Source: E-02. Governs: PAY-17, BKG-1. Status: Provisional ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation) C8).

### FR-PAY-013 — Platform fee equals snapshotted commission
The system **shall** instruct the payment provider to route a platform fee equal to the snapshotted commission amount, and **shall** surface any divergence between instructed and confirmed fee as a reconcilable discrepancy.
- Source: E-10, E-13. Governs: FIN-12, INV-2, PAY-13. Status: Provisional ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation) C4).

### FR-PAY-014 — Corporate transfer collection
The system **shall** collect Corporate bank transfer payments through a payment-provider virtual account and **shall** confirm a Corporate Booking on provider-confirmed receipt rather than on manual Admin entry.
- Source: E-07, E-03. Governs: PAY-9, INV-13, FIN-11. Status: Provisional ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation) C1; resolves `AMB-029`, `AMB-030`).

### FR-PAY-015 — Settlement driven by verified provider events
The system **shall** treat only verified payment-provider events and internal determinations as authoritative for money-moving state changes, and **shall not** advance any such state on the basis of a client-supplied signal including a return redirect.
- Source: E-02, E-11. Governs: FIN-11, FIN-13, FIN-10. Status: Approved.

---
