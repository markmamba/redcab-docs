/**
 * Option A: three-tier docs restructure (product / architecture / engineering).
 * Run from repo root: node scripts/migrate-option-a.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveFile(from, to) {
  const src = path.join(DOCS, from);
  const dest = path.join(DOCS, to);
  if (!fs.existsSync(src)) {
    if (fs.existsSync(dest)) return;
    console.warn('skip missing:', from);
    return;
  }
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  console.log('moved', from, '→', to);
}

function moveDir(from, to) {
  const src = path.join(DOCS, from);
  const dest = path.join(DOCS, to);
  if (!fs.existsSync(src)) {
    if (fs.existsSync(dest)) return;
    console.warn('skip missing dir:', from);
    return;
  }
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  console.log('moved dir', from, '→', to);
}

function writeJson(rel, obj) {
  const full = path.join(DOCS, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, JSON.stringify(obj, null, 2) + '\n');
}

function writeDoc(rel, frontmatter, body) {
  const full = path.join(DOCS, rel);
  ensureDir(path.dirname(full));
  const fm = Object.entries(frontmatter)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' && v.includes(':') ? `"${v}"` : v}`)
    .join('\n');
  fs.writeFileSync(full, `---\n${fm}\n---\n\n${body.trim()}\n`, 'utf8');
  console.log('wrote', rel);
}

/** @type {Record<string, string>} old relative path from docs/ → new relative path */
const SPEC_MOVES = {
  'specs/12-checkout-payment-step.md': 'engineering/specs/pay/web-12-checkout-payment-step.md',
  'specs/13-admin-commission-rate-ui.md': 'engineering/specs/pay/web-13-admin-commission-rate-ui.md',
  'specs/70-provider-merchant-onboarding.md': 'engineering/specs/pay/api-70-provider-merchant-onboarding.md',
  'specs/71-payment-attempt-checkout.md': 'engineering/specs/pay/api-71-payment-attempt-checkout.md',
  'specs/72-charge-snapshot-reconciliation.md': 'engineering/specs/pay/api-72-charge-snapshot-reconciliation.md',
  'specs/131-migrate-geography-schema.md': 'engineering/specs/cat/geography/api-131-migrate-geography-schema.md',
  'specs/132-seed-japan-geography.md': 'engineering/specs/cat/geography/api-132-seed-japan-geography.md',
  'specs/133-refactor-geography-domain-layer.md':
    'engineering/specs/cat/geography/api-133-refactor-geography-domain-layer.md',
  'specs/134-marketplace-geography-slug-and-ancestors.md':
    'engineering/specs/cat/geography/api-134-marketplace-geography-slug-and-ancestors.md',
  'specs/135-near-me-areas-endpoint.md': 'engineering/specs/cat/geography/api-135-near-me-areas-endpoint.md',
  'specs/136-team-geography-admin-endpoints.md':
    'engineering/specs/cat/geography/api-136-team-geography-admin-endpoints.md',
  'specs/geography-administrative-tree.md':
    'engineering/specs/cat/geography/docs-13-geography-administrative-tree.md',
  'specs/tourist-web-56-tourist-access-and-route-contract.md':
    'engineering/specs/iam/web-56-tourist-access-and-route-contract.md',
  'specs/tourist-web-57-tourist-ia-breadcrumbs-deep-links.md':
    'engineering/specs/cat/web-57-tourist-ia-breadcrumbs-deep-links.md',
  'specs/tourist-web-58-tourist-unified-layout-shell.md':
    'engineering/specs/platform/web-58-tourist-unified-layout-shell.md',
  'specs/README.md': 'engineering/specs/README.md',
  'specs/_template.md': 'engineering/specs/_template.md',
};

const IAM_AUDIT_FILES = [
  'index.md',
  'pr-01-restore-account-current-route.md',
  'pr-02-iam-security-fixes.md',
  'pr-03-session-cookie-manager-thread-safety.md',
  'pr-04-account-current-patch.md',
  'pr-05-actor-base-controllers.md',
  'pr-06-session-surface-symmetry.md',
  'pr-07-oauth-account-provisioning.md',
  'pr-08-deprecations.md',
];

