#!/usr/bin/env python3
"""Report sentences longer than a word limit in markdown prose (skips fences)."""

import re
import sys

DEFAULT_LIMIT = 25


def strip_fenced_blocks(text: str) -> str:
    return re.sub(r"```[\s\S]*?```", "", text)


def sentences(text: str) -> list[str]:
    text = strip_fenced_blocks(text)
    # Drop YAML frontmatter
    text = re.sub(r"^---[\s\S]*?---\n", "", text, count=1)
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def word_count(s: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", s))


def main() -> int:
    limit = DEFAULT_LIMIT
    paths = sys.argv[1:]
    if not paths:
        print("Usage: check_long_sentences.py <file.md> [...]", file=sys.stderr)
        return 2

    failures = 0
    for path in paths:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        for sent in sentences(content):
            wc = word_count(sent)
            if wc > limit:
                failures += 1
                preview = sent[:120] + ("..." if len(sent) > 120 else "")
                print(f"{path}: {wc} words: {preview}")
    if failures:
        print(f"\n{failures} sentence(s) over {limit} words.", file=sys.stderr)
        return 1
    print(f"OK: no sentences over {limit} words.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
