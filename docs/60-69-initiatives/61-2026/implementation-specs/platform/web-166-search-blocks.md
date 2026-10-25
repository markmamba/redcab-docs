---
title: "Share the search bar blocks in app/components/search"
sidebar_label: Web · Search bar blocks
issue: "https://github.com/markmamba/red-cab-web/issues/166"
repos:
  - red-cab-web
status: implemented
phase: 2
context: PLATFORM
related:
  - "https://github.com/markmamba/red-cab-web/issues/153"
  - "https://github.com/markmamba/red-cab-web/issues/160"
  - "https://github.com/markmamba/red-cab-web/issues/164"
---

## TL;DR

- Adds six blocks in the new folder `app/components/search/`.
  - They are chips, keyword input, filter button, filter panel, filter panel form and sort select.
- Every block gets all its text as props.
  - No block has a default text.
- The discover toolbar, the filter form and the sort control use the blocks.
- Deletes `catalog-listing-discover-filter-chips.jsx`.
- Does NOT change behavior, text, layout or class names.
  - The listing pages look and work as before.
- Does NOT move any older list page.
- Breaking change: No.

## Problem

The search bar parts hold no catalog words, but they live in the catalog domain.

1. `catalog-listing-discover-filter-chips.jsx` takes its text from `catalog-listing-constant.js`.
2. The keyword field, the Filters button and the Filters panel markup sit inside `catalog-listing-discover-toolbar.jsx`.
3. The scroll area and the sticky footer of the panel sit inside `catalog-listing-discover-filter-form.jsx`.
4. The sort select sits inside `catalog-listing-discover-sort-control.jsx`.

A second domain must copy all of this.

Evidence:

- Seven older list pages have their own simple filter forms.
- The fix for the double x of the browser search field lives in one scoped rule.
  - The rule is `.catalog-discover-search` in `app/styles/_components.scss`.
  - A copy would miss it.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Web | `red-cab-web/AGENTS.md` | Directory structure for `app/components/`. Anti-Patterns 8 and 9. Code style and JSDoc rule. |
