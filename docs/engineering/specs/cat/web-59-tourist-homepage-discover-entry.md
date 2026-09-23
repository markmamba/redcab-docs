---
title: "Tourist homepage discover entry"
sidebar_label: Web · Homepage
issue: "https://github.com/markmamba/red-cab-web/issues/59"
repos:
  - red-cab-web
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "docs/engineering/specs/platform/web-58-tourist-unified-layout-shell.md"
  - "red-cab-web#56"
  - "red-cab-web#58"
  - "red-cab-web#60"
---

## TL;DR

- **Ships:** replace Phase 0 placeholder at `/` with a marketplace landing page in `TouristPublicLayout`; primary CTA → `/districts`; `index, follow` robots; canonical tag for `/`.
- **Ships API + web together:** `featured=true` query param on districts index; co-shipped in this spec (no separate API issue). **API deploys before web.**
- **Resilient homepage:** hero + primary CTA always render; featured district grid only when loader returns `districts.length > 0`; API errors degrade to CTA-only via `handleLoaderError`.
- **Does NOT ship:** layout shell (`#58`), route migration (`#60`), breadcrumbs/sitemap (`#57` follow-on), auth page restyle, listing/checkout UX.
- **Breaking change:** No.

## Problem

Homepage `/` is still a Phase 0 scaffold (`app/routes/home-page.jsx`) with auth CTAs and no discover entry. Milestone B P0 and ADR-017 require a real SEO landing that routes guests into the public catalog funnel at `/districts`.

Evidence: `home-page.jsx` placeholder copy; roadmap [`tourist-ui-pre-phase-2.md`](/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md) Milestone B; ADR-017 §5 issue #59 row.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Home path `/`, robots, featured API requirement, canonical deferral |
| web-58 | [/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell](/docs/engineering/specs/platform/web-58-tourist-unified-layout-shell) | Shell ownership; homepage content deferred here |
| web-57 | [/docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links](/docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links) | Homepage featured districts in #59 scope |
| ADR-017 | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Distinct landing; CTA → `/districts`; district hub links for SEO |
| FR-CAT-004 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | District → Area hierarchy in IA |
| FR-IAM-012 | [/docs/product/requirements/functional-requirements/iam.md](/docs/product/requirements/functional-requirements/iam) | Guest browse |
| PRC-1 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | No client-side price computation |
| INV-8 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Zero-listing geography hidden |
| frontend.md | [/docs/engineering/conventions/frontend.md](/docs/engineering/conventions/frontend) | Server loader + canonical for indexable pages |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Primary CTA targets **`/districts`** | `/discover` (301s anyway); make `/` the districts index | Locked by ADR-017 / web-56 |
| 2 | Distinct **marketing landing** at `/`, not the districts index | Redirect `/` → `/districts` | ADR-017 Q2 recommended answer |
| 3 | Emit **canonical** for `/` via `CatalogListingService.buildCanonicalUrl('/')` | Defer again | web-56 explicitly deferred Home canonical to #59 |
| 4 | Extract **`home-landing-view.jsx`** under `app/domains/catalog-listing/` | Inline all JSX in route module | Domain view convention; route stays thin |
| 5 | **No auth CTAs** in homepage body | Keep Sign up / Sign in buttons from placeholder | Shell guest nav already exposes auth (`tourist-nav-config.js`) |
| 6 | Featured districts via **server `loader`** | `clientLoader`; static grid | web-56 decision #6; crawlers need SSR content |
| 7 | Featured API: **`featured=true`** on districts index | Dedicated `/featured` endpoint; client-side pick from full index | web-56 forbids client picking; `display_order` already drives admin ordering |
| 8 | Reuse **`CatalogDistrictListView`** for featured grid | New card component | Same slug links via `buildDistrictPath`; no prices on cards (PRC-1 safe) |
| 9 | **No prices** on homepage | Show `starting_price_jpy` on district cards | Not required for hub links; avoids PRC-1 surface area |
| 10 | **Graceful degradation** — hero + CTA always; grid when `districts.length > 0` | Fail loader on API error | Cold start and outages must not 500 `/` |
| 11 | **Co-ship API + web** in one release | Separate `red-cab-api` issue + `api-XXX` spec | Single spec owns cross-repo contract; stacked PRs acceptable |
| 12 | **API deploy before web** | Same-moment deploy with no ordering | Avoids broken homepage loader against old API |
| 13 | **Web PR blocked until `#60` on `main`** | Ship `#59` before route migration | CTA target `/districts` must exist |
| 14 | **`featured=true` contract locked** — force sort, cap size, no page > 1 | Allow client `order_by` override | Server owns homepage curation per web-56 |

