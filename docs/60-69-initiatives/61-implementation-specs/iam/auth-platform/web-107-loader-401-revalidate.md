---
title: "Revalidate on hard 401 from client loaders (auth alignment)"
sidebar_label: Web · loader 401 revalidate
issue: "https://github.com/markmamba/red-cab-web/issues/107"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-88-remove-auth-hocs.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** On hard `401` after ky refresh fails in **`clientLoader`** paths, **`await` app `revalidate()`** via a shared helper (`handleLoaderError` / `runClientLoaderWithApiErrorFlags`); root revalidation bridge wired from `public-root` and `team-root`; tests per portal (tourist, provider, team); agent doc updates (H29/E7, `10-routes-api-forms.mdc`).
- **Does NOT ship:** SSR `loader` 401 handling; root `shouldRevalidate` `actionStatus` ([#108](https://github.com/markmamba/red-cab-web/issues/108)); marketplace guest 401 ([#109](https://github.com/markmamba/red-cab-web/issues/109)); `ky-client` navigate on refresh fail; policy tree changes; API changes.
- **Breaking change:** Yes — in-area hard `401` from `clientLoader` no longer primarily surfaces A1 boundary; recovery is `revalidate()` + policy login redirect (see design decision 5).

## Problem

[#88](https://github.com/markmamba/red-cab-web/issues/88) shipped **A1** root boundaries (session-expired UI, **Sign in again**, no auto-navigate) and left `handleLoaderError` **rethrowing 401** so loaders hit the boundary. [`changing-a-session.md`](/docs/90-99-engineering-meta/authentication/changing-a-session) requires direct browser callers to **`revalidate()`** on hard `401`. In-area `clientLoader` navigations often skip Node policy middleware ([#88](https://github.com/markmamba/red-cab-web/issues/88) spike); users cannot recover by clicking another portal link alone. `policy-middleware.md` documents the target: caller `revalidate()`, then the **next request runs policy**.

Evidence: `app/utils/loader-utils.js` (401 rethrow + #107 comment); **18** route modules export `clientLoader`. Seven provider loaders call `ProvidersProfileService.fetchCurrent()` with **no** helper at all; the other eleven call `fetchCurrent()` **before** any `try/catch`, so hard `401` on profile read still bypasses the helper today.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| [#107](https://github.com/markmamba/red-cab-web/issues/107) | GitHub issue | Primary requirement: loader hard `401` → `revalidate()`, not boundary-only recovery |
| [#77](https://github.com/markmamba/red-cab-web/issues/77) | Parent epic | Auth platform program |
| ADR-018 D7 | [ADR-018](/docs/30-49-domains/architecture-decisions/adr-018-web-authentication-enforcement-model) | Only **policy** navigates to login on **entry**; loader helper must not call `navigate` / `redirect` for logout |
| ADR-019 R3 | [ADR-019](/docs/30-49-domains/architecture-decisions/adr-019-session-technology-phase-1-and-2) | **Only `401`** (after refresh) means signed out; `403` / `5xx` are not logout |
| changing-a-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | Refused-response table: `401` → `revalidate()`, helper must not navigate |
| reading-the-session | [reading-the-session.md](/docs/90-99-engineering-meta/authentication/reading-the-session) | Root re-read on `revalidate()` |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | In-area race; **`revalidate()`** row → policy runs on Node |
| web-88 | [web-88-remove-auth-hocs.md](/docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-88-remove-auth-hocs) | A1 interim; defers loader `revalidate()` to #107 |
| frontend | [frontend.md](/docs/50-59-frontend/51-conventions/frontend) | `clientLoader` on private surfaces |

No `FR-IAM-*` row names loader revalidation; observable auth behaviour is covered by the authentication series above and issue #107.

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Scope: **`clientLoader` only** | Include SSR `loader` marketplace paths | Issue #107 title; separate blast radius |
| 2 | Hard **`401` only** | Treat `403` as logout | ADR-019 / changing-a-session |
| 3 | Trigger: **`requestRootRevalidation()`** bridge from virtual roots | Sentinel loader data + layout `useEffect` | No `revalidate` in `ClientLoaderFunctionArgs` |
| 4 | Helper split: sync **`handleLoaderError`** (SSR) + async **`handleClientLoaderError`** / **`runClientLoaderWithApiErrorFlags`**; provider routes use **`runProviderClientLoaderWithApiErrorFlags`** so `fetchCurrent()` **403/5xx** still rethrow | Make `handleLoaderError` async for all callers | Keeps SSR loaders unchanged; `fetchCurrent()` outage ≠ signed out |
| 5 | Post-401 UX: **`await revalidate()` → policy login redirect** | Boundary-only; header-only stay | PKM Q2=A; `policy-middleware.md` `revalidate()` row. **Normative split:** the helper **never** calls `navigate` / `redirect`; login redirect may only come from **policy middleware** on the revalidation `.data` request (reconciles changing-a-session “do not navigate” with Q2=A) |
| 6 | **`fetchCurrent()` coverage** | Per-call `try/catch` only around list APIs | **Entire** `clientLoader` body must run inside `runClientLoaderWithApiErrorFlags` (or equivalent top-level `try/catch` that `await`s async `handleLoaderError`) so `401` on profile read is handled |
| 7 | Provider sweep: **all 18 `clientLoader` routes** | Only routes that already import the helper | PKM Q3=A |
| 8 | Corporate | **N/A** until first corporate `clientLoader` | No module today |
| 9 | #108 | Out of scope; ship #107 first | Complementary `shouldRevalidate` / `actionStatus` |
| 10 | **A1 boundary retention** | Remove boundary for all `401` | Loader-path `401` handled by helper → no primary A1. **Component / fetcher** `401` outside the helper may still hit A1 until #108 |
| 11 | **Concurrent hard `401`** | Fire one `revalidate()` per error | `requestRootRevalidation()` **dedupes** to a single in-flight promise while revalidation runs |

## Web contract

### Loader helper behaviour

| Error | `clientLoader` behaviour (after this spec) |
| --- | --- |
| `ApiError` `401` (post-refresh) | `await handleHard401InClientLoader()` (internal: deduped `await requestRootRevalidation()`). **Do not rethrow** for A1 as primary path. **Do not** call `navigate` / `redirect` in the helper. User-visible outcome: **policy login redirect** (`replace`) when revalidation runs policy on the current private URL |
| `ApiError` `403` | Unchanged — return fallback / `{ loadError: true, errorStatus: 403 }` via `runClientLoaderWithApiErrorFlags` |
| `ApiError` `5xx` | Unchanged — **rethrow** for provider `fetchCurrent()`; other routes keep prior fallback/rethrow per route (not logout) |
| non-`ApiError` | Rethrow |

### Post-401 return semantics

| Helper | On hard `401` |
| --- | --- |
| `handleLoaderError` | **Sync**, SSR-only. Still **rethrows** `401` for error boundaries |
| `handleClientLoaderError` | **Async**. After `await` hard-401 handling, **return `fallbackData`**. If the bridge is unavailable (hydration race), **rethrow** the original `401` so A1 boundary remains the fallback |
| `runClientLoaderWithApiErrorFlags` | On `401`, **do not** return `{ loadError: true, errorStatus: 401 }`. `await` hard-401 handling, then return `{ ...fallbackData, loadError: false, errorStatus: null }` **unless** policy `replace()` aborts the loader |
| `runProviderClientLoaderWithApiErrorFlags` | `fetchCurrent()` outside the inner wrapper: **only `401`** triggers revalidation; **403/5xx rethrow**. Onboarding `redirect()` unchanged. Inner `loadFn` receives `providerProfile` |
| Tourist in-page `TouristErrorState` | **Not** used for hard `401`; only `403` / recoverable errors keep `loadError` UI |

SSR `loader` callers (`home-page`, marketplace catalog) **keep** sync `handleLoaderError` rethrow on `401` until a future spec (out of scope).

### Revalidation bridge

| Topic | Contract |
| --- | --- |
| Mount points | `app/roots/public-root.jsx` (tourist + provider + marketplace tree) and `app/roots/team-root.jsx` (team tree). Each tree registers **its own** `useRevalidator().revalidate` |
| `requestRootRevalidation()` | Module-level API used from `loader-utils`; **awaits** registered revalidate |
| Before registration | **Await** registration up to ~2s (macrotask-safe, not microtask-only). On timeout, reject with `RootRevalidationUnavailableError`; loader helpers **rethrow** the original `401` |
| Deduping | Second concurrent hard `401` while revalidation is in flight **shares** the same promise |
| Bridge-driven revalidation | While `requestRootRevalidation()` runs `revalidate()`, set a module flag so root **`shouldRevalidate`** returns `defaultShouldRevalidate` even when `currentUrl` ≠ `nextUrl` (in-area click + hard `401` during pending navigation) |

### `public-root` `shouldRevalidate`

Shared **`shouldRevalidateWithUrlChangeGuard`**: block revalidation on URL change **except** when the bridge flag is set. Same-URL explicit `revalidate()` must still re-run root loader and policy ([#108](https://github.com/markmamba/red-cab-web/issues/108) `actionStatus` remains out of scope). Tests cover same-URL **and** bridge-driven URL-change cases.

### Surfaces

| Surface | `clientLoader` routes | Test requirement |
| --- | --- | --- |
| Tourist | 3 routes (see sweep table) | ≥1 automated test |
| Provider | 12 routes under `app/routes/provider/` | ≥1 automated test |
| Team | 3 routes under `app/routes/team/` | ≥1 automated test |
| Corporate | none | N/A in AC |

### `clientLoader` sweep checklist (18 routes)

Every row must wrap the **full** loader body (including `fetchCurrent()` and onboarding `redirect` throws that are **not** API errors) in `runClientLoaderWithApiErrorFlags` or documented equivalent.

| Route module | Helper today | Gap for #107 |
| --- | --- | --- |
| `tourist/booking-list-page.jsx` | `runClientLoaderWithApiErrorFlags` | Ensure 401 path uses new contract (no reject / no `loadError` on 401) |
| `tourist/booking-detail-page.jsx` | `runClientLoaderWithApiErrorFlags` | Same |
| `tourist/tourist-checkout-page.jsx` | `handleLoaderError` in inner `catch` only | Wrap **entire** loader |
| `provider/provider-dashboard-page.jsx` | none | Wrap **entire** loader |
| `provider/providers-profile-registration-create-page.jsx` | none | Wrap **entire** loader |
| `provider/providers-profile-registration-edit-page.jsx` | none | Wrap **entire** loader |
| `provider/providers-profile-registration-documents-page.jsx` | none | Wrap **entire** loader |
| `provider/provider-catalog-listings-create-page.jsx` | none | Wrap **entire** loader |
| `provider/provider-catalog-listings-edit-page.jsx` | none | Wrap **entire** loader |
| `provider/provider-catalog-assets-create-page.jsx` | none | Wrap **entire** loader |
| `provider/provider-bookings-list-page.jsx` | `handleLoaderError` after `fetchCurrent` | Wrap **entire** loader |
| `provider/provider-bookings-detail-page.jsx` | `handleLoaderError` after `fetchCurrent` | Wrap **entire** loader |
| `provider/provider-catalog-listings-list-page.jsx` | `handleLoaderError` after `fetchCurrent` | Wrap **entire** loader |
| `provider/provider-catalog-assets-list-page.jsx` | `handleLoaderError` after `fetchCurrent` | Wrap **entire** loader |
| `provider/provider-catalog-assets-edit-page.jsx` | `handleLoaderError` after `fetchCurrent` | Wrap **entire** loader |
| `team/.../team-commission-rates-page.jsx` | `handleLoaderError` in `catch` | Wrap **entire** loader if `fetchCurrent`-like calls added later; wrap API `catch` path + any top-level awaits |
| `team/.../team-providers-profile-list-page.jsx` | `handleLoaderError` in `catch` | Wrap **entire** loader |
| `team/.../team-providers-profile-detail-page.jsx` | `handleLoaderError` in `catch` | Wrap **entire** loader |

Onboarding **`redirect()`** for missing profile remains a **success-path** throw inside the wrapped `loadFn`; only `ApiError` `401` triggers revalidation.

### Files to create or modify (Web)

| File | Change |
| --- | --- |
| `app/utils/loader-utils.js` | `handleClientLoaderError`, `runClientLoaderWithApiErrorFlags`, `runProviderClientLoaderWithApiErrorFlags`; deduped revalidation |
| `app/auth/root-should-revalidate.js` | URL-change guard + bridge flag |
| `app/utils/loader-utils.spec.js` | Unit matrix + bridge mock |
| `app/auth/root-revalidation-bridge.jsx` (name TBD) | Register revalidator |
| `app/roots/public-root.jsx`, `app/roots/team-root.jsx` | Mount bridge |
| Tourist / provider / team `clientLoader` pages (sweep table) | Full-loader wrapper |
| `app/roots/*-error-boundary.spec.jsx` | No change required for loader 401 (documented); boundary specs still prove **Sign in again** for non-loader `401` |
| `app/auth/auth-session-redirect-integration.spec.js` (or new integration spec) | Prove `revalidate()` → policy row |
| `.ai/skills/review-react-style/rules/architecture-frontend.md`, `error-messages.md` | H29, E7 |
| `.cursor/rules/10-routes-api-forms.mdc` | Mid-session 401: revalidate + policy, boundary for non-loader paths |

### Docs (with or stacked with web PR)

| File | Change |
| --- | --- |
| `changing-a-session.md` | Remove interim “boundary until #107” when behaviour ships |
| This spec | `status: approved` before codegen (done when review record filled) |

## Out of scope

- [#108](https://github.com/markmamba/red-cab-web/issues/108), [#109](https://github.com/markmamba/red-cab-web/issues/109)
- SSR `loader` + `handleLoaderError` on marketplace / `home-page`
- Policy module / `routes.js` edits
- `ky-client` navigate on refresh fail

## Tasks

### Docs

1. PKM plan MCQs Q1–Q3 resolved (A/A/A).
2. `review-implementation-spec` on this file — see Review record.
3. Commit `redcab-docs` before `red-cab-web` codegen.

### Web

1. Revalidation bridge + `requestRootRevalidation()` (dedupe).
2. Evolve `loader-utils` per post-401 return semantics.
3. Sweep all 18 `clientLoader` routes per checklist.
4. Tests + manual matrix (outage ≠ signed out).
5. Amend agent docs + `10-routes-api-forms.mdc` in same PR.

## Acceptance criteria

- [ ] Hard `401` in any of the **18** `clientLoader` routes `await`s deduped root revalidation; helper does not `navigate` / `redirect`.
- [ ] `403` and `5xx` loader semantics unchanged; PR test plan states **transient outage ≠ signed out**.
- [ ] All sweep-table routes use full-loader wrapper.
- [ ] Unit tests in `loader-utils.spec.js`; ≥1 test per portal (tourist, provider, team).
- [ ] **Policy `revalidate()` row:** automated extension of `auth-session-redirect-integration.spec.js` **or** documented manual network proof attached to PR ( #83 gap).
- [ ] Root boundary specs updated; boundary still works for **non-loader** hard `401`.
- [ ] `10-routes-api-forms.mdc`, H29, E7 updated in web PR.
- [ ] PR links this spec + issue #107.

## Test plan

- Unit: `loader-utils` — 401 awaits bridge; 403 fallback/flags; 5xx; non-`ApiError` rethrow; concurrent 401 dedupe.
- Per portal: tourist, provider, team — hard 401 does not use boundary-only recovery (mock ky / API).
- Policy: `revalidate()` on a private URL triggers policy `.data` request with login `replace` (integration spec preferred).
- `public-root` `shouldRevalidate`: same-URL explicit `revalidate()` still refreshes session/policy (regression).
- Manual: in-area session expiry on three surfaces; **503** on session read → `GeneralError`, not session-expired.
- Regression: **Sign in again** on boundary when `401` thrown outside loader helper.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test -- app/utils/loader-utils.spec.js app/roots app/auth/auth-session-redirect-integration.spec.js app/routes/tourist/booking-list-page.spec.jsx
```

Add route-level specs created in the PR to the `npm run test --` list in the PR description.

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-03 | PKM plan + codebase trace | `review-implementation-spec` | Must-fix and should-fix folded; `status: approved` |

## Related

- Parent: [#77](https://github.com/markmamba/red-cab-web/issues/77)
- Follow-up: [#108](https://github.com/markmamba/red-cab-web/issues/108)
