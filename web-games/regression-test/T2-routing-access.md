# T2 路由·访问控制·项目作用域·导航：stage 手工回归用例

| 项 | 值 |
|---|---|
| Track | T2 路由·访问控制·项目作用域·导航（ROUTE / ACC / PROJ / NAV） |
| 基于 spec 版本 | 0.3.2（`../web-games-account_reverse_spec.md`；P5 定向更新，变更见文末"P5 变更记录"；P4 基于 0.3.1） |
| 代码基线 | `master@772a320`（v1，`src/`） |
| 对照分支 | `WASP-2524-migrate-tests-to-apps`（V2，`apps/web-games/src`），差异标 `[分支差异]` |
| 生成日期 | 2026-10-21 |
| SDK 版本核对 | `node_modules/.pnpm` 中 platform-apis 2.29.2、platform-components 4.20.3、platform-pages 3.25.2、platform-store 1.15.6、platform-ui 0.10.0、platform-shell 2.22.3，与 772a320 `package.json:52-61` 一致 |

## 0. 阅读约定

- `{B}` = stage 应用根：`https://accounts-sdk-skeleton.nl-k8s-stage.srv.local/for/web-games/account`（`e2e/fixtures/env.ts:12,18`）。`{m}` = 当前 merchant id，`{p}` = 该 merchant 的项目 id。用例中的路径都接在 `{B}` 后面。
- "直接 URL" = 在地址栏输入后回车（整页加载）。"点击菜单" = 在已加载的页面里点 sidebar / topbar（SPA 内跳转）。
- "/forbidden" = 顶层 403 页（`data-id="forbidden-error-container"`）。"/not-found" = 顶层 404 页（`data-id="not-found-error-container"`）。
- 代码引用默认指 `772a320:src/...`；SDK 引用指 `node_modules/.pnpm/@accounts-sdk+<pkg>@<ver>*/.../dist/index.mjs:<行>`。
- 优先级：P0 = 阻断进入 app；P1 = 核心功能；P2 = 边界或次要分支。
- 自动化列：`I*`/`D*` = `src/__integration__/scenarios.ts` 的 v1 集成场景；单测写文件名；e2e `smoke-areas.ts` 中的区域全部是 `test.fixme`（无断言），不计为自动化。`[分支差异]`：V2 `apps/web-games/tests/integration` 目前只迁移了 I6/I7 和一个 dashboard smoke，I8–I15、D1、D2 尚未迁移。

### 0.1 守卫顺序（v1）

```mermaid
flowchart TD
  U[URL] --> W{RouteWrap: 路径含 //?}
  W -- 是 --> W2[replace 为合并后的路径<br/>丢弃 search 和 hash]
  W -- 否 --> T{顶层 Switch 首个匹配}
  T -->|/verification /error /forbidden /not-found /account-* /enter-account /login/mcp| P0[直接渲染，无 host guard]
  T -->|/:merchant_id\d+| G1[MerchantAccessGuard] --> G2[withMerchantRequired] --> G3[RouteAccessGuard]
  T -->|其他| O[OutsideLayout → 未知路径 /not-found]
  G3 -->|匹配分支有 privileges 且未就绪| L[route-privileges-loader]
  G3 -->|任一匹配路由被拒| F[/forbidden replace]
  G3 -->|section 角色规则| S{allow / landing / forbidden}
  S -->|allow| R[RenderRoutes] --> PR{requiresProject?}
  PR -->|是| PG[ProjectRequiredRoute<br/>loader / error / 改写 id / NoProjectPage / forbidden]
  PR -->|否| PAGE[页面 / remote / 页面内校验]
```

---

## 1. 权限 × 菜单/路由矩阵

记号：`ps` = `project_settings`；"—" = 没有该层 gate；"不一致" 列给出菜单与路由判定不同的情况和对应用例。visibility 列只记录声明值：v1 中路由层和 sidebar 层都不读取它（OBS-ACC-005，spec 0.3.0），所以它对显隐没有影响。

### 1.1 Merchant sidebar（`layouts/sidebar/merchant-sidebar-v2/nav-items-config.tsx`）

| 菜单 dataId → 路径 | 路由 gate | 菜单可见规则 | feature flag | 需 project | visibility（不生效） | 菜单/路由不一致 |
|---|---|---|---|---|---|---|
| `sidebar-get-started` → `/get-started` | — | 所有人（`privileges: []`） | — | 否 | — | section 角色（catalog/liveops）菜单可见，点击后 `/forbidden` → RT-NAV-017 |
| `sidebar-dashboard` → `/dashboard` | 页面内：项目数>0 要 `get_graphics_gross_revenue`，否则要 `project_create`；junior developer 拒绝（`pages/Dashboard.tsx:136-142`） | 同一规则（`core/utils/dashboardAccess.ts:17-22`） | — | 否 | — | 一致 |
| `sidebar-projects` → `/projects` | `client_show_project_list` | 有该权限 **或** 角色=`ROLE_JUNIOR_DEVELOPER`；gnation 非 admin 时只对 junior 隐藏，否则对 accounting/support 角色隐藏（`:157-168`） | — | 否 | — | junior developer 无该权限：菜单可见，点击 `/forbidden` → RT-NAV-016 |
| `sidebar-transactions`（Player support 组） | `/support` 要 `transaction_search_section` | `transaction_search_section` + (`transactions_search_junior_support` 或 `transactions_search`+`transactions_full_text_search`)；junior developer 隐藏 | — | 否 | support | 只有 `transaction_search_section` 的用户：菜单隐藏，URL 可达 → RT-NAV-019 |
| ├ `sidebar-support-transactions` → `/support/transactions` | 同上 | 同组 | — | 否 | — | — |
| ├ `sidebar-support-tickets` → `/support/tickets` | 同上 | 对 junior developer、`ROLE_ACCOUNTING_PARTIAL`、merchant 386410/276256 隐藏 | — | 否 | — | 被隐藏的人 URL 仍可达 → RT-NAV-019 |
| └ `sidebar-support-subscribers` → `/support/subscriptions` | 另要 `recurrent_subscription_get_all` | 只看 merchant feature `subs_support` | `subs_support` | 否 | — | 有 feature 无权限：菜单可见，点击 `/forbidden` → RT-NAV-012 |
| `sidebar-analytics` 组（7 个子项 `/analytics/*`） | — | 对 junior developer 隐藏；需 `analytics_view` 或 `disputes_access` 或 admin | — | 否 | xaa_widgets | 无这些权限：菜单隐藏，URL 全部可达 → RT-NAV-019 |

### 1.2 Project sidebar "Tools"（`layouts/sidebar/project-sidebar-v2/nav-items-config.tsx`）

整组规则：accounting/support 角色（`PROJECTS_HIDDEN_ROLES`）整组为空（`:478-480`）；section 角色只保留其 section 内的条目（`:68-84`）；子项本身**都没有 privileges 声明**，只有下表列出的 `hidden` / `disallowedIntegrationTypes`。

| 菜单 → 路径（`/projects/{p}` 下） | 路由 gate | 菜单可见规则 | feature flag | 需 project | visibility（不生效） | 菜单/路由不一致 |
|---|---|---|---|---|---|---|
| Game player platform → `/player-platform` | — | 总是 | — | 是 | player-platform | — |
| Launcher → `/new-launcher` | — | 总是 | — | 是 | launcher | — |
| Payments 组 → `/payments/{methods,configuration,payrank}` | `ps` | 总是 | — | 是 | payments | 无 `ps`：可见→`/forbidden` → RT-NAV-006 |
| Receipt customizer（外链） | — | 总是 | — | 是 | — | — |
| Login → `/login` | 拒绝 `ROLE_VIEWER` | `selectHasViewerRole`（feature `role_viewer` **且** 角色=`ROLE_VIEWER`）时隐藏 | `role_viewer` | 是 | login | ROLE_VIEWER 无 `role_viewer`：可见→`/forbidden` → RT-NAV-011 |
| All items → `/storefront` | `store_virtual_currency_get_list`+`store_virtual_item_get_by_sku`+`game_delivery_get_games`+`ps` | 总是 | — | 是 | storefront | 缺任一：可见→`/forbidden` → RT-NAV-010 |
| Subscriptions → `/subscriptions/plans` | `ps`，拒绝 gnation（非 admin） | 总是 | — | 是 | subscriptions | gnation 或无 `ps` → RT-NAV-007 |
| Catalog imports → `/storefront/catalog-management/connectors` | 同 storefront | 总是 | — | 是 | — | 同 All items |
| LiveOps 组（promotions、rewards、daily-rewards、offer-chains、loyalty、referral、upsell、personalization） | 同 storefront | legacy API 项目隐藏整组；daily-rewards / offer-chains 看 store feature；`isSupportRole` 隐藏（实际不可达，见 E15） | store features | 是 | storefront | 同 All items |
| Creator marketing → `/network` | 拒绝 `ROLE_VIEWER` | 同 Login | `role_viewer` | 是 | network（路由侧） | 同 Login → RT-NAV-011 |
| Offerwall → `/offerwall` | — | 总是 | — | 是 | offerwall | — |
| Websites → `/site-builder` | — | gnation 非 admin 隐藏 | — | 是 | site-builder | gnation：菜单隐藏，URL 可达 → RT-ACC-009 |
| Xsolla Gold → `/gold` | — | 总是 | — | 是 | xsolla-gold | — |
| Discord bot → `/discord-bot` | `ps` | 总是 | — | 是 | discord-bot | 无 `ps` → RT-NAV-008 |
| SDK → `/sdk` | — | 总是 | — | 是 | — | — |
| Funding → `/funding` | `ps` | 总是 | — | 是 | funding | 无 `ps` → RT-NAV-008 |
| Email customizer（外链） | — | 总是 | — | 是 | — | — |
| Cloud gaming → `/cloud-gaming` | `cloud_gaming_access` | 总是 | — | 是 | cloud-gaming | 无权限 → RT-NAV-009 |
| Integrations → `/integrations` | — | 总是 | — | 是 | — | — |
| Marketplace → `/{m}/marketplace` | — | 总是（无项目时也在 nav 数据里，见 E14） | — | 否 | — | — |
| Ontology → `/{m}/ontology` | 页面内 `useOntologyAccess`，不通过时回 `/{m}` | `isOntologyEnabled` | ontology 模块 | 否 | — | 一致 |

### 1.3 Bottom sidebar（`layouts/sidebar/bottom-sidebar-v2/nav-items-config.tsx`）

| 菜单 → 路径 | 路由 gate | 菜单可见规则 | feature flag | 需 project | 菜单/路由不一致 |
|---|---|---|---|---|---|
| Billing center 组（`to=/finance`） | `/finance`：`transactions_registry` | `transactions_search`+`transactions_registry`+`get_transaction_details`；junior developer 隐藏 | — | 否 | 只有 registry：菜单隐藏，URL 可达 → RT-NAV-019 |
| └ Payouts → `/finance/payouts` | registry + `get_transfers` | `get_transfers`（叠加组规则） | — | 否 | 子项全被过滤时组退化成指向 `/finance` 的单项 → RT-NAV-020 |
| Document center 组 | — | 子项全部被过滤时整组消失 | — | 否 | — |
| ├ Agreements → `/agreement` | — | 仅 OWNER / ACCOUTING / JUNIOR_ACCOUNTING 或 admin | — | 否 | 其他角色菜单隐藏，URL 可达 → RT-NAV-019 |
| ├ Tax interview → `/tax-interview` | registry + `legal_onboarding_get_tax_interview_link` | 同上角色 + `legal_onboarding_get_tax_interview_link`（不看 registry） | — | 否 | 无 registry：可见→`/forbidden` → RT-NAV-013 |
| ├ Reports → `/finance/reports` | registry + `get_reports` | search + registry + details + `get_reports` | — | 否 | 路由比菜单宽松 |
| └ Documents → `/finance/boxnet` | registry + `get_merchant_boxnet_url` | search + registry + details + boxnet | — | 否 | 路由比菜单宽松 |
| Settings 组 → Project settings `/projects/{p}/edit` | `ps`，拒绝 gnation（非 admin） | `ps`；项目 id 未就绪时隐藏 | — | 是（`selectProjectIdForNavigation`：当前项目，否则第一个） | gnation：可见→`/forbidden` → RT-NAV-014 |
| ├ Members → `/settings/users` | `get_merchant_users` | `get_merchant_users` | — | 否 | 一致 |
| ├ Integration settings → `/projects/{p}/edit/advanced` | 同 `/edit` | `ps` + (`internal_merchant_settings_get` 或项目 `is_universal_item_enabled`) | — | 是 | gnation 同上 |
| ├ Webhooks `/edit/webhooks/store` 或 API calls `/edit/event-api` | 同 `/edit` | `ps`；feature 开启时需存储设置已加载 | `webhookless_integration` | 是 | gnation 同上；预检见 RT-NAV-024 |
| └ API keys → `/projects/{p}/edit/api_key` | `ps`+`api_key_list`，拒绝 gnation | `ps`+`api_key_list` | — | 是 | gnation → RT-NAV-014 |

### 1.4 Settings layout sidebar 与 topbar

| 入口 → 路径 | 路由 gate | 入口可见规则 | 不一致 |
|---|---|---|---|
| Company settings → `/settings/company` | 拒绝 `ROLE_VIEWER` | 总是（`layouts/settings/SettingsSidebar.tsx:36-40`） | viewer 可见→`/forbidden` → RT-NAV-015 |
| API keys → `/settings/api_key` | `merchant_get_api_key`，拒绝 `ROLE_VIEWER` | `merchant_get_api_key` | 有该权限的 viewer → RT-NAV-015 |
| Administration → `/settings/administration` | 无路由 gate；SDK 页面对非 admin 跳 `/settings/company` | 仅 admin | — |
| Topbar 项目切换器 | — | 对 accounting/support 角色不渲染（`components/Navigation/index.tsx:47-53`）；其他人只在 `/get-started`、`/projects/{id}/*`（`/analytics` 除外）显示（platform-apis `DEFAULT_PROJECT_SWITCHER_RULES`） | — |
| Topbar 聊天按钮 → `/{m}/communication-hub` | — | SDK | — |
| Profile → `/{m}/profile` | — | SDK | — |
| 公司切换 → 整页加载 `{B}/{id}` | MerchantAccessGuard | SDK | — |

### 1.5 只能直接输入 URL 的路由（没有菜单入口）

`/{m}/funding`、`/{m}/metaframe`、`/{m}/'gold'`、`/{m}/'link'`、`/{m}/frame/:frame_path`、`/{m}/documents`、`/{m}/settings/members`、`/{m}/settings/user-activity`、`/{m}/saved-payout-methods`（Payouts 页 tab）、`/{m}/tax-interview/faq`、`/{m}/projects/create`、`P/edit/*`、`P/sdk/integration`、`P/launchers`、`P/metaframe`、`P/link`。其中 `/{m}/metaframe`、`/{m}/'gold'`、`/{m}/'link'` 当前必崩（S-35，见 RT-ROUTE-036、RT-ROUTE-028）`[P5]`。

---

## 2. Route inventory 可达性表（v1）

