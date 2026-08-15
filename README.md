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
| `android\app\build\outputs\apk\debug\app-debug.apk` | 构建产物 / 交付 APK |
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

# 2. 同步到 Android 工程（改完必做）
cd D:\android-demo
npx cap sync android

# 3. 构建（PowerShell）
$env:JAVA_HOME = "C:\Android\jdk\jdk-21.0.12+8"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
cd D:\android-demo\android
.\gradlew.bat assembleDebug

# 4. 交付物就在本目录内，直接取用即可
#   android\app\build\outputs\apk\debug\app-debug.apk（约 93.6MB，随 www\assets 素材量变化）
```

成功后提示 `BUILD SUCCESSFUL`。APK 体积随打包素材变化：早期约 28.6MB，加入 `www\assets\new_src` 素材后约 93.6MB。

### 装机测试（两种方式）
- **直接传文件**：把 APK 通过微信/数据线发给手机，点开允许"未知来源应用"后安装。
- **USB 调试**：手机开「开发者选项→USB 调试」，连电脑后：
  ```powershell
  & "C:\Android\Sdk\platform-tools\adb.exe" devices   # 确认手机在线
  & "C:\Android\Sdk\platform-tools\adb.exe" install -r "D:\android-demo\android\app\build\outputs\apk\debug\app-debug.apk"
  ```

---

## 四、常用修改点

| 想改什么 | 改哪里 |
|---|---|
| 页面内容 / 跳转 | `www\*.html`（改后 `cap sync`） |
| 应用名 / 包名 / 启动页 | `capacitor.config.json` |
| 桌面图标 / 闪屏 | `android\app\src\main\res\mipmap-*\ic_launcher*.png`、`drawable\splash.png` |
| 横竖屏 / 权限 | `android\app\src\main\AndroidManifest.xml`（当前锁竖屏） |
| 状态栏 / 全面屏 | 原生：`res\values-v23`（白底深色图标）、`res\values-v27`（挖孔屏适配）；页面：`www\*.html` 根容器已带 safe-area padding，真机验证即可 |
| 版本号 / 版本名 | `android\app\build.gradle` 的 `versionCode` / `versionName` |

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
5. **演示机需要联网**：页面图片走 modao.cc 外网 CDN，未全量本地化。
6. **Capacitor 版本**：装了 @capacitor/* 8.4.2，需要 JDK 21（机器上另一套 JDK 17 不够用）。

---

## 六、每次构建的固定步骤速查

```
改 www  →  npx cap sync android
→ 设 JAVA_HOME/ANDROID_HOME  →  cd android → .\gradlew.bat assembleDebug
→ 交付物 = android\app\build\outputs\apk\debug\app-debug.apk
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
