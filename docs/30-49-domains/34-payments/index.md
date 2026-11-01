---
title: Payments domain
sidebar_label: Payments domain
sidebar_position: 1
description: Start here. The Payments domain is a draft. It has no rulings yet, only the questions that we must answer first.
doc_type: domain-overview
normative: false
status: draft
context: payments
last_reviewed: 2026-11-01
---

## TL;DR \{#payments-overview\}

- This domain is a draft, and it has no rulings yet.
- We write the rules fresh, from the use cases of real users.
- No old requirement, invariant, ADR or spec is a source for this domain.
- Until a ruling is approved, no page here may be treated as a rule.
- Every ruling goes on [Payments decisions](./payments-decisions.md#payments-decisions-tldr), once.

## About this document

This page is the front door of the Payments domain.

It will list the words, the reading order and the rule index when they exist.

| Topic | Document |
| --- | --- |
| Precedence of documents | [Documentation system](../../00-09-meta/conventions/documentation-system.md#precedence) |
| Rulings | [Payments decisions](./payments-decisions.md#payments-decisions-tldr) |
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
| How does a tourist pay, and when is the money taken? | It sets the payment steps and the link to checkout. |
| How does a provider company get paid, and when? | It sets the payout and the merchant account. |
| What does Red Cab earn on a booking, and who sets it? | It sets the commission and who may change it. |
| What happens to the money when a booking is cancelled? | It sets the refund rules with Bookings. |
| Which payment provider do we use at launch? | It sets what the domain must store and what it can leave to the provider. |

## Words used in this doc \{#words\}

No words yet.

A word enters this table when a ruling uses it.

| Word | Meaning |
| --- | --- |
