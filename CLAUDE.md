# Red Cab Docs — Claude Code

Read and follow `.claude/instructions.md`. Task prompts live in `.claude/skills/`.

## Skills

| Skill | Purpose |
| --- | --- |
| `write-plain-english` | Prose rules and check scripts |
| `write-tier-a-prose` | STE Tier A/B/C summary |
| `write-issue` | GitHub issues |
| `write-doc` | Docusaurus pages (not implementation specs) |
| `system-design` | Design plan before a spec |
| `mermaid-diagram` | Mermaid in docs |

Implementation specs: use `write-implementation-spec` in `red-cab-api` or `red-cab-web`.

```bash
npm run build
```
