# T3 回归用例：首页 · Dashboard · 设置 · 横幅/聊天 · i18n · 埋点

| 项 | 值 |
|---|---|
| Track | T3 首页·Dashboard·设置·横幅/聊天·i18n·埋点 |
| 基于 spec 版本 | 0.3.2（`web-games-account_reverse_spec.md`）；P5 按 0.3.1 → 0.3.2 的 diff 定向更新，见文末“P5 变更记录”（本文件此前停在 0.3.0）；P3 从 0.2.0 定向更新 |
| 代码基线 | `master@772a320` |
| SDK 核对 | 本地 `node_modules/.pnpm`：`platform-shell 2.22.3`、`platform-apis 2.29.2`、`platform-store 1.15.6`、`platform-pages 3.25.2`、`platform-components 4.20.3`、`platform-bff 1.0.0`、`core 0.9.1`、`platform-locales 2.6.7`。前 6 个与 spec 记录一致 |
| 生成日期 | 2026-10-21 |
| 测试执行 | 现有测试只阅读，没有运行 |

阅读约定：

- 路径相对 repo root，行号以 772a320 为准。SDK 路径写成 `<pkg>@<ver> dist/index.mjs:<行>`，指 `node_modules/.pnpm/@accounts-sdk+<pkg>@<ver>*/node_modules/@accounts-sdk/<pkg>/dist/index.mjs`。
- `{m}` 是 merchant id，`{p}` 是 project id。stage 上所有路由都在 basename `/for/web-games/account` 下。
- “自动化”列只写已固定该行为的测试。`e2e/tests/*.smoke.spec.ts` 中 T3 相关区域全部是 `test.fixme`，不算自动化。
- `[分支差异]` 指当前分支 `WASP-2524-migrate-tests-to-apps`（代码在 `apps/web-games/src`）与基线行为不同。
- `[新发现 N-xx]` 指 spec 没有记录、本次读代码发现的问题。spec 0.3.0 已收录 N-01…N-05，编号为 S-20、S-23、S-24、S-25、S-26；用例中改写为 `[S-xx，原 N-xx]`。
- “预期失败项”指用例写的是 spec 的期望行为（AC），当前代码不满足，执行时应失败。
- 追溯列末尾的 `[P3]` 表示该用例在 P3（spec 0.3.0）中修改过；`[P5]` 表示在 P5（spec 0.3.2）中修改过。

DevTools 通用操作：

- **阻断请求**：Network 面板，右键请求 → Block request URL。
- **观察存储**：Application → Local Storage / Session Storage / Cookies。
- **观察埋点**：host 计数器 900023 不在 console 打日志，只能在 Network 中过滤 `xmts-global-api.nl-k8s-stage.srv.local`（stage collector，需要内网）。计数器 3002 在非 production 环境还会打 `console.info('[communication-hub-analytics] elementClick', ...)`。

---

## 1. HOME：首页分流与 Get Started

**覆盖的 OBS**：OBS-HOME-001、OBS-HOME-002、OBS-HOME-003、OBS-HOME-004、OBS-HOME-005；AC-07。

**涉及的 API**：本节页面不直接调用本地 endpoint。所需数据（merchant、privileges、projects）由 SDK 请求（见 U-03）。

### 1.1 首页分流决策（`src/components/DynamicHome/index.tsx:45-79`）

```mermaid
flowchart TD
  A[打开 /{m}] --> B{merchantId 已有，merchant/privileges 不在加载，<br/>projects 已就绪或请求失败?}
  B -- 否 --> L[CenteredLoader]
  B -- 是 --> C{role ∈ PROJECT_ONLY_ROLES<br/>JUNIOR_DEVELOPER / JUNIOR_DEVELOPER_PARTIAL / DEVELOPER_PARTIAL}
  C -- 是 --> P[/{m}/projects/]
  C -- 否 --> D{projects 请求失败?}
  D -- 是 --> G[/{m}/get-started/]
  D -- 否 --> E{hasDashboardAccess?<br/>有项目: get_graphics_gross_revenue<br/>无项目: project_create<br/>且非 junior developer}
  E -- 否 --> G
  E -- 是 --> F{localStorage 中有合法 setup selection?}
  F -- 否 --> G
  F -- 是 --> H[/{m}/dashboard/]
```

| 分支 | 条件 | 落地页 |
|---|---|---|
| H0 | 数据未就绪 | 留在 `/{m}`，显示 loader |
| H1 | 角色是 `ROLE_JUNIOR_DEVELOPER`、`ROLE_JUNIOR_DEVELOPER_PARTIAL` 或 `ROLE_DEVELOPER_PARTIAL` | `/{m}/projects` |
| H2 | projects 请求失败 | `/{m}/get-started` |
| H3 | 有项目但缺 `get_graphics_gross_revenue`；或无项目且缺 `project_create` | `/{m}/get-started` |
| H4 | 有 dashboard 访问，但没有 setup selection | `/{m}/get-started`（Choose UI） |
| H5 | 有 dashboard 访问，有 setup selection | `/{m}/dashboard` |

`checkPrivileges` 来自 SDK `checkPrivilegeAccess`，语义是 **全部持有**（`platform-apis@2.29.2 dist/index.mjs:2889`）。

### 1.2 用例

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-HOME-001 | 有访问、有 selection → Dashboard | A-OWNER：`ROLE_OWNER`，merchant 有 ≥1 个项目，持有 `get_graphics_gross_revenue`；localStorage 中 `web-games:setup-selection:web-games:{m}` = `gamesPortal` | 1. 打开 `/for/web-games/account/{m}` | URL 变为 `/{m}/dashboard`，Dashboard 渲染<br>`[分支差异]` 分支不再读 selection，有访问即进 `/dashboard`（`apps/web-games/src/components/DynamicHome/index.tsx:58-68`）。 | P0 | OBS-HOME-001 H5；AC-07；`DynamicHome/index.tsx:79` | `DynamicHome/index.test.tsx` “sends a merchant with access and a stored selection to the dashboard” |
| RT-HOME-002 | 无 selection → Choose UI | A-OWNER；删除上述 localStorage key | 1. 打开 `/{m}` | URL 变为 `/{m}/get-started`；页面显示两张场景卡（Games Portal 在前，Additional Services 在后）和 `NavigationLite`；**topbar、shell sidebar、promo banner 都不显示**<br>`[分支差异]` 分支中有 dashboard 访问但无 selection 的用户直接进 `/{m}/dashboard`，不再落到 Choose UI（`apps/web-games/src/components/DynamicHome/index.tsx:58-68`）。在分支上执行时，本用例应失败，需产品确认 AC-07 是否保留。 | P0 | OBS-HOME-001 H4、OBS-HOME-004；AC-07；`DynamicHome/index.tsx:75`；`layouts/Root.tsx:213-236,253` | `DynamicHome/index.test.tsx` “sends a merchant without a stored setup selection to get-started”；`LaunchProject/index.test.tsx` |
| RT-HOME-003 | 有项目但缺 gross revenue 权限 | A-NOREV：非 junior 角色，merchant 有项目，**不**持有 `get_graphics_gross_revenue`；selection = `gamesPortal` | 1. 打开 `/{m}` | URL 变为 `/{m}/get-started`，显示 Games Portal 引导（不是 Choose UI）；不跳 `/forbidden` | P1 | OBS-HOME-001 H3、OBS-HOME-002；`dashboardAccess.ts:20` | `DynamicHome/index.test.tsx` “sends a merchant without the dashboard privilege to get-started” |
| RT-HOME-004 | 无项目、有 `project_create` → Dashboard | A-EMPTY：`ROLE_OWNER`，merchant 0 个项目，持有 `project_create`；selection = `additionalServices` | 1. 打开 `/{m}` | URL 变为 `/{m}/dashboard` | P1 | OBS-HOME-002；`dashboardAccess.ts:20` | `DynamicHome/index.test.tsx` “asks for the project-create privilege when the merchant has no projects” |
| RT-HOME-005 | 无项目、缺 `project_create` | merchant 0 个项目，用户不持有 `project_create`（例如财务角色 `ROLE_ACCOUTING`，待确认该角色权限集）；有 selection | 1. 打开 `/{m}` | URL 变为 `/{m}/get-started` | P2 | OBS-HOME-002；`dashboardAccess.ts:20` | `dashboardAccess.test.ts` “denies access without projects when only the revenue graphics privilege is granted” |
| RT-HOME-006 | project-only 角色 | A-JUNIOR（`ROLE_JUNIOR_DEVELOPER`）、A-JUNIOR-P（`ROLE_JUNIOR_DEVELOPER_PARTIAL`）、A-DEV-P（`ROLE_DEVELOPER_PARTIAL`）；各自有 selection | 1. 每个账号打开 `/{m}` | 三个账号都落到 `/{m}/projects`，与 selection 无关 | P1 | OBS-HOME-001 H1；`core/constants/roles.ts:67-70` | `DynamicHome/index.test.tsx` “project-only roles” |
| RT-HOME-007 | 完整 developer 不是 project-only | A-DEV：`ROLE_DEVELOPER`，持有 gross revenue，有 selection | 1. 打开 `/{m}` | 落到 `/{m}/dashboard`（不是 `/projects`） | P2 | OBS-HOME-001；`roles.ts:67-70` | `DynamicHome/index.test.tsx` “does not treat a full developer as project-only” |
| RT-HOME-008 | projects 请求失败 | A-OWNER，有 selection | 1. DevTools 先在 Network 中找到 SDK 拉取 merchant 项目列表的请求（URL 待确认，见 U-03），右键 Block request URL<br>2. 硬刷新 `/{m}` | 落到 `/{m}/get-started`，不跳 `/forbidden`，不无限 loading | P2 | OBS-HOME-001 H2；`DynamicHome/index.tsx:71-73` | `DynamicHome/index.test.tsx` “sends a merchant to get-started when the project request failed” |
| RT-HOME-009 | 慢网下不提前跳转 | A-OWNER，有 selection | 1. Network 设为 Slow 3G<br>2. 打开 `/{m}` | 先显示居中 loader；数据就绪后一次性跳 `/{m}/dashboard`；中途不出现 `/forbidden` 或 `/get-started` | P2 | OBS-HOME-001 H0；`DynamicHome/index.tsx:45-52` | `DynamicHome/index.test.tsx` “loading gate” |
| RT-HOME-010 | selection 按 site + merchant 隔离 | A-MULTI：同一用户属于 merchant M1、M2，都满足 dashboard 访问；只给 M1 写 selection | 1. 打开 `/{M1}` → 记录落地页<br>2. 切换到 M2，打开 `/{M2}` | M1 → `/dashboard`；M2 → `/get-started` Choose UI。Local Storage key 为 `web-games:setup-selection:web-games:{M1}`<br>`[分支差异]` 分支中 M2 也会进 `/dashboard`（不读 selection）。 | P1 | OBS-HOME-003；`setupSelection.ts:7-8` | `DynamicHome/index.test.tsx` “ignores a setup selection stored for another merchant”；`GetStarted/index.test.tsx` |
| RT-HOME-011 | 非法 selection 值 | A-OWNER；把 key 值手工改为 `foo` | 1. 打开 `/{m}/get-started` | 显示 Choose UI（视为未选择），chrome 隐藏 | P2 | OBS-HOME-003；`setupSelection.ts:17` | `GetStarted/index.test.tsx` “treats an unknown stored value as no selection” |
| RT-HOME-012 | 选择 Games Portal | A-OWNER，在 Choose UI | 1. 点击 Games Portal 卡片的 Choose | key 值变为 `gamesPortal`；URL 仍是 `/{m}/get-started`（`history.replace`，按浏览器 Back **不会**回到 Choose UI）；显示 Games Portal 引导；topbar 和 sidebar 恢复；右上角出现深色 toast “Your Web Games account is ready” | P0 | OBS-HOME-004；`LaunchProject/index.tsx:74-89`；`GamesPortalSetup/index.tsx:77-84` | `LaunchProject/index.test.tsx` “stores the games portal choice…”；`GamesPortalSetup/index.test.tsx` “opens the ready toast once…” |
| RT-HOME-013 | 选择 Additional Services | 同上 | 1. 点击 Additional Services 卡片的 Choose | key 值变为 `additionalServices`；显示 Additional Services 引导和 toast | P0 | OBS-HOME-004；`LaunchProject/index.tsx:85` | `LaunchProject/index.test.tsx` “routes the additional services choice…” |
| RT-HOME-014 | Switch setup | A-OWNER，在任一引导页 | 1. 点击 “Switch setup” | key 被删除；URL 不变，显示 Choose UI；topbar/sidebar/promo banner 再次隐藏 | P1 | OBS-HOME-004；`GamesPortalSetup/index.tsx:92-98`；`AdditionalServicesSetup/index.tsx:75-81` | `GamesPortalSetup/index.test.tsx` “clears the stored selection, tracks the click, and replaces the route” |
| RT-HOME-015 | Games Portal CTA（owner，有项目） | A-OWNER，有项目，持有 `project_settings`，项目侧边栏中有 Game player platform | 1. 在 Games Portal 引导点 step1 CTA<br>2. 返回，点 step2 CTA<br>3. 观察 step3 和 What's next | 1 → `/{m}/projects/{p}/player-platform`；2 → `/{m}/projects/{p}/payments/configuration`；step3 没有按钮；What's next 三张卡（Web Shop / Offerwall / Backpack）全部禁用，带锁提示，点击无反应<br>`[分支差异]` 分支中 player-platform 只按角色判断，不再看侧边栏 `visibility`（`apps/web-games/src/core/access/setup-guide-access.ts:17-55`）。 | P1 | OBS-HOME-005；`GamesPortalSetup/index.tsx:36-52,136-176` | `GamesPortalSetup/index.test.tsx` |
| RT-HOME-016 | 无项目时隐藏 CTA | A-EMPTY（0 个项目），两种 selection 各测一次 | 1. 打开 `/{m}/get-started` | 两个引导中所有 step 按钮都不显示；Additional Services 的 What's next 卡片全部禁用 | P1 | OBS-HOME-005；`GamesPortalSetup/index.tsx:68-71`；`AdditionalServicesSetup/index.tsx:47-50,109-140` | `*Setup/index.test.tsx` “hides … until a project id resolves” |
| RT-HOME-017 | 缺 `project_settings` 隐藏 payments | 用户有项目，不持有 `project_settings` | 1. 分别打开两个引导 | Games Portal step2、Additional Services step1 的按钮都不显示 | P1 | OBS-HOME-005；`setup-guide-access.ts:37` | `*Setup/index.test.tsx` “hides the payments CTA without the project settings privilege” |
| RT-HOME-018 | Additional Services CTA（owner） | A-OWNER，有项目，持有 4 个 storefront 权限（`store_virtual_currency_get_list`、`store_virtual_item_get_by_sku`、`game_delivery_get_games`、`project_settings`），integration type 不是 gnation | 1. 点 step1 CTA<br>2. 点 Xsolla Login CTA<br>3. 依次点 Web Shop、Offerwall、Backpack 卡 | 1 → `.../projects/{p}/payments/configuration`；2 → `.../projects/{p}/login`；3 → `.../projects/{p}/site-builder`、`.../offerwall`、`.../storefront/catalog-management/connectors` | P1 | OBS-HOME-005；`AdditionalServicesSetup/index.tsx:109-188` | `AdditionalServicesSetup/index.test.tsx` |
| RT-HOME-019 | viewer 不显示 Login CTA | A-VIEWER（`ROLE_VIEWER`），有项目，selection = `additionalServices` | 1. 打开 `/{m}/get-started` | Xsolla Login 步骤没有按钮<br>`[分支差异]` 分支的 login 门控只套 `projectRoleOnlyRule`，不再排除 viewer，viewer 会看到 Login 按钮（`apps/web-games/src/core/access/setup-guide-access.ts`）。 | P1 | OBS-HOME-005；`setup-guide-access.ts:13,40`；`project-sidebar-v2/nav-items-config.tsx:222` | `AdditionalServicesSetup/index.test.tsx` “hides the login CTA for a viewer…” |
| RT-HOME-020 | Backpack 卡缺任一 storefront 权限 | 用户缺上述 4 个权限中的 1 个 | 1. 打开 Additional Services 引导 | Backpack 卡禁用，点击不跳转、不发埋点 | P2 | OBS-HOME-005；`setup-guide-access.ts:15-20,38` | `setup-guide-access.test.tsx`；`AdditionalServicesSetup/index.test.tsx` |
| RT-HOME-021 | gnation 商户的 Web Shop 卡 | A-GNATION：merchant integration type = `gnation`，有项目 | 1. 打开 Additional Services 引导 | Web Shop 卡禁用（site-builder 对 gnation 不在导航中）<br>`[分支差异]` 分支中 site-builder 改用 `ADMIN_OR_SUPPORTED_INTEGRATION` 规则（`packages/@platform-templates/layout-access/src/platform-access.ts`）。 | P2 | OBS-HOME-005；`project-sidebar-v2/nav-items-config.tsx:361-365` | `AdditionalServicesSetup/index.test.tsx` “disables the web shop card when the sidebar does not offer site-builder”（用 mock 导航，不针对 gnation） |
| RT-HOME-022 | 财务/支持角色看引导 | A-SUPPORT（`ROLE_SUPPORT`）或财务角色，有项目，有 selection | 1. 打开 `/{m}/get-started`，两种 selection 各看一次 | 项目导航对这些角色为空，所以：Games Portal step1 无按钮；Login 无按钮；Web Shop、Offerwall 卡禁用。payments 和 Backpack 只看权限<br>`[分支差异]` 分支中会计和支持类角色在门控层被显式禁用。 | P2 | OBS-HOME-005；`project-sidebar-v2/nav-items-config.tsx:477-482` | — |
| RT-HOME-023 | CTA 的项目选择 | A-OWNER，merchant 有 ≥2 个项目 | 1. 先进入第 2 个项目页面<br>2. 从 sidebar 回到 Get Started<br>3. 点 payments CTA | 目标使用当前项目 `selectCurrentProjectID`；没有当前项目时用列表第一个项目。离开项目路由后“当前项目”是否保留：待确认 | P2 | OBS-HOME-005；`GamesPortalSetup/index.tsx:66-68` | `*Setup/index.test.tsx` “prefers the current project over the first listed project” |
| RT-HOME-024 | Enter account 落地 | 非 admin owner 首次访问该 site（SDK `EnterAccountGate`，行为 [U]） | 1. 在 Enter account 页点按钮 | 跳 `/{m}`，再按 RT-HOME-001/002 的规则分流 | P2 | `layouts/account-access/enter-account/index.tsx:17-21` | — |
| RT-HOME-025 | Sidebar 入口与页面规则一致 | A-OWNER 与 A-NOREV | 1. 观察 merchant sidebar | “Get started” 对所有人显示；“Dashboard” 只在有 dashboard 访问时显示 | P2 | OBS-HOME-002；`merchant-sidebar-v2/nav-items-config.tsx:134-150` | `dashboardAccess.test.ts` “agrees with the sidebar rules for the same inputs” |

