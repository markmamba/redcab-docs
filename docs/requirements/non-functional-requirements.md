---
title: Non-Functional Requirements
sidebar_position: 3
description: Performance, security, availability, and quality constraints.
---

## TL;DR

- **Non-functional requirements (NFR)** grouped by category: `PERF`, `TIME`, `AVAIL`, `SEC`, `PRIV`, `I18N`, `AUD`, `A11Y`, `COMP`.
- Each NFR is a single externally observable quality or constraint; behavior itself lives in functional requirements.
- `Provisional` items cite `AMB-###` and are not final until resolved.

## About this document

Observable qualities and constraints on system behavior.

| Topic | Document |
| --- | --- |
| Conventions | [Requirements Overview](/docs/requirements) |
| Functional behavior | [Functional Requirements](/docs/requirements/functional-requirements) |
| Traceability | [Traceability Matrix](/docs/requirements/traceability-matrix) |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## Reading guide
- **ID** `NFR-<CAT>-<NNN>`; **Source** = PRD story / notes / rule origin; **Governs** = authoritative rules/models it conforms to; **Status** = `Approved | Provisional | Draft`.
- Categories (per [./README.md](/docs/requirements) §3.1): `PERF`, `TIME`, `AVAIL`, `SEC`, `PRIV`, `I18N`, `AUD`, `A11Y`, `COMP`.
- "shall" = mandatory observable quality/constraint; "may" = optional. No implementation detail.
- An NFR is a quality/constraint under which behavior occurs; the behavior itself lives in [./functional-requirements.md](/docs/requirements/functional-requirements).
- NFRs may apply to one or many contexts; scope is stated in the requirement.

---

## TIME — Timeliness & SLA

### NFR-TIME-001 — Booking confirmation dispatch SLA
The system **shall** dispatch booking-confirmation notifications to the Tourist and the Provider within 60 seconds of the booking-creation event.
- Source: G-01, G-02. Governs: OPR-8; relates FR-NOT-001. Status: Approved.

### NFR-TIME-002 — Lifecycle notification timeliness
The system **shall** dispatch confirmation, cancellation, and refund notifications to the affected parties without undue delay following the triggering event.
- Source: G-01, G-02. Governs: OPR-8; relates FR-NOT-002. Status: Approved.

### NFR-TIME-003 — License expiry warning lead time
The system **shall** warn a Provider when one of their Licenses is within 30 days of expiry, before the expiry takes effect.
- Source: A-06. Governs: OPR-3; relates FR-PRV-011. Status: Approved.

### NFR-TIME-004 — Overdue pending-registration alert window
The system **shall** flag a Pending Provider registration as Overdue when no Admin action has occurred for more than 14 days.
- Source: A-05. Governs: OPR-4; relates FR-PRV-008. Status: Provisional (AMB; A3 confirmation).

### NFR-TIME-005 — Overdue quotation alert window
The system **shall** raise an Admin overdue alert when a Quotation Request remains unanswered for more than 3 business days.
- Source: E-05. Governs: OPR-5; relates FR-B2B-002. Status: Approved.

### NFR-TIME-006 — Overdue corporate-payment alert
The system **shall** raise an Admin payment-overdue alert when a corporate Booking's Bank Transfer deadline passes without recorded receipt.
- Source: E-07. Governs: OPR-5; relates FR-B2B-006. Status: Approved.

### NFR-TIME-007 — Review window enforcement
The system **shall** accept a Review only within 14 days of the Booking's completion and **shall not** accept submissions after the window closes.
- Source: F-01. Governs: OPR-7; relates FR-REV-002. Status: Provisional (AMB-019).

### NFR-TIME-008 — Account lockout duration
The system **shall** keep an Account locked for 15 minutes after 5 consecutive failed login attempts before permitting further attempts.
- Source: A-02. Governs: OPR-1; relates FR-IAM-007. Status: Provisional (AMB-016).

