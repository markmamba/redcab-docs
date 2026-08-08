---
title: Bounded Contexts
sidebar_position: 1
description: Bounded context documentation for Red Cab Marketplace.
---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## TL;DR

- Eight bounded contexts: **six core** (Onboarding, Catalog, Booking, Payments, Corporate, Reviews) and **two supporting** (Identity, Notifications).
- Contexts integrate **in-process** — sync commands/queries or async domain events — with no network boundary between them.
- **Catalog** computes price and owns seat inventory; **Booking** runs checkout and owns snapshots; **Payments** moves money against those facts.
- The only shared transaction is checkout + guarded seat reservation (`CR-1`).

## About this document

Strategic DDD design: ownership boundaries, integration contracts, domain events, and coupling risks.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Money flows | [Payments Architecture](/docs/architecture/payments-architecture) |
| Booking lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |

---

## Strategic overview
Red Cab is a single modular-monolith application (one deployable, one PostgreSQL database). "Bounded context" here is a **logical ownership boundary**: a module with its own ubiquitous language, its own aggregates, and a guarded public surface. Contexts integrate **in-process** — synchronously via published commands/queries, or asynchronously via in-process domain events. There is no network boundary between contexts; the discipline is enforced by module boundaries and contracts, not by distribution.
Baseline (locked after three review rounds: 10 → 5+1 → 6+2):
- **Core (6):** Provider Onboarding & Verification, Catalog & Inventory, Booking & Checkout, Payments & Payouts, Corporate Quotation & Invoicing, Reviews & Ratings.
- **Supporting (2):** Identity & Access, Notifications.
Design principles applied:
- Fold boundaries with no independent domain logic into the context that owns their data (Geography, Search → Catalog).
- Never split across an invariant/transaction boundary (Checkout snapshot + seat reserve stay in one context).
- Split across subdomain **type** (generic supporting vs core): Identity ≠ Onboarding.
- Split across an independent **evolution axis**: Corporate Quotation ≠ Booking.

## Context map
```mermaid
graph TD
  Identity[Identity and Access - supporting] -->|authenticated principal| Onboard[Provider Onboarding and Verification]
  Identity -->|principal + role| Booking[Booking and Checkout]
  Identity -->|principal + role| CORP[Corporate Quotation and Invoicing]
  Onboard -->|provider status, conformist read| Catalog[Catalog and Inventory]
  Catalog -->|"calculate_quote(), availability"| Booking
  Catalog -->|"calculate_quote()"| CORP
  CORP -->|create-booking-from-quote command| Booking
  Booking -->|commission snapshot, reads| Payments[Payments and Payouts]
  CORP -->|bank-transfer reconciliation| Payments
  Booking -->|completion enables review| Reviews[Reviews and Ratings]
  Identity -. events .-> Notif[Notifications - supporting]
  Onboard -. events .-> Notif
  Catalog -. events .-> Notif
  Booking -. events .-> Notif
  Payments -. events .-> Notif
  CORP -. events .-> Notif
  Reviews -. events .-> Notif
```

Relationship types (DDD strategic patterns):

```mermaid
graph LR
  subgraph legend [Relationship legend]
    direction LR
    U[Upstream] -->|"Customer/Supplier or Conformist (C) or ACL"| D[Downstream]
  end
  Identity2[Identity] -->|"Supplier (shared principal)"| Booking2[Booking]
  Onboard2[Onboarding] -->|"Conformist read (status)"| Catalog2[Catalog]
  Catalog2 -->|"Customer/Supplier (Pricing + Availability)"| Booking2
  Booking2 -->|"Customer/Supplier (snapshot)"| Payments2[Payments]
  CORP2[Corporate] -->|"ACL into Booking command"| Booking2
  Booking2 -->|"Published event"| Reviews2[Reviews]
  AllCore[All core] -->|"Published events"| Notif2[Notifications]
```

## Interaction styles (sync vs async) — at a glance
- **Synchronous (in-process command/query, caller awaits result):** Identity principal resolution; `Catalog.calculate_quote()`; Catalog availability check + the guarded seat-reserve command invoked by Booking inside one transaction; Corporate → Booking "create booking from accepted quote"; Payments reading a Booking's Commission Snapshot.
- **Asynchronous (in-process domain events, fire-and-react, idempotent):** everything Notifications consumes; cross-context cascades (license expiry → pause listings; district deactivation → unlist; completion → enable review; completion → queue payout).
Rule of thumb: **state-changing invariants that must hold together are synchronous and co-transactional; cross-context reactions and notifications are asynchronous.**

## Core contexts

See individual context pages:

- [Onboarding](/docs/architecture/bounded-contexts/onboarding)
- [Catalog](/docs/architecture/bounded-contexts/catalog)
- [Booking](/docs/architecture/bounded-contexts/booking)
- [Payments](/docs/architecture/bounded-contexts/payments)
- [Corporate](/docs/architecture/bounded-contexts/corporate)
- [Reviews](/docs/architecture/bounded-contexts/reviews)

## Supporting contexts

- [Identity](/docs/architecture/bounded-contexts/identity)
- [Notifications](/docs/architecture/bounded-contexts/notifications)

## Reference

- [Domain Events](/docs/architecture/bounded-contexts/domain-events)
- [Design Rationales](/docs/architecture/bounded-contexts/design-rationales)
- [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks)
