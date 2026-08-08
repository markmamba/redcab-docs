---
title: Master Matrix
sidebar_label: Master
sidebar_position: 2
description: Traceability matrix — master matrix.
---

## TL;DR

- **Master matrix** — one row per requirement with source, governing rules/context, and acceptance criterion.
- Organized by owning context: IAM, PRV, CAT, BKG, PAY, COR, REV, NOT, plus NFR sections.

## About this document

Four-way mapping table for all requirements.

| Topic | Document |
| --- | --- |
| Matrix index | [Traceability Matrix](/docs/requirements/traceability-matrix) |
| FRs | [Functional Requirements](/docs/requirements/functional-requirements) |

---

## 1. Master matrix

### 1.1 IAM — Identity & Access
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-IAM-001 | A-01 | glossary (Account); IAM | Visitor submitting a valid email, conforming password (≥8 chars, ≥1 number), and matching confirmation gets a Tourist Account. |
| FR-IAM-002 | A-01 | IAM | Registration with an email already on an Account is rejected and indicates an account exists. |
| FR-IAM-003 | A-01 | IAM | When password ≠ confirmation, no Account is created. |
| FR-IAM-004 | A-01 | NOT; IAM | A newly registered Tourist receives an email verification. |
| FR-IAM-005 | A-02 | IAM | Valid credentials establish an authenticated session. |
| FR-IAM-006 | A-02 | SEC posture; IAM | Invalid credentials produce a single non-specific failure revealing no field. |
| FR-IAM-007 | A-02 | OPR-1; IAM | 5 consecutive failures lock the Account 15 min and notify the holder. |
| FR-IAM-008 | A-01, meeting-notes | glossary (Account); IAM | Email/password authenticates; Google sign-in works if offered; captcha may gate registration. |
| FR-IAM-009 | 1.1–1.6 | bounded-contexts (IAM) | An Actor reaches only Role-permitted surfaces; all others are blocked. |
| FR-IAM-010 | A-01, G-03 | OPR-9; IAM | First login prompts EN/JA, persists the choice, and does not re-prompt unless changed. |
| FR-IAM-011 | G-03 | OPR-9; IAM | Dismissing selection defaults to EN and re-presents the choice next login. |
| FR-IAM-012 | 1.1, B-01, meeting-notes | IAM | Visitors browse public discovery; initiating a booking requires an authenticated Tourist/Corporate. |
| FR-IAM-013 | A-08 | glossary (Corporate Client); IAM | Corporate registration captures organization identity + group-size range and records type Corporate. |

### 1.2 PRV — Provider Onboarding & Verification
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-PRV-001 | A-03 | INV-9; PRV | Registering Provider selects a Provider Type and is asked only for type-applicable fields. |
| FR-PRV-002 | A-03 | INV-9; PRV | Provider Type cannot change after registration except via Admin. |
| FR-PRV-003 | A-03, 1.4 | INV-6, LC-7, LC-8; PRV | New Provider is Pending: cannot list or receive bookings and is invisible to Tourists. |
| FR-PRV-004 | A-04 | PRV | Required document set is shown per type; files above the size limit are rejected. |
| FR-PRV-005 | A-04 | NOT; PRV | Submit-for-review is allowed once required docs are uploaded; Admin is notified. |
| FR-PRV-006 | A-05 | LC-8, LC-9; PRV | Approval is possible only when all checklist items pass; status→Approved and license-verified date recorded. |
| FR-PRV-007 | A-05 | PRV | Reject sets Rejected; correction request keeps Pending; Provider notified in both cases. |
| FR-PRV-008 | A-05 | OPR-4; PRV | A Pending registration with no Admin action >14 days is flagged Overdue. |
| FR-PRV-009 | A-07 | OPR-2; PRV | On approval a 3-month trial starts from approval and remaining time is observable. |
| FR-PRV-010 | A-07 | OPR-2; PRV | After trial expiry support requests are gated; Provider notified before and on expiry. |
| FR-PRV-011 | A-06 | OPR-3; PRV | A license within 30 days of expiry triggers a Provider warning. |
| FR-PRV-012 | A-06 | INV-7, OPR-3; PRV | License expiry pauses all the Provider's listings and alerts Admin; renewal restores them. |
| FR-PRV-013 | Admin Panel | INV-6; PRV | Admin can suspend/unsuspend; a suspended Provider's listings are not bookable. |

