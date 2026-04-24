const params = new URLSearchParams(location.search);
let tabId = Number(params.get('tabId')) || null;

const frame = document.getElementById('frame');
const addr = document.getElementById('addr');
const tip = document.getElementById('tip');
const tipUrlEl = document.getElementById('tip-url');
const tipOpenBtn = document.getElementById('tip-open');
const tipCopyBtn = document.getElementById('tip-copy');
const empty = document.getElementById('empty');
const goBtn = document.getElementById('go');
const popBtn = document.getElementById('pop');
const settingsBtn = document.getElementById('settings');
const openSettingsBtn = document.getElementById('open-settings');

// 判定 iframe 是否被目标站拒绝加载的超时时间。
// content.js 在成功进入 iframe 后会立刻 postMessage 一次 LOADED ping；
// 在这个时间内没收到就视为被 XFO/CSP 拦掉（我们只对 Side Panel 自身发起的
// 请求剥 XFO/CSP 头，但部分场景仍会失败，例如站点用 JS 检测 iframe、
// 子资源加载失败、或被剥头后仍无法渲染）。
const BLOCK_TIMEOUT_MS = 4000;

let loadToken = 0;
let blockTimer = null;
let currentUrl = '';

const clearBlockTimer = () => {
  if (blockTimer) {
    clearTimeout(blockTimer);
    blockTimer = null;
  }
};

const hideTip = () => tip.classList.remove('show');

const load = (url) => {
  if (!url) return;
  currentUrl = url;
  addr.value = url;
  loadToken++;
  const myToken = loadToken;

  hideTip();
  empty.classList.add('hidden');
  frame.style.display = '';
  frame.src = url;

  clearBlockTimer();
  blockTimer = setTimeout(() => {
    if (myToken !== loadToken) return; // 已被更新的 load 取代
    showBlockedTip();
  }, BLOCK_TIMEOUT_MS);
};

const showBlockedTip = () => {
  frame.style.display = 'none';
  if (tipUrlEl) {
    tipUrlEl.textContent = currentUrl;
    tipUrlEl.title = currentUrl;
  }
  tip.classList.add('show');
};

frame.addEventListener('error', () => {
  clearBlockTimer();
  showBlockedTip();
});

goBtn.addEventListener('click', () => load(addr.value.trim()));
addr.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') load(addr.value.trim());
});

const openInNewTab = () => {
  if (currentUrl) chrome.tabs.create({ url: currentUrl });
};
popBtn.addEventListener('click', openInNewTab);
tipOpenBtn?.addEventListener('click', openInNewTab);

let copyTimer = null;
tipCopyBtn?.addEventListener('click', async () => {
  if (!currentUrl) return;
  try {
    await navigator.clipboard.writeText(currentUrl);
    const orig =
      tipCopyBtn.dataset.origLabel ||
      tipCopyBtn.textContent ||
      'Copy link';
    tipCopyBtn.dataset.origLabel = orig;
    tipCopyBtn.classList.add('copied');
    tipCopyBtn.textContent =
      (window.SLP_I18N && window.SLP_I18N.t
        ? window.SLP_I18N.t('sidepanel_blocked_copied', 'Copied')
        : 'Copied') || 'Copied';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      tipCopyBtn.classList.remove('copied');
      tipCopyBtn.textContent = orig;
    }, 1500);
  } catch (err) {
    console.warn('[SideLinkPreview] clipboard write failed:', err);
  }
});

const openOptions = () => {
  try {
    chrome.runtime.openOptionsPage();
  } catch (err) {
    console.warn('[SideLinkPreview] openOptionsPage:', err);
  }
};

settingsBtn?.addEventListener('click', openOptions);
openSettingsBtn?.addEventListener('click', openOptions);

// 如果 background 调 setOptions 还没生效就 open 了，URL 里会缺 tabId，
// 这里兜底去查当前 active tab。
const resolveTabId = async () => {
  if (tabId) return tabId;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tab?.id) tabId = tab.id;
  } catch (err) {
    console.warn('[SideLinkPreview] tabs.query:', err);
  }
  return tabId;
};

const readInitialUrl = async () => {
  const id = await resolveTabId();
  if (!id) return;
  const key = `sp_url_${id}`;
  const data = await chrome.storage.session.get(key);
  if (data[key]) load(data[key]);
};

readInitialUrl();

chrome.storage.session.onChanged.addListener(async (changes) => {
  const id = await resolveTabId();
  if (!id) return;
  const key = `sp_url_${id}`;
  const change = changes[key];
  if (change?.newValue && change.newValue !== currentUrl) {
    load(change.newValue);
  }
});

// 监听 Side Panel 内 iframe（以及嵌套 iframe）里 content.js 发来的消息。
window.addEventListener('message', (e) => {
  const data = e.data;
  if (!data || data.__slp !== 1) return;

  if (data.type === 'LOADED') {
    // 目标站已成功执行到我们的 content.js，说明没被 XFO/CSP 拦掉，
    // 取消"疑似被拦截"的定时器。
    clearBlockTimer();
    return;
  }

  if (data.type === 'NAVIGATE' && typeof data.url === 'string') {
    if (data.url !== currentUrl) load(data.url);
  }
});
