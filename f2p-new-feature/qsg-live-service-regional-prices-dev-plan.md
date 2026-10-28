# 开发计划：QSG Live-service: Regional prices for virtual goods（F2P）

- **来源 PRD：** [qsg-live-service-regional-prices-prd.md](qsg-live-service-regional-prices-prd.md)（Confluence：PRD - QSG Live-service: Regional prices for virtual goods，version 0.1，Draft）
- **相关计划：** [advanced-foundation-detail-plan.md](advanced-foundation-detail-plan.md)（F-01 到 F-17）、[qsg-live-service-time-limited-offers-dev-plan.md](qsg-live-service-time-limited-offers-dev-plan.md)（下称 TLO 计划）、[qsg-live-service-time-limited-offers-detail-plan.md](qsg-live-service-time-limited-offers-detail-plan.md)（步骤 `TO-xx`）。共享部分只在 foundation 和 TLO 计划中定义，本计划只引用编号。
- **分支：** 候选 `F2PGBA-351-new-feature-regional-prices`（已存在，还没有提交）。
- **状态：** 草稿，revision 1。等待第 1 节的待决事项和第 8 节的待确认项。
- **事实来源：** `free-to-play-pc` 代码（`master` 和 `feat/advanced-guides-first-batch`），以及 Xsolla 公开文档（2026-10-28 核对，见文末）。公开文档的结论**都还没有在 stage 上实测**。

## 本计划范围

本计划**只交付 Free-to-play 账户**，代码在 `free-to-play-pc`。

- PRD 的目标账户是 live-service PC 账户，Premium PC 账户不显示该卡片（CARD-01），所以不需要 Premium 变体。
- 本仓库只是 Get Started 前端。Store API 和建议价格服务由各自的团队负责。本计划只负责调用这些 API。
- Figma 设计稿还没有开始做，它是开发开始前的阻塞项（PRD Dependencies）。不依赖设计稿的任务可以先做，见第 5 节。

## 0. 代码现状

