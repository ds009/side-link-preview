# Privacy Policy · Side Link Preview

_Last updated: 2026-04-24_

Side Link Preview (the "Extension") respects and protects user privacy. This
policy describes every kind of data handling the Extension performs at
runtime.

## TL;DR

- The Extension **does not collect, transmit, or sell** any personal data.
- No analytics, telemetry, or user tracking of any form.
- No data is sent to the author or to any third party.
- All data required for the Extension to operate (user settings, current
  Side Panel URL) is stored locally in your browser.

## Data we collect

**None.** The Extension does not collect any of the following categories of
information:

- Personally identifiable information (name, email, address, etc.)
- Authentication credentials (passwords, cookies, OAuth tokens)
- Payment information
- Authentication information
- Personal communications (email, chat messages, etc.)
- Location data
- Web content or browsing history
- User activity (clicks, input, keystrokes)
- Website traffic or performance metrics

## Data stored locally

In order to function, the Extension stores the following data in your
browser. This data **never leaves your device** — except when you are signed
in to the same Chrome profile on multiple devices, in which case Chrome
itself syncs it for you:

| Storage                    | Content                                                                        | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `chrome.storage.sync`      | User settings (blacklist/whitelist mode, domain list, trigger preferences, UI language, etc.) | Persist preferences and sync them across your devices         |
| `chrome.storage.session`   | The "next URL to open in the Side Panel" for each tab                          | Relay the URL between the content script and the Side Panel  |

`chrome.storage.session` is cleared automatically when the browser shuts
down.

## Permissions and why we request them

| Permission                       | Purpose                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidePanel`                      | Open Chrome's right-hand Side Panel to render the preview.                                                                                                                                         |
| `storage`                        | Persist user settings and relay the current URL between internal modules.                                                                                                                          |
| `tabs`                           | Retrieve the current tab's ID and window ID so the Side Panel can be bound to the correct tab.                                                                                                     |
| `scripting`                      | Required to declare content scripts (Manifest V3 requirement).                                                                                                                                     |
| `declarativeNetRequest`          | **Only for iframe requests initiated by this Extension's Side Panel**, strip `X-Frame-Options` / `CSP` response headers so target pages can be embedded. **Regular browsing is never affected.**   |
| `host_permissions: <all_urls>`   | Required to intercept outgoing link clicks on any website and forward them to the Side Panel — the core feature of the Extension.                                                                  |

## Data sharing

The Extension **does not share data with any third party** (because there
is no data to share).

## Changes

Any update to this policy will be reflected in the Git history of the
Extension's repository. Material changes will also be called out in the
Chrome Web Store changelog.

## Contact

If you have any questions about this policy, please open an issue on the
Extension's repository:
<https://github.com/ds009/side-link-preview/issues>
