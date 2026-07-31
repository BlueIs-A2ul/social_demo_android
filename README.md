# 元社交 Demo 安卓打包构建说明

> 把 `原型设计图` 的 HTML 原型打包成可安装的 Android APK（Capacitor 套壳，不接 Godot、无后端）。
> 本文件记录**本机**（Windows）的完整构建流程，方便新会话直接照着操作。

---

## 一、整体结构

| 路径 | 作用 |
|---|---|
| `D:\desktop\元宇宙项目\原型设计图\` | 源原型（存档，不要直接改） |
| `D:\desktop\元宇宙项目\元社交-demo.apk` | 最终交付的 APK |
| `D:\android-demo\www\` | **要改的页面代码**（原型的可编辑副本） |
| `D:\android-demo\capacitor.config.json` | 应用配置（应用名 / 启动页 / scheme） |
| `D:\android-demo\android\` | 原生 Android 工程（Capacitor 生成） |
| `D:\android-demo\android\app\build\outputs\apk\debug\app-debug.apk` | 构建产物 |

**编辑代码改 `D:\android-demo\www\`，改完必须 `cap sync` 再打包，否则不生效。**

### 为什么工程在 `D:\android-demo` 而不是桌面项目里？
Android 构建工具（AGP）**不允许在含中文的路径下编译**（`D:\desktop\元宇宙项目` 有中文）。
工程已整体移到纯英文路径 `D:\android-demo`，不要移回中文目录。

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
因为有全局 init 脚本兜底，所以不影响构建；**不要删除 `mirror.gradle`**。

---

## 三、打包构建（完整流程）

```powershell
# 1. 改页面
#   编辑 D:\android-demo\www\ 下的 html / assets

# 2. 同步到 Android 工程（改完必做）
cd D:\android-demo
npx cap sync android

# 3. 构建（PowerShell）
$env:JAVA_HOME = "C:\Android\jdk\jdk-21.0.12+8"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
cd D:\android-demo\android
.\gradlew.bat assembleDebug

# 4. 拷出交付物
Copy-Item app\build\outputs\apk\debug\app-debug.apk `
    -Destination "D:\desktop\元宇宙项目\元社交-demo.apk" -Force
```

成功后提示 `BUILD SUCCESSFUL`，APK 约 28.6MB。

### 装机测试（两种方式）
- **直接传文件**：把 APK 通过微信/数据线发给手机，点开允许"未知来源应用"后安装。
- **USB 调试**：手机开「开发者选项→USB 调试」，连电脑后：
  ```powershell
  & "C:\Android\Sdk\platform-tools\adb.exe" devices   # 确认手机在线
  & "C:\Android\Sdk\platform-tools\adb.exe" install -r "D:\desktop\元宇宙项目\元社交-demo.apk"
  ```

---

## 四、常用修改点

| 想改什么 | 改哪里 |
|---|---|
| 页面内容 / 跳转 | `www\*.html`（改后 `cap sync`） |
| 应用名 / 包名 / 启动页 | `D:\android-demo\capacitor.config.json` |
| 桌面图标 / 闪屏 | `android\app\src\main\res\mipmap-*\ic_launcher*.png`、`drawable\splash.png` |
| 横竖屏 / 权限 | `android\app\src\main\AndroidManifest.xml`（当前锁竖屏） |

**启动页配置键是 `server.appStartPath`（不是 startPath），否则不生效：**
```json
{ "server": { "androidScheme": "https", "appStartPath": "login.html" } }
```

---

## 五、常见坑

1. **启动没进 login 页** → 检查 `capacitor.config.json` 是 `appStartPath` 而不是 `startPath`。
2. **构建报非 ASCII 路径错误** → 工程必须留在 `D:\android-demo`，别移回中文目录。
3. **构建卡在 `dl.google.com`/TLS 握手** → 说明全局镜像脚本失效了，重建 `C:\Users\17383\.gradle\init.d\mirror.gradle`：
   ```groovy
   allprojects {
       buildscript { repositories {
           maven { url 'https://maven.aliyun.com/repository/google' }
           maven { url 'https://maven.aliyun.com/repository/public' }
           maven { url 'https://maven.aliyun.com/repository/gradle-plugin' } } }
       repositories {
           maven { url 'https://maven.aliyun.com/repository/google' }
           maven { url 'https://maven.aliyun.com/repository/public' }
           maven { url 'https://maven.aliyun.com/repository/gradle-plugin' } }
   }
   ```
4. **编译 SDK 版本**：本机只有 android-35，工程已把 `compileSdk/targetSdk` 降到 35，Capacitor 8 代码向下兼容可用，**不要改回 36**（环境里没有该平台）。
5. **演示机需要联网**：页面图片走 modao.cc 外网 CDN，未全量本地化。
6. **Capacitor 版本**：装了 @capacitor/* 8.4.2，需要 JDK 21（机器上另一套 JDK 17 不够用）。

---

## 六、每次构建的固定步骤速查

```
cd D:\android-demo  →  改 www  →  npx cap sync android
→ 设 JAVA_HOME/ANDROID_HOME  →  cd android → .\gradlew.bat assembleDebug
→ 拷贝 app-debug.apk 到 D:\desktop\元宇宙项目\元社交-demo.apk
```
