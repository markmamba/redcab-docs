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
- [Open forks](#open-forks) block price packages and region storage; global invariants [`INV-8`](/docs/70-79-business/business-rules/invariants), [`LC-10`](/docs/70-79-business/business-rules/invariants), [`PRC-2`](/docs/70-79-business/business-rules/invariants), and [`BKG-11`](/docs/70-79-business/business-rules/invariants) carry the revamp baseline (PR 5).

## About this document

Pilot **domain-decisions** page per [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system).

Tier A prose applies to this page.

| Topic | Document |
| --- | --- |
| Program audit | [Catalog revamp phase 0 audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#audit-tldr) |
| Domain entry | [Catalog overview](/docs/30-49-domains/catalog/overview/#catalog-overview) |
| Term index | [Glossary](/docs/70-79-business/business-rules/glossary) |
| Naming and legacy aliases | [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases/#naming-tldr) |
| Verified code baseline | [Audit — verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts) |

- Decisions live **only** here.
- Do not add acceptance-criteria tables or end-to-end flows on this page.
- Link to future `requirements/` pages (phase 1) and approved implementation specs when they exist.

---

## Keyword search scope \{#keyword-search-scope}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Tourist keyword search applies to marketplace listings.
- Include a listing when the keyword matches any searchable field.
- Searchable fields are listing **title**, listing **description**, **primary destination** display name, **additional destination** display name(s), and **provider** display name.
- Keyword search combines with the current listing scope, active filters, and sort.
- Keyword search does not replace scope, filters, or sort.

**Why**

- Tourists identify services by what the service is, where it goes, and who provides it.
- Destination matches must include **additional** destinations, not only the primary destination.

**What this rules out**

- Free-text search excluded from the marketplace contract (supersedes intent in `api-161` and `web-124` for keyword only).
- Keyword search that ignores the current region, prefecture, or destination page scope.

**Supersedes**

- Functional requirement sections that implied no keyword param: partial supersession of discover-filter specs (see [alias table](/docs/80-89-legacy/document-alias-table)).
- Specs: `cat/api-161-marketplace-listing-index-discover-filters.md`, `cat/web-124-discover-toolbar-filters-api-forwarding.md` (keyword scope only; filter forwarding may carry in a successor spec).

**Evidence**

- Design review (2026-10-17): keyword search matches listing title, description, primary and additional destination names, and provider name.
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
- **Public browse** without login at discovery remains valid (`AMB-022` Option A).
- This decision does not reopen the access model.
- A **new public URL family** replaces the District → Area-primary path family.
- Exact paths are **successor spec TBD**.
- Do not treat `/districts/{districtSlug}/areas/{areaSlug}/listings` as the long-term canonical family.

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

- Design review (2026-10-17): home page presents **Region** cards; region listings support keyword search and a **prefecture** filter within the region.
- Design review (2026-10-17): **popular destinations** (for example Tokyo within Kanto) open destination-scoped listing pages within the region model.
- [Audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-fr-cat): supersede dispositions for `FR-CAT-003`, `FR-CAT-004`.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): web routes use `/districts/:districtSlug/areas/:areaSlug/...`; no region node in `catalog_geographies`.

**Product direction vs code today**

- **Product direction:** region cards, region-scoped index, successor routes (TBD).
- **Code today:** District and Area slugs under `/districts/.../areas/...`; discovery roots use `is_discovery_root` (presented as District in legacy docs).

**Pending (open fork)**

- How a **Region** is stored or derived is **not** decided here.
- See [Region model](#open-forks).

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

- Design review (2026-10-17): use **OR** within each filter category and **AND** across categories.
- Design review (2026-10-17): tourists may multi-select Service Type, Language, and Vehicle Type.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): index supports single-value filters today; multi-select is product direction.

---

## Most booked sort \{#most-booked-sort}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- When the tourist selects **Most booked**, rank listings by the count of **distinct qualifying bookings** in descending order.
- A booking qualifies when payment succeeded.
- Its current status is **Confirmed** or **Completed**.
- Its **confirmation** timestamp falls in the rolling **90 days** before the current time.
- Exclude **Cancelled**, **Failed**, and fully refunded bookings.
- Count each booking at most once.
- Use confirmation time, not service date or completion date, for window membership.
- On equal counts, rank the **newer listing** first.

**Why**

Measures recent demand without lifetime popularity dominating results.

**What this rules out**

- Review-count sort as a stand-in for Most booked.

**Supersedes**

- Deferred **Most booked** ordering intent in `FR-CAT-027` (partial; price and recommended sorts remain separate).

**Evidence**

- Design review (2026-10-17): **Most booked** ranks by distinct qualifying bookings confirmed in the rolling **90 days** before the current time.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): no most-booked order column on the marketplace index today.

---

## Top rated sort \{#top-rated-sort}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- When the tourist selects **Top rated**, order listings by **average customer rating** descending.
- Use the same published-review basis as `FR-REV-007`.
- Listings without a rating appear **after** all rated listings.
- There is **no** minimum rating count.
- When averages tie, higher **rating count** wins.
- When average and count both tie, rank the **newer listing** first.

**Why**

Transparent ranking without a minimum review threshold or confidence-adjusted score.

**What this rules out**

- Hiding unrated listings among rated listings when Top rated is active.

**Supersedes**

- Deferred tourist **rating** sort rules in `FR-CAT-027` (partial).

**Evidence**

- Design review (2026-10-17): **Top rated** uses average customer rating.
- Unrated listings follow all rated listings; there is no minimum rating count.
- Higher rating count breaks ties when averages match.
- Spec `cat/web-67-listing-sort-control-url-params.md` (superseded; successor TBD).

---

## Marketplace sort options (non-price) \{#marketplace-sort-options}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- The revamp marketplace sort control includes **Recently added** (newest first).
- It includes **Most booked** ([rules](#most-booked-sort)).
- It includes **Top rated** ([rules](#top-rated-sort)).
- **Price** sort (low to high and high to low) is **out of scope** until the [package vs tiers](#open-forks) fork is ruled.
- **Recommended** sort is **out of scope** until that fork is ruled.

**Why**

Price sort depends on which price represents a listing when multiple packages or tiers exist.

**What this rules out**

- Shipping price sort on the redesigned marketplace before Q2 is ruled.

**Supersedes**

- Partial `FR-CAT-027` and `cat/web-67-listing-sort-control-url-params.md` for sort preset set.

**Evidence**

- Design review (2026-10-17): sort control includes **Recently added** (`published_at`, newest first), **Most booked**, and **Top rated**.
- **Price: low to high** waits on the package model fork.
- Audit [open forks](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#open-forks).

---

## Destination structure \{#destination-structure}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Each listing has exactly **one primary destination**.
- Each listing has **zero or more additional destinations**.
- Destination-based browse includes a listing when page scope matches the primary **or** any additional destination.
- Keyword scope includes a listing when the keyword matches the primary **or** any additional destination.
- Additional destinations widen discovery only.
- Additional destinations do **not** imply pickup coverage.

**Why**

Multi-location services need one clear primary label and broader discovery without duplicate listing records.

**What this rules out**

- Single `geography_id` as the only discovery association for the revamp marketplace (partial supersession of `FR-CAT-033` attach rule).

**Supersedes**

- `FR-CAT-033` (partial): [cat.md](/docs/70-79-business/requirements/functional-requirements/cat).

**Evidence**

- Design review (2026-10-17): each listing has one **primary destination**.
- Each listing may have zero or more **additional destinations**.
- Destination associations do not imply pickup coverage.
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

- Providers register **pickup coverage** per listing separately from service destinations.
- MVP granularity is **entire prefecture** (subdivision) and/or specific **city, municipality, or ward** listable nodes.
- Selecting a prefecture means coverage throughout that prefecture.
- MVP allows **no** arbitrary exclusions inside a selected prefecture.
- Map-drawn boundaries are **out of scope** for MVP pickup registration.
- Per-address coverage registration is **out of scope** for MVP.

**Why**

Useful precision without map editing or address-level registration in MVP.

**What this rules out**

- Inferring pickup coverage from destination associations alone.

**Supersedes**

- Gap where geography pattern deferred provider coverage polygons (partial).
- Fulfillment and booking location: [`BKG-11`](/docs/70-79-business/business-rules/invariants).

**Evidence**

- Design review (2026-10-17): providers register pickup at **prefecture** and/or **city, municipality, or ward**.
- Map-drawn boundaries are out of MVP scope for pickup registration.
- Per-address pickup registration is out of MVP scope.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): no pickup-coverage table in DBML.

---

## Pickup coverage validation timing \{#pickup-coverage-validation-timing}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Providers **register** pickup coverage when they configure the listing (see [Pickup coverage registration](#pickup-coverage-registration)).
- Before a booking becomes **confirmed**, RedCab must validate the tourist's **booking location** against the listing's **latest saved** pickup coverage.
- If the location is outside coverage, the booking must **not** confirm.
- If coverage cannot be validated reliably, the booking must **not** confirm.
- After confirmation, coverage changes do not invalidate the booking.
- Confirmed bookings stay valid when the provider later changes registered pickup coverage.

**Why**

Instant booking after payment requires a clear gate before confirmation without re-opening provider acceptance.

**What this rules out**

- Confirming a booking without a coverage check when coverage is required for that listing.

**Supersedes**

- Product-only pickup timing text before global rules.
- Normative checkout payload and validation gate: [`BKG-11`](/docs/70-79-business/business-rules/invariants).

**Evidence**

- Design review (2026-10-17): validate booking location against the listing's latest saved pickup coverage before confirmation.
- Design review (2026-10-17): confirm the booking after successful payment when all required validations pass; provider acceptance is not required.
- Design review (2026-10-17): pickup coverage must be validated before confirmation; later coverage changes do not invalidate confirmed bookings.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): `pickup_address` is free text at checkout; no coverage validation in code today.

**Pending (open fork)**

- Whether coverage completeness affects **discovery** vs **checkout only** — see [Coverage timing](#open-forks) and [Discoverability completeness](#discoverability-completeness).

---

## Listing publication \{#listing-publication}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Providers save listings as **drafts**.
- Providers must **explicitly publish** when ready.
- Saving or updating configuration does not make a listing tourist-visible.
- This revamp has **no** per-listing administrator approval workflow.
- Provider approval remains orthogonal.

**Why**

Separates preparation from public visibility and matches existing draft → publish API shape.

**What this rules out**

- Auto-publish on first successful save.

**Supersedes**

- Stricter discoverability predicate: [`LC-10`](/docs/70-79-business/business-rules/invariants), [`INV-8`](/docs/70-79-business/business-rules/invariants).
- Publish gates (`INV-10`, `INV-12`, `LC-12`) unchanged.

**Evidence**

- Design review (2026-10-17): providers save **drafts** and must **explicitly publish**; saving or updating configuration does not make a listing tourist-visible.
- `red-cab-api`: create leaves `draft`; publish endpoint sets `published` (audit and LC-10 references).

---

## Discoverability completeness \{#discoverability-completeness}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- Public marketplace **search and browse** include only **published** listings.
- They include only **complete** listings per an authoritative required-field inventory (implementation spec TBD).
- Listings missing **required booking information** must **not** appear in tourist discovery.
- That rule applies even when status remains `published`.
- Example required booking information: valid pickup coverage when required.
- Missing **optional** attributes do not hide a listing by themselves.
- Active filters may still exclude listings with missing optional attributes.

**Why**

Tourists should not discover listings they cannot complete through the standard booking flow.

**What this rules out**

- Discoverable but unbookable published listings as an intentional steady state for the revamp marketplace.

**Supersedes**

- `FR-CAT-003` district/area presentation intent.
- Global geography presentation rule: [`INV-8`](/docs/70-79-business/business-rules/invariants).

**Evidence**

- Design review (2026-10-17): listings missing **required booking information** must stay hidden from public marketplace search and browse until complete.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): index filters `status_published` only; no completeness gate.

**Pending (open fork)**

- Exact field inventory for **discoverable** vs **bookable** — see [Discoverability fields](#open-forks).

---

## Booking confirmation \{#booking-confirmation}

**Decided:** 2026-10-17 (owner: proposed, pending Product Owner sign-off on this page)

**What we decided**

- A booking becomes **confirmed** only after RedCab receives reliable confirmation of **successful payment**.
- All **required booking validations** must pass before confirmation.
- **Provider acceptance is not required** (instant booking).
- Pickup coverage validation runs before confirmation per [Pickup coverage validation timing](#pickup-coverage-validation-timing).

**Why**

Matches B2C instant-booking intent and current materialization on payment success.

**What this rules out**

- Pending-until-provider-accept as the default B2C path for catalog revamp listings.

**Supersedes**

- Checkout validation ordering before global `BKG-11` amendment.
- Normative payload: [`BKG-11`](/docs/70-79-business/business-rules/invariants).

**Evidence**

- Design review (2026-10-17): booking becomes **confirmed** after reliable **successful payment** and all required validations pass; provider acceptance is not required.
- [Verified code facts](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#verified-code-facts): booking `confirmed` after payment in `materialize_order_manager.rb`.

---

## Open forks \{#open-forks}

- This section mirrors the [audit open forks table](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#open-forks).
- It gives **no** new rulings.
- Each fork needs an owner decision before blocked artifacts can leave **pending**.

| Fork | Blocks (audit) | Owner decision needed |
| --- | --- | --- |
| Package vs tiers | `FR-CAT-005`, `FR-CAT-013`, `FR-CAT-026`, `PRC-2`, W2 planning row | Does a listing hold many packages, or one policy with group-size tiers? Which price is the starting price? **Decision Q2 is not decided on this page.** |
| Region model | `FR-CAT-001`, `FR-CAT-003`, `FR-CAT-004`, `FR-CAT-032`, `ADR-016`, `AMB-036`, `api-134`, `INV-8` | Is a region a tree node, a grouping table, or a presentation layer? |
| Destination granularity | `FR-CAT-033`, `INV-8` | At what geography level can primary and additional destinations attach? |
| Coverage timing | `FR-CAT-033`, `BKG-11` | **Partially ruled:** pickup coverage validation at checkout before confirmation ([`BKG-11`](/docs/70-79-business/business-rules/invariants), [pickup coverage validation timing](#pickup-coverage-validation-timing)). Open: whether incomplete coverage hides a listing at **search** vs only at checkout ([discoverability completeness](#discoverability-completeness)). |
| BKG-11 vs booking location | `BKG-11`, `BKG-9` payload | **Partially ruled:** free-text **pickup address** satisfies **booking location** until structured location ships ([`BKG-11`](/docs/70-79-business/business-rules/invariants), [Glossary — Booking location](/docs/70-79-business/business-rules/glossary)). Open: structured coordinates or geography node at checkout. |
| Vehicle types | `FR-CAT-024`, `FR-CAT-029`, `AMB-023` | Does the vehicle taxonomy change, and does it become a filter? |
| Discoverability fields | `INV-8`, `INV-10`, `LC-10`, `FR-CAT-012` | **Partially ruled:** `Published` plus completeness predicate ([`LC-10`](/docs/70-79-business/business-rules/invariants), [discoverability completeness](#discoverability-completeness)). Open: authoritative required-field inventory (successor spec). |

**Term collision**

- Global glossary **Multi-Day Package** (`E-04`) is not the same concept as a sellable **package** in the package-vs-tiers fork.
- Do not conflate them when ruling Q2.
