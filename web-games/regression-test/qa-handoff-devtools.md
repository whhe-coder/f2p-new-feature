# QA 执行单：C 类用例与 A5a（DevTools / Requestly）

> 日期：2026-10-21 · 任务：R6（见 `remaining-tasks.md`）· 依据：spec v0.3.7、计划 P10
> 来源：`stage-verification-appendix.md` §4 C 类清单（70 条）、T1–T5 中同 ID 用例、`stage-results-2026-10-21.md` §6–§7
> 执行人：人工 QA。本单由 Claude 根据 T 文件和源码编写，**没有在浏览器中执行过任何一条**。

## 0. 总览

| 组 | 主要手段 | 条数 |
|---|---|---|
| 1 | Request blocking / 网络失败 | 23 |
| 2 | Local overrides / 改响应 body | 19 |
| 3 | 改状态码 | 14 |
| 4 | Throttling / 延迟 / 挂起 | 11 |
| 5 | 伪造、过期或删除 token / cookie | 2 |
| 6 | 跨域 iframe 的 Console 上下文 | 2 |
| | **合计**（C 类 70 + A5a 1） | **71** |

每条只归入一个组，按“完成本条的主要手段”分。一条需要多种工具时，“工具配置”中会全部列出。

**已完成，不用执行**：A5b（OBS-BOOT-002）。另一会话于 2026-10-21T04:15–04:16Z 用 Playwright 拦截 `/api/v1/modules`，证实 abort 和 500 都会白屏（`#root` 为空，不进入 bootstrap）。结论见 `stage-results-2026-10-21.md` §7 和 spec 0.3.7 §10.3。RT-BOOT-002 和 RT-MF-002 只保留 A5b 没有覆盖的变体。

## 1. 环境

| 项 | 值 |
|---|---|
| stage 页面 `{base}` | `https://accounts-sdk-skeleton.nl-k8s-stage.srv.local/for/web-games/account` |
| 网关 `{GW}` | `https://account-platform-gateway.nl-k8s-stage.srv.local` |
| 其他主机 | `xmts-global-api.nl-k8s-stage.srv.local`（埋点）、`store-api.nl-k8s-stage.srv.local`、`chat.nl-k8s-stage.srv.local`（chat-api）、`xsolla.partnerpage.io`（marketplace） |
| 部署构建 | `stage-web-games-20261005-03` = commit `c1b5e37`，比用例基线 `772a320` 落后 52 个 commit |
| stage 的 SDK 版本 | platform-apis 2.29.0、platform-components 4.20.1、platform-shell 2.22.1、platform-store 1.15.3。T 文件引用的是 2.29.2 / 4.20.3 / 2.22.3 / 1.15.6。依赖 SDK 源码的预期，以 stage 实测为准 |
| 默认账号 | Xsolla admin，merchant 53105，项目 317869（Test Template）。balance 为 0，没有 sales card 数据 |
| stage 缺失的功能 | 没有 MCP 登录，没有 onboarding ToU 勾选框。相关预期记 N/A |

## 2. 执行前的通用设置

1. 使用单独的 Chrome profile，只安装 Requestly。不要在日常 profile 上做。
2. DevTools › Network：勾选 **Preserve log** 和 **Disable cache**。
3. 每条开始前清理：Request blocking 列表清空并取消勾选；Sources › Overrides 中删除上一条的 override；Requestly 停用全部规则；Throttling 设回 **No throttling**。
4. 已知问题（S-35）：某个页面崩溃（“Something went wrong”）后，根级 ErrorBoundary 不会重置，之后所有路由都显示错误页。每条结束后**整页刷新**，再开始下一条。
5. 冷启动很慢：权限请求约在 19 s 后才发出，`/{m}` → `/dashboard` 约 9 s。判定“一直 loading”前至少等 60 s。
6. 证据：记录 Network 中目标请求的 URL、状态码和时间；Console 报错原文；页面上关键 `data-id` 或文案。**不要记录或截图任何 token 值**。

## 3. 执行顺序与安全规则

```mermaid
flowchart LR
  A[组 1–4、6<br>不注销的条目] --> B[带 ⚠ 的条目<br>可能注销] --> C[组 5 token<br>RT-AUTH-018]
```

- **可能注销当前会话的条目放在最后**：RT-AUTH-012、RT-ERR-007、RT-ACC-031、RT-AUTH-018。条目里标有“⚠”。注销后需要重新登录。
- **写入保护**：UTM / Upsell 相关条目（例如 RT-API-021、RT-API-022）会挂载 UpsellModal，挂载即发 `PUT handle_all_utms`。按条目中的安全规则屏蔽 `handle_all_utms` 和 `salescards/assign_to_user`，**不要在弹窗里选项目**。
- Requestly 的 Modify API Response 默认仍会把请求发到后端。需要请求不到达后端时，勾选 “Serve response without making a call to the server”，或改用 DevTools Request blocking。
- 需要其他账号或数据的条目（A2 注册未完成、A4 ToU 待签、jr-liveops、A-NOREV、有 sales card 的 merchant 等），在“账号与前置”中写明。账号不满足时记 BLOCKED，并写明缺什么。

## 4. 编写时发现的不一致（供 R8 回传 spec 会话）

以下结论来自源码阅读，**没有经过运行验证**。QA 实测结果与之不符时，以实测为准。

| ID | 类型 | 内容 |
|---|---|---|
| RT-BOOT-002 | 步骤不可行 | Offline 变体做不到：HTML 是 `no-store`，离线时整页加载不出来，到不了 init。改为记 N/A，或屏蔽整个网关主机 |
| RT-BOOT-003 | T 文件预期 | body `{"error":"x"}` 的报错是 `Unknown API response`，不是 `x`。platform-apis 的 `isApiError` 要求 `code > 299`。条目已拆成 3 个 body |
| RT-BOOT-004 | spec 差异 | 删除条目走的是“跳过”分支：warning 为 `[mf-runtime] skipping remote "communication_platform_v2" …: module not in gateway list`（`src/mf/runtime/registerGatewayRemotes.ts:48-55`），不是 spec OBS-BOOT-003 写的 throw 后 catch |
| RT-AUTH-006 | 未记录风险 | 会话有效时，b/c/d 变体可能在 `{base}/{mid}` 和 `/login` 之间来回跳（BFF 把 `/login` 302 回 `pa-original-url`）。T 文件和 OBS-AUTH-001 都没写 |
| RT-AUTH-019 | 未记录行为 | 10 s 后放行只持续到 consent 响应返回。延迟有限时（例如 15 s），响应为待签就会再跳到 `/legal-consent`。只有一直挂起才会停留。U-01 没写 |
| RT-ERR-007 | URL 待确认 | chat-api 主机为 `chat.nl-k8s-stage.srv.local`（`src/config.ts:89-93`）。路径 `/api/v2/support-hub/{mid}/notifications/status` 按 2.29.2 查到，需要在 Network 中核实 |
| RT-HOME-008 等 | U-03 可关闭 | 项目列表 URL 按基线为 `GET {GW}/mapi/merchant/merchants/{m}/projects/paged/lite`（platform-apis 2.29.2）。stage 的 SDK 较旧，以 Network 实测为准 |
| RT-ACC-031 | 账号前置缺口 | jr-liveops 定义没有要求 `transactions_registry`；`/finance` 的路由规则先于 section 规则执行（`routes/inside/finance.ts:43`），缺此权限会直接 `/forbidden` |
| RT-DASH-011 | 账号前置缺口 | 要做到“只有 header”，A-NOREV 还需至少缺一个 balance 权限（`Dashboard.tsx:44-45,82-84,159-161`） |
| RT-DASH-015 | T 文件预期可细化 | 预期“空白或 ErrorBoundary [U]”实为一行未本地化的 `Failed to load: {url}`（OBS-MF-002，`RemoteModule.tsx:115-120`），与 RT-MF-034 一致 |
| RT-ANA-007 | stage 构建差异 + 步骤问题 | c1b5e37 没有 `communication-hub.ts`，stage 不发 3002 事件，预计 N/A。另外 `XsollaAnalytics.init` 不访问 collector，block `xmts-global-api` 触发不了 init 失败，T3 的步骤到不了重试分支（772a320 上也是） |
| RT-MF-002 | T 文件依据 | “依据”列写 OBS-BOOT-001，应为 OBS-BOOT-002（spec 第 207 行） |
| RT-MF-047 | T 文件引用 | “`resolveModuleUrl` 接受 `dev`（见 RT-MF-074）”引用不准，RT-MF-074 不涉及 `dev` key |
| RT-MF-074 | T 文件缺口 | MF1 回退用的是同一个被改过的 `urls.stage`（`RemoteModule.tsx:74-80`），hub 区域会显示 `Failed to load: …/entry.js`。条目加了可选的 Redirect 规则 |
| RT-MF-076 | T 文件步骤 | runtime-core 2.9.0 通过 remoteEntry 的 `get(expose)` 取模块，只删 manifest 中的 expose 很可能不会触发回退。条目补了备选 a' |
| RT-MF-054 | 时序风险 | `PaymentsTab` 等 `currency/list` 返回才挂载，可能看到两处 `Failed to load`，而不是“一处报错一处转圈”。按实际组合记录 |
| RT-API-010 | T 文件预期 | “失败后 1 小时内不重发”与代码不符：3600 s 只缓存成功结果，表单重新挂载会重新请求（`src/core/store/api/directories.ts:25`） |
| RT-API-021 | spec + T 文件 | OBS-DASH-005（spec 第 477 行）和 T 文件的 “merchant 数” 实为 business account 数（`selectAccounts` ← `GET /api/v1/sub_sites`） |
| RT-API-022 | T 文件行号 | 调用位于 `UpsellModal/index.tsx:49-51`，不是 34-36 |
| RT-SEC-102 | stage 构建差异 | `catalog-identity.ts` 只在 772a320；预期第二句在 stage 上记 N/A。`gc-pa-v4-token` 是 JS 可读 cookie，host 鉴权用内存 token，删除不会注销 |
| RT-SEC-105 | T 文件措辞 | “可顶层导航（top.location）”偏强：Chrome 对跨域 iframe 改顶层地址有 framebusting 限制，需要用户激活 |
| A5a | 来源更正 | “admin 切到其他 merchant 再进财务页”出自 `stage-results-2026-10-21.md:212`，不是 spec 第 382 行。机制与 RT-ERR-006 相同，可同一次执行 |
| RT-ERR-002 | T 文件文案 | 错误页按钮文案是 “Go to homepage”，不是 T1 第 132 行写的 “To homepage”（c1b5e37 `src/locales/en.json:115`；R1 RT-NAV-030 实测）。2026-10-22 独立 review 发现 |
| 多条 | 行号小差异 | `gateway-instance.ts` 77-80→77-79、85-90→85-89；`route-access.ts` 136-142→136-139；platform-store `slices/user.ts` 145-172→148-170 |

## 5. 结果汇总（QA 填写）

| 组 | PASS | FAIL | BLOCKED | N/A |
|---|---|---|---|---|
| 1 blocking | | | | |
| 2 override | | | | |
| 3 status | | | | |
| 4 throttle | | | | |
| 5 token | | | | |
| 6 console | | | | |

执行时间范围（UTC）：____ ｜ 执行人：____ ｜ Chrome 版本：____ ｜ Requestly 版本：____

## 索引（按 ID）

| ID | 场景（优先级） | 所在组 |
|---|---|---|
| RT-BOOT-002 | 模块列表失败导致白屏（P1） | 组 1：Request blocking / 网络失败 |
| RT-BOOT-003 | 模块列表 200 但 body 格式错误（P2） | 组 2：Local overrides / 改响应 body |
| RT-BOOT-004 | MF 2.0 注册失败不阻断启动（P2） | 组 2：Local overrides / 改响应 body |
| RT-AUTH-006 | `/server/token` 回退和失败（P1） | 组 2：Local overrides / 改响应 body |
| RT-AUTH-011 | 403 不注销（P1） | 组 3：改状态码 |
| RT-AUTH-012 | 匿名请求返回 401 不注销（P2） | 组 3：改状态码 |
| RT-AUTH-018 | 加载时 cookie 已过期或是伪造的（P1） | 组 5：伪造、过期或删除 token / cookie |
| RT-AUTH-019 | ToU 待签跳转与 10 s fail-open（P1） | 组 4：Throttling / 延迟 / 挂起 |
| RT-MAG-007 | merchant 水合失败时 fail-open（P2） | 组 3：改状态码 |
| RT-ERR-001 | 水合失败显示错误页（P1） | 组 3：改状态码 |
| RT-ERR-002 | 错误页的“回到首页”按钮（P2） | 组 3：改状态码 |
| RT-ERR-006 | S-04 权限获取失败导致永久 loading（P1） | 组 3：改状态码 |
| RT-ERR-007 | 非 gateway 实例返回 401 时没有全局处理（P2） | 组 3：改状态码 |
| RT-ACC-002 | 权限加载期间显示 loader（P1） | 组 4：Throttling / 延迟 / 挂起 |
| RT-ACC-003 | 权限请求失败后永久 loading（P1） | 组 1：Request blocking / 网络失败 |
| RT-ACC-031 | features 未就绪时 section 规则放行（P2） | 组 4：Throttling / 延迟 / 挂起 |
| RT-PROJ-006 | 项目列表加载失败（P1） | 组 1：Request blocking / 网络失败 |
| RT-HOME-008 | projects 请求失败（P2） | 组 1：Request blocking / 网络失败 |
| RT-HOME-009 | 慢网下不提前跳转（P2） | 组 4：Throttling / 延迟 / 挂起 |
| RT-DASH-003 | balance 请求失败（P1） | 组 1：Request blocking / 网络失败 |
| RT-DASH-004 | balance 加载中与重新请求中（P2） | 组 4：Throttling / 延迟 / 挂起 |
| RT-DASH-011 | projects 请求失败时只看角色（P2） | 组 1：Request blocking / 网络失败 |
| RT-DASH-015 | XAA remote 失败不影响页面（P1） | 组 1：Request blocking / 网络失败 |
| RT-UI-011 | LiveChat 脚本失败（P1） | 组 1：Request blocking / 网络失败 |
| RT-UI-014 | LiveChat 等待应用加载（P2） | 组 4：Throttling / 延迟 / 挂起 |
| RT-ANA-007 | 3002 初始化失败后重试（P2） | 组 1：Request blocking / 网络失败 |
| RT-MF-002 | 模块列表失败白屏：未覆盖变体（P0） | 组 2：Local overrides / 改响应 body |
| RT-MF-003 | 模块列表慢：无超时（P1） | 组 4：Throttling / 延迟 / 挂起 |
| RT-MF-034 | Dashboard 中 xaa 加载失败不影响余额区（P1） | 组 1：Request blocking / 网络失败 |
| RT-MF-040 | remote 不可达（P1） | 组 1：Request blocking / 网络失败 |
| RT-MF-041 | remote 返回 404（P1） | 组 2：Local overrides / 改响应 body |
| RT-MF-042 | 脚本 200 但不是该 container（P2） | 组 2：Local overrides / 改响应 body |
| RT-MF-043 | 加载超时（无超时机制）（P1） | 组 4：Throttling / 延迟 / 挂起 |
| RT-MF-044 | gateway 缺少条目，回退静态 URL（P1） | 组 2：Local overrides / 改响应 body |
| RT-MF-045 | gateway 条目 scope 为占位值（P2） | 组 2：Local overrides / 改响应 body |
| RT-MF-046 | gateway-only remote 缺少条目：永久 spinner（P1） | 组 2：Local overrides / 改响应 body |
| RT-MF-047 | gateway 条目没有 stage key（P2） | 组 2：Local overrides / 改响应 body |
| RT-MF-048 | 失败后离开再返回会重试（P2） | 组 1：Request blocking / 网络失败 |
| RT-MF-050 | S-02 定向复现：funding nav + App 同时挂载时加载失败（P1） | 组 1：Request blocking / 网络失败 |
| RT-MF-051 | S-02 的轮询泄漏（P2） | 组 1：Request blocking / 网络失败 |
| RT-MF-052 | 两个 tab 同时加载同一 remote（P2） | 组 1：Request blocking / 网络失败 |
| RT-MF-054 | webhooks 页 payments 页签与高级设置是否同时挂载（P2） | 组 1：Request blocking / 网络失败 |
| RT-MF-071 | AC-11：manifest 不可达时回退 MF1（P1） | 组 1：Request blocking / 网络失败 |
| RT-MF-072 | MF2 manifest 挂起：无超时（P2） | 组 4：Throttling / 延迟 / 挂起 |
| RT-MF-073 | MF2 remoteEntry 超时 20 s 后回退（P2） | 组 4：Throttling / 延迟 / 挂起 |
| RT-MF-074 | gateway URL 不以 remoteEntry.js 结尾：跳过注册（P2） | 组 2：Local overrides / 改响应 body |
| RT-MF-075 | MF2 与 MF1 都不可达（P2） | 组 1：Request blocking / 网络失败 |
| RT-MF-076 | 加载阶段失败与 provider.render 同步抛错时回退 MF1（P2） | 组 2：Local overrides / 改响应 body |
| RT-FRAME-002 | S-03 allowlist 四种绕过（P1） | 组 2：Local overrides / 改响应 body |
| RT-FRAME-003 | 非 allowlist 域名（P1） | 组 2：Local overrides / 改响应 body |
| RT-FRAME-004 | 误拒：大写主机或 http（P2） | 组 2：Local overrides / 改响应 body |
| RT-FRAME-007 | 步骤不存在或无 url（P2） | 组 2：Local overrides / 改响应 body |
| RT-FRAME-021 | marketplace 不可达（P2） | 组 1：Request blocking / 网络失败 |
| RT-FRAME-032 | ontology URL 缺失或非 https（P2） | 组 2：Local overrides / 改响应 body |
| RT-FRAME-033 | ontology 依赖请求失败时重定向（P2） | 组 1：Request blocking / 网络失败 |
| RT-FRAME-041 | Tax interview exitConfirmed 与 origin 校验（P2） | 组 6：跨域 iframe 的 Console 上下文 |
| RT-FRAME-042 | Documents 上传消息：/documents 与 /finance/boxnet（P2） | 组 6：跨域 iframe 的 Console 上下文 |
| RT-API-002 | 余额 4xx（403/404）（P1） | 组 3：改状态码 |
| RT-API-003 | 余额 5xx / 网络失败（P1） | 组 3：改状态码 |
| RT-API-010 | 国家列表成功与失败（P2） | 组 2：Local overrides / 改响应 body |
| RT-API-021 | UTM 卡片查询失败 / 单 merchant 单项目（P2） | 组 3：改状态码 |
| RT-API-022 | handle_all_utms 失败：只把响应改 500，请求本身仍会到达后端吗？（P2） | 组 3：改状态码 |
| RT-API-041 | currency 列表失败（P2） | 组 3：改状态码 |
| RT-API-051 | store features 4xx/5xx/401/网络失败（P2） | 组 3：改状态码 |
| RT-SEC-102 | S-01 每次 render 重写 gc-pa-v4-token（P1） | 组 5：伪造、过期或删除 token / cookie |
| RT-SEC-105 | S-03 钓鱼 iframe 的安全影响（P1） | 组 2：Local overrides / 改响应 body |
| RT-REG-014 | 国家列表加载与禁用态（P1） | 组 4：Throttling / 延迟 / 挂起 |
| RT-REG-015 | 国家列表请求失败（P2） | 组 1：Request blocking / 网络失败 |
| RT-REG-027 | merchant 数据加载失败（P2） | 组 1：Request blocking / 网络失败 |
| RT-CONSENT-013 | 同意状态请求失败或超时（P2） | 组 1：Request blocking / 网络失败 |
| A5a | S-04 权限请求失败（财务页）（P1） | 组 3：改状态码 |

## 组 1：Request blocking / 网络失败（23 条）

### RT-BOOT-002 · 模块列表失败导致白屏（P1）
<!-- group: blocking -->
- **账号与前置**：A1（owner，只有 1 个 org，已登录）；可用默认 QA 账号替代（Xsolla admin，merchant 53105，项目 317869），本用例不受 admin 身份影响。先在正常状态下打开 `{base}/53105`，确认能进入 dashboard。已由 A5b 覆盖 abort/500 场景（匿名会话、登录页入口）；本条只保留未覆盖的变体：**已登录会话 + merchant 深链入口**。
- **工具配置**：
  - DevTools：Network › Request blocking（More tools › Network request blocking），勾选 Enable network request blocking，添加 pattern `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`。
  - Requestly（备选）：Cancel Request 规则，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`。
  - Offline 变体：Network › Throttling 选 Offline（见步骤 5 的说明）。
- **步骤**：
  1. 清理：清空 Request blocking 列表；停用所有 Requestly 规则；Sources › Overrides 取消勾选 Enable Local Overrides；Network › Throttling 设为 No throttling；勾选 Preserve log 和 Disable cache。
  2. 以 A1 登录，打开 `{base}/53105`，确认正常进入。
  3. 启用上面的 blocking pattern，硬刷新（Cmd+Shift+R）`{base}/53105`，等待 20 s。
  4. 观察：Elements 中 `#root` 是否没有子节点；Console 是否有 `Uncaught (in promise) Error: Failed to initialize application: …`；Network 中 `/api/v1/modules` 是否只出现 1 次（无重试），且没有 `/server/token` 和 `get_init_info` 请求。
  5. Offline 变体：先关闭 blocking，Throttling 设为 Offline，硬刷新。说明：HTML 响应为 `Cache-Control: no-store`，Offline 下 document 本身无法加载，预计看到浏览器的离线错误页，而不是应用白屏。若如此，此变体记 N/A，并在证据中注明“document 未加载”。可改为在 Request blocking 中屏蔽整个网关主机 `*://account-platform-gateway.nl-k8s-stage.srv.local/*` 作为替代。
  6. 撤销：清空 Request blocking 列表，Throttling 恢复 No throttling，硬刷新 `{base}/53105`，确认恢复正常。
