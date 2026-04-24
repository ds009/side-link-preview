// 轻量 i18n 运行时，供 options.html / sidepanel.html 共享。
// 在扩展自己的页面里通过普通 <script src="i18n.js"> 引入，
// 它会暴露全局对象 SLP_I18N 并自动启动。
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
        el.innerHTML = dict[key];
      }
    });
    scope.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      // 格式: "placeholder=key,title=key2"
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
    let locale = DEFAULT_LOCALE;
    try {
      const data = await chrome.storage.sync.get(STORAGE_KEY);
      if (data[STORAGE_KEY]?.locale) locale = data[STORAGE_KEY].locale;
    } catch (_) {}
    await setLocale(locale);
  };

  // storage.sync 里 locale 变了也同步更新
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
