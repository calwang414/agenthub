# 用户登录、注册和权限功能 · 需求文档

## 页面目标
为 AI 插件市场前后台系统添加完整的用户认证与权限控制功能。实现公开注册、多种方式登录、角色感知导航菜单，以及基于角色的页面访问控制。

## 核心功能

### 用户登录
- 独立登录页面 `/login`
- 支持用户名/手机号 + 密码登录
- 登录成功后跳转回来源页或首页
- 登录失败有明确错误提示
- 已登录用户访问登录页自动跳转首页

### 用户注册
- 独立注册页面 `/register`
- 表单字段：用户名、手机号、邮箱、密码、确认密码
- 注册成功后默认角色为"访客"
- 注册成功后自动登录并跳转首页
- 已登录用户访问注册页自动跳转首页
- 表单验证：用户名≥2字符、手机号格式、邮箱格式、密码≥6字符、两次密码一致

### 权限控制

| 路由 | 访客 | 编辑 | 管理员 |
|------|:--:|:--:|:--:|
| `/marketplace` | ✅ | ✅ | ✅ |
| `/marketplace/[id]` | ✅ | ✅ | ✅ |
| `/personal-center` | ❌ | ✅ | ✅ |
| `/login` `/register` | ✅ | — | — |
| `/admin` (仪表盘) | ❌ | ✅ | ✅ |
| `/admin/plugins` | ❌ | ✅ | ✅ |
| `/admin/categories` | ❌ | ✅ | ✅ |
| `/admin/users` | ❌ | ❌ | ✅ |
| `/admin/notifications` | ❌ | ❌ | ✅ |

### 全局导航栏（前台页面）
- 未登录：显示"登录"、"注册"按钮
- 已登录访客：显示"个人中心"入口 + 用户名 + 退出按钮
- 已登录编辑/管理员：显示"管理后台"菜单入口 + "个人中心"入口 + 用户名 + 退出按钮
- 导航栏位置：前台页面（marketplace、personal-center、login、register）顶部

### 状态持久化
- 登录状态存储在 localStorage
- 刷新页面后保持登录状态
- 退出登录清除状态

## 交互行为
1. 登录表单提交 → 验证凭证 → 成功跳转/失败提示
2. 注册表单有实时字段验证（失焦触发）
3. 导航栏根据登录状态和角色动态渲染菜单
4. 未登录访问需要登录的页面 → 重定向到 `/login?redirect=<原路径>`
5. 无权限访问管理员专属页面 → 显示 403 提示
6. 退出登录 → 清除状态 → 跳转市场首页
7. 登录页和注册页互相链接（"没有账号？去注册" / "已有账号？去登录"）

## 页面结构

### 登录页 `/login`
```
├── 全局导航栏
└── 登录卡片（居中）
    ├── 标题 "登录"（Cormorant Garamond 衬线）
    ├── 用户名/手机号输入框
    ├── 密码输入框
    ├── 登录按钮（coral 主按钮）
    ├── 错误提示区域
    └── 底部链接 "没有账号？去注册"
```

### 注册页 `/register`
```
├── 全局导航栏
└── 注册卡片（居中）
    ├── 标题 "创建账号"（Cormorant Garamond 衬线）
    ├── 用户名输入框
    ├── 手机号输入框
    ├── 邮箱输入框
    ├── 密码输入框
    ├── 确认密码输入框
    ├── 注册按钮（coral 主按钮）
    ├── 各字段验证错误提示
    └── 底部链接 "已有账号？去登录"
```

## 数据模型
Mock 用户数据扩展 `password` 字段：
```typescript
interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;  // 新增
  role: "管理员" | "编辑" | "访客";
  status: "active" | "disabled";
  createdAt: string;
  lastActiveAt: string;
  avatar?: string;
}
```

AuthContext 状态：
```typescript
interface AuthState {
  user: MockUser | null;
  isLoading: boolean;
  login: (account: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isEditor: boolean;
  isLoggedIn: boolean;
}
```

## 技术方案

### 状态管理：React Context + localStorage
- `AuthContext` 提供全局认证状态
- 组件挂载时从 localStorage 恢复状态
- 登录/注册成功后写入 localStorage
- 退出登录清除 localStorage

