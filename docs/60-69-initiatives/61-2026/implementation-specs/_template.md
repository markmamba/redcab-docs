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

_Write plain English: short bullets, one idea each.

See [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100)._

- {What ships — 1 bullet}
- {What does NOT ship — 1 bullet}
- {Breaking change: Yes/No}

## Problem

{What is broken or missing?

Active voice, short sentences.

Link evidence: file paths, test names, issue quote.}

## User stories

_One line each, numbered.

Name the real role: tourist, provider owner, Red Cab admin.

Never "a user"._

- US-1: As {role}, I want {goal}, so {reason}.

## Governing docs

Read these before design.

Do not invent behavior that contradicts them.

| Kind | Document | Why |
| --- | --- | --- |
| Decision | Link to the entry in `{domain}-decisions.md`, for example `D19` | The ruling that this spec implements |
| Model | Link to the model page of the domain | The structure that this spec changes |
| Schema | The DBML file in `red-cab-api/docs/db/` | Column truth |
| Convention | The backend or frontend convention page | How to code it |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | | | |

## API contract

_Applies when `red-cab-api` is in `repos`.

Delete section if not._

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/tourists/...` | JWT tourist | | | |

### Files to create or modify (API)

- `config/routes/...`
- `app/controllers/...`
- `app/domains/.../{request,validator,manager,serializer}.rb`

## Web contract

_Applies when `red-cab-web` is in `repos`.

Delete section if not._

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

- [ ] {Maps to a decision entry or an issue checklist}
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

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
