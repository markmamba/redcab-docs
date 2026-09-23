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
| Terminology | [Glossary](/docs/product/business-rules/glossary) |
| Rules | [Business Rules](/docs/product/business-rules/invariants) |
| Requirements | [Requirements](/docs/product/requirements) |
| Ambiguity trace | [Traceability — Ambiguity](/docs/product/requirements/traceability-matrix/ambiguity-trace) |

---

## How to use this register
- Each entry has a stable `AMB-###` ID. Source IDs from origin docs (`Q#`, `PAY-A#`, PRD `A1`…`G1`) are cross-referenced so nothing is double-counted.
- **Classification:** Business | Engineering | Finance | Operational | Legal (primary class first; secondary in parentheses).
- **Priority:** `P0` blocks MVP or financial correctness; `P1` needed before the affected context ships; `P2` deferrable / confirmation-only.
- **Temporary Assumption:** the current working baseline so docs and planning can proceed; it is *not* a decision.
- **Status:** all `OPEN` until a named owner confirms; resolved items move to the Decision Log at the bottom.
- An entry is recorded once; related entries are linked rather than duplicated.

## Priority index
- **P0 (blockers):** AMB-021, **AMB-037** (cross-border exemption — highest severity), **AMB-040** (provider custody/release)
- **P1 (pre-ship):** AMB-001, AMB-006, AMB-008, AMB-009, AMB-010, AMB-013, AMB-014, AMB-024, AMB-025, AMB-026, AMB-038, AMB-039
- **P2 (confirmation / later):** AMB-015 through AMB-019, AMB-027, AMB-028, AMB-031, AMB-034, AMB-035
- **RESOLVED (Decision Log):** AMB-003 (reaffirmed), AMB-004, AMB-005, AMB-007, AMB-011, AMB-012, AMB-020, AMB-022, AMB-023, AMB-029, AMB-030, AMB-033, AMB-036
- **REVERSED (superseded by [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation)):** AMB-001 (custody element), AMB-002, AMB-032

---

## A. Finance (money movement, settlement, commission)

### AMB-001 — Authorization vs. Capture model
- **Status:** **PARTIALLY REVERSED** — the custody element of the 2026-07-29 resolution ("on Platform Stripe account", "funds held on Platform") is withdrawn per [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation). Capture timing is reopened as `AMB-039`.
- **Sources:** state-machine `Q2`; payments `PAY-A1`; legal payment-flow memos (2026-08).
- **Classification:** Finance (Engineering).
- **Question:** Is the buyer's card **captured at checkout** (Model A) or **authorized at checkout and captured later** (Model B)?
- **Impact:** Determines when Provider funds are fundable, refund mechanics, and timeout semantics. Custody is no longer part of this question — `PAY-13` fixes custody with the payment provider regardless of capture timing, and `ADR-015` C9 makes capture timing an independent axis.
- **Affected contexts:** Payments & Payouts, Booking & Checkout, Notifications.
- **Temporary assumption:** Model A (capture at checkout) pending lead-time data (`AMB-039`).
- **Priority:** P1 (downgraded — no longer gates the custody model).
- **Owner:** Finance + Engineering.

### AMB-002 — Charge topology and custody location
- **Status:** **REVERSED** — the 2026-07-29 resolution (Separate Charges & Transfers on the Platform account) is withdrawn; re-resolved 2026-08-30 as sub-merchant settlement with deferred release. See Decision Log and [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation).
- **Sources:** payments `PAY-A4`; legal payment-flow memos (2026-08).
- **Classification:** Legal (Finance, Engineering).
- **Question:** Which charge topology, and — decisively — whose balance legally holds the funds while they are held?
- **Impact:** Sets merchant-of-record and determines whether Red Cab triggers Funds Transfer Business registration. The original resolution put custody on the Platform account, which is the exact activity the transaction-platform exemption exists to distinguish Red Cab from.
- **Affected contexts:** Payments & Payouts; Provider Onboarding (sub-merchant KYC).
- **Priority:** P0.
- **Owner:** Legal + Finance + Engineering.
- **Note:** Per-provider custody mechanics remain open as `AMB-040`.

