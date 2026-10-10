---
title: Reviews & Ratings (REV)
sidebar_label: Reviews & Ratings (REV)
sidebar_position: 8
description: Functional requirements for REV context.
---

## TL;DR

- Reviews FRs: verified-booking-only submission, post-publication moderation, provider report, provider responses, rating score, review link window.
- At most one review per completed booking.

## About this document

Functional requirements for **REV — Reviews & Ratings**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/70-79-business/requirements/functional-requirements) |
| Reviews context | [Reviews & Ratings](/docs/30-49-domains/bounded-contexts/reviews) |
| Rules | [Business Rules](/docs/70-79-business/business-rules/invariants) (`INV-5`, `OPR-6`, `OPR-7`) |

---

## REV — Reviews & Ratings

### FR-REV-001 — Review eligibility
The system **shall** allow a review only for a Booking that has completed, and **shall** allow at most one review per Booking.
- Source: F-01. Governs: INV-5, BKG-7. Status: Approved.

### FR-REV-002 — Review invitation and window
The system **shall** issue a review invitation upon completion and **shall** accept a review only within 14 days of completion.
- Source: F-01. Governs: OPR-7, OPR-8. Status: Approved.

### FR-REV-003 — Review submission content
The system **shall** accept a required star rating and optional text and photos within published limits.
- Source: F-01. Status: Approved.

### FR-REV-004 — Publication on submit
The system **shall** publish a valid tourist-submitted review on the Listing immediately and **shall** include it in public review read paths without a prior Admin approve step.
- Source: F-01, F-03. Governs: OPR-6. Status: Approved. See [ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation).

### FR-REV-005 — Post-publication moderation actions
The system **shall** allow a Provider to report a published review, **shall** allow Admin to dismiss a report or remove a review with a reason (notifying the Tourist on removal), and **shall** prioritize provider-flagged reviews in the Team queue.
- Source: F-03. Status: Approved. See [ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation).

### FR-REV-006 — Provider response
The system **shall** allow a Provider to publicly respond once to a published review and **shall** require Admin permission for further edits.
- Source: F-02. Status: Approved.

### FR-REV-007 — Rating score display
The system **shall** compute and present a Listing's rating score and review count from published reviews only (`moderation_status` approved, not removed).
- Source: F-04. Governs: OPR-6. Status: Approved.

---
