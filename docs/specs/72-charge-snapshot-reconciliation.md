---
title: "72 — Charge snapshot reconciliation at payment success"
issue: "https://github.com/markmamba/red-cab-api/issues/72"
repos:
  - red-cab-api
status: approved
phase: 1
context: PAY
---

## TL;DR

- Adds `Payments::Charges::SnapshotReconciliationValidator` invoked from `PaymentSucceededManager` before charge `:succeeded` and booking materialization.
- Validates recorded gross and instructed platform fee against frozen `CheckoutSession` snapshots (`PAY-11`, `FIN-12`, `INV-2`).
- Does **not** ship discrepancy persistence, Stripe adapter, web changes, or migrations.
- Breaking change: No (mismatched charges that would have incorrectly succeeded will now fail the provider event)

## Problem

Commission split is frozen on `CheckoutSession` at creation (`PAY-11`). #71 copies `gross_amount_jpy` onto `Payments::Charge` at initiation, but **no reconciliation runs at `payment_succeeded`** before marking the charge succeeded and materializing the booking. A drift between recorded/instructed amounts and the frozen snapshot could create a booking with incorrect financial facts.

Evidence: `app/domains/payments/provider_events/handlers/payment_succeeded_manager.rb` (no amount validation), `app/domains/payments/charges/tourists_create_manager.rb` (`assert_snapshot_amounts!` checks internal consistency only, not charge vs snapshot).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-PAY-013 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Platform fee must equal snapshotted commission |
| FR-PAY-015 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Money state from verified provider events only |
| PAY-11, INV-2 | [business-rules/invariants.md](../business-rules/invariants.md) | Floor rounding; gross = net + commission |
| FIN-11, FIN-12 | [architecture/payments-architecture.md](../architecture/payments-architecture.md) | Event reconciliation; platform fee = snapshot commission |
| ADR-015 C4 | [architecture/decisions/adr-015-payment-custody-and-control-separation.md](../architecture/decisions/adr-015-payment-custody-and-control-separation.md) | Provider applies split; platform instructs snapshot values |
| ADR-006 | [architecture/decisions/adr-006-immutable-snapshot-strategy.md](../architecture/decisions/adr-006-immutable-snapshot-strategy.md) | Snapshots are write-once authority |
| DBML | `red-cab-api/docs/db/payments.dbml` | Charge `amount_jpy` copied from session gross |
| Spec #71 | [specs/71-payment-attempt-checkout.md](./71-payment-attempt-checkout.md) | Charge initiation; depends on #71 |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `SnapshotReconciliationValidator` (`ActiveModel::Validations`) | Inline checks in manager | Matches `QueuePayoutValidator` pattern |
| 2 | Gross: `charge.amount_jpy` vs `checkout_session.gross_amount_jpy` | Re-read from `raw_payload` | DBML: charge amount is write-once copy of session gross |
| 3 | Commission instructed source | `provider_event.raw_payload['commission_amount_jpy']` | Agent-proposed — provider-event echo (FIN-11); no `TouristsCreateManager` change |
| 4 | Failure: `Errors::ValidationError` before succeed | Dedicated discrepancy type; mark charge failed | `ProcessManager` marks event `failed`; charge stays `pending`; no booking (`FIN-9`) |
| 5 | Validation timing | `payment_succeeded` only | Keep `assert_snapshot_amounts!` at initiation |
| 6 | FakeProvider payload | Echo `amount_jpy` + `commission_amount_jpy` in `build_event_data` | Populates `raw_payload` for simulate/integration paths |
| 7 | No migration | Add `commission_amount_jpy` column on charge | Not needed — event payload + existing `charge.amount_jpy` |
| 8 | No discrepancy table | Persist `payments_discrepancies` | Deferred; hard reject for MVP |
| 9 | Payout queue unchanged | Re-verify snapshot copy | Already implemented in `CreateService` |

> **Human verification (2026-09-15):** User overrode MCQ Q1=A → agent-proposed Q1=B (`raw_payload` commission). Q2=A `payment_succeeded` only. Q3=A extend FakeProvider `build_event_data`.

