# stage 验证结果 2026-10-21

> 计划：[stage-verification-plan.md](stage-verification-plan.md) · 分类：[stage-verification-appendix.md](stage-verification-appendix.md)
> 执行者：Claude（Claude in Chrome，只读）· 状态：阶段 0–3 已完成，阶段 4 等待你的决定

## 0. 环境

| 项 | 值 |
|---|---|
| stage 地址 | `https://accounts-sdk-skeleton.nl-k8s-stage.srv.local/for/web-games/account` |
| 部署构建 | `stage-web-games-20261005-03` = commit `c1b5e37`（2026-10-05） |
| 与用例基线的关系 | 比 spec 基线 `master@772a320` **落后 52 个 commit**（19 个非测试 commit）。仓库中已有 tag `stage-web-games-20261020-05`，但 stage 仍在运行 10-05 的构建 |
| 不适用的用例 | stage 构建中没有 MCP 登录（无任何 mcp 文件），T5 的 RT-MCP-* 全部 `N/A`；onboarding 的 ToU 勾选框（`cfad95a`）不在 stage 上，相关 CONSENT 用例 `N/A` |
| 3 个缺陷的代码 | `sections.ts`、`available-domains.ts`、`UpsellModal/index.tsx`、`upsell.ts` 在 `c1b5e37` 与 `772a320` 之间**没有变化**，复现结论适用 |
| 账号画像 | Xsolla admin（`user.admin=true`、`ROLE_ADMIN`），1 个 org `53105`，828 个 privilege，198 个 merchant feature，687 个项目，20 个模块（含 Ontology）。对应统一账号表 U-ADMIN；不是普通 owner，admin 会跳过部分守卫 |
| 观测方式 | `read_network_requests` 在整页刷新时会丢请求，所以改用 `performance.getEntriesByType` 读请求顺序和状态码；请求头通过在页面中 hook `XMLHttpRequest`/`fetch` 读取 |
| 页面性能 | 权限请求在冷启动约 19 s 后才发出；`/{m}` 到 `/dashboard` 约 9 s |

## 1. 结果