### NFR-TIME-009 — B2B auto-confirmation timer bound
For B2B or pre-payment paths that enter **pending**, the system **shall** elapse a Booking to confirmed after the auto-confirmation interval, bounded so the interval never extends past the service start time.
- Source: E-09. Governs: LC-2. Status: Provisional (B2B paths; B2C superseded — Decision Log `AMB-011`).

### NFR-TIME-010 — Auto-completion after service end
The system **shall** auto-transition a **confirmed** Booking to **completed** 24 hours after the slot's scheduled end time (Asia/Tokyo) when the Provider has not marked it delivered.
- Source: E-09. Governs: OPR-12, LC-5; relates FR-BKG-009. Status: Approved.

---

## PERF — Performance & Latency

### NFR-PERF-001 — Discovery responsiveness
The system **shall** return discovery and search results (location hierarchy, listing lists, filtered/sorted results) within a responsive interval under expected load.
- Source: B-01..B-03, D-01..D-05. Governs: relates FR-CAT-003..005, FR-CAT-023..027. Status: Draft (target latency to be set with Product).

### NFR-PERF-002 — Price computation consistency
The system **shall** present a computed Price Breakdown such that display, filtering, and checkout prices for the same parameters are identical, with no observable divergence.
- Source: architecture. Governs: PRC-1, PRC-2; relates FR-CAT-028. Status: Approved.

### NFR-PERF-003 — Checkout responsiveness under contention
The system **shall** resolve a checkout attempt to a definite outcome (booked or rejected as fully booked) promptly, including when multiple Tourists contend for the last seats.
- Source: E-02, E-11. Governs: CON-2, CON-3; relates FR-BKG-006. Status: Approved.

---

## AVAIL — Availability & Resilience

### NFR-AVAIL-001 — Platform availability target
The system **shall** be available to Actors during expected operating hours, meeting a published availability target.
- Source: platform operation. Governs: relates all contexts. Status: Draft (target to be set with operations).

### NFR-AVAIL-002 — Graceful unavailable states
The system **shall** present a temporarily-unavailable state, rather than an error or blank, when a Listing's Provider is suspended or otherwise unavailable.
- Source: B-04. Governs: relates FR-CAT-008. Status: Approved.

### NFR-AVAIL-003 — Money-operation resilience to retries
The system **shall** ensure that retries and duplicate external signals for the same money operation do not produce duplicate charges, refunds, or payouts.
- Source: E-02, E-11. Governs: FIN-10; relates FR-PAY-008. Status: Approved.

### NFR-AVAIL-004 — Convergence to external-rail truth
The system **shall** converge internal Payments state to the external payment rails' settlement outcomes, surfacing any divergence as a reconcilable fact rather than silent loss.
- Source: payments-architecture. Governs: FIN-11. Status: Provisional (AMB-005, AMB-006).

---

## SEC — Security, Authentication & Access Control

### NFR-SEC-001 — Ambiguous authentication failure
On invalid credentials the system **shall** report a single non-specific failure that does not reveal which field was incorrect.
- Source: A-02. Governs: relates FR-IAM-006. Status: Approved.

### NFR-SEC-002 — Brute-force lockout
The system **shall** lock an Account after 5 consecutive failed login attempts and notify the Account holder of the lockout.
- Source: A-02. Governs: OPR-1; relates FR-IAM-007. Status: Provisional (AMB-016).

### NFR-SEC-003 — Password strength
The system **shall** require a password of at least 8 characters including at least one number when credentials are set.
- Source: A-01. Governs: relates FR-IAM-001. Status: Approved.

### NFR-SEC-004 — Role-confined access
The system **shall** confine each authenticated Actor to the surfaces permitted by their Role and **shall** block access to all others.
- Source: 1.1–1.6. Governs: bounded-contexts (IAM); relates FR-IAM-009. Status: Approved.

