# Side Link Preview

<p>
  <!-- TODO: replace REPLACE_WITH_EXTENSION_ID after the Web Store listing is approved -->
  <a href="https://chromewebstore.google.com/detail/REPLACE_WITH_EXTENSION_ID">
    <img alt="Add to Chrome" src="https://img.shields.io/badge/Add%20to%20Chrome-Free-2563eb?logo=googlechrome&logoColor=white" />
  </a>
  <a href="https://ds009.github.io/side-link-preview/">
    <img alt="Website" src="https://img.shields.io/badge/Website-ds009.github.io-475569?logo=githubpages&logoColor=white" />
  </a>
  <a href="https://github.com/sponsors/ds009">
    <img alt="Sponsor" src="https://img.shields.io/badge/Sponsor-♥-db2777?logo=githubsponsors&logoColor=white" />
  </a>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-16a34a" />
</p>

Intercepts `target="_blank"` links and opens them in Chrome's Side Panel — an Arc-style split view and Edge-style side-by-side reading, built for stock Chrome. Not affiliated with The Browser Company or Microsoft.

> If this extension saves you tab-juggling time, consider [sponsoring on GitHub](https://github.com/sponsors/ds009). It keeps the project maintained and ad‑free.

## Features

- Automatically intercepts outgoing links and loads them in the Side Panel on the right
- Modifier-key click bypasses the Side Panel and uses an explicit, distinct behavior per modifier:
  - `⌘` / `Ctrl` → new background tab
  - `⌘`+`⇧` / `Ctrl`+`⇧` → new foreground tab
  - `⇧` → new window
  - `⌥` / `Alt` → current tab (overrides `target="_blank"` so the link opens in place)
- Side Panel comes with a built-in address bar and a "pop out to new tab" button
- Clicking another link in the same tab refreshes the Side Panel in place
- **Keyboard shortcut** `Alt+Shift+P` to preview the current tab in the Side Panel
- **Right-click context menu** "Open link in Side Panel" — one-shot bypass of blacklist / link-scope rules
- **Automatic light / dark theme** following your OS
- **Configurable options page**:
  - Blacklist / whitelist mode (per-domain, subdomain-aware)
  - Trigger: click or hover (with configurable hover delay)
  - Optionally also send non-`_blank` (same-tab) links to the side panel
  - UI language: English (default), 中文, Français, Español, Deutsch, Português

## Install

**From the Chrome Web Store** (recommended):

> ⚠️ Pending review — link will be live once the listing is approved.
> Once it is, the badge above and this link will point to it:
> `https://chromewebstore.google.com/detail/REPLACE_WITH_EXTENSION_ID`

**From source** (developer mode):

1. Open `chrome://extensions`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked** and select this directory
4. Visit any web page and click a link — it will open in the Side Panel
5. Back on `chrome://extensions`, find this extension → **Details** → **Extension options** to configure it

## Options

Two ways to open the options page:
- `chrome://extensions` → Side Link Preview → **Details** → **Extension options**
- Right-click the extension icon → **Options**

### Language

The options page and side panel UI support: **English** (default), **中文**, **Français**, **Español**, **Deutsch**, **Português**. Pick one from the `Language` dropdown on the options page; the side panel updates automatically.

### Scope

- **Blacklist** (default): enabled on every site *except* those in the list
- **Whitelist**: enabled *only* on sites in the list

Domain matching rules:
- Entering `example.com` also matches `www.example.com`, `blog.example.com`, and other subdomains
- `*` wildcard is supported (e.g. `*example*` matches any hostname containing `example`)

### Trigger

- **Click** is always on. A single click on an eligible link opens it in the Side Panel.
- **Hover** is an optional add-on. Enable **"Also preview on hover"** to additionally get an automatic preview after pointing at a link longer than the configured delay. Click and hover then work together — hover opens the panel as you move, clicking still opens the exact link you want.

> ⚠️ Hover previews only fire when the Side Panel is **already open** (because `chrome.sidePanel.open()` requires a user gesture, and hovering doesn't qualify). To make this painless, the options page shows an **"Open side panel now"** button whenever hover is enabled — click it once per browser window and hover previews start working immediately. You can also open the panel from the toolbar icon.

### Link scope

By default the extension only intercepts `<a target="_blank">` links — the ones a page explicitly asks to open in a new tab. Regular same-tab navigation on the site is untouched.

Enable the **"Also open non-_blank links in the side panel"** toggle to additionally send ordinary `<a>` clicks (without `target="_blank"`) to the side panel. This is more aggressive: most in-page navigation will then be previewed in the panel instead of reloading the current tab.

### Modifier-key click

Each modifier maps to a distinct, predictable behavior — the Side Panel is **never** used when a modifier is held:

| Modifier | Action |
| --- | --- |
| `⌘` / `Ctrl` | New tab (background) |
| `⌘`+`⇧` / `Ctrl`+`⇧` | New tab (foreground) |
| `⇧` | New window |
| `⌥` / `Alt` | Current tab (in place) |

The `⌥` mapping is the one to remember when you don't want a new tab — for example to "follow the link without losing your scroll position".

This works for both native `<a target="_blank">` clicks and links that go through `window.open()`: the content script briefly tells `injected.js` to disarm its `window.open` hijack so the page's intended behavior runs.

## Known limitations

- Requires Chrome ≥ 119 (Side Panel API + `match_origin_as_fallback` for clean injection into sandboxed iframes)
- Only one Side Panel exists per Chrome window; it updates its content as you switch tabs
- Chrome's native Split View has no public extension API at the moment (2026-04), which is why this extension still uses Side Panel + iframe

## Compatibility FAQ

<details>
<summary><strong>Does it work on Microsoft Edge / Brave / Arc / Vivaldi?</strong></summary>

| Browser         | Works?     | Notes                                                                                           |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Google Chrome   | Yes (≥119) | Primary target.                                                                                 |
| Microsoft Edge  | Yes (≥119) | Edge has its own "Split Screen" — this extension gives you the same flow on any Edge profile.   |
| Brave           | Yes        | Side panel API is implemented.                                                                  |
| Arc (Chromium)  | Partial    | Arc's own "Little Arc" already does this natively for new tabs; the extension still works but is often redundant. |
| Vivaldi         | Not tested | Side Panel API status varies by version.                                                        |
| Opera           | Not tested | Chromium-based but extensions API is not guaranteed.                                            |
| Safari          | No         | Safari has no compatible side panel extension API.                                              |
| Firefox         | No         | Manifest V3 support + Side Panel API differ substantially.                                      |

</details>

<details>
<summary><strong>Why does a certain page fail to load in the Side Panel?</strong></summary>

Some pages really cannot be embedded — most often because of:

- `frame-ancestors 'none'` CSP that stays even after header stripping (when delivered via `<meta>` tag rather than HTTP header)
- Server-side "if we're inside an iframe, redirect away" logic
- Pages that require a first-party cookie, which the iframe may not carry
- Banking, OAuth consent screens, and other security-critical flows — these are excluded on purpose (see `manifest.json`'s `exclude_matches`)

When a page truly refuses to load, the Side Panel shows a fallback card with a "Open in new tab" button.

</details>

<details>
<summary><strong>Does it intercept my password / credit card?</strong></summary>

No. The extension never injects into known sign-in, SSO or payment hosts (Google / Apple / Microsoft / AWS accounts, Okta, Auth0, Duo, OneLogin, Stripe Checkout, PayPal…). See `manifest.json` → `exclude_matches`. Nothing you type is read or logged by the extension on any site.

</details>

<details>
<summary><strong>Does it sync my settings between devices?</strong></summary>

Yes — via `chrome.storage.sync`, which is Chrome's built-in profile sync. The extension itself has no server. There is a soft size limit (~7.5 KB) for the domain list, which is plenty for hundreds of entries.

</details>

## Project layout

```
side-link-preview/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker: opens the Side Panel + registers DNR rules
├── content.js         # Content script (ISOLATED world): intercepts link clicks / hover
├── injected.js        # Page script (MAIN world): hijacks window.open + anti frame-busting
├── sidepanel.html     # Side Panel UI
├── sidepanel.js       # Side Panel logic
├── options.html       # Options page
├── options.js         # Options page logic
├── i18n.js            # Lightweight i18n runtime (shared by options + sidepanel)
├── locales/           # en / zh / fr / es / de / pt translation files
└── icons/             # 16 / 32 / 48 / 128 px extension icons
```

## Compatibility notes

Some rich-interaction sites don't use native `<a target="_blank">` navigation. Instead they `preventDefault()` on `mousedown` and then call `window.open(url, '_blank')` from JS. The extension covers both paths:

1. `content.js` intercepts `<a target="_blank">` on `mousedown` / `click` / `auxclick` during the capture phase, so the site's synthetic event system can't swallow it.
2. `injected.js` runs in the page's main world and hijacks `window.open`, forwarding the opened URL to the content script and then into the Side Panel.

## Embedding sites that refuse iframes

To let sites that set `X-Frame-Options` / `CSP: frame-ancestors` still load inside the Side Panel, the extension:

1. Uses a `declarativeNetRequest` dynamic rule to strip `X-Frame-Options` and `Content-Security-Policy` response headers — **but only on iframe requests initiated by this extension's Side Panel**. The rule is scoped with `initiatorDomains: [chrome.runtime.id]`:
   - When you browse any site normally, the site's security policies are untouched
   - Only when you explicitly open a URL in the Side Panel does that single request have those two headers stripped
2. Overrides `window.top` / `window.parent` / `frameElement` to `window.self` inside Side Panel iframes, suppressing JS-level frame-busting.

> ⚠️ Any third-party site embedded in an iframe loses one layer of context isolation. This extension is intended for personal reading and link previewing only — don't sign in to sensitive accounts or enter payment information inside the Side Panel.

## Privacy

This extension does not collect, transmit, or track any user data. All user settings live in Chrome's `storage.sync` (synced by your browser profile). See [PRIVACY.md](./PRIVACY.md) for details.

## Sponsor

This extension is free, open source, and has no ads or tracking. If it saves you time day to day, please consider supporting further development:

- 💖 [**Sponsor on GitHub**](https://github.com/sponsors/ds009) — one-time or monthly, any amount helps

Other ways to help without money are equally appreciated:

- ⭐ Star [the repository](https://github.com/ds009/side-link-preview)
- 🐞 File issues with reproducible steps
- 📣 Share the Chrome Web Store page with people who live in their browser

Thanks to everyone who sponsors, reports bugs, and spreads the word. 🙏
