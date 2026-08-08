---
title: Quotation & Invoicing (B2B)
sidebar_label: Quotation & Invoicing (B2B)
sidebar_position: 7
description: Functional requirements for B2B context.
---

## TL;DR

- B2B FRs: quotation requests, formal quotes/invoices, bank transfer confirmation, corporate manifests.
- Consumption tax itemized on B2B documents; B2C prices are tax-inclusive.

## About this document

Functional requirements for **B2B — Quotation & Invoicing**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| B2B context | [B2B Quotation](/docs/architecture/bounded-contexts/b2b) |
| Rules | [Business Rules](/docs/business-rules/invariants) (`PAY-9`, `PAY-10`) |

---

## B2B — Quotation & Invoicing

### FR-B2B-001 — Quotation request
The system **shall** allow a Corporate Client to submit a quotation request capturing trip, dates, passengers, locations, service type, and requirements.
- Source: E-05. Status: Approved.

### FR-B2B-002 — Quotation request visibility and overdue alert
The system **shall** present quotation requests to Admin and **shall** alert Admin when a request is unanswered beyond 3 business days.
- Source: E-05. Governs: OPR-5. Status: Approved.

### FR-B2B-003 — Quotation issuance
The system **shall** allow Admin to issue a formal quotation with line items, 10% consumption tax, payment due date, bank details, and validity, delivered to the client.
- Source: E-06. Governs: PAY-10. Status: Provisional (AMB-031 PDF rendering, AMB-033 tax).

### FR-B2B-004 — Acceptance converts to booking
On client acceptance the system **shall** generate an invoice and **shall** convert the quotation into a Booking awaiting payment.
- Source: E-06. Governs: LC-11. Status: Provisional (AMB-027 pre-payment state).

### FR-B2B-005 — Bank transfer confirmation
The system **shall** mark a corporate Booking confirmed only when Admin records receipt of the bank transfer, notifying client and Provider.
- Source: E-07. Governs: PAY-9. Status: Approved.

### FR-B2B-006 — Payment overdue alert
The system **shall** alert Admin when a corporate booking's payment deadline passes without confirmation.
- Source: E-07. Governs: OPR-5. Status: Approved.

### FR-B2B-007 — Corporate booking history organization
The system **shall** organize a Corporate Account's booking history by trip/event rather than by individual booking identifier.
- Source: A-08. Status: Approved.

---
