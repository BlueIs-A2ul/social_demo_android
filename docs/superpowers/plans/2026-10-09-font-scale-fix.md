# 系统字体缩放修复实施计划（锁定 WebView textZoom，1.6.0 → 1.6.1）

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:executing-plans 按任务逐条实施。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 让 App 在系统「字体大小」被调大的真机上，全站文字保持设计稿字号、内容完整显示，不再出现文字截断。

**Root Cause:** Capacitor 8 的 Android WebView 默认跟随系统 fontScale 缩放网页文本（`Bridge.java` 的 `initWebView()` 未固定 textZoom）。本工程 57 个页面大量使用固定 px 高度容器（底部导航 64px、头栏 48px、胶囊标签 20px 等），文字放大后撑破容器被裁切。用户已在测试机实测确认：调大系统「字体大小」即可复现。

**Solution（已与用户确认）:** A + B

- **A（核心）**：原生 `MainActivity.onCreate` 固定 `textZoom = 100`。一处生效，覆盖主壳 + 全部 iframe 子页。
- **B（兜底）**：`theme.css` 加 `text-size-adjust: 100%`。只对 text autosizing（字体自动放大）生效，对无障碍字号缩放不保证，仅作浏览器预览/老 WebView 的保险。
- **明确不做**：C（57 页弹性布局大改，属较大改动；未来若出现「显示大小（密度）」机型截断再单独立项，MINOR 升级需用户审批）；D（新增 npm test 静态断言，未纳入本次范围）。

**Tech Stack:** Capacitor 8 / Android WebView / 纯 HTML + Tailwind（本地 Play CDN 副本）/ Node 巡检脚本 / PowerShell + Gradle（JDK 21）。

**交付物:** `app-release-1.6.1.apk`（versionCode 8）。

**测试策略:** 本仓库无 JS 单测框架。验证 = `npm test` 静态巡检（需保持通过）+ 大字号真机人工复核 + 正常机回归。

---

## 0. 基线现状（先读，勿回退已有改动）

- 分支：`design/v2-cyan`；最新提交：`7a2cff0`（返回键导航验证记录）。
- 工作区已有**未提交**的 1.6.0 批次改动，属于既有工作，**不要回退、不要覆盖**：
  - `android/app/build.gradle`：versionCode 6→7、versionName 1.5→1.6.0、新增按版本号命名产物的 `androidComponents` 块
  - `package.json`：version → 1.6.0
  - `README.md` 修改、未跟踪的 `AGENTS.md`
  - 已有构建产物 `android/app/build/outputs/apk/release/app-release-1.6.0.apk`（2026-10-07 构建）
- 本次修复属于新一批交付（PATCH 级，缺陷修复），版本 1.6.0 → 1.6.1。

- [ ] **Step 0: 提交 1.6.0 基线**（保证 1.6.1 diff 干净）

```powershell
git add README.md AGENTS.md android/app/build.gradle package.json
git commit -m "chore(release): 1.6.0 基线（版本号/产物命名 + 文档）"
```

（若用户明确要求不提交基线：跳过本步，最后与修复合并为同一提交，并在提交信息中注明 1.6.0 → 1.6.1。）

---

## 1. 原生修复：锁定 WebView 文本缩放

**Files:** `android/app/src/main/java/com/metasocial/demo/MainActivity.java`（仅此一个文件）

- [ ] **Step 1: 在 `onCreate` 的 `super.onCreate(savedInstanceState);` 之后、返回键回调注册之前，插入以下代码**

```java
        // 锁定 WebView 文本缩放：忽略系统「字体大小」，避免大字号真机文字撑破固定高度容器
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setTextZoom(100);
        }
```

- [ ] **Step 2: 修改后核对 `onCreate` 形态（节选，缩进必须一致）**

```java
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 锁定 WebView 文本缩放：忽略系统「字体大小」，避免大字号真机文字撑破固定高度容器
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setTextZoom(100);
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                ...
```

**关键事实（已核实，供实施者理解，勿改）：**

- Capacitor 8 `BridgeActivity.onCreate()` 内部调 `load()`，其中 `bridge = bridgeBuilder...create()` 已完成（`node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeActivity.java:42-48`），因此此处 `getBridge()` 非空；空判仅防御 `setContentView` 失败路径（同文件 `:29-31`）。
- 无需新增 import（`WebView` 已在文件顶部导入，`setTextZoom` 通过 `getSettings()` 链式调用）。
- `setTextZoom` 对整个 WebView 生效，覆盖所有 iframe 页面，无需逐页处理。
- 系统字号变化会重建 Activity（`AndroidManifest.xml:13` 的 `configChanges` 未声明 `fontScale`），重建后 `onCreate` 会再次锁定，无需额外处理。

---

## 2. Web 侧兜底：text-size-adjust

**Files:** `www/assets/vendor/theme.css`（仅此一个文件）

- [ ] **Step 1: 在文件头部注释块（`============ */`）之后、`:root {` 之前插入**

