import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const shared = require(path.resolve('settings-shared.js'));

const {
  normalizeSlpSettings,
  matchScopePattern,
  isUrlDisabledByScope,
  urlOnScopeList,
  buildScopeListMatcher,
  scopeEntryForUrl,
  isSensitivePreviewUrl,
  prepareScopeListAppend,
  buildManifestExcludeMatches,
  pickNewerSettings,
} = shared;

test('matchScopePattern: host and path prefix', () => {
  assert.equal(
    matchScopePattern('https://example.com/admin/settings', 'example.com/admin'),
    true,
  );
  assert.equal(
    matchScopePattern('https://example.com/about', 'example.com/admin'),
    false,
  );
  assert.equal(
    matchScopePattern('https://blog.example.com/', 'example.com'),
    true,
  );
});

test('isUrlDisabledByScope: blacklist vs whitelist', () => {
  const blacklist = normalizeSlpSettings({
    mode: 'blacklist',
    blacklist: ['blocked.com'],
  });
  assert.equal(isUrlDisabledByScope('https://blocked.com/page', blacklist), true);
  assert.equal(isUrlDisabledByScope('https://ok.com/', blacklist), false);

  const whitelist = normalizeSlpSettings({
    mode: 'whitelist',
    whitelist: ['allowed.com'],
  });
  assert.equal(isUrlDisabledByScope('https://allowed.com/', whitelist), false);
  assert.equal(isUrlDisabledByScope('https://other.com/', whitelist), true);
});

test('buildScopeListMatcher agrees with urlOnScopeList', () => {
  const list = ['example.com/admin', '*.test.org', 'plain.io'];
  const matcher = buildScopeListMatcher(list);
  const cases = [
    'https://example.com/admin/x',
    'https://sub.test.org/',
    'https://plain.io/',
    'https://example.com/home',
  ];
  for (const url of cases) {
    assert.equal(matcher(url), urlOnScopeList(url, list), url);
  }
});

test('scopeEntryForUrl', () => {
  assert.equal(scopeEntryForUrl('https://Example.com/Admin/'), 'example.com/Admin');
  assert.equal(scopeEntryForUrl('https://example.com/'), 'example.com');
});

test('isSensitivePreviewUrl blocks auth hosts', () => {
  assert.equal(isSensitivePreviewUrl('https://accounts.google.com/'), true);
  assert.equal(isSensitivePreviewUrl('https://github.com/sessions/abc'), true);
  assert.equal(isSensitivePreviewUrl('https://github.com/foo/bar'), false);
});

test('prepareScopeListAppend respects mode and quota', () => {
  const base = normalizeSlpSettings({ mode: 'blacklist', blacklist: [] });
  const r = prepareScopeListAppend(base, {
    entry: 'evil.com',
    listKind: 'blacklist',
    checkUrl: 'https://evil.com/',
  });
  assert.equal(r.ok, true);
  assert.equal(r.reason, 'saved');
  assert.ok(r.settings.blacklist.includes('evil.com'));

  const again = prepareScopeListAppend(r.settings, {
    entry: 'evil.com',
    listKind: 'blacklist',
    checkUrl: 'https://evil.com/',
  });
  assert.equal(again.reason, 'already');
});

test('pickNewerSettings prefers higher _rev', () => {
  const sync = { mode: 'blacklist', blacklist: ['old.com'], _rev: 100 };
  const session = {
    rev: 200,
    settings: { mode: 'blacklist', blacklist: ['new.com'], _rev: 200 },
  };
  const picked = pickNewerSettings(session, sync);
  assert.deepEqual(picked.blacklist, ['new.com']);

  const staleSession = {
    rev: 50,
    settings: { mode: 'blacklist', blacklist: ['stale.com'], _rev: 50 },
  };
  assert.deepEqual(
    pickNewerSettings(staleSession, sync).blacklist,
    ['old.com'],
  );
});

test('buildManifestExcludeMatches includes host and TLD patterns', () => {
  const patterns = buildManifestExcludeMatches();
  assert.ok(patterns.includes('*://accounts.google.com/*'));
  assert.ok(patterns.includes('*://github.com/login*'));
  assert.ok(patterns.includes('*://*.gov/*'));
  assert.ok(patterns.length > 100);
});
