/* global importScripts, normalizeSlpSettings, isSensitivePreviewUrl, probeEmbedBlock, detectBrowserLocale */
importScripts('settings-shared.js', 'embed-probe.js');

const DNR_RULE_ID = 1;

// Strip X-Frame-Options / CSP headers only on iframe requests whose initiator
// is this extension (i.e. the Side Panel). Regular browsing on any site is
// therefore untouched — no other request on the device is affected.
const ensureDnrRule = async () => {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [DNR_RULE_ID],
      addRules: [
        {
          id: DNR_RULE_ID,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              { header: 'x-frame-options', operation: 'remove' },
              { header: 'content-security-policy', operation: 'remove' },
              {
                header: 'content-security-policy-report-only',
                operation: 'remove',
              },
              { header: 'x-webkit-csp', operation: 'remove' },
            ],
          },
          condition: {
            resourceTypes: ['sub_frame'],
            initiatorDomains: [chrome.runtime.id],
          },
        },
      ],
    });
  } catch (err) {
    console.warn('[SideLinkPreview] DNR register failed:', err);
  }
};

// ---------- Context menu ----------
// "Open link in Side Panel" — a one-shot, user-initiated bypass of the
// blacklist / link-scope rules. Shown only on link targets.
const CONTEXT_MENU_ID = 'slp-open-link-in-side-panel';
const CONTEXT_MENU_WHITELIST_ID = 'slp-add-to-whitelist';

const PROBE_CACHE_TTL_MS = 5 * 60 * 1000;
const PROBE_CACHE_MAX = 50;
const probeCache = new Map();

const cacheProbeResult = (url, result) => {
  if (probeCache.size >= PROBE_CACHE_MAX) {
    const oldest = probeCache.keys().next().value;
    if (oldest) probeCache.delete(oldest);
  }
  probeCache.set(url, { at: Date.now(), result });
};

const getLocaleDict = async () => {
  let locale = detectBrowserLocale();
  try {
    const data = await chrome.storage.sync.get('slpSettings');
    locale = normalizeSlpSettings(data?.slpSettings).locale;
  } catch (_) {}
  try {
    const res = await fetch(chrome.runtime.getURL(`locales/${locale}.json`));
    return await res.json();
  } catch (_) {
    return {};
  }
};

const persistAddToWhitelist = async (pageUrl) => {
  if (!isHttpUrl(pageUrl)) return { ok: false, reason: 'bad-url' };
  let host = '';
  try {
    host = new URL(pageUrl).hostname.toLowerCase();
  } catch (_) {
    return { ok: false, reason: 'bad-url' };
  }
  if (!host) return { ok: false, reason: 'bad-url' };

  let snap = {};
  try {
    snap = await chrome.storage.sync.get('slpSettings');
  } catch (_) {
    return { ok: false, reason: 'read' };
  }

  const prepared = prepareScopeListAppend(snap.slpSettings, {
    entry: host,
    listKind: 'whitelist',
    checkUrl: `https://${host}/`,
  });
  if (!prepared.ok || prepared.reason === 'already') return prepared;

  try {
    await chrome.storage.sync.set({ slpSettings: prepared.settings });
    return { ok: true, reason: 'saved' };
  } catch (_) {
    return { ok: false, reason: 'write' };
  }
};

const ensureContextMenu = async () => {
  try {
    const [dict, snap] = await Promise.all([
      getLocaleDict(),
      chrome.storage.sync.get('slpSettings').catch(() => ({})),
    ]);
    const normalized = normalizeSlpSettings(snap.slpSettings);
    const openTitle =
      dict.context_menu_open_in_side_panel || 'Open link in Side Panel';
    const whitelistTitle =
      dict.context_menu_add_to_whitelist || 'Add this site to whitelist';

    chrome.contextMenus.removeAll(() => {
      // Swallow any lastError from removeAll itself.
      void chrome.runtime.lastError;
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_ID,
          title: openTitle,
          contexts: ['link'],
        },
        () => {
          void chrome.runtime.lastError;
        },
      );
      if (normalized.mode === 'whitelist') {
        chrome.contextMenus.create(
          {
            id: CONTEXT_MENU_WHITELIST_ID,
            title: whitelistTitle,
            contexts: ['page'],
          },
          () => {
            void chrome.runtime.lastError;
          },
        );
      }
    });
  } catch (err) {
    console.warn('[SideLinkPreview] contextMenu register failed:', err);
  }
};

