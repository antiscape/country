# AdSense 展示广告接入清单（自托管）

> 目标：在静态内容页放 AdSense 展示广告，游戏页保持无广告；面向海外中文 + 全球英文。
> 当前代码已预留广告位、`ads.txt`、同意横幅和 `site.config.json`，只差你的域名与 AdSense ID。
>
> 注意：Google 广告在中国大陆通常无法正常展示/结算；本项目假设主流量来自海外中文与全球英文。

---

## 1. 上线前必须改的配置

`site.config.json`：

```json
{
  "baseUrl": "https://navpage.win",
  "contactEmail": "hello@navpage.win",
  "adsense": {
    "enabled": true,
    "client": "ca-pub-6758251429919320",
    "autoAds": true,
    "slots": {
      "home": "",
      "mode": "",
      "atlas": "",
      "country": "",
      "guide": ""
    }
  }
}
```

- `baseUrl` 必须与线上域名完全一致（canonical / hreflang / sitemap 都用它）；
- `contactEmail` 会出现在隐私政策、条款和联系页；
- `client` 是发布商 ID（`ca-pub-...`）；
- `autoAds: true` 表示使用 AdSense Auto ads，只需要发布商 ID；
- Auto ads 原始代码以 `<template data-adsense-auto>` 写入内容页，用户同意后再由 `js/site.js` 注入 `<head>`；
- `slots` 是可选的手动广告单元 ID，不是发布商 ID；
- 修改后运行：

```bash
npm run build
```

也可以只重生成 SEO 文件：

```bash
npm run seo -- --domain https://navpage.win --ads-client ca-pub-XXXXXXXXXXXXXXXX
```

这个命令会更新：

```text
dist/sitemap.xml
dist/robots.txt
dist/ads.txt
```

`npm run build` 也会调用同一套生成器，所以正式发布前二选一即可。

---

## 2. 部署

把 `dist/` 整个目录部署到 **HTTPS 根目录**：

```text
dist/
├── index.html            # 语言选择
├── zh/ en/ es/ fr/       # 静态内容页
├── play/                 # 游戏 SPA（noindex）
├── sitemap.xml
├── robots.txt
├── ads.txt
└── assets/ css/ js/
```

- 内容页是预渲染 HTML，不需要 SPA fallback；
- `/play/` 内使用 hash 路由（`/play/#/game`），也不需要服务器重写；
- 建议对 `assets/` 设长缓存，对 HTML 设短缓存；
- 确认 `https://navpage.win/ads.txt` 可直接访问。

---

## 3. 申请 AdSense

1. 用真实域名注册 AdSense；
2. 在站点根目录验证所有权（AdSense 会提供代码或 DNS/HTML 文件方式）；
3. 提交站点审核；
4. 审核通过后在 AdSense 后台开启 **Auto ads**；
5. `site.config.json` 里填入 `client`，设置 `enabled: true`、`autoAds: true`；
6. 重新构建、部署；
7. 确认 `https://navpage.win/ads.txt` 中出现：

```text
google.com, pub-6758251429919320, DIRECT, f08c47fec0942fa0
```

当前发布商 ID 已配置为 `ca-pub-6758251429919320`，重新构建后 `ads.txt` 会自动写入：

```text
google.com, pub-6758251429919320, DIRECT, f08c47fec0942fa0
```

如果以后更换账号，重新生成：

```bash
npm run seo -- --domain https://navpage.win --ads-client ca-pub-新ID
```

> 不要在没有内容/隐私政策/联系页的情况下反复提交；先部署完整 `dist/`。

---

## 4. 当前广告位

| 页面 | slot key | 形式 | 数量 |
|---|---|---|---|
| 首页 | `home` | 自适应 | 2 |
| 模式页 | `mode` | 自适应 | 2 |
| 图鉴 | `atlas` | 自适应 | 1 |
| 国家页 | `country` | 矩形 | 1 |
| 指南 | `guide` | 自适应 | 1 |
| 游戏页 `/play/` | — | 无广告 | 0 |

广告位只出现在内容页，避免遮挡答题、暂停和返回按钮。

---

## 5. 同意管理（重要）

当前 `js/site.js` 自带一个轻量同意横幅：

- 用户接受后才加载 AdSense；
- 拒绝后隐藏广告位；
- 选择保存在 `localStorage`；
- 页脚“Cookie 设置”可重新选择。

**这不是 Google 认证 CMP。** 如果面向 EEA / UK / 瑞士流量，正式上线前必须：

1. 使用 Google 认证 CMP（如 Funding Choices）或另一家认证 CMP；
2. 配置 Consent Mode v2；
3. 在 CMP 中声明 AdSense / 广告用途；
4. 确保拒绝个性化广告时仍可提供服务。

对于只面向非 EEA 市场，当前横幅可以作为 UX 门控；但仍建议补全隐私政策与 Cookie 说明。

---

## 6. 内容与政策检查

- [ ] 833 个静态页已部署，首页/模式/图鉴/国家/指南可访问；
- [ ] 隐私政策、条款、关于、联系页可访问；
- [ ] `ads.txt` 可访问；
- [ ] 广告不覆盖答案按钮、暂停、返回；
- [ ] 不诱导点击、不自动刷新、不隐藏广告；
- [ ] 游戏页 `noindex`，不参与广告内容抓取；
- [ ] 没有复制原版游戏美术/音频/代码；
- [ ] 如果受众包含儿童，设置 child-directed 处理；
- [ ] 不用自动工具刷展示/点击。

参考：

- [AdSense 计划政策](https://support.google.com/adsense/answer/48182)
- [Google 认证 CMP](https://support.google.com/adsense/answer/13554116)

---

## 7. 上线后监控

- AdSense：填充率、RPM、viewability、政策通知；
- Search Console：索引页数、sitemap、hreflang、Core Web Vitals；
- 站点：CLS/LCP、单局完成率、页面停留；
- 广告位 A/B：首页 Hero 下方 vs 内容中部；
- 游戏内变现下一步再评估 GAM rewarded/interstitial。
