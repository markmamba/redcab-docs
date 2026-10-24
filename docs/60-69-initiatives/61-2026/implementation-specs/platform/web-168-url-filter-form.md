---
title: "Add useUrlFilterForm and pilot it on the team provider profiles list"
sidebar_label: Web · URL filter form hook
issue: "https://github.com/markmamba/red-cab-web/issues/168"
repos:
  - red-cab-web
status: approved
phase: 2
context: PLATFORM
related:
  - "https://github.com/markmamba/red-cab-web/issues/164"
  - "https://github.com/markmamba/red-cab-web/issues/166"
---

## TL;DR

- Adds the hook `app/hooks/use-url-filter-form.js`.
  - It fills a filter form from the URL search params.
  - It resets the form when the URL changes.
- Uses the hook on one form first: the team provider profiles filter form.
- Writes the four filter values once, in the pilot domain.
- Does NOT change the look or the behavior of the pilot page.
- Does NOT move the other six filter forms.
  - We decide that after the pilot.
- Breaking change: No.

## Problem

Every filter form repeats the same code.

1. `app/domains/team-providers-profile/team-providers-profile-filter-form.jsx` writes the four default values twice.
   - Once in `useForm`, and once in the reset effect.
2. The reset effect needs an `eslint-disable` comment for its dependency list.
3. Six more forms have the same pattern.

Evidence:

- The files are `reviews-provider-inbox-filter-form.jsx`, `bookings-booking-tourist-filter-form.jsx`, `bookings-booking-filter-form.jsx`, `team-reviews-review-filter-form.jsx`, `catalog-provider-asset-filter-form.jsx` and `catalog-listing-filter-form.jsx`.
- A new filter field needs two edits in each file.
  - A missed edit makes Reset and the first render disagree.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Web | `red-cab-web/AGENTS.md` | Code style and JSDoc rule. |
| Web | `red-cab-web/app/domains/AGENTS.md` | Forms and schemas stay in the domain. Keep the `useForm` object whole (review rule H6). |
| Web | `red-cab-web/app/routes/AGENTS.md` | URL params are the source of truth for list state. |
| Spec | [web-166 · Search bar blocks](./web-166-search-blocks) | The shared blocks. This spec adds a hook, not a block. |
| Issue | [red-cab-web#168](https://github.com/markmamba/red-cab-web/issues/168) | Problem and direction. |

## Design decisions

Rulings marked "Owner ruling" were given by the owner on 2026-10-24.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **The pilot changes code only. The page looks and works the same.** | Also add the search bar blocks. | Owner ruling. We judge the hook on its own before we change a team screen. |
| 2 | **The pattern becomes a hook: `app/hooks/use-url-filter-form.js`.** | A local function in the pilot form. | Owner ruling. Six more forms can use the same hook. |
| 3 | **Signature: `useUrlFilterForm({ searchParams, readValues, resolver, mode })`. `resolver` is optional. `mode` is optional and its default is `'onChange'`.** | No options | The pilot form uses `mode: 'onChange'` and no resolver. The listing forms use a resolver. **Added point, please review.** |
| 4 | **The hook returns the whole `useForm` object. It never returns a part of it.** | Return only the pieces | Review rule H6: the reader must see where `handleSubmit` comes from. |
| 5 | **`readValues` is a function that does not change between renders. The pilot domain defines it once at module level.** | An inline function in the component | The reset effect lists it as a dependency. A new function on each render would reset the form on each render. |
| 6 | **The four filter values are read in one function: `TeamProvidersProfileService.readFilterValues(searchParams)`. The form passes it to the hook.** | A constant object | The service object already exists in `team-providers-profile-service.js`. **Added point, please review.** |
| 7 | **The default of `status` stays `PROVIDER_STATUS.PENDING`, and it is set in `readFilterValues` only.** | Keep it in the form | The default is written once. The loader and the page keep their own defaults. They are out of scope. |
| 8 | **The reset effect lives in the hook. If the lint rule for hook dependencies needs a comment, the comment stays in the hook. The pilot form has none.** | No comment anywhere | The comment is a lint need of the hook, not of each form. |
| 9 | **The PR text says if the new code reads better than the old code, with the old and new line counts.** | No comparison | The plan says we move the six other forms only if the pilot reads better. |
| 10 | **The discover filter form of the listing pages does not use the hook in this spec.** | Use it there too | It has a schema, a scope change and an extra reset dependency. It needs its own look. |

## Web contract

No route, loader or API call changes.

### The hook

```js
useUrlFilterForm({ searchParams, readValues, resolver, mode })
// returns the object that useForm returns
```

The hook does this.

- It calls `useForm` with `defaultValues: readValues(searchParams)`, `resolver` and `mode`.
- It resets the form with `readValues(searchParams)` when `searchParams` changes.
- It returns the `useForm` object whole.

### Files to create or modify (Web)

- `app/hooks/use-url-filter-form.js`: new, with JSDoc.
- `app/hooks/use-url-filter-form.spec.jsx`: new.
- `app/domains/team-providers-profile/team-providers-profile-service.js`: add `readFilterValues(searchParams)` with JSDoc.
  - It returns `business_name`, `status`, `provider_type` and `submitted_for_review_on`.
  - A missing value gives `''`.
  - A missing `status` gives `PROVIDER_STATUS.PENDING`.
- `app/domains/team-providers-profile/team-providers-profile-service.spec.js`: new or extended, for `readFilterValues`.
- `app/domains/team-providers-profile/team-providers-profile-filter-form.jsx`: call the hook.
  - Delete the two copies of the values and the reset effect.
- `app/domains/team-providers-profile/team-providers-profile-filter-form.spec.jsx`: new.

## Data / domain touchpoints

- Bounded context: PLATFORM for the hook.
- The pilot files are in the team providers domain.
- Transaction boundaries: none.
- Snapshots: none.
- The hook imports nothing from `@/domains` or `@/layouts`.

## Out of scope

- The other six filter forms.
- The discover filter form of the listing pages.
- The search bar blocks in `app/components/search/`, and a chips or keyword field on the pilot page.
- A change to the loader, the Search and Reset handlers or the default status of the pilot page.

## Tasks

### Web

- [ ] Add `use-url-filter-form.js` and its spec.
- [ ] Add `readFilterValues` to the pilot service, and its spec.
- [ ] Change the pilot form to use the hook.
- [ ] Add a spec for the pilot form.
- [ ] Run `npm run lint`, `npm test` and `npm run build`.
- [ ] Check by hand against `review-react-style`.
- [ ] Write the comparison of old and new code in the PR text.

### Docs

- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] The pilot form shows the same fields, labels and buttons as before.
- [ ] The first render fills the fields from the URL.
- [ ] A change of the URL, such as Back or Reset, fills the fields again.
- [ ] The `status` field shows `Pending` when the URL has no `status`.
- [ ] The pilot form has no `eslint-disable` comment, and each default is written once.
- [ ] The hook returns the whole `useForm` object.
- [ ] The hook spec covers the first values, the reset on a URL change, the optional `resolver` and the default `mode`.
- [ ] A search for `@/domains` and `@/layouts` in `use-url-filter-form.js` finds nothing.
- [ ] The hook and `readFilterValues` have JSDoc.
- [ ] No client-side price computation.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
grep -n "@/domains\|@/layouts" app/hooks/use-url-filter-form.js
```

The last command prints nothing.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
