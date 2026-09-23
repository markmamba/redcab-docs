---
title: "Tourist IA, breadcrumbs, sitemap, and deep-link rules (OUTLINE)"
sidebar_label: Web · Tourist IA
issue: "https://github.com/markmamba/red-cab-web/issues/57"
repos:
  - red-cab-web
status: draft
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md"
  - "red-cab-api#130 (geography administrative tree — ancestors on listing payload)"
  - "tourist-web-56"
---

> **Outline only.** Full spec to be written from this skeleton once `#56` is approved. Do not treat any bullet below as final design — expand and cite governing docs before implementation.

## TL;DR

- Depends on `#56`'s Web contract route table (path shapes are locked; this issue designs the navigation/data layer on top of them)
- Delivers: sitemap generation, breadcrumb data contract per route level, deep-link rules, back-navigation rules, bilingual label resolution

## Problem

- Public routes exist (`#56`) but have no crawlable sitemap and no breadcrumb trail — both required for SEO priority high and for `FR-CAT-004`'s District → Area hierarchy to be *visible*, not just present in the URL
- No documented rule for what happens when a shared listing link's slug segment goes stale (district/area renamed)

## Governing docs

- `#56` spec (route table, redirect matrix) — primary input
- `FR-CAT-004` (District → Area hierarchy)
- `geography.md` (slug immutability open question — Session A §7.1)
- `frontend-conventions.md` (breadcrumb component conventions, if any exist)
- `/docs/product/business-rules/glossary` (name_en / name_ja terminology)

## Sitemap

- `routes/marketplace/sitemap.xml.js` resource route generates entries for `/`, `/districts`, `/districts/:d`, `/districts/:d/areas/:a/listings`, and each published listing's canonical detail path
- Exclude `noindex` routes (`/account/**`, `/listings/:uuid` alias) entirely from sitemap output
- Respect `INV-8` — zero-listing Districts/Areas produce no sitemap entries
- Define regeneration/caching strategy (build-time vs on-demand loader) — flag as open decision if not resolved by `#56`

## Breadcrumb data contract per route level

- Home → Districts → District (area list) → Area listings → Listing detail, each level's breadcrumb label sourced from server-returned district/area names, not re-derived client-side
- Breadcrumb trail must be buildable from a **listing detail payload alone** once `API-2` (district embed) ships — until then, note the temporary gap
- Define the shape (array of `{ label, path }` or similar) and where it's computed (loader vs component)
- Language label resolution: breadcrumbs use `name_en` / `name_ja` per active locale, consistent with listing/area/district display elsewhere

## Deep-link rules

- Shareable listing URLs use the full canonical path (`/districts/:d/areas/:a/listings/:uuid`) — the `/listings/:uuid` resolver alias (`#56`) exists for consumers that only hold a UUID (e.g., booking history), not for external sharing
- Stale slug rule: canonical path with a stale district/area slug 301s to the current canonical path (per `#56`'s redirect matrix) — this issue defines how the breadcrumb/deep-link layer detects and surfaces that redirect to the user
- Define behavior when a listing UUID is valid but unpublished/removed (`#56`: 404 — this issue defines the 404 page content/UX)

## Back-navigation rules

- Booking detail's back-link to the listing uses the `/listings/:uuid` resolver alias (per Session A §5, `#63` note) — define the UX (does it feel like "back" or a fresh navigation?)
- Define back-navigation behavior within the funnel itself (listing detail → area listings → district → districts index) — browser back vs an explicit "back to results" affordance

## Language label resolution

- Central rule for `name_en` vs `name_ja` selection across breadcrumbs, nav, and page titles — single source of truth function/hook, not per-component logic
- Fallback behavior if one locale's name is missing
- Confirm this rule doesn't conflict with existing i18n conventions elsewhere in `red-cab-web`
