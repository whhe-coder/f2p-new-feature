# stage 结果 R1：A 类只读用例补完（admin 账号）

> 任务：R1（见 `remaining-tasks.md`）· 依据：spec v0.3.7、计划 P10 · 用例预期以 T1–T5 为准

## 0. 执行概况

| 项 | 值 |
|---|---|
| 账号 | Xsolla admin（`user.admin=true`，`merchants.current.role=ROLE_ADMIN`），org 只有 53105，828 个 privilege，199 个 merchant feature，687 个项目，20 个模块 |
| merchant / 项目 | 53105 / 317869（Test Template）；开始和结束时 currentProject 都是 317869 |
| 构建 | `stage-web-games-20261005-03` = commit `c1b5e37`（`main.e6b8c0da0fd32ee6e09b.js`），比用例基线 `772a320` 落后 52 个 commit |
| 执行时间（UTC） | 2026-10-21T05:59Z – 07:29Z |
| 执行方式 | **Playwright `connectOverCDP`**，连接一个有界面的 Chrome for Testing 151（独立临时 profile `/tmp/r1-profile`）。用户本人在该窗口登录，Claude 没有输入密码。没有使用 Claude in Chrome（本会话没有该工具） |
| 分工 | 阶段 1：agent A（T4 + T5，33 条）和 agent B（T2 + T3，25 条）并行，只读，不改 storage。阶段 2：1 个 agent 串行执行会改 storage 或当前项目的 12 条，以及阶段 1 推迟的 8 条。“来源”列：A / B / P2 |
| 结果 | {{COUNTS}}（含 7 条 RT-MCP-* N/A） |

### 0.1 方法与安全措施

- **写入保护**：`/tmp/r1/lib.cjs` 在每个脚本自己的 tab 上用 `page.route` 拦截 PUT/PATCH/DELETE、写入型 POST（`assign_to_user`、`handle_all_utms`、`users/location`、`consent` 等）和 `/logout` 导航，请求不会离开浏览器，被拦截的请求都记录在证据中。每次整页加载都会拦到：`PUT https://consent-api.xsolla.com/v2/consent`（4–6 次，生产域名）、`PATCH chat…/notifications/seen`、`PUT chat…/livechat/custom-fields`。
- **漏网的写入**：RT-PROJ-012 用 topbar 切换项目时，发出了 `POST xfe-api/accesslogs/merchants/report`（访问日志）。它不在拦截规则内，已到达后端。
- **证据来源**：Playwright `page.on('request'/'response')`，能看到跨域状态码和请求头；请求头只记录名称，Authorization 只记 present。Redux 通过 React 17 legacy root（`#root.__reactContainere$…`）读取。没有记录任何 token 或 cookie 值。
- **状态恢复**：阶段 2 改过 setup selection、`wg-pa-promo-banner-dismissed`、`ba.web-games.enterAccountSeen.<userId>`、`i18nextLng` 和当前项目，都已恢复并读回确认（见附录 C）。访问其他项目时写入了 `sb-pa-*`、`network-pa-*`、`gc-pa-*` 这类非鉴权 cookie，值已回到 en / 53105 / 317869。

### 0.2 局限

- **全新 profile**：开始时 localStorage 里没有 setup selection、enter-account 标记和 promo banner 记录，`/53105` 落到 `/get-started`，不是上一轮的 `/dashboard`。与初始状态有关的用例，在“局限”列中注明。
- **只有 admin**：admin 会跳过 enter-account gate 和 consent 检查（RT-CONSENT-005 / 010 只验证了 admin 分支；RT-CONSENT-016 / 018 记为 BLOCKED，需要非 admin owner，归入 R3）。
- **偶发全局 401**：06:19:50–06:20:30Z、约 07:08:40Z、约 07:10:35Z 共 3 次（例如 `/api/organization/53105/detail` 返回 401）。应用每次都立即导航到 `/logout`，被写入保护拦下；整页刷新后会话正常。没有写入保护的话，用户会被登出。
- 生产包的组件名被压缩，部分 fiber 检查只能按 props 判定。

