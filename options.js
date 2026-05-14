const DEFAULTS = {
  mode: 'blacklist',
  blacklist: [],
  whitelist: [],
  linkScope: 'blank-only',
  locale: 'en',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  mode: $$('input[name="mode"]'),
  includeNonBlank: $('#includeNonBlank'),
  list: $('#list'),
  whitelistReco: $('#whitelistReco'),
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

const syncWhitelistRecommendationVisibility = () => {
  const el = els.whitelistReco;
  if (!el) return;
  el.hidden = (getRadio(els.mode) || DEFAULTS.mode) !== 'blacklist';
};

let formState = normalizeSlpSettings(DEFAULTS);
let lastMode = DEFAULTS.mode;

/** Optimistic-lock revision for sync merges (added on each successful save). */
const readRev = (raw) =>
  raw &&
  typeof raw._rev === 'number' &&
  Number.isFinite(raw._rev)
    ? raw._rev
    : 0;

let lastAckRev = 0;

const flushTextareaIntoFormState = () => {
  const m = getRadio(els.mode) || DEFAULTS.mode;
  const parsed = parseList(els.list.value);
  if (m === 'whitelist') formState.whitelist = parsed;
  else formState.blacklist = parsed;
  formState.mode = m;
};

const render = (raw) => {
  formState = normalizeSlpSettings({ ...DEFAULTS, ...(raw || {}) });
  lastAckRev = readRev(raw);
  lastMode = formState.mode;
  setRadio(els.mode, formState.mode);
  els.includeNonBlank.checked = formState.linkScope === 'all';
  els.list.value =
    formState.mode === 'whitelist'
      ? formState.whitelist.join('\n')
      : formState.blacklist.join('\n');
  els.locale.value = normalizeLocale(formState.locale);
  syncWhitelistRecommendationVisibility();
};

const readForm = () => {
  flushTextareaIntoFormState();
  return {
    mode: getRadio(els.mode) || DEFAULTS.mode,
    blacklist: [...formState.blacklist],
    whitelist: [...formState.whitelist],
    linkScope: els.includeNonBlank.checked ? 'all' : 'blank-only',
    locale: normalizeLocale(els.locale.value),
  };
};

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
  let remoteSnap;
  try {
    remoteSnap = await chrome.storage.sync.get('slpSettings');
  } catch (err) {
    els.status.textContent = t('save_failed', 'Save failed: ') + err.message;
    els.status.classList.remove('ok');
    return;
  }
  const remote = remoteSnap?.slpSettings;
  const remoteRev = readRev(remote);
  if (remoteRev !== lastAckRev) {
    render(remote || {});
    els.status.textContent = t(
      'settings_conflict_notice',
      'Settings were updated elsewhere; loaded the latest.',
    );
    els.status.classList.remove('ok');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      els.status.textContent = '';
    }, 3500);
    return;
  }

  const next = readForm();
  next._rev = Date.now();
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
    lastAckRev = next._rev;
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
  let raw = {};
  try {
    const data = await chrome.storage.sync.get('slpSettings');
    if (data.slpSettings) raw = data.slpSettings;
  } catch (_) {}
  render(raw);

  const debouncedSave = debounce(save, 300);

  for (const el of els.mode) {
    el.addEventListener('change', () => {
      const newMode = getRadio(els.mode) || DEFAULTS.mode;
      const parsed = parseList(els.list.value);
      if (lastMode === 'whitelist') formState.whitelist = parsed;
      else formState.blacklist = parsed;

      lastMode = newMode;
      formState.mode = newMode;
      setRadio(els.mode, newMode);

      els.list.value =
        newMode === 'whitelist'
          ? formState.whitelist.join('\n')
          : formState.blacklist.join('\n');

      syncWhitelistRecommendationVisibility();
      save();
    });
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
    const next = { ...DEFAULTS, _rev: Date.now() };
    await chrome.storage.sync.set({ slpSettings: next });
    render(next);
    flashSaved();
  });

  // Cross-tab sync: when settings change in another window (a second
  // options page, or chrome.storage.sync arriving from another device),
  // re-render the form unless the user is actively typing in the textarea.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.slpSettings) return;
    const next = changes.slpSettings.newValue || {};
    if (document.activeElement === els.list) {
      // Keep cursor position; the next save() will compare _rev and reload
      // remote data if another client wrote first.
      return;
    }
    render(next);
  });
};

init();
