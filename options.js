const DEFAULTS = {
  mode: 'blacklist',
  list: [],
  linkScope: 'blank-only',
  locale: 'en',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  mode: $$('input[name="mode"]'),
  includeNonBlank: $('#includeNonBlank'),
  list: $('#list'),
  locale: $('#locale'),
  status: $('#status'),
  reset: $('#reset'),
};

const t = (key, fallback) =>
  window.SLP_I18N?.t?.(key, fallback) ?? (fallback ?? key);

const getRadio = (nodeList) => {
  for (const el of nodeList) if (el.checked) return el.value;
  return null;
};
const setRadio = (nodeList, value) => {
  for (const el of nodeList) el.checked = el.value === value;
};

const parseList = (raw) =>
  raw
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

const normalizeLocale = (loc) => {
  const allowed = window.SLP_I18N?.LOCALES || { en: 1 };
  return allowed[loc] ? loc : DEFAULTS.locale;
};

const render = (s) => {
  setRadio(els.mode, s.mode);
  els.includeNonBlank.checked = s.linkScope === 'all';
  els.list.value = s.list.join('\n');
  els.locale.value = normalizeLocale(s.locale);
};

const readForm = () => ({
  mode: getRadio(els.mode) || DEFAULTS.mode,
  linkScope: els.includeNonBlank.checked ? 'all' : 'blank-only',
  list: parseList(els.list.value),
  locale: normalizeLocale(els.locale.value),
});

let statusTimer = null;
const flashSaved = () => {
  els.status.textContent = t('saved', 'Saved');
  els.status.classList.add('ok');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    els.status.textContent = '';
    els.status.classList.remove('ok');
  }, 1200);
};

// chrome.storage.sync has a hard 8192-byte limit per key. Leave a little
// headroom: anything above 7500 bytes is rejected here with a friendly
// message, so the user trims their domain list instead of eventually hitting
// a cryptic "QUOTA_BYTES_PER_ITEM" error thrown by set().
const SYNC_ITEM_SOFT_LIMIT = 7500;

const byteLength = (obj) =>
  new TextEncoder().encode(JSON.stringify(obj)).length;

const save = async () => {
  const next = readForm();
  const size = byteLength(next);
  if (size > SYNC_ITEM_SOFT_LIMIT) {
    els.status.textContent = t(
      'storage_quota_warning',
      'Domain list is too long for Chrome sync storage. Please shorten it.',
    );
    els.status.classList.remove('ok');
    return;
  }
  try {
    await chrome.storage.sync.set({ slpSettings: next });
    flashSaved();
  } catch (err) {
    els.status.textContent = t('save_failed', 'Save failed: ') + err.message;
    els.status.classList.remove('ok');
  }
};

const debounce = (fn, ms) => {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const init = async () => {
  let s = { ...DEFAULTS };
  try {
    const data = await chrome.storage.sync.get('slpSettings');
    if (data.slpSettings) {
      s = { ...DEFAULTS, ...data.slpSettings };
    }
  } catch (_) {}
  render(s);

  const debouncedSave = debounce(save, 300);

  for (const el of els.mode) {
    el.addEventListener('change', save);
  }
  els.includeNonBlank.addEventListener('change', save);
  els.list.addEventListener('input', debouncedSave);
  els.locale.addEventListener('change', save);

  els.reset.addEventListener('click', async () => {
    const msg = t(
      'reset_confirm',
      'Reset to defaults? The domain list will be cleared.',
    );
    if (!confirm(msg)) return;
    const next = { ...DEFAULTS };
    await chrome.storage.sync.set({ slpSettings: next });
    render(next);
    flashSaved();
  });

  // Cross-tab sync: when settings change in another window (a second
  // options page, or chrome.storage.sync arriving from another device),
  // re-render the form unless the user is actively typing in the textarea.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.slpSettings) return;
    const next = { ...DEFAULTS, ...(changes.slpSettings.newValue || {}) };
    if (document.activeElement === els.list) {
      // User is mid-edit on the textarea; re-rendering would clobber
      // their cursor / unsaved input. Skip — debouncedSave will reconcile
      // soon enough.
      return;
    }
    render(next);
  });
};

init();
