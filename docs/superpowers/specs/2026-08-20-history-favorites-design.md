# 历史记录与收藏页面 设计文档

## 背景

客户需要将 `index.html` 底部导航栏"设置"Tab 对应的页面（当前为 `announcements.html` 公告页）改为一个展示**历史记录**和**收藏**的页面，统一汇集三类来源的内容：

1. **分享内容**（来自 `publish.html` 动态详情）
2. **信息栏弹窗内容**（来自 `room_list.html` 信息栏新闻详情）
3. **社区新闻内容**（来自 `profile.html` 社区新闻网格）

## 用户决策

- **展示策略**：按来源分 Tab，不混合展示。每个来源使用各自原页面的卡片样式与详情弹窗，避免结构不一致的问题。
- **社区新闻**：当前 `profile.html` 社区新闻为"建设中"占位，一并实现真实新闻数据 + 详情弹窗 + 埋点 + 收藏。
- **点击行为**：在历史记录/收藏页面内直接弹出详情（复用原页面详情弹窗样式），不跳转回原页面。

## 页面结构（history_favorites.html）

```
┌────────────────────────────────────┐
│  一级 Tab：历史记录 | 收藏          │
├────────────────────────────────────┤
│  二级 Tab：分享 | 信息栏 | 社区新闻  │
├────────────────────────────────────┤
│                                    │
│  内容列表（按来源使用对应样式）       │
│                                    │
└────────────────────────────────────┘
  + 三种详情弹窗（页内弹出，不跳转）
```

## 数据层设计（history-favorites.js）

复用项目已有的 `localStorage` 模式（参考 `profile_init_resume.html` 的 `appUserProfile`）。

### 存储结构

保留各来源原始完整数据，不强制统一结构：

```javascript
// localStorage['appHistory'] 和 ['appFavorites']
{
  id,        // 唯一标识（按来源生成）
  source,    // 'share' | 'infoBar' | 'communityNews'
  data,      // 原始完整数据（各来源结构不同，原样保存）
  timestamp  // 记录时间（收藏用 favoritedAt）
}
```

### API

```javascript
const HistoryFavorites = {
  addHistory(item)           // 去重（同 id+source），最新在前，限 100 条
  toggleFavorite(item)       // 切换收藏，返回布尔
  isFavorited(id, source)    // 判断是否已收藏
  getHistory(source)         // 按 source 过滤
  getFavorites(source)       // 按 source 过滤
  removeFavorite(id, source) // 移除收藏
  clearHistory(source)       // 清空历史（可按来源）
}
```

各页面引入 `<script src="assets/vendor/history-favorites.js"></script>` 并调用对应方法。

## 各来源数据与样式

| 来源 | 列表样式 | 详情弹窗 |
|------|----------|----------|
| 分享（share） | 2 列瀑布流，缩略图 + 标题（同 publish.html feed-grid） | 大图 + 作者 + 正文 + 标签 + 评论（同 publish.html detail-modal） |
| 信息栏（infoBar） | 2 列竖向长方形卡片（同 room_list.html news-item） | 图片轮播 + 描述（同 room_list.html newsDetailModal） |
| 社区新闻（communityNews） | 3 列网格（同 profile.html newsList） | 图片 + 标题 + 正文（新建简版） |

## 各原页面改造点

| 文件 | 改造内容 |
|------|----------|
| `publish.html` | 引入公共工具；`openDetail(index)` 调用 `addHistory()`；详情弹窗内加"收藏"按钮，状态随 `isFavorited` 初始化 |
| `room_list.html` | 引入公共工具；`showNewsDetail()` 调用 `addHistory()`；详情弹窗内加"收藏"按钮 |
| `profile.html` | 社区新闻网格：① 添加真实新闻数据 ② 点击打开新建详情弹窗 ③ 调用 `addHistory()` ④ 详情弹窗加"收藏"按钮；房间菜单已有"收藏"按钮接入存储 |
| `index.html` | 设置 Tab 跳转 `announcements.html` → `history_favorites.html` |

## ID 生成规则

- 分享：`'share_' + index`（feedData 索引）
- 信息栏：`'infoBar_' + category + '_' + title`
- 社区新闻：`'communityNews_' + item.id`

## 实现顺序

1. 新建 `assets/vendor/history-favorites.js`
2. 改造 `profile.html`（社区新闻数据 + 详情弹窗 + 埋点 + 收藏）
3. 改造 `publish.html`（埋点 + 收藏按钮）
4. 改造 `room_list.html`（埋点 + 收藏按钮）
5. 新建 `history_favorites.html`（三种列表 + 三种详情弹窗 + 页内弹出）
6. 修改 `index.html`（设置 Tab 跳转）
7. 测试验证

## 影响范围

- **新增文件**：`www/history_favorites.html`、`www/assets/vendor/history-favorites.js`
- **修改文件**：`www/index.html`、`www/publish.html`、`www/room_list.html`、`www/profile.html`
- **保留**：`www/announcements.html` 不删除，仍可从消息中心入口访问
