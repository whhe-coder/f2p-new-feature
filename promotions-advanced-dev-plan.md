# 开发计划：Promotions Advanced feature（F2P 与 Premium PC）

- **来源 PRD：** [promotions-advanced-prd.md](promotions-advanced-prd.md)（Confluence：PRD - Promotions in F2P and Premium PC Business Accounts, Advanced feature）
- **分支：** `feat/new-feature-prd`
- **状态：** 草稿，revision 2。等待第 1 节的待决事项和第 7 节的待确认项。
- **Revision 2：** 按对照 PRD 的 review 修订。改动：按账户仓库拆分范围；Advanced 列表的位置；初始 setup 与 Advanced guide 分开存状态；显式的步骤确认；overview 页面；"View guide" 链接；D1 的权限缺口；埋点的数据来源；退出标准到验证手段的对照。

## 本计划范围

本计划**只交付 Free-to-play 账户**，代码在 `free-to-play-pc`。

PRD 覆盖两个账户。Premium PC 是独立仓库（`premium-pc-games`），有自己的 `src/pages/GetStarted` 和 sidebar 配置。项目规则禁止本工作修改兄弟账户仓库。因此：

- Premium PC 的交付需要单独的负责人和计划（见第 7 节 C1）。
- 两个账户可共享的部分放入 `business-account-shared-library`，再引入回来。候选：卡片状态规则、promotions 读取 client、guide content model（任务 0.1）。
- PRD 的退出标准要求"每个账户"都满足。本计划只对 F2P 满足。Premium PC 的签字取决于 C1。

## 0. 代码现状

| 领域 | 现状 | 影响 |
|---|---|---|
| Get Started 注册表 | `src/pages/GetStarted/setups/index.ts` 中的 `SETUPS`（3 条起步路径）。`setup-wizard/types.ts` 中的 `SetupPathId` 是封闭的 union。`SetupSelection.tsx:29` 会在 "Start with" 网格中渲染所有非 `hidden` 的 `SETUPS` 条目。 | **不要**把 guide 注册进 `SETUPS`。加进去会出现在 "Start with" 中（违反 D2-FR1）；标成 `hidden` 又会被 widget 和 resume 逻辑跳过（违反 D3-FR10）。使用独立的 `ADVANCED_GUIDES` 注册表。 |
| 选择页 | 项目有 `currentSetupId` 时，`selection/SelectionScreen.tsx:27-31` 会重定向到当前 setup 的 hub。只有 `?switch=1` 才显示选择页。 | 完成初始 setup 的伙伴永远看不到这个页面。Advanced 列表不能**只**放在这里（任务 2.4）。 |
| 当前 setup | `SetupScreen` 打开某个 setup 时，`useTrackCurrentSetup.ts:20` 会 dispatch `setCurrentSetup`。`useSetupProgress` 只读这一个 id，它供给 `SetupGuideWidget`、`SetupProgressBadge` 和 `resolveEntry`。 | 项目只跟踪一个当前 setup。如果 promotions guide 原样走 `SetupScreen`，会在 widget、badge 和 "Get started" 入口中替换掉初始 setup。guide 需要自己的状态（任务 3.4）。 |
| 步骤完成 | `verify` 步骤由后端判定（`useSetupStatus`）。没有 `verify` 的步骤在 Next **或 Skip** 时被标记为 passed（`SetupScreen.tsx:476-477`，`markStepPassed`）。 | "走过"不等于"已确认"。D3-FR5 需要显式的确认状态（任务 3.2）。 |
| 进度存储 | `getStartedLocal` 写入 `localStorage`（`getStartedLocal.ts:201`），用 `SCHEMA_VERSION` 做版本控制。 | 进度只存在于一个浏览器中。D3-FR7（按项目持久化，从任意位置 resume）需要共享存储（Q14、C2）。 |
| Setup content model | `SetupConfig` 有 `setupItemIds`（"What you'll set up"）、`analytics`（只有 Metrika 事件名）、`hidden`、完成页布局。 | 没有 overview 中 "before you start" 清单的字段（D3-FR2），埋点也没有卡片状态字段。 |
| Promotions API | `src/core/apis/` 中没有 promotions 或 discount 的 client。 | Live 状态和步骤检测需要新的只读 client（PRD R2）。 |
| Promotions 路由 | `src/routes/inside/storefront.ts:5-11` 把 `/storefront` 挂到 `layouts/storefront/index.tsx:63`，后者渲染 `RemoteModule name="storefront"`。Promotions 是该 remote 内部的子路由。 | D1 主要是验证，不是新建嵌入。 |
| Sidebar | `src/layouts/sidebar/project-sidebar-v2/nav-items-config.tsx:225-229` 的 LiveOps 分组中有 **Promotions** 项 → `/projects/${projectId}/storefront/promotions`。它**没有** `privileges`。`/storefront` 的路由守卫只检查 catalog、delivery 和 project-settings 权限。 | D1-FR5 和 D1-US4 存在权限缺口（任务 1.4）。 |
| 埋点 | guide 事件：`src/pages/GetStarted/setup-wizard/guideAnalytics.ts`。`selection/analytics.ts` 是 onboarding 表单的目标映射（`Record<SetupPathId, …>`）。 | 新字段需要 tracking plan 条目（任务 4.1）。如果 `SetupPathId` 保持封闭，`selection/analytics.ts` 无需修改。 |
| Locales | 只手工编辑 `src/locales/en.json`。 | 新文案写在这里，其余语言由 Smartcat 填充。 |

