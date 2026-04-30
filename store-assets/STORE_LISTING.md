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
Click a link → it opens in Chrome's Side Panel side-by-side. Split-view reading on stock Chrome. No tracking, open source.
```

## 3. Detailed description

```
Side Link Preview turns Chrome's Side Panel into a split-view reading surface. Click any link that would normally open in a new tab and it loads on the right, side-by-side with the page you came from. No new tab, no context switch, no extra browser. Independent open-source project; not affiliated with any browser vendor.

WHAT IT DOES
• Click any target="_blank" link → it opens in Chrome's Side Panel.
• Click another link inside the panel — it refreshes the panel in place. Keep following links without piling up tabs.
• Hold ⌘ / Ctrl / Shift / Alt while clicking to fall back to a real new tab. Each modifier maps to a distinct, predictable behavior — the panel is never used when you hold one.

KEY FEATURES
• Side Panel address bar with Back / Forward / Refresh — works exactly like a tiny browser inside the panel
• Auto-retry once on transient embed failures, then a clear "open in a new tab" fallback card
• Per-domain blacklist or whitelist with subdomain-aware matching and wildcard support
• Smart link filtering: same-page anchors, downloads, login/OAuth pages, mixed content, localhost, and more open natively instead of in the panel
• Right-click "Open link in Side Panel" — a one-shot bypass of every rule
• Keyboard shortcut Alt+Shift+P to preview the current tab in the Side Panel
• Automatic light / dark theme — follows your system
• Works on sites that normally block iframes — via a tightly-scoped Side-Panel-only response-header rule (see Privacy below)
• Sign-in, SSO, payment and end-to-end-encrypted messaging hosts are excluded from interception by default for security (the full host list lives in the open-source manifest)
• Six built-in UI languages: English, 中文, Français, Español, Deutsch, Português

PRIVACY
• No analytics. No tracking. No telemetry. No remote config.
• No data ever leaves your browser. The extension itself has no server.
• All settings live in your Chrome sync storage and travel with your Chrome profile only.
• Header rewriting is restricted to iframe requests initiated by the extension itself (initiatorDomains: extension ID + resourceTypes: sub_frame). Regular browsing on every other tab is untouched.
• Full policy: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

WHO IT'S FOR
• People who moved from Arc back to Chrome and miss split-view reading
• Edge users who want side-by-side browsing on every Chrome profile
• Researchers, students, lawyers — anyone who reads a long article while opening 20 sub-links
• Engineers following links across docs, PRs, and Stack Overflow

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
Persist the user's preferences (blacklist/whitelist, link scope, UI
language) and relay the URL to be opened between the content script and
the Side Panel page. All data stays on the user's device and syncs only
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

To minimize risk, the manifest also declares an extensive
`exclude_matches` list that prevents content-script injection on
sign-in, SSO, payment and end-to-end-encrypted messaging hosts —
the precise list is published in the open-source manifest under
`content_scripts[].exclude_matches`.

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
| Small promo tile | 440×280 | ⬜ TODO |
| Marquee promo tile | 1400×560 | ⬜ Optional, skip for first release |
| Screenshot 1 — "Click any link, read it side-by-side" | 1280×800 | ⬜ TODO |
| Screenshot 2 — "Address bar with Back / Forward / Refresh" | 1280×800 | ⬜ TODO |
| Screenshot 3 — "Per-site blacklist / whitelist" | 1280×800 | ⬜ TODO |
| Screenshot 4 — "Modifier keys still do what you expect" | 1280×800 | ⬜ TODO |
| Screenshot 5 — "Smart link filtering" | 1280×800 | ⬜ Optional |

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
点击链接 → 自动在 Chrome 侧栏中并排打开，左侧继续阅读，右侧浏览新内容。原生 Chrome 即可使用，无追踪、开源。
```

**Description:**
```
Side Link Preview 让原生 Chrome 拥有真正的分屏阅读体验。所有原本会在新标签页中打开的链接，都会在 Chrome 的侧边栏中并排打开：你继续在左侧阅读原文，右侧浏览新链接，不再被新标签页淹没。本扩展为独立开源项目，与任何浏览器厂商无附属关系。

