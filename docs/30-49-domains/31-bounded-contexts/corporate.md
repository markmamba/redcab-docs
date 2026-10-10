---
title: Corporate Quotation & Invoicing
sidebar_position: 6
description: Core context — quotation requests, formal documents, invoicing, and booking conversion via ACL.
---

## TL;DR

- Handles Corporate **Quotation Request**, Admin-issued documents, and **Invoice** issuance.
- Converts an accepted **Quotation** into a Booking through Booking's command only.
- Keeps corporate vocabulary out of Booking via an **anti-corruption** boundary (`CR-7`).
- Uses Catalog `calculate_quote` for line items; bank-transfer flow ties to Payments reconciliation.

## About this document

Bounded context overview for Corporate Quotation & Invoicing (core).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Booking integration | [Booking](/docs/30-49-domains/bounded-contexts/booking) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context runs Corporate intake, formal quotation and invoice documents, and bank-transfer instructions.

It does not own the Booking aggregate. It delegates booking creation to Booking.

## Core concepts

**Aggregates:** `QuotationRequest`; `Quotation` (line items, tax, validity, status); `Invoice`.

Quotation issuance and acceptance are transactional within `Quotation`.

Booking creation is **not** co-transactional. Corporate calls Booking's `create_booking_from_quote`.

## Integrations

**Upstream:** Identity (Corporate Client principal); Catalog (`calculate_quote` for line items).

**Downstream:** Booking (create-from-quote); Payments (reconciliation); Notifications.

**Sync (exposes):** quotation lifecycle commands for Admin; `create_booking_from_quote` into Booking.

**Async (publishes):** `QuotationRequested`, `QuotationSent`, `QuotationAccepted`, `QuotationRejected`, `QuotationExpired`, `InvoiceIssued`.

**ACL:** Corporate translates quotation language into Booking commands at the boundary. PO numbers, credit terms, and consolidated invoicing stay in Corporate.

## Related requirements

`LC-11`, `PAY-9`, `PAY-10`, `BKG-*` (via created booking).

## Open questions

`AMB-027`..`AMB-033`. See [Open questions](/docs/70-79-business/planning/open-questions).
