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
Split-view link preview for Chrome — Arc-style and Edge-style side-by-side reading, on stock Chrome. Click, preview, move on.
```

## 3. Detailed description

```
Side Link Preview is a split-view link previewer for Chrome — an Arc-style and Edge-style side-by-side reading experience, built for stock Chrome. Not affiliated with The Browser Company or Microsoft.

Every outgoing link that would normally open in a new tab opens in Chrome's Side Panel instead. You keep reading on the left; the linked page loads on the right. No new tab, no context switch.

WHAT IT DOES
• Click any target="_blank" link — it opens in Chrome's Side Panel side-by-side with the current tab.
• Clicking another link inside the panel refreshes the panel in place. Keep following links without piling up tabs.
• Hold ⌘ / Ctrl / Shift / Alt while clicking to fall back to a real new tab.

KEY FEATURES
• Arc-style split reading — without leaving Chrome
• Built-in address bar and "pop out to new tab" button inside the panel
• Hover-to-preview mode with a configurable delay
• Per-domain blacklist or whitelist (wildcards supported)
• Option to intercept all links, not just target="_blank"
• Keyboard shortcut and right-click "Open in Side Panel"
• Works on sites that normally block iframes — via a scoped, Side-Panel-only response header rule
• Sign-in, SSO and payment flows (Google / Apple / Microsoft / Stripe / PayPal…) are excluded from interception by default
• Automatic light / dark theme — follows your system

PRIVACY
• No analytics. No tracking. No data ever leaves your browser.
• All settings live in your Chrome sync storage.
• Full policy: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

WHO IT'S FOR
• People who moved from Arc back to Chrome and want a similar split-view flow
• Users of Edge's side-by-side browsing who want the same on Chrome
• Researchers opening 20 tabs while reading a single article
• Engineers following links in docs, PRs, and Stack Overflow

REQUIREMENTS
Chrome 119 or later (Side Panel API + content-script enhancements). Also works on Microsoft Edge.

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

### `contextMenus`
```
Adds a single local "Open link in Side Panel" entry to Chrome's
right-click menu on link targets, giving users a one-shot way to preview
a link in the Side Panel without changing their blacklist or link-scope
settings. The menu item is purely local to the browser — no information
about the link, the page, or the click is transmitted off-device.
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

Either use the npm script (recommended — keeps the same file list as the
GitHub Actions `release.yml` workflow):

```bash
npm run zip
```

Or equivalently by hand from the repo root:

```bash
zip -r "side-link-preview-$(node -p "require('./manifest.json').version").zip" \
  manifest.json background.js content.js injected.js \
  sidepanel.html sidepanel.js options.html options.js \
  i18n.js locales icons PRIVACY.md LICENSE README.md \
  -x "*.DS_Store" "icons/icon-square.png"
```

Upload the resulting `.zip` under *Package → Upload new package*.

---

## 8. Post-submission

After the review passes:

1. Create a GitHub release `v0.9.0` linking to the CWS page.
2. Update `README.md` with the CWS install link at the top.
3. Replace `REPLACE_WITH_EXTENSION_ID` in `docs/index.html` with the real ID.
4. Announce — see `store-assets/LAUNCH_POSTS.md` (HN / Product Hunt /
   Reddit / Twitter / LinkedIn templates ready to copy).

---

## 9. Localized listings (zh / fr / es / de / pt)

The CWS dashboard lets you add **per-locale name + description**. The
fields below are pre-translated; paste each into the matching language
section under *Store listing → Localizations*.

> Field length budgets are the same as the English version: name ≤ 45
> chars, summary ≤ 132 chars, description ≤ 16,000 chars.

### Chinese (Simplified) — `zh-CN`

**Name:** `Side Link Preview · 侧栏链接预览`

**Summary (≤ 132):**
```
点击链接，自动在 Chrome 侧边栏中并排打开 — Arc 同款分屏阅读、Edge 同款侧边浏览，原生 Chrome 即可使用。
```

**Description:**
```
Side Link Preview 让原生 Chrome 也拥有 Arc 同款分屏阅读体验：所有 target="_blank" 链接都会在 Chrome 侧边栏中并排打开，左侧继续阅读原文，右侧浏览新链接，不再被新标签页淹没。本扩展与 The Browser Company（Arc）和 Microsoft（Edge）无任何关联。

功能特性
• 点击任意外部链接 → 自动在右侧 Side Panel 中打开
• 在侧栏内继续点击链接，会原地刷新，不再堆积新标签
• 按住 ⌘ / Ctrl / Shift / Alt + 点击 可临时回退到普通新标签
• 内置悬停预览模式，可调延迟
• 支持按域名白名单 / 黑名单（支持通配符）
• 可选拦截所有链接，而不仅是 target="_blank"
• 快捷键 Alt+Shift+P 预览当前标签
• 右键菜单「在侧栏中打开链接」
• 自动跟随系统浅色 / 深色主题
• 登录、SSO、支付域名（Google / Apple / Microsoft / Stripe / PayPal 等）默认排除，确保安全

