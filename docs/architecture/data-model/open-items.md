---
title: Open Ambiguities (Data Model)
sidebar_position: 9
description: Conceptual data model for Red Cab Marketplace.
---

## 14. Open Ambiguities Affecting the Model

The model is built to accommodate either resolution of each open decision and **never silently assumes one**. Each is tracked in [../ambiguities/open-questions.md](/docs/ambiguities/open-questions); resolutions flow back through that register's Decision Log and then into the affected docs. **None of the items below changes the aggregate or context boundaries defined in [./bounded-contexts.md](/docs/architecture/bounded-contexts) and [../domain/domain-models.md](/docs/domain/domain-models)** — each affects value-object shape, lifecycle detail, a cross-context contract, or an external-rail concern within a single owning context.

| Ambiguity | Effect on the conceptual model | Affected concepts |
| --- | --- | --- |
| `AMB-006` — refund-failure handling | Whether a refund-failed/refund-pending fact is represented | Refund (PAY) |
| `AMB-009` — commission base | Confirms commission computed on gross **incl. mandatory Extra Charges**; affects Commission Snapshot values | Commission Snapshot (BKG) |
| `AMB-010` — snapshot scope | Confirms all three (price, commission, cancellation policy) are snapshotted at CheckoutSession creation | CheckoutSession / Booking snapshots (BKG) |
| `AMB-013/014` — lifecycle completeness & initiator | Additional transitions and the **CancellationContext** (initiator + refund outcome) needed so the refund rule is derivable | Booking State, CancellationContext (BKG) |
| `AMB-017` — bundle cancellation | Cross-leg effect when one BundleBooking leg is cancelled (the link is modeled; the cascade is not) | BundleBooking (BKG) |
| `AMB-021/022` — auth methods / guest scope | Shape of credentials/OAuth identities on Account and gating; no boundary change | Account (IAM) |
| `AMB-024` — language defaults / supported languages | The supported-language value set and per-surface defaults | LanguagePreference (IAM), Listing/Search (CAT) |
| `AMB-025` — currency | Whether Money remains single-currency JPY (the working baseline) | Money (cross-cutting) |
| `AMB-026` — provider mid-flight status change | Effect of suspension/expiry on already-confirmed Bookings; boundary rule (no historical mutation) holds regardless | Provider (PRV), Booking (BKG) |
| `AMB-027/028` — B2B pre-payment state / seat-hold timing | Whether B2B introduces a distinct pre-payment state and when seats are held; isolated behind the ACL | Quotation (B2B), AvailabilitySlot (CAT), Booking (BKG) |
| `AMB-029` — off-Stripe provider settlement | How the Provider's net for bank-transfer funds is recorded/disbursed | ReconciliationRecord, PayoutQueueEntry (PAY) |
| `AMB-031/033` — PDF rendering / consumption tax | Formal-document rendering and tax treatment on B2B documents | Quotation, Invoice (B2B) |
| `AMB-034` — SMS scope | Whether the SMS Channel is in MVP and phone verification is required | NotificationDispatch (NOT) |

> Scope note (mirrors [./overview.md](/docs/architecture/overview) and [../domain/domain-models.md](/docs/domain/domain-models) §7): no deferred decision above moves an ownership boundary. The boundaries are drawn so that these open questions can be resolved **within** a single owning context — which is precisely why this conceptual data model can be reviewed and relied upon ahead of those resolutions.
