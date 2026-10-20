---
name: mermaid-diagram
description: Add or fix Mermaid diagrams in redcab-docs Docusaurus pages — flows, state machines, and sequence diagrams with readable labels and layout that survives MDX build.
argument-hint: "[flowchart | sequence | state] [topic]"
---

# mermaid-diagram

Red Cab docs use `@docusaurus/theme-mermaid`. Diagrams live in fenced blocks inside markdown under `docs/`.

Load `write-plain-english` for label text (Tier A, short phrases).

## Syntax

Use a markdown fenced block whose info string is `mermaid`. Put diagram source on the following lines, then close the fence.

Add a one-sentence summary **above** the diagram. Add a lead sentence when the diagram is illustrative only: "This diagram is illustrative." Diagrams do not override `FR-*` or `INV-*`.

## When to use which type

| Type | Use |
| --- | --- |
| `flowchart TD` / `LR` | User journeys, request pipelines, domain context |
| `sequenceDiagram` | API call order |
| `stateDiagram-v2` | Booking or payment states; link to booking state machine docs when editing booking flows |

A single path of steps with no branch is a **numbered list**, not a diagram.

## Layout

**Prefer growth downward, not wide.** Docusaurus scales diagrams to page width. Wide `LR` diagrams shrink until labels are unreadable.

- Default for context diagrams: `flowchart TD` (top-down).
- Use `flowchart LR` when 5+ nodes sit on one side of a hub and TD would put them on one unreadable rank.
- For 8+ nodes, add at the top of the diagram:

```
%%{init: {'flowchart': {'defaultRenderer': 'elk'}}}%%
```

Group related nodes in invisible subgraphs when TD spreads sources across ranks:

```mermaid
subgraph sources[" "]
    direction LR
    A["Actor A"]
    B["Actor B"]
end
```

Use label `" "` (single space), not empty. Style `fill:none,stroke:none` on layout-only subgraphs.

Declare edges in the same order nodes appear in their row so labels do not scramble.

## Color (domain context diagrams)

Use `classDef` + `class`, not one-off `style` on every node.

| Category | Fill | Stroke | Use |
| --- | --- | --- | --- |
| Subject (this page's focus) | `#ff9` | `#333`, width 3px | The aggregate or flow under discussion |
| Same bounded context | `#e5e5ff` | `#6666cc` | Related models in one context |
| External (other context or actor) | `#f5f5f5` | `#999` | IAM, payment gateway, tourist |

Always set `color:#333` in `classDef` so labels stay readable on lavender fills.

Optional dashed subgraph for an aggregate boundary:

```
style agg fill:none,stroke:#333,stroke-dasharray:5 5
```

Add a one-line legend below the diagram when colors carry meaning.

## Labels and edges

- **IDs**: `camelCase` or `snake_case`; human text in brackets.
- **Size**: One diagram per concern. Split above ~12 nodes.
- **Solid arrow** (`-->`): structural dependency.
- **Dotted arrow** (`-.->`): cross-cutting or optional relationship.
- **Edge labels**: short STE phrases. In flowcharts, `<br/>` for wrap; keep each line short.
- **Sequence**: One column per actor (Tourist, API, Web, Provider). Message text is Tier A.
- **State machines**: States as nouns; edges as verbs.

## MDX gotchas

- Wrap comparison operators in backticks in prose outside fences: `` `<=` ``, `` `>=` ``.
- Put `{` and `}` in prose inside backticks so MDX does not treat them as JSX.

## Workflow

1. Read the page section the diagram supports.
2. Draft in `scratchpad/diagram-{slug}.md`.
3. Paste into the target page.
4. Run `npm run build` to catch Mermaid parse errors.

## Accessibility

Do not rely on color alone. Put the relationship on the edge label or in the legend.