隐私
• 不做任何统计、追踪或数据上传
• 全部设置仅通过 Chrome 自身的同步存储保存
• 完整隐私政策：https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

适用人群
• 怀念 Arc 分屏体验、但希望留在 Chrome 的用户
• 喜欢 Edge 双页并排浏览的用户
• 经常一边读文章、一边打开 20 个标签的研究者
• 在文档、PR、Stack Overflow 之间频繁跳转的开发者

要求
Chrome 119 或以上（需要 Side Panel API），同样适用于 Microsoft Edge。

开源
本扩展采用 MIT 许可证，欢迎在 GitHub 上提 Issue 或 PR：
https://github.com/ds009/side-link-preview

支持作者
如果它为你节省了时间，欢迎在 GitHub Sponsors 上赞助：
https://github.com/sponsors/ds009
```

---

### French — `fr`

**Name:** `Side Link Preview — vue partagée pour Chrome`

**Summary:**
```
Ouvrez chaque lien dans le panneau latéral de Chrome — la vue partagée style Arc et Edge, sur le Chrome standard.
```

**Description:**
```
Side Link Preview apporte la lecture côte-à-côte façon Arc et Edge au Chrome standard. Tous les liens target="_blank" s'ouvrent dans le panneau latéral de Chrome au lieu d'un nouvel onglet : vous continuez à lire votre page sur la gauche, l'article cliqué s'affiche sur la droite. Sans affiliation avec The Browser Company ni Microsoft.

CE QUE FAIT L'EXTENSION
• Clic sur n'importe quel lien target="_blank" → ouverture dans le panneau latéral
• Les clics suivants à l'intérieur du panneau le mettent à jour sur place
• Maintenez ⌘ / Ctrl / Maj / Alt pour ouvrir un véritable nouvel onglet

FONCTIONNALITÉS CLÉS
• Vue partagée style Arc — sans quitter Chrome
• Barre d'adresse intégrée et bouton « ouvrir dans un nouvel onglet »
• Mode survol avec délai configurable
• Listes blanche / noire par domaine (avec jokers)
• Possibilité d'intercepter tous les liens, pas seulement target="_blank"
• Raccourci clavier et menu contextuel « Ouvrir dans le panneau latéral »
• Fonctionne sur les sites qui bloquent normalement les iframes — via une règle d'en-tête limitée au panneau
• Connexions, SSO et paiements (Google / Apple / Microsoft / Stripe / PayPal…) exclus par défaut
• Thème clair / sombre automatique

CONFIDENTIALITÉ
• Aucun analytique, aucun traçage, aucune donnée envoyée à l'extérieur
• Les réglages restent dans le stockage Chrome de l'utilisateur
• Politique complète : https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

CONFIGURATION REQUISE
Chrome 119 ou ultérieur. Fonctionne aussi sur Microsoft Edge.

OPEN SOURCE
Sous licence MIT. Issues et PR bienvenues :
https://github.com/ds009/side-link-preview

SOUTENIR LE PROJET
https://github.com/sponsors/ds009
```

---

### Spanish — `es`

**Name:** `Side Link Preview — vista dividida para Chrome`

**Summary:**
```
Abre cada enlace en el panel lateral de Chrome — vista dividida estilo Arc y Edge, sobre el Chrome estándar.
```

**Description:**
```
Side Link Preview lleva la lectura en paralelo estilo Arc y Edge al Chrome estándar. Cada enlace target="_blank" se abre en el panel lateral de Chrome en lugar de en una pestaña nueva: tú sigues leyendo a la izquierda y el enlace pulsado aparece a la derecha. Sin afiliación con The Browser Company ni Microsoft.

QUÉ HACE
• Pulsa cualquier enlace target="_blank" → se abre en el panel lateral
• Los clics dentro del panel lo actualizan en su sitio
• Mantén ⌘ / Ctrl / Mayús / Alt para abrir una pestaña real

FUNCIONES PRINCIPALES
• Vista dividida estilo Arc, sin salir de Chrome
• Barra de direcciones integrada y botón para abrir en pestaña
• Modo "hover" con retardo configurable
• Lista negra / blanca por dominio (con comodines)
• Opción para interceptar todos los enlaces, no solo target="_blank"
• Atajo de teclado y opción "Abrir en panel lateral" en el menú contextual
• Funciona en sitios que bloquean iframes — mediante una regla de cabeceras limitada al panel
• Inicios de sesión, SSO y pagos (Google / Apple / Microsoft / Stripe / PayPal…) excluidos por defecto
• Tema claro / oscuro automático