function movePhysicalFiles() {
  // Product tier
  moveDir('business-rules', 'product/business-rules');
  moveDir('requirements', 'product/requirements');
  moveFile('ambiguities/open-questions.md', 'product/planning/open-questions.md');

  // Roadmap (notes handled separately)
  moveDir('roadmap', 'product/planning/roadmap');

  // Architecture tier
  moveDir('domain', 'architecture/domain');
  moveDir('architecture/bounded-contexts', 'architecture/contexts');
  moveFile('architecture/overview.md', 'architecture/system/overview.md');
  moveFile('architecture/tech-stack.md', 'architecture/system/tech-stack.md');
  moveFile('architecture/api-design.md', 'architecture/system/api-design.md');
  moveFile('architecture/booking-state-machine.md', 'architecture/patterns/booking-state-machine.md');
  moveFile('architecture/payments-architecture.md', 'architecture/patterns/payments-architecture.md');
  moveFile('architecture/geography.md', 'architecture/patterns/geography.md');

  // Engineering conventions
  moveFile('engineering/backend-conventions.md', 'engineering/conventions/backend.md');
  moveFile('engineering/frontend-conventions.md', 'engineering/conventions/frontend.md');
  moveFile('engineering/domain-to-code-mapping.md', 'engineering/conventions/domain-to-code-mapping.md');
  moveFile('engineering/datetime-and-timezones.md', 'engineering/conventions/datetime-and-timezones.md');

  // Specs
  for (const [from, to] of Object.entries(SPEC_MOVES)) {
    moveFile(from, to);
  }

  // IAM audit series
  for (const file of IAM_AUDIT_FILES) {
    moveFile(`product/planning/roadmap/notes/${file}`, `engineering/specs/iam/iam-audit-2026-08/${file}`);
  }

  // Geography design review
  moveFile(
    'product/planning/roadmap/notes/geography-data-model-review.md',
    'engineering/specs/cat/geography/design-review-data-model.md',
  );

  // Session A → ADR-017
  moveFile(
    'product/planning/roadmap/notes/SESSION-A-DECISION-RECORD.md',
    'architecture/decisions/adr-017-tourist-ui-public-url-architecture.md',
  );

  // Clean up empty dirs
  for (const rel of ['ambiguities', 'specs', 'product/planning/roadmap/notes', 'domain']) {
    const full = path.join(DOCS, rel);
    if (fs.existsSync(full) && fs.readdirSync(full).length === 0) {
      fs.rmdirSync(full);
    }
  }
  const specsCat = path.join(DOCS, 'specs');
  if (fs.existsSync(specsCat)) {
    const left = fs.readdirSync(specsCat);
    if (left.length === 0) fs.rmdirSync(specsCat);
    else console.warn('specs/ not empty:', left);
  }
}

