# Demo 闭合清单

> 目标：把当前静态 HTML 原型整理成一套可给客户顺畅演示的 Demo。重点不是补齐真实业务逻辑，而是让客户能按固定路线点击、理解产品能力，并且不看到坏链接、空白页、早期占位文案或逻辑断点。

## 一、演示原则

1. `index.html` 作为唯一演示入口。
2. 底部导航承载五个主模块：房间、空间、雷达、分享、公告。
3. 重要按钮必须有去处：能跳页面就跳页面，不能实现就给自然反馈。
4. 不在 Demo 中解释的功能不强行做完整，只保留展示状态或轻提示。
5. 不出现客户容易出戏的字样：原型、测试、占位、用户xxxx、提示消息。
6. 不跳到已删除页面，不跳到旧的 modao 原型地址。

## 二、推荐客户演示主线

### 主线 1：登录进入首页

入口：`login.html`

演示动作：

1. 展示登录页的 App 图标和手机号登录。
2. 点击本机号码一键登录。
3. 进入 `index.html`，默认展示雷达首页。

需要闭合：

- `login.html` 的主登录按钮应稳定跳转 `index.html`。
- 其他登录入口如果不做完整注册流程，只显示自然提示，不跳已删除页面。

### 主线 2：雷达发现附近用户

入口：`index.html` 底部雷达按钮，内容页为 `radar.html`

演示动作：

1. 展示雷达扫描和推荐用户。
2. 点击“附近的人”进入 `radar_nearby.html`。
3. 展开虚拟身份证。
4. 点击添加好友，弹出申请框并发送。

需要闭合：

- `radar.html` 中搜索入口不跳不存在页面，可保留输入框展示或提示“搜索功能将在正式版开放”。
- 用户卡片点击“查看详情”如果不做详情页，应改为打开虚拟身份证或给明确提示。
- `radar_nearby.html` 返回按钮在 iframe 内可能回退不稳定，建议改为返回 `radar.html`。

### 主线 3：附近朋友进入房间和分享

入口：`radar_friend.html`

演示动作：

1. 展示附近朋友头像、生活图文、房间动态。
2. 点击虚拟身份证展开身份信息。
3. 点击进入房间到 `panorama_room.html`。
4. 返回后点击进入分享到 `publish.html`。

需要闭合：

- `radar_friend.html` 的“进入房间”和“进入分享”已经有明确页面，可作为 Demo 重点。
- 图片/视频卡片若没有真实播放，只显示轻提示即可，不要出现“已打开”这种默认文案。
- 返回策略建议统一：从全景房间返回上一页，或返回 `index.html` 的雷达模块。

### 主线 4：我的房间进入全景房间

入口：`index.html` 底部房间按钮，内容页为 `room_list.html`

演示动作：

1. 展示我的房间列表。
2. 展示“娜美的房间”“我的播客”等房间卡片。
3. 点击房间进入 `panorama_room.html`。
4. 展示全景房间背景和顶部操作。

需要闭合：

- `room_list.html` 当前房间卡片大多只是 toast，建议至少第一张和“娜美的房间”跳到 `panorama_room.html`。
- 访客动态里的“查看用户详情”建议改成展开虚拟身份证，不要只弹泛提示。
- `panorama_room.html` 的视频/连线按钮如果不做功能，应保留按钮但不弹空 toast。

### 主线 5：社区空间到分享主页

入口：`index.html` 底部空间按钮或 `square.html`

演示动作：

1. 展示社区空间推荐流。
2. 点击用户头像/昵称进入 `owner_profile.html`。
3. 点击分享、评论、转发等基础交互。
4. 从分享面板进入私信 `room_chat.html`。

需要闭合：

- `square.html` 发布入口现在不跳已删除页面，后续可决定是否跳 `publish.html` 或保持展示。
- 分享面板、评论抽屉、图片预览属于可以演示的亮点，应保持可打开可关闭。
- 动态作者已经替换成昵称，后续继续保持生活化命名。

### 主线 6：个人分享主页与作品详情

入口：`index.html` 底部分享按钮，内容页为 `publish.html`

演示动作：

1. 展示约翰逊分享主页。
2. 切换“主页 / 发现”。
3. 点击作品打开详情弹窗。
4. 发表评论显示反馈。

