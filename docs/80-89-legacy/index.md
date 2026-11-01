---
title: Legacy documentation
sidebar_position: 1
description: Superseded material. It does not govern anything.
doc_type: legacy
normative: false
---

## TL;DR \{#legacy-index\}

- Pages here are **historical**, and no page here is a source of truth.
- Do not cite a legacy page as product or architecture authority.
- Use the [document alias table](./document-alias-table.md) to map old IDs and URLs to current pages.
- Each group of legacy specs below stays only until the condition in its row is true.
- Then we delete the group.

## About this document

This page is the home of retired requirements, ADRs and specs.

The [Documentation system](../00-09-meta/conventions/documentation-system.md#migration-policy) page gives the migration policy.

---

## What is still here and why \{#still-here\}

Every spec below is under `implementation-specs/`.

| Group | Files | Why it is still here | Delete when |
| --- | --- | --- | --- |
| `iam/auth-platform/` | 17 | The code still runs the old sessions, with `jwt_sessions` and the refresh code. The new IAM specs list what they change in these specs. | `api-147`, `api-263`, `web-190` and `web-192` have shipped. |
| `iam/iam-audit-2026-08/` | 9 | The code still has the old account and session shape that this audit describes. `api-263` lists what it changes here. | `api-263` has shipped. |
| `pay/` | 7 | The code runs this payment behavior, and no domain page describes it. The live specs `web-155` and `api-246` use `web-62` and `api-71` as their base. | The Payments domain has rulings, or you accept the code as the only truth. |
| `rev/` | 16 | The code runs this review behavior, and the DBML gives the columns only. | The Reviews domain has rulings, or you accept the code as the only truth. |

- After a group is deleted, remove the "what this changes" tables in the new specs that point to it.
- The document alias table stays until the old FR and ADR pages are deleted.

## Already deleted \{#deleted\}

Six specs were deleted on 2026-11-01.

- `bkg/api-155`, `pay/api-156`, `platform/web-58`, `platform/web-64`, `platform/web-68` and `platform/web-69`.
- They had no live reader.
- The DBML holds the columns of the two schema specs.
