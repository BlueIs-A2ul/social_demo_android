/**
 * 历史记录与收藏公共工具
 * 统一管理三类来源（share / infoBar / communityNews）的浏览历史与收藏
 * 数据为预设写死，用户操作不修改底层数据
 */
(function (window) {
  'use strict';

  var now = Date.now();
  var hour = 3600000;
  var day = 86400000;

  // ============ 预设历史记录数据 ============
  var presetHistory = [
    // share 来源
    {
      id: 'share_8',
      source: 'share',
      data: {
        title: '力量美学｜健美×摄影专题',
        img: 'assets/new_src/分享图片内容/微信图片_20260815164441.jpg',
        author: '<span class="font-semibold">运动美学</span>',
        authorAvatar: 'assets/packaged/sq/微信图片_20260727180857.jpg',
        time: '3小时前',
        desc: '探索力量与美的完美结合',
        body: '当健美遇上摄影，肌肉线条在光影中呈现出独特的艺术美感。本期专题精选了12组健美摄影作品，从古典雕塑风格到现代极简主义，带你领略力量美学的无限可能。',
        tags: ['健美', '摄影', '力量美学'],
      },
      timestamp: now - 2 * hour,
    },
    {
      id: 'share_9',
      source: 'share',
      data: {
        title: '训练日常｜镜头不会说谎',
        img: 'assets/new_src/分享图片内容/微信图片_20260815164438.jpg',
        author: '<span class="font-semibold">健身日记</span>',
        authorAvatar: 'assets/packaged/a360e987b470405b93134ddbf8e0e7c2.png',
        time: '5小时前',
        desc: '记录每一次训练的真实瞬间',
        body: '镜头不会说谎，汗水不会骗人。这里记录了我三个月的训练日常，从最初的气喘吁吁到现在的游刃有余，每一滴汗水都是成长的见证。',
        tags: ['健身', '日常', '训练'],
      },
      timestamp: now - 5 * hour,
    },
    {
      id: 'share_0',
      source: 'share',
      data: {
        title: '明星美女写真',
        img: 'assets/src_01/分享图片/明星美女写真.jpg',
      },
      timestamp: now - 1 * day,
    },
    {
      id: 'share_1',
      source: 'share',
      data: {
        title: '武当云溪户外人像',
        img: 'assets/src_01/分享图片/武当云溪户外人像.jpg',
      },
      timestamp: now - 2 * day,
    },

    // communityNews 来源
    {
      id: 'communityNews_cn_1',
      source: 'communityNews',
      data: {
        title: '社区年度设计大赛开启',
        desc: '社区公告 · 2小时前',
        image: 'assets/products/space-living-room.jpg',
        body: '一年一度的社区设计大赛正式拉开帷幕！本届大赛以「未来居住空间」为主题，邀请所有社区成员参与创作。参赛作品将由专业评审团和社区投票共同评选，优胜者将获得丰厚奖品和社区荣誉勋章。',
      },
      timestamp: now - 2 * hour,
    },
    {
      id: 'communityNews_cn_3',
      source: 'communityNews',
      data: {
        title: '装饰指南：打造你的 Dream Room',
        desc: '内容精选 · 昨天',
        image: 'assets/products/space-furniture.jpg',
        body: '从灯光到家具到特效，手把手教你打造理想房间。本篇涵盖三层布光法则、软装搭配比例、粒子特效的克制使用三个核心模块，并附有12个实战案例拆解。',
      },
      timestamp: now - 1 * day,
    },
    {
      id: 'communityNews_cn_5',
      source: 'communityNews',
      data: {
        title: '邻里夜话：聊聊你的治愈角落',
        desc: '社区话题 · 3天前',
        image: 'assets/products/space-lighting.jpg',
        body: '每个人都有一个属于自己的治愈角落，可能是一把舒适的椅子，一盏温暖的灯，或者一个摆满回忆的书架。欢迎分享你的治愈空间故事。',
      },
      timestamp: now - 3 * day,
    },

    // infoBar 来源
    {
      id: 'infoBar_招聘_程序员招聘',
      source: 'infoBar',
      data: {
        title: '程序员招聘',
        desc: '前端开发，3年经验，薪资面议',
        images: ['assets/packaged/d51ada3793fa4999ba92c028ae4313f7.png'],
        category: '招聘',
      },
      timestamp: now - 3 * hour,
    },
    {
      id: 'infoBar_兼职_周末兼职',
      source: 'infoBar',
      data: {
        title: '周末兼职',
        desc: '商场促销员，日薪200元',
        images: ['assets/packaged/d51ada3793fa4999ba92c028ae4313f7.png'],
        category: '兼职',
      },
      timestamp: now - 1 * day,
    },
    {
      id: 'infoBar_通知_职位通知',
      source: 'infoBar',
      data: {
        title: '职位通知',
        desc: '您投递的简历已被查看',
        images: ['assets/packaged/d51ada3793fa4999ba92c028ae4313f7.png'],
        category: '通知',
      },
      timestamp: now - 2 * day,
    },
  ];

  // ============ 预设收藏数据 ============
  var presetFavorites = [
    // share 来源
    {
      id: 'share_2',
      source: 'share',
      data: {
        title: '珠宝展示搭配美学',
        img: 'assets/src_01/分享图片/珠宝展示搭配美学.jpg',
      },
      favoritedAt: now - 1 * hour,
    },
    {
      id: 'share_3',
      source: 'share',
      data: {
        title: '运动女孩夜景人像',
        img: 'assets/src_01/分享图片/运动女孩夜景人像.jpg',
      },
      favoritedAt: now - 1 * day,
    },

    // communityNews 来源（含房间收藏）
    {
      id: 'communityNews_cn_2',
      source: 'communityNews',
      data: {
        title: '新晋商家入驻：蓝鹊咖啡',
        desc: '商家动态 · 5小时前',
        image: 'assets/shops/shop-coffee-corner.png',
        body: '欢迎新商家「蓝鹊咖啡」正式入驻社区！咖啡馆位于虚拟街区B栋一层，提供手冲咖啡、甜点轻食，欢迎邻居们前来品尝。',
      },
      favoritedAt: now - 2 * hour,
    },
    {
      id: 'communityNews_cn_4',
      source: 'communityNews',
      data: {
        title: '数字藏品上新：极简古典画框',
        desc: '藏品资讯 · 2天前',
        image: 'assets/packaged/sq/OIP-C.webp',
        body: '全新数字藏品「极简古典画框」现已上线，限量发售500份。古典工艺与现代设计的完美融合，为你的虚拟空间增添艺术气息。',
      },
      favoritedAt: now - 2 * day,
    },
    {
      id: 'room_V1122',
      source: 'communityNews',
      data: {
        kind: 'room',
        title: '王爷府的房间',
        desc: '喜欢在虚拟空间里构建有故事的场景',
        image: 'assets/packaged/sq/微信图片_20260727180857.jpg',
        body: '游戏策划 · 在职\n喜欢在虚拟空间里构建有故事的场景',
      },
      favoritedAt: now - 3 * day,
    },
    {
      id: 'room_V2211',
      source: 'communityNews',
      data: {
        kind: 'room',
        title: '小美的房间',
        desc: '用画笔记录虚拟世界的美好瞬间',
        image: 'assets/packaged/a360e987b470405b93134ddbf8e0e7c2.png',
        body: '插画师 · 在职\n用画笔记录虚拟世界的美好瞬间',
      },
      favoritedAt: now - 5 * day,
    },

    // infoBar 来源
    {
      id: 'infoBar_零工_快递分拣',
      source: 'infoBar',
      data: {
        title: '快递分拣',
        desc: '夜班分拣，时薪35元',
        images: ['assets/packaged/d51ada3793fa4999ba92c028ae4313f7.png'],
        category: '零工',
      },
      favoritedAt: now - 1 * day,
    },
  ];

  // ============ 内存数据副本（用户操作只改这里） ============
  var historyData = presetHistory.slice();
  var favoritesData = presetFavorites.slice();

  function matchEntry(entry, id, source) {
    return String(entry.id) === String(id) && entry.source === source;
  }

  var HistoryFavorites = {
    MAX_HISTORY: 100,

    /**
     * 添加浏览历史（空操作，保留接口兼容）
     */
    addHistory: function (item) {
      // 写死模式：不执行任何操作
    },

    /**
     * 切换收藏状态（空操作，固定返回 true 表示已收藏）
     * @returns {boolean}
     */
    toggleFavorite: function (item) {
      return true;
    },

    /**
     * 判断是否已收藏（固定返回 true）
     */
    isFavorited: function (id, source) {
      return true;
    },

    /**
     * 获取历史记录（可按来源过滤）
     */
    getHistory: function (source) {
      if (source) {
        return historyData.filter(function (h) {
          return h.source === source;
        });
      }
      return historyData;
    },

    /**
     * 获取收藏（可按来源过滤）
     */
    getFavorites: function (source) {
      if (source) {
        return favoritesData.filter(function (f) {
          return f.source === source;
        });
      }
      return favoritesData;
    },

    /**
     * 移除单条收藏（空操作）
     */
    removeFavorite: function (id, source) {
      // 写死模式：不执行任何操作
    },

    /**
     * 清空历史（空操作）
     */
    clearHistory: function (source) {
      // 写死模式：不执行任何操作
    },

    /**
     * 清空收藏（空操作）
     */
    clearFavorites: function (source) {
      // 写死模式：不执行任何操作
    },

    /**
     * 格式化时间戳为可读时间
     */
    formatTime: function (ts) {
      if (!ts) return '';
      var diff = Date.now() - ts;
      var min = 60 * 1000;
      var hour = 60 * min;
      var day = 24 * hour;
      if (diff < min) return '刚刚';
      if (diff < hour) return Math.floor(diff / min) + '分钟前';
      if (diff < day) return Math.floor(diff / hour) + '小时前';
      if (diff < 7 * day) return Math.floor(diff / day) + '天前';
      var d = new Date(ts);
      return (
        d.getMonth() + 1 + '月' + d.getDate() + '日'
      );
    },
  };

  window.HistoryFavorites = HistoryFavorites;
})(window);