## API contract

_No new HTTP endpoints. Reconciliation runs inside the async provider-event job._

### Internal flow — `payment_succeeded`

```
PaymentSucceededManager.execute(provider_event:)
  → find_charge! (lock)
  → ordering guard / idempotent succeeded path (unchanged)
  → load checkout_session from charge
  → instructed_platform_fee_jpy = provider_event.raw_payload['commission_amount_jpy']
  → SnapshotReconciliationValidator.new(
       charge: charge,
       checkout_session: checkout_session,
       instructed_platform_fee_jpy: instructed_platform_fee_jpy
     )
  → raise Errors::ValidationError if invalid
  → transition charge to :succeeded (unchanged)
  → MaterializeOrderManager (unchanged)
```

### Validator rules

| Check | Compare | Error when |
| --- | --- | --- |
| Recorded gross | `charge.amount_jpy` vs `checkout_session.gross_amount_jpy` | Not equal |
| Instructed platform fee | `provider_event.raw_payload['commission_amount_jpy']` vs `checkout_session.commission_amount_jpy` | Not equal or key missing |
| Provider gross echo (optional) | `raw_payload['amount_jpy']` vs `charge.amount_jpy` when present | Not equal |
| Snapshot internal consistency | Not in this validator (stays in `assert_snapshot_amounts!` at initiation) | — |

### Files to create or modify (API)

- `app/domains/payments/charges/snapshot_reconciliation_validator.rb`
- `test/domains/payments/charges/snapshot_reconciliation_validator_test.rb`
- `app/domains/payments/provider_events/handlers/payment_succeeded_manager.rb`
- `test/domains/payments/provider_events/handlers/payment_succeeded_manager_test.rb`
- `app/domains/payments/adapters/fake_provider.rb` — echo amounts in `build_event_data`

## Data / domain touchpoints

- **Bounded context:** PAY (validator, handler); reads BKG `CheckoutSession` snapshots read-only
- **Transaction boundary:** Validation inside existing `PaymentSucceededManager` transaction, before charge status write
- **Snapshots:** `gross_amount_jpy`, `commission_amount_jpy`, `net_payout_amount_jpy` on session — immutable authority
- **Critical invariant:** No booking materialization when charge/instructed amounts ≠ frozen snapshot

## Out of scope

- `payments_discrepancies` model and admin surfacing (FR-PAY-013 partial)
- Stripe adapter webhook field mapping
- Client / web changes
- Catalog pricing changes (`PRC-1`)
- Payout queue implementation changes (verify only)
- Migrations

## Tasks

### API

- [ ] Add `SnapshotReconciliationValidator`
- [ ] Wire into `PaymentSucceededManager` before succeed transition
- [ ] Unit tests: mismatch rejection, PAY-11 boundary (`gross=10_001`, `commission=1500`)
- [ ] Handler tests: validation failure prevents succeed + materialization
- [ ] Extend FakeProvider `build_event_data` for `payment_succeeded` (`amount_jpy`, `commission_amount_jpy`)
- [ ] Update handler tests to include commission in `raw_payload`
- [ ] Regression: payout queue + integration ingest tests

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Charge recording validated against session `gross_amount_jpy` at reconciliation
- [ ] Instructed platform fee validated against session `commission_amount_jpy` (`FIN-12`)
- [ ] Mismatch raises `Errors::ValidationError`; provider event ends `failed`; charge stays `pending`; no booking
- [ ] PAY-11 boundary covered in reconciliation unit tests
- [ ] Payout queue snapshot copy behavior unchanged
- [ ] Idempotent duplicate `payment_succeeded` still safe (`FIN-10`)

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/domains/payments/charges/snapshot_reconciliation_validator_test.rb
bin/rails test test/domains/payments/provider_events/handlers/payment_succeeded_manager_test.rb
bin/rails test test/domains/payments/payout_queue_entries/
bin/rails test test/integration/shared/payments/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-15 | PKM plan agent | human MCQ verification | approved |
