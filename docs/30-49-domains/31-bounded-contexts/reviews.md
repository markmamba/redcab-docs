---
title: Reviews & Ratings
sidebar_position: 7
description: Bounded context documentation for Red Cab Marketplace.
---

### 6. Reviews & Ratings (core)
- **Purpose:** Verified-booking reviews, moderation, provider responses, and the listing Rating Score.
- **Aggregates owned:** `Review` (rating, text, photos, moderation status, provider response), `RatingSummary` (per listing).
- **Transactional boundary:** review submission and moderation transitions are transactional within `Review`; rating recalculation updates `RatingSummary`.
- **Upstream deps:** Booking (completion fact establishes eligibility).
- **Downstream consumers:** Catalog (displays Rating Score), Notifications.
- **Sync (exposes):** review submission/moderation commands; rating-score query.
- **Async (publishes):** `ReviewSubmitted`, `ReviewApproved`, `ReviewRemoved`, `RatingRecalculated`. **Consumes:** `BookingCompleted` (eligibility + review-link trigger).
- **Integration contract:** consumes a minimal completion fact `{ booking_id, tourist_id, listing_id, completed_at }`; it does not read Booking internals.
- **Rules anchored here:** `INV-5`, `BKG-7`, `OPR-6`, `OPR-7`, `F-01..F-04`.

---
