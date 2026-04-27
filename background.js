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
const SUPPORTED_LOCALES = ['en', 'zh', 'fr', 'es', 'de', 'pt'];

const pickLocale = (saved) => {
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  // navigator.languages isn't available inside a service worker; chrome.i18n
  // gives us a reasonable default. Fall back to English on any failure.
  try {
    const lang = (chrome.i18n.getUILanguage() || 'en').toLowerCase();
    const base = lang.split('-')[0];
    if (SUPPORTED_LOCALES.includes(base)) return base;
  } catch (_) {}
  return 'en';
};

const getContextMenuTitle = async () => {
  let locale = 'en';
  try {
    const data = await chrome.storage.sync.get('slpSettings');
    locale = pickLocale(data?.slpSettings?.locale);
  } catch (_) {
    locale = pickLocale(null);
  }
  try {
    const res = await fetch(chrome.runtime.getURL(`locales/${locale}.json`));
    const dict = await res.json();
    return dict.context_menu_open_in_side_panel || 'Open link in Side Panel';
  } catch (_) {
    return 'Open link in Side Panel';
  }
};

const ensureContextMenu = async () => {
  try {
    const title = await getContextMenuTitle();
    chrome.contextMenus.removeAll(() => {
      // Swallow any lastError from removeAll itself.
      void chrome.runtime.lastError;
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_ID,
          title,
          contexts: ['link'],
        },
        () => {
          // Duplicate-id races can happen when onInstalled + onStartup +
          // top-level ensure all fire in close succession. Ignore.
          void chrome.runtime.lastError;
        },
      );
    });
  } catch (err) {
    console.warn('[SideLinkPreview] contextMenu register failed:', err);
  }
};

// Refresh the context-menu label when the user switches UI language.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!changes.slpSettings) return;
  const before = changes.slpSettings.oldValue?.locale;
  const after = changes.slpSettings.newValue?.locale;
  if (before !== after) ensureContextMenu();
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

// Push a concrete URL into the current tab's Side Panel. Mirrors the open
// logic used in the onMessage branch below.
const openUrlInSidePanel = async (url, tab) => {
  if (!isHttpUrl(url) || !tab?.id || !tab?.windowId) return;
  const tabId = tab.id;
  const windowId = tab.windowId;
  try {
    await chrome.storage.session.set({ [`sp_url_${tabId}`]: url });
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
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const url = info.linkUrl || info.pageUrl;
  openUrlInSidePanel(url, tab);
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
  try {
    // Re-enable in case our blacklist auto-disable closed the panel for this
    // tab. Toolbar click is an explicit user gesture, so honor it even on
    // user-disabled hosts.
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: `sidepanel.html?tabId=${tab.id}`,
      enabled: true,
    });
    await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
  } catch (err) {
    console.warn('[SideLinkPreview] action.onClicked:', err);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'OPEN_IN_SIDE_PANEL') return;

  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (!tabId || !windowId) {
    sendResponse({ ok: false, reason: 'no tab context' });
    return;
  }

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

  // Hover isn't a user gesture, so Chrome rejects sidePanel.open(). Only
  // update storage here; if the Side Panel is already open, sidepanel.js
  // watches storage and will navigate to the new URL automatically.
  if (msg.trigger === 'hover') {
    sendResponse({ ok: true, hover: true });
    return;
  }

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
  chrome.storage.session.remove(`sp_url_${tabId}`).catch(() => {});
});

// ---------- Auto-disable Side Panel on system + user-disabled hosts ----------
// Hide this extension's Side Panel on:
//   1. chrome://, chrome-extension://, devtools://, view-source:, about:
//      and similar internal pages
//   2. Any host the user has disabled via Scope settings (in blacklist mode:
//      hosts in the list; in whitelist mode: hosts NOT in the list).
const SYSTEM_URL_RE =
  /^(chrome|chrome-extension|chrome-search|chrome-untrusted|edge|devtools|view-source|about):/i;

const isSystemUrl = (url) => !url || SYSTEM_URL_RE.test(url);

// Mirrors content.js's matchDomain — exact host, subdomain (`.example.com`),
// or `*`-wildcard pattern.
const matchDomainBg = (host, pattern) => {
  if (!pattern) return false;
  const p = String(pattern).toLowerCase();
  if (p.includes('*')) {
    const re = new RegExp(
      '^' +
        p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
        '$',
    );
    return re.test(host);
  }
  return host === p || host.endsWith('.' + p);
};

const isHostDisabledBySettings = (host, settings) => {
  if (!host) return false;
  const list = Array.isArray(settings?.list) ? settings.list : [];
  const listed = list.some((p) => matchDomainBg(host, p));
  if (settings?.mode === 'whitelist') return !listed;
  return listed;
};

// Tiny in-memory cache to avoid hitting storage on every tab event. The
// service worker can be torn down at any time, in which case the cache
// rebuilds on first use — that's fine.
let cachedSettings = null;
const getSettings = async () => {
  if (cachedSettings) return cachedSettings;
  try {
    const data = await chrome.storage.sync.get('slpSettings');
    cachedSettings = data.slpSettings || {};
  } catch (_) {
    cachedSettings = {};
  }
  return cachedSettings;
};
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.slpSettings) {
    cachedSettings = changes.slpSettings.newValue || {};
  }
});

const isUrlPanelDisabled = async (url) => {
  if (isSystemUrl(url)) return true;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (_) {
    return false;
  }
  const settings = await getSettings();
  return isHostDisabledBySettings(host, settings);
};

const refreshSidePanelForTab = async (tabId, url) => {
  if (!tabId) return;
  const disabled = await isUrlPanelDisabled(url);
  try {
    await chrome.sidePanel.setOptions({ tabId, enabled: !disabled });
  } catch (err) {
    console.warn('[SideLinkPreview] toggle panel:', err);
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
    refreshSidePanelForTab(tabId, changeInfo.url);
  } else if (changeInfo.status === 'loading' && tab?.pendingUrl) {
    refreshSidePanelForTab(tabId, tab.pendingUrl);
  }
});

// When the user edits the Scope list in options, re-evaluate the active tab
// in every window so a panel currently open on a freshly-blacklisted site
// disappears immediately, without waiting for a navigation.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes.slpSettings) return;
  const before = changes.slpSettings.oldValue || {};
  const after = changes.slpSettings.newValue || {};
  const listChanged =
    JSON.stringify(before.list || []) !== JSON.stringify(after.list || []);
  const modeChanged = before.mode !== after.mode;
  if (!listChanged && !modeChanged) return;

  chrome.tabs
    .query({})
    .then((tabs) => {
      for (const t of tabs) {
        if (!t.id) continue;
        refreshSidePanelForTab(t.id, t.url || t.pendingUrl);
      }
    })
    .catch(() => {});
});
