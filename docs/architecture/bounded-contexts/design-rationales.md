---
title: Design Rationales
sidebar_position: 11
description: Bounded context documentation for Red Cab Marketplace.
---

## Key design rationales

### Why Geography and Search are modules inside Catalog (not contexts)
- **Geography** is admin-curated **administrative reference data** seeded from 全国地方公共団体コード, not hand-authored taxonomy. District = prefecture or designated city; Area = municipality/ward (`AMB-036`). Stored as codes + city-hall centroids — no PostGIS at Phase 1 ([ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data)). Behavior — hide-if-no-published-listings (`INV-8`) and deactivate-cascades-to-listings (`OPR-10`) — is about listings. Tourism labels (Ginza, Fuji Five Lakes) are a future tag layer on Listings, not Areas. A separate context would add an interface and mappers for pure CRUD reference data — speculative generality. See [Geography](/docs/architecture/geography).
- **Search** owns **no data**; it is a read-model/query projection over Listings + Pricing + Availability + Rating. Splitting it now forces a premature read-model sync story (projections, eventual consistency, drift). At expected volume, indexed Postgres queries inside Catalog suffice. Search graduates to its own context only when a dedicated engine (e.g. OpenSearch) is adopted — a documented fitness function, not a day-one boundary.
- Net: both live where their data lives, eliminating cross-context chatter on the hottest read paths (discovery).

### Why Payments owns money movement while Booking owns money facts
- The **invariant** is that the revenue split is frozen and auditable for the life of a Booking (`INV-1`, `INV-2`, `PAY-2`). That fact is created at checkout, **in the same transaction** as booking creation and seat reservation (`BKG-2`, `CON-1`). Putting the snapshot anywhere but Booking would split one atomic invariant across a context boundary — exactly what we must not do.
- **Money movement** (charges, payouts, refunds, reconciliation) has a *different change cadence and failure model*: it is async, Stripe-coupled, webhook-driven, admin-facing, and must converge to external truth (`FIN-11`). Binding it into Booking would drag external-rail complexity into the order aggregate.
- So the seam is: **Booking authors the immutable fact; Payments reads the fact and moves the money.** Refunds/payouts compute from the snapshot, never a live rate (`PAY-6`). This keeps the snapshot transaction intact while isolating Stripe volatility — the clean "facts vs movement" boundary.

### Why Notifications is supporting (not core)
- It is a **generic outbound adapter**: it reacts to events and renders templates. No competitive/domain decision is *made* there — the decisions (when to notify, in what language) are owned by the publishing contexts and Identity. Treating it as core invites a god-module accumulating every domain's templates and logic.
- It is also purely **downstream and asynchronous**, which supports the 60-second SLAs (`OPR-8`) without coupling request latency to email/SMS providers. Keeping it supporting preserves star-shaped *event* flow without star-shaped *synchronous* coupling.

### Why Corporate Quotation was separated from Booking
- **Different actors** (Corporate Client + Admin), **different intake** (custom quote vs instant checkout), **different artifacts** (formal Japanese PDFs), and **different payment path** (manual furikomi, Admin-confirmed `PAY-9`).
- Most importantly, a **different evolution axis**: Corporate is likely to grow PO numbers, credit terms, multi-event accounts, approval chains, and consolidated invoicing. Embedding that in Booking would bloat the B2C checkout core. Separated, COR evolves independently and touches Booking only through a thin, anti-corruption-protected `create_booking_from_quote` command.
- The cost is one ACL boundary — acceptable and intentional, versus the alternative of an ever-growing Booking god-context.

---
