# 开发计划：Bundles Advanced feature（F2P 与 Premium PC）

- **来源 PRD：** [bundles-advanced-prd.md](bundles-advanced-prd.md)（Confluence：PRD - Bundles in F2P and Premium PC Business Accounts, Advanced feature）
- **相关计划：** Promotions Advanced 开发计划 revision 2。本 PRD 复用 Promotions PRD 定义的 gating、卡片状态和 guide 行为（PRD R4）。共享的 Advanced 部分只在任务 0.2 定义一次。
- **分支：** 待定
- **状态：** 草稿，revision 2。等待第 1 节的待决事项和第 7 节的待确认项。
- **Revision 2：** 按对照 PRD 的 review 修订。改动：第 4 步支持虚拟货币定价；写明第 2–4 步的检测局限；frame 保存后设系统 pin；verifier context 加 target SKU，status key 按 run 区分；区分 resume 与新 run；用快照捕获 target SKU；第 5 步改为可检测；补测试缺口；修正代码引用；调整任务顺序。

## 本计划范围

本计划**只交付 Free-to-play 账户**，代码在 `free-to-play-pc`。

- Premium PC 是独立仓库（`premium-pc-games`）。项目规则禁止本工作修改兄弟账户仓库。Premium PC 的交付需要单独的负责人和计划（C1）。
- Premium 专属内容（game key、DLC、soundtrack、edition，以及"key 用完后停售"提示）仍在 content model 里留出位置，由 Premium 团队填写。
- Catalog frames（D3）是本仓库之外的团队负责的 Catalog UI 组件（PRD Q18、R2）。本计划只负责**承载** frame 和实现 fallback，不开发 frame 本身。

## 0. 代码现状

Get Started 引擎的现状（单一 current setup、`SelectionScreen` 重定向、Skip 时 walk-past、进度存 `localStorage`）见 Promotions 计划第 0 节，这里同样适用。Bundle 相关现状如下：

