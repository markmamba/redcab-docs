#!/usr/bin/env python3
"""Print every prose line with more than one sentence (PROSE) and every list line nested
past level 2.1 (DEPTH), then the count. Exit 1 when the count is not 0.

The rules: a lead paragraph is one sentence, and nesting stops at 2.1. Level 2 is
indented 2 spaces under a bullet or 3 spaces under a numbered step, so an indent of
4 or more spaces is a third level.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _shape import read_lines, sentences, list_item, usage  # noqa: E402

THIRD_LEVEL_INDENT = 4

usage('check_leads.py', __doc__.strip())
count = 0
for path in sys.argv[1:]:
    for number, line in read_lines(path):
        item = list_item(line)
        if item:
            if item[0] >= THIRD_LEVEL_INDENT:
                count += 1
                print(f"{path}:{number}: DEPTH {line.strip()[:100]}")
            continue
        if len(sentences(line)) > 1:
            count += 1
            print(f"{path}:{number}: PROSE {line.strip()[:100]}")
print(f"prose lines with more than one sentence, or nesting past 2.1: {count}")
sys.exit(1 if count else 0)
