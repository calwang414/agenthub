# AI 智能体插件市场 · 后台管理 — 通知公告管理页面

## 页面目标
为 AI 智能体插件市场提供通知公告管理后台界面，管理员可以配置首页公告栏信息和向用户推送通知消息。采用单页面 Tab 切换布局——公告栏管理和通知推送两个子模块。

## 整体布局结构
- 左侧深色垂直导航栏（与已有管理页面共享）：仪表盘 / 插件管理 / 分类管理 / 用户管理 / 通知公告（当前激活）
- 右侧主内容区：页面标题 + Tab 切换 + 对应子模块内容

## 核心功能

### Tab 1 · 公告栏管理

#### 1. 公告列表
- 表格形式展示所有公告
- 列：优先级标签（置顶/普通）、标题、链接状态、用户可关闭状态、启用状态、发布时间、操作
- 支持分页（每页 6 条）

#### 2. 新增/编辑公告弹窗
- 弹窗表单：
  - 标题（必填）
  - 内容（富文本编辑器，支持加粗/斜体/下划线/无序列表/有序列表/清除格式）
  - 跳转链接（可选 URL 输入）
  - 优先级：置顶 / 普通
  - 允许用户关闭：是 / 否 开关
  - 定时发布：启用开关 + 发布时间选择器
  - 定时下架：启用开关 + 下架时间选择器
- 表单校验（标题必填）
- ESC 关闭弹窗

#### 3. 启用/禁用
- 每条公告的开关（Toggle 组件）
- 禁用后前端首页不再展示
- 实时切换并 Toast 反馈

#### 4. 置顶排序
- ▲▼ 上下箭头按钮调整优先级排序
- 置顶公告靠上，普通公告按下

#### 5. 删除确认
- 确认弹窗："确定要删除公告「XXX」吗？此操作不可撤销。"
- 确认 / 取消按钮

#### 6. 搜索与时间筛选
- 搜索框实时筛选公告标题（300ms 防抖）
- 状态下拉：全部 / 已启用 / 已禁用

### Tab 2 · 通知推送

#### 1. 推送表单
- 通知内容编辑器（富文本，与公告栏共用）
- 推送目标选择：
  - 全部用户
  - 按角色筛选（管理员/编辑/访客），可多选
- 发送按钮（coral 主色）
- 发送前确认弹窗
- 发送成功 Toast 反馈

#### 2. 发送记录
- 表格列表展示历史发送记录
- 列：内容摘要、目标类型、目标角色、发送时间、状态
- 状态标签：已发送（绿色）/ 失败（红色）
- 支持搜索记录（按内容摘要搜索）
- 分页（每页 6 条）

## 交互行为
- Tab 切换记忆当前激活的 Tab
- 公告编辑弹窗表单校验
- 搜索框输入实时筛选（防抖 300ms）
- 所有弹窗支持 ESC 关闭
- 删除操作需二次确认
- 通知发送前需二次确认
- 所有操作有成功/失败的 Toast 反馈
- 置顶排序即时生效
- 启用/禁用即时生效

## 数据模型

### 公告（Announcement）
```
{
  id: string
  title: string
  content: string (富文本 HTML)
  priority: "pinned" | "normal"
  linkUrl: string
  isDismissible: boolean
  isActive: boolean
  publishAt: string | null
  expireAt: string | null
  createdAt: string
}
```

### 通知记录（NotificationRecord）
```
{
  id: string
  content: string (富文本 HTML)
  targetType: "all" | "byRole"
  targetRoles: ("admin" | "editor" | "guest")[]
  sentAt: string
  status: "sent" | "failed"
}
```

## 页面结构树
```
┌─ 侧边栏(暗色)─────────┐  ┌─ 主内容区(奶油底色) ────────────────────┐
│  Logo                 │  │  ┌─ 页面标题 ───────────────────────┐  │
│                       │  │  ├─ Tab 切换 ──────────────────────┤  │
│  📊 仪表盘            │  │  │  📢 公告栏管理 | 🔔 通知推送    │  │
│  🔌 插件管理          │  │  │                                  │  │
│  📂 分类管理          │  │  │  [Tab 内容区域]                  │  │
│  👥 用户管理          │  │  │  - 公告栏：搜索框+筛选+表格+分页 │  │
│  📢 通知公告 (active) │  │  │  - 通知推送：表单+发送记录+分页 │  │
│                       │  │  └──────────────────────────────────┘  │
│  👤 管理员            │  │                                        │
└───────────────────────┘  └────────────────────────────────────────┘
```