// Refresh context-menu labels / whitelist entry when language or mode changes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!changes.slpSettings) return;
  const before = changes.slpSettings.oldValue;
  const after = changes.slpSettings.newValue;
  if (before?.locale !== after?.locale || before?.mode !== after?.mode) {
    ensureContextMenu();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[SideLinkPreview] setPanelBehavior:', err));
  ensureDnrRule();
  ensureContextMenu();
});

// Re-register on service-worker cold start too (onInstalled does not fire every time).
chrome.runtime.onStartup.addListener(() => {
  ensureDnrRule();
  ensureContextMenu();
});
ensureDnrRule();
ensureContextMenu();

const isHttpUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

const panelReadyKey = (tabId) => `sp_ready_${tabId}`;

const markTabPanelReady = (tabId) => {
  if (!tabId) return;
  chrome.storage.session
    .set({ [panelReadyKey(tabId)]: true })
    .catch(() => {});
};

// Push a concrete URL into the current tab's Side Panel. Mirrors the open
// logic used in the onMessage branch below.
const openUrlInSidePanel = async (url, tab) => {
  if (!isHttpUrl(url) || !tab?.id || !tab?.windowId) return;
  // Auth / SSO / payment / E2E-messaging destinations are unsafe to embed
  // even when the user explicitly chose "Open link in Side Panel" or
  // pressed the keyboard shortcut. Fall back to a real new tab.
  if (isSensitivePreviewUrl(url)) {
    try {
      await chrome.tabs.create({ url, active: true });
    } catch (err) {
      console.warn('[SideLinkPreview] sensitive-url fallback:', err);
    }
    return;
  }
  const tabId = tab.id;
  const windowId = tab.windowId;
  try {
    await chrome.storage.session.set({ [`sp_url_${tabId}`]: url });
    markTabPanelReady(tabId);
    await chrome.sidePanel.setOptions({
      tabId,
      path: `sidepanel.html?tabId=${tabId}`,
      enabled: true,
    });
    // Note: this path runs inside a user gesture (keyboard shortcut or
    // context-menu click), so sidePanel.open() will actually succeed.
    await chrome.sidePanel.open({ tabId, windowId });
  } catch (err) {
    console.warn('[SideLinkPreview] openUrlInSidePanel:', err);
  }
};

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    const url = info.linkUrl || info.pageUrl;
    openUrlInSidePanel(url, tab);
    return;
  }
  if (info.menuItemId === CONTEXT_MENU_WHITELIST_ID) {
    const url = tab?.url || tab?.pendingUrl || info.pageUrl;
    persistAddToWhitelist(url).then((res) => {
      if (!res.ok && res.reason !== 'already') {
        console.warn('[SideLinkPreview] add to whitelist:', res);
      }
    });
  }
});

// ---------- Keyboard shortcut ----------
// Alt+Shift+P → preview the current tab's URL in the Side Panel, enabling a
// quick "mirror this page to the right and keep reading" workflow.
chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== 'toggle-side-panel') return;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) return;
    const url = tab.url || tab.pendingUrl;
    if (!isHttpUrl(url)) return;
    openUrlInSidePanel(url, tab);
  } catch (err) {
    console.warn('[SideLinkPreview] command toggle-side-panel:', err);
  }
});

