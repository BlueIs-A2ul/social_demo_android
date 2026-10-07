# 真机返回键导航控制实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Android 物理返回键与页内返回按钮按统一分层逻辑工作（浮层优先 → 子页回退 → Tab 归位 → 双击退出），让 demo 具备真实 App 的返回手感。

**Architecture:** 原生 `MainActivity` 退化为薄中继（调 `window.__appBack()`，仅在返回 `'exit'` 时 `moveTaskToBack`）；网页侧新增 `www/assets/vendor/back.js`（浮层注册表 + 本地返回 + 统一 `appBack()`），主壳 `index.html` 内实现显式 `tabStack` 状态机（替代原 `frameDepth` 猜测），Tab 切换用 `location.replace` 写 iframe。

**Tech Stack:** 纯 HTML/原生 JS（无框架）、Capacitor 8、Android WebView、Node 脚本巡检。

**规格文档:** `docs/superpowers/specs/2026-10-07-back-navigation-design.md`

**测试策略:** 本仓库无 JS 单测框架，采用仓库既有模式：Node 静态巡检脚本（`scripts/check-back-navigation.js`）+ 浏览器行为验证 + adb 真机回归。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `www/assets/vendor/back.js`（新增） | 浮层注册表、本地返回判定、`appBack()`、双击退出 Toast |
| `www/index.html` | 主壳 BackManager：tabStack 状态机、L1-L4 判定、Tab 切换 replace |
| `android/.../MainActivity.java` | 薄中继：转发返回键、执行最小化 |
| `www/assets/vendor/nav.js` | `goBack()` 改为委托 `appBack()`（兜底） |
| `scripts/inject-backjs.js`（新增） | 一次性 codemod：全量注入 back.js（幂等，排除 index.html） |
| `scripts/check-back-navigation.js`（新增） | 静态巡检：注入完整性、无残留旧返回写法、注册完整性 |
| `www/*.html` | 45 处返回按钮统一、19 页浮层注册、6 处流程跳转 replace |

---

## Task 1: 新增 back.js 核心模块

**Files:**
- Create: `www/assets/vendor/back.js`

- [ ] **Step 1: 写入 back.js**

```js
/**
 * 统一返回逻辑：
 * - 页内返回按钮调用 appBack()
 * - 原生返回键调用 window.__appBack()
 * - 浮层/特殊流程通过 BackLayers.register 注册，后注册先处理
 */
(function () {
    var isIframe = false;
    try { isIframe = window.self !== window.top; } catch (e) { isIframe = true; }

    var layers = [];
    var EXIT_WINDOW_MS = 2000;
    var exitAt = 0;
    var toastEl = null;

    function ensureToast() {
        if (toastEl) return toastEl;
        toastEl = document.createElement('div');
        toastEl.setAttribute('id', 'app-back-toast');
        toastEl.style.cssText = 'position:fixed;left:50%;bottom:100px;transform:translateX(-50%);' +
            'background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;font-size:14px;' +
            'z-index:99999;display:none;white-space:nowrap;';
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function showToast(message) {
        var el = ensureToast();
        el.textContent = message;
        el.style.display = 'block';
        clearTimeout(el._timer);
        el._timer = setTimeout(function () { el.style.display = 'none'; }, 1500);
    }

    function register(def) {
        if (def) layers.push(def);
    }

    // 关闭最上层浮层（后注册先处理）；返回是否有浮层被关闭
    function closeTop() {
        for (var i = layers.length - 1; i >= 0; i--) {
            var item = layers[i];
            if (!item || typeof item.isOpen !== 'function') continue;
            try {
                if (item.isOpen()) {
                    if (typeof item.close === 'function') item.close();
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    // 页面自定义返回流程（如"建房完成页返回消息中心"）
    function runCustom() {
        for (var i = layers.length - 1; i >= 0; i--) {
            var item = layers[i];
            if (!item || typeof item.handle !== 'function') continue;
            try {
                if (item.handle()) return true;
            } catch (e) {}
        }
        return false;
    }

    // 双击退出：第一次提示，窗口内第二次返回 'exit'
    function requestExit() {
        var now = Date.now();
        if (now < exitAt) {
            exitAt = 0;
            return 'exit';
        }
        exitAt = now + EXIT_WINDOW_MS;
        showToast('再按一次退出应用');
        return 'handled';
    }

    // 非主壳页面的本地返回判定
    function localBack() {
        if (closeTop()) { exitAt = 0; return 'handled'; }
        if (runCustom()) { exitAt = 0; return 'handled'; }
        if (window.history.length > 1) {
            exitAt = 0;
            window.history.back();
            return 'handled';
        }
        return requestExit();
    }

    // 统一入口：iframe 内委托主壳，否则本地判定
    function appBack() {
        if (isIframe) {
            try {
                if (window.parent && typeof window.parent.appBack === 'function') {
                    return window.parent.appBack();
                }
            } catch (e) {}
        }
        return localBack();
    }

    window.BackLayers = {
        register: register,
        closeTop: closeTop
    };
    window.appBack = appBack;
    window.__appBack = appBack;
    window.__backOverlayClose = closeTop;
    window.__pageCustomBack = runCustom;
})();
```

- [ ] **Step 2: 语法检查**

Run: `node --check www/assets/vendor/back.js`
Expected: 无输出（退出码 0）