- **预期**：**当前**：`#root` 为空，白屏；Console 出现 `Uncaught (in promise) Error: Failed to initialize application: …`；没有重试；不发 `/server/token`，也不发 `get_init_info`。**修复后**：显示错误页，并提供重试。
- **核对**：spec 0.3.7 一致（OBS-BOOT-002，第 207–208 行；§8.3 第 917 行；A5b 表第 1112 行已证实匿名入口）。stage 构建：`src/init.tsx`、`public/index.html` 在 c1b5e37 与 772a320 之间相同，无差异。T 文件问题：Offline 变体在 no-store HTML 下无法到达 init 阶段，不能验证 OBS-BOOT-002。
- **代码位置**：OBS-BOOT-002；`src/init.tsx:29-31`；`public/index.html:9`（`#root` 为空）
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ACC-003 · 权限请求失败后永久 loading（P1）
<!-- group: blocking -->
- **账号与前置**：owner 级全权限账号。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）；需持有 `get_merchant_boxnet_url`。已登录 {base}，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking（Drawer：⋮ › More tools › Network request blocking；新版 Chrome 名为 Request conditions），勾选 Enable network request blocking，添加 pattern `*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/*/privileges*`。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Wildcard，pattern 同上。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 添加上面的 block 规则并启用。
  3. ① 地址栏直接打开 `{base}/53105/documents`（整页加载）。确认 Network 中 `…/privileges` 显示 `(blocked:devtools)` 或 failed；等待 30 秒，确认页面一直显示 `route-privileges-loader`，且没有第二次 `…/privileges` 请求。
  4. ② 不刷新，在 SPA 内点到 Get Started（`/53105/get-started`），确认页面正常渲染。
  5. ③ 在 Request blocking 中取消勾选该 pattern（或停用 Requestly 规则），**不刷新**，在侧边栏点 Documents。确认仍是 loader，且 Network 中没有新的 `…/privileges` 请求。
  6. ④ 整页刷新（Cmd+Shift+R），确认 `…/privileges` 返回 200，Documents 页正常显示。
  7. 撤销：清空 Request blocking 列表，停用 Requestly 规则。
- **预期**：**当前**：① 一直显示 loader，没有重试请求；② 正常渲染；③ 仍是 loader；④ 恢复正常。
- **核对**：spec 0.3.7 一致（§4.5 OBS-ACC-002：settled empty 后整个会话保留 loader，SDK 不重试；§10.3 S-04 行记为“未执行，仍只有源码证据”，§11 缺陷表 S-04）。与 RT-ERR-006 / A5a 同属 S-04，可同一次执行（RT-ERR-006 用 500 状态码代替 block）。stage 构建差异：host 侧 `route-access.ts` 两版相同；`loadPrivileges` 在 platform-store 中，stage 是 1.15.3，基线行号 `index.mjs:2484-2490` 对应 1.15.6，本地无法核对 1.15.3 是否同样不重试。
- **代码位置**：OBS-ACC-002、S-04；`route-access.ts:136-141`；platform-store `loadPrivileges`（`index.mjs:2484-2490`）
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-PROJ-006 · 项目列表加载失败（P1）
<!-- group: blocking -->
- **账号与前置**：owner 级账号。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。T2 用例中的 `/{m}/projects/45` 在此账号上写作 `/53105/projects/317869`。已登录 {base}，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/*/projects/paged/lite*`。这是基线 SDK（platform-store 1.15.6 `fetchLiteProjectsToState` → platform-apis 2.29.2 `getMerchantProjectsPaged(…, lite=true)`）的接口。stage 用的是 platform-store 1.15.3，执行前先在 Network 中确认实际 URL；如果不是 `/projects/paged/lite`，候选为 `*/api/project/*/lite*`（platform-apis `fetchProjectsLite`）。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Wildcard，pattern 同上。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 不加规则，先打开一次 `{base}/53105/projects/317869`，在 Network 中确认项目列表请求的实际 URL。
  3. 添加上面的 block 规则并启用。
  4. 地址栏直接打开 `{base}/53105/projects/317869`，硬刷新。确认 Elements 中有 `data-id="project-required-error"` 和 Retry 按钮；等待 30 秒，确认 Network 中没有自动重发的项目列表请求。
  5. 在 Request blocking 中取消勾选该 pattern（或停用 Requestly 规则），点 Retry。确认发出一次新的项目列表请求并返回 200，项目页正常渲染。
  6. 撤销：清空 Request blocking 列表，停用 Requestly 规则。
- **预期**：**当前**：显示 `data-id="project-required-error"` 和 Retry，不自动重试；Retry 后渲染页面。
- **核对**：spec 0.3.7 一致（§4.8 OBS-PROJ-001 第 2 点：列表失败显示 `ProjectLoadError` 和 Retry）。block 该 URL 也会让 topbar / 侧边栏中其他使用 lite 列表的组件失败，属于预期副作用。stage 构建差异：`ProjectRequiredRoute.tsx` 两版相同；SDK 版本不同（见工具配置），项目列表 URL 以 stage Network 为准。
- **代码位置**：OBS-PROJ-001；`ProjectRequiredRoute.tsx:40-49,122-126,149-151`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-HOME-008 · projects 请求失败（P2）
<!-- group: blocking -->
- **账号与前置**：A-OWNER（有 dashboard 访问），已有 setup selection。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。确认 selection：Application › Local Storage › {base} 的 origin 下有键 `web-games:setup-selection:{siteId 或 default}:53105`，值为 `gamesPortal` 或 `additionalServices`；没有时先在 `/53105/get-started` 选一次场景。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/*/projects/paged/lite*`（也可在 Network 中右键该请求 › Block request URL）。URL 依据：DynamicHome 读的 `selectProjects` / `selectProjectsError` 由 platform-store `fetchLiteProjectsToState` 填充（`useInitializeUser` 在加载时发起），接口为 platform-apis 2.29.2 `getMerchantProjectsPaged(…, lite=true)`。stage 是 platform-store 1.15.3，先在 Network 确认；如不同，候选为 `*/api/project/*/lite*`。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Wildcard，pattern 同上。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 不加规则，打开 `{base}/53105`，确认落到 `/53105/dashboard`（证明 selection 与权限满足），并在 Network 中确认项目列表请求的实际 URL。
  3. 添加 block 规则并启用。
  4. 硬刷新打开 `{base}/53105`。
  5. 记录最终 URL；确认没有经过 `/forbidden`（Preserve log 下检查地址变化），页面不是一直转圈。
  6. 撤销：清空 Request blocking 列表，停用 Requestly 规则，刷新确认回到 `/53105/dashboard`。
- **预期**：**当前**：落到 `/{m}/get-started`，不跳 `/forbidden`，不无限 loading。
- **核对**：spec 0.3.7 一致（§4.6 OBS-HOME-001：projects request error → `/{m}/get-started`）。T3 写“URL 待确认，见 U-03”：按基线代码已能确认为 `GET {gateway}/mapi/merchant/merchants/{m}/projects/paged/lite?page=1&limit=…`（platform-apis 2.29.2 `index.mjs:1341-1350`，platform-store 1.15.6 `index.mjs:952-975,3973`）；spec §12 U-03 仍为“部分关闭”。stage 构建差异：`DynamicHome/index.tsx` 两版相同；SDK 版本不同，URL 以 stage Network 为准。
- **代码位置**：OBS-HOME-001 H2；`DynamicHome/index.tsx:71-73`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-DASH-003 · balance 请求失败（P1）
<!-- group: blocking -->
- **账号与前置**：A-OWNER（持有 `get_metric_balance` 与 `get_metric_transactions_count`）。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。注意：默认账号 balance 为 0，不 block 时也显示 Ask AI 横幅，所以本条在默认账号上主要靠 Balance “—”（正常时显示金额 0.00）和 payout 日期 “—” 判定；如有余额 > 0 且有 `last_transfer_date` 的 A-OWNER，可同时验证横幅从欢迎语变为 Ask AI。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/*/analytics/metrics/balance*`。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Wildcard，pattern 同上。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 不加规则打开 `{base}/53105/dashboard`，记录正常状态（Balance 数值、Last/Next payout、header）。
  3. 添加 block 规则并启用，硬刷新 Dashboard。
  4. 确认：header 是 Ask AI 横幅；Balance 显示 “—”；Last payout 与 Next payout 都是 “—”；鼠标悬停这些值时没有 tooltip；sidebar、XAA board 等其余部分正常。
  5. 撤销：清空 Request blocking 列表，停用 Requestly 规则。
- **预期**：**当前**：显示 Ask AI 横幅；Balance 显示 “—”；Last/Next payout 都是 “—”；没有 tooltip；页面其余部分正常。
- **核对**：spec 0.3.7 一致（§4.7 OBS-DASH-003：balance 请求失败按“无交易”处理，显示 `AskAiBanner`；OBS-DASH-004：出错时显示 “—”）。“没有 tooltip” spec 未写，按代码判定。stage 构建差异：`Dashboard.tsx`、`DashboardBalance/index.tsx`、`core/apis/dashboard.ts` 两版相同。
- **代码位置**：OBS-DASH-003/004；`DashboardBalance/index.tsx:24-27,56-60`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-DASH-011 · projects 请求失败时只看角色（P2）
<!-- group: blocking -->
- **账号与前置**：A-NOREV（非 junior，缺 `get_graphics_gross_revenue`）与 A-JUNIOR（`ROLE_JUNIOR_DEVELOPER`），两者都有项目（T3 §7，待 QA 提供）。A-NOREV 还必须缺至少一个 balance 权限（`get_metric_balance` 或 `get_metric_transactions_count`），否则页面会显示 Balance 区和 XAA board，而不是“只有 header”。默认 admin 账号不适用。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/*/projects/paged/lite*`（同 RT-HOME-008；stage SDK 为 1.15.3，先在 Network 确认实际 URL，候选 `*/api/project/*/lite*`）。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Wildcard，pattern 同上。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 用 A-NOREV 登录。添加 block 规则并启用。硬刷新打开 `{base}/{m}/dashboard`。确认 URL 停在 `/{m}/dashboard`，页面只有 header（欢迎语或 Ask AI 横幅），没有 Balance 区和 board。
  3. 停用规则，退出登录，用 A-JUNIOR 登录。重新启用 block 规则。硬刷新打开 `{base}/{m}/dashboard`。确认 URL 变为 `/forbidden`。
  4. 撤销：清空 Request blocking 列表，停用 Requestly 规则。
- **预期**：**当前**：A-NOREV **停留在** Dashboard（只有 header，因为没有 dashboard 权限）；A-JUNIOR 跳 `/forbidden`。
- **核对**：spec 0.3.7 一致（§4.7 OBS-DASH-001：projects 请求失败时只做 junior 角色检查）。账号前置缺口：T3 §7 的 A-NOREV 只要求缺 gross revenue；“只有 header”还要求缺至少一个 balance 权限（`Dashboard.tsx:44-45,82-84,159-161`，`hasDashboardPrivileges = balance 两项 || gross revenue`）。stage 构建差异：`Dashboard.tsx`、`dashboardAccess.ts` 两版相同；项目列表 URL 以 stage Network 为准。
- **代码位置**：OBS-DASH-001（v0.2.0 新增分支）；`Dashboard.tsx:137-139`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-DASH-015 · XAA remote 失败不影响页面（P1）
<!-- group: blocking -->
- **账号与前置**：A-OWNER（持有两个 balance 权限或 gross revenue，Dashboard 会嵌入 XAA board）。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*/xaa-widgets/mf/remoteEntry.js*`。主机名由 `GET https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules` 中 `xaa_widgets` 条目的 `urls.stage` 决定；执行前在 Network 中过滤 `remoteEntry` 确认完整 URL，可改用完整 URL 作为 pattern。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Contains `xaa-widgets/mf/remoteEntry.js`。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 不加规则打开 `{base}/53105/dashboard`，在 Network 中确认 xaa remoteEntry 的完整 URL，记录 board 正常显示。
  3. 添加 block 规则并启用，硬刷新 Dashboard。
  4. 确认 header 与 Balance 区正常；记录 board 区域的实际 UI（空白、ErrorBoundary 降级，或 `Failed to load: <url>` 文本），截图作为证据。
  5. 撤销：清空 Request blocking 列表，停用 Requestly 规则，刷新确认 board 恢复。
- **预期**：**当前**：header、Balance 区正常；board 区域空白或显示 SDK ErrorBoundary 降级（UI 由 SDK 决定 [U]）。
- **核对**：spec 0.3.7 一致，且更具体：§4.13 OBS-MF-002 规定 remote 加载失败时渲染未本地化的 `<p>`，脚本加载失败的文本为 `Failed to load: {url}`（`RemoteModule.tsx:115-120`，`loadModule.ts:56`）。T3 预期中的“空白或 ErrorBoundary 降级 [U]”可收窄为该文本；T4 RT-MF-034 已写为 `Failed to load: <url>`。stage 构建差异：`XAAWidgets/index.tsx`、`RemoteModule.tsx`、`loadModule.ts` 非测试代码两版相同。
- **代码位置**：OBS-DASH-004；`XAAWidgets/index.tsx:37`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-UI-011 · LiveChat 脚本失败（P1）
<!-- group: blocking -->
- **账号与前置**：A-OWNER。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*://chat.nl-k8s-stage.srv.local/communication-hub/widget/livechat-iframe.js*`（stage 默认 `livechatWidgetUrl`，`config.ts:79-84`；构建时可被 `LIVECHAT_WIDGET_URL` 覆盖，执行前在 Network 过滤 `livechat-iframe` 确认实际主机）。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Contains `livechat-iframe.js`。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 不加规则打开 `{base}/53105/dashboard`，确认 `livechat-iframe.js` 的实际 URL，记录 sidebar 中正常的 Chat 按钮。
  3. 添加 block 规则并启用，硬刷新。
  4. 展开态 sidebar：确认显示禁用的 “Chat” 按钮（`#livechat-bap-expanded` 内的 button 带 `disabled`）。
  5. 折叠 sidebar：确认 Chat 按钮也是禁用的（`#livechat-bap-collapsed` 带 `disabled`）。
  6. 确认页面其余部分正常。
  7. 撤销：清空 Request blocking 列表，停用 Requestly 规则，刷新确认 Chat 恢复；必要时把 sidebar 恢复为展开。
- **预期**：**当前**：sidebar 展开态显示禁用的 “Chat” 按钮；折叠态的 Chat 按钮也禁用；页面其余部分正常。
- **核对**：spec 0.3.7 一致（§4.15 OBS-UI-003：脚本失败时显示禁用的 Chat 按钮）。stage 构建差异：`LiveChat/LiveChat.tsx` 与 `config.ts` 的 livechat 段两版相同。
- **代码位置**：OBS-UI-003；`LiveChat/LiveChat.tsx:167-178,185-223`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ANA-007 · 3002 初始化失败后重试（P2）
<!-- group: blocking -->
- **账号与前置**：A-OWNER-NEW（balance 为 0 或无 `last_transfer_date`，Dashboard 显示 Ask AI 横幅）。默认 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）满足该条件。已登录，DevTools 打开，Console 保留日志（Preserve log），Network 勾选 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，添加 pattern `*://xmts-global-api.nl-k8s-stage.srv.local/*`。
  - Requestly（替代方案）：规则类型 Cancel Request；URL 匹配 Wildcard，pattern 同上。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. stage 预检：打开 `{base}/53105/dashboard`，在 Ask AI 横幅点一个示例问题，看 Console 是否出现 `[communication-hub-analytics] elementClick`。不出现，说明 stage 构建（c1b5e37）没有 3002 埋点，本条记 N/A，跳过后续步骤。
  3. 添加 block 规则并启用，刷新 Dashboard。
  4. 在 Ask AI 输入框输入一个问题并发送。记录 Console 是否出现 `console.error` `[communication-hub-analytics] Metrika init failed`，以及页面是否照常跳到聊天页。
  5. 回到 Dashboard（不刷新页面）。在 Request blocking 中取消勾选该 pattern，再发一次问题。记录 Network 中是否出现发往 `xmts-global-api.nl-k8s-stage.srv.local` 的 3002 事件请求。
  6. 撤销：清空 Request blocking 列表，停用 Requestly 规则。
- **预期**：**当前**：2：console.error `[communication-hub-analytics] Metrika init failed`，跳转照常；3：重新初始化并发送。
- **核对**：spec 0.3.7 没有对应描述（OBS-ANA-001/002 只写 counter 与事件内容，没有写 init 失败重试）。stage 构建差异：`src/core/utils/analytics/communication-hub.ts` 在 c1b5e37 中不存在，`AskAiBanner/index.tsx` 在 c1b5e37 中也没有调用 `trackPromptClick` / `trackSendQuestionClick`，所以 stage 上不发 3002 事件，本条预计为 N/A。步骤问题（基线也成立）：`@xsolla/metrika` 2.11.0 的 `XsollaAnalytics.init` 不访问 collector（只做 fingerprint 与 adblock 检测），block `xmts-global-api` 只会让事件发送失败，不会触发 `Metrika init failed`；要验证重试分支，需要用其他方法让 `init` 抛错。
- **代码位置**：`communication-hub.ts:72-101`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-034 · Dashboard 中 xaa 加载失败不影响余额区（P1）
<!-- group: blocking -->
- **账号与前置**：同 RT-MF-029：有 `GetMetricBalance` 的 owner 级账号。默认用 Xsolla admin，merchant 53105，项目 317869；若不屏蔽时余额区也不显示，本条记 BLOCKED。Chrome 已连内网，已登录 `{base}`。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking（More tools › Network request blocking），勾选 Enable network request blocking，添加 pattern `*xaa-widgets/mf/remoteEntry.js*`。
  - Requestly（替代）：规则类型 Cancel Request（Block）；URL 匹配 Contains `xaa-widgets/mf/remoteEntry.js`。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override；Throttling 设为 No throttling。
  2. 不屏蔽，打开 `{base}/53105/dashboard`。Network 过滤 `remoteEntry`，确认 xaa 的请求 URL 含 `xaa-widgets/mf/remoteEntry.js`。若实际路径不同，用实际 URL 去掉 `?v=…` 后的部分作为 pattern。
  3. 加上屏蔽规则，硬刷新 `{base}/53105/dashboard`，等待 15 s。
  4. 检查余额区（余额数字、上次/下次 payout 日期）是否正常显示。在 Elements 中搜索 `Failed to load`，确认文本位于 XAA 插槽（`dashboard-balance__analytics` 容器内），记录完整文本。
  5. 撤销：清空 Request blocking（或停用 Requestly 规则），整页刷新，确认 XAA 正常显示。
- **预期**：**当前**：余额区正常显示；XAA 插槽显示未本地化的 `Failed to load: <url>`。
- **核对**：spec 0.3.7 一致（OBS-MF-002，第 620 行：未本地化 `<p>` 显示 `Failed to load: {url}`，URL 不含 `?v=`）。stage 构建差异：`pages/Dashboard.tsx`、`components/Dashboard/XAAWidgets/index.tsx`、`modules/loadModule.ts`、`modules/RemoteModule.tsx` 在 c1b5e37 与 772a320 之间没有改动；c1b5e37 中 XAA 仍挂在 `Dashboard.tsx:175-177`。
- **代码位置**：OBS-MF-002；`pages/Dashboard.tsx:175-177`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-040 · remote 不可达（P1）
<!-- group: blocking -->
- **账号与前置**：能打开目标路由的账号。默认用 Xsolla admin，merchant 53105，项目 317869；目标 remote 用 sdk-integration，路由 `{base}/53105/projects/317869/sdk/integration`（exact）。若该路由在此账号上打不开，改用任一 stage 上观察过的 MF1 remote（例如 cloud-gaming `{base}/53105/projects/317869/cloud-gaming`，pattern `*remoteEntry.dashboard.js*`），在证据中写明。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，勾选 Enable network request blocking，添加 pattern `*sdk-intergration-widget.nl-k8s-stage.srv.local/assets/remoteEntry.js*`（主机名拼写是 `intergration`）。若第 2 步复制的 URL 不同，以复制的 URL 去掉 `?v=` 部分为准。
  - Requestly（替代）：Cancel Request 规则，URL Contains `sdk-intergration-widget.nl-k8s-stage.srv.local/assets/remoteEntry.js`。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override；Throttling 设为 No throttling。
  2. 不屏蔽，打开目标路由。Network 过滤 `remoteEntry`，复制该 remote 的 remoteEntry URL，去掉 `?v=` 部分。
  3. 把该 URL 加入 Request blocking，硬刷新目标路由。
  4. 检查 remote 区域文本：无样式、未本地化，`<url>` 不含 `?v=`。
  5. 等待 2 分钟，确认没有超时提示、没有重试按钮，文本不变。
  6. 点击侧边栏任一项与顶栏控件，确认可用（随后用浏览器后退回到目标路由）。
  7. Console 执行 `[...document.head.querySelectorAll('script')].map(s => s.src).filter(s => s.includes('remoteEntry'))`，确认失败的 `<script>`（带 `?v=`）仍在 `<head>` 中。
  8. 若接着做 RT-MF-048，保持当前状态；否则撤销：清空 Request blocking，整页刷新，确认 remote 正常显示。
- **预期**：**当前**：1. remote 区域显示无样式、未本地化的 `<p>Failed to load: <url></p>`，`<url>` 不含 `?v=`。2. 没有超时、没有重试按钮。3. 侧边栏、顶栏可用。4. `<head>` 中留下失败的 `<script>`。
- **核对**：spec 0.3.7 一致（OBS-MF-002，第 620–629 行：`Failed to load: {url}`，URL 不含 `?v=`，“There is no timeout and no retry”）。stage 构建差异：`modules/loadModule.ts`、`modules/RemoteModule.tsx` 在 c1b5e37 与 772a320 之间没有改动；sdk-integration 的 stage 静态 URL（`src/config.ts:51`）两版相同。
- **代码位置**：OBS-MF-002；`loadModule.ts:54-57`；`RemoteModule.tsx:115-121`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-048 · 失败后离开再返回会重试（P2）
<!-- group: blocking -->
- **账号与前置**：RT-MF-040 第 7 步结束时的状态：同一 tab、同一文档，目标 remote 显示 `Failed to load: …`，Request blocking 中仍有该 remoteEntry pattern。Network 保持 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，取消勾选该 pattern（或取消 Enable network request blocking）。不整页刷新。
  - Requestly（若 RT-MF-040 用的是 Requestly）：停用该 Cancel Request 规则。
- **步骤**：
  1. 在失败页面取消屏蔽（不刷新）。
  2. 用侧边栏离开到另一页（例如 Dashboard），再用侧边栏返回目标路由；侧边栏没有该入口时，用浏览器后退/前进（SPA 内导航，不整页刷新）。
  3. Network 过滤 `remoteEntry`，确认出现一次新的请求，`?v=<uuid>` 与失败那次不同，状态 200。
  4. 确认 remote 正常渲染；Console 执行 `[...document.head.querySelectorAll('script')].map(s => s.src).filter(s => s.includes('remoteEntry'))`，应看到失败和成功两条 script。
  5. 撤销：清空 Request blocking，整页刷新。
