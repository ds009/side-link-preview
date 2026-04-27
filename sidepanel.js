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
const blockBtn = document.getElementById('block');
const settingsBtn = document.getElementById('settings');
const openSettingsBtn = document.getElementById('open-settings');
const scrollTopBtn = document.getElementById('scroll-top');

// Timeout after which we assume the iframe was rejected by the target site.
// content.js posts a LOADED ping as soon as it enters the iframe; if none
// arrives within this window we treat the load as blocked by XFO/CSP. The DNR
// rule only strips headers for requests this Side Panel itself initiated, but
// some cases still fail — e.g. the site uses JS to detect iframes, a child
// resource fails to load, or the page still refuses to render after header
// stripping.
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
  if (blockBtn) blockBtn.disabled = false;
  // New page → reset back-to-top until content.js inside the new iframe
  // tells us the page is tall enough and scrolled enough.
  scrollTopBtn?.classList.remove('show');
  loadToken++;
  const myToken = loadToken;

  hideTip();
  empty.classList.add('hidden');
  frame.style.display = '';
  frame.src = url;

  clearBlockTimer();
  blockTimer = setTimeout(() => {
    if (myToken !== loadToken) return; // Superseded by a newer load().
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

// Used by the "Open in new tab" button inside the blocked-page tip.
const openInNewTab = () => {
  if (currentUrl) chrome.tabs.create({ url: currentUrl });
};
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

// "Disable on this site" — adds the current host to the blacklist (or removes
// it from the whitelist), then closes the Side Panel. The user can always
// undo this from the options page.
const blockCurrentSite = async () => {
  if (!currentUrl) return;
  let host;
  try {
    host = new URL(currentUrl).hostname.toLowerCase();
  } catch (_) {
    return;
  }
  if (!host) return;

  try {
    const data = await chrome.storage.sync.get('slpSettings');
    const cur = data.slpSettings || {};
    const mode = cur.mode === 'whitelist' ? 'whitelist' : 'blacklist';
    let list = Array.isArray(cur.list) ? cur.list.map((p) => String(p)) : [];

    if (mode === 'whitelist') {
      // Whitelist mode: remove the host so this site stops triggering.
      list = list.filter((p) => p.toLowerCase() !== host);
    } else if (!list.some((p) => p.toLowerCase() === host)) {
      // Blacklist mode: append the host if it isn't already in the list.
      list.push(host);
    }

    await chrome.storage.sync.set({
      slpSettings: { ...cur, mode, list },
    });
  } catch (err) {
    console.warn('[SideLinkPreview] block-site failed:', err);
    return;
  }

  // Reload the parent tab so the new rule applies cleanly: any pending hover
  // timers in content.js are cancelled, link handlers re-bind under the new
  // settings, and the user sees the page in its native (non-intercepted)
  // state immediately.
  const id = await resolveTabId();
  if (id) {
    try {
      await chrome.tabs.reload(id);
    } catch (err) {
      console.warn('[SideLinkPreview] tabs.reload failed:', err);
    }
  }

  // Close the Side Panel. Prefer the explicit API on Chrome 124+; fall back
  // to window.close() on older versions still inside our supported range.
  // Note: this must come AFTER tabs.reload, because window.close() destroys
  // this script's execution context.
  try {
    if (
      id &&
      chrome.sidePanel &&
      typeof chrome.sidePanel.close === 'function'
    ) {
      chrome.sidePanel.close({ tabId: id });
      return;
    }
  } catch (_) {}
  try {
    window.close();
  } catch (_) {}
};

blockBtn?.addEventListener('click', blockCurrentSite);

// If background opens the panel before setOptions takes effect, the URL may
// not carry a tabId. Fall back to querying the currently active tab.
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

// Listen for messages posted by content.js running inside the Side Panel's
// iframe (and any nested iframes). Accept only messages whose source belongs
// to our own frame tree, so third-party scripts can't forge a NAVIGATE event
// and redirect the panel to an arbitrary URL. Cross-origin Window objects
// still expose `.top` as a readable structural property — if source.top
// equals this sidepanel's window, we consider the origin trusted.
const isFromOurFrameTree = (source) => {
  if (!source || source === window) return false;
  try {
    return source.top === window;
  } catch (_) {
    return false;
  }
};

const isSafeUrl = (url) =>
  typeof url === 'string' && /^https?:\/\//i.test(url);

window.addEventListener('message', (e) => {
  if (!isFromOurFrameTree(e.source)) return;
  const data = e.data;
  if (!data || data.__slp !== 1) return;

  if (data.type === 'LOADED') {
    clearBlockTimer();
    return;
  }

  if (data.type === 'NAVIGATE' && isSafeUrl(data.url)) {
    if (data.url !== currentUrl) load(data.url);
    return;
  }

  if (data.type === 'SCROLL_STATE' && scrollTopBtn) {
    // Only react to scroll state from the iframe's top-level document, not
    // from a nested frame that might also have its own scroll.
    if (e.source !== frame.contentWindow) return;
    scrollTopBtn.classList.toggle('show', !!data.show);
  }
});

// Click → ask the iframe's top-level document (where content.js listens) to
// smooth-scroll to the top. Cross-origin postMessage is allowed by browsers.
scrollTopBtn?.addEventListener('click', () => {
  try {
    frame.contentWindow?.postMessage(
      { __slp: 1, type: 'SCROLL_TOP' },
      '*',
    );
  } catch (err) {
    console.warn('[SideLinkPreview] postMessage SCROLL_TOP:', err);
  }
});
