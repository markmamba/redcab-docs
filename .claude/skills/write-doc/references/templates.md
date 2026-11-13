# Doc templates

Per-issue shipping design is not a `write-doc` page. Use `implementation-specs/` in this repo.

Contents:
- The facts ledger (all doc types)
- Explainer
- Decision entry
- Domain page, with the front door and the model page
- Engineering convention
- Feature design doc
- Runbook

Every section has two parts: what goes in it, and a filled example.
- The examples of the feature design doc and the runbook are illustrative. The names in them are not real columns or rulings.
- A section with nothing to say is left out, and no section is renamed.

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
- **Body sections**: plain-English prose. Link decision entries and glossary terms instead of redefining them.
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

## Feature design doc (`60-69-initiatives/61-2026/{feature}/index.md`)

Use it when a change to how the system works needs a design before any issue exists, and no domain ruling covers it yet.
- It lives with the programs under `61-2026/`, so it is non-normative until its rulings become decision entries.
- The rulings it needs go to the owner first, and then to `{domain}-decisions.md`.
- Per-issue shipping design stays in `implementation-specs/`.

The sections, in this order, and no others:

```markdown
# {Feature name, a noun phrase}

## TL;DR                      (only when the page passes 1,000 words)
## Words used in this doc
## Problem
### Worked example: {one person or value}
### What the data shows       (only when counts exist)
## Context
## User stories
## Rules
## Direction
### Worked example: {the same person}, after the change   (optional)
### {One heading per surface: Database, Backend, Web, Email}
## Rejected options
## Out of scope
## Rollout
### Existing records
### Dry run
### After release
## Open questions
```

### `## TL;DR`

- At most five bullets, written last, one fact each.
- The limit, the mechanism, the change the user sees, and what stays the same.

### `## Words used in this doc`

- A table with the columns Word and Meaning, and the meaning is one plain sentence.
- Only the words a reader needs that no section explains where it uses them. Usually 5 to 10 rows.
- The Word column names the kind: "the table `bookings`", "the model `Booking::Reservation`", "provider owner".
- A column the page adds is defined once, in the `### Database` table, and not here.

```markdown
## Words used in this doc

| Word | Meaning |
| --- | --- |
| Tourist | A person who books a ride on the marketplace |
| Provider owner | The person who owns a provider company and its listings |
| The model `Booking::Reservation` | One booking of a listing by a tourist, in the table `bookings` |
| Checkout hold | The seats that stay reserved for a tourist while they pay |
```

### `## Problem`

- The lead sentence names who suffers and what they suffer, in business words.
  - No table, column, service or file name appears in this section.
- A technical problem with no business cost is still a problem, and the lead says what it costs engineers.
- Then the facts that show the problem is real: a report, a count, a ticket.
- The last bullet states the goal.
- `### Worked example` walks one real person through the problem, as numbered steps.
  - It composes facts already on the page, so it adds no fact. The ledger marks it derived.
- `### What the data shows` holds the counts, each with its source and a one-line reading.

```markdown
## Problem

Tourists lose their checkout hold while they still type their card number.
- A hold lasts 10 minutes, and the payment form takes longer on a slow phone.
- The tourist pays for seats that another tourist has already booked, and support refunds the payment.
- The goal is that a tourist who started paying in time can finish paying.

### Worked example: Mika on a slow connection

1. Mika selects 2 seats at 09:00 and the hold starts.
2. Mika opens the payment form at 09:07 and types the card number until 09:11.
3. The hold ended at 09:10, so the seats are free, and another tourist books them at 09:10.
4. Mika's payment is accepted at 09:11 and support must refund it.
```

### `## Context`

- The parts of the system the problem touches, each as a black box: what it does, not how.
- One bullet per part, with a link to the page that explains it.
- The current state, in the order it happens.
- The constraints that bound the design: a launch, a budget, a deadline.
- No columns, no code, no history.

### `## User stories`

- One line per story, numbered `US-1`, `US-2`, in the form "As {role}, I want {goal}, so {reason}".
- The actor is a person's role: tourist, provider owner, Red Cab admin. Never "a user" or "the system".
  - For an automatic behaviour, name the role who benefits.
  - The behaviour itself is a `## Rules` row with `Applies to` set to "always".
