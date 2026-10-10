---
title: Identity & Access
sidebar_position: 8
description: Supporting context — authentication, accounts, roles, sessions, and language preference.
---

## TL;DR

- **Supporting** context: generic authentication reused by all surfaces.
- Owns **Account**, **Role** assignment, and **LanguagePreference**.
- Exposes principal resolution and coarse **Role** checks. Domain contexts still enforce their own gates.
- No Red Cab competitive logic lives here. Identity is the dependency root because sign-in precedes other work.

## About this document

Bounded context overview for Identity & Access (supporting).

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |
| ADR-010, ADR-018, ADR-019 | [Identity and web auth ADRs](/docs/30-49-domains/architecture-decisions) |
| Authentication series | [Authentication](/docs/90-99-engineering-meta/authentication) |
| Code mapping | [Domain-to-code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## Purpose

This context authenticates users and attaches a coarse Role to the session.

It stores language preference for Notifications and the web app.

## Core concepts

**Account** holds credentials, OAuth identities, Role assignment, and lockout state (`OPR-1`).

Registration, login, and lockout are transactional within **Account**.

Platform Admin (`/team`) uses a separate **Admin** principal. Admin is not a Role on marketplace Account.

## Integrations

**Upstream:** none (root for authenticated marketplace use).

**Downstream:** all contexts consume authenticated principal and Role.

**Sync (exposes):** principal resolution; role check; language-preference read.

**Async (publishes):** `AccountRegistered`, `AccountLocked`, `LanguagePreferenceChanged`.

## Related requirements

`OPR-1`, `A-01`, `A-02`, `G-03`.

## Open questions

`AMB-021` (auth methods), `AMB-022` (guest access). See [Open questions](/docs/70-79-business/planning/open-questions).
