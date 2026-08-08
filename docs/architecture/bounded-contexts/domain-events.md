---
title: Domain Events Catalog
sidebar_position: 10
description: Bounded context documentation for Red Cab Marketplace.
---

## Domain events catalog (in-process, past-tense, idempotent)
| Event | Published by | Primary consumers |
| --- | --- | --- |
| `AccountRegistered`, `AccountLocked` | Identity | Notifications |
| `ProviderApproved/Rejected/Suspended` | Onboarding | Catalog, Notifications |
| `LicenseExpiringSoon/Expired/Renewed` | Onboarding | Catalog (pause/restore), Notifications |
| `SupportTrialExpiring/Expired` | Onboarding | Notifications |
| `ListingPublished/Paused/Unlisted` | Catalog | Search (index), Notifications |
| `RatingRecalculated` | Reviews | Catalog (display) |
| `BookingCreated/Confirmed/Cancelled/Completed/Refunded` | Booking | Payments, Reviews, Notifications |
| `PaymentSucceeded/Failed`, `RefundCompleted`, `PayoutQueued/Disbursed/Failed`, `ConnectedAccountVerified/Restricted`, `BankTransferConfirmed` | Payments | Booking, Catalog (restriction pause — Phase 2), Notifications |
| `QuotationRequested/Sent/Accepted/Rejected/Expired`, `InvoiceIssued` | B2B | Booking, Payments, Notifications |
| `ReviewSubmitted/Approved/Removed` | Reviews | Notifications |

All events are in-process; consumers must be idempotent so redelivery cannot double-act (notifications, payout queuing, rating recalculation).

---
