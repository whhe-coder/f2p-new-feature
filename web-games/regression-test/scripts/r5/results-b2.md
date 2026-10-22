# R5 第 2 批：401 注销（mock）与真实登出

- 环境：Xsolla admin，merchant 53105，构建 stage-web-games-20261005-03（c1b5e37）。脚本：`b2/`。
- 执行情况：agent 在 2026-10-21T10:06Z 前后因 API 网络错误（ENOTFOUND）中途退出，没有写出结果文件。
  - **真实登出部分**：原始输出保存在 `b2/S1-output.json`（运行时间 10:05:58Z–10:06:40Z），下表由主会话根据该文件整理。
  - **401 部分**（7 条）：agent 的运行输出随它丢失；2026-10-22T02:13Z 用户重新登录后，主会话用同一批脚本重跑，输出保存为 `b2/*.out.json`。
- 写入：真实登出放行了 1 个写入：`GET {base}/logout`（BFF）。被拦截：`PUT consent-api.xsolla.com/v2/consent` 28 次、`POST xfe-api/accesslogs/merchants/report/53105` 2 次、`PATCH chat…` 4 次。

## 真实登出（一次运行覆盖 3 条）

| ID | 优先级 | 结果 | 时间（UTC ISO） | 加载方式 | 实际行为 | 证据 | 写入 / 局限 |
|---|---|---|---|---|---|---|---|
| RT-AUTH-014 | P0 | PASS（部分） | 2026-10-21T10:05:58Z | 整页（tab A） | 点击 topbar Sign out 后，A 依次：`GET {base}/logout` → **302** → `GET {base}/login` 200 → 停在 login（`hasQuery=false`）。登出后后退和打开深链都落到 `{base}/login`。`pa-v4-token`（httpOnly，`.srv.local`）和 `pa-merchant-id` 被清除 | `S1-output.json`：`A_navs`（10:05:58.777 request /logout；10:06:00.546 302；10:06:00.887 framenavigated /login）、`A_back`、`A_deeplink`、cookie 对比 | 放行了 BFF `/logout`，会话已结束。变体 3（拦截 `/logout` 后刷新）没有做。登出前没有 `pa-original-url` cookie，无法确认它被清除 |
| RT-AUTH-015 | P1 | **FAIL**（安全发现） | 2026-10-21T10:06:09Z | 客户端（tab B）→ 整页刷新 | A 登出后，B 没有刷新，客户端导航到 `/53105/projects`，发出的 2 个 gateway 请求都返回 **200**：`GET /mapi/merchant/merchants/53105/project-tags`（10:06:10.872）、`GET …/projects/paged/lite`（10:06:14.410）。B 的 store 中 `user.token` 仍存在，没有跳转。**B 刷新后**：`/53105/projects` → 302 → `/login` | `S1-output.json`：`B_before`、`B_gw`、`B_navs`、`B_after`、`B_reload.navs` | 预期（安全）是 B 的下一个请求返回 401。实测证实了 T1 中“待确认”的情况：BFF `/logout` 只清 cookie，**不吊销 JWT**，内存中的 token 在登出后仍能调用 gateway，直到过期。没有测量 token 的剩余有效期 |
| RT-SEC-103 | P1 | PASS（部分）· 缺陷复现 | 2026-10-21T10:06:00Z | 整页 | 登出后，JS 可读的 `gc-pa-v4-token`（`accounts-sdk-skeleton.nl-k8s-stage.srv.local`）**仍然存在**；`gc-pa-locale/merchant-id/project-id`、`network-pa-*`、`sb-pa-*`、两个 `pa-locale` 也都保留。只有 `pa-v4-token` 和 `pa-merchant-id` 被删除 | `S1-output.json`：`cookiesBefore`（38 个）→ `cookiesAfter`（36 个），只记录名称和属性，没有记录值 | 与 T 文件“当前（推断）”一致：src 中没有删除 `gc-pa-v4-token` 的代码。第 3 步（关闭再打开浏览器，看会话 cookie 是否消失）没有做 |

### 登出前后 cookie 对比（只有名称和属性）

