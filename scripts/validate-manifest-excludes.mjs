// Fail CI when manifest exclude_matches drift from settings-shared.js source.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const { buildManifestExcludeMatches } = require(
  path.join(ROOT, 'settings-shared.js'),
);

const manifest = JSON.parse(
  readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'),
);
const expected = buildManifestExcludeMatches();
const actual = manifest.content_scripts?.[0]?.exclude_matches;

if (!Array.isArray(actual)) {
  console.error('manifest.json content_scripts[0].exclude_matches missing');
  process.exit(1);
}

const sort = (a) => [...a].sort();
const exp = sort(expected);
const got = sort(actual);

if (exp.length !== got.length || exp.some((v, i) => v !== got[i])) {
  console.error(
    'manifest exclude_matches out of sync — run: npm run sync:manifest',
  );
  const missing = exp.filter((x) => !got.includes(x));
  const extra = got.filter((x) => !exp.includes(x));
  if (missing.length) console.error('missing:', missing.slice(0, 10), missing.length > 10 ? `…+${missing.length - 10}` : '');
  if (extra.length) console.error('extra:', extra.slice(0, 10), extra.length > 10 ? `…+${extra.length - 10}` : '');
  process.exit(1);
}

console.log(`ok manifest exclude_matches (${got.length} patterns)`);
