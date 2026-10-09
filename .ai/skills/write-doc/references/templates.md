# Doc templates

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

## Engineering convention

Follow the nearest page in the same folder for heading order. Include links to `domain-to-code-mapping.md` when the page affects api or web layout.
