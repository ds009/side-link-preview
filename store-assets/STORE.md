# Chrome Web Store Submission Checklist

Everything you need to paste into <https://chrome.google.com/webstore/devconsole>.

## Assets in this folder

| File                              | Size       | Required?  | Where it appears                                        |
| --------------------------------- | ---------- | ---------- | ------------------------------------------------------- |
| `promo-small-tile-440x280.png`    | 440×280    | Required   | Small promotional tile (shown in search / category views) |
| `promo-marquee-1400x560.png`      | 1400×560   | Optional   | Marquee (featured) tile — recommended for visibility    |

## Additional assets you still need to supply yourself

- **Screenshots** — at least 1, up to 5. Must be **1280×800** or **640×400** PNG.
  Take real screenshots showing:
  1. A link being clicked and previewed in the Side Panel
  2. The options page with blacklist / whitelist toggles
  3. The Side Panel with its built-in address bar
  4. (Optional) Hover mode in action
  5. (Optional) Multi-language options UI
- **Privacy policy URL** — commit `PRIVACY.md` to a public GitHub repo and use
  the raw URL, e.g.
  `https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md`

## Store listing fields (ready to paste)

### Name

```
Side Link Preview
```

### Summary (132 chars max)

```
Preview target="_blank" links in Chrome's Side Panel for a split-view browsing experience, inspired by Arc / Edge.
```

### Description (keep under 16,000 chars — the text below is ~800)

```
Side Link Preview turns every "open in new tab" link into a split-view preview. Instead of piling up tabs, the link opens in Chrome's Side Panel on the right, so you can keep reading the current page while scanning the link in parallel — similar to the reading experience on Arc or Microsoft Edge.

Highlights:
• Auto-intercept — any target="_blank" link on any website opens in the Side Panel instead of a new tab.
• Bypass anytime — hold ⌘ / Ctrl / Shift / Alt to fall back to the default new-tab behavior.
• Built-in address bar & "pop out to new tab" button inside the Side Panel.
• Switch to Hover mode if you prefer instant preview on mouseover (configurable delay).
• Blacklist / whitelist modes with subdomain and wildcard (*) support — turn the extension off on specific sites, or only enable it where you want it.
• Multi-language options UI: English, 中文, Français, Español, Deutsch, Português.
• Privacy-first: no analytics, no tracking, no data leaves your device. All settings live in your browser's local sync storage.

How it works:
• A content script intercepts link clicks at the capture phase, including "virtual" links that JavaScript-heavy sites open via window.open().
• The URL is forwarded to the Side Panel, which loads it in an iframe.
• To allow sites that set X-Frame-Options or CSP: frame-ancestors to still render, the extension strips those headers — but only for iframe requests initiated by the Side Panel itself (scoped via initiatorDomains). Regular browsing is never touched.

Requires Chrome 114+.

Source code & issues: https://github.com/ds009/side-link-preview
```

### Category

```
Productivity
```

### Language

```
English (primary). Options page additionally supports 中文 / Français / Español / Deutsch / Português.
```

## Single purpose description

```
Intercept outgoing links on web pages and open them in Chrome's Side Panel, so the user can preview the linked page without leaving the current tab.
```

## Permission justifications

Paste each of these into the corresponding "Justification" field in the
developer console.

### `sidePanel`

```
Used to programmatically open Chrome's Side Panel so the clicked link can be rendered inside it.
```

### `storage`

```
Used to persist user preferences (blacklist/whitelist mode, domain list, trigger mode, UI language) via chrome.storage.sync, and to relay the "next URL to open" between the content script and the Side Panel via chrome.storage.session.
```

### `tabs`

```
Used to retrieve the current tab's ID and window ID so the Side Panel can be bound to the correct tab when opened.
```

### `scripting`

```
Declared to support the extension's content scripts under Manifest V3.
```

### `declarativeNetRequest`

```
Used to strip X-Frame-Options and Content-Security-Policy (frame-ancestors) response headers so that sites which would otherwise refuse embedding can load inside the Side Panel. The rule is strictly scoped with "initiatorDomains": [chrome.runtime.id] — it only applies to iframe requests initiated by this extension's own Side Panel. Regular browsing of any website is completely unaffected; no other request on the user's device has its headers modified.
```

### `host_permissions: <all_urls>`

```
The extension's core function is to intercept link clicks on any website the user visits and forward the link to the Side Panel. This requires a content script to run on all URLs so that clicks can be captured before the site's own handlers fire.
```

### Remote code use

```
No. The extension bundles all its executable code. The Side Panel embeds user-chosen URLs inside an iframe, which is user content, not executable extension code.
```

### Data usage declaration

For every data category in the developer console, select:

```
☑ Does not collect this data
```

## Packaging the extension for upload

The Chrome Web Store expects a `.zip` containing only what the extension
needs at runtime. Run this from the project root:

```bash
rm -f side-link-preview.zip
zip -r side-link-preview.zip \
  manifest.json \
  background.js content.js injected.js i18n.js options.js sidepanel.js \
  options.html sidepanel.html \
  icons/icon-16.png icons/icon-32.png icons/icon-48.png icons/icon-128.png \
  locales
```

This deliberately excludes `icons/icon-square.png` (the high-res master),
`store-assets/`, and the docs (`README.md`, `PRIVACY.md`, `STORE.md`) —
those are only needed in the repo, not inside the shipped extension.

## Version history (changelog)

### 1.0.0 (initial release)

```
Initial public release.
• Click-to-preview and hover-to-preview modes
• Blacklist / whitelist with subdomain and wildcard matching
• Multi-language options UI (en / zh / fr / es / de / pt)
• Side Panel iframe compatibility fixes (scoped X-Frame-Options / CSP header removal, anti frame-busting)
```
