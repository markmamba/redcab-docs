---
title: Lifecycle-Owned Data
sidebar_position: 6
description: Mutable lifecycle state per aggregate — guarded transitions and owning context.
---

## TL;DR

- Lifecycle state is **mutable** and owned by one aggregate per row in the table below.
- Only the owning context may advance state along permitted transitions.
- Lifecycle state is separate from **snapshots** and completed financial movements.

## About this document

Restates [Domain models](/docs/30-49-domains/domain-models/domain-models) §1 and `LC-*` rules. Does not add aggregates.

| Topic | Document |
| --- | --- |
| Booking states | [Booking state machine](/docs/30-49-domains/patterns/booking-state-machine) |
| Snapshots | [Immutable snapshots](/docs/30-49-domains/data-model/snapshots) |

---

## Lifecycle-owned state

| Lifecycle-owned state | Owning aggregate (context) | Allowed values / shape | Authority |
| --- | --- | --- | --- |
| **Booking State** | Booking (BKG) | B2C card path enters `CONFIRMED`; then `CONFIRMED → COMPLETED → PAYOUT_QUEUED`; Corporate may use `PENDING`; cancellations to `CANCELLED`; `COMPLETED → REFUNDED`; terminal states have no exit | [Booking state machine](/docs/30-49-domains/patterns/booking-state-machine), `LC-1`..`LC-6`, `BKG-10` |
| **Provider Status** | ProviderApplication (PRV) | `Pending → Approved \| Rejected`; `Approved → Suspended ↔ Approved` | `LC-7`, `LC-9`, `INV-9` |
| **License validity** | LicenseRecord (PRV) | valid → expiring-soon (≤30d) → expired → renewed | `OPR-3`, `INV-7` |
| **Support trial** | SupportTrial (PRV) | active → expiring → expired | `OPR-2` |
| **Listing Status** | Listing (CAT) | `Draft → Published → Paused/Unpublished → Unlisted`; only `Published` is tourist-visible | `LC-10`, `INV-8`, `INV-10` |
| **AvailabilitySlot state** | AvailabilitySlot (CAT) | open → (partially reserved) → fully booked → past; `0 ≤ available_seats ≤ capacity` | `INV-3`, `CON-3` |
| **Quotation Status** | Quotation (COR) | `Pending → Sent → Accepted \| Rejected \| Expired`; converts to Booking only from `Accepted` | `LC-11` |
| **Review moderation** | Review (REV) | `PendingModeration → Approved \| Removed` | `OPR-6` |
| **Payout queue entry state** | PayoutQueueEntry (PAY) | `QUEUED → PROCESSING → DISBURSED \| FAILED \| VOIDED` (`LC-13`, `LC-14`) | `LC-6`, `FIN-5`, `PAY-14` |
| **Account state** | Account (IAM) | registered → active → (locked ↔ active) | `OPR-1` |
| **Dispatch state** | NotificationDispatch (NOT) | requested → dispatched \| failed | `OPR-8` |

## Rules

Each lifecycle fact records the instant it occurred (for example `completed_at`). The owning context owns that timestamp.

Operational wall-clock rules use the Booking **Service Timezone** snapshot.

Catalog authoring uses the Listing geography timezone ([ADR-014](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model), [ADR-016](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree)).

Persistence stores instants as UTC (`TIMESTAMPTZ`).

Auto-complete runs 24h after service end in the snapshotted service timezone (`OPR-12`).

A committed transition is never rolled back because a downstream reaction failed. The reaction retries independently and idempotently.

Snapshots and completed movements never change. Only lifecycle position advances along permitted transitions.