## 1. 待决事项（阻塞开发）

以下来自 PRD 的 open questions 和第 7 节。每一项都会改变代码，必须在它阻塞的任务开始前解决。

| 编号 | 待决事项 | 阻塞 |
|---|---|---|
| Q4 | 卡片何时为 **Live**：有该类型的 active promotion，还是账户级开关？ | 2.2 |
| Q5 | 什么算 **初始 setup 完成**？ | 2.3 |
| Q10 | setup 完成前卡片显示 Blocked 还是隐藏 | 2.3 |
| Q6 | bonus promotion 归在哪张卡下（还是第三张卡） | 2.1、3.1 |
| Q7 | 在卡片选择上，F2P 是否就是 "Live-service PC" 变体？ | 2.1 |
| Q14 | guide 进度按项目还是按用户，存在哪里 | 3.4 |
| Q15 | v1 是否接受由伙伴确认的测试步骤？ | 3.2 |
| Q16 | 是否复用 Quick-Start 框架，谁审批文案 | 3.* |
| R1 | Capability taxonomy 签字（sprint 0 阻塞项） | 2.* |
| R2 | Promotions 列表 endpoint，以及没有它时的降级行为 | 2.2、3.3 |
| P1–P5、C1–C3 | 待确认项，见第 7 节 | 见第 7 节 |

## 2. 按交付物拆分的任务

### 共享部分

0.1 **共享库。** 逐项决定是否放入 `business-account-shared-library`：卡片状态规则（2.2、2.3）、promotions 读取 client（2.2）、guide content model（3.1）。只有 Premium PC 会用到时才放（C1），否则留在本仓库。

### D1：Promotions 区域（嵌入模块）

1.1 **验证现有路由。** `storefront` remote 承载 `/projects/:id/storefront/promotions`（`routes/inside/storefront.ts`、`layouts/storefront`）。确认该 remote 渲染的是 Publisher Account 的 Promotions 模块，且内部没有跳出账户的链接（PRD R3）。如果有链接跳出，记录为缺口，不要重写模块。
1.2 **已有 promotions。** 在 stage 上打开一个已在 Publisher Account 中有 promotions 的项目。确认嵌入区域中的状态、数值和兑换行为都没有变化（D1-FR3、退出标准）。
1.3 **Sidebar。** Promotions 项保留在 LiveOps 分组中。确认 F2P 账户的 `visibility` 和 `hidden` 设置正确。
1.4 **补齐权限缺口。** 给 `nav-items-config.tsx:225-229` 的导航项加上 Promotions 权限，使 `filter-accessible-nav-items` 对没有 Promotions 权限的用户隐藏它（D1-FR5）。`/storefront` 路由守卫要求 catalog 和 delivery 权限，所以只有 Promotions 权限的用户打不开该区域（违反 D1-US4）。给 promotions 子路由加上使用 Promotions 权限的独立守卫。权限名见 C3。更新 `rbac-contract.test.ts`。
1.5 **稳定地址。** 把 `/projects/${projectId}/storefront/promotions` 记为常量。卡片和 guide 步骤都链接到它（D1-FR6）。

### D2：Advanced 卡片

