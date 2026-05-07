# 用户管理页面接入 Supabase API 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将用户管理页面从静态 Mock 数据改造为通过 API 调用 Supabase 数据库

**架构：** 前端通过 API 路由层（`/api/users`、`/api/users/[id]`）间接操作 Supabase 数据库。API 路由使用服务端 Supabase 客户端，新增/编辑用户通过 service_role key 的 admin 客户端操作 auth.users + agenthub_users。

**技术栈：** Next.js 15, Supabase (ssr + supabase-js), TypeScript

---

### 任务 1：数据库迁移 — agenthub_users 添加 email 字段

**文件：**
- 创建：`frontend/supabase/migrations/002_add_email_to_users.sql`

- [ ] **步骤 1：编写迁移 SQL**

```sql
-- 002_add_email_to_users.sql
-- 给 agenthub_users 表添加 email 字段，并更新触发器同步写入

ALTER TABLE public.agenthub_users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- 更新 handle_new_user 触发器，同步写入 email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agenthub_users (id, name, nickname, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, ''),
    COALESCE(split_part(NEW.email, '@', 1), ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **步骤 2：在 Supabase 上运行迁移**

在 Supabase SQL Editor 中执行上述 SQL。

- [ ] **步骤 3：验证**

```sql
-- 确认字段已添加
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agenthub_users' AND column_name = 'email';
-- 预期：返回一行，data_type 为 'text'
```

---

### 任务 2：创建 Supabase admin 客户端（service_role）

**文件：**
- 创建：`frontend/src/lib/supabase/admin.ts`

- [ ] **步骤 1：创建 admin 客户端**

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

注意：此文件**仅**在服务端 API 路由中使用，绝不要导入到客户端组件。`SUPABASE_SERVICE_ROLE_KEY` 已在 `lib/db/migrate.ts` 中使用，确认环境变量存在。

---

### 任务 3：新增 POST /api/users 路由（管理员创建用户）

**文件：**
- 创建：`frontend/src/app/api/users/route.ts`（在现有 GET 基础上新增 POST handler）

当前 `route.ts` 只有 GET。需要在同一文件中新增 POST handler。

- [ ] **步骤 1：更新 route.ts，添加 POST handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  // ... 现有代码保持不变 ...
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const adminClient = createAdminClient();
    const body = await request.json();

    const { name, email, phone, role, password } = body;

    if (!name || !email || !password) {
      return jsonResponse(error("用户名、邮箱和密码为必填项"), 400);
    }

    // 1. 用 admin client 创建 auth 用户（触发器自动创建 agenthub_users profile）
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), phone: phone || "" },
    });

    if (authError) {
      return jsonResponse(error(authError.message), 500);
    }

    if (!authData.user) {
      return jsonResponse(error("创建用户失败"), 500);
    }

    // 2. 等待触发器创建 profile，然后更新 role 和 phone
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: updateError } = await adminClient
      .from("agenthub_users")
      .update({
        name: name.trim(),
        phone: phone || "",
        role: role || "guest",
      })
      .eq("id", authData.user.id);

    if (updateError) {
      return jsonResponse(error(updateError.message), 500);
    }

    // 3. 返回新创建的用户数据
    const { data: profile, error: fetchError } = await supabase
      .from("agenthub_users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (fetchError || !profile) {
      return jsonResponse(error("用户已创建但获取详情失败"), 500);
    }

    return jsonResponse(success(profile), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

---

### 任务 4：更新 PUT /api/users/[id] 支持 email 字段

**文件：**
- 修改：`frontend/src/app/api/users/[id]/route.ts:43-48`

- [ ] **步骤 1：在 PUT 的 updates 中添加 email**

在当前 `PUT` handler 的 `if` 链路中，`body.phone` 之后添加：

```typescript
if (body.email !== undefined) updates.email = body.email;
```

具体修改位置：在 `if (body.phone !== undefined)` 之后插入一行。

---

### 任务 5：前端用户管理页面改造（核心）

**文件：**
- 修改：`frontend/src/app/admin/users/page.tsx`（全部重写数据逻辑部分）

改动涉及所有 CRUD handler、state 初始化、类型定义。整体改动较大，但 UI 渲染部分保持不变。

- [ ] **步骤 1：替换 import，定义新类型**

移除：
```typescript
import { mockUsers, type MockUser } from "@/lib/mock/users";
```

新增：
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
```

定义新的用户数据类型（匹配 API 返回的 Supabase 字段，snake_case 转 camelCase 后使用）：

```typescript
interface UserData {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  role: "admin" | "editor" | "guest";
  status: "active" | "disabled";
  createdAt: string;
  lastActiveAt: string;
}
```

