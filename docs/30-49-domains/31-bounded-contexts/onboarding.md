---
title: Onboarding & Verification
sidebar_position: 2
description: Core context — Provider registration, verification, license validity, and support trial.
---

## TL;DR

- Moves a Provider from registration to **Approved** and keeps the right to operate valid.
- Owns **ProviderApplication**, **LicenseRecord**, and **SupportTrial**.
- Publishes **Provider Status** for Catalog to read; Catalog does not copy verification logic.
- Publishes license and trial events for Catalog and Notifications.

## About this document

Bounded context overview for Provider Onboarding & Verification (core).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| Context map | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context takes a Provider from registration to **Approved** or **Active**.

It keeps the right to operate valid when a license expires or a support trial ends.

## Core concepts

**ProviderApplication** (aggregate root: `Provider`) holds registration by type, documents, the verification checklist, and status.

**LicenseRecord** holds the license number, expiry, and verification outcome.

**SupportTrial** holds the three-month free-support window that starts at approval (`OPR-2`).

Approval is one transaction: checklist complete, status **Approved**, trial start (`LC-7`..`LC-9`).

Document upload is a separate transaction.

## Integrations

**Upstream:** Identity supplies the authenticated principal behind the Provider.

**Downstream:** Catalog reads Provider Status to gate listing creation. Notifications reacts to events.

**Sync:** `provider_status(provider_id)` query for Catalog policy.

**Async (publishes):** `ProviderApproved`, `ProviderRejected`, `ProviderSuspended`, `LicenseExpiringSoon`, `LicenseExpired`, `LicenseRenewed`, `SupportTrialExpiring`, `SupportTrialExpired`.

**Read contract:** `{ provider_id, status, license_valid_until }`. Other contexts never read Onboarding tables directly.

Catalog uses a **conformist read** of this contract. It does not replicate verification logic.

## Related requirements

`LC-7`..`LC-9`, `INV-6`, `INV-7`, `OPR-2`..`OPR-4`.