| 领域 | 现状 | 影响 |
|---|---|---|
| Advanced 框架 | foundation 的非 UI 部分在 `feat/advanced-guides-first-batch` 上，**还没有合并到 master**：`advanced/registry.ts`、`cards/`、`guide/`、`analytics.ts`。 | 本功能建在这个分支上。还需要 TLO 计划中的 foundation 扩展（TO-01、TO-02、TO-03）。 |
| 价格模型 | `StorePrice`（`core/apis/catalog.ts:27-38`）：`amount`、`currency`、`country_iso?`、`is_default`、`is_enabled`。国家价格是 `prices[]` 中带 `country_iso` 的行，`regional_prices` 字段保持为空（:31-33）。virtual item、VC package、bundle 的 payload 都有 `prices`（:65、:140、:177）。 | 写入地区价格 = 改写 `prices[]` 中的国家行。公开文档与此一致（`country_iso` 为 ISO 3166-1 alpha-2）。 |
| Catalog 读取 | `listCatalogItems`（:540）。`normalizeCatalogItem`（:517-531）只输出一个格式化的价格字符串（取 `is_default` 行，没有时取第一个有效行，`pickItemPrice` :512-515）。`livePriceRows`（:506）丢掉停用行和非正数行；`is_free` 时丢掉全部行（:490-496）。first-batch 分支加了 `isFree`、`hasVcPrice`，但没有暴露 `prices[]`。 | 第 1 屏的 "Base price" 和 "Regional prices now" 列、RGP-01 的“没有 base price”判断，以及 Live 规则，都需要完整的 `prices[]`（RP-02）。 |
| “Base price” | 代码里没有这个概念。 | 本计划定义：base price = 没有 `country_iso` 的 `is_default` 行（P1）。 |
| 单条读取 | master 上没有单条 item 读取。first-batch 只有 bundle 的 `getBundleDetail`。TLO 的 TO-05 计划新增 `getRawCatalogItem`（三种类型）。 | 与 TLO 共用（RP-03）。 |
| Catalog 写入 | `updateVirtualItem`、`updateVirtualCurrencyPackage`、`updateBundle`（:604、:665、:692）都是**整体替换**的 PUT。代码注释：“Parameters omitted from the request will be removed”（:598-602）。VC package 的路径段未经验证（:659-664）。`prices` 为空且不是 `is_free` 时，API 返回 422（:11-14）。 | 写入前要读取完整的原始 item，只替换国家行，再整体写回（RP-04）。500 个条目要逐个 GET 和 PUT。 |
| 建议价格 | `convertRegionalPrices(projectId, currency, amount)`（`core/apis/price-tiers.ts`）：`POST /v1/admin/projects/{id}/price/convertRegionalPrices`，body `{currency, amount}`，走 `gcConnectorInstance`。返回 `{country_iso, currency, amount: string}[]`。**每次只能换算一个金额，没有批量接口。** 公开文档里没有建议价格、PPP 或价格模板的 API；PA 界面的 "Calculate using default price" 按汇率和税费换算。 | 这很可能就是 PRD 说的 "Suggested prices service"（C1）。它按汇率换算，不是 PPP，与 CARD-01 描述中的 "PPP-adjusted" 不一致（P2）。 |
| 现有价格 UI | `setups/shared-prices/`：`SetUpPricesModal` 有一个默认价格和一组国家行；"Calculate" 调用 `convertRegionalPrices`，并用 `requestRef` 防止旧响应覆盖新结果（:138-179）。`index.ts`：`COUNTRY_CODES`（约 240 个）、`countryLabel`（`Intl.DisplayNames`）、`useCurrencyOptions`（基于 `getCurrencyList`）、`isPositiveAmount`。 | 国家列表、国家名、币种选项、换算调用都可以复用。 |
| 币种和国家 | `getCurrencyList()`（`core/apis/currency.ts`）：`GET /mapi/merchant/current/currency/list`，模块级缓存。没有“国家 → 可用币种”的映射；公开文档也没有对应的 API。 | `convertRegionalPrices` 的结果是唯一可用的“国家 → 币种”来源（RP-07）。 |
| 格式化 | `formatStorePrice`（catalog.ts:463-469）固定用 `en-US`，没有导出。`formatPrice` 在两个 `itemPayload.ts` 中各有一份。 | NFR-07 要求按国家的本地格式显示，需要新 helper（RP-09）。 |
| CSV | 没有 CSV 解析器，也没有 `FileReader` 用法，`package.json` 里没有 CSV 库。现有的文件导入是 JSON catalog 导入（`core/apis/catalog-import.ts`，经 gc-connector，只有 `create` 模式）。`ImportCanvas.tsx` 有文件类型和大小的检查。 | 需要新的 CSV 解析（RP-06、P6）。 |
| 现有 setup 的写入 | sell-virtual-goods 和 off-platform-distribution 构建 `prices` 时，只用 wizard 草稿中的默认价格和 `localPrices`（`sell-virtual-goods/itemPayload.ts:52-75`、:127；`off-platform-distribution/itemPayload.ts:65-88`、:140）。`localPrices` 只来自草稿（`data.ts:133` 默认 `[]`），不从服务端加载。更新是整体替换的 PUT（sell :198-204，off-platform :335-349）。唯一的保护是 SKU 不是 wizard 创建时弹出确认（`shared-catalog-update.ts` 的 `resolveSubmitMode`）。 | 伙伴用本 guide 设置地区价格后，再用初始 setup 编辑同一个 item，**国家行会被静默清空**，卡片退回 Available（RP-16）。与 TLO 的 `periods` 问题（TO-06）同类。 |
| 批量与重试 | 没有并发限制、分批或重试 helper，也没有 `p-limit`、`axios-retry` 依赖。`launcherPayload.ts` 有可恢复的检查点写法（:64-115、:587-722）。 | NFR-04 的分批、可恢复写入需要新模块（RP-04）。 |
| Undo 和通知 | 没有定时 undo 或定时 toast。通知用 XUI 的 `useNotification().alert`（`Registration/steps/RegistrationForm.tsx`）或行内 `<Notification>`。 | 10 分钟 Undo 需要新实现（RP-05）。 |
| 限流 | 公开文档没有给出 admin API 的限流数值；自动化指南的示例脚本用 15 RPS 和指数退避。 | 500 个条目 × (GET + PUT) 约 1000 次请求；按 15 RPS 约 70 秒。需要确认实际限额（C2）。 |
| 鉴权 | catalog admin 接口和 gc-connector 都已经用 PA bearer token 跑通（现有 setup 在用）。公开文档写的是 basicAuth。 | 与 TLO 的 promotion 接口不同，本功能**没有新的鉴权风险**。 |

### Xsolla 定价规则（公开文档）

| 规则 | 对本功能的影响 |
|---|---|
| 买家看到的价格：先找该国家的价格，再找该国家所用币种的价格，最后用默认价格。 | 没有地区价格的条目按默认价格换算。 |
| **“If at least one item has no price set for the selected country, prices for the entire item catalog in that country switch to the default currency.”** | 如果只给 VC package 设了某国价格，而其他条目没有，这个国家的**整个 catalog** 都会退回默认币种，VC package 的地区价格也不生效。"All currency packages" 这个默认范围可能达不到 PRD 的目标（C3，第 7 节第一条风险）。 |
| 官方建议所有条目使用同一组币种。 | 同上。 |
| PA 界面的 "Calculate using default price" 和 CSV 导入都会删除原有的地区价格。 | 本功能写入时替换全部国家行，与 PA 的行为一致（P5）。 |