前置：owner 账号（全部权限），merchant `{m}` 至少有项目 `{p}`。"守卫" 指 MerchantAccessGuard 之后的 host 侧判定。每行对应一条可达性检查，执行时直接输入 URL。

| # | 路径 | 预期落地（owner） | 守卫 / gate | 代码 | 用例 |
|---|---|---|---|---|---|
| 1 | `/verification` | SDK VerificationPage | 无 | `routes.tsx:170-172` | RT-ROUTE-001 |
| 2 | `/error` | ErrorContainer | 无，exact | `:173` | RT-ROUTE-001 |
| 3 | `/forbidden` | 403 页 | 无，exact | `:174` | RT-ROUTE-001 |
| 4 | `/not-found`、`/not-found/x` | 404 页（non-exact） | 无 | `:175` | RT-ROUTE-001/002 |
| 5 | `/account-no-access`、`/account-restricted` | AccountNoAccess | 无，exact | `:176-177` | RT-ROUTE-001 |
| 6 | `/enter-account` | EnterAccount | 无，exact | `:179` | RT-ROUTE-001 |
| 7 | `/login/mcp` | McpLogin（T5） | 无，exact | `:182` | RT-ROUTE-001 |
| 8 | `/`、`/login`、`/signup`、`/resetting`、`/resetting/confirm` | 匿名：`/` 由 BFF 302 到 `/login`，其余渲染 LoginPage；已登录：`/login` 由 BFF 302 到保存的 URL 或 `/`，`/` 只在有保存的 URL 时 302，然后 MAG 跳 `/{org0}`（T1，§2.3） `[P4]` | OutsideLayout | `:153-160` | RT-ROUTE-034 |
| 9 | `/registration`、`/legal-consent`、`/invite/:id` | 对应 SDK/本地页 | OutsideLayout | `:154-161` | RT-ROUTE-034 |
| 10 | `/{m}` | DynamicHome → `/projects` / `/get-started` / `/dashboard` | — | `:80` | RT-ROUTE-035 |
| 11 | `/{m}/dashboard` | Dashboard | 页面内规则 | `:81` | RT-ACC-039 |
| 12 | `/{m}/get-started` | GetStarted | — | `:82` | RT-ROUTE-035 |
| 13 | `/{m}/finance`、`/finance/x` | finance remote | registry（catch-all `/finance/x` 只受父级 gate） | `inside/finance.ts:40-88` | RT-ACC-013 |
| 14 | `/{m}/finance/boxnet` | SDK DocumentCenter | + `get_merchant_boxnet_url` | `finance.ts:50-54` | RT-ACC-013 |
| 15 | `/{m}/finance/reports`、`/finance/reports/download/:s` | FinanceReports（non-exact） | + `get_reports` | `finance.ts:59-62` | RT-ACC-015 |
| 16 | `/{m}/finance/payouts` | Payouts tab（exact） | + `get_transfers` | `finance.ts:66-70` | RT-ACC-014 |
| 17 | `/{m}/saved-payout-methods` | SavedPayoutMethods（exact） | `get_transfers`（不要求 registry） | `finance.ts:31-38` | RT-ACC-013/014 |
| 18 | `/{m}/frame/:frame_path` | IntegrationFrame（exact；`:frame_path` 被忽略） | — | `routes.tsx:86` | RT-ROUTE-025 |
| 19 | `/{m}/support`（只限裸路径） | 跳 `/support/transactions`（`defaultRedirect`） | `transaction_search_section` | `:89-100` | RT-ROUTE-007/018 |
| 20 | `/{m}/support/subscriptions` | Subscriptions（exact） | + `recurrent_subscription_get_all` | `:93-96` | RT-ACC-016 |
| 21 | `/{m}/support/*`（包括尾斜杠 `/{m}/support/`） | Support remote | 同 19 | `:97` | RT-ROUTE-007/018 |
| 22 | `/{m}/communication-hub[/x]` | MF 2.0 remote | — | `:101` | RT-NAV-029 |
| 23 | `/{m}/support-hub[/x]` | 跳 `/communication-hub` | — | `:102` | RT-ROUTE-011/012 |
| 24 | `/{m}/funding[/x]` | funding remote | — | `:103` | RT-ROUTE-024 |
| 25 | `/{m}/metaframe[/x]` | metaframe remote。**当前必崩**（S-35）`[P5]` | `ps` | `:104-107` | RT-ACC-019、RT-ROUTE-036 |
| 26 | `/{m}/gold`、`/{m}/link` | **/not-found**（D1）；只修 D1 会变为必崩（S-35）`[P5]` | — | `:108-114` | RT-ROUTE-026/027 |
| 27 | `/{m}/'gold'`、`/{m}/'link'` | 能匹配，但**当前必崩**（S-35）；`'gold'` 无 `ps` 时 `/forbidden` `[P5]` | — | `routes.test.tsx:300-301` | RT-ROUTE-028 |
| 28 | `/{m}/marketplace` | 常量 iframe（exact，无 sidebar） | — | `:117` | RT-ROUTE-022 |
| 29 | `/{m}/ontology` | ontology iframe 或回 `/{m}` | 页面内 | `:118` | RT-ACC-038 |
| 30 | `/{m}/analytics/{payments,anti-fraud,anti-fraud/blocklist,catalog,players,engagement,web-shop,support}`、`/analytics/main-info/afs/chargeback-registry` | 9 个 board（exact） | — | `inside/advanced-analytics.ts:31-70` | RT-ROUTE-016/017 |
| 31 | `/{m}/analytics`、`/analytics/<其他>`、`/analytics/products/*` | 重定向（见 §3） | — | `:71-80` | RT-ROUTE-013~016 |
| 32 | `/{m}/agreement[/x]` | SDK AgreementsPage（non-exact） | — | `routes.tsx:120` | RT-NAV-019 |
| 33 | `/{m}/tax-interview`、`/tax-interview/faq` | SDK（exact） | registry + tax link | `:121-133` | RT-ROUTE-030 |
| 34 | `/{m}/documents` | SDK（exact） | `get_merchant_boxnet_url` | `:134-138` | RT-ACC-005 |
| 35 | `/{m}/projects` | SDK ProjectsPage（exact） | `client_show_project_list` | `inside/projects.ts:79-85` | RT-ACC-017 |
| 36 | `/{m}/projects/create` | SDK CreateProject | `project_create`，拒绝 gnation | `:87-94` | RT-ROUTE-032 |
| 37 | `/{m}/projects/{p}` | SDK ProjectDetailPage | ProjectRequiredRoute + `project_get`，拒绝 gnation | `:137-154` | RT-PROJ-001 |
| 38 | `P/edit/api_key` | SDK ApiKeys（exact） | `ps`+`api_key_list`，拒绝 gnation | `:156-161` | RT-ACC-019 |
| 39 | `P/edit`、`P/edit/{advanced,webhooks,event-api}` | SDK 设置壳（non-exact） | `ps`，拒绝 gnation | `:165-170` | RT-PROJ-017 |
| 40 | `P/integrations`、`P/sdk`、`P/sdk/integration` | SDK / remote（exact） | — | `:171-173` | RT-ROUTE-004 |
| 41 | `P/storefront[/x]` | storefront remote | 3 个 store 权限 + `ps` | `inside/storefront.ts` | RT-ACC-019 |
| 42 | `P/network`、`P/login` | remote | 拒绝 `ROLE_VIEWER` | `inside/network.ts`、`projects.ts:210-213` | RT-ACC-007 |
| 43 | `P/launchers`、`P/new-launcher`、`P/player-platform`、`P/offerwall`、`P/site-builder`、`P/metaframe`、`P/gold`、`P/link` | remote | — | `projects.ts:182-224` | RT-ACC-019 |
| 44 | `P/cloud-gaming` | remote | `cloud_gaming_access` | `:186-189` | RT-ACC-020 |
| 45 | `P/payments`、`P/funding`、`P/discord-bot` | remote / SDK | `ps` | `:196-229` | RT-ACC-019 |
| 46 | `P/subscriptions` | remote | `ps`，拒绝 gnation | `inside/subscriptions.ts` | RT-ACC-009 |
| 47 | `/{m}/settings/members[/x]`、`/settings/users[/x]` | SDK MembersPage（non-exact） | `get_merchant_users` | `inside/settings.ts:37-47` | RT-ACC-021 |
| 48 | `/{m}/settings/user-activity` | SDK（exact） | `merchant_get_access_logs` | `:48-52` | RT-ACC-021 |
| 49 | `/{m}/settings/company`、`/settings/api_key` | SettingsLayout（exact） | 拒绝 viewer；api_key 另要 `merchant_get_api_key` | `:54-57` | RT-ACC-004/006 |
| 50 | `/{m}/settings/administration` | SettingsLayout + SDK 页 | 页面内 admin | `:60` | RT-ACC-037 |
| 51 | `/{m}/profile` | SDK ProfilePage（exact） | — | `routes.tsx:144-148` | RT-ROUTE-029 |
| 52 | `/{m}/<未知>`、裸 `/{m}/settings`；`/{m}/projects/<非数字>`、`P/<未知>` | /not-found | 前两个由 merchant 数组显式 `*` 接住（`:149`）；后两个由 `createRoute` 给 `/projects` 子树追加的 `*` 接住 | `:149`；`createRoute.ts:29-38` | RT-ROUTE-004 |
| 53 | `/<非数字>/...` | /not-found（outside） | — | `:162` | RT-ROUTE-003 |
| 54 | `/verification/<x>` | /not-found（`createRoute` 给 `/verification` 子树追加的 `*`，OBS-ROUTE-002 0.3.0） | 无 | `routes.tsx:170-172`；`createRoute.ts:29-38` | RT-ROUTE-033 |

---

## 3. Legacy redirect 与改写映射表（v1）

| 旧 path（示例） | 新 path | 子路径 | query / hash | 机制（代码） | 用例 |
|---|---|---|---|---|---|
| `/{m}/support-hub` | `/{m}/communication-hub` | — | 丢弃 | `<Redirect to=string>`（`routes.tsx:64-66,102`），non-exact | RT-ROUTE-011 |
| `/{m}/support-hub/inbox?x=1` | `/{m}/communication-hub` | **丢弃** | 丢弃 | 同上 `[分支差异]` V2 为 exact，落 /not-found | RT-ROUTE-012 |
| `/{m}/analytics/products/site-builder?period=7d#h` | `/{m}/analytics/web-shop?period=7d#h` | 丢弃（route non-exact） | **保留** | `layouts/advanced-analytics/index.tsx:108-123` | RT-ROUTE-013 |
| `/{m}/analytics/products/login` | `/{m}/analytics/engagement` | 丢弃 | 保留 | `LEGACY_PRODUCT_SECTIONS`（`:99-104`） | RT-ROUTE-014 |
| `/{m}/analytics/products/<其他>`、`.../Site-Builder` | `/{m}/analytics/payments` | 丢弃 | 丢弃 | 落到 `/analytics` catch-all（`:89-91`） | RT-ROUTE-015 |
| `/{m}/analytics`、`/{m}/analytics/main-info/<x>` | `/{m}/analytics/payments` | 丢弃 | 丢弃 | `AnalyticsDefaultRedirect` | RT-ROUTE-016 |
| `/{m}/analytics/` | `/{m}/analytics//payments` → `/{m}/analytics/payments` | — | 丢弃 | `match.url` 带尾斜杠 + RouteWrap 合并 | RT-ROUTE-016 |
| `/{m}/support`（裸路径） | `/{m}/support/transactions` | — | 丢弃 | `defaultRedirect`（`routes/defaultRedirect.tsx:8-13`）只接裸 `/support`；`/support/` 与其他子路径被 `/support/*` 接走，不跳转 | RT-ROUTE-007/018 |
| 任意含 `//` 的路径 | 合并后的路径 | 保留 | **丢弃** | `RouteWrap.tsx:13-16`（replace） | RT-ROUTE-009 |
| `/{m}` | `/{m}/projects`（PROJECT_ONLY 角色）/ `/{m}/get-started` / `/{m}/dashboard` | — | 丢弃 | `components/DynamicHome/index.tsx:54-79` | RT-ROUTE-035 |
| `/{m}/projects/{未知}/x?q#h` | `/{m}/projects/{当前或第一个}/x?q#h` | **保留** | **保留** | `ProjectRequiredRoute.tsx:91-96` + SDK `replaceProjectIdInPath` | RT-PROJ-002 |
| `/{m}/projects/{任意}`（无项目） | `/{m}/projects/0` | 保留 | 保留 | SDK `getProjectRouteRedirectId` 返回 0 | RT-PROJ-003 |
| `/{m}/projects/{不在列表中}/x`（列表不完整，详情不是 403/404） | 不改写 | — | — | SDK 条件 3；`ProjectRequiredRoute.tsx:98-114` `[P5]` | RT-PROJ-008/009 |
| `/{m}/projects/0/x`（整页加载，merchant 有项目） | `/{m}/projects/{BFF 取到的第一个项目}/x`（BFF 302） | 保留 | 待确认 | platform-bff `bff-routes.ts:156-167`、`merchant-sentinel.ts:164-247` `[P5]` | RT-PROJ-009 |
| `/{m}/projects/0/x`（整页加载，无项目或列表请求失败） | `/{m}/`（BFF 302），然后 DynamicHome 分流 | 丢弃 | 待确认 | 同上 `[P5]` | RT-PROJ-003/018 |
| `/0/x`（整页加载） | `/{默认 org}/x`（BFF 302） | 保留 | 待确认 | 同上（T1 RT-MAG-009 主测） `[P5]` | — |
| section 角色 `/{m}/projects/{p}[/]` | `/{m}/projects/{p}{landing}` | — | 丢弃 | `route-access.ts:107-113` | RT-ACC-023/025/026 |
| 非 admin `/{m}/settings/administration` | `/{m}/settings/company` | — | 丢弃 | platform-pages 3.25.2 `index.mjs:2822-2823` | RT-ACC-037 |
| ontology 未启用 `/{m}/ontology` | `/{m}` | — | 丢弃 | `layouts/ontology/index.tsx:35-37` | RT-ACC-038 |
| 外部 merchant `/{999}/x`（客户端导航） | `/{org0}` | 丢弃 | 丢弃 | `useMerchantAccessGuard.ts:148-160`（T1 主测） | RT-PROJ-014 |
| 外部 merchant `/{999}/x`（整页加载） | 不改写，显示 500 HydrationError（S-34；AC-01b 期望 `/{org0}`） `[P4]` | — | — | platform-store `slices/user.ts:120-137`；platform-apis `apis/merchant.ts:106-107`（T1 RT-MAG-015 主测） | RT-PROJ-019 |
| 被拒路由 | `/forbidden` | — | 丢弃 | replace | RT-ACC-041 |
| 未匹配路由 | `/not-found` | — | 丢弃 | `routes/not-found.tsx`；merchant/outside 由显式 `*`（`routes.tsx:149,162`）接住，`/projects`、`/verification` 子树由 `createRoute` 追加的 `*` 接住 | RT-ROUTE-004/033 |

