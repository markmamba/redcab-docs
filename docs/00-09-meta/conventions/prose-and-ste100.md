---
title: Prose and ASD-STE100
sidebar_position: 3
description: One set of plain-English rules for every text the Red Cab team writes, based on the sentence rule of Simplified Technical English.
---

## TL;DR

- Red Cab writes every text for the team in one plain-English register, based on **[ASD-STE100](https://www.asd-ste100.org/)** (Simplified Technical English).
- The register covers docs, specs, GitHub issues, PR descriptions, review comments, code comments and user-facing errors.
- The sentence rule is the core: one idea per sentence, under 20 words, active voice.
- The [Glossary](/docs/70-79-business/business-rules/glossary) is the approved vocabulary.
  - Never swap a glossary term for a casual synonym.

## About this document

This page is the human version of the rules.

- Agents load the skill `write-plain-english` in `.claude/skills/`, which holds the same rules and the check scripts.
- `AGENTS.md` at the repo root lists the short form.

| Topic | Document |
| --- | --- |
| Doc structure | [Documentation conventions](/docs/00-09-meta/conventions) |
| Approved terms | [Glossary](/docs/70-79-business/business-rules/glossary) |
| API user errors | [Backend conventions — error messages](/docs/20-29-backend/conventions/backend#error-messages-for-users) |
| Spec workflow | [Implementation specs](/docs/60-69-initiatives/61-2026/implementation-specs/) |

---

## Why one register

- The team includes non-native English speakers, so every text must be understood in one read.
- Write at B1 to B2 English level.
- Plain words never means less technical depth.
- A shorter text splits a sentence and never deletes a fact.

## The rules

### Sentences and bullets

- Write **short sentences**.
  - Put **one idea** in each sentence, under 20 words.
- Use **active voice**: "The system creates a booking", not "A booking is created by the system".
- Use **present tense** for behavior: "The system validates the email address."
- Lead with the point, then expand it in bullets.
- A bullet or a numbered step holds **one sentence**.
  - A second sentence becomes a nested or sibling bullet.
- Nesting stops at level 2.1.
- A list hiding inside a sentence behind ` — `, `;` or `,` becomes bullets.

### Words

- Use **common words**: "cannot change", not "immutable"; "copied from", not "snapshotted".
- Use the same word for the same thing, every time.
  - Use the glossary term when one exists.
- Do not use **idioms or metaphors** ("load-bearing", "north star").
  - Write the literal meaning.
- Do not borrow a word with a precise SQL, Rails or accounting meaning.
  - Write "combination", not "tuple".
- Do not use a **slash** to mean "or" or "and".
  - Write "or" or "and".
- Name a record in full every time: `Catalog::Listing`, not "the listing".
- A finance term of art is allowed in payment docs when the first use defines it in plain words.
- The full list is in `references/words-to-avoid.md` of the skill.

### What a doc contains

- A words table comes first when the text names a table, column, model, service or role.
- User stories come before the design: `As {role}, I want {goal}, so {reason}`.
- Rules are a table with the columns Rule, Applies to and Example.
- Every doc has one worked example of one real person or value.
- A text states current truth only.
  - History belongs on the domain's decisions page.

### User-facing errors

Every user-visible error answers three questions:

1. What went wrong?
2. Why, if the user can understand it?
3. What can the user do next?

See [Backend conventions — error messages for users](/docs/20-29-backend/conventions/backend#error-messages-for-users) and the `red-cab-web` skill `review-react-style/rules/error-messages.md`.

## Two carve-outs

- A legacy requirement keeps its `FR-*` and `NFR-*` IDs and its **shall** / **shall not** / **may** keywords.
  - Apply the sentence rule to the rest of the sentence.
- A legacy ADR keeps its original text until a domain page replaces it.

- Both carve-outs apply only to old pages.
- New pages use the register in full.
- We write no new requirement or ADR pages.

## What STE is not

- STE does **not** replace the [document precedence](/docs/00-09-meta/conventions#document-precedence) chain.
- STE does **not** authorize changing behavior.
  - It only changes how you write agreed behavior.
- STE is **not** a substitute for i18n.
  - English copy follows this page.
  - Japanese copy follows product localization rules.

## The check scripts

Run four scripts on every file you write, and each must report 0.

| Script | What it finds |
| --- | --- |
| `check_sentences.py` | Sentences over 20 words |
| `check_bullets.py` | Bullets or steps with more than one sentence |
| `check_leads.py` | Prose lines with more than one sentence, and nesting past 2.1 |
| `check_weak_words.py` | Words and phrases we do not use |

The scripts live in `.claude/skills/write-plain-english/scripts/`.

- `scripts/check-prose.sh` runs them on every page under `docs/`.
- `scripts/check-prose.sh --changed` checks only the pages a PR changes.
- The GitHub workflow `prose-check.yml` runs it on every PR that touches `docs/`.
- Legacy and background pages are skipped.

## Agents and skills

| Location | What to read |
| --- | --- |
| `redcab-docs` | This page, and the skills in `redcab-docs/.claude/skills/` |
| `redcab-docs/AGENTS.md` | Docs repo agent conventions |
| `red-cab-web/AGENTS.md` | Team plain English for the web repo |
| `red-cab-api/AGENTS.md` | User-facing plain language for the API repo |
| `implementation-specs/` in this repo | Spec narrative follows this page |
