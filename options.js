const DEFAULTS = {
  mode: 'blacklist',
  blacklist: [],
  whitelist: [],
  linkScope: 'all',
  openTrigger: 'click',
  hoverOpen: false,
  hoverDelayMs: 2000,
  locale: detectBrowserLocale(),
};

const normalizeLocale = (loc) => {
  if (loc && LOCALE_LABELS[loc]) return loc;
  return detectBrowserLocale();
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  mode: $$('input[name="mode"]'),
  includeNonBlank: $('#includeNonBlank'),
  list: $('#list'),
  whitelistReco: $('#whitelistReco'),
  locale: $('#locale'),
  clickOpenMode: $$('input[name="clickOpenMode"]'),
  hoverOpen: $('#hoverOpen'),
  hoverRow: $('#hoverRow'),
  hoverAlsoRow: $('#hoverAlsoRow'),
  hoverDelayMs: $('#hoverDelayMs'),
  hoverDelayWrap: $('#hoverDelayWrap'),
  hintOpenTriggerClick: $('#hintOpenTriggerClick'),
  hintOpenTriggerMiddle: $('#hintOpenTriggerMiddle'),
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

const populateLocaleSelect = () => {
  if (!els.locale) return;
  els.locale.replaceChildren();
  for (const code of SUPPORTED_LOCALES) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = LOCALE_LABELS[code];
    els.locale.appendChild(opt);
  }
};

const getClickOpenMode = () =>
  getRadio(els.clickOpenMode) || DEFAULTS.openTrigger;

const syncOpenTriggerUi = () => {
  const mode = getClickOpenMode();
  const clickMode = mode === 'click';
  const middleMode = mode === 'middle-click';
  const hoverOn = !!els.hoverOpen?.checked;

  if (els.hintOpenTriggerClick)
    els.hintOpenTriggerClick.hidden = !clickMode;
  if (els.hintOpenTriggerMiddle)
    els.hintOpenTriggerMiddle.hidden = !middleMode;

  if (els.hoverDelayMs) els.hoverDelayMs.disabled = !hoverOn;
  if (els.hoverDelayWrap) {
    els.hoverDelayWrap.classList.toggle('disabled', !hoverOn);
  }
};

const syncHoverDelayVisibility = () => {
  syncOpenTriggerUi();
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
  const clickMode =
    formState.openTrigger === 'middle-click' ? 'middle-click' : 'click';
  setRadio(els.clickOpenMode, clickMode);
  if (els.hoverOpen) els.hoverOpen.checked = !!formState.hoverOpen;
  if (els.hoverDelayMs) els.hoverDelayMs.value = formState.hoverDelayMs;
  syncOpenTriggerUi();
  els.list.value =
    formState.mode === 'whitelist'
      ? formState.whitelist.join('\n')
      : formState.blacklist.join('\n');
  els.locale.value = normalizeLocale(formState.locale);
  syncWhitelistRecommendationVisibility();
};

const readForm = () => {
  flushTextareaIntoFormState();
  const clickMode = getClickOpenMode();
  return {
    mode: getRadio(els.mode) || DEFAULTS.mode,
    blacklist: [...formState.blacklist],
    whitelist: [...formState.whitelist],
    linkScope: els.includeNonBlank.checked ? 'all' : 'blank-only',
    openTrigger: clickMode,
    hoverOpen: !!els.hoverOpen?.checked,
    hoverDelayMs: Math.min(
      3000,
      Math.max(
        200,
        parseInt(els.hoverDelayMs?.value, 10) || DEFAULTS.hoverDelayMs,
      ),
    ),
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
// headroom: anything above SYNC_ITEM_SOFT_LIMIT is rejected here with a friendly
// message, so the user trims their domain list instead of eventually hitting
// a cryptic "QUOTA_BYTES_PER_ITEM" error thrown by set().

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
  const size = settingsByteLength(next);
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
  populateLocaleSelect();
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
  for (const el of els.clickOpenMode) {
    el.addEventListener('change', () => {
      syncOpenTriggerUi();
      save();
    });
  }
  els.hoverOpen?.addEventListener('change', () => {
    syncHoverDelayVisibility();
    save();
  });
  els.hoverDelayMs?.addEventListener('change', save);
  els.hoverDelayMs?.addEventListener('input', debouncedSave);
  els.list.addEventListener('input', debouncedSave);
  els.locale.addEventListener('change', save);

  els.reset.addEventListener('click', async () => {
    const msg = t(
      'reset_confirm',
      'Reset to defaults? The domain list will be cleared.',
    );
    if (!confirm(msg)) return;
    const next = {
      ...DEFAULTS,
      locale: detectBrowserLocale(),
      _rev: Date.now(),
    };
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
