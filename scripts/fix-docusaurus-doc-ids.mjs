/**
 * Docusaurus strips NN- from category folder names in routes and doc IDs.
 * Fix /docs/... links to match published paths.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

const REPLACEMENTS = [
  ['/docs/70-79-business/71-business-rules/', '/docs/70-79-business/business-rules/'],
  ['/docs/70-79-business/71-business-rules', '/docs/70-79-business/business-rules'],
  ['/docs/70-79-business/72-requirements/', '/docs/70-79-business/requirements/'],
  ['/docs/70-79-business/72-requirements', '/docs/70-79-business/requirements'],
  ['/docs/70-79-business/73-planning/', '/docs/70-79-business/planning/'],
  ['/docs/70-79-business/73-planning', '/docs/70-79-business/planning'],
  ['/docs/70-79-business/74-explainers/', '/docs/70-79-business/explainers/'],
  ['/docs/70-79-business/74-explainers', '/docs/70-79-business/explainers'],
  ['/docs/30-49-domains/31-bounded-contexts/', '/docs/30-49-domains/bounded-contexts/'],
  ['/docs/30-49-domains/31-bounded-contexts', '/docs/30-49-domains/bounded-contexts'],
  ['/docs/30-49-domains/32-domain-models/', '/docs/30-49-domains/domain-models/'],
  ['/docs/30-49-domains/32-domain-models', '/docs/30-49-domains/domain-models'],
  ['/docs/30-49-domains/33-data-model/', '/docs/30-49-domains/data-model/'],
  ['/docs/30-49-domains/33-data-model', '/docs/30-49-domains/data-model'],
  ['/docs/30-49-domains/34-architecture-decisions/', '/docs/30-49-domains/architecture-decisions/'],
  ['/docs/30-49-domains/34-architecture-decisions', '/docs/30-49-domains/architecture-decisions'],
  ['/docs/30-49-domains/35-patterns/', '/docs/30-49-domains/patterns/'],
  ['/docs/30-49-domains/35-patterns', '/docs/30-49-domains/patterns'],
  ['/docs/30-49-domains/36-system-design/', '/docs/30-49-domains/system-design/'],
  ['/docs/30-49-domains/36-system-design', '/docs/30-49-domains/system-design'],
  ['/docs/60-69-initiatives/61-implementation-specs/', '/docs/60-69-initiatives/implementation-specs/'],
  ['/docs/60-69-initiatives/61-implementation-specs', '/docs/60-69-initiatives/implementation-specs'],
  ['/docs/20-29-backend/21-conventions/', '/docs/20-29-backend/conventions/'],
  ['/docs/20-29-backend/21-conventions', '/docs/20-29-backend/conventions'],
  ['/docs/20-29-backend/22-infrastructure/', '/docs/20-29-backend/infrastructure/'],
  ['/docs/20-29-backend/22-infrastructure', '/docs/20-29-backend/infrastructure'],
  ['/docs/50-59-frontend/51-conventions/', '/docs/50-59-frontend/conventions/'],
  ['/docs/50-59-frontend/51-conventions', '/docs/50-59-frontend/conventions'],
  ['/docs/90-99-engineering-meta/93-authentication/', '/docs/90-99-engineering-meta/authentication/'],
  ['/docs/90-99-engineering-meta/93-authentication', '/docs/90-99-engineering-meta/authentication'],
  ['60-69-initiatives/61-implementation-specs/README', '60-69-initiatives/implementation-specs/README'],
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (/\.(md|mdx|json|js)$/.test(ent.name)) cb(full);
  }
}

function apply(content) {
  let c = content;
  for (const [from, to] of REPLACEMENTS) {
    c = c.split(from).join(to);
  }
  return c;
}

const targets = [
  path.join(ROOT, 'docs'),
  path.join(ROOT, 'docusaurus.config.js'),
  path.join(ROOT, 'scripts', 'johnny-decimal-redirects.json'),
];

let n = 0;
for (const base of targets) {
  if (!fs.existsSync(base)) continue;
  if (fs.statSync(base).isFile()) {
    const raw = fs.readFileSync(base, 'utf8');
    const next = apply(raw);
    if (next !== raw) {
      fs.writeFileSync(base, next);
      n += 1;
    }
    continue;
  }
  walk(base, (file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const next = apply(raw);
    if (next !== raw) {
      fs.writeFileSync(file, next);
      n += 1;
    }
  });
}

console.log('fixed files:', n);