需要闭合：

- `publish.html` 详情弹窗应默认关闭，只在点击作品时打开。
- 顶部搜索、菜单、更换封面如果不做真实功能，应尽量不弹多余 toast，避免影响演示节奏。
- “关注、同城、附近人”顶部导航如果不是当前重点，可保持跳转到已有页面或静态展示。

### 主线 7：消息中心到群聊和群设置

入口：建议从 `index.html` 增加或明确一个消息中心入口；当前页面为 `message_center.html`

演示动作：

1. 展示消息中心的最近聊天、群聊、分类联系人。
2. 点击群聊进入 `group_chat.html`。
3. 点击群设置入口进入 `group_settings.html`。
4. 展示管理员、家人、朋友、兴趣伙伴分类。

需要闭合：

- 当前底部导航没有直接进入 `message_center.html`，但客户需求里群聊是重点，建议在 Demo 里给一个可见入口。
- 可以把 `index.html` 的公告或分享入口旁增加消息入口，或在公告页中放“进入消息中心”。
- `group_create.html` 的完成提示已适合改成“群组已创建”，后续可跳到 `group_settings.html` 或 `message_center.html`。

### 主线 8：商家通讯录到商家主页

入口：`merchant_contacts.html` 或 `radar_merchant.html`

演示动作：

1. 展示商家通讯录里的商家 VIP。
2. 点击进店进入 `owner_profile.html` 或商家主页。
3. 展示 `merchant_shop.html` 商品列表和详情弹窗。
4. 展示 `hot_products_virtual.html` 虚拟空间商品瀑布流和分类抽屉。

需要闭合：

- 商家主线目前入口分散，建议选一个主入口：`radar_merchant.html` 或 `merchant_contacts.html`。
- 如果客户重点看商家商品，应让“进店逛逛”进入 `merchant_shop.html`，不要跳个人主页。
- 商家身份后续应从“虚拟身份证”改成“商家认证”，这项之前已确认暂时搁置。

## 三、页面级闭合表

