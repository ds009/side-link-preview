# 截图导演脚本 — Side Link Preview

> 目标：5 张 **1280 × 800** PNG 截图（Chrome Web Store 硬性尺寸）。
> 命名为 `store-assets/screenshot-1.png` … `screenshot-5.png`。

商店最多支持 **5 张截图**。**第一张是封面图** —— 这张是绝大多数用户在搜索结果里唯一会看到的，所以一定要值得点进来。

---

## 准备工作（一次性）

先搭一个干净的录制环境，避免任何隐私/个人信息泄漏：

1. 新建一个 Chrome 用户：*People → Add → Continue without account*。
2. 退出所有网站登录态。清空书签栏，隐藏其他扩展，只保留本扩展的图标。
3. 窗口大小调到精确的 **1280 × 800**：
   - macOS 一行命令：`osascript -e 'tell application "Google Chrome" to set bounds of window 1 to {0, 0, 1280, 800}'`
   - 或者装个 Window Resizer 扩展，设成 1280 × 800。
4. 系统切到浅色模式（深色版我们另出一张）。
5. 系统语言切到 **English**（避免不小心把中文 Chrome 自身界面也录进去）。
6. 缩放：100%。
7. 隐藏：书签栏（`⌘ Shift B`）、其他扩展图标，只置顶 Side Link Preview。
8. 清空地址栏。
9. 挑 3 个看起来干净、没有任何登录痕迹的"演示站点"：
   - **Wikipedia**（en.wikipedia.org/wiki/Side_panel）
   - **MDN**（developer.mozilla.org/en-US/docs/Web/HTML）
   - **Hacker News**（news.ycombinator.com）
   - 或你自己的博客 / 任意文档站

> 避免出现：用户头像、姓名、邮箱、账户余额；以及画面里出现 Chrome / Arc / Edge / Microsoft 的 **品牌名 / Logo**（自动审核会立刻 flag）。

---

## 截图 1 — 封面图（最重要的一张）

**文件：** `screenshot-1.png` · 1280 × 800

目标：陌生人扫一眼 1.5 秒就能 *看懂* 这个扩展是干嘛的。

**画面构图**
- 左侧：Wikipedia 的某篇中性文章（比如 "Side panel" 词条）。
- 右侧：Side Panel 已打开，里面显示一篇 MDN 文章（比如 "HTML iframe"）。
- 顶部的 **图钉** 图标处于"已固定"状态，让侧栏看起来是"常驻"的。

**导演细节**
- 选一篇 MDN 文章，让它的标题和正文片段在不出现滚动条的情况下能完整可见。
- 顶部加一条 **加粗的标题条**，约 80px 高，单色（#2563eb）+ 白字，无衬线字体，**不要 emoji**：

  > *"Click any link → it opens side-by-side, in stock Chrome."*
  > （或中文版："点击任何链接 → 直接在右侧并排打开，原生 Chrome 即可。"）

- 可选：在左侧某个链接上加一个淡淡的鼠标箭头 + 一行小注释：`→ opens in panel`。

---

## 截图 2 — 触发模式（点击 / 悬停）

**文件：** `screenshot-2.png`

目标：让用户知道触发方式可选，延迟可调。

**画面构图**
- 打开 Options 页面（chrome-extension://…/options.html）。
- 滚动到 "Trigger" 这一段处于画面中央。
- 选中 *Hover* 单选框，延迟滑块拖到约 600 ms。

**标题条文案：**
> *"Click or hover — your call. Per-domain rules included."*
> （"点击或悬停，由你决定，自带按域名规则。"）

---

## 截图 3 — 按域名的黑/白名单

**文件：** `screenshot-3.png`

目标：让进阶用户知道这扩展可以"调教"。

**画面构图**
- Options 页面，"Scope" 段处于画面中央。
- 选中 *Blacklist* 模式。
- 域名文本框预填 3 行有说服力的样本：
  ```
  *.youtube.com
  twitter.com
  *.docs.google.com
  ```
