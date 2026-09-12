---
title: "71 — Payment attempt and handoff at checkout"
issue: "https://github.com/markmamba/red-cab-api/issues/71"
repos:
  - red-cab-api
status: approved
phase: 1
context: PAY
---

## TL;DR

- Ships tourist payment initiation: pending `Payments::Charge` + `payment_handoff` for a payable `CheckoutSession`, with PAY-17 and merchant gates.
- Wires verified `payment_failed` to idempotent seat release (`CON-5`); success path unchanged.
- Does **not** ship Stripe adapter, web checkout UI, session expiry job, or `embedded` handoff from `FakeProvider`.
- Breaking change: No

## Problem

Checkout session creation freezes snapshots and reserves seats, but **no production endpoint initiates payment**. Tests manually call `FakeProvider#initiate_payment` and `create_pending_charge_for`. `PaymentFailedManager` marks charges failed without releasing seat holds. PAY-17 initiation gate is documented in `integration_seams.rb` but not enforced.

Evidence: `app/domains/payments/provider_events/handlers/payment_failed_manager.rb`, `test/integration/shared/payments/provider_events_ingest_integration_test.rb` (manual charge setup), `app/domains/bookings/terms_of_use/integration_seams.rb`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-BKG-005 | [requirements/functional-requirements/bkg.md](../requirements/functional-requirements/bkg.md) | Failed payment yields no booking |
| FR-PAY-012 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Terms required before payment |
| FR-PAY-015 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Money state from verified provider events only |
| PAY-5, CON-5 | [architecture/booking-state-machine.md](../architecture/booking-state-machine.md) | Failure releases seats; idempotent restore |
| FIN-10 | [domain/domain-models.md](../domain/domain-models.md) | Idempotent webhook redelivery |
| ADR-015 C6 | [architecture/decisions/adr-015-payment-custody-and-control-separation.md](../architecture/decisions/adr-015-payment-custody-and-control-separation.md) | Adapter-only integration |
| INV-1 | [business-rules/invariants.md](../business-rules/invariants.md) | No client-authored price |
| INV-12 | [business-rules/invariants.md](../business-rules/invariants.md) | Verified merchant for payouts |
| DBML | `red-cab-api/docs/db/payments.dbml` | Charge retry / partial unique semantics |
| Spec #70 | [specs/70-provider-merchant-onboarding.md](./70-provider-merchant-onboarding.md) | Manager + handoff serializer pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `Payments::Charge` is the payment attempt | New `payment_attempts` table | DBML + existing model |
| 2 | Amount from session snapshots only | Client-supplied `amount_jpy` | INV-1 / pricing authority |
| 3 | Immediate seat release on `payment_failed` | Wait for session expiry only | `booking-state-machine.md` step 5; issue AC |
| 4 | `ReleaseForPaymentFailedManager` in BKG | Inline logic in PAY handler | Mirrors success path; idempotent `CON-5` |
| 5 | Write `payment_intent_reference` at initiation | Charge-only linkage | DBML mirror to `provider_ref` |
| 6 | Server idempotency key `payment:#{checkout_session.uuid}` | Client-supplied key | Matches #70 pattern |
| 7 | Serializer branches on `handoff.kind` | Provider-specific response | `HANDOFF_KINDS` normalized |
| 8 | `embedded` kind deferred | Stub in FakeProvider | Only `redirect` ships in #71 |
| 9 | No migration | Add columns | Infrastructure already landed |
| 10 | Session `expired` on payment failure | Keep `pending` | Q1=A; retry via new checkout session |
| 11 | Pending duplicate → idempotent 200 | 409 on pending | Q2=A |
| 12 | Nested `payment_attempts` route | Flat `/tourists/payments/charges` | Q3=A |
| 13 | Merchant `verified` gate at initiation | Publish gate only | Q4=A |

> **Human verification (2026-09-12):** Q1=A expired on failure; Q2=A idempotent pending; Q3=A nested route; Q4=A verified merchant gate.

## API contract

### POST `/tourists/bookings/checkout_sessions/:checkout_session_id/payment_attempts`

