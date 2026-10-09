#!/bin/bash
#
# .ai/scripts/add-skill.sh — Add a skill to .ai/skills/ and generate LLM-specific pointers.
#
# Usage:
#   .ai/scripts/add-skill.sh <skill-name>

set -euo pipefail

SKILL_NAME="${1:-}"

if [ -z "$SKILL_NAME" ]; then
  echo "Usage: .ai/scripts/add-skill.sh <skill-name>"
  echo ""
  echo "The skill must already exist at .ai/skills/<skill-name>/SKILL.md"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SKILL_SOURCE="$REPO_ROOT/.ai/skills/$SKILL_NAME/SKILL.md"

if [ ! -f "$SKILL_SOURCE" ]; then
  echo "Error: Skill not found at .ai/skills/$SKILL_NAME/SKILL.md"
  exit 1
fi

DESCRIPTION=$(sed -n '/^---$/,/^---$/p' "$SKILL_SOURCE" | grep '^description:' | sed 's/^description: *//' | head -1)
if [ -z "$DESCRIPTION" ]; then
  DESCRIPTION="$SKILL_NAME skill"
fi

echo "Generating pointers for skill: $SKILL_NAME"

CLAUDE_DIR="$REPO_ROOT/.claude/skills/$SKILL_NAME"
mkdir -p "$CLAUDE_DIR"
cat > "$CLAUDE_DIR/SKILL.md" <<EOF
---
name: $SKILL_NAME
description: $DESCRIPTION
---

Read and follow the instructions in \`.ai/skills/$SKILL_NAME/SKILL.md\`.

User input: \$ARGUMENTS
EOF
echo "  Created: .claude/skills/$SKILL_NAME/SKILL.md"

CURSOR_DIR="$REPO_ROOT/.cursor/rules"
mkdir -p "$CURSOR_DIR"
cat > "$CURSOR_DIR/$SKILL_NAME.mdc" <<EOF
---
description: $DESCRIPTION
globs: []
alwaysApply: false
---

# /$SKILL_NAME

Read and follow the instructions in \`.ai/skills/$SKILL_NAME/SKILL.md\`.
EOF
echo "  Created: .cursor/rules/$SKILL_NAME.mdc"
echo "Done."
