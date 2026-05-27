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
| Privacy policy URL | `https://ds009.github.io/side-link-preview/privacy.html` |

> Falls back to the raw markdown if GitHub Pages isn't live yet:
> `https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md`.
> Once Pages is live, paste the HTML one — reviewers prefer rendered HTML.

---

## 2. Short description (max 132 chars)

```
Qualifying links open in Chrome's Side Panel side-by-side. Left/middle click or hover. 9 languages. No tracking, open source.
```

## 3. Detailed description

```
Side Link Preview turns Chrome's Side Panel into a split-view reading surface. Qualifying links — same-tab clicks and new-tab links by default — open on the right, side-by-side with the page you came from. No tab explosion, no context switch, no extra browser. Independent open-source project; not affiliated with any browser vendor.

WHAT IT DOES
• Click qualifying outgoing links → they open in Chrome's Side Panel
• Follow links inside the panel — it refreshes in place without piling up tabs
• Hold ⌘ / Ctrl / Shift / Alt while clicking to fall back to a real new tab

KEY FEATURES
• Mini browser in the panel: address bar, Back / Forward / Refresh, Open in main tab, per-site zoom
• Auto-retry once on embed failures, then a diagnostic card with likely causes and technical details
• Toolbar shortcut: "Don't use side panel on this site" (blacklist mode) — no Settings required
• Per-domain blacklist or whitelist with **separate saved lists**, path-prefix rules and wildcards
• Link scope: all qualifying links (default) or new-tab links only
• Open trigger: left click (default) or middle click; optional hover preview with delay (independent of click mode)
• Smart link filtering: downloads, login/checkout paths, IP addresses, mixed content, and more stay native
• Right-click "Open link in Side Panel" and Alt+Shift+P to preview the current tab
• Automatic light / dark theme; UI in nine languages (follows your browser on first install)
• Works on many iframe-blocking sites via a tightly scoped Side-Panel-only response-header rule

SECURITY & PRIVACY BY DEFAULT
• 125+ sensitive hosts excluded from script injection: sign-in, SSO, banking, webmail, video calls, streaming, cloud consoles, crypto, government TLDs, and more (see manifest)
• Also skips IP addresses, localhost, and corporate `.local` / `.internal` / `.corp` domains
• Checkout, payment, and OAuth paths are never routed through the panel
• No analytics, no tracking, no telemetry, no remote config — settings sync via Chrome only
• Header rewriting applies only to iframe requests initiated by this extension's Side Panel
• Full policy: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

WHO IT'S FOR
• Anyone who wants split-view, side-by-side reading on stock Chrome
• Researchers, students and lawyers who read a long article while opening many sub-links
• Engineers who follow link chains across docs, pull requests and Q&A sites without piling up tabs
• Readers who prefer their original page to stay visible while skimming a referenced source

REQUIREMENTS
Chrome 119 or later (Side Panel API). Also works on Microsoft Edge 119+.

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
Open links the user clicks in Chrome's Side Panel, providing a
split-view browsing experience without leaving the current tab.
```

## 5. Permission justifications

One by one, paste these into the matching fields under
*Privacy practices → Permissions*.

### `sidePanel`
```
Required to render the user-requested preview inside Chrome's Side Panel,
which is the extension's only user-facing surface.
```

### `storage`
```
Persist the user's preferences (blacklist/whitelist mode, **separate**
blacklist and whitelist domain lists, link scope, open trigger, optional
hover preview + delay, UI language, internal revision for multi-tab
saves) and relay the URL to be opened between the content script and the
Side Panel page. All data stays on the user's device and syncs only
through their own Chrome profile.
```

### `tabs`
```
Read the current tab's ID and window ID so the Side Panel can be bound
to the tab the user is browsing, and detect when the active tab changes
to update the panel content. No tab content, browsing history, or tab
metadata is transmitted anywhere.
```

### `declarativeNetRequest`
```
Strip X-Frame-Options and Content-Security-Policy frame-ancestors
response headers so the user-requested page can render inside the Side
Panel iframe. The single dynamic rule is scoped with
initiatorDomains: [chrome.runtime.id] AND resourceTypes: ["sub_frame"],
which means only iframe requests started by THIS extension's Side Panel
ever have a header modified. Regular browsing on every other tab is
completely untouched. The rule is registered once at startup in
background.js and is fully auditable in the open-source code.
```

### `contextMenus`
```
Adds a single local "Open link in Side Panel" entry to Chrome's
right-click menu on link targets, giving users a one-shot way to preview
a link in the Side Panel without changing their blacklist/whitelist or
link-scope settings. The menu item is purely local to the browser — no
information about the link, the page, or the click is transmitted.
```

