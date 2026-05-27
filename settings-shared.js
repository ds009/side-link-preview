/* Shared slpSettings shape for options page, content script, and service worker.
 * Legacy storage used a single `list` array; we migrate once into separate
 * blacklist / whitelist arrays. */

const LOCALE_LABELS = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
};

const SUPPORTED_LOCALES = Object.keys(LOCALE_LABELS);

/** Match extension UI language to browser / Chrome UI when user has not chosen. */
function detectBrowserLocale(fallback = 'en') {
  try {
    if (typeof navigator !== 'undefined' && navigator) {
      const list =
        navigator.languages && navigator.languages.length
          ? navigator.languages
          : [navigator.language];
      for (const raw of list || []) {
        if (!raw) continue;
        const primary = String(raw).toLowerCase().split(/[-_]/)[0];
        if (SUPPORTED_LOCALES.includes(primary)) return primary;
      }
    }
  } catch (_) {}
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
      const base = (chrome.i18n.getUILanguage() || fallback)
        .toLowerCase()
        .split('-')[0];
      if (SUPPORTED_LOCALES.includes(base)) return base;
    }
  } catch (_) {}
  return fallback;
}

function normalizeSlpSettings(raw) {
  const DEFAULTS = {
    mode: 'blacklist',
    blacklist: [],
    whitelist: [],
    linkScope: 'all',
    openTrigger: 'click',
    hoverOpen: false,
    hoverDelayMs: 2000,
    locale: 'en',
  };
  const r = raw || {};
  const s = { ...DEFAULTS, ...r };
  if (s.mode !== 'whitelist' && s.mode !== 'blacklist')
    s.mode = DEFAULTS.mode;
  if (!Array.isArray(s.blacklist)) s.blacklist = [];
  if (!Array.isArray(s.whitelist)) s.whitelist = [];

  const VALID_OPEN_TRIGGERS = ['click', 'middle-click', 'hover'];
  if (
    typeof s.openTrigger !== 'string' ||
    !VALID_OPEN_TRIGGERS.includes(s.openTrigger)
  ) {
    s.openTrigger = DEFAULTS.openTrigger;
  }
  // Legacy hover-only mode → left click + hover preview checkbox.
  if (s.openTrigger === 'hover') {
    s.openTrigger = 'click';
    s.hoverOpen = true;
  }
  if (typeof s.hoverOpen !== 'boolean') s.hoverOpen = DEFAULTS.hoverOpen;
  const VALID_LINK_SCOPES = ['blank-only', 'all'];
  if (
    typeof s.linkScope !== 'string' ||
    !VALID_LINK_SCOPES.includes(s.linkScope)
  ) {
    s.linkScope = DEFAULTS.linkScope;
  }
  let hoverDelay = Number(r.hoverDelayMs);
  if (!Number.isFinite(hoverDelay)) hoverDelay = DEFAULTS.hoverDelayMs;
  s.hoverDelayMs = Math.min(3000, Math.max(200, Math.round(hoverDelay)));

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

  if (
    !Object.prototype.hasOwnProperty.call(r, 'locale') ||
    typeof s.locale !== 'string' ||
    !SUPPORTED_LOCALES.includes(s.locale)
  ) {
    s.locale = detectBrowserLocale();
  }

  return s;
}

