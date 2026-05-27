# Side Link Preview

<p>
  <a href="https://chromewebstore.google.com/detail/jpbekmkggadbfacnnlnkjhdkgaoonapn">
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

> Side Link Preview is an independent open-source project; it is not affiliated with, endorsed by, or sponsored by any browser vendor.

> If this extension saves you tab-juggling time, consider [sponsoring on GitHub](https://github.com/sponsors/ds009). It keeps the project maintained and ad-free.

## Features

- **Click-to-preview** — qualifying outgoing links open in Chrome's Side Panel on the right (by default: same-tab links **and** new-tab links).
- **Modifier keys still do what you expect** — `⌘`/`Ctrl`, `⌘+⇧`/`Ctrl+⇧`, `⇧`, `⌥`/`Alt` always bypass the panel and behave like the browser default.
- **Side-Panel address bar** with **Back / Forward / Refresh**, **per-site zoom** (`−` / `+`), **Open in main tab**, and toolbar **Don't use side panel on this site** (blacklist mode); auto-collapses on narrow widths.
- **Open in main tab** — toolbar `←` sends the current preview to the left main tab and closes the panel.
- **In-panel loading indicator** + **single auto-retry** on transient embed failures, then a diagnostic fallback card (likely causes + collapsible technical details, open in new tab, optional **add to blacklist**).
- **Smart link filtering** — same-page anchors, bare-domain homepage links, downloads, mixed content, login/OAuth pages, localhost, sign-in/SSO/payment destinations, path-sensitive auth URLs (e.g. GitHub `/sessions`), etc. all open natively instead of in the panel. Full logic in [`content.js`](./content.js) and [`settings-shared.js`](./settings-shared.js).
- **Per-site enable/disable** with **path-prefix** blacklist or whitelist rules (**two stored lists**), plus **125+ built-in sensitive-host exclusions** (sign-in, banking, webmail, streaming, IP addresses, government TLDs, checkout paths, etc.).
- **Auto-close** — when the main tab navigates to a new URL, any open Side Panel preview for that tab closes automatically (including most SPA URL changes).
- **Right-click context menu** — “Open link in Side Panel” (one-shot bypass) and “Add this site to whitelist”.
- **Keyboard shortcut** `Alt+Shift+P` to open the current tab inside the Side Panel.
- **Open trigger** — segmented switch: left click (default) or middle click; optional hover preview with delay on the same row (Settings).
- **Automatic light / dark theme** following your OS, plus **nine** built-in UI languages (English, 中文, 日本語, 한국어, Русский, Français, Español, Deutsch, Português).
- **Zero analytics, zero tracking, zero ads.** All data stays on your device. See [PRIVACY.md](./PRIVACY.md).

## Install

**From the Chrome Web Store** (recommended):

> ⚠️ Pending review — link will be live once the listing is approved.
> The badge above and this link will then point to it:
> `https://chromewebstore.google.com/detail/jpbekmkggadbfacnnlnkjhdkgaoonapn`

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
| `←` (main) | Open the current preview URL in the **left main tab** and close the Side Panel. |
| `⊘` | **Quick blacklist** — add the current preview URL (or path prefix) to Scope blacklist. Shown only in blacklist mode. |
| `−` / `+` / `%` | Zoom out / in / reset (100%). Level is saved per host. |
| Address input | Click to edit. Other buttons collapse so the input gets the full width. Press Enter or click **Go** to load. Esc cancels and restores the previous URL. Bare hosts like `google.com` get auto-prefixed with `https://`. |
| **Go** | Submit the URL above. |
| ⚙ | Open the Settings page in a new tab. |

When a page cannot embed, the panel shows **likely causes** (XFO, CSP, redirects, etc.), a collapsed **Technical details** block, the URL, and actions: **Open in new tab**, **Open in new tab & add to blacklist** (blacklist mode), and **Copy link**.

## Options

Two ways to open the options page:

- `chrome://extensions` → Side Link Preview → **Details** → **Extension options**
- Right-click the extension icon → **Options**

### Language

Nine UI languages are bundled: **English**, **中文**, **日本語**, **한국어**, **Русский**, **Français**, **Español**, **Deutsch**, **Português**. On first install the UI follows your **browser language** when supported; pick another anytime from the **Language** dropdown — the side panel updates automatically.

### Scope (per-site enable / disable)

- **Blacklist** (default): the extension is enabled on every site **except** those listed.
- **Whitelist**: the extension is enabled **only** on listed sites.

**Separate lists:** blacklist entries and whitelist entries are **stored independently**. Changing the mode updates the text area to show that mode’s list; the other list is preserved.

The options page suggests **whitelist mode** when blacklist is selected — fewer sites open the panel automatically.

Domain and path matching (one rule per line):

- `example.com` — entire site (all paths on that host and its subdomains).
- `example.com/admin` — only `/admin` and sub-paths (e.g. `/admin/users`).
- `*` wildcards work in hostnames and paths: `*shop*`, `example.com/blog/*`.

When the active tab navigates to a URL where Scope disables previews (or to `chrome://` etc.), the extension disables the Side Panel for that tab, clears the preview session, and asks an open panel instance to close. **Any main-tab navigation** also closes a stale preview even when the new URL would otherwise allow the panel. Link interception on the page becomes inert on disabled URLs so clicks behave like the native browser.

**Shortcut vs Scope:** `Alt+Shift+P` and the toolbar icon can still open the Side Panel on the **current tab** even when Scope would block automatic link previews — that is intentional so you can explicitly mirror the page you are on.

### Link scope

By default the extension intercepts **all** qualifying outgoing links — both ordinary same-tab link clicks and links that open in a **new tab** — and opens them in the side panel.

Uncheck **"Also open links that don't open in a new tab in the side panel"** to restrict interception to new-tab links only. Same-tab navigation then stays with the browser (current tab reloads as usual).

### How links open (open trigger)

- **Left click / Middle click** — a segmented switch (default: **left click**). Middle click sends only scroll-wheel clicks to the panel; left click stays native when middle is selected.
- **Also preview on hover** — optional checkbox on the **same row** as the hover delay (default **2000 ms**, range 200–3000). Independent of left/middle click; requires opening the panel once per tab first (Chrome user-gesture rule).

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
- **Bare-domain link** — `https://example.com` or `https://example.com/`. Domain-root links are virtually always "leave this site", not "preview content".
- **`<a download>` attribute** — the page is asking for a download.
- **`target="_top"` / `_parent`** — the page is asking to navigate out of a frame.
- **`rel="external"` / `rel="alternate"`** — semantic markers for off-site or alternate-format links.
- **Mixed content** — the panel is HTTPS-equivalent, so HTTP child resources would never render.
- **Known download / media file extensions** — `.pdf`, `.zip`, `.mp4`, etc.
- **Localhost / private IPs / corporate intranet** — `.local`, `.internal`, `.corp`, `.lan`, `.home`, and all IP literals.
- **Login / checkout / OAuth paths** — `/login`, `/checkout`, `/payment`, `/oauth`, `/connect/authorize`, and similar.
- **Disabled destination host** — link target is on the user's Scope disable list.
- **Sensitive destination hosts** — 125+ patterns in `manifest.json` `exclude_matches` plus runtime checks: sign-in, SSO, banking, webmail, video calls, streaming, cloud consoles, crypto, government TLDs, link shorteners, etc.
- **Path-only sensitive URLs** — e.g. `github.com/sessions/…` (see `isSensitivePreviewUrl` in [`settings-shared.js`](./settings-shared.js)).
- **Nested third-party iframes** — clicks inside YouTube embeds, Disqus, ads, social widgets etc. are left alone.

`chrome://`, `chrome-extension://` and other internal pages are also automatically excluded — clicking the toolbar icon there is a no-op.

## Known limitations

- Requires Chrome ≥ 119 (Side Panel API + `match_origin_as_fallback` for clean injection into sandboxed iframes).
- One Side Panel per Chrome window; it updates its content as you switch tabs.
- Chrome's native Split View has no public extension API at the moment (2026-04), which is why this extension uses Side Panel + iframe instead.
- Newly opened tabs that already existed before installing or upgrading the extension need a single refresh before clicks are intercepted there.
- Some **SPA** URL changes may still lag Scope/auto-close by a moment; most `pushState` / `replaceState` navigations are reported from the content script.
- Embed diagnostics are **best-effort** — a background fetch may differ slightly from iframe behavior on some sites.

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

When a page truly refuses to load, the panel auto-retries once and, if still failing, shows a card with **likely causes** (X-Frame-Options, HTTP or `<meta>` CSP `frame-ancestors`, redirects, JS frame-busting, possible cookie/session issues), a collapsible raw probe log, the URL, and buttons to open in a new tab or add the URL to your blacklist.

</details>

<details>
<summary><strong>Does it intercept my password / credit card?</strong></summary>

No. The extension never injects on known sign-in, SSO, payment or end-to-end-encrypted messaging hosts. The exact host list is auditable in `manifest.json` → `content_scripts[].exclude_matches`. Nothing you type is read or logged on any site by the extension.

</details>

<details>
<summary><strong>Does it sync my settings between devices?</strong></summary>

Yes — via `chrome.storage.sync`, Chrome's built-in profile sync. The extension itself has no server. There is a soft size limit of ~7.5 KB for the whole settings object (Chrome's per-item quota minus a safety margin); this is plenty for hundreds of domain entries across **both** lists. A small internal revision field (`_rev`) reduces the chance that two options tabs overwrite each other when saving.