## 1. 待决事项（阻塞开发）

| 编号 | 待决事项 | 来源 | 阻塞 |
|---|---|---|---|
| OD1 | Taxonomy：卡片名称、所在小节，与父 PRD v2 6.1 节核对 | Open decision 1 | RP-01 |
| OD3 | "Regional prices & restrictions" 是一张卡片两个 guide，还是合并成一个 guide？ | Open decision 3 | RP-01、路由、注册表 |
| OD4 | 负差额确认阈值（建议 60%），由 Risk team 决定 | Open decision 4 | RP-08（只是常量，不阻塞开发） |
| OD6 | 执行团队和 Jira epic | Open decision 6 | 排期 |
| DEP-2 | Live 检测用的 capability 状态 flag（父 PRD 的共享 API） | Dependencies | RP-02（有降级方案） |
| DEP-3 | 所有画面的 Figma 设计稿 | Dependencies | RP-10 到 RP-13 的 UI 部分 |
| C3 | 部分条目设置地区价格时，整个国家的 catalog 是否退回默认币种 | 公开文档 | RP-10 的默认范围、Live 规则、产品价值 |

OD2（签批人）和 OD5（NFR-03 可用性目标）不阻塞前端开发。

## 2. 后端 API

| # | API | 用途 | 现状 | 关联 |
|---|---|---|---|---|
| A1 | `POST /v2/project/{id}/admin/items`（`listCatalogItems`） | 第 1 屏列表、base price、现有国家行、Live 规则 | 在用；需要在 read model 中暴露 `prices[]` | RP-02 |
| A2 | `GET /v2/project/{id}/admin/items/{virtual_items \| bundle \| virtual_currency/package}/sku/{sku}` | 写入前读取完整原始 item | 有文档，代码里只有 bundle | RP-03，与 TLO TO-05 共用 |
| A3 | `PUT` 同上路径（`update*`） | 写入 `prices[]`；Undo 时写回原值 | 在用（VC package 路径未验证） | RP-04、RP-05 |
| A4 | `POST /v1/admin/projects/{id}/price/convertRegionalPrices`（gc-connector） | 建议价格；国家 → 币种映射；负差额的比较基准 | 在用（`SetUpPricesModal`） | RP-07、C1 |
| A5 | `GET /mapi/merchant/current/currency/list` | 币种代码校验、小数位 | 在用 | RP-06、RP-09 |
| A6 | capability 状态 flag | Live 判断 | 新增（DEP-2） | RP-02 |
| A7 | feature flag | Wave 1 灰度 | 待定 | RP-19、C6 |

不需要新的写入接口。公开文档里有 JSON 批量导入（`/v1/projects/{id}/import/from_external_file`，`mode: create_and_update`），但要求文件放在公网 URL 上，文件格式和条数上限都没有写明，所以 v1 不用它，见 P8。

## 3. 按交付物拆分的任务

### 共享部分（引用 foundation 和 TLO）

本功能需要 foundation 的 F-01 到 F-17，以及 TLO 计划中的 foundation 扩展。哪个功能先开发，就由哪个功能交付这些扩展：

| 共享项 | 定义位置 | 本功能的用法 |
|---|---|---|
| 不受初始 setup 规则限制（`ignoresInitialSetup`） | TLO TO-01 | CARD-02：卡片永远不是 Blocked |
| `form` 步骤类型和表单草稿 | TLO TO-02 | GDE-03：第 1–3 屏的草稿和按屏恢复 |
| 埋点扩展（事件 union、可选参数、Live 转变检测） | TLO TO-03 | 9 个 `qsg_*` 事件 |
| 原始 item 读取与合并 helper | TLO TO-05 | RP-03：把 `withPeriods` 推广为只替换指定字段的 helper |
| 写权限能力 `canWriteItems` | TLO TO-12 | NFR-04：只需要这一项 |
| F-10 guide 页面：进度条、面包屑 | foundation F-10 | "step N of 4"（GDE-02）、PA 面包屑（GDE-04） |

本功能对 F-03 草稿的额外要求：**草稿不能保存整张价格表**。500 个条目 × 170 个国家的价格表约有 5 MB，超过 `localStorage` 的容量。草稿只保存范围、方法、上传的矩阵（或它的摘要）和伙伴手动改过的单元格；恢复时重新生成建议价格，再叠加手动修改（RP-14）。

### D1：卡片

RP-01 **注册卡片。** 在 `ADVANCED_GUIDES` 中加入 `regional-prices`：名称和描述用 CARD-01 原文，CTA "Set up" 和 "Open"，以及 `ignoresInitialSetup: true`。只对 F2P 变体注册（F-16）。
- Live 卡片的 "Open" 打开一个新 run 的 guide。foundation 对已完成的 run 会新建 run，本功能正好需要这样：伙伴可以随时重新调整地区价格。不需要 manage 视图（与 TLO 不同）。
- OD3 决定合并成一个 guide 时，只改注册表这一处。

