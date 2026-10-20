---
name: system-design
description: Produce a design plan before an implementation spec — invariants, options, boundaries, and open questions. Does not write code or formal specs.
argument-hint: "[topic]"
---

# system-design

Help the user decide **before** `write-implementation-spec` runs in `red-cab-api` or `red-cab-web`.

Output: `scratchpad/design-{slug}.md`. Not a committed doc unless the user promotes it to an ADR or explainer via `write-doc`.

Load `write-plain-english` before writing the plan body. Use Tier A for the plan (`write-tier-a-prose` for tier summary).

## When to use

- New aggregate, flow, or cross-context change
- Choosing between two or three architectural options
- Listing invariants and failure modes before API shape is fixed

## When to skip

- User wants an implementation spec → `write-implementation-spec` in api or web
- User wants a Docusaurus page → `write-doc`
- User wants endpoint or migration code → codegen skills in api or web with an approved spec

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
| Auth surfaces | `docs/90-99-engineering-meta/93-authentication/` |
| Code mapping | `docs/20-29-backend/21-conventions/domain-to-code-mapping.md` |

See `references/red-cab-design-notes.md` for Red Cab reminders.

## Operating principles

1. **Start from invariants**, not columns. Tables follow rules that must always hold.
2. **Pricing authority is singular** — never accept price from a client; cite `INV-*` and payment ADRs when money is involved.
3. **Booking snapshots are immutable** after create.
4. **Seat availability** changes only through the catalog availability service (see invariants and catalog context docs).
5. **Respect context boundaries** — no direct Corporate model imports from Booking; use ACL patterns from domain docs.
6. **Sketch the actor journey** (tourist, provider, team, corporate) before HTTP paths.
7. **Write 2 or 3 options when there is a real choice.** Pick one. Explain why.
8. **Argue against the rejected option on the page.** Future readers will think of the same alternative.
9. **Stop and ask before the full plan.** Ask up to five clarifying questions about the real workflow. Wait for answers when the user has not stated them.

## Workflow checklist

Copy into the reply at the start of a design task. Tick as you complete.

```
- [ ] Read relevant governing docs and references/red-cab-design-notes.md
- [ ] Ask up to 5 clarifying questions; wait for answers when needed
- [ ] List invariants (what must always be true)
- [ ] Sketch user journey per affected actor
- [ ] Identify aggregate boundaries and owning bounded context
- [ ] Write 2 or 3 options with pros and cons
- [ ] Pick one; state why rejected options fail
- [ ] Sketch schema (rough DBML in scratchpad, no migration code)
- [ ] List risks and open questions
- [ ] Hand off: issue, ADR, explainer, or implementation spec
```

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

## Why we did not pick the other options

## Aggregates and responsibilities

## Integration points

## Risks and open questions

## Suggested next step

- [ ] Open GitHub issue (`write-issue`)
- [ ] Implementation spec (`write-implementation-spec` with governing doc table filled)
```

Use Tier A sentences in the plan body.

## Hand-off

State whether the next artifact is an issue, an ADR, an explainer, or an implementation spec. Do not merge this plan into code without an approved spec when api or web changes.
