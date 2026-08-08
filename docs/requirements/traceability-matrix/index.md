---
title: Traceability Matrix
sidebar_position: 4
description: PRD stories ↔ requirements ↔ rules ↔ acceptance criteria.
---

## TL;DR

- Maps PRD stories ↔ requirement IDs ↔ governing rules/contexts ↔ acceptance criteria.
- Three-direction traceability: upstream source, lateral rules/models, downstream observable acceptance.

## About this document

Entry point and reading guide for the traceability matrix.

| Topic | Document |
| --- | --- |
| FRs | [Functional Requirements](/docs/requirements/functional-requirements) |
| NFRs | [Non-Functional Requirements](/docs/requirements/non-functional-requirements) |
| Conventions | [Requirements Overview](/docs/requirements) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## How to read this document

Every requirement is traced in three directions (README §5):
- **Upstream → Source:** the PRD story / meeting-note origin (`A-01`…`G-04`, `1.x`, architecture, Admin Panel).
- **Lateral → Governs:** the invariants, lifecycle, pricing, payment, concurrency, and operational rules it conforms to, and its owning bounded context.
- **Downstream → Acceptance criterion:** the observable condition by which conformance is judged (not a test implementation).

Sections:
- §1 Master matrix — one row per requirement (the four-way mapping).
- §2 Forward trace — PRD story → requirement IDs → context (source coverage).
- §3 Reverse trace — governing rule → requirements (no-orphan-rule check).
- §4 Ambiguity trace — `AMB-###` → Provisional requirements.
- §5 Coverage analysis — orphans, gaps, and intentional internal-only rules.

Owning-context codes (README §6): `IAM`, `PRV`, `CAT`, `BKG`, `PAY`, `B2B`, `REV`, `NOT`. The owning context of an FR is encoded in its ID; NFRs state scope per requirement.

---

## Sections

- [Master Matrix](/docs/requirements/traceability-matrix/master-matrix)
- [Forward Trace](/docs/requirements/traceability-matrix/forward-trace)
- [Reverse Trace](/docs/requirements/traceability-matrix/reverse-trace)
- [Ambiguity Trace](/docs/requirements/traceability-matrix/ambiguity-trace)
- [Coverage Analysis](/docs/requirements/traceability-matrix/coverage-analysis)
