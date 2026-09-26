---
title: Tourist UI — Pre–Phase 2
sidebar_label: Tourist UI
sidebar_position: 3.5
description: Tourist marketplace UX plan — IA, shells, funnel pages, and Phase 2 placeholder slots.
---

## TL;DR

- **Goal:** Turn existing Phase 1 tourist pages into a coherent marketplace UI before Phase 2 backend depth ships.
- **Plan order:** access model → IA/funnel → layout shell → Phase 1 page specs → Phase 2 placeholder slots → visual polish.
- **Rule:** scaffold routes, layouts, and component slots first; wire API when backend is ready; use placeholders where Phase 2 features are not live yet.

## About this document

Cross-cutting **red-cab-web** plan for the Tourist App surfaces. Backend phasing stays in [Phase 1](/docs/product/planning/roadmap/phase-1-mvp) and [Phase 2](/docs/product/planning/roadmap/phase-2-marketplace-depth); this document defines **what the tourist UI should look like and how pages connect** before Phase 2 feature UI lands.

| Topic | Document |
| --- | --- |
| Roadmap overview | [Phasing Roadmap](/docs/product/planning/roadmap) |
| Phase 1 (API + minimum pages) | [Phase 1 — MVP](/docs/product/planning/roadmap/phase-1-mvp) |
| Phase 2 (reviews, search, refunds) | [Phase 2 — Marketplace depth](/docs/product/planning/roadmap/phase-2-marketplace-depth) |
| Frontend conventions | [Frontend conventions](/docs/engineering/conventions/frontend) |
| Guest browsing (`AMB-022`) | [Open Questions](/docs/product/planning/open-questions) |
| Discovery IA (`AMB-020`) | Decision Log — District → Area canonical |
| Tourist UI + auth redesign | [Web platform program strategy](/docs/product/planning/web-platform-program-strategy) |

---

| [← Phase 1](/docs/product/planning/roadmap/phase-1-mvp) | [Phase 2 →](/docs/product/planning/roadmap/phase-2-marketplace-depth) |

---

## Tourist UI — Pre–Phase 2

### Goal

Deliver a **minimum product UI** for tourists: a connected browse → book → manage journey with consistent navigation, not isolated Bootstrap scaffolds. Phase 2 backend capabilities (reviews, search/filter, cancel/refund) get **named UI slots** now and are wired when APIs ship.

### Why this track exists

Phase 1 and Phase 2 roadmaps list **functional web deliverables** (pages that exist and show API data) but do not schedule holistic tourist UX design. As of the last audit against `red-cab-web/`:

| Area | Status |
| --- | --- |
| Auth, account profile | Implemented |
| Discover funnel (`/account/discover/…`) | Implemented; auth-gated |
| Listing detail, checkout, bookings | Implemented |
| Homepage `/` | Phase 0 placeholder; not linked to discover |
| Public discover (guest browse) | Not implemented — `AMB-022` resolved (public browse); route contract in [web-56 spec](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) |
| Near-me / map pins | Not started |
| Phase 2 UI slots (filter bar, review, cancel) | Not scaffolded |

This track closes that gap **before** Phase 2 adds more screens on an unstable IA.

### Relationship to backend phases

| Backend phase | Tourist UI in this track |
| --- | --- |
| Phase 1 (complete or in progress) | Wire real data on funnel pages; fix IA and shells |
| Phase 2 (upcoming) | Placeholder slots only until API ready; then replace placeholders |

**Do not block** Phase 1 API work on visual polish. **Do block** Phase 2 tourist feature UI on unresolved access model and funnel structure from Milestone A.

---

## How to proceed (planning order)

Plan and implement in this sequence. Skipping a step causes rework.

```text
1. Access model + route contract     → URLs, auth gates, SEO (index/noindex)
2. Information architecture + funnel → sitemap, breadcrumbs, layout assignment
3. Layout shell + navigation         → header, footer, mobile nav, shared states
4. Phase 1 page specs                → home → discover → listing → checkout → bookings
5. Phase 2 placeholder inventory     → disabled slots; wire when backend ships
6. Visual polish                     → tokens, wireframes, copy (optional before Phase 2 code)
```

---

## Milestone A — Foundations

**Output:** written decisions + route map (can live in this doc or a linked spec under `docs/engineering/specs/` when implementation starts).

### A1 — Access model (locked)

