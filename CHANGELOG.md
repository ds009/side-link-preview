# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] — 2026-05-25

### Added

- **Open in main tab** — toolbar `←` button loads the current preview URL into the left main tab and closes the Side Panel.
- **Embed-failure diagnostics** — when a page cannot load in the iframe, the blocked card lists likely causes (X-Frame-Options, CSP `frame-ancestors`, `<meta>` CSP, redirects, JS frame-busting, cookie/session hints) plus a collapsible **Technical details** section. Implemented via new **`embed-probe.js`** (background fetch probe).
- **Open in new tab & add to blacklist** — one-click action on the blocked card (blacklist mode only).
- **Quick blacklist** toolbar button — block the current preview URL/path without opening Settings (blacklist mode only).
- **Per-site zoom** — `−` / `+` / reset badge in the Side Panel toolbar; persisted per host in `chrome.storage.local`.
- **Path-prefix Scope rules** — e.g. `example.com/admin` matches only that section; shared matching in **`settings-shared.js`**.
- **Open trigger** options — segmented switch: left click (default) or middle click; optional **also preview on hover** with delay on the same row (default 2000 ms).
- **Link scope** — by default intercepts same-tab **and** new-tab links; optional checkbox to limit to new-tab links only.
- **UI language** — follows the browser on first install when supported; nine locales (en, zh, ja, ko, ru, fr, es, de, pt).
- **Context menu** “Add this site to whitelist” on page context.
- **Auto-close Side Panel** when the main tab navigates or loads a new URL (clears stale previews); SPA `pushState` / `replaceState` / `popstate` reporting from `content.js`.
- **UI languages:** 日本語, 한국어, Русский (nine locales total: en, zh, ja, ko, ru, fr, es, de, pt).

### Changed

- Scope disable checks now use **URL-aware** rules (`isUrlDisabledByScope`) instead of hostname-only matching.
- **Link scope** default is now **all qualifying links** (same-tab + new-tab); open-trigger UI is a left/middle segmented switch with hover controls on one row.
- **Default hover delay** increased to **2000 ms**; **UI language** defaults to browser locale when not explicitly saved.
- Content scripts skip nested third-party iframes outside the Side Panel (less overhead on ads/embeds).
- **Expanded sensitive-site exclusions** — banking, webmail, streaming, IP addresses, government TLDs, checkout paths, and 125+ manifest `exclude_matches` patterns; store listing and landing copy updated.
- README, GitHub Pages landing copy, and locale files updated for the above.

### Fixed

- Release zip / `npm run zip` now includes **`embed-probe.js`** (required by the service worker).

---

## [1.0.0] — 2026-05-14

### Added

- **Scope:** separate `blacklist` and `whitelist` domain lists in `chrome.storage.sync`; switching mode swaps the textarea without losing the other list.
- Settings tip recommending whitelist mode when blacklist is selected (six locales).
- Callout explaining that the keyboard shortcut and toolbar icon can still open the Side Panel on the current tab even when Scope blocks automatic link previews.
- **`settings-shared.js`:** shared `normalizeSlpSettings()` (legacy single-`list` migration), `activeDomainList()`, and `isSensitiveAuthPreviewUrl()` (e.g. blocks GitHub `/sessions/…` from entering the panel).
- Options save **optimistic lock** via `_rev` to reduce overwriting settings changed in another tab or device.
- **`CHANGELOG.md`** for release notes.

### Changed

- Background **`getSettings` cache:** failed reads are no longer cached as `{}` forever; the worker retries on the next call.
- When a tab’s URL becomes scope-disabled (or a system URL), the extension disables the Side Panel for that tab and asks an open matching panel to **`window.close()`** (Chrome has no `sidePanel.close()` API).
- README, GitHub Pages (`docs/`), `PRIVACY.md` / `docs/privacy.html`, and store listing copy updated for the above behavior.

### Fixed

- **Packaging:** `npm run zip` now includes **`settings-shared.js`** (required by the service worker, content script, and options page).

---

## [0.9.0] — earlier

Initial tracked release series before this changelog.
