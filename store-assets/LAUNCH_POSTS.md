# Launch Posts — Side Link Preview

Copy-paste-ready posts for the day the extension goes live. Each one is
already trimmed to the platform's character / style limits.

> Replace these placeholders before posting:
> - `{{CWS_URL}}` → final Chrome Web Store URL
> - `{{LANDING_URL}}` → e.g. `https://ds009.github.io/side-link-preview/`
> - `{{REPO_URL}}` → e.g. `https://github.com/ds009/side-link-preview`

---

## Hacker News — Show HN

**Title (≤ 80 chars):**

```
Show HN: Side Link Preview – open every link in Chrome's Side Panel
```

**Body (first comment by you):**

```
Hi HN — author here.

I wanted a split-view reading workflow without switching browsers, so I
shipped a tiny extension that hijacks every target="_blank" click and
routes it into Chrome's native Side Panel. Read the source on the left,
read the linked article on the right, no new tabs.

A few things I cared about:

- Modifier-key bypass (⌘ / Ctrl / Shift / Alt + click) drops out to a real
  new tab — no fight with the page.
- The Side Panel itself has Back / Forward / Refresh and an editable
  address bar, so it actually feels like a real second browser pane.
- 10 link-filtering rules skip the panel for downloads, login pages,
  same-page anchors, mixed-content, localhost, etc., so it never
  intercepts something it shouldn't.
- exclude_matches prevents the content script from running on auth, SSO,
  banking and payment hosts. I didn't want anyone's 2FA flow loaded
  inside an iframe.
- declarativeNetRequest is scoped to initiatorDomains:
  [chrome.runtime.id] and resourceTypes: ["sub_frame"], so it only
  relaxes frame-blocking headers for the panel's own iframe and never
  for normal browsing.
- No analytics, no telemetry, no ads. Settings sync via storage.sync.
- 6 languages, auto light/dark.

MIT-licensed and free. Feedback (especially "this is broken on site X")
very welcome.

Code: {{REPO_URL}}
Install: {{CWS_URL}}
Site: {{LANDING_URL}}
```

> Posting tips: Tuesday/Wednesday ~9am Pacific is the highest-traffic
> window. Reply to every comment within the first 90 minutes — engagement
> is what keeps you on the front page.

---

## Reddit — r/chrome_extensions

**Title:**

```
[Free + open source] Side Link Preview – open every link in Chrome's Side Panel
```

**Body:**

```
Built this to make Chrome's Side Panel feel like a real second pane. It
hijacks target="_blank" clicks (and window.open) and routes them into
chrome.sidePanel instead of opening a new tab.

What's in it:
- Side Panel with Back / Forward / Refresh + editable address bar
- Per-domain blacklist / whitelist with wildcards (subdomain-aware)
- Smart link filtering — downloads, logins, same-page anchors etc.
  stay native and never enter the panel
- Right-click → "Open link in Side Panel"
- Alt+Shift+P to preview the current tab
- ⌘ / Ctrl / Shift / Alt + click bypasses the panel
- Auto light & dark, 6 UI languages
- No tracking, no ads, MIT-licensed

Source: {{REPO_URL}}
Install: {{CWS_URL}}

Happy to take feature requests / bug reports here or on GitHub.
```

---

## Reddit — r/productivity

```
Title: Tiny Chrome extension that turns every link into a side-by-side
       reading pane

I've been doing all my reading in Chrome's Side Panel for the last month
and I genuinely can't go back. Every time I click a link, the article
loads on the right while my source page stays on the left. No tab
spaghetti, no Cmd+Tabbing between windows.

I wrapped the workflow into a free, open-source extension:
{{CWS_URL}}

It's 100% local, no analytics. Source: {{REPO_URL}}.
```

---

## Reddit — r/chrome / r/edge

Smaller, more skeptical communities. Lead with the feature, not the
backstory:

```
Title: Free extension: open links in the Side Panel instead of a new tab

Click any link → it loads in Chrome/Edge's Side Panel on the right. Holding
⌘/Ctrl/Shift/Alt opens it as a normal tab. Per-domain rules, keyboard
shortcut, right-click menu. MIT, no tracking.

{{CWS_URL}} · {{REPO_URL}}
```

---

## Product Hunt

**Tagline (≤ 60 chars):**

```
Open every link in Chrome's Side Panel — split view.
```

**Description (≤ 260 chars):**

```
Side Link Preview opens every link inside Chrome's Side Panel — keep
your tab on the left, read the linked page on the right. Mini browser
controls, per-domain rules, keyboard shortcut, dark mode, 6 languages.
Free, open-source, no tracking.
```

**Maker comment (first comment after submitting):**

