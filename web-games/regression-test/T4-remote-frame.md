# T4 回归用例：Remote 加载 · iframe · 本地 endpoint

| 项 | 值 |
|---|---|
| Track | T4 Remote 加载·iframe·本地 endpoint |
| 基于 spec 版本 | 0.3.1（`web-games-account_reverse_spec.md`）；P4 定向更新，变更见文末"P4 变更记录"（P3 基于 0.3.0） |
| 代码基线 | `master@772a320`（行号以此为准） |
| 对照分支 | `WASP-2524-migrate-tests-to-apps@540ec56`（差异标 `[分支差异]`） |
| 生成日期 | 2026-10-21 |
| 证据方式 | 只读源码、测试和本地 `node_modules`，**未运行任何测试**。P3 起部分用例引用 stage 实测（部署 `c1b5e37`），在预期中标"stage 实测" |

约定：

- `{B}` = `https://<stage-host>/for/web-games/account`。stage 主机名本 repo 中没有记录，**待确认**。
- `{m}` = merchant id，`{p}` = project id。路由都相对 `{B}`。
- "模块列表" = `GET {platformApiUrl}/api/v1/modules`（stage：`https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules`）。
- 代码路径省略 `src/` 前缀时，指 `772a320:src/…`。

---

## 1. 加载机制总览

```mermaid
flowchart TD
  A[index.tsx: import init] --> B[init.tsx: setupGatewayAxios]
  B --> C{GET /api/v1/modules}
  C -- 失败 / 非 2xx code --> X[throw 'Failed to initialize application'<br/>#root 为空，白屏]
  C -- 成功 --> D[initModuleUrls: window.xxxModuleUrl = url?uuid]
  D --> E[registerMfRemotes: 只注册 communication_platform_v2<br/>失败只 console.warn]
  E --> F[import bootstrap → 路由]
  F --> G[layout 挂载 RemoteModule name=X]
  G --> H{store.modules 中 X 可用?<br/>scope 非空且不是 'string'}
  H -- 是 --> I[用 gateway 配置]
  H -- 否 --> J{静态配置存在?}
  J -- 是 --> K[用 modules/config.ts 静态配置]
  J -- 否且 gateway 也无条目 --> S[spinner 直到模块列表变化<br/>loadingFallback=null 时空白；无错误、无请求]
  I & K --> L{urls[APP_ENV] 存在?}
  L -- 否 --> P1["&lt;p&gt;Remote URL not found for scope: X&lt;/p&gt;"]
  L -- 是 --> M{window[container] 已存在?}
  M -- 是 --> R[container.init + get → 渲染]
  M -- 同 container 正在加载 --> Q[每 50 ms 轮询，永不 reject（S-02）]
  M -- 否 --> N["注入 &lt;script src=url?v=uuid&gt;"]
  N -- onerror --> P2["&lt;p&gt;Failed to load: url&lt;/p&gt;"]
  N -- onload + 100 ms --> R
  R -- container 不存在 --> P3["&lt;p&gt;Remote container 'X' not found&lt;/p&gt;"]
  R -- container.init / get / factory 抛 Error --> P4["&lt;p&gt;原始 Error message&lt;/p&gt;"]
  R -- 模块导出为空 --> P5["&lt;p&gt;No component exported from scope/module&lt;/p&gt;"]
  R -- 抛出的不是 Error --> P6["&lt;p&gt;Unknown error&lt;/p&gt;"]
```

证据：`index.tsx:5`、`init.tsx:8-34`、`modules/RemoteModule.tsx:50-133`、`modules/loadModule.ts:14-96`、`mf/index.ts:23-29`。

`[P4]` 错误文本规则（spec 0.3.1 OBS-MF-002）：`<p>` 显示捕获到的 `err.message` 原文（`RemoteModule.tsx:96-101`），所以文案不止上图前 3 种，还包括 `No component exported from …`，以及 `container.init`、`container.get` 或 factory 抛出的任意 `Error` message；`Unknown error` 只在抛出的不是 `Error` 时出现。见 RT-MF-083。

---

## 2. Remote 清单（master@772a320）

加载方式：**MF1** = host 自己的 `modules/RemoteModule` + `loadModule`（动态 `<script>`）；**MF2** = `@module-federation/runtime` 2.9.0 + `@micro-frontend/bridge` 0.0.2；**iframe**。本 repo 中没有经 SDK 加载的 remote（SDK 页面不是 remote）。

stage URL 列："gateway" 表示取模块列表中该 `module_id` 的 `urls.stage`，本 repo 无法给出具体值，需在 stage 用 RT-MF-004 记录；"+静态" 表示 gateway 条目缺失或 `scope` 为空/`'string'` 时回退到 `modules/config.ts` 的静态 URL。

