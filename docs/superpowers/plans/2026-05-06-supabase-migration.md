# Supabase 全量迁移 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 AgentHub 项目的 SQLite 数据层、自建认证系统、文件存储全部迁移到 Self-hosted Supabase

**架构：** Next.js 16 App Router 通过 `@supabase/ssr` 客户端统一连接 Supabase（GoTrue Auth + PostgreSQL + Storage），用 HTTP-only cookie 管理会话，用 RLS 保护数据，用 Supabase SDK 替代原始 SQL 查询

**技术栈：** Next.js 16.2.4 + React 19 + `@supabase/supabase-js` + `@supabase/ssr` + Supabase Self-hosted (115.190.177.105:8000)

**Supabase 连接信息（来自 .trae/mcp.json）：**
- URL: `http://115.190.177.105:8000`
- ANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc4MDUwMDU3LCJleHAiOjE5MzU3MzAwNTd9.SH81Inkqmc99I0X07_S5WHnZ8hxtgF__vTLVBFGO4H4`
- SERVICE_ROLE_KEY: 待获取（从 Supabase Studio 获取后填入）

---

### 任务 1：安装依赖并创建环境变量

**文件：**
- 修改：`frontend/package.json`
- 创建：`frontend/.env.local`

- [ ] **步骤 1：安装 Supabase 依赖并移除 SQLite 依赖**

```bash
cd frontend
npm install @supabase/supabase-js @supabase/ssr
npm uninstall better-sqlite3 @types/better-sqlite3
```

- [ ] **步骤 2：验证 package.json 变更**

运行：`node -e "const p = require('./package.json'); console.log('supabase-js:', !!p.dependencies['@supabase/supabase-js']); console.log('supabase-ssr:', !!p.dependencies['@supabase/ssr']); console.log('better-sqlite3:', !!p.dependencies['better-sqlite3']);"`
预期：`supabase-js: true`, `supabase-ssr: true`, `better-sqlite3: false`

- [ ] **步骤 3：创建 .env.local**

```bash
cat > frontend/.env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=http://115.190.177.105:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc4MDUwMDU3LCJleHAiOjE5MzU3MzAwNTd9.SH81Inkqmc99I0X07_S5WHnZ8hxtgF__vTLVBFGO4H4
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ENVEOF
```

预期：创建 `frontend/.env.local`，包含三个环境变量

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add package.json package-lock.json .env.local && git commit -m "chore: 安装 @supabase/supabase-js @supabase/ssr，移除 better-sqlite3，添加 .env.local"
```

---

### 任务 2：创建 Supabase 客户端库

**文件：**
- 创建：`frontend/src/lib/supabase/client.ts`
- 创建：`frontend/src/lib/supabase/server.ts`

- [ ] **步骤 1：创建浏览器端客户端 `frontend/src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **步骤 2：创建服务端客户端 `frontend/src/lib/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 可在 Server Components 中忽略
          }
        },
      },
    }
  );
}

export async function createServerSupabaseAdmin() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

- [ ] **步骤 3：运行 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit src/lib/supabase/client.ts src/lib/supabase/server.ts
```

预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/lib/supabase/ && git commit -m "feat: 创建 Supabase 客户端库（浏览器端 + 服务端）"
```

---

### 任务 3：Supabase 数据库 Schema Migration

**文件：**
- 创建：`frontend/supabase/migrations/001_schema.sql`

- [ ] **步骤 1：创建 Migration SQL 文件**