### Host permission `<all_urls>`
```
Required for two reasons, both essential to the single declared purpose:

(1) The declarativeNetRequest modifyHeaders rule above needs host access
to take effect on the iframe request URL when the user opens a page in
the Side Panel.

(2) The two declared content scripts (one ISOLATED-world for click
interception, one MAIN-world for window.open hijack) need to be able to
match arbitrary destinations, because users want to preview links on the
sites THEY visit — there is no way to know that set in advance.

To minimize risk, the manifest declares an extensive
`exclude_matches` list (125+ patterns) that prevents content-script injection
on sign-in, SSO, banking, webmail, video calls, streaming, cloud consoles,
crypto, government TLDs, and other sensitive hosts — the precise list is
published in the open-source manifest under
`content_scripts[].exclude_matches`. Runtime checks also skip IP addresses,
localhost, checkout/auth paths, and corporate intranet domains.

No page content is read, collected, or transmitted by the extension.
```

### Remote code
Select **"No, I am not using remote code."** The extension only loads
local files and third-party pages **inside a user-visible iframe**; it
does not `eval`, `Function()` or otherwise execute remote scripts in
its own context.

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
| Small promo tile | 440×280 | ✅ `store-assets/promo-small-tile-440x280.png` |
| Marquee promo tile | 1400×560 | ✅ `store-assets/promo-marquee-1400x560.png` (optional, skip if you prefer) |
| Screenshot 1 — "Click any link, read it side-by-side" | 1280×800 | ✅ `store-assets/screenshot-1.png` |
| Screenshot 2 — "Address bar with Back / Forward / Refresh + per-site zoom" | 1280×800 | ✅ `store-assets/screenshot-2.png` |
| Screenshot 3 — "Per-site blacklist / whitelist" | 1280×800 | ✅ `store-assets/screenshot-3.png` |
| Screenshot 4 — "Modifier keys still do what you expect" | 1280×800 | ✅ `store-assets/screenshot-4.png` |
| Screenshot 5 — "9 languages · light/dark" | 1280×800 | ✅ `store-assets/screenshot-5.png` (optional) |

> Regenerate at any time with `npm run screenshots`. The script bakes
> captions and frames into 1280×800 PNGs ready to upload.

Naming convention to keep inside `store-assets/`:
`tile-440x280.png`, `screenshot-1.png` … `screenshot-5.png`.

See [`SCREENSHOT_GUIDE.md`](./SCREENSHOT_GUIDE.md) for capture instructions.

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
  manifest.json background.js embed-probe.js settings-shared.js \
  content.js injected.js sidepanel.html sidepanel.js \
  options.html options.js i18n.js locales icons \
  CHANGELOG.md PRIVACY.md LICENSE README.md \
  -x "*.DS_Store" "icons/icon-square.png"
```

Upload the resulting `.zip` under *Package → Upload new package*.

---

## 8. Post-submission

After the review passes:

1. Create a GitHub release `v1.1.0` linking to the CWS page.
2. Update `README.md` with the CWS install link at the top.
3. Replace `REPLACE_WITH_EXTENSION_ID` in `docs/index.html` with the real ID. (Done: `jpbekmkggadbfacnnlnkjhdkgaoonapn`)
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
点击链接 → 在 Chrome 侧栏并排阅读。左键/中键或悬停预览，九种语言，无追踪、开源。
```

**Description:**
```
Side Link Preview 让原生 Chrome 拥有真正的分屏阅读体验。符合条件的外链（默认含普通链接和新标签页链接）会在 Chrome 侧边栏中并排打开：左侧继续阅读原文，右侧浏览新链接。本扩展为独立开源项目，与任何浏览器厂商无附属关系。

它做了什么
• 点击符合条件的外链 → 在右侧 Side Panel 中打开
• 在侧栏内继续点击链接，原地刷新，不堆积新标签
• 按住 ⌘ / Ctrl / Shift / Alt + 点击 → 像往常一样打开普通新标签

主要功能
• 侧栏迷你浏览器：地址栏、后退/前进/刷新、在主标签页打开、按站点缩放
• 嵌入失败自动重试一次，再失败显示诊断卡片（可能原因 + 技术详情）
• 工具栏一键「此网站不再使用侧边栏」（黑名单模式，无需进设置）
• 按域名黑/白名单，**黑白名单各自独立存储**，支持路径前缀与通配符
• 链接范围：默认接管所有符合条件的外链，也可仅接管新标签页链接
• 打开方式：左键（默认）或中键；悬停预览与点击独立，可设延迟
• 智能过滤：下载、登录/结账路径、IP 地址、混合内容等走原生行为
• 右键「在侧栏中打开链接」、快捷键 Alt+Shift+P 预览当前标签
• 自动跟随系统浅色/深色主题；九种界面语言，首次安装跟随浏览器

安全与隐私
• manifest 中 125+ 敏感域名不注入脚本：登录/SSO、银行、Webmail、视频会议、流媒体、云控制台、加密货币、政府域名等
• 同时跳过 IP 地址、localhost、企业内网域名及 checkout/支付/OAuth 路径
• 不做统计、不做追踪、无服务器；设置仅保存在 Chrome 同步存储
• 完整隐私政策：https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

适用人群
• 想在原生 Chrome 中获得并排分屏阅读体验的用户
• 一边读长文一边打开很多关联链接的研究者、学生、律师
• 在文档、PR、问答站点之间反复跳转的开发者
• 希望阅读时原文始终可见、只用侧栏扫一眼参考资料的用户

要求
Chrome 119 或以上。同样适用于 Microsoft Edge 119+。

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
Cliquez sur un lien → il s'ouvre côte-à-côte dans le panneau latéral de Chrome. Vue partagée, sans pister, open source.
```