RP-02 **Catalog 读取扩展与 Live 规则。**
- 在 `CatalogItemOption` 中加入 `basePrice?: {amount, currency}`（没有 `country_iso` 的 `is_default` 行）和 `countryPrices: StorePrice[]`（带 `country_iso` 的有效行）。不改变现有的 `price` 字符串。
- “没有 base price”的条件：没有 base price 行；或 `is_free`；或只有 virtual currency 价格（`vc_prices`）。这些条目在第 1 屏列出并标为跳过（RGP-01）。
- DEP-2 可用之前，Live 规则默认为：项目中**每个**有 base price 的 VC package 都至少有一个有效的国家行（P3）。项目中没有 VC package 时，规则不成立，卡片保持 Available。
- 读取失败时保留上一次的确定状态（TLO 计划 F-08 扩展）。

### D2：Guide（4 屏）

RP-03 **原始 item 读取与合并。** 复用 TLO TO-05 的 `getRawCatalogItem` 和 `putRawCatalogItem`。新增 `withCountryPrices(raw, rows)`：
- 保留 base price 行，以及没有 `country_iso` 的其他币种行。
- 用传入的行替换全部带 `country_iso` 的行（P5）。
- 其余字段原样保留。不能用 `normalizeCatalogItem` 的结果写回，它会丢字段。

RP-04 **分批写入模块（纯逻辑加执行器）。** 位置：`src/pages/GetStarted/advanced/regional-prices/apply/`。
- 写入前，在内存中校验全部条目：金额为正数；币种在 A5 的列表中；国家和币种的组合在 A4 的映射中。任何一条失败，都不发出写请求。
- 每个条目：读取原始 item（A2）→ 与打开时的快照比较国家行 → `withCountryPrices` → PUT（A3）。
- 并发数和请求速率用常量控制，默认串行加固定间隔，具体数值等 C2。429 和 5xx 用有上限的指数退避重试。
- 按批次记录进度（每批完成的 SKU）。网络中断后，**已完成的批次保留**，重试从下一批开始（PRD 边界情况）。重试前重新读取服务端的值，与目标值相等的条目跳过，所以正确性不依赖本地记录。
- 与 TLO 的“失败即回滚”不同，PRD 在这里明确要求保留已完成的批次，不回滚。
- 每个条目写入前保存写入前的国家行，供 Undo 使用（RP-05）。
- 冲突检测：当前值与打开时的快照不同，并且不等于本次目标值时，跳过该条目并在结果中列出（PRD 边界情况：两个用户同时编辑）。
- 显示进度（已写入 / 总数），不出现空白页（PRD Loading 状态）。

RP-05 **10 分钟 Undo（RGP-03）。**
- 写入完成后显示 "Undo"，从写入完成时开始计时 10 分钟，到时隐藏。
- Undo 用同一个写入模块，把每个条目的国家行写回 RP-04 保存的原值。写回前比较当前值：当前值不等于本次写入的值时，说明有人在这 10 分钟内改过，跳过该条目并列出。
- 原值只保存在内存中。刷新页面或离开 guide 后 Undo 不再可用（P4）。原因同上：整份原值可能超过 `localStorage` 的容量。
- Undo 中途失败时，按 RP-04 的方式从下一批继续。

RP-06 **价格矩阵 CSV 解析（RGP-05）。**
- 列：`sku`、`country_iso`、`currency`、`amount`。第一行是表头，列名不区分大小写；支持 BOM、引号和 CRLF。
- 逐行校验，错误按行列出原因：未知 SKU（不在第 1 屏选中的范围内）、未知国家代码、币种不在 A5 列表中、币种与该国家不匹配（A4 映射）、金额不是正数、同一 SKU 和国家出现两次。
- 有效行可以导入；无效行列在错误汇总中（PRD 边界情况）。
- 文件大小和行数设上限（常量，例如 500 × 170 行）。
- 解析方式见 P6：默认引入 `papaparse`，它是处理 CSV 边界情况的标准库。

RP-07 **建议价格生成（方法 "Suggested prices"）。**
- 对每个条目的 base price 调用 A4。A4 每次只能换算一个金额，所以按 `(currency, amount)` 去重：不同条目的 base price 相同时，只调用一次。
- 并发数用常量控制。NFR-02 要求 20 个条目 p95 < 3 s，并显示进度。
- 任何一次调用失败：显示通知说明原因，方法回退到 "Upload a price matrix" 和 "Set manually"（PRD 边界情况）。
- A4 的结果同时作为“国家 → 币种”映射（RP-04、RP-06 的校验）和负差额的比较基准（RP-08）。

