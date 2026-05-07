# 插件管理 - 加入/取消精选合集 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在插件管理列表页（`/admin/plugins`）增加"加入精选"和"取消精选"功能，支持插件批量归属精选合集。

**架构：** 新增 `POST /api/featured-collections/plugins/featured-update` 端点处理合集归属同步。前端在 `AdminPluginsPage` 中加载合集数据、展示合集标签、提供操作按钮和共用弹窗。

**技术栈：** Next.js App Router, Supabase, TypeScript, Tailwind CSS

---

### 任务 1：新增 `FeaturedCollection` 类型

**文件：**
- 修改：`frontend/src/lib/types.ts`

- [ ] **步骤 1：在 types.ts 中添加 FeaturedCollection 接口**

在 `Category` 接口之后、`Announcement` 接口之前插入：

```typescript
export interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  pluginIds: string[];
}
```

具体修改位置：在 `types.ts` 第 42 行（`Category` 接口结束的 `}` 之后）和第 44 行（`Announcement` 接口之前）之间插入。

- [ ] **步骤 2：运行类型检查验证**

```bash
cd frontend && npx tsc --noEmit
```
预期：无新错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat: 新增 FeaturedCollection 类型"
```

---

### 任务 2：创建 `POST /api/featured-collections/plugins/featured-update` 端点

**文件：**
- 新增：`frontend/src/app/api/featured-collections/plugins/featured-update/route.ts`

- [ ] **步骤 1：创建 API 路由文件**

```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    const pluginId = body.pluginId as string;
    const collectionIds = body.collectionIds as string[];

    if (!pluginId || !Array.isArray(collectionIds)) {
      return jsonResponse(error("缺少必要参数 pluginId 或 collectionIds"), 400);
    }

    const { data: allCollections, error: fetchErr } = await supabase
      .from("agenthub_featured_collections")
      .select("*");

    if (fetchErr) return jsonResponse(error(fetchErr.message), 500);

    const addedTo: string[] = [];
    const removedFrom: string[] = [];

    for (const col of allCollections || []) {
      const currentIds: string[] = col.plugin_ids || [];
      const isIncluded = currentIds.includes(pluginId);
      const shouldInclude = collectionIds.includes(col.id);

      if (!isIncluded && shouldInclude) {
        const newIds = [...currentIds, pluginId];
        const { error: updateErr } = await supabase
          .from("agenthub_featured_collections")
          .update({ plugin_ids: newIds })
          .eq("id", col.id);
        if (updateErr) return jsonResponse(error(updateErr.message), 500);
        addedTo.push(col.title);
      } else if (isIncluded && !shouldInclude) {
        const newIds = currentIds.filter((id: string) => id !== pluginId);
        const { error: updateErr } = await supabase
          .from("agenthub_featured_collections")
          .update({ plugin_ids: newIds })
          .eq("id", col.id);
        if (updateErr) return jsonResponse(error(updateErr.message), 500);
        removedFrom.push(col.title);
      }
    }

    return jsonResponse(success({ addedTo, removedFrom }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：运行类型检查验证**

```bash
cd frontend && npx tsc --noEmit
```
预期：无新错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/featured-collections/plugins/featured-update/route.ts
git commit -m "feat: 新增 POST /api/featured-collections/plugins/featured-update 端点"
```

---

### 任务 3：在 AdminPluginsPage 中加载合集数据并计算映射

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：导入 FeaturedCollection 类型**

修改第 4 行的 import 语句，从：

```typescript
import type { Plugin, Tag } from "@/lib/types";
```

改为：

```typescript
import type { Plugin, Tag, FeaturedCollection } from "@/lib/types";
```

- [ ] **步骤 2：添加 allCollections 状态和 fetchCollections 函数**

在第 57 行（`const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());`）之后添加：

```typescript
const [allCollections, setAllCollections] = useState<FeaturedCollection[]>([]);
```

在第 117 行（`const fetchCategories = useCallback` 结尾的 `}, []);` 之后）添加：

```typescript
const fetchCollections = useCallback(async () => {
  try {
    const data = await apiGet<FeaturedCollection[]>("/api/featured-collections");
    setAllCollections(data);
  } catch { /* ignore */ }
}, []);
```

- [ ] **步骤 3：在 useEffect 中添加 fetchCollections 调用**

修改第 119-122 行的 `useEffect`，从：

```typescript
useEffect(() => {
  fetchPlugins();
  fetchCategories();
}, [fetchPlugins, fetchCategories]);
```

改为：

```typescript
useEffect(() => {
  fetchPlugins();
  fetchCategories();
  fetchCollections();
}, [fetchPlugins, fetchCategories, fetchCollections]);
```

- [ ] **步骤 4：添加 pluginCollectionsMap 计算 useMemo**

在 `categoryColors` useMemo（第 124-142 行）之后添加：

```typescript
const pluginCollectionsMap = useMemo(() => {
  const map: Record<string, FeaturedCollection[]> = {};
  allCollections.forEach((col) => {
    (col.pluginIds || []).forEach((pid) => {
      if (!map[pid]) map[pid] = [];
      map[pid].push(col);
    });
  });
  return map;
}, [allCollections]);
```

- [ ] **步骤 5：运行类型检查验证**

```bash
cd frontend && npx tsc --noEmit
```
预期：无新错误。

- [ ] **步骤 6：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: AdminPluginsPage 加载精选合集数据并计算插件归属映射"
```

