---
title: Prose and ASD-STE100
sidebar_position: 3
description: When and how to use Simplified Technical English for Red Cab docs, specs, issues, and user-facing copy.
---

## TL;DR

- Red Cab uses **[ASD-STE100](https://www.asd-ste100.org/)** (Simplified Technical English) for **Tier A** content: explainers, spec narrative, user-facing errors, and GitHub/PR prose.
- **Tier B** (requirements, glossary terms): keep normative keywords and defined terms; apply STE to sentence structure only.
- **Tier C** (ADRs, dense architecture): no STE requirement; optional short STE summaries only when asked.
- The [Glossary](/docs/70-79-business/business-rules/glossary) is the **approved vocabulary** for domain words; do not replace glossary terms with informal synonyms in normative docs.

## About this document

This page is the canonical reference for human-readable prose across `redcab-docs`, GitHub issues, PRs, and user-facing application text. Implementation repos (`red-cab-api`, `red-cab-web`) mirror the tiers in `.ai/instructions.md` and review skills.

| Topic | Document |
| --- | --- |
| Doc structure | [Documentation conventions](/docs/00-09-meta/conventions) |
| Requirements normativity | [Requirements overview](/docs/70-79-business/requirements) |
| Approved terms | [Glossary](/docs/70-79-business/business-rules/glossary) |
| API user errors | [Backend conventions — error messages](/docs/20-29-backend/conventions/backend#error-messages-for-users) |
| Spec workflow | [Implementation specs](/docs/60-69-initiatives/implementation-specs) |

---

## Tiers (what must follow STE)

| Tier | Content | STE |
| --- | --- | --- |
| **A** | Explainers; implementation spec TL;DR, Problem, Out of scope, Acceptance criteria; validator/zod/API user error strings; GitHub issue and PR descriptions; review comments meant for the whole team | **Required** |
| **B** | Functional and non-functional requirements (body text around **shall** / **may**); glossary definitions and cross-references | **Required for sentences**; **shall** / **shall not** / **may** and `FR-*` / `NFR-*` IDs stay as-is |
| **C** | ADRs, invariants, domain models, long architecture rationale | **Not required** |

---

## Core STE rules (Red Cab profile)

Apply these for Tier A and Tier B prose. Full ASD-STE100 has more rules; when in doubt, prefer clarity over literal rule-counting.

### Sentences and paragraphs

- Write **short sentences**. Put **one idea** in each sentence when you can.
- Use **active voice**: "The system creates a Booking", not "A Booking is created by the system".
- Use **present tense** for behavior: "The system validates the email address."
- Limit a sentence to about **20 words** when you can without losing meaning.
- Start a paragraph with the **topic** (one subject per paragraph).

### Words

- Use **common words** for team and tourist-facing text. Example: "cannot change" instead of "immutable" in Tier A; in Tier B normative docs, use the **glossary term** when one exists (e.g. **Snapshot**).
- Do not use **idioms or metaphors** ("low-hanging fruit", "circle back"). Write the literal meaning.
- Do not use **slash** to mean "or" or "and" in user-facing text; write "or" or "and".
- Avoid jargon in Tier A: `endpoint`, `payload`, `null`, `JSON`, `regex`, `serialize`.
- **Approved technical names** (actors, aggregates, invariant codes, `FR-*`, `ADR-*`) are allowed when they appear in the [Glossary](/docs/70-79-business/business-rules/glossary) or requirements set.

### Lists and instructions

- Use a **bullet list** for two or more parallel items in issues, specs, and explainers.
- For procedures (checkout, password reset), use **numbered steps**. One action per step.

### User-facing errors (Tier A)

Every user-visible error should answer:

1. What went wrong?
2. Why (if the user can understand it)?
3. What can the user do next?

See [Backend conventions — error messages for users](/docs/20-29-backend/conventions/backend#error-messages-for-users) and `red-cab-web` skill `review-react-style/rules/error-messages.md`.

### Team GitHub prose (Tier A)

The web repo targets **B1–B2** English for issues, PR descriptions, and comments. That aligns with STE: short sentences, common words, no idioms. STE adds stricter limits for safety- and support-critical copy (errors, checkout, refunds).

---

## Tier B — requirements and glossary

### Requirements (`FR-*`, `NFR-*`)

- Keep [normative language](/docs/70-79-business/requirements#4-normative-language-rules): **shall**, **shall not**, **may**.
- Keep **one observable behavior** per requirement.
- Do **not** add APIs, screens, or algorithms to requirements.
- Apply STE to the **rest of the sentence**: short, active, glossary terms only.

**Example (structure only):**

- Good: "The system **shall** reject checkout when the selected time slot has no available seats."
- Avoid: "The system **shall** fail the checkout transaction with a validation error if seat availability is insufficient."

### Glossary

- Each term is defined **once** in its owning context; elsewhere, **use the term exactly** (Tier B).
- When writing Tier A explainers, you may add a plain phrase **after** the term on first use: "CheckoutSession (the in-progress checkout record)".

---

## Tier A — implementation specs

In `60-69-initiatives/61-implementation-specs/`:

| Section | STE |
| --- | --- |
| `title`, TL;DR, Problem, Out of scope, Acceptance criteria | Yes |
| Governing docs table, API/Web contract tables, file paths | Tables and IDs; keep precise |
| Design decisions | Prefer short rationale sentences; alternatives can be terse bullets |

`review-implementation-spec` includes an optional **prose** checklist; see skills in `red-cab-api` and `red-cab-web`.

---

## Tier A — explainers

Explainers under `70-79-business/74-explainers/` are **non-normative**. They **must** use STE in body prose and link to authoritative sources for rules. Do not restate invariants as if they were optional.

---

## What STE is not

- STE does **not** replace the [document precedence](/docs/00-09-meta/conventions#document-precedence) chain.
- STE does **not** authorize changing behavior; it only changes how you **write** agreed behavior.
- STE is **not** a substitute for i18n: EN copy follows this page; JA copy follows product localization rules (`OPR-9`, `NFR-I18N-*`).

---

## Agents and skills

| Location | What to read |
| --- | --- |
| `redcab-docs` | This page |
| `red-cab-web/.ai/instructions.md` | Team plain English + Tier A |
| `red-cab-api/.ai/instructions.md` | User-facing plain language + Tier A |
| `write-implementation-spec` | Fill spec narrative sections with Tier A STE |
| `review-implementation-spec` | Prose checklist (Tier A sections) |
| `review-react-style` / `review-rails-style` | User-facing error strings in changed files |
