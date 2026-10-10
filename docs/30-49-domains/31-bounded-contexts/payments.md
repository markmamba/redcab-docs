---
title: Payments & Payouts
sidebar_label: Payments (Context)
sidebar_position: 5
description: Core context — money movement instructions, commission rate, payouts, refunds, and provider reconciliation.
---

## TL;DR

- Owns **money movement instruction** and the platform **Commission Rate** setting.
- Does **not** hold funds. Custody sits with the licensed payment provider (`INV-13`, `PAY-13`, [ADR-015](/docs/30-49-domains/architecture-decisions/adr-015-payment-custody-and-control-separation)).
- Reads the Booking **Commission Snapshot** read-only. It never authors or edits snapshots.
- Converges to verified provider-event truth (`FIN-11`). It never trusts client-supplied payment signals (`FIN-13`).

## About this document

Bounded context overview for Payments & Payouts (core).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Payments architecture | [Payments architecture](/docs/30-49-domains/patterns/payments-architecture) |
| ADR-015 | [Payment custody and control](/docs/30-49-domains/architecture-decisions/adr-015-payment-custody-and-control-separation) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context instructs charges, refunds, settlement release, and payout queue processing.

It reconciles with the external payment rail.

It owns the platform-wide commission rate used when Booking freezes snapshots at checkout.

## Core concepts

**Aggregates:** `Payment` / `Charge` (provider capture keyed to CheckoutSession); `ProviderMerchantAccount`; `PayoutQueueEntry` (`QUEUED` → `PROCESSING` → `DISBURSED` | `FAILED`); `RefundRecord`; `CommissionRateSetting`; `ProviderEvent` (idempotent inbound ingestion); `ReconciliationRecord`.

No aggregate here represents funds held by Red Cab. Balances and holds live at the provider.

Each money operation is individually transactional and idempotent (`FIN-10`).

**Provider integration:** only through a capability-declaring adapter. Domain code branches on capability, not provider name.

Startup checks reject adapters that declare platform custody, platform merchant-of-record, or missing deferred platform-triggered release ([ADR-015](/docs/30-49-domains/architecture-decisions/adr-015-payment-custody-and-control-separation) C6).

## Integrations

**Upstream:** Booking (snapshots, completion); Corporate (virtual-account receipt); payment provider (external).

**Downstream:** Notifications; Admin Payments Overview.

**Sync (exposes):** payment, refund, and settlement-release commands; commission-rate read for checkout snapshotting; `payout_capability(provider_id) -> { provider_id, status, payouts_enabled, verified_at }` for Catalog publish gate (`INV-12`, `LC-12`).

**Async (publishes):** `PaymentSucceeded`, `PaymentFailed`, `RefundCompleted`, `PayoutQueued`, `PayoutDisbursed`, `PayoutFailed`, `MerchantAccountVerified`, `MerchantAccountRestricted`, `BankTransferConfirmed`.

**Contract:** platform fee instructed to the provider must equal snapshotted `commission_amount` (`FIN-12`).

## Related requirements

`PAY-1`..`PAY-17`, `FIN-1`..`FIN-14`, `INV-13`, `LC-6`, `LC-13`, `LC-14`.

## Open questions

`AMB-037` (cross-border exemption, P0), `AMB-040` (provider custody and release, P0), `AMB-038` (clawback), `AMB-039` (capture timing), `AMB-006`, `AMB-008`, `AMB-009` (confirmation). See [Open questions](/docs/70-79-business/planning/open-questions).
