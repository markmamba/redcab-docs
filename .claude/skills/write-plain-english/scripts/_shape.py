"""Shared helpers for the three shape checks. Python 3 standard library only.

A "prose line" is a line that is not frontmatter, fenced code, a heading,
a table row, an HTML or MDX line, an image, a horizontal rule or a callout fence.
"""
import re
import sys

LIST_RE = re.compile(r'^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$')
SKIP_PREFIXES = ('#', '|', '<', '!', '---', ':::', 'import ', 'export ')
# Abbreviations that end with a full stop but do not end a sentence.
ABBREVIATIONS = (('e.g.', 'eg'), ('i.e.', 'ie'), ('vs.', 'vs'), ('etc.', 'etc'), ('No.', 'No'))


def read_lines(path):
    """Return (line_number, text) for every prose or list line in the file."""
    try:
        text = open(path, encoding='utf-8').read()
    except OSError as error:
        sys.stderr.write(f"cannot read {path}: {error}\n")
        sys.exit(2)
    text = strip_frontmatter(text)
    text = re.sub(r'```.*?```', lambda m: '\n' * m.group(0).count('\n'), text, flags=re.S)
    for number, line in enumerate(text.split('\n'), 1):
        stripped = line.strip()
        if not stripped or stripped.startswith(SKIP_PREFIXES):
            continue
        yield number, line


def strip_frontmatter(text):
    """Blank out a leading YAML block so its lines keep their numbers."""
    match = re.match(r'^---\n.*?\n---\n', text, flags=re.S)
    if not match:
        return text
    return '\n' * match.group(0).count('\n') + text[match.end():]


def sentences(text):
    """Split one line into sentences. Code spans and bracketed text count as one word."""
    text = re.sub(r'`[^`]*`', 'X', text)
    text = re.sub(r'\]\([^)]*\)', ']', text)
    text = re.sub(r'\([^)]*\)', '', text)
    for long, short in ABBREVIATIONS:
        text = text.replace(long, short)
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"\'(\[])', text.strip())
    return [part for part in parts if part.strip()]


def list_item(line):
    """Return (indent_width, item_text) for a bullet or numbered step, else None."""
    match = LIST_RE.match(line)
    if not match:
        return None
    return len(match.group(1).expandtabs(4)), match.group(2)


def usage(name, what):
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
        sys.stderr.write(f"usage: {name} FILE [FILE...]\n{what}\n")
        sys.exit(2)
