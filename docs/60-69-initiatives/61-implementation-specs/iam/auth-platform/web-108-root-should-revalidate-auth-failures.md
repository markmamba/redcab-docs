---
title: "Root shouldRevalidate on action 401/403"
sidebar_label: Web · root action auth failures
issue: "https://github.com/markmamba/red-cab-web/issues/108"
repos:
  - red-cab-web
status: approved
phase: 4
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/iam/auth-platform/web-107-loader-401-revalidate.md"
parent_epic: "https://github.com/markmamba/red-cab-web/issues/77"
---

## TL;DR

- **Ships:** Extend shared `shouldRevalidateWithUrlChangeGuard` so `actionStatus` **401** or **403** forces root revalidation (with existing non-`GET` `formMethod` behavior); preserve #107 bridge order; unit + R-5 integration regression; normative snippet fix in [reading-the-session.md](/docs/90-99-engineering-meta/authentication/reading-the-session).
- **Does NOT ship:** Loader hard-401 helper (#107); marketplace guest 401 (#109); `ky-client` navigate on refresh fail; policy `shouldRevalidate`; API changes.
- **Breaking change:** No — narrows stale header chrome after failed login/actions without changing logout semantics.

## Problem

[#88](https://github.com/markmamba/red-cab-web/issues/88) deferred root `shouldRevalidate` for `actionStatus` to [#108](https://github.com/markmamba/red-cab-web/issues/108). [#107](https://github.com/markmamba/red-cab-web/issues/107) shipped the revalidation bridge for hard `clientLoader` `401` but left `actionStatus` out of the guard. [reading-the-session.md](/docs/90-99-engineering-meta/authentication/reading-the-session) requires root re-read when an action returns `401` or `403` so session chrome can refresh without a full document navigation.

Evidence: `app/auth/root-should-revalidate.js` (no `actionStatus` today); `public-root.jsx` / `team-root.jsx` delegate to the shared guard.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| [#108](https://github.com/markmamba/red-cab-web/issues/108) | GitHub issue | Primary requirement |
| reading-the-session | [reading-the-session.md](/docs/90-99-engineering-meta/authentication/reading-the-session) | Target `shouldRevalidate` including `actionStatus` |
| changing-a-session | [changing-a-session.md](/docs/90-99-engineering-meta/authentication/changing-a-session) | `revalidate()` on hard `401`; helper must not navigate |
| ADR-019 R3 | [ADR-019](/docs/30-49-domains/architecture-decisions/adr-019-session-technology-phase-1-and-2) | Only **session-read `401`** means signed out; **action `403`** is not loader logout |
| web-107 | [web-107-loader-401-revalidate.md](web-107-loader-401-revalidate.md) | Bridge must remain; `actionStatus` was explicitly deferred here |
| web-88 | [web-88-remove-auth-hocs.md](web-88-remove-auth-hocs.md) | Single root `shouldRevalidate`; no policy copies |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Evaluation order: `(mutation \|\| authFailed) → bridge → URL href change → defaultShouldRevalidate` | Auth failed after URL guard only | Matches reading-the-session; auth-failed overrides URL-change block |
| 2 | `actionStatus` values **401** and **403** only | All 4xx | Normative table in reading-the-session |
| 3 | Implementation in **`root-should-revalidate.js` only** | Duplicate in each root | Both roots already delegate |
| 4 | **Action `403` ≠ session-read `403`** | Treat action 403 as logout | ADR-019; QA must not confuse with loader/policy logout |
| 5 | Tests in **`root-should-revalidate.spec.js`** + one **R-5** row on `public-root` export | Duplicate `team-root` tests | Shared guard = single unit surface |

## Web contract

### `shouldRevalidateWithUrlChangeGuard`

| Input | Result |
| --- | --- |
| `formMethod` not `GET` | `true` |
| `actionStatus` `401` or `403` | `true` (even when URL changes) |
| `isBridgeDrivenRevalidation()` | `defaultShouldRevalidate` |
| `currentUrl.href !== nextUrl.href` | `false` |
| Otherwise | `defaultShouldRevalidate` |

Function signature adds optional `actionStatus` (React Router passes it on root `shouldRevalidate`).

### Files to create or modify (Web)

| Path | Change |
| --- | --- |
| `app/auth/root-should-revalidate.js` | `actionStatus` + order above |
| `app/auth/root-should-revalidate.spec.js` | 401/403 same-URL; 401/403 URL-change; non-`GET` mutation |
| `app/auth/auth-session-redirect-integration.spec.js` | R-5: `actionStatus` 401 forces revalidation |

`app/roots/public-root.jsx` and `team-root.jsx` — **no change** unless signature forwarding requires it (pass-through `args` already).

## Out of scope

- SSR / `clientLoader` 401 (#107)
- Marketplace guest 401 (#109)
- Policy tree `shouldRevalidate`

## Acceptance criteria

- [ ] `actionStatus` 401 and 403 return `true` when `defaultShouldRevalidate` is `false` and URL unchanged
- [ ] `actionStatus` 401 returns `true` when URL changes (auth-failed overrides URL guard)
- [ ] Bridge + URL-change cases from #107 unchanged when `actionStatus` absent and `formMethod` is `GET`
- [ ] Non-`GET` `formMethod` still returns `true`
- [ ] reading-the-session target snippet shows merged guard (mutation / auth failed → bridge → URL → default)

## Verification

```bash
# Web (from red-cab-web/)
npm run test -- app/auth/root-should-revalidate.spec.js app/auth/auth-session-redirect-integration.spec.js
npm run lint
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-04 | Build agent | `review-implementation-spec` (brief-aligned) | Approved — matches reading-the-session + preserves #107 bridge |