- **预期**：**当前**：重新注入新 `?v=<uuid>` 的 script 并成功渲染。
- **核对**：spec 0.3.7 一致（§8.2 第 906 行：失败之后才挂载的调用者会正常重试；OBS-MF-002 的 “no retry” 指同一挂载内不自动重试）。stage 已有旁证：A4 在 funding 上离开再返回时注入次数变为 2（stage-results 第 211 行）。stage 构建差异：`modules/loadModule.ts` 两版相同。
- **代码位置**：`loadModule.ts:55`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-050 · S-02 定向复现：funding nav + App 同时挂载时加载失败（P1）
<!-- group: blocking -->
- **账号与前置**：T 文件要求 owner；默认用 Xsolla admin，merchant 53105，项目 317869（`/53105/funding` 无 privilege 要求；A4 用的是 `/projects/317869/funding`）。装好 React DevTools。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，勾选 Enable network request blocking，添加 pattern `*funding-developer-account.js*`（stage 的 funding 入口文件不是 `remoteEntry.js`，主机为 `developer-account-stage…`；以第 1 步记下的 URL 为准）。
  - Requestly（替代）：Cancel Request 规则，URL Contains `funding-developer-account.js`。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override。不屏蔽，打开 `{base}/53105/funding`，在 Network 中记下 funding remoteEntry URL（去掉 `?v=`）。
  2. 把该 URL 加入 Request blocking。
  3. 硬刷新 `{base}/53105/funding`，等待 30 s。
  4. 在 Elements 中查看 funding 的 nav 区域与 App 区域；用 React DevTools 搜索 `RemoteModuleComponent`，找到 `exposedModule="./nav"` 的实例和不带 `exposedModule` 的实例，分别确认各自渲染的是错误 `<p>` 还是 spinner。Network 中确认 `funding-developer-account.js` 只请求 1 次。
  5. 若接着做 RT-MF-051，保持屏蔽；否则撤销：清空 Request blocking，整页刷新。
- **预期**：**当前（缺陷）**：nav 位置显示 `<p>Failed to load: <url></p>`；App 位置**永久 spinner**，30 s 后仍在。**修复后**：App 也显示错误或可重试，不允许永久 spinner。
- **核对**：spec 0.3.7 一致（§8.2 第 906 行与风险表第 1142 行 S-02；第 820 行 funding 是稳定复现路径）。stage 已有部分证据：A4 观察到 1 处报错加 1 个持续转圈，但没有确认分别位于 nav 区和 App 区（stage-results 第 211 行），本条补这一点。stage 构建差异：`modules/loadModule.ts`、`layouts/Funding/index.tsx` 两版相同。
- **代码位置**：S-02；`loadModule.ts:22-31`；`Funding/index.tsx:115-130` `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-051 · S-02 的轮询泄漏（P2）
<!-- group: blocking -->
- **账号与前置**：RT-MF-050 第 4 步结束时的状态：`{base}/53105/funding` 上 nav 报错、App 一直转圈，Request blocking 中 `*funding-developer-account.js*` 仍生效。
- **工具配置**：
  - DevTools：保持 Network › Request blocking 中的 `*funding-developer-account.js*`；使用 Performance 面板录制。
  - Requestly（若 RT-MF-050 用的是 Requestly）：保持 Cancel Request 规则启用。
- **步骤**：
  1. 保持屏蔽，用侧边栏离开 funding 页（例如进入 Dashboard），不刷新。
  2. 打开 Performance 面板，点 Record，录制 5 s 后停止。
  3. 在 Main 轨道中查找约每 50 ms 一次的 `Timer Fired` 事件；点开事件，确认其回调来自 host 的 remote 加载代码（`setInterval` 回调，检查 `window[containerName]`）。记录 5 s 内的次数（约 100 次即为泄漏）。
  4. 撤销：清空 Request blocking，整页刷新（整页刷新会清除该定时器）。
- **预期**：**当前**：离开后仍每 50 ms 执行一次 `setInterval` 回调（interval 未在卸载时清理）。修复后不再有该定时器。
- **核对**：spec 0.3.7 一致（§8.2 第 906 行：轮询在卸载后也不清理，持续失败时会泄漏）。A4 无法观察这一点（定时器不产生网络请求，stage-results 第 211 行），本条是首次直接观察。stage 构建差异：`modules/loadModule.ts` 两版相同。
- **代码位置**：S-02；`loadModule.ts:24-29`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-052 · 两个 tab 同时加载同一 remote（P2）
<!-- group: blocking -->
- **账号与前置**：T 文件要求 owner；默认用 Xsolla admin，merchant 53105，项目 317869（能打开 storefront）。同一浏览器窗口开两个 tab（A、B），都已登录，各自打开 DevTools，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：只在 tab A 的 DevTools 中使用 Network › Request blocking（该设置只作用于打开它的 tab），pattern 为 storefront remoteEntry URL 去掉 `?v=` 部分，写成 `*<主机>/<路径>/<文件名>*`（URL 来自第 2 步，或 `/api/v1/modules` 中 `storefront` 条目的 `urls.stage`）。
  - 不用 Requestly：Requestly 规则对所有 tab 生效，会同时影响 tab B。
- **步骤**：
  1. 清理：两个 tab 都清空 Request blocking；停用所有 Requestly 规则；删除已有 override。
  2. tab A、tab B 都打开 `{base}/53105/projects/317869/storefront`，然后在两个 tab 中尽量同时硬刷新。各自在 Network 中过滤 `v=`，记录 storefront remoteEntry 请求的 `v=` 值，确认两边都渲染。
  3. 在 tab A 的 Request blocking 中加入 storefront remoteEntry pattern，硬刷新 tab A。
  4. 确认 tab A 显示 `Failed to load: …`；切到 tab B，确认 storefront 仍正常可用（可再硬刷新 tab B 确认仍能加载）。
  5. 撤销：tab A 清空 Request blocking，两个 tab 都整页刷新。
- **预期**：**当前**：1. 两个 tab 各发一次 remoteEntry 请求，`v=` 不同，都正常渲染。2. tab A 失败只影响 A；tab B 不受影响。
- **核对**：spec 0.3.7 一致（S-02 只在同一页面内触发；`loadingScopes` 是页面内模块级变量，见 T4 §4.1.4 说明与 spec 第 906 行）。stage 构建差异：`modules/loadModule.ts` 两版相同；c1b5e37 的 `layouts/storefront/index.tsx` 没有 772a320 的 `shouldMountCatalog` 门控（见 RT-MF-042），不影响本条。
- **代码位置**：S-02 适用范围；`loadModule.ts:3`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-054 · webhooks 页 payments 页签与高级设置是否同时挂载（P2）
<!-- group: blocking -->
- **账号与前置**：有 `ProjectSettings` 的账号；默认用 Xsolla admin，merchant 53105，项目 317869。路由 `{base}/53105/projects/317869/edit/webhooks/payments`（确切子路径以 SDK 页面为准，**待确认**）。装好 React DevTools。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，勾选 Enable network request blocking，pattern 为 payments remoteEntry URL 去掉 `?v=` 部分，写成 `*<主机>/<路径>/<文件名>*`（URL 来自 `/api/v1/modules` 中 `"module_id": "payments"` 条目的 `urls.stage`，或第 2 步 Network 中的请求）。
  - Requestly（替代）：Cancel Request 规则，URL Contains 该 payments 入口文件路径。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override。
  2. 不屏蔽，打开上述路由。用 React DevTools 搜索 `RemoteModuleComponent`，数 `name="payments"` 的实例：测试页签（`exposedModule` 为 `./webhooksPaymentsTab` 或 `./webhooksDisputeTab`）与高级设置（`./advancedSettings`）是否同时存在。只有一个时，本条记 N/A 并写明原因。
  3. 若两者同时挂载：把 payments remoteEntry 加入 Request blocking，硬刷新，等待 30 s。
  4. 记录两个区域各自显示错误文本还是 spinner；Network 中记录 payments 入口文件被请求的次数。
  5. 撤销：清空 Request blocking，整页刷新。
- **预期**：**当前**：若两者同时挂载：与 RT-MF-050 相同的 S-02 表现（一个错误文本 + 一个永久 spinner）。若不同时挂载：记录“不适用”。
- **核对**：spec 0.3.7 一致（S-02，第 906 行）。stage 构建差异：c1b5e37 的 `layouts/webhooks-store/webhookRemotes.tsx` 删除了 GcTab 中的 `useCatalogUserIdentity`（storefront 页签），payments 相关代码相同，但行号整体前移 10 行（c1b5e37 中 `useCurrency` 为 125-157 行、`PaymentsTab` 为 159-191 行）；`AdvancedSettingsRemote.tsx` 两版相同。源码推断的时序风险：`PaymentsTab` 要等 `GET /mapi/merchant/current/currency/list` 返回才挂载（c1b5e37 `webhookRemotes.tsx:171-173`）；若此时高级设置的首次加载已经失败，`PaymentsTab` 会重新注入并同样报错，结果是两处 `Failed to load` 而不是“一错一转圈”。请记录实际组合与 payments 入口请求次数。
- **代码位置**：S-02；`webhookRemotes.tsx:139-195`；`AdvancedSettingsRemote.tsx`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-071 · AC-11：manifest 不可达时回退 MF1（P1）
<!-- group: blocking -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869。路由 `{base}/53105/communication-hub`。先不屏蔽打开该路由，确认 `…/v2/mf-manifest.json` 返回 200、Console 没有 `[mf-runtime]` 警告（即 RT-MF-070 通过）；若 manifest 本来就失败或已出现回退警告，本条无法区分，记 BLOCKED。DevTools 打开，Network 勾选 Disable cache 与 Preserve log，Console 勾选 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，勾选 Enable network request blocking，添加 pattern `*/v2/mf-manifest.json*`。
  - Requestly（替代）：Cancel Request 规则，URL Contains `/v2/mf-manifest.json`。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override；Throttling 设为 No throttling。
  2. 加入屏蔽 pattern，硬刷新 `{base}/53105/communication-hub`。
  3. Console 记录 `[mf-runtime] … falling back to MF1 …` 警告原文。
  4. Network 过滤 `remoteEntry`，确认随后请求 MF1 remoteEntry（`chat.nl-k8s-stage.srv.local` 上、以 `remoteEntry.js?v=<uuid>` 结尾），hub 渲染。
  5. 用 React DevTools 确认 MF1 `RemoteModuleComponent`（name=`communication_platform`）使用的 module 为 `./SupportHubV2`，记录渲染的组件。
  6. 撤销：清空 Request blocking，整页刷新。
- **预期**：**当前**：1. Console 出现 `[mf-runtime] communication_platform_v2/SupportHubV2 failed to load, falling back to MF1 module "communication_platform"`。2. 随后请求 MF1 remoteEntry（`?v=uuid`），hub 渲染。3. MF1 使用 gateway `module`（若不是 `./SupportHubV2`，渲染的组件可能不同，记录结果，U-05）。
- **核对**：spec 0.3.7 一致（AC-11 第 1009-1012 行；OBS-MF-003 第 631 行：manifest 不可达时回退 MF1）。stage 构建差异：c1b5e37 已含 MF2 逻辑：`src/mf/**`、`layouts/CommunicationHub/CommunicationHub.tsx` 与 772a320 相同（diff 只删除了测试文件），lockfile 两版都是 `@module-federation/runtime@2.9.0`、`runtime-core@2.9.0`、`sdk@2.9.0`、`@micro-frontend/bridge@0.0.2`；警告文本与 `createRemoteApp.tsx:34` 一致。stage 的 `communication_platform.module` 为 `./SupportHubV2`（stage-results 第 161 行），第 3 点应渲染 SupportHubV2。
- **代码位置**：AC-11；`createRemoteApp.tsx:31-58`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-075 · MF2 与 MF1 都不可达（P2）
<!-- group: blocking -->
- **账号与前置**：同 RT-MF-071（Xsolla admin，merchant 53105，项目 317869；RT-MF-070 已通过）。先在 `/api/v1/modules` 中记下 `communication_platform` 的 `urls.stage`（MF1 URL）。DevTools 打开，Network 与 Console 都勾选 Preserve log。
- **工具配置**：
  - DevTools：Network › Request blocking，勾选 Enable network request blocking，添加两个 pattern：`*/v2/mf-manifest.json*` 与 `*chat.nl-k8s-stage.srv.local*remoteEntry.js*`（第二个按 MF1 URL 的实际路径收窄，例如 `*chat.nl-k8s-stage.srv.local/<路径>/remoteEntry.js*`）。
  - Requestly（替代）：两条 Cancel Request 规则，URL Contains `/v2/mf-manifest.json` 与 MF1 remoteEntry 路径。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override。
  2. 加入两个屏蔽 pattern，硬刷新 `{base}/53105/communication-hub`。
  3. Console 确认先出现 `[mf-runtime] … falling back to MF1 …` 警告。
  4. 确认 hub 区域显示 `<p>Failed to load: <MF1 url></p>`，`<MF1 url>` 与 `urls.stage` 相同，不含 `?v=`。
  5. 撤销：清空 Request blocking，整页刷新。
- **预期**：**当前**：先打印回退警告，然后显示 `<p>Failed to load: <MF1 url></p>`。
- **核对**：spec 0.3.7 一致（OBS-MF-003 回退；OBS-MF-002 `Failed to load: {url}`）。stage 构建差异：无，`src/mf/**`、`modules/**` 两版相同。
- **代码位置**：OBS-MF-002/003
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-021 · marketplace 不可达（P2）
<!-- group: blocking -->
- **账号与前置**：任一有 merchant 访问权的账号（无 privilege 要求）；默认 Xsolla admin，merchant 53105。
- **工具配置**：
  - DevTools：Network request blocking 抽屉（Network 面板 ⋮ › More tools › Network request blocking；新版 Chrome 可能名为 Request conditions），勾选 Enable，添加 pattern `*xsolla.partnerpage.io*`。
  - Requestly（备选）：规则类型 **Cancel Request**（Block），URL `Contains` `xsolla.partnerpage.io`。
- **步骤**：1. 清理：清空 blocking 列表与 Requestly 规则。2. 添加屏蔽规则。3. 打开 `{base}/53105/marketplace` 并硬刷新。4. 记录 iframe 区域内容、host 外壳（topbar、导航）是否正常、页面是否有 host 侧提示。5. 撤销：删除 pattern 并取消 Enable / 停用 Requestly 规则；刷新确认 iframe 恢复。
- **预期**：iframe 内显示浏览器错误页；host 外壳正常；无 host 侧提示。（DevTools 屏蔽时错误页为 `ERR_BLOCKED_BY_CLIENT`，属预期形态。）
- **核对**：spec 0.3.7 无 marketplace 失败场景条目，不冲突（§8.1 第 890 行：所有 iframe 无 sandbox）。stage 构建无差异（`layouts/marketplace/index.tsx` 未改；c1b5e37 `routes.tsx:116` 同一路由）。
- **代码位置**：`layouts/marketplace/index.tsx`；`routes.tsx:117`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-033 · ontology 依赖请求失败时重定向（P2）
<!-- group: blocking -->
- **账号与前置**：同 RT-FRAME-030（ontology 已启用的 merchant；53105 是否满足**待确认**）。
- **工具配置**：URL 来自 SDK 源码（`platform-apis` 2.29.0/2.29.2 的 `fetchAccountList` / `fetchAccount`），以 Network 实际请求为准：
  - accounts 列表：`GET https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/sub_sites`
  - subsite：`GET https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/sub_sites/{accountId}`
  - DevTools Network request blocking：第 2 轮用 pattern `*/api/v1/sub_sites/*`（只命中 subsite）。DevTools pattern 是子串匹配，无法只屏蔽列表，第 1 轮请用 Requestly。
  - Requestly **Cancel Request**：第 1 轮 URL `Matches (Regex)` `^https://account-platform-gateway\.nl-k8s-stage\.srv\.local/api/v1/sub_sites(\?.*)?$`；第 2 轮 Regex `^https://account-platform-gateway\.nl-k8s-stage\.srv\.local/api/v1/sub_sites/[^/?]+`。
- **步骤**：1. 清理：无屏蔽时打开 `{base}/53105/ontology`，确认 iframe 正常，并在 Network 确认上面两个 URL 确实出现（不一致时按实际 URL 改 pattern）。2. 第 1 轮：屏蔽列表，硬刷新 `{base}/53105/ontology`，记录 URL 变化与页面提示。3. 第 2 轮：只屏蔽 subsite，硬刷新，重复记录。4. 撤销：删除所有屏蔽规则，硬刷新确认恢复。
- **预期**：`isLoading` 变为 false、`isEnabled` 为 false → 重定向到 `/{m}`，没有错误提示。（屏蔽列表也可能影响 business account 初始化等其他功能，记录观察到的附带现象。）
- **核对**：spec 0.3.7 一致（OBS-FRAME-002 状态表：“including a failed accounts or subsite request → Redirect /{m}”）。stage 构建：host 侧 `useOntologyAccess.ts` 未改；stage 的 SDK 为 platform-apis 2.29.0 / platform-store 1.15.3，已核对 `/api/v1/sub_sites` 路径与 2.29.2 相同。
- **代码位置**：`core/hooks/useOntologyAccess.ts:65-71`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-REG-015 · 国家列表请求失败（P2）
<!-- group: blocking -->
- **账号与前置**：T5 账号 A2。不点 Next 提交，A2 不会失效。
- **工具配置**：DevTools Network request blocking：pattern `*/directories/countries*`。Requestly 备选：**Cancel Request**，URL `Contains` `/directories/countries`。
- **步骤**：1. 清理：停用其他规则。2. 添加屏蔽，硬刷新 `{base}/registration`（countries 结果按 merchant 缓存 1 小时，必须整页刷新）。3. 展开 Country or region，尝试选择；填写其余必填项后观察 Next 是否可用（不提交，或提交后预期被 “Required field” 拦截）。4. 记录页面是否有错误提示。5. 撤销：删除屏蔽，硬刷新。
- **预期**：预期（代码推断）：Country 下拉为空，无法满足必填，页面没有错误提示，用户无法继续。实际表现**待确认**（缺陷候选）。
- **核对**：spec 0.3.7 无对应 S/OBS 条目，不冲突（第 847 行接口表）。stage 构建无差异。
- **代码位置**：`RegistrationForm.tsx:58-68`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-REG-027 · merchant 数据加载失败（P2）
<!-- group: blocking -->
- **账号与前置**：T5 账号 A2。
- **工具配置**：DevTools Network request blocking：pattern `*/api/account/platform/users/get_init_info*`（请求带 `?org_id=` 参数，pattern 末尾需 `*`）。Requestly 备选：**Cancel Request**，URL `Contains` `/api/account/platform/users/get_init_info`。
- **步骤**：1. 清理：停用其他规则。2. 添加屏蔽，硬刷新 `{base}/registration`。3. 等待 15 秒，记录页面：是否为 “Something went wrong / An unexpected error occurred. Please try again later.”，Elements 是否有 `data-id="merchant-required-error"`，还是一直转圈或空白。4. 撤销：删除屏蔽，硬刷新确认问卷恢复。
- **预期**：772a320：显示 500 错误页 “Something went wrong / An unexpected error occurred. Please try again later.”（`data-id=merchant-required-error`），不无限转圈。`[分支差异]` 分支去掉了 `withMerchantRequired`，没有 merchant 时返回 `null`（空白页）——该分支未部署，stage 按 772a320 的预期判定。
- **核对**：spec 0.3.7 未单列 `/registration` 的水合失败，不冲突。stage 构建与 772a320 一致：c1b5e37 的 `src/pages/Registration/Registration.tsx:83` 同样 `compose(withMerchantRequired, …)`，`src/core/hocs/withMerchantRequired.tsx` 未改（`[分支差异]` 指 WASP-2524 分支，与 stage 无关）。
- **代码位置**：`src/core/hocs/withMerchantRequired.tsx:41-71`；`Registration.tsx:88`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-CONSENT-013 · 同意状态请求失败或超时（P2）
<!-- group: blocking -->
- **账号与前置**：T5 账号 A4（owner，merchant 有 `needs_acceptance=true` 的文档；准备方式**待确认**）。不能用 Xsolla admin：admin 绕过同意检查（spec OBS-REG-003）。下文 `{m}` 为 A4 的 merchant id。stage 没有 onboarding ToU 勾选框，但本用例不涉及勾选框，适用。
- **工具配置**：
  - 失败：DevTools Network request blocking：pattern `*/legal-documents/consents/status*`（完整 URL `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/organizations/{m}/legal-documents/consents/status`）。Requestly 备选：**Cancel Request**，URL `Contains` `/legal-documents/consents/status`。
  - 挂起（复现方式**待确认**）：Requestly **Delay Request**，URL 同上，延迟 15000 ms（扩展对延迟上限有限制，被截断时改用 Proxyman/Charles 的 Breakpoint 挂住该请求）；或 DevTools › Network › Throttling › Add… 自定义 profile，Latency 15000 ms（会拖慢所有请求，只作兜底）。
- **步骤**：1. 清理：停用其他规则；无规则时打开 `{base}/{m}/dashboard`，确认会被送到 `/legal-consent`（前置成立）。2. 启用屏蔽，硬刷新 `{base}/{m}/dashboard`，记录是否进入 Dashboard、有无拦截。3. 删除屏蔽，启用挂起规则，硬刷新；用秒表或 Performance 记录 loading 持续时间（预期约 10 秒放行、loading 最长 11 秒）。4. 撤销：停用所有规则，Throttling 改回 No throttling。
- **预期**：fail-open：进入 Dashboard，不拦截（失败时 items 置空）。若请求挂起，最多显示 11 秒 loading，10 秒后放行（挂起场景的复现方式**待确认**）。
- **核对**：spec 0.3.7 一致（OBS-REG-003 第 582 行：10 s 超时并放行；第 911 行）。stage 构建：stage 用 platform-components 4.20.1、platform-apis 2.29.0，已核对 `CONSENT_CHECK_TIMEOUT_MS = 1e4`、`AuthLoading duration = 1e4 + 1e3` 与 `consents/status` 路径与 4.20.3 / 2.29.2 相同。
- **代码位置**：`LegalDocumentConsentGuard/index.tsx:41,168-173,209-211`；`ps/slices/legalDocuments.ts:92-96`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

## 组 2：Local overrides / 改响应 body（19 条）

### RT-BOOT-003 · 模块列表 200 但 body 格式错误（P2）
<!-- group: override -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。A5b 只覆盖 abort 和 500，没有覆盖本条（200 + 错误 body）。
- **工具配置**：
  - Requestly（推荐）：Modify API Response 规则，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，Status code 保持 200，Response body 选 Static，依次使用下面 3 个 body：
    - V1：`{"error":"x"}`
    - V2：`{"code":500,"error":"x"}`
    - V3：`{"code":200,"data":[]}`（不带 `result`）
  - DevTools（备选）：Network 中右键 `/api/v1/modules` › Override content（需先在 Sources › Overrides 选择本地文件夹并允许），把响应内容替换为上面的 body，保存。DevTools 不能改状态码，本条保持 200 即可。
- **步骤**：
  1. 清理：清空 Request blocking 列表；停用其他 Requestly 规则；清空 Sources › Overrides 中已有的覆盖文件；Throttling 为 No throttling；勾选 Preserve log、Disable cache。
  2. 启用 V1，硬刷新 `{base}/53105`，等待 20 s，记录 Console 错误文本、`#root` 是否为空、Network 中是否有 `/server/token`。
  3. 依次换成 V2、V3，重复步骤 2。
  4. 撤销：停用 Requestly 规则（或删除 Override 文件并取消勾选 Enable Local Overrides），硬刷新，确认恢复正常。
