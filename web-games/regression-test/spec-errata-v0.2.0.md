# spec 勘误汇总（针对 reverse spec v0.2.0）

> 来源：回归测试探索 T1–T5，代码基线 `master@772a320`。每条都由读源码得出，未做 runtime 验证。
> 生成日期：2026-10-21。各条的完整上下文见对应的 `T*.md`。

## T1-boot-auth


| # | 位置 | 问题 | 代码证据 |
|---|---|---|---|
| E1 | OBS-AUTH-008、§11.4 相关 | **写错**。platform-components 4.20.3 的 Sign out 会先删除 JS cookie，再 `location.assign({basename}/logout)`；BFF 清除 httpOnly 会话后 302 到 login。host 中的 TODO 注释引用的是 0.2.7，已经过时 | platform-components@4.20.3 `src/Navigation/index.tsx:470-479` |
| E2 | OBS-AUTH-001 第 4-5 步、§8.3 | **遗漏后果**。`/server/token` 网络失败、超时或非 ok 时，host 的 `resolveInitialToken` 返回 null（从不 reject），于是 AuthOrchestrator 立即跳转 login。SDK 中“网络失败不跳转”的 `.catch` 分支在本 host 中走不到 | `resolveInitialToken.ts:37-49`；platform-shell `src/AuthOrchestrator.tsx:127-140` |
| E3 | OBS-AUTH-002、§8.1 URL token | **遗漏**。有 BFF 的部署中，带 `?token=` 的页面导航先在服务端写入 httpOnly cookie，并 302 去掉 token，SPA 看不到它。SPA 分支还有 spec 没写的副作用：`TokenExtractor` 写 JS 可读 cookie `pa-v4-token`，并 `history.replace('/{merchant}')`，丢掉深链 | platform-bff `src/bff-routes.ts:107-113`、`:257-263`；platform-components `src/auth/TokenExtractor/index.tsx:95`、`:175-177` |
| E4 | §8.1 token 暴露面 | **不准确**。`__INITIAL_STATE__.token` 第一次被读取后就置为 null，内联 script 也会移除自己。另外遗漏了 `TokenExtractor` 写的 JS cookie | platform-apis `src/utils/injectedToken.ts:52-92`；platform-bff `src/bff-routes.ts:368-376` |
| E5 | OBS-AUTH-005、OBS-AUTH-007、§8.3 | **遗漏**。实际有两个 401 拦截器：host 本地的和 SDK `platform-apis` 的，各自有一次性 flag。SDK 拦截器还会清 cookie、`setupAxios(null)`、`clearUserData`，并对 viewer 跳过 401；host 拦截器没有 viewer 判断（RT-AUTH-013） | platform-apis `src/apis/gateway-instance.ts:101-149`；`src/utils/auth-session-context.ts:27-32` |
| E6 | OBS-MAG-002、AC-01 | **前提遗漏**。platform-store 1.15.6 的 `fetchUserData` 按 URL merchant 调用 `get_init_info?org_id=`，只有遇到 `MerchantAccessDeniedError` 才退回不带 org 的调用。gateway 对外部 org 返回错误时，结果是 HydrationError；返回 401 时会注销，而不是跳到自己的 org。host hook 注释中“`fetchUserData(undefined)` 总是解析默认 org”的说法已经过时 | platform-store `src/slices/user.ts:108-160`；platform-apis `src/apis/merchant.ts:99-160` |
| E7 | OBS-MAG-005 | **补充**。普通成员首次加载时，store 已经是 URL 中的 merchant，fail-open 基本走不到。实际可达的场景是 admin 加 detail 接口失败，或客户端内切换 merchant | 同 E6；`useMerchantAccessGuard.ts:170` |
| E8 | OBS-ERR-003、S-07 | **遗漏**。`/error` 页面完全忽略 `status` 和 `message`，所以 S-07 没有 UI 影响。同一页面的 `authorized: !!state.user.id` 恒为 false，因为 UserState 中没有 `id`，已登录时也显示 NavigationLite | `src/layouts/error/index.tsx:7-19`；platform-store `src/slices/user.ts:58-67` |
| E9 | §2.4 guard 分层图 | **不准确**。host 的 MerchantAccessGuard 嵌套在 SDK 的 `RegistrationGuard` → `LegalDocumentConsentGuard` 里面（与 `EnterAccountGate` 同层），不在 PlatformShell 的最外层。`AuthOrchestrator` 不是 guard，而是与 `TokenExtractor`、`AuthChecker` 并列的副作用组件 | platform-shell `src/PlatformShell.tsx:193-240`、`:384-424` |
| E10 | S-14 | **补充**。`/123abc` 的结果取决于成员关系：自己的非默认 org 会先切换 merchant 再跳 `/not-found`；外部 org 会跳 `/{firstOrg}`。SDK 的 `getMerchantIdFromUrl` 使用 `(?:/|$)`，与 host 守卫的正则也不一致 | `useMerchantAccessGuard.ts:62`；platform-apis `src/utils/url.ts:48-59` |
| E11 | OBS-AUTH-009 | **遗漏**。有会话时整页打开 `/login`，BFF 先在服务端 302（到保存的 return URL 或 `{base}`）。host hook 只处理 `{base}/`、`/signup` 和客户端导航 | platform-bff `src/bff-routes.ts:189-207` |
| E12 | OBS-BOOT-006 | **遗漏来源**。`account-platform-site-id` 由 SDK AuthOrchestrator 在每次挂载时写入（10 天，域名级），不需要登录 | platform-shell `src/AuthOrchestrator.tsx:224-229` |
| E13 | §8.1、§8.3 | **遗漏**。BFF 的 PUBLIC_PATHS 包含 `/forbidden` 和 `/not-found`，SPA 的 `allowedUnauthorizedUrls` 不包含，导致无会话时多一次跳转（RT-AUTH-021） | platform-bff `src/bff-routes.ts:36`；platform-apis `src/constants/allowed-unauthorized-urls.ts` |
| E14 | §11.2 S-05 的影响 | **补充**。如果把 S-05 直接修成 `return true`，`/for/web-games` 会白屏，因为 bootstrap 会 return 而不 render。修复时必须同时导航或继续渲染（RT-BOOT-007） | `src/bootstrap.tsx:53-56` |
| 注 | 代码注释，不是 spec | `bootstrap.tsx:62-68` 说 SDK 在 handler 注册前就锁住 `hasGatewayAuthHandled`。platform-apis 2.29.2 已改为注册前不锁（“Do not latch before the shell mounts”），注释过时 | platform-apis `src/apis/gateway-instance.ts:124-128` |

