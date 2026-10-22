# R1 探测脚本（存档）

R1（admin 只读，2026-10-21T05:59Z–07:29Z）的全部探测脚本与原始输出。结论见 `../../stage-results-R1-readonly.md`。

## 目录

| 路径 | 内容 |
|---|---|
| `lib.cjs` | 公共库：`connectOverCDP` 接入、写入保护、请求采集与脱敏、客户端导航、读 Redux store |
| `launch.cjs` | 启动有界面的 Chrome for Testing（CDP 端口 9333，临时 profile `/tmp/r1-profile`） |
| `smoke.cjs`、`verify*.cjs`、`probe-root.cjs` | 登录检查与账号画像核对 |
| `A/` | agent A：T4 + T5（33 条）。`h.cjs` 是 A 的辅助库；`s1`–`s13` 按批次编号 |
| `B/` | agent B：T2 + T3（25 条）。文件名对应用例 ID（例如 `route009.cjs`、`set011.cjs`）；`*.png` 为截图，`*.out` 为原始输出 |
| `P2/` | 阶段 2：改 storage / 当前项目的用例和推迟用例。`st.cjs` 负责备份和恢复 storage；`wh*` 是 webhooks，`sb*` 是 site-builder，`mf*` 是 remote；`*.out` 为原始输出 |
| `results-A.md`、`results-B.md`、`results-P2.md` | 各阶段的原始结果表（已合并进 `stage-results-R1-readonly.md`） |
| `merge.py`、`header.md` | 合并脚本与结果文件头 |

## 复现

```bash
node launch.cjs            # 1. 启动浏览器；在弹出的窗口里由人工登录
node smoke.cjs             # 2. 确认已登录（cookie 中有 pa-v4-token）
node B/route009.cjs        # 3. 运行单个探测脚本，输出 JSON 到 stdout
```

- 依赖：`/Users/wenhaohe/repo/web-games-account/e2e/node_modules/@playwright/test`（`lib.cjs` 中写死了这个路径），以及 Playwright 自带的 Chromium。
- 脚本之间用相对路径引用（`__dirname + '/../lib.cjs'`），可以在任意目录运行。
- 用完后关闭浏览器，并删除 `/tmp/r1-profile`。

## 安全约束

- `lib.cjs` 的 `run()` 只在脚本自己的 tab 上装写入保护：PUT/PATCH/DELETE、写入型 POST 和 `/logout` 导航会被 abort，并记录在 `blockedWrites`。被拦截的请求不会到达后端。
- **漏网的写入**：`POST xfe-api/accesslogs/merchants/report`（topbar 切项目时发出）不在拦截规则内。
- 输出经过 `redact()` 脱敏；请求头只记录名称。存档前已扫描，确认没有 token、cookie 值或邮箱。
- `P2/` 中的脚本会改 localStorage 或当前项目，只能串行运行；每次运行前后都要用 `P2/st.cjs` 备份和恢复。
- 不要同时运行多个会开新 tab 的脚本：`window.open(..., 'noopener')` 打开的空白 tab 会让 `connectOverCDP` 卡住。
