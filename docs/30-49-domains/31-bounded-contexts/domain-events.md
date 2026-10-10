---
title: Domain Events Catalog
sidebar_position: 10
description: In-process domain events by publisher and primary consumer — past tense, idempotent handlers.
---

## TL;DR

- All events are **in-process**, **past tense**, and consumed with **idempotent** handlers.
- Booking, Payments, and Onboarding events drive the highest fan-out (Notifications, Catalog, Reviews).
- Events carry identities and immutable facts. They do not carry live aggregate references across contexts.

## About this document

Catalog of strategic domain events. Implementation detail lives in `red-cab-api` domain code and [ADR-008](/docs/30-49-domains/architecture-decisions/adr-008-domain-event-architecture).

| Topic | Document |
| --- | --- |
| Integration model | [ADR-004](/docs/30-49-domains/architecture-decisions/adr-004-context-integration-model) |
| Coupling risks | [Coupling risks](/docs/30-49-domains/bounded-contexts/coupling-risks) |

---

## Event catalog

| Event | Published by | Primary consumers |
| --- | --- | --- |
| `AccountRegistered`, `AccountLocked` | Identity | Notifications |
| `ProviderApproved`, `ProviderRejected`, `ProviderSuspended` | Onboarding | Catalog, Notifications |
| `LicenseExpiringSoon`, `LicenseExpired`, `LicenseRenewed` | Onboarding | Catalog (pause or restore), Notifications |
| `SupportTrialExpiring`, `SupportTrialExpired` | Onboarding | Notifications |
| `ListingPublished`, `ListingPaused`, `ListingUnlisted` | Catalog | Search (index), Notifications |
| `RatingRecalculated` | Reviews | Catalog (display) |
| `BookingCreated`, `BookingConfirmed`, `BookingCancelled`, `BookingCompleted`, `BookingRefunded` | Booking | Payments, Reviews, Notifications |
| `PaymentSucceeded`, `PaymentFailed`, `RefundCompleted`, `PayoutQueued`, `PayoutDisbursed`, `PayoutFailed`, `ConnectedAccountVerified`, `ConnectedAccountRestricted`, `BankTransferConfirmed` | Payments | Booking, Catalog (restriction pause — Phase 2), Notifications |
| `QuotationRequested`, `QuotationSent`, `QuotationAccepted`, `QuotationRejected`, `QuotationExpired`, `InvoiceIssued` | Corporate | Booking, Payments, Notifications |
| `ReviewSubmitted`, `ReviewApproved`, `ReviewRemoved` | Reviews | Notifications |

## Consumer rules

Handlers must be idempotent.

Redelivery must not double-act (notifications, payout queueing, rating recalculation).

Cross-context reactions tolerate delay, reordering, and redelivery (`FIN-10`).
