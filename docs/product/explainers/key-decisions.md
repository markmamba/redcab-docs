---
title: Key decisions
sidebar_position: 5
description: One-line business impact per major architecture decision.
---

## TL;DR

Non-normative explainer. Every rule cited below links to the authoritative source.

## Related documents

| Decision | Business impact | ADR |
| --- | --- | --- |
| Modular monolith | Single deployable platform; contexts stay separate in code | [ADR-001](/docs/architecture/decisions/adr-001-modular-monolith) |
| Single pricing authority | Catalog alone calculates price; no drift at checkout | [ADR-005](/docs/architecture/decisions/adr-005-single-pricing-authority) |
| Immutable snapshots | Booking commercial facts frozen at checkout | [ADR-006](/docs/architecture/decisions/adr-006-immutable-snapshot-strategy) |
| Public browse | Guests browse listings; sign-in only at checkout | [ADR-017](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) |
| Geography tree | Japan administrative hierarchy powers discovery URLs | [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) |
