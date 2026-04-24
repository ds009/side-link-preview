const DEFAULTS = {
  mode: 'blacklist',
  list: [],
  trigger: 'click',
  hoverDelay: 500,
  linkScope: 'blank-only',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  mode: $$('input[name="mode"]'),
  trigger: $$('input[name="trigger"]'),
  linkScope: $$('input[name="linkScope"]'),
  list: $('#list'),
  hoverDelay: $('#hoverDelay'),
  hoverDelayRow: $('#hoverDelayRow'),
  hoverNote: $('#hoverNote'),
  status: $('#status'),
  reset: $('#reset'),
};

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

const syncTriggerUi = (trigger) => {
  const isHover = trigger === 'hover';
  els.hoverDelay.disabled = !isHover;
  els.hoverDelayRow.classList.toggle('disabled', !isHover);
  els.hoverNote.hidden = !isHover;
};

const render = (s) => {
  setRadio(els.mode, s.mode);
  setRadio(els.trigger, s.trigger);
  setRadio(els.linkScope, s.linkScope);
  els.list.value = s.list.join('\n');
  els.hoverDelay.value = s.hoverDelay;
  syncTriggerUi(s.trigger);
};

const readForm = () => ({
  mode: getRadio(els.mode) || DEFAULTS.mode,
  trigger: getRadio(els.trigger) || DEFAULTS.trigger,
  linkScope: getRadio(els.linkScope) || DEFAULTS.linkScope,
  list: parseList(els.list.value),
  hoverDelay: clampHoverDelay(els.hoverDelay.value),
});

let statusTimer = null;
const flashSaved = () => {
  els.status.textContent = '已保存';
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
    els.status.textContent = '保存失败：' + err.message;
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

  for (const el of [...els.mode, ...els.trigger, ...els.linkScope]) {
    el.addEventListener('change', save);
  }
  els.list.addEventListener('input', debouncedSave);
  els.hoverDelay.addEventListener('input', debouncedSave);
  els.hoverDelay.addEventListener('blur', save);

  els.reset.addEventListener('click', async () => {
    if (!confirm('恢复默认设置？当前的域名列表会被清空。')) return;
    await chrome.storage.sync.set({ slpSettings: { ...DEFAULTS } });
    render({ ...DEFAULTS });
    flashSaved();
  });
};

init();