## 侧边栏导航更新
所有现有管理页面（插件管理、分类管理、用户管理）的 NAV_ITEMS 数组中新增：
```
{ label: "通知公告", href: "/admin/notifications", icon: "📢" }
```
（将"用户管理"的 active 改为 false，新增"通知公告" active: true）

## 页面间跳转
- 侧边栏链接：仪表盘(/admin)、插件管理(/admin/plugins)、分类管理(/admin/categories)、用户管理(/admin/users)、通知公告(/admin/notifications - 当前页)
- 所有已有页面侧边栏同步新增"通知公告"入口

## 设计约束
- 设计系统：Claude 风格 — 奶油底色(#faf9f5)、coral 主色(#cc785c)、深色导航表面(#181715)
- 字体：标题 Cormorant Garamond serif，正文 Inter sans
- 圆角：按钮/输入 8px，卡片 12px，badge pill
- 间距：section 内 32px padding
- 所有 UI 样式严格遵循 DESIGN.md 中的颜色、字体、间距、圆角定义
- 所有可见文本为中文
- 与已有管理页面共享侧边栏导航组件，富文本编辑器与插件管理页面保持一致

---
### 2026-04-30 11:30 · 生成
内容：生成通知公告管理页面。单页面 Tab 切换布局——公告栏管理（表格列表、新增/编辑弹窗带富文本编辑器、置顶排序▲▼、启用/禁用 Toggle、定时发布/下架、跳转链接、用户可关闭、删除确认）+ 通知推送（富文本编辑推发表单、全部用户/按角色筛选目标、发送确认弹窗、发送记录表格含搜索和分页）。侧边栏导航同步更新所有管理页面。
文件：frontend/src/app/admin/notifications/page.tsx

---
### 2026-04-30 · SQLite 持久化 + 发布时间修复
内容：通知公告管理从 mock 数据改为调用 GET/POST/PUT/DELETE /api/announcements 和 /api/notification-records。announcements/notification-records 表列名统一通过 toCamelCase 转为 camelCase，修复发布时间（createdAt/publishAt/sentAt）等字段不显示问题。
文件：frontend/src/app/admin/notifications/page.tsx、frontend/src/app/api/announcements/route.ts、frontend/src/app/api/notification-records/route.ts、frontend/src/lib/mock/notifications.ts、frontend/src/lib/mock/index.ts

---
### 2026-04-30 11:45 · 审查优化
内容：代码审查后修复 7 项问题——搜索 300ms 防抖、contentEditable 冲突修复、统一 focus ring 样式、字号对齐 DESIGN.md typography scale、发布时间列显示逻辑优化。页面通过 TypeScript 诊断（0 错误）。
文件：frontend/src/app/admin/notifications/page.tsx

---
### 2026-04-30 17:20 · 布局统一
内容：将通知公告页面重构为使用 AdminLayout 统一布局组件，移除了约 80 行自行硬编码的侧边栏/header 代码。修复了 header 右侧缺少"个人中心"和"返回市场"的问题，NAV 高亮由硬编码改为 pathname 动态判断。
文件：frontend/src/app/admin/notifications/page.tsx

---
### 2026-04-30 17:30 · SSR 修复
内容：修复 Next.js SSR 环境下 `document.createElement` 运行时错误。将全部 5 处 `document.createElement("div")` + `.innerHTML` + `.textContent` 替换为纯字符串函数 `stripHtmlText()` 和 `truncateText()`。修复 useMemo 依赖数组中旧变量名未同步更新的 bug。
文件：frontend/src/app/admin/notifications/page.tsx

---
### 2026-04-30 17:35 · RSC 导航错误修复
内容：AdminLayout 中将所有 `<Link>` 导航替换为原生 `<a>` + `window.location.href`，消除管理后台切换页面时的 `net::ERR_ABORTED /admin/*?_rsc=...` 错误。原因是 Next.js 16 App Router 的 Link 会发起 RSC 请求，但 "use client" 页面不支持。
文件：frontend/src/components/ui/admin-layout.tsx
