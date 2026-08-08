---
title: Open Questions
sidebar_position: 1
description: Ambiguity register and decision log for unresolved planning items.
---

## TL;DR

- **Single decision-management register** for unresolved planning items (`AMB-###`).
- Each entry: classification, priority, temporary assumption, affected contexts; resolved items in Decision Log.
- Requirements cite `AMB-###` when provisional — never silently resolve open questions.

## About this document

Open questions and ambiguity register — architecture-oriented, no implementation detail.

| Topic | Document |
| --- | --- |
| Terminology | [Glossary](/docs/business-rules/glossary) |
| Rules | [Business Rules](/docs/business-rules/invariants) |
| Requirements | [Requirements](/docs/requirements) |
| Ambiguity trace | [Traceability — Ambiguity](/docs/requirements/traceability-matrix/ambiguity-trace) |

---

## How to use this register
- Each entry has a stable `AMB-###` ID. Source IDs from origin docs (`Q#`, `PAY-A#`, PRD `A1`…`G1`) are cross-referenced so nothing is double-counted.
- **Classification:** Business | Engineering | Finance | Operational | Legal (primary class first; secondary in parentheses).
- **Priority:** `P0` blocks MVP or financial correctness; `P1` needed before the affected context ships; `P2` deferrable / confirmation-only.
- **Temporary Assumption:** the current working baseline so docs and planning can proceed; it is *not* a decision.
- **Status:** all `OPEN` until a named owner confirms; resolved items move to the Decision Log at the bottom.
- An entry is recorded once; related entries are linked rather than duplicated.

## Priority index
- **P0 (blockers):** AMB-021
- **P1 (pre-ship):** AMB-006, AMB-008, AMB-009, AMB-010, AMB-013, AMB-014, AMB-022, AMB-024, AMB-025, AMB-026
- **P2 (confirmation / later):** AMB-015 through AMB-019, AMB-027 through AMB-035
- **RESOLVED (Decision Log):** AMB-001, AMB-002, AMB-003, AMB-004, AMB-005, AMB-007, AMB-011, AMB-012, AMB-020, AMB-023, AMB-032, AMB-033

---

## A. Finance (money movement, settlement, commission)

### AMB-001 — Authorization vs. Capture model
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** state-machine `Q2`; payments `PAY-A1`.
- **Classification:** Finance (Engineering).
- **Question:** Is the buyer's card **captured at checkout** (Model A) or **authorized at checkout and captured later** (Model B)?
- **Impact:** Load-bearing. Determines whether `PENDING → CANCELLED` is a refund or a hold-release, when Provider funds are fundable, refund mechanics, and timeout semantics.
- **Affected contexts:** Payments & Payouts, Booking & Checkout, Notifications.
- **Temporary assumption:** Model A (capture at checkout); `PENDING` means paid-and-awaiting-confirmation.
- **Priority:** P0.
- **Owner:** Finance + Engineering.
- **Risk if unresolved:** Cancellation/refund/payout flows cannot be built correctly; rework across the entire financial core.

### AMB-002 — Stripe Connect charge topology
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** payments `PAY-A4`.
- **Classification:** Finance (Legal, Engineering).
- **Question:** Which Connect topology — destination charges with `application_fee`, separate charges + transfers, or `on_behalf_of`?
- **Impact:** Sets merchant-of-record, when the Provider transfer happens, and whether payout timing is automatic or platform-controlled (couples to AMB-005).
- **Affected contexts:** Payments & Payouts; Provider Onboarding (connected-account KYC).
- **Temporary assumption:** Destination charges with `application_fee` equal to the snapshotted Commission Amount.
- **Priority:** P0.
- **Owner:** Finance + Legal + Engineering.
- **Risk if unresolved:** Wrong merchant-of-record has tax/legal consequences; payout model may contradict the Payout Queue.