---


## T2-routing-access


| # | 位置 | 问题 | 代码证据 |
|---|---|---|---|
| E1 | OBS-ACC-005、OBS-NAV-002 | spec 说 "Module visibility gates only the sidebar" / "Module `visibility` ... filter the project items"。实际 v1 的 sidebar 也不读取 `visibility`：nav 配置只把它当数据，`filterAccessibleNavItems` 不看它，src 中没有调用 `filterSidebarItemsByVisibility`，platform-ui 0.10.0 的 Sidebar 也不处理 visibility。只有 ontology 通过 `selectVisibilityModules` 判断模块 | `filter-accessible-nav-items.ts:30-51`；`core/hooks/useOntologyAccess.ts:41,77`；`core/access/setup-guide-access.ts:25-29` 注释 |
| E2 | OBS-NAV-002 | section 规则只过滤 project Tools 组；merchant 组的 Get started 对 section 角色仍显示，点击 `/forbidden` | `merchant-sidebar-v2/nav-items-config.tsx:135-142`；`route-access.ts:90-101` |
| E3 | OBS-NAV-003 | `window.open(..., 'noopener,noreferrer')` 只在折叠态；展开态用 `<a target rel="noopener noreferrer">` | `sidebar/index.tsx:51-102`；`uim-link/index.tsx:143-161` |
| E4 | OBS-NAV-004 | 遗漏条件：还要求 feature `webhookless_integration` 开启、privileges 不在加载中、项目 id 已就绪；请求为 `/mapi/merchant/current/projects/{p}/webhook_storage_integration` | bottom nav `:262-312`；platform-apis `index.mjs:1945` |
| E5 | OBS-ROUTE-003 | 遗漏：重定向丢弃 search 和 hash，且只看 pathname | `RouteWrap.tsx:13-16`；`RouteWrap.test.tsx:66-74` |
| E6 | OBS-ROUTE-005 | `routes.tsx:59-63` 注释说 Navigation 的聊天按钮 push `/support-hub`；platform-components 4.20.3 实际直接 push `/communication-hub`，别名只服务旧链接。另：别名 non-exact，子路径和 query 被丢弃 | components 4.20.3 `index.mjs:2273-2280`；`routes.tsx:64-66` |
| E7 | OBS-ROUTE-006 | 遗漏：`login` → `engagement`；hash 也保留；未映射的产品落到 `/analytics/payments` 且丢 query | `layouts/advanced-analytics/index.tsx:89-123` |
| E8 | OBS-ACC-004 | 遗漏 4 点：① `BLOCKED_MERCHANT_PATHS` 的 `/users`、`/company` 不匹配本 host 的 `/settings/users|members|company`，webdev 能进这些页；② section 正则区分大小写，而路由匹配不区分，大写 URL 可绕过（webdev）或误拒（liveops）；③ features 未就绪时一律放行；④ 路由规则先判，缺 `project_get` 时不会跳 landing | `sections.ts:76-85,143-144`；`route-access.ts:80-86,144-148` |
| E9 | OBS-ACC-003(a) | 精确化：integration type 未加载（null）时放行；state 值先转小写 | platform-apis `index.mjs:2890` |
| E10 | §5 | ① `M/'link'` 没有 privilege（只有 `'gold'` 要 `ps`）；② `/settings` 裸路径落 not-found；③ `P/edit` 为 non-exact，含 SDK 子路由 advanced/webhooks/event-api；④ `P/storefront` 是 3 个 store 权限 + `ps`；⑤ `/projects/{p}` 不要求 `client_show_project_list`；⑥ `/support/`（尾斜杠）直接进 remote，不跳 transactions；⑦ `saved-payout-methods` 只要 `get_transfers` | `routes.tsx:108-114`；`settings.ts`；`projects.ts:79-85,165-170`；`storefront.ts`；`finance.ts:31-38` |
| E11 | OBS-PROJ-001 | 遗漏：无项目时先把 URL 改成 `/projects/0` 再判断 NoProjectPage；列表不完整时不改写，改为请求项目详情；`currentProjectId` 等于请求 id 时直接放行 | `ProjectRequiredRoute.tsx:81-114,153-163`；components 4.20.3 `index.mjs:1288-1314` |
| E12 | OBS-ROUTE-002 | merchant 与 outside 数组本身已以显式 `*` 结尾，createRoute 追加的 `*` 不可达；`/support` 的 `defaultRedirect`（path 为空）在 `*` 之前吞掉所有未匹配子路径 | `routes.tsx:149,162`；`routes/defaultRedirect.tsx:8-13` |
| E13 | 遗漏（ERR/NAV 交界） | 403/404 页 `authorized: !!state.user.id`，而 SDK user slice 的 id 在 `state.user.user.id`，所以已登录也显示 NavigationLite [I] | `layouts/error/forbidden/index.tsx:17-19`；platform-store `index.mjs:582-600` |
| E14 | 遗漏（NAV） | 展开态 `ProjectSidebarV2` 在没有项目 id 时返回 `null`，BIZA-370 的 Marketplace/Ontology 只在折叠态生效 | `project-sidebar-v2/index.tsx:145-147`；nav config `:482-506` |
| E15 | 遗漏（NAV，死代码） | LiveOps 子项的 `hidden: isSupportRole` 永远不起作用：SupportRoles ⊂ `PROJECTS_HIDDEN_ROLES`，该 hook 已提前返回 `[]` | nav config `:273-319,478-480`；`roles.ts:73` |
| E16 | 自动化归属 / 测试资产 | 按 coordinator 通知（spec 0.2.0）：OBS-ACC-003/AC-04 只由 I15 固定；I9 固定的是 OBS-PROJ-001 的 "无项目且无 `project_create` → /forbidden"（`scenarios.ts:143-150`）。另：`e2e/tests/smoke-areas.ts` 中的 `/new-project`、`/api-key`、`/members` 是 V2 路径，v1 不存在 | `scenarios.ts:143-150`；`smoke-areas.ts` |

