const params = new URLSearchParams(location.search);
let tabId = Number(params.get('tabId')) || null;

const bar = document.querySelector('.bar');
const frame = document.getElementById('frame');
const addr = document.getElementById('addr');
const tip = document.getElementById('tip');
const tipUrlEl = document.getElementById('tip-url');
const tipOpenBtn = document.getElementById('tip-open');
const tipCopyBtn = document.getElementById('tip-copy');
const empty = document.getElementById('empty');
const goBtn = document.getElementById('go');
const settingsBtn = document.getElementById('settings');
const openSettingsBtn = document.getElementById('open-settings');
const scrollTopBtn = document.getElementById('scroll-top');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const refreshBtn = document.getElementById('refresh');
const loader = document.getElementById('loader');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLevelBtn = document.getElementById('zoom-level');

const showLoader = () => loader?.classList.add('show');
const hideLoader = () => loader?.classList.remove('show');

// Timeout after which we assume the iframe was rejected by the target site.
// content.js posts a LOADED ping as soon as it enters the iframe; if none
// arrives within this window we treat the load as blocked by XFO/CSP. The DNR
// rule only strips headers for requests this Side Panel itself initiated, but
// some cases still fail — e.g. the site uses JS to detect iframes, a child
// resource fails to load, or the page still refuses to render after header
// stripping.
const BLOCK_TIMEOUT_MS = 4000;
// Some failures are transient (network blip, DNR rule arriving slightly after
// the request, race between iframe creation and content script injection).
// Auto-retry once before bothering the user with the "Can't preview" tip.
const MAX_RETRIES = 1;

let loadToken = 0;
let blockTimer = null;
let currentUrl = '';
let retryAttempts = 0;

// In-panel navigation history. We keep a Chromium-style stack: every fresh
// load() (user typed a URL, clicked a link inside the iframe, or background
// pushed a new sp_url_${tabId}) trims the forward portion and appends. Back/
// forward buttons walk this stack without mutating it.
const HISTORY_LIMIT = 100;
const navHistory = [];
let historyIndex = -1;

const updateNavButtons = () => {
  if (!backBtn || !forwardBtn) return;
  const canBack = historyIndex > 0;
  const canForward = historyIndex >= 0 && historyIndex < navHistory.length - 1;
  const visible = canBack || canForward;
  backBtn.classList.toggle('show', visible);
  forwardBtn.classList.toggle('show', visible);
  backBtn.disabled = !canBack;
  forwardBtn.disabled = !canForward;
};

// The input itself is always visible. When it gains focus we add `.editing`
// to the bar so back/forward/refresh/settings hide and the input + Go button
// get the full width; on blur the rest of the chrome comes back. The input
// title attribute holds the full URL so a hover reveals it even when the
// rendered text is truncated by ellipsis.
const updateAddrTitle = () => {
  addr.title = currentUrl || '';
};

const updateRefreshButton = () => {
  if (refreshBtn) refreshBtn.disabled = !currentUrl;
};

const clearBlockTimer = () => {
  if (blockTimer) {
    clearTimeout(blockTimer);
    blockTimer = null;
  }
};

const hideTip = () => tip.classList.remove('show');

// ---------- per-site zoom ----------
// Visual scaling of the preview iframe via CSS transform. Layout-wise the
// iframe occupies 1/factor of its wrapper, but the GPU composites it back
// up to fill the wrapper, scaling the embedded cross-origin page along
// with it. transform-origin 0,0 keeps the top-left anchored.
//
// Triggered exclusively by the toolbar +/-/% buttons (no keyboard hooks),
// so the focus quirks of side-panel WebContents and cross-origin iframes
// don't apply: a button click delivers a real, deterministic event.
//
// Persisted per host in chrome.storage.local under `slpZoomMap`.
const ZOOM_LEVELS = [
  0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3,
];
const ZOOM_MAP_KEY = 'slpZoomMap';
let zoomMap = {};
let currentZoom = 1;
let zoomPersistTimer = null;

const hostFromUrl = (url) => {
  try {
    return new URL(url).hostname || '';
  } catch (_) {
    return '';
  }
};

const snapToLevel = (factor, dir) => {
  if (dir > 0) {
    return ZOOM_LEVELS.find((l) => l > factor + 0.001) ?? ZOOM_LEVELS.at(-1);
  }
  return (
    [...ZOOM_LEVELS].reverse().find((l) => l < factor - 0.001) ??
    ZOOM_LEVELS[0]
  );
};

const applyZoomTransform = (factor) => {
  if (!frame) return;
  if (Math.abs(factor - 1) < 0.001) {
    frame.style.transform = '';
    frame.style.transformOrigin = '';
    frame.style.width = '';
    frame.style.height = '';
    return;
  }
  const inv = 100 / factor;
  frame.style.transformOrigin = '0 0';
  frame.style.width = `${inv}%`;
  frame.style.height = `${inv}%`;
  frame.style.transform = `scale(${factor})`;
};