| # | Remote（module_id / scope / expose） | 方式 | stage URL | 挂载路由（相对 `{B}`） | 传入 props（host 侧） | 代码 |
|---|---|---|---|---|---|---|
| 1 | `cloud-gaming` / `cloud_gaming_dashboard_module` / `./App` | MF1 | gateway + 静态 `https://cloudgaming-publisher-tools-stage.web.app/dashboard/remoteEntry.dashboard.js` | `/{m}/projects/{p}/cloud-gaming`（`CloudGamingAccess`） | `locale, token, merchantId:Number, projectId:Number, rootURL=match.url, basename` | `layouts/cloudgaming/index.tsx`；`config.ts:56-62` |
| 2 | `offerwall` / `offerwall_reporting`（scope 映射）/ `./App` | MF1 | gateway + 静态 `https://pa-offerwall-stage.web.app/remoteEntry.js` | `/{m}/projects/{p}/offerwall` | `token, pathname=match.url, merchantId:String, projectId:String, merchantName, email, locale, isMarketingBalanceEnabled=false, siteId, basename` | `layouts/offerwall/index.tsx`；`config.ts:64-68` |
| 3 | `player-platform` / `pa_games_portal` / `./App` | MF1 | gateway + 静态 `https://pa-games-portal-stage.web.app/remoteEntry.js` | `/{m}/projects/{p}/player-platform` | `rootURL, token, merchantName, locale, merchantId:Number, projectId:Number, siteId, basename` | `layouts/player-platform/index.tsx`；`config.ts:38-43` |
| 4 | `sdk-integration` / `xsollasdk_integration_widget` / `./App` | MF1 | gateway + 静态 `https://sdk-intergration-widget.nl-k8s-stage.srv.local/assets/remoteEntry.js`。**S-17**：development URL = production URL `https://sdk-intergration-widget.web.app/…`，与注释"Dev points at stage"不符 | `/{m}/projects/{p}/sdk/integration`（**exact**） | `rootURL, token, locale, merchantId:Number, projectId:Number, basename` | `layouts/sdk-integration/index.tsx`；`config.ts:45-54` |
| 5 | `launcher` / `launcherModule` / `./OldApp` | MF1 | gateway | `/{m}/projects/{p}/launchers` | `locale, token, merchantId, projectId, privileges, state, rootURL, messages, basename` | `layouts/launcher/index.tsx`；`routes/inside/old-launcher.ts` |
| 6 | `launcher` / `launcherModule` / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/new-launcher` | `rootURL, token, locale, merchantId, projectId, messages, basename` | `layouts/launcher-new/index.tsx` |
| 7 | `storefront` / gateway / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/storefront`（4 个 store privilege） | `locale, token, merchantId:String, projectId:String, privileges, preferences{catalogVersion:'new'}, rootURL, userId, userEmail, userName, userRole, basename`；另写 cookie `gc-pa-v4-token`、`gc-pa-locale`、`gc-pa-merchant-id`、`gc-pa-project-id`（S-01） | `layouts/storefront/index.tsx:12-62` |
| 8 | `payments` / gateway / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/payments`（`ProjectSettings`） | `locale, merchantDetails, merchant_id, project_id, token, privilegesList, rootURL, basename` | `layouts/payments/index.tsx` |
| 9 | webhooks 测试页签与高级设置（storefront `./webhooks-capi` / `./webhooks-lapi-virtual-items` / `./webhooks-lapi-pay2play`；subscriptions `./webhooks`；payments `./webhooksPaymentsTab` / `./webhooksDisputeTab` / `./advancedSettings`） | MF1 | gateway | `/{m}/projects/{p}/edit/webhooks/*`、`/edit/event-api`（SDK `ProjectSettingsLayoutPage` 决定子路由） | 见各 Tab：`merchantId/projectId`（GC）、`merchant_id/project_id`（subs、payments）、`token, locale, privileges, currency, webhookSecrets, isSecretKeyRotationEnabled, xsollaAnalytics` | `layouts/webhooks-store/webhookRemotes.tsx:54-195`、`AdvancedSettingsRemote.tsx` |
| 10 | `support` / gateway / gateway `module` | MF1 | gateway | `/{m}/support/*`（`TransactionSearchSection`；`/support` 默认跳 `/support/transactions`） | `locale, merchant_id:Number, merchantDetails, user, route, token, privilegesList, basename` | `layouts/Support/remote.tsx`；`routes.tsx:89-100` |
| 11 | `subscriptions` / `subscriptions_publisher_account` / `./support` | MF1 | gateway | `/{m}/support/subscriptions`（另需 `RecurrentSubscriptionGetAll`） | `token, locale, privileges, merchant_id:Number, project_id:null, basename` | `layouts/Support/subscriptions.tsx` |
| 12 | `communication_platform_v2/SupportHubV2`，回退 MF1 `communication_platform` / `pa_communication_platform` / gateway `module` | **MF2** + MF1 回退 | gateway `remoteEntry.js` → 派生 `…/v2/mf-manifest.json` | `/{m}/communication-hub`（`/{m}/support-hub` 重定向到此） | `token, isChatReady=true, merchantName, userEmail, userId, userAvatar, locale, merchantId(route), wikiLink, merchantRole, aiQuestion(location.state), accountId=siteId`；MF2 不传 `basename`，MF1 回退时 RemoteModule 加 `basename` | `layouts/CommunicationHub/CommunicationHub.tsx`；`mf/index.ts`；`mf/runtime/*` |
| 13 | `xsolla-gold` / gateway / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/gold`（merchant 级 `/{m}/gold` 因 D1 不可达） | `loginToken, merchantId, projectId, rootUrl（小写 l）, basename` | `layouts/xsolla-gold/index.tsx` |
| 14 | `xsolla-link` / gateway / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/link`；**非 admin 在 render 中 `history.push('/forbidden')`** | `token, locale, merchantId, projectId, rootURL, basename` | `layouts/xsolla-link/index.tsx` |
| 15 | `metaframe` / gateway / gateway `module` | MF1 | gateway | `/{m}/metaframe`（`ProjectSettings`）、`/{m}/projects/{p}/metaframe` | `token, locale, merchantId, projectId（merchant 级为 NaN）, rootURL, basename` | `layouts/metaframe/index.tsx` |
| 16 | `site-builder` / gateway / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/site-builder` | `locale, token, merchantId, projectId, rootURL, basename`；key=`m:p`；在 effect 中写 cookie `sb-pa-*`（`sameSite=lax`、Path `/`、10 天；Domain 按 hostname 决定：含 `.xsolla.com` → `.xsolla.com`，含 `xsolla.com` → `xsolla.com`，含 `.srv.local` → `.srv.local`，否则 host-only，见 `getCookieParams`）`[P3]` | `layouts/SiteBuilder/index.tsx`；`core/utils/cookie.ts:101-118` |
| 17 | `network` / gateway / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/network`（非 `ROLE_VIEWER`） | **只有 `token` + `basename`**；merchant/project/locale 通过 cookie `network-pa-*`（host-only，无 secure） | `layouts/network/index.tsx` |
| 18 | `subscriptions` / `subscriptions_publisher_account` / gateway `module` | MF1 | gateway | `/{m}/projects/{p}/subscriptions`（`ProjectSettings`，非 `gnation`） | `locale, token, privileges, merchantId, projectId, merchant_id, project_id, functionHOP, isSeparatedDevMode=false（stage）, basename` | `layouts/subscriptions/index.tsx` |
| 19 | `xaa_widgets` / gateway / gateway `module` | MF1 | gateway（无静态回退） | `/{m}/dashboard`（`DashboardWebGames`）、`/{m}/analytics/{payments,anti-fraud,anti-fraud/blocklist,catalog,players,engagement,web-shop,support}` | `componentName, tokenJWT, merchantId:String, locale, currencyISO, siteId, navigate=history.push, basename` | `components/Dashboard/XAAWidgets/index.tsx`；`layouts/advanced-analytics/index.tsx` |
| 20 | `disputes` / `disputes_publisher_account` / `./app`（小写） | MF1 | gateway + 静态 `https://dispute-module-publisher-account.nl-k8s-stage.srv.local/disputes_publisher_account.js` | `/{m}/analytics/main-info/afs/chargeback-registry`（exact） | `locale, token, merchant_id:Number, basename` | `layouts/advanced-analytics/ChargebackRegistry.tsx`；`config.ts:70-77` |
| 21 | `finance` / gateway / gateway `module` | MF1 | gateway | `/{m}/finance`（registry）、`/finance/payouts`、`/finance/reports`（及 `/reports/download/:session`）、`/{m}/saved-payout-methods` | `locale, token, user, route, privilegesList, merchantDetails, merchant_id, rootURL=financeRoot, rootPath, routePath, basename`；payouts 与 registry 两个 pane 首次访问才挂载，之后隐藏保活 | `layouts/finance/{container,remote,reports}.tsx` |
| 22 | `funding` / gateway / `./nav` + gateway `module` | MF1（同 container 两个 expose **同时**挂载） | gateway | `/{m}/funding`（无 privilege）、`/{m}/projects/{p}/funding`（`ProjectSettings`） | nav：`userPanel, root, locale, navComponent, loadingFallback=null`；App：`token, locale, merchantID, projectID, rootURL, history, route, openNotify, fetchProjects, projectsCreateSuccess, xsollaAnalytics, basename` | `layouts/Funding/index.tsx:96,115-130` `[P3]` |
| 23 | `login` / `login` / `./App` | MF1 | gateway + 静态 `https://login-pa-module.gcp-k8s-login-stage.srv.local/login-pa-module.js` | `/{m}/projects/{p}/login`（非 `ROLE_VIEWER`） | `locale, token, merchantId, projectId, history（去 basename 的 Proxy）, rootURL, basename`；外包 `<Router history=loginHistory>` | `layouts/login/index.tsx` |
| 24 | marketplace | iframe | 常量 `https://xsolla.partnerpage.io/integrations` | `/{m}/marketplace`（exact，无 privilege） | 无 | `layouts/marketplace/index.tsx` |
| 25 | ontology | iframe | gateway `ontology` 条目 → `window.ontologyModuleUrl`（去掉 `?uuid`），必须 https | `/{m}/ontology`（exact，页面内检查） | URL query 只有 `merchantId`；鉴权靠 BFF cookie `pa-v4-token` | `layouts/ontology/index.tsx`；`@platform-base/api@1.5.0 dist/index.mjs:650-691` |
| 26 | IntegrationFrame | iframe | 后端 sales card 的 `steps[].url`，经 `startsWith` allowlist | `/{m}/frame/:frame_path`（exact；`frame_path` 被忽略） | 无 | `pages/IntegrationFrame/*` |
| 27 | Tax interview（SDK 页面） | iframe | SDK store 中的 tax interview URL | `/{m}/tax-interview` | 无；监听 `message`（见 FRAME 节） | `platform-pages@3.25.2 dist/index.mjs:70-215` |
| 28 | Documents / boxnet（SDK 页面 `DocumentCenterDocuments`） | iframe | SDK store 中的 documents URL | `/{m}/documents`（exact）与 `/{m}/finance/boxnet`（exact），两处都要求 `get_merchant_boxnet_url` `[P3]` | 无；监听 `message`（只发埋点） | `platform-pages@3.25.2 dist/index.mjs:7854-7953`；`routes.tsx:134-138`；`routes/inside/finance.ts:50-54` |

补充事实：

- webpack `remotes`（`webpack.base.config.ts:267-286`）声明的 16 个静态 remote，在 src 中没有任何 `import('<remote>/…')`（只在 `layouts/Support/subscriptions.tsx:14` 的注释中出现）。所以 `initModuleUrls` 写入的 `window.*ModuleUrl` 在运行时只有 `ontologyModuleUrl` 被读取（`layouts/ontology/index.tsx:12`）。S-12、S-13 都没有运行时影响。
- 所有 MF1 remote 共享同一个 `loadingScopes` 集合，按 container 名去重（`loadModule.ts:3,22`）。

`[分支差异]` 当前分支 `apps/web-games` 改用 `@platform-base/shell@0.8.0` 的 `RemoteModule`（`apps/web-games/src/components/RemoteModule.tsx`）：并发调用共享同一个 pending promise（S-02 已修复）；加载失败时渲染 `null` 并上报 Datadog，不再显示 `<p>` 错误文本；失败的 `<script>` 会被移除；onload 后直接检查 container，没有 100 ms 等待；URL 用 `resolveModuleUrl` 兼容 `dev/stage/prod` 两种 key；props 顺序为 `{basename, ...otherProps}`（调用方可以覆盖 basename）。CommunicationHub 在分支中只走 MF1（`packages/@platform-templates/layouts/src/remotes/communication-hub/index.tsx:67`），没有 MF2 路径。

---

## 3. 本地 endpoint 清单

列说明：**可达** = stage UI 能触发；"401 处理" 只存在于 gateway 实例（stage 上延迟 2 s 后 `location.replace({B}/logout)`，`core/apis/gateway-instance.ts:80-119`）。

| # | Method / Path | Base / 客户端 | 触发入口 | 可达 | 成功 UI | 4xx UI | 5xx / 网络失败 UI | 用例 |
|---|---|---|---|---|---|---|---|---|
| E1 | GET `/api/v1/modules`（spec 0.3.0 §7.2：host 触发、SDK 发出） | gateway，SDK `gatewayInstance`（`platform-apis@2.29.2 index.mjs:1195-1204`） | 启动 | 是 | 正常进入 app；响应形状 `{code, result: {data, total}, trace_id}`（stage 实测 `c1b5e37`）`[P3]` | 401 带 token → `/logout`；其他 → 白屏 | 白屏，console `Failed to initialize application` | RT-MF-001/002/003 |
| E2 | GET `/mapi/merchant/current/merchants/{m}/analytics/metrics/balance` | gateway | `/{m}/dashboard` | 是 | 余额 + 上次/下次 payout 日期 | 403/404：余额与日期显示 `—`；401 → `/logout` | 显示 `—`；同时显示 AskAi 横幅而不是欢迎标题 | RT-API-001…004 |
| E3 | GET `…/analytics/metrics`、`…/graphics/gross_revenue` | gateway | 只被 `components/Dashboard/Sales`（死代码）使用 | **不可达** | — | — | — | — |
| E4 | GET `/mapi/merchant/current/merchants/{m}/directories/countries` | gateway | `/registration` 表单（T5） | 是 | 国家下拉按名称排序 | 下拉为空，无提示；401 → `/logout` | 下拉为空，无提示 | RT-API-010 |
| E5 | GET `/api/payment_provider/profile` | gateway | `getMerchantInitStatus` 无调用方 | **不可达** | — | — | — | — |
| E6 | GET `/mapi/merchant/merchants/salescards/info?utm_campaign=`（未编码，S-08） | gateway | Dashboard 带 `?utm_campaign=` 且 merchant 或 project 多于 1 个 | 是 | 1 张卡 → 弹窗显示标题和图片；>1 → 通用标题；0 → 无弹窗 | 无弹窗，无提示 | 无弹窗，无提示 | RT-API-020/021 |
| E7 | PUT `/mapi/merchant/current/merchants/handle_all_utms` | gateway | Upsell 弹窗挂载时 | 是 | 无可见变化 | 无可见变化；console 出现 unhandled rejection | 同左 | RT-API-022 |
| E8 | POST `/mapi/merchant/merchants/{m}/salescards/assign_to_user` | gateway | Upsell 弹窗中点选项目 | 是 | 弹窗关闭并整页跳转（站内目标无 basename，S-20，见 RT-FRAME-010）`[P3]` | 弹窗关闭，无提示 | 弹窗关闭，无提示 | RT-API-023 |
| E9 | GET `/mapi/merchant/merchants/{m}/salescards/{id}` | gateway | IntegrationFrame；Upsell 弹窗 | 是 | 允许域名 → iframe | 永久全屏 loader（IntegrationFrame）/ 弹窗关闭 | 同左 | RT-FRAME-001…007 |
| E10 | GET/PUT/POST/DELETE `/mapi/merchant/current/projects/{p}`（`payment_url`、`project_key`、`ipn_enabled`、`webhook_secrets*`） | gateway | `store/slices/webhooks.ts` 的 thunk 在 src 中**没有 dispatch 方** | **不可达** | — | — | — | RT-API-030（反证） |
| E11 | GET `/mapi/merchant/current/currency/list` | gateway | webhooks `/payments`、`/dispute` 页签 | 是 | 页签渲染 payments remote，`currency.items` 为列表；模块级缓存到整页刷新 | 页签仍渲染，`items=[]`；401 → `/logout` | 页签仍渲染，`items=[]`；失败不缓存，下次挂载重试 | RT-API-040…042 |
| E12 | GET/PUT `/merchant/current/projects/{p}/togglers*`（无 `/mapi`，S-09） | `integrationsAxios`，`platformApiUrl` 绝对前缀，只带 Bearer | 只被死代码 `layouts/Projects/Integrations` 调用 | **不可达**（spec 0.3.0） | — | — | — | 不写 stage 用例 |
| E13 | GET/POST/PUT `/api/v1/admin/project/{p}/project-analytic*`、`/api/v1/admin/event-type` | `integrationsAxios`，`externalAnalyticsApiUrl` | 同上 | **不可达**（spec 0.3.0） | — | — | — | 不写 stage 用例 |
| E14 | GET `/api/v1/balance/{m}` | `marketingBalanceUrl`，Bearer | 只被 `MarketingBanner`（死代码）使用 | **不可达** | — | — | — | RT-API-060（S-06） |
| E15 | GET `/project/{p}/admin/features?features[]=…` | `storeApiUrl`，Bearer，无 401 处理 | 侧边栏（`useStoreFeatures`，用 SDK `selectCurrentProjectID`）：折叠工具栏与 `ProjectSidebarV2` 各调用一次，所以**任何页面**（含 merchant 级 `/{m}/dashboard`）只要 store 中有当前项目，就发 **2 次** | 是 | `daily_chains_feature`/`offer_chains_feature` 为 `'1'` 时显示 Daily rewards / Offer chains 菜单 | 错误被吞，两个菜单隐藏；401 **不**登出。stage 实测：dashboard 冷启动 2 次 404 `[P3]` | 同左 | RT-API-050/051/052 |
| E16 | GET `{B}/server/token`（fetch，8 s abort） | 同源 BFF | 启动（T1） | 是 | 取得 token | 401 `{error:'no_session'}` → 无 token 继续 | 超时/失败 → 无 token 继续 | 见 T1 |
| E17 | 导航 `{B}/logout` | 同源 BFF | gateway 401 | 是 | 302 → `/login` | — | — | 见 T1 |
| E18 | POST `/api/oauth2/login`、`/api/oauth2/user`；GET `/api/otp/validate`；PUT `/api/otp/resend` | `loginApiUrl`（`https://test-login.xsolla.com`），原生 fetch | `/login/mcp`（T5） | 是 | 跳回 MCP `redirect_uri` | 页面内错误文本（后端 `error.description` 或本地化兜底） | 本地化兜底错误文本 | 见 T5 |
| E19 | POST `/api/account/platform/organization/registration` | `platformApiUrl`，原生 fetch，无 Bearer，带 `Business-Account-Id`（`core/mcp/oauthLogin.ts:240-261`） | `/login/mcp` 注册（T5） | 是 | 继续登录流程 | `http_status_code=404` 视为已存在；其他 → 字段错误文本 | 兜底错误文本 | 见 T5 |
| E20 | POST `pass_survey`；POST `users/{id}/credential`（spec 0.3.0 §7.1 新列） `[P3]` | SDK `gatewayInstance`，由 host thunk 直接调用（`core/store/slices/registration.ts:30,48`） | 注册 Step 1（T5） | 是 | — | — | — | 见 T5 |

说明 `[P3]`：spec 0.3.0 §7.2 新列出的其余 SDK 发出请求（`get_init_info`、legal-documents、`/api/project/{m}/create`、`webhook_storage_integration`、support-hub `notifications/status`）不属于 T4 的 remote/iframe 范围，本表不收录。

---

## 4. 用例

### 4.1 MF：Remote 加载

#### 4.1.1 启动与模块列表

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-001 | 模块列表成功，remote URL 注册 | 任一有 session 的 owner | 1. DevTools → Network，勾选 Preserve log，过滤 `modules`。2. 打开 `{B}/{m}/dashboard`。3. Console 执行 `window.__modules.length`、`window.APP_ENV`、`window.ontologyModuleUrl`。 | 1. 只有 1 次 `GET …/api/v1/modules`，在任何业务请求之前。2. 响应 body 形状为 `{code, result: {data, total}, trace_id}`。3. `window.__modules` 是 `result.data` 数组，长度与 `result.data` 相同（stage 实测 `c1b5e37`：20 项）。4. `window.APP_ENV === 'stage'`。5. gateway 有 ontology 条目时，`window.ontologyModuleUrl` 以 `?<uuid>` 结尾。stage 实测（`c1b5e37`）2–5 都通过。 | P0 | OBS-BOOT-001；`init.tsx:13-28`；`initModules.ts:40` `[P3]` | `src/init.test.tsx`、`src/modules/initModules.test.ts` |
| RT-MF-002 | 模块列表失败时白屏 | 同上；Requestly（或 Proxyman）可改响应状态码 | 1. 用 Requestly 把 `…/api/v1/modules` 改成 500；硬刷新。2. 改为 200 + body `{"code":500,"error":"x"}`；硬刷新。3. 用 DevTools → Network request blocking 屏蔽该 URL；硬刷新。 | 三种情况都是：`#root` 为空（白屏），Console 出现 `Uncaught (in promise) Error: Failed to initialize application: …`，不发 `/server/token` 之后的业务请求，没有重试按钮。 | P0 | OBS-BOOT-001；`init.tsx:29-31`；SDK `fetchModuleList` 抛错条件 `platform-apis index.mjs:1195-1204` | `src/init.test.tsx`（"wraps a module-list failure…"） |
| RT-MF-003 | 模块列表慢：无超时 | 同上 | 1. DevTools → Network → 自定义 throttling：latency 60000 ms。2. 硬刷新 `{B}/{m}/dashboard`。 | 60 s 内页面保持空白，无 loader、无超时提示；响应返回后正常进入。 | P1 | §8.2 "module 列表请求阻塞首屏，没有超时"；axios 默认 `timeout=0` | — |
| RT-MF-004 | 记录 stage 模块列表快照（U-05） | 同上 | 1. 打开任一页面。2. Network 中复制 `/api/v1/modules` 响应。3. 记录每个条目的 `module_id`、`scope`、`module`、`urls` 的 key。 | 记录：`urls` 是否含 `stage` key；`communication_platform` 的 `module` 是否为 `./SupportHubV2`；第 2 节中 gateway-only remote 是否都存在。若某条目只有 `dev`/`development` key，对应 MF1 remote 会显示 `Remote URL not found for scope`（见 RT-MF-047）。 | P1 | U-05；`RemoteModule.tsx:74-75` | — |
| `[分支差异]` RT-MF-002 | 分支中模块列表失败 | — | 同 RT-MF-002 | 分支渲染 `InitializationError`，带重试按钮（`apps/web-games/src/init.tsx` catch 分支）。 | — | — | `apps/web-games/tests/initialization-failure.test.tsx` |

#### 4.1.2 各 remote 正常加载与 context 透传

通用步骤（下表每行都按此执行，只写差异）：

1. 用前置账号登录，打开 DevTools → Network，过滤 `JS`，勾选 Preserve log。
2. 打开挂载路由。
3. 检查 remoteEntry 请求：URL = 第 2 节的 URL 加 `?v=<uuid>`（URL 已有 `?` 时用 `&v=`），状态 200。
4. 用 React DevTools 搜索 `RemoteModuleComponent`，检查其 props，以及其子组件（remote 根组件）收到的 props。
5. 页面先显示居中 spinner（最小高度 200 px），然后显示 remote UI；侧边栏与顶栏一直可用。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-011 | cloud-gaming 加载 | 有 `cloud_gaming_access` 的账号；项目可见 cloud-gaming | 通用步骤；路由 `/{m}/projects/{p}/cloud-gaming` | remote 渲染。props：`merchantId`/`projectId` 为 number，`rootURL=/{m}/projects/{p}/cloud-gaming`，`basename=/for/web-games/account`。Console 中**没有** `Cannot set properties of undefined (setting 'loaded')`（eager shared 修复，OBS-MF-004）。 | P1 | OBS-MF-001/004；`layouts/cloudgaming/index.tsx`；`webpack.base.config.ts:288-303` 注释 | — |
| RT-MF-012 | offerwall 加载 | owner；项目已开通 offerwall | 通用步骤；`/{m}/projects/{p}/offerwall` | props：`merchantId`/`projectId` 为**字符串**且来自路由；`pathname=match.url`；`isMarketingBalanceEnabled=false`；`siteId='web-games'`；`email` 为当前用户邮箱。container 名 `offerwall_reporting`。 | P1 | OBS-MF-001；`layouts/offerwall/index.tsx` | — |
| RT-MF-013 | player-platform 加载 | owner | 通用步骤；`/{m}/projects/{p}/player-platform` | props 含 `siteId='web-games'`、`merchantName`；container `pa_games_portal`。 | P1 | OBS-MF-001；`layouts/player-platform/index.tsx` | — |
| RT-MF-014 | sdk-integration 加载（含 S-17） | owner | 通用步骤；`/{m}/projects/{p}/sdk/integration` | 1. remoteEntry 主机为 gateway 提供的主机；gateway 没有条目时为 `sdk-intergration-widget.nl-k8s-stage.srv.local`，**不能**是 `sdk-intergration-widget.web.app`（prod）。2. props `rootURL`（大写 URL）、number 类型 id。 | P1 | S-17；`config.ts:47-53` | `src/modules/config.test.ts`（只验证当前环境 key） |
| RT-MF-015 | 旧 launcher（`./OldApp`） | owner；项目可见 launcher | 通用步骤；`/{m}/projects/{p}/launchers` | `container.get('./OldApp')`（React DevTools 中 `exposedModule='./OldApp'`）；props 含 `privileges`、`messages`、`state`。 | P1 | OBS-MF-001；`layouts/launcher/index.tsx` | `src/modules/RemoteModule.test.tsx`（exposedModule 覆盖） |
| RT-MF-016 | 新 launcher；与旧 launcher 共用 container | owner | 1. 打开 `/new-launcher`。2. 不刷新，切到 `/launchers`。 | 1. 两者共用 `launcherModule` container；第 2 步**不再**请求 remoteEntry（container 已在 window 上）。2. 新 launcher 使用 gateway `module`。 | P2 | `loadModule.ts:18-20` | `src/modules/loadModule.test.ts`（"when the container is already registered"） |
| RT-MF-017 | storefront 加载与 identity gate | 有 4 个 store privilege 的 owner | 通用步骤；`/{m}/projects/{p}/storefront` | 1. user/merchant 请求完成前不挂载 remote（页面空白）；完成后挂载，之后切换 merchant 不会卸载。2. props `merchantId`/`projectId` 为字符串，`preferences.catalogVersion='new'`，含 `userId/userEmail/userName/userRole`；admin 的 `userRole` 为 admin 角色。3. 不发 `GET /merchant/v3/users/init`（WASP-2478）。 | P1 | OBS-MF-001；`layouts/storefront/catalog-identity.ts:17-41` | `src/layouts/storefront/index.test.tsx`、`catalog-identity.test.tsx` |
| RT-MF-018 | payments 加载 | `ProjectSettings` | 通用步骤；`/{m}/projects/{p}/payments` | props 用蛇形 `merchant_id`/`project_id`（字符串），含 `merchantDetails`、`privilegesList`。 | P1 | `layouts/payments/index.tsx` | — |
| RT-MF-019 | webhooks 各页签 remote | `ProjectSettings`；项目开启 webhooks | 1. 打开 `/{m}/projects/{p}/edit/webhooks`。2. 依次切换 store、virtual-items、pay2play、subscriptions、payments、dispute 页签，以及高级设置区域。3. 打开 `/edit/event-api`。 | 1. store/virtual-items/pay2play → storefront container，expose 分别为 `./webhooks-capi`、`./webhooks-lapi-virtual-items`、`./webhooks-lapi-pay2play`；未知页签 id 回退 `./webhooks-capi`。2. subscriptions → `./webhooks`。3. payments/dispute → payments container 的 `./webhooksPaymentsTab`/`./webhooksDisputeTab`，先请求一次 `currency/list`。4. 高级设置与 event-api → `./advancedSettings`。5. `webhookSecrets` prop 始终为空数组（见 RT-API-030）。 | P1 | `webhookRemotes.tsx:173-195`；`project-settings/index.tsx` | `src/layouts/webhooks-store/webhookRemotes.test.tsx`、`AdvancedSettingsRemote.test.tsx` |
| RT-MF-020 | support 加载 | 有 `transaction_search_section` | 通用步骤；`/{m}/support` | 1. URL 变为 `/{m}/support/transactions`。2. props `merchant_id` 为 number，来自 store。 | P1 | `routes.tsx:89-100`；`layouts/Support/remote.tsx` | — |
| RT-MF-021 | support subscriptions（subscriptions `./support`） | 另有 `recurrent_subscription_get_all` | 通用步骤；`/{m}/support/subscriptions` | `exposedModule='./support'`，container `subscriptions_publisher_account`；props `project_id=null`。 | P1 | `layouts/Support/subscriptions.tsx` | — |
| RT-MF-023 | xsolla-gold（项目级） | owner；项目可见 gold | 通用步骤；`/{m}/projects/{p}/gold` | token prop 名为 `loginToken`，`rootUrl` 小写 l；无 `locale`。merchant 级 `/{m}/gold` → `/not-found`（D1，T2 覆盖）。 | P2 | `layouts/xsolla-gold/index.tsx`；D1 | `scenarios.ts` D1 |
| RT-MF-024 | xsolla-link：admin 与非 admin | A：admin；B：非 admin owner | 两个账号分别打开 `/{m}/projects/{p}/link` | A：remote 加载。B：URL 变为 `/forbidden`，不请求 remoteEntry。 | P1 | `layouts/xsolla-link/index.tsx` | — |
| RT-MF-025 | metaframe（merchant 级与项目级） | `ProjectSettings` | 1. 打开 `/{m}/metaframe`。2. 打开 `/{m}/projects/{p}/metaframe`。 | 两处都加载同一 container。merchant 级 props 中 `projectId` 为 `NaN`（`Number(undefined)`）；记录 remote 是否能处理，**待确认**。 | P2 | `layouts/metaframe/index.tsx`；`routes.tsx:104` | — |
| RT-MF-026 | site-builder 与 cookie | owner | 1. 通用步骤；`/{m}/projects/{p}/site-builder`。2. Application → Cookies。3. 切换到另一个项目的 site-builder。 | 1. cookie `sb-pa-locale`、`sb-pa-merchant-id`、`sb-pa-project-id`：Path=`/`，SameSite=Lax，10 天。Domain 按当前 `location.hostname` 决定（`getCookieParams`，按顺序匹配）：含 `.xsolla.com` → `.xsolla.com`；否则含 `xsolla.com` → `xsolla.com`；否则含 `.srv.local` → `.srv.local`；否则不设 Domain（host-only）。记录 stage hostname 与实际 Domain，二者必须符合此规则。2. 切换项目时 remote 以新 key 重挂载（再次进入 loading）。 | P2 | `layouts/SiteBuilder/index.tsx`；`core/utils/cookie.ts:101-118`；勘误 E-11（PARTIAL 修正） `[P3]` | — |
| RT-MF-027 | network：只传 token，其余走 cookie | owner；B：viewer | 1. owner 打开 `/{m}/projects/{p}/network`。2. 检查 props 与 cookie。3. viewer 打开同一路由。 | 1. props 只有 `token`、`basename`。2. cookie `network-pa-locale/merchant-id/project-id`：host-only，无 Secure。3. viewer → 被路由拒绝（T2）。 | P2 | `layouts/network/index.tsx`；`routes/inside/network.ts` | — |
| RT-MF-028 | subscriptions | `ProjectSettings`，非 gnation | 通用步骤；`/{m}/projects/{p}/subscriptions` | props 同时含 `merchantId/projectId`（字符串）与 `merchant_id/project_id`（number），`isSeparatedDevMode=false`。remote 自身收到 401 时按其逻辑跳转（不由 host 处理）。 | P1 | `layouts/subscriptions/index.tsx` | — |
| RT-MF-029 | xaa_widgets：Dashboard 与 analytics | 有 `GetMetricBalance` 的 owner | 1. 打开 `/{m}/dashboard`。2. 打开 `/{m}/analytics/payments`，切换 today/payments/taxes 页签。3. 打开其他 6 个 analytics 板块。 | 1. Dashboard 中 `componentName='DashboardWebGames'`。2. 切换页签时以新 `componentName` 重挂载（`key`），不重新请求 remoteEntry。3. 各板块 `componentName` 为 `CatalogWebGames`、`UsersWebGames`、`LoginWebGames`、`WebShopWebGames`、`SupportWebGames`、`AFSWebGames`、`BlocklistWebGames`。4. props `tokenJWT`、`currencyISO`、`navigate`。 | P1 | OBS-DASH；`layouts/advanced-analytics/index.tsx:22-139` | `src/layouts/advanced-analytics/index.test.tsx` |
| RT-MF-030 | disputes（chargeback registry） | owner | 通用步骤；`/{m}/analytics/main-info/afs/chargeback-registry` | `exposedModule` 来自配置 `./app`（小写）；props 只有 `locale, token, merchant_id, basename`。 | P1 | `ChargebackRegistry.tsx`；`modules/config.ts:53-60` | `src/modules/config.test.ts`、`ChargebackRegistry.test.tsx` |
| RT-MF-031 | finance：registry/payouts 保活，reports 独立挂载 | 有 `transactions_registry`、`get_transfers`、`get_reports` | 1. 打开 `/{m}/finance`。2. 切到 payouts 页签，再切回。3. 打开 `/{m}/finance/reports`。 | 1. 第 2 步来回切换不重新挂载 remote（registry pane 只隐藏），不重复请求 remoteEntry。2. payouts pane 的 loading 显示 `PayoutsRemoteLoading`。3. reports 页 `rootURL=/{m}/finance`，`routePath` 去掉 `/reports`。 | P1 | `layouts/finance/container.tsx:52-119`；`reports.tsx:12-31` | `src/layouts/finance/*.test.tsx`（未逐条核对标题） |
| RT-MF-032 | funding：nav + App 同 container 正常加载 | owner | 1. 打开 `/{m}/funding`。2. 打开 `/{m}/projects/{p}/funding`。 | 1. **只有 1 次** funding remoteEntry 请求（第二个调用者轮询等待）。2. 只显示 App 的一个 spinner（nav 的 `loadingFallback=null`）。3. nav 的 `root`：merchant 级为 `/funding`；store 中有当前项目时为 `/projects/{p}/funding`。 | P1 | `layouts/Funding/index.tsx:96,115-130`；`loadModule.ts:22-31` `[P3]` | `src/modules/loadModule.test.ts`（"polls every 50ms…"） |
| RT-MF-033 | login remote（项目级） | owner；B：viewer | 1. owner 通用步骤；`/{m}/projects/{p}/login`。2. 在 remote 内触发一次内部导航。3. viewer 打开同路由。 | 1. container `login`，静态回退 URL 为 `login-pa-module.gcp-k8s-login-stage.srv.local`。2. remote 调用 `history.push('/for/web-games/account/…')` 时，host Proxy 去掉 basename 前缀，地址栏不出现重复前缀。3. viewer 被拒绝（T2）。 | P1 | `layouts/login/index.tsx:1-34` | — |
| RT-MF-034 | Dashboard 中 xaa 加载失败不影响余额区 | 同 RT-MF-029 | 屏蔽 xaa_widgets remoteEntry（Request blocking）后打开 `/{m}/dashboard` | 余额区正常显示；XAA 插槽显示未本地化的 `Failed to load: <url>`。 | P1 | OBS-MF-002；`pages/Dashboard.tsx:175-177` | — |

#### 4.1.3 失败、超时与配置异常（适用于所有 MF1 remote）

模拟方法见第 5 节。下列用例对第 2 节 #1–#23 的每个 MF1 remote 都适用；回归时至少覆盖 storefront（#7）、finance（#21）、xaa_widgets（#19），以及一个有静态回退的 remote（#1、#3 或 #20）。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-040 | remote 不可达 | 能打开目标路由的账号 | 1. 从 Network 复制该 remote 的 remoteEntry URL，去掉 `?v=` 部分，加入 Request blocking。2. 硬刷新路由。 | 1. remote 区域显示无样式、未本地化的 `<p>Failed to load: <url></p>`，`<url>` 不含 `?v=`。2. 没有超时、没有重试按钮。3. 侧边栏、顶栏可用。4. `<head>` 中留下失败的 `<script>`。 | P1 | OBS-MF-002；`loadModule.ts:54-57`；`RemoteModule.tsx:115-121` | `src/modules/RemoteModule.test.tsx`（"shows the error message…"）；`loadModule.test.ts`（"rejects with the plain url…"） |
| RT-MF-041 | remote 返回 404 | 同上；DevTools Local overrides 或 Requestly | 1. 覆盖 `/api/v1/modules` 响应：把目标条目的 `urls.stage` 改成同主机下不存在的路径，例如 `…/remoteEntry-404.js`。2. 硬刷新。 | 与 RT-MF-040 相同，`<url>` 为改后的路径。 | P1 | OBS-MF-002 | — |
| RT-MF-042 | 脚本 200 但不是该 container | 同上 | 覆盖 `/api/v1/modules`：把 storefront 的 `urls.stage` 改成 player-platform 的 remoteEntry URL；硬刷新 storefront 路由。 | 等待约 100 ms 后显示 `<p>Remote container '<storefront 的 container>' not found</p>`。 | P2 | `loadModule.ts:74-76` | `loadModule.test.ts`（"rejects with the unmapped scope name…"） |
| RT-MF-043 | 加载超时（无超时机制） | 同 RT-MF-040 | 1. Network → 自定义 throttling profile：latency 120000 ms（只在打开 remote 路由前启用）。2. 打开路由，等待 2 分钟。 | 1. 整个等待期间只显示 spinner，没有超时提示。2. 浏览器最终放弃请求时（时间由浏览器决定）显示 `Failed to load: …`；若请求最终成功，则正常渲染。3. 等待期间 host 导航可用。 | P1 | §8.2；`loadModule.ts:39-60` | — |
| RT-MF-044 | gateway 缺少条目，回退静态 URL | 同上 | 覆盖 `/api/v1/modules`：删除 `cloud-gaming` 条目；打开 cloud-gaming 路由。 | 请求静态 URL `https://cloudgaming-publisher-tools-stage.web.app/dashboard/remoteEntry.dashboard.js?v=…`，remote 正常渲染。对 `player-platform`、`sdk-integration`、`offerwall`、`disputes`、`login` 同理。 | P1 | OBS-MF-001 第 1 步；`RemoteModule.tsx:50-63` | `RemoteModule.test.tsx`（"uses the static config when the backend has no entry…"） |
| RT-MF-045 | gateway 条目 `scope` 为占位值 `"string"` 或空 | 同上 | 覆盖：把 `cloud-gaming` 的 `scope` 改为 `"string"`，再改为 `""`。 | 两次都回退静态配置并正常渲染。 | P2 | `RemoteModule.tsx:57` | `RemoteModule.test.tsx`（"falls back to the static config when the backend scope is…"） |
| RT-MF-046 | gateway-only remote 缺少条目：永久 spinner | 同上 | 覆盖：删除 `funding`（或 `storefront`、`xaa_widgets`）条目；打开对应路由并等待 1 分钟。 | spinner 一直保留，直到模块列表变化；没有错误文本，也没有 remoteEntry 请求。`loadingFallback={null}` 的调用方（funding `./nav`）区域保持空白。 | P1 | OBS-MF-001 第 2 步；§8.2；`RemoteModule.tsx:65-68` `[P3]` | `RemoteModule.test.tsx`（"stays on the spinner and loads nothing when no config exists"） |
| RT-MF-047 | gateway 条目没有 `stage` key | 同上 | 覆盖：把 storefront 的 `urls` 改为只有 `{"dev": "<原 stage URL>"}`。 | MF1 显示 `<p>Remote URL not found for scope: <scope></p>`。对比：MF2 的 `resolveModuleUrl` 会接受 `dev`（见 RT-MF-074）。 | P2 | U-05；`RemoteModule.tsx:74-75`；`loadModule.ts:33-35` | `loadModule.test.ts`（"rejects with the scope name when the url is empty"） |
| RT-MF-048 | 失败后离开再返回会重试 | RT-MF-040 的状态 | 1. 在失败页面取消 Request blocking。2. 用侧边栏离开，再返回该路由（不刷新）。 | 重新注入新 `?v=<uuid>` 的 script 并成功渲染。 | P2 | `loadModule.ts:55` | `loadModule.test.ts`（"allows a retry script after a failed load"） |
| RT-MF-049 | 缓存击穿：每次重新加载都换 uuid；同会话复用 container | 任一 remote | 1. 打开 storefront，记下 `v=`。2. 离开再返回（不刷新）。3. 硬刷新。 | 1. 第 2 步没有新的 remoteEntry 请求。2. 第 3 步 `v=` 值变化，响应不来自缓存（Size 列不是 disk cache）。 | P2 | §8.2；`loadModule.ts:41-43` | `loadModule.test.ts`（"uses a fresh random uuid…"） |
| RT-MF-083 | OBS-MF-002：错误文案不止 4 种（原始 Error message） | 能打开 storefront 路由的 owner；DevTools Local overrides 或 Requestly | 1. 覆盖 `/api/v1/modules`：把 storefront 条目的 `module` 改为 `./DoesNotExist`（storefront 调用方不传 `exposedModule`，所以使用 gateway 的 `module`）。2. 硬刷新 storefront 路由，记录 remote 区域的文本。 | 1. remote 区域显示无样式、未本地化的 `<p>`，内容是 container 抛出的原始 `Error` message（例如 `Module "./DoesNotExist" does not exist in container.`，具体文字由 remote 的 webpack runtime 决定）。它不是 `Failed to load:`、`Remote URL not found for scope:`、`Remote container '…' not found`、`Unknown error` 中的任何一种。2. 侧边栏、顶栏可用。<br>判定规则：错误文本不限于固定清单。其他来源只由代码确认，stage 上无法构造：`No component exported from {scope}/{module}`（factory 返回空值；文案中的 module 取自配置，不是 `exposedModule`）；`Unknown error`（只在抛出的不是 `Error` 时出现） | P2 | OBS-MF-002；`RemoteModule.tsx:86-101`；`loadModule.ts:90-93` [P4] | `RemoteModule.test.tsx`（"shows the error message when the remote entry fails"、"shows \"Unknown error\" when the failure is not an Error"）；`No component exported` 与 container 原始错误没有单测 |

#### 4.1.4 并发加载（S-02）

S-02 只在**同一页面**内触发：`loadingScopes` 是页面内的模块级变量（`loadModule.ts:3`）。两个浏览器 tab 各自有独立的 window，互不影响。所以下面用 RT-MF-052 覆盖"两个 tab 并发"，用 RT-MF-050/051 复现真正的 S-02。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-050 | S-02 定向复现：funding nav + App 同时挂载时加载失败 | owner | 1. 先打开 `/{m}/funding`，从 Network 记下 funding remoteEntry URL。2. 把该 URL 加入 Request blocking。3. 硬刷新 `/{m}/funding`，等待 30 s。4. 在 Elements 中查看 funding 的 nav 区域与 App 区域。 | **当前（缺陷）**：nav 位置显示 `<p>Failed to load: <url></p>`；App 位置**永久 spinner**，30 s 后仍在。**修复后**：App 也显示错误或可重试，不允许永久 spinner。 | P1 | S-02；`loadModule.ts:22-31`；`Funding/index.tsx:115-130` `[P3]` | — （`loadModule.test.ts` 只测成功轮询，未固定失败分支） |
| RT-MF-051 | S-02 的轮询泄漏 | RT-MF-050 的状态 | 1. 保持屏蔽，在侧边栏离开 funding 页。2. Performance 面板录制 5 s。 | **当前**：离开后仍每 50 ms 执行一次 `setInterval` 回调（interval 未在卸载时清理）。修复后不再有该定时器。 | P2 | S-02；`loadModule.ts:24-29` | — |
| RT-MF-052 | 两个 tab 同时加载同一 remote | owner | 1. 同时在两个 tab 打开 `/{m}/projects/{p}/storefront`（或一个 tab 刷新时另一个 tab 也刷新）。2. 在 tab A 屏蔽 remoteEntry 后刷新 A。 | 1. 两个 tab 各发一次 remoteEntry 请求，`v=` 不同，都正常渲染。2. tab A 失败只影响 A；tab B 不受影响。 | P2 | S-02 适用范围；`loadModule.ts:3` | — |
| RT-MF-053 | 同页并发成功：只请求一次脚本 | owner | 打开 `/{m}/funding`，过滤 Network | funding remoteEntry 只请求 1 次，nav 与 App 都渲染。 | P1 | `loadModule.ts:22-31` | `loadModule.test.ts`（"polls every 50ms and resolves once the container appears"） |
| RT-MF-054 | webhooks 页 payments 页签与高级设置是否同时挂载（待确认） | `ProjectSettings` | 1. 打开 `/{m}/projects/{p}/edit/webhooks/payments`（确切子路径以 SDK 页面为准，**待确认**）。2. 若测试页签与高级设置同时可见：屏蔽 payments remoteEntry 后硬刷新。 | 若两者同时挂载：与 RT-MF-050 相同的 S-02 表现（一个错误文本 + 一个永久 spinner）。若不同时挂载：记录"不适用"。 | P2 | S-02；`webhookRemotes.tsx:139-195`；`AdvancedSettingsRemote.tsx` | — |
| `[分支差异]` RT-MF-050 | 分支中 S-02 已修复 | — | 同 RT-MF-050 | 分支中两个调用者共享同一个 promise（`@platform-base/shell@0.8.0 remote-module.mjs:46-73`），都 reject；失败时组件渲染 `null`（`:255-256`），页面上**不显示**错误文本，也不显示 spinner。需要确认这一空白区域是否为产品可接受的降级。 | — | — | — |

#### 4.1.5 子路径透传与刷新后深链接

除 `sdk/integration`、analytics 各板块、chargeback registry、marketplace、ontology、frame 外，remote 路由默认不是 `exact`（`routes/createRoute.ts:22,46`），子路径会一直挂载同一 layout，由 remote 自己的路由处理。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-060 | 子路径透传（非 exact 路由） | 各 remote 的前置账号 | 逐个打开：`/{m}/projects/{p}/storefront/promotions`、`/storefront/daily-rewards`、`/{m}/support/transactions`、`/{m}/finance/reports/download/<session>`、`/{m}/communication-hub/<任意>`、以及 payments、subscriptions、site-builder、cloud-gaming、offerwall、player-platform、launchers、new-launcher、network、login、gold、link、metaframe、funding 的任意二级路径 | 1. URL 保持不变（不跳 `/not-found`）。2. 同一 remote 挂载，`rootURL` 仍为 remote 根（例如 `/{m}/projects/{p}/storefront`），不是子路径。3. remote 是否渲染对应子页面由 remote 决定（**待确认**每个 remote 的子路由表）。 | P1 | AC-08；`createRoute.ts:46` | — |
| RT-MF-061 | 刷新后深链接 | 同上 | 在 RT-MF-060 的每个子路径上硬刷新（Cmd+Shift+R） | 1. BFF 返回 HTML（不是 404）。2. 依次请求 `/api/v1/modules` 与 remoteEntry（新 `v=`）。3. 回到同一子路径，remote 渲染同一子页面。 | P1 | `platform-bff@1.0.0 dist/index.mjs:385-…`（`/for/:site/*` 返回 HTML）[I] | — |
| RT-MF-062 | exact 路由不透传：sdk/integration | owner | 打开 `/{m}/projects/{p}/sdk/integration/step-2` | 跳到 `/not-found`（或项目级 not-found 处理，T2），不请求 sdk-integration remoteEntry。 | P2 | `routes/inside/projects.ts:173` | — |
| RT-MF-063 | analytics 旧链接带 query 跳转 | owner | 打开 `/{m}/analytics/products/site-builder?from=2026-01-01` | URL 变为 `/{m}/analytics/web-shop?from=2026-01-01`，挂载 `WebShopWebGames` 板块。 | P2 | `advanced-analytics/index.tsx:88-108` | `scenarios.ts` I12 |

#### 4.1.6 MF 2.0：Communication Hub

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-070 | MF2 正常加载 | owner；gateway `communication_platform` 的 URL 以 `remoteEntry.js` 结尾，且 `/v2/mf-manifest.json` 已发布（**待确认**） | 1. Network 过滤 `mf-manifest`、`remoteEntry`。2. 打开 `/{m}/communication-hub`。 | 1. 请求 `<gateway 目录>/v2/mf-manifest.json`（保留原 query）。2. **不**请求 MF1 `communication_platform` 的 remoteEntry。3. Console 没有 `[mf-runtime]` 警告。4. props 含 `accountId='web-games'`、`merchantId` 来自路由、`locale`。 | P1 | OBS-MF-003；`registerGatewayRemotes.ts:28-34`；`CommunicationHub.tsx:17-50` | `CommunicationHub.test.tsx`；`registerGatewayRemotes.test.ts` |
| RT-MF-071 | AC-11：manifest 不可达时回退 MF1 | 同上 | 1. Request blocking：`*/v2/mf-manifest.json`。2. 硬刷新 `/{m}/communication-hub`。 | 1. Console 出现 `[mf-runtime] communication_platform_v2/SupportHubV2 failed to load, falling back to MF1 module "communication_platform"`。2. 随后请求 MF1 remoteEntry（`?v=uuid`），hub 渲染。3. MF1 使用 gateway `module`（若不是 `./SupportHubV2`，渲染的组件可能不同，记录结果，U-05）。 | P1 | AC-11；`createRemoteApp.tsx:31-58` | — （`createRemoteApp.test.tsx` 全是 `it.todo`） |
| RT-MF-072 | MF2 manifest 挂起：无超时 | 同上 | throttling latency 120000 ms 只作用于 manifest（可用 Requestly "Delay"规则只延迟该 URL） | manifest 返回前一直 spinner，不触发回退（manifest fetch 没有超时：`runtime-core@2.9.0 plugins/snapshot/SnapshotHandler.js:140-170`）。 | P2 | OBS-MF-003；§8.2 MF 2.0 行 `[P3]` | — |
| RT-MF-073 | MF2 remoteEntry 超时 20 s 后回退 | 同上 | 用 Requestly 只延迟 manifest 中列出的 remoteEntry（60 s） | 约 20 s 后触发回退到 MF1（`@module-federation/sdk@2.9.0 dist/dom.js:19,94-99`）：Console 出现回退警告，随后请求 MF1 remoteEntry 并渲染 hub。 | P2 | OBS-MF-003（v2 `remoteEntry` 20 s 超时为回退条件之一）；§8.2 `[P3]` | — |
| RT-MF-074 | gateway URL 不以 `remoteEntry.js` 结尾：跳过注册 | 同上 | 覆盖 `/api/v1/modules`：把 `communication_platform` 的 URL 改为 `…/entry.js` | 1. 启动时 Console：`[mf-runtime] skipping remote "communication_platform_v2" (module "communication_platform"): remoteEntry URL "…" has no manifest mapping`。2. 打开 hub：直接回退 MF1。 | P2 | `registerGatewayRemotes.ts:43-56` | `registerGatewayRemotes.test.ts`、`src/mf/index.test.ts` |
| RT-MF-075 | MF2 与 MF1 都不可达 | 同上 | 同时屏蔽 manifest 与 MF1 remoteEntry | 先打印回退警告，然后显示 `<p>Failed to load: <MF1 url></p>`。 | P2 | OBS-MF-002/003 | — |
| RT-MF-076 | 加载阶段失败与 `provider.render` 同步抛错时回退 MF1 | 需要能修改 v2 产物的环境：Local overrides 覆盖 `mf-manifest.json` 或 v2 expose chunk（**待确认**可行性） | a) 覆盖 manifest，删除 `./SupportHubV2` expose（export 缺失）。b) 覆盖 v2 chunk，让 bridge `provider.render` 在调用时**同步** `throw`。每次硬刷新 `/{m}/communication-hub`。 | a、b 都回退：bridge 的 ErrorBoundary 进入 `fallbackRender`，渲染 MF1 `communication_platform`；Console 有 `[mf-runtime] … falling back to MF1` 警告。remote 自身 React 树内的渲染错误**不**在本用例范围，见 RT-MF-082（U-11）。 | P2 | OBS-MF-003（export 缺失、`provider.render` 同步抛错）；勘误 E-09（PARTIAL 修正）；`createRemoteApp.tsx:19,45-59`；`bridge@0.0.2 RemoteAppWrapper-hOF0XI8X.js:253,323-336` `[P3]` | — |
| RT-MF-077 | `/support-hub` 旧路径 | owner | 打开 `/{m}/support-hub` | URL 变为 `/{m}/communication-hub`。 | P2 | `routes.tsx:64-66,102` | `scenarios.ts` I11 |
| RT-MF-082 | **[U] U-11**：v2 remote 自身 React 树内的渲染错误是否回退 MF1 | 同 RT-MF-076；需 chat 团队配合提供可注入故障的 v2 构建（**待确认**） | 让 SupportHubV2 挂载成功后，在其内部某个子组件 render 中抛错（不是 `provider.render` 同步抛错） | **结果未知（[U]）**，只记录实际行为：a) 是否出现 `[mf-runtime] … falling back to MF1` 警告并渲染 MF1；b) 或 hub 区域空白/remote 自己的错误 UI，且 host 外壳仍可用。理由：remote 渲染在自己的 React root 中，host 的 ErrorBoundary 不一定捕获。结果回填 U-11。 | P2 | OBS-MF-003 末句；U-11；勘误 E-09（PARTIAL 修正） `[P3]` | — |
| `[分支差异]` RT-MF-070…076、082 | 分支中没有 MF2 | — | — | 分支 CommunicationHub 直接用 MF1 `RemoteModule name="communication_platform"`；RT-MF-070…076、RT-MF-082 不适用。 | — | — | `packages/@platform-templates/layouts/src/__tests__/remotes-props.test.tsx` |

#### 4.1.7 配置残留（S-06、S-12、S-13、S-17）

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-MF-080 | S-12/S-13：window 变量名不一致但无运行时影响 | owner；项目可见 gold、link | 1. Console：`[window.GoldModuleUrl, window.goldModuleUrl, window.LinkModuleUrl, window.linkModuleUrl]`。2. 打开 `/{m}/projects/{p}/gold` 与 `/link`（admin）。 | 1. 当前：大写变量可能为 `undefined`（gateway `module_id` 是 `xsolla-gold`/`xsolla-link`，与映射 key `gold`/`link` 不同），小写变量为 `undefined`。2. 两个 remote 照常加载（RemoteModule 不读取 window 变量）。结论：S-12/S-13 只是死配置。 | P2 | S-12、S-13；`modules/config.ts:67-86`；`webpack.base.config.ts:267-286` | `src/modules/config.test.ts` |
| RT-MF-081 | S-17：stage 构建不受影响 | owner | 打开 sdk-integration，检查 remoteEntry 主机 | stage 上主机不是 `*.web.app`（见 RT-MF-014）。S-17 只影响 `APP_ENV=development` 的本地构建：本地 dev 会加载 **prod** widget；需代码修复或修正注释（静态检查 `config.ts:47-53`）。 | P2 | S-17 | `src/modules/config.test.ts`（未覆盖 development 值） |

### 4.2 FRAME：iframe

#### 4.2.1 IntegrationFrame 与 allowlist

allowlist 完整规则（`pages/IntegrationFrame/available-domains.ts:5-13`）：`url.startsWith(key)`，key 为以下 4 个**不带结尾 `/`** 的字符串，区分大小写，只认 `https`：

- `https://developers.xsolla.com`
- `https://xsollapa.typeform.com`
- `https://docs.unrealengine.com`
- `https://docs.unity3d.com`

