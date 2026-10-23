---
title: Catalog revamp phase 0 audit
sidebar_position: 2
description: Inventory of legacy Catalog requirements, ADRs, specs, and code gaps with recommended dispositions before PR 4 applies them.
doc_type: program
normative: false
status: active
---

## TL;DR \{#audit-tldr\}

- This audit lists every legacy Catalog artifact that the [Catalog revamp](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/) may change.
- Each row has a disposition: **carry**, **supersede**, **retire**, or **pending**.
- Each row also has one code-gap line: **exists**, **partial**, or **missing**.
- Read this page before you write a new Catalog spec or a normative page under `38-catalog/`.
- The audit **recommends** dispositions. PR 4 applies them. PR 5 owns invariant edits.

## Non-normative banner \{#non-normative\}

:::caution Non-normative
This page does not define product behavior. It sits outside the [precedence chain](/docs/00-09-meta/conventions/documentation-system#precedence). Product rules stay in the linked normative pages until a later PR changes them.
:::

## Method \{#method\}

Audit date: 2026-10-17. Program: PR 3 of 5.

Sources read in `redcab-docs`:

- `docs/00-09-meta/conventions/documentation-system.md`
- `docs/70-79-business/72-requirements/functional-requirements/cat.md`
- `docs/70-79-business/71-business-rules/invariants.md`
- `docs/70-79-business/73-planning/open-questions.md`
- `docs/70-79-business/73-planning/roadmap/phase-2-execution-map.md`
- `docs/70-79-business/73-planning/roadmap/phase-2-marketplace-depth.md`
- `docs/70-79-business/73-planning/roadmap/tourist-ui-pre-phase-2.md`
- `docs/30-49-domains/34-architecture-decisions/adr-004`, `adr-007`, `adr-013`, `adr-016`, `adr-017`
- `docs/30-49-domains/38-catalog/index.md`
- Every file under `docs/60-69-initiatives/61-2026/implementation-specs/cat/` (including `geography/`)
- `docs/60-69-initiatives/61-2026/implementation-specs/iam/web-56-tourist-access-and-route-contract.md`

Code areas spot-checked (read only):

- `red-cab-api/docs/db/catalog.dbml` and `red-cab-api/docs/db/bookings.dbml`
- `red-cab-api/app/domains/catalog/` (listings, geographies, districts, areas, availability, pricing)
- `red-cab-api/app/domains/bookings/checkout_sessions/`
- `red-cab-web/app/marketplace.routes.js`
- `red-cab-web/app/domains/catalog-listing/` and `red-cab-web/app/domains/bookings-checkout-session/`

Rules for this page:

- Every row cites a doc or a code source.
- The personal design scratchpad gave hypotheses only. It is not a source.
- Where evidence conflicts with the design review verdict, the row says **pending** and names the file.
- Traceability matrices stay FR-ID-based until the Catalog pilot proves anchor trace. This PR does not edit them.
- "Not verified" in a code-gap cell means the audit did not read that code path.

## Inventory tables \{#inventory\}

Disposition key:

| Disposition | Meaning |
| --- | --- |
| carry | Keep the rule. It may move into a normative page unchanged. |
| supersede | Replace the rule in whole or in part. PR 4 adds a banner or sets `status: superseded`. |
| retire | Remove with no replacement. No row uses this value yet. |
| pending | An open fork or a PR 5 edit decides the outcome. |

### FR-CAT requirements \{#inventory-fr-cat\}

Source page: `docs/70-79-business/72-requirements/functional-requirements/cat.md`. Site path: `/docs/70-79-business/requirements/functional-requirements/cat`.

| ID / artifact | Current location | Disposition | Replacement / notes | Code gap |
| --- | --- | --- | --- | --- |
| `FR-CAT-001` Geography management | `cat.md`, section FR-CAT-001 | carry | ADR-013 and ADR-016 stay. Add region only if fork [region model](#open-forks) says so. | exists: `Catalog::Geographies::JapanSeedService`, `team_*_manager.rb` |
| `FR-CAT-002` Geography deactivation cascade | `cat.md`, section FR-CAT-002 | carry | None. | exists: `catalog/geographies/subtree_unlist_service.rb:5` |
| `FR-CAT-003` Discovery of districts and areas | `cat.md`, section FR-CAT-003 | supersede | Partial. Region-first discovery replaces the District/Area wording. Access note (`AMB-022` Option A) stays. PR 4 writes the normative page. | partial: `catalog/districts/marketplace_index_manager.rb:30-33` lists discovery roots; no region node |
| `FR-CAT-004` Primary discovery navigation | `cat.md`, section FR-CAT-004 | supersede | Region-first IA replaces District then Area. Service type stays a filter. URL family in [ADR-017](#inventory-adr). PR 4. | partial: `red-cab-web/app/marketplace.routes.js:23-41` serves `/districts/...` only |
| `FR-CAT-005` Service list presentation | `cat.md`, section FR-CAT-005 | pending | The "starting price" meaning depends on fork [package model](#open-forks) and `PRC-2`. | partial: `catalog/listings/marketplace_listing_list_item_dto.rb` carries `starting_price_jpy` from one pricing policy |
| `FR-CAT-006` Fully booked visibility | `cat.md`, section FR-CAT-006 | carry | None. | partial: slot payload has `remaining_capacity` (`marketplace_availability_slot_serializer.rb:8`); list item DTO has no fully-booked flag |
| `FR-CAT-007` Service detail content | `cat.md`, section FR-CAT-007 | carry | Destination display may extend this in PR 4. | exists: `catalog/marketplace_listing_detail_serializer.rb`; type-specific attributes not verified |
| `FR-CAT-008` Unavailable listing graceful state | `cat.md`, section FR-CAT-008 | carry | None. | partial: suspended check at create and publish (`providers_publish_validator.rb:50`); tourist-facing state not verified |
| `FR-CAT-009` Listing creation by type | `cat.md`, section FR-CAT-009 | carry | None. | exists: `catalog/listings/providers_create_manager.rb`, `type_applicable_validation.rb` |
| `FR-CAT-010` Listing creation blocked when not approved | `cat.md`, section FR-CAT-010 | carry | None. | exists: `providers_create_validator.rb:63,122-124` |
| `FR-CAT-011` Photo rules | `cat.md`, section FR-CAT-011 | carry | None. | exists: `catalog/listing_photos/providers_create_validator.rb` (`content_type`, `byte_size`) |
| `FR-CAT-012` Minimum photo to publish | `cat.md`, section FR-CAT-012 | carry | `INV-10` stays. A stricter discoverability gate is a separate rule (fork [discoverability fields](#open-forks)). | exists: `providers_publish_validator.rb:77-84` |
| `FR-CAT-013` Pricing mode | `cat.md`, section FR-CAT-013 | carry | Fork [package model](#open-forks) may scope the mode per package. | exists: `catalog/pricing_policy.rb:59-60`; `catalog.dbml:294` |
| `FR-CAT-014` Group size tiers | `cat.md`, section FR-CAT-014 | carry | None. | partial: table `catalog_pricing_tiers` (`catalog.dbml:354`, overlap guard `:47`); quote ignores tiers (`calculate_quote_service.rb`, `compute_gross`) |
| `FR-CAT-015` Duration pricing | `cat.md`, section FR-CAT-015 | carry | None. | partial: column `duration_kind` (`catalog.dbml:299`); quote does not use it |
| `FR-CAT-016` Seasonal overrides | `cat.md`, section FR-CAT-016 | carry | None. | partial: table `catalog_seasonal_overrides` (`catalog.dbml:376`); quote sets `seasonal_adjustment_jpy = 0` (`calculate_quote_service.rb:42`) |
| `FR-CAT-017` Extra charges | `cat.md`, section FR-CAT-017 | carry | None. | partial: table `catalog_extra_charges` (`catalog.dbml:400`); quote has base line item only |
| `FR-CAT-018` Cancellation policy configuration | `cat.md`, section FR-CAT-018 | carry | None. | partial: table `catalog_cancellation_policy_tiers` (`catalog.dbml:327`); platform default set in `providers_create_manager.rb:43-44` |
| `FR-CAT-019` Availability slot creation | `cat.md`, section FR-CAT-019 | carry | None. | exists: `catalog/availability_slots/providers_create_manager.rb` |
| `FR-CAT-020` Per-asset overlap prevention | `cat.md`, section FR-CAT-020 | carry | None. | exists: GiST exclusion `catalog.dbml:43-45` |
| `FR-CAT-021` Remaining capacity visibility | `cat.md`, section FR-CAT-021 | carry | None. | exists: `marketplace_availability_slot_serializer.rb:8` |
| `FR-CAT-022` Edit/unpublish with confirmed bookings | `cat.md`, section FR-CAT-022 | carry | None. | not verified: warning and history rules not read in `providers_update_manager.rb` |
| `FR-CAT-023` Search by date | `cat.md`, section FR-CAT-023 | carry | Keyword search is new and not in this row. | exists: `marketplace_index_manager.rb:185` |
| `FR-CAT-024` Filter by service type | `cat.md`, section FR-CAT-024 | carry | Fork [vehicle types](#open-forks) may add a vehicle filter. | exists: `marketplace_index_manager.rb:143` |
| `FR-CAT-025` Filter by language and group size | `cat.md`, section FR-CAT-025 | carry | Status stays Provisional (`AMB-024`). | exists: `marketplace_index_manager.rb:156,172` |
| `FR-CAT-026` Filter by price range | `cat.md`, section FR-CAT-026 | supersede | Partial. Price range over "starting price" depends on fork [package model](#open-forks). The clear-filters clause carries. | exists: `marketplace_index_manager.rb:229-239` filters one price per listing after pricing |
| `FR-CAT-027` Sort results | `cat.md`, section FR-CAT-027 | supersede | Partial. The page already holds "decided" revamp bullets for Most booked and Top rated. PR 4 moves them to a normative page. | partial: order columns `marketplace_index_validator.rb:59-66`; no price or most-booked sort; web ships Newest and a disabled Top rated (`catalog-listing-constant.js:168-183`) |
| `FR-CAT-028` Single pricing authority | `cat.md`, section FR-CAT-028 | carry | None. | exists: `Catalog::Pricing::CalculateQuoteService` |
| `FR-CAT-029` Provider asset registration | `cat.md`, section FR-CAT-029 | carry | Fork [vehicle types](#open-forks) may extend categories. | exists: `catalog.dbml:160,171` |
| `FR-CAT-030` Publish requires verified merchant account | `cat.md`, section FR-CAT-030 | carry | None. | exists: `providers_publish_validator.rb:96` |
| `FR-CAT-031` Per-vehicle slot exclusivity | `cat.md`, section FR-CAT-031 | carry | None. | exists: `catalog/availability/reserve_seats_service.rb:69` |
| `FR-CAT-032` Near-me Area discovery | `cat.md`, section FR-CAT-032 | carry | Revisit only if fork [region model](#open-forks) changes listable nodes. | exists: `catalog/geographies/near_me_manager.rb`; web fetch gate off (`catalog-near-me-areas-service.js:4`) |
| `FR-CAT-033` Listing attaches to listable node | `cat.md`, section FR-CAT-033 | supersede | Partial. One listable node stays valid as the primary destination. Additional destinations and pickup coverage are new. PR 4. | partial: `catalog/listings/geography_listable_validation.rb:11-13`; single `catalog_listings.geography_id` (`catalog.dbml:211`) |
| `FR-CAT-034` Archived geography successor | `cat.md`, section FR-CAT-034 | carry | None. | exists: `catalog/geographies/team_archive_validator.rb:15-16` |

### ADRs \{#inventory-adr\}

Folder: `docs/30-49-domains/34-architecture-decisions/`.

| ID / artifact | Current location | Disposition | Replacement / notes | Code gap |
| --- | --- | --- | --- | --- |
| `ADR-013` Geography reference data | `adr-013-geography-reference-data.md` | carry | Decisions 1 and 3 to 6 stay. Decision 2 is already superseded by ADR-016. No PostGIS stays. | exists: no spatial extension in `catalog.dbml` |
| `ADR-016` Geography administrative tree | `adr-016-geography-administrative-tree.md` | carry | Amend only if fork [region model](#open-forks) adds a node or role. Levels stay `subdivision`, `municipality`, `ward`. | exists: `catalog.dbml:101-146` |
| `ADR-017` Tourist UI access model and public URL architecture | `adr-017-tourist-ui-public-url-architecture.md` | supersede | Partial. URL family `/districts/{districtSlug}/areas/{areaSlug}/listings` and the District/Area IA are replaced. Access decision (public browse, auth at checkout) and SSR decision carry. PR 4 adds a banner. | partial: routes `red-cab-web/app/marketplace.routes.js:23-41` match the old family |
| `ADR-004` Context integration model | `adr-004-context-integration-model.md` | carry | Mentions the "district cascade" in one sentence only. No amend needed. | exists: `subtree_unlist_service.rb:5` |
| `ADR-007` Transaction and consistency boundaries | `adr-007-transaction-and-consistency-boundaries.md` | carry | Mentions geography subtree cascades only. No amend needed. | exists: same as `ADR-004` |

### Open questions \{#inventory-open-questions\}

Source page: `docs/70-79-business/73-planning/open-questions.md`. Both items are resolved today. The revamp changes parts of both.

| ID / artifact | Current location | Disposition | Replacement / notes | Code gap |
| --- | --- | --- | --- | --- |
| `AMB-020` Discovery navigation model | `open-questions.md`, entry AMB-020 and Decision Log row | supersede | The District → Area ruling ends. Reopen in PR 4 or PR 5 and record the region-first ruling. | partial: IA is District → Area (`marketplace.routes.js:23-41`) |
| `AMB-022` Guest access scope | `open-questions.md`, entry AMB-022 and Decision Log row | supersede | Partial. The URL clause names `/districts/{districtSlug}/areas/{areaSlug}/listings`. Reopen that clause only. Option A access stays (`FR-IAM-012`, `NFR-SEC-005`). | exists: `app/controllers/marketplace/base_controller.rb:17` sets no user when unauthenticated |
| `AMB-036` Geography administrative model | `open-questions.md`, entry AMB-036 | pending | Storage and roles stay. A region layer is open (fork [region model](#open-forks)). | exists: `catalog.dbml:101-146` |
| `AMB-023` Vehicle taxonomy mismatch | `open-questions.md`, entry AMB-023 | pending | Fork [vehicle types](#open-forks). | exists: `vehicle_category` enum in `catalog.dbml:171,215` |

### Invariants and global rules \{#inventory-invariants\}

Source pages: `docs/70-79-business/71-business-rules/invariants.md`. PR 5 owns edits to this layer.

| ID / artifact | Current location | Disposition | Replacement / notes | Code gap |
| --- | --- | --- | --- | --- |
| `INV-8` Empty roots and nodes hidden | `invariants.md`, line 47 | carry | PR 5: discoverable subtree rule; presentation-agnostic discovery roots and listable nodes. Region storage fork open. | partial: `districts/marketplace_index_manager.rb:30-33` applies `discoverable` to roots |
| `INV-10` No publish with zero photos | `invariants.md`, line 49 | carry | A stricter discoverability gate is a new rule (fork [discoverability fields](#open-forks)). | exists: `providers_publish_validator.rb:77-84` |
| `LC-10` Listing status values | `invariants.md`, line 75 | carry | PR 5: `Published` necessary but not sufficient; discoverable predicate links to Catalog decisions. | exists: `marketplace_index_manager.rb:60` filters `status_published` only |
| `PRC-2` Price breakdown derivation | `invariants.md`, line 86 | carry | PR 5: single-policy starting price via `PRC-1`; package fork deferred. | partial: quote uses base rate only (`calculate_quote_service.rb:99-101`) |
| `BKG-9` Checkout session freeze | `invariants.md`, line 126 | carry | None. Revamp must not change it. | exists: `bookings/checkout_sessions/tourists_create_manager.rb:91-111`; `snapshot_attributes.rb` |
| `BKG-11` Fulfillment payload | `invariants.md`, line 128 | carry | PR 5: booking location + coverage gate before confirm; pickup address satisfies location until structured fork ruled. Drop-off mandatory. | exists: `bookings.dbml:483` `pickup_address text`; web `bookings-checkout-session-schema.js:4-6`; coverage validation not implemented |
| `CON-2` Last-seat concurrency | `invariants.md`, line 134 | carry | None. | exists: `catalog/availability/reserve_seats_service.rb:20` |
| `INV-3`, `INV-6`, `INV-11`, `INV-12`, `LC-8`, `LC-12`, `CON-3`, `CON-4`, `CON-6`, `OPR-10` | `invariants.md`; cross-refs in `cat.md` | carry | Core seat, provider, and publish-gate rules. No revamp change. | exists (see FR-CAT rows 002, 009, 010, 019-021, 029-031, 034) |
| `PRC-1`, `PRC-3` to `PRC-7`, `BKG-8` | `invariants.md`; cross-refs in `cat.md` | carry | `PRC-1` single pricing authority stays. Other `PRC-` rules follow the FR-CAT-013 to 018 rows. | partial (see FR-CAT-014 to 018 rows) |
| `FR-IAM-012`, `NFR-SEC-005`, `FR-REV-007` | `functional-requirements/iam.md`, `non-functional-requirements.md`, `functional-requirements/rev.md` | carry | Access model and review basis for Top rated stay. | exists: public marketplace endpoints; `rating_average` order column |

### Implementation specs \{#inventory-specs\}

Root: `docs/60-69-initiatives/61-2026/implementation-specs/`. All files below have `status: approved` unless the table says otherwise. PR 4 sets `status: superseded` where the row says **supersede**.

| ID / artifact | Current location | Disposition | Replacement / notes | Code gap |
| --- | --- | --- | --- | --- |
| `api-131` Migrate geography schema | `cat/geography/api-131-migrate-geography-schema.md` | carry | None. | exists: `catalog.dbml:75-146` |
| `api-132` Seed Japan geography | `cat/geography/api-132-seed-japan-geography.md` | carry | None. | exists: `catalog/geographies/japan_seed_service.rb` |
| `api-133` Refactor geography domain layer | `cat/geography/api-133-refactor-geography-domain-layer.md` | carry | None. | exists: `catalog/geographies/`, `geography_listable_validation.rb` |
| `api-134` Marketplace geography slug and ancestors | `cat/geography/api-134-marketplace-geography-slug-and-ancestors.md` | carry | Route params are `:district_slug` and `:area_slug`, so they are district-shaped. Revisit names only if fork [region model](#open-forks) adds a segment. | exists: `catalog/geographies/slug_resolution_service.rb` |
| `api-135` Near-me areas endpoint | `cat/geography/api-135-near-me-areas-endpoint.md` | carry | None. | exists: `catalog/geographies/near_me_manager.rb` |
| `api-136` Team geography admin endpoints | `cat/geography/api-136-team-geography-admin-endpoints.md` | carry | None. | exists: `catalog/geographies/team_*_manager.rb` |
| `docs-13` Geography administrative tree | `cat/geography/docs-13-geography-administrative-tree.md` | carry | None. | exists: ADR-016 shipped |
| Geography data model review | `cat/geography/design-review-data-model.md` | carry | Reference only. Frontmatter has no `status` and no `doc_type`. PR 4 may set a type. | exists: tree in `catalog.dbml:101-146` |
| `web-56` Tourist access and route contract | `iam/web-56-tourist-access-and-route-contract.md` | supersede | URL and redirect sections only. Access model carries. Do not set the whole spec `superseded` without a successor for the access section. | partial: routes match this spec (`marketplace.routes.js:23-41`) |
| `web-57` Tourist IA, breadcrumbs, deep links | `cat/web-57-tourist-ia-breadcrumbs-deep-links.md` | supersede | District → Area IA and breadcrumb trail change. Successor spec in a later PR. | not verified: breadcrumb code not read; routes are District → Area (`marketplace.routes.js:23-41`) |
| `web-59` Tourist homepage discover entry | `cat/web-59-tourist-homepage-discover-entry.md` | supersede | IA only. The spec TL;DR already says a future `web-146` owns Home IA. Frontmatter `status` still reads `approved`. The `featured=true` loader and API stay valid. | exists: `featured` param in `catalog/districts/marketplace_index_request.rb:15-26` |
| `web-65` Near-me area discovery section | `cat/web-65-near-me-area-discovery-section.md` | supersede | Near-me is an Area list. Revisit with region-first IA. | partial: fetch gate is `false` (`catalog-near-me-areas-service.js:4`) |
| `web-66` Map pin regions on listing and area views | `cat/web-66-map-pin-regions-listing-area-views.md` | supersede | Area-view map placement changes with the new IA. | partial: placeholder map shell only; no map SDK |
| `web-67` Listing sort control wired to URL params | `cat/web-67-listing-sort-control-url-params.md` | supersede | Sort presets change (Most booked, price). URL-driven sort pattern carries. | partial: `catalog-listing-constant.js:168-198`; Top rated disabled |
| `web-124` Discover toolbar filters to API | `cat/web-124-discover-toolbar-filters-api-forwarding.md` | supersede | Search stays disabled in this spec. Keyword search needs a new spec. Filter forwarding carries. | partial: filters forwarded (`catalog-listing-constant.js:240-247`); search disabled (`catalog-listing-discover-toolbar.jsx:13,41`) |
| `api-161` Marketplace listing index discover filters | `cat/api-161-marketplace-listing-index-discover-filters.md` | supersede | The spec lists "Does NOT ship: free-text search". Filters carry. A new spec adds keyword (`q`). | partial: filters exist (`marketplace_index_manager.rb:130-134`); no `q` anywhere in the index request |

Name clash: `implementation-specs/rev/api-161-provider-review-report.md` is a Reviews spec. It is not part of this audit. The Catalog spec for issue #161 is `cat/api-161-marketplace-listing-index-discover-filters.md`.

### Planning drift \{#inventory-planning-drift\}

| ID / artifact | Current location | Disposition | Replacement / notes | Code gap |
| --- | --- | --- | --- | --- |
| Gap table row "CAT search/filter" | `73-planning/roadmap/phase-2-execution-map.md`, line 55 | supersede | Row says no date, service type, or price filters. Filters now ship. Rewrite the row. PR 4 or a later docs PR. | exists: `marketplace_index_manager.rb:130-134,229-239` |
| Wave 2 tasks W2-1 to W2-3 | `phase-2-execution-map.md`, lines 182-184 | supersede | Tasks match `api-161` and `web-124`. Mark done or link the specs. | exists: see `api-161`, `web-124` rows |
| Wave table row W2 | `phase-2-execution-map.md`, line 112 | pending | Says "toolbar live". Filters are live; search and most sorts are not. Rewrite after fork [package model](#open-forks). | partial: sort presets in `catalog-listing-constant.js:168-198` |
| Phase UI slots row | `73-planning/roadmap/tourist-ui-pre-phase-2.md`, line 52 | supersede | Says filter bar is not scaffolded. The discover toolbar and filter form exist. | exists: `catalog-listing-discover-toolbar.jsx` |
| Search, filter, sort checklist | `73-planning/roadmap/phase-2-marketplace-depth.md`, lines 88 and 95 | pending | Items are unchecked. Partly shipped. | partial: filters and newest sort ship; keyword missing |

## Verified code facts \{#verified-code-facts\}

Checked on 2026-10-17 against `red-cab-api` and `red-cab-web` `main`.

Geography:

- Column `catalog_geographies.level` has three values: `subdivision`, `municipality`, `ward` (`catalog.dbml:110`).
- No region node or level exists. A region would be a new concept.
- Discovery roles are booleans `is_discovery_root` and `is_listable` (`catalog.dbml:126-127`).
- Column `parent_id` is null only for `subdivision` (`catalog.dbml:106`).

Listing and pricing:

- A listing has one `geography_id`, and the target must have `is_listable = true` (`catalog.dbml:211`).
- A listing has one `vehicle_category` (`catalog.dbml:215`).
- Pricing sits in `catalog_pricing_policies`, one row per listing (`catalog.dbml:288`).
- No package aggregate or package table exists.
- The quote service applies the base rate, per-person or per-vehicle (`calculate_quote_service.rb:99-123`).
- The quote service does not apply tiers, duration, seasonal overrides, or extra charges today.

Marketplace index and search:

- The area listings index returns `status_published` listings only (`marketplace_index_manager.rb:60`).
- Supported filters are `date`, `service_type`, `language`, `passenger_count`, `price_min`, `price_max` (`marketplace_index_validator.rb:13-40`).
- No `q` or keyword parameter exists in the index request or validator.
- The web search input is disabled (`catalog-listing-discover-toolbar.jsx:13,41`).
- Allowed order columns are `published_at`, `rating_average`, `reviews_count`, `title_en`, `created_at`. No price or most-booked order exists.
- The web route family is `/districts/:districtSlug/areas/:areaSlug/...` (`marketplace.routes.js:23-41`).

Booking and checkout:

- Checkout creation reserves seats and creates a `pending` session (`tourists_create_manager.rb:91-111`). This matches `BKG-9`.
- A booking is created as `confirmed` only after payment succeeds (`materialize_order_manager.rb:53-54,134`).
- Pickup and drop-off are free-text columns `pickup_address` and `dropoff_address` (`bookings.dbml:483-484`).
- Web checkout validates `pickup_address` as a non-empty string (`bookings-checkout-session-schema.js:4-6`).

Missing tables:

- No pickup-coverage table exists in any DBML file under `red-cab-api/docs/db/`.
- No multi-destination (additional destination) table exists.

## Open forks \{#open-forks\}

This table lists forks only. It gives no rulings. Each fork needs an owner decision before the blocked rows can leave **pending**.

| Fork | Blocks audit rows | Owner decision needed |
| --- | --- | --- |
| Package vs tiers | `FR-CAT-005`, `FR-CAT-013`, `FR-CAT-026`, `PRC-2`, W2 planning row | Does a listing hold many packages, or does it keep one policy with group-size tiers? Which price is the starting price? |
| Region model | `FR-CAT-001`, `FR-CAT-003`, `FR-CAT-004`, `FR-CAT-032`, `ADR-016`, `AMB-036`, `api-134`, `INV-8` | Is a region a tree node, a grouping table, or a presentation layer? |
| Destination granularity | `FR-CAT-033`, `INV-8` | At what level can a listing name a primary and additional destination? |
| Coverage timing | `FR-CAT-033`, `BKG-11` | Does pickup coverage apply at publish, at search, or at checkout? |
| BKG-11 vs booking location | `BKG-11`, `BKG-9` payload | Does free-text pickup stay, or does checkout add a structured location? |
| Vehicle types | `FR-CAT-024`, `FR-CAT-029`, `AMB-023` | Does the vehicle taxonomy change, and does it become a filter? |
| Discoverability fields | `INV-8`, `INV-10`, `LC-10`, `FR-CAT-012` | Which fields make a Published listing discoverable? |

## Recommended PR 4 actions \{#recommended-pr4\}

PR 4 applies these. This PR changes none of them.

Implementation specs to set `status: superseded` (add `superseded_by:` when the successor exists):

- `cat/web-57-tourist-ia-breadcrumbs-deep-links.md`
- `cat/web-65-near-me-area-discovery-section.md`
- `cat/web-66-map-pin-regions-listing-area-views.md`
- `cat/web-67-listing-sort-control-url-params.md`
- `cat/web-124-discover-toolbar-filters-api-forwarding.md`
- `cat/api-161-marketplace-listing-index-discover-filters.md`
- `cat/web-59-tourist-homepage-discover-entry.md` (IA part; align frontmatter with the TL;DR note)

Specs to banner on the affected section only, not to supersede whole:

- `iam/web-56-tourist-access-and-route-contract.md` (URL and redirect sections)

Requirement sections to banner in `cat.md`:

- `FR-CAT-003`, `FR-CAT-004`, `FR-CAT-026`, `FR-CAT-027`, `FR-CAT-033` (partial supersession)
- `FR-CAT-005`: banner after fork [package model](#open-forks) is ruled

ADR and register banners:

- `ADR-017`: banner on the URL family and IA sections. Keep the access and SSR decisions visible.
- `AMB-020` and `AMB-022`: mark the superseded clauses in the Decision Log and reopen them.

Carry as-is (no banner):

- `FR-CAT-001`, `002`, `006` to `025`, `028` to `032`, `034`
- `api-131` to `api-136`, `docs-13`
- `ADR-004`, `ADR-007`, `ADR-013`, `ADR-016` (amend `ADR-016` only after the region fork)

PR 5 (complete): `INV-8`, `LC-10`, `PRC-2`, `BKG-11` amended in [invariants](/docs/70-79-business/business-rules/invariants).

Planning pages to fix in a docs follow-up:

- `phase-2-execution-map.md` lines 55, 112, 182-184
- `tourist-ui-pre-phase-2.md` line 52
- `phase-2-marketplace-depth.md` lines 88 and 95

## Change log \{#change-log\}

| Date | Change |
| --- | --- |
| 2026-10-17 | PR 3 of 5: add phase 0 audit with FR-CAT, ADR, open question, invariant, spec, and planning drift inventories. |
| 2026-10-17 | PR 5 of 5: `INV-8`, `LC-10`, `PRC-2`, `BKG-11` dispositions updated to **carry** with amended global text. |