另记：菜单与路由不一致（§1 "不一致" 列，共 13 类）不是 spec 写错，而是 spec 未覆盖的实现缺口，已转成 RT-NAV-006~019。

---


## T3-home-dashboard


以 spec 0.2.0 为准。v0.2.0 已修正的 OBS-DASH-001/002/004、OBS-I18N-002 不再列出。

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
| E-12 | §10 / e2e | e2e smoke 的 Settings 区域路径为 `/api-key`、`/members` | 实际路由是 `/settings/api_key`、`/settings/members` | `e2e/tests/smoke-areas.ts:31-32`；`routes/inside/settings.ts` |

### 新发现（建议并入 spec §11.2）

| ID | 描述 | 严重度 [I] | 用例 |
|---|---|---|---|
| N-01 | Upsell 选项目后 `window.location.replace` 的目标没有 basename，stage 上会跳出 `/for/web-games/account` | 中 | RT-DASH-024 |
| N-02 | 余额数字把所有 `,` 替换为空格，de/es/pt/fr/ru 的小数逗号丢失（“1.234.567 50”） | 低 | RT-DASH-017 |
| N-03 | 切换语言后 LiveChat 仍使用旧语言，直到刷新 | 低 | RT-UI-013 |
| N-04 | Topbar 切换语言是乐观更新；持久化失败无提示，刷新后语言回退 | 低 | RT-I18N-003 |
| N-05 | Dashboard 不看权限就请求 balance | 低 | RT-DASH-014 |