---

## 2. DASH：Dashboard

**覆盖的 OBS**：OBS-DASH-001、OBS-DASH-002、OBS-DASH-003、OBS-DASH-004、OBS-DASH-005；S-08、S-16、S-20、S-23、S-26、S-30、S-31；AC-13。

**涉及的 API**：

| Method | Path（gateway，Bearer + `Business-Account-Id`） | 调用方 | 说明 |
|---|---|---|---|
| GET | `/mapi/merchant/current/merchants/{m}/analytics/metrics/balance` | `Dashboard.tsx:65`、`DashboardBalance/index.tsx:22`（RTK Query 共用缓存） | 进入 Dashboard 就请求，**不看权限**，在任何访问判断之前（S-26） |
| GET | `/mapi/merchant/merchants/salescards/info?utm_campaign={原文}` | `Dashboard.tsx:104` → `apis/upsell.ts:35` | 只传第一个 campaign，未编码（S-08）；在访问判断之前发出，会被重定向的用户也会发（S-26） |
| PUT | `/mapi/merchant/current/merchants/handle_all_utms`（body `null`） | `UpsellModal/index.tsx:49-51` | modal 挂载时调用，失败无处理 |
| POST | `/mapi/merchant/merchants/{m}/salescards/assign_to_user`（body `{utmCampaigns, projectId}`） | `UpsellModal/index.tsx:79-83` | |
| GET | `/mapi/merchant/merchants/{m}/salescards/{cardId}` | `utils/upsell.ts:41` | 只在 `integrationGuideExist` 为真时调用 |
| MF remote | `xaa_widgets` → `DashboardWebGames` | `XAAWidgets/index.tsx:37-48` | 包在 `ErrorBoundary` 中 |

`metrics` 与 `graphics/gross_revenue` 只被死代码 `components/Dashboard/Sales` 使用，运行时不可达（见 spec 勘误 E-09）。

### 2.1 渲染决策

```mermaid
flowchart TD
  A[/{m}/dashboard/] --> B{user.id == '474648'?}
  B -- 是 --> F[/{m}/finance/]
  B -- 否 --> C{数据就绪?}
  C -- 否 --> L[dashboard-access-loader]
  C -- 是 --> D{projects 请求失败?}
  D -- 是 --> D1{junior developer?}
  D1 -- 是 --> X[/forbidden/]
  D1 -- 否 --> H
  D -- 否 --> E{hasDashboardAccess?}
  E -- 否 --> X
  E -- 是 --> H[header: 余额加载中/重新请求中，或有交易 → Welcome；<br/>否则（含请求失败、403）→ AskAiBanner]
  H --> P{balance 两权限都有 或 有 gross revenue?}
  P -- 否 --> O[只渲染 header]
  P -- 是 --> Q[DashboardBalance + XAA board + UpsellModal 槽位<br/>余额数字只在 balance 两权限都有时显示]
```

### 2.2 权限组合矩阵（OBS-DASH-004）

进入页面本身先要通过 OBS-HOME-002。所以“只有 balance 权限、没有 gross revenue”的组合只能用 **0 个项目 + `project_create`** 的商户验证。

| 组合 | 账号 | 余额与 payout | XAA board | 用例 |
|---|---|---|---|---|
| ① `get_metric_balance` + `get_metric_transactions_count` + `get_graphics_gross_revenue` | A-OWNER（有项目） | 显示 | 显示 | RT-DASH-005 |
| ② 只有两个 balance 权限 | A-EMPTY-BAL（0 项目 + `project_create` + 两个 balance 权限） | 显示 | 显示 | RT-DASH-006 |
| ③ 只有 `get_graphics_gross_revenue` | A-REV-ONLY（有项目，缺任一 balance 权限） | 不显示（只有 “Performance” 标题） | 显示 | RT-DASH-007 |
| ④ 两类都不完整（例如只有 `get_metric_balance`） | A-EMPTY（0 项目 + `project_create`，最多持有 1 个 balance 权限） | 不显示 | 不显示，只渲染 header | RT-DASH-008 |