- **预期**：与 RT-BOOT-002 相同：白屏，错误信息包含 `x` 或 `Unknown API response`。按 SDK 源码细分（platform-apis 2.29.2 `isApiError` 要求 `code > 299`）：V1 → `Unknown API response`；V2 → 包含 `x`；V3 → `Unknown API response`。
- **核对**：spec 0.3.7 一致（OBS-BOOT-002，第 207–208 行，只描述“失败即白屏”）。T 文件不精确：body `{"error":"x"}` 没有 `code`，不满足 `isApiError`，会落到 `Unknown API response`，不会包含 `x`；要看到 `x` 必须带 `"code"`（> 299）。stage 构建差异：stage 锁定 platform-apis 2.29.0（772a320 为 2.29.2），本地没有 2.29.0 源码，`module.ts` 未能核对。
- **代码位置**：OBS-BOOT-002；platform-apis@2.29.2 `src/apis/module.ts:7-19`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-BOOT-004 · MF 2.0 注册失败不阻断启动（P2）
<!-- group: override -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。
- **工具配置**：
  - Requestly（推荐）：Modify API Response 规则，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，Status 200，Response body 选 Dynamic（JavaScript）：
    `function modifyResponse(args) { const r = JSON.parse(args.response); r.result.data = r.result.data.filter(m => m.module_id !== 'communication_platform'); return r; }`
  - DevTools（备选）：Sources › Overrides 选择本地文件夹；Network 中右键 `/api/v1/modules` › Override content，在 `result.data` 数组中删除 `module_id` 为 `communication_platform` 的整个对象，保存。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空已有 Overrides；Throttling 为 No throttling；勾选 Preserve log、Disable cache。
  2. 启用规则，硬刷新 `{base}/53105`。
  3. 在 Network 中打开 `/api/v1/modules` 的 Response，确认已没有 `communication_platform`。
  4. 确认 dashboard 正常渲染；在 Console 中筛选 `mf-runtime`，记录 warning 全文。
  5. 撤销：停用规则或删除 Override 文件，硬刷新，确认恢复正常。
- **预期**：启动继续，dashboard 正常；Console 有 MF 注册相关 warning（T 文件写“文本待确认”；按 772a320 源码应为 `[mf-runtime] skipping remote "communication_platform_v2" (module "communication_platform"): module not in gateway list`）。`/communication-hub` 的降级由 T4 验证。
- **核对**：spec 0.3.7 基本一致（OBS-BOOT-003，第 210–211 行）。差异：spec 描述的是“注册 throw → catch 后 warning”分支；删除条目走的是 `buildGatewayRemotes` 的跳过分支（`src/mf/runtime/registerGatewayRemotes.ts:48-55`），不进入 `src/mf/index.ts` 的 catch，warning 文本也不同。stage 构建：`src/mf/` 在 c1b5e37 与 772a320 之间只增加了测试，无行为差异。
- **代码位置**：OBS-BOOT-003；`src/mf/index.ts:23-29`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-AUTH-006 · `/server/token` 回退和失败（P1）
<!-- group: override -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。前置：用 DevTools Local Overrides 让 `{base}/53105` 的 HTML 不带 `__INITIAL_STATE__` token，否则 host 不会请求 `/server/token`。
- **工具配置**：
  - DevTools Sources › Overrides：选择本地文件夹并允许；在 Network 中右键 document 请求 `{base}/53105` › Override content；在打开的文件中**立即删除整段** `<script id="initial-state">window.__INITIAL_STATE__ = …</script>`，保存。不要复制、截图或保留其中的 token。
  - b) DevTools Network › Request blocking，pattern `*://accounts-sdk-skeleton.nl-k8s-stage.srv.local/for/web-games/account/server/token*`；或 Requestly Cancel Request，同一 Wildcard。
  - c) Requestly Modify API Response，同一 Wildcard，Status code 401，body `{"error":"no_session"}`。
  - d) Requestly Delay Network Requests，同一 Wildcard，延迟 9000 ms。如果 Requestly 版本限制延迟上限低于 9000 ms，改用 Charles Breakpoint 挂住请求 ≥ 9 s，或 DevTools Network › Throttling › Add custom profile（Latency 9000 ms，会拖慢所有请求）。
  - Requestly 的 HTML 改写（desktop app）或 Charles Rewrite 也可替代 Local Overrides。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；Throttling 为 No throttling；勾选 Preserve log、Disable cache。
  2. 按上面配置 Local Override（只删除 initial-state script）。
  3. a) 只启用 Override，硬刷新 `{base}/53105`：确认 Network 有 `GET {base}/server/token`，带 cookie，返回 200 `{token}`（只看状态码和字段名，不记录值），页面正常进入。
  4. b) 加上 blocking，硬刷新：记录是否 `location.replace` 到 `{base}/login`；在 Application › Cookies 确认出现 `pa-original-url`（只看名称、值是路径、约 60 s 过期）。
  5. c) 去掉 blocking，启用 401 规则，重复步骤 4。
  6. d) 去掉 401 规则，启用 9 s 延迟，重复步骤 4，并在 Network Timing 中确认请求在约 8 s 被取消（canceled）。
  7. **注意循环**：b/c/d 时浏览器仍有有效的 httpOnly 会话。BFF 在有会话时会把 `/login` 302 回 `pa-original-url`（即 `{base}/53105`），Override 又会让 `/server/token` 失败，预计形成 `{base}/53105 → /login → {base}/53105` 循环。看到第一次跳转后记录往返次数，然后立即执行步骤 8。
  8. 撤销：停用所有 Requestly 规则；清空 Request blocking；Sources › Overrides 取消勾选并删除覆盖文件夹中的文件（Clear configuration）；Throttling 恢复 No throttling；打开 `{base}/53105` 确认恢复。
- **预期**：a) `GET {base}/server/token` 带 cookie，返回 200 `{token}` 后正常进入。b/c/d) `resolveInitialToken` 返回 `null`，AuthOrchestrator 调用 `checkDisallowedUrls`，执行 `location.replace({base}/login)`，并写入 SPA 侧的 `pa-original-url`（60 s）。d 在 8 s 时 abort。**注意**：网络失败也会跳到 login，不会像 SDK 注释说的那样留在当前页。
- **核对**：spec 0.3.7 一致（OBS-AUTH-001，第 231–240 行；§8.3 第 918 行）。T 文件和 spec 都没有写有会话时的 login 往返循环（由 platform-bff 1.0.0 `resolveAuthRedirect` 的 `/login` 302 规则和 platform-apis `checkDisallowedUrls` 推断，未实测）。stage 构建：`src/core/apis/server.ts`、`src/core/utils/resolveInitialToken.ts` 在 c1b5e37 与 772a320 之间相同；但 stage 锁定 platform-shell 2.22.1、platform-apis 2.29.0（T 文件依据 2.22.3、2.29.2），`AuthOrchestrator.tsx`、`checkDisallowedUrls.ts` 未能按 stage 版本核对。
- **代码位置**：OBS-AUTH-001、U-02；`src/core/apis/server.ts:7-11`；`resolveInitialToken.ts:37-49`；platform-shell@2.22.3 `src/AuthOrchestrator.tsx:125-143`；platform-apis@2.29.2 `src/utils/checkDisallowedUrls.ts:20-48`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-002 · 模块列表失败白屏：未覆盖变体（P0）
<!-- group: override -->
- **账号与前置**：abort 与 500 已由 A5b 证实（匿名、headless、只覆盖 `{base}/login` 入口，见 stage-results 第 215–253 行），本条不重复这两种组合，只做未覆盖的变体：变体 A = 200 + 错误 body（匿名入口与有会话入口各一次）；变体 B = 有会话入口下的 500 与屏蔽。有会话用 Xsolla admin，merchant 53105，项目 317869，入口 `{base}/53105/dashboard`；匿名用无痕窗口，入口 `{base}/login`。Chrome 已连内网（`*.srv.local` 可达）。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。`/api/v1/modules` 是启动时第一个 gateway 请求，所有规则都必须在整页刷新前设好。
- **工具配置**：
  - 变体 A，Requestly：规则类型 Modify API Response；URL 匹配 Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`；Request type 选 XHR/Fetch；Status code 200；Response body 选 Static data，内容 `{"code":500,"error":"x"}`。
  - 变体 A，DevTools 替代：先在 Sources › Overrides 中 Select folder for overrides 并允许访问；正常加载一次页面，在 Network 中右键 `modules`（`account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules`）› Override content；把整个 body 替换为 `{"code":500,"error":"x"}`，Cmd+S 保存；状态码保持 200。匿名无痕窗口需在该窗口的 DevTools 中重新设置。
  - 变体 B-500，Requestly：同一 URL pattern，Modify API Response，Status code 500，body 不改。
  - 变体 B-屏蔽，DevTools：Network › Request blocking（More tools › Network request blocking），勾选 Enable network request blocking，添加 pattern `*account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`。
- **步骤**：
  1. 清理：停用所有 Requestly 规则；清空 Request blocking 列表；在 Sources › Overrides 中取消勾选 Enable Local Overrides 或删除已有的 override 文件；Throttling 设为 No throttling。
  2. 变体 A（有会话）：启用变体 A 规则；打开 `{base}/53105/dashboard`，硬刷新（Cmd+Shift+R），等待 20 s。
  3. 记录：Console 中的报错原文；Console 执行 `document.getElementById('root').childElementCount`；Network 过滤 `token`，确认没有 `/server/token`；页面上是否有重试按钮。
  4. 变体 A（匿名）：在无痕窗口打开 `{base}/login`，在该窗口设置同一规则，硬刷新，按第 3 步记录（另记录是否出现密码输入框）。
  5. 停用变体 A。变体 B-500（有会话）：启用 B-500 规则，硬刷新 `{base}/53105/dashboard`，按第 3 步记录。
  6. 停用 B-500。变体 B-屏蔽（有会话）：启用 Request blocking pattern，硬刷新 `{base}/53105/dashboard`，按第 3 步记录。
  7. 撤销：停用所有 Requestly 规则，删除 override（或取消 Enable Local Overrides），清空 Request blocking 列表，整页刷新，确认 dashboard 正常显示。
- **预期**：**当前**：每种情况都是：`#root` 为空（白屏）；Console 出现 `Uncaught (in promise) Error: Failed to initialize application: …`；不发 `/server/token` 之后的业务请求；没有重试按钮。
- **核对**：spec 0.3.7 一致（OBS-BOOT-002，第 207 行：模块列表失败即抛 `Failed to initialize application`，无错误 UI、无重试；§10.3 A5b 第 1112 行只覆盖匿名、`/login` 入口、abort 与 500）。按 SDK 源码推断（本地 `platform-apis@2.29.2 dist/index.mjs:1195-1204,902-907`），变体 A 的 body 命中 `isApiError`，消息应为 `Failed to initialize application: Error: x`。stage 构建差异：`src/init.tsx` 在 c1b5e37 与 772a320 相同；但 c1b5e37 的 `package.json` 用 `@accounts-sdk/platform-apis` 2.29.0（基线 2.29.2），本地没有安装 2.29.0，`fetchModuleList` 的抛错条件在 stage 版本上未核对，变体 A 的消息文本以实测为准。T 文件“依据”列写 OBS-BOOT-001，失败行为对应的 spec 条目是 OBS-BOOT-002（T 第 505 行已写 OBS-BOOT-002）。
- **代码位置**：OBS-BOOT-001；`init.tsx:29-31`；SDK `fetchModuleList` 抛错条件 `platform-apis index.mjs:1195-1204`；stage 已证实（spec 0.3.7 §10.3 A5b：Playwright 匿名 headless 拦截 `/api/v1/modules`，abort 与 500 都白屏、不进入 bootstrap） [P10]
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-041 · remote 返回 404（P1）
<!-- group: override -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869。目标条目用 `xaa_widgets`（stage 模块列表中已确认存在，`scope=xaaWidgets`，URL 以 `remoteEntry.js` 结尾，见 stage-results 第 161 行），路由 `{base}/53105/dashboard`。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。Local overrides 必须在整页刷新前设好。
- **工具配置**：
  - DevTools Local overrides：Sources › Overrides › Select folder for overrides 并允许访问；正常加载一次 dashboard，在 Network 中右键 `modules`（`account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules`）› Override content。在 `result.data` 数组中找到 `"module_id": "xaa_widgets"` 的对象，把 `urls.stage` 的文件名 `remoteEntry.js` 改为 `remoteEntry-404.js`（主机与目录不变，例如 `https://<原主机>/…/xaa-widgets/mf/remoteEntry-404.js`）；Cmd+S 保存。
  - Requestly（替代）：Modify API Response；URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`；Request type XHR/Fetch；Response body 选 Programmatic (JavaScript)：`function modifyResponse(args) { const r = JSON.parse(args.response); const m = r.result.data.find(x => x.module_id === 'xaa_widgets'); m.urls.stage = m.urls.stage.replace('remoteEntry.js', 'remoteEntry-404.js'); return JSON.stringify(r); }`
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override；Throttling 设为 No throttling。
  2. 设好上面一种覆盖方案，硬刷新 `{base}/53105/dashboard`。
  3. Network 过滤 `remoteEntry-404`，确认请求 URL 为改后的路径加 `?v=<uuid>`，状态码为 404。若服务器对该路径返回 200 + HTML（SPA 兜底页），结果会变成 `Remote container 'xaaWidgets' not found`，本条记 BLOCKED 并附响应。
  4. 按 RT-MF-040 第 4–7 步检查 XAA 插槽文本、无超时/重试、导航可用、`<head>` 中的失败 script。
  5. 撤销：删除 override（或停用 Requestly 规则），整页刷新，确认 XAA 正常显示。
- **预期**：**当前**：与 RT-MF-040 相同，`<url>` 为改后的路径。
- **核对**：spec 0.3.7 一致（OBS-MF-002：`Failed to load: {url}`）。stage 构建差异：`modules/loadModule.ts`、`modules/RemoteModule.tsx` 在 c1b5e37 与 772a320 之间没有改动。
- **代码位置**：OBS-MF-002
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-042 · 脚本 200 但不是该 container（P2）
<!-- group: override -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869（需能打开 storefront，4 个 store privilege 之一）。路由 `{base}/53105/projects/317869/storefront`。先在原始 `/api/v1/modules` 响应中确认存在 `"module_id": "storefront"` 条目，记下它的 `scope`（即预期中的 container 名；`loadModule.ts` 的映射表里没有 storefront）；没有该条目时本条记 BLOCKED。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools Local overrides：Network 右键 `modules` › Override content；在 `result.data` 中找到 `"module_id": "storefront"`，把它的 `urls.stage` 改成 `"module_id": "player-platform"` 条目的 `urls.stage`（该条目不存在时用静态 URL `https://pa-games-portal-stage.web.app/remoteEntry.js`）；Cmd+S 保存。
  - Requestly（替代）：Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，XHR/Fetch，Programmatic：`function modifyResponse(args) { const r = JSON.parse(args.response); const d = r.result.data; const pp = d.find(x => x.module_id === 'player-platform'); d.find(x => x.module_id === 'storefront').urls.stage = pp ? pp.urls.stage : 'https://pa-games-portal-stage.web.app/remoteEntry.js'; return JSON.stringify(r); }`
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override。
  2. 设好覆盖方案。在地址栏直接打开 storefront 路由并硬刷新（必须是新文档；同一文档中若 storefront container 已加载，加载器不会再注入脚本）。
  3. Network 过滤 `remoteEntry`，确认请求的是 player-platform 的 URL，状态 200。
  4. 记录 remote 区域文本，以及它出现的大致时间（脚本 onload 后约 100 ms）。
  5. 撤销：删除 override（或停用 Requestly 规则），整页刷新，确认 storefront 正常显示。
- **预期**：**当前**：等待约 100 ms 后显示 `<p>Remote container '<storefront 的 container>' not found</p>`。
- **核对**：spec 0.3.7 一致（OBS-MF-002：`Remote container 'X' not found`）。stage 构建差异：`modules/loadModule.ts` 两版相同；c1b5e37 的 `layouts/storefront/index.tsx` 不含 772a320 的 `useCatalogUserIdentity` 挂载门控（`shouldMountCatalog`）和 `userId/userEmail/userName/userRole` props，stage 上 RemoteModule 立即挂载，不影响本条预期。
- **代码位置**：`loadModule.ts:74-76`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-044 · gateway 缺少条目，回退静态 URL（P1）
<!-- group: override -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869。cloud-gaming 路由需要 `cloud_gaming_access`；该账号打不开时记 BLOCKED。先在原始 `/api/v1/modules` 响应中记下 `cloud-gaming` 条目的 `urls.stage`：若与静态 URL 相同，Network 上无法区分来源，改用 Console `window.__modules.some(m => m.module_id === 'cloud-gaming')`（应为 `false`）加“remote 正常渲染”判定。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools Local overrides：Network 右键 `modules` › Override content；在 `result.data` 数组中删除 `"module_id": "cloud-gaming"` 的整个对象（注意删除相邻逗号，保持 JSON 合法）；Cmd+S 保存。其他 5 个 remote 依次换成删除对应 `module_id` 的对象。
  - Requestly（替代）：Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，XHR/Fetch，Programmatic：`function modifyResponse(args) { const r = JSON.parse(args.response); r.result.data = r.result.data.filter(x => x.module_id !== 'cloud-gaming'); return JSON.stringify(r); }`（换 remote 时改 `'cloud-gaming'`）。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override。
  2. 设好删除 `cloud-gaming` 的覆盖，硬刷新 `{base}/53105/projects/317869/cloud-gaming`。
  3. Network 过滤 `remoteEntry`，确认请求 `https://cloudgaming-publisher-tools-stage.web.app/dashboard/remoteEntry.dashboard.js?v=…`，remote 正常渲染。
  4. 对下列 remote 重复第 2–3 步（每次只删除一个条目，整页刷新）：`player-platform` → `{base}/53105/projects/317869/player-platform`，`https://pa-games-portal-stage.web.app/remoteEntry.js`；`sdk-integration` → `/53105/projects/317869/sdk/integration`，`https://sdk-intergration-widget.nl-k8s-stage.srv.local/assets/remoteEntry.js`；`offerwall` → `/53105/projects/317869/offerwall`，`https://pa-offerwall-stage.web.app/remoteEntry.js`；`disputes` → `/53105/analytics/main-info/afs/chargeback-registry`，`https://dispute-module-publisher-account.nl-k8s-stage.srv.local/disputes_publisher_account.js`；`login` → `/53105/projects/317869/login`，`https://login-pa-module.gcp-k8s-login-stage.srv.local/login-pa-module.js`。原响应中没有某条目时，该 remote 本来就走静态配置，记录即可。
  5. 撤销：删除 override（或停用 Requestly 规则），整页刷新。
- **预期**：**当前**：请求静态 URL `https://cloudgaming-publisher-tools-stage.web.app/dashboard/remoteEntry.dashboard.js?v=…`，remote 正常渲染。对 `player-platform`、`sdk-integration`、`offerwall`、`disputes`、`login` 同理。
- **核对**：spec 0.3.7 一致（OBS-MF-001 第 1 步，第 612 行：只有 login、player-platform、sdk-integration、cloud-gaming、offerwall、disputes 6 个模块有静态配置）。stage 构建差异：`modules/RemoteModule.tsx`、`modules/config.ts` 两版相同；`src/config.ts` 只删除了 MCP/Metrika 相关常量，各静态 remote 的 stage URL 两版相同。
- **代码位置**：OBS-MF-001 第 1 步；`RemoteModule.tsx:50-63`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-045 · gateway 条目 scope 为占位值（P2）
<!-- group: override -->
- **账号与前置**：同 RT-MF-044（Xsolla admin，merchant 53105，项目 317869，需 `cloud_gaming_access`；原响应中必须有 `cloud-gaming` 条目，否则记 N/A）。路由 `{base}/53105/projects/317869/cloud-gaming`。如需确认使用了静态配置，装好 React DevTools。
- **工具配置**：
  - DevTools Local overrides：Network 右键 `modules` › Override content；在 `"module_id": "cloud-gaming"` 的对象中把 `scope` 改为 `"string"`，Cmd+S 保存；第二轮改为 `""`。
  - Requestly（替代）：Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，XHR/Fetch，Programmatic：`function modifyResponse(args) { const r = JSON.parse(args.response); r.result.data.find(x => x.module_id === 'cloud-gaming').scope = 'string'; return JSON.stringify(r); }`（第二轮把 `'string'` 改为 `''`）。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override。
  2. 第一轮：`scope` = `"string"`，硬刷新 cloud-gaming 路由。确认 remote 正常渲染；React DevTools 中 `RemoteModuleComponent`（name=`cloud-gaming`）的 memo 配置 scope 为 `cloud_gaming_dashboard_module`；Network 中 remoteEntry 为静态 URL。
  3. 第二轮：`scope` = `""`，硬刷新，按第 2 步检查。
  4. 撤销：删除 override（或停用 Requestly 规则），整页刷新。