// ---------- action.onClicked fallback ----------
// setPanelBehavior({ openPanelOnActionClick: true }) occasionally fails on
// older Chrome versions, under enterprise policy, or when the toolbar icon is
// hidden. Add an explicit onClicked handler to force-open the Side Panel when
// the toolbar icon is clicked.
chrome.action?.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab?.windowId) return;
  // Side-panel iframe cannot embed chrome://, chrome-extension://,
  // devtools://, view-source:, about: etc. — opening the panel on those
  // tabs would just show the empty state. Stay out of the way; the panel
  // auto-disable in refreshSidePanelForTab() has already set enabled:false
  // for this tab, and we don't want to overrule that just because the user
  // happened to click the toolbar icon while parked on a system page.
  const url = tab.url || tab.pendingUrl;
  if (isSystemUrl(url) || isSensitivePreviewUrl(url)) return;
  try {
    // Re-enable in case our blacklist auto-disable closed the panel for this
    // tab. Toolbar click is an explicit user gesture, so honor it even on
    // user-disabled hosts (but never on system pages — see above).
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: `sidepanel.html?tabId=${tab.id}`,
      enabled: true,
    });
    if (isHttpUrl(url)) {
      await chrome.storage.session.set({ [`sp_url_${tab.id}`]: url });
    }
    markTabPanelReady(tab.id);
    await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
  } catch (err) {
    console.warn('[SideLinkPreview] action.onClicked:', err);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // content.js reports SPA / history navigations that tabs.onUpdated can miss.
  if (msg?.type === 'SLP_MAIN_URL_CHANGED') {
    const tabId = sender.tab?.id;
    if (tabId && typeof msg.url === 'string') {
      refreshSidePanelForTab(tabId, msg.url, { fromNavigation: true });
    }
    sendResponse({ ok: true });
    return;
  }

  // Fallback path used by content.js when injected.js has hijacked
  // window.open() but the destination host is on the user's disable list.
  // We can't resurrect the original popup, so open the URL in a new tab.
  if (msg?.type === 'OPEN_IN_NEW_TAB') {
    if (isHttpUrl(msg.url)) {
      chrome.tabs
        .create({ url: msg.url, active: true })
        .catch((err) =>
          console.warn('[SideLinkPreview] tabs.create:', err),
        );
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg?.type === 'PROBE_EMBED_BLOCK') {
    if (!isHttpUrl(msg.url)) {
      sendResponse({ ok: false, reasons: [], debug: [] });
      return;
    }
    const cached = probeCache.get(msg.url);
    if (cached && Date.now() - cached.at < PROBE_CACHE_TTL_MS) {
      sendResponse({ ok: true, ...cached.result });
      return;
    }
    probeEmbedBlock(msg.url)
      .then((result) => {
        cacheProbeResult(msg.url, result);
        sendResponse({ ok: true, ...result });
      })
      .catch((err) => {
        console.warn('[SideLinkPreview] PROBE_EMBED_BLOCK:', err);
        sendResponse({
          ok: false,
          reasons: [{ id: 'fetch-error', detail: String(err) }],
          debug: [String(err)],
        });
      });
    return true;
  }

  if (msg?.type === 'OPEN_IN_MAIN_TAB') {
    const tabId = msg.tabId;
    const url = msg.url;
    if (!tabId || !isHttpUrl(url)) {
      sendResponse({ ok: false, reason: 'bad request' });
      return;
    }
    clearPreviewSession(tabId);
    chrome.tabs
      .update(tabId, { url, active: true })
      .then(() => {
        requestSidePanelClose(tabId);
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.warn('[SideLinkPreview] OPEN_IN_MAIN_TAB:', err);
        sendResponse({ ok: false, reason: String(err) });
      });
    return true;
  }

  if (msg?.type !== 'OPEN_IN_SIDE_PANEL') return;

  // Only http(s) URLs are previewable in the iframe. content.js already
  // filters at click time; this is a defense-in-depth check.
  if (!isHttpUrl(msg.url)) {
    sendResponse({ ok: false, reason: 'unsupported scheme' });
    return;
  }
  // Auth / SSO / payment / E2E-messaging hosts must never enter the Side
  // Panel even if a stale content script forwards them here. Fall back to
  // opening in a real new tab so the user still gets the page.
  if (isSensitivePreviewUrl(msg.url)) {
    sendResponse({ ok: false, reason: 'sensitive url' });
    return;
  }

  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (!tabId || !windowId) {
    sendResponse({ ok: false, reason: 'no tab context' });
    return;
  }

  const trigger = msg.trigger === 'hover' ? 'hover' : 'click';

  // Hover only updates an already-open panel. Chrome requires a user gesture
  // to open the Side Panel the first time on each tab.
  if (trigger === 'hover') {
    chrome.storage.session.get(panelReadyKey(tabId)).then((data) => {
      if (!data[panelReadyKey(tabId)]) {
        sendResponse({ ok: false, reason: 'need-click' });
        return;
      }
      chrome.storage.session
        .set({ [`sp_url_${tabId}`]: msg.url })
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, reason: String(err) }));
    });
    return true;
  }

  markTabPanelReady(tabId);

  // Critical: do NOT await. chrome.sidePanel.open() must be called inside the
  // synchronous onMessage call stack, otherwise Chrome considers the user
  // gesture expired and silently drops the call.
  chrome.storage.session
    .set({ [`sp_url_${tabId}`]: msg.url })
    .catch((err) => console.warn('[SideLinkPreview] storage.set:', err));

  chrome.sidePanel
    .setOptions({
      tabId,
      path: `sidepanel.html?tabId=${tabId}`,
      enabled: true,
    })
    .catch((err) => console.warn('[SideLinkPreview] setOptions:', err));

  chrome.sidePanel
    .open({ tabId, windowId })
    .then(() => sendResponse({ ok: true }))
    .catch((err) => {
      console.warn('[SideLinkPreview] open failed:', err);
      sendResponse({ ok: false, reason: String(err) });
    });

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session
    .remove([`sp_url_${tabId}`, panelReadyKey(tabId)])
    .catch(() => {});
});