### NFR-SEC-005 — Authenticated booking initiation
The system **shall** require an authenticated Tourist or Corporate Account to initiate a booking, regardless of guest browsing scope.
- Source: 1.1, B-01. Governs: relates FR-IAM-012. Status: Provisional (AMB-022).

### NFR-SEC-006 — Upload constraints
The system **shall** reject uploaded documents and photos that exceed the published size limit or fall outside the permitted formats.
- Source: A-04, C-02. Governs: relates FR-PRV-004, FR-CAT-011. Status: Approved.

### NFR-SEC-007 — Authentication method scope
The system **shall** authenticate Actors via email/password and **may** support Google-based sign-in; registration **may** require a human-verification challenge.
- Source: A-01, meeting-notes. Governs: relates FR-IAM-008. Status: Provisional (AMB-021).

---

## PRIV — Privacy & Data Protection

### NFR-PRIV-001 — Passenger manifest confidentiality
The system **shall** make a submitted Passenger Manifest viewable only to the assigned Provider and the submitting Corporate Client.
- Source: E-08. Governs: BKG-6; relates FR-BKG-014. Status: Approved.

### NFR-PRIV-002 — License document access restriction
The system **shall** restrict access to a Provider's uploaded License Documents to the Provider and Platform Admin.
- Source: A-04, A-05. Governs: relates FR-PRV-004, FR-PRV-006. Status: Approved.

### NFR-PRIV-003 — Historical data preservation
The system **shall** preserve historical Booking data when a Listing is Paused, Unlisted, or its District deactivated, and **shall not** delete it.
- Source: C-11, B-05. Governs: INV-11; relates FR-CAT-022, FR-CAT-002. Status: Approved.

### NFR-PRIV-004 — Personal data protection
The system **shall** protect Actors' personal data (contact details, manifests, credentials) against disclosure to unauthorized parties.
- Source: platform operation. Governs: relates FR-IAM-009. Status: Draft (data-protection policy to be set with Legal).

---

## AUD — Auditability of Financial Facts

### NFR-AUD-001 — Money-movement traceability
The system **shall** make every money movement (charge, capture, refund, payout) traceable to exactly one Booking and its snapshot.
- Source: E-10, E-13. Governs: FIN-3; relates FR-PAY-009. Status: Approved.

### NFR-AUD-002 — Snapshot immutability
The system **shall** keep a Booking's Price Snapshot and Commission Snapshot immutable for the life of the Booking, regardless of later listing, policy, or rate changes.
- Source: C1, E-10. Governs: INV-1, FIN-2; relates FR-BKG-015, FR-PAY-002. Status: Approved.

### NFR-AUD-003 — Snapshot-derived settlement
The system **shall** derive payout and refund amounts from snapshot values, never a live rate or edited policy.
- Source: E-12. Governs: FIN-6, PAY-6; relates FR-PAY-006. Status: Approved.

### NFR-AUD-004 — Idempotent uniquely-keyed money operations
The system **shall** ensure every external money operation is idempotent and uniquely keyed so retries and duplicate webhooks cannot double-charge, double-refund, or double-pay.
- Source: E-02, E-11. Governs: FIN-10; relates FR-PAY-008. Status: Approved.

### NFR-AUD-005 — Payout/refund mutual-exclusion observability
The system **shall** present, for each Booking's funds, an auditable state in which payout and refund are mutually exclusive and never both applied to the same captured amount.
- Source: E-12. Governs: FIN-5, PAY-8; relates FR-PAY-007. Status: Provisional (AMB-004).

### NFR-AUD-006 — Admin financial overview
The system **shall** present Admin an overview of all transactions showing gross, commission, net, booking status, and payout status with each Booking's frozen commission split.
- Source: E-13. Governs: FIN-3; relates FR-PAY-009. Status: Approved.

---

## I18N — Localization & Language

### NFR-I18N-001 — Language preference rendering
The system **shall** render each user-facing surface and each notification in the recipient's stored Language Preference (EN or JA).
- Source: G-03, G-04. Governs: OPR-9; relates FR-IAM-010, FR-NOT-003. Status: Approved.