### 1.3 CAT — Catalog & Inventory
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-CAT-001 | B-05 | CAT (Geography) | Admin can create/edit/deactivate Districts and Areas, each with EN + JA labels. |
| FR-CAT-002 | B-05 | OPR-10, INV-11; CAT | Deactivating a District with active listings requires count-stating confirmation and sets them Unlisted, not deleted. |
| FR-CAT-003 | B-01, B-02 | INV-8; CAT | Only Districts/Areas with ≥1 Published listing appear; empty areas are indicated. |
| FR-CAT-004 | B-01–B-03 | CAT | Tourists discover services through District→Area. |
| FR-CAT-005 | B-03 | PRC (starting price), REV (rating); CAT | Each Published listing in an Area shows name, provider, photo, starting price, type, rating, review count. |
| FR-CAT-006 | B-03, E-11 | CON-3; CAT | A date-fully-booked listing is shown marked fully booked, not hidden. |
| FR-CAT-007 | B-04 | CAT | Detail shows description, gallery, breakdown, provider, type, location, availability, policy, reviews; type attrs for guides/buses. |
| FR-CAT-008 | B-04 | CAT | A suspended/unavailable provider's listing shows a temporarily-unavailable state, not an error/blank. |
| FR-CAT-009 | C-01 | LC-8; CAT | An Approved Provider can create a listing with type-applicable attributes. |
| FR-CAT-010 | C-01 | INV-6, LC-8; CAT | A non-Approved Provider cannot create a listing. |
| FR-CAT-011 | C-02 | CAT | Photos in permitted formats ≤ size limit are accepted, others rejected; first photo is the thumbnail. |
| FR-CAT-012 | C-02 | INV-10; CAT | A listing with zero photos cannot be published. |
| FR-CAT-013 | C-03 | PRC-3; CAT | Pricing mode (per-person or per-vehicle/flat) is set and price is presented/computed accordingly. |
| FR-CAT-014 | C-04 | PRC-4; CAT | Up to five non-overlapping tiers are allowed; overlaps are rejected. |
| FR-CAT-015 | C-05 | PRC-2; CAT | Duration-based rates are allowed where type-applicable. |
| FR-CAT-016 | C-06 | PRC-5; CAT | Labeled date-range overrides/multipliers apply to in-range dates. |
| FR-CAT-017 | C-07 | PRC-6; CAT | Mandatory extras are in the displayed total; optional extras are Tourist-selectable. |
| FR-CAT-018 | C-08 | PRC-7; CAT | Up to four cancellation tiers per listing; Platform Default applies when none set. |
| FR-CAT-019 | C-09 | CAT (Availability) | Slots take date/start/end/capacity; non-positive durations and past slots are rejected. |
| FR-CAT-020 | C-10 | CON-4; CAT | No two slots overlap on one Asset; boundary-touching is allowed; cross-Asset overlap is allowed. |
| FR-CAT-021 | E-11, B-03 | INV-3, CON-3; CAT | Remaining capacity is shown; a zero-seat slot presents as fully booked. |
| FR-CAT-022 | C-11 | INV-11, BKG-8; CAT | Edit/unpublish warns on confirmed future bookings, preserves history, and does not affect confirmed bookings. |
| FR-CAT-023 | D-01 | CAT (Search) | Tourists can filter to listings with ≥1 available slot on a date. |
| FR-CAT-024 | D-02 | CAT (Search) | Filtering by service type is available. |
| FR-CAT-025 | D-03 | CAT (Search) | Filtering by supported language and group size is available, conjunctive when combined. |
| FR-CAT-026 | D-04 | PRC-2; CAT | Filtering by price range (starting price) is available, with clear-all. |
| FR-CAT-027 | D-05 | CAT (Search) | Sorting by recommended/price↑↓/rating/reviews/newest is available. |
| FR-CAT-028 | architecture | PRC-1; CAT | Display, filtering, and checkout prices for the same inputs are identical (single authority). |