- [ ] **Step 3: Commit**

```powershell
git add www/assets/vendor/back.js
git commit -m "feat: 新增 back.js 统一返回逻辑（浮层注册表/本地返回/双击退出）"
```

---

## Task 2: 全量注入 back.js

**Files:**
- Create: `scripts/inject-backjs.js`
- Modify: `www/onboarding_birth.html`（补 `</body></html>`）
- Modify: 其余 55 个 `www/*.html`（注入 script 标签）

- [ ] **Step 1: 修复 onboarding_birth.html 缺失的闭合标签**

文件第 99 行 `</script>` 之后直接结束，追加：

```html
</body></html>
```

- [ ] **Step 2: 写入注入脚本**

```js
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')
const SNIPPET = '<script src="assets/vendor/back.js"></script>'

const files = fs
  .readdirSync(wwwDir)
  .filter(file => file.endsWith('.html') && file !== 'index.html')

let injected = 0
let skipped = 0
const failed = []

for (const file of files) {
  const full = path.join(wwwDir, file)
  let html = fs.readFileSync(full, 'utf8')
  if (html.includes('assets/vendor/back.js')) {
    skipped++
    continue
  }
  const idx = html.lastIndexOf('</body>')
  if (idx === -1) {
    failed.push(file)
    continue
  }
  const before = html.slice(0, idx)
  const after = html.slice(idx)
  const separator = before.endsWith('\n') ? '' : '\n'
  fs.writeFileSync(full, before + separator + SNIPPET + '\n' + after)
  injected++
}

console.log('injected: ' + injected + ', skipped: ' + skipped)
if (failed.length) {
  console.log('missing </body>: ' + failed.join(', '))
  process.exit(1)
}
```

- [ ] **Step 3: 运行注入**

Run: `node scripts/inject-backjs.js`
Expected: `injected: 56, skipped: 0`（56 = 57 个 html - index.html）

- [ ] **Step 4: 幂等验证 + 巡检**

Run: `node scripts/inject-backjs.js; npm test`
Expected: 第二次 `injected: 0, skipped: 56`；`Responsive layout scan passed.`

- [ ] **Step 5: Commit**

```powershell
git add scripts/inject-backjs.js www
git commit -m "chore: 全量注入 back.js 并修复 onboarding_birth 缺失闭合标签"
```

---

## Task 3: nav.js goBack 委托 appBack

**Files:**
- Modify: `www/assets/vendor/nav.js:29-63`

- [ ] **Step 1: 替换 goBack 实现（保留签名兜底）**

将 `goBack` 函数体（29-63 行）整体替换为：

```js
/**
 * 返回上一页（已统一为 back.js 的 appBack 逻辑，保留签名以兼容旧调用点）
 * @param {string} defaultPage - 已废弃，仅兼容旧调用
 * @param {Object} customMap - 已废弃，仅兼容旧调用
 */
function goBack() {
    if (typeof window.appBack === 'function') {
        return window.appBack();
    }
    if (window.history.length > 1) {
        window.history.back();
    }
}
```

- [ ] **Step 2: 语法检查**

Run: `node --check www/assets/vendor/nav.js`
Expected: 退出码 0

- [ ] **Step 3: Commit**

```powershell
git add www/assets/vendor/nav.js
git commit -m "refactor: nav.js goBack 委托统一 appBack 逻辑"
```

---

## Task 4: 主壳 index.html BackManager

**Files:**
- Modify: `www/index.html:137-144`（navigateTo）
- Modify: `www/index.html:205-246`（删除旧 frameDepth/__appBack，替换为 BackManager）

- [ ] **Step 1: 替换 navigateTo（137-144 行）**

```js
    function navigateTo(url) {
        const idx = TAB_URLS.indexOf(url);
        if (idx !== -1) currentTabIndex = idx;
        currentTab = TAB_URLS[currentTabIndex];
        const navMask = document.getElementById('nav-mask');
        if (navMask) navMask.style.display = 'none';
        const frame = document.getElementById('content-frame');
        try {
            frame.contentWindow.location.replace(url);
        } catch (err) {
            frame.src = url;
        }
        setActiveNav(currentTab);
        tabStack = [url];
    }
```

- [ ] **Step 2: 替换 205-246 行（旧返回逻辑）为 BackManager**