RP-08 **负差额计算与确认（RGP-02）。**
- 差额 = 地区价格 ÷ base price 换算到该国家币种的金额 − 1。换算金额取 A4 对 base price 的结果，所以不需要单独的汇率接口。
- 注意：A4 的结果包含税费（PA 文档），所以差额是“相对于换算价”，不是“相对于汇率”。界面文案按这个口径写（P7）。
- 差额低于 −60% 的单元格：用文字标注（NFR-06，不只靠颜色）。点击 Apply 时，弹出确认对话框，列出受影响的国家和条目（RGP-02）。
- 阈值是常量，等 OD4 确认。
- "vs. USD base" 列：base price 不是 USD 时，列名显示实际币种。

RP-09 **价格格式化与本地价格尾数。**
- 新 helper：按国家的 locale 和币种格式化价格（NFR-07），小数位取自 A5（如果 A5 提供）或 `Intl.NumberFormat` 的默认值。
- "Round to local price endings" 开关：按币种的规则取整（例如两位小数币种取 `.99`，零小数币种取整到整十或整百）。具体规则见 P9；规则放在一个表里，改规则只改这一处。
- 取整后重新计算差额。

RP-10 **第 1 屏 Pick items（RGP-01、RGP-04）。**
- 范围选项：All currency packages（默认）、Selected items、Whole catalog。
- "Whole catalog" 包括 virtual item、VC package 和 bundle。不包括未打包的 virtual currency 和 game key（P10）。
- 表格列：Package、Base price、Regional prices now（国家行数）。
- 没有 base price 的条目列出并显示 "No base price, skipped"，不计入 Apply 的数量（RGP-01）。
- 范围内没有一个有 base price 的条目时，显示 "Set a base price first" 和 catalog 链接（PRD Empty 状态）。
- 条目上限 500（NFR-04）。

RP-11 **第 2 屏 Choose method（RGP-05）。**
- 选项：Suggested prices / Upload a price matrix / Set manually。
- "Suggested prices" 的 CTA "Generate suggestions" 执行 RP-07。
- "Upload a price matrix" 执行 RP-06，显示有效行数和错误汇总，可以下载 CSV 模板。
- "Set manually" 从现有的国家行开始，没有的国家留空。
- 第 3 屏已有手动修改时，返回第 2 屏更换方法，先确认是否放弃修改（PRD 边界情况）。

RP-12 **第 3 屏 Review prices（RGP-06）。**
- 起点是现有的国家行，再叠加所选方法的结果（P5）。
- 表格列：Country、Currency、Suggested、vs. USD base。每个单元格都可以编辑。
- 条目多时需要切换条目（例如条目列表加单条目的国家表）。500 × 170 个单元格不能一次渲染，需要虚拟滚动或分页。交互方式等 Figma。
- 顶部汇总：条目数、国家数、负差额超过阈值的单元格数。
- 主 CTA "Apply to N packages"。

RP-13 **第 4 屏 Apply（RGP-07）。**
- 点击后执行 RP-04，显示进度。
- 成功后显示 "N packages now have prices in M countries"，次要 CTA "Undo"（RP-05），然后标记完成，卡片变为 Live。
- 部分条目因冲突被跳过时，列出这些条目，不算失败。
- 成功页加 "What's next?" 推荐（F-14）。

RP-14 **草稿与恢复（GDE-03）。**
- 草稿保存：范围（选中的 SKU）、方法、上传的矩阵（有效行；行数过多时只保存“需要重新上传”的标记）、手动修改过的单元格。
- 恢复到第 3 屏时：重新生成建议价格（RP-07），再叠加手动修改。
- 打开 guide 时，如果能力已在 guide 外配置，guide 按实际状态把对应屏标为完成（父 PRD FR-11）。

RP-15 **只读模式（NFR-04）。** 没有 `canWriteItems` 时，整个 guide 只读：显示只读横幅和 "Ask a project owner to complete this step"，所有写操作禁用。每次写入前重新检查。路由 gate 不变（同 TLO TL-10）。

### 横切任务

RP-16 **现有 setup 不清空国家行。** sell-virtual-goods 和 off-platform-distribution 更新已有 item 时，保留服务端原有的国家行（草稿中没有改动国家行时）。与 RP-03 共用“读取原始 item 再合并”的 helper。创建 item 时不变。加回归测试：更新已有 item 时国家行保持不变。与 TLO 的 TO-06 改同一段代码，两者应该一起做。