```sql
-- ==================== agenthub_users ====================
DROP TABLE IF EXISTS public.agenthub_users CASCADE;
CREATE TABLE public.agenthub_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT CHECK(role IN ('admin','editor','guest')) DEFAULT 'guest',
  status TEXT CHECK(status IN ('active','disabled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agenthub_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users viewable by all"
  ON public.agenthub_users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.agenthub_users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON public.agenthub_users FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete users"
  ON public.agenthub_users FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 自动创建 profile 触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agenthub_users (id, name, nickname)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(split_part(NEW.email, '@', 1), ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== agenthub_plugins ====================
CREATE TABLE public.agenthub_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK(category IN ('Skill','Agent','Tool','MCP','Plugin')),
  downloads INTEGER NOT NULL DEFAULT 0,
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft','reviewing')),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agenthub_plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plugins viewable by all"
  ON public.agenthub_plugins FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert plugins"
  ON public.agenthub_plugins FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners/admins can update plugins"
  ON public.agenthub_plugins FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role IN ('admin','editor'))
  );

CREATE POLICY "Admins can delete plugins"
  ON public.agenthub_plugins FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_categories ====================
CREATE TABLE public.agenthub_categories (
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

ALTER TABLE public.agenthub_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by all"
  ON public.agenthub_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.agenthub_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_tags ====================
CREATE TABLE public.agenthub_tags (
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

ALTER TABLE public.agenthub_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags viewable by all"
  ON public.agenthub_tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.agenthub_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_announcements ====================
CREATE TABLE public.agenthub_announcements (
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

ALTER TABLE public.agenthub_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements viewable by all"
  ON public.agenthub_announcements FOR SELECT USING (true);

CREATE POLICY "Admins can manage announcements"
  ON public.agenthub_announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_notification_records ====================
CREATE TABLE public.agenthub_notification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all','byRole')),
  target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed'))
);

ALTER TABLE public.agenthub_notification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications viewable by all"
  ON public.agenthub_notification_records FOR SELECT USING (true);

CREATE POLICY "Admins can manage notifications"
  ON public.agenthub_notification_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_plugin_details ====================
CREATE TABLE public.agenthub_plugin_details (
  plugin_id UUID PRIMARY KEY REFERENCES public.agenthub_plugins(id) ON DELETE CASCADE,
  readme TEXT NOT NULL DEFAULT '',
  install_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  developer_name TEXT NOT NULL DEFAULT '',
  developer_description TEXT NOT NULL DEFAULT '',
  developer_website TEXT NOT NULL DEFAULT '',
  docs JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.agenthub_plugin_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plugin details viewable by all"
  ON public.agenthub_plugin_details FOR SELECT USING (true);

CREATE POLICY "Editors can manage plugin details"
  ON public.agenthub_plugin_details FOR ALL USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role IN ('admin','editor'))
  );

-- ==================== agenthub_featured_collections ====================
CREATE TABLE public.agenthub_featured_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  plugin_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.agenthub_featured_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections viewable by all"
  ON public.agenthub_featured_collections FOR SELECT USING (true);

CREATE POLICY "Admins can manage collections"
  ON public.agenthub_featured_collections FOR ALL USING (
    EXISTS (SELECT 1 FROM public.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== Storage ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('agenthub', 'agenthub', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view icons" ON storage.objects;
CREATE POLICY "Public can view icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agenthub');

DROP POLICY IF EXISTS "Authenticated users can upload icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agenthub' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;
CREATE POLICY "Users can delete their uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agenthub' AND owner = auth.uid());
```

- [ ] **步骤 2：通过 MCP 执行 Migration SQL**

使用 MCP `mcp_supabase-self-hosted_postgrestRequest` 执行上述 SQL（需分多次调用，因为 SQL 较长）。或者使用 `sqlToRest` 转换工具。

方式 A：通过 PostgREST 的 `/rpc/` 端点（如果有）执行 SQL
方式 B：手动通过 Supabase Studio 的 SQL Editor 执行上述 SQL 文件

预期：所有 8 张表创建成功，RLS 策略生效，存储桶创建成功

- [ ] **步骤 3：验证表是否存在**

通过 MCP `sqlToRest` 转换 SQL：
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'agenthub_%';
```

或通过 PostgREST：
`GET /agenthub_users?limit=1`

预期：返回 200，证实表已存在

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add supabase/migrations/001_schema.sql && git commit -m "feat: 添加 Supabase 数据库 schema migration（8 张表 + RLS + 触发器 + Storage）"
```

---

### 任务 4：创建 Next.js Middleware

**文件：**
- 创建：`frontend/src/middleware.ts`

- [ ] **步骤 1：创建 middleware.ts**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/marketplace";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/middleware.ts
```

预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
cd frontend && git add src/middleware.ts && git commit -m "feat: 添加 Next.js Middleware（Supabase 会话刷新 + 管理路由守卫）"
```

---

### 任务 5：重构 AuthContext

**文件：**
- 修改：`frontend/src/lib/auth-context.tsx`