### AMB-003 — Automatic transfer vs. platform-controlled Payout Queue
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** payments `PAY-A7`; planning conflict (Stripe auto-payout vs manual queue).
- **Classification:** Finance (Engineering).
- **Question:** Are Provider funds transferred automatically by Stripe at charge time, or held and disbursed via the platform **Payout Queue** after `COMPLETED`?
- **Impact:** These are mutually exclusive; the Payout Queue model (`LC-6`) assumes platform control.
- **Affected contexts:** Payments & Payouts, Booking & Checkout.
- **Temporary assumption:** Platform-controlled Payout Queue; disbursement after completion.
- **Priority:** P0.
- **Owner:** Finance + Engineering.
- **Risk if unresolved:** Double money-out exposure and contradiction with the state machine; see AMB-004.

### AMB-004 — Clearing period & completion→refund→payout timing
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** state-machine `Q3`; payments `PAY-A8`.
- **Classification:** Finance.
- **Question:** Does a hold/clearing period precede payout disbursement so refunds/disputes can be absorbed before the Provider is paid?
- **Impact:** `PAYOUT_QUEUED` is created "immediately" on `COMPLETED`, yet `COMPLETED → REFUNDED` can reverse it.
- **Affected contexts:** Payments & Payouts.
- **Temporary assumption:** A clearing window precedes disbursement (duration TBD); refund within the window voids the queue entry (`PAY-8`, `FIN-5`).
- **Priority:** P1.
- **Owner:** Finance.
- **Risk if unresolved:** Provider paid before reversal window closes → unrecoverable funds.

### AMB-005 — Payout disbursement & failure states
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** state-machine `Q4`; payments `PAY-A5`.
- **Classification:** Engineering (Finance).
- **Question:** What succeeds `PAYOUT_QUEUED`? There is no modeled "disbursed" outcome and no payout-failure path (invalid/restricted connected account).
- **Impact:** "Provider was actually paid" is not representable; failures are invisible to the lifecycle.
- **Affected contexts:** Payments & Payouts, Booking & Checkout, Notifications.
- **Temporary assumption:** Add Payments-side `DISBURSED` and `PAYOUT_FAILED` facts; failed payouts alert Admin and retry.
- **Priority:** P1.
- **Owner:** Engineering.
- **Risk if unresolved:** Stuck/again-paid payouts; no operational visibility.

### AMB-006 — Refund-failure handling
- **Sources:** payments `PAY-A9`.
- **Classification:** Engineering (Finance).
- **Question:** How is a failed refund represented and recovered (e.g. `REFUND_PENDING` / `REFUND_FAILED`)?
- **Impact:** A Booking may assert `REFUNDED`/`CANCELLED` while funds have not actually returned, breaking "REFUNDED ⇒ funds returned."
- **Affected contexts:** Payments & Payouts, Booking & Checkout.
- **Temporary assumption:** Refund is asserted final only on rail confirmation; failures surface as a reconcilable Payments fact.
- **Priority:** P1.
- **Owner:** Engineering.
- **Risk if unresolved:** False financial truth; reconciliation gaps.

### AMB-007 — Snapshot timing authority
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** payments `PAY-A6`; `PRC-8` vs Booking creation.
- **Classification:** Engineering (Finance).
- **Question:** Is the Price/Commission Snapshot authoritative at **checkout initiation** (`PRC-8`) or at **payment success** (Booking creation)?
- **Impact:** A slow checkout can diverge the two; `INV-1` needs one authoritative instant.
- **Affected contexts:** Booking & Checkout, Catalog & Inventory (Pricing), Payments & Payouts.
- **Temporary assumption:** Freeze at checkout initiation; charge must equal that snapshot or checkout restarts.
- **Priority:** P1.
- **Owner:** Engineering.
- **Risk if unresolved:** Buyer charged an amount that differs from the snapshot.