| ID | 优先级 | 结果 | 实际行为 | 备注 |
|---|---|---|---|---|
| RT-BOOT-001 | P0 | PASS（部分） | `GET /api/v1/modules`（1282 ms）是第一个 gateway 请求；`get_init_info`（5380 ms）、`/api/organization/53105/detail`（6400 ms）都在其后 | 看不到请求头，没有验证 modules 不带 `Authorization` |
| RT-BOOT-005 | P2 | PASS | `__INITIAL_STATE__` 有 `projects`、`user`，token 为 `null`；另有 `application: {locale}` | `projects` 只有 `currentID` |
| RT-BOOT-006 | P0 | **FAIL** | a) `/for/web-games` → 服务器 404 “Cannot GET /for/web-games”，SPA 没有加载；b) `/for/web-games/?a=1#x` → 最终落地 `/for/web-games/account/53105`，`?a=1#x` 在后续跳转中丢失 | a 是服务端行为：BFF 只挂载 `/for/:site/*`。T1 原标“待确认”，现已确认 |
| RT-BOOT-007 | P2 | **FAIL** | 同 BOOT-006a，裸 `/for/web-games` 返回 404 | |
| RT-BOOT-008 | P1 | **FAIL（部分）** | 打开 `https://{host}/` 页面标题为 “Error”，停留在 `/`，没有 replace 到 `{base}` | 第二步（删除 `account-platform-site-id` cookie）没有执行：JS 看不到该 cookie 的 domain/path，无法可靠恢复 |
| RT-BOOT-010 | P1 | PASS | console 有 `[Gateway] Authenticated request` | 说明 `APP_ENV≠production` |
| RT-BOOT-011 | P2 | PASS | `GET /api/v1/modules` 200，body 形如 `{code, result: {data, total}, trace_id}` | |
| RT-AUTH-005 | P0 | PASS | 没有 `/server/token` 请求；`get_init_info?org_id=53105` 200 | |
| RT-AUTH-007 | P0 | PASS | SPA 进入 dashboard 后的 14 个 gateway 请求（XHR 与 fetch）都带同一个 `Bearer` token，`Business-Account-Id: web-games` | SDK 的 `get_init_info`/`privileges` 在 SPA 跳转时没有重新发出，未覆盖 |
| RT-AUTH-016 | P0 | PASS（3/4）+ **FAIL（1/4）** | `/login` → 302 `{base}` → `/53105` → `/dashboard`；`/signup`、`{base}/` → `/53105` → `/dashboard`，没有闪现登录表单；**`/resetting` 也被重定向到 `/53105`** | 预期 `/resetting` 不重定向。账号只有 1 个 org，多 org 部分未覆盖 |
| RT-AUTH-020 | P2 | N/A | | 当前账号是 admin，用例不适用 |
| RT-MAG-001 | P0 | PASS | `get_init_info?org_id=53105` 只请求 1 次，页面正常 | |
| RT-MAG-004 | P1 | BLOCKED（admin 变体已记录） | admin 打开 `/999999999/dashboard`：停留在该 URL，`get_init_info?org_id=999999999` **200**；`/api/organization/999999999/detail` 404 三次、`projects/paged/lite` 404；页面渲染 shell，没有错误提示 | 非 admin 的预期需要 U-FOREIGN 账号。admin 打开不存在的 merchant 时没有错误页，并重复请求 3 次，建议记为 P2 可疑点 |
| RT-MAG-009 | P2 | PASS | `/0/dashboard` → 302 → `/53105/dashboard`；`/0` → `/53105`；没有 `org_id=0` 请求 | |
| RT-MAG-011 | P2 | PASS（附观察） | `/053105/dashboard` 正常渲染；API 路径与页面链接中**同时**出现 `053105` 和 `53105` | id 形式不统一 |
| RT-ERR-003 | P2 | PASS | 显示 “Something went wrong / An unexpected error occurred”，没有 404 和 `x`，没有渲染 `<b>`，没有 sidebar，console 无错误 | |
| RT-SEC-003 | P1 | PASS | `__INITIAL_STATE__` 中 token 为 `null`；没有内联含 `__INITIAL_STATE__` 的脚本 | spec 0.3.0（T1-E4）：清空发生在 SDK `AuthChecker` 完成 hydration 之后 |
| RT-SEC-004 | P0 | PASS | `document.cookie` 中没有 `pa-v4-token` | |
| RT-SEC-101（S-01） | P0 | **FAIL（缺陷已复现）** | `document.cookie` 中有 `gc-pa-v4-token`：3 段式 JWT，未过期，payload 含 `email`、`groups`、`id` 等；**值与当前会话的 Bearer token 完全相同**。在 dashboard 页面就能读到（cookie Path 为 `/`，访问过 storefront 后一直保留） | 任何能在页面执行的脚本都能拿到会话 token |
| RT-MF-001 | P0 | PASS | `window.__modules` 为数组（20 项）；`APP_ENV === 'stage'`；`ontologyModuleUrl` 以 `?<uuid>` 结尾；modules 只请求 1 次，在业务请求之前 | |
| RT-ROUTE-035 | P0 | PASS（①） | 有 setup selection（`gamesPortal`）时，`/53105` 约 8.8 s 后进入 `/53105/dashboard` | ②③ 需要其他账号或删除 selection |
| RT-HOME-001 | P0 | PASS | 同 ROUTE-035 ① | |
| RT-DASH-005 | P0 | PASS | “Performance” 标题；Balance `$0.00`；Last payout `Sep 7, 2022`；Next payout `—`；XAA board（Sales、Antifraud 等 widget）渲染 | |
| RT-ROUTE-001 | P1 | PASS（6/7）+ 待确认 | `/forbidden`、`/not-found`、`/error`、`/account-restricted`、`/enter-account`、`/verification` 的 URL 不变，都没有 sidebar；**`/account-no-access` 被重定向到 `/53105/dashboard`** | 可能是有访问权限的用户会被该页送回首页（SDK 行为），需要确认 |
| RT-ROUTE-002 | P2 | PASS | `/forbidden/x`、`/error/x`、`/account-no-access/x`、`/enter-account/x`、`/login/mcp/x` → `/not-found`；`/not-found/x` 保持 URL | |
| RT-ROUTE-004 | P1 | PASS | 8 个未知子路径都落到 `/not-found` | |
| RT-ROUTE-005 | P2 | PASS | `/53105abc` → `/not-found` | |
| RT-ROUTE-006 | P1 | PASS | `/dashboard/`、`/settings/company/`、`/projects/{p}/` 正常渲染；`/53105/` → `/dashboard` | |
| RT-ROUTE-007 | P2 | PASS | `/support` → `/support/transactions`；`/support/` 保持 URL，内容区没有标题 | |
| RT-ROUTE-008 | P2 | PASS（附发现） | `/DASHBOARD`、`/Settings/Company` 都能渲染；**`/Settings/Company` 显示了 shell sidebar，而小写的 `/settings/company` 不显示** | chrome 显隐规则区分大小写 |
| RT-ROUTE-010 | P2 | PASS | `?u=https://a.b` 保持不变 | |
| RT-ROUTE-011 | P1 | PASS | `/support-hub` → `/communication-hub`，无 sidebar | |
| RT-ROUTE-012 | P2 | PASS（master 预期） | `/support-hub/inbox?x=1` → `/communication-hub`，子路径与 query 丢失 | |
| RT-ROUTE-013 | P1 | PASS | `/analytics/products/site-builder?period=7d#top` → `/analytics/web-shop?period=7d#top` | |
| RT-ROUTE-014 | P2 | PASS | `/analytics/products/login?d=1` → `/analytics/engagement?d=1` | |
| RT-ROUTE-015 | P2 | PASS | `foo` 和 `Site-Builder` → `/analytics/payments`，无 query | |
| RT-ROUTE-016 | P1 | PASS | 3 个入口都落到 `/analytics/payments` | |
| RT-ROUTE-017 | P1 | PASS | chargeback-registry URL 不变，页面标题 Anti-fraud | |
| RT-ROUTE-018 | P1 | PASS | `/support?x=1` → `/support/transactions`（无 query）；`/support/tickets` 渲染 Support tickets | |
| RT-ROUTE-022 | P1 | PASS（部分） | marketplace、communication-hub、settings/company、settings/api_key、profile 都没有 sidebar | editor 与 get-started 部分见 HOME-002 |
| RT-ROUTE-024 | P2 | PASS | `/funding` → `/funding/start`（Funding Club）；`/funding/requests/1` 渲染；sidebar 中没有 merchant 级 funding 入口 | |
| RT-ROUTE-025 | P2 | PASS | `/frame/reports` 渲染；`/frame` → `/not-found` | |
| RT-ROUTE-026（D1 gold） | P1 | PASS（缺陷现状） | `/53105/gold` → `/not-found` | D1 仍存在 |
| RT-ROUTE-027（D1 link） | P1 | PASS（master 现状） | `/53105/link` → `/not-found` | |
| RT-ROUTE-028 | P2 | **FAIL（新发现）** | `/53105/'gold'`、`/53105/'link'` 匹配到路由（URL 编码为 `%27`），但页面崩溃：ErrorBoundary 显示 “Something went wrong”，错误为 `Minified Redux error #7` | 与 metaframe 是同一种崩溃 |
| RT-ROUTE-029 | P1 | PASS（部分） | `/profile` 渲染且无 sidebar；`/profile/x` → `/not-found` | 未从 topbar 点击进入 |
| RT-ROUTE-033 | P2 | **FAIL（相对 P3 预期）** | `/verification/x` 渲染 Two-step verification 页面，URL 不变 | T2 P3 已把预期改为 `/not-found` |
| RT-ACC-001 | P0 | **FAIL（1/32）** | 31 个 gated 路由都进入成功，没有 `/forbidden`；**`/53105/metaframe` 崩溃**（直接整页打开也一样，`Minified Redux error #7`） | 见下方“崩溃后应用卡死” |
| RT-ACC-022 | P2 | PASS | `/finance/payouts` 渲染 | |
| RT-PROJ-001 | P0 | PASS | `/projects/317869` 渲染；sidebar 中 28 个项目链接都指向 317869 | |
| RT-PROJ-002 | P0 | PASS | `/projects/999/storefront/promotions?tab=a#x` → `/projects/317869/storefront/promotions?tab=a#x` | |
| RT-PROJ-009 | P1 | **FAIL（新发现）** | `/projects/0/sdk` **没有被改写**，按项目 0 渲染 | 原因：`getProjectRouteRedirectId` 在 `isProjectsComplete=false` 且项目未被标为 inaccessible 时返回 `null`。该账号有 687 个项目，列表分页未加载完；`999` 被改写是因为详情 404 后被标为 inaccessible |
| RT-PROJ-010 | P2 | PASS | `/projects/0317869` 不改写，正常渲染 | |
| RT-PROJ-017 | P1 | PASS（3/4）+ 待确认 | `/edit`、`/edit/advanced` 渲染；`/edit/webhooks` → `/edit/webhooks/store`；**`/edit/event-api` → `/edit/advanced`** | 可能是 pay-station remote 内部的路由行为 |
| RT-NAV-002 | P1 | PASS | sidebar 内部链接都以 `/for/web-games/account/53105/` 开头 | |
| RT-NAV-003 | P1 | PASS（属性） | Receipt customizer、Email customizer 外链都带 `target=_blank`、`rel=noopener noreferrer` | **附发现**：stage 上 Email customizer 指向生产域名 `https://sitebuilder.xsolla.com/...`，地址写死在 `layouts/sidebar/project-sidebar-v2/nav-items-config.tsx:413` |
| RT-HOME-002 | P0 | PASS | 删除 selection 后，`/53105` → `/get-started`；两张卡，Games Portal 在前、“Add Xsolla to your stack” 在后；无 shell sidebar、无 promo banner；顶部为 NavigationLite（显示 merchant 名） | 验证后已恢复 `gamesPortal` |
| RT-HOME-012 | P0 | PASS | 点 Games Portal 的 Choose：key=`gamesPortal`，URL 不变，`history.length` 不增加，sidebar 恢复，出现 toast “…account is ready” | |
| RT-HOME-013 | P0 | PASS | 点 “Add Xsolla to your stack” 的 Choose：key=`additionalServices`，显示 Pay Station / Xsolla Login / Web Shop / Offerwall 引导和 toast | 验证后已恢复 `gamesPortal` |
| RT-HOME-014 | P1 | PASS | 点 Switch setup：key 被删除，URL 不变，回到 Choose UI，sidebar 隐藏 | |
| RT-DASH-001 | P0 | BLOCKED | | 账号 balance 为 0，需要有交易的 merchant |
| RT-DASH-002 | P0 | PASS | 显示 `[data-id=ask-ai-banner]`，没有 “Welcome,” | |
| RT-SET-001 | P0 | PASS | 无 shell sidebar；有 “Back to account”；settings 侧栏显示 Company settings / API keys / Administration；全局 promo banner 不显示，内容区顶部显示 PAInfoBanner | |
| RT-UI-010 | P1 | PASS | `script[data-id=xsolla-chat-script]` 与 `#livechat` 各 1 个；`LiveChatWidget.type="bap"`；有 visitor；`role=ROLE_ADMIN` | |

