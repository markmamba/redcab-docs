---
title: Forward Trace
sidebar_label: Forward
sidebar_position: 3
description: Traceability matrix — forward trace.
---

## TL;DR

- **Forward trace:** PRD story → requirement IDs → owning bounded context.
- Validates source coverage — every PRD story maps to at least one requirement.

## About this document

PRD-to-requirements forward traceability.

| Topic | Document |
| --- | --- |
| Matrix index | [Traceability Matrix](/docs/requirements/traceability-matrix) |
| Master matrix | [Master Matrix](/docs/requirements/traceability-matrix/master-matrix) |

---

## 2. Forward trace — PRD story → requirements → context
Source coverage from the PRD/meeting notes (upstream direction). Every PRD story referenced by a requirement appears here.

| PRD story | Requirements | Context(s) |
| --- | --- | --- |
| A-01 | FR-IAM-001, -002, -003, -004, -008, -010; NFR-SEC-003, -007 | IAM |
| A-02 | FR-IAM-005, -006, -007; NFR-SEC-001, -002; NFR-TIME-008 | IAM |
| A-03 | FR-PRV-001, -002, -003 | PRV |
| A-04 | FR-PRV-004, -005; NFR-SEC-006; NFR-PRIV-002 | PRV |
| A-05 | FR-PRV-006, -007, -008; FR-NOT-005; NFR-TIME-004; NFR-PRIV-002 | PRV, NOT |
| A-06 | FR-PRV-011, -012; FR-NOT-005; NFR-TIME-003 | PRV, NOT |
| A-07 | FR-PRV-009, -010; FR-NOT-005 | PRV, NOT |
| A-08 | FR-IAM-013; FR-B2B-007 | IAM, B2B |
| 1.1–1.6 | FR-IAM-009, -012; NFR-SEC-004, -005 | IAM |
| B-01 | FR-CAT-003, -004; FR-IAM-012; NFR-SEC-005 | CAT, IAM |
| B-02 | FR-CAT-003, -004 | CAT |
| B-03 | FR-CAT-004, -005, -006, -021; NFR-PERF-001 | CAT |
| B-04 | FR-CAT-007, -008; NFR-AVAIL-002 | CAT |
| B-05 | FR-CAT-001, -002; NFR-I18N-003; NFR-PRIV-003 | CAT |
| C-01 | FR-CAT-009, -010 | CAT |
| C-02 | FR-CAT-011, -012; NFR-SEC-006 | CAT |
| C-03 | FR-CAT-013 | CAT |
| C-04 | FR-CAT-014 | CAT |
| C-05 | FR-CAT-015 | CAT |
| C-06 | FR-CAT-016 | CAT |
| C-07 | FR-CAT-017; FR-PAY-004 | CAT, PAY |
| C-08 | FR-CAT-018 | CAT |
| C-09 | FR-CAT-019 | CAT |
| C-10 | FR-CAT-020 | CAT |
| C-11 | FR-CAT-022; FR-BKG-015; NFR-PRIV-003; NFR-AUD-002 | CAT, BKG |
| D-01 | FR-CAT-023 | CAT |
| D-02 | FR-CAT-024 | CAT |
| D-03 | FR-CAT-025; NFR-I18N-004 | CAT |
| D-04 | FR-CAT-026 | CAT |
| D-05 | FR-CAT-027 | CAT |
| E-01 | FR-BKG-001 | BKG |
| E-02 | FR-BKG-002, -003, -004, -005, -006; FR-PAY-001, -008; NFR-PERF-003; NFR-AVAIL-003; NFR-AUD-004 | BKG, PAY |
| E-03 | FR-BKG-012 | BKG |
| E-04 | FR-BKG-013 | BKG |
| E-05 | FR-B2B-001, -002; FR-NOT-005; NFR-TIME-005 | B2B, NOT |
| E-06 | FR-B2B-003, -004; NFR-COMP-001, -003; NFR-I18N-006 | B2B |
| E-07 | FR-B2B-005, -006; FR-NOT-005; NFR-TIME-006 | B2B, NOT |
| E-08 | FR-BKG-014; NFR-PRIV-001 | BKG |
| E-09 | FR-BKG-007, -008, -009, -010; FR-PAY-005; NFR-TIME-009 | BKG, PAY |
| E-10 | FR-BKG-004, -015; FR-PAY-002, -003, -004, -010; NFR-AUD-001, -002, -006 | BKG, PAY |
| E-11 | FR-CAT-021; FR-BKG-004, -006; FR-PAY-008; NFR-PERF-003; NFR-AVAIL-003; NFR-AUD-004 | CAT, BKG, PAY |
| E-12 | FR-BKG-010, -011; FR-PAY-006, -007; NFR-AUD-003, -005 | BKG, PAY |
| E-13 | FR-PAY-005, -009; NFR-AUD-001, -006 | PAY |
| F-01 | FR-REV-001, -002, -003, -004; NFR-TIME-007 | REV |
| F-02 | FR-REV-006 | REV |
| F-03 | FR-REV-004, -005 | REV |
| F-04 | FR-REV-007 | REV |
| G-01 | FR-NOT-001, -004; NFR-TIME-001, -002 | NOT |
| G-02 | FR-NOT-001, -004; NFR-TIME-001, -002 | NOT |
| G-03 | FR-IAM-010, -011; FR-NOT-003; NFR-I18N-001, -002 | IAM, NOT |
| G-04 | FR-NOT-003; NFR-I18N-001, -002 | NOT, IAM |
| architecture | FR-CAT-028; NFR-PERF-002; NFR-AVAIL-004; NFR-COMP-004 | CAT, PAY |
| Admin Panel | FR-PRV-013; FR-PAY-009, -010 | PRV, PAY |
| glossary (Money) | NFR-I18N-005; NFR-COMP-002 | PAY, CAT |

---
