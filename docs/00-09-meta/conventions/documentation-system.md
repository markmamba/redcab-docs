---
title: Documentation system
sidebar_position: 3
description: Layers, precedence, doc types, and migration rules for redcab-docs.
---

## TL;DR \{#documentation-system\}

- Docs use [Johnny Decimal](https://johnnydecimal.com/) areas; **normative** product truth for Catalog lives under [Catalog](/docs/30-49-domains/catalog/overview/).
- **Precedence:** global business rules → platform rulings → domain rulings → engineering → **approved** implementation specs → code.
- **Programs** (revamp plans, audits) are **not** in the precedence chain.
- Superseded pages get banners in place first; long-term home is [Legacy](/docs/80-89-legacy/).
- Normative Catalog pages use explicit heading IDs (`\{#slug\}` in MDX); Docusaurus treats broken anchors as build errors.

## About this document

This page locks how the documentation repository is organized. Agents and humans read it before large moves or new domain folders.

| Topic | Document |
| --- | --- |
| Johnny Decimal and links | [Documentation conventions](/docs/00-09-meta/conventions/) |
| Prose tiers | [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) |
| Shipping specs | [Implementation specs](/docs/60-69-initiatives/61-2026/implementation-specs/) |
| Catalog revamp program | [Catalog revamp 2026](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/) |

---

## Layers \{#layers\}

| Layer | Filesystem (under `docs/`) | Normative? | Role |
| --- | --- | --- | --- |
| Meta | `00-09-meta/` | Partial | Conventions, start-here, this page |
| Backend / frontend engineering | `20-29-backend/`, `50-59-frontend/` | Conventions only | How to implement; not product rulings |
| Domains | `30-49-domains/` | Mixed | Bounded contexts, data model, **domain folders** (e.g. `38-catalog/`) |
| Platform rulings | `30-49-domains/34-architecture-decisions/` | Yes (cross-context) | ADRs that span bounded contexts |
| Initiatives — specs | `60-69-initiatives/61-2026/implementation-specs/` | Yes when `status: approved` | Per-issue API/web shipping design |
| Initiatives — programs | `60-69-initiatives/61-2026/{program}/` | **No** | Plans, audits, supersession maps |
| Business | `70-79-business/` | Yes (global) | Glossary, invariants, legacy FR index, roadmap |
| Engineering meta | `90-99-engineering-meta/` | Conventions / series | Authentication roadmap, cross-cutting |
| Legacy | `80-89-legacy/` | **No** | Superseded material; alias table |

Schema truth for tables remains `red-cab-api/docs/db/*.dbml`.

---

## Precedence \{#precedence\}

When documents disagree, higher layers win:

1. Global business rules and glossary (`70-79-business/71-business-rules/`)
2. Platform rulings (`30-49-domains/34-architecture-decisions/` and other accepted cross-context ADRs)
3. Domain rulings and requirements (`30-49-domains/38-catalog/` and future `{nn}-{domain}/`)
4. Engineering conventions (`20-29-backend/`, `50-59-frontend/`, `90-99-engineering-meta/`)
5. Approved implementation specs (`60-69-initiatives/61-2026/implementation-specs/`, `status: approved`)
6. Application code (`red-cab-api/`, `red-cab-web/`)

**Out of chain:** program and audit pages under `61-2026/` (for example [Catalog revamp 2026](/docs/60-69-initiatives/61-2026/catalog-revamp-2026/)). They link to normative pages; they do not define product behavior.

A lower layer must not contradict a higher layer. To change a higher layer, amend that document first.

---

## Doc types \{#doc-types\}

| `doc_type` (frontmatter) | Typical path | Normative? |
| --- | --- | --- |
| `program` | `61-2026/{program}/` | No |
| `domain-decisions` | `38-catalog/catalog-decisions.md` | Yes |
| `requirement` | `38-catalog/requirements/*.md` | Yes |
| `model-spec` | `38-catalog/models/*.md` | Yes (structure); DBML wins on columns |
| `implementation-spec` | `61-2026/implementation-specs/` | Yes when approved |
| `legacy` | `80-89-legacy/` | No — do not cite as governing |

New Catalog work uses **sentence titles** in navigation, not `FR-CAT-*` or `ADR-*` in headings. Legacy IDs may appear in `legacy_ids:` frontmatter and in the [document alias table](/docs/80-89-legacy/document-alias-table).

---

## Stable links \{#stable-links\}

- **Normative** pages under `38-catalog/` (decisions, requirements, model specs) must use explicit Docusaurus heading IDs: `## Section title \{#section-slug\}`.
- Other pages may use auto-generated anchors.
- Cross-links in specs and PRs should use published site paths (see [Documentation conventions](/docs/00-09-meta/conventions/) — category number prefixes are stripped in URLs).

---

## Implementation spec status \{#spec-status\}

| Status | Meaning |
| --- | --- |
| `draft` | Work in progress |
| `review` | Ready for `review-implementation-spec` |
| `approved` | Design locked; codegen may use `spec_path` |
| `superseded` | Replaced; do not use for codegen; set `superseded_by:` when known |
| `implemented` | Optional historical note after merge (not required) |

---

## Migration policy \{#migration-policy\}

1. **New** normative Catalog content goes under `38-catalog/`.
2. **Superseded** legacy FR, ADR, and spec pages stay in place with a banner until an alias row exists and redirects are ready.
3. **Physical move** to `80-89-legacy/` happens in a later PR with redirects.
4. **Domain-specific architecture decisions** for Catalog revamp go in `38-catalog/architecture-decisions/`; cross-context ADRs remain in `34-architecture-decisions/` until superseded.

---

## Change log \{#change-log\}

| Date | Change |
| --- | --- |
| 2026-10-17 | Initial documentation system; specs under `61-2026/implementation-specs/`; programs as siblings under `61-2026/`. |
