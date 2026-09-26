---
title: "Near-me area discovery section (scaffold)"
sidebar_label: Web · Near me
issue: "https://github.com/markmamba/red-cab-web/issues/65"
repos:
  - red-cab-web
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "docs/engineering/specs/platform/web-58-tourist-unified-layout-shell.md"
  - "docs/engineering/specs/cat/geography/api-135-near-me-areas-endpoint.md"
  - "red-cab-web#58"
  - "red-cab-web#60"
  - "red-cab-api#135"
epic: "https://github.com/markmamba/red-cab-web/issues/55"
---

## TL;DR

- **Ships:** client-driven **Near me** section on public `/districts` hub — geolocation prompt, permission-state UI, ranked area list container consuming `{ areas: [...] }` with `distance_km`; dedicated ky API module.
- **Does NOT ship:** client Haversine or reordering; new routes; map pins; `CatalogGeographyNav` / breadcrumb IA changes (#57); homepage mount (unless plan Q1=B).
- **Scaffold (Q2=A):** API `near()` implemented; runtime fetch gated by `NEAR_ME_AREAS_FETCH_ENABLED = false` in service module until Phase 2 checklist.
- **Phase 2 (Q6=B):** Flip gate in same spec checklist after staging verifies `api-135`; PR copy requires API deploy before web.
- **Breaking change:** No.

## Problem

Milestone C requires a near-me discovery shell (`FR-CAT-032`, `tourist-ui-pre-phase-2.md`) on the public discover surface. ADR-017 requires near-me as a **section on `/districts`**, not `/near-me` or `/discover`. API contract is live in `api-135`; web has no geolocation flow or near areas client today.

Evidence: no `geolocation` usage in `red-cab-web`; district hub is `marketplace-catalog-district-list-page.jsx`; envelope mismatch if districts `areasIndex` were reused.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-CAT-032 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Near-me behavior |
| ADR-017 | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Section on `/districts` |
| api-135 | [api-135-near-me-areas-endpoint.md](./geography/api-135-near-me-areas-endpoint.md) | `GET …/areas/near`, `areas` envelope |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Public catalog routes |
| web-58 | [/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell](/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell) | Tourist public shell |
| frontend.md | [/docs/engineering/conventions/frontend.md](/docs/engineering/conventions/frontend) | Geolocation → API; homonym labels |
| INV-8 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Discoverable nodes only (API) |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Mount on **`/districts` index** only | Layout on all child routes; homepage (Q1=B rejected) | Human Q1=A — `marketplace-catalog-district-list-page.jsx` |
| 2 | **Client-only** fetch after geolocation | SSR loader with coords | Browser permission cannot run on server |
| 3 | API module **`marketplace-catalog-areas-near-api.js`** | Extend districts API | Distinct path and `{ areas }` envelope |
| 4 | **No client sort** — render API order | Re-sort by `distance_km` in JS | frontend.md forbids authoritative client ranking |
| 5 | **New ranked list view** — name + `distance_km` only (Q4=A) | Reuse `CatalogAreaListView`; API district embed in same PR | No `district_slug` on near payload; deep links deferred |
| 6 | **Geolocation gate** | Hidden section until API | Milestone C requires prompt UI visible |
| 7 | Fetch enablement | `VITE_*`; always-on | Q2=A — `NEAR_ME_AREAS_FETCH_ENABLED` constant `false` until Phase 2 |
| 8 | **No prices** in near-me rows | Show listing prices | PRC-1; out of scope |
| 9 | Labels | `name_en` / `name_ja` via `CatalogListingService.getLocalizedLabel` | frontend.md; homonym disambiguation deferred until district embed (Q4) |
| 10 | Spacing | Q5=A — vertical spacing only (`mb-4`); no `Container` on `/districts` | Align width with full-width district grid (plan revision 2026-09-26) |
| 11 | **#58 + #60 on `main`** before branch | Co-ship branches | Satisfied on web `main` 2026-09-26 |
| 12 | Live fetch release | Follow-up issue vs phase 2 | Plan Q6; if live: API deploy before web per web-59 pattern |

## Web contract

| Surface | Path | Route file | Layout | Loader | API module | robots |
| --- | --- | --- | --- | --- | --- | --- |
| Districts hub | `/districts` | `marketplace-catalog-district-list-page.jsx` | `TouristPublicLayout` | parent layout loader (districts only) | `marketplace-catalog-areas-near-api.near` (client) | inherited `index, follow` |

### Section states

1. **Prompt** — heading + short copy + primary button “Use my location” (or equivalent); optional text link “Not now” / continue browsing districts.
2. **Locating** — inline pending (`TouristShellPending` or compact spinner) after user accepts prompt.
3. **Success** — ranked list; each row shows localized name + formatted `distance_km` (e.g. `12.4 km`); links per plan Q4.
4. **Empty** — `areas: []` → muted empty copy (not an error).
5. **Error** — API failure → `TouristErrorState` or compact alert inside section; do not break district list below.
6. **Denied / unsupported** — Q3=A: keep section; muted copy only (user is already on `/districts`); district grid below; no ranked rows.

### Geolocation

- Use `navigator.geolocation.getCurrentPosition` (or `watchPosition` not required).
- Do not persist raw coordinates in `localStorage` unless a future spec requires it.
- Pass `{ lat, lng }` to API only; optional `limit` default 10.

### API client

```text
GET marketplace/catalog/areas/near?lat=&lng=&limit=
Response: { areas: [ { uuid, slug, name_en, name_ja, display_order, timezone, distance_km } ] }
```

- Whitelist query keys: `lat`, `lng`, `limit` only.
- No SSR cookie requirement (optional auth — same as marketplace catalog).

### Files to create or modify (Web)

- `app/api/marketplace-catalog-areas-near-api.js`
- `app/domains/catalog-listing/catalog-near-me-areas-service.js` (geolocation + fetch orchestration)
- `app/domains/catalog-listing/catalog-near-me-areas-section-view.jsx`
- `app/domains/catalog-listing/catalog-near-me-ranked-area-list-view.jsx` (if split)
- `app/routes/marketplace/catalog-district/marketplace-catalog-district-list-page.jsx` — mount section above `CatalogDistrictListView`
- Tests: `catalog-near-me-areas-section-view.spec.jsx`, `marketplace-catalog-areas-near-api.spec.js`

## Out of scope

- `red-cab-api` changes (unless plan Q4=B)
- Homepage near-me (unless Q1=B)
- Map pins; listing index sort
- Removing `CatalogGeographyNav`
- Team / provider / corporate surfaces

## Acceptance criteria

- [ ] Near me section on `/districts` per mount decision (Q1)
- [ ] Location prompt before ranked list
- [ ] API client matches `api-135` envelope and path
- [ ] No client Haversine or reordering
- [ ] District list below section still works (empty/error unchanged)
- [ ] Tests for prompt, denied (Q3), and API client
- [ ] PR links `red-cab-web#65`, `red-cab-web#55`, this spec, `api-135`, `web-56`, `web-58`

## Phase 2 (enable live fetch)

_Q6=B — no separate issue; execute this checklist when enabling near-me in production._

- [ ] Set `NEAR_ME_AREAS_FETCH_ENABLED` to `true` in `catalog-near-me-areas-service.js` (or replace with env-driven flag in a small follow-up PR if preferred)
- [ ] Verify `GET …/areas/near` in staging with real coordinates
- [ ] PR description: API deploy before web merge (co-ship PKM note)
- [ ] Add row links after API embeds `district` on near serializer (follow-up API issue; out of scaffold scope per Q4=A)

## Verification

```bash
# Web (from red-cab-web/)
npm run test -- catalog-near-me marketplace-catalog-areas-near
npm run lint
```

## Human verification (2026-09-26)

| Q | Choice |
| --- | --- |
| Q1 Mount | A — `/districts` index only |
| Q2 Fetch | A — scaffold; constant gate off |
| Q3 Denied | A — visible section; copy-only (no browse link on `/districts`) |
| Q4 Links | A — no links until API embed |
| Q5 Layout | A — spacing only; no `Container` |
| Q6 Live flip | B — Phase 2 checklist in this spec |

**Verification status:** passed — author approved 2026-09-26

## Spec review: web-65-near-me-area-discovery-section.md

**Status recommendation:** approved (no must-fix)

### Must-fix

- None — aligns with `FR-CAT-032`, ADR-017, `api-135` envelope, frontend geolocation rules, INV-8 (API-side).

### Should-fix

- Note in Phase 2 that homonym disambiguation (`frontend.md`) needs district labels once API embed lands.

### Questions for author

- None after MCQ gate.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-09-26 | PKM plan + `review-implementation-spec` | MCQs passed; author approved |
| 2026-09-26 | Mark | explicit approval | `status: approved` |
