---
title: "Move domain code out of app/components"
sidebar_label: Web · Components cleanup
issue: "https://github.com/markmamba/red-cab-web/issues/160"
repos:
  - red-cab-web
status: implemented
phase: 2
context: PLATFORM
related:
  - "https://github.com/markmamba/red-cab-web/issues/153"
---

## TL;DR

- Moves domain code out of `app/components/` into its domain folder.
- Moves tourist, team and auth page chrome from `app/components/` to `app/layouts/`.
- Keeps `app/components/brand/` and the shared components where they are.
- Adds an ESLint rule: a file in `app/components/` cannot import from `app/domains/` or `app/layouts/`.
- Does NOT change behavior, text or styles. The pages look the same.
- Breaking change: No for users. Yes for import paths inside the repo.

## Problem

`AGENTS.md` says domain code stays in its domain. It lists the content of `app/components/`: `forms/`, `tables/`, `navigation/`, `error-display/` and `breadcrumbs`. An audit found more files there.

1. `components/tourist/tourist-empty-state.jsx` has a bookings variant and a listing variant. It imports constants from `domains/bookings-booking` and `domains/catalog-listing`.
2. `components/auth/auth-role-content.js` holds the sign-in text for each account role. It imports `ACCOUNT_ROLE` from `domains/identities-account`.
3. `components/auth/` also has page chrome for the provider and corporate portals.
4. `components/tourist/` and `components/team/` have page chrome for their surfaces.

Evidence:

- `grep` for imports from `@/domains` inside `app/components/` finds `tourist-empty-state.jsx` and `auth-role-content.js`.
- The owner found the problem while reviewing [red-cab-web#153](https://github.com/markmamba/red-cab-web/issues/153).

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| Web | `red-cab-web/AGENTS.md` | Directory Structure. Anti-Patterns 8, 9 and 12. |
| Web | `red-cab-web/app/domains/AGENTS.md` | File names in a domain folder. |
| Issue | [red-cab-web#160](https://github.com/markmamba/red-cab-web/issues/160) | Audit and open decisions. |

## Design decisions

Rulings marked "Owner ruling" were given by the owner on 2026-10-24.

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **`tourist-empty-state.jsx` is deleted. Its two uses become two domain views: `domains/bookings-booking/bookings-booking-empty-state-view.jsx` and `domains/catalog-listing/catalog-listing-empty-state-view.jsx`. Each view holds its own copy and links and renders a Bootstrap `Alert` with the same classes as today.** | Keep one component with variants | Owner ruling: domain components stay in their domain. Only these two domains use it, so no shared version is needed. |
| 2 | **The sign-in text per role moves to `domains/identities-account/identities-account-constant.js` (as `IDENTITIES_ACCOUNT_AUTH_ROLE_CONTENT`). The lookup function moves to `IdentitiesAccountService.getAuthRoleContent`.** | A new file in the domain | Owner ruling. The text depends on `ACCOUNT_ROLE`. The domain already has a constant file and a service file. |
| 3 | **`auth-role-panel.jsx` moves to `app/layouts/auth/`.** | Keep it in the domain | Owner ruling. It is page chrome, and `layouts/auth/public-auth-layout.jsx` is its only user. |
| 4 | **`public-auth-light-chrome.jsx` moves to `app/layouts/auth/`, because the provider and the corporate layouts both use it. Its config is split: the provider part goes to `layouts/provider/provider-public-auth-chrome-config.js` and the corporate part goes to `layouts/corporate/corporate-public-auth-chrome-config.js`.** | One config file in `layouts/auth/` | Owner ruling: next to the layouts that use them. Each layout then owns its own portal name and paths. |
| 5 | **`tourist-error-state.jsx`, `tourist-shell-pending.jsx` and `tourist-auth-content.jsx` (with its spec) move to `app/layouts/tourist/`. `team-blob-background.jsx` moves to `app/layouts/team/`.** | Leave them in `components/` | Owner ruling: tourist and team pieces move to layouts. **`TouristErrorState` is a state that pages show inside their body. It is not chrome. It moves with the tourist pieces because of this ruling. Please review.** |
| 6 | **`app/components/brand/` stays.** | Move it to layouts | Owner ruling. Many surfaces use the logo and the portal chrome. |
| 7 | **The folders `components/auth/`, `components/tourist/` and `components/team/` are deleted when they are empty.** | Keep empty folders | Git does not keep empty folders. |
| 8 | **ESLint gets a rule for `app/components/**`: no import from `@/domains/*` and no import from `@/layouts/*`.** | Rely on review | The rule stops the same problem from coming back. Today only two files break it, and this item moves both. **Added point, please review.** |
| 9 | **Specs move with their files. The split empty-state spec becomes one spec for each new view.** | Delete the old spec | The copy and the links stay covered. |
| 10 | **The skill templates and `AGENTS.md` that name the moved files are updated.** | Leave them | They would point at files that do not exist. |

## Move table

| From | To | Users to update |
| --- | --- | --- |
| `components/tourist/tourist-empty-state.jsx` (bookings part) | `domains/bookings-booking/bookings-booking-empty-state-view.jsx` | `routes/tourist/booking-list-page.jsx` |
| `components/tourist/tourist-empty-state.jsx` (listing part) | `domains/catalog-listing/catalog-listing-empty-state-view.jsx` | `routes/marketplace/catalog-listing/marketplace-catalog-listing-list-page.jsx` |
| `components/tourist/tourist-empty-state.spec.js` | One spec next to each new view | |
| `components/auth/auth-role-content.js` | `domains/identities-account/identities-account-constant.js` and `identities-account-service.js` | `components/auth/auth-role-panel.jsx` (moved) |
| `components/auth/auth-role-panel.jsx` | `layouts/auth/auth-role-panel.jsx` | `layouts/auth/public-auth-layout.jsx` |
| `components/auth/public-auth-light-chrome.jsx` | `layouts/auth/public-auth-light-chrome.jsx` | `layouts/provider/provider-public-auth-layout.jsx`, `layouts/corporate/corporate-public-auth-layout.jsx` |
| `components/auth/public-auth-light-chrome-config.js` (provider) | `layouts/provider/provider-public-auth-chrome-config.js` | `layouts/provider/provider-public-auth-layout.jsx` |
| `components/auth/public-auth-light-chrome-config.js` (corporate) | `layouts/corporate/corporate-public-auth-chrome-config.js` | `layouts/corporate/corporate-public-auth-layout.jsx` |
| `components/tourist/tourist-error-state.jsx` | `layouts/tourist/tourist-error-state.jsx` | The pages that import it (about 5) |
| `components/tourist/tourist-shell-pending.jsx` | `layouts/tourist/tourist-shell-pending.jsx` | The pages that import it (about 6) |
| `components/tourist/tourist-auth-content.jsx` and its spec | `layouts/tourist/tourist-auth-content.jsx` and its spec | The sign-up, forgot password and verify email pages (about 7 users) |
| `components/team/team-blob-background.jsx` | `layouts/team/team-blob-background.jsx` | `layouts/auth/public-auth-layout.jsx`, `layouts/team/team-login-layout.jsx`, `layouts/team/team-layout.jsx` |

The user counts come from a search of the current code. Use a search when coding to find all of them.

## Web contract

No route, loader or API module changes.

### Files to create or modify (Web)

- The files in the move table. Use `git mv` for whole-file moves, so history stays.
- `eslint.config.js`: the new rule (decision 8).
- `AGENTS.md`: the Directory Structure line for `components/`.
- `.claude/skills/creating-route-pages/templates/public-detail-page.md`, `public-list-page.md` and `auth-page.md`: the import paths.

Skills to use when coding: `creating-domain-views`, then `review-react-style`.

## Data / domain touchpoints

- Bounded context: none. This is a code move.
- No data, no API and no price change.

## Out of scope

- Any change to behavior, text, styles or classes.
- `components/brand/`, `forms/`, `tables/`, `navigation/`, `error-display/` and `breadcrumbs`.
- A new shared empty state.

## Tasks

### Web

- [ ] Move the files in the move table, with `git mv` where the whole file moves.
- [ ] Create the two empty-state views and split the spec.
- [ ] Move the role text into the identities-account constant and service, with tests.
- [ ] Split the portal chrome config.
- [ ] Update every import.
- [ ] Add the ESLint rule for `app/components/**`.
- [ ] Update `AGENTS.md` and the three skill templates.
- [ ] Run `review-react-style`, `npm run lint`, `npm test` and `npm run build`.

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] No file in `app/components/` imports from `@/domains` or from `@/layouts`. The ESLint rule enforces it.
- [ ] `app/components/auth/`, `app/components/tourist/` and `app/components/team/` do not exist.
- [ ] The booking list page and the listing page show the same empty-state text and links as before.
- [ ] The sign-in pages show the same text for each role.
- [ ] The provider and corporate sign-in pages show the same chrome as before.
- [ ] Each moved file keeps its git history.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.
- [ ] Text follows ASD-STE100 Tier A.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
npm run build
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-10-24 | principal developer | Approved in chat. The author confirmed the moves in decisions 1 to 7 and the move table, and the added points (the `TouristErrorState` move and the ESLint rule in decision 8). The files in the move table were checked against `main` after red-cab-web#161 merged. |