---


## T4-remote-frame


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
| E-09 | OBS-MF-003、AC-11 | "When `loadRemote` fails" 才回退 | bridge 的 ErrorBoundary 在 v2 remote **渲染出错**时也回退 MF1；manifest fetch 无超时，v2 remoteEntry 脚本有 20 s 默认超时。§8.2 未写 MF2 的超时行为 | `createRemoteApp.tsx:19`；`bridge@0.0.2 RemoteAppWrapper-hOF0XI8X.js:323-336`；`runtime-core@2.9.0 SnapshotHandler.js:140-170`；`sdk@2.9.0 dom.js:19` |
| E-10 | §8.2、S-02 | "首个加载失败后，第二个挂载会永久 spinner" | 只影响**首个加载进行中**挂载的调用者；失败后才挂载的调用者会正常重试。轮询 interval 在卸载后也不清理。可在 funding 页（`./nav` + App 同时挂载）稳定复现。跨浏览器 tab 不触发 | `loadModule.ts:22-31,55`；`Funding/index.tsx:94-105` |
| E-11 | §6 | 各 remote 只列 token prop 名 | 漏了：network 只传 `token`，其余 context 走 cookie `network-pa-*`；storefront 另写 `gc-pa-locale/merchant-id/project-id`；site-builder 写 `sb-pa-*`（`.srv.local` 域）；xsolla-link 对非 admin 在 render 中 `history.push('/forbidden')`；项目级 `/projects/{p}/gold`、`/link` 可达（D1 只影响 merchant 级） | 各 layout 源码 |
| E-12 | §8.1 Open redirect、§4.6 | 只提到跳到后端 `step.url` | Upsell 的站内链接（`/{m}/frame/documentation?…`、`/{m}`、`/{m}/dashboard?…`）经 `window.location.replace` 跳转，**没有加 basename**，会离开 `/for/web-games/account`（新可疑点，待 stage 确认） | `core/utils/upsell.ts:20-31`；`UpsellModal/index.tsx:56-62` |
| E-13 | S-12、S-13 | 作为独立可疑点 | 两者相关：`initModuleUrls` 写的 window 变量只被未使用的 webpack 静态 remotes 读取（外加 ontology），所以 S-12 的名字不一致没有运行时影响 | `layouts/ontology/index.tsx:12` 是唯一读取方 |
| E-14 | S-06 | 变量不在 DefinePlugin | 补充：`PA_V4_TOKEN`、`MERCHANT_ID`、`PROJECT_ID` 在 src 中除 `config.ts` 外无读取方；`MARKETING_BALANCE_URL` 只服务不可达的 E14，所以无运行时影响 | `git grep` |