| 变化 | cookie | Domain | httpOnly | secure | SameSite | 过期 |
|---|---|---|---|---|---|---|
| 删除 | `pa-v4-token` | `.srv.local` | true | true | Lax | session |
| 删除 | `pa-merchant-id` | `.srv.local` | false | false | Lax | session |
| 保留 | `gc-pa-v4-token`、`gc-pa-locale`、`gc-pa-merchant-id`、`gc-pa-project-id` | `accounts-sdk-skeleton.nl-k8s-stage.srv.local` | — | — | — | — |
| 保留 | `network-pa-locale`、`network-pa-merchant-id`、`network-pa-project-id` | `accounts-sdk-skeleton.nl-k8s-stage.srv.local` | — | — | — | — |
| 保留 | `sb-pa-locale`、`sb-pa-merchant-id`、`sb-pa-project-id`、`pa-locale` | `.srv.local` | — | — | — | — |

## 401 注销（mock，`/logout` 导航被拦截）

2026-10-22T02:13Z–02:15Z 由主会话重新登录后重跑（用户本人登录）。原始输出：`b2/A1.out.json`、`A2.out.json`、`A3.out.json`、`F1.out.json`、`C4.out.json`（已扫描，没有 JWT）。
`b2/t.cjs` 把 `/logout` 导航 fulfill 成 204，文档不卸载，请求不到达 BFF；每条结束后 httpOnly `pa-v4-token` 仍在，会话没有失效。BFF 清 cookie 的部分由上面的 RT-AUTH-014 真实登出覆盖。

| ID | 优先级 | 结果 | 时间（UTC ISO） | 加载方式 | 实际行为 | 证据 | mock / 局限 |
|---|---|---|---|---|---|---|---|
| RT-AUTH-008 | P0 | PASS（部分） | 2026-10-22T02:13:36Z | 整页 | balance 401 后，console 打印 `[Gateway Auth] Token validation failed`，含 `tokenPreview`；**2043 ms** 后导航到 `{base}/logout`（1 次）。期间 store 的 user/token 保留，Balance 显示 “—” | `A1.out.json`：`mockHits` 02:13:36.768 balance → 401；`logout` 02:13:38.811；`delayMs=2043` | mock `GET …/analytics/metrics/balance` 401。第 3、4 步（BFF 清 cookie、后退不能恢复）因 `/logout` 被拦截没有验证；由 RT-AUTH-014 覆盖 |
| RT-AUTH-009 | P1 | PASS（部分） | 2026-10-22T02:14:06Z | 整页 | privileges 401 后，约 0.6 s 时 store 的 `user` 与 `token` 都已清空，topbar 不再显示用户；**2072 ms** 后导航到 `/logout`（1 次）；**没有** `[Gateway Auth]` 日志（`tokenPreviews` 为空）；跳转前 httpOnly `pa-v4-token` 仍在（js-cookie 删不掉）。附带：`/logout` 被测试脚本 mock 成 204、页面没有卸载之后，约 2 s 后页面落到 `{base}/forbidden`（测试手段造成；真实流程中页面在 `/logout` 时就卸载） | `A2.out.json`：`at600ms.userToken=false`、`cookieBeforeLogout` 含 `pa-v4-token httpOnly=true`、`delayMs=2072`、`pageErrors` 中有 `Request failed with status code 401` | mock `GET /api/account/platform/53105/privileges` 401。BFF 部分同上 |
| RT-AUTH-010 | P1 | PASS（部分） | 2026-10-22T02:14:18Z | 整页 | host（balance）与 SDK（privileges、features）同时 401：`/logout` 导航请求**发起了 2 次**：02:14:20.944 第 1 次（随即被第 2 次取代，`ERR_ABORTED`），02:14:20.965 第 2 次（被 mock 成 204）。即 host 和 SDK 拦截器都触发了，符合 T1 的“1 或 2 次”。延迟从第 1 次算起约 2049 ms。注：`logoutCount=1` 只统计进入 `page.route` 的那一次，少算了被取代的第 1 次。host 拦截器打印的 `tokenPreview` 为 `hasToken=false`：SDK 已先清空 token | `A3.out.json`：3 个 `mockHits`（02:14:18.895–.910）、`logoutCount=1` | 是否“最终只停在一次 login 页、不循环”没有验证（`/logout` 被拦截） |
| RT-SEC-002 | P1 | PASS · 缺陷复现 | 2026-10-22T02:13:36Z | 整页 | stage console 打印 `tokenPreview`：**20 个字符，以 `eyJ` 开头（JWT header），后接 `...`**。每个请求还打印 `[Gateway] Authenticated request`，字段为 `url, method, baseURL, hasToken, tokenLength, accountId`，只有 `tokenLength=2596`，没有 token | `A1.out.json`、`C4.out.json`：`tokenPreviews[0]`（`printed=true, chars=20`）、`authLogShape` | 只记录了前缀的长度和格式，没有记录字符本身。prod 是否不打印没有验证 |
| RT-FRAME-006 | P1 | PASS | 2026-10-22T02:14:36Z | 整页 + 客户端（改 query 重挂载） | `/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=2`：card 请求 404、500、网络失败时都**一直显示 loader**，没有提示，没有跳转（`logoutSoFar=0`）。401 时先显示 loader，**2041 ms** 后导航到 `/logout`（1 次） | `F1.out.json`：`mockHits` 404 @02:14:36、500 @02:14:40、abort @02:14:44、401 @02:14:50；`logout` 02:14:52.170 | mock `GET /mapi/merchant/merchants/53105/salescards/9001`（虚构卡片 9001），不到达后端 |
| RT-API-004 | P0 | PASS | 2026-10-22T02:13:36Z | 整页 | 同 RT-AUTH-008：balance 401 后 2043 ms 跳 `/logout`，**只跳一次**；console 打印 `[Gateway Auth] Token validation failed`，含 20 个字符的 token 前缀 | `A1.out.json`（与 RT-AUTH-008 同一次运行） | mock balance 401 |
| RT-API-042 | P2 | PASS | 2026-10-22T02:15:09Z | 整页 + 点击页签 | 在 webhooks 的 Testing › Dispute 页签挂载 PaymentsTab 时，`currency/list` 401，**2082 ms** 后跳 `/logout`（1 次）；console 同样打印 20 个字符的 token 前缀 | `C4.out.json`：`mockHits` 02:15:09.882 currency → 401；`logout` 02:15:11.964 | 317869 没有开启 webhooks Testing 区：在本 tab 中把真实 `GET /api/project/detail/317869` 响应改为 `ipn_enabled=true` 并带 `payment_url`，没有写入。mock `GET /mapi/merchant/current/currency/list` 401 |

