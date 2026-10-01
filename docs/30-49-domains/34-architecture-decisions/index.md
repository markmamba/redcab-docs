---
title: Architecture Decisions
sidebar_position: 1
description: Architecture Decision Records (ADRs) for Red Cab Marketplace.
---

## TL;DR

- Nineteen architecture decision records (ADR-001–019) documenting choices already established in the planning set.
- ADRs cover modular monolith, tech stack, bounded contexts, integration, pricing, snapshots, consistency, events, externals, identity, financial authority, evolution strategy, geography reference data, geography administrative tree, service timezone, tourist public URLs, web authentication enforcement, and session technology.
- **ADR-015 is Proposed**, not Accepted — it records the payment custody/control separation pending legal counsel opinion.
- **ADR-018 and ADR-019 are Accepted** (2026-09-30) — web enforcement model and Phase 1 session technology; see the [authentication series](/docs/90-99-engineering-meta/authentication) and roadmap Phase 1 [Review record](/docs/90-99-engineering-meta/authentication/implementation-roadmap#review-record-phase-1).
- They record **why** — they do not introduce new boundaries or override business rules.

## About this document

Index of architecture decision records. Each ADR is authoritative for its decision; unresolved detail remains in [Open Questions](/docs/70-79-business/planning/open-questions).

---

## ADR index

| ID | Decision | Status |
| --- | --- | --- |
| ADR-001 | [ADR-001: Modular Monolith Architecture](/docs/30-49-domains/architecture-decisions/adr-001-modular-monolith) | Accepted |
| ADR-002 | [ADR-002: Technology Stack Selection](/docs/30-49-domains/architecture-decisions/adr-002-technology-stack) | Accepted (payments dimension superseded by ADR-015) |
| ADR-003 | [ADR-003: Bounded Context Architecture](/docs/30-49-domains/architecture-decisions/adr-003-bounded-context-architecture) | Accepted |
| ADR-004 | [ADR-004: Context Integration Model](/docs/30-49-domains/architecture-decisions/adr-004-context-integration-model) | Accepted |
| ADR-005 | [ADR-005: Single Pricing Authority](/docs/30-49-domains/architecture-decisions/adr-005-single-pricing-authority) | Accepted |
| ADR-006 | [ADR-006: Immutable Snapshot Strategy](/docs/30-49-domains/architecture-decisions/adr-006-immutable-snapshot-strategy) | Accepted |
| ADR-007 | [ADR-007: Transaction and Consistency Boundaries](/docs/30-49-domains/architecture-decisions/adr-007-transaction-and-consistency-boundaries) | Accepted |
| ADR-008 | [ADR-008: Domain Event Architecture](/docs/30-49-domains/architecture-decisions/adr-008-domain-event-architecture) | Accepted |
| ADR-009 | [ADR-009: External Systems Integration](/docs/30-49-domains/architecture-decisions/adr-009-external-systems-integration) | Accepted |
| ADR-010 | [ADR-010: Identity and Authorization Architecture](/docs/30-49-domains/architecture-decisions/adr-010-identity-and-authorization-architecture) | Accepted |
| ADR-011 | [ADR-011: Financial Authority Model](/docs/30-49-domains/architecture-decisions/adr-011-financial-authority-model) | Accepted |
| ADR-012 | [ADR-012: Evolution Strategy](/docs/30-49-domains/architecture-decisions/adr-012-evolution-strategy) | Accepted |
| ADR-013 | [ADR-013: Geography Reference Data](/docs/30-49-domains/architecture-decisions/adr-013-geography-reference-data) | Accepted |
| ADR-014 | [ADR-014: Service Timezone Model](/docs/30-49-domains/architecture-decisions/adr-014-service-timezone-model) | Accepted |
| ADR-015 | [ADR-015: Payment Custody and Control Separation](/docs/30-49-domains/architecture-decisions/adr-015-payment-custody-and-control-separation) | **Proposed** — pending counsel |
| ADR-016 | [ADR-016: Geography Administrative Tree](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree) | Accepted |
| ADR-017 | [ADR-017: Tourist UI public URL architecture](/docs/30-49-domains/architecture-decisions/adr-017-tourist-ui-public-url-architecture) | Accepted |
| ADR-018 | [ADR-018: Red Cab Web Authentication Enforcement Model](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Accepted (2026-09-30) |
| ADR-019 | [ADR-019: Session Technology for Phase 1 and Phase 2](/docs/30-49-domains/architecture-decisions/adr-019-session-technology-phase-1-and-2) | Accepted (2026-09-30); production cookie topology closed ([#20](https://github.com/markmamba/redcab-docs/issues/20)) |

## Amendments convention

Accepted ADRs are **dated decisions**, not live status pages. When shipped code or a later issue changes an Accepted ADR without reversing the whole decision:

1. Add an **Amendments** section at the end of the ADR (or extend an existing one) with a dated bullet: what changed, which PR or issue, and what readers should do.
2. Update this index row only when the **status** changes (for example Accepted → Superseded).
3. Use **Superseded** and a replacement ADR only when the original decision is reversed, not for additive clarifications.

Examples in this corpus: ADR-018 D4 portal codes extended by api-145; ADR-019 lifetimes recorded in the contract sheet; ADR-019 production cookie topology ([#20](https://github.com/markmamba/redcab-docs/issues/20)).
