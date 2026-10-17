---
name: mermaid-diagram
description: Add or fix Mermaid diagrams in redcab-docs Docusaurus pages — flows, state machines, and sequence diagrams with readable labels.
argument-hint: "[flowchart | sequence | state] [topic]"
---

# mermaid-diagram

Red Cab docs use `@docusaurus/theme-mermaid`. Diagrams live in fenced blocks inside markdown under `docs/`.

## Syntax

Use a markdown fenced block whose info string is `mermaid` (opening line: four backticks plus the word mermaid). Put diagram source on the following lines, then close the fence. Docusaurus passes the block to the Mermaid theme.

## Rules

- **Labels**: Short STE phrases. No jargon in tourist-facing diagrams.
- **IDs**: `camelCase` or `snake_case` node ids; human text in brackets.
- **Size**: Prefer one diagram per concern. Split if more than ~12 nodes.
- **State machines**: Name states as nouns; edges as verbs. Link to `booking-state-machine` doc when editing booking flows.
- **Sequence**: One column per actor (Tourist, API, Web, Provider). Message text is Tier A.
- **Normative behavior**: Diagrams illustrate docs; they do not override `FR-*` or invariants. Add a lead sentence: "This diagram is illustrative."

## Types

| Type | Use |
| --- | --- |
| `flowchart TD` / `LR` | User journeys, request pipelines |
| `sequenceDiagram` | API call order |
| `stateDiagram-v2` | Booking or payment states |

## Workflow

1. Read the page section the diagram supports.
2. Draft Mermaid in `scratchpad/diagram-{slug}.md`.
3. Paste into the target `index.md` or explainer.
4. Run `npm run build` to catch Mermaid parse errors.

## Accessibility

Provide a one-sentence summary above the diagram. Do not rely on color alone; include text on edges where the meaning matters.
