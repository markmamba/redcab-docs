---
title: Financial Ownership
sidebar_position: 5
description: Conceptual data model for Red Cab Marketplace.
---

## 9. Financial Ownership Boundaries

Financial data is split along the **money-facts vs money-movement** seam ([./payments-architecture.md](/docs/architecture/payments-architecture); [./overview.md](/docs/architecture/overview) Money Facts vs Money Movement).

- **Booking owns money *facts*.** The immutable Price/Commission/Cancellation snapshots — "what was owed, to whom, at what split" — are Booking-owned and never mutated by anyone, including Payments (`INV-1`, `FIN-2`).
- **Payments owns money *movement* and *configuration*.** The Commission Rate setting, charges, captures, payouts, refunds, and reconciliation are Payments-owned. Payments **reads** the Booking's Commission Snapshot and **never authors or mutates it** (`FIN-3`, `FIN-5`).

Ownership boundary rules the model holds:

- **The Commission Rate is owned by Payments, not by any Booking.** A rate change affects only future Bookings; historical Bookings keep their snapshot (`PAY-2`). A Booking's rate fact lives only in its Commission Snapshot.
- **Every money movement traces to exactly one Booking and its snapshot** (`FIN-3`). There is no money movement without a Booking it belongs to.
- **Payout and refund are mutually exclusive for a Booking's funds** (`FIN-5`, `PAY-8`): the platform never both pays the Provider and refunds the buyer for the same captured amount. A refund voids/reverses any payout-queue entry for that Booking.
- **Amount bounds.** No payout exceeds `net_payout_amount`; no refund exceeds `gross_amount` (`FIN-4`). All amounts are whole JPY (`FIN-8`, `PAY-1`).
- **External-rail truth is authoritative.** Settlement outcomes arrive asynchronously; internal Payments facts converge to them, and divergence surfaces as a reconcilable fact rather than silent loss (`FIN-11`). B2B funds arrive off-Stripe and are reconciled manually (`PAY-9`).
- **B2B settlement** of the Provider's net for off-Stripe funds is owned as a Payments fact but its disbursement mechanism is unresolved (`AMB-029`).

```mermaid
graph LR
  subgraph BKG["Booking & Checkout — money FACTS (immutable)"]
    CS["Commission Snapshot\n{gross, rate, commission, net}"]
  end
  subgraph PAY["Payments & Payouts — money MOVEMENT (configuration + facts)"]
    Rate["CommissionRateSetting"]
    Pmt["Payment / Charge"]
    Pay["PayoutQueueEntry"]
    Ref["Refund"]
    Rec["ReconciliationRecord"]
  end
  Rate -->|read at checkout| CS
  CS -->|read-only| Pmt
  CS -->|read-only| Pay
  CS -->|read-only| Ref
  Pay -. mutually exclusive .- Ref
```

---