### NFR-I18N-002 — Default language by surface
The system **shall** default the Tourist app to English and the Client Portal to Japanese when no preference is stored.
- Source: G-03, G-04. Governs: OPR-9; relates FR-IAM-011. Status: Provisional (AMB-024).

### NFR-I18N-003 — Bilingual geography labels
The system **shall** carry English and Japanese labels for every District and Area.
- Source: B-05. Governs: relates FR-CAT-001. Status: Approved.

### NFR-I18N-004 — Supported filter languages
The system **shall** allow filtering Listings by supported service language across the published supported-language set.
- Source: D-03. Governs: relates FR-CAT-025. Status: Provisional (AMB-024).

### NFR-I18N-005 — Single-currency presentation
The system **shall** present and charge all monetary amounts in whole Japanese Yen.
- Source: glossary (Money). Governs: PAY-1, FIN-8. Status: Provisional (AMB-025).

### NFR-I18N-006 — Formal document character rendering
The system **shall** render Japanese kanji and kana correctly on formal B2B documents (Quotation/Invoice).
- Source: E-04, E-06. Governs: relates FR-B2B-003. Status: Provisional (AMB-031).

---

## A11Y — Accessibility

### NFR-A11Y-001 — Accessibility baseline
The system **shall** meet a published accessibility conformance baseline for its Tourist-facing surfaces.
- Source: not yet specified (needs source/owner). Governs: relates FR-CAT-003..007. Status: Draft.

---

## COMP — Legal & Regulatory Compliance

### NFR-COMP-001 — Consumption tax itemization
The system **shall** itemize the 10% Japanese Consumption Tax on B2B Quotation and Invoice documents.
- Source: E-06. Governs: PAY-10; relates FR-B2B-003. Status: Provisional (AMB-033).

### NFR-COMP-002 — Whole-yen money handling
The system **shall** charge, refund, and pay out only whole JPY amounts, with no fractional yen in stored or displayed amounts.
- Source: glossary (Money). Governs: PAY-1, FIN-8. Status: Approved.

### NFR-COMP-003 — Formal document legal acceptability
The system **shall** produce B2B Quotation and Invoice documents acceptable as formal Japanese commercial documents.
- Source: E-04, E-06. Governs: relates FR-B2B-003. Status: Provisional (AMB-031).

### NFR-COMP-004 — Merchant/seller-of-record posture
The system **shall** reflect the established merchant-of-record / seller-of-record posture in its charge and document flows.
- Source: payments-architecture. Governs: relates FR-PAY-001, FR-B2B-003. Status: Provisional (AMB-032).

---

## Provisional requirements index
These NFRs depend on open decisions and cannot reach Approved until the cited item resolves:

- AMB-004 (clearing / payout-refund timing): NFR-AUD-005.
- AMB-005/006 (payout & refund failure states): NFR-AVAIL-004.
- AMB-011 (auto-confirm timer): NFR-TIME-009.
- AMB-016 (lockout params): NFR-TIME-008, NFR-SEC-002.
- AMB-019 (review window): NFR-TIME-007.
- AMB-021 (auth methods): NFR-SEC-007.
- AMB-022 (guest scope): NFR-SEC-005.
- AMB-024 (language defaults / supported languages): NFR-I18N-002, NFR-I18N-004.
- AMB-025 (currency): NFR-I18N-005.
- AMB-031 (PDF rendering): NFR-I18N-006, NFR-COMP-003.
- AMB-032 (merchant/seller-of-record): NFR-COMP-004.
- AMB-033 (consumption tax): NFR-COMP-001.
- A3 confirmation: NFR-TIME-004.

## Draft requirements pending source/owner
- NFR-PERF-001, NFR-AVAIL-001, NFR-PRIV-004 — targets/policies to be set with Product/Operations/Legal.
- NFR-A11Y-001 — no upstream PRD source; needs a designated source and owner before it can advance.

