# Supabase 全量迁移设计文档

**项目**: AgentHub - AI 智能体插件市场
**日期**: 2026-05-06
**范围**: 将 SQLite 数据层、自建认证、文件存储全部迁移到 Self-hosted Supabase

---

## 一、目标架构

### 1.1 当前架构

```
┌──────────────┐     ┌──────────────────┐     ┌─────────┐
│  Next.js App │────▶│  API Routes      │────▶│ SQLite  │
│  (RSC + CSR) │     │  (better-sqlite3)│     │ data.db │
└──────────────┘     └──────────────────┘     └─────────┘
        │                                          
        ▼                                          
┌──────────────┐                                   
│  localStorage│  (存储用户信息/密码明文)              
│  + Context   │                                   
└──────────────┘                                   
```

### 1.2 目标架构

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Next.js App │────▶│  Supabase SDK    │────▶│ Self-hosted Supabase  │
│  (RSC + CSR) │     │  (@supabase/ssr) │     │ 115.190.177.105:8000  │
└──────────────┘     └──────────────────┘     ├─ GoTrue (Auth)        │
        │                                      ├─ PostgreSQL (DB)      │
        ▼                                      ├─ PostgREST (API)      │
┌──────────────┐                               └─ Storage (Files)      │
│  Supabase    │                                                       
│  Auth Client │  (会话由 HTTP-only cookie 管理)
└──────────────┘                                                       
```

### 1.3 依赖变更

新增：
- `@supabase/supabase-js` — 核心客户端 SDK
- `@supabase/ssr` — Next.js SSR 集成（cookie 管理 + Middleware 会话刷新）

移除：
- `better-sqlite3`
- `@types/better-sqlite3`

### 1.4 环境变量（.env.local）

| 变量 | 值 | 说明 |
|------|----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://115.190.177.105:8000` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 来自 mcp.json 的 anon JWT | 公开访问密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | 需从 Supabase Studio 获取 | 服务端管理密钥 |

### 1.5 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/lib/supabase/client.ts` | **新增** — 浏览器端 Supabase 客户端 |
| `src/lib/supabase/server.ts` | **新增** — 服务端 Supabase 客户端 |
| `src/lib/supabase/middleware.ts` | **新增** — Supabase 中间件辅助函数 |
| `src/middleware.ts` | **新增** — Next.js Middleware 会话刷新 |
| `src/lib/db/migrate.ts` | **新增** — SQLite 数据迁移脚本 |
| `.env.local` | **新增** — 环境变量 |
| `src/lib/db/index.ts` | **删除** |
| `src/lib/db/schema.ts` | **删除** → 改为 SQL Migration 文件 |
| `src/lib/db/seed.ts` | **删除** |
| `src/lib/auth-context.tsx` | **重构** — 基于 Supabase Auth |
| `src/lib/api-helper.ts` | **重构** — 移除 ensureDb() |
| `src/app/api/auth/login/route.ts` | **删除** |
| `src/app/api/auth/register/route.ts` | **删除** |
| 所有 API Route 文件 | **重构** — 切换为 supabase client 查询 |

---

## 二、数据库 Schema 迁移

### 2.1 表名映射

| SQLite 表 | Supabase 表（`agenthub_` 前缀） |
|-----------|-------------------------------|
| `users` | `agenthub_users` |
| `plugins` | `agenthub_plugins` |
| `categories` | `agenthub_categories` |
| `tags` | `agenthub_tags` |
| `announcements` | `agenthub_announcements` |
| `notification_records` | `agenthub_notification_records` |
| `plugin_details` | `agenthub_plugin_details` |
| `featured_collections` | `agenthub_featured_collections` |

### 2.2 类型转换规则

| SQLite 类型 | PostgreSQL 类型 |
|------------|----------------|
| `TEXT NOT NULL DEFAULT ''` | `TEXT NOT NULL DEFAULT ''` |
| `INTEGER`（0/1 布尔） | `BOOLEAN` |
| `INTEGER`（计数） | `INTEGER` |
| `REAL` | `DOUBLE PRECISION` |
| `TEXT`（JSON 字符串） | `JSONB` |
| `TEXT`（ISO 时间字符串） | `TIMESTAMPTZ` |
| `TEXT PRIMARY KEY` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |

### 2.3 agenthub_users 表设计（复用 Supabase Auth）

`agenthub_users` 作为 `auth.users` 的 profiles 扩展表：