`[分支差异]` V2 新增：`/{m}/finance/boxnet` → `/{m}/documents`；`/{m}/settings/api_key` → `/{m}/settings/api-key`；`P`（exact）→ `P/edit`；`P/ontology` → `/{m}/ontology`；support-hub 改为 exact。

---

## 4. 用例

### 4.1 ROUTE

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-ROUTE-001 | 顶层路由先于 merchant 树匹配 | admin 或非 owner 已登录；用 owner 时须 ToU 已签且已看过 enter-account | 依次直接打开 `/forbidden`、`/not-found`、`/error`、`/account-no-access`、`/account-restricted`、`/enter-account`、`/verification` | 每个页面单独渲染，没有 merchant sidebar；URL 不变。注意：首次进入的非 admin owner（ToU 已签、未看过 enter-account）在 consent 加载完成后，会被 EnterAccountGate 从 `/error`、`/forbidden`、`/not-found` replace 到 `/enter-account`；`/account-*`、`/enter-account`、`/verification` 被跳过。该分支由 T1 RT-AUTH-023 覆盖，本用例不判定 | P1 | OBS-ROUTE-001、OBS-ACC-006、§2.4；`routes.tsx:169-192`；platform-components 4.20.3 `auth/EnterAccountGate/useEnterAccountGate.ts:20-31`、`:160-166` [P4] | `routes.test.tsx:224` |
| RT-ROUTE-002 | 顶层页只做 exact 匹配 | 同上 | 打开 `/forbidden/x`、`/error/x`、`/account-no-access/x`、`/enter-account/x`、`/login/mcp/x`；再打开 `/not-found/x` | 前 5 个都变成 `/not-found`；`/not-found/x` 保持原 URL 并显示 404（non-exact） | P2 | OBS-ROUTE-001；`routes.tsx:173-182` | `routes.test.tsx:239` |
| RT-ROUTE-003 | outside 树兜底 | 匿名和已登录各一次 | 打开 `/abc/dashboard`、`/unknown`、`/login/x`、`/invite` | 已登录：URL 都变为 `/not-found`。匿名：`/login/x`、`/invite` 是 BFF public 路径，返回 shell 后变为 `/not-found`；`/abc/dashboard`、`/unknown` 不是 BFF public 路径，document 请求先 302 到 `/login`，并写入 `pa-original-url`，SPA 兜底走不到 | P1 | OBS-ROUTE-002、§2.3、OBS-AUTH-009；`routes.tsx:162`；platform-bff 1.0.0 `bff-routes.ts:37`、`:128-154` [P4] | `routes.test.tsx:275,282` |
| RT-ROUTE-004 | merchant 树与 project 子树的 not-found | owner，项目 `{p}` | 打开 `/{m}/unknown`、`/{m}/dashboard/x`、`/{m}/settings`、`/{m}/settings/foo`、`/{m}/settings/company/x`、`/{m}/projects/abc`、`/{m}/projects/{p}/unknown`、`/{m}/projects/{p}/sdk/x` | 全部落到顶层 `/not-found`（URL 不再含 `{m}`，sidebar 消失）；project 子路径要先等项目列表加载完 | P1 | OBS-ROUTE-002；`createRoute.ts:29-38`、`routes.tsx:149` | `routes.test.tsx:308`（部分） |
| RT-ROUTE-005 | merchant id 后紧跟非分隔符 | owner | 打开 `/{m}abc`（例如 `/123abc`） | 落到 `/not-found`；不出现 `/{m}` 的 merchant 页面（MAG 仍会先校验 `{m}`，见 T1 S-14） | P2 | OBS-ROUTE-001；`routes.tsx:56` | — |
| RT-ROUTE-006 | 尾部斜杠 | owner | 打开 `/{m}/dashboard/`、`/{m}/settings/company/`、`/{m}/projects/{p}/`、`/{m}/` | 与不带斜杠的页面相同（RR 4.3.1 `strict=false`），不跳 not-found | P1 | OBS-ROUTE-001；`RenderRoutes.tsx:15-19` | — |
| RT-ROUTE-007 | `/support/` 尾斜杠不触发默认跳转 | owner | 分别打开 `/{m}/support` 和 `/{m}/support/` | 前者变为 `/{m}/support/transactions`；后者**不**跳转，直接渲染 support remote（子路径为空）。remote 显示内容待确认 | P2 | OBS-ROUTE-002（`/support/*` 接走包括 `/support/` 在内的全部子路径，`defaultRedirect` 只接裸 `/support`）、§5；`routes.tsx:89-100`、path-to-regexp 1.9.0 [P3] | — |
| RT-ROUTE-008 | 大小写不敏感匹配与 chrome 显隐（S-38，**预期失败项**） | owner | 1. 打开 `/{m}/DASHBOARD`、`/{m}/Settings/Company`、`/{m}/Marketplace`<br>2. 对照打开小写的 `/{m}/dashboard`、`/{m}/settings/company`、`/{m}/marketplace` | 路由都能匹配并渲染（`sensitive=false`）<br>**期望**：chrome 与小写 URL 一致：`/settings/company` 和 `/marketplace` 不显示 shell sidebar，`/dashboard` 内容区无 padding<br>**当前（预期失败项）**：stage 实测 `/{m}/Settings/Company` 显示了 shell sidebar，小写路径不显示。原因：`Root.tsx` 的 chrome 规则用区分大小写的 `includes`，而路由匹配不区分大小写。按同一规则推断 [I]：`/{m}/DASHBOARD` 内容区多出 padding；`/{m}/Marketplace` 显示 sidebar；`/Settings/Company` 上 `isCompanySettingsPage` 为 false，promo banner 可能与 SDK 的 PAInfoBanner 叠加。记录实际结果<br>**修复后**：chrome 判断前先把 pathname 转成小写（或改用路由匹配结果），大写 URL 的 chrome 与小写一致 | P2 | OBS-ROUTE-008、S-38、§10.3；`Root.tsx:158-236`（`:203-205`、`:210`、`:218-232`） [P5] | — |
| RT-ROUTE-009 | `//` 合并并丢 query/hash | owner | 打开 `/{m}//dashboard?x=1#h`；然后按浏览器 Back | URL 变为 `/{m}/dashboard`，`?x=1#h` 丢失；Back 不回到含 `//` 的地址（replace） | P1 | OBS-ROUTE-003、E5；`RouteWrap.tsx:13-16` | `RouteWrap.test.tsx:40-66` |
| RT-ROUTE-010 | query 中的 `//` 不触发合并 | owner | 打开 `/{m}/dashboard?u=https://a.b` | URL 保持不变 | P2 | OBS-ROUTE-003 | `RouteWrap.test.tsx:74` |
| RT-ROUTE-011 | support-hub 别名 | owner | 直接打开 `/{m}/support-hub` | URL 变为 `/{m}/communication-hub`，渲染 Communication Hub，sidebar 隐藏 | P1 | OBS-ROUTE-005；`routes.tsx:64-66,102` | I11 |
| RT-ROUTE-012 | support-hub 子路径与 query | owner | 打开 `/{m}/support-hub/inbox?x=1` | 当前：URL 变为 `/{m}/communication-hub`，子路径和 query 丢失。`[分支差异]` V2 为 exact（`legacy-redirects.tsx:22`），同一 URL 落 `/not-found` | P2 | OBS-ROUTE-005、E6 | — |
| RT-ROUTE-013 | analytics 旧产品路径保留 query 和 hash | owner | 打开 `/{m}/analytics/products/site-builder?period=7d#top` | URL 变为 `/{m}/analytics/web-shop?period=7d#top`，渲染 Web shop board | P1 | OBS-ROUTE-006；`advanced-analytics/index.tsx:108-123` | I12（只断言 search） |
| RT-ROUTE-014 | `login` 旧产品映射 | owner | 打开 `/{m}/analytics/products/login?d=1` | URL 变为 `/{m}/analytics/engagement?d=1` | P2 | OBS-ROUTE-006、E7；`:99-104` | `advanced-analytics.test.ts:162` |
| RT-ROUTE-015 | 未映射产品与大小写 | owner | 打开 `/{m}/analytics/products/foo?d=1`；再打开 `/{m}/analytics/products/Site-Builder?d=1` | 两者都落到 `/{m}/analytics/payments`，query 丢失（第二个先跳 `/analytics/undefined` 再被 catch-all 接住） | P2 | OBS-ROUTE-006、E7；`advanced-analytics.ts:21,73-80` | — |
| RT-ROUTE-016 | analytics 默认跳转 | owner | 打开 `/{m}/analytics`、`/{m}/analytics/`、`/{m}/analytics/main-info/overview?x=1` | 都落到 `/{m}/analytics/payments`，query 丢失 | P1 | OBS-ROUTE-006；`index.tsx:89-91` | `advanced-analytics.test.ts:141` |
| RT-ROUTE-017 | Chargeback registry 不被 catch-all 吞掉 | owner | 打开 `/{m}/analytics/main-info/afs/chargeback-registry` | 渲染 Chargeback registry（不跳 payments）；sidebar "Anti-fraud" 高亮 | P1 | OBS-ROUTE-006；`advanced-analytics.ts:47-50`、merchant nav `:207-208` | — |
| RT-ROUTE-018 | support 默认 tab 与子路径 | owner | 打开 `/{m}/support?x=1`；再打开 `/{m}/support/tickets` | 前者变 `/{m}/support/transactions`（query 丢失）；后者渲染 support remote | P1 | OBS-ROUTE-002；`routes.tsx:89-99` | `routes.test.tsx:477,488` |
| RT-ROUTE-019 | 路由数据预取 | owner，DevTools Network 打开 | 直接打开 `/{m}/documents` | 布局加载完后发出 1 次 finance documents URL 请求（`getFinanceDocumentsUrlRequest`）；页面渲染 | P2 | OBS-ROUTE-004；`Root.tsx:77-136` | `Root.test.tsx`（单测） |
| RT-ROUTE-020 | 只改 query 不重新预取 | owner | 在 `/{m}/documents` 页把 URL 改为 `/{m}/documents?x=1`（SPA 内 push，可用 `history.pushState` 后触发 popstate 或点带 query 的内部链接） | 不再发出第二次预取请求（只比较 pathname，`Root.tsx:142`） | P2 | OBS-ROUTE-004 | — |
| RT-ROUTE-021 | PUSH 滚动复位 | owner，页面可滚动 | ① 在 dashboard 滚到底部后点 sidebar 进入另一页；② 在 `/projects/{p}/storefront/virtual-currency/packages` 下切换子页；③ 浏览器 Back | ① 新页面回到顶部；② 不复位；③ 不复位（POP） | P2 | OBS-ROUTE-007；`Root.tsx:45,138-151` | `[分支差异]` V2 `tests/root-query-state.test.tsx:33` |
| RT-ROUTE-022 | chrome 显隐 | owner；另准备一个没有 setup selection 的 merchant（清空 localStorage 中的 selection） | 依次打开 `/{m}/marketplace`、`/{m}/communication-hub`、`/{m}/settings/company`、`/{m}/settings/api_key`、`/{m}/profile`、`/{m}/projects/{p}/site-builder/<site>/editor`、无 selection 时的 `/{m}/get-started` | 前 5 个无 sidebar；site-builder editor 与 Choose 页无 topbar；Choose 页同时无 sidebar | P1 | OBS-ROUTE-008；`Root.tsx:158-236` | — |
| RT-ROUTE-023 | finance 内容区 padding | owner | 打开 `/{m}/finance`、`/{m}/finance/`、`/{m}/finance/reports` | 前两个无 padding；reports 有 padding | P2 | OBS-ROUTE-008；`Root.tsx:226-227` | — |
| RT-ROUTE-024 | merchant 级 funding 只能直达 | owner | 打开 `/{m}/funding`、`/{m}/funding/requests/1` | 均渲染 funding remote；sidebar 中没有指向 merchant 级 funding 的入口 | P2 | §5；`routes.tsx:103` | `routes.test.tsx:288-293` |
| RT-ROUTE-025 | frame 路由 | owner | 打开 `/{m}/frame/reports`；再打开 `/{m}/frame/anything-else`；最后打开 `/{m}/frame` | 前两个渲染同一个 IntegrationFrame，页面内容与 `:frame_path` 无关（参数被忽略；iframe 内容属 T4）；`/{m}/frame` 为 `/not-found` | P2 | §5（`:frame_path` 被忽略）；`routes.tsx:86` [P3] | `routes.test.tsx:292,308` |
| RT-ROUTE-026 | D1 gold（merchant 级） | owner（有 `ps`） | 打开 `/{m}/gold` | **当前（缺陷现状，stage 实测）**：`/not-found`。路由声明的是字面 `/{m}/'gold'`，`/{m}/gold` 匹配不上，所以不会触发 S-35<br>**修复后**：D1 与 S-35 一起修复时，渲染 Xsolla Gold remote；无 `ps` 时 `/forbidden`。只修 D1（去掉引号）而保留 `fetchData: [fetchProjectsLite]` 时，`/{m}/gold` 会从 `/not-found` 变为必崩（S-35）。spec 也允许直接删除这条路由（§13 第 1、8 项），此时保持 `/not-found` | P1 | D1、S-35；`routes.tsx:108-111` [P5] | D1（`scenarios.ts:233-241`） |
| RT-ROUTE-027 | D1 link（merchant 级） | owner | 打开 `/{m}/link` | **当前（按代码，stage 未单独记录）**：`/not-found`，不触发 S-35<br>**修复后**：D1 与 S-35 一起修复时，渲染 Xsolla Link remote（该路由没有 privilege gate）。只修 D1 时必崩（S-35）；该路由没有 privilege gate，所有账号都会预取并崩溃。删除路由时保持 `/not-found`。`[分支差异]` V2 已修复（`xsolla-link.ts:6`） | P1 | D1（同理推断）、S-35；`routes.tsx:112-114` [P5] | — |
| RT-ROUTE-028 | D1 字面引号路径：当前必崩（S-35，**预期失败项**） | owner（有 `ps`） | 在地址栏输入 `/{m}/'gold'` 与 `/{m}/'link'`；展开错误页的 details | **当前（stage 实测，预期失败项）**：浏览器把 `'` 编码为 `%27`，两条路径仍能匹配路由，但页面必崩：ErrorBoundary 显示 “Something went wrong”，错误为 `Minified Redux error #7`。原因与 metaframe 相同（S-35，见 RT-ROUTE-036）。`/'link'` 没有 privilege gate，任何账号都会崩溃；`/'gold'` 只在有 `ps` 时崩溃，无 `ps` 时 `/forbidden`。崩溃后先整页刷新，再执行下一条用例（U-14）<br>**修复后**：按 spec §13 第 1 项删除或修正这两条路由。删除后两条路径都落 `/not-found`；保留时不再崩溃（Gold 需 `ps`，Link 无 gate） | P2 | D1、S-35、§10.3；`routes.tsx:108-114`；`layouts/Root.tsx:105-113`；`routes.test.tsx:300-301` [P5] | `routes.test.tsx:300`（`:119` 把 `fetchProjectsLite` mock 成返回 plain action 的函数，掩盖了 S-35） |
| RT-ROUTE-029 | profile 路由 | owner | 点 topbar Profile；再打开 `/{m}/profile/x` | 前者到 `/{m}/profile` 渲染 ProfilePage（无 sidebar）；后者 `/not-found` | P1 | §5；`routes.tsx:144-148`；components 4.20.3 `index.mjs:2235-2240` | `routes.test.tsx:308` |
| RT-ROUTE-030 | tax-interview FAQ 路由 | owner（registry + tax link） | 在 `/{m}/tax-interview` 点 FAQ；关闭 FAQ | URL 变 `/{m}/tax-interview/faq` 并渲染；关闭后回到 `/tax-interview` | P1 | §5；`routes.tsx:126-133` | `routes.test.tsx:288` |
| RT-ROUTE-031 | `/{m}/new-project` | owner；viewer | 打开 `/{m}/new-project` | 772a320：`/not-found`。`[分支差异]` V2 中该路由排在 merchant 根之前（`apps/web-games/src/routes.ts:25`），无 sidebar、无 route 规则、页面内没有 `project_create` 检查，viewer 也能打开；需产品确认 | P1 | §5；V2 `routes.ts:21-26` | — |
| RT-ROUTE-032 | `/projects/create` | owner；gnation owner | 打开 `/{m}/projects/create` | owner 渲染 CreateProject；gnation 非 admin `/forbidden`。`[分支差异]` V2 已删除该路由，落 `/not-found` | P2 | §5；`projects.ts:87-94` | — |
| RT-ROUTE-033 | `/verification/x` 落 not-found | 已登录 | 打开 `/verification`；再打开 `/verification/x` | `/verification` 渲染 VerificationPage；`/verification/x` 变为 `/not-found`（`createRoute` 给 `/verification` 子树追加的 `*` 生效）。若 stage 上仍渲染 VerificationPage，记录为与 spec 不符 | P2 | OBS-ROUTE-002（0.3.0：追加的 `*` 在 `/verification`、`/projects` 子树中生效）；`routes.tsx:170-172`、`createRoute.ts:29-38` [P3] | `routes.test.tsx:246` |
| RT-ROUTE-034 | outside 路由 | 匿名 | 整页打开 `/login`、`/signup`、`/resetting`、`/resetting/confirm`、`/registration`、`/legal-consent`、`/invite/abc`、`/` | `/login`、`/signup`、`/resetting`、`/resetting/confirm`、`/invite/abc` 是 BFF public 路径，各自在 OutsideLayout 渲染。`/registration`、`/legal-consent` 不是 BFF public 路径：document 请求 302 到 `/login`，并写入 `pa-original-url`。`/` 由 BFF 302 到 `/login`，不写 `pa-original-url`。已登录访问 `/`、`/login`、`/signup` 的跳转属 T1 | P1 | OBS-ROUTE-001、§2.3、OBS-AUTH-009；`routes.tsx:153-163`；platform-bff 1.0.0 `bff-routes.ts:37`、`:128-154` [P4] | `routes.test.tsx:262`；e2e `anonymous.smoke.spec.ts:35,46`（/login、/signup） |
| RT-ROUTE-035 | 账户根分流 | ① owner 有 dashboard 权限且有 setup selection；② owner 无 selection；③ junior developer | 打开 `/{m}` | ① `/{m}/dashboard`；② `/{m}/get-started`；③ `/{m}/projects`。分流细节属 T3 | P0 | AC-07；`DynamicHome/index.tsx:45-79` | `DynamicHome/index.test.tsx`；I4/I5 断言落到 DynamicHome |
| RT-ROUTE-036 | S-35 定向：`/{m}/metaframe` 必崩（**预期失败项**） | owner（有 `ps`）；DevTools Network 打开 | 1. 整页打开 `/{m}/metaframe`<br>2. 整页刷新恢复后，打开 `/{m}/dashboard`，在 Console 执行 `history.pushState({}, '', '{B}/{m}/metaframe'); dispatchEvent(new PopStateEvent('popstate'))`<br>3. 刷新恢复后，用同样方式打开 `/{m}/metaframe/x`<br>4. 对照打开项目级 `/{m}/projects/{p}/metaframe` | **期望**：1–3 渲染 metaframe remote，没有错误<br>**当前（stage 实测 1、2，预期失败项）**：1–3 都显示 “Something went wrong”，details 中为 `Minified Redux error #7`。原因：该路由的 `fetchData` 是 `fetchProjectsLite`，它是普通 async API 函数，不是 action creator；`Root.fetchRouteData` 把它返回的 Promise 当 action dispatch。按代码推断 [I]：崩溃前 `fetchProjectsLite` 已被调用，Network 中可能有一次 lite 项目列表请求。崩溃后 SPA 内无法恢复，必须刷新（U-14，T1 RT-ERR-008）<br>4. 项目级路由没有 `fetchData`，正常加载（T4 RT-MF-025）<br>**修复后**：`fetchData` 换成真正的 thunk，或删除该条目；1–3 正常渲染。同时补路由级测试，断言每个 `fetchData` 条目都返回 plain action 或 thunk | P1 | S-35、OBS-ROUTE-004、§10.3；`routes.tsx:104-107`；`layouts/Root.tsx:77-113`；platform-apis `apis/project.ts:41` [P5] | 无：`routes.test.tsx:119` 把 `fetchProjectsLite` mock 成返回 `{type:'projects-lite'}`，测试通过，但掩盖了 S-35 |

