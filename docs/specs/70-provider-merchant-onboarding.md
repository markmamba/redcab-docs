---
title: "70 — Provider merchant onboarding via payment adapter"
issue: "https://github.com/markmamba/red-cab-api/issues/70"
repos:
  - red-cab-api
status: approved
phase: 1
context: PAY
---

## TL;DR

- Ships provider-scoped merchant onboarding create endpoint backed by the payment adapter port (`initiate_merchant_onboarding`) and persists `payments_provider_merchant_accounts` before event sync.
- Does **not** ship Stripe adapter, web UI, API reconciliation (`last_synced_at`), or checkout `initiate_payment`.
- Breaking change: No

## Problem

Listing publish requires a verified Provider Merchant Account (`INV-12`, `LC-12`). Infrastructure exists (~60–70%): adapter port, `FakeProvider`, `payments_provider_merchant_accounts` table, `MerchantAccountUpdatedManager`, and `PayoutCapabilityReads::FetchService` wired to the Catalog publish gate. **No production code creates merchant account rows today** — only test fixtures. `MerchantAccountUpdatedManager` raises if no row exists for `(payment_provider, provider_ref)`, so onboarding must persist `provider_ref` at create time.

Evidence: `app/domains/payments/provider_events/handlers/merchant_account_updated_manager.rb:100-102`, `app/domains/catalog/listings/providers_publish_validator.rb:88-101`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-PAY-015 | [requirements/functional-requirements/pay.md](../requirements/functional-requirements/pay.md) | Money state advances on verified provider events only |
| ADR-015 C6 | [architecture/decisions/adr-015-payment-custody-and-control-separation.md](../architecture/decisions/adr-015-payment-custody-and-control-separation.md) | Adapter-only integration; no provider identity branching |
| INV-12 | [business-rules/invariants.md](../business-rules/invariants.md) | Publish gate requires verified merchant account |
| INV-13 | [business-rules/invariants.md](../business-rules/invariants.md) | No platform custody |
| PAY bounded context | [architecture/bounded-contexts/payments.md](../architecture/bounded-contexts/payments.md) | `payout_capability` sync read contract |
| DBML | `red-cab-api/docs/db/payments.dbml` | Table semantics, re-onboarding, no `:not_started` status |
| Backend conventions | [engineering/backend-conventions.md](../engineering/backend-conventions.md) | Request → Manager → Validator pattern |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Create via adapter port only | Direct Stripe Connect Account Link API | Superseded per issue + ADR-015 C6 |
| 2 | Sync via existing event handler | Add API reconciliation manager using `last_synced_at` | Issue AC; reconciliation deferred |
| 3 | Status via `PayoutCapabilityReads::FetchService` | Dedicated onboarding table/serializer exposing model | DBML cross-context contract; Catalog already conforms |
| 4 | Branch on `handoff.kind` | New `CapabilityDescriptor` onboarding flag | `HANDOFF_KINDS` already normalized |
| 5 | `provider_reference` = provider profile `uuid` | Integer `provider_id` | Stable opaque identity for adapter |
| 6 | Server idempotency key `"merchant_onboarding:#{provider_id}"` | Client-supplied key | Simpler provider API; adapter store dedupes |
| 7 | Auth: `require_approved_provider_profile!` | Any provider profile | Matches listings create; INV-12 gate is about payouts not registration |
| 8 | No migration | Add idempotency column | Table sufficient for Phase 1 |

> **Human verification (2026-09-12):** Q1=A POST only; Q2=A 409 when verified; Q3=A re-call adapter + overwrite ref when onboarding; Q4=A neutral publish error copy.

## API contract

### POST `/providers/payments/merchant_accounts`

| | |
| --- | --- |
| **Auth** | JWT + approved provider profile (`Providers::BaseController`) |
| **Request body** | `{ "return_url": "https://...", "refresh_url": "https://..." }` — both required, valid URLs |
| **Response 201** | `{ "merchant_onboarding_handoff": { "kind": "redirect", "url": "...", "provider_ref": "...", "expires_at": "..." } }` |
| **Errors** | 401 unauthenticated or unapproved profile (per existing provider actor gate); 422 validation; 409 if status is `verified` (re-onboard rejected) |

**Manager flow:**

1. Validate request + approved provider profile.
2. If existing row status is `verified` → 409. If `onboarding` → proceed (overwrite `provider_ref`). If `restricted`/`disabled` → proceed (re-onboard per DBML).
3. Call `Payments::Adapters::Resolver.current.initiate_merchant_onboarding(provider_reference:, return_url:, refresh_url:, idempotency_key:)`.
4. Upsert `payments_provider_merchant_accounts` with `payment_provider` from resolver, `provider_ref` from handoff, `status: onboarding`, `onboarding_started_at: now`.
5. Return handoff via serializer.

### Files to create or modify (API)

- `config/routes/providers_routes.rb`
- `app/controllers/providers/payments/merchant_accounts_controller.rb`
- `app/domains/payments/provider_merchant_accounts/providers_create_request.rb`
- `app/domains/payments/provider_merchant_accounts/providers_create_validator.rb`
- `app/domains/payments/provider_merchant_accounts/providers_create_manager.rb`
- `app/domains/payments/serializers/providers_merchant_onboarding_handoff_serializer.rb`
- `app/domains/catalog/listings/providers_publish_validator.rb` (neutral error copy)

## Data / domain touchpoints

- **Bounded context:** PAY (create); CAT (publish gate read — existing)
- **Transaction boundary:** Single DB transaction: adapter call (external) then row upsert. Adapter call is outside DB transaction if it has side effects — prefer: call adapter first, then persist in transaction (handler needs row before events arrive).
- **Snapshots:** None — merchant account is rail truth, not a booking snapshot.
- **Critical invariant:** Row with `provider_ref` must exist before `merchant_account_updated` events apply.

## Out of scope

- Stripe/production rail adapter
- `red-cab-web` onboarding UI
- API reconciliation (`last_synced_at`)
- `initiate_payment` / checkout flows
- New migrations

## Tasks

### API

- [ ] Add routes under `providers/payments/`
- [ ] Implement create request / validator / manager / serializer
- [ ] Neutralize publish error copy (`'Set up payouts before publishing.'`)
- [ ] Unit + controller + integration tests (FakeProvider)

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Approved provider receives `merchant_onboarding_handoff` from adapter (not direct Stripe)
- [ ] `provider_ref` persisted before event sync can succeed
- [ ] `payout_capability(provider_id)` reflects event-derived status
- [ ] Publish blocked when not verified (`INV-12`)
- [ ] Provider endpoints enforce approved profile
- [ ] Domain branches on `handoff.kind`, not provider identity
- [ ] Integration test: `test/integration/providers/payments/merchant_onboarding_integration_test.rb`

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/integration/providers/payments/
bin/rails test test/domains/payments/provider_merchant_accounts/
bin/rails test test/controllers/providers/payments/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-12 | PKM plan agent | human MCQ verification | approved |
