---
title: NOT — Notifications
sidebar_label: NOT
sidebar_position: 9
description: Functional requirements for NOT context.
---

## TL;DR

- Notifications FRs: email/SMS dispatch on domain events, language preference rendering, confirmation SLA.
- Notifications are reactions to past-tense facts — not business authority.

## About this document

Functional requirements for **NOT — Notifications** (supporting context).

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| Notifications context | [Notifications (Context)](/docs/architecture/bounded-contexts/notifications) |
| SLA rules | [Business Rules](/docs/business-rules/invariants) (`OPR-8`, `OPR-9`) |

---

## NOT — Notifications

### FR-NOT-001 — Booking confirmation notifications
The system **shall** notify the Tourist and the Provider of a new Booking within 60 seconds of its creation.
- Source: G-01, G-02. Governs: OPR-8. Status: Approved.

### FR-NOT-002 — Lifecycle notifications
The system **shall** notify the affected parties on confirmation, cancellation, and refund of a Booking.
- Source: G-01, G-02. Status: Approved.

### FR-NOT-003 — Language of notifications
The system **shall** render each notification in the recipient's stored language preference.
- Source: G-03, G-04. Governs: OPR-9. Status: Approved.

### FR-NOT-004 — SMS channel
The system **may** additionally send SMS notifications when the recipient has a verified phone and SMS is enabled.
- Source: G-01, G-02. Status: Provisional (AMB-034 SMS scope).

### FR-NOT-005 — Scheduled alerts
The system **shall** issue scheduled alerts for license expiry, support-trial expiry, overdue registrations, overdue quotations, and overdue corporate payments.
- Source: A-06, A-07, A-05, E-05, E-07. Governs: OPR-3/4/5. Status: Approved.

---