### AMB-008 — Chargeback / dispute after payout
- **Sources:** payments `PAY-A13`; audit.
- **Classification:** Finance (Engineering).
- **Question:** How are disputes/chargebacks handled, especially after a payout? No `DISPUTED` representation exists.
- **Impact:** Post-payout chargeback = platform loss with no modeled recovery.
- **Affected contexts:** Payments & Payouts.
- **Temporary assumption:** Out of MVP happy-path; tracked as Payments fact; clearing period (AMB-004) mitigates.
- **Priority:** P1.
- **Owner:** Finance + Engineering.
- **Risk if unresolved:** Uncontrolled loss exposure.

### AMB-009 — Commission base = gross incl. mandatory Extra Charges
- **Sources:** PRD `C3`; `PAY-3`.
- **Classification:** Finance.
- **Question:** Confirm commission is computed on the total including mandatory Extra Charges (tolls, etc.), not base price.
- **Impact:** Changes Commission Amount and Net Payout on most Bookings.
- **Affected contexts:** Payments & Payouts, Catalog & Inventory (Pricing).
- **Temporary assumption:** Commission on gross incl. mandatory charges (`PAY-3`).
- **Priority:** P1.
- **Owner:** Business + Finance.
- **Risk if unresolved:** Systematic mis-split of revenue.

### AMB-010 — Snapshot scope (price + commission + cancellation policy)
- **Sources:** PRD `C1`; `INV-1`.
- **Classification:** Finance (Legal, Engineering).
- **Question:** Confirm all three (price, commission rate, Cancellation Policy) are snapshotted at checkout and immune to mid-flight provider changes.
- **Impact:** Defines immutability surface for refunds/audit.
- **Affected contexts:** Booking & Checkout, Payments & Payouts.
- **Temporary assumption:** All three snapshotted (`INV-1`).
- **Priority:** P1.
- **Owner:** Engineering + Legal.
- **Risk if unresolved:** Disputes over which terms applied.

---

## B. Engineering (lifecycle structure, concurrency, modeling)

### AMB-011 — Auto-Confirmation Timer duration
- **Status:** **RESOLVED** — superseded for B2C; see Decision Log (2026-07-29).
- **Sources:** state-machine `Q1`; planning conflict.
- **Classification:** Engineering (Business).
- **Question:** How long before `PENDING → CONFIRMED` auto-fires, and does it interact with short-lead bookings (timer longer than time-to-service)?
- **Impact:** Too long strands short-lead Bookings in `PENDING` (cannot complete); too short defeats provider confirmation.
- **Affected contexts:** Booking & Checkout, Notifications.
- **Temporary assumption:** 24h, capped at service start time minus a buffer.
- **Priority:** P1.
- **Owner:** Business/Product + Engineering.
- **Risk if unresolved:** Dead-end Bookings; inconsistent confirmation behavior.

### AMB-012 — Seat-restoration edge cases
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** audit of state machine; `CON-5`, `INV-3`, `CON-3`.
- **Classification:** Engineering.
- **Question:** How are seats restored when the target Slot was mutated/paused, the Provider suspended, the service time already passed, or for multi-day all-or-nothing restores? Is restoration idempotent?
- **Impact:** Risk of `available_seats > capacity` (`INV-3`) on retries; undefined restore target.
- **Affected contexts:** Booking & Checkout, Catalog & Inventory (Availability).
- **Temporary assumption:** Restoration is idempotent, clears Fully Booked, and is skipped for elapsed Slots; multi-day restores all legs atomically.
- **Priority:** P1.
- **Owner:** Engineering.
- **Risk if unresolved:** Inventory corruption / overbooking.