| | |
| --- | --- |
| **Auth** | JWT + tourist profile (`Tourists::BaseController`) |
| **Request body** | `{ "return_url": "https://..." }` — required, valid URL; **no amount fields** |
| **Response 201** | `{ "payment_handoff": { "kind": "redirect", "url": "...", "provider_ref": "...", "expires_at": "..." } }` |
| **Errors** | 401 unauthenticated / no tourist profile; 404 session not found or not owned; 422 validation (terms, seat hold, merchant not verified, session not pending); 409 if succeeded charge exists; 200 idempotent if pending charge exists for session |

**Manager flow:**

1. Load `CheckoutSession` scoped to `CurrentRequest.tourist_profile`; must be `pending` with active seat hold.
2. Enforce `checkout_session.terms_of_use_accepted?` → 422 if false (PAY-17).
3. Enforce provider merchant account `verified` → 422 if not.
4. Reject if succeeded charge exists → 409.
5. If pending charge exists for session → return existing handoff (200, idempotent).
6. Read `gross_amount_jpy`, `commission_amount_jpy`, `currency` from session — **never from request**.
7. Call `Payments::Adapters::Resolver.current.initiate_payment` with `payment_reference: session.uuid`, `merchant_reference: provider_profile.uuid`, server `idempotency_key`.
8. In one transaction: create pending `Payments::Charge`; set `checkout_session.payment_intent_reference = handoff.provider_ref`.
9. Return handoff via `TouristsPaymentHandoffSerializer`.

**PaymentFailedManager addition:**

After charge transitions to `:failed`, call `Bookings::SeatAllocations::ReleaseForPaymentFailedManager.execute(checkout_session:)` — idempotent seat restore with `release_reason: payment_failed`; set `checkout_session.status` to `expired`.

### Files to create or modify (API)

- `config/routes/tourists_routes.rb`
- `app/controllers/tourists/bookings/checkout_sessions/payment_attempts_controller.rb`
- `app/domains/payments/charges/tourists_create_request.rb`
- `app/domains/payments/charges/tourists_create_validator.rb`
- `app/domains/payments/charges/tourists_create_manager.rb`
- `app/domains/payments/serializers/tourists_payment_handoff_serializer.rb`
- `app/domains/bookings/seat_allocations/release_for_payment_failed_manager.rb`
- `app/domains/payments/provider_events/handlers/payment_failed_manager.rb`
- `app/domains/bookings/terms_of_use/integration_seams.rb`

## Data / domain touchpoints

- **Bounded contexts:** PAY (charge create, failed handler); BKG (seat release, session `payment_intent_reference`)
- **Transaction boundary:** Adapter call external; DB transaction wraps charge insert + `payment_intent_reference` update
- **Snapshots:** Read-only from session; charge `amount_jpy` must equal `gross_amount_jpy`
- **Critical invariant:** No booking without verified success; failed payment releases seats idempotently

## Out of scope

- Stripe / production PSP adapter
- `red-cab-web` payment UI
- Checkout session expiry sweep
- Provider event ingestion PAY-17 (#115)
- `embedded` handoff from `FakeProvider`
- New migrations

## Tasks

### API

- [ ] Add tourist payment attempt route
- [ ] Implement tourists create charge request / validator / manager / serializer / controller
- [ ] Implement `ReleaseForPaymentFailedManager`
- [ ] Extend `PaymentFailedManager` to release seats
- [ ] Remove PAY-17 initiation seam comment once enforced
- [ ] Unit + controller + integration tests

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Tourist can initiate payment for own pending checkout session with frozen snapshots and seat hold
- [ ] Charge amount equals snapshotted gross; mismatch rejected before adapter
- [ ] Response includes `payment_handoff` with `kind` for client branching
- [ ] Verified success materializes booking (existing path)
- [ ] Verified failure releases seats; no booking (`PAY-5`, `CON-5`)
- [ ] PAY-17 enforced at initiation
- [ ] Idempotent webhook redelivery (`FIN-10`)
- [ ] Integration test: `test/integration/tourists/bookings/payment_attempt_integration_test.rb`

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/integration/tourists/bookings/
bin/rails test test/domains/payments/charges/
bin/rails test test/domains/payments/provider_events/handlers/payment_failed_manager_test.rb
bin/rails test test/integration/shared/payments/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-12 | PKM plan agent | human MCQ verification | passed — awaiting explicit approve |
