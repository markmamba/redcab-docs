# Red Cab Docs — Agent Instructions

Canonical planning and implementation-spec repository. Published at [redcab-docs site](https://markmamba.github.io/redcab-docs/).

## Canonical docs root

All agents resolve planning docs from:

```
redcab-docs/docs/
```

Set `RED_CAB_DOCS_PATH` to the absolute path of `docs/` when working outside this monorepo layout.

> **Deprecated:** `red-cab-docs/` is frozen. Do not update it. Use this repo (`redcab-docs/docs/`).

## Site structure (Johnny Decimal)

| Area | Path | Audience |
| --- | --- | --- |
| Meta | `docs/00-09-meta/` | Conventions, start-here |
| Backend | `docs/20-29-backend/` | API conventions, infrastructure |
| Domains | `docs/30-49-domains/` | One folder for each domain: front door, decisions page, models |
| Frontend | `docs/50-59-frontend/` | Web conventions |
| Initiatives | `docs/60-69-initiatives/61-2026/` | Programs + `implementation-specs/` |
| Legacy | `docs/80-89-legacy/` | Superseded material, alias table |
| Business | `docs/70-79-business/` | Glossary (current). Invariants, requirements and planning are background |
| Engineering meta | `docs/90-99-engineering-meta/` | Cross-cutting rules |

Legacy URLs under `/docs/product/`, `/docs/architecture/`, and `/docs/engineering/` redirect to the paths above.

## Document precedence

See `docs/00-09-meta/conventions/documentation-system.md` (domain pages → engineering → **approved** specs → code). Old invariants, requirements and ADRs are background, and an old rule applies only where a domain page cites it. Program pages under `61-2026/` are not normative. We do not add new `adr-*` pages, and each domain keeps its decisions in its own folder.

## Spec-first workflow

Before implementation code is written in api/web repos:

1. Decide. Check the domain front door in `docs/30-49-domains/{nn}-{domain}/index.md`.
   - If its status is `draft`, or no entry in `{domain}-decisions.md` covers the behavior, the ruling does not exist yet.
   - Ask the owner, then add a numbered and dated entry to the decisions page with the `write-doc` skill.
   - Never copy a rule from an old spec, invariant, requirement or ADR.
2. Create `docs/60-69-initiatives/61-2026/implementation-specs/{context}/{repo}-{issue}-{slug}.md` from `docs/60-69-initiatives/61-2026/implementation-specs/_template.md`. The Governing docs table links the decision entry.
3. Review the spec against the domain pages; set `status: approved` in frontmatter when ready.
4. Implement using codegen skills in `red-cab-api` or `red-cab-web` `.claude/skills/` (approved spec path required).
5. Link spec in PR description.
6. After the merge, set the spec to `implemented` and move its lasting rules to the model page or use-case page of the domain.

See [docs/60-69-initiatives/61-2026/implementation-specs/README.md](docs/60-69-initiatives/61-2026/implementation-specs/README.md).

## Prose (ASD-STE100)

- Tier A/B/C rules: `docs/00-09-meta/conventions/prose-and-ste100.md`
- Load `.claude/skills/write-plain-english/` before any team-facing prose; use `write-tier-a-prose` to pick the tier.
- Spec narrative, explainers, issues/PRs (via `red-cab-api/AGENTS.md` and `red-cab-web/AGENTS.md`), and user-facing errors use Tier A unless noted.

## AI skills (this repo)

Conventions: `.claude/instructions.md`. Skill catalog: `.claude/README.md`.

| Skill | Purpose |
| --- | --- |
| `write-plain-english` | Prose for the team; check scripts; `references/examples.md` |
| `write-tier-a-prose` | STE Tier A/B/C; load with `prose-and-ste100.md` |
| `write-issue` | GitHub issue bodies for api, web, or docs |
| `write-doc` | Domain decision entries, domain pages, explainers, conventions |
| `system-design` | Design plan before an implementation spec |
| `mermaid-diagram` | Mermaid blocks in Docusaurus pages |

Per-issue shipping design lives in `implementation-specs/` (not `write-doc`). Create specs from `_template.md` in this repo.

## Read first (new feature work)

- Catalog work: `docs/30-49-domains/31-catalog/index.md` (front door with the current Catalog rules)
- IAM work: `docs/30-49-domains/32-iam/index.md` (front door with the current account, company and session rules)
- Bookings, Payments and Reviews work: `docs/30-49-domains/33-bookings/`, `34-payments/` and `35-reviews/`. They are drafts with no rulings yet, so start at step 1 of the spec-first workflow.
- `docs/70-79-business/71-business-rules/glossary.md`
- `docs/20-29-backend/21-conventions/domain-to-code-mapping.md`

Background only, and never a rule source unless a domain page cites it:

- `docs/70-79-business/71-business-rules/invariants.md`
- `docs/70-79-business/73-planning/`
- `docs/70-79-business/72-requirements/functional-requirements/{ctx}.md`

## Multi-PR audit series

Programs (for example `61-2026/catalog-revamp-2026/`) are non-normative. Multi-PR audit series may live under `implementation-specs/{context}/` (for example `{context}/{series}/`); mark `doc_type: program` when they are not API contracts.

## Before generating code (auth or routes)

- [IAM domain](docs/30-49-domains/32-iam/index.md) — the current rules for accounts, companies, sessions and portals
- [IAM decisions](docs/30-49-domains/32-iam/iam-decisions.md) — the rulings on sessions, portals and policy routes