```js
    // ===== 返回逻辑：浮层优先 → 子页回退 → 非房间Tab归位 → 房间Tab双击退出 =====
    let currentTab = TAB_URLS[0];
    let tabStack = [TAB_URLS[0]];
    let exitAt = 0;

    function frameWin() {
        try { return document.getElementById('content-frame').contentWindow; } catch (err) { return null; }
    }

    function frameUrl(win) {
        try { return win.location.pathname + win.location.search; } catch (err) { return ''; }
    }

    function tabFromUrl(url) {
        if (!url) return '';
        const path = url.split('?')[0];
        for (let i = 0; i < TAB_URLS.length; i++) {
            if (path === TAB_URLS[i] || path.endsWith('/' + TAB_URLS[i])) return TAB_URLS[i];
        }
        return '';
    }

    // 历史回退后的栈校正：截断到匹配项，找不到则退一层（自愈）
    function applyBackForward(url) {
        const idx = tabStack.lastIndexOf(url);
        if (idx >= 0) {
            tabStack = tabStack.slice(0, idx + 1);
        } else if (tabStack.length > 1) {
            tabStack.pop();
        }
        const tab = tabFromUrl(url);
        if (tab) {
            currentTab = tab;
            setActiveNav(tab);
        }
    }

    function onFrameLoad() {
        const win = frameWin();
        if (!win) return;
        const url = frameUrl(win);
        let type = 'navigate';
        try {
            const entries = win.performance.getEntriesByType('navigation');
            if (entries && entries[0] && entries[0].type) {
                type = entries[0].type;
            } else if (win.performance.navigation) {
                const t = win.performance.navigation.type;
                type = t === 2 ? 'back_forward' : t === 1 ? 'reload' : 'navigate';
            }
        } catch (err) {}

        if (!win.__backTrackBound) {
            win.__backTrackBound = true;
            win.addEventListener('pageshow', function (e) {
                if (e.persisted) applyBackForward(frameUrl(win));
            });
        }

        if (type === 'reload') return;
        if (type === 'back_forward') {
            applyBackForward(url);
            return;
        }

        const tab = tabFromUrl(url);
        if (tab) {
            currentTab = tab;
            tabStack = [url];
            setActiveNav(tab);
            return;
        }
        if (tabStack[tabStack.length - 1] !== url) tabStack.push(url);
    }

    window.appBack = function () {
        const win = frameWin();
        if (!win) return 'exit';

        // L1：优先关闭 iframe 内最上层浮层
        try {
            if (typeof win.__backOverlayClose === 'function' && win.__backOverlayClose()) {
                exitAt = 0;
                return 'handled';
            }
        } catch (err) {}

        // L1.5：页面自定义返回流程
        try {
            if (typeof win.__pageCustomBack === 'function' && win.__pageCustomBack()) {
                exitAt = 0;
                return 'handled';
            }
        } catch (err) {}

        // L2：子页回退一层
        if (tabStack.length > 1) {
            try {
                win.history.back();
                exitAt = 0;
                return 'handled';
            } catch (err) {}
        }

        // L3：非"房间"Tab 归位到房间
        if (currentTab !== TAB_URLS[0]) {
            navigateTo(TAB_URLS[0]);
            exitAt = 0;
            return 'handled';
        }

        // L4：房间 Tab 双击退出
        const now = Date.now();
        if (now < exitAt) {
            exitAt = 0;
            return 'exit';
        }
        exitAt = now + 2000;
        showToast('再按一次退出应用');
        return 'handled';
    };
    window.__appBack = window.appBack;

    document.getElementById('content-frame').addEventListener('load', onFrameLoad);
```

注意：原 205-246 行内的 `frameDepth` 跟踪 IIFE 与 `__appBack` 一并删除；`showToast` 定义（248 行起）保留不动。

- [ ] **Step 3: 验证语法与残留**

Run: `node -e "const s=require('fs').readFileSync('www/index.html','utf8'); if(s.includes('frameDepth')) process.exit(1); if(!s.includes('tabStack')) process.exit(1); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```powershell
git add www/index.html
git commit -m "feat: 主壳返回状态机（tabStack/浮层优先/Tab归位/双击退出），Tab切换改 replace"
```

---

## Task 5: MainActivity 薄中继

**Files:**
- Modify: `android/app/src/main/java/com/metasocial/demo/MainActivity.java`（全文重写）

- [ ] **Step 1: 重写 MainActivity.java**

```java
package com.metasocial.demo;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    moveTaskToBack(true);
                    return;
                }

                // 所有返回行为统一由网页侧 back.js / 主壳 BackManager 判定：
                // 'handled' = 已处理；'exit' = 请求最小化到桌面
                String js = "(function(){try{return (window.__appBack&&window.__appBack())||'exit';}catch(e){return 'exit';}})()";
                webView.evaluateJavascript(js, result -> {
                    if (result == null) {
                        moveTaskToBack(true);
                        return;
                    }
                    String value = result.replace("\"", "").trim();
                    if (value.equals("exit")) {
                        moveTaskToBack(true);
                    }
                });
            }
        });
    }
}
```

- [ ] **Step 2: 静态检查（无 canGoBack 残留、协议存在）**

Run: `node -e "const s=require('fs').readFileSync('android/app/src/main/java/com/metasocial/demo/MainActivity.java','utf8'); if(s.includes('canGoBack')) process.exit(1); if(!s.includes('__appBack')) process.exit(1); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```powershell
git add android/app/src/main/java/com/metasocial/demo/MainActivity.java
git commit -m "feat: 返回键原生侧改为薄中继（统一转发网页侧 appBack）"
```

---

## Task 6: 页内返回按钮统一为 appBack()

**Files:**
- Modify: 全部含返回按钮的页面（见下表）

- [ ] **Step 1: 批量替换 20 处 `onclick="history.back()"` → `onclick="appBack()"`**

涉及：`about / chat_records / coins / company_center / display / feedback / friend_privacy / icon_guide / info_board / info_detail / notify / owner_room / profile_center / profile_info / security / settings / vip_center / onboarding_birth / onboarding_gender / onboarding_interests`（每文件 1 处，直接用 Edit 的 replaceAll 替换该字符串）。

- [ ] **Step 2: 替换 10 处 goBack 调用点**

| 文件:行 | 旧 | 新 |
|---|---|---|
| category.html:196 | `onclick="goBack('profile_settings.html', {profile_settings: 'profile_settings.html', profile: 'profile.html'})"` | `onclick="appBack()"` |
| friend_contacts.html:132 | `href="javascript:goBack()"` | `href="javascript:appBack()"` |
| group_settings.html:113 | `onclick="goBack('group_chat.html', {group_chat: 'group_chat.html', group_create: 'message_center.html', message_center: 'message_center.html'})"` | `onclick="appBack()"` |
| hot_products_virtual.html:364 | `onclick="goBack('room_list.html', {room_list: 'room_list.html', merchant_shop: 'merchant_shop.html'})"` | `onclick="appBack()"` |
| message_center.html:450 | `onclick="goBack('room_list.html')"` | `onclick="appBack()"` |
| my_contacts.html:123 | `href="javascript:goBack()"` | `href="javascript:appBack()"` |
| panorama_room.html:97 | `onclick="goBack('room_list.html', {announcement_detail: 'announcement_detail.html', owner_profile: 'owner_profile.html', radar_friend: 'radar_friend.html', room_list: 'room_list.html'})"` | `onclick="appBack()"` |
| profile_edit.html:41 | `onclick="goBack('profile.html', {room_list: 'room_list.html'})"` | `onclick="appBack()"` |
| room_chat.html:162 | `onclick="goBack('message_center.html', {message_center: 'message_center.html', owner_profile: 'owner_profile.html', square: 'square.html'})"` | `onclick="appBack()"` |
| publish_post_detail.html:192 | `onclick="goBack()"` | `onclick="appBack()"` |

- [ ] **Step 3: publish_post_detail.html 删除本地 goBack 函数（466-472 行）**

删除整段本地函数：

```js
      function goBack() {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          window.location.href = 'publish.html'
        }
      }
