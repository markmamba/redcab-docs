---
title: Provider Onboarding (PRV)
sidebar_label: Provider Onboarding (PRV)
sidebar_position: 3
description: Functional requirements for PRV context.
---

## TL;DR

- Provider onboarding FRs: registration by type, pending/approved flow, documents, verification, license expiry, support trial.
- Non-approved providers are invisible to tourists; listing creation requires Approved status.

## About this document

Functional requirements for **PRV — Provider Onboarding & Verification**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| Onboarding context | [Onboarding](/docs/architecture/bounded-contexts/onboarding) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## PRV — Provider Onboarding & Verification

### FR-PRV-001 — Provider registration by type
The system **shall** require a registering Provider to select a Provider Type (Private Car/Luxury Transfer, Charter Bus Operator, Tour Guide, Tour Guide + Driver) and **shall** collect the fields applicable to that type.
- Source: A-03. Governs: INV-9. Status: Approved.

### FR-PRV-002 — Provider type immutability
The system **shall not** allow a Provider's type to change after registration except through Admin action.
- Source: A-03. Governs: INV-9. Status: Approved.

### FR-PRV-003 — Pending state on registration
The system **shall** create a newly registered Provider in Pending status with no ability to create Listings or receive bookings, and **shall** keep Pending Providers invisible to Tourists.
- Source: A-03, 1.4. Governs: INV-6, LC-7. Status: Approved.

### FR-PRV-004 — Document upload by type
The system **shall** present the required document set based on Provider Type and **shall** allow a Pending Provider to upload them, rejecting files above the published size limit.
- Source: A-04. Status: Approved.

### FR-PRV-005 — Submit for review
The system **shall** allow a Pending Provider to submit for review once required documents are uploaded, and **shall** notify Admin of the submission.
- Source: A-04. Governs: NOT. Status: Approved.

### FR-PRV-006 — Verification checklist and approval
The system **shall** present Admin a verification checklist and **shall** allow approval only when all checklist items are satisfied; on approval the Provider status **shall** become Approved and the license-verified date **shall** be recorded.
- Source: A-05. Governs: LC-8, LC-9. Status: Approved.

### FR-PRV-007 — Rejection and correction
The system **shall** allow Admin to reject with a reason or request a correction; a rejection **shall** set status Rejected and a correction request **shall** keep the Provider Pending, notifying the Provider in both cases.
- Source: A-05. Status: Approved.

### FR-PRV-008 — Overdue pending registrations
The system **shall** flag a Pending registration as Overdue when no Admin action has occurred for more than 14 days.
- Source: A-05. Governs: OPR-4. Status: Provisional (AMB; A3 confirmation).

### FR-PRV-009 — Support trial start and countdown
On approval the system **shall** begin a 3-month support trial dated from approval and **shall** make the remaining trial time observable to the Provider.
- Source: A-07. Governs: OPR-2. Status: Provisional (AMB; A1 confirmation).

### FR-PRV-010 — Support trial expiry gating
The system **shall** gate support requests once the support trial has expired and **shall** notify the Provider before and on expiry.
- Source: A-07. Governs: OPR-2. Status: Provisional (AMB-035 monetization).

### FR-PRV-011 — License expiry warning
The system **shall** warn a Provider when a license is within 30 days of expiry.
- Source: A-06. Governs: OPR-3. Status: Approved.

### FR-PRV-012 — License expiry auto-pause
On license expiry the system **shall** pause all of the Provider's Listings and **shall** alert Admin; on Admin-confirmed renewal the system **shall** restore the previously published Listings.
- Source: A-06. Governs: INV-7, OPR-3. Status: Approved.

### FR-PRV-013 — Provider suspension
The system **shall** allow Admin to suspend and unsuspend an Approved Provider, and a suspended Provider's Listings **shall not** be bookable.
- Source: Admin Panel. Governs: INV-6. Status: Provisional (AMB-026 in-flight bookings).

---
