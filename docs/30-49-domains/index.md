---
title: Domains
sidebar_position: 1
description: One folder for each domain. Each folder has a front door and a decisions page.
---

## TL;DR

- This area holds one folder for each domain.
- Each folder has a **front door** (`index.md`) and a **decisions page** (`{domain}-decisions.md`).
- The decisions page holds every ruling of the domain, as a numbered and dated entry.
- Catalog and IAM have rulings.
- Bookings, Payments and Reviews are drafts, and they have only questions.

## About this document

This page is the hub of the `30-49-domains` area.

The [Documentation system](../00-09-meta/conventions/documentation-system.md#precedence) page gives the precedence of documents.

| Topic | Document |
| --- | --- |
| Glossary | [Glossary](../70-79-business/71-business-rules/glossary.md) |

---

## Domains

| Domain | Front door | Decisions | Status |
| --- | --- | --- | --- |
| Catalog | [Catalog domain](./31-catalog/index.md) | [Catalog decisions](./31-catalog/catalog-decisions.md) | Current |
| IAM | [IAM domain](./32-iam/index.md) | [IAM decisions](./32-iam/iam-decisions.md) | Current |
| Bookings | [Bookings domain](./33-bookings/index.md) | [Bookings decisions](./33-bookings/bookings-decisions.md) | Draft |
| Payments | [Payments domain](./34-payments/index.md) | [Payments decisions](./34-payments/payments-decisions.md) | Draft |
| Reviews | [Reviews domain](./35-reviews/index.md) | [Reviews decisions](./35-reviews/reviews-decisions.md) | Draft |

## Adding a domain

- Create the folder `{nn}-{domain}/` with the next free number.
- Add the front door and the decisions page.
- Mark both pages `status: draft` until the principal developer approves a ruling.
