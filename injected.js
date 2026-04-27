// Runs in the page's MAIN world.
// - On regular pages: hijack window.open so outgoing links go through the Side Panel.
// - Inside Side Panel iframes: additionally suppress frame-busting and keep
//   window.open calls inside the panel instead of popping real windows.
(() => {
  // Use Symbol.for as a one-shot init marker so pages can't probe for a
  // predictable string key on window.
  const INIT_KEY = Symbol.for('__slp_inited__');
  if (window[INIT_KEY]) return;
  try {
    Object.defineProperty(window, INIT_KEY, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  } catch (_) {
    window[INIT_KEY] = true;
  }

  // Detect whether any ancestor frame belongs to our extension origin
  // (i.e. we're inside the Side Panel).
  let inExtFrame = false;
  try {
    const ancestors = window.location.ancestorOrigins;
    if (ancestors) {
      for (let i = 0; i < ancestors.length; i++) {
        if (ancestors[i].startsWith('chrome-extension://')) {
          inExtFrame = true;
          break;
        }
      }
    }
  } catch (_) {}

  // A. Side Panel iframe: suppress frame-busting by spoofing top/parent to self.
  if (inExtFrame) {
    const selfWin = window.self;
    try {
      Object.defineProperty(window, 'top', {
        configurable: true,
        get() {
          return selfWin;
        },
      });
    } catch (_) {}
    try {
      Object.defineProperty(window, 'parent', {
        configurable: true,
        get() {
          return selfWin;
        },
      });
    } catch (_) {}
    try {
      Object.defineProperty(window, 'frameElement', {
        configurable: true,
        get() {
          return null;
        },
      });
    } catch (_) {}
  }

  // Short-lived "let window.open run normally" flag. content.js fires
  // __SLP_BYPASS__ when the user just modifier-clicked a link, so JS-driven
  // window.open() calls within that gesture are honored as the user intended
  // (new tab / window) instead of being redirected into the Side Panel.
  let bypassUntil = 0;
  window.addEventListener('__SLP_BYPASS__', (e) => {
    const ms = Number(e?.detail?.ms) || 400;
    bypassUntil = Date.now() + ms;
  });

  // Persistent "this host is on the user's disable list" flag, pushed by
  // content.js after it loads slpSettings (and on every settings change).
  // While true, window.open keeps its native semantics — the extension is a
  // no-op on this page and the page's own popup logic must not be broken.
  // Ignored inside the Side Panel itself, where hijacking is required.
  let hostDisabled = false;
  window.addEventListener('__SLP_HOST_STATE__', (e) => {
    hostDisabled = !!e?.detail?.disabled;
  });

  // B. Hijack window.open in both contexts.
  const origOpen = window.open;
  const fakeWin = () => ({
    closed: false,
    focus() {},
    blur() {},
    close() {
      this.closed = true;
    },
    postMessage() {},
    location: { href: '' },
  });

  // OAuth / SSO / share popups typically pass explicit size or position
  // features (e.g. `window.open(url, 'oauth', 'width=500,height=600,left=..,top=..')`).
  // Those need a real popup window and must NOT be redirected into the Side Panel.
  const looksLikePopupWindow = (features) => {
    if (typeof features !== 'string' || !features) return false;
    return /\b(width|height|left|top|popup)\s*=/i.test(features);
  };

  // Only take over calls whose semantics are truly "open a new tab/window":
  //   - no target, or target is _blank / _new.
  // Named targets (iframe names, site-internal reused window names) are left
  // alone.
  const looksLikeBlankTarget = (target) => {
    if (target == null || target === '') return true;
    const t = String(target).toLowerCase();
    return t === '_blank' || t === '_new';
  };

  window.open = function (url, target, features) {
    try {
      // Host is on the user's disable list and we're NOT inside the Side
      // Panel iframe — be inert. Never replace the real popup with a fake
      // stub on disabled pages.
      if (hostDisabled && !inExtFrame) {
        return origOpen.apply(this, arguments);
      }
      // User just modifier-clicked a link — let window.open behave normally
      // so the browser's native modifier semantics still apply.
      if (Date.now() < bypassUntil) {
        return origOpen.apply(this, arguments);
      }
      if (
        typeof url === 'string' &&
        /^https?:/i.test(url) &&
        looksLikeBlankTarget(target) &&
        !looksLikePopupWindow(features)
      ) {
        window.dispatchEvent(
          new CustomEvent('__SLP_OPEN__', { detail: { url } }),
        );
        return fakeWin();
      }
    } catch (_) {
      // Fall through to the original implementation.
    }
    return origOpen.apply(this, arguments);
  };
})();
