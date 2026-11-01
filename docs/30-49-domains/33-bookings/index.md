---
title: Bookings domain
sidebar_label: Bookings domain
sidebar_position: 1
description: Start here. The Bookings domain is a draft. It has no rulings yet, only the questions that we must answer first.
doc_type: domain-overview
normative: false
status: draft
context: bookings
last_reviewed: 2026-11-01
---

## TL;DR \{#bookings-overview\}

- This domain is a draft, and it has no rulings yet.
- We write the rules fresh, from the use cases of real users.
- No old requirement, invariant, ADR or spec is a source for this domain.
- Until a ruling is approved, no page here may be treated as a rule.
- Every ruling goes on [Bookings decisions](./bookings-decisions.md#bookings-decisions-tldr), once.

## About this document

This page is the front door of the Bookings domain.

It will list the words, the reading order and the rule index when they exist.

| Topic | Document |
| --- | --- |
| Precedence of documents | [Documentation system](../../00-09-meta/conventions/documentation-system.md#precedence) |
| Rulings | [Bookings decisions](./bookings-decisions.md#bookings-decisions-tldr) |
| Neighbor domains | [Catalog domain](../31-catalog/index.md), [IAM domain](../32-iam/index.md) |
| Column truth | Not yet linked. The DBML file for this domain gets linked when its rulings exist. |

Status: draft.

The principal developer has not approved any ruling.

---

## First questions \{#first-questions\}

We answer these before we write any ruling.

Each answer starts from a use case.

| Question | Why it matters |
| --- | --- |
| What does a tourist do from "I chose a package" to "my booking is confirmed"? | It sets the steps and the states of a booking. |
| What does the provider do with a confirmed booking? | It sets the provider actions, for example mark delivered. |
| What does a booking keep as its own copy, and what does it read live? | It sets what cannot change after checkout. |
| Which domain owns the hold on an asset, and when does the hold end? | It sets the line between Bookings and Catalog. |
| What happens when a tourist or a provider cancels? | It sets the link to Payments for refunds. |

## Words used in this doc \{#words\}

No words yet.

A word enters this table when a ruling uses it.

| Word | Meaning |
| --- | --- |
