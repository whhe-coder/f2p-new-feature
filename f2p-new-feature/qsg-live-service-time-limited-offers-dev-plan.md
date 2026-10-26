# 开发计划：QSG Live-service: Time-limited offers（F2P）

- **来源 PRD：** [qsg-live-service-time-limited-offers-prd.md](qsg-live-service-time-limited-offers-prd.md)（Confluence：PRD - QSG Live-service: Time-limited offers，version 0.1，Draft）
- **相关计划：** [advanced-foundation-detail-plan.md](advanced-foundation-detail-plan.md)（F-01 到 F-17）、[promotions-advanced-dev-plan.md](promotions-advanced-dev-plan.md)、[bundles-advanced-dev-plan.md](bundles-advanced-dev-plan.md)。共享的 Advanced 部分只在 foundation 中定义。本计划只引用 F-xx 编号，不重复定义。
- **分支：** 待定
- **状态：** 草稿，revision 2。等待第 1 节的待决事项和第 7 节的待确认项。
- **Revision 3：** 对照 free-to-play-pc `specs/` 下的 reverse spec 修订。改动：
  - 写明 F-03 的持久化契约。
  - 重试差集改为以服务端数据为准；promotion 幂等标记改为确定性 hash。
  - TL-10 拆成 item 写权限和 promotion 写权限，并列出 Viewer 写拦截的缺口。
  - 新增 TL-17：Go online 排除窗口外的条目。
  - 定义 Live 读取失败的语义。
  - 写明 dev panel 的 production 隔离。
  - 按 spec 和代码已有的答案，改写或关闭 C2、C3、C5、C7。
- **Revision 2：** 按新上下文 reviewer 的审查修订。改动：foundation 扩展需求补上 F-02、F-06、F-08、F-10、F-15，删掉不需要的 F-12；第 1 屏改为按类型白名单筛选，排除 game key；TL-03 加写入清单、按差集重试、promotion 幂等；写明 overlap 需要的数据；新增 TL-15（现有 setup 不清空 `periods`）和 TL-16（manage 视图与编辑）；VC package 的 PUT 路径列入 C2。

## 本计划范围

本计划**只交付 Free-to-play 账户**，代码在 `free-to-play-pc`。

- PRD 定义的目标账户是 live-service PC 账户，Premium PC 账户不显示该卡片（CARD-01）。所以本功能不需要 Premium 变体。
- 本仓库只是 Get Started 前端。Store API、Promotions API 和新的 overlap 查询由各自的团队负责（PRD Dependencies）。本计划只负责调用这些 API，并实现降级方案。
- Figma 设计稿还没有开始做，它是开始开发前的阻塞项（PRD Dependencies）。不依赖设计稿的任务可以先做，见第 5 节。

## 0. 代码现状

Get Started 引擎的现状（单一 current setup、`SelectionScreen` 重定向、进度和 pin 机制）见 foundation 计划的“与现状核对的结果”一节，这里同样适用。与本功能相关的现状如下：

