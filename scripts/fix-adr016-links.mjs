import fs from 'fs';
import path from 'path';

const DOCS = path.resolve(import.meta.dirname, '..', 'docs');

const FIXES = [
  [
    'adr-016-engineering/specs/cat/geography/docs-13-geography-administrative-tree',
    'adr-016-geography-administrative-tree',
  ],
  ['architecture/bounded-contexts/', 'architecture/contexts/'],
  ['../architecture/bounded-contexts/', '../../../architecture/contexts/'],
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (ent.name.endsWith('.md')) cb(full);
  }
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

// Ensure ADR-017 in index
const indexFile = path.join(DOCS, 'architecture/decisions/index.md');
let idx = fs.readFileSync(indexFile, 'utf8');
if (!idx.includes('ADR-017')) {
  idx = idx.replace(
    '| ADR-016 | [ADR-016: Geography Administrative Tree](/docs/architecture/decisions/adr-016-geography-administrative-tree) | Accepted |',
    '| ADR-016 | [ADR-016: Geography Administrative Tree](/docs/architecture/decisions/adr-016-geography-administrative-tree) | Accepted |\n| ADR-017 | [ADR-017: Tourist UI public URL architecture](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) | Accepted |',
  );
  fs.writeFileSync(indexFile, idx);
  console.log('added ADR-017 to index');
}
