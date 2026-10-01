/**
 * Johnny Decimal docs layout (Jod-aligned). Run from repo root:
 *   node scripts/migrate-johnny-decimal.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');

/** @type {Array<[string, string]>} moves: [fromRel, toRel] under docs/ */
const DIR_MOVES = [
  ['product/business-rules', '70-79-business/71-business-rules'],
  ['product/requirements', '70-79-business/72-requirements'],
  ['product/planning', '70-79-business/73-planning'],
  ['product/explainers', '70-79-business/74-explainers'],
  ['architecture/contexts', '30-49-domains/31-bounded-contexts'],
  ['architecture/domain', '30-49-domains/32-domain-models'],
  ['architecture/data-model', '30-49-domains/33-data-model'],
  ['architecture/decisions', '30-49-domains/34-architecture-decisions'],
  ['architecture/patterns', '30-49-domains/35-patterns'],
  ['architecture/system', '30-49-domains/36-system-design'],
  ['engineering/specs', '60-69-initiatives/61-implementation-specs'],
  ['engineering/infrastructure', '20-29-backend/22-infrastructure'],
  ['engineering/authentication', '90-99-engineering-meta/93-authentication'],
];

const FILE_MOVES = [
  ['product/index.md', '70-79-business/index.md'],
  ['product/start-here.md', '00-09-meta/start-here/index.md'],
  ['architecture/index.md', '30-49-domains/index.md'],
  ['engineering/index.md', '90-99-engineering-meta/index.md'],
  ['engineering/conventions/backend.md', '20-29-backend/21-conventions/backend.md'],
  ['engineering/conventions/domain-to-code-mapping.md', '20-29-backend/21-conventions/domain-to-code-mapping.md'],
  ['engineering/conventions/datetime-and-timezones.md', '20-29-backend/21-conventions/datetime-and-timezones.md'],
  ['engineering/conventions/frontend.md', '50-59-frontend/51-conventions/frontend.md'],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function movePath(from, to) {
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

function removeEmptyDir(rel) {
  const full = path.join(DOCS, rel);
  if (!fs.existsSync(full)) return;
  if (fs.readdirSync(full).length === 0) {
    fs.rmdirSync(full);
    console.log('removed empty', rel);
  }
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

function main() {
  for (const [from, to] of DIR_MOVES) movePath(from, to);
  for (const [from, to] of FILE_MOVES) movePath(from, to);

  removeEmptyDir('engineering/conventions');
  removeEmptyDir('engineering');
  removeEmptyDir('architecture');
  removeEmptyDir('product');
  removeEmptyDir('ambiguities');

  writeJson('00-09-meta/_category_.json', {
    label: 'Meta',
    position: 1,
    collapsed: false,
  });

  writeJson('70-79-business/_category_.json', {
    label: 'Business',
    position: 2,
    link: { type: 'doc', id: '70-79-business/index' },
  });

  writeJson('30-49-domains/_category_.json', {
    label: 'Domains & architecture',
    position: 3,
    link: { type: 'doc', id: '30-49-domains/index' },
  });

  writeJson('20-29-backend/_category_.json', {
    label: 'Backend',
    position: 4,
    collapsed: false,
  });

  writeJson('50-59-frontend/_category_.json', {
    label: 'Frontend',
    position: 5,
    collapsed: false,
  });

  writeJson('60-69-initiatives/_category_.json', {
    label: 'Initiatives',
    position: 6,
    link: { type: 'doc', id: '60-69-initiatives/61-implementation-specs/README' },
  });

  writeJson('90-99-engineering-meta/_category_.json', {
    label: 'Engineering meta',
    position: 7,
    link: { type: 'doc', id: '90-99-engineering-meta/index' },
  });

  writeDoc(
    '00-09-meta/about-these-docs/index.md',
    {
      title: 'About these docs',
      sidebar_position: 1,
      description: 'How Red Cab documentation is organized (Johnny Decimal).',
    },
    `## TL;DR

- Single site for product, architecture, and engineering — organized with [Johnny Decimal](https://johnnydecimal.com/) area numbers (same pattern as Jod internal docs).
- **Document precedence** still applies: business rules → requirements → domain → ADRs → engineering → implementation specs → code.
- Implementation specs live under [Initiatives](/docs/60-69-initiatives/61-implementation-specs/).

## Area ranges

| Range | Area | Red Cab content |
| --- | --- | --- |
| 00–09 | Meta | Conventions, start-here, about |
| 20–29 | Backend | API conventions, infrastructure |
| 30–49 | Domains | Bounded contexts, domain models, ADRs, patterns |
| 50–59 | Frontend | Web conventions |
| 60–69 | Initiatives | Per-issue implementation specs |
| 70–79 | Business | Glossary, requirements, roadmap, explainers |
| 90–99 | Engineering meta | Authentication series, cross-cutting engineering |

## Legacy URLs

Older paths (\`/docs/product/\`, \`/docs/architecture/\`, \`/docs/engineering/\`) redirect to the new locations. Bookmarked GitHub Pages links keep working.

## AI agents

\`RED_CAB_DOCS_PATH\` still points at \`redcab-docs/docs/\`. See [AGENTS.md](https://github.com/markmamba/redcab-docs/blob/main/AGENTS.md) in this repository for read order and spec paths.
`,
  );

  writeDoc(
    '00-09-meta/conventions/index.md',
    {
      title: 'Documentation conventions',
      sidebar_position: 2,
      description: 'Johnny Decimal structure, naming, and link style for Red Cab docs.',
    },
    `## Johnny Decimal structure

| Level | Numbered? | Example |
| --- | --- | --- |
| Area | Yes | \`30-49-domains/\` |
| Category | Yes | \`31-bounded-contexts/\` |
| Page / topic | No | \`catalog/index.md\` |

Numbers apply at **area** and **category** only so new pages can be inserted without renumbering files.

## File naming

- Folders: kebab-case (\`bounded-contexts\`, \`implementation-specs\`).
- Main page: \`index.md\` per folder.
- Implementation specs: \`{repo}-{issue}-{slug}.md\` under \`60-69-initiatives/61-implementation-specs/{context}/\`.

## Links

- Prefer absolute site paths in cross-tier links: \`/docs/70-79-business/71-business-rules/glossary\`.
- Use relative paths only within the same category when it stays readable.

## Document precedence

When documents disagree, higher layers win:

1. Business rules (\`70-79-business/71-business-rules/\`)
2. Requirements (\`70-79-business/72-requirements/\`)
3. Domain models (\`30-49-domains/32-domain-models/\`)
4. Architecture + ADRs (\`30-49-domains/\`)
5. Engineering conventions (\`20-29-backend/\`, \`50-59-frontend/\`, \`90-99-engineering-meta/\`)
6. Implementation specs (\`60-69-initiatives/61-implementation-specs/\`)
7. Application code (\`red-cab-api/\`, \`red-cab-web/\`)
`,
  );

  console.log('Johnny Decimal migration complete.');
}

main();
