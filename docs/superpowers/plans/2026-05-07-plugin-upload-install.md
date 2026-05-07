# 插件文件上传与安装下载 实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现插件安装包/多封面图上传并存入插件表，实现安装包下载功能，修复 Storage UPDATE 策略

**架构：** 新增 upload/install 两个 API 路由，通过 Supabase Storage 上传文件后回写路径到 agenthub_plugins 表，前端封面图改为多选

**技术栈：** Next.js App Router、Supabase Storage、multipart/form-data、现有的 toCamelCase 转换

---

### 任务 1：数据库迁移 + Storage 策略

**文件：**
- 创建：`frontend/supabase/migrations/003_add_plugin_files.sql`

- [ ] **步骤 1：编写迁移 SQL**

```sql
-- 添加文件路径列
ALTER TABLE public.agenthub_plugins 
  ADD COLUMN IF NOT EXISTS package_file TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_images JSONB DEFAULT '[]'::jsonb;

-- 添加 Storage UPDATE 策略（修复图标覆盖上传静默失败）
DROP POLICY IF EXISTS "Authenticated users can update icons" ON storage.objects;
CREATE POLICY "Authenticated users can update icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'agenthub' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'agenthub' AND auth.role() = 'authenticated');
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/supabase/migrations/003_add_plugin_files.sql
git commit -m "feat(数据库): 添加插件文件路径列和Storage UPDATE策略"
```

---

### 任务 2：新增 upload API 路由

**文件：**
- 创建：`frontend/src/app/api/plugins/upload/route.ts`

- [ ] **步骤 1：编写 upload 路由**

```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";

function getExt(filename: string): string {
  if (filename.endsWith(".tar.gz")) return "tar.gz";
  const parts = filename.split(".");
  return parts[parts.length - 1] || "bin";
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const formData = await request.formData();

    const name = (formData.get("name") as string) || "";
    const description = (formData.get("description") as string) || "";
    const version = (formData.get("version") as string) || "1.0.0";
    const author = (formData.get("author") as string) || "";
    const category = (formData.get("category") as string) || "Skill";
    const status = (formData.get("status") as string) || "draft";

    const tags: string[] = [];
    formData.forEach((val, key) => {
      if (/^tags\[(\d+)\]$/.test(key)) {
        tags.push(val as string);
      }
    });

    if (!name.trim()) {
      return jsonResponse(error("插件名称不能为空"), 400);
    }

    const { data: plugin, error: insertErr } = await supabase
      .from("agenthub_plugins")
      .insert({
        name: name.trim(),
        description: description.trim(),
        version: version.trim(),
        author: author.trim(),
        category,
        status,
        tags,
      })
      .select()
      .single();

    if (insertErr || !plugin) {
      return jsonResponse(error(insertErr?.message || "创建插件失败"), 500);
    }

    const pluginId = plugin.id;

    const packageFile = formData.get("package") as File | null;
    const coverFiles = formData.getAll("coverImages").filter(
      (f): f is File => f instanceof File
    );

    let packagePath = "";
    const coverPaths: string[] = [];

    if (packageFile && packageFile.size > 0) {
      const ext = getExt(packageFile.name);
      const filePath = `packages/${pluginId}.${ext}`;

      const { error: pkgErr } = await supabase.storage
        .from("agenthub")
        .upload(filePath, packageFile, { upsert: true });

      if (!pkgErr) {
        packagePath = filePath;
      }
    }

    if (coverFiles.length > 0) {
      for (let i = 0; i < coverFiles.length; i++) {
        const file = coverFiles[i];
        const ext = file.name.split(".").pop() || "png";
        const filePath = `covers/${pluginId}_${i}.${ext}`;

        const { error: coverErr } = await supabase.storage
          .from("agenthub")
          .upload(filePath, file, { upsert: true });

        if (!coverErr) {
          coverPaths.push(filePath);
        }
      }
    }

    if (packagePath || coverPaths.length > 0) {
      const updates: Record<string, unknown> = {};
      if (packagePath) updates.package_file = packagePath;
      if (coverPaths.length > 0) updates.cover_images = coverPaths;

      const { error: updateErr } = await supabase
        .from("agenthub_plugins")
        .update(updates)
        .eq("id", pluginId);

      if (updateErr) {
        return jsonResponse(error(updateErr.message), 500);
      }

      const { data: updated, error: fetchErr } = await supabase
        .from("agenthub_plugins")
        .select("*")
        .eq("id", pluginId)
        .single();

      if (fetchErr || !updated) {
        return jsonResponse(success(toCamelCase(plugin as Record<string, unknown>)), 201);
      }

      return jsonResponse(success(toCamelCase(updated as Record<string, unknown>)), 201);
    }

    return jsonResponse(success(toCamelCase(plugin as Record<string, unknown>)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/app/api/plugins/upload/route.ts
git commit -m "feat(API): 新增 POST /api/plugins/upload 支持文件和封面图上传"
```

