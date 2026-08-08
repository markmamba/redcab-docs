---
title: IAM — Identity & Access
sidebar_label: IAM
sidebar_position: 2
description: Functional requirements for IAM context.
---

## TL;DR

- Identity & Access FRs: registration, login, lockout, roles, language preference, guest browsing, corporate accounts.
- Platform Admin uses a **separate principal** — not a marketplace `Account.role`.

## About this document

Functional requirements for the **IAM** bounded context.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## IAM — Identity & Access

### FR-IAM-001 — Tourist self-registration
The system **shall** allow an unauthenticated Visitor to register a Tourist Account using an email address and a password meeting the published strength rule (minimum 8 characters, at least one number) with password confirmation.
- Source: A-01. Governs: glossary (Account), OPR rules. Status: Approved.

### FR-IAM-002 — Duplicate email rejection
The system **shall** reject registration when the email already belongs to an Account, and **shall** indicate that an account already exists.
- Source: A-01. Status: Approved.

### FR-IAM-003 — Password confirmation mismatch
The system **shall not** create an Account when the password and confirmation do not match.
- Source: A-01. Status: Approved.

### FR-IAM-004 — Account verification
The system **shall** issue an email-based verification to a newly registered Tourist.
- Source: A-01. Governs: NOT context. Status: Approved.

### FR-IAM-005 — Login
The system **shall** authenticate a registered Actor presenting valid credentials and **shall** establish an authenticated session.
- Source: A-02. Status: Approved.

### FR-IAM-006 — Ambiguous login failure
On invalid credentials the system **shall** report a single non-specific failure that does not reveal which field was incorrect.
- Source: A-02. Governs: SEC posture. Status: Approved.

### FR-IAM-007 — Login lockout
The system **shall** lock an Account for 15 minutes after 5 consecutive failed login attempts and **shall** notify the Account holder of the lockout.
- Source: A-02. Governs: OPR-1. Status: Provisional (AMB-016).

### FR-IAM-008 — Authentication methods
The system **shall** support email/password authentication and **may** support Google-based sign-in; registration **may** require a human-verification challenge.
- Source: A-01, meeting-notes. Governs: glossary (Account). Status: Provisional (AMB-021).

### FR-IAM-009 — Role-based access surfaces
The system **shall** grant each authenticated marketplace Actor access only to the surfaces permitted by their Role (Tourist, Corporate, Provider) and **shall** block access to all others. Platform Admin **shall** authenticate via a separate Admin principal and **shall** reach the Admin Panel (`/team`) only through that principal — Admin is not a marketplace Role.
- Source: 1.1–1.6. Governs: bounded-contexts (IAM). Status: Approved.

### FR-IAM-010 — Language preference capture and persistence
The system **shall** prompt a Tourist to select a language preference (English or Japanese) on first login, **shall** persist it to the Account, and **shall not** prompt again unless the Actor changes it.
- Source: A-01, G-03. Governs: OPR-9. Status: Approved.

### FR-IAM-011 — Language default fallback
If a Tourist dismisses language selection without choosing, the system **shall** default to English and **shall** re-present the choice on next login.
- Source: G-03. Status: Approved.

### FR-IAM-012 — Guest browsing scope
Unauthenticated Visitors **may** browse public discovery content; the system **shall** require an authenticated Tourist or Corporate Account to initiate a booking.
- Source: 1.1, B-01, meeting-notes. Status: Provisional (AMB-022).

### FR-IAM-013 — Corporate account registration
The system **shall** allow registration of a Corporate/Group Account capturing organization identity and group-size range, and **shall** record the account type as Corporate.
- Source: A-08. Governs: glossary (Corporate Client). Status: Approved.

---
