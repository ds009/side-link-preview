const DEFAULTS = {
  mode: 'blacklist',
  list: [],
  trigger: 'click',
  hoverDelay: 500,
  linkScope: 'blank-only',
  locale: 'en',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  mode: $$('input[name="mode"]'),
  trigger: $$('input[name="trigger"]'),
  includeNonBlank: $('#includeNonBlank'),
  list: $('#list'),
  hoverDelay: $('#hoverDelay'),
  hoverDelayRow: $('#hoverDelayRow'),
  hoverNote: $('#hoverNote'),
  clickNote: $('#clickNote'),
  locale: $('#locale'),
  status: $('#status'),
  reset: $('#reset'),
};

const t = (key, fallback) => window.SLP_I18N?.t?.(key, fallback) ?? (fallback ?? key);

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

const clampHoverDelay = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULTS.hoverDelay;
  return Math.max(100, Math.min(5000, Math.round(n)));
};

const normalizeLocale = (loc) => {
  const allowed = window.SLP_I18N?.LOCALES || { en: 1 };
  return allowed[loc] ? loc : DEFAULTS.locale;
};

const syncTriggerUi = (trigger) => {
  const isHover = trigger === 'hover';
  els.hoverDelay.disabled = !isHover;
  els.hoverDelayRow.classList.toggle('disabled', !isHover);
  els.hoverNote.hidden = !isHover;
  if (els.clickNote) els.clickNote.hidden = isHover;
};

const render = (s) => {
  setRadio(els.mode, s.mode);
  setRadio(els.trigger, s.trigger);
  els.includeNonBlank.checked = s.linkScope === 'all';
  els.list.value = s.list.join('\n');
  els.hoverDelay.value = s.hoverDelay;
  els.locale.value = normalizeLocale(s.locale);
  syncTriggerUi(s.trigger);
};

const readForm = () => ({
  mode: getRadio(els.mode) || DEFAULTS.mode,
  trigger: getRadio(els.trigger) || DEFAULTS.trigger,
  linkScope: els.includeNonBlank.checked ? 'all' : 'blank-only',
  list: parseList(els.list.value),
  hoverDelay: clampHoverDelay(els.hoverDelay.value),
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

const save = async () => {
  const next = readForm();
  try {
    await chrome.storage.sync.set({ slpSettings: next });
    syncTriggerUi(next.trigger);
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
    if (data.slpSettings) s = { ...DEFAULTS, ...data.slpSettings };
  } catch (_) {}
  render(s);

  const debouncedSave = debounce(save, 300);

  for (const el of [...els.mode, ...els.trigger]) {
    el.addEventListener('change', save);
  }
  els.includeNonBlank.addEventListener('change', save);
  els.list.addEventListener('input', debouncedSave);
  els.hoverDelay.addEventListener('input', debouncedSave);
  els.hoverDelay.addEventListener('blur', save);
  els.locale.addEventListener('change', save);

  els.reset.addEventListener('click', async () => {
    const msg = t('reset_confirm', 'Reset to defaults? The domain list will be cleared.');
    if (!confirm(msg)) return;
    const next = { ...DEFAULTS };
    await chrome.storage.sync.set({ slpSettings: next });
    render(next);
    flashSaved();
  });
};

init();
