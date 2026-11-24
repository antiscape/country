# SEO 与 Google 广告接入路线

> **2026-11-24 更新：下面描述的 Phase 1–2 已完成落地。**
>
> - 静态 SEO 内容站 + `/play/` 游戏 SPA 的双层结构；
> - 内容页 + 精选国家页可索引，中文 / English / Español / Français 四语言；
> - 194 个国家页 ×4（精选国可索引，其余 noindex）、5 个模式页、图鉴、指南、隐私/条款/关于/联系；
> - canonical / hreflang / OG / JSON-LD / sitemap / robots；
> - AdSense 展示广告位、`ads.txt`、同意横幅（自定义 CMP，见文末警告）；
> - 构建命令：`npm run build`，产物在 `dist/`。
>
> 下文保留的是**改造前的审计与决策过程**，便于理解为什么这样设计。

---

## 一、改造前技术栈（历史）

```text
index.html
  └── js/main.js（原生 ES Module）
        └── hash 路由：#/home、#/play/flags、#/atlas ...
```

- 无 React、无 Vue、无构建步骤、无运行时依赖；
- 纯前端 SPA，内容由 JS 渲染；
- 数据在 `js/data.js`，游戏逻辑在 `js/engine.js`；
- 部署只需要静态服务器；
- 优势：体积小、首屏快、无 hydration、维护简单；
- 劣势：所有页面共用一个 HTML，SEO 内容层几乎为零。

---

## 二、改造前 SEO 审计（历史）

| 项目 | 现状 | 影响 |
|---|---|---|
| 初始 HTML 内容 | 只有 boot 动画，没有 H1/正文 | 不执行 JS 的爬虫/社交机器人看到空页面 |
| 路由 | `#/home`、`#/atlas` | hash 不是独立文档，通常被当作同一个 URL |
| 每页 title | JS 运行时修改 | Google 可能渲染后看到，但不稳定；其他爬虫不一定执行 |
| 每页 description | 只有全局一份 | 所有页面摘要相同 |
| canonical | 无 | 参数/hash 变体可能被视为重复 |
| hreflang | 无 | 中英文没有独立 URL，无法正确关联 |
| sitemap.xml | 无 | 收录效率低 |
| robots.txt | 无 | 没有主动引导抓取 |
| JSON-LD | 无 | 没有 WebApplication/FAQ/Breadcrumb 等结构化数据 |
| 国家详情页 | 无独立 URL | 194 个国家的长尾搜索流量拿不到 |
| OG/Twitter | 只有全局一份 | 分享任何页面都是同一张图/同一段文案 |
| 性能 | 约 1.6MB，资源本地 | 性能基础不错，但懒加载/尺寸标注还可优化 |
| 浏览器兼容 | 现代 Chrome/Safari/Edge/Firefox | 不支持 IE；CSS `color-mix` 等在旧 Safari 可能降级 |

**判断**

- 作为“游戏应用”：可用，体验不错；
- 作为“靠 Google 自然搜索获客的网站”：目前偏弱，预计只能勉强收录首页，模式页/国家页基本拿不到排名；
- 作为“AdSense 审核站点”：内容页不足、无隐私政策/同意管理，直接申请通过率低。

---

## 三、已采用架构：静态内容层 + 游戏岛

不要为了 SEO 把整个游戏重写成 React。更划算的做法是：

```text
静态 HTML（可被抓取）
  ├── 首页
  ├── 5 个模式介绍页
  ├── 图鉴首页
  ├── 194 个国家详情页 × 4 语言
  ├── 5–10 篇地理指南
  ├── 隐私政策 / 条款 / 关于 / 联系
  └── 游戏入口（挂载现有 vanilla 游戏）
```

游戏仍然可以是现在的原生 JS；内容页在构建时预渲染成静态 HTML。

### URL 设计

```text
/zh/
/zh/flags/
/zh/capitals/
/zh/countries/
/zh/population/
/zh/independence/
/zh/atlas/
/zh/atlas/cn/
/zh/guides/how-to-play/
/en/...
```