### AMB-013 — Missing operational lifecycle paths
- **Sources:** audit (not yet in state-machine doc).
- **Classification:** Engineering (Operational).
- **Question:** Model the missing transitions: tourist cancel of `CONFIRMED`, provider decline of `PENDING`, no-show / provider non-delivery, reschedule/modify, and duplicate-webhook idempotency at creation.
- **Impact:** Common real flows are unrepresentable; `CONFIRMED` can dead-end if provider never marks delivered.
- **Affected contexts:** Booking & Checkout, Payments & Payouts.
- **Temporary assumption:** To be added in the next state-machine revision with an explicit initiator attribute; tentative no-show auto-handling after service time.
- **Priority:** P1.
- **Owner:** Engineering + Business.
- **Risk if unresolved:** Stranded Bookings and revenue; gaps surface late.

### AMB-014 — Terminal-state overloading (CANCELLED vs REFUNDED) & initiator attribute
- **Sources:** audit; `PAY-6`/`PAY-7`.
- **Classification:** Engineering (Finance).
- **Question:** Should `CANCELLED` carry three financial realities (hold-released / partial refund / 100% refund), or should refunded outcomes route to `REFUNDED`? How is the cancellation **initiator** recorded so the refund rule is derivable?
- **Impact:** Terminal state alone cannot encode whether/how much money moved.
- **Affected contexts:** Booking & Checkout, Payments & Payouts.
- **Temporary assumption:** Record an explicit `initiator` + `refund_outcome` on cancellation; keep `CANCELLED`/`REFUNDED` distinct by money-moved.
- **Priority:** P1.
- **Owner:** Engineering.
- **Risk if unresolved:** Reconciliation/audit cannot reconstruct financial truth.

### AMB-015 — Holiday calendar presets
- **Sources:** PRD `C2`.
- **Classification:** Engineering.
- **Question:** Confirm a preloaded Japan public-holiday calendar (Golden Week, Obon, New Year, Silver Week) as Pricing presets.
- **Affected contexts:** Catalog & Inventory (Pricing).
- **Temporary assumption:** Provided as Seasonal Override presets.
- **Priority:** P2. **Owner:** Engineering.
- **Risk if unresolved:** Minor; manual override entry only.

### AMB-016 — Login lockout parameters
- **Sources:** PRD `A2`; `OPR-1`.
- **Classification:** Engineering (Operational/Security).
- **Question:** Confirm 5 failed attempts → 15-minute lock.
- **Affected contexts:** Identity & Access, Notifications.
- **Temporary assumption:** 5 / 15 minutes (`OPR-1`).
- **Priority:** P2.
- **Owner:** Engineering/Security.
- **Risk if unresolved:** Low; tunable.

---

## C. Business / Product (scope, model, UX surface)

### AMB-017 — Bundle commission & cancellation semantics
- **Sources:** PRD `E1`; `BKG-3`.
- **Classification:** Business (Engineering).
- **Question:** Confirm a Bundle Booking creates two linked Booking records with independent commission; and define what happens to one leg when the other is cancelled.
- **Affected contexts:** Booking & Checkout, Payments & Payouts.
- **Temporary assumption:** Two linked records, independent commission; leg cancellation does not auto-cancel the other (to be confirmed).
- **Priority:** P2 (commission) / P1 (cancellation semantics).
- **Owner:** Business + Engineering.
- **Risk if unresolved:** Half-cancelled bundles / partial trips.

### AMB-018 — Multi-day package scope (single-provider v1)
- **Sources:** PRD `E2`; `BKG-5`.
- **Classification:** Business.
- **Question:** Confirm multi-day packages are single-provider in v1 (cross-provider is v2).
- **Affected contexts:** Booking & Checkout, Catalog & Inventory.
- **Temporary assumption:** Single-provider only.
- **Priority:** P2.
- **Owner:** Business Owner.

### AMB-019 — Reviews moderation default & window
- **Sources:** PRD `F1`, `F2`; `OPR-6`, `OPR-7`.
- **Classification:** Business.
- **Question:** Confirm reviews enter Pending Moderation by default (with optional Auto-Approve), and the 14-day review window from completion.
- **Affected contexts:** Reviews & Ratings, Notifications.
- **Temporary assumption:** Moderation on by default; 14-day window.
- **Priority:** P2.
- **Owner:** Business Owner.