/** True when host is an IPv4 or IPv6 literal (not a domain name). */
function isIpHostname(host) {
  if (!host || typeof host !== 'string') return false;
  const h = host.toLowerCase();
  if (h.includes(':')) return true;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return false;
  return h.split('.').every((oct) => {
    const n = Number(oct);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/**
 * Hosts that should always use native browser navigation — IP literals,
 * localhost, and mDNS `.local` names (dev/admin panels, routers, etc.).
 */
function isNativeOnlyHost(host) {
  if (!host || typeof host !== 'string') return false;
  const h = host.toLowerCase();
  if (h === 'localhost') return true;
  if (/^[\w-]+\.(?:local|internal|corp|lan|home)$/i.test(h)) return true;
  return isIpHostname(h);
}

function isNativeOnlyPreviewUrl(url) {
  if (!url) return false;
  try {
    return isNativeOnlyHost(new URL(url).hostname);
  } catch (_) {
    return false;
  }
}

/**
 * Host patterns where the extension must not inject or preview (auth, banking,
 * webmail, realtime apps, streaming, consoles, etc.). Keep in sync with
 * manifest.json → content_scripts[].exclude_matches.
 */
const SENSITIVE_PREVIEW_HOST_PATTERNS = [
  // Auth / SSO / IdP
  'accounts.google.com',
  'accounts.youtube.com',
  'login.microsoftonline.com',
  'login.live.com',
  'login.microsoft.com',
  'appleid.apple.com',
  'idmsa.apple.com',
  'signin.aws.amazon.com',
  'okta.com',
  'duosecurity.com',
  'onelogin.com',
  'auth0.com',
  'checkout.stripe.com',
  'paypal.com',
  'accounts.firefox.com',
  'login.yahoo.com',
  'bitwarden.com',
  'login.salesforce.com',
  'id.atlassian.com',
  'pingidentity.com',
  'forgerock.com',
  // E2E messaging
  'web.whatsapp.com',
  'web.telegram.org',
  // Webmail / workplace
  'mail.google.com',
  'outlook.office.com',
  'outlook.live.com',
  'mail.yahoo.com',
  // Video / voice realtime
  'meet.google.com',
  'teams.microsoft.com',
  'teams.live.com',
  'zoom.us',
  'discord.com',
  // Streaming / DRM
  'netflix.com',
  'spotify.com',
  'disneyplus.com',
  'hulu.com',
  'max.com',
  'primevideo.com',
  'twitch.tv',
  'youtube.com',
  // Cloud consoles
  'console.aws.amazon.com',
  'console.cloud.google.com',
  'portal.azure.com',
  // Online IDEs
  'codesandbox.io',
  'stackblitz.com',
  'replit.com',
  'gitpod.io',
  // Crypto
  'binance.com',
  'coinbase.com',
  'kraken.com',
  'metamask.io',
  'ledger.com',
  // Major banks / brokers (representative set)
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com',
  'citi.com',
  'capitalone.com',
  'icbc.com.cn',
  'boc.cn',
  'abchina.com',
  'ccb.com.cn',
  'hsbc.com',
  'barclays.co.uk',
  'lloydsbank.com',
  'schwab.com',
  'fidelity.com',
  'robinhood.com',
  // Link shorteners
  't.co',
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'buff.ly',
];

const SENSITIVE_PREVIEW_PATH_RES = [
  /^\/(?:login|signin|sign-in|sign_in|sso|saml|oauth2?|auth|authorize|authentication|register|signup|sign-up)(?:\/|$|\?|#)/i,
  /^\/(?:checkout|cart|payment|pay|billing|subscribe|subscription|wallet|transfer|withdraw|purchase)(?:\/|$|\?|#)/i,
  /^\/connect\/authorize(?:\/|$|\?|#)/i,
];

function isRestrictedPublicSuffixHost(host) {
  const h = String(host || '').toLowerCase();
  if (!h) return false;
  if (h.endsWith('.gov') || h.endsWith('.mil')) return true;
  if (h.endsWith('.gov.cn') || h.endsWith('.edu.cn')) return true;
  if (h.endsWith('.nhs.uk')) return true;
  return false;
}

function isSensitivePreviewHost(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  if (isRestrictedPublicSuffixHost(h)) return true;
  return SENSITIVE_PREVIEW_HOST_PATTERNS.some((p) => matchDomain(h, p));
}

function isSensitivePreviewPath(pathname) {
  const path = String(pathname || '/');
  return SENSITIVE_PREVIEW_PATH_RES.some((re) => re.test(path));
}

/** True when URL must not use Side Panel preview (anywhere in the pipeline). */
function isSensitivePreviewUrl(url) {
  if (!url) return false;
  if (isNativeOnlyPreviewUrl(url)) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (isSensitivePreviewHost(u.hostname)) return true;
    if (isSensitivePreviewPath(u.pathname)) return true;
    if (
      u.hostname.toLowerCase() === 'github.com' &&
      /^\/sessions(?:\/|$|\?|#)/i.test(u.pathname)
    )
      return true;
    return false;
  } catch (_) {
    return false;
  }
}

/** @deprecated Use isSensitivePreviewUrl — kept for call-site clarity. */
function isSensitiveAuthPreviewUrl(url) {
  return isSensitivePreviewUrl(url);
}

/** Domain patterns that apply for the current mode (subset of settings). */
function activeDomainList(settings) {
  const n = normalizeSlpSettings(settings);
  return n.mode === 'whitelist' ? n.whitelist : n.blacklist;
}

// Split a scope entry into host + optional path prefix. Supports optional
// http(s):// prefix. `example.com` → whole host; `example.com/admin` → host
// plus path prefix; `example.com/` → whole host (trailing slash only).
function parseScopePattern(raw) {
  let s = String(raw).trim().toLowerCase();
  if (!s) return { hostPattern: '', pathPattern: null };
  s = s.replace(/^https?:\/\//, '');
  const slashIdx = s.indexOf('/');
  if (slashIdx === -1) return { hostPattern: s, pathPattern: null };
  const hostPattern = s.slice(0, slashIdx);
  let pathPattern = s.slice(slashIdx);
  if (pathPattern === '/') pathPattern = null;
  return { hostPattern, pathPattern };
}

const wildcardReCache = new Map();

function wildcardRe(pattern) {
  const p = String(pattern);
  if (!wildcardReCache.has(p)) {
    wildcardReCache.set(
      p,
      new RegExp(
        '^' +
          p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
          '$',
      ),
    );
  }
  return wildcardReCache.get(p);
}

// Exact host match, subdomain (example.com hits www/blog), or `*` wildcard.
function matchDomain(host, pattern) {
  if (!pattern || !host) return false;
  const h = String(host).toLowerCase();
  const p = String(pattern).toLowerCase();
  if (p.includes('*')) return wildcardRe(p).test(h);
  return h === p || h.endsWith('.' + p);
}

function normalizeScopePathname(pathname) {
  const path = String(pathname || '/');
  if (path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

function normalizeScopePathPattern(pathPattern) {
  const pat = String(pathPattern);
  if (pat === '/') return '/';
  return pat.replace(/\/+$/, '') || '/';
}

// Prefix match with optional `*` wildcards. `/admin` hits `/admin` and
// `/admin/settings` but not `/administrator`.
function matchScopePath(pathname, pathPattern) {
  if (pathPattern == null) return true;
  const path = normalizeScopePathname(pathname);
  const pat = normalizeScopePathPattern(pathPattern);
  if (pat.includes('*')) {
    const key = pat + '::path';
    if (!wildcardReCache.has(key)) {
      wildcardReCache.set(
        key,
        new RegExp(
          '^' +
            pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
            '(?:/|$)',
        ),
      );
    }
    return wildcardReCache.get(key).test(path);
  }
  return path === pat || path.startsWith(pat + '/');
}

/**
 * True when a scope entry matches a URL (or bare hostname for legacy callers).
 * Domain-only entries still apply to all paths on that host.
 */
function matchScopePattern(urlOrHost, pattern) {
  if (!pattern) return false;
  const { hostPattern, pathPattern } = parseScopePattern(pattern);
  if (!hostPattern) return false;

  let host;
  let pathname = '/';
  const raw = String(urlOrHost || '');
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      host = u.hostname.toLowerCase();
      pathname = u.pathname || '/';
    } catch (_) {
      return false;
    }
  } else if (raw) {
    host = raw.toLowerCase();
  } else {
    return false;
  }

  if (!matchDomain(host, hostPattern)) return false;
  return matchScopePath(pathname, pathPattern);
}

/** Canonical scope-list entry for the current page URL (host or host+path). */
function scopeEntryForUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = normalizeScopePathname(u.pathname);
    if (path === '/') return host;
    return host + path;
  } catch (_) {
    return '';
  }
}

/** Build a fast matcher for a scope list (indexed by host suffix). */
function buildScopeListMatcher(list) {
  if (!Array.isArray(list) || !list.length) return () => false;

  const byHost = new Map();
  const wildcards = [];

  for (const raw of list) {
    const { hostPattern, pathPattern } = parseScopePattern(raw);
    if (!hostPattern) continue;
    const entry = { pathPattern };
    if (hostPattern.includes('*')) {
      wildcards.push({ hostPattern, pathPattern });
    } else {
      if (!byHost.has(hostPattern)) byHost.set(hostPattern, []);
      byHost.get(hostPattern).push(entry);
    }
  }

  return (urlOrHost) => {
    let host;
    let pathname = '/';
    const raw = String(urlOrHost || '');
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        host = u.hostname.toLowerCase();
        pathname = u.pathname || '/';
      } catch (_) {
        return false;
      }
    } else if (raw) {
      host = raw.toLowerCase();
    } else {
      return false;
    }

    const labels = host.split('.');
    for (let i = 0; i < labels.length; i++) {
      const entries = byHost.get(labels.slice(i).join('.'));
      if (!entries) continue;
      for (const e of entries) {
        if (matchScopePath(pathname, e.pathPattern)) return true;
      }
    }

    for (const w of wildcards) {
      if (
        wildcardRe(w.hostPattern).test(host) &&
        matchScopePath(pathname, w.pathPattern)
      ) {
        return true;
      }
    }
    return false;
  };
}

let scopeMatcherCacheKey = '';
let scopeMatcherCache = null;

function scopeListCacheKey(settings) {
  const n = normalizeSlpSettings(settings);
  const list = n.mode === 'whitelist' ? n.whitelist : n.blacklist;
  return `${n.mode}\0${list.join('\n')}`;
}

function urlOnScopeList(url, list) {
  if (!url || !Array.isArray(list) || !list.length) return false;
  return buildScopeListMatcher(list)(url);
}

function readSettingsRev(raw) {
  const r = raw || {};
  return typeof r._rev === 'number' && Number.isFinite(r._rev) ? r._rev : 0;
}

/** Pick sync vs session cache entry by _rev (newer wins). */
function pickNewerSettings(sessionCache, syncRaw) {
  const syncRev = readSettingsRev(syncRaw);
  const sessionRev =
    sessionCache && typeof sessionCache.rev === 'number'
      ? sessionCache.rev
      : readSettingsRev(sessionCache?.settings);
  if (sessionCache?.settings && sessionRev >= syncRev) {
    return sessionCache.settings;
  }
  return syncRaw;
}

function isUrlListedByScope(url, rawSettings) {
  const key = scopeListCacheKey(rawSettings);
  if (key !== scopeMatcherCacheKey || !scopeMatcherCache) {
    scopeMatcherCacheKey = key;
    const n = normalizeSlpSettings(rawSettings);
    const list = n.mode === 'whitelist' ? n.whitelist : n.blacklist;
    scopeMatcherCache = buildScopeListMatcher(list);
  }
  return scopeMatcherCache(url);
}

/**
 * True when Scope disables automatic preview for this URL (blacklist hit in
 * blacklist mode; not listed in whitelist mode). Does NOT apply inside the
 * Side Panel iframe, where previews are intentional regardless of Scope.
 */
function isUrlDisabledByScope(url, rawSettings) {
  if (!url) return false;
  const n = normalizeSlpSettings(rawSettings);
  const listed = isUrlListedByScope(url, n);
  if (n.mode === 'whitelist') return !listed;
  return listed;
}

/** Soft cap for chrome.storage.sync slpSettings — leaves headroom under 8192 B. */
const SYNC_ITEM_SOFT_LIMIT = 7500;

function settingsByteLength(obj) {
  return new TextEncoder().encode(JSON.stringify(obj)).length;
}

function settingsToSyncPayload(normalized, rev) {
  return {
    mode: normalized.mode,
    blacklist: [...normalized.blacklist],
    whitelist: [...normalized.whitelist],
    linkScope: normalized.linkScope,
    openTrigger: normalized.openTrigger,
    hoverOpen: normalized.hoverOpen,
    hoverDelayMs: normalized.hoverDelayMs,
    locale: normalized.locale,
    _rev: rev ?? Date.now(),
  };
}

/**
 * Prepare an append to blacklist or whitelist without writing storage.
 * @returns {{ ok: boolean, reason: string, settings?: object }}
 */
function prepareScopeListAppend(rawSettings, { entry, listKind, checkUrl }) {
  if (!entry) return { ok: false, reason: 'bad-url' };
  const normalized = normalizeSlpSettings(rawSettings);
  if (listKind === 'whitelist' && normalized.mode !== 'whitelist') {
    return { ok: false, reason: 'not-whitelist-mode' };
  }
  if (listKind === 'blacklist' && normalized.mode !== 'blacklist') {
    return { ok: false, reason: 'not-blacklist-mode' };
  }
  const listName = listKind === 'whitelist' ? 'whitelist' : 'blacklist';
  const list = normalized[listName];
  const probe =
    checkUrl ||
    (listKind === 'whitelist' ? `https://${entry}/` : String(entry));
  if (urlOnScopeList(probe, list)) return { ok: true, reason: 'already' };
  const next = settingsToSyncPayload({
    ...normalized,
    [listName]: [...list, entry],
  });
  if (settingsByteLength(next) > SYNC_ITEM_SOFT_LIMIT) {
    return { ok: false, reason: 'quota' };
  }
  return { ok: true, reason: 'saved', settings: next };
}

/** Patterns for manifest.json exclude_matches (path / TLD only). */
const MANIFEST_EXTRA_EXCLUDE_MATCHES = [
  '*://github.com/login*',
  '*://github.com/sessions/*',
  '*://*.gov/*',
  '*://*.mil/*',
  '*://*.gov.cn/*',
  '*://*.edu.cn/*',
  '*://*.nhs.uk/*',
];

/** Build content_scripts exclude_matches from SENSITIVE_PREVIEW_HOST_PATTERNS. */
function buildManifestExcludeMatches() {
  const out = new Set(MANIFEST_EXTRA_EXCLUDE_MATCHES);
  for (const host of SENSITIVE_PREVIEW_HOST_PATTERNS) {
    out.add(`*://${host}/*`);
    out.add(`*://*.${host}/*`);
  }
  return [...out].sort();
}

/** @deprecated Use isUrlDisabledByScope — host-only callers pass root URL. */
function isHostDisabledByScope(host, rawSettings) {
  if (!host) return false;
  return isUrlDisabledByScope(`https://${host}/`, rawSettings);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeSlpSettings,
    matchScopePattern,
    matchDomain,
    isUrlDisabledByScope,
    isUrlListedByScope,
    urlOnScopeList,
    buildScopeListMatcher,
    scopeEntryForUrl,
    isSensitivePreviewUrl,
    isSensitivePreviewHost,
    prepareScopeListAppend,
    settingsByteLength,
    settingsToSyncPayload,
    SYNC_ITEM_SOFT_LIMIT,
    buildManifestExcludeMatches,
    pickNewerSettings,
    readSettingsRev,
    SENSITIVE_PREVIEW_HOST_PATTERNS,
    MANIFEST_EXTRA_EXCLUDE_MATCHES,
  };
}