// ---------- Auto-disable Side Panel on system + user-disabled hosts ----------
// Hide this extension's Side Panel on:
//   1. chrome://, chrome-extension://, devtools://, view-source:, about:
//      and similar internal pages
//   2. Any URL the user has disabled via Scope settings (in blacklist mode:
//      URLs in the list; in whitelist mode: URLs NOT in the list).
const SYSTEM_URL_RE =
  /^(chrome|chrome-extension|chrome-search|chrome-untrusted|edge|devtools|view-source|about):/i;

const isSystemUrl = (url) => !url || SYSTEM_URL_RE.test(url);

// Tiny in-memory cache to avoid hitting storage on every tab event. The
// service worker can be torn down at any time, in which case the cache
// rebuilds on first use — that's fine.
let cachedSettings = null;
let settingsCacheReady = false;

const publishSettingsSession = async (raw) => {
  try {
    const n = normalizeSlpSettings(raw);
    await chrome.storage.session.set({
      slpSettingsCache: { rev: n._rev || 0, settings: n },
    });
  } catch (_) {}
};

const getSettings = async () => {
  if (settingsCacheReady) return cachedSettings;
  try {
    const data = await chrome.storage.sync.get('slpSettings');
    cachedSettings = data.slpSettings || {};
    settingsCacheReady = true;
    await publishSettingsSession(cachedSettings);
  } catch (_) {
    // Don't cache failed reads as `{}` or we'd never retry until SW restart.
    settingsCacheReady = false;
    return {};
  }
  return cachedSettings;
};
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.slpSettings) {
    cachedSettings = changes.slpSettings.newValue || {};
    settingsCacheReady = true;
    publishSettingsSession(cachedSettings);
  }
});
getSettings();

const isUrlPanelDisabled = async (url) => {
  if (isSystemUrl(url)) return true;
  if (!isHttpUrl(url)) return true;
  if (isSensitivePreviewUrl(url)) return true;
  const settings = await getSettings();
  return isUrlDisabledByScope(url, settings);
};

const clearPreviewSession = (tabId) => {
  if (!tabId) return;
  chrome.storage.session
    .remove([`sp_url_${tabId}`, panelReadyKey(tabId)])
    .catch(() => {});
};

const requestSidePanelClose = (tabId) => {
  chrome.runtime
    .sendMessage({
      type: 'SLP_REQUEST_SIDE_PANEL_CLOSE',
      tabId,
    })
    .catch(() => {});
};

/** Close panel when the session preview URL matches Scope disable rules. */
const closePanelIfPreviewScopeDisabled = async (tabId) => {
  if (!tabId) return;
  try {
    const key = `sp_url_${tabId}`;
    const data = await chrome.storage.session.get(key);
    const previewUrl = data[key];
    if (!previewUrl || !isHttpUrl(previewUrl)) return;
    const settings = await getSettings();
    if (!isUrlDisabledByScope(previewUrl, settings)) return;
    clearPreviewSession(tabId);
    requestSidePanelClose(tabId);
  } catch (_) {}
};

