# Doc templates

Per-issue shipping design is not a `write-doc` page. Use `implementation-specs/` in this repo.

## Facts ledger (all doc types)

Write `scratchpad/facts-{slug}.md` before the draft. One row per fact.

```markdown
# Facts: {slug}

| # | Fact | Source | Checked | In the page |
| --- | --- | --- | --- | --- |
| 1 | | doc path, code path, or "user stated" | code / user / derived / unverified | section name, after draft |
```

- Checked: how the fact was confirmed.
- In the page: empty until the draft exists; then section + row or step (not line numbers).
- Proposed rules go to `## Open questions` as "proposed, not agreed".

## Explainer (`74-explainers/`)

```markdown
---
title: "{Plain title}"
description: "{One sentence for SEO and sidebar.}"
---

## TL;DR

-

## About this document

Non-normative explainer. Authoritative rules live in requirements and business rules.

| Topic | Document |
| --- | --- |
| Glossary | [Glossary](/docs/70-79-business/business-rules/glossary) |
| | |

---

## {First section}

```

Section hints:

- **TL;DR**: At most five bullets, one fact each. Write last.
- **Body sections**: Tier A prose. Link `FR-*`, `INV-*`, and glossary terms instead of redefining them.
- **Diagrams**: Use skill `mermaid-diagram`. One sentence summary above each diagram.

## ADR (`34-architecture-decisions/`)

```markdown
---
title: "ADR-NNN: {Decision title}"
sidebar_label: ADR-NNN
sidebar_position: N
description: "{One line.}"
---

## TL;DR

-

## About this document

| Topic | Document |
| --- | --- |
| Contexts | [Bounded contexts](/docs/30-49-domains/bounded-contexts) |
| Open questions | [Open questions](/docs/70-79-business/planning/open-questions) |

---

## Context

## Decision

## Consequences

## Alternatives considered
```

Section hints:

- **Context**: Problem space and constraints. No full implementation spec.
- **Decision**: One clear statement. Use **shall** / **may** only when citing normative requirements.
- **Alternatives considered**: Table with Option | Why not chosen | One row per real alternative.
- Tier C prose is allowed in rationale; TL;DR and Decision stay Tier A.

## Bounded context (`31-bounded-contexts/`)

```markdown
---
title: "{Context name}"
description: "{Owns which aggregates and integrations.}"
---

## TL;DR

-

## About this document

| Topic | Document |
| --- | --- |
| Domain models | [Domain models](/docs/30-49-domains/domain-models/domain-models) |
| Invariants | [Invariants](/docs/70-79-business/business-rules/invariants) |

---

## Purpose

## Core concepts

## Integrations

## Related requirements
```

Section hints:

- **Purpose**: One paragraph on what this context owns and what it does not own.
- **Core concepts**: Glossary-aligned terms; link domain model sections.
- **Integrations**: Table or bullets: partner context, direction of dependency, ACL pattern.
- **Related requirements**: Links to `FR-*` files, not pasted requirement text.

## Engineering convention

Follow the nearest page in the same folder for heading order. Include links to `domain-to-code-mapping.md` when the page affects api or web layout.

Skeleton when no sibling exists:

```markdown
---
title: "{Convention title}"
description: "{One line.}"
---

## TL;DR

-

## About this document

| Topic | Document |
| --- | --- |
| Domain to code | [Domain to code mapping](/docs/20-29-backend/conventions/domain-to-code-mapping) |

---

## When to use this

## Rules

## Examples

## Related docs
```