| 领域 | 现状 | 影响 |
|---|---|---|
| Advanced 框架 | 没有 Advanced 列表、卡片、`ADVANCED_GUIDES` 或 capability 状态。卡片状态只有 hub 的 `done / current / locked / pending`（`setup-hub/SetupHubStepCard.tsx:14`）。 | 依赖 foundation F-01 到 F-17。本功能是该框架的第三个 guide。 |
| Catalog 读取 | `listCatalogItems`（`core/apis/catalog.ts:540`，POST，不分页）返回 `type`、`bundleType`、`isPaid`、`isEnabled`、`isShownInStore`（:517-531）。`normalizeCatalogItem` 丢弃了 `periods` 和 `groups`。 | 第 1 屏的 "Visibility now" 列和 Live 检测需要 `periods`；overlap 需要 `groups`（任务 TL-02）。 |
| 条目类型 | 列表返回所有类型：`virtual_good`、`bundle`、`virtual_currency`、`unit`（game key）（`catalog.ts:343-356`）。game key 没有 `periods`（:243），也没有 update 函数。 | 第 1 屏按类型白名单筛选，只保留 `virtual_good` 和 `bundle`（含 VC package）（TL-04）。 |
| 现有 setup 的写入 | sell-virtual-goods 和 off-platform-distribution 更新 item 时整体替换，并固定写入 `periods: []`（`sell-virtual-goods/itemPayload.ts:121-138`、`off-platform-distribution/itemPayload.ts:134-151`）。代码注释已把这一点列为已知缺口。 | 伙伴排期后再用初始 setup 编辑同一个 item，schedule 会被静默清空，卡片退回 Available（TL-15）。 |
| `periods` 字段 | virtual item、VC package、bundle 的 payload 中类型都是 `unknown[]`（`catalog.ts:79`、`:147`、`:188`）。game key 没有 `periods`（`:243`）。现有 setup 写入时总是 `[]`（`sell-virtual-goods/itemPayload.ts:138`）。没有代码读取它。导入模板给出了元素结构：`{date_from, date_until}`，值是带时区偏移的 ISO-8601（`sell-virtual-goods/import-template.json:43-48`）。 | 按模板的结构实现。C2 只需要在 admin PUT 上确认这个结构。 |
| Catalog 写入 | `updateVirtualItem`、`updateVirtualCurrencyPackage`、`updateBundle`（`catalog.ts:604`、`:665`、`:692`）都要求传入**完整 payload**。没有只改部分字段的 API。VC package 的 PUT 路径**未经验证**，可能实际在 /mapi 网关上（`catalog.ts:658-664`）。 | 写入 `periods` 时，需要先读取完整的原始 item，再整体写回（TL-03）。50 个条目逐个 PUT，**无法原子写入**（P3）。VC package 的写入在 C2 确认前可能 404。 |
| VC package 类型 | VC package 在列表中显示为 `type: 'bundle'`、`bundle_type: 'virtual_currency_package'`（`catalog.ts:431-437`）。未打包的 VC 定义显示为 `type: 'virtual_currency'`。 | 第 1 屏要排除未打包的 VC，保留 VC package（TLO-04）。 |
| Promotions | 没有 Promotions 或 discount 的 API client。侧栏的 Promotions 链接指向 `storefront` remote 的子路由 `/projects/${projectId}/storefront/promotions`（`layouts/sidebar/project-sidebar-v2/nav-items-config.tsx:226`）。Promotions 计划 2.2 准备新建只读 client `core/apis/promotions.ts`，但它的 `PromotionRef` 只有 `{id, kind, isActive, name?}`（promotions-advanced-detail-plan.md:121-123）。 | 本功能需要在这个 client 上**加写入方法**（创建 discount promotion），并扩展读取：时段、目标条目和 group、折扣值。没有这些字段就无法计算 overlap（TL-06、TL-07）。 |
| API host | Store API 使用 `storeInstance`，带 PA bearer token（`core/apis/store-instance.ts:18`），host 为 `config.storeApiUrl`（`src/config.ts:22-24`）。 | Promotions 的写入和 overlap 读取使用同一个 instance，不需要新的鉴权方式。 |
| 埋点 | 只有 Metrika，事件名在 `platform-events.ts:32-67`，没有 `qsg_*` 事件。`platform-analytics.ts` 按事件类型分方法：`trackOpen`（et=1，:22）、`trackClick`（et=3，:36）、`trackCustomEvent`（et=5，:43）。参数通过 `exv` 传出，但 tracking plan 的 exv 列是严格契约，没登记的字段会被 analytics QA 拒绝（:12）。Metrika 只在 `METRIKA_COUNTER_ID` 非空且不是 development 环境时初始化（spec 15 XPL-INFRA-005）。 | 8 个事件和参数要先登记进 tracking plan（C3）。只能在 stage 上验证埋点（TL-11）。 |
| Feature flag | Get Started 中没有 feature flag。其他地方使用 `@accounts-sdk/platform-store` 的 `selectEnabledFeatureByName` 和 `FEATURES.*`（例如 `routes/useSectionBasedRestrictions.ts:26-32`）。 | Wave 1 需要按账户开关的 flag。flag 名和配置由后端提供（C4）。项目规则禁止修改 SDK。 |
| 权限 | 财务和 Support 系列角色在 Get Started 路由会被转到 `/forbidden`（`core/utils/projectAccess.ts:9-27`，spec 05 GS-ROUTE-006）。能进入 Get Started 的 Owner、Developer、Junior Developer 对 Items catalog 和 LiveOps 都有编辑权限（spec 15:130-132）。但存在按 section 受限的角色：`items_catalog_only_role`、`liveops_only_role`（`routes/useSectionBasedRestrictions.ts:25-43`，spec 15 XPL-ROUTE-007）。Viewer 能进入 Get Started。**没有只读模式。** | NFR-04 的只读人群是 Viewer 和按 section 受限的角色，不是财务或 Support（TL-10）。 |
| Viewer 写拦截 | Viewer 的写请求拦截只覆盖 `apiBaseUrl` 和 `discordBotApiUrl`（`src/App.tsx:150-161`，spec 15 XPL-AUTH-007）。`storeApiUrl` 不在其中，Store API 是直连的（spec 15 XPL-INFRA-002）。 | Viewer 发出的 item PUT 和 promotion POST 不会被 shell 拦截。TL-10 的客户端检查是唯一防线。 |
| Go online 测试购买 | `isTestPurchasable` 只看 `isPaid`、`isEnabled`、`isShownInStore`，不看 `periods`（`sell-virtual-goods/GoOnlineStep.tsx:62-75`，spec 06 SVG-GO-005）。 | 本卡片不受初始 setup 限制，伙伴可能在 Go online 之前就排期。窗口外的条目仍会被列为测试购买候选，checkout 会失败（TL-17）。 |
| Verifier 失败语义 | verifier 抛错、拒绝或超时时，不能覆盖已有 verdict；没有已有 verdict 时保持未知（spec 05 GS-STATUS-002）。 | `liveRule` 读取失败也要遵守这条规则，否则卡片会在 Live 和 Available 之间来回跳（F-08 扩展）。 |
| 本地存储契约 | `getStartedLocal` 读取时逐字段重建，丢弃未知字段；写入只对显式的 action allow-list 生效；最多保留 20 个项目；失败时降级为内存空状态（spec 05:267-275，GS-LOCAL-003）。 | F-03 新增的字段如果没加进 parse 和 allow-list，会静默不落盘（F-03 扩展）。 |
| 测试 | Vitest + jsdom，覆盖率门槛 99/94.5/97/99（`vitest.config.ts`）。API 用 `vi.mock('@core/apis/catalog')` mock，没有 msw。E2E 在 `e2e/tests/get-started-*.smoke.spec.ts`，dev panel fixture 在 `e2e/fixtures/devPanel.ts`。 | 新代码要满足覆盖率门槛。新 API client 使用同样的 `vi.mock` 方式测试。 |

