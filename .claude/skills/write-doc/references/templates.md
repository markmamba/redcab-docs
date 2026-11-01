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
- **Body sections**: Tier A prose. Link decision entries and glossary terms instead of redefining them.
- **Diagrams**: Use skill `mermaid-diagram`. One sentence summary above each diagram.

## Decision entry (`{domain}-decisions.md`)

Add the entry at the end of the numbered entries, before *Open questions*.

```markdown
## D{n} — {Title} ({YYYY-MM-DD}) \{#{slug}\}

{One sentence: the ruling.}

- {One rule. One sentence.}
- {Another rule.}
- Replaces: {Only when it replaces a ruling that the code still follows.}
- Structure: [{Model page}](./models/{page}.md)

### Why \{#{slug}-why\}

- {The use case or the problem. One sentence.}

### What changes with it \{#{slug}-changes\}

- {A lasting effect on code, data or another domain.}

### Options we did not choose \{#{slug}-options\}

| Option | Why not chosen |
| --- | --- |
| {Option} | {Reason} |
```

Section hints:

- **Number**: the last number plus one. Never reuse a number and never renumber.
- **Date**: the day the principal developer approved the ruling.
- **Anchor**: the slug never changes after the entry is published.
- **Small entry**: a short ruling may omit the three sub-sections. A big ruling keeps all three.
- **Rule index**: add one row to the *Rule index* table of the front door.
- **Old rules**: name an old rule only in a *Replaces* bullet.

## Domain page (`{nn}-{domain}/`)

The front door is `index.md`. A model page is `models/{slug}.md`. A use-case page is `use-cases/{slug}.md`.

Front door skeleton:

```markdown
---
title: {Domain} domain
sidebar_label: {Domain} domain
sidebar_position: 1
description: Start here. {One sentence.}
doc_type: domain-overview
normative: {false while draft, true when current}
status: {draft | current}
context: {domain}
last_reviewed: {YYYY-MM-DD}
---

## TL;DR \{#{domain}-overview\}

-

## About this document

| Topic | Document |
| --- | --- |
| Precedence of documents | [Documentation system](../../00-09-meta/conventions/documentation-system.md#precedence) |
| Rulings | [{Domain} decisions](./{domain}-decisions.md) |
| Column truth | The DBML file in `red-cab-api/docs/db/` |

## Words used in this doc \{#words\}

## The model on one page \{#model\}

## Reading order \{#reading-order\}

## Rule index \{#rule-index\}

## Do not do \{#do-not-do\}

## Open questions \{#open-questions\}
```

Model page skeleton:

```markdown
---
title: {Model name}
sidebar_label: {Short label}
description: {One sentence.}
doc_type: model-spec
normative: true
status: current
context: {domain}
last_reviewed: {YYYY-MM-DD}
---

## TL;DR

-

## About this document

| Topic | Document |
| --- | --- |
| Rulings | [{Domain} decisions](../{domain}-decisions.md#{slug}) |
| Column truth | The DBML file in `red-cab-api/docs/db/` |

## Words used in this doc \{#words\}

## Structure \{#structure\}

## States \{#states\}

## Contract \{#contract\}

## Worked example \{#worked-example\}
```

Section hints:

- A model page holds what stays true after the spec ships: tables in words, states, the endpoint contract and payloads.
- A model page links to the decision entry for the reason. It does not repeat the reason.
- Move content here from an implementation spec when the spec reaches `implemented`.
- A front door of a new domain starts with `status: draft` and with *First questions* in place of the rule index.

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
