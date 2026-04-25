# Screenshot Guide — Side Link Preview

> Goal: 5 screenshots × **1280 × 800** PNG (Chrome Web Store hard cap).
> Save as `store-assets/screenshot-1.png` … `screenshot-5.png`.

The store lets you upload up to **5 screenshots**. The **first one is the
hero** — it's the only one most users see in search results, so make it
worth the click.

---

## Pre-flight (do once)

Set up a clean recording profile so nothing personal leaks:

1. Create a fresh Chrome profile: *People → Add → Continue without account*.
2. Sign out of every site. Clear bookmarks bar, hide other extensions.
3. Window size: **1280 × 800** exactly.
   - macOS one-liner: `osascript -e 'tell application "Google Chrome" to set bounds of window 1 to {0, 0, 1280, 800}'`
   - Or use the Window Resizer extension and set 1280 × 800.
4. Set OS to light mode (we'll do a dark variant separately).
5. System language: English (avoids accidentally leaking 中文 UI in Chrome chrome).
6. Zoom: 100%.
7. Hide: bookmarks bar (`⌘ Shift B`), other extensions (pin only Side Link Preview).
8. Empty the address bar.
9. Pick three "demo sites" that look clean and have no logged-in personalisation:
   - **Wikipedia** (en.wikipedia.org/wiki/Side_panel)
   - **MDN** (developer.mozilla.org/en-US/docs/Web/HTML)
   - **Hacker News** (news.ycombinator.com)
   - or your own blog / a docs site

> Avoid: anything with the user's avatar visible, anything showing balances,
> anything that includes Chrome / Arc / Edge / Microsoft branding inside the
> screenshot frame.

---

## Screenshot 1 — Hero shot (THE one)

**File:** `screenshot-1.png` · 1280 × 800

Goal: in 1.5 seconds a stranger should *get* what the extension does.

**Setup**
- Left: Wikipedia article ("Side panel" or any neutral topic).
- Right: Side Panel open, displaying an MDN article (e.g. "HTML iframe").
- Pin icon visibly toggled on (so the panel looks "stuck open").

**Director's notes**
- Pick an MDN page whose top heading and an excerpt of body text fit in the
  visible area without a scrollbar.
- Add a **bold caption strip** at the top, ~80 px tall:

  > *"Click any link → it opens side-by-side, in stock Chrome."*

  Use a single accent color (#2563eb) and white text, sans-serif. No emoji.
- Optional: faint cursor arrow over a link in the left page with a small
  callout `→ opens in panel`.

---

## Screenshot 2 — Hover preview / trigger modes

**File:** `screenshot-2.png`

Goal: show that you can choose *Click* vs *Hover* and configure delay.

**Setup**
- Open the Options page (chrome-extension://…/options.html).
- Scroll so the "Trigger" section is the visual center.
- Have the *Hover* radio selected and the delay slider at ~600 ms.

**Caption (top strip):**
> *"Click or hover — your call. Per-domain rules included."*

---

## Screenshot 3 — Per-domain rules

**File:** `screenshot-3.png`

Goal: show the extension is power-user friendly.

**Setup**
- Options page, "Scope" section centered.
- *Blacklist* mode selected.
- Domain textarea pre-filled with three convincing sample lines:
  ```
  *.youtube.com
  twitter.com
  *.docs.google.com
  ```
- The "Saved" status pill visible in the corner (`color: #16a34a`).

**Caption:**
> *"Blacklist or whitelist any site. Wildcards supported."*

---

## Screenshot 4 — Modifier-key bypass / shortcut

**File:** `screenshot-4.png`

Goal: highlight the ergonomic escape hatches.

Two acceptable framings — pick whichever looks better:

**Option A — keyboard shortcut**
- Show any web page in the foreground.
- Overlay a fake-but-realistic key combo graphic in the bottom-center:
  `[ Alt ] + [ Shift ] + [ P ]`
- Caption: *"Press `Alt+Shift+P` to preview the current tab."*

**Option B — modifier bypass**
- Web page with a link visibly hovered.
- Overlay: `[ ⌘ ] + click → real new tab`
- Caption: *"Need a real new tab? Hold `⌘ / Ctrl / Shift / Alt`."*

---

## Screenshot 5 — Dark mode + i18n

**File:** `screenshot-5.png`

Goal: show polish + that the extension speaks 6 languages.

**Setup**
- Switch macOS to dark mode (`System Settings → Appearance → Dark`).
- Open the Options page in **Chinese** (set Language → 中文 in options first).
- Take the shot with the Side Panel also visible on the right showing a
  page in dark mode (e.g. MDN dark theme).

**Caption:**
> *"Auto light + dark · 6 languages · No tracking, no ads."*

---

## Marketing tile / promo image (optional but recommended)

The store also has a **promo tile** field (440 × 280, optional). Create one:

- Background: gradient `#2563eb → #db2777`.
- Center: extension icon (96 px), to its right the wordmark
  *"Side Link Preview"* in white sans-serif.
- Tagline below in 14 px: *"Side-by-side reading, on stock Chrome."*

Save as `store-assets/promo-tile-440x280.png`.

> Keep this asset under 1 MB, no Chrome / Arc / Edge logos — automated
> reviewers reject those instantly.

---

## Tooling tips

- **Capture**: macOS `⌘ Shift 4 → Space → click window` gives a perfect
  window-shaped PNG. Then use Preview to crop to 1280 × 800.
- **Caption strip**: Figma, Keynote, or just `convert` from ImageMagick:
  ```bash
  convert screenshot-raw.png \
      -gravity north -background "#2563eb" -splice 0x80 \
      -fill white -font "Helvetica-Bold" -pointsize 28 \
      -annotate +0+30 "Click any link → side-by-side." \
      screenshot-1.png
  ```
- **Compress**: run every shot through [TinyPNG](https://tinypng.com) before
  uploading. Store rejects anything over 10 MB but smaller = faster review.
- **Verify size** before upload:
  ```bash
  sips -g pixelWidth -g pixelHeight store-assets/screenshot-*.png
  ```

---

## Final sanity checklist

Before uploading, confirm each screenshot:

- [ ] Exactly **1280 × 800** PNG, ≤ 1 MB.
- [ ] No personal data (avatars, names, emails, balances).
- [ ] No Chrome / Arc / Edge logos visible (the *icon* of Chrome in the
  toolbar is fine; the **wordmark** is not).
- [ ] No copyrighted imagery you don't own (movie posters, paid stock).
- [ ] Caption is in English (you can localize per-locale store listings later).
- [ ] No URLs in the address bar containing `localhost`, internal tools,
  staging hostnames, or anything you don't want public.
- [ ] If you record a 30-second YouTube demo, paste the link into the store
  *Promotional video* field — it boosts conversion noticeably.