RP-17 **埋点。** 通过 F-15 的 `trackAdvanced` 发出 PRD 的 9 个事件（依赖 TLO TO-03 扩展）：
- 通用 6 个：`qsg_card_clicked`、`qsg_guide_opened`、`qsg_guide_step_viewed`、`qsg_guide_step_completed`、`qsg_guide_error`、`qsg_feature_enabled`。
- 本功能 3 个：`qsg_regional_method`（`method`）、`qsg_regional_prices_reviewed`（`countries`）、`qsg_regional_prices_applied`（`items`、`countries`、`edited_cells`、`undo_used`）。
- `undo_used` 在 Apply 成功时还不知道。默认：Apply 成功时发 `undo_used: false`；Undo 成功时再发一次 `qsg_regional_prices_applied`，`undo_used: true`（P11）。
- 事件方法和 exv 字段的规则同 TLO TL-11。只能在 stage 上验证（development 不初始化 Metrika）。

RP-18 **Locale。** 新 key 只加在 `src/locales/en.json`。v1 只有英文（同 TLO TL-13）。

RP-19 **Feature flag。** 卡片和 guide 都受 flag 控制。flag 关闭时两者都隐藏，已写入的价格保留（PRD Rollback）。

RP-20 **Dev panel。** 在 `src/pages/GetStarted/dev/` 中加入本 guide 的覆盖项：各屏状态、建议价格服务失败、CSV 错误、负差额确认、写入中断后恢复、Undo 倒计时、只读。挂载方式和 production 隔离同 TLO TL-14。

## 4. 测试计划（先写测试，只在用户要求时运行）

| 层级 | 测试目标 |
|---|---|
| Unit | base price 判断：`is_default` 且无 `country_iso` 的行；`is_free`、只有 `vc_prices`、没有默认行 → 没有 base price。Live 规则：每个有 base price 的 VC package 都有国家行才算 Live；没有 VC package → Available。`withCountryPrices`：只替换国家行，base price 行和无国家的币种行保留，其余字段深度相等。分批写入：校验失败时不发出请求；第 3 批失败后前 2 批保留，重试从第 3 批开始；服务端值已等于目标值时跳过；他人修改的条目跳过并列出；429 退避有上限。Undo：10 分钟后隐藏；当前值已被他人改过的条目跳过。CSV：表头大小写、BOM、引号、CRLF；未知 SKU、未知国家、币种不匹配、非正数金额、重复行分别报错；有效行可以导入。建议价格：相同 `(currency, amount)` 只调用一次；一次失败 → 回退到矩阵和手动。负差额：−65% 需要确认，−59% 不需要；取整后重新计算。格式化：按国家 locale 和币种。RP-16：更新已有 item 时国家行不变 |
| Component | 卡片在没有 web shop 时为 Available；没有 team-engagement 警告；overview 先于表单显示；"step 3 of 4" 与 3/4 进度条；第 1 屏 "No base price, skipped" 和 Apply 数量；Empty 状态；更换方法前的确认；负差额文字标注和确认对话框；进度显示；成功页数量和 Undo；只读横幅 |
| State | 在第 3 屏离开、第二天返回，打开到第 3 屏且手动修改保留；草稿中没有整张价格表；Apply 后下一次加载卡片显示 Live；Available → Live 时发出一次 `qsg_feature_enabled` |
| API client | 原始 item 读取和写入、`convertRegionalPrices` 的请求形状（`vi.mock`） |
| Analytics | 9 个事件在正确时机触发，只带已登记的 exv 字段；Undo 后的 `undo_used: true` |
| Build | `pnpm build:prod` 的产物中没有 dev panel 的 chunk |
| E2E（可选） | 用 dev panel fixture 走完 4 屏的冒烟测试 |

依赖后端尚未交付的行为写成 skipped test，并写明启用条件：DEP-2 交付后 Live 改用 capability flag；C2 确认后按实际限额调整并发和速率。

### 验收标准 → 验证手段

| PRD 验收标准 | 验证手段（F2P） |
|---|---|
| RGP-01：3 个 package，1 个没有 base price，Apply 数量为 2 | base price unit test，加第 1 屏 component test |
| RGP-02：建议价格比 base 低 65%，Apply 前弹出确认并列出国家 | 负差额 unit test，加 component test |
| RGP-03：10 分钟内 Undo 恢复原价，之后隐藏 | Undo unit test，加 stage 走查 |
| RGP-05：CSV 无效行报告，有效行可导入 | CSV unit test |
| RGP-07：成功通知显示 package 数和国家数；卡片变为 Live | component test，加 stage 走查 |
| CARD-02：没有 web shop 时卡片为 Available | F-07 扩展的 unit test，加 stage 走查 |
| CARD-04：Apply 后下一次加载显示 Live | Live 规则 unit test，加 stage 走查 |
| GDE-03：第二天返回停在第 3 屏，修改保留 | State 测试 |
| NFR-02：20 个条目的建议价格 p95 < 3 s | stage 抽样测量；p95 需要埋点数据（C5） |
| NFR-04：500 个条目 × 170 个国家，分批、可恢复 | 分批写入 unit test；stage 上用测试项目做一次大批量走查（依赖 C2） |