## 1. 待决事项（阻塞开发）

PRD 的 Open decisions 和 Dependencies 中，会阻塞开发的项如下：

| 编号 | 待决事项 | 来源 | 阻塞 |
|---|---|---|---|
| OD1 | Taxonomy：卡片名称、所在小节，与父 PRD v2 6.1 节核对 | Open decision 1 | TL-01 |
| OD3 | Time-limited offers 是独立卡片，还是 "Sales, discounts & offers" 卡片下的子流程？ | Open decision 3 | TL-01、路由 |
| OD4 | overlap 日历在 v1 是否需要读取 guide 之外创建的 discount（API、批量导入）？ | Open decision 4 | TL-06 |
| OD6 | 执行团队和 Jira epic | Open decision 6 | 排期 |
| DEP-1 | 新的 overlap 查询（跨 discount 与 schedule），需要 Promotions 团队估时 | Dependencies | TL-06 |
| DEP-2 | Live 检测用的 capability 状态 flag（父 PRD 的共享 API） | Dependencies | TL-01 |
| DEP-3 | 所有画面的 Figma 设计稿 | Dependencies | TL-07 到 TL-09 的 UI 部分 |

OD2（签批人）和 OD5（NFR-03 可用性目标）不阻塞前端开发。

## 2. 按交付物拆分的任务

### 共享部分（引用 foundation）

本功能需要 foundation 的 F-01 到 F-17 全部完成。除此之外，对 foundation 提出以下**扩展需求**：

- **F-06、F-07、F-08 不受初始 setup 规则限制：** CARD-02 要求本卡片**永远不是 Blocked**。guide 配置加一个开关（例如 `ignoresInitialSetup: true`）。带这个开关的 guide：
  - F-08 不论初始 setup 状态如何，都调用 `liveRule`。现在的 F-08 在 `incomplete` 时不调用，传入 `'pending'`（foundation:384）。只改 F-07 的话，卡片会永远停在 loading。
  - F-07 跳过第 1 条（`incomplete` → `blocked`）和第 2 条（`unknown` → `loading`），直接按 `live` 判断。
  - 测试：`(incomplete, true)` → `live`，`(incomplete, false)` → `available`，`(unknown, false)` → `available`。
- **F-02、F-03、F-10 按屏 resume：** 第 1–4 屏没有 `verify` 和 `confirm`，按 F-02 属于 `info`。`info` 步骤要等下一个非 info 步骤（第 5 屏）完成才算完成，所以 `resumeStepId` 永远是第 1 屏（foundation:187-188），GDE-03 无法满足。修改方案：
  - F-02 新增 `form` 步骤类型：主 CTA 校验通过并保存草稿后即为完成。
  - F-03 的每个 run 保存表单草稿（选中的条目、时间窗口、时区、discount、badge、countdown）和已完成的 `form` 步骤。确认之前，账户上没有数据可以推导进度（P1）。
  - F-10 用这些 `form` 完成记录计算 `resumeStepId`。
- **F-03 持久化契约**（spec 05:267-275、维护建议 3）：
  - 新增字段：表单草稿、`form` 完成记录、写入清单、每个 guide 上一次的确定卡片状态。每个字段都要加进逐字段 parse 和写入的 action allow-list，并写测试。
  - 采用加法式解析：缺少的字段取默认值，**不升 `SCHEMA_VERSION`**。foundation 版本不匹配时会整体丢弃，升版本会清空所有伙伴的 Advanced 进度。
  - 草稿中不放任何敏感字段（GS-LOCAL-002）。
  - 存储不可用时降级为内存状态（GS-LOCAL-003）。这时 GDE-03 的次日恢复做不到，属于可接受的降级。正确性不能依赖本地存储，见 TL-03。
- **F-08 Live 读取失败的语义**（spec 05 GS-STATUS-002）：`liveRule` 抛错或超时时返回“不可判断”，保留上一次的确定状态，不当作“没有时段”。只有两次**确定**状态之间的变化才算转变。
- **F-10 guide 页面：** 进度条显示 "step N of 5"（GDE-02）。每屏显示 PA 面包屑（GDE-04）。
- **F-15 埋点：** 现在的 `AdvancedEvent` 是封闭 union（`card_click`、`guide_opened`、`step_started`、`step_skipped`、`frame_saved`、`guide_completed`），参数只有 `capabilityId`、`step` 和必填的 `cardState`（foundation:577-580），无法表达 PRD 的事件。需要的扩展：
  - 事件 union 加入 `step_viewed`、`step_completed`、`error`、`feature_enabled`，以及 guide 自定义的事件。
  - 可选参数：`step_name`、`duration_ms`、`error_code`、`entry`、`days_since_opened`，以及 guide 自定义的参数。
  - guide 内的事件不要求 `cardState`。
  - `qsg_feature_enabled` 要在卡片从 Available **变为** Live 时触发。foundation 有意不保存 Live 状态（F-14，foundation:564），所以 F-03 需要记录每个 guide 上一次看到的卡片状态，F-08 比较前后两次的状态来检测这次转变。