- 角落里的 "Saved" 状态条可见（`color: #16a34a`）。

**标题条：**
> *"Blacklist or whitelist any site. Wildcards supported."*
> （"任意网站可加黑白名单，支持通配符。"）

---

## 截图 4 — 修饰键绕过 / 快捷键

**文件：** `screenshot-4.png`

目标：突出"快捷的逃生通道"。

两种方案任选其一：

**方案 A — 快捷键**
- 前景任意一个网页。
- 在画面下方居中位置叠加一个键帽组合图：
  `[ Alt ] + [ Shift ] + [ P ]`
- 标题条：*"Press `Alt+Shift+P` to preview the current tab."*
  （"按 `Alt+Shift+P` 预览当前标签。"）

**方案 B — 修饰键绕过**
- 网页里有一个明显被悬停的链接。
- 叠加文字：`[ ⌘ ] + click → real new tab`
- 标题条：*"Need a real new tab? Hold `⌘ / Ctrl / Shift / Alt`."*
  （"想要普通新标签？按住 `⌘ / Ctrl / Shift / Alt` 即可。"）

---

## 截图 5 — 深色模式 + 多语言

**文件：** `screenshot-5.png`

目标：展示打磨度 + 6 国语言支持。

**画面构图**
- macOS 切到深色模式（`系统设置 → 外观 → 深色`）。
- Options 页面切成 **中文**（先在 Options 里把 Language 改成中文）。
- 拍照时右侧的 Side Panel 也是一个深色的页面（比如 MDN 的 dark theme）。

**标题条：**
> *"Auto light + dark · 6 languages · No tracking, no ads."*
> （"自动浅/深色 · 6 种语言 · 无追踪 · 无广告。"）

---

## 营销小图（强烈建议做）

商店还有个 **Promo Tile** 字段（440 × 280，可选）。建议做：

- 背景：`#2563eb → #db2777` 渐变。
- 居中：扩展图标（96 px），右边是白色无衬线字体的 wordmark *"Side Link Preview"*。
- 下方副标题，14 px：*"Side-by-side reading, on stock Chrome."*

保存为 `store-assets/promo-tile-440x280.png`。

> 这张图务必 ≤ 1 MB，**不要出现 Chrome / Arc / Edge 的 Logo** —— 自动审核会立刻拒。

---

## 工具贴士

- **截屏**：macOS `⌘ Shift 4 → 空格 → 点窗口` 能直接得到完美的窗口形 PNG。再用 Preview 裁到 1280 × 800。
- **加标题条**：可以用 Figma、Keynote，或直接用 ImageMagick 的 `convert`：
  ```bash
  convert screenshot-raw.png \
      -gravity north -background "#2563eb" -splice 0x80 \
      -fill white -font "Helvetica-Bold" -pointsize 28 \
      -annotate +0+30 "Click any link → side-by-side." \
      screenshot-1.png
  ```
- **压缩**：上传前每张过一遍 [TinyPNG](https://tinypng.com)。商店硬上限 10 MB，但越小过审越快。
- **校验尺寸**：
  ```bash
  sips -g pixelWidth -g pixelHeight store-assets/screenshot-*.png
  ```

---

## 上传前最后自检

每一张截图都要对照这个清单一遍：

- [ ] 精确 **1280 × 800** PNG，≤ 1 MB。
- [ ] 没有任何个人信息（头像、姓名、邮箱、余额）。
- [ ] 没有可见的 Chrome / Arc / Edge **品牌字（wordmark）**。Chrome 工具栏里的 *Chrome 图标本身* OK，**Chrome 这几个字母**不行。
- [ ] 没有未授权的版权图（电影海报、付费图库素材等）。
- [ ] 标题条文字是 English（其他语言上架页可以单独本地化）。
- [ ] 地址栏里没有 `localhost`、内部域名、staging 链接、任何不希望被公开看到的 URL。
- [ ] 如果你顺手录了一段 30 秒左右的 YouTube 演示，把链接贴到商店的 *Promotional video* 字段 —— 对转化率有显著提升。
