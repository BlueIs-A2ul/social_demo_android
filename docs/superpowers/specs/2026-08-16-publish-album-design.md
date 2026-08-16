# 发布页「从相册选择」功能设计

日期：2026-08-16
分支：`feature/publish-album-select`

## 背景

`www/publish.html` 的发布弹窗（`#publish-sheet`）含「从相册选择 / 相机 / 写文字」三个选项，目前 `selectPublishOption('album')` 仅显示 toast「将在正式版开放」。本设计实现「从相册选择」的真实功能。

## 方案（已确认：方案 A）

使用隐藏的 `<input type="file" accept="image/*" multiple>`，点击「从相册选择」时触发 `click()`。Capacitor 的 Android WebView 原生支持 file input，会调起系统相册/文件选择器并支持多选。零依赖、无网络安装、与项目纯 HTML 架构一致。

## 功能行为

1. **选图**：点击「从相册选择」→ 隐藏 file input 触发 → 系统相册选择（支持多选）
2. **多选限制**：最多 9 张，超出部分截断并 toast 提示；非图片文件过滤
3. **发布编辑界面**：新增全屏弹窗 `#compose-modal`（复用现有弹窗模式）
   - 顶部栏：取消 | 「发布动态」| 发布按钮
   - 图片九宫格（3 列）：所选图片预览，每张右上角 ✕ 可删除；未满 9 张时末尾显示「+」继续添加
   - 文字输入：textarea，上限 500 字
4. **发布**：toast「发布成功」→ 关闭弹窗、清空所选（revokeObjectURL 防泄漏）
5. **取消/关闭**：清空选择状态

## 数据流

`input change` → `FileList` → 过滤/截断 → `selectedFiles`（存 `{file, url}`，url 为 `URL.createObjectURL`）→ 渲染九宫格 → 发布/删除时 `revokeObjectURL` 清理

## 错误处理

- 非图片文件：过滤丢弃
- 超过 9 张：截断 + toast「最多选择 9 张图片」
- 重复选择同一文件：`e.target.value = ''` 重置，允许再次选择

## 改动范围

仅 `www/publish.html`（HTML + 内联 JS/CSS）。不新增依赖、不动原生工程。

## 测试

- `npm test`（响应式扫描）通过
- dev server 目检：选图、多选、删除、发布流程
- `cap sync android` + `gradlew assembleDebug` 打包；真机相册调起行为需装机验证