将 `ROLE_MAP`、`STATUS_MAP`、`ROLE_AVATAR_COLORS` 中的 `MockUser["role"]` / `MockUser["status"]` 替换为 `UserData["role"]` / `UserData["status"]`。

- [ ] **步骤 2：将 snake_case 转为 camelCase 的工具函数**

```typescript
function toCamelCase(obj: Record<string, unknown>): UserData {
  return {
    id: obj.id as string,
    name: obj.name as string,
    nickname: (obj.nickname as string) || "",
    email: (obj.email as string) || "",
    phone: (obj.phone as string) || "",
    role: obj.role as UserData["role"],
    status: obj.status as UserData["status"],
    createdAt: (obj.created_at as string) || "",
    lastActiveAt: (obj.last_active_at as string) || "",
  };
}
```

- [ ] **步骤 3：添加 loading/error 状态，用 useEffect 初始化**

替换：
```typescript
const [userList, setUserList] = useState<MockUser[]>(mockUsers);
```

为：
```typescript
const [userList, setUserList] = useState<UserData[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

添加 `fetchUsers` 函数和 `useEffect`：

```typescript
const fetchUsers = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await apiGet<Record<string, unknown>[]>("/api/users");
    setUserList(data.map(toCamelCase));
  } catch (e) {
    setError(e instanceof Error ? e.message : "加载用户列表失败");
    addToast("加载用户列表失败", "error");
  } finally {
    setLoading(false);
  }
}, [addToast]);