| RT-PROJ-011 | P0 | PASS | 在 `/projects/317869/storefront/promotions?x=1` 用 topbar “Select project” 切到 jtest1：URL 变为 `/projects/318360/storefront/promotions?x=1`，sidebar 项目链接都指向 318360 | 验证后已切回 Test Template（317869） |
| RT-REG-004 | P0 | PASS | `{base}/registration` → `/53105` → `/53105/dashboard`，没有闪现问卷 | |
| RT-MCP-008 / RT-MCP-010 | P0 | N/A | | stage 构建 `c1b5e37` 中没有 MCP 登录 |

### 1.1 崩溃后应用卡死（新发现）

在 SPA 内从 `/53105/metaframe`（崩溃）继续跳转到其他 23 个路由，包括 `/53105/dashboard`，**每个都显示 “Something went wrong”**，sidebar 消失。只有整页刷新才能恢复。说明根级 ErrorBoundary 不会在路由变化时重置，用户只能刷新页面。

### 1.2 T4 remote 与安全

| ID | 优先级 | 结果 | 实际行为 | 备注 |
|---|---|---|---|---|
| RT-MF-011/013/014/015 等（remote 加载） | P1 | PASS（加载层面） | 首次进入时各自请求 remoteEntry：`xaa-widgets/mf/remoteEntry.js`（dashboard）、`cloudgaming-publisher-tools-stage/…/remoteEntry.dashboard.js`、`sdk-intergration-widget/assets/remoteEntry.js`、`launcher-stage/remoteEntry.js`；同一页面生命周期内再次进入不会重复请求 | 跨域请求的 `responseStatus` 为 0（对方没有 `Timing-Allow-Origin`），状态码看不到。fiber props 检查没有执行 |
| RT-MF-015 | P1 | 附观察 | `/projects/{p}/launchers` → `/projects/{p}/new-launcher` | |
| RT-MF-028 | P1 | PASS（整页）/ **待复核（SPA）** | 整页打开 `/projects/{p}/subscriptions` 正常；在 SPA 内从 `/support/subscriptions` 跳到**裸路径** `/projects/{p}/subscriptions` 时，2/2 次崩溃（“Something went wrong”）。通过 sidebar 点击（目标为 `/subscriptions/plans`）则正常 | 同一个 subscriptions container 的两个 exposed module 先后挂载 |
| RT-SEC-101（S-01） | P0 | **FAIL（缺陷已复现）** | 补充 cookie 属性：`gc-pa-v4-token` 为 host-only、`Path=/`、`Secure`、`SameSite=Lax`（默认值）、会话级，JS 可读 | 同时存在 `gc-pa-merchant-id`、`gc-pa-project-id`、`gc-pa-locale`（无 Secure） |