- [ ] **步骤 1：重写 auth-context.tsx**

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  role: "admin" | "editor" | "guest";
  status: "active" | "disabled";
}

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("agenthub_users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        name: data.name,
        nickname: data.nickname,
        phone: data.phone || "",
        role: data.role,
        status: data.status,
      };
    } catch {
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch {
        // 会话获取失败，静默处理
      }
      setIsLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        setUser(data.user);
        const profileData = await fetchProfile(data.user.id);
        setProfile(profileData);
        if (profileData?.status === "disabled") {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          return { success: false, error: "账号已被禁用" };
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [supabase, fetchProfile]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name || data.email.split("@")[0],
            phone: data.phone || "",
          },
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (authData.user) {
        setUser(authData.user);
        // 等待触发器创建 profile，然后读取
        await new Promise((resolve) => setTimeout(resolve, 500));
        const profileData = await fetchProfile(authData.user.id);
        if (profileData) {
          // 更新 name 和 phone
          await supabase
            .from("agenthub_users")
            .update({
              name: data.name || data.email.split("@")[0],
              phone: data.phone || "",
            })
            .eq("id", authData.user.id);
          setProfile({
            ...profileData,
            name: data.name || data.email.split("@")[0],
            phone: data.phone || "",
          });
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, [supabase, fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/marketplace");
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    if (profileData) setProfile(profileData);
  }, [user, fetchProfile]);

  const isAdmin = profile?.role === "admin";
  const isEditor = profile?.role === "admin" || profile?.role === "editor";
  const isLoggedIn = user !== null && profile !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        isAdmin,
        isEditor,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/lib/auth-context.tsx
```

预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
cd frontend && git add src/lib/auth-context.tsx && git commit -m "refactor: 基于 Supabase Auth 重构 AuthContext（移除 localStorage，使用 Supabase 会话）"
```

---

### 任务 6：适配登录页和注册页

**文件：**
- 修改：`frontend/src/app/login/page.tsx`
- 修改：`frontend/src/app/register/page.tsx`

- [ ] **步骤 1：适配登录页 login/page.tsx**

修改 `handleSubmit` 中的 `login` 调用方式：

```typescript
// 旧代码（文件内第 49-63 行附近）：
//   const result = await login(account.trim(), password);
// 改为：
const result = await login(account.trim(), password);
```

登录页只需确保 `login` 的参数改为 `(email, password)` —— 当前页面已有 `account` 和 `password` 两个字段，且后端 Supabase Auth 只接受 email+password。由于登录页当前输入框 label 为"用户名 / 手机号"，需改为邮箱或保持现有 UI 不变，在调用处保持 `login(account.trim(), password)` 传参方式即可——Supabase `signInWithPassword` 的 email 参数接受的是登录标识。

修改 `login/page.tsx` 第 53 行附近，将错误提示改为更准确描述：

```tsx
// 第 21 行：表单校验提示
if (!account.trim()) {
  setError("请输入邮箱地址");
  return;
}
```

同时修改输入框 placeholder：

```tsx
placeholder="请输入邮箱地址"
```

以及 label：

```tsx
<label style={labelStyle}>邮箱</label>
```

- [ ] **步骤 2：适配注册页 register/page.tsx**

注册页的 `register()` 调用保持不变——`RegisterData` 接口含 `{ name, phone, email, password }`，与 Supabase Auth 注册接口完全匹配。

只需确认文件内 `useAuth` 解构包含 `register` 和 `isLoggedIn`，无需进一步修改。

- [ ] **步骤 3：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/app/login/page.tsx src/app/register/page.tsx
```

预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/app/login/page.tsx src/app/register/page.tsx && git commit -m "refactor: 适配登录/注册页到 Supabase Auth 调用方式"
```

---

### 任务 7：适配使用 useAuth 的 UI 组件

**文件：**
- 修改：`frontend/src/components/ui/nav-layout.tsx`
- 修改：`frontend/src/components/ui/admin-layout.tsx`
- 修改：`frontend/src/components/ui/personal-center-popover.tsx`

- [ ] **步骤 1：适配 nav-layout.tsx**

nav-layout.tsx 当前解构 `{ user, isLoggedIn, isEditor, logout }` —— 所有属性在新 AuthState 中都存在。只需确认：

```tsx
// 第 6 行附近，当前：
const { user, isLoggedIn, isEditor, logout } = useAuth();

// user 类型从 MockUser 变为 Supabase User。导航栏使用 user.name 和 user.name?.charAt(0)，
// 新 AuthState 中 profile.name 可能不同。需要改为使用 profile：
const { user, profile, isLoggedIn, isEditor, logout } = useAuth();

// 第 48 行附近显示用户名：
{user?.name}  →  {profile?.name || user?.email?.split("@")[0]}
{user?.name?.charAt(0)}  →  {profile?.name?.charAt(0) ?? "?"}
```

- [ ] **步骤 2：适配 admin-layout.tsx**

admin-layout.tsx 使用 `{ user, isLoggedIn, isLoading, isAdmin, logout }` —— 所有属性在新 AuthState 中都存在。`user` 类型变更影响显示：

```tsx
// 将显示用户名处从 user.name 改为：
{profile?.name || user?.email?.split("@")[0]}
```

文件内导入 `profile`：
```tsx
const { user, profile, isLoggedIn, isLoading, isAdmin, logout } = useAuth();
```

- [ ] **步骤 3：适配 personal-center-popover.tsx**

personal-center-popover.tsx 使用 `{ user: authUser, refreshUser }` —— 改为：

```tsx
const { user, profile, logout: authLogout, refreshProfile } = useAuth();
```

文件中引用 `authUser.name` 的地方改为 `profile?.name`，`refreshUser()` 改为 `refreshProfile()`。

- [ ] **步骤 4：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/components/ui/nav-layout.tsx src/components/ui/admin-layout.tsx src/components/ui/personal-center-popover.tsx
```

预期：无类型错误

- [ ] **步骤 5：Commit**

```bash
cd frontend && git add src/components/ui/nav-layout.tsx src/components/ui/admin-layout.tsx src/components/ui/personal-center-popover.tsx && git commit -m "refactor: 适配 UI 组件到新的 Supabase Auth AuthState（profile 替代 user.name）"
```

---

### 任务 8：重构 api-helper.ts

**文件：**
- 修改：`frontend/src/lib/api-helper.ts`

- [ ] **步骤 1：重写 api-helper.ts，移除 ensureDb**

```typescript
export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export function toCamelCaseArray(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  return arr.map(toCamelCase);
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function error(message: string): ApiResponse<never> {
  return { success: false, error: message };
}

export function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return Response.json(data, {
    status: data.success ? status : status >= 400 ? status : 400,
  });
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/lib/api-helper.ts
```

预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
cd frontend && git add src/lib/api-helper.ts && git commit -m "refactor: 移除 api-helper.ts 中的 ensureDb（数据库初始化改由 Supabase 管理）"
```

---

### 任务 9：迁移 health API

**文件：**
- 修改：`frontend/src/app/api/health/route.ts`

- [ ] **步骤 1：重写 health route**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("agenthub_users")
      .select("count", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      users_count: data,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **步骤 2：Commit**

```bash
cd frontend && git add src/app/api/health/route.ts && git commit -m "refactor: 迁移 health API 到 Supabase"
```

---

### 任务 10：迁移 plugins API

**文件：**
- 修改：`frontend/src/app/api/plugins/route.ts`
- 修改：`frontend/src/app/api/plugins/[id]/route.ts`
- 修改：`frontend/src/app/api/plugins/[id]/detail/route.ts`

- [ ] **步骤 1：重写 plugins/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .insert({
        name: body.name || "",
        description: body.description || "",
        version: body.version || "1.0.0",
        author: body.author || "",
        category: body.category || "Skill",
        downloads: body.downloads ?? 0,
        rating: body.rating ?? 0,
        status: body.status || "draft",
        tags: body.tags || [],
        icon: body.icon || "",
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：重写 plugins/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("插件不存在"), 404);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: existing, error: getErr } = await supabase
      .from("agenthub_plugins")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("插件不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.version !== undefined) updates.version = body.version;
    if (body.author !== undefined) updates.author = body.author;
    if (body.category !== undefined) updates.category = body.category;
    if (body.downloads !== undefined) updates.downloads = body.downloads;
    if (body.rating !== undefined) updates.rating = body.rating;
    if (body.status !== undefined) updates.status = body.status;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.icon !== undefined) updates.icon = body.icon;

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { error: err } = await supabase
      .from("agenthub_plugins")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 3：重写 plugins/[id]/detail/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: plugin, error: pluginErr } = await supabase
      .from("agenthub_plugins")
      .select("id")
      .eq("id", id)
      .single();

    if (pluginErr || !plugin) return jsonResponse(error("插件不存在"), 404);

    const { data: detail, error: detailErr } = await supabase
      .from("agenthub_plugin_details")
      .select("*")
      .eq("plugin_id", id)
      .single();

    if (detailErr || !detail) {
      return jsonResponse(
        success({
          pluginId: id,
          readme: "",
          installSteps: [],
          dependencies: [],
          reviews: [],
          versionHistory: [],
          developer: { name: "", description: "", website: "" },
          docs: [],
        })
      );
    }

    return jsonResponse(
      success({
        pluginId: detail.plugin_id,
        readme: detail.readme,
        installSteps: detail.install_steps,
        dependencies: detail.dependencies,
        reviews: detail.reviews,
        versionHistory: detail.version_history,
        developer: {
          name: detail.developer_name,
          description: detail.developer_description,
          website: detail.developer_website,
        },
        docs: detail.docs,
      })
    );
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 4：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/app/api/plugins/route.ts src/app/api/plugins/\[id\]/route.ts src/app/api/plugins/\[id\]/detail/route.ts
```

预期：无类型错误

- [ ] **步骤 5：Commit**

```bash
cd frontend && git add src/app/api/plugins/ && git commit -m "refactor: 迁移 plugins API 到 Supabase（列表/详情/详情扩展）"
```

---

### 任务 11：迁移 categories API

**文件：**
- 修改：`frontend/src/app/api/categories/route.ts`
- 修改：`frontend/src/app/api/categories/[id]/route.ts`

- [ ] **步骤 1：重写 categories/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data: maxRow } = await supabase
      .from("agenthub_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data, error: err } = await supabase
      .from("agenthub_categories")
      .insert({
        name: body.name || "",
        icon: body.icon || "",
        description: body.description || "",
        plugin_count: body.pluginCount ?? 0,
        sort_order: body.sortOrder ?? sortOrder,
        status: body.status || "enabled",
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：重写 categories/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("分类不存在"), 404);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: existing, error: getErr } = await supabase
      .from("agenthub_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("分类不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.description !== undefined) updates.description = body.description;
    if (body.pluginCount !== undefined) updates.plugin_count = body.pluginCount;
    if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;
    if (body.status !== undefined) updates.status = body.status;

    const { data, error: err } = await supabase
      .from("agenthub_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { error: err } = await supabase
      .from("agenthub_categories")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 3：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/app/api/categories/route.ts src/app/api/categories/\[id\]/route.ts
```

预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/app/api/categories/ && git commit -m "refactor: 迁移 categories API 到 Supabase"
```

---

### 任务 12：迁移 tags API

**文件：**
- 修改：`frontend/src/app/api/tags/route.ts`
- 修改：`frontend/src/app/api/tags/[id]/route.ts`

- [ ] **步骤 1：重写 tags/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_tags")
      .select("*")
      .order("sort_order", { ascending: true });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data: maxRow } = await supabase
      .from("agenthub_tags")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data, error: err } = await supabase
      .from("agenthub_tags")
      .insert({
        name: body.name || "",
        color: body.color || "#cc785c",
        icon: body.icon || "",
        description: body.description || "",
        plugin_count: body.pluginCount ?? 0,
        sort_order: body.sortOrder ?? sortOrder,
        status: body.status || "enabled",
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：重写 tags/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_tags")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("标签不存在"), 404);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: existing, error: getErr } = await supabase
      .from("agenthub_tags")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("标签不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.description !== undefined) updates.description = body.description;
    if (body.pluginCount !== undefined) updates.plugin_count = body.pluginCount;
    if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;
    if (body.status !== undefined) updates.status = body.status;

    const { data, error: err } = await supabase
      .from("agenthub_tags")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { error: err } = await supabase
      .from("agenthub_tags")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 3：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/app/api/tags/route.ts src/app/api/tags/\[id\]/route.ts
```

预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/app/api/tags/ && git commit -m "refactor: 迁移 tags API 到 Supabase"
```

---

### 任务 13：迁移 announcements API

**文件：**
- 修改：`frontend/src/app/api/announcements/route.ts`
- 修改：`frontend/src/app/api/announcements/[id]/route.ts`

- [ ] **步骤 1：重写 announcements/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .insert({
        title: body.title || "",
        content: body.content || "",
        priority: body.priority || "normal",
        link_url: body.linkUrl || "",
        is_dismissible: body.isDismissible !== false,
        is_active: body.isActive !== false,
        publish_at: body.publishAt || null,
        expire_at: body.expireAt || null,
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：重写 announcements/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("公告不存在"), 404);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: existing, error: getErr } = await supabase
      .from("agenthub_announcements")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("公告不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.linkUrl !== undefined) updates.link_url = body.linkUrl;
    if (body.isDismissible !== undefined) updates.is_dismissible = body.isDismissible;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.publishAt !== undefined) updates.publish_at = body.publishAt || null;
    if (body.expireAt !== undefined) updates.expire_at = body.expireAt || null;

    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { error: err } = await supabase
      .from("agenthub_announcements")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 3：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/app/api/announcements/route.ts src/app/api/announcements/\[id\]/route.ts
```

预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/app/api/announcements/ && git commit -m "refactor: 迁移 announcements API 到 Supabase"
```

---

### 任务 14：迁移 users API + notification-records + featured-collections API

**文件：**
- 修改：`frontend/src/app/api/users/route.ts`
- 修改：`frontend/src/app/api/users/[id]/route.ts`
- 修改：`frontend/src/app/api/notification-records/route.ts`
- 修改：`frontend/src/app/api/featured-collections/route.ts`

- [ ] **步骤 1：重写 users/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: body.email || "",
      password: body.password || "",
      email_confirm: true,
    });

    if (authErr) return jsonResponse(error(authErr.message), 500);

    if (authData.user) {
      const { error: profileErr } = await supabase
        .from("agenthub_users")
        .update({
          name: body.name || "",
          nickname: body.nickname || body.name || "",
          phone: body.phone || "",
          role: body.role || "guest",
          status: body.status || "active",
        })
        .eq("id", authData.user.id);

      if (profileErr) return jsonResponse(error(profileErr.message), 500);

      const { data: profile } = await supabase
        .from("agenthub_users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      return jsonResponse(success(profile), 201);
    }

    return jsonResponse(error("用户创建失败"), 500);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：重写 users/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_users")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("用户不存在"), 404);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: existing, error: getErr } = await supabase
      .from("agenthub_users")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("用户不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.role !== undefined) updates.role = body.role;
    if (body.status !== undefined) updates.status = body.status;
    updates.last_active_at = new Date().toISOString();

    const { data, error: err } = await supabase
      .from("agenthub_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { error: err } = await supabase
      .from("agenthub_users")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 3：重写 notification-records/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_notification_records")
      .select("*")
      .order("sent_at", { ascending: false });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data, error: err } = await supabase
      .from("agenthub_notification_records")
      .insert({
        content: body.content || "",
        target_type: body.targetType || "all",
        target_roles: body.targetRoles || [],
        status: body.status || "sent",
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 4：重写 featured-collections/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_featured_collections")
      .select("*");

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 5：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit src/app/api/users/route.ts src/app/api/users/\[id\]/route.ts src/app/api/notification-records/route.ts src/app/api/featured-collections/route.ts
```

预期：无类型错误

- [ ] **步骤 6：Commit**

```bash
cd frontend && git add src/app/api/users/ src/app/api/notification-records/ src/app/api/featured-collections/ && git commit -m "refactor: 迁移 users + notification-records + featured-collections API 到 Supabase"
```

---

### 任务 15：删除旧 SQLite 文件和旧 Auth API Routes

**文件：**
- 删除：`frontend/src/app/api/auth/login/route.ts`
- 删除：`frontend/src/app/api/auth/register/route.ts`
- 删除：`frontend/src/lib/db/index.ts`
- 删除：`frontend/src/lib/db/schema.ts`
- 删除：`frontend/src/lib/db/seed.ts`
- 删除：`frontend/src/lib/mock/users.ts`（如果还存在）
- 删除：`frontend/data.db`

- [ ] **步骤 1：删除旧 SQLite 文件和 Auth API 路由**

```bash
cd frontend
rm -f src/app/api/auth/login/route.ts
rm -f src/app/api/auth/register/route.ts
rm -f src/lib/db/index.ts
rm -f src/lib/db/schema.ts
rm -f src/lib/db/seed.ts
rm -f data.db
```

- [ ] **步骤 2：检查残留引用**

```bash
cd frontend && grep -r "from.*db/index\|from.*db/schema\|from.*db/seed\|from.*better-sqlite3\|ensureDb" src/ --include="*.ts" --include="*.tsx" || echo "No references found"
```

预期：`No references found` 或仅剩 migrate.ts 中的引用

- [ ] **步骤 3：验证构建**

```bash
cd frontend && npx next build 2>&1 | tail -20
```

预期：构建成功，无 SQLite 相关错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add -A && git commit -m "chore: 删除旧 SQLite 文件和 Auth API 路由"
```

---

### 任务 16：创建 SQLite 到 Supabase 数据迁移脚本

**文件：**
- 创建：`frontend/src/lib/db/migrate.ts`

- [ ] **步骤 1：创建迁移脚本**

```typescript
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import path from "path";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DB_PATH = path.join(process.cwd(), "data.db");

function toISO8601(val: string | null): string | null {
  if (!val) return null;
  if (val.includes("T")) return val.replace(" ", "T") + "+08:00";
  return val.replace(" ", "T") + "+08:00";
}

async function main() {
  const db = new Database(DB_PATH);
  console.log("Opened SQLite at", DB_PATH);

  const tables = [
    "users", "plugins", "categories", "tags",
    "announcements", "notification_records",
    "plugin_details", "featured_collections",
  ];

  for (const table of tables) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    console.log(`Found ${rows.length} rows in ${table}`);

    if (rows.length === 0) continue;

    const mappedRows = rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

        if (table === "announcements") {
          if (key === "is_dismissible" || key === "is_active") {
            mapped[camelKey] = value === 1 || value === true;
            continue;
          }
        }

        if (table === "users") {
          if (key === "id") mapped.id = value;
          else if (key === "name") mapped.name = value;
          else if (key === "nickname") mapped.nickname = value;
          else if (key === "phone") mapped.phone = value;
          else if (key === "role") mapped.role = value;
          else if (key === "status") mapped.status = value;
          else if (key === "created_at") mapped.created_at = toISO8601(value as string);
          else if (key === "last_active_at") mapped.last_active_at = toISO8601(value as string);
          continue;
        }

        if (key === "tags" || key === "install_steps" || key === "dependencies" ||
            key === "reviews" || key === "version_history" || key === "target_roles" ||
            key === "plugin_ids" || key === "docs") {
          if (typeof value === "string") {
            try { mapped[key] = JSON.parse(value); } catch { mapped[key] = []; }
          } else {
            mapped[key] = value;
          }
          continue;
        }

        if (key === "created_at" || key === "updated_at" || key === "sent_at" ||
            key === "publish_at" || key === "expire_at" || key === "last_active_at") {
          mapped[key] = toISO8601(value as string);
          continue;
        }

        if (table === "plugin_details" && key === "plugin_id") {
          mapped.plugin_id = value;
          continue;
        }

        if (table !== "users") {
          mapped[key] = value;
        }
      }
      return mapped;
    });

    const tableMap: Record<string, string> = {
      users: "agenthub_users",
      plugins: "agenthub_plugins",
      categories: "agenthub_categories",
      tags: "agenthub_tags",
      announcements: "agenthub_announcements",
      notification_records: "agenthub_notification_records",
      plugin_details: "agenthub_plugin_details",
      featured_collections: "agenthub_featured_collections",
    };

    const supabaseTable = tableMap[table];
    if (table === "users") {
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const email = (r.email as string) || `${r.id}@migrated.local`;
        const password = (r.password as string) || "migrated123";
        const { error: authErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (authErr) {
          console.log(`User ${email}: ${authErr.message}`);
        }
      }
      const profileRows = mappedRows.map((mapped) => {
        const r = mapped as Record<string, unknown>;
        return {
          name: r.name,
          nickname: r.nickname,
          phone: r.phone,
          role: r.role,
          status: r.status,
          created_at: r.created_at,
          last_active_at: r.last_active_at,
        };
      });
      // profiles will be auto-created by trigger
      console.log(`Users: created ${rows.length} auth users (profiles auto-created by trigger)`);
      continue;
    }

    const batchSize = 50;
    for (let i = 0; i < mappedRows.length; i += batchSize) {
      const batch = mappedRows.slice(i, i + batchSize);
      const { error: insertErr } = await supabase
        .from(supabaseTable)
        .upsert(batch as never, { onConflict: "id" });

      if (insertErr) {
        console.log(`Error inserting ${supabaseTable} batch ${i}: ${insertErr.message}`);
      } else {
        console.log(`Inserted ${batch.length} rows into ${supabaseTable}`);
      }
    }
  }

  db.close();
  console.log("Migration complete!");
}

