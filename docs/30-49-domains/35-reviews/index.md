---
title: Reviews domain
sidebar_label: Reviews domain
sidebar_position: 1
description: Start here. The Reviews domain is a draft. It has no rulings yet, only the questions that we must answer first.
doc_type: domain-overview
normative: false
status: draft
context: reviews
last_reviewed: 2026-11-01
---

## TL;DR \{#reviews-overview\}

- This domain is a draft, and it has no rulings yet.
- We write the rules fresh, from the use cases of real users.
- No old requirement, invariant, ADR or spec is a source for this domain.
- Until a ruling is approved, no page here may be treated as a rule.
- Every ruling goes on [Reviews decisions](./reviews-decisions.md#reviews-decisions-tldr), once.

## About this document

This page is the front door of the Reviews domain.

It will list the words, the reading order and the rule index when they exist.

| Topic | Document |
| --- | --- |
| Precedence of documents | [Documentation system](../../00-09-meta/conventions/documentation-system.md#precedence) |
| Rulings | [Reviews decisions](./reviews-decisions.md#reviews-decisions-tldr) |
| Neighbor domains | [Catalog domain](../31-catalog/index.md), [Bookings domain](../33-bookings/index.md), [IAM domain](../32-iam/index.md) |
| Column truth | Not yet linked. The DBML file for this domain gets linked when its rulings exist. |

Status: draft.

The principal developer has not approved any ruling.

---

## First questions \{#first-questions\}

We answer these before we write any ruling.

Each answer starts from a use case.

| Question | Why it matters |
| --- | --- |
| Who may write a review, and when? | It sets the link to Bookings. |
| What does a review contain? | It sets the form and the data. |
| May a provider answer or report a review? | It sets the provider actions. |
| Who checks reviews, and what may the team do? | It sets the moderation rules. |
| How does a rating reach the listing page? | It sets the link to Catalog, for example the "top rated" sort. |

## Words used in this doc \{#words\}

No words yet.

A word enters this table when a ruling uses it.

| Word | Meaning |
| --- | --- |