---


## T5-registration-mcp


| # | 位置 | 问题 | 代码证据 |
|---|---|---|---|
| E1 | OBS-REG-001、AC-06 | “Finish stays disabled until the Terms of Use box is ticked” 不成立。真实 SDK 中 Finish 只在 loading、提交中、法律文档加载中禁用；未勾选时点击会显示 “You must agree to the Terms of Use and Privacy Policy”。集成测试 stand-in 把 Finish 写成禁用，固定了错误的行为 | `pp/projects/CreateProjectOnboarding.tsx:177-191,200-201,273-283`；`src/__integration__/uiStandIns.tsx:93-108` |
| E2 | OBS-REG-001 | 遗漏：“Skip for now” 同时跳过项目创建和 ToU 同意。之后当前 tab 会话靠 sessionStorage `ba.signupLegalSuppress` 不拦截，新会话的 owner 会被拦到 `/legal-consent` | `CreateProjectStep.tsx:32-34`；`LegalDocumentConsentGuard/index.tsx:114-127,220-222` |
| E3 | OBS-REG-001 | 遗漏：Step 1 成功后后端已置 `is_completed`，前端只在最后一步设置 `registrationCompleted`。在 Step 2 刷新会跳过 Step 2（[I]，需 stage 确认） | `src/core/store/slices/registration.ts:10-19` |
| E4 | §2.4 图 | `/verification /error /forbidden /not-found /account-* /enter-account /login/mcp → No guard` 不准确。host 的 `MerchantAccessGuard` 和 `RouteAccessGuard` 确实不作用于这些路由，但 SDK 的 RegistrationGuard、EnterAccountGate、LegalDocumentConsentGuard、AuthChecker 包住整棵树。结果：注册未完成的会话访问 `/login/mcp` 会被送去 `/registration`；未登录访问 `/enter-account`、`/account-*`、`/forbidden`、`/not-found` 会被送去 `/login` | `sh/PlatformShell.tsx:193-239`；`pc/auth/RegistrationGuard/index.tsx:23-25`；`pa/utils/checkDisallowedUrls.ts` |
| E5 | OBS-MCP-003 | “Works with or without a web-games session”（源码注释，spec 沿用）对注册未完成的会话不成立，见 E4 与 RT-MCP-027 | `src/layouts/mcp-login/index.tsx:87-89`；`src/routes.tsx:180-182` |
| E6 | OBS-MCP-001 | 遗漏细节：`client_id` 还需匹配 `^\d{1,20}$`；`state` 与 `code_challenge` 使用同一 `^[\w.~-]{1,256}$`；loopback 指 `localhost`、`[::1]` 和字面量 `127.0.0.0/8`；`audience` 可选透传；空 fragment `#` 能通过 | `src/core/mcp/oauthLogin.ts:29-32,47-79` |
| E7 | OBS-MCP-003 / §7 | 遗漏错误分支：organization registration 的 body 为 `{http_status_code:404}` 时视为成功；失败时抛 `RegistrationError`，同一凭据再次提交只重试 registration | `oauthLogin.ts:262-304,351-364`；`index.tsx:332-339` |
| E8 | §7 | 缺少注册与同意相关的 endpoint（由 SDK 发出，但由 host 页面直接触发）：`pass_survey`、`users/{id}/credential`、`legal-documents/consents/status`、`legal-documents/consents`、`legal-documents/current` | `pa/apis/registration.ts:13-28`；`pa/apis/legal-document.ts:35-84` |
| E9 | OBS-REG-003、§10.2、§12 U-01 | 标为 [U]/unknown。本地 `node_modules` 中有同版本 SDK 源码，可以关闭（见 §4）。spec 头部“快照中没有 node_modules”只对 772a320 快照本身成立 | 见 §4 |
| E10 | §4.11 | 遗漏：Step 1 副标题使用占位文案 “Add short description of why you are collecting this information”，会显示给真实用户 | `src/locales/en.json` `host.pages.registration.step.1.description`；`Registration.tsx:72-76` |

v0.2.0 已修正 MCP 注册请求的证据位置（`oauthLogin.ts:240-261`）。本文件的追溯已按新位置填写。