function createNewDocs() {
  writeJson('product/_category_.json', {
    label: 'Product',
    position: 1,
    link: { type: 'doc', id: 'product/index' },
  });

  writeDoc(
    'product/index.md',
    {
      title: 'Product',
      sidebar_position: 1,
      description: 'What Red Cab does — business language for stakeholders and product owners.',
    },
    `## TL;DR

- Red Cab is a B2C and corporate marketplace connecting travelers with verified Japanese transport and tour providers.
- This tier holds **business rules**, **requirements**, **explainers**, and **planning** — no implementation specs or API detail.
- For system design, see [Architecture](/docs/architecture). For implementation, see [Engineering](/docs/engineering).

## About this document

Stakeholder entry point for the Red Cab documentation site.

| Topic | Document |
| --- | --- |
| Start here | [Start here](/docs/product/start-here) |
| Glossary | [Glossary](/docs/product/business-rules/glossary) |
| Business rules | [Invariants](/docs/product/business-rules/invariants) |
| Requirements | [Requirements](/docs/product/requirements) |
| Roadmap | [Phasing roadmap](/docs/product/planning/roadmap) |
| Open questions | [Open questions](/docs/product/planning/open-questions) |

## Capabilities

- **B2C booking** — tourists discover listings, book, and pay online.
- **Corporate workflows** — quotations, invoices, and bank transfer reconciliation.
- **Provider onboarding** — verification before marketplace participation.
- **Catalog & geography** — inventory, pricing authority, and Japan administrative geography.
- **Payments & payouts** — licensed provider custody with platform commission.
- **Reviews & notifications** — post-trip feedback and operational messaging.

## Actors

| Actor | Role |
| --- | --- |
| Tourist | Browse, book, pay |
| Corporate | Request quotations, manage bookings and invoices |
| Provider | Onboard, manage inventory and fulfill bookings |
| Admin | Verification, reconciliation, platform configuration |
`,
  );

  writeDoc(
    'product/start-here.md',
    {
      title: 'Start here',
      sidebar_position: 2,
      description: 'Recommended reading path for product owners, business analysts, and sponsors.',
    },
    `## TL;DR

- Read in order: **Glossary → Business rules → Requirements → Roadmap → Open questions**.
- Use [Explainers](/docs/product/explainers/booking-lifecycle) for plain-language walkthroughs; they link to normative sources.
- Engineering detail lives under [Architecture](/docs/architecture) and [Engineering](/docs/engineering).

## Recommended path

1. [Glossary](/docs/product/business-rules/glossary) — shared vocabulary
2. [Business rules (invariants)](/docs/product/business-rules/invariants) — what must never break
3. [Functional requirements](/docs/product/requirements/functional-requirements) — observable behavior by context
4. [Phasing roadmap](/docs/product/planning/roadmap) — what ships when
5. [Open questions](/docs/product/planning/open-questions) — unresolved decisions

## By role

| Role | Focus |
| --- | --- |
| Executive / sponsor | [Key decisions](/docs/product/explainers/key-decisions) → roadmap → open questions |
| Product owner | Glossary → invariants → FR for your context → [traceability](/docs/product/requirements/traceability-matrix) |
| Business analyst / ops | Glossary → [booking lifecycle](/docs/product/explainers/booking-lifecycle) → [money flow](/docs/product/explainers/money-flow) → invariants |

## Go deeper (optional)

- [Architecture overview](/docs/architecture/system/overview) — system structure and integration
- [Domain models](/docs/architecture/domain/domain-models) — aggregates and ownership
- [Implementation specs](/docs/engineering/specs) — per-issue design (engineers only)
`,
  );

  writeJson('product/planning/_category_.json', { label: 'Planning', position: 4 });

  writeJson('product/explainers/_category_.json', { label: 'Explainers', position: 3, collapsed: false });

  const explainers = [
    {
      slug: 'booking-lifecycle',
      title: 'Booking lifecycle',
      desc: 'Plain-language walkthrough of booking states and transitions.',
      links: `- [Booking state machine](/docs/architecture/patterns/booking-state-machine)
- [Invariants — lifecycle](/docs/product/business-rules/invariants#2-lifecycle-constraints)
- [FR — Booking](/docs/product/requirements/functional-requirements/bkg)`,
    },
    {
      slug: 'money-flow',
      title: 'Money flow',
      desc: 'Custody, commission, payouts, and refunds in business terms.',
      links: `- [Payments architecture](/docs/architecture/patterns/payments-architecture)
- [Invariants — payment rules](/docs/product/business-rules/invariants#4-payment-rules)
- [FR — Payments](/docs/product/requirements/functional-requirements/pay)`,
    },
    {
      slug: 'corporate-workflow',
      title: 'Corporate workflow',
      desc: 'Quotation, invoice, and bank transfer flows for corporate clients.',
      links: `- [FR — Corporate](/docs/product/requirements/functional-requirements/corporate)
- [Bounded context — Corporate](/docs/architecture/contexts/corporate)`,
    },
    {
      slug: 'provider-onboarding',
      title: 'Provider onboarding',
      desc: 'How providers join and become verified on the marketplace.',
      links: `- [FR — Provider](/docs/product/requirements/functional-requirements/prv)
- [Bounded context — Onboarding](/docs/architecture/contexts/onboarding)`,
    },
    {
      slug: 'key-decisions',
      title: 'Key decisions',
      desc: 'One-line business impact per major architecture decision.',
      links: `| Decision | Business impact | ADR |
| --- | --- | --- |
| Modular monolith | Single deployable platform; contexts stay separate in code | [ADR-001](/docs/architecture/decisions/adr-001-modular-monolith) |
| Single pricing authority | Catalog alone calculates price; no drift at checkout | [ADR-005](/docs/architecture/decisions/adr-005-single-pricing-authority) |
| Immutable snapshots | Booking commercial facts frozen at checkout | [ADR-006](/docs/architecture/decisions/adr-006-immutable-snapshot-strategy) |
| Public browse | Guests browse listings; sign-in only at checkout | [ADR-017](/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture) |
| Geography tree | Japan administrative hierarchy powers discovery URLs | [ADR-016](/docs/architecture/decisions/adr-016-geography-administrative-tree) |`,
    },
  ];

  for (let i = 0; i < explainers.length; i++) {
    const e = explainers[i];
    writeDoc(
      `product/explainers/${e.slug}.md`,
      {
        title: e.title,
        sidebar_position: i + 1,
        description: e.desc,
      },
      `## TL;DR

Non-normative explainer. Every rule cited below links to the authoritative source.

## Related documents

${e.links}
`,
    );
  }

  // Update moved category files
  writeJson('product/business-rules/_category_.json', { label: 'Business Rules', position: 2 });
  writeJson('product/requirements/_category_.json', {
    label: 'Requirements',
    position: 3,
    link: { type: 'doc', id: 'product/requirements/index' },
  });
  writeJson('product/planning/roadmap/_category_.json', {
    label: 'Roadmap',
    position: 1,
    link: { type: 'doc', id: 'product/planning/roadmap/index' },
  });

  writeJson('architecture/_category_.json', {
    label: 'Architecture',
    position: 2,
    link: { type: 'doc', id: 'architecture/index' },
  });
  writeJson('architecture/domain/_category_.json', { label: 'Domain Models', position: 2 });
  writeJson('architecture/contexts/_category_.json', { label: 'Bounded Contexts', position: 3 });
  writeJson('architecture/system/_category_.json', { label: 'System', position: 4 });
  writeJson('architecture/patterns/_category_.json', { label: 'Patterns', position: 5 });

  writeJson('engineering/_category_.json', {
    label: 'Engineering',
    position: 3,
    link: { type: 'doc', id: 'engineering/index' },
  });
  writeJson('engineering/conventions/_category_.json', { label: 'Conventions', position: 2 });
  writeJson('engineering/infrastructure/_category_.json', { label: 'Infrastructure', position: 3 });
  writeJson('engineering/specs/_category_.json', {
    label: 'Implementation Specs',
    position: 4,
    link: { type: 'doc', id: 'engineering/specs/README' },
  });
  writeJson('engineering/specs/iam/_category_.json', { label: 'IAM', position: 1 });
  writeJson('engineering/specs/cat/_category_.json', { label: 'Catalog', position: 2 });
  writeJson('engineering/specs/cat/geography/_category_.json', { label: 'Geography', position: 1 });
  writeJson('engineering/specs/pay/_category_.json', { label: 'Payments', position: 3 });
  writeJson('engineering/specs/platform/_category_.json', { label: 'Platform', position: 9 });

  writeDoc(
    'engineering/infrastructure/index.md',
    {
      title: 'Infrastructure',
      sidebar_position: 1,
      description: 'Environments, deployment, CI/CD, observability, and runbooks.',
    },
    `## TL;DR

- Infrastructure documentation for \`red-cab-api\` and \`red-cab-web\` hosting and operations.
- Stub pages — expand as deployment topology is finalized.

## Sections

| Topic | Status |
| --- | --- |
| [Environments](/docs/engineering/infrastructure/environments) | Stub |
| [Deployment](/docs/engineering/infrastructure/deployment) | Stub |
| [CI/CD](/docs/engineering/infrastructure/ci-cd) | Stub |
| [Configuration & secrets](/docs/engineering/infrastructure/configuration-and-secrets) | Stub |
| [Observability](/docs/engineering/infrastructure/observability) | Stub |
| [Data & backups](/docs/engineering/infrastructure/data-and-backups) | Stub |
`,
  );

  for (const [slug, title] of [
    ['environments', 'Environments'],
    ['deployment', 'Deployment'],
    ['ci-cd', 'CI/CD'],
    ['configuration-and-secrets', 'Configuration & secrets'],
    ['observability', 'Observability'],
    ['data-and-backups', 'Data & backups'],
  ]) {
    writeDoc(
      `engineering/infrastructure/${slug}.md`,
      { title, sidebar_position: 2, description: `${title} — stub; to be expanded.` },
      `## TL;DR

Stub page. Document ${title.toLowerCase()} for Red Cab Marketplace infrastructure here.
`,
    );
  }

  writeDoc(
    'engineering/specs/index.md',
    {
      title: 'Spec index',
      sidebar_position: 2,
      description: 'Implementation specs grouped by bounded context.',
    },
    `## TL;DR

- Specs live under \`engineering/specs/{context}/\`.
- Naming: \`{repo}-{issue}-{slug}.md\` where repo is \`api\`, \`web\`, or \`docs\`.
- See [Specs README](/docs/engineering/specs/README) for the workflow.

## By context

| Context | Folder |
| --- | --- |
| IAM | [iam/](/docs/engineering/specs/iam/) |
| Catalog | [cat/](/docs/engineering/specs/cat/) |
| Payments | [pay/](/docs/engineering/specs/pay/) |
| Platform (cross-cutting) | [platform/](/docs/engineering/specs/platform/) |
`,
  );
}