const refreshSidePanelForTab = async (
  tabId,
  url,
  { fromNavigation = false } = {},
) => {
  if (!tabId) return;
  const disabled = await isUrlPanelDisabled(url);
  try {
    await chrome.sidePanel.setOptions({ tabId, enabled: !disabled });
  } catch (err) {
    console.warn('[SideLinkPreview] toggle panel:', err);
  }
  // Chrome has no sidePanel.close(). Ask the matching panel instance to
  // window.close() when:
  //   • the tab navigated (left page moved on — stale preview), or
  //   • this URL should not use the Side Panel (system / auth / scope).
  if (fromNavigation || disabled) {
    clearPreviewSession(tabId);
    requestSidePanelClose(tabId);
  }
};

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    refreshSidePanelForTab(tabId, tab.url || tab.pendingUrl);
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    refreshSidePanelForTab(tabId, changeInfo.url, { fromNavigation: true });
  } else if (changeInfo.status === 'loading' && tab?.pendingUrl) {
    refreshSidePanelForTab(tabId, tab.pendingUrl, { fromNavigation: true });
  }
});

// When the user edits the Scope list in options, re-evaluate the active tab
// in every window so a panel currently open on a freshly-blacklisted site
// disappears immediately, without waiting for a navigation.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes.slpSettings) return;
  const before = normalizeSlpSettings(changes.slpSettings.oldValue || {});
  const after = normalizeSlpSettings(changes.slpSettings.newValue || {});
  const listChanged =
    JSON.stringify(before.blacklist) !== JSON.stringify(after.blacklist) ||
    JSON.stringify(before.whitelist) !== JSON.stringify(after.whitelist);
  const modeChanged = before.mode !== after.mode;
  if (!listChanged && !modeChanged) return;

  const scopePatternsForList = (list) => {
    const patterns = [];
    for (const raw of list) {
      const { hostPattern } = parseScopePattern(raw);
      if (!hostPattern || hostPattern.includes('*')) continue;
      patterns.push(`*://${hostPattern}/*`, `*://*.${hostPattern}/*`);
    }
    return patterns;
  };

  const collectTabsForScopeRefresh = async () => {
    const tabIds = new Set();
    const [sessionAll, activeTabs] = await Promise.all([
      chrome.storage.session.get(null),
      chrome.tabs.query({ active: true }).catch(() => []),
    ]);
    for (const t of activeTabs) {
      if (t?.id) tabIds.add(t.id);
    }
    for (const key of Object.keys(sessionAll || {})) {
      const m = key.match(/^sp_(?:ready|url)_(\d+)$/);
      if (m) tabIds.add(Number(m[1]));
    }

    if (modeChanged) {
      const all = await chrome.tabs.query({}).catch(() => []);
      for (const t of all) {
        if (t?.id) tabIds.add(t.id);
      }
      return tabIds;
    }

    const urlPatterns = [
      ...new Set([
        ...scopePatternsForList(before.blacklist),
        ...scopePatternsForList(before.whitelist),
        ...scopePatternsForList(after.blacklist),
        ...scopePatternsForList(after.whitelist),
      ]),
    ];
    for (let i = 0; i < urlPatterns.length; i += 50) {
      const chunk = urlPatterns.slice(i, i + 50);
      const matched = await chrome.tabs.query({ url: chunk }).catch(() => []);
      for (const t of matched) {
        if (t?.id) tabIds.add(t.id);
      }
    }
    return tabIds;
  };

  const refreshTabsAfterScopeChange = async () => {
    const tabIds = await collectTabsForScopeRefresh();
    for (const id of tabIds) {
      try {
        const tab = await chrome.tabs.get(id);
        await refreshSidePanelForTab(id, tab.url || tab.pendingUrl);
        await closePanelIfPreviewScopeDisabled(id);
      } catch (_) {}
    }
  };

  refreshTabsAfterScopeChange().catch(() => {});
});