### 2.3 用例

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-DASH-001 | 有交易的商户看到欢迎语 | A-OWNER；balance 接口返回 `value > 0` 且有 `last_transfer_date` | 1. 打开 `/{m}/dashboard` | 标题 “Welcome, {name}”（name 为空时用 email，再为空用 “User”）；不显示 Ask AI 横幅 | P0 | OBS-DASH-003；`Dashboard.tsx:86-89,145-157` | `Dashboard.test.tsx` “header” |
| RT-DASH-002 | 无交易显示 Ask AI | A-OWNER-NEW：balance `value = 0` 或 `last_transfer_date = null` | 1. 打开 Dashboard | 顶部显示 Ask AI 横幅（`data-id="ask-ai-banner"`），不显示欢迎语 | P0 | OBS-DASH-003 | `Dashboard.test.tsx` “shows the Ask AI banner when the balance value is zero / no last transfer date” |
| RT-DASH-003 | balance 请求失败 | A-OWNER | 1. Block `.../analytics/metrics/balance`<br>2. 刷新 Dashboard | 显示 Ask AI 横幅；Balance 显示 “—”；Last/Next payout 都是 “—”；没有 tooltip；页面其余部分正常 | P1 | OBS-DASH-003/004；`DashboardBalance/index.tsx:24-27,56-60` | `Dashboard.test.tsx` “shows the Ask AI banner when the balance request failed”；`DashboardBalance/index.test.tsx` “renders dashes…” |
| RT-DASH-004 | balance 加载中与重新请求中 | A-OWNER；A-MULTI（两个 merchant 都有 dashboard 访问）；Network 设为 Slow 3G | 1. 打开 Dashboard，观察加载过程<br>2. 用 topbar 切到另一个 merchant 的 Dashboard，观察 balance 重新请求期间 | 1：加载期间显示欢迎语（不是 Ask AI）和余额骨架屏；加载完成后再按 RT-DASH-001/002 决定 header。<br>2：新 merchant 的 balance 请求进行中（`isFetching`）同样显示欢迎语和骨架屏，不闪现 Ask AI；请求完成后按新 merchant 的余额决定 header | P2 | OBS-DASH-003；`Dashboard.tsx:86-89`；`DashboardBalance/index.tsx:39-41`；`store/api/dashboard.ts:106` [P3] | `Dashboard.test.tsx` “greets the user while the balance is still loading…”（只测首次加载） |
| RT-DASH-005 | 组合①：全部权限 | A-OWNER | 1. 打开 Dashboard | “Performance” 标题；Balance 带币种符号和两位小数；Last payout、Next payout 日期；XAA board 渲染；header 与 board 之间有分隔线 | P0 | OBS-DASH-004；`Dashboard.tsx:44-45,82-84,167-187` | `Dashboard.test.tsx` “renders the balance with the widgets and the separator…” |
| RT-DASH-006 | 组合②：只有 balance 两权限 | A-EMPTY-BAL | 1. 打开 Dashboard | 余额和 payout 显示；XAA board 也显示 | P1 | OBS-DASH-004；`Dashboard.tsx:84` | `Dashboard.test.tsx` “renders the balance section when only the balance privileges are granted” |
| RT-DASH-007 | 组合③：只有 gross revenue | A-REV-ONLY | 1. 打开 Dashboard | 有 “Performance” 标题和 XAA board；**没有** Balance 数字和 payout 行；没有骨架屏 | P1 | OBS-DASH-004；`DashboardBalance/index.tsx:39,49` | `Dashboard.test.tsx` “hides the balance figure when only the sales privilege is granted” |
| RT-DASH-008 | 组合④：只有一个 balance 权限 | A-EMPTY（只持有 `get_metric_balance`，不持有 `get_metric_transactions_count` 和 gross revenue） | 1. 打开 Dashboard | 只渲染 header（欢迎语或 Ask AI）；没有 Performance 区、没有 XAA board | P1 | OBS-DASH-004；`Dashboard.tsx:159-165`；`platform-components@4.20.3 dist/index.mjs:274`（AND 语义） | `Dashboard.test.tsx` “requires both balance privileges…”、“renders only the header when no dashboard privilege is granted” |
| RT-DASH-009 | 预估 payout 日期提示 | A-OWNER；balance 返回 `next_transfer_date` 非空且 `is_next_transfer_date_calculated_approximately = true` | 1. 悬停 Next payout 旁的 info 图标 | tooltip 文案 “This is an estimated date…”；`next_transfer_date` 为空时没有图标 | P2 | OBS-DASH-004；`DashboardBalance/index.tsx:93-103` | `DashboardBalance/index.test.tsx` “approximate next payout tooltip” |
| RT-DASH-010 | 无访问 → /forbidden | A-NOREV（有项目，缺 gross revenue）；A-JUNIOR | 1. 各自直接打开 `/{m}/dashboard` | 都跳 `/forbidden` | P1 | OBS-DASH-001；`Dashboard.tsx:137-143` | `Dashboard.test.tsx` “access rule” |
| RT-DASH-011 | projects 请求失败时只看角色 | A-NOREV 与 A-JUNIOR | 1. Block 项目列表请求（同 RT-HOME-008）<br>2. 各自打开 `/{m}/dashboard` | A-NOREV **停留在** Dashboard（只有 header，因为没有 dashboard 权限）；A-JUNIOR 跳 `/forbidden` | P2 | OBS-DASH-001（v0.2.0 新增分支）；`Dashboard.tsx:137-139` | `Dashboard.test.tsx` “applies only the role half of the rule when the project request failed”、“still denies a junior developer…” |
| RT-DASH-012 | S-16 会计演示模式（定向） | A-ACC-ID：`user.id = 474648` 的账号；A-ACC-MAIL：email 为 `a.buh@xsolla.com`（或名单中其他 email）且 id 不是 474648 的账号。账号是否存在于 stage：待确认 | 1. A-ACC-ID 打开 `/{m}/dashboard`<br>2. A-ACC-MAIL 打开 `/{m}/dashboard` | **当前预期**：1 → `/{m}/finance`；2 → 正常 Dashboard，不跳 finance（email 永远匹配不上）。<br>**修复后预期**：两者都跳 `/{m}/finance`（若决定 email 也生效，调用方需传 email）；或从名单中删除 3 个 email，此时 2 仍留在 Dashboard。修复方向需产品确认 | P2 | OBS-DASH-002；S-16；`isAccountingPresentMode.ts:4-12`；`Dashboard.tsx:123` | `Dashboard.test.tsx` “redirects an allowlisted account…”（只测 id）；`isAccountingPresentMode.test.ts` |
| RT-DASH-013 | 会计跳转先于访问检查 | A-ACC-ID 且无 finance 权限（待确认） | 1. 打开 Dashboard | 先跳 `/{m}/finance`，再由 finance 路由的 gate 决定是否 `/forbidden`；Network 中仍能看到一次 balance 请求 | P2 | OBS-DASH-002；S-26；`Dashboard.tsx:65,123-125` [P3] | — |
| RT-DASH-014 | 访问判断之前的请求 `[S-26，原 N-05]`（定向） | A-REV-ONLY（缺 balance 权限，≥2 个项目）；A-NOREV（缺 gross revenue，≥2 个项目）；后端为 `spring` 配置 1 张 sales card | 1. A-REV-ONLY 打开 `/{m}/dashboard?utm_campaign=spring`，看 Network 和 header<br>2. A-NOREV 打开同一 URL，看 Network | **当前预期**：1：发一次 `GET .../metrics/balance`（可能 403）和一次 `GET .../salescards/info?utm_campaign=spring`；403 不触发登出（见 AC-03）；balance 失败视为无交易，header 显示 Ask AI 横幅，与商户实际有无交易无关；modal 照常弹出。2：页面跳 `/forbidden`，但跳转前同样发出 balance 和 `salescards/info` 请求；不弹 modal。<br>**修复后预期**：无 balance 权限时不发 balance 请求；会被重定向的用户不发 `salescards/info`<br>`[分支差异]` 分支改用 `usePayoutsBalance`，同一 endpoint，仍无条件调用；缓存 `staleTime: Infinity`，同一会话内余额不会自动刷新。 | P2 | OBS-DASH-003/004/005；S-26；`Dashboard.tsx:65,97-121`；`store/api/dashboard.ts:103-107` [P3] | — |
| RT-DASH-015 | XAA remote 失败不影响页面 | A-OWNER | 1. Block `xaa_widgets` 的 remoteEntry 请求（URL 以 Network 实际为准）<br>2. 刷新 Dashboard | header、Balance 区正常；board 区域空白或显示 SDK ErrorBoundary 降级（UI 由 SDK 决定 [U]） | P1 | OBS-DASH-004；`XAAWidgets/index.tsx:37` | `XAAWidgets/index.test.tsx` “keeps the rest of the dashboard on screen when the remote crashes” |
| RT-DASH-016 | XAA 收到的上下文 | A-OWNER | 1. 在 React DevTools 中选中 `RemoteModuleComponent` | props：`name="xaa_widgets"`、`componentName="DashboardWebGames"`、`merchantId` 为字符串、`locale` = 当前语言、`currencyISO` = merchant `default_currency_iso`、`siteId="web-games"` | P2 | OBS-DASH-004；`XAAWidgets/index.tsx:38-47` | `XAAWidgets/index.test.tsx` |
| RT-DASH-017 | 余额数字的本地化格式 `[S-23，原 N-02]` | A-OWNER；balance `value = 1234567.5`（没有大额数据时，用余额为 0 的账号看小数部分） | 1. 语言依次切到 en、de、es、pt、fr、ru | **当前预期**：所有 `,` 都被替换为空格。en “1 234 567.50”；de、es、pt “1.234.567 50”；fr、ru “1 234 567 50”。小数位仍在，小数逗号被替换成空格（不是丢失）；余额为 0 时 de 显示 “0 00”。所有金额都受影响。<br>**修复后预期**：de/es/pt “1.234.567,50”，fr/ru “1 234 567,50” | P2 | OBS-DASH-004；S-23；`DashboardBalance/index.tsx:67-72` [P3] | `DashboardBalance/index.test.tsx` 只测 en-IN |
| RT-DASH-018 | UTM：单商户单项目不请求 | A-OWNER-1P：只属于 1 个 merchant，merchant 只有 1 个项目 | 1. 打开 `/{m}/dashboard?utm_campaign=spring` | Network 中**没有** `salescards/info` 请求；不弹 modal<br>`[分支差异]` 分支用完整项目列表（不是 preload 列表）判断 “项目数 > 1”（`apps/web-games/src/pages/Dashboard/index.tsx:89`）。 | P1 | OBS-DASH-005；`Dashboard.tsx:97-102` | `Dashboard.test.tsx` “does not request cards with a single merchant and a single project” |
| RT-DASH-019 | UTM：单卡片弹窗 | A-OWNER，≥2 个项目；后端为 `spring` 配置 1 张 sales card | 1. 打开 `/{m}/dashboard?utm_campaign=spring` | 发 `GET .../salescards/info?utm_campaign=spring`；modal 显示卡片标题和图片；modal 挂载时发 `PUT .../handle_all_utms`（只一次） | P1 | OBS-DASH-005；`Dashboard.tsx:104-114`；`UpsellModal/index.tsx:49-51` | `Dashboard.test.tsx` “requests the cards of the first campaign and shows the single card”；`UpsellModal/index.test.tsx` “handles the UTM campaigns once on mount” |
| RT-DASH-020 | UTM：多卡片 / 无卡片 / 失败 | 同上，分别配置 2 张卡、0 张卡；再 Block `salescards/info` | 1. 分别打开带 `utm_campaign` 的 Dashboard | 2 张卡：标题 “One step away from integration”，无图片；0 张卡或请求失败：不弹 modal，页面正常 | P2 | OBS-DASH-005；`Dashboard.tsx:107-116` | `Dashboard.test.tsx` “shows the generic stub title…”、“shows no modal…”、“swallows a failed card request…” |
| RT-DASH-021 | UTM：多个 campaign | A-OWNER，≥2 个项目 | 1. 打开 `?utm_campaign=a,,b` | `info` 请求只带 `a`；空项被丢弃；之后 assign 请求 body 中 `utmCampaigns = ["a","b"]` | P2 | OBS-DASH-005；`Dashboard.tsx:50-53,104` | `Dashboard.test.tsx` “drops empty campaign entries from the query” |
| RT-DASH-022 | UTM：非 owner/developer 角色 | 有 dashboard 访问、角色不是 `ROLE_OWNER` 或 `ROLE_DEVELOPER`（例如 `ROLE_OWNER_PARTIAL` 或财务角色，待确认 stage 账号）；≥2 项目或 ≥2 merchant | 1. 打开带 utm 的 Dashboard | modal 显示 access-denied 文案和 Dismiss 按钮，不列项目；点 Dismiss 关闭 | P1 | OBS-DASH-005 第 2 步；`UpsellModal/index.tsx:47,147-158` | `UpsellModal/index.test.tsx` “closes from the dismiss button of the access-denied stub” |
| RT-DASH-023 | UTM：项目搜索与排序 | A-OWNER，merchant 有 8 个以上项目，含已禁用项目 | 1. 打开 modal<br>2. 输入部分项目名（大小写混合、前后空格） | ≤7 个项目时无搜索框，≥8 个时有；过滤不区分大小写、忽略首尾空格、匹配子串；无匹配时显示空状态；**禁用项目排在前面**（从 publisher-client 移植，产品是否期望：待确认） | P2 | OBS-DASH-005；`UpsellModal/index.tsx:24,53-69,115-145` | `UpsellModal/index.test.tsx` |
| RT-DASH-024 | UTM：选项目后的跳转 `[S-20，原 N-01]`（预期失败项） | A-OWNER，≥2 个项目；sales card 有 integration guide，active step URL 在 `developers.xsolla.com`；应用部署在 `/for/web-games/account` 下（stage 即是；所有 `/for/{site}/account` 部署都受影响，不只 stage） | 1. 在 modal 中点一个项目 | 请求顺序：`POST .../salescards/assign_to_user`（body `{utmCampaigns, projectId}`）→ `GET .../salescards/{cardId}` → `window.location.replace`。<br>**期望（AC-13）**：落到 `/for/web-games/account/{m}/frame/documentation?upsell-card-id=..&upsell-step-id=..`，并渲染 IntegrationFrame。<br>**预期失败项**：当前代码跳 `/{m}/frame/documentation?...`，不带 basename，离开应用。stage 实测：缺 basename 的地址由 BFF（Express）直接返回 404 “Cannot GET /{m}/…”（§10.3，U-12 已关闭）。其他站内目标也不带 basename：无卡片或无 guide → `/{m}`；step 无 URL → `/{m}/dashboard?upsell-card-id=..`；相对 step URL。绝对 step URL 不受影响。只影响成功路径：assign 失败时不跳转（RT-DASH-025）。 | P1 | OBS-DASH-005 第 4 步；AC-13；S-20；U-12、§10.3；`utils/upsell.ts:19-45`；`UpsellModal/index.tsx:71-92` [P3] [P5] | `UpsellModal/index.test.tsx` 固定了当前行为（断言 `replace('/42')`），修复时需要同步改断言 |
| RT-DASH-025 | UTM：assign 失败 | 同上；Block `assign_to_user` | 1. 点项目 | modal 关闭，不跳转，Dashboard 保持 | P2 | OBS-DASH-005；`UpsellModal/index.tsx:89-91` | `UpsellModal/index.test.tsx` “closes without redirecting when assigning the card fails” |
| RT-DASH-026 | UTM：关闭方式 | 同 RT-DASH-019 | 1. 点遮罩<br>2. 重开后点 × <br>3. 重开后点 modal 内部空白 | 1、2 关闭 modal；3 不关闭 | P2 | OBS-DASH-005；`UpsellModal/index.tsx:95-104` | `UpsellModal/index.test.tsx` |
| RT-DASH-027 | UTM：无 dashboard 权限的用户 | A-EMPTY（④ 组合），属于 ≥2 个 merchant | 1. 打开带 utm 的 Dashboard | 仍发 `salescards/info` 请求，但**不弹** modal（modal 只在有权限分支渲染） | P2 | OBS-DASH-005；S-26；`Dashboard.tsx:97-121,159-165,179-186` [P3] | — |
| RT-DASH-028 | S-08 utm_campaign 未编码（定向） | A-OWNER，≥2 项目 | 1. 打开 `/{m}/dashboard?utm_campaign=spring%26x%3D1`<br>2. 打开 `/{m}/dashboard?utm_campaign=a%23b`<br>3. 在 Network 中看 `salescards/info` 的 Request URL | **当前预期**：1 的请求 URL 是 `...info?utm_campaign=spring&x=1`（后端收到 `spring`）；2 的请求 URL 在 `#` 处截断，后端收到 `a`。<br>**修复后预期**：请求 URL 分别为 `...utm_campaign=spring%26x%3D1` 和 `...utm_campaign=a%23b`，后端收到原值<br>`[分支差异]` 分支已对 `utm_campaign` 做 `encodeURIComponent`（`apps/web-games/src/core/api/upsell.ts:34-37`），在分支上应得到“修复后预期”。 | P2 | S-08；`apis/upsell.ts:33-36`；`Dashboard.tsx:51` | `apis/upsell.test.ts` 只测普通值和空值 |
| RT-DASH-029 | `ROLE_DEVELOPER_PARTIAL` 直接打开 Dashboard `[S-31]`（定向） | A-DEV-P：`ROLE_DEVELOPER_PARTIAL`，持有 `get_graphics_gross_revenue`，merchant 有项目 | 1. 打开 `/{m}`<br>2. 直接打开 `/{m}/dashboard`<br>3. 观察 merchant sidebar（若显示） | **当前预期**：1 → `/{m}/projects`（同 RT-HOME-006）；2 → Dashboard 正常渲染，不跳 `/forbidden`，因为 Dashboard 的隐藏集合只有两个 junior developer 角色；3：sidebar 显示 “Dashboard” 入口（与页面共用同一规则）。<br>**修复后预期**：首页分流与 Dashboard 访问规则一致。是送去 `/projects` 还是放行 Dashboard，需产品确认 | P2 | OBS-HOME-001/002；S-31；`DynamicHome/index.tsx:54-56`；`dashboardAccess.ts:14-15`；`roles.ts:67-70` | — |
| RT-DASH-030 | upsell 链接拼接 `[S-30]`（定向） | A-OWNER，≥2 个项目；能配置 sales card 的 integration guide：(a) active step URL = `https://help.xsolla.com/x?a=1`；(b) active step URL 只是含有子串 `developers.xsolla.com`，例如 `https://developers.xsolla.com.example.org/x` | 1. 分别用 (a)、(b) 的卡，在 modal 中点项目 | **当前预期**：(a) 跳 `https://help.xsolla.com/x?a=1?upsell-card-id=..`，出现两个 `?`，`upsell-card-id` 成为参数 `a` 的值的一部分；(b) 被当作开发者文档，跳 `/{m}/frame/documentation?...`（也不带 basename，见 RT-DASH-024），能否渲染由 IntegrationFrame 的域名校验决定（S-03）。<br>**修复后预期**：(a) 用 `&` 追加参数；(b) 按主机名精确匹配，不走内嵌页 | P2 | OBS-DASH-005 第 4 步；S-30；`utils/upsell.ts:24-29` | — |

