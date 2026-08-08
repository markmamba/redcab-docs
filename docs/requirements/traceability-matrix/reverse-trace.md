---
title: Reverse Trace
sidebar_label: Reverse
sidebar_position: 4
description: Traceability matrix — reverse trace.
---

## TL;DR

- **Reverse trace:** governing rule → requirements that conform to it.
- No-orphan-rule check — material invariants should be observable through at least one requirement.

## About this document

Rule-to-requirements reverse traceability.

| Topic | Document |
| --- | --- |
| Matrix index | [Traceability Matrix](/docs/requirements/traceability-matrix) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## 3. Reverse trace — governing rule → requirements
No-orphan-rule check (README §5): every material rule of record is observable through ≥1 requirement, or is flagged internal-only.

### 3.1 Hard invariants (`INV-`)
| Rule | Requirements |
| --- | --- |
| INV-1 | FR-BKG-002, -004, -015; FR-PAY-001, -002; NFR-AUD-002 |
| INV-2 | FR-PAY-002; (FIN-1 below) |
| INV-3 | FR-CAT-021 |
| INV-4 | FR-BKG-001, -004 |
| INV-5 | FR-REV-001 |
| INV-6 | FR-PRV-003, -013; FR-CAT-010 |
| INV-7 | FR-PRV-012 |
| INV-8 | FR-CAT-003 |
| INV-9 | FR-PRV-001, -002 |
| INV-10 | FR-CAT-012 |
| INV-11 | FR-CAT-002, -022; FR-BKG-015; NFR-PRIV-003 |

### 3.2 Lifecycle (`LC-`)
| Rule | Requirements |
| --- | --- |
| LC-1..6 | FR-BKG-007 |
| LC-2 | FR-BKG-008; NFR-TIME-009 |
| LC-5 | FR-BKG-009 |
| LC-6 | FR-PAY-005 |
| LC-7 | FR-PRV-003 |
| LC-8 | FR-PRV-003; FR-CAT-009, -010 |
| LC-9 | FR-PRV-006 |
| LC-10 | FR-CAT-005, -006 (Published-visibility); FR-CAT-022 |
| LC-11 | FR-B2B-004 |

### 3.3 Pricing (`PRC-`)
| Rule | Requirements |
| --- | --- |
| PRC-1 | FR-CAT-028; NFR-PERF-002 |
| PRC-2 | FR-CAT-015, -026 |
| PRC-3 | FR-CAT-013 |
| PRC-4 | FR-CAT-014 |
| PRC-5 | FR-CAT-016 |
| PRC-6 | FR-CAT-017 |
| PRC-7 | FR-CAT-018 |
| PRC-8 | FR-BKG-002 |

### 3.4 Payments (`PAY-`)
| Rule | Requirements |
| --- | --- |
| PAY-1 | NFR-I18N-005; NFR-COMP-002 |
| PAY-2 | FR-PAY-003, -010 |
| PAY-3 | FR-PAY-004 |
| PAY-4 | FR-PAY-002 |
| PAY-5 | FR-BKG-005 |
| PAY-6 | FR-PAY-006; FR-BKG-010; NFR-AUD-003 |
| PAY-7 | FR-BKG-011 |
| PAY-8 | FR-PAY-007; NFR-AUD-005 |
| PAY-9 | FR-B2B-005 |
| PAY-10 | FR-B2B-003; NFR-COMP-001 |

### 3.5 Booking (`BKG-`)
| Rule | Requirements |
| --- | --- |
| BKG-1 | FR-BKG-003 |
| BKG-2 | FR-BKG-004 |
| BKG-3 | FR-BKG-012 |
| BKG-4 | FR-BKG-013 |
| BKG-5 | FR-BKG-013 |
| BKG-6 | FR-BKG-014; NFR-PRIV-001 |
| BKG-7 | FR-REV-001 |
| BKG-8 | FR-CAT-022; FR-BKG-015 |

### 3.6 Concurrency (`CON-`)
| Rule | Requirements |
| --- | --- |
| CON-1 | FR-BKG-004 |
| CON-2 | FR-BKG-006; FR-BKG-001; NFR-PERF-003 |
| CON-3 | FR-CAT-006, -021; FR-BKG-001; NFR-PERF-003 |
| CON-4 | FR-CAT-020 |
| CON-5 | FR-BKG-010, -011 |

### 3.7 Operational (`OPR-`)
| Rule | Requirements |
| --- | --- |
| OPR-1 | FR-IAM-007; NFR-SEC-002; NFR-TIME-008 |
| OPR-2 | FR-PRV-009, -010 |
| OPR-3 | FR-PRV-011, -012; FR-NOT-005; NFR-TIME-003 |
| OPR-4 | FR-PRV-008; FR-NOT-005; NFR-TIME-004 |
| OPR-5 | FR-B2B-002, -006; FR-NOT-005; NFR-TIME-005, -006 |
| OPR-6 | FR-REV-004, -007 |
| OPR-7 | FR-REV-002; NFR-TIME-007 |
| OPR-8 | FR-NOT-001; FR-REV-002; NFR-TIME-001, -002 |
| OPR-9 | FR-IAM-010, -011; FR-NOT-003; NFR-I18N-001, -002 |
| OPR-10 | FR-CAT-002 |

### 3.8 Financial invariants (`FIN-`)
| Rule | Requirements |
| --- | --- |
| FIN-1 | FR-PAY-002 (gross = net + commission on snapshot) |
| FIN-2 | NFR-AUD-002; FR-BKG-015 |
| FIN-3 | FR-PAY-009; NFR-AUD-001, -006 |
| FIN-4 | Internal-only (amount bounds; observable indirectly via FR-PAY-006, -007) |
| FIN-5 | FR-PAY-007; NFR-AUD-005 |
| FIN-6 | FR-PAY-006; NFR-AUD-003 |
| FIN-7 | FR-PAY-004 |
| FIN-8 | NFR-I18N-005; NFR-COMP-002 |
| FIN-9 | FR-BKG-005 |
| FIN-10 | FR-PAY-008; NFR-AVAIL-003; NFR-AUD-004 |
| FIN-11 | NFR-AVAIL-004 |

---