---

### 任务 4：在表格视图中添加合集标签和操作按钮

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：在表格视图插件行名称区域添加合集标签**

在表格 `<tbody>` 中每个插件行的名称描述下方（第 848-851 行的 `</div>` 之前），添加合集标签。找到 `{plugin.description.slice(0, 40)}…` 那行后面的 `</div>`，在其之前插入：

```tsx
{pluginCollectionsMap[plugin.id] && pluginCollectionsMap[plugin.id].length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {pluginCollectionsMap[plugin.id].map((col) => (
      <span
        key={col.id}
        className="inline-block px-1.5 py-0.5 bg-[#cc785c]/10 text-[#cc785c] rounded text-[10px] truncate max-w-[120px]"
        title={col.title}
      >
        {col.title}
      </span>
    ))}
  </div>
)}
```

- [ ] **步骤 2：在表格视图操作栏添加"加入精选"和"取消精选"按钮**

在 `</tr>` 之前的操作按钮区域（第 870-895 行），在删除按钮（第 888-893 行）之后、`</div>`（第 894 行）之前添加：

```tsx
<button
  onClick={() => openCollectionModal(plugin)}
  className="px-2 py-1.5 text-[#cc785c] hover:text-[#cc785c] hover:bg-[#cc785c]/8 rounded-md transition-colors text-xs"
>
  加入精选
</button>
{pluginCollectionsMap[plugin.id] && pluginCollectionsMap[plugin.id].length > 0 && (
  <button
    onClick={() => openRemoveCollectionModal(plugin)}
    className="px-2 py-1.5 text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors text-xs"
  >
    取消精选
  </button>
)}
```

- [ ] **步骤 3：运行类型检查验证**