## 0.3 FAIL 与 BLOCKED

| ID | 结果 | 原因 | 性质 |
|---|---|---|---|
| RT-MF-017 | FAIL | storefront props 里没有 `userId/userEmail/userName/userRole`，也没有 identity gate | stage 构建早于 WASP-2478（`d10a14b`）。T4 按 772a320 写预期，但没有标 `[分支差异]` |
| RT-MF-025 | FAIL | 项目级 `/projects/317869/metaframe` 不请求 remoteEntry，一直转圈 | gateway 模块列表和静态配置里都没有 `metaframe`（`xsolla-link` 同样缺失） |
| RT-MF-026 | FAIL | site-builder 中客户端切换项目时，remote 被复用，空白 8–14 s，没有 loading | c1b5e37 的 `src/layouts/SiteBuilder/index.tsx:68` 缺少 `key`，772a320 已修复。属于 stage 版本落后 |
| RT-API-060 | FAIL | 项目设置页发出 `togglers` 请求；integrations 页用相对 URL 请求 `project-analytic`，返回 404 text/html | 很可能是 SDK 页面发出的，与 T4 E12 / E13 的“不出现”不一致 |
| RT-SET-011 | FAIL | `/profile` 有 “Back to account” 按钮 | **T 文件预期写错**：SDK ProfilePage 自带返回按钮（`routes.tsx:140-142` 注释）。菜单项文案是 “Change profile” |
| RT-CONSENT-016 / 018 | BLOCKED | admin 跳过 enter-account gate | 需要非 admin owner（A3），归入 R3 |

## 0.4 主要新发现（详情见附录）

| # | 发现 | 位置 / 证据 |
|---|---|---|
| 1 | 一次 401 就导航到 `/logout`，本次执行中发生 3 次偶发 401 | 见 0.2；附录 A #8、附录 C |
| 2 | `/select-project` 没有注册路由（落到 not-found），`routes/inside/select-project.js` 是死代码，但 `Root.tsx:171,202` 仍在引用 | 附录 B |
| 3 | 带 `utm_campaign` 打开 dashboard 时，每次加载发出 3 次相同的 `GET salescards/info` | `Dashboard.tsx:97-121`（effect 依赖 merchants/projects 的 length） |
| 4 | chargeback registry 页上，Analytics 组保持折叠，看不到高亮 | `merchant-sidebar-v2/index.tsx:32` |
| 5 | 折叠态侧栏在项目解析完成前没有项目工具组，PROJ-016 的修复没有覆盖折叠态 | `sidebar/index.tsx:46` |
| 6 | `?locale=fr` 在 stage 上完全不生效：store、html lang、cookie 一直是 en，参数约 14.4 s 后被移除 | 与 spec 描述的“首屏先显示 fr”不一致；附录 C |
| 7 | 整页打开 `/finance/reports/download/abc123` 后 `/reports` 丢失；多个 remote 自行改写未知子路径（cloud-gaming、player-platform 多一个尾斜杠、new-launcher → `/launchers`、payments） | 附录 A #5、#6 |
| 8 | `/launchers` 这次没有跳到 `/new-launcher`，挂载的是 `./OldApp`，与上一轮 RT-MF-015 的记录不一致 | 需要复核；附录 A #7 |
| 9 | gateway 中 `player-platform` 的 scope 是占位值 `"string"`，回退到静态配置后能加载 | 附录 A #11 |
| 10 | stage 环境：`documents/url` 返回 500；storefront remote 50 s 后仍在加载；gold remote 渲染为空，同期有一个来源不明的 500 | 附录 A、B |
| 11 | RT-HOME-023 的待确认项有了结论：客户端离开项目路由后，当前项目保留；整页加载非项目页时，当前项目回到列表第一项 | 附录 C |
| 12 | webhooks Testing 区需要 `ipn_enabled` 且有 `payment_url`。在 15 个项目里只有 316818 满足，RT-API-040 第 3 步缺第二个项目 | 附录 C |