| 领域 | 现状 | 影响 |
|---|---|---|
| Catalog 读取 | `core/apis/catalog.ts`：`listCatalogItemRefs`（GET `/v2/project/{id}/admin/items`，分页，返回 `{sku, name, type}`，:379-414）。`listCatalogItems`（同一路径的 POST，**不分页**，:540-546）返回 `type`、`bundleType`、`isPaid`、`isEnabled`、`isShownInStore`（:517-531）。 | 只有 `listCatalogItems` 提供 `bundleType`。currency package 的 `type` 也是 `'bundle'`（`bundle_type: 'virtual_currency_package'`），不能算作 bundle。 |
| 价格读取 | `isPaid` 只统计带 `currency` 的 real-money `prices` 行（`isLivePriceRow` :471-480，`priceRowsOf` :491-497）。`vc_prices` 和 `is_free` 没有暴露。 | 只用虚拟货币定价的 bundle 会被读成"未定价"。第 4 步需要在 read model 里加入 `vc_prices` 和 `is_free`。 |
| Bundle 结构 | `BundlePayload`（:158-196）：`prices` 为空时必须带 `is_free`，否则返回 422（:9-14、:175）；另有 `content`、`vc_prices`、`periods`、`limits.per_user`。`normalizeCatalogItem` 丢弃了 `content`、`periods` 和 `limits`。 | 已保存的 bundle 一定有价格或 `is_free`。contents、limits 和 display period 需要新的读取。 |
| Catalog 写入 | `createBundle` / `updateBundle` 存在（:680-699），但**没有调用方**。bundle UI 已在 commit `3d632571b` 中移除。 | guide 不写 bundle。写入由 frame 或完整的 Catalog 页面完成（D3-FR3）。 |
| 步骤内创建 item | `sell-virtual-goods/ItemCatalogStep.tsx` 在步骤内渲染自己的 React `CreateItemForm`，不是 remote module。 | 在 item frame 就绪前，可作为第 1 步"Create items now"的候选方案（P2）。 |
| 步骤内嵌 UI | 步骤通过 `WizardStep.Component` 渲染（`setup-wizard/types.ts:268`）。`pages/GetStarted` 下没有使用 `RemoteModule`。 | 在步骤内承载 frame 是新工作（任务 3.1）。 |
| 保存后的步骤状态 | `markDone` 设置 pin（`setStepDone`），并且有意**不**刷新，因为后端可能还没反映新 item（`useSetupStatus.ts:240-246`）。pin 保留 `PIN_ROUNDS = 2` 轮（`getStartedStatus.ts:22-31`）。verifier 在 `STATUS_TTL_MS = 30_000` 后重跑。 | 保存后立刻强制刷新可能读到 `false`。改用系统 pin 加有上限的重试（任务 2.6）。 |
| Verifier context | `StepVerifier` 的 ctx 只有 `merchantId`、`projectId`、`storeDomain`、`campaignId`（`types.ts:134-152`）。`campaignId` 通过 ref 传给 `runFetch`（`useSetupStatus.ts:150-154`）。status key 是 `${projectId}:${setupId}`（`getStartedStatus.ts:89`）。 | target bundle SKU 和 run id 需要新的 ctx 字段和 key 字段（任务 2.5）。 |
| 步骤引擎 | 没有 `optional` 标记。Skip 会绕过该步骤的 `beforeNext` handler（`types.ts:52-54`）。没有 `verify` 的步骤，在 Next 或 Skip 时由 `SetupScreen.tsx:476-477` 标记为 passed。没有双路径步骤类型。没有"I've done this"确认。 | 引擎扩展见任务 0.2（与 Promotions 共享）。PRD Q11 的答案：需要框架改造。 |
| Verifiers | `verifyItemCatalog`（`setups/shared-verifiers.ts:48-51`）对**任何** catalog 条目返回 true，包括 bundle。没有 bundle verifier。 | 第 1 步需要自己的 verifier（任务 2.5）。 |
| Get Started 路由 | `routes/inside/get-started.ts:14-19`：`/get-started` 和 `/get-started/:setupId`，都是 `exact`。 | guide 和 manage 路由需要新增（任务 0.2）。 |
| Bundles 路由 | 没有 Bundles 导航项。`/storefront/bundles` 是 `storefront` remote 的子路由（`nav-items-config.tsx:47-51`，"All items" 的 active path）。 | frame fallback 和 "Manage bundles" 的目标地址：`/projects/${projectId}/storefront/bundles`。 |
| 权限 | `/storefront` 要求 `store_virtual_currency_get_list`、`store_virtual_item_get_by_sku`、`game_delivery_get_games`、`project_settings`（`routes/inside/storefront.ts:5-11`）。`src` 中没有 bundle 专用权限。 | frame 访问控制（D3-FR6）需要 Catalog 权限名（C3）。 |
| Advanced 列表 | 还没有 Advanced 列表、卡片或 guide。也没有 Promotions 或 Regional restrictions 卡片。 | 如果 Bundles 先上线，由它搭建共享的 Advanced 部分（任务 0.2）。 |
| 账户变体 | 本仓库内没有 F2P/Premium 切换。 | 文案变体放在 content model 中，每个仓库一个变体。 |

## 1. 待决事项（阻塞开发）

| 编号 | 待决事项 | 阻塞 |
|---|---|---|
| Q4 | 有哪些 Catalog frame；在 bundle 流程的哪个阶段能打开（details 能否单独保存）；会发出哪些事件（带 SKU 和阶段的 "saved"） | 3.1、3.2、2.4、2.6 |
| Q5 | frame 未就绪时，v1 能否只用 fallback 到完整 Catalog 页面？ | 3.3、发布范围 |
| Q6 | 卡片何时为 Live：有一个 active bundle，还是有任意 bundle？bundle 是否有 active 状态？ | 1.2 |
| Q7 | "初始 setup 完成"的定义，与 Promotions 相同（Promotions Q5） | 1.3 |
| Q8 | 初始 setup 完成前显示 Blocked 还是不显示，与 Promotions Q10 相同 | 1.3 |
| Q9 | Taxonomy 条目：名称、描述、产品负责人、位置 | 1.1 |
| Q10 | 第 1 步要求至少几个 catalog item：一个，还是两个以上？ | 2.5 |
| Q12 | frame 支持哪些管理操作；删除时已购买或已在购物车的 bundle 如何处理 | 2.8 |
| Q13 | guide 中是否保留 regional prices、limits 和 display period | 2.4（第 4、5 步） |
| Q16 | 新 bundle 会自动出现在 storefront，还是需要伙伴添加区块？ | 第 6 步文案 |
| Q18 | guide 内的 frame 由谁负责，开发人力如何分配 | 3.* |
| Q19 | 框架复用、进度按项目还是按用户、文案审批，与 Promotions 对齐 | 0.2、2.7 |
| R1 | Capability taxonomy 签字（sprint 0 阻塞项） | 1.* |
| R3 | Catalog 的运行时信号（item 存在、bundle 已保存、有 contents、已定价） | 1.2、2.2、2.5 |
| P1–P9、C1–C5 | 待确认项，见第 7 节 | 见第 7 节 |