它做了什么
• 点击任意 target="_blank" 链接 → 在右侧 Side Panel 中打开
• 在侧栏内继续点击链接，原地刷新，不堆积新标签
• 按住 ⌘ / Ctrl / Shift / Alt + 点击 → 像往常一样打开普通新标签

主要功能
• 侧栏自带地址栏 + 后退 / 前进 / 刷新按钮，像一个迷你浏览器
• 加载失败自动重试一次，再失败则显示「在新标签页打开」的兜底卡片
• 按域名黑 / 白名单，支持子域名匹配和通配符
• 智能链接过滤：同页锚点、下载、登录页、混合内容、localhost 等都自动走原生行为，不进侧栏
• 右键菜单「在侧栏中打开链接」，可临时绕过所有规则
• 快捷键 Alt+Shift+P 直接预览当前标签
• 自动跟随系统浅色 / 深色主题
• 对正常会拒绝 iframe 的网站也能加载 —— 只在扩展自己的 Side Panel 请求上去除头部
• 默认不在登录、SSO、支付以及端到端加密通信类域名上注入（完整名单见开源 manifest）
• 内置六种语言：English、中文、Français、Español、Deutsch、Português

隐私
• 不做统计、不做追踪、不做遥测、没有远程配置
• 任何数据都不会离开浏览器，扩展本身没有服务器
• 全部设置只保存在 Chrome 同步存储中，跟随你自己的 Chrome 账号同步
• 完整隐私政策：https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

适用人群
• 怀念 Arc 分屏体验、但希望留在 Chrome 的用户
• 喜欢 Edge 双页并排浏览的用户
• 经常一边读文章、一边打开 20 个标签的研究者
• 在文档、PR、Stack Overflow 之间频繁跳转的开发者

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
• Clic sur un lien target="_blank" → ouverture dans le panneau latéral
• Les clics suivants à l'intérieur du panneau le mettent à jour sur place
• ⌘ / Ctrl / Maj / Alt → bascule vers un véritable nouvel onglet, comme d'habitude

FONCTIONNALITÉS CLÉS
• Barre d'adresse intégrée avec Précédent / Suivant / Recharger
• Re-essai automatique en cas d'échec d'intégration, puis carte « ouvrir dans un nouvel onglet »
• Listes blanche / noire par domaine (sous-domaines + jokers)
• Filtrage de liens intelligent : ancres dans la page, téléchargements, pages de login, contenu mixte, localhost — tout ça reste natif
• Menu contextuel « Ouvrir dans le panneau latéral » et raccourci clavier Alt+Shift+P
• Thème clair / sombre automatique
• Fonctionne sur les sites qui bloquent normalement les iframes — via une règle d'en-tête limitée au panneau
• Hôtes de connexion, SSO, paiement et messagerie chiffrée de bout en bout exclus par défaut pour des raisons de sécurité (liste complète dans le manifeste open source)
• Six langues d'interface intégrées

CONFIDENTIALITÉ
• Aucun analytique, aucun traçage, aucune télémétrie, aucune configuration distante
• Aucune donnée ne quitte le navigateur — l'extension n'a pas de serveur
• Les réglages restent dans le stockage Chrome de l'utilisateur
• Politique complète : https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

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
• Pulsa cualquier enlace target="_blank" → se abre en el panel lateral
• Pulsa otros enlaces dentro del panel — se actualiza en su sitio
• ⌘ / Ctrl / Mayús / Alt → vuelve a la pestaña nueva clásica

