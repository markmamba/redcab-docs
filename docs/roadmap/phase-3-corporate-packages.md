---
title: Phase 3 — Corporate + Packages
sidebar_label: Phase 3
sidebar_position: 5
description: Corporate quotations, invoices, bank transfer, and manifests.
---

## TL;DR

- **Corporate + packages:** quotation → formal PDF → bank transfer → Admin reconciliation.
- Expands `corporate.dbml` for quotations/invoices; manifests and corporate booking paths.
- Corporate portal gates on `corporate_profiles` profile, not role alone.

## About this document

Phase 3 scope, DBML expansion, deliverables, open `AMB-###` items, and exit criteria.

| Topic | Document |
| --- | --- |
| Roadmap overview | [Phasing Roadmap](/docs/roadmap) |
| Prior phase | [Phase 2](/docs/roadmap/phase-2-marketplace-depth) |
| Corporate context | [Corporate Quotation](/docs/architecture/bounded-contexts/corporate) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

| [← Phase 2](/docs/roadmap/phase-2-marketplace-depth) | [v2 →](/docs/roadmap/v2-post-baseline) |

---

## Phase 3 — Corporate + packages

### Goal

Corporate and group bookings end-to-end: quotation request, formal Japanese documents, bank-transfer payment, and Admin reconciliation.

### How to proceed (DBML-first)

Corporate Client **profile** (`corporate_profiles`) already exists from Phase 0. Phase 3 adds quotation/invoice storage and corporate booking/payment paths.

```text
1. Expand corporate.dbml        → quotation_requests, quotations, line_items, invoices
2. Extend bookings.dbml   → passenger_manifests + passengers; multi-day package shape if in-scope
3. Extend payments.dbml   → reconciliation_records (+ any off-Stripe settlement fields)
4. Then code:             Corporate → BKG corporate → PAY reconciliation → Corporate portal → NOT alerts
```

| Step | DBML | Then implement |
| --- | --- | --- |
| 3a | Expand `corporate.dbml` | Quotation request → quotation → line items → invoice; FK to `corporate_profiles` |
| 3b | Extend `bookings.dbml` | Manifests; package/itinerary tables if shipping multi-day |
| 3c | Extend `payments.dbml` | Bank-transfer reconciliation records |

**Auth:** Corporate portal gates on `corporate_profiles` for the current account (profile presence), not merely `role=corporate`.

### Deliverables

#### Schema design gate

**red-cab-api**

- [ ] `corporate.dbml` expanded beyond corporate client (quotation request / quotation / line items / invoice)
- [ ] Booking + Payments DBML extended for manifests and reconciliation
- [ ] `redcab.dbml` updated; migrations applied

#### Corporate Quotation & Invoicing (`COR`)

**red-cab-api**

- [ ] Quotation Request submission (Corporate Client → `corporate_profiles`)
- [ ] Admin quotation lifecycle: issue, send, accept, reject
- [ ] Formal PDF documents: Omitsumorisho (quotation) and Seikyusho (invoice) with embedded JA fonts (`PAY-10`, `NFR-COMP-003`)
- [ ] Conversion of accepted Quotation → Booking via ACL (`create_booking_from_quote`)
- [ ] Bank-transfer payment instruction (`PAY-9`)

**red-cab-web**

- [ ] Corporate Client Portal — quotation request, document view, acceptance
- [ ] Admin quotation lifecycle UI (`/team`)

#### Booking & Checkout (`BKG`) — corporate

**red-cab-api**

- [ ] Passenger manifest submission on confirmed group bookings (`BKG-6`)
- [ ] Multi-day single-provider packages with PDF itinerary

**red-cab-web**

- [ ] Manifest upload UI (Corporate Client Portal)
- [ ] Package/itinerary display

#### Payments & Payouts (`PAY`) — Corporate settlement

**red-cab-api**

- [ ] Manual bank-transfer reconciliation by Admin (`AMB-030`)
- [ ] Admin Payments Overview (`FIN-3`, `NFR-AUD-006`)
- [ ] Off-Stripe provider settlement for corporate path (`AMB-029`)

**red-cab-web**

- [ ] Admin Payments Overview UI (`/team`)
- [ ] Bank-transfer payment instruction display (Corporate Client Portal)

#### Corporate Client Portal

**red-cab-web**

- [ ] Quotation request, document view, acceptance, manifest upload
- [ ] Default language JA (`OPR-9`)
- [ ] Portal auth requires corporate client profile

**red-cab-api**

- [ ] Endpoints backing Corporate Client Portal flows

#### Notifications (`NOT`)

**red-cab-api**

- [ ] Quotation sent/accepted/rejected emails
- [ ] Overdue quotation and payment alert crons (`OPR-3..5`)

**red-cab-web**

- [ ] (No dedicated UI — email delivery only)

### Open decisions for Phase 3


| AMB     | Topic                 | Working assumption                                             |
| ------- | --------------------- | -------------------------------------------------------------- |
| AMB-027 | corporate pre-payment state | Resolve before Corporate ships; ACL boundary contains any resolution |
| AMB-028 | Corporate seat-hold timing  | Resolve before quotation → booking conversion ships            |
| AMB-031 | PDF library           | Server-side generation with embedded JA fonts                  |
| AMB-033 | Consumption tax       | 10% itemized on formal documents (`PAY-10`)                    |


### Exit criteria

**Both repos**

- [ ] Expanded `corporate.dbml` (+ booking/payments extensions) exist and match applied migrations
- [ ] A Corporate Client can submit a Quotation Request and receive a formal PDF quotation
- [ ] An Admin can issue an invoice; Corporate Client pays by bank transfer
- [ ] Admin records bank-transfer receipt; booking activates per resolved `AMB-027` contract
- [ ] Accepted quotation converts to a Booking without corporate vocabulary leaking into Booking domain
- [ ] Passenger manifest can be submitted for a confirmed group booking
- [ ] Admin Payments Overview shows auditable money facts traceable to each Booking (`FIN-3`)

---
