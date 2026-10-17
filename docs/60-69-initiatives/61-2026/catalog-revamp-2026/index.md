---
title: Catalog revamp 2026
sidebar_position: 1
description: Program plan, audit, and supersession map for the Catalog domain revamp.
doc_type: program
normative: false
status: active
---

## TL;DR \{#catalog-revamp-2026\}

- **Non-normative** program index for marketplace IA, search, destinations, pickup coverage, and provider publish rules.
- Normative outcomes will live under [Catalog](/docs/30-49-domains/catalog/overview/) and in new **approved** [implementation specs](/docs/60-69-initiatives/61-2026/implementation-specs/).
- Next deliverable: `audit.md` (inventory of legacy FR-CAT, ADRs, specs, and code gaps).

## About this document

Planning only. Behavior is defined in domain rulings and approved specs, not on this page.

| Topic | Document |
| --- | --- |
| Documentation system | [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system) |
| Catalog domain entry | [Catalog overview](/docs/30-49-domains/catalog/overview/#catalog-overview) |
| Legacy ID mapping | [Document alias table](/docs/80-89-legacy/document-alias-table) |

## Goals \{#goals\}

- Region-first tourist discovery with keyword search and filters within scope.
- Provider listings with primary and additional destinations and pickup coverage.
- Stricter discoverability than publish-only (complete booking information).
- Supersede District → Area-primary IA and specs that exclude keyword search.

## Non-goals (this program) \{#non-goals\}

- Payment catalog tables revamp.
- Bulk rewrite of all `FR-CAT-*` pages in one PR.

## Supersession map \{#supersession-map\}

| Legacy artifact | Action | Replacement |
| --- | --- | --- |
| _(populate in audit.md)_ | — | — |

## Slices \{#slices\}

| Slice | Spec / issue | Status |
| --- | --- | --- |
| Documentation system (Step 1) | This repo meta + folder move | In progress |
| Phase 0 audit | `audit.md` (planned) | Not started |
