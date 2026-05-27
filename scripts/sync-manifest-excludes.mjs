// Regenerate manifest.json content_scripts[].exclude_matches from
// settings-shared.js → SENSITIVE_PREVIEW_HOST_PATTERNS (single source of truth).

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);

const { buildManifestExcludeMatches } = require(
  path.join(ROOT, 'settings-shared.js'),
);

const manifestPath = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const excludeMatches = buildManifestExcludeMatches();

for (const entry of manifest.content_scripts || []) {
  if (Array.isArray(entry.exclude_matches)) {
    entry.exclude_matches = excludeMatches;
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ manifest.json exclude_matches (${excludeMatches.length} patterns)`);