---

### 任务 3：新增 install 下载 API 路由

**文件：**
- 创建：`frontend/src/app/api/plugins/[id]/install/route.ts`

- [ ] **步骤 1：编写 install 路由**

```typescript
import { createServerSupabase } from "@/lib/supabase/server";
import { error, jsonResponse } from "@/lib/api-helper";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .select("package_file")
      .eq("id", id)
      .single();

    if (err || !data) {
      return jsonResponse(error("插件不存在"), 404);
    }

    const packageFile: string = (data as Record<string, unknown>).package_file as string || "";

    if (!packageFile) {
      return jsonResponse(error("该插件无可下载的安装包"), 404);
    }

    const { data: publicUrlData } = supabase.storage
      .from("agenthub")
      .getPublicUrl(packageFile);

    return NextResponse.redirect(publicUrlData.publicUrl);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/src/app/api/plugins/[id]/install/route.ts
git commit -m "feat(API): 新增 GET /api/plugins/[id]/install 安装包下载"
```

---

### 任务 4：修改 admin/plugins 页面 — 多封面图上传

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：状态变更 — 从单选改为多选**

将封面图相关状态从单文件改为多文件：

```typescript
// 原来：
const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
const [coverImageDragOver, setCoverImageDragOver] = useState(false);
const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

// 改为：
const [coverImageFiles, setCoverImageFiles] = useState<File[]>([]);
const [coverImageDragOver, setCoverImageDragOver] = useState(false);
const [coverImagePreviews, setCoverImagePreviews] = useState<string[]>([]);
```

- [ ] **步骤 2：修改 openAddModal / openEditModal — 清理多文件状态**

```typescript
// 原来：
setCoverImageFile(null);
setCoverImagePreview(null);

// 改为：
setCoverImageFiles([]);
setCoverImagePreviews([]);
```

- [ ] **步骤 3：修改 handleSave — 文件路径判定和 FormData 构造**

```typescript
// 原来：
const hasFiles = !!(packageFile || coverImageFile);
// ...
if (coverImageFile) {
  formDataUpload.append("coverImage", coverImageFile);
}
// 改为：
const hasFiles = !!(packageFile || coverImageFiles.length > 0);
// ...
coverImageFiles.forEach((file) => {
  formDataUpload.append("coverImages", file);
});
```

toast 消息也改为：
```typescript
addToast(`插件「${formData.name.trim()}」已创建${packageFile ? "，安装包已上传" : ""}${coverImageFiles.length > 0 ? `，${coverImageFiles.length}张封面图已上传` : ""}`, "success");
```

- [ ] **步骤 4：修改 handleCoverImageDrop — 支持多文件拖拽**

```typescript
// 原来：
const file = e.dataTransfer.files[0];
if (file && isValidImageFile(file)) {
  setCoverImageFile(file);
  const reader = new FileReader();
  reader.onload = () => setCoverImagePreview(reader.result as string);
  reader.readAsDataURL(file);
}

// 改为：
const files = Array.from(e.dataTransfer.files).filter(
  (f) => isValidImageFile(f)
).slice(0, 5);
if (files.length === 0) {
  addToast("仅支持 PNG、JPG 格式的图片", "error");
  return;
}
setCoverImageFiles((prev) => [...prev, ...files].slice(0, 5));
files.forEach((file) => {
  const reader = new FileReader();
  reader.onload = () => {
    setCoverImagePreviews((prev) => {
      const newPreviews = [...prev, reader.result as string];
      return newPreviews.slice(0, 5);
    });
  };
  reader.readAsDataURL(file);
});
```

- [ ] **步骤 5：修改 handleCoverImageSelect — 支持多文件选择**