## 2. 缺陷复现（阶段 2）

| 缺陷 | 结果 | stage 证据 | 还缺什么 |
|---|---|---|---|
| RT-ACC-027（S-18，section 角色进入公司设置/成员页） | BLOCKED | 当前账号是 admin，无法验证 | 需要切换到 webdev（section 角色）会话，只读即可复现 |
| RT-FRAME-002（S-03，iframe allowlist） | 静态证据已确认 | stage 部署的 bundle 中，判断逻辑为 `Object.keys(map).find(k => url.startsWith(k))`，与源码一致，所以 userinfo、后缀子域等绕过方式在 stage 上同样成立 | 完整复现需要改写 `salescards/{id}` 响应（C 类，交给 QA） |
| RT-DASH-024 / RT-FRAME-010（S-20 / AC-13，Upsell 跳转缺 basename） | 后果已确认 | 缺 basename 的落地地址 `https://{host}/53105/dashboard?upsell-card-id=1` 由服务器直接返回 **404 “Cannot GET /53105/dashboard”** | 完整复现需要打开 Upsell 弹窗并选择项目，会发出 `PUT handle_all_utms` 和 `POST assign_to_user`（D 类，需要你逐项确认） |
| S-01（storefront JWT） | **已复现** | 见 RT-SEC-101 | — |

## 3. 汇总

### 3.1 执行情况

| 阶段 | 计划 | 执行 | 结果 |
|---|---|---|---|
| 0 环境识别 | 4 步 | 4 步 | 发现 stage 运行的是 10-05 的构建 `c1b5e37` |
| 1 P0 只读冒烟（A 类 P0，22 条） | 22 | 22 | PASS 16、FAIL 3（BOOT-006、ACC-001 的 metaframe、SEC-101/S-01）、BLOCKED 1（DASH-001 无交易数据）、N/A 2（MCP-008/010）。另外顺带执行了 3 条 B 类 P0：AUTH-016（3/4 通过，`/resetting` 失败）、ROUTE-035 ①、DASH-002 通过 |
| 2 缺陷复现 | 3 + S-01 | 4 | S-01 已复现；S-03、S-20 取得 stage 证据；S-18 需要 webdev 账号 |
| 3 A 类 P1/P2 | 125 | 约 55 | 主要覆盖 T1、T2 路由与项目、T3 首页与设置、T4 remote 加载。未执行：fiber props 检查、埋点 payload、padding/滚动等 P2 细节 |
| 4 需要你协助 | B 168 + D 79 | 0 | 等你决定，见 §3.3 |

### 3.2 新发现的问题（stage 实测）