### 1.4 BKG — Booking & Checkout
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-BKG-001 | E-01 | CON-2, CON-3, INV-4; BKG | Selecting an available slot shows time/price/remaining; a now-full slot's selection is rejected. |
| FR-BKG-002 | E-02 | INV-1, PRC-8; BKG | Checkout summary shows service/date/seats/breakdown/extras/total/policy; the price is the unchanging snapshot. |
| FR-BKG-003 | E-02 | BKG-1; BKG | Explicit policy agreement is required before payment; payment is blocked otherwise. |
| FR-BKG-004 | E-02, E-10, E-11 | BKG-2, CON-1, INV-1; BKG | On payment success, booking + snapshot freeze + seat reserve commit atomically; any failure yields none. |
| FR-BKG-005 | E-02 | PAY-5, FIN-9; BKG | Payment failure yields no booking and no reserved seats. |
| FR-BKG-006 | E-02, E-11 | CON-2; BKG | Concurrent last-seat attempts allow only enough to reach zero; the rest are rejected fully booked. |
| FR-BKG-007 | E-09 | LC-1..6; BKG | Only permitted transitions occur; no terminal-exit or backward transitions. |
| FR-BKG-008 | E-09 | BKG-10, LC-2; BKG | B2C: materialize CONFIRMED on payment; notify Tourist + Provider. |
| FR-BKG-009 | E-09 | LC-5, OPR-11, OPR-12; BKG | Mark Delivered or auto-complete 24h post service end (JST). |
| FR-BKG-016 | E-02 | BKG-9, CON-1; BKG | CheckoutSession with snapshots + seat hold + PaymentIntent. |
| FR-BKG-017 | E-02 | BKG-11; BKG | Fulfillment payload fields at checkout. |
| FR-BKG-018 | E-09 | OPR-11; BKG | Provider Mark Delivered action. |
| FR-CAT-029 | C-09 | CON-4; CAT | Provider asset registration. |
| FR-CAT-030 | architecture | INV-12, LC-12; CAT | Publish requires Stripe Connected Account. |
| FR-CAT-031 | E-02 | CON-6; CAT | Per-vehicle booking consumes full slot capacity. |
| FR-BKG-009 | E-09 | LC-5; BKG | Confirmed→Completed only after service time has passed and is marked delivered. |
| FR-BKG-010 | E-09, E-12 | CON-5, PAY-6; BKG | Tourist cancel of an eligible booking restores seats; refund derives from the snapshotted policy. |
| FR-BKG-011 | E-12 | PAY-7, CON-5; BKG | Provider/Admin cancel restores seats and grants a 100% refund regardless of policy. |
| FR-BKG-012 | E-03 | BKG-3; BKG | Bundle creates two linked bookings with independent commission; each Provider notified. |
| FR-BKG-013 | E-04 | BKG-4, BKG-5; BKG | Multi-day single-provider checkout verifies every day's slot first and identifies any unavailable day. |
| FR-BKG-014 | E-08 | BKG-6; BKG | Corporate submits a manifest on a confirmed group booking, viewable by the assigned Provider. |
| FR-BKG-015 | C-11, E-10 | INV-1, BKG-8; BKG | Snapshotted commercial terms stay unchanged despite later listing/policy edits. |

### 1.5 PAY — Payments & Payouts
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-PAY-001 | E-02 | FIN-3, INV-1; PAY | The buyer is charged the snapshotted gross via the payment provider. |
| FR-PAY-002 | E-10 | PAY-4, INV-2; PAY | On payment, gross/rate/amount/net are frozen as an immutable commission snapshot. |
| FR-PAY-003 | E-10 | PAY-2; PAY | Rate changes apply only to subsequent bookings; historical bookings retain their snapshot. |
| FR-PAY-004 | E-10, C-07 | PAY-3, FIN-7; PAY | Commission is computed on the total including mandatory extra charges. |
| FR-PAY-005 | E-09, E-13 | LC-6; PAY | A completed booking enters the payout queue carrying its frozen net. |
| FR-PAY-006 | E-12 | PAY-6, FIN-6; PAY | Refunds are computed from snapshotted policy + values, never a live rate. |
| FR-PAY-007 | E-12 | PAY-8, FIN-5; PAY | The same booking's funds are never both paid out and refunded. |
| FR-PAY-008 | E-02, E-11 | FIN-10; PAY | Duplicate payment/settlement signals produce no duplicate charge/refund/payout. |
| FR-PAY-009 | E-13 | FIN-3; PAY | Admin sees all transactions (gross/commission/net/booking+payout status), filterable, with frozen split. |
| FR-PAY-010 | Admin Panel, E-10 | PAY-2; PAY | Admin can set the platform-wide commission rate. |

