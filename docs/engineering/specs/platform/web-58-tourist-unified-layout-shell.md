---
title: "Unified tourist layout shell"
sidebar_label: Web · Tourist layout
issue: "https://github.com/markmamba/red-cab-web/issues/58"
repos:
  - red-cab-web
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/iam/web-56-tourist-access-and-route-contract.md"
  - "docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links.md"
  - "red-cab-web#56"
  - "red-cab-web#57"
  - "red-cab-web#60"
ships_with:
  - "red-cab-web#60"
---

## TL;DR

- **Ships:** one shared tourist chrome (header nav, mobile nav, footer with cross-portal links, `<Breadcrumbs />` mount, empty/error/pending UI) consumed by `TouristPublicLayout` and `TouristDashboardLayout`; config-driven nav aligned across public and account surfaces.
- **Co-ships with `#60`:** this issue **must not merge without `#60`** in the same release. Guest **Districts** nav targets `/districts` (public, unauthenticated) — no interim `/account/discover` nav target.
- **Does NOT ship:** breadcrumb `handle.breadcrumb` data on routes (`#57` follow-on web issue), homepage SEO content (`#59`), tourist marketplace IAM in-shell auth chrome (deferred to [`web-64`](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment) / `#64` — decision #19 below), API changes.
- **Breaking change:** No URL changes in `#58` alone — URL migration is `#60`. Nav label changes from "Discover" → **Districts**.

## Problem

Public (`TouristPublicLayout`) and account (`TouristDashboardLayout`) surfaces diverge today:

1. **Nav misalignment** — dashboard shows Discover/Bookings/Account; public shows auth CTAs plus Provider/Corporate cross-links with no Districts/Bookings entry (`tourist-public-layout.jsx`, `tourist-dashboard-layout.jsx`).
2. **No footer** — neither layout renders legal/support chrome; roadmap A3 requires one.
3. **Duplicated empty/error UI** — catalog and bookings pages repeat `Alert variant="light" className="border mb-0"` inline (7+ occurrences under `app/routes/tourist/`).
4. **Language prompt scoped to dashboard only** — contradicts `web-57` decision 4 (logged-in locale on all surfaces).
5. **No layout tests** — shell regressions are untested.
6. **Guest Districts nav would mislead if shipped before `#60`** — "Districts" → `/account/discover` still auth-gates guests; resolved by co-shipping with `#60`.

Evidence: audit artifact `2026-09-23-issue-58-audit.md`; roadmap [`tourist-ui-pre-phase-2.md`](/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md) Milestone A3.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| web-56 | [/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract) | Layout assignment per route; `/districts` path; auth at checkout only |
| web-57 | [/docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links](/docs/engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links) | Locale hook; breadcrumb data contract; shell mounts `<Breadcrumbs />` |
| FR-CAT-003 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | Empty listing list copy within discoverable areas |
| FR-CAT-004 | [/docs/product/requirements/functional-requirements/cat.md](/docs/product/requirements/functional-requirements/cat) | District → Area hierarchy visible in IA |
| INV-8 | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Zero-listing geography hidden — empty-state copy must not imply hidden nodes exist |
| ADR-017 | [/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Public browse access model |
| tourist-ui-pre-phase-2 | [/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md](/docs/product/planning/roadmap/tourist-ui-pre-phase-2.md) | Milestone A3 deliverables |
| frontend.md | [/docs/engineering/conventions/frontend.md](/docs/engineering/conventions/frontend) | Layout location, Bootstrap-first tokens |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Extract **`TouristShellLayout`** with thin `TouristPublicLayout` / `TouristDashboardLayout` wrappers | Duplicate nav in both layouts; single merged layout file | Preserves `#56` layout assignment; one place for auth/logout/language prompt/breadcrumbs |
| 2 | **Config-driven nav** via `tourist-nav-config.js` (precedent: `team-sidebar-config.js`) with **guest and logged-in arrays** | Hard-coded links in JSX | Same nav on public and account surfaces; logged-in user on `/` sees Districts + Bookings + Account |
| 3 | Nav label **Districts**; path **`/districts`** via `TOURIST_NAV_DISTRICTS_PATH` | Keep "Discover" label; interim `/account/discover` | `#56` locks slug path; `FR-CAT-004` hierarchy terminology; no auth-gated mismatch |
| 4 | Mobile nav uses **`Navbar.Collapse`** | Team `Offcanvas` drawer | Offcanvas is for sidebar portals; tourist uses horizontal top nav |
| 5 | Auth state from **`useAuth().isLoggedIn()`** in shell — no public route guards | Route-level auth HOC on public pages | `#56` decision 5 |
| 6 | **`IdentitiesAccountLanguagePromptModal`** in shared shell | Dashboard-only (current) | `web-57` decision 4; verify on public `/districts` after `#60` lands |
| 7 | **`TouristEmptyState`** variants with **strict per-page mapping** (see Web contract) | Keep inline alerts; loose variant rules | `listingFilters` only on filtered listing list; `generic` on district/area index; never INV-8-violating geography copy |
| 8 | **`TouristErrorState`** for inline recoverable errors | Page-local alerts only | Consistent error chrome; marketplace 404 page is `#60`/`web-57` scope |
| 9 | Main content spacing — **`Container py-4` only for `contentVariant="account"`** | Always container; bare main everywhere | Public home/catalog own spacing |
| 10 | **`#58` and `#60` ship in the same release** — `#58` PR must not merge without `#60` | `#58` first with `/account/discover` nav; defer shell | Guest Districts nav must target public `/districts`; avoids login wall on "Districts" |
| 11 | **`TOURIST_NAV_DISTRICTS_PATH`** aliases **`MARKETPLACE_CATALOG_PATHS.DISTRICTS`** (`/districts`) — defined in `#60`, imported by nav config | Separate constant updated later | Single source of truth at cutover |
| 12 | Footer — **identical** on public and account; **Provider/Corporate login as secondary footer links** | Drop cross-portal links entirely; nav secondary links | Cleaner nav; B2B portals still reachable (plan Q7=B) |
| 13 | Pending UI — **ship `TouristShellPending`**; **`#60` wires it on all public catalog server loaders** | Wire in `#58` layouts now; defer component | Component lands in `#58`; loader integration belongs with route migration |
| 14 | Mobile primary CTA — **guest Sign Up in collapsed nav; logged-in none** | Browse Districts; none | |
| 15 | **Mount `<Breadcrumbs />` in shell** (below nav, above main) | Defer mount to `#57` follow-on | Stable layout slot; `#57` follow-on only wires `handle.breadcrumb` data |
| 16 | **`CatalogGeographyNav` stays until `#57` follow-on** — follow-on **deprecates** geography nav when breadcrumb data is wired | Remove in `#58`; keep both permanently | Avoid duplicate hierarchy affordances after breadcrumbs ship |
| 17 | Districts nav **`activeMatch`** covers **`/districts` and legacy `/account/discover`** | Single-path regex; route-id matching | Highlights correctly during one-release legacy redirect window |
| 18 | Design tokens in **`_variables.scss`** (Bootstrap-first) | Inline styles only | Roadmap A3; document `$tourist-shell-*` variables in spec Tasks |
| 19 | **Auth pages (`/login`, `/sign-up`) stay on `PublicAuthLayout`** — not tourist shell | Wrap auth in tourist shell | Locked for `#58` release. **Tourist marketplace IAM presentation** superseded by [`web-64`](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment) (`TouristAuthContent` in shell `main`; `#56` layout/HOC table unchanged). Provider/corporate still use `PublicAuthLayout`. |

## Release sequencing

```text
#56 (approved) + #57 (approved, docs-only)
        │
        ├── #60 (route migration) ──┐
        │                           ├── same release / stacked PRs — do not merge #58 alone
        └── #58 (layout shell) ─────┘
                │
                └── #57 follow-on web (breadcrumb data, sitemap, geography nav removal)
```

- **`#58` is blocked on `#60` for merge** — implementation may proceed in parallel branches; release requires both.
- **`#57` follow-on** wires `handle.breadcrumb` on marketplace route modules and removes `CatalogGeographyNav` (decision #16).

## API contract

_No API changes._ [`red-cab-api#134`](https://github.com/markmamba/red-cab-api/issues/134) already delivered slug resolution for `#60`.

## Web contract

### Layout assignment (from `#56` — not restated)

Both layouts render the **same shell components**. Route → layout mapping unchanged from [`web-56` Web contract table](/docs/engineering/specs/iam/web-56-tourist-access-and-route-contract#web-contract). At `#58` ship, login/sign-up used nested `PublicAuthLayout` chrome. After **`#64`** ([`web-64`](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment)), tourist marketplace IAM content uses `TouristAuthContent` inside shell `main` (routes still under `TouristPublicLayout` per `#56`).

### Nav config

| Audience | Order | Items | Notes |
| --- | --- | --- | --- |
| Guest | 1–n | Districts → `TOURIST_NAV_DISTRICTS_PATH` (`/districts`) | Label locked; public browse |
| Guest | | Sign In → `/login` | |
| Guest | | Sign Up → `/sign-up` | Mobile primary CTA (collapsed nav) |
| Logged-in | 1–n | Districts → `TOURIST_NAV_DISTRICTS_PATH` | Visible on public **and** account routes |
| Logged-in | | Bookings → `/account/bookings` | Hidden for guests |
| Logged-in | | Account → `/account` | |
| Logged-in | | Sign out | Button; `useIdentitiesLogout` |

**Not in nav:** Provider / Corporate links (moved to footer per decision #12).

**Active state:** each config entry includes `activeMatch: RegExp` (team sidebar precedent).

**Districts `activeMatch` (locked):**

```javascript
/^\/(districts|account\/discover)(\/|$)/
```

Covers canonical `/districts` and legacy `/account/discover` during the one-release redirect window (`#56`).

**Districts path constant:** `TOURIST_NAV_DISTRICTS_PATH` in `tourist-nav-config.js` re-exports `MARKETPLACE_CATALOG_PATHS.DISTRICTS` from `catalog-listing-constant.js` (added in `#60`).

### Footer (initial content)

| Block | Content | Both surfaces? |
| --- | --- | --- |
| Legal | Placeholder links: Terms, Privacy | Yes |
| Language | Static hint: "English / 日本語 — language settings in Account" | Yes |
| Support | Placeholder: `support@redcab.example` or "Contact support" stub | Yes |
| Cross-portal | Secondary links: Provider login → `/providers/login`; Corporate login → `/corporate/login` | Yes |

No public-only SEO district links in `#58` — deferred to `#59`.

### Breadcrumbs

- **`TouristShellLayout`** renders `<Breadcrumbs />` below nav (team portal precedent: `team-page-shell.jsx`).
- Route modules do **not** wire `handle.breadcrumb` in `#58` — **`#57` follow-on web issue**.
- Until follow-on lands, breadcrumb region may render empty — acceptable.

### Shared UI components

| Component | Path | Purpose |
| --- | --- | --- |
| `TouristShellLayout` | `app/layouts/tourist/tourist-shell-layout.jsx` | Header, breadcrumbs slot, main, footer, language prompt |
| `TouristNav` | `app/layouts/tourist/tourist-nav.jsx` | Navbar + collapse + mobile CTA |
| `TouristFooter` | `app/layouts/tourist/tourist-footer.jsx` | Footer blocks incl. cross-portal links |
| `TouristEmptyState` | `app/components/tourist/tourist-empty-state.jsx` | Variant-based empty UI |
| `TouristErrorState` | `app/components/tourist/tourist-error-state.jsx` | Inline error UI |
| `TouristShellPending` | `app/components/tourist/tourist-shell-pending.jsx` | Pending UI — component in `#58`; wired on public catalog loaders in `#60` |

**Empty-state copy and page mapping (locked):**

| Variant | Copy | Page module | Used when |
| --- | --- | --- | --- |
| `bookings` | "No bookings yet." / filter variant + CTA **"Browse districts"** → `TOURIST_NAV_DISTRICTS_PATH` | `booking-list-page.jsx` | Zero bookings (or zero filter matches) |
| `listingFilters` | "No services match your current filters." | `marketplace-catalog-listing-list-page.jsx` (post-`#60` path) | Area listing list with filters/date yielding zero results |
| `generic` | "Nothing to show here right now." | `marketplace-catalog-district-list-page.jsx`, `marketplace-catalog-area-list-page.jsx` | District or area index with empty array (should be rare under `INV-8`) |

**Do not use** geography-specific copy ("No services in this area yet", "No areas with services in this district") on district/area index pages.

Geography-not-found messages continue using `CATALOG_GEOGRAPHY_NOT_FOUND_MESSAGE` constants — not empty-state variants.

### Design tokens (minimal)

Document in `_variables.scss`:

```scss
// Tourist shell — Bootstrap-first overrides
$tourist-shell-nav-bg: ...;
$tourist-shell-footer-bg: ...;
$tourist-shell-border-color: var(--bs-border-color);
```

Exact values follow existing `$body-bg` / `bg-light` patterns — no new color system.

### Files to create or modify (Web)

**Add**

- `app/layouts/tourist/tourist-shell-layout.jsx`
- `app/layouts/tourist/tourist-nav.jsx`
- `app/layouts/tourist/tourist-footer.jsx`
- `app/layouts/tourist/tourist-nav-config.js`
- `app/components/tourist/tourist-empty-state.jsx`
- `app/components/tourist/tourist-error-state.jsx`
- `app/components/tourist/tourist-shell-pending.jsx`
- `app/styles/_tourist-shell.scss` (if needed)
- `test/layouts/tourist/tourist-shell-layout.test.jsx`

**Modify (`#58`)**

- `app/layouts/tourist/tourist-public-layout.jsx`
- `app/layouts/tourist/tourist-dashboard-layout.jsx`
- `app/styles/_variables.scss`
- `app/routes/tourist/booking-list-page.jsx` — `bookings` empty variant
- `app/routes/tourist/catalog-district/tourist-catalog-district-list-page.jsx` — `generic` (until `#60` renames path)
- `app/routes/tourist/catalog-district/tourist-catalog-area-list-page.jsx` — **`generic`** (replace INV-8-violating copy)
- `app/routes/tourist/catalog-district/tourist-catalog-listing-list-page.jsx` — `listingFilters` vs `generic`
- `app/routes/tourist/catalog-district/tourist-catalog-listing-detail-page.jsx` (error alerts if straightforward)
- `app/routes/tourist/tourist-checkout-page.jsx` (empty alerts only if straightforward)

**Modify (`#60` — same release)**

- `app/domains/catalog-listing/catalog-listing-constant.js` — `MARKETPLACE_CATALOG_PATHS`; nav constant import
- Marketplace catalog route modules — wire `TouristShellPending` in layout or pages with server `loader`

## Out of scope

- **`handle.breadcrumb` data** on route modules — `#57` follow-on web issue (shell mount only in `#58`)
- **`CatalogGeographyNav` removal** — `#57` follow-on (deprecated when breadcrumbs data ships)
- Homepage district SEO (`#59`)
- Sitemap resource route (`#57` follow-on)
- Tourist marketplace IAM in-shell auth chrome — [`web-64`](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment) / `#64` (supersedes decision #19 for tourist IAM only)
- API changes

## Tasks

### Docs

- [x] Resolve human verification MCQs in plan artifact — **done 2026-09-23**
- [x] Apply plan review recommendations — **done 2026-09-23** (co-ship `#60`, breadcrumbs mount, footer cross-portal, empty-state mapping)
- [x] Run `review-implementation-spec` on this file — waived; human edge-case review 2026-09-23
- [x] Set `status: approved` after human confirmation — **2026-09-23**
- [x] Commit spec before codegen (PKM spec-first gate)
- [x] Cross-link [`web-64`](/docs/engineering/specs/platform/web-64-tourist-account-auth-shell-alignment) — tourist IAM chrome supersedes decision #19
- [ ] Optional: amend `frontend.md` with tourist shell token names; grep `docs/engineering/` for stale references
- [ ] Note in `#57` follow-on issue: deprecate `CatalogGeographyNav` when breadcrumb data wires

### Web (`#58` — co-release with `#60`)

- [ ] Add `tourist-nav-config.js` with guest/logged-in arrays and dual-path `activeMatch`
- [ ] Implement `TouristShellLayout` (incl. `<Breadcrumbs />`), `TouristNav`, `TouristFooter` with cross-portal footer links
- [ ] Refactor public/dashboard layouts to delegate to shell
- [ ] Move language prompt to shell
- [ ] Add empty/error/pending components
- [ ] Replace inline alerts per strict page → variant mapping
- [ ] Add `_variables.scss` tokens
- [ ] Add layout smoke tests (logged-in user on `/` sees Bookings)

### Web (`#60` — same release)

- [ ] Wire `TouristShellPending` on all public catalog server loaders
- [ ] Export `MARKETPLACE_CATALOG_PATHS.DISTRICTS`; nav imports `TOURIST_NAV_DISTRICTS_PATH` alias

## Acceptance criteria

- [ ] **`#58` and `#60` merge together** — guest Districts nav reaches public `/districts` without auth gate
- [ ] Identical header/footer on public home and `/account/*` routes — at `#58` ship, `/login` and `/sign-up` excluded nested `PublicAuthLayout`; after `#64`, tourist IAM routes use shell nav/footer with `TouristAuthContent` in `main` (see `web-64`)
- [ ] Guest nav: Districts, Sign In, Sign Up — **no** Provider/Corporate in nav
- [ ] Logged-in nav on **both** public and account routes: Districts, Bookings, Account, Sign out
- [ ] Footer: legal, language, support placeholders **plus** Provider/Corporate secondary links on public and account
- [ ] `<Breadcrumbs />` mounted in shell (may be empty until `#57` follow-on)
- [ ] Mobile nav collapses; guest Sign Up primary CTA in collapsed nav
- [ ] Empty states: `generic` on district/area index; `listingFilters` on filtered listing list; `bookings` CTA **"Browse districts"** → `TOURIST_NAV_DISTRICTS_PATH`
- [ ] No INV-8-violating geography empty copy on district/area index pages
- [ ] Language prompt shows for logged-in tourists on public `/districts` and account layouts when `should_prompt_language`
- [ ] `TouristShellPending` component exists; **`#60` wires it** on public catalog loaders (tracked in `#60` acceptance)
- [ ] `npm run lint` && `npm run test` pass
- [ ] PR triple-links: `red-cab-web#58`, `red-cab-web#60`, `Spec: docs/engineering/specs/platform/web-58-tourist-unified-layout-shell.md`

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test

# Manual (after #58 + #60 co-release)
# - Guest: visit /, /districts — same header/footer; Districts nav works without login
# - Guest: footer shows Provider/Corporate links; nav does not
# - Logged-in: visit / and /account — Bookings link visible on both
# - Logged-in: language prompt on /districts when should_prompt_language
# - /login, /sign-up — at #58: PublicAuthLayout nested in shell; after #64 (web-64): TouristAuthContent in shell main
# - Mobile width: toggle nav; verify Sign Up CTA
# - District/area index empty paths use generic copy only
# - Breadcrumb region present (empty OK until #57 follow-on)
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-09-23 | PKM plan agent | `/pkm-plan` | draft — human verification passed; awaiting explicit approval |
| 2026-09-23 | Mark | Plan edge-case review | draft — recommendations #1–#13 applied; co-ship `#60`, breadcrumbs mount, footer cross-portal |
| 2026-09-23 | Mark | Human approval | **Approved** — edge-case review accepted; ready for codegen with `#60` co-release |
