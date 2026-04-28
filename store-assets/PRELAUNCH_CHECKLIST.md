# Pre-launch Checklist — Side Link Preview

A single sheet to walk through 1× before clicking *Submit for review*.
Items marked **[manual]** require you; the rest are already done in the
repo and just need a quick re-verification before you ship.

> **TL;DR — only-you tasks:**
>
> 1. Pay the **$5** CWS developer fee + enable 2FA on the Google account.
> 2. Make the GitHub repo **Public** and turn on **Pages → main /docs**.
> 3. `npm run zip` and load-unpacked once for a smoke test.
> 4. Fill in the dashboard form (privacy URL, justifications, data answers — all already drafted in `STORE_LISTING.md`).
> 5. Tag `v0.9.0` to ship the GitHub Release.
>
> Everything below is the long form.

---

## 0. Repository hygiene

- [x] LICENSE file present (MIT).
- [x] PRIVACY.md present and reachable from a public URL.
- [x] README contains feature list, screenshots, install instructions.
- [x] No secrets / API keys committed (`git grep -i 'api[_-]key\|secret\|token'`).
- [x] No stray junk in tree (`.DS_Store`, old release zip, icon backups all removed).
- [ ] **[manual]** GitHub repository visibility = **Public**
      (CWS reviewers will click your privacy-policy URL).
- [ ] **[manual]** GitHub Pages enabled
      (`Settings → Pages → Source: main → /docs`) and the URL responds 200.

## 1. Code & manifest

- [x] `manifest.json` `version` = `0.9.0` — matches the tag you'll publish.
- [x] `minimum_chrome_version` set (currently `"119"`).
- [x] `description` ≤ 132 chars and trademark-clean.
- [x] No remote-hosted code (no `<script src="https://…">`,
      no `eval`, no `Function()`).
- [x] No `unsafe-eval` / `unsafe-inline` in CSP overrides.
- [x] All declared permissions are actually used; the unused `scripting`
      permission was dropped. Each remaining permission has a justification
      in `STORE_LISTING.md`.
- [x] `host_permissions: ["<all_urls>"]` is justified and excludes
      sensitive auth/banking domains via `exclude_matches`.
- [x] `declarativeNetRequest` rules are scoped to the extension's own
      `initiatorDomains` and `sub_frame` resource type only.
- [x] No console errors in DevTools when running the unpacked build.
- [x] `npm run lint` clean (`eslint *.js`).
- [x] `npm run validate:json` clean.
- [x] `npm run validate:locales` confirms all 6 locale files share keys
      (40/40).

## 2. Build artifact

- [x] `npm run zip` is rewritten in `scripts/zip.mjs`; produces a clean
      `dist/side-link-preview-0.9.0.zip` (~70 KB, well under 10 MB).
- [x] Verified: zip excludes `node_modules/`, `scripts/`, `store-assets/`,
      `docs/`, `icons/icon-square.png`, `*.DS_Store`.
- [ ] **[manual]** Run `npm run zip`, unzip into a scratch folder and
      *Load unpacked* in `chrome://extensions` to confirm no warnings.
- [ ] **[manual]** Click around for ~2 minutes: open a link, hit Back/
      Forward/Refresh in the panel, toggle blacklist mode, switch language.

## 3. Store listing assets

- [x] `icons/icon-128.png` (the store icon) is exactly 128 × 128.
- [x] **5 screenshots** at 1280 × 800 PNG, all auto-generated:
      `npm run screenshots`. Stored at `store-assets/screenshot-{1..5}.png`.
- [x] Promo tiles (`promo-marquee-1400x560.png`,
      `promo-small-tile-440x280.png`) are present.
- [x] Screenshots audited for:
      - no Chrome / Arc / Edge wordmarks
      - no personal data
      - no copyrighted imagery you don't own (Wikipedia + MDN are
        CC-licensed and fair-use as a UI demo)
- [ ] **[manual, optional]** 30-sec YouTube demo (huge conversion lift —
      you can skip for v0.9.0 and add later).

## 4. Dashboard fields (Chrome Web Store)

When you click *New item* in the Developer Dashboard, you'll be asked for
the items below. **Copy verbatim from `store-assets/STORE_LISTING.md`** —
that file already has every field drafted.

- [x] Item name → `Side Link Preview`
- [x] Summary (≤ 132 chars) → drafted in `STORE_LISTING.md` § 2
- [x] Description (long) → drafted in `STORE_LISTING.md` § 3
- [x] Category → **Productivity**
- [x] Language → English (5 localized listings drafted in `STORE_LISTING.md` § 9)
- [ ] **[manual]** Privacy policy URL → paste either
      `https://<you>.github.io/side-link-preview/privacy.html`
      *or* the GitHub raw URL of `PRIVACY.md`.
