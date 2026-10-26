---
title: "Add the booking location search endpoint"
sidebar_label: API · Booking location search
issue: "https://github.com/markmamba/red-cab-api/issues/240"
repos:
  - red-cab-api
status: approved
phase: 2
context: CAT
related:
  - "docs/30-49-domains/38-catalog/catalog-decisions.md#pickup-coverage-validation-timing"
  - "docs/30-49-domains/38-catalog/requirements/tourist-booking.md"
  - "docs/30-49-domains/38-catalog/models/geography.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/api-214-booking-location-and-charge-reversal.md"
---

## TL;DR

- Ships `GET /marketplace/catalog/booking_locations?search_text=`, which returns up to 10 places for the booking location.
- A place is an active, listable municipality or ward whose parent city and prefecture are also active.
- The search matches the English, Japanese and kana names, and it ignores kana width and hiragana.
- Each result carries its parent city and its prefecture, so the tourist can tell two wards named "Nishi" apart.
- Does NOT ship the web search field, paging, a request limit or a fix for the seed English names.
- Breaking change: No. The route is new.

## Problem

Checkout create needs `booking_location_id` (spec api-214), so the tourist must find that place by name.

The API has no endpoint that finds listable places by name.

Without it, the web checkout (red-cab-web#157) cannot let a tourist type "Shinjuku" and pick the ward.

The seed data makes a plain name search hard:

- Many English names are wrong, such as "Shifuya" for Shibuya, "Shinshiku" for Shinjuku and "Chiyota" for Chiyoda.
- The kana column mixes half-width katakana and hiragana, and a ward value starts with its city.
- 13 ward names repeat across cities, and "Nishi" has one ward in each of several cities.

Evidence: `config/routes/marketplace_routes.rb` (no such route), `catalog_geographies` rows for 渋谷区, 新宿区 and 西区, issue #240.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Ruling | [Pickup coverage validation timing](/docs/30-49-domains/catalog/catalog-decisions/#pickup-coverage-validation-timing) | The tourist searches for one booking location and picks a municipality or a ward. |
| Requirements | [Tourist booking](/docs/30-49-domains/catalog/requirements/tourist-booking) | The tourist types "Shinjuku" and picks the ward. |
| Model | [Geography model](/docs/30-49-domains/catalog/models/geography) | Four levels, `path`, and the meaning of a listable node |
| Schema | [catalog.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/catalog.dbml) | Columns `name_en`, `name_ja`, `name_kana`, `is_listable`, `status` |
| Spec api-214 | [Booking location check](./api-214-booking-location-and-charge-reversal.md) | The place rule that checkout create enforces. Merged. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. The search matches the names as they are. A separate issue fixes the English names in the seed. Until then, an English search for a wrongly named place finds nothing.** | Add search aliases here, or fix the seed first. | This slice stays small. The fix needs a data review that this slice should not wait for. |
| 2 | **Owner ruling, 2026-10-26. The search ignores kana width and the difference between hiragana and katakana. Each result carries its parent city and its prefecture.** | No parents, or no kana. | A tourist can type kana in any form. A repeated ward name needs its parent to be useful. |
| 3 | **Owner ruling, 2026-10-26. The search shows all listable places, not only the places that a listing covers. It is public. It returns at most 10 results, best match first. Each typed word matches as a prefix with `ILIKE`.** | Only covered places. Login. Substring match. | The checkout check gives the clear message for an uncovered place. The other marketplace geography routes are public. |
| 4 | **Owner ruling, 2026-10-26. The route is `GET /marketplace/catalog/booking_locations?search_text=`. After trimming, the text needs at least 2 and at most 50 characters. Else the API answers 422 with a message.** | `/geographies/search`. | The name says what the route is for. |
| 5 | **Added point, please review. A place qualifies when it is `active`, `is_listable`, and has level `municipality` or `ward`. Its parent and its prefecture must also be `active`.** | Check only the place. | Deactivating a prefecture does not change the status of the places below it. The level rule is the one in `BookingLocationValidationService`, and the query reuses its constant. |
| 6 | **Added point, please review. The API trims the text, applies Unicode compatibility folding (NFKC), and turns control characters, such as a null byte, into spaces, and splits it on spaces of any width. It uses at most the first 5 words. Every word must match.** | One phrase match. | "Yokohama Nishi" should find the ward in Yokohama. |
| 7 | **Added point, please review. A word matches a place when it is a prefix of `name_en`, `name_ja` or the kana of the place, or of the same fields of its parent city or its prefecture. A kana prefix may start at the beginning of the value or after a space.** | Match only the name of the place. | A ward kana value starts with its city. A prefix after a space finds the ward part. The parent match makes "yokohama nishi" work. |
| 8 | **Added point, please review. The kana comparison folds both sides. The database side is `translate(normalize(name_kana, NFKC), hiragana, katakana)`. The typed side is NFKC and a hiragana to katakana map.** | Add a column with the folded kana. | The candidate set is under 2,000 rows, so a computed value is cheap. No migration is needed. |
| 9 | **Added point, please review. The order is: places whose `name_ja` or `name_en` equals the typed text first, then the shorter `name_ja`, then `path`.** | Order by `display_order`. | An exact name beats a longer name that starts with the same letters. `path` makes the order stable. |
| 10 | **Added point, please review. The response is `{ booking_locations: [...] }`. It has no paging and no `meta`.** | Use `paginate_and_render`. | The limit is fixed at 10, so a tourist never pages through places. |
| 11 | **Added point, please review. Each item has `uuid`, `name_en`, `name_ja`, `level`, `path`, `parent` and `prefecture`. The two nested objects have `uuid`, `name_en` and `name_ja`. For a municipality, `parent` and `prefecture` are the same prefecture.** | Flat fields. | The web can show "Nishi-ku, Yokohama, Kanagawa" without a second call. |
| 12 | **Added point, please review. The manager loads the parent and its parent with `includes`, so the 10 results use no extra queries.** | Load per item. | Rule `G2` of the review pack. |
| 13 | **Added point, please review. The text reaches SQL only as a bind value, after `sanitize_sql_like`.** | Interpolate. | Rules `F1` and `F2` of the review pack. |
| 14 | **Added point, please review. No request limit ships here. The repo has no rate limiter today.** | Add one. | It is a platform decision that this slice should not make alone. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/catalog/booking_locations` | none | `search_text` (text, 2 to 50 characters after trimming) | `booking_locations`: up to 10 items | 422 when `search_text` is missing, too short or too long. |

Item example:

```json
{
  "uuid": "…",
  "name_en": "Nishi",
  "name_ja": "西区",
  "level": "ward",
  "path": "kanto/kanagawa/yokohama/nishi",
  "parent": { "uuid": "…", "name_en": "Yokohama", "name_ja": "横浜市" },
  "prefecture": { "uuid": "…", "name_en": "Kanagawa", "name_ja": "神奈川県" }
}
```

Error text:

- Missing: "Please type the name of a city or a ward."
- Too short: "Please type at least 2 characters."
- Too long: "Please type no more than 50 characters."

### Files to create or modify (API)

- `config/routes/marketplace_routes.rb`
- `app/controllers/marketplace/catalog/booking_locations_controller.rb` (new)
- `app/domains/catalog/geographies/marketplace_location_search_{request,validator,manager}.rb` (new)
- `app/domains/catalog/geographies/location_search_text_service.rb` (new, folds the typed text)
- `app/domains/catalog/marketplace_booking_location_serializer.rb` (new)
- `test/controllers/marketplace/catalog/booking_locations_controller_test.rb` (new)
- `test/domains/catalog/geographies/*` (new tests)

## Data / domain touchpoints

- Bounded context: CAT
- Transaction boundaries: none, because the endpoint only reads.
- Snapshots: none.
- Query change: one new read query, and the PR body carries an EXPLAIN.

## Out of scope

- The web search field (red-cab-web#157).
- A fix for the wrong English names in the seed, which a separate issue covers.
- Search for regions and prefectures, and map or street-address search.
- A request limit for public routes.

## Tasks

### API

- [ ] Add the route, controller and serializer.
- [ ] Add the request, validator and manager.
- [ ] Add the text folding service.
- [ ] Add the tests.
- [ ] Put an EXPLAIN in the PR body.

### Web

- [ ] None in this issue, because web issue #157 covers the form.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A Japanese name finds the place, such as 新宿 for 新宿区.
- [ ] A name in hiragana, full-width katakana or half-width katakana finds the same place.
- [ ] An English name finds the place when the seed name is right, such as "Hakone" for Hakonemachi.
- [ ] Two wards named "Nishi" both appear, each with its own parent city.
- [ ] "Yokohama Nishi" finds the ward in Yokohama first.
- [ ] A region, a prefecture and a place that is not listable never appear.
- [ ] An inactive place, and a place with an inactive parent or prefecture, never appear.
- [ ] The response has at most 10 results, and an exact name comes first.
- [ ] A missing, short or long `search_text` gives 422 with a clear message.
- [ ] The characters `%` and `_` in `search_text` match only themselves.
- [ ] The 10 results use no query for each item.
- [ ] No client-side price computation.
- [ ] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
PARALLEL_WORKERS=1 bin/rails test test/domains/catalog test/controllers/marketplace
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| | | | |
