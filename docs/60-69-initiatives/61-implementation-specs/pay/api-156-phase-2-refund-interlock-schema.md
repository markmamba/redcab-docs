---
title: "Phase 2 payments DBML — refund interlock (W0-3)"
sidebar_label: API · PAY refund interlock schema
issue: "https://github.com/markmamba/red-cab-api/issues/156"
repos:
  - red-cab-api
  - redcab-docs
status: approved
phase: 2
context: PAY
depends_on:
  - "docs/70-79-business/73-planning/roadmap/phase-2-execution-map.md (W0-3 row)"
epic: "https://github.com/markmamba/red-cab-api/issues/153"
---

## TL;DR

- Ships **Wave W0-3**: persist **`:voided`** on `payments_payout_queue_entries` with `void_reason`, `voided_from_status`, `voided_at`, and CHECK constraints for **PAY-8** / **FIN-5** refund interlock vocabulary.
- Updates **`docs/db/payments.dbml`**, **`docs/db/redcab.dbml`**, corpus (LC-13, LC-14, PAY-14, AMB-005), and minimal **`Payments::PayoutQueueEntry`** enums + tapioca RBI.
- **W0 semantics:** `:voided` is reserved for **W5** writers; Phase 1 **booking-status gate** remains the only runtime interlock until W5.
- Does **not** ship refund managers, row-lock interlock, dispatch reorder, settlement handlers, or webhooks — **W5**.
- Breaking change: **No** — additive schema and enum value only.

## Problem

Phase 2 execution map **W0-3**: `payments.dbml` documents payout/refund interlock prose but lacks a **`:voided`** terminal state on the queue row. Without it, W5 cannot persist void-before-refund under row lock, and Rails deserializes unknown status strings as `nil`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| W0-3 | [phase-2-execution-map.md](/docs/70-79-business/planning/roadmap/phase-2-execution-map) | Wave 0 verification bar |
| PAY-8, FIN-5 | [invariants](/docs/70-79-business/business-rules/invariants) | Refund voids payout; mutual exclusion |
| LC-13, LC-14, PAY-14 | [invariants](/docs/70-79-business/business-rules/invariants) | Payout queue lifecycle |
| AMB-005 | [open-questions](/docs/70-79-business/planning/open-questions) | Payout lifecycle decision log |
| Interlock | `red-cab-api/docs/db/payments.dbml` PAYOUT INTERLOCK note | Void before refund, same transaction |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **W0 schema gate only** | Defer to W5 | Execution map splits W0-3 vs W5 engine |
| 2 | **Single `:voided` + `void_reason` + provenance** | `:voided` + `:reversed`; void from `:processing` | Only `:queued` / `:failed` → `:voided` in W0; `voided_from_status` + `voided_at` preserve audit; `:processing` reversal deferred W5 (**AMB-038**) |
| 3 | **No second interlock table** | Separate lock table | Queue row is the lock target |
| 4 | **AR enums + tapioca in W0** | DB-only until W5 | Avoid `nil` deserialization |
| 5 | **`payments_refunds` unchanged in W0** | Refund-table DDL | Brief Q4=A; W5 may need nullable `provider_ref` while `:pending` |
| 6 | **Wide corpus Fix in docs PR** | lifecycle-data only | Business rules lead schema |

## API contract

_Not applicable — W0-3 is schema + enum only._

## Data / domain touchpoints

- Bounded context: **PAY**
- Table: **`payments_payout_queue_entries`** (delta only)
- **`payments_refunds`**: unchanged in W0

### `payments_payout_queue_entries` (delta)

| Column | Type | Notes |
| --- | --- | --- |
| `void_reason` | string NULL | `rails_enum(:booking_cancelled, :booking_refunded)`. Mandatory when `status = voided`. Not `failure_reason`. |
| `voided_from_status` | string NULL | `rails_enum(:queued, :failed)`. Mandatory when `status = voided`. |
| `voided_at` | timestamptz NULL | Mandatory when `status = voided`. Not `processed_at`. |