- **预期**：**当前**：两次都回退静态配置并正常渲染。
- **核对**：spec 0.3.7 一致（OBS-MF-001 第 1 步：条目缺失或为占位值时用静态配置）。stage 构建差异：`modules/RemoteModule.tsx`（`isUsable` 判断）两版相同。
- **代码位置**：`RemoteModule.tsx:57`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-046 · gateway-only remote 缺少条目：永久 spinner（P1）
<!-- group: override -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869。主目标 `funding`（stage 已确认存在，入口文件 `funding-developer-account.js`），路由 `{base}/53105/funding`（无 privilege 要求）；可选再做 `xaa_widgets`（`{base}/53105/dashboard`）或 `storefront`（`{base}/53105/projects/317869/storefront`）。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools Local overrides：Network 右键 `modules` › Override content；在 `result.data` 数组中删除 `"module_id": "funding"` 的整个对象（保持 JSON 合法）；Cmd+S 保存。可选轮次改为删除 `xaa_widgets` 或 `storefront`。
  - Requestly（替代）：Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，XHR/Fetch，Programmatic：`function modifyResponse(args) { const r = JSON.parse(args.response); r.result.data = r.result.data.filter(x => x.module_id !== 'funding'); return JSON.stringify(r); }`
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override。
  2. 设好覆盖，硬刷新 `{base}/53105/funding`，等待 1 分钟。
  3. Network 过滤 `funding-developer-account`，确认没有请求；Elements 中搜索 `Failed to load`、`Remote`，确认没有错误文本。
  4. 确认 App 区域一直是 spinner；nav 区域（`./nav`，`loadingFallback=null`）保持空白。
  5. 可选：换成删除 `xaa_widgets`，硬刷新 dashboard，确认 XAA 插槽一直是 spinner、没有 `xaa-widgets/mf/remoteEntry.js` 请求。
  6. 撤销：删除 override（或停用 Requestly 规则），整页刷新。