| # | 严重度（建议） | 问题 | 用例 |
|---|---|---|---|
| F1 | 高 | `gc-pa-v4-token` 是 JS 可读的会话 JWT，与 Bearer token 相同（S-01） | RT-SEC-101 |
| F2 | 高 | `/53105/metaframe` 必定崩溃（Redux error #7）；崩溃后在 SPA 内跳到任何路由都显示错误页，只有刷新才能恢复。spec 0.3.2：根因为 S-35（`Root.fetchRouteData` 把 `fetchProjectsLite` 返回的 Promise 当 action dispatch）；不随路由重置记为 U-14 | RT-ACC-001、§1.1 |
| F3 | 中 | stage 仍运行 10-05 的构建 `c1b5e37`，虽然仓库已有 tag `stage-web-games-20261020-05`。MCP 登录、ToU 勾选框、MCP 注册修复等都不在 stage 上 | §0 |
| F4 | 中 | 项目列表未加载完（项目数超过一页）时，`/projects/0/...` 不会被改写，按项目 0 渲染 | RT-PROJ-009 |
| F5 | 中 | Upsell 跳转的落地地址在 stage 上返回 404（S-20 的实际后果） | RT-DASH-024 |
| F6 | 低 | `/53105/'gold'`、`/53105/'link'` 能匹配路由但会崩溃（Redux error #7），与 metaframe 同一根因 S-35 | RT-ROUTE-028 |
| F7 | 低 | 大写 URL `/Settings/Company` 显示了 shell sidebar，chrome 显隐规则区分大小写（spec 0.3.2：S-38） | RT-ROUTE-008 |
| F8 | 低 | stage 上的 Email customizer 链接指向生产域名 `sitebuilder.xsolla.com`（写死在 `nav-items-config.tsx:413`；spec 0.3.2：S-37） | RT-NAV-003 |
| F9 | 低 | admin 打开不存在的 merchant 时，渲染 shell、没有错误提示，`/api/organization/{id}/detail` 重复 404 三次 | RT-MAG-004/006 |
| F10 | 低 | 已登录用户打开 `/resetting` 被 SDK `LoginPage` 重定向到 `/{mid}`，无法改密码（T1 P3 已查明是基线代码行为） | RT-AUTH-016 |
| F11 | 待复核 | SPA 内直接进入裸路径 `/projects/{p}/subscriptions` 会崩溃 | RT-MF-028 |
| F12 | 待确认 | `/account-no-access` 对有权限用户重定向到 dashboard；`/edit/event-api` 重定向到 `/edit/advanced` | RT-ROUTE-001、RT-PROJ-017 |
| F13 | 信息 | 裸路径 `/for/web-games` 和主机根 `/` 由服务器返回 404，SPA 的规范化逻辑在 stage 上不会生效（BFF 只挂载 `/for/:site/*`，`bff-routes.ts:211,231,242,400`） | RT-BOOT-006/007/008 |

### 3.3 需要你决定（阶段 4）

| 类别 | 数量 | 需要什么 |
|---|---|---|
| B：其他账号 | 168 | 在这个 Chrome 中切换到 owner（非 admin）、viewer、webdev/junior、多 org、ToU 待签等账号的会话。webdev 会话能直接复现 S-18 |
| D：写入/不可逆 | 79 | 对每个操作逐项确认，例如 Upsell 弹窗（S-20 完整复现）、登出（放在最后）、语言切换 |
| C：改写响应 | 70 | 交给 QA，用 DevTools Local overrides / Requestly 执行 |
| E：不可在 stage 验证 | 7 | 只记录原因 |

## 4. Batch A（spec 0.3.3）

> 请求方：spec-miner 会话。执行者：Claude（Claude in Chrome，只读）。
> 公共条件：host `accounts-sdk-skeleton.nl-k8s-stage.srv.local`；build `stage-web-games-20261005-03`（`c1b5e37`）；账号 Xsolla admin（`ROLE_ADMIN`），merchant `53105`，已登录会话；时间为 UTC。
> 观测方式：network 指 `performance` resource/navigation timing 和页面内 `fetch`（看不到响应头，所以看不到 302 的 Location 头，只能看到 `redirectCount` 和落地 URL）；DOM 指页面元素；console 指 console 日志。

