# Privacy Policy · Side Link Preview

_Last updated: 2026-05-14_

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
| `chrome.storage.sync`      | User settings: blacklist/whitelist **mode**, **separate** blacklist and whitelist domain lists, link scope, UI language, and an internal revision counter used only to detect conflicting saves between tabs/devices | Persist preferences and sync them across your devices         |
| `chrome.storage.local`     | Per-site Side Panel zoom level (host → factor map)                             | Restore your preferred zoom for each domain on revisit        |
| `chrome.storage.session`   | The "next URL to open in the Side Panel" for each tab                          | Relay the URL between the content script and the Side Panel  |

`chrome.storage.session` is cleared automatically when the browser shuts
down. `chrome.storage.local` persists across browser restarts but is
device-local and is **not** synced to your Google account.

## Permissions and why we request them

| Permission                       | Purpose                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidePanel`                      | Open Chrome's right-hand Side Panel to render the preview.                                                                                                                                         |
| `storage`                        | Persist user settings and relay the current URL between internal modules.                                                                                                                          |
| `tabs`                           | Retrieve the current tab's ID and window ID so the Side Panel can be bound to the correct tab.                                                                                                     |
| `declarativeNetRequest`          | Strip `X-Frame-Options`, `Content-Security-Policy`, `Content-Security-Policy-Report-Only` and `X-WebKit-CSP` response headers so target pages can be embedded in the Side Panel. The rule is a single dynamic rule scoped with `resourceTypes: ["sub_frame"]` **and** `initiatorDomains: [chrome.runtime.id]`. This means headers are modified **only on iframe requests whose initiator is this Extension itself (i.e. the Side Panel)**. Regular browsing on any website is completely unaffected — no other request on your device has any header modified. The rule is registered in `background.js` and is fully auditable in the source. |
| `contextMenus`                   | Add a single "Open link in Side Panel" entry to Chrome's right-click menu on link targets. The menu item is local to the browser — no data about the link, the page, or the click is ever sent off-device. |
| `host_permissions: <all_urls>`   | Required for two reasons: (1) the `declarativeNetRequest` `modifyHeaders` rule above needs host access to take effect on the Side Panel iframe's request URL; (2) the content script (declared in `manifest.json`) needs to intercept outgoing link clicks on any website to forward them to the Side Panel — the core feature of the Extension. To reduce risk on sensitive flows, the Extension explicitly excludes itself from injecting on common sign-in, SSO, payment and end-to-end-encrypted messaging hosts. The exact host list is auditable in `manifest.json` under `content_scripts[].exclude_matches`. |

## Why we strip iframe security headers

Chrome's Side Panel renders web content via an `<iframe>` of a chrome-extension://
origin. Most websites send `X-Frame-Options: DENY` or a `frame-ancestors` CSP
to prevent cross-origin embedding. The Extension removes those headers **only
on requests it issues itself** so it can render the preview. Concretely:

- The DNR rule's `initiatorDomains` is set to the Extension's own runtime ID,
  meaning a header is only modified when the request was started **by this
  Extension** (not by any other tab, extension, or page).
- The rule's `resourceTypes` is `["sub_frame"]`, restricting it to iframe
  navigations only.
- The rule does **not** modify request headers, only the four response
  headers listed above, and only the minimum needed to allow embedding.
- The rule is a **single static dynamic rule** registered once at startup —
  there are no per-tab, per-domain, or runtime-generated rules.

This is the smallest scope possible to make in-Side-Panel previews work
without breaking any other browsing.

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
