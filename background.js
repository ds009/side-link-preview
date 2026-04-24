const DNR_RULE_ID = 1;

// 只对 Side Panel（扩展自身）里发起的 iframe 请求抹掉 X-Frame-Options / CSP。
// 这样普通浏览任何网站时，原站的安全策略完全不受影响。
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[SideLinkPreview] setPanelBehavior:', err));
  ensureDnrRule();
});

// service worker 冷启动时也要注册一次（onInstalled 不会每次触发）
chrome.runtime.onStartup.addListener(() => {
  ensureDnrRule();
});
ensureDnrRule();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'OPEN_IN_SIDE_PANEL') return;

  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (!tabId || !windowId) {
    sendResponse({ ok: false, reason: 'no tab context' });
    return;
  }

  // 关键：不能 await。chrome.sidePanel.open() 必须在 onMessage 回调的
  // 同步调用栈里触发，否则 Chrome 会判定用户手势已过期而静默失败。
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

  // Hover 触发不是用户手势，sidePanel.open() 会被 Chrome 拒绝。此时仅更新
  // storage；若 Side Panel 已处于打开状态，sidepanel.js 监听 storage 变化
  // 会自动刷新为新 URL。
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

// ---------- 系统页面禁用 Side Panel ----------
// chrome://、chrome-extension://、devtools://、view-source:、about: 等页面上
// 隐藏本扩展的 Side Panel，避免从普通 tab 切过去时仍然残留着。
const SYSTEM_URL_RE =
  /^(chrome|chrome-extension|chrome-search|chrome-untrusted|edge|devtools|view-source|about):/i;

const isSystemUrl = (url) => !url || SYSTEM_URL_RE.test(url);

const toggleSidePanelForTab = (tabId, url) => {
  if (!tabId) return;
  chrome.sidePanel
    .setOptions({ tabId, enabled: !isSystemUrl(url) })
    .catch((err) => console.warn('[SideLinkPreview] toggle panel:', err));
};

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    toggleSidePanelForTab(tabId, tab.url || tab.pendingUrl);
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    toggleSidePanelForTab(tabId, changeInfo.url);
  } else if (changeInfo.status === 'loading' && tab?.pendingUrl) {
    toggleSidePanelForTab(tabId, tab.pendingUrl);
  }
});