**Description:**
```
Side Link Preview transforme le panneau latéral de Chrome en surface de lecture côte-à-côte. Cliquez sur n'importe quel lien qui s'ouvrirait normalement dans un nouvel onglet et il s'affiche à droite, à côté de la page que vous lisiez. Pas de nouvel onglet, pas de rupture de contexte, pas de nouveau navigateur. Projet indépendant et open source, sans affiliation avec aucun éditeur de navigateur.

CE QUE FAIT L'EXTENSION
• Clic sur un lien sortant éligible (par défaut : liens internes et nouvel onglet) → ouverture dans le panneau latéral
• Les clics suivants à l'intérieur du panneau le mettent à jour sur place
• ⌘ / Ctrl / Maj / Alt → bascule vers un véritable nouvel onglet, comme d'habitude

FONCTIONNALITÉS CLÉS
• Mini-navigateur : barre d'adresse, Préc./Suiv., Recharger, ouvrir dans l'onglet principal, zoom par site
• Re-essai auto + carte diagnostic en cas d'échec d'intégration
• Raccourci barre d'outils « Ne plus utiliser le panneau sur ce site » (mode liste noire)
• Listes blanche / noire par domaine, **stockées séparément** (préfixes de chemin + jokers)
• Portée des liens : tous les liens éligibles (par défaut) ou nouvel onglet uniquement
• Déclencheur : clic gauche (défaut) ou molette ; aperçu au survol indépendant
• Filtrage intelligent : téléchargements, chemins login/checkout, adresses IP, contenu mixte — natif
• Menu contextuel, Alt+Shift+P, thème clair/sombre, neuf langues (suit le navigateur)

SÉCURITÉ ET CONFIDENTIALITÉ
• 125+ hôtes sensibles exclus (connexion, banque, webmail, visio, streaming, consoles cloud, crypto, TLD gouvernementaux…)
• Adresses IP, localhost, domaines d'entreprise et chemins checkout/OAuth exclus
• Aucun analytique, aucune télémétrie — réglages dans Chrome uniquement
• Politique : https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

CONFIGURATION REQUISE
Chrome 119 ou ultérieur. Fonctionne aussi sur Microsoft Edge 119+.

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
Pulsa un enlace → se abre en el panel lateral de Chrome, lado a lado. Vista dividida, sin rastreo, código abierto.
```

**Description:**
```
Side Link Preview convierte el panel lateral de Chrome en una superficie de lectura lado-a-lado. Pulsa cualquier enlace que normalmente se abriría en una pestaña nueva y aparecerá a la derecha, junto a la página que estabas leyendo. Sin pestaña nueva, sin cambio de contexto, sin otro navegador. Proyecto independiente de código abierto, sin afiliación con ningún proveedor de navegadores.

QUÉ HACE
• Pulsa enlaces salientes aptos (por defecto: internos y de nueva pestaña) → se abren en el panel lateral
• Pulsa otros enlaces dentro del panel — se actualiza en su sitio
• ⌘ / Ctrl / Mayús / Alt → vuelve a la pestaña nueva clásica

FUNCIONES PRINCIPALES
• Mini-navegador: barra de direcciones, Atrás/Adelante/Recargar, abrir en pestaña principal, zoom
• Reintento auto + tarjeta de diagnóstico si falla la integración
• Atajo en barra: « No usar panel lateral en este sitio » (modo lista negra)
• Lista negra/blanca por dominio, **listas separadas**, prefijos de ruta y comodines
• Alcance: todos los enlaces aptos (defecto) o solo nueva pestaña
• Disparador: clic izquierdo (defecto) o central; vista previa al pasar independiente
• Filtrado: descargas, rutas login/checkout, IP, contenido mixto — nativo
• Menú contextual, Alt+Shift+P, tema auto, nueve idiomas (sigue el navegador)

SEGURIDAD Y PRIVACIDAD
• 125+ hosts sensibles excluidos (login, banca, webmail, videollamadas, streaming, consolas, crypto, TLD gubernamentales…)
• IP, localhost, dominios corporativos y rutas checkout/OAuth excluidos
• Sin analítica ni telemetría — ajustes solo en Chrome
• Política: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

REQUISITOS
Chrome 119 o superior. También en Microsoft Edge 119+.

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
Klick einen Link → er öffnet sich im Chrome-Seitenbereich, nebeneinander. Geteilte Ansicht, kein Tracking, Open Source.
```