```sql
CREATE TABLE agenthub_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT CHECK(role IN ('admin','editor','guest')) DEFAULT 'guest',
  status TEXT CHECK(status IN ('active','disabled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- 自动创建 profile 触发器
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agenthub_users (id, name, nickname)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

关键设计决策：
- `id` 外键关联 `auth.users(id)`，级联删除
- 移除 `password` 字段 — 密码由 Supabase Auth GoTrue 管理
- 移除 `email` 字段 — 邮箱从 `auth.users.email` 获取
- `name` 最初从 email 前缀取，可在注册后修改

### 2.4 完整 PostgreSQL Schema

```sql
-- ==================== agenthub_users ====================
CREATE TABLE agenthub_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT CHECK(role IN ('admin','editor','guest')) DEFAULT 'guest',
  status TEXT CHECK(status IN ('active','disabled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== agenthub_plugins ====================
CREATE TABLE agenthub_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK(category IN ('Skill','Agent','Tool','MCP','Plugin')),
  downloads INTEGER NOT NULL DEFAULT 0,
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft','reviewing')),
  tags JSONB NOT NULL DEFAULT '[]',
  icon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== agenthub_categories ====================
CREATE TABLE agenthub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  plugin_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled','disabled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== agenthub_tags ====================
CREATE TABLE agenthub_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  plugin_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled','disabled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== agenthub_announcements ====================
CREATE TABLE agenthub_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('pinned','normal')),
  link_url TEXT NOT NULL DEFAULT '',
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  publish_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== agenthub_notification_records ====================
CREATE TABLE agenthub_notification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all','byRole')),
  target_roles JSONB NOT NULL DEFAULT '[]',
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed'))
);

-- ==================== agenthub_plugin_details ====================
CREATE TABLE agenthub_plugin_details (
  plugin_id UUID PRIMARY KEY REFERENCES agenthub_plugins(id) ON DELETE CASCADE,
  readme TEXT NOT NULL DEFAULT '',
  install_steps JSONB NOT NULL DEFAULT '[]',
  dependencies JSONB NOT NULL DEFAULT '[]',
  reviews JSONB NOT NULL DEFAULT '[]',
  version_history JSONB NOT NULL DEFAULT '[]',
  developer_name TEXT NOT NULL DEFAULT '',
  developer_description TEXT NOT NULL DEFAULT '',
  developer_website TEXT NOT NULL DEFAULT '',
  docs JSONB NOT NULL DEFAULT '[]'
);

-- ==================== agenthub_featured_collections ====================
CREATE TABLE agenthub_featured_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  plugin_ids JSONB NOT NULL DEFAULT '[]'
);
```

### 2.5 RLS（行级安全）策略

```sql
-- agenthub_users: 用户可读所有但只能更新自己的 profile
ALTER TABLE agenthub_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users viewable by all"
  ON agenthub_users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON agenthub_users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON agenthub_users FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 其他表：管理员可维护，所有人可读
ALTER TABLE agenthub_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenthub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenthub_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenthub_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenthub_notification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenthub_plugin_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenthub_featured_collections ENABLE ROW LEVEL SECURITY;
```

---

## 三、认证系统改造

### 3.1 认证流程对比

| 维度 | 当前（SQLite + Context） | 目标（Supabase Auth） |
|------|------------------------|---------------------|
| 登录接口 | `POST /api/auth/login`（自建，明文密码） | `supabase.auth.signInWithPassword()` |
| 注册接口 | `POST /api/auth/register`（自建） | `supabase.auth.signUp()` + 自动创建 agenthub_users 记录 |
| 会话存储 | localStorage（含密码） | HTTP-only cookie（Supabase SSR 管理） |
| 密码安全 | 明文 | bcrypt 哈希（Supabase GoTrue 内置） |
| 会话恢复 | 页面加载读 localStorage | Next.js Middleware 自动刷新 cookie |
| 退出登录 | 清 localStorage | `supabase.auth.signOut()` |
| 邮箱验证 | 无 | 支持（可选开启） |

### 3.2 客户端组件架构

| 新增文件 | 用途 |
|---------|------|
| `src/lib/supabase/client.ts` | `createBrowserClient()` — 浏览器端 Supabase 客户端 |
| `src/lib/supabase/server.ts` | `createServerClient()` — 服务端 Supabase 客户端 |
| `src/lib/supabase/middleware.ts` | `updateSession()` — Middleware 辅助 |
| `src/middleware.ts` | Next.js Middleware — 自动刷新会话/重定向未认证用户 |

### 3.3 改造后的 AuthContext

```typescript
// src/lib/auth-context.tsx — 基于 Supabase Auth
type AuthState = {
  user: User | null;          // Supabase Auth User
  profile: UserProfile | null; // agenthub_users 记录（含 role, nickname）
  isAdmin: boolean;
  isEditor: boolean;
  loading: boolean;
};

