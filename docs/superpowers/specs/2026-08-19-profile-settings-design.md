# 个人信息设置页面设计文档

## 概述

为房间列表页（room_list.html）添加入口，点击左上角头像可进入个人信息设置页面，支持编辑个人简历、虚拟身份证、公司简历和公司虚拟身份证。其中个人简历和公司简历为可编辑表单，虚拟身份证根据个人简历自动生成（只读），公司虚拟身份证为独立的可编辑表单。

## 需求背景

- 客户需要一个统一的个人信息管理页面
- 支持个人简历和公司简历的编辑
- 个人简历字段已存在于项目中，可直接复用
- 公司简历和虚拟身份证格式参考 docs/公司简历和虚拟身份证 目录

## 入口位置

- 文件：`www/room_list.html`
- 位置：页面左上角头像（当前无点击事件）
- 跳转：`profile_settings.html?from=room_list`

## 页面结构

### 布局设计

```
┌─────────────────────────────────────┐
│ ← 返回        个人信息设置          │
├─────────────────────────────────────┤
│         ┌──────────┐                │
│         │  头像    │                │
│         └──────────┘                │
│         点击更换头像                 │
├─────────────────────────────────────┤
│  个人简历 │ 虚拟身份证 │ 公司简历 │ 公司虚拟身份证  │
├─────────────────────────────────────┤
│                                     │
│  [Tab内容区域 - 根据选择显示]        │
│                                     │
├─────────────────────────────────────┤
│         [保存修改]                  │
└─────────────────────────────────────┘
```

### 页面文件

- 新建：`www/profile_settings.html`
- 修改：`www/room_list.html`（添加头像点击事件）

## 数据模型

### 存储方式

使用 localStorage，key 为 `appUserProfile`，在现有对象中添加 `companyProfile` 子对象。

### 完整数据结构

```javascript
{
  // ========== 个人简历字段（现有，15个） ==========
  name: '',           // 姓名
  vId: '',            // 虚拟身份证编号（如 "V8001"）
  gender: '',         // 性别
  birth: '',          // 出生（"YYYY年M月" 格式）
  ethnic: '',         // 民族
  job: '',            // 职业
  jobStatus: '',      // 职业现状
  skills: '',         // 技能
  specialty: '',      // 特长
  hobbies: '',        // 爱好
  prevUnit: '',       // 上任单位名称
  education: '',      // 教育经历
  contact: '',        // 联系人
  phone: '',          // 电话
  evaluation: '',     // 自我评价
  avatar: '',         // 头像路径

  // ========== 公司信息字段（新增，完全独立） ==========
  companyProfile: {
    // ----- 公司简历（8个字段） -----
    businessLicense: '',   // 营业执照（图片路径）
    shareholders: '',      // 股东
    keyPersonnel: '',      // 主要人员
    companyIntro: '',      // 公司简介
    currentStatus: '',     // 现状介绍
    businessContent: '',   // 经营内容
    shortTermPlan: '',     // 短期需求计划
    longTermPlan: '',      // 长期需求

    // ----- 公司虚拟身份证（6个字段，独立编辑） -----
    companyIdCard: {
      companyLogo: '',       // 公司图标（图片路径）
      companyName: '',       // 公司名称
      establishTime: '',     // 成立时间
      legalPerson: '',       // 法人名称
      mainMembers: '',       // 主要成员
      businessContent: '',   // 经营内容（与公司简历独立，可单独编辑）
    }
  }
}
```

## Tab内容设计

### Tab1：个人简历（可编辑）

| 字段名 | 属性名 | 输入类型 | 说明 |
|--------|--------|----------|------|
| 姓名 | name | text | 必填 |
| 性别 | gender | button选择 | 男/女/其他 |
| 出生 | birth | 日期选择 | "YYYY年M月"格式 |
| 民族 | ethnic | text | 如"汉族" |
| 职业 | job | text | |
| 职业现状 | jobStatus | text | 如"在职"、"离职" |
| 上任单位 | prevUnit | text | |
| 联系人 | contact | text | |
| 电话 | phone | tel | |
| 教育经历 | education | text | 如"XX大学 XX专业 本科" |
| 技能 | skills | text | 多个用顿号分隔 |
| 特长 | specialty | text | 多个用顿号分隔 |
| 爱好 | hobbies | text | 多个用顿号分隔 |
| 自我评价 | evaluation | textarea | 多行文本 |

### Tab2：虚拟身份证（只读展示）

根据个人简历数据自动生成，不可编辑。

展示字段：
- 虚拟身份证编号（vId）
- 姓名（name）
- 性别（gender）
- 出生（birth）
- 民族（ethnic）
- 职业（job）
- 职业现状（jobStatus）
- 技能（skills）
- 特长（specialty）
- 爱好（hobbies）
- 头像（avatar）