**Locked (`AMB-022` resolved — Option A, 2026-09-20):** Public browse of districts, areas, listings, and indicative pricing. Authentication required only at checkout initiation. Full contract: [engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract).

| Decision | Current `red-cab-web` | Requirements / ambiguity |
| --- | --- | --- |
| Guest discovery | Discover under `/account/discover` with `withTouristAuth` | `FR-IAM-012` Approved: visitors may browse; account required to **book** only |
| Homepage role | Placeholder at `/` | Entry to discover; SEO landing (`index, follow`) |
| Booking gate | Checkout requires tourist auth | Correct |
| Account-only pages | `/account`, `/account/bookings`, checkout | Stay auth-gated; `noindex, nofollow` |

**Canonical route map** (route file: `marketplace.routes.js`; discover subtree moves out of `tourist.routes.js` in `#60`):

| Surface | Path | Auth | SEO |
| --- | --- | --- | --- |
| Home | `/` | Optional | `index, follow` |
| Districts index | `/districts` | None | `index, follow` |
| Areas in district | `/districts/:districtSlug` | None | `index, follow` |
| Listings in area | `/districts/:districtSlug/areas/:areaSlug/listings` | None | `index, follow` |
| Listing detail | `/districts/:districtSlug/areas/:areaSlug/listings/:listingUuid` | None | `index, follow` |
| Listing resolver alias | `/listings/:listingUuid` | None | `noindex, nofollow` (302 → canonical) |
| Login / sign-up | `/login`, `/sign-up` | None | per existing rules |
| Checkout | `/account/checkout` | Required (tourist) | `noindex, nofollow` |
| Checkout return | `/account/checkout/return` | Required | `noindex, nofollow` |
| Bookings list | `/account/bookings` | Required | `noindex, nofollow` |
| Booking detail | `/account/bookings/:bookingId` | Required | `noindex, nofollow` |
| Account | `/account` | Required | `noindex, nofollow` |
| Sitemap | `/sitemap.xml` | None | n/a (`#57`) |