由此可绕过的形式（spec 0.3.0 S-03 列出的 4 种，都以 key 开头）：后缀域名 `https://developers.xsolla.com.evil.tld/`、拼接域名 `https://developers.xsolla.comevil.tld/`、userinfo `https://developers.xsolla.com@evil.tld/`（实际主机为 `evil.tld`）、端口 `https://developers.xsolla.com:8443/`（同主机不同端口）。误拒的形式：大写主机、`http://`、前导空格。

前置数据：需要一张有 integration guide 的 sales card（`cardId`）及其步骤（`stepId`），可用 `GET /mapi/merchant/merchants/{m}/salescards/{cardId}` 查看；stage 上的卡片 id **待确认**，需要 backend 协助准备。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-FRAME-001 | 允许域名正常嵌入 | owner；card `C` 的步骤 `S` 的 url 以 `https://developers.xsolla.com/` 开头 | 打开 `/{m}/frame/documentation?upsell-card-id=C&upsell-step-id=S` | 1. 先显示全屏 loader，同时请求 `GET …/salescards/C`。2. 渲染 `<iframe class="integration-frame…" src="<step.url>" frameborder="0" title="integration-guide">`，**没有** `sandbox` 属性。 | P1 | OBS-FRAME-001；`pages/IntegrationFrame/index.tsx:22-60` | `IntegrationFrame/index.test.tsx`（"embeds the allowed URL…"） |
| RT-FRAME-002 | **S-03 定向**：allowlist 的 4 种绕过方式（后缀子域、userinfo、拼接主机、端口） | 同上；DevTools Local overrides（Override content）或 Requestly "Modify Response" | 1. 对 `…/salescards/C` 的响应做 override，把步骤 `S` 的 `url` 依次改为：a) 后缀子域 `https://developers.xsolla.com.example.org/x`；b) userinfo `https://developers.xsolla.com@example.org/x`；c) 拼接主机 `https://developers.xsolla.comexample.org/x`；d) 端口 `https://developers.xsolla.com:8443/x`。2. 每次刷新 RT-FRAME-001 的 URL。3. Elements 面板查看是否出现 `<iframe>` 及其 `src`；Network 查看 iframe 文档请求的实际主机与端口。 | **当前（缺陷，预期失败项）**：四种情况都渲染 `<iframe src=…>`。b) 实际主机为 `example.org`；d) 实际 origin 为 `https://developers.xsolla.com:8443`，不是 allowlist 中的默认端口 origin。域名不解析或端口不通时 iframe 内为网络错误页，但 DOM 中已有 iframe，判定为已复现。**期望**：四种情况都保持 loader，不渲染 iframe（AC-10 明确覆盖 a、b；c、d 按 S-03 同一规则判定）。 | P1 | S-03（4 种形式）；AC-10；OBS-FRAME-001；`available-domains.ts:12-13` `[P3]` | — （`available-domains.test.ts` 未覆盖这 4 种形式） |
| RT-FRAME-003 | 非 allowlist 域名 | 同上 | override `url` 为 `https://example.com/` | 永久全屏 loader，无错误文本，无 iframe。 | P1 | OBS-FRAME-001 | `index.test.tsx`（"keeps the loader instead of embedding…"）；`available-domains.test.ts` |
| RT-FRAME-004 | 误拒：大写主机或 http | 同上 | override `url` 为 `https://Developers.Xsolla.com/doc`，再改为 `http://developers.xsolla.com/doc` | 两次都保持 loader（区分大小写、只认 https）。记录为已知限制。 | P2 | `available-domains.test.ts:51-63` | `available-domains.test.ts` |
| RT-FRAME-005 | 缺少 query 参数 | owner | 打开 `/{m}/frame/documentation`、`?upsell-card-id=C`、`?upsell-step-id=S` | 三种都永久 loader，**不发**salescards 请求。 | P2 | `index.tsx:23-28` | — |
| RT-FRAME-006 | card 请求 4xx / 5xx / 网络失败 / 401 | owner；Requestly 改状态码 | 分别把 `…/salescards/C` 改为 404、500、屏蔽、401 | 404/500/屏蔽：永久 loader，无提示，不跳转。401：先 loader，约 2 s 后跳 `{B}/logout`。 | P1 | OBS-FRAME-001；`gateway-instance.ts:80-119` | `index.test.tsx`（"keeps the loader and handles the failure…"） |
| RT-FRAME-007 | 步骤不存在或无 url | owner | 用不存在的 `upsell-step-id`；再 override 步骤去掉 `url` | 都保持 loader。 | P2 | `index.tsx:36-41` | `index.test.tsx`（两条） |
| RT-FRAME-008 | `frame_path` 被忽略 | owner | 把 `documentation` 换成 `anything` 与 `int-feedback` | 行为与 RT-FRAME-001 相同；`ROUTES_OF_AVAILABLE_DOMAINS` 的 value（`documentation` 等）不参与匹配。 | P2 | `index.tsx:17-49` | — |
| RT-FRAME-009 | 同页修改 query 重新加载 | owner；两张卡 | 1. 打开卡片 1 的 frame URL。2. 在地址栏把 `upsell-card-id` 改为卡片 2 并回车（整页加载）。 | 请求卡片 2 并嵌入其步骤。说明：同页 query 变化时丢弃旧响应的分支只能在单测中验证，stage 手工无法稳定触发。 | P2 | `index.tsx:46-49` | `index.test.tsx`（"ignores a stale response…"） |
| RT-FRAME-010 | **S-20 / AC-13 定向（预期失败项）**：Upsell 弹窗跳转丢失 basename | owner/developer；merchant 数 >1 或项目数 >1；`utm_campaign=X` 能查到 1 张 `integrationGuideExist=true` 的卡，且当前步骤 url 含 `developers.xsolla.com` | 1. 打开 `/{m}/dashboard?utm_campaign=X`。2. 弹窗中点一个项目。3. 记录最终地址栏 URL 与页面内容。4. 换用 `integrationGuideExist=false` 的卡（或 assign 返回空）重复 1–3。 | **当前（缺陷，预期失败项）**：`window.location.replace('/{m}/frame/documentation?upsell-card-id=…&upsell-step-id=…')`，路径没有 `/for/web-games/account` 前缀，浏览器离开本 app，落到 `https://<stage-host>/{m}/frame/…`。第 4 步跳 `/{m}`，同样没有前缀。根级 `/{m}/…` 返回什么是 U-12，第 3 步记录结果并回填 U-12。**期望（AC-13）**：跳到 `{B}/{m}/frame/documentation?…`（第 4 步跳 `{B}/{m}`）。 | P1 | S-20；AC-13；OBS-DASH-005 第 4 步；U-12；`core/utils/upsell.ts:19-45`；`UpsellModal/index.tsx:71-90`；`core/utils/url.ts:41-44` `[P3]` | — （单测断言无 basename 的 `'/42'`，固定了缺陷） |

