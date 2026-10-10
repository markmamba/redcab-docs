---
title: Notifications
sidebar_label: Notifications (Context)
sidebar_position: 9
description: Supporting context — event-driven email and SMS in the recipient's language.
---

## TL;DR

- **Supporting** context: outbound adapter for email and SMS.
- Reacts to domain events and scheduled alerts. It does not own domain decisions.
- Each dispatch is independent and **idempotent**.
- Reads recipient language from Identity at send time.

## About this document

Bounded context overview for Notifications (supporting).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Domain events | [Domain events catalog](/docs/30-49-domains/bounded-contexts/domain-events) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context renders and dispatches email and SMS in the recipient's language.

It reacts to events from core contexts and to scheduled operational alerts.

## Core concepts

**Aggregates:** `NotificationRequest` / dispatch record; message templates.

Domain callers do not route business logic through Notifications.

Direct send commands may exist for transactional mail (for example verification).

## Integrations

**Upstream:** events from every core context; Identity (recipient language).

**Downstream:** external email and SMS providers.

**Sync (exposes):** minimal surface for domain callers; optional direct send for transactional email.

**Async (consumes):** the [domain events catalog](/docs/30-49-domains/bounded-contexts/domain-events).

**Async (publishes):** `NotificationDispatched`, `NotificationFailed` (observability).

## Related requirements

`OPR-8`, `OPR-9`, `G-01`..`G-04`.