Q14、Q15 和 Q17 是 Premium PC 的问题，不阻塞 F2P，交给 C1。

## 2. 按交付物拆分的任务

### 共享部分（与 Promotions 共用）

0.1 **共享库。** 逐项决定是否放入 `business-account-shared-library`：卡片状态规则、Catalog 读取扩展、guide content model、frame host。只有 Premium PC 会用到时才放（C1）。
0.2 **Advanced 基础设施。** 为 Promotions、Bundles 和 Regional restrictions 只建一次。如果 Promotions 计划已交付某项，直接复用：
   - `ADVANCED_GUIDES` 注册表，与 `SETUPS` 分开。这样 "Start with" 网格和 resume 重定向保持不变。
   - 路由：`get-started/advanced/:guideId` 和 `get-started/advanced/:guideId/manage`，在 `routes/inside/get-started.ts` 中与 `exact` setup 路由并列声明。guide 页面复用 `SetupHub` / `SetupWizard` 的部件，但不使用 `useTrackCurrentSetup`。
   - `AdvancedList` 组件及其挂载位置（Promotions P1）。
   - "初始 setup 完成"规则和 Blocked / Available 状态（所有 Advanced 卡片共用一条规则，PRD D1-FR7）。Blocked 与 Live 的优先级见 P7。
   - 按项目和 guide 独立的 `advancedGuides` 状态，不修改 `currentSetupId`。
   - Verifier context 和 status key：在 `StepVerifier` ctx 中加可选的 `target` 字段（各 guide 自定义，例如 `{sku}`），像 `campaignId` 一样通过 ref 传入。Advanced guide 的 status key 带上 run id：`${projectId}:${guideId}:${runId}`。这样新 run 不会读到旧 run 缓存的结果或 pin。
   - 引擎扩展：
     - **可选步骤：** 跳过计为完成，且可随时重新打开（D2-FR7）。
     - **双路径：** 伙伴选一条路径，guide 只显示该路径的说明，另一条仍可选（D2-FR6）。
     - **确认：** 带 "I've done this" 控件的步骤，只有伙伴确认后才完成。Next 和 Skip 都不会完成它（D2-FR5）。
     - **系统 pin：** 一个由可信事件（frame "saved"）设置步骤 pin 的 API，复用 `setStepDone` 和 `PIN_ROUNDS`。伙伴不能设置。
   - 浮动 widget 支持 Advanced guide（D2-FR11）。多个 guide 未完成时显示哪个，见 P5。

### D1：Bundles 卡片

1.1 **注册条目。** 在 `ADVANCED_GUIDES` 中添加 Bundles 条目：名称、一到两句描述、账户示例（F2P：item 和 currency package）、在 Promotions 和 Regional restrictions 旁的顺序（D1-FR1、D1-FR3、Q9）。依赖 guide config 骨架（2.1）。
1.2 **Live 状态。** 项目中至少有一个 bundle 满足 Q6 规则时为 Live。建议的 `listCatalogItems` 信号：`type === 'bundle'`；`bundleType` 不是 `virtual_currency_package`，也不是 `partner_side_content`（dynamic bundle，不在范围内）；`isEnabled`。状态只来自账户数据（D1-FR4）。排除规则见 P3 和 P8。
1.3 **Blocked / Available。** 使用 0.2 的共享规则（D1-FR7）。Blocked 卡片写出未完成的 setup 名称并链接过去。它不能启动 guide，也不能打开管理页。初始 setup 完成后，下一次页面加载时变为 Available（D1-FR8）。在 P7 有结论前，Blocked 优先于 Live。
1.4 **卡片 UI。** 带文字标签的状态 badge 和一个主按钮（D1-FR2）：
   - Live："Open" 进入 **Manage bundles** 路由（D1-FR5）。次要链接取决于 guide run（2.10）：run 未完成时显示 "Resume guide"；上一个 run 已完成或没有 run 时显示 "View guide"（从第 1 步开新 run）。行为见 P9。
   - Available："Set up" 启动 guide，并 resume 到当前步骤（D1-FR6）。
   - Blocked：按钮禁用，并显示未完成 setup 的名称和链接。

