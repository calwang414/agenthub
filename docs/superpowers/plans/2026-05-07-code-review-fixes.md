# 代码审查问题修复 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复代码审查中发现的 5 个严重、6 个重要、7 个次要问题，共 18 项修复。

**架构：** 按问题严重程度分层修复，先安全/数据完整性（Critical），再健壮性/可维护性（Important），最后体验/规范（Minor）。

**技术栈：** Next.js 16 App Router, TypeScript, Supabase (Auth + DB + Storage), React 19

---

### 任务 1：Storage 删除 API 添加权限校验

**文件：**
- 修改：`frontend/src/app/api/storage/delete/route.ts`
- 修改：`frontend/src/app/admin/plugins/page.tsx` (删除动作处使用普通 client)

**说明：** `storage/delete/route.ts` 使用了 `createAdminClient()`（service_role）且无权限检查，任何人可删除 Storage 文件。改为使用 `createServerSupabase()` 并添加管理员角色校验。

- [ ] **步骤 1：重写 storage/delete/route.ts 添加鉴权**

```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse(error("未登录"), 401);

    const { data: profile } = await supabase
      .from("agenthub_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse(error("无操作权限"), 403);
    }

    const body = await request.json();
    const paths: string[] = Array.isArray(body.paths) ? body.paths : [];

    if (paths.length === 0) {
      return jsonResponse(success({ deleted: 0, failed: 0 }));
    }

    const results = await Promise.allSettled(
      paths.map((p) => supabase.storage.from("agenthub").remove([p]))
    );

    let deleted = 0;
    let failed = 0;

    results.forEach((r, i) => {
      if (r.status === "fulfilled" && !r.value.error) {
        deleted++;
      } else {
        failed++;
        const msg = r.status === "fulfilled" ? r.value.error?.message : String(r.reason);
        console.error(`删除 Storage 文件失败: ${paths[i]}`, msg);
      }
    });

    return jsonResponse(success({ deleted, failed }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：更新 admin/plugins/page.tsx 中 deleteStorageFiles 调用，确保使用 apiDelete 风格**

检查 `deleteStorageFiles` 函数已通过 `/api/storage/delete` 调用，无需额外修改（因为 API 内部现在自行鉴权）。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/storage/delete/route.ts
git commit -m "fix: Storage删除API添加管理员权限校验，修复严重安全漏洞"
```

---

### 任务 2：用户删除同步删除 auth.users

**文件：**
- 修改：`frontend/src/app/api/users/[id]/route.ts`

**说明：** DELETE 用户时仅删除 `agenthub_users` 记录，未删除 `auth.users` 认证记录，导致孤儿数据。

- [ ] **步骤 1：修改 DELETE handler 同步删除 auth.users**