</details>

## Project layout

```
side-link-preview/
├── manifest.json      # Manifest V3
├── background.js      # Service worker: Side Panel, DNR, tab/URL lifecycle
├── embed-probe.js     # Background fetch probe for embed-failure diagnostics
├── content.js         # Content script (ISOLATED): intercepts link clicks after Scope check
├── injected.js        # Page script (MAIN world): hijacks window.open + anti frame-busting
├── sidepanel.html     # Side Panel UI
├── sidepanel.js       # Side Panel logic (history, zoom, retry, diagnostics)
├── options.html       # Options page
├── options.js         # Options page logic
├── settings-shared.js # Normalized settings, Scope matching, shared URL guards
├── i18n.js            # Lightweight i18n runtime (shared by options + sidepanel)
├── locales/           # en / zh / ja / ko / ru / fr / es / de / pt
└── icons/             # 16 / 32 / 48 / 128 px icons
```

## How it works under the hood

Some interaction-heavy sites don't use plain `<a>` navigation. They `preventDefault()` on `mousedown` and call `window.open(url, '_blank')` from JS. The extension covers both paths. On **external** pages where your **Scope** settings disable automatic previews, it stays inert: capture listeners are skipped and `window.open` is left native until/unless you change settings or use the context menu / toolbar / shortcut.

1. `content.js` intercepts qualifying link clicks during the capture phase (respecting **link scope** and **open trigger**), so synthetic event systems can't swallow them.
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
