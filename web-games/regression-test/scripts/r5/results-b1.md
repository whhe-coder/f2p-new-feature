# R5 第 1 批（写入类）stage 结果

> 授权：用户在主会话中批准 R5 写入，范围只限本批用例。真实写入只有 `POST {GW}/api/account/platform/53105/users/location`（topbar 切语言和 Profile 保存语言用的是同一个接口）。`handle_all_utms`、`assign_to_user`、`salescards/*` 都在浏览器里用 `page.route().fulfill()` mock，**这些请求不到达后端**。
> 环境：host `accounts-sdk-skeleton.nl-k8s-stage.srv.local`；构建 `stage-web-games-20261005-03`（`c1b5e37`）；Xsolla admin（`ROLE_ADMIN`），merchant 53105，当前项目 317869；时间为 UTC，日期 2026-10-21。
> 脚本：`scripts/r5/b1/`（`h.cjs` 是语言相关的辅助函数，`u.cjs` 是 Upsell mock 的辅助函数）。每个脚本开一个新 tab，结束时关掉。没有新开其他 tab，用户的 tab 没有动过。
> 判定规则：与 R1 相同。用例写的是“当前预期（预期失败项）”时，实际行为与当前预期一致就记 PASS，并写明缺陷仍然存在。
> 写入保护每次都拦截了以下请求（与本批用例无关）：`PUT consent-api.xsolla.com/v2/consent`、`PATCH/PUT chat…/livechat`、`POST …/xfe-api/accesslogs/…`、Profile 页的 `POST google.com/ccm|rmkt/collect`。

