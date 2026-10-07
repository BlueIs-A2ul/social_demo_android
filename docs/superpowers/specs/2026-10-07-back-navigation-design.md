# 真机返回键导航控制设计

日期：2026-10-07
状态：已确认（方案 A）
主题：让 Android 物理返回键（导航栏返回/手势返回）按真实 App 逻辑控制整体页面，且页内返回按钮与物理键行为完全一致

## 背景

本 demo 是 Capacitor 套壳 Android 应用（`www/` 纯 HTML，无框架）。主界面 `index.html` 是 iframe 壳：中间 iframe 承载 50+ 子页面，底部 5 个 Tab（房间/空间/雷达/TV/我的）。物理返回键现状：

- `MainActivity.java` 已有一版拦截：`index.html` 时调用网页 `window.__appBack()`，其余页面 `webView.goBack()` / `moveTaskToBack`。
- 网页侧 `__appBack` 用 "iframe 加载次数 `frameDepth`" 猜层级：切 Tab（直接改 iframe `src`）也会计入，导致返回会倒回上一个 Tab；计数在 reload/bfcache 下易失真。
- 浮层（AI 语音面板、加好友弹窗、地图搜索、遮罩弹层等）完全没纳入返回逻辑。
- 页内返回按钮三种写法混用：`history.back()`、`nav.js goBack()`（from/back 参数链）、硬编码跳转，共约 40 处，行为不一致。
- 登录/引导流程历史未清理，进入主界面后返回可能倒回引导页/登录页。

## 目标

物理返回键与页内返回按钮走同一套判定，按下时逐层：

| 层 | 条件 | 行为 |
|---|---|---|
| L1 | 当前有浮层/弹层/面板打开 | 只关最上层浮层，不跳页 |
| L2 | 无浮层，且不在 5 个 Tab 根页 | 回退一层到上一个页面（保留来源页状态） |
| L3 | 无浮层，在非"房间"Tab 根页 | 切换到"房间"Tab |
| L4 | 无浮层，在"房间"Tab 根页 | 第 1 次 Toast「再按一次退出应用」；2 秒内第 2 次 → 最小化到桌面 |
| L5 | 引导流程内（login/性别/出生年/兴趣） | 逐步回退；login 为止走 L4；进入主壳 `index.html` 时清历史 |
| L6 | 兜底（无历史、异常、WebView 为空） | 最小化到桌面（不杀进程） |

配套规则：

1. Tab 切换永不产生"返回步骤"：切 Tab 后按返回只落到 L3/L4（不会"退回上一个 Tab"）。
2. `reload`（页面自动刷新/手动刷新）不计入历史层级。
3. AI 语音面板是 radar 页内的浮层：面板开 → 返回关面板；面板关 → 返回走 radar 的上一层逻辑。
4. 页内返回按钮与物理键完全一致（同一入口 `appBack()`）。
5. 特殊流程保留原定制语义（如"建房成页返回消息中心"），以注册方式声明，不与通用 L2 冲突。
6. Toast 文案固定「再按一次退出应用」，时间窗 2 秒；任何成功处理的返回操作都重置该时间窗。

## 非目标（YAGNI）

- 不做转场动画、不改页面视觉/内容、不重构底部栏、不引入 Capacitor 插件或任何新依赖。
- 不改 Tab 的滑动切换手势（swipe）与底栏交互。
- 不做 Android 预测式返回（predictive back）动效。

## 技术架构（方案 A：原生薄中继 + 网页侧统一 BackManager）

### 1. 原生 `MainActivity.java`（薄中继，纯转发）

- 删除现有 `url.contains("index.html")` 特判与 `canGoBack()` 分支。
- 返回键唯一逻辑：

```
webView.evaluateJavascript(
  "(function(){try{return (window.__appBack&&window.__appBack())||'exit';}catch(e){return 'exit';}})()",
  result -> { if (result 去掉引号后 == "exit") moveTaskToBack(true); })
```

- `webView == null` → `moveTaskToBack(true)`。
- JS 返回协议：`'handled'`（已处理）/ `'exit'`（请求最小化）；任何异常/空 → 按 `'exit'` 兜底。

### 2. 新增 `www/assets/vendor/back.js`（除 index.html 外全量注入）

提供：

