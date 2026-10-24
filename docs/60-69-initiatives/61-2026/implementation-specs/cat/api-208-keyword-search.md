---
title: "Add keyword search to the marketplace listings index"
sidebar_label: API · Keyword search
issue: "https://github.com/markmamba/red-cab-api/issues/208"
repos:
  - red-cab-api
status: implemented
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#keyword-search-scope"
  - "docs/30-49-domains/38-catalog/requirements/tourist-browse-and-search.md"
---

## TL;DR

- Ships the `keyword` param on `GET /marketplace/catalog/listings`.
- A listing matches when every word of the keyword appears in its title, its description, the name of a destination, or the provider name.
- The keyword narrows the scope and the filters. It never widens them.
- The first version uses `ILIKE`. The slice measures it on 10,000 generated listings and records the result in this spec.
- Does NOT ship the web search field, a search store, a relevance sort or a database migration.
- Breaking change: No. The param was rejected with 422 before. Now it works.

## Problem

A tourist cannot search for a place or a service name. The scoped index rejects `keyword` with "This filter is not available yet."

The ruling Keyword search scope matches the title, the description, the destination names and the provider legal business name. The provider field was open.

Evidence: `app/domains/catalog/listings/marketplace_scoped_index_request.rb` (`UNSUPPORTED_FILTERS`), issue #208.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Keyword search scope](/docs/30-49-domains/catalog/catalog-decisions/#keyword-search-scope) | Fields to match. Ignore case. Any part of a word. Narrow only. |
| Ruling | [Marketplace filter combination](/docs/30-49-domains/catalog/catalog-decisions/#marketplace-filter-combination) | Keyword joins the filters with AND |
| Ruling | [Destination structure](/docs/30-49-domains/catalog/catalog-decisions/#destination-structure) | Additional destinations widen discovery and keyword search |
| Requirements | [Tourist browse and search](/docs/30-49-domains/catalog/requirements/tourist-browse-and-search) | US-3 and its acceptance rows |
| Naming | [Naming and legacy aliases](/docs/30-49-domains/catalog/naming-and-legacy-aliases) | The URL param is `keyword`. Provider leg: legal business name. |
| Open question | [Open questions](/docs/30-49-domains/catalog/catalog-decisions/#open-forks) | "Which provider field does keyword search use?" This spec answers it for release 1. |
| Slice S8 | [Spec api-207](./api-207-scoped-listings-index.md) | The scoped index. Merged in red-cab-api#221. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **The provider leg matches `business_name` when the provider type is `private_car_luxury_transfer` or `charter_bus_operator`, and `display_name` when it is `tour_guide` or `tour_guide_plus_driver`.** | `business_name`, else `display_name`. Both fields for everyone. | Author decision on 2026-10-24. The ruling says legal business name, not the marketing display name. A guide has no company, so the display name stands in until IAM stores a legal name. |
| 2 | **An operator with no `business_name` is not found by provider name. The system does not fall back to `display_name`.** | Fall back to `display_name` | A fallback would match a marketing name, which the ruling excludes. The gap stays visible. |
| 3 | **The keyword splits on spaces into words. Every word must match at least one field. Different words may match different fields.** | Exact phrase. Any word may match. | Author decision on 2026-10-24. The keyword narrows as the tourist types more. |
| 4 | **A word matches with `ILIKE '%word%'`, with `%`, `_` and `\` escaped.** | `pg_search`, trigram | The issue says start with `ILIKE` and measure. Escaping stops a tourist from using wildcards. |
| 5 | **Fields for each word: `title_en`, `title_ja`, `description_en`, `description_ja`, `name_en` and `name_ja` of the primary destination, `name_en` and `name_ja` of each active additional destination, and the provider field of decision 1.** | Add region names or kana | The ruling lists these fields. The region name is not in the ruling. |
| 6 | **Destination and provider matches use `EXISTS` subqueries, not joins.** | Joins with `DISTINCT` | `EXISTS` keeps one row for each listing and avoids N+1 queries. |
| 7 | **A blank or space-only keyword means no keyword. The keyword is limited to 100 characters and 5 words. A longer keyword returns 422.** | No limit | A limit keeps the query small. The limits are not in the ruling. They need author confirmation. |
| 8 | **The keyword combines with the scope, the filters and the sort by AND. The sort does not change when a keyword is present.** | Sort by relevance | The ruling says the sort stays. |
| 9 | **The performance test uses 10,000 generated published listings with destinations and providers. `ILIKE` stays when the all-Japan query runs in under 100 ms. If not, this slice adds `pg_trgm` GIN indexes and measures again.** | 50,000 listings, or no measurement | Author decision on 2026-10-24. The result goes in the Performance record below. |
| 10 | **The query reads `providers_profiles` with a read-only `EXISTS`. Catalog writes nothing in Providers.** | Copy the provider name into Catalog | Catalog already reads the provider profile for the listing card. A copy would go stale. |

## API contract

No new route ships. `GET /marketplace/catalog/listings` gets one more param.

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/listings` | none | Adds `keyword` (text, up to 100 characters and 5 words) | Unchanged shape. `meta.count` follows the keyword. | The keyword narrows the result of every other param. |

Error text:

- Too long: "Please use 100 characters or fewer."
- Too many words: "Please use 5 words or fewer."

### Files to create or modify (API)

- `app/domains/catalog/listings/marketplace_scoped_index_request.rb` (remove `keyword` from the rejected filters; read the words)
- `app/domains/catalog/listings/marketplace_scoped_index_validator.rb` (length and word limits)
- `app/domains/catalog/listings/marketplace_scoped_index_manager.rb` (apply the keyword)
- `app/domains/catalog/listing.rb` (scope `matching_keyword_words`)
- `test/integration/marketplace/catalog/listings_scoped_index_integration_test.rb` and a scope test
- `lib/tasks` or a script outside the repo for the 10,000 listing test data (not committed to the app)

## Data / domain touchpoints

- Bounded context: CAT. The provider name is a read-only `EXISTS` on `providers_profiles`.
- Transaction boundaries: read only.
- Snapshots: none.

## Out of scope

- The web search field.
- A separate search store.
- A relevance sort, highlighting and spelling help.
- Matching region names and kana names.
- Keyword search on the regions endpoint.
- A legal business name field in IAM.

## Tasks

### API

- [ ] Remove `keyword` from the rejected filters and read the words in the request.
- [ ] Add the validator rules.
- [ ] Add the scope and apply it in the manager.
- [ ] Add tests for each matched field and for the narrowing rules.
- [ ] Generate 10,000 listings in a scratch database, run `EXPLAIN (ANALYZE)` and record the result below.
- [ ] If the result is 100 ms or more, add `pg_trgm` indexes and measure again.

### Web

- [ ] None in this issue.

### Docs

- [ ] Record the `EXPLAIN` result in the Performance record
- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] The keyword "Yokohama" finds a Tokyo tour that has Yokohama as an additional destination.
- [ ] The keyword finds a listing by its title and by its description, in English and in Japanese.
- [ ] The keyword finds a listing by the name of its primary destination.
- [ ] The keyword finds a listing by the `business_name` of an operator, and by the `display_name` of a guide.
- [ ] The keyword does not find an operator by its `display_name`. It does not find an operator with no `business_name`.
- [ ] Matching ignores case and finds part of a word.
- [ ] Every word must match. "yokohama tour" finds "Tour of Tokyo and Yokohama" and does not find a listing that has only one of the words.
- [ ] A keyword never returns a listing outside the current scope or outside the other filters.
- [ ] A keyword never returns a listing that is not discoverable.
- [ ] A blank keyword returns the same result as no keyword.
- [ ] The characters `%` and `_` in a keyword match only themselves.
- [ ] A keyword longer than 100 characters, or with more than 5 words, returns 422.
- [ ] A listing with two matching fields appears once.
- [ ] The query count does not grow with the number of listings on the page.
- [ ] The Performance record has the `EXPLAIN` result for 10,000 listings.
- [ ] Integration test: `test/integration/marketplace/catalog/listings_scoped_index_integration_test.rb`
- [ ] No client-side price computation
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
bin/rails test test/domains/catalog test/integration/marketplace/catalog
bin/rails test
bundle exec srb tc
bundle exec rubocop
bin/brakeman --no-pager
```

## Performance record

Setup: a scratch database with 10,000 discoverable listings, about 15,000 additional destinations and 200 providers. PostgreSQL 17.4 on a local machine. The query cache was off. The scratch database is dropped. The code is in red-cab-api#222.

Each time is the whole request in the manager: validation, the count query, the page query (10 rows) and the card price quotes. The table shows the median of 15 runs and the slowest run.

| Date | Listings | Query | Plan | Time | Result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | 10,000 | No keyword (baseline) | Index scan on `recently_added`, page stops early | 9.2 ms median, 21.9 ms max | Reference |
| 2026-10-24 | 10,000 | "tour" (1,017 matches) | Count: merge join with photos and pricing policies. Page: `recently_added` index, stops after 11 matches. | 28.9 ms median, 36.2 ms max | Pass |
| 2026-10-24 | 10,000 | "kanagawa" (548 matches) | Same shape. The destination name is checked with `EXISTS`. | 27.3 ms median, 35.3 ms max | Pass |
| 2026-10-24 | 10,000 | "sakura coach" (257 matches, provider) | Same shape. The provider name is checked with `EXISTS`. | 37.5 ms median, 41.7 ms max | Pass |
| 2026-10-24 | 10,000 | "zzzzz" (0 matches, full scan) | Count reads every listing. The page query finds no row. | 40.6 ms median, 42.3 ms max | Pass |
| 2026-10-24 | 10,000 | 5 common words (14 matches, worst case) | Count: sequential scan of `catalog_listings`, 50.9 ms execution. Page: `recently_added` index, 29.9 ms execution. | 60.9 ms median, 64.0 ms max | Pass |
| 2026-10-24 | 10,000 | Region Kanto + "tour" (331 matches) | Same shape, with the scope condition | 21.8 ms median, 25.8 ms max | Pass |
| 2026-10-24 | 10,000 | Page 50 + "tour" | Same shape, deeper offset | 39.1 ms median, 41.0 ms max | Pass |

Decision:

- The slowest case is 61 ms, below the limit of 100 ms in decision 9. `ILIKE` stays, and the slice adds no `pg_trgm` index.
- `ILIKE '%word%'` cannot use a B-tree index. The count query reads every listing, so the time grows with the number of listings.
- At about 15,000 listings, the 5-word case would pass 100 ms. At that size, add `pg_trgm` GIN indexes on the searched columns and measure again.
- The count and the page both run the keyword condition. This is the cost of `meta.count`.

How to read the numbers:

- `EXPLAIN (ANALYZE, BUFFERS)` with timing on reported 20 to 38 ms for each query. Most of that was the timing overhead of each plan node. The plans were taken again with `TIMING OFF`, and the table above comes from the manager timings.
- A first run showed about 2 ms for every case. It was wrong, because `rails runner` turns on the query cache. All numbers above were taken with the cache off.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-24 | principal developer | Approved in chat. The author confirmed decisions 1, 3 and 9 and the added points (fields, limits, wildcards, query shape, sort, cross-context read, out of scope). |
