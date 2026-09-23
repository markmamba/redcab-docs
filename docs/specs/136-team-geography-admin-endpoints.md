---
title: "136 — Team geography admin endpoints"
issue: "https://github.com/markmamba/red-cab-api/issues/136"
repos:
  - red-cab-api
status: approved
phase: 1
context: CAT
depends_on:
  - "docs/specs/135-near-me-areas-endpoint.md (status: approved)"
  - "docs/specs/geography-administrative-tree.md (status: approved)"
epic: "https://github.com/markmamba/red-cab-api/issues/130"
---

## TL;DR

- Ships **epic #130 step 13** — team admin geography API: list/filter, show, label PATCH, deactivate/reactivate/archive with successor, and synchronous subtree listing unlist (`FR-CAT-001`, `FR-CAT-002`, `FR-CAT-034`, `OPR-10`, `INV-11`).
- Does **not** ship `red-cab-web` team UI, marketplace read changes (#134 done), migrations, or seed task changes.
- Breaking change: **No** — new team endpoints only.

## Problem

Epic #130 steps 1–12 (#131–#135) delivered schema, seed, domain models, marketplace slug resolution, and near-me. Team admins cannot yet curate geography labels, reorder nodes, or run deactivate/archive lifecycle transitions with listing cascade. Marketplace 301 on archived nodes (#134) reads `successor_geography_id` but nothing sets it yet.

Evidence: `config/routes/team_routes.rb` (no `catalog/geographies`), no `app/domains/catalog/geographies/team_*` managers, no `SubtreeUnlistService`, `unlisted_at` column never set.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Parent spec | [geography-administrative-tree.md](./geography-administrative-tree.md) | Team admin API contract, lifecycle FSM, serializer matrix |
| Prerequisite | [133-refactor-geography-domain-layer.md](./133-refactor-geography-domain-layer.md) | `Catalog::Geography`, `discoverable`, `TreeValidator` |
| Prerequisite | [134-marketplace-geography-slug-and-ancestors.md](./134-marketplace-geography-slug-and-ancestors.md) | Read-side archive 301 (admin writes successor) |
| FR-CAT-001/002/034 | [requirements/functional-requirements/cat.md](../requirements/functional-requirements/cat.md) | Admin curation, cascade, archive successor |
| NFR-I18N-003 | [requirements/non-functional-requirements.md](../requirements/non-functional-requirements.md) | EN/JA (and kana) labels |
| INV-8, INV-11, OPR-10 | [business-rules/invariants.md](../business-rules/invariants.md) | Subtree discoverability; archive never delete; cascade |
| ADR-016 | [architecture/decisions/adr-016-geography-administrative-tree.md](../architecture/decisions/adr-016-geography-administrative-tree.md) | Tree shape, path, successor |
| geography.md | [architecture/geography.md](../architecture/geography.md) | Admin workflow, label conventions |
| domain-to-code-mapping | [engineering/domain-to-code-mapping.md](../engineering/domain-to-code-mapping.md) | `geographies/team_*` surface |
| Backend conventions | [engineering/backend-conventions.md](../engineering/backend-conventions.md) | Request → Manager → Validator; explicit routes |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Issue-scoped spec** (this file) | Parent spec only as `spec_path` | Repo spec-first (#131–#135 pattern) |
| 2 | **Route namespace** — `team/catalog/geographies/*` | Nest under legacy `districts` | Parent spec decision 9 |
| 3 | **Route surface** — full 7 routes (Q1=A) | Issue-minimum subset | Parent spec team admin table; completes epic #130 |
| 4 | **Index filters** — `level`, `status`, `parent_id`, `is_discovery_root`, `q` | Add `country` filter | Parent spec; JP-only phase 1 makes country redundant |
| 5 | **PATCH whitelist** — `name_en`, `name_ja`, `name_kana`, `display_order` (Q2=A) | Allow slug mutation | FR-CAT-001 protects upsert keys; NFR-I18N-003 |
| 6 | **`SubtreeUnlistService`** — shared by deactivate + archive | Inline in each manager | DRY; testable cascade unit |
| 7 | **Unlist scope** — `published` listings only in subtree via `path` prefix | Unlist paused/draft too | OPR-10 tourist-visible cascade; paused already hidden |
| 8 | **Unlist mutation** — `status: unlisted`, `unlisted_at: Time.current` in same transaction as geography FSM | Async event consumer only | Parent spec synchronous; intra-Catalog (CR-4 N/A) |
| 9 | **`confirm_listing_count`** — required on deactivate + archive; must match published subtree count | Optional confirmation flag | FR-CAT-002, OPR-10 |
| 10 | **Archive from `deactivated`** — allowed; preserve `deactivated_at` | Clear `deactivated_at` on archive | Parent lifecycle table + DB CHECK audit trail |
| 11 | **Successor rules** — must be `active`, not self, not in archived node's subtree | Any geography UUID | FR-CAT-034; #134 redirect target must be active |
| 12 | **Serializer split** — `TeamGeographySerializer` (index) + `TeamGeographyDetailSerializer` (show/mutations) | Single serializer | PKM list-detail ownership; show embeds `children` + `successor` |
| 13 | **Events** — `Catalog::Events::ListingUnlisted.publish` after transaction per unlisted listing (Q3=B) | Defer events entirely | Domain event catalog; synchronous unlist still in transaction |
| 14 | **Test tree** — `test/integration/team/catalog/geographies_*` | `test/controllers/team/` only | Parent spec AC; richer lifecycle coverage |

## API contract

Auth: team JWT via `Team::AuthenticatedController`.

### Routes

| Method | Path | Request body | Response | Notes |
| --- | --- | --- | --- | --- |
| GET | `/team/catalog/geographies` | — | paginated index | Filters: `level`, `status`, `parent_id`, `is_discovery_root`, `q` |
| GET | `/team/catalog/geographies/:geography_id` | — | detail + children summary | `geography_id` = uuid |
| POST | `/team/catalog/geographies` | labels, `parent_id`, `level`, codes | 201 | Exceptional manual create; `TreeValidator` |
| PATCH | `/team/catalog/geographies/:geography_id` | `name_en`, `name_ja`, `name_kana`, `display_order` | 200 | No slug / code mutation |
| POST | `/team/catalog/geographies/:geography_id/deactivate` | `{ "confirm_listing_count": N }` | 200 | `active` → `deactivated` + cascade unlist |
| POST | `/team/catalog/geographies/:geography_id/reactivate` | — | 200 | `deactivated` → `active`; listings stay unlisted |
| POST | `/team/catalog/geographies/:geography_id/archive` | `{ "successor_geography_id": "uuid", "confirm_listing_count": N }` | 200 | `active`/`deactivated` → `archived` + cascade unlist |

### `SubtreeUnlistService`

**Service:** `Catalog::Geographies::SubtreeUnlistService`

```ruby
# Illustrative
def self.execute(geography:, confirm_listing_count:)
  # => Integer (count unlisted)
end
```

**Query shape:**

```sql
SELECT catalog_listings.*
FROM catalog_listings
INNER JOIN catalog_geographies lg ON lg.id = catalog_listings.geography_id
WHERE catalog_listings.status = 'published'
  AND (lg.path = :node_path OR lg.path LIKE :node_path || '/%')
```

**Validation:** `confirm_listing_count` must equal query count or raise `ValidationError` on `:confirm_listing_count`.

**Mutation:** row-wise `update!` setting `status: unlisted`, `unlisted_at: Time.current` inside transaction.

**Events (after transaction commits):** for each unlisted listing, `Catalog::Events::ListingUnlisted.publish(listing: listing)` following `Providers::Events::*` pattern.

### Serializer field matrix

| Serializer | Fields | Notes |
| --- | --- | --- |
| `TeamGeographySerializer` | `uuid`, `slug`, `path`, `level`, `external_code`, `code_system`, `name_en`, `name_ja`, `name_kana`, `display_order`, `status`, `deactivated_at`, `archived_at`, `is_discovery_root`, `is_listable`, `parent_id` (uuid), `country_id` (uuid) | Index lean |
| `TeamGeographyDetailSerializer` | base + `children: [{ uuid, slug, name_en, name_ja, level, status, display_order }]` + `successor: { uuid, slug, name_en, name_ja }` when archived | Show + mutation responses |

No DB queries inside serializers — preload in managers.

### Files to create or modify (API)

- `config/routes/team_routes.rb`
- `app/controllers/team/catalog/geographies_controller.rb`
- `app/domains/catalog/geographies/team_*` (index, show, create, update, deactivate, reactivate, archive)
- `app/domains/catalog/geographies/subtree_unlist_service.rb`
- `app/domains/catalog/events/listing_unlisted.rb`
- `app/domains/catalog/team_geography_serializer.rb`
- `app/domains/catalog/team_geography_detail_serializer.rb`
- `test/domains/catalog/geographies/team_*_manager_test.rb`
- `test/integration/team/catalog/geographies_*_integration_test.rb`
- `docs/api/red-cab-api/team/catalog/geographies/*.bru`

## Data / domain touchpoints

- Bounded context: **CAT** — geography and listings same context; synchronous cascade OK
- FSM: `active` ↔ `deactivated` (reversible); `archive` irreversible from `active` or `deactivated`
- `INV-8`: unchanged — discoverable scope query-time only
- Snapshots: booking snapshots unchanged
- Pricing: no geography in quote path (`PRC-1`)

## Out of scope

- `red-cab-web` team admin UI
- Marketplace read changes
- Migrations / seed changes
- Auto-republish on reactivate
- PostGIS, tourism tags, slug-history table

## Tasks

### API

- [ ] Routes + controller
- [ ] Index/show/update managers + serializers
- [ ] `SubtreeUnlistService` + unit tests
- [ ] Deactivate/reactivate/archive managers
- [ ] Create manager + `ListingUnlisted` event
- [ ] Integration tests (merger, archive-from-deactivated, auth)
- [ ] Bruno docs
- [ ] `bundle exec srb tc`, targeted tests, `bundle exec rubocop`

### Docs

- [ ] Human verification MCQs resolved
- [ ] `review-implementation-spec` pass → set `status: approved`
- [ ] PR triple-links: `red-cab-api#136`, `red-cab-api#130`, `Spec: docs/specs/136-team-geography-admin-endpoints.md`

## Acceptance criteria

- [ ] Team index filters work (`level`, `status`, `parent_id`, `is_discovery_root`, `q`)
- [ ] PATCH updates labels/`display_order` without mutating slug or `external_code`
- [ ] Deactivate/archive require `confirm_listing_count` and cascade subtree unlist
- [ ] Archive sets `successor_geography_id`; merger scenario covered by test
- [ ] Archive from `deactivated` preserves `deactivated_at`
- [ ] Reactivate clears `deactivated_at`; listings stay unlisted
- [ ] Unauthorized requests return 401
- [ ] `bundle exec srb tc` clean; targeted tests pass

## Verification

```bash
# From red-cab-api/
bin/rails test test/domains/catalog/geographies/
bin/rails test test/integration/team/catalog/geographies/
bundle exec srb tc
bundle exec rubocop
```

## Cross-repo dependencies

| Consumer | Dependency |
| --- | --- |
| red-cab-web team geography UI | Future; consumes this API contract |
| Epic #130 | Final API step before `status: implemented` on parent spec |

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-09-23 | PKM plan agent | Approved — human verification passed (Q1=A, Q2=A, Q3=B); user confirmed 2026-09-23 |
