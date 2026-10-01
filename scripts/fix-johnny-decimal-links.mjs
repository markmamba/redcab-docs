/**
 * Rewrite doc links after Johnny Decimal migration.
 *   node scripts/fix-johnny-decimal-links.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');

const REPLACEMENTS = [
  ['/docs/product/business-rules/', '/docs/70-79-business/71-business-rules/'],
  ['/docs/product/business-rules', '/docs/70-79-business/71-business-rules'],
  ['/docs/product/requirements/', '/docs/70-79-business/72-requirements/'],
  ['/docs/product/requirements', '/docs/70-79-business/72-requirements'],
  ['/docs/product/planning/', '/docs/70-79-business/73-planning/'],
  ['/docs/product/planning', '/docs/70-79-business/73-planning'],
  ['/docs/product/explainers/', '/docs/70-79-business/74-explainers/'],
  ['/docs/product/explainers', '/docs/70-79-business/74-explainers'],
  ['/docs/product/start-here', '/docs/00-09-meta/start-here'],
  ['/docs/product/', '/docs/70-79-business/'],
  ['/docs/product', '/docs/70-79-business'],
  ['/docs/architecture/contexts/', '/docs/30-49-domains/31-bounded-contexts/'],
  ['/docs/architecture/contexts', '/docs/30-49-domains/31-bounded-contexts'],
  ['/docs/architecture/bounded-contexts/', '/docs/30-49-domains/31-bounded-contexts/'],
  ['/docs/architecture/bounded-contexts', '/docs/30-49-domains/31-bounded-contexts'],
  ['/docs/architecture/domain/', '/docs/30-49-domains/32-domain-models/'],
  ['/docs/architecture/domain', '/docs/30-49-domains/32-domain-models'],
  ['/docs/architecture/data-model/', '/docs/30-49-domains/33-data-model/'],
  ['/docs/architecture/data-model', '/docs/30-49-domains/33-data-model'],
  ['/docs/architecture/decisions/', '/docs/30-49-domains/34-architecture-decisions/'],
  ['/docs/architecture/decisions', '/docs/30-49-domains/34-architecture-decisions'],
  ['/docs/architecture/patterns/', '/docs/30-49-domains/35-patterns/'],
  ['/docs/architecture/patterns', '/docs/30-49-domains/35-patterns'],
  ['/docs/architecture/system/', '/docs/30-49-domains/36-system-design/'],
  ['/docs/architecture/system', '/docs/30-49-domains/36-system-design'],
  ['/docs/architecture/overview', '/docs/30-49-domains/36-system-design/overview'],
  ['/docs/architecture/api-design', '/docs/30-49-domains/36-system-design/api-design'],
  ['/docs/architecture/tech-stack', '/docs/30-49-domains/36-system-design/tech-stack'],
  ['/docs/architecture/booking-state-machine', '/docs/30-49-domains/35-patterns/booking-state-machine'],
  ['/docs/architecture/payments-architecture', '/docs/30-49-domains/35-patterns/payments-architecture'],
  ['/docs/architecture/geography', '/docs/30-49-domains/35-patterns/geography'],
  ['/docs/architecture/', '/docs/30-49-domains/'],
  ['/docs/architecture', '/docs/30-49-domains'],
  ['/docs/engineering/specs/', '/docs/60-69-initiatives/61-implementation-specs/'],
  ['/docs/engineering/specs', '/docs/60-69-initiatives/61-implementation-specs'],
  ['/docs/engineering/conventions/backend', '/docs/20-29-backend/21-conventions/backend'],
  ['/docs/engineering/conventions/frontend', '/docs/50-59-frontend/51-conventions/frontend'],
  ['/docs/engineering/conventions/domain-to-code-mapping', '/docs/20-29-backend/21-conventions/domain-to-code-mapping'],
  ['/docs/engineering/conventions/datetime-and-timezones', '/docs/20-29-backend/21-conventions/datetime-and-timezones'],
  ['/docs/engineering/conventions/', '/docs/20-29-backend/21-conventions/'],
  ['/docs/engineering/infrastructure/', '/docs/20-29-backend/22-infrastructure/'],
  ['/docs/engineering/infrastructure', '/docs/20-29-backend/22-infrastructure'],
  ['/docs/engineering/authentication/', '/docs/90-99-engineering-meta/93-authentication/'],
  ['/docs/engineering/authentication', '/docs/90-99-engineering-meta/93-authentication'],
  ['/docs/engineering/', '/docs/90-99-engineering-meta/'],
  ['/docs/engineering', '/docs/90-99-engineering-meta'],
  ['docs/product/', 'docs/70-79-business/'],
  ['docs/architecture/contexts/', 'docs/30-49-domains/31-bounded-contexts/'],
  ['docs/architecture/', 'docs/30-49-domains/'],
  ['docs/engineering/specs/', 'docs/60-69-initiatives/61-implementation-specs/'],
  ['docs/engineering/authentication/', 'docs/90-99-engineering-meta/93-authentication/'],
  ['docs/engineering/conventions/backend.md', 'docs/20-29-backend/21-conventions/backend.md'],
  ['docs/engineering/conventions/frontend.md', 'docs/50-59-frontend/51-conventions/frontend.md'],
  ['docs/engineering/conventions/domain-to-code-mapping.md', 'docs/20-29-backend/21-conventions/domain-to-code-mapping.md'],
  ['product/business-rules/', '70-79-business/71-business-rules/'],
  ['product/requirements/', '70-79-business/72-requirements/'],
  ['product/planning/', '70-79-business/73-planning/'],
  ['architecture/contexts/', '30-49-domains/31-bounded-contexts/'],
  ['architecture/decisions/', '30-49-domains/34-architecture-decisions/'],
  ['engineering/specs/', '60-69-initiatives/61-implementation-specs/'],
  ['engineering/authentication/', '90-99-engineering-meta/93-authentication/'],
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

let changed = 0;
walk(DOCS, (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  const next = apply(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
});

const repoFiles = [
  path.join(ROOT, 'AGENTS.md'),
  path.join(ROOT, 'docusaurus.config.js'),
  path.join(ROOT, 'sidebars.js'),
  path.join(ROOT, 'README.md'),
];
for (const file of repoFiles) {
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const next = apply(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
}

console.log('updated files:', changed);
