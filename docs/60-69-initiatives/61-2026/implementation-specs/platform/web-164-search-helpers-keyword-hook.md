---
title: "Share the URL search helpers and the keyword hook"
sidebar_label: Web · Search helpers and keyword hook
issue: "https://github.com/markmamba/red-cab-web/issues/164"
repos:
  - red-cab-web
status: implemented
phase: 2
context: PLATFORM
related:
  - "https://github.com/markmamba/red-cab-web/issues/153"
  - "https://github.com/markmamba/red-cab-web/issues/160"
---

## TL;DR

- Moves seven helper functions with no catalog words from `catalog-listing-service.js` to `app/utils/search-param-utils.js`.
- Adds the hook `app/hooks/use-keyword-param.js`.
  - It holds the keyword logic of the discover toolbar.
- The discover toolbar and the listing service use the shared code.
- Does NOT change behavior, text or styles.
  - The listing pages work as before.
- Does NOT add the visual blocks in `app/components/search/`.
  - They get their own issue.
- Breaking change: No.

## Problem

The shared search logic is locked in the catalog domain.

1. The keyword logic sits in lines 41 to 99 of `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx`.
   - A second domain with a keyword field must copy it.
2. Six helper functions and one pattern sit at the top of `app/domains/catalog-listing/catalog-listing-service.js`.
   - The functions are `parseListParam`, `isValidIsoDate` and `normalizeKeyword`, with the pattern `ISO_DATE_PATTERN`.
   - The word count sits inside `getKeywordProblem`.
   - The lines `nextParams.set('page', '1')` and the set-or-delete code repeat in the builders.
3. `app/utils/search-param-utils.js` holds only `serializeUrlParams` and `prepareSearchParams`.
   - No page imports them today.

Evidence:

- Five builders in the listing service write `nextParams.set('page', '1')`.
- `AGENTS.md` and `app/routes/AGENTS.md` point to `search-param-utils.js` as the place for search param helpers.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Web | `red-cab-web/AGENTS.md` | Code style, JSDoc rule, naming of conditions. |
| Web | `red-cab-web/app/routes/AGENTS.md` | Search, filter and pagination rules. URL params are the source of truth for list state. |
| Spec | [web-153 · Listing scope pages](../cat/web-153-listing-scope-pages) | Defines the keyword rules this spec moves, including the pause, `replace` and Back and Forward. |
| Spec | [web-160 · Components cleanup](./web-160-move-domain-code-out-of-components) | The ESLint rule that keeps domain code out of `app/components/`. |
| Issue | [red-cab-web#164](https://github.com/markmamba/red-cab-web/issues/164) | Problem and direction. |

## Design decisions

Rulings marked "Owner ruling" were given by the owner on 2026-10-24.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **All seven helpers move to `app/utils/search-param-utils.js`: `parseListParam`, `formatListParam`, `isValidIsoDate`, `normalizeKeyword`, `countUniqueWords`, `setOrDeleteParam` and `resetPageParam`.** | Move only the helpers that two concepts use. A new file `url-filter-utils.js`. | Owner ruling. The file already exists and is the place that `AGENTS.md` names. |
| 2 | **The comma pair is `parseListParam` (decode, moved as is) and the new `formatListParam` (encode). The issue lists the pair as one item, so seven functions in total.** | Two new names | `parseListParam` already decodes. It needs no second function. |
| 3 | **The hook takes `buildSearchParams(previousParams, keyword)` from the domain. The listing page passes `CatalogListingService.buildKeywordSearchParams`.** | The hook sets the param itself. The hook only returns the value. | Owner ruling. The domain keeps its own rules, such as the reset of the page. |
| 4 | **The hook also takes `validate(keyword)` and `debounceMs`. The limits (5 words, 100 characters) and the messages stay in the catalog domain.** | Limits in the hook | Owner decision in the plan. Each domain has its own limits. |
| 5 | **The hook returns `keywordText`, `setKeywordText`, `clearKeyword`, `problem` and `isInvalid`. The field ref and the focus stay in the toolbar.** | The hook owns the ref | The ref and the focus belong to the field, not to the URL logic. |
| 6 | **`setOrDeleteParam(params, name, value)` and `resetPageParam(params)` change the `URLSearchParams` object they get and return it.** | Return a new object | Every builder already makes its own copy with `new URLSearchParams(previousParams)`. |
| 7 | **`countUniqueWords(text)` normalizes the text first and counts each word once.** | Count in the service | This is the rule of `getKeywordProblem` today. The helper keeps it. |
| 8 | **No behavior changes. The existing specs pass without a change to their expectations.** | Fix small issues on the way | A move must be easy to review. |

## Web contract

No route, loader or API call changes.

### Helpers in `app/utils/search-param-utils.js`

| Function | Input | Output | Rule |
| --- | --- | --- | --- |
| `parseListParam(value)` | A comma list or empty | A list of unique, trimmed values | Same as today. |
| `formatListParam(values)` | A list | A comma string | `values.join(',')`. |
| `isValidIsoDate(value)` | A string | `true` or `false` | Same as today, with `ISO_DATE_PATTERN` moved with it. |
| `normalizeKeyword(value)` | A string or empty | A trimmed string with one space between words | Same as today. |
| `countUniqueWords(text)` | A string or empty | A number | Normalizes the text, then counts each word once. |
| `setOrDeleteParam(params, name, value)` | A `URLSearchParams`, a name, a value | The same `params` | Sets the param. Deletes it when the value is `null`, `undefined` or `''`. |
| `resetPageParam(params)` | A `URLSearchParams` | The same `params` | Sets `page` to `'1'`. |

### The hook `app/hooks/use-keyword-param.js`

```js
useKeywordParam({ paramName, debounceMs, validate, buildSearchParams })
// returns { keywordText, setKeywordText, clearKeyword, problem, isInvalid }
```

The hook keeps the rules that the toolbar has today.

- The field starts with the value of the param.
- `validate(keyword)` returns a message or `null`.
  - A message sets `isInvalid` and stops the URL change.
- The URL changes only after `debounceMs` without a key press.
- The change uses `setSearchParams` with `replace: true`.
  - The hook passes the trimmed keyword to `buildSearchParams`.
- The hook does nothing when the trimmed text equals the trimmed param.
- A Back or Forward move (`navigationType === 'POP'`) copies the param to the field.
- Our own changes use `replace`, so they never overwrite new typing.
- `clearKeyword` sets the text to an empty string.
  - The toolbar then moves the focus.

### Files to create or modify (Web)

- `app/utils/search-param-utils.js`: add the seven functions with JSDoc.
- `app/utils/search-param-utils.spec.js`: new.
  - It has one group of tests for each function.
- `app/hooks/use-keyword-param.js`: new.
- `app/hooks/use-keyword-param.spec.jsx`: new.
  - It uses fake timers.
- `app/domains/catalog-listing/catalog-listing-service.js`: import the helpers.
  - Delete the local copies and `ISO_DATE_PATTERN`.
  - `getKeywordProblem` calls `countUniqueWords`.
  - The builders call `setOrDeleteParam`, `resetPageParam` and `formatListParam`.
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx`: use the hook.
  - It passes `paramName`, `debounceMs`, `validate` and `buildSearchParams`.
  - It keeps the field, the clear button focus, the Filters button, the chips and the panel.

## Data / domain touchpoints

- Bounded context: CAT (catalog), for the files that change.
- The new files are platform code.
- Transaction boundaries: none.
- Snapshots: none.
- The new files import nothing from `@/domains` or `@/layouts`.

## Out of scope

- The visual blocks in `app/components/search/`: chips, keyword input, filter button, filter panel and sort select.
- Moving any older list page to the shared parts.
- Changes to the keyword limits, the messages or the pause time.
- A change of the URL names (`keyword`, `page`, `service_type`).

## Tasks

### Web

- [ ] Add the seven functions to `search-param-utils.js` with JSDoc, and add the spec.
- [ ] Make the listing service use them.
- [ ] Delete the local copies in the listing service.
- [ ] Add `use-keyword-param.js` and its spec.
- [ ] Use the hook in the discover toolbar.
- [ ] Run `npm run lint`, `npm test` and `npm run build`.
- [ ] Check by hand against `review-react-style`.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The existing specs pass without a change to their expectations.
  - They are the specs of the toolbar, the filter form, the filter schema, the chips and the listing service.
- [ ] Each of the seven functions has a unit spec that covers an empty value.
- [ ] `setOrDeleteParam` keeps the value `0` and deletes `''`, `null` and `undefined`.
- [ ] The hook spec covers these cases.
  - The pause, and one URL change for a burst of keys.
  - The `replace` entry.
  - The Back and Forward sync.
  - An invalid keyword, and a clear.
- [ ] `catalog-listing-service.js` has no copy of a moved function and no `ISO_DATE_PATTERN`.
- [ ] A search for `@/domains` and `@/layouts` in `search-param-utils.js` and `use-keyword-param.js` finds nothing.
- [ ] Every moved or new exported function has JSDoc.
- [ ] No client-side price computation.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
grep -n "@/domains\|@/layouts" app/utils/search-param-utils.js app/hooks/use-keyword-param.js
```

The last command prints nothing.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
