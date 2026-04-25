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
Show HN: Side Link Preview – Arc-style split view for stock Chrome
```

**Body (first comment by you):**

```
Hi HN — author here.

I missed Arc's split view enough to ship a tiny extension that does the same
thing in stock Chrome: every target="_blank" link opens in Chrome's native
Side Panel instead of a new tab. So you can read Hacker News on the left
and the article you just clicked on the right, no Spaces, no new tabs, no
TabFS.

A few things I cared about:

- Modifier-key bypass (⌘ / Ctrl / Shift / Alt + click) drops out to a real
  new tab — no fight with the page.
- exclude_matches prevents the content script from running on auth, SSO,
  banking and payment hosts. I didn't want anyone's 2FA flow loaded inside
  an iframe.
- declarativeNetRequest is scoped to initiatorDomains: [chrome.runtime.id]
  and resourceTypes: ["sub_frame"] only, so it only relaxes frame-blocking
  headers for the panel's own iframe and never for normal browsing.
- No analytics, no telemetry, no ads. Settings sync via storage.sync.
- 6 languages, auto light/dark.

It's MIT-licensed and free. Feedback (especially "this is broken on site X")
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
[Free + open source] Side Link Preview – open every link in Chrome's Side Panel (Arc-style split view)
```

**Body:**

```
Built this because I switch between Chrome and Arc and missed having the
Side Panel feel like a real second pane. It hijacks target="_blank" clicks
(and window.open) and routes them into chrome.sidePanel instead of opening
a new tab.

What's in it:
- Click or hover trigger, configurable delay
- Per-domain blacklist / whitelist with wildcards
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
Arc-style split view for stock Chrome.
```

**Description (≤ 260 chars):**

```
Side Link Preview opens every link inside Chrome's Side Panel — so you
keep your tab on the left and read the linked page on the right.
Per-domain rules, keyboard shortcut, dark mode, 6 languages. Free,
open-source, no tracking.
```

**Maker comment (first comment after submitting):**

```
Hey Product Hunt — I built this because I was tired of:
1. Tab explosions every time I read docs.
2. Arc being Mac-only and replacing my whole browser.
3. Edge's split-screen requiring Edge.

Side Link Preview just routes target="_blank" clicks into
chrome.sidePanel instead of a new tab. That's it. Nothing else changes.

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

Read source on the left, linked article on the right. Arc-style split
view, on stock Chrome.

{{CWS_URL}}
```

**2/**
```
- ⌘ / Ctrl / Shift / Alt + click → real new tab when you actually want one
- Hover trigger if click feels too aggressive
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
— Works on Chrome 119+ and Edge
— 6 UI languages, auto light/dark
— Per-domain rules, keyboard shortcut, right-click menu

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
read source on the left + linked article on the right. Arc-style split
view but on stock Chrome.

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
Title: Side Link Preview – a free Chrome extension I built to bring
       Arc-style split view to stock Chrome

Long story short: I wanted "click a link, read it side-by-side" without
switching browsers. So I built it.

Stack: vanilla JS, Manifest V3, chrome.sidePanel + declarativeNetRequest.
Source: {{REPO_URL}}.

Things I'd love feedback on:
- The settings UX (per-domain rules, hover delay, trigger mode)
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
