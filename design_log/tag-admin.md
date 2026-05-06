# AI 智能体插件市场 · 后台管理 — 标签管理页面

## 页面目标
为 AI 智能体插件市场提供标签管理后台界面，管理员可以查看、搜索、筛选、新增、编辑、删除标签，调整排序，并切换标签启用/禁用状态。标签与插件为多对多关联关系。

## 整体布局结构
- 左侧深色垂直导航栏（与已有 admin 页面共享）：仪表盘 / 插件管理 / 分类管理 / 标签管理（当前激活） / 用户管理 / 通知公告
- 右侧主内容区：页面标题 + 顶部操作栏 + 视图切换 + 标签列表 + 分页

## 核心功能

### 1. 基础 CRUD
- 新增标签：弹窗表单，字段包含标签名称、颜色(色块选择器)、图标(emoji选择器)、描述、排序权重
- 编辑标签：弹窗表单预填现有数据
- 删除标签：确认弹窗"确定要删除标签「XXX」吗？此操作不可撤销。"
- 表单校验（名称必填）
- ESC 关闭弹窗

### 2. 搜索与筛选
- 搜索框实时筛选标签名称/描述（300ms 防抖）
- 状态下拉筛选：全部 / 已启用 / 已禁用

### 3. 排序管理
- 表格视图中每行显示 ▲▼ 上下箭头按钮
- 点击 ▲ 与上一行交换 sortOrder
- 点击 ▼ 与下一行交换 sortOrder

### 4. 视图切换
- 表格/卡片视图切换按钮组
- 表格视图：列包含颜色色块、图标、名称、描述、插件数、创建时间、排序、状态、操作
- 卡片视图：3 列网格布局，卡片用标签颜色作顶部色条，展示图标、名称、描述、插件数、状态标签、操作按钮
- 卡片 hover 效果：轻微上浮 + 阴影

### 5. 状态切换
- 行内启用/禁用开关，即时生效 + Toast 反馈

### 6. 分页
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
Tag {
  id: string
  name: string
  color: string
  icon: string
  description: string
  pluginCount: number
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
│  🔌 插件管理          │  │  │            + 新增标签按钮   │  │
│  📂 分类管理          │  │  ├─ 表格/卡片视图 ──────────┤  │
│  📌 标签管理 (active) │  │  └─ 分页控件 ──────────────┘  │
│  👥 用户管理          │  │                                │
│  📢 通知公告          │  │                                │
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
- 与已有后台管理页面共享侧边栏导航组件

## 配色选择器
- 预设12种颜色：coral(#cc785c)、teal(#5db8a6)、amber(#e8a55a)、blue(#5b8bd4)、purple(#9b7ec4)、green(#5db872)、pink(#d47a9a)、orange(#e09b5e)、indigo(#6c7db8)、rose(#c47a6a)、slate(#7c8a9a)、lime(#8aab5e)

---
### 2026-04-30 · 生成
内容：生成标签管理后台页面。包含完整 CRUD（新增/编辑/删除弹窗，12色选择器+emoji选择器）、搜索筛选（300ms防抖+状态下拉）、排序管理（▲▼）、表格/卡片双视图切换（卡片用标签颜色作顶部色条）、状态切换（toggle开关+Toast反馈）、分页（每页6条）。严格遵循Claude设计系统，共享AdminLayout侧边栏导航。修改NAV_ITEMS添加「标签管理」导航项（📌）。
文件：frontend/src/app/admin/tags/page.tsx

---
### 2026-04-30 · SQLite 持久化 + pluginCount 实时计算
内容：标签管理从 mock 数据改为调用 GET/POST/PUT/DELETE /api/tags。plugin_count 从静态列改为 SELECT COUNT FROM plugins WHERE tags LIKE 实时计算。弹窗加 max-h-[75vh] overflow-y-auto 滚动。
文件：frontend/src/app/admin/tags/page.tsx、frontend/src/app/api/tags/route.ts, frontend/src/lib/mock/tags.ts, frontend/src/components/ui/admin-layout.tsx, frontend/src/lib/mock/index.ts
