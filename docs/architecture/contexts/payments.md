---
title: Payments & Payouts (Context)
sidebar_label: Payments (Context)
sidebar_position: 5
description: Bounded context documentation for Red Cab Marketplace.
---

### 4. Payments & Payouts (core)
- **Purpose:** **Owns money movement instruction** and the Commission Rate setting: payment initiation, completion determination, settlement release, refunds, and reconciliation with the external rail. Payments instructs; it never holds funds — **custody sits with the licensed payment provider** (`INV-13`, `PAY-13`, [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation)).
- **Aggregates owned:** `Payment`/`Charge` record (provider-side capture keyed to CheckoutSession), `ProviderMerchantAccount` (sub-merchant destination per Provider), `PayoutQueueEntry` (`QUEUED → PROCESSING → DISBURSED | FAILED`; evidentiary record of the release instruction), `RefundRecord`, `CommissionRateSetting` (platform-wide), `ProviderEvent` (idempotent inbound event ingestion), `ReconciliationRecord`.
- **Custody boundary:** no aggregate in this context represents funds held by Red Cab. Balances, holds, and splits are the payment provider's; this context holds only records of instructions issued and outcomes observed.
- **Transactional boundary:** each money operation (charge, refund, payout entry) is individually transactional and idempotent (`FIN-10`); state converges to verified provider-event truth (`FIN-11`) and never to a client-supplied signal (`FIN-13`).
- **Upstream deps:** Booking (snapshots, completion determination), COR (corporate virtual-account receipt), payment provider (external, licensed).
- **Downstream consumers:** Notifications; Admin Payments Overview.
- **Sync (exposes):** payment/refund/settlement-release initiation commands; commission-rate read for checkout snapshotting; `payout_capability(provider_id) -> { provider_id, status, payouts_enabled, verified_at }` for the Catalog publish gate (`INV-12`, `LC-12`).
- **Async (publishes):** `PaymentSucceeded`, `PaymentFailed`, `RefundCompleted`, `PayoutQueued`, `PayoutDisbursed`, `PayoutFailed`, `MerchantAccountVerified`, `MerchantAccountRestricted`, `BankTransferConfirmed`.
- **Integration contract:** consumes the Booking Commission Snapshot read-only; never authors or mutates it. The platform fee instructed to the provider MUST equal the snapshotted `commission_amount` (`FIN-12`).
- **Provider integration:** the payment provider is engaged only through a **capability-declaring adapter**. Domain code branches on declared capability, never on provider identity; a startup assertion rejects any adapter declaring platform custody or platform merchant-of-record, or lacking deferred platform-triggered release (`ADR-015` C6).
- **Rules anchored here:** `PAY-1..17`, `FIN-1..14`, `INV-13`, `LC-6`, `LC-13`, `LC-14`.
- **Open decisions:** `AMB-037` (cross-border exemption, P0), `AMB-040` (provider custody/release, P0), `AMB-038` (clawback), `AMB-039` (capture timing), `AMB-006`, `AMB-008`, `AMB-009` (confirmation).