### AMB-003 — Automatic settlement vs. platform-controlled Payout Queue
- **Status:** **RESOLVED and REAFFIRMED** — originally resolved 2026-07-29 on operational grounds; reaffirmed 2026-08-30 on **compliance** grounds per [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation) C2/C5 and `PAY-15`.
- **Sources:** payments `PAY-A7`; planning conflict (auto-payout vs manual queue); legal payment-flow memos (2026-08).
- **Classification:** Legal (Finance, Engineering).
- **Question:** Are Provider funds settled automatically at charge time, or held and released via the platform **Payout Queue** after a completion determination?
- **Impact:** Now load-bearing for the transaction-platform exemption, not merely for operational control. Automatic settlement at capture would leave Red Cab exercising no control over transaction completion, weakening the exemption argument even though it satisfies the no-custody rule. The Payout Queue is the evidentiary artifact of that control.
- **Affected contexts:** Payments & Payouts, Booking & Checkout.
- **Priority:** P0.
- **Owner:** Legal + Finance + Engineering.
- **Note:** `split_at_capture` remains expressible but disfavored and requires recorded counsel sign-off (`ADR-015` C7).

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

### AMB-036 — Geography administrative model and spatial strategy
- **Status:** **RESOLVED** — see Decision Log (2026-08-15); storage clause partially superseded 2026-09-20 ([ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)).
- **Sources:** geography design review (administrative vs tourism taxonomy; GeoJSON/PostGIS evaluation).
- **Classification:** Business (Engineering).
- **Question:** What do District/Area represent editorially? Use GeoJSON/PostGIS for boundaries, lookup, and map features?
- **Decision:** District/Area are discovery *roles* on an administrative tree (`catalog_geographies`); C1 = 67 discovery roots (47 prefectures + 20 designated cities). Seed from official codes + city-hall points. No PostGIS at Phase 1. Tourism tags are a future layer on Listings. Designated cities as top-level navigation is a presentation rule, not a storage rule.
- **Impact:** Shapes Catalog schema, seed pipeline, discovery IA, and map features.
- **Affected contexts:** Catalog & Inventory (Geography, Search).
- **Priority:** P0.
- **Owner:** Product + Engineering.

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
- **Status:** **RESOLVED** — see Decision Log (2026-09-20). Option A: public browse of districts, areas, listings, and indicative pricing; authentication required only at checkout initiation.
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

### AMB-029 — Corporate provider settlement for bank-transfer funds
- **Status:** **RESOLVED** — see Decision Log (2026-08-30). Corporate transfers are provider-collected via virtual account, so Provider settlement follows the same deferred-release path as card (`PAY-9`, `PAY-15`).
- **Sources:** payments `PAY-A12`; legal payment-flow memos (2026-08).
- **Classification:** Legal (Finance).
- **Question:** Since Corporate bank-transfer funds previously arrived outside the payment rail, how is the Provider's Net Payout settled?
- **Impact:** Funds landing in a Red Cab bank account for onward remittance was a more direct instance of the activity triggering Funds Transfer Business registration than the card path. Making furikomi a provider-collected payment method removes the off-rail path entirely.
- **Affected contexts:** Corporate Quotation & Invoicing, Payments & Payouts.
- **Priority:** P1.
- **Owner:** Legal + Finance.