```js
// 页面级返回层注册表（浮层 / 特殊返回流程）
BackLayers.register({
  isOpen: () => Boolean,   // 浮层类必填；特殊流程可省
  close:  () => void,      // 浮层类必填
  handle: () => Boolean,   // 特殊返回流程（可选，优先级低于浮层）
  priority: Number         // 可选，默认按注册顺序
})

// 页面统一返回入口（按钮 onclick 使用）
window.appBack()             // 返回 'handled' | 'exit'
window.__appBack = appBack   // 原生调用的别名（所有页面都存在）

// 供主壳调用的浮层关闭钩子
window.__backOverlayClose()  // 关最上层浮层，返回 boolean
```

`appBack()` 本地判定顺序：`__backOverlayClose()` → 非首屏 `history.back()` → 首屏双击退出计时（Toast 注入 + 2 秒窗）→ 返回 `'exit'`。在 iframe 内且 `parent.appBack` 存在时直接委托父窗，不再本地判定。

### 3. 主壳 `www/index.html` 的 BackManager

状态：

- `currentTab`：当前 Tab 根页 URL（5 个之一）。
- `tabStack`：**显式子页层级栈**（替代 `frameDepth`），首元素为当前 Tab 根页；进入子页 push，回退 pop，命中 Tab 根页重置为 `[root]`。
- `exitAt`：双击退出的截止时间戳。

iframe 每次 `load` 按 `performance.navigation.type` 更新栈：

- `navigate`（含 `location.replace`）：URL 是 Tab 根页 → `tabStack=[url]` 且更新 `currentTab`；否则 push（与栈顶相同则不 push）。
- `back_forward`：从栈顶向前找匹配 URL 并截断到该位置；找不到则退化为"退一层"（自愈）。
- `reload`：不动。
- bfcache 恢复：监听 `pageshow`，`event.persisted === true` 时按 `back_forward` 处理。

返回判定 `window.appBack()`：

1. L1：`frame.contentWindow.__backOverlayClose()` 返回 true → `'handled'`（try/catch 包裹）。
2. L2：`tabStack.length > 1` → `frame.contentWindow.history.back()` → `'handled'`。
3. L3：`currentTab !== 'room_list.html'` → `navigateTo('room_list.html')` → `'handled'`。
4. L4：双击计时（复用壳内 `#toast`）→ 第 2 次返回 `'exit'`。

Tab 切换：`navigateTo()` 改用 `frame.contentWindow.location.replace(url)` 写 iframe（替代 `frame.src = url`），并重置 `tabStack=[url]`、`currentTab=url`、更新底栏高亮——从根上杜绝 Tab 切换进入历史。

### 4. `www/assets/vendor/nav.js`

- `goBack()` 保留函数签名，内部改为调用 `appBack()`（漏改调用点的兜底）。
- 其余工具函数（`switchTab` 等）不动。

### 5. 全量注入

- 一次性 codemod 脚本给所有 `www/*.html` 注入 `<script src="assets/vendor/back.js"></script>`（已有则跳过；**`index.html` 除外**，其协议由自带 BackManager 实现，避免重复定义），作为独立 commit。
- 页内返回按钮统一：`history.back()` / `goBack(...)` / 硬编码目标 → `appBack()`（约 40 处，机械替换 + 人工抽查）。

## 数据流

```
物理返回键
 └─ MainActivity.OnBackPressedCallback
     └─ evaluateJavascript(window.__appBack())
         ├─ 非主壳页（back.js）：浮层 → history.back() → 双击退出 → 'exit'
         └─ 主壳 BackManager：L1 浮层 → L2 栈回退 → L3 回房间 → L4 双击退出 → 'exit'
 └─ 'exit' → moveTaskToBack(true)

页内返回按钮 → appBack()
 ├─ iframe 内 → parent.appBack()  （主壳 BackManager，同上）
 └─ 非 iframe → back.js 本地判定（同主壳页外逻辑）
```

## 页面接入规则

- **浮层注册**（L1）：各页在初始化处用 `BackLayers.register` 声明已有浮层的 `isOpen/close`，不重写弹层实现。已知对象：radar 的 AI 语音面板（`#aiSheet` / `closeAiSheet`）与加好友弹窗、地图搜索展开；房间列表/广场/发布/收藏等页的 `fixed inset-0` 弹层与遮罩（共约 22 页，实施前列清单逐页核对）。
- **特殊返回流程**：原 `goBack(default, customMap)` 中承载的定制语义（群设置返回聊天、建房完成返回消息中心、热点商品返回房间列表等）改为注册 `handle()`，保留原目标。
- **跳转清历史**（L5）：`splash → login`、`onboarding_interests → index`、`login → index`（跳过引导路径）、以及个人初始化流程进入 index 的跳转，全部改为 `location.replace()`。
- 引导流程内的"上一页"按钮（性别/出生年/兴趣）统一改 `appBack()`，与物理键一致。