---

## 3. SET：设置

**覆盖的 OBS**：OBS-SET-001、OBS-SET-002；AC-04；U-07（administration 部分）。

**涉及的 API**：本地代码不直接调用。页面来自 SDK `platform-pages@3.25.2`（`SettingsPage`、`ApiKeyPage`、`AdministrationPage`、`MembersPage`、`AccessLogsPage`），请求由 SDK 发出（U-03）。

| 路由 | gate | 布局 |
|---|---|---|
| `/{m}/settings/company` | 禁 `ROLE_VIEWER` | `SettingsLayout`；非 PA 迁移用户强制显示 `PAInfoBanner` |
| `/{m}/settings/api_key` | `merchant_get_api_key`，禁 viewer | `SettingsLayout` |
| `/{m}/settings/administration` | 无 route gate；SDK 页面对非 admin `Redirect` 到 `/{m}/settings/company` | `SettingsLayout` |
| `/{m}/settings/members`、`/settings/users`（非 exact） | `get_merchant_users` | shell 默认布局 |
| `/{m}/settings/user-activity` | `merchant_get_access_logs` | shell 默认布局 |

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-SET-001 | Company settings 布局 | A-OWNER（未从 PA 迁移） | 1. 打开 `/{m}/settings/company` | 显示 settings 侧边栏（顶部为 merchant 名）和 “Back to account” 按钮；shell sidebar 隐藏；**promo banner 不显示**；内容区顶部有强制 `PAInfoBanner`<br>`[分支差异]` 分支的 SettingsLayout 不再强制显示 `PAInfoBanner`；promo banner 组件已删除。 | P0 | OBS-SET-001；`layouts/settings/index.tsx:45-73`；`Root.tsx:195-210,253` | `layouts/settings/index.test.tsx` “forces the banner on company settings…” |
| RT-SET-002 | PA 迁移用户不重复横幅 | A-PA-MIGRATED（`useIsMigratedFromPA` 为真） | 1. 打开 `/settings/company` | 不显示 host 强制的 `PAInfoBanner`；只显示 SDK 页面自己的 gated 横幅（一条）<br>`[分支差异]` 分支只剩 SDK 页面自己的 gated 横幅，非迁移用户看不到横幅。 | P2 | OBS-SET-001；`layouts/settings/index.tsx:45-46` | `layouts/settings/index.test.tsx` “hides the banner … for a user migrated from PA” |
| RT-SET-003 | Back to account | A-OWNER，在任一 settings 布局页 | 1. 点 “Back to account” | 跳 `/{m}`，再按 HOME 分流 | P1 | OBS-SET-001；`layouts/settings/index.tsx:34-38` | `layouts/settings/index.test.tsx` “navigates to the merchant home…” |
| RT-SET-004 | viewer 被拒 | A-VIEWER | 1. 打开 `/{m}/settings/company`<br>2. 打开 `/{m}/settings/api_key` | 都跳 `/forbidden`；Network 中该页面的 SDK 请求一条都没有发出<br>`[分支差异]` 分支的 company 与 api-key 规则不再禁止 viewer（`apps/web-games/src/routes/inside/settings.ts:35-74`；`packages/@platform-templates/layout-access/src/platform-access.ts:101-104`），viewer 不会被送到 `/forbidden`，AC-04 / I15 在分支上不成立。需确认是否为有意变更。 | P0 | OBS-SET-001；AC-04（I15） | `__integration__` I15；`routes/inside/settings.test.ts` “blocks viewers on company and api key…” |
| RT-SET-005 | API key 权限 | A-OWNER（有 `merchant_get_api_key`）；A-NOKEY（非 viewer，无该权限） | 1. 两个账号分别打开 `/settings/api_key`，并观察 settings 侧边栏 | A-OWNER 看到页面，侧边栏有 “API keys”；A-NOKEY 跳 `/forbidden`，侧边栏无该入口<br>`[分支差异]` 分支路径改为 `/settings/api-key`，旧路径 `/settings/api_key` 重定向到新路径；规则只看 `merchant_get_api_key`。 | P1 | OBS-SET-001；`settings.ts:55-57`；`nav-items-config.tsx:19-26` | `SettingsSidebar.test.tsx`；`settings.test.ts` |
| RT-SET-006 | Administration（U-07 已关闭部分） | A-ADMIN（`user.admin = true`）；A-OWNER（非 admin） | 1. 两个账号分别打开 `/{m}/settings/administration` | A-ADMIN：页面加载组织信息，侧边栏有 “Administration”。A-OWNER：被 SDK 重定向到 `/{m}/settings/company`，侧边栏无该入口；Network 中没有 administration 的数据请求（SDK 跳过数据加载）<br>`[分支差异]` 分支在路由层要求 `user.isAdmin`（`platform-access.ts:104`），非 admin 被路由 gate 拒绝，而不是由 SDK 页面重定向到 company。 | P1 | OBS-SET-001；U-07；`platform-pages@3.25.2 dist/index.mjs:2690-2697,2822-2823`；`pp:Administration.tsx:114,272-275` [P3] | `SettingsSidebar.test.tsx` “shows the administration entry to an admin user…” |
| RT-SET-007 | viewer 访问 administration | A-VIEWER（非 admin） | 1. 打开 `/{m}/settings/administration` | 先被 SDK 重定向到 `/settings/company`，再被 route gate 送到 `/forbidden`<br>`[分支差异]` 分支中被 administration 的路由 gate 直接拒绝。 | P2 | OBS-SET-001；U-07 | — |
| RT-SET-008 | Members / Users / Activity | A-OWNER（有 `get_merchant_users`、`merchant_get_access_logs`）；A-NOUSERS（无这两个权限） | 1. 打开 `/settings/members`、`/settings/users`、`/settings/user-activity` | A-OWNER：三页可见，**保留 shell sidebar**（不用 settings 布局）；A-NOUSERS：都跳 `/forbidden` | P1 | OBS-SET-002；`settings.ts:37-52` | `routes/inside/settings.test.ts` |
| RT-SET-009 | Members 的嵌套 URL | A-OWNER | 1. 打开 `/settings/members/anything` | 仍渲染 Members 页面，不是 not-found | P2 | OBS-SET-002；`settings.ts:37-47` | `settings.test.ts` “resolves nested urls under members and users to the members page” |
| RT-SET-010 | user-activity 只匹配精确路径 | A-OWNER | 1. 打开 `/settings/user-activity/x` | 落到 not-found（`/not-found`） | P2 | OBS-SET-002；`settings.ts:48-52` | `settings.test.ts` “only resolves the exact url” |
| RT-SET-011 | `/profile` 的 chrome | A-OWNER | 1. 从 topbar 头像菜单进入 Profile | URL `/{m}/profile`；shell sidebar 隐藏（`/profile` 在 `settingsLayoutPaths` 中），但**不**使用 settings 侧边栏，也**没有** “Back to account” 按钮（`/profile` 不在 `SettingsLayout` 中渲染）；promo banner 仍显示（未关闭时） | P2 | OBS-SET-001；`Root.tsx:195-200`；`routes.tsx:141-148` [P3] | — |
| RT-SET-012 | 裸 `/settings` | A-OWNER | 1. 打开 `/{m}/settings` | 落到 `/not-found`；不会重定向到 `/settings/company` | P2 | OBS-SET-002；`routes/inside/settings.ts:36-61` | — |

---

## 4. UI：横幅与聊天

**覆盖的 OBS**：OBS-UI-001、OBS-UI-002、OBS-UI-003；S-24。