### 4.2 ACC

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-ACC-001 | 全权限账号可进所有 gated 路由 | owner（全部权限，非 gnation） | 直接打开 §2 中 #13–#17、#19–#21、#25、#33–#35、#37–#49 | 除 #25 外全部渲染页面或 remote，无 `/forbidden`<br>#25 `/{m}/metaframe`：**当前必崩（S-35，预期失败项）**，整页加载和客户端导航都显示 “Something went wrong”（Redux error #7）。stage 实测 31/32 通过，只有 #25 失败。判定：#25 单独按预期失败记录，不阻断本用例。崩溃后先整页刷新再继续，否则后续路由都显示错误页（U-14，T1 RT-ERR-008）<br>**修复后**：#25 渲染 metaframe remote（定向用例 RT-ROUTE-036） | P0 | OBS-ACC-003、S-35、§10.3 [P5] | I14 control（仅 dashboard） |
| RT-ACC-002 | 权限加载期间显示 loader | owner；DevTools 将网络限速为 Slow 3G | 直接打开 `/{m}/documents`；再直接打开 `/{m}/get-started` | 前者在 `GET {gateway}/api/account/platform/{m}/privileges` 返回前显示 `data-id="route-privileges-loader"`；后者不显示该 loader | P1 | OBS-ACC-001；`route-access.ts:134-142`、`RouteAccessGuard.tsx:69-71` | `RouteAccessGuard.test.tsx:268-316` |
| RT-ACC-003 | 权限请求失败后永久 loading | owner；DevTools Request blocking 拦截 `*/api/account/platform/*/privileges` | ① 直接打开 `/{m}/documents`；② SPA 内点到 `/{m}/get-started`；③ 取消拦截后不刷新，再点 Documents；④ 刷新 | ① 一直显示 loader，没有重试请求；② 正常渲染；③ 仍是 loader；④ 恢复正常 | P1 | OBS-ACC-002、S-04；`route-access.ts:136-141`；platform-store `loadPrivileges`（`index.mjs:2484-2490`） | — |
| RT-ACC-004 | viewer 访问公司设置 | viewer（`ROLE_VIEWER`） | 直接打开 `/{m}/settings/company`；然后按 Back | URL 变 `/forbidden`；Network 中没有设置页的业务请求；Back 回到之前的页面，不回到被拒路径 | P0 | OBS-ACC-003、AC-04；`settings.ts:54` | I15 |
| RT-ACC-005 | 被拒路由不预取 | viewer（无 `get_merchant_boxnet_url`） | 直接打开 `/{m}/documents` | URL 变 `/forbidden`；没有 finance documents URL 请求 | P0 | OBS-ACC-003、AC-04；`Root.tsx:95-100` | I15 |
| RT-ACC-006 | viewer 有权限也被角色拦 | viewer 且持有 `merchant_get_api_key` | 直接打开 `/{m}/settings/api_key` | `/forbidden`（角色规则，与权限无关） | P1 | OBS-ACC-003(c)；`settings.ts:55-57` | `route-access.test.ts:110-129` |
| RT-ACC-007 | viewer 访问 Login / Network | viewer | 直接打开 `/{m}/projects/{p}/login`、`/{m}/projects/{p}/network` | 均 `/forbidden`。`[分支差异]` V2 不再拦 ROLE_VIEWER（`platform-access.ts:197,209`） | P1 | OBS-ACC-003(c)；`projects.ts:210-213`、`network.ts` | — |
| RT-ACC-008 | 角色值大小写敏感 | 待确认：后端返回的角色是否总是全大写 | — | 角色比较为精确匹配（`isRouteRoleDisallowed`，platform-apis `index.mjs:2922-2924`），不同大小写会放行；stage 只记录实际返回值 | P2 | OBS-ACC-003(c) | — |
| RT-ACC-009 | gnation 非 admin | gnation owner（integration_type=`gnation`） | 直接打开 `/{m}/projects/create`、`/{m}/projects/{p}`、`P/edit`、`P/edit/api_key`、`P/subscriptions`；再打开 `P/site-builder` | 前 5 个 `/forbidden`；`P/site-builder` 正常渲染（路由无 gate，菜单却隐藏） | P1 | OBS-ACC-003(a)；`projects.ts:92,153,160,169`、`subscriptions.ts` | `route-access.test.ts:46-75` |
| RT-ACC-010 | admin 绕过 integration type | admin 用户打开 gnation merchant | 打开 RT-ACC-009 中前 5 个 URL | 均渲染（admin 绕过 integration type） | P1 | OBS-ACC-003(a)；platform-apis `checkIntegrationTypeAccess`（`index.mjs:2890`） | `route-access.test.ts:65` |
| RT-ACC-011 | admin 不绕过 privilege | admin 用户；目标 merchant 上 admin 的权限列表缺少某项（例如 `get_reports`，数据待确认） | 打开 `/{m}/finance/reports` | `/forbidden`（privilege 无 admin 豁免） | P2 | OBS-ACC-003(b)；`route-access.ts:56-58` | `route-access.test.ts:103` |
| RT-ACC-012 | integration type 大小写 | merchant integration_type=`GNATION`（大写，数据待确认） | 打开 `/{m}/projects/{p}` | `/forbidden`（state 值先转小写再比较） | P2 | OBS-ACC-003(a) | `RouteAccessGuard.test.tsx:212` |
| RT-ACC-013 | 无 `transactions_registry` | no-finance（owner 去掉 registry） | 直接打开 `/{m}/finance`、`/finance/reports`、`/finance/payouts`、`/finance/boxnet`、`/tax-interview`、`/tax-interview/faq`；再打开 `/{m}/saved-payout-methods` | 前 6 个 `/forbidden`；`/saved-payout-methods` 正常渲染（只要 `get_transfers`）。`[分支差异]` V2 对它也要求 registry | P1 | OBS-ACC-003(b)；`finance.ts:31-43`、`routes.tsx:121-133` | — |
| RT-ACC-014 | 无 `get_transfers` | owner 去掉 `get_transfers` | 打开 `/{m}/finance`、`/finance/payouts`、`/saved-payout-methods` | `/finance` 渲染；后两个 `/forbidden` | P1 | OBS-ACC-003(b)；`finance.ts:31-38,66-70` | — |
| RT-ACC-015 | 无 `get_reports` | owner 去掉 `get_reports` | 打开 `/{m}/finance/reports`、`/finance/reports/download/abc` | 都 `/forbidden`（父子路由同时判定） | P1 | OBS-ACC-003(b)；`finance.ts:59-62` | `RouteAccessGuard.test.tsx:339` |
| RT-ACC-016 | support 权限 | ① 无 `transaction_search_section`；② 有该权限但无 `recurrent_subscription_get_all` | ① 打开 `/{m}/support/transactions`；② 打开 `/{m}/support/subscriptions` | ① `/forbidden`；② `/forbidden`，`/support/transactions` 正常 | P1 | OBS-ACC-003(b)；`routes.tsx:89-96` | `routes.test.tsx:456-463` |
| RT-ACC-017 | 项目列表权限不影响项目页 | 无 `client_show_project_list`、有 `project_get` 的账号（待确认 stage 是否有此组合） | 打开 `/{m}/projects`；再打开 `/{m}/projects/{p}` | 前者 `/forbidden`；后者正常（父路由 `/projects` 没有 gate） | P1 | OBS-ACC-003(b)；`projects.ts:79-85,234-239` | — |
| RT-ACC-018 | 无 `project_get` | 无 `project_get` 的 developer（待确认） | 打开 `/{m}/projects/{p}`；再打开 `P/sdk` | 前者 `/forbidden`；后者正常 | P1 | OBS-ACC-003(b)；`projects.ts:148-154` | — |
| RT-ACC-019 | 无 `project_settings` | viewer（persona 去掉了 `ps`）或 developer 去掉 `ps` | 打开 `P/payments`、`P/funding`、`P/discord-bot`、`P/edit`、`P/edit/api_key`、`P/subscriptions`、`P/storefront`、`/{m}/metaframe`；再打开 `P/integrations`、`P/offerwall`、`P/gold` | 前 8 个 `/forbidden`；后 3 个正常。`/{m}/metaframe` 被拒时 `Root.fetchRouteData` 不预取，所以不触发 S-35；如果出现 “Something went wrong”，记录为与 spec 不符 | P1 | OBS-ACC-003(b)、S-35；`projects.ts:156-229`、`storefront.ts`、`routes.tsx:104-107`；`layouts/Root.tsx:87-100` [P5] | — |
| RT-ACC-020 | 无 `cloud_gaming_access` | owner 去掉该权限 | 打开 `P/cloud-gaming` | `/forbidden` | P2 | OBS-ACC-003(b)；`projects.ts:186-189` | — |
| RT-ACC-021 | settings 子页权限 | ① 无 `get_merchant_users`；② 无 `merchant_get_access_logs` | ① 打开 `/{m}/settings/members`、`/settings/users`；② 打开 `/{m}/settings/user-activity` | 均 `/forbidden` | P1 | OBS-ACC-003(b)；`settings.ts:37-52` | — |
| RT-ACC-022 | 多个路由都通过 | owner | 打开 `/{m}/finance/payouts` | 父（registry）和子（get_transfers）都通过，渲染 Payouts | P2 | OBS-ACC-003 | `route-access.test.ts:183` |
| RT-ACC-023 | liveops 角色落地与拒绝 | jr-liveops（`ROLE_JUNIOR_DEVELOPER` + `liveops_only_role`，权限齐全） | 直接打开 `/{m}`、`/{m}/projects/{p}`、`/{m}/finance` | `/{m}` → `/{m}/projects`；`/{m}/projects/{p}` → `/{m}/projects/{p}/storefront/promotions`；`/{m}/finance` → `/forbidden`。`[分支差异]` V2 中 liveops/catalog 的 `allowedPaths=[]`（`useSectionBasedRouteGuard.ts:103`），所有项目页都会 `/forbidden` | P0 | AC-08、OBS-ACC-004；`route-access.ts:74-116` | `route-access.test.ts:256`、`RouteAccessGuard.test.tsx:459`；e2e fixme |
| RT-ACC-024 | liveops 的 section 边界 | jr-liveops | 打开 `P/storefront`、`P/storefront/promotions/123`、`P/storefront/promotions-archive`、`P/sdk`、`/{m}/get-started`、`/{m}/dashboard`、`/{m}/unknown` | 只有 `P/storefront/promotions/123` 可进；其余全部 `/forbidden`（包括 `/{m}/unknown`，不是 `/not-found`） | P1 | OBS-ACC-004；`sections.ts:89-111`、`route-access.ts:90-101` | `sections.test.ts:115` |
| RT-ACC-025 | catalog 角色 | jr-catalog（`items_catalog_only_role`） | 打开 `/{m}/projects/{p}`、`P/storefront/catalog-management/connectors`、`P/subscriptions`、`P/storefront/promotions` | 第 1 个 → `P/storefront`；第 2、3 个可进；第 4 个 `/forbidden`（最长前缀属于 liveops） | P1 | OBS-ACC-004；`sections.ts:40-58,104-111` | `sections.test.ts:145` |
| RT-ACC-026 | webdev 角色 | webdev（`ROLE_JUNIOR_DEVELOPER` + `external_webdev_role`） | 打开 `/{m}/projects/{p}`、`P/edit`、`P/edit/api_key`、`P/sdk`、`/{m}/dashboard`、`/{m}/finance`、`/{m}/saved-payout-methods`、`/{m}/marketplace`、`/{m}/ontology` | 第 1 个 → `P/site-builder`；`P/edit`、`P/edit/api_key`、`/dashboard` 可进；其余 `/forbidden` | P1 | OBS-ACC-004；`sections.ts:59-83` | `sections.test.ts:234` |
| RT-ACC-027 | webdev 可进公司设置与成员页（**预期失败项**） | webdev，持有 `get_merchant_users` | 打开 `/{m}/settings/company`、`/{m}/settings/users`、`/{m}/settings/members` | **期望（AC-12）**：三页都变为 `/forbidden`。**当前**：三页都能进（`BLOCKED_MERCHANT_PATHS` 写的是 `/company`、`/users`，按 segment 前缀匹配不到 `/settings/*`）。在 S-18 修复前，本用例按预期失败记录，不作为阻断 | P1 | S-18、AC-12、OBS-ACC-004（as-built 1）；`sections.ts:76-85,143-144`、`settings.ts:37-54` [P3] | `sections.test.ts:234-260`（只测 `/company`、`/users`）；AC-12 无自动化 |
| RT-ACC-028 | section 规则大小写绕过（**预期失败项**） | webdev；jr-liveops | webdev 打开 `/{m}/FINANCE`、`/{m}/Projects/{p}/storefront`；jr-liveops 打开 `/{m}/Projects/{p}/storefront/promotions` | **期望**：与小写 URL 判定一致，即 webdev 两页 `/forbidden`，jr-liveops 可进。**当前**：webdev 两页都能进（section 正则区分大小写，路由匹配不区分）；jr-liveops `/forbidden`（过严）。在 S-19 修复前，本用例按预期失败记录 | P2 | S-19、OBS-ACC-004（as-built 2）；`sections.ts:85`、`route-access.ts:86` [P3] | — |
| RT-ACC-029 | 多 section 叠加 | junior developer 同时开 `items_catalog_only_role` 与 `liveops_only_role` | 打开 `/{m}/projects/{p}`；再打开 `P/storefront/promotions` 和 `P/storefront` | 落地 `P/storefront`（按声明顺序取第一个）；两页都可进 | P2 | OBS-ACC-004；`sections.ts:134-138` | `sections.test.ts:209` |
| RT-ACC-030 | section flag 对非 PROJECT_ONLY 角色无效 | owner 开 `liveops_only_role` | 打开 `/{m}/finance`、`/{m}/projects/{p}` | 正常进入，不跳 landing | P2 | OBS-ACC-004；`useAllowedSections.ts:31-33` | `useAllowedSections.test.tsx` |
| RT-ACC-031 | features 未就绪时 section 规则放行 | jr-liveops；DevTools 对 features 请求（`/mapi/merchant/v2/merchants/{m}/features`）限速 | 直接打开 `/{m}/finance` | 当前：features 返回前 finance 页可能先挂载并发请求，返回后才跳 `/forbidden`。记录期间是否出现 401 → 登出（WASP-2003 风险） | P2 | OBS-ACC-004；`route-access.ts:80-82` | `route-access.test.ts:257` |
| RT-ACC-032 | developer partial 也受 section 限制 | `ROLE_DEVELOPER_PARTIAL` + `liveops_only_role`（待确认 stage 数据） | 打开 `/{m}/finance` | `/forbidden` | P2 | OBS-ACC-004；`roles.ts:67-70` | — |
| RT-ACC-033 | section 落地前先过路由规则 | jr-liveops 但无 `project_get`（待确认） | 打开 `/{m}/projects/{p}` | `/forbidden`（ProjectDetailPage 的 `project_get` 先拒），不会跳 landing | P2 | OBS-ACC-004、E8；`route-access.ts:144-148` | `route-access.test.ts:195` |
| RT-ACC-034 | D2 merchant 级 funding | owner；merchant 未启用 funding 模块 | 直接打开 `/{m}/funding` | **当前**：渲染 funding remote。**修复后**：按产品定义拒绝（`/forbidden` 或 `/not-found`，待确认） | P1 | D2、OBS-ACC-005；`createRoute.ts:39-50` | D2（`scenarios.ts:243-250`） |
| RT-ACC-035 | D2 项目级模块 | owner；项目未启用 cloud-gaming / launcher / payments 模块 | 打开 `P/cloud-gaming`、`P/new-launcher`、`P/payments`；观察 sidebar | **当前**：页面都能渲染，sidebar 也照常显示这些入口（visibility 在 sidebar 同样不生效，见 E1）。**修复后**：路由和菜单都按模块隐藏/拒绝 | P1 | D2、OBS-ACC-005、E1 | — |
| RT-ACC-036 | 顶层页无 host 守卫 | viewer | 直接打开 `/error`、`/account-restricted` | 直接渲染，不跳 `/forbidden` | P2 | OBS-ACC-006；`Root.tsx:279` | `routes.test.tsx:224` |
| RT-ACC-037 | Administration 页 | ① admin；② owner（非 admin）；③ viewer | 打开 `/{m}/settings/administration` | ① 渲染；② → `/{m}/settings/company`；③ → `/settings/company` → `/forbidden`。非 admin 不发 internal info 请求 | P1 | U-07、OBS-SET-001；platform-pages 3.25.2 `index.mjs:2706-2708,2822-2823` | — |
| RT-ACC-038 | Ontology 页 | merchant 未启用 ontology | 打开 `/{m}/ontology` | 跳 `/{m}` 后继续 DynamicHome 分流 | P2 | U-07；`layouts/ontology/index.tsx:24-37` | — |
| RT-ACC-039 | Dashboard 页面内拒绝 | ① owner 有项目但无 `get_graphics_gross_revenue`；② 无项目且无 `project_create`；③ junior developer | 直接打开 `/{m}/dashboard` | 都 `/forbidden`；项目请求失败时只按角色判断 | P1 | §5、AC-07；`pages/Dashboard.tsx:130-143` | `Dashboard.test.tsx` |
| RT-ACC-040 | 服务端授权（客户端 guard 之外） | viewer 已登录；DevTools Console | 用当前会话直接请求一个被路由拦住的 API（例如 viewer 调用公司设置的写接口，或无 `get_merchant_boxnet_url` 的账号调用 documents URL 接口） | 预期 403；若返回 200，说明客户端 guard 是唯一边界，提交 backend | P1 | U-04、OBS-ACC-003 | — |
| RT-ACC-041 | 拒绝使用 replace | owner 去掉 registry | 从 `/{m}/dashboard` 点 Billing center（若可见）或手动 push 到 `/{m}/finance`，然后按 Back | 先到 `/forbidden`；Back 回到 `/{m}/dashboard` | P2 | OBS-ACC-003；`RouteAccessGuard.tsx:73-77` | `RouteAccessGuard.test.tsx:366` |
| RT-ACC-042 | integration type 未加载时放行 | gnation 非 admin owner；DevTools Local overrides 把 merchant 接口响应中的 `integration_type` 改为 `null`（接口路径待确认） | 直接打开 `/{m}/projects/{p}/edit`、`/{m}/projects/create` | 两页都渲染，不跳 `/forbidden`（type 为 null 时 integration type 规则放行）；取消 override 后刷新，两页都 `/forbidden` | P2 | OBS-ACC-003(a)（0.3.0：未加载的 type 放行）；`checks.test.ts:58-66`、platform-apis `index.mjs:2890` | `checks.test.ts:58` |

