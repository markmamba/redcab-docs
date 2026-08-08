/**
 * Replaces :::info blocks with TL;DR + About this document sections.
 * Headers live in doc-headers.json (avoids template-literal backtick issues).
 */
import fs from 'fs';
import path from 'path';

const DOCS = path.resolve(import.meta.dirname, '../docs');
const HEADERS_FILES = [
  path.join(import.meta.dirname, 'doc-headers.json'),
  path.join(import.meta.dirname, 'doc-headers-migrated.json'),
];

const HEADERS = Object.assign(
  {},
  ...HEADERS_FILES.filter((f) => fs.existsSync(f)).map((f) =>
    JSON.parse(fs.readFileSync(f, 'utf8')),
  ),
);

function stripInfoBlock(content) {
  return content.replace(/\n:::info About this document[\s\S]*?:::\n*/gm, '\n');
}

for (const [rel, header] of Object.entries(HEADERS)) {
  const full = path.join(DOCS, rel);
  if (!fs.existsSync(full)) {
    console.warn('skip missing', rel);
    continue;
  }
  const raw = fs.readFileSync(full, 'utf8');
  const m = raw.match(/^---\n[\s\S]*?\n---\n*/);
  if (!m) {
    console.warn('no frontmatter', rel);
    continue;
  }
  const body = stripInfoBlock(raw.slice(m[0].length));
  const out = m[0] + header.trim() + '\n\n---\n\n' + body.replace(/^\n+/, '');
  fs.writeFileSync(full, out);
  console.log('updated', rel);
}
