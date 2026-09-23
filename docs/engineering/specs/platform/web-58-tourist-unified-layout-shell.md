---
title: "Unified tourist layout shell (OUTLINE)"
sidebar_label: Web · Tourist layout
issue: "https://github.com/markmamba/red-cab-web/issues/58"
repos:
  - red-cab-web
status: draft
phase: 1
context: CAT
depends_on:
  - "docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree.md"
  - "red-cab-api#130 (geography administrative tree — sequence before implementation)"
  - "tourist-web-56"
---

> **Outline only.** Full spec to be written from this skeleton once `#56` (and ideally `#57`) is approved. Do not treat any bullet below as final design — expand and cite governing docs before implementation.

## TL;DR

- Depends on `#56`'s route/auth table and `#57`'s breadcrumb contract — this issue is the shell that renders both
- Delivers: one nav/footer/loading/error shell strategy spanning `TouristPublicLayout` and `TouristDashboardLayout`, not a rewrite of either

## Problem

- Public (`TouristPublicLayout`) and account (`TouristDashboardLayout`) surfaces currently diverge in nav, empty-state, and error-state handling with no documented shared contract
- Nav "Discover" link target changes to `/districts` per `#56` — this issue owns the label wording and placement in both shells

## Governing docs

- `#56` spec (Web contract table — which layout wraps which route, auth HOC per surface)
- `#57` spec (breadcrumb data contract — shell must render it consistently)
- `frontend-conventions.md` (shared component conventions, react-bootstrap usage)
- `/docs/product/business-rules/glossary` (guest vs tourist vs corporate terminology for nav copy)

## Nav items for guest vs logged-in

- Guest nav: Districts (formerly "Discover"), Login, Sign up — no account-only links
- Logged-in nav: Districts, Account, Bookings, Logout — define exact ordering/grouping
- Define how the shell detects auth state without re-introducing a route-level auth check on public pages (per `#56` decision 5 — auth is an API/session property, not a route guard)

## Mobile nav pattern

- Confirm whether existing mobile nav pattern (hamburger/drawer/bottom-bar) is reused as-is or needs adaptation for the new public routes
- Define touch targets for the deeper breadcrumb trail (`#57`) on narrow viewports

## Footer

- Confirm footer is shared identically across public and account surfaces, or has surface-specific content (e.g., SEO links only on public pages)
- Internal-linking footer links to district hubs — coordinate with `#59`'s SEO priority

## Shared empty/error/loading states

- Define one loading-state component/pattern usable by both server `loader` (public) and `clientLoader` (account) routes
- Empty state for zero-listing areas — must respect `INV-8` (hidden, not "no results" messaging that implies existence)
- Error state for 404 (unpublished/unknown listing UUID, per `#56`) and for the stale-slug 301 case (`#57`) — should these ever render a full error page, or always redirect silently?

## Which layout wraps which routes from #56

- `TouristPublicLayout`: Home, Districts index, Areas in district, Listings in area, Listing detail, Login/Sign-up
- `TouristDashboardLayout`: Account home, Checkout, Checkout return, Bookings list, Booking detail
- Listing resolver alias (`/listings/:uuid`) wraps no layout — loader-only redirect, never renders
- Confirm no route from `#56`'s table is left unassigned to either layout
