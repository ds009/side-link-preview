// Auto-generate the 5 Chrome Web Store screenshots (1280×800).
//
// Usage:
//   npm run screenshots                     # run all 5
//   npm run screenshots -- --only=1,3       # run a subset
//   npm run screenshots -- --locale=zh      # render UI in zh
//
// What gets produced under store-assets/:
//   screenshot-1.png  Hero · Wikipedia + Side Panel (full toolbar) with MDN
//   screenshot-2.png  Side-Panel toolbar with populated history
//   screenshot-3.png  Options page, blacklist mode + sample domains
//   screenshot-4.png  Modifier-key bypass overlay
//   screenshot-5.png  Dark mode + Chinese options page
//
// Implementation notes:
// - Loads the unpacked extension into a fresh Chrome for Testing profile so
//   the DNR rule is active when sidepanel.html iframes the target site.
// - Drives the address bar (focus → type → Enter) instead of poking
//   private state, so the screenshots reflect real production code paths.
// - Composites the hero shot with sharp; a single 96px caption strip is
//   added on top of every shot to match the SCREENSHOT_GUIDE.md spec.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'store-assets');

const WIDTH = 1280;
const HEIGHT = 800;
const CAPTION_HEIGHT = 96;
const BODY_HEIGHT = HEIGHT - CAPTION_HEIGHT;
// Hero (#1) and toolbar (#2) split ratios — wide enough for the full side-panel bar.
const HERO_PANEL_WIDTH = 680;
const HERO_LEFT_WIDTH = WIDTH - HERO_PANEL_WIDTH;
const TOOLBAR_PANEL_WIDTH = 720;
const TOOLBAR_LEFT_WIDTH = WIDTH - TOOLBAR_PANEL_WIDTH;

const ACCENT = '#2563eb';
const ACCENT_DARK = '#1e40af';
const TEXT_ON_ACCENT = '#ffffff';

// CLI args -------------------------------------------------------------------

const argv = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v ?? true]),
);
const ONLY = argv.only ? new Set(argv.only.split(',').map(Number)) : null;
const LOCALE = argv.locale || 'en';

const want = (n) => !ONLY || ONLY.has(n);

// Helpers --------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (...a) => console.log('\x1b[36m[shot]\x1b[0m', ...a);

// SVG runs through libxml inside librsvg; keep the four illegal entities out
// of any caller-provided string so a stray `&` or `<` doesn't blow up the
// whole render.
const xml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const captionSvg = (text, { dark = false } = {}) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${CAPTION_HEIGHT}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${dark ? '#1e3a8a' : ACCENT}"/>
        <stop offset="100%" stop-color="${dark ? '#172554' : ACCENT_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${CAPTION_HEIGHT}" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          fill="${TEXT_ON_ACCENT}"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
          font-size="32" font-weight="700">${xml(text)}</text>
  </svg>`);

const writePng = async (buf, name) => {
  const out = path.join(OUT, name);
  await fs.writeFile(out, buf);
  log('→', path.relative(ROOT, out));
};

// Stack a caption strip on top of the body image. Body is expected to be
// WIDTH × BODY_HEIGHT, output is WIDTH × HEIGHT.
const withCaption = async (bodyBuf, caption, { dark = false } = {}) => {
  const cap = captionSvg(caption, { dark });
  return sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: cap, top: 0, left: 0 },
      { input: bodyBuf, top: CAPTION_HEIGHT, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
};

// Browser bootstrap ----------------------------------------------------------

const launch = async () => {
  log('launching Chrome for Testing with extension loaded…');
  const browser = await puppeteer.launch({
    headless: false, // extension service workers are most stable in headful
    defaultViewport: null,
    args: [
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,MediaRouter',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--hide-scrollbars',
      `--lang=${LOCALE === 'zh' ? 'zh-CN' : LOCALE}`,
    ],
  });

  // Wait for the extension service worker to come up so the DNR rule is
  // installed before we ever ask sidepanel.html to iframe a site.
  const swTarget = await browser.waitForTarget(
    (t) =>
      t.type() === 'service_worker' &&
      t.url().startsWith('chrome-extension://') &&
      t.url().endsWith('/background.js'),
    { timeout: 10000 },
  );
  const extensionId = new URL(swTarget.url()).host;
  log('extension id:', extensionId);
  // DNR rule registration is one tick after SW start; give it a beat.
  await sleep(500);
  // Wipe any settings carried over from a previous run (e.g. locale='zh').
  const seed = await browser.newPage();
  await seed.goto(`chrome-extension://${extensionId}/options.html`, {
    waitUntil: 'domcontentloaded',
  });
  await seed.evaluate(
    () => new Promise((r) => chrome.storage.sync.clear(() => r())),
  );
  await seed.close();
  return { browser, extensionId };
};