- **预期**：**当前**：spinner 一直保留，直到模块列表变化；没有错误文本，也没有 remoteEntry 请求。`loadingFallback={null}` 的调用方（funding `./nav`）区域保持空白。
- **核对**：spec 0.3.7 一致（OBS-MF-001 第 2 步，第 613 行：无配置时不发请求、无错误、spinner 直到模块列表变化，`loadingFallback={null}` 时空白，含 `xaa_widgets`；第 927 行）。stage 构建差异：`modules/RemoteModule.tsx`、`layouts/Funding/index.tsx` 两版相同。
- **代码位置**：OBS-MF-001 第 2 步；§8.2；`RemoteModule.tsx:65-68` `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-047 · gateway 条目没有 stage key（P2）
<!-- group: override -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869（能打开 storefront）。路由 `{base}/53105/projects/317869/storefront`。原响应中需有 `storefront` 条目（stage 上 `urls` 的 key 是 `development / stage / production`），先记下它的 `scope` 与 `urls.stage`。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools Local overrides：Network 右键 `modules` › Override content；把 `"module_id": "storefront"` 对象的 `urls` 整体替换为 `{"dev": "<原 urls.stage 的值>"}`；Cmd+S 保存。
  - Requestly（替代）：Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，XHR/Fetch，Programmatic：`function modifyResponse(args) { const r = JSON.parse(args.response); const m = r.result.data.find(x => x.module_id === 'storefront'); m.urls = {dev: m.urls.stage}; return JSON.stringify(r); }`
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override。
  2. 设好覆盖，在地址栏直接打开 storefront 路由并硬刷新（必须是新文档：同一文档中若 storefront container 已存在，加载器直接返回，不检查 URL）。
  3. 记录 remote 区域文本；Network 过滤 `remoteEntry`，确认没有 storefront 的 remoteEntry 请求。
  4. 撤销：删除 override（或停用 Requestly 规则），整页刷新。
- **预期**：**当前**：MF1 显示 `<p>Remote URL not found for scope: <scope></p>`。对比：MF2 的 `resolveModuleUrl` 会接受 `dev`（见 RT-MF-074）。
- **核对**：spec 0.3.7 一致（OBS-MF-002：`Remote URL not found for scope: X`；U-05 第 1231 行 stage 已关闭，key 为 `development/stage/production`）。T 文件不一致：“见 RT-MF-074”引用不准，RT-MF-074 测的是非 `remoteEntry.js` URL，不涉及 `dev` key。stage 构建差异：`modules/RemoteModule.tsx`、`modules/loadModule.ts` 两版相同；MF2 侧 `resolveModuleUrl` 来自 `@accounts-sdk/platform-shell`，基线 2.22.3 在 stage 下按 `stage → development → dev` 取 key（`dist/remote-module.mjs:102-106`），c1b5e37 用 2.22.1，本地未安装，未核对。
- **代码位置**：U-05；`RemoteModule.tsx:74-75`；`loadModule.ts:33-35`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-074 · gateway URL 不以 remoteEntry.js 结尾：跳过注册（P2）
<!-- group: override -->
- **账号与前置**：同 RT-MF-071（Xsolla admin，merchant 53105，项目 317869）。先在原始 `/api/v1/modules` 响应中记下 `communication_platform` 的 `urls.stage`（主机 `chat.nl-k8s-stage.srv.local`，以 `remoteEntry.js` 结尾）。DevTools 打开，Network 与 Console 都勾选 Preserve log。Local overrides 必须在整页刷新前设好（注册发生在启动时）。
- **工具配置**：
  - DevTools Local overrides：Network 右键 `modules` › Override content；在 `"module_id": "communication_platform"` 对象中，把 `urls.stage` 末尾的 `remoteEntry.js` 改为 `entry.js`；Cmd+S 保存。
  - Requestly（替代）：Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，XHR/Fetch，Programmatic：`function modifyResponse(args) { const r = JSON.parse(args.response); const m = r.result.data.find(x => x.module_id === 'communication_platform'); m.urls.stage = m.urls.stage.replace(/remoteEntry\.js$/, 'entry.js'); return JSON.stringify(r); }`
  - 可选，Requestly Redirect Request：URL Contains `<原路径目录>/entry.js` → 重定向到原 `…/remoteEntry.js` 并保留 query。作用：让 MF1 回退真正加载到脚本（见“核对”）。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；删除其他 override。
  2. 设好覆盖，整页打开 `{base}/53105/dashboard`。Console 记录启动时的 `[mf-runtime] skipping remote …` 警告原文。
  3. 打开 `{base}/53105/communication-hub`。确认 Network 中没有 `mf-manifest.json` 请求；Console 出现 `[mf-runtime] … falling back to MF1 …`；记录 hub 区域最终是渲染成功还是 `Failed to load: …/entry.js`。
  4. 可选：再启用 Redirect 规则，重复第 3 步，确认 MF1 渲染 hub。
  5. 撤销：删除 override，停用 Requestly 规则，整页刷新。
- **预期**：**当前**：1. 启动时 Console：`[mf-runtime] skipping remote "communication_platform_v2" (module "communication_platform"): remoteEntry URL "…" has no manifest mapping`。2. 打开 hub：直接回退 MF1。
- **核对**：spec 0.3.7 一致（OBS-MF-003：从 `remoteEntry.js` URL 派生 manifest；警告文本与 `registerGatewayRemotes.ts:49-54` 一致）。T 文件缺口：MF1 回退使用的是同一个被改过的 `urls.stage`（`RemoteModule.tsx:74-80`），若 `…/entry.js` 在服务器上不存在，hub 区域最终显示 `<p>Failed to load: …/entry.js</p>`，而不是渲染 hub；T 的“直接回退 MF1”只描述回退本身。要验证 MF1 真正渲染，需加 Redirect 规则。stage 构建差异：无，`src/mf/**` 两版相同；`resolveModuleUrl` 来自 platform-shell（stage 2.22.1，基线 2.22.3），本条只用 `stage` key，不受影响。
- **代码位置**：`registerGatewayRemotes.ts:43-56`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-076 · 加载阶段失败与 provider.render 同步抛错时回退 MF1（P2）
<!-- group: override -->
- **账号与前置**：同 RT-MF-071（RT-MF-070 已通过）。需要能修改 v2 产物：DevTools Local overrides 覆盖 `mf-manifest.json`、v2 remoteEntry 或 v2 expose chunk（**待确认**可行性）。先不覆盖打开 `{base}/53105/communication-hub`，在 Network 中找到 `mf-manifest.json`、v2 remoteEntry 与 SupportHubV2 的 expose chunk。Sources › Overrides 已选好文件夹。Network 与 Console 都勾选 Preserve log。
- **工具配置**：
  - a)（T 文件方案）DevTools：Network 右键 `mf-manifest.json` › Override content，删除 `exposes` 数组中 `path`/`name` 为 `./SupportHubV2` / `SupportHubV2` 的项（如有 `modules` 字段，也删除对应项），Cmd+S 保存。
  - a')（备选，见“核对”）DevTools：Network 右键 v2 remoteEntry 脚本 › Override content，搜索 `"./SupportHubV2"`，改为 `"./SupportHubV2__qa"`，Cmd+S 保存。效果：`container.get('./SupportHubV2')` 找不到 export。
  - b) DevTools：Network 右键 SupportHubV2 的 v2 expose chunk › Override content，找到 bridge provider 的 `render` 函数（可搜索 `render(`，附近通常有 `createBridgeComponent` 或 `provider`），在函数体第一行插入 `throw new Error('qa-sync-render');`，Cmd+S 保存。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override。
  2. 只启用 a) 的 override，硬刷新 `{base}/53105/communication-hub`。记录 Console 是否有 `[mf-runtime] … falling back to MF1` 警告，以及是否请求 MF1 remoteEntry 并渲染。若没有回退、MF2 正常渲染，删除 a) 的 override，改用 a') 重做本步。
  3. 删除 a)/a') 的 override，只启用 b)，硬刷新，按第 2 步记录。
  4. 撤销：在 Sources › Overrides 中删除所有 override 文件（或取消 Enable Local Overrides），整页刷新，确认 MF2 正常加载。
- **预期**：**当前**：a、b 都回退：bridge 的 ErrorBoundary 进入 `fallbackRender`，渲染 MF1 `communication_platform`；Console 有 `[mf-runtime] … falling back to MF1` 警告。remote 自身 React 树内的渲染错误**不**在本用例范围，见 RT-MF-082（U-11）。
- **核对**：spec 0.3.7 一致（OBS-MF-003 第 631-638 行：export 缺失、`provider.render` 同步抛错都回退 MF1）。T 文件步骤 a 与源码不一致（源码推断，未运行）：`runtime-core@2.9.0 dist/module/index.js:167-190` 通过 remoteEntry 的 `get(expose)` 取 factory，manifest 的 `exposes`/`modules` 只用于预加载和错误信息（`module/index.js:11-15`），所以只删 manifest 中的 expose 很可能不会造成“export 缺失”，MF2 仍会正常渲染；要构造 export 缺失需改 v2 remoteEntry（步骤 a'）。stage 构建差异：无，`createRemoteApp.tsx` 与 MF 依赖版本两版相同。
- **代码位置**：OBS-MF-003（export 缺失、`provider.render` 同步抛错）；勘误 E-09（PARTIAL 修正）；`createRemoteApp.tsx:19,45-59`；`bridge@0.0.2 RemoteAppWrapper-hOF0XI8X.js:253,323-336` `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-002 · S-03 allowlist 四种绕过（P1）
<!-- group: override -->
- **账号与前置**：Xsolla admin，merchant 53105（IntegrationFrame 路由不校验 privilege，T 文件写 owner，admin 同样可用）。若 stage 有真实 card `C`、步骤 `S`（带 integration guide），用真实 id；没有真实卡片时用虚构 id `9001`/`1`，只能用 Requestly（见工具配置）。Chrome 已安装 Requestly 扩展。默认 QA 账号无 sales card 数据。
- **工具配置**：
  - 被改接口（代码核实，`src/core/apis/upsell.ts:57-61`）：`GET https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/53105/salescards/{cardId}`。响应体没有外层包裹，代码直接读 `response.data.steps[]`（`IntegrationFrame/index.tsx:46-47`）。结构为 `{"id":<cardId>,"activeStepId":<n>,"steps":[{"id":<stepId>,"url":"<url>",…}]}`。
  - Requestly（首选，不需要真实卡片）：规则类型 **Modify API Response**；URL 条件 `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/53105/salescards/9001`（或 Regex `^https://account-platform-gateway\.nl-k8s-stage\.srv\.local/mapi/merchant/merchants/\d+/salescards/\d+$`，该正则不会命中 `salescards/info` 与 `salescards/assign_to_user`）；Status code `200`；Response body 选 Static，并勾选 “Serve response without making a call to the server”（若扩展版本无此项，GET 请求仍会到达后端，属只读，可接受）。body（每轮只改 `url`）：
    ```json
    {"id":9001,"activeStepId":1,"steps":[{"id":1,"url":"https://developers.xsolla.com.example.org/x"}]}
    ```
  - DevTools Local overrides（只在真实卡片存在、真实响应为 200 时可用；只改内容，不改状态码）：Network › 右键 `salescards/C` 请求 › Override content → Sources › Overrides 中编辑该文件，只把 `steps[]` 里 `id === S` 那一项的 `"url"` 字段改成下表的值，其余字段原样保留。
  - 测试 URL 列表（每轮替换 `url` 一次）：
    | 编号 | `url` 值 | 来源 | 实际 host / origin |
    |---|---|---|---|
    | 0（对照） | `https://developers.xsolla.com/doc/` | RT-FRAME-001 | developers.xsolla.com（应渲染 iframe，证明 override 生效） |
    | a 后缀子域 | `https://developers.xsolla.com.example.org/x` | T 文件 | developers.xsolla.com.example.org |
    | b userinfo | `https://developers.xsolla.com@example.org/x` | T 文件 | example.org |
    | c 拼接主机 | `https://developers.xsolla.comexample.org/x` | T 文件 | developers.xsolla.comexample.org |
    | d 端口 | `https://developers.xsolla.com:8443/x` | T 文件 | origin `https://developers.xsolla.com:8443` |
    | e userinfo 带口令（补充，只记录） | `https://developers.xsolla.com:pw@example.org/x` | 附录 §5.2 同类 | example.org |
    | f 其他 allowlist key 后缀子域（补充，只记录） | `https://docs.unity3d.com.example.org/x` | allowlist 第 4 项 | docs.unity3d.com.example.org |
- **步骤**：1. 清理：Requestly 中停用其他规则；Network › Request blocking 列表清空；Sources › Overrides 无旧文件。打开 DevTools，Network 勾选 Preserve log。2. 按上方配置 `url` = 编号 0，打开 `{base}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=1`（真实卡片时用 `C`/`S`），确认渲染 iframe。3. 依次把 `url` 改为 a、b、c、d（可加 e、f），每次保存规则后硬刷新同一 URL。4. 每次在 Elements 搜索 `iframe[title="integration-guide"]`，记录是否存在及 `src`；在 Network 过滤 Doc 类型，记录 iframe 文档请求的实际主机与端口。5. 撤销：停用/删除 Requestly 规则；Sources › Overrides 删除该文件并取消 “Enable Local Overrides”；硬刷新确认恢复全屏 loader 或真实卡片行为。
- **预期**：**当前（缺陷，预期失败项）**：a–d 四种都渲染 `<iframe src=…>`；b) 实际主机为 `example.org`；d) 实际 origin 为 `https://developers.xsolla.com:8443`，不是 allowlist 的默认端口 origin。域名不解析或端口不通时 iframe 内为网络错误页，但 DOM 中已有 iframe，即判定已复现。**修复后**：四种都保持 loader，不渲染 iframe（AC-10 覆盖 a、b；c、d 按 S-03 同一规则）。
- **核对**：spec 0.3.7 一致（OBS-FRAME-001 第 648 行列出 4 种绕过；AC-10 第 1004-1007 行；S-03 第 1143 行）。stage 构建：`available-domains.ts`、`IntegrationFrame/index.tsx`、`upsell.ts` 在 c1b5e37 与 772a320 间无改动；stage bundle 已确认为 `Object.keys(map).find(k => url.startsWith(k))`（stage-results 第 110 行）。
- **代码位置**：S-03（4 种形式）；AC-10；OBS-FRAME-001；`available-domains.ts:12-13` `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-003 · 非 allowlist 域名（P1）
<!-- group: override -->
- **账号与前置**：同 RT-FRAME-002（Xsolla admin，merchant 53105；无真实卡片时用 Requestly 虚构 card `9001`、step `1`）。
- **工具配置**：同 RT-FRAME-002。Requestly **Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/53105/salescards/9001`，Status `200`，Static body，勾选 “Serve response without making a call to the server”：
  ```json
  {"id":9001,"activeStepId":1,"steps":[{"id":1,"url":"https://example.com/"}]}
  ```
  或 DevTools Local overrides（真实卡片 200 时）：只把 `steps[id=S].url` 改为 `https://example.com/`。
- **步骤**：1. 清理同 RT-FRAME-002 第 1 步。2. 启用规则，打开 `{base}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=1`。3. 等待至少 30 秒，观察页面；Elements 搜索 `iframe`；Network 确认 `salescards/9001` 返回 200 且 body 为上述内容。4. 撤销：停用 Requestly 规则 / 删除 override 文件。
- **预期**：永久全屏 loader，无错误文本，无 iframe。
- **核对**：spec 0.3.7 一致（OBS-FRAME-001 第 650 行：域名被拒时 loader 一直存在）。stage 构建无差异（相关文件 c1b5e37..772a320 未改）。
- **代码位置**：OBS-FRAME-001
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-004 · 误拒：大写主机或 http（P2）
<!-- group: override -->
- **账号与前置**：同 RT-FRAME-002。
- **工具配置**：同 RT-FRAME-002 的 Requestly **Modify API Response**（URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/53105/salescards/9001`，Status `200`，Static body，不调用服务器）。两轮 body 只改 `url`：
  ```json
  {"id":9001,"activeStepId":1,"steps":[{"id":1,"url":"https://Developers.Xsolla.com/doc"}]}
  ```
  ```json
  {"id":9001,"activeStepId":1,"steps":[{"id":1,"url":"http://developers.xsolla.com/doc"}]}
  ```
  或 DevTools Local overrides（真实卡片 200 时）只改 `steps[id=S].url`。
- **步骤**：1. 清理同 RT-FRAME-002 第 1 步。2. 第一轮 body（大写主机），打开 `{base}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=1`，观察 30 秒，Elements 搜索 `iframe`。3. 改为第二轮 body（http），硬刷新，重复观察。4. 撤销：停用规则 / 删除 override 文件。
- **预期**：两次都保持 loader（区分大小写、只认 https）。记录为已知限制。
- **核对**：spec 0.3.7 一致（OBS-FRAME-001 第 647 行：只按 `starts with` 4 个小写 https 前缀放行）。stage 构建无差异。
- **代码位置**：`available-domains.test.ts:51-63`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-007 · 步骤不存在或无 url（P2）
<!-- group: override -->
- **账号与前置**：同 RT-FRAME-002（T 文件写 owner；admin 可用）。
- **工具配置**：Requestly **Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/53105/salescards/9001`，Status `200`，Static body，勾选不调用服务器。
  - 第 1 轮（步骤不存在）body 保持一个合法步骤，测试 URL 用不存在的 step id：
    ```json
    {"id":9001,"activeStepId":1,"steps":[{"id":1,"url":"https://developers.xsolla.com/doc/"}]}
    ```
  - 第 2 轮（步骤无 url）：
    ```json
    {"id":9001,"activeStepId":1,"steps":[{"id":1}]}
    ```
  - DevTools Local overrides（真实卡片 200 时）：第 2 轮删除 `steps[id=S]` 的 `"url"` 字段。
- **步骤**：1. 清理同 RT-FRAME-002 第 1 步。2. 第 1 轮：打开 `{base}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=999`；Network 确认发出 `salescards/9001`；观察 30 秒。3. 第 2 轮：换 body，打开 `…?upsell-card-id=9001&upsell-step-id=1`，观察 30 秒。4. 每轮 Elements 搜索 `iframe`。5. 撤销：停用规则 / 删除 override 文件。
- **预期**：都保持 loader。
- **核对**：spec 0.3.7 一致（OBS-FRAME-001 第 650 行：step 缺失时 loader 一直存在）。stage 构建无差异。
- **代码位置**：`index.tsx:36-41`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-032 · ontology URL 缺失或非 https（P2）
<!-- group: override -->
- **账号与前置**：merchant 有 `ontology` feature，且当前 business account 的 subsite visibility 含 `ontology`（同 RT-FRAME-030）。53105 是否满足**待确认**；不满足时页面会先重定向到 `/{m}`，本用例记 BLOCKED。
- **工具配置**：
  - 被改接口：`GET https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules`（启动时第一个 gateway 请求；body 形状 `{code, result:{data:[…], total}, trace_id}`）。
  - DevTools Local overrides：Network › 右键 `modules` › Override content；在 Sources › Overrides 编辑。第 1 轮：从 `result.data` 删除 `module_id` 为 `ontology` 的条目。第 2 轮：恢复条目，只把该条目 `urls.stage` 的 `https://` 改为 `http://`（其余不变）。
  - Requestly（备选）：**Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules`，Status `200`，body 粘贴整份真实响应后按上面两轮修改（建议用 Programmatic 模式只改该条目，避免手工复制整份 body）。
- **步骤**：1. 清理：先不开 override，打开 `{base}/53105/ontology`，确认能看到 iframe（前置成立），在 Network 复制 `modules` 原始响应备查。2. 第 1 轮 override，硬刷新 `{base}/53105/ontology`（modules 只在启动时请求，必须整页刷新）。3. 记录页面文本、`role="alert"`、是否有 iframe；Console 执行 `window.ontologyModuleUrl`（应为 `undefined`）。4. 第 2 轮 override，硬刷新，重复第 3 步（`window.ontologyModuleUrl` 应以 `http://` 开头）。5. 撤销：删除 override 文件、取消 Enable Local Overrides / 停用 Requestly 规则；硬刷新确认 iframe 恢复。
- **预期**：页面显示英文（未本地化）`Ontology is not available right now.`，`role="alert"`，无 iframe。
- **核对**：spec 0.3.7 一致（OBS-FRAME-002 第 652-662 行状态表 “URL missing or not https”；S-32 第 1172 行）。stage 构建无差异（`layouts/ontology/index.tsx`、`modules/initModules.ts` 未改；stage 实测 `window.ontologyModuleUrl` 存在，见 RT-MF-001）。
- **代码位置**：OBS-FRAME-002；S-32（文案未国际化）；`index.tsx:38-44`；`@platform-base/api@1.5.0 index.mjs:667-691` `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-010 · 国家列表成功与失败（P2）
<!-- group: override -->
- **账号与前置**：T5 账号 A2（已注册、问卷未完成，`registration_data.is_completed=false`）。本用例不点 Next 提交，A2 不会失效。下文 `{m}` 为 A2 的 merchant id。
- **工具配置**：Requestly **Modify API Response**，URL `Matches (Regex)` `^https://account-platform-gateway\.nl-k8s-stage\.srv\.local/mapi/merchant/current/merchants/\d+/directories/countries$`，Status `200`，Static body，三轮分别为：
  ```json
  {"ZW":"Zimbabwe","AF":"Afghanistan","DE":"Germany"}
  ```
  ```json
  {"result":{"ZW":"Zimbabwe","AF":"Afghanistan","DE":"Germany"}}
  ```
  ```json
  {"result":[{"code":"ZW","name":"Zimbabwe"},{"code":"AF","name":"Afghanistan"},{"code":"DE","name":"Germany"}]}
  ```
  第 4 轮改为 Status `500`，body `{}`。DevTools Local overrides 也可做前三轮（只改内容）。
- **步骤**：1. 清理：停用其他规则。2. 无规则打开 `{base}/registration`，展开 Country or region，确认选项按名称排序。3. 依次启用三种形状 body，每次硬刷新 `/registration`，展开下拉，记录选项与顺序（应为 Afghanistan、Germany、Zimbabwe）。4. 启用 500 规则，硬刷新，展开下拉，记录是否为空、有无错误提示；Network 过滤 `directories/countries` 记录请求次数。5. 不刷新页面，观察 1–2 分钟内是否自动重发。6. 撤销：停用规则，硬刷新。
- **预期**：1. 下拉按名称排序；`{AF:"Afghanistan"}`、`{result:{…}}`、`{result:[{code,name}]}` 三种形状都能显示。2. 下拉为空，无错误提示；同一 merchant 1 小时内不重发。
- **核对**：spec 0.3.7 一致（第 847 行接口；第 910 行 `countries` 设为 3600 s）。**T 文件与代码不一致（代码推断）**：3600 s 只缓存成功数据；失败时没有 `fulfilledTimeStamp`，RTK 1.9.7 在下一次挂载（例如 Step 2 → Back 回到 Step 1，表单会重新挂载）时会重新请求，“1 小时内不重发”只在同一次挂载内成立。stage 构建无差异（`core/apis/directories.ts`、`store/api/directories.ts`、`RegistrationForm.tsx` 未改）。
- **代码位置**：`core/apis/directories.ts:15-46`；`store/api/directories.ts:25`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-SEC-105 · S-03 钓鱼 iframe 的安全影响（P1）
<!-- group: override -->
- **账号与前置**：同 RT-FRAME-002（Xsolla admin，merchant 53105；无真实卡片时用 Requestly 虚构 card `9001`、step `1`）。
- **工具配置**：同 RT-FRAME-002。Requestly **Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/53105/salescards/9001`，Status `200`，Static body，勾选不调用服务器：
  ```json
  {"id":9001,"activeStepId":1,"steps":[{"id":1,"url":"https://developers.xsolla.com@example.org/x"}]}
  ```
  完整测试 URL 列表见 RT-FRAME-002（a 后缀子域、b userinfo、c 拼接主机、d 端口；补充 e userinfo 带口令 `https://developers.xsolla.com:pw@example.org/x`、f `https://docs.unity3d.com.example.org/x`；对照 `https://developers.xsolla.com/doc/`）。大小写与 http 的误拒见 RT-FRAME-004。本用例只要求 b；`example.org` 可解析，iframe 会真正加载第三方内容，最直观。
- **步骤**：1. 清理同 RT-FRAME-002 第 1 步。2. 启用 b 规则，打开 `{base}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=1`。3. Elements 检查 `iframe[title="integration-guide"]`：`src`、有无 `sandbox` 属性。4. Network 过滤 Doc，确认 iframe 文档请求主机为 `example.org`。5. 截图：host 外壳（topbar/导航）内加载 example.org 内容。6. Console 的 JavaScript context 下拉框中确认出现 `example.org` 的 frame 条目（证明该 frame 可执行脚本；不在其中执行任何导航脚本）。7. 撤销：停用 Requestly 规则，硬刷新确认恢复 loader。
- **预期**：记录：iframe 在 host 外壳内加载攻击者主机内容，无 sandbox，可执行脚本和顶层导航（`top.location`）。修复后不渲染。
- **核对**：spec 0.3.7 一致（S-03 第 1143 行；§8.1 第 890 行：所有 iframe 无 `sandbox`）。补充说明：Chrome 对跨域 iframe 修改 `top.location` 有 framebusting 限制（需用户激活），“可顶层导航”应理解为无 sandbox 约束、受浏览器默认策略限制，结果按实际记录。stage 构建无差异（见 RT-FRAME-002）。
- **代码位置**：S-03；§8.1 iframe
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

## 组 3：改状态码（14 条）

### RT-AUTH-011 · 403 不注销（P1）
<!-- group: status -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。T 文件写“任意一个带 token 的请求”，下面固定两个目标，分别覆盖 host 实例和 SDK 实例的拦截器。
- **工具配置**：
  - Requestly Modify API Response，Status code 403，body `{"code":403,"error":"forbidden"}`：
    - 目标 1（host `gatewayInstance`）：`*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/53105/analytics/metrics/balance*`
    - 目标 2（SDK `gatewayInstance`）：`*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/53105/privileges*`
  - DevTools 不能改状态码，不适用。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；Throttling 为 No throttling；勾选 Preserve log。
  2. 启用目标 1，打开 `{base}/53105/dashboard`。在 Network 中确认 balance 请求带 `Authorization` 头（只看是否存在，不看值）且返回 403。
  3. 观察 10 s：地址栏不变，没有 `/logout` 或 `/login` 请求，Application › Cookies 中 `pa-v4-token` 仍存在。
  4. 停用目标 1，启用目标 2，硬刷新 `{base}/53105/dashboard`，重复步骤 3。
  5. 撤销：停用所有规则，刷新确认正常。
- **预期**：不发生导航，会话保留，由页面或路由自己处理。
- **核对**：spec 0.3.7 一致（OBS-AUTH-006，第 272–273 行；AC-03，第 964–967 行；§8.3 第 921 行）。行号小差异：spec 写 `gateway-instance.ts:77-79`，T 文件写 `:77-80`。stage 构建：host `src/core/apis/gateway-instance.ts` 在两个 commit 间相同；SDK 拦截器在 stage 为 platform-apis 2.29.0（T 依据 2.29.2），未能核对。
- **代码位置**：OBS-AUTH-006、AC-03、I7；`gateway-instance.ts:77-80`；platform-apis `gateway-instance.ts:108-109`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-AUTH-012 · 匿名请求返回 401 不注销（P2）
<!-- group: status -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。A5b 已覆盖 abort/500 的白屏结果；本条只验证 A5b 未覆盖的 **401 + 已登录会话不被注销**。
- **工具配置**：Requestly Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，Status code 401，body `{"code":401,"error":"unauthorized"}`。DevTools 不能改状态码，不适用。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；Throttling 为 No throttling；勾选 Preserve log、Disable cache。
  2. ⚠ 如果实际发生注销，会话会丢失，建议放在本批次靠后执行。
  3. 启用规则，硬刷新 `{base}/53105`，等待 20 s。
  4. 在 Network 中确认 `/api/v1/modules` 请求**没有** `Authorization` 头，且返回 401。
  5. 观察：白屏；Console 有 `Failed to initialize application`；没有 `/logout`、`/login` 导航；Application › Cookies 中 `pa-v4-token` 仍在。
  6. 撤销：停用规则，硬刷新 `{base}/53105`，确认无需重新登录即可进入。
- **预期**：启动失败、白屏（同 RT-BOOT-002），但不导航到 `/logout`。
- **核对**：spec 0.3.7 一致（OBS-AUTH-007，第 275–276 行）。行号小差异：spec 写 `gateway-instance.ts:85-89`，T 文件写 `:85-90`。stage 构建：host 文件相同；SDK platform-apis 在 stage 为 2.29.0，未能核对。
- **代码位置**：OBS-AUTH-007；`gateway-instance.ts:85-90`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MAG-007 · merchant 水合失败时 fail-open（P2）
<!-- group: status -->
- **账号与前置**：A5（Xsolla admin，可用默认 QA 账号 merchant 53105）。另需 `{foreign}`：stage 上存在、且该 admin 不是成员的 merchant id，向测试数据负责人索取。admin 打开 `{foreign}` 可能改写 merchant 相关 cookie（`pa-merchant-id`），结束后要切回 53105。
- **工具配置**：Requestly Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/organization/{foreign}/detail*`（把 `{foreign}` 换成实际 id），Status code 500，body `{"code":500,"error":"x"}`。DevTools 不能改状态码，不适用。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；勾选 Preserve log；Console 勾选 Preserve log。
  2. 以 A5 登录，先打开 `{base}/53105` 确认正常。
  3. 启用规则，打开 `{base}/{foreign}`。
  4. 记录：Console 是否有 `[useMerchantAccessGuard] merchant hydration failed`；页面是否照常渲染；地址栏是否仍为 `/{foreign}`；页面上的 org 名称或数据是否属于 admin 默认 org（53105）。
  5. 撤销：停用规则；打开 `{base}/53105`，确认 merchant 切换器显示 53105；必要时用切换器切回 53105。
- **预期**：**当前**：Console 打印 `[useMerchantAccessGuard] merchant hydration failed`；页面照常渲染，但内容是 admin 默认 org 的数据，URL 仍是 `/{foreign}`（这是有意的取舍）。说明：普通成员首次加载时 store 已经是 URL 中的 merchant，这条路径基本走不到。
- **核对**：spec 0.3.7 一致（OBS-MAG-005，第 333–335 行；§8.3 第 924 行）。行号小差异：spec 写 `ps:slices/user.ts:148-170`，T 文件写 `:145-172`。stage 构建：host `src/routes/useMerchantAccessGuard.ts` 在两个 commit 间相同；stage 锁定 platform-store 1.15.3（T 依据 1.15.6），`slices/user.ts` 未能核对。
- **代码位置**：OBS-MAG-005；`useMerchantAccessGuard.ts:186-197`；platform-store `src/slices/user.ts:145-172`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ERR-001 · 水合失败显示错误页（P1）
<!-- group: status -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。
- **工具配置**：Requestly Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/users/get_init_info*`，Status code 500，body `{"code":500,"error":"x"}`。DevTools 不能改状态码，不适用。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；勾选 Preserve log。
  2. 启用规则，打开 `{base}/53105/dashboard`。
  3. 记录：页面是否为 500 “unexpected” 页面；Elements 中搜索 `data-id="merchant-required-error"`；导航栏是否为 NavigationLite（未登录样式）；等待 30 s，Network 中 `get_init_info` 是否没有自动重试。
  4. 如紧接着执行 RT-ERR-002，保持规则启用，跳到 RT-ERR-002。
  5. 撤销：停用规则，刷新，确认恢复正常。
- **预期**：显示 500 “unexpected” 页面，`data-id="merchant-required-error"`；导航栏是 NavigationLite（未登录样式）；不会自动重试，刷新并恢复接口后正常。
- **核对**：spec 0.3.7 一致（OBS-ERR-002，第 722–723 行；§8.3 第 925 行）。stage 构建：`src/core/hocs/withMerchantRequired.tsx`、`src/routes/useMerchantAccessGuard.ts` 在两个 commit 间相同；stage 锁定 platform-store 1.15.3（`fetchUserData` 所在），未能核对。
- **代码位置**：OBS-ERR-002；`withMerchantRequired.tsx:16-24`、`:41-60`；`useMerchantAccessGuard.ts:112-121`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ERR-002 · 错误页的“回到首页”按钮（P2）
<!-- group: status -->
- **账号与前置**：接 RT-ERR-001（同一账号、同一页面，`get_init_info` 500 规则保持启用）。
- **工具配置**：与 RT-ERR-001 相同：Requestly Modify API Response，`*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/users/get_init_info*` → 500。
- **步骤**：
  1. 在 RT-ERR-001 的错误页上点击 “Go to homepage”（c1b5e37 `src/locales/en.json:115` `host.layouts.error.toHomepage`；R1 RT-NAV-030 实测文案相同。T1 写的 “To homepage” 有误）。
  2. 记录：是否客户端导航（Network 中没有新的 document 请求）；地址栏是否为 `{base}/`；页面显示登录表单、空白，还是其他内容（截图）。
  3. 撤销：停用规则，刷新，确认恢复正常。
- **预期**：客户端导航到 `/`。此时 user 为 null 且有 `userError`，`entrySettled` 为 true，于是渲染 LoginPage。待确认：已登录用户此时看到的是登录表单还是空白。
- **核对**：spec 0.3.7 无对应编号，无法核对。stage 构建：`src/layouts/error/ErrorComponent.tsx` 在两个 commit 间相同（只增加了测试）。
- **代码位置**：`src/layouts/error/ErrorComponent.tsx:49-59`；`useMerchantAccessGuard.ts:80-85`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ERR-006 · S-04 权限获取失败导致永久 loading（P1）
<!-- group: status -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代（admin 同样先经过 awaiting-privileges 判断）。可与 A5a 同一次执行。
- **工具配置**：Requestly Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/53105/privileges*`，Status code 500，body `{"code":500,"error":"x"}`。**不要改成 401**（会注销，见 RT-AUTH-009）。DevTools 不能改状态码；如只能用 DevTools，可用 Network › Request blocking 屏蔽同一 pattern 作为近似（属 RT-ACC-003 的做法）。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；勾选 Preserve log。
  2. 启用规则，硬刷新 `{base}/53105/dashboard`，确认 `privileges` 请求返回 500，dashboard 正常（步骤 3 的预期）。
  3. 在应用内（不刷新）导航到 `{base}/53105/tax-interview`，等待 60 s，确认一直显示 `data-id="route-privileges-loader"`，Network 中 `privileges` 没有新请求。
  4. 在应用内导航到 `{base}/53105/documents`，重复步骤 3。
  5. 也可直接整页打开上面两个 URL（规则仍启用），确认结果相同。
  6. 撤销：停用规则，刷新，确认 tax-interview 页面正常加载。
- **预期**：**当前**：2 一直显示 `data-id="route-privileges-loader"`，整个会话中没有重试；3 正常。**修复后**：2 显示错误态，并提供重试。注意：如果改成 401，会触发注销（RT-AUTH-009）。
- **核对**：spec 0.3.7 一致（S-04，第 1144 行；OBS-ACC-002，第 381–382 行；§8.3 第 923 行）。行号小差异：spec 写 `route-access.ts:136-139`，T 文件写 `:136-142`。stage 构建：`src/core/access/route-access.ts`、`src/routes/RouteAccessGuard.tsx` 相同；`src/routes.tsx` 只多了 `/login/mcp` 路由，不影响本条；stage 锁定 platform-store 1.15.3（T 依据 1.15.6 `slices/privileges.ts`），未能核对。
- **代码位置**：S-04；`src/core/access/route-access.ts:136-142`；`src/routes/RouteAccessGuard.tsx:38`、`:69-70`；platform-store@1.15.6 `src/slices/privileges.ts:160-170`；`src/routes.tsx:90-136`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ERR-007 · 非 gateway 实例返回 401 时没有全局处理（P2）
<!-- group: status -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。topbar 需显示 Communication Hub 通知点（会发 chat-api 状态请求）。
- **工具配置**：Requestly Modify API Response，URL Wildcard `*://chat.nl-k8s-stage.srv.local/api/v2/support-hub/*/notifications/status*`，Status code 401，body `{"error":"unauthorized"}`。主机来自 `src/config.ts:89-93` 的 stage `chatApiUrl`，路径来自 platform-apis 2.29.2 `fetchSupportHubNotificationStatus`；执行前先在 Network 中筛选 `support-hub` 确认 stage 上真实请求的 URL，不一致时按实际 URL 改规则。DevTools 不能改状态码，不适用。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；勾选 Preserve log。
  2. ⚠ 如果实际发生注销，会话会丢失，建议放在本批次靠后执行。
  3. 不启用规则，打开 `{base}/53105/dashboard`，在 Network 中找到 `notifications/status` 请求，记录完整 URL（不记录请求头值）。
  4. 启用规则，刷新页面，确认该请求返回 401。
  5. 观察 30 s：地址栏不变；没有 `/logout`、`/login` 请求；`pa-v4-token` cookie 仍在；页面可继续操作。
  6. 撤销：停用规则，刷新确认正常。
- **预期**：不注销，不导航（只有 gateway 实例有 401 拦截器）。
- **核对**：spec 0.3.7 一致（§8.3 第 922 行“非 gateway 实例的 401：没有全局处理”）。stage 构建：c1b5e37 的 `src/App.tsx:51` 同样调用 `setupChatApiAxios`；stage 锁定 platform-apis 2.29.0，chat-api 请求路径未能按 stage 版本核对（URL 待确认：候选 `https://chat.nl-k8s-stage.srv.local/api/v2/support-hub/53105/notifications/status`）。
- **代码位置**：§8.3；`src/App.tsx:46-51`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### A5a · S-04 权限请求失败（财务页）（P1）
<!-- group: status -->
- **账号与前置**：默认 QA 账号（Xsolla admin，merchant 53105，项目 317869）。做法 2 另需一个 stage 上存在、且该 admin 不是成员的 merchant id（记为 `{other}`）。与 RT-ERR-006 的区别：机制相同（privileges 请求失败 → 列表 settled-empty → `awaiting-privileges` 永久 loader），只是入口换成财务页 `{base}/{mid}/finance`（`Privilege.TransactionsRegistry`）。做法 1 可与 RT-ERR-006 同一次执行。
- **工具配置**：
  - 做法 1（推荐，只读，不切 merchant）：Requestly Modify API Response，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/53105/privileges*`，Status code 500，body `{"code":500,"error":"x"}`。不要改成 401（会注销）。
  - 做法 2（spec 原计划，不需要改写工具）：admin 切换到 `{other}` 后进入财务页，依赖后端对 `{other}` 的 privileges 请求自然失败。会改写 merchant 相关 cookie（`pa-merchant-id`），事后必须切回 53105。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；勾选 Preserve log。
  2. 做法 1：启用规则，打开 `{base}/53105/dashboard`，确认 `privileges` 返回 500；在应用内导航到 `{base}/53105/finance`，等待 60 s，记录是否一直显示 `data-id="route-privileges-loader"`，Network 中 `privileges` 是否没有重试。随后停用规则，刷新，确认财务页正常。
  3. 做法 2：打开 `{base}/{other}/finance`（或用 merchant 切换器选 `{other}` 后点击财务菜单）。在 Network 中查看 `/api/account/platform/{other}/privileges` 的状态码：
     - 非 2xx 且非 401：按做法 1 的观察项记录；
     - 200 且列表非空：后端没有让它失败，本做法记 N/A，以做法 1 为准；
     - 401：会触发注销，记录后重新登录。
  4. 做法 2 撤销：打开 `{base}/53105` 或用切换器切回 53105；在 Application › Cookies 确认 `pa-merchant-id` 对应 53105（只看是否为 53105）；刷新后确认默认进入 53105。
- **预期**：**当前**：财务页一直显示 `data-id="route-privileges-loader"`，整个会话中没有重试；不需要 privileges 的页面（dashboard）正常。**修复后**：显示错误态，并提供重试（同 RT-ERR-006）。
- **核对**：spec 0.3.7 一致（S-04，第 1144 行；OBS-ACC-002，第 381–382 行；§10.3 第 1104 行“A5a 需要切换到其他 merchant，会改写 merchant 相关的 cookie”）。说明：“进入财务页”的原计划出自 `regression-test/stage-results-2026-10-21.md:212`，spec 第 382 行是 OBS-ACC-002 正文，不含该计划。stage 构建：`src/routes/inside/finance.ts` 与 `route-access.ts` 在两个 commit 间相同；platform-store 版本差异同 RT-ERR-006。
- **代码位置**：S-04；`src/core/access/route-access.ts:136-142`；`src/routes/RouteAccessGuard.tsx:38`、`:69-70`；platform-store@1.15.6 `src/slices/privileges.ts:160-170`；`src/routes/inside/finance.ts:42-43`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-002 · 余额 4xx（403/404）（P1）
<!-- group: status -->
- **账号与前置**：owner，有 `GetMetricBalance`（同 RT-API-001）；默认 Xsolla admin，merchant 53105。注意：53105 的 balance 为 0，成功时也显示 AskAi 横幅、余额显示 `0.00`；本用例的区分点是余额与日期变为 `—`、且未登出。
- **工具配置**：Requestly **Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/53105/analytics/metrics/balance`，第 1 轮 Status `403`，第 2 轮 Status `404`，body `{}`（勾选不调用服务器；GET 只读，不勾也可）。DevTools Local overrides 不能改状态码，不适用。
- **步骤**：1. 清理：停用其他 Requestly 规则；先无规则打开 `{base}/53105/dashboard`，记录正常显示（`0.00`）。2. 启用 403 规则，硬刷新 dashboard，Network 过滤 `metrics/balance` 确认状态码 403。3. 记录余额、上次/下次 payout 日期、顶部是 AskAi 横幅还是欢迎标题、URL 是否跳转 `/logout` 或登录页（观察 5 秒以上）。4. 改为 404，重复 2–3。5. 撤销：停用规则，硬刷新确认恢复。
- **预期**：余额与两个日期都显示 `—`；顶部显示 AskAi 横幅（不是欢迎标题）；**不**登出。
- **核对**：spec 0.3.7 一致（第 466 行：失败的 balance 请求按无交易处理，含 403，显示 AskAiBanner；OBS-DASH-004：出错显示 `—`；gateway 只对 401 注销）。stage 构建：`Dashboard.tsx`、`gateway-instance.ts`、`store/api/dashboard.ts` 未改；`AskAiBanner/index.tsx` 有改动（只加埋点与 enText），不影响是否显示。
- **代码位置**：`Dashboard.tsx:86-89`；`gateway-instance.ts:77-80`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-003 · 余额 5xx / 网络失败（P1）
<!-- group: status -->
- **账号与前置**：同 RT-API-002。
- **工具配置**：
  - Requestly **Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/53105/analytics/metrics/balance`，Status `500`，body `{}`。
  - DevTools Network request blocking：pattern `*/analytics/metrics/balance*`（第 2 轮，网络失败）。
- **步骤**：1. 清理同 RT-API-002 第 1 步。2. 启用 500 规则，硬刷新 `{base}/53105/dashboard`；Network 过滤 `metrics/balance`，记录请求次数（应只有 1 次，无自动重试）和页面显示。3. 从侧边栏进入其他页面（如 `/53105/settings/company`），再从侧边栏回到 Dashboard（客户端导航，不刷新），记录是否重新请求 `metrics/balance`。4. 停用 Requestly 规则，改用 DevTools 屏蔽 pattern，硬刷新，重复 2–3。5. 撤销：停用规则、删除屏蔽 pattern，硬刷新。
- **预期**：同 RT-API-002（余额与日期 `—`、AskAi 横幅、不登出）；RTK Query 不自动重试。离开再返回 Dashboard 时是否重发请求，记录结果，**待确认**（代码推断：失败结果没有 `fulfilledTimeStamp`，RTK 1.9.7 在新订阅时会重新请求）。
- **核对**：spec 0.3.7 一致（第 910 行：`gcApi` 默认 `keepUnusedDataFor` 60 s；第 466 行失败按无交易处理）。stage 构建无差异（`core/store/api.ts`、`store/api/dashboard.ts` 未改）。
- **代码位置**：`core/store/api.ts:37-45`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-021 · UTM 卡片查询失败 / 单 merchant 单项目（P2）
<!-- group: status -->
- **账号与前置**：第 1、3 步用 Xsolla admin，merchant 53105（有多个项目，满足“merchant >1 或项目 >1”）。第 2 步用账号 A：只有 1 个 merchant 和 1 个项目（需单独准备）。注意代码中 “merchant 数” 实际取 `selectAccounts`（`GET /api/v1/sub_sites` 的 business account 列表），账号 A 的 business account 也应只有 1 个。
- **工具配置**：
  - Requestly **Modify API Response**，URL `Contains` `account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/salescards/info`，Status `500`，body `{}`（第 1 步）。
  - 安全规则（全程开启，防止弹窗挂载时写入）：DevTools Network request blocking 添加 `*handle_all_utms*` 与 `*salescards/assign_to_user*`（或 Requestly **Cancel Request**，URL `Contains` 同名片段）。
- **步骤**：1. 清理：停用其他规则；先添加安全规则。2. 启用 500 规则，打开 `{base}/53105/dashboard?utm_campaign=a,b`；Network 过滤 `salescards`，确认只请求 `salescards/info?utm_campaign=a` 且返回 500；记录有无弹窗、有无提示。3. 停用 500 规则，用账号 A 登录，打开 `{base}/{A 的 m}/dashboard?utm_campaign=a,b`，确认 Network 中没有 `salescards/info`。4. 回到 admin，打开 `{base}/53105/dashboard?utm_campaign=a%26b`，再打开 `…?utm_campaign=a%23b`；在 Network 中查看实际请求 URL 与 Payload › Query String Parameters，记录后端收到的值。5. 撤销：停用 Requestly 规则；最后删除安全规则。
- **预期**：1. 无弹窗、无提示。2. 不发请求。3. 未编码拼接（S-08）：记录后端收到的值。
- **核对**：spec 0.3.7 一致（S-08 第 1148 行；OBS-DASH-005 第 478 行只用第一个 campaign）。**代码与 spec/T 用语不一致**：spec OBS-DASH-005（第 477 行 “more than one merchant”）与 T 文件 “只有 1 个 merchant” 指 merchant 数，但 `Dashboard.tsx` 的 `merchants = useAppSelector(selectAccounts)`，platform-store 中 `selectAccounts = state.accounts.list`，来源是 `/api/v1/sub_sites`（business account 列表）。stage 构建无差异（`Dashboard.tsx`、`upsell.ts` 未改）。
- **代码位置**：`Dashboard.tsx:98-116`；S-08
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-022 · handle_all_utms 失败：只把响应改 500，请求本身仍会到达后端吗？（P2）
<!-- group: status -->
- **账号与前置**：RT-API-020 的弹窗：Xsolla admin，merchant 53105（项目 >1，有 dashboard privileges）。无真实 UTM 数据时，用 Requestly 伪造 `salescards/info` 响应让弹窗出现。⚠ `UpsellModal` 挂载即发写入请求 `PUT https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/handle_all_utms`（body `null`），无需任何点击。规则必须在打开 dashboard 前就生效。
- **工具配置**：
  - 规则 1（弹窗数据）：Requestly **Modify API Response**，URL `Contains` `account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/merchants/salescards/info`，Status `200`，Static body，勾选 “Serve response without making a call to the server”：
    ```json
    [{"id":1,"title":"QA card","image_url":""}]
    ```
  - 规则 2（写入接口改 500）：Requestly **Modify API Response**，URL `Contains` `/mapi/merchant/current/merchants/handle_all_utms`，Status `500`，body `{}`，**必须勾选** “Serve response without making a call to the server”。只改响应、不勾此项时，PUT 仍会到达后端并完成写入，Requestly 只是替换了返回给页面的响应。
  - 若扩展版本没有该选项，或无法确认请求未发出：改用 DevTools Network request blocking `*handle_all_utms*`（或 Requestly **Cancel Request** / **Redirect Request** 到 `https://invalid.invalid/`），请求不会到达后端；页面拿到的是网络错误而不是 500，预期的 unhandled rejection 同样成立，在结果中注明采用的方式。
  - 安全规则：DevTools blocking `*salescards/assign_to_user*`（防止误点项目时发 `POST assign_to_user`）。