### 4.3 PROJ

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-PROJ-001 | 项目页正常进入 | owner，项目 [45, 46] | 直接打开 `/{m}/projects/45` | 先显示 loader，项目列表就绪后渲染 ProjectDetailPage；Tools 菜单链接都指向 45 | P0 | OBS-PROJ-001；`ProjectRequiredRoute.tsx:145-165` | `ProjectRequiredRoute.test.tsx:411` |
| RT-PROJ-002 | 未知项目 id 改写 | owner，项目 [45, 46]，当前项目 46 | 直接打开 `/{m}/projects/999/storefront/promotions?tab=a#x` | URL 被 replace 为 `/{m}/projects/46/storefront/promotions?tab=a#x`（当前项目优先，否则第一个）；子路径、query、hash 都保留。BFF 只解析 `0`，不处理 999<br>两条到达路径（OBS-PROJ-001 条件 5）：项目列表完整时直接改写；列表不完整时先请求 999 的项目详情，返回 403 或 404 后 999 被标为不可访问，再改写。stage 实测（687 个项目，列表未加载完）走第二条：详情 404 后改写为当前项目，通过 | P0 | OBS-PROJ-001、§10.3；SDK `getProjectRouteRedirectId`（components 4.20.3 `index.mjs:1260-1290`）；`ProjectRequiredRoute.tsx:98-114`；platform-store `slices/projects.ts:553-566,1168-1171` [P5] | I10；`ProjectRequiredRoute.test.tsx:436` |
| RT-PROJ-003 | 无项目，可创建 | owner，项目列表为空 | 1. 直接打开 `/{m}/projects/45`<br>2. 然后整页刷新 | 1. URL 先变 `/{m}/projects/0`，再显示 NoProjectPage（`data-id="no-project-page"`）。这次改写是 SPA 内 `history.replace`，不经过 BFF（条件 4）。AC-05 只适用于这种客户端改写<br>2. 刷新 `/{m}/projects/0` 时由 BFF 哨兵处理：merchant 没有项目，302 到 `{B}/{m}/`，路径丢弃，然后按 DynamicHome 分流，不再显示 NoProjectPage | P0 | AC-05、OBS-PROJ-001（条件 4）、OBS-AUTH-009、§2.3；platform-bff `bff-routes.ts:156-167`、`merchant-sentinel.ts:164-247` [P5] | I8（只覆盖第 1 步） |
| RT-PROJ-004 | 无项目，不可创建 | viewer，项目列表为空 | 直接打开 `/{m}/projects/45` | `/forbidden` | P1 | OBS-PROJ-001 | I9 |
| RT-PROJ-005 | 空状态创建项目 | 同 RT-PROJ-003 | 点 Create project，填表提交 | 列表强制刷新，新项目成为当前项目，URL replace 为 `/{m}` 并继续 DynamicHome 分流；刷新失败也回到 `/{m}` | P1 | OBS-PROJ-002；`ProjectRequiredRoute.tsx:128-143` | `ProjectRequiredRoute.test.tsx:614-640`、`NoProjectPage.test.tsx` |
| RT-PROJ-006 | 项目列表加载失败 | owner；DevTools 拦截 lite 项目列表请求（`fetchLiteProjectsToState`，platform-store） | 直接打开 `/{m}/projects/45`；取消拦截后点 Retry | 显示 `data-id="project-required-error"` 和 Retry，不自动重试；Retry 后渲染页面 | P1 | OBS-PROJ-001；`ProjectRequiredRoute.tsx:40-49,122-126,149-151` | `ProjectRequiredRoute.test.tsx:345-386` |
| RT-PROJ-007 | 项目多于一页 | owner，项目数 > 100（`LITE_PAGE_LIMIT`，platform-store `index.mjs:818`），目标项目不在第一页（待确认 stage 数据） | 直接打开该项目的 `/{m}/projects/{p}` | 不改写 URL；发出项目详情请求；页面正常渲染 | P2 | OBS-PROJ-001；`ProjectRequiredRoute.tsx:98-114` | `ProjectRequiredRoute.test.tsx:486` |
| RT-PROJ-008 | 他人项目 id（列表不完整） | 同上；再用另一 merchant 的项目 id | 1. 打开 `/{m}/projects/{他人项目}`<br>2. 变体：用改写工具把该项目详情请求改为 500，再打开 | 1. 详情返回 403 或 404，SDK 把该 id 标为不可访问，条件 1、3 不再阻止改写，URL 改写为当前或第一个项目<br>2. **按代码推断 [I]**：只有 403 和 404 会标为不可访问。500 时不标记，列表又不完整，条件 3 成立，不改写，页面按该 id 渲染。记录实际结果 | P2 | OBS-PROJ-001（条件 3、5）；`ProjectRequiredRoute.tsx:98-114`；platform-store `slices/projects.ts:553-566,1168-1171` [P5] | `ProjectRequiredRoute.test.tsx:532` |
| RT-PROJ-009 | `/projects/0` 而 merchant 有项目：整页加载与客户端导航 | a) owner，项目 [45]；b) 项目数 > 100、列表不完整的账号（stage admin 账号有 687 个项目，可用） | 1. 整页打开 `/{m}/projects/0/sdk`<br>2. 在 `/{m}/dashboard` 加载完成后，在 Console 执行 `history.pushState({}, '', '{B}/{m}/projects/0/sdk'); dispatchEvent(new PopStateEvent('popstate'))`。a、b 各执行一次，并在 Network 记录项目 `0` 的详情请求和状态码 | 1. BFF 哨兵在服务端 302 到 `{B}/{m}/projects/{BFF 取到的第一个项目}/sdk`，路径保留，SPA 看不到 `0`（OBS-AUTH-009）。BFF 的 `get_init_info` 失败或超时时返回 shell，然后按第 2 步的规则处理<br>2a. 列表完整，`0` 不在列表中：改写为 `/{m}/projects/45/sdk`（条件 5）<br>2b. 列表不完整，`0` 没有被标为不可访问：不改写，按项目 0 渲染（条件 3）。stage 实测（`c1b5e37`，客户端导航）与此一致。只有 `0` 的详情返回 403 或 404 时，才改写为当前或第一个项目<br>说明：2b 是 spec 0.3.2 记录的 as-built 行为（§10.3），没有对应的 S 项。stage 记录中的 FAIL 是按旧预期判定的 | P1 | OBS-PROJ-001（条件 3、5）、OBS-AUTH-009、§2.3、§10.3；`ProjectRequiredRoute.tsx:81-114`；platform-bff `bff-routes.ts:156-167`、`merchant-sentinel.ts:164-247` [P5] | — |
| RT-PROJ-010 | 前导零 id | owner，项目 [45] | 打开 `/{m}/projects/045` | 按数字比较视为 45，不改写 URL；页面内容是否正常：待确认 | P2 | OBS-PROJ-001；`ProjectRequiredRoute.tsx:103` | `ProjectRequiredRoute.test.tsx:425` |
| RT-PROJ-011 | 项目页切换项目 | owner，项目 [45, 46] | 在 `/{m}/projects/45/storefront/promotions?x=1` 用 topbar 切到 46 | URL push 为 `/{m}/projects/46/storefront/promotions?x=1`；Tools 和 bottom Settings 指向 46 | P0 | OBS-PROJ-001；components 4.20.3 `index.mjs:1440-1475` | — |
| RT-PROJ-012 | 非项目页切换项目 | 同上 | 在 `/{m}/get-started` 切到 46 | URL 不变；Tools 菜单与 bottom Settings 链接改指 46 | P1 | components 4.20.3 `buildProjectSwitchPath`（`:1276-1286`） | — |
| RT-PROJ-013 | 项目切换器显隐 | owner；accounting 角色 | owner 依次打开 `/get-started`、`P/sdk`、`/analytics/payments`、`/dashboard`；accounting 打开任意页 | owner：前两个显示，后两个隐藏；accounting：始终不显示 | P1 | platform-apis `DEFAULT_PROJECT_SWITCHER_RULES`（`index.mjs:3576-3588`）；`Navigation/index.tsx:47-53` | `Navigation/index.test.tsx` |
| RT-PROJ-014 | 公司切换；客户端导航到外部 merchant | 用户属于 merchant A、B；A 下在 `/{A}/projects/45/storefront` | 1. 用 topbar 公司切换选 B<br>2. 回到 `/{A}/projects/45/storefront` 并等页面加载完成，然后在 Console 执行 `history.pushState({}, '', '{B}/{999}/projects/45/storefront'); dispatchEvent(new PopStateEvent('popstate'))`（`{999}` 为不属于自己的 merchant），不重新加载页面 | 1. 整页加载 `{B}/{B}`，子路径丢弃，DynamicHome 分流，项目上下文为 B<br>2. 回到 `/{orgs[0]}`（非 admin），不是 `/forbidden`。在地址栏修改 URL 属于整页加载，见 RT-PROJ-019。`[分支差异]` V2 对外部 merchant 跳 `/forbidden` | P1 | AC-01（只覆盖客户端导航）、OBS-MAG-002；components 4.20.3 `index.mjs:2265-2268` [P4] | I4（store 注入，只覆盖客户端分支） |
| RT-PROJ-015 | 路由规则先于项目改写 | viewer（无 `ps`），项目 [45] | 直接打开 `/{m}/projects/999/payments` | `/forbidden`（RouteAccessGuard 在 ProjectRequiredRoute 之前） | P2 | OBS-ACC-003、OBS-PROJ-001；`Root.tsx:279-281` | — |
| RT-PROJ-016 | 刷新后快速点 Tools | owner，项目 [45, 46] | 在 `/{m}/projects/46/sdk` 刷新，loader 消失前后立刻点 Cloud gaming | 跳到 `/{m}/projects/46/cloud-gaming`（取 URL 中的 id），不出现 `/projects/undefined` 或 `/not-found` | P1 | OBS-NAV-002；`project-sidebar-v2/index.tsx:91-97` | `project-sidebar-v2/index.test.tsx:257` |
| RT-PROJ-017 | 项目设置子页 | owner | 打开 `P/edit`、`P/edit/advanced`、`P/edit/webhooks`、`P/edit/event-api` | 都在 SDK 设置壳内渲染对应 tab（`/edit` 为 non-exact，不走 not-found） | P1 | §5；`projects.ts:162-170` | — |
| RT-PROJ-018 | 无项目且 URL 已是 `/projects/0`：客户端导航与整页加载 | owner，项目列表为空 | 1. 在 `/{m}/get-started` 加载完成后，在 Console 执行 `history.pushState({}, '', '{B}/{m}/projects/0'); dispatchEvent(new PopStateEvent('popstate'))`<br>2. 整页打开 `/{m}/projects/0` | 1. 客户端导航：URL 不变（条件 4：已是 `0` 时不改写），显示 NoProjectPage；没有循环 replace<br>2. 整页加载：BFF 哨兵发现 merchant 没有项目，302 到 `{B}/{m}/`，路径丢弃，然后按 DynamicHome 分流，不显示 NoProjectPage（AC-05 只适用于客户端导航）。BFF 的 `get_init_info` 失败或超时时返回 shell，结果同第 1 步 | P2 | OBS-PROJ-001（条件 4）、AC-05、OBS-AUTH-009、§2.3；components 4.20.3 `index.mjs:1260-1290`；platform-bff `bff-routes.ts:156-167`、`merchant-sentinel.ts:164-247` [P5] | — |
| RT-PROJ-019 | **S-34**：在地址栏改成外部 merchant（整页加载） | 同 RT-PROJ-014，非 admin | 在 `/{A}/projects/45/storefront` 的地址栏把 `{A}` 改成不属于自己的 `{999}` 后回车；再刷新一次 | **期望（AC-01b）**：回到 `/{orgs[0]}`，子路径丢弃，不是 `/forbidden`<br>**当前（源码推断，预期失败项）**：URL 不变，显示 500 HydrationError。SDK `fetchUserData` 的回退调用又从 URL 解析出 `{999}`，重试再次失败，host 守卫放行，`withMerchantRequired` 显示错误页。详细判定见 T1 RT-MAG-015 | P1 | AC-01b、S-34、OBS-MAG-002；platform-store 1.15.6 `slices/user.ts:120-137`；platform-apis 2.29.2 `apis/merchant.ts:106-107`；`useMerchantAccessGuard.ts:112-119` [P4] | 无（I4 覆盖不到） |