## 错误与边界处理

| 场景 | 处理 |
|---|---|
| JS 异常 / `__appBack` 未定义 | 原生按 `'exit'` 兜底最小化 |
| iframe 尚未加载完成 | L1/L2 try/catch，失败走 L3/L4 |
| `performance.navigation` 缺失 | 视为 `navigate`，栈顶去重自愈 |
| bfcache 恢复（无 load 事件） | `pageshow.persisted` 出栈 |
| 快速连按返回 | JS 同步判定：第 1 次 Toast，2 秒内第 2 次退出；中间被成功处理的操作重置计时 |
| AI 面板内嵌 iframe（`ai_voice.html`） | 浮层归属 radar 页注册，关闭逻辑不变 |
| 浏览器 dev 预览（无 parent、无原生） | back.js 本地逻辑降级运行，`'exit'` 仅表现为 Toast 提示，不报错 |
| 深链接（带 `?from=`）直接进入子页 | 仍按 L2 真实回退；`from/back` 参数链保留用于页面内数据逻辑 |

## 改动清单

| 文件 | 改动 |
|---|---|
| `android/app/src/main/java/com/metasocial/demo/MainActivity.java` | 删除特判，薄中继转发 + `exit→moveTaskToBack` |
| `www/index.html` | 新 BackManager（tabStack/双击退出）；删旧 `frameDepth`/`__appBack`；`navigateTo` 改 replace |
| `www/assets/vendor/back.js` | 新增：浮层注册表 + 本地返回 + `appBack()` + Toast 注入 |
| `www/assets/vendor/nav.js` | `goBack()` 委托 `appBack()` |
| `www/*.html`（除 index.html） | 注入 back.js（codemod，单独 commit） |
| `www/*.html`（~30 页） | ~40 处返回按钮统一为 `appBack()` |
| `www/*.html`（~22 页） | 浮层 / 特殊返回流程注册 |
| `www/splash.html`、`login.html`、`onboarding_*.html`、`profile_init_*.html` | 进入下一步的跳转改 `location.replace` 清历史 |
| `README.md` | 补充返回逻辑说明（改动点/维护提示） |

## 验证与验收

通过标准：真机（Android）上物理返回键与页内返回按钮行为一致，且满足 L1-L6。

1. **浏览器回归**：`npm run dev`，程序化调用 `appBack()` 验证分层逻辑与浮层优先；`npm test`（响应式扫描）通过。
2. **构建**：`npx cap sync android` → `gradlew assembleRelease`（README 流程），产出 APK。
3. **真机回归**（`adb install -r` + `adb shell input keyevent 4` 模拟返回，关键步骤截图归档）：
   - 引导链：性别→出生年→兴趣逐步回退；login 双击退出（Toast 可见）；重新进入主壳后返回不倒回登录/引导页。
   - 房间 Tab：返回 → Toast → 最小化桌面。
   - Tab 归位：切到空间/雷达/TV/我的 → 返回 → 回房间 Tab；再返回 → 双击退出。确认不会退回上一个 Tab。
   - 多级子页：房间列表→他人房间→信息中心（或分组聊天链）逐级回退，状态保留。
   - L1 浮层：雷达开 AI 面板 → 返回关面板；开加好友弹窗 → 返回关弹窗；地图搜索展开 → 返回收起。
   - 发布页遮罩、房间列表/广场弹层 → 返回关闭。
   - 页内按钮一致性：抽查 5 个高频页的返回按钮，行为与物理键一致。
   - 回归：底栏切换、滑动切 Tab、正常页面跳转不受影响。
4. **证据归档**：截图与测试记录放 `docs/`（按既有习惯），随最终 commit 提交。

## 风险与回滚

- 风险：WebView history/bfcache 行为差异导致栈计数偏移 —— 用"显式 URL 栈 + 匹配自愈 + pageshow 兜底"降低；真机全路径回归覆盖。
- 风险：遗漏的返回按钮/浮层 —— `goBack()` 委托兜底 + codemod 后全文扫描确认无残留 `history.back()` / 硬编码返回。
- 回滚：改动按阶段独立提交（back.js 注入 / 按钮统一 / 浮层注册 / 流程替换），可逐阶段 revert；原生改动极小可直接回退单文件。
