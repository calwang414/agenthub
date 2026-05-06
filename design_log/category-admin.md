# AI 智能体插件市场 · 后台管理 — 分类管理页面

## 页面目标
为 AI 智能体插件市场提供分类管理后台界面，管理员可以查看、搜索、筛选、新增、编辑、删除插件分类，并调整分类排序。

## 整体布局结构
- 左侧深色垂直导航栏（与插件管理页面共享）：仪表盘 / 插件管理 / 分类管理（当前激活） / 用户管理
- 右侧主内容区：页面标题 + 顶部操作栏 + 视图切换 + 分类列表 + 分页

## 核心功能

### 1. 基础 CRUD
- 新增分类：弹窗表单，字段包含分类名称、图标（emoji）、描述、排序权重
- 编辑分类：弹窗表单预填现有数据
- 删除分类：确认弹窗"确定要删除分类「XXX」吗？此操作不可撤销。"
- 表单校验（名称必填）
- ESC 关闭弹窗

### 2. 搜索与筛选
- 搜索框实时筛选分类名称/描述（300ms 防抖）
- 状态下拉筛选：全部 / 已启用 / 已禁用

### 3. 排序管理
- 表格视图中每行显示 ▲▼ 上下箭头按钮
- 点击 ▲ 与上一行交换 sortOrder
- 点击 ▼ 与下一行交换 sortOrder

### 4. 视图切换
- 表格/卡片视图切换按钮组
- 表格视图：列包含图标、名称、描述、插件数、创建时间、排序、状态、操作
- 卡片视图：3 列网格布局，卡片展示图标、名称、描述、插件数、状态标签、操作按钮
- 卡片 hover 效果：轻微上浮 + 阴影

### 5. 分页
- 每页 6 条，底部分页控件

## 交互行为
- 搜索框输入实时筛选（防抖 300ms）
- 状态下拉切换即时刷新列表
- 表格/卡片视图切换记忆状态
- 新增/编辑弹窗支持 ESC 关闭
- 删除操作需二次确认
- 所有操作有成功/失败的 toast 反馈
- 排序即时生效，更新 sortOrder

## 数据模型
```
Category {
  id: string
  name: string
  icon: string
  description: string
  pluginCount: number (关联计算)
  sortOrder: number
  status: "enabled" | "disabled"
  createdAt: string
  updatedAt: string
}
```

## 页面结构树
```
┌─ 侧边栏(暗色)─────────┐  ┌─ 主内容区(奶油底色) ─────────────┐
│  Logo                 │  │  ┌─ 页面标题 ────────────────┐  │
│                       │  │  ├─ 操作栏 ──────────────────┤  │
│  📊 仪表盘            │  │  │ 搜索框 状态筛选 视图切换   │  │
│  🔌 插件管理          │  │  │            + 新增分类按钮   │  │
│  📂 分类管理 (active) │  │  ├─ 表格/卡片视图 ──────────┤  │
│  👥 用户管理          │  │  └─ 分页控件 ──────────────┘  │
│                       │  │                                │
│  👤 管理员            │  │                                │
└───────────────────────┘  └────────────────────────────────┘
```

## 设计约束
- 设计系统：Claude 风格 — 奶油底色(#faf9f5)、coral 主色(#cc785c)、深色导航表面(#181715)
- 字体：标题 Cormorant Garamond serif，正文 Inter sans
- 圆角：按钮/输入 8px，卡片 12px，badge pill
- 间距：section 内 32px padding，卡片间距 16px
- 所有 UI 样式严格遵循 DESIGN.md 中的颜色、字体、间距、圆角定义
- 所有可见文本为中文
- 与已有插件管理页面共享侧边栏导航组件

---
### 2026-04-29 · 生成
内容：生成分类管理后台页面，包含完整的 CRUD、搜索筛选、排序管理（▲▼）、表格/卡片视图切换、分页功能。严格遵循 Claude 设计系统（奶油底色、coral主色、深色侧边栏）。共享侧边栏导航组件，与插件管理页面风格一致。
文件：frontend/src/app/admin/categories/page.tsx, frontend/src/lib/mock/categories.ts, frontend/src/lib/mock/index.ts

---
### 2026-04-30 · SQLite 持久化 + pluginCount 实时计算
内容：分类管理从 mock 数据改为调用 GET/POST/PUT/DELETE /api/categories。plugin_count 从静态列改为 SELECT COUNT FROM plugins WHERE category=? 实时计算。弹窗加 max-h-[75vh] overflow-y-auto 滚动。
文件：frontend/src/app/admin/categories/page.tsx、frontend/src/app/api/categories/route.ts