### AMB-030 — Bank transfer reconciliation (manual confirm)
- **Status:** **RESOLVED** — see Decision Log (2026-08-30). Superseded: confirmation is provider-driven, not a manual Admin "Mark as Paid".
- **Sources:** PRD `E3`; legal payment-flow memos (2026-08).
- **Classification:** Operational (Finance, Legal).
- **Question:** Is Corporate transfer receipt confirmed manually by Admin, or by the payment provider?
- **Impact:** Manual confirmation presumed funds arriving in a Red Cab account, which `INV-13` forbids. Provider-confirmed receipt converges to provider truth like any other rail (`FIN-11`) and removes the manual step.
- **Affected contexts:** Corporate Quotation & Invoicing, Payments & Payouts.
- **Priority:** P2.
- **Owner:** Business Owner + Finance.

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
- **Status:** **REVERSED** — the 2026-07-29 resolution (Platform merchant-of-record) is withdrawn; re-resolved 2026-08-30 as **Provider merchant-of-record**. See Decision Log and [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation).
- **Sources:** derived from AMB-002; legal payment-flow memos (2026-08).
- **Classification:** Legal (Finance).
- **Question:** Is Red Cab the merchant-of-record, or the Provider?
- **Impact:** Tax collection/remittance, consumption-tax treatment, liability, and whether Red Cab is characterised as holding customer funds. Platform merchant-of-record is incompatible with `INV-13`.
- **Affected contexts:** Payments & Payouts, Corporate Quotation & Invoicing.
- **Priority:** P0.
- **Owner:** Legal + Finance.
- **Note:** Post-settlement liability recovery remains open as `AMB-038`.

### AMB-037 — Cross-border carve-back to the transaction-platform exemption
- **Sources:** legal payment-flow memo (2026-08), open item 3.
- **Classification:** Legal (Finance).
- **Question:** Does the transaction-platform exemption still apply given that Tourists pay from overseas, under the 2025 amendments to the Payment Services Act? What conditions would keep the arrangement exempt?
- **Impact:** **Decisive.** The target market is inbound tourists from English-speaking countries, so essentially all B2C payment volume is cross-border by design — this is the base case, not an edge case. A negative answer invalidates the exemption strategy regardless of how well the no-custody architecture is implemented, leaving Funds Transfer Business registration (1–2 years, ¥10 million reserve) as the fallback.
- **Affected contexts:** Payments & Payouts, Corporate Quotation & Invoicing, Identity & Access (payer jurisdiction capture).
- **Temporary assumption:** The exemption holds for cross-border collection where the provider is the legal receiver; payer country is captured and retained per transaction pending confirmation.
- **Priority:** **P0.**
- **Owner:** Legal.
- **Risk if unresolved:** The entire payment architecture rests on an exemption that may not apply. Highest-severity open item in the register.

### AMB-038 — Clawback mechanism for post-settlement refunds and disputes
- **Sources:** derived from AMB-032 reversal and `PAY-7`.
- **Classification:** Finance (Legal, Engineering).
- **Question:** With the Provider as merchant-of-record and refund liability assigned to the Provider (`FIN-14`), by what mechanism are funds recovered once settled — reversal against provider balance, deduction from future settlement, or invoice? What happens when none is available?
- **Impact:** `PAY-7` guarantees Tourists a 100% refund on Provider- or Admin-initiated cancellation. Post-settlement, honoring that guarantee depends entirely on clawback working. A Provider with one booking, no balance, no future volume, and no cooperation is an unrecovered loss the platform absorbs despite not being merchant-of-record.
- **Affected contexts:** Payments & Payouts, Provider Onboarding (contractual terms).
- **Temporary assumption:** Deferred release (`PAY-15`) keeps most refunds pre-settlement, where no recovery is needed; post-settlement recovery is a provider-selection requirement plus a contractual obligation on the Provider.
- **Priority:** P1.
- **Owner:** Finance + Legal.
- **Risk if unresolved:** A tourist-facing refund guarantee the platform cannot reliably honor.