### 4.4 NAV

每条 "不一致" 用例都执行两种入口：A = 点击菜单，B = 直接 URL。

| ID | 场景 | 前置条件（账号/角色/数据） | 步骤 | 预期结果 | 优先级 | 追溯 | 自动化 |
|---|---|---|---|---|---|---|---|
| RT-NAV-001 | owner 完整菜单 | owner，项目 [45]，`subs_support` 开启 | 打开 `P/sdk`，展开所有组 | Merchant 组：Get started、Dashboard、Projects、Player support（3 子项）、Analytics（7 子项）。Tools 组：Distribution、Payments、Players、Items catalog、LiveOps、User acquisition、Storefronts、Other tools。Bottom：Billing center、Document center、Settings | P0 | OBS-NAV-001/002；三个 nav-items-config | nav-items-config 单测 |
| RT-NAV-002 | 内部链接前缀 | owner | 鼠标悬停任一内部菜单项看 href | href 为 `{B}/{m}/...`（UIMLink 自动加 merchant id） | P1 | OBS-NAV-003；`uim-link/index.tsx:72-90` | `uim-link/index.test.tsx` |
| RT-NAV-003 | 外链安全（展开态） | owner | 展开态点 Receipt customizer、Email customizer；查看两个链接的 `href` | 新标签打开；新标签中 `window.opener === null`；元素为 `<a target="_blank" rel="noopener noreferrer">`（stage 实测通过）。附带检查：Email customizer 的 `href` 当前写死为生产域名 `https://sitebuilder.xsolla.com/...`（S-37，stage 实测），判定见 RT-NAV-031；Receipt customizer 取 `appConfig.customizatorAppUrl`，随环境变化 | P1 | OBS-NAV-003（0.3.0）、S-37、§10.3；`uim-link/index.tsx:143-161`；`project-sidebar-v2/nav-items-config.tsx:199`、`:413` [P3] [P5] | — |
| RT-NAV-004 | 外链与内链（折叠态） | owner | 折叠 sidebar；用 DevTools Elements 查看 Email customizer 图标的 DOM；点 Email customizer 图标；再点 SDK 图标 | 折叠叶子是 `div[data-id]`，不是 `button`；外链与展开态相同，经 `UIMLink` 渲染为 `<a target="_blank" rel="noopener noreferrer">`，新标签中 `window.opener === null`；内链 href 带 `/{m}` 前缀，SPA 内到 `/{m}/projects/{p}/sdk`。`sidebar/index.tsx` 的 `window.open` / `history.push` 分支不触发 | P1 | OBS-NAV-003（0.3.0）、T2-E3 修正；`uim-link/index.tsx:143-161`、`sidebar/index.tsx:60-89`（不可达，spec §11.3） [P3] | —（`sidebar/index.test.tsx` 的 mock 把折叠叶子当成 `button`，前提错误，不计为自动化） |
| RT-NAV-005 | 折叠状态不持久 | owner | 折叠 sidebar → SPA 内跳几页 → 刷新 → 再折叠后切换公司 | SPA 内保持折叠；刷新和切换公司后恢复展开 | P2 | U-08；platform-store 1.15.6 `index.mjs:2763-2786` | — |
| RT-NAV-006 | Payments 菜单 vs 路由 | 无 `ps` 的账号（例如 viewer persona） | A：点 Payments → Payment methods；B：打开 `P/payments/methods` | A、B 都到 `/forbidden`（菜单仍显示）。修复建议：菜单补 `ps` | P1 | OBS-NAV-001；project nav `:172-209`、`projects.ts:196-199` | — |
| RT-NAV-007 | Subscriptions 菜单 vs 路由 | ① gnation 非 admin；② 无 `ps` | A：点 Items catalog → Subscriptions；B：打开 `P/subscriptions/plans` | 都 `/forbidden` | P1 | OBS-NAV-001；`:244-250`、`subscriptions.ts` | — |
| RT-NAV-008 | Funding / Discord bot | 无 `ps` | A：点 Other tools → Funding、Storefronts → Discord bot；B：打开 `P/funding`、`P/discord-bot` | 都 `/forbidden` | P2 | OBS-NAV-001 | — |
| RT-NAV-009 | Cloud gaming | 无 `cloud_gaming_access` | A：点 Cloud gaming；B：打开 `P/cloud-gaming` | 都 `/forbidden` | P2 | OBS-NAV-001 | — |
| RT-NAV-010 | Storefront 系列 | 缺任一 store 权限（例如无 `game_delivery_get_games`） | A：点 All items、Promotions；B：打开 `P/storefront` | 都 `/forbidden` | P1 | OBS-NAV-001；`storefront.ts` | — |
| RT-NAV-011 | viewer 判定不一致 | ① ROLE_VIEWER + `role_viewer`；② ROLE_VIEWER 无 `role_viewer` | A：看 Players → Login、User acquisition → Creator marketing 是否显示并点击；B：打开 `P/login`、`P/network` | ①：菜单隐藏，B 为 `/forbidden`。②：菜单显示，A、B 都 `/forbidden` | P1 | OBS-NAV-001；platform-store `selectHasViewerRole`（`index.mjs:300`） | — |
| RT-NAV-012 | Subscribers tab | `subs_support` 开启但无 `recurrent_subscription_get_all` | A：点 Player support → Subscribers；B：打开 `/{m}/support/subscriptions` | 都 `/forbidden`。`[分支差异]` V2 菜单同时要求该权限 | P1 | OBS-NAV-001；merchant nav `:90-95` | — |
| RT-NAV-013 | Tax interview | no-finance（OWNER，无 registry，有 tax link 权限） | A：点 Document center → Tax interview；B：打开 `/{m}/tax-interview` | 都 `/forbidden` | P1 | OBS-NAV-001；bottom nav `:144-150`、`routes.tsx:121-125` | — |
| RT-NAV-014 | gnation 的项目设置 | gnation 非 admin，有 `ps`、`api_key_list` | A：点 Settings → Project settings、API keys、Webhooks；B：打开 `P/edit`、`P/edit/api_key` | 都 `/forbidden`；admin 打开同一 merchant 时都正常 | P1 | OBS-NAV-001；bottom nav `:186-222` | — |
| RT-NAV-015 | Settings layout 对 viewer | viewer（有 `merchant_get_api_key`） | 进入 SettingsLayout（从 Profile 菜单或直接打开 `/{m}/settings/administration`，非 admin 会被带到 company），A：点 Company settings、API keys；B：打开两条 URL | 两个入口都显示，点击都 `/forbidden` | P2 | OBS-SET-001；`SettingsSidebar.tsx:36-40` | — |
| RT-NAV-016 | Projects 菜单与 junior developer | `ROLE_JUNIOR_DEVELOPER` 且无 `client_show_project_list`（待确认） | A：点 Projects；B：打开 `/{m}/projects` | 菜单显示（customRole），A、B 都 `/forbidden`；同时 DynamicHome 会把该角色送到 `/projects` → `/forbidden`（P0 风险，需 stage 确认该组合是否存在） | P1 | OBS-NAV-001；merchant nav `:157-168` | — |
| RT-NAV-017 | Get started 与 section 角色 | jr-liveops；jr-catalog；对照：webdev | A：点 Merchant 组 Get started；B：打开 `/{m}/get-started` | 三种角色菜单都显示（section 规则只过滤 Tools 组）。jr-liveops、jr-catalog：A、B 都 `/forbidden`。webdev：A、B 都正常进入（`/get-started` 不在 `BLOCKED_MERCHANT_PATHS`） | P1 | OBS-NAV-002（0.3.0）、OBS-ACC-004；`merchant-sidebar-v2/nav-items-config.tsx:135-142`、`route-access.ts:90-101` [P3] | — |
| RT-NAV-018 | section 角色的 Tools 菜单 | jr-liveops；jr-catalog；webdev | 打开 `/{m}/projects/{p}` 后看 Tools 组与 bottom Settings | liveops：只剩 LiveOps 组；catalog：只剩 Items catalog（All items、Subscriptions、Imports）；webdev：只剩 Storefronts → Websites。Marketplace/Ontology 不显示。bottom Settings 中的 `/edit` 系列仍按权限显示（liveops/catalog 点击会 `/forbidden`） | P1 | OBS-NAV-002；project nav `:68-84,444-451` | project nav-items-config 单测 |
| RT-NAV-019 | 菜单隐藏但 URL 可达 | ① 无 `analytics_view`/`disputes_access` 的非 admin；② 只有 `transaction_search_section`；③ viewer/developer；④ gnation；⑤ `ROLE_ACCOUNTING_PARTIAL`；⑥ 只有 registry | B：① `/{m}/analytics/payments`；② `/{m}/support/transactions`；③ `/{m}/agreement`；④ `P/site-builder`；⑤ `/{m}/support/tickets`；⑥ `/{m}/finance` | 菜单都不显示，URL 都能渲染（当前行为）。`[分支差异]` V2 对 analytics、agreement、site-builder 加了路由 gate。需产品确认是否为预期 | P1 | OBS-NAV-001、OBS-ACC-003 | — |
| RT-NAV-020 | 组的退化与消失 | ① 有 search+registry+details 但无 `get_transfers`；② Document center 四个子项都无权限 | 看 bottom sidebar | ① Billing center 显示为单项，点击到 `/{m}/finance`；② Document center 整组不显示 | P2 | OBS-NAV-001；`filter-accessible-nav-items.ts:49-51`、bottom `index.tsx:22-56` | `filter-accessible-nav-items.test.ts` |
| RT-NAV-021 | accounting / support 角色 | `ROLE_ACCOUTING`；`ROLE_SUPPORT` | 打开 `/{m}/dashboard` 并看 sidebar 与 topbar | 无 Tools 组、无 Projects 菜单、无项目切换器、无 Marketplace | P1 | OBS-NAV-002；project nav `:478-480`、`project-sidebar-v2/index.tsx:104-107` | project sidebar 单测 |
| RT-NAV-022 | 无项目 merchant 的 sidebar | owner，项目列表为空 | 展开态看 Tools 组；再折叠看图标条；看 bottom Settings | 展开态：Tools 组整组不显示（含 Marketplace/Ontology，见 E14）；折叠态：仍有 Marketplace 图标；bottom Settings 只剩 Members | P1 | OBS-NAV-002、E14；`project-sidebar-v2/index.tsx:145-147`、nav config `:486-506` | — |
| RT-NAV-023 | legacy API 项目与 store features | ① legacy Store API 项目；② CAPI 项目，`daily_rewards`/`offer_chains` 关闭 | 看 LiveOps 组 | ① 整组隐藏；② Daily rewards、Offer chains 隐藏，其余显示 | P2 | OBS-NAV-002；project nav `:261-300` | project nav-items-config 单测 |
| RT-NAV-024 | 存储设置预检，防 401 登出 | feature `webhookless_integration` 开启；① 有 `ps` 无 `project_webhook_storage_integration_get`；② 两者都有 | 打开任意页，看 Network 与 Settings 组 | ① 不请求 `/mapi/merchant/current/projects/{p}/webhook_storage_integration`；Webhooks/API calls 项隐藏；用户不被登出。② 请求一次；按 `isWebhookStorageEnabled` 显示 API calls 或 Webhooks；切换项目后先隐藏再按新项目显示 | P1 | OBS-NAV-004、E4；bottom nav `:259-312` | bottom nav-items-config 单测 |
| RT-NAV-025 | Integration settings 显示条件 | ① 有 `internal_merchant_settings_get`；② 无该权限、当前项目 universal；③ 两者都无 | 看 Settings 组 | ①② 显示；③ 隐藏 | P2 | OBS-NAV-001；bottom nav `:277-286` | — |
| RT-NAV-026 | Tickets 对受限 merchant 隐藏 | merchant 386410 或 276256 的 owner（stage 是否存在：待确认） | 看 Player support 组；直接打开 `/{m}/support/tickets` | 菜单无 Tickets；URL 可达 | P2 | OBS-NAV-001；merchant nav `:59,88` | — |
| RT-NAV-027 | 高亮规则 | owner | 依次打开 chargeback registry 路径、`/{m}/saved-payout-methods`、`P/storefront/virtual-items/x`、`P/edit` | 分别高亮 Anti-fraud、Billing center、All items、Settings 组 | P2 | OBS-NAV-002；merchant nav `:207-208`、bottom `:112-116,181`、project `:86-103` | — |
| RT-NAV-028 | Settings layout 返回 | owner；admin | 进入 `/{m}/settings/company`，点 "Back to account" | 回到 `/{m}`；Administration 入口只对 admin 显示 | P2 | OBS-SET-001；`layouts/settings/index.tsx:34-37` | `layouts/settings/*.test.tsx` |
| RT-NAV-029 | 聊天按钮 | owner | 点 topbar 聊天按钮 | push 到 `/{m}/communication-hub`（不经 support-hub），sidebar 隐藏 | P1 | OBS-ROUTE-005、E6；components 4.20.3 `index.mjs:2273-2280` | — |
| RT-NAV-030 | 错误页的导航 | owner 已登录 | 依次打开 `/forbidden`、`/not-found`、`/error`，看 header；在 `/forbidden` 点 "To homepage" | 当前：三页 header 都是 NavigationLite，不是完整 Navigation（`authorized` 读 `state.user.id`，该字段不存在，恒为 false，S-21）；按钮到 `/{m}`（当前 merchant）。S-21 修复后应显示完整 Navigation | P2 | OBS-ERR-004、S-21；`layouts/error/{index,forbidden/index,not-found/index}.tsx:17-19`、`ErrorComponent.tsx:49,76` [P3] | — |
| RT-NAV-031 | S-37 定向：Email customizer 外链写死生产域名（**预期失败项**） | owner，项目 `{p}`；stage（prod 只读对照可选） | 在 stage 展开态 sidebar 的 Tools 组中，用 Elements 查看 Email customizer 的 `href`；对照查看 Receipt customizer 的 `href` | **期望**：stage 上指向 stage 对应的 site builder 地址，与 Receipt customizer 一样随环境配置<br>**当前（stage 实测，预期失败项）**：stage 上指向生产域名 `https://sitebuilder.xsolla.com/next-emails/merchant/{m}/project/{p}`，点击后在生产环境打开。Receipt customizer 取 `appConfig.customizatorAppUrl`，随环境变化<br>**修复后**：Email customizer 的地址从环境配置读取；prod 上的地址不变 | P2 | S-37、OBS-NAV-003、§10.3；`layouts/sidebar/project-sidebar-v2/nav-items-config.tsx:413`（对照 `:199`） [P5] | — |

