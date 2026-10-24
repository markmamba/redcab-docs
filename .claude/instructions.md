# Red Cab Docs — AI instructions

Canonical planning repository. Human readers use the Docusaurus site; agents use this file plus `.claude/skills/`.

## Docs root

Resolve `docs/` in this order:

1. `RED_CAB_DOCS_PATH` (absolute path to `docs/`)
2. `{workspace}/redcab-docs/docs/`
3. `../redcab-docs/docs/` from a sibling app repo

Application code (read-only for fact-checking):

- `red-cab-api/` — DBML under `docs/db/`, domains under `app/domains/`
- `red-cab-web/` — routes under `app/routes/`, API clients under `app/api/`

## Document precedence

See `docs/00-09-meta/conventions/documentation-system.md`. Programs under `60-69-initiatives/61-2026/` (outside `implementation-specs/`) are not normative.

Filesystem path for specs: `60-69-initiatives/61-2026/implementation-specs/`.

## Prose

Tier A/B/C rules live in `docs/00-09-meta/conventions/prose-and-ste100.md`.

Before drafting or rewriting team-facing prose, run skill **`write-plain-english`** (or follow it when another skill says to load it first). Use **`write-tier-a-prose`** with `prose-and-ste100.md` to pick Tier A/B/C.

## Spec-first (implementation work)

Per-issue design for `red-cab-api` / `red-cab-web` belongs in an **implementation spec**, not a generic doc page.

| Step | Skill / location |
| --- | --- |
| GitHub issue body | `write-issue` (this repo) |
| Implementation spec | `docs/60-69-initiatives/61-2026/implementation-specs/_template.md` in this repo |
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