| Constraint | Expression |
| --- | --- |
| Status enum | `CHECK (status IN ('queued','processing','disbursed','failed','voided'))` |
| Void terminal | `CHECK (status <> 'voided' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL AND voided_from_status IN ('queued','failed')))` |
| Void from queued | `CHECK (voided_from_status <> 'queued' OR provider_ref IS NULL)` |
| `void_reason` scope | `CHECK (void_reason IS NULL OR status = 'voided')` |
| `void_reason` enum | `CHECK (void_reason IS NULL OR void_reason IN ('booking_cancelled','booking_refunded'))` |
| `voided_from_status` scope | `CHECK (voided_from_status IS NULL OR status = 'voided')` |
| `voided_at` scope | `CHECK (voided_at IS NULL OR status = 'voided')` |

**Column comments (migration):**

- `status`: terminals include `:disbursed`, `:failed`, `:voided`
- `processed_at`: rail terminals `:disbursed`, `:failed` only; use `voided_at` for `:voided`

### Allowed transitions (schema vocabulary; W5 enforces in managers)

| From | To | W0 |
| --- | --- | --- |
| `queued` | `voided` | Allowed (writer in W5); `voided_from_status = queued` |
| `failed` | `voided` | Allowed (writer in W5); may retain `provider_ref` |
| `processing` | `voided` | **Forbidden** until W5 reversal design |
| `voided` | any | **Forbidden** (no un-void) |

**Indexes:** no new indexes. `(status, available_for_payout_at)` and `(status, processed_at)` already exclude non-queued dispatch.

### Migration file

- `20261005150000_extend_payments_payout_queue_voided_interlock.rb`

## W5 handoff risks (acceptance criteria for refund engine work)

1. **`ProcessingManager`:** lock row and set `:processing` **before** calling rail; today rail runs before lock → orphan settlement if void races.
2. **Refund while `:processing`:** wait for settlement outcome or designed reversal — not silent `:voided`; link **AMB-038**.
3. **Settlement webhooks on `:voided` rows:** handlers return `:ignored` today; W5 must alarm / reconcile (especially when `voided_from_status = failed` and `provider_ref` is set).
4. **Refund fails after void (AMB-006):** retry refund — never un-void payout.
5. **Lock order + ACL:** refund path locks charge (FIN-4) then payout entry(s) by ascending `id`; BKG calls PAY command — no direct queue writes from Booking.
6. **Bundle legs:** two queue rows / two charges — lock order must be fixed to avoid deadlock.
7. **`payments_refunds.provider_ref`:** allow NULL while `:pending` so void + refund row insert commit without holding a lock across the Stripe call (W5 migration).

## Out of scope

- Refund creation managers, row-lock interlock transaction, `ProcessingManager` reorder, Stripe refund webhooks
- `processing → voided` / rail reversal
- Tourist/account/corporate HTTP APIs
- `red-cab-web` changes

## Tasks

### Docs

- [x] This spec (`status: approved`)
- [x] Corpus: invariants LC-13/14/PAY-14, AMB-005, lifecycle-data, payments-architecture, domain-models, booking-state-machine

### API

- [x] Migration per appendix
- [x] `docs/db/payments.dbml` + `docs/db/redcab.dbml`
- [x] `Payments::PayoutQueueEntry` enums
- [x] `bundle exec tapioca dsl`
- [x] `bin/rails db:migrate` (fresh DB per test plan in Ship)

## Acceptance criteria

- [ ] Empty database: migration applies cleanly
- [ ] New columns and CHECKs match DBML and this appendix
- [ ] `enum :status` includes `voided`; `srb tc` passes
- [ ] No managers/validators change payout behavior in W0

## Verification

```bash
# From red-cab-api/
bin/rails db:drop db:create db:migrate
bundle exec tapioca dsl
bundle exec srb tc
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-05 | Brief Gate 1 | Human MCQ batch | Approved for `/pkm-build` |
| 2026-10-05 | Architecture review | Opus | Revise schema — provenance columns + CHECK fixes applied in W0 |
