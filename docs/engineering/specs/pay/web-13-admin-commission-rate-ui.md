---
title: "Admin commission rate setting UI"
sidebar_label: Web · Commission rate UI
issue: "https://github.com/markmamba/red-cab-web/issues/13"
repos:
  - red-cab-web
status: approved
phase: 1
context: PAY
---

## TL;DR

- Ships team admin UI to view the in-force platform commission rate and schedule new rates (append-only create) at `/team/payments/commission-rates`.
- Does **not** ship rate history list, edit/delete, client-side pricing, or dashboard summary card.
- Breaking change: No

## Problem

Phase 1 requires admin commission rate control (`PAY-2`, `FR-PAY-010`). API endpoints exist (`GET/POST team/payments/commission_rate_settings/*`, red-cab-api PR #122) but red-cab-web has zero commission-rate code — sidebar link is disabled and dashboard is a scaffold.

Evidence: `app/layouts/team/team-sidebar-config.js:70-75`, `app/routes/team/team-dashboard-page.jsx:21`.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-PAY-003 | [/docs/product/requirements/functional-requirements/pay.md](/docs/product/requirements/functional-requirements/pay) | Rate changes apply only to subsequent bookings |
| FR-PAY-010 | [/docs/product/requirements/functional-requirements/pay.md](/docs/product/requirements/functional-requirements/pay) | Admin can set platform-wide commission rate |
| PAY-2 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Historical bookings retain commission snapshot |
| INV-1 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Booking snapshots immutable after create |
| Phase 1 | [Phase 1 MVP](/docs/product/planning/roadmap/phase-1-mvp) | Admin commission rate setting UI |
| OPR-11 | `red-cab-api/docs/db/payments.dbml` | `effective_from` evaluated in `Asia/Tokyo` |
| Web conventions | [Frontend conventions](/docs/engineering/conventions/frontend) | Team portal patterns |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Dedicated settings page at `/team/payments/commission-rates` | Dashboard-only summary | Matches sidebar placeholder and issue tasks |
| 2 | `clientLoader` + 404 → empty state | Treat 404 as error boundary | API 404 is valid when only future rates exist |
| 3 | `teamApiClient` only | Marketplace `apiClient` | Team CSRF/session boundary |
| 4 | Admin enters decimal fraction; format to 4 decimals on submit | Whole-percent input | Q2=B; matches API validator example (`0.1500` for 15%) |
| 5 | `effective_from` via `datetime-local`; submit picker value as-is (server anchors to `Asia/Tokyo`) | Client `toApiString` on write | DBML OPR-11; `.ai/instructions.md` datetime write-path |
| 6 | Append-only create form always visible | Hide form when rate exists | Scheduling future changes is primary workflow |
| 7 | Revalidate loader after successful POST | Optimistic update from POST body | Authoritative `current` from GET |
| 8 | Future-dated POST shows info alert | Toast only | Q3=A; clarifies in-force rate unchanged until effective instant |

> **Human verification (2026-09-20):** Q1=A dedicated page only; Q2=B decimal fraction input; Q3=A scheduled-rate info alert.

## API contract

_Web consumes existing team API (red-cab-api PR #122). No API changes in this spec._

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `team/payments/commission_rate_settings/current` | Team admin session | — | 200: `{ uuid, rate_percentage, effective_from, created_at, created_by_admin }` | 404 when no in-force rate |
| POST | `team/payments/commission_rate_settings` | Team admin session | `{ rate_percentage, effective_from }` | 201: same shape | 422: `messages.rate_percentage`, `messages.effective_from` |

**Payload notes:**

- `rate_percentage`: string fraction, 4 decimals (e.g. `"0.1500"` for 15%)
- `effective_from`: ISO8601 with offset
- Never send `created_by_admin_id` — server assigns from session

## Web contract

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Team | `/team/payments/commission-rates` | `clientLoader` | `teamPaymentsCommissionRateSettingsApi` | None (layout) |

**Page behavior:**

1. Loader calls `current()`. On 200, pass `commissionRateSetting` to view. On 404, pass `commissionRateSetting: null` + optional `emptyStateMessage` from API title.
2. Render `TeamCommissionRateSettingCurrentView` (rate card or empty state).
3. Render `TeamCommissionRateSettingCreateForm` below with guidance copy: _"New rates apply to future checkouts only. Existing bookings keep their frozen commission snapshot."_
4. On submit: map form values → API payload (`rate_percentage` as 4-decimal fraction string; `effective_from` passed through from picker — no client conversion).
5. On 201: success toast (prefer first `messages` entry or generic success); `revalidate()`; if `effective_from > now`, show scheduled-rate info alert (per Q3).
6. On 422: `getApiErrorToastConfig` + `setApiErrorsToFormFields`.

### Files to create or modify (Web)

- `app/api/team-payments-commission-rate-settings-api.js`
- `app/domains/team-commission-rate-setting/team-commission-rate-setting-constant.js`
- `app/domains/team-commission-rate-setting/team-commission-rate-setting-schema.js`
- `app/domains/team-commission-rate-setting/team-commission-rate-setting-schema.spec.js`
- `app/domains/team-commission-rate-setting/team-commission-rate-setting-current-view.jsx`
- `app/domains/team-commission-rate-setting/team-commission-rate-setting-create-form.jsx`
- `app/routes/team/payments/commission-rates/team-commission-rates-page.jsx`
- `app/team.routes.js`
- `app/layouts/team/team-sidebar-config.js`

**Reference implementations:**

- `app/routes/team/providers-profile/team-providers-profile-detail-page.jsx` — loader, toast, revalidate, field errors
- `app/api/team-providers-profiles-api.js` — `teamApiClient` pattern
- `app/domains/team-providers-profile/team-providers-profile-approve-form.jsx` — RHF + zod form
- `app/components/forms/date-field.jsx` — `effective_from` picker with `timezone: Asia/Tokyo` for display

## Data / domain touchpoints

- **Bounded context:** PAY (read/write via team API)
- **Snapshots:** None on web — display only; no client price computation
- **Critical invariant:** UI copy must reflect `PAY-2` — changes affect future checkouts only

## Out of scope

- Rate history list, edit, delete
- Client-side commission or checkout price computation
- Role/permission matrix (Phase 1: all team admins)
- API changes
- Automated E2E tests

## Tasks

### Web

- [ ] Add `team-payments-commission-rate-settings-api.js`
- [ ] Add domain constants, schema (+ spec), current view, create form
- [ ] Add `team-commission-rates-page.jsx` with loader and submit handler
- [ ] Register route in `team.routes.js`
- [ ] Enable sidebar nav item
### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] Team admin views in-force rate from `GET current` (or empty state on 404)
- [ ] Team admin schedules new rate via append-only create form
- [ ] Uses `teamApiClient` with team CSRF
- [ ] API `messages` drive toast and field errors
- [ ] Copy states new rate affects future checkouts only
- [ ] No client-side price computation
- [ ] Manual test with team admin session

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test -- team-commission-rate-setting-schema.spec.js

# Manual (requires red-cab-api running with team admin session)
# 1. GET /team/payments/commission-rates — current rate or empty state
# 2. POST new rate — success toast + revalidate
# 3. POST invalid rate — 422 field errors
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-20 | agent | `review-implementation-spec` (draft) | See below |

### Spec review: 13-admin-commission-rate-ui.md

**Status recommendation:** approved

#### Must-fix

- None — API contract verified against `commission_rate_settings_controller_test.rb`

#### Should-fix

- Zod bounds: `0 <= rate_percentage < 1` (exclusive of 1.0); format to 4 decimals on submit
- Form helper text: "Enter as decimal fraction, e.g. 0.15 for 15%"

#### Questions for author

- None — Q1=A, Q2=B, Q3=A recorded in PKM plan