PRIVACIDAD
• Sin analítica, sin seguimiento, ningún dato sale del navegador
• Ajustes guardados en el almacenamiento de sincronización de Chrome
• Política completa: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

REQUISITOS
Chrome 119 o superior. También en Microsoft Edge.

CÓDIGO ABIERTO
Licencia MIT. Issues y PRs bienvenidas:
https://github.com/ds009/side-link-preview

APOYAR EL PROYECTO
https://github.com/sponsors/ds009
```

---

### German — `de`

**Name:** `Side Link Preview — geteilte Ansicht für Chrome`

**Summary:**
```
Öffnet jeden Link im Chrome-Seitenbereich — geteilte Ansicht im Arc- und Edge-Stil, auf normalem Chrome.
```

**Description:**
```
Side Link Preview bringt das nebeneinanderliegende Lesen im Stil von Arc und Edge auf das normale Chrome. Jeder target="_blank"-Link öffnet sich im Chrome-Seitenbereich statt in einem neuen Tab: Du liest links weiter, der angeklickte Link erscheint rechts. Nicht verbunden mit The Browser Company oder Microsoft.

WAS ES TUT
• Klick auf einen target="_blank"-Link → öffnet sich im Seitenbereich
• Klicks innerhalb des Seitenbereichs aktualisieren ihn an Ort und Stelle
• ⌘ / Strg / Umschalt / Alt halten → klassischer neuer Tab

KERNFUNKTIONEN
• Geteilte Ansicht im Arc-Stil — ohne Chrome zu verlassen
• Eingebaute Adresszeile und „In neuem Tab öffnen"-Button
• Hover-Modus mit konfigurierbarer Verzögerung
• Black-/Whitelist pro Domain (Wildcards unterstützt)
• Option, alle Links abzufangen, nicht nur target="_blank"
• Tastenkürzel und Kontextmenü „Im Seitenbereich öffnen"
• Funktioniert auch bei Seiten, die iframes normalerweise blockieren — über eine eng eingegrenzte Header-Regel
• Login-, SSO- und Zahlungsdomains (Google / Apple / Microsoft / Stripe / PayPal …) standardmäßig ausgeschlossen
• Automatisches helles / dunkles Design

DATENSCHUTZ
• Keine Analytik, kein Tracking, keine Datenübertragung
• Einstellungen ausschließlich im Chrome-Sync-Speicher
• Vollständige Richtlinie: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

VORAUSSETZUNGEN
Chrome 119 oder höher. Funktioniert auch in Microsoft Edge.

OPEN SOURCE
MIT-Lizenz. Issues und PRs willkommen:
https://github.com/ds009/side-link-preview

PROJEKT UNTERSTÜTZEN
https://github.com/sponsors/ds009
```

---

### Portuguese (Brazil) — `pt-BR`

**Name:** `Side Link Preview — visão dividida para Chrome`

**Summary:**
```
Abre cada link no painel lateral do Chrome — visão dividida estilo Arc e Edge, no Chrome comum.
```

**Description:**
```
Side Link Preview traz a leitura lado-a-lado no estilo Arc e Edge para o Chrome comum. Todo link target="_blank" abre no painel lateral do Chrome em vez de em uma nova aba: você continua lendo à esquerda e o link aberto aparece à direita. Sem nenhuma afiliação com The Browser Company ou Microsoft.

O QUE ELE FAZ
• Clique em qualquer link target="_blank" → abre no painel lateral
• Cliques dentro do painel atualizam o conteúdo no mesmo lugar
• Segure ⌘ / Ctrl / Shift / Alt para abrir uma aba normal

PRINCIPAIS RECURSOS
• Visão dividida estilo Arc — sem sair do Chrome
• Barra de endereços embutida e botão para abrir em nova aba
• Modo de pré-visualização ao passar o mouse, com atraso configurável
• Lista negra / branca por domínio (com curingas)
• Opção para interceptar todos os links, não só target="_blank"
• Atalho de teclado e item "Abrir no painel lateral" no menu de contexto
• Funciona até em sites que normalmente bloqueiam iframes — via regra de cabeçalho restrita ao painel
• Logins, SSO e pagamentos (Google / Apple / Microsoft / Stripe / PayPal…) excluídos por padrão
• Tema claro / escuro automático

PRIVACIDADE
• Sem analytics, sem rastreamento, nenhum dado sai do navegador
• Configurações guardadas apenas no armazenamento de sincronização do Chrome
• Política completa: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

REQUISITOS
Chrome 119 ou superior. Também no Microsoft Edge.

CÓDIGO ABERTO
Licença MIT. Issues e PRs bem-vindos:
https://github.com/ds009/side-link-preview

APOIE O PROJETO
https://github.com/sponsors/ds009
```
