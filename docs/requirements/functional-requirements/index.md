---
title: Functional Requirements
sidebar_position: 2
description: Functional requirements grouped by bounded context.
---

## TL;DR

- **Functional requirements (FR)** grouped by bounded context: `IAM`, `PRV`, `CAT`, `BKG`, `PAY`, `B2B`, `REV`, `NOT`.
- Each FR is a single externally observable behavior using normative **shall** / **shall not** / **may** language.
- Governing rules cited as `INV-/LC-/PRC-/PAY-/CON-/BKG-/OPR-/FIN-`; `Provisional` items cite `AMB-###`.

## About this document

Index and reading guide for functional requirements by context.

| Topic | Document |
| --- | --- |
| Conventions | [Requirements Overview](/docs/requirements) |
| NFRs | [Non-Functional Requirements](/docs/requirements/non-functional-requirements) |
| Traceability | [Traceability Matrix](/docs/requirements/traceability-matrix) |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## Reading guide

- **ID** `FR-<CTX>-<NNN>`; **Source** = PRD story / notes origin; **Governs** = authoritative rules/models it conforms to; **Status** = `Approved | Provisional | Draft`.
- "shall" = mandatory observable behavior; "may" = optional. No implementation detail.
- Acceptance criteria are stated as observable conditions where they sharpen the behavior.

---

## Context index

- [Identity & Access (IAM)](/docs/requirements/functional-requirements/iam)
- [Provider Onboarding (PRV)](/docs/requirements/functional-requirements/prv)
- [Catalog & Inventory (CAT)](/docs/requirements/functional-requirements/cat)
- [Booking & Checkout (BKG)](/docs/requirements/functional-requirements/bkg)
- [Payments & Payouts (PAY)](/docs/requirements/functional-requirements/pay)
- [Quotation & Invoicing (B2B)](/docs/requirements/functional-requirements/b2b)
- [Reviews & Ratings (REV)](/docs/requirements/functional-requirements/rev)
- [Notifications (NOT)](/docs/requirements/functional-requirements/not)
- [Provisional index](/docs/requirements/functional-requirements/provisional-index)
