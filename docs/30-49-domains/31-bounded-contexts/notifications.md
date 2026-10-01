---
title: Notifications (Context)
sidebar_label: Notifications (Context)
sidebar_position: 9
description: Bounded context documentation for Red Cab Marketplace.
---

### 8. Notifications (supporting, generic, event-driven)
- **Purpose:** Render and dispatch email/SMS in the recipient's language, reacting to domain events and scheduled alerts.
- **Aggregates owned:** `NotificationRequest`/dispatch record, message templates.
- **Transactional boundary:** each dispatch is independent and idempotent.
- **Upstream deps:** every core context's events; Identity (recipient language).
- **Downstream consumers:** external email/SMS providers.
- **Sync (exposes):** essentially none for domain callers (it is reaction-driven); may expose a send command for direct transactional emails (e.g. verification).
- **Async (consumes):** the full event catalog above; **publishes** `NotificationDispatched`/`NotificationFailed` for observability.
- **Why supporting, not core (expanded below):** it is an outbound adapter, not a place where domain decisions live.
- **Rules anchored here:** `OPR-8`, `OPR-9`, `G-01..G-04`.

---