#### 4.2.2 Marketplace 与 Ontology

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-FRAME-020 | marketplace iframe | 任一有 merchant 访问权的账号（无 privilege 要求） | 1. 打开 `/{m}/marketplace`。2. Elements 检查 iframe。3. 打开 `/{m}/marketplace/x`。 | 1. `<iframe title="Xsolla Marketplace" src="https://xsolla.partnerpage.io/integrations">`，无 sandbox，URL 中无 token/merchant。2. 第 3 步跳 not-found（exact）。 | P2 | `layouts/marketplace/index.tsx`；`routes.tsx:117` | `layouts/marketplace/index.test.tsx` |
| RT-FRAME-021 | marketplace 不可达 | 同上 | 屏蔽 `xsolla.partnerpage.io` 后刷新 | iframe 内显示浏览器错误页；host 外壳正常；无 host 侧提示。 | P2 | 同上 | — |
| RT-FRAME-030 | ontology 正常 | merchant 有 `ontology` feature，且当前 business account 的 subsite visibility 含 `ontology`；gateway 有 https 的 ontology URL | 1. 打开 `/{m}/ontology`。2. Elements 检查 iframe `src`。3. Network 选中 iframe 文档请求，查看 Request Headers 中的 Cookie。 | 1. `src = <gateway URL 去掉 ?uuid 与结尾 />/?merchantId=<m>`。2. 无 sandbox。3. 请求带 `pa-v4-token`（BFF cookie：HttpOnly、Lax，stage `Domain=.srv.local` 时同站发送；**待确认** ontology 主机是否在 `.srv.local` 下）。 | P1 | OBS-FRAME-002；`layouts/ontology/index.tsx:12-48`；`platform-bff@1.0.0 dist/index.mjs:13-27` | `layouts/ontology/index.test.tsx` |
| RT-FRAME-031 | ontology 未启用 | A：merchant 无 `ontology` feature；B：subsite 未启用 module | 分别打开 `/{m}/ontology` | 先空白（loading 时渲染 `null`），然后 URL 变为 `/{m}`。 | P1 | OBS-FRAME-002 | `index.test.tsx`（"redirects to the merchant home page"） |
| RT-FRAME-032 | ontology URL 缺失或非 https | 同 RT-FRAME-030；Local overrides | 覆盖 `/api/v1/modules`：删除 `ontology` 条目；再改为 `http://…` | 页面显示英文（未本地化）`Ontology is not available right now.`，`role="alert"`，无 iframe。 | P2 | OBS-FRAME-002；S-32（文案未国际化）；`index.tsx:38-44`；`@platform-base/api@1.5.0 index.mjs:667-691` `[P3]` | `index.test.tsx`（"shows the unavailable message…"） |
| RT-FRAME-033 | ontology 依赖请求失败时直接重定向 | 同 RT-FRAME-030 | 屏蔽 accounts 列表请求或 subsite 请求（SDK `loadAccounts`/`loadSubSite`，具体 URL 用 Network 识别，**待确认**） | `isLoading` 变为 false、`isEnabled` 为 false → 重定向到 `/{m}`，没有错误提示。 | P2 | `core/hooks/useOntologyAccess.ts:65-71` | — |
| RT-FRAME-034 | ontology 切换 merchant | 两个 merchant 都启用 ontology | 在 ontology 页通过顶栏切换 merchant | iframe 以新 `merchantId` 重挂载。 | P2 | `index.tsx:48`（`key=merchantId`） | `index.test.tsx`（"remounts the iframe…"） |
| RT-FRAME-035 | ontology 无 session 文案 | 需要 feature 已启用但 token 为空的状态（stage 上难以构造，**待确认**） | — | 显示英文 `You need to sign in to open Ontology.`。 | P2 | OBS-FRAME-002；S-32（文案未国际化）；`index.tsx:31-37` `[P3]` | `index.test.tsx`（"asks the user to sign in…"） |

