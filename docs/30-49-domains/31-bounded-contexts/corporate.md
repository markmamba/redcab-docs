---
title: Corporate Quotation & Invoicing
sidebar_position: 6
description: Bounded context documentation for Red Cab Marketplace.
---

### 5. Corporate Quotation & Invoicing (core)
- **Purpose:** Corporate intake (Quotation Request), Admin-issued formal documents (Omitsumorisho/Seikyusho), and conversion of an accepted Quotation into a Booking; Bank Transfer instruction.
- **Aggregates owned:** `QuotationRequest`, `Quotation` (line items, tax, validity, status), `Invoice`.
- **Transactional boundary:** quotation issuance and acceptance are transactional within the `Quotation`; booking creation is delegated (not co-transactional) via a command into Booking.
- **Upstream deps:** Identity (Corporate Client principal), Catalog (`calculate_quote` for line items).
- **Downstream consumers:** Booking (create-from-quote), Payments (reconciliation), Notifications.
- **Sync (exposes):** quotation lifecycle commands to Admin; calls Booking's `create_booking_from_quote`.
- **Async (publishes):** `QuotationRequested`, `QuotationSent`, `QuotationAccepted`, `QuotationRejected`, `QuotationExpired`, `InvoiceIssued`.
- **Integration contract / ACL:** Corporate translates its quotation language into Booking's command vocabulary at the call boundary — an **anti-corruption boundary** that keeps evolving corporate concepts (PO numbers, credit terms, consolidated invoicing) out of Booking.
- **Rules anchored here:** `LC-11`, `PAY-9`, `PAY-10`, `BKG-*` (via created booking).
- **Open decisions:** AMB-027..033.
