---
title: "{Short title — what ships, plain language}"
sidebar_label: "{Repo} · {Short label}"
issue: "https://github.com/markmamba/{repo}/issues/{N}"
repos:
  - red-cab-api
  - red-cab-web
status: draft
phase: 1
context: BKG
---

## TL;DR

- {What ships — 1 bullet}
- {What does NOT ship — 1 bullet}
- {Breaking change: Yes/No}

## Problem

{What is broken or missing? Link evidence: file paths, test names, issue quote.}

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| FR-???-??? | [requirements/functional-requirements/](../requirements/functional-requirements/) | Observable behavior |
| ADR-??? | [architecture/decisions/](/docs/architecture/decisions/) | Architecture constraint |
| INV-? | [/docs/product/business-rules/invariants](/docs/product/business-rules/invariants) | Invariant |
| AMB-??? | [/docs/product/planning/open-questions](/docs/product/planning/open-questions) | Open decision (if any) |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | | | |

## API contract

_Applies when `red-cab-api` is in `repos`. Delete section if not._

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/tourists/...` | JWT tourist | | | |

### Files to create or modify (API)

- `config/routes/...`
- `app/controllers/...`
- `app/domains/.../{request,validator,manager,serializer}.rb`

## Web contract

_Applies when `red-cab-web` is in `repos`. Delete section if not._

| Surface | Route | Loader | API module | Auth HOC |
| --- | --- | --- | --- | --- |
| Tourist | `/account/...` | `clientLoader` | `tourist-*-api.js` | `withTouristAuth` |

### Files to create or modify (Web)

- `app/routes/...`
- `app/api/...`
- `app/domains/...`

## Data / domain touchpoints

- Bounded context: {CAT | BKG | IAM | ...}
- Transaction boundaries: {e.g. CR-1 checkout + seat reserve}
- Snapshots: {which facts are frozen and when}

## Out of scope

- {Explicit exclusions to prevent scope creep}

## Tasks

### API

- [ ] ...

### Web

- [ ] ...

### Docs

- [ ] Set spec `status: implemented` after merge

## Acceptance criteria

- [ ] {Maps to FR-* or issue checklist}
- [ ] Integration test: `test/integration/...`
- [ ] No client-side price computation
- [ ] {Context-specific checks}

## Verification

```bash
# API (from red-cab-api/)
bin/rails test test/integration/...
bundle exec srb tc
bundle exec rubocop

# Web (from red-cab-web/)
npm run lint
npm run test
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| | | `review-implementation-spec` | |
