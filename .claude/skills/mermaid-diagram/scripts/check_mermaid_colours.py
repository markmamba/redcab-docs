#!/usr/bin/env python3
"""Print every colour value in a mermaid diagram that breaks the skill's colour rules, then the count.
Exit 1 when the count is not 0.

Pass files or folders; the script reads every mermaid block in .md and .mdx files.
A node names its colour category with `class <node> subject|host|external|ok|problem`, and the file
`src/css/mermaid-categories.css` colours each category for light and dark mode.
So a diagram writes no colour value, with two exceptions that read in both modes:
- one `linkStyle` colour with at least 3:1 contrast on both pages
- a see-through `box` or `rect` colour in a sequence diagram
"""
import pathlib
import re
import sys

CATEGORIES = {'subject', 'host', 'external', 'ok', 'problem'}
COLOUR_KEYS = ('fill', 'stroke', 'color')
PAGES = {'light': '#ffffff', 'dark': '#1f1f1f'}
# Text colour of each Mermaid theme, for text drawn on a `box` or `rect` background.
THEME_TEXT = {'light': '#333333', 'dark': '#cccccc'}
LINE_CONTRAST = 3.0   # WCAG minimum for lines and borders
TEXT_CONTRAST = 4.5   # WCAG minimum for text
NAMED = {'white': '#ffffff', 'black': '#000000', 'red': '#ff0000', 'green': '#008000',
         'blue': '#0000ff', 'grey': '#808080', 'gray': '#808080', 'yellow': '#ffff00',
         'orange': '#ffa500', 'lightgrey': '#d3d3d3', 'lightgray': '#d3d3d3'}


def rgba(value):
    """Return (r, g, b, alpha) for a hex, rgb(), rgba() or named colour, else None."""
    value = NAMED.get(value.strip().lower(), value.strip())
    hex_match = re.fullmatch(r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})', value)
    if hex_match:
        digits = hex_match.group(1)
        digits = ''.join(c * 2 for c in digits) if len(digits) == 3 else digits
        return tuple(int(digits[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
    func_match = re.fullmatch(r'rgba?\(([^)]*)\)', value)
    if func_match:
        parts = [float(p) for p in func_match.group(1).split(',')]
        return tuple(parts[:3]) + ((parts[3],) if len(parts) == 4 else (1.0,))
    return None


def over(colour, page):
    """Mix a see-through colour over the page, as the browser draws it."""
    r, g, b, a = colour
    pr, pg, pb, _ = rgba(page)
    return (r * a + pr * (1 - a), g * a + pg * (1 - a), b * a + pb * (1 - a), 1.0)


def luminance(colour):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in colour[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    high, low = sorted((luminance(a), luminance(b)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def styles(text):
    """Return {property: value} for a style list such as `fill:none,stroke-dasharray:5 5`."""
    pairs = (p.split(':', 1) for p in text.rstrip(';').split(',') if ':' in p)
    return {k.strip(): v.strip() for k, v in pairs}


def colour_values(props):
    """The colour properties that hold a colour, so not `none` or `transparent`."""
    return {k: v for k, v in props.items() if k in COLOUR_KEYS and v not in ('', 'none', 'transparent')}


def check_directive(text):
    values = dict(re.findall(r'[\'"](\w+)[\'"]\s*:\s*[\'"]([^\'"]+)[\'"]', text))
    if 'theme' in values:
        yield f"init sets theme '{values['theme']}', so one theme draws both modes"
    if re.search(r'[\'"]themeVariables[\'"]', text):
        colours = [f"{k}:{v}" for k, v in values.items() if rgba(v)]
        if colours:
            yield f"init sets themeVariables colours {', '.join(colours)}; the theme and the CSS file colour the diagram"


def check_block(lines):
    """Yield (line offset, message) for one mermaid block."""
    colour_free_classes = set()
    for line in lines:
        match = re.match(r'\s*classDef\s+(\S+)\s+(.+)$', line)
        if match and not colour_values(styles(match.group(2))):
            colour_free_classes.update(match.group(1).split(','))
    allowed_classes = CATEGORIES | colour_free_classes

    for offset, line in enumerate(lines):
        if line.lstrip().startswith('%%{'):
            end = next((i for i in range(offset, len(lines)) if '}%%' in lines[i]), offset)
            for message in check_directive('\n'.join(lines[offset:end + 1])):
                yield offset, message
            continue

        match = re.match(r'\s*(rect|box)\s+(rgba?\([^)]*\)|#\w+|[A-Za-z]+)', line)
        if match and rgba(match.group(2)):
            for mode, page in PAGES.items():
                if contrast(over(rgba(match.group(2)), page), rgba(THEME_TEXT[mode])) < TEXT_CONTRAST:
                    yield offset, (f"{match.group(1)} {match.group(2)} is too solid, so the theme text "
                                   f"on it has under 4.5:1 contrast in {mode} mode")
                    break
            continue

        match = re.match(r'\s*class\s+(\S+)\s+([\w-]+)\s*;?$', line)
        names = [match.group(2)] if match else []
        names += re.findall(r'[\w-]+:::([\w-]+)', line)
        for name in names:
            if name not in allowed_classes:
                yield offset, f"class '{name}' is not a category; use subject, host, external, ok or problem"

        match = re.match(r'\s*(style|classDef|linkStyle)\s+(\S+)\s+(.+)$', line)
        if not match:
            continue
        kind, name, colours = match.group(1), match.group(2), colour_values(styles(match.group(3)))
        if kind == 'linkStyle':
            for key, value in colours.items():
                colour = rgba(value)
                if not colour or min(contrast(colour, rgba(p)) for p in PAGES.values()) < LINE_CONTRAST:
                    yield offset, f"linkStyle {name}: {key}:{value} has under 3:1 contrast on one page"
        elif colours:
            listed = ','.join(f"{k}:{v}" for k, v in colours.items())
            yield offset, (f"{kind} {name} sets {listed}; write class <node> subject, host, external, ok or problem, "
                           f"and no colour value")


def files(paths):
    for path in map(pathlib.Path, paths):
        yield from sorted(path.rglob('*.md*')) if path.is_dir() else [path]


if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
    print(f"usage: check_mermaid_colours.py <file or folder>...\n\n{__doc__.strip()}")
    sys.exit(2)
count = 0
for path in files(sys.argv[1:]):
    try:
        source = path.read_text(encoding='utf-8').split('\n')
    except OSError as error:
        sys.stderr.write(f"cannot read {path}: {error}\n")
        sys.exit(2)
    start = None
    for number, line in enumerate(source, 1):
        if start is None and line.strip() == '```mermaid':
            start = number
        elif start is not None and line.strip() == '```':
            for offset, message in check_block(source[start:number - 1]):
                count += 1
                print(f"{path}:{start + offset + 1}: {message}")
            start = None
print(f"mermaid colour values that break the rules: {count}")
sys.exit(1 if count else 0)