CARD-03（不显示 team-engagement 警告）不需要扩展：foundation 中本来就没有这种警告。原型中每张 Available 卡片都显示 "Before you start"，这一点不照搬（PRD 的 Prototype divergence）。

### D1：卡片

TL-01 **注册卡片。** 在 `ADVANCED_GUIDES` 中加入 `time-limited-offers`：名称、描述（CARD-01 原文）、CTA "Set up" 和 "Open"（"Open" 指向 TL-16 的 `managePath`），以及 `ignoresInitialSetup: true`。只对 F2P 变体注册（F-16）。Live 检测见 TL-02。

TL-02 **Catalog 读取扩展与 Live 检测。** 在 catalog 的 read model 中加入 `periods`（结构见 C2）和 `groups`。DEP-2 的 capability flag 可用之前，Live 规则的默认值是：至少一个条目有尚未结束的显示时段（P2）。检测结果在下一次加载时更新，不需要手动刷新（CARD-04）。

### D2：Guide（5 屏）

TL-03 **Schedule 写入模块（纯逻辑加 API）。** 位置：`src/pages/GetStarted/advanced/time-limited-offers/`。
- 对每个条目：读取完整的原始 item，只替换 `periods`，再用对应类型的 `update*` 整体写回。不能用 `normalizeCatalogItem` 的结果写回，因为它会丢字段。
- 写入前，在内存中校验全部条目。任何一条失败，都不发出写请求。
- 每次写入都记入本 run 的**写入清单**（SKU、写入前的 `periods`、写入后的 `periods`），清单保存在 F-03。本地存储可能丢失（刷新、存储故障、项目被裁剪），所以清单只是 best-effort，正确性不依赖它。
- 写入中途失败时，把已写入的条目恢复成原来的 `periods`，再显示重试（P3）。“原来的值”取自打开时的快照（内存中）；清单在的话以清单为准。回滚本身也失败时，在页面上列出未恢复的条目。
- 重试时，**重新读取服务端**每个条目的 `periods`，与目标值比较，只补写不相等的条目。这样即使清单丢失，也不会重复写入。
- 保存前重新读取每个条目的 `periods`，与打开时的快照比较。不一致时，提示对方已修改（PRD 边界情况：两个用户同时编辑）。比较时，当前值等于本次目标值，或等于清单中“写入后”的值，都算作本次自己的写入，不报冲突。
- 时间统一以 UTC 存储（NFR-07）。

TL-03a **Promotion 写入（幂等）。**
- 创建 discount promotion 时，名称或外部 id 带上一个**确定性标记**：guide id、排序后的 SKU 集合和窗口起止时间的 hash。不用 `runId`，因为本地状态丢失后会生成新的 `runId`，标记就失效了。
- 创建前先按这个标记查询是否已经存在，存在就复用，不再创建。这样，请求成功但响应丢失时，重试不会生成第二个 promotion，也不会出现自己和自己重叠。
- `periods` 已写成功、promotion 创建失败时：保留 `periods`，只重试 promotion（P10）。

TL-04 **第 1 屏 Pick offers。** 列表来自 `listCatalogItems`。按类型**白名单**筛选：只保留 `virtual_good` 和 `bundle`（包括 `bundle_type: 'virtual_currency_package'` 的 VC package）。这样会排除 `virtual_currency`（未打包的 VC），以及 `unit`（game key：没有 `periods`，也没有 update 函数）。支持搜索。最多选 50 个（TLO-04）。表格列：Entry、Type、Price、Visibility now。CTA 文案随选中数量变化（"Schedule 2 offers"）。

TL-05 **第 2 屏 Set window。**
- 字段：Show in store（Always / Limited time）、Time zone、Starts、Ends。
- 校验：结束时间早于开始时间时，显示行内错误，并禁用 Continue。时间窗口短于 1 小时时，显示警告，但可以继续（TLO-05）。
- 切换时区时，所有显示的时间重新计算，存储值不变。
- "Repeat this window" 开关见 P4。

TL-06 **第 3 屏 Frame the offer。**
- 字段：Discount %、Badge text、"Show countdown on store card" 开关，以及 store 卡片预览。
- 设置了 discount 时，在确认那一步创建一个关联的 discount promotion，时段与 schedule 相同（TLO-03、TLO-06）。写入方法加在 Promotions 计划 2.2 的 client 上（C1）。
- Badge 和 countdown 的存储位置见 P5。
- 购买链接只显示结束日期，这一条只影响画面上的说明文字。
- "Skip framing" 跳过这一屏，不创建 promotion。

TL-07 **第 4 屏 Review calendar。**
- 日历显示新 offer 和窗口内已有的 discount，范围是同一条目或同一 group（TLO-02、TLO-07）。
- 有重叠时，该行用警告色，并配文字说明（NFR-06）。同时显示一条警告通知，写出两个活动的名称。重叠只是警告，不阻止确认。
- 没有其他 schedule 时，只显示新 offer 和 "No overlaps"。
- DEP-1 交付之前，overlap 用降级方案在前端计算：读取 discount 列表和所选条目的 group，按时间求交集（P6）。查询只针对所选条目及其 group，并在本次 guide 会话内缓存（PRD 风险缓解）。
- 降级方案需要每个 discount 的起止时间、目标条目和 group、折扣值和名称。这些字段要加入 Promotions 读取 client（C1）。折扣值用来按 "largest discount wins" 说明实际生效的价格（TLO-07）。
- 本 run 通过 TL-03a 创建的 promotion，不计入重叠。