| # | 时间（UTC） | 路由 / API | 加载方式 | 观察结果 | 证据 | 局限 |
|---|---|---|---|---|---|---|
| A1 U-05 / OBS-MF-003 | 2026-10-21T03:15:04Z | `GET account-platform-gateway…/api/v1/modules` | 页面内 `fetch` 同一 URL | 响应为 `{code, result: {data, total: 20}, trace_id}`。20 个条目的字段都是 `id, module_id, name, alias, icon, scope, module, urls, routes, module_level, is_enabled`；**`urls` 的 key 都是 `development / stage / production`**（20/20）；`is_enabled` 都为 true；`module_level` 取值 1 和 2。`communication_platform`：`module=./SupportHubV2`，`scope=communication_platform`，stage URL 主机 `chat.nl-k8s-stage.srv.local`，以 `remoteEntry.js` 结尾。`xaa_widgets`：存在，`scope=xaaWidgets`，`module=./XAAWidgetsRemote`，以 `remoteEntry.js` 结尾。`funding`：存在，`scope=funding`，`module=./app`，主机 `developer-account-stage…`，文件为 `funding-developer-account.js`（**不是** `remoteEntry.js`）。`finance`、`support`：都存在，都使用 `scope=transactions_publisher_account`，主机 `publisher-account-client-transactions…`，文件为 `transactions_publisher_account.js`，`module` 分别为 `./finance`、`./support` | network | 只记了字段；没有记录 `routes` 的内容 |
| A2a OBS-AUTH-009 | 2026-10-21T03:15:25Z | `{base}/53105/projects/0/edit` | 整页加载 | 文档 `redirectCount=1`，落地 **`/53105/`**（`/projects/0/edit` 全部丢失），文档状态 200；随后 SPA 跳到 `/53105/dashboard` | network（navigation timing）、URL | 看不到 Location 头。**与本批预期“302 到第一个项目并保留 `/edit`”不一致**，与 spec 0.3.2 中“整页刷新 `/{m}/projects/0` → `/{m}/`”一致 |
| A2b OBS-AUTH-009 | 2026-10-21T03:15:40Z | `{base}/0/dashboard` | 整页加载 | `redirectCount=1`，落地 `/53105/dashboard`（保留 `/dashboard`），状态 200 | network、URL | 同上 |
| A3 OBS-AUTH-009、S-22 | — | — | — | **未执行** | — | 需要无会话环境：Claude in Chrome 不能开无痕窗口；清 cookie 会结束用户当前会话；Claude 不能输入密码登录 |
| A4 S-02 | — | — | — | **未执行** | — | 需要 DevTools 的 request blocking，Claude 没有这个能力。按要求不用其他方式替代 |
| A5 S-04、OBS-BOOT-002 | — | — | — | **未执行** | — | 同 A4 |
| A6 S-21 | 2026-10-21T03:16:00Z（客户端）、03:16:27Z / 03:16:36Z（整页） | `{base}/forbidden`、`{base}/not-found` | 客户端导航（`pushState` + `popstate`）和整页加载各一次 | 4 种情况都显示精简导航：只有 Xsolla logo、静态的 merchant 名称 “Web Games ACCT WEB-04”、“Go to homepage”；**没有** merchant 切换按钮、用户菜单（User / Change profile / Sign out）、语言切换、sidebar。对照组 dashboard 上这些元素都存在 | DOM | 只按按钮文字和 aria-label 判断，没有核对组件名 |
| A7a OBS-ROUTE-003 | 2026-10-21T03:16:56Z | `{base}/53105//dashboard?x=1#h` | 整页加载 | `redirectCount=0`，SPA 把 URL 改为 `/53105/dashboard`，query 和 hash 都丢失 | URL | — |
| A7b OBS-ROUTE-005 | 2026-10-21T03:17:06Z | `{base}/53105/support-hub/abc?x=1` | 整页加载 | → `/53105/communication-hub`，子路径和 query 都丢失 | URL | — |
| A7c OBS-ROUTE-006 | 2026-10-21T03:17:24Z | `{base}/53105/analytics/products/login?period=7d#k` | 整页加载 | → `/53105/analytics/engagement?period=7d#k` | URL | — |
| A7d OBS-ROUTE-006 | 2026-10-21T03:17:35Z | `{base}/53105/analytics/products/unknown?period=7d` | 整页加载 | → `/53105/analytics/payments`，query 丢失 | URL | — |
| A8 OBS-I18N-002 / S-36（旁证） | 2026-10-21T03:18:19Z | `{base}/53105/dashboard?locale=de`（profile 语言为 `en`） | 整页加载 | 时间以文档开始加载为 0：1140 ms 时 URL 中还有 `?locale=de`，`<html lang=en>`；**2183 ms 时 `?locale` 已被删除**；`get_init_info` 在 2839–3618 ms；4599 ms 时 sidebar 首次渲染，文字为英语（“Get started”）；之后 30 s 内语言一直是 `en`。没有发出 `users/location` 或其他写 locale 的请求 | URL、DOM、network | 1140 ms 之前没有观测；UI 在 4.6 s 前没有可见文字，所以**看不到“先变成 de 再变回 en”的过程**，只能确认参数在用户数据加载前就被删除、最终显示 profile 语言。stage 的 SDK 是旧补丁版本，只算旁证 |

## 5. Batch C（spec 0.3.3，会改数据）

> 授权：用户在本会话中确认只执行 C1（2026-10-21）。**C2、C3 本次不执行。**
> 公共条件：host `accounts-sdk-skeleton.nl-k8s-stage.srv.local`；build `stage-web-games-20261005-03`（`c1b5e37`，SDK 为旧补丁版本，涉及 SDK 的结论只算旁证）；账号 Xsolla admin（`ROLE_ADMIN`），merchant `53105`，已登录；页面 `/53105/dashboard`；时间为 UTC。
> 观测方式：在页面中 hook `XMLHttpRequest` 记录 `users/location` 请求的方法、body 和状态码；DOM 读取页面文本；Redux store 读取 `locale.currentLocale` 和 `user.user.locale`。LiveChat 的 iframe 跨域，只能读取 `window.LiveChatWidget.language`，看不到 iframe 内部的文案。

### C1 S-23 / S-24：切换语言

| 步骤 | 时间（UTC） | 操作 | 观察结果 | 证据 |
|---|---|---|---|---|
| 0 记录 L0 | 03:53:57Z | — | **L0 = `en`**：store `currentLocale=en`，profile `locale=en`，topbar 显示 EN，`<html lang=en>`，`LiveChatWidget.language=en`。Balance 显示 `$ \| 0.00`，Gross revenue 显示 `$0.00`，Last payout `Sep 7, 2022` | store、DOM |
| 1 切到 de | 03:54:34Z | topbar EN → Deutsch | `POST /api/account/platform/{id}/users/location`，body `{"locale":"de"}`，**200**。store 和 profile 都变为 `de`，topbar 显示 DE，页面文案变为德语。**S-23：Guthaben（Balance）显示 `$ \| 0 00`，小数逗号被替换成空格**；同页 Bruttoeinnahmen（Gross revenue）正常显示 `0,00`。**S-24：`LiveChatWidget.language` 仍为 `en`**。`<html lang>` 仍为 `en` | network、DOM、store |
| 2 切到 fr | 03:55:01Z | topbar DE → Français | `POST …/users/location`，body `{"locale":"fr"}`，**200**。store 和 profile 都变为 `fr`，topbar 显示 FR。**S-23：Solde 显示 `$ \| 0 00`**；Revenus bruts 正常显示 `0,00 $US`。**S-24：`LiveChatWidget.language` 仍为 `en`**。`<html lang>` 仍为 `en` | network、DOM、store |
| 3 刷新（仍为 fr 时） | 03:55:30Z–03:55:54Z | 整页刷新 dashboard | **语言回到 `en`**：`get_init_info` 返回的 profile `locale=en`，store `en`，topbar EN，Balance 回到 `0.00`。cookie `pa-locale`、`gc-pa-locale`、`sb-pa-locale`、`network-pa-locale` 都是 `en`。`LiveChatWidget.language=en` | store、DOM、cookie |
| 4 切回 L0 | 03:56:19Z | topbar EN → English | `POST …/users/location`，body `{"locale":"en"}`，**200** | network |
| 5 刷新确认 | 03:56:46Z | 整页刷新 dashboard | store、profile、topbar、`LiveChatWidget.language`、`<html lang>` 都是 `en`。**已恢复到 L0** | store、DOM |

