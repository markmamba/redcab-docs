/**
 * Docusaurus doc links must not include .md suffix.
 */
import fs from 'fs';
import path from 'path';

const DOCS = path.join(path.resolve(import.meta.dirname, '..'), 'docs');

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (ent.name.endsWith('.md')) cb(full);
  }
}

let n = 0;
walk(DOCS, (file) => {
  let c = fs.readFileSync(file, 'utf8');
  const next = c.replace(/(\]\(\/docs\/[^)#]+)\.md/g, '$1');
  if (next !== c) {
    fs.writeFileSync(file, next);
    n += 1;
  }
});
console.log('fixed', n, 'files');