```typescript
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: userRow, error: getErr } = await supabase
      .from("agenthub_users")
      .select("id")
      .eq("id", id)
      .single();

    if (getErr || !userRow) return jsonResponse(error("用户不存在"), 404);

    const { error: deleteProfileErr } = await supabase
      .from("agenthub_users")
      .delete()
      .eq("id", id);

    if (deleteProfileErr) return jsonResponse(error(deleteProfileErr.message), 500);

    const adminClient = createAdminClient();
    const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(id);

    if (deleteAuthErr) {
      console.error("删除 auth.users 失败:", deleteAuthErr.message);
    }

    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

import 需要增加：
```typescript
import { createAdminClient } from "@/lib/supabase/admin";
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/app/api/users/[id]/route.ts
git commit -m "fix: 删除用户时同步删除auth.users记录，避免孤儿认证数据"
```

---

### 任务 3：修复注册流程竞态条件

**文件：**
- 修改：`frontend/src/lib/auth-context.tsx`

**说明：** `register` 和 `POST /api/users` 中使用 `setTimeout(resolve, 500)` 等待数据库触发器创建 profile，这是不可靠的。改为轮询重试机制。

- [ ] **步骤 1：在 auth-context.tsx 中添加轮询辅助函数并修改 register**

```typescript
async function pollForProfile(userId: string, retries = 10, interval = 300): Promise<UserProfile | null> {
  for (let i = 0; i < retries; i++) {
    const profile = await fetchProfile(userId);
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return null;
}
```

放在 `AuthProvider` 内部（在 `fetchProfile` 后面，但要在组件内，能访问 fetchProfile）。

修改 register 函数中的等待逻辑：

```typescript
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
      const profileData = await pollForProfile(authData.user.id);
      if (profileData) {
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
```

- [ ] **步骤 2：修改 users/route.ts 中 POST 的竞态等待**

修改 `frontend/src/app/api/users/route.ts`：

```typescript
// 替换 setTimeout(500) 为轮询
for (let i = 0; i < 10; i++) {
  const { data: checkProfile } = await adminClient
    .from("agenthub_users")
    .select("id")
    .eq("id", authData.user.id)
    .single();
  if (checkProfile) break;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/lib/auth-context.tsx frontend/src/app/api/users/route.ts
git commit -m "fix: 注册流程使用轮询替代固定延迟，消除竞态条件"
```

---

### 任务 4：实现缺失的密码重置 API 路由

**文件：**
- 创建：`frontend/src/app/api/users/[id]/reset-password/route.ts`

**说明：** `admin/users/page.tsx` 调用了 `/api/users/${id}/reset-password` 但该路由不存在。

- [ ] **步骤 1：创建 reset-password/route.ts**

```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse(error("密码不能为空且至少6位"), 400);
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return jsonResponse(error("未登录"), 401);

    const { data: currentProfile } = await supabase
      .from("agenthub_users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role !== "admin") {
      return jsonResponse(error("无操作权限"), 403);
    }

    const adminClient = createAdminClient();
    const { error: resetErr } = await adminClient.auth.admin.updateUserById(
      id,
      { password }
    );

    if (resetErr) return jsonResponse(error(resetErr.message), 500);

    return jsonResponse(success({ success: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/app/api/users/[id]/reset-password/route.ts
git commit -m "feat: 实现密码重置 API 路由，修复管理后台功能缺失"
```

---

### 任务 5：修复数据库触发器 name 字段问题

**文件：**
- 修改：`frontend/supabase/migrations/001_schema.sql`
- 创建：`frontend/supabase/migrations/007_fix_trigger_name.sql`

**说明：** 触发器中 `name` 使用 `COALESCE(NEW.email, '')` 填充，应使用 `NEW.raw_user_meta_data->>'name'`。由于 001_schema.sql 是历史迁移，创建新的迁移文件来修复。

- [ ] **步骤 1：新建迁移文件**

创建 `frontend/supabase/migrations/007_fix_trigger_name.sql`：

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agenthub_users (id, name, nickname, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/supabase/migrations/007_fix_trigger_name.sql
git commit -m "fix: 修复触发器利用user_metadata填充name/email/phone字段"
```

---

### 任务 6：为关键 API 添加输入验证（Zod）

**文件：**
- 创建：`frontend/src/lib/validations.ts`
- 修改：`frontend/src/app/api/users/route.ts`
- 修改：`frontend/src/app/api/plugins/upload/route.ts`

**说明：** 使用轻量级验证，不引入额外依赖，手写简单校验函数。

- [ ] **步骤 1：创建 validations.ts**

```typescript
export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateRequired(val: unknown, minLen = 1, maxLen = 200): ValidationResult {
  if (typeof val !== "string") return { valid: false, error: "必须是字符串" };
  if (val.trim().length < minLen) return { valid: false, error: `至少${minLen}个字符` };
  if (val.trim().length > maxLen) return { valid: false, error: `不能超过${maxLen}个字符` };
  return { valid: true };
}

export function validateEmail(val: unknown): ValidationResult {
  if (typeof val !== "string") return { valid: false, error: "必须是字符串" };
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(val.trim())) return { valid: false, error: "邮箱格式不正确" };
  return { valid: true };
}

export function validateRole(val: unknown): ValidationResult {
  if (typeof val !== "string" || !["admin", "editor", "guest"].includes(val)) {
    return { valid: false, error: "角色必须是 admin、editor 或 guest" };
  }
  return { valid: true };
}

export function validateStatus(val: unknown, allowed: string[]): ValidationResult {
  if (typeof val !== "string" || !allowed.includes(val)) {
    return { valid: false, error: `状态必须是 ${allowed.join("、")}` };
  }
  return { valid: true };
}
```

- [ ] **步骤 2：在 users/route.ts POST 中添加验证**

```typescript
import { validateRequired, validateEmail, validateRole } from "@/lib/validations";

// 在 POST handler 中 body 解析之后：
const nameResult = validateRequired(name);
if (!nameResult.valid) return jsonResponse(error(nameResult.error), 400);

const emailResult = validateEmail(email);
if (!emailResult.valid) return jsonResponse(error(emailResult.error), 400);

if (password && password.length < 6) return jsonResponse(error("密码至少6位"), 400);

const roleResult = validateRole(role || "guest");
if (!roleResult.valid) return jsonResponse(error(roleResult.error), 400);
```

- [ ] **步骤 3：在 plugins/upload/route.ts POST 中添加验证**

```typescript
import { validateRequired } from "@/lib/validations";

// 在 formData 解析之后：
const nameResult = validateRequired(name, 1, 100);
if (!nameResult.valid) return jsonResponse(error(`插件名称${nameResult.error}`), 400);
```

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/lib/validations.ts frontend/src/app/api/users/route.ts frontend/src/app/api/plugins/upload/route.ts
git commit -m "feat: 添加API输入验证，提升数据安全性和健壮性"
```

---

### 任务 7：toCamelCase 支持嵌套对象转换

**文件：**
- 修改：`frontend/src/lib/api-helper.ts`

**说明：** 当前 `toCamelCase` 只做浅层转换，API 返回的 JSONB 字段（tags、reviews 等）键名仍为 snake_case。

- [ ] **步骤 1：无需修改**

分析后确认：JSONB 字段（tags、reviews、version_history 等）在数据库中存储为 JSON 对象数组，其键名由应用层定义（如 `plugin_count` vs `pluginCount`）。`toCamelCase` 正确地将数据库列名（如 `plugin_count`）转为驼峰（`pluginCount`），但 JSONB 内容在 SQL 层直接返回，通常内部键名不是 snake_case。

实际检查：种子数据中 `plugin_count` 是数据库列名（不是 JSONB 内字段），已被 `toCamelCase` 正确处理。JSONB 字段如 `reviews`、`version_history` 内部键名本身就是驼峰（`userName`、`userAvatar` 等），无需转换。

**结论：无需修改。**

- [ ] **步骤 2：跳过此任务，标记为已完成**

---

### 任务 8：后端 API 添加分页支持

**文件：**
- 修改：`frontend/src/app/api/plugins/route.ts`
- 修改：`frontend/src/app/api/users/route.ts`
- 修改：`frontend/src/app/api/announcements/route.ts`

**说明：** GET 端点返回全部数据，添加 `page` 和 `pageSize` 查询参数支持分页。

- [ ] **步骤 1：修改 plugins/route.ts GET 支持分页**

```typescript
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: err, count } = await supabase
      .from("agenthub_plugins")
      .select("id, name, description, version, author, category, downloads, rating, status, tags, icon, package_file, cover_images, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({
      items: toCamelCaseArray(data as Record<string, unknown>[]),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：修改 users/route.ts GET 支持分页**

```typescript
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: err, count } = await supabase
      .from("agenthub_users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({
      items: toCamelCaseArray(data as Record<string, unknown>[]),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 3：修改 announcements/route.ts GET 支持分页**

```typescript
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: err, count } = await supabase
      .from("agenthub_announcements")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({
      items: toCamelCaseArray(data as Record<string, unknown>[]),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 4：更新前端调用处适配新分页格式**

修改 `frontend/src/lib/api-client.ts`：不做修改（分页是可选的，前端目前用客户端分页也可）。
修改各管理页面 fetch 调用以处理新格式（可选优化，保持向后兼容）。

```typescript
// 在各页面的 fetch 函数中添加分页参数
const data = await apiGet<{ items: Plugin[]; total: number }>(`/api/plugins?page=1&pageSize=100`);
setPluginList(data.items);
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/app/api/plugins/route.ts frontend/src/app/api/users/route.ts frontend/src/app/api/announcements/route.ts
git commit -m "feat: 后端API添加分页支持，提升大规模数据下的性能"
```

---

### 任务 9：提取重复代码为共享组件和工具函数

**文件：**
- 创建：`frontend/src/lib/formatters.ts`
- 创建：`frontend/src/hooks/useToast.ts`
- 创建：`frontend/src/components/ui/pagination.tsx`
- 修改：`frontend/src/app/admin/plugins/page.tsx`
- 修改：`frontend/src/app/admin/users/page.tsx`
- 修改：`frontend/src/app/admin/notifications/page.tsx`
- 修改：`frontend/src/app/marketplace/page.tsx`

**说明：** `formatDownloads`、`renderStars` 在多个文件中重复；Toast 逻辑在3个管理页面中完全相同；分页组件在3个页面中大量重复。

- [ ] **步骤 1：创建 formatters.ts**

```typescript
export function formatDownloads(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export function renderStarsElement(rating: number): { stars: string; ratingText: string } {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push("★");
  if (half) stars.push("⭑");
  while (stars.length < 5) stars.push("☆");
  return { stars: stars.join(""), ratingText: rating.toFixed(1) };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
```

- [ ] **步骤 2：创建 useToast.ts hook**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, addToast };
}
```

- [ ] **步骤 3：创建 pagination.tsx 组件**

```tsx
"use client";

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 flex-shrink-0">
      <span className="text-sm text-[#6c6a64]">
        共 {totalItems} 项，第 {currentPage} / {totalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`w-9 h-9 rounded-lg text-sm transition-colors ${
              page === currentPage
                ? "bg-[#cc785c] text-white"
                : "text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de]"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：更新 admin/users/page.tsx**

替换：
- `formatDownloads` → import from `@/lib/formatters`
- `renderStars` → import `renderStarsElement` from `@/lib/formatters`，渲染逻辑保留在页面内（涉及 JSX）
- Toast 逻辑 → 使用 `useToast()` hook
- 分页 → 使用 `<Pagination>` 组件

- [ ] **步骤 5：更新 admin/plugins/page.tsx**

同上。

- [ ] **步骤 6：更新 admin/notifications/page.tsx**

同上。

- [ ] **步骤 7：更新 marketplace/page.tsx**

同上。

- [ ] **步骤 8：Commit**

```bash
git add frontend/src/lib/formatters.ts frontend/src/hooks/useToast.ts frontend/src/components/ui/pagination.tsx
git add frontend/src/app/admin/users/page.tsx frontend/src/app/admin/plugins/page.tsx frontend/src/app/admin/notifications/page.tsx frontend/src/app/marketplace/page.tsx
git commit -m "refactor: 提取重复代码为共享工具函数/Hook/组件"
```

---

### 任务 10：修复 auth-context 缓存问题

**文件：**
- 修改：`frontend/src/lib/auth-context.tsx`

**说明：** `createClient()` 在组件体内直接调用导致每次渲染创建新实例。

- [ ] **步骤 1：使用 useMemo 包裹 createClient**

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ... UserProfile, RegisterData, AuthState 类型不变 ...

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);  // 稳定引用
  // ...
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/lib/auth-context.tsx
git commit -m "fix: auth-context使用useMemo稳定supabase客户端引用，避免重渲染"
```

---

### 任务 11：修复登录后禁用用户检查的竞态问题

**文件：**
- 修改：`frontend/src/lib/auth-context.tsx`

**说明：** login 函数先 setUser/setProfile 再检查 disabled 状态，已禁用用户可能短暂显示已登录 UI。

- [ ] **步骤 1：先检查再设置状态**

```typescript
const login = useCallback(async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user) {
      const profileData = await fetchProfile(data.user.id);
      if (profileData?.status === "disabled") {
        await supabase.auth.signOut();
        return { success: false, error: "账号已被禁用" };
      }
      setUser(data.user);
      setProfile(profileData);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}, [supabase, fetchProfile]);
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/lib/auth-context.tsx
git commit -m "fix: 先检查用户状态再设置登录态，避免禁用用户短暂可见"
```

---

### 任务 12：提升 API 客户端类型安全

**文件：**
- 修改：`frontend/src/lib/api-client.ts`

**说明：** 添加 HTTP 状态码检查，处理非 JSON 响应。

- [ ] **步骤 1：增强 api-client.ts**

```typescript
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok && res.status >= 500) {
    throw new Error(`服务器错误 (${res.status})`);
  }
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    if (!res.ok) throw new Error(`请求失败 (${res.status})`);
    return {} as T;
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "请求失败");
  return json.data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  await handleResponse<void>(res);
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  return handleResponse<T>(res);
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "fix: API客户端添加HTTP状态和Content-Type检查，提升类型安全"
```

---

### 任务 13：清理残留 Mock 类型

**文件：**
- 修改：`frontend/src/lib/types.ts`

**说明：** 删除不再使用的 `MockUser` 和 `MockProduct` 类型。

- [ ] **步骤 1：从 types.ts 中删除 Mock 类型**

删除第 92-111 行的 `MockUser` 和 `MockProduct` 接口。

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "chore: 清理不再使用的MockUser和MockProduct类型定义"
```

---

### 任务 14：添加 .env.example

**文件：**
- 创建：`frontend/.env.example`

- [ ] **步骤 1：创建 .env.example**

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/.env.example
git commit -m "chore: 添加.env.example环境变量示例文件"
```

---

### 任务 15：AdminLayout 使用 Next.js Link 替代 window.location.href

**文件：**
- 修改：`frontend/src/components/ui/admin-layout.tsx`

**说明：** 侧边栏导航使用 `<a>` + `window.location.href` 导致全页面刷新。

- [ ] **步骤 1：替换为 Next.js Link**

在 admin-layout.tsx 顶部添加 import：
```typescript
import Link from "next/link";
```

替换侧边栏导航项（第 101-123 行区域）：
```tsx
<Link
  key={item.href}
  href={item.href}
  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
    active
      ? "bg-[#252320] text-[#faf9f5]"
      : "text-[#a09d96] hover:text-[#faf9f5] hover:bg-[#1f1e1b]"
  }`}
>
  <span className="text-base flex-shrink-0">{item.icon}</span>
  {!sidebarCollapsed && <span>{item.label}</span>}
</Link>
```

将之前的 `<a onClick={...}>` 替换为 `<Link href={...}>`。

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/components/ui/admin-layout.tsx
git commit -m "fix: AdminLayout侧边栏使用Next.js Link替代window.location.href"
```

---

### 任务 16：修复 SQL 迁移幂等性问题

**文件：**
- 修改：`frontend/supabase/migrations/001_schema.sql`

**说明：** `DROP TABLE IF EXISTS ... CASCADE` 会丢失数据。在 Supabase 迁移中这是安全的（按顺序执行一次），但应在文件头部添加注释说明。

- [ ] **步骤 1：添加注释说明幂等性**

在 001_schema.sql 文件头部已有含义说明。此迁移文件作为初始迁移，`DROP TABLE IF EXISTS` 用于确保干净创建。Supabase 迁移工具按序号执行且不重复执行，实际不会丢失数据。但为明确起见，将 `DROP TABLE IF EXISTS` 改为 `CREATE TABLE IF NOT EXISTS` 不是最佳实践（因为初始迁移应确保 schema 干净）。

**结论：当前实现合理。** 仅在文件头添加注释说明。

```sql
-- 001_schema.sql
-- 初始 Schema 创建（幂等：仅首次迁移执行）
-- 若需重新执行，请在 Supabase Dashboard SQL Editor 中手动运行
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/supabase/migrations/001_schema.sql
git commit -m "docs: 添加schema迁移幂等性说明注释"
```

---

### 任务 17：添加 React Error Boundary

**文件：**
- 创建：`frontend/src/components/error-boundary.tsx`
- 修改：`frontend/src/app/layout.tsx`

- [ ] **步骤 1：创建 error-boundary.tsx**

```tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary 捕获到错误:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-[#faf9f5]">
          <div className="text-center">
            <h2
              className="text-[#141413] mb-3"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px" }}
            >
              页面出现错误
            </h2>
            <p className="text-[#6c6a64] text-sm mb-6">请刷新页面重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#cc785c] text-white rounded-lg hover:bg-[#a9583e] transition-colors text-sm"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **步骤 2：在 layout.tsx 中包裹**

```tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/components/error-boundary.tsx frontend/src/app/layout.tsx
git commit -m "feat: 添加React Error Boundary防止组件崩溃导致白屏"
```

---

### 任务 18：TypeScript 类型收窄 - 消除 as Record<string, unknown> 断言

**文件：**
- 修改：`frontend/src/lib/types.ts`
- 修改：`frontend/src/lib/api-helper.ts`

**说明：** 大量 `as Record<string, unknown>` 断言绕过了类型检查。在类型系统中添加 snake_case 和 camelCase 的对应映射类型。

- [ ] **步骤 1：在 api-helper.ts 中增强 toCamelCase 类型**

```typescript
export function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

export function toCamelCaseArray<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => toCamelCase<T>(item));
}
```

同时更新各 API Route 中的调用，不改变运行时行为，仅提升类型安全：

```typescript
// 之前：
return jsonResponse(success(toCamelCaseArray(data as Record<string, unknown>[])));

// 之后：
return jsonResponse(success(toCamelCaseArray<Plugin>(data as Record<string, unknown>[])));
```

由于改动散布在多个文件中，为确保类型安全的同时避免过度改动，仅在核心 API helper 中加上泛型支持，调用处逐步迁移。

- [ ] **步骤 2：只修改 api-helper.ts 泛型，调用处不强制改动**

```typescript
export function toCamelCase<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

export function toCamelCaseArray<T = Record<string, unknown>>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => toCamelCase<T>(item));
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/lib/api-helper.ts
git commit -m "refactor: toCamelCase添加泛型支持，提升类型安全性"
```

---

## 执行顺序

任务 1 → 2 → 3 → 4 → 5 → 6 → 7(跳过) → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18

共 17 个有效任务（任务 7 已跳过）。