// login: supabase.auth.signInWithPassword({ email, password })
// register: supabase.auth.signUp({ email, password }) + 等待触发器创建 profile
// logout: supabase.auth.signOut()
// 角色: 通过 supabase.from("agenthub_users").select("role,status").eq("id", user.id)
```

### 3.4 删除的文件

- `src/app/api/auth/login/route.ts` — 不再需要自建登录 API
- `src/app/api/auth/register/route.ts` — 不再需要自建注册 API

---

## 四、文件存储改造

### 4.1 存储需求

项目中真正需要文件存储的只有 **插件图标**。README、安装步骤、依赖等均为结构化数据，继续存数据库。

### 4.2 存储桶设计

```
Supabase Storage
└── agenthub bucket（公开可读）
    └── icons/
        ├── {plugin_id}.svg
        └── {plugin_id}.png
```

### 4.3 存储配置 SQL

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('agenthub', 'agenthub', true);

CREATE POLICY "Public can view icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agenthub');

CREATE POLICY "Authenticated users can upload icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agenthub' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agenthub' AND owner = auth.uid());
```

### 4.4 前端改造点

- 管理后台插件表单页：新增图标文件上传 input + 预览
- 插件详情页/Marketplace 卡片：`<img src={publicUrl}>` 替换占位符
- `plugins.icon` 字段：存储 `icons/{plugin_id}.png` 路径

---

## 五、数据迁移策略

### 5.1 迁移脚本 `src/lib/db/migrate.ts`

一次性执行的 Node.js 脚本，将 SQLite data.db 中的所有数据迁移到 Supabase：

1. 读取 SQLite `data.db` 中所有表的数据
2. 类型转换（INTEGER 0/1 → boolean, TEXT ISO → TIMESTAMPTZ, TEXT JSON → JSONB）
3. 在 Supabase 中创建 auth.users 记录（为 SQLite 中的用户生成密码哈希）
4. 将数据写入对应 `agenthub_*` 表
5. 输出迁移报告

### 5.2 执行方式

```bash
npx tsx src/lib/db/migrate.ts
```

---

## 六、API Routes 改造规则

### 6.1 服务端客户端创建

每个 API Route 使用统一的模式：

```typescript
// src/app/api/plugins/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  
  const { data, error } = await supabase
    .from("agenthub_plugins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
```

### 6.2 改造模式

| API 文件 | 查询旧写法 | 查询新写法 |
|----------|----------|----------|
| plugins/route.ts | `db.prepare("SELECT * FROM plugins").all()` | `supabase.from("agenthub_plugins").select("*")` |
| plugins/[id]/route.ts | `db.prepare("SELECT * FROM plugins WHERE id=?").get(id)` | `supabase.from("agenthub_plugins").select("*").eq("id", id).single()` |
| 所有 INSERT | `db.prepare("INSERT ...").run(...)` | `supabase.from("agenthub_*").insert({...})` |
| 所有 UPDATE | `db.prepare("UPDATE ...").run(...)` | `supabase.from("agenthub_*").update({...}).eq("id", id)` |
| 所有 DELETE | `db.prepare("DELETE ...").run(...)` | `supabase.from("agenthub_*").delete().eq("id", id)` |

### 6.3 保留的 API 接口列表（不变）

所有 REST API 端点保持不变，只改造内部实现：

- `GET/POST /api/users` — 改为操作 `agenthub_users`（含 Supabase Auth 联动）
- `GET/PUT/DELETE /api/users/[id]` — 同上
- `GET/POST/PUT/DELETE /api/plugins/...` — 操作 `agenthub_plugins`
- `GET/POST/PUT/DELETE /api/categories/...` — 操作 `agenthub_categories`
- `GET/POST/PUT/DELETE /api/tags/...` — 操作 `agenthub_tags`
- `GET/POST/PUT/DELETE /api/announcements/...` — 操作 `agenthub_announcements`
- `GET/POST /api/notification-records/...` — 操作 `agenthub_notification_records`
- `GET /api/featured-collections` — 操作 `agenthub_featured_collections`
- `GET /api/health` — 保留，改为 Supabase 健康检查

---

## 七、错误处理与兜底

### 7.1 错误处理策略

- 所有 `supabase.from().select()` 调用检查 `{ error }` 返回值
- API 统一响应格式保持 `{ success: boolean, data?: T, error?: string }`
- Middleware 中会话过期时重定向到 `/login`
- Storage 上传失败时在 UI 显示 Toast 错误

### 7.2 Service Role Key 降级

- 管理操作（Admin CRUD）使用 service_role key 的 Supabase 客户端
- 普通操作使用 anon key 的 Supabase 客户端 + RLS 保护
- 如 service_role key 不可用，管理操作暂时使用 anon key + 更宽松的 RLS

---

## 八、不在范围内

- 不改造前端页面 UI/UX
- 不新增功能（YAGNI）
- 不修改 Tailwind CSS 配置
- 不修改 Next.js 构建配置（next.config.ts）
- 不新增测试框架（保持现有测试方式）
