---
title: Identity & Access
sidebar_position: 8
description: Bounded context documentation for Red Cab Marketplace.
---

### 7. Identity & Access (supporting, generic)
- **Purpose:** Authentication, accounts, roles, sessions, language preference. Generic capability reused everywhere.
- **Aggregates owned:** `Account` (credentials, OAuth identities), `Role` assignment, `LanguagePreference`.
- **Transactional boundary:** registration/login/lockout transactional within `Account`.
- **Upstream deps:** none (root).
- **Downstream consumers:** all contexts (authenticated principal + coarse role).
- **Sync (exposes):** principal resolution, role check, language-preference read.
- **Async (publishes):** `AccountRegistered`, `AccountLocked`, `LanguagePreferenceChanged`.
- **Why supporting, not core:** it encodes no Red-Cab-specific competitive logic; it is a generic subdomain. It is the dependency root only because identity precedes everything, not because it is domain-central.
- **Rules anchored here:** `OPR-1`, `A-01`, `A-02`, `G-03`.
- **Open decisions:** AMB-021 (auth methods), AMB-022 (guest access).