### 1.6 Corporate — Quotation & Invoicing
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-COR-001 | E-05 | COR | Corporate submits a quotation request (trip/dates/passengers/locations/type/requirements). |
| FR-COR-002 | E-05 | OPR-5; COR | Requests are shown to Admin; an alert fires when unanswered >3 business days. |
| FR-COR-003 | E-06 | PAY-10; COR | Admin issues a quotation with line items, 10% tax, due date, bank details, validity; delivered to client. |
| FR-COR-004 | E-06 | LC-11; COR | Acceptance generates an invoice and converts the quotation into a booking awaiting payment. |
| FR-COR-005 | E-07 | PAY-9; COR | A corporate booking confirms only when Admin records the bank-transfer receipt; client+provider notified. |
| FR-COR-006 | E-07 | OPR-5; COR | Admin is alerted when a corporate booking's payment deadline passes unconfirmed. |
| FR-COR-007 | A-08 | COR | Corporate booking history is organized by trip/event, not by booking identifier. |

### 1.7 REV — Reviews & Ratings
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-REV-001 | F-01 | INV-5, BKG-7; REV | A review is allowed only for a completed booking, at most one per booking. |
| FR-REV-002 | F-01 | OPR-7, OPR-8; REV | A review invitation issues on completion; a review is accepted only within 14 days. |
| FR-REV-003 | F-01 | REV | A required star rating plus optional text/photos within limits is accepted. |
| FR-REV-004 | F-01, F-03 | OPR-6; REV | A submitted review is held pending moderation and not public until Admin approves. |
| FR-REV-005 | F-03 | REV | Admin can approve/remove with a reason (Tourist notified on removal); flagged reviews prioritized. |
| FR-REV-006 | F-02 | REV | A Provider can respond publicly once; further edits require Admin permission. |
| FR-REV-007 | F-04 | OPR-6; REV | Rating score and review count are computed from approved reviews only. |

### 1.8 NOT — Notifications
| Req ID | Source | Governs (rules / context) | Acceptance criterion (observable) |
| --- | --- | --- | --- |
| FR-NOT-001 | G-01, G-02 | OPR-8; NOT | Tourist and Provider are notified of a new booking within 60 seconds of creation. |
| FR-NOT-002 | G-01, G-02 | NOT | Affected parties are notified on confirmation, cancellation, and refund. |
| FR-NOT-003 | G-03, G-04 | OPR-9; NOT | Each notification is rendered in the recipient's stored language preference. |
| FR-NOT-004 | G-01, G-02 | NOT | SMS is additionally sent when the recipient has a verified phone and SMS is enabled. |
| FR-NOT-005 | A-05, A-06, A-07, E-05, E-07 | OPR-3, OPR-4, OPR-5; NOT | Scheduled alerts issue for license/trial expiry and overdue registration/quotation/payment. |

