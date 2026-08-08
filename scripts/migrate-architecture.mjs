/**
 * Migrates red-cab-docs/architecture → redcab-docs/docs/architecture
 * Run: node scripts/migrate-architecture.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.resolve(ROOT, '../red-cab-docs/architecture');
const DEST = path.join(ROOT, 'docs/architecture');

function transformLinks(content) {
  let c = content;

  // Cross-section ../ paths
  c = c.replace(/\]\(\.\.\/business-rules\/glossary\.md([^)]*)\)/g, '](/docs/business-rules/glossary$1)');
  c = c.replace(/\]\(\.\.\/business-rules\/business-rules\.md([^)]*)\)/g, '](/docs/business-rules/invariants$1)');
  c = c.replace(/\]\(\.\.\/business-rules\/([^)#]+)\.md([^)]*)\)/g, '](/docs/business-rules/$1$2)');
  c = c.replace(/\]\(\.\.\/domain\/([^)#]+)\.md([^)]*)\)/g, '](/docs/domain/$1$2)');
  c = c.replace(/\]\(\.\.\/requirements\/README\.md([^)]*)\)/g, '](/docs/requirements/index$1)');
  c = c.replace(/\]\(\.\.\/requirements\/([^)#]+)\.md([^)]*)\)/g, '](/docs/requirements/$1$2)');
  c = c.replace(/\]\(\.\.\/engineering\/README\.md([^)]*)\)/g, '](/docs/engineering/index$1)');
  c = c.replace(/\]\(\.\.\/engineering\/([^)#]+)\.md([^)]*)\)/g, '](/docs/engineering/$1$2)');
  c = c.replace(/\]\(\.\.\/ambiguities\/([^)#]+)\.md([^)]*)\)/g, '](/docs/ambiguities/$1$2)');
  c = c.replace(/\]\(\.\.\/index\.md([^)]*)\)/g, '](/docs$1)');

  // decisions/ ../../ paths
  c = c.replace(/\]\(\.\.\/\.\.\/business-rules\/([^)#]+)\.md([^)]*)\)/g, '](/docs/business-rules/$1$2)');
  c = c.replace(/\]\(\.\.\/\.\.\/domain\/([^)#]+)\.md([^)]*)\)/g, '](/docs/domain/$1$2)');
  c = c.replace(/\]\(\.\.\/\.\.\/ambiguities\/([^)#]+)\.md([^)]*)\)/g, '](/docs/ambiguities/$1$2)');
  c = c.replace(/\]\(\.\.\/\.\.\/requirements\/README\.md([^)]*)\)/g, '](/docs/requirements/index$1)');
  c = c.replace(/\]\(\.\.\/\.\.\/requirements\/([^)#]+)\.md([^)]*)\)/g, '](/docs/requirements/$1$2)');
  c = c.replace(/\]\(\.\.\/\.\.\/engineering\/([^)#]+)\.md([^)]*)\)/g, '](/docs/engineering/$1$2)');

  // Same-folder ../ from decisions
  c = c.replace(/\]\(\.\.\/overview\.md([^)]*)\)/g, '](/docs/architecture/overview$1)');
  c = c.replace(/\]\(\.\.\/bounded-contexts\.md#domain-events-catalog-in-process-past-tense-idempotent([^)]*)\)/g, '](/docs/architecture/bounded-contexts/domain-events$1)');
  c = c.replace(/\]\(\.\.\/bounded-contexts\.md#why-geography-and-search-are-modules-inside-catalog-not-contexts([^)]*)\)/g, '](/docs/architecture/bounded-contexts/design-rationales#why-geography-and-search-are-modules-inside-catalog-not-contexts$1)');
  c = c.replace(/\]\(\.\.\/bounded-contexts\.md#([^)]+)\)/g, '](/docs/architecture/bounded-contexts#$1)');
  c = c.replace(/\]\(\.\.\/bounded-contexts\.md([^)]*)\)/g, '](/docs/architecture/bounded-contexts$1)');
  c = c.replace(/\]\(\.\.\/payments-architecture\.md([^)]*)\)/g, '](/docs/architecture/payments-architecture$1)');
  c = c.replace(/\]\(\.\.\/booking-state-machine\.md([^)]*)\)/g, '](/docs/architecture/booking-state-machine$1)');
  c = c.replace(/\]\(\.\.\/tech-stack\.md([^)]*)\)/g, '](/docs/architecture/tech-stack$1)');
  c = c.replace(/\]\(\.\.\/api-design\.md([^)]*)\)/g, '](/docs/architecture/api-design$1)');
  c = c.replace(/\]\(\.\.\/data-model\.md([^)]*)\)/g, '](/docs/architecture/data-model$1)');

  // ./ architecture paths
  c = c.replace(/\]\(\.\/overview\.md([^)]*)\)/g, '](/docs/architecture/overview$1)');
  c = c.replace(/\]\(\.\/bounded-contexts\.md#domain-events-catalog-in-process-past-tense-idempotent([^)]*)\)/g, '](/docs/architecture/bounded-contexts/domain-events$1)');
  c = c.replace(/\]\(\.\/bounded-contexts\.md#why-geography-and-search-are-modules-inside-catalog-not-contexts([^)]*)\)/g, '](/docs/architecture/bounded-contexts/design-rationales#why-geography-and-search-are-modules-inside-catalog-not-contexts$1)');
  c = c.replace(/\]\(\.\/bounded-contexts\.md([^)]*)\)/g, '](/docs/architecture/bounded-contexts$1)');
  c = c.replace(/\]\(\.\/payments-architecture\.md([^)]*)\)/g, '](/docs/architecture/payments-architecture$1)');
  c = c.replace(/\]\(\.\/booking-state-machine\.md([^)]*)\)/g, '](/docs/architecture/booking-state-machine$1)');
  c = c.replace(/\]\(\.\/api-design\.md([^)]*)\)/g, '](/docs/architecture/api-design$1)');
  c = c.replace(/\]\(\.\/tech-stack\.md([^)]*)\)/g, '](/docs/architecture/tech-stack$1)');
  c = c.replace(/\]\(\.\/data-model\.md([^)]*)\)/g, '](/docs/architecture/data-model$1)');

  // requirements/ folder link without file
  c = c.replace(/\]\(\.\.\/requirements\/\)/g, '](/docs/requirements/)');

  // tech-stack without .md in link text paths like [tech-stack](./tech-stack.md)
  c = c.replace(/\]\(tech-stack\.md([^)]*)\)/g, '](/docs/architecture/tech-stack$1)');

  // ADR cross-links within decisions folder
  c = c.replace(/\]\(\.\/ADR-(\d+)-([^)]+)\.md([^)]*)\)/gi, '](/docs/architecture/decisions/adr-$1-$2$3)');
  c = c.replace(/\]\(\.\/adr-(\d+)-([^)]+)\.md([^)]*)\)/gi, '](/docs/architecture/decisions/adr-$1-$2$3)');

  return c;
}

function blockquoteToAdmonition(content) {
  // Metadata blocks are formatted via scripts/format-doc-headers.mjs (TL;DR + About).
  return content;
}

function demoteExtraH1(content) {
  const lines = content.split('\n');
  let seenH1 = false;
  return lines
    .map((line) => {
      if (line.startsWith('# ') && !line.startsWith('## ')) {
        if (!seenH1) {
          seenH1 = true;
          return line;
        }
        return `#${line}`;
      }
      return line;
    })
    .join('\n');
}

function wrapDoc(frontmatter, body) {
  const processed = transformLinks(demoteExtraH1(blockquoteToAdmonition(body)));
  return `---\n${frontmatter}\n---\n\n${processed.replace(/^# .+\n\n/, '')}`;
}

function writeFile(relPath, content) {
  const full = path.join(DEST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('wrote', relPath);
}

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function splitBoundedContexts() {
  const raw = readSrc('bounded-contexts.md');
  const body = raw.replace(/^# Bounded Contexts\n/, '');

  const sections = {
    index: { start: 0, end: body.indexOf('---\n## Core contexts') },
    onboarding: { marker: '### 1. Provider Onboarding' },
    catalog: { marker: '### 2. Catalog & Inventory' },
    booking: { marker: '### 3. Booking & Checkout' },
    payments: { marker: '### 4. Payments & Payouts' },
    corporate: { marker: '### 5. Corporate Quotation' },
    reviews: { marker: '### 6. Reviews & Ratings' },
    identity: { marker: '### 7. Identity & Access' },
    notifications: { marker: '### 8. Notifications' },
    domainEvents: { marker: '## Domain events catalog' },
    designRationales: { marker: '## Key design rationales' },
    couplingRisks: { marker: '## Coupling-risk register' },
  };

  const markers = [
    '## Strategic overview',
    '### 1. Provider Onboarding',
    '### 2. Catalog & Inventory',
    '### 3. Booking & Checkout',
    '### 4. Payments & Payouts',
    '### 5. Corporate Quotation',
    '### 6. Reviews & Ratings',
    '## Supporting contexts',
    '### 7. Identity & Access',
    '### 8. Notifications',
    '## Domain events catalog',
    '## Key design rationales',
    '## Coupling-risk register',
    '## Boundary enforcement summary',
    '## Open items affecting boundaries',
  ];

  const positions = markers.map((m) => body.indexOf(m)).filter((p) => p >= 0);
  const chunks = [];
  for (let i = 0; i < positions.length; i++) {
    chunks.push(body.slice(positions[i], positions[i + 1] ?? body.length).trim());
  }

  const indexIntro = chunks.slice(0, 1).join('\n\n') + '\n\n' + chunks[1].split('### 1.')[0];
  // Re-split more carefully
  const idxEnd = body.indexOf('---\n## Core contexts');
  const indexContent = body.slice(0, idxEnd).trim();

  function extractBetween(startMarker, endMarker) {
    const start = body.indexOf(startMarker);
    const end = endMarker ? body.indexOf(endMarker, start) : body.length;
    if (start < 0) return '';
    return body.slice(start, end < 0 ? body.length : end).trim();
  }

  const files = {
    'bounded-contexts/index.md': {
      title: 'Bounded Contexts',
      sidebar_position: 1,
      content:
        indexContent +
        '\n\n## Core contexts\n\nSee individual context pages:\n\n- [Onboarding](/docs/architecture/bounded-contexts/onboarding)\n- [Catalog](/docs/architecture/bounded-contexts/catalog)\n- [Booking](/docs/architecture/bounded-contexts/booking)\n- [Payments](/docs/architecture/bounded-contexts/payments)\n- [Corporate](/docs/architecture/bounded-contexts/corporate)\n- [Reviews](/docs/architecture/bounded-contexts/reviews)\n\n## Supporting contexts\n\n- [Identity](/docs/architecture/bounded-contexts/identity)\n- [Notifications](/docs/architecture/bounded-contexts/notifications)\n\n## Reference\n\n- [Domain Events](/docs/architecture/bounded-contexts/domain-events)\n- [Design Rationales](/docs/architecture/bounded-contexts/design-rationales)\n- [Coupling Risks](/docs/architecture/bounded-contexts/coupling-risks)',
      about: raw.match(/^> ([\s\S]*?)(?=\n\n## )/)?.[1]?.replace(/\n> /g, '\n').trim(),
    },
    'bounded-contexts/onboarding.md': {
      title: 'Onboarding & Verification',
      sidebar_position: 2,
      content: extractBetween('### 1. Provider Onboarding', '### 2. Catalog'),
    },
    'bounded-contexts/catalog.md': {
      title: 'Catalog & Inventory',
      sidebar_position: 3,
      content: extractBetween('### 2. Catalog & Inventory', '### 3. Booking'),
    },
    'bounded-contexts/booking.md': {
      title: 'Booking & Checkout',
      sidebar_position: 4,
      content: extractBetween('### 3. Booking & Checkout', '### 4. Payments'),
    },
    'bounded-contexts/payments.md': {
      title: 'Payments & Payouts (Context)',
      sidebar_label: 'Payments (Context)',
      sidebar_position: 5,
      content: extractBetween('### 4. Payments & Payouts', '### 5. Corporate'),
    },
    'bounded-contexts/corporate.md': {
      title: 'Corporate Quotation & Invoicing',
      sidebar_position: 6,
      content: extractBetween('### 5. Corporate Quotation', '### 6. Reviews'),
    },
    'bounded-contexts/reviews.md': {
      title: 'Reviews & Ratings',
      sidebar_position: 7,
      content: extractBetween('### 6. Reviews & Ratings', '## Supporting contexts'),
    },
    'bounded-contexts/identity.md': {
      title: 'Identity & Access',
      sidebar_position: 8,
      content: extractBetween('### 7. Identity & Access', '### 8. Notifications'),
    },
    'bounded-contexts/notifications.md': {
      title: 'Notifications (Context)',
      sidebar_label: 'Notifications (Context)',
      sidebar_position: 9,
      content: extractBetween('### 8. Notifications', '## Domain events catalog'),
    },
    'bounded-contexts/domain-events.md': {
      title: 'Domain Events Catalog',
      sidebar_position: 10,
      content: extractBetween('## Domain events catalog', '## Key design rationales'),
    },
    'bounded-contexts/design-rationales.md': {
      title: 'Design Rationales',
      sidebar_position: 11,
      content: extractBetween('## Key design rationales', '## Coupling-risk register'),
    },
    'bounded-contexts/coupling-risks.md': {
      title: 'Coupling Risks & Boundaries',
      sidebar_position: 12,
      content: extractBetween('## Coupling-risk register', null),
    },
  };

  for (const [rel, meta] of Object.entries(files)) {
    const fm = [
      `title: ${meta.title}`,
      meta.sidebar_label ? `sidebar_label: ${meta.sidebar_label}` : null,
      `sidebar_position: ${meta.sidebar_position}`,
      `description: Bounded context documentation for Red Cab Marketplace.`,
    ]
      .filter(Boolean)
      .join('\n');

    let docBody = meta.content;
    if (rel === 'bounded-contexts/index.md' && meta.about) {
      docBody = `:::info About this document\n${transformLinks(meta.about)}\n:::\n\n${transformLinks(meta.content)}`;
    } else {
      docBody = transformLinks(meta.content);
    }

    writeFile(rel, `---\n${fm}\n---\n\n${docBody}\n`);
  }
}

function splitDataModel() {
  const raw = readSrc('data-model.md');
  const about = raw.match(/^> ([\s\S]*?)(?=\n\n---)/)?.[0];
  const body = raw.replace(/^# Red Cab Marketplace — Conceptual Data Model\n\n/, '').replace(/^>[\s\S]*?---\n\n/, '');

  function extractSection(startMarker, endMarker) {
    const start = body.indexOf(startMarker);
    const end = endMarker ? body.indexOf(endMarker, start) : body.length;
    if (start < 0) return '';
    return body.slice(start, end).trim();
  }

  const aboutText = raw
    .split('---')[0]
    .replace(/^# .+\n\n> /, '')
    .replace(/\n> /g, '\n')
    .trim();

  const files = {
    'data-model/index.md': {
      title: 'Conceptual Data Model',
      sidebar_position: 1,
      content:
        extractSection('## 1. Purpose', '## 5. Aggregate Ownership') +
        '\n\n---\n\n' +
        extractSection('## 2. Relationship to Other Planning Documents', '## 3. Modeling Principles') +
        '\n\n---\n\n' +
        extractSection('## 3. Modeling Principles', '## 4. Context Ownership') +
        '\n\n---\n\n' +
        extractSection('## 4. Context Ownership Boundaries', '## 5. Aggregate Ownership') +
        '\n\n## Next sections\n\n- [Aggregates](/docs/architecture/data-model/aggregates)\n- [Entity Relationships](/docs/architecture/data-model/entity-relationships)\n- [Snapshots](/docs/architecture/data-model/snapshots)\n- [Financial Boundaries](/docs/architecture/data-model/financial-boundaries)\n- [Lifecycle Data](/docs/architecture/data-model/lifecycle-data)\n- [ERD Diagrams](/docs/architecture/data-model/erd-diagrams)\n- [Consistency & Integration](/docs/architecture/data-model/consistency-and-integration)\n- [Open Items](/docs/architecture/data-model/open-items)',
    },
    'data-model/aggregates.md': {
      title: 'Aggregate Ownership',
      sidebar_position: 2,
      content: extractSection('## 5. Aggregate Ownership', '## 6. Entity Relationships'),
    },
    'data-model/entity-relationships.md': {
      title: 'Entity Relationships',
      sidebar_position: 3,
      content:
        extractSection('## 6. Entity Relationships', '## 7. Cross-Context References') +
        '\n\n---\n\n' +
        extractSection('## 7. Cross-Context References', '## 8. Immutable Snapshot'),
    },
    'data-model/snapshots.md': {
      title: 'Immutable Snapshots',
      sidebar_position: 4,
      content: extractSection('## 8. Immutable Snapshot Structures', '## 9. Financial Ownership'),
    },
    'data-model/financial-boundaries.md': {
      title: 'Financial Ownership',
      sidebar_position: 5,
      content: extractSection('## 9. Financial Ownership Boundaries', '## 10. Lifecycle-Owned'),
    },
    'data-model/lifecycle-data.md': {
      title: 'Lifecycle-Owned Data',
      sidebar_position: 6,
      content: extractSection('## 10. Lifecycle-Owned Data', '## 11. Conceptual ERD'),
    },
    'data-model/erd-diagrams.md': {
      title: 'Conceptual ERD Diagrams',
      sidebar_position: 7,
      content: extractSection('## 11. Conceptual ERD Diagrams', '## 12. Data Consistency'),
    },
    'data-model/consistency-and-integration.md': {
      title: 'Consistency & Integration',
      sidebar_position: 8,
      content:
        extractSection('## 12. Data Consistency Rules', '## 13. Cross-Context Integration') +
        '\n\n---\n\n' +
        extractSection('## 13. Cross-Context Integration Constraints', '## 14. Open Ambiguities'),
    },
    'data-model/open-items.md': {
      title: 'Open Ambiguities (Data Model)',
      sidebar_position: 9,
      content: extractSection('## 14. Open Ambiguities Affecting the Model', null),
    },
  };

  for (const [rel, meta] of Object.entries(files)) {
    const fm = `title: ${meta.title}\nsidebar_position: ${meta.sidebar_position}\ndescription: Conceptual data model for Red Cab Marketplace.`;
    let docBody = transformLinks(meta.content);
    if (rel === 'data-model/index.md') {
      docBody = `:::info About this document\n${transformLinks(aboutText)}\n:::\n\n${docBody}`;
    }
    writeFile(rel, `---\n${fm}\n---\n\n${docBody}\n`);
  }
}

function migrateFlat(name, title, sidebarPosition, description) {
  const raw = readSrc(name);
  const fm = `title: ${title}\nsidebar_position: ${sidebarPosition}\ndescription: ${description}`;
  writeFile(name, wrapDoc(fm, raw));
}

function migrateAdrs() {
  const dir = path.join(SRC, 'decisions');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const indexRows = [];

  for (const file of files.sort()) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const num = file.match(/ADR-(\d+)/)?.[1];
    const slug = file.replace(/^ADR-/, 'adr-').toLowerCase();
    const titleMatch = raw.match(/^# (.+)/);
    const title = titleMatch?.[1] ?? slug;
    const fm = `title: "${title.replace(/"/g, '\\"')}"\nsidebar_label: ADR-${num}\nsidebar_position: ${Number(num)}\ndescription: Architecture decision record ${num}.`;
    writeFile(`decisions/${slug}`, wrapDoc(fm, raw));
    indexRows.push(`| ADR-${num} | [${title}](/docs/architecture/decisions/${slug.replace('.md', '')}) | Accepted |`);
  }

  const indexContent = `---
title: Architecture Decisions
sidebar_position: 1
description: Architecture Decision Records (ADRs) for Red Cab Marketplace.
---

:::info About this document
Index of architecture decision records. Each ADR records a decision already established across the architecture set.
:::

## ADR index

| ID | Decision | Status |
| --- | --- | --- |
${indexRows.join('\n')}
`;

  writeFile('decisions/index.md', indexContent);
}

// Scaffold categories
function writeCategories() {
  writeFile(
    '_category_.json',
    JSON.stringify(
      {
        label: 'Architecture',
        position: 4,
        link: { type: 'doc', id: 'architecture/index' },
      },
      null,
      2,
    ) + '\n',
  );

  writeFile(
    'bounded-contexts/_category_.json',
    JSON.stringify({ label: 'Bounded Contexts', position: 3 }, null, 2) + '\n',
  );

  writeFile(
    'data-model/_category_.json',
    JSON.stringify({ label: 'Data Model', position: 7 }, null, 2) + '\n',
  );

  writeFile(
    'decisions/_category_.json',
    JSON.stringify({ label: 'Decisions (ADRs)', position: 9 }, null, 2) + '\n',
  );
}

function writeArchitectureIndex() {
  const content = `---
title: Architecture
sidebar_position: 1
description: System structure, integration patterns, and architectural decisions for Red Cab Marketplace.
---

# Architecture

Defines system structure and integration patterns for the Red Cab Marketplace.

## Documents

| Document | Purpose |
| --- | --- |
| [Overview](/docs/architecture/overview) | Top-level architectural guide |
| [Bounded Contexts](/docs/architecture/bounded-contexts/index) | Strategic DDD context map |
| [Booking State Machine](/docs/architecture/booking-state-machine) | Booking lifecycle and transitions |
| [Payments Architecture](/docs/architecture/payments-architecture) | Commission, payouts, refunds, Stripe |
| [API Design](/docs/architecture/api-design) | REST conventions and contracts |
| [Data Model](/docs/architecture/data-model/index) | Storage model and relationships |
| [Tech Stack](/docs/architecture/tech-stack) | Technology choices and rationale |
| [Decisions (ADRs)](/docs/architecture/decisions/index) | Architecture decision records |

## Reading order

1. [Overview](/docs/architecture/overview) — context, containers, principles
2. [Bounded Contexts](/docs/architecture/bounded-contexts/index) — ownership boundaries
3. [Booking State Machine](/docs/architecture/booking-state-machine) and [Payments Architecture](/docs/architecture/payments-architecture)
4. [API Design](/docs/architecture/api-design) and [Data Model](/docs/architecture/data-model/index)
5. [Tech Stack](/docs/architecture/tech-stack) and [ADRs](/docs/architecture/decisions/index)
`;
  writeFile('index.md', content);
}

function writeStubs() {
  const stubs = [
    'business-rules/glossary.md',
    'business-rules/business-rules.md',
    'domain/domain-models.md',
    'requirements/index.md',
    'requirements/functional-requirements.md',
    'requirements/non-functional-requirements.md',
    'requirements/traceability-matrix.md',
    'engineering/index.md',
    'engineering/backend-conventions.md',
    'engineering/frontend-conventions.md',
    'engineering/domain-to-code-mapping.md',
    'ambiguities/open-questions.md',
  ];

  for (const stub of stubs) {
    const full = path.join(ROOT, 'docs', stub);
    if (!fs.existsSync(full)) {
      const title = stub.split('/').pop().replace('.md', '').replace(/-/g, ' ');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(
        full,
        `---\ntitle: ${title}\ndescription: Migration pending.\n---\n\n# ${title}\n\n*This page is a placeholder. Content migration from red-cab-docs is pending.*\n`,
        'utf8',
      );
      console.log('stub', stub);
    }
  }
}

// Main
fs.mkdirSync(DEST, { recursive: true });
writeCategories();
writeArchitectureIndex();
writeStubs();
splitBoundedContexts();
splitDataModel();
migrateFlat('overview.md', 'Architecture Overview', 2, 'Top-level architecture guide for Red Cab Marketplace.');
migrateFlat('booking-state-machine.md', 'Booking State Machine', 4, 'Booking lifecycle and state transitions.');
migrateFlat('payments-architecture.md', 'Payments Architecture', 5, 'Commission, payouts, refunds, and Stripe integration.');
migrateFlat('api-design.md', 'API Design', 6, 'API contracts, ownership boundaries, and interaction patterns.');
migrateFlat('tech-stack.md', 'Technology Stack', 8, 'Locked technology choices for Red Cab Marketplace.');
migrateAdrs();
console.log('Migration complete. Run: node scripts/format-doc-headers.mjs');