### AMB-020 — Discovery navigation model
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** planning conflict (meeting-notes service-type sections vs PRD District→Area).
- **Classification:** Business (Engineering).
- **Question:** Is primary navigation by **service-type sections** (Airport/Port/Tours/Charter) or by **District → Area** hierarchy (PRD)? Or both?
- **Impact:** Shapes the Catalog/Discovery information architecture and the homepage.
- **Affected contexts:** Catalog & Inventory (Geography, Search), Booking & Checkout (entry).
- **Temporary assumption:** District → Area is canonical (PRD); service-type is a filter (`D-02`).
- **Priority:** P0.
- **Owner:** Product Owner.
- **Risk if unresolved:** Core navigation rework after build.

### AMB-021 — Authentication method conflict
- **Sources:** planning conflict (PRD email/password + lockout vs meeting-notes Google OAuth + captcha).
- **Classification:** Business (Engineering).
- **Question:** Which auth methods at launch — email/password, Google OAuth, or both — and is captcha required?
- **Impact:** Identity is the dependency root for every context.
- **Affected contexts:** Identity & Access, Notifications.
- **Temporary assumption:** Email/password (with lockout `A-02`) + Google OAuth; captcha on registration.
- **Priority:** P0.
- **Owner:** Business + Engineering.
- **Risk if unresolved:** Blocks the foundation context.

### AMB-022 — Guest (unauthenticated) access scope
- **Sources:** planning conflict (`1.1`/`B-01` require login & hide pricing vs meeting-notes "Guest Website").
- **Classification:** Business (Product).
- **Question:** May Visitors browse listings and see pricing without an account, or is the homepage login-gated?
- **Impact:** Affects discovery exposure, SEO, and conversion.
- **Affected contexts:** Identity & Access, Catalog & Inventory.
- **Temporary assumption:** Public browsing of listings + indicative pricing; account required to book (`1.1` relaxed).
- **Priority:** P1.
- **Owner:** Product Owner.
- **Risk if unresolved:** Rework of access gating and pages.

### AMB-023 — Vehicle taxonomy mismatch
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** planning conflict (meeting-notes SUV/Van/Sedan/Bus/Coster vs PRD Alphard/HiAce/Sedan/Limousine; 20/40/50-seat).
- **Classification:** Business (Engineering).
- **Question:** What is the canonical Vehicle Type taxonomy and capacity banding?
- **Affected contexts:** Provider Onboarding, Catalog & Inventory (Listings, Search).
- **Temporary assumption:** Adopt PRD taxonomy; meeting-notes terms map onto it.
- **Priority:** P1.
- **Owner:** Business + Engineering.
- **Risk if unresolved:** Listing fields and filters need remodeling.

### AMB-024 — Target market vs. i18n default
- **Sources:** planning conflict (business-model EN-speaking inbound vs PRD JA-primary Client Portal + multi-language filters).
- **Classification:** Business.
- **Question:** Confirm language defaults (Tourist app EN, Client Portal JA) and the supported filter languages.
- **Affected contexts:** Identity & Access, Notifications, Catalog & Inventory (Search), Reviews.
- **Temporary assumption:** Tourist EN-default, Client Portal JA-default (`G-03`, `G-04`); filter languages EN/JA/ZH/KO/ES/Other (`D-03`).
- **Priority:** P1.
- **Owner:** Business Owner.

### AMB-025 — Currency: single (JPY) vs multi-currency
- **Sources:** planning conflict; glossary Money rule.
- **Classification:** Business (Engineering).
- **Question:** Is JPY the only currency, or is multi-currency display/settlement required for inbound tourists?
- **Affected contexts:** Payments & Payouts, Catalog & Inventory (Pricing), Booking & Checkout.
- **Temporary assumption:** Single currency JPY (`PAY-1`).
- **Priority:** P1.
- **Owner:** Business + Engineering.
- **Risk if unresolved:** Multi-currency retrofit is expensive (touches every money path).