TL-08 **第 5 屏 Go live。**
- 点击 "Confirm schedule" 后执行 TL-03 的写入，设置了 discount 时再执行 TL-03a。
- 成功后显示 "N offers scheduled" 和摘要列表，然后标记完成，卡片变为 Live（TLO-08）。
- 成功页加 "What's next?" 推荐（F-14）。
- 次要 CTA "View in catalog" 指向 `/${merchantId}/projects/${projectId}/storefront`（All items）。现有 setup 的 hand-off 也用这个路径（`sell-virtual-goods/config.tsx:51`）。内部路径必须带 merchant 前缀（spec 15 XPL-ROUTE-001）。用户缺少 `/storefront` 要求的四项 privilege 时会被转到 `/forbidden`（spec 11 SC-003、`routes/inside/storefront.ts:5-11`），所以这时隐藏这个 CTA。

TL-09 **画面状态。**
- 加载中：pre-check、表格和日历显示 skeleton，不出现空白页。
- 保存失败：保留已填的值，显示重试，并上报监控。
- 网络中断：值保留在当前屏，不产生部分写入（依赖 TL-03 的回滚）。
- 能力在 guide 外已配置：guide 按实际状态把对应屏标为完成（父 PRD FR-11）。

TL-10 **只读模式（NFR-04）。**
- 路由 gate 不变：财务和 Support 系列仍然转到 `/forbidden`（spec 05 GS-ROUTE-006）。不能为了“只读 guide”放宽 gate，否则这些角色会看到 catalog 和价格。按 spec 15 XPL-RBAC-001，`–` 表示无访问，不表示只读。
- 能力拆成两项，分别判断：
  - `canWriteItems`：Items catalog 写权限。没有时，整个 guide 只读。
  - `canWritePromotions`：LiveOps 或 Promotions 写权限。没有时，第 3 屏的 discount 禁用并说明原因，schedule 仍可提交。这样 `items_catalog_only_role` 的用户不会因为 promotion 写入 403 而陷入 P10 的重试循环。
- Viewer 明确按只读处理。Store API 不在 Viewer 写拦截范围内（第 0 节），所以客户端检查是唯一防线。
- 只读时，页面显示只读横幅和 "Ask a project owner to complete this step"，所有写操作都禁用。
- 每次写入前都重新检查这两项能力。判定方式见 C6。

### 横切任务

TL-15 **现有 setup 不清空 `periods`。** sell-virtual-goods 和 off-platform-distribution 更新已有 item 时，改为读取服务端原有的 `periods` 并原样写回，不再固定写 `[]`。与 TL-03 共用“读取原始 item 再合并”的 helper。创建 item 时仍写 `[]`。加一条回归测试：更新已有 item 时 `periods` 保持不变。

TL-16 **Manage 视图（TLO-08 可编辑）。** foundation F-10 规定，已完成的 run 再进入时一律新建 run（foundation:453-457）。所以 Live 卡片的 "Open" 不能进入 guide，否则会看到一个空的新 run。实现方式：
- 使用 foundation 的 `managePath` / `ManageComponent`（F-09 的 `/manage` 路由，F-12 的 "Open"），列出带时段的条目和关联的 promotion。
- 只有窗口尚未开始的 schedule 可以编辑时段，或者取消。已经开始的只读。
- 编辑走 TL-03 的同一写入模块。

TL-11 **埋点。** 通过 F-15 的 `trackAdvanced` 发出 PRD 的 8 个事件和参数（依赖第 2 节“共享部分”中的 F-15 扩展）：`qsg_card_clicked`、`qsg_guide_opened`、`qsg_guide_step_viewed`、`qsg_guide_step_completed`、`qsg_guide_error`、`qsg_feature_enabled`、`qsg_offer_framing_set`、`qsg_schedule_conflict_shown`。Wave 1 gate 之前，这些事件要能在 dashboard 上看到（NFR-05）。
- 按事件类型选方法：`qsg_guide_opened`、`qsg_guide_step_viewed` 用 `trackOpen`；`qsg_card_clicked` 和各屏 CTA 用 `trackClick`；`qsg_guide_step_completed`、`qsg_guide_error`、`qsg_feature_enabled`、`qsg_offer_framing_set`、`qsg_schedule_conflict_shown` 用 `trackCustomEvent`。F-15 的 `trackAdvanced` 要支持按事件分发到这三个方法。
- 参数只发 tracking plan 中已登记的 exv 字段（C3）。
- `qsg_feature_enabled` 只在两次确定状态之间从 Available 变为 Live 时发出（F-08 扩展）。窗口全部到期后再次变为 Live 是否算新的 enabled，见 P11。
- development 环境不初始化 Metrika，埋点只能在 stage 上验证。

TL-12 **Feature flag。** 卡片和 guide 都受 flag 控制。flag 关闭时，两者都隐藏。已经创建的 schedule 保留在账户上（PRD Rollback）。

