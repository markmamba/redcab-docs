---
name: model-spec
description: "Write or complete the model page of one Red Cab domain model or aggregate, with its structure, states, contract and use cases, checked against the DBML and the code. Use when the user asks to specify, document or formalize a model, to list every use case of a model, or types /model-spec. Not for a per-issue implementation spec (use implementation-specs/_template.md) and not for a domain ruling (use write-doc, decision entry). Loads write-plain-english first."
argument-hint: "[domain] [model]"
---

# model-spec

A model page says what a model supports, how its states move, and what its contract is.
- It holds what stays true after a spec ships.
- It does not say what is built and what is not. GitHub issues track that.

Read `.claude/skills/write-plain-english/SKILL.md` first.

## Input

The user gives a domain and a model, for example `/model-spec catalog asset-availability`.
- When either is missing, ask.
- The domain must have a folder under `docs/30-49-domains/`.

## Output

One page at `docs/30-49-domains/{nn}-{domain}/models/{slug}.md`.
- The page follows the *Model page skeleton* in `.claude/skills/write-doc/references/templates.md`.
- A model with user flows also gets rows in `use-cases/{slug}.md` of the same domain. Follow the nearest sibling page.
- The page links to the decision entry for each reason. It never repeats the reason.

## Process

### 1. Read the domain

- Read `docs/30-49-domains/{nn}-{domain}/index.md`, and the rows of its *Rule index*.
- Read `{domain}-decisions.md` for every entry that touches the model.
  - When the front door has `status: draft`, or no entry covers the behavior, stop and ask the owner. See step 1 of the spec-first workflow in `AGENTS.md`.
- Never copy a rule from an old spec, invariant, requirement or ADR.

### 2. Read the schema and the code

- The DBML in `red-cab-api/docs/db/` is the schema truth: columns, types, indexes, foreign keys and table notes.
- The model file under `red-cab-api/app/domains/{domain}/` gives the associations, the enums and the nested attributes that mark aggregate children.
- When the DBML and the code disagree, say so in the hand-off. Do not guess.
- When the model does not exist in code yet, work from the decisions page only, and mark every column as proposed.

### 3. Read the operations on the model

- Managers, validators and serializers under `red-cab-api/app/domains/{domain}/` show business rules already in code.
- Controllers and routes show which endpoints exist.
- Web routes and API clients in `red-cab-web/` show who uses the model.
- Each manager or validator reveals one or more use cases.

### 4. List every use case

Walk the whole life of the model. Ask each question below.

| Phase | Questions |
| --- | --- |
| Creation | Who creates it, what triggers it, what must be true first, what children appear with it |
| Reads | Is there a list, a detail, and an embedded view, and who sees each |
| Updates | Can it change after creation, and under what guard |
| States | Which transitions exist, what triggers each, and what side effects follow |
| Downstream | Who references it, and do they copy values or join at read time |
| End | Is it deleted, archived, superseded or expired |

For each aggregate root, also ask:
- Are the children always created with the root, or added later?
- Can a child change without the root?
- What happens to the children when the root changes state?

For each edit use case, check two things:
- Is the model still in an early state where an edit is safe?
- Does any later record already copy or reference it? If yes, the use case must not allow an edit, and the correction is a new record.

### 5. Draw the context

Follow skill `mermaid-diagram`. The diagram shows:
- the subject model, with `class <node> subject`
- the aggregate boundary, as a dashed subgraph around the root and its children
- same-domain models as `host`, and other domains as `external`
- edge labels that say what happens, such as "copies price into", not cardinality

### 6. Write the page

- Start from the user stories the model serves: "As {role}, I want {goal}, so {reason}". Name the real role.
- Write rules as testable statements in a table with Rule, Applies to and Example.
- Show code, not a description of it: 2 to 5 verbatim lines under the claim, with `# path:start-end` first.
- When the design rejects an obvious alternative, name it and say why it lost.
- State current truth only. History belongs on the decisions page.
- A product decision that nobody made goes under *Open questions* as "proposed, not agreed".
- Put no `TODO` or `FIXME` in the page.
- Give a subtopic its own `###` heading, so it shows in the table of contents.
- Name another page and the idea in a cross-reference: "`Catalog::Asset` use case 5", never a nickname.

### 7. Check the schema gaps

Compare the use cases with the DBML.
- List each column, index or constraint the use cases need and the schema lacks.
- Put the list under *Open questions*, with the person who answers.
- When the model does not exist in code yet, skip this step.

### 8. Check and hand off

- Run the four scripts from `write-plain-english` and the colour check from `mermaid-diagram`. Each must report 0.
- Run `npm run build`.
- Show the user the page, and ask whether a use case is missing, a rule is wrong, or the aggregate boundary is wrong.
- Hand off in five lines: path, deviations from the skeleton, open questions, unverified facts, DBML and code mismatches.
- Do not commit, push or open a PR unless the user asks.
