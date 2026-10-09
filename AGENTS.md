# AGENTS.md

Capacitor 套壳 Android 演示应用（纯 HTML/Tailwind，无框架、无后端）。
完整构建手册见 `README.md`（中文，含环境/坑位细节），本文件只列 agent 高频踩坑点。

## 常用命令

```powershell
npm run dev     # 本地静态服务器 :8080（起点 login.html，SSE 热刷新）；配合 agent-browser 做浏览器验证
npm test        # 仅静态巡检（响应式布局 + 返回导航），无 JS 单测框架
npx cap sync android   # 改完 www/ 后必做，否则 APK 不生效
```

构建 release（PowerShell，缺一不可）：

```powershell
$env:JAVA_HOME = "C:\Android\jdk\jdk-21.0.12+8"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
cd android; .\gradlew.bat assembleRelease
# 产物：android\app\build\outputs\apk\release\app-release-<versionName>.apk（如 app-release-1.6.0.apk）
```

## 硬约束（改错必炸）

- Capacitor 8 必须 JDK 21；机器上另一套 JDK 17 不够用。
- 工程路径不能含中文/空格（AGP 直接报错），本目录 `D:\android-demo` 是对的。
- 无外网：依赖走阿里云镜像（`C:\Users\17383\.gradle\init.d\mirror.gradle`，settings 级+项目级双重注入）。**不要删该文件**；`cap sync` 会重写 `android\capacitor-cordova-android-plugins\build.gradle` 回 `google()`，靠它兜底。该文件必须无 BOM UTF-8。
- `compileSdk/targetSdk = 35`（`android\variables.gradle`），本机没装 36，不要升。
- release 故意复用 debug keystore 签名（可覆盖升级），仅演示用途。
- `capacitor.config.json` 启动页键名是 `server.appStartPath`（值必须以 `/` 开头），写成 `startPath` 不生效。

## 架构与返回导航契约（`npm test` 会静态巡检）

- `www/` 是唯一源码；`android/` 只是 Capacitor 生成的壳。`www/index.html` 是主壳（iframe + tabStack 状态机），其余页面在 iframe 内。
- 页面内返回按钮必须调 `appBack()`；除 `index.html` 外每个页面必须引入 `assets/vendor/back.js`（新增页面漏引会被测试拦下）。
- 浮层必须 `BackLayers.register({ isOpen, close })` 注册（后注册先关闭），否则物理返回键会直接跳走。
- 主壳 Tab 切换只能走 `switchTab`/`navigateTo`（内部 `location.replace`），禁止 `frame.src = url` 之类的旧写法；引导流程结束用 `location.replace` 清历史，防止返回倒回引导页。
- `MainActivity.java` 是薄中继：调 `window.__appBack()`，只认 `'handled'`/`'exit'`（exit 时最小化），不要在原生侧写返回逻辑。
- `nav.js` 会给站内链接自动追加 `?back=`（多级回退用），页面间跳转沿用 `?from=` 约定。
- 布局扫描禁止：固定 `393px/852px` 尺寸、`100vh`（用 `100dvh`）；页面真机安全区由主壳 padding + `safe-area.js` 在 iframe 内去重，别在 iframe 页重复加 padding。

## 素材与体积

- 图片是 APK 体积大头（release 约 19MB）。新增/替换图片后先跑：
  ```powershell
  node scripts\audit-assets.js          # 找无引用素材
  node scripts\optimize-images.js --apply   # 瘦身；不加 --apply 是 dry-run
  ```
- 瘦身保持文件名与扩展名不变，页面引用无需改。vendor 库（Tailwind、iconify）均为本地文件，保持离线可用。

## 工作流

- Conventional commits（`feat:`/`fix:`/`chore:`/`docs:`/`test:`/`refactor:`），中文描述常见；大改动前先提交基线。当前工作分支 `design/v2-cyan`，`main` 为基线。
- 功能规格/计划放 `docs/superpowers/specs/`、`docs/superpowers/plans/`，验证记录放 `docs/`（如返回键验证记录）。

## 版本管理（`MAJOR.MINOR.PATCH` 三段式）

- 版本号唯一来源：`android/app/build.gradle` 的 `versionName`；当前基线 `1.6.0`（versionCode 7）。`package.json` 的 `version` 每次同步为同一版本号。
- `versionCode` 每次随 `versionName` 变更同时 +1，只增不减（Android 覆盖安装的硬性要求）。
- **产物命名：APK 文件名必须包含版本号**，由 `build.gradle` 的 `androidComponents` 自动命名为 `app-<variant>-<versionName>.apk`（如 `app-release-1.6.0.apk`）；不得手工改回无版本名。
- 升级算法与分级：

  | 级别 | 判定标准 | 算法 | 示例 |
  |---|---|---|---|
  | 小改动 | 缺陷修复、文案/样式微调、图标与素材替换、局部交互修正 | `PATCH + 1` | `1.5.0 → 1.5.1` |
  | 较大改动 | 新增页面/功能、返回导航或主壳协议变更、整站换肤、影响交付物的构建/架构调整 | `MINOR + 1`，`PATCH` 归零 | `1.5.1 → 1.6.0` |
  | 重大改动 | 里程碑级变更，由用户定义 | `MAJOR + 1`，`MINOR/PATCH` 归零 | `1.6.2 → 2.0.0` |

- 审批规则：
  - **只有 `PATCH` 位可自主升级**，无需询问；升级后必须在提交信息和回复中报告 `旧 → 新`。
  - **任何涉及 `MINOR`/`MAJOR` 位（即 `0.1.0`/`1.0.0` 段）的升级**，必须事先说明理由与 `旧 → 新`，获得明确同意后才能修改。
  - 分级拿不准时按"较大改动"处理（先询问，不擅自定级）。
- 触发时机：以一次交付批次（构建 release APK）为单位；同一批多处改动按其中最高级别升一次，不逐提交叠加。
- 适用范围：仅 `www/`、`android/` 等影响交付物的改动触发升级；纯 `docs/`、`scripts/`、`npm test` 巡检、`AGENTS.md` 改动不升版本。
- 记录方式：版本变更与对应改动同批提交，提交信息注明版本，如 `chore(release): 1.5.1`（不新建 CHANGELOG，以 git 历史为准）。
- 升级清单：改 `build.gradle` 的 `versionName`/`versionCode` + 同步 `package.json` 的 `version` →（www 有改动则先 `npx cap sync android`）→ `assembleRelease`。
