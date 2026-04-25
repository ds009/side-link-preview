(() => {
  const DEFAULTS = {
    mode: 'blacklist',
    list: [],
    hoverEnabled: false,
    hoverDelay: 500,
    linkScope: 'blank-only',
    locale: 'en',
  };

  // Detect whether this frame is embedded inside the extension's Side Panel.
  // content.js runs in the ISOLATED world, so the window.top / parent values
  // read here are not polluted by injected.js's MAIN-world spoofing of
  // window.top.
  const inSidePanel = (() => {
    try {
      const ancestors = location.ancestorOrigins;
      if (!ancestors) return false;
      for (let i = 0; i < ancestors.length; i++) {
        if (ancestors[i].startsWith('chrome-extension://')) return true;
      }
    } catch (_) {}
    return false;
  })();

  // Send a "loaded" ping up to the Side Panel's top frame. Just reaching this
  // line proves the site wasn't blocked by XFO/CSP, so sidepanel.js can cancel
  // its "probably blocked" timeout banner.
  if (inSidePanel) {
    try {
      window.top.postMessage(
        { __slp: 1, type: 'LOADED', url: location.href },
        '*',
      );
    } catch (_) {}
  }

  let settings = { ...DEFAULTS };

  const applySettings = (raw) => {
    settings = { ...DEFAULTS, ...(raw || {}) };
    if (!Array.isArray(settings.list)) settings.list = [];
    // Back-compat: older schemas used `trigger: 'click' | 'hover'`; newer
    // schemas use `hoverEnabled`.
    if (raw && raw.hoverEnabled === undefined && raw.trigger === 'hover') {
      settings.hoverEnabled = true;
    }
  };

  chrome.storage.sync
    .get('slpSettings')
    .then((data) => applySettings(data.slpSettings))
    .catch(() => {});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.slpSettings) applySettings(changes.slpSettings.newValue);
  });

  // Domain matching rules:
  // - Exact host match, or subdomain match (example.com matches
  //   www.example.com / blog.example.com).
  // - * wildcard supported (e.g. *example* matches any host containing
  //   "example").
  const matchDomain = (host, pattern) => {
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

  const isEnabledForHost = () => {
    const host = location.hostname.toLowerCase();
    const listed = settings.list.some((p) => matchDomain(host, p));
    if (settings.mode === 'whitelist') return listed;
    return !listed;
  };

  const shouldIntercept = (a) => {
    if (!a || a.tagName !== 'A') return false;
    if (!a.href || a.href.startsWith('javascript:')) return false;
    if (!/^https?:/i.test(a.href)) return false;
    // Inside the Side Panel: intercept every link so navigation stays in place.
    if (inSidePanel) return true;
    if (settings.linkScope === 'blank-only' && a.target !== '_blank')
      return false;
    return true;
  };

  const hasModifier = (e) =>
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

  // Map modifier combo to an explicit action so each modifier yields a
  // distinct, predictable result instead of all being collapsed into
  // "browser default for target=_blank" (which is just "new tab").
  //
  //   no modifier            -> side panel (handled outside)
  //   ⌘ / Ctrl               -> new background tab    (browser default)
  //   ⌘+⇧ / Ctrl+⇧           -> new foreground tab    (browser default)
  //   ⇧ alone                -> new window            (browser default)
  //   ⌥ / Alt alone          -> current tab           (overrides _blank)
  //   anything else exotic   -> let the browser decide
  const resolveModifierAction = (e) => {
    if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) return 'self';
    if (e.metaKey || e.ctrlKey) return 'native'; // new tab (bg/fg per ⇧)
    if (e.shiftKey) return 'native'; // new window
    return 'native';
  };

  const findAnchor = (e) => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    for (const node of path) {
      if (node && node.tagName === 'A') return node;
    }
    if (e.target && e.target.closest) return e.target.closest('a');
    return null;
  };

  // When the user uses a modifier-key click, we want to make sure that even
  // sites whose links go through window.open() (instead of <a target="_blank">)
  // do NOT get redirected into the Side Panel by injected.js's hijack. We can't
  // share state across worlds directly, so we set a short-lived flag here and
  // ignore window.open echoes that arrive within the same gesture.
  let bypassUntil = 0;
  const markBypassWindow = () => {
    bypassUntil = Date.now() + 400;
    // Also notify injected.js (in the MAIN world) so it actually lets
    // window.open run instead of returning a fake stub.
    try {
      window.dispatchEvent(
        new CustomEvent('__SLP_BYPASS__', { detail: { ms: 400 } }),
      );
    } catch (_) {}
  };
  const inBypassWindow = () => Date.now() < bypassUntil;

  let lastSent = { url: '', at: 0 };
  const sendOpen = (url, trigger) => {
    const now = Date.now();
    if (lastSent.url === url && now - lastSent.at < 300) return;
    lastSent = { url, at: now };

    // Inside the Side Panel (including nested iframes) just ask sidepanel.js
    // to re-load the panel. Don't route through background, don't open a new
    // tab, don't spin up another Side Panel.
    if (inSidePanel) {
      try {
        window.top.postMessage(
          { __slp: 1, type: 'NAVIGATE', url },
          '*',
        );
      } catch (err) {
        console.warn('[SideLinkPreview] postMessage to top:', err);
      }
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { type: 'OPEN_IN_SIDE_PANEL', url, trigger },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(
              '[SideLinkPreview] sendMessage:',
              chrome.runtime.lastError.message,
            );
          }
        },
      );
    } catch (err) {
      console.warn('[SideLinkPreview] sendMessage threw:', err);
    }
  };

  // ---------- click / mousedown / auxclick ----------
  const handleClick = (e) => {
    // Click interception is always on. Only check scope rules on external
    // pages — inside the Side Panel blacklist/whitelist don't apply.
    if (!inSidePanel) {
      if (!isEnabledForHost()) return;
    }
    if (e.button !== 0 && e.type !== 'auxclick') return;

    const a = findAnchor(e);
    if (!shouldIntercept(a)) return;

    if (hasModifier(e)) {
      // The user explicitly asked for a non-Side-Panel behavior via a modifier
      // key. Honor that, and DO NOT route to the Side Panel.
      const action = resolveModifierAction(e);
      if (action === 'self') {
        // ⌥/Alt alone → open in the current tab (overrides target="_blank").
        // We must preventDefault here because the link's native default for
        // ⌥ on macOS is "download", which is rarely what users want.
        e.preventDefault();
        e.stopPropagation();
        try {
          window.location.href = a.href;
        } catch (_) {}
        // Mark this click so injected.js's window.open hijack stays out of it.
        markBypassWindow();
        return;
      }
      // 'native' → fall through with no preventDefault so the browser applies
      // its built-in modifier semantics:
      //   ⌘/Ctrl click       → new background tab
      //   ⌘+⇧ / Ctrl+⇧ click → new foreground tab
      //   ⇧ click            → new window
      markBypassWindow();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    sendOpen(a.href, 'click');
  };

  document.addEventListener('mousedown', handleClick, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('auxclick', handleClick, true);

  // ---------- hover ----------
  let hoverTimer = null;
  let hoverAnchor = null;

  const clearHover = () => {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    hoverAnchor = null;
  };

  const handleOver = (e) => {
    if (inSidePanel) return; // Don't trigger hover preview inside the Side Panel itself.
    if (!settings.hoverEnabled) return;
    if (!isEnabledForHost()) return;
    if (hasModifier(e)) return;

    const a = findAnchor(e);
    if (!shouldIntercept(a)) {
      if (hoverAnchor && !hoverAnchor.contains(e.target)) clearHover();
      return;
    }
    if (a === hoverAnchor) return;

    clearTimeout(hoverTimer);
    hoverAnchor = a;
    const url = a.href;
    const delay = Math.max(50, Number(settings.hoverDelay) || 500);
    hoverTimer = setTimeout(() => {
      sendOpen(url, 'hover');
    }, delay);
  };

  const handleOut = (e) => {
    if (!settings.hoverEnabled) return;
    if (!hoverAnchor) return;
    const to = e.relatedTarget;
    if (to && hoverAnchor.contains(to)) return;
    clearHover();
  };

  document.addEventListener('mouseover', handleOver, true);
  document.addEventListener('mouseout', handleOut, true);

  // ---------- Echo of hijacked window.open (from injected.js) ----------
  window.addEventListener('__SLP_OPEN__', (e) => {
    if (!inSidePanel && !isEnabledForHost()) return;
    // The user just pressed a modifier key on the originating click — stay out
    // of the way and let the page's window.open run as the user intended.
    if (inBypassWindow()) return;
    const url = e?.detail?.url;
    if (typeof url === 'string' && /^https?:/i.test(url)) {
      // Originated from window.open inside a user gesture — treat as a click.
      sendOpen(url, 'click');
    }
  });
})();
