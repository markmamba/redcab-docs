---
title: Coverage Analysis
sidebar_label: Coverage
sidebar_position: 6
description: Traceability matrix — coverage analysis.
---

## TL;DR

- **Coverage analysis:** orphan requirements, intentional gaps, and internal-only rules.
- Summarizes traceability health across the planning set.

## About this document

Gap analysis and coverage summary for the traceability matrix.

| Topic | Document |
| --- | --- |
| Matrix index | [Traceability Matrix](/docs/requirements/traceability-matrix) |
| Requirements conventions | [Requirements Overview](/docs/requirements) |

---

## 5. Coverage analysis

### 5.1 Requirement source coverage
- Every FR and NFR has ≥1 upstream Source and ≥1 lateral governing rule or owning-context model (README §5 "no orphan requirements"). NFRs sourced from `platform op` / `architecture` with no PRD story are `Draft` with a designated owner pending (NFR-PERF-001, NFR-AVAIL-001, NFR-PRIV-004, NFR-A11Y-001) — tracked, not orphaned.

### 5.2 Rule coverage (no orphan rules of record)
- All `INV-`, `LC-`, `PRC-`, `PAY-`, `BKG-`, `CON-`, `OPR-` rules map to ≥1 requirement (§3).
- `FIN-` mostly map to requirements; **FIN-4** (no payout > net; no refund > gross) is **internal-only** — a computational bound observed indirectly through FR-PAY-006/-007 and NFR-AUD-003. Intentional gap, not an omission.

### 5.3 Provisional load
- Provisional requirements pending resolution are listed in §4. The remaining P0 blocker is **AMB-021** (auth methods), gating FR-IAM-008 and NFR-SEC-007. Resolved P0 items (`AMB-001`, `AMB-002`, `AMB-003`, `AMB-020`) are recorded in the Decision Log; formerly provisional FRs (FR-BKG-002, FR-BKG-008, FR-PAY-001, FR-PAY-005, FR-PAY-007, FR-CAT-004) are now **Approved**.

### 5.4 Known gaps to revisit on AMB resolution
- AMB-013/-014 (lifecycle completeness): no-show, provider-decline, and reschedule paths are not yet expressed as requirements beyond FR-BKG-009; new FRs are expected when the state machine is revised.
- AMB-005/-006 (disbursed/failed, refund-failed): only NFR-AVAIL-004 covers convergence; explicit FRs for payout-disbursed/failed outcomes are deferred to the Payments lifecycle revision.
- AMB-008 (post-payout dispute/chargeback): out of MVP happy-path; no requirement yet, by design.