### AMB-026 — Provider suspension / license expiry mid-flight
- **Sources:** audit; `INV-7`, `OPR-3`.
- **Classification:** Operational (Engineering).
- **Question:** What happens to already-`CONFIRMED` Bookings when a Provider is suspended or their License expires (listings auto-pause, but in-flight Bookings)?
- **Impact:** `INV-7` pauses listings but is silent on existing obligations.
- **Affected contexts:** Provider Onboarding, Booking & Checkout, Notifications.
- **Temporary assumption:** Confirmed Bookings are honored; only new bookings are blocked; Admin alerted.
- **Priority:** P1.
- **Owner:** Operational + Engineering.
- **Risk if unresolved:** Tourists hold bookings against a suspended Provider.

---

## D. Corporate (Quotation, Invoicing, Bank Transfer)

### AMB-027 — corporate pre-payment state vs. canonical states
- **Sources:** state-machine `Q5`; payments `PAY-A10`.
- **Classification:** Business (Engineering).
- **Question:** An accepted Quotation converts to a Booking awaiting Bank Transfer ("Pending Payment"), which is not a canonical state and conflicts with `BKG-2` (Booking only after successful payment). Distinct pre-state, separate machine, or mapping?
- **Affected contexts:** Corporate Quotation & Invoicing, Booking & Checkout, Payments & Payouts.
- **Temporary assumption:** Introduce a `PENDING_PAYMENT` pre-state scoped to Corporate.
- **Priority:** P1.
- **Owner:** Business Owner + Engineering.
- **Risk if unresolved:** corporate lifecycle cannot be modeled consistently.

### AMB-028 — Corporate seat reservation timing
- **Sources:** payments `PAY-A11`.
- **Classification:** Business (Engineering).
- **Question:** Are Slots held at Quotation acceptance (inventory held for unpaid orders, contra `CON-1`) or only at payment confirmation (quoted Slot may sell out before furikomi arrives)?
- **Affected contexts:** Corporate Quotation & Invoicing, Catalog & Inventory (Availability), Booking & Checkout.
- **Temporary assumption:** Soft-hold at acceptance with expiry tied to the payment deadline.
- **Priority:** P1.
- **Owner:** Business + Engineering.
- **Risk if unresolved:** Either stranded inventory or unfulfillable quotations.

### AMB-029 — Corporate provider settlement for off-Stripe funds
- **Sources:** payments `PAY-A12`.
- **Classification:** Finance.
- **Question:** Since Corporate bank-transfer funds arrive by Bank Transfer (off-Stripe), how is the Provider's Net Payout disbursed — off-platform settlement or routed through Connect?
- **Affected contexts:** Corporate Quotation & Invoicing, Payments & Payouts.
- **Temporary assumption:** Manual off-platform settlement, recorded as a Payments fact.
- **Priority:** P1.
- **Owner:** Finance.

### AMB-030 — Bank transfer reconciliation (manual confirm)
- **Sources:** PRD `E3`.
- **Classification:** Operational (Finance).
- **Question:** Confirm manual Admin "Mark as Paid"; automated reconciliation is v2.
- **Affected contexts:** Corporate Quotation & Invoicing, Payments & Payouts.
- **Temporary assumption:** Manual (`PAY-9`).
- **Priority:** P2.
- **Owner:** Business Owner.

---

## E. Legal / Compliance

### AMB-031 — Quotation/Invoice PDF character rendering
- **Sources:** PRD `E4`; payments doc (Prawn).
- **Classification:** Legal (Engineering).
- **Question:** Must formal Japanese documents (Omitsumorisho/Seikyusho) render kanji/kana, or is Latin-only acceptable? (Original spec notes ReportLab renders kanji as black boxes.)
- **Impact:** Legal/business acceptability of formal documents in Japan.
- **Affected contexts:** Corporate Quotation & Invoicing.
- **Temporary assumption:** Use a PDF approach with embedded JA fonts so kanji renders correctly.
- **Priority:** P1.
- **Owner:** Engineering + Legal/Business.
- **Risk if unresolved:** Legally/operationally unusable invoices.

