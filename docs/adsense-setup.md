# AdSense 接入与审核清单（navpage.win）

> 目标：内容页放 AdSense 展示广告，`/play/` 游戏页保持无广告；面向海外中文 + 全球英文 / 西语 / 法语。
> 2026-11-24 已按审核要求重做：真实联系邮箱、完整隐私政策、Consent Mode v2、194 国手写亮点。

---

## 1. 当前配置

`site.config.json`：

```json
{
  "baseUrl": "https://navpage.win",
  "siteName": "GEOQUEST",
  "contactEmail": "wxiaowar@gmail.com",
  "contentUpdated": "2026-11-24",
  "adsense": {
    "enabled": true,
    "client": "ca-pub-6758251429919320",
    "autoAds": true,
    "cmp": "custom",
    "slots": { "home": "", "mode": "", "atlas": "", "country": "", "guide": "" }
  }
}
```

| 字段 | 作用 |
|---|---|
| `contactEmail` | 出现在联系 / 隐私 / 条款页，必须是能收信的真实邮箱 |
| `contentUpdated` | 页脚“数据更新”和 sitemap `lastmod` 的日期，**只在内容真的改了才改**，不要用构建时间 |
| `adsense.cmp` | `custom` = 站点自带横幅 + Consent Mode；`google` = 使用 AdSense 里的 Funding Choices，自带横幅自动关闭 |
| `adsense.slots` | 手动广告位 ID；目前全空，只靠 Auto ads |

修改后运行 `npm run build`。

---

## 2. 广告代码放在哪

`scripts/build_site.mjs` 的 `adsenseHead()` 会把 **AdSense 官方脚本直接写进每个内容页的 `<head>`**：

```html
<script>...gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6758251429919320" crossorigin="anonymous"></script>
```

为什么不再用 `<template>` 延迟注入：审核抓取器不执行 JS，模板里的脚本既不算“页面上有代码”，也让 Auto ads 无法在首屏工作。现在脚本常驻，靠 **Consent Mode** 控制是否允许 Cookie / 个性化，这是 Google 推荐的做法。

`/`、`/404`、`/play/` 三个页面没有广告代码，符合预期（832 / 835）。

---

## 3. 同意管理（重要）

### 现状

- 默认全部 `denied`，用户点“接受”后 `site.js` 调 `gtag('consent','update',{...granted})`；
- 拒绝后仍可玩，AdSense 只出非个性化/受限广告；
- 页脚“Cookie 设置”可撤回。

### 面向 EEA / 英国 / 瑞士：启用 Funding Choices

Google 要求这些地区投放**个性化广告**必须使用 **Google 认证 CMP**（集成 IAB TCF）。
Funding Choices 是 Google 自己的免费 CMP，开通不需要写代码。

**后台步骤**（AdSense → 隐私与消息）：

1. 左侧菜单进入 **隐私与消息 / Privacy & messaging**；
2. 选择 **GDPR** 标签页，点 **创建消息 / Create message**；
3. 站点选 `navpage.win`，消息类型选 **Consent / Do not consent**（两个按钮，不要用只有一个按钮或仅关闭的模板）；
4. 语言至少勾选 **English / 中文（简体）/ Español / Français** —— 会按访客浏览器语言自动显示；
5. 样式可以改配色，但**不要关掉「Do not consent」**，也不要默认勾选同意；
6. 点 **发布 / Publish**，确认状态变成「已发布 / Published」；
7. 用无痕窗口 + 欧洲 IP（或 VPN）打开 `https://navpage.win/en/`，应能看到 Google 自己的弹窗，右下角带「Privacy」小标签。

**代码切换**：`site.config.json` → `adsense.cmp` 改成 `"google"`，然后 `npm run build` 并部署。

```json
"adsense": { "enabled": true, "client": "ca-pub-6758251429919320", "autoAds": true, "cmp": "google" }
```

- `cmp: "custom"`（默认）：用站点自带横幅 + Consent Mode v2；
- `cmp: "google"`：不再输出自带的 consent 默认值，由 Funding Choices 全权处理。

