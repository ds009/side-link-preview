(() => {
  const DEFAULTS = {
    mode: 'blacklist',
    list: [],
    trigger: 'click',
    hoverDelay: 500,
    linkScope: 'blank-only',
    locale: 'en',
  };

  // 判断当前 frame 是否被本扩展（Side Panel）嵌入。
  // 注意 content.js 跑在 ISOLATED world，这里读到的 window.top / parent 不会被
  // injected.js 在 MAIN world 对 window.top 的伪造污染。
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

  // 向 Side Panel 顶层发"已加载"信号。只要 content.js 能运行到这里，就说明
  // 目标站没被 XFO/CSP 拦掉，sidepanel.js 可以取消"疑似被拦截"的超时提示。
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
  };

  chrome.storage.sync
    .get('slpSettings')
    .then((data) => applySettings(data.slpSettings))
    .catch(() => {});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.slpSettings) applySettings(changes.slpSettings.newValue);
  });

  // 域名匹配：
  // - 精确匹配或子域名匹配（example.com 匹配 www.example.com / blog.example.com）
  // - 支持 * 通配符（*example* 匹配任何包含 example 的域名）
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
    // Side Panel 内部：所有链接都拦截，强制就地跳转
    if (inSidePanel) return true;
    if (settings.linkScope === 'blank-only' && a.target !== '_blank')
      return false;
    return true;
  };

  const hasModifier = (e) =>
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

  const findAnchor = (e) => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    for (const node of path) {
      if (node && node.tagName === 'A') return node;
    }
    if (e.target && e.target.closest) return e.target.closest('a');
    return null;
  };

  let lastSent = { url: '', at: 0 };
  const sendOpen = (url, trigger) => {
    const now = Date.now();
    if (lastSent.url === url && now - lastSent.at < 300) return;
    lastSent = { url, at: now };

    // 在 Side Panel 内部（包括嵌套 iframe）直接让 sidepanel.js 重新 load，
    // 不走 background，不打开新 tab / 不新建 Side Panel。
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
    // Side Panel 内部：不受 trigger / 黑白名单影响，始终走 click 拦截
    if (!inSidePanel) {
      if (settings.trigger !== 'click') return;
      if (!isEnabledForHost()) return;
    }
    if (hasModifier(e)) return;
    if (e.button !== 0 && e.type !== 'auxclick') return;

    const a = findAnchor(e);
    if (!shouldIntercept(a)) return;

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
    if (inSidePanel) return; // Side Panel 内不 hover 触发
    if (settings.trigger !== 'hover') return;
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
    if (settings.trigger !== 'hover') return;
    if (!hoverAnchor) return;
    const to = e.relatedTarget;
    if (to && hoverAnchor.contains(to)) return;
    clearHover();
  };

  document.addEventListener('mouseover', handleOver, true);
  document.addEventListener('mouseout', handleOut, true);

  // ---------- window.open 劫持的回声（来自 injected.js）----------
  window.addEventListener('__SLP_OPEN__', (e) => {
    if (!inSidePanel && !isEnabledForHost()) return;
    const url = e?.detail?.url;
    if (typeof url === 'string' && /^https?:/i.test(url)) {
      // 来自用户手势内的 window.open，按 click 处理
      sendOpen(url, 'click');
    }
  });
})();