| Web | `red-cab-web/app/domains/AGENTS.md` | A domain owns its forms and schemas. |
| Spec | [web-160 · Components cleanup](./web-160-move-domain-code-out-of-components) | The ESLint rule: no `@/domains` or `@/layouts` import in `app/components/`. |
| Spec | [web-164 · Search helpers and keyword hook](./web-164-search-helpers-keyword-hook) | The logic with no UI. This spec adds the UI. |
| Spec | [web-153 · Listing scope pages](../cat/web-153-listing-scope-pages) | Defines the search bar behavior that must not change. |
| Issue | [red-cab-web#166](https://github.com/markmamba/red-cab-web/issues/166) | Problem and direction. |

## Design decisions

Rulings marked "Owner ruling" were given by the owner on 2026-10-24.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **The blocks live in `app/components/search/`.** | `app/components/filters/` | Owner ruling in the plan. |
| 2 | **Every text is a required prop. No block has a default.** | English defaults | Owner ruling. A missed prop must not show English on a Japanese page. |
| 3 | **The Filters panel is two blocks. `FilterPanel` is the side panel (Bootstrap `Offcanvas`). `FilterPanelForm` is the `<form>` with the scroll area and the sticky footer. The domain form keeps `useForm` and sits inside the panel.** | One block with the form inside. Only the form layout is shared. | Owner ruling. The content of an `Offcanvas` is removed when it closes. So unapplied edits still reset on close, as today. |
| 4 | **The blocks do not call `useForm`, `useSearchParams` or any API.** They get values and callbacks. | Blocks read the URL | The blocks stay presentation only. The domain owns the URL. |
| 5 | **The keyword input keeps the class `catalog-discover-search` and the type `search`.** | Rename the class | The scoped rule in `_components.scss` and a guard test depend on it. A rename is a style change. **Added point, please review.** |
| 6 | **Ids stay the same: the panel id is a prop (`catalog-discover-filter-offcanvas` from the toolbar), and the error id is a prop (`catalog-discover-toolbar-search-error`).** | Ids made inside the block | The toolbar spec checks both ids. The domain passes them. |
| 7 | **The remove label of a chip is a function prop `getRemoveLabel(chip)`.** | A text prop with a placeholder | The text depends on the chip. A function needs no placeholder syntax. **Added point, please review.** |
| 8 | **`SortSelect` takes `options` as `[{ value, label }]` and calls `onChange(value)` with the value, not the event.** | Pass the event | The block does not depend on the DOM event. The domain keeps the preset mapping. |
| 9 | **The spec of the chips moves to `app/components/search/filter-chips.spec.jsx`. Its expectations stay. Its render call gains the text props.** | Keep the old spec | The component moves, so its spec moves. |
| 10 | **`catalog-listing-discover-filter-chips.jsx` is deleted.** | Keep a thin wrapper | The toolbar can pass the text to `FilterChips` directly. A wrapper adds a file with no use. |
| 11 | **No behavior changes. The specs of the toolbar, the filter form and the sort control pass without a change.** | Fix small issues on the way | A move must be easy to review. |

## Web contract

No route, loader or API call changes.

### Blocks in `app/components/search/`

| Block | Props | Renders |
| --- | --- | --- |
| `FilterChips` | `chips`, `onRemove`, `onClear`, `clearLabel`, `groupLabel`, `getRemoveLabel` | The row of chips with the clear link. Nothing when `chips` is empty. Same classes as today. |
| `KeywordInput` | `value`, `onChange`, `onClear`, `inputRef`, `label`, `placeholder`, `clearLabel`, `maxLength`, `errorMessage`, `errorId` | The input group with the search icon, the field, the clear button (only when `value` is not empty) and the error text (only when `errorMessage` is not empty). |
| `FilterButton` | `label`, `count`, `appliedLabel`, `onClick`, `isOpen`, `controlsId` | The Filters button. The badge and the hidden word show only when `count` is above 0. |
| `FilterPanel` | `id`, `show`, `onHide`, `title`, `children` | The `Offcanvas` at the end of the page, with a header, a close button and a scroll body. |
| `FilterPanelForm` | `onSubmit`, `onReset`, `resetLabel`, `applyLabel`, `children` | The `<form>` with a scroll area for `children` and the sticky footer with the Reset link and the Apply button. |
| `SortSelect` | `options`, `value`, `onChange`, `ariaLabel` | The small select that fills the width of its parent. |

Each block has JSDoc and a component spec.

### Files to create or modify (Web)

- `app/components/search/filter-chips.jsx` and `filter-chips.spec.jsx`: moved from the catalog domain.
- `app/components/search/keyword-input.jsx` and its spec.
- `app/components/search/filter-button.jsx` and its spec.
- `app/components/search/filter-panel.jsx` and its spec.
- `app/components/search/filter-panel-form.jsx` and its spec.
- `app/components/search/sort-select.jsx` and its spec.
- `app/domains/catalog-listing/catalog-listing-discover-toolbar.jsx`: compose the blocks.
  - Keep the row layout, the hook and the Filters state.
- `app/domains/catalog-listing/catalog-listing-discover-filter-form.jsx`: wrap the fields in `FilterPanelForm`.
  - Keep `useForm`, the schema, the scope select, the fields and `handleApply`.
- `app/domains/catalog-listing/catalog-listing-discover-sort-control.jsx`: render `SortSelect`.
  - Keep the preset mapping.
- `app/domains/catalog-listing/catalog-listing-discover-filter-chips.jsx` and its spec: deleted.
- `app/components/components-import-rule.spec.js`: add a case for a file in `app/components/search/`.

## Data / domain touchpoints

- Bounded context: CAT (catalog), for the files that change.
- The new blocks are platform code and know no context.
- Transaction boundaries: none.
- Snapshots: none.
- The blocks import nothing from `@/domains` or `@/layouts`.

## Out of scope

- Moving any older list page to the shared blocks.
- A field list renderer or one generic search bar component.
- A change to the text, the limits, the layout or the styles of the listing pages.
- A rename of the class `catalog-discover-search`.

## Tasks

### Web

- [ ] Add `FilterChips`, move its spec and use it in the toolbar.
- [ ] Delete the old chips file.
- [ ] Add `KeywordInput` and use it in the toolbar.
- [ ] Add `FilterButton` and use it in the toolbar.
- [ ] Add `FilterPanel` and `FilterPanelForm`.
- [ ] Use them in the toolbar and the filter form.
- [ ] Add `SortSelect` and use it in the sort control.
- [ ] Add a spec for each new block.
- [ ] Run the toolbar spec and the filter form spec after each block.
- [ ] Run `npm run lint`, `npm test` and `npm run build`.
- [ ] Check by hand against `review-react-style`.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The existing specs pass without a change to their expectations.
  - They are the specs of the toolbar, the filter form, the sort control and the filter schema.
- [ ] The chips spec passes with the same expectations in its new place.
- [ ] Each of the six blocks has a component spec.
- [ ] A search for `@/domains` and `@/layouts` in `app/components/search/` finds nothing.
- [ ] No block has a default text.
- [ ] The old class names stay, including `catalog-discover-search`.
- [ ] The Filters panel still resets unapplied edits when it closes.
- [ ] `catalog-listing-discover-filter-chips.jsx` and its spec are deleted.
- [ ] Every exported block has JSDoc.
- [ ] No client-side price computation.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
grep -rn "@/domains\|@/layouts" app/components/search
```

The last command prints nothing.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
