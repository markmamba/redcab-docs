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

See `docs/00-09-meta/conventions/documentation-system.md` (global rules → platform ADRs → domain rulings → engineering → **approved** specs → code). Program pages under `61-2026/` are not normative.

## Spec-first workflow

Before implementation code is written in api/web repos:

1. Create `docs/60-69-initiatives/61-2026/implementation-specs/{context}/{repo}-{issue}-{slug}.md` from `docs/60-69-initiatives/61-2026/implementation-specs/_template.md`.
2. Review with `review-implementation-spec` skill (in api or web `.ai/skills/`).
3. Set `status: approved` in spec frontmatter.
4. Implement using codegen skills with `spec_path` argument.
5. Link spec in PR description.

See [docs/60-69-initiatives/61-2026/implementation-specs/README.md](docs/60-69-initiatives/61-2026/implementation-specs/README.md).

## Prose (ASD-STE100)

- Tier A/B rules: `docs/00-09-meta/conventions/prose-and-ste100.md`
- Spec narrative, explainers, issues/PRs (via web `.ai/instructions.md`), and user-facing errors use Tier A unless noted.

## AI skills (this repo)

Conventions: `.ai/instructions.md`. Catalog: `.ai/README.md`.

| Skill | Purpose |
| --- | --- |
| `write-tier-a-prose` | Tier A/B prose, bullets, naming; check scripts |
| `write-issue` | GitHub issue bodies for api, web, or docs |
| `write-doc` | Explainers, ADRs, bounded-context pages, conventions |
| `system-design` | Design plan before an implementation spec |
| `mermaid-diagram` | Mermaid blocks in Docusaurus pages |

Per-issue shipping design uses `write-implementation-spec` / `review-implementation-spec` in `red-cab-api` or `red-cab-web`, not `write-doc`.

## Read first (new feature work)

- `docs/70-79-business/71-business-rules/glossary.md`
- `docs/70-79-business/71-business-rules/invariants.md`
- `docs/70-79-business/73-planning/open-questions.md`
- `docs/70-79-business/73-planning/web-platform-program-strategy.md`
- Relevant `docs/70-79-business/72-requirements/functional-requirements/{ctx}.md`
- Relevant `docs/30-49-domains/31-bounded-contexts/{context}.md`
- `docs/20-29-backend/21-conventions/domain-to-code-mapping.md`

## Multi-PR audit series

Programs (for example `61-2026/catalog-revamp-2026/`) are non-normative. Multi-PR audit series may live under `implementation-specs/{context}/` (e.g. `iam/iam-audit-2026-08/`); mark `doc_type: program` when they are not API contracts.

## Before generating code (auth or routes)

- [Authentication series](docs/90-99-engineering-meta/93-authentication/) — normative target design (ADR-018/019 Accepted; phased applicability)
- [Authentication implementation roadmap](docs/90-99-engineering-meta/93-authentication/implementation-roadmap.md) — Phase 0–5 gates and open questions
- [Web platform program strategy](docs/70-79-business/73-planning/web-platform-program-strategy.md) — tourist UI vs auth redesign coordination