---

## 5. stage 执行所需账号与数据

| 账号 / 数据 | 用途（用例） | 对应 persona | 状态 |
|---|---|---|---|
| owner：全部权限，项目 [45, 46]，有 setup selection | 大部分 ROUTE/PROJ/NAV | `owner` | 待 QA 提供（U-09） |
| owner：项目列表为空，有 `project_create` | RT-PROJ-003/005/018、RT-NAV-022 | `owner` + 空项目 | 待提供 |
| viewer：`ROLE_VIEWER` + `role_viewer`，无 `project_create`/`ps`/`get_merchant_boxnet_url`；另需一份有 `merchant_get_api_key` 的 | RT-ACC-004~007/019、RT-NAV-011/015 | `viewer` | 待提供 |
| viewer：`ROLE_VIEWER` 无 `role_viewer` feature | RT-NAV-011 ② | — | 待提供 |
| viewer：项目列表为空 | RT-PROJ-004 | `viewer` + 空项目 | 待提供 |
| gnation owner；admin 可进入该 merchant | RT-ACC-009/010/042、RT-NAV-007/014/019 | `gnation`、`admin` | 待提供（需提权） |
| jr-catalog / jr-liveops / webdev（`ROLE_JUNIOR_DEVELOPER` + 对应 feature；webdev 另需 `get_merchant_users`） | RT-ACC-023~033、RT-NAV-017/018 | 同名 persona | 待提供 |
| no-finance：OWNER 去掉 `transactions_registry` | RT-ACC-013、RT-NAV-013 | `no-finance` | 待提供 |
| 单项缺权限账号：无 `get_transfers` / `get_reports` / `cloud_gaming_access` / `get_merchant_users` / `merchant_get_access_logs` / `project_get` / `client_show_project_list`；某个 store 权限 | RT-ACC-014~021、RT-NAV-006~010/016 | 无现成 persona | 待提供（可用自定义角色） |
| accounting（`ROLE_ACCOUTING`）、support（`ROLE_SUPPORT`）、`ROLE_ACCOUNTING_PARTIAL` | RT-PROJ-013、RT-NAV-019/021 | — | 待提供 |
| 用户同时属于 merchant A、B | RT-PROJ-014、RT-PROJ-019 | `foreign-merchant` 类 | 待提供 |
| merchant 项目数 > 100 | RT-PROJ-007/008、RT-PROJ-009 b) | — | stage admin 账号（687 个项目）可用于 RT-PROJ-009 b) `[P5]`；其余待确认 |
| legacy Store API 项目；universal item 项目 | RT-NAV-023/025 | — | 待确认 |
| merchant feature：`subs_support`、`webhookless_integration`；ontology 模块启用/未启用；funding 等模块未启用 | RT-NAV-012/024、RT-ACC-034/035/038 | — | 待确认 |
| merchant 386410 / 276256 | RT-NAV-026 | — | 待确认 |
| 工具：Chrome DevTools（Network 限速、Request blocking、Local overrides、Elements、Console） | RT-ACC-002/003/031/040/042、RT-PROJ-006、RT-NAV-004 | — | — |

---

## 6. U 项处理结果

| U 项 | 结论 | 证据 / 后续 |
|---|---|---|
| U-04 backend 是否校验 privilege/role/成员关系 | 未关闭（答案在 backend）→ 转为 stage 用例 RT-ACC-040 | — |
| U-07 `/settings/administration` 与 `/ontology` 的拒绝逻辑 | **部分关闭**。Administration：SDK 页对非 admin `Redirect` 到 `/{m}/settings/company`，并且不加载数据（platform-pages 3.25.2 `dist/index.mjs:2706-2708,2822-2823`）。Ontology：host 页面在未启用时回 `/{m}`（`layouts/ontology/index.tsx:24-37`）。是否需要 route 级 gate 仍待产品决定 | 用例 RT-ACC-037/038 |
| U-08 sidebar 折叠状态是否持久化 | **关闭**：不持久化。`globalSettings.sidebarCollapsed` 初始 `false`，`toggleSidebarCollapsed` 只翻转 state，无 storage（platform-store 1.15.6 `dist/index.mjs:2763-2786,2799`） | 用例 RT-NAV-005 |
| U-09 e2e persona 账号 | 未关闭（QA）。§5 列出了本 track 需要的账号；e2e `smoke-areas.ts` 全部为 `test.fixme` | — |
| U-03（部分，NAV 相关） | 公司切换 = `window.location.href = {B}/{id}` 整页加载；项目切换 = `history.push` 替换路径中的项目 id（platform-components 4.20.3 `index.mjs:1440-1475,2265-2268`）。HTTP 清单部分仍归 T1/T4 | 用例 RT-PROJ-011/012/014 |
| U-14 根级 ErrorBoundary 不随路由重置（P5） | spec 0.3.2 未关闭。T1 源码复核：platform-components 4.20.3 `ErrorBoundary` 没有重置逻辑 | 用例在 T1 RT-ERR-008；本文件 RT-ACC-001、RT-ROUTE-028/036 要求崩溃后先整页刷新 |

SDK 版本核对：本地安装位于 `node_modules/.pnpm/@accounts-sdk+*`（`node_modules/@accounts-sdk/` 下只有 platform-bff 的链接），版本与 spec 一致。

---

## 7. spec 勘误

| # | 位置 | 问题 | 代码证据 |
|---|---|---|---|
| E1 | OBS-ACC-005、OBS-NAV-002 | spec 说 "Module visibility gates only the sidebar" / "Module `visibility` ... filter the project items"。实际 v1 的 sidebar 也不读取 `visibility`：nav 配置只把它当数据，`filterAccessibleNavItems` 不看它，src 中没有调用 `filterSidebarItemsByVisibility`，platform-ui 0.10.0 的 Sidebar 也不处理 visibility。只有 ontology 通过 `selectVisibilityModules` 判断模块 | `filter-accessible-nav-items.ts:30-51`；`core/hooks/useOntologyAccess.ts:41,77`；`core/access/setup-guide-access.ts:25-29` 注释 |
| E2 | OBS-NAV-002 | section 规则只过滤 project Tools 组；merchant 组的 Get started 对 section 角色仍显示，点击 `/forbidden` | `merchant-sidebar-v2/nav-items-config.tsx:135-142`；`route-access.ts:90-101` |
| E3 | OBS-NAV-003 | ~~`window.open(..., 'noopener,noreferrer')` 只在折叠态；展开态用 `<a target rel="noopener noreferrer">`~~ **[P3 修正，spec 作者核实]**：xui-b2b-sidebar 0.206.1 把折叠叶子渲染成 `div[data-id]`，`window.open` 分支不可达，两种状态都走 `UIMLink` 的 `<a>`；`sidebar/index.test.tsx` 的 mock 前提错误 | `sidebar/index.tsx:60-89`；`uim-link/index.tsx:143-161` |
| E4 | OBS-NAV-004 | 遗漏条件：还要求 feature `webhookless_integration` 开启、privileges 不在加载中、项目 id 已就绪；请求为 `/mapi/merchant/current/projects/{p}/webhook_storage_integration` | bottom nav `:262-312`；platform-apis `index.mjs:1945` |
| E5 | OBS-ROUTE-003 | 遗漏：重定向丢弃 search 和 hash，且只看 pathname | `RouteWrap.tsx:13-16`；`RouteWrap.test.tsx:66-74` |
| E6 | OBS-ROUTE-005 | `routes.tsx:59-63` 注释说 Navigation 的聊天按钮 push `/support-hub`；platform-components 4.20.3 实际直接 push `/communication-hub`，别名只服务旧链接。另：别名 non-exact，子路径和 query 被丢弃 | components 4.20.3 `index.mjs:2273-2280`；`routes.tsx:64-66` |
| E7 | OBS-ROUTE-006 | 遗漏：`login` → `engagement`；hash 也保留；未映射的产品落到 `/analytics/payments` 且丢 query | `layouts/advanced-analytics/index.tsx:89-123` |
| E8 | OBS-ACC-004 | 遗漏 4 点：① `BLOCKED_MERCHANT_PATHS` 的 `/users`、`/company` 不匹配本 host 的 `/settings/users|members|company`，webdev 能进这些页；② section 正则区分大小写，而路由匹配不区分，大写 URL 可绕过（webdev）或误拒（liveops）；③ features 未就绪时一律放行；④ 路由规则先判，缺 `project_get` 时不会跳 landing | `sections.ts:76-85,143-144`；`route-access.ts:80-86,144-148` |
| E9 | OBS-ACC-003(a) | 精确化：integration type 未加载（null）时放行；state 值先转小写 | platform-apis `index.mjs:2890` |
| E10 | §5 | ① `M/'link'` 没有 privilege（只有 `'gold'` 要 `ps`）；② `/settings` 裸路径落 not-found；③ `P/edit` 为 non-exact，含 SDK 子路由 advanced/webhooks/event-api；④ `P/storefront` 是 3 个 store 权限 + `ps`；⑤ `/projects/{p}` 不要求 `client_show_project_list`；⑥ `/support/`（尾斜杠）直接进 remote，不跳 transactions；⑦ `saved-payout-methods` 只要 `get_transfers` | `routes.tsx:108-114`；`settings.ts`；`projects.ts:79-85,165-170`；`storefront.ts`；`finance.ts:31-38` |
| E11 | OBS-PROJ-001 | 遗漏：无项目时先把 URL 改成 `/projects/0` 再判断 NoProjectPage；列表不完整时不改写，改为请求项目详情；`currentProjectId` 等于请求 id 时直接放行 | `ProjectRequiredRoute.tsx:81-114,153-163`；components 4.20.3 `index.mjs:1288-1314` |
| E12 | OBS-ROUTE-002 | merchant 与 outside 数组本身已以显式 `*` 结尾，createRoute 追加的 `*` 不可达。~~`/support` 的 `defaultRedirect`（path 为空）在 `*` 之前吞掉所有未匹配子路径~~ **[P3 修正]**：追加的 `*` 在 `/verification`、`/projects` 子树中生效；`/support/*` 已接走全部子路径（包括 `/support/`），`defaultRedirect` 只接裸 `/support` | `routes.tsx:97-99,149,162`；`routes/defaultRedirect.tsx:8-13` |
| E13 | 遗漏（ERR/NAV 交界） | 403/404 页 `authorized: !!state.user.id`，而 SDK user slice 的 id 在 `state.user.user.id`，所以已登录也显示 NavigationLite [I] | `layouts/error/forbidden/index.tsx:17-19`；platform-store `index.mjs:582-600` |
| E14 | 遗漏（NAV） | 展开态 `ProjectSidebarV2` 在没有项目 id 时返回 `null`，BIZA-370 的 Marketplace/Ontology 只在折叠态生效 | `project-sidebar-v2/index.tsx:145-147`；nav config `:482-506` |
| E15 | 遗漏（NAV，死代码） | LiveOps 子项的 `hidden: isSupportRole` 永远不起作用：SupportRoles ⊂ `PROJECTS_HIDDEN_ROLES`，该 hook 已提前返回 `[]` | nav config `:273-319,478-480`；`roles.ts:73` |
| E16 | 自动化归属 / 测试资产 | 按 coordinator 通知（spec 0.2.0）：OBS-ACC-003/AC-04 只由 I15 固定；I9 固定的是 OBS-PROJ-001 的 "无项目且无 `project_create` → /forbidden"（`scenarios.ts:143-150`）。另：`e2e/tests/smoke-areas.ts` 中的 `/new-project`、`/api-key`、`/members` 是 V2 路径，v1 不存在。**[P3 修正]**：不属于 v1 的路径共 5 个，另有 `/user-activity`（v1 为 `/settings/user-activity`）和 `/anti-fraud`（v1 为 `/analytics/anti-fraud`） | `scenarios.ts:143-150`；`smoke-areas.ts:28-35` |