**涉及的 API**：本地无 HTTP 调用。外部脚本 `{livechatWidgetUrl}/livechat-iframe.js`（`config.ts:84`，可被 `LIVECHAT_WIDGET_URL` 覆盖）。Ask AI 只做路由跳转到 `communication_platform` remote。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-UI-001 | Promo banner 默认显示 | A-OWNER；删除 localStorage `wg-pa-promo-banner-dismissed` | 1. 打开 Dashboard | topbar 上方显示 “Can't find something in Business Accounts?” 横幅；`#app-root` 的 CSS 变量 `--app-notice-banner-height` 等于横幅高度，topbar 和 sidebar 下移<br>`[分支差异]` 分支已删除 `PublisherAccountPromoBanner`，RT-UI-001…005 在分支上不适用。 | P1 | OBS-UI-001；`PublisherAccountPromoBanner/index.tsx:57-95` | `PublisherAccountPromoBanner/index.test.tsx` |
| RT-UI-002 | 横幅按钮 | 同上 | 1. 点横幅的 action 按钮 | 新标签页打开 `https://publisher-client.srv.local`（stage）；原页面不变 | P2 | OBS-UI-001；`PublisherAccountPromoBanner/index.tsx:16-20,110-112` | — |
| RT-UI-003 | 关闭并持久化 | 同上 | 1. 点横幅的 ×<br>2. 刷新页面 | 横幅消失；localStorage `wg-pa-promo-banner-dismissed = "1"`；`--app-notice-banner-height = 0px`，布局上移；刷新后仍不显示 | P1 | OBS-UI-001；`PublisherAccountPromoBanner/index.tsx:101-108` | `PublisherAccountPromoBanner/index.test.tsx` “hides the banner, persists the dismissal…” |
| RT-UI-004 | 非 “1” 的存储值 | 手工把 key 设为 `true` | 1. 刷新 | 横幅仍显示 | P2 | OBS-UI-001；`PublisherAccountPromoBanner/index.tsx:31` | `PublisherAccountPromoBanner/index.test.tsx` “stays visible when the stored value is not exactly "1"” |
| RT-UI-005 | 不显示横幅的页面 | 横幅未关闭 | 1. 依次打开 `/settings/company`、Choose UI（无 selection 的 `/get-started`）、`/select-project`、site-builder editor（`/site-builder/{id}/editor`） | 这 4 个页面都不显示横幅；回到 Dashboard 后再次显示 | P1 | OBS-UI-001；`Root.tsx:202-236,253` | — |
| RT-UI-006 | Ask AI 输入校验 | A-OWNER-NEW（Dashboard 显示 Ask AI） | 1. 不输入，看发送按钮<br>2. 只输入空格<br>3. 输入文字<br>4. 按 Shift+Enter<br>5. 按 Enter | 1、2 发送按钮禁用，按 Enter 无反应；3 按钮可用；4 插入换行，不发送；5 发送<br>`[分支差异]` 分支输入框是单行 `<input>`，在 onKeyUp 上按 Enter 发送，无法 Shift+Enter 换行（`packages/@platform-templates/components/src/AskAiBanner/index.tsx:144-154`）。 | P1 | OBS-UI-002；`AskAiBanner/index.tsx:79,106-112` | `AskAiBanner/index.test.tsx` |
| RT-UI-007 | Ask AI 发送 | 同上 | 1. 输入 `  How do payouts work?  ` 后按 Enter | URL 变为 `/{m}/communication-hub`；sessionStorage `aiAssistantQuestion` = `{"type":"custom","enText":"How do payouts work?"}`（**是 JSON，不是原文**）；router state `aiQuestion` 为去掉首尾空格的文字；Communication Hub 是否自动带入问题由 remote 决定（待确认）<br>`[分支差异]` 分支 push 的 state 多了 `returnTo`（`apps/web-games/src/components/Dashboard/AskAi/index.tsx:93-96`）。 | P1 | OBS-UI-002；`AskAiBanner/index.tsx:45-69` | `AskAiBanner/index.test.tsx` “sends the trimmed question to the chat…” |
| RT-UI-008 | 快捷 chip 与语言 | 同上；界面语言切到 zh | 1. 点 “Pricing” 对应的 chip | 跳 Communication Hub；router state `aiQuestion` 为中文问题（“艾克索拉各产品如何收费？”）；sessionStorage 中 `type = "sample"`，`enText = "What does each Xsolla product cost?"`<br>`[分支差异]` 分支有 4 个 chip（Pricing / Pay Station / Partner / Legal），且 `app.web-games.ask-ai.*` key 已从 locale 文件删除，只靠 defaultMessage，zh 下也显示英文。 | P1 | OBS-UI-002；`AskAiBanner/index.tsx:29-32,71-77` | `AskAiBanner/index.test.tsx` “shows the localised question in the chat but reports the English question” |
| RT-UI-009 | IME 组字中按 Enter | 用中文或日文输入法 | 1. 组字未上屏时按 Enter | 不发送，只确认组字<br>`[分支差异]` 分支不检查 IME 组字，组字中按 Enter 会发送。 | P2 | OBS-UI-002；`AskAiBanner/index.tsx:108` | `AskAiBanner/index.test.tsx` “does not send on Enter while an IME composition is active” |
| RT-UI-010 | LiveChat 注入一次 | A-OWNER，在有 shell sidebar 的页面 | 1. 打开 Dashboard<br>2. Console 执行 `document.querySelectorAll('script[data-id="xsolla-chat-script"]').length` 和 `document.querySelectorAll('#livechat').length`<br>3. 查看 `window.LiveChatWidget` | 1 个 script（src 以 `/livechat-iframe.js` 结尾），1 个 `#livechat`；`LiveChatWidget.type = "bap"`，`visitor` 含 name、email、`jwt`（当前 token）、userId、merchantId、`account = "web-games"`；`customFields.role` 为 merchant 角色；sidebar 中出现 Chat 启动器 | P1 | OBS-UI-003；`LiveChat/LiveChat.tsx:78-183` | `LiveChat/LiveChat.test.tsx` |
| RT-UI-011 | LiveChat 脚本失败 | A-OWNER | 1. Block `livechat-iframe.js`<br>2. 刷新 | sidebar 展开态显示禁用的 “Chat” 按钮；折叠态的 Chat 按钮也禁用；页面其余部分正常 | P1 | OBS-UI-003；`LiveChat/LiveChat.tsx:167-178,185-223` | `LiveChat/LiveChat.test.tsx` “shows a disabled fallback launcher…” |
| RT-UI-012 | 跨页面不重复挂载 | A-OWNER | 1. Dashboard → Communication Hub（sidebar 隐藏）→ 返回 Dashboard，重复 3 次<br>2. 折叠再展开 sidebar<br>3. 执行 RT-UI-010 第 2 步 | 始终只有 1 个 script 和 1 个 `#livechat`；Chat 启动器只有一个 | P2 | OBS-UI-003；`LiveChat/LiveChat.tsx:17-67,127-156` | `LiveChat/LiveChat.test.tsx` “keeps only the newest widget root…” |
| RT-UI-013 | 切换语言后聊天语言 `[S-24，原 N-03]` | A-OWNER，当前 en | 1. 通过 topbar 切到 de<br>2. 查看 `window.LiveChatWidget.language` 和聊天窗口语言<br>3. 进入隐藏 shell sidebar 的页面（如 Communication Hub），再返回 Dashboard，再看<br>4. 切回 en，重复 1–2 后刷新，再看 | **当前预期**：2：仍是 `en`。同一 slot 一直存在时，effect 在 `:86` 提前返回，不重新配置。3：slot 重挂载后变为 `de`。4：刷新后为 `de`。<br>**修复后预期**：切换后不需要重挂载或刷新即为 `de`（是否需要修复：待产品确认） | P2 | OBS-UI-003、OBS-I18N-002；S-24；`LiveChat/LiveChat.tsx:86-88,102,183`；`platform-store@1.15.6 dist/index.mjs:4103-4135` [P3] | — |
| RT-UI-014 | LiveChat 等待应用加载 | A-OWNER；Slow 3G | 1. 硬刷新 Dashboard，加载期间检查 script | 应用加载中（user/merchant/privileges/project details/features 任一在加载）不注入 script | P2 | OBS-UI-003；`Root.tsx:63-68,252` | — |
| RT-UI-015 | token 刷新后 LiveChat 的 JWT `[S-24]` | A-OWNER，在有 shell sidebar 的页面停留到 SDK 刷新 token（触发方式待确认：等待 token 临近过期时的自动刷新） | 1. 记下 `window.LiveChatWidget.visitor.jwt`<br>2. Network 中出现 token 刷新后，再读一次，并在 Redux DevTools 中看当前 token（stage 已开启 DevTools，见 S-15）<br>3. 进入 Communication Hub 再返回，或刷新，再读一次 | **当前预期**：2：仍是旧 token，与 store 中的新 token 不同（同一 slot 存续期间不响应 token 变化）。3：变为新 token。<br>**修复后预期**：2 即为新 token。另注意：`visitor.jwt` 是原始 JWT，页面上任何脚本都能读取 | P2 | OBS-UI-003；S-24；`LiveChat/LiveChat.tsx:86,100-125,183` | — |

---

## 5. I18N：国际化

**覆盖的 OBS**：OBS-I18N-001、OBS-I18N-002；S-25、S-36（P5）。

**涉及的 API**：`POST /api/account/platform/{m}/users/location`，body `{locale}`（gateway，SDK `platform-apis@2.29.2 dist/index.mjs:1614-1617`）。

### 5.1 SDK 中查实的切换逻辑（关闭 OBS-I18N-002 的 [U]）

`src/core/providers/LocaleProvider.tsx` 是死代码（基线没有 import 方）。实际使用的是 `PlatformShell` 内部的 `LocaleProvider`（`platform-shell@2.22.3 dist/index.mjs:1697`，来自 `platform-store@1.15.6 dist/index.mjs:4103-4135`），host 只传入 `getTranslationsData`。

| 环节 | 行为 | 证据 |
|---|---|---|
| 支持的 locale | `en ru de ko ja zh es fr pt`，默认 `en` | `platform-apis@2.29.2 dist/index.mjs:3324-3328` |
| 启动时初值 | `detectLocale()`：URL `?locale=` > cookie `pa-locale` > localStorage `i18nextLng` > 浏览器语言 > `en`；`pt-BR` 归一为 `pt`，不支持的值归一为 `en`。`LocaleProvider` 挂载在 `AuthOrchestrator` 外层，挂载时 user 尚未加载 | `platform-apis dist/index.mjs:3371-3405`；`platform-store dist/index.mjs:2701` |
| user 加载或 `user.locale` 变化 | URL 中**没有** `locale` 参数且 `user.locale` 受支持 → 直接用 `user.locale`（覆盖 cookie）；否则按 `detectLocale(user.locale)` 的优先级。`[P5]` SDK 把缺失的 `user.locale` 补为 `'en'`，所以用户数据加载后，profile 或 `'en'` 会覆盖 URL、cookie 和 localStorage（spec 0.3.2，S-36） | `platform-store dist/index.mjs:4107-4118`；`pa:apis/merchant.ts:216` |
| 写入 | 每次确定 locale 都写 cookie `pa-locale`（365 天，path `/`，SameSite=Lax）和 localStorage `i18nextLng` | `platform-apis dist/index.mjs:3418-3431` |
| URL 参数 | 挂载后用 `history.replaceState` 删除 `?locale=` | `platform-store dist/index.mjs:4120-4130` |
| Topbar 切换 | 先 `setLocaleAction`（界面立即切换），只在有 `merchantId` 时再 `POST users/location`；失败只 `console.error('Failed to persist locale to profile:')`（S-25） | `platform-components@4.20.3 dist/index.mjs:1162-1181` |
| Profile 页切换 | 先 `POST users/location`，成功后才切换；失败弹 toast（`platform-shared.form.failed-message`），语言不变 | `platform-pages@3.25.2 dist/index.mjs:3240-3256` |
| 重渲染 | `IntlProvider` **没有** `key`，切换时不重建子树，只换 messages | `platform-store dist/index.mjs:4131-4135` |
| 文案合并 | SDK en → SDK 本地化（非空）→ host en → host 本地化（非空） | `src/locales/index.ts:81-86` |
| 缺 key | `formatMessage` 的组件显示 key id（react-intl 2.9）；直接读 `intl.messages[...]` 的组件（AskAiBanner、DashboardBalance、UpsellModal）显示空白。stage 上无法人为制造缺 key，只作说明 | `AskAiBanner/index.tsx:90-103`；`DashboardBalance/index.tsx:46` |

