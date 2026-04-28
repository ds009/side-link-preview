// Build the Chrome Web Store upload zip.
//
// Equivalent to `npm run zip`. Lives in a real .mjs file (not inline in
// package.json) because the previous shell-quoted one-liner silently
// dropped the version interpolation on some platforms, producing
// `side-link-preview-.zip`. This version is platform-agnostic.

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const version = manifest.version;
if (!version) {
  console.error('manifest.json has no version');
  process.exit(1);
}

const dist = path.join(ROOT, 'dist');
mkdirSync(dist, { recursive: true });

const out = path.join(dist, `side-link-preview-${version}.zip`);
if (existsSync(out)) unlinkSync(out);

const include = [
  'manifest.json',
  'background.js',
  'content.js',
  'injected.js',
  'sidepanel.html',
  'sidepanel.js',
  'options.html',
  'options.js',
  'i18n.js',
  'locales',
  'icons',
  'PRIVACY.md',
  'LICENSE',
  'README.md',
];

const exclude = ['*.DS_Store', 'icons/icon-square.png'];

const cmd = [
  'zip',
  '-r',
  JSON.stringify(out),
  ...include.map((p) => JSON.stringify(p)),
  '-x',
  ...exclude.map((p) => JSON.stringify(p)),
].join(' ');

console.log('$', cmd);
execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

const sizeKb = (statSync(out).size / 1024).toFixed(1);
console.log(`\n✓ ${path.relative(ROOT, out)} (${sizeKb} KB)`);
