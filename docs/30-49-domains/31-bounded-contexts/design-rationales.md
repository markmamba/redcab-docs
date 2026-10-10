---
title: Design Rationales
sidebar_position: 11
description: Why Geography and Search live in Catalog, why facts vs movement split Booking and Payments, and why Corporate is separate.
---

## TL;DR

- **Geography** and **Search** are Catalog modules, not separate contexts.
- **Booking** owns money facts at checkout. **Payments** owns movement and commission rate.
- **Notifications** is a supporting outbound adapter, not a core domain.
- **Corporate** evolves on its own axis and enters Booking only through an ACL command.

## About this document

Non-normative design rationale for context boundaries. Authoritative boundaries live in [Bounded contexts](/docs/30-49-domains/bounded-contexts) and ADRs.

| Topic | Document |
| --- | --- |
| Context map | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Geography | [Geography pattern](/docs/30-49-domains/patterns/geography) |
| Payments seam | [Payments architecture](/docs/30-49-domains/patterns/payments-architecture) |

---

## Why Geography and Search are modules inside Catalog, not contexts

**Geography** is admin-curated reference data in a self-referencing tree (`catalog_geographies`).

Data is seeded from official administrative codes, not hand-authored taxonomy ([ADR-013](/docs/30-49-domains/architecture-decisions/adr-013-geography-reference-data)).

**Level** (Subdivision, Municipality, Ward) is administrative fact.

**District** and **Area** are discovery roles (`is_discovery_root`, `is_listable`). Designated cities appear top-level in navigation but remain children of their prefecture in storage ([ADR-016](/docs/30-49-domains/architecture-decisions/adr-016-geography-administrative-tree), `AMB-036`).

Storage uses codes and city-hall centroids on listable nodes. There is no PostGIS at Phase 1.

Hide-if-no-published-listings (`INV-8`) and archive cascades (`OPR-10`) are listing behaviors.

Tourism labels (for example Ginza) belong on Listings as tags later, not as geography nodes.

A separate Geography context would add interfaces for pure CRUD reference data without domain benefit.

**Search** owns no data. It projects Listings, Pricing, Availability, and Rating.

Splitting Search now forces premature read-model sync and drift handling.

At expected volume, indexed Postgres queries inside Catalog are enough.

Search becomes its own context only when a dedicated engine (for example OpenSearch) is adopted — a documented fitness function, not a day-one boundary.

Both modules live where their data lives. That reduces cross-context chatter on hot discovery paths.

## Booking facts vs Payments movement

The revenue split must freeze at checkout and stay auditable for the life of the Booking (`INV-1`, `INV-2`, `PAY-2`).

That fact is created in the same transaction as booking creation and seat reservation (`BKG-2`, `CON-1`).

Putting the snapshot outside Booking would split one atomic invariant across a boundary.

Money movement has a different cadence and failure model.

Charges, settlements, refunds, and reconciliation are async, provider-coupled, and admin-facing.

Internal state must converge to external truth (`FIN-11`).

Binding movement into Booking would pull provider-rail complexity into the order aggregate.

**Seam:** Booking authors the immutable fact. Payments reads the fact and instructs movement.

Custody sits with the payment provider. Payments never holds funds (`INV-13`).

Refunds and settlements use the snapshot, not a live rate (`PAY-6`).

See [ADR-015](/docs/30-49-domains/architecture-decisions/adr-015-payment-custody-and-control-separation).

## Notifications as supporting

Notifications is a generic outbound adapter. It reacts to events and renders templates.

Domain decisions stay in publishing contexts and Identity.

Treating Notifications as core invites a module that accumulates every template and rule.

It is downstream and asynchronous. That supports notification SLAs (`OPR-8`) without coupling request latency to email or SMS providers.

## Corporate separate from Booking

Corporate uses different actors (Corporate Client and Admin).

Intake is custom quote, not instant checkout.

Artifacts are formal Japanese documents.

Payment is manual furikomi with Admin confirmation (`PAY-9`).

Corporate will likely grow PO numbers, credit terms, approval chains, and consolidated invoicing.

Embedding that in Booking would bloat B2C checkout.

Corporate touches Booking only through `create_booking_from_quote` behind an ACL.

The cost is one intentional ACL boundary versus a growing Booking god-context.