- **步骤**：1. 清理：停用其他规则；先启用安全规则与规则 2（或 blocking），再启用规则 1。2. Console 清空，Network 勾选 Preserve log。3. 打开 `{base}/53105/dashboard?utm_campaign=qa`。4. 记录弹窗是否照常显示（标题 “QA card”）；Console 是否出现 `Uncaught (in promise)`；Network 中 `handle_all_utms` 的状态（500 / blocked）。5. 不选项目，直接关闭弹窗。6. 撤销：停用规则 1、2，最后删除 blocking 安全规则；刷新 dashboard（不带 `utm_campaign`）。
- **预期**：弹窗照常显示；Console 出现 `Uncaught (in promise)`（调用没有 catch）。附加记录：采用的拦截方式，以及请求是否到达后端（Requestly 静态响应或 blocking 时应未到达）。
- **核对**：spec 0.3.7 一致（OBS-DASH-005 第 479 行：弹窗挂载时调用 `PUT handle_all_utms`；第 850 行接口表）。**T 文件代码行号不符**：调用位于 `UpsellModal/index.tsx:49-51`（`useEffect(() => { handleUtmCampaigns(); }, [])`），不是 34-36；c1b5e37 与 772a320 该文件相同。stage 构建无差异。
- **代码位置**：`UpsellModal/index.tsx:34-36`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-041 · currency 列表失败（P2）
<!-- group: status -->
- **账号与前置**：有 `ProjectSettings` privilege（同 RT-API-040）；默认 Xsolla admin，merchant 53105，项目 317869。
- **工具配置**：Requestly **Modify API Response**，URL `Equals` `https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/currency/list`，Status `500`，body `{}`。
- **步骤**：1. 清理：停用其他规则。2. 启用规则后**整页刷新**进入 `{base}/53105/projects/317869/edit/webhooks`（模块级缓存只在整页刷新后清空，必须先刷新）。3. 打开 payments 页签，Network 过滤 `currency/list`，确认 500；记录页签是否渲染。4. 切到 dispute 页签，记录是否再次请求 `currency/list`。5. 撤销：停用规则，整页刷新。
- **预期**：页签仍渲染，`currency.items=[]`；切到 dispute 时重新请求（失败不缓存）。
- **核对**：spec 0.3.7 一致（第 810、852 行：货币列表来自 `/mapi/merchant/current/currency/list`）。stage 构建：`webhookRemotes.tsx` 在 c1b5e37..772a320 有改动，但只给 `GcTab` 加 identity 门控，`useCurrency` 未改，结论不受影响。
- **代码位置**：同上（`webhookRemotes.tsx:107-138`）
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-API-051 · store features 4xx/5xx/401/网络失败（P2）
<!-- group: status -->
- **账号与前置**：项目侧边栏可见 LiveOps，后端 `offer_chains_feature`、`daily_chains_feature` 为 `'1'`（同 RT-API-050）。默认 Xsolla admin，merchant 53105，项目 317869；若该项目两个 toggle 不是 `'1'`，菜单本来就隐藏，本用例记 BLOCKED。
- **工具配置**：
  - Requestly **Modify API Response**，URL `Contains` `store-api.nl-k8s-stage.srv.local/v2/project/317869/admin/features`，依次 Status `403`、`500`、`401`，body `{}`。
  - DevTools Network request blocking：pattern `*store-api.nl-k8s-stage.srv.local/v2/project/*/admin/features*`（第 4 轮）。
- **步骤**：1. 清理：无规则打开 `{base}/53105/projects/317869`，确认侧边栏显示 Daily rewards、Offer chains；Network 确认请求 `…/v2/project/317869/admin/features?features[]=offer_chains_feature&features[]=daily_chains_feature`。2. 依次启用 403、500、401 规则，每次硬刷新项目页，记录两个菜单是否隐藏、有无提示。401 轮额外观察 10 秒，确认没有跳转 `/logout` 或登录页。3. 停用 Requestly，启用 DevTools 屏蔽，硬刷新，记录。4. 撤销：停用规则、删除屏蔽 pattern，硬刷新确认菜单恢复。
- **预期**：两个菜单都隐藏，无提示；401 **不**登出（不经 gateway 实例）。
- **核对**：spec 0.3.7 一致（第 857 行：`/project/{p}/admin/features` 走 `storeApiUrl`）。stage 构建无差异（`core/apis/storeFeatures.ts`、`store/slices/storeFeatures.ts` 未改；`project-sidebar-v2/nav-items-config.tsx` 只改 email customizer 链接）。
- **代码位置**：`store/slices/storeFeatures.ts:47-50`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

## 组 4：Throttling / 延迟 / 挂起（11 条）

### RT-AUTH-019 · ToU 待签跳转与 10 s fail-open（P1）
<!-- group: throttle -->
- **账号与前置**：需要 3 个账号：A8（owner，其 org 有待签 ToU 或 PP）；A9（非 owner 成员，所属 org 有待签 ToU）；A5（Xsolla admin，可用默认 QA 账号 merchant 53105）。A8、A9 需向测试数据负责人申请；没有则记 BLOCKED。
- **工具配置**：
  - Requestly Delay Network Requests，URL Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/organizations/*/legal-documents/consents/status*`，延迟 15000 ms。如果 Requestly 版本限制延迟上限低于 15000 ms，改用 Charles Breakpoint 挂住该请求（可挂住不放，观察永久挂起）。
  - DevTools 备选：Network › Throttling › Add custom profile，Latency 15000 ms（会拖慢所有请求，只在 Requestly/Charles 不可用时使用）。
- **步骤**：
  1. 清理：清空 Request blocking；停用其他 Requestly 规则；清空 Overrides；Throttling 为 No throttling；勾选 Preserve log。
  2. 步骤 1（无延迟）：分别以 A8、A9、A5 登录，打开 `{base}/{mid}/dashboard`，记录最终 URL。
  3. 步骤 2（延迟）：启用延迟规则，以 A8 打开 `{base}/{mid}/dashboard`。用秒表记录：0–10 s 是否显示 loading；约 10 s 时是否放行并渲染页面；约 15 s 延迟的响应到达后，页面是否又被重定向到 `/legal-consent`（见核对）。
  4. 撤销：停用延迟规则（或释放 Charles 断点），Throttling 恢复 No throttling。
- **预期**：1. A8 → `/legal-consent`；A9 → `/account-no-access`；A5 直接进入。2. 10 s 后 fail-open，放行进入页面。
- **核对**：spec 0.3.7 一致（U-01，第 1227 行，已关闭）。T 文件和 spec 未写：按 platform-components 4.20.3 源码，超时后放行只持续到响应到达；有限延迟（如 15 s）的响应返回待签状态后，`needsAcceptance` 变为 true，A8 会再被重定向到 `/legal-consent`。只有请求永久挂起时才一直停在页面上。stage 构建差异：stage 锁定 platform-components 4.20.1（T 依据 4.20.3），`LegalDocumentConsentGuard` 是否有 10 s 超时未能核对。
- **代码位置**：U-01；platform-components@4.20.3 `src/auth/LegalDocumentConsentGuard/index.tsx:40-41`、`:181-260` [P3]
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ACC-002 · 权限加载期间显示 loader（P1）
<!-- group: throttle -->
- **账号与前置**：owner 级全权限账号。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）；该账号必须持有 `get_merchant_boxnet_url`，否则 `/documents` 会落 `/forbidden`。Chrome 已连内网（`*.srv.local` 可达），已登录 {base}。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Throttling 下拉选 `Slow 3G`（新版 Chrome 中名为 `3G`）。
  - Requestly（替代方案，只拖慢权限请求）：规则类型 Delay Network Requests；URL 匹配 Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/*/privileges*`；延迟 5000 ms（如扩展上限更低，取上限）。
- **步骤**：
  1. 清理：清空 Network › Request blocking 列表，停用所有 Requestly 规则，Throttling 设为 No throttling。
  2. 打开上面的一种限速配置。
  3. 地址栏直接打开 `{base}/53105/documents`，硬刷新（Cmd+Shift+R）。在 Network 中过滤 `privileges`，记下 `GET …/api/account/platform/53105/privileges` 返回的时间点。在 Elements 中搜索 `data-id="route-privileges-loader"`，确认它在该请求返回前存在，返回后消失。
  4. 地址栏直接打开 `{base}/53105/get-started`，硬刷新。在 `privileges` 请求返回前搜索 `route-privileges-loader`，确认不存在。
  5. 撤销：Throttling 改回 No throttling，停用 Requestly 规则。
- **预期**：**当前**：打开 `/{m}/documents` 时，在 `GET {gateway}/api/account/platform/{m}/privileges` 返回前显示 `data-id="route-privileges-loader"`；打开 `/{m}/get-started` 时不显示该 loader。
- **核对**：spec 0.3.7 一致（§4.5 OBS-ACC-001：匹配路由声明了 privileges 且权限未 settled 时渲染 `route-privileges-loader`；`/documents` 声明 `GetMerchantBoxnetUrl`，`/get-started` 不声明，`routes.tsx:82,134-136`）。stage 构建差异：`route-access.ts`、`RouteAccessGuard.tsx`、`routes.tsx` 的 get-started/documents 段在 c1b5e37 与 772a320 之间没有改动；SDK 版本不同（stage：platform-store 1.15.3 / platform-apis 2.29.0；基线：1.15.6 / 2.29.2），按代码推断不影响本条。
- **代码位置**：OBS-ACC-001；`route-access.ts:134-142`、`RouteAccessGuard.tsx:69-71`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-ACC-031 · features 未就绪时 section 规则放行（P2）
<!-- group: throttle -->
- **账号与前置**：jr-liveops 账号（`ROLE_JUNIOR_DEVELOPER`，merchant feature `liveops_only_role` 开启；T2 §5 账号表，待 QA 提供）。该账号还必须持有 `transactions_registry`：`/finance` 路由声明了该权限，路由规则先于 section 规则执行，缺权限时会直接 `/forbidden`，看不到本条要观察的窗口。默认 admin 账号不适用。已登录 {base}，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - Requestly（首选，只拖慢 features）：规则类型 Delay Network Requests；URL 匹配 Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/v2/merchants/*/features*`；延迟 5000 ms（如扩展上限更低，取上限）。可再加一条同样的 Delay 规则给 `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/users/feature_toggles*`（两者都计入 `selectIsFetchingFeatures`）。
  - DevTools（替代方案，全局限速）：Network › Throttling 选 `Slow 3G`（新版 Chrome 名为 `3G`）。全局限速会同时拖慢 privileges，窗口可能更短。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用其他 Requestly 规则，Throttling 设为 No throttling。
  2. ⚠ 会注销（如果 finance 页提前挂载并收到 401，网关拦截器会走 `/logout`），放在最后执行。
  3. 启用上面的 Delay 规则。
  4. 地址栏直接打开 `{base}/{m}/finance`，硬刷新。
  5. 在 Network 中记录：`…/features` 返回前，是否已发出 finance 页的数据请求或 finance remote 的 remoteEntry 请求；`…/features` 返回后 URL 是否变为 `/forbidden`；期间是否有请求返回 401，以及是否被重定向到 `/logout` → `/login`。
  6. 撤销：停用 Requestly 规则（或 Throttling 改回 No throttling）。如被注销，重新登录。
- **预期**：**当前**：features 返回前 finance 页可能先挂载并发请求，返回后才跳 `/forbidden`。记录期间是否出现 401 → 登出（WASP-2003 风险）。
- **核对**：spec 0.3.7 一致（§4.5 OBS-ACC-004 as-built 第 3 点：features 未 settled 时 section 规则全部放行；AC-08 是 settled 后的结果 `/forbidden`）。账号前置缺口：T2 §5 的 jr-liveops 定义没有要求 `transactions_registry`，缺该权限时本条不可观察（`routes/inside/finance.ts:43`；spec OBS-ACC-004 as-built 第 4 点“route rules run before section rules”）。stage 构建差异：`route-access.ts`、`RouteAccessGuard.tsx` 两版相同。
- **代码位置**：OBS-ACC-004；`route-access.ts:80-82`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-HOME-009 · 慢网下不提前跳转（P2）
<!-- group: throttle -->
- **账号与前置**：A-OWNER（有 dashboard 访问），已有 setup selection。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）；selection 的确认方法同 RT-HOME-008。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：DevTools：Network › Throttling 下拉选 `Slow 3G`（新版 Chrome 名为 `3G`）。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则。
  2. Throttling 设为 Slow 3G。
  3. 地址栏打开 `{base}/53105`，硬刷新。
  4. 观察：数据未就绪时显示居中 loader。全程录屏，记录地址栏的每次变化。确认最终一次跳到 `/53105/dashboard`，中途没有出现 `/forbidden` 或 `/get-started`。
  5. 撤销：Throttling 改回 No throttling。