### D2：Bundles guide

2.1 **Guide config。** 新增 `advanced/bundles/config.tsx`（"Build and manage bundles"），注册到 `ADVANCED_GUIDES`，挂在 0.2 的 guide 路由上（D2-FR1）。
2.2 **Catalog 读取扩展。** 在 `core/apis/catalog.ts` 中，只读：
   - read model 增加 `isFree`、`hasVcPrice`（`vc_prices` 非空）、content 数量、`hasLimit`（设置了 `limits.per_user`）和 `hasPeriod`（`periods` 非空）。如果列表接口不返回这些字段，新增按 SKU 读取单个 bundle 的接口。
   - 确认不分页的 POST `listCatalogItems` 在大目录下能返回全部 item。如果不能，改为分页，或让 Live 规则和第 1 步改用带 `bundle_type` 的分页读取。
   - verifier 中不得调用 `createBundle`、`updateBundle` 或任何 `ensure*` helper。
2.3 **Overview 页面。** 目标、步骤数（自动计算）、"before you start" 清单：要包含的 item、价格和币种、可选的限制，以及"bundle 不能为空""bundle 不能包含自身"两条规则（D2-FR2）。
2.4 **步骤。** 按 D2-FR13 到 D2-FR18 定义六步：

   | 步骤 | 类型 | 完成条件 | 内嵌 UI（D3） | Fallback（D3-FR7） |
   |---|---|---|---|---|
   | 1 Prepare items and groups | 双路径："I have items" / "Create items now" | 至少有 N 个非 bundle 的 catalog item（N 见 Q10） | Group 和 item frame | `/storefront` |
   | 2 Describe the bundle | 可检测 | target bundle 存在（2.7） | Bundle 创建 frame（details） | `/storefront/bundles` |
   | 3 Choose the contents | 可检测 | target bundle 的 content 数量 ≥ 1 | Bundle frame（contents） | `/storefront/bundles` |
   | 4 Set the price | 可检测 | target bundle 有 real 价格、虚拟货币价格或 `is_free`（Q13） | Bundle frame（price） | `/storefront/bundles` |
   | 5 Limits and display period | **可选**，可检测 | target bundle `hasLimit` 或 `hasPeriod`，或已跳过 | Bundle frame（limits） | `/storefront/bundles` |
   | 6 Check it in your store | 确认 | 伙伴确认（Q16） | 无；按钮跳转 storefront | — |

   **第 2–4 步的检测局限。** 已保存的 bundle 一定带价格或 `is_free`（API 拒绝两者都没有的请求），Catalog 也禁止空 bundle（D3-FR3）。因此只看数据，第 2 步完成时第 3、4 步也同时完成。计划默认方案（P6）：如果 frame 能分阶段保存并发出阶段事件，第 3、4 步通过系统 pin 使用该事件。否则第 2–4 步一起完成，guide 进入第 5 步，第 3、4 步仍可重新打开查看 contents 和价格。这改变了 D2-FR4 的逐步推进，需要 PRD owner 签字。

   伙伴不能手动把可检测步骤标为完成（D2-FR4）。步骤文案通过 content model 按账户切换（D2-FR12）。第 3 步的 Premium key 库存提示是留给 C1 的内容位置。
2.5 **Verifiers。** 新增 `advanced/bundles/verifiers.ts`：
   - `verifyBundleSourceItems`：统计 `listCatalogItems` 中非 bundle 的条目；currency package（`bundle_type: 'virtual_currency_package'`）算作 item。**不要**复用 `verifyItemCatalog`，它也会统计 bundle。
   - `verifyTargetBundleSaved`、`verifyTargetBundleContents`、`verifyTargetBundlePrice`、`verifyTargetBundleLimits`：从 `ctx.target.sku`（0.2）读取 **target bundle**，不读"任意 bundle"。还没有 target 时返回 `false`。
