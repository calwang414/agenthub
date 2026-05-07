# 分类管理页面 API 迁移 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将分类管理页面从前端 mock 数据切换到调用 `/api/categories` 后端 API，实现真正的 CRUD 持久化。

**架构：** 保留现有页面 UI 结构不变，仅替换数据层：移除 mock 数据导入，改为通过 `apiGet/apiPost/apiPut/apiDelete` 调用后端 API，因 Supabase 返回 snake_case 字段，需在 API 路由层增加 `toCamelCase` 转换，使前端保持 camelCase 接口。

**技术栈：** Next.js App Router、Supabase (@supabase/ssr)、现有 api-client 工具函数

---

## 数据库 vs Mock 字段映射

| 数据库 (snake_case) | Mock (camelCase) | 类型差异 |
|---------------------|------------------|---------|
| `id` | `id` | UUID vs 数字字符串 |
| `name` | `name` | 一致 |
| `icon` | `icon` | 一致 |
| `description` | `description` | 一致 |
| `plugin_count` | `pluginCount` | 一致 |
| `sort_order` | `sortOrder` | 一致 |
| `status` | `status` | 一致 |
| `created_at` | `createdAt` | TIMESTAMPTZ vs "YYYY-MM-DD" |
| `updated_at` | `updatedAt` | TIMESTAMPTZ vs "YYYY-MM-DD" |

---

### 任务 1：API 路由层添加 camelCase 转换

**文件：**
- 修改：`frontend/src/app/api/categories/route.ts`

- [ ] **步骤 1：GET 响应添加 toCamelCase 转换**

将 GET 返回的数据从 snake_case 转为 camelCase，使前端无需处理字段名差异。

```typescript
import { toCamelCaseArray, toCamelCase } from "@/lib/api-helper";
```

修改 GET 函数中：
```typescript
// 原来：
return jsonResponse(success(data));
// 改为：
return jsonResponse(success(toCamelCaseArray(data as Record<string, unknown>[])));
```

- [ ] **步骤 2：POST 响应添加 toCamelCase 转换**

```typescript
// 原来：
return jsonResponse(success(data), 201);
// 改为：
return jsonResponse(success(toCamelCase(data as Record<string, unknown>)), 201);
```

---

### 任务 2：单个分类 API 路由添加 camelCase 转换

**文件：**
- 修改：`frontend/src/app/api/categories/[id]/route.ts`

- [ ] **步骤 1：GET 响应添加 toCamelCase 转换**

```typescript
import { toCamelCase } from "@/lib/api-helper";
```

```typescript
// 原来：
return jsonResponse(success(data));
// 改为：
return jsonResponse(success(toCamelCase(data as Record<string, unknown>)));
```

- [ ] **步骤 2：PUT 响应添加 toCamelCase 转换 + 增加字段支持**

PUT 需要支持更新 `sortOrder` 字段（用于排序功能），同时响应转为 camelCase：

```typescript
// 原来 PUT 中 updates 构建：
const updates: Record<string, unknown> = {};
if (body.name !== undefined) updates.name = body.name;
if (body.icon !== undefined) updates.icon = body.icon;
if (body.description !== undefined) updates.description = body.description;
if (body.pluginCount !== undefined) updates.plugin_count = body.pluginCount;
if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;
if (body.status !== undefined) updates.status = body.status;
```

响应改为：
```typescript
// 原来：
return jsonResponse(success(data));
// 改为：
return jsonResponse(success(toCamelCase(data as Record<string, unknown>)));
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/categories/route.ts frontend/src/app/api/categories/[id]/route.ts
git commit -m "feat: API 分类路由返回 camelCase 字段格式"
```

---

### 任务 3：分类管理页面接入 API 数据获取

**文件：**
- 修改：`frontend/src/app/admin/categories/page.tsx`

- [ ] **步骤 1：移除 mock 数据导入，引入 API 工具**

```typescript
// 移除这行：
import { categories as initialCategories, type Category } from "@/lib/mock/categories";
// 添加：
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
```

- [ ] **步骤 2：添加 Category 类型定义和加载状态**

因为移除了 mock 导入，需要在文件内定义 Category 接口，并添加加载状态：

```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  pluginCount: number;
  sortOrder: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
}

const [isLoading, setIsLoading] = useState(true);
```

- [ ] **步骤 3：将 categoryList 初始值改为空数组，添加 fetchCategories**

```typescript
// 原来：
const [categoryList, setCategoryList] = useState<Category[]>(initialCategories);
// 改为：
const [categoryList, setCategoryList] = useState<Category[]>([]);
```

添加数据获取函数和初始化 useEffect：

```typescript
const fetchCategories = useCallback(async () => {
  try {
    setIsLoading(true);
    const data = await apiGet<Category[]>("/api/categories");
    setCategoryList(data);
  } catch (e) {
    addToast("获取分类列表失败: " + String(e), "error");
  } finally {
    setIsLoading(false);
  }
}, [addToast]);

useEffect(() => {
  fetchCategories();
}, [fetchCategories]);
```

- [ ] **步骤 4：添加加载状态的 UI 展示**

在表格/卡片视图区域添加 loading 指示。在 `pagedCategories.length === 0` 的空状态判断前，添加 loading 判断：

在 table view 的 tbody 中，`pagedCategories` 渲染前：
```tsx
{isLoading ? (
  <tr>
    <td colSpan={8} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
      加载中…
    </td>
  </tr>
) : pagedCategories.map((category) => { ... })}
```