FUNCIONES PRINCIPALES
• Barra de direcciones integrada con Atrás / Adelante / Recargar
• Reintento automático ante fallos transitorios, después una tarjeta para abrir en pestaña
• Lista negra / blanca por dominio (subdominios + comodines)
• Filtrado inteligente de enlaces: anclas internas, descargas, páginas de login, contenido mixto, localhost — todo eso se queda nativo
• Menú contextual "Abrir en panel lateral" y atajo Alt+Shift+P
• Tema claro / oscuro automático
• Funciona en sitios que bloquean iframes — mediante una regla de cabeceras limitada al panel
• Hosts de inicio de sesión, SSO, pagos y mensajería cifrada de extremo a extremo excluidos por defecto por seguridad (lista completa en el manifest de código abierto)
• Seis idiomas de interfaz integrados

PRIVACIDAD
• Sin analítica, sin seguimiento, sin telemetría, sin configuración remota
• Ningún dato sale del navegador — la extensión no tiene servidor
• Ajustes en el almacenamiento de sincronización de Chrome
• Política completa: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

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
• Klick auf einen target="_blank"-Link → öffnet sich im Seitenbereich
• Klicks innerhalb des Seitenbereichs aktualisieren ihn an Ort und Stelle
• ⌘ / Strg / Umschalt / Alt → klassischer neuer Tab

KERNFUNKTIONEN
• Eingebaute Adresszeile mit Zurück / Vor / Neu laden
• Automatischer einmaliger Wiederholversuch bei Lade-Fehlschlägen, danach eine "in neuem Tab öffnen"-Karte
• Black-/Whitelist pro Domain (Unter-Domains + Wildcards)
• Schlaue Link-Filterung: Seitenanker, Downloads, Login-Seiten, gemischte Inhalte, localhost — bleibt alles nativ
• Kontextmenü „Im Seitenbereich öffnen" und Tastenkürzel Alt+Shift+P
• Automatisches helles / dunkles Design
• Funktioniert auch bei Seiten, die iframes normalerweise blockieren — über eine eng eingegrenzte Header-Regel
• Login-, SSO-, Zahlungs- und Ende-zu-Ende-verschlüsselte-Messaging-Hosts werden aus Sicherheitsgründen standardmäßig ausgeschlossen (vollständige Liste im Open-Source-Manifest)
• Sechs eingebaute UI-Sprachen

DATENSCHUTZ
• Keine Analytik, kein Tracking, keine Telemetrie, keine Remote-Konfiguration
• Keine Datenübertragung — die Erweiterung hat keinen Server
• Einstellungen ausschließlich im Chrome-Sync-Speicher
• Vollständige Richtlinie: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

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
• Clique em qualquer link target="_blank" → abre no painel lateral
• Cliques dentro do painel atualizam o conteúdo no mesmo lugar
• ⌘ / Ctrl / Shift / Alt → volta à aba nova clássica

PRINCIPAIS RECURSOS
• Barra de endereços embutida com Voltar / Avançar / Recarregar
• Tentativa automática única em falhas transitórias, depois cartão para abrir em nova aba
• Lista negra / branca por domínio (subdomínios + curingas)
• Filtragem inteligente de links: âncoras, downloads, páginas de login, conteúdo misto, localhost — tudo isso fica nativo
• Menu de contexto "Abrir no painel lateral" e atalho Alt+Shift+P
• Tema claro / escuro automático
• Funciona até em sites que normalmente bloqueiam iframes — via regra de cabeçalho restrita ao painel
• Hosts de login, SSO, pagamentos e mensagens criptografadas de ponta a ponta excluídos por padrão por segurança (lista completa no manifest de código aberto)
• Seis idiomas embutidos

PRIVACIDADE
• Sem analytics, sem rastreamento, sem telemetria, sem configuração remota
• Nenhum dado sai do navegador — a extensão não tem servidor
• Configurações apenas no armazenamento de sincronização do Chrome
• Política completa: https://github.com/ds009/side-link-preview/blob/main/PRIVACY.md

REQUISITOS
Chrome 119 ou superior. Também no Microsoft Edge 119+.

CÓDIGO ABERTO
Licença MIT. Issues e PRs bem-vindos:
https://github.com/ds009/side-link-preview

APOIE O PROJETO
https://github.com/sponsors/ds009
```