### Tab3：公司简历（可编辑）

| 字段名 | 属性名 | 输入类型 | 说明 |
|--------|--------|----------|------|
| 营业执照 | businessLicense | 图片上传 | 点击上传图片 |
| 股东 | shareholders | text | 多个用顿号分隔 |
| 主要人员 | keyPersonnel | text | 多个用顿号分隔 |
| 公司简介 | companyIntro | textarea | 多行文本 |
| 现状介绍 | currentStatus | textarea | 多行文本 |
| 经营内容 | businessContent | textarea | 多行文本 |
| 短期需求计划 | shortTermPlan | textarea | 多行文本 |
| 长期需求 | longTermPlan | textarea | 多行文本 |

### Tab4：公司虚拟身份证（可编辑）

独立的可编辑表单，与公司简历字段完全独立，可分别修改。

| 字段名 | 属性名 | 输入类型 | 说明 |
|--------|--------|----------|------|
| 公司图标 | companyIdCard.companyLogo | 图片上传 | 点击上传图片 |
| 公司名称 | companyIdCard.companyName | text | |
| 成立时间 | companyIdCard.establishTime | date | 日期选择 |
| 法人名称 | companyIdCard.legalPerson | text | |
| 主要成员 | companyIdCard.mainMembers | text | 多个用顿号分隔 |
| 经营内容 | companyIdCard.businessContent | textarea | 多行文本，与公司简历独立 |

## 交互流程

### 页面加载

1. 从 URL 参数获取 `from` 值（用于返回跳转）
2. 从 localStorage 读取 `appUserProfile` 数据
3. 如果数据不存在，使用默认空值
4. 填充表单字段

### Tab切换

1. 点击Tab标题，切换对应内容区域
2. 高亮当前选中的Tab
3. 保持已编辑的表单数据

### 保存操作

1. 收集所有表单字段值
2. 更新 `appUserProfile` 对象
3. 写入 localStorage
4. 显示"保存成功"提示
5. 跳转回来源页面

### 返回操作

1. 点击左上角返回按钮
2. 如果有未保存的修改，提示用户
3. 跳转回来源页面（room_list.html）

## 代码修改

### 1. 新建 profile_settings.html

- 页面结构：参考 profile_edit.html 的代码风格
- 使用 Tailwind CSS 样式
- 使用 iconify-icon 图标库
- 使用 nav.js 的 goBack() 函数处理返回

### 2. 修改 room_list.html

在头像元素上添加点击事件：

```html
<!-- 原代码（约第89-98行） -->
<div class="w-14 h-14 bg-pink-100 p-0.5" ...>
  <img ... />
</div>

<!-- 修改为 -->
<div class="w-14 h-14 bg-pink-100 p-0.5 cursor-pointer" 
     onclick="window.location.href='profile_settings.html?from=room_list'" ...>
  <img ... />
</div>
```

## 技术规范

- **框架**：纯 HTML + Tailwind CSS + 内联 JavaScript（与项目一致）
- **样式**：主色调 #ec4899（pink-500），直角风格
- **存储**：localStorage
- **导航**：nav.js 的 goBack() 和 getUrlParam()
- **图标**：iconify-icon（solar 图标集）
- **图片上传**：使用 FileReader API 转换为 base64 存储

## 默认数据

公司信息初始为空值，用户首次进入时需要手动填写。

```javascript
const defaultCompanyProfile = {
  // 公司简历
  businessLicense: '',
  shareholders: '',
  keyPersonnel: '',
  companyIntro: '',
  currentStatus: '',
  businessContent: '',
  shortTermPlan: '',
  longTermPlan: '',
  
  // 公司虚拟身份证（独立）
  companyIdCard: {
    companyLogo: '',
    companyName: '',
    establishTime: '',
    legalPerson: '',
    mainMembers: '',
    businessContent: '',
  }
}
```

## 验收标准

1. ✅ 从 room_list.html 左上角头像可跳转到 profile_settings.html
2. ✅ 页面显示4个Tab：个人简历、虚拟身份证、公司简历、公司虚拟身份证
3. ✅ 个人简历Tab可编辑所有字段
4. ✅ 虚拟身份证Tab只读展示，数据来源于个人简历
5. ✅ 公司简历Tab可编辑所有字段
6. ✅ 公司虚拟身份证Tab可编辑所有字段，与公司简历完全独立
7. ✅ 点击保存按钮可将数据写入 localStorage
8. ✅ 点击返回按钮可回到 room_list.html
9. ✅ 页面样式与项目现有页面风格一致