```typescript
// 原来：
const file = e.target.files?.[0];
// ...类似上面

// 改为：
const files = Array.from(e.target.files || []).filter(
  (f) => isValidImageFile(f)
).slice(0, 5);
if (files.length === 0 && e.target.files && e.target.files.length > 0) {
  addToast("仅支持 PNG、JPG 格式的图片", "error");
  return;
}
setCoverImageFiles((prev) => [...prev, ...files].slice(0, 5));
files.forEach((file) => {
  const reader = new FileReader();
  reader.onload = () => {
    setCoverImagePreviews((prev) => {
      const newPreviews = [...prev, reader.result as string];
      return newPreviews.slice(0, 5);
    });
  };
  reader.readAsDataURL(file);
});
```

由于状态从追加改为替换（更符合添加新插件的语义），考虑到既要支持首次选择又要支持追加，改成不追加的版本（每次选择重置）：

```typescript
const files = Array.from(e.target.files || []).filter(
  (f) => isValidImageFile(f)
).slice(0, 5);
if (files.length === 0 && e.target.files && e.target.files.length > 0) {
  addToast("仅支持 PNG、JPG 格式的图片", "error");
  return;
}
setCoverImageFiles(files);
const previews: string[] = [];
files.forEach((file) => {
  const reader = new FileReader();
  reader.onload = () => {
    setCoverImagePreviews((prev) => {
      const idx = prev.findIndex((p) => p === "");
      const newPreviews = [...prev];
      newPreviews[idx === -1 ? newPreviews.length : idx] = reader.result as string;
      return newPreviews;
    });
  };
  reader.readAsDataURL(file);
  previews.push("");
});
setCoverImagePreviews(previews);
```

等等，这个逻辑太复杂了。让我简化——用 Promise 包装 FileReader 同步拿到结果：

```typescript
const handleCoverImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []).filter(
    (f) => isValidImageFile(f)
  ).slice(0, 5);
  if (files.length === 0 && e.target.files && e.target.files.length > 0) {
    addToast("仅支持 PNG、JPG 格式的图片", "error");
    return;
  }
  setCoverImageFiles(files);

  const readers: Promise<string>[] = files.map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  });

  Promise.all(readers).then(setCoverImagePreviews);
};
```

- [ ] **步骤 6：修改 clearCoverImage — 清除多文件**

```typescript
const clearCoverImage = (index: number) => {
  setCoverImageFiles((prev) => prev.filter((_, i) => i !== index));
  setCoverImagePreviews((prev) => prev.filter((_, i) => i !== index));
  if (coverImageInputRef.current) {
    coverImageInputRef.current.value = "";
  }
};
```

- [ ] **步骤 7：修改封面图上传 UI — 多图预览**

将原来的单图预览改为横向滚动画廊：

```tsx
<label className="block text-sm text-[#3d3d3a] mb-1.5">封面图（最多5张）</label>
<input
  ref={coverImageInputRef}
  type="file"
  accept="image/png,image/jpeg,image/jpg"
  multiple
  onChange={handleCoverImageSelect}
  className="hidden"
/>
{coverImageFiles.length > 0 ? (
  <div className="space-y-3">
    <div className="flex gap-3 overflow-x-auto pb-2">
      {coverImageFiles.map((file, i) => (
        <div key={i} className="flex-shrink-0 relative group">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-[#efe9de] border border-[#e6dfd8]">
            {coverImagePreviews[i] ? (
              <img src={coverImagePreviews[i]} alt={`封面 ${i + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => clearCoverImage(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-[#c64545] text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >✕</button>
          <div className="text-[#8e8b82] text-xs mt-1 truncate w-24 text-center">{file.name}</div>
        </div>
      ))}
    </div>
    {coverImageFiles.length < 5 && (
      <div
        onClick={() => coverImageInputRef.current?.click()}
        className="w-24 h-24 border-2 border-dashed border-[#e6dfd8] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#cc785c] transition-colors flex-shrink-0"
      >
        <span className="text-[#8e8b82] text-2xl">+</span>
      </div>
    )}
  </div>
) : (
  <div
    onClick={() => coverImageInputRef.current?.click()}
    onDragOver={(e) => { e.preventDefault(); setCoverImageDragOver(true); }}
    onDragLeave={() => setCoverImageDragOver(false)}
    onDrop={handleCoverImageDrop}
    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
      coverImageDragOver ? "border-[#cc785c] bg-[#cc785c]/4" : "border-[#e6dfd8] hover:border-[#cc785c]"
    }`}
  >
    <div className="text-3xl mb-1">🖼️</div>
    <div className="text-[#8e8b82] text-sm">点击或拖拽上传封面图</div>
    <div className="text-[#8e8b82] text-xs mt-0.5">支持 PNG、JPG，最多5张，每张最大 2MB</div>
  </div>
)}
```

