/**
 * Rewrite option-a redirect targets and append tier migration redirects.
 *   node scripts/refresh-johnny-decimal-redirects.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OPTION_A = path.join(ROOT, 'scripts', 'option-a-redirects.json');
const OUT = path.join(ROOT, 'scripts', 'johnny-decimal-redirects.json');

const REPLACEMENTS = [
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
  ['/docs/engineering/infrastructure/', '/docs/20-29-backend/22-infrastructure/'],
  ['/docs/engineering/infrastructure', '/docs/20-29-backend/22-infrastructure'],
  ['/docs/engineering/authentication/', '/docs/90-99-engineering-meta/93-authentication/'],
  ['/docs/engineering/authentication', '/docs/90-99-engineering-meta/93-authentication'],
  ['/docs/engineering/', '/docs/90-99-engineering-meta/'],
  ['/docs/engineering', '/docs/90-99-engineering-meta'],
];

function mapUrl(url) {
  let u = url;
  for (const [from, to] of REPLACEMENTS) {
    u = u.split(from).join(to);
  }
  return u;
}

const optionA = JSON.parse(fs.readFileSync(OPTION_A, 'utf8'));
const mapped = optionA.map(({ from, to }) => ({ from, to: mapUrl(to) }));

const tierRedirects = [
  { from: '/docs/product', to: '/docs/70-79-business' },
  { from: '/docs/architecture', to: '/docs/30-49-domains' },
  { from: '/docs/engineering', to: '/docs/90-99-engineering-meta' },
];

const all = [...mapped, ...tierRedirects];
const seen = new Set();
const unique = [];
for (const r of all) {
  const key = r.from.replace(/\/$/, '') || r.from;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push({ from: key, to: r.to });
}

fs.writeFileSync(OUT, JSON.stringify(unique, null, 2) + '\n');
console.log('wrote', unique.length, 'redirects');