```bash
cd frontend && npx tsc --noEmit
```
预期：`openCollectionModal` 和 `openRemoveCollectionModal` 未定义（将在任务 6 中添加）。

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: 表格视图添加合集标签与加入/取消精选按钮"
```

---

### 任务 5：在卡片视图中添加合集标签和操作按钮

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：在卡片视图中添加合集标签**

在卡片视图中，找到插件描述下方（`{plugin.description}` 那行 `<p>` 之后），在作者/版本行之前插入。即第 933 行 `</p>` 之后、第 934 行 `<div className="flex items-center justify-between text-xs...">` 之前插入：

```tsx
{pluginCollectionsMap[plugin.id] && pluginCollectionsMap[plugin.id].length > 0 && (
  <div className="flex flex-wrap gap-1 mb-2">
    {pluginCollectionsMap[plugin.id].map((col) => (
      <span
        key={col.id}
        className="inline-block px-1.5 py-0.5 bg-[#cc785c]/10 text-[#cc785c] rounded text-[10px]"
      >
        {col.title}
      </span>
    ))}
  </div>
)}
```

- [ ] **步骤 2：在卡片视图操作区添加按钮**

在卡片底部的操作按钮区域（第 949-966 行），在删除按钮（第 963-965 行）之后、`</div>`（第 966 行）之前添加：

```tsx
<button
  onClick={() => openCollectionModal(plugin)}
  className="flex-1 py-1.5 text-xs text-[#cc785c] hover:bg-[#cc785c]/8 rounded-md transition-colors"
>
  加入精选
</button>
{pluginCollectionsMap[plugin.id] && pluginCollectionsMap[plugin.id].length > 0 && (
  <button
    onClick={() => openRemoveCollectionModal(plugin)}
    className="flex-1 py-1.5 text-xs text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors"
  >
    取消精选
  </button>
)}
```

- [ ] **步骤 3：运行类型检查验证**

```bash
cd frontend && npx tsc --noEmit
```
预期：`openCollectionModal` 和 `openRemoveCollectionModal` 未定义（将在任务 6 中添加）。

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: 卡片视图添加合集标签与加入/取消精选按钮"
```

---

### 任务 6：实现合集选择弹窗

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：添加弹窗相关状态**

在第 59 行（`const [showDeleteConfirm, setShowDeleteConfirm] = useState<Plugin | null>(null);`）之后添加：

```typescript
const [collectionModal, setCollectionModal] = useState<{
  plugin: Plugin;
  mode: "add" | "remove";
  selectedIds: Set<string>;
} | null>(null);
const [collectionSaving, setCollectionSaving] = useState(false);
```

- [ ] **步骤 2：添加打开弹窗的函数**

在 `pluginCollectionsMap` useMemo（任务 3 步骤 4 添加的代码块）之后、`filteredPlugins` useMemo 之前添加（注意：必须在 `pluginCollectionsMap` 之后，因为函数通过 `useCallback` 依赖它）：

```typescript
const openCollectionModal = useCallback((plugin: Plugin) => {
  const currentCols = pluginCollectionsMap[plugin.id] || [];
  setCollectionModal({
    plugin,
    mode: "add",
    selectedIds: new Set(currentCols.map((c) => c.id)),
  });
}, [pluginCollectionsMap]);

const openRemoveCollectionModal = useCallback((plugin: Plugin) => {
  const currentCols = pluginCollectionsMap[plugin.id] || [];
  setCollectionModal({
    plugin,
    mode: "remove",
    selectedIds: new Set(currentCols.map((c) => c.id)),
  });
}, [pluginCollectionsMap]);

const closeCollectionModal = useCallback(() => {
  setCollectionModal(null);
}, []);

const toggleCollectionSelect = useCallback((colId: string) => {
  setCollectionModal((prev) => {
    if (!prev) return prev;
    const next = new Set(prev.selectedIds);
    if (next.has(colId)) next.delete(colId);
    else next.add(colId);
    return { ...prev, selectedIds: next };
  });
}, []);
```

- [ ] **步骤 3：在JSX中渲染合集选择弹窗**

在删除确认弹窗（`{showDeleteConfirm && (...)}` 块，第 1400-1435 行）之后、Toast 区域（第 1437 行）之前，添加：

