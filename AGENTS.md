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
| Domains | `docs/30-49-domains/` | Bounded contexts, ADRs, domain models |
| Frontend | `docs/50-59-frontend/` | Web conventions |
| Initiatives | `docs/60-69-initiatives/61-2026/` | Programs + `implementation-specs/` |
| Catalog (pilot domain) | `docs/30-49-domains/38-catalog/` | Normative Catalog rulings (growing) |
| Legacy | `docs/80-89-legacy/` | Superseded material, alias table |
| Business | `docs/70-79-business/` | Rules, requirements, planning |
| Engineering meta | `docs/90-99-engineering-meta/` | Authentication series, cross-cutting |

Legacy URLs under `/docs/product/`, `/docs/architecture/`, and `/docs/engineering/` redirect to the paths above.

## Document precedence

See `docs/00-09-meta/conventions/documentation-system.md` (domain pages → engineering → **approved** specs → code). Old invariants, requirements and ADRs are background, and an old rule applies only where a domain page cites it. Program pages under `61-2026/` are not normative. We do not add new `adr-*` pages, and each domain keeps its decisions in its own folder.

## Spec-first workflow

Before implementation code is written in api/web repos:

1. Create `docs/60-69-initiatives/61-2026/implementation-specs/{context}/{repo}-{issue}-{slug}.md` from `docs/60-69-initiatives/61-2026/implementation-specs/_template.md`.
2. Review the spec against the domain pages; set `status: approved` in frontmatter when ready.
3. Implement using codegen skills in `red-cab-api` or `red-cab-web` `.claude/skills/` (approved spec path required).
5. Link spec in PR description.

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
| `write-doc` | Explainers, ADRs, bounded-context pages, conventions |
| `system-design` | Design plan before an implementation spec |
| `mermaid-diagram` | Mermaid blocks in Docusaurus pages |

Per-issue shipping design lives in `implementation-specs/` (not `write-doc`). Create specs from `_template.md` in this repo.

## Read first (new feature work)

- Catalog work: `docs/30-49-domains/38-catalog/index.md` (front door with the current Catalog rules)
- IAM work: `docs/30-49-domains/39-iam/index.md` (front door with the current account, company and session rules)
- `docs/70-79-business/71-business-rules/glossary.md`
- `docs/20-29-backend/21-conventions/domain-to-code-mapping.md`

Background only, and never a rule source unless a domain page cites it:

- `docs/70-79-business/71-business-rules/invariants.md`
- `docs/70-79-business/73-planning/`
- `docs/70-79-business/72-requirements/functional-requirements/{ctx}.md`
- `docs/30-49-domains/31-bounded-contexts/{context}.md`

## Multi-PR audit series

Programs (for example `61-2026/catalog-revamp-2026/`) are non-normative. Multi-PR audit series may live under `implementation-specs/{context}/` (e.g. `iam/iam-audit-2026-08/`); mark `doc_type: program` when they are not API contracts.

## Before generating code (auth or routes)

- [IAM domain](docs/30-49-domains/39-iam/index.md) — the current rules for accounts, companies, sessions and portals
- [Authentication series](docs/90-99-engineering-meta/93-authentication/) — describes the code as it runs until the new sessions ship (ADR-018 and ADR-019 are superseded)
- [Web platform program strategy](docs/70-79-business/73-planning/web-platform-program-strategy.md) — tourist UI vs auth redesign coordination
