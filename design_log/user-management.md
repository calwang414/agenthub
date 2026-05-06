# 用户管理页面 · 需求文档

## 页面目标
AI插件市场后台管理系统的用户管理页面，管理员可查看、搜索、筛选、新增、编辑、禁用/启用、重置密码、删除用户。采用分栏布局——左侧用户列表 + 右侧详情面板。

## 核心功能

### 统计概览
- 顶部4个统计卡片：用户总数、活跃用户、管理员数、已禁用数
- 数据基于当前用户列表实时计算

### 搜索与筛选
- 搜索框：按用户名、邮箱模糊搜索
- 角色筛选：全部 / 管理员 / 编辑 / 访客
- 状态筛选：全部 / 正常 / 已禁用

### 新增用户
- 弹窗表单，包含：用户名、邮箱、手机号、角色、初始密码
- 表单验证：用户名和邮箱必填
- 新增后自动生成用户 ID 并加入列表

### 编辑用户
- 弹窗表单，预填当前用户数据
- 可修改：用户名、邮箱、手机号、角色

### 删除用户
- 确认弹窗，展示用户名
- 确认后删除

### 禁用/启用
- 切换用户状态（active ↔ disabled）
- 行内按钮，操作后 Toast 提示

### 重置密码
- 管理员操作，点击后弹窗确认
- 模拟生成新密码并显示（"已为用户 XXX 重置密码，新密码：xxxxxx"）

### 分栏详情面板
- 点击用户行 → 右侧滑出详情面板
- 展示：头像（首字）、用户名、邮箱、手机号、角色 + 权限说明、注册时间、最近活跃时间
- 面板内快捷操作：编辑、禁用/启用、重置密码

### 分页
- 每页 8 条
- 页码 + 上一页/下一页 + 总数显示

### Toast 反馈
- 所有操作的结果提示（成功/错误）

### 响应式
- 移动端：详情面板变为全屏遮罩层

## 交互行为
1. 点击用户行 → 右侧面板展示该用户详情
2. 操作按钮 hover 有颜色变化反馈
3. 搜索/筛选 → 自动回到第1页
4. ESC 关闭弹窗
5. 点击详情面板外区域或关闭按钮关闭面板
6. 全选/单选 checkbox 支持批量操作

## 页面结构
```
/admin/users
├── 侧边栏（继承插件管理页）
│   ├── AgentHub Logo
│   ├── 仪表盘
│   ├── 插件管理
│   ├── 分类管理
│   └── 用户管理（active）
├── 顶部标题栏
│   └── "用户管理"（Cormorant Garamond 衬线标题）
├── 统计卡片 x4
├── 工具栏（搜索 + 角色筛选 + 状态筛选 + 新增按钮）
├── 分栏布局
│   ├── 左侧：用户列表表格
│   │   ├── checkbox | 用户 | 角色 | 状态 | 注册时间 | 操作
│   │   └── 分页控件
│   └── 右侧：用户详情面板
│       ├── 头像 + 用户名
│       ├── 详细信息列表
│       └── 快捷操作按钮
└── 弹窗层
    ├── 新增/编辑用户弹窗
    ├── 删除确认弹窗
    ├── 重置密码确认弹窗
    └── Toast 通知
```

## 页面间跳转
- 侧边栏链接：仪表盘(/admin)、插件管理(/admin/plugins)、分类管理(/admin/categories)、用户管理(/admin/users - 当前页)

## 设计系统
严格遵循 Claude 设计规范（DESIGN.md）：
- 奶油色画布 #faf9f5、珊瑚色 #cc785c、深海军蓝侧边栏 #181715
- Cormorant Garamond 衬线标题 + Inter 正文
- 圆角、间距按 DESIGN.md 层级

---
### 2026-04-29 14:30 · 生成
内容：生成用户管理页面（方案C分栏布局）。分栏布局：左侧用户列表表格 + 右侧详情面板。包含统计卡片、搜索筛选、新增/编辑/删除/禁用/启用/重置密码、Toast 反馈、分页、批量操作、响应式布局。
文件：frontend/src/app/admin/users/page.tsx

---
### 2026-04-30 · SQLite 持久化改造
内容：用户管理页面从直接读取 mockUsers 改为调用 GET/POST/PUT/DELETE /api/users。所有 CRUD 操作改为异步 API 调用，批量操作逐个调用 API。
文件：frontend/src/app/admin/users/page.tsx

---
### 2026-04-30 · nickname 字段 + 手机号只读
内容：用户编辑表单新增 nickname 字段（可编辑），name（用户名）编辑时改为只读。手机号编辑时改为只读。列表和详情面板显示昵称为主、用户名为辅（@username）。搜索支持昵称匹配。
文件：frontend/src/app/admin/users/page.tsx、frontend/src/lib/mock/users.ts

---
### 2026-04-30 · snake_case/camelCase 统一转换
内容：users 表列名从 snake_case（created_at/last_active_at）转为 camelCase（createdAt/lastActiveAt），修复用户管理页面注册时间、最后活跃时间、排序等字段不显示问题。弹窗加 max-h-[75vh] overflow-y-auto 滚动。
文件：frontend/src/app/api/users/route.ts、frontend/src/app/api/users/[id]/route.ts、frontend/src/app/admin/users/page.tsx

### 2026-04-29 14:35 · 审查优化
内容：设计审查并优化。修复统计卡片响应式（grid-cols-2 lg:grid-cols-4）、内容区padding响应式（p-4 lg:p-8）、详情面板移动端全屏遮罩（fixed inset-0 on mobile, side panel on lg+）。
文件：frontend/src/app/admin/users/page.tsx