> **Redirect / migration** (implemented in `#60`; full matrix in [spec #56](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract#redirect--migration)):
>
> | Old path | New path | Redirect |
> | --- | --- | --- |
> | `/account/discover` | `/districts` | 301 |
> | `/account/discover/:districtId` | `/districts/{slug}` | 301 |
> | `/account/discover/:districtId/:areaId` | `/districts/{d}/areas/{a}/listings` | 301 |
> | `/account/discover/:districtId/:areaId/:listingId` | `/districts/{d}/areas/{a}/listings/{listingUuid}` | 301 |
> | `/discover`, `/discover/*` | `/districts` | 301 (defensive) |
> | `/listings/:listingUuid` | canonical nested listing path | 302 |
>
> Legacy `/account/discover/*` redirects accept UUID segments during the [`red-cab-api#134`](https://github.com/markmamba/red-cab-api/issues/134) transition window. Retained one release after cutover, then removed by `WEB-1`.

### A2 — Information architecture

Locked inputs:

- **Primary navigation:** District → Area (`AMB-020` resolved).
- **Service type:** filter on listing list, not top-level nav (`D-02`).
- **Language:** EN/JA labels from API fields + account preference (`OPR-9`).

**Primary funnel:**

```text
Home
  → Discover (districts)
    → Areas in district
      → Listings in area
        → Listing detail (passenger count, slot, server price)
          → Checkout (fulfillment → policy → payment)
            → Return / confirmation
              → Booking detail
                → Bookings list
```

**Deliverables** (locked in [web-57 spec](/docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links)):

- [x] Sitemap with layout assignment (public shell vs account shell)
- [x] Breadcrumb rules per level (geography nav + booking context)
- [x] Back-navigation and deep-link rules (shareable listing URLs)

### A3 — Layout shell + navigation

One tourist chrome across public and account surfaces.

**red-cab-web**

- [x] Unify `TouristPublicLayout` and `TouristDashboardLayout` nav items (Districts, Bookings when logged in, Account, auth CTAs) — `#58`
- [x] Mobile nav pattern (collapsible + primary CTA) — `#58`
- [x] Footer (legal links, language hint, support contact placeholder) — `#58`
- [x] Shared empty, error, and loading patterns for catalog and bookings domains — `#58` (`TouristEmptyState`, `TouristErrorState`, `TouristShellPending` on public loaders via `#60`)
- [ ] Minimal design tokens documented (Bootstrap-first; overrides in `_variables.scss` per [frontend conventions](/docs/engineering/conventions/frontend)) — Milestone E / `#69`
- [x] Tourist marketplace IAM in-shell chrome (`TouristAuthContent`) — `#64` / [web-64](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment)

---

## Milestone B — Phase 1 funnel UI

Implement or refactor pages so the funnel in A2 is traversable end-to-end. Prefer domain views under `app/domains/`; routes stay thin.

| Priority | Page | Backend today | Deliverable |
| --- | --- | --- | --- |
| P0 | Homepage | N/A | Replace Phase 0 card; CTA into discover |
| P0 | Discover — districts | API exists | District grid/list |
| P0 | Discover — areas | API exists | Area list within district |
| P0 | Discover — listings | API exists | Listing cards; server `starting_price_jpy` only |
| P0 | Listing detail | API exists | Quote panel, slot selection, Book CTA → checkout |
| P0 | Checkout + return | API exists | Fulfillment → policy → payment handoff → confirmation poll |
| P0 | Bookings list + detail | API exists | Status badges; link back to listing |
| P1 | Account home | Done | Align with new shell only |
| P1 | Auth pages | Done | Restyle to match shell; no behavior change |

**red-cab-web checklist**

- [ ] Homepage wired to discover entry
- [ ] Public discover routes (per A1 decision) or documented exception
- [ ] Listing detail uses server `price_breakdown` only (`PRC-1`)
- [ ] Checkout multi-step layout stable (fulfillment, policy, payment)
- [ ] Bookings list supports status filter via URL (`useSearchParams`)
- [ ] Geography labels respect language preference (`name_en` / `name_ja`)

---

## Milestone C — Phase 1 gaps (placeholder-friendly)

Features with Phase 1 API scope but not yet built in web. Scaffold UI regions; wire when API is ready.

| Feature | UI location | Backend | Milestone C deliverable |
| --- | --- | --- | --- |
| Near-me Area discovery | Discover index or district page | `FR-CAT-032` | Location prompt + ranked area list shell |
| Map pins | Listing + area surfaces | Phase 1 catalog | Map/pin container; centroid from API |
| Sort on listing index | Listing list toolbar | API accepts `order_by` / `order_dir` | Sort control wired to URL params |

**red-cab-web**

- [ ] Near-me section (hidden or “enable location” until API wired)
- [ ] Map pin region on listing/area views
- [ ] Listing list sort control (at minimum: published date, rating when REV live)

---

## Milestone D — Phase 2 placeholder inventory

Scaffold **named slots** on existing pages. Do not implement Phase 2 API clients until [Phase 2](/docs/product/planning/roadmap/phase-2-marketplace-depth) specs are approved. Placeholders may be hidden, disabled, or labeled “Coming soon” per product preference.

| Phase 2 capability | Placeholder location | Component / route slot |
| --- | --- | --- |
| Search / filter / sort | Discover listing list | `CatalogListingDiscoverToolbar` — filter bar + search field |
| Reviews — submit | Booking detail (completed) | “Write a review” action stub |
| Reviews — display | Listing detail, list cards | Rating block exists; empty state until REV API |
| Cancel booking | Booking detail | Cancel action + confirmation modal stub |
| Refund status | Booking detail | Refund timeline / status panel stub |
| Bundle booking | Checkout order summary | Secondary leg summary extension stub |
| Provider response | N/A on tourist app | — (Provider + Team surfaces) |

**Placeholder rules:**

1. Route and layout slot exist even if the control is disabled.
2. No client-side price or refund math — display API payloads only.
3. When backend ships, replace stub with real API module under `app/api/` and domain view; do not invent parallel UI patterns.

**red-cab-web**

- [ ] Discover toolbar slot (filters disabled until Phase 2 CAT search)
- [ ] Booking detail action area (cancel + review stubs)
- [ ] Booking detail refund status panel stub
- [ ] Checkout summary extension point for bundle legs

---

## Milestone E — Visual polish (optional before Phase 2 code)

Not required to start Milestone B, but recommended before high-traffic pages go to production.

- [ ] Brand tokens in `app/styles/_variables.scss`
- [ ] Wireframes for Home, listing detail, checkout (tool of choice)
- [ ] EN/JA copy patterns for discovery and checkout
- [ ] Card/list patterns aligned across discover and bookings

---

## Current implementation snapshot

Audit baseline aligned with `red-cab-web@c4ce884` (2026-09-26). Program sequencing: [Web platform program strategy](/docs/product/planning/web-platform-program-strategy).

| Deliverable | Mark | Notes |
| --- | --- | --- |
| Auth + account profile | `[x]` | `/login`, `/sign-up`, `/account`; IAM in-shell chrome `#64` |
| Discover funnel pages | `[x]` | Public `/districts/**` (`#60`); legacy `/account/discover` redirects |
| Listing detail | `[x]` | Canonical nested public URL; resolver alias `/listings/:uuid` |
| Checkout + return | `[x]` | `/account/checkout` + return (`#62`) |
| Bookings list + detail | `[x]` | Tourist shell alignment (`#63`) |
| Homepage in funnel | `[x]` | Discover entry (`#59`) |
| Public discover (`AMB-022`) | `[~]` | Implemented (`#60`); run [auth Phase 2 verification](/docs/engineering/authentication/implementation-roadmap#phase-2--tourist-access-web-56--60) |
| Listing detail public URL | `[x]` | Per web-56 / `#60` |
| Unified tourist shell | `[~]` | `#58` + `#64`; manual QA matrix open in [web-64](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment) |
| Near-me / maps | `[ ]` | `#65`–`#66` |
| Phase 2 placeholder slots | `[ ]` | `#68` |

Legend: `[x]` done · `[~]` partial · `[ ]` not started (same as [roadmap overview](/docs/product/planning/roadmap)).

---

## Exit criteria (ready for Phase 2 tourist feature UI)

**red-cab-web**

- [ ] Milestone A decisions recorded (access model + route map + layout assignment)
- [ ] A visitor can traverse Home → Discover → Listing without signing in (`AMB-022` Option A — public browse, auth at checkout only)
- [ ] A logged-in tourist can complete Book → Checkout → Booking detail without dead-end navigation
- [ ] One consistent header (and footer) across public and account tourist surfaces
- [ ] Every Phase 2 tourist capability in [Phase 2 deliverables](/docs/product/planning/roadmap/phase-2-marketplace-depth) has a named UI slot on an existing page
- [ ] No client-side price computation on any tourist page (`PRC-1`)

**Both repos (joint)**

- [ ] Listing URLs and quote inputs used at checkout match discovery/detail (`PRC-2` alignment at UI level)

---

## Out of scope (this track)

- Corporate Client Portal and Provider Portal UI (separate surfaces)
- Team admin UI (`/team`) beyond tourist-facing impacts
- Dedicated design system beyond Bootstrap + `_variables.scss`
- OpenSearch or advanced search engine UI (Phase 2 uses API module, not new engine)
- Phase 2 backend implementation (stay in Phase 2 roadmap)

---

## Agent session playbook

When picking up tourist UI work:

1. Read [Web platform program strategy](/docs/product/planning/web-platform-program-strategy) if work touches auth, routes, or overlaps epic `#23`.
2. Read this document for milestone order and exit criteria.
3. Confirm Milestone A decisions before changing routes or auth HOCs.
4. Read [frontend conventions](/docs/engineering/conventions/frontend) and [domain-to-code-mapping](/docs/engineering/conventions/domain-to-code-mapping).
5. For behavior tied to Phase 2 APIs, scaffold placeholders only until the matching [implementation spec](/docs/engineering/specs/) is `approved`.
6. Milestone B is complete (`#56`–`#64`); resume at verification, `#68`, or Milestone C/E per program strategy.

---

## Related documents

- [Phase 1 — Web surfaces (minimum)](/docs/product/planning/roadmap/phase-1-mvp#web-surfaces-minimum)
- [Phase 2 — red-cab-web deliverables](/docs/product/planning/roadmap/phase-2-marketplace-depth)
- [FR-CAT-004 — Primary discovery navigation](/docs/product/requirements/functional-requirements/cat)
- [FR-IAM-012 — Guest browsing](/docs/product/requirements/functional-requirements/iam)
- [Web platform program strategy](/docs/product/planning/web-platform-program-strategy) — parallel tourist vs auth tracks, gates, issue map
- [Authentication series](/docs/engineering/authentication) — how the web enforces access. `/account/**` keeps `withTouristAuth` until [roadmap Phase 3](/docs/engineering/authentication/implementation-roadmap#phase-3--auth-core-team-account-login-pages); new Phase 2 authenticated tourist pages go under `tourist-required-policy`
