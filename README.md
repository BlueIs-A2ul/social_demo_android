# 元社交 Demo 安卓打包构建说明

> Capacitor 套壳的 Android 原生应用（不接 Godot、无后端），UI 全部在 `www/`（纯 HTML/Tailwind）。
> 本目录已**完全独立**：自带页面源码、git 版本管理、原生 Android 工程，不依赖任何外部原型目录。
> 本文件记录**本机**（Windows）的构建流程，方便新会话直接照着操作。

---

## 一、整体结构

| 路径 | 作用 |
|---|---|
| `www\` | **页面源码（唯一真源）**，改这里就行 |
| `capacitor.config.json` | 应用配置（应用名 / 启动页 / scheme） |
| `android\` | 原生 Android 工程（Capacitor 生成） |
| `android\app\src\main\res\values-v23\styles.xml` | 状态栏 / 导航栏配色（白底 + 深色图标） |
| `android\app\src\main\res\values-v27\styles.xml` | 刘海 / 挖孔屏适配、手势条深色图标 |
| `android\app\build\outputs\apk\release\app-release-<版本号>.apk` | 构建产物 / 交付 APK（约 18MB） |
| `scripts\audit-assets.js` | 素材引用审计：找出 `www\assets` 中无人引用的图片 |
| `scripts\optimize-images.js` | 图片批量瘦身：尺寸封顶 + PNG 量化 / JPEG mozjpeg |
| `.git`（git 仓库） | 版本管理，见第七节 |

**编辑代码改 `www\`，改完必须 `cap sync` 再打包，否则不生效。**

### 路径要求：必须是纯英文
Android 构建工具（AGP）**不允许在含中文的路径下编译**。
本工程已完全独立，复制到任何地方都可以直接构建，但**路径中不能有中文 / 空格**。

---

## 二、本机已装好的环境（无需重装）

| 依赖 | 位置 |
|---|---|
| Node.js v22 / npm | 系统 PATH |
| JDK 21（Capacitor 8 必需，不是 17） | `C:\Android\jdk\jdk-21.0.12+8` |
| Android SDK（android-35 + build-tools 35.0.0） | `C:\Android\Sdk` |
| Gradle 8.14.3（wrapper 自动用） | 腾讯镜像下载，已缓存 |
| 全局 Maven 镜像脚本 | `C:\Users\17383\.gradle\init.d\mirror.gradle` |

### 网络限制（重要）
本机**无法直连** `dl.google.com`、`services.gradle.org`、`maven.google.com`、`repo.maven.apache.org`。
构建全部走**国内镜像**：
- Maven 依赖 → 阿里云（`maven.aliyun.com`），由上面的全局 init 脚本自动接管
- Gradle 发行版 → 腾讯镜像（已在 `gradle-wrapper.properties` 里配好）

`cap sync` 每次会重新生成 `android\capacitor-cordova-android-plugins\build.gradle`（会把镜像配置覆盖回 google()）。
全局 init 脚本（settings 级 + 项目级双重注入）会自动兜底，所以不影响构建；**不要删除 `mirror.gradle`**（内容见第五节坑 3）。

---

## 三、打包构建（完整流程）

```powershell
# 1. 改页面
#   编辑 www\ 下的 html / assets（www 是源码真源，无需从别处同步）
#   新增/替换图片后，建议先跑第八节的素材瘦身流程

# 2. 同步到 Android 工程（改完必做）
cd D:\android-demo
npx cap sync android

# 3. 构建发布包（PowerShell）
$env:JAVA_HOME = "C:\Android\jdk\jdk-21.0.12+8"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
cd D:\android-demo\android
.\gradlew.bat assembleRelease