| ID | 优先级 | 结果 | 时间（UTC ISO） | 加载方式 | 实际行为 | 证据 | 写入了什么 / mock 了什么 / 是否已恢复 |
|---|---|---|---|---|---|---|---|
| RT-DASH-017 | P2 | PASS | 2026-10-21T09:29:58Z–09:30:12Z | 整页 + topbar 切语言 | 与当前预期完全一致（S-23 仍然存在）：en `1 234 567.50`；de/es/pt `1.234.567 50`；fr/ru `1 234 567 50`（千位分隔符是窄空格）。小数没有丢，小数逗号被换成了空格。余额为 0 时，de 显示 `0 00`（09:08:09 观察到） | `L5-dash017.cjs`：读取 `.dashboard-balance__value`；`metrics/balance` mock 被调用 1 次 | mock：`GET …/analytics/metrics/balance` → `{value:1234567.5, currency_iso_name:"USD", last_transfer_date:"2026-10-07", next_transfer_date:"2026-10-28"}`（不到达后端）。写入：`users/location` de→es→pt→fr→ru→en，6 次，都是 200。已恢复为 en。局限：53105 的真实余额是 0，大额数字靠 mock 得到 |
| RT-UI-008 | P1 | **FAIL** | 2026-10-21T09:30:44Z–09:30:47Z | 整页 + topbar 切 zh + 点击 chip | 53105 的余额为 0，Ask AI 横幅显示（满足“无交易 owner”）。zh 下只有 2 个 chip，并且已翻译：“定价 / 法律模式”。点“定价”后跳到 `/53105/communication-hub`，router state 是 `{"aiQuestion":"艾克索拉各产品如何收费？"}`（符合预期）。**sessionStorage 是 `{"type":"sample","enText":"艾克索拉各产品如何收费？"}`，`enText` 是中文**，预期是英文 “What does each Xsolla product cost?” | `L6-ui008-ana005.cjs`：`history.state.state`、`sessionStorage.aiAssistantQuestion` | 写入：`users/location` zh、en（200）。已恢复为 en。原因：stage 落后于基线。c1b5e37 的 `src/components/AskAiBanner/index.tsx:65` 把本地化文本直接当作 `enText`；772a320 已经由 `82eb4de` 修复 |
| RT-UI-013 | P2 | PASS | 09:08:07Z–09:08:24Z（第 1–3 步）；09:09:00Z–09:09:32Z（第 4 步） | 整页 + 客户端导航 + 刷新 | 第 2 步：切到 de 后，`LiveChatWidget.language` 仍为 `en`。第 3 步：去 `/communication-hub` 再回 Dashboard 后变为 `de`。第 4 步：切回 en、再切 de 时仍为 `en`；刷新后为 `de`。这些与当前预期一致（S-24 仍然存在） | `L2-de.cjs`、`L3-ui013-step4.cjs`：`h.state()` 读取 `window.LiveChatWidget.language` | 写入：de、en、de、en（都是 200）。注意：第 4 步刷新后还是 de，是因为那一次 de 刚好被持久化了（见“新发现 1”）。已恢复为 en |
| RT-I18N-001 | P1 | PASS | 09:07:10Z–09:07:13Z | 整页 + topbar | 下拉有 9 项，顺序是 English、Русский、Deutsch、한국어、日本語、中文 (简体)、Español、Français、Português（不是用例写的字母顺序，但项目一致）。选日本語后界面立即变成日文，页面没有刷新（`window.__r5marker` 还在）；`i18nextLng=ja`；两个 `pa-locale` cookie 中有一个变为 `ja`；`POST …/53105/users/location` 的 body 是 `{"locale":"ja"}`，返回 200 | `L1-i18n001-002.cjs` | 写入：ja（200）。已恢复：后续写回 en，最后确认为 en |
| RT-I18N-002 | P1 | **FAIL** | 09:07:13Z–09:07:28Z；重复：09:09:03Z、09:10:14Z–09:10:56Z、09:41:28Z–09:42:12Z | 整页硬刷新 | 结果不稳定。用例的当前预期是“刷新后回到切换前的语言”（S-39，并且说这是确定的）。4 次中有 3 次符合（ja@09:07、ja@09:10、de@09:41：刷新后 `get_init_info.user.locale=en`，页面回到英语）。**另 1 次（de@09:09:00）被持久化了**：刷新后 `get_init_info` 返回 `de`，页面保持德语。之后 09:09:29 和 09:10:37 两次写 `en` 都返回 200，但直到 09:13:12，`get_init_info` 仍然返回 `de`（期间刷新了 4 次）。09:14:12 再写一次 `en` 后才恢复 | `L1`、`L3`、`L4-i18n002-repeat.cjs`、`P1-poll-init.cjs`、`R-restore-en.cjs`：`get_init_info` 响应里的 `result.user.locale` 和对应时间 | 写入：ja、de、ja、de、en（×4），都是 200。已恢复为 en（09:42:33Z 和 09:43:20Z 两次读回都是 en）。需要修改 T3 的 S-39 描述：现象是间歇性的，而且有分钟级的延迟或不一致 |
| RT-I18N-003 | P2 | PASS | 09:31:32Z–09:31:59Z | 整页 + topbar + 硬刷新 | `users/location` 在浏览器里被 abort 后，界面变为德文；console.error 输出 `Failed to persist locale to profile: {name: AxiosError, message: Network Error…}`；没有 toast。取消拦截再硬刷新后，`get_init_info.user.locale=en`，界面回到 en | `L7-i18n003.cjs` | 没有写入：de 请求被 abort（`net::ERR_FAILED`），没有到达后端。刷新后确认为 en |
| RT-I18N-004 | P2 | PASS | 09:33:34Z–09:33:59Z；第 2 步重复 09:34:25Z | 整页 `/53105/profile` | 第 1 步：Language 选 Français，点 Save，发出 `POST users/location {"locale":"fr"}`，返回 200；界面变为法文，toast 显示 “Modifications enregistrées”。第 2 步：拦截后选 Deutsch 再 Save，toast 显示 “When submitting a form, errors occurred”，界面语言不变（en）。另外，失败后下拉框仍显示 “Deutsch”，没有回滚（见“新发现 4”） | `L8-i18n004.cjs`、`L9-i18n004-step2.cjs` | 写入：fr、en（Profile Save，都是 200）；de 被 abort。admin 的 `fieldsReadOnly=true`，所以没有发 `/credential`（脚本也会拦截它，记录为 0 次）。已在 Profile 页存回 English，显示 “Changes saved”，确认为 en。代码已确认 Profile 保存语言用的接口就是 `/api/account/platform/{org}/users/location`（platform-apis 2.29.0 `updateUserLocale`） |
| RT-I18N-006 | P1 | PASS | 09:08:09Z–09:08:16Z | 客户端导航 `/53105/analytics/anti-fraud`（de） | tab 依次是 “Statistiken / Blocklist / Rückbuchungsregister”：Blocklist 是英文，其他是德文 | `L2-de.cjs` | 写入：与 RT-UI-013 共用同一次 de 写入。已恢复为 en |
| RT-I18N-007 | P1 | PASS | 09:38:53Z–09:40:58Z（另有 09:35:17Z–09:35:50Z 的一次只读 Dashboard 的早期运行） | 整页 + topbar + 客户端导航 | 9 种语言都检查了：Ask AI 横幅、Performance/Balance、promo banner、Choose UI（没有 selection 的 `/get-started`）、Games Portal 引导。每处都是对应语言，没有 key id，检查区域内没有空白标签。stage 上 Ask AI 的文案已经翻译（`[分支差异]` 说的英文问题只在分支上出现） | `L10-i18n007.cjs`：对每种语言 `keyScan` 都返回 `[]` | 写入：ja、ko、zh、en（×2 轮）、de、es、fr、en、pt、ru、en、en，都是 200。本地状态：为了看 Games Portal 引导，临时把 localStorage `web-games:setup-selection:web-games:53105` 设成 `gamesPortal`，每种语言看完就删除。执行前后都不存在（读回确认）。已恢复为 en |
| RT-I18N-008 | P2 | PASS | 09:07:13Z（ja）；09:08:09Z（de）；09:30:00Z–09:30:08Z（mock 日期，5 种语言） | 整页 + topbar | ja：`2022年9月7日`；de：`7. Sept. 2022`（mock 时为 `7. Okt. 2026`）；es `7 oct 2026`；pt `7 de out. de 2026`；fr `7 oct. 2026`；ru `7 окт. 2026 г.` | `L1`、`L2`、`L5` | 写入：与 RT-I18N-001、RT-UI-013、RT-DASH-017 共用。已恢复为 en |
| RT-ANA-005 | P1 | **FAIL** | 09:30:48Z–09:30:52Z | zh，点击 “法律模式” chip | 跳到 Communication Hub，state 是 `{"aiQuestion":"艾克索拉采用什么法律模式？"}`。**没有 `ss_dashboard_prompt_click` 事件**：xmts `/hit` 只有 1 个不带 `en` 的请求，console 也没有 communication-hub-analytics 日志 | `L6-ui008-ana005.cjs`：解析 `/hit` 的 payload | 写入：与 RT-UI-008 共用 zh/en。原因：stage 落后于基线，c1b5e37 的 `AskAiBanner` 没有埋点；`4a5016a` 和 `82eb4de` 在 772a320 中才加入 |
| RT-ANA-008 | P2 | PASS | 09:09:00Z（另外 09:07:10Z、09:08:07Z 的结果相同） | topbar | 打开下拉时发 1 个 `acc_topbar_element_click`，`ev="languages"`；选 de 时发 1 个，`ev="languages \| language"`，`exv.language="de"`（exv 中还有 merchant_id、project_id、user_id）；counter 900023 | `L3-ui013-step4.cjs`：解析 `/hit` 的 payload | 写入：与 RT-UI-013 共用。已恢复为 en |
| RT-DASH-019 | P1 | PASS | 09:18:36Z–09:19:08Z | 整页 `?utm_campaign=spring` | 发出 `GET …/salescards/info?utm_campaign=spring`（mock 1 张卡）；modal 显示卡片标题 “R5 QA card” 和图片；modal 挂载时只发 1 次 `PUT …/handle_all_utms`（body `null`）。admin（`ROLE_ADMIN`）看到的是 access-denied 文案和 Dismiss，没有项目列表 | `B1-dash019-026.cjs` | mock：`salescards/info`、`PUT handle_all_utms` → 200（不到达后端）。没有写入，不需要恢复 |
| RT-DASH-020 | P2 | PASS | 09:19:20Z–09:20:01Z | 整页 + 客户端重挂载 | 2 张卡：标题 “One step away from integration”，没有图片。0 张卡、500、请求被 abort：都不弹 modal，Balance 区域正常，没有 toast，没有 pageerror | `B2-dash020-api020.cjs` | mock：`salescards/info` 依次返回 2 张卡、1 张卡、`[]`、500、abort；`PUT handle_all_utms` → 200（不到达后端） |
| RT-DASH-021 | P2 | PASS | 09:20:30Z–09:20:52Z | 整页 `?utm_campaign=a,,b` | `info` 请求只带 `utm_campaign=a`；点项目后 `assign_to_user` 的 body 是 `{"utmCampaigns":["a","b"],"projectId":316119}`（空项被丢掉了） | `B3-dash023-021-025.cjs` | mock：`info`、`handle_all_utms` 200、`assign_to_user` 500（不到达后端）。局限：admin 看不到项目列表，所以把 `organization/53105/detail` 响应里的 `role` 从 `ROLE_ADMIN` 改成了 `ROLE_OWNER`（真实 GET 发出后在浏览器里修改，只影响本 tab） |
| RT-DASH-023 | P2 | PASS（部分） | 09:20:30Z–09:20:52Z | 同上 | 有搜索框（100 个项目，大于 7）。输入 `"  lAsH  "` 得到 3 个结果，与“忽略大小写、去掉首尾空格、子串匹配”的计算结果一致。没有匹配时显示 “Project list is empty”。排序：43 个禁用项目全部排在 57 个启用项目前面，组内按名称排序 | 同上：DOM 的 `data-id` 与 store `projects.items[].enabled` 逐个对比 | mock 同上。没有验证“≤7 个时不显示搜索框”（stage 上没有这样的数据）。**modal 只列出 store 里已经加载的 100 个项目（total=688）**，见“新发现 2” |
| RT-DASH-024 | P1 | PASS | 09:21:23Z–09:21:48Z | 整页 + 点击项目 | 当前预期成立（预期失败项，S-20 仍然存在）。请求顺序：`POST …/53105/salescards/assign_to_user` → `GET …/53105/salescards/9001` → 主 frame 导航到 `https://{host}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=2`（没有 `/for/web-games/account`），返回 404，页面显示 “Cannot GET /53105/frame/documentation”。不符合 AC-13 | `B4-redirect.cjs guide`：`framenavigated` 和导航请求记录（`location.replace` 本身不能被包装，所以用导航请求作为观察点） | mock：`assign_to_user` → 200 `[{salesCardId:9001, integrationGuideExist:true}]`；`salescards/9001` → `{activeStepId:2, steps:[…, {id:2, url:"https://developers.xsolla.com/doc/pay-station/"}]}`；role 改为 OWNER。都不到达后端（404 页面是真实 GET） |
| RT-DASH-025 | P2 | PASS | 09:20:49Z | 点击项目 | `assign_to_user` 返回 500 后 modal 关闭；URL 不变；Dashboard 保持；没有提示 | `B3-dash023-021-025.cjs` | mock：`assign_to_user` → 500（不到达后端） |
| RT-DASH-026 | P2 | PASS | 09:18:47Z–09:19:08Z | 整页 + 客户端重挂载 | 点遮罩会关闭；重开后点 × 会关闭；重开后点 modal 内部空白处不关闭 | `B1-dash019-026.cjs` | mock：`info`、`handle_all_utms`（每次挂载 1 次，共 3 次）。不到达后端 |
| RT-FRAME-010 | P1 | PASS | 09:21:41Z（第 1–3 步）；09:22:26Z–09:22:30Z（第 4 步） | 整页 + 点击项目 | 当前预期成立（S-20 仍然存在）：第 3 步落到 `https://{host}/53105/frame/documentation?…`，BFF 返回 404 “Cannot GET”。第 4 步（`integrationGuideExist=false`）：不请求 `salescards/{id}`，直接跳到 `https://{host}/53105`，返回 404 “Cannot GET /53105” | `B4-redirect.cjs guide / noguide` | mock 同 RT-DASH-024，第 4 步 assign 返回 `integrationGuideExist:false`。不到达后端 |
| RT-API-020 | P2 | PASS | 09:19:20Z–09:19:45Z | 整页 `?utm_campaign=a,b` | 只用 `a` 请求 `salescards/info?utm_campaign=a`。1 张卡时显示标题和图片；多张卡时显示通用标题，没有图片 | `B2-dash020-api020.cjs` | mock：`info`、`handle_all_utms`。不到达后端 |
| RT-API-023 | P2 | PASS | 09:20:49Z（A）；09:18:47Z–09:19:08Z（B） | 点击项目 / 打开弹窗 | A（role mock 为 OWNER）：assign 返回 500 后弹窗关闭，停留在 Dashboard，没有提示。B：真实 `ROLE_ADMIN` 也不是 owner/developer，看到无权限说明、Dismiss 和 ×，没有项目列表，没有发 assign | `B3`、`B1` | mock：assign 500、info、handle_all_utms。不到达后端。局限：B 用的是 admin，不是普通的非 owner 商户角色 |
| RT-SEC-106 | P1 | PASS | a 09:22:46Z；b 09:28:47Z；c 09:29:12Z | 点击项目 | a）主 frame 被 `location.replace` 到 `https://example.com/x?upsell-card-id=9001`，没有确认（开放跳转面）。goBack 回到 `about:blank`，说明历史记录被替换。b）跳到 `https://{host}/53105/projects?upsell-card-id=9001`，返回 404 “Cannot GET /53105/projects”（缺 basename，预期失败项）。c）URL 是 `https://example.com/x?a=1?upsell-card-id=9001`，有两个 `?`（S-30） | `B4-redirect.cjs ext / rel / extq` | mock：`salescards/9001` 的 step url 依次改为 3 个值；assign 200；role 改为 OWNER。都不到达后端。example.com 是真实的整页跳转（只读 GET），跳出后马上 goBack，tab 在脚本结束时关闭 |
| C2 / S-26 | — | PASS（部分） | 09:17:07Z–09:17:46Z | 整页，真实请求，不 mock | `GET {GW}/mapi/merchant/merchants/salescards/info?utm_campaign=spec-check-1` 发了 3 次，每次都返回 200 `[]`。只带第一个 campaign。值是原样拼接的（代码 `src/core/apis/upsell.ts:35` 没有 `encodeURIComponent`），但 `spec-check-1` 里没有需要编码的字符，所以本例看不出编码差异。没有弹窗，**没有发出 `PUT handle_all_utms`**（也没有被拦截的记录） | `B0-c2-s26.cjs` | 没有 mock，没有写入。没有弹窗，所以没有执行“用关闭按钮退出” |