2.1 **注册表。** 新增 `ADVANCED_GUIDES`，包含卡片模型（`id`、名称、描述、账户示例、guide config），与 `SETUPS` 分开。这样 "Start with" 网格、onboarding 表单的目标映射和 resume 重定向都保持不变（D2-FR1）。
2.2 **Live 状态。** 在 `src/core/apis/promotions.ts` 中新增只读 client（按类型列出 active promotions）。通过 hook 暴露，例如 `useAdvancedCardState`。Q4 规则成立时为 Live。规则集中在一个模块中。
2.3 **Blocked / Available。** 新增"初始 setup 完成"规则（Q5）。它读取初始 setup 的状态，而不是 `currentSetupId`，因为打开 guide 不能改变判定结果。Blocked 卡片写出未完成的 setup 名称并链接过去（D2-FR7）。Blocked 卡片不能启动 guide，也不能打开 Promotions。初始 setup 完成后，下一次页面加载时变为 Available（D2-FR8）。不要复用按 setup 生效的 `requiredStepIds`。
2.4 **Advanced 列表位置。** 新建 `AdvancedList` 组件，挂在伙伴完成初始 setup 后能到达的位置。建议：初始 setup 的 hub 和完成页，以及 `?switch=1` 下的选择页。最终位置见 P1。
2.5 **卡片 UI。** 每张卡片显示名称、描述、状态 badge（Live / Available / Blocked，带文字标签）和一个主按钮（D2-FR2）：
   - Live："Open" 跳转到 1.5 的地址，次要的 **"View guide"** 链接重新打开 guide（D2-FR5、D3-FR9、D3-US7）。
   - Available："Set up" 启动 guide，并 resume 到当前步骤（D2-FR6）。
   - Blocked：按钮禁用，并显示未完成 setup 的名称和链接（D2-FR7）。
2.6 **账户变体。** 卡片文案来自 content model，不写在组件逻辑中（D2-FR9、D3-FR11）。本仓库提供 F2P 示例（virtual item、currency pack）。Premium PC 文案属于 C1。

### D3：Setup guides

3.1 **两份 guide config。** 新增 `advanced/promotions-discounts/config.tsx` 和 `advanced/promo-codes-coupons/config.tsx`，注册到 `ADVANCED_GUIDES`。挂在独立路由上（例如 `get-started/advanced/:guideId`）。复用引擎的展示部件（`SetupHub`、`SetupWizard`、步骤卡片）。**不要**经过 `SetupScreen` 的 `useTrackCurrentSetup`，使初始 setup 始终是当前 setup（D3-FR1）。
3.2 **Overview 页面（新增）。** 新增 overview 内容字段：目标、伙伴将完成的内容、"before you start" 清单。步骤数由步骤自动计算。第一次打开 guide 时进入此页；resume 时直接进入当前步骤（D3-FR2、D3-FR7）。
3.3 **步骤。** 按 PRD D3-FR12 到 D3-FR22 定义步骤。每个步骤属于以下两类之一：
   - **可检测**（`verify`）：只在列表 endpoint 能提供只读信号时使用（catalog item 存在、active promotion 存在、code 存在）。伙伴不能手动标为完成（D3-FR4）。
   - **需确认**：显示 "I've done this" 控件。只有伙伴确认后才算完成（D3-FR5）。Next 和 Skip 可以让伙伴继续往下走，但**永远不会**完成它。确认记录与 `markStepPassed` 分开存储。
   没有 "Done when" 的步骤属于哪一类，见 P3。只有在某步骤确实不能早于另一步骤完成时，才使用 `requiredStepIds`。
3.4 **Verifiers。** 每个 guide 新增一个 `verifiers.ts`。只使用列表 endpoint，不得调用任何 `ensure*` helper。
3.5 **进度状态。** 新增独立的 `advancedGuides` 状态，按项目和 guide 区分，保存选择的路径和已确认的步骤 id。它不修改 `currentSetupId`。存储方式按 Q14 和 P2 决定：D3-FR7 要求按项目保存、可从任意设备 resume，`localStorage` 做不到。如果 v1 时共享存储还没就绪，先用带新 schema 版本号的 `localStorage` 过渡，并在 MR 中列出跨设备的缺口。
3.6 **完成。** 成功页写出已设置的内容，说明该能力已上线，并推荐下一个能力（D3-FR8）。卡片根据账户数据变为 Live，无需手动操作（D3-FR9）。
3.7 **浮动 widget。** 扩展 `useSetupProgress` 和 `SetupGuideWidget`，使其也考虑未完成的 Advanced guide。显示能力名称、当前步骤标签、"Go to step" 和 "View full guide"（D3-FR10）。多个 guide 未完成时显示哪一个，见 P4。建议：初始 setup 未完成时优先显示它，之后显示最近打开的未完成 Advanced guide。`SetupProgressBadge` 和 `resolveEntry` 只继续报告初始 setup。
3.8 **双路径（code 类型步骤）。** 按 guide 保存选择的路径（3.5）。只显示所选路径的说明，另一条路径仍可选（D3-FR6）。
3.9 **文案与 locale。** key 放在 `host.pages.getStarted.advanced.promotionsDiscounts.*` 和 `...promoCodesCoupons.*` 下，只改 `src/locales/en.json`。包括 overview、卡片、步骤、确认、成功页和 `hub.*` 文案。
3.10 **样式。** 如果需要新的 accent，加在 `style.css` 中。