2.6 **保存后重新判定。** 步骤状态无需刷新页面即可更新（D3-FR4），按以下顺序：
   - 收到 frame 的 "saved" 事件（带 SKU，若 Q4 提供则还带阶段）：先为对应步骤设系统 pin（0.2），再做有上限的重试（例如约 10 秒内重试 3 次），重试绕过 `STATUS_TTL_MS`。pin 用于应对后端尚未更新的情况，避免步骤跳回"待办"。
   - 伙伴从 fallback 页面返回时（路由切回 guide，或窗口重新获得焦点）：强制重新检查一次。
   - 每次页面加载时（D2-FR4）。
   没有 frame 事件时，步骤在返回或聚焦时更新，不是即时更新。这一缺口见 P4。
2.7 **进度状态与 target bundle。** `advancedGuides` 中保存：run id、第 1 步选择的路径、target bundle SKU、已跳过的可选步骤、确认记录。存储方式按 Q19 决定（与 Promotions P2 的答案一致）。存储结构要带版本号。
   guide 按以下方式捕获 target SKU（P1）：
   - 第 2 步打开时，把项目现有的 bundle SKU 快照存入当前 run。
   - 有 frame 时：从 "saved" 事件中取 SKU。
   - fallback 模式：伙伴返回后，target 是**不在**快照中的 bundle SKU。如果新 SKU 不止一个，伙伴从这些**新** SKU 的短列表中选一个。run 开始前就有的 bundle 永远不会出现在列表里，所以已完成的旧 bundle 不会让第 2–4 步直接完成。
2.8 **Manage bundles 区域。** 挂在 0.2 的 manage 路由上，内嵌 bundle 列表 frame：打开某个 bundle 修改 contents、价格、limits 和 display period，或删除 bundle（D2-FR19、D2-FR20）。可从成功页和 Live 卡片进入。Fallback：跳转 `/storefront/bundles` 的按钮。可用操作按 Q12 决定。
2.9 **完成。** 成功页写出 target bundle 的名称，说明 bundles 已上线，并提供 "Manage bundles" 和下一个推荐能力（D2-FR9）。卡片根据账户数据变为 Live（D2-FR10）。当前 run 标记为完成。
2.10 **Resume 与新 run。** 从卡片、widget 或链接打开 guide 时，只要当前 run 未完成，就 resume 当前 run（D1-FR6、D2-FR8）。只有上一个 run 已完成、且伙伴点了 "View guide"，才开新 run：新 run id，target 为空，第 1 步的条件仍满足时保持完成（D2-US13）。Live 卡片永远不会丢弃未完成的 run。
2.11 **浮动 widget。** 当前 run 有未完成步骤时，显示能力名称、当前步骤标签、"Go to step" 和 "View full guide"（D2-FR11），使用 0.2 的共享 widget 支持。
2.12 **文案与 locale。** key 放在 `host.pages.getStarted.advanced.bundles.*`，只改 `src/locales/en.json`：卡片、overview、步骤、路径、提示、确认、成功页、管理页、fallback、target 选择和无权限文案。NFR 要求首版只有英文；是否暂缓 Smartcat export 见 C5。

### D3：Catalog frames（承载与 fallback）

3.1 **Frame host。** 新增 `CatalogFrame` 组件，在步骤面板内渲染 Catalog frame：
   - 通过 `@accounts-sdk/platform-shell/remote-module` 的 `RemoteModule` 加载。`name` 必须等于后端 `module_id`。如果 container global 与 scope 不同，使用 `containerMapping`。frame 有内部 router 时，传 `pathname={match.url}`，**不要**再包 `withAccountBasename()`（见 `CLAUDE.md` Gotchas）。
   - 传入账户的 theme 和语言，宽度适配步骤面板（D3-FR5）。
   - 监听 frame 的 "saved" 事件，把 SKU 和阶段交给 2.6 和 2.7（D3-FR4）。
   - frame id、`module_id` 和事件约定来自 Q4 和 C4。