host 文案现状（`src/locales/*.json`）：en 151 个 key；8 个语言都没有缺 key；唯一的空值是 `host.layouts.analytics.antiFraud.tab.blocklist`，8 个语言都为空，会回退到英文 “Blocklist”。

### 5.2 用例

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-I18N-001 | Topbar 切换语言 | A-OWNER，当前 en | 1. 点 topbar 语言按钮<br>2. 选 “日本語” | 下拉有 9 项（Deutsch、English、Español、Français、日本語、한국어、Português、Русский、中文 (简体)）；界面立即变为日文，**不刷新页面**；cookie `pa-locale=ja`；localStorage `i18nextLng=ja`；Network 有 `POST .../users/location`，body `{"locale":"ja"}` | P1 | OBS-I18N-002；`platform-components dist/index.mjs:1162-1205` | — |
| RT-I18N-002 | 刷新后保持 | 接 RT-I18N-001 | 1. 硬刷新 | **当前预期（预期失败项，S-39）**：界面回到切换前的语言。stage 实测（2026-10-21，`c1b5e37`，admin 账号）：切到 de、fr 时 `POST …/users/location` 都返回 200，但刷新后 `get_init_info` 返回的 `user.locale` 仍是 `en`，页面回到英语。**修复后预期**：仍是日文（`user.locale = ja`） | P1 | OBS-I18N-002；S-39；U-16；`platform-store dist/index.mjs:4113-4116`；stage-results §5 C1 [P8] | — |
| RT-I18N-003 | 持久化失败 `[S-25，原 N-04]` | A-OWNER，当前 en，在 merchant 页面（有 `merchantId`） | 1. Block `.../users/location`<br>2. topbar 切到 de<br>3. 取消 Block，硬刷新 | 2：界面变为德文，console 出现 `Failed to persist locale to profile:`，无 toast。3：**当前预期**界面回到 en（加载后 profile 的 `user.locale = en` 覆盖 cookie `de`）。**修复后预期**：失败时提示用户，或回滚界面语言。<br>注：没有 `merchantId` 时 SDK 不发 `POST users/location`，刷新后同样回退；stage 上难以在有 topbar 的页面构造无 merchant 的状态，所以不单列用例 | P2 | OBS-I18N-002；S-25；`pc:LanguageSwitcher.tsx:28-43`；`platform-components dist/index.mjs:1171-1177` [P3] | — |
| RT-I18N-004 | Profile 页切换 | A-OWNER | 1. Profile 页改语言为 fr 并保存<br>2. 重复一次，保存前 Block `users/location` | 1：保存成功后界面变为法文。2：弹失败 toast，语言不变 | P2 | OBS-I18N-002；`platform-pages dist/index.mjs:3240-3256` | — |
| RT-I18N-005 | `?locale=` 参数（S-36） | A-OWNER，`user.locale = en`，cookie `pa-locale=en` | 1. 硬刷新打开 `/{m}/dashboard?locale=fr`<br>2. 观察首屏、用户数据加载后的语言，以及地址栏和 cookie<br>3. 若有 profile 没有 `locale` 的账号，重复 1–2<br>4. 若有 `user.locale` 为不受支持值（如 `it`）的账号，重复 1–2 | 地址栏中的 `locale` 参数在挂载后立即被 `replaceState` 移除。<br>**预期（spec 0.3.2 OBS-I18N-002）**：`?locale=` 只在用户数据加载前生效。首屏可能先显示 fr，cookie 被写成 fr；用户数据到达时 URL 中已没有 `locale`，profile 的 `en` 生效，最终为 en，cookie 回写为 en。<br>3：SDK 把缺失的 profile locale 补为 `'en'`，所以最终同样为 en，不保留 fr（原预期“最终为 fr”作废）。<br>4：**按代码推断 [I]**：不受支持的值不会被直接采用，`initializeLocale` 按 cookie 回退，此时 cookie 为 fr，最终可能为 fr。记录实际结果<br>S-36：SDK 注释说 `?locale=` 优先于 profile，行为与注释不符（owner：accounts-sdk）。**修复后**取决于 accounts-sdk 的决定：改为 URL 优先时，1 的最终语言应为 fr；只改注释时，预期不变 | P2 | OBS-I18N-002、S-36；`ps:providers/LocaleProvider.tsx:33-67`；`pa:apis/merchant.ts:216`；`platform-store dist/index.mjs:4107-4130` [P3] [P5] | — |
| RT-I18N-006 | 空译文回退英文 | A-OWNER，切到 de | 1. 打开 `/{m}/analytics/anti-fraud` | Blocklist 标签显示英文 “Blocklist”，其他标签为德文 | P1 | OBS-I18N-001；`src/locales/de.json`；`layouts/advanced-analytics/index.tsx:143` | `src/locales/index.test.ts` “falls back to a blank localized value from the English counterpart” |
| RT-I18N-007 | host 文案逐语言抽查 | A-OWNER | 1. 依次切到 9 种语言<br>2. 每种语言看 Choose UI、Games Portal 引导、Ask AI 横幅、promo banner、Dashboard “Performance / Balance” | 各处为对应语言；没有显示 key id（形如 `host.pages.…`、`app.…`）；没有空白标签<br>`[分支差异]` 分支 key 前缀改为 `web-games.*`；Ask AI 文案在非英文界面显示英文（见 RT-UI-008）。 | P1 | OBS-I18N-001；`src/locales/index.ts:81-86` | `src/locales/index.test.ts` |
| RT-I18N-008 | 日期本地化 | A-OWNER，balance 有 payout 日期 | 1. 切到 ja、de | Last/Next payout 按 locale 显示（例如 ja 为 “2026年10月21日” 形式，de 为 “21. Okt. 2026” 形式） | P2 | OBS-I18N-001；`DashboardBalance/index.tsx:29-33` | — |
| RT-I18N-009 | 切换语言后 `<html lang>` 不更新（S-40） | A-OWNER，当前 en | 1. topbar 切到 de<br>2. 在 Console 执行 `document.documentElement.lang`<br>3. 切回 en | **当前预期（预期失败项，S-40）**：第 2 步返回 `en`。stage 实测（2026-10-21）：切到 de、fr 后都是 `en`。**修复后预期**：返回 `de`，与界面语言一致（影响屏幕阅读器和浏览器翻译提示） | P2 | OBS-I18N-002；S-40；stage-results §5 C1 [P8] | — |

数字格式问题见 RT-DASH-017。

---

## 6. ANA：埋点

**覆盖的 OBS**：OBS-ANA-001、OBS-ANA-002；S-10。

**涉及的 API**：Metrika collector（stage：`https://xmts-global-api.nl-k8s-stage.srv.local`；production：`https://minimetrika.xsolla.com`）；Datadog RUM intake（SDK 内部）。

### 6.1 事件清单