// Chrome-style transient indicator: the percent badge isn't pinned in the
// toolbar; instead it appears for a moment after a zoom change (or when the
// user hovers the +/- buttons) so the level is discoverable without taking
// permanent space.
const ZOOM_LABEL_TIMEOUT_MS = 1500;
let zoomLabelTimer = null;
const updateZoomLabelText = (factor) => {
  if (!zoomLevelBtn) return;
  zoomLevelBtn.textContent = `${Math.round(factor * 100)}%`;
};
const flashZoomLabel = () => {
  if (!zoomLevelBtn) return;
  zoomLevelBtn.classList.add('show');
  clearTimeout(zoomLabelTimer);
  zoomLabelTimer = setTimeout(() => {
    // Don't auto-hide while the user is hovering it (so reset stays clickable).
    if (zoomLevelBtn.matches(':hover')) return;
    zoomLevelBtn.classList.remove('show');
  }, ZOOM_LABEL_TIMEOUT_MS);
};
const hideZoomLabelSoon = () => {
  clearTimeout(zoomLabelTimer);
  zoomLabelTimer = setTimeout(() => {
    zoomLevelBtn?.classList.remove('show');
  }, 250);
};

const persistZoomForHost = (host, factor) => {
  if (!host) return;
  if (Math.abs(factor - 1) < 0.001) {
    delete zoomMap[host];
  } else {
    zoomMap[host] = factor;
  }
  // Debounce — rapid +/- clicks shouldn't spam storage writes.
  clearTimeout(zoomPersistTimer);
  zoomPersistTimer = setTimeout(() => {
    chrome.storage.local
      .set({ [ZOOM_MAP_KEY]: zoomMap })
      .catch((err) => console.warn('[SideLinkPreview] zoom persist:', err));
  }, 250);
};

const setZoom = (factor, { persist = true } = {}) => {
  const f = Math.min(3, Math.max(0.5, Number(factor) || 1));
  currentZoom = f;
  applyZoomTransform(f);
  updateZoomLabelText(f);
  // Explicit user action via toolbar → flash the badge.
  flashZoomLabel();
  if (persist) persistZoomForHost(hostFromUrl(currentUrl), f);
};

const applyZoomForUrl = (url) => {
  const host = hostFromUrl(url);
  const saved = host && zoomMap[host];
  const next = saved && Number.isFinite(saved) ? saved : 1;
  const changed = Math.abs(currentZoom - next) >= 0.001;
  currentZoom = next;
  applyZoomTransform(next);
  updateZoomLabelText(next);
  // Flash only when restoring a non-default level on a fresh navigation, so
  // the user is reminded that the page is rendered at a non-standard zoom.
  // Default 100% navigations stay silent.
  if (changed && Math.abs(next - 1) >= 0.001) flashZoomLabel();
};

const load = (url, { isRetry = false, fromHistory = false } = {}) => {
  if (!url) return;
  currentUrl = url;
  addr.value = url;
  updateAddrTitle();
  updateRefreshButton();
  // New page → reset back-to-top until content.js inside the new iframe
  // tells us the page is tall enough and scrolled enough.
  scrollTopBtn?.classList.remove('show');
  if (!isRetry) retryAttempts = 0;
  // Push to history only on genuine new navigations. Retries keep the same
  // entry; back/forward walks the existing stack.
  if (!isRetry && !fromHistory) {
    // Drop the forward stack — classic browser semantics.
    navHistory.length = historyIndex + 1;
    // Avoid pushing a duplicate of the entry we're currently on (e.g. NAVIGATE
    // ping echoing the same URL we just loaded).
    if (navHistory[historyIndex] !== url) {
      navHistory.push(url);
      if (navHistory.length > HISTORY_LIMIT) {
        const overflow = navHistory.length - HISTORY_LIMIT;
        navHistory.splice(0, overflow);
      }
      historyIndex = navHistory.length - 1;
    }
  }
  updateNavButtons();
  loadToken++;
  const myToken = loadToken;

  hideTip();
  empty.classList.add('hidden');
  frame.style.display = '';
  // Restore the user's saved per-site zoom for this host before painting,
  // so a previously zoomed page comes back at the same level on revisit.
  applyZoomForUrl(url);
  showLoader();
  // On retry the URL is identical, so a plain `frame.src = url` would be a
  // no-op. Bounce through about:blank to force a real fresh navigation.
  if (isRetry) frame.src = 'about:blank';
  frame.src = url;

  clearBlockTimer();
  blockTimer = setTimeout(() => {
    if (myToken !== loadToken) return; // Superseded by a newer load().
    handleLoadFailure();
  }, BLOCK_TIMEOUT_MS);
};

// Auto-retry once before showing the blocked-page tip. Many failures clear
// up on a second attempt (DNR rule warm-up, content script timing, transient
// network blip).
const handleLoadFailure = () => {
  if (retryAttempts < MAX_RETRIES && currentUrl) {
    retryAttempts++;
    load(currentUrl, { isRetry: true });
    return;
  }
  showBlockedTip();
};

const showBlockedTip = () => {
  hideLoader();
  frame.style.display = 'none';
  if (tipUrlEl) {
    tipUrlEl.textContent = currentUrl;
    tipUrlEl.title = currentUrl;
  }
  tip.classList.add('show');
};