3.2 **每步对应的 frame。** 把 2.4 的每一步映射到对应的 frame id：group、item / currency package、bundle 创建（details、contents、price、limits）、bundle 列表与编辑（D3-FR2）。
3.3 **Fallback。** frame 不可用、加载失败，或 **5 秒**内未加载完成时，显示一个按钮，打开同一操作的完整内嵌 Catalog 页面（D3-FR7、NFR Reliability）。frame 失败永远不会阻塞 guide。如果 Q5 接受 v1 只用 fallback，就只交付 3.3，不做 3.1 和 3.2；此时 2.7 用快照捕获 target。
3.4 **访问控制。** 没有 Catalog 权限的用户看到步骤文字，但看不到 frame，并显示一条提示（D3-FR6）。按 Catalog 权限名控制（C3）。操作级别的权限由 frame 自己控制。
3.5 **不在本地实现业务规则。** 校验（bundle 不能为空、不能包含自身）和保存逻辑留在 frame 和 Catalog 页面内（D3-FR3、D3-FR8）。guide 不重新实现这些规则。例外见 P2。

### 横切任务

4.1 **埋点。** card button click、guide opened、step started、frame saved、step skipped、guide completed 六个事件，带 capability id、step、card state、account variant 和 timestamp（NFR）。事件名和字段以 tracking plan 为准（C2）。通过 `setup-wizard/guideAnalytics.ts` 发送。
4.2 **无障碍。** badge 和步骤状态带文字标签。frame、fallback 和按钮支持键盘操作，并有描述性标签。WCAG 2.1 AA。
4.3 **Admin 视图。** Xsolla 内部 admin 看到与伙伴相同的卡片和 guide，并标注为面向伙伴的视图（NFR）。
4.4 **性能。** 卡片和 guide 在 3 秒内可交互。每次页面加载只取一次卡片状态。frame 按打开的步骤懒加载。在 stage 上对比 frame 与 Publisher Account 中同一 Catalog 页面的加载时间（NFR"无明显退化"）。
4.5 **布局。** 在 1366x768 和 13 英寸 Mac 上检查卡片、guide、frame 和 widget。
4.6 **向后兼容。** guide 只读取 catalog 数据。写入发生在 frame 或 Catalog 页面中。现有 bundle 和 catalog 数据保持不变（退出标准）。

## 3. 测试计划（先写测试，只在用户要求时运行）

按项目规则，测试先于代码编写，但除非用户要求，**不运行**。

| 层级 | 测试目标 |
|---|---|
| Unit | Live 规则排除 currency package、dynamic bundle 和禁用的 bundle；第 1 步 verifier 忽略 bundle；第 2–5 步只读 target bundle，没有 target 时返回 `false`；第 4 步在 real 价格、**仅 VC 价格**和 `is_free` 三种情况下都算完成；第 5 步在有 limit、有 period 或已跳过时算完成；Next 和 Skip 不会完成确认步骤；快照捕获只选新 SKU |
| Component | 各状态的卡片：Live 的 "Open" → Manage bundles；"Resume guide" 与 "View guide"；Blocked 卡片写出并链接未完成的 setup；overview 内容；第 1 步路径切换；多个新 SKU 时的 target 选择；带 "Manage bundles" 的成功页；Manage bundles 的 frame 模式和 fallback 模式；无权限提示；浮动 widget 内容（D2-FR11） |
| Frame host | "saved" 事件设系统 pin 和 target SKU；**后端滞后**：重试仍读到 `false` 时步骤保持完成；加载失败和超过 5 秒时显示 fallback 按钮；每步的 fallback 链接正确 |
| State | 打开 guide 不改变 `currentSetupId`；初始 setup 完成后下一次加载 Blocked → Available；未完成的 run 能从卡片、widget 和链接 resume；Live 卡片不重置未完成的 run；新 run 看不到旧 run 的 status 或 pin |
| Analytics | 每个 NFR 事件都带齐所需字段 |
| Locale | 加入新 key 后 `locales/index.test.ts` 仍通过 |
| E2E（可选，按需启用） | fallback 模式下 guide 端到端；Q4 关闭后再覆盖 frame 模式 |

尚未实现的未来行为（frame 事件、R3 关闭前的真实 Live 信号、store check 自动检测）按项目 placeholder 规则写成 skipped test，并写明启用条件。

