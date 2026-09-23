import fs from 'fs';
import path from 'path';

const DOCS = path.resolve(import.meta.dirname, '..', 'docs');

const FIXES = [
  [
    'docs-13-engineering/specs/cat/geography/docs-13-geography-administrative-tree',
    'docs-13-geography-administrative-tree',
  ],
  [
    './engineering/specs/cat/geography/docs-13-geography-administrative-tree.md',
    './docs-13-geography-administrative-tree.md',
  ],
  [
    '[engineering/specs/cat/geography/docs-13-geography-administrative-tree.md]',
    '[docs-13-geography-administrative-tree.md]',
  ],
  ['docs/engineering/specs/_template.md', 'docs/engineering/specs/template.md'],
  ['./_template.md', './template.md'],
  ['_template.md', 'template.md'],
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (ent.name.endsWith('.md')) cb(full);
  }
}

// Rename template
const templateOld = path.join(DOCS, 'engineering/specs/_template.md');
const templateNew = path.join(DOCS, 'engineering/specs/template.md');
if (fs.existsSync(templateOld)) {
  fs.renameSync(templateOld, templateNew);
  console.log('renamed _template.md → template.md');
}

// Remove duplicate spec index (conflicts with README route)
const specIndex = path.join(DOCS, 'engineering/specs/index.md');
if (fs.existsSync(specIndex)) {
  fs.unlinkSync(specIndex);
  console.log('removed engineering/specs/index.md (duplicate of README)');
}

walk(DOCS, (file) => {
  let c = fs.readFileSync(file, 'utf8');
  let next = c;
  for (const [from, to] of FIXES) next = next.split(from).join(to);
  if (next !== c) {
    fs.writeFileSync(file, next);
    console.log('fixed', path.relative(DOCS, file));
  }
});

// Root files
for (const rel of ['AGENTS.md', '../AGENTS.md']) {
  const full = path.resolve(import.meta.dirname, '..', rel);
  if (!fs.existsSync(full)) continue;
  let c = fs.readFileSync(full, 'utf8');
  let next = c;
  for (const [from, to] of FIXES) next = next.split(from).join(to);
  if (next !== c) fs.writeFileSync(full, next);
}