### AMB-039 — Capture timing and booking lead time
- **Sources:** derived from AMB-001; `ADR-015` C9.
- **Classification:** Finance (Engineering, Business).
- **Question:** Is the Tourist's instrument captured at checkout, or authorized at checkout and captured nearer to service delivery? What is the actual distribution of booking-to-service lead time?
- **Impact:** Deferred capture is the strongest position on both sides of the two-sided test — no party holds funds during the wait, and Red Cab controls capture timing — but card authorizations expire in roughly seven days, and storing the instrument for later merchant-initiated capture adds 3DS complexity plus a decline-at-capture failure mode after the Provider has been committed. Viability depends entirely on lead time, and there is no data: the platform is pre-launch.
- **Affected contexts:** Payments & Payouts, Booking & Checkout, Catalog & Inventory (availability lead time).
- **Temporary assumption:** Capture at checkout; `capture_timing` is declared separately from `settlement_model` so this can change without domain rework. Booking-to-service lead time is instrumented from launch so the decision becomes data-driven.
- **Priority:** P1.
- **Owner:** Finance + Product + Engineering.
- **Risk if unresolved:** Provider hold-duration caps (`AMB-040`) may be exceeded by long-lead bookings.

### AMB-040 — Custody location and release control per candidate provider
- **Sources:** legal payment-flow memo (2026-08), open item 1; derived from AMB-002.
- **Classification:** Engineering (Legal, Finance).
- **Question:** For each candidate provider (Stripe Connect, Komoju, PAY.JP): whose balance legally holds the funds while held, who controls the release trigger, is the provider contractually the legal receiver of funds, and what is the maximum hold duration? Which providers support virtual-account bank transfer for the Corporate rail, and clawback against a sub-merchant?
- **Impact:** Gates provider selection. Requiring custody at the provider **and** platform-triggered release (`PAY-13` with `PAY-15`) is a demanding combination that some providers cannot satisfy — and it is not answerable from public documentation, only from the provider's contract terms. Corporate virtual-account support may be the deciding factor.
- **Affected contexts:** Payments & Payouts, Provider Onboarding, Corporate Quotation & Invoicing.
- **Temporary assumption:** No provider is assumed. The domain branches only on declared capability (`ADR-015` C6), so selection can be deferred without blocking build.
- **Priority:** **P0.**
- **Owner:** Engineering + Legal + Finance.
- **Risk if unresolved:** Building a provider-shaped integration before confirming it satisfies the custody and control conditions repeats the error `ADR-015` exists to correct.