### 真实写入清单

全部是 `POST https://account-platform-gateway.nl-k8s-stage.srv.local/api/account/platform/53105/users/location`。body 只有 `{"locale":"xx"}`，不含 token。

| # | 时间（UTC） | 来源 | body | 状态 |
|---|---|---|---|---|
| 1 | 09:07:12Z | topbar（RT-I18N-001/002） | ja | 200 |
| 2 | 09:08:07Z | topbar（RT-UI-013、ANA-008、I18N-006/008） | de | 200 |
| 3 | 09:08:23Z | topbar（恢复） | en | 已发出；脚本在响应前结束，后续读回为 en |
| 4 | 09:09:00Z | topbar（RT-UI-013 第 4 步） | de | 200（这一次被持久化了） |
| 5 | 09:09:29Z | topbar（恢复） | en | 200（没有生效） |
| 6 | 09:10:11Z | topbar（RT-I18N-002 重复） | ja | 200 |
| 7 | 09:10:37Z | topbar（恢复） | en | 200（没有生效） |
| 8 | 09:14:12Z | topbar（恢复，`R-restore-en.cjs`） | en | 200（生效了） |
| 9–14 | 09:30:00Z–09:30:10Z | topbar（RT-DASH-017） | de, es, pt, fr, ru, en | 都是 200 |
| 15–16 | 09:30:44Z、09:30:53Z | topbar（RT-UI-008、ANA-005） | zh, en | 200 |
| 17–18 | 09:33:38Z、09:33:53Z | **Profile Save**（RT-I18N-004） | fr, en | 200 |
| 19–22 | 09:35:17Z–09:35:45Z | topbar（RT-I18N-007 第 1 次运行） | ja, ko, zh, en | 200 |
| 23–26 | 09:38:53Z–09:39:19Z | topbar（RT-I18N-007） | ja, ko, zh, en | 200 |
| 27–30 | 09:39:46Z–09:40:12Z | topbar（RT-I18N-007） | de, es, fr, en | 200 |
| 31–34 | 09:40:29Z–09:40:55Z | topbar（RT-I18N-007） | pt, ru, en, en | 200 |
| 35–36 | 09:41:28Z、09:41:52Z | topbar（RT-I18N-002 重复） | de, en | 200 |