- 内容页使用干净的静态 URL；
- 游戏仍是 `/play/` 内的 hash SPA（`noindex`），不影响内容页 SEO；
- 语言切换改 URL，而不是只写 localStorage；
- 每页独立 title/description/canonical/hreflang/OG。

### 每页必须有

- 唯一 H1；
- 100–300 字原创介绍（不能只是数据表）；
- 玩法说明 / FAQ；
- 面包屑；
- 相关国家/相关模式内链；
- 结构化数据；
- 分享图；
- CTA 进入游戏。

### 国家页建议结构

```text
H1 中国国旗、首都与人口
  ├── 国旗大图（alt）
  ├── 首都 / 人口 / 面积 / 大区 / 独立日
  ├── 世界地图定位
  ├── 2–3 条原创小知识
  ├── “测测你有多了解中国” CTA
  ├── 同区域国家内链
  └── FAQ：中国首都是？中国人口？中国国旗含义？
```

194 个国家 × 4 语言 = 776 页，足以形成长尾内容，但要注意：

- 不能只复制数据，要有原创描述/问答；
- 不要批量生成完全相同的模板文案；
- 页面之间要有真实内链；
- 不要为了 AdSense 堆“关键词页”。

### 技术选型

| 方案 | 适合 | 说明 |
|---|---|---|
| 保持 vanilla + Node 预渲染 | 当前规模最推荐 | 改动最小，性能最好 |
| Astro + 游戏岛 | 内容站 + 游戏 | 默认零 JS，适合大量静态页 |
| Next.js（App Router） | 团队想用 React、要 SSR/ISR | React 本身不解决 SEO，Next 的 SSR/SSG 才解决 |
| Vite + React SPA | 不建议只为此改 | 仍是客户端渲染，SEO 问题不会消失 |

---

## 四、Google 广告：先选分发渠道

### 1. 自托管网站

- **AdSense**：接入简单，适合展示广告；
- **Google Ad Manager (GAM)**：更适合游戏，支持 H5 games ads、rewarded、interstitial、频次控制；
- 需要：独立域名、HTTPS、隐私政策、Cookie 同意、`ads.txt`、足够内容。

### 2. 发布到 CrazyGames

如果目标是上 CrazyGames，优先用 **CrazyGames SDK**，而不是自己接 Google：

- 支持 `midgame` 和 `rewarded` 视频广告；
- 广告开始/结束/失败回调，需要暂停/静音游戏；
- 要求广告被拦截时游戏仍可玩；
- 平台负责广告售卖与分成。

