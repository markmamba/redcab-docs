/**
 * Second-pass link fixes after Option A migration.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');

const REPLACEMENTS = [
  ['/docs/product/product/', '/docs/product/'],
  ['/docs/architecture/architecture/', '/docs/architecture/'],
  ['/docs/engineering/engineering/', '/docs/engineering/'],
  ['/docs/architecture/bounded-contexts/', '/docs/architecture/contexts/'],
  ['/docs/architecture/bounded-contexts', '/docs/architecture/contexts'],
  ['/docs/business-rules/', '/docs/product/business-rules/'],
  ['/docs/business-rules', '/docs/product/business-rules'],
  ['/docs/requirements/', '/docs/product/requirements/'],
  ['/docs/requirements', '/docs/product/requirements'],
  ['/docs/ambiguities/open-questions', '/docs/product/planning/open-questions'],
  ['/docs/roadmap/', '/docs/product/planning/roadmap/'],
  ['/docs/roadmap', '/docs/product/planning/roadmap'],
  ['/docs/domain/', '/docs/architecture/domain/'],
  ['/docs/domain', '/docs/architecture/domain'],
  ['/docs/specs/', '/docs/engineering/specs/'],
  ['/docs/specs', '/docs/engineering/specs'],
  ['bounded-contexts.md', 'contexts/index'],
  ['../business-rules/invariants.md', '/docs/product/business-rules/invariants'],
  ['../business-rules/glossary.md', '/docs/product/business-rules/glossary'],
  ['../ambiguities/open-questions.md', '/docs/product/planning/open-questions'],
  ['business-rules/invariants.md', '/docs/product/business-rules/invariants'],
  ['business-rules/glossary.md', '/docs/product/business-rules/glossary'],
  ['ambiguities/open-questions.md', '/docs/product/planning/open-questions'],
  ['docs/specs/', 'docs/engineering/specs/'],
  ['../../engineering/README.md', '/docs/engineering'],
  ['../engineering/README.md', '/docs/engineering'],
  ['../requirements/README.md', '/docs/product/requirements'],
  ['../../domain/domain-models.md', '/docs/architecture/domain/domain-models'],
  ['../domain/domain-models.md', '/docs/architecture/domain/domain-models'],
  ['../overview.md', '/docs/architecture/system/overview'],
  ['../api-design.md', '/docs/architecture/system/api-design'],
  ['../bounded-contexts.md', '/docs/architecture/contexts'],
  ['../payments-architecture.md', '/docs/architecture/patterns/payments-architecture'],
  ['../geography.md', '/docs/architecture/patterns/geography'],
  ['../architecture/bounded-contexts.md', '/docs/architecture/contexts'],
  ['../architecture/overview.md', '/docs/architecture/system/overview'],
  ['../architecture/geography.md', '/docs/architecture/patterns/geography'],
  ['../architecture/decisions/', '/docs/architecture/decisions/'],
  ['../../architecture/bounded-contexts.md', '/docs/architecture/contexts'],
  ['../../architecture/overview.md', '/docs/architecture/system/overview'],
  ['../../architecture/geography.md', '/docs/architecture/patterns/geography'],
  ['../../architecture/decisions/', '/docs/architecture/decisions/'],
  ['../../product/business-rules/invariants.md', '/docs/product/business-rules/invariants'],
  ['../../product/requirements/', '/docs/product/requirements/'],
  ['../product/business-rules/invariants.md', '/docs/product/business-rules/invariants'],
  ['../product/requirements/', '/docs/product/requirements/'],
  ['/docs/engineering/backend-conventions', '/docs/engineering/conventions/backend'],
  ['/docs/engineering/frontend-conventions', '/docs/engineering/conventions/frontend'],
  ['/docs/engineering/domain-to-code-mapping', '/docs/engineering/conventions/domain-to-code-mapping'],
  ['/docs/engineering/datetime-and-timezones', '/docs/engineering/conventions/datetime-and-timezones'],
  ['/docs/architecture/overview', '/docs/architecture/system/overview'],
  ['/docs/architecture/api-design', '/docs/architecture/system/api-design'],
  ['/docs/architecture/tech-stack', '/docs/architecture/system/tech-stack'],
  ['/docs/architecture/booking-state-machine', '/docs/architecture/patterns/booking-state-machine'],
  ['/docs/architecture/payments-architecture', '/docs/architecture/patterns/payments-architecture'],
  ['/docs/architecture/geography', '/docs/architecture/patterns/geography'],
  ['tourist-web-56-tourist-access-and-route-contract', 'engineering/specs/iam/web-56-tourist-access-and-route-contract'],
  ['geography-administrative-tree', 'engineering/specs/cat/geography/docs-13-geography-administrative-tree'],
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (/\.(md|mdx|js|json)$/.test(ent.name)) cb(full);
  }
}

function apply(content) {
  let c = content;
  for (const [from, to] of REPLACEMENTS) {
    c = c.split(from).join(to);
  }
  return c;
}

walk(DOCS, (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  const next = apply(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next);
    console.log('fixed', path.relative(DOCS, file));
  }
});

for (const rel of ['AGENTS.md', 'README.md', 'sidebars.js', 'docusaurus.config.js']) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const raw = fs.readFileSync(full, 'utf8');
  const next = apply(raw);
  if (next !== raw) fs.writeFileSync(full, next);
}

console.log('Link fix complete.');
