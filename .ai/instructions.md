# Red Cab Docs — AI instructions

Canonical planning repository. Human readers use the Docusaurus site; agents use this file plus `.ai/skills/`.

## Docs root

Resolve `docs/` in this order:

1. `RED_CAB_DOCS_PATH` (absolute path to `docs/`)
2. `{workspace}/redcab-docs/docs/`
3. `../redcab-docs/docs/` from a sibling app repo

Application code (read-only for fact-checking):

- `red-cab-api/` — DBML under `app/docs/db/`, domains under `app/domains/`
- `red-cab-web/` — routes under `app/routes/`, API clients under `app/api/`

## Document precedence

When sources disagree, higher layers win:

1. Business rules (`70-79-business/71-business-rules/`)
2. Requirements (`70-79-business/72-requirements/`)
3. Domain models (`30-49-domains/32-domain-models/`)
4. Architecture and ADRs (`30-49-domains/34-architecture-decisions/`)
5. Engineering conventions (`20-29-backend/`, `50-59-frontend/`, `90-99-engineering-meta/`)
6. Implementation specs (`60-69-initiatives/61-implementation-specs/`)
7. Application code

## Prose

Tier A/B/C rules live in `docs/00-09-meta/conventions/prose-and-ste100.md`.

Before drafting or rewriting team-facing prose, run skill **`write-tier-a-prose`** (or follow it when another skill says to load it first).

## Spec-first (implementation work)

Per-issue design for `red-cab-api` / `red-cab-web` belongs in an **implementation spec**, not a generic doc page.

| Step | Skill / location |
| --- | --- |
| GitHub issue body | `write-issue` (this repo) |
| Implementation spec | `write-implementation-spec` in `red-cab-api` or `red-cab-web` |
| Spec review | `review-implementation-spec` in api or web |
| Codegen | `new-endpoint`, `new-model`, `creating-route-pages`, etc. with `spec_path` |

Do not use `write-doc` for implementation specs. Point the user at the api/web spec skills instead.

## Doc types (this repo)

| Need | Skill | Output location |
| --- | --- | --- |
| Issue for engineers | `write-issue` | GitHub (`red-cab-api`, `red-cab-web`, `redcab-docs`) |
| Explainer, ADR, context page, convention page | `write-doc` | See skill |
| Early design before a spec | `system-design` | `scratchpad/design-*.md` |
| Mermaid in a page | `mermaid-diagram` | Block inside target `index.md` |

## Scratchpad

Drafts and fact ledgers go under `scratchpad/` at the repo root. Do not commit scratchpad files unless the user asks. The directory is gitignored.

Naming:

- `scratchpad/facts-{slug}.md` — one row per fact with source
- `scratchpad/doc-draft-{slug}.md` — doc draft before move
- `scratchpad/design-{slug}.md` — system-design output

## Build

After adding or moving pages under `docs/`:

```bash
npm run build
```

Fix broken links before hand-off.

## Facts discipline

Every normative sentence must trace to a source: governing doc ID, file path, test name, or explicit user statement.

- Unverified facts stay out of normative sections; list them under **Open questions** or in the hand-off.
- Do not invent `FR-*`, `INV-*`, or `ADR-*` citations. Read the files or leave the cell empty and ask.

## Commands

```bash
npm run start    # local preview
npm run build    # production build check
```