**顺序很重要**：先在后台发布 FC，确认能弹出，再切 `cmp`。如果反过来，EEA 访客会在一段时间内既没有 FC 也没有自带横幅，等于没有同意提示。
代码里做了兜底：`cmp: "google"` 但 3 秒内没检测到 FC 时，会自动回退显示自带横幅，避免完全空白。

参考：[Google 认证 CMP 要求](https://support.google.com/adsense/answer/13554116)

---

## 4. 内容策略：国家页

AdSense 拒审的高频原因是“低价值 / 批量生成内容”。之前 194 国 × 4 语言的页面是同一模板，页间 4-gram 重复度 40–47%。

现在：

- `data/country-facts.json` 存**手写的**国家亮点，覆盖全部 194 国，每国 2–3 条事实、四语言齐全；
- `data/country-extra.json` 提供主要语言与货币，国家页 FAQ 因此回答表格里没有的信息（语言、货币、人口密度排名），不再复述数据；
- 8 篇指南（四语言）：玩法、读旗、易混国旗、多首都、内陆国、最小国家、最新国家、时区跨度；
- 有亮点的国家页 `index,follow` 并进入 sitemap；加上 8 篇四语言指南，目前 **857 个可索引页**；
- 代码仍保留 `isCurated()` 闸门：如果某个国家页将来需要下架索引，只要从 JSON 里删掉那个 ISO 键，重新 build 后该页会自动变成 `noindex` 并退出 sitemap；
- 构建脚本自身也会做完整性提示，缺语言的条目要补齐再发布。

**新增或修改时**：编辑 `data/country-facts.json`，保持 `en/zh/es/fr` 四组、每组至少 2 条，然后：

```bash
npm run build
```

写作要求：
- 每条必须是该页独有的信息，不能是数据表里已有的首都/人口/面积的复述；
- 不要用“XX 是一个位于 YY 的国家”这类模板句；
- 四语言都要写，不要机翻后不校对；
- 事实必须可核查，宁可写保守的常识，也不要编造纪录数字。

## 5. 提交审核前检查

- [x] HTTPS + HTTP 301
- [x] 真实联系邮箱（不再是 `.example`）
- [x] 隐私政策含：第三方 Cookie、Google Ads Settings 退出链接、aboutads / youronlinechoices、同意与撤回、日志、权利、儿童、变更
- [x] 条款含广告条款
- [x] 关于页说明运营者与联系方式
- [x] `ads.txt` 正确
- [x] 404 返回 404
- [x] `/play/` noindex
- [x] 内容页 AdSense 代码在 `<head>`
- [x] Consent Mode v2 默认 denied
- [ ] EEA/UK/CH：启用 Funding Choices 并设 `cmp: "google"`
- [ ] 部署后确认 `https://navpage.win/ads.txt`、`/privacy/`、`/contact/` 可访问
- [ ] Search Console 提交 sitemap，等 2–4 周有收录再提交

---

## 6. 部署

```bash
npm run build
git add -A && git commit -m "..." && git push
```

Cloudflare Workers Builds 会自动构建 `dist/`。部署后抽查：

```bash
curl -s https://navpage.win/zh/ | grep -o 'adsbygoogle.js?client=[^"]*'
curl -s https://navpage.win/zh/atlas/cn/ | grep -o '<meta name="robots"[^>]*>'
curl -s https://navpage.win/zh/atlas/af/ | grep -o '<meta name="robots"[^>]*>'
```

期望：第一行有 client；第二行 `index,follow`；第三行 `noindex,follow`。

---

## 7. 已知但仍需在控制台处理

1. **`www.navpage.win` TLS 握手失败** —— 在 Cloudflare 添加 `www` 的 A/AAAA 或 CNAME 记录并开启代理，然后加 301 到裸域。
2. **Cloudflare 邮件混淆** —— Scrape Shield → Email Address Obfuscation 会把 `wxiaowar@gmail.com` 在源码里变成 `[email protected]`，浏览器 JS 会还原。若希望纯文本抓取也能看到邮箱，关掉该功能。
3. **首选域 / 站点收录** —— 新站，先提交 Search Console 和 Bing Webmaster。

参考：

- [AdSense 计划政策](https://support.google.com/adsense/answer/48182)
- [AdSense 资格要求](https://support.google.com/adsense/answer/9724)