### AMB-032 — Merchant-of-record / seller-of-record
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** derived from AMB-002.
- **Classification:** Legal (Finance).
- **Question:** Is Red Cab the merchant-of-record, or the Provider (platform as agent)? Tied to Connect topology.
- **Impact:** Tax collection/remittance, consumption-tax treatment, liability.
- **Affected contexts:** Payments & Payouts, Corporate Quotation & Invoicing.
- **Temporary assumption:** Platform as agent; Provider is seller-of-record (to confirm with AMB-002).
- **Priority:** P0 (paired with AMB-002).
- **Owner:** Legal + Finance.
- **Risk if unresolved:** Tax/regulatory exposure.

### AMB-033 — Consumption tax treatment
- **Status:** **RESOLVED** — see Decision Log (2026-07-29).
- **Sources:** PRD `E-06`; `PAY-10`.
- **Classification:** Finance (Legal).
- **Question:** Confirm 10% consumption tax handling on corporate documents and whether B2C prices are tax-inclusive.
- **Affected contexts:** Corporate Quotation & Invoicing, Catalog & Inventory (Pricing), Payments.
- **Temporary assumption:** corporate documents itemize 10% tax; B2C prices tax-inclusive (to confirm).
- **Priority:** P1.
- **Owner:** Finance + Legal.

---

## F. Operational (notifications, alerts, support)

### AMB-034 — SMS provider & phone verification scope
- **Sources:** planning conflict; `G-01`/`G-02` SMS clauses.
- **Classification:** Operational (Engineering).
- **Question:** Is SMS in MVP scope, which provider, and is phone verification required for SMS notifications?
- **Affected contexts:** Notifications, Identity & Access.
- **Temporary assumption:** Email-only in MVP; SMS in Phase 2 (per roadmap).
- **Priority:** P1.
- **Owner:** Operational + Engineering.

### AMB-035 — Support monetization after the 3-month trial
- **Sources:** planning conflict; `A-07`.
- **Classification:** Business (Operational).
- **Question:** What is the paid-support model after the Support Trial expires (pricing/tiers)?
- **Affected contexts:** Provider Onboarding & Verification.
- **Temporary assumption:** Support gated after trial; monetization model TBD, not in MVP.
- **Priority:** P2.
- **Owner:** Business Owner.

---

## PRD Assumptions Register — confirmation status
Low-effort confirmations from the PRD Appendix already encoded as baseline rules; listed for sign-off (not re-described above unless they carried open conflict).

- **A1** Trial starts at Admin approval date — baseline `OPR-2` — confirm: Business Owner — P2.
- **A2** Lockout 5 / 15 min — see AMB-016 — P2.
- **A3** Pending registration > 14 days = Overdue — baseline `OPR-4` — confirm: Product — P2.
- **A4** 7-day pre-expiry support warning — baseline `OPR-3`-adjacent — confirm: Business/Product — P2.
- **B1** Districts with zero published Listings hidden — baseline `INV-8` — confirm: Product/UX — P2.
- **C1** Price + commission + policy snapshotted — see AMB-010 — P1.
- **C2** Holiday calendar presets — see AMB-015 — P2.
- **C3** Commission on gross incl. mandatory charges — see AMB-009 — P1.
- **E1** Bundle = 2 linked records — see AMB-017 — P2.
- **E2** Multi-day single-provider v1 — see AMB-018 — P2.
- **E3** Manual bank-transfer confirmation — see AMB-030 — P2.
- **E4** PDF character rendering — see AMB-031 — P1.
- **F1** Reviews moderated by default (+ Auto-Approve option) — see AMB-019 — P2.
- **F2** 14-day review window — see AMB-019 — P2.
- **G1** License expiry entered manually by Admin (OCR is v2) — baseline `OPR-3` — confirm: Engineering — P2.