/** Ordered link replacements (longest / most specific first). */
function buildLinkReplacements() {
  const pairs = [];

  // Spec file moves (old filename patterns)
  for (const [from, to] of Object.entries(SPEC_MOVES)) {
    const oldPath = from.replace(/\.md$/, '').replace(/^specs\//, 'specs/');
    const newPath = to.replace(/\.md$/, '');
    pairs.push([`/docs/${oldPath}`, `/docs/${newPath}`]);
    pairs.push([`docs/${from}`, `docs/${to}`]);
  }
  pairs.push([
    '/docs/specs/geography-administrative-tree',
    '/docs/engineering/specs/cat/geography/docs-13-geography-administrative-tree',
  ]);
  pairs.push([
    '/docs/roadmap/notes/SESSION-A-DECISION-RECORD',
    '/docs/architecture/decisions/adr-017-tourist-ui-public-url-architecture',
  ]);
  pairs.push([
    '/docs/roadmap/notes/geography-data-model-review',
    '/docs/engineering/specs/cat/geography/design-review-data-model',
  ]);
  for (const f of IAM_AUDIT_FILES) {
    const base = f.replace(/\.md$/, '');
    pairs.push([`/docs/roadmap/notes/${base}`, `/docs/engineering/specs/iam/iam-audit-2026-08/${base}`]);
  }

  // Tier moves
  pairs.push(['/docs/business-rules/', '/docs/product/business-rules/']);
  pairs.push(['/docs/requirements/', '/docs/product/requirements/']);
  pairs.push(['/docs/ambiguities/open-questions', '/docs/product/planning/open-questions']);
  pairs.push(['/docs/roadmap/', '/docs/product/planning/roadmap/']);
  pairs.push(['/docs/domain/', '/docs/architecture/domain/']);

  // Architecture renames
  pairs.push(['/docs/architecture/bounded-contexts/', '/docs/architecture/contexts/']);
  pairs.push(['/docs/architecture/overview', '/docs/architecture/system/overview']);
  pairs.push(['/docs/architecture/tech-stack', '/docs/architecture/system/tech-stack']);
  pairs.push(['/docs/architecture/api-design', '/docs/architecture/system/api-design']);
  pairs.push(['/docs/architecture/booking-state-machine', '/docs/architecture/patterns/booking-state-machine']);
  pairs.push(['/docs/architecture/payments-architecture', '/docs/architecture/patterns/payments-architecture']);
  pairs.push(['/docs/architecture/geography', '/docs/architecture/patterns/geography']);

  // Engineering conventions
  pairs.push(['/docs/engineering/backend-conventions', '/docs/engineering/conventions/backend']);
  pairs.push(['/docs/engineering/frontend-conventions', '/docs/engineering/conventions/frontend']);
  pairs.push(['/docs/engineering/domain-to-code-mapping', '/docs/engineering/conventions/domain-to-code-mapping']);
  pairs.push(['/docs/engineering/datetime-and-timezones', '/docs/engineering/conventions/datetime-and-timezones']);

  // Specs root
  pairs.push(['/docs/specs/', '/docs/engineering/specs/']);
  pairs.push(['docs/specs/', 'docs/engineering/specs/']);

  // Category doc ids (no /docs prefix)
  pairs.push(['requirements/index', 'product/requirements/index']);
  pairs.push(['roadmap/index', 'product/planning/roadmap/index']);

  // Stale agent paths in index
  pairs.push(['business-rules/business-rules.md', 'product/business-rules/invariants']);
  pairs.push(['requirements/functional-requirements.md', 'product/requirements/functional-requirements']);
  pairs.push(['architecture/bounded-contexts.md', 'architecture/contexts']);
  pairs.push(['roadmap/phasing.md', 'product/planning/roadmap']);

  return pairs;
}

function rewriteLinksInContent(content, pairs) {
  let c = content;
  for (const [from, to] of pairs) {
    c = c.split(from).join(to);
  }
  return c;
}

function walkMdFiles(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMdFiles(full, cb);
    else if (ent.name.endsWith('.md') || ent.name.endsWith('.mdx')) cb(full);
  }
}