### 退出标准 → 验证手段

| PRD 退出标准 | 本计划的验证手段（F2P） |
|---|---|
| guide 端到端走通，bundle 经 store 中的测试购买确认 | 在 stage 上手动走一遍并做真实测试购买；记录在 MR 的 "Stage verification" 一节 |
| 没有 item 的伙伴走完 guide，并在 guide 内创建 item 和 group | 在 stage 新项目上通过第 1 步 "Create items now" 走一遍（依赖 P2 / Q4） |
| 初始 setup 完成前显示 Blocked，完成后立即变为 Available | State 测试加 stage 检查 |
| guide 完成后卡片无需手动操作即变为 Live | Live 规则的 unit test 加 stage 走查；依赖 Q6 和 R3 |
| 伙伴在 guide 的 Manage bundles 中编辑并删除 bundle | 在 stage 上走查 2.8；依赖 Q12（fallback 模式下操作在 Catalog 页面完成） |
| 现有 bundle 和 catalog 数据保持不变 | 在已有 bundle 的项目上，于 stage 前后对比检查（4.6） |
| Q4、Q6、Q7、Q8、Q9 关闭；taxonomy 已签字 | 相关任务开始前解决第 1 节 |
| Premium PC 账户满足同样标准 | 本计划不覆盖；见 C1 |

## 4. 合并前验证

- 本地 `pnpm dev:stage` **不算** MR 的验证（`CLAUDE.md`）。
- MR 需要 stage 验证：`pnpm release` 发到 stage，再预览该 tag，并填写 "Stage verification" 一节。
- release 和 merge 由用户负责（项目 memory），本计划不包含这两步。

## 5. 建议顺序

1. 解决第 1 节和第 7 节。先处理 Q4、Q5、C4 和 P6：它们决定用 frame 还是只用 fallback，以及第 2–4 步如何推进。
2. 共享的 Advanced 基础设施（0.2），包括 guide 和 manage 路由骨架（如果 Promotions 还没交付）。
3. Catalog 读取扩展（2.2），以及 1.2、2.5、2.6、2.7、2.10 的测试。
4. Guide config 骨架（2.1）和 Manage bundles 路由（2.8 骨架）。
5. D1 卡片（1.1 到 1.4）。
6. fallback 模式下的 D2 guide（2.3 到 2.12，加 3.3 和 3.4）。
7. frame 和事件可用后做 D3 frames（3.1、3.2）。
8. 横切任务（4.1 到 4.6）。
9. Stage 验证和 MR（release 由用户负责）。

## 6. 风险

| 风险 | 缓解措施 |
|---|---|
| Catalog frames 被 IGS 阻塞（R2） | 如果 Q5 接受，先上 fallback 模式（3.3）。frame host（3.1）之后接入，无需改动步骤。 |
| frame 没有 "saved" 事件（Q4） | 在返回和聚焦时重新判定（2.6）。即时更新状态（D3-FR4）要等事件可用。记录为缺口。 |
| frame 保存后后端尚未更新 | 系统 pin 加有上限的重试（2.6），复用 `PIN_ROUNDS`。 |
| 只看数据时第 2–4 步同时完成 | 有 frame 阶段事件就用事件；否则用 P6 的默认方案，并请 PRD owner 签字。 |
| 第 2–4 步读到"任意 bundle"或旧 run 的数据 | 每个 run 记录 target SKU（2.7），使用 `ctx.target` 和按 run 区分的 status key（0.2）。 |
| guide 进行中卡片变为 Live，导致进度丢失 | Resume 与新 run 规则（2.10）。 |
| currency package 或 dynamic bundle 被算作 bundle | 在 Live 规则和第 1 步 verifier 中排除这两类。 |
| 只用 VC 定价的 bundle 永远完成不了第 4 步 | read model 加 `hasVcPrice`（2.2）。 |
| 运行时信号未确认（R3） | contents、free 状态、VC 价格、limits 和 periods 需要新的读取（2.2）。任何静态或手动的降级方案都要先经产品签字，不能默认上线。 |
| Advanced 行为与 Promotions 不一致（R4） | 在 0.2 中统一实现。 |
| 与 Regional prices、Purchase limits、Time-limited offers 重叠（Q13） | 只保留 bundle 自身的字段；第 5 步保持可选。 |
| Premium PC 没有与 F2P 同步交付 | C1 指定负责人和计划。content model 中保留 Premium 内容位置。 |
| Taxonomy 签字延期（R1） | 先做不依赖它的 0.2 和 2.2。 |

