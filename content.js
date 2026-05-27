(() => {
  const DEFAULTS = {
    mode: 'blacklist',
    blacklist: [],
    whitelist: [],
    linkScope: 'all',
    openTrigger: 'click',
    hoverOpen: false,
    hoverDelayMs: 2000,
    locale: 'en',
  };

  // When the extension is reloaded/updated while a tab is still open, every
  // content script that was injected before the reload becomes "orphaned":
  // chrome.runtime.id flips to undefined and any sendMessage call throws
  // "Extension context invalidated." That's expected Chromium behaviour, not
  // a real failure — silence it and stop trying so we don't spam the page's
  // console. Real production errors (network down, no listener, etc.) still
  // surface as warnings.
  let runtimeAlive = true;
  const isContextInvalidated = (err) => {
    if (!err) return false;
    const msg = err.message || String(err);
    return /context invalidated|context invalid/i.test(msg);
  };
  const safeSendMessage = (msg, cb) => {
    if (!runtimeAlive || !chrome.runtime?.id) {
      runtimeAlive = false;
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          if (isContextInvalidated(err)) {
            runtimeAlive = false;
            return;
          }
          console.warn('[SideLinkPreview] sendMessage:', err.message);
          return;
        }
        if (typeof cb === 'function') cb(resp);
      });
    } catch (err) {
      if (isContextInvalidated(err)) {
        runtimeAlive = false;
        return;
      }
      console.warn('[SideLinkPreview] sendMessage threw:', err);
    }
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

  // Whether this frame is the top-level page (not a nested iframe). Used by
  // [F] to skip click/window.open interception inside third-party embeds
  // (YouTube, Disqus, ads, etc.) when running outside the Side Panel.
  const inTopFrame = (() => {
    try {
      return window === window.top;
    } catch (_) {
      return false;
    }
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

  // Nested third-party iframes outside the Side Panel: skip storage reads and
  // never register capture listeners — minimizes work on ads/embeds/widgets.
  if (!inSidePanel && !inTopFrame) return;

  const panelExtOrigin = (() => {
    try {
      const a = location.ancestorOrigins;
      if (a && a.length) return a[0];
    } catch (_) {}
    return null;
  })();

  const postToPanel = (payload) => {
    try {
      window.top.postMessage(payload, panelExtOrigin || '*');
    } catch (_) {}
  };

  // ---------- Main-tab URL changes (incl. SPA) ----------
  // When the left page navigates, background closes any open Side Panel for
  // this tab. tabs.onUpdated misses some pushState navigations, so watch here.
  if (!inSidePanel && inTopFrame) {
    let lastMainUrl = location.href;
    const isHashOnlyChange = (from, to) => {
      try {
        const prev = new URL(from);
        const next = new URL(to);
        return (
          prev.origin === next.origin &&
          prev.pathname === next.pathname &&
          prev.search === next.search &&
          prev.hash !== next.hash
        );
      } catch (_) {
        return false;
      }
    };
    const notifyMainUrlIfChanged = () => {
      const url = location.href;
      if (url === lastMainUrl) return;
      if (isHashOnlyChange(lastMainUrl, url)) {
        lastMainUrl = url;
        return;
      }
      lastMainUrl = url;
      safeSendMessage({ type: 'SLP_MAIN_URL_CHANGED', url });
    };

    window.addEventListener('popstate', notifyMainUrlIfChanged);
    window.addEventListener('hashchange', notifyMainUrlIfChanged);

    const wrapHistory = (fn) =>
      function (...args) {
        const ret = fn.apply(this, args);
        notifyMainUrlIfChanged();
        return ret;
      };
    try {
      history.pushState = wrapHistory(history.pushState);
      history.replaceState = wrapHistory(history.replaceState);
    } catch (_) {}
  }

  // Send a "loaded" ping from the primary preview iframe only (not nested
  // embeds). Reaching this line proves the site wasn't blocked by XFO/CSP.
  if (isImmediatePanelChild) {
    try {
      postToPanel({ __slp: 1, type: 'LOADED', url: location.href });
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
        postToPanel({ __slp: 1, type: 'SCROLL_STATE', show });
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

  const isUrlEnabled = (url) => !isUrlDisabledByScope(url, settings);

  const isEnabledForPage = () => {
    if (isNativeOnlyHost(location.hostname)) return false;
    if (isSensitivePreviewHost(location.hostname)) return false;
    if (isSensitivePreviewPath(location.pathname)) return false;
    return isUrlEnabled(location.href);
  };

  function announceHostState() {
    if (inSidePanel) return; // Inside the panel iframe the hijack is required.
    try {
      window.dispatchEvent(
        new CustomEvent('__SLP_HOST_STATE__', {
          detail: { disabled: !isEnabledForPage() },
        }),
      );
    } catch (_) {}
  }

  const applySettings = (raw) => {
    settings = normalizeSlpSettings(raw);
    if (!hoverPreviewEnabled()) clearHoverTimer();
    announceHostState();
  };

  // Side Panel, or Scope allows interception on this top-level document.
  const interceptorsNeeded = () =>
    inSidePanel || !isUrlDisabledByScope(location.href, settings);

  let syncListenerInstalled = false;
  let sessionListenerInstalled = false;
  let interceptorsInstalled = false;

  const attachSyncListener = () => {
    if (syncListenerInstalled) return;
    syncListenerInstalled = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (!changes.slpSettings) return;
      applySettings(changes.slpSettings.newValue);
      if (interceptorsNeeded()) setupInterceptors();
    });
  };

  const attachSessionListener = () => {
    if (sessionListenerInstalled) return;
    sessionListenerInstalled = true;
    chrome.storage.session.onChanged.addListener((changes) => {
      const ch = changes.slpSettingsCache;
      if (!ch?.newValue?.settings) return;
      applySettings(ch.newValue.settings);
      if (interceptorsNeeded()) setupInterceptors();
    });
  };

  const finishBootstrap = (raw) => {
    applySettings(raw);
    attachSyncListener();
    attachSessionListener();
    if (interceptorsNeeded()) setupInterceptors();
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

  // [K] Bare-domain link: pathname is empty or "/". A link to a domain root
  // is overwhelmingly a "leave this site for that site" navigation (logo
  // link in a header, brand mentions in a paragraph, "Visit our website"
  // CTAs) — almost never something the user wants to preview side-by-side.
  // Query string and hash are ignored so `https://example.com/?ref=x` and
  // `https://example.com/#top` also count as bare. Letting these go native
  // avoids stranding a homepage in the panel that the user has to close.
  const isBareDomain = (href) => {
    try {
      const u = new URL(href, location.href);
      return u.pathname === '' || u.pathname === '/';
    } catch (_) {
      return false;
    }
  };

  // [E] Common download / media file extensions. Only matched on the URL
  // path (not the query string), so a server-driven download via
  // ?file=foo.zip will still go through the Side Panel — those are rare
  // compared to direct .pdf / .zip / .dmg links.
  const DL_EXT_RE =
    /\.(?:pdf|zip|7z|tar|gz|tgz|rar|dmg|iso|exe|msi|apk|ipa|deb|rpm|pkg|xlsx?|docx?|pptx?|csv|mp3|mp4|mov|m4v|webm|avi|mkv|wav|flac|epub|mobi)$/i;

  // [G] IP literals, localhost, corporate TLDs — native navigation only.

  const shouldIntercept = (a) => {
    if (!a || a.tagName !== 'A') return false;
    if (!a.href || a.href.startsWith('javascript:')) return false;
    if (!/^https?:/i.test(a.href)) return false;

    // In-panel browsing: route links through sidepanel.js (NAVIGATE →
    // frame.src). The preview iframe is sandboxed and main-page heuristics
    // (bare domain, Scope, auth hosts, …) must not skip interception here —
    // skipped clicks call preventDefault nowhere but also cannot navigate.
    if (inSidePanel) {
      if (a.hasAttribute('download')) return false;
      if (isSamePage(a.href)) return false;
      if (location.protocol === 'https:' && /^http:/i.test(a.href))
        return false;
      try {
        if (isNativeOnlyHost(new URL(a.href, location.href).hostname))
          return false;
      } catch (_) {}
      return true;
    }

    // [A] Explicit download intent — let the browser download it.
    if (a.hasAttribute('download')) return false;

    // [B] target=_top / _parent semantically asks the link to navigate
    // out of the current frame, the opposite of side-panel preview.
    const tgt = (a.target || '').toLowerCase();
    if (tgt === '_top' || tgt === '_parent') return false;

    // [C] rel=external / rel=alternate — HTML semantic markers for
    // "off-site" or "alternate format" (RSS / PDF feeds, mobile vs
    // desktop variant, etc.).
    const rel = (a.rel || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (rel.includes('external') || rel.includes('alternate'))
      return false;

    // [D] Mixed content: the Side Panel is hosted on a chrome-extension://
    // origin (HTTPS-equivalent); http:// child resources are blocked by
    // the browser and would never render. Send to a real tab instead.
    if (location.protocol === 'https:' && /^http:/i.test(a.href))
      return false;

    // Anchor / same-page links: let the browser handle them natively
    // (scroll to fragment, in-place query update, etc.).
    if (isSamePage(a.href)) return false;

    // [K] Bare-domain link (homepage navigation) — see helper for rationale.
    if (isBareDomain(a.href)) return false;

    // [E] Known downloadable / media extensions. Server might serve a
    // viewer page for some of these, but in practice the false-positive
    // rate is low — direct .pdf / .zip / .dmg links almost always
    // trigger downloads or open in a non-iframable browser viewer.
    try {
      if (DL_EXT_RE.test(new URL(a.href, location.href).pathname))
        return false;
    } catch (_) {}

    // If the destination URL is on the user's disable list, don't take it
    // into the Side Panel — the user has explicitly told us this site
    // shouldn't load there. Browser-native behavior takes over: target=_blank
    // → new tab, plain link → in-place nav.
    let destUrl = '';
    try {
      const destParsed = new URL(a.href, location.href);
      destUrl = destParsed.href;
    } catch (_) {}
    if (destUrl && !isUrlEnabled(destUrl)) return false;

    // [L] Sensitive hosts / checkout / auth paths — see settings-shared.js.
    if (destUrl && isSensitivePreviewUrl(destUrl)) return false;

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
        postToPanel({ __slp: 1, type: 'NAVIGATE', url });
      } catch (err) {
        console.warn('[SideLinkPreview] postMessage to top:', err);
      }
      return;
    }

    safeSendMessage({
      type: 'OPEN_IN_SIDE_PANEL',
      url,
      trigger: trigger || 'click',
    });
  };

  const openTriggerMode = () => settings.openTrigger || 'click';

  const hoverPreviewEnabled = () => {
    const mode = openTriggerMode();
    return mode === 'hover' || !!settings.hoverOpen;
  };

  let hoverTimer = null;
  let hoverAnchor = null;
  let hoverThrottleTimer = null;
  let hoverPendingEvent = null;

  const clearHoverThrottle = () => {
    if (hoverThrottleTimer) clearTimeout(hoverThrottleTimer);
    hoverThrottleTimer = null;
    hoverPendingEvent = null;
  };

  const clearHoverTimer = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    hoverAnchor = null;
    clearHoverThrottle();
  };

  const hoverDelayMs = () => {
    const n = Number(settings.hoverDelayMs);
    if (!Number.isFinite(n)) return DEFAULTS.hoverDelayMs;
    return Math.min(3000, Math.max(200, Math.round(n)));
  };

  const handleHoverOver = (e) => {
    hoverPendingEvent = e;
    if (hoverThrottleTimer) return;
    hoverThrottleTimer = setTimeout(() => {
      hoverThrottleTimer = null;
      processHoverOver(hoverPendingEvent);
      hoverPendingEvent = null;
    }, 80);
  };

  const processHoverOver = (e) => {
    if (!e) return;
    if (inSidePanel || !inTopFrame) return;
    if (!isEnabledForPage()) return;
    if (!hoverPreviewEnabled()) return;
    if (hasModifier(e)) return;

    const a = findAnchor(e);
    if (!shouldIntercept(a)) {
      if (hoverAnchor) clearHoverTimer();
      return;
    }
    if (a === hoverAnchor && hoverTimer) return;

    clearHoverTimer();
    hoverAnchor = a;
    const url = a.href;
    hoverTimer = setTimeout(() => {
      hoverTimer = null;
      sendOpen(url, 'hover');
    }, hoverDelayMs());
  };

  const handleHoverOut = (e) => {
    if (!hoverPreviewEnabled()) {
      clearHoverThrottle();
      return;
    }
    if (!hoverAnchor && !hoverThrottleTimer) return;
    const a = findAnchor(e);
    if (hoverAnchor && a !== hoverAnchor) return;
    const to = e.relatedTarget;
    if (hoverAnchor && to && hoverAnchor.contains(to)) return;
    clearHoverTimer();
  };

  // ---------- click / mousedown / auxclick ----------
  const handleMiddleClick = (e) => {
    if (!inSidePanel && !inTopFrame) return;
    if (!inSidePanel && !isEnabledForPage()) return;
    if (e.button !== 1) return;
    if (openTriggerMode() !== 'middle-click') return;
    if (hasModifier(e)) return;

    const a = findAnchor(e);
    if (!shouldIntercept(a)) return;

    // Chrome opens middle-click links in a new tab on auxclick, not click.
    e.preventDefault();
    e.stopPropagation();
    sendOpen(a.href, 'click');
  };

  const handleClick = (e) => {
    // [F] Skip clicks inside nested third-party iframes (YouTube embeds,
    // Disqus, ads, social widgets, etc.). Top frame is always allowed,
    // and so is the Side Panel's preview iframe (inSidePanel=true). For
    // any other nested frame we stay completely out of the way so the
    // embedded widget's own click semantics keep working.
    if (!inSidePanel && !inTopFrame) return;
    // Click interception is always on. Only check scope rules on external
    // pages — inside the Side Panel blacklist/whitelist don't apply.
    if (!inSidePanel) {
      if (!isEnabledForPage()) return;
    }

    const a = findAnchor(e);
    if (!shouldIntercept(a)) return;

    const mode = openTriggerMode();

    // Middle click is handled on auxclick (see handleMiddleClick).
    if (e.button === 1) return;

    // Right-click belongs to the context menu — always native.
    if (e.button !== 0) return;

    // Outside the panel, left click is ignored in middle-click / hover-only modes.
    if (!inSidePanel && (mode === 'middle-click' || mode === 'hover')) return;

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

  const setupInterceptors = () => {
    if (interceptorsInstalled) return;
    interceptorsInstalled = true;
    document.addEventListener('mouseover', handleHoverOver, true);
    document.addEventListener('mouseout', handleHoverOut, true);
    document.addEventListener('auxclick', handleMiddleClick, true);
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('click', handleClick, true);
    window.addEventListener('__SLP_OPEN__', (e) => {
      // [F] Same nested-iframe guard as handleClick. Note that injected.js
      // also early-returns in this case, so we should never actually
      // receive a __SLP_OPEN__ from a nested frame — but keep the check
      // here as belt-and-braces.
      if (!inSidePanel && !inTopFrame) return;
      if (!inSidePanel && !isEnabledForPage()) return;
      // The user just pressed a modifier key on the originating click — stay out
      // of the way and let the page's window.open run as the user intended.
      if (inBypassWindow()) return;
      const url = e?.detail?.url;
      if (typeof url !== 'string' || !/^https?:/i.test(url)) return;
      if (isSamePage(url)) return;

      if (inSidePanel) {
        sendOpen(url, 'click');
        return;
      }

      // Bare-domain window.open (e.g. a "Visit homepage" button) — same
      // reasoning as the click path: leaving the site, not previewing.
      if (isBareDomain(url)) return;
      // Destination URL is user-disabled. injected.js already returned a fake
      // stub for window.open(), so we can't fall back to native popup behavior;
      // ask background to open it as a new tab instead — the user will at
      // least see the page somewhere.
      if (!isUrlEnabled(url)) {
        safeSendMessage({ type: 'OPEN_IN_NEW_TAB', url });
        return;
      }
      if (isSensitivePreviewUrl(url)) {
        safeSendMessage({ type: 'OPEN_IN_NEW_TAB', url });
        return;
      }
      if (openTriggerMode() === 'hover') {
        safeSendMessage({ type: 'OPEN_IN_NEW_TAB', url });
        return;
      }
      // Originated from window.open inside a user gesture — treat as a click.
      sendOpen(url, 'click');
    });
  };

  Promise.all([
    chrome.storage.session.get('slpSettingsCache').catch(() => ({})),
    chrome.storage.sync.get('slpSettings').catch(() => ({})),
  ])
    .then(([sessionBag, syncBag]) => {
      finishBootstrap(
        pickNewerSettings(sessionBag.slpSettingsCache, syncBag.slpSettings),
      );
    })
    .catch(() => finishBootstrap(undefined));
})();
