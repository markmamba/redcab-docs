/**
 * Build client redirect map: old /docs/... paths → new Johnny Decimal paths.
 *   node scripts/generate-johnny-decimal-redirects.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const OUT = path.join(ROOT, 'scripts', 'johnny-decimal-redirects.json');

const PREFIX_MAP = [
  ['product/business-rules', '70-79-business/71-business-rules'],
  ['product/requirements', '70-79-business/72-requirements'],
  ['product/planning', '70-79-business/73-planning'],
  ['product/explainers', '70-79-business/74-explainers'],
  ['product/start-here', '00-09-meta/start-here'],
  ['product/index', '70-79-business/index'],
  ['architecture/contexts', '30-49-domains/31-bounded-contexts'],
  ['architecture/bounded-contexts', '30-49-domains/31-bounded-contexts'],
  ['architecture/domain', '30-49-domains/32-domain-models'],
  ['architecture/data-model', '30-49-domains/33-data-model'],
  ['architecture/decisions', '30-49-domains/34-architecture-decisions'],
  ['architecture/patterns', '30-49-domains/35-patterns'],
  ['architecture/system', '30-49-domains/36-system-design'],
  ['architecture/overview', '30-49-domains/36-system-design/overview'],
  ['architecture/api-design', '30-49-domains/36-system-design/api-design'],
  ['architecture/tech-stack', '30-49-domains/36-system-design/tech-stack'],
  ['architecture/booking-state-machine', '30-49-domains/35-patterns/booking-state-machine'],
  ['architecture/payments-architecture', '30-49-domains/35-patterns/payments-architecture'],
  ['architecture/geography', '30-49-domains/35-patterns/geography'],
  ['architecture/index', '30-49-domains/index'],
  ['engineering/specs', '60-69-initiatives/61-implementation-specs'],
  ['engineering/conventions/backend', '20-29-backend/21-conventions/backend'],
  ['engineering/conventions/frontend', '50-59-frontend/51-conventions/frontend'],
  ['engineering/conventions/domain-to-code-mapping', '20-29-backend/21-conventions/domain-to-code-mapping'],
  ['engineering/conventions/datetime-and-timezones', '20-29-backend/21-conventions/datetime-and-timezones'],
  ['engineering/infrastructure', '20-29-backend/22-infrastructure'],
  ['engineering/authentication', '90-99-engineering-meta/93-authentication'],
  ['engineering/index', '90-99-engineering-meta/index'],
  ['business-rules', '70-79-business/71-business-rules'],
  ['requirements', '70-79-business/72-requirements'],
  ['roadmap', '70-79-business/73-planning/roadmap'],
  ['domain', '30-49-domains/32-domain-models'],
  ['specs', '60-69-initiatives/61-implementation-specs'],
  ['ambiguities/open-questions', '70-79-business/73-planning/open-questions'],
];

function walkMdFiles(dir, base = '') {
  const entries = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) entries.push(...walkMdFiles(full, rel));
    else if (ent.name === 'index.md') entries.push(rel.replace(/\/index\.md$/, '').replace(/index\.md$/, ''));
    else if (ent.name.endsWith('.md')) entries.push(rel.replace(/\.md$/, ''));
  }
  return entries;
}

function toRoute(slug) {
  if (!slug) return '/docs';
  return `/docs/${slug}`;
}

function mapOldSlug(oldSlug) {
  for (const [from, to] of PREFIX_MAP) {
    if (oldSlug === from) return to;
    if (oldSlug.startsWith(`${from}/`)) return `${to}/${oldSlug.slice(from.length + 1)}`;
  }
  return null;
}

const newSlugs = new Set(walkMdFiles(DOCS));
const redirects = [];

for (const oldPrefix of PREFIX_MAP.map(([f]) => f)) {
  for (const newSlug of newSlugs) {
    const mapped = mapOldSlug(oldPrefix);
    if (mapped && newSlug === mapped) {
      redirects.push({ from: toRoute(oldPrefix), to: toRoute(newSlug) });
    }
  }
}

// Every file: old tier paths → current path
for (const newSlug of newSlugs) {
  const candidates = [
    `product/${newSlug}`,
    `architecture/${newSlug}`,
    `engineering/${newSlug}`,
    newSlug,
  ];
  for (const old of PREFIX_MAP) {
    const [from, to] = old;
    if (newSlug === to || newSlug.startsWith(`${to}/`)) {
      const suffix = newSlug === to ? '' : newSlug.slice(to.length + 1);
      const oldPath = suffix ? `${from}/${suffix}` : from;
      redirects.push({ from: toRoute(oldPath), to: toRoute(newSlug) });
    }
  }
}

// Dedupe
const seen = new Set();
const unique = [];
for (const r of redirects) {
  const key = r.from.replace(/\/$/, '');
  if (seen.has(key)) continue;
  seen.add(key);
  if (r.from === r.to) continue;
  unique.push({ from: key, to: r.to.endsWith('/') ? r.to : r.to });
}

unique.sort((a, b) => a.from.localeCompare(b.from));
fs.writeFileSync(OUT, JSON.stringify(unique, null, 2) + '\n');
console.log('wrote', unique.length, 'redirects to', OUT);
