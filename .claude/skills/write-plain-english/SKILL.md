---
name: write-plain-english
description: Writing rules for everything the Red Cab team writes for each other, in docs, specs, GitHub issues, PR descriptions, DBML notes, code comments and review comments. Use before writing or rewriting any prose for the team, even one paragraph, and whenever another skill says to load it first. Covers the sentence rule from ASD-STE100, the bullet shape, how to name things, words to avoid, what a doc must contain, and check scripts. For Tier A/B/C applicability see write-tier-a-prose and prose-and-ste100.md.
---

# write-plain-english

The team includes non-native English speakers, so every text must be understood in one read.
- Write at B1 to B2 English level.
- Plain words never means less technical depth.
- Run the check scripts before you hand over any text, see "Self-check" below.

Normative tier definitions (when STE is required): `docs/00-09-meta/conventions/prose-and-ste100.md`. Skill `write-tier-a-prose` summarizes tiers for agents.

## Sentences

One idea per sentence, under 20 words.
- This is the sentence rule of ASD-STE100, Simplified Technical English.
  - We take its sentence rules, not its dictionary.
- Active voice, present tense: "the API validates the session", not "the session is validated".
- The same word for the same thing, every time, so never swap a [Glossary](/docs/70-79-business/business-rules/glossary) term for a casual synonym in normative docs.
- No "ensure", "leverage" or "serves", no idioms, no metaphors, only the underlying meaning.
- A sentence that repeats a table or a code block is deleted.

## The bullet shape

```
{main idea, one sentence, one line}
- {expansion 1}
- {expansion 2}
  - {expansion 2.1}
```

- A lead paragraph is one sentence.
- A bullet or a numbered step holds one sentence.
  - A second sentence becomes a nested bullet or a sibling bullet.
- Nesting stops at 2.1.
  - A third level means the main idea is too big, so split it.
- Tables and code blocks stand on their own under a lead sentence, never inside a bullet deeper than level 1.
- Numbered steps and vocabulary entries follow the same shape.
- Punctuation is the test: a list hiding inside a sentence behind ` — `, `;` or `,` becomes bullets.

## Shorter never means less

A shorter line splits a sentence and never deletes a fact.
- Keep every column, value, rule, number, actor and link.
- Before you rewrite an existing page, list every fact on it in `scratchpad/facts-{slug}.md`.
  - After the rewrite, each fact maps to a line in the new text.
- Word count may fall, and fact count may not.

## Name things

Every reference names its kind, every time.
- "the file `red-cab-api/docs/db/booking.dbml`", "the model `Booking::Reservation`", "the column `bookings.status`", "the manager `Booking::BookingCreateManager`".
- A column carries its table: `bookings.status`, never a bare `status`.
- Never a bare "the DBML", "the endpoint", "the association", or an "it" that crosses a paragraph.

Name the record in full, never a short form or an invented noun.
- "The listing" can mean two tables on one page, so write `Catalog::Listing` every time.
- "The hold" and "the sweep" name nothing a reader can look up.
  - Write the action with its actor: "the checkout session expiry job releases the seats".
  - Or name the record: a `Booking::Reservation` with `status: "confirmed"`.
- Use the bounded-context prefix on models in `red-cab-api` (`Booking::`, `Catalog::`, `Iam::`) as in domain code.
  - Diagram labels and worked-example values keep the full name, because they are read alone.

Write field values the way code writes them.
- `status: "pending_payment"`, with the full column name and the string enum value Red Cab uses.
- One field per line, with `<br/>` between lines inside a table cell when needed.
  - The lead sentence names the table once, and the lines below carry the columns.
- Every file path, model, column, status, function, route and ENV var goes in backticks.

A heading and its first sentence resolve every word they use, in place.
- Readers arrive from the table of contents, not from the paragraph above.
- When one heading fails, sweep the whole file.

A link says what it points at.
- `[ADR-006 — Booking snapshots](/docs/30-49-domains/34-architecture-decisions/adr-006-booking-snapshots.md)`, never `[ADR-006]`.
- An ADR or invariant link carries the id and one short phrase.

## Words

Common words, used with their own meaning.
- "cannot change", not "immutable"; "copied from", not "snapshotted"; "does nothing", not "no-op".
- In Tier B normative docs, use the glossary term when one exists (for example **Snapshot**).
- Do not borrow a word with a precise SQL, Rails or accounting meaning for something else.
  - "Combination", not "tuple", because in SQL a tuple is a row.
- A finance term of art is allowed in payment docs when the first use defines it in plain words.
- The full table, with the AI vocabulary to avoid, is in `references/words-to-avoid.md`.
- No emojis.

## What a doc contains

- A words table comes first in any text that names a table, column, model, service or role.
  - Two columns, Word and Meaning, one row per word, and the meaning is one plain sentence.
  - It holds only the words a reader needs to follow the text.
  - A word that one section explains where it uses it stays out of the table.
  - Usually 5 to 10 rows, and never every column.
  - A column the text adds is defined where the design adds it, not in the table.
  - The Word column names the kind: "the table `bookings`", "the model `Booking::Reservation`", "team admin".
- User stories come before the design, one per line, numbered US-1, US-2.
  - The form is "As {actor}, I want {goal}, so {reason}", and the actor is a person's role (tourist, provider ops, team admin).
- Rules are a table with the columns Rule, Applies to, Example, never a prose paragraph.
  - "Applies to" holds a story number or the word "always".
- Every doc has one worked example: a numbered walk-through of one real person or value.
- Code is shown, not described: under each claim, 2 to 5 verbatim lines with `# path:start-end` as the first line.
  - A DBML excerpt shows its `Table` line first.
  - Per-issue implementation specs in api/web follow those repos' spec templates.
- A diagram earns its place when it shows a branch, a state change, or a relationship between records.
  - A single path of steps is a numbered list.
- A text states current truth only, never "used to be" or "we removed X".
  - History belongs on an ADR or explainer, and the text links to it.
- Do not rely on an initiative name as context the reader must already know, state the rule itself.

Per-issue shipping design is not a `write-doc` page. Use `write-implementation-spec` in `red-cab-api` or `red-cab-web`.

## Self-check

Run all scripts on the file from this skill's `scripts/` directory. All must exit 0.

```bash
python3 .claude/skills/write-plain-english/scripts/check_sentences.py <file>
python3 .claude/skills/write-plain-english/scripts/check_bullets.py <file>
python3 .claude/skills/write-plain-english/scripts/check_leads.py <file>
python3 .claude/skills/write-plain-english/scripts/check_weak_words.py <file>
```

When `${CLAUDE_SKILL_DIR}` is set (Claude Code), you may use:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/check_sentences.py <file>
python3 ${CLAUDE_SKILL_DIR}/scripts/check_bullets.py <file>
python3 ${CLAUDE_SKILL_DIR}/scripts/check_leads.py <file>
python3 ${CLAUDE_SKILL_DIR}/scripts/check_weak_words.py <file>
```

- A line that breaks the shape on purpose is allowed when the hand-off names the line and says why.
- Then read the text once more for the rules no script checks: facts kept, names in full, words, headings, links.
- Wrong and right examples for every rule are in `references/examples.md`.