## 5. 建议顺序

1. 解决第 1 节和第 8 节。优先处理 **C3**（它决定默认范围和产品价值）、C1、C2。
2. foundation F-01 到 F-17，加上 TLO 的 TO-01、TO-02、TO-03（如果还没交付）。
3. 不依赖设计稿的部分：RP-02、RP-03、RP-04、RP-05 的逻辑、RP-06、RP-07、RP-08、RP-09，以及它们的 unit test。RP-16 改的是现有 setup，可以与 TLO TO-06 一起单独先合并。
4. Figma 交付后：RP-01、RP-10 到 RP-14。
5. RP-15 只读模式、RP-17 埋点、RP-18 locale、RP-19 feature flag、RP-20 dev panel。
6. Stage 验证和 MR（release 由用户负责）。
7. DEP-2 交付后，Live 改用 capability flag，并启用对应的 skipped test。

## 6. 合并前验证

- 本地 `pnpm dev:stage` **不算** MR 的验证（`CLAUDE.md`）。
- MR 需要 stage 验证：`pnpm release` 发到 stage，再预览该 tag，并填写 "Stage verification" 一节。release 和 merge 由用户负责。
- stage 走查要在测试项目上进行，因为 Apply 会真实改写价格。走查结束后用 Undo 或手动恢复。
- stage 走查必须包含 VC package（PUT 路径未验证）和一次中断后恢复。

## 7. 风险

| 风险 | 缓解措施 |
|---|---|
| **只给部分条目设地区价格时，整个国家的 catalog 退回默认币种**，guide 的结果不生效 | C3 确认规则的适用范围（web shop、Pay Station、还是两者都有）。规则成立时：第 1 屏提示哪些条目缺少同一组国家，默认范围可能要改为 "Whole catalog"，需要 PRD owner 决定 |
| 整体写回 item 时覆盖其他字段，或覆盖别人刚做的修改 | 读取原始 item，只替换国家行（RP-03）；写入前对比快照（RP-04） |
| 500 个条目触发限流，写入很慢或中途失败 | 串行加间隔、有上限的退避、按批可恢复（RP-04）；C2 确认实际限额 |
| 伙伴用初始 setup 编辑 item，国家行被清空，卡片退回 Available | RP-16 |
| 建议价格按汇率和税费换算，不是 PPP，与卡片描述不一致 | P2：改描述，或由 Pricing 团队提供 PPP 服务（PRD Non-goals 把算法交给 Pricing 团队） |
| 每个 base price 调用一次 A4，条目多时超过 NFR-02 | 按 `(currency, amount)` 去重，限制并发；NFR-02 只要求 20 个条目 |
| 价格表太大，`localStorage` 存不下，草稿和 Undo 丢失 | 草稿只存手动修改，恢复时重新生成（RP-14）；Undo 只在内存中（RP-05，P4） |
| 大负差额带来地区套利（PRD 风险） | RP-08 的确认；阈值由 Risk team 在 Wave 2 前确认（OD4） |
| VC package 的 PUT 路径未验证，写入 404 | stage 走查必须包含 VC package；路径不对时只改 `catalog.ts` 一处 |
| 没有“国家 → 币种”的官方数据，CSV 校验可能误报 | 用 A4 的结果作映射；映射缺失的国家只警告，不拒绝（C4） |
| foundation 或 TLO 的扩展没有落地 | 第 3 节“共享部分”逐条列出；开始 RP 任务前确认 |
| Taxonomy 改名或合并卡片（PRD 风险，OD3） | 卡片元数据只放在 RP-01 一处 |
| Figma 未开始，阻塞 UI 开发 | 先做第 5 节第 3 步 |

## 8. 待确认项

### PRD 歧义（与 PRD owner 确认）

