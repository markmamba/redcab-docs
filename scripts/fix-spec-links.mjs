import fs from 'fs';
import path from 'path';

const SPECS = path.resolve(import.meta.dirname, '..', 'docs/engineering/specs');

const REPLACEMENTS = [
  ['../requirements/functional-requirements/', '/docs/product/requirements/functional-requirements/'],
  ['../requirements/non-functional-requirements.md', '/docs/product/requirements/non-functional-requirements'],
  ['../requirements/', '/docs/product/requirements/'],
  ['../business-rules/', '/docs/product/business-rules/'],
  ['../ambiguities/open-questions.md', '/docs/product/planning/open-questions'],
  ['../roadmap/', '/docs/product/planning/roadmap/'],
  ['../architecture/contexts/', '/docs/architecture/contexts/'],
  ['../architecture/payments-architecture.md', '/docs/architecture/patterns/payments-architecture'],
  ['../architecture/booking-state-machine.md', '/docs/architecture/patterns/booking-state-machine'],
  ['../architecture/geography.md', '/docs/architecture/patterns/geography'],
  ['../architecture/decisions/', '/docs/architecture/decisions/'],
  ['../engineering/backend-conventions.md', '/docs/engineering/conventions/backend'],
  ['../engineering/frontend-conventions.md', '/docs/engineering/conventions/frontend'],
  ['../engineering/domain-to-code-mapping.md', '/docs/engineering/conventions/domain-to-code-mapping'],
  ['[requirements/functional-requirements/', '[/docs/product/requirements/functional-requirements/'],
  ['[engineering/backend-conventions.md]', '[Backend conventions](/docs/engineering/conventions/backend)'],
  ['[engineering/frontend-conventions.md]', '[Frontend conventions](/docs/engineering/conventions/frontend)'],
  ['[engineering/domain-to-code-mapping.md]', '[Domain-to-code mapping](/docs/engineering/conventions/domain-to-code-mapping)'],
  ['[architecture/contexts/payments.md]', '[Payments context](/docs/architecture/contexts/payments)'],
  ['[architecture/payments-architecture.md]', '[Payments architecture](/docs/architecture/patterns/payments-architecture)'],
  ['[architecture/booking-state-machine.md]', '[Booking state machine](/docs/architecture/patterns/booking-state-machine)'],
  ['[roadmap/phase-1-mvp.md]', '[Phase 1 MVP](/docs/product/planning/roadmap/phase-1-mvp)'],
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (ent.name.endsWith('.md')) cb(full);
  }
}

// Rename template back to _template (excluded from MDX route; placeholders break MDX)
const template = path.join(SPECS, 'template.md');
const underscore = path.join(SPECS, '_template.md');
if (fs.existsSync(template)) {
  fs.renameSync(template, underscore);
  console.log('renamed template.md → _template.md');
}

walk(SPECS, (file) => {
  if (path.basename(file) === '_template.md') return;
  let c = fs.readFileSync(file, 'utf8');
  let next = c;
  for (const [from, to] of REPLACEMENTS) next = next.split(from).join(to);
  // Fix pay.md links that lost .md extension
  next = next.replace(
    /(\/docs\/product\/requirements\/functional-requirements\/\w+)\.md\)/g,
    '$1)',
  );
  if (next !== c) {
    fs.writeFileSync(file, next);
    console.log('fixed', path.relative(SPECS, file));
  }
});

// README: reference template as code, not link
const readme = path.join(SPECS, 'README.md');
let r = fs.readFileSync(readme, 'utf8');
r = r.replace('| Spec template | [_template.md](./template.md) |', '| Spec template | `_template.md` (copy in repo; not published) |');
r = r.replace('Copy `_template.md`', 'Copy `engineering/specs/_template.md`');
r = r.replace('Copy `template.md`', 'Copy `engineering/specs/_template.md`');
fs.writeFileSync(readme, r);
console.log('updated README');