- Each line is specific enough to become one or more rows of `## Rules`.

```markdown
## User stories

- US-1: As a tourist, I want my hold to stay while I pay, so I do not pay for seats I lose.
- US-2: As a provider owner, I want no double booking, so I never turn a paying guest away.
- US-3: As Red Cab support, I want fewer refund cases, so I can answer real problems.
```

### `## Rules`

- A table with the columns Rule, Applies to and Example, and never a prose paragraph.
- `Applies to` holds a story number, or the word "always".
- The example is one concrete value or person.

```markdown
## Rules

| Rule | Applies to | Example |
| --- | --- | --- |
| A hold ends 10 minutes after it starts | always | Mika's hold from 09:00 ends at 09:10 |
| A payment started before the hold ends extends the hold until the payment result | US-1 | Mika's card step started at 09:07, so the hold stays |
| An extended hold never lasts more than 15 minutes in total | US-2 | Mika's hold ends at 09:15 at the latest |
```

### `## Direction`

- The lead sentence states the solution in business words, then one bullet per change a person sees.
- Then one `###` per surface the change touches: Database, Backend, Web, Email, in that order.
- Under each surface: the tables and columns in a table, and the services by name.
  - A column carries its table: `bookings.hold_expires_at`.
- A claim about code shows 2 to 5 verbatim lines under it, with `# path:start-end` first.
- A diagram goes here when the flow has a branch, a state change or a relationship between records. Use skill `mermaid-diagram`.
- A single path of steps is a numbered list.

### `## Rejected options`

- A table with the columns Option, How it works and Why it lost.
- Every option a reader will think of, so nobody asks "why not X" in review.
- The chosen option is not in this table, because `## Direction` holds it.

### `## Out of scope`

- One line per thing this page does not change, with where it is handled instead.
- A side finding from the design work gets its own issue, and the line names it.

### `## Rollout`

- Numbered steps in deploy order, each one a change that can ship alone.
- `### Existing records` says what happens to rows that exist today, and whether we backfill.
- `### Dry run` names the report a person reads before the change is live, and reads again after.
  - A feature behind a flag, a shadow period or a count query are all dry runs.
- `### After release` is a table with the columns What we watch, How often and Who.
  - The first row is the measure that shows the change worked, with its value today.
  - Every row names the person who reads it, because a report nobody reads is cut.
  - When the person or the value is not known, write "Not set" and add an open question.

### `## Open questions`

- A table with the columns Question, Who answers and Status.
- Status is "open", or "proposed, not agreed" for a rule, number or decision the AI proposed and nobody discussed.
- Implementation details are not open questions, because the engineer decides them in the PR.

### Self-check for a feature design doc

| Check | How |
| --- | --- |
| Every story has a rule | Each `US-n` appears in the `Applies to` column at least once, or the page explains why not |
| Every rule has an example | No empty `Example` cell |
| The rejected option is named | Each option says why it lost, in one sentence |
| The rollout names its dry run | A report a person reads before the change goes live, and reads again after |
| The problem is in business words | `## Problem` names no table, column, service or file |
| Context is a black box | `## Context` links the page of each neighbour and never lists its columns |

## Runbook (`90-99-engineering-meta/` or the area it belongs to)

A runbook holds the steps a person runs by hand, so the next person runs them the same way.
- Each step is one action, with its command or click under it.
- The check after the steps says what a good result looks like.

```markdown
# {Task, a verb phrase: Deploy red-cab-api to staging}

## Words used in this runbook
## When to run this
## Before you start
## Steps
## Check the result
## If it goes wrong
## Who to tell
```

- `## When to run this`: the trigger, in one sentence, and who asks for it.
- `## Before you start`: the access you need, the backup you take, and the person you tell first.
- `## Steps`: numbered, one action each, with the command in a fenced block under the step.
- `## Check the result`: the command or screen that shows the task worked, with the expected value.
- `## If it goes wrong`: how to undo each step, in reverse order.
- `## Who to tell`: the people or channels that need to know it is done.