| 事件名 | 计数器 | 触发时机 | ev | exv（额外参数） | 证据 |
|---|---|---|---|---|---|
| `acc_setup-switcher_click` | 900023 | Choose UI 点 Choose | `choose` | `selected_goal`: `Games Portal` / `Add Xsolla` + SDK 公共字段 | `LaunchProject/index.tsx:79-84`；`web-games-events.ts:55-58` |
| `acc_get-started_page_click` | 900023 | Switch setup | `switch setup` | `setup` | `GamesPortalSetup/index.tsx:31-34,94`；`AdditionalServicesSetup/index.tsx:31-35,77` |
| 同上 | 900023 | Games Portal step1 / step2 | `set up game` / `pay station` | `setup = Games Portal` | `GamesPortalSetup/index.tsx:100-105,145,160-162` |
| 同上 | 900023 | Additional Services step1 / Login / What's next 卡 | `pay station` / `xsolla login` / `what's next card` | `setup = Add Xsolla`；卡片另带 `card_title`: `Web Shop` / `Offerwall` / `Backpack` | `AdditionalServicesSetup/index.tsx:89-104,117-135,173,185` |
| `ss_dashboard_send-question_click` | 3002 | Ask AI 发送自定义问题 | `null` | `merchant_id`、`user_id`、`question` | `communication-hub.ts:26,157-159` |
| `ss_dashboard_prompt_click` | 3002 | Ask AI 点快捷 chip | `null` | `merchant_id`、`user_id`、`prompt`（英文原文） | `communication-hub.ts:24,154-155` |
| `acc_topbar_element_click` | 900023（SDK） | 打开语言下拉 / 选语言 | `languages` / `languages \| language` | 选语言时带 `language` | `platform-components dist/index.mjs:1157,1170,1184` |
| MCP 登录相关 `acc_auth_*`、`acc_signup_*` | 900023 | `/login/mcp` 流程（详细用例在 T5） | 成功事件的 ev 是 email | `auth_type` | `core/mcp/analytics.ts:62-91` |

`user_id`（3002 计数器）：email 以 `@xsolla.com` 结尾（不区分大小写，先去空格）时用 email，否则用数字 user id（`communication-hub.ts:48-56`）。

### 6.2 用例

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-ANA-001 | stage 使用 900023 | A-OWNER；能访问 stage 内网 | 1. 打开 Network，过滤 `xmts-global-api`<br>2. 登录后进入 Dashboard | 有发往 stage collector 的请求，计数器为 900023（参数名以实际请求为准）；Console 中**没有** `[xsollaAnalytics]` 日志（只有 development 才打） | P1 | OBS-ANA-001；`core/utils/analytics/index.ts:12-24`；`core@0.9.1 dist/index.mjs:5655-5690` | `core/utils/analytics/index.test.ts` |
| RT-ANA-002 | Choose 埋点 | A-OWNER，在 Choose UI | 1. 点 Games Portal 的 Choose；切回后再点 Additional Services 的 Choose | 各发 1 个 `acc_setup-switcher_click`，ev `choose`，`selected_goal` 分别为 `Games Portal`、`Add Xsolla` | P1 | OBS-ANA-001；`LaunchProject/index.tsx:79-84` | `LaunchProject/index.test.tsx` |
| RT-ANA-003 | Get Started 页面点击埋点 | A-OWNER（RT-HOME-015/018 的数据） | 1. 依次点 RT-HOME-014/015/018 中的每个按钮和卡片 | 每次点击 1 个 `acc_get-started_page_click`，ev 和 exv 与 6.1 表一致；禁用卡片点击不发事件 | P1 | `GamesPortalSetup/index.tsx`；`AdditionalServicesSetup/index.tsx` | `*Setup/index.test.tsx` |
| RT-ANA-004 | Ask AI 发送埋点 | A-OWNER-NEW（普通商户用户） | 1. 打开 Console<br>2. 在 Ask AI 中输入问题并发送 | Console 出现 `[communication-hub-analytics] elementClick ss_dashboard_send-question_click {en, ev: null, eid: "{m}", counter_id: "3002", exv: {merchant_id: "{m}", user_id: "<数字 id>", question: "<文字>"}}`；Network 有发往 stage collector 的请求 | P1 | OBS-ANA-001/002；`communication-hub.ts:103-148` | `communication-hub.test.ts` |
| RT-ANA-005 | Ask AI chip 埋点 | 同上，界面语言 zh | 1. 点 “Legal” 对应的 chip | 事件名 `ss_dashboard_prompt_click`，`exv.prompt = "What's Xsolla's legal model?"`（英文） | P1 | OBS-ANA-002；`AskAiBanner/index.tsx:71-77` | `AskAiBanner/index.test.tsx`；`communication-hub.test.ts` |
| RT-ANA-006 | Xsolla 员工的 user_id | A-XSOLLA：email 为 `@xsolla.com` 的账号 | 1. 执行 RT-ANA-004 | `exv.user_id` 为 email | P2 | OBS-ANA-002；`communication-hub.ts:51-53` | `communication-hub.test.ts` “uses the email for an Xsolla employee” |
| RT-ANA-007 | 3002 初始化失败后重试 | A-OWNER-NEW | 1. Block `xmts-global-api`<br>2. 发一次问题<br>3. 取消 Block，再发一次 | 2：console.error `[communication-hub-analytics] Metrika init failed`，跳转照常；3：重新初始化并发送 | P2 | `communication-hub.ts:72-101` | `communication-hub.test.ts` “retries init on the next click after a failed attempt” |
| RT-ANA-008 | 语言切换埋点 | A-OWNER | 1. 打开语言下拉，选 de | 打开时 1 个 `acc_topbar_element_click`（ev `languages`）；选择时 1 个（ev `languages \| language`，`language = de`） | P2 | `platform-components dist/index.mjs:1157-1186` | — |
| RT-ANA-009 | MCP 成功事件带 email（隐私确认） | 见 T5 的 MCP 登录账号 | 1. 完成一次 `/login/mcp` 登录，观察 collector 请求 | `acc_auth_user_success` 的 ev 是原始 email（当前行为）；是否允许上报 email 需隐私负责人确认 | P2 | OBS-ANA-002；`core/mcp/analytics.ts:62-71`；`core dist/index.mjs:5442-5447` | `core/mcp/analytics.test.ts` |
| RT-ANA-010 | S-10 `accountId = 'skeleton-test'`（定向） | A-OWNER | 1. Network 过滤 Datadog RUM 上报（`browser-intake` 前缀，域名以实际为准）<br>2. 查看 payload 的 `business_account_id` | **当前预期**：`business_account_id = "web-games"`（SDK 优先用 URL 中的 siteId，`skeleton-test` 只在 URL 无 `/for/{site}` 时兜底）；`skeleton-test` 只进入 `AccountsSdkProvider` 的 `orgId`，本地 SDK 中没有读取方，stage 上不可观察。若 stage 未配置 Datadog（`applicationId` 为空），没有 RUM 请求：待确认。<br>**修复后预期**（改为 `web-games`）：同上，`business_account_id` 仍为 `web-games`<br>`[分支差异]` 分支的 `accountId` = `process.env.DEFAULT_SITE_ID \|\| accountConfig.site_id`（`apps/web-games/src/core/platform/config.ts:49`），S-10 在分支已修复。 | P2 | S-10；`src/App.tsx:54-59`；`platform-shell@2.22.3 dist/index.mjs:1614-1629`；`core@0.9.1 dist/index.mjs:4070-4089` | — |

---

## 6A. 分支差异汇总（`WASP-2524-migrate-tests-to-apps`）

对照基线逐条核对 `apps/web-games/src`。关键结论已在磁盘上抽查（DynamicHome、upsell 编码、settings 规则、promo banner 删除）。

| 行为 | 结论 | 影响的用例 |
|---|---|---|
| 首页分流不再读 setup selection | 不同 | RT-HOME-001/002/010；AC-07 |
| Dashboard 访问规则、setup selection key、Choose UI、Choose 埋点 | 相同 | — |
| Get Started CTA 门控改由 V2 访问注册表决定（login 不再排除 viewer；player-platform/offerwall 只看角色；site-builder 规则变化；会计/支持角色禁用） | 不同 | RT-HOME-015/019/021/022 |
| Dashboard 页面决策（会计演示、`/forbidden`、header、权限组合、XAA） | 相同 | — |
| UTM：`utm_campaign` 已编码；“项目数 > 1” 改用完整列表；`location.replace` 仍不带 basename（S-20 仍在） | 部分不同 | RT-DASH-018/024/028 |
| Ask AI 换成模板组件（单行输入、4 个 chip、无 IME 检查、文案缺 key） | 不同 | RT-UI-006/007/008/009、RT-I18N-007 |
| Promo banner | 已删除 | RT-UI-001…005 |
| LiveChat | 相同 | — |
| i18n：四层合并相同；locale 同步改用 `useSyncLocaleWithProfile(user.locale)`（`apps/web-games/src/core/platform/AppLocaleProvider.tsx:8-21`），切换细节需在分支上重跑 RT-I18N-001…005 | 不同（细节待确认） | RT-I18N-001…005 |
| 设置：新路径 `/settings/api-key`；company/api-key 不再禁 viewer；administration 在路由层要求 admin；不再强制 PAInfoBanner | 不同 | RT-SET-001/002/004/005/006/007 |
| Analytics 计数器 900023 | 相同 | — |
| S-10 `accountId` | 分支已修复 | RT-ANA-010 |
| balance 请求仍无条件调用，新增 `staleTime: Infinity` | 部分不同 | RT-DASH-014 |

---

## 7. stage 执行所需账号与数据

e2e 的 persona 账号尚未在 stage 配置（U-09）。下表是本 track 需要的最小集合。

| 代号 | 角色 / 权限 | merchant 数据 | 用于 |
|---|---|---|---|
| A-OWNER | `ROLE_OWNER`，持有 gross revenue、两个 balance 权限、`project_settings`、4 个 storefront 权限、`merchant_get_api_key`、`get_merchant_users`、`merchant_get_access_logs`；非 admin；未从 PA 迁移 | ≥2 个项目（其中 1 个已禁用）、有余额和 payout 日期；可配置 ≥8 个项目用于搜索 | 大部分用例 |
| A-OWNER-NEW | 同 A-OWNER | balance 为 0 或无 `last_transfer_date` | Ask AI 用例 |
| A-OWNER-1P | `ROLE_OWNER` | 只属于 1 个 merchant，1 个项目 | RT-DASH-018 |
| A-MULTI | 同一用户属于 2 个 merchant，都满足 dashboard 访问 | — | RT-HOME-010、RT-DASH-004 |
| A-EMPTY | `ROLE_OWNER`，`project_create`，最多 1 个 balance 权限 | 0 个项目 | RT-HOME-004/016、RT-DASH-008 |
| A-EMPTY-BAL | 同 A-EMPTY，但持有两个 balance 权限 | 0 个项目 | RT-DASH-006 |
| A-REV-ONLY | 非 junior，有 gross revenue，缺至少 1 个 balance 权限 | 有项目（RT-DASH-014 需要 ≥2 个） | RT-DASH-007/014 |
| A-NOREV | 非 junior，缺 gross revenue | 有项目（RT-DASH-014 需要 ≥2 个） | RT-HOME-003、RT-DASH-010/011/014 |
| A-DEV / A-DEV-P | `ROLE_DEVELOPER` / `ROLE_DEVELOPER_PARTIAL`（A-DEV-P 需持有 gross revenue） | 有项目 | RT-HOME-006/007、RT-DASH-029 |
| A-JUNIOR / A-JUNIOR-P | `ROLE_JUNIOR_DEVELOPER` / `_PARTIAL` | 有项目 | RT-HOME-006、RT-DASH-010/011 |
| A-VIEWER | `ROLE_VIEWER`，非 admin | 有项目 | RT-HOME-019、RT-SET-004/007 |
| A-SUPPORT | `ROLE_SUPPORT` 或财务角色 | 有项目 | RT-HOME-022 |
| A-NOKEY / A-NOUSERS | 非 viewer，分别缺 `merchant_get_api_key` / 缺 members 与 access-log 权限 | — | RT-SET-005/008 |
| A-ADMIN | `user.admin = true` | — | RT-SET-006 |
| A-PA-MIGRATED | 从 PA 迁移的用户 | — | RT-SET-002 |
| A-GNATION | merchant integration type = `gnation` | 有项目 | RT-HOME-021 |
| A-ACC-ID / A-ACC-MAIL | `user.id = 474648`；email 在会计名单中但 id 不同 | — | RT-DASH-012/013（是否存在于 stage：待确认） |
| A-XSOLLA | email 以 `@xsolla.com` 结尾 | — | RT-ANA-006 |

后端数据：sales card（`utm_campaign` 分别对应 0 / 1 / 2 张卡，至少 1 张卡带 integration guide，active step URL 在 `developers.xsolla.com`；RT-DASH-030 另需两张卡，step URL 分别为带 query 的非 developers 地址和只含 `developers.xsolla.com` 子串的地址）。环境：能访问 `*.srv.local`（stage collector、publisher-client）。

---

## 8. U 项处理结果

| U 项 | 结果 | 依据 |
|---|---|---|
| OBS-I18N-002 [U]（locale 解析与切换） | **关闭**。行为见 5.1；`LocaleProvider` 来自 `platform-store`，由 `PlatformShell` 挂载 | `platform-shell@2.22.3 dist/index.mjs:1697`；`platform-store@1.15.6 dist/index.mjs:4103-4135` |
| U-07（`/settings/administration` 部分） | **关闭**。SDK 页面对非 admin 返回 `<Redirect to="/{m}/settings/company">`，且 `loadData` 在非 admin 时不发请求。是否需要 route 级 gate 仍是产品决定。`/ontology` 部分属于 T2 | `platform-pages@3.25.2 dist/index.mjs:2690-2708,2822-2823` |
| OBS-SET-001 中的 [U]（administration 重定向） | **关闭**，同 U-07 | 同上 |
| U-03（SDK 发起的 HTTP，T3 相关部分） | **部分关闭**：语言持久化 `POST /api/account/platform/{orgId}/users/location`。项目列表等请求仍未知，转为 RT-HOME-008 的 stage 观察 | `platform-apis@2.29.2 dist/index.mjs:1614-1617` |
| S-10（`skeleton-test`）的影响 | **部分关闭**：只流入 `sdkConfig.orgId`（本地 SDK 无读取方）和 Datadog 的兜底值；stage 实际影响转为 RT-ANA-010 | `platform-shell dist/index.mjs:1614-1629`；`core@0.9.1 dist/index.mjs:4596-4597` |
| OBS-ERR-001 / OBS-DASH-004 中 ErrorBoundary 降级 UI | **未关闭**，转为 RT-DASH-015 的 stage 观察 | — |
| U-09（persona 账号） | **未关闭**，本 track 的账号需求见第 7 节 | — |
| U-12（根级 `/{m}/…` 无 basename，P5） | **关闭**（spec 0.3.2）：BFF 只挂载 `/for/:site/*`，这类地址返回 404 | RT-DASH-024；spec §10.3 |

---

## 9. spec 勘误

以 spec 0.2.0 为准。v0.2.0 已修正的 OBS-DASH-001/002/004、OBS-I18N-002 不再列出。

P3 状态：spec 0.3.0 已合入 E-01…E-12 和 N-01…N-05。E-12、N-01、N-02、N-03 由 spec 作者按核实结果修正（PARTIAL），下表已同步修正。

| # | spec 位置 | spec 内容 | 代码事实 | 证据 |
|---|---|---|---|---|
| E-01 | OBS-UI-002 | sessionStorage `aiAssistantQuestion` 存的是问题 | 存的是 JSON `{type: 'custom'\|'sample', enText}`；chip 的 `enText` 是英文原文，不是界面显示的本地化文字 | `AskAiBanner/index.tsx:57-61,71-77` |
| E-02 | OBS-HOME-005 | 只列了 payments、storefront、login 三类门控 | 还有：Games Portal step1 需要 `player-platform` 在项目导航中；Web Shop 卡需要 `site-builder` 在导航中（gnation 被排除）；Offerwall 卡需要 `offerwall` 在导航中。“storefront” 只用于 Backpack 卡。Games Portal 的 What's next 卡片永远禁用 | `GamesPortalSetup/index.tsx:36-52,73,141-146`；`AdditionalServicesSetup/index.tsx:53-56,109-140` |
| E-03 | OBS-HOME-001 | “a project-only role” 未列成员 | `PROJECT_ONLY_ROLES` = 两个 junior developer 角色 + `ROLE_DEVELOPER_PARTIAL` | `core/constants/roles.ts:67-70` |
| E-04 | OBS-DASH-003 | “balance 加载完成且无交易时显示 AskAiBanner” | 正确，但需补充：余额请求失败也视为无交易，显示 AskAiBanner；加载中显示欢迎语 | `Dashboard.tsx:86-89` |
| E-05 | OBS-DASH-005 | 只写了 modal 流程 | 还需补充：①只把第一个 campaign 发给 `info`；②modal 只在有 dashboard 权限的分支渲染，无权限用户请求照发但不弹窗；③`location.replace` 的目标不带 basename（N-01）；④非 developers 域名的 step URL 直接拼 `?upsell-card-id=`，URL 已有 query 时会出现两个 `?` | `Dashboard.tsx:104,159-186`；`utils/upsell.ts:24-29` |
| E-06 | OBS-DASH-004 / §7 | 余额请求与权限相关 | `useDashboardBalance` 在 Dashboard 无条件调用，无 balance 权限、会计重定向用户也会发请求（N-05） | `Dashboard.tsx:65` |
| E-07 | OBS-UI-003 | 只描述注入与失败 | 补充：切换语言后不重新配置 widget（N-03）；`window.LiveChatWidget.visitor.jwt` 暴露原始 JWT 给页面上所有脚本 | `LiveChat/LiveChat.tsx:86-88,100-125` |
| E-08 | OBS-SET-001 | 只写了 Back to account | 补充：company 页对非 PA 迁移用户强制显示 `PAInfoBanner`；`/profile` 也在 `settingsLayoutPaths` 中，会隐藏 shell sidebar | `layouts/settings/index.tsx:45-73`；`Root.tsx:195-200` |
| E-09 | §7、§11.3 | §7 把 `metrics`、`graphics/gross_revenue` 列为本地 endpoint；§11.3 死代码未列 `StatisticCard` | 这两个 endpoint 只被死代码 `components/Dashboard/Sales` 使用，运行时不可达；`components/Dashboard/StatisticCard` 只被 `Sales/Metrics.tsx` import，也是死代码 | `git grep useDashboardMetrics/useDashboardGrossRevenue/StatisticCard` @772a320 |
| E-10 | OBS-ANA-002 | Ask AI 事件带 free-text question | 有两个事件：`ss_dashboard_send-question_click`（`question`）和 `ss_dashboard_prompt_click`（`prompt`，英文原文） | `communication-hub.ts:22-27,154-159` |
| E-11 | OBS-ANA-001 | 3002 “except in development” | 正确；补充：环境变量 `METRIKA_COMMUNICATION_HUB_COUNTER_ID` 可覆盖，设为空字符串时关闭；非 production 环境（含 stage）会在 console 打印每次点击 | `config.ts:153-156`；`communication-hub.ts:125-132` |
| E-12 | §10 / e2e | e2e smoke 的区域路径 `/new-project`、`/api-key`、`/members`、`/user-activity`、`/anti-fraud` | 这 5 个都不是 v1 路由。v1 实际是 `/projects/create`、`/settings/api_key`、`/settings/members`、`/settings/user-activity`、`/analytics/anti-fraud`。（P3 修正：原报只列了 3 个） | `e2e/tests/smoke-areas.ts:28-35`；`routes/inside/settings.ts` |

### 新发现（建议并入 spec §11.2）

| ID | spec 0.3.0 编号 | 描述 | 严重度 [I] | 用例 |
|---|---|---|---|---|
| N-01 | S-20（另加 AC-13） | Upsell 选项目后 `window.location.replace` 的站内目标没有 basename，所有 `/for/{site}/account` 部署都会跳出应用（不只 stage）；只影响成功路径 | 中 | RT-DASH-024、RT-DASH-030 |
| N-02 | S-23 | 余额数字把所有 `,` 替换为空格，de/es/pt/fr/ru 的小数逗号被替换成空格（“1.234.567 50”），不是丢失 | 低 | RT-DASH-017 |
| N-03 | S-24 | 同一 slot 一直存在时，LiveChat 不响应 locale 和 token 的变化；slot 重挂载或刷新后恢复 | 低 | RT-UI-013、RT-UI-015 |
| N-04 | S-25 | Topbar 切换语言是乐观更新；没有 `merchantId` 时不保存，持久化失败无提示，刷新后语言回退 | 低 | RT-I18N-003 |
| N-05 | S-26 | Dashboard 在访问判断之前就请求 balance 和 `salescards/info` | 低 | RT-DASH-013、RT-DASH-014、RT-DASH-027 |

### P3 新勘误（针对 spec 0.3.0）

| # | spec 位置 | spec 内容 | 代码事实 | 证据 |
|---|---|---|---|---|
| P3-E-01 | OBS-I18N-002 “On load” | “A `?locale=` URL parameter outranks the profile.” | 只是代码注释的意图。`LocaleProvider` 挂载时 user 还没加载，第一个 effect 用 `detectLocale` 应用 URL 值，第二个 effect 随即用 `replaceState` 删掉 `?locale=`；user 加载后 `hasUrlLocale` 已为 false，受支持的 `user.locale` 覆盖 URL 值。所以冷启动时 profile 最终胜出，只有 profile 没有可用 locale 时 URL 值（经 cookie）才保留。见 RT-I18N-005，需 stage 确认。**P5**：spec 0.3.2 已合入（OBS-I18N-002 改写，新增 S-36） | `ps:providers/LocaleProvider.tsx:33-67`；`sh:PlatformShell.tsx:379-399`（`LocaleProvider` 包在 `AuthOrchestrator` 外层） |
| P3-E-02 | OBS-I18N-002、S-25 的证据 | `sh:LocaleProvider.tsx:24-47` | `LocaleProvider` 在 platform-store 中，platform-shell 只是 import 它；前缀应为 `ps:providers/LocaleProvider.tsx` | `sh:PlatformShell.tsx:11-16` |

---

## 10. 覆盖统计

### OBS 覆盖

| 域 | OBS 数 | 已覆盖 | 用例 |
|---|---|---|---|
| HOME | 5 | 5 | RT-HOME-001…025 |
| DASH | 5 | 5 | RT-DASH-001…030 |
| SET | 2 | 2 | RT-SET-001…012 |
| UI | 3 | 3 | RT-UI-001…015 |
| I18N | 2 | 2 | RT-I18N-001…008 |
| ANA | 2 | 2 | RT-ANA-001…010 |
| **合计** | **19** | **19** | **100** |

定向用例：S-08 → RT-DASH-028；S-10 → RT-ANA-010；S-16 → RT-DASH-012；S-20 → RT-DASH-024；S-23 → RT-DASH-017；S-24 → RT-UI-013/015；S-25 → RT-I18N-003；S-36 → RT-I18N-005（P5）；S-26 → RT-DASH-014（另见 RT-DASH-013/027）；S-30 → RT-DASH-030；S-31 → RT-DASH-029。AC-04 → RT-SET-004；AC-07 → RT-HOME-001/002；AC-13 → RT-DASH-024。

预期失败项（按 AC 期望行为写，当前代码不满足）：RT-DASH-024（AC-13）。

### 优先级分布

| 域 | P0 | P1 | P2 | 合计 |
|---|---|---|---|---|
| HOME | 4 | 10 | 11 | 25 |
| DASH | 3 | 10 | 17 | 30 |
| SET | 2 | 4 | 6 | 12 |
| UI | 0 | 8 | 7 | 15 |
| I18N | 0 | 4 | 4 | 8 |
| ANA | 0 | 5 | 5 | 10 |
| **合计** | **9** | **41** | **50** | **100** |

---

## P3 变更记录

spec 0.2.0 → 0.3.0（2026-10-21）。只读两版 diff 中 T3 相关的变化；代码以 `772a320` 和同版本 SDK 源码核对。

### 修改的用例（11 个，追溯列已加 `[P3]`）

| 用例 | 原因 |
|---|---|
| RT-DASH-004 | OBS-DASH-003：重新请求（切换 merchant）期间也显示欢迎语，补第 2 步 |
| RT-DASH-013 | S-26：追溯补上新编号 |
| RT-DASH-014 | N-05 → S-26。扩成定向用例：同时覆盖 `salescards/info`、被重定向到 `/forbidden` 的用户，以及 403 时 header 显示 Ask AI |
| RT-DASH-017 | N-02 → S-23。勘误修正：小数逗号被替换成空格，不是丢失；补 es、pt、ru |
| RT-DASH-024 | N-01 → S-20，新增 AC-13。改为按 AC-13 写期望，标为预期失败项。勘误修正：影响所有 `/for/{site}/account` 部署，只影响成功路径 |
| RT-DASH-027 | S-26：追溯补上新编号 |
| RT-UI-013 | N-03 → S-24。勘误修正：同一 slot 存续期间不更新，slot 重挂载或刷新后恢复；补重挂载步骤 |
| RT-I18N-003 | N-04 → S-25。补“没有 `merchantId` 时不保存” |
| RT-I18N-005 | OBS-I18N-002 新增“`?locale=` 优先于 profile”。冷启动的代码路径与之不符，改写预期并记为 P3-E-01，待 stage 确认 |
| RT-SET-006 | OBS-SET-001：非 admin 访问 administration 时 SDK 跳过数据加载，补 Network 检查 |
| RT-SET-011 | OBS-SET-001：`/profile` 不在 `SettingsLayout` 中，没有 “Back to account” 按钮 |

### 新增的用例（4 个）

| 用例 | 原因 |
|---|---|
| RT-DASH-029 | OBS-HOME-002 / S-31：`ROLE_DEVELOPER_PARTIAL` 被首页送到 `/projects`，但能直接打开 `/dashboard` |
| RT-DASH-030 | OBS-DASH-005 第 4 步 / S-30：`developers.xsolla.com` 子串匹配，以及已有 query 时出现两个 `?` |
| RT-UI-015 | S-24：token 刷新也同样不更新 `visitor.jwt`（勘误修正中补充） |
| RT-SET-012 | OBS-SET-002：裸 `/settings` 落到 `/not-found` |

### 废弃的用例

无。

### 其他改动

- 头部 spec 版本改为 0.3.0；阅读约定补充 N-xx → S-xx 编号映射、“预期失败项”和 `[P3]` 的含义。
- §2 的覆盖范围、API 表和 2.1 渲染决策图：同步 S-26 和 OBS-DASH-003 的新描述。
- §5.1 SDK 切换逻辑表：补 `LocaleProvider` 挂载位置和 `merchantId` 条件。
- §6A：N-01 改为 S-20。§7：补新用例需要的账号和 sales card 数据。
- §9：E-12 按勘误修正为 5 个路径；新发现表加 spec 0.3.0 编号列，并修正 N-01、N-02、N-03 的描述；新增 P3-E-01、P3-E-02。
- §10：用例总数从 96 改为 100，更新定向用例和预期失败项。

### 已核对、无需修改

| spec 变化 | 结论 |
|---|---|
| OBS-HOME-001（列出 `PROJECT_ONLY_ROLES`） | RT-HOME-006 已按三个角色写，无需改 |
| OBS-HOME-005（CTA 门控表） | 与原勘误 E-02 一致，RT-HOME-015…022 已覆盖 |
| OBS-UI-002（sessionStorage 是 JSON） | 与 E-01 一致，RT-UI-007/008 已覆盖 |
| OBS-UI-003（`visitor.jwt` 暴露原始 JWT） | RT-UI-010 已检查 `jwt`；暴露风险写进 RT-UI-015 |
| OBS-ANA-001（3002 可被环境变量覆盖；development 只打日志） | 与 E-11 一致；stage 用例 RT-ANA-001/004 不受影响 |
| OBS-ANA-002（两个 Ask AI 事件） | 与 E-10 一致，RT-ANA-004/005/006 已覆盖 |
| stage 实测（`c1b5e37`，admin 账号） | Balance `$0.00`、Next payout `—`、带 selection 约 9 s 进入 `/dashboard`，都与现有预期一致，不需要修正预期 |

---

## P5 变更记录

spec 0.3.1 → 0.3.2（2026-10-21）。只读两版 diff 中 T3 相关的变化：OBS-I18N-002 “On load”、S-36、OBS-DASH-005 的运行时证据、U-12 关闭、§10.3。代码以 `772a320` 和同版本 SDK 源码核对（`ps:providers/LocaleProvider.tsx:29-67`、`pa:apis/merchant.ts:216`）。修改 2 条，新增 0 条，废弃 0 条。总数仍为 100（P0 9、P1 41、P2 50）。

| 用例 | 类型 | 原因 |
|---|---|---|
| RT-I18N-005 | 修改 | OBS-I18N-002 / S-36：SDK 把缺失的 profile locale 补为 `'en'`，第 3 步预期由“最终为 fr”改为“最终为 en”；新增不受支持值的变体（[I]）；删除“spec 与代码不符”的注记，改为 S-36，并写明修复后预期取决于 accounts-sdk 的决定 |
| RT-DASH-024 | 修改 | U-12 已关闭 / §10.3：缺 basename 的落地地址返回 BFF 404，替换原来的 [U] |

其他改动：头部 spec 版本改为 0.3.2；阅读约定补 `[P5]`；§5 覆盖说明补 S-36；§5.1 “user 加载”一行补 `'en'` 缺省；§8 新增 U-12（关闭）；§9 P3-E-01 标为已合入；§10 定向用例补 S-36 → RT-I18N-005。核对后未改：RT-I18N-002、RT-I18N-003（profile 覆盖 cookie 的结论不变）；RT-DASH-015（XAA 用的是 `@accounts-sdk/core` 的 ErrorBoundary，不是 U-14 涉及的 platform-components 版本）。

## P8 变更记录（spec 0.3.5）

| 用例 | 变更 | 原因 |
|---|---|---|
| RT-I18N-002 | 修改 | S-39：语言保存返回 200 但刷新后不保留（stage C1 实测），改为预期失败项并给出修复后预期 |
| RT-I18N-009 | 新增 | S-40：切换语言后 `<html lang>` 不更新（stage C1 实测） |

覆盖统计变化：P1 不变，P2 +1，总数 100 → 101（P0 9 / P1 41 / P2 51）。
