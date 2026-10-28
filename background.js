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

// Own the toolbar click so open({ tabId }) runs. openPanelOnActionClick
// would open the manifest default panel, which is shared by every tab.
const disableActionPanelToggle = () => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((err) => console.warn('[SideLinkPreview] setPanelBehavior:', err));
};

chrome.runtime.onInstalled.addListener(() => {
  disableActionPanelToggle();
  ensureDnrRule();
  ensureContextMenu();
});
disableActionPanelToggle();

// Re-register on service-worker cold start too (onInstalled does not fire every time).
chrome.runtime.onStartup.addListener(() => {
  ensureDnrRule();
  ensureContextMenu();
});
ensureDnrRule();
ensureContextMenu();

const isHttpUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

const SYSTEM_URL_RE =
  /^(chrome|chrome-extension|chrome-search|chrome-untrusted|edge|devtools|view-source|about):/i;

const isSystemUrl = (url) => !url || SYSTEM_URL_RE.test(url);

/** System / non-http / sensitive URLs — not Scope (explicit opens may bypass Scope). */
const isSidePanelApiBlocked = (url) => {
  if (isSystemUrl(url)) return true;
  if (!isHttpUrl(url)) return true;
  if (isSensitivePreviewUrl(url)) return true;
  return false;
};

const panelPathForTab = (tabId) => `sidepanel.html?tabId=${tabId}`;

// The manifest default_path is one shared panel for the whole window.
// Leave it disabled so open({ tabId }) creates a separate instance per tab.
// Chrome then shows that instance only while its tab is active, and brings
// it back (with its page, history, and scroll) when the user returns.
const disableGlobalSidePanel = () =>
  chrome.sidePanel.setOptions({ enabled: false }).catch(() => {});

/** Preconfigure tab path + enabled so open() can run synchronously on user gesture. */
const preconfigureSidePanelTab = (tabId, url) => {
  if (!tabId) return Promise.resolve();
  if (isSidePanelApiBlocked(url)) {
    return chrome.sidePanel
      .setOptions({ tabId, enabled: false })
      .catch(() => {});
  }
  return chrome.sidePanel
    .setOptions({
      tabId,
      path: panelPathForTab(tabId),
      enabled: true,
    })
    .catch(() => {});
};

const preconfigureOpenTabs = () => {
  disableGlobalSidePanel()
    .then(() => chrome.tabs.query({}))
    .then((tabs) => {
      for (const tab of tabs) {
        if (tab?.id)
          preconfigureSidePanelTab(tab.id, tab.url || tab.pendingUrl);
      }
    })
    .catch(() => {});
};

preconfigureOpenTabs();

const panelReadyKey = (tabId) => `sp_ready_${tabId}`;
const scopeBypassKey = (tabId) => `sp_scope_bypass_${tabId}`;
const panelOpenKey = (tabId) => `sp_open_${tabId}`;
const panelViewKey = (tabId) => `sp_view_${tabId}`;

/** In-flight explicit opens (context menu / shortcut) — guards against tab-event races. */
const explicitOpenPending = new Set();

/** Latest tab switch. onClosed for a different tab just after this is the
 *  previous panel being hidden, not the user dismissing it. */
let lastActivation = { tabId: 0, at: 0 };

/** Mirrors sp_open_* so the toolbar click can toggle without awaiting storage.
 *  Rebuilt when the service worker starts. */
const panelsOpenInMemory = new Set();

const rememberOpenPanelsFromSession = () => {
  chrome.storage.session
    .get(null)
    .then((all) => {
      for (const key of Object.keys(all || {})) {
        const m = key.match(/^sp_open_(\d+)$/);
        if (m && all[key]) panelsOpenInMemory.add(Number(m[1]));
      }
    })
    .catch(() => {});
};

rememberOpenPanelsFromSession();

const markTabPanelReady = (tabId) => {
  if (!tabId) return;
  chrome.storage.session.set({ [panelReadyKey(tabId)]: true }).catch(() => {});
};

