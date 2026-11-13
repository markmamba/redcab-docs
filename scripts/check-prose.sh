#!/usr/bin/env bash
# Run the prose and diagram check scripts.
# Usage:
#   scripts/check-prose.sh            check every page under docs/
#   scripts/check-prose.sh --changed  check only pages changed against origin/main
#
# Skipped: legacy and background pages. They are not rule sources, and a rewrite risks losing facts.
#   docs/80-89-legacy/  docs/70-79-business/72-requirements/  docs/70-79-business/73-planning/
#   docs/70-79-business/71-business-rules/invariants.md
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
SKIP='^docs/(80-89-legacy/|70-79-business/(72-requirements/|73-planning/|71-business-rules/invariants\.md))'

SKILLS=.claude/skills
if [ "${1:-}" = "--changed" ]; then
  files=$(git diff --name-only --diff-filter=AM origin/main...HEAD -- 'docs/*.md' 'docs/*.mdx' | grep -Ev "$SKIP")
else
  files=$(find docs \( -name '*.md' -o -name '*.mdx' \) | sort | grep -Ev "$SKIP")
fi

[ -z "$files" ] && { echo "No pages to check."; exit 0; }

fail=0
for f in $files; do
  for s in check_sentences check_bullets check_leads check_weak_words; do
    out=$(python3 -I "$SKILLS/write-plain-english/scripts/$s.py" "$f" 2>&1) || { echo "$f [$s]"; echo "$out" | sed 's/^/  /'; fail=1; }
  done
done
python3 -I "$SKILLS/mermaid-diagram/scripts/check_mermaid_colours.py" docs || fail=1
exit $fail