| 编号 | 问题 | PRD 引用 | 答复前的计划默认 | 阻塞 |
|---|---|---|---|---|
| P1 | "Base price" 指什么？代码和 API 里没有这个字段 | RGP-01、GDE-01 | 没有 `country_iso` 的 `is_default` 行；`is_free` 或只有虚拟币价格的条目算“没有 base price” | RP-02 |
| P2 | CARD-01 写 "PPP-adjusted"，但现有建议价格服务按汇率和税费换算。改描述，还是要求 PPP 服务？ | CARD-01、Non-goals | 用现有服务；描述文案请 PRD owner 确认 | RP-01、RP-07 |
| P3 | Live 的条件：Summary 说“范围内每个 VC package 都有地区价格”，CARD-04 说“在 VC package 上检测到地区价格”。范围是本次选择的条目，还是项目中所有 VC package？至少几个国家才算？ | Summary、CARD-04 | 项目中每个有 base price 的 VC package 至少有一个国家行 | RP-02 |
| P4 | Undo 在刷新页面或离开 guide 后是否仍需可用？ | RGP-03 | 不需要；原值只在内存中 | RP-05 |
| P5 | 写入时，条目原有的国家行怎么处理：全部替换，还是只更新表中出现的国家？ | RGP-07 | 第 3 屏以现有国家行为起点，写入时用整张表替换全部国家行（与 PA 的 "Calculate" 和 CSV 导入一致） | RP-03、RP-12 |
| P6 | CSV 解析可以引入第三方库 `papaparse` 吗？ | RGP-05 | 引入（团队内部决定，不需要 PRD owner） | RP-06 |
| P7 | “差额”的口径：相对于含税的换算价，还是相对于汇率？ | RGP-02、UX 第 3 屏 | 相对于建议价格服务的换算价 | RP-08 |
| P8 | NFR-04 要求 500 × 170：逐条 PUT 可以接受，还是必须用批量导入接口？ | NFR-04、Dependencies | 逐条 PUT 加分批和恢复 | RP-04 |
| P9 | "local price endings" 的规则由谁提供？ | RGP-06 | 先用简单规则（两位小数币种 `.99`，零小数币种取整），规则表放一处 | RP-09 |
| P10 | "Whole catalog" 包括哪些类型？game key 有价格，但本仓库没有 game key 的更新函数 | RGP-04 | virtual item、VC package、bundle；不含未打包的 virtual currency 和 game key | RP-10 |
| P11 | `undo_used` 在 Apply 成功时还不知道，怎么上报？ | Analytics | Undo 成功时再发一次 `qsg_regional_prices_applied`，`undo_used: true` | RP-17 |
| P12 | "Set manually" 从什么开始：现有国家行、空表，还是建议价格？ | UX 第 2 屏 | 现有国家行，没有的国家留空 | RP-11 |

### 交付与权限（与相关负责人确认）

| 编号 | 问题 | 对象 | 阻塞 |
|---|---|---|---|
| C1 | `convertRegionalPrices` 是否就是 PRD 说的 "Suggested prices service"？有没有批量换算接口？返回的国家列表是否覆盖所有可售国家（PRD 示例是 128 个） | Pricing 团队 / gc-connector 负责人 | RP-07 |
| C2 | Store admin API 的实际限流：每秒请求数、429 后的建议等待时间；PRD Dependencies 写的 "confirm bulk limits" | Catalog / Store API 团队 | RP-04 |
| C3 | 公开文档：“只要有一个条目没有某国家的价格，这个国家的整个 catalog 退回默认币种”。这条规则适用于 web shop、Pay Station、购买链接中的哪些？只给 VC package 设地区价格是否有效？ | Catalog / Store API 团队 | 默认范围、Live 规则、产品价值 |
| C4 | “国家 → 可用币种”的权威数据来源。`convertRegionalPrices` 的结果能否作为这个来源 | Catalog / Pricing 团队 | RP-04、RP-06 |
| C5 | 在 tracking plan 中登记 9 个 `qsg_*` 事件、事件类型和 exv 参数；NFR-01、NFR-02 的 p95 由谁测量 | 数据团队 | RP-17 |
| C6 | Wave 1 的 feature flag 名称、按账户开启的方式和配置人 | 账户负责人 / 后端 | RP-19 |
| C7 | 与 TLO 共用：单条读取 endpoint、VC package 的 PUT 路径、GET 响应能否直接作为 PUT body（TLO 计划 C2） | Catalog / Store API 团队 | RP-03、RP-04 |

## 参考

- [Pricing policy（选价顺序、整个 catalog 退回默认币种、Calculate using default price）](https://developers.xsolla.com/items-catalog/catalog-features/pricing-policy/)
- [Import local prices（CSV 导入，界面功能）](https://developers.xsolla.com/liveops/xlms/catalog-management/import-local-prices/)
- [Admin update virtual item](https://developers.xsolla.com/api/catalog/virtual-items-currency-admin/admin-update-virtual-item/)
- [Admin update virtual currency package](https://developers.xsolla.com/api/catalog/virtual-items-currency-admin/admin-update-virtual-currency-package/)
- [Automate catalog（逐条更新、示例 15 RPS 和退避）](https://developers.xsolla.com/items-catalog/catalog-management/automate-catalog/)
- [Import items from external file](https://developers.xsolla.com/api/catalog/connector-admin/import-items-from-external-file/)
- [Catalog API 概述（admin 调用有限流）](https://developers.xsolla.com/api/catalog)
- [Supported currencies](https://developers.xsolla.com/dev-resources/references/supported-currencies/)
- [Supported countries](https://developers.xsolla.com/dev-resources/references/supported-countries/)