main().catch(console.error);
```

- [ ] **步骤 2：运行迁移脚本**

```bash
cd frontend && npx tsx src/lib/db/migrate.ts
```

预期：成功迁移所有数据到 Supabase

- [ ] **步骤 3：验证迁移结果**

通过 MCP 检查：
```
GET /agenthub_plugins?limit=1
```
预期：返回数据

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/lib/db/migrate.ts && git commit -m "feat: 添加 SQLite→Supabase 数据迁移脚本"
```

---

### 任务 17：添加插件图标上传功能（Storage 集成）

**文件：**
- 修改：插件管理后台页面 `frontend/src/app/admin/plugins/page.tsx`（如果存在上传表单）

- [ ] **步骤 1：在插件表单中添加图标上传**

在插件创建/编辑表单中添加文件上传 input：

```tsx
// 文件上传组件添加到插件管理表单中
const [iconFile, setIconFile] = useState<File | null>(null);
const [iconPreview, setIconPreview] = useState<string>("");
const supabase = createClient();

async function handleIconUpload(pluginId: string): Promise<string | null> {
  if (!iconFile) return null;
  const ext = iconFile.name.split(".").pop();
  const filePath = `icons/${pluginId}.${ext}`;
  
  const { error } = await supabase.storage
    .from("agenthub")
    .upload(filePath, iconFile, { upsert: true });
  
  if (error) {
    console.error("Upload failed:", error.message);
    return null;
  }
  
  return filePath;
}
```

