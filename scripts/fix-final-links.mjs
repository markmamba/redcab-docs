import fs from 'fs';
import path from 'path';

const DOCS = path.resolve(import.meta.dirname, '..', 'docs');

const REPLACEMENTS = [
  // Fix double-link corruption from prior script
  [/\)\(\/docs\/[^)]+\)/g, ')'],
  [/\)\(\/docs\/[^)]+\.md\)/g, ')'],
  // Moved notes paths
  [
    '/docs/product/planning/roadmap/notes/geography-data-model-review',
    '/docs/engineering/specs/cat/geography/design-review-data-model',
  ],
  [
    '/docs/product/planning/roadmap/notes/SESSION-A-DECISION-RECORD',
    '/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture',
  ],
  ['/docs/roadmap/notes/', '/docs/engineering/specs/iam/iam-audit-2026-08/'],
  [
    'roadmap/notes/geography-data-model-review.md',
    '/docs/engineering/specs/cat/geography/design-review-data-model',
  ],
  [
    'roadmap/notes/SESSION-A-DECISION-RECORD.md',
    '/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture',
  ],
  ['[template.md](./template.md)', '`_template.md` (repo file; not published)'],
  ['| Spec template | [template.md](./template.md) |', '| Spec template | `_template.md` (copy in repo) |'],
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
  for (const [from, to] of REPLACEMENTS) {
    next = typeof from === 'string' ? next.split(from).join(to) : next.replace(from, to);
  }
  if (next !== c) {
    fs.writeFileSync(file, next);
    console.log('fixed', path.relative(DOCS, file));
  }
});
