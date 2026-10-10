---
title: Reviews & Ratings
sidebar_position: 7
description: Core context — verified-booking reviews, moderation, provider responses, and listing rating score.
---

## TL;DR

- Accepts reviews only for **completed** Bookings. At most one review per Booking (`INV-5`, `BKG-7`).
- Runs post-publication moderation (provider report, Admin takedown). See [ADR-020](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation).
- Maintains **RatingSummary** per listing from approved reviews only (`OPR-6`).
- Never mutates Booking state or facts.

## About this document

Bounded context overview for Reviews & Ratings (core).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| ADR-020 | [Review post-publication moderation](/docs/30-49-domains/architecture-decisions/adr-020-review-post-publication-moderation) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context collects verified-booking reviews and provider responses.

It computes and publishes the listing **Rating Score** for Catalog to display.

## Core concepts

**Aggregates:** `Review` (rating, text, photos, moderation status, provider response); `RatingSummary` (per listing).

Review submission and moderation transitions are transactional within `Review`.

Rating recalculation updates `RatingSummary`.

## Integrations

**Upstream:** Booking (completion fact for eligibility).

**Downstream:** Catalog (displays Rating Score); Notifications.

**Sync (exposes):** review submission and moderation commands; rating-score query.

**Async (publishes):** `ReviewSubmitted`, `ReviewRemoved`, `RatingRecalculated` (and optional `ReviewReportDismissed` when W7 needs it).

**Async (consumes):** `BookingCompleted` (eligibility and review-link trigger).

**Completion fact contract:** `{ booking_id, tourist_id, listing_id, completed_at }`. Reviews does not read Booking internals.

## Related requirements

`INV-5`, `BKG-7`, `OPR-6`, `OPR-7`, `F-01`..`F-04`.