**结论**

- **S-23 已复现**：de 和 fr 下，Balance 的小数逗号被替换成空格（`0 00`）。同页的 Gross revenue 格式正确，说明问题只在 Balance 组件。余额为 0，没有观察到千位分隔符的表现。
- **S-24 已复现（前半段）**：切换语言后，`LiveChatWidget.language` 一直是 `en`。后半段“刷新后才更新”**无法验证**，原因见下一条。
- **新发现：切换语言不能持久化。** 两次 `users/location` 都返回 200，store 和 profile 当场更新；但刷新后 `get_init_info` 返回的 profile 语言仍是 `en`，页面回到英语。原因未知 [U]：可能是 `users/location` 写入的字段不是 `get_init_info` 读取的字段，也可能是后端没有保存。这与 T3 记录的 S-25（保存失败时无提示、刷新后变回）表现相同，但这里接口没有失败。
- **附带观察**：切换语言后 `<html lang>` 始终是 `en`，不随界面语言变化。
- **数据恢复**：最后一次写入为 `{"locale":"en"}`（200），刷新后确认为 `en`。本次没有新建任何账号、org 或项目。

### C2、C3

未执行：用户只授权了 C1。C3（新注册账号）需要创建账号和输入密码，Claude 不执行，需要人工完成。

## 6. Batch A2（spec 0.3.5）

> 请求方：spec-miner 会话（转述用户同意）。执行者：Claude。只在 Claude 自己的 tab 中修改 JS 运行时，不写 stage 数据，不清除会话；每项结束后整页刷新恢复。
> 公共条件：host `accounts-sdk-skeleton.nl-k8s-stage.srv.local`；build `stage-web-games-20261005-03`（`c1b5e37`）；账号 Xsolla admin，merchant `53105`，已登录；时间为 UTC。BFF 两边都是 1.0.0，A3 的结论适用于 772a320。

| # | 时间（UTC） | 路由 / 方法 | 加载方式 | 观察结果 | 证据 | 局限 |
|---|---|---|---|---|---|---|
| A3 OBS-AUTH-009、S-22 | 2026-10-21T03:59:47Z | 页面内 `fetch(u, {credentials, headers: {Accept: 'text/html'}, cache: 'no-store'})` | fetch（模拟文档请求） | `omit` + `{base}` → `redirected=true`，final `{base}/login`，200，返回 shell。`omit` + `{base}/53105/dashboard?tab=x` → `redirected=true`，final `{base}/login`。`omit` + `{base}/forbidden` → `redirected=false`，200，返回 shell。`omit` + `{base}/not-found` → `redirected=false`，200，返回 shell。`include` + `{base}/login` → `redirected=true`，final `{base}`（没有保存的 return URL）。**5 项都符合预期** | network（fetch 响应） | 看不到 Set-Cookie，无法确认 `pa-original-url` 是否写入；“登录后回到原地址”需要输入密码，没有执行；`/forbidden`、`/not-found` 之后 SPA 的跳转在 fetch 中看不到 |
| A4 S-02 | 2026-10-21T04:00:17Z 起 | 整页加载 `/53105/dashboard` 后，确认 `typeof window.funding === 'undefined'`、没有加载过 `funding-developer-account.js`；hook `Node.prototype.appendChild`/`insertBefore`，把 `funding-developer-account.js` 的 `<script>` 改到 `https://invalid.invalid/blocked.js`；从 sidebar（Other tools → Funding，`/projects/317869/funding`）客户端导航进入 | 客户端导航（同一文档） | 3 s、15 s、35 s、约 60 s 时：`__blocked.length` 都是 **1**；页面上 **1 处** “Failed to load: …funding-developer-account.js”；同时有 **1 个持续旋转**的元素（styled-components，`animation-name: fvtopB`）。离开到 dashboard 再从 sidebar 回到 funding：`__blocked.length` 变为 **2**（重新尝试注入并再次失败），页面上又是 1 处报错和 1 个持续转圈。**符合 S-02**：首次加载失败时，第二个调用者不再注入脚本、一直转圈；失败后才挂载的调用者会重试 | DOM、JS hook | 第一次点击 sidebar 链接没有生效（链接所在分组折叠），改为对同一个 `<a>` 调用 `click()`，仍是 react-router 客户端导航；没有确认报错和转圈分别位于 nav 区和 App 区；离开页面后的持续轮询基于定时器，不产生网络请求，**无法观察** |
| A5a S-04 | — | — | — | **未执行** | — | 需要以 admin 身份切换到其他 merchant 再进入财务页，会改写 merchant 相关 cookie，超出本次“在 53105 上只读验证”的范围；该项本身是可选项 |
| A5b | — | — | — | 未由 Claude 执行；已由另一会话用 Playwright 匿名 headless 完成，结论见 spec 0.3.7 §10.3（OBS-BOOT-002 证实：abort 与 500 都白屏） | — | — |

## 7. A5b（Claude Code CLI，Playwright 拦截）

