---
title: Lifecycle-Owned Data
sidebar_position: 6
description: Conceptual data model for Red Cab Marketplace.
---

## 10. Lifecycle-Owned Data

Some data is **mutable lifecycle state** owned by a single aggregate and changed only through guarded transitions defined by that aggregate's state model ([../domain/domain-models.md](/docs/domain/domain-models) §1; `LC-1..6`). No external context may force a transition it does not own.

| Lifecycle-owned state | Owning aggregate (context) | Allowed values / shape | Authority |
| --- | --- | --- | --- |
| **Booking State** | Booking (BKG) | B2C card path enters `CONFIRMED`; then `CONFIRMED → COMPLETED → PAYOUT_QUEUED`; Corporate may use `PENDING`; cancellations to `CANCELLED`; `COMPLETED → REFUNDED`; terminal states have no exit | [./booking-state-machine.md](/docs/architecture/booking-state-machine), `LC-1..6`, `BKG-10` |
| **Provider Status** | ProviderApplication (PRV) | `Pending → Approved \| Rejected`; `Approved → Suspended ↔ Approved` | `LC-7`, `LC-9`, `INV-9` |
| **License validity** | LicenseRecord (PRV) | valid → expiring-soon (≤30d) → expired → renewed | `OPR-3`, `INV-7` |
| **Support trial** | SupportTrial (PRV) | active → expiring → expired | `OPR-2` |
| **Listing Status** | Listing (CAT) | `Draft → Published → Paused/Unpublished → Unlisted`; only `Published` is tourist-visible | `LC-10`, `INV-8`, `INV-10` |
| **AvailabilitySlot state** | AvailabilitySlot (CAT) | open → (partially reserved) → fully booked → past; `0 ≤ available_seats ≤ capacity` | `INV-3`, `CON-3` |
| **Quotation Status** | Quotation (COR) | `Pending → Sent → Accepted \| Rejected \| Expired`; converts to Booking only from `Accepted` | `LC-11` |
| **Review moderation** | Review (REV) | `PendingModeration → Approved \| Removed` | `OPR-6` |
| **Payout queue entry state** | PayoutQueueEntry (PAY) | `QUEUED → PROCESSING → DISBURSED \| FAILED` (`LC-13`, `LC-14`) | `LC-6`, `FIN-5`, `PAY-14` |
| **Account state** | Account (IAM) | registered → active → (locked ↔ active) | `OPR-1` |
| **Dispatch state** | NotificationDispatch (NOT) | requested → dispatched \| failed | `OPR-8` |

Rules for lifecycle-owned data:

- **Each lifecycle fact records the instant it occurred** (e.g. `completed_at`); the context that owns the transition owns its timestamp ([../domain/domain-models.md](/docs/domain/domain-models) §2). Operational service times use fixed timezone **`Asia/Tokyo` (JST)**; persistence stores instants as UTC (`TIMESTAMPTZ`). Wall-clock auto-complete runs 24h after service end in JST (`OPR-12`).
- **A committed transition is never rolled back by a failed downstream reaction**; the reaction is retried independently and idempotently.
- **Mutable lifecycle state is distinct from immutable facts.** Snapshots and completed movements never change; only the lifecycle position advances along permitted transitions.
