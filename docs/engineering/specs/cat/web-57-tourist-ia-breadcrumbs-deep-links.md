---
title: "Tourist IA, breadcrumbs, sitemap, and deep-link rules"
sidebar_label: Web · Tourist IA
issue: "https://github.com/markmamba/red-cab-web/issues/57"
repos:
  - red-cab-web
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "docs/engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors.md"
  - "red-cab-api#134"
---

## TL;DR

- **Locks:** sitemap entry rules (`INV-8`), per-route breadcrumb data contract, deep-link/back-navigation rules, and bilingual label resolution for the tourist catalog funnel — built on the locked `#56` route table (not restated here).
- **Does NOT ship:** route migration (`#60`), layout shell (`#58`), homepage (`#59`), or checkout UX (`#63`). Stale-slug **301 rules** are locked in `#56`; this spec defines breadcrumb/deep-link UX on top.
- **Breaking change:** No URL changes. Behavior change (documented for `#60`/follow-on web): public routes **drop** single-child auto-redirect; always render `/districts` and district index pages.

## Problem

Public routes are locked (`#56`) but the tourist funnel lacks:

1. A crawlable `/sitemap.xml` with layout-aware entry rules.
2. A documented breadcrumb data contract — `FR-CAT-004` requires District → Area hierarchy to be *visible*, not only present in the URL.
3. Documented deep-link, back-navigation, and locale rules for shareable listing URLs, booking return paths, and the `/listings/:uuid` resolver alias.

