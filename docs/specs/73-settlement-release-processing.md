---
title: "73 — Settlement release processing for payout queue"
issue: "https://github.com/markmamba/red-cab-api/issues/73"
repos:
  - red-cab-api
status: approved
phase: 1
context: PAY
---

## TL;DR

- Ships payout dispatch sweep + `ProcessingManager` that calls `release_settlement` and advances `PayoutQueueEntry` to `:processing` with snapshotted amounts.
- Terminal `:disbursed` / `:failed` transitions remain on existing `SettlementDisbursedManager` / `SettlementFailedManager` via verified provider events.
- Does **not** ship Stripe adapter, admin retry UI, `PayoutFailed` notifications (unless Q3=A), or refund void interlock (PAY-8).
- Breaking change: No

## Problem

After completion determination, `QueuePayoutManager` enqueues a `PayoutQueueEntry` in `:queued` with frozen amounts and a clearing window. **No code advances the entry to processing or calls the adapter.** `Payments::Adapters::Adapter#release_settlement` exists on `FakeProvider` but has zero production callers. Settlement event handlers (`SettlementDisbursedManager`, `SettlementFailedManager`) are wired but require the entry to already be `:processing` with a `provider_ref`.

Evidence: `app/domains/payments/payout_queue_entries/create_service.rb`, `app/domains/payments/adapters/adapter.rb`, `app/domains/payments/provider_events/handlers/settlement_disbursed_manager.rb`, issue #73.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-PAY-005 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Settlement release queue lifecycle |
| FR-PAY-008 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Idempotent settlement operations |
| FR-PAY-013 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Platform fee = snapshotted commission |
| FR-PAY-015 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Money state from verified provider events only |
| ADR-015 | [architecture/decisions/adr-015-payment-custody-and-control-separation.md](../architecture/decisions/adr-015-payment-custody-and-control-separation.md) | Provider custody; adapter-only settlement |
| LC-13, LC-14 | [architecture/booking-state-machine.md](../architecture/booking-state-machine.md) | Payout queue lifecycle |
| FIN-4, FIN-11, FIN-12 | [domain/domain-models.md](../domain/domain-models.md) | Snapshot amounts; webhook truth |
| INV-2, INV-12 | [business-rules/invariants.md](../business-rules/invariants.md) | Commission split; merchant destination |
| DBML | `red-cab-api/docs/db/payments.dbml` | `payments_payout_queue_entries` schema + dispatch index |
| Spec #71 | [specs/71-payment-attempt-checkout.md](./71-payment-attempt-checkout.md) | Adapter-outside-transaction pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Add `ProcessingManager` only for `:queued`/`:failed` → `:processing` | Also add `DisburseManager`/`FailManager` | Terminal handlers already exist under different names |
| 2 | Cron dispatch sweep (15 min) | Event-driven on `BookingPayoutQueued` | Issue tasks + enqueue sweep precedent; event has no subscriber |
| 3 | Adapter call before short DB transaction | Call inside `PayoutQueueEntry.lock` transaction | #71 / PKM: no network I/O under row lock |
| 4 | Idempotency key `settlement:#{payout_queue_entry.uuid}` | Client-supplied key | Matches charge pattern |
| 5 | `payment_reference` = `checkout_session.uuid` | `Charge.provider_ref` | Charge not reliably keyed by `booking_id` at origin |
| 6 | Amounts from queue entry columns only | Re-read live booking rate | PAY-6 / FIN-6; snapshot authority |
| 7 | Booking eligibility: `completed` or `payout_queued` only | Any non-terminal booking | DBML lifecycle note |
| 8 | Ineligible booking → silent skip | Mark entry `:failed` | Phase 1 refund interlock; no disburse on cancelled/refunded |
| 9 | `payment_provider` set at processing | Set at enqueue | Matches charge initiation timing |
| 10 | No migration | Add columns | Schema + indexes already landed |
| 11 | Failed retry via same `ProcessingManager` | Separate `RetryManager` | DBML LC-14 same-row retry |
| 12 | Sweep scope `:queued` only (Q1=B) | Include `:failed` in sweep | Admin retry deferred; `ProcessingManager` accepts `:failed` for test/direct retry |
| 13 | No pre-adapter merchant gate (Q2=B) | Skip or fail before adapter call | Attempt release; `settlement_failed` sets `:failed` with provider reason |
| 14 | Defer PayoutFailed notification (Q3=B) | Wire admin alert in #73 | Notifications consumer not shipped; row update + tests only |

## Processing flow

### `Payments::PayoutQueueEntries::ProcessingManager.execute(payout_queue_entry:)`