#### 4.2.3 postMessage

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-FRAME-040 | host 自身不监听 `message` | owner | 在 IntegrationFrame、marketplace、ontology 页面的 Console 执行 `getEventListeners(window).message` | 返回 `undefined` 或只来自第三方脚本（LiveChat、浏览器扩展）；没有来自 host bundle 的监听。向页面 `postMessage` 任意数据无可见效果。 | P2 | OBS-FRAME-003 | — |
| RT-FRAME-041 | Tax interview 的 `exitConfirmed` 协议与 origin 校验 | merchant 的 tax interview 状态为 `incomplete`，页面显示 iframe | 1. 打开 `/{m}/tax-interview`。2. 在顶层 Console 执行 `window.postMessage('exitConfirmed','*')`。3. Console 上下文切换到 tax iframe，执行 `parent.postMessage('exitConfirmed','*')`。4. 再在 iframe 上下文发送 `parent.postMessage('other','*')`。 | 2：无效果（origin 是 host，不等于 iframe URL 的 origin）。3：iframe 重新加载（先显示 spinner，`iframeKey+1`），发送一次 exit 点击埋点。4：无效果。 | P2 | `platform-pages@3.25.2 dist/index.mjs:94-111` | — |
| RT-FRAME-042 | Documents（`DocumentCenterDocuments`）上传消息：`/documents` 与 `/finance/boxnet` 两个入口 | 有 `get_merchant_boxnet_url` | 1. 打开 `/{m}/finance/boxnet`。2. 在 iframe 上下文执行 `parent.postMessage({event:'uploadSuccess',file_id:'1'},'*')`、`parent.postMessage('uploadError','*')`。3. 在顶层上下文发送同样消息。4. 打开 `/{m}/documents`，重复 2–3。 | 2：只发送埋点（Network 中出现对应 analytics hit），UI 不变，iframe 不重新加载。3：被 origin 校验忽略，无埋点。4：与 `/finance/boxnet` 相同（同一 SDK 页面）。 | P2 | OBS-FRAME-003（新增 `/{m}/documents` 路由）；`platform-pages@3.25.2 dist/index.mjs:7854-7920`；`routes.tsx:134-138` `[P3]` | — |