## 不执行

| ID | 结果 | 原因 |
|---|---|---|
| RT-AUTH-013 | — | 需要 viewer 账号，归入 R4 |
| RT-AUTH-022 | BLOCKED | 需要等 JWT 过期，或用过期 token 替换 httpOnly cookie |

## 新发现

1. **登出不吊销 JWT**（RT-AUTH-015）：BFF `/logout` 只删除 cookie。其他已打开的 tab 在不刷新的情况下，仍然能用内存中的 token 成功调用 gateway。
2. **登出后 `gc-pa-v4-token` 残留**（RT-SEC-103 / S-01）：这个 JS 可读的 cookie 存放的是会话 token，登出后没有被删除。结合发现 1，登出后 token 仍然有效，并且仍可被 JS 读取。
3. **SDK 401 时 host 日志拿不到 token**（RT-AUTH-010）：SDK 拦截器先清空 store 中的 token，host 拦截器随后打印的 `tokenPreview` 为 `hasToken=false`。两个拦截器各自排了一次 `/logout`（共 2 次导航请求，后一次取代前一次），最终只有一次落地。
4. ~~SDK 401 后先落到 `/forbidden`~~（2026-10-22 独立 review 后更正）：时间线显示 `/logout` 先发起（A2 02:14:08.600、A3 02:14:20.965），`/forbidden` 在其后（A2 02:14:10.693、A3 02:14:25.145）。落到 `/forbidden` 是因为测试脚本把 `/logout` mock 成 204、页面没有卸载，**不是产品行为**。真实流程中用户是否会短暂看到“无权限”页面，没有验证。