## Release sequencing

```text
#58 + #60 merged to main
        │
        ├── API PR (#59 featured districts) ── deploy API
        │
        └── Web PR (#59 homepage) ── deploy web (after API live)
```

- **`#59` web branch** bases off updated `main` with `#60` merged — not the old `60-feattourist-…` branch.
- **Deploy checklist:** API live → verify `GET …/districts?featured=true&page_size=6` → merge/deploy web.
- **PR description** links `red-cab-web#59`, API PR, and this spec path.

## API contract

### Featured districts index

| Method | Path | Auth | Query params | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/districts` | Optional (guest) | `featured=true`, `page_size` (optional; default 6, max 12) | Same shape as existing index (`catalog_districts` + `meta`) | When `featured=true`: return top N discoverable districts; see rules below |

**Behavior when `featured=true`:**

- **Server-side contract** for homepage curation — not client-side filtering of a full list.
- **Force sort:** `order_by=display_order`, `order_dir=asc`, then `name_en` asc tie-break (manager behavior). **Ignore** client `order_by` / `order_dir`.
- **Page size:** default `6`; cap at `12`; values outside `1..12` fall back to default.
- **Pagination:** `page > 1` → **422** validation error. Featured mode is always a single slice.
- **`INV-8` unchanged:** only districts with published listings (existing `.discoverable` scope).
- **No new DB column:** `display_order` on `catalog_geographies` is the ordering key. Changing order affects both homepage featured set and `/districts` index sort — accepted for #59; `is_featured` deferred.
- **Tied `display_order`:** falls back to `name_en` asc (existing manager tie-break).

**Non-featured index:** unchanged — existing pagination and `order_by` validation apply.

### Files to create or modify (API)

- `app/domains/catalog/districts/marketplace_index_request.rb`
- `app/domains/catalog/districts/marketplace_index_validator.rb`
- `app/domains/catalog/districts/marketplace_index_manager.rb`
- `test/integration/marketplace/catalog/districts_index_integration_test.rb`

## Web contract

| Surface | Path | Route file | Layout | Loader | API module | robots | canonical |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | `marketplace.routes.js` → `home-page.jsx` | `TouristPublicLayout` | `loader` | `marketplace-catalog-districts-api.index` (featured) | `index, follow` | yes (`/`) |

### Page structure

1. **Hero** — H1, short value proposition (functional copy; Bootstrap typography).
2. **Primary CTA** — "Browse districts" (or equivalent) → `MARKETPLACE_CATALOG_PATHS.DISTRICTS` (`/districts`). **Always rendered.**
3. **Featured districts** — section heading + `CatalogDistrictListView` **only when** `districts.length > 0`. No empty-state alert on homepage when zero districts.
4. **No** Sign up / Sign in in page body (decision #5).

### Meta

```javascript
export const meta = () => ([
  { title: 'Red Cab | Japan Transfer Marketplace' },
  { name: 'description', content: '…' },
  { name: 'robots', content: 'index, follow' },
  {
    tagName : 'link',
    rel     : 'canonical',
    href    : CatalogListingService.buildCanonicalUrl('/')
  }
])
```

### Loader

- Use `buildMarketplaceCatalogLoaderOptions(request)` for SSR cookie passthrough (same as catalog district pages).
- Call **exactly** `marketplaceCatalogDistrictsApi.index({ featured: true, page_size: 6 }, loaderOptions)` — no other sort or pagination params.
- On success: return `{ districts: catalog_districts || [] }`.
- On recoverable API error: `handleLoaderError(error, { districts: [] })` — homepage still renders hero + CTA.
- Log non-401 API errors server-side (loader `console.error` or existing logging pattern) so silent degradation is observable in ops.
- Export `HydrateFallback` with `TouristShellPending`.
- `home-landing-view.jsx` receives `districts` prop; renders featured section only when `districts.length > 0`.

### Files to create or modify (Web)

- `app/routes/home-page.jsx` — replace placeholder; meta; loader with `handleLoaderError` fallback
- `app/domains/catalog-listing/home-landing-view.jsx` — hero, CTA, conditional featured grid
- `app/api/marketplace-catalog-districts-api.js` — pass `featured` + `page_size` search params
- `app/routes/home-page.spec.js` — loader success, error fallback, empty districts

## Data / domain touchpoints

- **Bounded context:** CAT (discovery surface); IAM access model already locked (guest browse).
- **`display_order`:** Admin-controlled ordering on `catalog_geographies`; team admin can adjust via geography endpoints.
- **`INV-8`:** Featured list must use the same `.discoverable` scope as districts index — no widening of geography.
- **`PRC-1`:** Homepage must not compute or display prices from client data; district cards show names + links only.

## Out of scope

- Breadcrumb data on home route (`#57` follow-on)
- Sitemap loader entries for home (`#57` follow-on)
- `is_featured` boolean column (future curation if product needs explicit flags)
- Near-me / map (Milestone C)
- Auth page chrome changes
- Milestone E visual polish / brand copy sign-off

