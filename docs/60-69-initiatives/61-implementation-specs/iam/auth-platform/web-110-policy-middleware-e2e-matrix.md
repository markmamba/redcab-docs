---
title: "Policy middleware browser matrix (Playwright E2E)"
sidebar_label: Web · policy E2E matrix
issue: "https://github.com/markmamba/red-cab-web/issues/110"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-107-loader-401-revalidate.md"
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-108-root-should-revalidate-auth-failures.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** `@playwright/test` harness under `e2e/`; gap browser rows on tourist `/account/bookings` (in-app enter after session loss, `clientLoader` hard `401` → `revalidate()` → policy, action `401` → root revalidation → policy); dev-only action fixture route when `VITE_E2E_AUTH_FIXTURES=true`; PR CI job with API + Postgres + Redis + seeded `dev:accounts:seed` tourist.
- **Does NOT ship:** Full seven-row duplication of curl/Vitest rows 1–2; team-root matrix; R-4 rotated-cookie `.data` proof; API code changes.
- **Breaking change:** No.

## Problem

[policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) documents rows 3, 5–7 as **not exercised** in browser ([#83](https://github.com/markmamba/red-cab-web/issues/83)). Vitest covers middleware chains and `shouldRevalidate` ([#107](https://github.com/markmamba/red-cab-web/issues/107), [#108](https://github.com/markmamba/red-cab-web/issues/108)) but not real navigation, cookies, and `.data` requests.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| policy-middleware | [policy-middleware.md](/docs/90-99-engineering-meta/authentication/policy-middleware) | Seven-row matrix + hand test |
| changing-a-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | `revalidate()` on hard `401`; action `401`/`403` |
| web-107 | [web-107-loader-401-revalidate.md](web-107-loader-401-revalidate.md) | Loader hard `401` bridge |
| web-108 | [web-108-root-should-revalidate-auth-failures.md](web-108-root-should-revalidate-auth-failures.md) | `actionStatus` 401/403 |
| implementation-roadmap | [implementation-roadmap.md](/docs/90-99-engineering-meta/authentication/implementation-roadmap) | Phase 4 browser follow-up |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Runner: **Playwright** | Vitest browser only | Multi-tab session loss; brief Gate 1 Q1=A |
| 2 | Scope: **gap rows** on tourist `/account/bookings` | Full seven-row suite | Q2=A; avoid curl/Vitest duplication |
| 3 | Session: **full stack** web + API | ky intercept in Playwright | Q3=A; real cookies |
| 4 | CI: **dedicated job** on PR | Docs-only local command | Q4=A |
| 5 | Credentials | `Dev::TestAccounts::TOURIST_COMPLETE_EMAIL` / `DEV_PASSWORD` | `rails dev:accounts:seed` in development |
| 6 | Action row fixture | Reuse `/logout` only | Bookings has no server `action`; add `/account/e2e/policy-action-fixture` with `clientAction` returning `401`, registered only when `VITE_E2E_AUTH_FIXTURES=true` |
| 7 | Action row assertion | Clear cookies, submit fixture `401`, expect policy login | `actionStatus` forces revalidation; policy redirect requires null session read |

## Web contract

### npm scripts

| Script | Command |
| --- | --- |
| `test:e2e` | `playwright test` |
| `ci:e2e` | `playwright test` (CI sets env; install browsers in workflow) |

### Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_REDCAB_URL` | API origin (default `http://localhost:3000`) |
| `VITE_E2E_AUTH_FIXTURES` | `true` enables fixture route at build/dev time |
| `PLAYWRIGHT_BASE_URL` | Web origin (default `http://localhost:5173`) |
| `PLAYWRIGHT_SKIP_WEBSERVER` | Set in CI when dev server started explicitly |

### E2E scenarios (gap rows)

| Row | Steps | Pass |
| --- | --- | --- |
| In-app enter (signed in) | `/districts` → click **Bookings** | `.data` request `_routes` includes `tourist-required-policy`; URL `/account/bookings` |
| Session loss + enter | Tab A signed in on `/districts`; Tab B sign out; Tab A Districts → Bookings | `/login?redirect_to=%2Faccount%2Fbookings` |
| `revalidate()` | On `/account/bookings`, clear session cookies, trigger `clientLoader` (pagination control) | Login redirect with `redirect_to` bookings |
| Action `401` | Fixture page, clear cookies, POST fixture action | Login redirect after revalidation |

### Files to create or modify (Web)

| Path | Change |
| --- | --- |
| `package.json` / `package-lock.json` | `@playwright/test` |
| `playwright.config.js` | base URL, webServer, trace on failure |
| `e2e/helpers/auth.js` | Dev tourist login |
| `e2e/policy-middleware-matrix.spec.js` | Matrix tests |
| `app/routes/tourist/e2e-policy-action-fixture-page.jsx` | Fixture `clientAction` 401 |
| `app/tourist.routes.js` | Conditional fixture route |
| `.github/workflows/ci.yml` | `e2e` job |
| `policy-middleware.md` (corpus) | Point hand test to `npm run test:e2e` |
| `.ai/instructions.md` | E2E run instructions |

## Out of scope

- R-4 expired access token refresh on `.data`
- Team-root smoke
- Leave-and-return row (follow-up)

## Acceptance criteria

- [ ] Approved spec merged before web PR
- [ ] `npm run ci:test` unchanged green
- [ ] `npm run test:e2e` passes locally with API seeded + running
- [ ] CI `e2e` job passes on PR (requires `RAILS_MASTER_KEY` secret for API checkout)

## Verification

```bash
# API (development)
cd red-cab-api && bundle exec rails db:prepare dev:accounts:seed
bundle exec rails server -p 3000

# Web
cd red-cab-web
VITE_E2E_AUTH_FIXTURES=true npm run test:e2e
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-04 | Mark | Brief Gate 1 | Approved via brief MCQs |