### 4.3 API：本地 endpoint

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-API-001 | 余额成功 | owner，有 `GetMetricBalance` | 打开 `/{m}/dashboard`，过滤 `metrics/balance` | 请求带 `Authorization: Bearer …`、`Business-Account-Id: web-games`。先显示骨架，然后显示货币符号 + 两位小数（千分位为空格），以及上次/下次 payout 日期；`is_next_transfer_date_calculated_approximately=true` 时下次日期旁有提示图标。 | P1 | OBS-DASH；`DashboardBalance/index.tsx:21-95`；`core/apis/dashboard.ts:36-41` | — |
| RT-API-002 | 余额 4xx（403/404） | 同上；Requestly | 把响应改为 403，再改为 404 | 余额与两个日期都显示 `—`；顶部显示 AskAi 横幅（不是欢迎标题）；**不**登出。 | P1 | `Dashboard.tsx:86-89`；`gateway-instance.ts:77-80` | `scenarios.ts` I7（403 不登出，通用） |
| RT-API-003 | 余额 5xx / 网络失败 | 同上 | 改为 500；再用 Request blocking | 同 RT-API-002；RTK Query 不自动重试。离开再返回 Dashboard 时是否重发请求（`gcApi` 用默认缓存策略），记录结果，**待确认**。 | P1 | `core/store/api.ts:37-45` | — |
| RT-API-004 | 余额 401 | 同上 | 改为 401 | 约 2 s 后跳 `{B}/logout`，只跳一次；Console 打印 `[Gateway Auth] Token validation failed`，含 token 前 20 字符（stage 日志暴露，§8.1）。 | P0 | OBS-AUTH-005；`gateway-instance.ts:80-119` | `scenarios.ts` I6 |
| RT-API-005 | 无余额 privilege 时仍请求余额 | 只有 `GetGraphicsGrossRevenue` 或无 dashboard privilege 的账号 | 打开 `/{m}/dashboard`，过滤 `metrics/balance` | **当前**：仍发出余额请求（hook 无条件调用）。记录 403 是否引起可见变化（预期只影响 AskAi 横幅判断）。 | P2 | `Dashboard.tsx:65,89` | — |
| RT-API-010 | 国家列表成功与失败 | 注册未完成的账号（见 T5） | 1. 打开 `/registration`。2. 把 `…/directories/countries` 改为 500。 | 1. 下拉按名称排序；响应为 `{AF:"Afghanistan"}`、`{result:{…}}`、`{result:[{code,name}]}` 三种形状都能显示。2. 下拉为空，无错误提示；同一 merchant 1 小时内不重发。 | P2 | `core/apis/directories.ts:15-46`；`store/api/directories.ts:25` | — |
| RT-API-020 | UTM 卡片查询 | owner；merchant >1 或项目 >1；有效 `utm_campaign` | 打开 `/{m}/dashboard?utm_campaign=a,b` | 只用第一个 campaign `a` 请求 `salescards/info?utm_campaign=a`；1 张卡 → 弹窗显示卡片标题与图片；多张 → 通用标题、无图片。 | P2 | `Dashboard.tsx:91-121` | — |
| RT-API-021 | UTM 卡片查询失败 / 单 merchant 单项目 | 同上；A：只有 1 个 merchant 和 1 个项目 | 1. 把请求改为 500。2. 用账号 A 打开同 URL。3. campaign 含 `&`、`#`（如 `utm_campaign=a%26b`）。 | 1. 无弹窗、无提示。2. 不发请求。3. 未编码拼接（S-08）：记录后端收到的值。 | P2 | `Dashboard.tsx:98-116`；S-08 | — |
| RT-API-022 | `handle_all_utms` 失败 | RT-API-020 的弹窗 | 把 PUT 改为 500 | 弹窗照常显示；Console 出现 `Uncaught (in promise)`（调用没有 catch）。 | P2 | `UpsellModal/index.tsx:34-36` | — |
| RT-API-023 | 卡片分配失败 / 无权限 | A：owner；B：非 owner/developer 角色 | 1. A 在弹窗点项目，把 `assign_to_user` 改为 500。2. B 打开弹窗。 | 1. 弹窗关闭，停留 Dashboard，无提示。2. B 看到无权限说明与关闭按钮，没有项目列表，不发 assign 请求。 | P2 | `UpsellModal/index.tsx:64-77,98-140` | — |
| RT-API-030 | webhooks 项目 endpoint 不可达（反证） | `ProjectSettings` | 打开 webhooks 全部页签，过滤 `/mapi/merchant/current/projects/` | 不出现 `payment_url`、`project_key`、`ipn_enabled`、`webhook_secrets` 请求（若出现，来自 SDK，不是 `core/apis/webhooks.ts`）；payments 页签 props `webhookSecrets` 为 `[]`。 | P2 | `store/slices/webhooks.ts` 无 dispatch 方 | — |
| RT-API-040 | currency 列表成功与缓存 | `ProjectSettings`；两个项目 | 1. 打开 webhooks → payments 页签。2. 切到 dispute 页签。3. 切到另一个项目的 payments 页签。 | 1. 页签内容在请求完成前为空，然后渲染。2/3：不再请求 `currency/list`（模块级缓存，跨项目、跨 merchant，直到整页刷新）。 | P2 | `webhookRemotes.tsx:107-138` | `webhookRemotes.test.tsx` |
| RT-API-041 | currency 列表失败 | 同上 | 改为 500 后打开 payments 页签，再切 dispute | 页签仍渲染，`currency.items=[]`；切到 dispute 时重新请求（失败不缓存）。 | P2 | 同上 | — |
| RT-API-042 | currency 列表 401 | 同上 | 改为 401 | 约 2 s 后跳 `{B}/logout`。 | P2 | `gateway-instance.ts` | — |
| RT-API-050 | store features 成功 | 项目侧边栏可见 LiveOps；后端两个 toggle 为 `'1'` | 1. 打开任一项目页。2. 过滤 `admin/features`。 | 1. 请求 `https://store-api.nl-k8s-stage.srv.local/v2/project/{p}/admin/features?features[]=offer_chains_feature&features[]=daily_chains_feature`，只有 Bearer，没有 `Business-Account-Id`。2. 侧边栏显示 Daily rewards、Offer chains（support 角色除外）。3. 切换项目时重新请求。 | P2 | `core/apis/storeFeatures.ts`；`nav-items-config.tsx:283-299,468` | — |
| RT-API-051 | store features 4xx/5xx/401/网络失败 | 同上 | 分别改为 403、500、401、屏蔽 | 两个菜单都隐藏，无提示；401 **不**登出（不经 gateway 实例）。 | P2 | `store/slices/storeFeatures.ts:47-50` | — |
| RT-API-052 | dashboard 冷启动：store features 重复请求且返回 404（stage 实测） | owner，merchant 下至少 1 个项目；stage 部署 `c1b5e37`（实测冷启动时 SDK store 已有当前项目；当前项目由 SDK 决定，来源**待确认**） | 1. Network 过滤 `admin/features`，勾选 Preserve log。2. 硬刷新 `{B}/{m}/dashboard`（merchant 级页面）。3. 记录请求次数、`{p}`、状态码与响应 body。4. 展开项目侧边栏，查看 Daily rewards、Offer chains。5. Console 检查是否有未处理错误。6. 对同一 `{p}` 打开项目页，重复 3。 | 1. **当前**：merchant 级页面也会发请求，`{p}` 为 SDK store 的当前项目；同一 `{p}` 发 **2 次**（折叠工具栏与 `ProjectSidebarV2` 各自的 effect，无去重）。2. stage 实测两次都是 404。3. 404 时两个菜单隐藏，无提示，Console 无未处理错误，不登出。4. 结论项：向 Store 团队确认该项目的 404 是"项目未接入 Store"的正常响应，还是路径 `/v2/project/{p}/admin/features` 错误；若为正常响应，2 次重复请求记为低优先级性能问题。 | P2 | §7.1 `/project/{p}/admin/features`；`core/hooks/useStoreFeatures.ts:13-22`；`layouts/sidebar/index.tsx:36,46`；`project-sidebar-v2/index.tsx:97-100`；`core/store/slices/storeFeatures.ts:55-58` | — |
| RT-API-060 | S-06 与死 endpoint 不发请求 | owner | 浏览 Dashboard、finance、webhooks、integrations 页，过滤 `marketing-balance`、`payment_provider/profile`、`analytics/metrics?`、`graphics/gross_revenue`、`togglers`、`project-analytic` | 都不出现。`PA_V4_TOKEN`、`DEFAULT_MERCHANT_ID`、`DEFAULT_PROJECT_ID`、`MARKETING_BALANCE_URL` 在 stage 上为 undefined，但没有调用方读取（除死代码），所以 S-06 无可见影响。 | P2 | S-06；§3 第 3 节表 E3/E5/E12-E14 | — |