> 执行者：Claude Code CLI，用户明确要求执行。匿名、headless、只读：不登录，不写 stage 数据，不改仓库代码。
> 脚本：`scratchpad/a5b/a5b-check.cjs`（Playwright Chromium，`ignoreHTTPSErrors: true`）。每个用例使用新的 browser context，用 `page.route(/\/api\/v1\/modules(\?|$)/, …)` 拦截。整页加载后等待：拦截用例 20 s，对照用例 12 s。

- **时间**：2026-10-21T12:15:04+08:00 至 2026-10-21T12:16:17+08:00（UTC 04:15:04Z–04:16:17Z）
- **base URL**：`https://accounts-sdk-skeleton.nl-k8s-stage.srv.local`，入口 `/for/web-games/account/login`
- **build**：`stage-web-games-20261005-03`（commit `c1b5e37`）。来源：`main.*.js` 的 CDN 路径 `/business-account-stage/stage-web-games-20261005-03/for/web-games/main.e6b8c0da0fd32ee6e09b.js`，三个用例相同
- **会话**：匿名（新 context，无 cookie）
- **适用性**：`src/init.tsx` 与 `public/index.html` 在 `c1b5e37` 与 `772a320` 之间没有改动，所以结论直接适用于 772a320

**原始输出（每个用例一行 JSON）**

```json
{"case":"abort","startedAt":"2026-10-21T04:15:05.366Z","finishedAt":"2026-10-21T04:15:35.732Z","docStatus":200,"finalUrl":"{BASE}/for/web-games/account/login","build":"stage-web-games-20261005-03","mainScript":"/business-account-stage/stage-web-games-20261005-03/for/web-games/main.e6b8c0da0fd32ee6e09b.js","moduleRouteHits":1,"modulesResponseStatus":null,"pageErrors":["Failed to initialize application: AxiosError: Network Error"],"consoleErrorCount":1,"consoleErrorsSample":["Failed to load resource: net::ERR_FAILED"],"serverTokenRequests":0,"root":{"children":0,"textLen":0},"hasPasswordInput":false}
{"case":"http500","startedAt":"2026-10-21T04:15:35.800Z","finishedAt":"2026-10-21T04:16:01.062Z","docStatus":200,"finalUrl":"{BASE}/for/web-games/account/login","build":"stage-web-games-20261005-03","mainScript":"/business-account-stage/stage-web-games-20261005-03/for/web-games/main.e6b8c0da0fd32ee6e09b.js","moduleRouteHits":1,"modulesResponseStatus":500,"pageErrors":["Failed to initialize application: AxiosError: Request failed with status code 500"],"consoleErrorCount":1,"consoleErrorsSample":["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"],"serverTokenRequests":0,"root":{"children":0,"textLen":0},"hasPasswordInput":false}
{"case":"control","startedAt":"2026-10-21T04:16:01.130Z","finishedAt":"2026-10-21T04:16:17.113Z","docStatus":200,"finalUrl":"{BASE}/for/web-games/account/login","build":"stage-web-games-20261005-03","mainScript":"/business-account-stage/stage-web-games-20261005-03/for/web-games/main.e6b8c0da0fd32ee6e09b.js","moduleRouteHits":0,"modulesResponseStatus":200,"pageErrors":[],"consoleErrorCount":4,"consoleErrorsSample":["Failed to load resource: the server responded with a status of 401 ()","Failed to load resource: the server responded with a status of 401 ()","Failed to load resource: the server responded with a status of 429 ()"],"serverTokenRequests":2,"root":{"children":2,"textLen":342},"hasPasswordInput":true}
```

**判定**

| case | 拦截方式 | 预期 | 实际 | 判定 |
|---|---|---|---|---|
| abort | `route.abort('failed')` | `moduleRouteHits ≥ 1`；pageErrors 含 `Failed to initialize application`；`root.children == 0`；`serverTokenRequests == 0`；`hasPasswordInput == false` | hits 1；pageError `Failed to initialize application: AxiosError: Network Error`；children 0，textLen 0；serverToken 0；无密码框 | **符合** |
| http500 | `route.fulfill({status: 500})` | 同 abort | hits 1；modules 响应 500；pageError `Failed to initialize application: AxiosError: Request failed with status code 500`；children 0，textLen 0；serverToken 0；无密码框 | **符合** |
| control | 不拦截 | `root.children > 0`；`hasPasswordInput == true`；`modulesResponseStatus == 200` | children 2，textLen 342；有密码框；modules 200；没有 pageError | **符合**（环境正常） |

**结论**

- **OBS-BOOT-002 已证实**：`/api/v1/modules` 网络失败或返回 500 时，都抛出 `Failed to initialize application: …`，`#root` 为空（0 个子节点，没有文字），没有登录表单，也没有发出 `/server/token` 请求，即没有进入 bootstrap。页面是纯白屏，没有错误 UI。
- 两种失败的错误消息只有 Axios 部分不同（`Network Error` 与 `Request failed with status code 500`）。
- 拦截用例的 20 s 等待内，modules 请求只被命中 1 次，没有观察到重试。
- **附带观察**：对照用例有 4 条 console error（样本中 2 条 401、1 条 429），是匿名会话下的正常加载，与本项无关，没有进一步分析。

**局限**

- 只覆盖登录页入口（`/for/web-games/account/login`），没有覆盖其他入口路由和有会话的情况。
- 用 Playwright 拦截模拟故障，不是真实的网络故障或后端故障；超时、慢响应、响应体格式错误等情况没有覆盖。
- 只在 stage 上运行（build `stage-web-games-20261005-03`），没有在 prod 上运行。
