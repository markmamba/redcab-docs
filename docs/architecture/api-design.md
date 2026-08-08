---
title: API Design
sidebar_position: 6
description: API contracts, ownership boundaries, and interaction patterns.
---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## TL;DR

- The API is the **outer contract** of the modular monolith: web app + webhooks cross a network boundary; contexts integrate in-process via commands, queries, and events.
- Each capability is owned by **exactly one** context; price crosses boundaries only as `PriceBreakdown`; snapshots are never writable via the API.
- Role-confined surfaces (Tourist, Corporate, Provider, Admin) consume context-owned capabilities — no client computes price.
- External operations and event consumers must be **idempotent**; async reactions are eventually consistent.

## About this document

API as contracts, ownership boundaries, and interaction patterns — not endpoints, controllers, or payloads.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Financial rules (`FIN-`) | [Payments Architecture](/docs/architecture/payments-architecture) |
| Context map | [Bounded Contexts](/docs/architecture/bounded-contexts) |
| Aggregates | [Domain Models](/docs/domain/domain-models) |
| Lifecycle | [Booking State Machine](/docs/architecture/booking-state-machine) |
| Top-level shape | [Architecture Overview](/docs/architecture/overview) |
| Requirements | [Requirements](/docs/requirements) |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |

---

## Purpose

The API is the **outer contract of the modular monolith** — the single guarded surface through which external Actors and external rails interact with Red Cab's domain logic. Internally the system is one Rails deployable partitioned into the locked 6 core + 2 supporting bounded contexts that integrate **in-process** ([./overview.md](/docs/architecture/overview), [./bounded-contexts.md](/docs/architecture/bounded-contexts)). The API is therefore two things at once, and this document keeps them distinct:

- The **external API**: the boundary the React web app and external systems (Stripe webhooks, email/SMS rails) cross to reach the platform. This is a network boundary.
- The **internal context contracts**: the commands, queries, and domain events through which contexts cooperate. These are **not** network APIs — there is no network boundary between contexts ([Modular Monolith First](/docs/architecture/overview#modular-monolith-first)) — but they are real contracts with the same discipline: a context is reached only through its published surface, never by reaching into its tables.

The API exists to deliver the platform's observable behavior ([../requirements/functional-requirements.md](/docs/requirements/functional-requirements)) **while protecting the small set of high-value invariants** the architecture is built around: frozen revenue splits (`INV-1`, `INV-2`), never-overbooked inventory (`INV-3`, `CON-1..3`), verified-only participation and reviews (`INV-5`, `INV-6`, `INV-7`), and a strict booking lifecycle (`LC-1..6`). Where those invariants meet the boundary, the API is shaped to uphold them rather than expose a way around them.

This document is **subordinate** to the documents above: where it appears to overlap an invariant, a lifecycle rule, the pricing authority, or a context/aggregate boundary, those documents govern and this one conforms (mirroring the precedence rule in [../requirements/README.md](/docs/requirements) §9). It contains no decisions of its own; where the contract shape depends on an open decision, the choice is deferred to the relevant `AMB-###` (see [Open API Decisions](#open-api-decisions)).

---

## API Principles

The load-bearing principles every API contract must uphold. Each maps to a named rule or an established architecture principle and is stated as a constraint on contracts and boundaries, not on implementation.

## API follows bounded-context ownership
Every capability is exposed by **exactly one** owning context — the context that owns the underlying aggregate and its source-of-truth concepts ([../domain/domain-models.md](/docs/domain/domain-models) §3). A capability is offered through that context's guarded surface (its commands, queries, and events) and never by another context reaching across the boundary. No capability is owned by two contexts; cross-context effects are expressed through the published contracts in [Cross-Context API Boundaries](#cross-context-api-boundaries), not by shared ownership. This mirrors the requirement-ownership rule ([../requirements/README.md](/docs/requirements) §6): one owner per concept, lateral links for everything else.

## Commands vs Queries separation
The contract surface separates **state-changing intent** (commands) from **side-effect-free reads** (queries). A command requests a guarded state transition that the owning context validates against its invariants and lifecycle rules before applying; a query returns a view of owned state or a computed value contract and never mutates. This separation is what lets the lifecycle and concurrency guarantees hold: a Booking transition (`LC-1..6`), a guarded seat reservation (`CON-1`), or a commission-rate change (`PAY-2`) is a command the owning context fully governs, while discovery, pricing display, and the Admin Payments Overview are queries that observe without perturbing state.

## Single Pricing Authority
Price crosses the API only as a **computed value contract** (the `PriceBreakdown`), produced in exactly one place — `Catalog.calculate_quote(...)` (`PRC-1`, `PRC-2`). No other context, no consumer surface, and no client ever recomputes or re-derives price; they request it and display it ([Single Pricing Authority](/docs/architecture/overview#single-pricing-authority)). This closes the pricing-leakage coupling risk (CR-2) at the contract level: there is no API by which a caller could submit its own price, because price is never an input the buyer or a downstream context authors.

## Snapshot Integrity
Facts whose meaning must not change after checkout — the Price Snapshot, Commission Snapshot, and Cancellation Policy Snapshot — are **owned by the Booking once captured** (`INV-1`, `PAY-2`, `PAY-4`, `BKG-8`). The API exposes **no capability to edit a snapshot**. Downstream contexts read snapshots through published contracts and never receive a write path to them; corrections are modeled as *new* facts (a refund is a new movement, not an edit of a charge — [Snapshot Pattern](/docs/architecture/overview#snapshot-pattern)). The immutability surface itself (which facts are snapshotted and at which instant) is governed by the financial docs and remains open in part (`AMB-007`, `AMB-010`).

## Role-Based Access
Every contract is reachable only by Actors whose Role permits it ([../domain/domain-models.md](/docs/domain/domain-models) §3.1; `FR-IAM-009`, `NFR-SEC-004`). Authorization is evaluated against the IAM-issued principal and Role on every command and query; the consumer surface a request arrives on does not by itself grant authority. Role boundaries are detailed in [API Security Model](#api-security-model).

## Idempotency
Externally triggered operations that can be retried or redelivered — money operations and event reactions especially — are **idempotent and uniquely keyed** so a retry or duplicate signal cannot double-apply (`FIN-10`, [../domain/domain-models.md](/docs/domain/domain-models) §5). This is a contract obligation, not only an implementation detail: a webhook ingestion, a payout queuing, a notification dispatch, a seat restoration, and a creation command must each be safe to receive more than once (`AMB-012` for seat-restoration edge cases). Duplicate delivery yields the same outcome, never a second charge, refund, payout, booking, or notification.

## Eventual Consistency for asynchronous reactions
State-changing invariants that must hold together are synchronous and co-transactional; **cross-context reactions and notifications are asynchronous** and only eventually consistent ([./bounded-contexts.md](/docs/architecture/bounded-contexts), [../domain/domain-models.md](/docs/domain/domain-models) §5). The contract consequence is that an asynchronous reaction (payout queuing, rating recalculation, listing pause/restore, notification) is **not** part of the synchronous response to the command that triggered it; consumers observe these effects after the fact, must tolerate delay and reordering, and a failed reaction never rolls back the committed transition that emitted it (`FIN-11`).

## Backward Compatibility expectations
Because contexts integrate through published contracts, **a contract is a commitment**: the value contracts that cross boundaries (`PriceBreakdown`, `AvailabilitySnapshot`, the Provider Status read, the Commission Snapshot, the completion fact, recipient language) and the external SPA surface are expected to evolve **additively and non-breakingly**, so a change in one context does not ripple into its consumers (the Identity-as-universal-upstream risk CR-6, and the pricing/snapshot contracts). Breaking change is the exception, handled under [Versioning Strategy](#versioning-strategy); the default expectation is that existing consumers keep working.

---

## Consumer Surfaces

The external API serves a single React Router web application presenting **role-confined surfaces** over an authenticated session ([React Router Web Application](/docs/architecture/overview#react-router-web-application)). Each surface is a consumer of the API, gated by Role (`FR-IAM-009`, `NFR-SEC-004`) and rendered in the Actor's Language Preference (`OPR-9`). No surface holds financial truth or computes price; each consumes the contracts the owning contexts expose. Actor namespaces and route structure are defined in [../engineering/domain-to-code-mapping.md](/docs/engineering/domain-to-code-mapping).

## Tourist App
The B2C consumer surface for the **Tourist** Role. It consumes Catalog discovery and pricing queries (location hierarchy, listings, the `PriceBreakdown`, availability), CheckoutSession creation and payment, Booking lifecycle commands/queries, Payments outcomes as they pertain to the buyer (charge result, refund status), and Reviews submission for completed bookings. It is the surface across which a Tourist browses, initiates checkout (Fulfillment Payload capture), pays, manages bookings, and reviews. Booking initiation requires an authenticated Tourist or Corporate principal regardless of how much browsing is open to Visitors (`AMB-022`); the default surface language is EN (`OPR-9`, default open under `AMB-024`).

## Corporate Client Portal
The B2B buyer surface for the **Corporate** Role. It consumes B2B capabilities — submitting Quotation Requests, viewing issued formal documents (Omitsumorisho/Seikyusho), accepting/rejecting a Quotation, and submitting Passenger Manifests — plus Catalog discovery for context. The Corporate path enters Booking **only** through an accepted Quotation, across the anti-corruption boundary (B2B → Booking); it does not expose the instant card-checkout contract used by the Tourist App. Payment is by bank transfer confirmed by Admin, not a buyer-driven charge (`PAY-9`). The default surface language is JA (`OPR-9`, default open under `AMB-024`).

## Provider Portal
The supply-side surface for the **Provider** Role. It consumes Provider Verification capabilities (registration by type, document upload, submit-for-review, observing Provider Status and trial/license state) and Catalog capabilities (asset registration, listing authoring, pricing-policy configuration, availability/slot management, publish/pause — publish requires verified Stripe Connected Account, `INV-12`), plus the Provider-facing views of Booking (incoming bookings, **Mark Delivered**, viewing manifests on confirmed group bookings) and Reviews (provider responses). What a Provider may do is gated by Provider Status and license validity (`INV-6`, `INV-7`, `LC-7..9`): contracts that author or publish listings are unavailable to a non-`Approved` or expired-license Provider. Payout settlement uses Separate Charges & Transfers to the Provider's Connected Account after booking completion (Decision Log `AMB-002`, `AMB-003`). The Provider Portal is delivered as part of the Client Portal surface family in the container view; its capability set is distinct from the Corporate Client's.

## Admin Panel
The internal operations surface for **Platform Admin**, authenticated via a **separate Admin principal** (`Identities::Admin` / `admin_users`) — not a marketplace `Account.role`. It consumes Provider Verification (verification checklist, approve/reject/suspend), Catalog (geography management, district deactivation), Payments (set Commission Rate, the Payments Overview, record bank-transfer receipt), B2B (issue quotations/invoices), and Reviews (moderation) capabilities. Admin crosses the **same** API boundary as external Actors; its breadth comes from Admin-principal authorization scoped across contexts, not from a privileged bypass of the boundary.

---

## Context-Owned API Capabilities

Each context exposes a guarded set of **business capabilities** — commands, queries, and published events — owned solely by it. The following describes *what each context is responsible for offering and the contracts it owns*, not URLs, routes, or payloads. Ownership and event names are authoritative in [./bounded-contexts.md](/docs/architecture/bounded-contexts) and [../domain/domain-models.md](/docs/domain/domain-models).

## IAM
The dependency-root supporting context. **Owns** the authenticated marketplace **Account** (Tourist/Corporate/Provider Roles), the separate **Admin** principal, and Language Preference, exposing a deliberately minimal contract consumed by every other context (CR-6). Marketplace capabilities: account registration and authentication, session/principal resolution, Role checking, Language Preference capture/read. Admin capabilities: Admin authentication and session resolution for `/team`. It publishes `AccountRegistered`, `AccountLocked`, and `LanguagePreferenceChanged`. It is the single authority that answers "who is acting"; marketplace Role is `Tourist | Corporate | Provider` only — Admin is a distinct principal. Authentication methods and guest scope are open (`AMB-021`, `AMB-022`).

## Provider Verification
**Owns** Provider Status, Provider Type, license validity, and the support-trial window. Capabilities: provider registration by type and document upload, submit-for-review, and the Admin verification/approval/rejection/suspension transitions (approval as one transaction with trial start, `LC-9`). It exposes a small **Provider Status read contract** `{ provider_id, status, license_valid_until }` that Catalog conforms to (conformist read) and never replicates. It publishes the status/license/trial events (`ProviderApproved`, `LicenseExpired`, etc.) that drive Catalog cascades and Notifications. It never owns listings; it owns the *right to operate* that gates them (`INV-6`, `INV-7`, `LC-7..9`).

## Catalog
**Owns** geography (District/Area), listings, pricing configuration, and availability/seat inventory. Capabilities split across its query surface and two especially load-bearing contracts:
- **Discovery and search queries** over published listings (location hierarchy, listing lists/detail, filters/sorts), exposing only what `INV-8` and `LC-10` permit to be visible.
- **`calculate_quote(...)` → `PriceBreakdown`**: the single pricing authority (`PRC-1`), the only capability in the system that computes price.
- **Availability queries** and the **guarded seat-reservation command** invoked co-transactionally by Booking (CR-1) — Catalog owns `available_seats`; the decrement is reachable only through this guarded command, never raw table access.
- **Listing/pricing/availability authoring commands** for Approved Providers (create/configure/publish/pause), gated by the Provider Status read.

It publishes `ListingPublished/Paused/Unlisted`, `SlotCapacityChanged`, and consumes license and district-deactivation cascades and Reviews' `RatingRecalculated` (for display). Consumers must never recompute price or reach the seat counter except through these contracts (CR-1, CR-2).

## Booking
**Owns** Booking existence and lifecycle state and the immutable money facts (Price/Commission/Cancellation snapshots), plus Passenger Manifest and the Bundle link. Capabilities: the **checkout command** (the critical atomic unit — snapshot freeze + seat reservation + booking creation commit together or not at all, `BKG-2`, `CON-1`), the **lifecycle transition commands** governed by [./booking-state-machine.md](/docs/architecture/booking-state-machine) (`LC-1..6`), the **`create_booking_from_quote`** command consumed by B2B across an ACL, and manifest submission on confirmed group bookings (`BKG-6`). It publishes `BookingCreated/Confirmed/Cancelled/Completed/Refunded`, the **Commission Snapshot** contract that Payments consumes, and the minimal **completion fact** `{ booking_id, tourist_id, listing_id, completed_at }` that Reviews consumes. It exposes **no contract to mutate a snapshot**. Capture model, snapshot instant, auto-confirm timing, and missing lifecycle paths are open (`AMB-001`, `AMB-007`, `AMB-011`, `AMB-013`, `AMB-014`).

## Payments
**Owns** money movement and the Commission Rate setting. Capabilities: charge/refund/payout initiation against external rails, the **commission-rate read** consumed by Booking at checkout to populate its snapshot, the **Commission Rate setting command** for Admin (`PAY-2`), webhook reconciliation, and the **Payments Overview query** for Admin (`FIN-3`). It consumes the Booking Commission Snapshot **read-only and never authors or mutates it** ([Money Facts vs Money Movement](/docs/architecture/overview#money-facts-vs-money-movement)). It publishes `PaymentSucceeded/Failed`, `RefundCompleted`, `PayoutQueued`, payout disbursement/failure facts (pending `AMB-005`), and `BankTransferConfirmed`. All money operations are idempotent and uniquely keyed (`FIN-10`) and converge to external-rail truth (`FIN-11`). Heavily shaped by open decisions `AMB-001..008`.

## B2B
**Owns** the Quotation Request, the Quotation (line items, tax, validity, status), and the Invoice. Capabilities: Quotation Request submission (Corporate), the Admin quotation lifecycle (issue/send/accept/reject, formal-document generation), and **conversion of an accepted Quotation into a Booking** by calling Booking's `create_booking_from_quote` through an **anti-corruption boundary** — translating B2B vocabulary (PO numbers, credit terms, consolidated invoicing) into Booking's command language so those concepts never leak into Booking (`LC-11`). It publishes `QuotationRequested/Sent/Accepted/Rejected/Expired` and `InvoiceIssued`; bank-transfer receipt is recorded via Payments reconciliation (`PAY-9`). The B2B pre-payment state, seat-hold timing, off-Stripe settlement, document rendering, and tax treatment are open (`AMB-027..033`).

## Reviews
**Owns** Review content and moderation state and the authoritative Rating Score (`RatingSummary`). Capabilities: review submission (gated to a `COMPLETED` booking, at most one per booking, `INV-5`, `BKG-7`), moderation commands (Admin approve/remove, `OPR-6`), provider responses, and the rating-score query. It consumes only the minimal **completion fact** and **never reads Booking internals or mutates a Booking**. It publishes `ReviewSubmitted/Approved/Removed` and `RatingRecalculated`, which Catalog displays while Reviews remains the source of truth for the score. Moderation default and review window are open (`AMB-019`).

## Notifications
The supporting, event-driven outbound adapter. **Owns** dispatch records and templates only. It exposes essentially **no command surface to domain callers** — it is reaction-driven, consuming the full domain-event catalog and scheduled alerts — though it may offer a direct send for transactional messages (e.g. account verification). It renders each message in the recipient's stored Language Preference snapshotted at send time (`OPR-9`), upholds the 60-second confirmation SLA (`OPR-8`) by dispatching asynchronously, and is idempotent per (event, recipient, channel) so redelivery does not double-send. It publishes `NotificationDispatched/Failed` for observability. It makes no domain decisions. SMS scope/provider is open (`AMB-034`).

---

## Cross-Context API Boundaries

How contexts cooperate across their contracts, and who owns what at each seam. The governing rule is from [./bounded-contexts.md](/docs/architecture/bounded-contexts): **state-changing invariants that must hold together are synchronous and co-transactional; cross-context reactions are asynchronous.** Contexts refer to one another **by identity only** and depend on a published contract or a snapshot, never on another context's internals ([../domain/domain-models.md](/docs/domain/domain-models) §2).

## Catalog → Booking
- **Relationship:** Customer/Supplier (Catalog upstream). Two synchronous contracts cross this seam: `calculate_quote(...) → PriceBreakdown`, and the **guarded seat-reservation command** invoked inside Booking's checkout transaction.
- **Ownership rule:** Catalog owns price computation (`PRC-1`) and `available_seats` (`INV-3`). Booking consumes the `PriceBreakdown` (and snapshots it) and requests the seat decrement through the guarded command; it never computes price and never touches the seat counter directly. The seat reservation is the **one deliberate shared transaction** in the system (CR-1) — permitted only because both run in one database, and never to become a network call without a redesign.

## Booking → Payments
- **Relationship:** Customer/Supplier along the **money-facts vs money-movement** seam. Booking authors the immutable **Commission Snapshot**; Payments consumes it.
- **Ownership rule:** Booking owns money facts (`INV-1`, `PAY-4`); Payments owns money movement and the Commission Rate setting. Payments **reads** the snapshot to charge, refund, and pay out and **never authors or mutates** it (`FIN-3`, `FIN-5`). Payouts/refunds derive from the snapshot, never a live rate (`PAY-6`, `FIN-6`). Settlement outcomes flow back asynchronously as Payments events and webhooks; the payout/refund interlock must hold across the async gap (`PAY-8`, `FIN-5`, CR-3). Capture/topology/payout-queue shapes are open (`AMB-001..005`).

## Booking → Reviews
- **Relationship:** Published-event (Booking upstream). Reviews eligibility is established by a Booking reaching `COMPLETED`.
- **Ownership rule:** Booking owns lifecycle and completion; it emits a minimal **completion fact** `{ booking_id, tourist_id, listing_id, completed_at }`. Reviews consumes that fact for eligibility and **never reads Booking internals or mutates a Booking** (`INV-5`, `BKG-7`). This keeps moderation lifecycles independent of financial/lifecycle state.

## B2B → Booking
- **Relationship:** Anti-corruption boundary (ACL), synchronous command. An accepted Quotation is converted into a Booking via `create_booking_from_quote`.
- **Ownership rule:** B2B owns the Quotation and its acceptance (`LC-11`); Booking owns the resulting Booking and its lifecycle. B2B translates its vocabulary into Booking's command language **at the call boundary**, so B2B concepts never leak into Booking. The conversion is delegated, **not** co-transactional with the quotation. Because the B2B pre-payment state conflicts with "Booking only after payment" (`BKG-2`), this contract is **provisional** until `AMB-027` resolves (CR-7); seat-hold timing is open (`AMB-028`).

## Provider Verification → Catalog
- **Relationship:** Conformist read (Provider Verification upstream), plus asynchronous cascades.
- **Ownership rule:** Provider Verification owns Provider Status and license validity and exposes the read contract `{ provider_id, status, license_valid_until }`. Catalog **conforms** to it to gate listing creation/visibility (`INV-6`, `LC-8`) and **never replicates verification logic** or reads onboarding tables. Status/license changes propagate as events (`ProviderApproved`, `LicenseExpired/Renewed`), which Catalog consumes to pause/restore listings (`INV-7`, `OPR-3`) — an event-driven cascade, never Onboarding writing Catalog tables (CR-4). The effect of mid-flight status changes on confirmed bookings is open (`AMB-026`), but in no case are historical facts mutated.

---

## Integration Patterns

The four interaction styles the API uses, and the contract obligations of each. These are the mechanics by which the principles and boundaries above are realized.

## Synchronous command/query interactions
A caller (an external surface, or one context invoking another in-process) issues a command or query and **awaits the result**. Used where an invariant must hold within the operation: the atomic checkout unit (`BKG-2`, `CON-1`), `calculate_quote(...)` and availability checks, the guarded seat reserve, B2B → Booking conversion, Payments reading the Commission Snapshot, and IAM principal resolution ([./bounded-contexts.md](/docs/architecture/bounded-contexts) "Interaction styles"). Commands change guarded state and validate against invariants/lifecycle before applying; queries are side-effect-free. The synchronous response carries only the outcome of the guarded operation — **not** the asynchronous reactions it may trigger.

## Domain event publication
Contexts publish **past-tense, in-process domain events** carrying identities and immutable facts, never references to another context's live aggregate ([../domain/domain-models.md](/docs/domain/domain-models) §2, §6). Events are the asynchronous spine: Notifications consumes the full catalog; cross-context cascades (license expiry → pause; district deactivation → unlist; completion → enable review; completion → queue payout) flow as events. **Every consumer must be idempotent** (`FIN-10`) because events can be redelivered or arrive out of order; a failed reaction is retried independently and never rolls back the committed transition that emitted it (`FIN-11`). The authoritative producer/consumer mapping is the [domain events catalog](/docs/architecture/bounded-contexts/domain-events).

## Webhook ingestion
External rails — primarily Stripe Connect — deliver **settlement truth asynchronously via webhooks** (charge, transfer, payout, refund, dispute). Ingestion is an external boundary owned by Payments: webhooks are **authoritative for settlement outcomes**, and internal Payments state **converges to them** (`FIN-11`, [External Integrations](/docs/architecture/overview#external-integrations)). Ingestion must be idempotent and uniquely keyed so duplicate or out-of-order webhooks cannot double-apply (`FIN-10`); divergence surfaces as a reconcilable fact for operator action, never a silent loss. B2B funds arrive off-Stripe by bank transfer and are reconciled **manually** by Admin rather than by webhook (`PAY-9`, `AMB-030`).

## Background job execution
Asynchronous reactions and scheduled work run in the background-job runtime **after a committing transition** ([Background Jobs](/docs/architecture/overview#background-jobs)): notification dispatch, payout queuing, rating recalculation, listing pause/restore cascades, and time-based alerts (license/trial expiry, overdue registrations/quotations/payments, `OPR-3..5`). Every job is **idempotent and retriable** (`FIN-10`); a failed job never rolls back an already-committed transition and, for money, surfaces as a reconcilable Payments fact (`FIN-11`). Scheduled execution also drives lifecycle timers such as the auto-confirmation timer, whose duration is open (`AMB-011`). This pattern is what keeps request latency decoupled from external delivery and preserves the 60-second confirmation SLA (`OPR-8`).

---

## API Security Model

How the boundary establishes *who is acting*, *what they may do*, *which surfaces they reach*, and *what is recorded*. Security is evaluated at the boundary on every command and query; no surface confers authority by itself.

## Authentication
Authentication is owned by **IAM** and established over a server-issued authenticated session for the web app ([tech-stack](/docs/architecture/tech-stack), [./bounded-contexts.md](/docs/architecture/bounded-contexts) §7). Every API interaction resolves to an **IAM-issued principal** before any context acts; contexts consume that principal by identity and never re-authenticate. External-rail callers (webhooks) are authenticated as integrations at the Payments ingestion boundary rather than as Actor principals. The **authentication methods** themselves (email/password, Google sign-in, captcha on registration) are unresolved and not assumed here (`AMB-021`); whether and how far unauthenticated Visitors may reach discovery contracts is likewise open (`AMB-022`).

## Authorization
Authorization is evaluated against the resolved principal type — marketplace **Role** (`Tourist | Corporate | Provider`) or **Admin principal** — and, where relevant, additional domain gates owned by the responsible context — e.g. Catalog authoring requires Provider Status `Approved`, a valid license, and a verified Stripe Connected Account to publish (`INV-6`, `INV-7`, `INV-12`, `LC-8`), and a Review requires a completed booking owned by the requesting Tourist (`INV-5`, `BKG-7`). A command is rejected when the principal's authorization or domain state does not permit it. Authorization is **owned by the context that owns the capability**: IAM answers identity and Role; Admin authorization is evaluated against the Admin principal; each context applies its own domain-state gates on top.

## Role boundaries
Each consumer surface is confined to its permitted capabilities (`FR-IAM-009`, `NFR-SEC-004`): the Tourist App to Tourist capabilities, the Corporate Client Portal to Corporate, the Provider Portal to Provider, and the Admin Panel to the Admin principal. Cross-surface access is blocked at the boundary. Admin's breadth is the breadth of Admin-principal authorization exercised across the **same** boundary as every other Actor — not a privileged path around it. The minimal, stable marketplace contract (`principal`, `role`, `language`) is kept deliberately small to limit ripple (CR-6).

## Auditability
Financial facts are auditable by construction: every money movement traces to exactly one Booking and its snapshot (`FIN-3`, `NFR-AUD-001`); snapshots are immutable for the Booking's life (`INV-1`, `NFR-AUD-002`); payout/refund amounts derive from snapshot values, never a live rate (`FIN-6`, `NFR-AUD-003`); and payout/refund are observably mutually exclusive per Booking's funds (`FIN-5`, `NFR-AUD-005`). The cancellation **initiator** must be an explicit attribute so the refund rule (`PAY-6`/`PAY-7`) is derivable and reconstructable — its modeling is open under `AMB-014`. The Admin Payments Overview is the audit-facing query over these facts (`FIN-3`, `NFR-AUD-006`).

Two security-shaping decisions remain open and are **not** resolved here:
- **`AMB-021` — authentication methods.** Which methods at launch (email/password, Google OAuth, captcha) and therefore the exact authentication contract shape.
- **`AMB-022` — guest access scope.** Whether unauthenticated Visitors may reach discovery/pricing contracts, or whether those are login-gated, which sets how much of the read surface is reachable without a principal. (Booking initiation requires an authenticated Tourist or Corporate principal regardless, `NFR-SEC-005`.)

---

## Versioning Strategy

Stated as architectural expectations, not a chosen scheme. The two seams version differently:

- **Internal context contracts** are versioned by **discipline, not distribution**. Because contexts share one deployable and one database, a contract change is applied with its consumers in the same release; the expectation is **additive, non-breaking evolution** of the published value contracts (`PriceBreakdown`, `AvailabilitySnapshot`, the Provider Status read, the Commission Snapshot, the completion fact) so a change in an owning context does not force a coordinated rewrite of its consumers. The minimal IAM contract is held especially stable (CR-6). A breaking change to an internal contract is a deliberate, reviewed event that updates the owning context and all consumers together, never a silent reshape.
- **The external SPA surface and webhook boundary** are network contracts with independent consumers (the deployed SPA, external rails). The expectation is **backward compatibility by default**: existing clients keep working across releases, changes are additive where possible, and a genuinely breaking change is introduced behind an explicit, separately addressable contract version with a migration path rather than by mutating the existing one. Webhook ingestion must additionally tolerate the external rail's own contract evolution and remain idempotent across it (`FIN-10`).

The **concrete versioning mechanism** (URI versioning, header negotiation, etc.) is an implementation choice below the architecture line and is deliberately not fixed here, consistent with the tech-stack doc's "out of scope" stance ([tech-stack](/docs/architecture/tech-stack#out-of-scope-for-this-document)). No versioning approach may change the bounded-context or aggregate **boundaries** in [./bounded-contexts.md](/docs/architecture/bounded-contexts) and [../domain/domain-models.md](/docs/domain/domain-models).

---

## Error Handling Philosophy

The boundary distinguishes failure **kinds** because each maps to a different invariant guarantee and a different consumer expectation. The philosophy — not the format — is what is fixed here.

## Validation failures
A request that is malformed or violates input constraints (e.g. password strength, upload size/format, non-positive slot duration, overlapping pricing tiers) is **rejected at the boundary before any state changes** (`NFR-SEC-003`, `NFR-SEC-006`, `FR-CAT-014`, `FR-CAT-019`). The owning context reports the failure as a non-applied request; no partial effect occurs. Authentication failure is reported as a **single non-specific outcome** that does not reveal which field was wrong (`FR-IAM-006`, `NFR-SEC-001`).

## Business-rule violations
A request that is well-formed but would violate an invariant or lifecycle rule — publishing a listing with zero photos (`INV-10`), creating a listing as a non-Approved Provider (`INV-6`, `LC-8`), an illegal Booking transition (`LC-1..6`), reviewing a non-completed booking (`INV-5`), paying without agreeing to the cancellation policy (`BKG-1`) — is **refused by the owning context** as a domain rejection, distinct from a validation error. The invariant is upheld by refusing the operation, never by applying a weakened version of it (requirements cannot override invariants, [../requirements/README.md](/docs/requirements) §9).

## Concurrency conflicts
Simultaneous attempts on the same state resolve to **a single applied outcome**; the rest observe the updated state and are rejected. The canonical case is last-seat contention: at most enough reservations succeed to reach `available_seats = 0`, and further attempts receive a **"now fully booked"** outcome (`CON-2`, `CON-3`, `FR-BKG-006`). Likewise, simultaneous Booking transition attempts resolve to one applied transition; the others are rejected as invalid against the new state ([./booking-state-machine.md](/docs/architecture/booking-state-machine)). Conflicts are a normal, definite outcome the contract surfaces promptly (`NFR-PERF-003`), not an error to retry blindly.

## External integration failures
Failures of external rails (charge declined, payout/refund failure, webhook delays, bank-transfer non-receipt) are handled under **convergence, not rollback**. A failed payment yields no Booking and no seat reservation (`PAY-5`, `FIN-9`) — the synchronous guarantee. After a committed transition, an external failure **never rolls it back**; it surfaces as a **reconcilable Payments fact** for operator action and the operation is retried idempotently (`FIN-10`, `FIN-11`). The platform does not assert a refunded/paid outcome as financially final until the rail confirms it. The exact failure-state representations (payout-failed, refund-failed, dispute) are open (`AMB-005`, `AMB-006`, `AMB-008`).

---

## Open API Decisions

Unresolved decisions that shape API contracts. Each is tracked in [../ambiguities/open-questions.md](/docs/ambiguities/open-questions). **Resolved (Decision Log 2026-07-29):** capture at checkout (`AMB-001`); Separate Charges & Transfers (`AMB-002`); platform payout queue + entry states (`AMB-003`–`005`); CheckoutSession snapshot timing (`AMB-007`); B2C enters `CONFIRMED` (`AMB-011`); District→Area discovery (`AMB-020`); MoR/seller-of-record (`AMB-032`); B2C tax-inclusive (`AMB-033`).

## Authentication & access surface
- **`AMB-021` — authentication methods (P0).** Sets the shape of the authentication contract and registration surface (email/password, Google OAuth, captcha).
- **`AMB-022` — guest access scope (P1).** Determines how much of the discovery/pricing read surface is reachable without an authenticated principal; booking initiation remains authenticated regardless (`NFR-SEC-005`).

## Booking & checkout contracts
- **`CheckoutSession` contract (resolved).** Session creation freezes snapshots, captures Fulfillment Payload, reserves seats, and binds PaymentIntent to `checkout_session_id`; payment success materializes Booking as `CONFIRMED` (`BKG-9`, `BKG-10`).
- **`AMB-013` — missing lifecycle paths (P1)**, **`AMB-014` — terminal-state overloading & initiator attribute (P1).** Shape cancellation/refund commands and the auditable cancellation contract.
- **`AMB-017` — bundle cancellation semantics (P1/P2).** Cross-leg behavior of cancellation/restoration contracts.

## Payments & settlement contracts
- **`Separate Charges & Transfers` (resolved).** Platform-account capture; Stripe Transfer on payout queue disbursement (`PAY-13`, `PAY-14`).
- **`AMB-006` — refund-failure handling (P1)**, **`AMB-008` — post-payout dispute/chargeback (P1).** Failure facts surfaced for reconciliation.
- **`AMB-009` — commission base (P1).** Confirms the commission base on which the Commission Snapshot contract is computed.

## B2B contracts
- **`AMB-027` — B2B pre-payment state (P1)** and **`AMB-028` — B2B seat-hold timing (P1).** The accepted-quotation-awaiting-transfer state conflicts with `BKG-2`; until resolved the B2B → Booking conversion contract is provisional (CR-7). The ACL keeps any resolution from rippling into Booking.
- **`AMB-029` — off-Stripe provider settlement (P1)**, **`AMB-031` — formal-document character rendering (P1)**, **`AMB-030` — manual bank-transfer reconciliation (P2).** Shape the B2B document and settlement contracts.

## Notifications & cross-cutting
- **`AMB-034` — SMS provider & phone-verification scope (P1).** Whether the notification contract includes an SMS channel in MVP and how it is gated.
- **`AMB-024` — language defaults / supported languages (P1)** and **`AMB-025` — currency (P1).** Refine the language and money value contracts within their owning contexts.
- **`AMB-016` — login lockout parameters (P2)** and **`AMB-019` — review moderation default & window (P2).** Tune IAM and Reviews contract behavior without changing their shape.

> Note on scope: no open decision above changes the context or aggregate **boundaries** defined in [./bounded-contexts.md](/docs/architecture/bounded-contexts) and [../domain/domain-models.md](/docs/domain/domain-models). Each affects a contract's shape, a value object, a lifecycle detail, or an external-rail topology within a single owning context — which is precisely why the boundaries are drawn where they are.