### 横切任务

4.1 **埋点。** PRD 要求的事件（card button click、guide opened、step button clicked、guide completed）需要带 capability id、step、card state、account variant 和 timestamp。`SetupConfig.analytics` 只有 Metrika 事件名；setup 没有 `analytics` 块时，引擎不发送任何事件。先从 tracking plan 取得事件名和字段（C2），再给 `ADVANCED_GUIDES` 加 analytics 块，并通过 `setup-wizard/guideAnalytics.ts` 发送额外字段。
4.2 **无障碍。** badge 和步骤状态带文字标签，不只靠颜色。按钮支持键盘操作，并有描述性标签。WCAG 2.1 AA（PRD NFR）。
4.3 **Admin 视图。** Xsolla 内部 admin 看到相同的卡片和 guide，并标注为面向伙伴的视图（PRD NFR）。目前 `useSetupProgress.ts:117` 直接放行 admin，没有任何标注。需要在卡片、guide 和 widget 上加标注。
4.4 **性能。** 卡片和 guide 页面在 3 秒内可交互。每次页面加载只取一次卡片状态。
4.5 **布局。** 在 1366x768 和 13 英寸 Mac 上检查卡片、guide 和 widget（PRD NFR）。
4.6 **过期数据。** 早期版本留下的 guide 进度不能破坏新步骤。新的 `advancedGuides` 存储要带版本号。

## 3. 测试计划（先写测试，只在用户要求时运行）

按项目规则，测试先于代码编写，但除非用户要求，**不运行**。

| 层级 | 测试目标 |
|---|---|
| Unit | 卡片状态规则（Live / Available / Blocked）；打开 guide 不改变"初始 setup 完成"规则（Q5）的结果；verifier 在 mock 列表响应下的结果；当前步骤逻辑；**Skip 和 Next 不会完成需确认的步骤**；所选路径能持久保存 |
| Component | 每个挂载位置（2.4）中的 `AdvancedList`；各状态下卡片的 badge、主按钮和 "View guide" 链接；Blocked 卡片写出并链接未完成的 setup；overview 页面内容；成功页；widget 显示能力名称、当前步骤、"Go to step"、"View full guide" |
| State | 打开 guide 不改变 `currentSetupId`、"Get started" 入口或 `SetupProgressBadge`；初始 setup 完成后下一次加载时 Blocked → Available（D2-FR8） |
| Access | `filter-accessible-nav-items.test.ts`：没有 Promotions 权限时隐藏 Promotions；`rbac-contract.test.ts`：只有 Promotions 权限的用户能打开子路由 |
| Routing | Promotions 子路由在账户 shell 内渲染；不跳转到 Publisher Account（R3） |
| Analytics | 每个 PRD 事件都带 capability id、step、card state、account variant 和 timestamp |
| Accessibility | badge 和步骤状态有文字标签；按钮可通过键盘访问 |
| Locale | 加入新 key 后 `locales/index.test.ts` 仍通过 |
| E2E（按需启用） | 两个 guide 端到端；截图基线流程见 `CLAUDE.md` 的 `test:e2e:visual` |

尚未实现的未来行为（R2 关闭前的真实 Live 状态、测试步骤自动检测）按项目 placeholder 规则写成 skipped test，并写明启用条件。

### 退出标准 → 验证手段

| PRD 退出标准 | 本计划的验证手段（F2P） |
|---|---|
| 每个 guide 端到端走通，得到上线的优惠和上线的 code，并在真实购买流程中生效 | 在 stage 上手动走完两个 guide，做一次真实测试购买和一次真实兑换；记录在 MR 的 "Stage verification" 一节 |
| setup 完成前显示 Blocked，完成后立即变为 Available | State 测试（D2-FR8）加 stage 新项目检查 |
| guide 完成后卡片无需手动操作即变为 Live | 卡片状态规则的 unit test 加上面的 stage 走查；依赖 R2 |
| 切换前已有的 promotions 保持不变 | 在 stage 上执行任务 1.2 |
| 发布窗口内没有伙伴报告的回归 | 发布后监控；由用户负责 |
| Q4、Q5、Q6、Q7、Q10 关闭；taxonomy 已签字 | 相关任务开始前解决第 1 节 |
| Premium PC 账户满足同样标准 | 本计划不覆盖；见 C1 |

## 4. 合并前验证