useEffect(() => {
  fetchUsers();
}, [fetchUsers]);
```

- [ ] **步骤 4：改造 handleToggleStatus — 调 PUT API**

替换现有的本地 state 修改逻辑（L150-L170），改为：

```typescript
const handleToggleStatus = useCallback(
  async (user: UserData) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    try {
      await apiPut(`/api/users/${user.id}`, { status: newStatus });
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      addToast(`用户「${user.name}」已${newStatus === "disabled" ? "禁用" : "启用"}`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "操作失败", "error");
    }
  },
  [addToast, selectedUser]
);
```

- [ ] **步骤 5：改造 handleDelete — 调 DELETE API**

替换现有的本地 state 过滤逻辑（L172-L188），改为：

```typescript
const handleDelete = useCallback(
  async (user: UserData) => {
    try {
      await apiDelete(`/api/users/${user.id}`);
      setUserList((prev) => prev.filter((u) => u.id !== user.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
      if (selectedUser?.id === user.id) {
        setDetailOpen(false);
        setSelectedUser(null);
      }
      setModalType(null);
      addToast(`用户「${user.name}」已删除`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "删除失败", "error");
    }
  },
  [addToast, selectedUser]
);
```

- [ ] **步骤 6：改造 handleBatchDelete — 逐个调 DELETE API**

替换现有的本地 state 过滤逻辑（L190-L202），改为逐个调 API：

```typescript
const handleBatchDelete = async () => {
  const ids = Array.from(selectedIds);
  const names = userList
    .filter((u) => selectedIds.has(u.id))
    .map((u) => u.name)
    .join("、");

  let failed = 0;
  for (const id of ids) {
    try {
      await apiDelete(`/api/users/${id}`);
    } catch {
      failed++;
    }
  }

  setUserList((prev) => prev.filter((u) => !selectedIds.has(u.id)));
  if (selectedUser && selectedIds.has(selectedUser.id)) {
    setDetailOpen(false);
    setSelectedUser(null);
  }
  setSelectedIds(new Set());

  if (failed > 0) {
    addToast(`已删除 ${ids.length - failed} 个用户，${failed} 个失败`, "error");
  } else {
    addToast(`已批量删除 ${names}`, "success");
  }
};
```

- [ ] **步骤 7：改造 handleBatchDisable — 逐个调 PUT API**

替换现有的本地 state 映射逻辑（L204-L213），改为：

```typescript
const handleBatchDisable = async () => {
  const ids = Array.from(selectedIds);
  let failed = 0;
  for (const id of ids) {
    try {
      await apiPut(`/api/users/${id}`, { status: "disabled" });
    } catch {
      failed++;
    }
  }

  setUserList((prev) =>
    prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: "disabled" as const } : u))
  );
  if (selectedUser && selectedIds.has(selectedUser.id)) {
    setSelectedUser((prev) => (prev ? { ...prev, status: "disabled" as const } : null));
  }
  setSelectedIds(new Set());

  if (failed > 0) {
    addToast(`已禁用 ${ids.length - failed} 个用户，${failed} 个失败`, "error");
  } else {
    addToast("已批量禁用所选用户", "success");
  }
};
```

- [ ] **步骤 8：改造 handleSave — 新增调 POST，编辑调 PUT**

替换现有的 L245-L286，改为：

```typescript
const handleSave = async () => {
  if (!formData.name.trim()) {
    addToast("用户名不能为空", "error");
    return;
  }
  if (!formData.email.trim()) {
    addToast("邮箱不能为空", "error");
    return;
  }

  try {
    if (modalType === "edit" && modalUser) {
      await apiPut(`/api/users/${modalUser.id}`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
      });
      // 乐观更新本地列表
      setUserList((prev) =>
        prev.map((u) =>
          u.id === modalUser.id
            ? {
                ...u,
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                role: formData.role,
              }
            : u
        )
      );
      if (selectedUser?.id === modalUser.id) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                role: formData.role,
              }
            : null
        );
      }
      addToast(`用户「${formData.name.trim()}」已更新`, "success");
    } else {
      await apiPost("/api/users", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password,
      });
      // 重新拉取列表以确保数据一致
      await fetchUsers();
      addToast(`用户「${formData.name.trim()}」已创建`, "success");
    }
    setModalType(null);
  } catch (e) {
    addToast(e instanceof Error ? e.message : "操作失败", "error");
  }
};
```

- [ ] **步骤 9：改造 handleResetPassword — 改为调 API 重置密码**

当前重置密码只是弹 toast，没有实际操作。现在需要通过 Supabase admin API 重置密码。在没有专门的重置密码 API 路由的情况下，暂时保持前端提示逻辑，但改为使用 Supabase admin API。

需要新增 `POST /api/users/[id]/reset-password` 路由或在 PUT 中支持 password 字段。简化处理：新增一个轻量的 API 路由。

**文件：** 创建 `frontend/src/app/api/users/[id]/reset-password/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminClient = createAdminClient();
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return jsonResponse(error("密码不能为空"), 400);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      id,
      { password }
    );

    if (updateError) {
      return jsonResponse(error(updateError.message), 500);
    }

    return jsonResponse(success({ updated: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

然后改造前端 `handleResetPassword`：

```typescript
const handleResetPassword = async () => {
  if (!modalUser) return;
  try {
    await apiPost(`/api/users/${modalUser.id}/reset-password`, {
      password: resetPasswordValue,
    });
    addToast(`已为用户「${modalUser.name}」重置密码，新密码：${resetPasswordValue}`, "success");
  } catch (e) {
    addToast(e instanceof Error ? e.message : "重置密码失败", "error");
  }
  setModalType(null);
};
```

- [ ] **步骤 10：所有 MockUser 类型引用改为 UserData**

页面的 view 层中所有 `MockUser` 类型注解替换为 `UserData`。包括：
- `ROLE_MAP` 定义（L24）
- `STATUS_MAP` 定义（L30）
- `ROLE_AVATAR_COLORS` 定义（L35）
- `selectedUser` state（L60）
- `modalUser` state（L63）
- `formData.role` 类型（L73）
- `handleSelectUser` 参数（L140）
- `openEditModal` 参数（L221）
- `openDeleteConfirm` 参数（L234）
- `openResetPasswordModal` 参数（L239）
- Modal 中 `onChange` 的 role 类型断言（L743）
- 所有函数参数中的 `user: MockUser` 改为 `user: UserData`

- [ ] **步骤 11：添加 loading 和 error 状态的 UI 处理**

在表格区域添加 loading 状态：

```tsx
{loading && (
  <tr>
    <td colSpan={6} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
      加载中…
    </td>
  </tr>
)}

{!loading && error && (
  <tr>
    <td colSpan={6} className="px-4 py-12 text-center text-[#c64545] text-sm">
      <div className="flex flex-col items-center gap-2">
        <span>{error}</span>
        <button onClick={fetchUsers} className="text-[#cc785c] hover:underline text-xs">重试</button>
      </div>
    </td>
  </tr>
)}

{!loading && !error && pagedUsers.length === 0 && (
  <tr>
    <td colSpan={6} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
      没有找到匹配的用户
    </td>
  </tr>
)}
```

这些放在 `<tbody>` 内 `{pagedUsers.map(...)}` 之后。现有的空状态（L515-L521）需要替换。

- [ ] **步骤 12：移除未使用的 mockUsers 导入**

确认文件中不再引用 `mockUsers` 和 `MockUser`。

---

### 任务 6：验证

- [ ] **步骤 1：运行 TypeScript 类型检查**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。

- [ ] **步骤 2：运行 lint 检查**

```bash
cd frontend && npx next lint
```

预期：无 lint 错误。

- [ ] **步骤 3：检查文件 git 状态**

```bash
git status
```

确认所有修改文件都在 tracked 状态，无残留 untracked 文件。

---

### 任务 7：Git 提交

使用 `chinese-commit-conventions` 技能后提

- [ ] **步骤 1：提交**

```bash
git add -A
git commit -m "feat: 用户管理页面接入 Supabase API，替换 Mock 数据"
```
