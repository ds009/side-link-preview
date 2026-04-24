// 在页面 MAIN world 执行。
// - 普通页面：劫持 window.open，让外链走侧边栏。
// - Side Panel 里的 iframe：同时做 anti-frame-busting + 劫持 window.open
//   （这样 Side Panel 里调 window.open 也能在当前侧边栏内就地导航）。
(() => {
  if (window.__SLP_INIT__) return;
  window.__SLP_INIT__ = true;

  // 判断当前 frame 的祖先里是否有扩展 origin（即是否在 Side Panel 里）
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

  // A. Side Panel iframe：抑制 frame-busting（伪造 top/parent 为 self）
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

  // B. 劫持 window.open（两种上下文都要）
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

  // OAuth / SSO / 分享弹窗通常会指定宽高或坐标（如
  // `window.open(url, 'oauth', 'width=500,height=600,left=..,top=..')`），
  // 这些场景需要真正的弹窗，不应被接管。
  const looksLikePopupWindow = (features) => {
    if (typeof features !== 'string' || !features) return false;
    return /\b(width|height|left|top|popup)\s*=/i.test(features);
  };

  // 只接管真正语义上的"新开一个标签/窗口"：
  //   - 无 target，或 target 为 _blank / _new
  // 命名 target（如 iframe 名、站点内部复用窗口名）保持原样
  const looksLikeBlankTarget = (target) => {
    if (target == null || target === '') return true;
    const t = String(target).toLowerCase();
    return t === '_blank' || t === '_new';
  };

  window.open = function (url, target, features) {
    try {
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
      // 走原逻辑
    }
    return origOpen.apply(this, arguments);
  };
})();