参考：[CrazyGames Video ads](https://docs.crazygames.com/sdk/html5-v2/video-ads/)

### 3. 套壳 App

用 AdMob，不要用网页 AdSense。

### 4. 中国大陆流量

**重要**：Google 广告在中国大陆通常无法正常展示/结算。如果主要流量来自大陆：

- Google AdSense 不是合适选择；
- 考虑国内广告平台，或主攻海外英文流量；
- 如果上 CrazyGames，则走平台广告体系。

---

## 五、广告位设计（游戏类）

| 页面 | 形式 | 建议 |
|---|---|---|
| 首页 | 展示广告 | Hero 下方 1 个，或桌面侧栏 1 个 |
| 模式选择页 | 展示广告 | 内容区 1 个 |
| 图鉴 | 展示广告 | 列表中间/详情页底部，不要每张卡都插 |
| 结算页 | 展示广告 | 成绩卡下方 1 个 |
| 游戏进行中 | **不要放 banner** | 会遮挡选项、造成误点 |
| 关卡之间 | midgame | 每 2–3 关一次，带频次上限 |
| 提示/复活 | rewarded | 用户主动点击，给金币/提示/复活 |
| 加载页 | 不建议 | 影响首屏体验 |

原则：

- 广告容器预留固定高度，避免 CLS；
- 广告不覆盖答案按钮/暂停/返回；
- 不在用户点击附近放广告；
- 每页最多 2–3 个广告；
- 奖励广告必须“自愿 + 明确奖励”；
- 广告加载失败时隐藏容器，不要留白。

---

## 六、SPA 接广告的坑

当前 hash 路由：

- 广告平台不知道“换页”，pageview 统计不准；
- AdSense 自动广告在路由切换后可能不刷新；
- 同一个 `<ins>` 不能反复 push。

建议：

1. 先改 History API 路由；
2. 每次路由切换上报 pageview；
3. 每个页面重新创建广告容器；
4. 用 GAM GPT 时，路由切换后 `refresh()` 对应 slot；
5. 广告脚本延迟到用户交互/同意后加载；
6. 广告位加固定尺寸，避免布局抖动；
7. 离线/PWA 状态不加载广告，显示占位或隐藏。

AdSense 手动单元大致流程：

```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXX"
     data-ad-slot="XXXX"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

但在 SPA 里必须“每个新容器 push 一次”，不能对同一个容器重复 push。

---

## 七、合规清单（AdSense 审核前）

- [ ] 独立域名 + HTTPS
- [ ] 隐私政策（说明 Cookie、广告、数据分析）
- [ ] 服务条款
- [ ] 关于/联系页面
- [ ] Cookie 同意管理（EEA/UK/瑞士需要 Google 认证 CMP）
- [ ] Consent Mode v2
- [ ] `ads.txt`
- [ ] 原创内容（至少几十个有实质内容的页面）
- [ ] 不复制原版游戏美术/音频/代码
- [ ] 如果面向儿童/家庭：COPPA/年龄设置，限制个性化广告
- [ ] 广告不误导、不遮挡、不诱导点击
- [ ] 不用自动刷新/隐藏广告等方式刷展示

参考：

- [AdSense 计划政策](https://support.google.com/adsense/answer/48182)
- [Google Ad Manager H5 Games Ads](https://support.google.com/admanager/answer/14637831)

---

## 八、上线前待办

### 已完成

1. 静态内容站 + `/play/` 游戏；
2. 四语言内容页 + canonical/hreflang/OG/JSON-LD；
3. `robots.txt` + `sitemap.xml`；
4. 隐私/条款/关于/联系；
5. AdSense 广告位、`ads.txt`、同意横幅；
6. 静态站搜索/筛选、移动端导航。

### 还需要你做

1. 把 `site.config.json` 的 `baseUrl` 改为真实域名；
2. 部署 `dist/` 到 HTTPS 主机；
3. Search Console / Bing 提交 sitemap；
4. 申请 AdSense，填入 `client` / `slots` / `enabled: true`；
5. 重新 `npm run build`；
6. 面向 EEA/UK 时接入 Google 认证 CMP + Consent Mode v2；
7. 检查真实广告下的 CLS/LCP 与政策合规。

### Phase 3：广告准备（代码已预留）

1. 选 AdSense / GAM / CrazyGames SDK；
2. 做广告位组件与懒加载；
3. 同意管理 + Consent Mode；
4. `ads.txt`；
5. 提交审核。

### Phase 4：上线后

1. 监控填充率、RPM、viewability；
2. 监控 CLS/LCP/单局完成率；
3. A/B 广告位置；
4. 频次控制；
5. 关注无效流量与政策通知。

---

## 九、现在的项目要不要改 React？

**不建议只为 SEO 改 React。**

- React SPA 仍然是客户端渲染，SEO 不会自动变好；
- 要 SEO 就得 SSR/SSG（Next/Remix/Astro）；
- 当前 vanilla 代码约 2K 行，预渲染成本远低于重写；
- 如果未来要大量内容页/团队协作，再考虑 Astro 或 Next。

推荐路线：

```text
现在：vanilla game + 静态预渲染内容层
未来：内容量大了，再迁移到 Astro/Next
```

---

## 十、已确认的方向

- **分发渠道**：自托管静态站点；
- **主流量地区**：海外中文 + 全球英文；
- **广告目标**：AdSense 展示广告；
- **语言**：中文 / English / Español / Français。

因此当前实现采用“内容页放展示广告、游戏页保持无广告”的策略；
后续如果要在游戏内变现，再评估 Ad Manager 的 rewarded/interstitial。