```
Hey Product Hunt — I built this because tab explosions while reading
docs got out of hand and I wanted a split-view workflow without switching
browsers.

Side Link Preview routes target="_blank" clicks into chrome.sidePanel
instead of a new tab. That's it. Nothing else changes — modifier keys
still do what you expect.

Things I'd love feedback on:
- Sites that fail to load in the panel (paste a URL and I'll look).
- Whether you'd pay for a Pro tier (multi-panel, AI summary, …) or
  prefer the whole thing stay free.

Cheers.
```

> Tip: ship to Product Hunt **after** Hacker News if both go on the same
> day; PH's Pacific-time-of-day prime is 12:01am.

---

## Twitter / X — launch thread (4 tweets)

**1/**
```
Built a free Chrome extension I now can't live without:

every target="_blank" link opens in Chrome's Side Panel, not a new tab.

Read the source on the left, the linked article on the right. Split-view
reading, on stock Chrome.

{{CWS_URL}}
```

**2/**
```
- ⌘ / Ctrl / Shift / Alt + click → real new tab when you actually want one
- Side Panel with Back / Forward / Refresh + editable address bar
- Per-domain blacklist / whitelist with wildcards
- Right-click any link → "Open in Side Panel"
- Alt+Shift+P previews the current tab
```

**3/**
```
- Auto light & dark
- UI in EN / 中文 / FR / ES / DE / PT
- No analytics, no tracking, no ads
- Excludes auth + banking hosts so no 2FA flows ever load in an iframe
- Smart link filtering: downloads, logins, mixed content stay native
- Settings sync across your Chrome profile
```

**4/**
```
MIT-licensed, source on GitHub:
{{REPO_URL}}

Pull requests + issues welcome — especially "this is broken on site X"
reports.
```

---

## LinkedIn (single post)

```
I shipped a small thing: Side Link Preview, a free Chrome extension that
opens every outgoing link in Chrome's native Side Panel.

Use case: read documentation / Hacker News / a blog post on the left;
linked article opens on the right. No tab explosion, no second monitor
required.

— Free, MIT-licensed, no tracking
— Works on Chrome 119+ and Edge 119+
— 6 UI languages, auto light/dark
— Per-domain rules, smart link filtering, keyboard shortcut, right-click menu

Install: {{CWS_URL}}
Source: {{REPO_URL}}

Built it for myself first; happy if it's useful to anyone else.
```

---

## Beta-tester invite (Twitter DM, friend group, indie communities)

```
Hey — I'm shipping a tiny Chrome extension and looking for ~10 people to
kick the tires before the public Web Store launch. Takes maybe 3 min.

What it does: opens every outgoing link in Chrome's Side Panel, so you
read source on the left + linked article on the right. Split-view
reading, on stock Chrome.

Install (unlisted CWS link): {{CWS_URL}}

If you spot a site that breaks inside the panel, paste me the URL — that's
the only feedback I need. No tracking inside the extension itself, MIT,
source: {{REPO_URL}}.
```

> Use the **Unlisted** visibility on the CWS first 24–48h: only people
> with the link can install, but it's the same store entry — when you
> flip it to Public later, no migration needed and the install count
> carries over.

---

## Indie Hackers / Slack / Discord (medium-form)

```
Title: Side Link Preview – a free Chrome extension that opens every link
       in the Side Panel for split-view reading

Long story short: I wanted "click a link, read it side-by-side" without
switching browsers. So I built it.

Stack: vanilla JS, Manifest V3, chrome.sidePanel + declarativeNetRequest.
Source: {{REPO_URL}}.

Things I'd love feedback on:
- The settings UX (per-domain rules, link scope)
- Sites that fail to load in the iframe — those are the real blockers
- Whether a $5 one-time Pro tier (multi-panel, AI summary, cross-device
  sync) sounds reasonable or annoying

Cheers.
```

---

## Posting cadence (1 week plan)

| Day | Channel | Why |
| --- | --- | --- |
| Mon | Beta-test DMs to 10 friends | Surface obvious bugs before strangers see it |
| Tue 09:00 PT | Show HN | Highest-leverage single post |
| Tue 12:01 AM PT | Product Hunt (24h cycle) | Independent of HN traffic |
| Tue afternoon | Twitter thread | Seeded by HN front-page |
| Wed | r/chrome_extensions, r/productivity | Each subreddit has its own peak |
| Thu | LinkedIn | Different audience, captures professional users |
| Fri | Indie Hackers + Discord communities you're in | Long tail |
| Sat/Sun | Quiet — let reviewers find you organically | Keeps the GitHub stars curve clean |

> Don't repost the *same* link to every subreddit on the same day; Reddit
> shadow-bans cross-posters. Tweak the title and lede each time.
