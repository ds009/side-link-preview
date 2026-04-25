# Pre-launch Checklist — Side Link Preview

A single sheet to walk through 1× before clicking *Submit for review*.
Items marked **[manual]** require you; the rest are already done in the
repo and just need to be re-verified before you ship.

---

## 0. Repository hygiene

- [x] LICENSE file present (MIT).
- [x] PRIVACY.md present and reachable from a public URL.
- [x] README contains feature list, screenshots, install instructions.
- [x] No secrets / API keys committed (`git grep -i 'api[_-]key\|secret\|token'`).
- [ ] **[manual]** GitHub repository visibility = **Public**
      (CWS reviewers will click your privacy-policy URL).
- [ ] **[manual]** GitHub Pages enabled (`Settings → Pages → main /docs`)
      and the URL responds 200.

## 1. Code & manifest

- [x] `manifest.json` `version` matches the tag you'll publish (e.g. `0.9.0`).
- [x] `minimum_chrome_version` set (currently `"119"`).
- [x] `description` ≤ 132 chars and free of trademarked words used as
      product names.
- [x] No remote-hosted code (no `<script src="https://…">`,
      no `eval`, no `Function()`).
- [x] No `unsafe-eval` / `unsafe-inline` in CSP overrides.
- [x] All declared permissions are actually used; each has a
      justification in `STORE_LISTING.md`.
- [x] `host_permissions: ["<all_urls>"]` is justified and excludes
      sensitive auth/banking domains via `exclude_matches`.
- [x] `declarativeNetRequest` rules are scoped to the extension's own
      `initiatorDomains` and `sub_frame` resource type only.
- [x] No console errors in DevTools when running the unpacked build.
- [x] `npm run lint` clean.
- [x] `npm run validate:json` clean.
- [x] `npm run validate:locales` confirms all locale files share keys.

## 2. Build artifact

- [ ] **[manual]** Run `npm run zip` → produces a clean
      `side-link-preview-<version>.zip` < 10 MB.
- [ ] **[manual]** Unzip into a scratch folder and load it as **Unpacked**
      in `chrome://extensions` to confirm it loads with no warnings.
- [ ] **[manual]** Confirm `icons/icon-square.png` (the 665 KB master
      file) is **not** inside the zip.

## 3. Store listing assets

- [x] `icons/icon-128.png` (the store icon) is exactly 128 × 128.
- [ ] **[manual]** 5 screenshots, each **1280 × 800 PNG**
      (see `SCREENSHOT_GUIDE.md`).
- [ ] **[manual]** Optional promo tile 440 × 280 PNG.
- [ ] **[manual]** Optional 30-sec YouTube demo (huge conversion lift).
- [x] All screenshots checked for:
  - no Chrome/Arc/Edge wordmarks
  - no personal data
  - no copyrighted imagery you don't own

## 4. Dashboard fields (Chrome Web Store)

When you click *New item* in the Developer Dashboard, you'll be asked for:

- [x] Item name → `Side Link Preview`
- [x] Summary (≤ 132 chars) → copy from `STORE_LISTING.md`
- [x] Description (long) → copy from `STORE_LISTING.md`
- [x] Category → **Productivity**
- [x] Language → English (add localized listings later — see L5 multilingual block).
- [ ] **[manual]** Privacy policy URL → paste GitHub raw URL of `PRIVACY.md`
      *or* the `/docs` landing page once Pages is live.
- [ ] **[manual]** Homepage URL → GitHub Pages landing page.
- [ ] **[manual]** Support URL → GitHub issues link.
- [ ] **[manual]** Single-purpose description (1 sentence) → e.g.
      *"Open links in Chrome's Side Panel for side-by-side reading."*
- [ ] **[manual]** Permissions justifications → copy verbatim from
      `STORE_LISTING.md` *Permission justifications* section.
- [ ] **[manual]** Data collection answers:
      - Personally identifiable info: **No**
      - Health: **No**
      - Financial / payment: **No**
      - Authentication info: **No**
      - Personal communications: **No**
      - Location: **No**
      - Web history: **No** (we don't store visited URLs)
      - User activity: **No**
      - Website content: **Yes** (the Side Panel renders pages the user
        explicitly clicks; we don't transmit it anywhere). Tick the
        checkbox *"I do not sell or transfer user data to third parties,
        outside of the approved use cases"* etc.
- [ ] **[manual]** Visibility: **Public** (or Unlisted for first beta).
- [ ] **[manual]** Distribution regions: **All regions** (recommended).

## 5. Account & one-time setup

- [ ] **[manual]** Chrome Web Store developer account created
      (one-time **$5** registration fee).
- [ ] **[manual]** Two-step verification on the developer Google account.
- [ ] **[manual]** Account verified (Google may ask for email confirmation).

## 6. After submission

- [ ] Tag the release: `git tag v0.9.0 && git push origin v0.9.0`.
      The `release.yml` workflow auto-creates a GitHub Release with the zip.
- [ ] Note the dashboard *Item ID*; replace `REPLACE_WITH_EXTENSION_ID` in:
  - `docs/index.html`
  - `README.md`
  - any social posts you've drafted in `LAUNCH_POSTS.md`
- [ ] First review usually takes **1–7 days** (sometimes hours, sometimes
      weeks). Don't poke the form during review.

## 7. Common rejection reasons (defended above)

| Reason | Why we're safe |
| --- | --- |
| "Excessive permissions" | Each permission justified in dashboard + STORE_LISTING. `<all_urls>` is required for content scripts on outgoing links. |
| "Trademark misuse" | We only mention *Arc-style* / *Edge-style* descriptively, with disclaimer. No logos used. |
| "Vague single purpose" | Single purpose is explicit: open links in Side Panel. |
| "Remote code execution" | None. All JS is bundled inside the zip. |
| "Privacy policy unreachable" | PRIVACY.md is in the repo, plus Pages copy. |
| "Sensitive data unprotected" | `exclude_matches` prevents content script injection on auth/banking hosts. |
| "Modifies headers without disclosure" | DNR rule scoped to the panel's own iframe; disclosed in PRIVACY.md and store listing. |

If you do get rejected, the email lists the violation code (e.g.
"Blue Argon", "Yellow Magnesium"). Reply to the rejection thread directly
inside the dashboard, never via PR — they answer in the same thread.
