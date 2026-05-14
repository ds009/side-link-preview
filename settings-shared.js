/* Shared slpSettings shape for options page, content script, and service worker.
 * Legacy storage used a single `list` array; we migrate once into separate
 * blacklist / whitelist arrays. */
function normalizeSlpSettings(raw) {
  const DEFAULTS = {
    mode: 'blacklist',
    blacklist: [],
    whitelist: [],
    linkScope: 'blank-only',
    locale: 'en',
  };
  const r = raw || {};
  const s = { ...DEFAULTS, ...r };
  if (s.mode !== 'whitelist' && s.mode !== 'blacklist')
    s.mode = DEFAULTS.mode;
  if (!Array.isArray(s.blacklist)) s.blacklist = [];
  if (!Array.isArray(s.whitelist)) s.whitelist = [];

  if (
    Array.isArray(r.list) &&
    !Object.prototype.hasOwnProperty.call(r, 'blacklist') &&
    !Object.prototype.hasOwnProperty.call(r, 'whitelist')
  ) {
    const normalized = r.list
      .map((x) => String(x).trim().toLowerCase())
      .filter(Boolean);
    if (r.mode === 'whitelist') s.whitelist = normalized;
    else s.blacklist = normalized;
  }

  return s;
}

/** Domain patterns that apply for the current mode (subset of settings). */
function activeDomainList(settings) {
  const n = normalizeSlpSettings(settings);
  return n.mode === 'whitelist' ? n.whitelist : n.blacklist;
}

/**
 * Path-sensitive destinations that must not enter the Side Panel even though
 * hostname-only checks miss them. Keep aligned with manifest exclude_matches
 * where relevant (e.g. github.com session cookie flows).
 */
function isSensitiveAuthPreviewUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    const path = u.pathname;
    if (host === 'github.com' && /^\/sessions(?:\/|$|\?|#)/i.test(path))
      return true;
    return false;
  } catch (_) {
    return false;
  }
}