- **预期**：**当前**：先显示居中 loader；数据就绪后一次性跳 `/{m}/dashboard`；中途不出现 `/forbidden` 或 `/get-started`。
- **核对**：spec 0.3.7 一致（§4.6 OBS-HOME-001：merchant、privileges、projects 都 settled 后才分流）。stage 构建差异：`DynamicHome/index.tsx` 两版相同。
- **代码位置**：OBS-HOME-001 H0；`DynamicHome/index.tsx:45-52`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-DASH-004 · balance 加载中与重新请求中（P2）
<!-- group: throttle -->
- **账号与前置**：A-OWNER；A-MULTI（同一用户属于 2 个 merchant，两个都满足 dashboard 访问）。第 1 步可用默认 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。第 2 步需要 A-MULTI；admin 能否在 topbar 切到另一个有 dashboard 访问的 merchant 待确认，不能则第 2 步标 BLOCKED。切换 merchant 会改写 merchant 相关 cookie，结束后切回原 merchant。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools：Network › Throttling 选 `Slow 3G`（新版 Chrome 名为 `3G`）。
  - Requestly（可选，只拖慢 balance，便于观察第 2 步）：规则类型 Delay Network Requests；URL 匹配 Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/*/analytics/metrics/balance*`；延迟 5000 ms（如扩展上限更低，取上限）。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用其他 Requestly 规则。
  2. 打开上面的限速配置。
  3. 打开 `{base}/{m}/dashboard`，硬刷新。在 `…/metrics/balance` 返回前确认：header 是欢迎语（不是 Ask AI），Balance 区是骨架屏。返回后，header 按余额决定（余额 0 或无 `last_transfer_date` → Ask AI，见 RT-DASH-001/002）。
  4. （A-MULTI）用 topbar 切到另一个 merchant 的 Dashboard。在新 merchant 的 `…/metrics/balance` 请求进行中确认：header 是欢迎语，Balance 区是骨架屏，没有闪现 Ask AI。请求完成后 header 按新 merchant 的余额决定。
  5. 撤销：Throttling 改回 No throttling，停用 Requestly 规则；用 topbar 切回原 merchant。
- **预期**：**当前**：1：加载期间显示欢迎语（不是 Ask AI）和余额骨架屏；加载完成后再按 RT-DASH-001/002 决定 header。2：新 merchant 的 balance 请求进行中（`isFetching`）同样显示欢迎语和骨架屏，不闪现 Ask AI；请求完成后按新 merchant 的余额决定 header。
- **核对**：spec 0.3.7 一致（§4.7 OBS-DASH-003：loading 或 refetching，包括切换 merchant 后，渲染欢迎语）。stage 构建差异：`Dashboard.tsx`、`DashboardBalance/index.tsx`、`store/api/dashboard.ts` 两版相同。
- **代码位置**：OBS-DASH-003；`Dashboard.tsx:86-89`；`DashboardBalance/index.tsx:39-41`；`store/api/dashboard.ts:106` [P3]
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-UI-014 · LiveChat 等待应用加载（P2）
<!-- group: throttle -->
- **账号与前置**：A-OWNER。默认用 Xsolla admin，merchant 53105，项目 317869（共 687 个项目，balance 为 0）。已登录，DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：DevTools：Network › Throttling 选 `Slow 3G`（新版 Chrome 名为 `3G`）。
- **步骤**：
  1. 清理：清空 Request blocking 列表，停用所有 Requestly 规则。
  2. Throttling 设为 Slow 3G。
  3. 硬刷新 `{base}/53105/dashboard`。
  4. 加载期间，在 Console 多次执行 `document.querySelectorAll('script[data-id="xsolla-chat-script"]').length`，记录结果。
  5. 加载完成后，在 Network 瀑布图中比较：`livechat-iframe.js` 的开始时间，应晚于 user/merchant 数据请求（如 `get_init_info`）、`…/api/account/platform/53105/privileges`、`…/mapi/merchant/v2/merchants/53105/features`、`…/users/feature_toggles` 以及当前项目详情请求（如有）的完成时间。
  6. 撤销：Throttling 改回 No throttling。
- **预期**：**当前**：应用加载中（user/merchant/privileges/project details/features 任一在加载）不注入 script。
- **核对**：spec 0.3.7 一致（§4.15 OBS-UI-003：“When the app is not loading …”）；spec 没有列出 loading 包含哪些标志，T3 列出的 5 项与 `Root.tsx:55-68` 一致（projects loading 不在其中）。stage 构建差异：`Root.tsx`、`LiveChat.tsx` 两版相同。
- **代码位置**：OBS-UI-003；`Root.tsx:63-68,252`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-003 · 模块列表慢：无超时（P1）
<!-- group: throttle -->
- **账号与前置**：Xsolla admin，merchant 53105，项目 317869，已登录 `{base}`。Chrome 已连内网。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。延迟规则必须在整页刷新前生效。
- **工具配置**：
  - Requestly（首选，只延迟该请求）：规则类型 Delay Network Requests；URL 匹配 Wildcard `*://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`；Request type 选 XHR/Fetch（该请求由 axios 发出，是 XHR）；Delay 60000 ms。Requestly 扩展对 XHR/fetch 的延迟在页面内实现；若规则编辑器提示超出上限，改用下面的代理方案。
  - Charles（替代）：Proxy › Breakpoint Settings 添加 `https://account-platform-gateway.nl-k8s-stage.srv.local/api/v1/modules*`，只勾选 Request；请求被拦下后等待 60 s 再点 Execute。也可用 Proxy › Throttle Settings，勾选 Only for selected hosts，host 填 `account-platform-gateway.nl-k8s-stage.srv.local`、port 443，Latency 60000 ms（会延迟该主机的所有请求；`/api/v1/modules` 是其中第一个）。两种方式都需要对该主机启用 SSL Proxying 并信任 Charles 根证书。Proxyman 的 Breakpoint 用法相同。
  - DevTools：Network › Throttling › Add…，新建自定义 profile，Latency 60000 ms。该设置是全局的：document、`main.*.js` 等也会各延迟 60 s，不能单独延迟 `/api/v1/modules`，只能作粗略参考，不作判定依据。
- **步骤**：
  1. 清理：停用所有 Requestly 规则；清空 Request blocking；删除已有 override；Throttling 设为 No throttling；Charles 断点与 Throttle 关闭。
  2. 启用上面一种延迟方案。
  3. Network 过滤 `modules`；硬刷新 `{base}/53105/dashboard`，开始计时。
  4. 在 0–60 s 内每隔约 10 s 观察页面：是否出现 loader、超时提示或错误页；在 Console 执行 `document.getElementById('root').childElementCount` 记录数值。
  5. `modules` 响应返回后，确认页面正常进入 dashboard，记录返回时刻。
  6. 撤销：停用 Requestly 规则或关闭 Charles 断点/Throttle，Throttling 改回 No throttling，整页刷新确认正常。
- **预期**：**当前**：60 s 内页面保持空白，无 loader、无超时提示；响应返回后正常进入。
- **核对**：spec 0.3.7 一致（§8.2 第 903 行“module 列表请求阻塞首屏，没有超时”，`init.tsx`）。stage 构建差异：`src/init.tsx` 在 c1b5e37 与 772a320 相同，`axios` 都是 1.18.1；gateway axios 实例由 `@accounts-sdk/platform-apis` 创建，stage 为 2.29.0（基线 2.29.2），本地未安装 2.29.0，实例的 `timeout` 设置在 stage 版本上未核对。
- **代码位置**：§8.2 "module 列表请求阻塞首屏，没有超时"；axios 默认 `timeout=0`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-043 · 加载超时（无超时机制）（P1）
<!-- group: throttle -->
- **账号与前置**：同 RT-MF-040。默认用 Xsolla admin，merchant 53105，项目 317869。选一个能从侧边栏进入的 MF1 remote 路由作为目标（例如 SDK integration、Cloud gaming、Launchers），先整页打开 `{base}/53105/dashboard`，之后只用侧边栏做客户端导航，避免 document 与主 bundle 也被延迟。DevTools 打开，Network 勾选 Disable cache 与 Preserve log。
- **工具配置**：
  - DevTools（T 文件方案）：Network › Throttling › Add…，新建自定义 profile（例如名称 `latency-120s`），Download/Upload 填较大值（例如 100000 kbit/s），Latency 120000 ms；只在点击侧边栏进入目标路由前切换到该 profile。该设置是全局的，同期的 API 请求也会被延迟。
  - Requestly（只延迟该 remoteEntry）：Delay Network Requests；URL Contains 目标 remoteEntry 路径（例如 `sdk-intergration-widget.nl-k8s-stage.srv.local/assets/remoteEntry.js`）；Request type 选 Other/Script；Delay 120000 ms。Requestly 扩展对 script 等非 XHR 资源的延迟通过重定向实现，且有时长上限；若编辑器不允许 120000 ms，改用下一项。
  - Charles / Proxyman（替代）：Proxy › Breakpoint Settings 添加目标 remoteEntry URL（例如 `https://sdk-intergration-widget.nl-k8s-stage.srv.local/assets/remoteEntry.js*`），只勾选 Request；请求被拦下后保持不放行至少 120 s，再点 Execute（观察成功分支）或 Abort（观察失败分支）。需对该主机启用 SSL Proxying。
- **步骤**：
  1. 清理：Throttling 设为 No throttling；清空 Request blocking；停用所有 Requestly 规则；删除已有 override；关闭 Charles 断点。
  2. 整页打开 `{base}/53105/dashboard`，等待加载完成。
  3. 启用上面一种延迟方案。
  4. 用侧边栏进入目标路由，开始计时，等待 2 分钟。
  5. 等待期间：每隔约 20 s 记录 remote 区域状态（应只有 spinner）；点击侧边栏另一项再返回，确认 host 导航可用。
  6. 记录最终结果：浏览器放弃请求时显示的 `Failed to load: …`（记录时刻），或请求成功后正常渲染。
  7. 撤销：Throttling 改回 No throttling，停用 Requestly 规则或关闭 Charles 断点，整页刷新。
- **预期**：**当前**：1. 整个等待期间只显示 spinner，没有超时提示。2. 浏览器最终放弃请求时（时间由浏览器决定）显示 `Failed to load: …`；若请求最终成功，则正常渲染。3. 等待期间 host 导航可用。
- **核对**：spec 0.3.7 一致（§8.2 第 905 行：MF1 remote 没有超时和重试；OBS-MF-002 “There is no timeout and no retry”）。stage 构建差异：`modules/loadModule.ts` 在 c1b5e37 与 772a320 之间没有改动。
- **代码位置**：§8.2；`loadModule.ts:39-60`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-072 · MF2 manifest 挂起：无超时（P2）
<!-- group: throttle -->
- **账号与前置**：同 RT-MF-071（Xsolla admin，merchant 53105，项目 317869；RT-MF-070 已通过，manifest 正常返回 200）。路由 `{base}/53105/communication-hub`。DevTools 打开，Network 与 Console 都勾选 Preserve log。
- **工具配置**：
  - Requestly（首选，只延迟 manifest）：Delay Network Requests；URL Contains `/v2/mf-manifest.json`；Request type 选 XHR/Fetch（MF runtime 用 `fetch` 取 manifest）；Delay 120000 ms。若编辑器提示超出上限，改用下一项。
  - Charles / Proxyman（替代）：Proxy › Breakpoint Settings 添加 `https://chat.nl-k8s-stage.srv.local/*v2/mf-manifest.json*`，只勾选 Request；请求被拦下后保持至少 120 s 再点 Execute。需对该主机启用 SSL Proxying。
  - DevTools Throttling 是全局的，不能只延迟 manifest，本条不用。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override；Throttling 设为 No throttling；关闭 Charles 断点。
  2. 整页打开 `{base}/53105/dashboard`，加载完成后启用延迟方案。
  3. 用侧边栏进入 Communication Hub（或直接硬刷新 `{base}/53105/communication-hub`，只有 manifest 被延迟），开始计时。
  4. 在 120 s 内每隔约 20 s 记录：hub 区域只有 spinner；Console 没有 `[mf-runtime]` 回退警告；Network 中没有 MF1 `communication_platform` remoteEntry 请求。
  5. manifest 返回后，记录是否正常渲染 MF2 hub。
  6. 撤销：停用 Requestly 规则或关闭 Charles 断点，整页刷新。
- **预期**：**当前**：manifest 返回前一直 spinner，不触发回退（manifest fetch 没有超时：`runtime-core@2.9.0 plugins/snapshot/SnapshotHandler.js:140-170`）。
- **核对**：spec 0.3.7 一致（§8.2 第 907 行：manifest fetch 没有超时；OBS-MF-003）。本地核对 `runtime-core@2.9.0 SnapshotHandler.js:140-170` 直接 `await fetch(manifestUrl, {})`，无超时。stage 构建差异：无，c1b5e37 的 MF 依赖版本与 `src/mf/**` 与 772a320 相同。
- **代码位置**：OBS-MF-003；§8.2 MF 2.0 行 `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-MF-073 · MF2 remoteEntry 超时 20 s 后回退（P2）
<!-- group: throttle -->
- **账号与前置**：同 RT-MF-071（RT-MF-070 已通过）。先不延迟打开 `{base}/53105/communication-hub`，在 Network 中打开 `mf-manifest.json` 的响应，记下 `metaData.publicPath` 与 `metaData.remoteEntry`（`path`、`name`），拼出 v2 remoteEntry 的完整 URL，并在 Network 中确认该脚本请求存在（应位于 `/v2/` 下，与不带 `/v2/` 的 MF1 remoteEntry 区分）。DevTools 打开，Network 与 Console 都勾选 Preserve log。
- **工具配置**：
  - Requestly：Delay Network Requests；URL 匹配 Regex，只匹配 v2 remoteEntry，例如 `/chat\.nl-k8s-stage\.srv\.local\/.*\/v2\/[^?]*remoteEntry[^/?]*\.js/`（按上一步实际文件名调整；不能匹配 `mf-manifest.json`，也不能匹配 MF1 remoteEntry）；Request type 选 Other/Script；Delay 60000 ms。Requestly 扩展对 script 资源的延迟通过重定向实现且有时长上限；只要实际延迟超过 20 s 即可验证；若上限低于 20 s 或 Network 显示没有被延迟，改用下一项。
  - Charles / Proxyman（替代）：Proxy › Breakpoint Settings 添加 v2 remoteEntry 的完整 URL（带 `*` 通配 query），只勾选 Request；拦下后保持至少 30 s，再点 Execute 或 Abort。需对该主机启用 SSL Proxying。
  - DevTools Throttling 是全局的，会同时延迟 MF1 回退请求，本条不用。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；删除已有 override；Throttling 设为 No throttling；关闭 Charles 断点。
  2. 启用延迟方案，硬刷新 `{base}/53105/communication-hub`，开始计时。
  3. 记录 Console 中 `[mf-runtime] … falling back to MF1 …` 警告出现的时刻（应约在 v2 remoteEntry 请求发出后 20 s）。
  4. 确认随后请求 MF1 remoteEntry（不带 `/v2/`，`?v=<uuid>`）并渲染 hub。
  5. 撤销：停用 Requestly 规则或关闭 Charles 断点，整页刷新。
- **预期**：**当前**：约 20 s 后触发回退到 MF1（`@module-federation/sdk@2.9.0 dist/dom.js:19,94-99`）：Console 出现回退警告，随后请求 MF1 remoteEntry 并渲染 hub。
- **核对**：spec 0.3.7 一致（OBS-MF-003：v2 `remoteEntry` 脚本 20 s 超时为回退条件之一；§8.2 第 907 行）。本地核对 `sdk@2.9.0 dist/dom.js:19` 为 `timeout = 2e4`，`:94-99` 超时后以 `isTimeout: true` 走 error 分支。stage 构建差异：无，c1b5e37 的 MF 依赖版本与 `src/mf/**` 与 772a320 相同。
- **代码位置**：OBS-MF-003（v2 `remoteEntry` 20 s 超时为回退条件之一）；§8.2 `[P3]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-REG-014 · 国家列表加载与禁用态（P1）
<!-- group: throttle -->
- **账号与前置**：T5 账号 A2（已注册、问卷未完成）。本用例不提交 Step 1，A2 不会失效。
- **工具配置**：DevTools › Network › Throttling 下拉选 `Slow 3G`（新版 Chrome 预设名为 `3G`）；若加载仍太快，Throttling › Add… 新建自定义 profile：Download 400 kbit/s、Upload 400 kbit/s、Latency 5000 ms。
- **步骤**：1. 清理：Throttling 设为 No throttling，停用 Requestly 与屏蔽规则。2. Network 勾选 Preserve log，设置 Slow 3G。3. 硬刷新 `{base}/registration`。4. 在 `directories/countries` 请求完成前，检查 First name 等所有字段与 Next 按钮是否禁用（Elements 中 `disabled` 属性）。5. 请求完成后，展开 Country or region，记录选项显示国家名；选一个国家，在 Elements / React DevTools 中确认值为国家 code（不提交）。6. Network 记录请求为 `GET https://account-platform-gateway.nl-k8s-stage.srv.local/mapi/merchant/current/merchants/{m}/directories/countries`。7. 撤销：Throttling 改回 No throttling。
- **预期**：列表加载完成前所有字段和 Next 都禁用。请求 `GET /mapi/merchant/current/merchants/{m}/directories/countries`。选项显示国家名，提交值为国家 code。
- **核对**：spec 0.3.7 一致（第 847 行接口表）。stage 构建无差异（`RegistrationForm.tsx` 未改；`Registration.tsx` 只改 Step 2 外层布局）。
- **代码位置**：`RegistrationForm.tsx:58-68,109,310`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

## 组 5：伪造、过期或删除 token / cookie（2 条）

### RT-AUTH-018 · 加载时 cookie 已过期或是伪造的（P1）
<!-- group: token -->
- **账号与前置**：A1 已登录；可用默认 QA 账号（Xsolla admin，merchant 53105）替代。每个变体都会让当前会话失效，每个变体前都要重新登录。下面的值是人工构造的假 token，不含任何真实凭据：
  - a) 过期 JWT：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.invalidsig`（`exp`=1）
  - b) 非 JWT：`not-a-jwt`
  - c) 未过期、签名无效：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQxMDI0NDQ4MDB9.invalidsig`（`exp`=2100-01-01）
- **工具配置**：DevTools Application › Storage › Cookies › `https://accounts-sdk-skeleton.nl-k8s-stage.srv.local`，双击 `pa-v4-token` 的 Value 列改值（httpOnly cookie 也可在此编辑）。不需要 Requestly。
- **步骤**：
  1. 清理：清空 Request blocking；停用所有 Requestly 规则；清空 Overrides；勾选 Preserve log。
  2. ⚠ 会注销，放在最后执行。不要记录原 cookie 值。
  3. a) 登录后，把 `pa-v4-token` 改为值 a，刷新 `{base}/53105`。在 Network 中查看 document 请求：应为 302 到 `{base}/login`；响应头中 `pa-v4-token` 被清除，`pa-original-url` 被写入（只看 Set-Cookie 名称）。
  4. b) 重新登录，改为值 b，重复步骤 3。
  5. c) 重新登录，改为值 c，刷新 `{base}/53105`。记录：document 是否 200（BFF 放行）；`get_init_info` 是否 401；随后是否经 `{base}/logout` 到 `{base}/login`；Preserve log 中跳转是否只出现一次（无循环）。
  6. 撤销：重新登录，确认 `{base}/53105` 正常。
- **预期**：a/b：BFF 清除 cookie，302 到 login，并写入 return URL。c：BFF 放行（只做 heuristic，不校验签名；stage 是否配置了 `verifyToken` 待确认），随后 `get_init_info` 返回 401，SDK 注销，经 `/logout` 到 login，不形成循环。若 c 在 document 阶段就 302 到 login，说明 stage 配置了 `verifyToken`，按 a/b 记录并在证据中注明。
- **核对**：spec 0.3.7 一致（U-02，第 1228 行，部分关闭；契约见 platform-bff 1.0.0 `isTokenLikelyValid` 只检查 JWT 形状和 `exp`）。stage 构建：BFF 不在本 repo，stage 部署的 BFF 版本未知（c1b5e37 与 772a320 都锁定 platform-bff 1.0.0）。
- **代码位置**：U-02；platform-bff@1.0.0 `src/bff-routes.ts:60-75`、`:122-140`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-SEC-102 · S-01 每次 render 重写 gc-pa-v4-token（P1）
<!-- group: token -->
- **账号与前置**：owner，有 4 个 store privilege（同 RT-SEC-101）；默认 Xsolla admin，merchant 53105，项目 317869。只删 JS 可读的 `gc-pa-v4-token`，**不要**删 httpOnly 的 `pa-v4-token` / `gc-pa-v4-token` 以外的鉴权 cookie。host 的 gateway 请求用内存中的 token，删除 `gc-pa-v4-token` 不会触发 401 注销，不需要放到最后执行。不要复制或记录 cookie 值，只记录是否存在。
- **工具配置**：DevTools › Application › Storage › Cookies › `https://accounts-sdk-skeleton.nl-k8s-stage.srv.local`，选中 `gc-pa-v4-token` 行按 Delete（或右键 Delete）。表格上方刷新按钮用于重新读取 cookie 列表。
- **步骤**：1. 清理：无其他规则。2. 打开 `{base}/53105/projects/317869/storefront`，等 storefront remote 加载；在 Application › Cookies 确认存在 `gc-pa-v4-token`。3. 删除 `gc-pa-v4-token`，点刷新按钮，确认已消失。4. 在 storefront 内切换子路由（例如从侧边栏点 storefront 下另一个页面，如 promotions；也可 resize 窗口触发重渲染）。⚠ **不要用 topbar 切换语言来触发**：切语言会真实写入 `POST {GW}/api/account/platform/53105/users/location`，改动账号的 profile 语言；R5 实测这个写入不稳定，profile 曾停在 de 约 4 分钟，会污染后续用例。5. 再点 Cookies 刷新按钮，记录 `gc-pa-v4-token` 是否立即重新出现（只看名称和属性列）。6. （772a320 专项，stage 见核对）从 dashboard 客户端导航进入 storefront，在 remote 尚未挂载时检查 cookie 是否已存在。7. 撤销：cookie 由页面自动重写，无需撤销。如果误切了语言：切回 en，整页刷新，确认 `get_init_info` 返回的 `user.locale` 为 `en` 后再继续。
- **预期**：cookie 立即重新出现。identity 请求完成前（remote 尚未挂载）cookie 已写入。
- **核对**：spec 0.3.7 一致（S-01 第 1141 行：render 期间写入，token 为 null 时写入 `"null"`）。**stage 构建差异**：`src/layouts/storefront/index.tsx` 与新增的 `src/layouts/storefront/catalog-identity.ts`（`useCatalogUserIdentity` / `shouldMountCatalog` 门控）只在 772a320，c1b5e37 没有 identity 门控，remote 随 render 直接挂载。第 6 步与预期第二句（“identity 请求完成前”）在 stage 上记 N/A，只验证第一句。
- **代码位置**：S-01；`storefront/index.tsx:32`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

## 组 6：跨域 iframe 的 Console 上下文（2 条）

### RT-FRAME-041 · Tax interview exitConfirmed 与 origin 校验（P2）
<!-- group: console -->
- **账号与前置**：merchant 的 tax interview 状态为 `incomplete`，页面显示 iframe；账号需有 tax interview 路由 privilege（含 `LegalOnboardingGetTaxInterviewLink`）。53105 是否满足**待确认**。
- **工具配置**：DevTools Console 顶部的 JavaScript context 下拉框（默认 `top`），第 3、4 步切到 tax iframe 对应的条目（按 iframe 的 origin 识别；tax iframe 主机 URL 待确认，以 Elements 中 iframe `src` 为准）。Network 过滤埋点请求（URL 待确认：候选 `xmts-global-api.nl-k8s-stage.srv.local` 或 Network 中含 `metrika`/`analytics` 的请求）。
- **步骤**：1. 清理：Console 清空，Network 勾选 Preserve log。2. 打开 `{base}/53105/tax-interview`，等 iframe 加载完成，记录 iframe `src` 的 origin。3. 在 `top` 上下文执行 `window.postMessage('exitConfirmed','*')`，观察 iframe 与 Network。4. context 切到 tax iframe，执行 `parent.postMessage('exitConfirmed','*')`，观察是否先出现 spinner 再重载 iframe、是否发出一次 exit 点击埋点。5. 仍在 iframe 上下文执行 `parent.postMessage('other','*')`，观察。6. 撤销：context 切回 `top`；无需其他撤销。
- **预期**：步骤 3：无效果（origin 是 host，不等于 iframe URL 的 origin）。步骤 4：iframe 重新加载（先显示 spinner，`iframeKey+1`），发送一次 exit 点击埋点。步骤 5：无效果。
- **核对**：spec 0.3.7 一致（OBS-FRAME-003 第 664-673 行：只有 `exitConfirmed` 重载 iframe，校验 `evt.origin === new URL(iframeUrl).origin`；spec 未提埋点，SDK 代码中有 `trackTaxInterviewPageClick("exit")`，不冲突）。stage 构建：stage 用 platform-pages 3.25.1，已核对其 `index.mjs:96-108` 逻辑与 3.25.2 相同。
- **代码位置**：OBS-FRAME-003（0.3.2：只有 TaxInterview 的 `exitConfirmed` 会重载 iframe，即 `setIframeKey`）；`platform-pages@3.25.2 dist/index.mjs:94-111` `[P5]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____

### RT-FRAME-042 · Documents 上传消息：/documents 与 /finance/boxnet（P2）
<!-- group: console -->
- **账号与前置**：账号有 `get_merchant_boxnet_url` privilege；默认 Xsolla admin，merchant 53105（是否能拿到 boxnet URL **待确认**）。
- **工具配置**：DevTools Console 顶部的 JavaScript context 下拉框，切到 boxnet iframe 对应条目（按 Elements 中 iframe `src` 的 origin 识别）。Network 过滤埋点请求（URL 待确认：候选 `xmts-global-api.nl-k8s-stage.srv.local` 或含 `metrika`/`analytics` 的请求），对应事件 `ACC_DOCUMENTS_UPLOAD_SUCCESS` / `ACC_DOCUMENTS_UPLOAD_ERROR`。
- **步骤**：1. 清理：Console 清空，Network 勾选 Preserve log。2. 打开 `{base}/53105/finance/boxnet`，等 iframe 加载。3. context 切到 boxnet iframe，依次执行 `parent.postMessage({event:'uploadSuccess',file_id:'1'},'*')`、`parent.postMessage('uploadError','*')`；记录埋点请求、UI 与 iframe 是否重载。4. context 切回 `top`，执行同样两条 `window.postMessage(…,'*')`；记录。5. 打开 `{base}/53105/documents`，重复 3–4。6. 撤销：context 切回 `top`。
- **预期**：步骤 3：只发送埋点（Network 中出现对应 analytics hit），UI 不变，iframe 不重新加载（与 RT-FRAME-041 的 `exitConfirmed` 不同）。步骤 4：被 origin 校验忽略，无埋点。步骤 5：与 `/finance/boxnet` 相同（同一 SDK 页面）。
- **核对**：spec 0.3.7 一致（OBS-FRAME-003 表：`/{m}/documents` 与 `/{m}/finance/boxnet`，上传消息只上报 analytics）。stage 构建：c1b5e37 `routes.tsx:133` 已有 `/documents` 路由；platform-pages 3.25.1 的消息解析在 `index.mjs:7810` 起，逻辑与 3.25.2 相同（仅行号偏移）。
- **代码位置**：OBS-FRAME-003（新增 `/{m}/documents` 路由；0.3.2：上传消息只上报 analytics）；`platform-pages@3.25.2 dist/index.mjs:7875-7912`；`routes.tsx:134-138` `[P3]` `[P5]`
- **结果**：☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A ｜ 时间（UTC）：____ ｜ 执行人：____ ｜ 证据：____