const newPage = async (browser, { width = WIDTH, height = HEIGHT, dark = false } = {}) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (dark) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  }
  return page;
};

// Sets the user settings before opening the options page so radios/textareas
// render with the demo state we want. Done via a tiny extension-context page.
const seedSettings = async (browser, extensionId, settings) => {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.evaluate(
    (s) =>
      new Promise((resolve) => {
        chrome.storage.sync.clear(() => {
          chrome.storage.sync.set({ slpSettings: s }, () => resolve());
        });
      }),
    settings,
  );
  await page.close();
};

// Screenshots ----------------------------------------------------------------

// Screenshot 3 — Options page in blacklist mode with sample entries.
const shootOptionsBlacklist = async (browser, extensionId) => {
  log('#3 options page · blacklist mode');
  await seedSettings(browser, extensionId, {
    mode: 'blacklist',
    blacklist: ['*.youtube.com', 'twitter.com', '*.docs.google.com', 'mail.example.com'],
    whitelist: [],
    linkScope: 'all',
    locale: LOCALE,
  });
  const page = await newPage(browser, { height: BODY_HEIGHT });
  await page.goto(`chrome-extension://${extensionId}/options.html`, {
    waitUntil: 'networkidle0',
  });
  // Let i18n finish swapping strings.
  await sleep(400);
  const body = await page.screenshot({ type: 'png' });
  await page.close();
  const caption =
    LOCALE === 'zh'
      ? '按域名黑/白名单 · 支持子域名和通配符'
      : 'Per-site blacklist or whitelist · subdomains & wildcards';
  await writePng(await withCaption(body, caption), 'screenshot-3.png');
};

// Screenshot 5 — Same options page but in dark mode + zh locale.
const shootOptionsDark = async (browser, extensionId) => {
  log('#5 options · dark mode + 中文');
  await seedSettings(browser, extensionId, {
    mode: 'blacklist',
    blacklist: ['*.youtube.com', 'twitter.com'],
    whitelist: [],
    linkScope: 'all',
    locale: 'zh',
  });
  const page = await newPage(browser, { height: BODY_HEIGHT, dark: true });
  await page.goto(`chrome-extension://${extensionId}/options.html`, {
    waitUntil: 'networkidle0',
  });
  await sleep(500);
  const body = await page.screenshot({ type: 'png' });
  await page.close();
  await writePng(
    await withCaption(body, 'Auto light + dark · 9 languages · No tracking', {
      dark: true,
    }),
    'screenshot-5.png',
  );
};

// Drives sidepanel.html through the address bar so navHistory, back/forward
// state, etc. are populated by the production code path. Sets the value
// directly + dispatches Enter (more reliable than keyboard typing when the
// page is narrow and the input scrolls).
const navigateSidePanel = async (page, url) => {
  await page.evaluate((u) => {
    const a = document.getElementById('addr');
    a.focus();
    a.value = u;
    a.dispatchEvent(new InputEvent('input', { bubbles: true }));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  }, url);
  // Iframe fires LOADED postMessage which hides the loader; wait for that.
  await page
    .waitForFunction(
      () => !document.getElementById('loader')?.classList.contains('show'),
      { timeout: 15000 },
    )
    .catch(() => {});
  // Give the iframe content a moment to paint (fonts, hero images).
  await sleep(2000);
};

