# Godot 3D 房间嵌入现有 App — 实施方案（Demo）

> 状态：待客户确认
> 日期：2026-08-01
> 范围：Demo 级别，1 个房间

---

## 一、背景与目标

当前「我的房间」的展示是假 3D：`www/panorama_room.html` 用一张静态图（`房间建模图片1.png`）+ CSS 缓慢平移动画模拟全景，不是真正的 3D 可交互空间。

目标：用 [Godot-Virtual-Showroom](https://github.com/Onepear839/Godot-Virtual-Showroom)（MIT 协议，同事自研）的技术，把「我的房间」升级为**真 3D 可交互房间**（第一人称行走 + 视线热点弹详情面板）。

硬性要求（客户）：
1. **移动端优先**，所有交互按手机触控设计
2. **进入房间横屏展示**，退出恢复竖屏
3. 其余页面（聊天、雷达、商城等 30 页）**零改动**

## 二、技术路线

**Route A（选定）：Godot Web 导出嵌入现有 WebView**

```
Godot 仓库工程 → 导出 Web(WASM) → 嵌入 panorama_room.html 的 iframe
→ 现有 Capacitor 打包流水线 → APK
```

| 路线 | 做法 | 结论 |
|---|---|---|
| **A. 嵌入现有 App（选定）** | Godot 导出 WASM，塞进 `panorama_room.html`，体验最完整 | 4~6 人天 |
| B. 独立 Godot APK | 仓库原样导出，从房间列表 intent 拉起另一个 App | 1~2 天，但体验割裂 |
| C. Godot 原生 View 嵌入 | Godot Android 插件把引擎嵌进 Capacitor Activity | Godot 4 无官方嵌入 API，不推荐 |

## 三、移动端 + 横屏适配（重点）

### 现状
- `AndroidManifest.xml` 全局锁竖屏
- 社交页均为 393px 竖屏布局，**不能整 App 转横**

### 方案：按页面动态切横竖屏
1. **屏幕方向控制能力**（二选一）：
   - 首选：装 `@capacitor-community/screen-orientation`（npm → `cap sync` 生成原生代码）
   - 兜底：若与 Capacitor 8 不兼容，写 ~40 行 Java 自定义插件（调 `setRequestedOrientation`，无外部依赖）
2. **`panorama_room.html` 逻辑**：
   - 页面加载（`onload`）→ 锁 `landscape`
   - 离开（返回按钮 / `unload`）→ 锁回 `portrait`
3. **Godot 工程侧**：
   - 按横屏比例重设 viewport 与 canvas 拉伸模式，保证横屏构图完整
   - 移动端控制（左虚拟摇杆 + 右拖拽视角 + 点击交互 + 圆形返回键）仓库已实现，直接复用
   - 顶部悬浮栏在横屏下收窄成细条，适配刘海屏左右安全区
4. **桌面预览**仍走 WASD + 鼠标，横竖屏逻辑只作用于移动端

## 四、工作分解

| 阶段 | 内容 | 人天 |
|---|---|---|
| 0 | 装 Godot 4.7 + Web 导出模板；克隆仓库 | 0.5~1 |
| 1 | 桌面跑通仓库原样（WASD + 热点弹详情） | 0.5 |
| 2 | 场景改造：复制仓库美术馆风格，换 1 个房间内容（贴图/热点/文案，不做霓虹化） | 1~2 |
| 3 | 横屏插件接入 + `panorama_room.html` 嵌入 iframe + 返回链 postMessage | 1 |
| 4 | Godot Web 导出（单线程，关 COOP/COEP 依赖） | 0.5 |
| 5 | `cap sync` + `assembleDebug` + 真机横竖屏验证 | 0.5~1 |
| **合计** | | **约 4~6 人天** |

## 五、已确认的决策

- 形态：嵌入现有 App（Route A）
- 范围：先做 1 个房间
- 内容：完全复制/改造仓库（源码自有，无版权顾虑）
- 风格：**参照仓库具体风格**（美术馆/展厅风），不预设、不做霓虹化
- 词汇清理：已清理全项目「赛博/霓虹/cyber/neon」共 11 处（`radar_merchant.html`、`merchant_shop.html`、`hot_products_virtual.html`、`panorama_room.html`）

## 六、风险与回退

1. **WebView 内 WebGL 单线程性能** → 简单房间 30fps 可达；跑不动则回退 Route B（Godot 原生 APK，横屏无碍，+1~2 天）
2. **横屏插件兼容问题** → 兜底：自定义 40 行 Java 插件
3. **返回链路 / 横竖屏切换偶发闪屏** → 真机多测几台，演示固定一台设备
4. **APK 体积** → 预计 +25~40MB（WASM + 资源），demo 可接受

## 七、交付物

- `android\app\build\outputs\apk\debug\app-debug.apk`（现有流水线产物）
- 房间 3D 工程（Godot 工程目录 + Web 导出产物在 `www/assets/godot-room/`）
- 本方案文档 + 改造说明

## 八、后续扩展（非本次范围）

- 剩余 3 个房间（娜美的房间 / 直播间 / 我的播客）的 3D 化
- 房间内商品橱窗热点、聊天/通话入口
- 真 3D 建模或扫描的写实还原（周期数周起）