```

- [ ] **Step 4: 替换 12 处硬编码返回入口**

| 文件:行 | 新 |
|---|---|
| announcement_detail.html:22 | `onclick="appBack()"` |
| friend_flow.html:35 | `onclick="appBack()"` |
| merchant_shop.html:36 | `onclick="appBack()"` |
| radar_merchant.html:46 | `onclick="appBack()"` |
| radar_friend.html:339 | `onclick="appBack()"` |
| radar_search.html:35 | `onclick="appBack()"` |
| radar_nearby.html:35 | `onclick="appBack()"` |
| group_create.html:105 | `onclick="appBack()"` |
| group_chat.html:369 | `onclick="appBack()"` |
| share_detail.html:64 | `onclick="appBack()"` |
| favorites.html:124 | `<a class="text-white" href="javascript:appBack()">` |
| merchant_contacts.html:73 | `<a class="text-black" href="javascript:appBack()">` |

**保持不动**：`publish.html:521`（`my-back` 是页内视图切换）、`ai_voice.html:174`（吉祥物关闭 AI 面板）。

- [ ] **Step 5: 静态验证无残留**

Run: `node -e "const fs=require('fs'),path=require('path');const dir='www';let bad=[];fs.readdirSync(dir).filter(f=>f.endsWith('.html')).forEach(f=>{const s=fs.readFileSync(path.join(dir,f),'utf8');if(/onclick=\"history\.back\(\)\"/.test(s))bad.push(f+':history.back');if(/onclick=\"goBack\(/.test(s)||/javascript:goBack\(\)/.test(s))bad.push(f+':goBack');});console.log(bad.length?bad:'ok')"`
Expected: `ok`

- [ ] **Step 6: Commit**

```powershell
git add www
git commit -m "refactor: 页内返回按钮统一为 appBack()（45 处）"
```

---

## Task 7: 引导流程与建房流程清历史

**Files:**
- Modify: `www/splash.html:59`、`www/login.html:196,217`、`www/onboarding_interests.html:356,361`、`www/profile_init_resume.html:459`、`www/profile_init_idcard.html:134`、`www/group_create.html:113`

- [ ] **Step 1: splash.html 跳过链接改 replace**

旧：`<a class="skip-btn" href="login.html">跳过</a>`
新：`<a class="skip-btn" href="login.html" onclick="event.preventDefault(); location.replace('login.html')">跳过</a>`

- [ ] **Step 2: login.html 两处进主界面改 replace（196、217 行）**

`window.location.href = 'index.html';` → `window.location.replace('index.html');`（196 行死代码一并处理）

- [ ] **Step 3: onboarding_interests.html 完成/跳过改 replace（356、361 行）**

`window.location.href = 'index.html'` → `window.location.replace('index.html')`（该文件两处相同，replaceAll）

- [ ] **Step 4: profile_init_resume.html:459 改 replace**

`window.location.href = 'index.html'` → `window.location.replace('index.html')`

- [ ] **Step 5: profile_init_idcard.html:134 守卫重定向改 replace**

`window.location.href = 'profile_init_resume.html'` → `window.location.replace('profile_init_resume.html')`

- [ ] **Step 6: group_create.html:113 完成按钮改 replace（替代原 goBack customMap 语义）**

旧：`onclick="window.location.href='group_settings.html?from=group_create'"`
新：`onclick="location.replace('group_settings.html?from=group_create')"`

效果：建房完成进入群设置后，物理返回 / 页内返回直接回消息中心，不再回到创建表单（原 `goBack` 定制映射的等价实现，且不污染历史）。

- [ ] **Step 7: 验证 replace 点**

Run: `node -e "const fs=require('fs');const checks=[['www/splash.html',\"location.replace('login.html')\"],['www/login.html',\"location.replace('index.html')\"],['www/onboarding_interests.html',\"location.replace('index.html')\"],['www/profile_init_resume.html',\"location.replace('index.html')\"],['www/profile_init_idcard.html',\"location.replace('profile_init_resume.html')\"],['www/group_create.html',\"location.replace('group_settings.html?from=group_create')\"]];let bad=[];checks.forEach(([f,s])=>{if(!fs.readFileSync(f,'utf8').includes(s))bad.push(f)});console.log(bad.length?bad:'ok')"`
Expected: `ok`

- [ ] **Step 8: Commit**

```powershell
git add www
git commit -m "feat: 引导/建房流程改 replace 清历史，进入主界面后不再倒回引导页"
```

---

## Task 8: 高频页面浮层注册（第一批）

统一写法：在每页 `back.js` 引入标签之后追加注册脚本；`isOpen` 用现有 class 判定，`close` 调现有函数。注册顺序 = 层级从低到高（后注册先关）。

**Files:**
- Modify: `www/room_list.html`、`www/radar.html`、`www/ai_voice.html`、`www/message_center.html`、`www/profile.html`、`www/group_chat.html`、`www/publish.html`、`www/square.html`、`www/owner_room.html`、`www/owner_profile.html`

- [ ] **Step 1: room_list.html 注册 5 个浮层**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('infoBarModal').classList.contains('hidden'); }, close: closeInfoBarModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('newsDetailModal').classList.contains('hidden'); }, close: closeNewsDetailModal });
    BackLayers.register({ isOpen: function () { return document.getElementById('buildingModal').classList.contains('open'); }, close: closeBuildingModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('createRoomModal').classList.contains('hidden'); }, close: hideCreateRoomModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('addFriendModal').classList.contains('hidden'); }, close: hideAddFriendModal });
</script>
```