spec 0.3.0 已合入 E1–E16（E3、E12、E16 按上面的修正合入）。用例追溯中保留的 E 编号仍指本表。

另记：菜单与路由不一致（§1 "不一致" 列，共 13 类）不是 spec 写错，而是 spec 未覆盖的实现缺口，已转成 RT-NAV-006~019。

---

## 8. 覆盖统计

### 8.1 OBS 覆盖

| 域 | OBS 数 | 已覆盖 | 覆盖用例 |
|---|---|---|---|
| ROUTE | 8 | 8 | 001→RT-ROUTE-001~006；002→RT-ROUTE-003/004/007/033；003→009/010；004→019/020/036；005→011/012、RT-NAV-029；006→013~017；007→021；008→008/022/023 |
| ACC | 6 | 6 | 001→RT-ACC-002；002→003；003→001/004~022/041/042；004→023~033；005→034/035；006→001/036 |
| PROJ | 2 | 2 | 001→RT-PROJ-001~004/006~011/015/018；002→005 |
| NAV | 4 | 4 | 001→RT-NAV-006~020/025；002→001/017/018/021~023；003→002~004/031；004→024 |
| **合计** | **20** | **20** | — |

另覆盖：AC-01（RT-PROJ-014，只覆盖客户端导航）、AC-01b（RT-PROJ-019，预期失败项）、AC-04、AC-05、AC-07、AC-08、AC-12（RT-ACC-027，预期失败项）；OBS-ERR-004（RT-NAV-030）；S-18（RT-ACC-027）、S-19（RT-ACC-028）、S-21（RT-NAV-030）、S-34（RT-PROJ-019）；§2.3 BFF 302 规则（RT-ROUTE-003/034）；§2.4 EnterAccountGate（RT-ROUTE-001 只记录，T1 RT-AUTH-023 主测）；D1（RT-ROUTE-026/027/028）、D2（RT-ACC-034/035）；U-04、U-07、U-08。P5 新增：S-35（RT-ROUTE-028/036、RT-ACC-001 #25，RT-ACC-019 为反证；崩溃后不恢复的 U-14 由 T1 RT-ERR-008 主测）、S-37（RT-NAV-003/031）、S-38（RT-ROUTE-008）、§2.3 `0` 哨兵（RT-PROJ-003/009/018）。

预期失败项（当前代码不满足期望，修复前不作为阻断）：RT-ACC-027（S-18、AC-12）、RT-ACC-028（S-19）、RT-PROJ-019（S-34、AC-01b）；P5 新增 RT-ROUTE-008（S-38）、RT-ROUTE-028 与 RT-ROUTE-036（S-35）、RT-ACC-001 的 #25（S-35）、RT-NAV-031（S-37）。RT-ROUTE-026/027 仍按“缺陷现状”记录（D1），修复须与 S-35 一起做。

### 8.2 用例数与优先级

| 子域 | 用例数 | P0 | P1 | P2 |
|---|---|---|---|---|
| ROUTE | 36 | 1 | 18 | 17 |
| ACC | 42 | 4 | 23 | 15 |
| PROJ | 19 | 4 | 10 | 5 |
| NAV | 31 | 1 | 18 | 12 |
| **合计** | **128** | **10** | **69** | **49** |

自动化已固定（v1）：I4、I8、I9、I10、I11、I12、I15、D1（gold）、D2 对应的用例，以及多条单测；e2e 均为 `fixme`。`[分支差异]` V2 只迁移了 I6/I7（T1 范围）。

---

## P3 变更记录

spec 0.2.0 → 0.3.0。依据：spec diff（OBS-ROUTE-002/003/005/006、OBS-ACC-003/004/005、OBS-PROJ-001、OBS-NAV-002/003/004、OBS-ERR-004、§5、§9 AC-12、§11.2 S-18/S-19/S-21、§11.3）与 spec 作者对 T2-E3/E12/E16 的修正。修改 9 条，新增 2 条，废弃 0 条。

| 用例 ID | 类型 | 原因 |
|---|---|---|
| RT-ROUTE-007 | 修改 | T2-E12 修正：`/support/` 由 `/support/*` 接走，`defaultRedirect` 只接裸 `/support`；追溯改为该机制 |
| RT-ROUTE-025 | 修改 | §5：`:frame_path` 被忽略；增加不同 `frame_path` 渲染同一页面的检查 |
| RT-ROUTE-033 | 修改 | OBS-ROUTE-002 / T2-E12 修正：追加的 `*` 在 `/verification` 子树生效；预期由"待确认"改为 `/not-found` |
| RT-ACC-027 | 修改 | 追溯改为 S-18、AC-12；按 AC-12 期望 `/forbidden`，标为预期失败项 |
| RT-ACC-028 | 修改 | 追溯改为 S-19；写明期望判定，标为预期失败项 |
| RT-ACC-042 | 新增 | OBS-ACC-003(a)：integration type 未加载（null）时放行 |
| RT-PROJ-018 | 新增 | OBS-PROJ-001 重写后的分支：列表为空且 URL 已是 `/projects/0` 时不改写 |
| RT-NAV-003 | 修改 | OBS-NAV-003 已改写，原追溯 E3 被修正；追溯改为 0.3.0 |
| RT-NAV-004 | 修改 | T2-E3 修正：折叠态 `window.open` 分支不可达，折叠叶子为 `div[data-id]`，外链走 `UIMLink` 的 `<a>`；`sidebar/index.test.tsx` 前提错误，从自动化列移除 |
| RT-NAV-017 | 修改 | OBS-NAV-002 已写明 Get started 对 section 角色可见；删除"spec 与实现不符"的说明，增加 webdev 对照 |
| RT-NAV-030 | 修改 | OBS-ERR-004 / S-21 由 [I] 改为 [F]：`authorized` 恒为 false；扩展到 `/not-found`、`/error` |

同步修改：头部 spec 版本；§1 visibility 说明（OBS-ACC-005）；§2 第 13、18、19、21、52 行，新增第 54 行；§3 `/support` 与"未匹配路由"两行；§5 账号表；§7 E3、E12、E16 的修正说明；§8 覆盖统计。

核对后未改的用例：OBS-ROUTE-003/005/006（RT-ROUTE-009~016、RT-NAV-029）、OBS-ACC-004 as-built 3/4（RT-ACC-031/033）、OBS-ACC-005（RT-ACC-034/035）、OBS-PROJ-001 其他分支（RT-PROJ-001~017）、OBS-NAV-002/004（RT-NAV-018/022/024）。spec 0.3.0 与这些用例的预期一致。


---

## P4 变更记录

spec 0.3.0 → 0.3.1。依据：spec diff（OBS-MAG-002、AC-01/AC-01b、S-34、§2.3 与 OBS-AUTH-009 的 BFF 302 规则、§2.4 EnterAccountGate），以及同版本 SDK 源码复核（platform-store `slices/user.ts:120-137`、platform-apis `apis/merchant.ts:106-107`、platform-bff `bff-routes.ts:37,121-188`、platform-components `useEnterAccountGate.ts:20-31,160-166`）。修改 4 条，新增 1 条，废弃 0 条。

| 用例 ID | 类型 | 原因 |
|---|---|---|
| RT-ROUTE-001 | 修改 | §2.4：EnterAccountGate 会把首次进入的非 admin owner 从 `/error`、`/forbidden`、`/not-found` replace 到 `/enter-account`。前置条件改为 admin、非 owner，或已看过 enter-account 的 owner，避免误判；该分支交给 T1 RT-AUTH-023 |
| RT-ROUTE-003 | 修改 | §2.3：匿名打开 `/abc/dashboard`、`/unknown` 不是 BFF public 路径，先被 302 到 `/login`，不会到 SPA 的 `/not-found` 兜底 |
| RT-ROUTE-034 | 修改 | §2.3：匿名打开 `/registration`、`/legal-consent` 被 BFF 302 到 `/login`；补充 `/` → 302 `/login` |
| RT-PROJ-014 | 修改 | S-34：原用例在地址栏改成 `{999}` 并断言回到 `/{orgs[0]}`，这只在客户端导航时成立。改为客户端导航（AC-01）；整页加载拆到 RT-PROJ-019 |
| RT-PROJ-019 | 新增 | S-34、AC-01b：地址栏整页加载外部 merchant，期望回到 `/{orgs[0]}`，当前显示 HydrationError，标为预期失败项 |

同步修改：头部 spec 版本改为 0.3.1；§2 第 8 行（`/`、`/login` 的 BFF 302）；§3 外部 merchant 行拆成客户端导航和整页加载两行；§5 账号表；§8 覆盖统计（125 → 126，预期失败项增加 RT-PROJ-019）。

核对后未改：RT-ROUTE-002（前置条件沿用 RT-ROUTE-001）；其他用 owner 断言 `/forbidden` 的 ACC 用例（owner 在 merchant 页已经过 EnterAccountGate，不受 §2.4 本次修改影响）。

---

## P5 变更记录

spec 0.3.1 → 0.3.2。依据：spec diff（S-35、S-37、S-38、OBS-PROJ-001 五个条件、§2.3 / OBS-AUTH-009 的 `0` 哨兵、AC-05、§10.3、U-14），stage 记录 `stage-results-2026-10-21.md`（`c1b5e37`，RT-ACC-001、RT-ROUTE-008/026/028、RT-PROJ-002/009、RT-NAV-003 各行），以及 `772a320` 源码复核（`routes.tsx:104-114`、`layouts/Root.tsx:77-113,158-236`、`ProjectRequiredRoute.tsx:75-120`、`project-sidebar-v2/nav-items-config.tsx:199,413`、platform-store `slices/projects.ts:553-570`）。修改 12 条，新增 2 条，废弃 0 条。总数 126 → 128。

| 用例 ID | 类型 | 原因 |
|---|---|---|
| RT-ROUTE-008 | 修改 | S-38：stage 实测 `/Settings/Company` 显示 shell sidebar。按 S-38 写期望（与小写一致），标为预期失败项；补 `/Marketplace` |
| RT-ROUTE-026 | 修改 | S-35：当前仍是 `/not-found`（stage 实测，不崩溃）；修复后预期改为“D1 与 S-35 一起修”，只修 D1 会变为必崩 |
| RT-ROUTE-027 | 修改 | 同上；Link 没有 privilege gate，只修 D1 时所有账号都会崩溃 |
| RT-ROUTE-028 | 修改 | S-35：原预期“分别渲染 Gold 与 Link”错误；stage 实测必崩（Redux error #7）。改为当前必崩，标为预期失败项，附修复后预期；补 `routes.test.tsx:119` 的 mock 掩盖问题 |
| RT-ROUTE-036 | 新增 | S-35 定向：metaframe 整页加载、客户端导航、子路径都必崩；项目级路由对照；修复后要求补路由级测试 |
| RT-ACC-001 | 修改 | S-35：#25 当前必崩，单独按预期失败记录，不阻断其余 31 个路由；崩溃后需刷新（U-14） |
| RT-ACC-019 | 修改 | S-35 反证：无 `ps` 时 `/{m}/metaframe` 被拒且不预取，不崩溃 |
| RT-PROJ-002 | 修改 | OBS-PROJ-001：写明列表完整与“详情 403/404 → 不可访问”两条改写路径；stage 走的是后者 |
| RT-PROJ-003 | 修改 | AC-05 只适用于客户端导航：增加刷新步骤，整页加载 `/projects/0` 被 BFF 302 到 `/{m}/` |
| RT-PROJ-008 | 修改 | OBS-PROJ-001：只有详情 403/404 会标为不可访问；增加 500 变体（不改写，[I]） |
| RT-PROJ-009 | 修改 | OBS-PROJ-001 条件 3 与 OBS-AUTH-009：拆成整页加载（BFF 302 到第一个项目）、客户端导航列表完整（改写）、列表不完整（不改写，stage 实测）。stage 的 FAIL 改判为 as-built |
| RT-PROJ-018 | 修改 | OBS-AUTH-009 / AC-05：原“直接打开 `/projects/0` 不改写”只在客户端导航成立；整页加载被 BFF 302 到 `/{m}/` |
| RT-NAV-003 | 修改 | 追溯加 S-37；属性检查 stage 已通过，域名问题转到 RT-NAV-031 |
| RT-NAV-031 | 新增 | S-37 定向：Email customizer 在 stage 指向生产域名，标为预期失败项；Receipt customizer 作对照 |

同步修改：头部 spec 版本改为 0.3.2；§1.5 标注三条必崩路由；§2 第 25、26、27 行；§3 新增 4 行（列表不完整不改写、`/projects/0` 整页加载两种结果、`/0` 整页加载）；§5 项目数 > 100 的账号行；§6 新增 U-14；§8 覆盖统计与预期失败项。U-14 的新增用例放在 T1（RT-ERR-008）。核对后未改：RT-PROJ-007、RT-PROJ-010（条件 2、3 与原预期一致）、RT-ROUTE-022（只测小写路径）、RT-PROJ-014/019（§10.3 未涉及非 admin，U-15 由 T1 跟踪）。
