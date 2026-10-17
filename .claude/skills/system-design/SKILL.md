---
name: system-design
description: Produce a short design plan before an implementation spec — invariants, options, boundaries, and open questions. Does not write code or formal specs.
argument-hint: "[topic]"
---

# system-design

Help the user decide **before** `write-implementation-spec` runs in `red-cab-api` or `red-cab-web`.

Output: `scratchpad/design-{slug}.md`. Not a committed doc unless the user promotes it to an ADR or explainer via `write-doc`.

## When to use

- New aggregate, flow, or cross-context change
- Choosing between two or three architectural options
- Listing invariants and failure modes before API shape is fixed

## When to skip

- User wants an implementation spec → `write-implementation-spec` in api or web
- User wants a Docusaurus page → `write-doc`
- User wants endpoint or migration code → codegen skills in api or web

## Read first (as needed)

| Topic | Path |
| --- | --- |
| Invariants | `docs/70-79-business/71-business-rules/invariants.md` |
| Glossary | `docs/70-79-business/71-business-rules/glossary.md` |
| Open questions | `docs/70-79-business/73-planning/open-questions.md` |
| Bounded context | `docs/30-49-domains/31-bounded-contexts/` |
| Money and payments | `adr-005`, `adr-011`, `adr-015` under `34-architecture-decisions/` |
| Snapshots | `adr-006` |
| Integration | `adr-004`, `adr-007` |
| Code mapping | `docs/20-29-backend/21-conventions/domain-to-code-mapping.md` |

See `references/red-cab-design-notes.md` for Red Cab-specific reminders.

## Operating principles

1. **Start from invariants**, not columns. Tables follow rules that must always hold.
2. **Pricing authority is singular** — never accept price from a client; cite `INV-*` and payment ADRs when money is involved.
3. **Booking snapshots are immutable** after create.
4. **Seat availability** changes only through the catalog availability service (see invariants and catalog context docs).
5. **Respect context boundaries** — no direct Corporate model imports from Booking; use ACL patterns from domain docs.
6. **Sketch the actor journey** (tourist, provider, team, corporate) before HTTP paths.

## Design plan shape

Write these sections in order. Omit a section only when it has no content.

```markdown
# Design plan: {title}

## Problem statement

## Actors and journey

## Invariants (must hold)

| ID or rule | Statement | Source |
| --- | --- | --- |

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |

## Recommended direction

## Aggregates and responsibilities

## Integration points

## Risks and open questions

## Suggested next step

- [ ] Open GitHub issue (`write-issue`)
- [ ] Implementation spec (`write-implementation-spec` with governing doc table filled)
```

Use Tier A sentences in the plan body (`write-tier-a-prose`).

## Hand-off

State whether the next artifact is an issue, an ADR, an explainer, or an implementation spec. Do not merge this plan into code without an approved spec when api or web changes.