合计 36 次：topbar 34 次，Profile 2 次。被 abort、没有到达后端的有 3 次（de：09:31:32Z、09:33:42Z、09:34:25Z）。
**被 mock、不到达后端的请求**：`PUT …/mapi/merchant/current/merchants/handle_all_utms`（每次弹窗挂载 1 次，fulfill 200）、`POST …/salescards/assign_to_user`（200 或 500）、`GET …/salescards/info`（C2 除外）、`GET …/salescards/9001`、`GET …/metrics/balance`（RT-DASH-017）。`GET /api/organization/53105/detail` 是真实发出的，响应在浏览器里把 role 改成 OWNER（B3、B4）。

### 状态恢复

| 项 | 原值 | 恢复后读回值 | 读回时间 |
|---|---|---|---|
| profile 语言（`get_init_info.result.user.locale`） | en | en | 09:42:33Z、09:43:20Z（两次整页刷新） |
| store `locale.currentLocale` / `user.user.locale` | en / en | en / en | 同上 |
| topbar / `i18nextLng` / 两个 `pa-locale` cookie / `<html lang>` / `LiveChatWidget.language` | EN / en / en,en / en / en | EN / en / en,en / en / en | 同上 |
| localStorage setup selection（`web-games:setup-selection:web-games:53105`） | 不存在 | 不存在 | 09:43:31Z |
| localStorage `wg-pa-promo-banner-dismissed` | 不存在 | 不存在（null） | 09:43:31Z |
| 当前 merchant / 项目 | 53105 / 317869 | 53105 / 317869 | 09:43:31Z |
| 浏览器 tab | 用户原来的 tab | 没有变化。脚本开的 tab 都已关闭，没有遗留新 target | 09:43Z（`/json/list`） |

