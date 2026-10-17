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
- Phase 0 [audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#audit-tldr) inventories legacy FR-CAT, ADRs, specs, and code gaps. It recommends dispositions; PR 4 applies them.

## About this document

Planning only. Behavior is defined in domain rulings and approved specs, not on this page.

| Topic | Document |
| --- | --- |
| Documentation system | [Documentation system](/docs/00-09-meta/conventions/documentation-system#documentation-system) |
| Catalog domain entry | [Catalog overview](/docs/30-49-domains/catalog/overview/#catalog-overview) |
| Legacy ID mapping | [Document alias table](/docs/80-89-legacy/document-alias-table) |
| Phase 0 audit | [Catalog revamp phase 0 audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#audit-tldr) |

## Goals \{#goals\}

- Region-first tourist discovery with keyword search and filters within scope.
- Provider listings with primary and additional destinations and pickup coverage.
- Stricter discoverability than publish-only (complete booking information).
- Supersede District → Area-primary IA and specs that exclude keyword search.

## Non-goals (this program) \{#non-goals\}

- Payment catalog tables revamp.
- Bulk rewrite of all `FR-CAT-*` pages in one PR.

## Supersession map \{#supersession-map\}

Summary of audit recommendations. PR 4 applies them. See the [audit](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory) for every row.

| Legacy artifact | Action | Replacement |
| --- | --- | --- |
| `FR-CAT-003`, `FR-CAT-004`, `FR-CAT-026`, `FR-CAT-027`, `FR-CAT-033` | Supersede in part | Normative Catalog pages (PR 4). See [FR-CAT inventory](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-fr-cat). |
| `ADR-017` | Supersede in part (URL family and IA) | Catalog decisions page (PR 4). See [ADRs](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-adr). |
| `AMB-020`, `AMB-022` (URL clause) | Supersede, then reopen | Decision Log update (PR 4 or PR 5). See [open questions](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-open-questions). |
| `web-57`, `web-59` (IA), `web-65`, `web-66`, `web-67`, `web-124`, `api-161` | Supersede (`status: superseded`) | New approved specs. See [specs](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-specs). |
| `web-56` (URL and redirect sections) | Banner on section | New route contract. See [specs](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-specs). |
| `INV-8`, `LC-10`, `PRC-2`, `BKG-11` | Pending | PR 5 after forks are ruled. See [invariants](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-invariants) and [open forks](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#open-forks). |
| `FR-CAT-001`, `002`, `006` to `025`, `028` to `032`, `034`; `api-131` to `api-136`; `ADR-013`, `ADR-016` | Carry | No change. |
| `phase-2-execution-map.md` and two other roadmap pages | Fix in follow-up | See [planning drift](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#inventory-planning-drift). |

## Slices \{#slices\}

| Slice | Spec / issue | Status |
| --- | --- | --- |
| Documentation system (Step 1) | `documentation-system.md`, folder move | Done |
| Program index (Step 2) | This page | Done |
| Phase 0 audit (PR 3) | [`audit.md`](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/audit#audit-tldr) | Complete in this PR |
| Apply audit dispositions (PR 4) | Banners, `superseded` statuses, `38-catalog` pages | Planned |
| Invariant and booking rule edits (PR 5) | `INV-8`, `LC-10`, `PRC-2`, `BKG-11` | Planned |
