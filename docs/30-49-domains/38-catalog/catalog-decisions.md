---
title: Catalog decisions
sidebar_label: Decisions
sidebar_position: 2
description: Ratified Catalog product and ownership decisions (pilot).
doc_type: domain-decisions
normative: true
context: catalog
last_reviewed: 2026-10-17
legacy_ids:
  - FR-CAT-003
  - FR-CAT-004
  - FR-CAT-026
  - FR-CAT-027
  - FR-CAT-033
---

## TL;DR \{#catalog-decisions-tldr}

- Normative Catalog **product decisions** for the [2026 revamp](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/) live on this page only.
- Requirements under `70-79` and implementation specs link here; they do not restate these rules.
- [Open forks](#open-forks) block price packages, region storage, and some invariant text until owners rule.

## About this document

Pilot **domain-decisions** page per [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system). Tier A prose.

| Topic | Document |
| --- | --- |
| Program audit | [Catalog revamp phase 0 audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#audit-tldr) |
| Domain entry | [Catalog overview](/docs/30-49-domains/catalog/overview/#catalog-overview) |
| Term index | [Glossary](/docs/70-79-business/business-rules/glossary) |
| Verified code baseline | [Audit — verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts) |

Decisions live **only** here. Do not add acceptance-criteria tables or end-to-end flows on this page. Link to future `requirements/` pages (phase 1) and approved implementation specs when they exist.

---

## Keyword search scope \{#keyword-search-scope}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

When a tourist activates keyword search on marketplace listings, include a listing if the keyword matches any of these fields: listing **title**, listing **description**, **primary destination** display name, **additional destination** display name(s), and **provider** display name. Keyword search combines with the current listing scope, active filters, and sort. It does not replace them.

**Why**

Tourists identify services by what the service is, where it goes, and who provides it. Destination matches must include **additional** destinations, not only the primary destination.

**What this rules out**

- Free-text search excluded from the marketplace contract (supersedes intent in `api-161` and `web-124` for keyword only).
- Keyword search that ignores the current region, prefecture, or destination page scope.

**Supersedes**

- Functional requirement sections that implied no keyword param: partial supersession of discover-filter specs (see [alias table](/docs/80-89-legacy/document-alias-table)).
- Specs: `cat/api-161-marketplace-listing-index-discover-filters.md`, `cat/web-124-discover-toolbar-filters-api-forwarding.md` (keyword scope only; filter forwarding may carry in a successor spec).

**Evidence**

- Design scratchpad §3.5 Decision Q1 (non-canonical hypothesis source).
- [Audit verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): no `q` or keyword parameter on the marketplace listings index today; web search input disabled.

**Product direction vs code today**

- **Product direction:** keyword param and searchable joins (successor API spec TBD).
- **Code today:** conjunctive filters only; no keyword index.

---

## Tourist discovery information architecture \{#tourist-discovery-ia}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- **Primary navigation** is **region-first**: the home page presents **Region** cards; the tourist opens a region-scoped listings experience.
- **Prefecture** (administrative subdivision) is a **filter** within the current region scope, not the top-level IA axis.
- **Service type** stays a **filter**, not a top-level navigation axis (carries `D-02` intent).
- **Popular destinations** (for example Tokyo within Kanto) are entry points to destination-scoped listing pages within the region model.
- **Public browse** without login at discovery remains valid (`AMB-022` Option A). This decision does not reopen the access model.
- A **new public URL family** replaces the District → Area-primary path family. Exact paths are **successor spec TBD**; do not treat `/districts/{districtSlug}/areas/{areaSlug}/listings` as the long-term canonical family.

**Why**

The District → Area funnel matches today's code but not the revamp UX target (region cards, prefecture filter, keyword search within scope).

**What this rules out**

- District → Area as the **primary** tourist information architecture (`FR-CAT-004`, `AMB-020` Decision Log row as previously written).
- District/Area-only discovery roots without a region presentation layer (`FR-CAT-003` partial intent).

**Supersedes**

- `FR-CAT-003`, `FR-CAT-004` (partial): [cat.md](/docs/70-79-business/requirements/functional-requirements/cat).
- `ADR-017` §3.2 URL scheme and District → Area IA clauses (access and SSR decisions in ADR-017 remain).
- `AMB-020` and the URL clause in `AMB-022` Decision Log (access clause for Option A remains).
- Specs: `cat/web-57-tourist-ia-breadcrumbs-deep-links.md`, `cat/web-59-tourist-homepage-discover-entry.md` (IA portions), `cat/web-65-near-me-area-discovery-section.md`, `cat/web-66-map-pin-regions-listing-area-views.md`.

**Evidence**

- Scratchpad §3.1–3.2 (region browse, prefecture filter, popular destinations).
- [Audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-fr-cat): supersede dispositions for `FR-CAT-003`, `FR-CAT-004`.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): web routes use `/districts/:districtSlug/areas/:areaSlug/...`; no region node in `catalog_geographies`.

**Product direction vs code today**

- **Product direction:** region cards, region-scoped index, successor routes (TBD).
- **Code today:** District and Area slugs under `/districts/.../areas/...`; discovery roots use `is_discovery_root` (presented as District in legacy docs).

**Pending (open fork)**

- How a **Region** is stored or derived is **not** decided here. See [Region model](#open-forks).

---

## Marketplace filter combination \{#marketplace-filter-combination}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Within one filter category (Service Type, Language, Vehicle Type), use **OR** logic: the listing matches if it satisfies **any** selected value in that category.
- Across categories, use **AND** logic: the listing must satisfy every category that has an active selection.
- Tourists may select multiple values within Service Type, Language, and Vehicle Type.
- Tourists may **clear all filters** (and reset filter-related URL params) while keeping sort params unless a successor spec defines otherwise.

**Why**

Tourists need acceptable alternatives inside a category and combined preferences across categories.

**What this rules out**

- Conjunctive-only semantics for every filter dimension when multiple values are selected within one category (legacy `FR-CAT-025` wording may need phase-1 requirement alignment).

**Supersedes**

- Partial intent of `FR-CAT-025` and discover-filter specs for multi-select semantics (successor specs TBD).

**Evidence**

- Scratchpad §3.5 Decision Q3.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): index supports single-value filters today; multi-select is product direction.

---

## Most booked sort \{#most-booked-sort}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

When the tourist selects **Most booked**, rank listings by the count of **distinct qualifying bookings** in descending order. A booking qualifies when payment succeeded, its current status is **Confirmed** or **Completed**, and its **confirmation** timestamp falls in the rolling **90 days** before the current time. Exclude **Cancelled**, **Failed**, and fully refunded bookings. Count each booking at most once. Use confirmation time, not service date or completion date, for window membership. On equal counts, rank the **newer listing** first.

**Why**

Measures recent demand without lifetime popularity dominating results.

**What this rules out**

- Review-count sort as a stand-in for Most booked.

**Supersedes**

- Deferred **Most booked** ordering intent in `FR-CAT-027` (partial; price and recommended sorts remain separate).

**Evidence**

- Scratchpad §3.5 Decision Q4.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): no most-booked order column on the marketplace index today.

---

## Top rated sort \{#top-rated-sort}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

When the tourist selects **Top rated**, order listings by **average customer rating** descending, using the same published-review basis as `FR-REV-007`. Listings without a rating appear **after** all rated listings. There is **no** minimum rating count. When averages tie, higher **rating count** wins; when average and count both tie, rank the **newer listing** first.

**Why**

Transparent ranking without a minimum review threshold or confidence-adjusted score.

**What this rules out**

- Hiding unrated listings among rated listings when Top rated is active.

**Supersedes**

- Deferred tourist **rating** sort rules in `FR-CAT-027` (partial).

**Evidence**

- Scratchpad §3.5 Decision Q5.
- Spec `cat/web-67-listing-sort-control-url-params.md` (superseded; successor TBD).

---

## Marketplace sort options (non-price) \{#marketplace-sort-options}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

The revamp marketplace sort control includes at least: **Recently added** (newest first), **Most booked** ([rules](#most-booked-sort)), and **Top rated** ([rules](#top-rated-sort)). **Price** sort (low to high and high to low) and **recommended** sort are **out of scope** until the [package vs tiers](#open-forks) fork is ruled.

**Why**

Price sort depends on which price represents a listing when multiple packages or tiers exist.

**What this rules out**

- Shipping price sort on the redesigned marketplace before Q2 is ruled.

**Supersedes**

- Partial `FR-CAT-027` and `cat/web-67-listing-sort-control-url-params.md` for sort preset set.

**Evidence**

- Scratchpad §3.2 BR-15; audit [open forks](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#open-forks).

---

## Destination structure \{#destination-structure}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

Each listing has exactly **one primary destination** and **zero or more additional destinations**. Destination-based browse and keyword scope include a listing when the page scope or keyword matches the primary **or** any additional destination. Additional destinations widen discovery only; they do **not** imply pickup coverage.

**Why**

Multi-location services need one clear primary label and broader discovery without duplicate listing records.

**What this rules out**

- Single `geography_id` as the only discovery association for the revamp marketplace (partial supersession of `FR-CAT-033` attach rule).

**Supersedes**

- `FR-CAT-033` (partial): [cat.md](/docs/70-79-business/requirements/functional-requirements/cat).

**Evidence**

- Scratchpad §3.5 Decision Q6.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): one `geography_id` per listing; no additional-destination table.

**Product direction vs code today**

- **Product direction:** junction or equivalent for additional destinations; one canonical listing detail URL per listing (successor spec TBD).
- **Code today:** `catalog_listings.geography_id` must reference `is_listable = true`.

**Pending (open fork)**

- Destination **granularity** (which geography levels may be primary or additional) — see [open forks](#open-forks).

---

## Pickup coverage registration \{#pickup-coverage-registration}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

Providers register **pickup coverage** per listing separately from service destinations. MVP granularity: **entire prefecture** (subdivision) and/or specific **city, municipality, or ward** listable nodes. Selecting a prefecture means coverage throughout that prefecture with **no** arbitrary exclusions inside the prefecture in MVP. Map-drawn boundaries and per-address coverage registration are **out of scope** for MVP.

**Why**

Useful precision without map editing or address-level registration in MVP.

**What this rules out**

- Inferring pickup coverage from destination associations alone.

**Supersedes**

- Gap where geography pattern deferred provider coverage polygons (partial; does not amend `BKG-11` text — PR 5).

**Evidence**

- Scratchpad §3.5 Decision Q7.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): no pickup-coverage table in DBML.

---

## Pickup coverage validation timing \{#pickup-coverage-validation-timing}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Providers **register** pickup coverage when they configure the listing (see [Pickup coverage registration](#pickup-coverage-registration)).
- Before a booking becomes **confirmed**, RedCab must validate the tourist's **booking location** against the listing's **latest saved** pickup coverage. If the location is outside coverage or coverage cannot be validated reliably, the booking must **not** confirm.
- After confirmation, coverage changes do not invalidate the booking (aligned with scratchpad BR-07 / AC-48 intent).

**Why**

Instant booking after payment requires a clear gate before confirmation without re-opening provider acceptance.

**What this rules out**

- Confirming a booking without a coverage check when coverage is required for that listing.

**Supersedes**

- None of `BKG-11` invariant text (PR 5). This records product direction only.

**Evidence**

- Scratchpad §3.5 Decisions Q7 and Q10; §3.2 BR-17.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): `pickup_address` is free text at checkout; no coverage validation in code today.

**Pending (open fork)**

- Whether coverage completeness affects **discovery** vs **checkout only** — see [Coverage timing](#open-forks) and [Discoverability completeness](#discoverability-completeness).

---

## Listing publication \{#listing-publication}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

Providers save listings as **drafts** and must **explicitly publish** when ready. Saving or updating configuration does not make a listing tourist-visible. There is **no** per-listing administrator approval workflow in this revamp (provider approval remains orthogonal).

**Why**

Separates preparation from public visibility and matches existing draft → publish API shape.

**What this rules out**

- Auto-publish on first successful save.

**Supersedes**

- None of `LC-10` / `INV-10` / `INV-12` text (PR 5 for discoverability predicate detail).

**Evidence**

- Scratchpad §3.5 Decision Q8.
- `red-cab-api`: create leaves `draft`; publish endpoint sets `published` (audit and LC-10 references).

---

## Discoverability completeness \{#discoverability-completeness}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

Public marketplace **search and browse** include only listings that are **published** and **complete** per an authoritative required-field inventory (implementation spec TBD). Listings missing **required booking information** (for example valid pickup coverage when required) must **not** appear in tourist discovery, even if status remains `published`. Missing **optional** attributes do not hide a listing by themselves; active filters may still exclude them.

**Why**

Tourists should not discover listings they cannot complete through the standard booking flow.

**What this rules out**

- Discoverable but unbookable published listings as an intentional steady state for the revamp marketplace.

**Supersedes**

- Partial intent of `FR-CAT-003` / `INV-8` presentation rules (full invariant edits PR 5).

**Evidence**

- Scratchpad §3.5 Decision Q9.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): index filters `status_published` only; no completeness gate.

**Pending (open fork)**

- Exact field inventory for **discoverable** vs **bookable** — see [Discoverability fields](#open-forks).

---

## Booking confirmation \{#booking-confirmation}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

A booking becomes **confirmed** only after RedCab receives reliable confirmation of **successful payment** and all **required booking validations** pass. **Provider acceptance is not required** (instant booking). Pickup coverage validation runs before confirmation per [Pickup coverage validation timing](#pickup-coverage-validation-timing).

**Why**

Matches B2C instant-booking intent and current materialization on payment success.

**What this rules out**

- Pending-until-provider-accept as the default B2C path for catalog revamp listings.

**Supersedes**

- None of `BKG-11` text (PR 5).

**Evidence**

- Scratchpad §3.5 Decision Q10.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): booking `confirmed` after payment in `materialize_order_manager.rb`.

---

## Open forks \{#open-forks}

This section mirrors the [audit open forks table](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#open-forks). It gives **no** new rulings. Each fork needs an owner decision before blocked artifacts can leave **pending**.

| Fork | Blocks (audit) | Owner decision needed |
| --- | --- | --- |
| Package vs tiers | `FR-CAT-005`, `FR-CAT-013`, `FR-CAT-026`, `PRC-2`, W2 planning row | Does a listing hold many packages, or one policy with group-size tiers? Which price is the starting price? **Decision Q2 is not decided on this page.** |
| Region model | `FR-CAT-001`, `FR-CAT-003`, `FR-CAT-004`, `FR-CAT-032`, `ADR-016`, `AMB-036`, `api-134`, `INV-8` | Is a region a tree node, a grouping table, or a presentation layer? |
| Destination granularity | `FR-CAT-033`, `INV-8` | At what geography level can primary and additional destinations attach? |
| Coverage timing | `FR-CAT-033`, `BKG-11` | Does pickup coverage apply at publish, at search, or at checkout? |
| BKG-11 vs booking location | `BKG-11`, `BKG-9` payload | Does free-text pickup stay, or does checkout add structured location? |
| Vehicle types | `FR-CAT-024`, `FR-CAT-029`, `AMB-023` | Does the vehicle taxonomy change, and does it become a filter? |
| Discoverability fields | `INV-8`, `INV-10`, `LC-10`, `FR-CAT-012` | Which fields make a Published listing discoverable? |

**Term collision:** Global glossary **Multi-Day Package** (`E-04`) is not the same concept as a sellable **package** in the package-vs-tiers fork. Do not conflate them when ruling Q2.