TL-13 **Locale。** 新 key 只加在 `src/locales/en.json`（项目规则）。日期按浏览器 locale 格式化。
- NFR-07 要求 v1 只有英文，不需要额外代码：译文文件缺少的 key 会自动回退到 `en.json`（spec 15 XPL-INFRA-006）。
- 只要不为这些新 key 运行 Smartcat 的 `export` 即可。注意 Smartcat 按分支整体导入：同一分支上的其他字符串需要翻译时，这些新 key 会被一起翻译。所以本功能的字符串放在单独的分支上，或者等 v2 再翻译。

TL-14 **Dev panel。** 在 `src/pages/GetStarted/dev/` 中加入本 guide 的覆盖项：各屏状态、重叠和无重叠、保存失败、只读。这样 stage 上不需要真实数据也能走查各状态。
- 现有 panel 只挂在 `SetupScreen` 里，通过带 production 常量的条件 `lazy()` import 加载（spec 05:313）。foundation F-10 的 `AdvancedGuideScreen` 是另一个 screen，需要用**同样的** production 常量和 `lazy()` 守卫挂载 panel。
- production 不得启用 panel，也不得读写它的存储（spec 05 GS-DEV-001）。
- 验证：`pnpm build:prod && grep -r gs-dev__toggle dist/` 没有结果（项目 `CLAUDE.md`）。

TL-17 **Go online 排除窗口外的条目。** sell-virtual-goods 的 `isTestPurchasable`（`GoOnlineStep.tsx:62-75`）加一条判断：用 TL-02 读出的 `periods`，排除当前不在任何窗口内的条目（`periods` 为空表示一直可见）。否则伙伴先排期、再做 Go online 时，picker 会列出窗口外的条目，checkout 失败。加回归测试。

## 3. 测试计划（先写测试，只在用户要求时运行）

按项目规则，测试先于代码编写，但除非用户要求，**不运行**。

| 层级 | 测试目标 |
|---|---|
| Unit | 第 1 屏过滤：排除未打包的 VC 和 `unit`（game key），保留 VC package，最多 50 个；窗口校验：结束早于开始时报错，短于 1 小时时警告；时区切换后 UTC 存储值不变；TL-03 只替换 `periods`、保留其他所有字段，任一条目校验失败时不发出写请求，中途失败时回滚已写入的条目，重试只补写差集，自己写入的条目不报冲突，他人修改时提示；TL-03 清单丢失时，重试按服务端值与目标值的差集补写；TL-03a 已存在相同确定性标记的 promotion 时不重复创建，标记与 `runId` 无关，promotion 失败时 `periods` 保留；F-03 新字段经过 parse 和 allow-list 后能落盘，缺少字段时取默认值，`SCHEMA_VERSION` 不变；F-08 `liveRule` 失败时保留上一次的确定状态；TL-10 两项能力：只有 item 写权限时 discount 禁用，Viewer 全部只读；TL-17 窗口外的条目不是测试购买候选，`periods` 为空的条目仍是候选；overlap 计算：同一条目、同一 group、边界相接、无重叠、本 run 的 promotion 不计入；Live 规则：已结束的时段不算 Live；F-07 扩展：`(incomplete, true)` → `live`，`(incomplete, false)` → `available`，`(unknown, false)` → `available`；F-02 `form` 步骤：主 CTA 成功即完成；TL-15：更新已有 item 时 `periods` 不变 |
| Component | 卡片在没有 web shop 时仍为 Available，CTA "Set up"；没有 team-engagement 警告；overview 先于任何表单字段显示；"step 3 of 5" 与 3/5 进度条；各屏 CTA 文案；第 4 屏警告色配文字；成功页加 "What's next?"；只读横幅和禁用的写操作；loading、empty、error 三种状态 |
| State | 在第 3 屏离开、第二天返回，guide 打开到第 3 屏且保留已填的值；打开 guide 不改变 `currentSetupId`；确认后下一次加载卡片显示 Live；Available → Live 转变时发出一次 `qsg_feature_enabled`，之后不重复；Live 卡片的 "Open" 进入 manage 视图，已开始的 schedule 只读 |
| API client | Promotions 写入 client 和 catalog 原始 item 读取，用 `vi.mock` 测试请求形状 |
| Analytics | 8 个事件在正确的时机、用正确的方法（`trackOpen` / `trackClick` / `trackCustomEvent`）触发，只带已登记的 exv 字段；`liveRule` 失败后恢复不会再发 `qsg_feature_enabled` |
| Build | `pnpm build:prod` 的产物中没有 dev panel 的 chunk（TL-14） |
| Locale | 加入新 key 后 `locales/index.test.ts` 仍通过 |
| E2E（可选，按需启用） | 用 dev panel fixture 走完 5 屏的冒烟测试 |

依赖后端尚未交付的行为，按项目 placeholder 规则写成 skipped test，并写明启用条件：
- DEP-1 交付后：overlap 改用后端查询。
- DEP-2 交付后：Live 改用 capability flag。
- P5 确认后：badge 和 countdown 的写入。

### 验收标准 → 验证手段

