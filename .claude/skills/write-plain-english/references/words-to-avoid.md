# Words to avoid (Tier A)

Use a plain alternative. In Tier B normative docs, use the [Glossary](/docs/70-79-business/business-rules/glossary) term when one exists.

Three lists: borrowed and figurative words, the finance exception, and AI vocabulary.

## Borrowed and figurative words

| Avoid | Use instead |
| --- | --- |
| immutable | cannot change, and who or what stops the change |
| snapshotted | copied from (or **Snapshot** in Tier B glossary docs) |
| no-op | does nothing, has no effect |
| denormalised | copied into this table |
| idempotent | safe to run twice |
| tuple (for a combination of values) | combination, because in SQL a tuple is a row |
| load-bearing | important, and removing it breaks X |
| red herring | looks like the cause, but is not |
| leaks into, cascades | spreads to |
| move the needle | make a real difference |
| north star | main goal |
| low-hanging fruit | the easy wins first |
| circle back | follow up later |
| out of the box | by default |
| leverage, utilize | use |
| ensure | make sure, verify, or state what checks it |
| facilitate | help, allow |
| robust, seamless | describe the actual behavior or UX |
| simply, just, aforementioned | delete or repeat the noun |
| E2E | end-to-end (spell out once) |
| serves (a purpose) | is for, does |

Also avoid idioms: "circle back", "low-hanging fruit", "out of the box".

## The finance exception

A finance term of art is allowed in payment and booking money docs when the first use defines it in plain words. See payment ADRs under `docs/30-49-domains/34-architecture-decisions/`.

## AI vocabulary

| Avoid | Use instead |
| --- | --- |
| delve into | look at, investigate |
| comprehensive, crucial, vital | say what is covered or why it matters |
| underscore (verb) | show |
| Moreover, Furthermore | start a new sentence, or "also" |
| In conclusion, To summarize | write the conclusion itself |
| It's worth noting that | state the fact |
| Let me know if you have any questions, I hope this helps | end on the last point |
| Great question, Based on my analysis, I'll go ahead and | state the finding or do the thing |

No emojis in any text for the team.
