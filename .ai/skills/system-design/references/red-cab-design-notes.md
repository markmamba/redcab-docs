# Red Cab design notes (for system-design)

## Modular monolith

Single Rails API deployable, PostgreSQL, bounded contexts under `app/domains/`. Prefer in-process integration unless an ADR says otherwise.

## Tourist vs team vs provider vs corporate

Surfaces differ in auth and routes. Web enforcement model: ADR-018 and ADR-019; authentication series under `90-99-engineering-meta/93-authentication/`.

## Geography

Administrative tree and reference data: ADR-013, ADR-016. Team admin and marketplace slugs may need separate issues; check open questions.

## Payments

Custody and control separation (ADR-015). Checkout flows tie to booking snapshots and payment attempts — read Pay functional requirements before designing new states.

## Spec workflow

Implementation specs live at:

`docs/60-69-initiatives/61-implementation-specs/{context}/{repo}-{issue}-{slug}.md`

Frontmatter `status: approved` is required before codegen skills run.
