# Changelog

All notable changes to this project are documented in this file.

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