- [ ] **步骤 8：修改拖拽处理 — 支持多文件**

```typescript
const handleCoverImageDrop = (e: DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  setCoverImageDragOver(false);
  const files = Array.from(e.dataTransfer.files).filter(
    (f) => isValidImageFile(f)
  );
  if (files.length === 0) {
    addToast("仅支持 PNG、JPG 格式的图片", "error");
    return;
  }
  const combined = [...coverImageFiles, ...files].slice(0, 5);
  setCoverImageFiles(combined);

  const readers = combined.map((file) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  });

  Promise.all(readers).then(setCoverImagePreviews);
};
```

- [ ] **步骤 9：修改 Plugin 类型定义，添加新字段**

在文件顶部的 mock/plugins 导入，Plugin 接口不用改（mock 类型保留给 admin 页面展示），但 formData 的 category 类型约束需要保留。

在 `src/lib/mock/plugins.ts` 中为 Plugin 接口添加可选字段：

```typescript
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: "Skill" | "Agent" | "Tool" | "MCP" | "Plugin";
  downloads: number;
  rating: number;
  status: "published" | "draft" | "reviewing";
  tags: string[];
  icon?: string;
  packageFile?: string;
  coverImages?: string[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **步骤 10：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx frontend/src/lib/mock/plugins.ts
git commit -m "feat(插件管理): 封面图支持多张上传，install调用upload API"
```

---

### 任务 5：修改 marketplace 详情页 — 多封面图展示

**文件：**
- 修改：`frontend/src/app/marketplace/[id]/page.tsx`

- [ ] **步骤 1：在代码演示区下方添加封面图轮播区域**

在 Code Demo 区块（`</div>` 结束）之后、README 之前添加封面图区域：

```tsx
{plugin.coverImages && plugin.coverImages.length > 0 && (
  <div className="mt-8">
    <h3
      className="text-[#141413] mb-4"
      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
    >
      预览截图
    </h3>
    <div className="flex gap-4 overflow-x-auto pb-2">
      {plugin.coverImages.map((img, i) => {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agenthub/${img}`;
        return (
          <div key={i} className="flex-shrink-0">
            <img
              src={url}
              alt={`截图 ${i + 1}`}
              className="w-80 h-48 rounded-lg object-cover border border-[#e6dfd8]"
            />
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **步骤 2：添加 PluginDetail 接口的 coverImages 字段**

```typescript
export interface PluginDetail {
  pluginId: string;
  readme: string;
  reviews: Review[];
  versionHistory: { version: string; date: string; changelog: string[] }[];
  coverImages?: string[];
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/marketplace/[id]/page.tsx
git commit -m "feat(插件详情): 展示多张封面图轮播"
```

---

### 任务 6：修改 plugins 列表 API 返回 cover_images 和 package_file

**文件：**
- 修改：`frontend/src/app/api/plugins/route.ts` 和 `[id]/route.ts`

GET /api/plugins 的 `.select("*")` 已经会返回新列的 snake_case 字段，`toCamelCaseArray` 会自动转为 `packageFile` 和 `coverImages`。无需额外修改。

但需要确认 GET /api/plugins 没问题——`.select("*")` 返回所有列，新列自动包含。

- [ ] **步骤 1：无需修改，验证即可**

---

### 任务 7：验证

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

- [ ] **步骤 3：执行数据库迁移**

在 Supabase SQL Editor 中执行 `003_add_plugin_files.sql` 的内容。

- [ ] **步骤 4：手动测试**

1. 在 admin/plugins 创建新插件，上传多张封面图和安装包
2. 确认创建成功，检查 agenthub_plugins 表的 package_file 和 cover_images 字段有值
3. 在 marketplace 详情页确认封面图展示
4. 点击"安装"按钮，确认浏览器触发下载