[`red-cab-api#134`](https://github.com/markmamba/red-cab-api/issues/134) delivered `area.district` and `area.ancestors[]` on listing detail — breadcrumb ancestor chain is buildable from the listing payload alone.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-CAT-004 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | District → Area hierarchy in URL and navigation IA |
| FR-CAT-003 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Discovery within discoverable areas; `INV-8` hides zero-listing geography |
| D-02 | [/docs/product/business-rules/glossary](/docs/product/business-rules/glossary) | Service type is a listing-list filter, not top-level nav |
| INV-8 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Zero-listing Districts/Areas hidden from discovery and sitemap |
| OPR-9 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Language preference for user-facing labels |
| NFR-I18N-002 | [/docs/product/requirements/non-functional-requirements](/docs/product/requirements/non-functional-requirements) | Tourist app defaults EN when no stored preference |
| NFR-I18N-003 | [/docs/product/requirements/non-functional-requirements](/docs/product/requirements/non-functional-requirements) | Bilingual District/Area labels (`name_en` / `name_ja`) |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Locked route table, redirect matrix, layout assignment, sitemap path |
| api-134 | [/docs/engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors](/docs/engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors) | District/area slugs + ancestor embed on listing detail |
| ADR-017 | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Issue chain, stale-slug 301, `/listings/:uuid` alias |
| frontend.md | [/docs/engineering/conventions/frontend](/docs/engineering/conventions/frontend) | `handle.breadcrumb` pattern, sitemap resource route, canonical tags |
| tourist-ui-pre-phase-2 | [/docs/product/planning/roadmap/tourist-ui-pre-phase-2](/docs/product/planning/roadmap/tourist-ui-pre-phase-2) | Milestone A2 deliverables |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Breadcrumb mechanism is **`handle.breadcrumb`** on each route module (string, `{ label, to?, isClickable? }`, function, or array) | Loader-computed array passed to layout; client-only component tree | Matches `frontend.md`, `app/components/breadcrumbs.jsx`, and team portal pattern; `Breadcrumbs` reads via `useMatches()` |
| 2 | Listing detail breadcrumb trail is buildable from **listing detail payload alone** (`area` embed with nested `district` and `ancestors[]`, plus top-level listing title fields from `#134`) | Re-fetch district/area in layout loader; client-side slug inference | PKM list-detail ownership; detail endpoint owns ancestor chain |
| 3 | **Guest locale** on public catalog pages defaults to **EN** per `NFR-I18N-002` | `Accept-Language` header; cookie; URL segment | Requirement exists; `getLocalizedLabel` already falls back EN→JA when preference omitted |
| 4 | **Logged-in locale** uses `identitiesAccount.language_preference` from session (`OPR-9`) on all surfaces including public browse | Separate public-locale setting | Single preference for tourist; first-login prompt already captures choice |
| 5 | Centralize locale resolution in **`useLanguagePreference()`** hook (auth preference → EN default) | Per-page `identitiesAccount?.language_preference` | Eliminates drift across catalog pages, breadcrumbs, nav, and titles |
| 6 | **Service type** (`D-02`) appears only as `service_type` query filter on area listings — never a breadcrumb segment or nav item | Top-level "Charter bus" nav | Glossary + `#56` reserved query params |
| 7 | **Shareable listing URLs** use the canonical nested path only; `/listings/:uuid` is for UUID-only holders (booking detail, notifications) | Share resolver alias externally | `#56` design decision #3; resolver is `noindex` |
| 8 | **Booking detail → listing** uses `<Link to="/listings/{listingUuid}">` — fresh navigation through resolver (302 → canonical), not `history.back()` | Direct canonical path in link; browser back only | Booking payload may lack current slugs; resolver is the stable contract |
| 9 | **Stale-slug 301 UX** is **silent** — loader redirects before render; no toast or flash | Toast; interstitial | `#56` implements loader `redirect(canonicalPath, 301)`; standard SEO practice |
| 10 | **Sitemap generation** is **on-demand server `loader`** with `Cache-Control: public, max-age=3600` | Build-time static; hybrid | Listing set is dynamic; SSR catalog already uses server loaders |
| 11 | **Remove single-child auto-redirect** on public `/districts` routes — always render index pages | Keep current auto-skip from `/account/discover` | SEO favors reachable `/districts` and district index URLs |
| 12 | **404 for unknown/unpublished listing** uses a **dedicated marketplace not-found page** — neutral copy + link to `/districts` | Inline Card; generic ErrorBoundary | `#56` locks 404; defined escape hatch for tourists |
| 13 | **This issue is docs-only** — closes after spec PR; web implementation is a **follow-on issue** (re-scopes `web-56` sitemap assignment out of `#57`) | Two-phase under `#57`; single combined PR | GitHub issue labeled `documentation`; matches `#56` docs-first pattern |

## IA sitemap

Layout assignment references the `#56` Web contract table — paths are not restated.

| Surface | Path (from #56) | Layout shell | In `/sitemap.xml`? | Notes |
| --- | --- | --- | --- | --- |
| Home | `/` | `TouristPublicLayout` | Yes (`#59` may add district links later) | No catalog API in sitemap loader until `#59` |
| Districts index | `/districts` | `TouristPublicLayout` | Yes | Omit if zero districts (`INV-8`) |
| Areas in district | `/districts/:districtSlug` | `TouristPublicLayout` | Yes per district with ≥1 published listing | Omit districts with zero listings |
| Listings in area | `/districts/:d/areas/:a/listings` | `TouristPublicLayout` | Yes per area with ≥1 published listing | Canonical URL without query params |
| Listing detail | `/districts/:d/areas/:a/listings/:listingUuid` | `TouristPublicLayout` | Yes per published listing | UUID segment; Phase 1 canonical |
| Listing resolver | `/listings/:listingUuid` | — (loader redirect) | **No** | `noindex`; 302 target |
| Login / sign-up | `/login`, `/sign-up` | `PublicAuthLayout` | No | Reference only |
| Account home | `/account` | `TouristDashboardLayout` | No | `noindex` |
| Checkout | `/account/checkout` | `TouristDashboardLayout` | No | `noindex` |
| Checkout return | `/account/checkout/return` | `TouristDashboardLayout` | No | `noindex` |
| Bookings list | `/account/bookings` | `TouristDashboardLayout` | No | `noindex` |
| Booking detail | `/account/bookings/:bookingId` | `TouristDashboardLayout` | No | `noindex` |

**Service type:** `service_type` filter affects listing list content only — never a sitemap entry or nav node.

### Sitemap implementation contract

| Rule | Convention |
| --- | --- |
| Route | `routes/marketplace/sitemap.xml.js` resource route; registered in `marketplace.routes.js` |
| Loader | Server `loader` returns `Response` with `Content-Type: application/xml` |
| Data source | `marketplace-catalog-districts-api.index` + per-district area/listing fetches (or paginated listing index if API supports bulk) — exact API composition in Web tasks |
| `INV-8` | Districts/areas with zero published listings produce **no** `<url>` entries |
| Exclusions | All `noindex` routes (`/account/**`, `/listings/:uuid`, auth pages) |
| Canonical URLs | Each `<loc>` uses absolute HTTPS URL at slug path without filter/pagination query params |
| Caching | `Cache-Control: public, max-age=3600` on XML response |

## Breadcrumb data contract

Rendered by `<Breadcrumbs />` in layout shells (`#58` wires placement). Each route module exports `handle.breadcrumb`.

### Shape

```javascript
// string shorthand
breadcrumb: 'Districts'

// object
breadcrumb: { label: 'Shinjuku', to: '/districts/shinjuku' }

// function — receives { params, loaderData } from useMatches()
// const languagePreference = useLanguagePreference() — resolve in route module scope before handle export
breadcrumb: ({ params, loaderData }) => ({
  label: CatalogListingService.getLocalizedLabel(loaderData.catalog_district, 'name', languagePreference),
  to: MARKETPLACE_CATALOG_PATHS.district(params.districtSlug)
})

// array — multiple crumbs from one route (rare; prefer one crumb per route level)
breadcrumb: [
  { label: 'Districts', to: '/districts' },
  { label: 'Tokyo' }
]
```

Last crumb is never linked (`breadcrumbs.jsx` rule). Prior crumbs link when `to` is set.

### Per-route trail (public catalog)

| Route | Breadcrumb segment(s) | Label source | `to` target |
| --- | --- | --- | --- |
| Home | _(none — or optional "Home")_ | — | — |
| Districts index | `Districts` | Static copy | — (current page) |
| District (area list) | `Districts` → `{district name}` | `getLocalizedLabel(catalog_district, 'name')` | `/districts` |
| Area listings | `Districts` → `{district}` → `{area}` | district + area names from loader | district path; area path omitted on last |
| Listing detail | `Districts` → `{district}` → `{area}` → `{listing title}` | embeds from listing detail payload (`#134`) | prior levels link to slug paths |

Layout-level crumb (e.g. `Discover` on old layout) is replaced by geography crumbs above — no duplicate "Discover" crumb when `CatalogGeographyNav` is visible.

### Account booking crumbs

| Route | Breadcrumb segment(s) | Notes |
| --- | --- | --- |
| Bookings list | `Bookings` | Existing |
| Booking detail | `Bookings` → `Booking detail` | `Bookings` links to `/account/bookings` |
| Checkout / return | Per existing checkout crumbs | Out of scope for redesign |

Account crumbs render inside `TouristDashboardLayout` (`#58`).

## Deep-link rules

| Scenario | Behavior |
| --- | --- |
| Share listing externally | Use canonical `/districts/:d/areas/:a/listings/:uuid` — indexable, `rel=canonical` on page |
| Holder has UUID only | Link to `/listings/:uuid` → loader fetches listing → **302** to canonical nested path (`#56`) |
| Stale district/area slug in canonical URL | Loader compares URL slugs to API payload → **301** to current canonical path (`#56`) |
| Stale-slug UX | Silent 301 redirect before render — no toast |
| Unknown / unpublished listing UUID | **404** — dedicated marketplace not-found page; copy: "This listing is no longer available"; primary CTA → `/districts` |
| Checkout entry from listing | Book CTA → `/account/checkout?…` (auth) or `/login?redirect_to=…` (guest) per `#56` decision #5 — unchanged |
| `service_type` / `page` / `date` in URL | Deep links preserve query params on area listings; canonical tag and sitemap omit them |

## Back-navigation rules

| From | Affordance | Target | Semantics |
| --- | --- | --- | --- |
| Listing detail | In-page "Back to {area}" link (existing `ArrowLeft` pattern) | Area listings path for embedded area | In-app navigation; not `history.back()` |
| Area listings → district | Geography nav or breadcrumb | District area list | Breadcrumb link |
| Browser back | Native history | Previous URL in stack | No special handling |
| Booking detail | **New:** "View listing" link | `/listings/{listingUuid}` | Fresh navigation via resolver → canonical |
| Booking detail | "Back to my bookings" (existing) | `/account/bookings` | Unchanged |
| Checkout | Back to listing | Canonical listing path (post-`#60` path builders) | Per `#56` checkout back-link note |

## Language label resolution

| Context | Locale source | Function |
| --- | --- | --- |
| Guest on public catalog | `NFR-I18N-002` → **EN** default | `useLanguagePreference()` → `LANGUAGE_PREFERENCE.EN` |
| Logged-in tourist (any surface) | `identitiesAccount.language_preference` | `useLanguagePreference()` |
| Breadcrumbs, nav, page titles, meta titles | Same hook | `CatalogListingService.getLocalizedLabel(record, fieldPrefix, languagePreference)` |
| Fallback when one locale missing | JA preference → `name_ja` \|\| `name_en`; EN → `name_en` \|\| `name_ja` | Existing `getLocalizedLabel` logic |
| Formal documents / notifications | `OPR-9` stored preference | Out of scope |

Do **not** read `Accept-Language` for Phase 1 catalog browse.

## API contract

_No new API endpoints._ Sitemap and breadcrumbs consume existing marketplace APIs per `#56` / `#134`:

| Consumer | API module | Purpose |
| --- | --- | --- |
| Sitemap loader | `marketplace-catalog-districts-api.index`, area/listing index methods | Enumerate published geography + listings |
| Breadcrumb labels | Payload fields on district/area/listing show/index responses | `name_en`, `name_ja`, `slug`, `uuid` |
| Listing detail ancestors | `marketplace-catalog-listings-api.show` | District + area embed for breadcrumb trail |

## Web contract

| Surface | Path | Loader | Breadcrumb | Layout |
| --- | --- | --- | --- | --- |
| Sitemap | `/sitemap.xml` | `loader` (XML `Response`) | n/a | — |
| _(all other rows)_ | _see `#56` Web contract table_ | _unchanged_ | _per Breadcrumb data contract above_ | _per `#56`_ |

### Files to create or modify (Web)

_Follow-on web issue — after this spec is `status: approved` and committed. Coordinate with `#60` for file paths post-rename. Not in `#57` scope._

- `app/routes/marketplace/sitemap.xml.js` — **create** — XML generation
- `app/marketplace.routes.js` — register sitemap resource route
- `app/hooks/use-language-preference.js` — **create** — locale hook
- `app/routes/marketplace/catalog-district/marketplace-catalog-district-list-page.jsx` — `handle.breadcrumb`
- `app/routes/marketplace/catalog-district/marketplace-catalog-area-list-page.jsx` — `handle.breadcrumb`
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx` — `handle.breadcrumb`
- `app/routes/marketplace/catalog-district/marketplace-catalog-listing-detail-page.jsx` — `handle.breadcrumb` from payload; localized title
- `app/routes/marketplace/catalog-district/marketplace-catalog-not-found-page.jsx` — **create** — 404 UX per Design decision #12
- `app/routes/marketplace/catalog-district/marketplace-catalog-district-page-layout.jsx` — remove single-child auto-skip; render `<Breadcrumbs />` when `#58` lands
- `app/routes/tourist/booking-detail-page.jsx` — add "View listing" link
- `app/domains/catalog-listing/catalog-listing-constant.js` — `LISTING_RESOLVER_PATH(listingUuid)` helper

## Data / domain touchpoints

- **Bounded context:** CAT (catalog IA); IAM touchpoint for locale preference only.
- **`INV-8`:** Sitemap and discovery APIs already exclude zero-listing geography — sitemap must not widen exposure.
- **List vs detail:** Area/district list payloads stay lean; listing `show` owns district embed for breadcrumb ancestor chain (`api-134`).
- **Snapshots:** N/A — no booking/catalog snapshot mutation.

## Out of scope

- Route migration (`#60`) — file moves, HOC removal, `clientLoader`→`loader`, legacy redirects, stale-slug loader implementation
- Layout shell (`#58`) — nav items, mobile pattern, where `<Breadcrumbs />` mounts in chrome
- Homepage featured districts (`#59`)
- Checkout / booking UX beyond back-link rules (`#63`)
- Listing slug URLs (`CAT-1`, Phase 2)
- `Accept-Language` / browser locale detection
- Application code — follow-on web issue (Design decision #13)

## Tasks

### Docs (this issue)

- [x] Resolve Plan MCQs Q1–Q5 (all A)
- [x] Finalize spec sections; design decisions locked
- [x] Amend `docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md` — `#134` delivered; refresh cross-repo table
- [x] Grep `docs/engineering/` for stale `API-1`/`API-2` gap language; patch siblings
- [x] Run `review-implementation-spec`; set `status: approved`
- [x] Check off A2 deliverables in `tourist-ui-pre-phase-2.md` when approved

### Web (follow-on issue — not #57)

- [ ] Implement `sitemap.xml.js` resource route per Sitemap implementation contract
- [ ] Add `useLanguagePreference()`; migrate catalog pages from raw `useAuth()` preference reads
- [ ] Wire `handle.breadcrumb` on all marketplace catalog route modules
- [ ] Add booking detail "View listing" link via resolver path
- [ ] Remove single-child auto-skip on public catalog layout
- [ ] Add `marketplace-catalog-not-found-page.jsx`
- [ ] Tests: sitemap loader; breadcrumb integration on listing detail

### Docs (post-merge)

- [ ] Set spec `status: implemented` after web PR merges (if applicable)

## Acceptance criteria

- [x] Sitemap table assigns each funnel route to correct layout shell and documents `/sitemap.xml` inclusion rules
- [x] Breadcrumb data contract defined per route level with `handle.breadcrumb` shape and label sources
- [x] Back-navigation rules cover browser back, in-app affordances, and booking detail → listing via resolver
- [x] Deep-link rules cover canonical sharing, stale-slug 301 UX, resolver alias, and 404 pattern
- [x] Service type documented as filter only (`D-02`)
- [x] Language label resolution documented with guest EN default and account preference
- [x] No restatement of `#56` route table — links only
- [x] Sibling `docs-13` refreshed for `#134` delivery

## Verification

```bash
# Docs (this issue)
# From red-cab-api/ or red-cab-web/ — skill lives in both repos:
# review-implementation-spec --spec_path docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links.md

# Web (phase 2, from red-cab-web/)
npm run lint
npm run test
# Manual: curl /sitemap.xml — valid XML, no /account/ URLs
# Manual: listing detail breadcrumb built from show payload alone
# Manual: /listings/:uuid → 302 → canonical; stale slug → 301 silent
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-23 | PKM implement agent | `review-implementation-spec` | Approved — no must-fix findings; sibling hygiene (`docs-13`, `design-review-data-model`, `tourist-ui-pre-phase-2` A2) applied |
| 2026-09-23 | PKM implement agent | review should-fix pass | Applied should-fix #1–4: `web-56`, `frontend.md`, payload shape, breadcrumb example, `design-review-data-model` line 330 |