| 页面 | Demo 定位 | 当前入口 | 当前出口 | 建议修补 |
|---|---|---|---|---|
| `login.html` | 登录入口 | 直接打开 | `index.html` | 保持一键登录；其他登录只提示，不跳缺失页 |
| `index.html` | Demo 主壳 | 登录后进入 | 底部五个模块 | 确认五个 iframe 页面都能稳定加载 |
| `radar.html` | 雷达首页 | 底部雷达 | `radar_nearby.html` | 搜索入口静态化；推荐用户可展开身份或加好友 |
| `radar_nearby.html` | 附近的人 | 雷达首页 | 返回/申请好友 | 返回改固定跳 `radar.html`；卡片点击改身份展开 |
| `radar_friend.html` | 附近朋友 | 可从雷达入口补入 | `panorama_room.html` / `publish.html` | 可作为重点演示页，建议在 `radar.html` 增加入口 |
| `radar_merchant.html` | 附近商家 | 可从雷达入口补入 | 商家主页/商品 | 建议在 `radar.html` 增加入口 |
| `room_list.html` | 我的房间 | 底部房间 | 目前多为 toast | 房间卡片跳 `panorama_room.html`；访客详情展开身份 |
| `panorama_room.html` | 全景房间 | 房间/朋友页进入 | 返回 | 顶部按钮不弹空提示；返回逻辑统一 |
| `square.html` | 社区空间 | 可作为空间模块 | `owner_profile.html` / `room_chat.html` | 保持互动抽屉；发布入口暂不跳缺失页面 |
| `publish.html` | 分享主页 | 底部分享 | `profile.html` / 详情弹窗 | 默认不弹详情；主页/发现切换保留 |
| `profile.html` | 当前用户主页 | 分享页头像/底部空间 | `profile_edit.html` | 头像浮层和房间浮层可演示 |
| `profile_edit.html` | 资料编辑 | 个人主页 | 返回个人主页 | 保存后回 `profile.html` |
| `owner_profile.html` | 他人主页 | 社区/商家通讯录 | `room_chat.html` / `panorama_room.html` | 若作为商家页使用，后续需统一商家文案 |
| `room_chat.html` | 私聊 | 社区分享/消息 | 返回 | 可展示生活化聊天，无需复杂逻辑 |
| `message_center.html` | 消息中心 | 暂无主入口 | `group_chat.html` / `group_settings.html` | 建议补入主导航或公告入口 |
| `group_chat.html` | 群聊 | 消息中心 | `group_settings.html` | 保持生活化聊天内容 |
| `group_settings.html` | 群设置 | 群聊/消息中心 | 返回 | 添加成员、编辑分类给自然提示 |
| `group_create.html` | 创建群组 | 暂无主入口 | 当前为提示 | 完成后建议跳 `group_settings.html` |
| `my_contacts.html` | 我的通讯录 | 暂无主入口 | 房间/简历/身份 | 外部旧链接需改本地 `room_list.html` |
| `friend_contacts.html` | 好友通讯录 | 暂无主入口 | 房间/简历/身份 | 外部旧链接需改本地 `room_list.html` |
| `friend_flow.html` | 好友申请 | 可从公告/雷达进入 | 返回 | 可作为好友申请补充页 |
| `merchant_contacts.html` | 商家通讯录 | 暂无主入口 | `owner_profile.html` | 建议进店改 `merchant_shop.html` |
| `merchant_shop.html` | 商家商品主页 | 商家通讯录 | 商品弹窗 | 保持详情弹窗和购物反馈 |
| `hot_products_virtual.html` | 虚拟商品商城 | 暂无主入口 | 分类抽屉 | 可从商家/商品主线进入 |
| `announcements.html` | 公告中心 | 底部公告 | `announcement_detail.html` | 可补消息中心入口 |
| `announcement_detail.html` | 公告详情 | 公告中心 | `panorama_room.html` | 保持进入房间按钮 |
| `onboarding_gender.html` | 新用户引导 | 暂无主线入口 | `onboarding_birth.html` | Demo 可不展示，除非从首次登录进入 |
| `onboarding_birth.html` | 出生年份引导 | 引导流程 | `onboarding_interests.html` | Demo 可不展示 |
| `onboarding_interests.html` | 兴趣选择引导 | 引导流程 | 待补出口 | 若展示引导，需要补“完成进入首页” |

## 四、建议实施顺序

### 第一批：修掉演示硬断点

1. 所有已删除页面入口保持清零。
2. 所有外部旧原型链接改为本地页面。
3. `publish.html`、弹窗、toast 默认状态保持干净。
4. iframe 内返回按钮统一为明确页面跳转，避免浏览器历史不可控。

### 第二批：补主线入口

1. 在 `radar.html` 增加进入“附近朋友”和“附近商家”的入口。
2. 在 `index.html` 或某个主模块里补 `message_center.html` 入口。
3. 商家链路确认：`merchant_contacts.html` / `radar_merchant.html` 到 `merchant_shop.html`。

### 第三批：把重要按钮变成可演示行为

1. 房间卡片进入 `panorama_room.html`。
2. 联系人/好友通讯录的“进入房间”使用本地 `room_list.html` 或 `panorama_room.html`。
3. `group_create.html` 完成后跳 `group_settings.html`。
4. 不做真实功能的按钮统一轻提示。

### 第四批：统一演示文案

1. 用户昵称保持生活化。
2. 不出现“原型、测试、占位、提示消息”。
3. 个人页和商家页身份文案后续再统一。

## 五、暂不建议本轮处理的内容

1. 不把所有 HTML 重构成 React/Vue。
2. 不接后端，也不做真实登录/发布/支付。
3. 不补完整注册页，除非客户明确要看注册流程。
4. 不强行让所有 29 个页面都进入主线，先保证核心 8 条主线顺。
5. 商家认证和个人虚拟身份证的文案差异可以下一轮单独修。

## 六、验收标准

1. 从 `login.html` 或 `index.html` 开始，客户能连续演示 5 分钟以上不中断。
2. 点击主要按钮不会进入 404、空白页或已删除页面。
3. 默认打开页面时没有异常弹窗。
4. 重要弹窗可打开、可关闭。
5. 页面文案不出现明显早期残留。
6. 打包给客户后，本地图片能正常显示。