中间有一段时间 profile 停在 de：09:09:10Z–09:13:53Z，`get_init_info` 一直返回 de，期间两次写 en 都没有生效。09:14:12Z 再写一次 en 后恢复，此后每次读回都是 en。

### 新发现

1. **S-39 是间歇性的，不是一定发生。** `users/location` 每次都返回 200，但只有一部分写入能在刷新后被 `get_init_info` 读到：de@09:09:00、en@09:14:12 生效了；ja@09:07、ja@09:10、de@09:41、en@09:09:29、en@09:10:37 没有生效。被持久化的 de 之后，两次写 en 都返回 200，但 4 分钟内 `get_init_info` 一直返回 de，看起来像后端缓存或副本不一致 [U]。T3 RT-I18N-002 和 stage-results C1 的结论“刷新后一定回到 en”需要改为“不确定”，相关用例（RT-I18N-003、RT-UI-013 第 4 步）的结果也会受影响。接口：platform-apis 2.29.0 `updateUserLocale` → `/api/account/platform/{org}/users/location`；读取：`/api/account/platform/users/get_init_info` 的 `result.user.locale`（owner：后端 / accounts-sdk）。
2. **Upsell 弹窗只列出 store 里已经加载的项目。** admin 的 merchant 有 688 个项目，弹窗只列出第一页 100 个（store `projects.isComplete=false`）。搜索也只在这 100 个里过滤，后面的项目选不到。代码：`src/components/Dashboard/UpsellModal/index.tsx:44`（`selectProjects`，没有加载更多或服务端搜索）。
3. **Xsolla admin（`ROLE_ADMIN`）在 Upsell 弹窗中只能看到 access-denied 文案**（“请联系 Owner 把角色改为 Developer 或 Owner”），不能选项目。代码：`UpsellModal/index.tsx:47` 只放行 `ROLE_OWNER` / `ROLE_DEVELOPER`。是否符合产品预期：待确认。
4. **Profile 保存语言失败后，Language 下拉框不回滚**：界面仍是 en，下拉框却显示 “Deutsch”。再点 Save 会再次提交 de。代码：platform-pages 3.25.1 `dist/index.mjs:3220-3257` `handleSave` 的 catch 分支只弹 toast，没有重置 `locale`。
5. RT-UI-008 / RT-ANA-005 失败是因为 stage 落后于基线：c1b5e37 的 `src/components/AskAiBanner/index.tsx:65` 把本地化文本当作 `enText`，并且没有 Metrika 埋点；772a320 中由 `4a5016a`、`82eb4de` 补上。stage 上只有 2 个 chip（Pricing / Legal），并且已经翻译。
6. 补充确认：切换语言时只有一个 `pa-locale` cookie 改变（共有两个同名 cookie），`<html lang>` 一直是 en（与 C1 一致）。topbar 下拉的顺序是 English、Русский、Deutsch、한국어、日本語、中文、Español、Français、Português，T3 RT-I18N-001 写的是字母顺序。