| PRD 验收标准 | 验证手段（F2P） |
|---|---|
| TLO-01：两个条目写入相同时段 | TL-03 unit test，加 stage 上在 catalog 中逐条核对 |
| TLO-02：已有 discount 重叠时显示警告 | overlap unit test，加 stage 上预先创建周末促销后走查 |
| TLO-03：promotion 出现在 Promotions 中，时段与条目一致 | stage 走查（依赖 C1） |
| CARD-04：确认后下一次加载显示 Live | Live 规则 unit test，加 stage 走查 |
| CARD-02：没有 web shop 时卡片为 Available | F-07 扩展的 unit test，加 stage 上用未完成初始 setup 的项目走查 |
| TLO-08：窗口开始前可编辑 | TL-16 的 component test，加 stage 走查 |
| GDE-03：第二天返回停在第 3 屏 | State 测试 |
| NFR-01、NFR-02：p95 < 2 s、overlap 查询 p95 < 1 s | 前端只能在 stage 上抽样测量。p95 需要埋点数据或后端监控（C3） |
| Wave 1 gate：保存错误率 < 1%，持续 14 天 | 由 `qsg_guide_error` 计算，不属于 MR 验证 |

## 4. 合并前验证

- 本地 `pnpm dev:stage` **不算** MR 的验证（`CLAUDE.md`）。
- MR 需要 stage 验证：`pnpm release` 发到 stage，再预览该 tag，并填写 "Stage verification" 一节。
- release 和 merge 由用户负责（项目 memory），本计划不包含这两步。
- stage 走查要在一个测试项目上进行，因为确认会真实写入 `periods` 并创建 promotion。走查后需要清理这些数据。

## 5. 建议顺序

1. 解决第 1 节和第 7 节。优先处理 C1、C2 和 P3，它们决定写入方案能否成立。
2. foundation F-01 到 F-17，加上第 2 节列出的 foundation 扩展需求（如果还没交付）。
3. 不依赖设计稿的部分：TL-02、TL-03、TL-03a、TL-15、TL-17、overlap 计算逻辑，以及它们的 unit test。TL-15 和 TL-17 改的是现有 setup，可以单独先合并。
4. Figma 交付后：TL-01、TL-04 到 TL-09、TL-16。
5. TL-10 只读模式、TL-11 埋点、TL-12 feature flag、TL-13 locale、TL-14 dev panel。
6. Stage 验证和 MR（release 由用户负责）。
7. DEP-1、DEP-2 交付后，把降级方案替换为后端查询，并启用对应的 skipped test。

## 6. 风险

| 风险 | 缓解措施 |
|---|---|
| 整体写回 item 时覆盖了其他字段，或覆盖了别人刚做的修改 | 读取原始 item，只替换 `periods`（TL-03）；保存前对比快照 |
| 逐条 PUT 无法原子写入，与 PRD“不产生部分写入”的要求冲突 | 先整体校验，失败时按写入清单回滚（TL-03）；P3 请 PRD owner 确认是否接受 |
| 重试误报冲突，或重复创建 promotion | 写入清单区分自己的写入；promotion 按 `runId` 幂等创建（TL-03a） |
| 伙伴用初始 setup 编辑已排期的 item，schedule 被清空 | TL-15：现有 setup 保留原有 `periods` |
| VC package 的 PUT 路径未经验证，写入 404 | C2 确认前，stage 走查必须包含 VC package；路径不对时只改 `catalog.ts` 一处 |
| F-03 新字段没加进 parse 或 allow-list，静默不落盘；升 `SCHEMA_VERSION` 清空所有进度 | F-03 持久化契约：逐项列出字段，加法式解析，不升版本，每个字段都有落盘测试 |
| 本地存储丢失后，回滚和重试失去依据，或重复创建 promotion | 重试以服务端值为准（TL-03）；promotion 标记是确定性 hash（TL-03a） |
| Viewer 或按 section 受限的角色发出写请求 | TL-10 拆成两项能力，Viewer 只读；Store API 不在 Viewer 写拦截范围内。如要把 `storeApiUrl` 加进拦截清单，需要改 `src/App.tsx`，要先按 `PLATFORM_PACKAGES_GUIDE.md` 评估 |
| 排期后 Go online 选中窗口外的条目，checkout 失败 | TL-17 |
| `liveRule` 读取失败导致卡片在 Live 和 Available 之间跳动，重复发出 `qsg_feature_enabled` | F-08 失败语义：保留上一次的确定状态 |
| dev panel 的 chunk 进入 production | TL-14 复用 production 常量和 `lazy()`，用 `pnpm build:prod && grep` 验证 |
| foundation 的扩展需求没有在 foundation 中落地 | 扩展需求在第 2 节“共享部分”中逐条列出；开始 TL 任务前，确认 foundation 已包含这些扩展 |
| 条目较多时 overlap 查询慢（PRD 风险） | 只查所选条目及其 group，会话内缓存；最终改用 DEP-1 |
| DEP-1 迟迟不交付 | 前端降级方案（TL-07），范围限定见 OD4 |
| 完成检测滞后于实际配置（PRD 风险） | 显示 loading 状态，不显示过期的 badge；系统 pin（F-04） |
| Taxonomy 在开发开始后改名或合并卡片（PRD 风险） | sprint 0 前锁定 OD1、OD3；卡片元数据只放在 TL-01 一处 |
| countdown 需要 storefront 支持，但 storefront 不在本仓库 | 把 countdown 开关的效果写进 P5；不支持时隐藏开关 |
| Figma 未开始，阻塞 UI 开发 | 先做第 5 节第 3 步的逻辑部分 |