function rewriteAllLinks() {
  const pairs = buildLinkReplacements();
  walkMdFiles(DOCS, (file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const next = rewriteLinksInContent(raw, pairs);
    if (next !== raw) {
      fs.writeFileSync(file, next);
      console.log('links', path.relative(DOCS, file));
    }
  });

  // Repo root files
  for (const rel of ['AGENTS.md', 'README.md']) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const raw = fs.readFileSync(full, 'utf8');
    const next = rewriteLinksInContent(raw, pairs);
    if (next !== raw) fs.writeFileSync(full, next);
  }
}

function patchAdr017Frontmatter() {
  const file = path.join(DOCS, 'architecture/decisions/adr-017-tourist-ui-public-url-architecture.md');
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(
    /^title:.*\n/,
    'title: "ADR-017: Tourist UI public URL architecture"\n',
  );
  c = c.replace(/^sidebar_label:.*\n/, 'sidebar_label: ADR-017\n');
  c = c.replace(/^sidebar_position:.*\n/, 'sidebar_position: 17\n');
  if (!c.includes('## Status')) {
    c = c.replace('## About this document', '## Status\n\nAccepted (2026-09-20)\n\n## About this document');
  }
  fs.writeFileSync(file, c);
}

function patchRequirementsCategoryIds() {
  const reqCat = path.join(DOCS, 'product/requirements/_category_.json');
  if (fs.existsSync(reqCat)) {
    const j = JSON.parse(fs.readFileSync(reqCat, 'utf8'));
    j.link = { type: 'doc', id: 'product/requirements/index' };
    fs.writeFileSync(reqCat, JSON.stringify(j, null, 2) + '\n');
  }
}

function exportRedirects() {
  const pairs = buildLinkReplacements().filter(([from]) => from.startsWith('/docs/'));
  const redirects = pairs.map(([from, to]) => ({
    from: from.replace(/^\/docs/, '/docs'),
    to: to.replace(/^\/docs/, '/docs'),
  }));
  const out = path.join(ROOT, 'scripts/option-a-redirects.json');
  fs.writeFileSync(out, JSON.stringify(redirects, null, 2) + '\n');
  console.log('wrote', out, `(${redirects.length} redirects)`);
}

// Main
console.log('=== Option A migration ===');
movePhysicalFiles();
createNewDocs();
patchAdr017Frontmatter();
patchRequirementsCategoryIds();
rewriteAllLinks();
exportRedirects();
console.log('Done. Update sidebars.js, docusaurus.config.js, and run npm run build.');
