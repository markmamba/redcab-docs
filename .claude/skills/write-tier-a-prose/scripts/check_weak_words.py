#!/usr/bin/env python3
"""Flag discouraged Tier A phrases in markdown (skips fenced code)."""

import re
import sys

BLOCKED = [
    r"\bleverage\b",
    r"\butilize\b",
    r"\bensure\b",
    r"\bfacilitate\b",
    r"\brobust\b",
    r"\bseamless\b",
    r"\baforementioned\b",
    r"\bcircle back\b",
    r"\blow-hanging fruit\b",
]


def strip_fenced_blocks(text: str) -> str:
    return re.sub(r"```[\s\S]*?```", "", text)


def main() -> int:
    paths = sys.argv[1:]
    if not paths:
        print("Usage: check_weak_words.py <file.md> [...]", file=sys.stderr)
        return 2

    hits = 0
    for path in paths:
        with open(path, encoding="utf-8") as f:
            content = strip_fenced_blocks(f.read())
        for pattern in BLOCKED:
            for m in re.finditer(pattern, content, flags=re.IGNORECASE):
                hits += 1
                line = content.count("\n", 0, m.start()) + 1
                print(f"{path}:{line}: matched /{pattern}/")
    if hits:
        print(f"\n{hits} weak-word hit(s).", file=sys.stderr)
        return 1
    print("OK: no blocked phrases.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