---

## Decision Log

| AMB ID | Decision | Decided by | Date | Docs updated |
| --- | --- | --- | --- | --- |
| AMB-001 | **Capture at checkout** on Platform Stripe account. Funds held on Platform until Booking `COMPLETED`; no authorize-only model for B2C MVP. | Product + Finance + Engineering | 2026-07-29 | [Business Rules](/docs/business-rules/invariants) (`PAY-13`), `payments-architecture.md`, `booking-state-machine.md`, `phasing.md` |
| AMB-002 | **Separate Charges & Transfers** (not Destination Charges). Charge Tourist on Platform account; transfer Provider net via Payout Queue after completion. | Finance + Legal + Engineering | 2026-07-29 | `payments-architecture.md`, `glossary.md`, `phasing.md` |
| AMB-003 | **Platform-controlled Payout Queue** after `COMPLETED`. No automatic Provider transfer at charge time. | Finance + Engineering | 2026-07-29 | [Business Rules](/docs/business-rules/invariants) (`PAY-13`, `PAY-14`), `payments-architecture.md`, `domain-models.md` |
| AMB-004 | Payout disbursement occurs only after Booking `COMPLETED` and Payout Queue Entry processing. Refund before `DISBURSED` voids queue entry (`PAY-8`, `FIN-5`). | Finance | 2026-07-29 | `payments-architecture.md`, `booking-state-machine.md` |
| AMB-005 | Payout Queue Entry lifecycle: **`QUEUED → PROCESSING → DISBURSED \| FAILED`** (`LC-13`, `LC-14`). Failed entries retriable; Admin alerted. | Engineering | 2026-07-29 | [Business Rules](/docs/business-rules/invariants), `payments-architecture.md`, `domain-models.md` |
| AMB-007 | Snapshots authoritative at **CheckoutSession creation** (`PRC-8`, `BKG-9`); copied to Booking at materialization. PaymentIntent amount MUST match snapshotted gross. | Engineering | 2026-07-29 | `glossary.md`, [Business Rules](/docs/business-rules/invariants), `booking-state-machine.md`, `data-model.md` |
| AMB-011 | B2C card path **enters `CONFIRMED` on payment success** (`BKG-10`); no `PENDING` on happy path. Auto-confirm timer N/A for B2C. | Product + Engineering | 2026-07-29 | `booking-state-machine.md`, [Business Rules](/docs/business-rules/invariants) |
| AMB-012 | Seat restoration **idempotent** on cancellation/session expiry; skipped for elapsed slots; per-vehicle restores full capacity unit (`CON-5`, `CON-6`). | Engineering | 2026-07-29 | [Business Rules](/docs/business-rules/invariants) (`CON-5`) |
| AMB-020 | Primary discovery navigation: **District → Area** hierarchy. Service type is a **filter** (`D-02`), not primary IA. | Product Owner | 2026-07-29 | `glossary.md`, `functional-requirements.md`, `phasing.md` |
| AMB-023 | Canonical vehicle taxonomy: **PRD set** — Alphard, HiAce, Sedan, Limousine (private car); 20/40/50-seat bands (charter bus). Stored on `provider_assets.vehicle_category`. | Business + Engineering | 2026-07-29 | `glossary.md`, `domain-models.md` |
| AMB-032 | **Platform merchant-of-record** for card charges; **Provider seller-of-record** for underlying service (platform as agent). | Legal + Finance | 2026-07-29 | `payments-architecture.md`, `glossary.md` |
| AMB-033 | **B2C prices tax-inclusive**; **corporate documents itemize 10% consumption tax** separately (`PAY-12`, `PAY-10`). | Finance + Legal | 2026-07-29 | [Business Rules](/docs/business-rules/invariants), `glossary.md` |
