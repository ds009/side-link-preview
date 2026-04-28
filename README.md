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

Click any link → it opens in Chrome's Side Panel on the right, side-by-side with the page you came from. A split-view reading workflow on stock Chrome, no new browser, no new tab.

> Side Link Preview is independent and is not affiliated with, endorsed by, or sponsored by The Browser Company of New York or Microsoft. References to "Arc" and "Edge" are descriptive only.

> If this extension saves you tab-juggling time, consider [sponsoring on GitHub](https://github.com/sponsors/ds009). It keeps the project maintained and ad-free.

## Features

- **Click-to-preview** — every outgoing link that would normally open a new tab loads in Chrome's Side Panel on the right.
- **Modifier keys still do what you expect** — `⌘`/`Ctrl`, `⌘+⇧`/`Ctrl+⇧`, `⇧`, `⌥`/`Alt` always bypass the panel and behave like the browser default.
- **Side-Panel address bar** with **Back / Forward / Refresh** buttons that appear once you have history; auto-collapses on narrow widths.
- **In-panel loading indicator** + **single auto-retry** on transient embed failures, then a friendly "open in a new tab" fallback card.
- **Smart link filtering (10 rules)** — same-page anchors, downloads, mixed content, login/OAuth pages, localhost, etc. all open natively instead of in the panel. Full list in [`content.js`](./content.js).
- **Per-site enable/disable** with subdomain-aware blacklist or whitelist mode, plus extensive built-in `exclude_matches` for sign-in / SSO / payment hosts.
- **Right-click context menu** "Open link in Side Panel" — a one-shot bypass of every rule.
- **Keyboard shortcut** `Alt+Shift+P` to open the current tab inside the Side Panel.
- **Automatic light / dark theme** following your OS, plus six built-in UI languages (English, 中文, Français, Español, Deutsch, Português).
- **Zero analytics, zero tracking, zero ads.** All data stays on your device. See [PRIVACY.md](./PRIVACY.md).

## Install

**From the Chrome Web Store** (recommended):

> ⚠️ Pending review — link will be live once the listing is approved.
> The badge above and this link will then point to it:
> `https://chromewebstore.google.com/detail/REPLACE_WITH_EXTENSION_ID`

**From source** (developer mode):

1. Open `chrome://extensions`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked** and select this directory
4. Visit any web page and click a link — it opens in the Side Panel
5. On `chrome://extensions`, click the extension's **Details** → **Extension options** to configure it

## Side Panel UI

| Button | What it does |
| --- | --- |
| `←` / `→` | Back / Forward through the panel's local history (appear when there is something to navigate to). |
| `↻` | Reload the current page in the panel. Resets retry counter. |
| Address input | Click to edit. Other buttons collapse so the input gets the full width. Press Enter or click **Go** to load. Esc cancels and restores the previous URL. Bare hosts like `google.com` get auto-prefixed with `https://`. |
| **Go** | Submit the URL above. |
| ⚙ | Open the Settings page in a new tab. |

## Options

Two ways to open the options page:

- `chrome://extensions` → Side Link Preview → **Details** → **Extension options**
- Right-click the extension icon → **Options**

### Language

Six languages are bundled: **English** (default), **中文**, **Français**, **Español**, **Deutsch**, **Português**. Select one from the **Language** dropdown; the side panel updates automatically.

### Scope (per-site enable / disable)

- **Blacklist** (default): the extension is enabled on every site **except** those listed.
- **Whitelist**: the extension is enabled **only** on listed sites.

Domain matching:

- `example.com` matches `example.com`, `www.example.com`, `blog.example.com`, and any other subdomain.
- `*` is a wildcard: `*example*` matches any hostname containing `example`.

When you visit a disabled site, the Side Panel auto-closes and the extension makes itself fully inert on that page — link clicks behave exactly the way the browser would handle them natively.

### Link scope

By default the extension only intercepts `<a target="_blank">` links — the ones a page explicitly asks to open in a new tab. Regular same-tab navigation is untouched.

Enable **"Also open non-`_blank` links in the side panel"** to additionally route ordinary `<a>` clicks (without `target="_blank"`) into the panel. This is more aggressive: most in-page navigation will then preview in the panel instead of reloading the current tab.

### Modifier-key click

Each modifier maps to a distinct, predictable behavior — the Side Panel is **never** used when a modifier is held:

| Modifier | Action |
| --- | --- |
| `⌘` / `Ctrl` | New tab (background) |
| `⌘`+`⇧` / `Ctrl`+`⇧` | New tab (foreground) |
| `⇧` | New window |
| `⌥` / `Alt` | Current tab (in place) |

`⌥` / `Alt` is the one to remember when you don't want a new tab — for example to "follow the link without losing your scroll position".

This works for both native `<a target="_blank">` clicks and links that route through `window.open()`: the content script briefly tells `injected.js` to disarm its `window.open` hijack so the page's intended behavior runs.

## Link filtering rules

To keep the panel out of your way, the extension also **skips** Side-Panel preview when a link matches any of:

- **Same page** — only the URL fragment / query differs from the current page.
- **`<a download>` attribute** — the page is asking for a download.
- **`target="_top"` / `_parent`** — the page is asking to navigate out of a frame.
- **`rel="external"` / `rel="alternate"`** — semantic markers for off-site or alternate-format links.
- **Mixed content** — the panel is HTTPS-equivalent, so HTTP child resources would never render.
- **Known download / media file extensions** — `.pdf`, `.zip`, `.mp4`, etc.
- **Localhost / private IPs / `.local` mDNS** — almost always developer tooling.
- **Login / SSO / OAuth paths** — `/login`, `/signin`, `/sso`, `/saml`, `/oauth`, `/auth`.
- **Disabled destination host** — link target host is on the user's disable list.
- **Nested third-party iframes** — clicks inside YouTube embeds, Disqus, ads, social widgets etc. are left alone.

`chrome://`, `chrome-extension://` and other internal pages are also automatically excluded — clicking the toolbar icon there is a no-op.

## Known limitations

- Requires Chrome ≥ 119 (Side Panel API + `match_origin_as_fallback` for clean injection into sandboxed iframes).
- One Side Panel per Chrome window; it updates its content as you switch tabs.
- Chrome's native Split View has no public extension API at the moment (2026-04), which is why this extension uses Side Panel + iframe instead.
- Newly opened tabs that already existed before installing or upgrading the extension need a single refresh before clicks are intercepted there.

## Compatibility FAQ

<details>
<summary><strong>Does it work on Microsoft Edge / Brave / Arc / Vivaldi?</strong></summary>

| Browser         | Works?     | Notes                                                                                           |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Google Chrome   | Yes (≥119) | Primary target.                                                                                 |
| Microsoft Edge  | Yes (≥119) | Edge has its own "Split Screen" — this extension delivers the same flow on any Edge profile.    |
| Brave           | Yes        | Side Panel API is implemented.                                                                  |
| Arc (Chromium)  | Partial    | Arc already has "Little Arc" for new tabs; this extension still works but is often redundant.   |
| Vivaldi         | Not tested | Side Panel API status varies by version.                                                        |
| Opera           | Not tested | Chromium-based but extension API surface is not guaranteed.                                     |
| Safari          | No         | Safari has no compatible side-panel extension API.                                              |
| Firefox         | No         | Manifest V3 and Side Panel API differ substantially.                                            |

</details>

<details>
<summary><strong>Why does a certain page fail to load in the Side Panel?</strong></summary>

Some pages truly cannot be embedded — most often because of:

- `frame-ancestors 'none'` set via `<meta>` tag (HTTP-header stripping does not affect meta-CSP).
- Server-side "if I'm inside an iframe, redirect away" logic.
- Pages that depend on a first-party cookie the iframe may not carry.
- Banking, OAuth consent screens, and other security-critical flows — the extension excludes these on purpose (see `manifest.json` → `content_scripts[].exclude_matches`).

When a page truly refuses to load, the panel auto-retries once and, if still failing, shows a card with the URL plus an explicit "open in a new tab" button.

</details>

<details>
<summary><strong>Does it intercept my password / credit card?</strong></summary>

No. The extension never injects on known sign-in, SSO or payment hosts (Google / Apple / Microsoft / AWS accounts, Okta, Auth0, Duo, OneLogin, Stripe Checkout, PayPal, GitHub login, Bitwarden Web, WhatsApp Web, Telegram Web…). See `manifest.json` → `exclude_matches`. Nothing you type is read or logged on any site by the extension.

</details>

<details>
<summary><strong>Does it sync my settings between devices?</strong></summary>

Yes — via `chrome.storage.sync`, Chrome's built-in profile sync. The extension itself has no server. There is a soft size limit of ~7.5 KB for the domain list (Chrome's per-item quota minus a safety margin); this is plenty for hundreds of entries.