```tsx
{/* Collection Selector Modal */}
{collectionModal && (() => {
  const { plugin, mode, selectedIds } = collectionModal;
  const availableCollections =
    mode === "add"
      ? allCollections
      : allCollections.filter(
          (col) => pluginCollectionsMap[plugin.id]?.some((c) => c.id === col.id)
        );
  const modalTitle = mode === "add" ? "加入精选合集" : "取消精选合集";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
      onClick={closeCollectionModal}
    >
      <div
        className="bg-[#faf9f5] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#e6dfd8]">
          <h3 className="text-[#141413] text-base font-medium">{modalTitle}</h3>
          <p className="text-[#8e8b82] text-sm mt-1">
            插件「{plugin.name}」
            {mode === "add" ? " — 勾选要加入的合集" : " — 勾选要从中移除的合集"}
          </p>
        </div>
        <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-2">
          {availableCollections.length === 0 ? (
            <p className="text-[#8e8b82] text-sm text-center py-4">
              {mode === "add" ? "暂无可用合集" : "该插件尚未加入任何合集"}
            </p>
          ) : (
            availableCollections.map((col) => (
              <label
                key={col.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f5f0e8] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(col.id)}
                  onChange={() => toggleCollectionSelect(col.id)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#cc785c] cursor-pointer flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[#141413] text-sm font-medium">{col.title}</div>
                  {col.description && (
                    <div className="text-[#8e8b82] text-xs mt-0.5">{col.description}</div>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        <div className="flex border-t border-[#e6dfd8]">
          <button
            onClick={closeCollectionModal}
            className="flex-1 py-3 text-[#6c6a64] text-sm hover:bg-[#f5f0e8] transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => handleCollectionSubmit()}
            disabled={collectionSaving}
            className="flex-1 py-3 text-sm border-l border-[#e6dfd8] bg-[#cc785c] text-white hover:bg-[#b86a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {collectionSaving ? "处理中..." : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
})()}
```

注意：`handleCollectionSubmit` 将在任务 7 中实现。当前类型检查会报未定义。

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: 添加合集选择弹窗 UI"
```

---

### 任务 7：实现弹窗提交逻辑

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：添加 handleCollectionSubmit 函数**

在 `toggleCollectionSelect` 之后、`filteredPlugins` useMemo 之前添加：

```typescript
const handleCollectionSubmit = useCallback(async () => {
  if (!collectionModal) return;
  const { plugin, selectedIds } = collectionModal;
  setCollectionSaving(true);
  try {
    const result = await apiPost<{ addedTo: string[]; removedFrom: string[] }>(
      "/api/featured-collections/plugins/featured-update",
      { pluginId: plugin.id, collectionIds: Array.from(selectedIds) }
    );
    const parts: string[] = [];
    if (result.addedTo.length > 0) parts.push(`已加入：${result.addedTo.join("、")}`);
    if (result.removedFrom.length > 0) parts.push(`已移除：${result.removedFrom.join("、")}`);
    addToast(
      `插件「${plugin.name}」${parts.join("；")}`,
      "success"
    );
    await fetchCollections();
    setCollectionModal(null);
  } catch (e) {
    addToast(`操作失败: ${String(e)}`, "error");
  } finally {
    setCollectionSaving(false);
  }
}, [collectionModal, addToast, fetchCollections]);
```

- [ ] **步骤 2：运行类型检查验证**

```bash
cd frontend && npx tsc --noEmit
```
预期：无新错误（之前未定义的函数现在都已实现）。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: 实现合集选择弹窗提交逻辑"
```

---

### 任务 8：端到端验证

**文件：** 无（验证任务）

- [ ] **步骤 1：运行 TypeScript 整体类型检查**

```bash
cd frontend && npx tsc --noEmit
```
预期：零错误通过。

- [ ] **步骤 2：确认所有变更文件无遗留**

```bash
git status
```
预期：只有已跟踪的文件变更，无未跟踪文件。

- [ ] **步骤 3：最终 Commit（如有残余变更）**

```bash
git add -A && git commit -m "chore: 精选合集管理功能最终整理" || echo "nothing to commit"
```