## 7. 待确认项

### PRD 歧义（与 PRD owner 确认）

| 编号 | 问题 | PRD 引用 | 答复前的计划默认 | 阻塞 |
|---|---|---|---|---|
| P1 | 第 2–4 步针对同一个 bundle。guide 如何知道是哪一个？ | D2-FR14–16、D2-US13 | 有 frame 时取事件中的 SKU；fallback 模式下取第 2 步打开后新出现的 bundle（2.7） | 2.5、2.7 |
| P2 | item frame 就绪前，第 1 步 "Create items now" 能否复用 Get Started 现有的 `CreateItemForm`（virtual item 和 currency），还是只能用 fallback 页面？ | D2-US4、D3-FR3、Q5 | 只用 fallback 页面（严格遵守 D3-FR3） | 2.4、退出标准 2 |
| P3 | 判定 Live 时是否排除 currency package（`bundle_type: 'virtual_currency_package'`）？bundle 是否还必须在 store 中显示？ | D1-FR4、Q6 | 排除 currency package；只要求 `isEnabled` | 1.2 |
| P4 | 如果 frame 不发 "saved" 事件，"伙伴返回或重新聚焦时更新步骤"是否满足 D3-FR4？ | D3-FR4、D2-FR4、Q4 | v1 接受，记录为缺口 | 2.6 |
| P5 | 最多三个 Advanced guide 加初始 setup 都未完成时，浮动 widget 显示哪一个？ | D2-FR11、Q19 | 与 Promotions P4 相同：先显示初始 setup，再显示最近打开的 Advanced guide | 0.2 |
| P6 | 已保存的 bundle 已有 contents 和价格或 free 状态，只看数据无法区分第 2–4 步。frame 不提供阶段事件时，这三步能否同时完成？ | D2-FR4、D2-FR14–16、Q4 | 可以，第 3、4 步保留可重新打开查看（2.4） | 2.4、2.6 |
| P7 | 伙伴已有 bundle，但初始 setup 没做完。卡片显示 Blocked 还是 Live？ | D1-FR4、D1-FR7 | Blocked | 1.3 |
| P8 | dynamic bundle（`bundle_type: 'partner_side_content'`）是否算 Live？如果 "As Is" 的 frame 允许伙伴在第 2 步创建它，它没有 contents，第 3 步永远完成不了。 | D1-FR4、范围外 "Dynamic bundles" | 不计入 Live，也不作为 target；guide 提示 dynamic bundle 不在范围内 | 1.2、2.7 |
| P9 | 有任意 bundle 时卡片就变 Live（D1-FR4），但 D2-FR10 把 Live 与 guide 完成挂钩。Live 卡片上的 "View guide" 是从第 1 步开始（D1-FR5），还是 resume 未完成的 run（D2-FR8）？ | D1-FR4、D1-FR5、D2-FR8、D2-FR10 | Live 来自数据；run 未完成时显示 "Resume guide"，否则 "View guide" 从第 1 步开始（2.10） | 1.4、2.10 |

### 交付与权限（与账户负责人和 Catalog 负责人确认）

| 编号 | 问题 | 阻塞 |
|---|---|---|
| C1 | 谁交付 Premium PC（`premium-pc-games`）？谁回答 Q14、Q15、Q17？ | Premium 的退出标准 |
| C2 | 六个 NFR 事件在 tracking plan 中的条目及字段名 | 4.1 |
| C3 | 控制 frame 和无权限提示所用的 Catalog 权限名 | 3.4 |
| C4 | frame 交付细节：负责人（Q18）、`module_id`、container scope、frame id、事件约定（SKU 和阶段）、时间表 | 3.1、3.2 |
| C5 | NFR 要求首版只有英文，但 Smartcat 流程会把 `en.json` 的新 key 翻译成 8 种语言。本功能是暂缓 export，还是随翻译一起上线？ | 2.12 |
