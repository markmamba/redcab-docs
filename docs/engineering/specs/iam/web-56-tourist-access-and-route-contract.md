---
title: "Tourist access model and public route contract"
sidebar_label: Web · Tourist access
issue: "https://github.com/markmamba/red-cab-web/issues/56"
repos:
  - red-cab-web
status: approved
phase: 1
context: IAM
depends_on:
  - "docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md"
  - "red-cab-api#130 (geography administrative tree — slug resolution; URL family unchanged)"
---

## TL;DR

- **Locks:** the `AMB-022` disposition (public browse, auth only at checkout), the canonical public URL family (`/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]`), the per-surface auth-gate/SEO matrix, and the `/account/discover/*` redirect plan.
- **Does NOT ship:** no route files move and no code changes land under this issue — that is `#60` (route migration), `#58` (layout shell unification), and `#57` (breadcrumbs/sitemap/deep-links). This issue is docs + spec only.
- **Breaking URL change: Yes.** Public catalog browsing moves from the auth-gated `/account/discover/:districtId/:areaId/:listingId` to the unauthenticated, slug-based paths below. A redirect matrix is defined in [Redirect / migration](#redirect--migration) but is implemented in `#60`.

## Problem

The current tourist web implementation contradicts three sources of truth simultaneously:

1. **Requirements.** `FR-IAM-012` states visitors *may* browse catalog content without an account (status was `Provisional (AMB-022)`), and `NFR-SEC-005` requires auth only at booking initiation. In code, the discover funnel layout exports `withTouristAuth(...)` (`tourist-catalog-district-page-layout.jsx:110`), gating every catalog page behind a Tourist session.
2. **Architecture.** [`geography.md`](/docs/architecture/patterns/geography) specifies the canonical public path family as `/districts/{district_slug}/areas/{area_slug}/listings`. The live routes are `/account/discover/:districtId/:areaId/:listingId` (`tourist.routes.js:10-24`) — wrong prefix, wrong segment type (UUID instead of slug), and owned by the wrong route file (`tourist.routes.js` instead of `marketplace.routes.js` / today's `public.routes.js`).
3. **SEO / rendering.** With SEO priority high, indexable pages must render via server `loader`. All three public funnel modules currently use `clientLoader` (`tourist-catalog-district-page-layout.jsx:23`, `tourist-catalog-listing-list-page.jsx:19`, `tourist-catalog-listing-detail-page.jsx:39`) and are marked `noindex, nofollow`.

Evidence and verdicts for each row are recorded in the Session A alignment matrix — see [`/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture`](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture.md#2-alignment-matrix). This spec exists to convert that decision record into a spec artifact the codegen skills and `#60` can implement from without re-opening the access-model or URL-scheme debate.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-IAM-012 | [/docs/product/requirements/functional-requirements/iam.md](/docs/product/requirements/functional-requirements/iam) | Guest browse is an observable behavior requirement; status moves `Provisional (AMB-022)` → `Approved` per this spec |
| FR-CAT-003 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | District/area discovery is unauthenticated; `INV-8` hides zero-listing geography; `FR-CAT-003` "no available services" applies within discoverable areas (filters/date), not empty geography |
| FR-CAT-004 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | District → Area hierarchy in URL and navigation IA; breadcrumb UI and data contract are `#57`, not this spec |
| FR-CAT-005 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Listing discovery within an area is unauthenticated |
| FR-CAT-007 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Listing detail (indicative pricing) is unauthenticated |
| NFR-SEC-005 | [requirements/non-functional-requirements.md](/docs/product/requirements/non-functional-requirements) | Auth is required only at booking/checkout initiation; status moves `Provisional (AMB-022)` → `Approved` |
| AMB-022 | [/docs/product/planning/open-questions](/docs/product/planning/open-questions) | Resolved Option A (public browse) by Product Owner, 2026-09-20 — recorded here, not re-opened |
| AMB-020 | [/docs/product/planning/open-questions](/docs/product/planning/open-questions) | Navigation model — District → Area hierarchy must appear in the URL, ruling out flat `/areas/...` schemes |
| PRC-1 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | No client-side price computation — public listing pages display server-computed indicative pricing only |
| INV-8 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Zero-listing Districts/Areas stay hidden; public exposure does not widen what is discoverable |
| geography.md | [architecture/geography.md](/docs/architecture/patterns/geography) | Source of the canonical URL hierarchy (slug-based District/Area segments) |
| domain-to-code-mapping | [Domain-to-code mapping](/docs/engineering/conventions/domain-to-code-mapping) | Frontend surface → route group table; patched by this issue's Docs tasks |
| tourist-ui-pre-phase-2 | [roadmap/tourist-ui-pre-phase-2.md](/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md) | Milestone A track plan; patched by this issue's Docs tasks |
| Session A decision record | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture.md) | Authoritative source for every decision below — not re-derived |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | `AMB-022` resolves **Option A — public browse, auth at checkout only**. No partial gate, no price masking. | (B) Full auth-gated discover (current code); (C) partial gate — show districts/areas publicly, gate listing detail | Requirements already encode public browse (`FR-IAM-012`, `NFR-SEC-005`); code was the outlier, not the requirement. Product Owner confirmed Option A explicitly and excluded partial-gate variants. |
| 2 | Canonical public URL family is **`/districts/{districtSlug}/areas/{areaSlug}/listings[/{listingUuid}]`** (geography.md scheme, scored 26/30). District and Area segments are **slugs**; Listing segment is the **UUID** (Phase 1 — no listing slug column exists). | `/discover/:districtId/:areaId/:listingId` (16/30, rejected — opaque UUIDs, excluded product word, ambiguous positional depth); `/areas/...`, `/listings/...` flat scheme (20/30, rejected — drops District from the path, contradicts `AMB-020`); `/listings/:listingId` canonical-only (22/30, rejected as *primary* — no crawlable hub pages, kept as a resolver alias) | Only scheme already written into an architecture doc; expresses District → Area hierarchy; matches the nested marketplace API shape one-for-one. Scoring detail in Session A §3.2. |
| 3 | `/listings/:listingUuid` is retained as a **non-canonical resolver alias**: fetches the listing, then 302s to its canonical nested path. `noindex`, no canonical tag of its own. | Making it the primary path (rejected — no hub pages); dropping it entirely (rejected — booking detail and other UUID-only holders need a link target without geography context) | Gives any surface holding only a listing UUID (e.g., booking history) a stable link target that still resolves to the SEO-correct canonical URL. |
| 4 | Public catalog routes are owned by **`marketplace.routes.js`** (renamed from today's `public.routes.js`), not `tourist.routes.js`. The discover subtree currently nested under `tourist.routes.js`'s `prefix('account', …)` moves out entirely. | Keep discover routes in `tourist.routes.js` with auth HOC removed in place (rejected — route file ownership must match the public/private surface split per `frontend-conventions.md` and `domain-to-code-mapping.md`, independent of auth) | Route group file is a documented convention (`domain-to-code-mapping.md:119`, `frontend-conventions.md:101`), not just an auth boundary; code today violates it regardless of the HOC question. |
| 5 | The **auth gate on the checkout route** stays at `/account/checkout` (`withTouristAuth`, unchanged). Public listing detail always renders its Book CTA with a **conditional target:** (a) logged-in tourist with complete profile and a valid quote → `buildCheckoutPath` (`/account/checkout?…`); (b) guest with valid quote (slot selected) → `buildIdentitiesLoginRedirect(checkoutPath)` (`/login?redirect_to=…`); (c) no slot / incomplete quote → disabled button (existing “choose date and time” messaging). The CTA does **not** rely on `withTouristAuth` — guests never navigate to checkout directly from Book. | Gate via checkout-only redirect (`withTouristAuth` bounce — rejected for guests: causes an extra hop and flashes the protected route); disabled Book for all guests (rejected — contradicts Option A); “sign in to see pricing” interstitial (rejected — explicitly excluded by Product Owner) | Keeps the checkout **route** as the auth boundary while giving guests a single explicit login handoff with quote params preserved in `redirect_to`. Reuse `identities-auth-utils.js` `buildIdentitiesLoginRedirect` for URL shape consistency with login-page `redirect_to` handling. |
| 6 | Public routes render via **server `loader`**, not `clientLoader`, and are marked **`index, follow`**. Account routes (`/account/**`) stay `noindex, nofollow` and may keep `clientLoader`/existing patterns. | Leave `clientLoader` and add a robots flip only (rejected — with SEO priority high, crawlers must receive server-rendered content, not an empty shell) | `ky-client.js` already forwards SSR cookies, so marketplace API modules work unchanged from a server loader; this is a rendering-mode fix, not just a meta-tag fix. |
| 7 | Redirects from all `/account/discover/*` paths are **301** (permanent — no accumulated SEO equity since those paths were `noindex`, but bookmarks must survive). The `/listings/:listingUuid` alias redirect is **302** (target varies with the listing's current area). Legacy redirects are retained **one release** after cutover, then removed by a separate cleanup issue (`WEB-1`). | Skip legacy redirects entirely (rejected — breaks existing bookmarks/shared links immediately); keep legacy redirects permanently (rejected — indefinite dead-code maintenance cost for auth-gated, unindexed paths) | 301 signals a permanent move for the (rare) case any crawler indexed an auth-gated path; 302 for the alias is correct because its destination is not stable across a listing's lifetime (area reassignment). |
| 8 | District/Area slug resolution on the API is **deferred to new `red-cab-api` issues (`API-1`, `API-2`)** — out of scope for `#56` and for `#60`'s web-only work, but a **hard dependency** of `#60`. `#56` documents the API gap; it does not resolve it. | Have `#56`/`#60` implement the API resolver inline (rejected — `#56` and `#60` are web-repo issues; API work needs its own spec and PR in `red-cab-api`); ship `#60` on UUID paths and slug-ify later (rejected — would require a second migration and contradicts the locked URL scheme) | Keeps `#56` a docs-only, single-repo issue per its own acceptance criteria, while making the cross-repo dependency explicit so `#60` is not scheduled before `API-1`/`API-2` land. |

## API contract

_No API code changes are proposed or implemented by this issue._ `red-cab-web` is the only repo in scope for `#56`. The table below records the Session A verdict on API readiness so `#60` and the API team know what is and is not already in place.

| Change | Verdict |
| --- | --- |
| Marketplace optional auth (`Marketplace::BaseController`) | **No change** — already supports guest browse; `CurrentRequest.identities_user` is nilable and rescued correctly |
| District/area resolve by slug (`find_by(uuid:)` → `find_by(slug:)`) in `Catalog::Districts::MarketplaceShowManager`, `Catalog::Areas::MarketplaceIndexManager`, `Catalog::Areas::MarketplaceShowManager`, `Catalog::Listings::MarketplaceIndexManager` | **Deferred** — tracked as new issue **`API-1`** in `red-cab-api` (rename route params to `:district_slug`/`:area_slug`, introduce one geography resolver service, temporary UUID fallback during cutover). **Blocks `#60`.** |
| Embed District (uuid, slug, names) in `MarketplaceAreaEmbeddedSerializer` / listing detail DTO | **Deferred** — tracked as new issue **`API-2`** in `red-cab-api` (needed so the web can build canonical paths and breadcrumbs from a listing payload alone, without a second district fetch). **Blocks `#60`**, parallel with `API-1`. |
| Listing-level `slug` column and slug-based listing URLs | **Deferred beyond this track** — tracked as `CAT-1`, Phase 2 candidate. `#56` keeps the listing URL segment as UUID for Phase 1. |

`#60`'s acceptance criteria must include `API-1` and `API-2` as dependencies, not sub-tasks — they are filed and implemented in `red-cab-api` on their own spec/PR.

## Web contract

| Surface | Path | Route file | Page module | Layout | Auth HOC | Loader | API module | `meta` robots |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | `app/marketplace.routes.js` | `routes/home-page.jsx` | `TouristPublicLayout` | none | none (`#59`) | none (`#59`) | `index, follow` |
| Districts index | `/districts` | `app/marketplace.routes.js` | `routes/marketplace/catalog-district/marketplace-catalog-district-list-page.jsx` | `TouristPublicLayout` | none | `loader` | `marketplace-catalog-districts-api.index` | `index, follow` |
| Areas in district | `/districts/:districtSlug` | `app/marketplace.routes.js` | `routes/marketplace/catalog-district/marketplace-catalog-area-list-page.jsx` | `TouristPublicLayout` | none | `loader` | `marketplace-catalog-districts-api.show` + `.areasIndex` | `index, follow` |
| Listings in area | `/districts/:districtSlug/areas/:areaSlug/listings` | `app/marketplace.routes.js` | `routes/marketplace/catalog-district/marketplace-catalog-listing-list-page.jsx` | `TouristPublicLayout` | none | `loader` | `marketplace-catalog-listings-api.indexByArea` | `index, follow` |
| Listing detail | `/districts/:districtSlug/areas/:areaSlug/listings/:listingUuid` | `app/marketplace.routes.js` | `routes/marketplace/catalog-district/marketplace-catalog-listing-detail-page.jsx` | `TouristPublicLayout` | none | `loader` | `marketplace-catalog-listings-api.show` | `index, follow` |
| Listing resolver alias | `/listings/:listingUuid` | `app/marketplace.routes.js` | `routes/marketplace/catalog-district/marketplace-catalog-listing-resolver.jsx` | — (loader-only, redirects) | none | `loader` (redirect, no render) | `marketplace-catalog-listings-api.show` | `noindex, nofollow` |
| Login / sign-up | `/login`, `/sign-up` | `app/marketplace.routes.js` (unchanged) | existing | `PublicAuthLayout` | `withNoAuth` | existing | `identities-*-api` | per existing rules — **reference only, not modified by `#56`** |
| Account home | `/account` | `app/tourist.routes.js` (unchanged) | existing | `TouristDashboardLayout` | `withTouristAuth` | existing | `tourists-identities-accounts-api` | `noindex, nofollow` |
| Checkout | `/account/checkout` | `app/tourist.routes.js` (unchanged) | existing | `TouristDashboardLayout` | `withTouristAuth` | existing | `tourists-bookings-checkout-sessions-api` | `noindex, nofollow` |
| Checkout return | `/account/checkout/return` | `app/tourist.routes.js` (unchanged) | existing | `TouristDashboardLayout` | `withTouristAuth` | existing | `tourists-bookings-checkout-sessions-api` | `noindex, nofollow` |
| Bookings list | `/account/bookings` | `app/tourist.routes.js` (unchanged) | existing | `TouristDashboardLayout` | `withTouristAuth` | existing | `tourists-bookings-booking-api.index` | `noindex, nofollow` |
| Booking detail | `/account/bookings/:bookingId` | `app/tourist.routes.js` (unchanged) | existing | `TouristDashboardLayout` | `withTouristAuth` | existing | `tourists-bookings-booking-api.show` | `noindex, nofollow` |
| Sitemap | `/sitemap.xml` | `routes/marketplace/sitemap.xml.js` (resource route; **`#57`**) | resource route, not a page | — | none | `loader` (`#57`) | `marketplace-catalog-districts-api` (`#57`) | n/a |

**Web contract notes**

- **Home (`#59`):** Path and `index, follow` robots are locked here. No server `loader` or catalog API call until `#59` ships. Homepage district data requires a **new API capability** (featured filter or dedicated endpoint) — **not** a reuse of `marketplace-catalog-districts-api.index` with client-side picking. `#60` does not modify `home-page.jsx` except layout wiring `#58` may require.
- **Sitemap (`#57`):** `/sitemap.xml` path is locked here; resource-route registration, loader, and XML generation ship in `#57`.
- **API method names:** Match `app/api/marketplace-catalog-*-api.js` exports — `index`, `show`, `areasIndex`, `areaShow`, `indexByArea`. After `API-1`, loaders pass **slug** path segments; method names stay unchanged.
- **Canonical tags:** Each indexable catalog row above (not Home until `#59`, not account routes, not the `/listings/:uuid` alias) emits `<link rel="canonical" href="…">` pointing at its path **without** pagination or filter query params (`page`, `service_type`, `order_by`, `order_dir`, `date`). Listing detail canonical uses the slug path with listing UUID segment.

Reserved query params on the listings-in-area route (no new path segments for these, ever): `service_type` (`D-02` filter), `order_by`, `order_dir`, `page`, `date`.

### Files to create or modify (Web) — implemented in `#60`, listed here for traceability only

- `app/public.routes.js` → rename to `app/marketplace.routes.js` (same `marketplaceRoutes` export)
- Discover subtree in `app/tourist.routes.js` → move into `app/marketplace.routes.js`
- `app/routes/tourist/catalog-district/tourist-catalog-*` (5 modules) → `app/routes/marketplace/catalog-district/marketplace-catalog-*`
- `tourist-catalog-district-page-layout.jsx` → `marketplace-catalog-district-page-layout.jsx`: drop `withTouristAuth`, flip robots, convert `clientLoader` → `loader`; update geography nav links to slug paths only — full breadcrumb data contract and UI are `#57`
- `catalog-listing-constant.js`: delete `TOURIST_DISCOVER_PATH`; add `MARKETPLACE_CATALOG_PATHS` with `DISTRICTS`, `district(districtSlug)`, `areaListings(districtSlug, areaSlug)`, `listing(districtSlug, areaSlug, listingUuid)`
- `catalog-listing-service.js`: replace `buildDiscoverPath(districtId, areaId)` / `buildListingDetailPath(districtId, areaId, listingId)` with slug-taking builders; `buildCheckoutPath` unchanged; split checkout eligibility so guests with a valid quote can reach login via Book (Design decision #5)
- `tourist-dashboard-layout.jsx`, `tourist-public-layout.jsx`: nav "Discover" link target becomes `/districts` (label wording is `#58`'s call)

## Redirect / migration

| Old path | New path | Redirect type |
| --- | --- | --- |
| `/account/discover` | `/districts` | 301 |
| `/account/discover/:districtId` | `/districts/{slug resolved from UUID}` | 301 |
| `/account/discover/:districtId/:areaId` | `/districts/{d}/areas/{a}/listings` | 301 |
| `/account/discover/:districtId/:areaId/:listingId` | `/districts/{d}/areas/{a}/listings/{listingUuid}` | 301 |
| `/districts/:districtSlug/areas/:areaSlug` (bare, no `/listings`) | `/districts/:districtSlug/areas/:areaSlug/listings` | 301 |
| `/discover`, `/discover/*` | `/districts` | 301 (defensive; never publicly linked) |
| `/listings/:listingUuid` | canonical nested listing path | 302 (resolver — target varies with the listing's area) |
| Canonical `/districts/:districtSlug` with stale district slug | `/districts/{currentDistrictSlug}` | 301 |
| Canonical listings-in-area path with stale district or area slug | `/districts/{d}/areas/{a}/listings` | 301 |
| Canonical listing-detail path with stale district or area slug | canonical nested listing path | 301 |
| Canonical path where the listing UUID is unknown or unpublished | 404 | none |

Legacy `/account/discover/*` redirects accept UUID segments and depend on the API accepting either key during the transition window (`API-1`'s fallback). They ship in `#60`, are retained for one release, then removed by `WEB-1`.

**Path constant locations to update (in `#60`):**

- `catalog-listing-constant.js` — delete `TOURIST_DISCOVER_PATH`; add `MARKETPLACE_CATALOG_PATHS`
- `catalog-listing-service.js` — replace `buildDiscoverPath` / `buildListingDetailPath` with slug-taking builders
- Nav links in `tourist-dashboard-layout.jsx` and `tourist-public-layout.jsx` — "Discover" target → `/districts`
- Checkout "back" links (wherever they currently reference the discover path) — must be re-pointed to the canonical listing path so a tourist can navigate back to the exact listing they were booking

**Redirect implementation note (React Router v7):** Recommend implementing all rows above as `redirect()` calls inside route `loader` functions on the legacy route definitions (kept registered, non-rendering), rather than a server-level 301 config. Pass the status code from the **Redirect type** column explicitly — e.g. `redirect(url, 301)` for permanent rows and `redirect(url, 302)` for the `/listings/:listingUuid` resolver (React Router defaults to 302 when omitted). Rationale: loader-level `redirect()` keeps the mapping co-located with route registration (reviewable in one file), supports the UUID→slug resolution rows without a separate infra layer, and matches existing loader `redirect()` usage in this codebase. A CDN/server 301 is only preferable if the legacy paths must resolve without invoking Node at all (e.g., pure static asset host) — not the case here since SSR is already required.

**Stale-slug detection (all catalog loaders):** Every public catalog `loader` compares URL slug segments against the authoritative slugs in the API response and `redirect(canonicalPath, 301)` before render when they differ. Applies to district show, area list, listings-in-area, and listing detail — not only legacy `/account/discover/*` redirects.

| Loader route | API call | Compare URL segments vs payload |
| --- | --- | --- |
| `/districts/:districtSlug` | `marketplace-catalog-districts-api.show` | `:districtSlug` vs `catalog_district.slug` |
| `/districts/:districtSlug/areas/:areaSlug/listings` | `marketplace-catalog-districts-api.areaShow` (or area embed from index) | `:districtSlug`, `:areaSlug` vs district/area slugs in response |
| `/districts/:d/areas/:a/listings/:listingUuid` | `marketplace-catalog-listings-api.show` | `:districtSlug`, `:areaSlug` vs embedded district/area slugs (`API-2`) |

Districts index (`/districts`) has no slug segment to validate. Bare `/districts/:d/areas/:a` (no `/listings`) is handled by the dedicated 301 row above, not by payload comparison.

## Data / domain touchpoints

- **Slug fields:** `catalog_districts.slug` (unique) and `catalog_areas.slug` (unique per district) already exist and are already serialized by the API — only the *lookup* by slug (`API-1`) is missing, not the column.
- **Listing identification:** `catalog_listings` has `uuid`, no slug column. Listing segment stays UUID for Phase 1; slug-based listing URLs are `CAT-1`, deferred to Phase 2.
- **Quote/checkout handoff:** listing + slot context passes from public listing detail to checkout via `catalog-listing-service.js`'s `buildCheckoutPath` (listing UUID, slot UUID, passenger count) — query param shape **unchanged**, preserving `PRC-2` input parity. Book CTA routing per Design decision #5: authenticated tourist with profile → `buildCheckoutPath`; guest with valid quote → `buildIdentitiesLoginRedirect(checkoutPath)`; no slot → disabled.
- **`FR-CAT-003` vs `INV-8`:** `INV-8` means Districts/Areas with zero **published** listings never appear in discovery — public browse does not widen geography. `FR-CAT-003`'s "indicate when an area has no available services" applies only within a **discoverable** area (e.g. filter/date yields zero results, or `FR-CAT-006` fully-booked marking) — not for zero-listing geography.
- **Bounded context:** IAM owns the access-model decision (`FR-IAM-012`, `NFR-SEC-005`, `AMB-022`); CAT owns the district/area/listing discovery behavior itself (`FR-CAT-003/004/005/007`). This spec is filed under `context: IAM` because its primary lock is the access/auth boundary; the route table is a CAT-domain surface expressed through that boundary.

## Out of scope

- **`#57`** — IA sitemap, breadcrumbs data contract, deep-link UX (how stale-slug redirects surface to the user), `/listings/:uuid` alias in deep-link section. Stale-slug **301 rules** are locked here; `#60` implements them.
- **`#58`** — Unified tourist layout shell (nav items, mobile pattern, footer, shared empty/error/loading states). Implementation, not this spec.
- **`#59`** — Homepage content, district hub internal-linking, and the **featured-district API** (new filter or endpoint — not `marketplace-catalog-districts-api.index` reuse). Implementation, not this spec.
- **`#60`** — Route migration implementation: file moves, HOC removal, `clientLoader`→`loader` conversion, redirect implementation, robots flip. This spec is `#60`'s design input, not its code.
- **`#61`** — Closed, absorbed into `#60` (listing detail leaf cannot ship separately from its parent route tree without a broken intermediate state).
- **`#62`+** — Funnel/checkout alignment implementation (reasserts checkout as the single auth gate; no design change here).
- **Listing slug field + API (`CAT-1`)** — deferred beyond this track to Phase 2.
- **`API-1`, `API-2`** — API-side slug resolution and district-embed work. Documented here as a dependency of `#60`; implemented and spec'd in `red-cab-api`, not in this issue.
- **Phase 2 placeholder slots (`#68`)** — not addressed.

## Tasks

### Docs (this issue)

- [x] P0: `/docs/product/planning/open-questions` — mark `AMB-022` RESOLVED (Option A, Product Owner, 2026-09-20); move from P1 list to RESOLVED list; add Decision Log row citing this spec and the Session A record
- [x] P0: `requirements/functional-requirements/iam.md` — `FR-IAM-012` status `Provisional (AMB-022)` → `Approved (Decision Log AMB-022)`
- [x] P0: `requirements/non-functional-requirements.md` — `NFR-SEC-005` status → `Approved`; update the `AMB-022 (guest scope)` cross-reference to point at the resolution
- [x] P0: `roadmap/phase-1-mvp.md` — remove "Defer guest-scope UI" from the open decisions table; move `AMB-022` into the applied-decisions paragraph as public browse with auth at checkout
- [x] P0: `roadmap/tourist-ui-pre-phase-2.md` — replace the provisional A1 route map with this spec's Web contract table; replace the migration note with this spec's Redirect / migration section; drop "working assumption" framing
- [x] P0: `engineering/domain-to-code-mapping.md` — update frontend surface → route groups table (`/`, `/districts`, `/districts/:d/areas/:a/listings`); confirm `marketplace.routes.js`; state guest discovery resolves to `marketplace/` with optional auth
- [ ] P1: `architecture/geography.md` — add note that Listing segment is UUID at Phase 1, that slug changes require a 301 from the prior slug, and that slug is the public lookup key for districts/areas
- [ ] P1: `engineering/frontend-conventions.md` — add canonical-tag rule, sitemap resource route, and the rule that indexable public routes use server `loader` not `clientLoader`
- [ ] P1: `roadmap/tourist-ui-pre-phase-2.md` — drop conditional "if provisional `AMB-022` stands" language; refresh implementation-snapshot rows for public discover and listing detail
- [ ] P2: `requirements/functional-requirements/cat.md` — add cross-reference note on `FR-CAT-003`/`FR-CAT-004` that discovery is unauthenticated per `AMB-022` resolution
- [ ] File new `red-cab-api` issues `API-1` (slug resolution) and `API-2` (district embed) with bodies per Session A §5/§8.4
- [ ] Close `#61` as absorbed into `#60`; edit `#56`'s (this issue's) provisional route table reference to point at this spec; edit `#60`'s acceptance criteria to include listing detail, robots, SSR, and the `API-1`/`API-2` dependency

### Web (deferred to `#60` unless noted)

- [ ] Move public catalog routes to `marketplace.routes.js` (rename `public.routes.js`, relocate discover subtree out of `tourist.routes.js`)
- [ ] Remove `withTouristAuth` from public catalog pages/layout
- [ ] Update path builders (`catalog-listing-constant.js`, `catalog-listing-service.js`) to the slug + UUID scheme
- [ ] Add redirects from `/account/discover/*` (`redirect(url, 301)`) and `/listings/:listingUuid` resolver alias (`redirect(url, 302)`); stale-slug 301 on **all** catalog loaders per Redirect / migration note
- [ ] Book CTA conditional routing on public listing detail — guest + valid quote → `buildIdentitiesLoginRedirect(checkoutPath)`; logged-in tourist with profile → `buildCheckoutPath`; split `canStartCheckout` so guests are not blocked when a quote exists (Design decision #5)
- [ ] Update `meta` robots on public catalog pages to `index, follow`; convert `clientLoader` → `loader`
- [ ] Emit `<link rel="canonical">` on each indexable catalog page per Web contract notes
- [ ] Re-point nav "Discover" links and checkout "back" links to `/districts` / canonical listing path

### API

- [ ] None for `#56`. `API-1` (slug resolution) and `API-2` (district embed) are separate `red-cab-api` issues, blocking `#60`, tracked in the Docs tasks above.

## Acceptance criteria

- [ ] Written decision on guest browse vs auth-gated discover — `AMB-022` = Option A, recorded in Design decisions #1
- [ ] Target route map agreed and recorded — see Web contract table
- [ ] Auth gate matrix documented per surface — Web contract `Auth HOC` column; checkout route gated by `withTouristAuth`; Book CTA uses conditional login redirect for guests (Design decision #5)
- [ ] Stale-slug 301 on all catalog loaders documented — Redirect / migration matrix + stale-slug detection table
- [ ] SEO meta rules documented — Web contract `meta robots` column; `<link rel="canonical">` rule in Web contract notes; sitemap path locked here, generation in `#57`
- [ ] Canonical tags documented — each indexable catalog route emits `<link rel="canonical">` at the slug path without pagination/filter query params (Web contract notes)
- [ ] Redirect/migration plan documented for all path changes — see Redirect / migration section, all rows sourced from Session A §3.3
- [ ] Spec cites `geography.md` URL hierarchy — Governing docs + Design decision #2
- [ ] Spec states listing segment = UUID for Phase 1 — Design decision #2, Data/domain touchpoints
- [ ] No client-side price computation (`PRC-1`) — reaffirmed in Governing docs and Data/domain touchpoints; public pages display server-computed indicative pricing only
- [ ] `INV-8` reaffirmed — zero-listing Districts/Areas stay hidden even though browse is now public (Governing docs)
- [ ] API gap (`API-1`, `API-2`) documented as a dependency of `#60`, not silently absorbed into web scope (API contract section)

## Verification

```bash
# #56 is docs-only — no application code changes.
# After this spec and the Docs tasks are committed to redcab-docs/:
#   1. Run skill: review-implementation-spec --spec_path redcab-docs/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md
#   2. Address must-fix findings.
#   3. Set status: approved in this file's frontmatter.
# No `npm run` / `bin/rails test` is required for #56 itself.
# #60 (implementation) verification commands are specified in #60's own spec.
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-20 | Mark | `review-implementation-spec` | Approved after should-fix pass |
| 2026-09-20 | Mark | Author Q&A (Q1–Q4) | Approved — featured API → `#59`; all-loader slug 301; conditional Book CTA; 422 risk deferred to Session B |