当创建新插件时需要先获取 `pluginId`，然后上传图标。页面上需添加输入：

```tsx
<div className="mb-4">
  <label>插件图标</label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        setIconFile(file);
        setIconPreview(URL.createObjectURL(file));
      }
    }}
  />
  {iconPreview && (
    <img src={iconPreview} alt="预览" className="w-16 h-16 mt-2 rounded" />
  )}
</div>
```

- [ ] **步骤 2：插件详情页使用 Storage 公开 URL**

在插件卡片和详情页中，将图标 src 改为 Supabase Storage 公开 URL：

```tsx
// 当 plugin.icon 有值时，构建公开 URL
function getIconUrl(icon: string): string {
  if (!icon) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agenthub/${icon}`;
}
```

- [ ] **步骤 3：验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
cd frontend && git add src/app/admin/plugins/ src/lib/supabase/ && git commit -m "feat: 添加插件图标 Supabase Storage 上传功能"
```

---

### 任务 18：最终验证

**文件：** 无（仅验证步骤）

- [ ] **步骤 1：运行完整构建**

```bash
cd frontend && npm run build 2>&1
```

预期：构建成功，无错误

- [ ] **步骤 2：检查未跟踪文件**

```bash
cd frontend && git status
```

预期：无未跟踪文件（除 .env.local 外），工作区干净

- [ ] **步骤 3：最终 Commit**

```bash
cd frontend && git add -A && git status
```

如果只有 `.env.local` 和 `data.db` 的删除变更，commit：

```bash
git commit -m "chore: Supabase 全量迁移完成，清理残留文件"
```

---

## 验证检查清单

迁移完成后，逐项检查：

- [ ] `npm run build` 成功，无 SQLite 相关错误
- [ ] `.env.local` 包含三个 Supabase 环境变量
- [ ] `/api/health` 返回 `{ status: "healthy", database: "connected" }`
- [ ] 注册新用户 → 自动创建 `agenthub_users` 记录（触发器）
- [ ] 登录 → Supabase cookie 正确设置，导航栏显示用户名
- [ ] `/admin` 路由 → 未登录时重定向到 `/login`
- [ ] `/login` 和 `/register` → 已登录时重定向到 `/marketplace`
- [ ] 插件列表 API `/api/plugins` → 返回 `agenthub_plugins` 表数据
- [ ] 插件图标上传 → 上传到 Storage `agenthub` bucket
- [ ] `better-sqlite3` 移除 → `package.json` 中不存在
- [ ] 所有旧 SQLite 文件已删除 → `src/lib/db/index.ts` 等不存在