### AMB-033 — Consumption tax treatment
- **Status:** **RESOLVED** — see Decision Log (2026-07-29). Note: the `AMB-032` reversal moves merchant-of-record to the Provider, which may affect consumption-tax collection responsibility; to be confirmed with `AMB-037`.
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
| AMB-001 | ~~**Capture at checkout** on Platform Stripe account. Funds held on Platform until Booking `COMPLETED`.~~ **Custody element reversed 2026-08-30** — see below. Capture timing reopened as `AMB-039`. | Product + Finance + Engineering | 2026-07-29 | [Business Rules](/docs/product/business-rules/invariants) (`PAY-13`), `payments-architecture.md`, `booking-state-machine.md`, `phasing.md` |
| AMB-002 | ~~**Separate Charges & Transfers** (not Destination Charges). Charge Tourist on Platform account; transfer Provider net via Payout Queue after completion.~~ **Reversed 2026-08-30** — see below. | Finance + Legal + Engineering | 2026-07-29 | `payments-architecture.md`, `glossary.md`, `phasing.md` |
| AMB-003 | **Platform-controlled Payout Queue** after `COMPLETED`. No automatic Provider settlement at charge time. *(Reaffirmed 2026-08-30 on compliance grounds — see below.)* | Finance + Engineering | 2026-07-29 | [Business Rules](/docs/product/business-rules/invariants) (`PAY-14`, `PAY-15`), `payments-architecture.md`, `domain-models.md` |
| AMB-004 | Payout disbursement occurs only after Booking `COMPLETED` and Payout Queue Entry processing. Refund before `DISBURSED` voids queue entry (`PAY-8`, `FIN-5`). | Finance | 2026-07-29 | `payments-architecture.md`, `booking-state-machine.md` |
| AMB-005 | Payout Queue Entry lifecycle: **`QUEUED → PROCESSING → DISBURSED \| FAILED`** (`LC-13`, `LC-14`). Failed entries retriable; Admin alerted. | Engineering | 2026-07-29 | [Business Rules](/docs/product/business-rules/invariants), `payments-architecture.md`, `domain-models.md` |
| AMB-007 | Snapshots authoritative at **CheckoutSession creation** (`PRC-8`, `BKG-9`); copied to Booking at materialization. PaymentIntent amount MUST match snapshotted gross. | Engineering | 2026-07-29 | `glossary.md`, [Business Rules](/docs/product/business-rules/invariants), `booking-state-machine.md`, `data-model.md` |
| AMB-011 | B2C card path **enters `CONFIRMED` on payment success** (`BKG-10`); no `PENDING` on happy path. Auto-confirm timer N/A for B2C. | Product + Engineering | 2026-07-29 | `booking-state-machine.md`, [Business Rules](/docs/product/business-rules/invariants) |
| AMB-012 | Seat restoration **idempotent** on cancellation/session expiry; skipped for elapsed slots; per-vehicle restores full capacity unit (`CON-5`, `CON-6`). | Engineering | 2026-07-29 | [Business Rules](/docs/product/business-rules/invariants) (`CON-5`) |
| AMB-020 | Primary discovery navigation: **District → Area** hierarchy. Service type is a **filter** (`D-02`), not primary IA. | Product Owner | 2026-07-29 | `glossary.md`, `functional-requirements.md`, `phasing.md` |
| AMB-022 | **Option A — public browse, auth at checkout only.** Visitors may browse catalog content and see indicative pricing without an account. No partial gate, no price masking. Canonical public URLs: `/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]`. `/discover` rejected. | Product Owner | 2026-09-20 | [Spec #56](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract), [Session A record](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture), `iam.md` (`FR-IAM-012`), `non-functional-requirements.md` (`NFR-SEC-005`), `tourist-ui-pre-phase-2.md`, `domain-to-code-mapping.md` |
| AMB-023 | Canonical vehicle taxonomy: **PRD set** — Alphard, HiAce, Sedan, Limousine (private car); 20/40/50-seat bands (charter bus). Stored on `provider_assets.vehicle_category`. | Business + Engineering | 2026-07-29 | `glossary.md`, `domain-models.md` |
| AMB-032 | ~~**Platform merchant-of-record** for card charges; **Provider seller-of-record** for underlying service.~~ **Reversed 2026-08-30** — see below. | Legal + Finance | 2026-07-29 | `payments-architecture.md`, `glossary.md` |
| AMB-033 | **B2C prices tax-inclusive**; **corporate documents itemize 10% consumption tax** separately (`PAY-12`, `PAY-10`). | Finance + Legal | 2026-07-29 | [Business Rules](/docs/product/business-rules/invariants), `glossary.md` |
| AMB-036 | Geography: administrative seed (codes + centroids); C1 discovery roots (67); tree storage per [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree); no PostGIS Phase 1; tourism tags on Listings later. *Storage clause "designated cities as Districts" superseded — presentation rule only.* | Product + Engineering | 2026-08-15 | [Geography](/docs/architecture/patterns/geography), [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data), [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) |
| — | **Service timezone:** IANA zone on `catalog_geographies`; snapshotted on CheckoutSession/Booking; Phase 1 Japan seed `Asia/Tokyo` from `catalog_countries.default_timezone`; no hardcoded zones in domain code | Product + Engineering | 2026-08-23 | [ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model), [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree), [Date / Time / Timezone](/docs/engineering/conventions/datetime-and-timezones), `glossary.md`, `invariants.md` (`OPR-11`, `OPR-12`) |

### Revisions — 2026-08-30 (payment custody and control)

Driven by the legal payment-flow memos (August 2026) and the objective of qualifying for the **transaction-platform exemption** rather than registering as a Funds Transfer Business. Recorded in [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation), which is **Proposed pending counsel** — these revisions are the working baseline, not a confirmed legal position.

| AMB ID | Revision | Decided by | Date | Docs updated |
| --- | --- | --- | --- | --- |
| AMB-001 | **Custody element reversed.** Funds are held by the licensed payment provider, not on a Platform account. Capture timing is now an independent axis, reopened as `AMB-039`. | Product + Finance + Engineering (pending Legal) | 2026-08-30 | [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation), [Business Rules](/docs/product/business-rules/invariants) (`PAY-13`, `INV-13`), [Payments Architecture](/docs/architecture/patterns/payments-architecture) |
| AMB-002 | **Reversed.** Sub-merchant settlement with deferred, platform-triggered release replaces Separate Charges & Transfers on the Platform account. Red Cab is never the legal recipient of funds. | Finance + Engineering (pending Legal) | 2026-08-30 | [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation), [Business Rules](/docs/product/business-rules/invariants) (`PAY-13`), [Payments Architecture](/docs/architecture/patterns/payments-architecture), `pay.md` |
| AMB-003 | **Reaffirmed on compliance grounds.** The platform-controlled Payout Queue is retained because control of transaction completion is a condition of the exemption, not merely operational preference (`PAY-15`). | Finance + Engineering (pending Legal) | 2026-08-30 | [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation), [Business Rules](/docs/product/business-rules/invariants) (`PAY-15`, `PAY-16`) |
| AMB-029 | **Resolved.** Corporate transfers are provider-collected via per-transaction virtual account, so Provider settlement follows the same deferred-release path as card. No off-rail settlement remains. | Finance + Engineering (pending Legal) | 2026-08-30 | [Business Rules](/docs/product/business-rules/invariants) (`PAY-9`), [Payments Architecture](/docs/architecture/patterns/payments-architecture), `pay.md` (`FR-PAY-014`) |
| AMB-030 | **Resolved / superseded.** Corporate transfer receipt is confirmed by the payment provider, not by manual Admin entry — manual confirmation presumed funds in a Red Cab account, which `INV-13` forbids. | Finance + Engineering (pending Legal) | 2026-08-30 | [Business Rules](/docs/product/business-rules/invariants) (`PAY-9`), `pay.md` (`FR-PAY-014`) |
| AMB-032 | **Reversed.** The **Provider** is merchant-of-record for the underlying service; Red Cab is merchant-of-record for nothing. Post-settlement refund and dispute liability sits with the Provider (`FIN-14`), recovered by clawback (`AMB-038`). | Legal + Finance (pending counsel opinion) | 2026-08-30 | [ADR-015](/docs/architecture/decisions/adr-015-payment-custody-and-control-separation), [Business Rules](/docs/product/business-rules/invariants) (`PAY-13`), [Payments Architecture](/docs/architecture/patterns/payments-architecture) |
| — | **New open questions raised:** `AMB-037` cross-border carve-back (P0, highest severity), `AMB-038` clawback mechanism, `AMB-039` capture timing and lead time, `AMB-040` custody location and release control per provider (P0). | Engineering | 2026-08-30 | [Open Questions](/docs/product/planning/open-questions), [Payments Architecture](/docs/architecture/patterns/payments-architecture) |

### Revisions — 2026-09-20 (geography administrative tree)

Driven by [Geography data model review](/docs/engineering/specs/cat/geography/design-review-data-model) and locked Option C / C1 decisions. Recorded in [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree).

| AMB ID | Revision | Decided by | Date | Docs updated |
| --- | --- | --- | --- | --- |
| AMB-036 | **Partially superseded.** Storage moves to `catalog_countries` + `catalog_geographies` tree ([ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)). **C1 locked:** 67 discovery roots (47 prefectures + 20 designated cities). Clause "designated cities as Districts; wards as Areas" remains true as *navigation/presentation*; false as *storage*. Official-code seed, no PostGIS, haversine near-me, tourism-tags-on-Listings, `INV-8`, `PRC-1`, `BKG-11` unchanged. No `/jp` URL prefix. | Product + Engineering | 2026-09-20 | [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree), [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) (partial supersede), [Geography](/docs/architecture/patterns/geography), `glossary.md`, `invariants.md`, `cat.md`, [ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model) |