### 路由守卫：布局层实现
- `NavLayout`：前台页面布局 + 全局导航栏
- `AdminLayout`：修改，加入角色权限校验
- 在布局组件中检查权限，无权限渲染 403 页面

### 页面跳转
- 登录成功根据 redirect 参数跳转
- 未登录访问需登录页面 → 跳转 `/login?redirect=<原路径>`
- 退出登录 → 跳转 `/marketplace`

## 设计系统
严格遵循 Claude 设计规范（DESIGN.md）：
- 奶油色画布 #faf9f5、珊瑚色 #cc785c、深海军蓝侧边栏 #181715
- Cormorant Garamond 衬线标题 + Inter 正文
- 圆角、间距按 DESIGN.md 层级
- 表单输入框使用 `text-input` 样式：`rounded.md` 8px，高度 40px，`hairline` 边框
- 主按钮使用 `button-primary`：coral 背景，白色文字

---
### 2026-04-30 · 生成
内容：完整的用户登录、注册和权限功能实现。包括：
- AuthContext 状态管理（React Context + localStorage 持久化）
- 登录页（用户名/手机号+密码，redirect 支持，已登录自动跳转）
- 注册页（5 字段验证，注册后默认访客角色，自动登录）
- NavLayout 全局导航栏（角色感知菜单：访客显示登录/注册，编辑/管理员显示管理后台入口）
- AdminLayout 权限守卫（未登录跳转登录页，无权限显示 403，角色过滤侧边栏菜单）
- 所有前台/后台页面集成新导航系统
- Mock 数据增加 password 字段
文件：frontend/src/lib/auth-context.tsx、frontend/src/app/login/page.tsx、frontend/src/app/register/page.tsx、frontend/src/components/ui/nav-layout.tsx、frontend/src/components/ui/admin-layout.tsx、frontend/src/app/layout.tsx、frontend/src/lib/mock/users.ts、frontend/src/app/marketplace/page.tsx、frontend/src/app/marketplace/[id]/page.tsx、frontend/src/app/personal-center/page.tsx、frontend/src/components/ui/personal-center-popover.tsx

---
### 2026-04-30 · SQLite 持久化改造
内容：全部 mock 数据改为 SQLite 存储，新增 14 个 RESTful API 路由。AuthContext 初始化和登录改为调用 API 而非直接从 mock 数组读取。登录支持用户名/邮箱/手机号三种方式。
文件：frontend/src/lib/db/index.ts、frontend/src/lib/db/schema.ts、frontend/src/lib/db/seed.ts、frontend/src/app/api/auth/login/route.ts、frontend/src/app/api/auth/register/route.ts、frontend/src/lib/auth-context.tsx

---
### 2026-04-30 · nickname 字段 + refreshUser
内容：用户模型新增 nickname 字段（用户名不可变更，昵称可修改）。登录/注册 API 返回 nickname。AuthContext 新增 refreshUser() 方法，保存个人资料后自动重新拉取数据并同步 state + localStorage，支持不刷新页面即时更新UI。
文件：frontend/src/lib/mock/users.ts、frontend/src/lib/db/schema.ts、frontend/src/lib/db/seed.ts、frontend/src/app/api/auth/login/route.ts、frontend/src/app/api/auth/register/route.ts、frontend/src/lib/auth-context.tsx

---
### 2026-04-30 · 登录页优化 + snake_case 修复
内容：登录页删除测试账号提示信息，表单输入框支持用户名/邮箱/手机号三种方式登录。login API 查询新增 OR name=? 匹配。users 表返回统一转 camelCase 修复登录后用户信息字段不匹配问题。Suspense 包裹修复 npm run build 报错。
文件：frontend/src/app/login/page.tsx、frontend/src/app/api/auth/login/route.ts、frontend/src/app/api/users/route.ts

---
### 2026-04-30 · 用户管理页统一布局
内容：用户管理页面改用 AdminLayout 统一布局，移除内联侧边栏和顶栏（64 行重复代码），与其他管理页面保持一致。移除旧的 NAV_ITEMS 常量（仅 4 项，缺少标签管理、通知公告），现在侧边栏菜单由 AdminLayout 统一渲染（6 项）并根据角色自动过滤。
文件：frontend/src/app/admin/users/page.tsx
