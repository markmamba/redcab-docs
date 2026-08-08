/**
 * Migrates red-cab-docs → redcab-docs/docs (all sections except architecture).
 * Run: node scripts/migrate-docs.mjs && node scripts/format-doc-headers.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_ROOT = path.resolve(ROOT, '../red-cab-docs');
const DEST = path.join(ROOT, 'docs');

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
}

function writeDoc(relPath, frontmatter, body) {
  const full = path.join(DEST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const processed = transformLinks(prepareBody(body));
  const fm = Object.entries(frontmatter)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  fs.writeFileSync(full, `---\n${fm}\n---\n\n${processed}\n`, 'utf8');
  console.log('wrote', relPath);
}

function prepareBody(body) {
  let c = body;
  // Strip leading title H1 and metadata blockquote
  c = c.replace(/^# [^\n]+\n\n/, '');
  c = c.replace(/^> [\s\S]*?\n\n(?=##|---)/, '');
  // Demote remaining top-level H1s to H2 (domain-models, site index patterns)
  c = c
    .split('\n')
    .map((line) => (line.match(/^# [^#]/) ? `##${line.slice(1)}` : line))
    .join('\n');
  c = c.replace(/^---\n+/, '');
  return c.trimStart();
}

export function transformLinks(content) {
  let c = content;

  // PRD PDF (notes not migrated)
  c = c.replace(
    /\]\(\.\.\/notes\/redcab-prd\.pdf([^)]*)\)/g,
    '](https://github.com/red-cab/red-cab-docs/blob/main/notes/redcab-prd.pdf$1)',
  );
  c = c.replace(
    /\[[^\]]*\]\([^)]*notes\/redcab-prd\.pdf[^)]*\)/g,
    '`notes/redcab-prd.pdf` in the planning repo (not published on this site)',
  );

  // Business rules
  c = c.replace(/\]\(\.\.\/business-rules\/business-rules\.md([^)]*)\)/g, '](/docs/business-rules/invariants$1)');
  c = c.replace(/\]\(\.\/business-rules\.md([^)]*)\)/g, '](/docs/business-rules/invariants$1)');
  c = c.replace(/\]\(\.\.\/business-rules\/glossary\.md([^)]*)\)/g, '](/docs/business-rules/glossary$1)');
  c = c.replace(/\]\(\.\/glossary\.md([^)]*)\)/g, '](/docs/business-rules/glossary$1)');
  c = c.replace(/\]\(\.\.\/business-rules\/([^)#]+)\.md([^)]*)\)/g, '](/docs/business-rules/$1$2)');

  // Domain
  c = c.replace(/\]\(\.\.\/domain\/([^)#]+)\.md([^)]*)\)/g, '](/docs/domain/$1$2)');
  c = c.replace(/\]\(\.\/domain-models\.md([^)]*)\)/g, '](/docs/domain/domain-models$1)');

  // Requirements
  c = c.replace(/\]\(\.\.\/requirements\/README\.md([^)]*)\)/g, '](/docs/requirements$1)');
  c = c.replace(/\]\(\.\/README\.md([^)]*)\)/g, '](/docs/requirements$1)');
  c = c.replace(
    /\]\(\.\.\/requirements\/functional-requirements\.md([^)]*)\)/g,
    '](/docs/requirements/functional-requirements$1)',
  );
  c = c.replace(
    /\]\(\.\/functional-requirements\.md([^)]*)\)/g,
    '](/docs/requirements/functional-requirements$1)',
  );
  c = c.replace(
    /\]\(\.\.\/requirements\/non-functional-requirements\.md([^)]*)\)/g,
    '](/docs/requirements/non-functional-requirements$1)',
  );
  c = c.replace(
    /\]\(\.\/non-functional-requirements\.md([^)]*)\)/g,
    '](/docs/requirements/non-functional-requirements$1)',
  );
  c = c.replace(
    /\]\(\.\.\/requirements\/traceability-matrix\.md([^)]*)\)/g,
    '](/docs/requirements/traceability-matrix$1)',
  );
  c = c.replace(
    /\]\(\.\/traceability-matrix\.md([^)]*)\)/g,
    '](/docs/requirements/traceability-matrix$1)',
  );
  c = c.replace(/\]\(\.\.\/requirements\/\)/g, '](/docs/requirements/)');
  c = c.replace(/\]\(\.\.\/requirements\/([^)#]+)\.md([^)]*)\)/g, '](/docs/requirements/$1$2)');

  // Engineering
  c = c.replace(/\]\(\.\.\/engineering\/README\.md([^)]*)\)/g, '](/docs/engineering$1)');
  c = c.replace(/\]\(\.\.\/engineering\/\)/g, '](/docs/engineering/)');
  c = c.replace(/\]\(\.\.\/engineering\/([^)#]+)\.md([^)]*)\)/g, '](/docs/engineering/$1$2)');
  c = c.replace(/\]\(\.\/([^)/]+)\.md([^)]*)\)/g, (match, slug, anchor) => {
    if (['backend-conventions', 'frontend-conventions', 'domain-to-code-mapping'].includes(slug)) {
      return `](/docs/engineering/${slug}${anchor})`;
    }
    return match;
  });

  // Ambiguities
  c = c.replace(/\]\(\.\.\/ambiguities\/([^)#]+)\.md([^)]*)\)/g, '](/docs/ambiguities/$1$2)');

  // Roadmap
  c = c.replace(/\]\(\.\.\/roadmap\/([^)#]+)\.md([^)]*)\)/g, '](/docs/roadmap/$1$2)');

  // Architecture (cross-links from non-architecture docs)
  c = c.replace(/\]\(\.\.\/architecture\/overview\.md([^)]*)\)/g, '](/docs/architecture/overview$1)');
  c = c.replace(/\]\(\.\.\/architecture\/bounded-contexts\.md#domain-events-catalog-in-process-past-tense-idempotent([^)]*)\)/g, '](/docs/architecture/bounded-contexts/domain-events$1)');
  c = c.replace(/\]\(\.\.\/architecture\/bounded-contexts\.md#why-geography-and-search-are-modules-inside-catalog-not-contexts([^)]*)\)/g, '](/docs/architecture/bounded-contexts/design-rationales#why-geography-and-search-are-modules-inside-catalog-not-contexts$1)');
  c = c.replace(/\]\(\.\.\/architecture\/bounded-contexts\.md#([^)]+)\)/g, '](/docs/architecture/bounded-contexts#$1)');
  c = c.replace(/\]\(\.\.\/architecture\/bounded-contexts\.md([^)]*)\)/g, '](/docs/architecture/bounded-contexts$1)');
  c = c.replace(/\]\(\.\.\/architecture\/payments-architecture\.md([^)]*)\)/g, '](/docs/architecture/payments-architecture$1)');
  c = c.replace(/\]\(\.\.\/architecture\/booking-state-machine\.md([^)]*)\)/g, '](/docs/architecture/booking-state-machine$1)');
  c = c.replace(/\]\(\.\.\/architecture\/tech-stack\.md([^)]*)\)/g, '](/docs/architecture/tech-stack$1)');
  c = c.replace(/\]\(\.\.\/architecture\/api-design\.md([^)]*)\)/g, '](/docs/architecture/api-design$1)');
  c = c.replace(/\]\(\.\.\/architecture\/data-model\.md([^)]*)\)/g, '](/docs/architecture/data-model$1)');
  c = c.replace(/\]\(\.\.\/architecture\/decisions\/ADR-(\d+)-([^)]+)\.md([^)]*)\)/gi, '](/docs/architecture/decisions/adr-$1-$2$3)');
  c = c.replace(/\]\(\.\.\/architecture\/decisions\/([^)]+)\.md([^)]*)\)/g, '](/docs/architecture/decisions/$1$2)');

  // Same-folder architecture ./ paths
  c = c.replace(/\]\(\.\/overview\.md([^)]*)\)/g, '](/docs/architecture/overview$1)');
  c = c.replace(/\]\(\.\/bounded-contexts\.md([^)]*)\)/g, '](/docs/architecture/bounded-contexts$1)');
  c = c.replace(/\]\(\.\/payments-architecture\.md([^)]*)\)/g, '](/docs/architecture/payments-architecture$1)');
  c = c.replace(/\]\(\.\/booking-state-machine\.md([^)]*)\)/g, '](/docs/architecture/booking-state-machine$1)');
  c = c.replace(/\]\(\.\/api-design\.md([^)]*)\)/g, '](/docs/architecture/api-design$1)');
  c = c.replace(/\]\(\.\/tech-stack\.md([^)]*)\)/g, '](/docs/architecture/tech-stack$1)');
  c = c.replace(/\]\(\.\/data-model\.md([^)]*)\)/g, '](/docs/architecture/data-model$1)');

  // Index / root
  c = c.replace(/\]\(\.\.\/index\.md([^)]*)\)/g, '](/docs$1)');
  c = c.replace(/\]\(business-rules\/glossary\.md([^)]*)\)/g, '](/docs/business-rules/glossary$1)');
  c = c.replace(/\]\(business-rules\/business-rules\.md([^)]*)\)/g, '](/docs/business-rules/invariants$1)');
  c = c.replace(/\]\(requirements\/README\.md([^)]*)\)/g, '](/docs/requirements$1)');
  c = c.replace(/\]\(requirements\/functional-requirements\.md([^)]*)\)/g, '](/docs/requirements/functional-requirements$1)');
  c = c.replace(/\]\(requirements\/non-functional-requirements\.md([^)]*)\)/g, '](/docs/requirements/non-functional-requirements$1)');
  c = c.replace(/\]\(requirements\/traceability-matrix\.md([^)]*)\)/g, '](/docs/requirements/traceability-matrix$1)');
  c = c.replace(
    /\]\(architecture\/decisions\/ADR-(\d+)-([^)]+)\.md([^)]*)\)/gi,
    '](/docs/architecture/decisions/adr-$1-$2$3)',
  );
  c = c.replace(/\]\(architecture\/([^)#]+)\.md([^)]*)\)/g, '](/docs/architecture/$1$2)');
  c = c.replace(/\]\(domain\/([^)#]+)\.md([^)]*)\)/g, '](/docs/domain/$1$2)');
  c = c.replace(/\]\(engineering\/README\.md([^)]*)\)/g, '](/docs/engineering$1)');
  c = c.replace(/\]\(engineering\/([^)#]+)\.md([^)]*)\)/g, '](/docs/engineering/$1$2)');
  c = c.replace(/\]\(ambiguities\/([^)#]+)\.md([^)]*)\)/g, '](/docs/ambiguities/$1$2)');
  c = c.replace(/\]\(roadmap\/phasing\.md([^)]*)\)/g, '](/docs/roadmap$1)');
  c = c.replace(/\]\(roadmap\/([^)#]+)\.md([^)]*)\)/g, '](/docs/roadmap/$1$2)');
  c = c.replace(/\]\(\/docs\/roadmap\/phasing([^)]*)\)/g, '](/docs/roadmap$1)');

  // Normalize doc paths (no /index suffix; lowercase ADRs)
  c = c.replace(/\]\(\/docs\/requirements\/index([^)]*)\)/g, '](/docs/requirements$1)');
  c = c.replace(/\]\(\/docs\/engineering\/README([^)]*)\)/g, '](/docs/engineering$1)');
  c = c.replace(/\]\(\/docs\/engineering\/index([^)]*)\)/g, '](/docs/engineering$1)');
  c = c.replace(
    /\]\(\/docs\/architecture\/decisions\/ADR-(\d+)-([^)]+)\)/gi,
    '](/docs/architecture/decisions/adr-$1-$2)',
  );
  // Inline backtick refs
  c = c.replace(/`business-rules\.md`/g, '[Business Rules](/docs/business-rules/invariants)');

  return c;
}

function extractBetween(body, startMarker, endMarker) {
  const start = body.indexOf(startMarker);
  if (start < 0) return '';
  const end = endMarker ? body.indexOf(endMarker, start + startMarker.length) : body.length;
  return body.slice(start, end < 0 ? body.length : end).trim();
}

function migrateBusinessRules() {
  writeDoc(
    'business-rules/glossary.md',
    {
      title: 'Glossary',
      sidebar_position: 1,
      description: 'Ubiquitous language and shared terminology for Red Cab Marketplace.',
    },
    readSrc('business-rules/glossary.md'),
  );

  writeDoc(
    'business-rules/invariants.md',
    {
      title: 'Business Rules',
      sidebar_label: 'Invariants',
      sidebar_position: 2,
      description: 'Invariants, lifecycle rules, pricing, commission, and booking constraints.',
    },
    readSrc('business-rules/business-rules.md'),
  );

  fs.writeFileSync(
    path.join(DEST, 'business-rules/_category_.json'),
    JSON.stringify({ label: 'Business Rules', position: 1 }, null, 2) + '\n',
  );
}

function migrateRequirementsIndex() {
  writeDoc(
    'requirements/index.md',
    {
      title: 'Requirements Overview',
      sidebar_position: 1,
      description: 'How requirements are written, identified, grouped, and traced.',
    },
    readSrc('requirements/README.md'),
  );
}

function migrateFunctionalRequirements() {
  const raw = readSrc('requirements/functional-requirements.md');
  const body = prepareBody(raw);

  const sections = [
    { marker: '## IAM —', slug: 'iam', label: 'IAM', title: 'IAM — Identity & Access', pos: 2 },
    { marker: '## PRV —', slug: 'prv', label: 'PRV', title: 'PRV — Provider Onboarding', pos: 3 },
    { marker: '## CAT —', slug: 'cat', label: 'CAT', title: 'CAT — Catalog & Inventory', pos: 4 },
    { marker: '## BKG —', slug: 'bkg', label: 'BKG', title: 'BKG — Booking & Checkout', pos: 5 },
    { marker: '## PAY —', slug: 'pay', label: 'PAY', title: 'PAY — Payments & Payouts', pos: 6 },
    { marker: '## B2B —', slug: 'b2b', label: 'B2B', title: 'B2B — Quotation & Invoicing', pos: 7 },
    { marker: '## REV —', slug: 'rev', label: 'REV', title: 'REV — Reviews & Ratings', pos: 8 },
    { marker: '## NOT —', slug: 'not', label: 'NOT', title: 'NOT — Notifications', pos: 9 },
    { marker: '## Provisional requirements index', slug: 'provisional-index', label: 'Provisional', title: 'Provisional Requirements Index', pos: 10 },
  ];

  const markers = ['## Reading guide', ...sections.map((s) => s.marker)];
  const positions = markers.map((m) => body.indexOf(m)).filter((p) => p >= 0);

  const readingGuide = extractBetween(body, '## Reading guide', '## IAM —');

  const nav = sections
    .filter((s) => s.slug !== 'provisional-index')
    .map((s) => `- [${s.label}](/docs/requirements/functional-requirements/${s.slug})`)
    .join('\n');

  const indexBody = `## Reading guide\n\n${readingGuide.replace(/^## Reading guide\n+/, '')}\n\n## Context index\n\n${nav}\n- [Provisional index](/docs/requirements/functional-requirements/provisional-index)`;

  writeDoc(
    'requirements/functional-requirements/index.md',
    {
      title: 'Functional Requirements',
      sidebar_position: 2,
      description: 'Functional requirements grouped by bounded context.',
    },
    indexBody,
  );

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const start = body.indexOf(sec.marker);
    const end = i + 1 < sections.length ? body.indexOf(sections[i + 1].marker, start) : body.length;
    if (start < 0) continue;
    const content = body.slice(start, end).trim();
    writeDoc(
      `requirements/functional-requirements/${sec.slug}.md`,
      {
        title: sec.title,
        sidebar_label: sec.label,
        sidebar_position: sec.pos,
        description: `Functional requirements for ${sec.label} context.`,
      },
      content,
    );
  }

  // Remove flat stub if present
  const flat = path.join(DEST, 'requirements/functional-requirements.md');
  if (fs.existsSync(flat)) fs.unlinkSync(flat);

  fs.writeFileSync(
    path.join(DEST, 'requirements/functional-requirements/_category_.json'),
    JSON.stringify({ label: 'Functional Requirements', position: 2 }, null, 2) + '\n',
  );
}

function migrateNonFunctionalRequirements() {
  writeDoc(
    'requirements/non-functional-requirements.md',
    {
      title: 'Non-Functional Requirements',
      sidebar_position: 3,
      description: 'Performance, security, availability, and quality constraints.',
    },
    readSrc('requirements/non-functional-requirements.md'),
  );
}

function migrateTraceabilityMatrix() {
  const raw = readSrc('requirements/traceability-matrix.md');
  const body = prepareBody(raw);

  const sections = [
    { marker: '## 1. Master matrix', slug: 'master-matrix', title: 'Master Matrix', label: 'Master', pos: 2 },
    { marker: '## 2. Forward trace', slug: 'forward-trace', title: 'Forward Trace', label: 'Forward', pos: 3 },
    { marker: '## 3. Reverse trace', slug: 'reverse-trace', title: 'Reverse Trace', label: 'Reverse', pos: 4 },
    { marker: '## 4. Ambiguity trace', slug: 'ambiguity-trace', title: 'Ambiguity Trace', label: 'Ambiguity', pos: 5 },
    { marker: '## 5. Coverage analysis', slug: 'coverage-analysis', title: 'Coverage Analysis', label: 'Coverage', pos: 6 },
  ];

  const howToRead = extractBetween(body, '## How to read this document', '## 1. Master matrix');
  const nav = sections.map((s) => `- [${s.title}](/docs/requirements/traceability-matrix/${s.slug})`).join('\n');
  const indexBody = `## How to read this document\n\n${howToRead.replace(/^## How to read this document\n+/, '')}\n\n## Sections\n\n${nav}`;

  writeDoc(
    'requirements/traceability-matrix/index.md',
    {
      title: 'Traceability Matrix',
      sidebar_position: 4,
      description: 'PRD stories ↔ requirements ↔ rules ↔ acceptance criteria.',
    },
    indexBody,
  );

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const start = body.indexOf(sec.marker);
    const end = i + 1 < sections.length ? body.indexOf(sections[i + 1].marker, start) : body.length;
    if (start < 0) continue;
    writeDoc(
      `requirements/traceability-matrix/${sec.slug}.md`,
      {
        title: sec.title,
        sidebar_label: sec.label,
        sidebar_position: sec.pos,
        description: `Traceability matrix — ${sec.title.toLowerCase()}.`,
      },
      body.slice(start, end).trim(),
    );
  }

  const flat = path.join(DEST, 'requirements/traceability-matrix.md');
  if (fs.existsSync(flat)) fs.unlinkSync(flat);

  fs.writeFileSync(
    path.join(DEST, 'requirements/traceability-matrix/_category_.json'),
    JSON.stringify({ label: 'Traceability Matrix', position: 4 }, null, 2) + '\n',
  );
}

function migrateRequirementsCategories() {
  fs.writeFileSync(
    path.join(DEST, 'requirements/_category_.json'),
    JSON.stringify(
      {
        label: 'Requirements',
        position: 2,
        link: { type: 'doc', id: 'requirements/index' },
      },
      null,
      2,
    ) + '\n',
  );
}

function migrateDomain() {
  writeDoc(
    'domain/domain-models.md',
    {
      title: 'Domain Models',
      sidebar_position: 1,
      description: 'Strategic DDD aggregates, ownership, and cross-context relationships.',
    },
    readSrc('domain/domain-models.md'),
  );
}

function migrateEngineering() {
  writeDoc(
    'engineering/index.md',
    {
      title: 'Engineering Overview',
      sidebar_position: 1,
      description: 'How planning docs connect to red-cab-api and red-cab-web implementation.',
    },
    readSrc('engineering/README.md'),
  );

  for (const [file, title, pos, desc] of [
    ['domain-to-code-mapping.md', 'Domain-to-Code Mapping', 2, 'Actors and bounded contexts mapped to folders and routes.'],
    ['backend-conventions.md', 'Backend Conventions', 3, 'Rails API patterns — Request, Manager, Validator.'],
    ['frontend-conventions.md', 'Frontend Conventions', 4, 'React Router v7 SSR, API clients, forms, surfaces.'],
  ]) {
    writeDoc(
      `engineering/${file}`,
      {
        title,
        sidebar_position: pos,
        description: desc,
      },
      readSrc(`engineering/${file}`),
    );
  }

  fs.writeFileSync(
    path.join(DEST, 'engineering/_category_.json'),
    JSON.stringify(
      {
        label: 'Engineering',
        position: 5,
        link: { type: 'doc', id: 'engineering/index' },
      },
      null,
      2,
    ) + '\n',
  );
}

function migrateAmbiguities() {
  writeDoc(
    'ambiguities/open-questions.md',
    {
      title: 'Open Questions',
      sidebar_position: 1,
      description: 'Ambiguity register and decision log for unresolved planning items.',
    },
    readSrc('ambiguities/open-questions.md'),
  );
}

function migrateRoadmap() {
  const raw = readSrc('roadmap/phasing.md');
  const body = prepareBody(raw);

  const phases = [
    {
      marker: '## Phase 0 — Foundation',
      slug: 'phase-0-foundation',
      title: 'Phase 0 — Foundation',
      sidebar_label: 'Phase 0',
      sidebar_position: 2,
      description: 'Runnable repos, IAM, role profiles, event bus, and NOT stub.',
      tldr: '- **Foundation:** runnable repos, thin IAM + role profiles, in-process domain events, NOT stub.\n- Delivers identity/profile schema (Account, Tourist, Corporate, Provider, Admin) without marketplace flows.\n- Exit criteria: register, sign in, session hydration, CI green on both repos.',
      prev: null,
      next: 'phase-1-mvp',
      nextLabel: 'Phase 1',
    },
    {
      marker: '## Phase 1 — MVP (B2C happy path)',
      slug: 'phase-1-mvp',
      title: 'Phase 1 — MVP (B2C Happy Path)',
      sidebar_label: 'Phase 1',
      sidebar_position: 3,
      description: 'End-to-end tourist browse → book → pay → provider payout.',
      tldr: '- **MVP:** tourist discovers a transfer, books, pays by card; provider receives net payout after completion.\n- DBML-first for Catalog, Booking, Payments; then PRV flows → CAT → BKG → PAY → NOT.\n- B2C enters `CONFIRMED` on payment; commission frozen on CheckoutSession snapshot.',
      prev: 'phase-0-foundation',
      prevLabel: 'Phase 0',
      next: 'phase-2-marketplace-depth',
      nextLabel: 'Phase 2',
    },
    {
      marker: '## Phase 2 — Marketplace depth',
      slug: 'phase-2-marketplace-depth',
      title: 'Phase 2 — Marketplace Depth',
      sidebar_label: 'Phase 2',
      sidebar_position: 4,
      description: 'Reviews, advanced pricing, search, refunds, and operational automation.',
      tldr: '- **Marketplace depth:** reviews, flexible pricing, search/filter, full cancellation/refund lifecycle, PRV automation.\n- DBML-first: `reviews.dbml` then extensions to catalog/bookings/payments.\n- Payout and refund are mutually exclusive per booking (`FIN-5`).',
      prev: 'phase-1-mvp',
      prevLabel: 'Phase 1',
      next: 'phase-3-b2b-packages',
      nextLabel: 'Phase 3',
    },
    {
      marker: '## Phase 3 — B2B + packages',
      slug: 'phase-3-b2b-packages',
      title: 'Phase 3 — B2B + Packages',
      sidebar_label: 'Phase 3',
      sidebar_position: 5,
      description: 'Corporate quotations, invoices, bank transfer, and manifests.',
      tldr: '- **B2B + packages:** quotation request → formal PDF → bank transfer → Admin reconciliation.\n- Expands `b2b.dbml` beyond corporate client profile; manifests and multi-day packages on Booking.\n- Corporate portal gates on `b2b_corporate_clients` profile presence.',
      prev: 'phase-2-marketplace-depth',
      prevLabel: 'Phase 2',
      next: 'v2-post-baseline',
      nextLabel: 'v2',
    },
    {
      marker: '## v2 — Post-baseline (unscheduled)',
      slug: 'v2-post-baseline',
      title: 'v2 — Post-Baseline',
      sidebar_label: 'v2',
      sidebar_position: 6,
      description: 'Post-baseline themes tracked in the ambiguity register.',
      tldr: '- **Unscheduled** post-baseline themes — promote only against a documented fitness function.\n- Includes cross-provider packages, automated bank reconciliation, OCR, bundle discounts, OpenSearch, support monetization.\n- Tracked via `AMB-###` items in the ambiguity register.',
      prev: 'phase-3-b2b-packages',
      prevLabel: 'Phase 3',
      next: null,
    },
  ];

  const tailMarkers = ['## Per-phase context matrix', '## Agent session playbook', '## Related documents'];
  const phase0Start = body.indexOf(phases[0].marker);
  const tailStart = body.indexOf(tailMarkers[0]);
  const phaseOverviewStart = body.indexOf('## Phase overview');

  const intro = body
    .slice(body.indexOf('## How to use this document'), phaseOverviewStart >= 0 ? phaseOverviewStart : phase0Start)
    .trim();
  const tail = body.slice(tailStart).trim();

  const phaseNav = [
    '## Phase overview',
    '',
    '| Phase | Document | Primary goal | Contexts touched |',
    '| --- | --- | --- | --- |',
    '| **0** | [Foundation](/docs/roadmap/phase-0-foundation) | Runnable repos, IAM + profiles, event bus | IAM, profiles, NOT stub, engineering scaffold |',
    '| **1** | [MVP — B2C happy path](/docs/roadmap/phase-1-mvp) | End-to-end tourist booking + payout | PRV, CAT (basic), BKG, PAY, NOT |',
    '| **2** | [Marketplace depth](/docs/roadmap/phase-2-marketplace-depth) | Reviews, pricing, search, refunds | REV, CAT (advanced), BKG, PRV automation |',
    '| **3** | [B2B + packages](/docs/roadmap/phase-3-b2b-packages) | Quotations, invoices, bank transfer | B2B, BKG manifests, PAY reconciliation |',
    '| **v2** | [Post-baseline](/docs/roadmap/v2-post-baseline) | Unscheduled backlog | Ambiguity register |',
  ].join('\n');

  const indexBody = `${intro}\n\n---\n\n${phaseNav}\n\n---\n\n${tail}`;

  writeDoc(
    'roadmap/index.md',
    {
      title: 'Phasing Roadmap',
      sidebar_position: 1,
      description: 'MVP and future release sequencing by bounded context.',
    },
    indexBody,
  );

  function phaseNavRow(phase) {
    const left = phase.prev
      ? `[← ${phase.prevLabel}](/docs/roadmap/${phase.prev})`
      : '[← Roadmap overview](/docs/roadmap)';
    const right = phase.next
      ? `[${phase.nextLabel} →](/docs/roadmap/${phase.next})`
      : '[Roadmap overview →](/docs/roadmap)';
    return `| ${left} | ${right} |`;
  }

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const start = body.indexOf(phase.marker);
    const end = i + 1 < phases.length ? body.indexOf(phases[i + 1].marker, start) : tailStart;
    const content = `${phaseNavRow(phase)}\n\n---\n\n${body.slice(start, end).trim()}`;

    writeDoc(`roadmap/${phase.slug}.md`, {
      title: phase.title,
      sidebar_label: phase.sidebar_label,
      sidebar_position: phase.sidebar_position,
      description: phase.description,
    }, content);
  }

  const flat = path.join(DEST, 'roadmap/phasing.md');
  if (fs.existsSync(flat)) fs.unlinkSync(flat);

  fs.writeFileSync(
    path.join(DEST, 'roadmap/_category_.json'),
    JSON.stringify(
      { label: 'Roadmap', position: 7, link: { type: 'doc', id: 'roadmap/index' } },
      null,
      2,
    ) + '\n',
  );
}

function migrateSiteIndex() {
  const raw = readSrc('index.md');
  const body = prepareBody(raw);

  writeDoc(
    'index.md',
    {
      sidebar_position: 1,
      title: 'Red Cab Documentation',
      description: 'Planning, architecture, domain, and implementation guidance for the Red Cab tourism marketplace platform.',
    },
    body,
  );
}

// Main
migrateBusinessRules();
migrateRequirementsIndex();
migrateFunctionalRequirements();
migrateNonFunctionalRequirements();
migrateTraceabilityMatrix();
migrateRequirementsCategories();
migrateDomain();
migrateEngineering();
migrateAmbiguities();
migrateRoadmap();
migrateSiteIndex();
console.log('Migration complete. Run: node scripts/format-doc-headers.mjs');
