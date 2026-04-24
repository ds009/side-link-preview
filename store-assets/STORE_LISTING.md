# Chrome Web Store Listing — copy/paste source

Everything below is ready to be pasted into the Chrome Web Store
Developer Dashboard on submission day.

---

## 1. Basic info

| Field | Value |
| --- | --- |
| Name | `Side Link Preview` |
| Category | `Productivity` |
| Language (primary) | `English` |
| Initial visibility | `Public`, all regions |
| Homepage URL | `https://github.com/ds009/side-link-preview` |
| Support URL | `https://github.com/ds009/side-link-preview/issues` |
| Privacy policy URL | `https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md` |

---

## 2. Short description (max 132 chars)

```
Preview links in Chrome's Side Panel. Click any link and read it side-by-side — no new tab, no context switch.
```

## 3. Detailed description

```
Side Link Preview turns every outgoing link into a split-view reading experience.

WHAT IT DOES
• Click any link that would normally open in a new tab — it opens in Chrome's Side Panel instead.
• Keep the Side Panel pinned and keep reading on the left. Your flow never breaks.
• Hold ⌘ / Ctrl / Shift / Alt while clicking to fall back to a real new tab.

KEY FEATURES
• Built-in address bar and "pop out to new tab" button inside the panel
• Clicking another link refreshes the panel in place
• Hover-to-preview mode with configurable delay
• Per-domain blacklist or whitelist (wildcards supported)
• Option to intercept all links, not just target="_blank"
• Works on sites that block iframes — via a scoped, Side-Panel-only header rule

PRIVACY
• No analytics. No tracking. No data ever leaves your browser.
• All settings live in your Chrome sync storage.
• Full policy: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

WHO IT'S FOR
• Researchers opening 20 tabs while reading one article
• Engineers following links in docs, PRs, and Stack Overflow
• Anyone who misses Arc's "Little Arc" or Edge's split view — but on stock Chrome

REQUIREMENTS
Chrome 114 or later (Side Panel API).

OPEN SOURCE
MIT-licensed. Issues and PRs welcome:
https://github.com/ds009/side-link-preview

SUPPORT THE PROJECT
If it saves you time, you can sponsor the developer on GitHub:
https://github.com/sponsors/ds009
```

---

## 4. Single purpose statement

Paste this into *Privacy practices → Single purpose*:

```
Open links that the user clicks in the Chrome Side Panel, giving a
split-view browsing experience without leaving the current tab.
```

## 5. Permission justifications

One by one, paste these into the matching fields under
*Privacy practices → Permissions*.

### `sidePanel`
```
Required to render the preview inside Chrome's Side Panel, which is the
extension's core user-facing surface.
```

### `storage`
```
Persist the user's preferences (trigger mode, blacklist/whitelist, UI
language) and relay the currently-requested URL between the content
script and the Side Panel page. All data stays on the user's device and
syncs only through the user's own Chrome profile.
```

### `tabs`
```
Used to read the current tab ID and window ID so the Side Panel can be
bound to the tab the user is browsing. No tab content, URL history, or
tab metadata is transmitted anywhere.
```

### `scripting`
```
Required by Manifest V3 to declare the two content scripts that detect
link clicks and hijack window.open in the page's main world.
```

### `declarativeNetRequest`
```
Removes `X-Frame-Options` and `Content-Security-Policy: frame-ancestors`
response headers ONLY on iframe requests whose initiator is this
extension's own Side Panel. The dynamic rule is scoped with
`initiatorDomains: [chrome.runtime.id]` and `resourceTypes: ["sub_frame"]`,
so requests made during normal browsing on any website are never
affected. This is the minimum capability required to render the
user-requested page inside the Side Panel.
```

### Host permission `<all_urls>`
```
The extension must be able to intercept `<a target="_blank">` clicks and
`window.open` calls on any site the user visits, and to load the
user-chosen URL inside the Side Panel iframe. No page content is read,
collected, or transmitted.
```

### Remote code
Select **"No, I am not using remote code."** The extension only loads
local files and third-party pages inside a user-visible iframe; it does
not `eval` remote scripts.

### Data usage disclosure
Tick the following — nothing else:

- *Website content* → **only to support a feature requested by the user**
  (the iframe loads the page the user explicitly clicked).
- Everything else → **Not collected.**

Certify:
- [x] I do not sell or transfer user data to third parties.
- [x] I do not use or transfer user data for unrelated purposes.
- [x] I do not use or transfer user data to determine creditworthiness.

---

## 6. Assets checklist

| Asset | Size | Status |
| --- | --- | --- |
| Icon | 128×128 | ✅ `icons/icon-128.png` |
| Small promo tile | 440×280 | ⬜ TODO |
| Marquee promo tile | 1400×560 | ⬜ Optional, skip for first release |
| Screenshot 1 — "Click. Read. Move on." | 1280×800 | ⬜ TODO |
| Screenshot 2 — "Hover to preview (optional)" | 1280×800 | ⬜ TODO |
| Screenshot 3 — "Blacklist / Whitelist per domain" | 1280×800 | ⬜ TODO |

Naming convention to keep inside `store-assets/`:
`tile-440x280.png`, `screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png`.

---

## 7. Release zip

From the repo root:

```bash
zip -r side-link-preview-$(jq -r .version manifest.json).zip . \
  -x "*.git*" \
  -x "store-assets/*" \
  -x "*.md" \
  -x ".DS_Store"
```

Upload the resulting `.zip` under *Package → Upload new package*.

---

## 8. Post-submission

After the review passes:

1. Create a GitHub release `v0.9.0` linking to the CWS page.
2. Update `README.md` with the CWS install link at the top.
3. Announce: r/chrome_extensions, r/productivity, Show HN, Product Hunt.
