---
title: Open Ambiguities (Data Model)
sidebar_position: 9
description: Open questions that affect value-object shape and contracts — not aggregate or context boundaries.
---

## TL;DR

- Listed `AMB-*` items may change **shape** or **contracts** within an owning context.
- They do **not** move aggregate or bounded-context boundaries.
- Resolutions flow through [Open questions](/docs/70-79-business/planning/open-questions) Decision Log, then back into domain docs.

## About this document

Data-model view of open ambiguities. The register of record is [Open questions](/docs/70-79-business/planning/open-questions).

| Topic | Document |
| --- | --- |
| Bounded contexts | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |

---

## Ambiguities affecting the model

The model accommodates either resolution. It does not silently assume one outcome.

| Ambiguity | Effect on the conceptual model | Affected concepts |
| --- | --- | --- |
| `AMB-006` — refund-failure handling | Whether a refund-failed or refund-pending fact is represented | Refund (PAY) |
| `AMB-009` — commission base | Commission on gross incl. mandatory Extra Charges; affects Commission Snapshot values | Commission Snapshot (BKG) |
| `AMB-010` — snapshot scope | All three snapshots at CheckoutSession creation | CheckoutSession / Booking snapshots (BKG) |
| `AMB-013` / `AMB-014` — lifecycle completeness and initiator | Extra transitions and **CancellationContext** so refund rule is derivable | Booking State, CancellationContext (BKG) |
| `AMB-021` / `AMB-022` — auth methods / guest scope | Credentials and OAuth on Account; gating only | Account (IAM) |
| `AMB-024` — language defaults / supported languages | Supported-language set and per-surface defaults | LanguagePreference (IAM), Listing/Search (CAT) |
| `AMB-025` — currency | Whether Money stays single-currency JPY (baseline) | Money (cross-cutting) |
| `AMB-026` — provider mid-flight status change | Suspension or expiry vs confirmed Bookings; no historical mutation | Provider (PRV), Booking (BKG) |
| `AMB-027` / `AMB-028` — corporate pre-payment / seat-hold timing | Distinct pre-payment state and hold timing behind ACL | Quotation (COR), AvailabilitySlot (CAT), Booking (BKG) |
| `AMB-040` — provider custody and release (P0) | Balance holder and release trigger; external reference shape | Charge, PayoutQueueEntry, ProviderMerchantAccount, Refund (PAY) |
| `AMB-037` — cross-border exemption (P0) | Payer jurisdiction capture per transaction | Charge, CheckoutSession (PAY, BKG) |
| `AMB-038` — clawback mechanism | Post-settlement recovery from Provider | RefundRecord, PayoutQueueEntry (PAY) |
| `AMB-039` — capture timing | Authorization-then-capture lifecycle states | Charge (PAY) |
| `AMB-031` / `AMB-033` — PDF rendering / consumption tax | Formal documents and tax on corporate artifacts | Quotation, Invoice (COR) |

None of the items above changes aggregates or context boundaries defined in [Bounded contexts](/docs/30-49-domains/bounded-contexts) and [Domain models](/docs/30-49-domains/domain-models/domain-models).

Each item resolves **within** one owning context. That is why this conceptual model can be reviewed before those resolutions close.
