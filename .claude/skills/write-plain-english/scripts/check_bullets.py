#!/usr/bin/env python3
"""Print every bullet or numbered step that holds more than one sentence, then the count.
Exit 1 when the count is not 0.

The rule: a bullet or a step holds one sentence. A second sentence becomes a nested
bullet or a sibling bullet.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _shape import read_lines, sentences, list_item, usage  # noqa: E402

usage('check_bullets.py', __doc__.strip())
count = 0
for path in sys.argv[1:]:
    for number, line in read_lines(path):
        item = list_item(line)
        if item and len(sentences(item[1])) > 1:
            count += 1
            print(f"{path}:{number}: {line.strip()[:100]}")
print(f"bullets or steps with more than one sentence: {count}")
sys.exit(1 if count else 0)