/** One-shot bypass of Scope disable (whitelist / blacklist) for explicit opens. */
const markScopeBypass = (tabId) => {
  if (!tabId) return;
  chrome.storage.session.set({ [scopeBypassKey(tabId)]: true }).catch(() => {});
};

const markPanelOpen = (tabId) => {
  if (!tabId) return;
  panelsOpenInMemory.add(tabId);
  chrome.storage.session.set({ [panelOpenKey(tabId)]: true }).catch(() => {});
};

const forgetPanelOpen = (tabId) => {
  if (!tabId) return;
  panelsOpenInMemory.delete(tabId);
  chrome.storage.session.remove(panelOpenKey(tabId)).catch(() => {});
};

const tabIdFromPanelPath = (path) => {
  if (typeof path !== 'string') return null;
  const q = path.indexOf('?');
  if (q < 0) return null;
  const id = Number(new URLSearchParams(path.slice(q + 1)).get('tabId'));
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Open this tab's own panel. windowId would attach the shared global panel
 *  and leave it up on every other tab. */
const openTabSidePanel = (tabId) => {
  if (!tabId) return;
  explicitOpenPending.add(tabId);
  markPanelOpen(tabId);
  chrome.sidePanel
    .open({ tabId })
    .catch((err) => {
      forgetPanelOpen(tabId);
      console.warn('[SideLinkPreview] sidePanel.open:', err);
    })
    .finally(() => {
      setTimeout(() => explicitOpenPending.delete(tabId), 800);
    });
};

const notifyPanelClose = (tabId, { force = false } = {}) => {
  chrome.runtime
    .sendMessage({
      type: 'SLP_REQUEST_SIDE_PANEL_CLOSE',
      tabId: force ? undefined : tabId,
      force: !!force,
    })
    .catch(() => {});
};

/** Close one tab's panel and forget that it was open. */
const closeTabPanel = async (tabId) => {
  if (!tabId) return;
  forgetPanelOpen(tabId);
  let tab = null;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (_) {}
  if (typeof chrome.sidePanel.close === 'function') {
    try {
      await chrome.sidePanel.close({ tabId });
      return;
    } catch (_) {}
    // Only the shared global panel is open. Closing it by window is safe
    // while this tab is the one on screen; a background tab must not dismiss
    // the panel the user is looking at.
    if (tab?.active && tab.windowId) {
      try {
        await chrome.sidePanel.close({ windowId: tab.windowId });
        return;
      } catch (_) {}
    }
  }
  notifyPanelClose(tabId, { force: !!tab?.active });
};

/** The active tab has no panel of its own. Dismiss a leftover global panel
 *  so another tab's preview is not left on screen. */
const hideSharedPanel = async (tab) => {
  if (tab?.windowId && typeof chrome.sidePanel.close === 'function') {
    await chrome.sidePanel.close({ windowId: tab.windowId }).catch(() => {});
    return;
  }
  if (!tab?.id) return;
  await chrome.sidePanel
    .setOptions({ tabId: tab.id, enabled: false })
    .catch(() => {});
};

const showTabView = (tabId) => {
  if (!tabId) return;
  chrome.runtime
    .sendMessage({ type: 'SLP_SHOW_TAB_VIEW', tabId })
    .catch(() => {});
};

const syncSidePanelWithActiveTab = async (tab) => {
  if (!tab?.id || explicitOpenPending.has(tab.id)) return;
  const url = tab.url || tab.pendingUrl;
  if (isSidePanelApiBlocked(url)) {
    await chrome.sidePanel
      .setOptions({ tabId: tab.id, enabled: false })
      .catch(() => {});
    await hideSharedPanel(tab);
    return;
  }
  let wants = false;
  try {
    const data = await chrome.storage.session.get(panelOpenKey(tab.id));
    wants = !!data[panelOpenKey(tab.id)];
  } catch (_) {}
  if (explicitOpenPending.has(tab.id)) return;
  if (wants) {
    // Tab-specific panels stay attached to their tab. Enabling the path is
    // enough for Chrome to show this tab's instance again, including its
    // page, history, and scroll. Do not call open() here — that needs a user
    // gesture and would reload the panel.
    await preconfigureSidePanelTab(tab.id, url);
    showTabView(tab.id);
    return;
  }
  // Invalidate the shared global view first, then hide it. Re-enable this
  // tab afterwards so the next click, shortcut, or toolbar press can open().
  await disableGlobalSidePanel();
  await chrome.sidePanel
    .setOptions({ tabId: tab.id, enabled: false })
    .catch(() => {});
  await hideSharedPanel(tab);
  await preconfigureSidePanelTab(tab.id, url);
  await disableGlobalSidePanel();
};

// Push a concrete URL into the current tab's Side Panel. Mirrors the open
// logic used in the onMessage branch below.
const openUrlInSidePanel = (url, tab) => {
  if (!isHttpUrl(url) || !tab?.id || !tab?.windowId) return;
  // Auth / SSO / payment / E2E-messaging destinations are unsafe to embed
  // even when the user explicitly chose "Open link in Side Panel" or
  // pressed the keyboard shortcut. Fall back to a real new tab.
  if (isSensitivePreviewUrl(url)) {
    chrome.tabs.create({ url, active: true }).catch((err) => {
      console.warn('[SideLinkPreview] sensitive-url fallback:', err);
    });
    return;
  }
  const tabId = tab.id;

  // open() must be the first Side Panel API call in the gesture stack.
  // setOptions is preconfigured on tab events and on contextmenu (content.js).
  openTabSidePanel(tabId);

  chrome.storage.session
    .set({
      [`sp_url_${tabId}`]: url,
      [panelReadyKey(tabId)]: true,
      [scopeBypassKey(tabId)]: true,
    })
    .catch((err) => console.warn('[SideLinkPreview] storage.set:', err));

  preconfigureSidePanelTab(tabId, tab.url || tab.pendingUrl || url);
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

// ---------- action.onClicked ----------
// Toolbar click toggles this tab's own panel. The default manifest panel is
// disabled so the click cannot fall through to a window-wide panel.
chrome.action?.onClicked.addListener((tab) => {
  if (!tab?.id || !tab?.windowId) return;
  // Side-panel iframe cannot embed chrome://, chrome-extension://,
  // devtools://, view-source:, about: etc. — opening the panel on those
  // tabs would just show the empty state. Stay out of the way; the panel
  // auto-disable in refreshSidePanelForTab() has already set enabled:false
  // for this tab, and we don't want to overrule that just because the user
  // happened to click the toolbar icon while parked on a system page.
  const url = tab.url || tab.pendingUrl;
  if (isSystemUrl(url) || isSensitivePreviewUrl(url)) return;
  if (panelsOpenInMemory.has(tab.id)) {
    closeTabPanel(tab.id);
    return;
  }
  try {
    if (isHttpUrl(url)) {
      chrome.storage.session.set({ [`sp_url_${tab.id}`]: url }).catch(() => {});
    }
    markTabPanelReady(tab.id);
    markScopeBypass(tab.id);
    openTabSidePanel(tab.id);
    preconfigureSidePanelTab(tab.id, url);
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
        .catch((err) => console.warn('[SideLinkPreview] tabs.create:', err));
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
        closeTabPanel(tabId);
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.warn('[SideLinkPreview] OPEN_IN_MAIN_TAB:', err);
        sendResponse({ ok: false, reason: String(err) });
      });
    return true;
  }

  if (msg?.type === 'PREPARE_SIDE_PANEL') {
    const tabId = sender.tab?.id;
    const url = sender.tab?.url || sender.tab?.pendingUrl;
    if (!tabId) {
      sendResponse({ ok: true });
      return;
    }
    preconfigureSidePanelTab(tabId, url).then(() => sendResponse({ ok: true }));
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
  openTabSidePanel(tabId);
  sendResponse({ ok: true });

  chrome.storage.session
    .set({ [`sp_url_${tabId}`]: msg.url })
    .catch((err) => console.warn('[SideLinkPreview] storage.set:', err));

  preconfigureSidePanelTab(tabId, sender.tab?.url || msg.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  explicitOpenPending.delete(tabId);
  chrome.storage.session
    .remove([
      `sp_url_${tabId}`,
      panelReadyKey(tabId),
      scopeBypassKey(tabId),
      panelOpenKey(tabId),
      panelViewKey(tabId),
    ])
    .catch(() => {});
});

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

const clearPreviewSession = (tabId) => {
  if (!tabId) return;
  chrome.storage.session
    .remove([
      `sp_url_${tabId}`,
      panelReadyKey(tabId),
      scopeBypassKey(tabId),
      panelOpenKey(tabId),
      panelViewKey(tabId),
    ])
    .catch(() => {});
};

/** New tabs never inherit a Side Panel preview from other tabs. */
const initSidePanelForNewTab = (tab) => {
  if (!tab?.id) return;
  clearPreviewSession(tab.id);
  preconfigureSidePanelTab(tab.id, tab.url || tab.pendingUrl);
  if (tab.active) hideSharedPanel(tab);
};

/** Close panel when the session preview URL matches Scope disable rules. */
const closePanelIfPreviewScopeDisabled = async (tabId) => {
  if (!tabId) return;
  try {
    const urlKey = `sp_url_${tabId}`;
    const bypassKey = scopeBypassKey(tabId);
    const data = await chrome.storage.session.get([urlKey, bypassKey]);
    if (data[bypassKey]) return;
    const previewUrl = data[urlKey];
    if (!previewUrl || !isHttpUrl(previewUrl)) return;
    const settings = await getSettings();
    if (!isUrlDisabledByScope(previewUrl, settings)) return;
    clearPreviewSession(tabId);
    await closeTabPanel(tabId);
  } catch (_) {}
};

const refreshSidePanelForTab = async (
  tabId,
  url,
  { fromNavigation = false, configure = true } = {},
) => {
  if (!tabId) return;
  if (explicitOpenPending.has(tabId)) return;
  if (fromNavigation) {
    chrome.storage.session.remove(scopeBypassKey(tabId)).catch(() => {});
  }
  let scopeBypass = false;
  if (!fromNavigation) {
    try {
      const data = await chrome.storage.session.get(scopeBypassKey(tabId));
      scopeBypass = !!data[scopeBypassKey(tabId)];
    } catch (_) {}
  }

  if (configure) await preconfigureSidePanelTab(tabId, url);

  let scopeDisabled = false;
  if (!scopeBypass && !isSidePanelApiBlocked(url)) {
    const settings = await getSettings();
    scopeDisabled = isUrlDisabledByScope(url, settings);
  }

  // Drop this tab's preview when the left page navigates, or when Scope
  // disables automatic preview on this host (unless bypassed).
  if (fromNavigation || scopeDisabled) {
    clearPreviewSession(tabId);
    await closeTabPanel(tabId);
  }
};

chrome.tabs.onCreated.addListener((tab) => {
  initSidePanelForNewTab(tab);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  lastActivation = { tabId, at: Date.now() };
  if (explicitOpenPending.has(tabId)) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    await refreshSidePanelForTab(tabId, tab.url || tab.pendingUrl, {
      configure: false,
    });
    if (explicitOpenPending.has(tabId)) return;
    await syncSidePanelWithActiveTab(tab);
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
      const m = key.match(/^sp_(?:ready|url|open)_(\d+)$/);
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

if (chrome.sidePanel.onOpened) {
  chrome.sidePanel.onOpened.addListener((info) => {
    const id = info?.tabId || tabIdFromPanelPath(info?.path);
    if (id) markPanelOpen(id);
  });
}

if (chrome.sidePanel.onClosed) {
  chrome.sidePanel.onClosed.addListener(async (info) => {
    const id = info?.tabId || tabIdFromPanelPath(info?.path);
    if (!id || explicitOpenPending.has(id)) return;
    // Switching tabs hides the previous panel. That is not a dismiss —
    // keep the flag so the panel comes back with that tab.
    if (id !== lastActivation.tabId && Date.now() - lastActivation.at < 1000) {
      return;
    }
    try {
      const tab = await chrome.tabs.get(id);
      if (!tab.active) return;
    } catch (_) {
      return;
    }
    forgetPanelOpen(id);
  });
}
