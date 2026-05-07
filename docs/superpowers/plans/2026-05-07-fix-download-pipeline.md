# 下载链路修复与全链路打通 实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复断裂的下载链路（前端 POST → 后端 GET 不匹配），添加服务器端下载计数器，确保上传→存储→查看→下载全链路畅通

**架构：** 将 install 路由从 GET 302 重定向改为 POST 返回 JSON（含 downloadUrl），原子递增 downloads 字段；前端用 window.open 触发浏览器下载

**技术栈：** Next.js App Router、Supabase Storage、TypeScript

---

### 任务 1：修复 install 下载路由 — POST + 返回 URL + 计数器

**文件：**
- 修改：`frontend/src/app/api/plugins/[id]/install/route.ts`

- [ ] **步骤 1：重写 install 路由为 POST 处理器**

将当前 `GET` 处理器改为 `POST`，返回 JSON 格式的 `{ downloadUrl, newCount }`，同时递增数据库 `downloads` 字段。

用以下内容**完整替换**文件：

```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: plugin, error: getErr } = await supabase
      .from("agenthub_plugins")
      .select("package_file, downloads")
      .eq("id", id)
      .single();

    if (getErr || !plugin) {
      return jsonResponse(error("插件不存在"), 404);
    }

    const packageFile: string = (plugin as Record<string, unknown>).package_file as string || "";

    if (!packageFile) {
      return jsonResponse(error("该插件无可下载的安装包"), 404);
    }

    const { data: publicUrlData } = supabase.storage
      .from("agenthub")
      .getPublicUrl(packageFile);

    const currentDownloads: number = (plugin as Record<string, unknown>).downloads as number || 0;
    const newDownloads = currentDownloads + 1;

    const { error: updateErr } = await supabase
      .from("agenthub_plugins")
      .update({ downloads: newDownloads })
      .eq("id", id);

    if (updateErr) {
      console.error("下载计数更新失败:", updateErr.message);
    }

    return jsonResponse(success({
      downloadUrl: publicUrlData.publicUrl,
      newCount: newDownloads,
    }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：验证编译**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/plugins/[id]/install/route.ts
git commit -m "feat(API): 修复 install 路由，改为 POST 返回下载URL，递增下载计数"
```

---

### 任务 2：修复前端下载调用 — marketplace 详情页

**文件：**
- 修改：`frontend/src/app/marketplace/[id]/page.tsx`（`handleInstall` 函数，约 L97-L119）

- [ ] **步骤 1：修改 handleInstall 触发实际文件下载**

将当前的 `handleInstall` 回调函数改为：调用 `apiPost` 获取下载 URL → 触发浏览器下载 → 记录下载状态。

在 `frontend/src/app/marketplace/[id]/page.tsx` 中定位 `handleInstall`（大约第 97-119 行），用以下内容替换：

```typescript
  const handleInstall = useCallback(async () => {
    if (installing || !plugin) return;
    setInstalling(true);
    addToast("正在下载安装包…");
    try {
      const result = await apiPost<{ downloadUrl: string; newCount: number }>(
        `/api/plugins/${plugin.id}/install`,
        {}
      );
      addDownload({
        pluginId: plugin.id,
        name: plugin.name,
        description: plugin.description,
        category: plugin.category,
        version: plugin.version,
        icon: CATEGORY_ICONS[plugin.category] || "📦",
      });
      window.open(result.downloadUrl, "_blank");
      addToast(`「${plugin.name}」安装成功！已加入下载列表`);
      setInstalling(false);
    } catch {
      addToast(`「${plugin.name}」安装失败，请稍后重试`);
      setInstalling(false);
    }
  }, [installing, plugin, addToast, addDownload]);
```

**对比原始代码的关键变化：**
1. `addToast("正在下载安装包…")` — 不变
2. `await apiPost(...)` → 解构出 `result.downloadUrl` — **新增：获取下载 URL**
3. `addDownload(...)` — 移到 `apiPost` 成功之后
4. `window.open(result.downloadUrl, "_blank")` — **新增：触发浏览器下载**
5. 移除 `setTimeout` 包装的延迟回调，直接设置 toast 和 installing 状态

- [ ] **步骤 2：验证编译**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/marketplace/[id]/page.tsx
git commit -m "feat(插件详情): 修复安装按钮下载流程，调用API获取URL后触发下载"
```

---

### 任务 3：端到端验证

- [ ] **步骤 1：TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。

- [ ] **步骤 2：Lint 检查**

```bash
cd frontend && npm run lint
```

预期：无新增 lint 问题。

- [ ] **步骤 3：手动端到端验证清单**

按顺序验证以下流程：

1. **上传流程**：
   - 打开 `/admin/plugins`，点击"创建插件"
   - 填写名称、描述、版本、作者、分类、标签
   - 上传插件压缩包（.zip）
   - 上传至少 1 张封面图（png/jpg）
   - 点击"创建插件"→ 应显示成功 toast

2. **数据库验证**：
   - 检查 Supabase 数据库 `agenthub_plugins` 表中新创建的记录
   - `package_file` 字段应有值（如 `packages/{uuid}.zip`）
   - `cover_images` 字段应有值（如 `["covers/{uuid}_0.png"]`）

3. **Storage 验证**：
   - 检查 Supabase Storage `agenthub` bucket 中是否有对应路径的文件
   - `packages/` 目录下应有上传的压缩包
   - `covers/` 目录下应有上传的封面图

4. **查看图片流程**：
   - 将插件状态改为 `published`（可在数据库直接修改或通过管理后台）
   - 打开 `/marketplace/{pluginId}` 插件详情页
   - 应能看到"预览截图"区域的封面图正常显示

5. **下载流程**：
   - 在插件详情页点击"安装插件"或"立即安装"按钮
   - 应看到 toast "正在下载安装包…" 然后 "安装成功！"
   - 浏览器应打开新标签页触发文件下载（或直接开始下载）
   - 检查数据库 `downloads` 字段应已 +1

6. **下载计数显示**：
   - 返回插件详情页或市场列表页
   - 下载数应已更新（数据库值 + 本地 localStorage 值）
