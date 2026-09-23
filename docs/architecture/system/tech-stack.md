---
title: Technology Stack
sidebar_position: 8
description: Locked technology choices for Red Cab Marketplace.
---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## TL;DR

- **Locked stack:** Rails API modular monolith, React Router v7 SSR (JavaScript), PostgreSQL, email MVP notifications. **The payment provider is not locked** (`AMB-040`).
- Stack choices **realize** the architecture (atomic checkout, single pricing authority, in-process contexts) — they do not redefine boundaries.
- Background jobs, auth methods, SMS, PDF library, and the **entire payment provider selection** remain open under `AMB-###`.

## About this document

Locked technology choices and why each fits the architecture — no versions, packages, config, or folder layout.

| Topic | Document |
| --- | --- |
| Architecture overview | [Architecture Overview](/docs/architecture/system/overview) |
| Bounded contexts | [Bounded Contexts](/docs/architecture/contexts) |
| Domain models | [Domain Models](/docs/architecture/domain/domain-models) |
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Financial rules | [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

---

## How to read this document

- This document **records** decisions already fixed by the authoritative set; it does not make new ones. It introduces no new bounded contexts, no new business rules, and no architecture redesign.
- A choice is marked **Locked** when it is stated as the implementation stack in [../index.md](/docs) and the [Container View](/docs/architecture/system/overview#container-view) of the architecture overview.
- A choice is marked **Locked (category); vendor open** when the architecture commits to a *capability* (e.g. background jobs, email delivery, PDF generation) but the specific product/decision is still governed by an open `AMB-###` in [/docs/product/planning/open-questions](/docs/product/planning/open-questions). This document **does not resolve** those items; it cites them.
- Per [../index.md](/docs) precedence, where this document overlaps Business Rules, Requirements, Domain Models, or higher Architecture docs, **those govern and this conforms**.

---

## Locked stack at a glance

| Layer | Technology | Realizes (container/context) | Status |
| --- | --- | --- | --- |
| Backend | Ruby on Rails (API mode), modular monolith | [Rails API Modular Monolith](/docs/architecture/system/overview#rails-api-modular-monolith) | Locked |
| Frontend | React Router v7 (SSR), JavaScript | [React Router Web Application](/docs/architecture/system/overview#react-router-web-application) | Locked |
| Database | PostgreSQL, single shared database | [PostgreSQL](/docs/architecture/system/overview#postgresql) | Locked |
| Background jobs | Rails-native asynchronous job runtime | [Background Jobs](/docs/architecture/system/overview#background-jobs) | Locked (category); queue backend open |
| Auth / Identity | Session-based web authentication owned by IAM | [IAM context](/docs/architecture/contexts) | Locked (mechanism); methods open (`AMB-021`/`AMB-022`) |
| Payments | Licensed marketplace payment provider (cards + sub-merchant settlement) | [Payments context](/docs/architecture/system/overview#payments--payments--payouts-core) | **Not locked** — vendor, custody mechanics, and release control open (`AMB-040`); integrated via capability-declaring adapter ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation)) |
| Notifications | Email rail (MVP); SMS optional | [Notifications context](/docs/architecture/system/overview#notifications--notifications-supporting-generic-event-driven) | Locked (email MVP); provider/SMS open (`AMB-034`) |
| PDF documents | Server-side PDF generation with embedded Japanese fonts | [Corporate context](/docs/architecture/contexts) | Locked (capability); library open (`AMB-031`) |
| Internationalization | EN/JA, server-rendered language per recipient | cross-cutting (`OPR-9`) | Locked (EN/JA); defaults open (`AMB-024`) |

---

## Backend — Ruby on Rails (API), modular monolith

**Choice.** A single Ruby on Rails application in API mode, structured internally as the locked **6 core + 2 supporting** bounded contexts that integrate in-process (commands/queries synchronously, domain events asynchronously). One deployable owns all domain logic.

**Why it fits the architecture.**
- The architecture is explicitly a **modular monolith over one database** ([Modular Monolith First](/docs/architecture/system/overview#modular-monolith-first)); Rails gives one deployable that hosts all eight contexts as logical modules with guarded public surfaces, with module boundaries — not distribution — enforcing the discipline.
- The single most load-bearing requirement is the **atomic checkout unit** — snapshot freeze + seat reservation + booking creation commit together (`BKG-2`, `CON-1`). A single Rails process over a single relational database makes the one deliberate cross-context shared transaction (Booking↔Catalog seat reserve, **CR-1**) possible without a saga.
- Rails' request/transaction model and in-process event dispatch match the **"invariants that must hold together are synchronous and co-transactional; cross-context reactions are asynchronous"** rule from [./contexts/index](/docs/architecture/contexts).
- It naturally receives **payment-provider events** and **enqueues asynchronous work** as described in the [Container View](/docs/architecture/system/overview#container-view).
- Implementation conventions (Request → Manager → Validator, `app/domains/`, explicit routes, DBML-first schema) are documented in [../engineering/backend-conventions.md](/docs/engineering/conventions/backend).

**Status.** Locked (stated as the implementation backend in [../index.md](/docs) and the architecture overview).

---

## Frontend — React Router v7 (SSR), JavaScript

**Choice.** A single React Router v7 application (framework mode, SSR enabled) in JavaScript (`.js`/`.jsx`, no TypeScript), presenting three role-confined surfaces — **Tourist App**, **Client Portal**, and **Admin Panel** — over an authenticated session, communicating with the Rails API via JSON.

**Why it fits the architecture.**
- The system context defines exactly three role surfaces gated by Role (`FR-IAM-009`, `NFR-SEC-004`); one web app with role-confined routing matches the [React Router Web Application](/docs/architecture/system/overview#react-router-web-application) container.
- The web app **holds no financial truth and never computes price**: it renders the `PriceBreakdown` returned by the single pricing authority (`PRC-1`, `PRC-2`). The client is a faithful consumer of server value contracts (`PriceBreakdown`, `AvailabilitySnapshot`, Commission Snapshot reads) rather than re-deriving them — directly supporting the [Single Pricing Authority](/docs/architecture/system/overview#single-pricing-authority) principle and closing pricing-leakage risk **CR-2** on the client side.
- It must render in the Actor's Language Preference (EN/JA, `OPR-9`); SSR + client hydration fits the cross-cutting i18n concern.
- Implementation conventions (routes, API clients, forms, auth HOCs) are documented in [../engineering/frontend-conventions.md](/docs/engineering/conventions/frontend).

**Status.** Locked.

---

## Database — PostgreSQL (single, shared)

**Choice.** A single PostgreSQL database. Each context owns its own tables and exposes them only through commands, queries, and events — never direct cross-context table access.

**Why it fits the architecture.**
- The **one shared database** is the enabling constraint behind the atomic seat-reservation transaction (**CR-1**, `CON-1`) and keeps the hottest read paths (discovery, pricing) free of cross-context chatter ([PostgreSQL](/docs/architecture/system/overview#postgresql)).
- PostgreSQL's transactional guarantees uphold the inventory invariants — `available_seats` never negative and never above capacity (`INV-3`), last-seat contention resolving to at most zero (`CON-2`, `CON-3`), and per-asset slot non-overlap (`CON-4`).
- It is the **system of record for immutable Booking snapshots** (`INV-1`, `PAY-2`) and for all auditable money facts traceable to exactly one Booking (`FIN-3`, `NFR-AUD-001`).
- Whole-yen money is stored as integer JPY only; no fractional yen anywhere (`PAY-1`, `FIN-8`, `NFR-COMP-002`).
- Indexed Postgres queries inside Catalog are sufficient for Search at expected volume; Search graduates to a dedicated engine only against a documented fitness function, not day one ([Catalog rationale](/docs/architecture/contexts/design-rationales#why-geography-and-search-are-modules-inside-catalog-not-contexts)).

**Status.** Locked.

### Geography storage (no spatial extension)

Geography reference data uses plain PostgreSQL `numeric` columns for `latitude`/`longitude` on Districts and Areas. **PostGIS is not required** at Phase 1 ([ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data)). Near-me Area ranking uses haversine over ~1,750 centroids with an `INV-8` filter. Boundary geometries, if ever needed for map shading, are served from pre-simplified static assets (CDN) — not queried from the database. See [Geography](/docs/architecture/patterns/geography).

---

## Background jobs — Rails-native asynchronous runtime

**Choice.** A Rails-native asynchronous job runtime executes event-driven reactions and scheduled work after a committing transition. The specific queue backend is an implementation detail not fixed at the architecture level.

**Why it fits the architecture.**
- The [Background Jobs](/docs/architecture/system/overview#background-jobs) container exists to run **after-the-fact reactions**: notification dispatch, payout queuing, rating recalculation, listing pause/restore cascades, and time-based alerts (license/trial expiry, overdue registrations/quotations/payments, `OPR-3..5`).
- Reactions must be **idempotent and retriable** so redelivery or retry cannot double-act (`FIN-10`), and a failed reaction must never roll back an already-committed transition — it is retried independently and, for money, surfaces as a reconcilable fact (`FIN-11`). A job runtime with retry semantics is the realization of [Event Driven Notifications](/docs/architecture/system/overview#event-driven-notifications).
- Scheduled/cron-style execution is required for the time-based alerts above and for lifecycle timers (e.g. the auto-confirmation timer, whose *duration* is still open under `AMB-011`).
- The 60-second confirmation SLA (`OPR-8`, `NFR-TIME-001`) is met by dispatching asynchronously, decoupling request latency from external delivery.

**Status.** Locked (asynchronous, idempotent, retriable job runtime as a category). The concrete queue/broker product is an implementation choice below the architecture line and is intentionally not fixed here.

---

## Authentication & Identity

**Choice.** Authentication, accounts, coarse Roles, sessions, and Language Preference are owned by the **Identity & Access (IAM)** supporting context, which exposes a deliberately minimal, stable contract (`principal`, `role`, `language`) to every other context. The web app authenticates over a server-issued session/token (cookie-based JWT).

**Why it fits the architecture.**
- IAM is the **dependency root**: every context consumes its authenticated principal and role ([IAM](/docs/architecture/system/overview#iam--identity--access-supporting-generic)). Keeping the contract minimal limits ripple (**CR-6**).
- Role-confined access to the three surfaces is a security requirement (`FR-IAM-009`, `NFR-SEC-004`); the IAM-issued principal + role is what the web app and API enforce against.
- IAM owns the lockout invariant (`OPR-1`) and password-strength posture (`NFR-SEC-003`) as account-local consistency rules ([domain-models §3.1](/docs/architecture/domain/domain-models)).

**Status.** Locked as the **mechanism and ownership** (session-based web auth, IAM-owned). The **authentication methods** themselves (email/password, Google OAuth, captcha) and **guest access scope** remain open under `AMB-021` and `AMB-022` and are **not resolved here** — the contract is shaped to accept either resolution.

---

## Payments — licensed payment provider (vendor not selected)

**Choice.** A **licensed marketplace payment provider** is the external card-payment and settlement rail for the B2C path, and — via per-transaction virtual accounts — for the Corporate transfer path (`PAY-9`). **The vendor is deliberately not chosen** (`AMB-040`): Stripe Connect, Komoju, and PAY.JP differ materially in whose balance holds funds while held and who controls the release trigger, which is the dimension carrying regulatory weight here.

The provider is the **legal recipient and holder of customer funds**; Red Cab holds none (`INV-13`, `PAY-13`). The platform's **Payments** context initiates collection for the snapshotted gross, records the completion determination (`PAY-16`), instructs settlement release plus a platform fee equal to the snapshotted `commission_amount` (`FIN-12`), and reconciles provider-event settlement back to internal state.

**Why it fits the architecture.**
- The **transaction-platform exemption** requires that Red Cab hold no customer funds while retaining control of transaction completion. Custody at the provider with platform-triggered release satisfies both ([ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation)).
- The business model is commission per booking with a **frozen, auditable revenue split** (`INV-1`, `INV-2`, `PAY-2`). Instructing the platform fee to equal the snapshotted `commission_amount` makes the rail's split match the snapshot exactly, without the rail ever computing it.
- The provider owns card authorization/capture, PCI scope, **fund custody**, sub-merchant KYC, refunds, and **settlement truth via events**; internal Payments state **converges to that external truth** and surfaces divergence rather than losing it (`FIN-11`, `NFR-AVAIL-004`). This realizes the [Money Facts vs Money Movement](/docs/architecture/system/overview#money-facts-vs-money-movement) seam: Booking authors the immutable fact, Payments instructs movement, the provider holds and moves.
- Every external money operation is **idempotent and uniquely keyed** so retries and duplicate events cannot double-charge, double-refund, or double-settle (`FIN-10`, `NFR-AUD-004`).
- Whole-yen JPY only (`PAY-1`); single-currency is the working baseline (`AMB-025`).

**Integration shape.** The provider is engaged only through a **capability-declaring adapter** that declares custody location, merchant-of-record posture, settlement model, capture timing, and clawback capability. Domain code branches on declared capability, never on provider identity, and a startup assertion rejects any adapter declaring platform custody or platform merchant-of-record (`ADR-015` C6). Persisted external references are provider-neutral.

**Status.** **Not locked.** Provider selection (`AMB-040`) and cross-border exemption applicability (`AMB-037`) are P0 and unresolved; clawback (`AMB-038`) and capture timing (`AMB-039`) are P1. `ADR-015` is **Proposed pending counsel**.

---

## Notifications — Email (MVP), SMS optional

**Choice.** An external **email** rail is the MVP notification channel, driven by the **Notifications** supporting context, which renders templates in the recipient's language and dispatches asynchronously. **SMS** is an optional secondary rail, out of MVP scope under the working baseline.

**Why it fits the architecture.**
- Notifications is a **generic outbound adapter** reacting to the full domain-event catalog and scheduled alerts; it makes no domain decisions ([Notifications](/docs/architecture/system/overview#notifications--notifications-supporting-generic-event-driven)). Email carries verification, booking confirmation and lifecycle messages (confirmation/cancellation/refund), completion review links, and time-based alerts.
- Dispatch is **asynchronous and idempotent per (event, recipient, channel)**, decoupling request latency from delivery and protecting the 60-second confirmation SLA (`OPR-8`, `NFR-TIME-001..002`).
- Every message renders in the recipient's stored Language Preference (`OPR-9`, `NFR-I18N-001`) — see i18n below.

**Status.** Locked that **email is the MVP channel**. The **email provider** and whether **SMS is in MVP** (and phone-verification requirements) are open under `AMB-034` and **not resolved here**.

---

## PDF documents — server-side generation with embedded Japanese fonts

**Choice.** Formal corporate documents — the **Quotation (Omitsumorisho)** and **Invoice (Seikyusho)** — are generated server-side as PDFs using an approach that **embeds Japanese fonts so kanji/kana render correctly**, owned by the **Corporate Quotation & Invoicing** context.

**Why it fits the architecture.**
- corporate formal documents must itemize line items and the 10% consumption tax (`PAY-10`, `NFR-COMP-001`) and be **acceptable as formal Japanese commercial documents** (`NFR-COMP-003`). Correct kanji/kana rendering is therefore a hard capability requirement (`NFR-I18N-006`).
- The capability lives where its data lives — the Corporate context owns `Quotation` and `Invoice` ([bounded-contexts §5](/docs/architecture/contexts)) — so PDF generation is a Corporate-internal concern, not a cross-context one.

**Status.** Locked as the **capability** (server-side PDF with embedded JA fonts). The **specific PDF library** is open under `AMB-031` (the register notes the constraint that an approach must avoid rendering kanji as missing glyphs) and is **not resolved here**.

---

## Internationalization — EN / JA

**Choice.** The platform is bilingual **English/Japanese**. Language is a **cross-cutting concern**: each user-facing surface and each notification is produced in the recipient's stored Language Preference, owned at the source by IAM (preference) and the publishing contexts (content).

**Why it fits the architecture.**
- The audience is EN-primary inbound travelers and JA-primary corporate/provider operations; language is cross-cutting (`OPR-9`), not a feature of one screen ([Architectural Drivers](/docs/architecture/system/overview#architectural-drivers)).
- Geography carries EN + JA labels for every District and Area (`NFR-I18N-003`); notifications render in the recipient's preference (`NFR-I18N-001`); the web app renders the active language.
- Language Preference is a value owned by IAM and **snapshotted by Notifications at send time** so dispatch reflects the preference at the moment it matters ([domain-models §3.8](/docs/architecture/domain/domain-models)).

**Status.** Locked as **EN/JA**. The **per-surface defaults** (Tourist app EN, Client Portal JA) and the **supported filter-language set** are open under `AMB-024` and **not resolved here**.

---

## Out of scope for this document

To stay at the architecture level and avoid making new decisions, the following are deliberately **not** fixed here and belong to later implementation or to open `AMB-###` resolution:

- Specific versions, packages/gems, configuration, environment, hosting/CI, and deployment topology.
- The concrete background-job queue/broker product.
- Payment provider selection and its custody/release mechanics (`AMB-040`), cross-border exemption applicability (`AMB-037`), clawback (`AMB-038`), and capture timing (`AMB-039`).
- Authentication methods and guest scope (`AMB-021`, `AMB-022`); SMS provider/scope (`AMB-034`); PDF library (`AMB-031`); language defaults/supported set (`AMB-024`); currency beyond the JPY baseline (`AMB-025`).

> No choice recorded here changes the bounded-context or aggregate boundaries in [./contexts/index](/docs/architecture/contexts) and [/docs/architecture/domain/domain-models](/docs/architecture/domain/domain-models). Each technology realizes an existing container or context; none introduces a new one.