</details>

## Project layout

```
side-link-preview/
├── manifest.json      # Manifest V3
├── background.js      # Service worker: opens the Side Panel, registers DNR rules
├── content.js         # Content script (ISOLATED): intercepts link clicks
├── injected.js        # Page script (MAIN world): hijacks window.open + anti frame-busting
├── sidepanel.html     # Side Panel UI
├── sidepanel.js       # Side Panel logic (history, retry, address bar)
├── options.html       # Options page
├── options.js         # Options page logic
├── i18n.js            # Lightweight i18n runtime (shared by options + sidepanel)
├── locales/           # en / zh / fr / es / de / pt translation files
└── icons/             # 16 / 32 / 48 / 128 px icons
```

## How it works under the hood

Some interaction-heavy sites don't use native `<a target="_blank">` navigation. They `preventDefault()` on `mousedown` and call `window.open(url, '_blank')` from JS. The extension covers both paths:

1. `content.js` intercepts qualifying `<a target="_blank">` clicks during the capture phase, so synthetic event systems can't swallow them.
2. `injected.js` runs in the page's main world and hijacks `window.open`, forwarding the opened URL to the content script and into the Side Panel.

To embed sites that send `X-Frame-Options` or `frame-ancestors` CSP, the extension uses a **single** `declarativeNetRequest` dynamic rule that strips those response headers — but **only on iframe requests whose initiator is this extension** (`initiatorDomains: [chrome.runtime.id]`, `resourceTypes: ['sub_frame']`). Regular browsing on every other tab is untouched. JS-level frame-busting (`window.top !== window.self` checks) is suppressed inside Side-Panel iframes by overriding `window.top` / `window.parent` / `frameElement` to `window.self`.

> ⚠️ Any third-party site embedded inside an iframe loses one layer of context isolation. This extension is intended for personal reading and link previewing only — don't sign in to sensitive accounts or enter payment information inside the Side Panel.

## Privacy

The extension does not collect, transmit, sell, or track any user data. There is no analytics SDK, no remote config, and no network call to any author-controlled endpoint. All settings live in Chrome's `storage.sync`. See [PRIVACY.md](./PRIVACY.md) for the full breakdown.

## Sponsor

This extension is free, open source, and has no ads or tracking. If it saves you time day to day, please consider supporting further development:

- 💖 [**Sponsor on GitHub**](https://github.com/sponsors/ds009) — one-time or monthly, any amount helps.

Other ways to help without money are equally appreciated:

- ⭐ Star [the repository](https://github.com/ds009/side-link-preview)
- 🐞 File issues with reproducible steps
- 📣 Share the Chrome Web Store page with people who live in their browser

Thanks to everyone who sponsors, reports bugs, and spreads the word. 🙏