- 本地 `pnpm dev:stage` **不算** MR 的验证（`CLAUDE.md`）。
- MR 需要 stage 验证：`pnpm release` 发到 stage，再预览该 tag，并填写 "Stage verification" 一节。
- release 和 merge 由用户负责（项目 memory），本计划不包含这两步。

## 5. 建议顺序

1. 与 PRD owner 解决第 1 节和第 7 节。先处理 C1 和 P1，因为它们决定代码放在哪里。
2. 任务 1.1 和 1.2（验证现有 Promotions 路由和已有数据）。
3. C3 给出权限名后做任务 1.4。
4. 编写 2.2、2.3、3.3、3.5 的测试（先写）。
5. D2 卡片（2.1 到 2.6），然后 D3 guide（3.1 到 3.10）。
6. 横切任务（4.1 到 4.6）。
7. Stage 验证和 MR（release 由用户负责）。

## 6. 风险

| 风险 | 缓解措施 |
|---|---|
| Live 和 Blocked 规则未定义（Q4、Q5） | 规则集中在一个模块中，修改时只改一处。 |
| Promotions 列表 endpoint 未确认（PRD R2） | 在 2.2 之前与 Catalog 团队确认 endpoint。没有它，卡片永远到不了 Live，"Review and activate"（D3-FR15）和 "Create the codes"（D3-FR19）也会失去信号，这会违反一条退出标准。任何降级方案（例如"只显示 Available"或改为伙伴确认）都要先经产品签字（P5、R2），不能默认上线。 |
| 嵌入的 Publisher Account 页面有跳出账户的链接（R3） | 在 1.1 中检查。如果存在，记录为缺口，不要重写模块。 |
| guide 在 widget 和入口中替换掉初始 setup | 独立的 `advancedGuides` 状态（3.5）和独立路由（3.1）。由 State 测试覆盖。 |
| 跨设备或跨队友时进度丢失 | 按 Q14 和 P2 使用共享存储。如果过渡期用 `localStorage` 上线，在 MR 中列出该缺口。 |
| Premium PC 没有与 F2P 同步交付 | C1 指定负责人和计划。共享部分放入 `business-account-shared-library`（0.1）。 |
| 两个 guide 与 Quick-Start guide 实现分叉 | 复用引擎的展示部件，不复制 Quick-Start 代码。 |
| Taxonomy 签字延期（R1） | 先做不依赖它的 D1 和注册表。 |

## 7. 待确认项

### PRD 歧义（与 PRD owner 确认）

| 编号 | 问题 | PRD 引用 | 答复前的计划默认 | 阻塞 |
|---|---|---|---|---|
| P1 | Advanced 列表放在哪里？目前 Get Started 是"一个当前 setup 加它的 hub"，完成初始 setup 的伙伴会被重定向到该 hub。哪个页面显示这个列表？初始 setup 完成后伙伴落在哪个页面？ | D2-FR1、Q10、Q16 | 初始 setup 的 hub、它的完成页，以及 `?switch=1` 下的选择页 | 2.4 |
| P2 | guide 进度和 "I've done this" 确认由项目团队共享，还是按用户保存？存在后端还是本地？ | D3-FR7、Q14 | 按项目保存，过渡期用 `localStorage`（在 MR 中列出跨设备缺口） | 3.5 |
| P3 | D3-FR13、FR14、FR17、FR18 和 FR20 没有写 "Done when"。它们是可检测、需伙伴确认，还是仅作说明？如果它们与可检测步骤在同一个 Promotions 表单中完成，是否需要逐步确认？ | D3-FR4、D3-FR5 | 仅作说明：下一个可检测步骤完成时一并完成 | 3.3 |
| P4 | 初始 setup 和两个 promotions guide 都未完成时，浮动 widget 显示哪一个？ | D3-FR10 | 先显示初始 setup，再显示最近打开的 Advanced guide | 3.7 |
| P5 | Live 判定的类型边界：bonus promotion 计入哪张卡（Q6）？奖励为折扣的 promo code 是否也会让 "Sales, discounts & offers" 变为 Live（Q4）？ | D2-FR4、Q4、Q6 | 每张卡只统计自己的 promotion 类型 | 2.2 |

### 交付与权限（与账户负责人确认）

| 编号 | 问题 | 阻塞 |
|---|---|---|
| C1 | 谁在 `premium-pc-games` 中交付 Premium PC，时间表如何？哪些共享部分放入 `business-account-shared-library`？ | 0.1、Premium PC 的退出标准 |
| C2 | 每个 PRD 埋点事件在 tracking plan 中是否有对应条目，以及 card state、account variant 和 capability id 的字段名？ | 4.1 |
| C3 | Publisher Account 中查看和管理 Promotions 的权限名是什么？ | 1.4 |
