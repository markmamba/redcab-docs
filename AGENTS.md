# Red Cab Docs — Agent Instructions

You are working in `redcab-docs`, the Docusaurus knowledge base of the Red Cab platform (`red-cab-api` and `red-cab-web`). System design, domain rulings, implementation specs and conventions are written here. The site is published at [redcab-docs site](https://markmamba.github.io/redcab-docs/).

This file is the single source of truth for agents. `CLAUDE.md` imports it. Codex and Cursor read it as it is.

## Writing style — the most important rule in this repo

Everything here is prose for the team. The team includes non-native English speakers. Write at roughly B1–B2 English level. One register applies to every page, issue, PR description, code comment and user-facing error.

- Short sentences. One idea per sentence. Under 20 words, so split anything longer.
- Common words: "cannot change", not "immutable"; "copied from", not "snapshotted"; "does nothing", not "no-op".
- Active voice: "the system creates X", not "X is created by the system".
- Lead with the point, then expand it in bullets. If you list things inside a sentence with ` — `, `;` or `,`, move them into bullets and rewrite the sentence so it reads naturally without them.
- One sentence per bullet or numbered step. A second sentence becomes a nested or sibling bullet. Nesting stops at 2.1.
- No idioms or metaphors ("load-bearing", "north star", "red herring"). Write the underlying meaning.
- No borrowed technical words. A word with a precise SQL, Rails or accounting meaning is used only with that meaning. Write "combination", not "tuple".
- No invented nouns ("the hold", "the sweep"). Write the action as a verb with its actor, or name the record in full: a `Booking::Reservation` with `status: "confirmed"`.
- Explain the why in full sentences. Plain words never means less technical depth.
- State rule-sets as small decision tables, not prose paragraphs.
- Write field values in code style: `status: "pending_payment"`, full column names, one field per line.
- A link says what it points at: `[Catalog D19 — Asset holds]`, never `[D19]`.
- A heading and its first sentence resolve every term they use, in place. Readers arrive from the table of contents. When one heading is flagged, sweep the whole file for the same failure.
- A spec states the user stories it serves before it describes the design: "As {role}, I want {goal}, so {reason}". Name the real role (tourist, provider owner, Red Cab admin), never "a user".

The full rules, the words table and the check scripts are in the skill `.claude/skills/write-plain-english/`. Load it before you write any prose for the team. The page [Prose and ASD-STE100](docs/00-09-meta/conventions/prose-and-ste100.md) is the human version.

## Core conventions

- Update the decision or the spec BEFORE you create implementation issues. Never make "update the doc" a sub-issue. The doc is the contract the issues implement against.
- A domain ruling lives on one `{domain}-decisions.md` page at the domain root, as a numbered and dated entry (`## D1 — <title> (YYYY-MM-DD) \{#slug\}`). Other docs link to the entry and never repeat it. No PRDs, no RFCs, no new `adr-*` pages, no central decisions folder.
- When a ratified decision changes, update every doc that repeats it on the same day. Better: state each decision in one place and link to it.
- To find every doc that repeats a decision, **write down the plain-English words for the concept before you grep**, not only the schema name. Our docs describe things in words, so searching `payment_hold` misses a page that says "hold". Search word stems: `cancel` catches cancel, cancels, cancelled and cancellation. A file in your results is not proof you checked it, because the same file may hold a second, differently worded line.
- A spec or domain page states current truth only. Never narrate what changed ("used to be", "was renamed", "we removed X"). History belongs on the domain's decisions page, and the page links to that entry.
- A folder an engineer made to scope implementation work (for example `61-2026/catalog-revamp-2026/`) is a work record, not a spec. Do not update it when decisions change. The domain pages are the source of truth.
- Before you write a convention that manages a failure, name the failure's cause and the system that owns it.
- A migration or sync spec names its verification artifact: the report a person approves before any write (the dry run), and re-checks after the live run.
- Every normative sentence traces to a source: a decision entry (`D<number>`) you have read, a file path, a test name, or an explicit user statement. Unverified facts go under **Open questions** or in the hand-off. Do not invent citations. Do not copy a rule from an old spec, invariant, requirement or ADR.
- Schema truth is `red-cab-api/docs/db/*.dbml`. Verify a column, enum, default or index against the DBML before you state it. Prose specs can be stale.
- MDX 3 treats `{...}` and `<...>` in prose as JSX. Put them fully inside backticks. Double quotes do not escape them. Run `npm run build` to verify, because the dev server tolerates more than the build does.
- Docusaurus strips the `NN-` prefixes from URL slugs. Prefer file-relative links (`../../../00-09-meta/conventions/index.md`) over absolute `/docs/...` paths, and keep to the style of the neighbouring page.
- Doc files are kebab-case. A folder has one `index.md`. Page order comes from `sidebar_position`.

## Canonical docs root

All agents resolve planning docs from `redcab-docs/docs/`. Resolve it in this order:

1. `RED_CAB_DOCS_PATH` (absolute path to `docs/`)
2. `{workspace}/redcab-docs/docs/`
3. `../redcab-docs/docs/` from a sibling app repo

Application code is read-only for fact-checking:

- `red-cab-api/` — DBML under `docs/db/`, domains under `app/domains/`
- `red-cab-web/` — routes under `app/routes/`, API clients under `app/api/`

> **Deprecated:** `red-cab-docs/` is frozen. Do not update it.

## Site structure (Johnny Decimal)

| Area | Path | Audience |
| --- | --- | --- |
| Meta | `docs/00-09-meta/` | Conventions, start-here |
| Backend | `docs/20-29-backend/` | API conventions, infrastructure |
| Domains | `docs/30-49-domains/` | One folder for each domain: front door, decisions page, models |
| Frontend | `docs/50-59-frontend/` | Web conventions |
| Initiatives | `docs/60-69-initiatives/61-2026/` | Programs and `implementation-specs/` |
| Business | `docs/70-79-business/` | Glossary (current). Invariants, requirements and planning are background |
| Legacy | `docs/80-89-legacy/` | Superseded material, alias table |
| Engineering meta | `docs/90-99-engineering-meta/` | Cross-cutting rules |

Legacy URLs under `/docs/product/`, `/docs/architecture/` and `/docs/engineering/` redirect to the paths above.

## Document precedence

See [Documentation system](docs/00-09-meta/conventions/documentation-system.md): domain pages, then engineering, then **approved** specs, then code. Old invariants, requirements and ADRs are background, and an old rule applies only where a domain page cites it. Program pages under `61-2026/` are not normative.

## Spec-first workflow

Per-issue design for `red-cab-api` and `red-cab-web` belongs in an implementation spec, not in a generic doc page. Before implementation code is written:

1. **Decide.** Check the domain front door in `docs/30-49-domains/{nn}-{domain}/index.md`.
   - If its status is `draft`, or no entry in `{domain}-decisions.md` covers the behavior, the ruling does not exist yet.
   - Ask the owner. Then add a numbered and dated entry with the `write-doc` skill.
2. **Issue.** Draft the GitHub issue with the `write-issue` skill.
3. **Spec.** Create `docs/60-69-initiatives/61-2026/implementation-specs/{context}/{repo}-{issue}-{slug}.md` from `_template.md`. The Governing docs table links the decision entry.
4. **Review.** The owner reviews the spec in the docs PR and sets `status: approved`.
5. **Code.** Use the codegen skills in `red-cab-api` or `red-cab-web` (`new-endpoint`, `new-model`, `creating-route-pages`) with the approved `spec_path`.
6. **Link.** Put the spec link in the PR description.
7. **After the merge,** set the spec to `implemented`. Move its lasting rules to the model page or use-case page of the domain.

See [Implementation specs](docs/60-69-initiatives/61-2026/implementation-specs/README.md). Do not use `write-doc` for an implementation spec.

## Skills (this repo)

Task prompts live in `.claude/skills/`. The catalog is in `.claude/README.md`.

| Need | Skill | Output |
| --- | --- | --- |
| Prose for the team | `write-plain-english` | Rules and check scripts. Load it first for any text |
| GitHub issue body | `write-issue` | GitHub (`red-cab-api`, `red-cab-web`, `redcab-docs`) |
| Decision entry, domain page, feature design doc, explainer, convention, runbook | `write-doc` | See the skill |
| One model's full specification | `model-spec` | `models/{slug}.md` in the domain folder |
| Weigh options before a spec | `system-design` | `scratchpad/design-{slug}.md` |
| Diagram in a page | `mermaid-diagram` | Block inside the target page |

## Check before hand-off

Run the four check scripts on every file you write. Each must report 0.

```bash
python3 .claude/skills/write-plain-english/scripts/check_sentences.py <file>
python3 .claude/skills/write-plain-english/scripts/check_bullets.py <file>
python3 .claude/skills/write-plain-english/scripts/check_leads.py <file>
python3 .claude/skills/write-plain-english/scripts/check_weak_words.py <file>
python3 .claude/skills/mermaid-diagram/scripts/check_mermaid_colours.py <file>
npm run build
```

## Scratchpad

Drafts and fact ledgers go under `scratchpad/` at the repo root. The directory is gitignored. Do not commit scratchpad files unless the user asks.

- `scratchpad/facts-{slug}.md` — one row per fact with source
- `scratchpad/doc-draft-{slug}.md` — doc draft before the move
- `scratchpad/design-{slug}.md` — system-design output

## Read first (new feature work)

- Catalog work: `docs/30-49-domains/31-catalog/index.md`
- IAM work: `docs/30-49-domains/32-iam/index.md` and `iam-decisions.md`, the rulings on sessions, portals and policy routes
- Bookings, Payments and Reviews work: `docs/30-49-domains/33-bookings/`, `34-payments/` and `35-reviews/`. They are drafts with no rulings yet, so start at step 1 of the spec-first workflow.
- `docs/70-79-business/71-business-rules/glossary.md`
- `docs/20-29-backend/21-conventions/domain-to-code-mapping.md`

Background only, and never a rule source unless a domain page cites it:

- `docs/70-79-business/71-business-rules/invariants.md`
- `docs/70-79-business/73-planning/`
- `docs/70-79-business/72-requirements/functional-requirements/{ctx}.md`

## Multi-PR audit series

Programs (for example `61-2026/catalog-revamp-2026/`) are non-normative. A multi-PR audit series may live under `implementation-specs/{context}/{series}/`. Mark it `doc_type: program` when it is not an API contract.

## Commands

```bash
npm run start    # local preview
npm run build    # production build check
```