### 1.9 NFR — Non-functional (by category)
| Req ID | Scope (context) | Source | Governs (rules) | Acceptance criterion (observable) |
| --- | --- | --- | --- | --- |
| NFR-TIME-001 | NOT | G-01, G-02 | OPR-8 | Booking-confirmation notifications dispatch within 60s of the creation event. |
| NFR-TIME-002 | NOT | G-01, G-02 | OPR-8 | Confirmation/cancellation/refund notifications dispatch without undue delay. |
| NFR-TIME-003 | PRV | A-06 | OPR-3 | A Provider is warned within 30 days before license expiry. |
| NFR-TIME-004 | PRV | A-05 | OPR-4 | A Pending registration is flagged Overdue after >14 days of no Admin action. |
| NFR-TIME-005 | COR | E-05 | OPR-5 | An overdue alert fires when a quotation request is unanswered >3 business days. |
| NFR-TIME-006 | COR | E-07 | OPR-5 | A payment-overdue alert fires when a transfer deadline passes without receipt. |
| NFR-TIME-007 | REV | F-01 | OPR-7 | A review is accepted only within 14 days of completion. |
| NFR-TIME-008 | IAM | A-02 | OPR-1 | A locked Account stays locked 15 min after 5 failures before further attempts. |
| NFR-TIME-009 | BKG | E-09 | LC-2 | Auto-confirmation never elapses past the service start time. |
| NFR-PERF-001 | CAT | B-01..D-05 | — | Discovery/search results return within a responsive interval under expected load. |
| NFR-PERF-002 | CAT | architecture | PRC-1, PRC-2 | Display/filter/checkout prices for the same inputs show no divergence. |
| NFR-PERF-003 | BKG | E-02, E-11 | CON-2, CON-3 | A checkout attempt resolves promptly to booked or fully-booked, even under contention. |
| NFR-AVAIL-001 | all | platform op | — | The platform meets its published availability target during operating hours. |
| NFR-AVAIL-002 | CAT | B-04 | — | Unavailable provider listings render a temporarily-unavailable state, not an error/blank. |
| NFR-AVAIL-003 | PAY | E-02, E-11 | FIN-10 | Retries/duplicate signals do not produce duplicate charges/refunds/payouts. |
| NFR-AVAIL-004 | PAY | payments-arch | FIN-11 | Internal Payments state converges to rail truth; divergence surfaces as a reconcilable fact. |
| NFR-SEC-001 | IAM | A-02 | — | Invalid credentials return one non-specific failure disclosing no field. |
| NFR-SEC-002 | IAM | A-02 | OPR-1 | An Account locks after 5 consecutive failures and the holder is notified. |
| NFR-SEC-003 | IAM | A-01 | — | Passwords require ≥8 chars including ≥1 number when set. |
| NFR-SEC-004 | IAM | 1.1–1.6 | — | Each Actor is confined to Role-permitted surfaces; others blocked. |
| NFR-SEC-005 | IAM | 1.1, B-01 | — | Booking initiation requires an authenticated Tourist/Corporate account. |
| NFR-SEC-006 | PRV, CAT | A-04, C-02 | — | Uploads outside permitted size/format are rejected. |
| NFR-SEC-007 | IAM | A-01, meeting-notes | — | Email/password is supported; Google sign-in optional; captcha may gate registration. |
| NFR-PRIV-001 | BKG | E-08 | BKG-6 | A manifest is viewable only by the assigned Provider and submitting Corporate Client. |
| NFR-PRIV-002 | PRV | A-04, A-05 | — | License documents are accessible only to the Provider and Admin. |
| NFR-PRIV-003 | CAT | C-11, B-05 | INV-11 | Historical booking data is preserved (never deleted) on pause/unlist/deactivate. |
| NFR-PRIV-004 | all | platform op | — | Personal data is protected from disclosure to unauthorized parties. |
| NFR-AUD-001 | PAY | E-10, E-13 | FIN-3 | Every money movement traces to exactly one booking and its snapshot. |
| NFR-AUD-002 | BKG, PAY | C1, E-10 | INV-1, FIN-2 | Price/commission snapshots stay immutable for the booking's life. |
| NFR-AUD-003 | PAY | E-12 | FIN-6, PAY-6 | Payout/refund amounts derive from snapshot values, never a live rate. |
| NFR-AUD-004 | PAY | E-02, E-11 | FIN-10 | Every money operation is idempotent and uniquely keyed against duplicates. |
| NFR-AUD-005 | PAY | E-12 | FIN-5, PAY-8 | An auditable state shows payout and refund mutually exclusive per booking's funds. |
| NFR-AUD-006 | PAY | E-13 | FIN-3 | Admin overview shows gross/commission/net/booking+payout status with frozen split. |
| NFR-I18N-001 | NOT, IAM | G-03, G-04 | OPR-9 | Surfaces and notifications render in the recipient's stored EN/JA preference. |
| NFR-I18N-002 | IAM | G-03, G-04 | OPR-9 | Tourist app defaults EN, Client Portal defaults JA absent a stored preference. |
| NFR-I18N-003 | CAT | B-05 | — | Every District/Area carries EN and JA labels. |
| NFR-I18N-004 | CAT | D-03 | — | Listings are filterable across the supported-language set. |
| NFR-I18N-005 | PAY, CAT | glossary (Money) | PAY-1, FIN-8 | All amounts are presented and charged in whole JPY. |
| NFR-I18N-006 | COR | E-04, E-06 | — | Formal corporate documents render kanji/kana correctly. |
| NFR-A11Y-001 | CAT | (none yet) | — | Tourist-facing surfaces meet a published accessibility baseline (source/owner pending). |
| NFR-COMP-001 | COR | E-06 | PAY-10 | corporate quotation/invoice documents itemize the 10% consumption tax. |
| NFR-COMP-002 | PAY | glossary (Money) | PAY-1, FIN-8 | Charges/refunds/payouts use only whole JPY; no fractional yen. |
| NFR-COMP-003 | COR | E-04, E-06 | — | corporate documents are acceptable as formal Japanese commercial documents. |
| NFR-COMP-004 | PAY, COR | payments-arch | — | Charge/document flows reflect the established merchant/seller-of-record posture. |

---
