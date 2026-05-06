# 个人中心页面 — 需求文档

## 页面目标

为 AI 插件市场创建用户个人中心页面，用户可在该页面查看个人信息、管理账号、查看收藏/下载记录和评论历史。

## 核心功能

1. **个人信息展示** — 显示用户头像、昵称、邮箱、角色、注册时间等基本信息
2. **编辑个人资料** — 通过模态框修改昵称和密码，含表单验证
3. **已收藏插件** — 展示收藏统计数字，点击"查看全部"弹出模态框展示收藏插件列表
4. **已下载插件** — 展示下载统计数字，点击"查看全部"弹出模态框展示下载插件列表
5. **我的评论** — 展示最近评论预览（2-3条），点击"查看全部"弹出模态框展示完整评论列表

## 页面结构

```
┌──────────────────────────────────────────┐
│  🔝 顶部导航栏（与插件市场保持一致）        │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  👤 个人卡片                         ││
│  │  头像 · 昵称 · 邮箱 · 角色 · 注册时间  ││
│  │  [编辑资料]（点击 → 模态框修改昵称密码）││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌─────────────┐ ┌─────────────┐        │
│  │  ⭐ 已收藏  │ │  📥 已下载  │        │
│  │    12       │ │     8       │        │
│  │  [查看全部] │ │  [查看全部] │        │
│  └─────────────┘ └─────────────┘        │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  📝 我的评论                        ││
│  │  · 最新评论预览（2-3条）             ││
│  │  [查看全部]                          ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

## 交互行为

| 操作 | 交互方式 |
|------|----------|
| 编辑资料（昵称/密码） | 点击"编辑资料"按钮 → 弹出模态框，内含昵称输入框和密码输入框，保存/取消按钮 |
| 查看收藏完整列表 | 点击收藏卡片"查看全部" → 弹出模态框，展示收藏插件卡片列表 |
| 查看下载完整列表 | 点击下载卡片"查看全部" → 弹出模态框，展示已下载插件卡片列表 |
| 查看全部评论 | 点击评论区域"查看全部" → 弹出模态框，展示完整评论列表，含评论内容、插件名、时间 |
| 表单提交 | 保存成功 toast 提示，关闭模态框 |
| 数据加载 | 从 mock 数据模拟加载，列表分页 |

## 设计规范

- 遵循 Claude 设计系统（DESIGN.md）
- 画布底色：`#faf9f5`（cream canvas）
- 主色调：`#cc785c`（coral primary）
- 卡片底色：`#efe9de`（surface-card）
- 深色导航：`#181715`（surface-dark）
- 标题字体：Copernicus / Tiempos Headline 衬线
- 正文字体：Inter / StyreneB 无衬线
- 圆角：卡片 12px / 按钮 8px / 头像圆形
- 所有文案使用中文

---
### 2026-04-30 · 生成
内容：生成个人中心页面，包含个人信息卡片、已收藏/已下载插件统计卡片（带模态框列表）、我的评论预览（带模态框完整列表）、编辑资料模态框（昵称+密码修改）、全部使用 Claude 设计系统颜色/字体/圆角/间距。第二阶段审查修复：星级评分使用 CSS 变量、昵称字号对齐设计 token、模态框出入动画、关闭按钮 hover/focus 样式。
文件：frontend/src/app/personal-center/page.tsx

---
### 2026-04-30 · 重构
内容：去掉收藏/下载/评论的模态框弹窗，改为页面内直接展示完整列表（每页5条、带分页导航）。统计卡片改为锚点链接，点击滚动到对应列表区域。导航栏新增「← 返回市场」按钮跳转首页。编辑资料仍保留模态框。提取 Pagination 通用组件。
文件：frontend/src/app/personal-center/page.tsx

---
### 2026-04-30 · 布局紧凑化
内容：全面收紧间距和字号：标题28px→38px，卡片内边距缩小，列表行间距减小，统计卡片删除。直接呈现收藏/下载/评论列表。
文件：frontend/src/app/personal-center/page.tsx

---
### 2026-04-30 · 消息功能
内容：新增消息中心功能（公告+通知），8条 mock 消息含未读状态、类型标签、分页列表。浮窗菜单和 personal-center 页面同步添加消息模块。
文件：frontend/src/components/ui/personal-center-popover.tsx, frontend/src/app/personal-center/page.tsx

---
### 2026-04-30 · 编辑资料升级
内容：编辑资料弹窗改为展示全部个人信息（头像、邮箱、角色、注册时间、账号状态），仅昵称和密码可编辑。其他字段以只读卡片展示。
文件：frontend/src/components/ui/personal-center-popover.tsx, frontend/src/app/personal-center/page.tsx

---
### 2026-04-30 · 头像入口重构
内容：移除导航栏「个人中心」文字链接，「管理后台」和「退出登录」按钮归入头像浮窗菜单。点击头像弹出 PersonalCenterPopover 统一操作入口。管理后台链接加 prefetch={false}。
文件：frontend/src/components/ui/nav-layout.tsx, frontend/src/components/ui/admin-layout.tsx, frontend/src/components/ui/personal-center-popover.tsx

---
### 2026-04-30 · 统一管理后台布局
内容：创建 AdminLayout 组件统一侧边栏和顶部 header（使用 usePathname 自动高亮、auth 守卫、权限过滤）。四个后台页面（仪表盘/插件/分类/用户）简化为 <AdminLayout title="...">。header 移除「管理员」文字，改用头像浮窗。
文件：frontend/src/components/ui/admin-layout.tsx, frontend/src/app/admin/page.tsx, frontend/src/app/admin/plugins/page.tsx, frontend/src/app/admin/categories/page.tsx, frontend/src/app/admin/users/page.tsx

---
### 2026-04-30 · 下线页面
内容：删除 personal-center 页面路由（/personal-center）。所有功能（编辑资料、消息、收藏、下载、评论、管理后台、退出登录）已归入 PersonalCenterPopover 头像浮窗菜单，页面冗余。
文件：删除 frontend/src/app/personal-center/

---
### 2026-04-30 · nickname + 手机号展示 + API 保存
内容：编辑资料弹窗昵称字段改为读取/编辑 authUser.nickname（而非 name）。新增用户名和手机号只读展示卡片。保存逻辑改为调用 PUT /api/users/:id 真实保存，保存成功后调用 refreshUser() 即时刷新页面 UI。浮窗头部和弹窗头像改为显示昵称+@用户名。
文件：frontend/src/components/ui/personal-center-popover.tsx

---
### 2026-04-30 · snake_case/camelCase 统一转换
内容：所有 API 接口的 SQLite 返回结果统一通过 toCamelCase/toCamelCaseArray 转为 camelCase，修复用户资料编辑、通知公告时间等所有字段不显示问题。
文件：frontend/src/lib/api-helper.ts、frontend/src/app/api/*/route.ts
