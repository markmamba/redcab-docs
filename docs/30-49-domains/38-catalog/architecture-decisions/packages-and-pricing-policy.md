---
title: Packages sit under one shared pricing policy
sidebar_label: Packages and pricing policy
sidebar_position: 3
description: Why a listing has many packages and one pricing policy for the rules that all packages share.
normative: true
status: accepted
context: catalog
last_reviewed: 2026-10-23
supersedes:
  - PRC-2 (one policy for each listing)
---

## TL;DR \{#packages-adr-tldr\}

- A listing has up to 5 packages in `catalog_listing_packages`.
- The pricing policy stays one for each listing and holds pricing mode and cancellation.
- The base price moves from the policy to the package.
- Two display price columns serve filter and sort, and one service writes them.

## About this document

Domain decision record for packages and pricing.

| Topic | Document |
| --- | --- |
| Ruling | [Packages and pricing policy](/docs/30-49-domains/catalog/catalog-decisions/#packages-and-pricing-policy) |
| Model | [Listings and packages model](/docs/30-49-domains/catalog/models/listings-and-packages) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) (`PRC-1` to `PRC-8`) |

---

## Context

A tourist needs several options on one listing, for example a 5-seat car and an 11-seat van.

Today one row in `catalog_pricing_policies` holds the pricing mode, the base price, the duration and the cancellation source.

Two rules already fix part of the answer.
- `PRC-3` says the pricing mode is exclusive for each listing.
- `PRC-7` says the cancellation policy is one for each listing.

Bookings copy the price and the cancellation tiers by value.

A later change in Catalog pricing never changes a booking.

## Decision

Add packages and keep one policy for each listing.

- The policy keeps `pricing_mode`, `currency` and `cancellation_policy_source`.
- A package holds the name, vehicle category, passenger limit, duration, start window, buffer, base price and status.
- A listing has at most 5 packages that are not archived.
- The Pricing module stays the only price authority (`PRC-1`).
- Checkout takes `package_slug`, and the client never sends a price.
- Price tiers, seasonal overrides and extra charges stay on the policy until Phase 2.

## Consequences

- `PRC-2` changes: the starting price is the lowest quote of an available package.
- `Catalog::Pricing::CalculateQuoteService` reads the mode from the policy and the base rate from the package.
- The slot price override goes away with the slot.
- Bookings copy the package id and the package name at checkout.
- The starting price ignores seasonal overrides until Phase 2 decides.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Packages replace policies | It moves pricing to the listing and touches about 26 files. It also changes the Phase 2 tables, which this work leaves alone. |
| One policy for each package | It breaks `PRC-3` and `PRC-7`, and the provider must set cancellation again for every package. |