**Description:**
```
Side Link Preview macht den Chrome-Seitenbereich zur Lese-Oberfläche im Nebeneinander-Modus. Klicke auf einen Link, der normalerweise in einem neuen Tab öffnen würde — er erscheint rechts, neben der Seite, die du gerade liest. Kein neuer Tab, kein Kontextwechsel, kein zweiter Browser. Unabhängiges Open-Source-Projekt; nicht mit einem Browseranbieter verbunden.

WAS ES TUT
• Klick auf geeignete ausgehende Links (Standard: Same-Tab + Neue-Tab) → öffnet sich im Seitenbereich
• Klicks innerhalb des Seitenbereichs aktualisieren ihn an Ort und Stelle
• ⌘ / Strg / Umschalt / Alt → klassischer neuer Tab

KERNFUNKTIONEN
• Mini-Browser: Adresszeile, Zurück/Vor/Neu laden, im Haupttab öffnen, Zoom pro Site
• Auto-Wiederholversuch + Diagnose-Karte bei Embed-Fehlern
• Toolbar: « Seitenleiste auf dieser Website nicht verwenden » (Blacklist-Modus)
• Black-/Whitelist pro Domain, **getrennt gespeichert**, Pfadpräfixe + Wildcards
• Link-Umfang: alle geeigneten Links (Standard) oder nur Neue-Tab
• Auslöser: Linksklick (Standard) oder Mittelklick; Hover-Vorschau unabhängig
• Filter: Downloads, Login/Checkout-Pfade, IP, Mixed Content — nativ
• Kontextmenü, Alt+Shift+P, helles/dunkles Design, neun Sprachen

SICHERHEIT & DATENSCHUTZ
• 125+ sensible Hosts ausgeschlossen (Login, Bank, Webmail, Video, Streaming, Cloud-Konsolen, Crypto, Gov-TLDs…)
• IP, localhost, Firmendomains und Checkout/OAuth-Pfade ausgeschlossen
• Kein Tracking, keine Telemetrie — Einstellungen nur in Chrome
• Richtlinie: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

VORAUSSETZUNGEN
Chrome 119 oder höher. Funktioniert auch in Microsoft Edge 119+.

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
Clique em um link → abre lado-a-lado no painel lateral do Chrome. Visão dividida, sem rastreio, código aberto.
```

**Description:**
```
Side Link Preview transforma o painel lateral do Chrome em uma superfície de leitura lado-a-lado. Clique em qualquer link que normalmente abriria em uma aba nova e ele aparece à direita, ao lado da página que você estava lendo. Sem aba nova, sem troca de contexto, sem outro navegador. Projeto independente e de código aberto, sem afiliação com qualquer fornecedor de navegador.

O QUE ELE FAZ
• Clique em links de saída elegíveis (padrão: mesma aba e nova aba) → abre no painel lateral
• Cliques dentro do painel atualizam o conteúdo no mesmo lugar
• ⌘ / Ctrl / Shift / Alt → volta à aba nova clássica

PRINCIPAIS RECURSOS
• Mini-navegador: barra de endereços, Voltar/Avançar/Recarregar, abrir na aba principal, zoom
• Tentativa auto + cartão de diagnóstico em falhas de integração
• Atalho na barra: « Não usar painel lateral neste site » (modo lista negra)
• Lista negra/branca por domínio, **armazenamento independente**, prefixos de caminho + curingas
• Escopo: todos os links elegíveis (padrão) ou apenas nova aba
• Gatilho: clique esquerdo (padrão) ou do meio; hover independente do clique
• Filtragem: downloads, rotas login/checkout, IP, conteúdo misto — nativo
• Menu de contexto, Alt+Shift+P, tema auto, nove idiomas (segue o navegador)

SEGURANÇA E PRIVACIDADE
• 125+ hosts sensíveis excluídos (login, banco, webmail, vídeo, streaming, consoles, crypto, TLDs gov…)
• IP, localhost, domínios corporativos e rotas checkout/OAuth excluídos
• Sem analytics ou telemetria — configurações só no Chrome
• Política: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

REQUISITOS
Chrome 119 ou superior. Também no Microsoft Edge 119+.

CÓDIGO ABERTO
Licença MIT. Issues e PRs bem-vindos:
https://github.com/ds009/side-link-preview

APOIE O PROJETO
https://github.com/sponsors/ds009
```