- [ ] **Step 2: radar.html 注册 3 个浮层（AI 面板含嵌套优先）**

```html
<script>
    BackLayers.register({ isOpen: function () { return document.getElementById('mapSearch').classList.contains('show'); }, close: toggleMapSearch });
    BackLayers.register({ isOpen: function () { return !document.getElementById('addFriendModal').classList.contains('hidden'); }, close: hideAddFriendModal });
    BackLayers.register({
        isOpen: function () { return document.getElementById('aiSheet').classList.contains('open'); },
        close: function () {
            var frame = document.getElementById('aiSheetFrame');
            try {
                if (frame && frame.contentWindow && typeof frame.contentWindow.__backOverlayClose === 'function'
                    && frame.contentWindow.__backOverlayClose()) return;
            } catch (err) {}
            closeAiSheet();
        }
    });
</script>
```

- [ ] **Step 3: ai_voice.html 注册 plusGrid**

```html
<script>
    BackLayers.register({
        isOpen: function () { return document.getElementById('plusGrid').classList.contains('open'); },
        close: function () { document.getElementById('plusGrid').classList.remove('open'); }
    });
</script>
```

- [ ] **Step 4: message_center.html 注册 2 个浮层**

```html
<script>
    BackLayers.register({ isOpen: function () { return document.getElementById('addFriendModal').classList.contains('open'); }, close: hideAddFriendModal });
    BackLayers.register({ isOpen: function () { return document.getElementById('scanModal').classList.contains('open'); }, close: closeQrScan });
</script>
```

- [ ] **Step 5: profile.html 注册 4 个浮层**

```html
<script>
    BackLayers.register({ isOpen: function () { return document.getElementById('roomActionMenu').classList.contains('show'); }, close: closeRoomProfileMenu });
    BackLayers.register({ isOpen: function () { return !document.getElementById('communityNewsModal').classList.contains('hidden'); }, close: closeCommunityNewsModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('resumeModal').classList.contains('hidden'); }, close: closeResumeModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('idCardModal').classList.contains('hidden'); }, close: closeIDCardModal });
</script>
```

- [ ] **Step 6: group_chat.html 注册成员面板**

```html
<script>
    BackLayers.register({ isOpen: function () { return document.getElementById('memberSheetOverlay').classList.contains('show'); }, close: closeMemberMenu });
</script>
```

- [ ] **Step 7: publish.html 注册商城建设中弹层**

```html
<script>
    BackLayers.register({ isOpen: function () { return document.getElementById('mallBuildingModal').classList.contains('open'); }, close: closeMallBuilding });
</script>
```

- [ ] **Step 8: square.html 注册 4 个浮层 + 两个小修正**

先新增命名关闭函数（放在 `viewImage` 函数附近）：

```js
    function closeImageViewer() {
        document.getElementById('image-viewer').classList.add('hidden');
    }
```

把 `#image-viewer` 内联关闭 `onclick="this.classList.add('hidden')"` 改为 `onclick="closeImageViewer()"`；
把 `#forward-modal`（L967）初始 class 补上 `hidden`（现状疑似默认可见 bug，实施时先目检确认再改）。

