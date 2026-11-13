---
title: Implementation Specs
sidebar_label: Specs
sidebar_position: 1
description: Per-issue implementation specs. A spec is a work record that is committed before code.
---

## TL;DR

- One **implementation spec** exists for each GitHub issue, or for each pull request when an issue is large.
- A spec turns the domain pages into code in `red-cab-api` and `red-cab-web`.
- The status must be **`approved`** before a codegen skill runs.
- A spec is a **work record**.
  - A rule that stays true after the issue ships belongs to the domain, see [Lasting rules move to the domain](#lasting-rules).
- When scope or design changes, update the spec first and then the code.
- Program and audit plans are not specs.
  - They live next to the specs under `61-2026/`, for example [Catalog revamp 2026](../catalog-revamp-2026/index.md).

## About this document

This page says how to write, review and link implementation specs.

The [Documentation system](../../../00-09-meta/conventions/documentation-system.md#documentation-system) page gives the precedence and the doc types.

Narrative sections follow [Prose and ASD-STE100](../../../00-09-meta/conventions/prose-and-ste100.md).

Contract tables and file paths stay exact.

| Topic | Document |
| --- | --- |
| Prose (STE100) | [Prose and ASD-STE100](../../../00-09-meta/conventions/prose-and-ste100.md) |
| Spec template | `_template.md` (repo file, not published) |
| Catalog rulings | [Catalog decisions](../../../30-49-domains/31-catalog/catalog-decisions.md) |
| IAM rulings | [IAM decisions](../../../30-49-domains/32-iam/iam-decisions.md) |
| Backend conventions | [Backend](../../../20-29-backend/21-conventions/backend.md) |
| Frontend conventions | [Frontend](../../../50-59-frontend/51-conventions/frontend.md) |

---

## Workflow

1. **Decide.**
   - Open the front door of the domain.
   - If its status is `draft`, or no decision entry covers the behavior, the ruling does not exist yet.
   - Ask the owner, then add a numbered and dated entry to the decisions page with the `write-doc` skill.
   - Never copy a rule from an old spec, invariant, requirement or ADR.
2. **Write.**
   - Copy `_template.md` to `{context}/{repo}-{issue}-{slug}.md`.
   - Fill all sections in plain English, see the `write-plain-english` skill.
   - The Governing docs table links the decision entry that the spec implements.
3. **Review.**
   - The owner reviews the spec in the docs pull request.
   - Fix the findings.
   - Set `status: approved` in the frontmatter.
4. **Implement.**
   - Use a codegen skill of the repo, such as `new-endpoint` or `creating-route-pages`.
   - Give it the path of the spec as `spec_path`.
5. **Verify.**
   - Run the verification commands of the spec.
   - Run `review-rails-style` or `review-react-style`.
6. **Open the pull request.**
   - Link the spec path in the pull request description.
7. **Move the lasting rules.**
   - Do this when the spec reaches `implemented`, see the next section.

## Lasting rules move to the domain \{#lasting-rules\}

A spec says what one issue ships.

A domain page says what stays true.

| Content | Home |
| --- | --- |
| Scope, steps, tests, rollout, verification commands | The spec |
| Endpoint contract, payloads, validation and states that stay true | A model page in `models/` or a use-case page in `use-cases/` of the domain folder |
| A ruling, its reason and the options we did not choose | The domain decisions page, as a numbered and dated entry |

- When a spec reaches `implemented`, move its lasting rules to the model page or the use-case page.
- Do the same when someone next changes the spec.
- The spec then links to that page and does not copy it.
- A spec never holds the only copy of a lasting rule.
- An example of a model page is [Listings and packages](../../../30-49-domains/31-catalog/models/listings-and-packages.md).
- Old specs that no current rule depends on are in [Legacy](../../../80-89-legacy/index.md).
- Do not cite an old spec.

## Naming

### Filename

The filename is the machine identity of the spec.

```
60-69-initiatives/61-2026/implementation-specs/{context}/[{module}/]{repo}-{issue}-{slug}.md
```

- `repo` is `api`, `web` or `docs`.
- `context` matches the `context:` frontmatter field, for example `IAM` or `CAT`.

Examples:

- `cat/api-168-cancellation-policy-presets-and-custom-tiers.md`
- `iam/web-56-tourist-access-and-route-contract.md`
- `cat/geography/api-131-migrate-geography-schema.md`

### Title

The title is for human readers.

- **`title`** names the outcome in plain words.
  - Do not put an issue or pull request number in it.
- **`sidebar_label`** is a short optional label.
  - Use `Web ·`, `API ·` or `Docs ·` to show the repo.
- **`issue:`** holds the GitHub URL for traceability.
  - Agents and pull requests use it together with the filename.

| Filename | `title` | `sidebar_label` |
| --- | --- | --- |
| `web-56-tourist-access-and-route-contract.md` | Tourist access model and public route contract | Web · Tourist access |
| `api-131-migrate-geography-schema.md` | Migrate geography schema to administrative tree | API · Geography migration |

## Status values

| Status | Meaning |
| --- | --- |
| `draft` | Work in progress, not ready for review. |
| `review` | Ready for the owner to review. |
| `approved` | The design is locked, and codegen may proceed. |
| `superseded` | A newer spec or a domain ruling replaces it, so do not use it as `spec_path`. |
| `implemented` | The code is merged, and the spec is a historical record. |

The frontmatter field `superseded_by:` may hold the path or URL of the replacement.

## Precedence

An implementation spec sits below the domain pages and the engineering conventions.

The [Documentation system](../../../00-09-meta/conventions/documentation-system.md#precedence) page gives the full order.

A spec must not contradict a domain ruling.

If it seems to, fix the spec or ask the owner.

## Linking

- **Upstream:** link to the domain decision entry in the Governing docs table.
  - Do not cite an old requirement, invariant or ADR.
- **Downstream:** the pull request description holds the line `Spec: docs/60-69-initiatives/61-2026/implementation-specs/{context}/{filename}.md`.
- **Series:** a series of pull requests may use a folder with an `index.md`.
  - The `index.md` is a planning page, so set `doc_type: program` when it defines no API contract.
