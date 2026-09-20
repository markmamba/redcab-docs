---
title: "ADR-014: Service Timezone Model"
sidebar_label: ADR-014
sidebar_position: 14
description: Architecture decision record 014 — area-based service timezone with booking snapshot.
---

## TL;DR

- **Service timezone** is an IANA zone on each **geography node** (`catalog_geographies.timezone`); Listings inherit it via `geography_id`. Seeded from `catalog_countries.default_timezone` ([ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)).
- **CheckoutSession / Booking** snapshoot `service_timezone` at session creation — same immutability pattern as price and cancellation policy.
- Phase 1 seeds all Japan Areas as `Asia/Tokyo`; the model is global-ready without a future revamp.
- Domain code **never** hardcodes a timezone string; persisted instants use `TIMESTAMPTZ` (UTC storage).

## About this document

ADR for how operational wall-clock rules (slot windows, cancellation cutoffs, completion timers) resolve a timezone.

| Topic | Document |
| --- | --- |
| Geography storage | [Geography](/docs/architecture/geography), [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree), [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data) |
| Snapshots | [Immutable Snapshots](/docs/architecture/data-model/snapshots), [ADR-006](/docs/architecture/decisions/adr-006-immutable-snapshot-strategy) |
| Engineering rules | [Date / Time / Timezone](/docs/engineering/datetime-and-timezones) |

---

## Status

Accepted (2026-08-23)

## Context

Red Cab Phase 1 operates in Japan (Tokyo and nationwide). Early schema comments and invariant **OPR-11** treated timezone as a **fixed platform-wide** `Asia/Tokyo` (JST). Engineering conventions simultaneously said to use the **entity's timezone** (listing area) — an internal contradiction.

Japan uses a single civil timezone (`Asia/Tokyo`) nationwide, so hardcoded JST works for MVP behavior. It does **not** work for global expansion: cancellation cutoffs, slot validation, seasonal date windows, and auto-completion timers must resolve per service location without a codebase-wide refactor.

Prior art: JodApp stores `timezone` on leaf `geo_areas` and resolves operational rules from the entity's geography; person-picked dates anchor via shared `DateTimeUtils`.

## Decision

1. **Store `timezone`** (IANA string, NOT NULL) on **every `catalog_geographies` row** — seeded from `catalog_countries.default_timezone` at ingest ([ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree)). A Listing's service timezone is `listing.geography.timezone`. Discovery roots and non-listable nodes carry timezone so resolution never needs tree walking.
2. **Snapshot `service_timezone`** on **CheckoutSession** at session creation and **copy to Booking** at materialization — write-once, never edited for the life of the order ([ADR-006](/docs/architecture/decisions/adr-006-immutable-snapshot-strategy)).
3. **Evaluate operational wall-clock rules** (slot authoring, cancellation tier cutoffs, checkout hold expiry, auto-completion, payout clearing gates) in the **snapshotted service timezone** for in-flight and historical bookings; in the **listing's geography timezone** for pre-booking catalog operations.
4. **Seed Phase 1 Japan** with `catalog_countries.default_timezone = Asia/Tokyo`; propagate to every geography node on seed. No separate country-level resolution at runtime.
5. **App clock** runs in **UTC** (`config.time_zone = 'UTC'`). Never use `Time.now` or bare `.to_date` for business comparisons — derive calendar days in the resolved service timezone.
6. **Shared utilities:** backend `DateTimeUtils` (`parse_civil_date`, `format`); frontend `DateTimeUtils` (`format`, `toApiString`, `toFormValue`) — see [Date / Time / Timezone](/docs/engineering/datetime-and-timezones).

## Rationale

- **Listable geography node is the listing attachment point** (`FR-CAT-033`). Timezone belongs on the same row the Listing FK references — and on every node so no walk-up resolution is needed.
- **Snapshot prevents drift.** If a geography node's timezone is corrected in admin/seed data, confirmed bookings keep the zone they were booked under — same principle as cancellation policy snapshots.
- **Japan MVP unchanged.** All nodes seeded `Asia/Tokyo` preserves current JST semantics while removing hardcoded literals from domain code.
- **Global-ready.** Adding Singapore, Australia, or US markets is a country row + per-node timezone seed — not a new datetime architecture.

## Consequences

**Positive**

- Single resolution path: `listing → geography → timezone` (live) or `booking.service_timezone` (historical).
- Aligns glossary, `OPR-11`, and engineering conventions.
- Cancellation, completion, and payout timers remain correct across zones.

**Negative**

- Migration + backfill on `catalog_geographies` (column move from `catalog_areas`) and checkout/booking tables.
- Replace hardcoded `'Asia/Tokyo'` in validators, jobs, and web constants.
- API must expose `timezone` on Area (listable geography) payloads embedded in listing responses.

## Compliance

- Amends **OPR-11**, **OPR-12** (evaluation zone, not fixed JST string)
- Extends snapshot scope beyond price/commission/cancellation (operational zone fact)
- `FR-BKG-009`, `FR-BKG-018`, `NFR-TIME-010`, `FR-CAT-019`
- Does **not** change `PRC-1` (pricing authority). Geography hierarchy per [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree); seed and no-PostGIS rules per [ADR-013](/docs/architecture/decisions/adr-013-geography-reference-data)

## Related decisions

| ADR | Relationship |
| --- | --- |
| ADR-006 | `service_timezone` follows immutable snapshot strategy |
| ADR-013 | Official-code seed and no-PostGIS rules preserved |
| ADR-016 | `timezone` column on `catalog_geographies`; seeded from `catalog_countries.default_timezone` |