追加注册：

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('share-overlay').classList.contains('hidden'); }, close: closeSharePanel });
    BackLayers.register({ isOpen: function () { return !document.getElementById('comment-drawer').classList.contains('translate-y-full'); }, close: closeCommentDrawer });
    BackLayers.register({ isOpen: function () { return !document.getElementById('forward-modal').classList.contains('hidden'); }, close: closeForwardModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('image-viewer').classList.contains('hidden'); }, close: closeImageViewer });
</script>
```

- [ ] **Step 9: owner_room.html 注册加好友弹窗**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('addFriendModal').classList.contains('hidden'); }, close: hideAddFriendModal });
</script>
```

- [ ] **Step 10: owner_profile.html 注册 2 个浮层**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('postModal').classList.contains('hidden'); }, close: closePostModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('friendModal').classList.contains('hidden'); }, close: closeAddFriendModal });
</script>
```

- [ ] **Step 11: 验证注册存在**

Run: `node -e "const fs=require('fs');['room_list','radar','ai_voice','message_center','profile','group_chat','publish','square','owner_room','owner_profile'].forEach(n=>{const s=fs.readFileSync('www/'+n+'.html','utf8');if(!s.includes('BackLayers.register'))throw new Error(n)});console.log('ok')"`
Expected: `ok`

- [ ] **Step 12: Commit**

```powershell
git add www
git commit -m "feat: 高频页面浮层返回优先关闭注册（第一批 10 页）"
```

---

## Task 9: 其余页面浮层注册（第二批）

**Files:**
- Modify: `www/favorites.html`、`www/history_favorites.html`、`www/my_contacts.html`、`www/friend_contacts.html`、`www/radar_search.html`、`www/radar_nearby.html`、`www/merchant_shop.html`、`www/radar_merchant.html`、`www/hot_products_virtual.html`

- [ ] **Step 1: favorites.html**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('resumeModal').classList.contains('hidden'); }, close: closeResumeModal });
</script>
```

- [ ] **Step 2: history_favorites.html**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('infoBar-detail-modal').classList.contains('hidden'); }, close: closeInfoBarDetail });
    BackLayers.register({ isOpen: function () { return !document.getElementById('news-detail-modal').classList.contains('hidden'); }, close: closeNewsDetail });
</script>
```

- [ ] **Step 3: my_contacts.html**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('addGroupModal').classList.contains('hidden'); }, close: closeAddGroupModal });
    BackLayers.register({ isOpen: function () { return !document.getElementById('resumeModal').classList.contains('hidden'); }, close: closeResumeModal });
</script>
```

- [ ] **Step 4: friend_contacts.html**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('resumeModal').classList.contains('hidden'); }, close: closeResume });
</script>
```

- [ ] **Step 5: radar_search.html 与 radar_nearby.html（写法相同）**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('add-friend-modal').classList.contains('hidden'); }, close: closeAddFriendModal });
</script>
```

- [ ] **Step 6: merchant_shop.html**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('detailModal').classList.contains('hidden'); }, close: closeModal });
</script>
```

- [ ] **Step 7: radar_merchant.html**

```html
<script>
    BackLayers.register({ isOpen: function () { return !document.getElementById('productModal').classList.contains('hidden'); }, close: closeModal });
</script>
```

- [ ] **Step 8: hot_products_virtual.html（先抽命名关闭函数再注册）**

在现有 `#drawerClose` / 遮罩监听附近新增命名函数，并把两处匿名关闭改为调用它：

```js
    function closeCategoryDrawer() {
        const drawer = document.getElementById('categoryDrawer');
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
    }
```

追加注册：

```html
<script>
    BackLayers.register({ isOpen: function () { return document.getElementById('categoryDrawer').classList.contains('open'); }, close: closeCategoryDrawer });
</script>
```

- [ ] **Step 9: 全站注册巡检（19 个页面）**

Run: `node -e "const fs=require('fs');['room_list','radar','ai_voice','message_center','profile','group_chat','publish','square','owner_room','owner_profile','favorites','history_favorites','my_contacts','friend_contacts','radar_search','radar_nearby','merchant_shop','radar_merchant','hot_products_virtual'].forEach(n=>{const s=fs.readFileSync('www/'+n+'.html','utf8');if(!s.includes('BackLayers.register'))throw new Error(n)});console.log('ok')"`
Expected: `ok`

- [ ] **Step 10: Commit**

```powershell
git add www
git commit -m "feat: 其余页面浮层返回优先关闭注册（第二批 9 页）"
```

---

## Task 10: 静态巡检脚本 + README

**Files:**
- Create: `scripts/check-back-navigation.js`
- Modify: `package.json`（test 链）
- Modify: `README.md`（返回逻辑说明）

- [ ] **Step 1: 写入巡检脚本**

