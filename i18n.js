// Lightweight i18n runtime shared by options.html and sidepanel.html.
// Include it on the extension's own pages via a regular <script src="i18n.js">;
// it exposes a global SLP_I18N object and boots itself automatically.
(() => {
  const LOCALES = {
    en: 'English',
    zh: '中文',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
    pt: 'Português',
  };
  const DEFAULT_LOCALE = 'en';
  const STORAGE_KEY = 'slpSettings';

  let dict = {};
  let currentLocale = DEFAULT_LOCALE;
  const readyListeners = [];

  const normalize = (loc) => (LOCALES[loc] ? loc : DEFAULT_LOCALE);

  // On first install (before the user has picked a language) try to follow
  // the browser. navigator.languages looks like ["zh-CN", "zh", "en-US", "en"];
  // pick the first primary subtag that matches one of our LOCALES, and fall
  // back to the default if none hit.
  const detectBrowserLocale = () => {
    const list =
      (navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language]) || [];
    for (const raw of list) {
      if (!raw) continue;
      const primary = String(raw).toLowerCase().split(/[-_]/)[0];
      if (LOCALES[primary]) return primary;
    }
    return DEFAULT_LOCALE;
  };

  const loadDict = async (locale) => {
    const url = chrome.runtime.getURL(`locales/${locale}.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error('locale fetch failed: ' + res.status);
    return res.json();
  };

  const setLocale = async (locale) => {
    const loc = normalize(locale);
    try {
      dict = await loadDict(loc);
      currentLocale = loc;
    } catch (err) {
      console.warn('[SLP i18n] load failed:', loc, err);
      if (loc !== DEFAULT_LOCALE) {
        dict = await loadDict(DEFAULT_LOCALE);
        currentLocale = DEFAULT_LOCALE;
      }
    }
    apply();
    readyListeners.splice(0).forEach((fn) => fn(currentLocale));
  };

  const t = (key, fallback) => {
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    return fallback != null ? fallback : key;
  };

  // Whitelisted tags allowed inside data-i18n-html (aligned with what the six
  // locale files actually use). CWS automated scanners don't like to see
  // innerHTML = untrusted; even though `dict` is the extension's own packaged
  // JSON, we route every HTML snippet through a whitelist parser that copies
  // nodes via appendChild — equivalent output, zero surface for accidental
  // injection.
  const ALLOWED_INLINE_TAGS = new Set([
    'STRONG',
    'EM',
    'CODE',
    'KBD',
    'BR',
    'SPAN',
    'B',
    'I',
  ]);

  // Parse a dict HTML snippet into an inline sandbox; anything outside the
  // whitelist is downgraded to its plain textContent.
  const inlineParser = new DOMParser();
  const buildSafeFragment = (html) => {
    const doc = inlineParser.parseFromString(
      `<div id="root">${html}</div>`,
      'text/html',
    );
    const src = doc.getElementById('root');
    const frag = document.createDocumentFragment();
    const copy = (srcNode, dstParent) => {
      for (const node of Array.from(srcNode.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          dstParent.appendChild(document.createTextNode(node.textContent));
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (!ALLOWED_INLINE_TAGS.has(node.tagName)) {
          // Non-whitelisted element: keep only its text, drop tag and attrs.
          dstParent.appendChild(document.createTextNode(node.textContent));
          continue;
        }
        const el = document.createElement(node.tagName.toLowerCase());
        copy(node, el);
        dstParent.appendChild(el);
      }
    };
    if (src) copy(src, frag);
    return frag;
  };

  const apply = (root) => {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
        el.textContent = dict[key];
      }
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
        el.textContent = '';
        el.appendChild(buildSafeFragment(dict[key]));
      }
    });
    scope.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      // Format: "placeholder=key,title=key2"
      const spec = el.getAttribute('data-i18n-attr');
      if (!spec) return;
      spec.split(',').forEach((pair) => {
        const [attr, key] = pair.split('=').map((s) => s.trim());
        if (attr && key && Object.prototype.hasOwnProperty.call(dict, key)) {
          el.setAttribute(attr, dict[key]);
        }
      });
    });
    document.documentElement.lang = currentLocale;
    if (dict.app_name) document.title = dict.app_name;
  };

  const onReady = (fn) => {
    if (dict && Object.keys(dict).length > 0) fn(currentLocale);
    else readyListeners.push(fn);
  };

  const boot = async () => {
    let locale = null;
    try {
      const data = await chrome.storage.sync.get(STORAGE_KEY);
      if (data[STORAGE_KEY]?.locale) locale = data[STORAGE_KEY].locale;
    } catch (_) {}
    // No explicit user choice yet — follow the browser language.
    if (!locale) locale = detectBrowserLocale();
    await setLocale(locale);
  };

  // React to locale changes written to storage.sync from any other page.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const next = changes[STORAGE_KEY]?.newValue;
    if (next && next.locale && next.locale !== currentLocale) {
      setLocale(next.locale);
    }
  });

  window.SLP_I18N = {
    LOCALES,
    DEFAULT_LOCALE,
    get locale() {
      return currentLocale;
    },
    t,
    apply,
    setLocale,
    onReady,
  };

  boot();
})();