- [ ] **[manual]** Homepage URL → GitHub Pages landing page.
- [ ] **[manual]** Support URL → `https://github.com/<you>/side-link-preview/issues`
- [ ] **[manual]** Single-purpose description (1 sentence) →
      *"Open links in Chrome's Side Panel for side-by-side reading."*
- [ ] **[manual]** Permissions justifications →
      copy from `STORE_LISTING.md` § *Permission justifications*. There
      are 5 entries: `sidePanel`, `storage`, `tabs`, `declarativeNetRequest`,
      `contextMenus`, plus `host_permissions: <all_urls>`.
- [ ] **[manual]** Data collection answers (all "No" except *Website content* = "Yes / used in-product only"):
      - Personally identifiable info → **No**
      - Health → **No**
      - Financial / payment → **No**
      - Authentication info → **No**
      - Personal communications → **No**
      - Location → **No**
      - Web history → **No** (we don't store visited URLs)
      - User activity → **No**
      - Website content → **Yes** (the Side Panel renders pages the user
        explicitly clicks; we don't transmit it anywhere). Tick:
        - *I do not sell or transfer user data to third parties…*
        - *I do not use or transfer user data for purposes that are
          unrelated to my item's single purpose.*
        - *I do not use or transfer user data to determine creditworthiness
          or for lending purposes.*
- [ ] **[manual]** Visibility: **Unlisted** for the first beta (lets you
      hand the install URL to early testers without a public listing). Flip
      to **Public** after the first review passes.
- [ ] **[manual]** Distribution regions: **All regions** (recommended).

## 5. Account & one-time setup

- [ ] **[manual]** Chrome Web Store developer account created
      (one-time **$5** registration fee paid).
- [ ] **[manual]** Two-step verification on the developer Google account.
- [ ] **[manual]** Account verified (Google may ask for email confirmation).

## 6. Replace the placeholder extension ID

Chrome assigned the extension ID **`jpbekmkggadbfacnnlnkjhdkgaoonapn`**
on first publish. The placeholder has been replaced across the repo:

- [x] **[manual]** `README.md`
- [x] **[manual]** `docs/index.html`
- [x] **[manual]** `docs/README.md`
- [x] **[manual]** `store-assets/STORE_LISTING.md`
- [x] **[manual]** `store-assets/PRELAUNCH_CHECKLIST.md` (this file)

For reference, the one-liner used:

```bash
git grep -l REPLACE_WITH_EXTENSION_ID | xargs sed -i '' 's/REPLACE_WITH_EXTENSION_ID/jpbekmkggadbfacnnlnkjhdkgaoonapn/g'
```

## 7. Tag the release

Once the dashboard is filled in and the zip is uploaded:

- [ ] **[manual]** `git tag v0.9.0 && git push origin v0.9.0`.
      The `release.yml` workflow auto-builds the zip and creates a GitHub
      Release. Reviewers can read the source on the same tag.

## 8. After submission

- First review usually takes **1–7 days** (sometimes hours, sometimes
  weeks). Don't poke the form during review.
- If you do get rejected, the email lists a violation code (e.g.
  *Blue Argon*, *Yellow Magnesium*). Reply inside the dashboard thread,
  never via PR — they answer in the same thread.

## 9. Common rejection reasons (defended above)

| Reason | Why we're safe |
| --- | --- |
| "Excessive permissions" | Each permission justified in dashboard + `STORE_LISTING.md`. `<all_urls>` is required for content scripts on outgoing links and for the DNR rule's host scope. |
| "Trademark misuse" | The listing copy no longer uses *Arc-style* / *Edge-style*; descriptions are generic. No third-party logos in the icon, screenshots, or promo tiles. |
| "Vague single purpose" | Single purpose is explicit: *Open links in Chrome's Side Panel for side-by-side reading.* |
| "Remote code execution" | None. All JS is bundled in the zip; no `eval`, no remote `<script>`. |
| "Privacy policy unreachable" | `PRIVACY.md` is in the repo, plus a styled `docs/privacy.html` for direct linking from the dashboard. |
| "Sensitive data unprotected" | `exclude_matches` prevents content-script injection on Google/Apple/Microsoft auth, Stripe, PayPal, Bitwarden, etc. (see `manifest.json`). |
| "Modifies headers without disclosure" | DNR rule scoped to `initiatorDomains: [chrome.runtime.id]` + `resourceTypes: ["sub_frame"]`; disclosed in `PRIVACY.md` § *Why we strip iframe security headers*. |
| "Excessive screenshots / misleading marketing" | All 5 screenshots are generated from the production codebase (`npm run screenshots`), no mockups, no fake UI. |