```js
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const wwwDir = path.join(root, 'www')
const indexFile = path.join(wwwDir, 'index.html')
const mainActivity = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'metasocial',
  'demo',
  'MainActivity.java'
)

const htmlFiles = fs.readdirSync(wwwDir).filter(f => f.endsWith('.html'))
let failures = 0

function fail(name, details) {
  failures++
  console.log('FAIL: ' + name)
  ;(details || []).forEach(d => console.log('  - ' + d))
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

// 1. back.js 注入：除 index.html 外全部页面注入，index.html 不注入
const missingInject = htmlFiles.filter(
  f => f !== 'index.html' && !read(path.join(wwwDir, f)).includes('assets/vendor/back.js')
)
if (missingInject.length) fail('back.js 注入完整性', missingInject)

// 2. 无残留旧返回写法
const legacy = []
for (const f of htmlFiles) {
  const s = read(path.join(wwwDir, f))
  if (/onclick="history\.back\(\)"/.test(s)) legacy.push(f + ': onclick=history.back()')
  if (/javascript:goBack\(\)/.test(s)) legacy.push(f + ': javascript:goBack()')
  if (/goBack\('/.test(s) && f !== 'index.html') legacy.push(f + ': goBack(...)')
}
if (legacy.length) fail('旧返回写法残留', legacy)

// 3. 返回按钮都走 appBack
const backLabelLegacy = []
for (const f of htmlFiles) {
  const s = read(path.join(wwwDir, f))
  if (s.includes('aria-label="返回"') && !s.includes('appBack()')) {
    backLabelLegacy.push(f)
  }
}
if (backLabelLegacy.length) fail('返回按钮未走 appBack', backLabelLegacy)

// 4. 浮层注册完整性
const overlayPages = [
  'room_list', 'radar', 'ai_voice', 'message_center', 'profile', 'group_chat',
  'publish', 'square', 'owner_room', 'owner_profile', 'favorites',
  'history_favorites', 'my_contacts', 'friend_contacts', 'radar_search',
  'radar_nearby', 'merchant_shop', 'radar_merchant', 'hot_products_virtual'
]
const missingRegister = overlayPages.filter(
  n => !read(path.join(wwwDir, n + '.html')).includes('BackLayers.register')
)
if (missingRegister.length) fail('浮层注册缺失', missingRegister)

// 5. 主壳协议
const indexHtml = read(indexFile)
if (!indexHtml.includes('tabStack')) fail('index.html 缺少 tabStack')
if (!indexHtml.includes('window.__appBack')) fail('index.html 缺少 __appBack')
if (indexHtml.includes('frameDepth')) fail('index.html 残留 frameDepth')
if (!indexHtml.includes('location.replace(url)')) fail('index.html Tab 切换未用 replace')

// 6. 原生薄中继
const java = read(mainActivity)
if (java.includes('canGoBack')) fail('MainActivity 残留 canGoBack')
if (!java.includes('__appBack')) fail('MainActivity 缺少 __appBack 协议')
if (!java.includes('moveTaskToBack')) fail('MainActivity 缺少 moveTaskToBack')

// 7. 引导流程 replace
const replacePoints = [
  ['splash.html', "location.replace('login.html')"],
  ['login.html', "location.replace('index.html')"],
  ['onboarding_interests.html', "location.replace('index.html')"],
  ['profile_init_resume.html', "location.replace('index.html')"],
  ['profile_init_idcard.html', "location.replace('profile_init_resume.html')"],
  ['group_create.html', "location.replace('group_settings.html?from=group_create')"]
]
const missingReplace = replacePoints
  .filter(([f, s]) => !read(path.join(wwwDir, f)).includes(s))
  .map(([f]) => f)
if (missingReplace.length) fail('流程 replace 缺失', missingReplace)

if (failures) {
  console.log('Back navigation scan failed: ' + failures)
  process.exit(1)
}
console.log('Back navigation scan passed.')
```

- [ ] **Step 2: 挂到 npm test**

`package.json` 的 scripts：

```json
    "test": "node scripts/check-responsive-layout.js && node scripts/check-back-navigation.js",
```

- [ ] **Step 3: 运行巡检**

Run: `npm test`
Expected: `Responsive layout scan passed.` + `Back navigation scan passed.`

- [ ] **Step 4: README 补充返回逻辑说明**

在「四、常用修改点」表格中新增一行：

```markdown
| 返回键 / 返回按钮逻辑 | `www/assets/vendor/back.js`（浮层注册 / 本地返回）、`www/index.html`（主壳 tabStack 状态机）、`MainActivity.java`（原生中继）；新增浮层时用 `BackLayers.register({ isOpen, close })` 注册 |
```

并在「五、常见坑」追加一条：

```markdown
8. **返回键行为异常** → 检查三处是否同步：页内是否引入 `back.js`（index.html 除外）、主壳 `index.html` 的 `tabStack` 是否被绕过（勿再用 `frame.src = url` 切 Tab，必须走 `navigateTo` 的 `location.replace`）、新增浮层是否漏注册 `BackLayers.register`。`npm test` 会静态巡检这些点。
```

- [ ] **Step 5: Commit**

```powershell
git add scripts/check-back-navigation.js package.json README.md
git commit -m "test: 新增返回导航静态巡检脚本并接入 npm test，README 补充维护说明"
```

---

## Task 11: 浏览器行为验证

**Files:** 无代码改动（发现问题回到对应 Task 修复）

- [ ] **Step 1: 启动 dev server**

Run: `npm run dev`（后台）
Expected: 输出监听 8080 端口

- [ ] **Step 2: 行为断言（dev server 下调用 appBack 模拟物理键）**

用 agent-browser 技能打开 `http://localhost:8080/login.html`，依次执行断言：

