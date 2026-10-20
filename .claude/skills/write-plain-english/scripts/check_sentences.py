#!/usr/bin/env python3
"""Print every sentence over 20 words, then the count. Exit 1 when the count is not 0.

20 words is the ASD-STE100 limit for a procedural sentence. The limit applies to
prose and list lines; headings, tables and code are skipped.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _shape import read_lines, sentences, list_item, usage  # noqa: E402

LIMIT = 20

usage('check_sentences.py', __doc__.strip())
count = 0
for path in sys.argv[1:]:
    for number, line in read_lines(path):
        item = list_item(line)
        text = item[1] if item else line
        for sentence in sentences(text):
            words = len(sentence.split())
            if words > LIMIT:
                count += 1
                print(f"{path}:{number}: {words} words: {sentence[:100]}")
print(f"sentences over {LIMIT} words: {count}")
sys.exit(1 if count else 0)
