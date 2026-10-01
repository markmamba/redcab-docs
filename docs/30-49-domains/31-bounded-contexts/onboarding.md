---
title: Onboarding & Verification
sidebar_position: 2
description: Bounded context documentation for Red Cab Marketplace.
---

### 1. Provider Onboarding & Verification (core)
- **Purpose:** Take a Provider from registration to Approved/Active and keep their right-to-operate valid (license expiry, support trial).
- **Aggregates owned:** `ProviderApplication` (registration-by-type, documents, Verification Checklist, status), `LicenseRecord` (number, expiry, verification), `SupportTrial`.
- **Transactional boundary:** approval (checklist complete → status Approved + trial start) is one transaction; document upload is independent.
- **Upstream deps:** Identity (the authenticated principal/account behind a Provider).
- **Downstream consumers:** Catalog (reads Provider Status to gate listing creation); Notifications.
- **Sync:** exposes a `provider_status(provider_id)` query used by Catalog policy.
- **Async (publishes):** `ProviderApproved`, `ProviderRejected`, `ProviderSuspended`, `LicenseExpiringSoon`, `LicenseExpired`, `LicenseRenewed`, `SupportTrialExpiring`, `SupportTrialExpired`.
- **Integration contract:** Provider Status is exposed as a small read contract `{ provider_id, status, license_valid_until }`. Other contexts never read Onboarding's internal tables.
- **ACL note:** Catalog treats Onboarding's status as an upstream fact via a conformist read; it does not replicate verification logic.
- **Rules anchored here:** `LC-7..9`, `INV-6`, `INV-7`, `OPR-2..4`.
