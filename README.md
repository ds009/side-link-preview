# Side Link Preview

Intercepts `target="_blank"` links and opens them in Chrome's Side Panel, giving you a split-view browsing experience similar to Arc / Edge.

## Features

- Automatically intercepts outgoing links and loads them in the Side Panel on the right
- Hold `⌘` / `Ctrl` / `Shift` / `Alt` to bypass the extension and fall back to the native new-tab behavior
- Side Panel comes with a built-in address bar and a "pop out to new tab" button
- Clicking another link in the same tab refreshes the Side Panel in place
- **Configurable options page**:
  - Blacklist / whitelist mode (per-domain, subdomain-aware)
  - Trigger: click or hover (with configurable hover delay)
  - Link scope: `target="_blank"` only, or all links

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked** and select this directory
4. Visit any web page and click a link — it will open in the Side Panel
5. Back on `chrome://extensions`, find this extension → **Details** → **Extension options** to configure it

## Options

Two ways to open the options page:
- `chrome://extensions` → Side Link Preview → **Details** → **Extension options**
- Right-click the extension icon → **Options**

### Scope

- **Blacklist** (default): enabled on every site *except* those in the list
- **Whitelist**: enabled *only* on sites in the list

Domain matching rules:
- Entering `example.com` also matches `www.example.com`, `blog.example.com`, and other subdomains
- `*` wildcard is supported (e.g. `*example*` matches any hostname containing `example`)

### Trigger

- **Click**: single click on a link opens it in the Side Panel
- **Hover**: pointing at a link for longer than the hover delay opens it automatically

> ⚠️ Hover mode only works when the Side Panel is **already open**. This is because `chrome.sidePanel.open()` requires a user gesture, and hovering doesn't qualify. Before enabling hover mode for the first time, click the extension icon (or the Side Panel icon) in the toolbar to open the Side Panel once.

### Link scope

- **New-tab links only**: only intercept `<a target="_blank">`
- **All links**: intercept any `<a>` click (this may change how some sites feel to navigate)

## Known limitations

- `chrome.sidePanel.open()` requires Chrome ≥ 114
- Only one Side Panel exists per Chrome window; it updates its content as you switch tabs
- Chrome's native Split View has no public extension API at the moment (2026-04), which is why this extension still uses Side Panel + iframe

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
└── options.js         # Options page logic
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
