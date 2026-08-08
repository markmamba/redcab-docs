---
title: Ambiguity Trace
sidebar_label: Ambiguity
sidebar_position: 5
description: Traceability matrix — ambiguity trace.
---

## TL;DR

- **Ambiguity trace:** `AMB-###` → Provisional requirements affected.
- Tracks which FRs/NFRs cannot be finalized until open decisions resolve.

## About this document

Open-question to provisional-requirement mapping.

| Topic | Document |
| --- | --- |
| Open decisions | [Open Questions](/docs/ambiguities/open-questions) |
| Provisional FRs | [Provisional Index](/docs/requirements/functional-requirements/provisional-index) |

---

## 4. Ambiguity trace — `AMB-###` → Provisional requirements
Provisional requirements (README §8) cannot reach Approved until the cited item resolves via the Decision Log in [../ambiguities/open-questions.md](/docs/ambiguities/open-questions).

| AMB | Theme | Provisional requirements |
| --- | --- | --- |
| AMB-006 | Refund-failure handling | NFR-AVAIL-004 |
| AMB-009 | Commission base | FR-PAY-004 |
| AMB-011 | Corporate auto-confirm timer | NFR-TIME-009 (corporate paths only) |
| AMB-013 | Missing transitions | (Phase 2 — no provisional FR beyond FR-BKG-010 scope) |
| AMB-014 | Cancellation initiator | FR-BKG-010 |
| AMB-016 | Lockout parameters | FR-IAM-007; NFR-SEC-002; NFR-TIME-008 |
| AMB-017 | Bundle cancellation | FR-BKG-012 |
| AMB-019 | Review moderation/window | FR-REV-002, -004; NFR-TIME-007 |
| AMB-020 | Navigation model | *(Resolved — FR-CAT-004 Approved)* |
| AMB-021 | Auth methods | FR-IAM-008; NFR-SEC-007 |
| AMB-022 | Guest scope | FR-IAM-012; NFR-SEC-005 |
| AMB-024 | Supported / default languages | FR-CAT-025; NFR-I18N-002, -004 |
| AMB-025 | Currency | NFR-I18N-005 |
| AMB-026 | Suspension in-flight bookings | FR-PRV-013 |
| AMB-027 | corporate pre-payment state | FR-COR-004 |
| AMB-031 | PDF rendering | FR-COR-003; NFR-I18N-006; NFR-COMP-003 |
| AMB-032 | Merchant/seller-of-record | *(Resolved — Decision Log)* |
| AMB-033 | Consumption tax | FR-COR-003; NFR-COMP-001 *(corporate itemization; B2C tax-inclusive resolved)* |
| AMB-034 | SMS scope | FR-NOT-004 |
| AMB-035 | Support monetization | FR-PRV-010 |
| A1 / A3 | Trial start / overdue confirmation | FR-PRV-008, -009; NFR-TIME-004 |

---