### 4.4 SEC：安全回归

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-SEC-101 | **S-01**：storefront 把 JWT 写进 JS 可读 cookie | owner，有 4 个 store privilege | 1. 清除 `<stage-host>` 的 cookie 后登录。2. 打开 `/{m}/projects/{p}/storefront`。3. DevTools → Application → Cookies → `https://<stage-host>`。4. Console 执行 `document.cookie.includes('gc-pa-v4-token')`，并取出该值。5. 比较该值与当前会话 gateway 请求（如 `…/api/v1/modules` 之后的任一 `/mapi/…`）的 `Authorization: Bearer …`。6. 解码 JWT payload（第二段 base64url），比较 `exp` 与当前时间。7. 不清 cookie，打开 `/{m}/dashboard`，重复第 4 步。 | **当前（缺陷，stage `c1b5e37` 已复现）**：1. 存在 `gc-pa-v4-token`，值为完整 JWT。2. HttpOnly 未勾选，Secure 勾选，SameSite 列为空（浏览器按 Lax 处理），Domain 为当前主机（host-only），Path=`/`，Expires=Session。3. 第 4 步返回 `true`，JS 能读到 token 原文。4. 第 5 步：值与当前会话的 Bearer token **完全相同**。5. 第 6 步：`exp` 晚于当前时间（未过期，可直接用于 API 调用）。6. 第 7 步：dashboard 页也能读到（Path `/`，访问过 storefront 后在本会话内一直保留），暴露面不限于 storefront 页。7. 同页还有 `gc-pa-locale`、`gc-pa-merchant-id`、`gc-pa-project-id`（无 Secure）。对比：BFF 写入的 `pa-v4-token` 为 HttpOnly、Lax（经 URL `?token=` 由 SDK `TokenExtractor` 写入时，同名 cookie 也 JS 可读，属 T1，OBS-AUTH-002）。**修复后**：JS 不可读，或不再写 cookie。 | P0 | S-01；§8.1 Token 暴露面；`layouts/storefront/index.tsx:12-17,32` `[P3]` | `src/layouts/storefront/index.test.tsx`（"writes the game-commerce cookies…"、"rewrites the token cookie…"，固定了当前行为） |
| RT-SEC-102 | S-01：每次 render 都重写；identity 未就绪时也写 | 同上 | 1. 在 Application → Cookies 中手动删除 `gc-pa-v4-token`。2. 在 storefront 页做任意会触发重渲染的操作（切换 locale 或窗口 resize 无效时，切换 storefront 子路由）。 | cookie 立即重新出现。identity 请求完成前（remote 尚未挂载）cookie 已写入。 | P1 | S-01；`storefront/index.tsx:32` | `index.test.tsx`（"renders nothing … but still writes the cookies"） |
| RT-SEC-103 | S-01：登出后 cookie 残留 | 同上 | 1. 打开 storefront 后，用 UI 登出（BFF `/logout`）。2. 查看 Cookies。3. 关闭再打开浏览器（会话 cookie 测试）。 | **当前（推断）**：`pa-v4-token` 被 BFF 清除，但 `gc-pa-v4-token` **仍保留旧 JWT**（src 中没有删除它的代码）；直到浏览器会话结束才消失。修复后：登出时清除。 | P1 | S-01；`core/utils/cookie.ts:127-142` 不含该 cookie；grep 无 `Cookies.remove('gc-pa-v4-token')` | — |
| RT-SEC-104 | S-01：token 为 null 时写入 `"null"` | 需要 storefront 渲染时 token 为空的状态（stage 上被 guard 拦截，**待确认**能否构造） | 若能构造：打开 storefront 后看 cookie 值 | **当前**：值为字符串 `null`。`[分支差异]` 分支写入空字符串（`packages/@platform-templates/layouts/src/remotes/storefront/index.tsx:21`）。 | P2 | S-01 | 分支：`storefront-cookies.test.tsx` |
| RT-SEC-105 | S-03 的安全影响（钓鱼 iframe） | 同 RT-FRAME-002 | 执行 RT-FRAME-002 b) | 记录：iframe 在 host 外壳内加载攻击者主机内容，无 sandbox，可执行脚本和顶层导航（`top.location`）。修复后不渲染。 | P1 | S-03；§8.1 iframe | — |
| RT-SEC-106 | Upsell 开放跳转与站内跳转丢失 basename | RT-API-020 的数据 | override `salescards/{id}` 响应，把当前步骤 `url` 依次改为以下值，每次在弹窗中点项目：a) `https://example.com/x`（不含 `developers.xsolla.com`）；b) 相对路径 `/{m}/projects`；c) `https://example.com/x?a=1`。 | a) 浏览器跳到 `https://example.com/x?upsell-card-id=<id>`（`location.replace`），无确认，记录为开放跳转面。b) **预期失败项（S-20 / AC-13 同类）**：当前跳到 `https://<stage-host>/{m}/projects?upsell-card-id=<id>`，没有 `/for/web-games/account` 前缀，离开本 app；期望跳到 `{B}/{m}/projects?…`。c) 当前 URL 出现两个 `?`：`…/x?a=1?upsell-card-id=<id>`（S-30）。 | P1 | §8.1 跳转；S-20；AC-13；S-30；OBS-DASH-005 第 4 步；`core/utils/upsell.ts:24-29` `[P3]` | — |
| RT-SEC-107 | 所有 iframe 无 sandbox | owner | 依次打开 IntegrationFrame、marketplace、ontology、tax-interview、finance/boxnet、documents，在 Elements 检查 `<iframe>` | 都没有 `sandbox`、`allow` 属性（当前）。记录作为基线，修复时需逐个评估。 | P2 | OBS-FRAME-003；§8.1 iframe `[P3]` | — |
| RT-SEC-108 | remote 拿到的 token 与 gateway 一致 | owner | 对任一 remote（如 payments）用 React DevTools 读 `token` prop，与 gateway 请求的 Bearer 比较 | 两者相同；xaa 用 `tokenJWT`、gold 用 `loginToken`。记录所有接收 token 的 remote（第 2 节）。 | P2 | §6 Token prop；§8.1 Token 暴露面 | `remotes-props.test.tsx`（分支） |

---

## 5. stage 执行所需账号、数据与工具

### 5.1 账号与数据

| 用途 | 要求 | 用例 |
|---|---|---|
| owner 全量 | 一个 merchant `{m}`，至少 2 个项目；拥有 store 4 项、`ProjectSettings`、`cloud_gaming_access`、finance 三项、`transaction_search_section`、`recurrent_subscription_get_all`、`GetMetricBalance` | 大部分 MF、API |
| admin | Xsolla admin（`selectCurrentUserIsAdmin`） | RT-MF-024 |
| 非 admin owner | 同 merchant 的普通 owner | RT-MF-024 |
| viewer | `ROLE_VIEWER` | RT-MF-027、RT-MF-033 |
| ontology 启用 | merchant 有 `ontology` feature，business account 的 subsite 启用 `ontology` module | RT-FRAME-030…035 |
| sales card | 带 integration guide 的 card id 与步骤 id；一个 `utm_campaign` 能查到 1 张该卡；用户有多个 merchant 或项目 | RT-FRAME-001…010、RT-API-020…023 |
| tax interview | merchant 的 tax interview 状态为 `incomplete` | RT-FRAME-041 |
| boxnet | `get_merchant_boxnet_url` | RT-FRAME-042 |
| store features | 项目的 `offer_chains_feature`、`daily_chains_feature` 为 `'1'` | RT-API-050 |
| e2e persona | `e2e/fixtures/personas.ts` 的 10 个 persona 若已在 stage 配置，可复用（U-09） | — |

### 5.2 工具

| 工具 | 用法 | 用例 |
|---|---|---|
| DevTools → Network request blocking | 按 URL pattern 屏蔽（模拟不可达；remoteEntry 的 pattern 要去掉 `?v=`，或用 `*remoteEntry*`） | RT-MF-040/050/071/075 |
| DevTools → Network throttling 自定义 profile | 设置大 latency 模拟挂起/超时 | RT-MF-003/043 |
| DevTools → Local overrides（Override content，Chrome 117+） | 覆盖 `/api/v1/modules`、`salescards/{id}` 的响应**内容**（不能改状态码） | RT-MF-041/042/044-047/074、RT-FRAME-002…007/032、RT-SEC-106 |
| Requestly 或 Proxyman | 改响应状态码（4xx/5xx）、只延迟某个 URL | RT-MF-002/072/073、RT-FRAME-006、RT-API-* |
| React Developer Tools | 读取 `RemoteModuleComponent` 及 remote 根组件 props | 4.1.2 全部、RT-SEC-108 |
| DevTools Console 上下文切换 | 在 iframe 上下文执行 `parent.postMessage` | RT-FRAME-041/042 |
| `getEventListeners(window)` | Console 内置函数，查看 `message` 监听 | RT-FRAME-040 |
| Application → Cookies | 查看 cookie 属性 | RT-SEC-101…104、RT-MF-026/027 |
| Performance 面板 | 观察残留定时器 | RT-MF-051 |

---

## 6. U 项处理结果

本地 SDK 版本已核对，与 spec 记录一致：`platform-shell 2.22.3`、`platform-apis 2.29.2`、`platform-store 1.15.6`、`platform-pages 3.25.2`、`platform-components 4.20.3`、`platform-bff 1.0.0`、`@accounts-sdk/core 0.9.1`；另 `@platform-base/api 1.5.0`、`@module-federation/runtime 2.9.0`、`@micro-frontend/bridge 0.0.2`、`js-cookie 3.0.8`（均位于 `node_modules/.pnpm/`）。

| U 项 | T4 相关部分 | 结果 | 证据 / 转成的用例 |
|---|---|---|---|
| U-03 | `fetchModuleList` 的请求与错误处理 | **部分关闭**：`GET /api/v1/modules`，经 SDK `gatewayInstance`（无超时）；`code` 在 2xx 且有 `result` 时返回 `result.data`，否则抛错。SDK gateway 401 拦截：请求带 token 时清 cookie、`setupAxios(null)`、2 s 后（非 prod）跳 `/logout`；viewer 角色 401 不登出。启动时 token 通常为空（`getAuthToken` 读不到 HttpOnly 的 `pa-v4-token`），所以模块列表请求一般不带 Authorization。其他 SDK 调用留给 T1。 | `platform-apis@2.29.2 dist/index.mjs:105-106,250,354-410,902-907,1195-1204`；RT-MF-001/002 |
| U-03 补充 `[P3]` | 模块列表响应形状 | stage 实测（`c1b5e37`）：`{code, result: {data, total}, trace_id}`，`result.data` 20 项，与 SDK `fetchModuleList` 取 `result.data` 的读法一致。 | RT-MF-001 |
| U-11 `[P3]` | MF 2.0 remote 自身 React 树内的渲染错误是否回退 MF1 | **未关闭**（spec 0.3.0 新增）。代码只能证明：加载阶段失败（manifest 不可达、v2 remoteEntry 20 s 超时、export 缺失）与 `provider.render` 同步抛错会回退；remote 在自己的 React root 中渲染，内部渲染错误是否被 host ErrorBoundary 捕获需运行时故障注入。 | RT-MF-076、RT-MF-082 |
| U-12 `[P3]` | 根级 `/{m}/…`（无 basename）在部署环境返回什么 | **未关闭**（spec 0.3.0 新增），决定 S-20 的实际影响。 | RT-FRAME-010 第 3 步、RT-SEC-106 b) |
| U-05 | gateway `urls` key；`communication_platform` 的 `module` | **部分关闭**（spec 0.3.0 仍标"未关闭"；stage 实测只确认了响应外层形状，未记录 `urls` key）：SDK `resolveModuleUrl` 兼容两种 key，stage 候选顺序 `stage → development → dev`（production 甚至会回退到 `stage` URL）。但 host MF1 路径只读 `urls[APP_ENV]`，不兼容。gateway 实际返回什么仍需 stage 快照。 | `platform-shell@2.22.3 dist/remote-module.mjs:101-129`；`RemoteModule.tsx:74-75`；转为 RT-MF-004、RT-MF-047、RT-MF-071 |
| U-07 | `/ontology` 的拒绝逻辑 | **ontology 部分关闭**：页面内判断 = `FEATURES.ontology` 开关 **且** 当前 business account 的 subsite `visibilityModules` 含 `ontology`；状态机 `loading → redirect → unauthenticated → ready`，URL 必须 https。是否需要 route 级 gate 仍是产品决策，保持打开。`/settings/administration` 不属于 T4。 | `core/hooks/useOntologyAccess.ts:26-71`；`@platform-base/api@1.5.0 dist/index.mjs:650-691`；RT-FRAME-030…035 |
| U-02 | BFF cookie 属性（S-01 对比基线） | **部分关闭（供 T1 参考）**：`pa-v4-token` 为 HttpOnly、`secure`（非 development）、SameSite=Lax、Path=`/`、10 天，`ENV=STAGE` 时 Domain=`.srv.local`；`GET /for/:site/account/server/token` 返回 `{token}` 或 `401 {error:'no_session'}`，`Cache-Control: no-store`。hydration 部分仍由 T1 处理。 | `platform-bff@1.0.0 dist/index.mjs:4-27,377-383`；RT-SEC-101 |
| — | SDK 自带的 RemoteModule 是否有同样的 S-02 | SDK `platform-shell@2.22.3` 的 `loadRemoteEntry` 与 host 版本相同（同样永久轮询）。修复 S-02 需同时改 host 与 SDK，或改用 `@platform-base/shell`（分支方案）。 | `platform-shell@2.22.3 dist/remote-module.mjs:33-75` |

---

## 7. spec 勘误（相对 0.2.0）

`[P3]` spec 0.3.0 已合入本节勘误。E-09、E-11 按 spec 作者的核实结果修正（PARTIAL），下表已改为修正后的内容；其余条目保留作历史记录。

