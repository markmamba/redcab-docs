# Agent skills — redcab-docs

The conventions for agents live in `AGENTS.md` at the repo root. `CLAUDE.md` imports it. This file is the skill catalog only.

## Layout

```
.claude/
  settings.json       # Tool permissions (Claude Code)
  skills/             # Task prompts (canonical copy)
  scripts/
    add-skill.sh      # Generate a Cursor rule pointer for a skill

.cursor/rules/        # Cursor rule pointers, one for each skill
```

Implementation specs live in this repo (`implementation-specs/`). Codegen and review skills live in `red-cab-api` and `red-cab-web` under `.claude/skills/`, with their conventions in each repo's `AGENTS.md`.

## Skills

| Skill | Purpose |
| --- | --- |
| `write-plain-english` | Sentence, bullet, naming and word rules, what a doc contains, check scripts, `references/examples.md` |
| `write-issue` | GitHub issue: Context, Problem, Direction. Templates A–E and the `gh` workflow |
| `write-doc` | Docusaurus pages: decision entry, domain page, feature design doc, explainer, convention, runbook |
| `model-spec` | The full specification of one model, with use cases, states and invariants |
| `system-design` | A design plan before an implementation spec |
| `mermaid-diagram` | Mermaid colour categories, layout, MDX-safe blocks, and the colour check script |

## Add a skill

1. Create `.claude/skills/{name}/SKILL.md` with YAML frontmatter (`name`, `description`).
   - The description says what the skill does and when to use it, in the words a user would type.
2. Run `.claude/scripts/add-skill.sh {name}` to create `.cursor/rules/{name}.mdc`.
3. Add the skill to the tables in this file and in `AGENTS.md`.
4. Commit `.claude/` and `.cursor/rules/` together.