## Tasks

### Docs

- [x] Human verification MCQs (plan artifact)
- [x] Run `review-implementation-spec` on this file
- [x] Set `status: approved` after verification passes
- [ ] Commit spec to `redcab-docs` before codegen

### API

- [ ] Add `featured` param to districts marketplace index
- [ ] Lock sort, cap `page_size`, reject `page > 1` when `featured=true`
- [ ] Integration tests: ordering, `order_by` ignored, page rejection, INV-8
- [ ] Deploy API **before** web PR merges

### Web

- [ ] Create `home-landing-view.jsx`
- [ ] Replace `home-page.jsx` placeholder
- [ ] Wire primary CTA to `/districts`
- [ ] Add canonical meta tag
- [ ] Add loader with `handleLoaderError` graceful fallback
- [ ] Conditional featured grid in `home-landing-view.jsx`
- [ ] Add `home-page.spec.js` (success, error fallback, empty)
- [ ] Remove duplicate auth CTAs from page body (decision #5)

## Acceptance criteria

- [ ] Homepage replaces Phase 0 card with marketplace landing content
- [ ] Primary CTA routes to `/districts`
- [ ] Meta robots: `index, follow`
- [ ] Page uses `TouristPublicLayout` (no layout changes)
- [ ] Canonical `<link rel="canonical">` for `/`
- [ ] No client-side price computation (`PRC-1`)
- [ ] Featured district links via server loader + API — not client-side picking
- [ ] Hero + CTA render when featured API fails or returns empty
- [ ] Domain view extracted under `app/domains/catalog-listing/`
- [ ] API deployed before web; `#60` on `main` before web PR opens

## Verification

```bash
# After spec approved and code ships:
cd red-cab-web
npm run test -- app/routes/home-page.spec.js   # if loader ships
npm run lint

# Manual
# 1. Open / — tourist shell, hero, Browse Districts CTA → /districts
# 2. View source — robots index,follow; canonical href for /
# 3. Featured: district cards link to /districts/{slug}; curl without JS shows grid HTML when data exists
# 4. API down or empty: hero + CTA still render; no featured section; no 500
# 5. No prices on homepage

# API:
cd red-cab-api
bin/rails test test/integration/marketplace/catalog/districts_index_integration_test.rb
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-23 | Mark | plan phase MCQs Q1–Q4 | Verified — full landing, featured=true, co-ship API+web, no body auth CTAs |
| 2026-09-23 | Mark | edge-case amendments | Graceful degradation, locked featured contract, API-before-web release gate |
| 2026-09-23 | Mark | `review-implementation-spec` + author approval | Approved — no must-fix; ready for codegen |