frame.addEventListener('error', () => {
  clearBlockTimer();
  handleLoadFailure();
});

// Safety net for the visual loader: even if content.js inside the iframe
// fails to post LOADED (rare race during service-worker restarts or pages
// outside our match set), the iframe element itself fires `load` once the
// document is parsed. The block-timeout / retry pipeline still handles real
// failures separately.
frame.addEventListener('load', () => {
  hideLoader();
});

// Auto-prepend `https://` when the user types a bare host like
// `google.com`, mirroring how the Chrome omnibox handles input. We only do
// this when the input clearly looks like a host or URL path; bare strings
// without a dot get loaded as-is so the iframe surfaces the actual error
// instead of silently rewriting user input.
const normalizeUserInput = (raw) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) return trimmed;
  if (/^(?:about|chrome|chrome-extension|javascript|data|file|view-source):/i.test(trimmed)) {
    return trimmed;
  }
  // Heuristic: if it has a dot before the first slash, treat it as a URL.
  const firstSlash = trimmed.indexOf('/');
  const head = firstSlash === -1 ? trimmed : trimmed.slice(0, firstSlash);
  if (head.includes('.') || head === 'localhost') {
    return 'https://' + trimmed;
  }
  return trimmed;
};

goBtn.addEventListener('click', () => {
  load(normalizeUserInput(addr.value));
  addr.blur();
});
addr.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    load(normalizeUserInput(addr.value));
    addr.blur();
  } else if (e.key === 'Escape') {
    addr.value = currentUrl;
    addr.blur();
  }
});

// Focus → expand the input by hiding back/forward/refresh/settings (only Go
// stays so the user can submit). On focus we also select-all so typing
// replaces the URL the way browser omniboxes behave.
addr.addEventListener('focus', () => {
  bar?.classList.add('editing');
  // Defer the select() so it runs after the browser's own focus handling.
  requestAnimationFrame(() => addr.select());
});
// Blur → restore the original URL value (drop unsaved edits) and collapse
// back to the default chrome. Short delay so a click on Go can still fire.
addr.addEventListener('blur', () => {
  setTimeout(() => {
    if (document.activeElement === addr) return;
    addr.value = currentUrl;
    bar?.classList.remove('editing');
  }, 150);
});

backBtn?.addEventListener('click', () => {
  if (historyIndex <= 0) return;
  historyIndex--;
  load(navHistory[historyIndex], { fromHistory: true });
});
forwardBtn?.addEventListener('click', () => {
  if (historyIndex >= navHistory.length - 1) return;
  historyIndex++;
  load(navHistory[historyIndex], { fromHistory: true });
});
// Refresh = re-fetch the same URL. fromHistory:true keeps the history stack
// intact; isRetry:true forces an about:blank bounce so the iframe genuinely
// reloads instead of treating identical-src as a no-op. Reset retryAttempts
// first so the auto-retry-once safety net is fresh for this user-initiated
// reload.
refreshBtn?.addEventListener('click', () => {
  if (!currentUrl) return;
  retryAttempts = 0;
  load(currentUrl, { fromHistory: true, isRetry: true });
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

updateRefreshButton();

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
    hideLoader();
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

// Toolbar zoom controls. Click handlers are deterministic — they don't depend
// on keyboard focus reaching the panel, which is unreliable for side-panel
// WebContents and cross-origin iframes.
zoomOutBtn?.addEventListener('click', () => {
  setZoom(snapToLevel(currentZoom, -1));
});
zoomInBtn?.addEventListener('click', () => {
  setZoom(snapToLevel(currentZoom, +1));
});
zoomLevelBtn?.addEventListener('click', () => setZoom(1));

// Hover affordance: peek at the current zoom level by mousing over the +/-
// buttons or the badge itself, even when no recent change has happened.
[zoomInBtn, zoomOutBtn, zoomLevelBtn].forEach((btn) => {
  btn?.addEventListener('mouseenter', () => {
    updateZoomLabelText(currentZoom);
    zoomLevelBtn?.classList.add('show');
    clearTimeout(zoomLabelTimer);
  });
  btn?.addEventListener('mouseleave', hideZoomLabelSoon);
});

// Load the saved zoom map at boot. We don't gate panel rendering on this —
// if it resolves after the first load() call, applyZoomForUrl runs again on
// the next navigation and corrects the level.
chrome.storage.local
  .get(ZOOM_MAP_KEY)
  .then((data) => {
    if (data && data[ZOOM_MAP_KEY] && typeof data[ZOOM_MAP_KEY] === 'object') {
      zoomMap = data[ZOOM_MAP_KEY];
      if (currentUrl) applyZoomForUrl(currentUrl);
    }
  })
  .catch((err) => console.warn('[SideLinkPreview] zoom load:', err));

// Cross-panel sync: if another open panel changes the zoom for the same
// host, mirror it here so multi-window users don't see stale levels.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const change = changes[ZOOM_MAP_KEY];
  if (!change) return;
  zoomMap = change.newValue || {};
  if (currentUrl) applyZoomForUrl(currentUrl);
});