| # | 位置 | spec 内容 | 代码事实 | 证据 |
|---|---|---|---|---|
| E-01 | §7 | `/api/payment_provider/profile` 列为本地 endpoint | `getMerchantInitStatus` 在 src 中没有调用方，不可达 | `git grep getMerchantInitStatus` 只命中定义与 `App.tsx:17` 注释 |
| E-02 | §7 | `/mapi/merchant/current/projects/{p}*`（webhooks）列为可达 | `store/slices/webhooks.ts` 的 7 个 thunk 没有 dispatch 方，只有 `selectWebhookSecrets` 被读取，所以 payments remote 收到的 `webhookSecrets` 恒为初始值 | `webhookRemotes.tsx:148`；`git grep` 无 dispatch |
| E-03 | §7 | dashboard 三个 endpoint 一并列出 | 只有 `metrics/balance` 可达；`/metrics`、`/graphics/gross_revenue` 只被死代码 `components/Dashboard/Sales` 使用；`marketingBalance` 只被死代码 `MarketingBanner` 使用。§7 应标"不可达" | `store/api/dashboard.ts`；§11.3 |
| E-04 | §8.2 | `gcApi` 的 `keepUnusedDataFor` 为 3600 s（`core/store/api.ts`） | `core/store/api.ts` 未设置（RTK 默认 60 s）；3600 s 只在 `core/store/api/directories.ts:25` 的 countries 端点 | 同左 |
| E-05 | OBS-FRAME-001、§8.1、S-03 | 绕过方式只写了后缀子域 | 还可用 userinfo（`https://developers.xsolla.com@evil.tld`）、拼接主机（`…xsolla.comevil.tld`）、不同端口。另外 `:frame_path` 被完全忽略；缺少 card/step 参数时不发请求、永久 loader | `available-domains.ts:11-12`；`IntegrationFrame/index.tsx:22-28` |
| E-06 | OBS-FRAME-002 | 启用时 iframe，否则重定向 | 共 4 个状态：loading 时渲染空白；未启用重定向；无 token 显示英文 `You need to sign in…`；URL 缺失或非 https 显示英文 `Ontology is not available right now.`。accounts/subsite 请求失败时也走重定向 | `layouts/ontology/index.tsx:19-45`；`useOntologyAccess.ts:65-71` |
| E-07 | OBS-FRAME-003、§6 | "host 不注册任何 message 监听" | host src 中成立；但 host 路由挂载的 SDK 页面 `TaxInterviewPage`（`/{m}/tax-interview`）与 `DocumentCenterDocuments`（`/{m}/finance/boxnet`）各有 iframe，并注册带 origin 校验的 `message` 监听（`exitConfirmed`；`uploadSuccess`/`uploadError` 等）。§6 的 iframe 清单也漏了这两个 | `platform-pages@3.25.2 dist/index.mjs:94-111,7810-7932` |
| E-08 | OBS-MF-001/002 | 失败只写了脚本加载失败 | gateway 无条目且无静态配置时 `moduleConfig=null`，**永久 spinner，无错误，无请求**；这适用于所有 gateway-only remote（含 `xaa_widgets`、MF1 回退的 `communication_platform`）。错误文本还有 `Remote URL not found for scope: X`、`Remote container 'X' not found`、`Unknown error`；`Failed to load:` 中的 URL 不含 `?v=` | `RemoteModule.tsx:65-68,97-101`；`loadModule.ts:33-35,74-76` |
| E-09（PARTIAL 修正 `[P3]`） | OBS-MF-003、AC-11 | "When `loadRemote` fails" 才回退 | 回退只在两类情况下成立：加载阶段失败（manifest 不可达、v2 remoteEntry 20 s 超时、export 缺失），或 `provider.render` **同步**抛错。remote 自身 React 树内的渲染错误是否回退为 [U]（U-11），原写法"渲染出错时也回退"过宽。manifest fetch 无超时；§8.2 未写 MF2 的超时行为（0.3.0 已补） | `createRemoteApp.tsx:19,45-59`；`bridge@0.0.2 RemoteAppWrapper-hOF0XI8X.js:253,323-336`；`runtime-core@2.9.0 SnapshotHandler.js:140-170`；`sdk@2.9.0 dom.js:19` |
| E-10 | §8.2、S-02 | "首个加载失败后，第二个挂载会永久 spinner" | 只影响**首个加载进行中**挂载的调用者；失败后才挂载的调用者会正常重试。轮询 interval 在卸载后也不清理。可在 funding 页（`./nav` + App 同时挂载）稳定复现。跨浏览器 tab 不触发 | `loadModule.ts:22-31,55`；`Funding/index.tsx:94-105` |
| E-11（PARTIAL 修正 `[P3]`） | §6 | 各 remote 只列 token prop 名 | 漏了：network 只传 `token`，其余 context 走 cookie `network-pa-*`；storefront 另写 `gc-pa-locale/merchant-id/project-id`；site-builder 写 `sb-pa-*`，Domain 由 `getCookieParams` 按 hostname 决定（`.xsolla.com` / `xsolla.com` / `.srv.local` / host-only），不是固定的 `.srv.local`；xsolla-link 对非 admin 在 render 中 `history.push('/forbidden')`；项目级 `/projects/{p}/gold`、`/link` 可达（D1 只影响 merchant 级） | 各 layout 源码 |
| E-12 | §8.1 Open redirect、§4.6 | 只提到跳到后端 `step.url` | Upsell 的站内链接（`/{m}/frame/documentation?…`、`/{m}`、`/{m}/dashboard?…`）经 `window.location.replace` 跳转，**没有加 basename**，会离开 `/for/web-games/account`（新可疑点，待 stage 确认） | `core/utils/upsell.ts:20-31`；`UpsellModal/index.tsx:56-62` |
| E-13 | S-12、S-13 | 作为独立可疑点 | 两者相关：`initModuleUrls` 写的 window 变量只被未使用的 webpack 静态 remotes 读取（外加 ontology），所以 S-12 的名字不一致没有运行时影响 | `layouts/ontology/index.tsx:12` 是唯一读取方 |
| E-14 | S-06 | 变量不在 DefinePlugin | 补充：`PA_V4_TOKEN`、`MERCHANT_ID`、`PROJECT_ID` 在 src 中除 `config.ts` 外无读取方；`MARKETING_BALANCE_URL` 只服务不可达的 E14，所以无运行时影响 | `git grep` |

---

## 8. 覆盖统计

| 节 | 用例数 | P0 | P1 | P2 |
|---|---|---|---|---|
| MF（RT-MF-001…083） | 58 | 2 | 31 | 25 |
| FRAME（RT-FRAME-001…042） | 21 | 0 | 7 | 14 |
| API（RT-API-001…060） | 18 | 1 | 3 | 14 |
| SEC（RT-SEC-101…108） | 8 | 1 | 4 | 3 |
| **合计** | **105** | **4** | **45** | **56** |

（`[分支差异]` 说明行不计入用例数。P3 新增 RT-MF-082、RT-API-052，各 P2；P4 新增 RT-MF-083（P2）；无废弃用例。）

预期失败项（当前代码不满足期望，执行时判"已复现缺陷"而不是"用例失败"）`[P3]`：RT-SEC-101（S-01，stage 已复现）、RT-FRAME-002（S-03 / AC-10）、RT-FRAME-010（S-20 / AC-13）、RT-SEC-106 b)（S-20）、RT-MF-050/051（S-02）。

覆盖对照：

| 来源 | 覆盖情况 |
|---|---|
| OBS-MF-001…004 | 全部（MF-001…083）；OBS-MF-002 的错误文本：`Failed to load` MF-040/041、`Remote URL not found` MF-047、`Remote container … not found` MF-042、原始 `Error` message MF-083 `[P4]`；OBS-MF-003 的 4 个回退条件：manifest 不可达 MF-071、20 s 超时 MF-073、export 缺失与 `provider.render` 同步抛错 MF-076；[U] 部分 MF-082 `[P3]` |
| OBS-FRAME-001…003 | 全部（FRAME-001…042）；OBS-FRAME-003 的 `/{m}/documents` 由 FRAME-042 覆盖 `[P3]` |
| §6 remote 清单 | 23 个 MF1/MF2 remote 都有正常加载用例；失败/超时/子路径/深链接用通用用例覆盖（4.1.3、4.1.5）；并发：funding 为真实 S-02 场景，其余为跨 tab |
| §7 endpoint | 可达的 E1、E2、E4、E6–E9、E11、E15 有成功/4xx/5xx/网络用例（E15 另有 stage 404 用例 API-052）；E16–E20 指向 T1/T5；E3、E5、E10、E12–E14 标为不可达（RT-API-030/060 反证） |
| §8.2 | MF-003/043/046/049/050/072/073 |
| AC-10、AC-11、AC-13 | RT-FRAME-002、RT-MF-071、RT-FRAME-010 |
| S-01、S-02、S-03、S-06、S-09、S-12、S-13、S-17 | SEC-101…104；MF-050/051/054；FRAME-002（4 种形式）、SEC-105；API-060；E12 不可达（无 stage 用例）；MF-080；MF-080；MF-014/081 |
| S-20、S-30、S-32 `[P3]` | FRAME-010、SEC-106 b)；SEC-106 c)；FRAME-032/035 |
| U-02（部分）、U-03、U-05、U-07、U-11、U-12 | 第 6 节 |
| 已有自动化固定的用例 | 约 30 条引用了 colocated 单测或集成场景（I6、I7、I11、I12、D1）；`createRemoteApp.test.tsx` 只有 `it.todo`，AC-11 无自动化；S-02 失败分支、S-03 绕过形式均无自动化 |

---

## P3 变更记录

依据：spec 0.2.0 → 0.3.0 diff（OBS-MF-001/002/003、OBS-FRAME-001/002/003、§6、§7、§8.1、§8.2、AC-13、S-20/S-30/S-32、U-11/U-12）、spec 作者对 E-09/E-11 的 PARTIAL 修正、stage 实测（部署 `c1b5e37`）。代码基线不变（`772a320`）。

| 用例 / 位置 | 类型 | 原因 |
|---|---|---|
| RT-MF-001 | 修改 | stage 实测：模块列表响应形状 `{code, result:{data,total}, trace_id}`、`__modules` 20 项、`APP_ENV`、`ontologyModuleUrl` 结尾 `?<uuid>` 写入预期 |
| RT-MF-026 | 修改 | 勘误 E-11 修正：`sb-pa-*` 的 Domain 按 hostname 由 `getCookieParams` 决定，不是固定 `.srv.local` |
| RT-MF-032、RT-MF-050 | 修改 | 证据行号按 spec 0.3.0 §8.2 / S-02 修正：`Funding/index.tsx:96,115-130` |
| RT-MF-046 | 修改 | OBS-MF-001 第 2 步已写入该分支：spinner 直到模块列表变化；`loadingFallback=null` 时空白 |
| RT-MF-072、RT-MF-073 | 修改 | §8.2 新增 MF 2.0 超时行；OBS-MF-003 把 20 s 超时列为回退条件，去掉"待确认" |
| RT-MF-076 | 修改 | 勘误 E-09 修正：只验证加载阶段失败（export 缺失）与 `provider.render` 同步抛错的回退；remote 树内渲染错误移到新用例 |
| RT-MF-082 | 新增 | U-11：remote 自身 React 树内渲染错误是否回退 MF1，标 [U]，只记录结果 |
| RT-FRAME-002 | 修改 | S-03 扩为 4 种绕过：新增 d) 端口形式；标为预期失败项 |
| RT-FRAME-010 | 修改 | 追溯改为 S-20、AC-13、U-12；标为预期失败项；行号按 0.3.0 修正 |
| RT-FRAME-032、RT-FRAME-035 | 修改 | 追溯补充新编号 S-32（ontology 文案未国际化） |
| RT-FRAME-042 | 修改 | OBS-FRAME-003 / §6：`DocumentCenterDocuments` 另挂在 `/{m}/documents`，补第 4 步 |
| RT-API-052 | 新增 | stage 实测 dashboard 冷启动 store features 2 次 404：代码证实 merchant 级页面也请求、两个 sidebar 各请求一次；需判定 404 是否正常 |
| RT-SEC-101 | 修改 | stage 实测 S-01 已复现：JS 可读、未过期、与 Bearer 相同、dashboard 也可读；补 `TokenExtractor` 对比说明（§8.1） |
| RT-SEC-106 | 修改 | 追溯改为 S-20、AC-13，并补 S-30；新增 b) 相对路径（预期失败项）、c) 双 `?` |
| RT-SEC-107 | 修改 | 补 `/{m}/documents` iframe |
| 第 2 节 #16、#22、#28 | 清单 | site-builder cookie 域名规则；funding 行号；Documents 新路由 |
| 第 3 节 E1、E8、E12、E13、E15、E20 | 清单 | E1 归入 §7.2 并写入响应形状；E8 标 S-20；E12/E13 版本标注；E15 写入双请求与 stage 404；新增 E20（`pass_survey`、`credential`，指向 T5） |
| 第 1 节流程图、第 6 节、第 7 节 E-09/E-11、第 8 节 | 文档 | 同步 OBS-MF-001 第 2 步；新增 U-11、U-12、U-03 补充；勘误按作者 PARTIAL 修正；统计 102 → 104，新增预期失败项清单 |
| 废弃 | — | 无 |


---

## P4 变更记录

依据：spec 0.3.0 → 0.3.1 diff（OBS-MF-002 错误文案）与 `772a320:src/modules/RemoteModule.tsx:86-101`、`loadModule.ts:90-93` 复核。spec 0.3.1 的其余改动（OBS-MAG-002、§2.3、§2.4、OBS-AUTH-002/008、S-34）不在 T4 范围；§6 ontology 依赖共享 `pa-v4-token` cookie 的说明与第 2 节 #25、RT-FRAME-030 已一致，未改。修改 0 条，新增 1 条，废弃 0 条。

| 用例 / 位置 | 类型 | 原因 |
|---|---|---|
| RT-MF-083 | 新增 | OBS-MF-002：`<p>` 显示原始 `err.message`，文案还有 `No component exported from …` 和 container / factory 抛出的任意 `Error` message；`Unknown error` 只在抛出的不是 `Error` 时出现。用模块名不存在构造一条原始 container 错误 |
| 第 1 节流程图与错误文本规则 | 文档 | 补充 3 个错误出口和判定规则 |
| 第 8 节 | 文档 | 统计 104 → 105；OBS-MF-002 错误文本的覆盖对照 |

说明：现有用例中没有断言“只有 4 种文案”的行。RT-MF-040/041/042/047 各自断言一种具体文本，在各自的故障注入下仍然成立，所以不修改；“只有 4 种”的假设只体现在第 1 节流程图和第 7 节勘误 E-08 中。E-08 作为 0.2.0 勘误的历史记录保留不改，流程图已补全。