```css
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

**说明：**

- 当前 35/57 个页面引用 `theme.css`（含主壳 `www/index.html`）；其余页面由 Task 1 原生锁定覆盖。
- 该 CSS 对系统无障碍字号缩放不保证有效（Chrome 有意允许用户设置覆盖网页），主修复是 Task 1，此条仅为兜底，**不要**因真机验证「B 无效」而误判修复失败。

---

## 3. 版本升级 1.6.0 → 1.6.1

- [ ] **Step 1: `android/app/build.gradle`（`defaultConfig` 内）**

  - `versionCode 7` → `versionCode 8`
  - `versionName "1.6.0"` → `versionName "1.6.1"`

- [ ] **Step 2: `package.json`**

  - `"version": "1.6.0"` → `"version": "1.6.1"`

- [ ] **Step 3: 确认产物命名逻辑已存在**，无需新增改动

  `build.gradle:40-46` 的 `androidComponents { onVariants ... }` 会自动输出 `app-<variant>-<versionName>.apk`，即 `app-release-1.6.1.apk`。

---

## 4. 同步与静态巡检

- [ ] **Step 1: 同步 www 到 android 壳**

```powershell
npx cap sync android
```

预期：无报错。**不要删除** `C:\Users\17383\.gradle\init.d\mirror.gradle`（sync 会把 `android\capacitor-cordova-android-plugins\build.gradle` 的仓库改回 `google()`，靠该镜像脚本兜底；该文件必须无 BOM UTF-8）。

- [ ] **Step 2: 静态巡检**

```powershell
npm test
```

预期输出（退出码 0）：

```
Responsive layout scan passed.
Back navigation scan passed.
```

---

## 5. 构建 release

- [ ] **Step 1: 设置环境变量并构建**（JDK 必须是 21；工程路径不得含中文/空格）

```powershell
$env:JAVA_HOME = "C:\Android\jdk\jdk-21.0.12+8"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
cd android; .\gradlew.bat assembleRelease
```

- [ ] **Step 2: 确认产物存在**

```
android\app\build\outputs\apk\release\app-release-1.6.1.apk   （约 20MB）
```

---

## 6. 真机验证（必须，不能只靠构建成功）

- [ ] **Step 1: 问题机复测（此前可复现的样机）**

  1. 系统「设置 → 显示 → 字体大小」调到最大档 → 冷启动 App（杀进程重进，触发 Activity 重建）
  2. 逐页检查无文字截断/溢出，且字号与正常机一致（锁定生效）：
     - 主壳底部 5 个 Tab 区域（`www/index.html:93` 附近）
     - `room_list.html`：头像昵称、`.pill` 胶囊标签（原 `height:20px; font-size:10px`）
     - `display.html` / `settings.html` / `security.html` 等列表行（`.setting-row`）
     - `radar.html`、`profile.html`、`splash.html`、`login.html`、`onboarding_*.html`
  3. 页面跳转与物理返回键行为正常（本修复不应影响返回导航）

- [ ] **Step 2: 正常机回归**

  与修复前对比无可感知变化；重点看布局无位移、无新增滚动条。

- [ ] **Step 3（可选）：安装到测试机**

```powershell
& "C:\Android\Sdk\platform-tools\adb.exe" install -r "D:\android-demo\android\app\build\outputs\apk\release\app-release-1.6.1.apk"
```

---

## 7. 提交

- [ ] **Step 1: 检查 `git status` / `git diff`，确认只包含预期文件**（`android/app/src/main/assets/*` 为 sync 生成物且未被 git 跟踪，无需提交）

- [ ] **Step 2: 提交**（Conventional Commits，中文描述，注明旧 → 新版本）

```powershell
git add android/app/src/main/java/com/metasocial/demo/MainActivity.java www/assets/vendor/theme.css android/app/build.gradle package.json
git commit -m "fix: 锁定 WebView 字体缩放，修复系统大字号下文字截断 (1.6.0 → 1.6.1)"
```

不新建 CHANGELOG，以 git 历史为准。

---

## 验收标准

1. 测试机系统字号最大档下，Task 6 Step 1 所列页面文字完整显示、字号与设计稿一致；
2. 正常机无回归；
3. `npm test` 输出 `Responsive layout scan passed.` 与 `Back navigation scan passed.`；
4. 产物为 `app-release-1.6.1.apk`，`versionCode 8`、`versionName 1.6.1`，可从 1.6.0 覆盖安装；
5. 系统字号变化导致 Activity 重建后，App 仍保持锁定字号。

## 风险与备选

- **若 Task 1 在测试机上无效（预期外）**：记录该机 Android 版本与 WebView 版本（设置 → 应用 → Android System WebView），回报用户，不要自行大改。备选（未验证，仅在确认 A 失败时尝试）：
  - 在 `MainActivity` 覆写 `onConfigurationChanged` 时重新 `setTextZoom(100)`；
  - 或在 `attachBaseContext` 中固定 `Configuration.fontScale = 1f`。
- **锁定后 App 不再跟随系统字号**：这是与用户确认过的取舍；`www/display.html:44`「字体大小 跟随系统」行保持原样（纯展示）。
- **本修复不改布局代码**：若后续出现「显示大小（密度）」机型导致的截断，需另立项做布局弹性化（57 页巡检，属较大改动，MINOR 升级需用户审批）。

## 背景证据（诊断依据）

- `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/Bridge.java:582-618`：Capacitor 初始化 WebView 未设置 textZoom。
- `MainActivity.java`：修复前无任何字号/缩放处理。
- 固定高度示例：`www/index.html:93`（nav `h-[64px]`）、`www/display.html:28`（头栏 `height:48px`）、`www/room_list.html:114-120`（`.pill { height:20px; font-size:10px }`）、`www/theme.css:90/117/151`（固定 px 字号）。
- `scripts/check-responsive-layout.js`：现有巡检只拦 `393/852px` 与 `100vh`，无法覆盖系统字号缩放。
- 用户实测：测试机调大系统「字体大小」后复现截断；「显示大小」因素未出现。