# 4. 交付物就在本目录内，直接取用即可
#   android\app\build\outputs\apk\release\app-release-<版本号>.apk（当前约 18.2MB）
```

- release 已开启 **R8 混淆 + 资源压缩**（`android\app\build.gradle`），dex 从 debug 的 8.1MB 降到 0.7MB。
- release 签名复用本机 **debug keystore**（`C:\Users\17383\.android\debug.keystore`，口令 `android`），因此可以和既有 debug 安装包互相覆盖升级；仅用于演示交付。
- 体积历史：早期 debug 包 165.9MB（素材未优化）→ 素材审计/去重/重压缩后 release 包 **18.2MB**（assets 18MB + dex 0.7MB + res 0.6MB）。
- 调试时仍可用 `.\gradlew.bat assembleDebug`（产物在 `apk\debug\app-debug.apk`）。

### 装机测试（两种方式）
- **直接传文件**：把 APK 通过微信/数据线发给手机，点开允许"未知来源应用"后安装。
- **USB 调试**：手机开「开发者选项→USB 调试」，连电脑后：
  ```powershell
  & "C:\Android\Sdk\platform-tools\adb.exe" devices   # 确认手机在线
  & "C:\Android\Sdk\platform-tools\adb.exe" install -r "D:\android-demo\android\app\build\outputs\apk\release\app-release-<版本号>.apk"
  ```

---

## 四、常用修改点

| 想改什么 | 改哪里 |
|---|---|
| 页面内容 / 跳转 | `www\*.html`（改后 `cap sync`） |
| 返回键 / 返回按钮逻辑 | `www\assets\vendor\back.js`（浮层注册 / 本地返回）、`www\index.html`（主壳 tabStack 状态机）、`MainActivity.java`（原生中继）；新增浮层时用 `BackLayers.register({ isOpen, close })` 注册 |
| 应用名 / 包名 / 启动页 | `capacitor.config.json` |
| 桌面图标 / 闪屏 | `android\app\src\main\res\mipmap-*\ic_launcher*.png`、`drawable\splash.png` |
| 横竖屏 / 权限 | `android\app\src\main\AndroidManifest.xml`（当前锁竖屏） |
| 状态栏 / 全面屏 | 原生：`res\values-v23`（白底深色图标）、`res\values-v27`（挖孔屏适配）；页面：`www\*.html` 根容器已带 safe-area padding，真机验证即可 |
| 版本号 / 版本名 | `android\app\build.gradle` 的 `versionCode` / `versionName` |
| 图片素材 / 包体积 | 新增图片后跑第八节的审计 + 瘦身脚本，再 `cap sync` 打包 |

**启动页配置键是 `server.appStartPath`（不是 startPath），否则不生效：**
```json
{ "server": { "androidScheme": "https", "appStartPath": "/login.html" } }
```

---

## 五、常见坑

1. **启动没进 login 页** → 检查 `capacitor.config.json` 是 `appStartPath` 而不是 `startPath`。
2. **构建报非 ASCII 路径错误** → 工程路径不能含中文 / 空格，保持纯英文路径。
3. **构建卡在 `dl.google.com`/TLS 握手** → 说明全局镜像脚本失效或被覆盖。`cap sync` 每次会重新生成 `android\capacitor-cordova-android-plugins\build.gradle`，其 `buildscript{}` 块会写回 `google()/mavenCentral()`（settings 级注入管不到这里）。重建 `C:\Users\17383\.gradle\init.d\mirror.gradle`（必须同时含 settings 级 + 项目级注入）：
   ```groovy
   // settings 级：pluginManagement + dependencyResolutionManagement
   gradle.beforeSettings { settings ->
       settings.pluginManagement {
           repositories {
               maven { url = uri('https://maven.aliyun.com/repository/gradle-plugin') }
               maven { url = uri('https://maven.aliyun.com/repository/google') }
               maven { url = uri('https://maven.aliyun.com/repository/public') }
           }
       }
   }
   gradle.settingsEvaluated { settings ->
       settings.dependencyResolutionManagement {
           repositories {
               maven { url = uri('https://maven.aliyun.com/repository/google') }
               maven { url = uri('https://maven.aliyun.com/repository/public') }
               maven { url = uri('https://maven.aliyun.com/repository/gradle-plugin') }
           }
       }
   }
   // 项目级：覆盖每个子项目 buildscript 块里的 google()（cap sync 会重新生成）
   gradle.beforeProject { project ->
       project.buildscript.repositories {
           maven { url = uri('https://maven.aliyun.com/repository/google') }
           maven { url = uri('https://maven.aliyun.com/repository/public') }
           maven { url = uri('https://maven.aliyun.com/repository/gradle-plugin') }
       }
       project.repositories {
           maven { url = uri('https://maven.aliyun.com/repository/google') }
           maven { url = uri('https://maven.aliyun.com/repository/public') }
           maven { url = uri('https://maven.aliyun.com/repository/gradle-plugin') }
       }
   }
   ```
   **写入时必须是无 BOM 的 UTF-8**：用 PowerShell `[System.IO.File]::WriteAllText(path, $content, (New-Object System.Text.UTF8Encoding($false)))` 写，否则 Gradle 报 `Unexpected character: '' @ line 1` 编译失败。
4. **编译 SDK 版本**：本机只有 android-35，工程已把 `compileSdk/targetSdk` 降到 35，Capacitor 8 代码向下兼容可用，**不要改回 36**（环境里没有该平台）。
5. **图片素材全部本地化**：页面图片均在 `www\assets` 内，可离线演示；新增素材请按第八节做瘦身与引用审计。
6. **Capacitor 版本**：装了 @capacitor/* 8.4.2，需要 JDK 21（机器上另一套 JDK 17 不够用）。
7. **release 体积异常变大** → 多半是新增了未压缩的大图。先跑 `node scripts\audit-assets.js` 与 `node scripts\optimize-images.js --apply`，再 `cap sync` 重新打包。
8. **返回键行为异常** → 检查三处是否同步：页内是否引入 `back.js`（index.html 除外）、主壳 `index.html` 的 `tabStack` 是否被绕过（勿再用 `frame.src = url` 切 Tab，必须走 `navigateTo` 的 `location.replace`）、新增浮层是否漏注册 `BackLayers.register`。`npm test` 会静态巡检这些点。

---

## 六、每次构建的固定步骤速查

```
改 www  →  （有新图先跑第八节瘦身）  →  npx cap sync android
→ 设 JAVA_HOME/ANDROID_HOME  →  cd android → .\gradlew.bat assembleRelease
→ 交付物 = android\app\build\outputs\apk\release\app-release-<版本号>.apk（约 18MB）
```

---

## 七、Git 版本管理

本工程已纳入 git 管理（带 `origin` 远程），改动前先看状态、提交留痕，方便回溯。

```powershell
git status                # 查看改动
git add -A                # 暂存全部
git commit -m "feat: ..." # 提交（见下方规范）
git log --oneline         # 查看历史
```

**提交信息规范**（conventional commits）：
- `feat: ...` 新功能，如 `feat: add fullscreen (edge-to-edge) adaptation`
- `fix: ...` 修 bug，如 `fix: correct Capacitor start path`
- `chore: ...` 构建 / 杂项，如 `chore: baseline snapshot before ...`

**约定**：大改动前先提交一次当前状态作为基线，再单独提交改动，便于随时回滚。

---

## 八、图片素材与包体积优化

素材是包体积的绝对大头（优化前图片 161.9MB、debug APK 165.9MB）。新增或替换图片后按下面两步处理，当前 assets 约 17MB、release APK 约 18.2MB：

```powershell
cd D:\android-demo

# 1. 引用审计：列出 www\assets 中没有被任何 html/js/css 引用的文件
#    （按 完整路径 / 文件名 / 文件名主干 三级匹配，并识别动态拼接前缀）
node scripts\audit-assets.js

# 2. 图片瘦身：先 dry-run 看预计收益，确认后 --apply 写回
node scripts\optimize-images.js
node scripts\optimize-images.js --apply
```

- 瘦身规则（`scripts\optimize-images.js`）：PNG 调色板量化 q85 + 压缩级别 9、JPEG mozjpeg q82、WebP q82；尺寸封顶——`icon/card/coin/vip/mascot/gender` 等目录 512px，全屏背景（启动页背景、雷达地图、主页封面等）2048px，其余 1600px；优化后反而变大的文件自动跳过。
- **保持原文件名与扩展名**，不用改任何 HTML/JS 引用，零页面改动。
- 删除"无用素材"前先人工复核审计结果（防止动态拼接路径被误判）；删除后跑一遍全页面检查破图（浏览器控制台 `document.images` 或逐页截图）。
- 处理过的素材原图都在 git 历史里，可随时回滚单个文件；Windows 下若偶发文件覆写失败，脚本已用"临时文件 + 替换"兜底。