1. Load `payout_queue_entry` with `booking` (+ `checkout_session`, `provider_profile`).
2. `ProcessingValidator` checks:
   - `status` is `:queued` or `:failed`
   - `available_for_payout_at <= Time.current` (queued path; failed retry may omit if already past)
   - `booking.status` is `completed` or `payout_queued`
   - No merchant capability pre-check (Q2=B) — adapter call proceeds; failure via `settlement_failed`
   - Snapshot integrity: `gross_amount_jpy == commission_amount_jpy + net_payout_amount_jpy`
3. **Outside transaction:** call `Adapters::Resolver.current.release_settlement` with:
   - `settlement_reference:` `payout_queue_entry.uuid`
   - `payment_reference:` `booking.checkout_session.uuid`
   - `merchant_reference:` `booking.provider_profile.uuid`
   - `net_amount_jpy:` `payout_queue_entry.net_payout_amount_jpy`
   - `platform_fee_amount_jpy:` `payout_queue_entry.commission_amount_jpy`
   - `idempotency_key:` `"settlement:#{payout_queue_entry.uuid}"`
4. **Short transaction:** `PayoutQueueEntry.lock.find(id)` → re-check status → assign:
   - `payment_provider:` `Adapters::Resolver.configured_key`
   - `status:` `:processing`
   - `provider_ref:` adapter `OperationResult.provider_ref`
   - `failure_reason:` `nil` (on retry from `:failed`)
5. Return updated entry. Do **not** set `:disbursed` synchronously.

### `Payments::PayoutQueueEntries::DispatchSweepManager.execute`

1. Scope: `PayoutQueueEntry.status_queued` where `available_for_payout_at <= now`, joined booking eligible (`completed` or `payout_queued`).
2. `find_each` → `ProcessingManager.execute(payout_queue_entry: entry)`.
3. `rescue Errors::ValidationError, Errors::UnprocessableContentError` → log + `next` (per-item isolation).
4. Return count of processed entries.

### Terminal transitions (existing — extend tests only)

- `settlement_disbursed` → `SettlementDisbursedManager` → `:disbursed` + `destination_account_ref` in `provider_payload`
- `settlement_failed` → `SettlementFailedManager` → `:failed` + `failure_reason`

### Files to create or modify (API)

- `app/domains/payments/payout_queue_entries/processing_validator.rb`
- `app/domains/payments/payout_queue_entries/processing_manager.rb`
- `app/domains/payments/payout_queue_entries/dispatch_sweep_manager.rb`
- `app/jobs/payments/payout_queue_entries/dispatch_sweep_job.rb`
- `config/sidekiq_scheduler.yml`
- `test/domains/payments/payout_queue_entries/processing_manager_test.rb`
- `test/domains/payments/payout_queue_entries/dispatch_sweep_manager_test.rb`
- `test/jobs/payments/payout_queue_entries/dispatch_sweep_job_test.rb`
- `test/integration/payments/payout_queue_settlement_lifecycle_integration_test.rb`

## Data / domain touchpoints

- **Bounded context:** PAY (processing, sweep); read-only BKG (`Order.status`, `checkout_session.uuid`)
- **Transaction boundary:** Adapter external; DB transaction only for `:processing` persist
- **Snapshots:** `gross_amount_jpy`, `commission_amount_jpy`, `net_payout_amount_jpy` from queue entry — never live rate
- **Critical invariant:** No disbursement before clearing gate; no second queue row per booking; provider events are sole authority for terminal states

## Out of scope

- Stripe adapter
- Admin retry UI / team endpoints
- `BookingPayoutQueued` event subscriber for dispatch
- Refund void interlock (PAY-8) beyond skip-ineligible guard
- Disputes/chargebacks post-settlement
- New migrations or HTTP routes

## Tasks

### API

- [ ] Implement `ProcessingValidator` + `ProcessingManager`
- [ ] Implement `DispatchSweepManager` + `DispatchSweepJob` + scheduler entry
- [ ] Add unit tests (manager, validator, sweep, job)
- [ ] Add integration lifecycle test (FakeProvider + `process_enqueued_provider_events!`)
- [ ] Add retry-after-failed test (per Q1 scope)
- [ ] Add concurrency test if `RecordNotUnique` race guard added

### Docs

- [x] Human verification MCQs answered (Q1=B, Q2=B, Q3=B); `status: approved` (2026-09-20)
- [ ] Run `review-implementation-spec` before codegen

## Test plan

- [ ] `ProcessingManager` calls adapter with exact snapshot amounts and idempotency key
- [ ] Clearing gate enforced (`available_for_payout_at` in future → skip)
- [ ] Cancelled/refunded booking → skip, entry stays `:queued`
- [ ] `:failed` retry re-enters `:processing` on same row
- [ ] Sweep isolates per-item failures
- [ ] Integration: `queued → processing → disbursed` through ingest boundary
- [ ] Integration: `settlement_failed` sets `failure_reason`
- [ ] Idempotent replay of `settlement_disbursed` on terminal entry
