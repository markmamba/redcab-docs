# AI skills — redcab-docs

## Layout

```
.ai/
  instructions.md     # Single source of truth for this repo
  settings.json       # Tool permissions
  skills/             # Task prompts
  scripts/
    add-skill.sh      # Generate .claude and .cursor pointers

.claude/skills/       # Thin pointers to .ai/skills/
.cursor/rules/        # Optional Cursor rule pointers per skill
```

## Skills

| Skill | Purpose |
| --- | --- |
| `write-tier-a-prose` | STE Tier A/B prose, bullets, naming; run check scripts |
| `write-issue` | GitHub issue: Context → Problem → Direction |
| `write-doc` | Docusaurus pages (explainer, ADR, bounded context, convention) |
| `system-design` | Design plan before an implementation spec |
| `mermaid-diagram` | Mermaid blocks for architecture and flows |

Implementation specs and codegen stay in `red-cab-api` and `red-cab-web`.

## Add a skill

1. Create `.ai/skills/{name}/SKILL.md` with YAML frontmatter (`name`, `description`).
2. Run `.ai/scripts/add-skill.sh {name}`.
3. Commit `.ai/`, `.claude/skills/`, and `.cursor/rules/` together.
