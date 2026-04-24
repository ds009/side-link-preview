const params = new URLSearchParams(location.search);
let tabId = Number(params.get('tabId')) || null;

const frame = document.getElementById('frame');
const addr = document.getElementById('addr');
const tip = document.getElementById('tip');
const empty = document.getElementById('empty');
const goBtn = document.getElementById('go');
const popBtn = document.getElementById('pop');

let loadTimer = null;
let currentUrl = '';

const load = (url) => {
  if (!url) return;
  currentUrl = url;
  addr.value = url;
  tip.classList.remove('show');
  empty.classList.add('hidden');
  frame.style.display = '';
  frame.src = url;

  // iframe 无法可靠感知 X-Frame-Options 错误，用超时 + load 事件组合判断
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    // 若 3 秒内 iframe 仍是 about:blank 或无法访问，提示用户
    try {
      // 跨域时访问 contentDocument 会抛错，这种情况下说明已经加载成功
      const doc = frame.contentDocument;
      if (doc && doc.location.href === 'about:blank') {
        showBlockedTip();
      }
    } catch (_) {
      // 跨域，正常加载
    }
  }, 3000);
};

const showBlockedTip = () => {
  frame.style.display = 'none';
  tip.classList.add('show');
};

frame.addEventListener('load', () => {
  clearTimeout(loadTimer);
});

frame.addEventListener('error', showBlockedTip);

goBtn.addEventListener('click', () => load(addr.value.trim()));
addr.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') load(addr.value.trim());
});
popBtn.addEventListener('click', () => {
  if (currentUrl) chrome.tabs.create({ url: currentUrl });
});

// 如果 background 调 setOptions 还没生效就 open 了，URL 里会缺 tabId，
// 这里兜底去查当前 active tab。
const resolveTabId = async () => {
  if (tabId) return tabId;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tab?.id) tabId = tab.id;
  } catch (err) {
    console.warn('[SideLinkPreview] tabs.query:', err);
  }
  return tabId;
};

const readInitialUrl = async () => {
  const id = await resolveTabId();
  if (!id) return;
  const key = `sp_url_${id}`;
  const data = await chrome.storage.session.get(key);
  if (data[key]) load(data[key]);
};

readInitialUrl();

// 监听会话存储变化：同一 tab 内再次点击链接时刷新侧边栏
chrome.storage.session.onChanged.addListener(async (changes) => {
  const id = await resolveTabId();
  if (!id) return;
  const key = `sp_url_${id}`;
  const change = changes[key];
  if (change?.newValue && change.newValue !== currentUrl) {
    load(change.newValue);
  }
});

// Side Panel 内的 iframe（及其嵌套 iframe）里的 content.js 在用户点击链接时
// 会向 window.top 发此消息，这里接收后就地换 iframe 的 URL，实现「Side Panel
// 内继续浏览」。
window.addEventListener('message', (e) => {
  const data = e.data;
  if (!data || data.__slp !== 1) return;
  if (data.type === 'NAVIGATE' && typeof data.url === 'string') {
    if (data.url !== currentUrl) load(data.url);
  }
});
