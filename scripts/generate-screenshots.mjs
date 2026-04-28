// Auto-generate the 5 Chrome Web Store screenshots (1280×800).
//
// Usage:
//   npm run screenshots                     # run all 5
//   npm run screenshots -- --only=1,3       # run a subset
//   npm run screenshots -- --locale=zh      # render UI in zh
//
// What gets produced under store-assets/:
//   screenshot-1.png  Hero · Wikipedia (left) ↔ MDN inside Side Panel (right)
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
const PANEL_WIDTH = 460;
const LEFT_WIDTH = WIDTH - PANEL_WIDTH;
const BODY_HEIGHT = HEIGHT - CAPTION_HEIGHT;

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
    list: ['*.youtube.com', 'twitter.com', '*.docs.google.com', 'mail.example.com'],
    linkScope: 'blank-only',
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
    list: ['*.youtube.com', 'twitter.com'],
    linkScope: 'blank-only',
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
    await withCaption(body, 'Auto light + dark · 6 languages · No tracking', {
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

// Screenshot 2 — Side Panel toolbar with populated history. Composed as a
// split view (companion article on the left, panel on the right) so the
// toolbar lives in real browser context and the embedded page renders at a
// readable width — not a thin strip floating in white.
const shootSidePanelToolbar = async (browser, extensionId) => {
  log('#2 side panel · toolbar with history');
  await seedSettings(browser, extensionId, {
    mode: 'blacklist',
    list: [],
    linkScope: 'blank-only',
    locale: LOCALE,
  });

  // Wider panel than the hero so toolbar + content both read large.
  const panelW = 720;
  const leftW = WIDTH - panelW;

  // Left companion: a real Wikipedia article — different from #1 ("HTML")
  // so the deck doesn't repeat itself.
  const leftPage = await newPage(browser, { width: leftW, height: BODY_HEIGHT });
  await leftPage.goto('https://en.wikipedia.org/wiki/Web_browser', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(1500);
  const leftShot = await leftPage.screenshot({ type: 'png' });
  await leftPage.close();

  // Right pane: side panel with two-entry history so Back is active.
  const page = await newPage(browser, { width: panelW, height: BODY_HEIGHT });
  await page.goto(
    `chrome-extension://${extensionId}/sidepanel.html?tabId=99999`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(500);
  await navigateSidePanel(page, 'https://en.wikipedia.org/wiki/Hyperlink');
  await navigateSidePanel(
    page,
    'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe',
  );
  // Hover the back button so it picks up its hover highlight.
  const back = await page.$('#back');
  if (back) await back.hover();
  await sleep(200);
  const panelShot = await page.screenshot({ type: 'png' });
  await page.close();

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
      // Subtle 2-pixel divider so the panel edge reads as "side panel".
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
    await withCaption(body, 'Mini browser inside the panel · Back · Forward · Refresh'),
    'screenshot-2.png',
  );
};

// Screenshot 1 — Hero. Wikipedia full-width on the left, sidepanel.html
// (with MDN loaded inside) on the right, composited side-by-side.
const shootHero = async (browser, extensionId) => {
  log('#1 hero · split view');
  await seedSettings(browser, extensionId, {
    mode: 'blacklist',
    list: [],
    linkScope: 'blank-only',
    locale: LOCALE,
  });

  // Left pane: Wikipedia, rendered at LEFT_WIDTH so we get the right reflow.
  // "HTML" is on-topic with the right-pane MDN <iframe> doc and is a real
  // article (avoid redirect/no-article pages).
  const leftPage = await newPage(browser, { width: LEFT_WIDTH, height: BODY_HEIGHT });
  await leftPage.goto('https://en.wikipedia.org/wiki/HTML', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(1500);
  const leftShot = await leftPage.screenshot({ type: 'png' });
  await leftPage.close();

  // Right pane: Side Panel UI loading MDN.
  const rightPage = await newPage(browser, { width: PANEL_WIDTH, height: BODY_HEIGHT });
  await rightPage.goto(
    `chrome-extension://${extensionId}/sidepanel.html?tabId=88888`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(300);
  await navigateSidePanel(
    rightPage,
    'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe',
  );
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
      { input: rightShot, top: 0, left: LEFT_WIDTH },
      // Subtle 2-pixel divider so the split is visually distinct.
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="${BODY_HEIGHT}"><rect width="2" height="${BODY_HEIGHT}" fill="#cbd5e1"/></svg>`,
        ),
        top: 0,
        left: LEFT_WIDTH - 1,
      },
    ])
    .png()
    .toBuffer();

  await writePng(
    await withCaption(body, 'Click any link → opens side-by-side, in stock Chrome'),
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
