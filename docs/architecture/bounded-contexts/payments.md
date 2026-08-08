---
title: Payments & Payouts (Context)
sidebar_label: Payments (Context)
sidebar_position: 5
description: Bounded context documentation for Red Cab Marketplace.
---

### 4. Payments & Payouts (core)
- **Purpose:** **Owns money movement** and the Commission Rate setting: Platform-account capture (Separate Charges & Transfers), payout-queue processing, refunds, reconciliation with external rails.
- **Aggregates owned:** `Payment`/`Charge` record (Platform account capture, keyed to CheckoutSession), `ProviderConnectedAccount` (Stripe Connect destination per Provider), `PayoutQueueEntry` (`QUEUED → PROCESSING → DISBURSED | FAILED`), `RefundRecord`, `CommissionRateSetting` (platform-wide), `ReconciliationRecord` (bank transfer).
- **Transactional boundary:** each money operation (charge, refund, payout entry) is individually transactional and idempotent (`FIN-10`); state converges to external-rail truth via webhooks (`FIN-11`).
- **Upstream deps:** Booking (snapshots), COR (bank-transfer reconciliation), Stripe Connect (external).
- **Downstream consumers:** Notifications; Admin Payments Overview.
- **Sync (exposes):** charge/refund/payout initiation commands; commission-rate read for checkout snapshotting; `payout_capability(provider_id) -> { provider_id, status, payouts_enabled, verified_at }` for Catalog publish gate (`INV-12`, `LC-12`).
- **Async (publishes):** `PaymentSucceeded`, `PaymentFailed`, `RefundCompleted`, `PayoutQueued`, `PayoutDisbursed`, `PayoutFailed`, `ConnectedAccountVerified`, `ConnectedAccountRestricted`, `BankTransferConfirmed`.
- **Integration contract:** consumes the Booking Commission Snapshot read-only; never authors or mutates it.
- **Rules anchored here:** `PAY-1..14`, `FIN-1..11`, `LC-6`, `LC-13`, `LC-14`.
- **Open decisions:** `AMB-006`, `AMB-008`, `AMB-009` (confirmation), `AMB-029` (off-Stripe settlement).
