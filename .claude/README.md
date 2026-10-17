# Agent skills — redcab-docs

## Layout

```
.claude/
  instructions.md     # Single source of truth for this repo
  settings.json       # Tool permissions (Claude Code)
  skills/             # Task prompts (canonical copy)
  scripts/
    add-skill.sh      # Generate Cursor rule pointer for a skill

.cursor/rules/        # Optional Cursor rule pointers per skill
```

Implementation specs and codegen skills live in `red-cab-api` and `red-cab-web` (those repos still use `.ai/` for agent instructions).

## Skills

| Skill | Purpose |
| --- | --- |
| `write-tier-a-prose` | STE Tier A/B prose, bullets, naming; run check scripts |
| `write-issue` | GitHub issue: Context → Problem → Direction |
| `write-doc` | Docusaurus pages (explainer, ADR, bounded context, convention) |
| `system-design` | Design plan before an implementation spec |
| `mermaid-diagram` | Mermaid blocks for architecture and flows |

## Add a skill

1. Create `.claude/skills/{name}/SKILL.md` with YAML frontmatter (`name`, `description`).
2. Run `.claude/scripts/add-skill.sh {name}` to create `.cursor/rules/{name}.mdc`.
3. Commit `.claude/` and `.cursor/rules/` together.
