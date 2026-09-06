# Red Cab Docs — Agent Instructions

Canonical planning and implementation-spec repository. Published at [redcab-docs site](https://markmamba.github.io/redcab-docs/).

## Canonical docs root

All agents resolve planning docs from:

```
redcab-docs/docs/
```

Set `RED_CAB_DOCS_PATH` to the absolute path of `docs/` when working outside this monorepo layout.

> **Deprecated:** `red-cab-docs/` is frozen. Do not update it. Use this repo (`redcab-docs/docs/`).

## Document precedence

1. Business Rules (`docs/business-rules/`)
2. Requirements (`docs/requirements/`)
3. Domain Models (`docs/domain/`)
4. Architecture + ADRs (`docs/architecture/`)
5. Engineering (`docs/engineering/`)
6. **Implementation specs** (`docs/specs/`) — per-issue design
7. Code (`red-cab-api/`, `red-cab-web/`)

## Spec-first workflow

Before implementation code is written in api/web repos:

1. Create `docs/specs/{issue-id}-{slug}.md` from `docs/specs/_template.md`.
2. Review with `review-implementation-spec` skill (in api or web `.ai/skills/`).
3. Set `status: approved` in spec frontmatter.
4. Implement using codegen skills with `spec_path` argument.
5. Link spec in PR description.

See [docs/specs/README.md](docs/specs/README.md).

## Read first (new feature work)

- `docs/business-rules/glossary.md`
- `docs/business-rules/invariants.md`
- `docs/ambiguities/open-questions.md`
- Relevant `docs/requirements/functional-requirements/{ctx}.md`
- Relevant `docs/architecture/bounded-contexts/{context}.md`
- `docs/engineering/domain-to-code-mapping.md`

## Multi-PR audit notes

Large audits live in `docs/roadmap/notes/`. Link from specs when an issue is part of that series.