## 7. 待确认项

### PRD 歧义（与 PRD owner 确认）

| 编号 | 问题 | PRD 引用 | 答复前的计划默认 | 阻塞 |
|---|---|---|---|---|
| P1 | GDE-03 要求进度“由账户状态驱动”。但第 1–4 屏在确认之前不写入账户，没有状态可推导。草稿存在本地是否可以？ | GDE-03 | 草稿和 `form` 步骤完成记录存在 `localStorage`，按项目和 run 区分；确认后改由账户状态驱动 | F-02、F-03、F-10 |
| P2 | “能力已配置”的定义是什么：有一个尚未结束的时段，还是曾经通过 guide 创建过 schedule？ | CARD-04、DEP-2 | 至少一个条目有尚未结束的时段 | TL-02 |
| P3 | 50 个条目无法原子写入。失败后回滚已写入的条目，是否满足“no partial write”？ | 边界情况“网络中断” | 接受“失败即回滚”的方案；回滚本身也失败时，列出未恢复的条目 | TL-03 |
| P4 | 原型中有 "Repeat this window" 开关，但没有对应的需求和验收标准。v1 是否包含？ | UX 第 2 屏 | v1 不显示 | TL-05 |
| P5 | Badge text 和 countdown 存在哪里：promotion、item 属性，还是 storefront 配置？ | TLO-06、UX 第 3 屏 | 确认之前这两个字段只出现在预览中，不写入 | TL-06 |
| P6 | overlap 中的 "group" 指 catalog item group 吗？discount 能否以 group 为目标？ | TLO-02、TLO-07 | 指 catalog item group；group 级 discount 能读到时才计入 | TL-07 |
| P7 | 条目原有的 `periods` 如何处理：替换，还是追加一个窗口？ | TLO-05 | 替换；第 1 屏的 "Visibility now" 显示原有时段 | TL-03 |
| P8 | 卡片 Live 后，"Open" 打开什么？schedule 管理页、guide，还是 catalog？ | CARD-04、TLO-08 | 打开 manage 视图（TL-16），可以编辑尚未开始的 schedule。不进入 guide，因为 foundation 对已完成的 run 会新建 run | TL-01、TL-16 |
| P9 | GDE-04 要求左侧导航对应项高亮。第 2–5 屏属于 "Items catalog"，但 guide 在 Get Started 路由下。需要高亮 "All items" 吗？ | GDE-04（Should） | 只显示面包屑，导航仍高亮 Get Started | F-10 |
| P10 | `periods` 已写成功、discount promotion 创建失败时，是回滚 schedule，还是保留 schedule 只重试 promotion？ | TLO-03（Should）、TLO-06 | 保留 schedule，只重试 promotion；页面写明 discount 尚未生效 | TL-03a |
| P11 | 所有窗口都到期后卡片回到 Available，之后再次排期变为 Live。这次是否再发一次 `qsg_feature_enabled`？ | KPI、Analytics | 每个项目只发一次（第一次变为 Live 时） | TL-11 |

### 交付与权限（与相关负责人确认）

| 编号 | 问题 | 阻塞 |
|---|---|---|
| C1 | Promotions discount 的创建 API：endpoint、payload（条目、百分比、时段）、是否支持 group，以及可用于幂等的名称或外部 id 字段。读取 API 能否返回每个 discount 的起止时间、目标条目和 group、折扣值 | TL-03a、TL-06、TL-07 |
| C2 | 在 admin PUT 上确认 `periods` 的结构 `{date_from, date_until}`（ISO-8601 带偏移，来自 `import-template.json:43-48`）；读取单个完整原始 item 的 endpoint；VC package 的 PUT 路径（`catalog.ts:658-664` 注明未经验证，可能在 /mapi 网关上）。后两项 spec 没有答案（spec 11:59 把 catalog API 列为未观测） | TL-02、TL-03、TL-15 |
| C3 | 在 tracking plan 中登记 8 个 `qsg_*` 事件、事件类型（et）和 exv 参数；NFR-01、NFR-02 的 p95 由谁测量 | TL-11 |
| C4 | Wave 1 用的 feature flag 名称、按账户开启的方式，以及由谁配置 | TL-12 |
| C5 | **已由 spec 回答：** 使用 `/${merchantId}/projects/${projectId}/storefront`（spec 11:15、`sell-virtual-goods/config.tsx:51`）。只剩一个问题：面包屑 "Items catalog / Schedule offers" 中的 "Items catalog" 是否链接到这个路径 | F-10 |
| C6 | `canWriteItems` 和 `canWritePromotions` 的判定方式：Viewer 怎么识别；`items_catalog_only_role`、`liveops_only_role` 分别对应哪一项；Promotions 属于 LiveOps 还是单独的 privilege | TL-10 |
| C7 | **已由 spec 回答：** 缺少的 key 回退到 `en.json`（spec 15 XPL-INFRA-006），不需要代码。只剩流程问题：本功能字符串放单独分支还是等 v2 翻译。与 Bundles C5 一并决定 | TL-13 |
