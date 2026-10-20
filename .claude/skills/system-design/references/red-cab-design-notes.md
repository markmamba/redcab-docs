# Red Cab design notes (for system-design)

## Modular monolith

Single Rails API deployable, PostgreSQL, bounded contexts under `app/domains/`. Prefer in-process integration unless an ADR says otherwise.

## Tourist vs team vs provider vs corporate

Surfaces differ in auth and routes. Web enforcement model: ADR-018 and ADR-019; authentication series under `90-99-engineering-meta/93-authentication/`.

## Geography

Administrative tree and reference data: ADR-013, ADR-016. Team admin and marketplace slugs may need separate issues; check open questions.

## Payments

Custody and control separation (ADR-015). Checkout flows tie to booking snapshots and payment attempts — read Pay functional requirements before designing new states.

## Catalog and availability

- Do not decrement `available_seats` outside the catalog availability service (see invariants).
- Listing and departure data may be snapshotted into bookings at confirm time (ADR-006).

## Pricing

- Never accept price or commission amounts from client requests in API design.
- Pricing authority is singular; cite `INV-*` and payment ADRs in the plan.

## Cross-context access

Booking must not import Corporate models directly. Use ACL managers documented in bounded-context pages.

## Spec workflow

Implementation specs live at:

`docs/60-69-initiatives/61-2026/implementation-specs/{context}/{repo}-{issue}-{slug}.md`

Frontmatter `status: approved` is required before codegen skills run in api or web.

## Options and rejection

When the plan lists options, name the rejected path in **Why we did not pick the other options**. Link evidence (ADR, invariant, or prior issue) when it exists.

## Schema sketch

Rough DBML in the scratchpad plan is enough. Truth file for tables: `red-cab-api/docs/db/*.dbml`. Do not write migrations in this skill.
