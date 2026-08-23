---
title: Date / Time / Timezone
sidebar_position: 4
description: Engineering conventions for instants, civil dates, and service timezone resolution.
---

## TL;DR

- Ask: **did the system create this time, or did a person pick it?**
- **System-created** → `timestamptz` instant (`Time.current`); frontend never sends it.
- **Person-picked** → bare `YYYY-MM-DD` or naive local datetime; server anchors once in the **service timezone**.
- **Service timezone** comes from `listing.area.timezone` (live) or `booking.service_timezone` (snapshotted); never hardcode `Asia/Tokyo` in domain code.
- Use **`DateTimeUtils`** on API and web; app clock is **UTC**.

## About this document

Single source of truth for date/time engineering rules. Business meaning of Service Timezone: [Glossary](/docs/business-rules/glossary). ADR: [ADR-014](/docs/architecture/decisions/adr-014-service-timezone-model).

| Topic | Document |
| --- | --- |
| Backend patterns | [Backend Conventions](/docs/engineering/backend-conventions) |
| Frontend patterns | [Frontend Conventions](/docs/engineering/frontend-conventions) |
| Snapshot | [Immutable Snapshots](/docs/architecture/data-model/snapshots) |

---

## Service timezone resolution

| Context | Source | Example use |
| --- | --- | --- |
| Catalog (pre-booking) | `Catalog::Listing` → `area.timezone` | Slot "not in past", seasonal override windows |
| Checkout / Booking | `service_timezone` snapshotted on CheckoutSession, copied to Booking | Cancellation cutoffs, auto-complete timer, hold expiry |
| Display (web) | Area `timezone` from API payload, or booking snapshot on order detail | `DateTimeUtils.format`, slot pickers |

**Rules:**

- Every `catalog_areas` row MUST have a valid IANA timezone. Missing timezone is a data bug — fail loud in validators.
- NEVER hardcode `'Asia/Tokyo'`, `'JST'`, or numeric offsets in domain Managers, Validators, or Services.
- Phase 1 Japan seed sets all Areas to `Asia/Tokyo`; behavior matches legacy JST without hardcoding.

---

## The classification test

| Kind | Who produces it | DB column | Wire format | Server handling |
| --- | --- | --- | --- | --- |
| **Instant** | System (`created_at`, `captured_at`, `verified_at`) | `timestamptz` | ISO-8601 with offset (read-only in API responses) | `Time.current` at write |
| **Person-picked civil date** | User (seasonal range label, license valid-until day) | `timestamptz` anchored, or `date` when truly zone-free | `YYYY-MM-DD` | `DateTimeUtils.parse_civil_date(date_string:, timezone:)` once on write |
| **Person-picked local datetime** | User (slot start/end in provider portal) | `timestamptz` | Naive `YYYY-MM-DDTHH:mm` **or** ISO instant per endpoint contract | Anchor in listing's service timezone on write |
| **Zone-free calendar day** | User (rare) | `date` | `YYYY-MM-DD` | No timezone conversion |

Use a `date` column only when the value has **no time meaning in any zone** (e.g. a date of birth). Do not use `date` for operational cutoffs that depend on local midnight.

---

## `DateTimeUtils` (backend)

Location (when implemented): `app/shared/date_time_utils.rb`.

```ruby
# Person-picked civil date — anchor midnight in the service timezone
DateTimeUtils.parse_civil_date(
  date_string: request.starts_on,
  timezone:    listing.area.timezone
)

# Display in mailers / admin
DateTimeUtils.format(time, timezone: booking.service_timezone, style: :datetime)

# "Which calendar day?" — never bare .to_date on a UTC instant
time.in_time_zone(service_timezone).to_date
```

**Anti-patterns (blockers):**

- `Time.zone.parse(date_string)` for a person-picked civil date (anchors in UTC, wrong day west of Greenwich)
- `Date.today` or `Time.current.to_date` for business rules tied to service location
- `Time.now` (use `Time.current`)
- Literal `'Asia/Tokyo'` outside seed data

---

## `DateTimeUtils` (frontend)

Location: `red-cab-web/app/utils/date-time-utils.js`.

- **Display:** `DateTimeUtils.format(instant, { timezone })` — `timezone` required; pass Area or booking snapshot from API.
- **Submit:** `DateTimeUtils.toApiString(formValue, { timezone })` in the submit handler only.
- **Edit forms:** `DateTimeUtils.toFormValue(apiValue, { timezone })`.

Do not use `PROVIDER_PROFILE_DISPLAY_TIMEZONE` or other hardcoded constants for slot or booking UI — read `timezone` from the listing's embedded Area or the booking payload.

---

## Storage conventions

- All instants: **`timestamptz`** — never naive `timestamp`, never `t.datetime` / `t.timestamps` in migrations.
- App timezone: **`UTC`** (`config.time_zone = 'UTC'`).
- Migration comments reference **service timezone** (`OPR-11`), not hardcoded `Asia/Tokyo`.

---

## Fields governed by service timezone (`OPR-11`, `OPR-12`)

| Field / rule | Resolution |
| --- | --- |
| Availability slot start/end (authoring) | Listing Area timezone |
| Cancellation tier `hours_before_service` vs slot start | Snapshotted `service_timezone` on booking |
| Checkout session `expires_at` sweep | Snapshotted or listing Area at creation |
| Auto-complete 24h after slot end | Snapshotted `service_timezone` |
| `available_for_payout_at` clearing gate | Snapshotted `service_timezone` |
| Seasonal override date ranges (when implemented) | Listing Area timezone |

---

## Phase 1 Japan note

All seeded Areas use `Asia/Tokyo`. Tests SHOULD include at least one non-Japan IANA zone to prove the model is not Japan-coupled (e.g. `Pacific/Honolulu` or `Asia/Singapore`).