// Overlay that draws the eye to the side-panel toolbar: soft tint on the left
// pane, a blue ring around `.bar`, and one evenly-spaced callout strip below.
const toolbarHighlightOverlay = (panelLeft, panelW, layout) => {
  const bar = layout?.bar;
  if (!bar) return null;

  const barY = bar.y;
  const barH = bar.h;
  const stripH = 32;
  const stripGap = 10;
  const stripY = barY + barH + stripGap;
  const stripX = panelLeft + 10;
  const stripW = panelW - 20;
  const stripText = '← Back   ·   → Forward   ·   ↻ Refresh   ·   ← Main tab   ·   − / + Zoom';

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${BODY_HEIGHT}">
    <defs>
      <filter id="pillShadow" x="-20%" y="-30%" width="140%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e3a8a" flood-opacity="0.18"/>
      </filter>
    </defs>
    <!-- Dim the companion page so the panel toolbar pops -->
    <rect x="0" y="0" width="${panelLeft}" height="${BODY_HEIGHT}" fill="rgba(15,23,42,0.10)"/>
    <!-- Slightly dim panel content below the callouts -->
    <rect x="${panelLeft}" y="${stripY + stripH + 8}" width="${panelW}"
          height="${BODY_HEIGHT - stripY - stripH - 8}" fill="rgba(15,23,42,0.06)"/>
    <!-- Toolbar highlight band -->
    <rect x="${panelLeft}" y="${barY}" width="${panelW}" height="${barH}"
          fill="rgba(37,99,235,0.10)" stroke="#2563eb" stroke-width="2.5"/>
    <!-- Single callout strip — avoids per-button pill overlap -->
    <rect x="${stripX}" y="${stripY}" width="${stripW}" height="${stripH}" rx="${stripH / 2}"
          fill="#ffffff" stroke="#2563eb" stroke-width="1.5" filter="url(#pillShadow)"/>
    <text x="${stripX + stripW / 2}" y="${stripY + stripH / 2 + 5}" text-anchor="middle"
          font-family="-apple-system,BlinkMacSystemFont,sans-serif"
          font-size="13" font-weight="600" fill="#1e40af">${xml(stripText)}</text>
  </svg>`);
};

const measureToolbarLayout = async (page) =>
  page.evaluate(() => {
    const rect = (id) => {
      const el = document.getElementById(id);
      if (!el || el.hidden) return null;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return null;
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) return null;
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const barEl = document.querySelector('.bar');
    const bar = barEl?.getBoundingClientRect();
    return {
      bar: bar ? { x: bar.x, y: bar.y, w: bar.width, h: bar.height } : null,
      back: rect('back'),
      forward: rect('forward'),
      refresh: rect('refresh'),
      openInMain: rect('open-in-main'),
      zoomOut: rect('zoom-out'),
      zoomIn: rect('zoom-in'),
    };
  });

// Screenshot 2 — Side Panel toolbar with populated history. Composed as a
// split view (companion article on the left, panel on the right) so the
// toolbar lives in real browser context and the embedded page renders at a
// readable width — not a thin strip floating in white.
//
// Deliberately different from #1 (Wikipedia + MDN): left = HN link feed,
// panel = blog-style pages with two-entry history so Back is highlighted.
const shootSidePanelToolbar = async (browser, extensionId) => {
  log('#2 side panel · toolbar with history');
  await seedSettings(browser, extensionId, {
    mode: 'blacklist',
    blacklist: [],
    whitelist: [],
    linkScope: 'all',
    locale: LOCALE,
  });

  // Wider panel so the full mini-browser toolbar (nav, address, zoom) stays visible.
  const panelW = TOOLBAR_PANEL_WIDTH;
  const leftW = TOOLBAR_LEFT_WIDTH;

  // Left companion: Hacker News — visually distinct from #1's Wikipedia.
  const leftPage = await newPage(browser, { width: leftW, height: BODY_HEIGHT });
  await leftPage.goto('https://news.ycombinator.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(1500);
  const leftShot = await leftPage.screenshot({ type: 'png' });
  await leftPage.close();

  // Right pane: side panel with two-entry history so Back is active.
  // Plain blog / FAQ pages — not MDN or Wikipedia.
  const page = await newPage(browser, { width: panelW, height: BODY_HEIGHT });
  await page.goto(
    `chrome-extension://${extensionId}/sidepanel.html?tabId=99999`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(500);
  await navigateSidePanel(page, 'https://www.paulgraham.com/ds.html');
  await navigateSidePanel(page, 'https://news.ycombinator.com/newsfaq.html');
  // Blur address bar so every toolbar control stays visible.
  await page.evaluate(() => {
    document.getElementById('addr')?.blur();
    document.querySelector('.bar')?.classList.remove('editing');
  });
  // Hover back (active — history populated) and refresh for hover highlights.
  const back = await page.$('#back');
  if (back) await back.hover();
  await sleep(120);
  const refresh = await page.$('#refresh');
  if (refresh) await refresh.hover();
  await sleep(120);
  const layout = await measureToolbarLayout(page);
  const panelShot = await page.screenshot({ type: 'png' });
  await page.close();

  const highlight = toolbarHighlightOverlay(leftW, panelW, layout);

  const body = await sharp({
    create: {
      width: WIDTH,
      height: BODY_HEIGHT,
      channels: 4,
      background: { r: 226, g: 232, b: 240, alpha: 1 },
    },
  })
    .composite([
      { input: leftShot, top: 0, left: 0 },
      { input: panelShot, top: 0, left: leftW },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="${BODY_HEIGHT}"><rect width="2" height="${BODY_HEIGHT}" fill="#cbd5e1"/></svg>`,
        ),
        top: 0,
        left: leftW - 1,
      },
      ...(highlight ? [{ input: highlight, top: 0, left: 0 }] : []),
    ])
    .png()
    .toBuffer();

  await writePng(
    await withCaption(
      body,
      'Mini browser toolbar · Back · Forward · Refresh · Zoom · Open in main tab',
    ),
    'screenshot-2.png',
  );
};

// Screenshot 1 — Hero. Wikipedia on the left, sidepanel.html (full toolbar +
// MDN inside the iframe) on the right, composited side-by-side.
const shootHero = async (browser, extensionId) => {
  log('#1 hero · split view with full panel toolbar');
  await seedSettings(browser, extensionId, {
    mode: 'blacklist',
    blacklist: [],
    whitelist: [],
    linkScope: 'all',
    locale: LOCALE,
  });

  const panelW = HERO_PANEL_WIDTH;
  const leftW = HERO_LEFT_WIDTH;

  // Left pane: Wikipedia, rendered at leftW so we get the right reflow.
  const leftPage = await newPage(browser, { width: leftW, height: BODY_HEIGHT });
  await leftPage.goto('https://en.wikipedia.org/wiki/HTML', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(1500);
  const leftShot = await leftPage.screenshot({ type: 'png' });
  await leftPage.close();

  // Right pane: Side Panel UI with full toolbar + MDN loaded inside iframe.
  const rightPage = await newPage(browser, { width: panelW, height: BODY_HEIGHT });
  await rightPage.goto(
    `chrome-extension://${extensionId}/sidepanel.html?tabId=88888`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(500);
  await navigateSidePanel(
    rightPage,
    'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe',
  );
  // Blur address bar so editing mode doesn't hide nav / zoom buttons.
  await rightPage.evaluate(() => {
    document.getElementById('addr')?.blur();
    document.querySelector('.bar')?.classList.remove('editing');
  });
  await sleep(200);
  const rightShot = await rightPage.screenshot({ type: 'png' });
  await rightPage.close();

  const body = await sharp({
    create: {
      width: WIDTH,
      height: BODY_HEIGHT,
      channels: 4,
      background: { r: 226, g: 232, b: 240, alpha: 1 },
    },
  })
    .composite([
      { input: leftShot, top: 0, left: 0 },
      { input: rightShot, top: 0, left: leftW },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="${BODY_HEIGHT}"><rect width="2" height="${BODY_HEIGHT}" fill="#cbd5e1"/></svg>`,
        ),
        top: 0,
        left: leftW - 1,
      },
    ])
    .png()
    .toBuffer();

  await writePng(
    await withCaption(body, 'Read links beside your page — fewer tabs, less switching'),
    'screenshot-1.png',
  );
};

// Screenshot 4 — Modifier-key bypass. Wikipedia in the background, an
// overlaid key-combo card shows the muscle memory.
const shootModifierKey = async (browser) => {
  log('#4 modifier-key bypass');
  const page = await newPage(browser, { height: BODY_HEIGHT });
  await page.goto('https://en.wikipedia.org/wiki/Hyperlink', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(1500);
  const bg = await page.screenshot({ type: 'png' });
  await page.close();

  // Build an SVG keycap card centered over the page.
  const cardW = 560;
  const cardH = 220;
  const cardX = Math.floor((WIDTH - cardW) / 2);
  const cardY = Math.floor((BODY_HEIGHT - cardH) / 2);
  const cardSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.28"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <rect rx="20" ry="20" width="${cardW}" height="${cardH}" fill="#ffffff"/>
    </g>
    <g font-family="-apple-system, BlinkMacSystemFont, sans-serif" text-anchor="middle">
      <text x="${cardW / 2}" y="58" font-size="20" font-weight="600" fill="#475569">Hold any modifier · skip the panel</text>
      <g transform="translate(${cardW / 2 - 240}, 88)">
        ${['⌘', 'Ctrl', '⇧', 'Alt']
          .map(
            (k, i) => `
          <g transform="translate(${i * 130}, 0)">
            <rect rx="14" ry="14" width="110" height="64" fill="#f1f5f9" stroke="#cbd5e1"/>
            <text x="55" y="42" font-size="22" font-weight="700" fill="#0f172a">${xml(k)}</text>
          </g>`,
          )
          .join('')}
      </g>
      <text x="${cardW / 2}" y="195" font-size="18" font-weight="500" fill="#64748b">+ click → real new tab</text>
    </g>
  </svg>`);

  // Apply a subtle dim+blur on top of the page so the card pops.
  const dimmed = await sharp(bg)
    .blur(2)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${BODY_HEIGHT}">
             <rect width="${WIDTH}" height="${BODY_HEIGHT}" fill="rgba(15,23,42,0.18)"/>
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: cardSvg, top: cardY, left: cardX },
    ])
    .png()
    .toBuffer();

  await writePng(
    await withCaption(dimmed, '⌘ / Ctrl / Shift / Alt · always behave like a normal new tab'),
    'screenshot-4.png',
  );
};

// Main -----------------------------------------------------------------------

const main = async () => {
  await fs.mkdir(OUT, { recursive: true });
  const { browser, extensionId } = await launch();
  try {
    if (want(3)) await shootOptionsBlacklist(browser, extensionId);
    if (want(5)) await shootOptionsDark(browser, extensionId);
    if (want(2)) await shootSidePanelToolbar(browser, extensionId);
    if (want(1)) await shootHero(browser, extensionId);
    if (want(4)) await shootModifierKey(browser);
  } finally {
    await browser.close();
  }
  log('done.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