1. login 页：`window.appBack()` → 返回 `handled`，页面出现「再按一次退出应用」Toast；立即再次 `window.appBack()` → 返回 `exit`。
2. 打开 `index.html`（壳），等待 iframe 加载完成后：
   - 切到 profile Tab（点击底栏空间）→ `window.appBack()` → iframe 回到 `room_list.html`，底栏高亮回房间。
   - 再 `appBack()` → Toast「再按一次退出应用」；再第二次 → `exit`。
   - 从房间页进入子页链（如 `owner_room.html?u=xiaolu`）→ `appBack()` → 回到 `room_list.html`。
   - 打开 radar Tab → 调 `openAiSheet()` → `appBack()` → `#aiSheet` 关闭、iframe 仍为 radar；再 `appBack()` → 回房间 Tab。
   - 打开 radar 加好友弹窗 → `appBack()` → 弹窗关闭。
3. `room_list.html` 直接载入（iframe 内）：`openBuildingModal()` → `appBack()` → 弹窗关闭且底栏遮罩取消（`dimBottomNav` 副作用复位）。
4. 控制台无未捕获异常（每步检查 `console` 错误为空）。

Expected: 全部断言通过；若失败，记录复现路径并修复后重跑。

- [ ] **Step 3: 停止 dev server**

---

## Task 12: 构建 APK + 真机回归

**Files:** 无代码改动；产出验证记录

- [ ] **Step 1: 同步并构建**

```powershell
npx cap sync android
$env:JAVA_HOME = "C:\Android\jdk\jdk-21.0.12+8"
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
Set-Location D:\android-demo\android
.\gradlew.bat assembleRelease
```

Expected: `BUILD SUCCESSFUL`，产物 `android\app\build\outputs\apk\release\app-release.apk`

- [ ] **Step 2: 检查设备并安装**

Run: `& "C:\Android\Sdk\platform-tools\adb.exe" devices`
若在线：`& "C:\Android\Sdk\platform-tools\adb.exe" install -r "D:\android-demo\android\app\build\outputs\apk\release\app-release.apk"`
若无线：后续真机步骤标记为 BLOCKED，本次交付以 browser 验证 + APK 为准，并向用户报告。

- [ ] **Step 3: 真机返回键回归（`adb shell input keyevent 4`，关键步骤 `screencap` 存证）**

| # | 路径 | 操作 | 预期 |
|---|---|---|---|
| 1 | splash → 跳过 → login | 按返回 | Toast「再按一次退出应用」；2 秒内再按 → 回桌面 |
| 2 | 重新进入 → login 登录 → 引导 | login 弹窗出现后按返回 | 回 login（或真机当前链的上一引导页） |
| 3 | onboarding_interests 完成 → 主界面房间 Tab | 按返回 | Toast；再按回桌面 |
| 4 | 主界面切到"空间"Tab | 按返回 | 切回"房间"Tab；再按 → Toast；再按 → 桌面 |
| 5 | 房间列表→他人房间→信息中心 | 连按返回 | 逐级回退（信息中心→他人房间→房间列表），各级页面状态保留 |
| 6 | 雷达 → 点吉祥物开 AI 面板 | 按返回 | AI 面板关闭，仍在雷达；再按 → 房间 Tab |
| 7 | 雷达 → 加好友弹窗 / 地图搜索展开 | 按返回 | 弹窗/搜索框关闭 |
| 8 | 房间列表 → 建设中弹层 | 按返回 | 弹层关闭且底栏遮罩恢复 |
| 9 | 发布页商城弹层 / 广场弹层与图片预览 | 按返回 | 浮层关闭，页面不跳转 |
| 10 | 页内返回按钮抽查（房间列表/聊天/个人中心/他人房间） | 点击按钮 | 与物理键行为一致 |
| 11 | 进入主界面后任意按返回 | 多次 | 绝不回到 login/引导页 |

Expected: 全部通过；截图归档到 `docs/`（沿用既有习惯），失败项修复后重跑。

- [ ] **Step 4: 回归底栏与滑动**

验证底栏 5 Tab 切换、左右滑动切 Tab、页面正常跳转均不回归。

- [ ] **Step 5: 最终提交**

```powershell
git add -A
git commit -m "test: 真机返回键全路径回归记录 + 构建交付 APK"
```

---

## 自审记录

- **规格覆盖**：L1 浮层（Task 8/9）、L2 子页回退（Task 4/6）、L3 Tab 归位（Task 4）、L4 双击退出（Task 1/4）、L5 引导清历史（Task 7）、L6 兜底（Task 1/5）、页内按钮统一（Task 6）、原生薄中继（Task 5）、验证（Task 10/11/12），全覆盖。
- **命名一致性**：`BackLayers.register / closeTop`、`appBack / __appBack / __backOverlayClose / __pageCustomBack`、`tabStack / currentTab / navigateTo / onFrameLoad` 在 Task 1/3/4/8/9/10 中用法一致。
- **已知偏差**：规格中"特殊返回流程用 handle() 注册"改为更干净的实现——`group_create` 完成按钮用 `location.replace` 消除创建页历史，`runCustom` 钩子仍保留备用（当前无注册方）。
- **遗留问题（不在本次范围）**：`profile_edit.html:135` 的 `getReturnUrl()` 未定义（点击保存抛 ReferenceError）、`square.html#forward-modal` 初始可见疑似 bug（Task 8 Step 8 顺带确认修复）。
