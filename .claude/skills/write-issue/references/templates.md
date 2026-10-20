# Issue templates

Length scaling — pick one template by complexity:

| Template | For | Length |
| --- | --- | --- |
| A | Tiny admin task, typo, one constant | 5–10 lines |
| B | Bug with a reproducer | 20–40 lines |
| C | Feature or small change with direction | 60–120 lines |
| D | Architecture or cross-cutting work | 200+ lines |
| E | Code, schema, or docs disagree — decide before coding | 80–150 lines |

## Template A: tiny admin task

```markdown
## Context

## Tasks

- [ ]
```

## Template B: bug

```markdown
## Context

## What is happening today

| Page / Action | Result | Expected |
| --- | --- | --- |
| | | |

## Concrete example

1.

## Problem

## Direction

## Tasks

- [ ]
```

## Template C: feature or small spec

```markdown
## Words used in this issue

| Word | Meaning |
| --- | --- |
| | |

## Context

## Problem

## Direction

## Tasks

- [ ]

## Acceptance criteria

- [ ]

## References

-
```

## Template D: architecture / cross-cutting

```markdown
## Status (last updated YYYY-MM-DD)

### Done

### In flight

### Not started

## TL;DR

## Words used in this issue

| Word | Meaning |
| --- | --- |
| | |

## Context

## Walk-through: {one scenario}

1.

## Problem

## Direction

## Deliberate design choices

## Tasks

- [ ]

## Acceptance criteria

- [ ]

## Out of scope

## References

-
```

## Template E: investigation (disagreement)

```markdown
## Words used in this issue

| Word | Meaning |
| --- | --- |
| | |

## Context

## Problem 1: {one sentence naming the two sides}

## Problem 2: ...

## Concrete example

1.

## Direction

## Tasks

- [ ] Run read-only queries; paste results in a comment.
- [ ] Record which side is correct for each problem.

## Out of scope

## References

-
```

## Standard feature or fix (shortcut)

Same shape as Template C when you do not need the label.

```markdown
## Words used in this issue

| Word | Meaning |
| --- | --- |
| | |

## Context

## Problem

## Direction

## Tasks

- [ ]

## Acceptance criteria

- [ ]

## References

-
```

## Docs-only

```markdown
## Context

## Problem

## Direction

## Tasks

- [ ] Update `docs/...`
- [ ] `npm run build` passes

## References

-
```

## Tracking (long-running)

```markdown
## Status (last updated YYYY-MM-DD)

### Done

### In flight

### Not started

## Context

## Problem

## Direction

## Tasks

- [ ]
```