在 card view 中类似处理：
```tsx
{isLoading ? (
  <div className="col-span-full py-12 text-center text-[#8e8b82] text-sm">
    加载中…
  </div>
) : pagedCategories.map((category) => { ... })}
```

- [ ] **步骤 5：添加 createdAt 日期格式化**

增加辅助函数格式化 ISO 日期字符串为 `YYYY-MM-DD`：

```typescript
const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
};
```

在表格和卡片视图中，将 `{category.createdAt}` 替换为 `{formatDate(category.createdAt)}`。

- [ ] **步骤 6：Commit**

```bash
git add frontend/src/app/admin/categories/page.tsx
git commit -m "feat: 分类管理页面改为从 API 获取数据"
```

---

### 任务 4：实现 API 驱动的 CRUD 操作

**文件：**
- 修改：`frontend/src/app/admin/categories/page.tsx`

- [ ] **步骤 1：改写 handleSave 为 API 调用**

```typescript
const handleSave = async () => {
  if (!formData.name.trim()) {
    addToast("分类名称不能为空", "error");
    return;
  }
  if (!formData.icon.trim()) {
    addToast("请选择分类图标", "error");
    return;
  }
  const sortOrder = parseInt(formData.sortOrder, 10);
  if (isNaN(sortOrder) || sortOrder < 1) {
    addToast("排序权重必须为正整数", "error");
    return;
  }

  try {
    if (editingCategory) {
      await apiPut<Category>(`/api/categories/${editingCategory.id}`, {
        name: formData.name.trim(),
        icon: formData.icon.trim(),
        description: formData.description.trim(),
        sortOrder,
      });
      addToast(`分类「${formData.name.trim()}」已更新`, "success");
    } else {
      await apiPost<Category>("/api/categories", {
        name: formData.name.trim(),
        icon: formData.icon.trim(),
        description: formData.description.trim(),
        sortOrder,
      });
      addToast(`分类「${formData.name.trim()}」已创建`, "success");
    }
    setShowModal(false);
    fetchCategories();
  } catch (e) {
    addToast("操作失败: " + String(e), "error");
  }
};
```

注意 `handleSave` 函数签名从 `() => void` 变为 `async () => void`，onClick 绑定的 `onClick={handleSave}` 保持不变（React 会自动处理 async 函数）。

- [ ] **步骤 2：改写 handleDelete 为 API 调用**

```typescript
const handleDelete = useCallback(
  async (category: Category) => {
    try {
      await apiDelete(`/api/categories/${category.id}`);
      setShowDeleteConfirm(null);
      addToast(`分类「${category.name}」已删除`, "success");
      fetchCategories();
    } catch (e) {
      addToast("删除失败: " + String(e), "error");
    }
  },
  [addToast, fetchCategories]
);
```

注意 `fetchCategories` 需要添加到 useCallback 的依赖数组中（在步骤 1 中定义）。

- [ ] **步骤 3：改写 handleMoveUp 为 API 调用**

```typescript
const handleMoveUp = useCallback(
  async (category: Category, index: number) => {
    if (index === 0) return;
    try {
      const sorted = [...categoryList].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((c) => c.id === category.id);
      if (idx <= 0) return;
      const prevItem = sorted[idx - 1];
      await apiPut(`/api/categories/${category.id}`, { sortOrder: prevItem.sortOrder });
      await apiPut(`/api/categories/${prevItem.id}`, { sortOrder: category.sortOrder });
      fetchCategories();
    } catch (e) {
      addToast("排序失败: " + String(e), "error");
    }
  },
  [categoryList, addToast, fetchCategories]
);
```

- [ ] **步骤 4：改写 handleMoveDown 为 API 调用**

```typescript
const handleMoveDown = useCallback(
  async (category: Category, index: number) => {
    try {
      const sorted = [...categoryList].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((c) => c.id === category.id);
      if (idx < 0 || idx >= sorted.length - 1) return;
      const nextItem = sorted[idx + 1];
      await apiPut(`/api/categories/${category.id}`, { sortOrder: nextItem.sortOrder });
      await apiPut(`/api/categories/${nextItem.id}`, { sortOrder: category.sortOrder });
      fetchCategories();
    } catch (e) {
      addToast("排序失败: " + String(e), "error");
    }
  },
  [categoryList, addToast, fetchCategories]
);
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/app/admin/categories/page.tsx
git commit -m "feat: 分类管理 CRUD 操作改为调用 API"
```

---

### 任务 5：验证

- [ ] **步骤 1：检查 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。

- [ ] **步骤 2：验证 API 路由正常工作**

启动开发服务器后，访问 `http://localhost:3000/api/categories` 确认返回 camelCase 格式的分类数据。

- [ ] **步骤 3：检查 lint**

```bash
cd frontend && npm run lint
```

预期：无新增 lint 问题。

---

## 关键注意事项

1. **fetchCategories 依赖循环**：`fetchCategories` 使用 `useCallback` 且依赖 `addToast`，而 `handleDelete`、`handleMoveUp`、`handleMoveDown` 依赖 `fetchCategories`。需要确保 `fetchCategories` 在 `handleDelete` 等之前定义。

2. **pluginCount**：由服务端管理（数据库 `plugin_count` 字段），前端表单不包含此字段，新增时默认为 0。

3. **createdAt/updatedAt**：由数据库自动生成（`DEFAULT now()`），前端不需要传入。

4. **排序**：上下移动时直接调用 PUT 更新两个分类的 `sortOrder`，然后重新获取列表确保数据一致。

5. **不要移除 mock/categories.ts 文件**：虽然分类管理页面不再使用，但其他地方可能引用（如 mock/index.ts）。本次仅移除页面中的 import。
