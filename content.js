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

  // Whether this frame is the *immediate* child of the Side Panel page (i.e.
  // the iframe whose src is the user-clicked URL). Nested iframes are also
  // inside the panel but their scroll position isn't what the user sees.
  const isImmediatePanelChild = (() => {
    try {
      const a = location.ancestorOrigins;
      return (
        a && a.length === 1 && a[0].startsWith('chrome-extension://')
      );
    } catch (_) {
      return false;
    }
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

  // ---------- Back-to-top affordance ----------
  // For the Side Panel's primary iframe only: track scroll state and notify
  // the panel UI when the page is at least 2 viewports tall and has been
  // scrolled past 1 viewport. The panel renders a floating button on top of
  // the iframe; clicking it sends SCROLL_TOP back to us.
  if (isImmediatePanelChild) {
    const PAGE_LENGTH_FACTOR = 2;
    const SCROLL_THRESHOLD_FACTOR = 1;
    let lastShown = false;
    let pending = false;

    const evaluateScroll = () => {
      pending = false;
      const sh = Math.max(
        document.documentElement?.scrollHeight || 0,
        document.body?.scrollHeight || 0,
      );
      const ih = window.innerHeight || 0;
      const sy = window.scrollY || window.pageYOffset || 0;
      const show =
        ih > 0 &&
        sh >= ih * PAGE_LENGTH_FACTOR &&
        sy >= ih * SCROLL_THRESHOLD_FACTOR;
      if (show === lastShown) return;
      lastShown = show;
      try {
        window.top.postMessage(
          { __slp: 1, type: 'SCROLL_STATE', show },
          '*',
        );
      } catch (_) {}
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(evaluateScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Re-evaluate after late-loading content (images, fonts) changes the
    // document height.
    window.addEventListener('load', evaluateScroll, { once: true });
    setTimeout(evaluateScroll, 250);

    // Receive "scroll to top" from sidepanel.js.
    window.addEventListener('message', (e) => {
      if (e.source !== window.top) return;
      const d = e.data;
      if (!d || d.__slp !== 1) return;
      if (d.type === 'SCROLL_TOP') {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (_) {
          window.scrollTo(0, 0);
        }
      }
    });
  }

  let settings = { ...DEFAULTS };
  let settingsLoaded = false;

  const applySettings = (raw) => {
    settings = { ...DEFAULTS, ...(raw || {}) };
    if (!Array.isArray(settings.list)) settings.list = [];
    // Back-compat: older schemas used `trigger: 'click' | 'hover'`; newer
    // schemas use `hoverEnabled`.
    if (raw && raw.hoverEnabled === undefined && raw.trigger === 'hover') {
      settings.hoverEnabled = true;
    }
    settingsLoaded = true;
    announceHostState();
  };

  // Tell injected.js (MAIN world) whether this host is on the user's disable
  // list, so it can skip its window.open hijack entirely. On disabled hosts
  // the extension should be a no-op — page-level window.open() must keep its
  // native semantics, never get swapped for a fake stub.
  const announceHostState = () => {
    if (inSidePanel) return; // Inside the panel iframe the hijack is required.
    try {
      window.dispatchEvent(
        new CustomEvent('__SLP_HOST_STATE__', {
          detail: { disabled: !isEnabledForHost() },
        }),
      );
    } catch (_) {}
  };

  chrome.storage.sync
    .get('slpSettings')
    .then((data) => applySettings(data.slpSettings))
    .catch(() => {
      settingsLoaded = true;
      announceHostState();
    });

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

  const isHostEnabled = (host) => {
    if (!host) return true;
    const h = String(host).toLowerCase();
    const listed = settings.list.some((p) => matchDomain(h, p));
    if (settings.mode === 'whitelist') return listed;
    return !listed;
  };

  const isEnabledForHost = () => isHostEnabled(location.hostname);

  // Extract the destination hostname from a link href / window.open URL.
  // Returns null on malformed input so callers can skip safely.
  const destHostOf = (href) => {
    try {
      return new URL(href, location.href).hostname.toLowerCase();
    } catch (_) {
      return null;
    }
  };

  // Same-page check: ignore query string and hash. Used to skip in-page
  // anchor jumps (#section), pagination/filter changes that only differ by
  // query, and any link that points back to the current page itself —
  // routing those through the Side Panel makes no sense and breaks
  // ergonomic things like "back to top" anchors.
  const isSamePage = (href) => {
    try {
      const u = new URL(href, location.href);
      return (
        u.origin === location.origin && u.pathname === location.pathname
      );
    } catch (_) {
      return false;
    }
  };

  const shouldIntercept = (a) => {
    if (!a || a.tagName !== 'A') return false;
    if (!a.href || a.href.startsWith('javascript:')) return false;
    if (!/^https?:/i.test(a.href)) return false;
    // Anchor / same-page links: let the browser handle them natively
    // (scroll to fragment, in-place query update, etc.).
    if (isSamePage(a.href)) return false;
    // If the destination host is on the user's disable list, don't take it
    // into the Side Panel — the user has explicitly told us this site
    // shouldn't load there. Browser-native behavior takes over: target=_blank
    // → new tab, plain link → in-place nav.
    const dest = destHostOf(a.href);
    if (dest && !isHostEnabled(dest)) return false;
    // Inside the Side Panel: intercept every (non-same-page) link so
    // navigation stays in place.
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
    if (typeof url !== 'string' || !/^https?:/i.test(url)) return;
    // Skip same-page window.open targets (rare but possible) so we don't
    // re-render the current page in the Side Panel for no reason.
    if (isSamePage(url)) return;
    // Destination host is user-disabled. injected.js already returned a fake
    // stub for window.open(), so we can't fall back to native popup behavior;
    // ask background to open it as a new tab instead — the user will at
    // least see the page somewhere.
    const dest = destHostOf(url);
    if (dest && !isHostEnabled(dest)) {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_IN_NEW_TAB', url }, () => {
          void chrome.runtime.lastError;
        });
      } catch (_) {}
      return;
    }
    // Originated from window.open inside a user gesture — treat as a click.
    sendOpen(url, 'click');
  });
})();
